// Exact historical Galerina/Wasm to current Galerina/SLIDE comparison model.
// The caller owns file reads and digest admission; this module owns pure validation
// and pairing. It never promotes comparison evidence into execution authority.
import { types } from "node:util";

import { bytesPerOperation } from "./benchmark-interpretation.mjs";

const CONTRACT_KEYS = Object.freeze([
  "archiveDirectory",
  "archiveResultsSha256",
  "authorityReleased",
  "baseline",
  "candidate",
  "measuredGalerinaCommit",
  "schema",
]);
const PRODUCT_KEYS = Object.freeze(["lane", "product"]);
const HEX_64 = /^[0-9a-f]{64}$/u;
const HEX_40 = /^[0-9a-f]{40}$/u;
const ARCHIVE_NAME = /^2026-[0-9]{2}-[0-9]{2}_[a-z0-9-]+$/u;

function plainRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || types.isProxy(value)) {
    throw new TypeError(`${label} must be plain data`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must be plain data`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (descriptor.get || descriptor.set) throw new TypeError(`${label} must not contain accessors`);
  }
  return descriptors;
}

function exactKeys(value, expected, label) {
  const descriptors = plainRecord(value, label);
  const actual = Object.keys(descriptors).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has unexpected or missing fields`);
  }
}

export function validateTransitionContract(value) {
  exactKeys(value, CONTRACT_KEYS, "transition contract");
  exactKeys(value.baseline, PRODUCT_KEYS, "transition baseline");
  exactKeys(value.candidate, PRODUCT_KEYS, "transition candidate");
  if (value.schema !== "galerina.benchmark.slide-transition.v1") throw new TypeError("transition schema is not admitted");
  if (!ARCHIVE_NAME.test(value.archiveDirectory)) throw new TypeError("transition archive directory is malformed");
  if (!HEX_64.test(value.archiveResultsSha256)) throw new TypeError("transition archive digest is malformed");
  if (!HEX_40.test(value.measuredGalerinaCommit)) throw new TypeError("transition measured commit is malformed");
  if (value.baseline.product !== "Galerina/Wasm" || value.baseline.lane !== "wasm") throw new TypeError("transition baseline lane is not Galerina/Wasm");
  if (value.candidate.product !== "Galerina/SLIDE" || value.candidate.lane !== "slide") throw new TypeError("transition candidate lane is not Galerina/SLIDE");
  if (value.authorityReleased !== false) throw new TypeError("transition contract cannot release authority");
  return Object.freeze({
    schema: value.schema,
    archiveDirectory: value.archiveDirectory,
    archiveResultsSha256: value.archiveResultsSha256,
    measuredGalerinaCommit: value.measuredGalerinaCommit,
    baseline: Object.freeze({ ...value.baseline }),
    candidate: Object.freeze({ ...value.candidate }),
    authorityReleased: false,
  });
}

function indexBenchmarks(entries, label) {
  if (!Array.isArray(entries) || types.isProxy(entries)) throw new TypeError(`${label} benchmark set must be an array`);
  const index = new Map();
  for (const entry of entries) {
    plainRecord(entry, `${label} benchmark`);
    if (typeof entry.benchmark !== "string" || entry.benchmark.length === 0) throw new TypeError(`${label} benchmark id is malformed`);
    if (index.has(entry.benchmark)) throw new TypeError(`duplicate ${label} benchmark: ${entry.benchmark}`);
    index.set(entry.benchmark, entry);
  }
  return index;
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
  return entry.metricClass === "memory"
    ? bytesPerOperation(entry.results?.[lane])
    : throughput(entry.results?.[lane]);
}

export function buildSlideTransition({ contract: rawContract, baseline, current }) {
  const contract = validateTransitionContract(rawContract);
  const baselineIndex = indexBenchmarks(baseline, "baseline");
  const currentIndex = indexBenchmarks(current, "current");
  const candidateEntries = [...currentIndex.values()].filter((entry) => Object.hasOwn(entry.results ?? {}, contract.candidate.lane));
  const common = {
    schema: contract.schema,
    baselineLabel: contract.baseline.product,
    candidateLabel: contract.candidate.product,
    archiveDirectory: contract.archiveDirectory,
    authorityReleased: false,
  };
  if (candidateEntries.length === 0) {
    return Object.freeze({ ...common, status: "DEFERRED_NO_SLIDE_LANE", rows: Object.freeze([]), exclusions: Object.freeze([]) });
  }

  const rows = [];
  const exclusions = [];
  for (const candidateEntry of candidateEntries) {
    const id = candidateEntry.benchmark;
    const baselineEntry = baselineIndex.get(id);
    if (!baselineEntry) {
      exclusions.push({ benchmark: id, reason: "missing archived workload" });
      continue;
    }
    const baselineUnit = baselineEntry.units?.unit;
    const candidateUnit = candidateEntry.units?.unit;
    if (baselineEntry.units?.comparable !== true || baselineEntry.units?.status !== "PASS"
      || candidateEntry.units?.comparable !== true || candidateEntry.units?.status !== "PASS") {
      exclusions.push({ benchmark: id, reason: "workload is not admitted and unit-aligned in both runs" });
      continue;
    }
    if (baselineEntry.metricClass !== candidateEntry.metricClass) {
      exclusions.push({ benchmark: id, reason: `metric class mismatch: ${baselineEntry.metricClass} vs ${candidateEntry.metricClass}` });
      continue;
    }
    if (baselineUnit !== candidateUnit) {
      exclusions.push({ benchmark: id, reason: `unit mismatch: ${baselineUnit} vs ${candidateUnit}` });
      continue;
    }
    if (candidateEntry.metricClass === "governance") {
      exclusions.push({ benchmark: id, reason: "governance is internal-only" });
      continue;
    }
    const baselineValue = measuredValue(baselineEntry, contract.baseline.lane);
    const candidateValue = measuredValue(candidateEntry, contract.candidate.lane);
    if (typeof baselineValue !== "number" || !Number.isFinite(baselineValue) || baselineValue <= 0) {
      exclusions.push({ benchmark: id, reason: "baseline measurement is not finite and positive" });
      continue;
    }
    if (typeof candidateValue !== "number" || !Number.isFinite(candidateValue) || candidateValue <= 0) {
      exclusions.push({ benchmark: id, reason: "candidate measurement is not finite and positive" });
      continue;
    }
    const lower = candidateEntry.metricClass === "memory";
    const improvementFactor = lower ? baselineValue / candidateValue : candidateValue / baselineValue;
    rows.push(Object.freeze({
      benchmark: id,
      unit: lower ? "heap bytes/op" : candidateUnit,
      direction: lower ? "lower is better" : "higher is better",
      baseline: baselineValue,
      candidate: candidateValue,
      improvementFactor,
      outcome: improvementFactor > 1 ? "BETTER" : improvementFactor < 1 ? "WORSE" : "TIED",
    }));
  }
  return Object.freeze({
    ...common,
    status: rows.length > 0 && exclusions.length === 0 ? "COMPARABLE" : "INCOMPLETE",
    rows: Object.freeze(rows),
    exclusions: Object.freeze(exclusions),
  });
}
