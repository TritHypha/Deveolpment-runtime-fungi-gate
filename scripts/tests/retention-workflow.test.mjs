import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const WORKFLOW = join(ROOT, ".github", "workflows", "retention.yml");

test("retention workflow builds before running the enforcing per-commit gate", () => {
  const source = readFileSync(WORKFLOW, "utf8");

  assert.match(source, /^name: retention$/m);
  assert.match(source, /^permissions:\s*\r?\n  contents: read$/m);
  assert.match(source, /^  push:\s*\r?\n    branches: \[main\]$/m);
  assert.match(source, /^  pull_request:$/m);
  assert.match(source, /^  workflow_dispatch: \{\}$/m);

  const build = source.indexOf("node scripts/build-core-chain.mjs");
  const gate = source.indexOf("npm run audit:retention");
  assert.notEqual(build, -1, "workflow must build the retention gate's compiler closure");
  assert.notEqual(gate, -1, "workflow must run the enforcing retention gate");
  assert.ok(build < gate, "build must complete before the retention gate runs");

  assert.doesNotMatch(source, /continue-on-error:/);
  assert.doesNotMatch(source, /audit:retention:nightly/);
});

test("retention workflow pins every third-party action to the approved immutable commits", () => {
  const source = readFileSync(WORKFLOW, "utf8");
  const actions = [...source.matchAll(/^\s*- uses:\s*(\S+)/gm)].map((match) => match[1]);

  assert.deepEqual(actions, [
    "actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5",
    "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  ]);
});
