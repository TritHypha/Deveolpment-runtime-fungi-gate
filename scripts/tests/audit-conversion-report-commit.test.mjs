import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const AUDIT = join(import.meta.dirname, "..", "audit-conversion-report-commit.mjs");

function runCommand(root, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, path, content = "@version 1\n") {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function createRepo() {
  const root = mkdtempSync(join(tmpdir(), "galerina-conversion-commit-"));
  runCommand(root, "git", ["init", "-q"]);
  runCommand(root, "git", ["config", "user.name", "Galerina Test"]);
  runCommand(root, "git", ["config", "user.email", "test@invalid.example"]);
  write(root, "README.md", "fixture\n");
  commit(root, "baseline");
  return root;
}

function commit(root, message) {
  runCommand(root, "git", ["add", "-A"]);
  runCommand(root, "git", ["commit", "-q", "-m", message]);
  return runCommand(root, "git", ["rev-parse", "HEAD"]);
}

function addFungi(root, count, suffix = "") {
  for (let index = 0; index < count; index += 1) {
    const name = String(index).padStart(2, "0");
    write(root, `packages-galerina/example/src/self-hosted/candidate-${name}.fungi`, `@version 1\n${suffix}`);
  }
}

function addReport(root, slice = 2000) {
  write(
    root,
    `docs/reports/slice-${slice}-candidate-fungi-conversion-2026-08-14.md`,
    `# Slice ${slice} candidate\n`,
  );
}

function addCommonReport(root, content = "# Conversion status\n") {
  write(root, "docs/reports/fungi-conversion-batch-33-42-file-status.md", content);
}

function runAudit(root, revision = "HEAD", extraArguments = []) {
  return spawnSync(
    process.execPath,
    [AUDIT, "--root", root, "--commit", revision, ...extraArguments],
    { cwd: root, encoding: "utf8" },
  );
}

test("a commit without conversion reports does not require Fungi additions", () => {
  const root = createRepo();
  write(root, "docs/note.md", "documentation only\n");
  commit(root, "docs only");
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /no added conversion reports/u);
});

test("a conversion-report commit with 39 added Fungi files refuses", () => {
  const root = createRepo();
  addReport(root);
  addFungi(root, 39);
  commit(root, "undersized conversion batch");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /found 39 added \.fungi files; minimum 40; expected 50/u);
});

test("a conversion-report commit with the 40-file minimum passes", () => {
  const root = createRepo();
  addReport(root);
  addFungi(root, 40);
  commit(root, "minimum conversion batch");
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /40 added \.fungi files; minimum 40; expected 50/u);
});

test("a conversion-report commit with the expected 50 Fungi files passes", () => {
  const root = createRepo();
  addReport(root);
  addFungi(root, 50);
  commit(root, "expected conversion batch");
  const result = runAudit(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /50 added \.fungi files; minimum 40; expected 50/u);
});

test("modifying existing Fungi files cannot satisfy the added-file minimum", () => {
  const root = createRepo();
  addFungi(root, 40);
  commit(root, "existing fungi baseline");
  addReport(root);
  addFungi(root, 40, "// modified\n");
  commit(root, "report with modified fungi only");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /found 0 added \.fungi files; minimum 40; expected 50/u);
});

test("modifying an existing conversion report still triggers the Fungi minimum", () => {
  const root = createRepo();
  addReport(root);
  commit(root, "existing report baseline");
  addReport(root);
  write(
    root,
    "docs/reports/slice-2000-candidate-fungi-conversion-2026-08-14.md",
    "# Slice 2000 candidate\n\nupdated\n",
  );
  commit(root, "modified report without fungi");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /found 0 added \.fungi files; minimum 40; expected 50/u);
});

test("modifying the common conversion status report triggers the Fungi minimum", () => {
  const root = createRepo();
  addCommonReport(root);
  commit(root, "existing common report baseline");
  addCommonReport(root, "# Conversion status\n\nupdated\n");
  commit(root, "modified common report without fungi");
  const result = runAudit(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /found 0 added \.fungi files; minimum 40; expected 50/u);
});

test("one explicitly final report-only commit is allowed after a qualifying Fungi batch", () => {
  const root = createRepo();
  addFungi(root, 40);
  commit(root, "qualifying fungi batch");
  addReport(root);
  commit(root, "final bookkeeping");
  const result = runAudit(root, "HEAD", ["--allow-final-report-only"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /report-only streak 1\/1/u);
});

test("a second report-only commit after the last qualifying Fungi batch refuses", () => {
  const root = createRepo();
  addFungi(root, 40);
  commit(root, "qualifying fungi batch");
  addReport(root, 2000);
  commit(root, "first bookkeeping commit");
  addReport(root, 2001);
  commit(root, "second bookkeeping commit");
  const result = runAudit(root, "HEAD", ["--allow-final-report-only"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /report-only streak 2 exceeds maximum 1/u);
});

test("the final exception refuses when no qualifying Fungi batch exists in history", () => {
  const root = createRepo();
  addReport(root);
  commit(root, "unbacked bookkeeping");
  const result = runAudit(root, "HEAD", ["--allow-final-report-only"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no preceding qualifying Fungi batch/u);
});
