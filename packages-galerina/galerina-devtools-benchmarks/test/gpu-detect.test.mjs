import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";

const GPU_DETECT = fileURLToPath(new URL("../src/gpu-detect.mjs", import.meta.url));
const BENCHMARK_AUDIT = fileURLToPath(new URL("../src/audit-benchmark-integrity.mjs", import.meta.url));
const TEMP = mkdtempSync(join(tmpdir(), "galerina-gpu-detect-test-"));

after(() => rmSync(TEMP, { recursive: true, force: true }));

function minimalEnvironment() {
  const env = { PATH: process.env.PATH ?? "" };
  for (const name of ["SystemRoot", "WINDIR", "ComSpec", "PATHEXT", "TEMP", "TMP"]) {
    const value = process.env[name];
    if (typeof value === "string" && value.length > 0) env[name] = value;
  }
  return env;
}

test("GPU probes execute argv directly without a shell-injection surface", () => {
  const result = spawnSync(
    process.execPath,
    ["--throw-deprecation", GPU_DETECT],
    { cwd: TEMP, encoding: "utf8", env: minimalEnvironment(), timeout: 45_000 },
  );

  assert.equal(result.status, 0, `GPU probe emitted a fatal deprecation:\n${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.equal(typeof report.device?.present, "boolean");
  assert.equal(typeof report.toolchains?.anyRunnable, "boolean");
  assert.equal(existsSync(join(TEMP, "Python")), false);

  const publication = spawnSync(
    process.execPath,
    [BENCHMARK_AUDIT, "--stale-only"],
    { cwd: TEMP, encoding: "utf8", env: minimalEnvironment(), timeout: 45_000 },
  );
  assert.equal(
    publication.status,
    0,
    `benchmark publication changed under the minimal environment:\n${publication.stdout}\n${publication.stderr}`,
  );
  assert.equal(existsSync(join(TEMP, "Python")), false);
});
