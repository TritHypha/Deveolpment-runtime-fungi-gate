export interface RequirementDiagnosticDefinition {
  readonly code: `FUNGI-REQUIREMENT-${string}`;
  readonly name: string;
  readonly severity: "error";
  readonly message: string;
  readonly suggestedFix: string;
}

export const FUNGI_REQUIREMENT_001 = {
  code: "FUNGI-REQUIREMENT-001",
  name: "EMPTY_REQUIREMENT",
  severity: "error",
  message: "requirement must contain at least one constraint.",
  suggestedFix: "Add at least one Bool or Verdict constraint.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_002 = {
  code: "FUNGI-REQUIREMENT-002",
  name: "CONSTRAINT_TYPE_MISMATCH",
  severity: "error",
  message: "requirement constraints must evaluate to Bool or Verdict.",
  suggestedFix: "Return Bool or Verdict from the constraint expression.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_003 = {
  code: "FUNGI-REQUIREMENT-003",
  name: "CONSTRAINT_EFFECTFUL",
  severity: "error",
  message: "requirement constraints and their transitive callees must be effect-free.",
  suggestedFix: "Move effects before the requirement and pass an immutable result into the constraint.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_004 = {
  code: "FUNGI-REQUIREMENT-004",
  name: "TAINT_AUTHORITY_MISSING",
  severity: "error",
  message: "tainted requirement input needs admitted validator authority.",
  suggestedFix: "Validate the tainted input through an admitted validator before using it.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_005 = {
  code: "FUNGI-REQUIREMENT-005",
  name: "CONSTRAINT_CEILING",
  severity: "error",
  message: "requirement exceeds the maximum of 64 constraints.",
  suggestedFix: "Split the policy into bounded requirement expressions of at most 64 constraints.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_006 = {
  code: "FUNGI-REQUIREMENT-006",
  name: "NON_EXHAUSTIVE_REQUIRE",
  severity: "error",
  message: "require must contain exactly one deny handler and exactly one ambig handler.",
  suggestedFix: "Add one deny handler and one ambig handler; remove duplicates.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_007 = {
  code: "FUNGI-REQUIREMENT-007",
  name: "NON_TERMINAL_REQUIRE_HANDLER",
  severity: "error",
  message: "deny and ambig handlers must terminate before the guarded continuation.",
  suggestedFix: "End each deny and ambig handler with a terminal fault or return.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_008 = {
  code: "FUNGI-REQUIREMENT-008",
  name: "NESTED_REQUIREMENT",
  severity: "error",
  message: "version 1 does not permit nested requirement expressions.",
  suggestedFix: "Flatten the nested constraints into one bounded requirement expression.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_009 = {
  code: "FUNGI-REQUIREMENT-009",
  name: "REQUIRE_SUBJECT_TYPE_MISMATCH",
  severity: "error",
  message: "require subject must evaluate to Bool or Verdict.",
  suggestedFix: "Use a Bool or Verdict expression as the require subject.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_010 = {
  code: "FUNGI-REQUIREMENT-010",
  name: "VALIDATOR_AUTHORITY_INVALID",
  severity: "error",
  message: "validator identity, profile, and freshness must match admitted authority.",
  suggestedFix: "Bind the validator to the admitted identity, profile, and fresh evidence.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_011 = {
  code: "FUNGI-REQUIREMENT-011",
  name: "REQUIREMENT_LOWERING_UNSUPPORTED",
  severity: "error",
  message: "lowering cannot preserve the checked requirement plan.",
  suggestedFix: "Use only requirement constructs supported by the selected lowering profile.",
} as const satisfies RequirementDiagnosticDefinition;

export const FUNGI_REQUIREMENT_012 = {
  code: "FUNGI-REQUIREMENT-012",
  name: "REQUIREMENT_RECEIPT_MISMATCH",
  severity: "error",
  message: "independent requirement receipt does not match the checked plan.",
  suggestedFix: "Refuse the artifact and regenerate both plan and receipt from the same checked source.",
} as const satisfies RequirementDiagnosticDefinition;

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
