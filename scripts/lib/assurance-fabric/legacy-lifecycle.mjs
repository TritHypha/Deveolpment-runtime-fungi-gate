import { isValidatedAssuranceEntry } from "./manifest.mjs";
import { types as utilTypes } from "node:util";

class LifecycleRefusal extends Error {
  constructor(code, controlId, detail) {
    super(detail);
    this.code = code;
    this.controlId = controlId;
  }
}

function refuse(code, controlId, detail) {
  throw new LifecycleRefusal(code, controlId, detail);
}

function array(value, label) {
  if (!Array.isArray(value) || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype) {
    refuse("ASSURANCE-LEGACY-INPUT", label, `${label} must be an ordinary array`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string") || keys.length !== value.length + 1) {
    refuse("ASSURANCE-LEGACY-INPUT", label, `${label} cannot contain holes or surplus fields`);
  }
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || descriptor.get !== undefined
        || descriptor.set !== undefined || descriptor.enumerable !== true) {
      refuse("ASSURANCE-LEGACY-INPUT", label, `${label}[${index}] must be an ordinary data field`);
    }
  }
  return value;
}

function exactInputs(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    refuse("ASSURANCE-LEGACY-INPUT", "inputs", "inputs must be an exact ordinary object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expected = ["evidenceDag", "manifest", "retirementReport", "semanticGraph", "toolInventory"];
  const keys = Object.keys(descriptors).sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    refuse("ASSURANCE-LEGACY-INPUT", "inputs", "inputs contain an unexpected or missing field");
  }
  const result = {};
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.get !== undefined
        || descriptor.set !== undefined || descriptor.enumerable !== true) {
      refuse("ASSURANCE-LEGACY-INPUT", "inputs", `inputs.${key} must be an ordinary data field`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function findUnique(values, predicate, code, controlId, detail) {
  const matches = values.filter(predicate);
  if (matches.length !== 1) refuse(code, controlId, detail);
  return matches[0];
}

function nodeMap(graph, controlId) {
  const nodes = array(graph?.nodes, "semanticGraph.nodes");
  const result = new Map();
  for (const node of nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node)
        || typeof node.id !== "string" || result.has(node.id)) {
      refuse("ASSURANCE-LEGACY-INPUT", controlId, "semantic graph nodes are ambiguous");
    }
    result.set(node.id, node);
  }
  return result;
}

function verifyEvidence(entry, inputs, byId) {
  const controlId = entry.id;
  const evidence = entry.lifecycle.evidence;
  if (evidence.kind !== "present") {
    refuse("ASSURANCE-LEGACY-EVIDENCE", controlId, "retirement evidence is absent");
  }
  const consumerRecords = array(inputs.toolInventory?.legacyConsumers, "toolInventory.legacyConsumers");
  const consumerRecord = findUnique(
    consumerRecords,
    (record) => record?.controlId === controlId,
    "ASSURANCE-LEGACY-CONSUMERS",
    controlId,
    "legacy consumer identity is missing or ambiguous",
  );
  const consumers = array(consumerRecord.consumerIds, `${controlId}.consumerIds`);
  if (consumers.some((id) => typeof id !== "string" || id.length === 0)
      || new Set(consumers).size !== consumers.length
      || consumers.length !== evidence.consumerCount
      || consumers.length !== 0) {
    refuse("ASSURANCE-LEGACY-CONSUMERS", controlId, "zero live consumers were not independently proved");
  }

  const successor = byId.get(evidence.successorId);
  if (!successor || successor.lifecycle.retirement === "retired"
      || entry.lifecycle.replacementId.kind !== "present"
      || entry.lifecycle.replacementId.value !== successor.id) {
    refuse("ASSURANCE-LEGACY-SUCCESSOR", controlId, "an active admitted successor was not proved");
  }
  if (inputs.retirementReport?.terminalReady !== true) {
    refuse("ASSURANCE-LEGACY-RETIREMENT", controlId, "terminal retirement inventory is not ready");
  }

  const nodes = nodeMap(inputs.semanticGraph, controlId);
  if (!evidence.invariantIds.every((id) => nodes.get(id)?.kind === "requirement")) {
    refuse("ASSURANCE-LEGACY-INVARIANTS", controlId, "successor invariant coverage is incomplete");
  }
  if (!evidence.negativeTestIds.every((id) => {
    const node = nodes.get(id);
    return node?.kind === "test" && node.testClass === "negative-refusal";
  })) {
    refuse("ASSURANCE-LEGACY-NEGATIVE", controlId, "negative replacement evidence is incomplete");
  }
  if (!evidence.mutationTestIds.every((id) => {
    const node = nodes.get(id);
    return node?.kind === "test" && node.testClass === "mutation";
  })) {
    refuse("ASSURANCE-LEGACY-MUTATION", controlId, "mutation replacement evidence is incomplete");
  }

  const edges = array(inputs.semanticGraph?.edges, "semanticGraph.edges");
  findUnique(
    edges,
    (edge) => edge?.id === evidence.replacesEdgeId
      && edge.type === "REPLACES"
      && edge.from === successor.id
      && edge.to === controlId,
    "ASSURANCE-LEGACY-REPLACES",
    controlId,
    "the exact REPLACES edge is absent",
  );

  const evidenceNodes = array(inputs.evidenceDag?.nodes, "evidenceDag.nodes");
  findUnique(
    evidenceNodes,
    (node) => node?.id === evidence.retirementGateId
      && node.state === "CURRENT_NON_AUTHORIZING"
      && node.authorizing === false,
    "ASSURANCE-LEGACY-GATE",
    controlId,
    "the independent retirement gate is not current",
  );
  findUnique(
    evidenceNodes,
    (node) => node?.id === evidence.historicalEvidenceId
      && node.state === "HISTORICAL"
      && node.authorizing === false,
    "ASSURANCE-LEGACY-HISTORY",
    controlId,
    "historical evidence is absent or claims live authority",
  );
}

export function evaluateLegacyLifecycle(inputs) {
  try {
    const fields = exactInputs(inputs);
    if (!fields.manifest || !Array.isArray(fields.manifest.entries)
        || !fields.manifest.entries.every(isValidatedAssuranceEntry)) {
      refuse("ASSURANCE-LEGACY-INPUT", "manifest", "an accepted manifest is required");
    }
    const byId = new Map(fields.manifest.entries.map((entry) => [entry.id, entry]));
    const controls = [];
    for (const entry of fields.manifest.entries) {
      if (entry.toolClass !== "legacy-oracle") continue;
      const consumers = array(fields.toolInventory?.legacyConsumers, "toolInventory.legacyConsumers");
      findUnique(
        consumers,
        (record) => record?.controlId === entry.id,
        "ASSURANCE-LEGACY-CONSUMERS",
        entry.id,
        "every legacy control needs one independent consumer record",
      );
      if (entry.lifecycle.retirement === "active" || entry.lifecycle.retirement === "shadow") {
        controls.push(Object.freeze({
          id: entry.id,
          state: entry.lifecycle.retirement === "active" ? "ACTIVE_LEGACY" : "SHADOW_LEGACY",
        }));
        continue;
      }
      verifyEvidence(entry, fields, byId);
      controls.push(Object.freeze({
        id: entry.id,
        state: entry.lifecycle.retirement === "retired"
          ? "RETIRED_WITH_EXACT_REPLACEMENT"
          : "RETIREMENT_CANDIDATE_EXACT",
      }));
    }
    return Object.freeze({ kind: "accepted", controls: Object.freeze(controls), authorizing: false });
  } catch (error) {
    if (error instanceof LifecycleRefusal) {
      return Object.freeze({
        kind: "refused",
        code: error.code,
        controlId: error.controlId,
        detail: error.message,
      });
    }
    return Object.freeze({
      kind: "refused",
      code: "ASSURANCE-LEGACY-INVALID",
      controlId: "unclassified",
      detail: "legacy lifecycle evaluation refused an unclassified input",
    });
  }
}
