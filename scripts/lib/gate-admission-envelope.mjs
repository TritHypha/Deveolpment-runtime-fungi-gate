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
