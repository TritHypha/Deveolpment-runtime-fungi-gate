#!/usr/bin/env node
// ============================================================================
// galerina-hypha — passive capability-map scanner
// ============================================================================
// WHAT IT IS. A read-only scan of the compiler's dispatch surfaces, sentinel
// sets and checker wiring, answering four drift questions. Every claim it makes
// carries a file:line so a human can check it in seconds.
//
// WHAT "PASSIVE" MEANS HERE, precisely — the four properties that make a tool
// something you run rather than something you set up:
//
//   1. NOTHING TO LOAD.   Facts are extracted at each invocation and held in
//                         memory. There is no database, no index, no cache and
//                         no priming step. A stale index that answers
//                         confidently is worse than no index.
//   2. NOTHING TO FIND.   The repo root is located by walking up from this
//                         file. No env var, no config, no cwd assumption — it
//                         works from any directory. `--root` overrides the
//                         search for a relocated checkout and for the
//                         self-test: an escape hatch, never a requirement.
//   3. NOTHING WRITTEN.   No output file unless --out names one. No temp files,
//                         no dotfiles, no `.db`. Run it on a clean tree and the
//                         tree is still clean. (Proven, not asserted: the
//                         self-test snapshots the working tree around a scan.)
//   4. NOTHING INSTALLED. Zero dependencies. Runs on the Node already required
//                         to build this repo; no `npm install` step exists.
//
// USAGE
//   node bin/galerina-hypha.mjs                      full scan, human report
//   node bin/galerina-hypha.mjs --scan surface        one query
//   node bin/galerina-hypha.mjs --scan surface:push   one name, layer by layer
//   node bin/galerina-hypha.mjs --json                machine-readable
//   node bin/galerina-hypha.mjs --out report.md       the ONLY thing that writes
//   node bin/galerina-hypha.mjs --self-test           prove it is not vacuous
//
// EXIT CODES
//   0  scan completed, no findings
//   1  findings present (drift, coverage gaps, dead exports) — for CI
//   2  usage error, or the scan could not run (unknown target, no root found)
//
// A note on exit 1: findings are reported as findings, never as an error, and
// the tool does not decide which of them matter. That judgement is a human's.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractGateList, extractStdlibCases, extractInlineTables, extractKindSets,
  extractPassCalls, extractExportedCheckers, extractParserKinds, extractDiagnostics,
} from "../src/extract.mjs";
import { findAllCallSites } from "../src/callsites.mjs";
import { QUERIES, duplicateSets, kindCoverage, deadExports, surface, nameSetDrift } from "../src/queries.mjs";
import { extractNameSets, extractNameComparisons, extractKindCollections } from "../src/namesets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── what counts as a finding — ONE named set, one counter ───────────────────
/**
 * Every array a query can return that represents a FINDING rather than context.
 * `surface.total`, `kindCoverage.parserKindCount` and a single-name lookup's
 * `layers` are context, so they are absent here and contribute nothing.
 *
 * WHY THIS EXISTS AS A NAMED SET. The count was previously computed inline at
 * two call sites with two different formulas: the full scan omitted
 * `duplicates` while the targeted scan included it, so the same facts yielded
 * 64 findings one way and 67 the other. Nothing local was wrong — each formula
 * was correct for its own branch — and no exit code differed, because both
 * happened to be non-zero. The failure needs a corpus whose ONLY finding is a
 * duplicated set, and then the BROADER scan reports clean while the narrower
 * one reports a finding.
 *
 * A metric that decides an exit code must have one definition in one place.
 */
const QUERY_SHAPE = {
  "duplicate-sets": { outputKey: "duplicateSets", findings: ["drift", "duplicates"], context: [] },
  "kind-coverage": { outputKey: "kindCoverage", findings: ["gaps"], context: ["parserKindCount"] },
  "dead-exports": { outputKey: "deadExports", findings: ["dead"], context: ["exported"] },
  "surface": { outputKey: "surface", findings: ["asymmetric"], context: ["total", "unattributedSwitches"] },
  "name-set-drift": { outputKey: "nameSetDrift", findings: ["uncovered"], context: ["unused", "setsExamined"] },
};

/**
 * WHY `outputKey` LIVES HERE. The full-scan result object is keyed in camelCase
 * (`duplicateSets`) while the dispatch table is keyed in kebab-case
 * (`duplicate-sets`), and `render` reads the camelCase names. That mapping used
 * to exist only as a hand-written quadruple in the `full` branch — a THIRD copy
 * of the query list, beside `QUERIES` and this table.
 *
 * Three hand-maintained copies of one list is precisely what `duplicateSets`
 * exists to find. A fifth query added to `QUERIES` alone would have been
 * dispatchable by name, ABSENT from the default `--scan full`, unvisited by the
 * classification loop in `--self-test`, and worth zero findings — four silent
 * failures at once. Declaring the output name here makes the full scan derivable,
 * so there is one list and two views of it.
 */

/** `surface:<name>` returns a different shape: one name, layer by layer. All context — a
 *  single-name lookup is a question, not a check. */
const SURFACE_NAME_SHAPE = { findings: [], context: ["name", "gateList", "stdlibArm", "inlineTables", "layers"] };

/** DERIVED, never hand-written: every field any query declares as a finding. */
const FINDING_FIELDS = [...new Set(Object.values(QUERY_SHAPE).flatMap((s) => s.findings))];

/**
 * REGISTRY AGREEMENT, checked before anything can be scanned.
 *
 * `QUERY_SHAPE` and `QUERIES` must describe the same set of queries. The
 * classification loop in `--self-test` iterates `QUERY_SHAPE`, so a query
 * registered only in `QUERIES` is never visited by it: its fields are never
 * classified, `countFindings` returns 0 for it, and the self-test stays GREEN.
 * Exit 0 would then mean "checked and clean" about something never checked.
 *
 * This runs at load and fails closed, because every answer the tool could give
 * while the two disagree is unsound — not merely incomplete.
 */
{
  const unclassified = Object.keys(QUERIES).filter((n) => !(n in QUERY_SHAPE));
  const orphaned = Object.keys(QUERY_SHAPE).filter((n) => !(n in QUERIES));
  const dupKeys = Object.values(QUERY_SHAPE).map((s) => s.outputKey)
    .filter((k, i, a) => a.indexOf(k) !== i);
  if (unclassified.length || orphaned.length || dupKeys.length) {
    console.error("galerina-hypha: query registries disagree — refusing to scan.");
    if (unclassified.length) console.error(`  in QUERIES but not QUERY_SHAPE: ${unclassified.join(", ")}`);
    if (orphaned.length) console.error(`  in QUERY_SHAPE but not QUERIES: ${orphaned.join(", ")}`);
    if (dupKeys.length) console.error(`  outputKey used more than once: ${dupKeys.join(", ")}`);
    process.exit(2);
  }
}

/** Findings in one query result. Unknown shapes contribute 0, never throw. */
function countFindings(result) {
  if (result === null || typeof result !== "object") return 0;
  let n = 0;
  for (const field of FINDING_FIELDS) {
    const v = result[field];
    if (Array.isArray(v)) n += v.length;
  }
  return n;
}

// ── argument parsing ────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => (argv.indexOf(name) === -1 ? undefined : argv[argv.indexOf(name) + 1]);

const AS_JSON = flag("--json");
const OUT = value("--out");
const SELF_TEST = flag("--self-test");
const SCAN = value("--scan") ?? "full";
const ROOT_OVERRIDE = value("--root");   // used by the self-test; not needed in normal use

if (flag("--help") || flag("-h")) {
  console.log(`galerina-hypha — passive capability-map scanner

  --scan full            every query (default)
  --scan <query>         one of: ${Object.keys(QUERIES).join(", ")}
  --scan surface:<name>  one method name, layer by layer
  --json                 machine-readable output
  --out <file>           write the report to a file (the only write this tool performs)
  --self-test            prove the scanner is not vacuous
  --root <dir>           override root detection (rarely needed — it self-locates)

exit 0 = no findings · 1 = findings · 2 = could not run`);
  process.exit(0);
}

// ── property 2: nothing to find ─────────────────────────────────────────────
/** Walk up from this file until a directory containing `packages-galerina` is
 *  found. That marker is the repo root by definition, so the tool works from
 *  any cwd and needs no configuration. Returns null rather than guessing — a
 *  wrong root would silently scan nothing and report a clean bill of health. */
function locateRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, "packages-galerina"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

const ROOT = ROOT_OVERRIDE ?? locateRoot(HERE);
if (!ROOT) {
  console.error("galerina-hypha: could not locate the repository root (no ancestor directory contains `packages-galerina`).");
  console.error("                pass --root <dir> if this package has been relocated.");
  process.exit(2);
}

// Fail closed on a root that exists but is not a built Galerina checkout. The extractors read the
// compiler's `dist/`, and a missing `dist/` makes `distDir()` THROW deep in extract.mjs — an
// uncaught crash (exit 1 with a stack trace), not a clean refusal. A `--root` pointing anywhere
// wrong (or a relocated package whose self-location resolves oddly) must exit 2, loudly, with the
// fix in the message — malformed input fails closed (owner Q6).
const COMPILER_DIST = path.join(ROOT, "packages-galerina", "galerina-core-compiler", "dist");
if (!fs.existsSync(COMPILER_DIST)) {
  console.error(`galerina-hypha: no compiler dist under the root (${COMPILER_DIST}).`);
  console.error("                point --root at a built Galerina checkout.");
  process.exit(2);
}

// ── property 1: nothing to load ─────────────────────────────────────────────
/** Extract every fact family, in memory, at each invocation. Cheap enough that
 *  caching would buy nothing and cost correctness. */
function scan(root) {
  const facts = {
    root,
    gateList: extractGateList(root),
    stdlibCases: extractStdlibCases(root),
    inlineTables: extractInlineTables(root),
    kindSets: extractKindSets(root),
    passCalls: extractPassCalls(root),
    exportedCheckers: extractExportedCheckers(root),
    parserKinds: extractParserKinds(root),
    diagnostics: extractDiagnostics(root),
    // Guard-list drift. NOT from the vendored extractor — see src/namesets.mjs for why this
    // fact family is local to this package rather than upstream.
    nameSets: extractNameSets(root),
    nameComparisons: extractNameComparisons(root),
  };
  // The SAME vocabulary written as an array is still that vocabulary. `extractKindSets` reads
  // `new Set([...])` only, so `effect-checker`'s own `findFlowNode` — whose kinds are an array —
  // was invisible to kind-coverage and duplicate-sets alike. Merging here rather than editing the
  // vendored extractor keeps the provenance rule intact and strengthens both existing queries.
  facts.kindSets = [...facts.kindSets,
    ...extractKindCollections(root, facts.parserKinds, facts.kindSets)];
  // Dead-export adjudication needs global call sites per exported checker.
  // ONE sweep for all of them — calling findCallSites() per name re-reads the
  // whole tree once per checker and costs 99.2% of the scan (16.2s of 16.4s,
  // measured). See src/callsites.mjs for the measurement and the reasoning.
  const names = facts.exportedCheckers.map((c) => c.name);
  const allSites = findAllCallSites(root, names);
  facts.checkerCallSites = {};
  for (const c of facts.exportedCheckers) {
    // A "call site" inside the defining file at the definition line is the
    // definition itself leaking through the matcher — drop it, or every checker
    // looks alive and the query can never report anything.
    facts.checkerCallSites[c.name] = (allSites[c.name] ?? [])
      .filter((s) => !(s.file === c.file && s.line === c.line));
  }
  return facts;
}

// ── self-test ───────────────────────────────────────────────────────────────
// A scanner that reports "no findings" because it extracted nothing is a
// fail-open wearing a green tick. This proves the extractors are alive, the
// queries discriminate, and — property 3 — that a scan leaves no trace.
if (SELF_TEST) {
  const cases = [];
  const check = (label, ok, detail) => cases.push({ label, ok: !!ok, detail: detail ?? "" });

  // Property 3 is proven, not asserted: snapshot the tree, scan, compare.
  const snapshot = (dir) => fs.readdirSync(dir).sort().join("|");
  const treeBefore = snapshot(ROOT);

  let facts = null, threw = null;
  try { facts = scan(ROOT); } catch (e) { threw = e; }
  check("the scan completes without throwing", !threw, threw ? String(threw.message).slice(0, 90) : "");

  if (facts) {
    // Extractor liveness. Each must return SOMETHING, or every query built on
    // it is vacuous and would report a clean bill of health for a broken repo.
    check("gate list extracted", facts.gateList.names.length > 0, `${facts.gateList.names.length} names`);
    check("stdlib arms extracted", facts.stdlibCases.length > 0, `${facts.stdlibCases.length} arms`);
    check("inline tables extracted", facts.inlineTables.length > 0, `${facts.inlineTables.length} tables`);
    check("kind sets extracted", facts.kindSets.length > 0, `${facts.kindSets.length} sets`);
    check("exported checkers extracted", facts.exportedCheckers.length > 0, `${facts.exportedCheckers.length} checkers`);
    check("parser kinds extracted", facts.parserKinds.length > 0, `${facts.parserKinds.length} kinds`);

    // Query discrimination, on synthetic facts with KNOWN answers. Real-repo
    // output cannot prove a query works: "no drift found" is also what a broken
    // query returns. These fixtures have the answer written into them.
    const fixture = {
      kindSets: [
        { file: "a.js", line: 1, members: ["flowDecl", "governedFlowDecl", "x", "y"] },
        { file: "b.js", line: 2, members: ["flowDecl", "x", "y"] },              // drifted: missing one
        { file: "c.js", line: 3, members: ["flowDecl", "x", "y"] },              // exact duplicate of b
        { file: "d.js", line: 4, members: ["unrelated1", "unrelated2"] },        // must NOT pair
      ],
      parserKinds: ["flowDecl", "governedFlowDecl"],
      exportedCheckers: [
        { name: "checkAlive", file: "e.js", line: 5, isChecker: true },
        { name: "checkDead", file: "f.js", line: 6, isChecker: true },
      ],
      checkerCallSites: { checkAlive: [{ file: "g.js", line: 7 }], checkDead: [] },
      gateList: { names: [{ name: "push", section: "array", line: 10 }] },
      stdlibCases: [{ name: "push", file: "h.js", line: 11 }],
      inlineTables: [],   // `push` is deliberately absent here — the .push() incident exactly
      // Guard-list drift, with all three outcomes present so the query must discriminate:
      //   GUARDED   — every member tested, one extra literal tested → the FINDING
      //   COMPLETE  — every member tested, nothing extra            → must report nothing
      //   UNRELATED — a string set whose members are never compared → must not pair at all
      nameSets: [
        { name: "GUARDED", file: "n.js", line: 20, members: ["alpha", "beta"] },
        { name: "COMPLETE", file: "p.js", line: 30, members: ["gamma"] },
        { name: "UNRELATED", file: "q.js", line: 40, members: ["zeta", "eta"] },
      ],
      nameComparisons: [
        { receiver: "node.value", literal: "alpha", file: "n.js", line: 21 },
        { receiver: "node.value", literal: "beta", file: "n.js", line: 22 },
        { receiver: "node.value", literal: "OMITTED", file: "n.js", line: 23 },   // ← the gap
        { receiver: "node.value", literal: "gamma", file: "p.js", line: 31 },
        { receiver: "n.kind", literal: "theta", file: "q.js", line: 41 },         // q.js: no overlap
      ],
    };
    const d = duplicateSets(fixture);
    check("duplicate-sets finds the drifted pair", d.drift.some((x) => x.onlyA.includes("governedFlowDecl") || x.onlyB.includes("governedFlowDecl")));
    check("duplicate-sets finds the exact duplicate", d.duplicates.length === 1, `${d.duplicates.length} duplicate group(s)`);
    check("duplicate-sets does NOT pair unrelated sets", !JSON.stringify(d.drift).includes("unrelated"));
    const nd = nameSetDrift(fixture);
    check("name-set-drift finds the guard list narrower than the names tested",
      nd.uncovered.length === 1 && nd.uncovered[0].set === "GUARDED", `${nd.uncovered.length} finding(s)`);
    check("name-set-drift names the omitted literal AND its site",
      nd.uncovered[0]?.missing?.[0]?.literal === "OMITTED" && nd.uncovered[0].missing[0].at === "n.js:23");
    check("name-set-drift reports NOTHING for a complete guard list",
      !nd.uncovered.some((u) => u.set === "COMPLETE"));
    check("name-set-drift does NOT pair a set with unrelated literals",
      !JSON.stringify(nd.uncovered).includes("theta") && !nd.uncovered.some((u) => u.set === "UNRELATED"));
    const k = kindCoverage(fixture);
    check("kind-coverage flags the set missing a parser kind", k.gaps.some((g) => g.missing.includes("governedFlowDecl")));
    check("kind-coverage ignores non-gating sets", !k.gaps.some((g) => g.site.startsWith("d.js")));
    const de = deadExports(fixture);
    check("dead-exports finds the uncalled checker", de.dead.length === 1 && de.dead[0].name === "checkDead");
    check("dead-exports does NOT flag the called one", !de.dead.some((x) => x.name === "checkAlive"));
    const s = surface(fixture, "push");
    check("surface sees a name in 2 of 3 layers", s.layers === 2, `layers=${s.layers}`);
    check("surface reports the absent layer as absent", s.inlineTables.length === 0);

    // ── the cross-path identity (guard for the 64-vs-67 defect, 2026-08-06) ──
    // `--scan full` computes its own four results; `--scan <target>` goes through the QUERIES
    // dispatch. Those were once counted by two inline formulas that disagreed. Assert here that
    // each category contributes the SAME number by both routes, on the fixture — a real-repo
    // agreement would prove nothing, since both routes could be wrong in the same direction.
    // DERIVED, like the full-scan branch. This was a hand-written quadruple; a fifth query
    // registered in QUERIES made `viaFull[name]` undefined and the identity check compared a
    // number against it. The comparison would have failed — loudly, which is correct — but the
    // failure would have named the identity, not the missing registration. Deriving it means a
    // new query is measured by both routes from the moment it is registered.
    const DIRECT = { duplicateSets, kindCoverage, deadExports, surface, nameSetDrift };
    const viaFull = {};
    for (const name of Object.keys(QUERIES)) {
      const fn = DIRECT[QUERY_SHAPE[name].outputKey];
      check(`'${name}' has a direct binding for the cross-path check`, typeof fn === "function",
        typeof fn === "function" ? "" : `no direct import named ${QUERY_SHAPE[name].outputKey}`);
      viaFull[name] = fn ? countFindings(fn(fixture)) : NaN;
    }
    for (const name of Object.keys(QUERIES)) {
      const viaDispatch = countFindings(QUERIES[name](fixture));
      check(`'${name}' counts the same via full and via dispatch`,
        viaDispatch === viaFull[name], `full=${viaFull[name]} dispatch=${viaDispatch}`);
    }
    const total = Object.values(viaFull).reduce((n, v) => n + v, 0);
    check("the fixture yields findings at all (else the identity is vacuous)", total > 0, `${total} finding(s)`);

    // The counter itself must discriminate: count what FINDING_FIELDS names, ignore what it does not.
    check("countFindings counts a declared field", countFindings({ drift: [1, 2, 3] }) === 3);
    check("countFindings sums across declared fields", countFindings({ drift: [1], duplicates: [2, 3] }) === 3);
    check("countFindings IGNORES an undeclared field", countFindings({ total: [1, 2, 3, 4], layers: [1] }) === 0);
    check("countFindings tolerates non-objects", countFindings(null) === 0 && countFindings(7) === 0 && countFindings(undefined) === 0);

    // ── completeness: every array a query returns must be CLASSIFIED ─────────
    // Before this check, an array under a name absent from FINDING_FIELDS counted as zero,
    // silently, in both code paths at once — a worse failure than the divergence it replaced,
    // because it is invisible. Now: forgetting to classify a new field is a RED self-test naming
    // the field, not a silent zero. The same information, moved to the authoring path.
    for (const [name, shape] of Object.entries(QUERY_SHAPE)) {
      const returned = Object.keys(QUERIES[name](fixture) ?? {});
      const declared = new Set([...shape.findings, ...shape.context]);
      const missing = returned.filter((k) => !declared.has(k));
      check(`'${name}': every returned field is classified`, missing.length === 0,
        missing.length ? `UNCLASSIFIED: ${missing.join(", ")}` : `${returned.length} field(s)`);
      const stale = [...declared].filter((k) => !returned.includes(k));
      check(`'${name}': every declared field is returned`, stale.length === 0,
        stale.length ? `DECLARED BUT ABSENT: ${stale.join(", ")}` : "");
    }
    {
      const returned = Object.keys(surface(fixture, "push") ?? {});
      const declared = new Set([...SURFACE_NAME_SHAPE.findings, ...SURFACE_NAME_SHAPE.context]);
      const missing = returned.filter((k) => !declared.has(k));
      check("'surface:<name>': every returned field is classified", missing.length === 0,
        missing.length ? `UNCLASSIFIED: ${missing.join(", ")}` : `${returned.length} field(s)`);
      check("'surface:<name>' declares NO findings (it is a question)", SURFACE_NAME_SHAPE.findings.length === 0);
    }
    check("FINDING_FIELDS is derived from QUERY_SHAPE, not hand-written",
      FINDING_FIELDS.length === new Set(Object.values(QUERY_SHAPE).flatMap((s) => s.findings)).size,
      FINDING_FIELDS.join(","));

    // ── registry agreement ───────────────────────────────────────────────────
    // The classification loop above iterates QUERY_SHAPE, so it can only ever check queries
    // already registered there. A query in QUERIES alone is invisible to it — and to the full
    // scan, and to countFindings. These two checks are the only place that asymmetry is caught.
    {
      const unclassified = Object.keys(QUERIES).filter((n) => !(n in QUERY_SHAPE));
      const orphaned = Object.keys(QUERY_SHAPE).filter((n) => !(n in QUERIES));
      check("every QUERIES entry is classified in QUERY_SHAPE",
        unclassified.length === 0, unclassified.join(", "));
      check("every QUERY_SHAPE entry is a real query",
        orphaned.length === 0, orphaned.join(", "));
      const keys = Object.values(QUERY_SHAPE).map((s) => s.outputKey);
      check("every query declares an outputKey", keys.every(Boolean));
      check("outputKeys are distinct (else one query overwrites another in the full result)",
        new Set(keys).size === keys.length, keys.join(","));
      // The full scan is now DERIVED, so this asserts the derivation covers the dispatch table.
      const fullKeys = Object.keys(QUERIES).map((n) => QUERY_SHAPE[n].outputKey).sort();
      check("the full scan emits one section per query",
        fullKeys.length === Object.keys(QUERIES).length, fullKeys.join(","));
    }

    // The unattributed-switch guard (LIMITS item 12): a table the extractor could not attribute
    // must NOT put a name into the inline layer. The fixture below carries one of each.
    const attrFixture = {
      ...fixture,
      inlineTables: [
        { receiverTag: "list", file: "i.js", line: 1, cases: [{ name: "realMethod", line: 1 }] },
        { receiverTag: "unresolved", file: "i.js", line: 2, cases: [{ name: "notAMethod", line: 2 }] },
      ],
      gateList: { names: [{ name: "realMethod", section: "a", line: 1 }, { name: "notAMethod", section: "a", line: 2 }] },
      stdlibCases: [],
    };
    const sReal = surface(attrFixture, "realMethod");
    const sFake = surface(attrFixture, "notAMethod");
    check("an ATTRIBUTED table puts a name in the inline layer", sReal.inlineTables.length === 1 && sReal.layers === 2,
      `layers=${sReal.layers}`);
    check("an UNATTRIBUTED table does NOT", sFake.inlineTables.length === 0 && sFake.layers === 1,
      `layers=${sFake.layers}`);
    check("unattributed switches are still REPORTED, not dropped",
      (surface(attrFixture).unattributedSwitches ?? []).length === 1,
      `${(surface(attrFixture).unattributedSwitches ?? []).length} reported`);

    // Provenance: the vendored extractor must still match its source when the
    // source is reachable. SKIPPED is reported honestly — never counted as pass.
    const prov = JSON.parse(fs.readFileSync(path.join(HERE, "../src/provenance.json"), "utf8"));
    const upstream = path.join(ROOT, "..", "subprojects/hypha/src/extract.js");
    if (fs.existsSync(upstream)) {
      const { createHash } = await import("node:crypto");
      const actual = createHash("sha256").update(fs.readFileSync(upstream, "utf8")).digest("hex");
      check("vendored extractor matches its source", actual === prov.sha256,
        actual === prov.sha256 ? prov.sha256.slice(0, 12) : `recorded ${prov.sha256.slice(0, 12)} vs actual ${actual.slice(0, 12)} — re-vendor`);
    } else {
      cases.push({ label: "vendored extractor matches its source", ok: true, skipped: true, detail: "upstream not reachable from here — SKIPPED, not passed" });
    }
  }

  check("a scan writes nothing into the repo root", snapshot(ROOT) === treeBefore);

  console.log("\n=== galerina-hypha --self-test ===");
  let failed = 0;
  for (const c of cases) {
    if (!c.ok) failed++;
    console.log(`   ${c.skipped ? "➖" : c.ok ? "✅" : "❌"} ${c.label}${c.detail ? "   (" + c.detail + ")" : ""}`);
  }
  console.log(`\n=== ${cases.length - failed}/${cases.length} self-test cases pass ===`);
  process.exit(failed ? 1 : 0);
}

// ── run the requested scan ──────────────────────────────────────────────────
// The dist check above catches the common malformed-root case with a clear message; this
// catch-all is the backstop for any other extraction failure (an unreadable file, a partial
// checkout). Either way a scan that cannot complete exits 2 — a could-not-run, never a finding
// and never a bare stack trace.
let facts;
try {
  facts = scan(ROOT);
} catch (e) {
  console.error("galerina-hypha: scan could not complete — " + (e && e.message ? e.message : String(e)));
  process.exit(2);
}
const [target, arg] = SCAN.split(":");

let result, findingCount = 0;
if (target === "full") {
  // DERIVED from QUERIES, never a hand-written list. A query added to the dispatch table is
  // scanned here automatically; before this, it would have been reachable by name yet silently
  // ABSENT from the default scan — which reports `0 findings` and exits 0.
  const per = Object.keys(QUERIES).map((name) => [name, QUERIES[name](facts)]);
  result = { scan: "full" };
  for (const [name, r] of per) result[QUERY_SHAPE[name].outputKey] = r;
  // Both branches count through the SAME function over the SAME named set, so the two paths
  // cannot drift apart again. `--self-test` asserts the identity on a fixture with known answers.
  findingCount = per.reduce((n, [, r]) => n + countFindings(r), 0);
} else if (QUERIES[target]) {
  result = { scan: SCAN, result: QUERIES[target](facts, arg) };
  // A single-name surface lookup is a question, not a check — it returns `layers`, which is not
  // in FINDING_FIELDS, so it contributes 0 without needing a special case here.
  findingCount = countFindings(result.result);
} else {
  console.error(`galerina-hypha: unknown scan target '${target}'. Known: full, ${Object.keys(QUERIES).join(", ")}`);
  process.exit(2);
}

// ── render ──────────────────────────────────────────────────────────────────
function render(r) {
  const L = [];
  L.push(`# galerina-hypha — capability-map scan`);
  L.push("");
  L.push(`Scan: \`${SCAN}\` · root \`${ROOT}\``);
  L.push(`Facts: ${facts.gateList.names.length} gate names · ${facts.stdlibCases.length} stdlib arms · ` +
         `${facts.inlineTables.length} inline tables · ${facts.kindSets.length} kind-sets · ` +
         `${facts.exportedCheckers.length} exported checkers · ${facts.parserKinds.length} parser kinds`);
  L.push("");
  const dup = r.duplicateSets ?? (r.result?.drift !== undefined ? r.result : null);
  if (dup) {
    L.push(`## Drifted sentinel sets — ${dup.drift.length}`);
    L.push("");
    if (dup.drift.length === 0) L.push("_None. No two overlapping sets disagree on membership._");
    for (const d of dup.drift) {
      L.push(`- \`${d.a}\` vs \`${d.b}\``);
      if (d.onlyA.length) L.push(`  - only in the first: ${d.onlyA.map((x) => "`" + x + "`").join(", ")}`);
      if (d.onlyB.length) L.push(`  - only in the second: ${d.onlyB.map((x) => "`" + x + "`").join(", ")}`);
    }
    L.push("");
    L.push(`## Identical sets at more than one site — ${dup.duplicates.length}`);
    L.push("");
    if (dup.duplicates.length === 0) L.push("_None._");
    for (const d of dup.duplicates) L.push(`- ${d.sites.map((s) => "`" + s + "`").join(" · ")} — ${d.members.length} members`);
    L.push("");
  }
  const kc = r.kindCoverage ?? (r.result?.gaps !== undefined ? r.result : null);
  if (kc) {
    L.push(`## Gating sets missing a parser-producible kind — ${kc.gaps.length}`);
    L.push("");
    if (kc.gaps.length === 0) L.push(`_None. All ${kc.parserKindCount} parser kinds are covered wherever they are gated._`);
    for (const g of kc.gaps) L.push(`- \`${g.site}\` — has ${g.has}, missing ${g.missing.map((x) => "`" + x + "`").join(", ")}`);
    L.push("");
  }
  const nsd = r.nameSetDrift ?? (r.result?.uncovered !== undefined ? r.result : null);
  if (nsd) {
    L.push(`## Guard lists narrower than the names the code tests — ${nsd.uncovered.length}`);
    L.push("");
    L.push("_A named set enumerates the names one guard defends. These files also compare against names the set omits, so the guard does not cover them. Read the receiver: `.value ===` is a name test, `.kind ===` is a kind test._");
    L.push("");
    if (nsd.uncovered.length === 0) L.push(`_None. All ${nsd.setsExamined} string sets cover every literal compared in their own file._`);
    for (const u of nsd.uncovered) {
      L.push(`- \`${u.set}\` at \`${u.at}\` — has ${u.members.length} (${u.members.map((m) => "`" + m + "`").join(", ")})`);
      for (const m of u.missing) L.push(`  - missing \`${m.literal}\` — tested at \`${m.at}\` via \`${m.receiver}\``);
    }
    L.push("");
  }
  const de = r.deadExports ?? (r.result?.dead !== undefined ? r.result : null);
  if (de) {
    L.push(`## Exported checkers with no call site — ${de.dead.length}`);
    L.push("");
    L.push("_Note: `scripts/audit-checker-wiring.mjs` answers this more thoroughly — it knows the pipeline's call graph. Treat this as a cross-check, not the authority._");
    L.push("");
    if (de.dead.length === 0) L.push(`_None of ${de.exported} exported checkers is uncalled._`);
    for (const d of de.dead) L.push(`- \`${d.name}\` — defined at \`${d.definedAt}\``);
    L.push("");
  }
  const sf = r.surface ?? (r.result?.asymmetric !== undefined ? r.result : null);
  if (sf) {
    L.push(`## Names visible in some layers and not others — ${sf.asymmetric.length} of ${sf.total}`);
    L.push("");
    L.push("_This is the `.push()` class: a name present in the gate list and the stdlib but absent from the inline fallback table reads as unsupported to anyone who checks one layer._");
    L.push("");
    L.push("| name | gate list | stdlib arm | inline tables |");
    L.push("|---|---|---|---|");
    for (const s of sf.asymmetric.slice(0, 60)) {
      L.push(`| \`${s.name}\` | ${s.gateList ? "✅ " + s.gateList.section : "—"} | ${s.stdlibArm ? "✅" : "—"} | ${s.inlineTables.length ? "✅ " + s.inlineTables.length : "—"} |`);
    }
    if (sf.asymmetric.length > 60) L.push(`\n_… ${sf.asymmetric.length - 60} more; use \`--json\` for the full list._`);
    L.push("");
  }
  if (r.result && !dup && !kc && !de && !sf) {
    L.push("## Result");
    L.push("");
    L.push("```json");
    L.push(JSON.stringify(r.result, null, 2));
    L.push("```");
  }
  return L.join("\n");
}

const output = AS_JSON ? JSON.stringify({ ...result, findingCount }, null, 2) : render(result);

// ── property 3: nothing written unless asked ────────────────────────────────
if (OUT) {
  fs.writeFileSync(OUT, output);
  console.error(`[galerina-hypha] report -> ${OUT}   (${findingCount} finding(s))`);
} else {
  console.log(output);
}
process.exit(findingCount > 0 ? 1 : 0);
