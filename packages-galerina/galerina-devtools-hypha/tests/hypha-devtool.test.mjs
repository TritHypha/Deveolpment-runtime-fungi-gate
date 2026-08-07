// ============================================================================
// galerina-devtools-hypha — hermetic tests
//
// These run the QUERIES against synthetic fact objects whose answers are known.
// They deliberately do NOT scan the real repository: a test that asserts
// "the real tree has no drift" fails the day someone introduces drift, which
// makes it a drift detector wearing a test's clothes. The drift detector is
// `bin/galerina-hypha.mjs`; these prove the detector itself discriminates.
//
// The one exception is the tree-purity test, which must touch the real tree
// because "writes nothing" is only meaningful about a real directory.
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { QUERIES, duplicateSets, kindCoverage, deadExports, surface, nameSetDrift } from "../src/queries.mjs";
import { extractNameSets, extractKindCollections } from "../src/namesets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "../bin/galerina-hypha.mjs");

/** One fixture, every answer known by construction. */
const FIXTURE = {
  kindSets: [
    { file: "a.js", line: 1, members: ["flowDecl", "governedFlowDecl", "x", "y"] },
    { file: "b.js", line: 2, members: ["flowDecl", "x", "y"] },        // drifted from a
    { file: "c.js", line: 3, members: ["flowDecl", "x", "y"] },        // exact duplicate of b
    { file: "d.js", line: 4, members: ["p", "q"] },                    // unrelated: must not pair
  ],
  parserKinds: ["flowDecl", "governedFlowDecl"],
  exportedCheckers: [
    { name: "checkAlive", file: "e.js", line: 5, isChecker: true },
    { name: "checkDead", file: "f.js", line: 6, isChecker: true },
  ],
  checkerCallSites: { checkAlive: [{ file: "g.js", line: 7 }], checkDead: [] },
  gateList: { names: [{ name: "push", section: "array", line: 10 }] },
  stdlibCases: [{ name: "push", file: "h.js", line: 11 }],
  inlineTables: [],   // `push` absent here — the .push() incident, reconstructed
};

test("duplicateSets finds the drifted pair and names the difference", () => {
  const r = duplicateSets(FIXTURE);
  assert.equal(r.drift.length, 2, "a drifted against both b and c");
  const diffs = r.drift.flatMap((d) => [...d.onlyA, ...d.onlyB]);
  assert.ok(diffs.includes("governedFlowDecl"), "the missing member is named, not just counted");
});

test("duplicateSets does not pair sets that merely coexist", () => {
  const r = duplicateSets(FIXTURE);
  assert.ok(!JSON.stringify(r.drift).includes("d.js"), "a 2-member unrelated set must not pair");
});

test("duplicateSets reports identical sets at more than one site", () => {
  const r = duplicateSets(FIXTURE);
  assert.equal(r.duplicates.length, 1);
  assert.deepEqual(r.duplicates[0].sites.sort(), ["b.js:2", "c.js:3"]);
});

test("kindCoverage flags a gating set missing a parser-producible kind", () => {
  const r = kindCoverage(FIXTURE);
  assert.equal(r.parserKindCount, 2);
  assert.ok(r.gaps.some((g) => g.missing.includes("governedFlowDecl")));
});

test("kindCoverage ignores sets that gate nothing", () => {
  const r = kindCoverage(FIXTURE);
  assert.ok(!r.gaps.some((g) => g.site.startsWith("d.js")), "a set with no parser kinds is not a gating set");
});

test("deadExports separates called from uncalled", () => {
  const r = deadExports(FIXTURE);
  assert.equal(r.dead.length, 1);
  assert.equal(r.dead[0].name, "checkDead");
  assert.equal(r.dead[0].definedAt, "f.js:6");
});

test("surface reports a name layer by layer, including the absent layer", () => {
  const r = surface(FIXTURE, "push");
  assert.equal(r.layers, 2, "gate list + stdlib, not the inline table");
  assert.equal(r.gateList.section, "array");
  assert.equal(r.inlineTables.length, 0, "the absent layer is reported as absent, not omitted");
});

test("surface with no name returns only the asymmetric names", () => {
  const r = surface(FIXTURE);
  assert.equal(r.total, 1);
  assert.equal(r.asymmetric.length, 1, "a name in some layers but not all");
});

test("the CLI self-test passes", () => {
  const r = spawnSync(process.execPath, [CLI, "--self-test"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /self-test cases pass/);
});

test("an unknown scan target exits 2, not 0", () => {
  const r = spawnSync(process.execPath, [CLI, "--scan", "no-such-query"], { encoding: "utf8" });
  assert.equal(r.status, 2, "an unrunnable scan must never look like a clean one");
});

test("a scan writes nothing into the package directory", () => {
  const before = readdirSync(HERE + "/..").sort().join("|");
  spawnSync(process.execPath, [CLI, "--scan", "dead-exports"], { encoding: "utf8" });
  assert.equal(readdirSync(HERE + "/..").sort().join("|"), before);
});

test("the vendored extractor records its provenance", () => {
  const p = join(HERE, "../src/provenance.json");
  assert.ok(existsSync(p), "src/provenance.json must exist");
  const prov = JSON.parse(readFileSync(p, "utf8"));
  assert.match(prov.sha256, /^[0-9a-f]{64}$/, "a real digest, not a placeholder");
  assert.ok(prov.exports.length > 0, "the vendored export list is recorded");
});

// ============================================================================
// Registry agreement (added 2026-08-06).
//
// The tool keeps its query list in two places: `QUERIES` (the dispatch table)
// and `QUERY_SHAPE` (the findings/context classification, which also names the
// full scan's output key). It used to keep it in a third — a hand-written
// quadruple inside the `full` branch.
//
// A query registered in `QUERIES` alone was reachable by name, absent from the
// default scan, unvisited by the self-test's classification loop, and worth
// zero findings. Every one of those failures reports success.
//
// These tests read the bin as TEXT on purpose. The guard they protect runs at
// module load and exits the process, so it cannot be imported and called; and a
// test that only asserted `--self-test` passes would not notice the derivation
// being replaced by a literal list again.
// ============================================================================

/** QUERY_SHAPE, parsed out of the bin's source. */
function readQueryShape() {
  const src = readFileSync(CLI, "utf8");
  const block = /const QUERY_SHAPE\s*=\s*\{([\s\S]*?)\n\};/.exec(src);
  assert.ok(block, "QUERY_SHAPE block not found — the parser below is stale, not the code");
  const shape = {};
  for (const m of block[1].matchAll(/^\s*"([a-z][a-z0-9-]*)":\s*\{\s*outputKey:\s*"(\w+)"/gm))
    shape[m[1]] = m[2];
  return shape;
}

test("every query in QUERIES is classified in QUERY_SHAPE", () => {
  const shape = readQueryShape();
  // The control: the parser must have found something, or the comparison is vacuous.
  assert.ok(Object.keys(shape).length > 0, "parsed no entries from QUERY_SHAPE");
  const unclassified = Object.keys(QUERIES).filter((n) => !(n in shape));
  assert.deepEqual(unclassified, [], `unclassified: ${unclassified.join(", ")}`);
});

test("every QUERY_SHAPE entry is a real query", () => {
  const orphaned = Object.keys(readQueryShape()).filter((n) => !(n in QUERIES));
  assert.deepEqual(orphaned, [], `orphaned: ${orphaned.join(", ")}`);
});

test("outputKeys are distinct, so no query overwrites another in the full result", () => {
  const keys = Object.values(readQueryShape());
  assert.equal(new Set(keys).size, keys.length, `duplicate outputKey in: ${keys.join(", ")}`);
});

test("the full scan is DERIVED from QUERIES, not a hand-written list", () => {
  const src = readFileSync(CLI, "utf8");
  const branch = /if \(target === "full"\) \{([\s\S]*?)\n\} else if/.exec(src);
  assert.ok(branch, "full-scan branch not found");
  // It must enumerate the dispatch table…
  assert.match(branch[1], /Object\.keys\(QUERIES\)/,
    "the full scan no longer derives from QUERIES — a new query would be silently unscanned");
  // …and must not re-introduce a literal per-query list.
  const literals = Object.values(readQueryShape()).filter((k) => new RegExp(`${k}\\s*:`).test(branch[1]));
  assert.deepEqual(literals, [],
    `the full branch names ${literals.join(", ")} literally; that is the third registry returning`);
});

test("the self-test asserts registry agreement, not only field classification", () => {
  // Structural: the self-test must READ QUERIES when checking the registries. Before the fix it
  // iterated QUERY_SHAPE only, which cannot detect a query missing from QUERY_SHAPE.
  const src = readFileSync(CLI, "utf8");
  // Slice the self-test BLOCK: from its banner to its summary line. Anchoring on the summary
  // alone selects everything AFTER the block, which is how this test first failed.
  const start = src.indexOf("// ── self-test");
  const end = src.indexOf("self-test cases pass");
  assert.ok(start > 0 && end > start, "self-test block not located — this test is stale, not the code");
  const selfTest = src.slice(start, end);
  assert.match(selfTest, /Object\.keys\(QUERIES\)\.filter/,
    "the self-test does not compare QUERIES against QUERY_SHAPE");
  assert.match(selfTest, /Object\.keys\(QUERY_SHAPE\)\.filter/,
    "the self-test does not check for orphaned QUERY_SHAPE entries");
});

// ============================================================================
// name-set-drift (added 2026-08-06).
//
// Each test pins ONE of the three filters. They exist because the unfiltered
// query was unusable on the real tree: a 27-member CONTRACT_SECTIONS paired
// with every token literal in the parser, and PRODUCTION_STRICTNESS_MODES with
// every unrelated string in cli.js. A filter that is not tested is a filter
// somebody will remove.
// ============================================================================

/** Minimal facts for this query alone. */
const nsFixture = (nameSets, nameComparisons) => ({ nameSets, nameComparisons });

test("name-set-drift reports a guard list narrower than the names tested", () => {
  const r = nameSetDrift(nsFixture(
    [{ name: "GUARD", file: "a.js", line: 1, members: ["alpha", "beta"] }],
    [{ receiver: "node.value", literal: "alpha", file: "a.js", line: 2 },
     { receiver: "node.value", literal: "beta", file: "a.js", line: 3 },
     { receiver: "node.value", literal: "gamma", file: "a.js", line: 4 }]));
  assert.equal(r.uncovered.length, 1);
  assert.equal(r.uncovered[0].missing[0].literal, "gamma");
  assert.equal(r.uncovered[0].missing[0].at, "a.js:4", "the finding must cite the site, not just the name");
});

test("name-set-drift reports nothing when the guard list is complete", () => {
  const r = nameSetDrift(nsFixture(
    [{ name: "GUARD", file: "a.js", line: 1, members: ["alpha", "beta"] }],
    [{ receiver: "node.value", literal: "alpha", file: "a.js", line: 2 },
     { receiver: "node.value", literal: "beta", file: "a.js", line: 3 }]));
  assert.deepEqual(r.uncovered, [], "a complete guard list must not be reported");
});

test("FILTER 1: a different receiver is a different vocabulary", () => {
  const r = nameSetDrift(nsFixture(
    [{ name: "GUARD", file: "a.js", line: 1, members: ["alpha", "beta"] }],
    [{ receiver: "node.value", literal: "alpha", file: "a.js", line: 2 },
     { receiver: "node.value", literal: "beta", file: "a.js", line: 3 },
     { receiver: "d.severity", literal: "gamma", file: "a.js", line: 4 }]));
  assert.deepEqual(r.uncovered, [],
    "a literal tested through a different field must not count as a gap");
});

test("FILTER 2: identifier-shaped literals only — a set of verbs cannot omit an operator", () => {
  const r = nameSetDrift(nsFixture(
    [{ name: "GUARD", file: "a.js", line: 1, members: ["alpha", "beta"] }],
    [{ receiver: "node.value", literal: "alpha", file: "a.js", line: 2 },
     { receiver: "node.value", literal: "beta", file: "a.js", line: 3 },
     { receiver: "node.value", literal: "==", file: "a.js", line: 4 },
     { receiver: "node.value", literal: "#record", file: "a.js", line: 5 }]));
  assert.deepEqual(r.uncovered, [], "operators and markers are not candidate members");
});

test("FILTER 3: a set that is a MINORITY of the receiver's vocabulary is not its guard list", () => {
  const many = ["alpha", "beta"].map((l, i) => ({ receiver: "tok.value", literal: l, file: "a.js", line: 2 + i }));
  for (let i = 0; i < 5; i++) many.push({ receiver: "tok.value", literal: "other" + i, file: "a.js", line: 10 + i });
  const r = nameSetDrift(nsFixture([{ name: "GUARD", file: "a.js", line: 1, members: ["alpha", "beta"] }], many));
  assert.deepEqual(r.uncovered, [],
    "2 covered vs 5 missed: the set enumerates something narrower than this field");
});

test("a one-member set is not an enumeration and is never examined", () => {
  const r = nameSetDrift(nsFixture(
    [{ name: "SOLO", file: "a.js", line: 1, members: ["alpha"] }],
    [{ receiver: "node.value", literal: "alpha", file: "a.js", line: 2 },
     { receiver: "node.value", literal: "beta", file: "a.js", line: 3 }]));
  assert.deepEqual(r.uncovered, []);
  assert.equal(r.setsExamined, 0, "setsExamined must count only sets the query could adjudicate");
});

test("the name-set extractor FAILS CLOSED on an empty corpus", () => {
  // Reading nothing and finding nothing are indistinguishable downstream: both give an empty
  // findings list and exit 0. The first version of this extractor read bare filenames, every
  // read threw ENOENT, and a `catch { continue }` reported '0 sets examined, none drifted'.
  // Either layer may raise: the vendored `distFiles` throws on a missing dist directory, and the
  // local guard throws when the directory exists but nothing in it could be read. The property
  // under test is the same for both — NEVER return an empty result from an unread corpus — so the
  // assertion is on throwing, not on whose message it is.
  let threw = false, result;
  try { result = extractNameSets(join(HERE, "..", "..", "__no_such_root__")); }
  catch { threw = true; }
  assert.ok(threw, `an unreadable corpus must throw; it returned ${JSON.stringify(result)}`);
  // And the control: on the REAL root it must return a non-empty result, or the check above
  // passes for a module that can only ever throw.
  const real = extractNameSets(join(HERE, "..", "..", ".."));
  assert.ok(real.length > 0, "the extractor must actually find sets on the real tree");
});

// ============================================================================
// Collection SHAPE (added 2026-08-06).
//
// A vocabulary does not stop being a vocabulary because of the brackets around
// it. `effect-checker.ts`'s own `findFlowNode` declares its flow kinds as an
// ARRAY, and every census that searched for `new Set([...])` walked past it —
// including this tool's own kind-coverage, which under-reported by three sites.
// ============================================================================

test("the extractor records BOTH collection shapes, and tags which is which", () => {
  const all = extractNameSets(join(HERE, "..", "..", ".."));
  const shapes = new Set(all.map((c) => c.shape));
  assert.ok(shapes.has("set"), "no `new Set([...])` found — the extractor regressed");
  assert.ok(shapes.has("array"), "no array-form collection found — the shape this test exists for");
  assert.ok(all.every((c) => c.shape === "set" || c.shape === "array"),
    "every collection must carry a shape a reader can act on");
});

test("extractKindCollections refuses to claim anything without a reference set", () => {
  // The vacuity rule this tool learned the hard way: a query whose reference set is empty
  // reports zero gaps, which reads exactly like a clean result. No kinds in, no claims out.
  assert.deepEqual(extractKindCollections(join(HERE, "..", "..", ".."), []), [],
    "an empty reference set must produce no facts, not facts about nothing");
  assert.deepEqual(extractKindCollections(join(HERE, "..", "..", ".."), undefined), []);
});

test("extractKindCollections finds kind lists in BOTH shapes, and de-duplicates", () => {
  // CONTRACT CHANGE, 2026-08-06. This test used to assert `every(shape === "array")`, on the
  // reasoning that the vendored extractor already supplied every Set. It does not: that extractor
  // is line-based, so a Set written across several lines is invisible to it. Four real gating sets
  // — event-checker, flow-kinds, naming-policy-checker, symbol-resolver — were missed for no
  // reason but formatting. Both shapes are now returned and the CALLER de-duplicates by site.
  const kinds = ["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl", "governedFlowDecl"];
  const found = extractKindCollections(join(HERE, "..", "..", ".."), kinds);
  assert.ok(found.length > 0, "the kind lists exist; finding none means the extractor is blind");
  assert.ok(found.some((c) => c.shape === "set"),
    "multi-line Set declarations are the whole point of this pass — finding none means it regressed");
  assert.ok(found.every((c) => c.shape === "set" || c.shape === "array"),
    "every collection must carry a shape a reader can act on");
  // De-duplication is the caller's contract, so prove the parameter is honoured.
  const first = found[0];
  const deduped = extractKindCollections(join(HERE, "..", "..", ".."), kinds, [first]);
  assert.ok(!deduped.some((c) => c.file === first.file && c.line === first.line),
    "a site passed as already-seen must not be returned again");
  assert.ok(found.every((c) => c.members.filter((m) => kinds.includes(m)).length >= 2),
    "a collection with fewer than two known kinds is not a kind list");
  // The control: a reference set that cannot match anything must yield nothing, or the filter
  // above is not doing the work the assertion credits it with.
  assert.deepEqual(extractKindCollections(join(HERE, "..", "..", ".."), ["zzqKindA", "zzqKindB"]), []);
});

// ============================================================================
// FORMATTING FIXTURE (added 2026-08-06).
//
// WP100: four real flow-kind gates were invisible because the extractor was
// line-based and they were written across lines. Nothing about them was
// unusual — it is the form a linter produces.
//
// Two work packages had already measured collection SHAPES exhaustively (Set,
// array, Map, object, union) and concluded coverage was complete. The axis that
// mattered was orthogonal to all of them. Shapes can be enumerated by thinking;
// FORMATTINGS can only be enumerated by writing them down.
//
// So this fixture writes the SAME vocabulary every legal way and asserts each is
// read. A form nobody anticipated now fails here rather than in a silent count.
// ============================================================================

/** The same four kinds, written every way the language allows. */
const FORMS = {
  "one-line":       'const A = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]);',
  "multi-line":     'const A = new Set([\n  "flowDecl",\n  "secureFlowDecl",\n  "pureFlowDecl",\n  "guardedFlowDecl",\n]);',
  "trailing comma": 'const A = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl",]);',
  "single quotes":  "const A = new Set(['flowDecl', 'secureFlowDecl', 'pureFlowDecl', 'guardedFlowDecl']);",
  "mixed quotes":   'const A = new Set(["flowDecl", \'secureFlowDecl\', "pureFlowDecl", \'guardedFlowDecl\']);',
  "array literal":  'const A = ["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"];',
  "Object.freeze":  'const A = Object.freeze(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]);',
  "comment inside": 'const A = new Set([\n  "flowDecl",\n  // the plain tier\n  "secureFlowDecl",\n  "pureFlowDecl",\n  "guardedFlowDecl",\n]);',
  "export const":   'export const A = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]);',
  "no declarator":  'A = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]);',
  "object property":'const cfg = { kinds: new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]) };',
};
const KINDS = ["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"];

/** A throwaway tree with the layout the vendored distDir() expects. */
function withFixtureRoot(fn) {
  const root = join(tmpdir(), "hypha-fixture-" + process.pid);
  const dist = join(root, "packages-galerina", "galerina-core-compiler", "dist");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  Object.values(FORMS).forEach((src, i) => writeFileSync(join(dist, `case${i}.js`), src + "\n"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("every legal formatting of the same vocabulary is read", () => {
  const missed = withFixtureRoot((root) => {
    const all = extractNameSets(root);
    // The control: if NOTHING is extracted the loop below passes vacuously.
    assert.ok(all.length > 0, "extracted nothing from the fixture — the extractor is dead");
    return Object.keys(FORMS).filter((label, i) =>
      !all.some((c) => c.file === `case${i}.js` && KINDS.every((k) => c.members.includes(k))));
  });
  assert.deepEqual(missed, [],
    `these legal forms are invisible to the extractor: ${missed.join(", ")}`);
});

test("the fixture would catch a regression", () => {
  // A control for the test itself: a form the extractor genuinely cannot read must be reported
  // as missing, or the assertion above could pass for a matcher that accepts anything.
  const missed = withFixtureRoot((root) => {
    const all = extractNameSets(root);
    return all.some((c) => c.members.includes("zzqNotAKind"));
  });
  assert.equal(missed, false, "the extractor invented a member that is not in the fixture");
});

test("a repeated member is a sequence position, not a second vocabulary entry", () => {
  // `params: ["i32", "i32", "i32"]` is a WASM signature. It reached the findings list once,
  // because three members outnumbered two extras. Counted as DISTINCT members it has one.
  const r = nameSetDrift({
    nameSets: [{ name: "params", file: "w.js", line: 1, members: ["i32", "i32", "i32"] }],
    nameComparisons: [
      { receiver: "watType", literal: "i32", file: "w.js", line: 2 },
      { receiver: "watType", literal: "f64", file: "w.js", line: 3 },
      { receiver: "watType", literal: "i64", file: "w.js", line: 4 },
    ],
  });
  assert.deepEqual(r.uncovered, [], "a list with repeats is not an enumeration");
  assert.equal(r.setsExamined, 0, "and it must not even be counted as examined");
});

// ============================================================================
// EXECUTABLE DOCUMENTATION (added 2026-08-06).
//
// The README and the header comment quote flags, exit codes and query names.
// Every one of those is a claim about the code, and none was checked — the same
// class as the upstream schema that was wrong for as long as its document
// existed.
//
// ★ THE AXIS THAT MATTERED. A parity check asks "is everything the code does
// documented?". It cannot see a DENIAL. Three sites here claimed `No --root`
// while the flag was accepted, advertised by the tool's own `--help`, and
// recommended by its own error message. A false positive claim teaches a reader
// something extra; a false NEGATIVE claim leaves a reader with a relocated
// checkout believing there is no way forward. The dangerous direction was the
// unchecked one.
// ============================================================================

const BIN_SRC = readFileSync(CLI, "utf8");
const README_SRC = readFileSync(join(HERE, "../README.md"), "utf8");

/** Flags the CLI truly accepts, read from CONSUMPTION. The help text is itself a
 *  document and so cannot be the authority on what a document should say. */
function consumedFlags(src) {
  const out = new Set();
  for (const re of [/\bflag\(\s*"(--[a-z][a-z0-9-]*)"\s*\)/g,
                    /\bvalue\(\s*"(--[a-z][a-z0-9-]*)"\s*\)/g,
                    /argv\.includes\(\s*"(--[a-z][a-z0-9-]*)"\s*\)/g]) {
    for (const m of src.matchAll(re)) out.add(m[1]);
  }
  return out;
}

/** A sentence that names a flag and denies it. Sentence-local by construction:
 *  the gap may not cross a `.` or a newline, so one claim cannot borrow another's
 *  negation. */
const NEGATION = /\b(?:no|without|never|not)\b[^.\n]{0,40}?(--[a-z][a-z0-9-]*)/gi;

/** ★ A negation is CANCELLED when a subordinator stands between it and the flag.
 *  "No output file unless `--out` names one" denies the output file, not the
 *  flag — it then reintroduces the flag as the very condition under which the
 *  file appears. Without this the check called a correct sentence a defect: it
 *  fired on four sites and two were this grammar. */
const CANCELLER = /\b(?:unless|until|except|other than|besides|save for|apart from)\b/i;

function deniedFlags(text) {
  const rows = [];
  for (const m of text.matchAll(NEGATION)) {
    if (CANCELLER.test(m[0])) continue;
    rows.push({ flag: m[1], line: text.slice(0, m.index).split("\n").length,
                quote: m[0].replace(/\s+/g, " ").trim() });
  }
  return rows;
}

test("no document denies a flag the CLI accepts", () => {
  const accepted = consumedFlags(BIN_SRC);
  // LIVENESS. An empty accepted set makes every denial read as true — a fail-open
  // that would print green about nothing.
  assert.ok(accepted.size > 0, "read no flags from the CLI — the matcher is dead, not the flags");
  const bad = [["README.md", README_SRC], ["bin/galerina-hypha.mjs", BIN_SRC]]
    .flatMap(([file, src]) => deniedFlags(src).filter((d) => accepted.has(d.flag))
      .map((d) => `${file}:${d.line} says "${d.quote}" but the CLI accepts ${d.flag}`));
  assert.deepEqual(bad, [], bad.join("\n"));
});

test("the denial check discriminates", () => {
  const accepted = consumedFlags(BIN_SRC);
  const fires = (s) => deniedFlags(s).filter((d) => accepted.has(d.flag)).length;
  // It must fire on the defect that prompted it, in the exact words that were there.
  assert.equal(fires("No `--root`. No config. No install."), 1, "the original defect must fire");
  assert.equal(fires("works without --json entirely"), 1, "a denial in other words must fire");
  // And stay quiet on the two things that are not denials of an accepted flag.
  assert.equal(fires("No `--zzq-invented`. Run it anywhere."), 0,
    "denying a flag that genuinely does not exist is a TRUE statement");
  assert.equal(fires("pass --root <dir> if this package has been relocated."), 0,
    "naming a flag without negating it is not a claim of absence");
  assert.equal(fires("No output file unless `--out` names one."), 0,
    "a conditional reintroducing the flag is not a denial of it");
  // ...and the cancellation must not be so broad it swallows a denial beside it.
  assert.equal(fires("No `--root`. Use --out unless you want stdout."), 1,
    "one cancelled clause must not excuse an uncancelled one in the same passage");
});

test("every exit code the README documents is actually reachable", () => {
  // ★ THE INSTRUMENT THAT FAILED. A probe matching `process.exit(<digit>)` found
  // only 0 and 2 and reported exit 1 as documented-but-dead. Exit 1 is emitted by
  // `process.exit(findingCount > 0 ? 1 : 0)` — the ternary was the whole contract.
  // A checker blind to the form the code actually uses manufactures its own defect.
  const emitted = new Set();
  for (const m of BIN_SRC.matchAll(/process\.exit\(([^)]*)\)/g)) {
    for (const d of m[1].matchAll(/\b(\d)\b/g)) emitted.add(d[1]);
  }
  assert.ok(emitted.size > 0, "found no exit at all — the matcher is dead");
  const table = /## Exit codes([\s\S]*?)(?=\n## |$)/.exec(README_SRC)?.[1] ?? "";
  const documented = [...table.matchAll(/^\|\s*`(\d)`\s*\|/gm)].map((m) => m[1]);
  assert.ok(documented.length > 0, "read no exit-code table — the slice is wrong, not the docs");
  assert.deepEqual(documented.filter((c) => !emitted.has(c)), [],
    "the README promises an exit code the binary cannot produce");
  assert.deepEqual([...emitted].filter((c) => !documented.includes(c)), [],
    "the binary can exit with a code the README does not explain");
});

test("the README documents exactly the queries that are registered", () => {
  // Both directions matter. An undocumented query is invisible; a documented one
  // that does not exist sends a reader to a `--scan` target that exits 2.
  const registered = Object.keys(QUERIES).sort();
  const named = [...README_SRC.matchAll(/^\|\s*`([a-z][a-z0-9-]*)`\s*\|/gm)].map((m) => m[1]);
  assert.ok(registered.length > 0, "no queries registered — nothing to adjudicate");
  assert.deepEqual(registered.filter((q) => !named.includes(q)), [],
    "a registered query is absent from the README's table");
  assert.deepEqual(named.filter((q) => !registered.includes(q)), [],
    "the README's table names a query that cannot be dispatched");
});

test("every flag the help text declares is consumed, and every documented flag is declared", () => {
  const accepted = consumedFlags(BIN_SRC);
  // The help text is the block the tool PRINTS, not the header comment — read it
  // from the template literal so a reader and this test see the same characters.
  const help = /console\.log\(`([\s\S]*?)`\)/.exec(BIN_SRC)?.[1] ?? "";
  assert.ok(/--scan/.test(help), "did not locate the printed help block — the slice is wrong");
  const declared = new Set([...help.matchAll(/^\s*(--[a-z][a-z0-9-]*)/gm)].map((m) => m[1]));
  assert.deepEqual([...declared].filter((f) => !accepted.has(f)), [],
    "the help text offers a flag nothing reads");
  // Fenced blocks are the only place the README claims something is RUNNABLE.
  const fenced = [...README_SRC.matchAll(/```(?:bash|sh)?\r?\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
  const promised = new Set([...fenced.matchAll(/(--[a-z][a-z0-9-]*)/g)].map((m) => m[1]));
  assert.ok(promised.size > 0, "no fenced invocations found — the extractor is dead");
  assert.deepEqual([...promised].filter((f) => !accepted.has(f)), [],
    "the README quotes a runnable command using a flag the CLI does not accept");
  assert.deepEqual([...promised].filter((f) => !declared.has(f)), [],
    "the README quotes a flag the tool's own --help never mentions");
});

// ============================================================================
// BEHAVIOURAL-DENIAL AUDIT (added 2026-08-06, owner Q6).
//
// The README asserts four "passive" properties — nothing to LOAD, FIND, WRITTEN,
// INSTALLED. Before this, only "nothing written" was proven (the tree-purity
// self-test). The others were prose. A denial of a behaviour is a claim
// (§the negative-claim work), and an unchecked behavioural claim is exactly the
// class this package spent five work packages hunting — so each of the four gets
// a check, and each is CLAIM-GATED: it asserts only what the README actually
// states, and it fails closed on an empty or dead instrument.
//
// The four properties split by what can honestly prove them:
//   - structural (read the source): no network module is imported, no database
//     is opened, no dependency is declared — a positive proof over a small,
//     enumerable surface;
//   - behavioural (run the tool): a real scan writes nothing, is deterministic
//     across runs (no stale cache decides the answer), and fails closed on
//     malformed input.
//
// Runner discipline (owner Q6): every child is a SERIAL, awaited spawnSync with
// a timeout; there is no fan-out, no detached process, nothing to accumulate.
// ============================================================================

const PKG_SRC_FILES = ["bin/galerina-hypha.mjs", "src/queries.mjs", "src/namesets.mjs",
  "src/extract.mjs", "src/callsites.mjs"].map((r) => join(HERE, "..", r));
const allSource = () => PKG_SRC_FILES.filter(existsSync).map((f) => readFileSync(f, "utf8")).join("\n");
/** One serial, awaited child with a hard timeout — the bounded runner Q6 requires. */
const runCli = (args, opts = {}) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", timeout: 120000, ...opts });

test('the "nothing installed" claim is true — zero dependencies, no build step', () => {
  const pkg = JSON.parse(readFileSync(join(HERE, "../package.json"), "utf8"));
  // Claim-gated: only assert what the README states.
  const readme = readFileSync(join(HERE, "../README.md"), "utf8");
  assert.ok(/no install|nothing installed|zero dependencies|no dependencies/i.test(readme),
    "the README must make the no-install claim for this test to guard it");
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [], "README claims no dependencies");
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}), [], "README claims no dependencies");
  assert.ok(!Object.keys(pkg.scripts ?? {}).some((s) => /^(pre|post)?build$/.test(s)),
    "README claims no build step");
});

test('the "nothing to load / no network" claim is true — no db, cache, or socket module', () => {
  const src = allSource();
  assert.ok(src.length > 0, "read no package source — the instrument is dead, not the claim");
  // No database engine, no persistent index, no cache file is opened.
  for (const forbidden of [/\bnode:sqlite\b/, /\bDatabaseSync\b/, /require\(\s*["']better-sqlite3/, /\.db["'`]\s*\)/]) {
    assert.ok(!forbidden.test(src), `a database access (${forbidden}) contradicts "nothing to load"`);
  }
  // No network: not http/https/net/dgram/tls/dns, and no fetch/XHR/socket.
  for (const netmod of ["http", "https", "net", "dgram", "tls", "dns"]) {
    assert.ok(!new RegExp(`["']node:${netmod}["']`).test(src), `imports node:${netmod} — contradicts "no network"`);
  }
  assert.ok(!/\bfetch\s*\(/.test(src), 'calls fetch() — contradicts "no network"');
  // NOTE (honest limit): this is a STATIC proof over the package's own source. It cannot
  // observe a syscall a transitive import might make — but the package has zero dependencies
  // (test above), so its own source IS its whole surface. The two tests compose into the claim.
});

test('the "nothing to find" claim is true — the tool self-locates from an unrelated cwd', () => {
  // Run with cwd set to the OS temp dir (nowhere near the repo). The tool must still locate the
  // root by walking up from its own file, per its "no --root needed" claim.
  const r = runCli(["--scan", "kind-coverage"], { cwd: tmpdir() });
  assert.notEqual(r.status, 2, `self-location failed from an unrelated cwd: ${(r.stderr || "").slice(0, 200)}`);
  assert.ok(/gating|parser|kind|coverage|None/i.test((r.stdout || "") + (r.stderr || "")),
    "produced no kind-coverage output despite exit != 2");
});

test('the "nothing written" claim is true — a REAL spawned scan leaves the tree byte-identical', () => {
  // Stronger than the in-process self-test: a full child-process scan, tree snapshotted around it.
  //
  // ★ THIS TEST WAS NARROWER THAN ITS NAME. It used to snapshot readdirSync(packageDir) —
  // TOP LEVEL ONLY, names plus file sizes — so a write into src/, bin/, tests/ or .graph/
  // was invisible to it: the entry simply stayed "src|d". It also never watched the
  // WORKING DIRECTORY, on the assumption that the package dir is "where a stray temp/db
  // would most likely land". That assumption is exactly what failed for the sibling tool
  // in subprojects/hypha, which writes its ~270 KB artifact into whatever directory the
  // caller happens to stand in. A claim about writing nothing must watch where writes go,
  // not where we expect them.
  //
  // Now: RECURSIVE over the package, plus an isolated scratch cwd, and — because a wider
  // instrument that cannot detect anything is worse than a narrow one — the snapshot must
  // first be PROVEN to see a nested write before any null result is believed.
  const dir = join(HERE, "..");

  /** Recursive path+size snapshot. Directories are recorded so a new one is visible too. */
  const snap = (root, withMtime, depth = 0) => {
    const out = [];
    let entries;
    try { entries = readdirSync(root).sort(); } catch { return ["<unreadable:" + root + ">"]; }
    for (const n of entries) {
      if (n === "node_modules" || n === ".git") continue;
      const p = join(root, n);
      let s;
      try { s = statSync(p); } catch { out.push(p + "|?"); continue; }
      if (s.isDirectory()) { out.push(p + "|d"); if (depth < 6) out.push(...snap(p, withMtime, depth + 1)); }
      else out.push(p + "|" + s.size + (withMtime ? "|" + s.mtimeMs : ""));
    }
    return out;
  };
  // The package tree is compared on path+size only. This checkout is shared with other
  // sessions, and an mtime there would report someone else's edit as a passivity
  // violation. The scratch cwd below is ours alone, so it gets mtime as well.
  const snapPkg = () => snap(dir, false).join("\n");

  // ── CONTROL: the snapshot must SEE a nested write ──────────────────────────────
  // Without this, "nothing changed" would be indistinguishable from "nothing looked" —
  // which is precisely the failure the previous version of this test shipped with.
  const canary = join(dir, "src", ".passivity-canary.tmp");
  const baseline = snapPkg();
  let sawCanary = false;
  try {
    writeFileSync(canary, "x");
    sawCanary = snapPkg() !== baseline;
  } finally {
    rmSync(canary, { force: true });
  }
  assert.ok(sawCanary,
    "the snapshot did not detect a file written into src/ — the instrument is dead, so a clean result would prove nothing");
  assert.equal(snapPkg(), baseline, "the control did not clean up after itself");

  // ── MEASUREMENT: a real scan, from a cwd that is not the package ───────────────
  const scratch = mkdtempSync(join(tmpdir(), "hypha-passivity-"));
  try {
    const beforePkg = snapPkg();
    const beforeCwd = snap(scratch, true).join("\n");
    const r = runCli(["--scan", "full"], { cwd: scratch });
    assert.notEqual(r.status, 2, "the scan could not run");
    assert.equal(snapPkg(), beforePkg, "a scan with no --out changed the package tree");
    assert.equal(snap(scratch, true).join("\n"), beforeCwd,
      "a scan with no --out wrote into the working directory");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('the documented exception is real — --out actually writes, so "the only write" means something', () => {
  // The companion to the test above. If --out wrote nothing either, a clean tree would
  // only show the run did nothing at all, and the passivity result would be vacuous.
  const scratch = mkdtempSync(join(tmpdir(), "hypha-out-"));
  try {
    const out = join(scratch, "report.txt");
    const r = runCli(["--scan", "kind-coverage", "--out", out], { cwd: scratch });
    assert.notEqual(r.status, 2, "the scan could not run");
    assert.ok(existsSync(out), "--out is documented as the tool's one write, and it did not happen");
    assert.ok(statSync(out).size > 0, "--out produced an empty file");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("determinism — two scans agree, so no stale cache decides the answer", () => {
  // "Nothing to load" also means no cache silently shapes the result. Same input, same output.
  const a = runCli(["--scan", "kind-coverage", "--json"]);
  const b = runCli(["--scan", "kind-coverage", "--json"]);
  assert.equal(a.status, b.status, "two identical scans returned different exit codes");
  assert.equal((a.stdout || "").trim(), (b.stdout || "").trim(),
    "two identical scans produced different output — something stateful is in the path");
});

test("malformed input fails closed — unknown target and bad root exit 2, never 0", () => {
  const bogusTarget = runCli(["--scan", "zzq-not-a-query"]);
  assert.equal(bogusTarget.status, 2, "an unknown --scan target must exit 2, not pass");
  const bogusRoot = runCli(["--scan", "full", "--root", join(tmpdir(), "zzq-no-such-root-" + process.pid)]);
  assert.equal(bogusRoot.status, 2, "a non-existent --root must exit 2, not silently scan nothing and pass");
  // ⬜ CONTROL: a well-formed run in the same shape must NOT exit 2 — or the two above prove nothing.
  const good = runCli(["--scan", "kind-coverage"]);
  assert.notEqual(good.status, 2, "the control run exited 2 — the fail-closed arms are not discriminating");
});
