#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
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
const MAXIMUM_GIT_METADATA_BYTES = 8 * 1024 * 1024;
const AUDIT_DEADLINE_MS = 60_000;
const COMMAND_TIMEOUT_MS = 50_000;
const COMMAND_OUTPUT_BYTES = 512 * 1024;
const SOURCE_EXTENSIONS = Object.freeze([".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
const HEAD = /^[0-9a-f]{40}$/u;
const GRAPH_PROJECT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const GRAPH_PROVIDER_VERSION = /^codebase-memory-mcp [0-9]+\.[0-9]+\.[0-9]+\+dumpswap$/u;
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
let graphProjectCache = null;

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
  const normalized = resolve(value).replaceAll("\\", "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function samePath(left, right) {
  return typeof left === "string"
    && left.length > 0
    && typeof right === "string"
    && right.length > 0
    && comparablePath(left) === comparablePath(right);
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

function requireBindings(ts, call) {
  const declaration = ts.isVariableDeclaration(call.parent) && call.parent.initializer === call
    ? call.parent
    : null;
  if (declaration === null) return [];
  if (ts.isIdentifier(declaration.name)) {
    return [{ local: declaration.name.text, imported: "*", namespace: true }];
  }
  if (!ts.isObjectBindingPattern(declaration.name)) return [];
  const bindings = [];
  for (const element of declaration.name.elements) {
    if (!ts.isIdentifier(element.name)) continue;
    const imported = element.propertyName === undefined
      ? element.name.text
      : ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)
        ? element.propertyName.text
        : null;
    if (imported !== null) bindings.push({ local: element.name.text, imported, namespace: false });
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
    } else if (ts.isImportEqualsDeclaration(statement)
        && ts.isExternalModuleReference(statement.moduleReference)) {
      const expression = statement.moduleReference.expression;
      imports.push({
        kind: "import-equals-require",
        specifier: expression !== undefined && ts.isStringLiteralLike(expression) ? expression.text : null,
        position: statement.getStart(sourceFile),
        bindings: [{ local: statement.name.text, imported: "*", namespace: true }],
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
    } else if (ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === "require") {
      const argument = node.arguments.length === 1 ? node.arguments[0] : undefined;
      imports.push({
        kind: "require",
        specifier: argument !== undefined && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
          ? argument.text
          : null,
        position: node.getStart(sourceFile),
        bindings: requireBindings(ts, node),
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

function hasModifier(ts, node, kind) {
  return (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
}

function collectExportRules(ts, sourceFile) {
  const rules = new Map();
  for (const statement of sourceFile.statements) {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
        && statement.name !== undefined
        && hasModifier(ts, statement, ts.SyntaxKind.DefaultKeyword)) {
      const rule = symbolRule(statement.name.text);
      if (rule !== null) rules.set("default", rule);
    } else if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      const rule = symbolRule(statement.expression.text);
      if (rule !== null) rules.set("default", rule);
    } else if (ts.isExportDeclaration(statement)
        && statement.moduleSpecifier === undefined
        && statement.exportClause !== undefined
        && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const local = (element.propertyName ?? element.name).text;
        const rule = symbolRule(local);
        if (rule !== null) rules.set(element.name.text, rule);
      }
    }
  }
  return rules;
}

function collectSurfaceViolations(ts, sourceFile, locator, imports, coveredBindings, exportRulesByLocator) {
  const found = [];
  const bindings = new Map();
  for (const imported of imports) {
    for (const binding of imported.bindings) {
      const exportedRule = binding.imported === "default" && imported.targetLocator !== undefined
        ? exportRulesByLocator.get(imported.targetLocator)?.get("default") ?? null
        : null;
      bindings.set(binding.local, {
        imported: binding.imported,
        namespace: binding.namespace,
        moduleRuleId: moduleRule(imported.specifier ?? ""),
        ruleId: exportedRule ?? symbolRule(binding.imported),
      });
    }
  }

  function deriveAliases(node) {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      if (ts.isIdentifier(node.name) && ts.isIdentifier(node.initializer)) {
        const source = bindings.get(node.initializer.text);
        if (source !== undefined) bindings.set(node.name.text, { ...source });
      } else if (ts.isObjectBindingPattern(node.name) && ts.isIdentifier(node.initializer)) {
        const source = bindings.get(node.initializer.text);
        if (source?.namespace === true) {
          for (const element of node.name.elements) {
            if (!ts.isIdentifier(element.name)) continue;
            const imported = element.propertyName === undefined
              ? element.name.text
              : ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)
                ? element.propertyName.text
                : null;
            if (imported === null) continue;
            bindings.set(element.name.text, {
              imported,
              namespace: false,
              moduleRuleId: source.moduleRuleId,
              ruleId: symbolRule(imported),
            });
          }
        }
      }
    }
    ts.forEachChild(node, deriveAliases);
  }
  ts.forEachChild(sourceFile, deriveAliases);

  function add(id, node, surface) {
    found.push(violation(id, locator, `surface:${surface}@${node.getStart(sourceFile)}`));
  }

  function inlineRequireProperty(expression) {
    if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) return null;
    const base = expression.expression;
    if (!ts.isCallExpression(base) || !ts.isIdentifier(base.expression) || base.expression.text !== "require") return null;
    const property = propertyName(ts, expression);
    if (property === null) return null;
    const ruleId = symbolRule(property);
    return ruleId === null ? null : { property, ruleId };
  }

  function visit(node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === "AstNode") add("AST_REENTRY", node, "AstNode");

    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression)) {
        const binding = bindings.get(expression.text);
        if (binding !== undefined) {
          const importedRule = binding.ruleId;
          if (importedRule !== null && !coveredBindings.has(expression.text)) add(importedRule, node, binding.imported);
        } else {
          const directRule = symbolRule(expression.text);
          if (directRule !== null) add(directRule, node, expression.text);
        }
      } else if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
        const required = inlineRequireProperty(expression);
        if (required !== null) add(required.ruleId, node, `require.${required.property}`);
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
        const required = inlineRequireProperty(node);
        if (required !== null) add(required.ruleId, node, `require.${required.property}`);
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

function deadlineRemaining(deadline) {
  return Math.max(0, deadline - Date.now());
}

function deadlineExpired(deadline) {
  return deadlineRemaining(deadline) === 0;
}

async function runCommand(command, args, cwd, deadline) {
  const remaining = deadlineRemaining(deadline);
  if (remaining === 0) throw new Error("audit deadline expired");
  const outcome = await runOwnedProcess({
    command,
    args,
    cwd,
    timeoutMs: Math.max(1, Math.min(COMMAND_TIMEOUT_MS, remaining)),
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

async function readStableMetadataFile(path, maximumBytes = MAXIMUM_GIT_METADATA_BYTES) {
  let before;
  try {
    before = await lstat(path);
  } catch {
    return null;
  }
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > maximumBytes) return null;
  const canonical = resolve(path);
  if (await realpath(path) !== canonical) return null;
  const first = await readFile(path);
  let after;
  try {
    after = await lstat(path);
  } catch {
    return null;
  }
  if (!after.isFile() || after.isSymbolicLink() || after.size !== before.size) return null;
  const second = await readFile(path);
  return first.equals(second) ? first : null;
}

async function resolveGitHead(repoRoot) {
  const dotGit = resolve(repoRoot, ".git");
  let dotGitStat;
  try {
    dotGitStat = await lstat(dotGit);
  } catch {
    return null;
  }

  let gitDirectory;
  if (dotGitStat.isDirectory() && !dotGitStat.isSymbolicLink()) {
    gitDirectory = dotGit;
  } else if (dotGitStat.isFile() && !dotGitStat.isSymbolicLink()) {
    const pointer = await readStableMetadataFile(dotGit, 4096);
    const text = pointer?.toString("utf8").trim() ?? "";
    if (!text.startsWith("gitdir: ")) return null;
    gitDirectory = resolve(repoRoot, text.slice("gitdir: ".length));
  } else {
    return null;
  }

  let gitDirectoryStat;
  try {
    gitDirectoryStat = await lstat(gitDirectory);
  } catch {
    return null;
  }
  if (!gitDirectoryStat.isDirectory() || gitDirectoryStat.isSymbolicLink() || await realpath(gitDirectory) !== gitDirectory) return null;

  const commonPointer = await readStableMetadataFile(resolve(gitDirectory, "commondir"), 4096);
  const commonDirectory = commonPointer === null
    ? gitDirectory
    : resolve(gitDirectory, commonPointer.toString("utf8").trim());
  let commonStat;
  try {
    commonStat = await lstat(commonDirectory);
  } catch {
    return null;
  }
  if (!commonStat.isDirectory() || commonStat.isSymbolicLink() || await realpath(commonDirectory) !== commonDirectory) return null;

  const headBytes = await readStableMetadataFile(resolve(gitDirectory, "HEAD"), 4096);
  const head = headBytes?.toString("utf8").trim() ?? "";
  if (HEAD.test(head)) return head;
  if (!head.startsWith("ref: ")) return null;
  const reference = head.slice("ref: ".length);
  if (!reference.startsWith("refs/")
      || posix.normalize(reference) !== reference
      || reference.includes("..")
      || reference.includes("//")) return null;

  const loosePath = resolve(commonDirectory, ...reference.split("/"));
  if (!contained(commonDirectory, loosePath)) return null;
  const loose = await readStableMetadataFile(loosePath, 4096);
  const looseHead = loose?.toString("utf8").trim() ?? "";
  if (HEAD.test(looseHead)) return looseHead;

  const packed = await readStableMetadataFile(resolve(commonDirectory, "packed-refs"));
  if (packed === null) return null;
  for (const line of packed.toString("utf8").split(/\r?\n/u)) {
    if (line.startsWith("#") || line.startsWith("^")) continue;
    const separator = line.indexOf(" ");
    if (separator < 0) continue;
    const candidate = line.slice(0, separator);
    if (line.slice(separator + 1) === reference && HEAD.test(candidate)) return candidate;
  }
  return null;
}

async function resolveGraphProvider(repoRoot, deadline) {
  const executable = resolve(
    homedir(),
    ".local",
    "bin",
    process.platform === "win32" ? "codebase-memory-mcp.exe" : "codebase-memory-mcp",
  );
  let stat;
  try {
    stat = await lstat(executable);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.isSymbolicLink() || await realpath(executable) !== executable) return null;
  const version = await runCommand(executable, ["--version"], repoRoot, deadline);
  return GRAPH_PROVIDER_VERSION.test(version) ? executable : null;
}

async function discoverGraphProject(repoRoot, provider, deadline) {
  const cacheKey = `${comparablePath(repoRoot)}\0${provider}`;
  if (graphProjectCache?.key === cacheKey) return graphProjectCache.project;
  const raw = await runCommand(provider, ["cli", "list_projects"], repoRoot, deadline);
  const listed = parseJsonObject(raw);
  if (!Array.isArray(listed.projects)) throw new Error("graph project list malformed");
  const matches = listed.projects.filter((project) => project !== null
    && typeof project === "object"
    && GRAPH_PROJECT.test(project.name ?? "")
    && samePath(project.root_path, repoRoot));
  if (matches.length !== 1) throw new Error("graph project root is ambiguous");
  graphProjectCache = Object.freeze({ key: cacheKey, project: matches[0].name });
  return matches[0].name;
}

async function inspectGraph(repoRoot, expectedHead, deadline) {
  const provider = await resolveGraphProvider(repoRoot, deadline);
  if (provider === null) throw new Error("graph provider unavailable");
  const project = await discoverGraphProject(repoRoot, provider, deadline);
  const raw = await runCommand(
    provider,
    ["cli", "index_status", "--project", project],
    repoRoot,
    deadline,
  );
  const status = parseJsonObject(raw);
  const buildPoint = typeof status.indexed_head_sha === "string" ? status.indexed_head_sha : null;
  const exact = status.status === "ready"
    && status.stale === false
    && buildPoint === expectedHead
    && status.git?.head_sha === expectedHead
    && samePath(status.git?.worktree_root, repoRoot)
    && samePath(status.root_path, repoRoot);
  return { buildPoint, exact, project };
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

function validateRequest({ repoRoot, entryFiles, expectedHead, maximumFiles, maximumEdges }) {
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
      || maximumEdges > HARD_MAXIMUM_EDGES) {
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
}) {
  const deadline = Date.now() + AUDIT_DEADLINE_MS;
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
    repositoryHead = await resolveGitHead(root);
  } catch {
    return refused(context, "DETACHED_AUTHORITY_REPOSITORY_UNAVAILABLE");
  }
  context.repositoryHead = typeof repositoryHead === "string" && HEAD.test(repositoryHead) ? repositoryHead : null;
  if (typeof repositoryHead !== "string" || !HEAD.test(repositoryHead)) {
    return refused(context, "DETACHED_AUTHORITY_REPOSITORY_UNAVAILABLE");
  }
  if (repositoryHead !== expectedHead) return refused(context, "DETACHED_AUTHORITY_EXPECTED_HEAD_STALE");

  try {
    const graph = await inspectGraph(root, expectedHead, deadline);
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
  let queueIndex = 0;
  const pending = new Set(queue);
  const queuedByCase = new Map(queue.map((locator) => [locator.toLowerCase(), locator]));
  const visited = new Set();
  const inspectedFiles = [];
  const inspectedEdges = [];
  const violations = [];
  const parsedModules = new Map();

  function enqueue(locator) {
    if (visited.has(locator) || pending.has(locator)) return true;
    if (visited.size + pending.size >= maximumFiles) return false;
    let low = queueIndex;
    let high = queue.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (compareText(queue[middle], locator) < 0) low = middle + 1;
      else high = middle;
    }
    queue.splice(low, 0, locator);
    pending.add(locator);
    return true;
  }

  while (queueIndex < queue.length) {
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    if (visited.size >= maximumFiles) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    const locator = queue[queueIndex];
    queueIndex += 1;
    if (locator === undefined || visited.has(locator)) continue;
    pending.delete(locator);
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
      imported.targetLocator = resolution.locator;
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
      if (!enqueue(resolution.locator)) {
        return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
      }
    }

    parsedModules.set(locator, { sourceFile, imports, coveredBindings });
  }

  const exportRulesByLocator = new Map();
  for (const [locator, parsed] of parsedModules) {
    exportRulesByLocator.set(locator, collectExportRules(ts, parsed.sourceFile));
  }
  for (const [locator, parsed] of parsedModules) {
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    violations.push(...collectSurfaceViolations(
      ts,
      parsed.sourceFile,
      locator,
      parsed.imports,
      parsed.coveredBindings,
      exportRulesByLocator,
    ));
  }

  let finalRepositoryHead;
  try {
    finalRepositoryHead = await resolveGitHead(root);
  } catch {
    return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_REPOSITORY_UNAVAILABLE");
  }
  if (typeof finalRepositoryHead !== "string" || !HEAD.test(finalRepositoryHead)) {
    return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_REPOSITORY_UNAVAILABLE");
  }
  if (finalRepositoryHead !== expectedHead) {
    return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_EXPECTED_HEAD_STALE");
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
