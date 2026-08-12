import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BENCHMARKS } from "../src/runner.mjs";
import {
  SLIDE_REFERENCE_SUITE_IDS,
  auditSlideReferenceSuite,
  readSlideReferenceSuite,
  validateSlideReferenceSuiteBytes,
} from "../src/slide-reference-suite.mjs";
import { benchmarkSpec, metricClassOf } from "../src/throughput-units.mjs";

const EXPECTED_IDS = Object.freeze([
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

test("closed SLIDE reference suite owns exactly the 18 comparable groups", async () => {
  const suite = await readSlideReferenceSuite();

  assert.deepEqual(SLIDE_REFERENCE_SUITE_IDS, EXPECTED_IDS);
  assert.deepEqual(suite.benchmarks.map(({ id }) => id), EXPECTED_IDS);
  assert.equal(suite.schemaVersion, 1);
  assert.equal(Object.isFrozen(suite), true);
  assert.equal(Object.isFrozen(suite.benchmarks), true);
  assert.equal(Object.isFrozen(suite.benchmarks[0]), true);
  assert.deepEqual(Object.keys(suite).sort(), ["benchmarks", "schemaVersion", "suiteId"]);
  for (const entry of suite.benchmarks) {
    assert.deepEqual(Object.keys(entry).sort(), [
      "cohort",
      "entryFlow",
      "id",
      "metricClass",
      "sourcePath",
      "sourceState",
      "unit",
      "workCount",
      "workPolicy",
    ]);
    assert.equal(Number.isSafeInteger(entry.workCount), true);
    assert.equal(entry.workCount > 0, true);
    assert.equal(BENCHMARKS.some(({ id }) => id === entry.id), true);
    assert.equal(benchmarkSpec(entry.id)?.N, entry.workCount);
    assert.equal(benchmarkSpec(entry.id)?.unit, entry.unit);
    assert.equal(metricClassOf(entry.id), entry.metricClass);
  }
});

test("suite parser refuses duplicate, surplus, missing and reordered identities", async () => {
  const bytes = await readFile(new URL("../contracts/slide-reference-suite-v1.json", import.meta.url));
  const text = bytes.toString("utf8");
  const parsed = JSON.parse(text);

  assert.throws(
    () => validateSlideReferenceSuiteBytes(Buffer.from(text.replace('"schemaVersion": 1', '"schemaVersion": 1,\n  "schemaVersion": 1'))),
    /SLIDE-REFERENCE-SUITE-001/u,
  );
  assert.throws(
    () => validateSlideReferenceSuiteBytes(Buffer.from(`${JSON.stringify({ ...parsed, surplus: true }, null, 2)}\n`)),
    /SLIDE-REFERENCE-SUITE-001/u,
  );
  assert.throws(
    () => validateSlideReferenceSuiteBytes(Buffer.from(`${JSON.stringify({ ...parsed, benchmarks: parsed.benchmarks.slice(1) }, null, 2)}\n`)),
    /SLIDE-REFERENCE-SUITE-001/u,
  );
  assert.throws(
    () => validateSlideReferenceSuiteBytes(Buffer.from(`${JSON.stringify({ ...parsed, benchmarks: [...parsed.benchmarks].reverse() }, null, 2)}\n`)),
    /SLIDE-REFERENCE-SUITE-001/u,
  );
});

test("coverage audit counts only exact non-authorizing reference observations", async () => {
  const suite = await readSlideReferenceSuite();
  const valid = suite.benchmarks.slice(0, 2).map((entry) => ({
    benchmark: entry.id,
    lane: "slideReference",
    referenceOnly: true,
    authorityReleased: false,
  }));

  assert.deepEqual(auditSlideReferenceSuite(suite, valid), {
    verdict: 0,
    status: "INCOMPLETE_REFERENCE_SUITE",
    failureId: "SLIDE-REFERENCE-SUITE-INCOMPLETE",
    expected: 18,
    measured: 2,
    missing: EXPECTED_IDS.slice(2),
  });
  assert.deepEqual(auditSlideReferenceSuite(suite, [
    ...valid,
    { ...valid[0] },
  ]), {
    verdict: -1,
    status: "REFUSED",
    failureId: "SLIDE-REFERENCE-SUITE-001",
    expected: 18,
    measured: 0,
    missing: EXPECTED_IDS,
  });
  assert.deepEqual(auditSlideReferenceSuite(suite, [
    { ...valid[0], lane: "slide" },
  ]), {
    verdict: -1,
    status: "REFUSED",
    failureId: "SLIDE-REFERENCE-SUITE-001",
    expected: 18,
    measured: 0,
    missing: EXPECTED_IDS,
  });
});
