import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const HERE = dirname(fileURLToPath(import.meta.url));
const NATIVE_MANIFEST = join(HERE, "..", "native", "vok-authority", "Cargo.toml");

test("native VOK benchmark emits bounded versioned three-lane evidence", () => {
  const run = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--release",
      "--locked",
      "--offline",
      "--manifest-path",
      NATIVE_MANIFEST,
      "--bin",
      "vok-benchmark",
      "--",
      "--samples",
      "3",
      "--iterations",
      "16",
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024, windowsHide: true },
  );
  assert.equal(run.error, undefined, run.error?.message);
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.trim().split(/\r?\n/u);
  assert.equal(lines[0], "VOKBENCHV1,samples=3,iterations=16,unit=ns/op");
  assert.equal(lines[1], "lane,min,p25,median,p75,max");
  assert.deepEqual(
    lines.slice(2).map((line) => line.split(",", 1)[0]),
    ["null_owned_value", "checked_btree", "vok_affine_cycle"],
  );
  for (const line of lines.slice(2)) {
    const fields = line.split(",");
    assert.equal(fields.length, 6);
    const values = fields.slice(1).map(Number);
    assert.ok(values.every((value) => Number.isFinite(value) && value >= 0));
    assert.ok(values.every((value, index) => index === 0 || value >= values[index - 1]));
  }
});
