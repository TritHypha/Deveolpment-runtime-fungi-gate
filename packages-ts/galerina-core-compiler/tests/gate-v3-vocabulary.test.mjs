// gate-v3-vocabulary.test.mjs — G3 rung 9: per-terminal reason vocabularies
// (KTA plan 27, step 9; GD-009 under ruling ④).
//
// Ruling ④ forbade v2's B1 polarity lexicon — a word-list guessing whether a
// reason SOUNDS positive. The vocabulary option replaces guessing with
// declaration: DENY.approved refuses not because "approved" reads happy but
// because the deny vocabulary never admitted it. And absence of a vocabulary
// is absence of the CHECK, labelled (GD-018), never a silent green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, loadGateV3Registry, verifyTerminalVocabulary, dispatchGateSource } from "../dist/index.js";

const SOURCE = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "vocabulary probe"
  REQUIRES:
  PARTS:
    [e :: test.echo@1.0.0]
  WIRES:
    IN.v -> e.value
    e.value -> OUT.value
    e.spare -> DENY.approved_and_successful
END
`;

const registryWith = (vocabularies) => ({
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "test.echo", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "value", type: "T" }],
    outputs: [{ name: "value", type: "T" }, { name: "spare", type: "T" }],
    arguments: [], effects: [], capabilities: []
  }],
  ...(vocabularies ? { vocabularies } : {})
});

function run(vocabularies, source = SOURCE) {
  const parsed = parseGateV3(source, "<vocab>.gate");
  assert.equal(parsed.ok, true);
  const loaded = loadGateV3Registry(registryWith(vocabularies), "<vocab registry>");
  assert.equal(loaded.ok, true, `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  return verifyTerminalVocabulary(parsed.circuit, loaded.registry);
}

test("vocabulary: GD-009's construction REFUSES once a deny vocabulary is declared", () => {
  const diagnostics = run({ deny: ["not_authorized", "authority_unknown"] });
  const errors = diagnostics.filter((d) => d.severity === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, "GATE-SEM-007");
  assert.match(errors[0].message, /approved_and_successful/);
});

test("vocabulary: a declared reason PASSES — the set, not the sentiment, decides", () => {
  // The same 'positive-sounding' reason is ADMISSIBLE when declared: the exact
  // difference between this rule and the B1 lexicon ruling ④ forbade.
  const diagnostics = run({ deny: ["approved_and_successful"] });
  assert.deepEqual(diagnostics.filter((d) => d.severity === "error"), []);
});

test("vocabulary: NO vocabulary — one INFO label per family, never silence", () => {
  const diagnostics = run(undefined);
  assert.deepEqual(diagnostics.map((d) => [d.code, d.severity]), [["GATE-SEM-008", "info"]]);
  assert.match(diagnostics[0].message, /DENY/);
});

test("vocabulary: families are independent — deny checked, drain labelled", () => {
  const source = SOURCE.replace("END", "    e.value -> DRAIN.logged\nEND");
  // e.value now fans out (OUT + DRAIN) — irrelevant here; this rule reads
  // wires only. deny declared, drain not: one refusal-free deny check, one
  // drain label.
  const diagnostics = run({ deny: ["approved_and_successful"] }, source);
  assert.deepEqual(diagnostics.map((d) => [d.code, d.severity]), [["GATE-SEM-008", "info"]]);
  assert.match(diagnostics[0].message, /DRAIN/);
});

test("vocabulary: a malformed block refuses the REGISTRY with GATE-REGISTRY-015", () => {
  for (const bad of [
    { deny: "not_a_list" },
    { unknown_family: ["x"] },
    { deny: ["ok", "ok"] },
    { deny: [7] },
  ]) {
    const loaded = loadGateV3Registry(registryWith(bad), "<malformed>");
    assert.equal(loaded.ok, false, `${JSON.stringify(bad)} must refuse`);
    assert.ok(loaded.diagnostics.some((d) => d.code === "GATE-REGISTRY-015"),
      `expected REGISTRY-015, got ${loaded.diagnostics.map((d) => d.code).join(" ")}`);
  }
});

test("vocabulary: reachable through the PRODUCTION dispatcher", () => {
  const result = dispatchGateSource(SOURCE, "<vocab>.gate", { registry: registryWith({ deny: ["not_authorized"] }) });
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-007"), `dispatch must surface the refusal, got: ${codes.join(" ")}`);
});
