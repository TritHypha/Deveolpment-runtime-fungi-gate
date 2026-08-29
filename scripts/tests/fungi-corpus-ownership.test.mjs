// fungi-corpus-ownership.test.mjs — regression contract for explicit negative
// fixture ownership and the zero-growth implicit failure baseline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AUDIT = resolve("scripts/audit-fungi-corpus-check.mjs");

test("fungi corpus audit proves all fail-closed ownership branches", () => {
  const result = spawnSync(process.execPath, [AUDIT, "--self-test"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = `${result.stdout}\n${result.stderr}`;
  for (const proof of [
    "implicit baseline growth is refused",
    "orphan diagnostic sidecar is refused",
    "stale exact diagnostic ownership is refused",
    "positive source diagnostics are refused",
  ]) {
    assert.match(output, new RegExp(proof));
  }
});

test("phase-close consumes the exact Corpus Audit v2 command and focused execution suite", () => {
  const manifest = JSON.parse(readFileSync(resolve("governance/phase-close-commands.json"), "utf8"));
  const corpus = manifest.entries.find(({ id }) => id === "fungi:corpus-check");
  assert.deepEqual(corpus.execution.command, [
    "node",
    "scripts/audit-fungi-corpus-check.mjs",
    "--corpus-v2",
    "--profile",
    "PROJECT",
    "--shard-count",
    "2",
    "--concurrency",
    "2",
    "--max-files",
    "512",
    "--max-bytes",
    "67108864",
    "--timeout-ms",
    "540000",
    "--max-output-bytes",
    "67108864",
  ]);
  assert.equal(corpus.timeoutMs, 600000);
  const tooling = manifest.entries.find(({ id }) => id === "tests:tooling");
  const focused = "scripts/tests/fungi-corpus-shard-execution.test.mjs";
  assert.ok(tooling.execution.command.includes(focused));
  assert.ok(tooling.subjects.values.includes(focused));
  assert.equal(tooling.subjects.expectedCount, tooling.subjects.values.length);
});
