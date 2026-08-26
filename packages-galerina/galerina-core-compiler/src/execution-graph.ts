// =============================================================================
// Galerina ExecutionGraph — Build-once, Run-many
//
// Instead of recursively walking the AstNode tree on every executeFlow() call,
// compile the flow to a flat ExecNode[] once and cache it.
//
// Benefits:
//   - No recursive function calls per node (20 → 1 array access per op)
//   - Sequential memory layout → CPU prefetcher keeps it in L1 cache
//   - Binding slots (Int16Array indices) replace Map<string,GalerinaValue> lookups
//   - Cache key = flowName + ":" + sourceHash
//   - Process-local only: persisted graphs are not trusted as execution authority
// =============================================================================

import { join, dirname } from "node:path";
import { BoundedCache, cachePolicyFromEnv } from "./bounded-cache.js";
import { fileURLToPath } from "node:url";
import type { AstNode } from "./parser.js";
import type { GalerinaValue } from "./interpreter.js";
import { productArtifactKey, type ProductArtifactContext } from "./product-artifact-identity.js";

export const enum ExecOp {
  LOAD_CONST    = 0,   // dest = constants[imm]
  LOAD_SLOT     = 1,   // dest = slots[imm]
  STORE_SLOT    = 2,   // slots[imm] = src1
  BINOP         = 3,   // dest = dispatch(src1, op, src2)
  UNOP          = 4,   // dest = dispatch(op, src1)
  CALL          = 5,   // dest = call(funcName, args...)
  BRANCH        = 6,   // if (slots[src1] is truthy) jump imm1 else jump imm2
  JUMP          = 7,   // unconditional jump to imm
  RETURN        = 8,   // return slots[src1]
  RETURN_VOID   = 9,   // return void
  EFFECT_CALL   = 10,  // capability-gated call (records effect)
  AUDIT_WRITE   = 11,  // emit audit event
  NOP           = 12,  // no-op (placeholder)
}

export interface ExecNode {
  readonly op:       ExecOp;
  readonly dest:     number;   // destination slot (-1 = no dest)
  readonly src1:     number;   // source slot 1 (-1 = unused)
  readonly src2:     number;   // source slot 2 (-1 = unused)
  readonly imm:      number;   // immediate value / jump target / constant index
  readonly opName:   string;   // operator name for BINOP/UNOP ("+" etc.)
  readonly callName: string;   // function name for CALL/EFFECT_CALL
}

export interface ExecutionGraph {
  readonly flowName:  string;
  readonly qualifier: string;
  readonly nodes:     readonly ExecNode[];
  readonly constants: readonly (string | number | boolean | null)[];
  readonly slotCount: number;
  readonly slotNames: ReadonlyMap<string, number>;  // bindingName → slot index
  readonly isPure:    boolean;
  readonly effectMask: number;
}

// ── Memory cache ──────────────────────────────────────────────────────────────
//
// ★ BOUNDED, and the bounds are MEASURED. This was an unbounded `Map` keyed by
// `executionGraphCacheKey(productContext, flowName, canonicalHash(flowNode))` — a product-bound CONTENT hash — so
// every source version of every flow was retained for the life of the process.
// Harmless in a CLI that exits; monotonic in watch mode, a REPL, a language server
// or any hosted evaluator. Proven twice: by a paired KAT on the key space, and
// end-to-end through `executeFlow()` (20 executions -> 20 permanent entries, with an
// identical-source control adding none).
//
// The keying is CORRECT and stays. The comment at interpreter.ts:4014 records why it
// became a content hash: keying by flow NAME collided two source versions and served
// the wrong graph. That fix widened a bounded key space (flow names) into an
// unbounded one (source versions) without bounding the container — which is the
// general shape worth remembering: **a correctness fix that widens a key space
// silently converts a cache into a leak.**
//
// LIMITS, from `extra-tests/tools/measure-graph-cache-limits.mjs` over all 534
// tracked `.fungi` files (1,456 flows, 1,456 distinct keys):
//
//   maxEntries    2048  — the measured floor is 1,456 distinct keys for ONE
//                         full-corpus compile. A cap below that evicts its own
//                         working set: the rejected `max: 256` would have shed 83%.
//                         2048 clears the floor with ~40% headroom.
//   maxWeight    65536  — total structural weight (object nodes). Measured p50 is 9
//                         and max 163; the whole corpus is ~1.1 MB serialized, so
//                         this is generous by design — it is a backstop against a
//                         pathological distribution, not a working constraint.
//   maxItemWeight  512  — admission ceiling, ~0.8% of the budget, so no single graph
//                         can dominate it. Deliberately set ABOVE the observed max of
//                         163 rather than at p99 (76): refusing 1% of this estate's
//                         own graphs would cost recomputation for no memory benefit,
//                         since those graphs are ~6 KB. It still refuses genuinely
//                         pathological input from outside this corpus.
//
// ⚠ These come from ONE corpus on ONE machine. A host compiling third-party code has
// a different distribution. The number that matters is that the measurement is
// repeatable, not that these constants are universal.
const CACHE_POLICY = cachePolicyFromEnv(process.env["GALERINA_EXECUTION_GRAPH_CACHE"]);
//   maxTombstones 4096  — ★ the ONE number here that is NOT measured, and it is
//                         labelled as such. Eviction never occurs in a one-shot
//                         compile (1,456 keys against a 2,048 ceiling), so the
//                         workload that would pin this is a LONG-LIVED process —
//                         watch mode, a language server — which has not been
//                         profiled. 4096 is 2x the resident ceiling: enough to keep
//                         a useful window of what was forgotten, at ~80 B/key.
//                         `forgottenEntirely` in `stats()` is the instrument that
//                         says whether it is too low; a rising count is the signal
//                         to raise it, and it ships with the change for that reason.
const MEMORY_CACHE = new BoundedCache<string, ExecutionGraph>({
  maxEntries: 2048,
  maxWeight: 65536,
  maxItemWeight: 512,
  // Eviction is otherwise measure-CONTRACTING: dropping an entry destroys the record
  // that the computation ever happened, so "I no longer have this" and "I never knew
  // this" become one observation. Retaining the key and its weight — never the graph —
  // keeps the first distinguishable from the second at ~80 B against the ~544 B median
  // graph. This is the cheap half of the owner's index/warehouse concept: the index
  // remembers, the warehouse does not. Measured in `memory-sandobx/FINDINGS.md`, where
  // the expensive half (bytes to disk) was rejected for this cache — rebuilding a graph
  // costs 9-15 us, below the ~18 us floor for loading and verifying one.
  maxTombstones: 4096,
  weigh: weighGraph,
  enabled: CACHE_POLICY.enabled,
});

/**
 * Structural weight of a graph, in object nodes — the unit the limits are expressed
 * in and the unit `measure-graph-cache-limits.mjs` reports. Cycle-safe and
 * depth-capped: a weigher that can recurse forever would turn a cache write into a
 * hang, and `BoundedCache` treats a throw here as "refuse admission" rather than
 * propagating it.
 */
function weighGraph(g: ExecutionGraph): number {
  let nodes = 0;
  const seen = new Set<unknown>();
  const walk = (o: unknown, depth: number): void => {
    if (o === null || typeof o !== "object" || depth > 40) return;
    if (seen.has(o)) return;
    seen.add(o);
    nodes++;
    if (Array.isArray(o)) { for (const v of o) walk(v, depth + 1); return; }
    if (o instanceof Map) { for (const v of o.values()) walk(v, depth + 1); return; }
    for (const v of Object.values(o as Record<string, unknown>)) walk(v, depth + 1);
  };
  walk(g, 0);
  return nodes;
}

// ── Retired disk-cache authority ──────────────────────────────────────────────
// Current ruling: disk execution authority is retired. This historical location remains named
// only so regression tests can prove that files placed there are ignored. Durable graph reuse
// belongs behind SLIDE's authenticated evidence and independent re-admission boundary.
const DISK_CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "build", ".fungi-cache");

// Exposed for historical-cache refusal and cwd-independence regression locks.
// A test cannot assert this path is cwd-independent without being able to read it, and asserting
// "it is absolute" would NOT catch the bug — resolve("build/…") is absolute and still moves.
export const __diskCacheDirForTest = DISK_CACHE_DIR;

// ── Graph lookup ──────────────────────────────────────────────────────────────

export function getCachedGraph(key: string): ExecutionGraph | null {
  return MEMORY_CACHE.get(key) ?? null;
}

export function getOrLoadGraph(key: string): ExecutionGraph | null {
  return MEMORY_CACHE.get(key) ?? null;
}

/**
 * Offer a graph to the cache.
 *
 * ★ The return type stays `void` and the signature is unchanged, deliberately. An
 * eviction or a refused admission is a PERFORMANCE event and nothing else: the
 * caller already holds the graph and proceeds identically either way. If a caller
 * could observe non-admission and behave differently, the cache would have become
 * part of the trust boundary instead of an optimisation beneath it.
 */
export function storeGraph(key: string, graph: ExecutionGraph): void {
  MEMORY_CACHE.set(key, graph);
}

/** Test-only reset. Production correctness must never depend on this being called. */
export function __resetGraphCacheForTest(): void {
  MEMORY_CACHE.clear();
}

// ── Graph builder ─────────────────────────────────────────────────────────────

/**
 * Build an ExecutionGraph from a flow's AstNode and metadata.
 * This is called ONCE per flow and the result is cached.
 * Subsequent calls execute the graph directly without rebuilding.
 */
export function buildExecutionGraph(
  flowNode: AstNode,
  flowName: string,
  qualifier: string,
  declaredEffects: readonly string[],
  isPure: boolean,
): ExecutionGraph {
  const nodes:     ExecNode[] = [];
  const constants: (string | number | boolean | null)[] = [];
  const slotNames  = new Map<string, number>();
  let slotCount    = 0;
  let constCount   = 0;

  function allocSlot(name: string): number {
    const existing = slotNames.get(name);
    if (existing !== undefined) return existing;
    const idx = slotCount++;
    slotNames.set(name, idx);
    return idx;
  }

  function addConst(val: string | number | boolean | null): number {
    constants.push(val);
    return constCount++;
  }

  function emit(op: ExecOp, dest=-1, src1=-1, src2=-1, imm=0, opName="", callName=""): void {
    nodes.push({ op, dest, src1, src2, imm, opName, callName });
  }

  // Allocate slots for parameters first
  const bodyNode = flowNode.children?.find(c => c.kind === "block");
  const paramNodes = flowNode.children?.filter(c => c.kind === "paramDecl") ?? [];
  for (const p of paramNodes) {
    const name = ((p.value ?? "").split(":")[0] ?? "").replace(/^(unsafe|safe|readonly|mut)\s*/,"").trim();
    if (name) allocSlot(name);
  }

  // Walk body nodes and emit ExecNodes
  function walkNode(node: AstNode): number {
    switch (node.kind) {
      case "numberLiteral": {
        const v = Number(node.value);
        const c = addConst(Number.isInteger(v) ? Math.round(v) : v);
        const d = slotCount++;
        emit(ExecOp.LOAD_CONST, d, -1, -1, c);
        return d;
      }
      case "stringLiteral": {
        const c = addConst(node.value ?? "");
        const d = slotCount++;
        emit(ExecOp.LOAD_CONST, d, -1, -1, c);
        return d;
      }
      case "boolLiteral": {
        const c = addConst(node.value === "true");
        const d = slotCount++;
        emit(ExecOp.LOAD_CONST, d, -1, -1, c);
        return d;
      }
      case "identifier": {
        const name = node.value ?? "";
        const slot = slotNames.get(name);
        if (slot !== undefined) {
          const d = slotCount++;
          emit(ExecOp.LOAD_SLOT, d, slot);
          return d;
        }
        return -1;
      }
      case "letDecl":
      case "mutDecl": {
        const rawName = ((node.value ?? "").split(":")[0] ?? "").replace(/^(unsafe|safe|readonly|mut)\s*/,"").trim();
        const name    = rawName.split(" ").pop() ?? rawName;
        const slot    = allocSlot(name);
        const child   = node.children?.[0];
        const srcSlot = child !== undefined ? walkNode(child) : -1;
        if (srcSlot >= 0) emit(ExecOp.STORE_SLOT, -1, srcSlot, -1, slot);
        return slot;
      }
      case "assignStmt": {
        const name  = ((node.value ?? "").split(":")[0] ?? "").trim();
        const slot  = allocSlot(name);
        const child = node.children?.[0];
        const src   = child !== undefined ? walkNode(child) : -1;
        if (src >= 0) emit(ExecOp.STORE_SLOT, -1, src, -1, slot);
        return slot;
      }
      case "binaryExpr": {
        const op   = node.value ?? "+";
        const l    = node.children?.[0];
        const r    = node.children?.[1];
        const src1 = l !== undefined ? walkNode(l) : -1;
        const src2 = r !== undefined ? walkNode(r) : -1;
        const d    = slotCount++;
        emit(ExecOp.BINOP, d, src1, src2, 0, op);
        return d;
      }
      case "returnStmt": {
        const child = node.children?.[0];
        const src   = child !== undefined ? walkNode(child) : -1;
        if (src >= 0) emit(ExecOp.RETURN, -1, src);
        else          emit(ExecOp.RETURN_VOID);
        return -1;
      }
      default: {
        // Unhandled node kind — emit NOP and return sentinel
        // The executor will fall back to the tree-walker for these
        emit(ExecOp.NOP, -1, -1, -1, 0, "", node.kind);
        return -1;
      }
    }
  }

  // Walk body
  if (bodyNode !== undefined) {
    for (const stmt of bodyNode.children ?? []) {
      walkNode(stmt);
    }
  }

  // Ensure there's a return
  if (nodes.length === 0 || nodes[nodes.length-1]?.op !== ExecOp.RETURN) {
    emit(ExecOp.RETURN_VOID);
  }

  // Suppress unused variable warning — declaredEffects is part of the API
  void declaredEffects;

  return {
    flowName,
    qualifier,
    nodes,
    constants,
    slotCount,
    slotNames,
    isPure,
    effectMask: 0,
  };
}

export function executionGraphCacheKey(
  context: ProductArtifactContext,
  flowName: string,
  sourceHash: string,
): string {
  return `${productArtifactKey(context, sourceHash)}:${flowName}`;
}

/**
 * Did this cache ever hold a graph for `key` — resident OR evicted?
 *
 * The "do I KNOW this?" question, kept separate from `getCachedGraph`'s "do I HAVE
 * it?". Answering it costs no work and returns no graph, which is the whole point:
 * an eviction should lose the bytes, not the fact.
 */
export function graphWasKnown(key: string): boolean {
  return MEMORY_CACHE.knew(key);
}

export function getGraphCacheStats(): ReturnType<BoundedCache<string, ExecutionGraph>["stats"]> & { memoryEntries: number } {
  // ★ `memoryEntries` is retained so the existing determinism tests keep working;
  // the rest of the surface is new and is what a production consumer needs — counts,
  // weights, hits, misses, evictions and refusals. Never a key: these keys are
  // content hashes of source, and a metrics surface reaches a wider audience than the
  // compiler's own callers.
  const s = MEMORY_CACHE.stats();
  return { ...s, memoryEntries: s.entries };
}
