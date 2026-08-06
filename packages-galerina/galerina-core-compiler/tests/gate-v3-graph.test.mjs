// gate-v3-graph.test.mjs — G3 rung 1: GateGraph construction (KTA plan 27, step 1).
//
// THE INVARIANT THIS RUNG EXISTS FOR: the graph is derived from the CANONICAL
// form of the circuit, never from source order. GD-014 measured the cost of
// getting this wrong in the reference — edge IDs assigned in source order, so
// two circuits with EQUAL fingerprints produced DIFFERENT topology JSON, and a
// downstream consumer could not tell representation drift from semantic change.
// Every semantic pass G3 adds (dominators, separator, verdict fold, budgets)
// will read this graph; if its identity is representation-dependent, every
// pass's evidence inherits that defect at birth.
//
// The load-bearing test is therefore BYTE IDENTITY under permutation: the same
// circuit with parts and wires listed in a different source order must
// serialize to the identical string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, buildGateGraph, serializeGateGraph } from "../dist/index.js";

/** Parse a source that MUST be valid, or fail the test loudly. */
function circuitOf(source) {
  const parsed = parseGateV3(source, "<graph>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}

// One circuit, two spellings: parts and wires permuted, comments and blank
// lines moved. Same drawing, different bytes.
const ORDERED = `@gate 3.0.0
CIRCUIT probe(caller: CallerId, key: CustomerRef) -> CustomerView
  INTENT "graph construction fixture"
  REQUIRES:
    capability customer.read
  PARTS:
    [authz :: galerina.tower.authorize@1.0.0 capability=customer.read]
    [record :: app.customer.read@1.0.0]
    [view :: galerina.privacy.cut@1.0.0 fields={CustomerId}]
  WIRES:
    IN.caller -> authz.subject
    IN.key -> authz.resource
    IN.key -> record.key
    authz.allow -> record.authority
    authz.deny -> DENY.not_authorized
    authz.indeterminate -> DENY.authority_unknown
    record.value -> view.value
    record.evidence -> view.evidence
    view.evidence -> DRAIN.logged
    view.value -> OUT.value
END
`;

const PERMUTED = `@gate 3.0.0
# same circuit, hostile ordering
CIRCUIT probe(caller: CallerId, key: CustomerRef) -> CustomerView
  INTENT "graph construction fixture"
  REQUIRES:
    capability customer.read
  PARTS:
    [view :: galerina.privacy.cut@1.0.0 fields={CustomerId}]

    [record :: app.customer.read@1.0.0]
    [authz :: galerina.tower.authorize@1.0.0 capability=customer.read]
  WIRES:
    view.value -> OUT.value
    authz.indeterminate -> DENY.authority_unknown
    record.evidence -> view.evidence
    IN.key -> record.key
    authz.deny -> DENY.not_authorized
    record.value -> view.value
    authz.allow -> record.authority
    IN.caller -> authz.subject
    view.evidence -> DRAIN.logged
    IN.key -> authz.resource
END
`;

test("graph: permuted source yields a BYTE-IDENTICAL serialized graph", () => {
  const a = serializeGateGraph(buildGateGraph(circuitOf(ORDERED)));
  const b = serializeGateGraph(buildGateGraph(circuitOf(PERMUTED)));
  assert.equal(a, b, "graph identity must come from canonical form, never source order");
});

test("graph: nodes are the parts, the input frontier, the output, and each reason-qualified terminal", () => {
  const graph = buildGateGraph(circuitOf(ORDERED));
  const ids = graph.nodes.map((n) => n.id);
  // Sorted canonical order is part of the contract, so assert the exact list.
  assert.deepEqual(ids, [
    "DENY.authority_unknown",
    "DENY.not_authorized",
    "DRAIN.logged",
    "IN",
    "OUT",
    "authz",
    "record",
    "view",
  ]);
  const kinds = Object.fromEntries(graph.nodes.map((n) => [n.id, n.kind]));
  assert.equal(kinds["IN"], "input");
  assert.equal(kinds["OUT"], "output");
  assert.equal(kinds["DENY.not_authorized"], "terminal");
  assert.equal(kinds["authz"], "part");
});

test("graph: every wire is an edge, IDs assigned AFTER canonical sort", () => {
  const graph = buildGateGraph(circuitOf(ORDERED));
  assert.equal(graph.edges.length, 10, "ten wires, ten edges");
  // IDs must be e1..e10 in canonical (sorted) order — the anti-GD-014 property.
  assert.deepEqual(graph.edges.map((e) => e.id), Array.from({ length: 10 }, (_, i) => `e${i + 1}`));
  const sortedKeys = graph.edges.map((e) => `${e.from.node}.${e.from.port}->${e.to.node}.${e.to.port}`);
  const resorted = [...sortedKeys].sort();
  assert.deepEqual(sortedKeys, resorted, "edges must already be in canonical order");
});

test("graph: terminal families are distinct nodes per REASON, never merged", () => {
  // DENY.not_authorized and DENY.authority_unknown are different refusal
  // surfaces; merging them into one DENY node would let a later pass prove
  // "a deny is routed" while the SPECIFIC deny an arm names is not.
  const graph = buildGateGraph(circuitOf(ORDERED));
  const denies = graph.nodes.filter((n) => n.kind === "terminal" && n.id.startsWith("DENY."));
  assert.equal(denies.length, 2);
});

test("graph: the adjacency answers who-feeds-whom", () => {
  const graph = buildGateGraph(circuitOf(ORDERED));
  const into = (id) => graph.edges.filter((e) => e.to.node === id).map((e) => e.from.node).sort();
  const outOf = (id) => graph.edges.filter((e) => e.from.node === id).map((e) => e.to.node).sort();
  assert.deepEqual(into("view"), ["record", "record"], "the cut is fed only by the read");
  assert.deepEqual(outOf("authz").filter((n) => !n.startsWith("DENY")), ["record"], "allow feeds the read");
  assert.deepEqual(into("OUT"), ["view"], "egress is fed only by the cut");
});

test("graph: serialization is pure — two calls, one string", () => {
  const graph = buildGateGraph(circuitOf(ORDERED));
  assert.equal(serializeGateGraph(graph), serializeGateGraph(graph));
});
