// =============================================================================
// `.gate` v3 front-end parser — Round-one G1 (NEW, separate from gate-parser.ts)
//
// Description: parses the v3 `.gate` circuit dialect (`@gate 3.0.0`, named-port
//   ASCII circuits) into an immutable, span-bearing AST. It is DISTINCT from the
//   v1 `gate-parser.ts` (`@version 1.0.0`) — Ruling A: one v3 parser; the v1
//   parser and its tests stay intact but dormant (hard constraint 1).
// Version / change-control: G1 steps 1-2 — literal header + closed version set,
//   full section parse (CIRCUIT/INTENT/REQUIRES/PARTS/WIRES/END) with EXACT
//   SPANS (line AND column, start AND end) on every node. Registry resolution,
//   graph verification and GIR lowering are later named rounds (G2+).
// Pointers: ZT-Galerina-GRAPH-ASCII-v3 reference parser (src/parser.mjs) and
//   grammar/gate-v3.ebnf; KTA 22-g0-boundary-freeze.md (dispatch rule);
//   12-round-one-plan.md (G1 ladder); PROPOSED-INTERFACES.md §2.
//
// WHY SPANS: the reference prototype records line-only locations and therefore
//   explicitly does not satisfy the production interface. Exact spans are the
//   G1 deliverable — every identifier, argument, endpoint and terminal keeps its
//   own start/end so downstream tools can make safe non-overlapping edits.
//
// FAIL-CLOSED: an unrecognised header or malformed section returns ok=false with
//   a stable GATE-PARSE-* code and NO circuit. There is no best-effort parse
//   (the "old tool eats new format" trap); the dispatcher tries ONE parser.
// =============================================================================

import type { ParseDiagnostic, SourceLocation } from "./parser.js";

/** The exact v3 version and its literal first-line header. */
export const GATE_V3_VERSION = "3.0.0";
const GATE_V3_HEADER = `@gate ${GATE_V3_VERSION}`;

/**
 * Resource ceilings, adopted verbatim from owner ruling ② (GD-006).
 *
 * These are NOT tuning knobs. A parser with no ceiling is a denial-of-service
 * surface (CWE-400/770), and before these landed a deeply nested set literal
 * escaped as a raw host `RangeError` — through `parseGateV3`, through
 * `dispatchGateSource`, and all the way to the user as a stack trace with no
 * diagnostic code. A refusal must be a diagnostic, never an exception.
 *
 * Every value here was ruled by the owner. `intentLength` is deliberately
 * ABSENT: the ruling bounds file size, nesting, cardinality, identifiers,
 * parts, wires and arguments, and says nothing about INTENT, so INTENT is left
 * bounded only indirectly by `fileBytes` rather than by a number invented here.
 */
export const GATE_V3_LIMITS = Object.freeze({
  setNesting: 6,
  setCardinality: 256,
  identifier: 64,
  argumentsPerPart: 32,
  parts: 4096,
  wires: 8192,
  fileBytes: 512 * 1024,
});

/** Diagnostic definitions. Codes are stable machine identities: wording may
 *  improve, but changing an invariant requires a NEW code. Numbering follows
 *  the reference catalogue (docs/17-DIAGNOSTICS.md) so the two agree. */
const D = {
  P002: { code: "GATE-PARSE-002", name: "GATE_V3_BAD_VERSION_HEADER", message: `the first line must be exactly '${GATE_V3_HEADER}'` },
  P003: { code: "GATE-PARSE-003", name: "GATE_V3_NON_ASCII", message: "semantic source must contain ASCII only" },
  P004: { code: "GATE-PARSE-004", name: "GATE_V3_MISSING_CIRCUIT", message: "missing CIRCUIT declaration" },
  P005: { code: "GATE-PARSE-005", name: "GATE_V3_MALFORMED_CIRCUIT", message: "malformed CIRCUIT declaration" },
  P006: { code: "GATE-PARSE-006", name: "GATE_V3_MISSING_INTENT", message: "expected INTENT followed by one quoted string" },
  P008: { code: "GATE-PARSE-008", name: "GATE_V3_MISSING_REQUIRES", message: "expected 'REQUIRES:'" },
  P009: { code: "GATE-PARSE-009", name: "GATE_V3_MALFORMED_REQUIREMENT", message: "malformed requirement" },
  P010: { code: "GATE-PARSE-010", name: "GATE_V3_MISSING_PARTS", message: "expected 'PARTS:'" },
  P011: { code: "GATE-PARSE-011", name: "GATE_V3_NO_PARTS", message: "a circuit requires at least one PART" },
  P012: { code: "GATE-PARSE-012", name: "GATE_V3_MISSING_WIRES", message: "expected 'WIRES:'" },
  P013: { code: "GATE-PARSE-013", name: "GATE_V3_NO_WIRES", message: "a circuit requires at least one WIRE" },
  P014: { code: "GATE-PARSE-014", name: "GATE_V3_MISSING_END", message: "expected 'END'" },
  P015: { code: "GATE-PARSE-015", name: "GATE_V3_TRAILING_CONTENT", message: "unexpected content after END" },
  P016: { code: "GATE-PARSE-016", name: "GATE_V3_MALFORMED_PARAM", message: "malformed parameter" },
  P018: { code: "GATE-PARSE-018", name: "GATE_V3_MALFORMED_PART", message: "part must be enclosed in '[' and ']'" },
  P019: { code: "GATE-PARSE-019", name: "GATE_V3_INEXACT_COMPONENT", message: "malformed part or non-exact component version" },
  P020: { code: "GATE-PARSE-020", name: "GATE_V3_MALFORMED_ARGUMENT", message: "malformed component argument" },
  P021: { code: "GATE-PARSE-021", name: "GATE_V3_MALFORMED_WIRE", message: "malformed wire" },
  P022: { code: "GATE-PARSE-022", name: "GATE_V3_INVALID_ENDPOINT", message: "invalid endpoint" },
  P025: { code: "GATE-PARSE-025", name: "GATE_V3_INVALID_LITERAL", message: "invalid literal" },

  // ── Resource bounds (GD-006, owner ruling ②) ──────────────────────────────
  // Numbering starts at 028 because the reference implementation's catalogue
  // already claims GATE-PARSE-026 and 027; one invariant must never answer to
  // two codes, and neither must two invariants share one.
  P028: { code: "GATE-PARSE-028", name: "GATE_V3_SET_NESTING_EXCEEDED", message: `set literal nests deeper than ${GATE_V3_LIMITS.setNesting}` },
  P029: { code: "GATE-PARSE-029", name: "GATE_V3_SET_CARDINALITY_EXCEEDED", message: `set literal holds more than ${GATE_V3_LIMITS.setCardinality} elements` },
  P030: { code: "GATE-PARSE-030", name: "GATE_V3_IDENTIFIER_TOO_LONG", message: `identifier is longer than ${GATE_V3_LIMITS.identifier} characters` },
  P031: { code: "GATE-PARSE-031", name: "GATE_V3_TOO_MANY_ARGUMENTS", message: `a part declares more than ${GATE_V3_LIMITS.argumentsPerPart} arguments` },
  P032: { code: "GATE-PARSE-032", name: "GATE_V3_TOO_MANY_PARTS", message: `a circuit declares more than ${GATE_V3_LIMITS.parts} parts` },
  P033: { code: "GATE-PARSE-033", name: "GATE_V3_TOO_MANY_WIRES", message: `a circuit declares more than ${GATE_V3_LIMITS.wires} wires` },
  P034: { code: "GATE-PARSE-034", name: "GATE_V3_FILE_TOO_LARGE", message: `source exceeds ${GATE_V3_LIMITS.fileBytes / 1024} KiB` },
} as const;

/** Public re-export of the header diagnostic (used by the dispatcher + tests). */
export const GATE_PARSE_002 = { ...D.P002, severity: "error" as const } as const;

// ── AST ─────────────────────────────────────────────────────────────────────
// Every node carries a SourceLocation with line/column AND endLine/endColumn.

export interface GateV3Param {
  readonly name: string;
  readonly type: string;
  readonly location: SourceLocation;
}
export interface GateV3Value {
  readonly kind: "string" | "number" | "name" | "reference" | "set";
  readonly value: string | number | readonly GateV3Value[];
  readonly location: SourceLocation;
}
export interface GateV3Argument {
  readonly name: string;
  readonly value: GateV3Value;
  readonly location: SourceLocation;
}
export interface GateV3Part {
  readonly instance: string;
  readonly component: string;
  readonly version: string;
  readonly args: readonly GateV3Argument[];
  readonly location: SourceLocation;
}
export interface GateV3Endpoint {
  readonly text: string;
  readonly node: string;
  readonly port: string;
  readonly location: SourceLocation;
}
export interface GateV3Wire {
  readonly from: GateV3Endpoint;
  readonly to: GateV3Endpoint;
  /**
   * The wire's termination annotation, as a DISCRIMINATED union (improvement
   * G3-1). It was previously `{kind: "budget" | "decreases"; value: string |
   * number}` — a non-discriminated pair whose constructor only ever built the
   * two coherent combinations, so every consumer had to re-narrow it and the
   * type admitted two states the parser cannot produce (`budget` with a string,
   * `decreases` with a number). Discriminating it here makes the impossible
   * states unrepresentable instead of merely unbuilt.
   */
  readonly bound:
    | { readonly kind: "budget"; readonly value: number }
    | { readonly kind: "decreases"; readonly value: string }
    | null;
  readonly location: SourceLocation;
}
export interface GateV3Named {
  readonly name: string;
  readonly location: SourceLocation;
}
export interface GateV3Budget {
  readonly name: string;
  readonly value: number;
  readonly location: SourceLocation;
}
export interface GateV3Requirements {
  readonly capabilities: readonly GateV3Named[];
  readonly effects: readonly GateV3Named[];
  readonly budgets: readonly GateV3Budget[];
}
export interface GateV3Circuit {
  readonly name: string;
  readonly params: readonly GateV3Param[];
  readonly returnType: string;
  readonly intent: string;
  readonly requirements: GateV3Requirements;
  readonly parts: readonly GateV3Part[];
  readonly wires: readonly GateV3Wire[];
  readonly location: SourceLocation;
}
/**
 * The parse outcome as a DISCRIMINATED UNION, never `T | null`.
 *
 * `ok: true` carries a circuit and its exact version; `ok: false` carries only
 * diagnostics. Reading the circuit without checking `ok` is a compile error,
 * not a runtime surprise (the null reference - Hoare's billion-dollar mistake,
 * ALGOL W 1965 - has no place in a fail-closed frontend).
 */
export type ParsedGateV3 =
  | { readonly ok: true; readonly exactVersion: string; readonly circuit: GateV3Circuit; readonly diagnostics: readonly ParseDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly ParseDiagnostic[] };

// ── lexical helpers ─────────────────────────────────────────────────────────

const IDENT = "[A-Za-z_][A-Za-z0-9_]*";
const QNAME = `${IDENT}(?:\\.${IDENT})*`;
const SEMVER = "[0-9]+\\.[0-9]+\\.[0-9]+";
const ENDPOINT_RE = new RegExp(`^(${IDENT})\\.(${IDENT})$`);

interface Line {
  readonly text: string;   // trimmed content
  readonly raw: string;    // the original line
  readonly line: number;   // 1-based
  readonly indent: number; // count of leading whitespace chars
}

/** Build a SourceLocation for a [start,end) column range on one line.
 *  Columns are 1-based and end-exclusive-as-endColumn (the column of the last
 *  character), matching the compiler's SourceLocation contract. */
function span(file: string, line: number, startCol: number, endCol: number): SourceLocation {
  return { file, line, column: startCol, endLine: line, endColumn: endCol };
}

/** Locate `needle` inside a raw line and return its 1-based column span.
 *  `from` lets callers scan past an earlier occurrence (e.g. repeated names). */
function locate(raw: string, needle: string, file: string, line: number, from = 0): SourceLocation {
  const index = raw.indexOf(needle, from);
  const startCol = (index >= 0 ? index : 0) + 1;
  return span(file, line, startCol, startCol + Math.max(needle.length - 1, 0));
}

// ── parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a v3 `.gate` source into an immutable, span-bearing AST.
 *
 * Contract: the first line must be exactly `@gate 3.0.0` (CR before LF is
 * normalised first). Sections must appear in order CIRCUIT → INTENT →
 * REQUIRES: → PARTS: → WIRES: → END with at least one part and one wire.
 * Comments (`#`) and blank lines are permitted only between the version line
 * and CIRCUIT (Ruling B — "the edges are the truth"); the body carries none.
 * Any violation returns ok=false with a stable GATE-PARSE-* code and no
 * circuit — fail-closed, never a partial parse.
 *
 * @param source raw `.gate` text
 * @param file source path, for diagnostics and spans
 */
export function parseGateV3(source: string, file: string): ParsedGateV3 {
  const refuse = (def: { code: string; name: string; message: string }, line: number, column = 1, endColumn?: number): ParsedGateV3 => ({
    ok: false,
    diagnostics: [{
      code: def.code,
      name: def.name,
      severity: "error",
      message: `${file}: ${def.message}`,
      location: span(file, line, column, endColumn ?? column),
    }],
  });

  // Size is checked FIRST, before normalisation copies the whole source and
  // before it is split into lines — a ceiling enforced after the allocation it
  // exists to prevent is not a ceiling.
  //
  // `source.length` counts UTF-16 units, not bytes. For every source this
  // parser can ADMIT that is the same number, because non-ASCII is refused
  // outright a few lines below (P003). A non-ASCII source whose byte length
  // exceeds the bound while its unit count does not is therefore still refused
  // — by P003 rather than P034. Counting units keeps this check allocation-free,
  // which is the point of doing it first.
  if (source.length > GATE_V3_LIMITS.fileBytes) return refuse(D.P034, 1);

  const normalised = source.replace(/\r\n?/g, "\n");
  const rawLines = normalised.split("\n");

  if (rawLines[0] !== GATE_V3_HEADER) return refuse(D.P002, 1);

  // Non-ASCII anywhere is refused (the homoglyph class is closed structurally).
  const nonAscii = /[^\x00-\x7F]/.exec(normalised);
  if (nonAscii) {
    const before = normalised.slice(0, nonAscii.index).split("\n");
    return refuse(D.P003, before.length, before[before.length - 1]!.length + 1);
  }

  // Significant lines: everything after the version line that is neither blank
  // nor a comment. (Body comments are a Ruling-B refusal in a later step; for
  // now they are skipped exactly as the reference does, so behaviour matches.)
  const lines: Line[] = [];
  for (let index = 1; index < rawLines.length; index += 1) {
    const raw = rawLines[index]!;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    lines.push({ text: trimmed, raw, line: index + 1, indent: raw.length - raw.trimStart().length });
  }

  let cursor = 0;
  const current = (): Line | undefined => lines[cursor];
  const consume = (): Line | undefined => lines[cursor++];

  // ── CIRCUIT ───────────────────────────────────────────────────────────────
  const header = consume();
  if (!header) return refuse(D.P004, rawLines.length);

  const headerMatch = header.text.match(new RegExp(`^CIRCUIT\\s+(${IDENT})\\s*\\((.*)\\)\\s*->\\s*(.+)$`));
  if (!headerMatch) return refuse(D.P005, header.line, header.indent + 1, header.raw.length);

  const circuitName = headerMatch[1]!;
  const paramText = headerMatch[2]!;
  const returnType = headerMatch[3]!.trim();

  // Parameter spans: locate each `name` inside the raw header line.
  const params: GateV3Param[] = [];
  if (paramText.trim() !== "") {
    let searchFrom = header.raw.indexOf("(") + 1;
    for (const entry of paramText.split(",")) {
      const match = entry.trim().match(new RegExp(`^(${IDENT})\\s*:\\s*(.+)$`));
      if (!match) return refuse(D.P016, header.line, header.indent + 1, header.raw.length);
      const name = match[1]!;
      const location = locate(header.raw, name, file, header.line, searchFrom);
      searchFrom = (location.column ?? 1) + name.length;
      params.push(Object.freeze({ name, type: match[2]!.trim(), location }));
    }
  }

  const circuitLocation = span(file, header.line, header.indent + 1, header.raw.length);

  // ── INTENT ────────────────────────────────────────────────────────────────
  const intentLine = consume();
  const intentMatch = intentLine?.text.match(/^INTENT\s+("(?:[\x20-\x21\x23-\x5B\x5D-\x7E]|\\["\\nrt])*")$/);
  if (!intentMatch) return refuse(D.P006, intentLine?.line ?? header.line, (intentLine?.indent ?? 0) + 1);
  let intent: string;
  try {
    intent = JSON.parse(intentMatch[1]!) as string;
  } catch {
    return refuse(D.P006, intentLine!.line, intentLine!.indent + 1);
  }

  // ── REQUIRES ──────────────────────────────────────────────────────────────
  const requiresLine = current();
  if (!requiresLine || requiresLine.text !== "REQUIRES:") {
    return refuse(D.P008, requiresLine?.line ?? intentLine!.line, (requiresLine?.indent ?? 0) + 1);
  }
  consume();

  const capabilities: GateV3Named[] = [];
  const effects: GateV3Named[] = [];
  const budgets: GateV3Budget[] = [];
  while (current() && current()!.text !== "PARTS:") {
    const item = consume()!;
    const named = item.text.match(new RegExp(`^(capability|effect)\\s+(${QNAME})$`));
    if (named) {
      const name = named[2]!;
      const entry = Object.freeze({ name, location: locate(item.raw, name, file, item.line) });
      (named[1] === "capability" ? capabilities : effects).push(entry);
      continue;
    }
    const budget = item.text.match(new RegExp(`^budget\\s+(${IDENT})=(-?[0-9]+(?:\\.[0-9]+)?)$`));
    if (budget) {
      const name = budget[1]!;
      budgets.push(Object.freeze({
        name,
        value: Number(budget[2]),
        location: locate(item.raw, name, file, item.line),
      }));
      continue;
    }
    return refuse(D.P009, item.line, item.indent + 1, item.raw.length);
  }

  // ── PARTS ─────────────────────────────────────────────────────────────────
  const partsLine = current();
  if (!partsLine || partsLine.text !== "PARTS:") {
    return refuse(D.P010, partsLine?.line ?? requiresLine.line, (partsLine?.indent ?? 0) + 1);
  }
  consume();

  const parts: GateV3Part[] = [];
  while (current() && current()!.text !== "WIRES:") {
    const item = consume()!;
    if (!item.text.startsWith("[") || !item.text.endsWith("]")) {
      return refuse(D.P018, item.line, item.indent + 1, item.raw.length);
    }
    const body = item.text.slice(1, -1).trim();
    const match = body.match(new RegExp(`^(${IDENT})\\s*::\\s*(${QNAME})@(${SEMVER})(?:\\s+(.+))?$`));
    if (!match) return refuse(D.P019, item.line, item.indent + 1, item.raw.length);

    const instance = match[1]!;
    if (instance.length > GATE_V3_LIMITS.identifier) {
      return refuse(D.P030, item.line, item.indent + 1, item.raw.length);
    }
    const args: GateV3Argument[] = [];
    if (match[4]) {
      let searchFrom = 0;
      const tokens = splitArguments(match[4]!);
      if (tokens.length > GATE_V3_LIMITS.argumentsPerPart) {
        return refuse(D.P031, item.line, item.indent + 1, item.raw.length);
      }
      for (const token of tokens) {
        const arg = token.match(new RegExp(`^(${IDENT})=(.+)$`));
        if (!arg) return refuse(D.P020, item.line, item.indent + 1, item.raw.length);
        const argName = arg[1]!;
        if (argName.length > GATE_V3_LIMITS.identifier) {
          return refuse(D.P030, item.line, item.indent + 1, item.raw.length);
        }
        const argLocation = locate(item.raw, argName, file, item.line, searchFrom);
        searchFrom = (argLocation.column ?? 1) + argName.length;

        // Bound the literal BEFORE parsing it — parseValue recurses per set
        // element, so measuring afterwards would mean the overflow already
        // happened. This is the guard that turns a host RangeError into a
        // diagnostic.
        const shape = measureSetShape(arg[2]!);
        if (shape.depth > GATE_V3_LIMITS.setNesting) {
          return refuse(D.P028, item.line, item.indent + 1, item.raw.length);
        }
        if (shape.cardinality > GATE_V3_LIMITS.setCardinality) {
          return refuse(D.P029, item.line, item.indent + 1, item.raw.length);
        }

        const value = parseValue(arg[2]!, item, file);
        if (!value) return refuse(D.P025, item.line, item.indent + 1, item.raw.length);
        args.push(Object.freeze({ name: argName, value, location: argLocation }));
      }
    }
    if (parts.length >= GATE_V3_LIMITS.parts) {
      return refuse(D.P032, item.line, item.indent + 1, item.raw.length);
    }
    parts.push(Object.freeze({
      instance,
      component: match[2]!,
      version: match[3]!,
      args: Object.freeze(args),
      location: locate(item.raw, instance, file, item.line),
    }));
  }
  if (parts.length === 0) return refuse(D.P011, current()?.line ?? partsLine.line);

  // ── WIRES ─────────────────────────────────────────────────────────────────
  const wiresLine = current();
  if (!wiresLine || wiresLine.text !== "WIRES:") {
    return refuse(D.P012, wiresLine?.line ?? partsLine.line, (wiresLine?.indent ?? 0) + 1);
  }
  consume();

  const wires: GateV3Wire[] = [];
  while (current() && current()!.text !== "END") {
    const item = consume()!;
    const match = item.text.match(/^(\S+)\s*->\s*(\S+)(?:\s+(budget=([1-9][0-9]*)|decreases=([A-Za-z_][A-Za-z0-9_]*)))?$/);
    if (!match) return refuse(D.P021, item.line, item.indent + 1, item.raw.length);

    const from = parseEndpoint(match[1]!, item, file, 0);
    if (!from) return refuse(D.P022, item.line, item.indent + 1, item.raw.length);
    const to = parseEndpoint(match[2]!, item, file, (from.location.endColumn ?? 1));
    if (!to) return refuse(D.P022, item.line, item.indent + 1, item.raw.length);

    const bound = match[3]
      ? Object.freeze(match[4]
        ? { kind: "budget" as const, value: Number(match[4]) }
        : { kind: "decreases" as const, value: match[5]! })
      : null;

    if (wires.length >= GATE_V3_LIMITS.wires) {
      return refuse(D.P033, item.line, item.indent + 1, item.raw.length);
    }
    wires.push(Object.freeze({
      from,
      to,
      bound,
      location: span(file, item.line, item.indent + 1, item.raw.length),
    }));
  }
  if (wires.length === 0) return refuse(D.P013, current()?.line ?? wiresLine.line);

  // ── END ───────────────────────────────────────────────────────────────────
  const endLine = current();
  if (!endLine || endLine.text !== "END") return refuse(D.P014, endLine?.line ?? wiresLine.line);
  consume();
  if (current()) return refuse(D.P015, current()!.line, current()!.indent + 1);

  const circuit: GateV3Circuit = Object.freeze({
    name: circuitName,
    params: Object.freeze(params),
    returnType,
    intent,
    requirements: Object.freeze({
      capabilities: Object.freeze(capabilities),
      effects: Object.freeze(effects),
      budgets: Object.freeze(budgets),
    }),
    parts: Object.freeze(parts),
    wires: Object.freeze(wires),
    location: circuitLocation,
  });

  return Object.freeze({ ok: true, exactVersion: GATE_V3_VERSION, circuit, diagnostics: Object.freeze([]) });
}

// ── canonical formatter ─────────────────────────────────────────────────────

/**
 * ASCII code-unit comparator — the ONLY ordering used for canonical output.
 *
 * WHY NOT localeCompare: default-locale collation is machine-dependent —
 * "A" vs "a" orders +1 under `en` and -1 under `da`, so a locale-sorted
 * canonical form (and therefore any fingerprint over it) differs between
 * machines. Code-unit ordering is stable everywhere. (Reference-prototype
 * defect; deliberately not inherited.)
 */
function byCodeUnit(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Canonical numeric text. Every spelling of a value collapses to one form, so
 * one logical number has one canonical identity: `-0`, `0.0`, `-0.0` and `0`
 * all render as `0`. (The reference admits all four and yields four distinct
 * fingerprints for one logical trit zero — deliberately not inherited.)
 */
function canonicalNumber(value: number): string {
  const normalised = value === 0 ? 0 : value; // collapses -0 to 0
  return Number.isInteger(normalised) ? String(normalised) : String(normalised);
}

/** Render one argument value in canonical form. Sets are sorted by code unit. */
function formatValue(value: GateV3Value): string {
  switch (value.kind) {
    case "string":
      return JSON.stringify(value.value as string);
    case "number":
      return canonicalNumber(value.value as number);
    case "reference":
      return `$${value.value as string}`;
    case "name":
      return value.value as string;
    case "set": {
      const items = (value.value as readonly GateV3Value[]).map(formatValue).sort(byCodeUnit);
      return `{${items.join(",")}}`;
    }
  }
}

/**
 * Render a circuit in canonical form.
 *
 * Guarantees: deterministic across machines (code-unit ordering only), NO
 * interior blank lines (Ruling B — the body carries edges, nothing else),
 * canonical numeric forms, and `parse(format(x))` identity. The output is the
 * form any digest/fingerprint must be taken over.
 *
 * @param circuit a frozen AST from {@link parseGateV3}
 */
export function formatGateV3(circuit: GateV3Circuit): string {
  const lines: string[] = [GATE_V3_HEADER];

  const params = circuit.params.map((p) => `${p.name}: ${p.type}`).join(", ");
  lines.push(`CIRCUIT ${circuit.name}(${params}) -> ${circuit.returnType}`);
  lines.push(`  INTENT ${JSON.stringify(circuit.intent)}`);

  lines.push("  REQUIRES:");
  for (const item of [...circuit.requirements.capabilities].sort((a, b) => byCodeUnit(a.name, b.name))) {
    lines.push(`    capability ${item.name}`);
  }
  for (const item of [...circuit.requirements.effects].sort((a, b) => byCodeUnit(a.name, b.name))) {
    lines.push(`    effect ${item.name}`);
  }
  for (const item of [...circuit.requirements.budgets].sort((a, b) => byCodeUnit(a.name, b.name))) {
    lines.push(`    budget ${item.name}=${canonicalNumber(item.value)}`);
  }

  lines.push("  PARTS:");
  for (const part of [...circuit.parts].sort((a, b) => byCodeUnit(a.instance, b.instance))) {
    const args = [...part.args]
      .sort((a, b) => byCodeUnit(a.name, b.name))
      .map((a) => `${a.name}=${formatValue(a.value)}`)
      .join(" ");
    lines.push(`    [${part.instance} :: ${part.component}@${part.version}${args ? ` ${args}` : ""}]`);
  }

  lines.push("  WIRES:");
  const wires = [...circuit.wires].sort((a, b) =>
    byCodeUnit(a.from.text, b.from.text) || byCodeUnit(a.to.text, b.to.text));
  for (const wire of wires) {
    const bound = wire.bound ? ` ${wire.bound.kind}=${wire.bound.value}` : "";
    lines.push(`    ${wire.from.text} -> ${wire.to.text}${bound}`);
  }

  lines.push("END", "");
  return lines.join("\n");
}

/** Split a part's argument text on whitespace that is not inside a quoted
 *  string or a `{set}` — so `fields={a,b} mode="x y"` stays two arguments. */
function splitArguments(text: string): string[] {
  const result: string[] = [];
  let start: number | null = null;
  let braces = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index <= text.length; index += 1) {
    const char = text[index] ?? " ";
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{") braces += 1;
    else if (char === "}") braces -= 1;
    const boundary = /\s/.test(char) && !quoted && braces === 0;
    if (start === null && !/\s/.test(char)) start = index;
    if (boundary && start !== null) {
      result.push(text.slice(start, index));
      start = null;
    }
  }
  return result;
}

/**
 * Measure a raw argument's set structure WITHOUT parsing it.
 *
 * The ceiling has to be applied BEFORE `parseValue` runs, not inside it: that
 * function recurses per set element, so a depth check performed during the
 * recursion has already done the recursing it exists to prevent. This is a flat
 * lexical scan — it cannot overflow the stack on any input — and it is the only
 * thing standing between a hostile literal and a host `RangeError`.
 *
 * Braces inside string literals are not structure, so the scan tracks quoting.
 * Cardinality is the widest single set at any level, not the total element
 * count, because the bound the owner ruled is per set literal.
 */
function measureSetShape(text: string): { depth: number; cardinality: number } {
  let depth = 0;
  let maxDepth = 0;
  let maxCardinality = 0;
  let inString = false;
  let escaped = false;
  // Element count per open set, indexed by depth. A set with no separators
  // still holds one element, so a level starts at 1 and each comma adds one.
  const counts: number[] = [];

  for (const char of text) {
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") {
      depth += 1;
      if (depth > maxDepth) maxDepth = depth;
      counts[depth] = 1;
      continue;
    }
    if (char === "}") {
      if (depth > 0) {
        const count = counts[depth] ?? 0;
        if (count > maxCardinality) maxCardinality = count;
        depth -= 1;
      }
      continue;
    }
    if (char === "," && depth > 0) counts[depth] = (counts[depth] ?? 1) + 1;
  }

  return { depth: maxDepth, cardinality: maxCardinality };
}

/** Parse an argument value with its own span. Returns null on an invalid
 *  literal so the caller can refuse fail-closed. */
function parseValue(text: string, item: Line, file: string): GateV3Value | null {
  const value = text.trim();
  const location = locate(item.raw, value, file, item.line);

  if (value.startsWith('"')) {
    if (!/^"(?:[\x20-\x21\x23-\x5B\x5D-\x7E]|\\["\\nrt])*"$/.test(value)) return null;
    try {
      return Object.freeze({ kind: "string" as const, value: JSON.parse(value) as string, location });
    } catch {
      return null;
    }
  }
  if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Object.freeze({ kind: "number" as const, value: numeric, location });
  }
  if (value.startsWith("$")) {
    if (!new RegExp(`^\\$${IDENT}$`).test(value)) return null;
    return Object.freeze({ kind: "reference" as const, value: value.slice(1), location });
  }
  if (value.startsWith("{") && value.endsWith("}")) {
    const inner = value.slice(1, -1).trim();
    const items: GateV3Value[] = [];
    if (inner !== "") {
      for (const element of inner.split(",")) {
        const parsed = parseValue(element, item, file);
        if (!parsed) return null;
        items.push(parsed);
      }
    }
    return Object.freeze({ kind: "set" as const, value: Object.freeze(items), location });
  }
  if (new RegExp(`^${QNAME}$`).test(value)) {
    return Object.freeze({ kind: "name" as const, value, location });
  }
  return null;
}

/** Parse `node.port` into an endpoint with its exact span, or null. */
function parseEndpoint(text: string, item: Line, file: string, from: number): GateV3Endpoint | null {
  const match = text.match(ENDPOINT_RE);
  if (!match) return null;
  return Object.freeze({
    text,
    node: match[1]!,
    port: match[2]!,
    location: locate(item.raw, text, file, item.line, from),
  });
}
