import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const SLIDE_ROOT = new URL("../../../../../SLIDE/", import.meta.url);
const SOURCE_URL = new URL("./benchmark.fungi", import.meta.url);
const EXPECTED_SLIDE_COMMIT = "c908d891efc06b409e16d2ce31fad56f6e469f4a";
const EXPECTED_REGISTRY_ID = "slide.registry.executable-gir.v2c-benchmark-counted-control.v1";
const EXPECTED_REGISTRY_DIGEST = "56a815aea2264b840892acca1f1ddc5e27bac792d2feed40e4c6b99d9a16c266";
const EXPECTED_RESULT = 57984;
const ITERATIONS = 50000;
const CALLS_PER_ITERATION = 7;

function refused(reason) {
  throw new Error(`CALL_CHAIN_SLIDE_REFERENCE_REFUSED:${reason}`);
}

function exactCount(value, name, { minimum, maximum, odd = false }) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum || (odd && value % 2 !== 1)) {
    refused(`${name}_INVALID`);
  }
  return value;
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[(ordered.length - 1) / 2];
}

function verifySlideBuildPoint() {
  const root = fileURLToPath(SLIDE_ROOT);
  const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (head !== EXPECTED_SLIDE_COMMIT) refused("SLIDE_COMMIT_MISMATCH");
  const relevant = [
    "src/checked-fungi-pure-scalar-compiler.mjs",
    "src/portable-veo.mjs",
    "src/reference-slide-bundle.mjs",
    "src/v2c-general-executor.mjs",
    "src/v2c-reference-frontend.mjs",
    "governance/checked-fungi-package-tool-manifest.json",
  ];
  const dirty = execFileSync("git", ["-C", root, "status", "--porcelain=v1", "--", ...relevant], { encoding: "utf8" }).trim();
  if (dirty !== "") refused("SLIDE_RELEVANT_WORKTREE_DIRTY");
  return head;
}

async function slideApi() {
  const compiler = await import(pathToFileURL(fileURLToPath(new URL("src/checked-fungi-pure-scalar-compiler.mjs", SLIDE_ROOT))).href);
  const bundle = await import(pathToFileURL(fileURLToPath(new URL("src/reference-slide-bundle.mjs", SLIDE_ROOT))).href);
  const veo = await import(pathToFileURL(fileURLToPath(new URL("src/portable-veo.mjs", SLIDE_ROOT))).href);
  return Object.freeze({
    compile: compiler.compileCheckedFungiPureScalarModule,
    prepare: bundle.prepareReferenceSlideBundle,
    execute: bundle.executeReferenceSlideBundle,
    context: veo.portableVeoReferenceContext(),
  });
}

export async function runSlideReferenceBenchmark(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) refused("OPTIONS_INVALID");
  const keys = Object.keys(options);
  if (keys.some((key) => key !== "warmupRuns" && key !== "sampleRuns")) refused("OPTIONS_UNKNOWN");
  const warmupRuns = exactCount(options.warmupRuns ?? 2, "WARMUP_RUNS", { minimum: 1, maximum: 5 });
  const sampleRuns = exactCount(options.sampleRuns ?? 7, "SAMPLE_RUNS", { minimum: 3, maximum: 11, odd: true });
  const slideCommit = verifySlideBuildPoint();
  const sourceBytes = Uint8Array.from(await readFile(SOURCE_URL));
  const api = await slideApi();

  const compileStarted = performance.now();
  const compiled = api.compile({
    sourceBytes,
    flowName: "main",
    artifactId: "galerina.benchmark.call-chain",
    context: api.context,
  });
  const compileMs = performance.now() - compileStarted;
  if (compiled.verdict !== 1) refused(`COMPILE_${compiled.failureId ?? "UNKNOWN"}`);
  if (compiled.registrySetId !== EXPECTED_REGISTRY_ID) refused("REGISTRY_ID_MISMATCH");
  if (compiled.registrySetDigest !== EXPECTED_REGISTRY_DIGEST) refused("REGISTRY_DIGEST_MISMATCH");

  const prepareStarted = performance.now();
  const prepared = api.prepare(compiled.bundleBytes, api.context);
  const prepareMs = performance.now() - prepareStarted;
  if (prepared.verdict !== 1) refused(`PREPARE_${prepared.failureId ?? "UNKNOWN"}`);

  const execute = () => {
    const fresh = api.prepare(compiled.bundleBytes, api.context);
    if (fresh.verdict !== 1) refused(`PREPARE_SAMPLE_${fresh.failureId ?? "UNKNOWN"}`);
    const started = performance.now();
    const receipt = api.execute(fresh.slideHandle, []);
    const elapsedMs = performance.now() - started;
    if (receipt.status !== "SUCCEEDED") refused(`EXECUTE_${receipt.failureId ?? receipt.status ?? "UNKNOWN"}`);
    if (receipt.value !== EXPECTED_RESULT) refused("CHECKSUM_MISMATCH");
    if (receipt.authorityReleased !== false || receipt.fallbackInvoked !== false) refused("AUTHORITY_OR_FALLBACK_MISMATCH");
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) refused("ELAPSED_INVALID");
    return elapsedMs;
  };

  for (let index = 0; index < warmupRuns; index += 1) execute();
  const samples = [];
  for (let index = 0; index < sampleRuns; index += 1) samples.push(execute());
  const elapsedMs = median(samples);

  return Object.freeze({
    runtime: "galerina-slide-reference",
    benchmark: "call-chain-v1",
    result: EXPECTED_RESULT,
    iterations: ITERATIONS,
    callsPerIteration: CALLS_PER_ITERATION,
    elapsedMs,
    iterationsPerSecond: ITERATIONS / (elapsedMs / 1000),
    callsPerSecond: (ITERATIONS * CALLS_PER_ITERATION) / (elapsedMs / 1000),
    compileMs,
    prepareMs,
    warmupRuns,
    samples: Object.freeze([...samples]),
    statistic: "median",
    referenceOnly: true,
    authorityReleased: false,
    k3: 0,
    slideCommit,
    registrySetId: EXPECTED_REGISTRY_ID,
    registrySetDigest: EXPECTED_REGISTRY_DIGEST,
  });
}
