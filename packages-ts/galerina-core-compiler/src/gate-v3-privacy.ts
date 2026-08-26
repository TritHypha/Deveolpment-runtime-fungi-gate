// =============================================================================
// Privacy passes over the GateGraph — G3 rungs 3–4 (KTA plan 27).
//
// Description: dominators from the input frontier, and the cut rules built on
//   them. Rung 3 ships the dominator machinery + the cut-DOMINATES-egress
//   refusal; rung 4 adds the RD-0229 taint-cut separator beside it.
// Version / change-control: G3 rung 3 (separator lands rung 4).
// Pointers: gate-v3-graph.ts (the input); gate-v3-condense.ts (acyclicity is
//   asserted before these passes run — a dominator tree over a cyclic graph
//   would be a proof over a false premise); gate-v3-registry.ts (`cut: true`,
//   the DECLARED role these rules read).
//
// CONTRACT-DRIVEN, NEVER NAME-DRIVEN: which part is a cut comes only from the
//   registry's `cut: true`. Recognising the redaction node by its component
//   name would be GD-008's port-name heuristic reborn on the privacy axis.
//   And fail-closed about scope: with NO declared cut there is NO domination
//   claim in either direction — the pass is silent because the contract
//   declared no obligation, not because the circuit was proven safe.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import type { GateGraph } from "./gate-v3-graph.js";
import type { GateV3Circuit } from "./gate-v3-parser.js";
import type { GateV3Registry } from "./gate-v3-registry.js";

/** Rung-3 refusal: a declared cut no longer dominates egress. */
export const GATE_SEM_002 = Object.freeze({
  code: "GATE-SEM-002",
  name: "GATE_V3_CUT_DOES_NOT_DOMINATE_EGRESS",
  message: "egress is reachable on a path that bypasses every declared cut (domination violated)",
});

/** Rung-4 refusal: with every declared cut REMOVED, taint still reaches
 *  egress — the RD-0229 separator property is violated. */
export const GATE_SEM_003 = Object.freeze({
  code: "GATE-SEM-003",
  name: "GATE_V3_TAINT_REACHES_EGRESS_PAST_CUTS",
  message: "taint reaches egress with every declared cut removed (separator violated, RD-0229)",
});

/**
 * Immediate dominators from the input frontier ("IN"), iterative worklist on
 * reverse postorder — Cooper/Harvey/Kennedy's shape, chosen because it is
 * simple to audit and needs no recursion (GD-006's class: a circuit may hold
 * 4096 parts, so nothing in the semantic tier may recurse per node).
 *
 * Nodes unreachable from IN are ABSENT from the result — absence is the
 * honest answer (liveness owns unreachability refusals, GATE-LIVE-001), and
 * inventing a dominator for an unreachable node would let a later rule reason
 * from a fact that does not exist.
 */
export function computeDominators(graph: GateGraph): ReadonlyMap<string, string> {
  // Successors in canonical edge order; predecessor lists derived with them.
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  for (const node of graph.nodes) { successors.set(node.id, []); predecessors.set(node.id, []); }
  for (const edge of graph.edges) {
    successors.get(edge.from.node)?.push(edge.to.node);
    predecessors.get(edge.to.node)?.push(edge.from.node);
  }

  // Reverse postorder from IN, iteratively (explicit stack, post flag).
  const order: string[] = [];
  const seen = new Set<string>(["IN"]);
  const stack: [string, number][] = [["IN", 0]];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    const targets = successors.get(frame[0]) ?? [];
    if (frame[1] < targets.length) {
      const next = targets[frame[1]!]!;
      frame[1] += 1;
      if (!seen.has(next)) { seen.add(next); stack.push([next, 0]); }
      continue;
    }
    order.push(frame[0]);
    stack.pop();
  }
  order.reverse();                                   // reverse postorder
  const position = new Map(order.map((id, i) => [id, i]));

  const idom = new Map<string, string>([["IN", "IN"]]);
  const intersect = (a: string, b: string): string => {
    // Walk both up the tree by RPO position until they meet.
    let x = a;
    let y = b;
    while (x !== y) {
      while (position.get(x)! > position.get(y)!) x = idom.get(x)!;
      while (position.get(y)! > position.get(x)!) y = idom.get(y)!;
    }
    return x;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of order) {
      if (node === "IN") continue;
      // First processed predecessor that already has an idom.
      const preds = (predecessors.get(node) ?? []).filter((p) => idom.has(p));
      if (preds.length === 0) continue;
      let candidate = preds[0]!;
      for (const pred of preds.slice(1)) candidate = intersect(candidate, pred);
      if (idom.get(node) !== candidate) { idom.set(node, candidate); changed = true; }
    }
  }
  return idom;
}

/** The strict dominators of a node: its idom chain up to IN. */
function dominatorsOf(node: string, idom: ReadonlyMap<string, string>): Set<string> {
  const result = new Set<string>();
  let current = node;
  while (idom.has(current)) {
    const up = idom.get(current)!;
    if (up === current) break;                       // reached the root
    result.add(up);
    current = up;
  }
  return result;
}

/** Map iteration 5: a governed sink lets a value LEAVE the trust boundary.
 *
 *  Derived from DECLARED EFFECTS, never from an opt-in `sink: true` flag: a
 *  forgotten flag would mean no protection, which is the fail-OPEN default.
 *  Effects are already mandatory and already checked (SEM-009/012), so to have
 *  a network effect at all is to be a sink — automatically.
 *
 *  `database.write` and `storage.write` are deliberately ABSENT. A tainted
 *  value written to the application's own store has not left the boundary;
 *  refusing that would make the rule unusable and teach authors to work around
 *  it, which costs more than it saves. */
const EGRESS_EFFECTS = new Set([
  "network.outbound", "network.external",
  "email.send",
  "audit.write",       // audit logs are widely readable — the classic PII leak
]);

/** Rung-5 refusal: taint reaches a governed sink without passing a cut. */
export const GATE_SEM_013 = Object.freeze({
  code: "GATE-SEM-013",
  name: "GATE_V3_TAINT_REACHES_GOVERNED_SINK",
  message: "taint reaches a governed sink (an egress-class effect) without passing a declared cut",
});

/** G4: the taint FRONTIER — instances of components declaring `tainted: true`.
 *  With none declared, the whole input frontier is treated as tainted (the
 *  conservative pre-G4 behaviour, unchanged). Declaring sources SHARPENS the
 *  separator: an untainted side-path to egress stops refusing. */
function taintFrontier(graph: GateGraph, registry: GateV3Registry): string[] {
  const tainted: string[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "part") continue;
    const contract = registry.components.get(node.component);
    if (contract?.tainted) tainted.push(node.id);
  }
  return tainted.length > 0 ? tainted : ["IN"];
}

/** The instances in this graph whose CONTRACT declares `cut: true`. Resolution
 *  owns unknown-component refusals; an unresolved part simply is not a cut. */
function declaredCuts(graph: GateGraph, registry: GateV3Registry): string[] {
  const cuts: string[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== "part") continue;
    const contract = registry.components.get(node.component);
    if (contract?.cut) cuts.push(node.id);
  }
  return cuts;
}

/**
 * Rung-3 rule: if the contract declares any cut, egress must be DOMINATED by
 * at least one of them — every path from the input frontier to OUT passes a
 * declared redaction point. One bypass wire breaks domination and refuses.
 *
 * Silent when no cut is declared (no obligation exists), and silent about
 * DENY/FAULT/TRAP/DRAIN terminals by design: refusal surfaces carry evidence,
 * not payloads — the cut governs the VALUE leaving on OUT.
 */
export function verifyCutDominatesEgress(graph: GateGraph, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const cuts = declaredCuts(graph, registry);
  if (cuts.length === 0) return Object.freeze([]);

  // The separator (rung 4) is the set-level truth; single-point domination is
  // the stronger claim and legitimately fails on multi-cut drawings (two
  // branches, each with its own cut — neither dominates, the set separates).
  // So this rule refuses only when the SEPARATOR also refuses: domination
  // failing while separation holds is a sound multi-cut drawing, not a leak.
  const idom = computeDominators(graph);
  if (!idom.has("OUT")) return Object.freeze([]);    // no egress path: liveness owns that verdict

  const dominators = dominatorsOf("OUT", idom);
  if (cuts.some((cut) => dominators.has(cut))) return Object.freeze([]);
  if (verifyTaintCutSeparator(graph, registry).length === 0) return Object.freeze([]);

  return Object.freeze([{
    code: GATE_SEM_002.code,
    name: GATE_SEM_002.name,
    severity: "error",
    message: `${graph.circuit}: ${GATE_SEM_002.message}; declared cut(s): ${cuts.join(", ")}`,
  }]);
}

/**
 * Rung-4 rule — RD-0229's machine-proven correction, implemented as proven:
 * remove every declared cut from the graph, then ask whether egress is still
 * reachable from the input frontier. Reachable = a bypass exists = refuse.
 *
 * NOT node-BFS from the tainted source with cuts in place — that question
 * flags the sanitized path too (reachable THROUGH the cut is the sanctioned
 * route), and the KAT demonstrates that false-flag on the shipped PHI example
 * before showing this check give the correct verdict both ways.
 */
export function verifyTaintCutSeparator(graph: GateGraph, registry: GateV3Registry): readonly ParseDiagnostic[] {
  const cuts = new Set(declaredCuts(graph, registry));
  if (cuts.size === 0) return Object.freeze([]);

  // Reachability over the graph WITH EVERY CUT DELETED — iterative BFS on an
  // explicit queue (no recursion; 4096 parts is legal input).
  const successors = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (!cuts.has(node.id)) successors.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (cuts.has(edge.from.node) || cuts.has(edge.to.node)) continue;
    successors.get(edge.from.node)?.push(edge.to.node);
  }

  const frontier = taintFrontier(graph, registry);
  const seen = new Set<string>(frontier);
  const queue: string[] = [...frontier];
  while (queue.length > 0) {
    for (const next of successors.get(queue.shift()!) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }

  if (!seen.has("OUT")) return Object.freeze([]);

  return Object.freeze([{
    code: GATE_SEM_003.code,
    name: GATE_SEM_003.name,
    severity: "error",
    message: `${graph.circuit}: ${GATE_SEM_003.message}; removed cut(s): ${[...cuts].join(", ")}; taint frontier: ${frontier.join(", ")}`,
  }]);
}

/**
 * Map iteration 5's rule: taint must not reach a GOVERNED SINK without first
 * passing a declared cut.
 *
 * `verifyTaintCutSeparator` proved the same property for `OUT` — the circuit's
 * return. But a value leaves the trust boundary through any egress-class part:
 * a network send, an outbound email, an audit write. `.fungi` has always
 * enforced that (`FUNGI-VALUESTATE-003/004` refuse an unsafe or tainted value
 * reaching any governed sink); `.gate` was watching one door of several.
 *
 * Same machinery as the separator, different target set: delete every declared
 * cut, then ask which sinks remain reachable from the taint frontier. One
 * refusal per reachable sink, so fixing one cannot mask another.
 */
export function verifyTaintReachesSink(
  circuit: GateV3Circuit,
  graph: GateGraph,
  registry: GateV3Registry,
): readonly ParseDiagnostic[] {
  const cuts = new Set(declaredCuts(graph, registry));
  if (cuts.size === 0) return Object.freeze([]);

  // Sinks: parts whose contract declares any egress-class effect.
  const sinks = new Map<string, string>();                 // instance -> the effect that made it a sink
  for (const part of circuit.parts) {
    const contract = registry.components.get(`${part.component}@${part.version}`);
    if (!contract) continue;
    const egress = contract.effects.find((effect) => EGRESS_EFFECTS.has(effect));
    if (egress !== undefined) sinks.set(part.instance, egress);
  }
  if (sinks.size === 0) return Object.freeze([]);

  const frontier = taintFrontier(graph, registry);
  // A frontier that fell back to IN means no taint is DECLARED; this rule then
  // says nothing, exactly as the separator does — absence of a declaration is
  // absence of the obligation, and it is stated, not silently assumed safe.
  if (frontier.length === 1 && frontier[0] === "IN") return Object.freeze([]);

  const successors = new Map<string, string[]>();
  for (const node of graph.nodes) if (!cuts.has(node.id)) successors.set(node.id, []);
  for (const edge of graph.edges) {
    if (cuts.has(edge.from.node) || cuts.has(edge.to.node)) continue;
    successors.get(edge.from.node)?.push(edge.to.node);
  }

  const seen = new Set<string>(frontier);
  const queue = [...frontier];
  while (queue.length > 0) {
    for (const next of successors.get(queue.shift()!) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  const diagnostics: ParseDiagnostic[] = [];
  for (const [instance, effect] of sinks) {
    if (!seen.has(instance)) continue;
    diagnostics.push({
      code: GATE_SEM_013.code,
      name: GATE_SEM_013.name,
      severity: "error",
      message: `${circuit.name}: sink '${instance}' (effect '${effect}') — ${GATE_SEM_013.message}; taint frontier: ${frontier.join(", ")}`,
    });
  }
  return Object.freeze(diagnostics);
}
