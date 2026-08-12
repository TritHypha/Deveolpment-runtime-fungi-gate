import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildSlideWasmHistoryHtml,
  buildSlideWasmHistoryModel,
} from "../src/slide-wasm-history-report.mjs";
import { publishSlideWasmHistoryArtifact } from "../src/build-slide-wasm-history.mjs";

const temporaryDirectories = [];
afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

function digest(raw) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function fixture() {
  const aligned = { comparable: true, status: "PASS", unit: "ops/s" };
  const wasmArchive = [
    { benchmark: "alpha", metricClass: "cpu-throughput", units: aligned, results: { wasm: { normThroughput: 90 } } },
    { benchmark: "beta", metricClass: "cpu-throughput", units: aligned, results: { wasm: { normThroughput: 80 } } },
  ];
  const current = [
    {
      benchmark: "verified-native-operation",
      metricClass: "cpu-throughput",
      units: { comparable: true, status: "PASS", unit: "element-reads/s" },
      results: {
        slideReference: {
          normThroughput: 100,
          operationsPerSecond: 100,
          iterations: 1_000_000,
          result: 999_999,
          unit: "element-reads/s",
          referenceOnly: true,
          authorityReleased: false,
        },
        rust: {
          normThroughput: 150,
          iterations: 1_000_000,
          result: 999_999,
          unit: "element-reads/s",
        },
        rustAvx2: {
          normThroughput: 160,
          iterations: 1_000_000,
          result: 999_999,
          unit: "element-reads/s",
        },
        nodejs: {
          normThroughput: 80,
          iterations: 1_000_000,
          result: 999_999,
          unit: "element-reads/s",
        },
        python: {
          normThroughput: 10,
          iterations: 1_000_000,
          result: 999_999,
          unit: "element-reads/s",
        },
      },
    },
  ];
  const metadata = {
    generatedAt: "2026-08-12T17:19:05.632Z",
    resultSha256: "a".repeat(64),
    galerinaCommit: "b".repeat(40),
    slideCommit: "c".repeat(40),
    wasmReference: {
      archiveDirectory: "2026-08-02_galerina-wasm-before-slide",
      archiveResultsSha256: "d".repeat(64),
      measuredGalerinaCommit: "e".repeat(40),
    },
  };
  const archiveMeta = {
    capturedAt: "2026-08-02T08:10:16.109Z",
    git: { commit: "831ed83a", branch: "codex/galerina-beta-v1-completion" },
  };
  const sources = {
    wasmResults: { path: "results/archive/2026-08-02_galerina-wasm-before-slide/results.json", sha256: "d".repeat(64) },
    slideResults: { path: "results/runs/2026-08-12T17-19-05-632Z/results.json", sha256: "a".repeat(64) },
    wasmMeta: { path: "results/archive/2026-08-02_galerina-wasm-before-slide/meta.json", sha256: "f".repeat(64) },
  };
  return { wasmArchive, current, metadata, archiveMeta, sources };
}

test("verified SLIDE reference is zero and same-work peers receive signed deltas", () => {
  const model = buildSlideWasmHistoryModel(fixture());
  const comparison = model.slideReferenceComparison;

  assert.equal(comparison.status, "MEASURED_NON_AUTHORIZING");
  assert.equal(comparison.authorityReleased, false);
  assert.equal(comparison.baseline.product, "Galerina/SLIDE reference");
  assert.equal(comparison.baseline.deltaPct, 0);
  assert.equal(comparison.baseline.value, 100);
  assert.equal(comparison.winner, "Rust AVX2");
  assert.equal(comparison.galerinaPlace, 3);
  assert.deepEqual(
    comparison.peers.map((peer) => [peer.product, peer.deltaPct]),
    [
      ["Rust AVX2", 60],
      ["Rust", 50],
      ["Node.js", -20],
      ["Python", -90],
    ],
  );
  assert.deepEqual(comparison.unavailable, ["Go"]);
});

test("verified SLIDE reference comparison refuses authority-bearing or malformed evidence", () => {
  const authorityBearing = fixture();
  authorityBearing.current[0].results.slideReference.authorityReleased = true;
  assert.throws(
    () => buildSlideWasmHistoryModel(authorityBearing),
    /verified SLIDE reference evidence refused/u,
  );

  const wrongWork = fixture();
  wrongWork.current[0].results.slideReference.iterations = 999_999;
  assert.throws(
    () => buildSlideWasmHistoryModel(wrongWork),
    /verified SLIDE reference evidence refused/u,
  );
});

test("history page renders the approved SLIDE-zero reference panel without weakening production status", () => {
  const page = buildSlideWasmHistoryHtml(buildSlideWasmHistoryModel(fixture()));

  assert.match(page, /Verified SLIDE reference comparison/u);
  assert.match(page, /SLIDE reference = 0 baseline/u);
  assert.match(page, /Rust AVX2 \+60%/u);
  assert.match(page, new RegExp(`Node\\.js ${String.fromCodePoint(0x2212)}20%`, "u"));
  assert.match(page, /Winner: Rust AVX2/u);
  assert.match(page, /Galerina place: 3 of 5/u);
  assert.match(page, /Go: not measured/u);
  assert.match(page, /MEASURED_NON_AUTHORIZING/u);
  assert.match(page, /<table class="comparison-table"/u);
  assert.match(page, /<th>Product<\/th><th>Throughput<\/th><th>Relative to SLIDE reference<\/th><th>Rank<\/th>/u);
  assert.match(page, /data-reference-table-row="Galerina\/SLIDE reference"/u);
  assert.match(page, /data-reference-table-row="Rust AVX2"/u);
  assert.match(page, /Production SLIDE remains unmeasured/u);
  assert.match(page, /Historic Galerina\/WASM evidence/u);
  assert.doesNotMatch(page, /<script|https?:\/\//iu);
});

test("historical chart uses per-workload WASM-zero rows and keeps SLIDE reference evidence non-production", () => {
  const model = buildSlideWasmHistoryModel(fixture());

  assert.equal(model.status, "REFERENCE_ONLY_NO_PRODUCTION_SLIDE");
  assert.deepEqual(model.rows.map((row) => row.product), ["Galerina/SLIDE", "Galerina/WASM"]);
  assert.deepEqual(model.rows.map((row) => row.productionObservations), [0, 2]);
  assert.deepEqual(model.rows.map((row) => row.referenceObservations), [1, 0]);
  assert.deepEqual(
    model.workloads.map((row) => [row.benchmark, row.wasmValue, row.unit, row.slideDeltaPct]),
    [["alpha", 90, "ops/s", null], ["beta", 80, "ops/s", null]],
  );
  assert.equal(model.sharedProductionWorkloads, 0);

  const page = buildSlideWasmHistoryHtml(model);
  assert.equal((page.match(/data-workload-row=/gu) ?? []).length, 2);
  assert.match(page, /alpha/u);
  assert.match(page, /WASM 90 ops\/s = 0/u);
  assert.match(page, /SLIDE not measured/u);
  assert.match(page, /Evidence coverage, not a speed comparison/u);
  assert.match(page, /WASM = 0 baseline/u);
  assert.match(page, /faster \+/u);
  assert.match(page, /slower −/u);
  assert.doesNotMatch(page, /<script|https?:\/\//iu);
  assert.doesNotMatch(page, /production (winner|ranked [0-9])|production performance ratio: [+-]?[0-9]/iu);
  assert.match(page, /results\/archive\/2026-08-02_galerina-wasm-before-slide\/results\.json/u);
  assert.match(page, new RegExp("d{64}"));
  assert.match(page, /2026-08-12T17:19:05\.632Z/u);
  assert.match(page, /Roboto/u);
});

test("a real aligned production SLIDE lane is counted separately from slideReference", () => {
  const input = fixture();
  input.current.push({
    benchmark: "alpha",
    metricClass: "cpu-throughput",
    units: { comparable: true, status: "PASS", unit: "ops/s" },
    results: { slide: { normThroughput: 120 } },
  });

  const model = buildSlideWasmHistoryModel(input);
  assert.equal(model.status, "COMPARABLE_PRODUCTION_HISTORY");
  assert.equal(model.rows[0].productionObservations, 1);
  assert.equal(model.rows[0].referenceObservations, 1);
  assert.equal(model.sharedProductionWorkloads, 1);
  assert.equal(model.workloads[0].slideDeltaPct, 100 / 3);
});

test("malformed provenance and disguised lane names refuse", () => {
  const malformed = fixture();
  malformed.sources.wasmResults.sha256 = "not-a-digest";
  assert.throws(() => buildSlideWasmHistoryModel(malformed), /SHA-256/u);

  const disguised = fixture();
  disguised.current[0].results["slide "] = { normThroughput: 100 };
  assert.throws(() => buildSlideWasmHistoryModel(disguised), /unexpected SLIDE-like lane/u);
});

test("publication verifies raw digests before atomically replacing the chart", () => {
  const root = mkdtempSync(join(tmpdir(), "slide-wasm-history-"));
  temporaryDirectories.push(root);
  const archiveDirectory = join(root, "archive", "2026-08-02_galerina-wasm-before-slide");
  const runDirectory = join(root, "runs", "2026-08-12T17-19-05-632Z");
  mkdirSync(archiveDirectory, { recursive: true });
  mkdirSync(runDirectory, { recursive: true });

  const { wasmArchive, current, metadata, archiveMeta } = fixture();
  const wasmRaw = `${JSON.stringify(wasmArchive, null, 2)}\n`;
  const currentRaw = `${JSON.stringify(current, null, 2)}\n`;
  const archiveMetaRaw = `${JSON.stringify(archiveMeta, null, 2)}\n`;
  metadata.resultSha256 = digest(currentRaw);
  metadata.wasmReference.archiveResultsSha256 = digest(wasmRaw);
  writeFileSync(join(archiveDirectory, "results.json"), wasmRaw);
  writeFileSync(join(archiveDirectory, "meta.json"), archiveMetaRaw);
  writeFileSync(join(runDirectory, "results.json"), currentRaw);
  const metadataRaw = `${JSON.stringify(metadata, null, 2)}\n`;
  writeFileSync(join(runDirectory, "metadata.json"), metadataRaw);
  writeFileSync(join(root, "benchmark-run-metadata-latest.json"), metadataRaw);

  const result = publishSlideWasmHistoryArtifact({ resultsDir: root });
  const published = readFileSync(result.outputPath, "utf8");
  assert.match(published, new RegExp(digest(wasmRaw)));
  assert.match(published, new RegExp(digest(currentRaw)));
  assert.match(published, new RegExp(digest(archiveMetaRaw)));

  writeFileSync(result.outputPath, "sentinel", "utf8");
  const badMetadata = { ...metadata, resultSha256: "0".repeat(64) };
  const badMetadataRaw = `${JSON.stringify(badMetadata, null, 2)}\n`;
  writeFileSync(join(runDirectory, "metadata.json"), badMetadataRaw);
  writeFileSync(join(root, "benchmark-run-metadata-latest.json"), badMetadataRaw);
  assert.throws(() => publishSlideWasmHistoryArtifact({ resultsDir: root }), /current result digest mismatch/u);
  assert.equal(readFileSync(result.outputPath, "utf8"), "sentinel");
});
