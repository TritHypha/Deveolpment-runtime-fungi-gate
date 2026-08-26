// gate-v3-admission.test.mjs — G7.1: the admission statement builder.
//
// Exit criteria under test (KTA 37 §5, rung G7.1): byte-identical canonical
// output for identical input; every ratified binding present; construction
// fails closed on each missing binding. Bindings 9–10 (suite, signatures) are
// envelope-level and OUT of this rung.
//
// ★ Determinism is proven through the REAL canonicaliser — the release-evidence
// encoder the production envelope uses — imported across the package boundary,
// not a stand-in. A determinism proof through a mock canonicaliser would prove
// the mock deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  parseGateV3,
  loadGateV3Registry,
  buildGateGraph,
  circuitProofs,
  lowerCircuitToGIR,
  buildAdmissionStatement,
  verifyAdmissionBindings,
  dispatchGateSource,
} from "../dist/index.js";

const { canonicalReleaseEvidenceBytes } = await import(
  pathToFileURL(resolve(import.meta.dirname, "..", "..", "..", "scripts", "lib", "beta-release-evidence-envelope.mjs")).href
);
const seams = { canonicalBytes: canonicalReleaseEvidenceBytes };

const REGISTRY_VALUE = {
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "c.echo", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "subject", type: "T" }],
    outputs: [{ name: "value", type: "T" }],
    arguments: [], effects: [], capabilities: [],
  }],
};

const SOURCE = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "admission probe"
  REQUIRES:
  PARTS:
    [a :: c.echo@1.0.0]
  WIRES:
    IN.v -> a.subject
    a.value -> OUT.value
END
`;

/** Everything the builder needs, from the production pipeline surfaces. */
function inputsFor(source, registryValue) {
  const parsed = parseGateV3(source, "<admission>.gate");
  assert.equal(parsed.ok, true, "fixture parses");
  const loaded = loadGateV3Registry(registryValue, "<admission registry>");
  assert.equal(loaded.ok, true, "registry loads");
  const graph = buildGateGraph(parsed.circuit, loaded.registry);
  const proofs = circuitProofs(parsed.circuit, graph, loaded.registry);
  const { diagnostics } = dispatchGateSource(source, "<admission>.gate", { registry: registryValue });
  const errors = diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002");
  return {
    sourceBytes: new TextEncoder().encode(source),
    registry: loaded.registry,
    registryCanonicalForm: registryValue,
    circuit: parsed.circuit,
    circuitCanonicalForm: lowerCircuitToGIR(parsed.circuit, loaded.registry),
    verifier: { version: "test-0.0.0", ruleSet: "gate-v3-codes@test" },
    proofs,
    verificationErrorCount: errors.length,
    target: "wasm32-test",
  };
}

test("admission: a clean circuit builds an ADMITTED statement with every binding present", () => {
  const r = buildAdmissionStatement(inputsFor(SOURCE, REGISTRY_VALUE), seams);
  assert.equal(r.ok, true);
  const s = r.statement;
  assert.equal(s.kind, "gate-v3-admission.v1");
  for (const digest of [s.sourceDigest, s.registryDigest, s.circuitDigest]) {
    assert.match(digest, /^sha256:[0-9a-f]{64}$/);
  }
  assert.equal(s.verifier.ruleSet, "gate-v3-codes@test");
  assert.equal(s.proofs.length > 0, true, "the closed proof set is carried");
  assert.deepEqual(s.components, [{ id: "c.echo", version: "1.0.0", implementationDigest: `sha256:${"a".repeat(64)}` }]);
  assert.equal(s.target, "wasm32-test");
  assert.equal(s.verdict, "admitted");
});

test("admission: byte-identical canonical bytes for identical input, twice", () => {
  const a = buildAdmissionStatement(inputsFor(SOURCE, REGISTRY_VALUE), seams);
  const b = buildAdmissionStatement(inputsFor(SOURCE, REGISTRY_VALUE), seams);
  assert.equal(a.ok && b.ok, true);
  assert.equal(
    Buffer.from(canonicalReleaseEvidenceBytes(a.statement)).toString("hex"),
    Buffer.from(canonicalReleaseEvidenceBytes(b.statement)).toString("hex"),
  );
});

test("admission: one flipped source byte moves sourceDigest and nothing is shared", () => {
  const a = buildAdmissionStatement(inputsFor(SOURCE, REGISTRY_VALUE), seams);
  const flipped = SOURCE.replace('INTENT "admission probe"', 'INTENT "admission probf"');
  const b = buildAdmissionStatement(inputsFor(flipped, REGISTRY_VALUE), seams);
  assert.equal(a.ok && b.ok, true);
  assert.notEqual(a.statement.sourceDigest, b.statement.sourceDigest);
});

test("admission: a verification error yields verdict REFUSED, never a build failure", () => {
  // Same drawing against a registry whose output type disagrees — WIRE-101.
  const badRegistry = structuredClone(REGISTRY_VALUE);
  badRegistry.types.push({ id: "U", kind: "opaque", construction: "source" });
  badRegistry.components[0].outputs[0].type = "U";
  const r = buildAdmissionStatement(inputsFor(SOURCE, badRegistry), seams);
  assert.equal(r.ok, true, "a refused circuit still gets a statement — the statement RECORDS the refusal");
  assert.equal(r.statement.verdict, "refused");
});

test("admission: proofs absent refuses with ADMIT-002 — never evaluated is not admissible", () => {
  const input = { ...inputsFor(SOURCE, REGISTRY_VALUE), proofs: undefined };
  const r = buildAdmissionStatement(input, seams);
  assert.equal(r.ok, false);
  assert.deepEqual(r.diagnostics.map((d) => d.code), ["GATE-ADMIT-002"]);
});

test("admission: an empty proof LIST refuses identically — the set is closed, so empty means unevaluated", () => {
  const input = { ...inputsFor(SOURCE, REGISTRY_VALUE), proofs: [] };
  const r = buildAdmissionStatement(input, seams);
  assert.equal(r.ok, false);
  assert.deepEqual(r.diagnostics.map((d) => d.code), ["GATE-ADMIT-002"]);
});

test("admission: a MISSING (not-obliged) proof does not block, and its status is retained verbatim", () => {
  const input = inputsFor(SOURCE, REGISTRY_VALUE);
  assert.equal(input.proofs.some((p) => p.status === "missing"), true,
    "fixture check: this plain drawing leaves at least one obligation unobliged");
  const r = buildAdmissionStatement(input, seams);
  assert.equal(r.ok, true);
  assert.equal(r.statement.verdict, "admitted");
  assert.equal(r.statement.proofs.some((p) => p.status === "missing"), true,
    "binding 5 keeps the missing status visible — the envelope must show what was not obliged");
});

test("admission: an empty target refuses with ADMIT-001 — admission is target-scoped", () => {
  const input = { ...inputsFor(SOURCE, REGISTRY_VALUE), target: "   " };
  const r = buildAdmissionStatement(input, seams);
  assert.equal(r.ok, false);
  assert.deepEqual(r.diagnostics.map((d) => d.code), ["GATE-ADMIT-001"]);
});

test("admission: an unidentified verifier refuses with ADMIT-003", () => {
  const input = { ...inputsFor(SOURCE, REGISTRY_VALUE), verifier: { version: "", ruleSet: "x" } };
  const r = buildAdmissionStatement(input, seams);
  assert.equal(r.ok, false);
  assert.deepEqual(r.diagnostics.map((d) => d.code), ["GATE-ADMIT-003"]);
});

test("admission: every missing binding is reported in ONE pass, not first-failure-only", () => {
  const input = { ...inputsFor(SOURCE, REGISTRY_VALUE), target: "", proofs: undefined, verifier: { version: "", ruleSet: "" } };
  const r = buildAdmissionStatement(input, seams);
  assert.equal(r.ok, false);
  assert.deepEqual(r.diagnostics.map((d) => d.code).sort(),
    ["GATE-ADMIT-001", "GATE-ADMIT-002", "GATE-ADMIT-003"]);
});

// ─── G7.2 — verification against the artifacts IN HAND ───────────────────────
// Discipline: every refusal is paired with the SAME construction minus the
// mutation, which must verify clean — a verifier that refuses everything
// scores full marks otherwise (the CV-068b lesson).

const inHandOf = (input) => ({
  sourceBytes: input.sourceBytes,
  registryCanonicalForm: input.registryCanonicalForm,
  circuitCanonicalForm: input.circuitCanonicalForm,
  proofs: input.proofs,
  target: input.target,
});

function admitted() {
  const input = inputsFor(SOURCE, REGISTRY_VALUE);
  const built = buildAdmissionStatement(input, seams);
  assert.equal(built.ok, true);
  return { statement: built.statement, inHand: inHandOf(input) };
}

const codesOf = (r) => r.diagnostics.map((d) => d.code).sort();

test("verify: the clean statement verifies — the master negative control", () => {
  const { statement, inHand } = admitted();
  const r = verifyAdmissionBindings(statement, inHand, seams);
  assert.deepEqual(codesOf(r), []);
  assert.equal(r.bindingsMatch, true);
});

test("verify: TAMPER — one flipped source byte in hand refuses ADMIT-005", () => {
  const { statement, inHand } = admitted();
  const bytes = Uint8Array.from(inHand.sourceBytes);
  bytes[bytes.length - 2] ^= 1;
  const r = verifyAdmissionBindings(statement, { ...inHand, sourceBytes: bytes }, seams);
  assert.equal(r.bindingsMatch, false);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-005"]);
});

test("verify: WRONG REGISTRY — a different catalogue in hand refuses ADMIT-006", () => {
  const { statement, inHand } = admitted();
  const other = structuredClone(REGISTRY_VALUE);
  other.components[0].implementationDigest = `sha256:${"b".repeat(64)}`;
  const r = verifyAdmissionBindings(statement, { ...inHand, registryCanonicalForm: other }, seams);
  assert.equal(r.bindingsMatch, false);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-006"]);
});

test("verify: WRONG TARGET — an envelope for target A does not admit target B (ADMIT-007)", () => {
  const { statement, inHand } = admitted();
  const r = verifyAdmissionBindings(statement, { ...inHand, target: "wasm32-other" }, seams);
  assert.equal(r.bindingsMatch, false);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-007"]);
});

test("verify: MISSING PROOF — a deleted proof entry refuses ADMIT-008", () => {
  const { statement, inHand } = admitted();
  const gutted = { ...statement, proofs: statement.proofs.slice(1) };
  const r = verifyAdmissionBindings(gutted, inHand, seams);
  assert.equal(r.bindingsMatch, false);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-008"]);
});

test("verify: FORGED PROOF — a status rewritten to satisfied disagrees with recomputation (ADMIT-008)", () => {
  const { statement, inHand } = admitted();
  const forged = {
    ...statement,
    proofs: statement.proofs.map((p) => (p.status === "missing" ? { ...p, status: "satisfied" } : p)),
  };
  const r = verifyAdmissionBindings(forged, inHand, seams);
  assert.equal(r.bindingsMatch, false);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-008"]);
});

test("verify: SUBSTITUTION — an internally consistent statement for a DIFFERENT circuit refuses ADMIT-009", () => {
  // Both circuits are individually valid and admitted; the attack is swapping
  // whole envelopes, and a verifier comparing the statement against itself
  // would pass it. In hand: circuit B. Statement: circuit A.
  const { statement } = admitted();
  const otherSource = SOURCE.replace("CIRCUIT probe(", "CIRCUIT other(");
  const otherInput = inputsFor(otherSource, REGISTRY_VALUE);
  assert.equal(buildAdmissionStatement(otherInput, seams).ok, true, "the substitute is itself admissible");
  const r = verifyAdmissionBindings(statement, inHandOf(otherInput), seams);
  assert.equal(r.bindingsMatch, false);
  // The SOURCE differs too (the name is in the bytes), so tamper co-reports;
  // the load-bearing assertion is that ADMIT-009 names the substitution
  // DISTINCTLY — §3.1: two attacks needing different responses, two codes.
  assert.equal(codesOf(r).includes("GATE-ADMIT-009"), true);
  assert.equal(codesOf(r).includes("GATE-ADMIT-005"), true);
});

test("verify: an authentic statement whose verdict is REFUSED does not admit (ADMIT-011)", () => {
  const badRegistry = structuredClone(REGISTRY_VALUE);
  badRegistry.types.push({ id: "U", kind: "opaque", construction: "source" });
  badRegistry.components[0].outputs[0].type = "U";
  const input = inputsFor(SOURCE, badRegistry);
  const built = buildAdmissionStatement(input, seams);
  assert.equal(built.ok && built.statement.verdict === "refused", true);
  const r = verifyAdmissionBindings(built.statement, inHandOf(input), seams);
  assert.equal(r.bindingsMatch, false);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-011"]);
});

test("★ verify: a FORGED statement has matching bindings — this check is half the answer, by design", () => {
  // The G7 exit review reached for this function as "the" verifier and got a
  // pass on a statement nobody ever signed. That is correct behaviour and a
  // dangerous name, both fixed in cycle 0139: `verifyAdmissionBindings`, and a
  // `bindingsMatch` field no caller can read as "admitted".
  //
  // This KAT keeps the boundary visible. If someone later makes this function
  // "safer" by having it check signatures, they must delete this test — and
  // deleting it is the moment to notice they are duplicating the envelope
  // layer's job, which is the one thing the G7 ruling forbade.
  const { statement, inHand } = admitted();
  const forged = { ...statement, verifier: { version: "attacker", ruleSet: "none" } };
  const r = verifyAdmissionBindings(forged, inHand, seams);
  assert.equal(r.bindingsMatch, true,
    "bindings match because they DO match — authenticity is not this function's question");
  assert.deepEqual(r.diagnostics, [],
    "and it reports nothing, because nothing it checks is wrong");
});

test("verify: a non-statement refuses ADMIT-010 and reads nothing else", () => {
  const { inHand } = admitted();
  for (const junk of [null, 42, "statement", { kind: "gate-v3-admission.v2" }, {}]) {
    const r = verifyAdmissionBindings(junk, inHand, seams);
    assert.equal(r.bindingsMatch, false);
    assert.deepEqual(codesOf(r), ["GATE-ADMIT-010"]);
  }
});

test("verify: all applicable refusals report in ONE pass (§8.1 rule 1)", () => {
  const { statement, inHand } = admitted();
  const bytes = Uint8Array.from(inHand.sourceBytes);
  bytes[0] ^= 1;
  const r = verifyAdmissionBindings(statement, { ...inHand, sourceBytes: bytes, target: "wasm32-other" }, seams);
  assert.deepEqual(codesOf(r), ["GATE-ADMIT-005", "GATE-ADMIT-007"]);
});

test("admission: there is NO verdict input to forge", () => {
  // API-shape pin: the builder computes the verdict. If a `verdict` field is
  // ever added to the input, this test forces the author to look here first.
  const input = inputsFor(SOURCE, REGISTRY_VALUE);
  assert.equal("verdict" in input, false);
  const r = buildAdmissionStatement({ ...input, verdict: "admitted", verificationErrorCount: 3 }, seams);
  assert.equal(r.ok, true);
  assert.equal(r.statement.verdict, "refused", "a smuggled verdict field is ignored; errors decide");
});
