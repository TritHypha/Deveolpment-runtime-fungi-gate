#!/usr/bin/env node
// audit-signing-refusal-recon.mjs — a RECONNAISSANCE MAP of the signing-path refusal codes.
//
// STATUS: report-only. Always exits 0. It ASSERTS NOTHING and GATES NOTHING, by design.
//
// WHY IT MAY NOT ASSERT (R&D 0400, and it is the sharpest argument of the thread)
//   Each execution proof is only worth anything because of its CONTROL — the counter-case that
//   shows the refusal is specific rather than the tool erroring at everything. For
//   FUSE-UNSIGNED-DENIED the control was "a non-production posture does NOT emit it". That
//   control is MEANINGLESS for MANIFEST-NONCANONICAL (needs a canonical-manifest counter-case)
//   and meaningless again for REVOCATION-* (needs a non-revoked-key counter-case).
//
//   ⟹ The thing that makes each proof mean something is exactly the thing a shared harness
//   cannot generate. A shared harness can drive twenty codes; it cannot invent twenty
//   discriminators. Without them you get twenty REACHABILITY proofs wearing the costume of
//   twenty CORRECTNESS proofs — the vacuity shape, industrialised.
//
//   So: recon is shared, assertions never are. This map says where the per-code effort pays.
//   The locks get built one at a time, each with its own control (board #168).
//
// WHAT IT REPORTS, per signing-path code: family · site · whether any test mentions it · and a
// reachability HINT. The hint is a HEURISTIC read of the surrounding guard, NOT a proof — it
// exists to order the queue, and it is labelled as a hint everywhere it is printed. Reading it
// as evidence would be precisely the mistake this whole thread has been unpicking.
//
// Usage:  node scripts/audit-signing-refusal-recon.mjs [--self-test]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// Shape-agnostic on purpose: these families are NON-NUMERIC (`FUNGI-FUSE-HASH-MISMATCH`), which
// is the blindness that hid them from every `-\d+` instrument on both sides (R&D 0392).
const CODE_RE = /\bFUNGI-(?:FUSE|MANIFEST|REVOCATION)-[A-Z][A-Z0-9-]*\b/g;
const isPlaceholder = (c) => /-(NNN|XXX|N)$/.test(c) || /-XXX-/.test(c);

// Reachability hints. Ordered: first match wins, most specific first. Each is a guess about what
// a proof of that code would COST, never a claim that the code fires.
const HINTS = [
  { re: /profile|posture|GALERINA_PROFILE|allowUnsigned|allow-unsigned/i, hint: "posture/flag — cheapest, no fixture" },
  { re: /revok|registry/i, hint: "needs revocation-registry state (NOT key bytes)" },
  { re: /canonical|cbor|round-?trip/i, hint: "needs a non-canonical manifest fixture" },
  { re: /hash|digest|sidecar|tamper/i, hint: "needs a tampered artifact fixture" },
  { re: /sign|signature|pubkey|hybrid|pq/i, hint: "signature path — check the key line before driving" },
];

function trackedFiles() {
  return execFileSync("git", ["ls-files", "*.ts", "*.mjs", "*.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n").map((s) => s.trim()).filter(Boolean)
    .filter((f) => !f.startsWith("build/") && !f.includes("node_modules/") && !f.endsWith(".d.ts"));
}
const isTestFile = (f) => /(^|\/)tests?\//.test(f) || /\.test\.mjs$/.test(f);
const SELFTEST_TESTED = ["FUNGI", "FUSE", "SELFTEST", "TESTED"].join("-");
const SELFTEST_UNTESTED = ["FUNGI", "FUSE", "SELFTEST", "UNTESTED"].join("-");

/** Build the map. Returns derived data — no number downstream is ever hand-typed. */
function observeSource(file, src, sites, tested) {
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(CODE_RE)) {
      const code = m[0];
      if (isPlaceholder(code)) continue;
      if (isTestFile(file)) {
        tested.add(code);
        continue;
      }
      if (!sites.has(code)) {
        const ctx = lines.slice(Math.max(0, i - 12), i + 2).join("\n");
        sites.set(code, { file, line: i + 1, ctx });
      }
    }
  });
}

export function reconnoitre() {
  const files = trackedFiles();
  const sites = new Map();   // code -> {file,line,context}  (first NON-test site = the emit site)
  const tested = new Set();  // codes mentioned anywhere under a tests/ path
  let scanned = 0, absent = 0;
  for (const f of files) {
    let src;
    try { src = readFileSync(join(ROOT, f), "utf8"); } catch { absent++; continue; }
    scanned++;
    observeSource(f, src, sites, tested);
  }
  const rows = [...sites].map(([code, s]) => ({
    code,
    family: code.split("-").slice(0, 2).join("-"),
    at: `${s.file}:${s.line}`,
    tested: tested.has(code),
    hint: HINTS.find((h) => h.re.test(s.ctx))?.hint ?? "unclassified — read the site",
  })).sort((a, b) => (a.tested - b.tested) || a.code.localeCompare(b.code));
  return { rows, scanned, absent, filesEnumerated: files.length, vacuous: files.length === 0 || scanned === 0 || rows.length === 0 };
}

// ── self-test ────────────────────────────────────────────────────────────────
// TWO-WAY control, so neither a blanket "tested" nor a blanket "untested" can read as success.
function selfTest() {
  const fails = [];
  let checks = 0; // DERIVED — the denominator must move when a check is added
  const ok = (c, what) => { checks += 1; if (!c) fails.push(what); };
  const r = reconnoitre();
  const by = (code) => r.rows.find((x) => x.code === code);
  const fixtureSites = new Map();
  const fixtureTested = new Set();
  observeSource(
    "src/selftest.ts",
    [
      `throw new Error('${SELFTEST_TESTED}');`,
      `throw new Error('${SELFTEST_UNTESTED}');`,
    ].join("\n"),
    fixtureSites,
    fixtureTested,
  );
  observeSource(
    "tests/selftest.test.mjs",
    `assert.match(error, /${SELFTEST_TESTED}/);`,
    fixtureSites,
    fixtureTested,
  );

  ok(!r.vacuous, "recon must not be vacuous (files enumerated, read, and codes found)");
  ok(by("FUNGI-FUSE-UNSIGNED-DENIED")?.tested === true,
    "CONTROL(+): the code I proved and locked last tick must read as TESTED — if it doesn't, test-detection is broken");
  ok(fixtureSites.has(SELFTEST_TESTED),
    "CONTROL(source): the synthetic source refusal must be observed");
  ok(fixtureTested.has(SELFTEST_TESTED),
    "CONTROL(+): the synthetic directly tested refusal must read as TESTED");
  ok(!fixtureTested.has(SELFTEST_UNTESTED),
    "CONTROL(-): a source-only synthetic refusal must remain UNTESTED");
  ok(r.rows.every((x) => !isPlaceholder(x.code)), "illustrative placeholders must not pad the map");
  ok(r.rows.length > 20, "the map must cover the family, not a handful");

  console.log(fails.length === 0
    ? `  ✅ self-test ${checks - fails.length}/${checks} — controls hold in BOTH directions (real positive plus synthetic tested/untested pair)`
    : `  ❌ self-test FAILED:\n     - ${fails.join("\n     - ")}`);
  return fails.length === 0 ? 0 : 1;
}

if (process.argv.includes("--self-test")) process.exit(selfTest());

const r = reconnoitre();
if (r.vacuous) { console.error("VACUOUS: nothing enumerated or readable — refusing to print an empty map as a clean one"); process.exit(0); }
const untested = r.rows.filter((x) => !x.tested);
console.log(`signing-refusal recon — RECONNAISSANCE ONLY: this asserts nothing and gates nothing.`);
console.log(`  scanned ${r.scanned}/${r.filesEnumerated} tracked sources (${r.absent} tracked-but-absent)`);
console.log(`  ${r.rows.length} signing-path refusal codes · ${untested.length} with no test mention`);
console.log(`  "no test mention" is a LOWER BOUND on assurance — it is not "dead" and not "broken".`);
console.log(`  The hint column is a HEURISTIC read of the surrounding guard. It orders the queue; it is NOT evidence.\n`);
console.log(`  ${"code".padEnd(38)} ${"test?".padEnd(6)} hint (heuristic)`);
for (const x of r.rows) {
  console.log(`  ${x.code.padEnd(38)} ${(x.tested ? "yes" : "NO").padEnd(6)} ${x.hint}`);
}
if (untested.length === 0) {
  console.log(`\n  Coverage checkpoint: every discovered signing-path refusal has a direct test mention.`);
  console.log(`  Recon remains report-only; the per-code negative/control witnesses carry the assurance.`);
} else {
  console.log(`\n  Next lock (board #168): drive ONE code, with its OWN control. A shared harness can drive`);
  console.log(`  twenty codes but cannot invent twenty discriminators — recon shared, assertions never.`);
}
