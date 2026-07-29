// kb-index-generator.test.mjs — proves explicit external-corpus selection,
// exact repository output checking, source binding, and no check-mode writes.
// Version: 1.0.0 · Task 7 external generator governance.
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

const SCRIPT = resolve("scripts/kb-index.mjs");

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function run(root, kb, args = []) {
  return spawnSync(process.execPath, [
    SCRIPT,
    "--root", root,
    "--kb-dir", kb,
    ...args,
  ], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

test("kb index binds and checks one explicit external corpus without writing", () => {
  const root = mkdtempSync(join(tmpdir(), "kb-index-root-"));
  const kb = mkdtempSync(join(tmpdir(), "kb-index-corpus-"));
  const json = join(root, "build/kb-index/kb-index.json");
  const markdown = join(root, "build/kb-index/KB-INDEX.md");
  const provenance = join(root, "build/kb-index/provenance.json");
  try {
    write(root, "README.md", "# Fixture repository\n");
    write(kb, "alpha.md", "# Alpha\n## K3 admission\nFUNGI-KB-001\n");
    assert.equal(spawnSync("git", ["init"], { cwd: root }).status, 0);
    assert.equal(spawnSync("git", ["add", "--", "."], { cwd: root }).status, 0);

    const missing = run(root, kb, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(readFileSync(join(root, "README.md"), "utf8"), "# Fixture repository\n");

    const generated = run(root, kb);
    assert.equal(generated.status, 0, generated.stderr);
    const machine = JSON.parse(readFileSync(json, "utf8"));
    const stamp = JSON.parse(readFileSync(provenance, "utf8"));
    assert.equal(machine.docCount, 2);
    assert.match(machine.docs[0].rel, /^(kb|repo)\//);
    assert.match(stamp.externalInputDigest, /^[a-f0-9]{64}$/);
    assert.equal(stamp.externalDocumentCount, 1);
    assert.equal(run(root, kb, ["--check"]).status, 0);
    const query = run(root, kb, ["admission"]);
    assert.equal(query.status, 0);
    assert.match(query.stdout, /kb\/alpha\.md/);
    const code = run(root, kb, ["--code", "FUNGI-KB-001"]);
    assert.equal(code.status, 0);
    assert.match(code.stdout, /kb\/alpha\.md/);

    writeFileSync(markdown, "tampered\n");
    const jsonBefore = readFileSync(json, "utf8");
    const refused = run(root, kb, ["--check"]);
    assert.notEqual(refused.status, 0);
    assert.equal(readFileSync(markdown, "utf8"), "tampered\n");
    assert.equal(readFileSync(json, "utf8"), jsonBefore);

    write(kb, "alpha.md", "# Alpha changed\n");
    assert.notEqual(run(root, kb, ["--check"]).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(kb, { recursive: true, force: true });
  }
});
