#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  extname,
  isAbsolute,
  posix,
  relative,
  resolve,
  sep,
  win32,
} from "node:path";
import { pathToFileURL } from "node:url";

import { loadTypeScript } from "./lib/ts-to-fungi-sandbox/typescript-api.mjs";

const { runOwnedProcess } = createRequire(import.meta.url)("./lib/owned-process-tree.cjs");

const SCHEMA = "DetachedAuthorityAuditV1";
const TOOL_VERSION = "1.0.0";
const DEFAULT_MAXIMUM_FILES = 256;
const DEFAULT_MAXIMUM_EDGES = 2048;
const HARD_MAXIMUM_FILES = 4096;
const HARD_MAXIMUM_EDGES = 32768;
const MAXIMUM_SOURCE_BYTES = 4 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 15_000;
const COMMAND_OUTPUT_BYTES = 512 * 1024;
const GRAPH_PROJECT_ENV = "GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT";
const SOURCE_EXTENSIONS = Object.freeze([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const HEAD = /^[0-9a-f]{40}$/u;
const GRAPH_PROJECT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const RULES = Object.freeze({
  allowedPackageImports: Object.freeze([]),
  forbiddenModules: Object.freeze([
    Object.freeze({ id: "AST_REENTRY", patterns: Object.freeze(["ast", "execution-plan", "parser", "semantic-graph"]) }),
    Object.freeze({ id: "COMPONENT_AUTHORITY_BLEED", patterns: Object.freeze(["hypha", "tower", "tri-fuse", "tri-pipe"]) }),
    Object.freeze({ id: "LEGACY_EXECUTION_REENTRY", patterns: Object.freeze(["legacy-runtime", "run-wasm", "wasm", "wat-emitter"]) }),
    Object.freeze({ id: "TYPESCRIPT_REENTRY", patterns: Object.freeze(["ts-to-fungi-sandbox/classifier", "ts-to-fungi-sandbox/lower", "tsserver", "tsserverlibrary", "typescript"]) }),
  ]),
  forbiddenSymbols: Object.freeze([
    Object.freeze({ id: "AST_REENTRY", symbols: Object.freeze(["AstNode", "buildExecutionPlan", "buildSemanticGraph", "emitGIR", "visitAst"]) }),
    Object.freeze({ id: "COMPONENT_AUTHORITY_BLEED", symbols: Object.freeze(["Hypha", "Tower", "TriFuse", "TriPipe"]) }),
    Object.freeze({ id: "LEGACY_EXECUTION_REENTRY", symbols: Object.freeze(["assembleWasm", "cachedLegacyRuntime.execute", "emitWat", "runWasmRuntime", "runWasmStandaloneBuild"]) }),
    Object.freeze({ id: "TYPESCRIPT_REENTRY", symbols: Object.freeze(["classifyTypeScriptSandbox", "createProgram", "lowerTypeScriptSandbox", "server"]) }),
  ]),
});

function stableRulesetEncoding() {
  const normalized = {
    allowedPackageImports: [...RULES.allowedPackageImports].sort(),
    forbiddenModules: RULES.forbiddenModules
      .map((rule) => ({ id: rule.id, patterns: [...rule.patterns].sort() }))
      .sort((left, right) => compareText(left.id, right.id)),
    forbiddenSymbols: RULES.forbiddenSymbols
      .map((rule) => ({ id: rule.id, symbols: [...rule.symbols].sort() }))
      .sort((left, right) => compareText(left.id, right.id)),
  };
  return JSON.stringify(normalized);
}

const RULESET_DIGEST = createHash("sha256").update(stableRulesetEncoding(), "utf8").digest("hex");

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const member of Object.values(value)) deepFreeze(member);
  return Object.freeze(value);
}

function resultRecord({
  repositoryHead = null,
  graphBuildPoint = null,
  graphFreshness = "UNKNOWN",
  entryFiles = [],
  inspectedFiles = [],
  inspectedEdges = [],
  violations = [],
  status,
  failureId,
}) {
  return deepFreeze({
    schema: SCHEMA,
    toolVersion: TOOL_VERSION,
    rulesetDigest: RULESET_DIGEST,
    repositoryHead,
    graphBuildPoint,
    graphFreshness,
    entryFiles: [...entryFiles].sort(),
    inspectedFiles: [...inspectedFiles].sort((left, right) => compareText(left.locator, right.locator)),
    inspectedEdges: [...inspectedEdges].sort((left, right) =>
      compareText(left.from, right.from)
      || compareText(left.to, right.to)
      || compareText(left.id, right.id)),
    violations: [...violations].sort((left, right) =>
      compareText(left.file, right.file)
      || compareText(left.edgeId, right.edgeId)
      || compareText(left.id, right.id)),
    status,
    failureId,
  });
}

function refused(context, failureId, violations = context.violations ?? []) {
  return resultRecord({ ...context, violations, status: "REFUSED", failureId });
}

function canonicalLocator(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) return null;
  const slashPath = value.replaceAll("\\", "/");
  if (slashPath.includes(":") || isAbsolute(value) || posix.isAbsolute(slashPath) || win32.isAbsolute(value)) return null;
  const normalized = posix.normalize(slashPath);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.startsWith("./")) return null;
  if (normalized !== slashPath) return null;
  return normalized;
}

function contained(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function relativeLocator(root, candidate) {
  if (!contained(root, candidate)) return null;
  return canonicalLocator(relative(root, candidate).replaceAll("\\", "/"));
}

function comparablePath(value) {
  return resolve(value).replaceAll("\\", "/").toLowerCase();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function edgeId(kind, specifier, position) {
  const target = typeof specifier === "string" ? specifier : "non-literal";
  return `${kind}:${target}@${position}`;
}

function violation(id, file, idForEdge) {
  return Object.freeze({ id, file, edgeId: idForEdge });
}

function moduleRule(specifier) {
  const normalized = specifier.replaceAll("\\", "/").toLowerCase();
  for (const rule of RULES.forbiddenModules) {
    if (rule.patterns.some((pattern) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      return new RegExp(`(?:^|[/_.-])${escaped}(?:$|[/_.-])`, "u").test(normalized);
    })) return rule.id;
  }
  return null;
}

function symbolRule(symbol) {
  for (const rule of RULES.forbiddenSymbols) {
    if (rule.symbols.includes(symbol)) return rule.id;
  }
  return null;
}

function scriptKind(ts, locator) {
  const extension = extname(locator).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function importBindings(ts, statement) {
  const bindings = [];
  if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) return bindings;
  const clause = statement.importClause;
  if (clause.name !== undefined) bindings.push({ local: clause.name.text, imported: "default", namespace: false });
  const named = clause.namedBindings;
  if (named === undefined) return bindings;
  if (ts.isNamespaceImport(named)) {
    bindings.push({ local: named.name.text, imported: "*", namespace: true });
    return bindings;
  }
  for (const element of named.elements) {
    bindings.push({
      local: element.name.text,
      imported: (element.propertyName ?? element.name).text,
      namespace: false,
    });
  }
  return bindings;
}

function collectImports(ts, sourceFile) {
  const imports = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier)) {
      imports.push({
        kind: "import",
        specifier: statement.moduleSpecifier.text,
        position: statement.getStart(sourceFile),
        bindings: importBindings(ts, statement),
      });
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
      imports.push({
        kind: "re-export",
        specifier: ts.isStringLiteralLike(statement.moduleSpecifier) ? statement.moduleSpecifier.text : null,
        position: statement.getStart(sourceFile),
        bindings: [],
      });
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      imports.push({
        kind: "dynamic-import",
        specifier: argument !== undefined && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
          ? argument.text
          : null,
        position: node.getStart(sourceFile),
        bindings: [],
      });
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sourceFile, visit);
  return imports.sort((left, right) => left.position - right.position || compareText(left.kind, right.kind));
}

function rootIdentifier(ts, expression) {
  let current = expression;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) current = current.expression;
  return ts.isIdentifier(current) ? current.text : null;
}

function propertyName(ts, expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined && ts.isStringLiteralLike(expression.argumentExpression)) {
    return expression.argumentExpression.text;
  }
  return null;
}

function collectSurfaceViolations(ts, sourceFile, locator, imports, coveredBindings) {
  const found = [];
  const bindings = new Map();
  for (const imported of imports) {
    for (const binding of imported.bindings) {
      bindings.set(binding.local, {
        imported: binding.imported,
        namespace: binding.namespace,
        moduleRuleId: moduleRule(imported.specifier ?? ""),
      });
    }
  }

  function add(id, node, surface) {
    found.push(violation(id, locator, `surface:${surface}@${node.getStart(sourceFile)}`));
  }

  function visit(node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === "AstNode") add("AST_REENTRY", node, "AstNode");

    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression)) {
        const binding = bindings.get(expression.text);
        if (binding !== undefined) {
          const importedRule = symbolRule(binding.imported);
          if (importedRule !== null && !coveredBindings.has(expression.text)) add(importedRule, node, binding.imported);
        } else {
          const directRule = symbolRule(expression.text);
          if (directRule !== null) add(directRule, node, expression.text);
        }
      } else if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
        const root = rootIdentifier(ts, expression);
        const property = propertyName(ts, expression);
        const binding = root === null ? undefined : bindings.get(root);
        if (binding !== undefined) {
          const importedRule = property === null ? null : symbolRule(property);
          if (importedRule !== null && !coveredBindings.has(root)) add(importedRule, node, `${root}.${property}`);
        } else if (root !== null && property !== null) {
          const compoundRule = symbolRule(`${root}.${property}`) ?? symbolRule(root);
          if (compoundRule !== null) add(compoundRule, node, `${root}.${property}`);
        }
      }
    } else if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const parentIsCall = ts.isCallExpression(node.parent) && node.parent.expression === node;
      if (!parentIsCall) {
        const root = rootIdentifier(ts, node);
        const property = propertyName(ts, node);
        const binding = root === null ? undefined : bindings.get(root);
        if (binding !== undefined) {
          const importedRule = property === null ? null : symbolRule(property);
          if (importedRule !== null && !coveredBindings.has(root)) add(importedRule, node, `${root}.${property}`);
        } else if (root !== null) {
          const compoundRule = property === null ? symbolRule(root) : (symbolRule(`${root}.${property}`) ?? symbolRule(root));
          if (compoundRule !== null) add(compoundRule, node, property === null ? root : `${root}.${property}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return found;
}

async function runCommand(command, args, cwd) {
  const outcome = await runOwnedProcess({
    command,
    args,
    cwd,
    timeoutMs: COMMAND_TIMEOUT_MS,
    maxOutputBytes: COMMAND_OUTPUT_BYTES,
    windowsHide: true,
  });
  if (outcome.error !== undefined || outcome.status !== 0 || outcome.signal !== null) {
    throw new Error("bounded command refused");
  }
  return outcome.stdout.trim();
}

function parseJsonObject(text) {
  const value = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("wrong JSON shape");
  return value;
}

async function inspectGraph(repoRoot, project, expectedHead) {
  const raw = await runCommand(
    "codebase-memory-mcp",
    ["cli", "index_status", "--project", project],
    repoRoot,
  );
  const status = parseJsonObject(raw);
  const buildPoint = typeof status.indexed_head_sha === "string" ? status.indexed_head_sha : null;
  const exact = status.status === "ready"
    && status.stale === false
    && buildPoint === expectedHead
    && status.git?.head_sha === expectedHead
    && comparablePath(status.root_path) === comparablePath(repoRoot);
  return { buildPoint, exact };
}

async function statRegularFile(repoRoot, locator) {
  const absolute = resolve(repoRoot, ...locator.split("/"));
  if (!contained(repoRoot, absolute)) return null;
  let stat;
  try {
    stat = await lstat(absolute);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > MAXIMUM_SOURCE_BYTES) return null;
  const actual = await realpath(absolute);
  const actualLocator = relativeLocator(repoRoot, actual);
  if (actualLocator !== locator) return null;
  return { absolute };
}

async function readStableFile(repoRoot, locator) {
  const before = await statRegularFile(repoRoot, locator);
  if (before === null) return null;
  const first = await readFile(before.absolute);
  const after = await statRegularFile(repoRoot, locator);
  if (after === null || after.absolute !== before.absolute) return null;
  const second = await readFile(after.absolute);
  return first.equals(second) ? first : null;
}

async function resolveLocalImport(repoRoot, fromLocator, specifier) {
  if (typeof specifier !== "string" || !specifier.startsWith(".")) return { kind: "package" };
  const fromDirectory = posix.dirname(fromLocator);
  const joined = posix.normalize(posix.join(fromDirectory, specifier.replaceAll("\\", "/")));
  const canonicalBase = canonicalLocator(joined);
  if (canonicalBase === null) return { kind: "outside" };

  const extension = extname(canonicalBase).toLowerCase();
  const candidates = SOURCE_EXTENSIONS.includes(extension)
    ? [canonicalBase]
    : [
      ...SOURCE_EXTENSIONS.map((candidateExtension) => `${canonicalBase}${candidateExtension}`),
      ...SOURCE_EXTENSIONS.map((candidateExtension) => `${canonicalBase}/index${candidateExtension}`),
    ];

  for (const candidate of candidates) {
    const file = await statRegularFile(repoRoot, candidate);
    if (file !== null) return { kind: "local", locator: candidate };
  }
  return { kind: "missing", locator: canonicalBase };
}

function validateRequest({ repoRoot, entryFiles, expectedHead, maximumFiles, maximumEdges, graphProject }) {
  if (typeof repoRoot !== "string"
      || !Array.isArray(entryFiles)
      || entryFiles.length === 0
      || entryFiles.length > HARD_MAXIMUM_FILES
      || !HEAD.test(expectedHead)
      || !Number.isSafeInteger(maximumFiles)
      || maximumFiles < 1
      || maximumFiles > HARD_MAXIMUM_FILES
      || !Number.isSafeInteger(maximumEdges)
      || maximumEdges < 1
      || maximumEdges > HARD_MAXIMUM_EDGES
      || !GRAPH_PROJECT.test(graphProject ?? "")) {
    return null;
  }
  const canonicalEntries = entryFiles.map(canonicalLocator);
  if (canonicalEntries.some((entry) => entry === null)) return null;
  return canonicalEntries;
}

async function auditDetachedAuthorityPathInternal({
  repoRoot,
  entryFiles,
  expectedHead,
  maximumFiles,
  maximumEdges,
  graphProject,
}) {
  const baseContext = {
    repositoryHead: null,
    graphBuildPoint: null,
    graphFreshness: "UNKNOWN",
    entryFiles: [],
    inspectedFiles: [],
    inspectedEdges: [],
    violations: [],
  };
  const canonicalEntries = validateRequest({
    repoRoot,
    entryFiles,
    expectedHead,
    maximumFiles,
    maximumEdges,
    graphProject,
  });
  if (canonicalEntries === null) return refused(baseContext, "DETACHED_AUTHORITY_REQUEST_INVALID");

  const root = resolve(repoRoot);
  let rootStat;
  try {
    rootStat = await lstat(root);
  } catch {
    return refused(baseContext, "DETACHED_AUTHORITY_REQUEST_INVALID");
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await realpath(root) !== root) {
    return refused(baseContext, "DETACHED_AUTHORITY_REQUEST_INVALID");
  }

  const context = { ...baseContext, entryFiles: canonicalEntries };
  const caseEntries = new Map();
  for (const entry of canonicalEntries) {
    const key = entry.toLowerCase();
    const prior = caseEntries.get(key);
    if (prior !== undefined && prior !== entry) {
      return refused(context, "DETACHED_AUTHORITY_CASE_COLLISION");
    }
    caseEntries.set(key, entry);
  }
  if (new Set(canonicalEntries).size !== canonicalEntries.length) {
    return refused(context, "DETACHED_AUTHORITY_REQUEST_INVALID");
  }

  let repositoryHead;
  try {
    repositoryHead = await runCommand("git", ["rev-parse", "HEAD"], root);
  } catch {
    return refused(context, "DETACHED_AUTHORITY_REPOSITORY_UNAVAILABLE");
  }
  context.repositoryHead = HEAD.test(repositoryHead) ? repositoryHead : null;
  if (!HEAD.test(repositoryHead)) return refused(context, "DETACHED_AUTHORITY_REPOSITORY_UNAVAILABLE");
  if (repositoryHead !== expectedHead) return refused(context, "DETACHED_AUTHORITY_EXPECTED_HEAD_STALE");

  try {
    const graph = await inspectGraph(root, graphProject, expectedHead);
    context.graphBuildPoint = graph.buildPoint;
    context.graphFreshness = graph.exact ? "FRESH" : "STALE";
    if (!graph.exact) return refused(context, "DETACHED_AUTHORITY_GRAPH_STALE");
  } catch {
    context.graphFreshness = "UNAVAILABLE";
    return refused(context, "DETACHED_AUTHORITY_GRAPH_UNAVAILABLE");
  }

  if (canonicalEntries.length > maximumFiles) {
    return refused(context, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  }

  const ts = loadTypeScript(root);
  const queue = [...canonicalEntries].sort();
  const queuedByCase = new Map(queue.map((locator) => [locator.toLowerCase(), locator]));
  const visited = new Set();
  const inspectedFiles = [];
  const inspectedEdges = [];
  const violations = [];

  while (queue.length > 0) {
    if (visited.size >= maximumFiles) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    const locator = queue.shift();
    if (locator === undefined || visited.has(locator)) continue;
    visited.add(locator);

    const bytes = await readStableFile(root, locator);
    if (bytes === null) {
      violations.push(violation("UNRESOLVED_CLOSURE", locator, "entry:unresolved"));
      continue;
    }
    inspectedFiles.push(Object.freeze({ locator, digest: sha256(bytes) }));

    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      violations.push(violation("UNRESOLVED_CLOSURE", locator, "source:utf8-invalid"));
      continue;
    }
    if (!Buffer.from(source, "utf8").equals(bytes)) {
      violations.push(violation("UNRESOLVED_CLOSURE", locator, "source:utf8-noncanonical"));
      continue;
    }

    const sourceFile = ts.createSourceFile(locator, source, ts.ScriptTarget.ESNext, true, scriptKind(ts, locator));
    if ((sourceFile.parseDiagnostics ?? []).length > 0) {
      violations.push(violation("UNRESOLVED_CLOSURE", locator, "source:parse-diagnostic"));
      continue;
    }

    const imports = collectImports(ts, sourceFile);
    const coveredBindings = new Set();
    for (const imported of imports) {
      if (inspectedEdges.length >= maximumEdges) {
        return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
      }
      const idForEdge = edgeId(imported.kind, imported.specifier, imported.position);
      if (imported.specifier === null) {
        inspectedEdges.push(Object.freeze({ from: locator, to: locator, id: idForEdge }));
        violations.push(violation("UNRESOLVED_CLOSURE", locator, idForEdge));
        continue;
      }

      const forbiddenModule = moduleRule(imported.specifier);
      const resolution = await resolveLocalImport(root, locator, imported.specifier);
      if (resolution.kind === "package") {
        inspectedEdges.push(Object.freeze({ from: locator, to: locator, id: idForEdge }));
        if (forbiddenModule !== null) {
          violations.push(violation(forbiddenModule, locator, idForEdge));
          for (const binding of imported.bindings) coveredBindings.add(binding.local);
        } else if (!RULES.allowedPackageImports.includes(imported.specifier)) {
          violations.push(violation("UNRESOLVED_CLOSURE", locator, idForEdge));
        }
        continue;
      }
      if (resolution.kind === "outside" || resolution.kind === "missing") {
        const target = resolution.kind === "missing" && resolution.locator !== null
          ? resolution.locator
          : locator;
        inspectedEdges.push(Object.freeze({ from: locator, to: target, id: idForEdge }));
        violations.push(violation("UNRESOLVED_CLOSURE", locator, idForEdge));
        continue;
      }

      inspectedEdges.push(Object.freeze({ from: locator, to: resolution.locator, id: idForEdge }));
      if (forbiddenModule !== null) {
        violations.push(violation(forbiddenModule, locator, idForEdge));
        for (const binding of imported.bindings) coveredBindings.add(binding.local);
      }

      const caseKey = resolution.locator.toLowerCase();
      const prior = queuedByCase.get(caseKey);
      if (prior !== undefined && prior !== resolution.locator) {
        return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_CASE_COLLISION");
      }
      queuedByCase.set(caseKey, resolution.locator);
      if (!visited.has(resolution.locator) && !queue.includes(resolution.locator)) {
        if (visited.size + queue.length >= maximumFiles) {
          return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
        }
        queue.push(resolution.locator);
        queue.sort();
      }
    }

    violations.push(...collectSurfaceViolations(ts, sourceFile, locator, imports, coveredBindings));
  }

  const sortedViolations = [...violations].sort((left, right) =>
    compareText(left.file, right.file)
    || compareText(left.edgeId, right.edgeId)
    || compareText(left.id, right.id));
  const unresolved = sortedViolations.filter((finding) => finding.id === "UNRESOLVED_CLOSURE");
  const finalContext = { ...context, inspectedFiles, inspectedEdges, violations: sortedViolations };
  if (unresolved.length > 0) return refused(finalContext, "UNRESOLVED_CLOSURE", sortedViolations);
  if (sortedViolations.length > 0) {
    return resultRecord({
      ...finalContext,
      status: "FAIL",
      failureId: sortedViolations[0].id,
    });
  }
  return resultRecord({ ...finalContext, status: "PASS", failureId: null });
}

export async function auditDetachedAuthorityPath({
  repoRoot,
  entryFiles,
  expectedHead,
  maximumFiles = DEFAULT_MAXIMUM_FILES,
  maximumEdges = DEFAULT_MAXIMUM_EDGES,
} = {}) {
  try {
    return await auditDetachedAuthorityPathInternal({
      repoRoot,
      entryFiles,
      expectedHead,
      maximumFiles,
      maximumEdges,
      graphProject: process.env[GRAPH_PROJECT_ENV],
    });
  } catch {
    return refused({
      repositoryHead: null,
      graphBuildPoint: null,
      graphFreshness: "UNKNOWN",
      entryFiles: [],
      inspectedFiles: [],
      inspectedEdges: [],
      violations: [],
    }, "DETACHED_AUTHORITY_INTERNAL_ERROR");
  }
}

function parseCliArguments(argv) {
  const request = {
    repoRoot: null,
    entryFiles: [],
    expectedHead: null,
    maximumFiles: DEFAULT_MAXIMUM_FILES,
    maximumEdges: DEFAULT_MAXIMUM_EDGES,
    graphProject: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) return null;
    if (flag === "--repo-root") request.repoRoot = value;
    else if (flag === "--entry") request.entryFiles.push(value);
    else if (flag === "--expected-head") request.expectedHead = value;
    else if (flag === "--maximum-files") request.maximumFiles = Number(value);
    else if (flag === "--maximum-edges") request.maximumEdges = Number(value);
    else if (flag === "--graph-project") request.graphProject = value;
    else return null;
    index += 1;
  }
  return request;
}

async function main() {
  const request = parseCliArguments(process.argv.slice(2));
  let result;
  if (request === null) {
    result = refused({
      repositoryHead: null,
      graphBuildPoint: null,
      graphFreshness: "UNKNOWN",
      entryFiles: [],
      inspectedFiles: [],
      inspectedEdges: [],
      violations: [],
    }, "DETACHED_AUTHORITY_REQUEST_INVALID");
  } else {
    try {
      result = await auditDetachedAuthorityPathInternal(request);
    } catch {
      result = refused({
        repositoryHead: null,
        graphBuildPoint: null,
        graphFreshness: "UNKNOWN",
        entryFiles: [],
        inspectedFiles: [],
        inspectedEdges: [],
        violations: [],
      }, "DETACHED_AUTHORITY_INTERNAL_ERROR");
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === "PASS" ? 0 : result.status === "FAIL" ? 1 : 2;
}

const invokedPath = process.argv[1] === undefined ? null : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) await main();
