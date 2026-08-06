// gate-v3-resolve.test.mjs — Round two G2 steps 3-6: circuit RESOLUTION
// against the registry. This is where "shape" becomes "meaning": the contract,
// not the drawing, says what a part is.
//
// Closes the remaining executed BLOCKERs: GD-010 (an empty type catalogue
// silently disabled the nominal wall), GD-012 (a required input could be left
// unwired), GD-008 (K3 completeness keyed on a port NAME, evaded by
// permit/refuse), GD-023 (Int arguments unbounded: width=0/-5/huge all passed).
//
// Tests-first: written before the resolver, red then green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, loadGateV3Registry, resolveGateV3, GATE_V3_RESOLVE_CODES } from "../dist/index.js";

const DIGEST = (c) => `sha256:${c.repeat(64)}`;
const circuit = (parts, wires, params = "value: T", ret = "T") =>
  `@gate 3.0.0\nCIRCUIT probe(${params}) -> ${ret}\n  INTENT "resolve probe"\n  REQUIRES:\n  PARTS:\n${parts}\n  WIRES:\n${wires}\nEND\n`;

const registry = (mutate) => {
  const value = {
    version: "1.0.0",
    types: [{ id: "T", kind: "opaque", construction: "source" }],
    components: [{
      id: "test.echo", version: "1.0.0", status: "SHIPPED", implementationDigest: DIGEST("a"),
      inputs: [{ name: "value", type: "T", required: true }],
      outputs: [{ name: "value", type: "T", copyable: true }],
      arguments: [], effects: [], capabilities: [],
    }],
  };
  mutate?.(value);
  const loaded = loadGateV3Registry(value, "<registry>");
  assert.ok(loaded.registry, `fixture registry must load: ${loaded.diagnostics.map((d) => d.code)}`);
  return loaded.registry;
};

const resolve = (src, reg, opts) => {
  const parsed = parseGateV3(src, "<probe>");
  assert.equal(parsed.ok, true, `probe must parse: ${JSON.stringify(parsed.diagnostics.map((d) => d.code))}`);
  return resolveGateV3(parsed.circuit, reg, opts).map((d) => d.code);
};

const OK_PARTS = "    [e :: test.echo@1.0.0]";
const OK_WIRES = "    IN.value -> e.value\n    e.value -> OUT.value";

test("resolve: positive control — a circuit whose parts all resolve yields ZERO diagnostics", () => {
  assert.deepEqual(resolve(circuit(OK_PARTS, OK_WIRES), registry()), []);
});

test("resolve: an absent component and a non-admissible status REFUSE", () => {
  assert.ok(resolve(circuit("    [e :: test.ghost@1.0.0]", OK_WIRES), registry())
    .includes(GATE_V3_RESOLVE_CODES.RESOLVE_101.code));
  assert.ok(resolve(circuit(OK_PARTS, OK_WIRES), registry((v) => { v.components[0].status = "BLOCKED"; }))
    .includes(GATE_V3_RESOLVE_CODES.RESOLVE_102.code));
});

test("resolve: unknown ports REFUSE on both producer and consumer sides", () => {
  assert.ok(resolve(circuit(OK_PARTS, "    IN.value -> e.value\n    e.ghost -> OUT.value"), registry())
    .includes(GATE_V3_RESOLVE_CODES.RESOLVE_106.code));
  assert.ok(resolve(circuit(OK_PARTS, "    IN.value -> e.ghost\n    e.value -> OUT.value"), registry())
    .includes(GATE_V3_RESOLVE_CODES.RESOLVE_107.code));
});

test("resolve: GD-010 — a type absent from the catalogue REFUSES (the wall cannot be disabled)", () => {
  // The reference guards its type checks behind `types.size > 0`, so an empty
  // catalogue silently disabled the whole nominal wall and GhostType passed.
  const codes = resolve(circuit(OK_PARTS, OK_WIRES, "value: GhostType", "GhostType"), registry());
  assert.ok(codes.includes(GATE_V3_RESOLVE_CODES.RESOLVE_108.code), `GhostType must refuse, got ${codes}`);
});

test("resolve: GD-010 — the STRICT profile refuses a registry with no type catalogue at all", () => {
  const empty = registry((v) => { v.types = []; });
  const codes = resolve(circuit(OK_PARTS, OK_WIRES), empty, { profile: "strict" });
  assert.ok(codes.includes(GATE_V3_RESOLVE_CODES.RESOLVE_109.code),
    `an empty catalogue must refuse in the strict profile, got ${codes}`);
});

test("resolve: GD-012 — a REQUIRED input left unwired REFUSES", () => {
  // 'e' is connected (its output is wired) but its required input is not:
  // the reference counts any incident edge as 'connected' and passes.
  const codes = resolve(circuit(OK_PARTS, "    IN.value -> OUT.value\n    e.value -> DRAIN.x"), registry());
  assert.ok(codes.includes(GATE_V3_RESOLVE_CODES.RESOLVE_110.code), `unwired required input must refuse, got ${codes}`);
});

test("resolve: an OPTIONAL input may be left unwired", () => {
  const optional = registry((v) => { v.components[0].inputs[0].required = false; });
  assert.deepEqual(resolve(circuit(OK_PARTS, "    IN.value -> OUT.value\n    e.value -> DRAIN.x"), optional)
    .filter((c) => c === GATE_V3_RESOLVE_CODES.RESOLVE_110.code), []);
});

test("resolve: GD-008 — K3 completeness is CONTRACT-driven, not port-name keyed", () => {
  // A decision component whose arms are named permit/refuse/unsure evades any
  // name-based heuristic. The contract declares decision:true and its arms.
  const withDecision = () => registry((v) => {
    v.components.push({
      id: "test.decider", version: "1.0.0", status: "SHIPPED", implementationDigest: DIGEST("b"),
      inputs: [{ name: "subject", type: "T", required: true }],
      outputs: [
        { name: "permit", type: "T", copyable: true },
        { name: "refuse", type: "T", copyable: true },
        { name: "unsure", type: "T", copyable: true },
      ],
      arguments: [], effects: [], capabilities: [],
      decision: true, arms: ["permit", "refuse", "unsure"],
    });
  });
  const partial = circuit("    [d :: test.decider@1.0.0]", "    IN.value -> d.subject\n    d.permit -> OUT.value");
  assert.ok(resolve(partial, withDecision()).includes(GATE_V3_RESOLVE_CODES.RESOLVE_111.code),
    "an unrouted declared arm must refuse");
  const complete = circuit("    [d :: test.decider@1.0.0]",
    "    IN.value -> d.subject\n    d.permit -> OUT.value\n    d.refuse -> DENY.refused\n    d.unsure -> DENY.unknown");
  assert.deepEqual(resolve(complete, withDecision()).filter((c) => c === GATE_V3_RESOLVE_CODES.RESOLVE_111.code), [],
    "all arms routed => no refusal");
});

test("resolve: GD-023 — argument values are range-checked against the contract", () => {
  const bounded = () => registry((v) => {
    v.components[0].arguments = [{ name: "width", type: "Int", required: true, min: 1 }];
  });
  // 0 and -5 are integers that violate the declared minimum => a RANGE refusal.
  for (const bad of ["0", "-5"]) {
    const codes = resolve(circuit(`    [e :: test.echo@1.0.0 width=${bad}]`, OK_WIRES), bounded());
    assert.ok(codes.includes(GATE_V3_RESOLVE_CODES.RESOLVE_112.code), `width=${bad} must refuse on range, got ${codes}`);
  }
  // 0.5 is not an Int at all => the TYPE refusal fires first, which is the
  // more precise verdict (a range check on a non-integer would be misleading).
  const fractional = resolve(circuit("    [e :: test.echo@1.0.0 width=0.5]", OK_WIRES), bounded());
  assert.ok(fractional.includes(GATE_V3_RESOLVE_CODES.RESOLVE_104.code), `width=0.5 must refuse on type, got ${fractional}`);
  assert.deepEqual(resolve(circuit("    [e :: test.echo@1.0.0 width=64]", OK_WIRES), bounded())
    .filter((c) => c === GATE_V3_RESOLVE_CODES.RESOLVE_112.code), [], "a valid width passes");
});

test("resolve: a required ARGUMENT left unsupplied REFUSES; an unknown argument REFUSES", () => {
  const withArg = registry((v) => { v.components[0].arguments = [{ name: "mode", type: "String", required: true }]; });
  assert.ok(resolve(circuit(OK_PARTS, OK_WIRES), withArg).includes(GATE_V3_RESOLVE_CODES.RESOLVE_105.code));
  assert.ok(resolve(circuit('    [e :: test.echo@1.0.0 ghost="x"]', OK_WIRES), registry())
    .includes(GATE_V3_RESOLVE_CODES.RESOLVE_103.code));
});

test("resolve: wire types must match exactly — no implicit conversion", () => {
  const twoTypes = registry((v) => {
    v.types.push({ id: "Other", kind: "opaque", construction: "source" });
    v.components.push({
      id: "test.other", version: "1.0.0", status: "SHIPPED", implementationDigest: DIGEST("c"),
      inputs: [{ name: "value", type: "Other", required: true }],
      outputs: [{ name: "value", type: "Other", copyable: true }],
      arguments: [], effects: [], capabilities: [],
    });
  });
  const mixed = circuit("    [e :: test.echo@1.0.0]\n    [o :: test.other@1.0.0]",
    "    IN.value -> e.value\n    e.value -> o.value\n    o.value -> OUT.value");
  assert.ok(resolve(mixed, twoTypes).includes(GATE_V3_RESOLVE_CODES.RESOLVE_113.code));
});

test("resolve: a NON-copyable output with two consumers REFUSES (fan-out is contract-gated)", () => {
  const nonCopyable = registry((v) => { v.components[0].outputs[0].copyable = false; });
  const fanOut = circuit(OK_PARTS, "    IN.value -> e.value\n    e.value -> OUT.value\n    e.value -> DRAIN.copy");
  assert.ok(resolve(fanOut, nonCopyable).includes(GATE_V3_RESOLVE_CODES.RESOLVE_114.code));
});
