import assert from "node:assert/strict";
import test from "node:test";
import {
  benchmarkProcessArgs,
  publicationOutputName,
  runSlideVadeObservation,
  slideVadeInputFromArgs,
} from "../src/runner.mjs";

test("call-chain control processes receive the exact manifest work count", () => {
  assert.deepEqual(benchmarkProcessArgs({ id: "call-chain", exactIterations: 50000 }), ["--iterations", "50000"]);
  assert.deepEqual(benchmarkProcessArgs({ id: "compute-mix" }), []);
  assert.throws(
    () => benchmarkProcessArgs({ id: "call-chain", exactIterations: 50001 }),
    /REFUSED/u,
  );
});

test("only an unfiltered full run can replace publication latest.json", () => {
  assert.equal(publicationOutputName(null), "latest.json");
  assert.equal(publicationOutputName("framework-pipeline"), "framework-pipeline-latest.json");
  assert.equal(publicationOutputName("diagnostic"), null);
  assert.throws(() => publicationOutputName("../outside"), /REFUSED/);
  assert.throws(() => publicationOutputName("unknown-benchmark"), /REFUSED/);
});

test("VADE observation remains a non-comparative child outside publication results", async () => {
  const observation = await runSlideVadeObservation({ observational: false });
  assert.equal(observation.child, "slide-vade-evidence");
  assert.equal(observation.evidenceClass, "NON_COMPARATIVE_COMPONENT_EVIDENCE");
  assert.equal(observation.comparative, false);
  assert.equal(observation.workEquivalenceCertificate, false);
  assert.equal(observation.verdict, 1);
  assert.equal(observation.authorityReleased, false);
  assert.equal(Object.isFrozen(observation), true);
});

test("VADE observation preserves strict and observational missing-evidence states", async () => {
  const missing = "definitely-not-a-slide-vade-receipt.json";
  assert.equal((await runSlideVadeObservation({ inputPath: missing })).verdict, -1);
  assert.equal((await runSlideVadeObservation({ inputPath: missing, observational: true })).verdict, 0);
});

test("VADE observation refuses proxy options without invoking their traps", async () => {
  let trapped = false;
  const proxy = new Proxy({}, {
    get() {
      trapped = true;
      throw new Error("must not execute");
    },
  });
  const observation = await runSlideVadeObservation(proxy);
  assert.equal(observation.verdict, -1);
  assert.equal(trapped, false);
});

test("VADE input argv parsing is closed and rejects duplicates or missing values", () => {
  assert.equal(slideVadeInputFromArgs([]), null);
  assert.equal(slideVadeInputFromArgs(["--slide-vade-input", "receipt.json"]), "receipt.json");
  assert.throws(() => slideVadeInputFromArgs(["--slide-vade-input"]), /REFUSED/u);
  assert.throws(
    () => slideVadeInputFromArgs(["--slide-vade-input", "one", "--slide-vade-input", "two"]),
    /REFUSED/u,
  );
});
