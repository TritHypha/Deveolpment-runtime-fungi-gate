// gate-v3-termination.test.mjs — the TERM-003 / TERM-004 cycle classifier.
//
// The two codes are mutually exclusive claims about one cycle: either its lap
// count is capped (TERM-004 — bounded, refused pending a registered state
// contract and termination proof) or it is not (TERM-003 — unbounded). Both
// refuse; the classification is author GUIDANCE, and §3.1 of the semantics
// makes distinguishable refusals a security property — the wrong code sends an
// author off to prove termination of a loop that has none.
//
// The classifier is EDGE-wise: a lap crosses each consecutive step of the found
// cycle exactly once, so the cycle is bounded only if at some step EVERY
// parallel wire between that pair carries a bound. This suite exists because
// the first classifier tested NODE membership and was fooled by two shapes —
// the bounded CHORD and the bounded-beside-unbounded PARALLEL — both of which
// misreported an unbounded loop as TERM-004. Conformance twins: CV-087..089.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchGateSource } from "../dist/index.js";

// A noise-free relay: an `aux` input so IN can feed a cycle node without
// fan-in, copyable outputs so fan-out never co-fires WIRE-102. The cycle
// verdict must be the only variable between these drawings.
const REGISTRY = {
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "c.relay", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"c".repeat(64)}`,
    inputs: [{ name: "subject", type: "T" }, { name: "aux", type: "T" }],
    outputs: [
      { name: "value", type: "T", copyable: true },
      { name: "spare", type: "T", copyable: true },
    ],
    arguments: [], effects: [], capabilities: [],
  }],
};

const circuit = (parts, wires) => `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "termination classifier"
  REQUIRES:
  PARTS:
${parts}
  WIRES:
${wires}
END
`;

const THREE = "    [a :: c.relay@1.0.0]\n    [b :: c.relay@1.0.0]\n    [c :: c.relay@1.0.0]";
const TWO = "    [a :: c.relay@1.0.0]\n    [b :: c.relay@1.0.0]";

function termCodes(source) {
  const { diagnostics } = dispatchGateSource(source, "<termination>.gate", { registry: REGISTRY });
  return diagnostics.filter((d) => d.code.startsWith("GATE-TERM-")).map((d) => d.code).sort();
}

test("termination: an unbounded cycle is TERM-003, never TERM-004", () => {
  const codes = termCodes(circuit(THREE,
    "    IN.v -> a.aux\n    a.value -> b.subject\n    b.value -> c.subject\n    c.value -> a.subject\n    a.spare -> OUT.value"));
  assert.deepEqual(codes, ["GATE-TERM-003"]);
});

test("termination: one fully-bounded step caps the laps — TERM-004, never TERM-003", () => {
  const codes = termCodes(circuit(THREE,
    "    IN.v -> a.aux\n    a.value -> b.subject\n    b.value -> c.subject\n    c.value -> a.subject budget=3\n    a.spare -> OUT.value"));
  assert.deepEqual(codes, ["GATE-TERM-004"]);
});

test("termination: a decreases-bound classifies the same as a budget", () => {
  const codes = termCodes(circuit(THREE,
    "    IN.v -> a.aux\n    a.value -> b.subject\n    b.value -> c.subject\n    c.value -> a.subject decreases=n\n    a.spare -> OUT.value"));
  assert.deepEqual(codes, ["GATE-TERM-004"]);
});

test("termination: a bounded CHORD does not bound the cycle — no lap crosses it", () => {
  // a->b->c->a unbounded; the only bound rides a.spare -> c.aux, whose
  // endpoints are cycle NODES but which is no edge of the cycle. The node-wise
  // classifier reported TERM-004 here.
  const codes = termCodes(circuit(THREE,
    "    IN.v -> a.aux\n    a.value -> b.subject\n    b.value -> c.subject\n    c.value -> a.subject\n    a.spare -> c.aux budget=3\n    c.spare -> OUT.value"));
  assert.deepEqual(codes, ["GATE-TERM-003"]);
});

test("termination: a bounded wire beside an unbounded PARALLEL does not bound the step", () => {
  // Both wires run a->b; only one carries the budget, and every lap may take
  // the other. The node-wise classifier reported TERM-004 here too.
  const codes = termCodes(circuit(TWO,
    "    IN.v -> a.aux\n    a.value -> b.subject budget=3\n    a.spare -> b.aux\n    b.value -> a.subject\n    b.spare -> OUT.value"));
  assert.deepEqual(codes, ["GATE-TERM-003"]);
});

test("termination: bounding BOTH parallels bounds the step", () => {
  // The negative control for the case above: same drawing, second wire now
  // bounded too — the step is fully covered and the cycle is bounded.
  const codes = termCodes(circuit(TWO,
    "    IN.v -> a.aux\n    a.value -> b.subject budget=3\n    a.spare -> b.aux budget=2\n    b.value -> a.subject\n    b.spare -> OUT.value"));
  assert.deepEqual(codes, ["GATE-TERM-004"]);
});

test("termination: an acyclic drawing reports neither code", () => {
  const codes = termCodes(circuit(TWO,
    "    IN.v -> a.subject\n    a.value -> b.subject\n    b.value -> OUT.value"));
  assert.deepEqual(codes, []);
});
