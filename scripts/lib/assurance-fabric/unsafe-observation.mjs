const validatedCandidates = new WeakSet();

const OBSERVATION_KEYS = Object.freeze([
  "analyzerId",
  "authorityCeiling",
  "findings",
  "generatedArtifact",
  "measurements",
  "outcome",
  "schemaVersion",
  "subjectId",
]);
const OUTCOMES = new Set([
  "BLOCKING_FAIL",
  "UNKNOWN",
  "ADVISORY_FINDINGS",
  "INFORMATIONAL",
  "NOT_APPLICABLE",
  "REFUSED",
]);
const FINDING_CLASSES = new Set(["blocking", "advisory"]);
const EVIDENCE_CLASSES = new Set(["observed", "derived", "estimated"]);
const SHA256 = /^sha256:[a-f0-9]{64}$/u;

class ObservationRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new ObservationRefusal(code, detail);
}

function refused(code, detail) {
  return Object.freeze({ kind: "refused", code, detail });
}

function exactRecord(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.getPrototypeOf(value) !== Object.prototype) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", `${label} must be an exact ordinary object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", `${label} cannot contain symbol fields`);
  }
  const actual = ownKeys.map(String).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", `${label} has an unexpected or missing field`);
  }
  const result = {};
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ASSURANCE-OBSERVATION-SHAPE", `${label}.${key} must be an ordinary data field`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactArray(value, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", `${label} must be an ordinary array`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== value.length + 1) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", `${label} cannot contain holes or surplus fields`);
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ASSURANCE-OBSERVATION-SHAPE", `${label}[${index}] must be an ordinary data field`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    refuse("ASSURANCE-OBSERVATION-VALUE", `${label} must be a non-empty string`);
  }
  return value;
}

function enumValue(value, admitted, label) {
  if (!admitted.has(value)) {
    refuse("ASSURANCE-OBSERVATION-VALUE", `${label} is outside the closed vocabulary`);
  }
  return value;
}

function safeInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    refuse("ASSURANCE-OBSERVATION-VALUE", `${label} must be a bounded safe integer`);
  }
  return value;
}

function decodedDuplicateKeys(text) {
  const stack = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "\\") {
          end += 2;
          continue;
        }
        if (text[end] === '"') break;
        end += 1;
      }
      if (end >= text.length) refuse("ASSURANCE-OBSERVATION-JSON", "JSON has an unterminated string");
      const top = stack.at(-1);
      if (top?.kind === "object" && top.expectKey) {
        let key;
        try {
          key = JSON.parse(text.slice(index, end + 1));
        } catch {
          refuse("ASSURANCE-OBSERVATION-JSON", "JSON contains a malformed object key");
        }
        if (top.keys.has(key)) {
          refuse("ASSURANCE-OBSERVATION-DUPLICATE", `JSON repeats decoded key ${JSON.stringify(key)}`);
        }
        top.keys.add(key);
        top.expectKey = false;
      }
      index = end + 1;
      continue;
    }
    if (character === "{") stack.push({ kind: "object", keys: new Set(), expectKey: true });
    else if (character === "[") stack.push({ kind: "array" });
    else if (character === "}" || character === "]") stack.pop();
    else if (character === ",") {
      const top = stack.at(-1);
      if (top?.kind === "object") top.expectKey = true;
    }
    index += 1;
  }
}

function normalizeFinding(value, index) {
  const label = `observation.findings[${index}]`;
  const fields = exactRecord(value, ["authorityClass", "detail", "findingId"], label);
  return {
    findingId: nonEmptyString(fields.findingId, `${label}.findingId`),
    authorityClass: enumValue(fields.authorityClass, FINDING_CLASSES, `${label}.authorityClass`),
    detail: nonEmptyString(fields.detail, `${label}.detail`),
  };
}

function normalizeMeasurement(value, index) {
  const label = `observation.measurements[${index}]`;
  const fields = exactRecord(value, ["evidenceClass", "measurementId", "unit", "value"], label);
  return {
    measurementId: nonEmptyString(fields.measurementId, `${label}.measurementId`),
    value: safeInteger(fields.value, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, `${label}.value`),
    unit: nonEmptyString(fields.unit, `${label}.unit`),
    evidenceClass: enumValue(fields.evidenceClass, EVIDENCE_CLASSES, `${label}.evidenceClass`),
  };
}

function normalizeGeneratedArtifact(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", "observation.generatedArtifact must be an exact object");
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "kind");
  if (!descriptor || !("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined) {
    refuse("ASSURANCE-OBSERVATION-SHAPE", "observation.generatedArtifact.kind must be a data field");
  }
  if (descriptor.value === "absent") {
    const fields = exactRecord(value, ["kind", "reason"], "observation.generatedArtifact");
    return { kind: "absent", reason: nonEmptyString(fields.reason, "observation.generatedArtifact.reason") };
  }
  if (descriptor.value === "present") {
    const fields = exactRecord(
      value,
      ["artifactId", "byteLength", "digest", "kind", "mediaType"],
      "observation.generatedArtifact",
    );
    const digest = nonEmptyString(fields.digest, "observation.generatedArtifact.digest");
    if (!SHA256.test(digest)) {
      refuse("ASSURANCE-OBSERVATION-VALUE", "observation.generatedArtifact.digest must be sha256");
    }
    return {
      kind: "present",
      artifactId: nonEmptyString(fields.artifactId, "observation.generatedArtifact.artifactId"),
      mediaType: nonEmptyString(fields.mediaType, "observation.generatedArtifact.mediaType"),
      byteLength: safeInteger(fields.byteLength, 0, 67_108_864, "observation.generatedArtifact.byteLength"),
      digest,
    };
  }
  refuse("ASSURANCE-OBSERVATION-VALUE", "observation.generatedArtifact.kind is outside the closed vocabulary");
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

function requireUniqueIdentity(values, field, label) {
  const identities = values.map((value) => value[field]);
  if (new Set(identities).size !== identities.length) {
    refuse("ASSURANCE-OBSERVATION-DUPLICATE", `${label} contains a duplicate identity`);
  }
}

function validateObservationText(text, origin) {
  decodedDuplicateKeys(text);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    refuse("ASSURANCE-OBSERVATION-JSON", "observation bytes are not valid JSON");
  }
  const fields = exactRecord(parsed, OBSERVATION_KEYS, "observation");
  if (fields.schemaVersion !== 1) {
    refuse("ASSURANCE-OBSERVATION-VERSION", "observation.schemaVersion must equal 1");
  }
  const analyzerId = nonEmptyString(fields.analyzerId, "observation.analyzerId");
  if (analyzerId !== origin) {
    refuse("ASSURANCE-OBSERVATION-ORIGIN", "observation analyzer identity does not match its byte origin");
  }
  if (fields.authorityCeiling !== -1 && fields.authorityCeiling !== 0) {
    refuse("ASSURANCE-OBSERVATION-AUTHORITY", "analyzer authority ceiling is restricted to -1 or 0");
  }
  const outcome = enumValue(fields.outcome, OUTCOMES, "observation.outcome");
  const findings = exactArray(fields.findings, "observation.findings").map(normalizeFinding);
  const measurements = exactArray(fields.measurements, "observation.measurements").map(normalizeMeasurement);
  requireUniqueIdentity(findings, "findingId", "observation.findings");
  requireUniqueIdentity(measurements, "measurementId", "observation.measurements");
  if (outcome === "ADVISORY_FINDINGS"
      && !findings.some((finding) => finding.authorityClass === "advisory")) {
    refuse("ASSURANCE-OBSERVATION-CONSISTENCY", "ADVISORY_FINDINGS requires an advisory finding");
  }
  if (outcome === "BLOCKING_FAIL"
      && !findings.some((finding) => finding.authorityClass === "blocking")) {
    refuse("ASSURANCE-OBSERVATION-CONSISTENCY", "BLOCKING_FAIL requires a blocking finding");
  }
  const candidate = deepFreeze({
    schemaVersion: 1,
    analyzerId,
    subjectId: nonEmptyString(fields.subjectId, "observation.subjectId"),
    outcome,
    authorityCeiling: fields.authorityCeiling,
    findings,
    measurements,
    generatedArtifact: normalizeGeneratedArtifact(fields.generatedArtifact),
  });
  validatedCandidates.add(candidate);
  return candidate;
}

export function isValidatedObservationCandidate(value) {
  return value !== null && typeof value === "object" && validatedCandidates.has(value);
}

export function createUnsafeObservationIntake({ maxBytes }) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 67_108_864) {
    throw new RangeError("maxBytes must be a bounded positive safe integer");
  }
  const unsafe = new WeakMap();

  function capture(bytes, origin) {
    if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
      throw new TypeError("boundary input must be bytes");
    }
    if (typeof origin !== "string" || origin.length === 0) {
      throw new TypeError("origin is required");
    }
    const copy = Buffer.from(bytes);
    if (copy.byteLength > maxBytes) {
      throw new RangeError("boundary bytes exceed the admitted limit");
    }
    const handle = Object.freeze(Object.create(null));
    unsafe.set(handle, Object.freeze({ bytes: copy, origin, transforms: Object.freeze([]) }));
    return handle;
  }

  function derive(handle, transformId, transform) {
    const state = unsafe.get(handle);
    if (!state) throw new TypeError("unsafe handle is foreign or forged");
    if (typeof transformId !== "string" || transformId.length === 0 || typeof transform !== "function") {
      throw new TypeError("derived transform requires an identity and function");
    }
    const derived = transform(Buffer.from(state.bytes));
    if (!Buffer.isBuffer(derived)) throw new TypeError("unsafe transform must return a Buffer");
    const next = capture(derived, state.origin);
    unsafe.set(next, Object.freeze({
      bytes: Buffer.from(derived),
      origin: state.origin,
      transforms: Object.freeze([...state.transforms, transformId]),
    }));
    return next;
  }

  function stateOf(handle) {
    return unsafe.has(handle) ? "boundary-untrusted" : "foreign";
  }

  function validate(handle) {
    const state = unsafe.get(handle);
    if (!state) return refused("ASSURANCE-OBSERVATION-FOREIGN", "unsafe handle is foreign or forged");
    try {
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(state.bytes);
      } catch {
        refuse("ASSURANCE-OBSERVATION-UTF8", "observation bytes are not canonical UTF-8");
      }
      const candidate = validateObservationText(text, state.origin);
      return Object.freeze({ kind: "accepted", value: candidate });
    } catch (error) {
      if (error instanceof ObservationRefusal) return refused(error.code, error.message);
      return refused("ASSURANCE-OBSERVATION-INVALID", "observation validation refused an unclassified input");
    }
  }

  return Object.freeze({ capture, derive, stateOf, validate });
}
