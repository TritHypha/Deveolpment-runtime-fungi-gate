import assert from "node:assert/strict";
import test from "node:test";
import { publicationOutputName } from "../src/runner.mjs";

test("only an unfiltered full run can replace publication latest.json", () => {
  assert.equal(publicationOutputName(null), "latest.json");
  assert.equal(publicationOutputName("framework-pipeline"), "framework-pipeline-latest.json");
  assert.equal(publicationOutputName("diagnostic"), null);
  assert.throws(() => publicationOutputName("../outside"), /REFUSED/);
  assert.throws(() => publicationOutputName("unknown-benchmark"), /REFUSED/);
});
