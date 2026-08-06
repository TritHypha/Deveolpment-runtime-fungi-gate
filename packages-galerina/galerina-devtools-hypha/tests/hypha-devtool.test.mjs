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
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { duplicateSets, kindCoverage, deadExports, surface } from "../src/queries.mjs";

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
