// =============================================================================
// `.gate` v3 structural verifier — Round-one G1 step 5
//
// Description: registry-free structural checks over the frozen AST produced by
//   `parseGateV3`. Proves shape only — duplicate declarations, wiring rules,
//   K3 arm completeness, cycle refusal, and LIVENESS. It establishes nothing
//   about Galerina types, effects, authority, privacy or GIR: those are later
//   named rounds (G2+). A clean result is NOT an authorization (deny-only).
// Version / change-control: G1 step 5. Registry-mode checks (component/port/
//   type resolution) are G2.
// Pointers: reference verifier ZT-Galerina-GRAPH-ASCII-v3/src/verifier.mjs;
//   KTA 03-gate-defects.md (GD-007 liveness ruling), 12-round-one-plan.md.
//
// TWO RULED IMPROVEMENTS over the reference, built in from the start:
//   * FULL LIVENESS (owner ruling on GD-007): the reference treats a part as
//     "connected" if it has ANY incident edge, so a source-less part feeding
//     OUT passes while the real flow drains. Here every part must be reachable
//     FROM an input AND must reach a terminal.
//   * Codes are EXPORTED CONSTANTS so the diagnostic catalogue can see them
//     and each firing KAT binds to the constant, not a string literal.
// =============================================================================

import type { ParseDiagnostic, SourceLocation } from "./parser.js";
import type { GateV3Circuit, GateV3Value } from "./gate-v3-parser.js";

/** The terminal node names. A terminal consumes; it never produces. */
const TERMINALS = new Set(["OUT", "DENY", "FAULT", "TRAP", "DRAIN"]);

/**
 * Structural diagnostic codes, exported so the catalogue and the KATs bind to
 * constants rather than string literals. Codes are stable machine identities:
 * wording may improve; changing an invariant requires a NEW code.
 */
export const GATE_V3_CODES = {
  RESOLVE_001: { code: "GATE-RESOLVE-001", name: "GATE_V3_DUPLICATE_PARAMETER", message: "duplicate parameter" },
  RESOLVE_002: { code: "GATE-RESOLVE-002", name: "GATE_V3_DUPLICATE_PART", message: "duplicate part instance" },
  RESOLVE_003: { code: "GATE-RESOLVE-003", name: "GATE_V3_DUPLICATE_ARGUMENT", message: "duplicate argument" },
  RESOLVE_004: { code: "GATE-RESOLVE-004", name: "GATE_V3_UNKNOWN_PARAM_REF", message: "unknown parameter reference" },
  RESOLVE_005: { code: "GATE-RESOLVE-005", name: "GATE_V3_UNKNOWN_INPUT", message: "unknown input" },
  RESOLVE_006: { code: "GATE-RESOLVE-006", name: "GATE_V3_UNKNOWN_SOURCE", message: "unknown source instance" },
  RESOLVE_007: { code: "GATE-RESOLVE-007", name: "GATE_V3_UNKNOWN_TARGET", message: "unknown target instance" },
  RESOLVE_008: { code: "GATE-RESOLVE-008", name: "GATE_V3_DUPLICATE_SET_VALUE", message: "set literal contains a duplicate value" },
  WIRE_001: { code: "GATE-WIRE-001", name: "GATE_V3_BAD_RETURN_PORT", message: "the single return terminal is OUT.value" },
  WIRE_002: { code: "GATE-WIRE-002", name: "GATE_V3_DUPLICATE_CONSUMER", message: "consumer already has a producer" },
  WIRE_003: { code: "GATE-WIRE-003", name: "GATE_V3_UNUSED_INPUT", message: "input is never connected" },
  WIRE_004: { code: "GATE-WIRE-004", name: "GATE_V3_DISCONNECTED_PART", message: "part is disconnected" },
  WIRE_005: { code: "GATE-WIRE-005", name: "GATE_V3_NO_OUT_PATH", message: "circuit has no successful OUT.value path" },
  WIRE_006: { code: "GATE-WIRE-006", name: "GATE_V3_TERMINAL_PRODUCES", message: "terminal cannot produce a value" },
  WIRE_007: { code: "GATE-WIRE-007", name: "GATE_V3_INPUT_CONSUMES", message: "input cannot consume a value" },
  AUTH_001: { code: "GATE-AUTH-001", name: "GATE_V3_MISSING_DENY_ARM", message: "authority part has allow but no deny route" },
  AUTH_002: { code: "GATE-AUTH-002", name: "GATE_V3_MISSING_INDETERMINATE_ARM", message: "authority part has allow but no indeterminate route" },
  EFFECT_001: { code: "GATE-EFFECT-001", name: "GATE_V3_DUPLICATE_CAPABILITY", message: "duplicate capability" },
  EFFECT_002: { code: "GATE-EFFECT-002", name: "GATE_V3_DUPLICATE_EFFECT", message: "duplicate effect" },
  TERM_001: { code: "GATE-TERM-001", name: "GATE_V3_DUPLICATE_BUDGET", message: "duplicate budget" },
  TERM_002: { code: "GATE-TERM-002", name: "GATE_V3_INVALID_BUDGET", message: "budget must be a positive integer" },
  TERM_003: { code: "GATE-TERM-003", name: "GATE_V3_UNBOUNDED_CYCLE", message: "unbounded component cycle" },
  TERM_004: { code: "GATE-TERM-004", name: "GATE_V3_UNPROVED_CYCLE", message: "cycle requires a registered state contract and canonical termination proof" },
} as const;

type CodeDef = { readonly code: string; readonly name: string; readonly message: string };

/**
 * Verify a parsed v3 circuit structurally.
 *
 * Returns every diagnostic found (it does not stop at the first) so an author
 * or AI sees the whole picture in one pass. An empty array means the SHAPE is
 * legal — never that the circuit is authorized, typed, or semantically sound.
 *
 * @param circuit a frozen AST from `parseGateV3`
 */
export function verifyGateV3Structure(circuit: GateV3Circuit): readonly ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  const emit = (def: CodeDef, detail: string, location?: SourceLocation): void => {
    diagnostics.push({
      code: def.code,
      name: def.name,
      severity: "error",
      message: detail ? `${def.message}: ${detail}` : def.message,
      ...(location ? { location } : {}),
    });
  };

  // ── duplicate declarations ────────────────────────────────────────────────
  const duplicates = <T extends { location: SourceLocation }>(
    items: readonly T[], key: (item: T) => string, def: CodeDef,
  ): void => {
    const seen = new Set<string>();
    for (const item of items) {
      const value = key(item);
      if (seen.has(value)) emit(def, value, item.location);
      else seen.add(value);
    }
  };

  duplicates(circuit.params, (p) => p.name, GATE_V3_CODES.RESOLVE_001);
  duplicates(circuit.parts, (p) => p.instance, GATE_V3_CODES.RESOLVE_002);
  duplicates(circuit.requirements.capabilities, (c) => c.name, GATE_V3_CODES.EFFECT_001);
  duplicates(circuit.requirements.effects, (e) => e.name, GATE_V3_CODES.EFFECT_002);
  duplicates(circuit.requirements.budgets, (b) => b.name, GATE_V3_CODES.TERM_001);

  for (const part of circuit.parts) {
    duplicates(part.args, (a) => a.name, GATE_V3_CODES.RESOLVE_003);
  }

  // ── budgets are positive integers ─────────────────────────────────────────
  for (const budget of circuit.requirements.budgets) {
    if (!Number.isSafeInteger(budget.value) || budget.value <= 0) {
      emit(GATE_V3_CODES.TERM_002, budget.name, budget.location);
    }
  }

  // ── parameter references and set literals inside arguments ────────────────
  const paramNames = new Set(circuit.params.map((p) => p.name));
  const referenced = new Set<string>();
  const walkValue = (value: GateV3Value, location: SourceLocation): void => {
    if (value.kind === "reference") {
      const name = value.value as string;
      referenced.add(name);
      if (!paramNames.has(name)) emit(GATE_V3_CODES.RESOLVE_004, `$${name}`, location);
    }
    if (value.kind === "set") {
      const seen = new Set<string>();
      for (const item of value.value as readonly GateV3Value[]) {
        const key = JSON.stringify([item.kind, item.value]);
        if (seen.has(key)) emit(GATE_V3_CODES.RESOLVE_008, String(item.value), location);
        seen.add(key);
        walkValue(item, location);
      }
    }
  };
  for (const part of circuit.parts) {
    for (const arg of part.args) walkValue(arg.value, arg.location);
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  const partNames = new Set(circuit.parts.map((p) => p.instance));
  const consumers = new Map<string, number>();
  const incident = new Map<string, number>(circuit.parts.map((p) => [p.instance, 0]));
  const usedInputs = new Set<string>(referenced);
  let hasOut = false;

  for (const wire of circuit.wires) {
    // producer side
    if (TERMINALS.has(wire.from.node)) {
      emit(GATE_V3_CODES.WIRE_006, wire.from.text, wire.from.location);
    } else if (wire.from.node === "IN") {
      usedInputs.add(wire.from.port);
      if (!paramNames.has(wire.from.port)) emit(GATE_V3_CODES.RESOLVE_005, wire.from.port, wire.from.location);
    } else if (!partNames.has(wire.from.node)) {
      emit(GATE_V3_CODES.RESOLVE_006, wire.from.node, wire.from.location);
    }

    // consumer side
    if (wire.to.node === "IN") {
      emit(GATE_V3_CODES.WIRE_007, wire.to.text, wire.to.location);
    } else if (TERMINALS.has(wire.to.node)) {
      if (wire.to.node === "OUT") {
        hasOut = true;
        if (wire.to.port !== "value") emit(GATE_V3_CODES.WIRE_001, wire.to.text, wire.to.location);
      }
    } else if (!partNames.has(wire.to.node)) {
      emit(GATE_V3_CODES.RESOLVE_007, wire.to.node, wire.to.location);
    }

    if (partNames.has(wire.from.node)) incident.set(wire.from.node, (incident.get(wire.from.node) ?? 0) + 1);
    if (partNames.has(wire.to.node)) incident.set(wire.to.node, (incident.get(wire.to.node) ?? 0) + 1);

    const previous = consumers.get(wire.to.text);
    if (previous !== undefined) emit(GATE_V3_CODES.WIRE_002, `${wire.to.text} (already produced on line ${previous})`, wire.to.location);
    else consumers.set(wire.to.text, wire.location.line);
  }

  for (const param of circuit.params) {
    if (!usedInputs.has(param.name)) emit(GATE_V3_CODES.WIRE_003, param.name, param.location);
  }
  for (const part of circuit.parts) {
    if ((incident.get(part.instance) ?? 0) === 0) emit(GATE_V3_CODES.WIRE_004, part.instance, part.location);
  }
  if (!hasOut) emit(GATE_V3_CODES.WIRE_005, circuit.name, circuit.location);

  // ── K3 arm completeness ───────────────────────────────────────────────────
  // A part with a wired `allow` output is a decision; it must also route deny
  // and indeterminate. (Port-name keyed here; the ruled contract-driven form —
  // registry `decision: true` — arrives with registry resolution in G2.)
  const authorities = new Set(circuit.wires.filter((w) => w.from.port === "allow").map((w) => w.from.node));
  for (const instance of authorities) {
    const ports = new Set(circuit.wires.filter((w) => w.from.node === instance).map((w) => w.from.port));
    const location = circuit.parts.find((p) => p.instance === instance)?.location ?? circuit.location;
    if (!ports.has("deny")) emit(GATE_V3_CODES.AUTH_001, instance, location);
    if (!ports.has("indeterminate")) emit(GATE_V3_CODES.AUTH_002, instance, location);
  }

  // ── cycles ────────────────────────────────────────────────────────────────
  const cycle = findCycle(circuit);
  // `.length > 0`, not truthiness: absence is now an EMPTY ARRAY, and an empty
  // array is truthy. Swapping a null for a sentinel value moves the emptiness
  // test from the language to the caller, and a caller that keeps the old
  // `if (x)` fires on every input. Caught here; worth stating because the same
  // trap waits at every other null-to-empty conversion.
  if (cycle.length > 0) {
    // EDGE-wise, not NODE-wise. TERM-004 claims the lap count is capped, and a
    // lap crosses each consecutive STEP of the cycle exactly once — so the
    // cycle is bounded only if at some step EVERY parallel wire between that
    // step's pair carries a bound. The node-membership test this replaces
    // (`some(w.bound && cycle.includes(from) && cycle.includes(to))`) was
    // fooled by two shapes, both conformance-pinned (CV-088/089): a bounded
    // CHORD — endpoints on the cycle, but not an edge of it, so no lap crosses
    // it — and a bounded wire beside an unbounded PARALLEL, which every lap may
    // take instead. Both misreported an unbounded cycle as "register a proof"
    // (TERM-004) when the truth is "this loop is unbounded" (TERM-003); both
    // refuse either way, but §3.1 makes distinguishable refusals a security
    // property, and the wrong one sends the author to prove the unprovable.
    // `findCycle` closes the path by repeating the entry node, so consecutive
    // pairs enumerate exactly the cycle's edges.
    let bounded = false;
    for (let i = 0; i + 1 < cycle.length && !bounded; i += 1) {
      const step = circuit.wires.filter((w) => w.from.node === cycle[i] && w.to.node === cycle[i + 1]);
      bounded = step.length > 0 && step.every((w) => w.bound !== null);
    }
    emit(bounded ? GATE_V3_CODES.TERM_004 : GATE_V3_CODES.TERM_003, cycle.join(" -> "), circuit.location);
  }

  // ── LIVENESS: analysed here, ENFORCED at G2 (see analyzeGateV3Liveness) ───
  // The owner ruled FULL liveness (GD-007: reachable from IN and reaching a
  // terminal). Executed evidence says that ruling CANNOT be enforced soundly
  // at this registry-free tier: a part with no inbound wire may be a genuine
  // SOURCE (a dataset scan, a literal constant) and a part with no outbound
  // wire may be a genuine SINK (an audit recorder). Structurally those are
  // INDISTINGUISHABLE from the ghost part GD-007 set out to catch — only a
  // component contract can say which ports exist and which must be wired.
  // Emitting here would flag 7 of the 20 canonical corpus circuits, i.e. cry
  // wolf. So liveness is computed as ADVISORY candidates and the fail-closed
  // decision moves to registry resolution (G2), where it is decidable.

  return Object.freeze(diagnostics);
}

/**
 * Liveness candidates — ADVISORY, never authorizing.
 *
 * Returns the parts that are not reachable forward from any circuit input
 * (`sourceCandidates`) and those that reach no terminal (`sinkCandidates`).
 * At this tier a candidate is NOT a defect: it may be a legitimate registered
 * source or sink. The fail-closed check belongs to registry resolution (G2),
 * which knows from each component contract whether a part is contractually a
 * source/sink or an orphan — that is where GD-007's ruling becomes enforceable.
 *
 * @param circuit a frozen AST from `parseGateV3`
 */
export function analyzeGateV3Liveness(circuit: GateV3Circuit): {
  readonly sourceCandidates: readonly string[];
  readonly sinkCandidates: readonly string[];
} {
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  for (const wire of circuit.wires) {
    if (!outEdges.has(wire.from.node)) outEdges.set(wire.from.node, []);
    if (!inEdges.has(wire.to.node)) inEdges.set(wire.to.node, []);
    outEdges.get(wire.from.node)!.push(wire.to.node);
    inEdges.get(wire.to.node)!.push(wire.from.node);
  }

  const walk = (start: string, edges: Map<string, string[]>): Set<string> => {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const node = stack.pop()!;
      for (const next of edges.get(node) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    return seen;
  };

  const forward = walk("IN", outEdges);
  const backward = new Set<string>();
  for (const terminal of TERMINALS) {
    for (const node of walk(terminal, inEdges)) backward.add(node);
  }

  const sourceCandidates: string[] = [];
  const sinkCandidates: string[] = [];
  for (const part of circuit.parts) {
    if (!forward.has(part.instance)) sourceCandidates.push(part.instance);
    else if (!backward.has(part.instance)) sinkCandidates.push(part.instance);
  }
  return Object.freeze({
    sourceCandidates: Object.freeze(sourceCandidates),
    sinkCandidates: Object.freeze(sinkCandidates),
  });
}

/**
 * Find one part-to-part cycle. Returns the cycle's nodes, or an EMPTY array
 * when there is none — a cycle always has at least one node, so empty is
 * unambiguous and no null is needed to express absence.
 *
 * ★ NOW ACTUALLY ITERATIVE (null audit, 2026-08-07). The comment here already
 * claimed "an explicit stack so a pathological graph cannot exhaust the JS call
 * stack" — and `visit` recursed per node, which is precisely what GD-006 ruled
 * out on the grounds that a circuit may hold 4,096 parts. The doctrine was
 * written down and the code did the opposite; the comment was the part that was
 * true about the intent and false about the artifact.
 *
 * ⚠ A probe at 4,000 chained parts did NOT overflow on this host, and that
 * measured this Node build's stack rather than the algorithm — a smaller stack
 * (a worker thread, another runtime, `--stack-size`) is a different answer to
 * the same question. Fixed because the rule exists so the answer does not
 * depend on the host, not because a crash was demonstrated.
 */
function findCycle(circuit: GateV3Circuit): readonly string[] {
  const known = new Set(circuit.parts.map((p) => p.instance));
  const successors = new Map<string, string[]>(circuit.parts.map((p) => [p.instance, []]));
  for (const wire of circuit.wires) {
    if (known.has(wire.from.node) && known.has(wire.to.node)) {
      successors.get(wire.from.node)!.push(wire.to.node);
    }
  }

  // Explicit stack, one frame per node, each frame remembering how far through
  // its successor list it has walked. Same colouring as the recursive form —
  // VISITING means "on the current path" (a back-edge to it is the cycle),
  // VISITED means "fully explored, cannot be on any future path".
  const VISITING = 1, VISITED = 2;
  const state = new Map<string, number>();

  for (const part of circuit.parts) {
    const root = part.instance;
    if (state.get(root) === VISITED) continue;

    const path: string[] = [root];
    const stack: { node: string; index: number }[] = [{ node: root, index: 0 }];
    state.set(root, VISITING);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const targets = successors.get(frame.node) ?? [];
      if (frame.index < targets.length) {
        const next = targets[frame.index]!;
        frame.index += 1;
        const seen = state.get(next);
        // A back-edge into the current path IS the cycle; slice it out at the
        // point of re-entry, closing the loop by repeating that node.
        if (seen === VISITING) return Object.freeze([...path.slice(path.indexOf(next)), next]);
        if (seen === undefined) {
          state.set(next, VISITING);
          path.push(next);
          stack.push({ node: next, index: 0 });
        }
      } else {
        state.set(frame.node, VISITED);
        stack.pop();
        path.pop();
      }
    }
  }
  return Object.freeze([]);
}
