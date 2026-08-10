import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("the semantic assurance generator publishes an exact current non-authorizing set", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/gen-assurance-semantic-graph.mjs", "--root", ROOT, "--check"],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(readFileSync(
    join(ROOT, "build/assurance-semantic-graph/semantic-graph.json"),
    "utf8",
  ));
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.authorizing, false);
  assert.equal(report.verdictTrit, 1);
  assert.equal(report.totals.routes, 0);
  assert.equal(report.totals.packages, 100);
  assert.equal(report.totals.legacyUnmapped, 0);
  assert.equal(typeof report.repositoryHead, "string");
  assert.match(report.repositoryHead, /^[0-9a-f]{40}$/u);
});
