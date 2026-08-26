// =============================================================================
// KAT — is the execution-graph cache's BOUND actually enforced?
//
// ---------------------------------------------------------------------------
// HISTORY, because this file changed role and the record should say so.
//
// It was written as `kat-execution-graph-cache-unbounded.mjs`, red-first, to prove
// the ORIGINAL defect: `interpreter.ts` keys the cache by
// `executionGraphCacheKey(productContext, flowName, canonicalHash(flowNode))` — a product-bound CONTENT hash — so
// every distinct SOURCE VERSION of a flow minted a permanent entry, and the module
// had no delete, no clear and no size cap. It proved that (25 source versions -> 25
// permanent entries, identical-source control adding none) and exited 1 by design.
//
// Commit e99f0ddd fixed it by bounding the CONTAINER. It did NOT bound the key
// space, and it should not have: the key space is the set of source versions, and
// content-keying is the right fix for the collision it was introduced to solve.
//
// So the old assertion — "distinct sources mint distinct entries" — is now a
// description of HEALTHY behaviour, and the file exited 1 forever while saying so.
// A permanently-red gate is one everybody learns to ignore. Its sibling
// (`kat-executeflow-cache-growth.mjs`) was re-roled when the fix landed; this file
// was left behind, which is the same defect class it was written to catch: a fix and
// its detector are one unit, and only one of the two detectors was updated.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS NOW — the invariants that must hold forever.
//
//   1. The key space is CONTENT-derived: distinct sources produce distinct keys.
//      (What the file originally proved. Still true, now stated as a property.)
//   2. Identical source is a STABLE key: it adds at most one entry.
//   3. The bound is ENFORCED under pressure: pushed past its own ceiling, the cache
//      stops at the ceiling and evicts.
//
// ★ 3 IS THE AXIS NOTHING ELSE EXERCISES. The sibling KAT runs 20 executions against
// a 2048-entry ceiling, so its `entries <= maxEntries` check has never once seen the
// limit. A green from a check that never approached the boundary is a green for a
// different axis (it shows the cache fills; not that it stops). This file drives past
// the ceiling deliberately so that "bounded" is a measurement rather than an
// assumption.
//
// ★ AND IT REPORTS WHICH CEILING BINDS. The cache has two — maxEntries and maxWeight
// — plus a per-item maxItemWeight. Whichever binds first is the real limit; the other
// is decoration that has never been tested. That was never established.
// =============================================================================
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function findGalerina() {
  // This file lives in Galerina/scripts/, so the repo root is its parent. Verified
  // rather than assumed: a wrong root would make every path silently miss, and a
  // tool that cannot find its subject must say so, not return an empty result.
  const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const root = dirname(here);
  if (!existsSync(join(root, "packages-ts"))) {
    throw new Error(`cannot locate the Galerina checkout: no packages-ts under ${root}`);
  }
  return root.replace(/\\/g, "/") + "/";
}
const DIST = findGalerina() + "packages-ts/galerina-core-compiler/dist/";
const M = await import(pathToFileURL(DIST + "index.js").href);
// ESM caches by URL, so this is the SAME module instance the interpreter uses; a
// second copy would have its own empty cache and would silently prove nothing.
const G = await import(pathToFileURL(DIST + "execution-graph.js").href);
const B = await import(pathToFileURL(DIST + "bounded-cache.js").href);

const need = {
  parseProgram: M, canonicalHash: M,
  executionGraphCacheKey: G, storeGraph: G, getGraphCacheStats: G, __resetGraphCacheForTest: G,
};
const missing = Object.entries(need).filter(([n, mod]) => typeof mod[n] !== "function").map(([n]) => n);
if (missing.length) {
  console.error("DENY: the probe cannot reach its own instruments — missing exports: " + missing.join(", "));
  console.error("      Without them a green would mean 'I could not look', not 'nothing is wrong'.");
  process.exit(2);
}
const { parseProgram, canonicalHash } = M;
const { executionGraphCacheKey, storeGraph, getGraphCacheStats: stats, __resetGraphCacheForTest: reset } = G;
const productContext = M.requireFixedGalerinaProductContext();

const stub = { slotCount: 0, slotNames: new Map(), isPure: true, effectMask: 0, nodes: [] };

// ---------------------------------------------------------------------------
// --self-test — prove the assertions DISCRIMINATE before trusting a green.
// A gate that cannot go red is not a gate. This builds a genuinely bounded
// container and a genuinely unbounded one and shows the predicate separates them.
// ---------------------------------------------------------------------------
if (process.argv.includes("--self-test")) {
  console.log("== self-test: can the bound assertion go RED? ==\n");
  const rows = [];

  const bounded = new B.BoundedCache({ maxEntries: 4, maxWeight: 1024, maxItemWeight: 256, weigh: () => 1 });
  let admitted = 0;
  for (let i = 0; i < 50; i++) { if (bounded.set("k" + i, stub)) admitted++; }
  const bs = bounded.stats();

  // ★ THE FIXTURE ITSELF NEEDS A LIVENESS CHECK. A bounded cache that stored NOTHING
  // also satisfies "entries <= 4" — so without this, a dead fixture would look like a
  // passing control. (It did exactly that on the first run of this file: `weigh` was
  // omitted, nothing was admitted, and the control was silently dead.)
  if (admitted === 0 || bs.entries === 0) {
    console.log(`   ** DEAD FIXTURE: the bounded cache admitted ${admitted} of 50 items and holds ${bs.entries}.`);
    console.log("   A control that stored nothing cannot demonstrate that a bound is enforced.");
    process.exit(2);
  }

  rows.push(["a genuinely BOUNDED cache, 50 items into 4 slots", bs.entries, bs.evictions,
    bs.entries <= 4 && bs.evictions > 0, true]);

  const unbounded = new Map();
  for (let i = 0; i < 50; i++) unbounded.set("k" + i, stub);
  rows.push(["a plain Map (unbounded), 50 items", unbounded.size, 0,
    unbounded.size <= 4 && 0 > 0, false]);

  console.log("   subject                                            entries  evictions  passes?  expected");
  let bad = 0;
  for (const [label, entries, evictions, passes, expected] of rows) {
    const ok = passes === expected;
    if (!ok) bad++;
    console.log(`   ${ok ? " *" : "**"} ${label.padEnd(48)} ${String(entries).padStart(5)} ${String(evictions).padStart(9)}   ${String(passes).padEnd(7)} ${expected}`);
  }
  console.log("\n   " + (bad === 0
    ? "✅ self-test passed — the assertion accepts a bounded container and REJECTS an unbounded one.\n"
    + "   A green from the main run therefore means something."
    : `** self-test FAILED on ${bad} row(s) — the assertion does not discriminate. Do not trust its green.`));
  process.exit(bad === 0 ? 0 : 2);
}

// ---------------------------------------------------------------------------
// 1 · the key space is CONTENT-derived (what this file originally proved)
// ---------------------------------------------------------------------------
console.log("== KAT: is the execution-graph cache's bound enforced? ==\n");
reset();

const src = (i) => `@version 1
pure flow probe(x: Int) -> Int
contract { intent { "cache bound probe, variant ${i}" } }
{ return x + ${i} }`;

function keyFor(text) {
  const p = parseProgram(text, "probe.fungi");
  const flowNode = (p.ast.children ?? []).find((c) => /FlowDecl$/.test(c.kind));
  if (flowNode === undefined) throw new Error("fixture has no flow declaration — the probe is malformed");
  return executionGraphCacheKey(productContext, "probe", canonicalHash(flowNode));
}

const N = 25;
const varyingKeys = new Set();
for (let i = 0; i < N; i++) varyingKeys.add(keyFor(src(i)));
const identicalKeys = new Set();
for (let i = 0; i < N; i++) identicalKeys.add(keyFor(src(0)));

console.log(`  1. distinct sources -> distinct keys : ${varyingKeys.size === N}   (${varyingKeys.size} keys from ${N} sources)`);
console.log(`  2. identical source -> one stable key: ${identicalKeys.size === 1}   (${identicalKeys.size} key from ${N} parses)`);

// ---------------------------------------------------------------------------
// 2 · the bound is ENFORCED under pressure
//
// SCOPE, stated: the keys here are synthetic, not parsed. That is deliberate and it
// is sound — whether the CONTAINER evicts is a property of the container, and
// `storeGraph` is the real production store. Parsing 3000 flows to prove a Map
// eviction would measure the parser. Part 1 above is what covers real keying.
// ---------------------------------------------------------------------------
reset();
const ceiling = stats().maxEntries;
const PRESSURE = Math.floor(ceiling * 1.5);
for (let i = 0; i < PRESSURE; i++) storeGraph(`synthetic:${i}`, stub);
const s = stats();

console.log(`\n  pressure applied: ${PRESSURE} distinct keys into a ${ceiling}-entry ceiling`);
console.log(`  entries ${s.entries}/${s.maxEntries} · weight ${s.weight}/${s.maxWeight} · evictions ${s.evictions} · refused-oversize ${s.refusedOversize}`);

console.log("\n== adjudication ==");
const checks = [
  ["key space is content-derived (distinct sources, distinct keys)", varyingKeys.size === N],
  ["identical source yields ONE stable key", identicalKeys.size === 1],
  ["entries never exceeded the ceiling", s.entries <= s.maxEntries],
  ["weight never exceeded its ceiling", s.weight <= s.maxWeight],
  // THE DISCRIMINATING CONTROL: without this, "entries <= ceiling" could pass simply
  // because the ceiling was never approached — a green for an axis never exercised.
  ["the bound was actually EXERCISED (evictions occurred)", s.evictions > 0],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`  ${ok ? " *" : "**"} ${label}: ${ok}`); if (!ok) failed++; }

// Which ceiling is the real one? Whichever the cache is sitting against.
const atEntries = s.entries >= s.maxEntries;
const atWeight = s.weight >= s.maxWeight * 0.98;
console.log(`\n  ★ which ceiling BINDS first: ${
  atEntries && !atWeight ? "maxEntries (" + s.maxEntries + ") — maxWeight is not the constraint for graphs of this size"
  : atWeight && !atEntries ? "maxWeight (" + s.maxWeight + ") — maxEntries is NEVER reached and is decoration at this item weight"
  : atEntries && atWeight ? "both, together"
  : "NEITHER — the cache did not fill, so this run establishes nothing about the bound"}`);
console.log(`     measured item weight ~${s.entries ? (s.weight / s.entries).toFixed(1) : "n/a"} per entry`);

console.log("\n  " + (failed === 0
  ? "VERDICT: PASS — the bound is enforced, and it was measured against the ceiling rather\n"
  + "  than assumed from a cache that never filled."
  : `VERDICT: FAIL — ${failed} invariant(s) broken. The cache's bound is not doing what it claims.`));
reset();
process.exit(failed === 0 ? 0 : 1);
