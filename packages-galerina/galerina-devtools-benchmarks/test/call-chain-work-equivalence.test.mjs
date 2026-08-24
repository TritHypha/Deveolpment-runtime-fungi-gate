import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { resolvePythonExecutable } from "../src/python-runtime.mjs";

const BENCH = new URL("../benchmarks/call-chain/", import.meta.url);
const EXPECTED_RESULT = 57984;
const EXPECTED_ITERATIONS = 50000;

function runJson(command, args) {
  const child = spawnSync(command, args, { cwd: BENCH, encoding: "utf8", timeout: 60000 });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  return JSON.parse(child.stdout);
}

function assertEquivalent(result, runtime) {
  assert.equal(result.runtime, runtime);
  assert.equal(result.result, EXPECTED_RESULT);
  assert.equal(result.iterations, EXPECTED_ITERATIONS);
  assert.equal(result.callsPerIteration, 7);
  assert.ok(result.iterationsPerSecond > 0);
}

test("Node control executes the exact call-chain workload", () => {
  assertEquivalent(runJson(process.execPath, ["node.mjs", "--iterations", "50000"]), "nodejs");
});

test("admitted Python control executes the exact call-chain workload", (context) => {
  const python = resolvePythonExecutable();
  if (python === undefined) return context.skip("An admitted Python runtime is not installed");
  assertEquivalent(runJson(python, ["python.py", "--iterations", "50000"]), "python");
});

test("Go control executes the exact call-chain workload", (context) => {
  const version = spawnSync("go", ["version"], { encoding: "utf8" });
  if (version.status !== 0) return context.skip("Go is not installed");
  assertEquivalent(runJson("go", ["run", "bench.go", "--iterations", "50000"]), "go");
});

test("Rust control executes the exact call-chain workload", async (context) => {
  const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  if (version.status !== 0) return context.skip("Rust is not installed");
  const temporary = await mkdtemp(join(tmpdir(), "galerina-call-chain-rust-"));
  try {
    const executable = join(temporary, process.platform === "win32" ? "bench.exe" : "bench");
    const compile = spawnSync("rustc", ["-O", "-o", executable, "bench.rs"], {
      cwd: BENCH,
      encoding: "utf8",
      timeout: 60000,
    });
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);
    assertEquivalent(runJson(executable, ["--iterations", "50000"]), "rust");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
