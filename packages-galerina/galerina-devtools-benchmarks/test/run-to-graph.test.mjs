import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { BENCHMARK_TO_GRAPH_STAGES, runBenchmarkToGraph } from "../src/run-to-graph.mjs";

const EXPECTED_IDS = Object.freeze([
  "measure",
  "noise",
  "audit-vade",
  "audit-truth",
  "render",
  "wasm-history",
  "history",
  "guard",
]);

const PACKAGE = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function harness(overrides = {}) {
  const calls = [];
  const published = [];
  const adapters = {
    spawn(stage) {
      calls.push(stage);
      return { status: 0, signal: null, error: undefined, stdout: `${stage.id}:ok`, stderr: "" };
    },
    inspectOutput() {
      return { regular: true, size: 1, mtimeMs: Date.parse("2026-08-13T00:00:01.000Z") };
    },
    publishReceipt(receipt) {
      published.push(receipt);
    },
    now: (() => {
      const values = ["2026-08-13T00:00:00.000Z", "2026-08-13T00:10:00.000Z"];
      return () => values.shift();
    })(),
    ...overrides,
  };
  return { adapters, calls, published };
}

test("the full benchmark automation has one closed direct-argv stage order", () => {
  assert.deepEqual(BENCHMARK_TO_GRAPH_STAGES.map((stage) => stage.id), EXPECTED_IDS);
  const state = harness();
  const receipt = runBenchmarkToGraph(state.adapters);

  assert.deepEqual(state.calls.map((stage) => stage.id), EXPECTED_IDS);
  for (const stage of state.calls) {
    assert.equal(stage.command, "node");
    assert.equal(stage.shell, false);
    assert.equal(stage.args.every((value) => typeof value === "string" && !value.includes("&&")), true);
  }
  assert.deepEqual(Object.keys(receipt), [
    "schemaVersion",
    "status",
    "authorityReleased",
    "startedAt",
    "completedAt",
    "stages",
  ]);
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.authorityReleased, false);
  assert.equal(receipt.stages.length, EXPECTED_IDS.length);
  assert.equal(receipt.stages.every((stage) => stage.status === "PASS"), true);
  assert.equal(JSON.stringify(receipt).includes("C:\\"), false);
  assert.equal(state.published.length, 1);
});

test("the standard bench command delegates to the full publication pipeline", () => {
  assert.equal(PACKAGE.scripts.bench, "npm run benchmark:publish");
  assert.equal(PACKAGE.scripts["benchmark:publish"], "node src/run-to-graph.mjs");

  const render = BENCHMARK_TO_GRAPH_STAGES.find((stage) => stage.id === "render");
  assert.ok(render);
  assert.equal(render.outputs.includes("results/benchmark-chart-latest.html"), true);
  assert.equal(render.outputs.includes("results/benchmark-chart-standalone.html"), true);
});

test("the first nonzero child stops every later stage and publishes no receipt", () => {
  const state = harness({
    spawn(stage) {
      state.calls.push(stage);
      return { status: stage.id === "audit-truth" ? 3 : 0, signal: null, stdout: "", stderr: "refused" };
    },
  });

  assert.throws(
    () => runBenchmarkToGraph(state.adapters),
    /BENCHMARK_RUN_TO_GRAPH_REFUSED:AUDIT_TRUTH:EXIT_3/u,
  );
  assert.deepEqual(state.calls.map((stage) => stage.id), EXPECTED_IDS.slice(0, 4));
  assert.equal(state.published.length, 0);
});

test("signals, launch errors and missing or empty owner outputs refuse", () => {
  for (const [name, spawn, expected] of [
    ["signal", () => ({ status: null, signal: "SIGTERM", stdout: "", stderr: "" }), /MEASURE:SIGNAL_SIGTERM/u],
    ["launch", () => ({ status: null, signal: null, error: new Error("timeout"), stdout: "", stderr: "" }), /MEASURE:SPAWN_ERROR/u],
    ["timeout", () => ({ status: null, signal: "SIGTERM", error: Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }), stdout: "", stderr: "" }), /MEASURE:TIMEOUT/u],
  ]) {
    const state = harness({ spawn });
    assert.throws(() => runBenchmarkToGraph(state.adapters), expected, name);
    assert.equal(state.published.length, 0);
  }

  for (const [inspection, expected] of [
    [{ regular: false, size: 20, mtimeMs: Date.parse("2026-08-13T00:00:01.000Z") }, /MEASURE:OUTPUT_NOT_REGULAR/u],
    [{ regular: true, size: 0, mtimeMs: Date.parse("2026-08-13T00:00:01.000Z") }, /MEASURE:OUTPUT_EMPTY/u],
    [{ regular: true, size: 20, mtimeMs: Date.parse("2026-08-12T23:59:00.000Z") }, /MEASURE:OUTPUT_STALE/u],
  ]) {
    const state = harness({ inspectOutput: () => inspection });
    assert.throws(() => runBenchmarkToGraph(state.adapters), expected);
    assert.equal(state.calls.length, 1);
    assert.equal(state.published.length, 0);
  }
});

test("adapter accessors refuse without executing", () => {
  let invoked = false;
  const adapters = harness().adapters;
  Object.defineProperty(adapters, "spawn", {
    enumerable: true,
    get() {
      invoked = true;
      return () => ({ status: 0 });
    },
  });
  assert.throws(() => runBenchmarkToGraph(adapters), /ADAPTERS:ACCESSOR/u);
  assert.equal(invoked, false);
});

test("the public runner accepts no caller-selected scripts, paths or subsets", () => {
  const state = harness();
  assert.throws(
    () => runBenchmarkToGraph({ ...state.adapters, script: "other.mjs" }),
    /BENCHMARK_RUN_TO_GRAPH_REFUSED:ADAPTERS:UNKNOWN_KEY/u,
  );
  assert.equal(state.calls.length, 0);
});

test("the CLI refuses arguments without exposing a stack or local path", () => {
  const child = spawnSync(process.execPath, ["src/run-to-graph.mjs", "--quick"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    shell: false,
  });
  assert.equal(child.status, 1);
  const refusal = JSON.parse(child.stderr);
  assert.deepEqual(refusal, {
    status: "REFUSED",
    failureId: "BENCHMARK_RUN_TO_GRAPH_REFUSED:CLI:ARGUMENTS_INVALID",
  });
  assert.equal(child.stderr.includes("at "), false);
  assert.equal(child.stderr.includes("C:\\"), false);
});
