import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const SLIDE_ROOT = new URL("../../../../SLIDE/", import.meta.url);
const EXPECTED_SLIDE_COMMIT = "370aa805e55ad011320c7c5b1d03724fe860b6af";
const EXPECTED_REGISTRY_ID = "slide.registry.executable-gir.v2c-benchmark-counted-control.v1";
const EXPECTED_REGISTRY_DIGEST = "56a815aea2264b840892acca1f1ddc5e27bac792d2feed40e4c6b99d9a16c266";

const PROFILES = Object.freeze({
  "call-chain": Object.freeze({
    sourceUrl: new URL("../benchmarks/call-chain/benchmark.fungi", import.meta.url),
    artifactId: "galerina.benchmark.call-chain",
    result: 57984,
    workCount: 50000,
    throughputUnit: "chains/s",
    rateShape: "INNER_WORK",
    callsPerIteration: 7,
  }),
  "compute-mix": Object.freeze({
    sourceUrl: new URL("../benchmarks/compute-mix/benchmark.fungi", import.meta.url),
    artifactId: "galerina.benchmark.compute-mix",
    result: -11971,
    workCount: 50000,
    throughputUnit: "mix-ops/s",
    rateShape: "INNER_WORK",
  }),
  "collection-pipeline": Object.freeze({
    sourceUrl: new URL("../benchmarks/collection-pipeline/benchmark.fungi", import.meta.url),
    artifactId: "galerina.benchmark.collection-pipeline",
    result: 49990000,
    workCount: 10000,
    throughputUnit: "elements/s",
    rateShape: "WHOLE_CALL",
    size: 10000,
  }),
});

function refused(reason) {
  throw new Error(`SLIDE_SCALAR_REFERENCE_REFUSED:${reason}`);
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
  const dirty = execFileSync(
    "git",
    ["-C", root, "status", "--porcelain=v1", "--", ...relevant],
    { encoding: "utf8" },
  ).trim();
  if (dirty !== "") refused("SLIDE_RELEVANT_WORKTREE_DIRTY");
  return head;
}

async function slideApi() {
  const moduleUrl = (path) => pathToFileURL(fileURLToPath(new URL(path, SLIDE_ROOT))).href;
  const compiler = await import(moduleUrl("src/checked-fungi-pure-scalar-compiler.mjs"));
  const bundle = await import(moduleUrl("src/reference-slide-bundle.mjs"));
  const veo = await import(moduleUrl("src/portable-veo.mjs"));
  return Object.freeze({
    compile: compiler.compileCheckedFungiPureScalarModule,
    prepare: bundle.prepareReferenceSlideBundle,
    execute: bundle.executeReferenceSlideBundle,
    context: veo.portableVeoReferenceContext(),
  });
}

export async function runScalarSlideReferenceBenchmark(benchmarkId, options = {}) {
  const profile = PROFILES[benchmarkId];
  if (profile === undefined) refused("BENCHMARK_NOT_ADMITTED");
  if (Object.prototype.toString.call(options) !== "[object Object]") refused("OPTIONS_INVALID");
  const keys = Object.keys(options);
  if (keys.some((key) => key !== "warmupRuns" && key !== "sampleRuns")) refused("OPTIONS_UNKNOWN");
  const warmupRuns = exactCount(options.warmupRuns ?? 2, "WARMUP_RUNS", { minimum: 1, maximum: 5 });
  const sampleRuns = exactCount(options.sampleRuns ?? 7, "SAMPLE_RUNS", { minimum: 3, maximum: 11, odd: true });
  const slideCommit = verifySlideBuildPoint();
  const sourceBytes = Uint8Array.from(await readFile(profile.sourceUrl));
  const api = await slideApi();

  const compileStarted = performance.now();
  const compiled = api.compile({
    sourceBytes,
    flowName: "main",
    artifactId: profile.artifactId,
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
    if (receipt.value !== profile.result) refused("CHECKSUM_MISMATCH");
    if (receipt.authorityReleased !== false || receipt.fallbackInvoked !== false) {
      refused("AUTHORITY_OR_FALLBACK_MISMATCH");
    }
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) refused("ELAPSED_INVALID");
    return elapsedMs;
  };

  for (let index = 0; index < warmupRuns; index += 1) execute();
  const samples = [];
  for (let index = 0; index < sampleRuns; index += 1) samples.push(execute());
  const elapsedMs = median(samples);
  const callsPerSecond = 1000 / elapsedMs;
  const normThroughput = profile.workCount * callsPerSecond;
  const rate = profile.rateShape === "INNER_WORK"
    ? Object.freeze({ iterations: profile.workCount, iterationsPerSecond: normThroughput })
    : Object.freeze({ iterations: 1, iterationsPerSecond: callsPerSecond, size: profile.size });

  return Object.freeze({
    runtime: "galerina-slide-reference",
    benchmark: `${benchmarkId}-v1`,
    benchmarkId,
    result: profile.result,
    workCount: profile.workCount,
    throughputUnit: profile.throughputUnit,
    elapsedMs,
    normThroughput,
    operations: profile.workCount,
    operationsPerSecond: normThroughput,
    ...rate,
    ...(profile.callsPerIteration === undefined ? {} : { callsPerIteration: profile.callsPerIteration }),
    compileMs,
    prepareMs,
    warmupRuns,
    samples: Object.freeze([...samples]),
    statistic: "median",
    sourceDigest: compiled.sourceDigest,
    moduleDigest: compiled.moduleDigest,
    girDigest: compiled.girDigest,
    bundleDigest: compiled.bundleDigest,
    referenceOnly: true,
    authorityReleased: false,
    k3: 0,
    slideCommit,
    registrySetId: compiled.registrySetId,
    registrySetDigest: compiled.registrySetDigest,
  });
}
