import { BLOCKERS, MAX_DIFFERENTIAL_VECTORS, SandboxRefusal, canonicalRelativeTsPath, canonicalSourceSymbol, codeUnitCompare } from "./contracts.mjs";
import { TYPESCRIPT_VERSION, ts } from "./typescript-api.mjs";

const admitted = new WeakSet();
const admittedNodes = new WeakMap();
const declarationKinds = new Set([
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
]);
const allowedFunctionKinds = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.EqualsGreaterThanToken,
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
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.ExclamationToken,
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
        if (ts.isIdentifier(declaration.name) && declaration.name.text === symbol) {
          const initializer = declaration.initializer === undefined ? undefined : unwrapExpression(declaration.initializer);
          const isArrow = initializer !== undefined && ts.isArrowFunction(initializer);
          found.push({ node: isArrow ? initializer : declaration, statement, kind: isArrow ? "function" : "constant" });
        }
      }
    } else if (declarationName(statement) === symbol) {
      found.push({ node: statement, statement, kind: ts.isFunctionDeclaration(statement) ? "function" : "declaration" });
    }
  }
  return found;
}

function isConstEnum(node) {
  return ts.isEnumDeclaration(node) && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ConstKeyword) === true;
}

function enumMemberName(member) {
  return ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : undefined;
}

function findExplicitStringConstEnumMember(sourceFile, symbol) {
  const parts = symbol.split(".");
  if (parts.length !== 2) return undefined;
  const declarations = sourceFile.statements.filter((statement) => isConstEnum(statement) && statement.name.text === parts[0]);
  if (declarations.length !== 1) return undefined;
  const members = declarations[0].members.filter((member) => enumMemberName(member) === parts[1]);
  if (members.length !== 1 || members[0].initializer === undefined) return undefined;
  const initializer = unwrapExpression(members[0].initializer);
  if (!ts.isStringLiteral(initializer) && !ts.isNoSubstitutionTemplateLiteral(initializer)) return undefined;
  return { node: members[0], value: { type: "string", value: initializer.text } };
}

function isTypeOnlyMatch(match) {
  return match.kind === "declaration"
    && (ts.isInterfaceDeclaration(match.node) || ts.isTypeAliasDeclaration(match.node));
}

function isRuntimeMatch(match) {
  return match.kind === "constant"
    || match.kind === "function"
    || ts.isClassDeclaration(match.node)
    || ts.isEnumDeclaration(match.node);
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
  while (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isParenthesizedExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
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
    else if (current.operatorToken.kind === ts.SyntaxKind.SlashToken && right !== 0 && left % right === 0) value = left / right;
    else return undefined;
    if (Number.isSafeInteger(value)) return value;
  }
  return undefined;
}

function literalValue(node, sourceFile, seen = new Set()) {
  const current = unwrapExpression(node);
  if (current.kind === ts.SyntaxKind.TrueKeyword) return { type: "boolean", value: true };
  if (current.kind === ts.SyntaxKind.FalseKeyword) return { type: "boolean", value: false };
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return { type: "string", value: current.text };
  const integer = integerLiteral(current);
  if (integer !== undefined) return { type: "number", value: integer };
  if (sourceFile !== undefined && ts.isIdentifier(current) && !seen.has(current.text)) {
    const matches = findDeclarations(sourceFile, current.text);
    if (matches.length !== 1 || matches[0].kind !== "constant") return undefined;
    const match = matches[0];
    if ((match.statement.declarationList.flags & ts.NodeFlags.Const) === 0 || match.node.initializer === undefined || match.node.getStart(sourceFile) >= current.getStart(sourceFile)) return undefined;
    return literalValue(match.node.initializer, sourceFile, new Set([...seen, current.text]));
  }
  if (sourceFile !== undefined && ts.isPropertyAccessExpression(current) && ts.isIdentifier(current.expression)) {
    const objectName = current.expression.text;
    const key = `${objectName}.${current.name.text}`;
    if (seen.has(key)) return undefined;
    const matches = findDeclarations(sourceFile, objectName);
    if (matches.length !== 1 || matches[0].kind !== "constant") return undefined;
    const match = matches[0];
    if ((match.statement.declarationList.flags & ts.NodeFlags.Const) === 0 || match.node.initializer === undefined || match.node.getStart(sourceFile) >= current.getStart(sourceFile)) return undefined;
    const object = unwrapExpression(match.node.initializer);
    if (!ts.isObjectLiteralExpression(object) || !object.properties.every((property) => ts.isPropertyAssignment(property) && !property.name.questionToken && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)))) return undefined;
    const properties = object.properties.filter((property) => property.name.text === current.name.text);
    if (properties.length !== 1) return undefined;
    return literalValue(properties[0].initializer, sourceFile, new Set([...seen, key]));
  }
  if (sourceFile !== undefined && ts.isTemplateExpression(current)) {
    let value = current.head.text;
    for (const span of current.templateSpans) {
      const resolved = literalValue(span.expression, sourceFile, seen);
      if (resolved === undefined) return undefined;
      value += String(resolved.value) + span.literal.text;
    }
    return { type: "string", value };
  }
  if (sourceFile !== undefined && ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = literalValue(current.left, sourceFile, seen);
    const right = literalValue(current.right, sourceFile, seen);
    if (left !== undefined && right !== undefined && (left.type === "string" || right.type === "string")) {
      return { type: "string", value: String(left.value) + String(right.value) };
    }
  }
  if (sourceFile !== undefined && ts.isBinaryExpression(current)) {
    const left = literalValue(current.left, sourceFile, seen);
    const right = literalValue(current.right, sourceFile, seen);
    if (left?.type !== "number" || right?.type !== "number") return undefined;
    let value;
    if (current.operatorToken.kind === ts.SyntaxKind.BarToken) value = left.value | right.value;
    else if (current.operatorToken.kind === ts.SyntaxKind.AmpersandToken) value = left.value & right.value;
    else if (current.operatorToken.kind === ts.SyntaxKind.CaretToken) value = left.value ^ right.value;
    else if (current.operatorToken.kind === ts.SyntaxKind.LessThanLessThanToken) value = left.value << right.value;
    else if (current.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanToken) value = left.value >> right.value;
    else if (current.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken) value = left.value >>> right.value;
    else return undefined;
    if (Number.isSafeInteger(value) && !Object.is(value, -0)) return { type: "number", value };
  }
  return undefined;
}

function blocked(base, blockers, obligations) {
  return freezeResult({ ...base, outcome: "BLOCKED", complete: true, blockers: [...new Set(blockers)].sort(codeUnitCompare), obligations });
}

function physicalInt(value) {
  return Number.isSafeInteger(value) && value >= -2147483648 && value <= 2147483647;
}

function physicalStringLiteral(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return false;
  }
  return true;
}

function typeName(node) {
  if (node?.kind === ts.SyntaxKind.BooleanKeyword) return "boolean";
  if (node?.kind === ts.SyntaxKind.StringKeyword) return "string";
  if (node?.kind === ts.SyntaxKind.NumberKeyword) return "number";
  return undefined;
}

function inferredExpressionType(node, parameters) {
  const current = unwrapExpression(node);
  const literal = literalValue(current);
  if (literal !== undefined) return literal.type;
  if (ts.isIdentifier(current)) return parameters.get(current.text);
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.ExclamationToken) return "boolean";
  if (ts.isBinaryExpression(current)) {
    if ([
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.LessThanToken,
      ts.SyntaxKind.LessThanEqualsToken,
      ts.SyntaxKind.GreaterThanToken,
      ts.SyntaxKind.GreaterThanEqualsToken,
    ].includes(current.operatorToken.kind)) return "boolean";
    if ([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(current.operatorToken.kind)
      && inferredExpressionType(current.left, parameters) === "boolean"
      && inferredExpressionType(current.right, parameters) === "boolean") return "boolean";
  }
  return undefined;
}

function inferredPrimitiveReturnType(node) {
  const parameters = new Map();
  for (const parameter of node.parameters) {
    if (!ts.isIdentifier(parameter.name)) return undefined;
    const type = typeName(parameter.type);
    if (type === undefined) return undefined;
    parameters.set(parameter.name.text, type);
  }
  const types = [];
  let invalid = false;
  function collect(current) {
    if (ts.isReturnStatement(current)) {
      const type = current.expression === undefined ? undefined : inferredExpressionType(current.expression, parameters);
      if (type === undefined) invalid = true;
      else types.push(type);
      return;
    }
    current.forEachChild(collect);
  }
  if (ts.isBlock(node.body)) collect(node.body);
  else {
    const type = inferredExpressionType(node.body, parameters);
    if (type === undefined) invalid = true;
    else types.push(type);
  }
  if (invalid || types.length === 0 || types.some((type) => type !== types[0])) return undefined;
  return types[0];
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
  if (node.body === undefined) return blocked(base, [BLOCKERS.UNSUPPORTED_CONTROL], ["provide an executable function body"]);
  const returnType = typeName(node.type) ?? (node.type === undefined ? inferredPrimitiveReturnType(node) : undefined);
  if (returnType === undefined) {
    return blocked(base, [BLOCKERS.UNSUPPORTED_CONTROL], [node.type === undefined ? "prove one inferred primitive return type" : "admit an explicit primitive return type"]);
  }
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
  let returnExpressions = 0;
  function collectReturns(current) {
    if (ts.isReturnStatement(current)) {
      if (current.expression === undefined) blockers.push(BLOCKERS.UNSUPPORTED_CONTROL);
      else {
        const literal = literalValue(current.expression);
        if (literal !== undefined) {
          returnLiterals.push(literal);
          returnExpressions += 1;
        } else if (ts.isIdentifier(unwrapExpression(current.expression)) || ts.isBinaryExpression(unwrapExpression(current.expression)) || ts.isPrefixUnaryExpression(unwrapExpression(current.expression))) {
          returnExpressions += 1;
        } else blockers.push(BLOCKERS.UNSUPPORTED_CONTROL);
      }
    }
    current.forEachChild(collectReturns);
  }
  if (ts.isBlock(node.body)) {
    collectReturns(node.body);
  } else {
    const literal = literalValue(node.body);
    if (literal !== undefined) returnLiterals.push(literal);
    else if (!(ts.isIdentifier(unwrapExpression(node.body)) || ts.isBinaryExpression(unwrapExpression(node.body)) || ts.isPrefixUnaryExpression(unwrapExpression(node.body)))) blockers.push(BLOCKERS.UNSUPPORTED_CONTROL);
    returnExpressions = 1;
  }
  const total = ts.isBlock(node.body) ? node.body.statements.some(alwaysReturns) : true;
  if (blockers.length > 0 || returnExpressions === 0 || !total) return blocked(base, blockers.length > 0 ? blockers : [BLOCKERS.UNSUPPORTED_CONTROL], ["prove total return coverage"]);
  if (returnType === "number" && returnLiterals.some((item) => item.type === "number" && !Number.isSafeInteger(item.value))) return blocked(base, [BLOCKERS.BINARY64], ["admit only exact safe integer function returns"]);
  if (returnType === "number" && returnLiterals.some((item) => item.type === "number" && !physicalInt(item.value))) return blocked(base, [BLOCKERS.PHYSICAL_INT_RANGE], ["remain within the independently proved signed-i32 physical Int profile"]);
  if (returnType === "string" && returnLiterals.some((item) => item.type === "string" && !physicalStringLiteral(item.value))) return blocked(base, [BLOCKERS.PHYSICAL_STRING_LITERAL], ["use only String values that round-trip exactly through the selected Fungi literal profile"]);
  const result = freezeResult({ ...base, outcome: "SUPPORTED", complete: true, blockers: [], kind: "function", parameters, returnType, operators: [...operators].sort(codeUnitCompare) });
  admitted.add(result);
  admittedNodes.set(result, node);
  return result;
}

export function classifyTypeScriptSource({ source, file, symbol }) {
  canonicalRelativeTsPath(file);
  if (typeof source !== "string" || source.length === 0) {
    throw new SandboxRefusal("CLASSIFIER_INPUT_INVALID", "classifier requires source text and one identifier symbol");
  }
  canonicalSourceSymbol(symbol);
  const provenance = {
    schema: "galerina.ts-to-fungi-classifier.v1",
    typescriptVersion: TYPESCRIPT_VERSION,
    file,
    symbol,
  };
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const parseErrors = sourceFile.parseDiagnostics ?? [];
  if (parseErrors.length > 0) return freezeResult({ ...provenance, outcome: "MANUAL_REVIEW", complete: false, blockers: [], reason: "TypeScript parser diagnostics", diagnostics: parseErrors.map((item) => item.code) });
  const enumMember = findExplicitStringConstEnumMember(sourceFile, symbol);
  if (enumMember !== undefined) {
    const base = {
      ...provenance,
      range: { start: enumMember.node.getStart(sourceFile), end: enumMember.node.getEnd() },
      inventory: inventory(enumMember.node),
    };
    if (!physicalStringLiteral(enumMember.value.value)) {
      return blocked(base, [BLOCKERS.PHYSICAL_STRING_LITERAL], ["use only String values that round-trip exactly through the selected Fungi literal profile"]);
    }
    const result = freezeResult({ ...base, outcome: "SUPPORTED", complete: true, blockers: [], kind: "constant", value: enumMember.value });
    admitted.add(result);
    admittedNodes.set(result, enumMember.node);
    return result;
  }
  const foundMatches = findDeclarations(sourceFile, symbol);
  const runtimeMatches = foundMatches.filter(isRuntimeMatch);
  const matches = runtimeMatches.length === 1 && foundMatches.every((match) => isRuntimeMatch(match) || isTypeOnlyMatch(match))
    ? runtimeMatches
    : foundMatches;
  if (matches.length !== 1) return freezeResult({ ...provenance, outcome: "MANUAL_REVIEW", complete: false, blockers: [], reason: `expected one declaration, found ${matches.length}` });
  const match = matches[0];
  const node = match.node;
  const base = {
    ...provenance,
    range: { start: node.getStart(sourceFile), end: node.getEnd() },
    inventory: inventory(node),
  };
  if (ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)) {
    return blocked(base, [BLOCKERS.ACTIVE_OBJECT], ["preserve runtime constructor or enum object identity, prototype, descriptors and mutation"]);
  }
  if (match.kind === "declaration" || declarationKinds.has(node.kind)) {
    return blocked(base, [BLOCKERS.DECLARATION_ONLY], ["retain the public TypeScript declaration until governed binding replacement"]);
  }
  if (match.kind === "function") return validateFunction(node, base);
  const declaration = node;
  if ((match.statement.declarationList.flags & ts.NodeFlags.Const) === 0 || declaration.initializer === undefined) {
    return blocked(base, [BLOCKERS.ACTIVE_OBJECT], ["preserve mutable binding and initialization semantics"]);
  }
  const value = literalValue(declaration.initializer, sourceFile);
  if (value !== undefined) {
    if (value.type === "number" && !physicalInt(value.value)) {
      return blocked(base, [BLOCKERS.PHYSICAL_INT_RANGE], ["remain within the independently proved signed-i32 physical Int profile"]);
    }
    if (value.type === "string" && !physicalStringLiteral(value.value)) {
      return blocked(base, [BLOCKERS.PHYSICAL_STRING_LITERAL], ["use only String values that round-trip exactly through the selected Fungi literal profile"]);
    }
    const result = freezeResult({ ...base, outcome: "SUPPORTED", complete: true, blockers: [], kind: "constant", value });
    admitted.add(result);
    admittedNodes.set(result, node);
    return result;
  }
  const expression = unwrapExpression(declaration.initializer);
  if (expression.kind === ts.SyntaxKind.RegularExpressionLiteral) {
    return blocked(base, [BLOCKERS.ACTIVE_OBJECT], ["preserve RegExp identity, lastIndex, prototype behavior and mutation"]);
  }
  if (ts.isBigIntLiteral(expression)
    || (ts.isPrefixUnaryExpression(expression)
      && expression.operator === ts.SyntaxKind.MinusToken
      && ts.isBigIntLiteral(expression.operand))) {
    return blocked(base, [BLOCKERS.BIGINT], ["admit the complete JavaScript BigInt domain and exact physical integer representation"]);
  }
  if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    return blocked(base, [BLOCKERS.UNRESOLVED_OBSERVATION], ["bind the observed dependency, property-access order, getter/proxy behavior and immutable snapshot"]);
  }
  if (ts.isBinaryExpression(expression) || ts.isConditionalExpression(expression)) {
    return blocked(base, [BLOCKERS.UNRESOLVED_EXPRESSION], ["preserve operand observation, short-circuit order, coercion, called effects and failure identity"]);
  }
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
    if (isConstEnum(statement)) {
      for (const member of statement.members) {
        const memberName = enumMemberName(member);
        const initializer = member.initializer === undefined ? undefined : unwrapExpression(member.initializer);
        if (memberName !== undefined && initializer !== undefined && (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))) symbols.push(`${statement.name.text}.${memberName}`);
      }
    }
  }
  return Object.freeze([...new Set(symbols)]
    .map((symbol) => classifyTypeScriptSource({ source, file, symbol }))
    .filter((classification) => classification.outcome === "SUPPORTED"));
}

export function inventoryTypeScriptScopes({ source, file }) {
  canonicalRelativeTsPath(file);
  if (typeof source !== "string" || source.length === 0) {
    throw new SandboxRefusal("INVENTORY_INPUT_INVALID", "inventory requires non-empty TypeScript source text");
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
    if (isConstEnum(statement)) {
      for (const member of statement.members) {
        const memberName = enumMemberName(member);
        const initializer = member.initializer === undefined ? undefined : unwrapExpression(member.initializer);
        if (memberName !== undefined && initializer !== undefined && (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer))) symbols.push(`${statement.name.text}.${memberName}`);
      }
    }
  }
  return Object.freeze([...new Set(symbols)].map((symbol) => classifyTypeScriptSource({ source, file, symbol })));
}

export function isAdmittedClassification(value) {
  return admitted.has(value);
}

export function admittedClassificationNode(value) {
  return admittedNodes.get(value);
}
