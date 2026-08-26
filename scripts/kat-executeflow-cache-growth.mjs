// =============================================================================
// KAT — does the REAL executeFlow() path grow the execution-graph cache without
// bound?
//
// WHY THIS EXISTS. The first KAT called `storeGraph()` directly, reproducing the
// interpreter's keying by hand. That proves the key space is unbounded, and it
// proves it about MY RECONSTRUCTION of the code path — not about the path. A probe
// that rebuilds the thing it is testing can only ever confirm the author's reading.
//
// This one calls `executeFlow()`, the exported production entry point
// (interpreter.ts:3820, 11 production call sites), and observes the cache through
// `getGraphCacheStats()`. Nothing about the keying is reimplemented here.
//
// THE PAIRED CONTROL IS THE TEST. One variable: whether the SOURCE changes.
//   varying source, N executions   -> entries must grow ~N   (unbounded key space)
//   identical source, N executions -> entries must stay ~1   (a real cache)
// If the identical arm also grows, the finding is different and worse (unstable key).
// If the varying arm does not grow, there is no leak on this path and this file says so.
// =============================================================================
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
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
const G = await import(pathToFileURL(DIST + "execution-graph.js").href);

for (const [n, mod] of [["parseProgram", M], ["executeFlow", M], ["getGraphCacheStats", G]]) {
  if (typeof mod[n] !== "function") {
    console.error(`DENY: missing instrument '${n}'. A probe that cannot observe its subject must not`);
    console.error(`      report a clean result — that would be "I could not look", printed as "nothing wrong".`);
    process.exit(2);
  }
}
const { parseProgram, executeFlow } = M;
const { getGraphCacheStats } = G;

const src = (i) => `@version 1
pure flow probe(x: Int) -> Int
contract { intent { "executeFlow cache-growth probe, variant ${i}" } }
{ return x + ${i} }`;

const N = 20;

async function arm(label, textFor) {
  const before = getGraphCacheStats().memoryEntries;
  let executed = 0, failed = 0;
  for (let i = 0; i < N; i++) {
    const p = parseProgram(textFor(i), "kat-executeflow.fungi");
    if (p.diagnostics.some((d) => d.severity === "error")) { failed++; continue; }
    try {
      await executeFlow("probe", new Map([["x", { __tag: "int", value: 1 }]]), p.ast, p.flows);
      executed++;
    } catch { failed++; }
  }
  const after = getGraphCacheStats().memoryEntries;
  return { label, before, after, added: after - before, executed, failed };
}

console.log("== KAT: execution-graph cache growth through the REAL executeFlow() path ==\n");
const varying = await arm("VARYING source", (i) => src(i));
const identical = await arm("IDENTICAL source", () => src(0));

for (const r of [varying, identical]) {
  console.log(`  ${r.label.padEnd(18)} entries ${String(r.before).padStart(4)} -> ${String(r.after).padStart(4)}` +
              `   added ${String(r.added).padStart(3)}   executed ${r.executed}/${N}${r.failed ? "  failed " + r.failed : ""}`);
}

console.log("\n== adjudication ==");
// A dead harness is the first thing to rule out: if executeFlow never ran, both arms
// report zero growth and the file would "prove" there is no leak.
if (varying.executed === 0 || identical.executed === 0) {
  console.log(`  ** DEAD HARNESS: executeFlow completed ${varying.executed}/${identical.executed} times.`);
  console.log("  Zero growth from zero executions adjudicates NOTHING.");
  process.exit(2);
}
console.log(`  CONTROL - executeFlow actually ran: ${varying.executed}/${N} and ${identical.executed}/${N}`);

const ctlOk = identical.added <= 1;
console.log(`  CONTROL - identical source adds at most one entry: ${ctlOk}` +
  (ctlOk ? "   (the key is stable; this is a real cache)" : `   ** added ${identical.added} - the key is UNSTABLE, a worse defect`));
if (!ctlOk) { console.log("\n  VERDICT: FAIL - the key is unstable for identical input, which is worse than unbounded growth."); process.exit(1); }

// ---------------------------------------------------------------------------
// ★ THIS FILE CHANGED ROLE WHEN THE DEFECT WAS FIXED.
//
// It was written red-first, to PROVE the key space is unbounded through the real
// path — and it did (20 executions -> 20 permanent entries). That defect is now
// fixed: the cache is bounded (commit e99f0ddd).
//
// The key space is STILL unbounded — that is a property of content-hash keying and
// it is correct. What changed is that the CONTAINER is now bounded. So a file that
// exits non-zero on "distinct sources produce distinct entries" would be
// permanently red in CI while describing healthy behaviour, and a permanently-red
// gate is one everybody learns to ignore.
//
// It now asserts the INVARIANT that must hold forever:
//   1. distinct sources still cache distinctly     (the cache still works)
//   2. entries never exceed the configured ceiling (the bound is real)
// ---------------------------------------------------------------------------
const stats = getGraphCacheStats();
const caches = varying.added >= varying.executed - 1;
const bounded = stats.entries <= stats.maxEntries;

console.log(`\n  1. distinct sources cache distinctly : ${caches}   (${varying.added} entries for ${varying.executed} executions)`);
console.log(`  2. entries within the ceiling        : ${bounded}   (${stats.entries} / ${stats.maxEntries})`);
console.log(`     evictions ${stats.evictions} · refused-oversize ${stats.refusedOversize} · weight ${stats.weight}/${stats.maxWeight} · enabled ${stats.enabled}`);

if (!caches) {
  console.log("\n  VERDICT: FAIL - executeFlow no longer reaches the cache. Either the keying moved or the\n"
    + "  fast path changed; this probe is now measuring nothing and must be re-pointed before it is\n"
    + "  trusted again.");
  process.exit(1);
}
if (!bounded) {
  console.log("\n  VERDICT: FAIL - the cache exceeded its own ceiling. The bound is not being enforced.");
  process.exit(1);
}
console.log("\n  VERDICT: PASS - the cache is live through the production path AND bounded.\n"
  + "  Historical note: this file exited 1 by design until commit e99f0ddd, when it proved\n"
  + "  20 executions -> 20 permanent entries with an identical-source control adding none.");
process.exit(0);
