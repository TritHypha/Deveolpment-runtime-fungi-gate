import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { evaluateSemanticGraph } from "./semantic-graph.mjs";
import { parseStrictJsonBytes, StrictJsonRefusal } from "./strict-json.mjs";

const EXECUTABLE_KEYS = Object.freeze([
  "ts",
  "declarationTs",
  "mts",
  "cts",
  "mjs",
  "js",
  "cjs",
]);
const MANIFEST_KEYS = Object.freeze([
  "detectors",
  "evidence",
  "legacyUnmapped",
  "requirements",
  "schemaVersion",
  "systemContracts",
]);
const TEST_PATTERN = /(?:^|\/)[^/]+\.(?:test|spec)\.(?:mjs|js|ts)$/u;
const PACKAGE_PATH_PATTERN = /^packages-galerina\/([^/]+)$/u;
const FUNGI_PATH_PATTERN = /^packages-galerina\/([^/]+)\/src\/.+\.fungi$/u;
const PACKAGE_JSON_PATTERN = /^packages-galerina\/([^/]+)\/package\.json$/u;
const MAX_INPUT_BYTES = 67_108_864;
const MAX_TOTAL_BYTES = 536_870_912;

class SemanticCoverageRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new SemanticCoverageRefusal(code, detail);
}

function canonicalPath(value, label) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 1024
    || value.startsWith("/")
    || /^[A-Za-z]:/u.test(value)
    || value.includes("\\")
    || value !== value.normalize("NFC")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    refuse("SEMANTIC_INPUT_PATH", `${label} is not a canonical repository-relative path`);
  }
  return value;
}

function ordinaryObject(value, label) {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    refuse("SEMANTIC_INPUT_SHAPE", `${label} must be an ordinary object`);
  }
  return value;
}

function exactObject(value, keys, label) {
  const record = ordinaryObject(value, label);
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    refuse("SEMANTIC_INPUT_SHAPE", `${label} has missing or surplus fields`);
  }
  return record;
}

function ordinaryArray(value, label) {
  if (!Array.isArray(value) || value.length > 100_000) {
    refuse("SEMANTIC_INPUT_SHAPE", `${label} must be a bounded array`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      refuse("SEMANTIC_INPUT_SHAPE", `${label} cannot be sparse`);
    }
  }
  return value;
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hashPaths(paths) {
  const hash = createHash("sha256");
  for (const path of paths) {
    const bytes = Buffer.from(path, "utf8");
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(length);
    hash.update(bytes);
  }
  return hash.digest("hex");
}

function createInputReader(root) {
  const selectedRoot = realpathSync(root);
  const inputs = new Map();
  let totalBytes = 0;

  function read(relativePath, missingCode = "SEMANTIC_INPUT_MISSING") {
    const canonical = canonicalPath(relativePath, "input path");
    const absolutePath = resolve(selectedRoot, ...canonical.split("/"));
    const fromRoot = relative(selectedRoot, absolutePath).split(sep).join("/");
    if (fromRoot !== canonical) {
      refuse("SEMANTIC_INPUT_PATH", `${canonical} does not resolve to its canonical path`);
    }
    let status;
    try {
      status = lstatSync(absolutePath);
    } catch {
      refuse(missingCode, `${canonical} is missing`);
    }
    if (status.isSymbolicLink()) {
      refuse("SEMANTIC_INPUT_SYMLINK", `${canonical} is a symbolic link`);
    }
    if (!status.isFile()) {
      refuse("SEMANTIC_INPUT_NOT_FILE", `${canonical} is not a regular file`);
    }
    if (status.size < 0 || status.size > MAX_INPUT_BYTES) {
      refuse("SEMANTIC_INPUT_BOUNDS", `${canonical} exceeds the per-input byte bound`);
    }
    const bytes = readFileSync(absolutePath);
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      refuse("SEMANTIC_INPUT_BOUNDS", "semantic input corpus exceeds the total byte bound");
    }
    const digest = hashBytes(bytes);
    const prior = inputs.get(canonical);
    if (prior !== undefined && prior.digest !== digest) {
      refuse("SEMANTIC_INPUT_CHANGED", `${canonical} changed during derivation`);
    }
    inputs.set(canonical, { digest, size: bytes.length });
    return bytes;
  }

  function readJson(relativePath, missingCode) {
    const bytes = read(relativePath, missingCode);
    try {
      return parseStrictJsonBytes(bytes, {
        label: relativePath,
        maxBytes: MAX_INPUT_BYTES,
      });
    } catch (error) {
      if (error instanceof StrictJsonRefusal) {
        refuse("SEMANTIC_INPUT_JSON", `${relativePath}: ${error.message}`);
      }
      throw error;
    }
  }

  function verifyReadback() {
    const snapshot = [...inputs];
    totalBytes = 0;
    for (const [path, expected] of snapshot) {
      const bytes = read(path);
      if (bytes.length !== expected.size || hashBytes(bytes) !== expected.digest) {
        refuse("SEMANTIC_INPUT_CHANGED", `${path} changed during readback`);
      }
    }
  }

  function authoritativeInputsDigest() {
    const hash = createHash("sha256");
    for (const [path, value] of [...inputs].sort(([left], [right]) => left.localeCompare(right))) {
      const pathBytes = Buffer.from(path, "utf8");
      const size = Buffer.alloc(8);
      size.writeBigUInt64BE(BigInt(value.size));
      hash.update(size);
      hash.update(pathBytes);
      hash.update(Buffer.from(value.digest, "ascii"));
    }
    return hash.digest("hex");
  }

  return Object.freeze({ read, readJson, verifyReadback, authoritativeInputsDigest });
}

function trackedPaths(root) {
  let output;
  try {
    output = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
  } catch {
    refuse("SEMANTIC_GIT_UNAVAILABLE", "tracked-file enumeration failed");
  }
  const paths = output.split("\0").filter((path) => path.length > 0);
  if (new Set(paths).size !== paths.length) {
    refuse("SEMANTIC_GIT_DUPLICATE", "Git returned duplicate tracked paths");
  }
  return paths.map((path, index) => canonicalPath(path, `tracked[${index}]`)).sort();
}

function validateManifest(value) {
  const manifest = exactObject(value, MANIFEST_KEYS, "semantic manifest");
  if (manifest.schemaVersion !== 1) {
    refuse("SEMANTIC_MANIFEST_VERSION", "semantic manifest schemaVersion must equal 1");
  }
  ordinaryArray(manifest.requirements, "semantic manifest requirements");
  ordinaryArray(manifest.systemContracts, "semantic manifest systemContracts");
  ordinaryArray(manifest.evidence, "semantic manifest evidence");
  ordinaryArray(manifest.detectors, "semantic manifest detectors");
  const legacy = exactObject(
    manifest.legacyUnmapped,
    ["baselineCount", "pathsDigest"],
    "semantic manifest legacyUnmapped",
  );
  if (
    !Number.isSafeInteger(legacy.baselineCount)
    || legacy.baselineCount < 0
    || typeof legacy.pathsDigest !== "string"
    || !/^[0-9a-f]{64}$/u.test(legacy.pathsDigest)
  ) {
    refuse("SEMANTIC_MANIFEST_BASELINE", "semantic manifest legacy baseline is malformed");
  }
  return manifest;
}

function validateWorkspace(value, tracked) {
  const workspace = ordinaryObject(value, "workspace");
  const packages = ordinaryArray(workspace.packages, "workspace packages");
  if (packages.length === 0) {
    refuse("SEMANTIC_PACKAGE_SET", "workspace package set is empty");
  }
  const packagePaths = packages.map((path, index) => {
    const canonical = canonicalPath(path, `workspace packages[${index}]`);
    if (!PACKAGE_PATH_PATTERN.test(canonical)) {
      refuse("SEMANTIC_PACKAGE_SET", `${canonical} is not an immediate registered package`);
    }
    return canonical;
  }).sort();
  if (new Set(packagePaths).size !== packagePaths.length) {
    refuse("SEMANTIC_PACKAGE_SET", "workspace package set contains duplicates");
  }
  const trackedPackages = tracked
    .filter((path) => PACKAGE_JSON_PATTERN.test(path))
    .map((path) => path.slice(0, -"/package.json".length))
    .sort();
  if (JSON.stringify(packagePaths) !== JSON.stringify(trackedPackages)) {
    refuse("SEMANTIC_PACKAGE_SET", "workspace and tracked package sets do not conserve");
  }
  return packagePaths;
}

function executableClass(path) {
  if (path.endsWith(".d.ts")) return "declarationTs";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".mts")) return "mts";
  if (path.endsWith(".cts")) return "cts";
  if (path.endsWith(".mjs")) return "mjs";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".cjs")) return "cjs";
  return "outside-family";
}

function deriveExecutableFamily(tracked, retirement) {
  const family = Object.fromEntries(EXECUTABLE_KEYS.map((key) => [key, []]));
  for (const path of tracked) {
    if (!path.startsWith("packages-galerina/") || path.includes("/node_modules/")) continue;
    const key = executableClass(path);
    if (key !== "outside-family") family[key].push(path);
  }
  const recorded = ordinaryObject(retirement.executableFamily, "retirement executableFamily");
  let total = 0;
  for (const key of EXECUTABLE_KEYS) {
    const paths = ordinaryArray(recorded[key], `retirement executableFamily.${key}`);
    if (JSON.stringify(paths) !== JSON.stringify(family[key])) {
      refuse("SEMANTIC_RETIREMENT_MISMATCH", `retirement executableFamily.${key} is stale`);
    }
    total += family[key].length;
  }
  const totals = ordinaryObject(retirement.totals, "retirement totals");
  if (totals.allTrackedExecutable !== total) {
    refuse("SEMANTIC_RETIREMENT_MISMATCH", "retirement executable-family total is stale");
  }
  return { ...family, total };
}

function conserveExecutableSourceBytes(tracked, reader) {
  for (const path of tracked) {
    if (!path.startsWith("packages-galerina/") || path.includes("/node_modules/")) continue;
    if (executableClass(path) !== "outside-family") reader.read(path);
  }
}

function packageIdentity(packagePath) {
  return `package:${packagePath.slice("packages-galerina/".length)}`;
}

function packageSpecifier(packagePath) {
  const name = packagePath.slice("packages-galerina/".length);
  return `@galerina/${name.replace(/^galerina-/u, "")}`;
}

function derivePackages(packagePaths, reader, projectGraph) {
  const packageBySpecifier = new Map(
    packagePaths.map((path) => [packageSpecifier(path), path]),
  );
  const derivedEdges = new Set();
  for (const packagePath of packagePaths) {
    const packageJsonPath = `${packagePath}/package.json`;
    const packageJson = ordinaryObject(reader.readJson(packageJsonPath), packageJsonPath);
    if (packageJson.name !== packageSpecifier(packagePath)) {
      refuse("SEMANTIC_PACKAGE_IDENTITY", `${packageJsonPath} has the wrong package name`);
    }
    const graphPath = `${packagePath}/.graph/package-graph.json`;
    const graph = ordinaryObject(
      reader.readJson(graphPath, "SEMANTIC_PACKAGE_GRAPH_MISSING"),
      graphPath,
    );
    if (graph.packageName !== packageSpecifier(packagePath)) {
      refuse("SEMANTIC_PACKAGE_IDENTITY", `${graphPath} has the wrong package name`);
    }
    const dependencies = ordinaryArray(graph.externalDeps, `${graphPath} externalDeps`);
    for (const dependency of dependencies) {
      const entry = ordinaryObject(dependency, `${graphPath} external dependency`);
      if (entry.kind !== "workspace") continue;
      if (typeof entry.specifier !== "string" || !packageBySpecifier.has(entry.specifier)) {
        refuse("SEMANTIC_PACKAGE_ENDPOINT", `${graphPath} names an unregistered workspace package`);
      }
      const target = packageBySpecifier.get(entry.specifier);
      derivedEdges.add(`${packageIdentity(packagePath)}->${packageIdentity(target)}`);
    }
  }

  const graph = ordinaryObject(projectGraph, "project graph");
  const projectEdges = new Set();
  for (const value of ordinaryArray(graph.edges, "project graph edges")) {
    const edge = ordinaryObject(value, "project graph edge");
    if (edge.kind !== "depends_on") continue;
    if (typeof edge.from !== "string" || typeof edge.to !== "string") {
      refuse("SEMANTIC_PACKAGE_EDGE_MISMATCH", "project package edge has malformed endpoints");
    }
    projectEdges.add(`${edge.from}->${edge.to}`);
  }
  const left = [...derivedEdges].sort();
  const right = [...projectEdges].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    refuse("SEMANTIC_PACKAGE_EDGE_MISMATCH", "project and package dependency edges do not conserve");
  }

  const counts = new Map(
    packagePaths.map((path) => [packageIdentity(path), { fanIn: 0, fanOut: 0 }]),
  );
  for (const edge of left) {
    const split = edge.indexOf("->");
    const from = edge.slice(0, split);
    const to = edge.slice(split + 2);
    const fromCount = counts.get(from);
    const toCount = counts.get(to);
    if (fromCount === undefined || toCount === undefined) {
      refuse("SEMANTIC_PACKAGE_ENDPOINT", "package edge endpoint is unregistered");
    }
    fromCount.fanOut += 1;
    toCount.fanIn += 1;
  }
  return packagePaths.map((path) => {
    const id = packageIdentity(path);
    const count = counts.get(id);
    return {
      id,
      sourcePath: `${path}/package.json`,
      declaredFanIn: count.fanIn,
      declaredFanOut: count.fanOut,
      derivedFanIn: count.fanIn,
      derivedFanOut: count.fanOut,
    };
  });
}

function collectRouteNodes(ast) {
  const routes = [];
  const visit = (node) => {
    if (node?.kind === "routeDecl") routes.push(node);
    for (const child of node?.children ?? []) visit(child);
  };
  visit(ast);
  return routes;
}

function routeId(sourcePath, line, method, path, flowName) {
  const digest = hashBytes(Buffer.from(
    `${sourcePath}\u0000${line}\u0000${method}\u0000${path}\u0000${flowName}`,
    "utf8",
  )).slice(0, 24);
  return `route:${method.toLowerCase()}:${digest}`;
}

function deriveRoutes(tracked, reader, compiler) {
  const routes = [];
  for (const sourcePath of tracked.filter((path) => FUNGI_PATH_PATTERN.test(path))) {
    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(reader.read(sourcePath));
    } catch (error) {
      if (error instanceof SemanticCoverageRefusal) throw error;
      refuse("SEMANTIC_FUNGI_UTF8", `${sourcePath} is not canonical UTF-8`);
    }
    const parsed = compiler.parseProgram(source, sourcePath, { requireVersionHeader: true });
    if (!parsed || !Array.isArray(parsed.diagnostics) || parsed.diagnostics.length > 0) {
      refuse("SEMANTIC_FUNGI_PARSE", `${sourcePath} did not parse without diagnostics`);
    }
    const astRoutes = collectRouteNodes(parsed.ast);
    const registry = compiler.buildRouteRegistry(parsed.ast);
    if (!registry || !Array.isArray(registry.routes) || registry.routes.length !== astRoutes.length) {
      refuse("SEMANTIC_ROUTE_CONSERVATION", `${sourcePath} AST and route registry counts differ`);
    }
    for (let index = 0; index < astRoutes.length; index += 1) {
      const node = astRoutes[index];
      const route = registry.routes[index];
      if (
        typeof node?.location?.line !== "number"
        || !Number.isSafeInteger(node.location.line)
        || node.location.line < 1
        || typeof route?.method !== "string"
        || typeof route.path !== "string"
        || typeof route.flowName !== "string"
      ) {
        refuse("SEMANTIC_ROUTE_CONSERVATION", `${sourcePath} has malformed route evidence`);
      }
      const raw = typeof node.value === "string" ? node.value : "";
      const separator = raw.indexOf(" ");
      if (
        separator < 1
        || raw.slice(0, separator).toUpperCase() !== route.method
        || raw.slice(separator + 1).trim() !== route.path
      ) {
        refuse("SEMANTIC_ROUTE_CONSERVATION", `${sourcePath} AST and registry route identities differ`);
      }
      routes.push({
        id: routeId(sourcePath, node.location.line, route.method, route.path, route.flowName),
        sourcePath,
        line: node.location.line,
        method: route.method,
        path: route.path,
        flowName: route.flowName,
        parserProvenance: "canonical-fungi-ast",
      });
    }
  }
  return routes;
}

function deriveTests(tracked, reader, manifest, packagePaths) {
  const testPaths = tracked.filter((path) => TEST_PATTERN.test(path));
  for (const path of testPaths) reader.read(path);
  const testSet = new Set(testPaths);
  const explicitPaths = new Set();
  const tests = manifest.evidence.map((value, index) => {
    const entry = ordinaryObject(value, `semantic manifest evidence[${index}]`);
    const sourcePath = canonicalPath(entry.sourcePath, `semantic manifest evidence[${index}].sourcePath`);
    if (!testSet.has(sourcePath)) {
      refuse("SEMANTIC_EVIDENCE_MISSING", `${sourcePath} is not a tracked test file`);
    }
    explicitPaths.add(sourcePath);
    return value;
  });
  const unmapped = [];
  for (const sourcePath of testPaths) {
    if (explicitPaths.has(sourcePath)) continue;
    let systemContractId;
    const packagePath = packagePaths.find((path) => sourcePath.startsWith(`${path}/`));
    if (packagePath !== undefined) {
      systemContractId = packageIdentity(packagePath);
    } else if (sourcePath.startsWith("scripts/tests/") || sourcePath.startsWith("tests/")) {
      systemContractId = "system-contract:repository-governance";
    }
    if (systemContractId === undefined) {
      unmapped.push(sourcePath);
      continue;
    }
    tests.push({
      id: `auto-${hashBytes(Buffer.from(sourcePath, "utf8")).slice(0, 24)}`,
      sourcePath,
      class: "system-contract",
      polarity: "neutral",
      requirementIds: [],
      systemContract: { kind: "present", id: systemContractId },
    });
  }
  return { tests, unmapped };
}

async function canonicalCompiler(root, reader, override) {
  if (override !== undefined) {
    if (
      typeof override.parseProgram !== "function"
      || typeof override.buildRouteRegistry !== "function"
    ) {
      refuse("SEMANTIC_COMPILER_INTERFACE", "supplied compiler interface is incomplete");
    }
    return override;
  }
  const compilerFiles = [
    "packages-galerina/galerina-core-compiler/dist/index.js",
    "packages-galerina/galerina-core-compiler/dist/lexer.js",
    "packages-galerina/galerina-core-compiler/dist/parser.js",
    "packages-galerina/galerina-core-compiler/dist/route-registry.js",
  ];
  for (const path of compilerFiles) reader.read(path);
  const module = await import(pathToFileURL(resolve(root, ...compilerFiles[0].split("/"))).href);
  if (
    typeof module.parseProgram !== "function"
    || typeof module.buildRouteRegistry !== "function"
  ) {
    refuse("SEMANTIC_COMPILER_INTERFACE", "canonical compiler dist interface is incomplete");
  }
  return module;
}

export async function deriveSemanticCoverage(root, options = {}) {
  try {
    const selectedRoot = realpathSync(root);
    const reader = createInputReader(selectedRoot);
    const tracked = trackedPaths(selectedRoot);
    const manifest = validateManifest(reader.readJson(
      "governance/assurance-semantic-coverage.json",
    ));
    const workspace = reader.readJson("galerina.workspace.json");
    const packagePaths = validateWorkspace(workspace, tracked);
    const projectGraph = reader.readJson(
      "build/graph/galerina-devtools-project-graph.json",
    );
    const packages = derivePackages(packagePaths, reader, projectGraph);
    const compiler = await canonicalCompiler(selectedRoot, reader, options.compiler);
    const routes = deriveRoutes(tracked, reader, compiler);
    const retirement = reader.readJson("build/ts-retirement/ts-retirement.json");
    const executableFamily = deriveExecutableFamily(tracked, retirement);
    conserveExecutableSourceBytes(tracked, reader);
    const { tests, unmapped } = deriveTests(tracked, reader, manifest, packagePaths);
    if (unmapped.length > manifest.legacyUnmapped.baselineCount) {
      refuse(
        "SEMANTIC_TEST_UNMAPPED",
        `${unmapped.length} tracked test file(s) exceed the legacy unmapped baseline`,
      );
    }
    const unmappedDigest = hashPaths(unmapped);
    if (
      unmapped.length === manifest.legacyUnmapped.baselineCount
      && unmappedDigest !== manifest.legacyUnmapped.pathsDigest
    ) {
      refuse("SEMANTIC_TEST_BASELINE", "legacy unmapped test identities changed");
    }
    if (typeof options.beforeInputReadback === "function") {
      await options.beforeInputReadback();
    }
    reader.verifyReadback();
    const authoritativeInputsDigest = reader.authoritativeInputsDigest();
    return evaluateSemanticGraph({
      schemaVersion: 2,
      authoritativeInputsDigest,
      requirements: manifest.requirements,
      systemContracts: manifest.systemContracts,
      routes,
      packages,
      tests,
      detectors: manifest.detectors,
      executableFamily,
      legacyUnmapped: {
        baselineCount: manifest.legacyUnmapped.baselineCount,
        currentCount: unmapped.length,
        pathsDigest: unmappedDigest,
      },
    });
  } catch (error) {
    if (error instanceof SemanticCoverageRefusal) {
      return Object.freeze({ kind: "refused", code: error.code, detail: error.message });
    }
    return Object.freeze({
      kind: "refused",
      code: "SEMANTIC_DERIVATION_INVALID",
      detail: error instanceof Error ? error.message : "semantic derivation failed",
    });
  }
}
