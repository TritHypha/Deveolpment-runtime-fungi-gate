#!/usr/bin/env node
// Detached SLIDE authority-path audit.
//
// A post-snapshot lowering module may consume only checked snapshot material
// and emit typed GIR material or a typed refusal. It must not regain authority
// by reaching back into the TypeScript AST/compiler, a runtime engine, or an
// index. Unknown source analysis refuses; it never reports a clean path.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { TextDecoder } from "node:util";
import {
  inspectTritVerdictJsSeamSource,
  TRIT_VERDICT_JS_SEAM_RULESET_DIGEST,
} from "./audit-trit-verdict-js-seam.mjs";

const TOOL_VERSION = "1.0.0";
const MAX_SOURCE_BYTES = 1_048_576;
const UTF8 = new TextDecoder("utf-8", { fatal: true });

const RULES = Object.freeze([
  Object.freeze({
    code: "EMIT_GIR_AST_PATH",
    module: /(?:^|[/\\])gir-emitter(?:\.[cm]?[jt]s)?$/iu,
    call: /\bemitGIR\s*\(/gu,
    detail: "post-snapshot code must not import or call the AST-to-GIR emitter",
  }),
  Object.freeze({
    code: "TYPESCRIPT_COMPILER_API",
    module: /^(?:typescript|typescript\/)/u,
    detail: "post-snapshot code must not use TypeScript compiler APIs",
  }),
  Object.freeze({
    code: "WAT_WASM_EXECUTION",
    module: /(?:^|[/@-])(?:wabt|wat-wasm|wat-emitter|wasm-runtime)(?:$|[/.-])/iu,
    call: /\b(?:WebAssembly|emitWAT|emitWat|assembleWat|executeWasm)\b/gu,
    detail: "post-snapshot code must not emit WAT or execute Wasm",
  }),
  Object.freeze({
    code: "TOWER_RUNTIME",
    module: /(?:^|[/@-])(?:galerina-)?tower-citizen(?:$|[/.-])/iu,
    detail: "post-snapshot code must not call the Tower runtime",
  }),
  Object.freeze({
    code: "TRI_PIPE_RUNTIME",
    module: /(?:^|[/@-])(?:galerina-)?tri-pipe(?:$|[/.-])/iu,
    detail: "post-snapshot code must not call Tri-Pipe",
  }),
  Object.freeze({
    code: "HYPHA_INDEX_RUNTIME",
    module: /(?:^|[/@-])(?:devtools-)?hypha(?:$|[/.-])/iu,
    detail: "post-snapshot code must not use Hypha as runtime storage or authority",
  }),
]);

const RULESET_DIGEST = `sha256:${createHash("sha256")
  .update(JSON.stringify({
    authorityRules: RULES.map(({ code, module, call, detail }) => ({
      code,
      module: module?.source ?? null,
      call: call?.source ?? null,
      detail,
    })),
    tritVerdictJsSeamRulesetDigest: TRIT_VERDICT_JS_SEAM_RULESET_DIGEST,
  }), "utf8")
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

function maskCommentsAndLiterals(source) {
  const chars = [...source];
  let mode = "code";
  let quote = "";
  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index];
    const next = chars[index + 1] ?? "";
    if (mode === "line-comment") {
      if (ch === "\n") mode = "code";
      else chars[index] = " ";
      continue;
    }
    if (mode === "block-comment") {
      if (ch === "*" && next === "/") {
        chars[index] = " ";
        chars[index + 1] = " ";
        index += 1;
        mode = "code";
      } else if (ch !== "\n") chars[index] = " ";
      continue;
    }
    if (mode === "string") {
      if (ch === "\\") {
        chars[index] = " ";
        if (index + 1 < chars.length && chars[index + 1] !== "\n") chars[index + 1] = " ";
        index += 1;
      } else if (ch === quote) {
        chars[index] = " ";
        mode = "code";
      } else if (ch === "\n") {
        return { masked: chars.join(""), refusal: "UNTERMINATED_STRING" };
      } else {
        chars[index] = " ";
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 1;
      mode = "line-comment";
    } else if (ch === "/" && next === "*") {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 1;
      mode = "block-comment";
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      chars[index] = " ";
      mode = "string";
    } else if (ch === "`") {
      return { masked: chars.join(""), refusal: "TEMPLATE_LITERAL_UNSUPPORTED" };
    }
  }
  if (mode === "block-comment") return { masked: chars.join(""), refusal: "UNTERMINATED_BLOCK_COMMENT" };
  if (mode === "string") return { masked: chars.join(""), refusal: "UNTERMINATED_STRING" };
  return { masked: chars.join(""), refusal: null };
}

function moduleSpecifiers(source, maskedSource) {
  const matches = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[\w$*,{}\s]+?\s+from\s+["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (maskedSource[match.index ?? 0] === " ") continue;
      matches.push({ specifier: match[1], offset: match.index ?? 0 });
    }
  }
  return matches;
}

function inspectSource(path, source) {
  const forbiddenEdges = [];
  const refusals = [];
  const masked = maskCommentsAndLiterals(source);
  if (masked.refusal !== null) {
    refusals.push({ code: masked.refusal, path, line: 1 });
    return { forbiddenEdges, refusals };
  }

  const computedImport = [...source.matchAll(/\b(?:import|require)\s*\(\s*(?!["'])/gu)]
    .find((match) => masked.masked[match.index ?? 0] !== " ");
  if (computedImport !== undefined) {
    refusals.push({
      code: "NON_LITERAL_DYNAMIC_IMPORT",
      path,
      line: lineAt(source, computedImport.index),
    });
  }

  for (const imported of moduleSpecifiers(source, masked.masked)) {
    for (const rule of RULES) {
      if (rule.module?.test(imported.specifier)) {
        forbiddenEdges.push({
          code: rule.code,
          path,
          line: lineAt(source, imported.offset),
          subject: imported.specifier,
          detail: rule.detail,
        });
      }
    }
  }
  for (const rule of RULES) {
    if (rule.call === undefined) continue;
    rule.call.lastIndex = 0;
    for (const match of masked.masked.matchAll(rule.call)) {
      forbiddenEdges.push({
        code: rule.code,
        path,
        line: lineAt(source, match.index ?? 0),
        subject: match[0],
        detail: rule.detail,
      });
    }
  }
  const seam = inspectTritVerdictJsSeamSource(path, source);
  forbiddenEdges.push(...seam.violations);
  refusals.push(...seam.refusals);
  return { forbiddenEdges, refusals };
}

function repositoryCommit(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function commitBoundBlob(root, path) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", path], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true,
    });
    const working = execFileSync("git", ["hash-object", `--path=${path}`, path], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    const committed = execFileSync("git", ["rev-parse", `HEAD:${path}`], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    return working === committed && /^[0-9a-f]{40}$/u.test(committed) ? committed : null;
  } catch {
    return null;
  }
}

function audit(options) {
  let rootReal;
  try {
    rootReal = realpathSync(options.root);
  } catch {
    rootReal = options.root;
  }
  const filesInspected = [];
  const forbiddenEdges = [];
  const refusals = [];
  const commit = repositoryCommit(rootReal);
  if (!/^[0-9a-f]{40}$/u.test(commit ?? "")) {
    refusals.push({ code: "REPOSITORY_COMMIT_UNAVAILABLE", path: ".", line: 0 });
  }
  if (options.entries.length === 0) {
    refusals.push({ code: "ENTRY_REQUIRED", path: ".", line: 0 });
  }
  if (new Set(options.entries).size !== options.entries.length) {
    refusals.push({ code: "DUPLICATE_ENTRY", path: ".", line: 0 });
  }

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
    if (gitBlobOid === null) {
      refusals.push({ code: "ENTRY_NOT_COMMIT_BOUND", path: normalized, line: 0 });
    }
    filesInspected.push({
      path: normalized,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      gitBlobOid,
    });
    const findings = inspectSource(normalized, source);
    forbiddenEdges.push(...findings.forbiddenEdges);
    refusals.push(...findings.refusals);
  }

  const verdict = refusals.length > 0
    ? "REFUSED"
    : forbiddenEdges.length > 0
      ? "VIOLATION"
      : "CLEAN";
  return {
    schema: "galerina.detached-slide-authority-path.v1",
    toolVersion: TOOL_VERSION,
    rulesetDigest: RULESET_DIGEST,
    repositoryCommit: commit,
    verdict,
    filesInspected,
    forbiddenEdges,
    refusals,
  };
}

let options;
let report;
try {
  options = parseArgs(process.argv.slice(2));
  report = audit(options);
} catch (error) {
  report = {
    schema: "galerina.detached-slide-authority-path.v1",
    toolVersion: TOOL_VERSION,
    rulesetDigest: RULESET_DIGEST,
    repositoryCommit: null,
    verdict: "REFUSED",
    filesInspected: [],
    forbiddenEdges: [],
    refusals: [{
      code: "ARGUMENT_REFUSED",
      path: ".",
      line: 0,
      detail: error instanceof Error ? error.message : "unknown argument failure",
    }],
  };
}

if (options?.json === true) {
  process.stdout.write(`${JSON.stringify(report)}\n`);
} else {
  process.stdout.write(`${report.verdict}: ${report.filesInspected.length} file(s), ${report.forbiddenEdges.length} forbidden edge(s), ${report.refusals.length} refusal(s)\n`);
  for (const finding of [...report.forbiddenEdges, ...report.refusals]) {
    process.stdout.write(`  ${finding.code} ${finding.path}:${finding.line}${finding.subject ? ` ${finding.subject}` : ""}\n`);
  }
}

process.exitCode = report.verdict === "CLEAN" ? 0 : report.verdict === "VIOLATION" ? 1 : 2;
