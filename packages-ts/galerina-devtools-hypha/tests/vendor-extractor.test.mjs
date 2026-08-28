import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { sourceOwnerRootFromCommonDir } from "../scripts/vendor-extractor.mjs";

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

test("Hypha vendor accepts an explicit source-owner root and fails closed when it is absent", () => {
  const result = spawnSync(process.execPath, [
    SCRIPT,
    "--check",
    "--upstream",
    join(tmpdir(), `hypha-source-owner-absent-${process.pid}`),
  ], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /upstream source is unavailable/u);
  assert.doesNotMatch(result.stderr, /unknown argument/u);
});
