// =============================================================================
// `.gate` v3 component registry loader — Round two G2 steps 1-2
//
// Description: loads and validates a component registry, the authority on what
//   a part IS. Every entry is validated against a CLOSED schema BEFORE any
//   normalization, so a malformed contract can never reach a downstream check.
// Version / change-control: G2 steps 1-2 (loader). Resolution of circuits
//   against the registry is step 3+.
// Pointers: reference loader ZT-Galerina-GRAPH-ASCII-v3/src/registry-verifier.mjs;
//   KTA 25-round-two-g2-plan.md; defects GD-011 (copyable) and GD-013 (entry
//   shape / last-write-wins), both executed against the reference.
//
// WHY VALIDATE-BEFORE-NORMALIZE: the reference normalizes as it reads, so a
//   `copyable: "false"` string survives as truthy and an `arguments: [null]`
//   entry escapes as an uncaught host exception. Here nothing is normalized
//   until the whole object has passed the schema, and a boundary failure
//   becomes a stable GATE-REGISTRY-* diagnostic rather than a crash.
//
// DEFAULTS ARE FAIL-CLOSED: an output with no `copyable` field is NON-copyable;
//   an argument with no `required` field is optional; neither is inferred from
//   anything but the contract itself.
// =============================================================================

import { createHash } from "node:crypto";
import type { ParseDiagnostic } from "./parser.js";

/** Registry diagnostic codes, exported so the catalogue and KATs bind to constants. */
export const GATE_V3_REGISTRY_CODES = {
  REGISTRY_001: { code: "GATE-REGISTRY-001", name: "GATE_V3_REGISTRY_NOT_OBJECT", message: "registry must be an object" },
  REGISTRY_002: { code: "GATE-REGISTRY-002", name: "GATE_V3_REGISTRY_BAD_VERSION", message: "registry version must be exactly 1.0.0" },
  REGISTRY_003: { code: "GATE-REGISTRY-003", name: "GATE_V3_REGISTRY_COMPONENTS_NOT_ARRAY", message: "registry components must be an array" },
  REGISTRY_004: { code: "GATE-REGISTRY-004", name: "GATE_V3_REGISTRY_DUPLICATE_COMPONENT", message: "duplicate component" },
  REGISTRY_005: { code: "GATE-REGISTRY-005", name: "GATE_V3_REGISTRY_DIGEST_MISMATCH", message: "declared registry digest does not match canonical content" },
  REGISTRY_006: { code: "GATE-REGISTRY-006", name: "GATE_V3_REGISTRY_BAD_COMPONENT_SHAPE", message: "component entry has an invalid identity/port shape" },
  REGISTRY_007: { code: "GATE-REGISTRY-007", name: "GATE_V3_REGISTRY_TYPES_NOT_ARRAY", message: "registry types must be an array when present" },
  REGISTRY_008: { code: "GATE-REGISTRY-008", name: "GATE_V3_REGISTRY_BAD_TYPE_SHAPE", message: "type entry has an invalid identity/domain shape" },
  REGISTRY_009: { code: "GATE-REGISTRY-009", name: "GATE_V3_REGISTRY_DUPLICATE_TYPE", message: "duplicate type" },
  REGISTRY_010: { code: "GATE-REGISTRY-010", name: "GATE_V3_REGISTRY_UNKNOWN_PORT_TYPE", message: "component uses a type absent from the catalogue" },
  REGISTRY_011: { code: "GATE-REGISTRY-011", name: "GATE_V3_REGISTRY_MALFORMED_ENTRY", message: "malformed entry in a component list" },
  REGISTRY_012: { code: "GATE-REGISTRY-012", name: "GATE_V3_REGISTRY_DUPLICATE_DECLARATION", message: "duplicate declaration in a component contract" },
  REGISTRY_013: { code: "GATE-REGISTRY-013", name: "GATE_V3_REGISTRY_BAD_COPYABLE", message: "copyable must be absent or a Boolean" },
  REGISTRY_014: { code: "GATE-REGISTRY-014", name: "GATE_V3_REGISTRY_SURPLUS_FIELD", message: "unknown field on a contract entry (the schema is closed)" },
} as const;

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const STATUS_RE = /^(SHIPPED|PARTIAL|SIMULATED|PROPOSED|BLOCKED|REJECTED)$/;
const TYPE_ID_RE = /^[A-Za-z_][A-Za-z0-9_.]*(?:<[A-Za-z0-9_.,<>]+>)?$/;

/** Fields a closed schema admits. Anything else is a surplus field and refuses. */
const COMPONENT_FIELDS = new Set(["id", "version", "status", "implementationDigest", "inputs", "outputs", "arguments", "effects", "capabilities", "decision", "arms"]);
const PORT_FIELDS = new Set(["name", "type", "copyable", "required"]);
const ARGUMENT_FIELDS = new Set(["name", "type", "required", "min", "max"]);
const TYPE_FIELDS = new Set(["id", "kind", "construction", "values", "scalarEncoding", "packedEncoding"]);

export interface GateV3Port {
  readonly name: string;
  readonly type: string;
  readonly copyable: boolean;
  readonly required: boolean;
}
export interface GateV3ArgumentSpec {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly min?: number;
  readonly max?: number;
}
export interface GateV3Component {
  readonly id: string;
  readonly version: string;
  readonly status: string;
  readonly implementationDigest: string;
  readonly inputs: ReadonlyMap<string, GateV3Port>;
  readonly outputs: ReadonlyMap<string, GateV3Port>;
  readonly arguments: ReadonlyMap<string, GateV3ArgumentSpec>;
  readonly effects: readonly string[];
  readonly capabilities: readonly string[];
  /** True when the contract declares this component a three-valued decision. */
  readonly decision: boolean;
  /** The ordered arm port names a decision must route (GD-008's ruled fix). */
  readonly arms: readonly string[];
}
export interface GateV3Registry {
  readonly version: string;
  readonly digest: string;
  readonly types: ReadonlyMap<string, { readonly id: string; readonly kind: string; readonly construction: string; readonly values?: readonly unknown[] }>;
  readonly components: ReadonlyMap<string, GateV3Component>;
}
export interface GateV3RegistryLoad {
  readonly registry: GateV3Registry | null;
  readonly diagnostics: readonly ParseDiagnostic[];
}

/**
 * Load and validate a component registry.
 *
 * Returns `registry: null` with diagnostics if ANY entry fails the closed
 * schema — a partially-valid registry is never produced, because a downstream
 * check cannot tell which half it is standing on.
 *
 * @param value the parsed registry object (from JSON)
 * @param source path or label, for diagnostics
 */
export function loadGateV3Registry(value: unknown, source: string): GateV3RegistryLoad {
  const diagnostics: ParseDiagnostic[] = [];
  const emit = (def: { code: string; name: string; message: string }, detail = ""): void => {
    diagnostics.push({
      code: def.code,
      name: def.name,
      severity: "error",
      message: detail ? `${source}: ${def.message}: ${detail}` : `${source}: ${def.message}`,
    });
  };
  const fail = (): GateV3RegistryLoad => ({ registry: null, diagnostics: Object.freeze(diagnostics) });

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    emit(GATE_V3_REGISTRY_CODES.REGISTRY_001);
    return fail();
  }
  const raw = value as Record<string, unknown>;

  if (raw.version !== "1.0.0") emit(GATE_V3_REGISTRY_CODES.REGISTRY_002, String(raw.version));
  if (!Array.isArray(raw.components)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_003);
  if (raw.types !== undefined && !Array.isArray(raw.types)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_007);
  if (diagnostics.length > 0) return fail();

  // ── types ────────────────────────────────────────────────────────────────
  const types = new Map<string, { id: string; kind: string; construction: string; values?: readonly unknown[] }>();
  for (const entry of (raw.types ?? []) as unknown[]) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_011, "type list");
      continue;
    }
    const type = entry as Record<string, unknown>;
    for (const key of Object.keys(type)) {
      if (!TYPE_FIELDS.has(key)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_014, `type field '${key}'`);
    }
    if (typeof type.id !== "string" || !TYPE_ID_RE.test(type.id)
      || !/^(opaque|finite|record|evidence|measurement)$/.test(String(type.kind))
      || !/^(source|canonical-only|verified-measurement-only)$/.test(String(type.construction))) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_008, String(type.id ?? "?"));
      continue;
    }
    if (type.kind === "finite" && (!Array.isArray(type.values) || type.values.length === 0)) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_008, `${type.id} (finite type needs a non-empty domain)`);
      continue;
    }
    if (types.has(type.id)) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_009, type.id);
    } else {
      // `values` is omitted entirely when absent (exactOptionalPropertyTypes:
      // an optional property set to undefined is not the same as absent).
      const entry: { id: string; kind: string; construction: string; values?: readonly unknown[] } = {
        id: type.id,
        kind: String(type.kind),
        construction: String(type.construction),
      };
      if (Array.isArray(type.values)) entry.values = Object.freeze([...type.values]);
      types.set(type.id, entry);
    }
  }

  // ── components ───────────────────────────────────────────────────────────
  const components = new Map<string, GateV3Component>();
  for (const entry of raw.components as unknown[]) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_011, "component list");
      continue;
    }
    const component = entry as Record<string, unknown>;

    for (const key of Object.keys(component)) {
      if (!COMPONENT_FIELDS.has(key)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_014, `component field '${key}'`);
    }

    const identityOk = typeof component.id === "string" && IDENT_RE.test(component.id)
      && typeof component.version === "string" && SEMVER_RE.test(component.version)
      && STATUS_RE.test(String(component.status))
      && typeof component.implementationDigest === "string" && DIGEST_RE.test(component.implementationDigest);
    const listsOk = ["inputs", "outputs", "arguments", "effects", "capabilities"].every((k) => Array.isArray(component[k]));
    if (!identityOk || !listsOk) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, String(component.id ?? "?"));
      continue;
    }

    const key = `${component.id as string}@${component.version as string}`;
    if (components.has(key)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_004, key);

    const ports = (list: unknown[], label: string): Map<string, GateV3Port> | null => {
      const out = new Map<string, GateV3Port>();
      for (const item of list) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          emit(GATE_V3_REGISTRY_CODES.REGISTRY_011, `${key} ${label}`);
          return null;
        }
        const port = item as Record<string, unknown>;
        for (const field of Object.keys(port)) {
          if (!PORT_FIELDS.has(field)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_014, `${key} ${label} field '${field}'`);
        }
        if (typeof port.name !== "string" || typeof port.type !== "string") {
          emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} ${label}`);
          return null;
        }
        // GD-011: copyable is Boolean or absent. A string, number or null is
        // NOT a truthiness question — it is a malformed contract.
        if (port.copyable !== undefined && typeof port.copyable !== "boolean") {
          emit(GATE_V3_REGISTRY_CODES.REGISTRY_013, `${key} ${label}.${port.name}`);
          return null;
        }
        if (port.required !== undefined && typeof port.required !== "boolean") {
          emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} ${label}.${port.name} required must be Boolean`);
          return null;
        }
        if (out.has(port.name)) {
          emit(GATE_V3_REGISTRY_CODES.REGISTRY_012, `${key} ${label}.${port.name}`);
          return null;
        }
        out.set(port.name, Object.freeze({
          name: port.name,
          type: port.type,
          copyable: port.copyable === true,     // absent => NON-copyable (fail-closed)
          required: port.required === true,     // absent => optional
        }));
      }
      return out;
    };

    const inputs = ports(component.inputs as unknown[], "inputs");
    const outputs = inputs === null ? null : ports(component.outputs as unknown[], "outputs");
    if (inputs === null || outputs === null) continue;

    const args = new Map<string, GateV3ArgumentSpec>();
    let argsOk = true;
    for (const item of component.arguments as unknown[]) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        emit(GATE_V3_REGISTRY_CODES.REGISTRY_011, `${key} arguments`);
        argsOk = false;
        break;
      }
      const arg = item as Record<string, unknown>;
      for (const field of Object.keys(arg)) {
        if (!ARGUMENT_FIELDS.has(field)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_014, `${key} argument field '${field}'`);
      }
      if (typeof arg.name !== "string" || typeof arg.type !== "string") {
        emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} arguments`);
        argsOk = false;
        break;
      }
      // GD-013b: a duplicate declaration REFUSES. Last-write-wins silently
      // replaced a required String with an optional Int in the reference.
      if (args.has(arg.name)) {
        emit(GATE_V3_REGISTRY_CODES.REGISTRY_012, `${key} argument '${arg.name}'`);
        argsOk = false;
        break;
      }
      const spec: { name: string; type: string; required: boolean; min?: number; max?: number } = {
        name: arg.name,
        type: arg.type,
        required: arg.required === true,
      };
      if (arg.min !== undefined) {
        if (typeof arg.min !== "number") { emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} argument '${arg.name}' min must be numeric`); argsOk = false; break; }
        spec.min = arg.min;
      }
      if (arg.max !== undefined) {
        if (typeof arg.max !== "number") { emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} argument '${arg.name}' max must be numeric`); argsOk = false; break; }
        spec.max = arg.max;
      }
      args.set(arg.name, Object.freeze(spec));
    }
    if (!argsOk) continue;

    // GD-008 (ruled): a decision component DECLARES itself and names its arms.
    // Authority-role recognition is contract-driven, never a port-name guess.
    const decision = component.decision === true;
    const arms = Array.isArray(component.arms) ? (component.arms as unknown[]).map(String) : [];
    if (component.decision !== undefined && typeof component.decision !== "boolean") {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} decision must be Boolean`);
      continue;
    }
    if (decision && arms.length === 0) {
      emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} declares decision:true but names no arms`);
      continue;
    }
    for (const arm of arms) {
      if (!outputs.has(arm)) {
        emit(GATE_V3_REGISTRY_CODES.REGISTRY_006, `${key} arm '${arm}' is not an output port`);
        argsOk = false;
      }
    }
    if (!argsOk) continue;

    // Port types must exist in the catalogue when one is supplied.
    if (types.size > 0) {
      for (const port of [...inputs.values(), ...outputs.values()]) {
        if (!types.has(port.type)) emit(GATE_V3_REGISTRY_CODES.REGISTRY_010, `${key} uses '${port.type}'`);
      }
    }

    components.set(key, Object.freeze({
      id: component.id as string,
      version: component.version as string,
      status: String(component.status),
      implementationDigest: component.implementationDigest as string,
      inputs, outputs, arguments: args,
      effects: Object.freeze((component.effects as unknown[]).map(String)),
      capabilities: Object.freeze((component.capabilities as unknown[]).map(String)),
      decision,
      arms: Object.freeze(arms),
    }));
  }

  // ── content digest ───────────────────────────────────────────────────────
  const { digest: declared = null, ...unsigned } = raw as Record<string, unknown> & { digest?: string };
  const digest = `sha256:${createHash("sha256").update(canonicalJson(unsigned), "utf8").digest("hex")}`;
  if (declared !== null && declared !== digest) {
    emit(GATE_V3_REGISTRY_CODES.REGISTRY_005, `computed ${digest}`);
  }

  if (diagnostics.length > 0) return fail();

  return {
    registry: Object.freeze({ version: "1.0.0", digest, types, components }),
    diagnostics: Object.freeze([]),
  };
}

/** Deterministic JSON with sorted keys — the digest must not depend on key order. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
