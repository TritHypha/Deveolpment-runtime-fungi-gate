export interface RequirementDiagnosticDefinition {
  readonly code: `FUNGI-REQUIREMENT-${string}`;
  readonly name: string;
  readonly severity: "error";
  readonly message: string;
  readonly suggestedFix: string;
}

const requirementDiagnostic = (
  code: RequirementDiagnosticDefinition["code"],
  name: string,
  message: string,
  suggestedFix: string,
): RequirementDiagnosticDefinition => Object.freeze({ code, name, severity: "error", message, suggestedFix });

export const FUNGI_REQUIREMENT_001 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-001",
  "EMPTY_REQUIREMENT",
  "requirement must contain at least one constraint.",
  "Add at least one Bool or Verdict constraint.",
);

export const FUNGI_REQUIREMENT_002 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-002",
  "CONSTRAINT_TYPE_MISMATCH",
  "requirement constraints must evaluate to Bool or Verdict.",
  "Return Bool or Verdict from the constraint expression.",
);

export const FUNGI_REQUIREMENT_003 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-003",
  "CONSTRAINT_EFFECTFUL",
  "requirement constraints and their transitive callees must be effect-free.",
  "Move effects before the requirement and pass an immutable result into the constraint.",
);

export const FUNGI_REQUIREMENT_004 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-004",
  "TAINT_AUTHORITY_MISSING",
  "tainted requirement input needs admitted validator authority.",
  "Validate the tainted input through an admitted validator before using it.",
);

export const FUNGI_REQUIREMENT_005 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-005",
  "CONSTRAINT_CEILING",
  "requirement exceeds the maximum of 64 constraints.",
  "Split the policy into bounded requirement expressions of at most 64 constraints.",
);

export const FUNGI_REQUIREMENT_006 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-006",
  "NON_EXHAUSTIVE_REQUIRE",
  "require must contain exactly one deny handler and exactly one ambig handler.",
  "Add one deny handler and one ambig handler; remove duplicates.",
);

export const FUNGI_REQUIREMENT_007 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-007",
  "NON_TERMINAL_REQUIRE_HANDLER",
  "deny and ambig handlers must terminate before the guarded continuation.",
  "End each deny and ambig handler with a terminal fault or return.",
);

export const FUNGI_REQUIREMENT_008 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-008",
  "NESTED_REQUIREMENT",
  "version 1 does not permit nested requirement expressions.",
  "Flatten the nested constraints into one bounded requirement expression.",
);

export const FUNGI_REQUIREMENT_009 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-009",
  "REQUIRE_SUBJECT_TYPE_MISMATCH",
  "require subject must evaluate to Bool or Verdict.",
  "Use a Bool or Verdict expression as the require subject.",
);

export const FUNGI_REQUIREMENT_010 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-010",
  "VALIDATOR_AUTHORITY_INVALID",
  "validator identity, profile, and freshness must match admitted authority.",
  "Bind the validator to the admitted identity, profile, and fresh evidence.",
);

export const FUNGI_REQUIREMENT_011 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-011",
  "REQUIREMENT_LOWERING_UNSUPPORTED",
  "lowering cannot preserve the checked requirement plan.",
  "Use only requirement constructs supported by the selected lowering profile.",
);

export const FUNGI_REQUIREMENT_012 = requirementDiagnostic(
  "FUNGI-REQUIREMENT-012",
  "REQUIREMENT_RECEIPT_MISMATCH",
  "independent requirement receipt does not match the checked plan.",
  "Refuse the artifact and regenerate both plan and receipt from the same checked source.",
);

export const FUNGI_REQUIREMENT_DIAGNOSTICS = Object.freeze([
  FUNGI_REQUIREMENT_001,
  FUNGI_REQUIREMENT_002,
  FUNGI_REQUIREMENT_003,
  FUNGI_REQUIREMENT_004,
  FUNGI_REQUIREMENT_005,
  FUNGI_REQUIREMENT_006,
  FUNGI_REQUIREMENT_007,
  FUNGI_REQUIREMENT_008,
  FUNGI_REQUIREMENT_009,
  FUNGI_REQUIREMENT_010,
  FUNGI_REQUIREMENT_011,
  FUNGI_REQUIREMENT_012,
] as const);
