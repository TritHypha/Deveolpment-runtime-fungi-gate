import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = join(ROOT, "scripts", "gather-r4-twin-hashes.mjs");

function run(...args) {
  return spawnSync(process.execPath, [TOOL, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

describe("RD-0361 remaining-tranche hash gatherer", () => {
  it("lists the exact 20-candidate queue with its dependency tranches", () => {
    const result = run("--list", "--json");
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);

    assert.equal(report.total, 20);
    assert.deepEqual(report.counts, {
      "app-kernel": 6,
      "tower-citizen": 4,
      "core-runtime": 1,
      "sentinel-io": 2,
      "core-network": 7,
    });
    assert.equal(new Set(report.rows.map((row) => row.path)).size, 20);
    assert.ok(
      report.rows.every(
        (row) =>
          row.path.startsWith("packages-galerina/") &&
          row.path.endsWith(".fungi") &&
          typeof row.module === "string" &&
          row.module.length > 0,
      ),
    );
  });

  it("refuses an unknown tranche instead of gathering an empty set", () => {
    const result = run("--tranche", "unknown", "--json");
    assert.equal(result.status, 2);
    assert.match(`${result.stdout}\n${result.stderr}`, /unknown tranche/i);
  });

  it("allows only source-declared stdlib helpers and rejects authority imports", () => {
    const result = run("--self-test");
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /stdlib helper.*allowed/i);
    assert.match(result.stdout, /network authority.*rejected/i);
    assert.match(result.stdout, /unknown double-underscore.*rejected/i);
    assert.match(result.stdout, /ledger hash mismatch.*rejected/i);
  });
});
