// =============================================================================
// Decision-shape backstop — G3 rung 6 (KTA plan 27); GD-008's SECONDARY half.
//
// Description: the owner's GD-008 ruling had two halves. PRIMARY (shipped at
//   G2): a component declaring `decision: true` + ordered `arms` has every arm
//   checked for routing. SECONDARY (this file): a WARNING when a component
//   LOOKS LIKE a three-valued decision but is not marked one — the backstop
//   that makes the original evasion (spell the ports permit/refuse/
//   indeterminate and declare nothing) visible instead of silent.
// Version / change-control: G3 rung 6. Closes GD-008's remainder.
// Pointers: gate-v3-registry.ts (`decision`/`arms`); gate-v3-resolve.ts
//   RESOLVE-111 (the primary half's refusal); gate-v3-verdict.ts (the algebra
//   a declared decision routes over).
//
// SHAPE-DRIVEN, NEVER NAME-DRIVEN. The trigger is structural: EXACTLY three
//   outputs, all carrying ONE declared type. Port names are never consulted —
//   matching names was the original defect (4/4 reviews), and a name-based
//   backstop would be evadable by the same renaming that evaded AUTH-001/002.
//   A WARNING, not an error, exactly as ruled: the shape is a strong hint, not
//   proof — a legitimate three-way splitter exists — so the contract author is
//   nudged to declare intent, and a declared `decision: false`-by-absence that
//   is genuinely not a decision stays admissible.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateV3Registry } from "./gate-v3-registry.js";

/** Rung-6 warning: K3-shaped outputs, undeclared. */
export const GATE_SEM_004 = Object.freeze({
  code: "GATE-SEM-004",
  name: "GATE_V3_UNDECLARED_DECISION_SHAPE",
  message: "component's outputs are shaped like a three-valued decision (three outputs, one shared type) but the contract does not declare decision: true",
});

/**
 * Warn on every USED component whose output set is K3-shaped but undeclared.
 *
 * Runs over the parts a circuit actually instantiates rather than the whole
 * registry: the registry may legitimately catalogue undeclared-decision
 * components a given circuit never touches, and a warning about an unused
 * contract would be noise attached to the wrong artifact.
 */
export function verifyDecisionShapes(circuit: GateV3Circuit, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  const warned = new Set<string>();                  // one warning per contract, not per instance

  for (const part of circuit.parts) {
    const key = `${part.component}@${part.version}`;
    if (warned.has(key)) continue;
    const contract = registry.components.get(key);
    if (!contract || contract.decision) continue;    // unresolved: resolution owns it; declared: primary owns it

    const outputs = [...contract.outputs.values()];
    if (outputs.length !== 3) continue;
    const types = new Set(outputs.map((output) => output.type));
    if (types.size !== 1) continue;

    warned.add(key);
    diagnostics.push({
      code: GATE_SEM_004.code,
      name: GATE_SEM_004.name,
      severity: "warning",
      message: `${key}: ${GATE_SEM_004.message}`,
      location: part.location,
    });
  }
  return Object.freeze(diagnostics);
}
