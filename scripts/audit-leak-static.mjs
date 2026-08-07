#!/usr/bin/env node
// =============================================================================
// audit-leak-static.mjs — grow-only MODULE-LEVEL state, found by reading.
//
// WHY THIS EXISTS BESIDE THE DYNAMIC AUDIT. `audit-memory-leak.mjs` measures what a
// workload actually does, which is the strongest evidence available — and it is
// blind to every path the workload does not take. A cache that only fills on the
// error path, or under a flag nobody set in the harness, is invisible to it. This
// pass reads instead of runs, so it sees those; it pays for that with false
// positives, which is the honest trade and is why the two ship together.
//
// THE PATTERN. A collection declared at MODULE level lives for the whole process.
// If something writes to it and nothing ever removes from it, it is monotonic: in a
// CLI that exits in 200 ms this is harmless, in a long-running server it is the
// classic slow leak. The severity is therefore a property of the HOST, not of the
// line — so this tool reports "unbounded", never "leak", and says which host makes
// it matter.
//
// ★ THIS IS A CANDIDATE FINDER, NOT A VERDICT. Three legitimate shapes trip it and
// are NOT defects:
//   • a registry populated once at startup from a fixed set (bounded by the source)
//   • a memo keyed by a closed domain — 5 profiles, 12 opcodes
//   • a WeakMap, whose entries die with their keys (detected and never flagged)
// Every hit needs a human to ask "is the KEY SPACE bounded?". A tool cannot answer
// that, and one that pretends to would train its reader to ignore it.
//
// EXIT: 0 nothing unbounded · 1 candidates found · 2 usage/self-test failure
// =============================================================================

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import process from "node:process";

const COLLECTION = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+(Map|Set|WeakMap|WeakSet)\s*(?:<[^>]*>)?\s*\(/;
const ARRAY_LIT = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*\[\s*\]\s*;?\s*$/;

/** Writes that GROW a collection. */
const growOps = (id) => new RegExp(`\\b${id}\\.(set|add|push|unshift)\\s*\\(`, "g");
/** Anything that can REMOVE. `.clear()` counts: it bounds growth even if coarsely. */
const shrinkOps = (id) => new RegExp(`\\b${id}\\.(delete|clear|pop|shift|splice)\\s*\\(|\\b${id}\\s*=\\s*new\\s|\\b${id}\\.length\\s*=\\s*0`, "g");
/** An explicit size cap read from the collection is a bound even without deletion. */
const capOps = (id) => new RegExp(`\\b${id}\\.(size|length)\\s*(>=|>|<|<=)|MAX_|LIMIT|CAPACITY`, "g");

/**
 * Module level = column 0 (no leading whitespace). Deliberately crude and stated as
 * such: a declaration indented inside a function or class is scoped and dies with
 * its frame, and indentation is a reliable proxy for that in this codebase's style.
 * A minifier or an unusual formatter would defeat it — which is a limit of this
 * pass, not a fact about the file.
 */
/** Is this path test-only code? Production reachability is the whole question below. */
const isTestPath = (p) => /[\\/]tests?[\\/]|\.test\.|\.spec\.|[\\/]__tests__[\\/]|[\\/]fixtures?[\\/]/i.test(p);

/** Names of the functions enclosing each match of `re` — the handles a caller uses. */
function enclosingFns(lines, re) {
  const fns = new Set();
  for (let k = 0; k < lines.length; k++) {
    re.lastIndex = 0;
    if (!re.test(lines[k])) continue;
    for (let j = k; j >= 0; j--) {
      const m = lines[j].match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/)
        || lines[j].match(/^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/);
      if (m) { fns.add(m[1]); break; }
    }
  }
  return [...fns];
}

/**
 * Second pass: a `shrink-present` collection is only BOUNDED if its removal is
 * reachable from PRODUCTION code. Three outcomes, and the middle one is the finding
 * this pass exists to make:
 *
 *   bounded            a non-test file calls the shrink
 *   test-only-clear    ★ only tests call it — production fills, nothing empties
 *   clear-never-called ★ nothing calls it at all
 *
 * Honest bound on this analysis: it matches call sites by NAME. An indirect call, a
 * dispatch table or a re-export under another name defeats it, so a `bounded` here
 * means "a production caller was found", never "no test-only path exists".
 */
function resolveReachability(hits, corpus) {
  for (const h of hits) {
    if (h.verdict !== "shrink-present") continue;
    let prod = 0, test = 0;
    const where = new Set();
    for (const fn of h.shrinkFns ?? []) {
      const callRe = new RegExp(`\\b${fn}\\s*\\(`, "g");
      const defRe = new RegExp(`function\\s+${fn}\\s*\\(|const\\s+${fn}\\s*=`, "g");
      for (const [file, text] of corpus) {
        const calls = (text.match(callRe) ?? []).length - (text.match(defRe) ?? []).length;
        if (calls <= 0) continue;
        if (isTestPath(file)) { test += calls; where.add("test:" + file); }
        else { prod += calls; where.add("prod:" + file); }
      }
    }
    h.provisional = false;
    h.prodCallers = prod; h.testCallers = test;
    h.callSites = [...where];
    if (prod > 0) { h.verdict = "bounded"; h.note = `shrink reachable from production (${prod} call site(s))`; }
    else if (test > 0) { h.verdict = "TEST-ONLY-CLEAR"; h.note = `★ production POPULATES this, and only TESTS clear it (${test} test call(s), 0 production). Reported bounded by a lexical check; it is not.`; }
    else { h.verdict = "CLEAR-NEVER-CALLED"; h.note = "★ a removal exists but nothing calls it anywhere"; }
  }
  return hits;
}

function scanSource(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s/.test(line)) continue;                       // indented => not module level
    const m = COLLECTION.exec(line) ?? ARRAY_LIT.exec(line);
    if (!m) continue;
    const id = m[1];
    const kind = m[2] ?? "Array";
    if (kind === "WeakMap" || kind === "WeakSet") {
      found.push({ id, kind, line: i + 1, verdict: "weak", note: "entries die with their keys — cannot leak by retention" });
      continue;
    }
    // ★ The DECLARATION LINE must be excluded before counting removals. `const
    // cache = new Map()` matches the "reassigned to a fresh collection" removal
    // pattern, so counting it made every unbounded cache read as bounded — the
    // classifier's own self-test caught this, which is the entire argument for
    // having one. A detector that cannot fail its own fixture cannot fail anything.
    const body = lines.slice(0, i).concat(lines.slice(i + 1)).join("\n");
    const grows = (body.match(growOps(id)) ?? []).length;
    const shrinks = (body.match(shrinkOps(id)) ?? []).length;
    const caps = (body.match(capOps(id)) ?? []).length;
    if (grows === 0) { found.push({ id, kind, line: i + 1, verdict: "inert", note: "never written" }); continue; }
    if (shrinks > 0) {
      // ★ NOT `bounded` yet. "A removal exists in this file" and "the collection is
      // bounded in production" are DIFFERENT PROPOSITIONS, and conflating them is how
      // PROOF_SHAPE_CACHE was reported safe while production populated it and only
      // TESTS ever cleared it. A verdict that looks safe is worse than one that looks
      // bad: nobody re-examines it.
      //
      // The reachability answer needs the whole tree, so it is resolved in a second
      // pass (resolveReachability). Until then this is explicitly PROVISIONAL.
      found.push({ id, kind, line: i + 1, grows, shrinks,
                   verdict: "shrink-present", provisional: true,
                   shrinkFns: enclosingFns(lines, shrinkOps(id)),
                   note: `${shrinks} removal site(s) — reachability from production NOT yet established` });
      continue;
    }
    if (caps > 0) { found.push({ id, kind, line: i + 1, grows, verdict: "capped", note: "a size/limit check is present — verify it actually gates the write" }); continue; }
    found.push({ id, kind, line: i + 1, grows, verdict: "UNBOUNDED", note: `${grows} write site(s), no removal and no size check` });
  }
  return found;
}

// ---------------------------------------------------------------------------
// Fail-closed: prove the classifier discriminates before believing any scan
// ---------------------------------------------------------------------------

const FIXTURES = [
  ["known UNBOUNDED", `const cache = new Map();\nexport function put(k,v){ cache.set(k,v) }\n`, "UNBOUNDED"],
  ["shrink present, reachability unresolved", `const cache = new Map();\nexport function put(k,v){ cache.set(k,v) }\nexport function drop(k){ cache.delete(k) }\n`, "shrink-present"],
  ["known CAPPED (size check)", `const cache = new Map();\nexport function put(k,v){ if (cache.size < MAX_N) cache.set(k,v) }\n`, "capped"],
  ["WeakMap cannot leak by retention", `const seen = new WeakMap();\nexport function mark(o){ seen.set(o,1) }\n`, "weak"],
  ["function-scoped is NOT module state", `export function f(){\n  const local = new Map();\n  local.set(1,2);\n}\n`, null],
];

function selfTest() {
  console.log("== self-test: the classifier must separate unbounded from bounded, capped, weak and scoped ==");
  let ok = true;
  for (const [label, src, expect] of FIXTURES) {
    const got = scanSource(src);
    const verdict = got.length ? got[0].verdict : null;
    const pass = verdict === expect;
    console.log(`   ${pass ? "*" : "❌"} ${label.padEnd(44)} expected ${String(expect).padEnd(16)} got ${String(verdict)}`);
    if (!pass) ok = false;
  }

  // ★ The reachability pass is the fix for the defect that made PROOF_SHAPE_CACHE
  // read as safe. It gets its own fixtures, because the single-file classifier
  // cannot express the distinction at all.
  const SRC = `const cache = new Map();
export function put(k,v){ cache.set(k,v) }
export function clearCache(){ cache.clear() }
`;
  const REACH = [
    ["shrink called from PRODUCTION -> bounded", [["src/a.ts", SRC], ["src/other.ts", "import {clearCache} from './a';\nclearCache();"]], "bounded"],
    ["shrink called ONLY from tests -> TEST-ONLY-CLEAR", [["src/a.ts", SRC], ["tests/a.test.mjs", "import {clearCache} from '../src/a';\nclearCache();"]], "TEST-ONLY-CLEAR"],
    ["shrink called by nobody -> CLEAR-NEVER-CALLED", [["src/a.ts", SRC]], "CLEAR-NEVER-CALLED"],
  ];
  for (const [label, corpus, expect] of REACH) {
    const hits = resolveReachability(scanSource(SRC), corpus);
    const v = hits.length ? hits[0].verdict : null;
    const pass = v === expect;
    console.log(`   ${pass ? "*" : "❌"} ${label.padEnd(44)} expected ${expect.padEnd(16)} got ${String(v)}`);
    if (!pass) ok = false;
  }
  console.log("   " + (ok
    ? "✅ self-test passed — the classifier discriminates."
    : "❌ self-test FAILED — a scan result would adjudicate nothing."));
  return ok;
}

// ---------------------------------------------------------------------------

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = dir + "/" + e.name;
    if (/node_modules|[\\/]\.git|[\\/]dist[\\/]/.test(p)) continue;
    if (e.isDirectory()) { yield* walk(p); continue; }
    if (/\.(ts|mts|mjs|cjs|js)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) yield p;
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.length === 0) {
    console.log(`audit-leak-static.mjs — grow-only module-level state

  --self-test        prove the classifier discriminates (run this first)
  --scan <dir>       scan a directory tree
  --all              show bounded/capped/weak/inert too, not just candidates

exit: 0 clean · 1 candidates found · 2 usage/self-test failure`);
    process.exit(argv.length === 0 ? 2 : 0);
  }
  if (!selfTest()) process.exit(2);
  if (argv.includes("--self-test")) process.exit(0);

  const si = argv.indexOf("--scan");
  if (si === -1 || !argv[si + 1]) { console.error("  --scan needs a directory"); process.exit(2); }
  const root = argv[si + 1];
  try { if (!statSync(root).isDirectory()) throw new Error("not a directory"); }
  catch (e) { console.error(`  cannot scan '${root}': ${e.message}`); process.exit(2); }

  const showAll = argv.includes("--all");

  // ★ CLASSIFICATION SCOPE AND REACHABILITY SCOPE ARE NOT THE SAME SCOPE.
  // Scanning only `src/` hides every test caller, which silently turns
  // TEST-ONLY-CLEAR (production fills it, only tests empty it) into
  // CLEAR-NEVER-CALLED — a different finding, from the same code, decided by where
  // the tool was pointed. A verdict that changes with the scan boundary is a fact
  // about the invocation, not about the program.
  //
  // So: declarations come from `--scan`, callers come from the whole PACKAGE (or
  // `--corpus`). Widening the caller search can only ever make a verdict safer.
  const ci = argv.indexOf("--corpus");
  let corpusRoot = ci !== -1 && argv[ci + 1] ? argv[ci + 1] : null;
  if (!corpusRoot) {
    // walk up from the scan root to the nearest directory that also holds tests
    let d = root.replace(/[\\/]+$/, "");
    for (let i = 0; i < 6; i++) {
      const up = d.replace(/[\\/][^\\/]+$/, "");
      if (up === d || !up) break;
      d = up;
      const hasTests = ["tests", "test", "__tests__"].some((t) => existsSync(d + "/" + t));
      if (hasTests) { corpusRoot = d; break; }
    }
    corpusRoot = corpusRoot ?? root;
  }
  const tally = { UNBOUNDED: 0, "TEST-ONLY-CLEAR": 0, "CLEAR-NEVER-CALLED": 0, capped: 0, bounded: 0, weak: 0, inert: 0 };
  let hits = [];
  let files = 0;
  // The corpus is read once and kept: reachability is a whole-tree question, and a
  // per-file classifier structurally cannot answer it.
  const declFiles = new Set([...walk(root)]);
  const corpus = [];
  for (const f of walk(corpusRoot)) {
    let text; try { text = readFileSync(f, "utf8"); } catch { continue; }
    corpus.push([f, text]);
    if (!declFiles.has(f)) continue;      // classify only within --scan
    files++;
    for (const r of scanSource(text)) hits.push({ file: f, ...r });
  }
  // Second pass: resolve every provisional `shrink-present` against production callers.
  hits = resolveReachability(hits, corpus);
  for (const r of hits) tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;
  const REPORTABLE = new Set(["UNBOUNDED", "TEST-ONLY-CLEAR", "CLEAR-NEVER-CALLED"]);
  if (!showAll) hits = hits.filter((r) => REPORTABLE.has(r.verdict));

  console.log(`\n== scan: ${files} file(s) classified under ${root} ==`);
  console.log(`   reachability corpus: ${corpus.length} file(s) under ${corpusRoot}`);
  if (corpusRoot === root) {
    console.log("   ⚠ the caller search is NO WIDER than the scan. If tests live outside this root,");
    console.log("     a TEST-ONLY-CLEAR will be misreported as CLEAR-NEVER-CALLED. Pass --corpus.");
  }
  if (files === 0) { console.error("  ** no files scanned — the walker is dead, conclude nothing"); process.exit(2); }
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  console.log(`   module-level collections found: ${total}`);
  for (const [k, v] of Object.entries(tally)) console.log(`     ${k.padEnd(11)} ${v}`);
  console.log("   CONTROL: a non-zero count in the bounded/weak rows shows the classifier is");
  console.log("   reading real declarations, so a low UNBOUNDED count is a result and not silence.");

  if (hits.length) {
    console.log("\n   candidates (unbounded unless --all):");
    for (const h of hits.slice(0, 60)) {
      console.log(`     ${h.verdict.padEnd(10)} ${h.kind.padEnd(7)} ${h.id.padEnd(26)} ${h.file.replace(/\\/g, "/")}:${h.line}`);
      console.log(`                ${h.note}`);
    }
    if (hits.length > 60) console.log(`     ... and ${hits.length - 60} more (not truncated silently: this is the count)`);
  }

  console.log("\n   ★ Read every hit as a QUESTION, not a verdict: is the KEY SPACE bounded?");
  console.log("   A registry filled once from a fixed set is fine forever. The same code keyed by");
  console.log("   user input, filename, or request id is a leak in any process that outlives a CLI run.");
  console.log("   TEST-ONLY-CLEAR is the worst category to ignore: it LOOKS bounded, so nobody re-reads it.");
  console.log("\n   Bound on the reachability pass: call sites are matched by NAME. An indirect call,");
  console.log("   a dispatch table or a re-export under another name defeats it — so `bounded` means");
  console.log("   'a production caller was found', never 'no test-only path exists'.");
  const failing = tally.UNBOUNDED + tally["TEST-ONLY-CLEAR"] + tally["CLEAR-NEVER-CALLED"];
  process.exit(failing > 0 ? 1 : 0);
}

main();
