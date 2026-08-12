import { types } from "node:util";

import { normalizeThroughput } from "./throughput-units.mjs";
import { SLIDE_REFERENCE_SUITE_IDS } from "./slide-reference-suite.mjs";

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
  if (value.publication !== undefined) {
    plainRecord(value.publication, "metadata.publication");
    if (!UTC_STAMP.test(value.publication.generatedAt)) {
      throw new TypeError("metadata.publication.generatedAt must be a UTC timestamp");
    }
    if (!HEX_40.test(value.publication.galerinaCommit)) {
      throw new TypeError("metadata.publication.galerinaCommit must be a Git commit");
    }
    if (!HEX_40.test(value.publication.slideCommit)) {
      throw new TypeError("metadata.publication.slideCommit must be a Git commit");
    }
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

function selectClosedSuiteEntries(entries, label) {
  if (!Array.isArray(entries) || types.isProxy(entries)) throw new TypeError(`${label} must be an array`);
  const suiteIds = new Set(SLIDE_REFERENCE_SUITE_IDS);
  const selected = [];
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    plainRecord(entry, `${label}[${index}]`);
    const benchmark = requiredText(entry.benchmark, `${label}[${index}].benchmark`);
    if (!suiteIds.has(benchmark)) continue;
    if (seen.has(benchmark)) throw new TypeError(`duplicate closed-suite workload: ${benchmark}`);
    seen.add(benchmark);
    selected.push(entry);
  }
  return selected;
}

const VERIFIED_OPERATION_ID = "verified-native-operation";
const VERIFIED_OPERATION_UNIT = "element-reads/s";
const VERIFIED_OPERATION_ITERATIONS = 1_000_000;
const VERIFIED_OPERATION_RESULT = 999_999;
const VERIFIED_PEERS = Object.freeze([
  Object.freeze({ lane: "rustAvx2", product: "Rust AVX2" }),
  Object.freeze({ lane: "rust", product: "Rust" }),
  Object.freeze({ lane: "go", product: "Go" }),
  Object.freeze({ lane: "nodejs", product: "Node.js" }),
  Object.freeze({ lane: "python", product: "Python" }),
]);

const CALL_CHAIN_ID = "call-chain";
const CALL_CHAIN_UNIT = "chains/s";
const CALL_CHAIN_ITERATIONS = 50_000;
const CALL_CHAIN_RESULT = 57_984;
const CALL_CHAIN_CALLS_PER_ITERATION = 7;
const WASM_ZERO_PEERS = Object.freeze([
  Object.freeze({ lane: "rustAvx2", product: "Rust AVX2" }),
  Object.freeze({ lane: "rust", product: "Rust" }),
  Object.freeze({ lane: "go", product: "Go" }),
  Object.freeze({ lane: "nodejs", product: "Node.js" }),
  Object.freeze({ lane: "python", product: "Python" }),
]);

function verifiedOperationLane(entry, lane, label) {
  const result = entry.results[lane];
  if (result === undefined) return undefined;
  plainRecord(result, label);
  const value = measuredValue(entry, lane);
  if (
    result.iterations !== VERIFIED_OPERATION_ITERATIONS
    || result.result !== VERIFIED_OPERATION_RESULT
    || result.unit !== VERIFIED_OPERATION_UNIT
    || value === undefined
  ) throw new TypeError(`${label} refused`);
  return value;
}

function buildSlideReferenceComparison(entries) {
  const matches = entries.filter((entry) => entry?.benchmark === VERIFIED_OPERATION_ID);
  if (matches.length === 0) {
    return Object.freeze({
      status: "DEFERRED_NO_VERIFIED_SLIDE_REFERENCE",
      evidenceK3: 0,
      authorityReleased: false,
      unavailable: Object.freeze(VERIFIED_PEERS.map((peer) => peer.product)),
    });
  }
  if (matches.length !== 1) throw new TypeError("duplicate verified SLIDE reference workload");
  const entry = matches[0];
  plainRecord(entry, "verified SLIDE reference workload");
  plainRecord(entry.results, "verified SLIDE reference workload results");
  if (
    entry.metricClass !== "cpu-throughput"
    || entry.units?.comparable !== true
    || entry.units?.status !== "PASS"
    || entry.units?.unit !== VERIFIED_OPERATION_UNIT
  ) throw new TypeError("verified SLIDE reference evidence refused");
  const reference = entry.results.slideReference;
  if (
    reference === undefined
    || reference.referenceOnly !== true
    || reference.authorityReleased !== false
  ) throw new TypeError("verified SLIDE reference evidence refused");
  const baselineValue = verifiedOperationLane(
    entry,
    "slideReference",
    "verified SLIDE reference evidence",
  );
  const peers = [];
  const unavailable = [];
  for (const peer of VERIFIED_PEERS) {
    const value = verifiedOperationLane(entry, peer.lane, `${peer.product} verified operation`);
    if (value === undefined) {
      unavailable.push(peer.product);
      continue;
    }
    peers.push(Object.freeze({
      product: peer.product,
      value,
      deltaPct: ((value - baselineValue) * 100) / baselineValue,
    }));
  }
  peers.sort((left, right) => right.value - left.value || left.product.localeCompare(right.product));
  const ranking = [
    ...peers,
    Object.freeze({ product: "Galerina/SLIDE reference", value: baselineValue, deltaPct: 0 }),
  ].sort((left, right) => right.value - left.value || left.product.localeCompare(right.product));
  return Object.freeze({
    status: "MEASURED_NON_AUTHORIZING",
    evidenceK3: 0,
    authorityReleased: false,
    benchmark: VERIFIED_OPERATION_ID,
    unit: VERIFIED_OPERATION_UNIT,
    baseline: Object.freeze({
      product: "Galerina/SLIDE reference",
      value: baselineValue,
      deltaPct: 0,
    }),
    peers: Object.freeze(peers),
    unavailable: Object.freeze(unavailable),
    winner: ranking[0].product,
    galerinaPlace: ranking.findIndex((candidate) => candidate.product === "Galerina/SLIDE reference") + 1,
  });
}

function exactScalarResult(value, label) {
  if (Number.isSafeInteger(value)) return value;
  plainRecord(value, label);
  if (
    Object.keys(value).length !== 2
    || value.__tag !== "int"
    || !Number.isSafeInteger(value.value)
  ) throw new TypeError(`${label} refused`);
  return value.value;
}

function callChainLane(entry, lane, label, options = {}) {
  const result = entry.results[lane];
  if (result === undefined) return undefined;
  plainRecord(result, label);
  const value = measuredValue(entry, lane);
  if (
    exactScalarResult(result.result, `${label}.result`) !== CALL_CHAIN_RESULT
    || value === undefined
  ) throw new TypeError(`${label} refused`);
  if (options.historicWasm !== true && (
    result.iterations !== CALL_CHAIN_ITERATIONS
    || result.callsPerIteration !== CALL_CHAIN_CALLS_PER_ITERATION
  )) throw new TypeError(`${label} refused`);
  if (options.reference === true && (
    result.referenceOnly !== true
    || result.authorityReleased !== false
    || result.k3 !== 0
  )) throw new TypeError(`${label} refused`);
  return value;
}

function signedFactor(value, baseline) {
  if (value === baseline) return 0;
  return value > baseline ? value / baseline : -(baseline / value);
}

function buildWasmZeroComparisons(entries) {
  const matches = entries.filter((entry) => entry?.benchmark === CALL_CHAIN_ID);
  if (matches.length === 0) return Object.freeze([]);
  if (matches.length !== 1) throw new TypeError("duplicate call-chain workload");
  const entry = matches[0];
  plainRecord(entry, "call-chain workload");
  plainRecord(entry.results, "call-chain workload results");
  if (
    entry.metricClass !== "cpu-throughput"
    || entry.units?.comparable !== true
    || entry.units?.status !== "PASS"
    || entry.units?.unit !== CALL_CHAIN_UNIT
  ) throw new TypeError("call-chain comparison evidence refused");

  const wasmValue = callChainLane(entry, "wasm", "historic Galerina/WASM call-chain", { historicWasm: true });
  const slideValue = callChainLane(entry, "slideReference", "Galerina/SLIDE call-chain reference", { reference: true });
  if (wasmValue === undefined || slideValue === undefined) return Object.freeze([]);

  const baseline = Object.freeze({
    product: "Galerina/WASM (legacy)",
    value: wasmValue,
    factor: 0,
    deltaPct: 0,
  });
  const entriesOut = [baseline];
  const unavailable = [];
  for (const peer of WASM_ZERO_PEERS) {
    const value = callChainLane(entry, peer.lane, `${peer.product} call-chain`);
    if (value === undefined) {
      unavailable.push(peer.product);
      continue;
    }
    entriesOut.push(Object.freeze({
      product: peer.product,
      value,
      factor: signedFactor(value, wasmValue),
      deltaPct: ((value - wasmValue) * 100) / wasmValue,
    }));
  }
  entriesOut.push(Object.freeze({
    product: "Galerina/SLIDE reference",
    value: slideValue,
    factor: signedFactor(slideValue, wasmValue),
    deltaPct: ((slideValue - wasmValue) * 100) / wasmValue,
  }));
  const ranking = [...entriesOut]
    .sort((left, right) => right.value - left.value || left.product.localeCompare(right.product));
  return Object.freeze([Object.freeze({
    status: "MEASURED_NON_AUTHORIZING",
    evidenceK3: 0,
    authorityReleased: false,
    benchmark: CALL_CHAIN_ID,
    unit: CALL_CHAIN_UNIT,
    iterations: CALL_CHAIN_ITERATIONS,
    callsPerIteration: CALL_CHAIN_CALLS_PER_ITERATION,
    result: CALL_CHAIN_RESULT,
    baseline,
    entries: Object.freeze(entriesOut),
    unavailable: Object.freeze(unavailable),
    winner: ranking[0].product,
    galerinaPlace: ranking.findIndex((candidate) => candidate.product === "Galerina/SLIDE reference") + 1,
  })]);
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

  const suiteEntries = selectClosedSuiteEntries(input.current, "current results");
  const wasm = indexAdmitted(input.wasmArchive, "wasm", "Wasm archive");
  const slide = indexAdmitted(suiteEntries, "slide", "current results");
  const slideReference = indexAdmitted(suiteEntries, "slideReference", "current results");
  const slideReferenceComparison = buildSlideReferenceComparison(suiteEntries);
  const wasmZeroComparisons = buildWasmZeroComparisons(suiteEntries);
  const comparableGroups = suiteEntries.filter((entry) => (
    entry.units?.comparable === true
    && entry.units?.status === "PASS"
    && entry.metricClass !== "governance"
  )).length;
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
    slideReferenceComparison,
    wasmZeroComparisons,
    coverage: Object.freeze({
      benchmarkGroups: suiteEntries.length,
      comparableGroups,
      expectedProductionSlideGroups: SLIDE_REFERENCE_SUITE_IDS.length,
      productionSlideGroups: slide.size,
      referenceSlideGroups: slideReference.size,
      historicWasmGroups: wasm.size,
    }),
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

function formatFactor(value) {
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  const decimals = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
  return `${value > 0 ? "+" : "−"}${Number(magnitude.toFixed(decimals))}×`;
}

export function buildSlideWasmHistoryHtml(model) {
  plainRecord(model, "history model");
  plainRecord(model.coverage, "history coverage");
  if (!Array.isArray(model.wasmZeroComparisons) || types.isProxy(model.wasmZeroComparisons)) {
    throw new TypeError("WASM-zero comparisons must be an array");
  }
  const wasmZeroPanels = model.wasmZeroComparisons.map((comparison) => {
    plainRecord(comparison, "WASM-zero comparison");
    const nonZeroFactors = comparison.entries
      .map((entry) => entry.factor)
      .filter((factor) => factor !== 0)
      .map((factor) => Math.abs(Math.log10(Math.abs(factor))));
    const scale = Math.max(1, ...nonZeroFactors);
    const ranking = [...comparison.entries]
      .sort((left, right) => right.value - left.value || left.product.localeCompare(right.product));
    const chartRows = comparison.entries.map((entry) => {
      const signedLog = entry.factor === 0 ? 0 : Math.sign(entry.factor) * Math.log10(Math.abs(entry.factor));
      const width = Math.min(45, (Math.abs(signedLog) / scale) * 45);
      const side = entry.factor < 0 ? "negative" : "positive";
      const barStyle = side === "negative"
        ? `left:${50 - width}%;width:${width}%`
        : `left:50%;width:${width}%`;
      const result = `${entry.product} ${formatFactor(entry.factor)} · ${formatMeasurement(entry.value)} ${comparison.unit}`;
      return `<section class="workload wasm-zero-workload" data-wasm-zero-row="${html(entry.product)}"><div class="workload-copy"><h2>${html(entry.product)}</h2><p>${html(comparison.benchmark)}</p></div><div class="plot" aria-label="${html(result)}"><span class="zero"></span>${entry.factor === 0 ? "" : `<span class="bar ${side}" style="${barStyle}"></span>`}<span class="result ${side}" style="${entry.factor < 0 ? `right:${50 + width}%;` : `left:${50 + width}%;`}">${html(result)}</span></div></section>`;
    }).join("");
    const tableRows = ranking.map((entry, index) => `<tr data-wasm-zero-table-row="${html(entry.product)}"><td>${html(entry.product)}</td><td>${html(formatMeasurement(entry.value))} ${html(comparison.unit)}</td><td>${html(formatFactor(entry.factor))}</td><td>${index + 1}</td></tr>`).join("");
    const unavailable = comparison.unavailable.length === 0
      ? "All requested comparison runtimes measured"
      : comparison.unavailable.map((product) => `${product}: not measured`).join(" · ");
    return `<section class="reference-panel wasm-zero-panel"><div class="panel-heading"><div><p class="eyebrow">WASM-zero same-work comparison</p><h2>${html(comparison.benchmark)}</h2><p>${comparison.iterations.toLocaleString("en-GB")} chains, ${comparison.callsPerIteration} calls per chain, exact checksum ${comparison.result.toLocaleString("en-GB")}.</p></div><strong>${html(comparison.status)} · K3 0</strong></div><div class="chart-inner"><div class="axis"><div class="axis-copy">${html(unavailable)}</div><div class="axis-plot"><strong>WASM = 0 baseline</strong><span class="slower">← slower −</span><span class="faster">faster + →</span></div></div>${chartRows}</div><table class="comparison-table"><thead><tr><th>Product</th><th>Throughput</th><th>Relative to WASM</th><th>Rank</th></tr></thead><tbody>${tableRows}</tbody></table><p class="summary"><strong>Winner: ${html(comparison.winner)}</strong> · Galerina/SLIDE place: ${comparison.galerinaPlace} of ${comparison.entries.length}. Galerina/SLIDE is a measured reference lane, remains K3 0 and releases no production authority.</p></section>`;
  }).join("");
  const reference = model.slideReferenceComparison;
  plainRecord(reference, "verified SLIDE reference comparison");
  const referenceEntries = reference.status === "MEASURED_NON_AUTHORIZING"
    ? [reference.baseline, ...reference.peers]
    : [];
  const referenceScale = Math.max(25, ...referenceEntries.map((row) => Math.abs(row.deltaPct)));
  const referenceRows = referenceEntries.map((row) => {
    const width = Math.min(45, (Math.abs(row.deltaPct) / referenceScale) * 45);
    const side = row.deltaPct >= 0 ? "positive" : "negative";
    const barStyle = side === "negative"
      ? `left:${50 - width}%;width:${width}%`
      : `left:50%;width:${width}%`;
    const result = `${row.product} ${formatDelta(row.deltaPct)} · ${formatMeasurement(row.value)} ${reference.unit}`;
    return `<section class="workload reference-workload"><div class="workload-copy"><h2>${html(row.product)}</h2><p>${html(reference.benchmark)}</p></div><div class="plot" aria-label="${html(result)}"><span class="zero"></span>${row.deltaPct === 0 ? "" : `<span class="bar ${side}" style="${barStyle}"></span>`}<span class="result ${side}" style="${row.deltaPct < 0 ? `right:${50 + width}%;` : `left:${50 + width}%;`}">${html(result)}</span></div></section>`;
  }).join("");
  const referenceTableRows = [...referenceEntries]
    .sort((left, right) => right.value - left.value || left.product.localeCompare(right.product))
    .map((row) => {
      const rank = referenceEntries.filter((candidate) => candidate.value > row.value).length + 1;
      return `<tr data-reference-table-row="${html(row.product)}"><td>${html(row.product)}</td><td>${html(formatMeasurement(row.value))} ${html(reference.unit)}</td><td>${html(formatDelta(row.deltaPct))}</td><td>${rank}</td></tr>`;
    })
    .join("");
  const unavailable = reference.unavailable.map((product) => `${product}: not measured`).join(" · ");
  let referencePanel = reference.status === "MEASURED_NON_AUTHORIZING"
    ? `<section class="reference-panel"><div class="panel-heading"><div><p class="eyebrow">Verified same-work measurement</p><h2>Verified SLIDE reference comparison</h2><p>One million element reads with exact result 999999. SLIDE reference is the zero baseline.</p></div><strong>${html(reference.status)} · K3 0</strong></div><div class="chart-inner"><div class="axis"><div class="axis-copy">${html(unavailable)}</div><div class="axis-plot"><strong>SLIDE reference = 0 baseline</strong><span class="slower">← slower −</span><span class="faster">faster + →</span></div></div>${referenceRows}</div><table class="comparison-table"><thead><tr><th>Product</th><th>Throughput</th><th>Relative to SLIDE reference</th><th>Rank</th></tr></thead><tbody>${referenceTableRows}</tbody></table><p class="summary"><strong>Winner: ${html(reference.winner)}</strong> · Galerina place: ${reference.galerinaPlace} of ${reference.peers.length + 1}. Production SLIDE remains unmeasured; this reference evidence is non-authorizing and releases no authority.</p></section>`
    : `<section class="reference-panel"><h2>Verified SLIDE reference comparison</h2><p>${html(reference.status)}. Production SLIDE remains unmeasured.</p></section>`;
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
  const coverage = model.coverage;
  const missingReferenceGroups = coverage.expectedProductionSlideGroups - coverage.referenceSlideGroups;
  const coveragePanel = `<section class="coverage" aria-label="Benchmark coverage"><article><strong>${coverage.benchmarkGroups}</strong><span>${coverage.benchmarkGroups === 1 ? "benchmark group run" : "benchmark groups run"}</span></article><article><strong>${coverage.comparableGroups}</strong><span>${coverage.comparableGroups === 1 ? "comparable group expected" : "comparable groups expected"} for full production SLIDE coverage</span></article><article><strong>${coverage.productionSlideGroups} of ${coverage.expectedProductionSlideGroups}</strong><span>production SLIDE ${coverage.expectedProductionSlideGroups === 1 ? "group" : "groups"} measured</span></article><article><strong>${coverage.referenceSlideGroups} of ${coverage.expectedProductionSlideGroups}</strong><span>SLIDE reference ${coverage.referenceSlideGroups === 1 ? "group" : "groups"} measured; ${missingReferenceGroups} not measured</span></article><article><strong>${coverage.historicWasmGroups}</strong><span>historic WASM ${coverage.historicWasmGroups === 1 ? "group" : "groups"} recorded</span></article></section>`;
  referencePanel = `${coveragePanel}${wasmZeroPanels}${referencePanel}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galerina/SLIDE and Galerina/WASM benchmark evidence</title><style>
  .coverage{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;background:#0a0d0b;border:1px solid #323733;padding:24px;margin-bottom:18px}.coverage article{border-left:3px solid #d5ff5c;padding:2px 12px}.coverage strong{display:block;font-size:1.45rem}.coverage span{color:#9da39f;font-size:.82rem}
  :root{color-scheme:dark;--bg:#050706;--panel:#0a0d0b;--ink:#f2f4f2;--muted:#9da39f;--line:#323733;--line-soft:#202521;--slide:#20ae89;--slow:#d96d34;--zero:#c7cbc8;--accent:#d5ff5c}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Roboto,Arial,sans-serif;line-height:1.45}main{width:min(1440px,100%);margin:auto;padding:28px 18px 64px}header,.reference-panel,.chart,.notice,.sources{background:var(--panel);border:1px solid var(--line);padding:24px;margin-bottom:18px}header,.panel-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end}h1,h2,p{margin-top:0}h1{font-size:clamp(1.8rem,4vw,3.5rem);line-height:1.02;margin-bottom:14px}h2{font-size:1.3rem;margin-bottom:8px}.eyebrow{font-weight:700;color:var(--accent);letter-spacing:.08em;text-transform:uppercase}.lede,.notice p,.workload-copy p,.panel-heading p,.summary{color:var(--muted)}.status,.panel-heading>strong{font-weight:700;color:var(--accent);font-size:.82rem;letter-spacing:.04em;text-align:right}.chart,.reference-panel{overflow-x:auto}.chart-inner{min-width:1020px}.axis,.workload{display:grid;grid-template-columns:260px minmax(700px,1fr)}.axis{align-items:end;padding-bottom:14px;border-bottom:1px solid var(--line)}.axis-copy{color:var(--muted);font-size:.9rem}.axis-plot{position:relative;height:54px}.axis-plot strong{position:absolute;left:50%;top:0;transform:translateX(-50%);font-size:1.15rem;white-space:nowrap}.axis-plot .slower,.axis-plot .faster{position:absolute;bottom:0;color:var(--muted)}.axis-plot .slower{left:0}.axis-plot .faster{right:0}.workload{min-height:86px;border-bottom:1px solid var(--line);align-items:stretch}.workload-copy{padding:18px 20px 14px 0;text-align:right}.workload-copy h2{font-size:1.05rem;margin-bottom:4px}.workload-copy p{font-size:.82rem;margin:0}.plot{position:relative;min-height:86px;background:linear-gradient(to right,transparent 24.9%,var(--line-soft) 25%,transparent 25.1%,transparent 49.9%,var(--line) 50%,transparent 50.1%,transparent 74.9%,var(--line-soft) 75%,transparent 75.1%)}.zero{position:absolute;left:50%;top:27px;width:3px;height:32px;background:var(--zero);transform:translateX(-1px)}.bar{position:absolute;top:31px;height:22px}.bar.positive{background:var(--slide)}.bar.negative{background:var(--slow)}.result{position:absolute;top:32px;font-size:.88rem;white-space:nowrap}.result.positive,.result.unmeasured{color:#d7ded9;margin-left:10px}.result.negative{color:#f1c5ae;margin-right:10px}.comparison-table{min-width:760px;margin-top:22px}.comparison-table tbody tr:first-child td{color:var(--accent);font-weight:700}.summary{margin:18px 0 0}.summary strong{color:var(--ink)}.notice{border-color:#3f4c43}.notice code{color:var(--accent)}table{border-collapse:collapse;width:100%;font-size:.86rem}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:500}code{overflow-wrap:anywhere;color:#c9d2cc}dl{display:grid;grid-template-columns:minmax(180px,260px) 1fr;gap:6px 18px;margin-bottom:0}dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}@media(max-width:720px){main{padding:10px 8px 32px}header,.reference-panel,.chart,.notice,.sources{padding:16px}header,.panel-heading{grid-template-columns:1fr}.status,.panel-heading>strong{text-align:left}.sources{overflow:auto}.sources table{min-width:760px}dl{grid-template-columns:1fr}dd{margin-bottom:8px}}
  </style></head><body><main><header><div><p class="eyebrow">Measured and historical evidence</p><h1>Galerina/SLIDE performance</h1><p class="lede">Evidence coverage, not a speed comparison across unlike workloads. A verified reference comparison is shown separately from production authority. Historic Galerina/WASM evidence remains available below.</p></div><p class="status">${html(model.status)}</p></header>${referencePanel}<section class="chart" aria-label="SLIDE performance relative to historic WASM"><h2>Historic Galerina/WASM evidence</h2><div class="chart-inner"><div class="axis"><div class="axis-copy">Old WASM result shown for reference</div><div class="axis-plot"><strong>WASM = 0 baseline</strong><span class="slower">← slower −</span><span class="faster">faster + →</span></div></div>${workloadRows}</div></section><section class="notice"><h2>Comparison boundary</h2><p>${html(comparison)}</p><p>Old WASM values are displayed as the recorded reference at zero. The <code>slideReference</code> result is measured and work-equivalent only for its named one-million-read workload; it remains reference-only and cannot create production authority.</p></section><section class="sources"><h2>Recorded JSON sources</h2><table><thead><tr><th>Record</th><th>SHA-256</th></tr></thead><tbody>${sourceRows}</tbody></table><dl><dt>WASM captured</dt><dd>${html(model.metadata.wasmCapturedAt)}</dd><dt>Current record generated</dt><dd>${html(model.metadata.generatedAt)}</dd><dt>Galerina revision</dt><dd><code>${html(model.metadata.galerinaCommit)}</code></dd><dt>SLIDE revision</dt><dd><code>${html(model.metadata.slideCommit)}</code></dd><dt>Historic WASM measured Galerina revision</dt><dd><code>${html(model.metadata.wasmMeasuredGalerinaCommit)}</code></dd><dt>Archive Git record</dt><dd><code>${html(model.metadata.archiveGitCommit)}</code> · ${html(model.metadata.archiveGitBranch)}</dd></dl></section></main></body></html>`;
}
