import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const BENCHMARK = fileURLToPath(new URL("../benchmarks/framework-pipeline/node.mjs", import.meta.url));

test("framework-pipeline supplies an admitted identity verdict and reaches the handler", () => {
  const result = spawnSync(
    process.execPath,
    ["--expose-gc", BENCHMARK, "--iterations", "10"],
    { encoding: "utf8", timeout: 30_000 },
  );

  assert.equal(result.status, 0, `benchmark refused:\n${result.stdout}\n${result.stderr}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.runtime, "nodejs");
  assert.equal(output.handledOk, 10);
  assert.equal(output.iterations, 10);
  assert.ok(output.operationsPerSecond > 0);
});
