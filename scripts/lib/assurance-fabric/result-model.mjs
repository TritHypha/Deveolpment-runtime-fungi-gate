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
const assuranceResults = new WeakSet();
const CLOSED_RELATION = new Map([
  [RESULT_TAG.BLOCKING_PASS, Object.freeze({ trit: TRIT.ASSURED, sources: new Set([SOURCE_CLASS.HOST]) })],
  [RESULT_TAG.BLOCKING_FAIL, Object.freeze({ trit: TRIT.DISTRUSTED, sources: SOURCES })],
  [RESULT_TAG.UNKNOWN, Object.freeze({ trit: TRIT.UNKNOWN, sources: SOURCES })],
  [RESULT_TAG.ADVISORY_FINDINGS, Object.freeze({ trit: TRIT.DISTRUSTED, sources: SOURCES })],
  [RESULT_TAG.INFORMATIONAL, Object.freeze({ trit: TRIT.UNKNOWN, sources: SOURCES })],
  [RESULT_TAG.NOT_APPLICABLE, Object.freeze({ trit: TRIT.UNKNOWN, sources: SOURCES })],
  [RESULT_TAG.REFUSED, Object.freeze({ trit: TRIT.UNKNOWN, sources: SOURCES })],
  [RESULT_TAG.LEGACY_EXIT, Object.freeze({ trit: TRIT.UNKNOWN, sources: new Set([SOURCE_CLASS.LEGACY_EXIT]) })],
]);

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
  const relation = CLOSED_RELATION.get(values.tag);
  if (!relation || relation.trit !== values.trit || !relation.sources.has(values.sourceClass)) {
    throw new TypeError("result tag, source class and trit violate the closed relation");
  }
  const result = Object.freeze(values);
  assuranceResults.add(result);
  return result;
}

export function isAssuranceResult(value) {
  return value !== null && typeof value === "object" && assuranceResults.has(value);
}

export function isBlockingFailure(result) {
  return isAssuranceResult(result)
    && (result.tag === RESULT_TAG.BLOCKING_FAIL || result.tag === RESULT_TAG.REFUSED);
}
