import { types } from "node:util";

import { normalizeThroughput } from "./throughput-units.mjs";

const HEX_40 = /^[0-9a-f]{40}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
const UTC_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const SOURCE_PATH = /^results\/[a-zA-Z0-9._/-]+$/u;

function plainRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || types.isProxy(value)) {
    throw new TypeError(`${label} must be plain data`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must be plain data`);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get || descriptor.set) throw new TypeError(`${label} must not contain accessors`);
  }
  return value;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} must be non-empty text`);
  return value;
}

function digest(value, label) {
  if (!HEX_64.test(value)) throw new TypeError(`${label} must be a lowercase SHA-256 digest`);
  return value;
}

function source(value, label) {
  plainRecord(value, label);
  if (!SOURCE_PATH.test(value.path) || value.path.includes("..") || value.path.includes("//")) {
    throw new TypeError(`${label}.path must be a repository-relative results path`);
  }
  return Object.freeze({ path: value.path, sha256: digest(value.sha256, `${label}.sha256`) });
}

function validateMetadata(value) {
  plainRecord(value, "metadata");
  if (!UTC_STAMP.test(value.generatedAt)) throw new TypeError("metadata.generatedAt must be a UTC timestamp");
  if (!HEX_40.test(value.galerinaCommit)) throw new TypeError("metadata.galerinaCommit must be a Git commit");
  if (!HEX_40.test(value.slideCommit)) throw new TypeError("metadata.slideCommit must be a Git commit");
  digest(value.resultSha256, "metadata.resultSha256");
  plainRecord(value.wasmReference, "metadata.wasmReference");
  requiredText(value.wasmReference.archiveDirectory, "metadata.wasmReference.archiveDirectory");
  digest(value.wasmReference.archiveResultsSha256, "metadata.wasmReference.archiveResultsSha256");
  if (!HEX_40.test(value.wasmReference.measuredGalerinaCommit)) {
    throw new TypeError("metadata.wasmReference.measuredGalerinaCommit must be a Git commit");
  }
  return value;
}

function validateArchiveMeta(value) {
  plainRecord(value, "archive metadata");
  if (!UTC_STAMP.test(value.capturedAt)) throw new TypeError("archive metadata capturedAt must be a UTC timestamp");
  plainRecord(value.git, "archive metadata git");
  requiredText(value.git.commit, "archive metadata git.commit");
  requiredText(value.git.branch, "archive metadata git.branch");
  return value;
}

function throughput(result) {
  if (!result || result.error) return undefined;
  for (const value of [
    result.normThroughput,
    result.operationsPerSecond,
    result.iterationsPerSecond,
    result.additionsPerSecond,
    result.attemptsPerSecond,
    result.callsPerSecond,
    result.runsPerSecond,
  ]) if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

function measuredValue(entry, lane) {
  const direct = throughput(entry.results[lane]);
  const normalized = normalizeThroughput(lane, entry.results[lane], entry.benchmark);
  const value = direct ?? normalized.ops;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function indexAdmitted(entries, lane, label) {
  if (!Array.isArray(entries) || types.isProxy(entries)) throw new TypeError(`${label} must be an array`);
  const admitted = new Map();
  for (const [index, entry] of entries.entries()) {
    plainRecord(entry, `${label}[${index}]`);
    plainRecord(entry.results, `${label}[${index}].results`);
    for (const key of Object.keys(entry.results)) {
      if (key.toLowerCase().startsWith("slide") && key !== "slide" && key !== "slideReference") {
        throw new TypeError(`unexpected SLIDE-like lane: ${key}`);
      }
    }
    if (!Object.hasOwn(entry.results, lane)) continue;
    if (entry.units?.comparable !== true || entry.units?.status !== "PASS" || entry.metricClass === "governance") continue;
    requiredText(entry.benchmark, `${label}[${index}].benchmark`);
    if (admitted.has(entry.benchmark)) throw new TypeError(`duplicate admitted ${label} workload: ${entry.benchmark}`);
    const value = measuredValue(entry, lane);
    if (value === undefined) continue;
    admitted.set(entry.benchmark, Object.freeze({
      benchmark: entry.benchmark,
      metricClass: entry.metricClass,
      unit: requiredText(entry.units.unit, `${label}[${index}].units.unit`),
      value,
    }));
  }
  return admitted;
}

export function buildSlideWasmHistoryModel(input) {
  plainRecord(input, "history input");
  const metadata = validateMetadata(input.metadata);
  const archiveMeta = validateArchiveMeta(input.archiveMeta);
  plainRecord(input.sources, "sources");
  const sources = Object.freeze({
    wasmResults: source(input.sources.wasmResults, "sources.wasmResults"),
    slideResults: source(input.sources.slideResults, "sources.slideResults"),
    wasmMeta: source(input.sources.wasmMeta, "sources.wasmMeta"),
  });
  if (sources.wasmResults.sha256 !== metadata.wasmReference.archiveResultsSha256) {
    throw new TypeError("Wasm source digest does not match metadata");
  }
  if (sources.slideResults.sha256 !== metadata.resultSha256) {
    throw new TypeError("SLIDE source digest does not match metadata");
  }

  const wasm = indexAdmitted(input.wasmArchive, "wasm", "Wasm archive");
  const slide = indexAdmitted(input.current, "slide", "current results");
  const slideReference = indexAdmitted(input.current, "slideReference", "current results");
  let sharedProductionWorkloads = 0;
  for (const [benchmark, candidate] of slide) {
    const baseline = wasm.get(benchmark);
    if (baseline && baseline.metricClass === candidate.metricClass && baseline.unit === candidate.unit) {
      sharedProductionWorkloads += 1;
    }
  }
  const workloads = [...wasm.values()].map((baseline) => {
    const candidate = slide.get(baseline.benchmark);
    const aligned = candidate !== undefined
      && candidate.metricClass === baseline.metricClass
      && candidate.unit === baseline.unit;
    return Object.freeze({
      benchmark: baseline.benchmark,
      unit: baseline.unit,
      wasmValue: baseline.value,
      slideValue: aligned ? candidate.value : null,
      slideDeltaPct: aligned ? ((candidate.value - baseline.value) * 100) / baseline.value : null,
    });
  });

  return Object.freeze({
    status: slide.size === 0 ? "REFERENCE_ONLY_NO_PRODUCTION_SLIDE" : "COMPARABLE_PRODUCTION_HISTORY",
    sharedProductionWorkloads,
    workloads: Object.freeze(workloads),
    rows: Object.freeze([
      Object.freeze({
        product: "Galerina/SLIDE",
        productionObservations: slide.size,
        referenceObservations: slideReference.size,
        state: slide.size === 0
          ? "Reference-only observation; production SLIDE is unmeasured"
          : "Production SLIDE observations recorded",
      }),
      Object.freeze({
        product: "Galerina/WASM",
        productionObservations: wasm.size,
        referenceObservations: 0,
        state: "Historic measured lane",
      }),
    ]),
    metadata: Object.freeze({
      generatedAt: metadata.generatedAt,
      galerinaCommit: metadata.galerinaCommit,
      slideCommit: metadata.slideCommit,
      wasmMeasuredGalerinaCommit: metadata.wasmReference.measuredGalerinaCommit,
      wasmCapturedAt: archiveMeta.capturedAt,
      archiveGitCommit: archiveMeta.git.commit,
      archiveGitBranch: archiveMeta.git.branch,
    }),
    sources,
  });
}

function html(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMeasurement(value) {
  for (const [divisor, suffix] of [[1_000_000_000, "B"], [1_000_000, "M"], [1_000, "K"]]) {
    if (value >= divisor) {
      const scaled = value / divisor;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return `${Number(scaled.toFixed(decimals))}${suffix}`;
    }
  }
  return String(Number(value.toFixed(value >= 10 ? 1 : 3)));
}

function formatDelta(value) {
  const rounded = Number(Math.abs(value).toFixed(1));
  return `${value >= 0 ? "+" : "−"}${rounded}%`;
}

export function buildSlideWasmHistoryHtml(model) {
  plainRecord(model, "history model");
  const scale = Math.max(25, ...model.workloads.map((row) => Math.abs(row.slideDeltaPct ?? 0)));
  const workloadRows = model.workloads.map((row) => {
    const delta = row.slideDeltaPct;
    const width = delta === null ? 0 : Math.min(45, (Math.abs(delta) / scale) * 45);
    const side = delta === null ? "unmeasured" : delta >= 0 ? "positive" : "negative";
    const barStyle = side === "negative"
      ? `left:${50 - width}%;width:${width}%`
      : `left:50%;width:${width}%`;
    const result = delta === null
      ? "SLIDE not measured"
      : `SLIDE ${formatDelta(delta)} · ${formatMeasurement(row.slideValue)} ${html(row.unit)}`;
    return `<section class="workload" data-workload-row="${html(row.benchmark)}"><div class="workload-copy"><h2>${html(row.benchmark)}</h2><p>WASM ${formatMeasurement(row.wasmValue)} ${html(row.unit)} = 0</p></div><div class="plot" aria-label="${html(row.benchmark)}: historic WASM is the zero baseline; ${html(result)}"><span class="quarter q1"></span><span class="quarter q3"></span><span class="zero"></span>${delta === null ? "" : `<span class="bar ${side}" style="${barStyle}"></span>`}<span class="result ${side}" style="${delta !== null && delta < 0 ? `right:${50 + width}%;` : `left:${delta === null ? 50 : 50 + width}%;`}">${html(result)}</span></div></section>`;
  }).join("");
  const sourceRows = Object.values(model.sources).map((item) => `<tr><td><code>${html(item.path)}</code></td><td><code>${html(item.sha256)}</code></td></tr>`).join("");
  const comparison = model.sharedProductionWorkloads === 0
    ? "No shared admitted production workload exists in these records, so no performance ratio or ranking is published."
    : `${model.sharedProductionWorkloads} shared admitted production workload(s) are recorded.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galerina/SLIDE and Galerina/WASM historical evidence</title><style>
  :root{color-scheme:dark;--bg:#050706;--panel:#0a0d0b;--ink:#f2f4f2;--muted:#9da39f;--line:#323733;--line-soft:#202521;--slide:#20ae89;--slow:#d96d34;--zero:#c7cbc8;--accent:#d5ff5c}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Roboto,Arial,sans-serif;line-height:1.45}main{width:min(1440px,100%);margin:auto;padding:28px 18px 64px}header,.chart,.notice,.sources{background:var(--panel);border:1px solid var(--line);padding:24px;margin-bottom:18px}header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}h1,h2,p{margin-top:0}h1{font-size:clamp(1.8rem,4vw,3.5rem);line-height:1.02;margin-bottom:14px}h2{font-size:1rem;margin-bottom:4px}.eyebrow{font-weight:700;color:var(--accent);letter-spacing:.08em;text-transform:uppercase}.lede,.notice p,.workload-copy p{color:var(--muted)}.status{font-weight:700;color:var(--accent);font-size:.82rem;letter-spacing:.04em;text-align:right}.chart{overflow-x:auto}.chart-inner{min-width:1020px}.axis,.workload{display:grid;grid-template-columns:260px minmax(700px,1fr)}.axis{align-items:end;padding-bottom:14px;border-bottom:1px solid var(--line)}.axis-copy{color:var(--muted);font-size:.9rem}.axis-plot{position:relative;height:54px}.axis-plot strong{position:absolute;left:50%;top:0;transform:translateX(-50%);font-size:1.15rem;white-space:nowrap}.axis-plot .slower,.axis-plot .faster{position:absolute;bottom:0;color:var(--muted)}.axis-plot .slower{left:0}.axis-plot .faster{right:0}.workload{min-height:86px;border-bottom:1px solid var(--line);align-items:stretch}.workload-copy{padding:18px 20px 14px 0;text-align:right}.workload-copy h2{font-size:1.05rem}.workload-copy p{font-size:.82rem;margin:0}.plot{position:relative;min-height:86px;background:linear-gradient(to right,transparent 24.9%,var(--line-soft) 25%,transparent 25.1%,transparent 49.9%,var(--line) 50%,transparent 50.1%,transparent 74.9%,var(--line-soft) 75%,transparent 75.1%)}.zero{position:absolute;left:50%;top:27px;width:3px;height:32px;background:var(--zero);transform:translateX(-1px)}.bar{position:absolute;top:31px;height:22px}.bar.positive{background:var(--slide)}.bar.negative{background:var(--slow)}.result{position:absolute;top:32px;font-size:.88rem;white-space:nowrap}.result.positive,.result.unmeasured{color:#d7ded9;margin-left:10px}.result.negative{color:#f1c5ae;margin-right:10px}.notice{border-color:#3f4c43}.notice h2,.sources h2{font-size:1.3rem}.notice code{color:var(--accent)}table{border-collapse:collapse;width:100%;font-size:.86rem}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:500}code{overflow-wrap:anywhere;color:#c9d2cc}dl{display:grid;grid-template-columns:minmax(180px,260px) 1fr;gap:6px 18px;margin-bottom:0}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}@media(max-width:720px){main{padding:10px 8px 32px}header,.chart,.notice,.sources{padding:16px}header{grid-template-columns:1fr}.status{text-align:left}.sources{overflow:auto}.sources table{min-width:760px}dl{grid-template-columns:1fr}dd{margin-bottom:8px}}
  </style></head><body><main><header><div><p class="eyebrow">Historical benchmark evidence</p><h1>Galerina/SLIDE vs Galerina/WASM</h1><p class="lede">Evidence coverage, not a speed comparison. Historic WASM measurements are the zero baseline for every workload. A SLIDE bar appears only when a production SLIDE result uses the same admitted workload, metric class and unit.</p></div><p class="status">${html(model.status)}</p></header><section class="chart" aria-label="SLIDE performance relative to historic WASM"><div class="chart-inner"><div class="axis"><div class="axis-copy">Old WASM result shown for reference</div><div class="axis-plot"><strong>WASM = 0 baseline</strong><span class="slower">← slower −</span><span class="faster">faster + →</span></div></div>${workloadRows}</div></section><section class="notice"><h2>Comparison boundary</h2><p>${html(comparison)}</p><p>Old WASM values are displayed as the recorded reference at zero. The <code>slideReference</code> record remains reference-only and cannot create a SLIDE performance bar or production authority.</p></section><section class="sources"><h2>Recorded JSON sources</h2><table><thead><tr><th>Record</th><th>SHA-256</th></tr></thead><tbody>${sourceRows}</tbody></table><dl><dt>WASM captured</dt><dd>${html(model.metadata.wasmCapturedAt)}</dd><dt>Current record generated</dt><dd>${html(model.metadata.generatedAt)}</dd><dt>Galerina revision</dt><dd><code>${html(model.metadata.galerinaCommit)}</code></dd><dt>SLIDE revision</dt><dd><code>${html(model.metadata.slideCommit)}</code></dd><dt>Historic WASM measured Galerina revision</dt><dd><code>${html(model.metadata.wasmMeasuredGalerinaCommit)}</code></dd><dt>Archive Git record</dt><dd><code>${html(model.metadata.archiveGitCommit)}</code> · ${html(model.metadata.archiveGitBranch)}</dd></dl></section></main></body></html>`;
}
