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

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import type { ParseDiagnostic } from "./parser.js";
import { FUNGI_GATELANG_002 } from "./gate-parser.js";
import { parseGateV3, GATE_V3_VERSION, type GateV3Circuit } from "./gate-v3-parser.js";
import { verifyGateV3Structure } from "./gate-v3-verify.js";
import { loadGateV3Registry, type GateV3Registry } from "./gate-v3-registry.js";
import { resolveGateV3, checkGateV3Liveness, type ResolveOptions } from "./gate-v3-resolve.js";
import { buildGateGraph } from "./gate-v3-graph.js";
import { verifyGateGraphAcyclic } from "./gate-v3-condense.js";
import { verifyCutDominatesEgress, verifyTaintCutSeparator } from "./gate-v3-privacy.js";
import { verifyDecisionShapes } from "./gate-v3-authority.js";
import { verifyConstructionEntry } from "./gate-v3-construction.js";
import { verifyBudgetComposition } from "./gate-v3-budget.js";

/** Which frontend handled the file. `refused` means no frontend admitted it. */
export type GateDialect = "gate-v3" | "refused";

/** Dispatch outcome as a DISCRIMINATED UNION - no null in this API. */
export type GateDispatchResult =
  | { readonly dialect: "gate-v3"; readonly exactVersion: string; readonly circuit: GateV3Circuit; readonly diagnostics: readonly ParseDiagnostic[] }
  | { readonly dialect: "refused"; readonly diagnostics: readonly ParseDiagnostic[] };

export interface GateDispatchOptions {
  /**
   * A component registry (as parsed JSON). When supplied, an admitted circuit
   * is additionally RESOLVED against it and checked for liveness — otherwise
   * only structure is verified. A check with no registry establishes shape;
   * it does not establish that any component exists.
   */
  readonly registry?: unknown;
  /** Resolution profile; `strict` (the default) demands a type catalogue. */
  readonly profile?: ResolveOptions["profile"];
}

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
export function dispatchGateSource(source: string, file: string, options: GateDispatchOptions = {}): GateDispatchResult {
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
  const structural = [...verifyGateV3Structure(circuit)];

  // With a registry, the contract becomes the authority: resolve the circuit
  // and check liveness. Without one, only shape is established — a green
  // structural pass says nothing about whether any component exists.
  let resolvedRegistry: GateV3Registry | null = null;
  if (options.registry !== undefined) {
    const loaded = loadGateV3Registry(options.registry, `${file} (registry)`);
    if (!loaded.ok) {
      // A malformed registry refuses the FILE. Resolving against a
      // half-validated registry would produce verdicts nobody can trust.
      structural.push(...loaded.diagnostics);
    } else {
      resolvedRegistry = loaded.registry;
      const resolveOptions: ResolveOptions = options.profile ? { profile: options.profile } : {};
      structural.push(...resolveGateV3(circuit, loaded.registry, resolveOptions));
      structural.push(...checkGateV3Liveness(circuit, loaded.registry));
    }
  }

  // ── Semantic tier (G3) — wired HERE because dispatch is the one choke point
  // both CLIs share; a pass reachable from only one entry point is GD-024
  // again. Acyclicity runs on every admitted circuit (drawing-only fact); the
  // registry-dependent rules run only against a registry that actually
  // LOADED — running them against a refused registry would manufacture
  // verdicts from a contract nobody validated.
  const graph = buildGateGraph(circuit);
  structural.push(...verifyGateGraphAcyclic(graph));
  structural.push(...verifyBudgetComposition(circuit, graph));   // drawing-tier: needs no registry
  if (resolvedRegistry !== null) {
    structural.push(...verifyCutDominatesEgress(graph, resolvedRegistry));
    structural.push(...verifyTaintCutSeparator(graph, resolvedRegistry));
    structural.push(...verifyDecisionShapes(circuit, resolvedRegistry));
    structural.push(...verifyConstructionEntry(circuit, resolvedRegistry));
  }

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

/**
 * Find the component registry governing a `.gate` file: `gate.registry.json`
 * in its directory, or the nearest such file in an ancestor directory.
 *
 * Returns the parsed registry wrapped for the dispatcher, or undefined when
 * none is found (the check then establishes shape only). A registry that
 * exists but cannot be parsed is returned as-is so the dispatcher's loader
 * refuses it with a stable diagnostic — an unreadable registry must never be
 * silently treated as "no registry", which would quietly downgrade the check.
 *
 * Lives beside the dispatcher because BOTH CLI entry points need it — this
 * package's own CLI and the root `galerina.mjs`. GD-024 was precisely the cost
 * of wiring one entry point and not the other, and a second copy of this walk
 * would be a second place for them to drift apart.
 */
export function findGateRegistry(filePath: string): { registry: unknown } | undefined {
  let directory = dirname(resolvePath(filePath));
  for (let depth = 0; depth < 16; depth += 1) {
    const candidate = join(directory, "gate.registry.json");
    if (existsSync(candidate)) {
      try {
        return { registry: JSON.parse(readFileSync(candidate, "utf8")) };
      } catch {
        return { registry: { malformed: true } };  // loader emits the refusal
      }
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return undefined;
}
