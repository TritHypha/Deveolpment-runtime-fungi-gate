import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import {
  createBuildEvidence,
  writeBuildEvidence,
} from "../../galerina-core-compiler/scripts/write-build-evidence.mjs";

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "compiler-evidence-"));
  const compiler = "packages-galerina/galerina-core-compiler";
  write(root, `${compiler}/src/index.ts`, "export const value = 1;\n");
  write(root, `${compiler}/tests/index.test.mjs`, "export {};\n");
  const init = spawnSync("git", ["init", "--quiet"], { cwd: root, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  const add = spawnSync("git", ["add", "--", `${compiler}/src`, `${compiler}/tests`], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(add.status, 0, add.stderr);
  return { root, compiler };
}

test("compiler build evidence is deterministic and content-sensitive", () => {
  const { root, compiler } = fixture();
  try {
    const first = createBuildEvidence(root, compiler);
    const second = createBuildEvidence(root, compiler);
    assert.deepEqual(second, first);

    write(root, `${compiler}/src/index.ts`, "export const value = 2;\n");
    const changed = createBuildEvidence(root, compiler);
    assert.notEqual(changed.inputDigest, first.inputDigest);
    assert.deepEqual(changed.trackedInputs, first.trackedInputs);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("compiler build evidence refuses untracked source inputs", () => {
  const { root, compiler } = fixture();
  try {
    write(root, `${compiler}/src/hidden.ts`, "export const hidden = true;\n");
    assert.throws(
      () => createBuildEvidence(root, compiler),
      /untracked inputs.*hidden\.ts/i,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("compiler build evidence writer persists exactly the computed evidence", () => {
  const { root, compiler } = fixture();
  try {
    const output = join(root, compiler, "dist", "build-evidence.json");
    const expected = createBuildEvidence(root, compiler);
    writeBuildEvidence(root, compiler, output);
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), expected);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
