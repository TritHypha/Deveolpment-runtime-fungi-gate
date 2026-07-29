// ts-retirement-generator.test.mjs — proves root-isolated tracked-corpus
// discovery, deterministic retirement output, and non-mutating drift refusal.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/ts-retirement-graph.mjs; scripts/lib/find-files.mjs.
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

const SCRIPT = resolve("scripts/ts-retirement-graph.mjs");

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
 * Run one shell-free command in the fixture.
 */
function command(root, executable, args) {
  return spawnSync(executable, args, { cwd: root, encoding: "utf8" });
}

/**
 * Create two tracked TypeScript files, one with an exact same-package Fungi
 * twin, so the expected retirement partition is hand-derived.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ts-retirement-generator-"));
  write(
    root,
    "packages-galerina/galerina-example/src/secret-gate.ts",
    "export const gate = true;\n",
  );
  write(
    root,
    "packages-galerina/galerina-example/src/secret-gate.fungi",
    "pure flow gate() -> Bool { return true }\n",
  );
  write(
    root,
    "packages-galerina/galerina-core-compiler/src/compiler.ts",
    "export const compiler = true;\n",
  );
  assert.equal(command(root, "git", ["init"]).status, 0);
  assert.equal(command(root, "git", ["add", "--", "packages-galerina"]).status, 0);
  return root;
}

/**
 * Run the real retirement generator against the fixture.
 *
 * @param {string} root fixture root
 * @param {readonly string[]} args generator arguments
 */
function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

test("ts-retirement --check refuses drift and uses only the selected root", () => {
  const root = fixture();
  const jsonPath = join(root, "build", "ts-retirement", "ts-retirement.json");
  const markdown = join(root, "build", "ts-retirement", "TS-RETIREMENT.md");
  try {
    const missing = run(root, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(jsonPath), false);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    const graph = JSON.parse(readFileSync(jsonPath, "utf8"));
    assert.equal(graph.totals.ts, 2);
    assert.equal(graph.totals.twinned, 1);
    assert.equal(graph.totals.compilerCore, 1);
    assert.equal(run(root, ["--check"]).status, 0);

    writeFileSync(markdown, "tampered\n");
    const drifted = run(root, ["--check"]);
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(markdown, "utf8"), "tampered\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
