import test from "node:test";
import assert from "node:assert/strict";

import {
  REPORT_RUNTIMES,
  buildCrossLanguageRows,
  buildReportMarkdown,
} from "../src/report-model.mjs";

const transition = Object.freeze({
  schema: "galerina.benchmark.slide-transition.v1",
  status: "DEFERRED_NO_SLIDE_LANE",
  baselineLabel: "Galerina/Wasm",
  candidateLabel: "Galerina/SLIDE",
  archiveDirectory: "2026-08-02_galerina-wasm-before-slide",
  authorityReleased: false,
  rows: Object.freeze([]),
  exclusions: Object.freeze([]),
});

test("cross-language rows derive winner, direction and production Galerina place from raw facts", () => {
  const rows = buildCrossLanguageRows([{
    benchmark: "compute-fixture",
    metricClass: "cpu-throughput",
    units: { comparable: true, status: "PASS", unit: "ops/s" },
    results: {
      rust: { normThroughput: 300 },
      wasm: { normThroughput: 200 },
      galerinaGoverned: { normThroughput: 900 },
      python: { normThroughput: 100 },
    },
  }]);

  assert.equal(rows[0].interpretation.direction, "higher is better");
  assert.equal(rows[0].interpretation.winner, "Rust");
  assert.equal(rows[0].interpretation.galerinaPlace, "2nd of 3");
  assert.equal(rows[0].wasm, 200);
});

test("generated Markdown explains every ranking column and the green tick", () => {
  const crossLanguage = buildCrossLanguageRows([
    {
      benchmark: "compute-fixture",
      metricClass: "cpu-throughput",
      units: { comparable: true, status: "PASS", unit: "ops/s" },
      results: { rust: { normThroughput: 300 }, wasm: { normThroughput: 200 } },
    },
    {
      benchmark: "legacy-fixture",
      metricClass: "cpu-throughput",
      results: { rust: { normThroughput: 300 }, wasm: { normThroughput: 400 } },
    },
  ]);
  const markdown = buildReportMarkdown({
    baseline: "fixture-baseline",
    runtimes: REPORT_RUNTIMES,
    diffFromLast: [],
    crossLanguage,
    slideTransition: transition,
  });

  assert.match(markdown, /\| Benchmark \| Unit \| Better \| Winner \| Galerina production place \| Comment \|/u);
  assert.match(markdown, /compute-fixture ✅/u);
  assert.match(markdown, /higher is better \| Rust \| 2nd of 2/u);
  assert.match(markdown, /legacy-fixture \| per-call \| not certified \| no admitted winner \| not ranked/u);
  assert.match(markdown, /✅.*work-equivalent.*unit-aligned.*does not mean Galerina won/isu);
  assert.match(markdown, /Galerina\/Wasm production/u);
});

test("memory rows display the lower-is-better bytes/op scores that actually choose the winner", () => {
  const crossLanguage = buildCrossLanguageRows([{
    benchmark: "memory-fixture",
    metricClass: "memory",
    units: { comparable: true, status: "PASS", unit: "records/s" },
    results: {
      nodejs: { normThroughput: 900, memory: { bytesPerOperation: 4 } },
      wasm: { normThroughput: 100, memory: { bytesPerOperation: 2 } },
    },
  }]);
  const markdown = buildReportMarkdown({
    baseline: null,
    runtimes: REPORT_RUNTIMES,
    diffFromLast: [],
    crossLanguage,
    slideTransition: transition,
  });

  assert.equal(crossLanguage[0].scoreUnit, "heap bytes/op");
  assert.match(markdown, /memory-fixture ✅ \| heap bytes\/op \| lower is better \(heap bytes\/op\)/u);
  assert.match(markdown, /\| — \| — \| — \| 4\.00 \| 2\.00 \| — \| — \|/u);
  assert.doesNotMatch(markdown, /\| 900 \| 100 \|/u);
});

test("the report names the frozen old-Wasm baseline and defers until a real SLIDE lane exists", () => {
  const markdown = buildReportMarkdown({
    baseline: null,
    runtimes: REPORT_RUNTIMES,
    diffFromLast: [],
    crossLanguage: [],
    slideTransition: transition,
  });

  assert.match(markdown, /Galerina\/SLIDE versus archived Galerina\/Wasm/u);
  assert.match(markdown, /2026-08-02_galerina-wasm-before-slide/u);
  assert.match(markdown, /DEFERRED_NO_SLIDE_LANE/u);
  assert.match(markdown, /No production `slide` lane is present/u);
});

test("an active transition renders comparisons and every exclusion", () => {
  const markdown = buildReportMarkdown({
    baseline: null,
    runtimes: REPORT_RUNTIMES,
    diffFromLast: [],
    crossLanguage: [],
    slideTransition: {
      ...transition,
      status: "INCOMPLETE",
      rows: [{ benchmark: "same-work", unit: "ops/s", direction: "higher is better", baseline: 100, candidate: 125, improvementFactor: 1.25, outcome: "BETTER" }],
      exclusions: [{ benchmark: "new-only", reason: "missing archived workload" }],
    },
  });

  assert.match(markdown, /\| same-work \| ops\/s \| higher is better \| 100 \| 125 \| 1\.25x \| BETTER \|/u);
  assert.match(markdown, /new-only: missing archived workload/u);
  assert.match(markdown, /does not release production authority/u);
});
