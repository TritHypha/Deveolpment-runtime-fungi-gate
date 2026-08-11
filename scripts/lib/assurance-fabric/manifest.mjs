import { isAbsolute, relative, resolve } from "node:path";
import { types as utilTypes } from "node:util";

const ROOT_KEYS = Object.freeze(["entries", "schemaVersion"]);
const ENTRY_KEYS = Object.freeze([
  "authorityClass",
  "cadences",
  "cwd",
  "execution",
  "generatedOutputs",
  "id",
  "lifecycle",
  "maxOutputBytes",
  "mutationPolicy",
  "outcomePolicy",
  "platforms",
  "predecessors",
  "requirementId",
  "satisfies",
  "selfTest",
  "subjects",
  "timeoutMs",
  "toolClass",
]);

const TOOL_CLASSES = new Set(["analyzer", "generator", "test-runner", "verifier", "legacy-oracle"]);
const AUTHORITY_CLASSES = new Set(["blocking", "advisory", "informational", "legacy-oracle", "not-applicable"]);
const CADENCES = new Set(["changed", "normal", "nightly", "exhaustive", "release", "on-demand"]);
const OUTCOME_POLICIES = new Set(["blocking", "advisory", "informational", "legacy-exit"]);
const SUBJECT_KINDS = new Set(["files", "packages", "requirements"]);
const MUTATION_POLICIES = new Set(["read-only", "declared-outputs"]);
const PLATFORMS = new Set(["win32", "linux", "darwin"]);
const OVERLAPS = new Set(["canonical", "overlap", "replacement-candidate"]);
const RETIREMENTS = new Set(["active", "shadow", "retirement-candidate", "retired"]);
const BUILTIN_EXECUTABLES = new Set(["node", "npm", "git", "cargo"]);
const RECEIPT_VERIFIERS = new Set(["graph-all-semantic-v1"]);
const SHELL_METACHARACTERS = /[;&|`$<>\u0000\r\n]/u;
const WINDOWS_DRIVE_RELATIVE = /^[A-Za-z]:/u;
const acceptedManifests = new WeakSet();
const acceptedEntries = new WeakSet();

class ManifestRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new ManifestRefusal(code, detail);
}

function recordDescriptors(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label} must be an exact ordinary object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label} cannot contain symbol fields`);
  }
  return descriptors;
}

function exactRecord(value, expectedKeys, label) {
  const descriptors = recordDescriptors(value, label);
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label} has an unexpected or missing field`);
  }
  const result = {};
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ASSURANCE-MANIFEST-SHAPE", `${label}.${key} must be an ordinary enumerable data field`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactArray(value, label, minimum = 0) {
  if (!Array.isArray(value) || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label} must be an ordinary array`);
  }
  if (value.length < minimum) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label} must contain at least ${minimum} item(s)`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== value.length + 1) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label} cannot contain holes or surplus fields`);
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ASSURANCE-MANIFEST-SHAPE", `${label}[${index}] must be an ordinary data field`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    refuse("ASSURANCE-MANIFEST-VALUE", `${label} must be a non-empty string`);
  }
  return value;
}

function enumValue(value, admitted, label) {
  if (!admitted.has(value)) {
    refuse("ASSURANCE-MANIFEST-VALUE", `${label} is outside the closed vocabulary`);
  }
  return value;
}

function boundedInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    refuse("ASSURANCE-MANIFEST-BOUNDS", `${label} must be a bounded safe integer`);
  }
  return value;
}

function uniqueStrings(value, label, minimum = 0, admitted) {
  const items = exactArray(value, label, minimum).map((item, index) => {
    const normalized = nonEmptyString(item, `${label}[${index}]`);
    return admitted ? enumValue(normalized, admitted, `${label}[${index}]`) : normalized;
  });
  if (new Set(items).size !== items.length) {
    refuse("ASSURANCE-MANIFEST-DUPLICATE", `${label} contains a duplicate value`);
  }
  return items;
}

function isInside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../"));
}

function repositoryPath(value, root, label) {
  const path = nonEmptyString(value, label);
  if (isAbsolute(path) || WINDOWS_DRIVE_RELATIVE.test(path)) {
    refuse("ASSURANCE-MANIFEST-PATH", `${label} must be repository-relative`);
  }
  const target = resolve(root, path);
  if (!isInside(root, target)) {
    refuse("ASSURANCE-MANIFEST-PATH", `${label} escapes the repository root`);
  }
  return path;
}

function command(value, root, label) {
  const tokens = exactArray(value, label, 1).map((token, index) => {
    const normalized = nonEmptyString(token, `${label}[${index}]`);
    if (SHELL_METACHARACTERS.test(normalized)) {
      refuse("ASSURANCE-MANIFEST-COMMAND", `${label}[${index}] contains shell metacharacters`);
    }
    return normalized;
  });
  const executable = tokens[0];
  if (!BUILTIN_EXECUTABLES.has(executable)) {
    repositoryPath(executable, root, `${label}[0]`);
  }
  return tokens;
}

function optionalId(value, label) {
  const descriptors = recordDescriptors(value, label);
  const kindDescriptor = descriptors.kind;
  if (!kindDescriptor || !("value" in kindDescriptor) || kindDescriptor.get !== undefined
      || kindDescriptor.set !== undefined) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label}.kind must be an ordinary data field`);
  }
  if (kindDescriptor.value === "absent") {
    const fields = exactRecord(value, ["kind", "reason"], label);
    return { kind: "absent", reason: nonEmptyString(fields.reason, `${label}.reason`) };
  }
  if (kindDescriptor.value === "present") {
    const fields = exactRecord(value, ["kind", "value"], label);
    return { kind: "present", value: nonEmptyString(fields.value, `${label}.value`) };
  }
  refuse("ASSURANCE-MANIFEST-VALUE", `${label}.kind is outside the closed vocabulary`);
}

function selfTest(value, root, label) {
  const descriptors = recordDescriptors(value, label);
  const kindDescriptor = descriptors.kind;
  if (!kindDescriptor || !("value" in kindDescriptor) || kindDescriptor.get !== undefined
      || kindDescriptor.set !== undefined) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label}.kind must be an ordinary data field`);
  }
  if (kindDescriptor.value === "absent") {
    const fields = exactRecord(value, ["kind", "reason"], label);
    return { kind: "absent", reason: nonEmptyString(fields.reason, `${label}.reason`) };
  }
  if (kindDescriptor.value === "present") {
    const fields = exactRecord(value, ["command", "kind", "plantedDefectId"], label);
    return {
      kind: "present",
      command: command(fields.command, root, `${label}.command`),
      plantedDefectId: nonEmptyString(fields.plantedDefectId, `${label}.plantedDefectId`),
    };
  }
  refuse("ASSURANCE-MANIFEST-VALUE", `${label}.kind is outside the closed vocabulary`);
}

function execution(value, root, label) {
  const descriptors = recordDescriptors(value, label);
  const kindDescriptor = descriptors.kind;
  if (!kindDescriptor || !("value" in kindDescriptor) || kindDescriptor.get !== undefined
      || kindDescriptor.set !== undefined) {
    refuse("ASSURANCE-MANIFEST-SHAPE", `${label}.kind must be an ordinary data field`);
  }
  if (kindDescriptor.value === "process") {
    const fields = exactRecord(value, ["command", "kind"], label);
    return {
      kind: "process",
      command: command(fields.command, root, `${label}.command`),
    };
  }
  if (kindDescriptor.value === "predecessor-receipt") {
    const fields = exactRecord(value, ["kind", "predecessorId", "verifierId"], label);
    return {
      kind: "predecessor-receipt",
      predecessorId: nonEmptyString(fields.predecessorId, `${label}.predecessorId`),
      verifierId: enumValue(fields.verifierId, RECEIPT_VERIFIERS, `${label}.verifierId`),
    };
  }
  refuse("ASSURANCE-MANIFEST-VALUE", `${label}.kind is outside the closed vocabulary`);
}

function cloneEntry(value, root, index) {
  const label = `entries[${index}]`;
  const fields = exactRecord(value, ENTRY_KEYS, label);
  const subjects = exactRecord(fields.subjects, ["expectedCount", "kind", "values"], `${label}.subjects`);
  const lifecycle = exactRecord(fields.lifecycle, ["overlap", "replacementId", "retirement"], `${label}.lifecycle`);
  const generatedOutputs = uniqueStrings(fields.generatedOutputs, `${label}.generatedOutputs`)
    .map((path) => repositoryPath(path, root, `${label}.generatedOutputs`));
  return {
    id: nonEmptyString(fields.id, `${label}.id`),
    requirementId: nonEmptyString(fields.requirementId, `${label}.requirementId`),
    satisfies: uniqueStrings(fields.satisfies, `${label}.satisfies`, 1),
    execution: execution(fields.execution, root, `${label}.execution`),
    cwd: repositoryPath(fields.cwd, root, `${label}.cwd`),
    toolClass: enumValue(fields.toolClass, TOOL_CLASSES, `${label}.toolClass`),
    authorityClass: enumValue(fields.authorityClass, AUTHORITY_CLASSES, `${label}.authorityClass`),
    cadences: uniqueStrings(fields.cadences, `${label}.cadences`, 1, CADENCES),
    outcomePolicy: enumValue(fields.outcomePolicy, OUTCOME_POLICIES, `${label}.outcomePolicy`),
    subjects: {
      kind: enumValue(subjects.kind, SUBJECT_KINDS, `${label}.subjects.kind`),
      values: uniqueStrings(subjects.values, `${label}.subjects.values`, 1),
      expectedCount: boundedInteger(subjects.expectedCount, 1, Number.MAX_SAFE_INTEGER, `${label}.subjects.expectedCount`),
    },
    timeoutMs: boundedInteger(fields.timeoutMs, 1, 3_600_000, `${label}.timeoutMs`),
    maxOutputBytes: boundedInteger(fields.maxOutputBytes, 1, 67_108_864, `${label}.maxOutputBytes`),
    generatedOutputs,
    mutationPolicy: enumValue(fields.mutationPolicy, MUTATION_POLICIES, `${label}.mutationPolicy`),
    platforms: uniqueStrings(fields.platforms, `${label}.platforms`, 1, PLATFORMS),
    selfTest: selfTest(fields.selfTest, root, `${label}.selfTest`),
    predecessors: uniqueStrings(fields.predecessors, `${label}.predecessors`),
    lifecycle: {
      replacementId: optionalId(lifecycle.replacementId, `${label}.lifecycle.replacementId`),
      overlap: enumValue(lifecycle.overlap, OVERLAPS, `${label}.lifecycle.overlap`),
      retirement: enumValue(lifecycle.retirement, RETIREMENTS, `${label}.lifecycle.retirement`),
    },
  };
}

function verifyDependencies(entries) {
  const byId = new Map();
  for (const entry of entries) {
    if (byId.has(entry.id)) {
      refuse("ASSURANCE-MANIFEST-DUPLICATE", `duplicate entry id ${entry.id}`);
    }
    byId.set(entry.id, entry);
  }
  for (const entry of entries) {
    const dependencies = entry.execution.kind === "predecessor-receipt"
      ? [...entry.predecessors, entry.execution.predecessorId]
      : entry.predecessors;
    if (entry.execution.kind === "predecessor-receipt"
        && !entry.predecessors.includes(entry.execution.predecessorId)) {
      refuse(
        "ASSURANCE-MANIFEST-DEPENDENCY",
        `${entry.id} receipt predecessor must also be declared in predecessors`,
      );
    }
    for (const predecessor of dependencies) {
      if (!byId.has(predecessor)) {
        refuse("ASSURANCE-MANIFEST-DEPENDENCY", `${entry.id} names unknown predecessor ${predecessor}`);
      }
    }
  }

  const state = new Map();
  function visit(id) {
    const current = state.get(id) ?? "unseen";
    if (current === "visiting") {
      refuse("ASSURANCE-MANIFEST-CYCLE", `dependency cycle reaches ${id}`);
    }
    if (current === "done") return;
    state.set(id, "visiting");
    const entry = byId.get(id);
    const dependencies = entry.execution.kind === "predecessor-receipt"
      ? [...entry.predecessors, entry.execution.predecessorId]
      : entry.predecessors;
    for (const predecessor of new Set(dependencies)) visit(predecessor);
    state.set(id, "done");
  }
  for (const entry of entries) visit(entry.id);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

export function validateAssuranceManifest(value, root) {
  try {
    const normalizedRoot = resolve(nonEmptyString(root, "root"));
    const fields = exactRecord(value, ROOT_KEYS, "manifest");
    if (fields.schemaVersion !== 1) {
      refuse("ASSURANCE-MANIFEST-VERSION", "manifest.schemaVersion must equal 1");
    }
    const rawEntries = exactArray(fields.entries, "manifest.entries", 1);
    const entries = rawEntries.map((entry, index) => cloneEntry(entry, normalizedRoot, index));
    verifyDependencies(entries);
    const manifest = deepFreeze({ schemaVersion: 1, entries });
    for (const entry of manifest.entries) acceptedEntries.add(entry);
    acceptedManifests.add(manifest);
    return Object.freeze({ kind: "accepted", value: manifest });
  } catch (error) {
    if (error instanceof ManifestRefusal) {
      return Object.freeze({ kind: "refused", code: error.code, detail: error.message });
    }
    return Object.freeze({
      kind: "refused",
      code: "ASSURANCE-MANIFEST-INVALID",
      detail: "manifest validation refused an unclassified input",
    });
  }
}

export function isValidatedAssuranceEntry(value) {
  return value !== null && typeof value === "object" && acceptedEntries.has(value);
}

export function selectCadenceEntries(manifest, cadence) {
  if (!CADENCES.has(cadence)) {
    throw new TypeError("cadence is outside the closed vocabulary");
  }
  if (!manifest || typeof manifest !== "object" || !acceptedManifests.has(manifest)) {
    throw new TypeError("an accepted manifest is required");
  }
  return Object.freeze(manifest.entries.filter((entry) => entry.cadences.includes(cadence)));
}
