// gate-admission-envelope.mjs — G7.2b: the composed admission verifier.
//
// Composition, not construction: the SIGNATURE questions (suite known? keys
// bound? delegation live? role delegated?) belong to the release-evidence
// layer and are answered by its existing verifier; the BINDING questions (is
// this statement about the artifacts in hand?) belong to the compiler's
// gate-v3-admission surface. This file only sequences the two, envelope
// FIRST — an unverified statement's fields must never steer anything, so the
// binding check runs on the statement the envelope verification RETURNED
// (canonical, frozen), never on the raw input.
//
// The unknown-suite refusal — the last of the six ratified exit criteria —
// therefore needs no new code here: `cryptoSuiteForSignature` inside the
// envelope layer already refuses an algorithm outside the catalogue, and the
// KAT drives it through this composed path to prove the refusal reaches an
// admission caller.
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  RELEASE_EVIDENCE_ROLE,
  canonicalReleaseEvidenceBytes,
  releaseEvidenceCryptoSuiteCatalog,
  releaseEvidenceStatementPreimage,
  verifyReleaseEvidenceEnvelope,
} from "./beta-release-evidence-envelope.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const compiler = await import(
  pathToFileURL(join(ROOT, "packages-ts", "galerina-core-compiler", "dist", "index.js")).href
);

const KEY_ID = /^[0-9a-f]{16}$/u;
const SIGNING_CONTEXT = "galerina.release.evidence.gate-admission.sig.v1";

// ★ G7.4 — the linking gate, as a CAPABILITY rather than a shape.
//
// "Admission is the only path to linking" is unenforceable if a linkable
// artifact is merely an object with the right fields: any caller could build
// one and a downstream linker checking `typeof` would accept it. So the mark
// of admission is MEMBERSHIP IN A MODULE-PRIVATE SET — mintable only by
// `linkableFromAdmission`, unforgeable from outside because the set is not
// exported and identity, not shape, is what is checked.
//
// Same pattern the release-evidence layer already uses for verified
// delegations (`VERIFIED_DELEGATIONS`); reused deliberately rather than
// invented, so there is one idea of "this object was vouched for" in the
// estate rather than two.
const ADMITTED_LINKABLES = new WeakMap();
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const TARGET = /^[A-Za-z0-9._-]+$/u;
const VERSION = /^\d+\.\d+\.\d+$/u;
const LINKER_RULES = "gate-v3-linker-rules@1";
const PLAN_KEYS = Object.freeze([
  "admissionDigest", "circuitDigest", "components", "linkerRules",
  "productionAuthorizing", "proofSetDigest", "registryDigest", "schema",
  "sourceDigest", "target", "verifierRules",
]);
const COMPONENT_KEYS = Object.freeze(["id", "implementationDigest", "version"]);

export const GATE_LINK_CODES = Object.freeze({
  NOT_ADMITTED: "GATE_LINK_NOT_ADMITTED",
  PLAN_INCOMPLETE: "GATE_LINK_PLAN_INCOMPLETE",
  PLAN_MALFORMED: "GATE_LINK_PLAN_MALFORMED",
  PLAN_DUPLICATE_COMPONENT: "GATE_LINK_PLAN_DUPLICATE_COMPONENT",
  PLAN_CARDINALITY: "GATE_LINK_PLAN_CARDINALITY",
  COMPONENT_NOT_ADMITTED: "GATE_LINK_COMPONENT_NOT_ADMITTED",
  COMPONENT_DIGEST_MISMATCH: "GATE_LINK_COMPONENT_DIGEST_MISMATCH",
  TARGET_MISMATCH: "GATE_LINK_TARGET_MISMATCH",
  PLAN_NOT_EMITTER_INPUT: "GATE_LINK_PLAN_NOT_EMITTER_INPUT",
  EMITTER_INPUT_REFUSED: "GATE_EMITTER_INPUT_REFUSED",
});

const refuseLink = (code) => { throw new Error(code); };
const digestCanonical = (value) => `sha256:${createHash("sha256")
  .update(canonicalReleaseEvidenceBytes(value)).digest("hex")}`;

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function canonicalSnapshot(value) {
  return deepFreeze(JSON.parse(canonicalReleaseEvidenceBytes(value).toString("utf8")));
}

function hasExactKeys(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function compareComponent(left, right) {
  if (left.id !== right.id) return left.id < right.id ? -1 : 1;
  if (left.version === right.version) return 0;
  return left.version < right.version ? -1 : 1;
}

function validateComponents(components) {
  if (!Array.isArray(components) || components.length < 1 || components.length > 4096) {
    refuseLink(GATE_LINK_CODES.PLAN_CARDINALITY);
  }
  const identities = new Set();
  for (const component of components) {
    if (!hasExactKeys(component, COMPONENT_KEYS)
        || typeof component.id !== "string" || component.id.length < 1 || component.id.length > 128
        || typeof component.version !== "string" || !VERSION.test(component.version)
        || typeof component.implementationDigest !== "string" || !SHA256.test(component.implementationDigest)) {
      refuseLink(GATE_LINK_CODES.PLAN_MALFORMED);
    }
    const identity = `${component.id}\u0000${component.version}`;
    if (identities.has(identity)) refuseLink(GATE_LINK_CODES.PLAN_DUPLICATE_COMPONENT);
    identities.add(identity);
  }
}

function privateBinding(value) {
  if (value === null || typeof value !== "object") refuseLink(GATE_LINK_CODES.NOT_ADMITTED);
  const binding = ADMITTED_LINKABLES.get(value);
  if (binding === undefined) refuseLink(GATE_LINK_CODES.NOT_ADMITTED);
  return binding;
}

/**
 * G7.3 — issue a gate-admission envelope over an ADMITTED statement.
 *
 * The suite gate runs FIRST and nothing is signed past a refusal: an unknown
 * suite refuses at issuance exactly as it refuses at verification (the
 * ratified exit criterion cuts both ways), and a suite the catalogue lists as
 * verify-only refuses for signing — retirement means retirement.
 *
 * ★ THE SIGNER IS A SEAM, NOT KEY MATERIAL. `signer` carries a keyId and two
 * callbacks — `signEd25519(preimage)` and `signMlDsa65(preimage, context)`,
 * each returning base64 — so private keys never pass through this module.
 * Key custody stays with the caller: per-run generated keys in the KATs, the
 * owner's offline ceremony for anything real.
 *
 * Refuses (nothing signed): a non-statement; a statement whose verdict is not
 * `admitted` (an authorization envelope over a refusal is a contradiction —
 * the refusal is already authoritative unsigned); a malformed signer; a suite
 * outside the catalogue or not active for signing.
 */
export function issueGateAdmissionEnvelope(statement, signer, options = {}) {
  const refusals = [];
  const suiteId = options.suiteId ?? "hybrid-ed25519-mldsa65";

  const suite = releaseEvidenceCryptoSuiteCatalog().find((s) => s.suiteId === suiteId);
  if (suite === undefined || suite.status !== "active-for-signing") {
    refusals.push("GATE_ADMISSION_ISSUE_SUITE_REFUSED");
  }
  if (
    statement === null || typeof statement !== "object"
    || statement.kind !== "gate-v3-admission.v1"
  ) {
    refusals.push("GATE_ADMISSION_ISSUE_NOT_A_STATEMENT");
  } else if (statement.verdict !== "admitted") {
    refusals.push("GATE_ADMISSION_ISSUE_VERDICT_NOT_ADMITTED");
  }
  if (
    signer === null || typeof signer !== "object"
    || !KEY_ID.test(String(signer.keyId))
    || typeof signer.signEd25519 !== "function"
    || typeof signer.signMlDsa65 !== "function"
  ) {
    refusals.push("GATE_ADMISSION_ISSUE_SIGNER_REFUSED");
  }
  if (refusals.length > 0) return Object.freeze({ ok: false, refusals: Object.freeze(refusals), envelope: null });

  const preimage = releaseEvidenceStatementPreimage(statement, RELEASE_EVIDENCE_ROLE.GATE_ADMISSION);
  return Object.freeze({
    ok: true,
    refusals: Object.freeze([]),
    envelope: Object.freeze({
      schema: "galerina.release-evidence.envelope.v1",
      statement,
      signature: Object.freeze({
        algorithm: suiteId,
        canon: "galerina-canonical-json-v1",
        context: SIGNING_CONTEXT,
        keyId: signer.keyId,
        ed25519Signature: signer.signEd25519(preimage),
        mlDsa65Signature: signer.signMlDsa65(preimage, SIGNING_CONTEXT),
      }),
    }),
  });
}

/**
 * Verify a signed gate-admission envelope against the artifacts IN HAND.
 *
 * ★ THIS is the whole question — signature AND bindings, in that order. The
 * compiler's `verifyAdmissionBindings` answers only the second half and passes
 * a forged statement; use this, or `linkableFromAdmission`, never that alone.
 *
 * @param envelope the release-evidence envelope carrying an admission statement
 * @param options  the envelope layer's options (verified delegation, public
 *                 bundles, `at`, `isRevoked`) — `role` is pinned here and not
 *                 caller-choosable: this function answers exactly one question
 * @param inHand   { sourceBytes, registryCanonicalForm, circuitCanonicalForm,
 *                   proofs, target } — what the caller actually holds
 * @returns {{ ok: boolean, refusals: readonly string[], statement: object|null,
 *   refusedStatement?: object }}
 *   `ok` only when the signature verifies AND the statement is about these
 *   artifacts AND its verdict is admitted. Refusals carry the layer's own
 *   codes verbatim — envelope strings or GATE-ADMIT-* — so the two layers
 *   stay distinguishable in the report.
 *
 *   ★ `statement` is NULL on EVERY failure, whichever layer refused — a
 *   caller may treat its presence as the result being usable. Where a
 *   signature verified but the bindings did not, the statement is returned as
 *   `refusedStatement` for reporting only; it describes some OTHER artifact,
 *   which is exactly why it does not get the usable name.
 */
export function verifyGateAdmissionEnvelope(envelope, options, inHand) {
  let verified;
  try {
    verified = verifyReleaseEvidenceEnvelope(envelope, {
      ...options,
      role: RELEASE_EVIDENCE_ROLE.GATE_ADMISSION,
    });
  } catch (error) {
    return Object.freeze({ ok: false, refusals: Object.freeze([String(error.message)]), statement: null });
  }

  const result = compiler.verifyAdmissionBindings(verified.statement, inHand, {
    canonicalBytes: canonicalReleaseEvidenceBytes,
  });
  if (!result.bindingsMatch) {
    // ⚠ `statement` is NULL on every failure, and that uniformity is the point
    // (cold review, cycle 0144). This branch used to return the statement
    // regardless, so the two failure modes had DIFFERENT shapes: an envelope
    // failure gave null, a binding failure gave a live object. A caller who
    // learned "null on failure" from the first got, in the SUBSTITUTION case, an
    // authentically-signed statement describing a DIFFERENT CIRCUIT — and the
    // natural defensive idiom `const s = r.statement; if (s) { … }` sails
    // straight through it. The signature being genuine is what made it
    // dangerous: nothing about the object looks wrong.
    //
    // The statement is still available for REPORTING under a name no caller can
    // mistake for a usable result. "Your envelope is for circuit X, you hold Y"
    // is worth saying; it is not worth risking a field called `statement`.
    return Object.freeze({
      ok: false,
      refusals: Object.freeze(result.diagnostics.map((d) => d.code)),
      statement: null,
      refusedStatement: verified.statement,
    });
  }
  return Object.freeze({
    ok: true,
    refusals: Object.freeze([]),
    statement: verified.statement,
  });
}

/**
 * G7.4 — the ONLY way to obtain a linkable artifact for a circuit.
 *
 * Runs the composed verification (signature, then binding) and, only on a
 * clean pass, mints a frozen linkable and registers it in the private
 * capability set. Any refusal returns `linkable: null` — there is no partial
 * result and no override parameter, because an override is how "the only
 * path" becomes "the usual path".
 *
 * ⚠ SCOPE, stated so nobody reads more into this than it does. G6 is still
 * unwired (doc 34 §3.1) and `lowerCircuitToGIR` has NO consumer in the
 * compiler: wiring it is doc 34 ORDER 6, a separate ratified step. This
 * function is the gate that order 6 must route through — it does not itself
 * connect a circuit to any emitter, and a circuit still has no executable
 * body. What it establishes today is that when a linker arrives, the only
 * artifact it can accept is one this function minted.
 */
export function linkableFromAdmission(envelope, options, inHand) {
  const verdict = verifyGateAdmissionEnvelope(envelope, options, inHand);
  if (!verdict.ok) {
    return Object.freeze({ ok: false, refusals: verdict.refusals, linkable: null });
  }
  try {
    const statement = canonicalSnapshot(verdict.statement);
    const components = canonicalSnapshot([...statement.components].sort(compareComponent));
    validateComponents(components);
    const plan = deepFreeze({
      schema: "gate-v3-link-plan.v1",
      productionAuthorizing: false,
      admissionDigest: digestCanonical(statement),
      sourceDigest: statement.sourceDigest,
      registryDigest: statement.registryDigest,
      circuitDigest: statement.circuitDigest,
      proofSetDigest: digestCanonical(statement.proofs),
      target: statement.target,
      components,
      verifierRules: statement.verifier.ruleSet,
      linkerRules: LINKER_RULES,
    });
    assertLinkPlanComplete(plan);

    const linkable = deepFreeze({
      kind: "gate-v3-linkable.v1",
      circuitDigest: statement.circuitDigest,
      target: statement.target,
      components,
    });
    ADMITTED_LINKABLES.set(linkable, deepFreeze({
      plan,
      circuitSnapshot: canonicalSnapshot(inHand.circuitCanonicalForm),
    }));
    return Object.freeze({ ok: true, refusals: Object.freeze([]), linkable });
  } catch (error) {
    const code = error instanceof Error && /^GATE_LINK_/u.test(error.message)
      ? error.message
      : GATE_LINK_CODES.PLAN_MALFORMED;
    return Object.freeze({ ok: false, refusals: Object.freeze([code]), linkable: null });
  }
}

/**
 * The check a linker performs before doing anything with an artifact.
 *
 * ★ Identity, not shape. A structurally identical object built by hand — same
 * kind, same digest, same fields — is REFUSED, because it was never minted
 * here. That is the whole difference between a gate and a convention.
 *
 * @throws {Error} `GATE_LINK_NOT_ADMITTED` for anything not minted by
 *   `linkableFromAdmission`, including a perfect structural clone.
 */
export function assertLinkableAdmitted(value) {
  privateBinding(value);
  return value;
}

/** Validate the exact non-authorizing order-six plan schema. */
export function assertLinkPlanComplete(plan) {
  if (!hasExactKeys(plan, PLAN_KEYS)) refuseLink(GATE_LINK_CODES.PLAN_INCOMPLETE);
  if (plan.schema !== "gate-v3-link-plan.v1" || plan.productionAuthorizing !== false) {
    refuseLink(GATE_LINK_CODES.PLAN_MALFORMED);
  }
  for (const field of ["admissionDigest", "sourceDigest", "registryDigest", "circuitDigest", "proofSetDigest"]) {
    if (typeof plan[field] !== "string" || !SHA256.test(plan[field])) {
      refuseLink(GATE_LINK_CODES.PLAN_MALFORMED);
    }
  }
  if (typeof plan.target !== "string" || plan.target.length < 1 || plan.target.length > 128
      || !TARGET.test(plan.target)
      || typeof plan.verifierRules !== "string" || plan.verifierRules.length < 1 || plan.verifierRules.length > 128
      || typeof plan.linkerRules !== "string" || plan.linkerRules.length < 1 || plan.linkerRules.length > 128) {
    refuseLink(GATE_LINK_CODES.PLAN_MALFORMED);
  }
  validateComponents(plan.components);
  const sorted = [...plan.components].sort(compareComponent);
  if (plan.components.some((component, index) => component.id !== sorted[index].id
      || component.version !== sorted[index].version
      || component.implementationDigest !== sorted[index].implementationDigest)) {
    refuseLink(GATE_LINK_CODES.PLAN_MALFORMED);
  }
  return plan;
}

/** Build the closed plan solely from module-private admission-time material. */
export function buildLinkPlan(linkable) {
  return privateBinding(linkable).plan;
}

/** Digest the exact canonical plan bytes through the production encoder. */
export function linkPlanDigest(plan) {
  assertLinkPlanComplete(plan);
  return digestCanonical(plan);
}

/** Resolve one component descriptor within the admitted target and digest set. */
export function resolveComponentArtifact(linkable, requested, options = {}) {
  const binding = privateBinding(linkable);
  const plan = binding.plan;
  if (options !== null && typeof options === "object" && options.target !== undefined
      && options.target !== plan.target) {
    refuseLink(GATE_LINK_CODES.TARGET_MISMATCH);
  }
  if (requested === null || typeof requested !== "object") {
    refuseLink(GATE_LINK_CODES.COMPONENT_NOT_ADMITTED);
  }
  const component = plan.components.find((candidate) => candidate.id === requested.id
    && candidate.version === requested.version);
  if (component === undefined) refuseLink(GATE_LINK_CODES.COMPONENT_NOT_ADMITTED);
  if (requested.implementationDigest !== component.implementationDigest) {
    refuseLink(GATE_LINK_CODES.COMPONENT_DIGEST_MISMATCH);
  }
  return component;
}

/** Refuse order-six plans at every executable GIR/emitter seam. */
export function assertNotEmitterInput(value) {
  if (value !== null && typeof value === "object" && value.schema === "gate-v3-link-plan.v1") {
    refuseLink(GATE_LINK_CODES.PLAN_NOT_EMITTER_INPUT);
  }
  if (value === null || typeof value !== "object" || value.schemaVersion !== "fungi.gir.v1") {
    refuseLink(GATE_LINK_CODES.EMITTER_INPUT_REFUSED);
  }
  return value;
}
