// Classify descriptive FUNGI diagnostic identities without treating every
// uppercase token in prose, a test vector, or a domain tag as an emitted code.
//
// Numeric-tail identities remain owned by scripts/lib/codes.mjs. This module
// handles the deliberately descriptive families used by the signing and
// runtime refusal paths, for example FUNGI-FUSE-HASH-MISMATCH. Admission is
// syntax-bound: the token must occur in a string at a diagnostic sink, a code
// field, or a code-like definition. Comments and type-only positions cannot
// mint catalog authority.

const DESCRIPTIVE_TOKEN = /\bFUNGI-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g;
const TRAILING_PREFIX = /\bFUNGI-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-(?=["'`])/g;
const NUMERIC_TAIL = /-\d+[A-Z]?$/;
const PLACEHOLDER = /-(?:NNN|XXX|N|[A-Z])$/;

const DIAGNOSTIC_CALLS = new Set([
  "add",
  "error",
  "fuseError",
  "readJson",
  "runtimeError",
  "warn",
  "console.error",
  "console.log",
  "console.warn",
]);

const REFERENCE_BINDING = /(?:domain|fixture|example|prefix|family|category|pattern|template|tag|shape)$/i;
const IDENTITY_BINDING = /(?:code|error|warning|diagnostic)$/i;

function lineOf(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source.charCodeAt(index) === 10) line += 1;
  return line;
}

/**
 * Tokenize the bounded JavaScript/TypeScript surface required by the catalog.
 * Comments are discarded. Strings/templates are retained as one token so a
 * diagnostic token inside a message is observable without executing source.
 */
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (/\s/.test(char)) { index += 1; continue; }
    if (char === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const start = index;
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      if (index >= source.length) {
        tokens.push({ type: "invalid", value: "unterminated-comment", start });
        break;
      }
      index += 2;
      continue;
    }
    if (char === "/") {
      const previous = tokens[tokens.length - 1];
      const mayStartRegex = previous === undefined
        || (previous.type === "punct" && /[({[,:;=!?&|+*%^~<>-]/.test(previous.value))
        || (previous.type === "identifier" && /^(?:return|case|throw|else)$/.test(previous.value));
      if (mayStartRegex) {
        const start = index;
        let inClass = false;
        index += 1;
        while (index < source.length) {
          if (source[index] === "\\") { index += 2; continue; }
          if (source[index] === "[") inClass = true;
          else if (source[index] === "]") inClass = false;
          else if (source[index] === "/" && !inClass) {
            index += 1;
            while (index < source.length && /[A-Za-z]/.test(source[index])) index += 1;
            break;
          }
          index += 1;
        }
        tokens.push({ type: "regex", value: source.slice(start, index), start, end: index });
        continue;
      }
    }
    if (char === "\"" || char === "'" || char === "`") {
      const quote = char;
      const start = index;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") { index += 2; continue; }
        if (source[index] === quote) { index += 1; break; }
        index += 1;
      }
      tokens.push({ type: "string", value: source.slice(start, index), start, end: index });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) index += 1;
      tokens.push({ type: "identifier", value: source.slice(start, index), start, end: index });
      continue;
    }
    tokens.push({ type: "punct", value: char, start: index, end: index + 1 });
    index += 1;
  }
  return tokens;
}

function previousStatementTokens(tokens, from) {
  const out = [];
  for (let index = from; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.value === ";") break;
    out.unshift(token);
  }
  return out;
}

function enclosingCallName(tokens, stringIndex) {
  let depth = 0;
  for (let index = stringIndex - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.value === ")" || token.value === "]" || token.value === "}") { depth += 1; continue; }
    if (token.value === "]" || token.value === "}") continue;
    if (token.value === "(" || token.value === "[" || token.value === "{") {
      if (depth > 0) { depth -= 1; continue; }
      if (token.value !== "(") return undefined;
      const parts = [];
      let cursor = index - 1;
      while (cursor >= 0 && (tokens[cursor].type === "identifier" || tokens[cursor].value === ".")) {
        parts.unshift(tokens[cursor].value);
        cursor -= 1;
      }
      return { name: parts.join(""), open: index, before: cursor };
    }
  }
  return undefined;
}

function isTypeOnlyProperty(tokens, stringIndex) {
  if (tokens[stringIndex - 1]?.value !== ":") return false;
  const statement = previousStatementTokens(tokens, stringIndex - 2);
  return statement.some((token) => token.value === "type" || token.value === "interface" || token.value === "readonly");
}

function propertyNameBefore(tokens, stringIndex, operator) {
  if (tokens[stringIndex - 1]?.value !== operator) return undefined;
  const token = tokens[stringIndex - 2];
  return token?.type === "identifier" ? token.value : undefined;
}

function classifyStringContext(tokens, stringIndex) {
  if (isTypeOnlyProperty(tokens, stringIndex)) return "reference";

  const property = propertyNameBefore(tokens, stringIndex, ":");
  if (property === "code" || property === "errorCode") return "identity";
  if (property && REFERENCE_BINDING.test(property)) return "reference";

  const binding = propertyNameBefore(tokens, stringIndex, "=");
  if (binding && REFERENCE_BINDING.test(binding)) return "reference";
  if (binding && IDENTITY_BINDING.test(binding)) return "identity";

  const statement = previousStatementTokens(tokens, stringIndex - 1);
  const assignment = statement.findIndex((token) => token.value === "=");
  if (assignment > 0) {
    const statementBinding = statement.slice(0, assignment).reverse()
      .find((token) => token.type === "identifier")?.value;
    if (statementBinding && REFERENCE_BINDING.test(statementBinding)) return "reference";
  }

  const call = enclosingCallName(tokens, stringIndex);
  if (call) {
    if (/\.(?:startsWith|endsWith|includes)$/.test(call.name)) return "reference";
    if (DIAGNOSTIC_CALLS.has(call.name) || /(?:Error|Exception|Diag|Diagnostic)$/.test(call.name)) return "identity";
    const before = previousStatementTokens(tokens, call.before);
    if ((call.name === "Error" || call.name.endsWith("Error")) && before.some((token) => token.value === "throw")) return "identity";
  }
  return "unclassified";
}

/**
 * Return descriptive identities, deliberate references, and ambiguous tokens.
 * Test-only source is always non-authorizing even when it contains a real sink.
 */
export function classifyDescriptiveDiagnosticIdentities(source, options = {}) {
  const identities = [];
  const references = [];
  const unclassified = [];
  const tokens = tokenize(source);
  const sourceLines = source.split(/\r?\n/);
  const seen = new Set();

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex];
    if (token.type !== "string") continue;
    const matches = [
      ...token.value.matchAll(DESCRIPTIVE_TOKEN),
      ...token.value.matchAll(TRAILING_PREFIX),
    ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0) || right[0].length - left[0].length);
    for (const match of matches) {
      const code = match[0].endsWith("-") ? match[0].slice(0, -1) : match[0];
      if (NUMERIC_TAIL.test(code) || PLACEHOLDER.test(code)) continue;
      const offset = token.start + match.index;
      const key = `${code}:${offset}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const partial = match[0].endsWith("-") || token.value[(match.index ?? 0) + code.length] === "-";
      const entry = { code, line: lineOf(source, offset) };
      if (options.testOnly === true) { references.push({ ...entry, reason: "test-only" }); continue; }
      const lineText = sourceLines[entry.line - 1] ?? "";
      const previousLine = sourceLines[entry.line - 2] ?? "";
      if (/code-catalog-reference\b/.test(lineText) || /code-catalog-reference\b/.test(previousLine)) {
        references.push({ ...entry, reason: "explicit-reference" });
        continue;
      }
      const classification = classifyStringContext(tokens, tokenIndex);
      if (partial) {
        if (classification === "reference") references.push({ ...entry, reason: "partial-reference" });
        else unclassified.push({ ...entry, reason: "partial-token" });
        continue;
      }
      if (classification === "identity") identities.push(entry);
      else if (classification === "reference") references.push(entry);
      else unclassified.push(entry);
    }
  }
  return { identities, references, unclassified };
}
