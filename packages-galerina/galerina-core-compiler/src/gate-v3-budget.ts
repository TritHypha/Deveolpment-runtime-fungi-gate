// =============================================================================
// Tropical budget composition — G3 rung 8 (KTA plan 27).
//
// Description: composes wire-level budget annotations along paths of the
//   (asserted-acyclic) GateGraph and refuses when the WORST-CASE composed cost
//   exceeds a ceiling the circuit itself declared in REQUIRES.
// Version / change-control: G3 rung 8.
// Pointers: gate-v3-condense.ts (the acyclicity this pass depends on — a
//   longest path over a cyclic graph diverges); RD-0215 (the house warning
//   that shapes the whole design); RD-0231 (the semiring provenance).
//
// THE RD-0215 DISTINCTION, STATED WHERE THE CODE LIVES: the KB verdict on the
//   tropical border firewall was "Track, do NOT build as specced" — because
//   that spec made the tropical RESULT an ADMISSION surface (compose a cost,
//   and a low enough answer ADMITS the flow: RD-0169's fail-open class). This
//   pass runs the same algebra on the DENY SIDE ONLY: its result can refuse a
//   circuit and can do nothing else. There is no code path from "within
//   budget" to any admission, signature, or claim — a within-budget circuit
//   simply receives no diagnostic from this pass.
//
// WHY MAX-PLUS AND NOT MIN-PLUS: the semiring choice IS the security choice.
//   min-plus composes the BEST-case path — the cheapest route — and a ceiling
//   checked against the cheapest route says nothing about what the circuit
//   may actually spend; it could only ever flatter the drawing (admit-shaped
//   reasoning again). Worst-case composition is max-plus: the most expensive
//   IN-to-sink path. A ceiling holds only if the WORST path is inside it.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateGraph } from "./gate-v3-graph.js";
import { condenseGateGraph } from "./gate-v3-condense.js";

/** Rung-8 refusal: the worst-case composed cost exceeds a declared ceiling. */
export const GATE_SEM_006 = Object.freeze({
  code: "GATE-SEM-006",
  name: "GATE_V3_BUDGET_CEILING_EXCEEDED",
  message: "worst-case composed wire budget exceeds the ceiling REQUIRES declares",
});

/**
 * Worst-case composed budget from IN to every node, max-plus over the DAG.
 *
 * Edge cost = its `budget=N` annotation, 0 when absent (`decreases=` names a
 * variant, not a cost, and contributes 0). Exported for the KAT to check the
 * hand-computed example directly rather than only through the refusal.
 */
export function composeWorstCaseBudgets(graph: GateGraph): ReadonlyMap<string, number> {
  // Topological order via repeated indegree stripping — iterative, no
  // recursion (4096 parts is legal input), and correct because rung 2
  // asserts acyclicity before this pass runs.
  const indegree = new Map<string, number>();
  const successors = new Map<string, { to: string; cost: number }[]>();
  for (const node of graph.nodes) { indegree.set(node.id, 0); successors.set(node.id, []); }
  for (const edge of graph.edges) {
    const cost = edge.bound?.kind === "budget" ? edge.bound.value : 0;
    successors.get(edge.from.node)!.push({ to: edge.to.node, cost });
    indegree.set(edge.to.node, (indegree.get(edge.to.node) ?? 0) + 1);
  }

  const queue: string[] = [...indegree.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  const worst = new Map<string, number>([["IN", 0]]);
  while (queue.length > 0) {
    const node = queue.shift()!;
    const here = worst.get(node);
    for (const { to, cost } of successors.get(node) ?? []) {
      // max-plus: relax upward. Nodes not reached from IN carry no cost —
      // absence, not zero, so an unreachable branch cannot trip a ceiling.
      if (here !== undefined) {
        const candidate = here + cost;
        if (candidate > (worst.get(to) ?? -Infinity)) worst.set(to, candidate);
      }
      const remaining = indegree.get(to)! - 1;
      indegree.set(to, remaining);
      if (remaining === 0) queue.push(to);
    }
  }
  return worst;
}

/**
 * Refuse when any declared REQUIRES budget ceiling is exceeded by the
 * worst-case composition. Silent when REQUIRES declares no budget (no ceiling
 * = no obligation), and silent on a cyclic graph — GATE-SEM-001 already
 * refused it, and composing costs over a cycle would be arithmetic on a
 * false premise.
 */
export function verifyBudgetComposition(circuit: GateV3Circuit, graph: GateGraph): readonly ParseDiagnostic[] {
  if (circuit.requirements.budgets.length === 0) return Object.freeze([]);
  if (!condenseGateGraph(graph).acyclic) return Object.freeze([]);

  const worst = composeWorstCaseBudgets(graph);
  // The circuit-level worst case: the most expensive path to ANY sink the
  // drawing can end at (OUT or a terminal). Max over what was reached.
  let ceilingRelevant = 0;
  for (const node of graph.nodes) {
    if (node.kind !== "output" && node.kind !== "terminal") continue;
    const cost = worst.get(node.id);
    if (cost !== undefined && cost > ceilingRelevant) ceilingRelevant = cost;
  }

  const diagnostics: ParseDiagnostic[] = [];
  for (const budget of circuit.requirements.budgets) {
    if (ceilingRelevant <= budget.value) continue;
    diagnostics.push({
      code: GATE_SEM_006.code,
      name: GATE_SEM_006.name,
      severity: "error",
      message: `${circuit.name}: ${GATE_SEM_006.message} — worst-case ${ceilingRelevant} > ${budget.name}=${budget.value}`,
      location: budget.location,
    });
  }
  return Object.freeze(diagnostics);
}
