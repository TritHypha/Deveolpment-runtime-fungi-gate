#!/usr/bin/env node
// audit-code-catalog-coverage.mjs -- count-owning descriptive code gate.
//
// The former report matched every uppercase FUNGI-* token and guessed that
// every non-numeric tail was a real code. That mixed emitted identities,
// comments, family prefixes, domain tags, and deliberate negative fixtures.
// It could expose a gap, but could not safely authorize a zero.
//
// The current gate consumes the syntax-bound classifier shared with the code
// index. A descriptive identity must occur at a bounded diagnostic sink. A
// novel ambiguous source token is an explicit refusal until it is either bound
// to a sink or marked as a deliberate `code-catalog-reference`.
//
// Usage: node scripts/audit-code-catalog-coverage.mjs [--self-test] [--json] [--report-only]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { classifyDescriptiveDiagnosticIdentities } from "./lib/descriptive-diagnostic-identities.mjs";

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const famOf = (code) => code.split("-").slice(0, 2).join("-");
const SIGNING_FAMILIES = new Set(["FUNGI-FUSE", "FUNGI-MANIFEST", "FUNGI-REVOCATION"]);

/** Measure syntax-admitted descriptive identities against generated catalog entries. */
export function measureCoverageGap(root = DEFAULT_ROOT, registryEntries = undefined) {
  const entries = registryEntries ?? JSON.parse(
    readFileSync(join(root, "build/code-registry/registry.json"), "utf8"),
  ).entries;
  const known = new Set(entries.map((entry) => entry.code));

  const files = execFileSync("git", ["ls-files", "*.ts", "*.mjs", "*.js"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith("build/") && !file.includes("node_modules/") && !file.endsWith(".d.ts"));

  const identities = new Map();
  const references = new Map();
  const ambiguous = new Map();
  let scanned = 0;
  let absent = 0;
  for (const file of files) {
    let source;
    try { source = readFileSync(join(root, file), "utf8"); } catch { absent += 1; continue; }
    scanned += 1;
    const normalized = file.replace(/\\/g, "/");
    const testOnly = /\/tests?\//.test(`/${normalized}`) || /\.test\./.test(normalized);
    const classified = classifyDescriptiveDiagnosticIdentities(source, { testOnly });
    for (const entry of classified.identities) {
      if (!identities.has(entry.code)) identities.set(entry.code, `${normalized}:${entry.line}`);
    }
    for (const entry of classified.references) {
      if (!references.has(entry.code)) references.set(entry.code, `${normalized}:${entry.line}`);
    }
    for (const entry of classified.unclassified) {
      if (!ambiguous.has(entry.code)) ambiguous.set(entry.code, `${normalized}:${entry.line}`);
    }
  }

  // An identity may be emitted in one file and mentioned without a sink in
  // another. Once the emitted identity is admitted, the other occurrence is a
  // reference, not a second ambiguity. A registered descriptive identity is
  // treated the same way.
  const unclassified = [...ambiguous].filter(([code]) => !identities.has(code) && !known.has(code));
  const missing = [...identities].filter(([code]) => !known.has(code));
  const byFamily = {};
  for (const [code, site] of missing) (byFamily[famOf(code)] ??= []).push([code, site]);
  const unclassifiedByFamily = {};
  for (const [code, site] of unclassified) (unclassifiedByFamily[famOf(code)] ??= []).push([code, site]);

  return {
    scanned,
    absent,
    filesEnumerated: files.length,
    descriptiveIdentities: identities.size,
    signingIdentities: [...identities].filter(([code]) => SIGNING_FAMILIES.has(famOf(code))).length,
    referenceOnly: [...references].filter(([code]) => !identities.has(code)).length,
    unclassified: unclassified.length,
    realMissing: missing.length,
    signingMissing: missing.filter(([code]) => SIGNING_FAMILIES.has(famOf(code))).length,
    byFamily,
    unclassifiedByFamily,
    vacuous: files.length === 0 || scanned === 0 || identities.size === 0,
  };
}

function selfTest() {
  const failures = [];
  let checks = 0;
  const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };

  const sink = classifyDescriptiveDiagnosticIdentities(
    'return fuseError("FUNGI-FUSE-HASH-MISMATCH", "x");',
  );
  check(sink.identities.length === 1, "CONTROL: descriptive sink must be admitted");
  const prefix = classifyDescriptiveDiagnosticIdentities("// FUNGI-FUSE is a family prefix\n");
  check(prefix.identities.length === 0, "CONTROL: comment prefix must not mint an identity");
  // code-catalog-reference: detector-of-detector mutation token.
  const ambiguous = classifyDescriptiveDiagnosticIdentities(
    'const unexplained = "FUNGI-NOVEL-AMBIGUOUS";', // code-catalog-reference
  );
  check(ambiguous.unclassified.length === 1, "CONTROL: ambiguous token must stay visible");

  const result = measureCoverageGap();
  check(!result.vacuous, "repository sweep must not be vacuous");
  check(result.signingIdentities > 0, "CONTROL: signing identities must be observed");
  check(result.realMissing === 0, "generated registry must own every admitted identity");
  check(result.unclassified === 0, "source must contain no unresolved descriptive token");

  console.log(failures.length === 0
    ? `  PASS self-test ${checks}/${checks}`
    : `  REFUSED self-test ${checks - failures.length}/${checks}:\n     - ${failures.join("\n     - ")}`);
  return failures.length === 0 ? 0 : 1;
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const result = measureCoverageGap();
  if (result.vacuous) {
    console.error("VACUOUS: nothing enumerated or no identities observed; refusing a zero");
    return 2;
  }
  const failed = result.realMissing > 0 || result.unclassified > 0;
  const reportOnly = process.argv.includes("--report-only");
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({
      authority: reportOnly ? "report-only" : "fail-closed",
      verdict: failed ? "REFUSED" : "PASS",
      ...result,
    }, null, 2));
  } else {
    console.log(`code-catalog coverage: scanned ${result.scanned}/${result.filesEnumerated} tracked sources (${result.absent} tracked-but-absent)`);
    console.log(`  ${result.descriptiveIdentities} admitted descriptive identities (${result.signingIdentities} signing path) | ${result.referenceOnly} reference-only tokens`);
    console.log(`  ${result.realMissing} admitted identities absent from catalog | ${result.unclassified} ambiguous tokens`);
    for (const [label, groups] of [["missing", result.byFamily], ["ambiguous", result.unclassifiedByFamily]]) {
      for (const family of Object.keys(groups).sort((left, right) => groups[right].length - groups[left].length)) {
        console.log(`    ${label.padEnd(9)} ${family.padEnd(20)} ${String(groups[family].length).padStart(3)}   e.g. ${groups[family][0][1]}`);
      }
    }
    console.log(reportOnly
      ? "  REPORT-ONLY: non-authorizing inventory"
      : failed
        ? "  REFUSED: catalog coverage is incomplete"
        : "  PASS: catalog owns every admitted descriptive identity");
  }
  return reportOnly ? 0 : failed ? 1 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === resolve(fileURLToPath(import.meta.url))) process.exit(main());
