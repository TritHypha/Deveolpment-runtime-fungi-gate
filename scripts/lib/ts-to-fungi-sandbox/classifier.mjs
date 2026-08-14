import { BLOCKERS, MAX_DIFFERENTIAL_VECTORS, SandboxRefusal, canonicalRelativeTsPath, codeUnitCompare } from "./contracts.mjs";
import { TYPESCRIPT_VERSION, ts } from "./typescript-api.mjs";

const admitted = new WeakSet();
const admittedNodes = new WeakMap();
const declarationKinds = new Set([
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
]);
const allowedFunctionKinds = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ExportKeyword,
  ts.SyntaxKind.DefaultKeyword,
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.Block,
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.BinaryExpression,
]);
const allowedBinary = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
]);

function freezeResult(value) {
  if (Array.isArray(value)) {
    for (const item of value) freezeResult(item);
    return Object.freeze(value);
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freezeResult(item);
    return Object.freeze(value);
  }
  return value;
}

function declarationName(node) {
  if (ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)) {
    return node.name?.text;
  }
  return undefined;
}

function findDeclarations(sourceFile, symbol) {
  const found = [];
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === symbol) found.push({ node: declaration, statement, kind: "constant" });
      }
    } else if (declarationName(statement) === symbol) {
      found.push({ node: statement, statement, kind: ts.isFunctionDeclaration(statement) ? "function" : "declaration" });
    }
  }
  return found;
}

function inventory(node) {
  const counts = new Map();
  function walk(current) {
    const name = ts.SyntaxKind[current.kind] ?? `Unknown(${current.kind})`;
    counts.set(name, (counts.get(name) ?? 0) + 1);
    current.forEachChild(walk);
  }
  walk(node);
  return Object.fromEntries([...counts].sort(([left], [right]) => codeUnitCompare(left, right)));
}

function unwrapExpression(node) {
  let current = node;
  while (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function integerLiteral(node) {
  const current = unwrapExpression(node);
  if (ts.isNumericLiteral(current)) {
    const value = Number(current.text.replaceAll("_", ""));
    if (Number.isSafeInteger(value)) return value;
    return undefined;
  }
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(current.operand)) {
    const value = -Number(current.operand.text.replaceAll("_", ""));
    if (Object.is(value, -0) || !Number.isSafeInteger(value)) return undefined;
    return value;
  }
  if (ts.isBinaryExpression(current)) {
    const left = integerLiteral(current.left);
    const right = integerLiteral(current.right);
    if (left === undefined || right === undefined) return undefined;
    let value;
    if (current.operatorToken.kind === ts.SyntaxKind.PlusToken) value = left + right;
    else if (current.operatorToken.kind === ts.SyntaxKind.MinusToken) value = left - right;
    else if (current.operatorToken.kind === ts.SyntaxKind.AsteriskToken) value = left * right;
    else return undefined;
    if (Number.isSafeInteger(value)) return value;
  }
  return undefined;
}

function literalValue(node) {
  const current = unwrapExpression(node);
  if (current.kind === ts.SyntaxKind.TrueKeyword) return { type: "boolean", value: true };
  if (current.kind === ts.SyntaxKind.FalseKeyword) return { type: "boolean", value: false };
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return { type: "string", value: current.text };
  const integer = integerLiteral(current);
  if (integer !== undefined) return { type: "number", value: integer };
  return undefined;
}

function blocked(base, blockers, obligations) {
  return freezeResult({ ...base, outcome: "BLOCKED", complete: true, blockers: [...new Set(blockers)].sort(codeUnitCompare), obligations });
}

function typeName(node) {
  if (node?.kind === ts.SyntaxKind.BooleanKeyword) return "boolean";
  if (node?.kind === ts.SyntaxKind.StringKeyword) return "string";
  if (node?.kind === ts.SyntaxKind.NumberKeyword) return "number";
  return undefined;
}

function alwaysReturns(statement) {
  if (ts.isReturnStatement(statement)) return statement.expression !== undefined;
  if (ts.isBlock(statement)) return statement.statements.some(alwaysReturns);
  return ts.isIfStatement(statement)
    && statement.elseStatement !== undefined
    && alwaysReturns(statement.thenStatement)
    && alwaysReturns(statement.elseStatement);
}

function validateFunction(node, base) {
  if (node.asteriskToken !== undefined || node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) {
    return blocked(base, [BLOCKERS.ASYNC_OR_GENERATOR], ["preserve promise/generator scheduling and identity"]);
  }
  const returnType = typeName(node.type);
  if (returnType === undefined || node.body === undefined) return blocked(base, [BLOCKERS.UNSUPPORTED_CONTROL], ["provide an explicit primitive return and body"]);
  const parameters = [];
  for (const parameter of node.parameters) {
    if (!ts.isIdentifier(parameter.name) || parameter.initializer !== undefined || parameter.questionToken !== undefined || parameter.dotDotDotToken !== undefined) {
      return blocked(base, [BLOCKERS.UNSUPPORTED_CONTROL], ["close parameter shape without defaults, optionals or rest"]);
    }
    const type = typeName(parameter.type);
    if (type === undefined) return blocked(base, [BLOCKERS.UNSUPPORTED_CONTROL], ["admit an explicit primitive parameter type"]);
    if (type === "number") return blocked(base, [BLOCKERS.BINARY64], ["supply an owner-approved bounded integer border"]);
    parameters.push({ name: parameter.name.text, type });
  }
  const vectorCount = parameters.reduce((count, parameter) => count * (parameter.type === "boolean" ? 2 : 5), 1);
  if (vectorCount > MAX_DIFFERENTIAL_VECTORS) {
    return blocked(base, [BLOCKERS.VECTOR_DOMAIN], [`reduce the differential domain to at most ${MAX_DIFFERENTIAL_VECTORS} vectors`]);
  }
  const blockers = [];
  const operators = new Set();
  function walk(current) {
    if (!allowedFunctionKinds.has(current.kind)) blockers.push(BLOCKERS.UNSUPPORTED_CONTROL);
    if (ts.isCallExpression(current) || ts.isNewExpression(current)) blockers.push(BLOCKERS.CALL_OR_HOST_API);
    if (current.kind === ts.SyntaxKind.NullKeyword || current.kind === ts.SyntaxKind.UndefinedKeyword) blockers.push(BLOCKERS.NULLISH);
    if (ts.isBinaryExpression(current)) {
      operators.add(ts.tokenToString(current.operatorToken.kind) ?? String(current.operatorToken.kind));
      if (!allowedBinary.has(current.operatorToken.kind)) blockers.push(BLOCKERS.COERCION);
    }
    if (ts.isPrefixUnaryExpression(current) && current.operator !== ts.SyntaxKind.ExclamationToken && !(current.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(current.operand))) blockers.push(BLOCKERS.COERCION);
    current.forEachChild(walk);
  }
  walk(node);
  if (blockers.length > 0) return blocked(base, blockers, ["select an exact typed representation for every refused construct"]);
  const returnLiterals = [];
  function collectReturns(current) {
    if (ts.isReturnStatement(current)) {
      if (current.expression === undefined) blockers.push(BLOCKERS.UNSUPPORTED_CONTROL);
      else {
        const literal = literalValue(current.expression);
        if (literal !== undefined) returnLiterals.push(literal);
        else if (!ts.isIdentifier(unwrapExpression(current.expression)) && !ts.isBinaryExpression(unwrapExpression(current.expression)) && !ts.isPrefixUnaryExpression(unwrapExpression(current.expression))) blockers.push(BLOCKERS.UNSUPPORTED_CONTROL);
      }
    }
    current.forEachChild(collectReturns);
  }
  collectReturns(node.body);
  if (blockers.length > 0 || returnLiterals.length === 0 || !node.body.statements.some(alwaysReturns)) return blocked(base, blockers.length > 0 ? blockers : [BLOCKERS.UNSUPPORTED_CONTROL], ["prove total return coverage"]);
  if (returnType === "number" && returnLiterals.some((item) => item.type === "number" && !Number.isSafeInteger(item.value))) return blocked(base, [BLOCKERS.BINARY64], ["admit only exact safe integer returns"]);
  const result = freezeResult({ ...base, outcome: "SUPPORTED", complete: true, blockers: [], kind: "function", parameters, returnType, operators: [...operators].sort(codeUnitCompare) });
  admitted.add(result);
  admittedNodes.set(result, node);
  return result;
}

export function classifyTypeScriptSource({ source, file, symbol }) {
  canonicalRelativeTsPath(file);
  if (typeof source !== "string" || source.length === 0 || typeof symbol !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(symbol)) {
    throw new SandboxRefusal("CLASSIFIER_INPUT_INVALID", "classifier requires source text and one identifier symbol");
  }
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const parseErrors = sourceFile.parseDiagnostics ?? [];
  if (parseErrors.length > 0) return freezeResult({ outcome: "MANUAL_REVIEW", complete: false, blockers: [], reason: "TypeScript parser diagnostics", diagnostics: parseErrors.map((item) => item.code) });
  const matches = findDeclarations(sourceFile, symbol);
  if (matches.length !== 1) return freezeResult({ outcome: "MANUAL_REVIEW", complete: false, blockers: [], reason: `expected one declaration, found ${matches.length}` });
  const match = matches[0];
  const node = match.node;
  const base = {
    schema: "galerina.ts-to-fungi-classifier.v1",
    typescriptVersion: TYPESCRIPT_VERSION,
    file,
    symbol,
    range: { start: node.getStart(sourceFile), end: node.getEnd() },
    inventory: inventory(node),
  };
  if (match.kind === "declaration" || declarationKinds.has(node.kind) || ts.isClassDeclaration(node)) {
    return blocked(base, [BLOCKERS.DECLARATION_ONLY], ["retain the public TypeScript declaration until governed binding replacement"]);
  }
  if (match.kind === "function") return validateFunction(node, base);
  const declaration = node;
  if ((match.statement.declarationList.flags & ts.NodeFlags.Const) === 0 || declaration.initializer === undefined) {
    return blocked(base, [BLOCKERS.ACTIVE_OBJECT], ["preserve mutable binding and initialization semantics"]);
  }
  const value = literalValue(declaration.initializer);
  if (value !== undefined) {
    const result = freezeResult({ ...base, outcome: "SUPPORTED", complete: true, blockers: [], kind: "constant", value });
    admitted.add(result);
    admittedNodes.set(result, node);
    return result;
  }
  const expression = unwrapExpression(declaration.initializer);
  if (ts.isNumericLiteral(expression) || (ts.isPrefixUnaryExpression(expression) && ts.isNumericLiteral(expression.operand))) {
    return blocked(base, [BLOCKERS.BINARY64], ["bind exact binary64 or narrow through an owner-approved integer profile"]);
  }
  if (ts.isNewExpression(expression) || ts.isArrayLiteralExpression(expression) || ts.isObjectLiteralExpression(expression)) {
    return blocked(base, [BLOCKERS.ACTIVE_OBJECT], ["admit identity, aliasing and mutation or select an approved value contract"]);
  }
  if (ts.isCallExpression(expression)) return blocked(base, [BLOCKERS.CALL_OR_HOST_API], ["admit the called effect and result receipt"]);
  return freezeResult({ ...base, outcome: "MANUAL_REVIEW", complete: false, blockers: [], reason: `unclassified initializer ${ts.SyntaxKind[expression.kind]}` });
}

export function discoverTypeScriptScopes({ source, file }) {
  canonicalRelativeTsPath(file);
  if (typeof source !== "string" || source.length === 0) {
    throw new SandboxRefusal("DISCOVERY_INPUT_INVALID", "discovery requires non-empty TypeScript source text");
  }
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  if ((sourceFile.parseDiagnostics ?? []).length > 0) return Object.freeze([]);
  const symbols = [];
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) symbols.push(declaration.name.text);
      }
      continue;
    }
    const name = declarationName(statement);
    if (name !== undefined) symbols.push(name);
  }
  return Object.freeze(symbols
    .map((symbol) => classifyTypeScriptSource({ source, file, symbol }))
    .filter((classification) => classification.outcome === "SUPPORTED"));
}

export function isAdmittedClassification(value) {
  return admitted.has(value);
}

export function admittedClassificationNode(value) {
  return admittedNodes.get(value);
}
