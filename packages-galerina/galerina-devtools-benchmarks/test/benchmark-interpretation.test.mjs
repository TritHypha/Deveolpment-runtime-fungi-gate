import test from "node:test";
import assert from "node:assert/strict";

import {
  bytesPerOperation,
  formatInterpretationCell,
  interpretBenchmark,
} from "../src/benchmark-interpretation.mjs";

const RUNTIMES = Object.freeze([
  Object.freeze({ key: "rust", label: "Rust", ranked: true }),
  Object.freeze({ key: "wasm", label: "Galerina/Wasm", ranked: true, productionGalerina: true }),
  Object.freeze({ key: "galerinaGoverned", label: "Galerina governed diagnostic", ranked: false }),
  Object.freeze({ key: "python", label: "Python", ranked: true }),
]);

test("aligned throughput names the winner and ranks production Galerina without counting its diagnostic interpreter", () => {
  const result = interpretBenchmark({
    benchmark: "compute-fixture",
    metricClass: "cpu-throughput",
    units: { comparable: true, status: "PASS", unit: "ops/s" },
    results: {
      rust: { normThroughput: 300 },
      wasm: { normThroughput: 200 },
      galerinaGoverned: { normThroughput: 900 },
      python: { normThroughput: 100 },
    },
  }, RUNTIMES);

  assert.equal(result.direction, "higher is better");
  assert.equal(result.winner, "Rust");
  assert.equal(result.galerinaPlace, "2nd of 3");
  assert.match(formatInterpretationCell(result), /Winner: Rust/);
  assert.match(formatInterpretationCell(result), /Galerina\/Wasm: 2nd of 3/);
});

test("memory uses lower non-negative heap bytes per operation and excludes collection noise", () => {
  const result = interpretBenchmark({
    benchmark: "memory-fixture",
    metricClass: "memory",
    units: { comparable: true, status: "PASS", unit: "items/s" },
    results: {
      rust: { normThroughput: 500 },
      wasm: { normThroughput: 200, memory: { bytesPerOperation: 2 } },
      galerinaGoverned: { normThroughput: 50, memory: { bytesPerOperation: 1 } },
      python: { normThroughput: 100, memory: { bytesPerOperation: -5 } },
    },
  }, RUNTIMES);

  assert.equal(bytesPerOperation({ memory: { bytesPerOperation: -5 } }), -5);
  assert.equal(result.direction, "lower is better (heap bytes/op)");
  assert.equal(result.winner, "Galerina/Wasm");
  assert.equal(result.galerinaPlace, "1st of 1");
  assert.deepEqual(result.memoryBytesPerOp, { wasm: 2, galerinaGoverned: 1, python: -5 });
});

test("governance rows do not manufacture a cross-runtime winner", () => {
  const result = interpretBenchmark({
    benchmark: "governance-fixture",
    metricClass: "governance",
    units: { comparable: false, status: "FLAGGED", unit: "gov-factor" },
    results: {
      wasm: { normThroughput: 900 },
      rust: { normThroughput: 1000 },
    },
  }, RUNTIMES);

  assert.equal(result.direction, "internal only");
  assert.equal(result.winner, "no cross-runtime winner");
  assert.equal(result.galerinaPlace, "not ranked");
});

test("uncertified rows expose measurements without declaring a winner or Galerina place", () => {
  const result = interpretBenchmark({
    benchmark: "legacy-fixture",
    metricClass: "cpu-throughput",
    results: {
      wasm: { normThroughput: 900 },
      rust: { normThroughput: 1000 },
    },
  }, RUNTIMES);

  assert.equal(result.direction, "not certified");
  assert.equal(result.winner, "no admitted winner");
  assert.equal(result.galerinaPlace, "not ranked");
  assert.match(result.explanation, /not work-equivalence certified/);
});

test("exact ties share first place and a missing production lane is explicit", () => {
  const tied = interpretBenchmark({
    benchmark: "tie-fixture",
    metricClass: "cpu-throughput",
    units: { comparable: true, status: "PASS", unit: "ops/s" },
    results: {
      rust: { normThroughput: 100 },
      wasm: { normThroughput: 100 },
      python: { normThroughput: 50 },
    },
  }, RUNTIMES);
  assert.equal(tied.winner, "Rust + Galerina/Wasm (tie)");
  assert.equal(tied.galerinaPlace, "joint 1st of 3");

  const absent = interpretBenchmark({
    benchmark: "missing-fixture",
    metricClass: "cpu-throughput",
    units: { comparable: true, status: "PASS", unit: "ops/s" },
    results: { rust: { normThroughput: 100 } },
  }, RUNTIMES);
  assert.equal(absent.galerinaPlace, "not measured");
});
