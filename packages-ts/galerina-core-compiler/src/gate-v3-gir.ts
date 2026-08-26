// =============================================================================
// `.gate` circuit -> GIR lowering — G6 rung 2 (KTA plan 32).
//
// Description: lowers a parsed, resolved circuit into a `GIRCircuit`. Identity
//   (name, intent, canonically-ordered parts and wires) and the effect envelope
//   ({declared, observed, status}) — which is the same triple GATE-SEM-009/010
//   compares, recorded here rather than re-derived.
// Version / change-control: G6 rung 2. Proofs are rung 4 and are OMITTED until
//   then, never emitted as `[]`.
// Pointers: KTA 32-round-six-g6-plan.md (option C, owner-ratified);
//   gir-emitter.ts (GIRCircuit, GIREffect — the SHARED types).
//
// THIS IS NOT A CHECKER. If the lowering can refuse something the semantic tier
//   already refuses, the check belongs in the semantic tier and this module
//   RECORDS the verdict. Two checkers for one property drift, and the drift is
//   silent — so an envelope violation lowers with `status: "violation"` and no
//   diagnostic. GATE-SEM-009/010 owns the refusal.
//
// CANONICAL ORDER IS THE POINT. A circuit's identity must not depend on the
//   order its author happened to type the PARTS block, or the girHash would
//   change on a cosmetic edit and every artifact keyed on it would move. Parts
//   and wires are sorted by ASCII code unit — the same comparator the graph
//   already uses, deliberately not `localeCompare`, whose result depends on the
//   host's locale.
// =============================================================================

import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateV3Registry } from "./gate-v3-registry.js";
import type { GateGraph } from "./gate-v3-graph.js";
import type { GIRCircuit, GIREffect, GIRProof } from "./gir-emitter.js";
import { verifyCutDominatesEgress, verifyTaintCutSeparator } from "./gate-v3-privacy.js";
import { verifyDenyArmContainment, verifyDecisionShapes } from "./gate-v3-authority.js";
import { verifyZoneDomination } from "./gate-v3-zone.js";

/** ASCII code-unit order. Locale-independent, so two machines agree. */
function byCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The effect envelope as GIR records it: what the circuit DECLARED in REQUIRES,
 * what its parts' contracts OBSERVE, and whether the first covers the second.
 *
 * `observed` is the union over resolved contracts. An UNRESOLVED part
 * contributes nothing — resolution owns unknown components, and inventing an
 * effect for a part we could not read would put a fact in the artifact that no
 * pass established.
 */
function envelopeOf(circuit: GateV3Circuit, registry: GateV3Registry): GIREffect {
  const declared = [...new Set(circuit.requirements.effects.map((e) => e.name))].sort(byCodeUnit);

  const observed = new Set<string>();
  for (const part of circuit.parts) {
    const contract = registry.components.get(`${part.component}@${part.version}`)
      ?? [...registry.components.values()].find((c) => c.id === part.component);
    if (!contract) continue;
    for (const effect of contract.effects) observed.add(effect);
  }
  const observedList = [...observed].sort(byCodeUnit);

  // Compliant means DECLARED COVERS OBSERVED. The reverse direction — declaring
  // an effect nothing observes — is over-declaration, which SEM-010 reports as
  // a warning and which is not a violation of the envelope.
  const uncovered = observedList.filter((effect) => !declared.includes(effect));
  return Object.freeze({
    declared: Object.freeze(declared),
    observed: Object.freeze(observedList),
    status: uncovered.length === 0 ? "compliant" : "violation",
  });
}

/**
 * G6 rung 4 — the semantic tier's results, recorded as artifacts.
 *
 * ★ THE DISTINCTION THIS RUNG EXISTS FOR: `missing` is not `satisfied`.
 *
 * A pass that stays silent because the contract declared NO OBLIGATION has
 * proved nothing. Recording that as `satisfied` would put a safety claim in the
 * artifact that no pass established — the same fabrication as folding an empty
 * set to ALLOW. So every entry answers two questions, in order:
 *
 *   1. did an obligation exist?  no  -> `missing`
 *   2. did the pass object?      yes -> `failed`, else `satisfied`
 *
 * ★ AND THE SET IS CLOSED AND NAMED. These five are the passes whose obligation
 * PRECONDITION is documented at their own definition, so the predicate below
 * mirrors a stated rule rather than a guess. Passes whose precondition is not
 * crisply stated are deliberately absent rather than recorded as `missing` —
 * `missing` means "no obligation", not "not evaluated", and blurring the two
 * would make the artifact claim coverage it does not have. Widening the set is
 * a change to THIS list, never an inference at a call site.
 */
const PROOFS = [
  {
    name: "cut-dominates-egress",                                   // GATE-SEM-002
    obliged: (graph: GateGraph, registry: GateV3Registry) => hasCut(graph, registry),
    run: (c: GateV3Circuit, g: GateGraph, r: GateV3Registry) => verifyCutDominatesEgress(g, r),
  },
  {
    name: "taint-cut-separator",                                    // GATE-SEM-003
    obliged: (graph: GateGraph, registry: GateV3Registry) => hasCut(graph, registry),
    run: (c: GateV3Circuit, g: GateGraph, r: GateV3Registry) => verifyTaintCutSeparator(g, r),
  },
  {
    name: "decision-shape",                                         // GATE-SEM-004
    obliged: (graph: GateGraph, registry: GateV3Registry) => hasDecision(graph, registry),
    run: (c: GateV3Circuit, g: GateGraph, r: GateV3Registry) => verifyDecisionShapes(c, r),
  },
  {
    name: "deny-arm-containment",                                   // GATE-SEM-011
    obliged: (graph: GateGraph, registry: GateV3Registry) => hasDecision(graph, registry),
    run: (c: GateV3Circuit, g: GateGraph, r: GateV3Registry) => verifyDenyArmContainment(c, g, r),
  },
  {
    name: "zone-domination",                                        // GATE-SEM-014
    obliged: (graph: GateGraph, registry: GateV3Registry) => hasSemanticPart(graph, registry),
    run: (c: GateV3Circuit, g: GateGraph, r: GateV3Registry) => verifyZoneDomination(g, r),
  },
] as const;

/** Any part whose contract declares `cut: true` — SEM-002/003's precondition. */
function hasCut(graph: GateGraph, registry: GateV3Registry): boolean {
  return graph.nodes.some((n) => n.kind === "part" && registry.components.get(n.component)?.cut === true);
}

/** Any decision contract with arms — SEM-004/011's precondition. */
function hasDecision(graph: GateGraph, registry: GateV3Registry): boolean {
  return graph.nodes.some((n) => {
    if (n.kind !== "part") return false;
    const contract = registry.components.get(n.component);
    return contract?.decision === true && contract.arms.length > 0;
  });
}

/** Any part naming a `zone: "semantic"` type — SEM-014's precondition. */
function hasSemanticPart(graph: GateGraph, registry: GateV3Registry): boolean {
  const semantic = new Set<string>();
  for (const [id, type] of registry.types) if (type.zone === "semantic") semantic.add(id);
  if (semantic.size === 0) return false;
  return graph.nodes.some((n) => {
    if (n.kind !== "part") return false;
    const contract = registry.components.get(n.component);
    if (!contract) return false;
    return [...contract.inputs.values(), ...contract.outputs.values()].some((p) => semantic.has(p.type));
  });
}

/**
 * The closed proof set for one circuit, in the declared order so the artifact
 * is stable. Never re-derives a verdict the semantic tier owns — it calls the
 * same pass and records what it said.
 */
export function circuitProofs(
  circuit: GateV3Circuit,
  graph: GateGraph,
  registry: GateV3Registry,
): readonly GIRProof[] {
  return Object.freeze(PROOFS.map((proof): GIRProof => {
    if (!proof.obliged(graph, registry)) return { name: proof.name, status: "missing" };
    const objections = proof.run(circuit, graph, registry);
    return { name: proof.name, status: objections.length === 0 ? "satisfied" : "failed" };
  }));
}

/**
 * Lower one circuit. Deterministic: the same circuit lowers to the same object
 * whatever order its author wrote the blocks in, which is what makes the
 * program hash meaningful.
 *
 * Pass `graph` to include `proofs`. WITHOUT it the field is OMITTED, never
 * `[]` — an empty array would read as "no proof failed", a safety claim a
 * caller that never asked for proofs has not earned.
 */
export function lowerCircuitToGIR(
  circuit: GateV3Circuit,
  registry: GateV3Registry,
  graph?: GateGraph,
): GIRCircuit {
  const parts = circuit.parts.map((part) => part.instance).sort(byCodeUnit);

  // A wire's identity is its endpoints, not its source line. `bound` is
  // deliberately excluded: a budget annotation is an obligation the budget pass
  // reads, not part of what the circuit IS.
  const wires = circuit.wires
    .map((wire) => `${wire.from.node}.${wire.from.port} -> ${wire.to.node}.${wire.to.port}`)
    .sort(byCodeUnit);

  const capabilities = [...new Set(circuit.requirements.capabilities.map((c) => c.name))].sort(byCodeUnit);

  return Object.freeze({
    name: circuit.name,
    intent: circuit.intent,
    parts: Object.freeze(parts),
    wires: Object.freeze(wires),
    effects: envelopeOf(circuit, registry),
    // Spread, not `proofs: graph ? … : undefined` — under
    // exactOptionalPropertyTypes an optional property SET to undefined is not
    // the same as an absent one, and only absence survives canonicalisation.
    ...(graph ? { proofs: circuitProofs(circuit, graph, registry) } : {}),
    capabilities: Object.freeze(capabilities),
  });
}
