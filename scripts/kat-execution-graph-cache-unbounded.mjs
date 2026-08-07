// =============================================================================
// KAT — is the execution-graph MEMORY_CACHE unbounded in its KEY SPACE?
//
// CLAIM UNDER TEST. `interpreter.ts:4018-4026` keys the cache by
// `executionGraphCacheKey(flowName, canonicalHash(flowNode))` — a CONTENT hash. So
// every distinct SOURCE VERSION of a flow mints a permanent entry holding an
// ExecutionGraph, and `execution-graph.ts` has no delete, no clear and no size cap.
//
// WHY THIS IS NOT A CRITICISM OF THE HASH. The comment above that line records why
// the content hash exists: keying by flow NAME alone collided two source versions
// of one flow and served the wrong cached graph. That fix is right. It also turned a
// BOUNDED key space (the set of flow names) into an UNBOUNDED one (the set of source
// versions), and nothing was added to bound it. Correct fix, uncosted side effect.
//
// THE PAIRED CONTROL IS THE WHOLE TEST. Growth alone proves nothing — a cache is
// meant to fill. One variable changes between the arms: whether the SOURCE varies.
//
//   VARYING source, N iterations  -> entries must grow ~N   (unbounded key space)
//   IDENTICAL source, N iterations -> entries must stay ~1   (it is a real cache,
//                                      not merely an append-on-call list)
//
// If the identical arm ALSO grows, the finding is different and worse (the key is
// not stable). If the varying arm does NOT grow, there is no leak and this file says
// so. Either way the pair, not the number, carries the verdict.
// =============================================================================
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Self-locating — see the note in subject-galerina-compile.mjs. An absolute path in
// a committed file leaks the machine layout and breaks everywhere else.
function findGalerina() {
  // This file lives in Galerina/scripts/, so the repo root is its parent. Verified
  // rather than assumed: a wrong root would make every path silently miss, and a
  // tool that cannot find its subject must say so, not return an empty result.
  const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const root = dirname(here);
  if (!existsSync(join(root, "packages-galerina"))) {
    throw new Error(`cannot locate the Galerina checkout: no packages-galerina under ${root}`);
  }
  return root.replace(/\\/g, "/") + "/";
}
const GAL = findGalerina();
const DIST = GAL + "packages-galerina/galerina-core-compiler/dist/";
const M = await import(pathToFileURL(DIST + "index.js").href);
// The cache and its stats hook live on the execution-graph module, not the public
// index — `getGraphCacheStats` is exported but has no caller anywhere in the repo.
// ESM caches by URL, so this is the SAME module instance the interpreter uses; a
// second copy would have its own empty Map and would silently prove nothing.
const G = await import(pathToFileURL(DIST + "execution-graph.js").href);

const need = { parseProgram: M, canonicalHash: M, executionGraphCacheKey: G, storeGraph: G, getGraphCacheStats: G };
const missing = Object.entries(need).filter(([n, mod]) => typeof mod[n] !== "function").map(([n]) => n);
if (missing.length) {
  console.error("DENY: the probe cannot reach its own instruments — missing exports: " + missing.join(", "));
  console.error("      Without them a green would mean 'I could not look', not 'nothing is wrong'.");
  process.exit(2);
}
const { parseProgram, canonicalHash } = M;
const { executionGraphCacheKey, storeGraph, getGraphCacheStats: getCacheStats } = G;

const src = (i) => `@version 1
pure flow probe(x: Int) -> Int
contract { intent { "cache key-space probe, variant ${i}" } }
{ return x + ${i} }`;

/** Reproduce EXACTLY the interpreter's keying: flow name + canonical hash of the node. */
function keyFor(text) {
  const p = parseProgram(text, "probe.fungi");
  const flowNode = (p.ast.children ?? []).find((c) => /FlowDecl$/.test(c.kind));
  if (flowNode === undefined) throw new Error("fixture has no flow declaration — the probe is malformed");
  return executionGraphCacheKey("probe", canonicalHash(flowNode));
}

const N = 25;
const stub = { slotCount: 0, slotNames: new Map(), isPure: true, effectMask: 0, nodes: [] };

function arm(label, textFor) {
  const before = getCacheStats().memoryEntries;
  const keys = new Set();
  for (let i = 0; i < N; i++) {
    const k = keyFor(textFor(i));
    keys.add(k);
    storeGraph(k, stub);
  }
  const after = getCacheStats().memoryEntries;
  return { label, before, after, added: after - before, distinctKeys: keys.size };
}

console.log("== KAT: execution-graph cache key space ==\n");
const varying = arm("VARYING source", (i) => src(i));
const identical = arm("IDENTICAL source", () => src(0));

for (const r of [varying, identical]) {
  console.log(`  ${r.label.padEnd(18)} entries ${String(r.before).padStart(4)} -> ${String(r.after).padStart(4)}` +
              `   added ${String(r.added).padStart(3)}   distinct keys ${r.distinctKeys}  (over ${N} iterations)`);
}

console.log("\n== adjudication ==");
const ctlOk = identical.added <= 1;
console.log("  CONTROL — identical source adds at most one entry: " + ctlOk +
  (ctlOk ? "   (it is a real cache, keyed stably)" : "   ** the key is UNSTABLE for identical input — a different and worse defect"));
if (!ctlOk) {
  console.log("\n  VERDICT: UNPROVEN for the unbounded claim; the control failed, so the varying arm is confounded.");
  process.exit(1);
}
const leak = varying.added >= N - 1 && varying.distinctKeys >= N - 1;
console.log("  ★ VARYING source mints a new permanent entry each time: " + leak +
  `   (${varying.added} entries for ${N} source versions)`);
console.log("\n  " + (leak
  ? "VERDICT: PROVEN — the key space is the set of SOURCE VERSIONS, not flow names, and nothing\n"
    + "  evicts. Harmless in a one-shot CLI that exits. MONOTONIC in any process that outlives a\n"
    + "  single compile and sees changing source: watch mode, a REPL, a language server, a hosted\n"
    + "  evaluator. Each edit of a flow permanently retains one more ExecutionGraph.\n"
    + "  Scope stated honestly: this proves KEY-SPACE growth. It does not measure the bytes per\n"
    + "  entry — an ExecutionGraph stub was stored, not a real one."
  : "VERDICT: DISPROVEN — the varying arm did not accumulate; the key space is bounded."));
process.exit(leak ? 1 : 0);
