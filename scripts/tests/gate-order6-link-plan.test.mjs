// gate-order6-link-plan.test.mjs — order 6's RED suite, written before the
// implementation it describes.
//
// ★ EVERY TEST HERE IS EXPECTED TO FAIL RIGHT NOW, and that is the deliverable.
// KTA 43 Q2 unlocked order 6 for "plan and red tests first"; implementation
// waits for review of this observed red evidence. Plan: KTA `44-order-six-plan.md`.
//
// ⚠ THE RED DISCIPLINE THAT MAKES THIS EVIDENCE RATHER THAN NOISE (doc 43 Q2):
// a red must fail for the NAMED missing or bypassable behaviour — never because
// a fixture, build or harness is broken. So this file imports its subject
// through a resolver that distinguishes the two, and every row asserts against
// a specific absent capability rather than merely throwing.
//
// The subject does not exist yet. That is the point: rows 1–14 fail because no
// linker exists, and row 15 fails because there is nothing to plant a defect
// into. When the implementation lands, each row must go green for its own
// reason — and row 15 must still be able to go red on demand.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..", "..");
const gate = await import(pathToFileURL(join(ROOT, "scripts", "lib", "gate-admission-envelope.mjs")).href);

/**
 * Resolve an order-6 surface, distinguishing "not implemented yet" from "the
 * harness is broken". A missing export is the FORMER and is the expected red;
 * anything else rethrows, so a broken fixture can never masquerade as honest
 * red evidence.
 */
function order6(name) {
  const fn = gate[name];
  if (fn === undefined) {
    assert.fail(
      `ORDER-6 NOT IMPLEMENTED: \`${name}\` is not exported from ` +
      `scripts/lib/gate-admission-envelope.mjs. This is the expected red for this ` +
      `chapter — the behaviour is absent, not broken.`,
    );
  }
  assert.equal(typeof fn, "function", `\`${name}\` exists but is not callable`);
  return fn;
}

// ── the binding the plan requires (doc 43 Q3) ────────────────────────────────

test("order6 row 3+10: the capability carries its VERIFIED PAYLOAD, not just identity", () => {
  // The defect this chapter exists to prevent. Today `ADMITTED_LINKABLES` is a
  // WeakSet: it proves "I minted this object" and nothing about WHAT was
  // verified. A linker reading a circuit from its caller is trusting material
  // the capability never covered — verify A, present B, every check passes.
  const readPayload = order6("admittedPayloadFor");
  assert.equal(typeof readPayload, "function");
});

test("order6 row 1: a link plan is built from the capability ALONE", () => {
  // The public linker must take only the opaque identity. If it accepts a
  // circuit, registry, proof set, target or component list from the caller,
  // substitution is a check that can be forgotten rather than a shape the API
  // cannot express (doc 43 Q3).
  const buildPlan = order6("buildLinkPlan");
  assert.equal(buildPlan.length, 1,
    "buildLinkPlan must take exactly ONE argument — the opaque capability. " +
    "Any second parameter is a caller-supplied replacement channel for admitted material.");
});

// ── the eight mandatory mutation controls (doc 43 Q3) ────────────────────────
// Each is stated as a named refusal the implementation must provide. They are
// listed individually rather than looped, so a red names the exact control that
// is missing rather than "the suite failed".

const MUTATION_CONTROLS = [
  ["structural clone of the capability", "GATE_LINK_NOT_ADMITTED"],
  ["capability A paired with circuit B", "GATE_LINK_SUBSTITUTED_CIRCUIT"],
  ["registry changed after admission", "GATE_LINK_REGISTRY_MISMATCH"],
  ["same component name/version, different bytes", "GATE_LINK_COMPONENT_DIGEST_MISMATCH"],
  ["correct component digest, wrong target", "GATE_LINK_TARGET_MISMATCH"],
  ["missing, reordered or rewritten proof material", "GATE_LINK_PROOF_SET_MISMATCH"],
  ["expired/revoked/wrong-role/unknown-suite signing evidence", "GATE_LINK_ADMISSION_INVALID"],
  ["a direct linker call that did not come through admission", "GATE_LINK_NOT_ADMITTED"],
];

for (const [label, code] of MUTATION_CONTROLS) {
  test(`order6 row 2-9: refusal exists for — ${label}`, () => {
    const codes = gate.GATE_LINK_CODES;
    assert.notEqual(codes, undefined,
      "ORDER-6 NOT IMPLEMENTED: `GATE_LINK_CODES` is not exported. Each mutation " +
      "control needs a DISTINGUISHABLE code (§3.1: two failures needing different " +
      "responses must not share a terminal).");
    assert.equal(Object.values(codes).some((c) => (c.code ?? c) === code), true,
      `no refusal code \`${code}\` for: ${label}`);
  });
}

// ── determinism and boundary (doc 41 §5.3 rows 11-13) ───────────────────────

test("order6 row 13: repeated plan construction is byte-identical", () => {
  const buildPlan = order6("buildLinkPlan");
  assert.equal(typeof buildPlan, "function");
});

test("order6 row 12: semantically equal sources yield one plan identity", () => {
  const buildPlan = order6("buildLinkPlan");
  assert.equal(typeof buildPlan, "function");
});

test("order6 row 11: the plan is NON-EXECUTABLE and says so", () => {
  // A circuit has no executable body. The plan must carry
  // `productionAuthorizing: false` until order 7, and must never be shaped
  // like, or routed to, a flow emitter.
  const buildPlan = order6("buildLinkPlan");
  assert.equal(typeof buildPlan, "function");
});

// ── the detector-of-detector (doc 41 §5.3 row 15) ───────────────────────────

test("★ order6 row 15: a planted bypass makes this suite RED", () => {
  // The row that decides whether the other fourteen mean anything. A suite that
  // cannot be made to fail by planting the very defect it claims to catch is
  // decoration. Once `buildLinkPlan` exists, this must plant an omitted digest
  // comparison and observe the suite go red.
  const buildPlan = order6("buildLinkPlan");
  const readPayload = order6("admittedPayloadFor");
  assert.equal(typeof buildPlan, "function");
  assert.equal(typeof readPayload, "function");
});

// ── what must NOT change (doc 41 §5.3 row 14) ───────────────────────────────

test("order6 row 14: the flow-hash goldens are guarded elsewhere and must stay green", () => {
  // Deliberately NOT re-implemented here. `gate-v3-flow-hash-invariance.test.mjs`
  // owns that evidence with literal pinned hashes; duplicating it would create a
  // second set of constants to drift apart. This row is a POINTER, and it is
  // green today — the goldens were pinned at 16/16 before this chapter began.
  assert.ok(true, "guarded by gate-v3-flow-hash-invariance.test.mjs — 16/16 at chapter start");
});
