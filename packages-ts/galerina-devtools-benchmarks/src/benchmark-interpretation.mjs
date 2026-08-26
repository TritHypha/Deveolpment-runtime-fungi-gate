// Derives human-facing benchmark meaning from admitted measurement facts.
// This module is pure: report.mjs owns files; this file owns no I/O or authority.

const finite = (value) => typeof value === "number" && Number.isFinite(value);

function rateOf(result) {
  if (!result || result.error) return null;
  for (const value of [
    result.normThroughput,
    result.operationsPerSecond,
    result.iterationsPerSecond,
    result.additionsPerSecond,
    result.attemptsPerSecond,
    result.callsPerSecond,
    result.runsPerSecond,
  ]) if (finite(value) && value >= 0) return value;
  return null;
}

function wallMilliseconds(result) {
  for (const value of [result?.elapsedMs, result?.execMs, result?.warmMs]) {
    if (finite(value) && value > 0) return value;
  }
  return null;
}

export function bytesPerOperation(result) {
  if (!result || result.error) return null;
  const direct = result.memory?.bytesPerOperation;
  if (finite(direct)) return direct;
  const heapDelta = result.memory?.heapUsedDelta;
  const throughput = rateOf(result);
  const wallMs = wallMilliseconds(result);
  if (!finite(heapDelta) || throughput === null || wallMs === null) return null;
  const operations = throughput * (wallMs / 1000);
  return operations > 0 ? heapDelta / operations : null;
}

function ordinal(place) {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  if (place % 10 === 1) return `${place}st`;
  if (place % 10 === 2) return `${place}nd`;
  if (place % 10 === 3) return `${place}rd`;
  return `${place}th`;
}

function rank(values, direction) {
  const ordered = [...values].sort((left, right) => {
    const delta = direction === "lower" ? left.value - right.value : right.value - left.value;
    return delta || left.order - right.order;
  });
  let previous = null;
  let place = 0;
  return ordered.map((entry, index) => {
    if (previous === null || entry.value !== previous) place = index + 1;
    previous = entry.value;
    return { ...entry, place };
  });
}

function noRanking(direction, winner, explanation) {
  return Object.freeze({
    direction,
    winner,
    galerinaPlace: "not ranked",
    explanation,
    memoryBytesPerOp: Object.freeze({}),
  });
}

export function interpretBenchmark(benchmark, runtimeCatalog) {
  if (!benchmark || typeof benchmark !== "object" || !Array.isArray(runtimeCatalog)) {
    throw new TypeError("benchmark interpretation requires a benchmark and runtime catalog");
  }
  if (benchmark.metricClass === "governance") {
    return noRanking(
      "internal only",
      "no cross-runtime winner",
      "Governance compares Galerina tiers only; native lanes perform different work.",
    );
  }
  const aligned = benchmark.units?.comparable === true && benchmark.units?.status === "PASS";
  if (!aligned) {
    return noRanking(
      "not certified",
      "no admitted winner",
      "Measurements are visible, but this workload is not work-equivalence certified.",
    );
  }

  const nativeControlsOnly = benchmark.comparisonScope === "native-controls-only";
  const referenceOnly = benchmark.comparisonScope === "reference-only";
  if (nativeControlsOnly && runtimeCatalog.some((runtime) =>
    runtime.productionGalerina === true && benchmark.results?.[runtime.key] !== undefined)) {
    return noRanking(
      "refused",
      "no admitted winner",
      "A Galerina production lane appeared inside a native-controls-only workload.",
    );
  }

  const memory = benchmark.metricClass === "memory";
  const memoryBytesPerOp = {};
  const candidates = [];
  let productionPresent = false;
  for (const [order, runtime] of runtimeCatalog.entries()) {
    const result = benchmark.results?.[runtime.key];
    const value = memory ? bytesPerOperation(result) : rateOf(result);
    if (memory && value !== null) memoryBytesPerOp[runtime.key] = value;
    if (runtime.productionGalerina && result) productionPresent = true;
    if (!runtime.ranked || value === null || (memory && value < 0)) continue;
    candidates.push({ key: runtime.key, label: runtime.label, value, order, productionGalerina: runtime.productionGalerina === true });
  }

  const direction = memory ? "lower is better (heap bytes/op)" : "higher is better";
  if (candidates.length === 0) {
    return Object.freeze({
      direction,
      winner: "no admitted measurement",
      galerinaPlace: productionPresent ? "not rankable" : "not measured",
      explanation: memory
        ? "No non-negative managed heap bytes/op measurement can be ranked."
        : "No finite admitted throughput measurement can be ranked.",
      memoryBytesPerOp: Object.freeze(memoryBytesPerOp),
    });
  }

  const ranked = rank(candidates, memory ? "lower" : "higher");
  const winners = ranked.filter((entry) => entry.place === 1);
  const winner = winners.length === 1
    ? winners[0].label
    : `${winners.map((entry) => entry.label).join(" + ")} (tie)`;
  const galerina = ranked.find((entry) => entry.productionGalerina);
  const galerinaPlace = nativeControlsOnly
    ? "not applicable - native controls only"
    : referenceOnly
    ? "not applicable - references are unranked"
    : galerina
    ? `${ranked.filter((entry) => entry.place === galerina.place).length > 1 ? "joint " : ""}${ordinal(galerina.place)} of ${ranked.length}`
    : (productionPresent ? "not rankable" : "not measured");

  return Object.freeze({
    direction,
    winner,
    galerinaPlace,
    explanation: nativeControlsOnly
      ? "This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls."
      : referenceOnly
      ? "Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked."
      : memory
      ? "Winner uses the lowest non-negative heap bytes/op; throughput is secondary."
      : "Winner uses the highest admitted same-unit throughput.",
    memoryBytesPerOp: Object.freeze(memoryBytesPerOp),
  });
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function formatInterpretationCell(interpretation) {
  return `${escapeMarkdown(interpretation.direction)}. Winner: ${escapeMarkdown(interpretation.winner)}. Galerina/Wasm: ${escapeMarkdown(interpretation.galerinaPlace)}.`;
}
