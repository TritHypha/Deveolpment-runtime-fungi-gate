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
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";

const TOOL_VERSION = "1.0.0";
const MAX_SOURCE_BYTES = 1_048_576;
const UTF8 = new TextDecoder("utf-8", { fatal: true });

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

export function inspectTritVerdictJsSeamSource(path, source) {
  const violations = [];
  const refusals = [];
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

  const membership = /\b([A-Za-z_$][\w$]*)\s*===\s*-\s*1\s*\|\|\s*\1\s*===\s*0\s*\|\|\s*\1\s*===\s*1/gu;
  for (const match of code.matchAll(membership)) {
    const name = match[1];
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const negativeZeroRefusal = new RegExp(`Object\\.is\\s*\\(\\s*${escaped}\\s*,\\s*-\\s*0\\s*\\)|Object\\.is\\s*\\(\\s*-\\s*0\\s*,\\s*${escaped}\\s*\\)`, "u");
    if (!negativeZeroRefusal.test(code)) addFinding(violations, source, path, "NEGATIVE_ZERO_AUTHORITY", match);
  }

  const authorityReads = [...code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\?*\.\s*(trit|verdict)\b/giu)];
  if (authorityReads.length > 0) addFinding(violations, source, path, "ERASED_AUTHORITY_RECORD", authorityReads[0]);
  const inheritedAuthority = [...masked.commentFree.matchAll(/["'](?:trit|verdict)["']\s+in\s+[A-Za-z_$][\w$]*/giu)];
  if (inheritedAuthority.length > 0) addFinding(violations, source, path, "ERASED_AUTHORITY_RECORD", inheritedAuthority[0]);
  const readCounts = new Map();
  for (const match of authorityReads) {
    const key = `${match[1]}.${match[2].toLowerCase()}`;
    readCounts.set(key, (readCounts.get(key) ?? 0) + 1);
  }
  const repeated = [...readCounts.entries()].find(([, count]) => count > 1);
  if (repeated !== undefined) {
    const match = authorityReads.find((candidate) => `${candidate[1]}.${candidate[2].toLowerCase()}` === repeated[0]);
    addFinding(violations, source, path, "REPEATED_AUTHORITY_FIELD_READ", match, repeated[0]);
  }

  const callerBoolean = /\b[A-Za-z_$][\w$]*\s*\?*\.\s*(?:success|verified|authorized|attested|trusted|safe)\b/giu;
  for (const match of code.matchAll(callerBoolean)) addFinding(violations, source, path, "CALLER_MINTABLE_AUTHORITY_BOOLEAN", match);

  for (const match of code.matchAll(/\.localeCompare\s*\(/gu)) addFinding(violations, source, path, "AMBIENT_CANONICAL_COLLATION", match);

  const hasAuthorityBytes = /\b(?:canonical|preimage|createHash|createHmac|digest|sign|verify|mac)\b/iu.test(code);
  if (hasAuthorityBytes) {
    for (const match of code.matchAll(/\.join\s*\(/gu)) addFinding(violations, source, path, "NON_INJECTIVE_CANONICAL_FRAMING", match);
    for (const match of code.matchAll(/\.update\s*\([^\n)]*\+/gu)) addFinding(violations, source, path, "NON_INJECTIVE_CANONICAL_FRAMING", match);
    for (const match of masked.commentFree.matchAll(/`(?:\\.|[^`])*\$\{[^}]+\}(?:\\.|[^`])*`/gsu)) {
      addFinding(violations, source, path, "NON_INJECTIVE_CANONICAL_FRAMING", match);
    }
  }

  for (const match of code.matchAll(/\bJSON\.stringify\s*\(/gu)) addFinding(violations, source, path, "UNVERSIONED_JSON_AUTHORITY", match);
  for (const match of code.matchAll(/\b(?:JSON\.parse|Object\.fromEntries)\s*\(/gu)) addFinding(violations, source, path, "DUPLICATE_KEY_CANONICALIZATION", match);

  for (const parameter of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*Uint8Array\b/gu)) {
    const name = parameter[1];
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const admitted = new RegExp(`\\b(?:captureImmutableBytes|retainAdmittedLiveByteView)\\s*\\(\\s*${escaped}\\b`, "u");
    if (!admitted.test(code)) addFinding(violations, source, path, "UNADMITTED_LIVE_TYPED_ARRAY", parameter, name);
  }

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
