// =============================================================================
// `.gate` v3 circuit resolution against the registry — Round two G2 steps 3-6
//
// Description: resolves a parsed circuit against a loaded component registry.
//   This is where SHAPE becomes MEANING: the contract, not the drawing, says
//   what a part is, which ports it has, which are required, whether an output
//   may fan out, and whether it is a three-valued decision.
// Version / change-control: G2 steps 3-6. Semantic verification (dominators,
//   cuts, effects, authority) is G3/G4; GIR lowering is G6.
// Pointers: KTA 25-round-two-g2-plan.md; defects GD-008 (K3 by contract),
//   GD-010 (type wall), GD-012 (required inputs), GD-023 (argument bounds) —
//   each executed against the reference before being closed here.
//
// NO NULL IN THIS API. Every function returns a total value (a frozen array of
//   diagnostics). Where an outcome is genuinely two-valued, the type is a
//   DISCRIMINATED UNION, never `T | null` — the null reference is the
//   billion-dollar mistake (Hoare, ALGOL W 1965) and a checker is the last
//   place to reintroduce it.
// =============================================================================

import type { ParseDiagnostic, SourceLocation } from "./parser.js";
import type { GateV3Circuit, GateV3Value } from "./gate-v3-parser.js";
import type { GateV3Registry, GateV3Component } from "./gate-v3-registry.js";

/** Resolution diagnostic codes, exported so the catalogue and KATs bind to constants. */
export const GATE_V3_RESOLVE_CODES = {
  RESOLVE_101: { code: "GATE-RESOLVE-101", name: "GATE_V3_COMPONENT_ABSENT", message: "component is absent from the registry" },
  RESOLVE_102: { code: "GATE-RESOLVE-102", name: "GATE_V3_COMPONENT_INADMISSIBLE", message: "component has a non-admissible status" },
  RESOLVE_103: { code: "GATE-RESOLVE-103", name: "GATE_V3_UNKNOWN_ARGUMENT", message: "unknown argument" },
  RESOLVE_104: { code: "GATE-RESOLVE-104", name: "GATE_V3_ARGUMENT_TYPE", message: "argument value does not match its declared type" },
  RESOLVE_105: { code: "GATE-RESOLVE-105", name: "GATE_V3_MISSING_ARGUMENT", message: "missing required argument" },
  RESOLVE_106: { code: "GATE-RESOLVE-106", name: "GATE_V3_UNKNOWN_OUTPUT_PORT", message: "unknown output port" },
  RESOLVE_107: { code: "GATE-RESOLVE-107", name: "GATE_V3_UNKNOWN_INPUT_PORT", message: "unknown input port" },
  RESOLVE_108: { code: "GATE-RESOLVE-108", name: "GATE_V3_UNKNOWN_TYPE", message: "type is absent from the registry catalogue" },
  RESOLVE_109: { code: "GATE-RESOLVE-109", name: "GATE_V3_NO_TYPE_CATALOGUE", message: "the strict profile requires a non-empty type catalogue" },
  RESOLVE_110: { code: "GATE-RESOLVE-110", name: "GATE_V3_REQUIRED_INPUT_UNWIRED", message: "required input port has no producer" },
  RESOLVE_111: { code: "GATE-RESOLVE-111", name: "GATE_V3_DECISION_ARM_UNROUTED", message: "declared decision arm is not routed" },
  RESOLVE_112: { code: "GATE-RESOLVE-112", name: "GATE_V3_ARGUMENT_OUT_OF_RANGE", message: "argument value violates its declared range" },
  // These two invariants are ALREADY named in the reference catalogue as
  // GATE-WIRE-101/102. Minting new numbers for the same invariant would be
  // catalogue drift: a code is a stable machine identity, and one invariant
  // must not answer to two of them.
  WIRE_101: { code: "GATE-WIRE-101", name: "GATE_V3_WIRE_TYPE_MISMATCH", message: "wire type mismatch (no implicit conversion)" },
  WIRE_102: { code: "GATE-WIRE-102", name: "GATE_V3_NONCOPYABLE_FANOUT", message: "non-copyable output has more than one consumer" },
} as const;

/** Terminals consume; they carry no registry-declared payload type (yet). */
const TERMINALS = new Set(["OUT", "DENY", "FAULT", "TRAP", "DRAIN"]);

/** Statuses a circuit may not build on. */
const INADMISSIBLE = new Set(["BLOCKED", "REJECTED"]);

export interface ResolveOptions {
  /**
   * `strict` (default) demands a non-empty type catalogue, so the nominal type
   * wall cannot be silently disabled by shipping a registry without types.
   * `development` permits a typeless registry; its evidence is NOT admissible
   * for production and the profile must be recorded alongside any result.
   */
  readonly profile?: "strict" | "development";
}

/**
 * Resolve a circuit against a registry.
 *
 * Returns every diagnostic found (never stops at the first) so an author sees
 * the whole picture in one pass. An empty array means every part, port,
 * argument and wire resolved — it is NOT an authorization: admission remains
 * the signed capability at fuse.
 *
 * @param circuit a frozen AST from `parseGateV3`
 * @param registry a validated registry from `loadGateV3Registry`
 * @param options resolution profile
 */
export function resolveGateV3(
  circuit: GateV3Circuit,
  registry: GateV3Registry,
  options: ResolveOptions = {},
): readonly ParseDiagnostic[] {
  const profile = options.profile ?? "strict";
  const diagnostics: ParseDiagnostic[] = [];
  const emit = (def: { code: string; name: string; message: string }, detail: string, location?: SourceLocation): void => {
    diagnostics.push({
      code: def.code,
      name: def.name,
      severity: "error",
      message: detail ? `${def.message}: ${detail}` : def.message,
      ...(location ? { location } : {}),
    });
  };

  // ── the type catalogue is load-bearing, not optional ──────────────────────
  // GD-010: the reference guarded every type check behind `types.size > 0`, so
  // an empty catalogue disabled the whole nominal wall and an invented type
  // verified clean. In the strict profile an empty catalogue is itself the
  // refusal; unknown never resolves to allow.
  if (registry.types.size === 0 && profile === "strict") {
    emit(GATE_V3_RESOLVE_CODES.RESOLVE_109, `profile=${profile}`, circuit.location);
  }
  const typeKnown = (type: string): boolean => registry.types.size === 0 ? profile !== "strict" : registry.types.has(type);

  for (const param of circuit.params) {
    if (!typeKnown(param.type)) emit(GATE_V3_RESOLVE_CODES.RESOLVE_108, `parameter '${param.name}' uses '${param.type}'`, param.location);
  }
  if (!typeKnown(circuit.returnType)) {
    emit(GATE_V3_RESOLVE_CODES.RESOLVE_108, `return uses '${circuit.returnType}'`, circuit.location);
  }

  // ── component resolution ──────────────────────────────────────────────────
  const resolved = new Map<string, GateV3Component>();
  for (const part of circuit.parts) {
    const key = `${part.component}@${part.version}`;
    const contract = registry.components.get(key);
    if (!contract) {
      emit(GATE_V3_RESOLVE_CODES.RESOLVE_101, key, part.location);
      continue;
    }
    if (INADMISSIBLE.has(contract.status)) {
      emit(GATE_V3_RESOLVE_CODES.RESOLVE_102, `${key} is ${contract.status}`, part.location);
    }
    resolved.set(part.instance, contract);

    // arguments: unknown, mistyped, out of range, or missing-required
    const supplied = new Set(part.args.map((a) => a.name));
    for (const arg of part.args) {
      const spec = contract.arguments.get(arg.name);
      if (!spec) {
        emit(GATE_V3_RESOLVE_CODES.RESOLVE_103, `'${arg.name}' on '${part.instance}'`, arg.location);
        continue;
      }
      if (!valueMatchesType(arg.value, spec.type)) {
        emit(GATE_V3_RESOLVE_CODES.RESOLVE_104, `'${arg.name}' on '${part.instance}' requires ${spec.type}`, arg.location);
        continue;
      }
      // GD-023: a numeric argument is range-checked against its contract.
      // The reference accepted width=0, width=-5 and width=999999999999 alike
      // because argument values were never bounded.
      if (arg.value.kind === "number") {
        const numeric = arg.value.value as number;
        if (spec.type === "Int" && !Number.isSafeInteger(numeric)) {
          emit(GATE_V3_RESOLVE_CODES.RESOLVE_112, `'${arg.name}'=${numeric} must be an integer`, arg.location);
        } else if (spec.min !== undefined && numeric < spec.min) {
          emit(GATE_V3_RESOLVE_CODES.RESOLVE_112, `'${arg.name}'=${numeric} is below the declared minimum ${spec.min}`, arg.location);
        } else if (spec.max !== undefined && numeric > spec.max) {
          emit(GATE_V3_RESOLVE_CODES.RESOLVE_112, `'${arg.name}'=${numeric} is above the declared maximum ${spec.max}`, arg.location);
        }
      }
    }
    for (const spec of contract.arguments.values()) {
      if (spec.required && !supplied.has(spec.name)) {
        emit(GATE_V3_RESOLVE_CODES.RESOLVE_105, `'${spec.name}' on '${part.instance}'`, part.location);
      }
    }
  }

  // ── ports, types and fan-out on every wire ────────────────────────────────
  const paramTypes = new Map(circuit.params.map((p) => [p.name, p.type]));
  const producedInputs = new Map<string, Set<string>>();   // instance -> wired input ports
  const routedOutputs = new Map<string, Set<string>>();    // instance -> wired output ports
  const outputConsumers = new Map<string, number>();       // "instance.port" -> consumer count

  for (const wire of circuit.wires) {
    // producer side
    let fromType = "";
    if (wire.from.node === "IN") {
      fromType = paramTypes.get(wire.from.port) ?? "";
    } else {
      const contract = resolved.get(wire.from.node);
      if (contract) {
        const output = contract.outputs.get(wire.from.port);
        if (!output) {
          emit(GATE_V3_RESOLVE_CODES.RESOLVE_106, wire.from.text, wire.from.location);
        } else {
          fromType = output.type;
          if (!routedOutputs.has(wire.from.node)) routedOutputs.set(wire.from.node, new Set());
          routedOutputs.get(wire.from.node)!.add(wire.from.port);
          outputConsumers.set(wire.from.text, (outputConsumers.get(wire.from.text) ?? 0) + 1);
        }
      }
    }

    // consumer side
    let toType = "";
    if (wire.to.node === "OUT") {
      toType = circuit.returnType;
    } else if (!TERMINALS.has(wire.to.node)) {
      const contract = resolved.get(wire.to.node);
      if (contract) {
        const input = contract.inputs.get(wire.to.port);
        if (!input) {
          emit(GATE_V3_RESOLVE_CODES.RESOLVE_107, wire.to.text, wire.to.location);
        } else {
          toType = input.type;
          if (!producedInputs.has(wire.to.node)) producedInputs.set(wire.to.node, new Set());
          producedInputs.get(wire.to.node)!.add(wire.to.port);
        }
      }
    }

    // exact nominal equality — a registered explicit conversion is a future
    // named round; today an implicit one is a refusal.
    if (fromType !== "" && toType !== "" && fromType !== toType) {
      emit(GATE_V3_RESOLVE_CODES.WIRE_101, `${wire.from.text}:${fromType} -> ${wire.to.text}:${toType}`, wire.location);
    }
  }

  // GD-011's payoff: fan-out is decided by the CONTRACT, and an unmarked
  // output is non-copyable, so silence never grants copyability.
  for (const [endpoint, count] of outputConsumers) {
    if (count <= 1) continue;
    const [instance, port] = endpoint.split(".");
    const output = resolved.get(instance ?? "")?.outputs.get(port ?? "");
    if (output && !output.copyable) {
      emit(GATE_V3_RESOLVE_CODES.WIRE_102, `${endpoint} has ${count} consumers`, circuit.location);
    }
  }

  // ── GD-012: every REQUIRED input must have a producer ─────────────────────
  // "Connected" is not "correctly invoked": the reference counted any incident
  // edge, so a part could be wired only on its output while a required input
  // stayed dangling.
  for (const part of circuit.parts) {
    const contract = resolved.get(part.instance);
    if (!contract) continue;
    const wired = producedInputs.get(part.instance) ?? new Set<string>();
    for (const input of contract.inputs.values()) {
      if (input.required && !wired.has(input.name)) {
        emit(GATE_V3_RESOLVE_CODES.RESOLVE_110, `'${part.instance}.${input.name}'`, part.location);
      }
    }
  }

  // ── GD-008: K3 completeness by CONTRACT, never by port name ───────────────
  // A decision component declares itself and names its arms, so a component
  // whose arms are spelled permit/refuse/unsure is checked exactly like one
  // spelled allow/deny/indeterminate. Port names can no longer evade the rule.
  for (const part of circuit.parts) {
    const contract = resolved.get(part.instance);
    if (!contract || !contract.decision) continue;
    const routed = routedOutputs.get(part.instance) ?? new Set<string>();
    for (const arm of contract.arms) {
      if (!routed.has(arm)) {
        emit(GATE_V3_RESOLVE_CODES.RESOLVE_111, `'${part.instance}.${arm}' (declared decision arm)`, part.location);
      }
    }
  }

  return Object.freeze(diagnostics);
}

/** Does a parsed argument value satisfy its declared contract type? */
function valueMatchesType(value: GateV3Value, type: string): boolean {
  switch (type) {
    case "String": return value.kind === "string";
    case "Int": return value.kind === "number" && Number.isInteger(value.value as number);
    case "Number": return value.kind === "number";
    case "Name": return value.kind === "name";
    case "ParameterRef": return value.kind === "reference";
    case "TritLiteral":
      return value.kind === "number" && [-1, 0, 1].includes(value.value as number);
    default:
      // A set type accepts a set; anything else declared is not silently
      // waved through (the reference returned true for every unknown type,
      // which made an unknown declaration accept every value).
      return type.startsWith("Set<") ? value.kind === "set" : false;
  }
}

// ── contract-driven liveness (G2 step 7) ────────────────────────────────────

/** Liveness diagnostic codes, exported so the catalogue and KATs bind to constants. */
export const GATE_V3_LIVENESS_CODES = {
  LIVE_001: { code: "GATE-LIVE-001", name: "GATE_V3_ORPHAN_SOURCE", message: "part declares required inputs but none are wired and it is unreachable from any circuit input" },
  LIVE_002: { code: "GATE-LIVE-002", name: "GATE_V3_DEAD_END", message: "part declares outputs but none are wired and it reaches no terminal" },
} as const;

/**
 * Check liveness using component contracts.
 *
 * GD-007's ruling was full liveness; implementing it structurally in G1 fired
 * on 7 of 20 canonical circuits, because a legitimate SOURCE (a dataset scan,
 * a literal constant) and a legitimate SINK (an audit recorder) look exactly
 * like a ghost part when all you have is the drawing. With contracts the
 * question becomes decidable:
 *
 *   a part is an ORPHAN SOURCE iff its contract declares required inputs, the
 *   drawing wires none of them, and no path reaches it from a circuit input;
 *
 *   a part is a DEAD END iff its contract declares outputs, the drawing wires
 *   none of them, and it reaches no terminal.
 *
 * A component that declares no inputs is a source by contract; one that
 * declares no outputs is a sink by contract. Neither is an orphan, and neither
 * is flagged. An unresolved component yields NO verdict — resolution already
 * refused it, and a second guess would be noise.
 *
 * @param circuit a frozen AST from `parseGateV3`
 * @param registry a validated registry from `loadGateV3Registry`
 */
export function checkGateV3Liveness(
  circuit: GateV3Circuit,
  registry: GateV3Registry,
): readonly ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];

  // Resolve what we can; parts without a contract are skipped entirely.
  const contracts = new Map<string, GateV3Component>();
  for (const part of circuit.parts) {
    const contract = registry.components.get(`${part.component}@${part.version}`);
    if (contract) contracts.set(part.instance, contract);
  }

  // Which ports the drawing actually wires, per instance and direction.
  const wiredInputs = new Map<string, Set<string>>();
  const wiredOutputs = new Map<string, Set<string>>();
  const forwardEdges = new Map<string, string[]>();
  const backwardEdges = new Map<string, string[]>();
  for (const wire of circuit.wires) {
    if (!wiredOutputs.has(wire.from.node)) wiredOutputs.set(wire.from.node, new Set());
    wiredOutputs.get(wire.from.node)!.add(wire.from.port);
    if (!wiredInputs.has(wire.to.node)) wiredInputs.set(wire.to.node, new Set());
    wiredInputs.get(wire.to.node)!.add(wire.to.port);

    if (!forwardEdges.has(wire.from.node)) forwardEdges.set(wire.from.node, []);
    forwardEdges.get(wire.from.node)!.push(wire.to.node);
    if (!backwardEdges.has(wire.to.node)) backwardEdges.set(wire.to.node, []);
    backwardEdges.get(wire.to.node)!.push(wire.from.node);
  }

  const reach = (start: string, edges: Map<string, string[]>): Set<string> => {
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

  const fromInput = reach("IN", forwardEdges);
  const toTerminal = new Set<string>();
  for (const terminal of TERMINALS) {
    for (const node of reach(terminal, backwardEdges)) toTerminal.add(node);
  }

  for (const part of circuit.parts) {
    const contract = contracts.get(part.instance);
    if (!contract) continue;   // unresolved: resolution owns that verdict

    const requiredInputs = [...contract.inputs.values()].filter((p) => p.required);
    const wiredIn = wiredInputs.get(part.instance) ?? new Set<string>();
    const wiredOut = wiredOutputs.get(part.instance) ?? new Set<string>();

    // A source BY CONTRACT (no required inputs) is legitimately unreachable.
    if (requiredInputs.length > 0 && wiredIn.size === 0 && !fromInput.has(part.instance)) {
      diagnostics.push({
        code: GATE_V3_LIVENESS_CODES.LIVE_001.code,
        name: GATE_V3_LIVENESS_CODES.LIVE_001.name,
        severity: "error",
        message: `${GATE_V3_LIVENESS_CODES.LIVE_001.message}: '${part.instance}'`,
        location: part.location,
      });
      continue;
    }

    // A sink BY CONTRACT (no declared outputs) legitimately reaches no terminal.
    if (contract.outputs.size > 0 && wiredOut.size === 0 && !toTerminal.has(part.instance)) {
      diagnostics.push({
        code: GATE_V3_LIVENESS_CODES.LIVE_002.code,
        name: GATE_V3_LIVENESS_CODES.LIVE_002.name,
        severity: "error",
        message: `${GATE_V3_LIVENESS_CODES.LIVE_002.message}: '${part.instance}'`,
        location: part.location,
      });
    }
  }

  return Object.freeze(diagnostics);
}
