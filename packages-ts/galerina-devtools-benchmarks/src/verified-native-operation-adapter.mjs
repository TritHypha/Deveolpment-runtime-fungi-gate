import { createHash } from "node:crypto";
import { lstat, open } from "node:fs/promises";
import { arch, cpus, platform, release } from "node:os";
import { resolve } from "node:path";
import { types as utilTypes } from "node:util";
import { fileURLToPath } from "node:url";

const CONTRACT_PATH = fileURLToPath(new URL(
  "../contracts/slide-verified-native-operation-admission-v1.json",
  import.meta.url,
));
const CONTRACT_SHA256 = "c4779c675e6a533559b6bf514f09941319adcb283672de91dc3a8a3e1f9e2777";
const REFUSAL_ID = "GALERINA-VERIFIED-NATIVE-OPERATION-EVIDENCE-REFUSED";
const RATE_NUMERATOR = 1_000_000_000_000_000;

const CONTRACT_KEYS = Object.freeze([
  "schema", "benchmark", "maxEvidenceBytes", "evidenceSha256", "slideCommit",
  "publicationDigest", "evidenceDigest", "iterations", "expectedResult",
  "laneIds", "host", "referenceOnly", "authorityReleased",
]);
const HOST_KEYS = Object.freeze(["platform", "release", "architecture", "cpu", "node"]);
const PUBLICATION_KEYS = Object.freeze(["schema", "benchmark", "provenance", "publicationDigest"]);
const BENCHMARK_KEYS = Object.freeze([
  "schema", "status", "evidenceK3", "authorityReleased", "config", "lanes",
  "comparisons", "checks", "evidenceDigest",
]);
const CONFIG_KEYS = Object.freeze(["warmups", "samples", "iterationsPerSample"]);
const LANE_KEYS = Object.freeze(["direction", "unit", "samplesNs", "medianNs"]);
const COMPARISON_KEYS = Object.freeze([
  "slidePreparationVsSourcePreparation", "slideDemandVsSourceDemand",
  "slideDemandVsChecked", "slidePreparedTotalVsSourceTotal",
  "slideEndToEndVsSourceTotal",
]);
const CHECK_KEYS = Object.freeze(["expectedValue", "exactResults", "failures"]);
const PROVENANCE_KEYS = Object.freeze([
  "commit", "dirty", "generatedAt", "platform", "release", "architecture",
  "cpu", "node",
]);

function refusal() {
  return Object.freeze({
    verdict: -1,
    status: "REFUSED",
    failureId: REFUSAL_ID,
    referenceOnly: true,
    authorityReleased: false,
  });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort())
    === JSON.stringify([...expected].sort());
}

function isPlainData(value, seen = new WeakSet()) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
  if (typeof value !== "object" || utilTypes.isProxy(value) || seen.has(value)) return false;
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) return false;
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  if (array) {
    const indexes = keys.filter((key) => key !== "length");
    if (indexes.length !== value.length || indexes.some((key, index) => key !== String(index))) return false;
  }
  for (const key of keys) {
    if (array && key === "length") continue;
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, "value") || descriptor.get !== undefined || descriptor.set !== undefined) return false;
    if (!isPlainData(descriptor.value, seen)) return false;
  }
  return Object.getOwnPropertySymbols(value).length === 0;
}

function exactArray(actual, expected) {
  return Array.isArray(actual)
    && !utilTypes.isProxy(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function positiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function exactDigest(value, hexadecimalLength = 64) {
  return typeof value === "string"
    && new RegExp(`^sha256:[0-9a-f]{${hexadecimalLength}}$`, "u").test(value);
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function semanticRecord(result) {
  return {
    schema: result.schema,
    status: result.status,
    evidenceK3: result.evidenceK3,
    authorityReleased: result.authorityReleased,
    config: result.config,
    lanes: result.lanes,
    comparisons: result.comparisons,
    checks: result.checks,
  };
}

function evidenceDigest(result) {
  return `sha256:${createHash("sha256")
    .update("slide.verified-loop-slide-benchmark.evidence.v1", "utf8")
    .update(Uint8Array.of(0))
    .update(JSON.stringify(semanticRecord(result)), "utf8")
    .digest("hex")}`;
}

function publicationDigest(publication) {
  const copy = { ...publication };
  delete copy.publicationDigest;
  return `sha256:${createHash("sha256")
    .update("slide.verified-loop-slide-benchmark.publication.v1", "utf8")
    .update(Uint8Array.of(0))
    .update(JSON.stringify(copy), "utf8")
    .digest("hex")}`;
}

function sameHost(left, right) {
  return HOST_KEYS.every((key) => left[key] === right[key]);
}

function currentHostFacts() {
  return Object.freeze({
    platform: platform(),
    release: release(),
    architecture: arch(),
    cpu: cpus()[0]?.model ?? "unknown",
    node: process.version,
  });
}

function validHost(value) {
  return isPlainData(value)
    && exactKeys(value, HOST_KEYS)
    && HOST_KEYS.every((key) => typeof value[key] === "string" && value[key].length > 0);
}

function contractIsValid(contract) {
  return isPlainData(contract)
    && exactKeys(contract, CONTRACT_KEYS)
    && contract.schema === "galerina.benchmark.slide-verified-native-operation-admission.v1"
    && contract.benchmark === "verified-native-operation"
    && Number.isSafeInteger(contract.maxEvidenceBytes)
    && contract.maxEvidenceBytes >= 1024
    && contract.maxEvidenceBytes <= 1_048_576
    && /^[0-9a-f]{64}$/u.test(contract.evidenceSha256)
    && /^[0-9a-f]{40}$/u.test(contract.slideCommit)
    && exactDigest(contract.publicationDigest)
    && exactDigest(contract.evidenceDigest)
    && contract.iterations === 1_000_000
    && contract.expectedResult === 999_999
    && Array.isArray(contract.laneIds)
    && contract.laneIds.length === 10
    && new Set(contract.laneIds).size === contract.laneIds.length
    && contract.laneIds.every((laneId) => typeof laneId === "string" && laneId.length > 0)
    && validHost(contract.host)
    && contract.referenceOnly === true
    && contract.authorityReleased === false;
}

function verifyLane(lane, samples) {
  return isPlainData(lane)
    && exactKeys(lane, LANE_KEYS)
    && lane.direction === "lower-is-better"
    && lane.unit === "nanoseconds-per-million-iteration-flow"
    && Array.isArray(lane.samplesNs)
    && !utilTypes.isProxy(lane.samplesNs)
    && lane.samplesNs.length === samples
    && lane.samplesNs.every(positiveSafeInteger)
    && lane.medianNs === median(lane.samplesNs);
}

function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return Object.freeze(value);
}

function admitted(publication) {
  const benchmark = publication.benchmark;
  const checked = benchmark.lanes.checkedPeer;
  const slide = benchmark.lanes.slideDemand;
  const reference = (runtime, lane, antiElision) => Object.freeze({
    runtime,
    iterations: benchmark.config.iterationsPerSample,
    result: benchmark.checks.expectedValue,
    samplesNs: Object.freeze([...lane.samplesNs]),
    medianNs: lane.medianNs,
    operationsPerSecond: Math.floor(RATE_NUMERATOR / lane.medianNs),
    unit: "element-reads/s",
    antiElision,
    referenceOnly: true,
    authorityReleased: false,
  });
  const phase = (laneId) => benchmark.lanes[laneId].medianNs;
  return deepFreeze({
    verdict: 1,
    status: "ADMITTED_REFERENCE_ONLY",
    failureId: "NONE",
    iterations: benchmark.config.iterationsPerSample,
    result: benchmark.checks.expectedValue,
    referenceOnly: true,
    authorityReleased: false,
    checkedReference: reference(
      "checked-reference-no-permission",
      checked,
      "explicit-length-bounds-and-option-checks",
    ),
    slideReference: reference(
      "slide-reference-permission-present",
      slide,
      "affine-vok-lease-and-value-only-receipt",
    ),
    phases: {
      direction: "lower-is-better",
      unit: "nanoseconds-per-million-iteration-flow",
      sourcePreparationMedianNs: phase("sourcePreparation"),
      sourceDemandMedianNs: phase("sourceDemand"),
      sourceTotalMedianNs: phase("sourceTotal"),
      slideCompilationMedianNs: phase("slideCompilation"),
      slidePreparationMedianNs: phase("slidePreparation"),
      slideDemandMedianNs: phase("slideDemand"),
      slidePreparedTotalMedianNs: phase("slidePreparedTotal"),
      slideEndToEndTotalMedianNs: phase("slideEndToEndTotal"),
      slideDemandVsChecked: benchmark.comparisons.slideDemandVsChecked,
    },
    provenance: {
      slideCommit: publication.provenance.commit,
      publicationDigest: publication.publicationDigest,
      evidenceDigest: benchmark.evidenceDigest,
      generatedAt: publication.provenance.generatedAt,
      platform: publication.provenance.platform,
      release: publication.provenance.release,
      architecture: publication.provenance.architecture,
      cpu: publication.provenance.cpu,
      node: publication.provenance.node,
    },
  });
}

export function verifyVerifiedNativeOperationPublication(publication, contract, hostFacts) {
  try {
    if (!contractIsValid(contract) || !validHost(hostFacts)) return refusal();
    if (!isPlainData(publication) || !exactKeys(publication, PUBLICATION_KEYS)) return refusal();
    const benchmark = publication.benchmark;
    const provenance = publication.provenance;
    if (
      publication.schema !== "slide.verified-loop-slide-benchmark-publication.v1"
      || !isPlainData(benchmark)
      || !exactKeys(benchmark, BENCHMARK_KEYS)
      || benchmark.schema !== "slide.verified-loop-slide-benchmark.v1"
      || benchmark.status !== "MEASURED_NON_AUTHORIZING"
      || benchmark.evidenceK3 !== 0
      || benchmark.authorityReleased !== false
      || !isPlainData(benchmark.config)
      || !exactKeys(benchmark.config, CONFIG_KEYS)
      || !Number.isSafeInteger(benchmark.config.warmups)
      || benchmark.config.warmups < 0
      || benchmark.config.warmups > 10
      || !Number.isSafeInteger(benchmark.config.samples)
      || benchmark.config.samples < 3
      || benchmark.config.samples > 99
      || benchmark.config.samples % 2 !== 1
      || benchmark.config.iterationsPerSample !== contract.iterations
      || !isPlainData(benchmark.lanes)
      || !exactKeys(benchmark.lanes, contract.laneIds)
      || !contract.laneIds.every((laneId) => verifyLane(benchmark.lanes[laneId], benchmark.config.samples))
      || !isPlainData(benchmark.comparisons)
      || !exactKeys(benchmark.comparisons, COMPARISON_KEYS)
      || !COMPARISON_KEYS.every((key) => typeof benchmark.comparisons[key] === "number" && Number.isFinite(benchmark.comparisons[key]) && benchmark.comparisons[key] > 0)
      || !isPlainData(benchmark.checks)
      || !exactKeys(benchmark.checks, CHECK_KEYS)
      || benchmark.checks.expectedValue !== contract.expectedResult
      || benchmark.checks.exactResults !== benchmark.config.samples * contract.laneIds.length
      || benchmark.checks.failures !== 0
      || !exactDigest(benchmark.evidenceDigest)
      || benchmark.evidenceDigest !== contract.evidenceDigest
      || benchmark.evidenceDigest !== evidenceDigest(benchmark)
      || !isPlainData(provenance)
      || !exactKeys(provenance, PROVENANCE_KEYS)
      || provenance.commit !== contract.slideCommit
      || provenance.dirty !== false
      || typeof provenance.generatedAt !== "string"
      || !Number.isFinite(Date.parse(provenance.generatedAt))
      || !validHost({
        platform: provenance.platform,
        release: provenance.release,
        architecture: provenance.architecture,
        cpu: provenance.cpu,
        node: provenance.node,
      })
      || !sameHost(provenance, contract.host)
      || !sameHost(hostFacts, contract.host)
      || !exactDigest(publication.publicationDigest)
      || publication.publicationDigest !== contract.publicationDigest
      || publication.publicationDigest !== publicationDigest(publication)
    ) return refusal();

    const lane = benchmark.lanes;
    for (let index = 0; index < benchmark.config.samples; index += 1) {
      if (
        lane.sourceTotal.samplesNs[index]
          !== lane.sourcePreparation.samplesNs[index] + lane.sourceDemand.samplesNs[index]
        || lane.slidePreparedTotal.samplesNs[index]
          !== lane.slidePreparation.samplesNs[index] + lane.slideDemand.samplesNs[index]
        || lane.slideEndToEndTotal.samplesNs[index]
          !== lane.slideCompilation.samplesNs[index]
            + lane.slidePreparation.samplesNs[index]
            + lane.slideDemand.samplesNs[index]
      ) return refusal();
    }
    if (
      benchmark.comparisons.slidePreparationVsSourcePreparation
        !== lane.slidePreparation.medianNs / lane.sourcePreparation.medianNs
      || benchmark.comparisons.slideDemandVsSourceDemand
        !== lane.slideDemand.medianNs / lane.sourceDemand.medianNs
      || benchmark.comparisons.slideDemandVsChecked
        !== lane.slideDemand.medianNs / lane.checkedPeer.medianNs
      || benchmark.comparisons.slidePreparedTotalVsSourceTotal
        !== lane.slidePreparedTotal.medianNs / lane.sourceTotal.medianNs
      || benchmark.comparisons.slideEndToEndVsSourceTotal
        !== lane.slideEndToEndTotal.medianNs / lane.sourceTotal.medianNs
    ) return refusal();
    return admitted(publication);
  } catch {
    return refusal();
  }
}

export function sameStableFile(before, after) {
  return before.dev === after.dev
    && before.ino === after.ino
    && before.nlink === after.nlink
    && before.size === after.size
    && before.mtimeNs === after.mtimeNs
    && before.ctimeNs === after.ctimeNs;
}

async function readPinnedJson(path, expectedSha256, maxBytes) {
  const absolute = resolve(path);
  const beforePath = await lstat(absolute, { bigint: true });
  const ceiling = BigInt(maxBytes);
  if (!beforePath.isFile() || beforePath.nlink !== 1n || beforePath.size <= 0n || beforePath.size > ceiling) {
    throw new Error(REFUSAL_ID);
  }
  const handle = await open(absolute, "r");
  let bytes;
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameStableFile(beforePath, before)) throw new Error(REFUSAL_ID);
    const buffer = Buffer.alloc(Number(before.size) + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    const afterPath = await lstat(absolute, { bigint: true });
    if (
      offset !== Number(before.size)
      || offset > maxBytes
      || !sameStableFile(before, after)
      || !sameStableFile(after, afterPath)
    ) throw new Error(REFUSAL_ID);
    bytes = buffer.subarray(0, offset);
  } finally {
    await handle.close();
  }
  if (sha256(bytes) !== expectedSha256) throw new Error(REFUSAL_ID);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error(REFUSAL_ID);
  let text;
  let value;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    throw new Error(REFUSAL_ID);
  }
  if (!isPlainData(value) || text !== `${JSON.stringify(value, null, 2)}\n`) throw new Error(REFUSAL_ID);
  return value;
}

export async function readVerifiedNativeOperationContract() {
  return deepFreeze(await readPinnedJson(CONTRACT_PATH, CONTRACT_SHA256, 65_536));
}

export async function admitVerifiedNativeOperationEvidence(
  inputPath,
  hostFacts = currentHostFacts(),
) {
  if (typeof inputPath !== "string" || inputPath.length === 0 || !validHost(hostFacts)) return refusal();
  try {
    const contract = await readVerifiedNativeOperationContract();
    const publication = await readPinnedJson(
      inputPath,
      contract.evidenceSha256,
      contract.maxEvidenceBytes,
    );
    return verifyVerifiedNativeOperationPublication(publication, contract, hostFacts);
  } catch {
    return refusal();
  }
}
