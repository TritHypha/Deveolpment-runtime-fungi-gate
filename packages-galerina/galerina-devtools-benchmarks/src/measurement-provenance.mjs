import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

const UTC_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const HEX_40 = /^[0-9a-f]{40}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
const RECORD_KEYS = Object.freeze([
  "galerinaCommit",
  "measuredAt",
  "resultSha256",
  "schemaVersion",
  "slideCommit",
  "toolchains",
]);
const TOOLCHAIN_KEYS = Object.freeze(["go", "node", "python", "rust"]);

function plainRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || utilTypes.isProxy(value)) {
    throw new TypeError(`${label} must be a plain non-proxy object`);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const actual = Object.keys(value).sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== keys[index])) {
    throw new TypeError(`${label} must contain exact keys: ${keys.join(", ")}`);
  }
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be non-empty text`);
  }
  return value;
}

function resultDigest(resultRaw) {
  requiredText(resultRaw, "resultRaw");
  return createHash("sha256").update(resultRaw, "utf8").digest("hex");
}

export function validateMeasurementRecord(value, resultRaw) {
  const record = plainRecord(value, "measurement provenance");
  exactKeys(record, RECORD_KEYS, "measurement provenance");
  if (record.schemaVersion !== 1) throw new TypeError("schemaVersion must be 1");
  if (!UTC_STAMP.test(record.measuredAt)) throw new TypeError("measuredAt must be a UTC ISO timestamp");
  if (!HEX_64.test(record.resultSha256)) throw new TypeError("resultSha256 must be a lowercase SHA-256 digest");
  if (record.resultSha256 !== resultDigest(resultRaw)) throw new TypeError("resultSha256 does not match resultRaw");
  if (!HEX_40.test(record.galerinaCommit)) throw new TypeError("galerinaCommit must be a lowercase Git commit");
  if (!HEX_40.test(record.slideCommit)) throw new TypeError("slideCommit must be a lowercase Git commit");

  const toolchains = plainRecord(record.toolchains, "toolchains");
  exactKeys(toolchains, TOOLCHAIN_KEYS, "toolchains");
  for (const key of TOOLCHAIN_KEYS) requiredText(toolchains[key], `toolchains.${key}`);

  return Object.freeze({
    schemaVersion: 1,
    measuredAt: record.measuredAt,
    resultSha256: record.resultSha256,
    galerinaCommit: record.galerinaCommit,
    slideCommit: record.slideCommit,
    toolchains: Object.freeze({
      go: toolchains.go,
      node: toolchains.node,
      python: toolchains.python,
      rust: toolchains.rust,
    }),
  });
}

export function buildMeasurementRecord({
  measuredAt,
  resultRaw,
  galerinaCommit,
  slideCommit,
  toolchains,
}) {
  const candidate = {
    schemaVersion: 1,
    measuredAt,
    resultSha256: resultDigest(resultRaw),
    galerinaCommit,
    slideCommit,
    toolchains,
  };
  return validateMeasurementRecord(candidate, resultRaw);
}
