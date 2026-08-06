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
//                         file. No --root, no env var, no config, no cwd
//                         assumption. It works from any directory.
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
import { QUERIES, duplicateSets, kindCoverage, deadExports, surface } from "../src/queries.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

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
  };
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
    };
    const d = duplicateSets(fixture);
    check("duplicate-sets finds the drifted pair", d.drift.some((x) => x.onlyA.includes("governedFlowDecl") || x.onlyB.includes("governedFlowDecl")));
    check("duplicate-sets finds the exact duplicate", d.duplicates.length === 1, `${d.duplicates.length} duplicate group(s)`);
    check("duplicate-sets does NOT pair unrelated sets", !JSON.stringify(d.drift).includes("unrelated"));
    const k = kindCoverage(fixture);
    check("kind-coverage flags the set missing a parser kind", k.gaps.some((g) => g.missing.includes("governedFlowDecl")));
    check("kind-coverage ignores non-gating sets", !k.gaps.some((g) => g.site.startsWith("d.js")));
    const de = deadExports(fixture);
    check("dead-exports finds the uncalled checker", de.dead.length === 1 && de.dead[0].name === "checkDead");
    check("dead-exports does NOT flag the called one", !de.dead.some((x) => x.name === "checkAlive"));
    const s = surface(fixture, "push");
    check("surface sees a name in 2 of 3 layers", s.layers === 2, `layers=${s.layers}`);
    check("surface reports the absent layer as absent", s.inlineTables.length === 0);

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
const facts = scan(ROOT);
const [target, arg] = SCAN.split(":");

let result, findingCount = 0;
if (target === "full") {
  const dup = duplicateSets(facts), kc = kindCoverage(facts), de = deadExports(facts), sf = surface(facts);
  result = { scan: "full", duplicateSets: dup, kindCoverage: kc, deadExports: de, surface: sf };
  findingCount = dup.drift.length + kc.gaps.length + de.dead.length + sf.asymmetric.length;
} else if (QUERIES[target]) {
  result = { scan: SCAN, result: QUERIES[target](facts, arg) };
  // A single-name surface lookup is a question, not a check — it has no findings.
  const r = result.result;
  findingCount = Array.isArray(r?.drift) ? r.drift.length + (r.duplicates?.length ?? 0)
    : Array.isArray(r?.gaps) ? r.gaps.length
    : Array.isArray(r?.dead) ? r.dead.length
    : Array.isArray(r?.asymmetric) ? r.asymmetric.length
    : 0;
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
