// gate-v3-decision-shape.test.mjs — G3 rung 6: GD-008's SECONDARY half.
//
// Cycle 0070 proved the original evasion still passed with ZERO diagnostics at
// ANY severity in both engines: ports spelled permit/refuse/indeterminate,
// component declaring nothing. This suite is that construction turned into a
// permanent row — it must now draw GATE-SEM-004 at WARNING severity — plus the
// controls that keep the backstop honest (declared decisions silent, genuinely
// non-decision components silent).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, loadGateV3Registry, verifyDecisionShapes, dispatchGateSource } from "../dist/index.js";

const decider = (extra = {}) => ({
  id: "test.decider",
  version: "1.0.0",
  status: "SHIPPED",
  implementationDigest: `sha256:${"b".repeat(64)}`,
  inputs: [{ name: "subject", type: "T" }],
  outputs: [
    { name: "permit", type: "T", copyable: true },
    { name: "refuse", type: "T", copyable: true },
    { name: "indeterminate", type: "T", copyable: true }
  ],
  arguments: [],
  effects: [],
  capabilities: [],
  ...extra
});

const registryOf = (component) => ({
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }, { id: "U", kind: "opaque", construction: "source" }],
  components: [component]
});

const SOURCE = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "decision shape probe"
  REQUIRES:
  PARTS:
    [auth :: test.decider@1.0.0]
  WIRES:
    IN.v -> auth.subject
    auth.permit -> OUT.value
    auth.refuse -> DENY.refused
    auth.indeterminate -> DRAIN.unsure
END
`;

function run(component) {
  const parsed = parseGateV3(SOURCE, "<shape>.gate");
  assert.equal(parsed.ok, true);
  const loaded = loadGateV3Registry(registryOf(component), "<shape registry>");
  assert.equal(loaded.ok, true, `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  return verifyDecisionShapes(parsed.circuit, loaded.registry);
}

test("shape: the cycle-0070 evasion now DRAWS THE WARNING — three same-type outputs, undeclared", () => {
  const diagnostics = run(decider());
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "GATE-SEM-004");
  assert.equal(diagnostics[0].severity, "warning", "the ruling made this a WARNING, not an error");
});

test("shape: a DECLARED decision is silent — the primary half owns it", () => {
  assert.deepEqual(run(decider({ decision: true, arms: ["permit", "refuse", "indeterminate"] })), []);
});

test("shape: two outputs are silent — not K3-shaped", () => {
  assert.deepEqual(run(decider({
    outputs: [{ name: "permit", type: "T", copyable: true }, { name: "refuse", type: "T", copyable: true }]
  })), []);
});

test("shape: three MIXED-TYPE outputs are silent — a splitter, not a verdict", () => {
  assert.deepEqual(run(decider({
    outputs: [
      { name: "a", type: "T", copyable: true },
      { name: "b", type: "U", copyable: true },
      { name: "c", type: "T", copyable: true }
    ]
  })), []);
});

test("shape: PORT NAMES are never consulted — innocuous names still warn", () => {
  // Same K3 shape, names that resemble nothing authority-like. If this row
  // ever goes quiet while the permit/refuse row still warns, a name check has
  // crept in — the exact regression this defect began as.
  const diagnostics = run(decider({
    outputs: [
      { name: "red", type: "T", copyable: true },
      { name: "green", type: "T", copyable: true },
      { name: "blue", type: "T", copyable: true }
    ]
  }));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "GATE-SEM-004");
});

test("shape: surfaced through the PRODUCTION dispatcher at warning severity", () => {
  const result = dispatchGateSource(SOURCE, "<shape>.gate", { registry: registryOf(decider()) });
  const hit = result.diagnostics.find((d) => d.code === "GATE-SEM-004");
  assert.ok(hit, "dispatch must surface the warning");
  assert.equal(hit.severity, "warning");
  // And it must NOT flip the overall verdict: warnings advise, errors refuse.
  const errors = result.diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002");
  assert.deepEqual(errors.map((d) => d.code), [], "an undeclared shape warns; it does not refuse");
});
