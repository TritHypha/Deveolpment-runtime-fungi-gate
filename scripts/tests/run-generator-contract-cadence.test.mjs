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
    'writeFileSync("observed.txt", JSON.stringify({',
    '  args: process.argv.slice(2),',
    '  kb: process.env.GALERINA_KB_DIR ?? null,',
    '  slide: process.env.GALERINA_SLIDE_DIR ?? null,',
    '}));',
  ].join("\n"));
  return root;
}

function run(root, cadence, environment = {}) {
  return spawnSync(process.execPath, [RUNNER, "--root", root], {
    encoding: "utf8",
    env: { ...process.env, GALERINA_ASSURANCE_CADENCE: cadence, ...environment },
  });
}

test("closed cadence maps to the legacy generator-contract tier", () => {
  const normalRoot = fixture();
  assert.equal(run(normalRoot, "normal").status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(normalRoot, "observed.txt"), "utf8")).args, ["--tier", "phase-close"]);

  const exhaustiveRoot = fixture();
  assert.equal(run(exhaustiveRoot, "exhaustive").status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(exhaustiveRoot, "observed.txt"), "utf8")).args, ["--tier", "exhaustive"]);
});

test("explicit absolute KB and SLIDE roots reach generator children", () => {
  const root = fixture();
  const kb = join(root, "kb");
  const slide = join(root, "slide");
  mkdirSync(kb);
  mkdirSync(slide);

  assert.equal(run(root, "normal", {
    GALERINA_KB_DIR: kb,
    GALERINA_SLIDE_DIR: slide,
  }).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "observed.txt"), "utf8")), {
    args: ["--tier", "phase-close"],
    kb,
    slide,
  });
});

test("relative external repository roots refuse before the generator child runs", () => {
  const root = fixture();
  const result = run(root, "normal", { GALERINA_KB_DIR: "relative-kb" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GALERINA_KB_DIR requires an absolute path/u);
});

test("missing, unknown or duplicate arguments refuse", () => {
  assert.equal(run(fixture(), "unknown").status, 1);
  const root = fixture();
  const duplicate = spawnSync(process.execPath, [RUNNER, "--root", root, "--root", root], {
    env: { ...process.env, GALERINA_ASSURANCE_CADENCE: "normal" },
  });
  assert.equal(duplicate.status, 1);
});
