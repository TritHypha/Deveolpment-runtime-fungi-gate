#!/usr/bin/env node
// =============================================================================
// audit-retention-gate.mjs — the per-commit CI gate for unbounded module state.
//
// STAGED ENFORCEMENT, per the owner ruling (Q3). This is the PER-COMMIT stage: a
// static scan plus the positive bounded-cache regressions. The dynamic retention
// measurement is a nightly/release stage and is NOT run here — it needs a forced GC
// and several seconds per subject, which does not belong on every commit.
//
// ★ THE BASELINE NAMES FINDINGS, NEVER A COUNT.
// A count cannot tell you WHICH finding was accepted, so a new defect can enter as an
// old one leaves and the number never moves. Every baselined entry therefore carries
// its identity (file + symbol), a REASON, and an OWNER. An entry without both is
// rejected by this gate — an un-owned exemption is one nobody will ever revisit.
//
// ★ NOTHING IS BASELINED BEFORE ADJUDICATION. This gate will not silently accept a
// finding to go green. A new finding fails the build and must be either fixed or
// deliberately added to the baseline with a reason and an owner.
//
// ★ SELF-TEST FAILURE FAILS CLOSED. If the detector cannot prove it discriminates,
// this gate reports FAILURE rather than "no findings" — a neutered detector reporting
// a clean scan is the worst possible output, because it is indistinguishable from
// health.
//
// EXIT: 0 clean · 1 new finding or a baseline defect · 2 harness/self-test failure
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import process from "node:process";

function findGalerina() {
  const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const root = dirname(here);
  if (!existsSync(join(root, "packages-galerina"))) {
    throw new Error(`cannot locate the Galerina checkout: no packages-galerina under ${root}`);
  }
  return root.replace(/\\/g, "/");
}
const ROOT = findGalerina();
const SCRIPTS = ROOT + "/scripts";
const BASELINE = SCRIPTS + "/fixtures/retention-baseline.json";
const SCAN_ROOT = ROOT + "/packages-galerina/galerina-core-compiler/src";
const CORPUS_ROOT = ROOT + "/packages-galerina/galerina-core-compiler";

const P = console.log;
let failed = false;
const fail = (m) => { failed = true; console.error("  ❌ " + m); };

// A nested `node --test` inherits NODE_TEST_CONTEXT when this audit itself is
// exercised by the tooling test suite. That switches the child's output to the
// parent test protocol and makes a valid pass summary indistinguishable from a
// missing summary. Keep suite/process custody intact, but give every probe a
// fresh Node-test presentation boundary so evidence parsing is deterministic.
function probeEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

// ---------------------------------------------------------------------------
// Stage 0 — the detector must prove itself first. Fail CLOSED.
// ---------------------------------------------------------------------------
P("== stage 0: detector self-test (fail-closed) ==");
{
  const r = spawnSync(process.execPath, [SCRIPTS + "/audit-leak-static.mjs", "--self-test"],
    { encoding: "utf8", timeout: 300000, env: probeEnv() });
  if (r.status !== 0) {
    console.error("  ❌ the static detector failed its own self-test.");
    console.error("     A scan from an unproven detector cannot distinguish 'nothing found' from");
    console.error("     'nothing looked'. Refusing to report a result.");
    console.error((r.stdout || "") + (r.stderr || ""));
    process.exit(2);
  }
  P("  * detector discriminates");
}
{
  // The bound KAT gets the same treatment: it asserts that the real cache stops at its
  // ceiling, so its assertion must first be shown to REJECT an unbounded container.
  const r = spawnSync(process.execPath, [SCRIPTS + "/kat-execution-graph-cache-bound.mjs", "--self-test"],
    { encoding: "utf8", timeout: 300000, env: probeEnv() });
  if (r.status !== 0) {
    console.error("  ❌ the bound assertion failed its own self-test.");
    console.error("     An assertion that accepts an unbounded container proves nothing when it passes.");
    console.error((r.stdout || "") + (r.stderr || ""));
    process.exit(2);
  }
  P("  * bound assertion discriminates");
}

// ---------------------------------------------------------------------------
// Stage 1 — positive bounded-cache regressions.
// The static scan proves a cache is not OBVIOUSLY unbounded. These prove the bound
// is REACHED and ENFORCED, which no lexical scan can establish.
// ---------------------------------------------------------------------------
P("\n== stage 1: positive bounded-cache regressions ==");
{
  const r = spawnSync(process.execPath,
    ["--test", CORPUS_ROOT + "/tests/bounded-cache.test.mjs"],
    { encoding: "utf8", timeout: 600000, cwd: CORPUS_ROOT, env: probeEnv() });
  const out = (r.stdout || "") + (r.stderr || "");
  const pass = Number((out.match(/^.\s*pass (\d+)/m) ?? [])[1] ?? 0);
  const fl = Number((out.match(/^.\s*fail (\d+)/m) ?? [])[1] ?? -1);
  if (fl !== 0 || pass === 0) {
    fail(`bounded-cache regressions: ${pass} passed, ${fl} failed. A bound that is never exercised is a bound nobody has tested.`);
  } else {
    P(`  * ${pass} positive regressions pass (bounds reached AND enforced)`);
  }
}
{
  // Those regressions exercise the BoundedCache class with test-sized limits. They do
  // not touch the real execution-graph cache at its real 2048-entry ceiling, so the
  // production bound was configured but never measured against. This KAT drives past
  // that ceiling and requires evictions to have actually occurred — without which
  // "entries <= maxEntries" would pass on a cache that simply never filled.
  const r = spawnSync(process.execPath, [SCRIPTS + "/kat-execution-graph-cache-bound.mjs"],
    { encoding: "utf8", timeout: 600000, env: probeEnv() });
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.status !== 0) {
    fail("the execution-graph cache bound is not enforced under pressure:\n" + out);
  } else {
    const binds = (out.match(/which ceiling BINDS first: ([^\n]+)/) ?? [])[1] ?? "unreported";
    P(`  * production cache bound enforced under pressure — binding ceiling: ${binds}`);
  }
}

// ---------------------------------------------------------------------------
// Stage 2 — the static scan, diffed against a NAMED baseline.
// ---------------------------------------------------------------------------
P("\n== stage 2: static retention scan vs baseline ==");
const scan = spawnSync(process.execPath,
  [SCRIPTS + "/audit-leak-static.mjs", "--scan", SCAN_ROOT, "--corpus", CORPUS_ROOT, "--json"],
  { encoding: "utf8", timeout: 600000, env: probeEnv() });
const scanOut = (scan.stdout || "") + (scan.stderr || "");

/** Findings are parsed from the human report; `--json` is honoured if present. */
function parseFindings(text) {
  const out = [];
  const re = /^\s{5}(UNBOUNDED|TEST-ONLY-CLEAR|CLEAR-NEVER-CALLED)\s+\S+\s+(\S+)\s+(\S+):(\d+)\s*$/mg;
  for (const m of text.matchAll(re)) {
    out.push({ verdict: m[1], symbol: m[2], file: m[3].replace(ROOT + "/", "").replace(/\\/g, "/"), line: Number(m[4]) });
  }
  return out;
}
const findings = parseFindings(scanOut);
// A scan that finds NOTHING is suspicious until the scan is shown to have run.
const scanned = Number((scanOut.match(/== scan: (\d+) file\(s\)/) ?? [])[1] ?? 0);
if (scanned === 0) {
  console.error("  ❌ the scan classified 0 files — the walker is dead, not the codebase clean.");
  process.exit(2);
}
P(`  scanned ${scanned} file(s); ${findings.length} finding(s)`);

// ---------------------------------------------------------------------------
// The baseline. Named entries only; reason and owner mandatory.
// ---------------------------------------------------------------------------
let baseline = { entries: [] };
if (existsSync(BASELINE)) {
  try { baseline = JSON.parse(readFileSync(BASELINE, "utf8")); }
  catch (e) { console.error("  ❌ baseline is unreadable: " + e.message); process.exit(2); }
}
const idOf = (f) => `${f.file}::${f.symbol}`;

// Reject a malformed baseline BEFORE using it to excuse anything.
for (const e of baseline.entries ?? []) {
  if (!e.file || !e.symbol) fail(`baseline entry lacks an identity: ${JSON.stringify(e)}`);
  if (!e.reason || String(e.reason).trim().length < 12) {
    fail(`baseline entry ${idOf(e)} has no usable REASON — an exemption without a reason is one nobody can review`);
  }
  if (!e.owner || String(e.owner).trim() === "") {
    fail(`baseline entry ${idOf(e)} has no OWNER — an un-owned exemption is permanent by default`);
  }
}
if (typeof baseline.count === "number") {
  fail("baseline carries a COUNT. A count cannot say WHICH finding was accepted, so a new defect can enter as an old one leaves and the number never moves. Name the findings.");
}

const known = new Set((baseline.entries ?? []).map(idOf));
const seen = new Set(findings.map(idOf));
const entrants = findings.filter((f) => !known.has(idOf(f)));
const departed = [...known].filter((k) => !seen.has(k));

if (entrants.length > 0) {
  fail(`${entrants.length} NEW retention finding(s) — not baselined, and this gate will not baseline them for you:`);
  for (const f of entrants) console.error(`       ${f.verdict.padEnd(19)} ${f.symbol.padEnd(24)} ${f.file}:${f.line}`);
  console.error("     Fix it, or add it to the baseline WITH a reason and an owner. Adjudicate first.");
}
if (departed.length > 0) {
  // Not a failure — but it must be SAID, or the baseline outlives its fault and goes
  // vacuous, excusing a finding that no longer exists while hiding that it is gone.
  P(`  ⚠ ${departed.length} baselined finding(s) no longer occur — delete them so the baseline cannot go vacuous:`);
  for (const d of departed) P(`       ${d}`);
}
if (entrants.length === 0) P(`  * no new findings (${known.size} baselined, each with a reason and an owner)`);

// ---------------------------------------------------------------------------
P("\n== result ==");
if (failed) { console.error("  RETENTION GATE: FAIL"); process.exit(1); }
P("  RETENTION GATE: PASS");
P("  Scope, stated: this is the PER-COMMIT stage. Dynamic retention measurement across");
P("  platforms is the nightly/release stage and did not run here.");
process.exit(0);
