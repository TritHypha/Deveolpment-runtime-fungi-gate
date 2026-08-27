import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SCALAR_ORACLE_SOURCE_RELATIVE = "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi";
export const SCALAR_ORACLE_ARTIFACT_RELATIVE = "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json";

const GENERATOR_RELATIVE = "scripts/generate-rd0858-scalar-oracle-artifact.mjs";
const COMPILER_PACKAGE_RELATIVE = "packages-ts/galerina-core-compiler";
const PACKAGE_LOCK_RELATIVE = "package-lock.json";
const SOURCE_MAX_BYTES = 65_536;
const CHILD_MAX_BYTES = 1_048_576;
const CHILD_TIMEOUT_MS = 130_000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, ...SCALAR_ORACLE_SOURCE_RELATIVE.split("/"));
const artifactPath = join(root, ...SCALAR_ORACLE_ARTIFACT_RELATIVE.split("/"));
const generatorPath = join(root, ...GENERATOR_RELATIVE.split("/"));
const packageJsonPath = join(root, COMPILER_PACKAGE_RELATIVE, "package.json");
const compilerDistPath = join(root, COMPILER_PACKAGE_RELATIVE, "dist");
const compilerEntryPath = join(compilerDistPath, "index.js");
const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

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

function readHeadBlob(relativePath) {
  const bytes = git(["show", `HEAD:${relativePath}`], "buffer");
  if (!(bytes instanceof Buffer)) refuse("HEAD_BLOB");
  return bytes;
}

function computePackageGraphDigest(compilerExecutableGraphDigest) {
  const entries = headEntries(COMPILER_PACKAGE_RELATIVE);
  if (entries.length < 1) refuse("PACKAGE_GRAPH_HEAD");
  const hash = createHash("sha256");
  hash.update("galerina.compiler-package-graph.v2\0", "utf8");
  for (const entry of entries) {
    hash.update(`${entry.mode} ${entry.blob}\t${entry.path}\n`, "utf8");
  }
  hash.update(`${compilerExecutableGraphDigest}\n`, "utf8");
  return `sha256:${hash.digest("hex")}`;
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

function compileCheckedAst(compiler, source) {
  const fileLabel = SCALAR_ORACLE_SOURCE_RELATIVE;
  const safety = compiler.validateCoreSyntaxSafety({ file: fileLabel, text: source });
  const parsed = compiler.parseProgram(source, fileLabel, { requireVersionHeader: true });
  const symbols = compiler.resolveSymbols(parsed.ast);
  const types = compiler.checkTypes(parsed.ast);
  const values = compiler.checkValueStates(parsed.ast, "production");
  const effects = compiler.checkEffects(parsed.flows, parsed.ast);
  const governance = compiler.verifyGovernance(parsed.ast, parsed.flows, effects, "production", fileLabel);
  const escapes = compiler.checkSourceEscapes(parsed.ast);
  const naming = compiler.checkNamingPolicy(parsed.ast);
  const diagnostics = [
    ...safety.diagnostics,
    ...parsed.diagnostics,
    ...symbols.diagnostics,
    ...types.diagnostics,
    ...values.diagnostics,
    ...compiler.effectResultsToDiagnostics(effects),
    ...governance.diagnostics,
    ...escapes.diagnostics,
    ...naming.diagnostics,
  ];
  if (parsed.flows.length !== 1 || diagnostics.some((entry) => entry.severity === "error" || entry.severity === "warning")) {
    refuse("CHECKER", diagnostics.map((entry) => entry.code ?? entry.message).join(",").slice(0, 512));
  }
  const flow = parsed.flows[0];
  const flowNode = (parsed.ast.children ?? []).find((node) =>
    node.kind === "pureFlowDecl" && node.value === "scalarOracle");
  if (flow === undefined || flow.name !== "scalarOracle" || flowNode === undefined) refuse("FLOW_IDENTITY");
  const snapshot = compiler.snapshotCheckedFlow(flow, flowNode);
  if (snapshot === undefined) refuse("CHECKED_SNAPSHOT");
  assertExactScalarAst(snapshot.ast);
  return snapshot.ast;
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

function executableClosureDigest(directory) {
  const files = [];
  const visit = (current) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      const stat = lstatSync(path, { bigint: true });
      if (stat.isSymbolicLink()) refuse("COMPILER_BUILD_SYMLINK");
      if (stat.isDirectory()) {
        visit(path);
      } else if (stat.isFile() && [".js", ".json", ".wasm", ".fungi"].includes(extname(name))) {
        files.push(path);
      }
    }
  };
  visit(directory);
  if (files.length < 1) refuse("COMPILER_BUILD_EMPTY");
  const hash = createHash("sha256");
  hash.update("galerina.compiler-executable-graph.v1\0", "utf8");
  for (const path of files) {
    const locator = relative(compilerDistPath, path).replaceAll("\\", "/");
    const bytes = stableRead(path, CHILD_MAX_BYTES * 16, "COMPILER_BUILD");
    hash.update(`${locator}\0${bytes.byteLength}\0`, "utf8");
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

let freshCompilerPromise;
export async function buildFreshHeadCompiler() {
  if (freshCompilerPromise !== undefined) return freshCompilerPromise;
  freshCompilerPromise = (async () => {
    const governedPaths = [
      SCALAR_ORACLE_SOURCE_RELATIVE,
      SCALAR_ORACLE_ARTIFACT_RELATIVE,
      GENERATOR_RELATIVE,
      COMPILER_PACKAGE_RELATIVE,
      PACKAGE_LOCK_RELATIVE,
    ];
    requireHeadMatchesWorktree(governedPaths);
    const headBefore = String(git(["rev-parse", "HEAD"])).trim();
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const built = spawnSync(
      npmCommand,
      ["--prefix", COMPILER_PACKAGE_RELATIVE, "run", "build"],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: CHILD_MAX_BYTES * 16,
        timeout: CHILD_TIMEOUT_MS,
      },
    );
    if (built.status !== 0 || built.error !== undefined) {
      refuse("COMPILER_BUILD", String(built.stderr ?? built.error ?? "unknown").slice(0, 512));
    }
    requireHeadMatchesWorktree(governedPaths);
    if (String(git(["rev-parse", "HEAD"])).trim() !== headBefore) refuse("HEAD_DRIFT");
    const compilerExecutableGraphDigest = executableClosureDigest(compilerDistPath);
    const compiler = await import(
      `${pathToFileURL(compilerEntryPath).href}?${headBefore}-${compilerExecutableGraphDigest.slice(7)}`
    );
    for (const name of [
      "validateCoreSyntaxSafety",
      "parseProgram",
      "resolveSymbols",
      "checkTypes",
      "checkValueStates",
      "checkEffects",
      "verifyGovernance",
      "checkSourceEscapes",
      "checkNamingPolicy",
      "effectResultsToDiagnostics",
      "snapshotCheckedFlow",
      "encodeCheckedFlowArtifact",
      "decodeCheckedFlowArtifact",
      "digestCheckedFlowArtifact",
    ]) {
      if (typeof compiler[name] !== "function") refuse("COMPILER_EXPORT", name);
    }
    if (executableClosureDigest(compilerDistPath) !== compilerExecutableGraphDigest) {
      refuse("COMPILER_BUILD_DRIFT");
    }
    return Object.freeze({ compiler, compilerExecutableGraphDigest });
  })();
  return freshCompilerPromise;
}

export async function buildScalarOracleArtifactCandidate() {
  const sourceBytes = stableRead(sourcePath, SOURCE_MAX_BYTES, "SOURCE");
  const inspected = inspectScalarOracleSource(sourceBytes);
  const { compiler, compilerExecutableGraphDigest } = await buildFreshHeadCompiler();
  const identity = currentIdentity(inspected.sourceDigest, compilerExecutableGraphDigest);
  const checkedAst = compileCheckedAst(compiler, inspected.source);
  const artifact = Object.freeze({
    schema: "galerina.rd0858.checked-flow.v1",
    hashAlgorithm: "sha256",
    productId: "galerina",
    packageId: "rd0858-unit4-scalar-oracle",
    flowLocator: "rd0858/unit4/scalar-oracle",
    flowName: "scalarOracle",
    languageVersion: 1,
    runtimeProfile: "scalar-1",
    sourceCanonicalization: "UTF8_NO_BOM_LF_NFC_V1",
    sourceDigest: identity.sourceDigest,
    compilerPackageId: "@galerina/core-compiler",
    compilerVersion: compilerVersion(),
    compilerPackageGraphDigest: identity.compilerPackageGraphDigest,
    checkerSetId: "galerina.strict-checks.v1",
    checkerSetDigest: identity.checkerSetDigest,
    generatorId: "rd0858-scalar-oracle-generator.v1",
    generatorSourceDigest: identity.generatorSourceDigest,
    qualifier: "pure",
    parameters: Object.freeze([Object.freeze({ name: "subject", type: "Verdict" })]),
    returnType: "String",
    declaredEffects: Object.freeze([]),
    checkedAst,
  });
  const bytes = compiler.encodeCheckedFlowArtifact(artifact);
  const decoded = compiler.decodeCheckedFlowArtifact(bytes);
  assertExactScalarAst(decoded.checkedAst);
  return Object.freeze({ artifact: decoded, bytes, identity });
}

export async function verifyScalarOraclePair(sourceBytes, artifactBytes, identity) {
  const { compiler, compilerExecutableGraphDigest } = await buildFreshHeadCompiler();
  const inspected = inspectScalarOracleSource(sourceBytes);
  const artifact = compiler.decodeCheckedFlowArtifact(artifactBytes);
  assertExactScalarAst(artifact.checkedAst);
  if (artifact.sourceDigest !== inspected.sourceDigest || artifact.sourceDigest !== identity?.sourceDigest) {
    refuse("PAIR_SOURCE_DIGEST");
  }
  if (artifact.compilerPackageGraphDigest !== identity?.compilerPackageGraphDigest) refuse("PAIR_TOOLCHAIN_GRAPH");
  if (artifact.checkerSetDigest !== identity?.checkerSetDigest) refuse("PAIR_CHECKER_SET");
  if (artifact.generatorSourceDigest !== identity?.generatorSourceDigest) refuse("PAIR_GENERATOR");
  if (compilerExecutableGraphDigest !== identity?.compilerExecutableGraphDigest) {
    refuse("PAIR_EXECUTABLE_GRAPH");
  }
  return Object.freeze({
    artifactDigest: compiler.digestCheckedFlowArtifact(artifactBytes),
    sourceDigest: inspected.sourceDigest,
  });
}

function isolatedCandidate() {
  const token = randomBytes(16).toString("hex");
  const result = spawnSync(process.execPath, [generatorPath, "--internal-candidate"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GALERINA_SCALAR_GENERATOR_INTERNAL: token },
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
