import assert from "node:assert/strict";
import test from "node:test";

import { runSlideReferenceBenchmark } from "../benchmarks/call-chain/bench-slide-reference.mjs";

test("call-chain SLIDE reference executes the exact admitted 50000-chain workload", async () => {
  const result = await runSlideReferenceBenchmark({ warmupRuns: 1, sampleRuns: 3 });

  assert.equal(result.runtime, "galerina-slide-reference");
  assert.equal(result.benchmark, "call-chain-v1");
  assert.equal(result.result, 57984);
  assert.equal(result.iterations, 50000);
  assert.equal(result.callsPerIteration, 7);
  assert.equal(result.samples.length, 3);
  assert.ok(result.elapsedMs > 0);
  assert.ok(result.iterationsPerSecond > 0);
  assert.equal(result.referenceOnly, true);
  assert.equal(result.authorityReleased, false);
  assert.equal(result.k3, 0);
  assert.equal(result.registrySetId, "slide.registry.executable-gir.v2c-benchmark-counted-control.v1");
  assert.equal(result.registrySetDigest, "56a815aea2264b840892acca1f1ddc5e27bac792d2feed40e4c6b99d9a16c266");
});

test("call-chain SLIDE reference refuses invalid measurement counts", async () => {
  await assert.rejects(
    runSlideReferenceBenchmark({ warmupRuns: 0, sampleRuns: 3 }),
    /REFUSED/u,
  );
  await assert.rejects(
    runSlideReferenceBenchmark({ warmupRuns: 1, sampleRuns: 2 }),
    /REFUSED/u,
  );
});
