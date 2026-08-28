import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareSnapshot,
  equalSourceBytes,
  git as auditedGit,
  localSourcePaths,
  parseArgs,
  sourceOwnerRootFromCommonDir,
} from "../scripts/audit-public-source-owner.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, "../scripts/audit-public-source-owner.mjs");

const expected = {
  upstreamFileCount: 2,
  exactFileCount: 1,
  divergentPaths: ["src/b.ts"],
  missingPaths: [],
  localOnlyPaths: ["src/local.ts"],
};

test("public-source owner audit accepts the exact declared partial fork", () => {
  const result = compareSnapshot({
    upstreamPaths: ["src/a.ts", "src/b.ts"],
    exactPaths: ["src/a.ts"],
    divergentPaths: ["src/b.ts"],
    missingPaths: [],
    localOnlyPaths: ["src/local.ts"],
  }, expected);
  assert.deepEqual(result.findings, []);
});

test("public-source owner audit turns red when divergence grows", () => {
  const result = compareSnapshot({
    upstreamPaths: ["src/a.ts", "src/b.ts"],
    exactPaths: [],
    divergentPaths: ["src/a.ts", "src/b.ts"],
    missingPaths: [],
    localOnlyPaths: ["src/local.ts"],
  }, expected);
  assert.ok(result.findings.some((finding) => finding.field === "exactFileCount"));
  assert.ok(result.findings.some((finding) => finding.field === "divergentPaths"));
});

test("public-source owner lookup follows the primary Git common directory from a linked worktree", () => {
  const commonDir = resolve(join("workspace", "Galerina", ".git"));
  assert.equal(
    sourceOwnerRootFromCommonDir(commonDir, "myco"),
    resolve(commonDir, "..", "..", "subprojects", "myco"),
  );
});

test("public-source owner lookup refuses a non-standard Git common directory", () => {
  assert.throws(
    () => sourceOwnerRootFromCommonDir(resolve(join("workspace", "Galerina", "git-data")), "myco"),
    /common directory must end in \.git/u,
  );
});

test("public-source owner lookup refuses a relative Git common directory", () => {
  assert.throws(
    () => sourceOwnerRootFromCommonDir(join("workspace", "Galerina", ".git"), "myco"),
    /common directory must be absolute/u,
  );
});

test("public-source comparison ignores only CRLF checkout transport", () => {
  assert.equal(equalSourceBytes(Buffer.from("alpha\r\nbeta\r\n"), Buffer.from("alpha\nbeta\n")), true);
  assert.equal(equalSourceBytes(Buffer.from("alpha\r\nbeta\r\n"), Buffer.from("alpha\ngamma\n")), false);
  assert.equal(equalSourceBytes(Buffer.from([0x80]), Buffer.from([0x81])), false);
  assert.equal(equalSourceBytes(Buffer.from("alpha\rbeta"), Buffer.from("alpha\nbeta")), false);
});

test("public-source arguments refuse unknown, duplicate and conflicting forms", () => {
  const upstream = resolve(join("workspace", "myco"));
  assert.deepEqual(parseArgs(["--json", "--upstream", upstream]), {
    json: true,
    selfTest: false,
    upstreamRoot: upstream,
  });
  assert.throws(() => parseArgs(["--upstreem", upstream]), /unknown argument/u);
  assert.throws(() => parseArgs(["--json", "--json"]), /duplicate --json/u);
  assert.throws(() => parseArgs(["--upstream", upstream, "--upstream", upstream]), /duplicate --upstream/u);
  assert.throws(() => parseArgs(["--self-test", "--json"]), /self-test cannot be combined/u);
  assert.throws(() => parseArgs(["--upstream", join("workspace", "myco")]), /must be absolute/u);
});

test("public-source CLI refusal is bounded and does not echo an owner path", () => {
  const secretPath = resolve(join(tmpdir(), `myco-owner-private-${process.pid}`));
  const result = spawnSync(process.execPath, [SCRIPT, "--upstreem", secretPath], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /public Myco source-owner input or evidence is invalid/u);
  assert.doesNotMatch(result.stderr, new RegExp(secretPath.replaceAll("\\", "\\\\"), "u"));
});

test("public-source inventory refuses symlinks instead of omitting them", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-myco-source-owner-"));
  try {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "index.ts"), "export {};\n", "utf8");
    symlinkSync("index.ts", join(root, "src", "local-link.ts"), "file");
    assert.throws(() => localSourcePaths(root), /source tree contains a symbolic link/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("public-source inventory refuses directory junctions instead of traversing them", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-myco-source-owner-junction-"));
  const outside = mkdtempSync(join(tmpdir(), "galerina-myco-source-owner-outside-"));
  try {
    writeFileSync(join(outside, "hidden.ts"), "export {};\n", "utf8");
    symlinkSync(outside, join(root, "src"), "junction");
    assert.throws(() => localSourcePaths(root), /source root must be a regular directory/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("public-source Git reads ignore replacement refs", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-myco-source-owner-replace-"));
  const run = (args: string[]) => execFileSync("git", args, {
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
    writeFileSync(join(root, "src", "index.ts"), "export const value = 'raw';\n", "utf8");
    run(["add", "src/index.ts"]);
    run(["commit", "-m", "raw"]);
    const rawCommit = run(["rev-parse", "HEAD"]);
    writeFileSync(join(root, "src", "index.ts"), "export const value = 'replacement';\n", "utf8");
    run(["commit", "-am", "replacement"]);
    const replacementCommit = run(["rev-parse", "HEAD"]);
    run(["replace", rawCommit, replacementCommit]);
    assert.equal(
      auditedGit(root, ["show", `${rawCommit}:src/index.ts`]),
      "export const value = 'raw';\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
