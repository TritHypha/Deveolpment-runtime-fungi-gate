// gate-v3-sinks.test.mjs — experimental-map iteration 5's GAP.
//
// THE HOLE. `.gate`'s privacy fence (SEM-002/003) governs EGRESS, and egress
// meant `OUT` — the circuit's return. But a value leaves the trust boundary
// through any GOVERNED SINK: a network send, an outbound email, an audit
// write. `.fungi` has always known this — FUNGI-VALUESTATE-003/004 refuse an
// unsafe or tainted value reaching ANY governed sink, not merely a return.
//
// Measured before the fix: a `tainted: true` read wired straight into a
// `network.outbound` component, with a declared cut present but guarding only
// the OUT path, passed CLEAN. That is the textbook PII-exfiltration shape and
// the circuit certified it.
//
// SINKS ARE DERIVED FROM DECLARED EFFECTS, NOT FROM A `sink: true` FLAG. An
// opt-in flag would mean a forgotten declaration equals no protection — the
// fail-OPEN default. Effects are already mandatory and already checked
// (SEM-009/012), so deriving the sink set from them makes the protection
// automatic: to have a network effect at all is to be a sink.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, buildGateGraph, loadGateV3Registry, verifyTaintReachesSink, dispatchGateSource } from "../dist/index.js";

const digest = (s) => `sha256:${s.repeat(64).slice(0, 64)}`;

function registryFor(sinkEffect, { cut = true } = {}) {
  return {
    version: "1.0.0",
    types: [
      { id: "Request", kind: "opaque", construction: "source" },
      { id: "Pii", kind: "record", construction: "source" },
      { id: "Redacted", kind: "record", construction: "canonical-only" },
      { id: "Ack", kind: "record", construction: "canonical-only" },
    ],
    components: [
      { id: "app.read.pii", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("a"), tainted: true,
        inputs: [{ name: "req", type: "Request", required: true }],
        outputs: [{ name: "value", type: "Pii", copyable: true }],
        arguments: [], effects: ["database.read"], capabilities: [] },
      { id: "galerina.privacy.cut", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("b"), ...(cut ? { cut: true } : {}),
        inputs: [{ name: "value", type: "Pii", required: true }],
        outputs: [{ name: "value", type: "Redacted", copyable: true }],
        arguments: [], effects: [], capabilities: [] },
      { id: "app.net.send", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("c"),
        inputs: [{ name: "body", type: "Pii", required: true }],
        outputs: [{ name: "value", type: "Ack" }],
        arguments: [], effects: [sinkEffect], capabilities: [] },
      { id: "app.net.send_safe", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("d"),
        inputs: [{ name: "body", type: "Redacted", required: true }],
        outputs: [{ name: "value", type: "Ack" }],
        arguments: [], effects: [sinkEffect], capabilities: [] },
    ],
  };
}

const LEAK = `@gate 3.0.0
CIRCUIT forward(req: Request) -> Redacted
  INTENT "tainted read reaches a governed sink, bypassing the cut"
  REQUIRES:
    effect database.read
    effect network.outbound
  PARTS:
    [read :: app.read.pii@1.0.0]
    [cut :: galerina.privacy.cut@1.0.0]
    [send :: app.net.send@1.0.0]
  WIRES:
    IN.req -> read.req
    read.value -> cut.value
    read.value -> send.body
    send.value -> DRAIN.ack
    cut.value -> OUT.value
END
`;

const SAFE = `@gate 3.0.0
CIRCUIT forward(req: Request) -> Redacted
  INTENT "the sink is fed from the cut, as it must be"
  REQUIRES:
    effect database.read
    effect network.outbound
  PARTS:
    [read :: app.read.pii@1.0.0]
    [cut :: galerina.privacy.cut@1.0.0]
    [send :: app.net.send_safe@1.0.0]
  WIRES:
    IN.req -> read.req
    read.value -> cut.value
    cut.value -> send.body
    send.value -> DRAIN.ack
    cut.value -> OUT.value
END
`;

function run(source, registry) {
  const parsed = parseGateV3(source, "<sink>.gate");
  assert.equal(parsed.ok, true, "fixture must parse");
  const loaded = loadGateV3Registry(registry, "<sink registry>");
  assert.equal(loaded.ok, true, `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  return verifyTaintReachesSink(parsed.circuit, buildGateGraph(parsed.circuit), loaded.registry);
}

test("sinks: tainted data reaching a network sink past the cut REFUSES", () => {
  const codes = run(LEAK, registryFor("network.outbound")).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-013"], "the exfiltration shape must refuse");
});

test("sinks: the same circuit fed FROM the cut is silent", () => {
  // The control that makes the refusal mean something: identical topology
  // except the sink's producer, so a blanket "any sink refuses" rule would
  // fail here.
  assert.deepEqual(run(SAFE, registryFor("network.outbound")), []);
});

test("sinks: every egress-class effect is a sink, not just network", () => {
  for (const effect of ["network.outbound", "network.external", "email.send", "audit.write"]) {
    const codes = run(LEAK.replace("effect network.outbound", `effect ${effect}`), registryFor(effect)).map((d) => d.code);
    assert.deepEqual(codes, ["GATE-SEM-013"], `${effect} must count as a governed sink`);
  }
});

test("sinks: database.write is NOT egress — storing PII is ordinary, sending it is not", () => {
  // The distinction that keeps the rule honest. A tainted value written to the
  // application's own database has not left the trust boundary; refusing it
  // would make the rule unusable and teach authors to disable it.
  const codes = run(LEAK.replace("effect network.outbound", "effect database.write"), registryFor("database.write")).map((d) => d.code);
  assert.deepEqual(codes, [], "an internal write is not exfiltration");
});

test("sinks: no declared taint source — silent, scope not approval", () => {
  const registry = registryFor("network.outbound");
  delete registry.components.find((c) => c.id === "app.read.pii").tainted;
  assert.deepEqual(run(LEAK, registry), []);
});

test("sinks: reachable through the PRODUCTION dispatcher", () => {
  const codes = dispatchGateSource(LEAK, "<sink>.gate", { registry: registryFor("network.outbound") }).diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-013"), `dispatch must surface it, got: ${codes.join(" ")}`);
});
