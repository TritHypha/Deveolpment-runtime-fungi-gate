import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
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

test("audit-syntax-reference-links refuses a dangling target and accepts an existing target", () => {
  withFixture("galerina-syntax-links-gate-", (root) => {
    write(root, "docs/language/fungi/SYNTAX-REFERENCE.md", "[target](target.md)\n");
    write(root, "docs/language/fungi/DO-DONT-TERNARY.md", "# control\n");
    write(root, "docs/reference/cost-model-nesting.md", "# control\n");
    const planted = run("audit-syntax-reference-links.mjs", ["--root", root]);
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    assert.match(planted.stdout, /dangling link/);

    write(root, "docs/language/fungi/target.md", "# target\n");
    const control = run("audit-syntax-reference-links.mjs", ["--root", root]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /1\/1 verified/);
  });
});

test("audit-syntax reports malformed TypeScript and clears a valid control", () => {
  withFixture("galerina-syntax-gate-", (root) => {
    const sourcePath = "packages-ts/probe/src/index.ts";
    write(root, sourcePath, "export const broken = ;\n");
    const planted = run("audit-syntax.mjs", ["--root", root, "--json"]);
    assert.equal(planted.status, 0, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.equal(plantedReport.authority, "report-only");
    assert.equal(plantedReport.ts.badFiles, 1);
    assert.match(plantedReport.ts.findings[0]?.code ?? "", /^TS/);

    write(root, sourcePath, "export const valid = true;\n");
    const control = run("audit-syntax.mjs", ["--root", root, "--json"]);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.equal(JSON.parse(control.stdout).ts.badFiles, 0);
  });
});

test("lint-conventions aggregates a child violation and accepts all-clean children", () => {
  withFixture("galerina-conventions-gate-", (root) => {
    write(root, "scripts/lint-conventions.mjs", readFileSync(join(SCRIPTS, "lint-conventions.mjs"), "utf8"));
    write(root, "scripts/lib/kb-dir.mjs", readFileSync(join(SCRIPTS, "lib/kb-dir.mjs"), "utf8"));
    const children = [
      "audit-diagnostic-codes.mjs",
      "audit-provenance.mjs",
      "lint-fungi.mjs",
      "audit-tier-boundary.mjs",
      "audit-production-blockers.mjs",
      "audit-name-collisions.mjs",
      "audit-overclaim-phrases.mjs",
      "audit-graph-integrity.mjs",
      "audit-web-stub-guard.mjs",
    ];
    for (const child of children) write(root, `scripts/${child}`, 'console.log("VIOLATIONS: 0");\n');
    write(root, "scripts/audit-diagnostic-codes.mjs", 'console.log("VIOLATIONS: 1");\n');

    const planted = spawnSync(process.execPath, ["scripts/lint-conventions.mjs", "--json"], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    });
    assert.equal(planted.status, 1, planted.stdout + planted.stderr);
    const plantedReport = JSON.parse(planted.stdout);
    assert.equal(plantedReport.total, 1);
    assert.equal(plantedReport.toolErrors, 0);

    write(root, "scripts/audit-diagnostic-codes.mjs", 'console.log("VIOLATIONS: 0");\n');
    const control = spawnSync(process.execPath, ["scripts/lint-conventions.mjs", "--json"], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    });
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.equal(JSON.parse(control.stdout).total, 0);
  });
});
