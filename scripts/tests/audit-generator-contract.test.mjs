// audit-generator-contract.test.mjs — proves the generator-policy orchestrator
// refuses vacuous coverage and propagates child contract failures.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/audit-generator-contract.mjs; governance/tooling-policy.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const AUDIT = resolve("scripts/audit-generator-contract.mjs");

/**
 * Write one fixture file, creating its parent directories.
 *
 * @param {string} root fixture root
 * @param {string} relativePath fixture-relative path
 * @param {string} content exact file content
 */
function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Create a complete policy fixture with an optional undeclared write.
 *
 * @param {{ empty?: boolean, hiddenWrite?: boolean }} options fixture options
 */
function fixture({ empty = false, hiddenWrite = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "audit-generator-contract-"));
  const generator = "scripts/fake-generator.mjs";
  write(root, "input/source.txt", "stable\n");
  write(
    root,
    generator,
    `import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
if (process.argv.includes("--check")) process.exit(0);
const outputs = ["build/value.json", "build/provenance.json"${hiddenWrite ? ', "build/hidden.json"' : ""}];
for (const output of outputs) {
  const path = join(process.cwd(), output);
  mkdirSync(dirname(path), { recursive: true });
  const value = output.endsWith("provenance.json")
      ? {
          tool: "fake-generator",
          authority: "NONE",
          gitCommit: "a".repeat(40),
        builtAt: "2026-07-29T10:00:00.000Z",
        node: process.version,
      }
    : { value: "stable" };
  writeFileSync(path, JSON.stringify(value, null, 2) + "\\n");
}
`,
  );
  const generators = empty
    ? {}
    : {
      [generator]: {
        inputs: ["input/source.txt"],
        outputs: ["build/value.json", "build/provenance.json"],
        tracked: true,
        generate: ["node", generator],
        check: ["node", generator, "--check"],
        provenance: "required",
        tier: "phase-close",
      },
    };
  write(
    root,
    "governance/tooling-policy.json",
    JSON.stringify({
      schemaVersion: 1,
      packageNoTest: {},
      toolExceptions: {},
      generators,
    }, null, 2),
  );
  return root;
}

/**
 * Run the real audit CLI and parse its JSON report when possible.
 *
 * @param {string} root fixture root
 */
function runAudit(root) {
  const result = spawnSync(
    process.execPath,
    [AUDIT, "--root", root, "--json"],
    { encoding: "utf8" },
  );
  return {
    ...result,
    report: result.stdout.trim().length > 0
      ? JSON.parse(result.stdout)
      : undefined,
  };
}

test("generator audit refuses an empty policy as vacuous coverage", () => {
  const root = fixture({ empty: true });
  try {
    const result = runAudit(root);
    assert.notEqual(result.status, 0);
    assert.equal(result.report?.code, "GENERATOR-POLICY-EMPTY");
    assert.equal(result.report?.ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generator audit propagates an undeclared child write", () => {
  const root = fixture({ hiddenWrite: true });
  try {
    const result = runAudit(root);
    assert.notEqual(result.status, 0);
    assert.equal(result.report?.ok, false);
    assert.equal(result.report?.results[0]?.code, "GENERATOR-UNDECLARED-WRITE");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generator audit accepts one governed deterministic generator", () => {
  const root = fixture();
  try {
    const result = runAudit(root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.report?.ok, true);
    assert.equal(result.report?.total, 1);
    assert.equal(result.report?.passed, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generator audit self-test proves both refusal and control directions", () => {
  const result = spawnSync(
    process.execPath,
    [AUDIT, "--self-test", "--json"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.negativeDetected, true);
  assert.equal(report.controlPassed, true);
});
