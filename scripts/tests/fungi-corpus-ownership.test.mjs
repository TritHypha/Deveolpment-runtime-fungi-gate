// fungi-corpus-ownership.test.mjs — regression contract for explicit negative
// fixture ownership and the zero-growth implicit failure baseline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const AUDIT = resolve("scripts/audit-fungi-corpus-check.mjs");

test("fungi corpus audit proves all fail-closed ownership branches", () => {
  const result = spawnSync(process.execPath, [AUDIT, "--self-test"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = `${result.stdout}\n${result.stderr}`;
  for (const proof of [
    "implicit baseline growth is refused",
    "orphan diagnostic sidecar is refused",
    "stale exact diagnostic ownership is refused",
    "positive source diagnostics are refused",
  ]) {
    assert.match(output, new RegExp(proof));
  }
});
