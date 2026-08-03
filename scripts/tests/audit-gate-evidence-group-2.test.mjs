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
const SCRIPTS = join(REPO_ROOT, "scripts");

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

function run(script, args) {
  return spawnSync(process.execPath, [join(SCRIPTS, script), ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
}

test("audit-diagnostic-codes refuses a name collision and accepts one-to-one identity", () => {
  withFixture("galerina-diagnostic-gate-", (root) => {
    const sourcePath = "packages-galerina/probe/src/index.ts";
    write(root, sourcePath, [
      'const first = { code: "FUNGI-PROBE-001", name: "SAME_NAME", severity: "error" };',
      'const second = { code: "FUNGI-PROBE-002", name: "SAME_NAME", severity: "error" };',
    ].join("\n"));
    const planted = run("audit-diagnostic-codes.mjs", ["--root", root, "--json"]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.equal(plantedReport.violations[0]?.code, "V2_NAME_COLLISION");

    write(root, sourcePath, [
      'const first = { code: "FUNGI-PROBE-001", name: "FIRST_NAME", severity: "error" };',
      'const second = { code: "FUNGI-PROBE-002", name: "SECOND_NAME", severity: "error" };',
    ].join("\n"));
    const control = run("audit-diagnostic-codes.mjs", ["--root", root, "--json"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.equal(JSON.parse(control.stdout).counts.violations, 0);
  });
});

test("audit-kernel-floor refuses host reach outside the seam and accepts confinement", () => {
  withFixture("galerina-kernel-floor-gate-", (root) => {
    const sourceRoot = "packages-galerina/galerina-framework-app-kernel/src";
    write(root, `${sourceRoot}/host-floor.ts`, 'import { readFileSync } from "node:fs";\n');
    write(root, `${sourceRoot}/governed.ts`, 'import { existsSync } from "node:fs";\n');
    const planted = run("audit-kernel-floor.mjs", ["--root", root, "--json"]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.deepEqual(plantedReport.violations, [{ file: "governed.ts", floor: ["host-io"] }]);

    write(root, `${sourceRoot}/governed.ts`, "export const governed = true;\n");
    const control = run("audit-kernel-floor.mjs", ["--root", root, "--json"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.equal(JSON.parse(control.stdout).violations.length, 0);

    write(root, `${sourceRoot}/host-floor.ts`, 'import { spawn } from "node:child_process";\n');
    const widened = run("audit-kernel-floor.mjs", ["--root", root, "--json"]);
    assert.equal(widened.status, 1, widened.stdout + widened.stderr);
    assert.deepEqual(
      JSON.parse(widened.stdout).seamManifestViolations,
      ["node:child_process"],
    );
  });
});

test("audit-scratchdir-hygiene refuses a leak and accepts own-PID cleanup", () => {
  withFixture("galerina-scratchdir-gate-", (root) => {
    const testPath = "packages-galerina/probe/tests/scratch.test.mjs";
    write(root, testPath, "const scratch = `build/probe-${process.pid}-1`;\n");
    const planted = run("audit-scratchdir-hygiene.mjs", ["--root", root, "--json"]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    assert.equal(JSON.parse(planted.stdout).leaks.length, 1);

    write(root, testPath, [
      'import { after } from "node:test";',
      'import { readdirSync, rmSync } from "node:fs";',
      "const scratch = `build/probe-${process.pid}-1`;",
      "rmSync(scratch, { recursive: true, force: true });",
      "after(() => {",
      '  for (const name of readdirSync("build")) {',
      "    if (name.startsWith(`probe-${process.pid}-`)) rmSync(name, { recursive: true, force: true });",
      "  }",
      "});",
    ].join("\n"));
    const control = run("audit-scratchdir-hygiene.mjs", ["--root", root, "--json"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    const controlReport = JSON.parse(control.stdout);
    assert.equal(controlReport.leaks.length, 0);
    assert.equal(controlReport.broad.length, 0);
    assert.equal(controlReport.clean.length, 1);
  });
});
