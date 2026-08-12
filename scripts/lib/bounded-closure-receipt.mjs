const RECEIPT_FIELDS = [
  "candidateDigest",
  "excludedAggregates",
  "gates",
  "schema",
  "sliceId",
  "sourceDigest",
];
const GATE_FIELDS = ["evidenceDigest", "name", "status"];
const DIGEST = /^[0-9a-f]{64}$/u;
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function refused(code) {
  return { kind: "refused", code };
}

function exactDataRecord(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  if (keys.length !== fields.length || keys.some((key, index) => key !== fields[index])) return false;
  return keys.every((key) => descriptors[key]?.enumerable === true
    && descriptors[key]?.get === undefined
    && descriptors[key]?.set === undefined
    && Object.hasOwn(descriptors[key] ?? {}, "value"));
}

function exactStringArray(value, expected) {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item, index) => typeof item === "string" && item === expected[index]);
}

export function validateBoundedClosureReceipt(value, { requiredGates, requiredExclusions }) {
  try {
    if (!exactDataRecord(value, RECEIPT_FIELDS)) return refused("CLOSURE_RECEIPT_SHAPE");
    if (value.schema !== "zt.bounded-closure.v1"
        || !/^slice-[1-9][0-9]*$/u.test(value.sliceId)
        || !DIGEST.test(value.sourceDigest)
        || !DIGEST.test(value.candidateDigest)) {
      return refused("CLOSURE_RECEIPT_IDENTITY");
    }
    if (!Array.isArray(requiredGates)
        || new Set(requiredGates).size !== requiredGates.length
        || requiredGates.some((name) => !NAME.test(name))) {
      return refused("CLOSURE_RECEIPT_REQUIRED_GATES");
    }
    if (!Array.isArray(value.gates) || value.gates.length !== requiredGates.length) {
      return refused("CLOSURE_RECEIPT_GATE_COUNT");
    }
    for (let index = 0; index < value.gates.length; index += 1) {
      const gate = value.gates[index];
      if (!exactDataRecord(gate, GATE_FIELDS)
          || gate.name !== requiredGates[index]
          || gate.status !== "PASS"
          || !DIGEST.test(gate.evidenceDigest)) {
        return refused("CLOSURE_RECEIPT_GATE_EVIDENCE");
      }
    }
    if (!Array.isArray(requiredExclusions)
        || new Set(requiredExclusions).size !== requiredExclusions.length
        || requiredExclusions.some((name) => !NAME.test(name))
        || !exactStringArray(value.excludedAggregates, requiredExclusions)) {
      return refused("CLOSURE_RECEIPT_EXCLUSIONS");
    }
    return { kind: "accepted", value };
  } catch {
    return refused("CLOSURE_RECEIPT_HOSTILE_OBJECT");
  }
}
