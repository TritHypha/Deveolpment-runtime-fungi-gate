#!/usr/bin/env node
// =============================================================================
// audit-memory-leak.mjs — fail-CLOSED memory-leak audit for repeated workloads.
//
// WHAT A LEAK IS HERE. Not "memory is used" and not "RSS went up". A leak is
// RETENTION THAT SURVIVES A FULL COLLECTION AND GROWS WITH ITERATION COUNT. So the
// measurement is: run the identical workload N times, force a full GC after each,
// and ask whether live memory has a positive TREND once warm-up is discarded.
//
// ★ MEMORY SAFETY IS NOT LEAK FREEDOM. A perfectly memory-safe program — no
// use-after-free, no out-of-bounds, every access checked — leaks happily if it
// retains. WASM makes this sharper: `memory.grow` is MONOTONIC. A wasm module can
// never corrupt the host and still exhaust it, because linear memory only ever
// grows. Safety is about what a program may TOUCH; a leak is about what it will
// not LET GO. This tool measures the second and says nothing about the first.
//
// FOUR CHANNELS, MEASURED SEPARATELY — because they fail differently and RSS alone
// cannot tell them apart:
//
//   heapUsed     JS objects retained by a live reference (the classic leak).
//   external     off-heap memory the runtime accounts for — ★ THIS IS WHERE WASM
//                LINEAR MEMORY LANDS. A `memory.grow` leak moves `external` and
//                leaves `heapUsed` flat, so a heap-only tool reports all-clear on
//                the one case that matters most for a wasm target.
//   arrayBuffers TypedArray/ArrayBuffer backing stores, a subset of external.
//   rss          what the OS has actually mapped. CORROBORATION ONLY, never the
//                verdict: allocators retain freed pages, so RSS lags a real leak
//                and rises without one. A tool that judges on RSS reports both
//                false alarms and false all-clears.
//
// WHY A NOISE BAND AND NOT A THRESHOLD. A fixed "flag if it grows by 1 MB" is a
// number pulled from the air. Instead the tool runs its OWN clean fixture to
// measure what a NON-leaking workload's slope looks like on THIS machine, right
// now, and flags a subject only when its slope leaves that measured band. The band
// is a property of the host, not of my opinion — and it is re-measured per run,
// because a band imported from another machine is a guess wearing a number's
// clothes.
//
// SLOPE BY THEIL–SEN, NOT LEAST SQUARES. Memory series are step functions with
// outliers: a single GC that ran late moves a least-squares fit hard. Theil–Sen
// takes the MEDIAN of all pairwise slopes and shrugs off up to ~29% bad points.
//
// FAIL-CLOSED, IN THREE PLACES — a measurement tool that cannot measure must DENY,
// never pass:
//   1. No `global.gc` -> the tool re-execs itself with --expose-gc. If that fails,
//      it EXITS NON-ZERO. Without forced collection, "still live" is unknowable and
//      a green would be a guess. Unknown never resolves to ALLOW.
//   2. `--self-test` must classify a known leaker AND a known-clean fixture
//      correctly. Either failure neuters the audit, so the audit refuses to run.
//   3. A subject that throws is an ERROR, not a pass. Two failed iterations
//      diffing to zero growth is not evidence of health.
//
// EXIT CODES:  0 clean · 1 leak detected or self-test failed · 2 usage/harness error
// =============================================================================

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import process from "node:process";

const CHANNELS = ["heapUsed", "external", "arrayBuffers", "rss", "durationUs"];
/** RSS is corroboration only — never allowed to raise a verdict on its own. */
const VERDICT_CHANNELS = ["heapUsed", "external", "arrayBuffers"];

// ★ `durationUs` is a SYMPTOM channel, added from RD-0746. That source demonstrates
// the failure mode this tool would otherwise miss entirely: under virtual memory a
// leaking program often does NOT crash — it degrades, because the working set is
// pushed down the hierarchy and eventually onto swap, and "virtual memory is also
// slow". A leak can therefore be felt as latency long before it is visible as a
// byte count, and a byte-only tool reports all-clear the whole way down.
//
// It is reported and NEVER used to raise a leak verdict, for the same reason RSS is
// not: per-iteration time moves for a dozen reasons that are not retention — JIT
// warm-up, CPU frequency, an unlucky GC, another process. Promoting it to a verdict
// would manufacture false alarms. Rising time WITH flat memory is the interesting
// case, and it is surfaced as a distinct note rather than a leak.
const SYMPTOM_CHANNELS = ["durationUs"];

// ---------------------------------------------------------------------------
// Fail-closed gate 1: forced collection, or nothing is measurable
// ---------------------------------------------------------------------------

function ensureGc(argv) {
  if (typeof global.gc === "function") return;
  const r = spawnSync(process.execPath, ["--expose-gc", process.argv[1], ...argv],
    { stdio: "inherit", timeout: 30 * 60 * 1000 });
  if (r.error || r.status === null) {
    console.error("DENY: could not re-exec with --expose-gc, and without forced collection a");
    console.error("      'still live' reading is unknowable. Run: node --expose-gc " + process.argv[1]);
    process.exit(2);
  }
  process.exit(r.status);
}

/** Collect hard enough that anything reachable-but-dead is genuinely gone. */
async function settle() {
  for (let i = 0; i < 3; i++) { global.gc(); await new Promise((r) => setImmediate(r)); }
  global.gc();
}

// ---------------------------------------------------------------------------
// Robust statistics
// ---------------------------------------------------------------------------

const median = (a) => {
  if (a.length === 0) return 0;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Theil–Sen: the median of every pairwise slope. Robust where least squares is
 * not, which matters because a memory series is a staircase with the odd late GC.
 * Units: bytes per iteration.
 */
function theilSen(ys) {
  const slopes = [];
  for (let i = 0; i < ys.length; i++) {
    for (let j = i + 1; j < ys.length; j++) slopes.push((ys[j] - ys[i]) / (j - i));
  }
  return median(slopes);
}

// ---------------------------------------------------------------------------
// The measurement core
// ---------------------------------------------------------------------------

/**
 * Run `work` `iters` times, forcing a full collection after each, and return the
 * per-iteration series for every channel. Warm-up samples are taken but MARKED,
 * not silently dropped — a caller that cannot see them cannot audit the audit.
 */
async function measure(work, { iters, warmup, label }) {
  const series = Object.fromEntries(CHANNELS.map((c) => [c, []]));
  let threw = null;
  await settle();
  for (let i = 0; i < iters + warmup; i++) {
    // Time the WORK only — the forced collection below is harness cost, not the
    // subject's, and including it would make the time channel measure the GC.
    const t0 = performance.now();
    try { await work(i); } catch (e) { threw = e; break; }
    const t1 = performance.now();
    await settle();
    const m = process.memoryUsage();
    for (const c of CHANNELS) series[c].push(c === "durationUs" ? (t1 - t0) * 1000 : (m[c] ?? 0));
  }
  if (threw) {
    return { label, error: `subject threw on iteration: ${threw && threw.message}` };
  }
  const kept = Object.fromEntries(CHANNELS.map((c) => [c, series[c].slice(warmup)]));
  const slope = Object.fromEntries(CHANNELS.map((c) => [c, theilSen(kept[c])]));
  const growth = Object.fromEntries(CHANNELS.map((c) => {
    const a = kept[c];
    return [c, a.length ? a[a.length - 1] - a[0] : 0];
  }));
  return { label, series, kept, slope, growth, iters, warmup };
}

// ---------------------------------------------------------------------------
// Built-in fixtures — the discriminating control lives INSIDE the tool
// ---------------------------------------------------------------------------

/** KNOWN LEAKER: retains into a closure-held array. Must be flagged. */
function makeLeaker() {
  const retained = [];
  return async (i) => {
    const chunk = new Array(2000).fill(0).map((_, k) => ({ i, k, pad: "x".repeat(64) }));
    retained.push(chunk);            // ← the leak: nothing ever drops this
  };
}

/** KNOWN CLEAN: identical work and identical allocation volume, retained NOTHING. */
function makeClean() {
  return async (i) => {
    const chunk = new Array(2000).fill(0).map((_, k) => ({ i, k, pad: "x".repeat(64) }));
    if (chunk.length === -1) throw new Error("unreachable");   // defeat DCE, keep the work real
  };
}

/**
 * KNOWN LEAKER, OFF-HEAP: grows `external`/`arrayBuffers` while leaving heapUsed
 * almost flat — the shape a WASM `memory.grow` leak produces. A tool that watches
 * only the JS heap passes this, which is exactly why it is a fixture.
 */
function makeExternalLeaker() {
  const retained = [];
  return async () => { retained.push(Buffer.allocUnsafe(512 * 1024)); };
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

/**
 * Build the noise band from the CLEAN fixture's own slopes, then judge the subject
 * against it. `reps` independent clean runs give the band a width that reflects
 * this machine on this day.
 */
async function calibrateBand(opts) {
  const runs = [];
  for (let r = 0; r < opts.reps; r++) runs.push(await measure(makeClean(), opts));
  const bad = runs.find((r) => r.error);
  if (bad) return { error: "clean fixture failed: " + bad.error };
  const band = {};
  for (const c of CHANNELS) {
    const s = runs.map((r) => r.slope[c]);
    const mag = s.map(Math.abs);
    // The band is the largest magnitude the CLEAN workload produced, widened by a
    // factor so a merely-unlucky run does not read as a leak. Widening is stated
    // openly rather than hidden in a constant with no name.
    band[c] = { observed: s, ceiling: Math.max(...mag) * BAND_WIDEN + BAND_FLOOR_BYTES };
  }
  return { band, runs };
}

const BAND_WIDEN = 3;            // clean-slope magnitude is multiplied by this
const BAND_FLOOR_BYTES = 4096;   // one page: below this, per-iteration slope is noise

function judge(subject, band) {
  const flagged = [];
  for (const c of VERDICT_CHANNELS) {
    if (subject.slope[c] > band[c].ceiling) {
      flagged.push({ channel: c, slope: subject.slope[c], ceiling: band[c].ceiling, growth: subject.growth[c] });
    }
  }
  return { leak: flagged.length > 0, flagged };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const kb = (n) => (n / 1024).toFixed(1).padStart(9) + " KB";
const perIter = (n) => (n / 1024).toFixed(2).padStart(8) + " KB/iter";
const us = (n) => (n / 1000).toFixed(2).padStart(8) + " ms/iter";

function report(subject, band, verdict) {
  console.log(`\n  ${subject.label}   (${subject.iters} iterations, ${subject.warmup} discarded as warm-up)`);
  console.log("    channel        slope (Theil-Sen)      total growth     noise ceiling   verdict");
  for (const c of CHANNELS) {
    const isVerdict = VERDICT_CHANNELS.includes(c);
    const isTime = SYMPTOM_CHANNELS.includes(c);
    const over = isVerdict && subject.slope[c] > band[c].ceiling;
    const tag = isTime ? "symptom only" : !isVerdict ? "corroboration only" : over ? "★ OVER BAND" : "within band";
    const fmt = isTime ? us : perIter, fmtG = isTime ? us : kb;
    console.log(`    ${c.padEnd(13)} ${fmt(subject.slope[c])}   ${fmtG(subject.growth[c])}   ${fmt(band[c].ceiling)}   ${tag}`);
  }
  console.log("    -> " + (verdict.leak
    ? `LEAK: ${verdict.flagged.map((f) => f.channel).join(", ")}`
    : "no leak detected on the measured channels"));
  // RD-0746: a leak can be felt as latency before it is visible as bytes, because
  // virtual memory absorbs the growth and trades it for slowness. Rising time with
  // flat memory is therefore worth SAYING, and worth never calling a leak.
  if (!verdict.leak && subject.slope.durationUs > band.durationUs.ceiling) {
    console.log("    ⚠ per-iteration TIME is rising while memory is flat. Not a leak by this tool's");
    console.log("      definition, and not nothing: under virtual memory a leak degrades before it");
    console.log("      fails. Re-run longer, or profile — this channel cannot tell retention from a");
    console.log("      noisy machine, and it is not allowed to try.");
  }
}

// ---------------------------------------------------------------------------
// Fail-closed gate 2: the self-test. A neutered detector is itself a fail-open.
// ---------------------------------------------------------------------------

async function selfTest(opts) {
  console.log("== self-test: the detector must fire on a known leaker AND stay silent on a known-clean workload ==");
  const cal = await calibrateBand(opts);
  if (cal.error) { console.error("  ❌ " + cal.error); return false; }

  const cases = [
    ["KNOWN LEAKER (heap retention)", makeLeaker(), true],
    ["KNOWN CLEAN (same work, no retention)", makeClean(), false],
    ["KNOWN LEAKER (off-heap — the WASM linear-memory shape)", makeExternalLeaker(), true],
  ];
  let ok = true;
  for (const [label, work, mustFlag] of cases) {
    const s = await measure(work, { ...opts, label });
    if (s.error) { console.error("  ❌ " + label + ": " + s.error); ok = false; continue; }
    const v = judge(s, cal.band);
    report(s, cal.band, v);
    const pass = v.leak === mustFlag;
    console.log(`    SELF-TEST ${pass ? "pass" : "❌ FAIL"} — expected ${mustFlag ? "a flag" : "silence"}, got ${v.leak ? "a flag" : "silence"}`);
    if (!pass) ok = false;
  }
  console.log("\n  " + (ok
    ? "✅ self-test passed — the detector discriminates. A verdict from this run means something."
    : "❌ self-test FAILED — the detector does not discriminate, so no scan result would adjudicate anything."));
  return ok;
}

// ---------------------------------------------------------------------------
// Cache-hierarchy calibration (L1/L2/L3/RAM), measured — never assumed
// ---------------------------------------------------------------------------

/**
 * Pointer-chase stride sweep. Each buffer size is walked along a RANDOM CYCLE, one
 * dependent load at a time, so the hardware prefetcher cannot run ahead: every
 * access must complete before the next address is known.
 *
 * ★ This is the whole reason for the random cycle. A sequential or strided walk
 * measures TRAVERSAL COST with the prefetcher helping, which dilutes the very step
 * being looked for — the tiers blur and L3 looks like L2. Only a
 * prefetch-defeating walk yields per-level latency.
 *
 * Why it belongs in a leak tool: a leak's hardware signature is a working set that
 * MIGRATES DOWN this hierarchy. Bytes are the leading indicator; falling out of L2
 * into L3, then into RAM, is what the user actually feels.
 */
function calibrateCache({ minKB = 4, maxKB = 65536, steps = 400_000 } = {}) {
  console.log("== cache hierarchy, measured on this machine by prefetch-defeating pointer chase ==");
  console.log("   (a random cycle, one dependent load at a time — a strided walk would let the");
  console.log("    prefetcher hide the very step we are looking for)\n");
  console.log("      size        ns/access    relative");
  const rows = [];
  for (let kb = minKB; kb <= maxKB; kb *= 2) {
    const n = (kb * 1024) / 4;
    const idx = new Int32Array(n);
    // Build a single random cycle covering every slot (Sattolo's algorithm).
    for (let i = 0; i < n; i++) idx[i] = i;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    const cycle = new Int32Array(n);
    for (let i = 0; i < n; i++) cycle[idx[i]] = idx[(i + 1) % n];

    let p = 0;
    for (let i = 0; i < Math.min(steps, n); i++) p = cycle[p];   // warm
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) p = cycle[p];
    const t1 = performance.now();
    if (p === -1) console.log("");                                // defeat DCE
    const ns = ((t1 - t0) * 1e6) / steps;
    rows.push({ kb, ns });
  }
  const base = rows[0].ns;
  for (const r of rows) {
    const rel = r.ns / base;
    const bar = "█".repeat(Math.min(46, Math.round(rel * 2)));
    console.log(`   ${String(r.kb).padStart(7)} KB  ${r.ns.toFixed(2).padStart(8)}    ${rel.toFixed(2).padStart(5)}x  ${bar}`);
  }
  // Report the steps rather than assert tier names: a doubling in dependent-load
  // latency is a boundary crossing. Naming which tier it is would be a guess about
  // this CPU that the measurement does not license.
  console.log("\n   boundary crossings (a step where latency jumps >= 1.5x the previous size):");
  let found = 0;
  for (let i = 1; i < rows.length; i++) {
    const j = rows[i].ns / rows[i - 1].ns;
    if (j >= 1.5) { console.log(`     between ${rows[i - 1].kb} KB and ${rows[i].kb} KB   (${j.toFixed(2)}x)`); found++; }
  }
  if (found === 0) {
    console.log("     none detected — either the sweep is too coarse or the timer resolution is");
    console.log("     hiding the steps. Treat this as an INSTRUMENT limit, not as 'the machine has");
    console.log("     no cache hierarchy'.");
  }
  return rows;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage(code) {
  console.log(`audit-memory-leak.mjs — fail-closed memory-leak audit

  --self-test               prove the detector fires on a known leaker and stays
                            silent on a known-clean workload. Run this FIRST; a
                            scan from an unproven detector adjudicates nothing.
  --run <module.mjs>        audit a subject. The module must default-export an
                            async function; it is called once per iteration.
  --calibrate-cache         measure this machine's memory hierarchy by
                            prefetch-defeating pointer chase.
  --iters <n>               measured iterations (default 30)
  --warmup <n>              discarded warm-up iterations (default 8)
  --reps <n>                clean-fixture repetitions for the noise band (default 3)

exit: 0 clean · 1 leak or self-test failure · 2 usage/harness error`);
  process.exit(code);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help")) usage(argv.length === 0 ? 2 : 0);
  ensureGc(argv);

  const num = (flag, dflt) => {
    const i = argv.indexOf(flag);
    if (i === -1) return dflt;
    const v = Number(argv[i + 1]);
    if (!Number.isFinite(v) || v <= 0) { console.error(`  ${flag} needs a positive number`); process.exit(2); }
    return v;
  };
  const opts = { iters: num("--iters", 30), warmup: num("--warmup", 8), reps: num("--reps", 3), label: "clean-band" };

  if (argv.includes("--calibrate-cache")) { calibrateCache(); process.exit(0); }

  if (argv.includes("--self-test")) process.exit((await selfTest(opts)) ? 0 : 1);

  const ri = argv.indexOf("--run");
  if (ri === -1 || !argv[ri + 1]) usage(2);

  // Gate 2 applies to every real scan too: prove the detector before trusting it.
  if (!(await selfTest(opts))) {
    console.error("\nDENY: refusing to report on a subject while the detector is unproven.");
    process.exit(1);
  }

  const target = argv[ri + 1];
  let work;
  try {
    const mod = await import(pathToFileURL(target).href);
    work = mod.default;
    if (typeof work !== "function") throw new Error("module has no default-exported function");
  } catch (e) {
    console.error(`  cannot load subject '${target}': ${e.message}`);
    process.exit(2);
  }

  const cal = await calibrateBand(opts);
  if (cal.error) { console.error("  " + cal.error); process.exit(2); }
  const subject = await measure(work, { ...opts, label: target });
  if (subject.error) { console.error("  ERROR: " + subject.error); process.exit(2); }
  const verdict = judge(subject, cal.band);
  console.log("\n== subject ==");
  report(subject, cal.band, verdict);
  process.exit(verdict.leak ? 1 : 0);
}

main().catch((e) => { console.error("harness error: " + (e && e.stack || e)); process.exit(2); });
