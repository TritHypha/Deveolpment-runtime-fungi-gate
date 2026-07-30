import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const SCRIPT = resolve("scripts/ts-retirement-graph.mjs");

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function command(root, executable, args) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
  });
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "full-fungi-retirement-"));
  write(
    root,
    "packages-galerina/galerina-core/src/index.ts",
    "export const value = 1;\n",
  );
  write(
    root,
    "packages-galerina/galerina-core/src/index.fungi",
    "pure flow value() -> Int { return 1 }\n",
  );
  write(
    root,
    "packages-galerina/galerina-core/tests/index.test.ts",
    "export const testValue = true;\n",
  );
  write(
    root,
    "packages-galerina/galerina-core/host/bridge.ts",
    "export const bridge = true;\n",
  );
  write(
    root,
    "docs/security/rd0528-compiler-authoritative-stages.json",
    JSON.stringify({ twins: [] }),
  );
  write(
    root,
    "docs/security/rd0361-authoritative-twins.json",
    JSON.stringify({ twins: [] }),
  );
  assert.equal(command(root, "git", ["init"]).status, 0);
  assert.equal(
    command(root, "git", ["add", "--", "packages-galerina", "docs"]).status,
    0,
  );
  return root;
}

function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

test("terminal retirement refuses every tracked package TypeScript path", () => {
  const root = fixture();
  try {
    const result = run(root, ["--terminal-check", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.totals.allTrackedTs, 3);
    assert.deepEqual(evidence.allTrackedTsPaths, [
      "packages-galerina/galerina-core/host/bridge.ts",
      "packages-galerina/galerina-core/src/index.ts",
      "packages-galerina/galerina-core/tests/index.test.ts",
    ]);
    assert.equal(evidence.terminalReady, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("moving TypeScript outside src cannot hide retirement debt", () => {
  const root = fixture();
  try {
    const source = join(
      root,
      "packages-galerina",
      "galerina-core",
      "src",
      "index.ts",
    );
    const hidden = join(
      root,
      "packages-galerina",
      "galerina-core",
      "legacy",
      "index.ts",
    );
    mkdirSync(dirname(hidden), { recursive: true });
    renameSync(source, hidden);
    assert.equal(
      command(root, "git", ["add", "-A", "--", "packages-galerina"]).status,
      0,
    );

    const result = run(root, ["--terminal-check", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.totals.allTrackedTs, 3);
    assert.ok(
      evidence.allTrackedTsPaths.includes(
        "packages-galerina/galerina-core/legacy/index.ts",
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
