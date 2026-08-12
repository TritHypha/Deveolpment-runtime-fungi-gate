import assert from "node:assert/strict";
import test from "node:test";

import { runScalarSlideReferenceBenchmark } from "../src/slide-reference-runner.mjs";

const EXPECTED = Object.freeze({
  "call-chain": Object.freeze({ result: 57984, workCount: 50000, unit: "chains/s" }),
  "compute-mix": Object.freeze({ result: -11971, workCount: 50000, unit: "mix-ops/s" }),
  "collection-pipeline": Object.freeze({ result: 49990000, workCount: 10000, unit: "elements/s" }),
});

for (const [benchmark, expected] of Object.entries(EXPECTED)) {
  test(`${benchmark} executes through the exact non-authorizing SLIDE reference lane`, async () => {
    const result = await runScalarSlideReferenceBenchmark(benchmark, {
      warmupRuns: 1,
      sampleRuns: 3,
    });

    assert.equal(result.runtime, "galerina-slide-reference");
    assert.equal(result.benchmarkId, benchmark);
    assert.equal(result.result, expected.result);
    assert.equal(result.workCount, expected.workCount);
    assert.equal(result.throughputUnit, expected.unit);
    assert.equal(result.samples.length, 3);
    assert.ok(result.elapsedMs > 0);
    assert.ok(result.normThroughput > 0);
    assert.match(result.sourceDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.match(result.bundleDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(result.referenceOnly, true);
    assert.equal(result.authorityReleased, false);
    assert.equal(result.k3, 0);
    assert.equal(result.registrySetId, "slide.registry.executable-gir.v2c-benchmark-counted-control.v1");
  });
}

test("the scalar reference runner refuses unregistered workloads and invalid sampling", async () => {
  await assert.rejects(
    runScalarSlideReferenceBenchmark("record-allocation", { warmupRuns: 1, sampleRuns: 3 }),
    /REFUSED/u,
  );
  await assert.rejects(
    runScalarSlideReferenceBenchmark("call-chain", { warmupRuns: 0, sampleRuns: 3 }),
    /REFUSED/u,
  );
  await assert.rejects(
    runScalarSlideReferenceBenchmark("call-chain", { warmupRuns: 1, sampleRuns: 2 }),
    /REFUSED/u,
  );
});
