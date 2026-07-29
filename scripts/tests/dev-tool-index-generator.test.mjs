// dev-tool-index-generator.test.mjs — proves isolated root selection and
// non-mutating generated-artifact drift checks for the dev-tool index.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/dev-tool-index.mjs; governance/tooling-policy.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/dev-tool-index.mjs");

/**
 * Write one fixture file, creating its parent directories.
 *
 * @param {string} root fixture root
 * @param {string} relativePath fixture-relative path
 * @param {string} content exact content
 */
function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Create a minimal, internally complete tooling workspace.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "dev-tool-index-generator-"));
  write(root, "galerina.workspace.json", JSON.stringify({ packages: [] }));
  write(root, "version.json", JSON.stringify({ testCountByPackage: {} }));
  write(
    root,
    "governance/tooling-policy.json",
    JSON.stringify({
      schemaVersion: 1,
      packageNoTest: {},
      toolExceptions: {
        "audit-fixture.mjs": {
          class: "fixture",
          reason: "The isolated fixture has no phase-close cadence.",
          owner: "fixture",
          reviewWhen: "The fixture gains a cadence runner.",
        },
      },
      generators: {},
    }),
  );
  write(
    root,
    "scripts/audit-fixture.mjs",
    "// audit-fixture.mjs — isolated fixture audit with enough header detail.\nprocess.exit(0);\n",
  );
  return root;
}

/**
 * Run the real generator against the selected fixture root.
 *
 * @param {string} root fixture root
 * @param {readonly string[]} args additional arguments
 */
function run(root, args = []) {
  return spawnSync(
    process.execPath,
    [SCRIPT, "--root", root, ...args],
    {
      encoding: "utf8",
      env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
    },
  );
}

test("dev-tool-index --root inventories only the selected root", () => {
  const root = fixture();
  try {
    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    const report = JSON.parse(readFileSync(
      join(root, "build", "dev-tool-index", "index.json"),
      "utf8",
    ));
    assert.equal(report.totals.devTools, 1);
    assert.deepEqual(report.tools.map((tool) => tool.name), ["audit-fixture.mjs"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dev-tool-index --generator-check refuses drift without writing", () => {
  const root = fixture();
  const markdown = join(root, "build", "dev-tool-index", "INDEX.md");
  try {
    const missing = run(root, ["--generator-check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(markdown), false);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(run(root, ["--generator-check"]).status, 0);

    writeFileSync(markdown, "tampered\n");
    const drifted = run(root, ["--generator-check"]);
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(markdown, "utf8"), "tampered\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
