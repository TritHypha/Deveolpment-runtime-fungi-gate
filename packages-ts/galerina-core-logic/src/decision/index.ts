// =============================================================================
// @galerina/core-logic/decision — Decision v0.2 sub-path export
// =============================================================================

export type { Decision, DecisionEvidence } from "./decision-state.js";
export {
  isAllow,
  isDeny,
  isReview,
  isUnknownDecision,
  decisionToRuntimeBool,
} from "./decision-state.js";

export {
  allow,
  deny,
  review,
  unknownDecision,
} from "./decision-constructors.js";

export { combineDecisions } from "./decision-combine.js";

export type { CapabilityRequest, PolicyContext } from "./decision-evaluate.js";
export { evaluateCapability } from "./decision-evaluate.js";

export {
  FUNGI_DECISION_001_INVALID_DECISION,
  FUNGI_DECISION_002_EMPTY_REASON,
  FUNGI_DECISION_003_EMPTY_UNKNOWN_REASONS,
  FUNGI_DECISION_004_FAILED_CLOSED,
  FUNGI_DECISION_005_EMPTY_COMBINE,
  decisionDiagnosticInvalid,
  decisionDiagnosticEmptyReason,
  decisionDiagnosticEmptyUnknownReasons,
  decisionDiagnosticFailedClosed,
  decisionDiagnosticEmptyCombine,
} from "./decision-diagnostics.js";
