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
import type { GateGraph } from "./gate-v3-graph.js";

/** The terminal families whose reasons a vocabulary may govern. Kept in lock
 *  step with the loader's VOCABULARY_FAMILIES and the graph's terminal set. */
const TERMINAL_FAMILIES = new Set(["DENY", "FAULT", "TRAP", "DRAIN"]);

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
/** Rung-9 refusal: a terminal reason outside its declared vocabulary. */
export const GATE_SEM_007 = Object.freeze({
  code: "GATE-SEM-007",
  name: "GATE_V3_REASON_OUTSIDE_VOCABULARY",
  message: "terminal reason is not in the registry's declared vocabulary for its family",
});

/** Rung-9 label: reasons exist but NO vocabulary governs them. Info severity —
 *  a scope statement, not a refusal. GD-018's lesson made this mandatory: the
 *  mode that skips a check must say so, or its green reads as the checked
 *  mode's green. */
export const GATE_SEM_008 = Object.freeze({
  code: "GATE-SEM-008",
  name: "GATE_V3_REASONS_UNCHECKED",
  message: "terminal reasons are UNCHECKED — the registry declares no vocabulary for this family",
});

/**
 * GD-009 under ruling ④, the vocabulary option: ruling ④ forbade resurrecting
 * v2's B1 polarity lexicon (a word-list guessing at sentiment), and offered
 * registered per-terminal vocabularies instead — the registry DECLARES the
 * admissible reasons per family, and a reason outside the declared set
 * refuses. `DENY.approved` is then refused not because "approved" sounds
 * positive but because the deny vocabulary never admitted it — contract-driven
 * like every other G2/G3 rule, with nothing to evade by respelling.
 *
 * A family with reasons in the drawing but NO declared vocabulary yields one
 * INFO label per family: unchecked, stated. Absence of a vocabulary is
 * absence of the check, never a pass.
 */
export function verifyTerminalVocabulary(circuit: GateV3Circuit, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  const unchecked = new Set<string>();

  for (const wire of circuit.wires) {
    if (!TERMINAL_FAMILIES.has(wire.to.node)) continue;
    const family = wire.to.node.toLowerCase();
    const vocabulary = registry.vocabularies.get(family);
    if (vocabulary === undefined) {
      unchecked.add(wire.to.node);
      continue;
    }
    if (!vocabulary.has(wire.to.port)) {
      diagnostics.push({
        code: GATE_SEM_007.code,
        name: GATE_SEM_007.name,
        severity: "error",
        message: `${circuit.name}: '${wire.to.text}' — ${GATE_SEM_007.message} (${family}: ${[...vocabulary].join(", ") || "(empty)"})`,
        location: wire.location,
      });
    }
  }

  for (const family of [...unchecked].sort()) {
    diagnostics.push({
      code: GATE_SEM_008.code,
      name: GATE_SEM_008.name,
      severity: "info",
      message: `${circuit.name}: ${family}.* — ${GATE_SEM_008.message}`,
      location: circuit.location,
    });
  }
  return Object.freeze(diagnostics);
}

/** G4 refusal: a non-allow decision arm reaches egress without passing
 *  through another decision. */
export const GATE_SEM_011 = Object.freeze({
  code: "GATE-SEM-011",
  name: "GATE_V3_NON_ALLOW_ARM_REACHES_EGRESS",
  message: "a deny/indeterminate arm reaches OUT without an intervening decision (a refusal is flowing into success)",
});

/**
 * G4 — the circuit-level use of the K3 fold's deny-dominance: a value that
 * left a decision on a NON-allow arm must never reach `OUT` unless a LATER
 * decision re-authorizes it. Sequential re-decision REPLACES a verdict (the
 * shipped token example's expired path: `state.deny -> reemit.subject`, and
 * only `reemit.allow` proceeds); flowing a deny-arm value into success
 * WITHOUT one is the fail-open this rule exists to refuse.
 *
 * ARM ROLES COME FROM POSITION, NEVER FROM NAMES: ruling ①'s `arms` list is
 * ORDERED — `arms[0]` is the allow-role arm, everything after it is not. A
 * component spelling its arms `permit/refuse/unsure` is judged identically.
 *
 * Mechanics: from each wire leaving a non-allow arm, walk forward with EVERY
 * decision part as a barrier (entering a decision's inputs ends the walk —
 * that is the re-authorization). Reaching OUT refuses. Iterative BFS.
 */
export function verifyDenyArmContainment(
  circuit: GateV3Circuit,
  graph: GateGraph,
  registry: GateV3Registry,
): readonly ParseDiagnostic[] {
  // Decision instances and their non-allow arm ports, from contracts only.
  const decisionParts = new Set<string>();
  const nonAllowArms = new Map<string, Set<string>>();      // instance -> ports
  for (const part of circuit.parts) {
    const contract = registry.components.get(`${part.component}@${part.version}`);
    if (!contract || !contract.decision || contract.arms.length === 0) continue;
    decisionParts.add(part.instance);
    nonAllowArms.set(part.instance, new Set(contract.arms.slice(1)));
  }
  if (decisionParts.size === 0) return Object.freeze([]);

  const successors = new Map<string, string[]>();
  for (const node of graph.nodes) successors.set(node.id, []);
  for (const edge of graph.edges) successors.get(edge.from.node)?.push(edge.to.node);

  const diagnostics: ParseDiagnostic[] = [];
  for (const edge of graph.edges) {
    const arms = nonAllowArms.get(edge.from.node);
    if (!arms || !arms.has(edge.from.port)) continue;

    // Walk forward from the arm's TARGET. A decision node is a barrier: the
    // walk records reaching it but never traverses beyond it.
    const seen = new Set<string>([edge.to.node]);
    const queue = decisionParts.has(edge.to.node) ? [] : [edge.to.node];
    while (queue.length > 0) {
      for (const next of successors.get(queue.shift()!) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        if (!decisionParts.has(next)) queue.push(next);
      }
    }
    if (!seen.has("OUT")) continue;

    diagnostics.push({
      code: GATE_SEM_011.code,
      name: GATE_SEM_011.name,
      severity: "error",
      message: `${circuit.name}: '${edge.from.node}.${edge.from.port}' — ${GATE_SEM_011.message}`,
      location: circuit.location,
    });
  }
  return Object.freeze(diagnostics);
}

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
