import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  classifyGeneratedOutputMatch,
  generatedOutputMatches,
  provenanceForCheck,
} from "../lib/provenance.mjs";

const ROOT = join(fileURLToPath(new URL("../..", import.meta.url)));

function block(overrides = {}) {
  return JSON.stringify({
    tool: "fixture-generator",
    gitCommit: "a".repeat(40),
    builtAt: "2026-07-29T10:00:00.000Z",
    node: "v24.4.1",
    externalInputDigest: "stable",
    ...overrides,
  }, null, 2) + "\n";
}

test("ordinary generated outputs remain byte exact", () => {
  assert.equal(generatedOutputMatches("build/output.json", "a", "a"), true);
  assert.equal(generatedOutputMatches("build/output.json", "a", "b"), false);
});

test("generated comparison names local byte equality without claiming freshness", () => {
  assert.deepEqual(
    classifyGeneratedOutputMatch("build/output.json", "a", "a"),
    { kind: "match", evidenceClass: "LOCAL_BYTE_EQUALITY" },
  );
  assert.deepEqual(
    classifyGeneratedOutputMatch("build/output.json", "a", "b"),
    { kind: "mismatch", evidenceClass: "LOCAL_BYTE_EQUALITY" },
  );
});

test("provenance comparison permits only a well-formed commit and timestamp change", () => {
  const actual = block({
    gitCommit: "b".repeat(40),
    builtAt: "2026-07-30T10:00:00.000Z",
  });
  assert.equal(
    generatedOutputMatches("build/provenance.json", actual, block()),
    true,
  );
});

test("provenance comparison refuses malformed volatile fields", () => {
  assert.equal(
    generatedOutputMatches(
      "build/provenance.json",
      block({ gitCommit: "not-a-commit" }),
      block(),
    ),
    false,
  );
  assert.equal(
    generatedOutputMatches(
      "build/provenance.json",
      block({ builtAt: "not-a-time" }),
      block(),
    ),
    false,
  );
});

test("provenance comparison refuses drift in stable fields", () => {
  assert.equal(
    generatedOutputMatches(
      "build/provenance.json",
      block({ externalInputDigest: "changed" }),
      block(),
    ),
    false,
  );
  assert.equal(
    generatedOutputMatches(
      "build/provenance.json",
      block({ node: "v25.0.0" }),
      block(),
    ),
    false,
  );
});

test("check mode reuses only a valid published source snapshot", () => {
  const root = mkdtempSync(join(tmpdir(), "provenance-check-"));
  const path = join(root, "provenance.json");
  try {
    writeFileSync(path, block());
    const reused = provenanceForCheck(
      "fixture-generator",
      process.cwd(),
      path,
      true,
    );
    assert.equal(reused.gitCommit, "a".repeat(40));
    assert.equal(reused.builtAt, "2026-07-29T10:00:00.000Z");
    assert.equal(reused.tool, "fixture-generator");

    writeFileSync(path, block({ tool: "wrong-generator" }));
    const refusedReuse = provenanceForCheck(
      "fixture-generator",
      process.cwd(),
      path,
      true,
    );
    assert.notEqual(refusedReuse.gitCommit, "a".repeat(40));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("component-health percent evidence remains current after its output commit", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/component-health.mjs", "--audit-check"],
    { cwd: ROOT, encoding: "utf8" },
  );
  assert.equal(
    result.status,
    0,
    `component-health owner self-staled:\n${result.stdout}${result.stderr}`,
  );
  assert.match(result.stdout, /percent-audit fresh/);
});
