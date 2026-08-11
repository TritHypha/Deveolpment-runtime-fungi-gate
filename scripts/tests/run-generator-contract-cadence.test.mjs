import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RUNNER = fileURLToPath(new URL("../run-generator-contract-cadence.mjs", import.meta.url));
const roots = [];
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "generator-cadence-"));
  roots.push(root);
  const path = join(root, "scripts", "audit-generator-contract.mjs");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync("observed.txt", process.argv.slice(2).join(" "));',
  ].join("\n"));
  return root;
}

function run(root, cadence) {
  return spawnSync(process.execPath, [RUNNER, "--root", root], {
    encoding: "utf8",
    env: { ...process.env, GALERINA_ASSURANCE_CADENCE: cadence },
  });
}

test("closed cadence maps to the legacy generator-contract tier", () => {
  const normalRoot = fixture();
  assert.equal(run(normalRoot, "normal").status, 0);
  assert.equal(readFileSync(join(normalRoot, "observed.txt"), "utf8"), "--tier phase-close");

  const exhaustiveRoot = fixture();
  assert.equal(run(exhaustiveRoot, "exhaustive").status, 0);
  assert.equal(readFileSync(join(exhaustiveRoot, "observed.txt"), "utf8"), "--tier exhaustive");
});

test("missing, unknown or duplicate arguments refuse", () => {
  assert.equal(run(fixture(), "unknown").status, 1);
  const root = fixture();
  const duplicate = spawnSync(process.execPath, [RUNNER, "--root", root, "--root", root], {
    env: { ...process.env, GALERINA_ASSURANCE_CADENCE: "normal" },
  });
  assert.equal(duplicate.status, 1);
});
