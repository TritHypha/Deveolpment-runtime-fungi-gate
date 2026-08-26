// =============================================================================
// Zone domination — G5 rung 1 (the query adapter's checker half, GD-R09).
//
// Description: fields carry a ZONE — `opaque` or `semantic`. Opaque values may
//   be scanned and routed in the untrusted zone; a semantic value may only be
//   evaluated after a declared trust transition has ALLOWED it. This pass
//   proves that: every part touching a semantic type is dominated by a declared
//   zone gate, and none is reachable from that gate's non-allow arms.
// Version / change-control: G5 rung 1. The redaction half of GD-R09's zone seam
//   is already GATE-SEM-002/003 and is not repeated here.
// Pointers: KTA 09-rd-database-queries.md §"Zone-seam mapping"; gate-v3-privacy.ts
//   (computeDominators, and the fail-closed-about-scope doctrine this follows);
//   gate-v3-authority.ts (arms[0] is the allow arm — ORDERED, by position).
//
// CONTRACT-DRIVEN, NEVER NAME-DRIVEN: which part is the transition comes only
//   from the registry's `zoneGate: true`, and which type is semantic only from
//   `zone: "semantic"`. Recognising `tritmesh.ql.gate` by its name would bind
//   the checker to one vocabulary and be GD-008's port-name heuristic reborn.
//
// THE ONE PLACE THIS IS NOT SILENT-WHEN-UNDECLARED: privacy is silent with no
//   cut declared, because no obligation was stated. Here a declared SEMANTIC
//   type IS the statement of obligation — so semantic parts with no zone gate
//   anywhere is a refusal, not a silence. Absence of a gate is not permission.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateGraph } from "./gate-v3-graph.js";
import type { GateV3Registry } from "./gate-v3-registry.js";
import { computeDominators } from "./gate-v3-privacy.js";

/** G5 rung-1 refusal: semantic work is reachable without a proven ALLOW. */
export const GATE_SEM_014 = Object.freeze({
  code: "GATE-SEM-014",
  name: "GATE_V3_SEMANTIC_ZONE_NOT_GATED",
  message: "a semantic-zone part is reachable without passing a zone gate's allow arm",
});

/** Every type id the registry marks `zone: "semantic"`. */
function semanticTypes(registry: GateV3Registry): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const [id, type] of registry.types) if (type.zone === "semantic") ids.add(id);
  return ids;
}

/**
 * Part instances whose CONTRACT names a semantic type on any port. Ports, not
 * wires: a part that declares a semantic input is semantic work whether or not
 * this particular drawing happens to feed it one — the obligation belongs to
 * the component, and a drawing cannot opt out of it by leaving a port idle.
 */
function semanticParts(graph: GateGraph, registry: GateV3Registry): string[] {
  const semantic = semanticTypes(registry);
  if (semantic.size === 0) return [];
  const parts: string[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "part") continue;
    const contract = registry.components.get(node.component);
    if (!contract) continue;                       // resolution owns unknown components
    const ports = [...contract.inputs.values(), ...contract.outputs.values()];
    const touches = ports.some((port) => semantic.has(port.type));
    if (touches) parts.push(node.id);
  }
  return parts;
}

/** Part instances whose contract declares `zoneGate: true`. */
function zoneGates(graph: GateGraph, registry: GateV3Registry): string[] {
  const gates: string[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "part") continue;
    if (registry.components.get(node.component)?.zoneGate) gates.push(node.id);
  }
  return gates;
}

/** The dominator set of `node`, walking the immediate-dominator chain. */
function dominatorsOf(node: string, idom: ReadonlyMap<string, string>): Set<string> {
  const out = new Set<string>();
  let current = idom.get(node);
  while (current !== undefined && !out.has(current)) {
    out.add(current);
    if (current === "IN") break;
    current = idom.get(current);
  }
  return out;
}

/**
 * G5 rung 1. Three refusals, in the order a reader would ask them:
 *
 *   1. semantic parts exist but NO zone gate is declared anywhere;
 *   2. a semantic part is not dominated by any zone gate — a path reaches it
 *      without passing the transition at all;
 *   3. a semantic part is reachable from a gate's NON-allow arm — it passed the
 *      transition, but on the arm that refused.
 *
 * Silent when no type is marked semantic: no obligation was declared, and a
 * silent pass is not a safety claim.
 */
export function verifyZoneDomination(graph: GateGraph, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const semantic = semanticParts(graph, registry);
  if (semantic.length === 0) return Object.freeze([]);

  const refuse = (detail: string): readonly ParseDiagnostic[] => Object.freeze([{
    code: GATE_SEM_014.code,
    name: GATE_SEM_014.name,
    severity: "error" as const,
    message: `${graph.circuit}: ${GATE_SEM_014.message}; ${detail}`,
  }]);

  const gates = zoneGates(graph, registry);
  if (gates.length === 0) {
    return refuse(`semantic part(s) ${semantic.join(", ")} with no zoneGate declared in this circuit`);
  }

  // ── 2 · domination ────────────────────────────────────────────────────────
  // Unreachable-from-IN parts are ABSENT from the dominator map; liveness owns
  // that verdict, and treating absence as a domination failure here would
  // report the same defect twice under two names.
  const idom = computeDominators(graph);
  const gateSet = new Set(gates);
  const undominated = semantic.filter((part) => {
    if (gateSet.has(part)) return false;                  // a gate need not dominate itself
    if (!idom.has(part)) return false;                    // unreachable: liveness owns it
    return ![...dominatorsOf(part, idom)].some((d) => gateSet.has(d));
  });
  if (undominated.length > 0) {
    return refuse(`${undominated.join(", ")} not dominated by any of the declared gate(s) ${gates.join(", ")}`);
  }

  // ── 3 · allow-arm containment ─────────────────────────────────────────────
  // Domination proves the gate was PASSED; it does not prove which way. A gate
  // with no declared arms cannot prove that, so it refuses rather than assumes.
  const successors = new Map<string, string[]>();
  for (const node of graph.nodes) successors.set(node.id, []);
  for (const edge of graph.edges) successors.get(edge.from.node)?.push(edge.to.node);

  const semanticSet = new Set(semantic);
  for (const gate of gates) {
    const contract = registry.components.get(graph.nodes.find((n) => n.id === gate)!.component)!;
    if (!contract.decision || contract.arms.length === 0) {
      return refuse(`gate ${gate} declares zoneGate without a decision contract, so no arm can be proven ALLOW`);
    }
    // arms[0] is the allow arm BY POSITION (the same ordering GATE-SEM-011
    // reads). Everything after it is a refusal arm, and semantic work must not
    // be reachable from any of them.
    const refusalArms = new Set(contract.arms.slice(1));
    const seeds = graph.edges
      .filter((edge) => edge.from.node === gate && refusalArms.has(edge.from.port))
      .map((edge) => edge.to.node);

    const seen = new Set<string>(seeds);
    const queue = [...seeds];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (semanticSet.has(current)) {
        return refuse(`${current} is reachable from ${gate}'s refusal arm — it passed the gate on the arm that said no`);
      }
      for (const next of successors.get(current) ?? []) {
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
  }

  return Object.freeze([]);
}
