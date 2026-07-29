// graph-all.test.mjs — proves explicit external selection, child-mode routing,
// complete child coverage, and fail-closed exit propagation.
// Version: 1.0.0 · Task 7 generator governance.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/graph-all.mjs");

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "graph-all-root-"));
  const kb = mkdtempSync(join(tmpdir(), "graph-all-kb-"));
  const memory = mkdtempSync(join(tmpdir(), "graph-all-memory-"));
  const children = [
    "project-graph-generator.mjs",
    "audit-graph-integrity.mjs",
    "kb-graph-generator.mjs",
    "package-graph-generator.mjs",
    "memory-graph.mjs",
    "dev-tool-index.mjs",
  ];
  for (const name of children) {
    write(root, `scripts/${name}`, `
      import { appendFileSync } from "node:fs";
      appendFileSync("calls.log", ${JSON.stringify(name)} + " " + process.argv.slice(2).join(" ") + "\\n");
      if (process.env.FAIL_CHILD === ${JSON.stringify(name)}) process.exit(7);
    `);
  }
  return { root, kb, memory };
}

function run(root, kb, memory, args = [], failChild = "") {
  return spawnSync(process.execPath, [
    SCRIPT,
    "--root", root,
    "--kb-dir", kb,
    "--memory-dir", memory,
    ...args,
  ], {
    encoding: "utf8",
    env: { ...process.env, FAIL_CHILD: failChild },
  });
}

test("graph-all routes all six checks and propagates a child refusal", () => {
  const { root, kb, memory } = fixture();
  try {
    const passed = run(root, kb, memory, ["--check"]);
    assert.equal(passed.status, 0, `${passed.stdout}\n${passed.stderr}`);
    const calls = readFileSync(join(root, "calls.log"), "utf8");
    assert.equal(calls.trim().split(/\r?\n/).length, 6);
    assert.match(calls, /project-graph-generator\.mjs .*--check/);
    assert.match(calls, /kb-graph-generator\.mjs .*--kb-dir .*--check/);
    assert.match(calls, /package-graph-generator\.mjs .*--check/);
    assert.match(calls, /memory-graph\.mjs .*--dir .*--check/);
    assert.match(calls, /dev-tool-index\.mjs .*--generator-check/);

    writeFileSync(join(root, "calls.log"), "");
    const refused = run(
      root,
      kb,
      memory,
      ["--check"],
      "package-graph-generator.mjs",
    );
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /package graph.*exit 7/i);
    assert.equal(
      readFileSync(join(root, "calls.log"), "utf8").trim().split(/\r?\n/).length,
      6,
      "the orchestrator aggregates all child results instead of stopping before evidence is complete",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(kb, { recursive: true, force: true });
    rmSync(memory, { recursive: true, force: true });
  }
});
