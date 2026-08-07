// gate-order6-link-plan.test.mjs — order 6's RED suite, second submission.
//
// KTA 43 Q2 unlocked order 6 for "plan and red tests first". The FIRST
// submission was REJECTED by KTA 45 with three blockers; this is the rewrite.
// Plan: KTA `44-order-six-plan.md`. Required assertions: KTA 45 §3.
//
// ★ WHAT THE FIRST ATTEMPT GOT WRONG, kept here because the failure mode is
// more instructive than the fix:
//
//   F1  it demanded a PUBLIC `admittedPayloadFor` export — while the plan it
//       implemented said the binding must be module-PRIVATE. The test would
//       have widened the exact authority surface the design exists to close.
//       ⟹ Privacy is now tested THROUGH PUBLIC BEHAVIOUR: a clone, a forged
//         object and post-mint mutation must refuse or have no effect. There is
//         no export to inspect, and there must never be one.
//
//   F2  twelve of fourteen rows would have gone GREEN ON EMPTY STUBS — a
//       one-argument empty function and a constant object satisfied them.
//       ⟹ Every body below constructs a control and a one-variable mutant,
//         calls the public path, and asserts the exact result or refusal.
//
//   F3  the row labelled "detector-of-detector" planted no bypass.
//       ⟹ Row 15 now names an exact mutant and requires a specific behavioural
//         assertion to fail because of it.
//
// ⚠ `function.length === 1` is NOT a security boundary (KTA 45 §3): JS callers
// can always pass surplus arguments. The property asserted here is that no code
// path READS caller-supplied replacement material.
//
// ⚠ Rows 1–13 and 15 are EXPECTED RED until order 6 is implemented. They fail
// at the `order6(...)` resolve, and every assertion after it is written out in
// full so the row tests real behaviour the moment the export lands.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  admittedControl, admissionInputs, inHandOf, envelopeFor, delegationFixture,
  verifiedOptions, compiler, gate, lib, seams, SOURCE, REGISTRY_VALUE,
} from "./helpers/gate-admission-fixture.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * Resolve an order-6 export, distinguishing "not implemented yet" from "the
 * harness is broken". A missing export is the expected red; anything else
 * rethrows, so a broken fixture cannot masquerade as honest red evidence.
 */
function order6(name) {
  const fn = gate[name];
  if (fn === undefined) {
    assert.fail(
      `ORDER-6 NOT IMPLEMENTED: \`${name}\` is not exported. Expected red for this ` +
      `chapter — the behaviour is absent, not broken. The assertions below this ` +
      `line specify what it must do.`,
    );
  }
  assert.equal(typeof fn, "function", `\`${name}\` exists but is not callable`);
  return fn;
}

/** Mint a genuine capability through the only path that produces one. */
function mintedCapability(control) {
  const r = gate.linkableFromAdmission(control.envelope, control.options, control.inHand);
  assert.equal(r.ok, true, "fixture check: the control must admit, or every row below is vacuous");
  return r.linkable;
}

// ── row 1 · the admitted control ─────────────────────────────────────────────

test("row 1: a valid linkable ALONE produces the exact closed non-executable plan", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const capability = mintedCapability(control);

  const plan = buildLinkPlan(capability);

  assert.equal(plan.schema, "gate-v3-link-plan.v1");
  assert.equal(plan.productionAuthorizing, false, "order 6 output is never production-authorizing");
  assert.equal(plan.target, control.statement.target);
  assert.equal(plan.circuitDigest, control.statement.circuitDigest);
  assert.equal(plan.registryDigest, control.statement.registryDigest);
  assert.deepEqual(
    plan.components.map((c) => `${c.id}@${c.version}:${c.implementationDigest}`),
    control.statement.components.map((c) => `${c.id}@${c.version}:${c.implementationDigest}`),
    "components carry exact id, version AND implementation digest, in admitted order",
  );
  // Closed key set — a new field must be added here deliberately.
  assert.deepEqual(Object.keys(plan).sort(), [
    "admissionDigest", "circuitDigest", "components", "linkerRules", "productionAuthorizing",
    "proofSetDigest", "registryDigest", "schema", "sourceDigest", "target", "verifierRules",
  ]);
});

// ── rows 2, 10 · the capability cannot be forged or bypassed ─────────────────

test("row 2: a structural clone of the capability refuses", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const real = mintedCapability(control);
  const clone = JSON.parse(JSON.stringify(real));

  assert.deepEqual(clone, JSON.parse(JSON.stringify(real)), "the clone IS structurally identical");
  assert.throws(() => buildLinkPlan(clone), /GATE_LINK_NOT_ADMITTED/,
    "identity, not shape, must grant linking authority");
});

test("row 10: a forged object cannot enter, and there is NO alternate public link path", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const forged = { kind: "gate-v3-linkable.v1", circuitDigest: `sha256:${"0".repeat(64)}`, target: "wasm32-test", components: [] };
  assert.throws(() => buildLinkPlan(forged), /GATE_LINK_NOT_ADMITTED/);
  for (const junk of [null, undefined, 42, "linkable", {}, []]) {
    assert.throws(() => buildLinkPlan(junk), /GATE_LINK_NOT_ADMITTED/, `must refuse ${JSON.stringify(junk)}`);
  }
  // No second public entry point may exist that skips admission.
  const linkish = Object.keys(gate).filter((k) => /link/i.test(k) && k !== "buildLinkPlan" && k !== "linkableFromAdmission" && k !== "assertLinkableAdmitted");
  assert.deepEqual(linkish, [], `alternate public link surface(s) found: ${linkish.join(", ")}`);
  // ★ F1: the private payload binding must NOT be reachable from outside.
  assert.equal(gate.admittedPayloadFor, undefined,
    "the payload reader must stay module-private (KTA 43 Q3); exporting it widens the authority surface");
});

// ── rows 3, 4 · post-mint mutation cannot change the plan ────────────────────

test("row 3: mutating the ORIGINAL circuit material after mint changes nothing", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const capability = mintedCapability(control);
  const before = buildLinkPlan(capability);

  // Deep mutation of the caller's own objects, after the capability was minted.
  // A shallow Object.freeze would leave these reachable (KTA 45 F5).
  try { control.input.circuitCanonicalForm.parts.push("injected"); } catch { /* frozen is fine too */ }
  try { control.input.circuitCanonicalForm.name = "other"; } catch { /* ditto */ }

  const after = buildLinkPlan(capability);
  assert.deepEqual(after, before, "the plan derives from the private snapshot, never from caller-reachable objects");
});

test("row 4: mutating the ORIGINAL registry material after mint changes nothing", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const capability = mintedCapability(control);
  const before = buildLinkPlan(capability);

  try { control.input.registryCanonicalForm.components[0].implementationDigest = `sha256:${"9".repeat(64)}`; } catch { /* frozen is fine */ }

  const after = buildLinkPlan(capability);
  assert.deepEqual(after, before, "registry material is snapshotted at admission, not read at link time");
});

// ── rows 5, 6 · component and target binding ─────────────────────────────────

test("row 5: a component whose bytes differ from the admitted digest refuses", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const resolveComponent = order6("resolveComponentArtifact");
  const control = admittedControl();
  const capability = mintedCapability(control);
  const plan = buildLinkPlan(capability);
  const wanted = plan.components[0];

  // Same id and version, different bytes => different digest => refuse.
  assert.throws(
    () => resolveComponent(capability, { id: wanted.id, version: wanted.version, implementationDigest: `sha256:${"b".repeat(64)}` }),
    /GATE_LINK_COMPONENT_DIGEST_MISMATCH/,
    "name and version are not identity; the implementation digest is",
  );
  // Negative control: the admitted digest resolves.
  assert.doesNotThrow(() => resolveComponent(capability, wanted));
});

test("row 6: the correct component digest under a DIFFERENT target refuses", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const resolveComponent = order6("resolveComponentArtifact");
  const control = admittedControl();
  const capability = mintedCapability(control);
  const wanted = buildLinkPlan(capability).components[0];

  assert.throws(
    () => resolveComponent(capability, wanted, { target: "wasm32-other" }),
    /GATE_LINK_TARGET_MISMATCH/,
    "admission is target-scoped; a right digest for the wrong target is not admitted",
  );
  assert.doesNotThrow(() => resolveComponent(capability, wanted, { target: "wasm32-test" }));
});

// ── row 7 · proof-set identity ───────────────────────────────────────────────

test("row 7: missing, reordered or rewritten proofs refuse; canonical equivalence is explicit", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const capability = mintedCapability(control);
  const plan = buildLinkPlan(capability);

  // The plan pins the proof set by DIGEST, so any change moves it.
  const rebuilt = admittedControl();
  const rebuiltPlan = buildLinkPlan(mintedCapability(rebuilt));
  assert.equal(rebuiltPlan.proofSetDigest, plan.proofSetDigest,
    "the same circuit and registry yield the same proof-set digest");

  // A statement whose proofs were reordered must not verify into a capability
  // at all — the admission layer owns that refusal (GATE-ADMIT-008).
  const input = admissionInputs();
  const built = compiler.buildAdmissionStatement(input, seams);
  const f = delegationFixture();
  const reordered = { ...built.statement, proofs: [...built.statement.proofs].reverse() };
  const tampered = envelopeFor(reordered, f.operational);
  const r = gate.linkableFromAdmission(tampered, verifiedOptions(f), inHandOf(input));
  assert.equal(r.ok, false, "a reordered proof set must not mint a capability");
  assert.equal(r.linkable, null);
});

// ── rows 8, 9 · the signature layer refuses BEFORE binding steers anything ───

test("row 8: expired and wrong-role envelopes refuse before binding selection", () => {
  order6("buildLinkPlan");
  const input = admissionInputs();
  const built = compiler.buildAdmissionStatement(input, seams);

  // Expired: `at` outside the delegation window.
  const f1 = delegationFixture();
  const expired = gate.linkableFromAdmission(
    envelopeFor(built.statement, f1.operational),
    verifiedOptions(f1, { at: "2026-09-01T00:00:00.000Z" }),
    inHandOf(input),
  );
  assert.equal(expired.ok, false);
  assert.equal(expired.linkable, null);
  assert.equal(expired.refusals.some((c) => String(c).startsWith("RELEASE_EVIDENCE")), true,
    "the ENVELOPE layer must refuse, not a binding check — unauthenticated fields never steer selection");

  // Wrong role: a delegation without gate-admission authority.
  const f2 = delegationFixture({ roles: [lib.RELEASE_EVIDENCE_ROLE.DURABILITY, lib.RELEASE_EVIDENCE_ROLE.REPOSITORY] });
  const wrongRole = gate.linkableFromAdmission(
    envelopeFor(built.statement, f2.operational), verifiedOptions(f2), inHandOf(input),
  );
  assert.equal(wrongRole.ok, false);
  assert.equal(wrongRole.linkable, null);
  assert.deepEqual([...wrongRole.refusals], ["RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED"]);
});

test("row 9: an unknown signing suite refuses through the existing catalogue", () => {
  order6("buildLinkPlan");
  const control = admittedControl();
  const bogus = { ...control.envelope, signature: { ...control.envelope.signature, algorithm: "hybrid-ed25519-mldsa99" } };
  const r = gate.linkableFromAdmission(bogus, control.options, control.inHand);
  assert.equal(r.ok, false);
  assert.equal(r.linkable, null);
  assert.deepEqual([...r.refusals], ["RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED"]);
  // Negative control: the same envelope, correct suite, admits.
  assert.equal(gate.linkableFromAdmission(control.envelope, control.options, control.inHand).ok, true);
});

// ── row 11 · the plan is non-executable by shape ─────────────────────────────

test("row 11: the plan carries no executable/flow material and cannot enter a flow emitter", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const plan = buildLinkPlan(mintedCapability(admittedControl()));

  const FLOW_ONLY = [
    "paramTypes", "executionPlan", "target_affinity", "qualifier", "tensors",
    "allowedEffectsMask", "typedArrayLoweringPlan", "faultHandlers",
    "protected_values", "audit", "execution", "contract", "body", "wat", "flows",
  ];
  const trespassers = FLOW_ONLY.filter((k) => k in plan);
  assert.deepEqual(trespassers, [], `a link plan has no executable body: ${trespassers.join(", ")}`);
  assert.equal(plan.productionAuthorizing, false);
  // And it must not be shaped like a GIRProgram a flow emitter would accept.
  assert.equal("schemaVersion" in plan, false, "a link plan is not a GIRProgram");
});

// ── rows 12, 13 · canonical determinism ──────────────────────────────────────

test("row 12: semantically equal source spellings yield the SAME canonical plan identity", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const planDigest = order6("linkPlanDigest");

  // Same circuit, different non-semantic spacing in the WIRES block.
  const respaced = SOURCE.replace("    IN.v -> a.subject", "    IN.v  ->  a.subject");
  assert.notEqual(respaced, SOURCE, "fixture check: the two spellings must actually differ");

  const a = buildLinkPlan(mintedCapability(admittedControl()));
  const b = buildLinkPlan(mintedCapability(admittedControl({ source: respaced })));
  assert.equal(planDigest(b), planDigest(a),
    "canonical identity follows the semantic graph, not the source bytes");
});

test("row 13: repeated construction from ONE capability is byte-identical", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const planDigest = order6("linkPlanDigest");
  const capability = mintedCapability(admittedControl());

  const first = buildLinkPlan(capability);
  const second = buildLinkPlan(capability);
  assert.equal(planDigest(second), planDigest(first));
  assert.equal(
    Buffer.from(lib.canonicalReleaseEvidenceBytes(second)).toString("hex"),
    Buffer.from(lib.canonicalReleaseEvidenceBytes(first)).toString("hex"),
    "byte-identical through the production canonicaliser, not merely deepEqual",
  );
});

// ── row 14 · the composite chapter gate, executable ──────────────────────────

test("row 14: the owning flow-hash suite is INVOKED and its failure propagates", () => {
  // KTA 45 F6: `assert.ok(true)` proved nothing — running this file alone
  // reported green even if the flow-hash suite were deleted or failing. This
  // now actually executes the one owning suite and fails when it does.
  const suite = join(ROOT, "packages-galerina", "galerina-core-compiler", "tests", "gate-v3-flow-hash-invariance.test.mjs");
  // ⚠ TWO harness traps were hit writing this row, and both are the kind that
  // make a test red for the wrong reason — which this chapter's discipline
  // forbids and which doc 45 F6 rejected the previous version for:
  //
  //   1. matching `/# pass 16/` against output that reads `ℹ pass 16`;
  //   2. the parent test runner exporting NODE_TEST_CONTEXT, which switches the
  //      CHILD's reporter — so the child's format depended on how the parent
  //      happened to be invoked.
  //
  // Fixed at the cause: the child runs with that variable cleared, so its
  // output is deterministic. And the LOAD-BEARING assertion is the exit code —
  // `execFileSync` throws on non-zero, so "the owning suite passed" is proven
  // by reaching the next line at all. The count match is a second, weaker
  // check that the right suite ran with the expected size.
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;

  let out;
  try {
    out = execFileSync(process.execPath, ["--test", "--test-concurrency=1", suite], {
      encoding: "utf8", timeout: 120_000, cwd: ROOT, env: childEnv,
    });
  } catch (error) {
    assert.fail(
      `the owning flow-hash suite FAILED or could not run (exit ${error.status}). ` +
      `This row exists so that failure cannot be hidden by a local assert.ok(true):\n` +
      String(error.stdout ?? error.message).split("\n").slice(-15).join("\n"),
    );
  }
  assert.match(out, /pass 16/, `expected 16 passing from the owning suite; got:\n${out.split("\n").slice(-10).join("\n")}`);
  assert.match(out, /fail 0/, "and zero failing");
});

// ── row 15 · the detector of the detector ────────────────────────────────────

test("★ row 15: a NAMED source mutant makes a specific behavioural assertion fail", () => {
  // KTA 45 F3: the previous row planted no bypass and would have turned green
  // the moment the exports existed. The mutant is now named exactly.
  const buildLinkPlan = order6("buildLinkPlan");
  const mutate = order6("__planFieldOmissionForTesting");

  // MUTANT: omit `circuitDigest` from the canonical plan — the single field
  // that binds the plan to the admitted circuit. If the suite still passes with
  // it gone, row 1's identity assertions are decoration.
  const capability = mintedCapability(admittedControl());
  const mutantPlan = mutate(capability, "circuitDigest");
  assert.equal("circuitDigest" in mutantPlan, false, "fixture check: the mutant really omits the field");

  // The behavioural consequence a real detector must show:
  const honest = buildLinkPlan(capability);
  assert.notDeepEqual(mutantPlan, honest,
    "omitting circuitDigest must change the plan — if it does not, nothing binds the plan to its circuit");
  assert.throws(() => order6("assertLinkPlanComplete")(mutantPlan), /GATE_LINK_PLAN_INCOMPLETE/,
    "a plan missing a required binding must be refused by the plan's own completeness check");
});
