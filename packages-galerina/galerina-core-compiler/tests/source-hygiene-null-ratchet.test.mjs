// source-hygiene-null-ratchet.test.mjs — the null ratchet (owner-approved 2026-08-07).
//
// WHY. An audit on the owner's request found 278 type-position `| null` in
// product source and 0 in tests. "No nulls in this project" was therefore an
// aspiration rather than a fact, and a policy with no detector drifts — which
// is how it reached 278. This is the detector.
//
// ★ IT PINS THE SET, NOT THE COUNT. A total is an aggregate, and an aggregate
// cannot tell a swap from stasis: one file losing a null while another gains
// one nets to zero and a count-based gate stays green while a regression
// landed. The baseline is `path -> count`, and the two directions are reported
// SEPARATELY because they need opposite fixes — `entered` means fix that file,
// `left` means tighten the baseline so the slack cannot hide a future entrant.
//
// ⚠ WHAT THIS DOES NOT DO, stated so the green is not over-read. It is a REGEX
// over source. It cannot see through a type alias, it will miss a null reached
// via `Maybe<T>`, and a refactor that renames the pattern defeats it. It is a
// ratchet on a textual habit, not a proof of absence — the honest claim is "the
// count of this spelling cannot grow", never "there are no nulls".
//
// New files must be CLEAN: absent from the baseline and carrying one is a hard
// fail, so the debt can only shrink.
//
// ★ THE CONVENTION FOR A NULL THAT STAYS. Not every null is the mistake. One
// that has been triaged and kept carries a `NULL AUDIT <date>` comment saying
// WHY — the test being: does this null lose a REASON? Six failure paths
// collapsing to one null erase the cause and get rewritten; a single-cause
// absence whose caller already holds the diagnostic code does not.
//
// So a null WITHOUT that comment has not been triaged, and a future audit can
// tell the two apart instead of re-deriving every verdict. The `.gate` v3
// modules are the worked example: five kept, each with its reasoning in place,
// three removed in cycles 0105 and 0107. This convention is deliberately NOT
// enforced by an assertion — 104 baselined files have not been triaged yet, and
// a gate that demands a comment on all of them would be red for months and
// switched off. It is a reading rule, and it is written here rather than in a
// file nobody opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..", "..");
const BASELINE = join(import.meta.dirname, "fixtures", "null-ratchet-baseline.json");

// Product source only. Tests measured 0 and stay that way by their own rule
// below; vendored/compiled bundles are a different population and are excluded
// rather than baselined, so nobody can hide a new null by editing a bundle.
//
// ★ SCOPE 2026-08-07 (cycle 0109), after a widening that taught more by failing
// than it would have by working. The first version scanned `packages-galerina`
// alone; the other roots looked like 279 unguarded files, so they were added.
// The red-first probe then did NOT fire on a planted null there, and chasing
// that instead of shipping found two things:
//
//   1. all 3 "occurrences" in those roots were `x || null` FALSE POSITIVES —
//      the pattern was matching the second pipe of a logical-or;
//   2. and a type-position null CANNOT occur in plain JavaScript code at all.
//      A `.mjs` may carry `@type {string | null}` in JSDoc, which is a comment
//      and stripped. So scanning `.js`/`.mjs`/`.cjs` for this pattern can only
//      ever produce noise.
//
// The roots stay — a `.ts` file added under `scripts/` later IS covered, and
// that costs nothing — but the extension filter is now `.ts` only, which is
// where the construct can exist. Narrower AND more correct than the widening
// that prompted it.
const SCAN_ROOTS = ["packages-galerina", "governance", "scripts", "tools", "bin", "src"]
  .map((root) => join(REPO, root));
const SKIP = new Set(["node_modules", "dist", "build", ".git", "coverage"]);
const VENDORED = /galerina-core\/compiler\/|\.min\.js$/;
const IS_TEST = /(^|\/)tests?\//;

/**
 * `: T | null` and the same in a return/parameter position.
 *
 * ★ BUILT FROM PARTS SO IT DOES NOT MATCH ITSELF. Written as a regex literal
 * this line contained the very pattern it hunts, and the gate flagged its own
 * source on the first run — an instrument measuring itself. The alternative was
 * to exclude this file from the scan, which would have created exactly one
 * place in the repository where a real null could hide. Composing the pattern
 * costs one line and leaves no exemption to remember.
 */
const N = "null";
// `(?<!\|)` — a pipe NOT preceded by a pipe, so the logical-or default
// `x || null` is excluded. WITHOUT this the pattern matched the SECOND pipe of
// `||` and counted every `?? 0 || null` idiom as a type annotation: measured at
// 4 false positives, every one of them in a `.mjs`/`.cjs` file, and 0 in `.ts`.
const TYPE_NULL = new RegExp(`:\\s*[\\w<>\\[\\]\\s.]*(?<!\\|)\\|\\s*${N}\\b|(?<!\\|)\\|\\s*${N}\\s*[;,)=>]`);

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) yield* walk(join(dir, e.name)); }
    // `.ts` only — see the SCOPE note above. The construct being hunted is a
    // TypeScript type annotation; in plain JS it can only appear in a comment.
    else if (/\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) yield join(dir, e.name);
  }
}

/** path -> count, over product source only. */
function measure() {
  const found = {};
  const tests = {};
  for (const file of SCAN_ROOTS.flatMap((root) => [...walk(root)])) {
    const rel = file.slice(REPO.length + 1).split(sep).join("/");
    if (VENDORED.test(rel)) continue;
    let count = 0;
    // Comments are not code. Line comments were always stripped; BLOCK comments
    // were not, and this gate flagged its own JSDoc on the first run. Tracking
    // the state properly rather than dropping every `*`-prefixed line, because
    // a generator method declaration also starts with `*` — and blinding the
    // gate to `*next(): T | null` to silence a doc comment would be a hole
    // opened to fix a cosmetic complaint.
    let inBlock = false;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      let line = raw;
      if (inBlock) {
        const close = line.indexOf("*/");
        if (close < 0) continue;
        inBlock = false;
        line = line.slice(close + 2);
      }
      line = line.replace(/\/\*[\s\S]*?\*\//g, "");
      const open = line.indexOf("/*");
      if (open >= 0) { inBlock = true; line = line.slice(0, open); }
      if (TYPE_NULL.test(line.replace(/\/\/.*$/, ""))) count++;
    }
    if (count === 0) continue;
    if (IS_TEST.test(rel)) tests[rel] = count; else found[rel] = count;
  }
  return { found, tests };
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;

test("the baseline exists — a ratchet with no baseline is not a ratchet", () => {
  assert.ok(baseline, `missing ${BASELINE}; regenerate with UPDATE_NULL_BASELINE=1`);
  assert.ok(Object.keys(baseline.files).length > 0, "an empty baseline would pass vacuously");
});

test("the scan is not vacuous — it must still see the tree", () => {
  // Guard against the failure this gate exists to prevent: a check that passes
  // over nothing. If REPO or walk breaks, every assertion below goes green.
  const { found } = measure();
  assert.ok(Object.keys(found).length > 10,
    `expected to find the known population, saw ${Object.keys(found).length} files`);
});

test("★ NO NEW FILE carries a type-position null", () => {
  const { found } = measure();
  const entrants = Object.keys(found).filter((path) => !(path in baseline.files)).sort();
  assert.deepEqual(entrants, [],
    `new file(s) must be null-free — use a discriminated union:\n  ${entrants.join("\n  ")}`);
});

test("★ NO EXISTING FILE gained one (entered)", () => {
  const { found } = measure();
  const grew = Object.entries(found)
    .filter(([path, n]) => path in baseline.files && n > baseline.files[path])
    .map(([path, n]) => `${path}: ${baseline.files[path]} -> ${n}`);
  assert.deepEqual(grew, [], `null count grew — fix the file, never widen the baseline:\n  ${grew.join("\n  ")}`);
});

test("★ and the baseline carries no SLACK (left)", () => {
  // The other direction, reported separately because it needs the opposite fix.
  // A file that improved and was not re-baselined leaves headroom a future
  // entrant can occupy invisibly — which is exactly how a ratchet rots.
  const { found } = measure();
  const shrank = Object.entries(baseline.files)
    .filter(([path, n]) => (found[path] ?? 0) < n)
    .map(([path, n]) => `${path}: ${n} -> ${found[path] ?? 0}`);
  assert.deepEqual(shrank, [],
    `improvement detected — tighten the baseline (UPDATE_NULL_BASELINE=1) so the slack cannot hide an entrant:\n  ${shrank.join("\n  ")}`);
});

test("tests stay at ZERO — the discipline is already understood there", () => {
  const { tests } = measure();
  assert.deepEqual(tests, {}, `test files must carry no type-position null:\n  ${Object.keys(tests).join("\n  ")}`);
});

// Regeneration is deliberate and explicit, never automatic on failure.
if (process.env.UPDATE_NULL_BASELINE === "1") {
  const { found } = measure();
  const total = Object.values(found).reduce((a, b) => a + b, 0);
  writeFileSync(BASELINE, `${JSON.stringify({ note: "type-position `| null` per file; see source-hygiene-null-ratchet.test.mjs", total, files: found }, null, 2)}\n`);
  console.log(`null-ratchet baseline rewritten: ${Object.keys(found).length} files, ${total} occurrences`);
}
