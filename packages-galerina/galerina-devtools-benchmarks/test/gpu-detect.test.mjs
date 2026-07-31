import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const GPU_DETECT = fileURLToPath(new URL("../src/gpu-detect.mjs", import.meta.url));

test("GPU probes execute argv directly without a shell-injection surface", () => {
  const result = spawnSync(
    process.execPath,
    ["--throw-deprecation", GPU_DETECT],
    { encoding: "utf8", timeout: 45_000 },
  );

  assert.equal(result.status, 0, `GPU probe emitted a fatal deprecation:\n${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.equal(typeof report.device?.present, "boolean");
  assert.equal(typeof report.toolchains?.anyRunnable, "boolean");
});
