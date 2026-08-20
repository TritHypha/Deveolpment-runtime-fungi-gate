#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { userInfo } from "node:os";
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

import {
  authenticateDetachedAuthorityProvider,
  runAuthenticatedProviderCommand,
} from "./lib/detached-authority-provider.mjs";
import { loadTypeScript } from "./lib/ts-to-fungi-sandbox/typescript-api.mjs";

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
const GRAPH_PROVIDER_VERSION = "codebase-memory-mcp 0.9.0+dumpswap";
const GRAPH_PROVIDER_DIGEST = "445dff9d06d613a33a5943c17cc808eca438b1a4922140e9d73400f7ac84bd7f";
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
let graphProjectCache = null;

const RULES = Object.freeze({
  allowedPackageImports: Object.freeze([]),
  auditDeadlineMs: AUDIT_DEADLINE_MS,
  hardMaximumEdges: HARD_MAXIMUM_EDGES,
  hardMaximumFiles: HARD_MAXIMUM_FILES,
  maximumSourceBytes: MAXIMUM_SOURCE_BYTES,
  providerDigest: GRAPH_PROVIDER_DIGEST,
  providerVersion: GRAPH_PROVIDER_VERSION,
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
    auditDeadlineMs: RULES.auditDeadlineMs,
    forbiddenModules: RULES.forbiddenModules
      .map((rule) => ({ id: rule.id, patterns: [...rule.patterns].sort() }))
      .sort((left, right) => compareText(left.id, right.id)),
    forbiddenSymbols: RULES.forbiddenSymbols
      .map((rule) => ({ id: rule.id, symbols: [...rule.symbols].sort() }))
      .sort((left, right) => compareText(left.id, right.id)),
    hardMaximumEdges: RULES.hardMaximumEdges,
    hardMaximumFiles: RULES.hardMaximumFiles,
    maximumSourceBytes: RULES.maximumSourceBytes,
    providerDigest: RULES.providerDigest,
    providerVersion: RULES.providerVersion,
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

function reExportBindings(ts, statement) {
  if (!ts.isExportDeclaration(statement)
      || statement.exportClause === undefined
      || !ts.isNamedExports(statement.exportClause)) return [];
  return statement.exportClause.elements.map((element) => ({
    imported: (element.propertyName ?? element.name).text,
    exported: element.name.text,
  }));
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

const BENIGN_STATE = Object.freeze({ kind: "benign" });
const LOADER_STATE = Object.freeze({ kind: "loader" });
const AMBIGUOUS_LOADER_STATE = Object.freeze({ kind: "ambiguous-loader" });
const NAMESPACE_STATE = Object.freeze({ kind: "namespace" });
const MODULE_STATE = Object.freeze({ kind: "module" });
const AMBIGUOUS_STATE = Object.freeze({ kind: "ambiguous" });

function bindingNames(ts, name, names = []) {
  if (ts.isIdentifier(name)) names.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(ts, element.name, names);
    }
  }
  return names;
}

function createScope(parent = null) {
  return { parent, bindings: new Map() };
}

function sameState(left, right) {
  return left.kind === right.kind
    && left.ruleId === right.ruleId
    && left.surface === right.surface
    && left.value === right.value;
}

function mergeState(left, right) {
  if (sameState(left, right)) return left;
  if (left.kind === "symbol" && right.kind !== "symbol") return left;
  if (right.kind === "symbol" && left.kind !== "symbol") return right;
  if (left.kind === "ambiguous-loader" || right.kind === "ambiguous-loader") return AMBIGUOUS_LOADER_STATE;
  if (left.kind === "loader" || right.kind === "loader") return AMBIGUOUS_LOADER_STATE;
  return AMBIGUOUS_STATE;
}

function cloneScope(scope) {
  if (scope === null) return null;
  const clone = createScope(cloneScope(scope.parent));
  for (const [name, state] of scope.bindings) clone.bindings.set(name, state);
  return clone;
}

function mergeScopes(target, left, right) {
  if (target.parent !== null) mergeScopes(target.parent, left.parent, right.parent);
  const names = new Set([...target.bindings.keys(), ...left.bindings.keys(), ...right.bindings.keys()]);
  for (const name of names) {
    const original = target.bindings.get(name) ?? BENIGN_STATE;
    const leftState = left.bindings.get(name) ?? original;
    const rightState = right.bindings.get(name) ?? original;
    target.bindings.set(name, mergeState(leftState, rightState));
  }
}

function lookupState(scope, name) {
  for (let current = scope; current !== null; current = current.parent) {
    if (current.bindings.has(name)) return current.bindings.get(name);
  }
  return null;
}

function assignState(scope, name, state) {
  for (let current = scope; current !== null; current = current.parent) {
    if (current.bindings.has(name)) {
      current.bindings.set(name, state);
      return;
    }
  }
  scope.bindings.set(name, state);
}

function predeclareScope(ts, scope, statements, parameters = []) {
  for (const parameter of parameters) {
    for (const name of bindingNames(ts, parameter.name)) scope.bindings.set(name, BENIGN_STATE);
  }
  for (const statement of statements) {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name !== undefined) {
      scope.bindings.set(statement.name.text, BENIGN_STATE);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of bindingNames(ts, declaration.name)) scope.bindings.set(name, BENIGN_STATE);
      }
    } else if (ts.isImportDeclaration(statement)) {
      for (const binding of importBindings(ts, statement)) scope.bindings.set(binding.local, BENIGN_STATE);
    } else if (ts.isImportEqualsDeclaration(statement)) {
      scope.bindings.set(statement.name.text, BENIGN_STATE);
    }
  }
}

function assignPatternState(ts, scope, name, state, propertyState = () => BENIGN_STATE) {
  if (ts.isIdentifier(name)) {
    assignState(scope, name.text, state);
    return;
  }
  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      if (!ts.isIdentifier(element.name)) continue;
      const property = element.propertyName === undefined
        ? element.name.text
        : ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)
          ? element.propertyName.text
          : null;
      assignState(scope, element.name.text, propertyState(state, property));
    }
    return;
  }
  for (const identifier of bindingNames(ts, name)) assignState(scope, identifier, BENIGN_STATE);
}

function scanCommonJsDependencies(ts, sourceFile, imports) {
  const root = createScope();
  const escapePositions = new Set();
  predeclareScope(ts, root, sourceFile.statements);
  if (!root.bindings.has("require")) root.bindings.set("require", LOADER_STATE);
  if (!root.bindings.has("module")) root.bindings.set("module", MODULE_STATE);

  function recordLoaderEscape(node) {
    const position = node.getStart(sourceFile);
    if (escapePositions.has(position)) return;
    escapePositions.add(position);
    imports.push({
      kind: "require-escape",
      specifier: null,
      position,
      bindings: [],
    });
  }

  function constantString(node, scope, depth = 0) {
    if (node === undefined || depth > 32) return null;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) {
      const state = lookupState(scope, node.text);
      return state?.kind === "constant" ? state.value : null;
    }
    if (ts.isParenthesizedExpression(node)
        || ts.isAsExpression(node)
        || ts.isTypeAssertionExpression(node)
        || ts.isNonNullExpression(node)) return constantString(node.expression, scope, depth + 1);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = constantString(node.left, scope, depth + 1);
      const right = constantString(node.right, scope, depth + 1);
      return left === null || right === null ? null : `${left}${right}`;
    }
    return null;
  }

  function moduleObjectPropertyState(source, property, node) {
    if (source.kind === "namespace") return NAMESPACE_STATE;
    if (source.kind === "ambiguous-loader") return AMBIGUOUS_LOADER_STATE;
    if (source.kind !== "module") return BENIGN_STATE;
    if (property === null) {
      recordLoaderEscape(node);
      return AMBIGUOUS_LOADER_STATE;
    }
    return property === "require" ? LOADER_STATE : BENIGN_STATE;
  }

  function bindingProperty(element, scope) {
    if (element.propertyName === undefined) {
      return ts.isIdentifier(element.name) ? element.name.text : null;
    }
    if (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)) {
      return element.propertyName.text;
    }
    if (ts.isComputedPropertyName(element.propertyName)) {
      return constantString(element.propertyName.expression, scope);
    }
    return null;
  }

  function assignCommonJsPattern(scope, name, state) {
    if (ts.isIdentifier(name)) {
      assignState(scope, name.text, state);
      return;
    }
    if (ts.isObjectBindingPattern(name)) {
      for (const element of name.elements) {
        const property = element.dotDotDotToken === undefined ? bindingProperty(element, scope) : null;
        const nextState = moduleObjectPropertyState(state, property, element);
        if (ts.isIdentifier(element.name)) assignState(scope, element.name.text, nextState);
        else for (const identifier of bindingNames(ts, element.name)) assignState(scope, identifier, nextState);
      }
      return;
    }
    for (const identifier of bindingNames(ts, name)) assignState(scope, identifier, BENIGN_STATE);
  }

  function mergeBranches(scope, branches) {
    if (branches.length === 0) return;
    let merged = branches[0];
    for (let index = 1; index < branches.length; index += 1) {
      const next = cloneScope(scope);
      mergeScopes(next, merged, branches[index]);
      merged = next;
    }
    mergeScopes(scope, merged, merged);
  }

  function scan(node, scope) {
    if (ts.isSourceFile(node)) {
      for (const statement of node.statements) scan(statement, scope);
      return BENIGN_STATE;
    }
    if (ts.isBlock(node)) {
      const child = createScope(scope);
      predeclareScope(ts, child, node.statements);
      for (const statement of node.statements) scan(statement, child);
      return BENIGN_STATE;
    }
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      if (node.body === undefined) return BENIGN_STATE;
      const child = createScope(scope);
      const statements = ts.isBlock(node.body) ? node.body.statements : [];
      predeclareScope(ts, child, statements, node.parameters);
      if (node.name !== undefined) child.bindings.set(node.name.text, BENIGN_STATE);
      for (const parameter of node.parameters) {
        if (parameter.initializer === undefined) continue;
        const parameterState = scan(parameter.initializer, child);
        assignCommonJsPattern(child, parameter.name, parameterState);
        if (parameterState.kind === "loader" || parameterState.kind === "ambiguous-loader") {
          recordLoaderEscape(parameter.initializer);
        }
      }
      if (ts.isBlock(node.body)) {
        for (const statement of node.body.statements) scan(statement, child);
      } else {
        const bodyState = scan(node.body, child);
        if (bodyState.kind === "loader" || bodyState.kind === "ambiguous-loader") {
          recordLoaderEscape(node.body);
        }
      }
      return BENIGN_STATE;
    }
    if (ts.isMethodDeclaration(node)
        || ts.isGetAccessorDeclaration(node)
        || ts.isSetAccessorDeclaration(node)
        || ts.isConstructorDeclaration(node)) {
      if (node.name !== undefined && ts.isComputedPropertyName(node.name)) {
        const nameState = scan(node.name.expression, scope);
        if (nameState.kind === "loader" || nameState.kind === "ambiguous-loader") {
          recordLoaderEscape(node.name.expression);
        }
      }
      if (node.body === undefined) return BENIGN_STATE;
      const child = createScope(scope);
      predeclareScope(ts, child, node.body.statements, node.parameters);
      for (const parameter of node.parameters) {
        if (parameter.initializer === undefined) continue;
        const parameterState = scan(parameter.initializer, child);
        assignCommonJsPattern(child, parameter.name, parameterState);
        if (parameterState.kind === "loader" || parameterState.kind === "ambiguous-loader") {
          recordLoaderEscape(parameter.initializer);
        }
      }
      for (const statement of node.body.statements) scan(statement, child);
      return BENIGN_STATE;
    }
    if (ts.isPropertyAssignment(node)) {
      if (ts.isComputedPropertyName(node.name)) {
        const nameState = scan(node.name.expression, scope);
        if (nameState.kind === "loader" || nameState.kind === "ambiguous-loader") {
          recordLoaderEscape(node.name.expression);
        }
      }
      const initializerState = scan(node.initializer, scope);
      if (initializerState.kind === "loader" || initializerState.kind === "ambiguous-loader") {
        recordLoaderEscape(node.initializer);
      }
      return BENIGN_STATE;
    }
    if (ts.isPropertyDeclaration(node)) {
      if (ts.isComputedPropertyName(node.name)) {
        const nameState = scan(node.name.expression, scope);
        if (nameState.kind === "loader" || nameState.kind === "ambiguous-loader") {
          recordLoaderEscape(node.name.expression);
        }
      }
      if (node.initializer === undefined) return BENIGN_STATE;
      const initializerState = scan(node.initializer, scope);
      if (initializerState.kind === "loader" || initializerState.kind === "ambiguous-loader") {
        recordLoaderEscape(node.initializer);
      }
      return BENIGN_STATE;
    }
    if (ts.isShorthandPropertyAssignment(node)) {
      const shorthandState = scan(node.name, scope);
      if (shorthandState.kind === "loader" || shorthandState.kind === "ambiguous-loader") {
        recordLoaderEscape(node.name);
      }
      return BENIGN_STATE;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        const elementState = scan(element, scope);
        if (elementState.kind === "loader" || elementState.kind === "ambiguous-loader") {
          recordLoaderEscape(element);
        }
      }
      return BENIGN_STATE;
    }
    if (ts.isReturnStatement(node) || ts.isYieldExpression(node)) {
      if (node.expression === undefined) return BENIGN_STATE;
      const returnedState = scan(node.expression, scope);
      if (returnedState.kind === "loader" || returnedState.kind === "ambiguous-loader") {
        recordLoaderEscape(node.expression);
      }
      return BENIGN_STATE;
    }
    if (ts.isIfStatement(node)) {
      scan(node.expression, scope);
      const left = cloneScope(scope);
      const right = cloneScope(scope);
      scan(node.thenStatement, left);
      if (node.elseStatement !== undefined) scan(node.elseStatement, right);
      mergeScopes(scope, left, right);
      return BENIGN_STATE;
    }
    if (ts.isConditionalExpression(node)) {
      scan(node.condition, scope);
      const leftScope = cloneScope(scope);
      const rightScope = cloneScope(scope);
      const left = scan(node.whenTrue, leftScope);
      const right = scan(node.whenFalse, rightScope);
      mergeScopes(scope, leftScope, rightScope);
      return mergeState(left, right);
    }
    if (ts.isSwitchStatement(node)) {
      scan(node.expression, scope);
      const clauses = node.caseBlock.clauses;
      const branches = [];
      const hasDefault = clauses.some((clause) => ts.isDefaultClause(clause));
      for (let start = 0; start < clauses.length; start += 1) {
        const branch = cloneScope(scope);
        for (let tested = 0; tested <= start; tested += 1) {
          const clause = clauses[tested];
          if (ts.isCaseClause(clause)) scan(clause.expression, branch);
        }
        let stopped = false;
        for (let index = start; index < clauses.length && !stopped; index += 1) {
          for (const statement of clauses[index].statements) {
            if (ts.isBreakStatement(statement)) {
              stopped = true;
              break;
            }
            scan(statement, branch);
          }
        }
        branches.push(branch);
      }
      if (!hasDefault) branches.push(cloneScope(scope));
      mergeBranches(scope, branches);
      return BENIGN_STATE;
    }
    if (ts.isTryStatement(node)) {
      const before = cloneScope(scope);
      const successful = cloneScope(scope);
      scan(node.tryBlock, successful);
      const branches = [successful];
      if (node.catchClause !== undefined) {
        const caught = cloneScope(scope);
        mergeScopes(caught, before, successful);
        const catchScope = createScope(caught);
        if (node.catchClause.variableDeclaration !== undefined) {
          for (const name of bindingNames(ts, node.catchClause.variableDeclaration.name)) {
            catchScope.bindings.set(name, BENIGN_STATE);
          }
        }
        predeclareScope(ts, catchScope, node.catchClause.block.statements);
        for (const statement of node.catchClause.block.statements) scan(statement, catchScope);
        branches.push(caught);
      }
      if (node.finallyBlock !== undefined) {
        for (const branch of branches) scan(node.finallyBlock, branch);
      }
      mergeBranches(scope, branches);
      return BENIGN_STATE;
    }
    if (ts.isVariableDeclaration(node)) {
      const state = node.initializer === undefined ? BENIGN_STATE : scan(node.initializer, scope);
      assignCommonJsPattern(scope, node.name, state);
      return state;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const state = scan(node.right, scope);
      if (ts.isIdentifier(node.left)) assignState(scope, node.left.text, state);
      else {
        scan(node.left, scope);
        if (state.kind === "loader" || state.kind === "ambiguous-loader") {
          recordLoaderEscape(node.right);
        }
      }
      return state;
    }
    if (ts.isStringLiteralLike(node)) return Object.freeze({ kind: "constant", value: node.text });
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const value = constantString(node, scope);
      if (value !== null) return Object.freeze({ kind: "constant", value });
    }
    if (ts.isIdentifier(node)) return lookupState(scope, node.text) ?? BENIGN_STATE;
    if (ts.isParenthesizedExpression(node)
        || ts.isAsExpression(node)
        || ts.isTypeAssertionExpression(node)
        || ts.isNonNullExpression(node)) return scan(node.expression, scope);
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const source = scan(node.expression, scope);
      const property = propertyName(ts, node, (argument) => constantString(argument, scope));
      if (ts.isElementAccessExpression(node) && node.argumentExpression !== undefined) {
        scan(node.argumentExpression, scope);
      }
      if (source.kind === "module") return moduleObjectPropertyState(source, property, node);
      if (source.kind === "loader" || source.kind === "ambiguous-loader") {
        recordLoaderEscape(node);
      }
      return BENIGN_STATE;
    }
    if (ts.isCallExpression(node)) {
      const callee = scan(node.expression, scope);
      for (const argument of node.arguments) {
        const argumentState = scan(argument, scope);
        if (argumentState.kind === "loader" || argumentState.kind === "ambiguous-loader") {
          recordLoaderEscape(argument);
        }
      }
      if (callee.kind === "loader" || callee.kind === "ambiguous-loader") {
        const argument = node.arguments.length === 1 ? node.arguments[0] : undefined;
        imports.push({
          kind: "require",
          specifier: callee.kind === "loader"
            && argument !== undefined
            && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
            ? argument.text
            : null,
          position: node.getStart(sourceFile),
          bindings: requireBindings(ts, node),
        });
        return NAMESPACE_STATE;
      }
      return BENIGN_STATE;
    }
    if (ts.isNewExpression(node)) {
      const constructorState = scan(node.expression, scope);
      if (constructorState.kind === "loader" || constructorState.kind === "ambiguous-loader") {
        recordLoaderEscape(node.expression);
      }
      for (const argument of node.arguments ?? []) {
        const argumentState = scan(argument, scope);
        if (argumentState.kind === "loader" || argumentState.kind === "ambiguous-loader") {
          recordLoaderEscape(argument);
        }
      }
      return BENIGN_STATE;
    }
    let state = BENIGN_STATE;
    ts.forEachChild(node, (child) => {
      const childState = scan(child, scope);
      if (childState.kind === "loader" || childState.kind === "ambiguous-loader") {
        state = childState;
      } else if (childState.kind === "ambiguous") {
        state = AMBIGUOUS_STATE;
      }
    });
    return state;
  }

  scan(sourceFile, root);
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
        reExports: reExportBindings(ts, statement),
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
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(sourceFile, visit);
  scanCommonJsDependencies(ts, sourceFile, imports);
  return imports.sort((left, right) => left.position - right.position || compareText(left.kind, right.kind));
}

function rootIdentifier(ts, expression) {
  let current = expression;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) current = current.expression;
  return ts.isIdentifier(current) ? current.text : null;
}

function propertyName(ts, expression, resolveComputed = () => null) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    return ts.isStringLiteralLike(expression.argumentExpression)
      ? expression.argumentExpression.text
      : resolveComputed(expression.argumentExpression);
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
        && statement.name !== undefined) {
      const rule = symbolRule(statement.name.text);
      if (rule !== null && hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword)) {
        rules.set(hasModifier(ts, statement, ts.SyntaxKind.DefaultKeyword) ? "default" : statement.name.text, rule);
      }
    } else if (ts.isVariableStatement(statement) && hasModifier(ts, statement, ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const rule = symbolRule(declaration.name.text);
        if (rule !== null) rules.set(declaration.name.text, rule);
      }
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

function resolveExportRules(ts, parsedModules, deadline) {
  const rulesByLocator = new Map();
  for (const [locator, parsed] of parsedModules) {
    if (deadlineExpired(deadline)) return null;
    rulesByLocator.set(locator, collectExportRules(ts, parsed.sourceFile));
  }

  const maximumPasses = parsedModules.size + 1;
  for (let pass = 0; pass < maximumPasses; pass += 1) {
    if (deadlineExpired(deadline)) return null;
    let changed = false;
    for (const [locator, parsed] of parsedModules) {
      if (deadlineExpired(deadline)) return null;
      const localRules = rulesByLocator.get(locator);
      for (const imported of parsed.imports) {
        if (deadlineExpired(deadline)) return null;
        if (imported.kind !== "re-export" || imported.targetLocator === undefined) continue;
        const targetRules = rulesByLocator.get(imported.targetLocator);
        if (targetRules === undefined) continue;
        if ((imported.reExports ?? []).length === 0) {
          for (const [name, rule] of targetRules) {
            if (name === "default" || localRules.has(name)) continue;
            localRules.set(name, rule);
            changed = true;
          }
        } else {
          for (const binding of imported.reExports) {
            const rule = targetRules.get(binding.imported);
            if (rule === undefined || localRules.get(binding.exported) === rule) continue;
            localRules.set(binding.exported, rule);
            changed = true;
          }
        }
      }
    }
    if (!changed) return rulesByLocator;
  }
  return null;
}

function collectSurfaceViolations(ts, sourceFile, locator, imports, coveredBindings, exportRulesByLocator) {
  const found = [];
  const SYMBOL_STATE = (ruleId, surface) => Object.freeze({ kind: "symbol", ruleId, surface });
  const CONSTANT_STATE = (value) => Object.freeze({ kind: "constant", value });
  const COVERED_STATE = Object.freeze({ kind: "covered" });
  const loadByPosition = new Map(imports
    .filter((imported) => imported.kind === "require")
    .map((imported) => [imported.position, imported]));

  function add(id, node, surface) {
    found.push(violation(id, locator, `surface:${surface}@${node.getStart(sourceFile)}`));
  }

  function directDeclarationStates(scope, statements) {
    for (const statement of statements) {
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name !== undefined) {
        const rule = symbolRule(statement.name.text);
        if (rule !== null) scope.bindings.set(statement.name.text, SYMBOL_STATE(rule, statement.name.text));
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name)) continue;
          const rule = symbolRule(declaration.name.text);
          if (rule !== null) scope.bindings.set(declaration.name.text, SYMBOL_STATE(rule, declaration.name.text));
        }
      }
    }
  }

  function constantString(node, scope, depth = 0) {
    if (node === undefined || depth > 32) return null;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) {
      const state = lookupState(scope, node.text);
      return state?.kind === "constant" ? state.value : null;
    }
    if (ts.isParenthesizedExpression(node)
        || ts.isAsExpression(node)
        || ts.isTypeAssertionExpression(node)
        || ts.isNonNullExpression(node)) return constantString(node.expression, scope, depth + 1);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = constantString(node.left, scope, depth + 1);
      const right = constantString(node.right, scope, depth + 1);
      return left === null || right === null ? null : `${left}${right}`;
    }
    return null;
  }

  function propertyState(source, property, node) {
    if (source.kind === "covered") return COVERED_STATE;
    if (source.kind === "ambiguous" || source.kind === "ambiguous-loader") return AMBIGUOUS_STATE;
    if (source.kind === "symbol") return source;
    if (source.kind === "module") return property === "require" ? LOADER_STATE : BENIGN_STATE;
    if (source.kind === "namespace") {
      if (property === null) return AMBIGUOUS_STATE;
      const rule = symbolRule(property);
      return rule === null ? BENIGN_STATE : SYMBOL_STATE(rule, property);
    }
    const root = rootIdentifier(ts, node);
    const compound = root === null || property === null ? null : symbolRule(`${root}.${property}`);
    return compound === null ? BENIGN_STATE : SYMBOL_STATE(compound, `${root}.${property}`);
  }

  function bindPattern(scope, name, state) {
    assignPatternState(ts, scope, name, state, (source, property) => propertyState(source, property, name));
  }

  function evaluate(node, scope, asCallee = false) {
    if (ts.isIdentifier(node)) {
      const bound = lookupState(scope, node.text);
      if (bound !== null) return bound;
      const rule = symbolRule(node.text);
      return rule === null ? BENIGN_STATE : SYMBOL_STATE(rule, node.text);
    }
    if (ts.isStringLiteralLike(node)) return CONSTANT_STATE(node.text);
    if (ts.isParenthesizedExpression(node)
        || ts.isAsExpression(node)
        || ts.isTypeAssertionExpression(node)
        || ts.isNonNullExpression(node)) return evaluate(node.expression, scope, asCallee);
    if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      analyzeFunction(node, scope);
      return BENIGN_STATE;
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const state = evaluate(node.right, scope);
        if (ts.isIdentifier(node.left)) assignState(scope, node.left.text, state);
        else evaluate(node.left, scope);
        return state;
      }
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const constant = constantString(node, scope);
        if (constant !== null) return CONSTANT_STATE(constant);
      }
      evaluate(node.left, scope);
      evaluate(node.right, scope);
      return BENIGN_STATE;
    }
    if (ts.isConditionalExpression(node)) {
      evaluate(node.condition, scope);
      const leftScope = cloneScope(scope);
      const rightScope = cloneScope(scope);
      const left = evaluate(node.whenTrue, leftScope);
      const right = evaluate(node.whenFalse, rightScope);
      mergeScopes(scope, leftScope, rightScope);
      return mergeState(left, right);
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const source = evaluate(node.expression, scope);
      const property = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : constantString(node.argumentExpression, scope);
      if (ts.isElementAccessExpression(node) && node.argumentExpression !== undefined) evaluate(node.argumentExpression, scope);
      const state = propertyState(source, property, node);
      if (!asCallee && state.kind === "symbol") add(state.ruleId, node, state.surface);
      else if (!asCallee && state.kind === "ambiguous") add("UNRESOLVED_CLOSURE", node, "computed-authority");
      return state;
    }
    if (ts.isCallExpression(node)) {
      const callee = evaluate(node.expression, scope, true);
      for (const argument of node.arguments) evaluate(argument, scope);
      if (callee.kind === "symbol") add(callee.ruleId, node, callee.surface);
      else if (callee.kind === "ambiguous" || callee.kind === "ambiguous-loader") {
        add("UNRESOLVED_CLOSURE", node, "ambiguous-authority");
      }
      if (callee.kind === "loader") {
        const imported = loadByPosition.get(node.getStart(sourceFile));
        if (imported === undefined) return AMBIGUOUS_STATE;
        return imported.bindings.some((binding) => coveredBindings.has(binding.local))
          || moduleRule(imported.specifier ?? "") !== null
          ? COVERED_STATE
          : NAMESPACE_STATE;
      }
      return BENIGN_STATE;
    }
    let state = BENIGN_STATE;
    ts.forEachChild(node, (child) => {
      const childState = evaluate(child, scope);
      if (childState.kind === "ambiguous") state = AMBIGUOUS_STATE;
    });
    return state;
  }

  function analyzeFunction(node, outerScope) {
    if (node.body === undefined) return;
    const isolatedOuter = cloneScope(outerScope);
    const child = createScope(isolatedOuter);
    const statements = ts.isBlock(node.body) ? node.body.statements : [];
    predeclareScope(ts, child, statements, node.parameters);
    directDeclarationStates(child, statements);
    if (node.name !== undefined) child.bindings.set(node.name.text, BENIGN_STATE);
    if (ts.isBlock(node.body)) processStatements(node.body.statements, child);
    else evaluate(node.body, child);
  }

  function processStatement(statement, scope) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === "AstNode") {
      add("AST_REENTRY", statement, "AstNode");
      return;
    }
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement) || ts.isExportDeclaration(statement)) return;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer === undefined) continue;
        bindPattern(scope, declaration.name, evaluate(declaration.initializer, scope));
      }
      return;
    }
    if (ts.isFunctionDeclaration(statement)) {
      if (statement.body !== undefined) analyzeFunction(statement, scope);
      return;
    }
    if (ts.isBlock(statement)) {
      const child = createScope(scope);
      predeclareScope(ts, child, statement.statements);
      directDeclarationStates(child, statement.statements);
      processStatements(statement.statements, child);
      return;
    }
    if (ts.isIfStatement(statement)) {
      evaluate(statement.expression, scope);
      const left = cloneScope(scope);
      const right = cloneScope(scope);
      processStatement(statement.thenStatement, left);
      if (statement.elseStatement !== undefined) processStatement(statement.elseStatement, right);
      mergeScopes(scope, left, right);
      return;
    }
    if (ts.isSwitchStatement(statement)) {
      evaluate(statement.expression, scope);
      const clauses = statement.caseBlock.clauses;
      const branches = [];
      const hasDefault = clauses.some((clause) => ts.isDefaultClause(clause));
      for (let start = 0; start < clauses.length; start += 1) {
        const branch = cloneScope(scope);
        for (let tested = 0; tested <= start; tested += 1) {
          const clause = clauses[tested];
          if (ts.isCaseClause(clause)) evaluate(clause.expression, branch);
        }
        let stopped = false;
        for (let index = start; index < clauses.length && !stopped; index += 1) {
          for (const clauseStatement of clauses[index].statements) {
            if (ts.isBreakStatement(clauseStatement)) {
              stopped = true;
              break;
            }
            processStatement(clauseStatement, branch);
          }
        }
        branches.push(branch);
      }
      if (!hasDefault) branches.push(cloneScope(scope));
      let merged = branches[0];
      for (let index = 1; index < branches.length; index += 1) {
        const next = cloneScope(scope);
        mergeScopes(next, merged, branches[index]);
        merged = next;
      }
      if (merged !== undefined) mergeScopes(scope, merged, merged);
      return;
    }
    if (ts.isTryStatement(statement)) {
      const before = cloneScope(scope);
      const successful = cloneScope(scope);
      processStatement(statement.tryBlock, successful);
      const branches = [successful];
      if (statement.catchClause !== undefined) {
        const caught = cloneScope(scope);
        mergeScopes(caught, before, successful);
        const catchScope = createScope(caught);
        if (statement.catchClause.variableDeclaration !== undefined) {
          for (const name of bindingNames(ts, statement.catchClause.variableDeclaration.name)) {
            catchScope.bindings.set(name, BENIGN_STATE);
          }
        }
        predeclareScope(ts, catchScope, statement.catchClause.block.statements);
        directDeclarationStates(catchScope, statement.catchClause.block.statements);
        processStatements(statement.catchClause.block.statements, catchScope);
        branches.push(caught);
      }
      if (statement.finallyBlock !== undefined) {
        for (const branch of branches) processStatement(statement.finallyBlock, branch);
      }
      let merged = branches[0];
      for (let index = 1; index < branches.length; index += 1) {
        const next = cloneScope(scope);
        mergeScopes(next, merged, branches[index]);
        merged = next;
      }
      mergeScopes(scope, merged, merged);
      return;
    }
    if (ts.isWhileStatement(statement) || ts.isDoStatement(statement) || ts.isForStatement(statement) || ts.isForInStatement(statement) || ts.isForOfStatement(statement)) {
      const zeroIterations = cloneScope(scope);
      const oneIteration = cloneScope(scope);
      ts.forEachChild(statement, (child) => {
        if (ts.isStatement(child)) processStatement(child, oneIteration);
        else evaluate(child, oneIteration);
      });
      mergeScopes(scope, zeroIterations, oneIteration);
      return;
    }
    ts.forEachChild(statement, (child) => {
      if (ts.isStatement(child)) processStatement(child, scope);
      else evaluate(child, scope);
    });
  }

  function processStatements(statements, scope) {
    for (const statement of statements) processStatement(statement, scope);
  }

  const root = createScope();
  predeclareScope(ts, root, sourceFile.statements);
  directDeclarationStates(root, sourceFile.statements);
  if (!root.bindings.has("require")) root.bindings.set("require", LOADER_STATE);
  if (!root.bindings.has("module")) root.bindings.set("module", MODULE_STATE);
  for (const imported of imports) {
    if (imported.kind === "require" || imported.kind === "re-export") continue;
    for (const binding of imported.bindings) {
      if (coveredBindings.has(binding.local)) {
        root.bindings.set(binding.local, COVERED_STATE);
        continue;
      }
      if (binding.namespace) {
        root.bindings.set(binding.local, NAMESPACE_STATE);
        continue;
      }
      const exportedRule = imported.targetLocator === undefined
        ? null
        : exportRulesByLocator.get(imported.targetLocator)?.get(binding.imported) ?? null;
      const rule = exportedRule ?? symbolRule(binding.imported);
      root.bindings.set(binding.local, rule === null ? BENIGN_STATE : SYMBOL_STATE(rule, binding.imported));
    }
  }
  processStatements(sourceFile.statements, root);
  return found;
}

function deadlineRemaining(deadline) {
  return Math.max(0, deadline - Date.now());
}

function deadlineExpired(deadline) {
  return deadlineRemaining(deadline) === 0;
}

async function runProviderCommand(provider, args, cwd, deadline) {
  const remaining = deadlineRemaining(deadline);
  if (remaining === 0) throw new Error("audit deadline expired");
  const outcome = await runAuthenticatedProviderCommand({
    executable: provider.executable,
    expectedDigest: provider.digest,
    args,
    cwd,
    env: provider.environment,
    deadline,
    timeoutMs: COMMAND_TIMEOUT_MS,
    maxOutputBytes: COMMAND_OUTPUT_BYTES,
  });
  if (outcome === null
      || outcome.error !== undefined
      || outcome.spawnError !== null
      || outcome.status !== 0
      || outcome.signal !== null) {
    throw new Error("bounded command refused");
  }
  return outcome.stdout.trim();
}

function parseJsonObject(text) {
  const value = JSON.parse(text);
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("wrong JSON shape");
  return value;
}

async function readStableMetadataFile(path, maximumBytes = MAXIMUM_GIT_METADATA_BYTES, deadline) {
  if (deadlineExpired(deadline)) return null;
  let before;
  try {
    before = await lstat(path);
  } catch {
    return null;
  }
  if (deadlineExpired(deadline)
      || !before.isFile()
      || before.isSymbolicLink()
      || before.size < 1
      || before.size > maximumBytes) return null;
  const canonical = resolve(path);
  if (await realpath(path) !== canonical) return null;
  if (deadlineExpired(deadline)) return null;
  const first = await readFile(path);
  if (deadlineExpired(deadline)) return null;
  let after;
  try {
    after = await lstat(path);
  } catch {
    return null;
  }
  if (!after.isFile() || after.isSymbolicLink() || after.size !== before.size) return null;
  const second = await readFile(path);
  return !deadlineExpired(deadline) && first.equals(second) ? first : null;
}

async function resolveGitHead(repoRoot, deadline) {
  if (deadlineExpired(deadline)) return null;
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
    const pointer = await readStableMetadataFile(dotGit, 4096, deadline);
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

  const commonPointer = await readStableMetadataFile(resolve(gitDirectory, "commondir"), 4096, deadline);
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

  const headBytes = await readStableMetadataFile(resolve(gitDirectory, "HEAD"), 4096, deadline);
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
  const loose = await readStableMetadataFile(loosePath, 4096, deadline);
  const looseHead = loose?.toString("utf8").trim() ?? "";
  if (HEAD.test(looseHead)) return looseHead;

  const packed = await readStableMetadataFile(resolve(commonDirectory, "packed-refs"), MAXIMUM_GIT_METADATA_BYTES, deadline);
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
  let nativeHome;
  try {
    nativeHome = userInfo().homedir;
  } catch {
    return null;
  }
  if (typeof nativeHome !== "string" || nativeHome.length === 0 || !isAbsolute(nativeHome)) return null;
  const executable = resolve(
    nativeHome,
    ".local",
    "bin",
    process.platform === "win32" ? "codebase-memory-mcp.exe" : "codebase-memory-mcp",
  );
  const environment = { HOME: nativeHome };
  if (process.platform === "win32") {
    const systemRoot = resolve(win32.parse(nativeHome).root, "Windows");
    const systemDirectory = resolve(systemRoot, "System32");
    const gitDirectory = resolve(win32.parse(nativeHome).root, "Program Files", "Git", "cmd");
    const gitExecutable = resolve(gitDirectory, "git.exe");
    let pathStats;
    try {
      pathStats = await Promise.all([
        lstat(systemRoot),
        lstat(systemDirectory),
        lstat(gitDirectory),
        lstat(gitExecutable),
      ]);
    } catch {
      return null;
    }
    if (pathStats.slice(0, 3).some((stat) => !stat.isDirectory() || stat.isSymbolicLink())
        || !pathStats[3].isFile()
        || pathStats[3].isSymbolicLink()
        || !samePath(await realpath(systemRoot), systemRoot)
        || !samePath(await realpath(systemDirectory), systemDirectory)
        || !samePath(await realpath(gitDirectory), gitDirectory)
        || !samePath(await realpath(gitExecutable), gitExecutable)) return null;
    environment.USERPROFILE = nativeHome;
    environment.SystemRoot = systemRoot;
    environment.PATH = `${gitDirectory}${win32.delimiter}${systemDirectory}`;
  }
  const authenticated = await authenticateDetachedAuthorityProvider({
    executable,
    expectedDigest: GRAPH_PROVIDER_DIGEST,
    expectedVersion: GRAPH_PROVIDER_VERSION,
    cwd: repoRoot,
    env: environment,
    deadline,
  });
  return authenticated === null
    ? null
    : Object.freeze({
      executable: authenticated.executable,
      digest: authenticated.digest,
      environment: Object.freeze(environment),
    });
}

async function discoverGraphProject(repoRoot, provider, deadline) {
  const cacheKey = `${comparablePath(repoRoot)}\0${provider.executable}`;
  if (graphProjectCache?.key === cacheKey) return graphProjectCache.project;
  const raw = await runProviderCommand(
    provider,
    ["cli", "list_projects"],
    repoRoot,
    deadline,
  );
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
  const raw = await runProviderCommand(
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

async function statRegularFile(repoRoot, locator, deadline) {
  if (deadlineExpired(deadline)) return null;
  const absolute = resolve(repoRoot, ...locator.split("/"));
  if (!contained(repoRoot, absolute)) return null;
  let stat;
  try {
    stat = await lstat(absolute);
  } catch {
    return null;
  }
  if (deadlineExpired(deadline)
      || !stat.isFile()
      || stat.isSymbolicLink()
      || stat.size < 1
      || stat.size > MAXIMUM_SOURCE_BYTES) return null;
  const actual = await realpath(absolute);
  if (deadlineExpired(deadline)) return null;
  const actualLocator = relativeLocator(repoRoot, actual);
  if (actualLocator !== locator) return null;
  return { absolute };
}

async function readStableFile(repoRoot, locator, deadline) {
  const before = await statRegularFile(repoRoot, locator, deadline);
  if (before === null) return null;
  const first = await readFile(before.absolute);
  if (deadlineExpired(deadline)) return null;
  const after = await statRegularFile(repoRoot, locator, deadline);
  if (after === null || after.absolute !== before.absolute) return null;
  const second = await readFile(after.absolute);
  return !deadlineExpired(deadline) && first.equals(second) ? first : null;
}

async function resolveLocalImport(repoRoot, fromLocator, specifier, deadline) {
  if (deadlineExpired(deadline)) return { kind: "deadline" };
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
    const file = await statRegularFile(repoRoot, candidate, deadline);
    if (deadlineExpired(deadline)) return { kind: "deadline" };
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
  if (deadlineExpired(deadline)) return refused(baseContext, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  let rootStat;
  try {
    rootStat = await lstat(root);
  } catch {
    return refused(baseContext, "DETACHED_AUTHORITY_REQUEST_INVALID");
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await realpath(root) !== root) {
    return refused(baseContext, "DETACHED_AUTHORITY_REQUEST_INVALID");
  }
  if (deadlineExpired(deadline)) return refused(baseContext, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");

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
    repositoryHead = await resolveGitHead(root, deadline);
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
    if (deadlineExpired(deadline)) return refused(context, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    context.graphFreshness = "UNAVAILABLE";
    return refused(context, "DETACHED_AUTHORITY_GRAPH_UNAVAILABLE");
  }

  if (canonicalEntries.length > maximumFiles) {
    return refused(context, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  }

  if (deadlineExpired(deadline)) return refused(context, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  const ts = loadTypeScript(root);
  if (deadlineExpired(deadline)) return refused(context, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
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

    const bytes = await readStableFile(root, locator, deadline);
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
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

    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    const sourceFile = ts.createSourceFile(locator, source, ts.ScriptTarget.ESNext, true, scriptKind(ts, locator));
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    if ((sourceFile.parseDiagnostics ?? []).length > 0) {
      violations.push(violation("UNRESOLVED_CLOSURE", locator, "source:parse-diagnostic"));
      continue;
    }

    const imports = collectImports(ts, sourceFile);
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
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
      const resolution = await resolveLocalImport(root, locator, imported.specifier, deadline);
      if (resolution.kind === "deadline") {
        return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
      }
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

  if (deadlineExpired(deadline)) {
    return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  }
  const exportRulesByLocator = resolveExportRules(ts, parsedModules, deadline);
  if (exportRulesByLocator === null) {
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
    violations.push(violation("UNRESOLVED_CLOSURE", canonicalEntries[0], "exports:fixpoint-truncated"));
    return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "UNRESOLVED_CLOSURE");
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
    if (deadlineExpired(deadline)) {
      return refused({ ...context, inspectedFiles, inspectedEdges, violations }, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
    }
  }

  let finalRepositoryHead;
  try {
    finalRepositoryHead = await resolveGitHead(root, deadline);
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
