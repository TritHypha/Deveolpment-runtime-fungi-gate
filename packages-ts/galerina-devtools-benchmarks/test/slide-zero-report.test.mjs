import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildSlideZeroChartHtml,
  buildSlideZeroModel,
  buildSlideZeroTableHtml,
} from "../src/slide-zero-report.mjs";
import { publishSlideZeroArtifacts } from "../src/slide-zero-publication.mjs";

const temp = mkdtempSync(join(tmpdir(), "slide-zero-publication-"));
after(() => rmSync(temp, { recursive: true, force: true }));

const metadata = Object.freeze({
  generatedAt: "2026-08-12T12:34:56.000Z",
  resultSha256: "a".repeat(64),
  galerinaCommit: "b".repeat(40),
  slideCommit: "c".repeat(40),
  toolchains: Object.freeze({
    node: "v24.18.0",
    python: "Python 3.14.6",
    rust: "rustc 1.96.1",
    go: "go version go1.26.5 windows/amd64",
  }),
  wasmReference: Object.freeze({
    archiveDirectory: "2026-08-02_galerina-wasm-before-slide",
    archiveResultsSha256: "d".repeat(64),
    measuredGalerinaCommit: "e".repeat(40),
  }),
});

const aligned = Object.freeze({ comparable: true, status: "PASS", unit: "ops/s" });

test("SLIDE is zero and peer signs, winner and Galerina place are derived from admitted rates", () => {
  const model = buildSlideZeroModel({
    metadata,
    latest: [{
      benchmark: "compute-fixture",
      metricClass: "cpu-throughput",
      units: aligned,
      results: {
        slide: { normThroughput: 100 },
        rust: { normThroughput: 125 },
        nodejs: { normThroughput: 80 },
        python: { normThroughput: 50 },
      },
    }],
  });

  assert.equal(model.status, "COMPARABLE");
  assert.equal(model.rows[0].winner, "Rust");
  assert.equal(model.rows[0].galerinaPlace, "2nd of 4");
  assert.deepEqual(
    model.rows[0].lanes.map((lane) => [lane.key, lane.relativePct]),
    [["slide", 0], ["rust", 25], ["go", null], ["nodejs", -20], ["python", -50]],
  );
});

test("missing production SLIDE refuses ranking and does not promote slideReference or Wasm", () => {
  const model = buildSlideZeroModel({
    metadata,
    latest: [{
      benchmark: "reference-fixture",
      metricClass: "cpu-throughput",
      units: aligned,
      results: {
        wasm: { normThroughput: 90 },
        slideReference: { normThroughput: 110, referenceOnly: true },
        rust: { normThroughput: 120 },
      },
    }],
  });

  assert.equal(model.status, "DEFERRED_NO_SLIDE_LANE");
  assert.deepEqual(model.rows, []);
  assert.match(model.reason, /production `slide` lane/u);
});

test("memory comparison makes lower allocation positive and ranks the smallest value first", () => {
  const model = buildSlideZeroModel({
    metadata,
    latest: [{
      benchmark: "memory-fixture",
      metricClass: "memory",
      units: { comparable: true, status: "PASS", unit: "records/s" },
      results: {
        slide: { memory: { bytesPerOperation: 20 } },
        rust: { memory: { bytesPerOperation: 10 } },
        nodejs: { memory: { bytesPerOperation: 40 } },
      },
    }],
  });

  assert.equal(model.rows[0].winner, "Rust");
  assert.equal(model.rows[0].lanes.find((lane) => lane.key === "rust").relativePct, 50);
  assert.equal(model.rows[0].lanes.find((lane) => lane.key === "nodejs").relativePct, -100);
});

test("chart and table are offline, escaped, dated, and carry exact Wasm references", () => {
  const model = buildSlideZeroModel({
    metadata,
    latest: [{
      benchmark: "<img src=x>",
      metricClass: "cpu-throughput",
      units: aligned,
      results: { slide: { normThroughput: 100 }, rust: { normThroughput: 110 } },
    }],
  });
  const chart = buildSlideZeroChartHtml(model);
  const table = buildSlideZeroTableHtml(model);

  for (const html of [chart, table]) {
    assert.doesNotMatch(html, /<script/iu);
    assert.doesNotMatch(html, /https?:\/\//iu);
    assert.doesNotMatch(html, /<img src=x>/u);
    assert.match(html, /&lt;img src=x&gt;/u);
    assert.match(html, /2026-08-12T12:34:56\.000Z/u);
    assert.match(html, /2026-08-02_galerina-wasm-before-slide/u);
    assert.match(html, new RegExp("d{64}"));
    assert.match(html, /Galerina\/SLIDE = 0/u);
    assert.match(html, /Roboto/u);
  }
});

test("malformed provenance refuses publication", () => {
  assert.throws(
    () => buildSlideZeroModel({ latest: [], metadata: { ...metadata, resultSha256: "not-a-digest" } }),
    /resultSha256/u,
  );
});

test("publication writes matching latest and immutable UTC-dated raw, chart, table and metadata", () => {
  const raw = '[{"benchmark":"fixture"}]\n';
  const chart = "<!doctype html><title>chart</title>";
  const table = "<!doctype html><title>table</title>";
  const result = publishSlideZeroArtifacts({
    resultsDir: temp,
    generatedAt: metadata.generatedAt,
    latestRaw: raw,
    metadata,
    chart,
    table,
  });

  assert.equal(result.runDirectory, "runs/2026-08-12T12-34-56-000Z");
  assert.equal(readFileSync(join(temp, "benchmark-slide-zero-latest.html"), "utf8"), chart);
  assert.equal(readFileSync(join(temp, "benchmark-slide-zero-table-latest.html"), "utf8"), table);
  assert.equal(readFileSync(join(temp, result.runDirectory, "results.json"), "utf8"), raw);
  assert.equal(readFileSync(join(temp, result.runDirectory, "benchmark-slide-zero-chart.html"), "utf8"), chart);
  assert.equal(readFileSync(join(temp, result.runDirectory, "benchmark-slide-zero-table.html"), "utf8"), table);
  assert.equal(existsSync(join(temp, result.runDirectory, "metadata.json")), true);

  assert.throws(
    () => publishSlideZeroArtifacts({ resultsDir: temp, generatedAt: metadata.generatedAt, latestRaw: raw, metadata, chart, table }),
    /dated run directory already exists/u,
  );
});
