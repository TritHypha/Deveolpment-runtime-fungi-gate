import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = join(REPO_ROOT, "scripts", "lint-fungi.mjs");

function withFixture(prefix, body) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  try {
    return body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function write(root, relativePath, contents) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function run(root) {
  return spawnSync(
    process.execPath,
    [TOOL, "--json", "--no-default-whitelist", "packages-galerina"],
    { cwd: root, encoding: "utf8", shell: false },
  );
}

test("lint-fungi refuses an invalid flow and accepts a documented, contracted control", () => {
  withFixture("galerina-fungi-lint-gate-", (root) => {
    const sourcePath = "packages-galerina/probe/src/index.fungi";
    write(root, sourcePath, "flow foo() -> Bool {\n\treturn true  \n");
    const planted = run(root);
    assert.notEqual(planted.status, 0, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.ok(plantedReport.violations >= 4, planted.stdout);
    assert.equal(plantedReport.byCode["FUNGI-SYNTAX-BRACE"], 1);
    assert.equal(plantedReport.byCode["FUNGI-LINT-CONTRACT"], 1);

    write(root, sourcePath, [
      "// Return a deterministic fixture verdict.",
      "pure flow fixtureVerdict() -> Bool",
      "contract {",
      '  intent { "Return the deterministic fixture verdict." }',
      "}",
      "{",
      "  return true",
      "}",
      "",
    ].join("\n"));
    const control = run(root);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    const controlReport = JSON.parse(control.stdout);
    assert.equal(controlReport.scanned, 1);
    assert.equal(controlReport.violations, 0, control.stdout);
  });
});
