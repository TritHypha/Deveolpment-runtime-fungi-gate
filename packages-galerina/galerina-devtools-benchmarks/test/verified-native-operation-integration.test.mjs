import assert from "node:assert/strict";
import test from "node:test";

import { classifyBenchmark } from "../src/audit-benchmark-integrity.mjs";
import { REPORT_RUNTIMES, buildCrossLanguageRows } from "../src/report-model.mjs";
import { BENCHMARKS, runBenchmark } from "../src/runner.mjs";
import {
  assertBenchmarkUnits,
  benchmarkSpec,
  normalizeThroughput,
} from "../src/throughput-units.mjs";

const entry = {
  benchmark: "verified-native-operation",
  metricClass: "cpu-throughput",
  units: { comparable: true, status: "PASS", unit: "element-reads/s" },
  results: {
    rust: { normThroughput: 900 },
    nodejs: { normThroughput: 700 },
    checkedReference: { normThroughput: 500 },
    slideReference: { normThroughput: 600 },
  },
};

test("catalog and unit model admit one-million element reads", () => {
  assert.equal(
    BENCHMARKS.some((benchmark) => benchmark.id === "verified-native-operation"),
    true,
  );
  assert.equal(benchmarkSpec("verified-native-operation")?.N, 1_000_000);
  assert.equal(
    benchmarkSpec("verified-native-operation")?.unit,
    "element-reads/s",
  );
  for (const runtime of ["rust", "nodejs", "checkedReference", "slideReference"]) {
    assert.equal(
      normalizeThroughput(runtime, { operationsPerSecond: 123 }, "verified-native-operation").ops,
      123,
    );
  }
  assert.equal(
    assertBenchmarkUnits("verified-native-operation", entry.results).status,
    "PASS",
  );
});

test("both reference paths are required subjects and neither can win", () => {
  const classification = classifyBenchmark(entry);
  assert.equal(classification.subjectPresent, true);
  assert.deepEqual(classification.subjectLanes, ["checkedReference", "slideReference"]);
  assert.equal(classification.category, "certified");
  assert.deepEqual(classification.findings, []);

  const incomplete = classifyBenchmark({
    ...entry,
    results: { ...entry.results, slideReference: undefined },
  });
  assert.equal(incomplete.subjectPresent, false);
  assert.equal(
    incomplete.findings.some((finding) => finding.code === "benchmark-subject-incomplete"),
    true,
  );

  assert.equal(
    REPORT_RUNTIMES.some((runtime) => runtime.key === "checkedReference" && runtime.ranked === false),
    true,
  );
  assert.equal(
    REPORT_RUNTIMES.some((runtime) => runtime.key === "slideReference" && runtime.ranked === false),
    true,
  );
  const row = buildCrossLanguageRows([entry])[0];
  assert.equal(row.interpretation.winner, "Rust");
  assert.equal(row.interpretation.galerinaPlace, "not applicable - references are unranked");
  assert.equal(row.checkedReference, 500);
  assert.equal(row.slideReference, 600);
});

test("the standard runner normalizes both frozen reference subjects", async () => {
  const benchmark = BENCHMARKS.find(
    (candidate) => candidate.id === "verified-native-operation",
  );
  const result = await runBenchmark(benchmark);
  assert.equal(result.units.status, "PASS");
  assert.equal(result.results.checkedReference.throughputUnit, "element-reads/s");
  assert.equal(result.results.slideReference.throughputUnit, "element-reads/s");
  assert.equal(result.results.checkedReference.referenceOnly, true);
  assert.equal(result.results.slideReference.referenceOnly, true);
});
