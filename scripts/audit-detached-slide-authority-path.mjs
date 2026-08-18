#!/usr/bin/env node
// Detached SLIDE authority-path audit.
//
// The accepted post-snapshot route is a bounded, commit-bound local module
// closure. Unknown imports, analysis ceilings and byte drift refuse rather
// than becoming a clean result.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { pathToFileURL } from "node:url";
import { TextDecoder } from "node:util";
import {
  inspectTritVerdictJsSeamSource,
  TRIT_VERDICT_JS_SEAM_RULESET_DIGEST,
} from "./audit-trit-verdict-js-seam.mjs";

const TOOL_VERSION = "1.1.0";
const MAX_SOURCE_BYTES = 1_048_576;
const UTF8 = new TextDecoder("utf-8", { fatal: true });
const INERT_PACKAGE_IMPORTS = Object.freeze(["node:crypto", "node:util"]);

const RULES = Object.freeze([
  Object.freeze({
    code: "EMIT_GIR_AST_PATH",
    module: /(?:^|[/\\])(?:gir-emitter|semantic-graph|execution-plan|ast-(?:visitor|interpreter))(?:\.[cm]?[jt]s)?$/iu,
    call: /\b(?:emitGIR|buildSemanticGraph|buildExecutionPlan)\s*\(/gu,
    detail: "post-snapshot code must not regain AST or legacy GIR authority",
  }),
  Object.freeze({
    code: "TYPESCRIPT_COMPILER_API",
    module: /^(?:typescript|typescript\/|tsserver|tsserver\/)/u,
    detail: "post-snapshot code must not use TypeScript compiler APIs",
  }),
  Object.freeze({
    code: "WAT_WASM_EXECUTION",
    module: /(?:^|[/@-])(?:wabt|wat-wasm|wat-emitter|wasm-runtime)(?:$|[/.-])/iu,
    call: /\b(?:WebAssembly|emitWAT|emitWat|assembleWat|executeWasm|runWasmStandaloneBuild)\b/gu,
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
    code: "TRI_FUSE_RUNTIME",
    module: /(?:^|[/@-])(?:galerina-)?tri-fuse(?:$|[/.-])/iu,
    detail: "post-snapshot code must not call Tri-Fuse",
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
    inertPackageImports: [...INERT_PACKAGE_IMPORTS],
    tritVerdictJsSeamRulesetDigest: TRIT_VERDICT_JS_SEAM_RULESET_DIGEST,
  }), "utf8")
  .digest("hex")}`;

function parsePositiveInteger(value, option) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${option} requires one positive safe integer`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    entries: [],
    expectedHead: null,
    maximumFiles: 256,
    maximumEdges: 2_048,
    json: false,
  };
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
    } else if (argument === "--expected-head") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--expected-head requires one commit");
      options.expectedHead = value;
      index += 1;
    } else if (argument === "--maximum-files") {
      options.maximumFiles = parsePositiveInteger(argv[index + 1], "--maximum-files");
      index += 1;
    } else if (argument === "--maximum-edges") {
      options.maximumEdges = parsePositiveInteger(argv[index + 1], "--maximum-edges");
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

function relativeLocator(root, candidate) {
  return relative(root, candidate).replaceAll("\\", "/");
}

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function maskCommentsAndLiterals(source) {
  const chars = [...source];
  let mode = "code";
  let quote = "";
  const templateExpressionDepths = [];
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
    if (mode === "template") {
      if (ch === "\\") {
        chars[index] = " ";
        if (index + 1 < chars.length && chars[index + 1] !== "\n") chars[index + 1] = " ";
        index += 1;
      } else if (ch === "`") {
        chars[index] = " ";
        mode = "code";
      } else if (ch === "$" && next === "{") {
        chars[index] = " ";
        chars[index + 1] = " ";
        index += 1;
        templateExpressionDepths.push(1);
        mode = "code";
      } else if (ch !== "\n") {
        chars[index] = " ";
      }
      continue;
    }
    if (templateExpressionDepths.length > 0) {
      const top = templateExpressionDepths.length - 1;
      if (ch === "{") {
        templateExpressionDepths[top] += 1;
      } else if (ch === "}") {
        templateExpressionDepths[top] -= 1;
        chars[index] = " ";
        if (templateExpressionDepths[top] === 0) {
          templateExpressionDepths.pop();
          mode = "template";
        }
        continue;
      } else if (ch === "`") {
        return { masked: chars.join(""), refusal: "NESTED_TEMPLATE_LITERAL_UNSUPPORTED" };
      }
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
      chars[index] = " ";
      mode = "template";
    }
  }
  if (mode === "block-comment") return { masked: chars.join(""), refusal: "UNTERMINATED_BLOCK_COMMENT" };
  if (mode === "string") return { masked: chars.join(""), refusal: "UNTERMINATED_STRING" };
  if (mode === "template" || templateExpressionDepths.length > 0) {
    return { masked: chars.join(""), refusal: "UNTERMINATED_TEMPLATE_LITERAL" };
  }
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
  matches.sort((left, right) => left.offset - right.offset || left.specifier.localeCompare(right.specifier));
  return matches;
}

function inspectSource(path, source) {
  const violations = [];
  const refusals = [];
  const masked = maskCommentsAndLiterals(source);
  if (masked.refusal !== null) {
    refusals.push({ code: masked.refusal, path, line: 1 });
    return { violations, refusals, imports: [] };
  }
  const computedImport = [...source.matchAll(/\b(?:import|require)\s*\(\s*(?!["'])/gu)]
    .find((match) => masked.masked[match.index ?? 0] !== " ");
  if (computedImport !== undefined) {
    refusals.push({ code: "NON_LITERAL_DYNAMIC_IMPORT", path, line: lineAt(source, computedImport.index ?? 0) });
  }
  const imports = moduleSpecifiers(source, masked.masked);
  for (const imported of imports) {
    for (const rule of RULES) {
      if (rule.module !== undefined) rule.module.lastIndex = 0;
      if (rule.module?.test(imported.specifier)) {
        violations.push({
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
      violations.push({
        code: rule.code,
        path,
        line: lineAt(source, match.index ?? 0),
        subject: match[0],
        detail: rule.detail,
      });
    }
  }
  const seam = inspectTritVerdictJsSeamSource(path, source);
  violations.push(...seam.violations);
  refusals.push(...seam.refusals);
  return { violations, refusals, imports };
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

function candidateModulePaths(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const extension = extname(base).toLowerCase();
  const candidates = [base];
  if (extension === ".js") candidates.push(`${base.slice(0, -3)}.ts`, `${base.slice(0, -3)}.tsx`);
  else if (extension === ".mjs") candidates.push(`${base.slice(0, -4)}.mts`);
  else if (extension === ".cjs") candidates.push(`${base.slice(0, -4)}.cts`);
  else if (extension === "") {
    candidates.push(`${base}.ts`, `${base}.mts`, `${base}.cts`, `${base}.js`, `${base}.mjs`, `${base}.cjs`);
  }
  return [...new Set(candidates)];
}

function resolveLocalModule(root, fromFile, specifier) {
  const candidates = candidateModulePaths(fromFile, specifier)
    .filter((candidate) => isInside(root, candidate) && existsSync(candidate))
    .filter((candidate) => {
      try {
        return !lstatSync(candidate).isSymbolicLink() && lstatSync(candidate).isFile();
      } catch {
        return false;
      }
    });
  const unique = [...new Set(candidates.map((candidate) => realpathSync(candidate)))];
  return unique.length === 1 ? unique[0] : null;
}

function readSourceFile(root, absolutePath) {
  const path = relativeLocator(root, absolutePath);
  let actual;
  let bytes;
  try {
    if (!isInside(root, absolutePath) || lstatSync(absolutePath).isSymbolicLink()) throw new Error("outside or symbolic link");
    actual = realpathSync(absolutePath);
    if (!isInside(root, actual) || !lstatSync(actual).isFile()) throw new Error("not a contained file");
    bytes = readFileSync(actual);
  } catch {
    return { refusal: { code: "ENTRY_UNREADABLE", path: isInside(root, absolutePath) ? path : ".", line: 0 } };
  }
  if (bytes.byteLength > MAX_SOURCE_BYTES) return { refusal: { code: "SOURCE_TOO_LARGE", path, line: 0 } };
  let source;
  try {
    source = UTF8.decode(bytes);
  } catch {
    return { refusal: { code: "SOURCE_NOT_UTF8", path, line: 0 } };
  }
  const gitBlobOid = commitBoundBlob(root, path);
  return {
    actual,
    source,
    file: Object.freeze({
      path,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      gitBlobOid,
    }),
    refusal: gitBlobOid === null ? { code: "ENTRY_NOT_COMMIT_BOUND", path, line: 0 } : null,
  };
}

function frozenRecords(records) {
  return Object.freeze(records.map((record) => Object.freeze(record)));
}

function makeReport({ repositoryHead, entryFiles, inspectedFiles, inspectedEdges, violations, refusals }) {
  const status = refusals.length > 0 ? "REFUSED" : violations.length > 0 ? "VIOLATION" : "CLEAN";
  const truncation = refusals.find((finding) => finding.code === "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  return Object.freeze({
    schema: "galerina.detached-slide-authority-path.v1",
    toolVersion: TOOL_VERSION,
    rulesetDigest: RULESET_DIGEST,
    repositoryHead,
    graphBuildPoint: null,
    graphFreshness: "UNKNOWN",
    entryFiles: Object.freeze([...entryFiles]),
    inspectedFiles: frozenRecords(inspectedFiles),
    inspectedEdges: frozenRecords(inspectedEdges),
    violations: frozenRecords(violations),
    refusals: frozenRecords(refusals),
    status,
    failureId: truncation?.code ?? refusals[0]?.code ?? violations[0]?.code ?? null,
  });
}

export async function auditDetachedAuthorityPath({
  repoRoot,
  entryFiles,
  expectedHead,
  maximumFiles = 256,
  maximumEdges = 2_048,
}) {
  let root;
  try {
    root = realpathSync(resolve(repoRoot));
  } catch {
    root = resolve(repoRoot);
  }
  const repositoryHead = repositoryCommit(root);
  const inspectedFiles = [];
  const inspectedEdges = [];
  const violations = [];
  const refusals = [];
  const normalizedEntries = [];
  const queue = [];
  const queued = new Set();
  const seen = new Set();
  const caseOwners = new Map();

  if (!/^[0-9a-f]{40}$/u.test(repositoryHead ?? "")) {
    refusals.push({ code: "REPOSITORY_COMMIT_UNAVAILABLE", path: ".", line: 0 });
  }
  const requiredHead = expectedHead ?? repositoryHead;
  if (!/^[0-9a-f]{40}$/u.test(requiredHead ?? "")) {
    refusals.push({ code: "EXPECTED_HEAD_REQUIRED", path: ".", line: 0 });
  } else if (repositoryHead !== requiredHead) {
    refusals.push({ code: "EXPECTED_HEAD_MISMATCH", path: ".", line: 0 });
  }
  if (!Number.isSafeInteger(maximumFiles) || maximumFiles < 1 || !Number.isSafeInteger(maximumEdges) || maximumEdges < 1) {
    refusals.push({ code: "INVALID_ANALYSIS_LIMIT", path: ".", line: 0 });
  }
  if (!Array.isArray(entryFiles) || entryFiles.length === 0) {
    refusals.push({ code: "ENTRY_REQUIRED", path: ".", line: 0 });
  } else if (new Set(entryFiles).size !== entryFiles.length) {
    refusals.push({ code: "DUPLICATE_ENTRY", path: ".", line: 0 });
  }

  for (const requested of Array.isArray(entryFiles) ? entryFiles : []) {
    const candidate = resolve(root, requested);
    if (!isInside(root, candidate)) {
      refusals.push({ code: "ENTRY_OUTSIDE_ROOT", path: ".", line: 0 });
      continue;
    }
    const locator = relativeLocator(root, candidate);
    normalizedEntries.push(locator);
    queue.push(candidate);
    queued.add(locator);
  }

  while (queue.length > 0) {
    const requested = queue.shift();
    const requestedLocator = relativeLocator(root, requested);
    if (seen.has(requestedLocator)) continue;
    if (inspectedFiles.length >= maximumFiles) {
      refusals.push({ code: "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED", path: requestedLocator, line: 0, detail: "file ceiling" });
      break;
    }
    const loaded = readSourceFile(root, requested);
    if (loaded.refusal !== null && loaded.refusal !== undefined) refusals.push(loaded.refusal);
    if (loaded.file === undefined || loaded.source === undefined || loaded.actual === undefined) {
      seen.add(requestedLocator);
      continue;
    }
    const locator = loaded.file.path;
    const folded = locator.toLowerCase();
    const priorCase = caseOwners.get(folded);
    if (priorCase !== undefined && priorCase !== locator) {
      refusals.push({ code: "CASE_COLLISION", path: locator, line: 0 });
      seen.add(locator);
      continue;
    }
    caseOwners.set(folded, locator);
    seen.add(locator);
    inspectedFiles.push(loaded.file);

    const findings = inspectSource(locator, loaded.source);
    violations.push(...findings.violations);
    refusals.push(...findings.refusals);

    for (const imported of findings.imports) {
      if (inspectedEdges.length >= maximumEdges) {
        refusals.push({ code: "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED", path: locator, line: lineAt(loaded.source, imported.offset), detail: "edge ceiling" });
        queue.length = 0;
        break;
      }
      const specifierForbidden = RULES.some((rule) => {
        if (rule.module !== undefined) rule.module.lastIndex = 0;
        return rule.module?.test(imported.specifier) === true;
      });
      const local = imported.specifier.startsWith(".") || isAbsolute(imported.specifier);
      if (!local) {
        inspectedEdges.push({ from: locator, to: null, specifier: imported.specifier, line: lineAt(loaded.source, imported.offset) });
        if (!specifierForbidden && !INERT_PACKAGE_IMPORTS.includes(imported.specifier)) {
          refusals.push({ code: "PACKAGE_IMPORT_NOT_INERT_ALLOWLIST", path: locator, line: lineAt(loaded.source, imported.offset), subject: imported.specifier });
        }
        continue;
      }
      const target = resolveLocalModule(root, loaded.actual, imported.specifier);
      if (target === null) {
        inspectedEdges.push({ from: locator, to: null, specifier: imported.specifier, line: lineAt(loaded.source, imported.offset) });
        if (!specifierForbidden) {
          refusals.push({ code: "UNRESOLVED_CLOSURE", path: locator, line: lineAt(loaded.source, imported.offset), subject: imported.specifier });
        }
        continue;
      }
      const targetLocator = relativeLocator(root, target);
      inspectedEdges.push({ from: locator, to: targetLocator, specifier: imported.specifier, line: lineAt(loaded.source, imported.offset) });
      if (!seen.has(targetLocator) && !queued.has(targetLocator)) {
        queue.push(target);
        queued.add(targetLocator);
      }
    }
  }

  return makeReport({
    repositoryHead,
    entryFiles: normalizedEntries,
    inspectedFiles,
    inspectedEdges,
    violations,
    refusals,
  });
}

function argumentRefusal(error) {
  return makeReport({
    repositoryHead: null,
    entryFiles: [],
    inspectedFiles: [],
    inspectedEdges: [],
    violations: [],
    refusals: [{
      code: "ARGUMENT_REFUSED",
      path: ".",
      line: 0,
      detail: error instanceof Error ? error.message : "unknown argument failure",
    }],
  });
}

async function main() {
  let options;
  let report;
  try {
    options = parseArgs(process.argv.slice(2));
    report = await auditDetachedAuthorityPath({
      repoRoot: options.root,
      entryFiles: options.entries,
      expectedHead: options.expectedHead,
      maximumFiles: options.maximumFiles,
      maximumEdges: options.maximumEdges,
    });
  } catch (error) {
    report = argumentRefusal(error);
  }
  if (options?.json === true) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(`${report.status}: ${report.inspectedFiles.length} file(s), ${report.violations.length} violation(s), ${report.refusals.length} refusal(s)\n`);
    for (const finding of [...report.violations, ...report.refusals]) {
      process.stdout.write(`  ${finding.code} ${finding.path}:${finding.line}${finding.subject ? ` ${finding.subject}` : ""}\n`);
    }
  }
  process.exitCode = report.status === "CLEAN" ? 0 : report.status === "VIOLATION" ? 1 : 2;
}

const invokedPath = process.argv[1] === undefined ? null : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) await main();
