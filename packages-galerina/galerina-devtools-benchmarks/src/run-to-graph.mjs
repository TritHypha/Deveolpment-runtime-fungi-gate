import { spawnSync } from "node:child_process";
import { lstatSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { types } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESULTS_ROOT = join(PACKAGE_ROOT, "results");
const RECEIPT_PATH = join(RESULTS_ROOT, "benchmark-run-to-graph-latest.json");
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

function stage(id, args, timeoutMs, outputs = []) {
  return Object.freeze({
    id,
    command: "node",
    args: Object.freeze([...args]),
    shell: false,
    timeoutMs,
    outputs: Object.freeze([...outputs]),
  });
}

export const BENCHMARK_TO_GRAPH_STAGES = Object.freeze([
  stage("measure", ["--expose-gc", "src/runner.mjs"], 30 * 60_000, [
    "results/latest.json",
    "results/benchmark-measurement-latest.json",
  ]),
  stage("noise", ["src/noise-gate.mjs"], 2 * 60_000, [
    "results/noise-gate-latest.json",
  ]),
  stage("audit-vade", ["src/audit-slide-vade.mjs"], 60_000),
  stage("audit-truth", ["--expose-gc", "src/audit.mjs"], 2 * 60_000),
  stage("render", ["src/build-chart.mjs"], 2 * 60_000, [
    "report.md",
    "results/benchmark-report-latest.md",
    "results/benchmark-report-latest.json",
    "results/benchmark-chart-latest.html",
    "results/benchmark-chart-standalone.html",
    "results/benchmark-slide-zero-latest.html",
    "results/benchmark-slide-zero-table-latest.html",
    "results/benchmark-run-metadata-latest.json",
  ]),
  stage("wasm-history", ["src/build-slide-wasm-history.mjs"], 60_000, [
    "results/benchmark-slide-vs-wasm-history-latest.html",
  ]),
  stage("history", ["src/history.mjs"], 60_000, [
    "results/history/diff-latest.json",
  ]),
  stage("guard", ["src/bench-guard.mjs"], 60_000),
]);

function refused(stageId, cause) {
  throw new Error(`BENCHMARK_RUN_TO_GRAPH_REFUSED:${stageId.toUpperCase().replaceAll("-", "_")}:${cause}`);
}

function exactAdapters(adapters) {
  if (
    adapters === null
    || typeof adapters !== "object"
    || Array.isArray(adapters)
    || types.isProxy(adapters)
    || Object.getPrototypeOf(adapters) !== Object.prototype
  ) refused("adapters", "INVALID");
  const allowed = new Set(["spawn", "inspectOutput", "publishReceipt", "now"]);
  for (const key of Object.keys(adapters)) {
    if (!allowed.has(key)) refused("adapters", "UNKNOWN_KEY");
  }
  for (const key of allowed) {
    const descriptor = Object.getOwnPropertyDescriptor(adapters, key);
    if (descriptor === undefined) refused("adapters", `MISSING_${key.toUpperCase()}`);
    if (!("value" in descriptor)) refused("adapters", "ACCESSOR");
    if (typeof descriptor.value !== "function") refused("adapters", `INVALID_${key.toUpperCase()}`);
  }
  return adapters;
}

function immutableReceipt(startedAt, completedAt, completedStages) {
  return Object.freeze({
    schemaVersion: 1,
    status: "PASS",
    authorityReleased: false,
    startedAt,
    completedAt,
    stages: Object.freeze(completedStages.map((completed) => Object.freeze({
      id: completed.id,
      status: "PASS",
      command: completed.command,
      args: Object.freeze([...completed.args]),
      outputs: Object.freeze([...completed.outputs]),
    }))),
  });
}

export function runBenchmarkToGraph(inputAdapters) {
  const adapters = exactAdapters(inputAdapters);
  const startedAt = adapters.now();
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) refused("clock", "START_INVALID");
  const completed = [];
  for (const current of BENCHMARK_TO_GRAPH_STAGES) {
    const result = adapters.spawn(current);
    if (result?.error?.code === "ETIMEDOUT") refused(current.id, "TIMEOUT");
    if (result?.error !== undefined) refused(current.id, "SPAWN_ERROR");
    if (result?.signal !== null && result?.signal !== undefined) {
      refused(current.id, `SIGNAL_${String(result.signal)}`);
    }
    if (result?.status !== 0) refused(current.id, `EXIT_${String(result?.status)}`);
    for (const output of current.outputs) {
      const inspected = adapters.inspectOutput(output);
      if (inspected?.regular !== true) refused(current.id, "OUTPUT_NOT_REGULAR");
      if (!Number.isSafeInteger(inspected.size) || inspected.size <= 0) refused(current.id, "OUTPUT_EMPTY");
      if (!Number.isFinite(inspected.mtimeMs) || inspected.mtimeMs < startedMs) {
        refused(current.id, "OUTPUT_STALE");
      }
    }
    completed.push(current);
  }
  const receipt = immutableReceipt(startedAt, adapters.now(), completed);
  adapters.publishReceipt(receipt);
  return receipt;
}

function realOutput(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) refused("output", "PATH_INVALID");
  const absolute = resolve(PACKAGE_ROOT, relativePath);
  const rootPrefix = `${resolve(PACKAGE_ROOT)}${sep}`;
  if (!absolute.startsWith(rootPrefix)) refused("output", "PATH_OUTSIDE_PACKAGE");
  const stat = lstatSync(absolute, { throwIfNoEntry: false });
  return Object.freeze({
    regular: stat?.isFile() === true,
    size: stat?.size ?? 0,
    mtimeMs: stat?.mtimeMs ?? Number.NEGATIVE_INFINITY,
  });
}

function atomicReceipt(receipt) {
  const temporary = `${RECEIPT_PATH}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    renameSync(temporary, RECEIPT_PATH);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function realSpawn(current) {
  const result = spawnSync(process.execPath, current.args, {
    cwd: PACKAGE_ROOT,
    shell: false,
    encoding: "utf8",
    timeout: current.timeoutMs,
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function realAdapters() {
  return {
    spawn: realSpawn,
    inspectOutput: realOutput,
    publishReceipt: atomicReceipt,
    now: () => new Date().toISOString(),
  };
}

function selfTest() {
  const calls = [];
  let published = false;
  const receipt = runBenchmarkToGraph({
    spawn: (current) => {
      calls.push(current.id);
      return { status: 0, signal: null, stdout: "", stderr: "" };
    },
    inspectOutput: () => ({ regular: true, size: 1, mtimeMs: Date.parse("2000-01-01T00:00:00.500Z") }),
    publishReceipt: () => { published = true; },
    now: (() => {
      const values = ["2000-01-01T00:00:00.000Z", "2000-01-01T00:00:01.000Z"];
      return () => values.shift();
    })(),
  });
  if (calls.length !== BENCHMARK_TO_GRAPH_STAGES.length || !published || receipt.status !== "PASS") {
    refused("self_test", "INVARIANT");
  }
  process.stdout.write(`${JSON.stringify({ status: "PASS", stages: calls.length, spawnedRealBenchmark: false })}\n`);
}

const isMain = process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === "--self-test") {
      selfTest();
    } else if (args.length === 0) {
      const receipt = runBenchmarkToGraph(realAdapters());
      process.stdout.write(`${JSON.stringify({ status: receipt.status, receipt: "results/benchmark-run-to-graph-latest.json" })}\n`);
    } else {
      refused("cli", "ARGUMENTS_INVALID");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const failureId = message.startsWith("BENCHMARK_RUN_TO_GRAPH_REFUSED:")
      ? message
      : "BENCHMARK_RUN_TO_GRAPH_REFUSED:CLI:UNEXPECTED";
    process.stderr.write(`${JSON.stringify({ status: "REFUSED", failureId })}\n`);
    process.exitCode = 1;
  }
}
