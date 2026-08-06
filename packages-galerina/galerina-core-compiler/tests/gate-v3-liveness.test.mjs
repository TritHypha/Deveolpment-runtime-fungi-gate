// gate-v3-liveness.test.mjs — Round two G2 step 7: CONTRACT-DRIVEN liveness.
//
// GD-007's history is the point of this suite. The owner ruled full liveness
// (every part reachable from an input AND reaching a terminal). Implementing
// it structurally in G1 fired on 7 of 20 canonical circuits, because a
// legitimate SOURCE (a dataset scan, a literal constant) and a legitimate SINK
// (an audit recorder) are structurally identical to a ghost part. Only a
// contract can tell them apart, so enforcement was rescoped to G2 - here.
//
// The decidable rule: a part is an orphan iff its CONTRACT declares ports that
// the drawing leaves unwired in the direction that matters.
//   * declares required inputs, none wired, and it is not reachable from IN
//     => a ghost source: REFUSE.
//   * declares outputs, none wired, and it reaches no terminal
//     => a dead end: REFUSE.
//   * declares NO inputs (a source by contract) => legitimately unreachable.
//   * declares NO outputs (a sink by contract)  => legitimately terminal.
//
// Tests-first: written before the checker, red then green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, loadGateV3Registry, checkGateV3Liveness, GATE_V3_LIVENESS_CODES } from "../dist/index.js";

const DIGEST = (c) => `sha256:${c.repeat(64)}`;
const circuit = (parts, wires) =>
  `@gate 3.0.0\nCIRCUIT probe(value: T) -> T\n  INTENT "liveness probe"\n  REQUIRES:\n  PARTS:\n${parts}\n  WIRES:\n${wires}\nEND\n`;

/** A component whose contract declares exactly the ports it is given. */
const component = (id, inputs, outputs, seed) => ({
  id, version: "1.0.0", status: "SHIPPED", implementationDigest: DIGEST(seed),
  inputs: inputs.map((name) => ({ name, type: "T", required: true })),
  outputs: outputs.map((name) => ({ name, type: "T", copyable: true })),
  arguments: [], effects: [], capabilities: [],
});

const registryOf = (...components) => {
  const loaded = loadGateV3Registry({
    version: "1.0.0",
    types: [{ id: "T", kind: "opaque", construction: "source" }],
    components,
  }, "<registry>");
  assert.ok(loaded.ok, `fixture registry must load: ${loaded.diagnostics.map((d) => d.code)}`);
  return loaded.registry;
};

const live = (src, registry) => {
  const parsed = parseGateV3(src, "<probe>");
  assert.equal(parsed.ok, true, `probe must parse: ${JSON.stringify(parsed.diagnostics.map((d) => d.code))}`);
  return checkGateV3Liveness(parsed.circuit, registry).map((d) => d.code);
};

test("liveness: positive control — a straight-through circuit yields ZERO diagnostics", () => {
  const registry = registryOf(component("test.echo", ["value"], ["value"], "a"));
  assert.deepEqual(live(circuit("    [e :: test.echo@1.0.0]", "    IN.value -> e.value\n    e.value -> OUT.value"), registry), []);
});

test("liveness: GD-007 — the GHOST part REFUSES (declares required inputs, none wired)", () => {
  // This is the exact construction that passed the reference checker: the real
  // flow drains while a source-less part feeds OUT.
  const registry = registryOf(
    component("test.work", ["value"], ["value"], "a"),
    component("test.ghost", ["value"], ["value"], "b"),
  );
  const codes = live(circuit(
    "    [a :: test.work@1.0.0]\n    [ghost :: test.ghost@1.0.0]",
    "    IN.value -> a.value\n    a.value -> DRAIN.discarded\n    ghost.value -> OUT.value",
  ), registry);
  assert.ok(codes.includes(GATE_V3_LIVENESS_CODES.LIVE_001.code), `the ghost must refuse, got ${codes}`);
});

test("liveness: a legitimate SOURCE (no declared inputs) still PASSES", () => {
  // The case that made structural liveness unusable: a dataset scan or literal
  // constant has no inputs by contract, so being unreachable from IN is
  // correct, not an orphan.
  const registry = registryOf(
    component("test.scan", [], ["rows"], "a"),          // a source BY CONTRACT
    component("test.sink", ["rows"], ["value"], "b"),
  );
  const codes = live(circuit(
    "    [scan :: test.scan@1.0.0]\n    [use :: test.sink@1.0.0]",
    "    IN.value -> OUT.value\n    scan.rows -> use.rows\n    use.value -> DRAIN.done",
  ), registry);
  assert.deepEqual(codes.filter((c) => c === GATE_V3_LIVENESS_CODES.LIVE_001.code), [],
    `a contract-declared source must not be flagged, got ${codes}`);
});

test("liveness: a legitimate SINK (no declared outputs) still PASSES", () => {
  // An audit recorder consumes evidence and produces nothing; reaching no
  // terminal is its contract, not a dead end.
  const registry = registryOf(
    component("test.work", ["value"], ["value", "evidence"], "a"),
    component("test.audit", ["value"], [], "b"),        // a sink BY CONTRACT
  );
  const codes = live(circuit(
    "    [w :: test.work@1.0.0]\n    [audit :: test.audit@1.0.0]",
    "    IN.value -> w.value\n    w.value -> OUT.value\n    w.evidence -> audit.value",
  ), registry);
  assert.deepEqual(codes.filter((c) => c === GATE_V3_LIVENESS_CODES.LIVE_002.code), [],
    `a contract-declared sink must not be flagged, got ${codes}`);
});

test("liveness: a DEAD END refuses (declares outputs, none wired, reaches no terminal)", () => {
  const registry = registryOf(
    component("test.work", ["value"], ["value", "spare"], "a"),
    component("test.dead", ["value"], ["value"], "b"),   // has an output it never routes
  );
  const codes = live(circuit(
    "    [w :: test.work@1.0.0]\n    [dead :: test.dead@1.0.0]",
    "    IN.value -> w.value\n    w.value -> OUT.value\n    w.spare -> dead.value",
  ), registry);
  assert.ok(codes.includes(GATE_V3_LIVENESS_CODES.LIVE_002.code), `the dead end must refuse, got ${codes}`);
});

test("liveness: an unresolved component is SKIPPED, not guessed at", () => {
  // Without a contract there is nothing to decide; resolution already refused
  // it (RESOLVE-101) and liveness must not invent a second verdict.
  const registry = registryOf(component("test.echo", ["value"], ["value"], "a"));
  const codes = live(circuit("    [x :: test.absent@1.0.0]", "    IN.value -> x.value\n    x.value -> OUT.value"), registry);
  assert.deepEqual(codes, [], `an unresolved part yields no liveness verdict, got ${codes}`);
});
