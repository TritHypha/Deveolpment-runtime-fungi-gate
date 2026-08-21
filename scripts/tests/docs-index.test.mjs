import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SCRIPT = resolve("scripts/docs-index.mjs");

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "docs-index-check-"));
  write(root, "package.json", '{"type":"module"}\n');
  write(root, "scripts/docs-index.mjs", readFileSync(SCRIPT, "utf8"));
  write(root, "docs/alpha.md", "# Alpha\n");
  return root;
}

function run(root, mode) {
  return spawnSync(process.execPath, [join(root, "scripts", "docs-index.mjs"), mode], {
    cwd: root,
    encoding: "utf8",
  });
}

test("--check proves exact indexes without writing missing or drifted bytes", () => {
  const root = fixture();
  try {
    const missing = run(root, "--check");
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(join(root, "docs/INDEX.md")), false);
    assert.equal(readFileSync(join(root, "docs/alpha.md"), "utf8"), "# Alpha\n");

    const applied = run(root, "--apply");
    assert.equal(applied.status, 0, applied.stderr);
    const index = join(root, "docs/INDEX.md");
    const generated = readFileSync(index, "utf8");

    const exact = run(root, "--check");
    assert.equal(exact.status, 0, exact.stderr);
    assert.equal(readFileSync(index, "utf8"), generated);

    writeFileSync(join(root, "docs/alpha.md"), "# Changed Alpha\n");
    const drifted = run(root, "--check");
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(index, "utf8"), generated);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unsupported modes refuse without writing indexes", () => {
  const root = fixture();
  try {
    const result = run(root, "--unknown");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /usage|unsupported/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
