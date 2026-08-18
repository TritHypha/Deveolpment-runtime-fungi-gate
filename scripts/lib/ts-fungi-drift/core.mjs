import { isAbsolute, posix } from "node:path";

export const DRIFT_SCHEMA = "galerina.ts-fungi-drift.v1";
export const DRIFT_TOOL_VERSION = "1.0.0";

const STATUSES = Object.freeze([
  "NO_DRIFT",
  "SOURCE_BYTE_DRIFT",
  "SYMBOL_DRIFT",
  "CANDIDATE_BYTE_DRIFT",
  "CHAIN_DRIFT",
  "UNBOUND",
  "ERROR",
]);
const RUN_CARD_CHAIN_NAMES = Object.freeze(["candidate", "gir", "physical", "profile", "snapshot", "source", "vok"]);

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertCommit(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new TypeError("drift head must be an exact lowercase Git commit");
  }
  return value;
}

function assertRelative(value, label) {
  if (typeof value !== "string"
    || value.length === 0
    || value.includes("\\")
    || isAbsolute(value)
    || /^[A-Za-z]:\//u.test(value)
    || posix.normalize(value) !== value
    || value === ".."
    || value.startsWith("../")) {
    throw new TypeError(`${label} must be a canonical repository-relative path`);
  }
  return value;
}

function assertDigest(value, label, { optional = false } = {}) {
  if (optional && value === undefined) return undefined;
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value)) {
    throw new TypeError(`${label} must be an exact sha256 digest`);
  }
  return value;
}

function canonicalNames(items) {
  return items.map((item) => item.name).sort(codeUnitCompare).join("\n");
}

function assertBinding(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("drift bindings must be records");
  }
  const path = assertRelative(value.path, "candidate path");
  const sourcePath = assertRelative(value.sourcePath, "source path");
  if (typeof value.symbol !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$.]*$/u.test(value.symbol)) {
    throw new TypeError("drift symbol must be one identifier or qualified member");
  }
  if (value.provenance !== "RECONSTRUCTED" && value.provenance !== "RUN_CARD") {
    throw new TypeError("drift provenance must be RECONSTRUCTED or RUN_CARD");
  }
  const symbolPresent = value.symbolPresent === true;
  const chain = Array.isArray(value.chain) ? value.chain.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item) || typeof item.name !== "string" || !/^[a-z][a-z0-9-]*$/u.test(item.name)) {
      throw new TypeError("drift chain entries require a bounded name");
    }
    return Object.freeze({
      name: item.name,
      expectedSha256: assertDigest(item.expectedSha256, `${item.name} expected digest`),
      actualSha256: assertDigest(item.actualSha256, `${item.name} actual digest`),
    });
  }).sort((left, right) => codeUnitCompare(left.name, right.name)) : [];
  if (new Set(chain.map((item) => item.name)).size !== chain.length) throw new TypeError("drift chain contains duplicate names");
  if (chain.some((item) => !RUN_CARD_CHAIN_NAMES.includes(item.name))) throw new TypeError("drift chain contains an unsupported artifact name");
  if (value.provenance === "RUN_CARD"
    && canonicalNames(chain) !== canonicalNames(RUN_CARD_CHAIN_NAMES.map((name) => ({ name })))) {
    throw new TypeError("RUN_CARD drift bindings require source, candidate, snapshot, GIR, physical, profile and VOK digests");
  }
  return Object.freeze({
    path,
    sourcePath,
    symbol: value.symbol,
    provenance: value.provenance,
    candidateRecordedSha256: assertDigest(value.candidateRecordedSha256, "recorded candidate digest"),
    candidateCurrentSha256: assertDigest(value.candidateCurrentSha256, "current candidate digest"),
    sourceRecordedSha256: assertDigest(value.sourceRecordedSha256, "recorded source digest"),
    sourceCurrentSha256: assertDigest(value.sourceCurrentSha256, "current source digest"),
    symbolRecordedFingerprint: assertDigest(value.symbolRecordedFingerprint, "recorded symbol fingerprint", { optional: !symbolPresent }),
    symbolCurrentFingerprint: assertDigest(value.symbolCurrentFingerprint, "current symbol fingerprint", { optional: !symbolPresent }),
    symbolPresent,
    chain: Object.freeze(chain),
  });
}

function statusOf(binding) {
  if (!binding.symbolPresent
    || binding.symbolRecordedFingerprint === undefined
    || binding.symbolCurrentFingerprint === undefined) return "UNBOUND";
  if (binding.candidateRecordedSha256 !== binding.candidateCurrentSha256) return "CANDIDATE_BYTE_DRIFT";
  if (binding.symbolRecordedFingerprint !== binding.symbolCurrentFingerprint) return "SYMBOL_DRIFT";
  if (binding.chain.some((item) => item.expectedSha256 !== item.actualSha256)) return "CHAIN_DRIFT";
  if (binding.sourceRecordedSha256 !== binding.sourceCurrentSha256) return "SOURCE_BYTE_DRIFT";
  return "NO_DRIFT";
}

function entryFor(binding) {
  const status = statusOf(binding);
  return Object.freeze({
    path: binding.path,
    sourcePath: binding.sourcePath,
    symbol: binding.symbol,
    provenance: binding.provenance,
    status,
    sourceChanged: binding.sourceRecordedSha256 !== binding.sourceCurrentSha256,
    symbolChanged: binding.symbolRecordedFingerprint !== binding.symbolCurrentFingerprint,
    candidateChanged: binding.candidateRecordedSha256 !== binding.candidateCurrentSha256,
    chainChanged: binding.chain.some((item) => item.expectedSha256 !== item.actualSha256),
    semanticEquivalenceClaimed: false,
    candidate: Object.freeze({ recordedSha256: binding.candidateRecordedSha256, currentSha256: binding.candidateCurrentSha256 }),
    source: Object.freeze({ recordedSha256: binding.sourceRecordedSha256, currentSha256: binding.sourceCurrentSha256 }),
    symbolFingerprint: Object.freeze({ recordedSha256: binding.symbolRecordedFingerprint, currentSha256: binding.symbolCurrentFingerprint }),
    chain: binding.chain,
  });
}

export function evaluateDriftReport({ head, bindings }) {
  assertCommit(head);
  if (!Array.isArray(bindings)) throw new TypeError("drift bindings must be an array");
  const admitted = bindings.map(assertBinding).sort((left, right) => codeUnitCompare(left.path, right.path));
  if (new Set(admitted.map((item) => item.path)).size !== admitted.length) throw new TypeError("drift bindings contain duplicate candidate paths");
  const entries = admitted.map(entryFor);
  const counts = Object.fromEntries([["total", entries.length], ...STATUSES.map((status) => [status, entries.filter((entry) => entry.status === status).length])]);
  return Object.freeze({
    schema: DRIFT_SCHEMA,
    toolVersion: DRIFT_TOOL_VERSION,
    head,
    counts: Object.freeze(counts),
    entries: Object.freeze(entries),
    authority: Object.freeze({
      semanticEquivalenceClaimed: false,
      productionAuthorityReleased: false,
      consumerSwitched: false,
      typescriptRetired: false,
    }),
  });
}
