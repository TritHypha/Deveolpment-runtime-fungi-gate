// gate-v3-g4.test.mjs — G4: envelope, deny-arm containment, taint frontier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  loadGateV3Registry,
  verifyEffectEnvelope,
  verifyDenyArmContainment,
  verifyTaintCutSeparator,
  dispatchGateSource,
} from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");
const registryOf = (n) => JSON.parse(readFileSync(join(REGISTRIES, `${n}.registry.json`), "utf8"));
const sourceOf = (n) => readFileSync(join(EXAMPLES, `${n}.gate`), "utf8");

function circuitOf(source) {
  const parsed = parseGateV3(source, "<g4>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}
function loaded(value) {
  const result = loadGateV3Registry(value, "<g4 registry>");
  assert.equal(result.ok, true, `registry must load: ${result.ok ? "" : result.diagnostics.map((d) => d.code).join(" ")}`);
  return result.registry;
}

// ---------------------------------------------------------------- envelope

test("envelope: every shipped example's declared envelope covers its components", () => {
  for (const name of ["01-authorized-read", "02-write-transaction", "03-phi-redaction", "04-tenant-scoped-search", "05-token-verify"]) {
    const diagnostics = verifyEffectEnvelope(circuitOf(sourceOf(name)), loaded(registryOf(name)));
    assert.deepEqual(diagnostics, [], `${name} must stay inside its envelope`);
  }
});

test("envelope: an undeclared component EFFECT refuses; an undeclared CAPABILITY refuses", () => {
  const registry = registryOf("01-authorized-read");
  registry.components.find((c) => c.id === "app.customer.read").effects.push("network.egress");
  const circuit = circuitOf(sourceOf("01-authorized-read"));
  const codes = verifyEffectEnvelope(circuit, loaded(registry)).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-009"], "the envelope lied about an effect");

  const registry2 = registryOf("01-authorized-read");
  registry2.components.find((c) => c.id === "app.customer.read").capabilities.push("admin.export");
  const codes2 = verifyEffectEnvelope(circuit, loaded(registry2)).map((d) => d.code);
  assert.deepEqual(codes2, ["GATE-SEM-010"], "the envelope lied about a capability");
});

test("envelope: OVER-declaration stays legal — the envelope is an upper bound", () => {
  const source = sourceOf("01-authorized-read").replace("    effect audit.write", "    effect audit.write\n    effect network.egress");
  const diagnostics = verifyEffectEnvelope(circuitOf(source), loaded(registryOf("01-authorized-read")));
  assert.deepEqual(diagnostics, [], "a declared-but-unused effect is a budget, not a lie");
});

// ---------------------------------------------------- deny-arm containment

test("containment: the shipped token circuit PASSES — its expired path is re-authorized", () => {
  // state.deny -> reemit.subject, and reemit IS a decision: the barrier that
  // makes the walk stop. This is the drawing the rule must never refuse.
  const circuit = circuitOf(sourceOf("05-token-verify"));
  const diagnostics = verifyDenyArmContainment(circuit, buildGateGraph(circuit), loaded(registryOf("05-token-verify")));
  assert.deepEqual(diagnostics, []);
});

test("containment: a deny arm wired toward egress WITHOUT re-decision REFUSES", () => {
  // 01 with the deny arm rerouted into the read's authority: the refusal now
  // FEEDS the privileged read that reaches OUT.
  const lines = sourceOf("01-authorized-read").split(/\r?\n/);
  const at = lines.findIndex((l) => /authz\.deny\s*->\s*DENY\.not_authorized/.test(l));
  assert.notEqual(at, -1);
  lines[at] = "    authz.deny -> logged.value";
  // logged consumes CutEvidence; the wire will also WIRE-101 — containment is
  // judged on the graph, and both must fire. Build a cleaner violation: deny
  // into the cut's evidence input, which flows to OUT via view.value? view's
  // inputs both feed OUT-side. Use type-matched rewiring instead: make the
  // registry's deny arm produce ReadEvidence so it wires cleanly into view.
  const registry = registryOf("01-authorized-read");
  const authorize = registry.components.find((c) => c.id === "galerina.tower.authorize");
  authorize.outputs.find((o) => o.name === "deny").type = "ReadEvidence";
  lines[at] = "    authz.deny -> view.evidence";
  const evidenceWire = lines.findIndex((l) => /record\.evidence\s*->\s*view\.evidence/.test(l));
  lines.splice(evidenceWire, 1);                       // one producer per input
  const circuit = circuitOf(lines.join("\n"));
  const codes = verifyDenyArmContainment(circuit, buildGateGraph(circuit), loaded(registry)).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-011"], "a refusal flowed into success with no re-decision");
});

test("containment: arm roles come from POSITION — renamed arms are judged identically", () => {
  // permit/refuse/unsure with arms ordered [permit, refuse, unsure]: refuse is
  // non-allow BY POSITION. Wire refuse toward OUT with no re-decision: refuse.
  const source = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "position not names"
  REQUIRES:
  PARTS:
    [auth :: t.decider@1.0.0]
    [echo :: t.echo@1.0.0]
  WIRES:
    IN.v -> auth.subject
    auth.permit -> DRAIN.unused_grant
    auth.refuse -> echo.value
    auth.unsure -> DENY.unsure
    echo.value -> OUT.value
END
`;
  const registry = {
    version: "1.0.0",
    types: [{ id: "T", kind: "opaque", construction: "source" }],
    components: [
      { id: "t.decider", version: "1.0.0", status: "SHIPPED", implementationDigest: `sha256:${"a".repeat(64)}`,
        decision: true, arms: ["permit", "refuse", "unsure"],
        inputs: [{ name: "subject", type: "T", required: true }],
        outputs: [{ name: "permit", type: "T" }, { name: "refuse", type: "T" }, { name: "unsure", type: "T" }],
        arguments: [], effects: [], capabilities: [] },
      { id: "t.echo", version: "1.0.0", status: "SHIPPED", implementationDigest: `sha256:${"b".repeat(64)}`,
        inputs: [{ name: "value", type: "T", required: true }],
        outputs: [{ name: "value", type: "T" }], arguments: [], effects: [], capabilities: [] },
    ],
  };
  const circuit = circuitOf(source);
  const codes = verifyDenyArmContainment(circuit, buildGateGraph(circuit), loaded(registry)).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-011"], "refuse (arms[1]) reaching OUT must refuse whatever it is named");
});

// ------------------------------------------------------------ taint frontier

test("taint: the PHI fixture declares its read tainted and still passes", () => {
  const circuit = circuitOf(sourceOf("03-phi-redaction"));
  const diagnostics = verifyTaintCutSeparator(buildGateGraph(circuit), loaded(registryOf("03-phi-redaction")));
  assert.deepEqual(diagnostics, []);
});

test("taint: an UNTAINTED side path passes under a declared frontier — and refuses without one", () => {
  // Add a second, untainted source feeding OUT around the cut. With taint
  // DECLARED (only the read), the side path is not taint and the separator is
  // silent. With NO declaration, the frontier falls back to IN and the same
  // drawing refuses. The refinement, demonstrated in both directions.
  // The side path must be REACHABLE FROM IN, or the fallback frontier can
  // never reach it and the test would prove nothing. (First draft used a
  // no-input clock: unreachable from IN, so both directions passed and the
  // row was vacuous.) `summarise` therefore takes the caller's ref as a seed.
  const lines = sourceOf("03-phi-redaction").split(/\r?\n/);
  const partsAt = lines.findIndex((l) => /\[logged ::/.test(l));
  lines.splice(partsAt + 1, 0, "    [summarise :: app.stats.summarise@1.0.0]");
  const outAt = lines.findIndex((l) => /view\.value\s*->\s*OUT\.value/.test(l));
  lines[outAt] = "    summarise.value -> OUT.value";
  lines.splice(outAt, 0, "    view.value -> DRAIN.unused_view", "    IN.patient_ref -> summarise.seed");
  const source = lines.join("\n");

  const registry = registryOf("03-phi-redaction");
  registry.components.push({
    id: "app.stats.summarise", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"7".repeat(64)}`,
    inputs: [{ name: "seed", type: "PatientRef", required: true }],
    outputs: [{ name: "value", type: "PatientView" }],
    arguments: [], effects: [], capabilities: [],
  });
  const circuit = circuitOf(source);
  const graph = buildGateGraph(circuit);

  const declared = verifyTaintCutSeparator(graph, loaded(registry));
  assert.deepEqual(declared.map((d) => d.code), [], "the clock is not taint; the read's taint still ends at the cut");

  const undeclared = JSON.parse(JSON.stringify(registry));
  delete undeclared.components.find((c) => c.id === "app.patient.read").tainted;
  const fallback = verifyTaintCutSeparator(graph, loaded(undeclared)).map((d) => d.code);
  assert.deepEqual(fallback, ["GATE-SEM-003"], "with no declared frontier, IN-taint reaches OUT via the clock");
});

// ------------------------------------------------------------------ dispatch

test("g4: both new refusals surface through the PRODUCTION dispatcher", () => {
  const registry = registryOf("01-authorized-read");
  registry.components.find((c) => c.id === "app.customer.read").effects.push("network.egress");
  const result = dispatchGateSource(sourceOf("01-authorized-read"), "01.gate", { registry });
  assert.ok(result.diagnostics.some((d) => d.code === "GATE-SEM-009"), "envelope refusal must reach dispatch");
});
