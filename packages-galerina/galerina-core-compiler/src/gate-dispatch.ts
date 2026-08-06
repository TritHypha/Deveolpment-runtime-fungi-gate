// =============================================================================
// `.gate` file dispatch — Round-one G1 step 6
//
// Description: decides which `.gate` frontend handles a source file, and
//   carries the production-signing block forward. Implements the dispatch rule
//   frozen in the KTA (22-g0-boundary-freeze.md §1).
// Version / change-control: G1 step 6.
// Pointers: gate-v3-parser.ts / gate-v3-verify.ts (the v3 frontend);
//   gate-parser.ts (the v1 frontend — DORMANT, kept intact per hard
//   constraint 1); FUNGI_GATELANG_002 (the production block, constraint 3).
//
// THE RULE (fail-closed, one parser tried — never both):
//   line 1 === "@gate 3.0.0"  -> v3 parser + structural verifier
//   anything else             -> REFUSE (GATE-PARSE-002), zero circuit
//
//   A v1 `@version` file is refused WITH A MIGRATION POINTER rather than
//   quietly routed to the dormant v1 parser: Ruling A is one parser, and
//   unknown never resolves to allow. There is deliberately NO fallback — a
//   dispatcher that tries v3, fails, then tries v1 is the "old tool eats new
//   format" trap.
//
// CONSTRAINT 3: parsing success does NOT unlock signing. Every admitted v3
//   file still carries FUNGI-GATELANG-002 (error severity), so the existing
//   signing gate withholds the `.lmanifest`. The block is re-homed here, not
//   downgraded, and it is removed only when the named privacy backstop lands.
// =============================================================================

import type { ParseDiagnostic } from "./parser.js";
import { FUNGI_GATELANG_002 } from "./gate-parser.js";
import { parseGateV3, GATE_V3_VERSION, type GateV3Circuit } from "./gate-v3-parser.js";
import { verifyGateV3Structure } from "./gate-v3-verify.js";

/** Which frontend handled the file. `refused` means no frontend admitted it. */
export type GateDialect = "gate-v3" | "refused";

/** Dispatch outcome as a DISCRIMINATED UNION - no null in this API. */
export type GateDispatchResult =
  | { readonly dialect: "gate-v3"; readonly exactVersion: string; readonly circuit: GateV3Circuit; readonly diagnostics: readonly ParseDiagnostic[] }
  | { readonly dialect: "refused"; readonly diagnostics: readonly ParseDiagnostic[] };

/**
 * Dispatch a `.gate` source to its frontend.
 *
 * Keys on the literal first line. A v3 file is parsed and structurally
 * verified, and always receives the production-signing block. Anything else is
 * refused fail-closed with zero circuit — including sources the dormant v1
 * parser would accept, which are refused with a migration pointer.
 *
 * @param source raw file text
 * @param file source path, for diagnostics
 */
export function dispatchGateSource(source: string, file: string): GateDispatchResult {
  const parsed = parseGateV3(source, file);

  if (!parsed.ok) {
    // Sharpen the refusal when the file is a recognisable older dialect, so an
    // author is told what to do rather than merely that it failed.
    const firstLine = source.replace(/\r\n?/g, "\n").split("\n", 1)[0] ?? "";
    const legacy = firstLine.startsWith("@version")
      ? " — `@version` is the retired v1 `.gate` dialect; v3 files begin `@gate 3.0.0`"
      : /^\s*GATE\s+/.test(firstLine)
        ? " — `GATE name(...)` is the retired v2 dialect; v3 files begin `@gate 3.0.0` and declare `CIRCUIT`"
        : "";

    const diagnostics = parsed.diagnostics.map((d) => (legacy ? { ...d, message: `${d.message}${legacy}` } : d));
    return { dialect: "refused", diagnostics };
  }

  const circuit = parsed.circuit;
  const structural = verifyGateV3Structure(circuit);

  // Constraint 3 — re-homed, never downgraded. The lowering may be produced and
  // inspected; SIGNING stays withheld until the privacy backstop is wired.
  const productionBlock: ParseDiagnostic = {
    ...FUNGI_GATELANG_002,
    message:
      `${file}: .gate v3 parsed — circuit '${circuit.name}', ${circuit.parts.length} part(s), ` +
      `${circuit.wires.length} wire(s). ${FUNGI_GATELANG_002.message}`,
    location: circuit.location,
  };

  return {
    dialect: "gate-v3",
    exactVersion: GATE_V3_VERSION,
    circuit,
    diagnostics: Object.freeze([...structural, productionBlock]),
  };
}
