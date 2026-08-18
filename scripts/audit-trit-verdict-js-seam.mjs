#!/usr/bin/env node
// Trit/Verdict JavaScript seam audit.
//
// This is a conservative source gate for the untyped host seam. It does not
// replace the strict TypeScript cast-hygiene gate, mutation testing, sentinel
// parity, or conversion acceptance. It rejects source shapes that can erase
// Trit/Verdict identity, observe hostile records more than once, trust a
// caller-mintable success Boolean, or derive authoritative bytes from an
// ambiguous host representation.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";

const TOOL_VERSION = "1.1.0";
const MAX_SOURCE_BYTES = 1_048_576;
const UTF8 = new TextDecoder("utf-8", { fatal: true });
const requireFromCompiler = createRequire(new URL(
  "../packages-galerina/galerina-core-compiler/package.json",
  import.meta.url,
));
const ts = requireFromCompiler("typescript");

const RULES = Object.freeze([
  Object.freeze({ code: "RAW_NUMERIC_AUTHORITY", detail: "raw numeric object fields cannot mint Trit or Verdict authority" }),
  Object.freeze({ code: "RAW_NONFINITE_AUTHORITY", detail: "NaN and infinities cannot enter Trit or Verdict authority" }),
  Object.freeze({ code: "FAIL_OPEN_TRIT_VERDICT_GUARD", detail: "range or absence-of-error guards admit values outside the exact branded domain" }),
  Object.freeze({ code: "NEGATIVE_ZERO_AUTHORITY", detail: "strict equality with zero admits JavaScript negative zero unless it is refused explicitly" }),
  Object.freeze({ code: "ERASED_AUTHORITY_RECORD", detail: "authority fields must be captured through one exact own-data decoder" }),
  Object.freeze({ code: "REPEATED_AUTHORITY_FIELD_READ", detail: "repeated property reads can observe different getter or Proxy values" }),
  Object.freeze({ code: "CALLER_MINTABLE_AUTHORITY_BOOLEAN", detail: "caller fields named as success or trust cannot release authority" }),
  Object.freeze({ code: "AMBIENT_CANONICAL_COLLATION", detail: "ambient localeCompare ordering is not a canonical byte protocol" }),
  Object.freeze({ code: "NON_INJECTIVE_CANONICAL_FRAMING", detail: "delimiter concatenation cannot define an authoritative preimage" }),
  Object.freeze({ code: "UNVERSIONED_JSON_AUTHORITY", detail: "host JSON serialization is not a versioned exact authoritative byte format" }),
  Object.freeze({ code: "DUPLICATE_KEY_CANONICALIZATION", detail: "object rebuilding or ordinary JSON parsing does not reject duplicate keys" }),
  Object.freeze({ code: "UNADMITTED_LIVE_TYPED_ARRAY", detail: "live byte views require an admitted copy or live-view contract before authority use" }),
]);

export const TRIT_VERDICT_JS_SEAM_RULESET_DIGEST = `sha256:${createHash("sha256")
  .update(JSON.stringify(RULES), "utf8")
  .digest("hex")}`;

function parseArgs(argv) {
  const options = { root: process.cwd(), entries: [], json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--root requires one path");
      options.root = resolve(value);
      index += 1;
    } else if (argument === "--entry") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--entry requires one path");
      options.entries.push(value);
      index += 1;
    } else if (argument === "--json") {
      options.json = true;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source.charCodeAt(index) === 10) line += 1;
  return line;
}

function maskSource(source) {
  const code = [...source];
  const commentFree = [...source];
  let mode = "code";
  let quote = "";
  for (let index = 0; index < code.length; index += 1) {
    const ch = code[index];
    const next = code[index + 1] ?? "";
    if (mode === "line-comment") {
      if (ch === "\n") mode = "code";
      else {
        code[index] = " ";
        commentFree[index] = " ";
      }
      continue;
    }
    if (mode === "block-comment") {
      if (ch === "*" && next === "/") {
        code[index] = " ";
        code[index + 1] = " ";
        commentFree[index] = " ";
        commentFree[index + 1] = " ";
        index += 1;
        mode = "code";
      } else if (ch !== "\n") {
        code[index] = " ";
        commentFree[index] = " ";
      }
      continue;
    }
    if (mode === "string") {
      if (ch === "\\") {
        code[index] = " ";
        if (index + 1 < code.length && code[index + 1] !== "\n") code[index + 1] = " ";
        index += 1;
      } else if (ch === quote) {
        code[index] = " ";
        mode = "code";
      } else if (ch === "\n" && quote !== "`") {
        return { code: code.join(""), commentFree: commentFree.join(""), refusal: "UNTERMINATED_STRING" };
      } else if (ch !== "\n") {
        code[index] = " ";
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      code[index] = " ";
      code[index + 1] = " ";
      commentFree[index] = " ";
      commentFree[index + 1] = " ";
      index += 1;
      mode = "line-comment";
    } else if (ch === "/" && next === "*") {
      code[index] = " ";
      code[index + 1] = " ";
      commentFree[index] = " ";
      commentFree[index + 1] = " ";
      index += 1;
      mode = "block-comment";
    } else if (ch === "'" || ch === '"' || ch === "`") {
      quote = ch;
      code[index] = " ";
      mode = "string";
    }
  }
  if (mode === "block-comment") return { code: code.join(""), commentFree: commentFree.join(""), refusal: "UNTERMINATED_BLOCK_COMMENT" };
  if (mode === "string") return { code: code.join(""), commentFree: commentFree.join(""), refusal: "UNTERMINATED_STRING" };
  return { code: code.join(""), commentFree: commentFree.join(""), refusal: null };
}

function addFinding(findings, source, path, code, match, subject = match[0]) {
  const rule = RULES.find((candidate) => candidate.code === code);
  findings.push({
    code,
    path,
    line: lineAt(source, match.index ?? 0),
    subject: subject.trim().slice(0, 160),
    detail: rule?.detail ?? "unsafe host seam",
  });
}

function isAuthorityTemplateFraming(commentFree, match) {
  const start = match.index ?? 0;
  const interpolationCount = [...match[0].matchAll(/\$\{/gu)].length;
  if (interpolationCount < 2) return false;

  const lineStart = commentFree.lastIndexOf("\n", start - 1) + 1;
  const semicolonStart = commentFree.lastIndexOf(";", start - 1) + 1;
  const statementStart = Math.max(lineStart, semicolonStart);
  const lineEndCandidate = commentFree.indexOf("\n", start + match[0].length);
  const semicolonEndCandidate = commentFree.indexOf(";", start + match[0].length);
  const candidates = [lineEndCandidate, semicolonEndCandidate].filter((value) => value >= 0);
  const statementEnd = candidates.length === 0 ? commentFree.length : Math.min(...candidates);
  const prefix = commentFree.slice(statementStart, start);
  const statement = commentFree.slice(statementStart, statementEnd);

  const directDigestSink = /\.update\s*\([^)]*$/u.test(prefix);
  const namedAssignment = prefix.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/u);
  const namedAuthorityValue = namedAssignment !== null
    && /(?:canonical|preimage|frame|mac|digest|signature|hash)/iu.test(namedAssignment[1]);
  const returnedAuthorityValue = /\breturn\s+$/u.test(prefix)
    && /\b(?:canonical|preimage|frame|mac|digest|signature|hash)\b/iu.test(statement);
  return directDigestSink || namedAuthorityValue || returnedAuthorityValue;
}

function syntaxTree(path, source) {
  const scriptKind = /\.[cm]?js$/iu.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind);
  const diagnostic = tree.parseDiagnostics[0];
  return diagnostic === undefined ? { tree, refusal: null } : {
    tree,
    refusal: {
      code: "TRIT_VERDICT_SEAM_UNKNOWN",
      path,
      line: lineAt(source, diagnostic.start ?? 0),
      detail: "TypeScript syntax could not be classified exactly",
    },
  };
}

function containsByteAdmission(body, parameterName) {
  let admitted = false;
  function visit(node) {
    if (admitted) return;
    if (node !== body && ts.isFunctionLike(node)) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      const first = node.arguments[0];
      if (
        (name === "captureImmutableBytes" || name === "retainAdmittedLiveByteView")
        && first !== undefined
        && ts.isIdentifier(first)
        && first.text === parameterName
      ) admitted = true;
    }
    if (!admitted) ts.forEachChild(node, visit);
  }
  visit(body);
  return admitted;
}

function inspectTypedArrayParameters(findings, path, source, tree) {
  function visit(node) {
    if (ts.isFunctionLike(node) && node.body !== undefined) {
      for (const parameter of node.parameters) {
        if (
          ts.isIdentifier(parameter.name)
          && parameter.type?.getText(tree) === "Uint8Array"
          && !containsByteAdmission(node.body, parameter.name.text)
        ) {
          const match = [parameter.getText(tree)];
          match.index = parameter.getStart(tree);
          addFinding(findings, source, path, "UNADMITTED_LIVE_TYPED_ARRAY", match, parameter.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}

function matchAt(node, tree, subject = node.getText(tree)) {
  const match = [subject];
  match.index = node.getStart(tree);
  return match;
}

function leftmostIdentifier(node) {
  let current = node;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current.text : null;
}

function inspectAuthorityProperties(findings, path, source, tree) {
  function inspectScope(root, parameterNames) {
    const authorityReads = [];
    function visit(node) {
      if (node !== root && ts.isFunctionLike(node)) return;
      if (ts.isPropertyAccessExpression(node)) {
        const field = node.name.text.toLowerCase();
        if (field === "trit" || field === "verdict") authorityReads.push(node);
        if (["success", "verified", "authorized", "attested", "trusted", "safe"].includes(field)) {
          const owner = leftmostIdentifier(node.expression);
          if (owner !== null && parameterNames.has(owner)) {
            addFinding(findings, source, path, "CALLER_MINTABLE_AUTHORITY_BOOLEAN", matchAt(node, tree));
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(root);
    if (authorityReads.length === 0) return;
    addFinding(findings, source, path, "ERASED_AUTHORITY_RECORD", matchAt(authorityReads[0], tree));
    const counts = new Map();
    for (const read of authorityReads) {
      const key = read.getText(tree).toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const repeated = [...counts.entries()].find(([, count]) => count > 1);
    if (repeated !== undefined) {
      const read = authorityReads.find((candidate) => candidate.getText(tree).toLowerCase() === repeated[0]);
      addFinding(findings, source, path, "REPEATED_AUTHORITY_FIELD_READ", matchAt(read, tree), repeated[0]);
    }
  }

  inspectScope(tree, new Set());
  function visitFunctions(node) {
    if (ts.isFunctionLike(node) && node.body !== undefined) {
      const parameters = new Set(node.parameters.filter((parameter) => ts.isIdentifier(parameter.name)).map((parameter) => parameter.name.text));
      inspectScope(node.body, parameters);
    }
    ts.forEachChild(node, visitFunctions);
  }
  visitFunctions(tree);
}

function syntaxSegments(tree, code) {
  const bodies = [];
  function visit(node) {
    if (ts.isFunctionLike(node) && node.body !== undefined) {
      bodies.push({ start: node.body.getStart(tree), end: node.body.getEnd() });
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  const topLevel = [...code];
  for (const body of bodies) {
    for (let index = body.start; index < body.end; index += 1) {
      if (topLevel[index] !== "\n") topLevel[index] = " ";
    }
  }
  return [
    { text: topLevel.join(""), start: 0 },
    ...bodies.map((body) => ({ text: code.slice(body.start, body.end), start: body.start })),
  ];
}

function inspectNegativeZeroMembership(findings, path, source, code, tree) {
  const membership = /\b([A-Za-z_$][\w$]*)\s*===\s*-\s*1\s*\|\|\s*\1\s*===\s*0\s*\|\|\s*\1\s*===\s*1/gu;
  for (const segment of syntaxSegments(tree, code)) {
    for (const localMatch of segment.text.matchAll(membership)) {
      const name = localMatch[1];
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const negativeZeroRefusal = new RegExp(`Object\\.is\\s*\\(\\s*${escaped}\\s*,\\s*-\\s*0\\s*\\)|Object\\.is\\s*\\(\\s*-\\s*0\\s*,\\s*${escaped}\\s*\\)`, "u");
      if (!negativeZeroRefusal.test(segment.text)) {
        const match = [...localMatch];
        match.index = segment.start + (localMatch.index ?? 0);
        addFinding(findings, source, path, "NEGATIVE_ZERO_AUTHORITY", match);
      }
    }
  }
}

function sameFunctionNodes(body, predicate) {
  const matches = [];
  function visit(node) {
    if (node !== body && ts.isFunctionLike(node)) return;
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(body);
  return matches;
}

function enclosingFunctionBody(node) {
  let current = node.parent;
  while (current !== undefined) {
    if (ts.isFunctionLike(current)) return current.body;
    current = current.parent;
  }
  return undefined;
}

function isIdentifierCall(node, name) {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name;
}

function isJsonCall(node, method) {
  return ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression)
    && node.expression.expression.text === "JSON"
    && node.expression.name.text === method;
}

function admittedJsonStringify(call, body) {
  const argument = call.arguments[0];
  if (argument === undefined) return false;
  if (isIdentifierCall(argument, "admitVersionedCanonicalJsonRoot")) return true;
  if (!ts.isIdentifier(argument)) return false;
  return sameFunctionNodes(body, (node) => (
    ts.isVariableDeclaration(node)
    && node.getStart() < call.getStart()
    && ts.isIdentifier(node.name)
    && node.name.text === argument.text
    && node.initializer !== undefined
    && isIdentifierCall(node.initializer, "admitVersionedCanonicalJsonRoot")
  )).length === 1;
}

function capturedJsonParse(call, body) {
  const declaration = call.parent;
  if (!ts.isVariableDeclaration(declaration) || declaration.initializer !== call || !ts.isIdentifier(declaration.name)) {
    return false;
  }
  const parsedName = declaration.name.text;
  const captures = sameFunctionNodes(body, (node) => {
    if (
      !ts.isVariableDeclaration(node)
      || node.getStart() <= call.getStart()
      || !ts.isIdentifier(node.name)
      || node.initializer === undefined
      || !ts.isCallExpression(node.initializer)
      || !ts.isIdentifier(node.initializer.expression)
      || !new Set(["captureExactOwnDataRecord", "captureStoredSnapshot"]).has(node.initializer.expression.text)
    ) return false;
    const first = node.initializer.arguments[0];
    return first !== undefined && ts.isIdentifier(first) && first.text === parsedName;
  });
  if (captures.length !== 1) return false;
  const capture = captures[0];
  if (!ts.isVariableDeclaration(capture) || !ts.isIdentifier(capture.name)) return false;
  const capturedName = capture.name.text;
  return sameFunctionNodes(body, (node) => (
    node.getStart() > capture.getStart()
    && isIdentifierCall(node, "assertExactCanonicalJsonBytes")
    && node.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === capturedName)
  )).length === 1;
}

function inspectJsonAuthority(findings, path, source, tree) {
  function visit(node) {
    if (isJsonCall(node, "stringify")) {
      const body = enclosingFunctionBody(node);
      if (body === undefined || !admittedJsonStringify(node, body)) {
        addFinding(findings, source, path, "UNVERSIONED_JSON_AUTHORITY", matchAt(node, tree), "JSON.stringify(");
      }
    } else if (isJsonCall(node, "parse")) {
      const body = enclosingFunctionBody(node);
      if (body === undefined || !capturedJsonParse(node, body)) {
        addFinding(findings, source, path, "DUPLICATE_KEY_CANONICALIZATION", matchAt(node, tree), "JSON.parse(");
      }
    } else if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === "Object"
      && node.expression.name.text === "fromEntries"
    ) {
      addFinding(findings, source, path, "DUPLICATE_KEY_CANONICALIZATION", matchAt(node, tree), "Object.fromEntries(");
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}

export function inspectTritVerdictJsSeamSource(path, source) {
  const violations = [];
  const refusals = [];
  const syntax = syntaxTree(path, source);
  if (syntax.refusal !== null) {
    refusals.push(syntax.refusal);
    return { violations, refusals };
  }
  const masked = maskSource(source);
  if (masked.refusal !== null) {
    refusals.push({ code: masked.refusal, path, line: 1 });
    return { violations, refusals };
  }
  const code = masked.code;

  const rawAuthority = /\b(?:verdict|trit)\s*:\s*(?:-\s*1|-\s*0|0|1)\b/giu;
  for (const match of code.matchAll(rawAuthority)) addFinding(violations, source, path, "RAW_NUMERIC_AUTHORITY", match);
  const rawNonFinite = /\b(?:verdict|trit)\s*:\s*(?:NaN|(?:-\s*)?Infinity)\b/giu;
  for (const match of code.matchAll(rawNonFinite)) addFinding(violations, source, path, "RAW_NONFINITE_AUTHORITY", match);

  const failOpenGuards = [
    /\b([A-Za-z_$][\w$]*)\s*<\s*-\s*1\s*\|\|\s*\1\s*>\s*1/gu,
    /\bMath\.abs\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*>\s*1/gu,
  ];
  for (const pattern of failOpenGuards) {
    for (const match of code.matchAll(pattern)) addFinding(violations, source, path, "FAIL_OPEN_TRIT_VERDICT_GUARD", match);
  }

  inspectNegativeZeroMembership(violations, path, source, code, syntax.tree);
  inspectAuthorityProperties(violations, path, source, syntax.tree);
  const inheritedAuthority = [...masked.commentFree.matchAll(/["'](?:trit|verdict)["']\s+in\s+[A-Za-z_$][\w$]*/giu)];
  if (inheritedAuthority.length > 0) addFinding(violations, source, path, "ERASED_AUTHORITY_RECORD", inheritedAuthority[0]);

  for (const match of code.matchAll(/\.localeCompare\s*\(/gu)) addFinding(violations, source, path, "AMBIENT_CANONICAL_COLLATION", match);

  const hasAuthorityBytes = /\b(?:canonical|preimage|createHash|createHmac|digest|sign|verify|mac)\b/iu.test(code);
  if (hasAuthorityBytes) {
    for (const match of code.matchAll(/\.join\s*\(/gu)) addFinding(violations, source, path, "NON_INJECTIVE_CANONICAL_FRAMING", match);
    for (const match of code.matchAll(/\.update\s*\([^\n)]*\+/gu)) addFinding(violations, source, path, "NON_INJECTIVE_CANONICAL_FRAMING", match);
    for (const match of masked.commentFree.matchAll(/`(?:\\.|[^`])*\$\{[^}]+\}(?:\\.|[^`])*`/gsu)) {
      if (isAuthorityTemplateFraming(masked.commentFree, match)) {
        addFinding(violations, source, path, "NON_INJECTIVE_CANONICAL_FRAMING", match);
      }
    }
  }

  inspectJsonAuthority(violations, path, source, syntax.tree);

  inspectTypedArrayParameters(violations, path, source, syntax.tree);

  return { violations, refusals };
}

function repositoryCommit(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).trim();
  } catch {
    return null;
  }
}

function commitBoundBlob(root, path) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", path], { cwd: root, stdio: "ignore", windowsHide: true });
    const working = execFileSync("git", ["hash-object", `--path=${path}`, path], { cwd: root, encoding: "utf8", windowsHide: true }).trim();
    const committed = execFileSync("git", ["rev-parse", `HEAD:${path}`], { cwd: root, encoding: "utf8", windowsHide: true }).trim();
    return working === committed && /^[0-9a-f]{40}$/u.test(committed) ? committed : null;
  } catch {
    return null;
  }
}

export function auditTritVerdictJsSeam(options) {
  let rootReal;
  try {
    rootReal = realpathSync(options.root);
  } catch {
    rootReal = options.root;
  }
  const filesInspected = [];
  const violations = [];
  const refusals = [];
  const commit = repositoryCommit(rootReal);
  if (!/^[0-9a-f]{40}$/u.test(commit ?? "")) refusals.push({ code: "REPOSITORY_COMMIT_UNAVAILABLE", path: ".", line: 0 });
  if (options.entries.length === 0) refusals.push({ code: "ENTRY_REQUIRED", path: ".", line: 0 });
  if (new Set(options.entries).size !== options.entries.length) refusals.push({ code: "DUPLICATE_ENTRY", path: ".", line: 0 });

  for (const requested of options.entries) {
    const candidate = resolve(rootReal, requested);
    const normalized = relative(rootReal, candidate).replaceAll("\\", "/");
    if (!isInside(rootReal, candidate)) {
      refusals.push({ code: "ENTRY_OUTSIDE_ROOT", path: requested, line: 0 });
      continue;
    }
    let actual;
    let bytes;
    try {
      if (lstatSync(candidate).isSymbolicLink()) throw new Error("symbolic link");
      actual = realpathSync(candidate);
      if (!isInside(rootReal, actual) || !lstatSync(actual).isFile()) throw new Error("not a contained file");
      bytes = readFileSync(actual);
    } catch {
      refusals.push({ code: "ENTRY_UNREADABLE", path: normalized, line: 0 });
      continue;
    }
    if (bytes.byteLength > MAX_SOURCE_BYTES) {
      refusals.push({ code: "SOURCE_TOO_LARGE", path: normalized, line: 0 });
      continue;
    }
    let source;
    try {
      source = UTF8.decode(bytes);
    } catch {
      refusals.push({ code: "SOURCE_NOT_UTF8", path: normalized, line: 0 });
      continue;
    }
    const gitBlobOid = commitBoundBlob(rootReal, normalized);
    if (gitBlobOid === null) refusals.push({ code: "ENTRY_NOT_COMMIT_BOUND", path: normalized, line: 0 });
    filesInspected.push({
      path: normalized,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      gitBlobOid,
    });
    const findings = inspectTritVerdictJsSeamSource(normalized, source);
    violations.push(...findings.violations);
    refusals.push(...findings.refusals);
  }

  const verdict = refusals.length > 0 ? "REFUSED" : violations.length > 0 ? "VIOLATION" : "CLEAN";
  return {
    schema: "galerina.trit-verdict-js-seam.v1",
    toolVersion: TOOL_VERSION,
    rulesetDigest: TRIT_VERDICT_JS_SEAM_RULESET_DIGEST,
    repositoryCommit: commit,
    verdict,
    filesInspected,
    violations,
    refusals,
  };
}

function argumentRefusal(error) {
  return {
    schema: "galerina.trit-verdict-js-seam.v1",
    toolVersion: TOOL_VERSION,
    rulesetDigest: TRIT_VERDICT_JS_SEAM_RULESET_DIGEST,
    repositoryCommit: null,
    verdict: "REFUSED",
    filesInspected: [],
    violations: [],
    refusals: [{
      code: "ARGUMENT_REFUSED",
      path: ".",
      line: 0,
      detail: error instanceof Error ? error.message : "unknown argument failure",
    }],
  };
}

function main() {
  let options;
  let report;
  try {
    options = parseArgs(process.argv.slice(2));
    report = auditTritVerdictJsSeam(options);
  } catch (error) {
    report = argumentRefusal(error);
  }
  if (options?.json === true) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(`${report.verdict}: ${report.filesInspected.length} file(s), ${report.violations.length} violation(s), ${report.refusals.length} refusal(s)\n`);
    for (const finding of [...report.violations, ...report.refusals]) {
      process.stdout.write(`  ${finding.code} ${finding.path}:${finding.line}${finding.subject ? ` ${finding.subject}` : ""}\n`);
    }
  }
  process.exitCode = report.verdict === "CLEAN" ? 0 : report.verdict === "VIOLATION" ? 1 : 2;
}

const invokedPath = process.argv[1] === undefined ? null : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) main();
