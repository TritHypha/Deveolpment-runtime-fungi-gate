import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSlideTransition,
  validateTransitionContract,
} from "../src/slide-transition.mjs";

const CONTRACT = Object.freeze({
  schema: "galerina.benchmark.slide-transition.v1",
  archiveDirectory: "2026-08-02_galerina-wasm-before-slide",
  archiveResultsSha256: "a".repeat(64),
  measuredGalerinaCommit: "b".repeat(40),
  baseline: Object.freeze({ product: "Galerina/Wasm", lane: "wasm" }),
  candidate: Object.freeze({ product: "Galerina/SLIDE", lane: "slide" }),
  authorityReleased: false,
});

const PACKAGE_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

const bench = (lane, value, unit = "ops/s") => ({
  benchmark: "same-work",
  metricClass: "cpu-throughput",
  units: { comparable: true, status: "PASS", unit },
  results: { [lane]: { normThroughput: value } },
});

test("a valid frozen contract remains deferred until a real SLIDE lane exists", () => {
  const contract = validateTransitionContract(CONTRACT);
  const result = buildSlideTransition({
    contract,
    baseline: [bench("wasm", 100)],
    current: [bench("wasm", 110)],
  });

  assert.equal(result.status, "DEFERRED_NO_SLIDE_LANE");
  assert.equal(result.baselineLabel, "Galerina/Wasm");
  assert.equal(result.candidateLabel, "Galerina/SLIDE");
  assert.deepEqual(result.rows, []);
  assert.equal(result.authorityReleased, false);
});

test("same-work same-unit archived Wasm and current SLIDE produce a direction-aware comparison", () => {
  const result = buildSlideTransition({
    contract: CONTRACT,
    baseline: [bench("wasm", 100)],
    current: [bench("slide", 125)],
  });

  assert.equal(result.status, "COMPARABLE");
  assert.deepEqual(result.exclusions, []);
  assert.deepEqual(result.rows, [{
    benchmark: "same-work",
    unit: "ops/s",
    direction: "higher is better",
    baseline: 100,
    candidate: 125,
    improvementFactor: 1.25,
    outcome: "BETTER",
  }]);
});

test("unit mismatch and absent historical work stay visible and never receive ratios", () => {
  const current = [
    bench("slide", 125, "different/s"),
    {
      benchmark: "new-only",
      metricClass: "cpu-throughput",
      units: { comparable: true, status: "PASS", unit: "ops/s" },
      results: { slide: { normThroughput: 20 } },
    },
  ];
  const result = buildSlideTransition({ contract: CONTRACT, baseline: [bench("wasm", 100)], current });

  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.rows.length, 0);
  assert.deepEqual(result.exclusions, [
    { benchmark: "same-work", reason: "unit mismatch: ops/s vs different/s" },
    { benchmark: "new-only", reason: "missing archived workload" },
  ]);
});

test("non-finite or non-positive measurements are excluded", () => {
  const result = buildSlideTransition({
    contract: CONTRACT,
    baseline: [bench("wasm", 100)],
    current: [bench("slide", Number.NaN)],
  });
  assert.deepEqual(result.exclusions, [{ benchmark: "same-work", reason: "candidate measurement is not finite and positive" }]);
});

test("duplicate workloads and malformed or proxied contracts are refused", () => {
  assert.throws(
    () => buildSlideTransition({ contract: CONTRACT, baseline: [bench("wasm", 100), bench("wasm", 101)], current: [] }),
    /duplicate baseline benchmark/u,
  );
  assert.throws(
    () => validateTransitionContract({ ...CONTRACT, candidate: { product: "Galerina/SLIDE", lane: "wasm" } }),
    /candidate lane/u,
  );

  let trapRan = false;
  const hostile = new Proxy(CONTRACT, {
    ownKeys() { trapRan = true; throw new Error("trap executed"); },
  });
  assert.throws(() => validateTransitionContract(hostile), /plain data/u);
  assert.equal(trapRan, false);
});

test("the tracked transition contract pins the exact archived Wasm result", () => {
  const contractPath = join(PACKAGE_ROOT, "contracts", "galerina-slide-transition-v1.json");
  const rawContract = readFileSync(contractPath, "utf8");
  const contract = validateTransitionContract(JSON.parse(rawContract));
  const resultBytes = readFileSync(join(PACKAGE_ROOT, "results", "archive", contract.archiveDirectory, "results.json"));
  const digest = createHash("sha256").update(resultBytes).digest("hex");

  assert.equal(digest, "abc564389dd98e8da68a57afedcc57c6b4733e5b20d34ba3423e73f0acb77567");
  assert.equal(digest, contract.archiveResultsSha256);
  assert.equal(contract.measuredGalerinaCommit, "54c15058988ab6a178ce014a2c1fed36f5a7fd63");
});
