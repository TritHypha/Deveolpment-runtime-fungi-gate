// =============================================================================
// SCC condensation + machine-checked acyclicity — G3 rung 2 (KTA plan 27).
//
// Description: computes the strongly-connected components of a GateGraph and
//   the condensed component DAG, and turns "v3 circuits are acyclic" from an
//   assumption into an asserted fact.
// Version / change-control: G3 rung 2.
// Pointers: gate-v3-graph.ts (the input); the tropical budget pass (rung 8)
//   composes over the condensation this file produces; GATE-TERM-003/004 in
//   gate-v3-verify.ts is the UPSTREAM refusal that makes multi-node SCCs
//   unreachable from parsed circuits.
//
// WHY THIS EXISTS WHEN CYCLES ALREADY REFUSE UPSTREAM:
//   Division of labour, asserted at both ends. The structural verifier refuses
//   drawn cycles; every later semantic pass then ASSUMES a DAG. An assumption
//   shared by four passes is exactly the thing to machine-check once, at the
//   entrance to the semantic tier — if any future path ever admits a cycle
//   (a new frontend, a budgeted-cycle feature, a bug), the failure is a stable
//   diagnostic here, not a wrong dominator tree three passes later.
//
// IMPLEMENTATION NOTE — ITERATIVE, NEVER RECURSIVE:
//   GD-006 existed because recursion over attacker-sized input blew the host
//   stack. A circuit may legally carry 4096 parts (GATE_V3_LIMITS.parts); a
//   recursive Tarjan would reintroduce the same failure class inside the ruled
//   ceiling. Both traversals below run on explicit stacks; the KAT proves a
//   2000-part chain condenses without a throw.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateGraph } from "./gate-v3-graph.js";

/** The rung's diagnostic: the semantic graph is cyclic, so no dominator
 *  reasoning below may run.
 *
 *  ⚠ CORRECTED 2026-08-07 (cycle 0138). This declaration previously claimed
 *  the code was "unreachable from parsed circuits (GATE-TERM-003/004 refuses
 *  them)" and its message asserted an "upstream refusal was bypassed". BOTH
 *  ARE FALSE, and conformance vector CV-076 reaches it from an ordinary parsed
 *  circuit. The two rules quantify over DIFFERENT NODE SETS: `findCycle` in
 *  gate-v3-verify.ts walks parts only, while this pass condenses the whole
 *  GateGraph — which includes `IN`, `OUT` and wired terminals (SEMANTICS §6.0).
 *  A wire back into the input frontier (`a.spare -> IN.v`) is therefore a cycle
 *  HERE and no part-to-part cycle THERE. Nothing was bypassed; TERM-003's rule
 *  simply does not apply to it.
 *
 *  The message no longer names a cause it cannot know. Misattributing one is
 *  not cosmetic: §3.1 makes distinguishable refusals a security property, and
 *  the old text sent an author hunting for a defeated upstream check that had
 *  never applied. This remains defence-in-depth for genuine part cycles — the
 *  KAT still hand-builds a cyclic graph to prove the detector can detect (an
 *  unfirable check is GD-004's class) — it is simply not ONLY that. */
export const GATE_SEM_001 = Object.freeze({
  code: "GATE-SEM-001",
  name: "GATE_V3_CYCLE_REACHED_SEMANTIC_TIER",
  message: "the semantic graph is cyclic, so dominator reasoning cannot run (a part-to-part cycle also refuses at GATE-TERM-003/004; a cycle through IN, OUT or a terminal does not)",
});

/** The condensation: components in canonical order, each a sorted member
 *  list; the component DAG's edges, deduplicated; and the verdict. */
export interface GateGraphCondensation {
  /** Every SCC, members sorted by code unit, components sorted by their
   *  smallest member. Singletons included — the invariant is exactly that
   *  ALL of them are singletons. */
  readonly components: readonly (readonly string[])[];
  /** node id -> its component's name (the smallest member id). */
  readonly componentOf: Readonly<Record<string, string>>;
  /** Component-level edges, self-loops dropped, parallels collapsed, sorted. */
  readonly edges: readonly { readonly from: string; readonly to: string }[];
  /** True iff every component is a singleton — the v3 invariant. */
  readonly acyclic: boolean;
}

/** ASCII code-unit comparator — same rule as gate-v3-graph.ts, same reason
 *  (GD-015: locale-dependent canonical order is a defect class). */
function byCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Condense a GateGraph into its component DAG (iterative Tarjan).
 *
 * Deterministic by construction: nodes are visited in the graph's canonical
 * node order, members and components are re-sorted on output, and edges are
 * deduplicated then sorted — so equal graphs yield byte-equal condensations
 * regardless of traversal accidents.
 */
export function condenseGateGraph(graph: GateGraph): GateGraphCondensation {
  // Adjacency by node id, in canonical edge order (stable input -> stable run).
  const successors = new Map<string, string[]>();
  for (const node of graph.nodes) successors.set(node.id, []);
  for (const edge of graph.edges) successors.get(edge.from.node)?.push(edge.to.node);

  // ---- Tarjan, explicit stacks -------------------------------------------
  const index = new Map<string, number>();     // discovery order per node
  const lowlink = new Map<string, number>();   // smallest index reachable
  const onStack = new Set<string>();
  const stack: string[] = [];                  // Tarjan's component stack
  const componentsRaw: string[][] = [];
  let counter = 0;

  for (const root of graph.nodes) {
    if (index.has(root.id)) continue;

    // Work frame: [node, next successor position]. Pushing a frame is the
    // iterative form of the recursive call; revisiting it with pos>0 is the
    // return. No host recursion anywhere.
    const work: [string, number][] = [[root.id, 0]];
    while (work.length > 0) {
      const frame = work[work.length - 1]!;
      const [node, position] = frame;

      if (position === 0) {
        index.set(node, counter);
        lowlink.set(node, counter);
        counter += 1;
        stack.push(node);
        onStack.add(node);
      }

      const targets = successors.get(node) ?? [];
      if (position < targets.length) {
        frame[1] += 1;
        const next = targets[position]!;
        if (!index.has(next)) {
          work.push([next, 0]);                 // "recurse"
        } else if (onStack.has(next)) {
          lowlink.set(node, Math.min(lowlink.get(node)!, index.get(next)!));
        }
        continue;
      }

      // All successors done: close the frame ("return").
      work.pop();
      const parent = work[work.length - 1];
      if (parent) lowlink.set(parent[0], Math.min(lowlink.get(parent[0])!, lowlink.get(node)!));

      if (lowlink.get(node) === index.get(node)) {
        // node is an SCC root: pop its members.
        const members: string[] = [];
        for (;;) {
          const member = stack.pop()!;
          onStack.delete(member);
          members.push(member);
          if (member === node) break;
        }
        componentsRaw.push(members.sort(byCodeUnit));
      }
    }
  }

  // ---- canonical output ---------------------------------------------------
  const components = componentsRaw
    .map((members) => Object.freeze(members))
    .sort((a, b) => byCodeUnit(a[0]!, b[0]!));

  const componentOf: Record<string, string> = {};
  for (const members of components) {
    for (const member of members) componentOf[member] = members[0]!;
  }

  // Component edges: drop self-loops (internal to an SCC), collapse parallels.
  const edgeKeys = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  for (const edge of graph.edges) {
    const from = componentOf[edge.from.node]!;
    const to = componentOf[edge.to.node]!;
    if (from === to) continue;
    const key = `${from}\u0000${to}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ from, to });
  }
  edges.sort((a, b) => byCodeUnit(a.from, b.from) || byCodeUnit(a.to, b.to));

  return Object.freeze({
    components: Object.freeze(components),
    componentOf: Object.freeze(componentOf),
    edges: Object.freeze(edges.map((e) => Object.freeze(e))),
    acyclic: components.every((members) => members.length === 1),
  });
}

/**
 * The rung's fail-closed gate: refuse any graph whose condensation carries a
 * multi-node SCC. Silent on every admitted circuit — and the KAT proves the
 * silence is discrimination, not blindness, by hand-building a cyclic graph
 * the parser could never emit and requiring GATE-SEM-001 to fire on it.
 */
export function verifyGateGraphAcyclic(graph: GateGraph): readonly ParseDiagnostic[] {
  const condensation = condenseGateGraph(graph);
  if (condensation.acyclic) return Object.freeze([]);

  return Object.freeze(condensation.components
    .filter((members) => members.length > 1)
    .map((members): ParseDiagnostic => ({
      code: GATE_SEM_001.code,
      name: GATE_SEM_001.name,
      severity: "error",
      message: `${graph.circuit}: ${GATE_SEM_001.message}: {${members.join(", ")}}`,
    })));
}
