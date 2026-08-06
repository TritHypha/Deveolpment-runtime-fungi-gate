// =============================================================================
// GateGraph — the canonical adjacency every G3 semantic pass reads.
//
// Description: builds a representation-INDEPENDENT graph from a parsed v3
//   circuit. Round-three rung 1 (KTA plan 27, step 1).
// Version / change-control: G3 rung 1.
// Pointers: gate-v3-parser.ts (the circuit this consumes); the semantic passes
//   land beside this file in later rungs (dominators, taint-cut separator,
//   verdict fold, tropical budgets).
//
// WHY CANONICAL ORDER IS THE WHOLE POINT (GD-014, GD-015):
//   The reference assigns edge IDs from SOURCE order, so two circuits with
//   equal fingerprints produce different topology JSON — a downstream consumer
//   cannot tell representation drift from semantic change. And it sorts with
//   default-locale localeCompare, so canonical order itself is locale-dependent
//   across machines ("A" vs "a" orders oppositely under en and da). This module
//   does neither: every ordering decision uses the ASCII code-unit comparator,
//   and IDs are assigned only AFTER the canonical sort. The KAT's load-bearing
//   assertion is byte-identical serialization under source permutation.
//
// SCOPE (deliberate): adjacency only. This rung knows nothing about contracts —
//   which part is a privacy cut, which output is an authority — because those
//   facts belong to the registry and land with the passes that need them
//   (rungs 3+). Building them in here would couple graph identity to registry
//   content, and graph identity must depend on the DRAWING alone.
// =============================================================================

import type { GateV3Circuit, GateV3Endpoint } from "./gate-v3-parser.js";

/** The four terminal families. A wire into any of these ends the flow. */
const TERMINAL_FAMILIES = new Set(["DENY", "FAULT", "TRAP", "DRAIN"]);

/** What a graph node IS. Exactly one kind per node, decided by the drawing. */
export type GateGraphNodeKind = "input" | "output" | "part" | "terminal";

/** One node: the input frontier, the egress, a part instance, or a
 *  reason-qualified terminal. */
export interface GateGraphNode {
  /** Stable identity: "IN", "OUT", the part instance, or "FAMILY.reason". */
  readonly id: string;
  readonly kind: GateGraphNodeKind;
  /** The component reference for parts ("app.customer.read@1.0.0"), so later
   *  passes can find the contract without re-walking the circuit. Empty for
   *  non-part nodes. */
  readonly component: string;
}

/** One endpoint of an edge, kept port-precise: passes like required-input
 *  coverage and verdict fold care WHICH port, not merely which node. */
export interface GateGraphEndpoint {
  readonly node: string;
  readonly port: string;
}

/** One edge = one wire. IDs are e1..eN in CANONICAL order (the anti-GD-014
 *  property): equal drawings get equal IDs, whatever the source order was. */
export interface GateGraphEdge {
  readonly id: string;
  readonly from: GateGraphEndpoint;
  readonly to: GateGraphEndpoint;
  /** The wire's termination annotation, verbatim: budget=N or decreases=x.
   *  Absent on ordinary wires. Carried for the tropical pass (rung 8). */
  readonly bound: { readonly kind: "budget"; readonly value: number } | { readonly kind: "decreases"; readonly value: string } | null;
}

/** The graph: nodes and edges, both in canonical order, both frozen. */
export interface GateGraph {
  readonly circuit: string;
  readonly nodes: readonly GateGraphNode[];
  readonly edges: readonly GateGraphEdge[];
}

/**
 * ASCII code-unit comparator — the ONLY comparator this module uses.
 *
 * GD-015 is the reason this is spelled out rather than reaching for
 * localeCompare: default-locale comparison orders "A" vs "a" oppositely under
 * en (+1) and da (−1), which made the reference's canonical form — and
 * therefore its fingerprint — a function of the machine's locale. Code units
 * are the same everywhere.
 */
function byCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** The node id a wire endpoint belongs to: terminals are reason-qualified
 *  ("DENY.not_authorized" is a node; DENY alone is not), everything else is
 *  the endpoint's node name. */
function nodeIdOf(endpoint: GateV3Endpoint): string {
  return TERMINAL_FAMILIES.has(endpoint.node) ? `${endpoint.node}.${endpoint.port}` : endpoint.node;
}

/** The port carried on an edge endpoint. A terminal's "port" is its reason,
 *  which is already part of the node id — the edge-level port is the empty
 *  string there, so consumers never read the reason twice. */
function portOf(endpoint: GateV3Endpoint): string {
  return TERMINAL_FAMILIES.has(endpoint.node) ? "" : endpoint.port;
}

/**
 * Build the canonical GateGraph for a parsed circuit.
 *
 * Node set: "IN" (the whole input frontier as one node — parameters are ports
 * on it, which is what the dominator pass needs: domination is measured from
 * the frontier, not per parameter), "OUT", one node per part instance, and one
 * node per reason-qualified terminal that any wire names. Terminals exist only
 * if wired: an unwired terminal is not part of the drawing.
 *
 * Determinism: nodes are sorted by id; edges are sorted by (from node, from
 * port, to node, to port, bound); IDs are assigned after the sort. Two equal
 * drawings therefore serialize byte-identically regardless of source order.
 */
export function buildGateGraph(circuit: GateV3Circuit): GateGraph {
  // ---- nodes ---------------------------------------------------------------
  const nodes = new Map<string, GateGraphNode>();
  nodes.set("IN", Object.freeze({ id: "IN", kind: "input" as const, component: "" }));
  nodes.set("OUT", Object.freeze({ id: "OUT", kind: "output" as const, component: "" }));
  for (const part of circuit.parts) {
    nodes.set(part.instance, Object.freeze({
      id: part.instance,
      kind: "part" as const,
      component: `${part.component}@${part.version}`,
    }));
  }
  for (const wire of circuit.wires) {
    for (const endpoint of [wire.from, wire.to]) {
      if (!TERMINAL_FAMILIES.has(endpoint.node)) continue;
      const id = nodeIdOf(endpoint);
      if (!nodes.has(id)) nodes.set(id, Object.freeze({ id, kind: "terminal" as const, component: "" }));
    }
  }

  // ---- edges ---------------------------------------------------------------
  // Sort key covers both endpoints, port-precise, with the bound as the final
  // tiebreaker so two wires differing only in annotation still order stably.
  const boundKey = (bound: GateGraphEdge["bound"]): string =>
    bound === null ? "" : `${bound.kind}=${bound.value}`;

  // The parser types `bound` as a NON-discriminated union ({kind: "budget" |
  // "decreases"; value: string | number}), though its constructor only ever
  // builds the two coherent pairings. Narrow here at the boundary so every
  // downstream pass gets the discriminated form; tightening the parser's own
  // type is logged as an improvement observation, not smuggled into this rung.
  const narrowBound = (bound: GateV3Circuit["wires"][number]["bound"]): GateGraphEdge["bound"] =>
    bound === null
      ? null
      : bound.kind === "budget"
        ? Object.freeze({ kind: "budget" as const, value: Number(bound.value) })
        : Object.freeze({ kind: "decreases" as const, value: String(bound.value) });

  const unnumbered = circuit.wires.map((wire) => ({
    from: Object.freeze({ node: nodeIdOf(wire.from), port: portOf(wire.from) }),
    to: Object.freeze({ node: nodeIdOf(wire.to), port: portOf(wire.to) }),
    bound: narrowBound(wire.bound),
  }));
  unnumbered.sort((a, b) =>
    byCodeUnit(a.from.node, b.from.node) ||
    byCodeUnit(a.from.port, b.from.port) ||
    byCodeUnit(a.to.node, b.to.node) ||
    byCodeUnit(a.to.port, b.to.port) ||
    byCodeUnit(boundKey(a.bound), boundKey(b.bound)));

  // IDs only exist AFTER canonical order is decided — never before.
  const edges = unnumbered.map((edge, index) => Object.freeze({ id: `e${index + 1}`, ...edge }));

  return Object.freeze({
    circuit: circuit.name,
    nodes: Object.freeze([...nodes.values()].sort((a, b) => byCodeUnit(a.id, b.id))),
    edges: Object.freeze(edges),
  });
}

/**
 * Serialize a GateGraph to its canonical string — stable key order, LF line
 * endings, no host-dependent formatting. Byte equality of this string IS the
 * graph-identity relation the KAT asserts; nothing else in the repository may
 * define a second serialization, or the identity forks (GD-024's shape: two
 * entry points, one wired).
 */
export function serializeGateGraph(graph: GateGraph): string {
  // JSON.stringify preserves insertion order; every object below is built with
  // its keys in one fixed order, so the output is deterministic by
  // construction rather than by a post-hoc sort of text.
  return JSON.stringify({
    circuit: graph.circuit,
    nodes: graph.nodes.map((node) => ({ id: node.id, kind: node.kind, component: node.component })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      from: { node: edge.from.node, port: edge.from.port },
      to: { node: edge.to.node, port: edge.to.port },
      bound: edge.bound === null ? null : edge.bound,
    })),
  }, null, 2) + "\n";
}
