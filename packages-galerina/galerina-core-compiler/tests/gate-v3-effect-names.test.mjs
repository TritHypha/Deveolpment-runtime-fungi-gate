// gate-v3-effect-names.test.mjs — experimental-map iteration 4's GAP.
//
// THE PARITY THE PROTOCOL DEMANDS. `.fungi`'s effect-checker holds a CLOSED
// `CANONICAL_EFFECTS` set and a production compile refuses an unknown effect
// name outright. `.gate` had no such check: `GATE-SEM-009` compares the
// component's declared effects against the circuit's declared envelope, so a
// name misspelled CONSISTENTLY on both sides satisfied it and passed clean.
//
// That is one governance system accepting what its twin refuses, which the
// experimental-map protocol classifies as a GAP rather than a boundary — the
// effect vocabulary is shared governance, not a `.gate` design choice.
//
// It matters beyond typos: an effect name is what an admission policy filters
// on. `databse.write` is invisible to a rule watching `database.write`, so a
// misspelling silently exempts a component from the policy that governs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseGateV3, loadGateV3Registry, verifyEffectNames, dispatchGateSource } from "../dist/index.js";

const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");
const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");

const digest = (s) => `sha256:${s.repeat(64).slice(0, 64)}`;

function build({ componentEffects = [], envelope = [], capabilities = [] }) {
  const source = `@gate 3.0.0
CIRCUIT save(v: T) -> T
  INTENT "effect-name probe"
  REQUIRES:
${envelope.map((e) => `    effect ${e}`).join("\n")}${envelope.length ? "\n" : ""}${capabilities.map((c) => `    capability ${c}`).join("\n")}${capabilities.length ? "\n" : ""}  PARTS:
    [s :: app.save@1.0.0]
  WIRES:
    IN.v -> s.value
    s.value -> OUT.value
END
`;
  const registry = {
    version: "1.0.0",
    types: [{ id: "T", kind: "opaque", construction: "source" }],
    components: [{
      id: "app.save", version: "1.0.0", status: "SHIPPED", implementationDigest: digest("a"),
      inputs: [{ name: "value", type: "T", required: true }],
      outputs: [{ name: "value", type: "T" }],
      arguments: [], effects: componentEffects, capabilities,
    }],
  };
  const parsed = parseGateV3(source, "<effects>.gate");
  assert.equal(parsed.ok, true, "fixture must parse");
  const loaded = loadGateV3Registry(registry, "<effects registry>");
  assert.equal(loaded.ok, true, `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  return { circuit: parsed.circuit, registry: loaded.registry, source, raw: registry };
}

test("effect names: a canonical effect on both sides is SILENT", () => {
  const { circuit, registry } = build({ componentEffects: ["database.write"], envelope: ["database.write"] });
  assert.deepEqual(verifyEffectNames(circuit, registry), []);
});

test("effect names: a name misspelled CONSISTENTLY on both sides now REFUSES", () => {
  // The gap, as measured: SEM-009 is satisfied (they agree), so without this
  // rule the circuit passed clean.
  const { circuit, registry } = build({ componentEffects: ["databse.write"], envelope: ["databse.write"] });
  const diagnostics = verifyEffectNames(circuit, registry);
  const codes = diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-012"), `expected SEM-012, got ${codes.join(" ") || "(clean)"}`);
  assert.ok(diagnostics.some((d) => /databse\.write/.test(d.message)), "the refusal must name the offending effect");
});

test("effect names: the ENVELOPE is checked too, not only contracts", () => {
  // A circuit may declare an envelope effect no component exercises (legal —
  // an upper bound). It must still be a REAL effect name.
  const { circuit, registry } = build({ componentEffects: ["database.write"], envelope: ["database.write", "netwrok.outbound"] });
  const codes = verifyEffectNames(circuit, registry).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-012"]);
});

test("effect names: capabilities are NOT judged — they are an open vocabulary", () => {
  // Capabilities are application-defined (`customer.read`, `refund.issue`),
  // unlike effects which name a closed set of host interactions. Judging them
  // against a fixed list would refuse every legitimate application.
  const { circuit, registry } = build({ componentEffects: [], envelope: [], capabilities: ["anything.at.all"] });
  assert.deepEqual(verifyEffectNames(circuit, registry), []);
});

test("effect names: every shipped example uses canonical effects", () => {
  for (const name of ["01-authorized-read", "02-write-transaction", "03-phi-redaction", "04-tenant-scoped-search", "05-token-verify"]) {
    const source = readFileSync(join(EXAMPLES, `${name}.gate`), "utf8");
    const raw = JSON.parse(readFileSync(join(REGISTRIES, `${name}.registry.json`), "utf8"));
    const parsed = parseGateV3(source, name);
    const loaded = loadGateV3Registry(raw, name);
    assert.equal(parsed.ok && loaded.ok, true);
    assert.deepEqual(verifyEffectNames(parsed.circuit, loaded.registry).map((d) => d.code), [], `${name} must use canonical effect names`);
  }
});

test("effect names: reachable through the PRODUCTION dispatcher", () => {
  const { source, raw } = build({ componentEffects: ["databse.write"], envelope: ["databse.write"] });
  const codes = dispatchGateSource(source, "<effects>.gate", { registry: raw }).diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-012"), `dispatch must surface it, got: ${codes.join(" ")}`);
});
