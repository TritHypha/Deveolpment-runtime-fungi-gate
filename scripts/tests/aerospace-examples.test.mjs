import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("the governed e2e aerospace example builds through the real CLI", () => {
  const result = spawnSync(
    process.execPath,
    ["galerina.mjs", "build", "examples/aerospace/updateFlightPath.fungi"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  assert.equal(
    result.status,
    0,
    `real aerospace build refused:\n${result.stdout}\n${result.stderr}`,
  );
});
