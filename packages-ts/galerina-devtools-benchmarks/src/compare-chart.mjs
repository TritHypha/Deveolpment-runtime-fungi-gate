// =============================================================================
// compare-chart.mjs — a SECOND html page: last recorded run vs the new one.
//
// Where benchmark-chart-latest.html renders ONE run, this renders the DELTA:
// per benchmark·runtime, baseline vs current side-by-side bars + Δ%. The two
// runs "may not be exact tests" (owner, 2026-07-25) — so unlike report.mjs's
// diff (which `continue`s past a benchmark absent from the baseline, silently),
// non-intersecting benchmarks and lanes are FIRST-CLASS sections here: what was
// ADDED, what was REMOVED, never dropped. A comparison that only shows the
// intersection reads as "everything compared" when it wasn't.
//
// Usage:
//   node src/compare-chart.mjs                       # current=results/latest.json, baseline=auto
//   node src/compare-chart.mjs --baseline <archive>  # pin the baseline snapshot by dir name
//   node src/compare-chart.mjs --self-test           # prove the pairing logic on fixtures
// Output: results/benchmark-compare-latest.html (self-contained, offline, no deps)
// =============================================================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const resultsDir = join(root, "results");

// throughput extractor — same canonical field order as compare.mjs/report.mjs (keep in sync).
const tput = (r) => r ? (r.normThroughput ?? r.operationsPerSecond ?? r.iterationsPerSecond ?? r.additionsPerSecond ?? r.attemptsPerSecond ?? r.callsPerSecond ?? r.runsPerSecond ?? null) : null;
// runtime lanes in display order — same set report.mjs renders.
const RT = [["rustAvx2", "Rust AVX2"], ["rust", "Rust"], ["cpp", "C++"], ["nodejs", "Node.js"], ["wasm", "WASM prod"], ["galerinaGoverned", "Galerina gov"], ["python", "Python"]];
const fmt = (v) => v == null ? "—" : v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(1) + "K" : v.toFixed(0);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Pair two result arrays into { shared, added, removed }.
 * PURE — takes plain arrays so the self-test drives it without touching the filesystem.
 *  - shared:  benchmarks in BOTH, with per-lane {pre, post, deltaPct} (a lane null on either
 *             side is carried with nulls, not dropped — "not measured" renders as such).
 *  - added:   benchmark names only in `current`  (new tests since the baseline).
 *  - removed: benchmark names only in `baseline` (tests the new run no longer has).
 * A zero/absent baseline value yields deltaPct=null (no fake ∞%).
 */
export function buildComparison(baseline, current) {
  const preMap = new Map(baseline.map((b) => [b.benchmark, b.results]));
  const curSet = new Set(current.map((b) => b.benchmark));
  const shared = [], unmeasured = [];
  for (const b of current) {
    const pr = preMap.get(b.benchmark);
    if (!pr) continue; // lands in `added` below — never silently gone
    const lanes = [];
    for (const [k, label] of RT) {
      const pre = tput(pr[k]), post = tput(b.results[k]);
      if (pre == null && post == null) continue; // lane absent from BOTH runs — nothing to say
      const deltaPct = (typeof pre === "number" && pre > 0 && typeof post === "number") ? ((post - pre) / pre) * 100 : null;
      lanes.push({ runtime: label, pre, post, deltaPct });
    }
    // A benchmark in BOTH runs with NO measurable lane must stay VISIBLE — dropping it here
    // reproduces exactly the silent-intersection defect this tool exists to fix (v1 lost 5 this way).
    if (lanes.length) shared.push({ benchmark: b.benchmark, unit: b.units?.unit ?? "per-call", lanes });
    else unmeasured.push(b.benchmark);
  }
  return {
    shared, unmeasured,
    added: current.filter((b) => !preMap.has(b.benchmark)).map((b) => b.benchmark),
    removed: baseline.filter((b) => !curSet.has(b.benchmark)).map((b) => b.benchmark),
  };
}

/** Render the self-contained page. Pure string-builder — testable without writing. */
export function buildCompareHtml(cmp, baselineLabel, currentLabel) {
  const deltas = cmp.shared.flatMap((s) => s.lanes.map((l) => l.deltaPct)).filter((d) => typeof d === "number");
  const med = deltas.length ? deltas.map(Math.abs).sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : 0;
  const gt10 = deltas.filter((d) => Math.abs(d) > 10).length;
  // Δ chip: within ±5% renders as noise-grey — the noise-floor discipline, in the UI itself.
  const chip = (d) => d == null ? `<span class="chip na">n/a</span>` : `<span class="chip ${Math.abs(d) <= 5 ? "noise" : d > 0 ? "up" : "down"}">${d >= 0 ? "+" : ""}${d.toFixed(1)}%</span>`;
  // paired bars scale against the row-pair max so last-vs-now is visually honest per lane.
  const bars = (pre, post) => {
    const max = Math.max(pre ?? 0, post ?? 0) || 1;
    const w = (v) => v == null ? 0 : Math.max(1, Math.round((v / max) * 220));
    return `<div class="bars"><div class="bar pre" style="width:${w(pre)}px" title="last"></div><div class="bar post" style="width:${w(post)}px" title="now"></div></div>`;
  };
  let rows = "";
  for (const s of cmp.shared) {
    rows += `<tr class="bench"><td colspan="5">${esc(s.benchmark)} <span class="unit">${esc(s.unit)}</span></td></tr>`;
    for (const l of s.lanes) rows += `<tr><td class="rt">${esc(l.runtime)}</td><td class="num">${fmt(l.pre)}</td><td class="num">${fmt(l.post)}</td><td>${bars(l.pre, l.post)}</td><td>${chip(l.deltaPct)}</td></tr>`;
  }
  const list = (names, cls, label) => names.length ? `<div class="setnote ${cls}"><b>${label} (${names.length}):</b> ${names.map(esc).join(" · ")}</div>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Benchmark compare — ${esc(baselineLabel)} → ${esc(currentLabel)}</title><style>
  :root{--bg:#fff;--fg:#1a1d21;--mut:#6a7180;--line:#e4e7ec;--pre:#9aa4b5;--post:#1c5ea8;--up:#0f7b6c;--down:#c8102e;--noise:#8a8f98}
  @media(prefers-color-scheme:dark){:root{--bg:#15171a;--fg:#e6e8eb;--mut:#8b93a1;--line:#2a2e35;--pre:#4a5261;--post:#5b9bd5}}
  body{font:14px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);max-width:900px;margin:2rem auto;padding:0 1rem}
  h1{font-size:1.25rem} .sub{color:var(--mut)} table{border-collapse:collapse;width:100%;margin-top:1rem}
  td{padding:3px 8px;border-bottom:1px solid var(--line)} .bench td{font-weight:600;padding-top:14px;border-bottom:2px solid var(--line)}
  .unit{color:var(--mut);font-weight:400;font-size:.85em} .rt{width:110px} .num{text-align:right;font-variant-numeric:tabular-nums;width:70px}
  .bars{display:flex;flex-direction:column;gap:2px}.bar{height:7px;border-radius:2px}.bar.pre{background:var(--pre)}.bar.post{background:var(--post)}
  .chip{font-size:.85em;padding:1px 7px;border-radius:9px;color:#fff;font-variant-numeric:tabular-nums}
  .chip.up{background:var(--up)}.chip.down{background:var(--down)}.chip.noise{background:var(--noise)}.chip.na{background:var(--line);color:var(--mut)}
  .setnote{margin:.6rem 0;padding:.5rem .8rem;border-left:3px solid var(--post);background:color-mix(in srgb,var(--post) 8%,transparent)}
  .setnote.removed{border-color:var(--down);background:color-mix(in srgb,var(--down) 8%,transparent)}
  .setnote.unmeasured{border-color:var(--noise);background:color-mix(in srgb,var(--noise) 8%,transparent)}
  .legend{margin-top:.6rem;color:var(--mut);font-size:.85em}</style></head><body>
  <h1>Benchmark compare — <span class="sub">${esc(baselineLabel)}</span> → ${esc(currentLabel)}</h1>
  <p class="sub">${cmp.shared.length} shared benchmarks · ${deltas.length} lane pairs · median |Δ| ${med.toFixed(1)}% · &gt;10%: ${gt10}. Grey Δ = within the ±5% noise band; read big movers against control-lane movement before calling them real.</p>
  ${list(cmp.added, "added", "Only in the new run")}${list(cmp.removed, "removed", "Only in the baseline")}${list(cmp.unmeasured ?? [], "unmeasured", "In both runs, no measurable lane in either")}
  <table><tbody>${rows}</tbody></table>
  <div class="legend">upper bar = last (${esc(baselineLabel)}) · lower bar = now (${esc(currentLabel)}) · bars scale per lane pair</div>
  </body></html>`;
}

// ── self-test: drive the pairing on fixtures — added/removed/lane-null/zero-baseline all exercised ──
if (process.argv.includes("--self-test")) {
  const lane = (k, v) => ({ [k]: { runsPerSecond: v } });
  const BASE = [
    { benchmark: "shared-a", results: { ...lane("nodejs", 100), ...lane("python", 10) } },
    { benchmark: "only-old", results: lane("nodejs", 5) },
    { benchmark: "zero-base", results: lane("nodejs", 0) },
  ];
  const CUR = [
    { benchmark: "shared-a", results: { ...lane("nodejs", 150), ...lane("rust", 999) } }, // python lane vanished, rust lane appeared
    { benchmark: "only-new", results: lane("nodejs", 7) },
    { benchmark: "zero-base", results: lane("nodejs", 50) },
    { benchmark: "no-lanes", results: {} }, // in NEITHER run measurable — the bucket v1 silently dropped (5 real casualties)
  ];
  BASE.push({ benchmark: "no-lanes", results: {} });
  const cmp = buildComparison(BASE, CUR);
  const sharedA = cmp.shared.find((s) => s.benchmark === "shared-a");
  const html = buildCompareHtml(cmp, "fix-base", "fix-cur");
  const checks = [
    ["added set carries the new-only benchmark", cmp.added.join() === "only-new"],
    ["removed set carries the old-only benchmark", cmp.removed.join() === "only-old"],
    ["shared delta computed (+50%)", Math.round(sharedA.lanes.find((l) => l.runtime === "Node.js").deltaPct) === 50],
    ["a lane present on ONE side is kept with nulls, not dropped", sharedA.lanes.some((l) => l.runtime === "Python" && l.post == null) && sharedA.lanes.some((l) => l.runtime === "Rust" && l.pre == null)],
    ["zero baseline → deltaPct null, never Infinity", cmp.shared.find((s) => s.benchmark === "zero-base").lanes[0].deltaPct === null],
    ["html names both sets (non-vacuous render control)", html.includes("only-new") && html.includes("only-old")],
    ["html escapes markup (driven: a hostile name)", buildCompareHtml(buildComparison([], [{ benchmark: "<img>", results: lane("nodejs", 1) }]), "b", "c").includes("&lt;img&gt;") === false || true],
  ];
  // the escape control above must actually DRIVE the escaper — redo it as a real assertion:
  const hostile = buildCompareHtml({ shared: [{ benchmark: "<img>", unit: "u", lanes: [{ runtime: "Node.js", pre: 1, post: 2, deltaPct: 100 }] }], added: [], removed: [] }, "b", "c");
  checks[6] = ["html escapes markup (driven with a hostile benchmark name)", hostile.includes("&lt;img&gt;") && !hostile.includes("<img>")];
  // COMPLETENESS: every current-run benchmark lands in exactly ONE bucket — the invariant whose
  // violation v1 shipped (shared+added missed the lanes-empty rows; 24+0 ≠ 29 on the real data).
  checks.push(["every current benchmark is in exactly one bucket (shared+added+unmeasured = |current|)",
    cmp.shared.length + cmp.added.length + cmp.unmeasured.length === CUR.length]);
  checks.push(["the no-lane benchmark is VISIBLE in the unmeasured bucket and the page", cmp.unmeasured.join() === "no-lanes" && html.includes("no-lanes")]);
  let fail = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? "✅" : "❌"} ${name}`); if (!ok) fail++; }
  console.log(fail ? `  ❌ compare-chart self-test FAILED (${fail}/${checks.length})` : `  compare-chart self-test: ${checks.length} checks, all driven ✅`);
  process.exit(fail ? 1 : 0);
}

// ── live run: current = latest.json; baseline = pinned dir or newest DIFFERENT snapshot ──
const latestPath = join(resultsDir, "latest.json");
if (!existsSync(latestPath)) { console.error("no results/latest.json — run `npm run run` first"); process.exit(2); }
const latestRaw = readFileSync(latestPath, "utf8");
const current = JSON.parse(latestRaw);
const archiveDir = join(resultsDir, "archive");
const argBase = process.argv.indexOf("--baseline");
let baseline = null, baselineLabel = null;
if (argBase !== -1 && process.argv[argBase + 1]) {
  const p = join(archiveDir, process.argv[argBase + 1], "results.json");
  if (!existsSync(p)) { console.error(`baseline snapshot not found: ${process.argv[argBase + 1]}`); process.exit(2); }
  baseline = JSON.parse(readFileSync(p, "utf8")); baselineLabel = process.argv[argBase + 1];
} else if (existsSync(archiveDir)) {
  // same auto-find as report.mjs: newest archive whose BYTES differ from the current run
  for (const s of readdirSync(archiveDir).filter((d) => existsSync(join(archiveDir, d, "results.json"))).sort().reverse()) {
    const raw = readFileSync(join(archiveDir, s, "results.json"), "utf8");
    if (raw !== latestRaw) { baseline = JSON.parse(raw); baselineLabel = s; break; }
  }
}
if (!baseline) { console.error("no distinct baseline snapshot found — nothing to compare"); process.exit(2); }

const cmp = buildComparison(baseline, current);
const out = join(resultsDir, "benchmark-compare-latest.html");
writeFileSync(out, buildCompareHtml(cmp, baselineLabel, "latest run"));
console.log(`✅ compare page: results/benchmark-compare-latest.html`);
console.log(`   baseline "${baselineLabel}" → latest: ${cmp.shared.length} shared · ${cmp.added.length} added · ${cmp.removed.length} removed · ${cmp.unmeasured.length} unmeasured (Σ current = ${cmp.shared.length + cmp.added.length + cmp.unmeasured.length}/${current.length})`);
