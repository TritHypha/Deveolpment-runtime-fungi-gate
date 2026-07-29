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

function run(script, args, cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [join(SCRIPTS, script), ...args], {
    cwd,
    encoding: "utf8",
    shell: false,
  });
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test("audit-selfhost-readiness reports a host floor and a fully-Fungi control", () => {
  withFixture("galerina-selfhost-gate-", (root) => {
    const sourceRoot = "packages-galerina/probe/src";
    write(root, `${sourceRoot}/index.ts`, 'import { readFileSync } from "node:fs";\n');
    const planted = run("audit-selfhost-readiness.mjs", ["--root", root, "--json"]);
    assert.equal(planted.status, 0, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.equal(plantedReport.authority, "report-only");
    assert.deepEqual(plantedReport.rows[0]?.floors, ["host-io"]);
    assert.equal(plantedReport.rows[0]?.status, "TS-ONLY (floored)");

    rmSync(join(root, `${sourceRoot}/index.ts`));
    write(root, `${sourceRoot}/index.fungi`, "flow probe() -> Bool { _=> true }\n");
    const control = run("audit-selfhost-readiness.mjs", ["--root", root, "--json"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    const controlReport = JSON.parse(control.stdout);
    assert.equal(controlReport.rows[0]?.status, "FULLY-FUNGI");
    assert.equal(controlReport.rows[0]?.floors.length, 0);
  });
});

test("audit-signed-fixture-drift blocks modification of a committed signed package", () => {
  withFixture("galerina-signed-drift-gate-", (root) => {
    write(root, "probe/package.fungi.json", JSON.stringify({ name: "probe" }));
    write(root, "probe/src/index.fungi", "flow probe() -> Bool { _=> true }\n");
    write(root, "probe/dist/probe.lmanifest.json", JSON.stringify({
      schemaVersion: "fungi.lmanifest.v1",
      governanceSignature: { keyId: "fixture-key", signature: "real-fixture-signature" },
    }));
    git(root, ["init", "--quiet"]);
    git(root, ["config", "user.email", "fixture@example.invalid"]);
    git(root, ["config", "user.name", "Galerina Fixture"]);
    git(root, ["add", "."]);
    git(root, ["commit", "--quiet", "-m", "fixture"]);

    const control = run("audit-signed-fixture-drift.mjs", ["--root", root]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /all 1 signed package\(s\) clean/);

    write(root, "probe/src/index.fungi", "flow probe() -> Bool { _=> false }\n");
    const planted = run("audit-signed-fixture-drift.mjs", ["--root", root]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    assert.match(planted.stdout, /signed-drift/);
    assert.match(planted.stdout, /probe\/src\/index\.fungi/);
  });
});

test("audit-stray-docs reports an outside document and clears when it is under docs", () => {
  withFixture("galerina-stray-docs-gate-", (root) => {
    write(root, "packages-galerina/probe/NOTES.md", "# outside\n");
    const planted = run("audit-stray-docs.mjs", ["--root", root, "--json"]);
    assert.equal(planted.status, 0, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.equal(plantedReport.authority, "report-only");
    assert.equal(plantedReport.strayCount, 1);
    assert.equal(plantedReport.byDir[0]?.files[0]?.rel, "packages-galerina/probe/NOTES.md");

    rmSync(join(root, "packages-galerina/probe/NOTES.md"));
    write(root, "docs/NOTES.md", "# contained\n");
    const control = run("audit-stray-docs.mjs", ["--root", root, "--json"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.equal(JSON.parse(control.stdout).strayCount, 0);
  });
});
