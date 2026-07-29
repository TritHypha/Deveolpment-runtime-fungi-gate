#!/usr/bin/env node
// audit-code-catalog-coverage.mjs — how much of the FUNGI-* code space can the catalog SEE?
//
// WHY THIS EXISTS
//   build/code-registry used to claim "every code is registered by construction — no orphans".
//   That was false. A false completeness claim is worse than the gap it hides, because it stops
//   anyone looking. This measures the gap so the claim can be DERIVED instead of asserted.
//
// THE TWO BLIND SPOTS (both measured 2026-07-25, board #164/#165)
//   EMIT FORM   a positional call argument on its own line is scored "ref", not an emit.
//   CODE SHAPE  every instrument on both sides matched `FUNGI-[A-Z0-9]+-\d+`, which REQUIRES a
//               numeric tail — so `FUNGI-FUSE-HASH-MISMATCH` is invisible by construction. R&D
//               0392 named this one, and owned that it had silently excluded FUSE from their own
//               294- and 378-code surfaces too.
//
// REPORT-ONLY by design (always exit 0). The gap is real and boarded, but turning it into a
// blocking gate today would just park a third red — and a parked red teaches people to ignore it.
// It becomes a gate when the index is fixed; then a REGRESSION is what should fail the close.
//
// Usage:  node scripts/audit-code-catalog-coverage.mjs [--self-test]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// A shape-agnostic sweep also catches ILLUSTRATIVE placeholders (`FUNGI-CATEGORY-NNN` in a doc
// comment, `FUNGI-TYPE-XXX` in a codemod). Those are not missing registrations, and letting them
// pad the headline would be the same overclaiming this whole thread is about.
const isPlaceholder = (c) => /-(NNN|XXX|N)$/.test(c) || /-XXX-/.test(c) || /-[A-Z]$/.test(c);
const SHAPE_AGNOSTIC = /\bFUNGI-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/g;
const NUMERIC_TAIL = /-\d+$/;
const famOf = (c) => c.split("-").slice(0, 2).join("-");
// Families whose refusals run on the signing / verification path — the ones a human most needs to
// look up, and the ones the catalog is most conspicuously missing.
const SIGNING_FAMILIES = new Set(["FUNGI-FUSE", "FUNGI-MANIFEST", "FUNGI-REVOCATION"]);

/** Measure the catalog's coverage gap. Returns derived counts — never hand-typed downstream. */
export function measureCoverageGap(root = DEFAULT_ROOT, registryEntries = undefined) {
  const entries = registryEntries ?? JSON.parse(
    readFileSync(join(root, "build/code-registry/registry.json"), "utf8"),
  ).entries;
  const known = new Set(entries.map((entry) => entry.code));

  // build/ is EXCLUDED deliberately: ingesting our own generated output is the exact defect that
  // keeps audit-artifact-drift parked on a phantom that sustains itself.
  const files = execFileSync("git", ["ls-files", "*.ts", "*.mjs", "*.js", "*.fungi"], { cwd: root, encoding: "utf8" })
    .split("\n").map((s) => s.trim()).filter(Boolean)
    .filter((f) => !f.startsWith("build/") && !f.includes("node_modules/") && !f.endsWith(".d.ts"));

  const seen = new Map();
  let scanned = 0, absent = 0;                      // absent = tracked but not on disk; counted, not swallowed
  for (const f of files) {
    let src;
    try { src = readFileSync(join(root, f), "utf8"); } catch { absent++; continue; }
    scanned++;
    src.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(SHAPE_AGNOSTIC)) if (!seen.has(m[0])) seen.set(m[0], `${f}:${i + 1}`);
    });
  }

  const realMissing = [...seen].filter(([c]) => !known.has(c) && !NUMERIC_TAIL.test(c) && !isPlaceholder(c));
  const byFamily = {};
  for (const [c, site] of realMissing) (byFamily[famOf(c)] ??= []).push([c, site]);
  const signing = realMissing.filter(([c]) => SIGNING_FAMILIES.has(famOf(c))).length;

  return {
    scanned, absent, filesEnumerated: files.length,
    tokensInSource: seen.size,
    realMissing: realMissing.length,
    signingMissing: signing,
    byFamily,
    // Non-vacuity is a PROPERTY of the result, so every consumer can check it rather than trusting us.
    vacuous: files.length === 0 || scanned === 0 || seen.size === 0,
  };
}

// ── self-test ────────────────────────────────────────────────────────────────
// Controls, so a zero can never read as "clean": one code that must be FOUND and MISSING, one that
// must be FOUND and PRESENT. If the premise ever goes stale (someone registers FUSE — good news),
// this fails loudly rather than reporting a quietly meaningless zero.
function selfTest() {
  const fails = [];
  let checks = 0; // DERIVED — the denominator must move when a check is added
  const ok = (cond, what) => { checks += 1; if (!cond) fails.push(what); };

  ok(isPlaceholder("FUNGI-CATEGORY-NNN"), "placeholder classifier must catch an -NNN template");
  ok(isPlaceholder("FUNGI-PCI-G"), "placeholder classifier must catch a single-letter tail");
  ok(!isPlaceholder("FUNGI-FUSE-HASH-MISMATCH"), "CONTROL: a real code must NOT be classified a placeholder");
  ok(!NUMERIC_TAIL.test("FUNGI-FUSE-VERSION"), "CONTROL: the shape blindness must be reproducible");
  ok(NUMERIC_TAIL.test("FUNGI-GOV-005"), "CONTROL: a numeric code must still read as numeric");

  const r = measureCoverageGap();
  ok(!r.vacuous, "sweep must not be vacuous (files enumerated, read, and tokens found)");
  ok(r.byFamily["FUNGI-FUSE"]?.length > 0, "CONTROL: the known-missing FUSE family must be reported missing");
  ok(!Object.keys(r.byFamily).includes("FUNGI-ADMIT"), "CONTROL: a fully-registered numeric family must NOT appear");

  console.log(fails.length === 0
    ? `  ✅ self-test ${checks - fails.length}/${checks} — the known gap is visible and the controls stay silent`
    : `  ❌ self-test FAILED:\n     - ${fails.join("\n     - ")}`);
  return fails.length === 0 ? 0 : 1;
}

if (process.argv.includes("--self-test")) process.exit(selfTest());

const r = measureCoverageGap();
if (r.vacuous) { console.error("VACUOUS: nothing enumerated or readable — refusing to report a zero"); process.exit(2); }
console.log(`code-catalog coverage: scanned ${r.scanned}/${r.filesEnumerated} tracked sources (${r.absent} tracked-but-absent)`);
console.log(`  ${r.tokensInSource} distinct FUNGI-* tokens in source (shape-agnostic)`);
console.log(`  ${r.realMissing} REAL codes absent from the catalog — ${r.signingMissing} of them on the signing path`);
for (const fam of Object.keys(r.byFamily).sort((a, b) => r.byFamily[b].length - r.byFamily[a].length)) {
  console.log(`    ${fam.padEnd(20)} ${String(r.byFamily[fam].length).padStart(3)}   e.g. ${r.byFamily[fam][0][1]}`);
}
console.log("  report-only (board #164/#165) — becomes a gate when the index can see these shapes.");
