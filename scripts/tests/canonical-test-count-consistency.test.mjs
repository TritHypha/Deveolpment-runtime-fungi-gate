import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SCRIPT = join(process.cwd(), "scripts", "audit-canonical-test-counts.mjs");
const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function write(root, path, content) {
  const output = join(root, ...path.split("/"));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-count-contract-"));
  roots.push(root);
  write(root, "version.json", `${JSON.stringify({ testCount: 9499, packageCount: 100 })}\n`);
  write(root, "README.md", [
    "<!-- SUBWAY:BEGIN -->",
    "**v1.0.0-beta.2 · 100 packages · 9499 tests · ship-readiness 100.0%**",
    "<!-- SUBWAY:END -->",
    "**v1.0.0-beta.2 · full suite 100/100 packages · 9,499 tests · 0 failures.**",
    "| **Tests** | ✅ green | 100/100 · 9,499 · 0 fail |",
  ].join("\n"));
  write(root, "docs/roadmap-2026-07-25-cycle2.md", "<!-- SUBWAY:BEGIN -->\n**v1.0.0-beta.2 · 100 packages · 9499 tests · ship-readiness 100.0%**\n<!-- SUBWAY:END -->\n");
  write(root, "docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md", [
    "<!-- SUBWAY:BEGIN -->",
    "**v1.0.0-beta.2 · 100 packages · 9499 tests · ship-readiness 100.0%**",
    "<!-- SUBWAY:END -->",
    "## VOK assurance fabric Chapter 3 - 2026-08-10",
    "The complete package lane is **100/100 packages and 9,499 tests** in 1s.",
  ].join("\n"));
  write(root, "docs/TODO.md", "Fresh evidence: the complete package lane passes **100/100 packages and 9,499 tests**.\n");
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, "--json"], { encoding: "utf8" });
}

test("canonical test-count owner accepts every exact current rendered consumer", () => {
  const result = run(fixture());
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).violations.length, 0);
});

test("canonical test-count owner blocks one stale active-roadmap claim", () => {
  const root = fixture();
  write(root, "docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md", [
    "<!-- SUBWAY:BEGIN -->",
    "**v1.0.0-beta.2 · 100 packages · 9499 tests · ship-readiness 100.0%**",
    "<!-- SUBWAY:END -->",
    "## VOK assurance fabric Chapter 3 - 2026-08-10",
    "The complete package lane is **100/100 packages and 9,498 tests** in 1s.",
  ].join("\n"));
  const result = run(root);
  assert.notEqual(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.tool, "canonical-test-count-consistency");
  assert.deepEqual(report.violations.map((entry) => entry.consumer), ["active-roadmap-chapter-3"]);
});

test("canonical test-count owner self-test proves clean and stale controls", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "--self-test"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /self-test.*PASS/i);
});
