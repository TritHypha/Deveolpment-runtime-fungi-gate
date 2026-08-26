import { readFile, stat } from "node:fs/promises";

const FAILURE_ID = "SLIDE-REFERENCE-SUITE-001";
const INCOMPLETE_ID = "SLIDE-REFERENCE-SUITE-INCOMPLETE";
const CONTRACT_URL = new URL("../contracts/slide-reference-suite-v1.json", import.meta.url);
const PACKAGE_URL = new URL("../", import.meta.url);
const TOP_KEYS = Object.freeze(["schemaVersion", "suiteId", "benchmarks"]);
const ENTRY_KEYS = Object.freeze([
  "id",
  "cohort",
  "sourcePath",
  "sourceState",
  "entryFlow",
  "metricClass",
  "unit",
  "workCount",
  "workPolicy",
]);
const OBSERVATION_KEYS = Object.freeze([
  "benchmark",
  "lane",
  "referenceOnly",
  "authorityReleased",
]);
const SOURCE_STATES = new Set(["PRESENT", "BOUND_EVIDENCE", "MISSING"]);
const WORK_POLICIES = new Set([
  "EXACT",
  "OPTIMIZED_FUSED",
  "REAL_RECORD_REQUIRED",
  "REAL_TREE_REQUIRED",
  "PACKAGE_EXACT",
]);
const TOKEN = /^[A-Za-z][A-Za-z0-9-]*$/u;
const PATH = /^(?:benchmarks|evidence)\/[a-z0-9][a-z0-9./-]*$/u;

export const SLIDE_REFERENCE_SUITE_IDS = Object.freeze([
  "compute-mix",
  "record-allocation",
  "tower-of-hanoi",
  "collection-pipeline",
  "low-memory",
  "gpu-compute",
  "matrix-multiply",
  "tri-logic",
  "verified-native-operation",
  "data-query",
  "call-chain",
  "nbody",
  "json-parse",
  "mandelbrot",
  "spectral-norm",
  "binary-trees",
  "spore-container",
  "framework-pipeline",
]);

function refuse() {
  throw new Error(FAILURE_ID);
}

function exactKeys(value, expected) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function duplicateJsonKey(text) {
  const stack = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "{") {
      stack.push({ type: "object", keys: new Set() });
      index += 1;
      continue;
    }
    if (character === "[") {
      stack.push({ type: "array" });
      index += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      stack.pop();
      index += 1;
      continue;
    }
    if (character !== '"') {
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    let escaped = false;
    while (index < text.length) {
      const current = text[index];
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        break;
      }
      index += 1;
    }
    if (index >= text.length) refuse();
    const token = text.slice(start, index + 1);
    let next = index + 1;
    while (/\s/u.test(text[next] ?? "")) next += 1;
    if (text[next] === ":") {
      const frame = stack.at(-1);
      if (frame?.type !== "object") refuse();
      let key;
      try {
        key = JSON.parse(token);
      } catch {
        refuse();
      }
      if (frame.keys.has(key)) return true;
      frame.keys.add(key);
    }
    index += 1;
  }
  return false;
}

function freezeData(value) {
  if (Array.isArray(value)) {
    for (const item of value) freezeData(item);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) freezeData(item);
  }
  return Object.freeze(value);
}

function validEntry(entry, expectedId) {
  return exactKeys(entry, ENTRY_KEYS)
    && entry.id === expectedId
    && TOKEN.test(entry.id)
    && TOKEN.test(entry.cohort)
    && PATH.test(entry.sourcePath)
    && SOURCE_STATES.has(entry.sourceState)
    && TOKEN.test(entry.entryFlow)
    && TOKEN.test(entry.metricClass)
    && typeof entry.unit === "string"
    && entry.unit.length > 2
    && entry.unit.length < 64
    && Number.isSafeInteger(entry.workCount)
    && entry.workCount > 0
    && WORK_POLICIES.has(entry.workPolicy);
}

export function validateSlideReferenceSuiteBytes(input) {
  try {
    const bytes = Buffer.from(input);
    if (
      bytes.length < 2
      || bytes.length > 64 * 1024
      || (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    ) refuse();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.endsWith("\n") || duplicateJsonKey(text)) refuse();
    const value = JSON.parse(text);
    if (
      !exactKeys(value, TOP_KEYS)
      || value.schemaVersion !== 1
      || value.suiteId !== "galerina-slide-reference-suite-v1"
      || !Array.isArray(value.benchmarks)
      || value.benchmarks.length !== SLIDE_REFERENCE_SUITE_IDS.length
    ) refuse();
    for (let index = 0; index < SLIDE_REFERENCE_SUITE_IDS.length; index += 1) {
      if (!validEntry(value.benchmarks[index], SLIDE_REFERENCE_SUITE_IDS[index])) refuse();
    }
    return freezeData(value);
  } catch (error) {
    if (error instanceof Error && error.message === FAILURE_ID) throw error;
    refuse();
  }
}

export async function readSlideReferenceSuite() {
  const suite = validateSlideReferenceSuiteBytes(await readFile(CONTRACT_URL));
  for (const entry of suite.benchmarks) {
    const sourceUrl = new URL(entry.sourcePath, PACKAGE_URL);
    let sourceStat;
    try {
      sourceStat = await stat(sourceUrl);
    } catch {
      sourceStat = undefined;
    }
    const present = sourceStat?.isFile() === true;
    if (entry.sourceState === "MISSING" ? present : !present) refuse();
  }
  return suite;
}

function refusal(expected, missing) {
  return Object.freeze({
    verdict: -1,
    status: "REFUSED",
    failureId: FAILURE_ID,
    expected,
    measured: 0,
    missing: Object.freeze([...missing]),
  });
}

export function auditSlideReferenceSuite(suite, observations) {
  const expectedIds = exactKeys(suite, TOP_KEYS)
    && Array.isArray(suite.benchmarks)
    && suite.benchmarks.length === SLIDE_REFERENCE_SUITE_IDS.length
    && suite.benchmarks.every((entry, index) => validEntry(entry, SLIDE_REFERENCE_SUITE_IDS[index]))
    ? suite.benchmarks.map(({ id }) => id)
    : [...SLIDE_REFERENCE_SUITE_IDS];
  try {
    if (!Array.isArray(observations) || expectedIds.length !== SLIDE_REFERENCE_SUITE_IDS.length) {
      return refusal(SLIDE_REFERENCE_SUITE_IDS.length, SLIDE_REFERENCE_SUITE_IDS);
    }
    const measured = new Set();
    for (const observation of observations) {
      if (
        !exactKeys(observation, OBSERVATION_KEYS)
        || !expectedIds.includes(observation.benchmark)
        || observation.lane !== "slideReference"
        || observation.referenceOnly !== true
        || observation.authorityReleased !== false
        || measured.has(observation.benchmark)
      ) return refusal(expectedIds.length, expectedIds);
      measured.add(observation.benchmark);
    }
    const missing = expectedIds.filter((id) => !measured.has(id));
    return Object.freeze({
      verdict: missing.length === 0 ? 1 : 0,
      status: missing.length === 0 ? "COMPLETE_REFERENCE_SUITE" : "INCOMPLETE_REFERENCE_SUITE",
      failureId: missing.length === 0 ? "NONE" : INCOMPLETE_ID,
      expected: expectedIds.length,
      measured: measured.size,
      missing: Object.freeze(missing),
    });
  } catch {
    return refusal(SLIDE_REFERENCE_SUITE_IDS.length, SLIDE_REFERENCE_SUITE_IDS);
  }
}
