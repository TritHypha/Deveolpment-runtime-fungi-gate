import { bytesPerOperation } from "./benchmark-interpretation.mjs";

const HEX_40 = /^[0-9a-f]{40}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
const UTC_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const LANES = Object.freeze([
  Object.freeze({ key: "slide", label: "Galerina/SLIDE" }),
  Object.freeze({ key: "rust", label: "Rust" }),
  Object.freeze({ key: "go", label: "Go" }),
  Object.freeze({ key: "nodejs", label: "Node.js" }),
  Object.freeze({ key: "python", label: "Python" }),
]);

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} must be non-empty text`);
  return value;
}

function validateMetadata(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError("metadata must be an object");
  if (!UTC_STAMP.test(value.generatedAt)) throw new TypeError("generatedAt must be a UTC ISO timestamp");
  if (!HEX_64.test(value.resultSha256)) throw new TypeError("resultSha256 must be a lowercase SHA-256 digest");
  if (!HEX_40.test(value.galerinaCommit)) throw new TypeError("galerinaCommit must be a lowercase Git commit");
  if (!HEX_40.test(value.slideCommit)) throw new TypeError("slideCommit must be a lowercase Git commit");
  for (const key of ["node", "python", "rust", "go"]) requiredText(value.toolchains?.[key], `toolchains.${key}`);
  const wasm = value.wasmReference;
  requiredText(wasm?.archiveDirectory, "wasmReference.archiveDirectory");
  if (!HEX_64.test(wasm?.archiveResultsSha256)) throw new TypeError("wasmReference.archiveResultsSha256 must be a lowercase SHA-256 digest");
  if (!HEX_40.test(wasm?.measuredGalerinaCommit)) throw new TypeError("wasmReference.measuredGalerinaCommit must be a lowercase Git commit");
  return Object.freeze({
    generatedAt: value.generatedAt,
    resultSha256: value.resultSha256,
    galerinaCommit: value.galerinaCommit,
    slideCommit: value.slideCommit,
    toolchains: Object.freeze({ ...value.toolchains }),
    wasmReference: Object.freeze({ ...wasm }),
  });
}

function throughput(result) {
  if (!result || result.error) return null;
  for (const value of [
    result.normThroughput,
    result.operationsPerSecond,
    result.iterationsPerSecond,
    result.additionsPerSecond,
    result.attemptsPerSecond,
    result.callsPerSecond,
    result.runsPerSecond,
  ]) if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return null;
}

function measuredValue(entry, lane) {
  const value = entry.metricClass === "memory"
    ? bytesPerOperation(entry.results?.[lane])
    : throughput(entry.results?.[lane]);
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function ordinal(value) {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? "th"
    : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}

function buildRow(entry) {
  if (entry.units?.comparable !== true || entry.units?.status !== "PASS") return null;
  if (entry.metricClass === "governance") return null;
  const slide = measuredValue(entry, "slide");
  if (slide === null) return null;
  const lower = entry.metricClass === "memory";
  const lanes = LANES.map((lane) => {
    const value = measuredValue(entry, lane.key);
    const relativePct = value === null
      ? null
      : lane.key === "slide"
        ? 0
        : (lower ? ((slide - value) / slide) : ((value - slide) / slide)) * 100;
    return Object.freeze({ ...lane, value, relativePct });
  });
  const ranked = lanes.filter((lane) => lane.value !== null)
    .sort((left, right) => lower ? left.value - right.value : right.value - left.value);
  const slidePlace = ranked.findIndex((lane) => lane.key === "slide") + 1;
  return Object.freeze({
    benchmark: requiredText(entry.benchmark, "benchmark"),
    metricClass: entry.metricClass,
    unit: lower ? "heap bytes/op" : entry.units.unit,
    direction: lower ? "lower is better" : "higher is better",
    winner: ranked[0].label,
    galerinaPlace: `${ordinal(slidePlace)} of ${ranked.length}`,
    lanes: Object.freeze(lanes),
  });
}

export function buildSlideZeroModel({ latest, metadata: rawMetadata }) {
  if (!Array.isArray(latest)) throw new TypeError("latest must be an array");
  const metadata = validateMetadata(rawMetadata);
  const productionEntries = latest.filter((entry) => Object.hasOwn(entry?.results ?? {}, "slide"));
  if (productionEntries.length === 0) {
    return Object.freeze({
      status: "DEFERRED_NO_SLIDE_LANE",
      reason: "No production `slide` lane is present; Wasm and slideReference are not substitutes.",
      rows: Object.freeze([]),
      exclusions: Object.freeze([]),
      metadata,
    });
  }
  const rows = [];
  const exclusions = [];
  for (const entry of productionEntries) {
    const row = buildRow(entry);
    if (row) rows.push(row);
    else exclusions.push(Object.freeze({ benchmark: String(entry.benchmark ?? "unknown"), reason: "not work-equivalent, unit-aligned, or finite and positive" }));
  }
  return Object.freeze({
    status: rows.length > 0 && exclusions.length === 0 ? "COMPARABLE" : "INCOMPLETE",
    reason: rows.length > 0 ? "Galerina/SLIDE is the zero baseline for admitted rows." : "No admitted production SLIDE measurement is rankable.",
    rows: Object.freeze(rows),
    exclusions: Object.freeze(exclusions),
    metadata,
  });
}

function references(model) {
  const { metadata } = model;
  return `<section class="references"><h2>Recorded references</h2><dl>
    <dt>Generated</dt><dd>${html(metadata.generatedAt)}</dd>
    <dt>Galerina revision</dt><dd><code>${html(metadata.galerinaCommit)}</code></dd>
    <dt>SLIDE revision</dt><dd><code>${html(metadata.slideCommit)}</code></dd>
    <dt>Raw result SHA-256</dt><dd><code>${html(metadata.resultSha256)}</code></dd>
    <dt>Archived Galerina/Wasm</dt><dd>${html(metadata.wasmReference.archiveDirectory)} · <code>${html(metadata.wasmReference.archiveResultsSha256)}</code> · measured at <code>${html(metadata.wasmReference.measuredGalerinaCommit)}</code></dd>
    <dt>Toolchains</dt><dd>${Object.entries(metadata.toolchains).map(([key, value]) => `${html(key)}: ${html(value)}`).join(" · ")}</dd>
  </dl></section>`;
}

function shell(title, body, model) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(title)}</title><style>
  :root{color-scheme:light dark;--bg:#f5f7fa;--card:#fff;--ink:#17202a;--muted:#5d6d7e;--line:#d5dbe3;--good:#087f5b;--bad:#c2410c;--zero:#6d28d9}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Roboto,Arial,sans-serif;line-height:1.45}main{width:min(1180px,100%);margin:auto;padding:24px 16px 48px}header,.card,.references{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:16px}h1,h2{margin-top:0}.status{font-weight:700;color:var(--zero)}code{overflow-wrap:anywhere}dl{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:8px 16px;margin:0}dt{font-weight:700}dd{margin:0;color:var(--muted)}@media(prefers-color-scheme:dark){:root{--bg:#10151b;--card:#18212b;--ink:#eef3f7;--muted:#b4c0cc;--line:#344250;--good:#51cf9b;--bad:#ff9b6a;--zero:#c4a7ff}}@media(max-width:640px){main{padding:12px 8px}header,.card,.references{padding:14px;border-radius:10px}dl{display:block}dt{margin-top:8px}}
  ${body.css ?? ""}</style></head><body><main><header><h1>${html(title)}</h1><p class="status">${html(model.status)} · Galerina/SLIDE = 0</p><p>${html(model.reason)}</p></header>${body.html}${references(model)}</main></body></html>`;
}

export function buildSlideZeroChartHtml(model) {
  const width = 1080;
  const laneHeight = 26;
  const rowHeight = 50 + LANES.length * laneHeight;
  const height = Math.max(220, 40 + model.rows.length * rowHeight);
  const centre = 540;
  const scale = 3;
  let svg = `<svg role="img" aria-label="Peer performance relative to Galerina SLIDE" viewBox="0 0 ${width} ${height}"><line x1="${centre}" x2="${centre}" y1="20" y2="${height - 20}" stroke="var(--zero)" stroke-width="3"/>`;
  if (model.rows.length === 0) svg += `<text x="30" y="90" fill="currentColor">No admitted production SLIDE row is available.</text>`;
  model.rows.forEach((row, rowIndex) => {
    const top = 35 + rowIndex * rowHeight;
    svg += `<text x="20" y="${top}" fill="currentColor" font-weight="700">${html(row.benchmark)} · ${html(row.unit)} · winner ${html(row.winner)} · Galerina ${html(row.galerinaPlace)}</text>`;
    row.lanes.forEach((lane, laneIndex) => {
      const y = top + 18 + laneIndex * laneHeight;
      svg += `<line x1="180" x2="900" y1="${y + 6}" y2="${y + 6}" stroke="var(--line)"/><text x="20" y="${y + 10}" fill="currentColor">${html(lane.label)}</text>`;
      if (lane.relativePct === null) svg += `<text x="${centre + 8}" y="${y + 10}" fill="var(--muted)">unavailable</text>`;
      else if (lane.key === "slide") svg += `<circle cx="${centre}" cy="${y + 6}" r="5" fill="var(--zero)"/><text x="${centre + 10}" y="${y + 10}" fill="var(--zero)">0%</text>`;
      else {
        const bar = Math.min(300, Math.abs(lane.relativePct) * scale);
        const x = lane.relativePct >= 0 ? centre : centre - bar;
        const fill = lane.relativePct >= 0 ? "var(--good)" : "var(--bad)";
        svg += `<rect x="${x}" y="${y}" width="${bar}" height="12" rx="4" fill="${fill}"/><text x="${lane.relativePct >= 0 ? centre + bar + 8 : centre - bar - 68}" y="${y + 10}" fill="${fill}">${lane.relativePct >= 0 ? "+" : ""}${lane.relativePct.toFixed(1)}%</text>`;
      }
    });
  });
  svg += "</svg>";
  return shell("Galerina/SLIDE benchmark chart", { html: `<section class="card chart">${svg}</section>`, css: ".chart{overflow:auto}.chart svg{display:block;min-width:760px;width:100%;height:auto}" }, model);
}

function cell(lane) {
  if (lane.value === null) return "unavailable";
  const relative = lane.relativePct === null ? "" : ` (${lane.relativePct >= 0 ? "+" : ""}${lane.relativePct.toFixed(1)}%)`;
  return `${lane.value.toLocaleString("en-GB", { maximumFractionDigits: 3 })}${relative}`;
}

export function buildSlideZeroTableHtml(model) {
  const head = LANES.map((lane) => `<th scope="col">${html(lane.label)}</th>`).join("");
  const rows = model.rows.map((row) => `<tr><th scope="row">${html(row.benchmark)}</th><td>${html(row.unit)}</td><td>${html(row.winner)}</td><td>${html(row.galerinaPlace)}</td>${row.lanes.map((lane) => `<td>${html(cell(lane))}</td>`).join("")}</tr>`).join("");
  const empty = model.rows.length === 0 ? `<tr><td colspan="${4 + LANES.length}">No admitted production SLIDE result; ranking is intentionally unavailable.</td></tr>` : "";
  const exclusions = model.exclusions.length === 0 ? "" : `<h2>Excluded rows</h2><ul>${model.exclusions.map((item) => `<li>${html(item.benchmark)}: ${html(item.reason)}</li>`).join("")}</ul>`;
  return shell("Galerina/SLIDE benchmark table", {
    html: `<section class="card table-wrap"><table><caption>Positive percentages are faster or better than Galerina/SLIDE; negative percentages are slower or worse.</caption><thead><tr><th scope="col">Benchmark</th><th scope="col">Unit</th><th scope="col">Winner</th><th scope="col">Galerina place</th>${head}</tr></thead><tbody>${rows}${empty}</tbody></table>${exclusions}</section>`,
    css: ".table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:980px}caption{text-align:left;color:var(--muted);padding-bottom:12px}th,td{border-bottom:1px solid var(--line);padding:10px;text-align:left;white-space:nowrap}thead th{background:color-mix(in srgb,var(--card) 80%,var(--line))}",
  }, model);
}
