import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = resolve(HERE, "..", "results");
const JSON_PATH = join(RESULTS, "verified-native-operation-latest.json");
const ITERATIONS = 1_000_000;
const RATE_NUMERATOR = 1_000_000_000_000_000;
const CONTROL_KEYS = Object.freeze(["rustAvx2", "rust", "nodejs", "python"]);
const LABELS = Object.freeze({
  rustAvx2: "Rust AVX2",
  rust: "Rust",
  nodejs: "Node.js",
  python: "Python",
  checkedReference: "Checked reference - no permission",
  slideReference: "SLIDE reference - permission present",
});

function refusal() {
  return Object.freeze({ verdict: -1, status: "REFUSED" });
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

function validLane(lane, reference) {
  return lane !== null
    && typeof lane === "object"
    && lane.iterations === ITERATIONS
    && lane.result === 999_999
    && lane.unit === "element-reads/s"
    && lane.throughputUnit === "element-reads/s"
    && Array.isArray(lane.samplesNs)
    && lane.samplesNs.length === 9
    && lane.samplesNs.every((value) => Number.isSafeInteger(value) && value > 0)
    && lane.medianNs === median(lane.samplesNs)
    && lane.operationsPerSecond === Math.floor(RATE_NUMERATOR / lane.medianNs)
    && lane.normThroughput === lane.operationsPerSecond
    && typeof lane.antiElision === "string"
    && lane.antiElision.length > 0
    && (!reference || (lane.referenceOnly === true && lane.authorityReleased === false));
}

function verifiedRecord(value) {
  try {
    if (!Array.isArray(value) || value.length !== 1) return refusal();
    const entry = value[0];
    if (
      entry === null
      || typeof entry !== "object"
      || entry.benchmark !== "verified-native-operation"
      || entry.metricClass !== "cpu-throughput"
      || entry.units?.benchId !== "verified-native-operation"
      || entry.units?.comparable !== true
      || entry.units?.unit !== "element-reads/s"
      || entry.units?.status !== "PASS"
      || !Array.isArray(entry.units.problems)
      || entry.units.problems.length !== 0
      || !validLane(entry.results?.nodejs, false)
      || !validLane(entry.results?.python, false)
      || !validLane(entry.results?.checkedReference, true)
      || !validLane(entry.results?.slideReference, true)
    ) return refusal();
    for (const key of ["rust", "rustAvx2"]) {
      if (entry.results[key] !== undefined && !validLane(entry.results[key], false)) return refusal();
    }
    const phases = entry.results.slideReference.phases;
    const phaseKeys = [
      "sourcePreparationMedianNs", "sourceDemandMedianNs", "sourceTotalMedianNs",
      "slideCompilationMedianNs", "slidePreparationMedianNs", "slideDemandMedianNs",
      "slidePreparedTotalMedianNs", "slideEndToEndTotalMedianNs",
    ];
    if (
      phases === null
      || typeof phases !== "object"
      || phases.direction !== "lower-is-better"
      || phases.unit !== "nanoseconds-per-million-iteration-flow"
      || !phaseKeys.every((key) => Number.isSafeInteger(phases[key]) && phases[key] > 0)
    ) return refusal();
    if (
      phases.slideDemandMedianNs !== entry.results.slideReference.medianNs
      || phases.slideDemandVsChecked
        !== phases.slideDemandMedianNs / entry.results.checkedReference.medianNs
      || typeof entry.results.slideReference.provenance?.slideCommit !== "string"
      || !/^[0-9a-f]{40}$/u.test(entry.results.slideReference.provenance.slideCommit)
    ) return refusal();
    return Object.freeze({
      verdict: 1,
      status: "VERIFIED_REFERENCE_COMPARISON",
      iterations: ITERATIONS,
      result: 999_999,
      entry,
      checkedReference: entry.results.checkedReference,
      slideReference: entry.results.slideReference,
    });
  } catch {
    return refusal();
  }
}

export function verifyVerifiedNativeOperationResult(value) {
  return verifiedRecord(value);
}

function formatRate(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(3)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString("en-GB");
}

function formatMilliseconds(nanoseconds) {
  return `${(nanoseconds / 1_000_000).toFixed(3)} ms`;
}

function rankedControls(entry) {
  return CONTROL_KEYS
    .filter((key) => validLane(entry.results[key], false))
    .map((key) => ({ key, label: LABELS[key], rate: entry.results[key].normThroughput }))
    .sort((left, right) => right.rate - left.rate);
}

function winnerLabel(controls) {
  if (controls.length === 0) return "No native-language control measured";
  const best = controls[0].rate;
  return controls.filter((control) => control.rate === best).map((control) => control.label).join(" + ");
}

export function renderVerifiedNativeOperationMarkdown(value) {
  const verified = verifiedRecord(value);
  if (verified.verdict !== 1) throw new Error("REFUSED: unverified native-operation result");
  const entry = verified.entry;
  const controls = rankedControls(entry);
  const displayed = [
    ...controls,
    { key: "checkedReference", label: LABELS.checkedReference, rate: verified.checkedReference.normThroughput },
    { key: "slideReference", label: LABELS.slideReference, rate: verified.slideReference.normThroughput },
  ];
  const ratio = verified.slideReference.normThroughput / verified.checkedReference.normThroughput;
  const phases = verified.slideReference.phases;
  const rows = displayed.map((lane) => {
    const reference = lane.key.endsWith("Reference");
    return `| ${lane.label} | ${formatRate(lane.rate)} | ${reference ? "Reference only - cannot win" : "Ranked control"} |`;
  }).join("\n");

  return `# Verified native-operation benchmark

The workload traverses 1,000,000 signed 32-bit values and returns 999999.
**Higher is better** for the same-work throughput table in element-reads/s.
The permission-absent and permission-present lanes are reference evidence and
cannot win or count as Galerina production.

| Runtime or path | Throughput | Ranking status |
|---|---:|---|
${rows}

Measured native-language winner: **${winnerLabel(controls)}**. The green check
in the aggregate report means work-equivalent and unit-aligned; it does not mean Galerina won.

Reference demand speed-up: **${ratio.toFixed(3)}x** for the permission-present
SLIDE demand over the permission-absent checked reference. This is a laboratory
observation, not production authority.

## SLIDE phase accounting

**Lower is better** for every phase time below. Preparation and compilation are
not hidden in demand throughput.

| Phase | Median |
|---|---:|
| Checked reference demand - no permission | ${formatMilliseconds(verified.checkedReference.medianNs)} |
| Source preparation | ${formatMilliseconds(phases.sourcePreparationMedianNs)} |
| Source demand | ${formatMilliseconds(phases.sourceDemandMedianNs)} |
| Source total | ${formatMilliseconds(phases.sourceTotalMedianNs)} |
| .slide compilation | ${formatMilliseconds(phases.slideCompilationMedianNs)} |
| .slide preparation | ${formatMilliseconds(phases.slidePreparationMedianNs)} |
| .slide demand - permission present | ${formatMilliseconds(phases.slideDemandMedianNs)} |
| Prepared .slide total | ${formatMilliseconds(phases.slidePreparedTotalMedianNs)} |
| End-to-end .slide total | ${formatMilliseconds(phases.slideEndToEndTotalMedianNs)} |

Both reference lanes are JavaScript reference evidence. They do not establish a
native backend, physical erasure, a general-loop result or a production
Galerina/SLIDE performance claim.
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderVerifiedNativeOperationSvg(value) {
  const verified = verifiedRecord(value);
  if (verified.verdict !== 1) throw new Error("REFUSED: unverified native-operation result");
  const entry = verified.entry;
  const lanes = [
    ...rankedControls(entry),
    { key: "checkedReference", label: "Checked ref - no permission", rate: verified.checkedReference.normThroughput },
    { key: "slideReference", label: "SLIDE ref - permission present", rate: verified.slideReference.normThroughput },
  ];
  const maximum = Math.max(...lanes.map((lane) => lane.rate));
  const rows = lanes.map((lane, index) => {
    const y = 130 + index * 58;
    const width = Math.max(2, Math.round((lane.rate / maximum) * 520));
    const reference = lane.key.endsWith("Reference");
    const colour = reference ? (lane.key === "slideReference" ? "#a78bfa" : "#60a5fa") : "#34d399";
    return `<text x="32" y="${y + 17}" fill="#e2e8f0" font-family="Segoe UI,Arial,sans-serif" font-size="14">${escapeXml(lane.label)}</text>
  <rect x="310" y="${y}" width="${width}" height="28" rx="5" fill="${colour}"/>
  <text x="${Math.min(842, 320 + width)}" y="${y + 19}" fill="#f8fafc" font-family="Segoe UI,Arial,sans-serif" font-size="13">${formatRate(lane.rate)}</text>`;
  }).join("\n  ");
  const height = 190 + lanes.length * 58;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-labelledby="title description">
  <title id="title">Verified native-operation one-million traversal</title>
  <desc id="description">Throughput in element reads per second; higher is better. Checked and SLIDE lanes are reference only.</desc>
  <rect width="960" height="${height}" fill="#0b1220"/>
  <text x="32" y="48" fill="#f8fafc" font-family="Segoe UI,Arial,sans-serif" font-size="26" font-weight="700">One-million verified operation</text>
  <text x="32" y="78" fill="#99f6e4" font-family="Segoe UI,Arial,sans-serif" font-size="15">element-reads/s - higher is better</text>
  <text x="32" y="102" fill="#cbd5e1" font-family="Segoe UI,Arial,sans-serif" font-size="13">Blue/purple lanes are reference only and cannot establish a production winner.</text>
  ${rows}
</svg>`;
}

function main() {
  const value = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const markdown = renderVerifiedNativeOperationMarkdown(value);
  const svg = renderVerifiedNativeOperationSvg(value);
  writeFileSync(join(RESULTS, "verified-native-operation-latest.md"), markdown, "utf8");
  writeFileSync(join(RESULTS, "verified-native-operation-latest.svg"), svg, "utf8");
  process.stdout.write(markdown);
}

if (process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
