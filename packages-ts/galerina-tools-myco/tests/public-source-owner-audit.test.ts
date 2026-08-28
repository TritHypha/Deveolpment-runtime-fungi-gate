import test from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";

import {
  compareSnapshot,
  equalSourceBytes,
  sourceOwnerRootFromCommonDir,
} from "../scripts/audit-public-source-owner.mjs";

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

test("public-source comparison ignores only CRLF checkout transport", () => {
  assert.equal(equalSourceBytes(Buffer.from("alpha\r\nbeta\r\n"), Buffer.from("alpha\nbeta\n")), true);
  assert.equal(equalSourceBytes(Buffer.from("alpha\r\nbeta\r\n"), Buffer.from("alpha\ngamma\n")), false);
});
