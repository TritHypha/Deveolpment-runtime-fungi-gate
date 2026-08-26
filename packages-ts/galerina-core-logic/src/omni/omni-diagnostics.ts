// =============================================================================
// OmniState diagnostic codes — FUNGI-OMNI series
// =============================================================================

import type { LogicDiagnostic } from "../index.js";

// ---------------------------------------------------------------------------
// Diagnostic code constants
// ---------------------------------------------------------------------------

/** FUNGI-OMNI-001: OmniDecision reached a deterministic boundary without going through omniToDecision(). */
export const FUNGI_OMNI_001_DIRECT_BOUNDARY_USE = "FUNGI-OMNI-001";

/** FUNGI-OMNI-002: OmniDecision.advisoryOnly is false — this violates the advisory contract. */
export const FUNGI_OMNI_002_ADVISORY_ONLY_VIOLATED = "FUNGI-OMNI-002";

/** FUNGI-OMNI-003: OmniDecision.confidence is outside the [0, 1] range. */
export const FUNGI_OMNI_003_CONFIDENCE_OUT_OF_RANGE = "FUNGI-OMNI-003";

/** FUNGI-OMNI-004: OmniEvidence is missing a required field. */
export const FUNGI_OMNI_004_MALFORMED_EVIDENCE = "FUNGI-OMNI-004";

/** FUNGI-OMNI-005: OmniState value is not a recognised state string. */
export const FUNGI_OMNI_005_INVALID_STATE = "FUNGI-OMNI-005";

// ---------------------------------------------------------------------------
// Diagnostic constructors
// ---------------------------------------------------------------------------

export function omniDiagnosticDirectBoundaryUse(path?: string): LogicDiagnostic {
  return {
    code: FUNGI_OMNI_001_DIRECT_BOUNDARY_USE,
    name: "DIRECT_BOUNDARY_USE",
    severity: "error",
    message: "OmniDecision must be converted via omniToDecision() before reaching a deterministic boundary. Never use OmniState values directly in capability or policy gates.",
    ...(path === undefined ? {} : { path }),
  };
}

export function omniDiagnosticAdvisoryOnlyViolated(path?: string): LogicDiagnostic {
  return {
    code: FUNGI_OMNI_002_ADVISORY_ONLY_VIOLATED,
    name: "ADVISORY_ONLY_VIOLATED",
    severity: "error",
    message: "OmniDecision.advisoryOnly must always be true. Omni logic is advisory and must not control deterministic execution directly.",
    ...(path === undefined ? {} : { path }),
  };
}

export function omniDiagnosticConfidenceOutOfRange(
  confidence: number,
  path?: string,
): LogicDiagnostic {
  return {
    code: FUNGI_OMNI_003_CONFIDENCE_OUT_OF_RANGE,
    name: "CONFIDENCE_OUT_OF_RANGE",
    severity: "error",
    message: `OmniDecision.confidence must be in the range [0, 1]. Received: ${confidence}.`,
    ...(path === undefined ? {} : { path }),
  };
}

export function omniDiagnosticMalformedEvidence(path?: string): LogicDiagnostic {
  return {
    code: FUNGI_OMNI_004_MALFORMED_EVIDENCE,
    name: "MALFORMED_EVIDENCE",
    severity: "error",
    message: "OmniEvidence is missing a required field (code, message, or confidence).",
    ...(path === undefined ? {} : { path }),
  };
}

export function omniDiagnosticInvalidState(
  value: unknown,
  path?: string,
): LogicDiagnostic {
  return {
    code: FUNGI_OMNI_005_INVALID_STATE,
    name: "INVALID_STATE",
    severity: "error",
    message: `"${String(value)}" is not a valid OmniState. Expected one of: true, false, unknown, partial_true, partial_false, conflicted, deferred, inconsistent.`,
    ...(path === undefined ? {} : { path }),
  };
}
