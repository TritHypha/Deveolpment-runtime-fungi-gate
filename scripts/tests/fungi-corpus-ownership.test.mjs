// fungi-corpus-ownership.test.mjs — regression contract for explicit negative
// fixture ownership and the zero-growth implicit failure baseline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AUDIT = resolve("scripts/audit-fungi-corpus-check.mjs");
const WORKSET_FILES = Object.freeze([
  "packages-ts/galerina-core-compiler/src/self-hosted/bound.fungi",
  "packages-ts/galerina-core-compiler/src/self-hosted/i32-max.fungi",
]);

function corpusV2Args(profile, files = []) {
  return [
    "--corpus-v2",
    "--profile",
    profile,
    ...files.flatMap((file) => ["--file", file]),
    "--shard-count",
    "1",
    "--concurrency",
    "1",
    "--max-files",
    "2",
    "--max-bytes",
    "1048576",
    "--timeout-ms",
    "30000",
    "--max-output-bytes",
    "1048576",
  ];
}

function runCorpusV2(args) {
  return spawnSync(process.execPath, [AUDIT, ...args], {
    encoding: "utf8",
    timeout: 90_000,
    windowsHide: true,
  });
}

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

test("the production CLI executes an exact two-file protected WORKSET", { timeout: 120_000 }, () => {
  const result = runCorpusV2(corpusV2Args("WORKSET", WORKSET_FILES));
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const lines = result.stdout.trim().split(/\r?\n/u);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^FUNGI_CORPUS_V2 /u);
  const run = JSON.parse(lines[0].slice("FUNGI_CORPUS_V2 ".length));
  assert.equal(run.aggregate.status, "PASS");
  assert.deepEqual(
    run.receipts.flatMap((receipt) => receipt.completed.map(({ path }) => path)),
    WORKSET_FILES,
  );
  assert.doesNotMatch(JSON.stringify(run), /@version|pure flow|SECRET_DIAGNOSTIC_BODY/u);
});

test("the WORKSET file selector is closed, ordered, unique, tracked and profile-bound", { timeout: 120_000 }, async (t) => {
  const first = WORKSET_FILES[0];
  const second = WORKSET_FILES[1];
  const cases = [
    ["unsorted", [second, first], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["duplicate", [first, first], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["case alias", [first.toUpperCase(), first], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["untracked", ["tests/not-tracked.fungi"], "WORKSET", "CORPUS_V2_LOCAL_IDENTITY_REFUSED"],
    ["non-fungi", ["README.md"], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["traversal", ["../outside.fungi"], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["absolute", ["C:/outside.fungi"], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["backslash", [String.raw`tests\\outside.fungi`], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["control", ["tests/\u0001outside.fungi"], "WORKSET", "CORPUS_V2_ARGUMENTS_REFUSED"],
    ["project selector", [first], "PROJECT", "CORPUS_V2_ARGUMENTS_REFUSED"],
  ];
  for (const [name, files, profile, code] of cases) {
    await t.test(name, () => {
      const result = runCorpusV2(corpusV2Args(profile, files));
      assert.equal(result.status, 2, result.stderr || result.stdout);
      assert.match(result.stderr, new RegExp(code));
      assert.doesNotMatch(result.stdout, /^FUNGI_CORPUS_V2 /mu);
    });
  }
  await t.test("unknown flag", () => {
    const args = corpusV2Args("WORKSET", []);
    args.push("--unknown", "1");
    const result = runCorpusV2(args);
    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /CORPUS_V2_ARGUMENTS_REFUSED/u);
    assert.doesNotMatch(result.stdout, /^FUNGI_CORPUS_V2 /mu);
  });
});
