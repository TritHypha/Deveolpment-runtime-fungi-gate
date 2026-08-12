const KEYS = Object.freeze([
  "schema",
  "origin",
  "phase",
  "state",
  "code",
  "evidenceDigest",
  "authorityReleased",
]);
const ORIGINS = new Set(["GALERINA", "SLIDE"]);
const PHASES = new Set(["CHECK", "ADMISSION", "EXECUTION"]);
const STATES = new Set(["ERROR", "REFUSED", "INDETERMINATE"]);
const CODE = /^[A-Z][A-Z0-9-]{2,127}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const REFUSAL = Object.freeze({ ok: false, code: "ZT-ERROR-ENVELOPE-REFUSED" });

function exactDataObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    if (keys.length !== KEYS.length || keys.some((key, index) => key !== KEYS[index])) return false;
    return keys.every((key) => {
      const descriptor = descriptors[key];
      return descriptor !== undefined
        && Object.hasOwn(descriptor, "value")
        && descriptor.enumerable === true;
    });
  } catch {
    return false;
  }
}

export function validateErrorEnvelope(value) {
  if (!exactDataObject(value)) return REFUSAL;
  try {
    if (value.schema !== "zt.error-envelope.v1"
        || !ORIGINS.has(value.origin)
        || !PHASES.has(value.phase)
        || !STATES.has(value.state)
        || typeof value.code !== "string"
        || !CODE.test(value.code)
        || typeof value.evidenceDigest !== "string"
        || !DIGEST.test(value.evidenceDigest)
        || value.authorityReleased !== false) {
      return REFUSAL;
    }
    return Object.freeze({ ok: true, envelope: value });
  } catch {
    return REFUSAL;
  }
}
