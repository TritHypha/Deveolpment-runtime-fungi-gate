// gate-v3-condense.test.mjs — G3 rung 2: SCC condensation + machine-checked
// acyclicity (KTA plan 27, step 2).
//
// THE INVARIANT: v3 refuses every component cycle upstream (GATE-TERM-003/004),
// so on any ADMITTED circuit every strongly-connected component is a singleton.
// This rung turns that from an assumption into a machine-checked fact — the
// condensation is the substrate the tropical budget pass (rung 8) composes
// over, and a budget composed over a graph that silently contained a cycle
// would be a proof over a false premise.
//
// THE SELF-CHECK THAT MAKES THE GREEN MEAN SOMETHING: a pass that answers
// "acyclic: true" on every admitted circuit is indistinguishable from a pass
// that always answers true (GD-026's shape). So the KAT hand-builds a CYCLIC
// GateGraph — the parser can never produce one — and requires the pass to find
// the SCC and refuse with its own code. The detector is proven able to detect.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseGateV3,
  verifyGateV3Structure,
  buildGateGraph,
  condenseGateGraph,
  verifyGateGraphAcyclic,
} from "../dist/index.js";

/** Parse a fixture that MUST be valid. */
function circuitOf(source) {
  const parsed = parseGateV3(source, "<condense>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}

const VALID = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "condensation fixture"
  REQUIRES:
  PARTS:
    [a :: test.alpha@1.0.0]
    [b :: test.beta@1.0.0]
  WIRES:
    IN.v -> a.value
    a.value -> b.value
    b.value -> OUT.value
    b.spare -> DRAIN.unused
END
`;

test("condense: a drawn component cycle never reaches this tier — refused upstream", () => {
  // a feeds b, b feeds a: the structural verifier must refuse before any
  // semantic pass runs. This pins the division of labour the rung relies on.
  const cyclic = circuitOf(`@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "cycle"
  REQUIRES:
  PARTS:
    [a :: test.alpha@1.0.0]
    [b :: test.beta@1.0.0]
  WIRES:
    IN.v -> a.seed
    a.value -> b.value
    b.value -> a.value
    a.out -> OUT.value
END
`);
  const codes = verifyGateV3Structure(cyclic).map((d) => d.code);
  assert.ok(
    codes.includes("GATE-TERM-003") || codes.includes("GATE-TERM-004"),
    `the upstream cycle refusal must fire, got: ${codes.join(" ") || "(clean)"}`,
  );
});

test("condense: on an admitted circuit every SCC is a singleton", () => {
  const condensed = condenseGateGraph(buildGateGraph(circuitOf(VALID)));
  assert.equal(condensed.acyclic, true);
  assert.ok(condensed.components.every((c) => c.length === 1), "every component must be a singleton");
  // One component per node — nothing merged, nothing dropped.
  const memberCount = condensed.components.reduce((n, c) => n + c.length, 0);
  assert.equal(memberCount, buildGateGraph(circuitOf(VALID)).nodes.length);
});

test("condense: the acyclicity verifier is SILENT on an admitted circuit", () => {
  const diagnostics = verifyGateGraphAcyclic(buildGateGraph(circuitOf(VALID)));
  assert.deepEqual(diagnostics, []);
});

test("condense: a hand-built cyclic graph IS detected — the detector can detect", () => {
  // The parser cannot produce this, which is exactly why the test must: the
  // defensive arm is otherwise unreachable, and an unfirable check is a false
  // capability claim (GD-004's class).
  const cyclicGraph = {
    circuit: "hand_built",
    nodes: [
      { id: "IN", kind: "input", component: "" },
      { id: "OUT", kind: "output", component: "" },
      { id: "x", kind: "part", component: "test.x@1.0.0" },
      { id: "y", kind: "part", component: "test.y@1.0.0" },
    ],
    edges: [
      { id: "e1", from: { node: "IN", port: "v" }, to: { node: "x", port: "value" }, bound: null },
      { id: "e2", from: { node: "x", port: "value" }, to: { node: "y", port: "value" }, bound: null },
      { id: "e3", from: { node: "y", port: "value" }, to: { node: "x", port: "loop" }, bound: null },
      { id: "e4", from: { node: "x", port: "out" }, to: { node: "OUT", port: "value" }, bound: null },
    ],
  };
  const condensed = condenseGateGraph(cyclicGraph);
  assert.equal(condensed.acyclic, false);
  const merged = condensed.components.find((c) => c.length === 2);
  assert.deepEqual(merged, ["x", "y"], "x and y form one SCC, members in canonical order");

  const diagnostics = verifyGateGraphAcyclic(cyclicGraph);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "GATE-SEM-001");
  assert.equal(diagnostics[0].severity, "error");
  assert.match(diagnostics[0].message, /x.*y|y.*x/, "the refusal must name the cycle's members");
});

test("condense: condensed edges collapse parallels and never self-loop", () => {
  // On the hand-built graph, x<->y merge: their internal edges vanish (no
  // self-loop on the merged component) and IN->x / x->OUT survive as
  // component edges.
  const cyclicGraph = {
    circuit: "hand_built",
    nodes: [
      { id: "IN", kind: "input", component: "" },
      { id: "OUT", kind: "output", component: "" },
      { id: "x", kind: "part", component: "test.x@1.0.0" },
      { id: "y", kind: "part", component: "test.y@1.0.0" },
    ],
    edges: [
      { id: "e1", from: { node: "IN", port: "v" }, to: { node: "x", port: "value" }, bound: null },
      { id: "e2", from: { node: "x", port: "value" }, to: { node: "y", port: "value" }, bound: null },
      { id: "e3", from: { node: "y", port: "value" }, to: { node: "x", port: "loop" }, bound: null },
      { id: "e4", from: { node: "x", port: "out" }, to: { node: "OUT", port: "value" }, bound: null },
    ],
  };
  const condensed = condenseGateGraph(cyclicGraph);
  assert.deepEqual(condensed.edges, [
    { from: "IN", to: "x" },      // component named by its smallest member
    { from: "x", to: "OUT" },
  ]);
});

test("condense: determinism — permuted source, byte-identical condensation", () => {
  const permuted = circuitOf(`@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "condensation fixture"
  REQUIRES:
  PARTS:
    [b :: test.beta@1.0.0]
    [a :: test.alpha@1.0.0]
  WIRES:
    b.spare -> DRAIN.unused
    b.value -> OUT.value
    a.value -> b.value
    IN.v -> a.value
END
`);
  const one = JSON.stringify(condenseGateGraph(buildGateGraph(circuitOf(VALID))));
  const two = JSON.stringify(condenseGateGraph(buildGateGraph(permuted)));
  assert.equal(one, two);
});

test("condense: iterative on a 2000-part chain — no host stack overflow", () => {
  // The bounds round (GD-006) exists because recursion over attacker-sized
  // input blew the stack. A semantic pass recursing per node would reintroduce
  // the same class at 4096 parts, inside the ruled ceiling. 2000 parts is
  // legal input; the pass must handle it without throwing.
  const parts = Array.from({ length: 2000 }, (_, i) => `    [p${i} :: test.chain@1.0.0]`).join("\n");
  const wires = ["    IN.v -> p0.value"]
    .concat(Array.from({ length: 1999 }, (_, i) => `    p${i}.value -> p${i + 1}.value`))
    .concat(["    p1999.value -> OUT.value"])
    .join("\n");
  const chain = circuitOf(`@gate 3.0.0\nCIRCUIT probe(v: T) -> T\n  INTENT "chain"\n  REQUIRES:\n  PARTS:\n${parts}\n  WIRES:\n${wires}\nEND\n`);
  const condensed = condenseGateGraph(buildGateGraph(chain));
  assert.equal(condensed.acyclic, true);
  assert.equal(condensed.components.length, 2002); // 2000 parts + IN + OUT
});
