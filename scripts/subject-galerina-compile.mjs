// Subject: the Galerina compiler front-to-back, driven the way a long-running
// process would drive it — the same pipeline, over and over.
//
// TWO MODES, because they answer different questions:
//
//   IDENTICAL (default)  the SAME source every iteration. Any sustained growth here
//                        is unambiguous: the input set is not growing, so nothing
//                        legitimately needs more memory on iteration 30 than on 9.
//
//   UNIQUE (LEAK_MODE=unique)  a DISTINCT source every iteration. Growth here is not
//                        automatically a defect — a cache is SUPPOSED to fill. It is a
//                        defect only if nothing ever evicts, which is the shape that
//                        kills a server after a week. Read this mode as "is the cache
//                        bounded?", never as "is there a leak?".
//
// Reported separately on purpose: conflating them is how a legitimate cache gets
// called a leak, and how an unbounded one gets excused as "just caching".
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// Self-locating: walk up from this file until a sibling `Galerina/` appears. An
// absolute path baked into a committed file leaks the developer's machine layout
// AND breaks on every other machine — the exact pair `audit-path-leak.mjs` exists
// to catch. A tool that violates the house rule it lives beside teaches the wrong
// lesson twice.
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
const GAL = findGalerina();
const DIST = GAL + "packages-ts/galerina-core-compiler/dist/index.js";
const { parseProgram, checkTypes, checkEffects, verifyGovernance, checkTaint } =
  await import(pathToFileURL(DIST).href);

const SAMPLE = GAL + "tests/syntax/gate-access-enforcement.fungi";
const base = readFileSync(SAMPLE, "utf8");
const mode = process.env.LEAK_MODE === "unique" ? "unique" : "identical";

export default async function iteration(i) {
  // In unique mode, vary the source in a way that changes flow NAMES — the thing
  // compiler registries are keyed by — rather than only a comment, which many
  // caches would hash away to the same key and quietly make the probe vacuous.
  const src = mode === "unique"
    ? base.replace(/\bflow\s+(\w+)/g, (m, n) => `flow ${n}_v${i}`)
    : base;

  const p = parseProgram(src, `leak-subject-${mode}.fungi`);
  checkTypes(p.ast);
  const fx = checkEffects(p.flows, p.ast);
  verifyGovernance(p.ast, p.flows, fx, "production");
  checkTaint(p.ast, p.flows);
}
