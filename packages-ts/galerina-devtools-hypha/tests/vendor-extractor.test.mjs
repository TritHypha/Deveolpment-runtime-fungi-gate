import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  equalSourceBytes,
  parseArgs,
  readUpstreamSource,
  sourceOwnerRootFromCommonDir,
} from "../scripts/vendor-extractor.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, "../scripts/vendor-extractor.mjs");

test("Hypha vendor lookup follows the primary Git common directory from a linked worktree", () => {
  const commonDir = resolve(join("workspace", "Galerina", ".git"));
  assert.equal(
    sourceOwnerRootFromCommonDir(commonDir, "hypha"),
    resolve(commonDir, "..", "..", "subprojects", "hypha"),
  );
});

test("Hypha vendor lookup refuses a non-standard Git common directory", () => {
  assert.throws(
    () => sourceOwnerRootFromCommonDir(resolve(join("workspace", "Galerina", "git-data")), "hypha"),
    /common directory must end in \.git/u,
  );
});

test("Hypha vendor lookup refuses a relative Git common directory", () => {
  assert.throws(
    () => sourceOwnerRootFromCommonDir(join("workspace", "Galerina", ".git"), "hypha"),
    /common directory must be absolute/u,
  );
});

test("Hypha vendor arguments refuse unknown, duplicate and conflicting forms", () => {
  const upstream = resolve(join("workspace", "hypha"));
  assert.deepEqual(parseArgs(["--check", "--upstream", upstream]), {
    mode: "--check",
    upstreamRoot: upstream,
  });
  assert.throws(() => parseArgs(["--check", "--write"]), /conflicting mode/u);
  assert.throws(() => parseArgs(["--check", "--check"]), /duplicate --check/u);
  assert.throws(() => parseArgs(["--upstream", upstream, "--upstream", upstream]), /duplicate --upstream/u);
  assert.throws(() => parseArgs(["--upstream", join("workspace", "hypha")]), /must be absolute/u);
});

test("Hypha vendor comparison ignores only CRLF checkout transport", () => {
  assert.equal(equalSourceBytes(Buffer.from("alpha\r\nbeta\r\n"), Buffer.from("alpha\nbeta\n")), true);
  assert.equal(equalSourceBytes(Buffer.from([0x80]), Buffer.from([0x81])), false);
  assert.equal(equalSourceBytes(Buffer.from("alpha\rbeta"), Buffer.from("alpha\nbeta")), false);
});

test("Hypha vendor refuses a symlinked upstream source", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-hypha-source-owner-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "real.js"), "module.exports = {};\n", "utf8");
    symlinkSync(join(root, "real.js"), join(root, "src", "extract.js"), "file");
    assert.throws(() => readUpstreamSource(root), /regular non-symbolic-link file/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Hypha vendor refuses an upstream source directory junction", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-hypha-source-owner-junction-"));
  const outside = mkdtempSync(join(tmpdir(), "galerina-hypha-source-owner-outside-"));
  const run = (args) => execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  }).trim();
  try {
    run(["init"]);
    run(["config", "user.name", "Galerina Test"]);
    run(["config", "user.email", "test@example.invalid"]);
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "extract.js"), "module.exports = {};\n", "utf8");
    run(["add", "src/extract.js"]);
    run(["commit", "-m", "source"]);
    renameSync(join(root, "src"), join(outside, "src"));
    symlinkSync(join(outside, "src"), join(root, "src"), "junction");
    assert.throws(() => readUpstreamSource(root), /source directory must be a regular directory/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("Hypha vendor reads raw HEAD bytes despite replacement refs", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-hypha-source-owner-replace-"));
  const run = (args) => execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  }).trim();
  try {
    run(["init"]);
    run(["config", "user.name", "Galerina Test"]);
    run(["config", "user.email", "test@example.invalid"]);
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "extract.js"), "module.exports = { value: 'raw' };\n", "utf8");
    run(["add", "src/extract.js"]);
    run(["commit", "-m", "raw"]);
    const rawCommit = run(["rev-parse", "HEAD"]);
    writeFileSync(join(root, "src", "extract.js"), "module.exports = { value: 'current' };\n", "utf8");
    run(["commit", "-am", "current"]);
    const currentCommit = run(["rev-parse", "HEAD"]);
    run(["replace", currentCommit, rawCommit]);
    assert.equal(
      readUpstreamSource(root).toString("utf8"),
      "module.exports = { value: 'current' };\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Hypha vendor accepts an explicit source-owner root and fails closed when it is absent", () => {
  const absent = join(tmpdir(), `hypha-source-owner-absent-${process.pid}`);
  const result = spawnSync(process.execPath, [
    SCRIPT,
    "--check",
    "--upstream",
    absent,
  ], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Hypha source-owner input or evidence is invalid/u);
  assert.doesNotMatch(result.stderr, /unknown argument/u);
  assert.doesNotMatch(result.stderr, new RegExp(absent.replaceAll("\\", "\\\\"), "u"));
});
