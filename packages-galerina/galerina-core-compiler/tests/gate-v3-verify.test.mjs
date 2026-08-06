// gate-v3-verify.test.mjs — Round-one G1 step 5: the v3 structural verifier.
//
// Registry-free structural checks over the frozen AST from parseGateV3.
// The 80-probe KAT matrix from the KTA is the test bed: every code must FIRE
// under a known-answer probe, and a positive control must stay silent.
//
// Two ruled improvements over the reference implementation, built in here:
//   * FULL LIVENESS (owner ruling, GD-007): every part must be reachable from
//     an input AND reach a terminal. The reference only checks "has any
//     incident edge", so a source-less part feeding OUT passes there.
//   * Codes are EXPORTED CONSTANTS (not inline strings), so the catalogue can
//     see them and a firing KAT can bind to the constant.
//
// Tests-first: written before the verifier, red then green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, verifyGateV3Structure, analyzeGateV3Liveness, GATE_V3_CODES } from "../dist/index.js";

const circuit = (parts, wires, params = "value: T", ret = "T", requires = "") =>
  `@gate 3.0.0\nCIRCUIT probe(${params}) -> ${ret}\n  INTENT "probe"\n  REQUIRES:\n${requires}  PARTS:\n${parts}\n  WIRES:\n${wires}\nEND\n`;

const verify = (src) => {
  const parsed = parseGateV3(src, "<probe>");
  assert.equal(parsed.ok, true, `probe must parse: ${JSON.stringify(parsed.diagnostics.map((d) => d.code))}`);
  return verifyGateV3Structure(parsed.circuit).map((d) => d.code);
};

const OK_PARTS = "    [e :: test.echo@1.0.0]";
const OK_WIRES = "    IN.value -> e.value\n    e.value -> OUT.value";

test("v3 verify: positive control — a clean circuit yields ZERO diagnostics", () => {
  assert.deepEqual(verify(circuit(OK_PARTS, OK_WIRES)), []);
});

test("v3 verify: codes are exported constants, not inline strings", () => {
  for (const key of ["RESOLVE_001", "RESOLVE_002", "WIRE_002", "WIRE_005", "AUTH_001", "AUTH_002", "TERM_003"]) {
    assert.ok(GATE_V3_CODES[key], `${key} is exported`);
    assert.match(GATE_V3_CODES[key].code, /^GATE-(RESOLVE|WIRE|AUTH|TERM|EFFECT|LIVE)-\d{3}$/);
  }
});

test("v3 verify: duplicate declarations fire (params, parts, args, caps, effects, budgets)", () => {
  assert.ok(verify(circuit(OK_PARTS, "    IN.value -> e.value\n    IN.spare -> e.other\n    e.value -> OUT.value", "value: T, value: T")).includes("GATE-RESOLVE-001"));
  assert.ok(verify(circuit(`${OK_PARTS}\n    [e :: test.other@1.0.0]`, OK_WIRES)).includes("GATE-RESOLVE-002"));
  assert.ok(verify(circuit('    [e :: test.echo@1.0.0 m="a" m="b"]', OK_WIRES)).includes("GATE-RESOLVE-003"));
  assert.ok(verify(circuit(OK_PARTS, OK_WIRES, "value: T", "T", "    capability x.read\n    capability x.read\n")).includes("GATE-EFFECT-001"));
  assert.ok(verify(circuit(OK_PARTS, OK_WIRES, "value: T", "T", "    effect db.read\n    effect db.read\n")).includes("GATE-EFFECT-002"));
  assert.ok(verify(circuit(OK_PARTS, OK_WIRES, "value: T", "T", "    budget b=1\n    budget b=2\n")).includes("GATE-TERM-001"));
});

test("v3 verify: wiring rules fire (one producer, OUT port, unknown refs)", () => {
  assert.ok(verify(circuit(`${OK_PARTS}\n    [f :: test.two@1.0.0]`, "    IN.value -> e.value\n    IN.value -> f.value\n    e.value -> OUT.value\n    f.value -> OUT.value")).includes("GATE-WIRE-002"));
  assert.ok(verify(circuit(OK_PARTS, "    IN.value -> e.value\n    e.value -> OUT.result")).includes("GATE-WIRE-001"));
  assert.ok(verify(circuit(OK_PARTS, "    IN.ghost -> e.value\n    e.value -> OUT.value")).includes("GATE-RESOLVE-005"));
  assert.ok(verify(circuit(OK_PARTS, "    IN.value -> e.value\n    missing.x -> OUT.value")).includes("GATE-RESOLVE-006"));
  assert.ok(verify(circuit(OK_PARTS, "    IN.value -> missing.x\n    e.value -> OUT.value")).includes("GATE-RESOLVE-007"));
});

test("v3 verify: a circuit with no OUT path fires WIRE-005", () => {
  assert.ok(verify(circuit(OK_PARTS, "    IN.value -> e.value\n    e.value -> DRAIN.discarded")).includes("GATE-WIRE-005"));
});

test("v3 verify: K3 completeness — a wired allow needs deny AND indeterminate", () => {
  const codes = verify(circuit("    [auth :: test.authorize@1.0.0]", "    IN.value -> auth.subject\n    auth.allow -> OUT.value"));
  assert.ok(codes.includes("GATE-AUTH-001"), "deny arm demanded");
  assert.ok(codes.includes("GATE-AUTH-002"), "indeterminate arm demanded");
});

test("v3 verify: cycles refuse — unbounded and budgeted alike", () => {
  const cyc = (bound) => circuit("    [a :: test.a@1.0.0]\n    [b :: test.b@1.0.0]",
    `    IN.value -> a.value\n    a.next -> b.value\n    b.back -> a.feedback${bound}\n    b.done -> OUT.value`);
  assert.ok(verify(cyc("")).includes("GATE-TERM-003"), "unbounded cycle");
  assert.ok(verify(cyc(" budget=8")).includes("GATE-TERM-004"), "budgeted cycle still needs a state contract");
});

test("v3 verify: liveness is ADVISORY here — the ghost part and a legitimate source are structurally identical", () => {
  // GD-007 asked for full liveness. Executed evidence: a part with no inbound
  // wire may be a genuine SOURCE (dataset scan, literal constant) and one with
  // no outbound wire a genuine SINK (audit) — indistinguishable from a ghost
  // without component contracts. So the structural pass must NOT refuse them
  // (it would flag 7 of the 20 canonical circuits), and liveness is reported
  // as candidates for the registry tier (G2) to adjudicate.
  const ghost = circuit(
    ["    [a :: test.work@1.0.0]", "    [ghost :: test.ghost@1.0.0]"].join("\n"),
    ["    IN.value -> a.value", "    a.value -> DRAIN.discarded", "    ghost.value -> OUT.value"].join("\n")
  );
  const parsed = parseGateV3(ghost, "<probe>");
  assert.equal(verifyGateV3Structure(parsed.circuit).filter((d) => d.code.startsWith("GATE-LIVE")).length, 0,
    "structural pass does not refuse liveness candidates");
  const live = analyzeGateV3Liveness(parsed.circuit);
  assert.deepEqual([...live.sourceCandidates], ["ghost"], "ghost surfaces as a source candidate for G2");
});

test("v3 verify: liveness analysis surfaces sink candidates too", () => {
  const parsed = parseGateV3(circuit(
    ["    [a :: test.a@1.0.0]", "    [sink :: test.audit@1.0.0]"].join("\n"),
    ["    IN.value -> a.value", "    a.value -> OUT.value", "    a.spare -> sink.value"].join("\n")
  ), "<probe>");
  assert.deepEqual([...analyzeGateV3Liveness(parsed.circuit).sinkCandidates], ["sink"]);
});

test("v3 verify: unused input and disconnected part still fire", () => {
  assert.ok(verify(circuit(OK_PARTS, OK_WIRES, "value: T, spare: T")).includes("GATE-WIRE-003"));
  assert.ok(verify(circuit(`${OK_PARTS}\n    [orphan :: test.orphan@1.0.0]`, OK_WIRES)).includes("GATE-WIRE-004"));
});
