import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";
import { TRIT, foldRequiredTrits } from "./result-model.mjs";
import { isValidatedObservationCandidate } from "./unsafe-observation.mjs";

const CONFIG_KEYS = Object.freeze(["abi", "buildPoint", "policyDigest", "profileId", "subjects", "target"]);
const SUBJECT_KEYS = Object.freeze(["digest", "subjectId"]);
const CONTEXT_KEYS = Object.freeze(["abi", "buildPoint", "policyDigest", "target"]);
const ENVELOPE_KEYS = Object.freeze([
  "abi",
  "buildPoint",
  "capabilityDigest",
  "componentDigest",
  "dependencyClosureDigest",
  "epoch",
  "evidenceSetDigest",
  "policyDigest",
  "schemaVersion",
  "target",
]);
const COORDINATE_KEYS = Object.freeze(["authority", "component", "data"]);
const TERMINAL_OUTCOMES = new Set(["CONSUMED", "REFUSED", "FAILED", "UNKNOWN"]);
const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const BUILD_POINT = /^git:[a-f0-9]{40}$/u;

export function canonicalValue(value, state = { nodes: 0 }, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 4096 || depth > 64) {
    throw new RangeError("canonical state exceeds structural bounds");
  }
  if (value === null || value === undefined) {
    throw new TypeError("canonical state forbids absence sentinels");
  }
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError("canonical numbers must be safe integers");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new TypeError("canonical arrays require ordinary exact objects");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") || keys.length !== value.length + 1) {
      throw new TypeError("canonical arrays cannot contain holes or surplus fields");
    }
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
          || descriptor.get !== undefined || descriptor.set !== undefined) {
        throw new TypeError("canonical array entries must be ordinary enumerable data fields");
      }
      result.push(canonicalValue(descriptor.value, state, depth + 1));
    }
    return result;
  }
  if (typeof value !== "object" || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("canonical records must be ordinary exact objects");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) {
    throw new TypeError("canonical records cannot contain symbol keys");
  }
  const result = Object.create(null);
  for (const key of keys.map(String).sort()) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError("canonical record fields must be ordinary enumerable data fields");
    }
    Object.defineProperty(result, key, {
      value: canonicalValue(descriptor.value, state, depth + 1),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return result;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function framedDigest(domain, value) {
  if (typeof domain !== "string" || domain.length === 0) {
    throw new TypeError("digest domain must be a non-empty string");
  }
  const canonical = canonicalJson(value);
  return `sha256:${createHash("sha256")
    .update(`${domain.length}:${domain}${Buffer.byteLength(canonical)}:${canonical}`, "utf8")
    .digest("hex")}`;
}

function exactRecord(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be an exact ordinary object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new TypeError(`${label} cannot contain symbol fields`);
  }
  const actual = ownKeys.map(String).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has unexpected or missing fields`);
  }
  const result = {};
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError(`${label}.${key} must be an ordinary data field`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactArray(value, label, minimum = 0) {
  if (!Array.isArray(value) || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${label} must be an ordinary array`);
  }
  if (value.length < minimum) throw new TypeError(`${label} must not be empty`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string") || keys.length !== value.length + 1) {
    throw new TypeError(`${label} cannot contain holes or surplus fields`);
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError(`${label}[${index}] must be an ordinary data field`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function digest(value, label) {
  const normalized = nonEmptyString(value, label);
  if (!SHA256.test(normalized)) throw new TypeError(`${label} must be a lowercase sha256 digest`);
  return normalized;
}

function buildPoint(value, label) {
  const normalized = nonEmptyString(value, label);
  if (!BUILD_POINT.test(normalized)) throw new TypeError(`${label} must be an exact Git build point`);
  return normalized;
}

function makeOpaqueHandle() {
  return Object.freeze(Object.create(null));
}

function cloneConfig(value) {
  const fields = exactRecord(value, CONFIG_KEYS, "host config");
  const subjects = exactArray(fields.subjects, "host config.subjects", 1).map((subject, index) => {
    const item = exactRecord(subject, SUBJECT_KEYS, `host config.subjects[${index}]`);
    return Object.freeze({
      subjectId: nonEmptyString(item.subjectId, `host config.subjects[${index}].subjectId`),
      digest: digest(item.digest, `host config.subjects[${index}].digest`),
    });
  });
  const subjectIds = subjects.map((subject) => subject.subjectId);
  const subjectDigests = subjects.map((subject) => subject.digest);
  if (new Set(subjectIds).size !== subjectIds.length || new Set(subjectDigests).size !== subjectDigests.length) {
    throw new TypeError("host config subjects must have unique identities and digests");
  }
  return Object.freeze({
    profileId: nonEmptyString(fields.profileId, "host config.profileId"),
    policyDigest: digest(fields.policyDigest, "host config.policyDigest"),
    target: nonEmptyString(fields.target, "host config.target"),
    abi: nonEmptyString(fields.abi, "host config.abi"),
    buildPoint: buildPoint(fields.buildPoint, "host config.buildPoint"),
    subjects: Object.freeze(subjects),
  });
}

function cloneContext(value, label = "host context") {
  const fields = exactRecord(value, CONTEXT_KEYS, label);
  return Object.freeze({
    policyDigest: digest(fields.policyDigest, `${label}.policyDigest`),
    target: nonEmptyString(fields.target, `${label}.target`),
    abi: nonEmptyString(fields.abi, `${label}.abi`),
    buildPoint: buildPoint(fields.buildPoint, `${label}.buildPoint`),
  });
}

function cloneEnvelope(value) {
  const fields = exactRecord(value, ENVELOPE_KEYS, "Envelope");
  if (fields.schemaVersion !== 1) throw new TypeError("Envelope.schemaVersion must equal 1");
  if (!Number.isSafeInteger(fields.epoch) || fields.epoch < 1) {
    throw new TypeError("Envelope.epoch must be a positive safe integer");
  }
  return Object.freeze({
    schemaVersion: 1,
    componentDigest: digest(fields.componentDigest, "Envelope.componentDigest"),
    policyDigest: digest(fields.policyDigest, "Envelope.policyDigest"),
    target: nonEmptyString(fields.target, "Envelope.target"),
    abi: nonEmptyString(fields.abi, "Envelope.abi"),
    dependencyClosureDigest: digest(fields.dependencyClosureDigest, "Envelope.dependencyClosureDigest"),
    capabilityDigest: digest(fields.capabilityDigest, "Envelope.capabilityDigest"),
    buildPoint: buildPoint(fields.buildPoint, "Envelope.buildPoint"),
    epoch: fields.epoch,
    evidenceSetDigest: digest(fields.evidenceSetDigest, "Envelope.evidenceSetDigest"),
  });
}

function cloneCoordinates(value) {
  const fields = exactRecord(value, COORDINATE_KEYS, "admission coordinates");
  const coordinates = [fields.data, fields.component, fields.authority];
  foldRequiredTrits(coordinates);
  return Object.freeze({ data: fields.data, component: fields.component, authority: fields.authority });
}

function absentSealState(value) {
  try {
    const fields = exactRecord(value, ["kind", "reason"], "missing seal state");
    return fields.kind === "absent" && typeof fields.reason === "string" && fields.reason.length > 0;
  } catch {
    return false;
  }
}

export function createPrivateAssuranceHost(inputConfig) {
  const config = cloneConfig(inputConfig);
  const subjectById = new Map(config.subjects.map((subject) => [subject.subjectId, subject]));
  const subjectByDigest = new Map(config.subjects.map((subject) => [subject.digest, subject]));
  const revokedSubjects = new Set();
  const admissions = new WeakMap();
  const leases = new WeakMap();
  const pendingObservations = new WeakMap();
  const seals = new WeakMap();
  const signet = Object.freeze(Object.create(null));
  let epoch = 1;
  let currentContext = Object.freeze({
    policyDigest: config.policyDigest,
    target: config.target,
    abi: config.abi,
    buildPoint: config.buildPoint,
  });

  function currentContextDigest() {
    return framedDigest("galerina.assurance.context.v1", { ...currentContext, epoch });
  }

  function currentProfileDigest() {
    return framedDigest("galerina.assurance.profile.v1", {
      profileId: config.profileId,
      context: { ...currentContext, epoch },
      subjects: config.subjects,
    });
  }

  function subject(subjectId) {
    const declared = subjectById.get(nonEmptyString(subjectId, "subjectId"));
    if (!declared) throw new TypeError("subject is undeclared");
    return declared;
  }

  function submit(candidate) {
    if (!isValidatedObservationCandidate(candidate)) {
      throw new TypeError("submit requires a validated observation candidate");
    }
    if (!subjectById.has(candidate.subjectId)) {
      throw new TypeError("observation subject is undeclared");
    }
    if (revokedSubjects.has(candidate.subjectId)) {
      throw new TypeError("observation subject is revoked");
    }
    const handle = makeOpaqueHandle();
    pendingObservations.set(handle, Object.freeze({
      signet,
      candidate,
      contextDigest: currentContextDigest(),
      authorityCeiling: candidate.authorityCeiling,
    }));
    return handle;
  }

  function admit(value, coordinateValue) {
    const admittedEnvelope = cloneEnvelope(value);
    const coordinates = cloneCoordinates(coordinateValue);
    const coordinateFold = foldRequiredTrits([
      coordinates.data,
      coordinates.component,
      coordinates.authority,
    ]);
    if (coordinateFold !== TRIT.ASSURED) {
      throw new TypeError("admission coordinates do not authorize this exact context");
    }
    if (admittedEnvelope.policyDigest !== currentContext.policyDigest
        || admittedEnvelope.target !== currentContext.target
        || admittedEnvelope.abi !== currentContext.abi
        || admittedEnvelope.buildPoint !== currentContext.buildPoint
        || admittedEnvelope.epoch !== epoch) {
      throw new TypeError("Envelope does not match the current host context");
    }
    const declaredSubject = subjectByDigest.get(admittedEnvelope.componentDigest);
    if (!declaredSubject || revokedSubjects.has(declaredSubject.subjectId)) {
      throw new TypeError("Envelope subject is undeclared or revoked");
    }
    const handle = makeOpaqueHandle();
    admissions.set(handle, Object.freeze({
      signet,
      subjectId: declaredSubject.subjectId,
      envelopeDigest: framedDigest("galerina.assurance.envelope.v1", admittedEnvelope),
      profileDigest: currentProfileDigest(),
      contextDigest: currentContextDigest(),
    }));
    return handle;
  }

  function openLease(handle) {
    const admission = admissions.get(handle);
    if (!admission || admission.signet !== signet) {
      throw new TypeError("admitted handle is foreign or consumed");
    }
    admissions.delete(handle);
    if (admission.contextDigest !== currentContextDigest()) {
      throw new TypeError("admitted handle refused after context drift");
    }
    if (revokedSubjects.has(admission.subjectId)) {
      throw new TypeError("admitted handle subject is revoked");
    }
    const lease = makeOpaqueHandle();
    leases.set(lease, admission);
    return lease;
  }

  function consumeLease(handle, terminalOutcome) {
    const lease = leases.get(handle);
    if (!lease || lease.signet !== signet) {
      throw new TypeError("lease handle is foreign or consumed");
    }
    leases.delete(handle);
    if (lease.contextDigest !== currentContextDigest()) {
      throw new TypeError("lease refused after context drift");
    }
    if (revokedSubjects.has(lease.subjectId)) {
      throw new TypeError("lease subject is revoked");
    }
    if (!TERMINAL_OUTCOMES.has(terminalOutcome)) {
      throw new TypeError("terminal outcome is outside the closed vocabulary");
    }
    const seal = Object.freeze({
      schemaVersion: 1,
      kind: "WAX_SEAL",
      envelopeDigest: lease.envelopeDigest,
      profileDigest: lease.profileDigest,
      terminalOutcome,
      authentication: "UNAUTHENTICATED_REFERENCE",
      authorizing: false,
      replayable: false,
    });
    seals.set(seal, Object.freeze({
      signet,
      subjectId: lease.subjectId,
      contextDigest: lease.contextDigest,
      sealDigest: framedDigest("galerina.assurance.wax-seal.v1", seal),
    }));
    return seal;
  }

  function classifySeal(value, expectedSubjectId) {
    const subjectId = nonEmptyString(expectedSubjectId, "expectedSubjectId");
    if (absentSealState(value)) return TRIT.UNKNOWN;
    const state = seals.get(value);
    if (!state || state.signet !== signet) return TRIT.DISTRUSTED;
    if (state.subjectId !== subjectId || revokedSubjects.has(subjectId)
        || state.contextDigest !== currentContextDigest()) return TRIT.DISTRUSTED;
    if (state.sealDigest !== framedDigest("galerina.assurance.wax-seal.v1", value)) {
      return TRIT.DISTRUSTED;
    }
    return TRIT.ASSURED;
  }

  function revokeSubject(subjectId) {
    const declared = subject(nonEmptyString(subjectId, "subjectId"));
    revokedSubjects.add(declared.subjectId);
  }

  function rotateContext(value) {
    const next = cloneContext(value, "next host context");
    if (epoch === Number.MAX_SAFE_INTEGER) throw new RangeError("host context epoch is exhausted");
    currentContext = next;
    epoch += 1;
    return Object.freeze({ ...currentContext, epoch });
  }

  const analyzerApi = Object.freeze({ subject, submit });
  const hostApi = Object.freeze({
    admit,
    openLease,
    consumeLease,
    classifySeal,
    revokeSubject,
    rotateContext,
  });
  return Object.freeze({ analyzerApi, hostApi });
}
