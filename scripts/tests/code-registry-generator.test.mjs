// code-registry-generator.test.mjs — proves isolated, deterministic registry
// generation and non-mutating drift refusal, including living count stamps.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/gen-code-registry.mjs; scripts/audit-code-catalog-coverage.mjs.
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

const SCRIPT = resolve("scripts/gen-code-registry.mjs");

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
 * Run a command without invoking a shell.
 *
 * @param {string} root working directory
 * @param {string} command executable
 * @param {readonly string[]} args arguments
 */
function runCommand(root, command, args) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8" });
}

/**
 * Create a Git-indexed source fixture with one catalogued and one deliberately
 * shape-blind code so the coverage measurement cannot be vacuous.
 */
function fixture({ includeDescriptiveIndex = true, sourceExtra = "" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "code-registry-generator-"));
  const codeIndex = [{
    code: "FUNGI-TEST-001",
    family: "TEST",
    namespace: "FUNGI",
    docOnly: false,
    defs: ["packages-ts/example/src/index.ts:1"],
    emits: ["packages-ts/example/src/index.ts:2"],
    tests: 1,
    refs: 0,
    docs: 0,
    names: ["TEST_FAILURE"],
    severities: ["error"],
  }];
  if (includeDescriptiveIndex) codeIndex.push({
    code: "FUNGI-FUSE-HASH-MISMATCH",
    family: "FUSE",
    namespace: "FUNGI",
    docOnly: false,
    defs: [],
    emits: ["packages-ts/example/src/index.ts:2"],
    tests: 0,
    refs: 0,
    docs: 0,
    names: [],
    severities: [],
  });
  write(
    root,
    "build/code-index/code-index.json",
    JSON.stringify(codeIndex, null, 2),
  );
  write(
    root,
    "packages-ts/example/src/index.ts",
    'export const D = { code: "FUNGI-TEST-001", name: "TEST_FAILURE", severity: "error" };\n'
      + 'throw new Error("FUNGI-FUSE-HASH-MISMATCH");\n'
      + sourceExtra,
  );
  write(
    root,
    "AGENTS.md",
    "live <!-- registry:counts.live -->0 of <!-- registry:counts.total -->0\n",
  );
  assert.equal(runCommand(root, "git", ["init"]).status, 0);
  assert.equal(runCommand(root, "git", ["add", "--", "AGENTS.md", "packages-ts/example/src/index.ts"]).status, 0);
  return root;
}

/**
 * Run the real registry generator against the fixture.
 *
 * @param {string} root fixture root
 * @param {readonly string[]} args generator arguments
 */
function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

test("gen-code-registry --check refuses drift without rewriting outputs or stamps", () => {
  const root = fixture();
  const markdown = join(root, "build", "code-registry", "REGISTRY.md");
  const agents = join(root, "AGENTS.md");
  try {
    const missing = run(root, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(markdown), false);
    assert.match(readFileSync(agents, "utf8"), /counts\.live -->0/);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(run(root, ["--check"]).status, 0);

    writeFileSync(markdown, "tampered\n");
    const stamped = readFileSync(agents, "utf8");
    const drifted = run(root, ["--check"]);
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(markdown, "utf8"), "tampered\n");
    assert.equal(readFileSync(agents, "utf8"), stamped);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("gen-code-registry refuses an admitted descriptive identity missing from the index", () => {
  const root = fixture({ includeDescriptiveIndex: false });
  try {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /descriptive coverage REFUSED.*1 admitted identity/i);
    assert.equal(existsSync(join(root, "build", "code-registry", "REGISTRY.md")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("gen-code-registry refuses an ambiguous descriptive source token", () => {
  const root = fixture({
    sourceExtra: 'const unexplained = "FUNGI-NOVEL-AMBIGUOUS";\n',
  });
  try {
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /descriptive coverage REFUSED.*1 ambiguous token/i);
    assert.equal(existsSync(join(root, "build", "code-registry", "REGISTRY.md")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
