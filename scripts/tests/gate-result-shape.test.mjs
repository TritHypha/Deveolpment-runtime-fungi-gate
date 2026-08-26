// gate-result-shape.test.mjs — one invariant, over every gate-lane result.
//
// ★ THE QUESTION THIS ANSWERS, and it was asked honestly. G7 produced three
// instances of one class — "a result that reads as more than it is" — and the
// standing question was whether any of it is mechanically checkable, with
// "no, and here is why" an acceptable answer. The answer is ONE THIRD:
//
//   ✅ CHECKABLE — a usable-looking PAYLOAD field surviving alongside a false
//      verdict (GF-010). That is a shape, and shapes can be asserted.
//   ❌ NOT CHECKABLE — a NAME promising more than the function delivers
//      (`verifyAdmissionStatement`, cycle 0139). Deciding it needs to know what
//      "the whole check" means; no predicate has that.
//   ❌ NOT CHECKABLE — a MESSAGE asserting a cause it cannot know
//      (`GATE-SEM-001`, cycle 0138). Natural-language claim about other code.
//
// ★★ AND THE CHECKABLE THIRD IS ALREADY CHECKED WHERE THE TYPES REACH. Proving
// this file fires meant reintroducing GF-010 into `gate-v3-admission.ts` — and
// TypeScript refused it before any test ran:
//
//   TS2353: 'statement' does not exist in type
//           '{ readonly ok: false; readonly diagnostics: … }'
//
// because `AdmissionBuildResult` is a DISCRIMINATED UNION: the `ok: false` arm
// has no payload field to populate. That surface was structurally incapable of
// the defect. GF-010 happened in `gate-admission-envelope.mjs` — the untyped
// `.mjs` scripts layer, where no such union exists.
//
// ⟹ So this file is a COMPENSATING CONTROL for the untyped layer, not a new
// idea. The durable fix for anything that grows there is a discriminated union
// at the boundary; until the scripts layer has one, this asserts at runtime
// what the type system asserts statically one directory over.
//
// Recording the two that are NOT checkable matters just as much: a reader who
// finds this file must not conclude the class is covered. It is covered by a
// third, in one layer, and the other two thirds still need a human reading the
// enforcement point — which is how all three were found.
//
// The invariant: WHEN A RESULT'S VERDICT IS FALSE, NO OTHER FIELD MAY CARRY A
// PAYLOAD A CALLER COULD ACT ON. Diagnostics may be present — codes and
// reasons are how a refusal explains itself. A live object is different: it is
// indistinguishable from the success shape, and `const x = r.thing; if (x)`
// is the idiom people actually write.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..", "..");
const compiler = await import(pathToFileURL(join(ROOT, "packages-ts", "galerina-core-compiler", "dist", "index.js")).href);
const lib = await import(pathToFileURL(join(ROOT, "scripts", "lib", "beta-release-evidence-envelope.mjs")).href);
const gate = await import(pathToFileURL(join(ROOT, "scripts", "lib", "gate-admission-envelope.mjs")).href);
const seams = { canonicalBytes: lib.canonicalReleaseEvidenceBytes };

/** The names a gate-lane result uses for "did this succeed". */
const VERDICT_FIELDS = ["ok", "bindingsMatch", "pass"];

/**
 * Could a caller ACT on this value? Diagnostics are not payloads: an array of
 * `{code,…}` records, or of strings, is a refusal explaining itself. A live
 * object with fields is a payload, because it is shaped like success.
 */
export function isActionablePayload(value) {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.length > 0
      && value.some((item) => typeof item === "object" && item !== null && !("code" in item));
  }
  return Object.keys(value).length > 0;
}

const REGISTRY = {
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
  INTENT "result shape"
  REQUIRES:
  PARTS:
    [a :: c.echo@1.0.0]
  WIRES:
    IN.v -> a.subject
    a.value -> OUT.value
END
`;

function admissionInputs() {
  const parsed = compiler.parseGateV3(SOURCE, "shape.gate");
  const loaded = compiler.loadGateV3Registry(REGISTRY, "shape.json");
  const graph = compiler.buildGateGraph(parsed.circuit, loaded.registry);
  return {
    sourceBytes: new TextEncoder().encode(SOURCE),
    registry: loaded.registry,
    registryCanonicalForm: REGISTRY,
    circuit: parsed.circuit,
    circuitCanonicalForm: compiler.lowerCircuitToGIR(parsed.circuit, loaded.registry),
    verifier: { version: "v", ruleSet: "r" },
    proofs: compiler.circuitProofs(parsed.circuit, graph, loaded.registry),
    verificationErrorCount: 0,
    target: "wasm32-test",
  };
}

/**
 * Every gate-lane surface that returns a verdict, with an invocation that MUST
 * fail. Enumerated deliberately: a new result-returning surface has to be added
 * here, which is the same closed-set discipline as the admission register.
 *
 * ⚠ NOT covered, and named so the scope is legible: `verifyGateAdmissionEnvelope`
 * and `linkableFromAdmission` need a signed envelope and per-run keys to reach
 * their failure paths, so their shape is asserted in
 * `gate-admission-envelope.test.mjs`, across all six axes, where the fixture
 * already exists. Duplicating that rig here would test the rig.
 */
const FAILING_CALLS = {
  "generateCircuitFromPattern": () => compiler.generateCircuitFromPattern("a\\b", { name: "p" }),
  "buildAdmissionStatement": () => compiler.buildAdmissionStatement({ ...admissionInputs(), target: "" }, seams),
  "verifyAdmissionBindings": () => {
    const input = admissionInputs();
    const built = compiler.buildAdmissionStatement(input, seams);
    return compiler.verifyAdmissionBindings(built.statement, {
      sourceBytes: input.sourceBytes,
      registryCanonicalForm: input.registryCanonicalForm,
      circuitCanonicalForm: input.circuitCanonicalForm,
      proofs: input.proofs,
      target: "a-different-target",
    }, seams);
  },
  "issueGateAdmissionEnvelope": () => gate.issueGateAdmissionEnvelope(
    compiler.buildAdmissionStatement(admissionInputs(), seams).statement,
    { keyId: "0".repeat(16), signEd25519: () => "x", signMlDsa65: () => "x" },
    { suiteId: "not-a-suite" },
  ),
  "parseGateV3": () => compiler.parseGateV3("not a gate file\n", "bad.gate"),
  "loadGateV3Registry": () => compiler.loadGateV3Registry({ types: {} }, "bad.json"),
};

for (const [name, call] of Object.entries(FAILING_CALLS)) {
  test(`result shape: ${name} carries no actionable payload when it refuses`, () => {
    const result = call();
    const verdictField = VERDICT_FIELDS.find((f) => f in result);
    assert.notEqual(verdictField, undefined, `${name} returns no recognised verdict field`);
    assert.equal(result[verdictField], false, `fixture check: this invocation must FAIL, or the assertion below is vacuous`);

    const offenders = Object.entries(result)
      .filter(([key]) => key !== verdictField)
      .filter(([, value]) => isActionablePayload(value))
      .map(([key]) => key);

    assert.deepEqual(offenders, [],
      `${name} returns ${offenders.join(", ")} alongside a FALSE verdict. A caller writing ` +
      `\`const x = r.${offenders[0] ?? "field"}; if (x) { … }\` proceeds on a refused result. ` +
      `Return null, or rename the field so it cannot be mistaken for a usable one (see refusedStatement).`);
  });
}

test("★ non-vacuity: the predicate actually flags the GF-010 shape", () => {
  // Six greens above mean nothing unless `isActionablePayload` can say yes.
  // This is the exact object GF-010 returned before the fix.
  assert.equal(isActionablePayload({ kind: "gate-v3-admission.v1", circuitDigest: "sha256:…" }), true,
    "a live statement object is a payload");
  assert.equal(isActionablePayload([{ name: "proof", status: "satisfied" }]), true,
    "an array of records is a payload");

  // …and does NOT flag the shapes a refusal legitimately carries.
  assert.equal(isActionablePayload([{ code: "GATE-ADMIT-007", message: "…" }]), false, "diagnostics are not payloads");
  assert.equal(isActionablePayload(["GATE-ADMIT-007"]), false, "a code list is not a payload");
  assert.equal(isActionablePayload([]), false);
  assert.equal(isActionablePayload(null), false);
  assert.equal(isActionablePayload("a reason string"), false);
});

test("★ non-vacuity: a synthetic violator is caught by the same comparison the tests use", () => {
  // Proves the assertion above would FIRE, not merely that the predicate works.
  const bad = { ok: false, refusals: ["X"], statement: { kind: "thing", digest: "d" } };
  const verdictField = VERDICT_FIELDS.find((f) => f in bad);
  const offenders = Object.entries(bad)
    .filter(([key]) => key !== verdictField)
    .filter(([, value]) => isActionablePayload(value))
    .map(([key]) => key);
  assert.deepEqual(offenders, ["statement"]);
});

test("the enumerated surface set is closed — a new result-returning surface must be added", () => {
  assert.deepEqual(Object.keys(FAILING_CALLS).sort(), [
    "buildAdmissionStatement", "generateCircuitFromPattern", "issueGateAdmissionEnvelope",
    "loadGateV3Registry", "parseGateV3", "verifyAdmissionBindings",
  ]);
});
