import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SCALAR_ORACLE_SOURCE_RELATIVE = "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi";
export const SCALAR_ORACLE_ARTIFACT_RELATIVE = "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json";

const GENERATOR_RELATIVE = "scripts/generate-rd0858-scalar-oracle-artifact.mjs";
const COMPILER_PACKAGE_RELATIVE = "packages-ts/galerina-core-compiler";
const GRAPH_PACKAGE_RELATIVE = "packages-ts/galerina-devtools-graph-algorithms";
const SUBSTRATE_PACKAGE_RELATIVE = "packages-ts/galerina-substrate-math";
const PACKAGE_LOCK_RELATIVE = "package-lock.json";
const SOURCE_MAX_BYTES = 65_536;
const CHILD_MAX_BYTES = 1_048_576;
const CHILD_TIMEOUT_MS = 130_000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, ...SCALAR_ORACLE_SOURCE_RELATIVE.split("/"));
const artifactPath = join(root, ...SCALAR_ORACLE_ARTIFACT_RELATIVE.split("/"));
const generatorPath = join(root, ...GENERATOR_RELATIVE.split("/"));
const packageJsonPath = join(root, COMPILER_PACKAGE_RELATIVE, "package.json");
const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const SCALAR_COMPILER_SOURCE_LOCATORS = Object.freeze([
  "bounded-cache.ts",
  "capability-types.ts",
  "checked-flow-artifact.ts",
  "core-syntax-safety.ts",
  "effect-checker.ts",
  "flow-name.ts",
  "governance-verifier.ts",
  "hardening-residency.ts",
  "i64-arith.ts",
  "invariant-discharge.ts",
  "lexer.ts",
  "naming-policy-checker.ts",
  "numeric-lowering.ts",
  "observability-inference.ts",
  "package-type-registry.ts",
  "parser.ts",
  "proof-graph.ts",
  "rd0858-scalar-compiler-entry.ts",
  "requirement-diagnostics.ts",
  "requirement-terminality.ts",
  "requirement-validator-authority.ts",
  "resilience-inference.ts",
  "runtime/canonicalHash.ts",
  "runtime/limitPolicy.ts",
  "source-escape-checker.ts",
  "stdlib-registry.ts",
  "substrate-inference.ts",
  "substrate-math.ts",
  "symbol-resolver.ts",
  "taint-checker.ts",
  "type-checker.ts",
  "type-registry.ts",
  "u64-arith.ts",
  "unit-registry.generated.ts",
  "value-state-checker.ts",
  "globals.d.ts",
  "node-crypto-shim.d.ts",
]);

const SCALAR_ENTRY_LOCATOR = "core/rd0858-scalar-compiler-entry.js";
const OWNERSHIP_MARKER = ".rd0858-scalar-owned.json";

const CHECKER_PATHS = Object.freeze([
  "packages-ts/galerina-core-compiler/src/parser.ts",
  "packages-ts/galerina-core-compiler/src/symbol-resolver.ts",
  "packages-ts/galerina-core-compiler/src/type-checker.ts",
  "packages-ts/galerina-core-compiler/src/value-state-checker.ts",
  "packages-ts/galerina-core-compiler/src/effect-checker.ts",
  "packages-ts/galerina-core-compiler/src/governance-verifier.ts",
  "packages-ts/galerina-core-compiler/src/source-escape-checker.ts",
  "packages-ts/galerina-core-compiler/src/naming-policy-checker.ts",
  "packages-ts/galerina-core-compiler/src/taint-checker.ts",
  "packages-ts/galerina-core-compiler/src/checked-flow-artifact.ts",
]);

const SCALAR_ORACLE_SOURCE_TEXT = `@version 1
pure flow scalarOracle(subject: Verdict) -> String
contract { effects {} }
{
  check(subject) {
    deny: { return "deny" }
    ambig: { return "ambig" }
    if: { return "allow" }
  }
}
`;

class ScalarArtifactRefusal extends Error {
  constructor(code, detail = "") {
    super(`RD0858_SCALAR_ARTIFACT_${code}: refused${detail === "" ? "" : ` (${detail})`}`);
    this.name = "ScalarArtifactRefusal";
    this.code = code;
  }
}

function refuse(code, detail = "") {
  throw new ScalarArtifactRefusal(code, detail);
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function stableRead(path, maxBytes, code) {
  let before;
  let bytes;
  let after;
  try {
    before = lstatSync(path, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.size < 1n || before.size > BigInt(maxBytes)) {
      refuse(`${code}_FILE`);
    }
    bytes = readFileSync(path);
    after = lstatSync(path, { bigint: true });
  } catch (error) {
    if (error instanceof ScalarArtifactRefusal) throw error;
    refuse(`${code}_READ`);
  }
  for (const field of ["dev", "ino", "size", "mtimeNs"]) {
    if (before[field] !== after[field]) refuse(`${code}_DRIFT`);
  }
  if (BigInt(bytes.byteLength) !== before.size) refuse(`${code}_LENGTH`);
  return bytes;
}

function git(args, encoding = "utf8") {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding,
    maxBuffer: CHILD_MAX_BYTES * 16,
    timeout: CHILD_TIMEOUT_MS,
  });
  if (result.status !== 0 || result.error !== undefined) {
    refuse("GIT", `${args.join(" ")}: ${String(result.stderr ?? result.error ?? "unknown")}`);
  }
  return result.stdout;
}

export function requireHeadMatchesWorktree(paths) {
  const result = spawnSync("git", ["-C", root, "diff", "--quiet", "HEAD", "--", ...paths], {
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
  });
  if (result.status === 1) refuse("INPUT_NOT_HEAD");
  if (result.status !== 0 || result.error !== undefined) refuse("TOOLCHAIN_DIFF");
}

function headEntries(pathspec) {
  const output = git(["ls-tree", "-r", "-z", "HEAD", "--", pathspec], "buffer");
  const fields = output.toString("utf8").split("\0").filter(Boolean);
  const entries = fields.map((field) => {
    const match = /^(\d+) blob ([0-9a-f]+)\t(.+)$/u.exec(field);
    if (match === null) refuse("HEAD_RECORD");
    return Object.freeze({ mode: match[1], blob: match[2], path: match[3] });
  });
  entries.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return Object.freeze(entries);
}

function compilerExecutableLocatorsFromHead() {
  const sourcePrefix = `${COMPILER_PACKAGE_RELATIVE}/src/`;
  const locators = headEntries(`${COMPILER_PACKAGE_RELATIVE}/src`)
    .filter((entry) => entry.path.endsWith(".ts") && !entry.path.endsWith(".d.ts"))
    .map((entry) => `${entry.path.slice(sourcePrefix.length, -3)}.js`);
  locators.push("hallmark-non-authorities.json");
  locators.sort();
  if (locators.length < 2 || new Set(locators).size !== locators.length) {
    refuse("COMPILER_BUILD_MANIFEST");
  }
  return Object.freeze(locators);
}

function readHeadBlob(relativePath) {
  const bytes = git(["show", `HEAD:${relativePath}`], "buffer");
  if (!(bytes instanceof Buffer)) refuse("HEAD_BLOB");
  return bytes;
}

function closedChildEnv(extra = {}) {
  const admitted = {};
  for (const name of ["SystemRoot", "WINDIR", "ComSpec", "PATHEXT", "TEMP", "TMP"]) {
    if (typeof process.env[name] === "string") admitted[name] = process.env[name];
  }
  return Object.freeze({ ...admitted, ...extra, NODE_OPTIONS: "", NODE_PATH: "" });
}

function assertContainedRegularRoot(directory, code) {
  let stat;
  let canonical;
  try {
    stat = lstatSync(directory, { bigint: true });
    canonical = realpathSync.native(directory);
  } catch {
    refuse(`${code}_ROOT`);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) refuse(`${code}_REPARSE`);
  return canonical;
}

function writeExclusive(path, bytes) {
  let descriptor;
  try {
    mkdirSync(dirname(path), { recursive: true });
    descriptor = openSync(path, "wx", 0o600);
    writeFileSync(descriptor, bytes);
    closeSync(descriptor);
    descriptor = undefined;
  } catch {
    if (descriptor !== undefined) closeSync(descriptor);
    refuse("TEMP_WRITE");
  }
}

function materializeHeadFiles(destination, packageRelative, locators) {
  let total = 0;
  for (const locator of locators) {
    if (typeof locator !== "string" || locator.length < 1 || locator.length > 1_024
      || locator.includes("\\") || locator.includes("\0")
      || locator.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
      refuse("HEAD_LOCATOR");
    }
    const bytes = readHeadBlob(`${packageRelative}/src/${locator}`);
    total += bytes.byteLength;
    if (bytes.byteLength < 1 || bytes.byteLength > CHILD_MAX_BYTES * 4 || total > CHILD_MAX_BYTES * 32) {
      refuse("HEAD_SOURCE_BOUND");
    }
    writeExclusive(join(destination, "src", ...locator.split("/")), bytes);
  }
}

function allHeadTypeScriptLocators(packageRelative) {
  const prefix = `${packageRelative}/src/`;
  const locators = headEntries(`${packageRelative}/src`)
    .filter((entry) => entry.mode === "100644" && entry.path.endsWith(".ts"))
    .map((entry) => entry.path.slice(prefix.length));
  if (locators.length < 1 || new Set(locators).size !== locators.length) refuse("HEAD_SOURCE_MANIFEST");
  return Object.freeze(locators);
}

function runTypeScriptBuild(configPath) {
  const tscPath = join(
    root,
    COMPILER_PACKAGE_RELATIVE,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  const result = spawnSync(process.execPath, [tscPath, "-p", configPath], {
    cwd: dirname(configPath),
    encoding: "utf8",
    env: closedChildEnv(),
    maxBuffer: CHILD_MAX_BYTES * 16,
    timeout: CHILD_TIMEOUT_MS,
  });
  if (result.status !== 0 || result.error !== undefined) refuse("COMPILER_BUILD");
}

function runtimeExecutableLocators(runtimeRoot) {
  const locators = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name);
      const stat = lstatSync(path, { bigint: true });
      if (stat.isSymbolicLink()) refuse("COMPILER_BUILD_SYMLINK");
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile() && [".js", ".mjs", ".json"].includes(extname(name))) {
        locators.push(relative(runtimeRoot, path).replaceAll("\\", "/"));
      }
    }
  };
  visit(runtimeRoot);
  locators.sort();
  if (locators.length < 3 || new Set(locators).size !== locators.length) {
    refuse("COMPILER_BUILD_MANIFEST");
  }
  return Object.freeze(locators);
}

export function cleanupOwnedTemporary(directory, token) {
  if (typeof token !== "string" || !/^[0-9a-f]{32}$/u.test(token)) refuse("TEMP_TOKEN");
  const expectedParent = realpathSync.native(tmpdir());
  const canonical = assertContainedRegularRoot(directory, "TEMP_CLEANUP");
  const parentPrefix = expectedParent.endsWith(sep) ? expectedParent : `${expectedParent}${sep}`;
  if (!canonical.startsWith(parentPrefix) || !basename(canonical).startsWith("rd0858-scalar-build-")) {
    refuse("TEMP_CLEANUP_SCOPE");
  }
  let marker;
  try {
    marker = JSON.parse(textDecoder.decode(stableRead(join(directory, OWNERSHIP_MARKER), 256, "TEMP_MARKER")));
  } catch (error) {
    if (error instanceof ScalarArtifactRefusal) throw error;
    refuse("TEMP_MARKER");
  }
  if (marker?.schema !== "rd0858.scalar-temp-owner.v1" || marker.token !== token) {
    refuse("TEMP_OWNERSHIP");
  }
  rmSync(directory, { recursive: true, force: false });
}

const STRICT_LOADER_SOURCE = `
import { appendFileSync, readFileSync } from "node:fs";
const config = JSON.parse(readFileSync(process.env.RD0858_LOADER_CONFIG, "utf8"));
const files = new Set(config.files);
const builtins = new Set(config.builtins);
function deny(code) { throw new Error("RD0858_SCALAR_ARTIFACT_COMPILER_MODULE_" + code + ": refused"); }
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("node:")) {
    if (!builtins.has(specifier)) deny("UNEXPECTED");
    return nextResolve(specifier, context);
  }
  const result = await nextResolve(specifier, context);
  if (!files.has(result.url)) deny("RESOLUTION");
  return result;
}
export async function load(url, context, nextLoad) {
  if (url.startsWith("file:")) {
    if (!files.has(url)) deny("UNEXPECTED");
    appendFileSync(config.trace, url + "\\n", "utf8");
  }
  return nextLoad(url, context);
}
`;

const SCALAR_RUNNER_SOURCE = `
import { readFileSync } from "node:fs";
const request = JSON.parse(readFileSync(0, "utf8"));
const compiler = await import(process.env.RD0858_SCALAR_ENTRY_URL);
let result;
if (request.mode === "candidate") {
  const built = compiler.buildRd0858ScalarArtifact(request.source, request.identity);
  result = { artifact: built.artifact, bytes: Buffer.from(built.bytes).toString("base64") };
} else if (request.mode === "verify") {
  result = compiler.verifyRd0858ScalarArtifact(
    request.source,
    Buffer.from(request.bytes, "base64"),
    request.identity,
  );
} else {
  throw new Error("RD0858_SCALAR_ARTIFACT_COMPILER_MODULE_REQUEST: refused");
}
process.stdout.write(JSON.stringify(result) + "\\n");
`;

export function digestCompilerPackageIdentityEntries(entries, compilerExecutableGraphDigest) {
  if (!Array.isArray(entries) || !/^sha256:[0-9a-f]{64}$/u.test(compilerExecutableGraphDigest)) {
    refuse("PACKAGE_GRAPH_INPUT");
  }
  const generatedGraphReports = new Set([
    `${COMPILER_PACKAGE_RELATIVE}/.graph/BOUNDARY.md`,
    `${COMPILER_PACKAGE_RELATIVE}/.graph/package-graph.json`,
  ]);
  const admitted = entries.filter((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)
      || !/^100\d{3}$/u.test(entry.mode) || !/^[0-9a-f]{40,64}$/u.test(entry.blob)
      || typeof entry.path !== "string"
      || !entry.path.startsWith(`${COMPILER_PACKAGE_RELATIVE}/`)
      || entry.path.includes("\\") || entry.path.includes("\0")) {
      refuse("PACKAGE_GRAPH_ENTRY");
    }
    return !generatedGraphReports.has(entry.path);
  });
  if (admitted.length < 1) refuse("PACKAGE_GRAPH_HEAD");
  const hash = createHash("sha256");
  hash.update("galerina.compiler-package-identity.v4\0", "utf8");
  for (const entry of admitted) {
    hash.update(`${entry.mode} ${entry.blob}\t${entry.path}\n`, "utf8");
  }
  hash.update(`${compilerExecutableGraphDigest}\n`, "utf8");
  return `sha256:${hash.digest("hex")}`;
}

function computePackageGraphDigest(compilerExecutableGraphDigest) {
  return digestCompilerPackageIdentityEntries(
    headEntries(COMPILER_PACKAGE_RELATIVE),
    compilerExecutableGraphDigest,
  );
}

function computeCheckerSetDigest() {
  const hash = createHash("sha256");
  hash.update("galerina.strict-checks.v1\0", "utf8");
  for (const relativePath of CHECKER_PATHS) {
    const bytes = readHeadBlob(relativePath);
    hash.update(`${relativePath}\0${bytes.byteLength}\0`, "utf8");
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

function compilerVersion() {
  const parsed = JSON.parse(textDecoder.decode(readHeadBlob(`${COMPILER_PACKAGE_RELATIVE}/package.json`)));
  if (parsed?.name !== "@galerina/core-compiler" || typeof parsed.version !== "string") {
    refuse("PACKAGE_IDENTITY");
  }
  return parsed.version;
}

export function inspectScalarOracleSource(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > SOURCE_MAX_BYTES) {
    refuse("SOURCE_BOUND");
  }
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) refuse("SOURCE_BOM");
  for (const byte of bytes) if (byte === 0x0d) refuse("SOURCE_CR");
  let source;
  try {
    source = textDecoder.decode(bytes);
  } catch {
    refuse("SOURCE_UTF8");
  }
  if (source.normalize("NFC") !== source) refuse("SOURCE_NFC");
  if (source !== SCALAR_ORACLE_SOURCE_TEXT) refuse("SOURCE_CANONICAL");
  return Object.freeze({ source, sourceDigest: sha256(bytes) });
}


function assertExactScalarAst(ast) {
  const children = ast.children ?? [];
  const block = children.find((node) => node.kind === "block");
  const check = block?.children?.[0];
  if (check?.kind !== "checkExpr" || check.children?.length !== 4
    || check.children[0]?.kind !== "identifier" || check.children[0]?.value !== "subject") {
    refuse("CHECKED_AST_SHAPE");
  }
  const expected = [["deny", '"deny"'], ["ambig", '"ambig"'], ["if", '"allow"']];
  for (let index = 0; index < expected.length; index += 1) {
    const arm = check.children[index + 1];
    const literal = arm?.children?.[0]?.children?.[0]?.children?.[0];
    if (arm?.kind !== "checkArm" || arm.value !== expected[index][0]
      || literal?.kind !== "stringLiteral" || literal.value !== expected[index][1]) {
      refuse("CHECKED_AST_TERMINAL");
    }
  }
}

function currentIdentity(sourceDigest, compilerExecutableGraphDigest) {
  return Object.freeze({
    sourceDigest,
    compilerPackageGraphDigest: computePackageGraphDigest(compilerExecutableGraphDigest),
    checkerSetDigest: computeCheckerSetDigest(),
    generatorSourceDigest: sha256(readHeadBlob(GENERATOR_RELATIVE)),
    compilerExecutableGraphDigest,
  });
}

export function digestCompilerExecutableClosure(directory, admittedLocators) {
  const files = [];
  let rootStat;
  let canonicalRoot;
  try {
    rootStat = lstatSync(directory, { bigint: true });
    canonicalRoot = realpathSync.native(directory);
  } catch {
    refuse("COMPILER_BUILD_ROOT");
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    refuse("COMPILER_BUILD_REPARSE");
  }
  const rootPrefix = canonicalRoot.endsWith(sep) ? canonicalRoot : `${canonicalRoot}${sep}`;
  if (admittedLocators === undefined) {
    const visit = (current) => {
      for (const name of readdirSync(current).sort()) {
        const path = join(current, name);
        const stat = lstatSync(path, { bigint: true });
        if (stat.isSymbolicLink()) refuse("COMPILER_BUILD_SYMLINK");
        if (stat.isDirectory()) {
          visit(path);
        } else if (
          stat.isFile() &&
          name !== "build-evidence.json" &&
          [".js", ".json", ".wasm", ".fungi"].includes(extname(name))
        ) {
          files.push(path);
        }
      }
    };
    visit(directory);
  } else {
    if (!Array.isArray(admittedLocators) || admittedLocators.length < 1
      || admittedLocators.length > 4_096 || new Set(admittedLocators).size !== admittedLocators.length) {
      refuse("COMPILER_BUILD_MANIFEST");
    }
    const orderedLocators = [...admittedLocators].sort((left, right) => {
      const leftSegments = left.split("/");
      const rightSegments = right.split("/");
      const length = Math.min(leftSegments.length, rightSegments.length);
      for (let index = 0; index < length; index += 1) {
        if (leftSegments[index] < rightSegments[index]) return -1;
        if (leftSegments[index] > rightSegments[index]) return 1;
      }
      return leftSegments.length - rightSegments.length;
    });
    for (const locator of orderedLocators) {
      if (typeof locator !== "string" || locator.length < 1 || locator.length > 1_024
        || locator.startsWith("/") || /^[A-Za-z]:/u.test(locator)
        || locator.includes("\\") || locator.includes("\0")
        || locator.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
        || ![".js", ".mjs", ".json", ".wasm", ".fungi"].includes(extname(locator))
        || locator === "build-evidence.json") {
        refuse("COMPILER_BUILD_MANIFEST");
      }
      let path = directory;
      const segments = locator.split("/");
      for (let index = 0; index < segments.length; index += 1) {
        path = join(path, segments[index]);
        let stat;
        let canonicalPath;
        try {
          const siblings = readdirSync(dirname(path));
          const exactMatches = siblings.filter((name) => name === segments[index]);
          const foldedMatches = siblings.filter((name) => name.toUpperCase() === segments[index].toUpperCase());
          if (foldedMatches.length === 0) refuse("COMPILER_BUILD_MISSING");
          if (exactMatches.length !== 1 || foldedMatches.length !== 1) {
            refuse("COMPILER_BUILD_CASE");
          }
          stat = lstatSync(path, { bigint: true });
          canonicalPath = realpathSync.native(path);
        } catch (error) {
          if (error instanceof ScalarArtifactRefusal) throw error;
          refuse("COMPILER_BUILD_MISSING");
        }
        if (stat.isSymbolicLink()) refuse("COMPILER_BUILD_SYMLINK");
        if (canonicalPath !== canonicalRoot && !canonicalPath.startsWith(rootPrefix)) {
          refuse("COMPILER_BUILD_CONTAINMENT");
        }
        if (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
          refuse("COMPILER_BUILD_MANIFEST");
        }
      }
      files.push(path);
    }
  }
  if (files.length < 1) refuse("COMPILER_BUILD_EMPTY");
  const hash = createHash("sha256");
  hash.update("galerina.compiler-executable-graph.v2\0", "utf8");
  for (const path of files) {
    const locator = relative(directory, path).replaceAll("\\", "/");
    const bytes = stableRead(path, CHILD_MAX_BYTES * 16, "COMPILER_BUILD");
    hash.update(`${locator}\0${bytes.byteLength}\0`, "utf8");
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function buildFreshHeadCompiler() {
  const governedPaths = [
    SCALAR_ORACLE_SOURCE_RELATIVE,
    SCALAR_ORACLE_ARTIFACT_RELATIVE,
    GENERATOR_RELATIVE,
    COMPILER_PACKAGE_RELATIVE,
    GRAPH_PACKAGE_RELATIVE,
    SUBSTRATE_PACKAGE_RELATIVE,
    PACKAGE_LOCK_RELATIVE,
  ];
  requireHeadMatchesWorktree(governedPaths);
  const headBefore = String(git(["rev-parse", "HEAD"])).trim();
  const token = randomBytes(16).toString("hex");
  const temporaryRoot = mkdtempSync(join(tmpdir(), "rd0858-scalar-build-"));
  const stageRoot = join(temporaryRoot, "stage");
  const runtimeRoot = join(temporaryRoot, "runtime");
  const compilerStage = join(stageRoot, "compiler");
  const graphStage = join(stageRoot, "graph");
  const substrateStage = join(stageRoot, "substrate");
  try {
    assertContainedRegularRoot(temporaryRoot, "TEMP");
    writeExclusive(join(temporaryRoot, OWNERSHIP_MARKER), Buffer.from(JSON.stringify({
      schema: "rd0858.scalar-temp-owner.v1",
      token,
    }), "utf8"));
    materializeHeadFiles(compilerStage, COMPILER_PACKAGE_RELATIVE, SCALAR_COMPILER_SOURCE_LOCATORS);
    materializeHeadFiles(graphStage, GRAPH_PACKAGE_RELATIVE, allHeadTypeScriptLocators(GRAPH_PACKAGE_RELATIVE));
    materializeHeadFiles(substrateStage, SUBSTRATE_PACKAGE_RELATIVE, allHeadTypeScriptLocators(SUBSTRATE_PACKAGE_RELATIVE));

    writeExclusive(join(graphStage, "package.json"), Buffer.from('{"type":"module"}\n', "utf8"));
    writeExclusive(join(substrateStage, "package.json"), Buffer.from('{"type":"module"}\n', "utf8"));
    writeExclusive(join(compilerStage, "package.json"), Buffer.from('{"type":"module"}\n', "utf8"));
    writeExclusive(join(compilerStage, "src", "rd0858-external-shim.d.ts"), Buffer.from(
      'declare module "@noble/post-quantum/ml-dsa.js" { export const ml_dsa65: any; }\n',
      "utf8",
    ));

    const graphOut = join(runtimeRoot, "node_modules", "@galerina", "devtools-graph-algorithms");
    const substrateOut = join(runtimeRoot, "node_modules", "@galerina", "substrate-math");
    const compilerOut = join(runtimeRoot, "core");
    const commonOptions = {
      target: "ES2022",
      strict: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: false,
      sourceMap: false,
    };
    const graphConfig = join(graphStage, "tsconfig.json");
    writeExclusive(graphConfig, Buffer.from(JSON.stringify({
      compilerOptions: {
        ...commonOptions,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        rootDir: join(graphStage, "src"),
        outDir: graphOut,
      },
      include: [join(graphStage, "src", "**", "*.ts")],
    }), "utf8"));
    runTypeScriptBuild(graphConfig);
    const graphTypeOnlyOutput = join(graphOut, "core", "types.js");
    if (textDecoder.decode(stableRead(graphTypeOnlyOutput, 64, "COMPILER_BUILD")) !== "export {};\n") {
      refuse("COMPILER_BUILD_TYPE_ONLY");
    }
    unlinkSync(graphTypeOnlyOutput);
    writeExclusive(join(graphOut, "package.json"), Buffer.from(JSON.stringify({
      name: "@galerina/devtools-graph-algorithms",
      type: "module",
      main: "index.js",
      types: "index.d.ts",
    }), "utf8"));

    const substrateConfig = join(substrateStage, "tsconfig.json");
    writeExclusive(substrateConfig, Buffer.from(JSON.stringify({
      compilerOptions: {
        ...commonOptions,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        rootDir: join(substrateStage, "src"),
        outDir: substrateOut,
      },
      include: [join(substrateStage, "src", "**", "*.ts")],
    }), "utf8"));
    runTypeScriptBuild(substrateConfig);
    writeExclusive(join(substrateOut, "package.json"), Buffer.from(JSON.stringify({
      name: "@galerina/substrate-math",
      type: "module",
      main: "index.js",
      types: "index.d.ts",
      exports: "./index.js",
    }), "utf8"));

    const compilerConfig = join(compilerStage, "tsconfig.json");
    writeExclusive(compilerConfig, Buffer.from(JSON.stringify({
      compilerOptions: {
        ...commonOptions,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        rootDir: join(compilerStage, "src"),
        outDir: compilerOut,
        baseUrl: compilerStage,
        paths: {
          "@galerina/devtools-graph-algorithms": [join(graphOut, "index.d.ts")],
          "@galerina/substrate-math": [join(substrateOut, "index.d.ts")],
        },
      },
      include: [join(compilerStage, "src", "**", "*.ts")],
    }), "utf8"));
    runTypeScriptBuild(compilerConfig);

    writeExclusive(join(runtimeRoot, "strict-loader.mjs"), Buffer.from(STRICT_LOADER_SOURCE, "utf8"));
    writeExclusive(join(runtimeRoot, "scalar-runner.mjs"), Buffer.from(SCALAR_RUNNER_SOURCE, "utf8"));
    const executableLocators = runtimeExecutableLocators(runtimeRoot);
    const compilerExecutableGraphDigest = digestCompilerExecutableClosure(runtimeRoot, executableLocators);
    const executableUrls = executableLocators
      .filter((locator) => locator.endsWith(".js") || locator.endsWith(".mjs"))
      .filter((locator) => locator !== "strict-loader.mjs")
      .map((locator) => pathToFileURL(join(runtimeRoot, ...locator.split("/"))).href)
      .sort();
    const entryUrl = pathToFileURL(join(runtimeRoot, ...SCALAR_ENTRY_LOCATOR.split("/"))).href;
    if (!executableUrls.includes(entryUrl)) refuse("COMPILER_MODULE_ENTRY");
    requireHeadMatchesWorktree(governedPaths);
    if (String(git(["rev-parse", "HEAD"])).trim() !== headBefore) refuse("HEAD_DRIFT");

    const execute = (request) => {
      const invocation = randomBytes(16).toString("hex");
      const tracePath = join(temporaryRoot, `trace-${invocation}.txt`);
      const configPath = join(temporaryRoot, `loader-${invocation}.json`);
      writeExclusive(tracePath, Buffer.from("", "utf8"));
      writeExclusive(configPath, Buffer.from(JSON.stringify({
        files: executableUrls,
        builtins: ["node:crypto", "node:fs"],
        trace: tracePath,
      }), "utf8"));
      const result = spawnSync(
        process.execPath,
        ["--experimental-loader", pathToFileURL(join(runtimeRoot, "strict-loader.mjs")).href,
          join(runtimeRoot, "scalar-runner.mjs")],
        {
          cwd: temporaryRoot,
          encoding: "utf8",
          input: JSON.stringify(request),
          env: closedChildEnv({
            RD0858_LOADER_CONFIG: configPath,
            RD0858_SCALAR_ENTRY_URL: entryUrl,
          }),
          maxBuffer: CHILD_MAX_BYTES,
          timeout: CHILD_TIMEOUT_MS,
        },
      );
      let trace = [];
      try {
        trace = readFileSync(tracePath, "utf8").split("\n").filter(Boolean).sort();
      } finally {
        unlinkSync(tracePath);
        unlinkSync(configPath);
      }
      if (result.status !== 0 || result.error !== undefined) refuse("COMPILER_MODULE_CHILD");
      if (trace.length !== executableUrls.length
        || trace.some((url, index) => url !== executableUrls[index])) {
        refuse("COMPILER_MODULE_TRACE");
      }
      let parsed;
      try {
        parsed = JSON.parse(result.stdout);
      } catch {
        refuse("COMPILER_MODULE_FRAME");
      }
      return parsed;
    };
    return Object.freeze({
      compilerExecutableGraphDigest,
      execute,
      dispose: () => cleanupOwnedTemporary(temporaryRoot, token),
    });
  } catch (error) {
    try {
      cleanupOwnedTemporary(temporaryRoot, token);
    } catch {
      // Preserve unowned or structurally changed residue for owner adjudication.
    }
    throw error;
  }
}

export async function buildScalarOracleArtifactCandidate() {
  const sourceBytes = stableRead(sourcePath, SOURCE_MAX_BYTES, "SOURCE");
  const inspected = inspectScalarOracleSource(sourceBytes);
  const isolated = await buildFreshHeadCompiler();
  try {
    const identity = currentIdentity(inspected.sourceDigest, isolated.compilerExecutableGraphDigest);
    const result = isolated.execute({
      mode: "candidate",
      source: inspected.source,
      identity: { ...identity, compilerVersion: compilerVersion() },
    });
    if (result?.artifact === null || typeof result?.artifact !== "object"
      || typeof result?.bytes !== "string") refuse("COMPILER_MODULE_FRAME");
    const bytes = Buffer.from(result.bytes, "base64");
    if (bytes.toString("base64") !== result.bytes) refuse("COMPILER_MODULE_FRAME");
    assertExactScalarAst(result.artifact.checkedAst);
    return Object.freeze({ artifact: Object.freeze(result.artifact), bytes, identity });
  } finally {
    isolated.dispose();
  }
}

export async function verifyScalarOraclePair(sourceBytes, artifactBytes, identity) {
  const inspected = inspectScalarOracleSource(sourceBytes);
  const isolated = await buildFreshHeadCompiler();
  try {
    const current = currentIdentity(inspected.sourceDigest, isolated.compilerExecutableGraphDigest);
    for (const field of ["sourceDigest", "compilerPackageGraphDigest", "checkerSetDigest",
      "generatorSourceDigest", "compilerExecutableGraphDigest"]) {
      if (identity?.[field] !== current[field]) refuse(`PAIR_${field.toUpperCase()}`);
    }
    const result = isolated.execute({
      mode: "verify",
      source: inspected.source,
      bytes: Buffer.from(artifactBytes).toString("base64"),
      identity: { ...current, compilerVersion: compilerVersion() },
    });
    if (typeof result?.artifactDigest !== "string" || result.sourceDigest !== inspected.sourceDigest) {
      refuse("COMPILER_MODULE_FRAME");
    }
    return Object.freeze(result);
  } finally {
    isolated.dispose();
  }
}

function isolatedCandidate() {
  const token = randomBytes(16).toString("hex");
  const result = spawnSync(process.execPath, [generatorPath, "--internal-candidate"], {
    cwd: root,
    encoding: "utf8",
    env: closedChildEnv({ GALERINA_SCALAR_GENERATOR_INTERNAL: token }),
    maxBuffer: CHILD_MAX_BYTES,
    timeout: CHILD_TIMEOUT_MS,
  });
  if (result.status !== 0 || result.error !== undefined) {
    refuse("CHILD", `${String(result.stderr ?? result.error ?? "unknown")}`.slice(0, 512));
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    refuse("CHILD_FRAME");
  }
  if (parsed?.token !== token || typeof parsed.bytes !== "string" || parsed.identity === null
    || typeof parsed.identity !== "object" || Array.isArray(parsed.identity)) refuse("CHILD_IDENTITY");
  const bytes = Buffer.from(parsed.bytes, "base64");
  if (bytes.toString("base64") !== parsed.bytes) refuse("CHILD_BASE64");
  return Object.freeze({ bytes, identity: Object.freeze({ ...parsed.identity }) });
}

function isolatedPair() {
  const first = isolatedCandidate();
  const second = isolatedCandidate();
  if (!first.bytes.equals(second.bytes)
    || JSON.stringify(first.identity) !== JSON.stringify(second.identity)) refuse("NON_DETERMINISTIC");
  return first;
}

function writeArtifactAtomic(bytes) {
  const temp = `${artifactPath}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  let fd;
  try {
    fd = openSync(temp, "wx", 0o600);
    writeFileSync(fd, bytes);
    closeSync(fd);
    fd = undefined;
    const reread = stableRead(temp, 262_144, "TEMP");
    if (!Buffer.from(reread).equals(Buffer.from(bytes))) refuse("TEMP_MISMATCH");
    renameSync(temp, artifactPath);
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temp)) unlinkSync(temp);
    if (error instanceof ScalarArtifactRefusal) throw error;
    refuse("WRITE", error instanceof Error ? error.message : String(error));
  }
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.length !== 1) refuse("ARGUMENT_LOCATOR");
  const mode = args[0];
  if (mode === "--internal-candidate") {
    const token = process.env.GALERINA_SCALAR_GENERATOR_INTERNAL;
    if (typeof token !== "string" || !/^[0-9a-f]{32}$/u.test(token)) refuse("INTERNAL_TOKEN");
    const candidate = await buildScalarOracleArtifactCandidate();
    process.stdout.write(`${JSON.stringify({
      token,
      bytes: Buffer.from(candidate.bytes).toString("base64"),
      identity: candidate.identity,
    })}\n`);
    return;
  }
  if (mode !== "--check" && mode !== "--write" && mode !== "--self-test") refuse("MODE_ARGUMENT");
  const candidate = isolatedPair();
  const sourceBytes = stableRead(sourcePath, SOURCE_MAX_BYTES, "SOURCE");
  await verifyScalarOraclePair(sourceBytes, candidate.bytes, candidate.identity);
  if (mode === "--self-test") {
    process.stdout.write("RD0858_SCALAR_ARTIFACT_SELF_TEST PASS\n");
    return;
  }
  if (mode === "--write") {
    if (!existsSync(artifactPath)
      || !Buffer.from(stableRead(artifactPath, 262_144, "ARTIFACT")).equals(candidate.bytes)) {
      writeArtifactAtomic(candidate.bytes);
    }
    process.stdout.write("RD0858_SCALAR_ARTIFACT_WRITE PASS\n");
    return;
  }
  const committed = stableRead(artifactPath, 262_144, "ARTIFACT");
  await verifyScalarOraclePair(sourceBytes, committed, candidate.identity);
  if (!Buffer.from(committed).equals(candidate.bytes)) refuse("FIXED_POINT");
  process.stdout.write("RD0858_SCALAR_ARTIFACT_FIXED_POINT PASS byte-identical\n");
}

if (process.argv[1] !== undefined
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
