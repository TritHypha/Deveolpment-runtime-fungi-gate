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

  return Object.freeze({
    status: slide.size === 0 ? "REFERENCE_ONLY_NO_PRODUCTION_SLIDE" : "COMPARABLE_PRODUCTION_HISTORY",
    sharedProductionWorkloads,
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

export function buildSlideWasmHistoryHtml(model) {
  plainRecord(model, "history model");
  const maximum = Math.max(1, ...model.rows.map((row) => row.productionObservations + row.referenceObservations));
  const productRows = model.rows.map((row) => {
    const productionWidth = Math.round((row.productionObservations / maximum) * 680);
    const referenceWidth = Math.round((row.referenceObservations / maximum) * 680);
    return `<section class="product" data-product-row="${html(row.product)}"><div class="copy"><h2>${html(row.product)}</h2><p>${html(row.state)}</p><p class="counts">Production measured: ${row.productionObservations} · reference-only: ${row.referenceObservations}</p></div><svg role="img" aria-label="${html(row.product)} recorded evidence coverage" viewBox="0 0 720 52"><rect class="track" x="0" y="8" width="680" height="16" rx="8"/><rect class="production" x="0" y="8" width="${productionWidth}" height="16" rx="8"/><rect class="reference" x="0" y="30" width="${referenceWidth}" height="12" rx="6"/><text x="690" y="21">${row.productionObservations}</text><text x="690" y="42">${row.referenceObservations}</text></svg></section>`;
  }).join("");
  const sourceRows = Object.values(model.sources).map((item) => `<tr><td><code>${html(item.path)}</code></td><td><code>${html(item.sha256)}</code></td></tr>`).join("");
  const comparison = model.sharedProductionWorkloads === 0
    ? "No shared admitted production workload exists in these records, so no performance ratio or ranking is published."
    : `${model.sharedProductionWorkloads} shared admitted production workload(s) are recorded.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galerina/SLIDE and Galerina/WASM historical evidence</title><style>
  :root{color-scheme:light dark;--bg:#f4f7fb;--card:#fff;--ink:#152230;--muted:#5c6b7a;--line:#d7dfe8;--slide:#6d28d9;--wasm:#0f766e;--reference:#d97706}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Roboto,Arial,sans-serif;line-height:1.5}main{width:min(1080px,100%);margin:auto;padding:20px 14px 48px}header,.product,.notice,.sources{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:14px}h1,h2{margin:0 0 8px}.eyebrow{font-weight:700;color:var(--slide);letter-spacing:.04em;text-transform:uppercase}.lede,.counts,.notice p{color:var(--muted)}.product{display:grid;gap:18px;grid-template-columns:minmax(240px,1fr) minmax(380px,1.6fr);align-items:center}.product svg{width:100%;height:auto}.track{fill:var(--line)}.production{fill:var(--wasm)}.product:first-of-type .production{fill:var(--slide)}.reference{fill:var(--reference)}svg text{fill:currentColor;font:14px Roboto,Arial,sans-serif}.legend{display:flex;gap:16px;flex-wrap:wrap}.key::before{content:"";display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;background:var(--wasm)}.key.reference::before{background:var(--reference)}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}code{overflow-wrap:anywhere}.status{font-weight:700;color:var(--slide)}@media(prefers-color-scheme:dark){:root{--bg:#10161d;--card:#18222d;--ink:#edf3f8;--muted:#b6c1cc;--line:#354554;--slide:#c4a7ff;--wasm:#5eead4;--reference:#fdba74}}@media(max-width:720px){main{padding:10px 8px 32px}header,.product,.notice,.sources{padding:15px;border-radius:10px}.product{grid-template-columns:1fr}.sources{overflow:auto}table{min-width:760px}}
  </style></head><body><main><header><p class="eyebrow">Historical benchmark evidence</p><h1>Galerina/SLIDE and Galerina/WASM</h1><p class="lede">Evidence coverage, not a speed comparison. The products are shown together, but only like-for-like admitted workloads may support a performance conclusion.</p><p class="status">${html(model.status)}</p></header><div class="legend"><p class="key">production measurement</p><p class="key reference">reference-only observation</p></div>${productRows}<section class="notice"><h2>Comparison boundary</h2><p>${html(comparison)}</p><p>The <code>slideReference</code> record remains reference-only and does not establish production SLIDE execution authority.</p></section><section class="sources"><h2>Recorded JSON sources</h2><table><thead><tr><th>Record</th><th>SHA-256</th></tr></thead><tbody>${sourceRows}</tbody></table><dl><dt>WASM captured</dt><dd>${html(model.metadata.wasmCapturedAt)}</dd><dt>Current record generated</dt><dd>${html(model.metadata.generatedAt)}</dd><dt>Galerina revision</dt><dd><code>${html(model.metadata.galerinaCommit)}</code></dd><dt>SLIDE revision</dt><dd><code>${html(model.metadata.slideCommit)}</code></dd><dt>Historic WASM measured Galerina revision</dt><dd><code>${html(model.metadata.wasmMeasuredGalerinaCommit)}</code></dd><dt>Archive Git record</dt><dd><code>${html(model.metadata.archiveGitCommit)}</code> · ${html(model.metadata.archiveGitBranch)}</dd></dl></section></main></body></html>`;
}
