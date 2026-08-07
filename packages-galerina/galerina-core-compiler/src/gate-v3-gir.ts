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
import type { GIRCircuit, GIREffect } from "./gir-emitter.js";

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
 * Lower one circuit. Deterministic: the same circuit lowers to the same object
 * whatever order its author wrote the blocks in, which is what makes the
 * program hash meaningful.
 *
 * `proofs` is deliberately ABSENT — rung 4 computes it. An empty array here
 * would read as "no proof failed", which is a safety claim this rung has not
 * earned.
 */
export function lowerCircuitToGIR(circuit: GateV3Circuit, registry: GateV3Registry): GIRCircuit {
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
    capabilities: Object.freeze(capabilities),
  });
}
