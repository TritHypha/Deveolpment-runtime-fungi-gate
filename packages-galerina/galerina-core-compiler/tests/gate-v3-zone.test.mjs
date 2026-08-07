// gate-v3-zone.test.mjs — G5 rung 1: the zone seam (GD-R09).
//
// THE PROPERTY: fields carry a zone. An `opaque` value may be scanned and
// routed in the untrusted zone; a `semantic` value may only be evaluated after
// a declared trust transition has ALLOWED it. Three ways that can break, and
// this KAT drives each one red before showing it green:
//
//   1. semantic work with NO gate declared anywhere — absence of a gate is not
//      permission, so this refuses rather than passing silently;
//   2. a bypass wire reaching semantic work without passing the gate;
//   3. semantic work hanging off the gate's REFUSAL arm — it passed the gate,
//      on the arm that said no. Domination alone cannot catch this one, which
//      is why the pass checks arms as well, and why case 3 exists.
//
// The negative control matters as much as the positives: an identical circuit
// with the zone tag REMOVED must go silent. If it still refused, the pass would
// be reacting to the shape rather than to the declared obligation, and every
// green elsewhere in the suite would be worth less.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseGateV3,
  buildGateGraph,
  loadGateV3Registry,
  verifyZoneDomination,
  GATE_SEM_014,
} from "../dist/index.js";

const port = (name, type) => ({ name, type });

/** A registry where `Row` is semantic and `evaluate` consumes it. `gated`
 *  toggles whether the transition is declared; `semantic` toggles the zone
 *  tag itself, which is what the negative control needs. */
function registryFor({ gated = true, semantic = true } = {}) {
  return {
    version: "1.0.0",
    types: [
      { id: "Raw", kind: "opaque", construction: "source" },
      { id: "Row", kind: "opaque", construction: "source", ...(semantic ? { zone: "semantic" } : {}) },
      { id: "Report", kind: "opaque", construction: "source" },
    ],
    components: [
      {
        id: "q.scan", version: "1.0.0", status: "SHIPPED",
        implementationDigest: `sha256:${"a".repeat(64)}`,
        inputs: [port("subject", "Raw")], outputs: [port("rows", "Raw")],
        arguments: [], effects: ["database.read"], capabilities: [],
      },
      {
        id: "q.gate", version: "1.0.0", status: "SHIPPED",
        implementationDigest: `sha256:${"b".repeat(64)}`,
        inputs: [port("subject", "Raw")],
        outputs: [port("allow", "Raw"), port("deny", "Raw")],
        arguments: [], effects: [], capabilities: [],
        decision: true, arms: ["allow", "deny"],
        ...(gated ? { zoneGate: true } : {}),
      },
      {
        // The semantic op: it DECLARES a Row port, so the obligation is the
        // component's, not this drawing's.
        id: "q.evaluate", version: "1.0.0", status: "SHIPPED",
        implementationDigest: `sha256:${"c".repeat(64)}`,
        inputs: [port("subject", "Row")], outputs: [port("value", "Report")],
        arguments: [], effects: [], capabilities: [],
      },
    ],
  };
}

const GATED = `@gate 3.0.0
CIRCUIT q(raw: Raw) -> Report
  INTENT "Semantic evaluation only on the allow arm."
  REQUIRES:
    effect database.read
  PARTS:
    [scan :: q.scan@1.0.0]
    [gate :: q.gate@1.0.0]
    [eval :: q.evaluate@1.0.0]
  WIRES:
    IN.raw -> scan.subject
    scan.rows -> gate.subject
    gate.allow -> eval.subject
    gate.deny -> DENY.refused
    eval.value -> OUT.value
END
`;

const BYPASS = `@gate 3.0.0
CIRCUIT q(raw: Raw) -> Report
  INTENT "A bypass wire reaches semantic work without the gate."
  REQUIRES:
    effect database.read
  PARTS:
    [scan :: q.scan@1.0.0]
    [gate :: q.gate@1.0.0]
    [eval :: q.evaluate@1.0.0]
  WIRES:
    IN.raw -> scan.subject
    scan.rows -> gate.subject
    scan.rows -> eval.subject
    gate.allow -> DENY.unused
    gate.deny -> DENY.refused
    eval.value -> OUT.value
END
`;

const ON_DENY_ARM = `@gate 3.0.0
CIRCUIT q(raw: Raw) -> Report
  INTENT "Semantic work hanging off the arm that said no."
  REQUIRES:
    effect database.read
  PARTS:
    [scan :: q.scan@1.0.0]
    [gate :: q.gate@1.0.0]
    [eval :: q.evaluate@1.0.0]
  WIRES:
    IN.raw -> scan.subject
    scan.rows -> gate.subject
    gate.deny -> eval.subject
    gate.allow -> DENY.unused
    eval.value -> OUT.value
END
`;

function check(source, options) {
  const parsed = parseGateV3(source, "<zone>.gate");
  assert.equal(parsed.ok, true,
    `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  const loaded = loadGateV3Registry(registryFor(options), "<zone registry>");
  assert.equal(loaded.ok, true,
    `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.message).join(" | ")}`);
  return verifyZoneDomination(buildGateGraph(parsed.circuit, loaded.registry), loaded.registry);
}

test("a semantic part on the allow arm is accepted", () => {
  assert.deepEqual(check(GATED, {}), []);
});

test("semantic work with NO zone gate declared REFUSES — absence is not permission", () => {
  const found = check(GATED, { gated: false });
  assert.equal(found.length, 1, "must refuse");
  assert.equal(found[0].code, GATE_SEM_014.code);
  assert.match(found[0].message, /no zoneGate declared/);
});

test("a bypass wire around the gate REFUSES", () => {
  const found = check(BYPASS, {});
  assert.equal(found.length, 1);
  assert.equal(found[0].code, GATE_SEM_014.code);
  assert.match(found[0].message, /not dominated/);
});

test("semantic work on the REFUSAL arm refuses — domination alone would miss this", () => {
  // The control that makes this case load-bearing: `eval` IS dominated by the
  // gate here, so a domination-only check passes it. Only reading the arms
  // catches a part that passed the gate on the arm that said no.
  const found = check(ON_DENY_ARM, {});
  assert.equal(found.length, 1);
  assert.equal(found[0].code, GATE_SEM_014.code);
  assert.match(found[0].message, /refusal arm/);
});

test("NEGATIVE CONTROL — with the zone tag removed the pass is silent", () => {
  // Same three shapes, no declared obligation. If any of these refused, the
  // pass would be reacting to topology rather than to the contract, and its
  // greens elsewhere would prove nothing.
  assert.deepEqual(check(GATED, { semantic: false }), []);
  assert.deepEqual(check(BYPASS, { semantic: false }), []);
  assert.deepEqual(check(ON_DENY_ARM, { semantic: false }), []);
  assert.deepEqual(check(BYPASS, { semantic: false, gated: false }), []);
});
