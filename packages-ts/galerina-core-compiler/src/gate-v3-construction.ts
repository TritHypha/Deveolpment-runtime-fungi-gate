// =============================================================================
// Construction enforcement — G3 rung 7 (KTA plan 27); closes GD-025.
//
// Description: makes the registry's `construction` axis a GUARD instead of a
//   label. GD-025's finding was exact: the loader validates
//   `construction: source | canonical-only | verified-measurement-only`
//   (GATE-REGISTRY-008) and then NOTHING reads the field — the same shape as
//   GD-010 (a wall disabled) and GD-011 (a field read as decoration). A field
//   that looks like a guard but is never read is not a guard.
// Version / change-control: G3 rung 7.
// Pointers: gate-v3-registry.ts (the axis's validation); GD-025 in the KTA
//   register; FUNGI-TYPE-003 (the `.fungi` analogue: construction only via
//   the assay gate).
//
// THE RULE: a non-`source` type must not enter the circuit as a PARAMETER.
//   `canonical-only` means "the only way to hold one is to have been given it
//   by its constructor component"; `verified-measurement-only` means "by its
//   verifying measurement component". A circuit parameter arrives from the
//   caller — from OUTSIDE the governed drawing — so admitting one of these
//   types there would mean a minted/verified value whose mint or verification
//   never ran anywhere the circuit can see. Outputs and returns are already
//   sound: a component OUTPUT of such a type is the registered constructor
//   speaking through its own contract, and OUT is produced inside.
//
// TAINT-TRANSPARENCY PRESERVED: a mint is not a sanitizer. This rule shares
//   no state with the cut rules — a canonical-only value is still tainted if
//   its inputs were, and the separator neither consults nor trusts
//   `construction`.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateV3Registry } from "./gate-v3-registry.js";

/** Rung-7 refusal: a minted/verified type arriving from outside. */
export const GATE_SEM_005 = Object.freeze({
  code: "GATE-SEM-005",
  name: "GATE_V3_NON_SOURCE_TYPE_AS_PARAMETER",
  message: "a non-source type enters as a circuit parameter — its constructor/verifier never runs inside the governed drawing",
});

/**
 * Refuse every circuit parameter whose declared type the catalogue marks
 * non-`source`. Types absent from the catalogue are NOT judged here —
 * GATE-RESOLVE-108/109 owns unknown-type refusals, and judging an unknown
 * type's construction would be inventing a fact.
 */
export function verifyConstructionEntry(circuit: GateV3Circuit, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  for (const param of circuit.params) {
    const declared = registry.types.get(param.type);
    if (!declared || declared.construction === "source") continue;
    diagnostics.push({
      code: GATE_SEM_005.code,
      name: GATE_SEM_005.name,
      severity: "error",
      message: `${circuit.name}: parameter '${param.name}: ${param.type}' — ${GATE_SEM_005.message} (declared construction: ${declared.construction})`,
      location: param.location,
    });
  }
  return Object.freeze(diagnostics);
}
