// graph-all.test.mjs — proves repository-owned child-mode routing, complete
// child coverage, and fail-closed exit propagation without a private sidecar.
// Version: 2.0.0 · governed-memory migration.
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
  const children = [
    "package-graph-generator.mjs",
    "project-graph-generator.mjs",
    "audit-graph-integrity.mjs",
    "kb-graph-generator.mjs",
    "dev-tool-index.mjs",
    "fungi-source-capability-inventory.mjs",
    "gen-assurance-semantic-graph.mjs",
  ];
  for (const name of children) {
    write(root, `scripts/${name}`, `
      import { appendFileSync } from "node:fs";
      appendFileSync("calls.log", ${JSON.stringify(name)} + " " + process.argv.slice(2).join(" ") + "\\n");
      if (process.env.FAIL_CHILD === ${JSON.stringify(name)}) process.exit(7);
    `);
  }
  return { root, kb };
}

function run(root, kb, args = [], failChild = "") {
  return spawnSync(process.execPath, [
    SCRIPT,
    "--root", root,
    "--kb-dir", kb,
    ...args,
  ], {
    encoding: "utf8",
    env: { ...process.env, FAIL_CHILD: failChild },
  });
}

test("graph-all routes all seven repository checks in dependency order and propagates a child refusal", () => {
  const { root, kb } = fixture();
  try {
    const passed = run(root, kb, ["--check"]);
    assert.equal(passed.status, 0, `${passed.stdout}\n${passed.stderr}`);
    const calls = readFileSync(join(root, "calls.log"), "utf8");
    const callLines = calls.trim().split(/\r?\n/);
    assert.equal(callLines.length, 7);
    assert.deepEqual(
      callLines.map((line) => line.split(" ")[0]),
      [
        "package-graph-generator.mjs",
        "project-graph-generator.mjs",
        "audit-graph-integrity.mjs",
        "kb-graph-generator.mjs",
        "dev-tool-index.mjs",
        "fungi-source-capability-inventory.mjs",
        "gen-assurance-semantic-graph.mjs",
      ],
    );
    assert.match(calls, /project-graph-generator\.mjs .*--check/);
    assert.match(calls, /kb-graph-generator\.mjs .*--kb-dir .*--check/);
    assert.match(calls, /package-graph-generator\.mjs .*--check/);
    assert.doesNotMatch(calls, /memory-graph\.mjs/);
    assert.match(calls, /dev-tool-index\.mjs .*--generator-check/);
    assert.match(calls, /fungi-source-capability-inventory\.mjs .*--root .*--check/);
    assert.match(calls, /gen-assurance-semantic-graph\.mjs .*--root .*--check/);

    writeFileSync(join(root, "calls.log"), "");
    const refused = run(
      root,
      kb,
      ["--check"],
      "package-graph-generator.mjs",
    );
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /package graph.*exit 7/i);
    assert.equal(
      readFileSync(join(root, "calls.log"), "utf8").trim().split(/\r?\n/).length,
      7,
      "the orchestrator aggregates all child results instead of stopping before evidence is complete",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(kb, { recursive: true, force: true });
  }
});

test("graph-all refuses the retired --memory-dir release-gate argument", () => {
  const { root, kb } = fixture();
  try {
    const refused = run(root, kb, ["--memory-dir", root]);
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /unknown.*--memory-dir/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(kb, { recursive: true, force: true });
  }
});

test("graph-all can leave semantic coverage to its separately named phase-close gate", () => {
  const { root, kb } = fixture();
  try {
    const result = run(root, kb, ["--check", "--skip-semantic"]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const callLines = readFileSync(join(root, "calls.log"), "utf8").trim().split(/\r?\n/);
    assert.equal(callLines.length, 6);
    assert.doesNotMatch(
      callLines.join("\n"),
      /gen-assurance-semantic-graph\.mjs/,
      "the umbrella must not execute the semantic owner when a separate blocking gate owns it",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(kb, { recursive: true, force: true });
  }
});
