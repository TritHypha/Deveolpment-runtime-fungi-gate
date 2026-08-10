import { types as utilTypes } from "node:util";

export const TRIT = Object.freeze({
  DISTRUSTED: -1,
  UNKNOWN: 0,
  ASSURED: 1,
});

export const RESULT_TAG = Object.freeze({
  BLOCKING_PASS: "BLOCKING_PASS",
  BLOCKING_FAIL: "BLOCKING_FAIL",
  UNKNOWN: "UNKNOWN",
  ADVISORY_FINDINGS: "ADVISORY_FINDINGS",
  INFORMATIONAL: "INFORMATIONAL",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  REFUSED: "REFUSED",
  LEGACY_EXIT: "LEGACY_EXIT",
});

export const SOURCE_CLASS = Object.freeze({
  ANALYZER: "analyzer",
  HOST: "host",
  LEGACY_EXIT: "legacy-exit",
});

const TRITS = new Set(Object.values(TRIT));
const TAGS = new Set(Object.values(RESULT_TAG));
const SOURCES = new Set(Object.values(SOURCE_CLASS));
const EXACT_KEYS = Object.freeze(["detail", "sourceClass", "subjectId", "tag", "trit"]);

export function foldRequiredTrits(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("required trits must be a non-empty array");
  }
  if (values.some((value) => !TRITS.has(value))) {
    throw new TypeError("every value must belong to the closed trit domain");
  }
  return Math.min(...values);
}

export function makeAssuranceResult(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || utilTypes.isProxy(input)
      || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new TypeError("result must be an exact ordinary object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new TypeError("result fields must match the closed schema");
  }
  const keys = ownKeys.map(String).sort();
  if (keys.length !== EXACT_KEYS.length || keys.some((key, index) => key !== EXACT_KEYS[index])) {
    throw new TypeError("result fields must match the closed schema");
  }
  const values = {};
  for (const key of EXACT_KEYS) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError("result fields must be ordinary data fields");
    }
    values[key] = descriptor.value;
  }
  if (!TAGS.has(values.tag) || !TRITS.has(values.trit) || !SOURCES.has(values.sourceClass)) {
    throw new TypeError("result tag/trit/source class is invalid");
  }
  if (![values.sourceClass, values.subjectId, values.detail]
    .every((value) => typeof value === "string" && value.length > 0)) {
    throw new TypeError("result strings must be non-empty");
  }
  if (values.sourceClass === SOURCE_CLASS.ANALYZER
      && (values.tag === RESULT_TAG.BLOCKING_PASS || values.trit === TRIT.ASSURED)) {
    throw new TypeError("BLOCKING_PASS and +1 are host-derived only");
  }
  return Object.freeze(values);
}

export function isBlockingFailure(result) {
  return result.tag === RESULT_TAG.BLOCKING_FAIL || result.tag === RESULT_TAG.REFUSED;
}
