import { types as utilTypes } from "node:util";

const ROOT_KEYS = Object.freeze(["edges", "nodes", "repositoryHead", "schemaVersion"]);
const NODE_KEYS = Object.freeze([
  "evidencePath",
  "externalInput",
  "id",
  "kind",
  "localTrit",
  "repositoryHead",
  "subjectDigest",
  "toolDigest",
  "workingTreeClass",
]);
const EDGE_KEYS = Object.freeze(["from", "to", "type"]);
const NODE_KINDS = new Set(["aggregate", "external", "generated", "source"]);
const WORKING_TREE_CLASSES = new Set([
  "CLEAN",
  "DECLARED_GENERATED_OUTPUT",
  "DIRTY_UNADMITTED",
  "EXTERNAL_INPUT",
]);
const EDGE_TYPES = new Set([
  "DERIVED_FROM",
  "CHECKED_BY",
  "TESTS",
  "PRODUCES",
  "BLOCKS",
  "SUPERSEDES",
  "REPLACES",
]);
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u;
const GIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const DRIVE_RELATIVE_PATTERN = /^[A-Za-z]:/u;
const reportBrand = new WeakSet();

class EvidenceDagRefusal extends Error {
  constructor(code, detail) {
    super(detail);
    this.code = code;
  }
}

function refuse(code, detail) {
  throw new EvidenceDagRefusal(code, detail);
}

function recordDescriptors(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || utilTypes.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    refuse("ASSURANCE-DAG-SHAPE", `${label} must be an exact ordinary object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== "string")) {
    refuse("ASSURANCE-DAG-SHAPE", `${label} cannot contain symbol fields`);
  }
  return descriptors;
}

function exactRecord(value, expectedKeys, label) {
  const descriptors = recordDescriptors(value, label);
  const actual = Object.keys(descriptors).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length
      || actual.some((key, index) => key !== expected[index])) {
    refuse("ASSURANCE-DAG-SHAPE", `${label} has an unexpected or missing field`);
  }
  const result = {};
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ASSURANCE-DAG-SHAPE", `${label}.${key} must be an ordinary enumerable data field`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function exactArray(value, label, minimum = 0) {
  if (!Array.isArray(value) || utilTypes.isProxy(value)
      || Object.getPrototypeOf(value) !== Array.prototype) {
    refuse("ASSURANCE-DAG-SHAPE", `${label} must be an ordinary array`);
  }
  if (value.length < minimum) {
    refuse("ASSURANCE-DAG-SHAPE", `${label} must contain at least ${minimum} item(s)`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== value.length + 1) {
    refuse("ASSURANCE-DAG-SHAPE", `${label} cannot contain holes or surplus fields`);
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ASSURANCE-DAG-SHAPE", `${label}[${index}] must be an ordinary data field`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    refuse("ASSURANCE-DAG-VALUE", `${label} must be a non-empty string`);
  }
  return value;
}

function enumValue(value, admitted, label) {
  if (!admitted.has(value)) {
    refuse("ASSURANCE-DAG-VALUE", `${label} is outside the closed vocabulary`);
  }
  return value;
}

function identifier(value, label) {
  const id = nonEmptyString(value, label);
  if (!ID_PATTERN.test(id)) {
    refuse("ASSURANCE-DAG-VALUE", `${label} is not a canonical evidence identifier`);
  }
  return id;
}

function digest(value, label) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    refuse("ASSURANCE-DAG-DIGEST", `${label} must be an exact lowercase SHA-256 digest`);
  }
  return value;
}

function gitIdentity(value, label) {
  if (typeof value !== "string" || !GIT_PATTERN.test(value)) {
    refuse("ASSURANCE-DAG-GIT", `${label} must be an exact lowercase Git identity`);
  }
  return value;
}

function evidencePath(value, label) {
  const path = nonEmptyString(value, label);
  const segments = path.split("/");
  if (path.startsWith("/") || DRIVE_RELATIVE_PATTERN.test(path) || path.includes("\\")
      || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    refuse("ASSURANCE-DAG-PATH", `${label} must be a canonical repository-relative path`);
  }
  return path;
}

function trit(value, label) {
  if (!Number.isInteger(value) || (value !== -1 && value !== 0 && value !== 1)) {
    refuse("ASSURANCE-DAG-TRIT", `${label} must be exactly -1, 0 or 1`);
  }
  return value;
}

function externalInput(value, label) {
  const descriptors = recordDescriptors(value, label);
  const kindDescriptor = descriptors.kind;
  if (!kindDescriptor || !("value" in kindDescriptor) || kindDescriptor.get !== undefined
      || kindDescriptor.set !== undefined) {
    refuse("ASSURANCE-DAG-SHAPE", `${label}.kind must be an ordinary data field`);
  }
  if (kindDescriptor.value === "absent") {
    const fields = exactRecord(value, ["kind", "reason"], label);
    return Object.freeze({
      kind: "absent",
      reason: nonEmptyString(fields.reason, `${label}.reason`),
    });
  }
  if (kindDescriptor.value === "present") {
    const fields = exactRecord(value, ["digest", "kind"], label);
    return Object.freeze({
      kind: "present",
      digest: digest(fields.digest, `${label}.digest`),
    });
  }
  refuse("ASSURANCE-DAG-VALUE", `${label}.kind is outside the closed vocabulary`);
}

function cloneNode(value, repositoryHead, index) {
  const label = `nodes[${index}]`;
  const fields = exactRecord(value, NODE_KEYS, label);
  const nodeHead = gitIdentity(fields.repositoryHead, `${label}.repositoryHead`);
  if (nodeHead !== repositoryHead) {
    refuse("ASSURANCE-DAG-BUILD-POINT", `${label} names a different repository build point`);
  }
  const kind = enumValue(fields.kind, NODE_KINDS, `${label}.kind`);
  const workingTreeClass = enumValue(
    fields.workingTreeClass,
    WORKING_TREE_CLASSES,
    `${label}.workingTreeClass`,
  );
  const admittedExternalInput = externalInput(fields.externalInput, `${label}.externalInput`);
  const localTrit = trit(fields.localTrit, `${label}.localTrit`);
  if (localTrit === 1 && workingTreeClass === "DIRTY_UNADMITTED") {
    refuse("ASSURANCE-DAG-CONTRADICTION", `${label} cannot claim current state from unadmitted dirt`);
  }
  if (localTrit === 1 && kind === "external" && admittedExternalInput.kind !== "present") {
    refuse("ASSURANCE-DAG-CONTRADICTION", `${label} cannot claim current external state without a digest`);
  }
  return {
    id: identifier(fields.id, `${label}.id`),
    kind,
    subjectDigest: digest(fields.subjectDigest, `${label}.subjectDigest`),
    toolDigest: digest(fields.toolDigest, `${label}.toolDigest`),
    repositoryHead: nodeHead,
    workingTreeClass,
    externalInput: admittedExternalInput,
    evidencePath: evidencePath(fields.evidencePath, `${label}.evidencePath`),
    localTrit,
  };
}

function cloneEdge(value, index) {
  const label = `edges[${index}]`;
  const fields = exactRecord(value, EDGE_KEYS, label);
  return {
    from: identifier(fields.from, `${label}.from`),
    to: identifier(fields.to, `${label}.to`),
    type: enumValue(fields.type, EDGE_TYPES, `${label}.type`),
  };
}

function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

function validateGraph(value) {
  const fields = exactRecord(value, ROOT_KEYS, "graph");
  if (fields.schemaVersion !== 1) {
    refuse("ASSURANCE-DAG-VERSION", "graph.schemaVersion must equal 1");
  }
  const repositoryHead = gitIdentity(fields.repositoryHead, "graph.repositoryHead");
  const nodes = exactArray(fields.nodes, "graph.nodes", 1)
    .map((item, index) => cloneNode(item, repositoryHead, index));
  const edges = exactArray(fields.edges, "graph.edges")
    .map((item, index) => cloneEdge(item, index));
  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      refuse("ASSURANCE-DAG-DUPLICATE", `duplicate node id ${node.id}`);
    }
    byId.set(node.id, node);
  }
  const predecessors = new Map(nodes.map((node) => [node.id, []]));
  const referencedAsPredecessor = new Set();
  const edgeIdentities = new Set();
  for (const item of edges) {
    if (!byId.has(item.from) || !byId.has(item.to)) {
      refuse("ASSURANCE-DAG-ENDPOINT", `${item.from} -> ${item.to} names an unknown endpoint`);
    }
    const identity = `${item.from}\u0000${item.to}\u0000${item.type}`;
    if (edgeIdentities.has(identity)) {
      refuse("ASSURANCE-DAG-DUPLICATE", `duplicate edge ${item.from} -> ${item.to} (${item.type})`);
    }
    edgeIdentities.add(identity);
    predecessors.get(item.from).push(item.to);
    referencedAsPredecessor.add(item.to);
  }

  const visitState = new Map();
  const order = [];
  function visit(id) {
    const state = visitState.get(id) ?? "unseen";
    if (state === "visiting") {
      refuse("ASSURANCE-DAG-CYCLE", `dependency cycle reaches ${id}`);
    }
    if (state === "done") return;
    visitState.set(id, "visiting");
    for (const predecessor of predecessors.get(id)) visit(predecessor);
    visitState.set(id, "done");
    order.push(id);
  }
  for (const node of nodes) visit(node.id);

  const roots = nodes.filter((node) => !referencedAsPredecessor.has(node.id));
  if (roots.length === 0) {
    refuse("ASSURANCE-DAG-SHAPE", "graph must contain at least one terminal root");
  }
  return { repositoryHead, nodes, edges, byId, predecessors, order, roots };
}

export function evaluateEvidenceDag(value) {
  try {
    const graph = validateGraph(value);
    const effective = new Map();
    for (const id of graph.order) {
      const node = graph.byId.get(id);
      const predecessorStates = graph.predecessors.get(id).map((item) => effective.get(item));
      effective.set(id, Math.min(node.localTrit, ...predecessorStates));
    }
    const report = deepFreeze({
      schemaVersion: 1,
      repositoryHead: graph.repositoryHead,
      nodes: graph.nodes.map((node) => ({ ...node, effectiveTrit: effective.get(node.id) })),
      edges: graph.edges,
      roots: graph.roots.map((node) => node.id),
      verdictTrit: Math.min(...graph.roots.map((node) => effective.get(node.id))),
      authorizing: false,
    });
    reportBrand.add(report);
    return Object.freeze({ kind: "accepted", value: report });
  } catch (error) {
    if (error instanceof EvidenceDagRefusal) {
      return Object.freeze({ kind: "refused", code: error.code, detail: error.message });
    }
    return Object.freeze({
      kind: "refused",
      code: "ASSURANCE-DAG-INVALID",
      detail: "evidence DAG validation refused an unclassified input",
    });
  }
}

export function isEvidenceDagReport(value) {
  return value !== null && typeof value === "object" && reportBrand.has(value);
}
