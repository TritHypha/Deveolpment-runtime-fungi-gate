// =============================================================================
// `.gate` v3 front-end parser — Round-one G1 (NEW, separate from gate-parser.ts)
//
// Description: parses the v3 `.gate` circuit dialect (`@gate 3.0.0`, named-port
//   ASCII circuits) into an immutable, span-bearing AST. It is DISTINCT from the
//   v1 `gate-parser.ts` (`@version 1.0.0`) — Ruling A: one v3 parser; the v1
//   parser and its tests stay intact but dormant (hard constraint 1).
// Version / change-control: G1 step 1 — literal-header recognition + closed
//   version set. Full section parse with exact spans lands in step 2.
// Pointers: ZT-Galerina-GRAPH-ASCII-v3 reference parser (src/parser.mjs);
//   KTA 22-g0-boundary-freeze.md (dispatch rule); 12-round-one-plan.md (G1);
//   PROPOSED-INTERFACES.md §2 (ParsedGateV3 shape).
//
// FAIL-CLOSED: an unrecognised header returns ok=false with GATE-PARSE-002 and
//   no circuit. There is no best-effort parse (the "old tool eats new format"
//   trap); the dispatcher tries ONE parser, never both.
// =============================================================================

import type { ParseDiagnostic, SourceLocation } from "./parser.js";

/** The exact v3 version and its literal first-line header. */
export const GATE_V3_VERSION = "3.0.0";
const GATE_V3_HEADER = `@gate ${GATE_V3_VERSION}`;

/**
 * GATE-PARSE-002: the first line is not exactly the v3 version header.
 * Fail-closed: v1 `@version`, v2 glyph headers, leading blanks, extra spacing,
 * and any other first line are refused here — unknown ⇒ deny.
 */
export const GATE_PARSE_002 = {
  code: "GATE-PARSE-002",
  name: "GATE_V3_BAD_VERSION_HEADER",
  severity: "error" as const,
  message: `the first line must be exactly '${GATE_V3_HEADER}'`,
} as const;

/**
 * Result of a v3 parse. `ok` is the fail-closed admission flag: false means the
 * source is not an admissible v3 `.gate` file and `circuit` is absent. The
 * circuit AST (with exact spans) is populated from G1 step 2 onward.
 */
export interface ParsedGateV3 {
  readonly ok: boolean;
  readonly exactVersion: string | null;
  readonly diagnostics: readonly ParseDiagnostic[];
}

/**
 * Parse a v3 `.gate` source.
 *
 * Contract (G1 step 1): recognise the literal header `@gate 3.0.0` as the exact
 * first line. CR immediately before LF is normalised away first (LF is
 * canonical). Any other first line returns a fail-closed GATE-PARSE-002 refusal
 * carrying a line:column location, and no circuit.
 *
 * @param source the raw `.gate` file text
 * @param file the source path, for diagnostics
 */
export function parseGateV3(source: string, file: string): ParsedGateV3 {
  // Normalise CRLF/CR to LF before any inspection so identity and the header
  // check are line-ending independent (a CRLF checkout parses identically).
  const firstLine = source.replace(/\r\n?/g, "\n").split("\n", 1)[0] ?? "";

  if (firstLine !== GATE_V3_HEADER) {
    const location: SourceLocation = { file, line: 1, column: 1 };
    return {
      ok: false,
      exactVersion: null,
      diagnostics: [{ ...GATE_PARSE_002, location }],
    };
  }

  // Header admitted. Section parse (INTENT/REQUIRES/PARTS/WIRES/END) with exact
  // spans is G1 step 2; step 1 establishes only the admission boundary.
  return { ok: true, exactVersion: GATE_V3_VERSION, diagnostics: [] };
}
