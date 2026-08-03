import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCHMARK = join(HERE, "..", "benchmarks", "verified-native-operation");
const TEMP = mkdtempSync(join(tmpdir(), "galerina-verified-native-controls-"));

after(() => rmSync(TEMP, { recursive: true, force: true }));

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || `${command} failed`);
  return JSON.parse(result.stdout.trim());
}

function assertControl(result, runtime) {
  assert.equal(result.runtime, runtime);
  assert.equal(result.iterations, 1_000_000);
  assert.equal(result.result, 999_999);
  assert.equal(result.unit, "element-reads/s");
  assert.equal(result.samplesNs.length, 9);
  assert.equal(result.samplesNs.every((value) => Number.isSafeInteger(value) && value > 0), true);
  assert.equal(Number.isSafeInteger(result.medianNs) && result.medianNs > 0, true);
  assert.equal(Number.isFinite(result.operationsPerSecond) && result.operationsPerSecond > 0, true);
  assert.equal(typeof result.antiElision, "string");
  assert.notEqual(result.antiElision.length, 0);
}

function available(command) {
  const probe = spawnSync(command, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  return probe.status === 0;
}

test("Node.js traverses the complete one-million-value control", () => {
  assertControl(run(process.execPath, [join(BENCHMARK, "node.mjs")]), "nodejs");
});

const python = available("python3") ? "python3" : available("python") ? "python" : null;
test("Python traverses the complete one-million-value control", { skip: python === null }, () => {
  assertControl(run(python, [join(BENCHMARK, "python.py")]), "python");
});

test("optimized Rust retains every one-million-value read", { skip: !available("rustc") }, () => {
  const output = join(TEMP, process.platform === "win32" ? "verified-native.exe" : "verified-native");
  const compiled = spawnSync(
    "rustc",
    ["-O", join(BENCHMARK, "bench.rs"), "-o", output],
    { encoding: "utf8", timeout: 120_000, windowsHide: true },
  );
  assert.equal(compiled.status, 0, compiled.stderr || "rustc failed");
  assertControl(run(output, []), "rust");
});

test("the wrapper exposes both permission variants without production authority", async () => {
  const publication = await import("../evidence/slide-verified-native-operation-reference.json", {
    with: { type: "json" },
  });
  const { runSlideReferenceBenchmark } = await import(
    "../benchmarks/verified-native-operation/bench-slide-reference.mjs"
  );
  const host = {
    platform: publication.default.provenance.platform,
    release: publication.default.provenance.release,
    architecture: publication.default.provenance.architecture,
    cpu: publication.default.provenance.cpu,
    node: publication.default.provenance.node,
  };
  const result = await runSlideReferenceBenchmark(host);
  assert.equal(result.verdict, 1);
  assertControl(result.checkedReference, "checked-reference-no-permission");
  assertControl(result.slideReference, "slide-reference-permission-present");
  assert.equal(result.checkedReference.referenceOnly, true);
  assert.equal(result.slideReference.referenceOnly, true);
  assert.equal(result.authorityReleased, false);
});
