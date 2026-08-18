import { parseProgram } from "../../../packages-galerina/galerina-core-compiler/dist/index.js";

import { SandboxRefusal } from "./contracts.mjs";
import { admittedClassificationNode, isAdmittedClassification } from "./classifier.mjs";
import { ts } from "./typescript-api.mjs";

const typeMap = Object.freeze({ boolean: "Bool", number: "Int", string: "String" });
const binaryMap = new Map([
  [ts.SyntaxKind.EqualsEqualsEqualsToken, "=="],
  [ts.SyntaxKind.ExclamationEqualsEqualsToken, "!="],
  [ts.SyntaxKind.AmpersandAmpersandToken, "&&"],
  [ts.SyntaxKind.BarBarToken, "||"],
  [ts.SyntaxKind.LessThanToken, "<"],
  [ts.SyntaxKind.LessThanEqualsToken, "<="],
  [ts.SyntaxKind.GreaterThanToken, ">"],
  [ts.SyntaxKind.GreaterThanEqualsToken, ">="],
]);
const stringVectors = Object.freeze(["", "a", "\0", "é", "\uD800"]);

function freezeValue(value) {
  if (Array.isArray(value)) {
    for (const item of value) freezeValue(item);
    return Object.freeze(value);
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) freezeValue(item);
    return Object.freeze(value);
  }
  return value;
}

function lowerCamel(name) {
  const parts = name.replaceAll("$", "_").replaceAll(".", "_").split(/_+/u).filter(Boolean);
  const candidate = parts.map((part, index) => {
    const word = /^[A-Z0-9]+$/u.test(part)
      ? part.toLowerCase()
      : part[0].toLowerCase() + part.slice(1);
    return index === 0 ? word : word[0].toUpperCase() + word.slice(1);
  }).join("");
  if (!/^[a-z][A-Za-z0-9_]*$/u.test(candidate)) throw new SandboxRefusal("LOWERED_NAME_INVALID", "symbol cannot be represented as a Fungi identifier");
  return candidate;
}

function fungiStringLiteral(value) {
  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new SandboxRefusal("LOWERER_STRING_SURROGATE_UNSUPPORTED", "selected physical String ABI refuses lone UTF-16 surrogate code units");
      }
      encoded += value[index] + value[index + 1];
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new SandboxRefusal("LOWERER_STRING_SURROGATE_UNSUPPORTED", "selected physical String ABI refuses lone UTF-16 surrogate code units");
    }
    if (codeUnit < 0x20 || codeUnit === 0x22 || codeUnit === 0x5c) {
      encoded += `\\u${codeUnit.toString(16).padStart(4, "0")}`;
    } else {
      encoded += value[index];
    }
  }
  return `"${encoded}"`;
}

function literal(value) {
  if (value.type === "boolean") return value.value ? "true" : "false";
  if (value.type === "number") return String(value.value);
  if (value.type === "string") return fungiStringLiteral(value.value);
  throw new SandboxRefusal("LOWERER_LITERAL_UNSUPPORTED", "unsupported admitted literal");
}

function expression(node) {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return `(${expression(node.expression)})`;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return "true";
  if (node.kind === ts.SyntaxKind.FalseKeyword) return "false";
  if (ts.isNumericLiteral(node)) return String(Number(node.text.replaceAll("_", "")));
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return fungiStringLiteral(node.text);
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPrefixUnaryExpression(node)) {
    if (node.operator === ts.SyntaxKind.ExclamationToken) return `!${expression(node.operand)}`;
    if (node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return `-${expression(node.operand)}`;
  }
  if (ts.isBinaryExpression(node)) {
    const operator = binaryMap.get(node.operatorToken.kind);
    if (operator !== undefined) return `${expression(node.left)} ${operator} ${expression(node.right)}`;
  }
  throw new SandboxRefusal("LOWERER_AST_UNSUPPORTED", `unsupported admitted expression ${ts.SyntaxKind[node.kind]}`);
}

function evaluateExpression(node, bindings) {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return evaluateExpression(node.expression, bindings);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) return Number(node.text.replaceAll("_", ""));
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) {
    if (!bindings.has(node.text)) throw new SandboxRefusal("LOWERER_VECTOR_IDENTIFIER_UNBOUND", `unbound differential identifier ${node.text}`);
    return bindings.get(node.text);
  }
  if (ts.isPrefixUnaryExpression(node)) {
    if (node.operator === ts.SyntaxKind.ExclamationToken) return !evaluateExpression(node.operand, bindings);
    if (node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return -evaluateExpression(node.operand, bindings);
  }
  if (ts.isBinaryExpression(node)) {
    const left = evaluateExpression(node.left, bindings);
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return left && evaluateExpression(node.right, bindings);
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) return left || evaluateExpression(node.right, bindings);
    const right = evaluateExpression(node.right, bindings);
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) return left === right;
    if (node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) return left !== right;
    if (node.operatorToken.kind === ts.SyntaxKind.LessThanToken) return left < right;
    if (node.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken) return left <= right;
    if (node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken) return left > right;
    if (node.operatorToken.kind === ts.SyntaxKind.GreaterThanEqualsToken) return left >= right;
  }
  throw new SandboxRefusal("LOWERER_VECTOR_EXPRESSION_UNSUPPORTED", `unsupported admitted differential expression ${ts.SyntaxKind[node.kind]}`);
}

function evaluateStatements(block, bindings) {
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
      return { returned: true, value: evaluateExpression(statement.expression, bindings) };
    }
    if (ts.isIfStatement(statement)) {
      const selected = evaluateExpression(statement.expression, bindings) ? statement.thenStatement : statement.elseStatement;
      if (selected !== undefined) {
        const selectedBlock = ts.isBlock(selected) ? selected : { statements: [selected] };
        const result = evaluateStatements(selectedBlock, bindings);
        if (result.returned) return result;
      }
      continue;
    }
    throw new SandboxRefusal("LOWERER_VECTOR_STATEMENT_UNSUPPORTED", `unsupported admitted differential statement ${ts.SyntaxKind[statement.kind]}`);
  }
  return { returned: false };
}

function argumentVectors(parameters) {
  let vectors = [[]];
  for (const parameter of parameters) {
    const domain = parameter.type === "boolean" ? [false, true] : stringVectors;
    vectors = vectors.flatMap((prior) => domain.map((value) => [...prior, value]));
  }
  return vectors;
}

function statements(block, indent = "  ") {
  const lines = [];
  for (const statement of block.statements) {
    if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
      lines.push(`${indent}return ${expression(statement.expression)}`);
    } else if (ts.isIfStatement(statement) && statement.elseStatement === undefined && ts.isBinaryExpression(statement.expression) && statement.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      lines.push(`${indent}if ${expression(statement.expression.left)} {`);
      lines.push(`${indent}  if ${expression(statement.expression.right)} {`);
      const thenBlock = ts.isBlock(statement.thenStatement) ? statement.thenStatement : { statements: [statement.thenStatement] };
      lines.push(...statements(thenBlock, `${indent}    `));
      lines.push(`${indent}  }`);
      lines.push(`${indent}}`);
    } else if (ts.isIfStatement(statement)) {
      lines.push(`${indent}if ${expression(statement.expression)} {`);
      const thenBlock = ts.isBlock(statement.thenStatement) ? statement.thenStatement : { statements: [statement.thenStatement] };
      lines.push(...statements(thenBlock, `${indent}  `));
      if (statement.elseStatement !== undefined) {
        lines.push(`${indent}} else {`);
        const elseBlock = ts.isBlock(statement.elseStatement) ? statement.elseStatement : { statements: [statement.elseStatement] };
        lines.push(...statements(elseBlock, `${indent}  `));
      }
      lines.push(`${indent}}`);
    } else {
      throw new SandboxRefusal("LOWERER_STATEMENT_UNSUPPORTED", `unsupported admitted statement ${ts.SyntaxKind[statement.kind]}`);
    }
  }
  return lines;
}

export function lowerClassifiedSymbol(classification) {
  if (!isAdmittedClassification(classification) || classification.outcome !== "SUPPORTED" || classification.complete !== true) {
    throw new SandboxRefusal("LOWERER_UNADMITTED_CLASSIFICATION", "lowerer accepts only module-minted complete classifications");
  }
  const baseFlow = lowerCamel(classification.symbol);
  let body;
  let parameters;
  let returnType;
  let expected;
  let vectors;
  let parameterNames;
  if (classification.kind === "constant") {
    parameters = "";
    parameterNames = [];
    returnType = typeMap[classification.value.type];
    expected = classification.value.value;
    vectors = [{ arguments: [], expected }];
    body = [`  return ${literal(classification.value)}`];
  } else {
    const node = admittedClassificationNode(classification);
    if (node === undefined || (!ts.isFunctionDeclaration(node) && !ts.isArrowFunction(node)) || node.body === undefined) {
      throw new SandboxRefusal("LOWERER_AST_CUSTODY_MISSING", "admitted function lost private AST custody");
    }
    parameters = classification.parameters.map((parameter) => `${parameter.name}: ${typeMap[parameter.type]}`).join(", ");
    parameterNames = classification.parameters.map((parameter) => parameter.name);
    returnType = typeMap[classification.returnType];
    expected = undefined;
    body = ts.isBlock(node.body) ? statements(node.body) : [`  return ${expression(node.body)}`];
    vectors = argumentVectors(classification.parameters).map((arguments_) => {
      const bindings = new Map(parameterNames.map((name, index) => [name, arguments_[index]]));
      const result = ts.isBlock(node.body)
        ? evaluateStatements(node.body, bindings)
        : { returned: true, value: evaluateExpression(node.body, bindings) };
      if (!result.returned) throw new SandboxRefusal("LOWERER_VECTOR_NOT_TOTAL", "admitted function did not return for one differential vector");
      return { arguments: arguments_, expected: result.value };
    });
  }
  if (returnType === undefined) throw new SandboxRefusal("LOWERER_TYPE_UNSUPPORTED", "admitted type lacks a Fungi mapping");
  let lastErrors = [];
  for (const flow of [baseFlow, `${baseFlow}Value`]) {
    const source = `@version 1\n/// Non-authorizing sandbox candidate; TypeScript remains the oracle.\n/// TypeScript oracle: ${classification.file}#${classification.symbol}\npure flow ${flow}(${parameters}) -> ${returnType}\ncontract { intent { "Preserve the admitted TypeScript decision under differential evidence." } }\n{\n${body.join("\n")}\n}\n`;
    const parsed = parseProgram(source, `sandbox/${flow}.fungi`, { requireVersionHeader: true });
    const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length === 0 && parsed.flows.length === 1 && parsed.flows[0]?.name === flow) {
      return freezeValue({ source, flow, expected, returnType, sourceSymbol: classification.symbol, parameterNames, vectors });
    }
    lastErrors = errors;
  }
  throw new SandboxRefusal("LOWERER_REPARSE_FAILED", `emitted Fungi was refused: ${lastErrors.map((item) => item.code).join(",")}`);
}
