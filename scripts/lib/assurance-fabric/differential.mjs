import { types as utilTypes } from "node:util";
import { TRIT } from "./result-model.mjs";

const REPORT_KEYS = Object.freeze([
  "authorizing",
  "failed",
  "profile",
  "results",
  "root",
  "schemaVersion",
  "tier",
  "tool",
  "totals",
  "verdict",
]);
const LEGACY_RESULT_KEYS = Object.freeze([
  "detail",
  "durationMs",
  "exitCode",
  "name",
  "ok",
  "processControl",
  "signal",
]);
const LEGACY_VERDICTS = new Set(["PASS", "FAIL", "REPORT_ONLY_PASS", "REPORT_ONLY_FAILED"]);
const LEGACY_TIERS = new Set(["phase-close", "exhaustive"]);

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

function exactArray(value, label) {
  if (!Array.isArray(value) || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${label} must be an ordinary array`);
  }
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

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function optionalExit(value) {
  if (value === null) return Object.freeze({ kind: "absent", reason: "legacy exit code was absent" });
  if (!Number.isSafeInteger(value)) throw new TypeError("legacy exit code must be an integer or null");
  return Object.freeze({ kind: "present", value });
}

function optionalSignal(value) {
  if (value === null) return Object.freeze({ kind: "absent", reason: "legacy signal was absent" });
  return Object.freeze({ kind: "present", value: nonEmptyString(value, "legacy signal") });
}

function validateProfile(value) {
  const profile = exactRecord(value, ["accountedDurationMs", "slowest"], "legacy profile");
  nonNegativeInteger(profile.accountedDurationMs, "legacy profile.accountedDurationMs");
  for (const [index, item] of exactArray(profile.slowest, "legacy profile.slowest").entries()) {
    const fields = exactRecord(item, ["durationMs", "name", "sharePct", "token"], `legacy profile.slowest[${index}]`);
    nonNegativeInteger(fields.durationMs, `legacy profile.slowest[${index}].durationMs`);
    nonEmptyString(fields.name, `legacy profile.slowest[${index}].name`);
    nonEmptyString(fields.token, `legacy profile.slowest[${index}].token`);
    if (typeof fields.sharePct !== "number" || !Number.isFinite(fields.sharePct) || fields.sharePct < 0) {
      throw new TypeError(`legacy profile.slowest[${index}].sharePct must be finite`);
    }
  }
}

function normalizeLegacyResult(value, index) {
  const fields = exactRecord(value, LEGACY_RESULT_KEYS, `legacy results[${index}]`);
  if (typeof fields.ok !== "boolean") throw new TypeError(`legacy results[${index}].ok must be Boolean`);
  nonNegativeInteger(fields.durationMs, `legacy results[${index}].durationMs`);
  nonEmptyString(fields.detail, `legacy results[${index}].detail`);
  const control = exactRecord(
    fields.processControl,
    ["cleanupAttempted", "ownedTree"],
    `legacy results[${index}].processControl`,
  );
  if (typeof control.ownedTree !== "boolean" || typeof control.cleanupAttempted !== "boolean") {
    throw new TypeError(`legacy results[${index}].processControl fields must be Boolean`);
  }
  const id = nonEmptyString(fields.name, `legacy results[${index}].name`);
  return Object.freeze({
    id,
    subjectId: id,
    exitStatus: optionalExit(fields.exitCode),
    signalStatus: optionalSignal(fields.signal),
    processControl: Object.freeze({
      ownedTree: control.ownedTree,
      cleanupAttempted: control.cleanupAttempted,
    }),
  });
}

export function normalizeLegacyReport(value) {
  const fields = exactRecord(value, REPORT_KEYS, "legacy report");
  if (fields.tool !== "run-phase-close" || fields.schemaVersion !== 1) {
    throw new TypeError("legacy report identity or version is invalid");
  }
  nonEmptyString(fields.root, "legacy report.root");
  if (!LEGACY_TIERS.has(fields.tier) || !LEGACY_VERDICTS.has(fields.verdict)) {
    throw new TypeError("legacy report tier or verdict is outside the closed vocabulary");
  }
  if (typeof fields.authorizing !== "boolean") {
    throw new TypeError("legacy report.authorizing must be Boolean");
  }
  const failed = exactArray(fields.failed, "legacy report.failed");
  for (const [index, name] of failed.entries()) nonEmptyString(name, `legacy report.failed[${index}]`);
  const totals = exactRecord(fields.totals, ["checks", "failed", "passed"], "legacy report.totals");
  for (const key of ["checks", "passed", "failed"]) nonNegativeInteger(totals[key], `legacy report.totals.${key}`);
  validateProfile(fields.profile);
  const results = exactArray(fields.results, "legacy report.results").map(normalizeLegacyResult);
  const seen = new Set();
  for (const item of results) {
    if (seen.has(item.id)) throw new TypeError(`legacy report contains duplicate result id ${item.id}`);
    seen.add(item.id);
  }
  if (totals.checks !== results.length || totals.passed + totals.failed !== totals.checks) {
    throw new TypeError("legacy report totals do not conserve");
  }
  return Object.freeze({
    kind: "normalized-legacy-report",
    verdict: fields.verdict,
    legacyClaim: fields.authorizing ? "asserted" : "not-asserted",
    authorizing: false,
    results: Object.freeze(results),
  });
}

function normalizeVariant(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a tagged variant`);
  }
  if (value.kind === "present") {
    if (!(Number.isSafeInteger(value.value) || (typeof value.value === "string" && value.value.length > 0))) {
      throw new TypeError(`${label}.value is invalid`);
    }
    return Object.freeze({ kind: "present", value: value.value });
  }
  if (value.kind === "absent" && typeof value.reason === "string" && value.reason.length > 0) {
    return Object.freeze({ kind: "absent" });
  }
  throw new TypeError(`${label} is outside the closed variant vocabulary`);
}

function normalizeCandidate(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`candidate results[${index}] must be an object`);
  }
  const id = nonEmptyString(value.id, `candidate results[${index}].id`);
  if (!value.result || typeof value.result !== "object") {
    throw new TypeError(`candidate results[${index}].result is required`);
  }
  if (value.result.trit === TRIT.ASSURED || value.authorizing === true || value.result.authorizing === true) {
    throw new TypeError("candidate result attempts positive authority");
  }
  const subjectId = nonEmptyString(value.result.subjectId, `candidate results[${index}].subjectId`);
  const control = value.processControl;
  if (!control || typeof control !== "object"
      || typeof control.ownedTree !== "boolean" || typeof control.cleanupAttempted !== "boolean") {
    throw new TypeError(`candidate results[${index}].processControl is invalid`);
  }
  return Object.freeze({
    id,
    subjectId,
    exitStatus: normalizeVariant(value.exitStatus, `candidate results[${index}].exitStatus`),
    signalStatus: normalizeVariant(value.signalStatus, `candidate results[${index}].signalStatus`),
    processControl: Object.freeze({
      ownedTree: control.ownedTree,
      cleanupAttempted: control.cleanupAttempted,
    }),
  });
}

function comparable(value) {
  return JSON.stringify(value);
}

export function compareResultSets(legacyResults, candidateRunRecords) {
  const legacy = exactArray(legacyResults, "legacy results");
  const candidates = exactArray(candidateRunRecords, "candidate results").map(normalizeCandidate);
  const legacyById = new Map();
  for (const item of legacy) {
    if (!item || typeof item !== "object" || typeof item.id !== "string") {
      throw new TypeError("legacy results must be normalized");
    }
    if (legacyById.has(item.id)) throw new TypeError(`legacy results contain duplicate id ${item.id}`);
    legacyById.set(item.id, item);
  }
  const candidateById = new Map();
  for (const item of candidates) {
    if (candidateById.has(item.id)) throw new TypeError(`candidate results contain duplicate id ${item.id}`);
    candidateById.set(item.id, item);
  }

  const mismatches = [];
  const missingCandidateIds = [];
  for (const [id, legacyItem] of legacyById) {
    const candidate = candidateById.get(id);
    if (!candidate) {
      missingCandidateIds.push(id);
      continue;
    }
    for (const field of ["subjectId", "exitStatus", "signalStatus", "processControl"]) {
      const legacyComparable = field === "exitStatus" || field === "signalStatus"
        ? normalizeVariant(legacyItem[field], `legacy ${id}.${field}`)
        : legacyItem[field];
      if (comparable(legacyComparable) !== comparable(candidate[field])) {
        mismatches.push(Object.freeze({ id, field }));
      }
    }
  }
  const candidateOnlyIds = [...candidateById.keys()].filter((id) => !legacyById.has(id));
  const verdict = mismatches.length > 0
    ? "SHADOW_MISMATCH"
    : missingCandidateIds.length > 0
      ? "SHADOW_UNKNOWN"
      : "SHADOW_AGREEMENT_NON_AUTHORIZING";
  return Object.freeze({
    kind: "comparison",
    verdict,
    authorizing: false,
    mismatches: Object.freeze(mismatches),
    missingCandidateIds: Object.freeze(missingCandidateIds),
    candidateOnlyIds: Object.freeze(candidateOnlyIds),
  });
}
