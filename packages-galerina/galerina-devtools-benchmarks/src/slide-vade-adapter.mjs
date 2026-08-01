import { createHash } from "node:crypto";
import { lstat, open } from "node:fs/promises";
import { resolve } from "node:path";
import { types as utilTypes } from "node:util";
import { fileURLToPath } from "node:url";

const MAX_EVIDENCE_BYTES = 1_048_576n;
const CONTRACT_DIGEST = "fdc020e4287a52c45b8d153ce53f57c1b7169a9b33fd239e7b21e769d80c8f5a";
const CONTRACT_PATH = fileURLToPath(
  new URL("../contracts/slide-v2g-vade-admission-v1.json", import.meta.url),
);
const REFUSAL_ID = "GALERINA-SLIDE-VADE-REFUSED";
const MISSING_ID = "GALERINA-SLIDE-VADE-MISSING";

const CONTRACT_KEYS = Object.freeze([
  "schema",
  "receiptSchemaVersion",
  "benchmark",
  "status",
  "receiptSha256",
  "slideCommit",
  "sourceBodyDigest",
  "sourceSemanticDigest",
  "inputDigest",
  "semanticChecksum",
  "refusalChecksum",
  "capsuleDigest",
  "config",
  "laneIds",
  "nonClaims",
  "platform",
  "authorityReleased",
]);
const RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "benchmark",
  "status",
  "authorityReleased",
  "nonClaims",
  "provenance",
  "config",
  "equivalence",
  "laneOrders",
  "lanes",
  "economics",
]);
const PROVENANCE_KEYS = Object.freeze([
  "slide",
  "bodyDigest",
  "semanticDigest",
  "inputDigest",
  "capsule",
  "platform",
  "release",
  "architecture",
  "cpu",
  "node",
]);
const CAPSULE_KEYS = Object.freeze([
  "schema",
  "profileId",
  "sourceBodyDigest",
  "sourceSemanticDigest",
  "preparedPlanEvidenceDigest",
  "scheduleDigest",
  "instructionCount",
  "wasmDigest",
  "wasmByteLength",
  "wasmShapeIdentity",
  "demandContractDigest",
  "dynamicHoleCount",
  "dynamicHoleType",
  "hostClass",
  "processLocal",
  "watUsed",
  "astUsed",
  "galerinaUsed",
  "nativeCertificatePresent",
  "authorityReleased",
]);
const LANE_KEYS = Object.freeze([
  "laneId",
  "checksumClass",
  "operations",
  "samplesNs",
  "checksums",
  "medianNs",
  "minNs",
  "maxNs",
  "medianAbsoluteDeviationNs",
  "operationsPerSecond",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function frozenResult(verdict, status, failureId, contract = null) {
  return Object.freeze({
    verdict,
    status,
    failureId,
    benchmark: verdict === 1 ? contract.benchmark : "",
    receiptDigest: verdict === 1 ? contract.receiptSha256 : "",
    slideCommit: verdict === 1 ? contract.slideCommit : "",
    authorityReleased: false,
  });
}

function refusal() {
  return frozenResult(-1, "REFUSED", REFUSAL_ID);
}

function indeterminate() {
  return frozenResult(0, "INDETERMINATE", MISSING_ID);
}

function admitted(contract) {
  return frozenResult(1, "ADMITTED_NON_AUTHORIZING", "NONE", contract);
}

function exactKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort())
    === JSON.stringify([...expected].sort());
}

function isPlainData(value, seen = new WeakSet()) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
  if (typeof value !== "object" || utilTypes.isProxy(value) || seen.has(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  const array = Array.isArray(value);
  if (prototype !== (array ? Array.prototype : Object.prototype)) return false;
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const descriptorKeys = Object.keys(descriptors);
  if (array) {
    const dataKeys = descriptorKeys.filter((key) => key !== "length");
    if (
      dataKeys.length !== value.length
      || dataKeys.some((key, index) => key !== String(index))
    ) return false;
  }
  for (const key of descriptorKeys) {
    if (array && key === "length") continue;
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined) return false;
    if (!isPlainData(descriptor.value, seen)) return false;
  }
  return Object.getOwnPropertySymbols(value).length === 0;
}

function exactArray(actual, expected) {
  return Array.isArray(actual)
    && Array.isArray(expected)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function positiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function summarize(samples, operations) {
  const medianNs = median(samples);
  return Object.freeze({
    medianNs,
    minNs: Math.min(...samples),
    maxNs: Math.max(...samples),
    medianAbsoluteDeviationNs: median(samples.map((value) => Math.abs(value - medianNs))),
    operationsPerSecond: operations * 1_000_000_000 / medianNs,
  });
}

function expectedLaneOrders(laneIds, count) {
  return Array.from({ length: count }, (_, sample) => {
    const offset = sample % laneIds.length;
    const order = [...laneIds.slice(offset), ...laneIds.slice(0, offset)];
    return sample % 2 === 1 ? order.reverse() : order;
  });
}

function contractIsPinned(contract) {
  if (!isPlainData(contract) || !exactKeys(contract, CONTRACT_KEYS)) return false;
  const canonical = `${JSON.stringify(contract, null, 2)}\n`;
  return sha256(Buffer.from(canonical, "utf8")) === CONTRACT_DIGEST
    && contract.schema === "galerina.slide.vade.admission.v1"
    && contract.authorityReleased === false;
}

function verifyProvenance(receipt, contract) {
  const provenance = receipt.provenance;
  const capsule = provenance?.capsule;
  return isPlainData(provenance)
    && exactKeys(provenance, PROVENANCE_KEYS)
    && isPlainData(provenance.slide)
    && exactKeys(provenance.slide, ["commit", "dirty"])
    && provenance.slide.commit === contract.slideCommit
    && provenance.slide.dirty === false
    && provenance.bodyDigest === contract.sourceBodyDigest
    && provenance.semanticDigest === contract.sourceSemanticDigest
    && provenance.inputDigest === contract.inputDigest
    && provenance.platform === contract.platform.platform
    && provenance.release === contract.platform.release
    && provenance.architecture === contract.platform.architecture
    && provenance.cpu === contract.platform.cpu
    && provenance.node === contract.platform.node
    && isPlainData(capsule)
    && exactKeys(capsule, CAPSULE_KEYS)
    && capsule.schema === "slide.v2g.prepared-capsule.v1"
    && capsule.profileId === "slide.vade.v2g.checked-index.process-local.v1"
    && capsule.sourceBodyDigest === contract.sourceBodyDigest
    && capsule.sourceSemanticDigest === contract.sourceSemanticDigest
    && capsule.hostClass === contract.platform.hostClass
    && capsule.processLocal === true
    && capsule.watUsed === false
    && capsule.astUsed === false
    && capsule.galerinaUsed === false
    && capsule.nativeCertificatePresent === false
    && capsule.authorityReleased === false;
}

function verifyLane(lane, laneId, receipt, contract) {
  if (!isPlainData(lane) || !exactKeys(lane, LANE_KEYS)) return false;
  const refusalLane = laneId === "V2G_REFUSAL";
  const expectedChecksum = refusalLane
    ? contract.refusalChecksum
    : contract.semanticChecksum;
  if (
    lane.laneId !== laneId
    || lane.checksumClass !== (refusalLane ? "REFUSAL" : "SEMANTIC_EQUIVALENCE")
    || lane.operations !== contract.config.operations
    || !Array.isArray(lane.samplesNs)
    || lane.samplesNs.length !== contract.config.samples
    || !lane.samplesNs.every(positiveSafeInteger)
    || !Array.isArray(lane.checksums)
    || lane.checksums.length !== contract.config.samples
    || !lane.checksums.every((checksum) => checksum === expectedChecksum)
  ) return false;
  const summary = summarize(lane.samplesNs, contract.config.operations);
  return lane.medianNs === summary.medianNs
    && lane.minNs === summary.minNs
    && lane.maxNs === summary.maxNs
    && lane.medianAbsoluteDeviationNs === summary.medianAbsoluteDeviationNs
    && lane.operationsPerSecond === summary.operationsPerSecond
    && Number.isFinite(lane.operationsPerSecond)
    && lane.operationsPerSecond > 0
    && receipt.config.operations === lane.operations;
}

function verifyEconomics(receipt) {
  const byId = new Map(receipt.lanes.map((lane) => [lane.laneId, lane]));
  if (byId.size !== receipt.lanes.length) return false;
  const preparationNs = byId.get("V2G_PREPARE")?.medianNs;
  const cleanDemandNs = byId.get("V2D_CLEAN_DEMAND")?.medianNs;
  const verifiedDemandNs = byId.get("V2G_VERIFIED_DEMAND")?.medianNs;
  const warmDemandNs = byId.get("V2F_WARM_DEMAND")?.medianNs;
  if (![preparationNs, cleanDemandNs, verifiedDemandNs, warmDemandNs].every(positiveSafeInteger)) return false;
  const demandSavingsNs = cleanDemandNs - verifiedDemandNs;
  const assuranceCostNs = verifiedDemandNs - warmDemandNs;
  const finite = demandSavingsNs > 0;
  const breakEvenDemandCount = finite
    ? Math.floor(preparationNs / demandSavingsNs) + 1
    : null;
  const economics = receipt.economics;
  return isPlainData(economics)
    && exactKeys(economics, [
      "preparationNs",
      "cleanDemandNs",
      "verifiedDemandNs",
      "demandSavingsNs",
      "assuranceCostNs",
      "breakEvenClass",
      "breakEvenDemandCount",
    ])
    && economics.preparationNs === preparationNs
    && economics.cleanDemandNs === cleanDemandNs
    && economics.verifiedDemandNs === verifiedDemandNs
    && economics.demandSavingsNs === demandSavingsNs
    && economics.assuranceCostNs === assuranceCostNs
    && economics.breakEvenClass === (finite ? "FINITE" : "UNREACHABLE")
    && economics.breakEvenDemandCount === breakEvenDemandCount;
}

export function verifySlideVadeReceipt(receipt, contract) {
  try {
    if (!contractIsPinned(contract) || !isPlainData(receipt) || !exactKeys(receipt, RECEIPT_KEYS)) return refusal();
    if (
      receipt.schemaVersion !== contract.receiptSchemaVersion
      || receipt.benchmark !== contract.benchmark
      || receipt.status !== contract.status
      || receipt.authorityReleased !== false
      || !exactArray(receipt.nonClaims, contract.nonClaims)
      || !isPlainData(receipt.config)
      || !exactKeys(receipt.config, ["seed", "operations", "warmups", "samples"])
      || !Object.keys(contract.config).every((key) => receipt.config[key] === contract.config[key])
      || !verifyProvenance(receipt, contract)
      || !isPlainData(receipt.equivalence)
      || !exactKeys(receipt.equivalence, ["exact", "semanticChecksum", "refusalChecksum", "capsuleDigest"])
      || receipt.equivalence.exact !== true
      || receipt.equivalence.semanticChecksum !== contract.semanticChecksum
      || receipt.equivalence.refusalChecksum !== contract.refusalChecksum
      || receipt.equivalence.capsuleDigest !== contract.capsuleDigest
      || !Array.isArray(receipt.lanes)
      || receipt.lanes.length !== contract.laneIds.length
      || !receipt.lanes.every((lane, index) => verifyLane(lane, contract.laneIds[index], receipt, contract))
    ) return refusal();
    const orders = expectedLaneOrders(contract.laneIds, contract.config.samples);
    if (
      !Array.isArray(receipt.laneOrders)
      || receipt.laneOrders.length !== orders.length
      || !receipt.laneOrders.every((order, index) => exactArray(order, orders[index]))
      || !verifyEconomics(receipt)
    ) return refusal();
    return admitted(contract);
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

async function readPinnedJson(path, digest) {
  const absolute = resolve(path);
  const beforePath = await lstat(absolute, { bigint: true });
  if (!beforePath.isFile() || beforePath.nlink !== 1n || beforePath.size <= 0n || beforePath.size > MAX_EVIDENCE_BYTES) {
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
      || offset > Number(MAX_EVIDENCE_BYTES)
      || !sameStableFile(before, after)
      || !sameStableFile(after, afterPath)
    ) throw new Error(REFUSAL_ID);
    bytes = buffer.subarray(0, offset);
  } finally {
    await handle.close();
  }
  if (sha256(bytes) !== digest) throw new Error(REFUSAL_ID);
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

function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
  }
  return Object.freeze(value);
}

export async function readSlideVadeContract() {
  return deepFreeze(await readPinnedJson(CONTRACT_PATH, CONTRACT_DIGEST));
}

function admittedOptions(options) {
  return isPlainData(options)
    && exactKeys(options, Object.hasOwn(options, "observational") ? ["observational"] : [])
    && (!Object.hasOwn(options, "observational") || typeof options.observational === "boolean");
}

export async function admitSlideVadeEvidence(inputPath, options = {}) {
  if (typeof inputPath !== "string" || inputPath.length === 0 || !admittedOptions(options)) return refusal();
  let contract;
  try {
    contract = await readSlideVadeContract();
    const receipt = await readPinnedJson(inputPath, contract.receiptSha256);
    return verifySlideVadeReceipt(receipt, contract);
  } catch (error) {
    if (options.observational === true && error?.code === "ENOENT") return indeterminate();
    return refusal();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args.length === 2 && args[0] === "--input"
    ? args[1]
    : "";
  const result = await admitSlideVadeEvidence(inputPath);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.verdict !== 1) process.exitCode = 1;
}

const IS_MAIN = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  main().catch(() => {
    process.stdout.write(`${JSON.stringify(refusal(), null, 2)}\n`);
    process.exitCode = 1;
  });
}
