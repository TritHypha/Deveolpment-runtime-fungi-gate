import { types as utilTypes } from "node:util";
import { selectCadenceEntries } from "./manifest.mjs";

const CADENCES = new Set(["changed", "normal", "nightly", "exhaustive", "release", "on-demand"]);
const PLATFORMS = new Set(["win32", "linux", "darwin"]);
const acceptedPlans = new WeakSet();

class CadenceRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new CadenceRefusal(code, detail);
}

function exactOptions(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    refuse("ASSURANCE-CADENCE-OPTIONS", "options must be an exact ordinary object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  if (keys.length !== 2 || keys[0] !== "cadence" || keys[1] !== "platform") {
    refuse("ASSURANCE-CADENCE-OPTIONS", "options must contain exact cadence and platform fields");
  }
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.get !== undefined
        || descriptor.set !== undefined || descriptor.enumerable !== true) {
      refuse("ASSURANCE-CADENCE-OPTIONS", `options.${key} must be an ordinary data field`);
    }
  }
  if (!CADENCES.has(descriptors.cadence.value)) {
    refuse("ASSURANCE-CADENCE-OPTIONS", "cadence is outside the closed vocabulary");
  }
  if (!PLATFORMS.has(descriptors.platform.value)) {
    refuse("ASSURANCE-CADENCE-OPTIONS", "platform is outside the closed vocabulary");
  }
  return { cadence: descriptors.cadence.value, platform: descriptors.platform.value };
}

function ordinal(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function dependencies(entry) {
  const values = [...entry.predecessors];
  if (entry.execution.kind === "predecessor-receipt") values.push(entry.execution.predecessorId);
  return [...new Set(values)].sort(ordinal);
}

function subjectSet(entry) {
  return new Set(entry.subjects.values);
}

function isSuperset(candidate, other) {
  if (candidate.subjects.kind !== other.subjects.kind) return false;
  if (!other.satisfies.every((id) => candidate.satisfies.includes(id))) return false;
  const candidateSubjects = subjectSet(candidate);
  return other.subjects.values.every((subject) => candidateSubjects.has(subject));
}

function overlaps(left, right) {
  if (left.subjects.kind !== right.subjects.kind) return false;
  const rightRequirements = new Set(right.satisfies);
  if (!left.satisfies.some((id) => rightRequirements.has(id))) return false;
  const rightSubjects = subjectSet(right);
  return left.subjects.values.some((subject) => rightSubjects.has(subject));
}

function commandIdentity(entry) {
  return JSON.stringify([entry.cwd, entry.execution.command]);
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

export function buildCadencePlan(manifest, options) {
  try {
    const admitted = exactOptions(options);
    const selected = [...selectCadenceEntries(manifest, admitted.cadence)];
    if (selected.length === 0) {
      refuse("ASSURANCE-CADENCE-EMPTY", `cadence ${admitted.cadence} has no entries`);
    }
    const byId = new Map(manifest.entries.map((entry) => [entry.id, entry]));
    const closure = new Map();
    function include(entry) {
      if (!entry || closure.has(entry.id)) return;
      closure.set(entry.id, entry);
      for (const predecessorId of dependencies(entry)) include(byId.get(predecessorId));
    }
    for (const entry of selected) include(entry);

    for (const entry of closure.values()) {
      if (!entry.platforms.includes(admitted.platform)) {
        refuse("ASSURANCE-CADENCE-PLATFORM", `${entry.id} has no explicit ${admitted.platform} disposition`);
      }
      if (entry.lifecycle.retirement === "retired") {
        refuse("ASSURANCE-CADENCE-RETIRED", `${entry.id} is retired and cannot execute`);
      }
    }

    const candidates = [...closure.values()];
    const dominated = new Map();
    for (const weaker of candidates) {
      const dominators = candidates.filter((candidate) =>
        candidate.id !== weaker.id && isSuperset(candidate, weaker));
      if (dominators.length === 0) continue;
      const maximal = dominators.filter((candidate) =>
        !dominators.some((other) => other.id !== candidate.id && isSuperset(other, candidate)));
      if (maximal.length !== 1) {
        refuse("ASSURANCE-CADENCE-OVERLAP", `${weaker.id} has no unique dominating executor`);
      }
      if (candidates.some((entry) => dependencies(entry).includes(weaker.id))) continue;
      dominated.set(weaker.id, maximal[0]);
    }

    for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
      const left = candidates[leftIndex];
      if (dominated.has(left.id)) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
        const right = candidates[rightIndex];
        if (dominated.has(right.id)) continue;
        if (overlaps(left, right)) {
          refuse(
            "ASSURANCE-CADENCE-OVERLAP",
            `${left.id} and ${right.id} have incomparable overlapping obligations`,
          );
        }
      }
    }

    const retained = candidates.filter((entry) => !dominated.has(entry.id));
    const processIdentities = new Map();
    for (const entry of retained) {
      if (entry.execution.kind !== "process") continue;
      const identity = commandIdentity(entry);
      const previous = processIdentities.get(identity);
      if (previous !== undefined) {
        refuse(
          "ASSURANCE-CADENCE-DUPLICATE-EXECUTION",
          `${previous} and ${entry.id} have one process identity`,
        );
      }
      processIdentities.set(identity, entry.id);
    }

    const retainedById = new Map(retained.map((entry) => [entry.id, entry]));
    const state = new Map();
    const ordered = [];
    function visit(entry) {
      const current = state.get(entry.id) ?? "unseen";
      if (current === "done") return;
      if (current === "visiting") refuse("ASSURANCE-CADENCE-CYCLE", `cycle reaches ${entry.id}`);
      state.set(entry.id, "visiting");
      for (const predecessorId of dependencies(entry)) {
        const predecessor = retainedById.get(predecessorId);
        if (predecessor) visit(predecessor);
      }
      state.set(entry.id, "done");
      ordered.push(entry);
    }
    for (const entry of [...retained].sort((left, right) => ordinal(left.id, right.id))) visit(entry);

    const discharged = [];
    for (const [weakerId, executor] of [...dominated.entries()].sort(([left], [right]) => ordinal(left, right))) {
      const weaker = byId.get(weakerId);
      for (const requirementId of [...weaker.satisfies].sort(ordinal)) {
        for (const subjectId of [...weaker.subjects.values].sort(ordinal)) {
          discharged.push({
            requirementId,
            subjectId,
            executorId: executor.id,
            overlappedEntryIds: [weaker.id],
          });
        }
      }
    }
    discharged.sort((left, right) =>
      ordinal(left.requirementId, right.requirementId)
      || ordinal(left.subjectId, right.subjectId)
      || ordinal(left.executorId, right.executorId));

    const plan = deepFreeze({
      cadence: admitted.cadence,
      platform: admitted.platform,
      entries: ordered,
      discharged,
      requirements: [...new Set(ordered.flatMap((entry) => entry.satisfies))].sort(ordinal),
      authorizing: false,
    });
    acceptedPlans.add(plan);
    return Object.freeze({ kind: "accepted", value: plan });
  } catch (error) {
    if (error instanceof CadenceRefusal) {
      return Object.freeze({ kind: "refused", code: error.code, detail: error.message });
    }
    return Object.freeze({
      kind: "refused",
      code: "ASSURANCE-CADENCE-INVALID",
      detail: "cadence planning refused an unclassified input",
    });
  }
}

export function isAcceptedCadencePlan(value) {
  return value !== null && typeof value === "object" && acceptedPlans.has(value);
}
