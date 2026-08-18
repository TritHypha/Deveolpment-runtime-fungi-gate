import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkEffects,
  checkTypes,
  emitGIR,
  executeFlow,
  hashGIR,
  parseProgram,
  verifyGovernance,
} from "../../../packages-galerina/galerina-core-compiler/dist/index.js";

import { MAX_DIFFERENTIAL_VECTORS, SandboxRefusal } from "./contracts.mjs";
import { alphaFungiFingerprint, findFungiCollision } from "../fungi-shadow.mjs";
import { canonicalJson } from "./journal.mjs";

const execFile = promisify(execFileCallback);
const GATES = Object.freeze({ identity: 1, provenance: 1, target: 1, effects: 1, policy: 1, revocation: 1, validation: 1, memory: 1 });
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const COMPILER_ENTRY = fileURLToPath(new URL("../../../packages-galerina/galerina-core-compiler/dist/index.js", import.meta.url));
const SLIDE_MODULES = Object.freeze([
  "src/checked-fungi-package-compiler.mjs",
  "src/checked-fungi-package-file.mjs",
  "src/checked-fungi-package-publication-loader.mjs",
  "src/safe-value-envelope.mjs",
  "src/portable-veo.mjs",
]);

export function alphaShadowFingerprint(source) {
  if (typeof source !== "string" || source.length === 0) throw new SandboxRefusal("SHADOW_SOURCE_INVALID", "shadow source must be nonempty text");
  try {
    return `sha256:${alphaFungiFingerprint(source)}`;
  } catch (error) {
    throw new SandboxRefusal("SHADOW_SOURCE_INVALID", error instanceof Error ? error.message : "shadow source is invalid");
  }
}

export function findCorpusCollision(candidateSource, corpus) {
  try {
    return findFungiCollision(candidateSource, corpus);
  } catch (error) {
    throw new SandboxRefusal("SHADOW_SOURCE_INVALID", error instanceof Error ? error.message : "shadow corpus is invalid");
  }
}

export async function loadWorkingFungiCorpus(root) {
  const { stdout } = await execFile("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.fungi"], { cwd: root, encoding: "buffer", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const paths = stdout.toString("utf8").split("\0").filter(Boolean).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const corpus = [];
  for (const path of paths) corpus.push(Object.freeze({ path, source: await readFile(resolve(root, ...path.split("/")), "utf8") }));
  return Object.freeze(corpus);
}

function errors(diagnostics) {
  return (diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error").map((diagnostic) => diagnostic.code);
}

function unwrapRuntimeValue(value) {
  if (value && typeof value === "object" && typeof value.__tag === "string" && "value" in value) return value.value;
  return value;
}

function runtimeValue(value) {
  if (typeof value === "boolean") return { __tag: "bool", value };
  if (typeof value === "string") return { __tag: "string", value };
  if (typeof value === "number" && Number.isSafeInteger(value) && !Object.is(value, -0)) return { __tag: "int", value };
  throw new SandboxRefusal("DIFFERENTIAL_ARGUMENT_UNSUPPORTED", "differential arguments must be Bool, String or exact Int values");
}

function admittedVectors(vectors, expected) {
  const selected = vectors ?? [{ arguments: [], expected }];
  if (!Array.isArray(selected) || selected.length < 1 || selected.length > MAX_DIFFERENTIAL_VECTORS) {
    throw new SandboxRefusal("DIFFERENTIAL_VECTORS_INVALID", `evidence requires 1..${MAX_DIFFERENTIAL_VECTORS} vectors`);
  }
  return selected;
}

export async function buildCompilerEvidence({ source, file, flow, expected, parameterNames = [], vectors }) {
  const compile = () => {
    const parsed = parseProgram(source, file, { requireVersionHeader: true });
    const parseErrors = errors(parsed.diagnostics);
    const types = checkTypes(parsed.ast);
    const typeErrors = errors(types.diagnostics);
    const effects = checkEffects(parsed.flows, parsed.ast);
    const effectErrors = effects.flatMap((result) => errors(result.diagnostics));
    const governance = verifyGovernance(parsed.ast, parsed.flows, effects, "dev", file);
    const governanceErrors = errors(governance.diagnostics);
    const gir = emitGIR(parsed.ast, parsed.flows, effects, { sourceHash: sha256(Buffer.from(source, "utf8")) });
    const girErrors = errors(gir.diagnostics);
    return { parsed, effects, parseErrors, typeErrors, effectErrors, governanceErrors, girErrors, girHash: hashGIR(gir.gir) };
  };
  const first = compile();
  const second = compile();
  const selectedVectors = admittedVectors(vectors, expected);
  const executedValues = [];
  let executionErrors = [];
  if ([...first.parseErrors, ...first.typeErrors, ...first.effectErrors, ...first.governanceErrors, ...first.girErrors].length === 0) {
    if (!Array.isArray(parameterNames) || selectedVectors.some((vector) => !Array.isArray(vector.arguments) || vector.arguments.length !== parameterNames.length)) {
      throw new SandboxRefusal("DIFFERENTIAL_VECTOR_ARITY_INVALID", "vector arity does not match admitted parameters");
    }
    for (const vector of selectedVectors) {
      const arguments_ = new Map(parameterNames.map((name, index) => [name, runtimeValue(vector.arguments[index])]));
      const execution = await executeFlow(flow, arguments_, first.parsed.ast, first.parsed.flows);
      executionErrors = [...executionErrors, ...errors(execution.diagnostics)];
      executedValues.push(unwrapRuntimeValue(execution.value));
    }
  }
  const green = first.girHash === second.girHash
    && [...first.parseErrors, ...first.typeErrors, ...first.effectErrors, ...first.governanceErrors, ...first.girErrors, ...executionErrors].length === 0
    && selectedVectors.every((vector, index) => Object.is(executedValues[index], vector.expected));
  const checkedSnapshotSha256 = sha256(Buffer.from(canonicalJson({
    sourceSha256: sha256(Buffer.from(source, "utf8")),
    parseErrors: first.parseErrors,
    typeErrors: first.typeErrors,
    effectErrors: first.effectErrors,
    governanceErrors: first.governanceErrors,
    girErrors: first.girErrors,
  }), "utf8"));
  return Object.freeze({
    green,
    checkedSnapshotSha256,
    compilerEntrypointSha256: sha256(await readFile(COMPILER_ENTRY)),
    parseErrors: first.parseErrors,
    typeErrors: first.typeErrors,
    effectErrors: first.effectErrors,
    governanceErrors: first.governanceErrors,
    girErrors: first.girErrors,
    executionErrors,
    girHashFirst: first.girHash,
    girHashSecond: second.girHash,
    executedValue: executedValues.length === 1 ? executedValues[0] : undefined,
    executedValues,
  });
}

async function slideToolchainIdentity(slideRoot) {
  const stat = await lstat(slideRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(slideRoot) !== slideRoot) throw new SandboxRefusal("PHYSICAL_SLIDE_IDENTITY_INVALID", "SLIDE root must be a regular non-symlink directory");
  const { stdout: headOutput } = await execFile("git", ["rev-parse", "HEAD"], { cwd: slideRoot, encoding: "utf8", windowsHide: true });
  const head = headOutput.trim();
  if (!/^[0-9a-f]{40}$/u.test(head)) throw new SandboxRefusal("PHYSICAL_SLIDE_BUILD_POINT_INVALID", "SLIDE HEAD is not an exact commit");
  const { stdout: dirtyOutput } = await execFile("git", ["status", "--porcelain=v1", "--", ...SLIDE_MODULES], { cwd: slideRoot, encoding: "utf8", windowsHide: true });
  if (dirtyOutput.trim() !== "") throw new SandboxRefusal("PHYSICAL_SLIDE_DIRTY", "SLIDE evidence modules have uncommitted changes");
  const modules = {};
  for (const path of SLIDE_MODULES) modules[path] = sha256(await readFile(resolve(slideRoot, ...path.split("/"))));
  return Object.freeze({ buildPoint: head, modules: Object.freeze(modules) });
}

async function loadSlide(slideRoot) {
  const load = async (name) => import(pathToFileURL(join(slideRoot, "src", name)).href);
  return {
    ...await load("checked-fungi-package-compiler.mjs"),
    ...await load("checked-fungi-package-file.mjs"),
    ...await load("checked-fungi-package-publication-loader.mjs"),
    ...await load("safe-value-envelope.mjs"),
    ...await load("portable-veo.mjs"),
  };
}

function expectation(receipt) {
  return {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: receipt.packageIdentity,
    exportName: receipt.exportName,
    receiptDigest: receipt.receiptDigest,
    safeValueTypeId: receipt.safeValueTypeId,
    safeValueStateId: receipt.safeValueStateId,
    safeValueProvenanceDigest: receipt.safeValueProvenanceDigest,
  };
}

export async function buildPhysicalEvidence({ root, source, flow, expected, vectors }) {
  const requested = process.env.GALERINA_SLIDE_REPO;
  const slideRoot = typeof requested === "string" && requested.length > 0 ? resolve(requested) : resolve(root, "..", "SLIDE");
  if (!existsSync(join(slideRoot, "src", "checked-fungi-package-compiler.mjs"))) throw new SandboxRefusal("PHYSICAL_SLIDE_UNAVAILABLE", "independent SLIDE repository is unavailable");
  const toolchain = await slideToolchainIdentity(slideRoot);
  const slide = await loadSlide(slideRoot);
  const context = slide.portableVeoReferenceContext();
  const profileSha256 = sha256(Buffer.from(canonicalJson({ context, gates: GATES, toolchain }), "utf8"));
  const sourceBytes = Uint8Array.from(Buffer.from(source, "utf8"));
  const request = (bytes) => ({
    packages: [{ identity: "@galerina/ts-to-fungi-sandbox", version: "0.0.1", exports: [{ name: flow, sourceFlowName: flow, sourceBytes: bytes }], dependencies: [], resources: [] }],
    context,
    gates: GATES,
  });
  const compiled = slide.compileCheckedFungiPackageSet(request(sourceBytes));
  if (compiled.verdict !== 1) throw new SandboxRefusal("PHYSICAL_COMPILE_REFUSED", "SLIDE refused candidate source");
  const changedSource = Uint8Array.from(sourceBytes);
  changedSource[0] ^= 1;
  let sourceMutationRefused = false;
  try {
    sourceMutationRefused = slide.compileCheckedFungiPackageSet(request(changedSource)).verdict === -1;
  } catch {
    sourceMutationRefused = true;
  }
  const parent = await mkdtemp(join(tmpdir(), "ts-to-fungi-slide-"));
  const publication = join(parent, "published");
  try {
    const published = await slide.publishCheckedFungiPackageBuild({ packageBuildHandle: compiled.packageBuildHandle, outputDirectory: publication });
    if (published.verdict !== 1) throw new SandboxRefusal("PHYSICAL_PUBLICATION_REFUSED", "SLIDE publication failed");
    const selectedVectors = admittedVectors(vectors, expected);
    const receipts = [];
    const verifiedValues = [];
    const authorityReleased = [];
    for (const vector of selectedVectors) {
      const prepared = await slide.prepareCheckedFungiPackagePublication({ publicationDirectory: publication, packageIdentity: "@galerina/ts-to-fungi-sandbox", exportName: flow, context, gates: GATES });
      if (prepared.verdict !== 1) throw new SandboxRefusal("PHYSICAL_READMISSION_REFUSED", "independent re-admission failed");
      const receipt = slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle, vector.arguments, undefined);
      const verified = slide.verifyTypedCheckedFungiPackageReceipt(receipt, expectation(receipt));
      if (verified.verdict !== 1 || !Object.is(verified.value, vector.expected)) throw new SandboxRefusal("PHYSICAL_VOK_REFUSED", "VOK verification or differential value failed");
      receipts.push(receipt);
      verifiedValues.push(verified.value);
      authorityReleased.push(verified.authorityReleased);
    }
    const receipt = receipts[0];
    const mutatedReceipt = { ...receipt, receiptDigest: "sha256:" + "0".repeat(64) };
    const receiptMutationRefused = slide.verifyTypedCheckedFungiPackageReceipt(mutatedReceipt, expectation(receipt)).verdict === -1;
    const slideName = published.outputFiles.find((name) => name.endsWith(".slide"));
    if (typeof slideName !== "string") throw new SandboxRefusal("PHYSICAL_ARTIFACT_MISSING", "publication emitted no physical .slide");
    const artifactPath = join(publication, slideName);
    const artifactBytes = await readFile(artifactPath);
    const artifactSha256 = sha256(artifactBytes);
    const mutatedArtifact = Uint8Array.from(artifactBytes);
    mutatedArtifact[0] ^= 1;
    await writeFile(artifactPath, mutatedArtifact);
    const rejected = await slide.prepareCheckedFungiPackagePublication({ publicationDirectory: publication, packageIdentity: "@galerina/ts-to-fungi-sandbox", exportName: flow, context, gates: GATES });
    const artifactMutationRefused = rejected.verdict === -1;
    const green = sourceMutationRefused && receiptMutationRefused && artifactMutationRefused && authorityReleased.every((value) => value === false);
    const vokReceiptDigests = receipts.map((item) => item.receiptDigest);
    if (vokReceiptDigests.some((value) => !/^sha256:[0-9a-f]{64}$/u.test(value))) {
      throw new SandboxRefusal("PHYSICAL_VOK_RECEIPT_INVALID", "VOK returned a malformed receipt digest");
    }
    return Object.freeze({
      green,
      toolchain,
      profileSha256,
      vokReceiptDigests,
      authorityReleased: authorityReleased.some((value) => value !== false),
      verifiedValues,
      artifactSha256,
      packageSetDigest: receipt.packageSetDigest,
      sourceMutationRefused,
      artifactMutationRefused,
      receiptMutationRefused,
    });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}
