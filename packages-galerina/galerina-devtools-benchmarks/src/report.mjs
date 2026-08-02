// =============================================================================
// report.mjs — three benchmark views from one admitted result:
//   1. current versus the last distinct archive;
//   2. interpreted current cross-language measurements;
//   3. future Galerina/SLIDE versus one exact archived Galerina/Wasm baseline.
// =============================================================================
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  REPORT_RUNTIMES,
  benchmarkRate,
  buildCrossLanguageRows,
  buildReportMarkdown,
} from "./report-model.mjs";
import { buildSlideTransition, validateTransitionContract } from "./slide-transition.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const resultsDir = join(root, "results");
const latestPath = join(resultsDir, "latest.json");
if (!existsSync(latestPath)) {
  console.error("no results/latest.json — run `npm run run` (full) first");
  process.exit(2);
}
const latestRaw = readFileSync(latestPath, "utf8");
const latest = JSON.parse(latestRaw);

// Find the last distinct archive for the ordinary run-to-run diff. The explicit
// flag is fail-closed: a miss cannot silently select another baseline.
const archiveDir = join(resultsDir, "archive");
const argBase = process.argv.indexOf("--baseline");
let baseline = null;
let baselineLabel = null;
if (argBase !== -1) {
  const requested = process.argv[argBase + 1];
  if (!requested || process.argv.indexOf("--baseline", argBase + 1) !== -1) {
    console.error("--baseline requires exactly one archive directory name");
    process.exit(2);
  }
  const path = join(archiveDir, requested, "results.json");
  if (!existsSync(path)) {
    console.error(`baseline snapshot not found: ${requested}`);
    process.exit(2);
  }
  baseline = JSON.parse(readFileSync(path, "utf8"));
  baselineLabel = requested;
} else if (existsSync(archiveDir)) {
  const snapshots = readdirSync(archiveDir)
    .filter((directory) => existsSync(join(archiveDir, directory, "results.json")))
    .sort()
    .reverse();
  for (const snapshot of snapshots) {
    const raw = readFileSync(join(archiveDir, snapshot, "results.json"), "utf8");
    if (raw !== latestRaw) {
      baseline = JSON.parse(raw);
      baselineLabel = snapshot;
      break;
    }
  }
}

const diffFromLast = [];
if (baseline) {
  const preMap = new Map(baseline.map((benchmark) => [benchmark.benchmark, benchmark.results]));
  for (const benchmark of latest) {
    const previous = preMap.get(benchmark.benchmark);
    if (!previous) continue;
    for (const runtime of REPORT_RUNTIMES) {
      const pre = benchmarkRate(previous[runtime.key]);
      const post = benchmarkRate(benchmark.results?.[runtime.key]);
      if (typeof pre === "number" && typeof post === "number" && pre > 0) {
        diffFromLast.push({
          benchmark: benchmark.benchmark,
          runtime: runtime.label,
          pre,
          post,
          deltaPct: ((post - pre) / pre) * 100,
        });
      }
    }
  }
  diffFromLast.sort((left, right) => Math.abs(right.deltaPct) - Math.abs(left.deltaPct));
}

const transitionContractPath = join(root, "contracts", "galerina-slide-transition-v1.json");
if (!existsSync(transitionContractPath)) {
  console.error("SLIDE transition contract is missing");
  process.exit(2);
}
const transitionContract = validateTransitionContract(JSON.parse(readFileSync(transitionContractPath, "utf8")));
const transitionArchivePath = join(archiveDir, transitionContract.archiveDirectory, "results.json");
if (!existsSync(transitionArchivePath)) {
  console.error(`SLIDE transition archive is missing: ${transitionContract.archiveDirectory}`);
  process.exit(2);
}
const transitionArchiveBytes = readFileSync(transitionArchivePath);
const transitionArchiveDigest = createHash("sha256").update(transitionArchiveBytes).digest("hex");
if (transitionArchiveDigest !== transitionContract.archiveResultsSha256) {
  console.error(`SLIDE transition archive digest mismatch: ${transitionContract.archiveDirectory}`);
  process.exit(2);
}
const transitionBaseline = JSON.parse(transitionArchiveBytes.toString("utf8"));
const slideTransition = buildSlideTransition({
  contract: transitionContract,
  baseline: transitionBaseline,
  current: latest,
});

const crossLanguage = buildCrossLanguageRows(latest);
const report = {
  baseline: baselineLabel,
  runtimes: REPORT_RUNTIMES.map((runtime) => runtime.label),
  runtimeCatalog: REPORT_RUNTIMES.map((runtime) => ({
    key: runtime.key,
    label: runtime.label,
    ranked: runtime.ranked,
    productionGalerina: runtime.productionGalerina === true,
  })),
  diffFromLast,
  crossLanguage,
  slideTransition,
};

writeFileSync(join(resultsDir, "benchmark-report-latest.md"), buildReportMarkdown(report));
writeFileSync(join(resultsDir, "benchmark-report-latest.json"), JSON.stringify(report, null, 2));

try {
  const { buildChartHtml } = await import("./chart.mjs");
  writeFileSync(join(resultsDir, "benchmark-chart-latest.html"), buildChartHtml(report));
  console.log("✅ chart: results/benchmark-chart-latest.html (self-contained SVG)");
} catch (error) {
  console.warn(`⚠ chart skipped: ${error?.message ?? error}`);
}

console.log("✅ report: results/benchmark-report-latest.{md,json}");
console.log(`   view 1 — diff vs "${baselineLabel ?? "none"}": ${diffFromLast.length} pairs${diffFromLast.length ? ` (top: ${diffFromLast[0].benchmark}/${diffFromLast[0].runtime} ${diffFromLast[0].deltaPct >= 0 ? "+" : ""}${diffFromLast[0].deltaPct.toFixed(0)}%)` : ""}`);
console.log(`   view 2 — interpreted cross-language: ${crossLanguage.filter((row) => row.aligned).length} aligned benchmarks × ${REPORT_RUNTIMES.length} displayed lanes`);
console.log(`   view 3 — ${slideTransition.candidateLabel} vs archived ${slideTransition.baselineLabel}: ${slideTransition.status}`);
