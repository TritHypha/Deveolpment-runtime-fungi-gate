#!/usr/bin/env node
// =============================================================================
// measure-graph-cache-limits.mjs — derive the cache limits from the corpus.
//
// WHY THIS EXISTS. The first proposal for bounding MEMORY_CACHE was `max: 256`.
// That number came from nowhere. The owner rejected it, correctly: a limit chosen
// without measurement is a guess that will be quoted as a design decision, and the
// first person to hit it will have no way to tell whether it was reasoned or typed.
//
// So this measures what the estate ACTUALLY produces:
//   - how many DISTINCT execution graphs a full-corpus compile generates
//     -> sets the ENTRY limit
//   - the distribution of structural WEIGHT per graph (nodes, slots)
//     -> sets the WEIGHT limit, which an entry count alone cannot express:
//        256 tiny graphs and 256 enormous ones are the same count and wildly
//        different memory
//   - the largest single graph observed
//     -> sets the ADMISSION ceiling, above which an entry is not cached at all and
//        execution continues by verified recomputation
//
// It writes no limits itself. It reports percentiles and the reasoning inputs; the
// choice of limit is an owner decision informed by these numbers, not a side effect
// of running a script.
// =============================================================================
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

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
const G = await import(pathToFileURL(DIST + "execution-graph.js").href);

const need = ["parseProgram", "canonicalHash"].filter((n) => typeof M[n] !== "function")
  .concat(["buildExecutionGraph", "executionGraphCacheKey"].filter((n) => typeof G[n] !== "function"));
if (need.length) {
  console.error("DENY: missing instruments: " + need.join(", ") + " — a measurement I cannot take must not");
  console.error("      be reported as a measurement of zero.");
  process.exit(2);
}

const files = execFileSync("git", ["-C", GAL, "ls-files", "*.fungi"], { encoding: "utf8", maxBuffer: 64 << 20 })
  .split(/\r?\n/).filter(Boolean);
console.log(`corpus: ${files.length} tracked .fungi files`);
if (files.length === 0) { console.error("DENY: empty corpus — the walker is broken, not the estate"); process.exit(2); }

/** Structural weight: what the cache actually holds on to, counted not guessed. */
function weigh(g) {
  let nodes = 0, slots = 0;
  const seen = new Set();
  (function walk(o, depth) {
    if (o === null || typeof o !== "object" || depth > 40) return;
    if (seen.has(o)) return;
    seen.add(o);
    nodes++;
    if (Array.isArray(o)) { for (const v of o) walk(v, depth + 1); return; }
    if (o instanceof Map) { slots += o.size; for (const v of o.values()) walk(v, depth + 1); return; }
    for (const v of Object.values(o)) walk(v, depth + 1);
  })(g, 0);
  return { nodes, slots, bytes: (() => { try { return JSON.stringify(g, (k, v) => (v instanceof Map ? [...v] : v)).length; } catch { return -1; } })() };
}

/** A governed flow's `value` is the encoded triple; the interpreter keys by the declared name. */
const decodedName = (node) => ((node.value ?? "").startsWith("governed:")
  ? (node.value ?? "").split(":").slice(2).join(":")
  : (node.value ?? ""));

const keys = new Set();
const weights = [];
let flows = 0, built = 0, failed = 0;
for (const rel of files) {
  let src; try { src = readFileSync(GAL + rel, "utf8"); } catch { continue; }
  let p; try { p = M.parseProgram(src, rel); } catch { failed++; continue; }
  for (const node of p.ast.children ?? []) {
    if (!/FlowDecl$/.test(node.kind)) continue;
    flows++;
    // ★ The REAL signature, read from interpreter.ts:4025 rather than guessed:
    //   buildExecutionGraph(flowNode, flowName, qualifier, declaredEffects, isPure)
    // An earlier version called it with TWO arguments. It threw no error and returned
    // an object, so the run reported "1456 built, 0 failures" — a number produced by
    // a call the callee never agreed to. Extra arguments are silently undefined in JS,
    // which is precisely why a wrong-arity call is more dangerous than a failing one.
    const qualifier = node.kind === "pureFlowDecl" ? "pure"
      : node.kind === "guardedFlowDecl" ? "guarded"
      : node.kind === "secureFlowDecl" ? "secure" : "flow";
    const isPure = node.kind === "pureFlowDecl";
    let g;
    try { g = G.buildExecutionGraph(node, decodedName(node), qualifier, [], isPure); } catch { failed++; continue; }
    if (!g) continue;
    built++;
    keys.add(G.executionGraphCacheKey(decodedName(node), M.canonicalHash(node)));
    weights.push(weigh(g));
  }
}

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const nodesArr = weights.map((w) => w.nodes), bytesArr = weights.map((w) => w.bytes).filter((b) => b >= 0);

console.log(`\n== measured over the whole tracked corpus ==`);
console.log(`  flow declarations seen        ${flows}`);
console.log(`  execution graphs built        ${built}    (build failures: ${failed})`);
console.log(`  ★ DISTINCT cache keys         ${keys.size}    <- the entry count a full-corpus compile would reach`);
console.log(`\n  structural weight per graph (object nodes):`);
for (const p of [0.5, 0.9, 0.99, 1]) console.log(`     p${String(p * 100).padStart(4)}  ${pct(nodesArr, p === 1 ? 0.999999 : p)}`);
console.log(`     max     ${Math.max(...nodesArr)}`);
console.log(`\n  serialized size per graph (bytes):`);
for (const p of [0.5, 0.9, 0.99]) console.log(`     p${String(p * 100).padStart(4)}  ${pct(bytesArr, p)}`);
console.log(`     max     ${Math.max(...bytesArr)}    total ${(bytesArr.reduce((a, b) => a + b, 0) / 1024 / 1024).toFixed(2)} MB if ALL were retained`);

console.log(`\n== what these numbers do and do not license ==`);
console.log(`  * The ENTRY limit must exceed ${keys.size} or a single full-corpus compile evicts its own`);
console.log(`    working set and the cache stops being a cache. That is a floor, not a recommendation.`);
console.log(`  * A WEIGHT limit is needed because entries are not interchangeable: p50 is ${pct(nodesArr, 0.5)} nodes`);
console.log(`    and the max is ${Math.max(...nodesArr)} — a ${(Math.max(...nodesArr) / Math.max(1, pct(nodesArr, 0.5))).toFixed(0)}x spread that an entry count cannot see.`);
console.log(`  * An ADMISSION ceiling around p99 (${pct(nodesArr, 0.99)} nodes) keeps the outliers out of the`);
console.log(`    cache entirely; they recompute, which is slower and still verified.`);
console.log(`\n  ⚠ SCOPE. This is ONE corpus on ONE machine: the estate's own .fungi files. A host`);
console.log(`  compiling third-party code has a different distribution, so these are inputs to an`);
console.log(`  owner decision, not the decision. The measurement is repeatable — that is its value.`);
