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
  pathToFileURL(join(ROOT, "packages-galerina", "galerina-core-compiler", "dist", "index.js")).href
);

/**
 * Verify a signed gate-admission envelope against the artifacts IN HAND.
 *
 * @param envelope the release-evidence envelope carrying an admission statement
 * @param options  the envelope layer's options (verified delegation, public
 *                 bundles, `at`, `isRevoked`) — `role` is pinned here and not
 *                 caller-choosable: this function answers exactly one question
 * @param inHand   { sourceBytes, registryCanonicalForm, circuitCanonicalForm,
 *                   proofs, target } — what the caller actually holds
 * @returns {{ ok: boolean, refusals: readonly string[], statement: object|null }}
 *   `ok` only when the signature verifies AND the statement is about these
 *   artifacts AND its verdict is admitted. Refusals carry the layer's own
 *   codes verbatim — envelope strings or GATE-ADMIT-* — so the two layers
 *   stay distinguishable in the report.
 */
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
const ADMITTED_LINKABLES = new WeakSet();

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

  const result = compiler.verifyAdmissionStatement(verified.statement, inHand, {
    canonicalBytes: canonicalReleaseEvidenceBytes,
  });
  return Object.freeze({
    ok: result.ok,
    refusals: Object.freeze(result.diagnostics.map((d) => d.code)),
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
  const linkable = Object.freeze({
    kind: "gate-v3-linkable.v1",
    circuitDigest: verdict.statement.circuitDigest,
    target: verdict.statement.target,
    components: verdict.statement.components,
  });
  ADMITTED_LINKABLES.add(linkable);
  return Object.freeze({ ok: true, refusals: Object.freeze([]), linkable });
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
  if (typeof value !== "object" || value === null || !ADMITTED_LINKABLES.has(value)) {
    throw new Error("GATE_LINK_NOT_ADMITTED");
  }
  return value;
}
