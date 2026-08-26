/**
 * Governance diff — git-ignored files must not become phantom "added" flows.
 *
 * Regression for the standing false EXPANSION: test suites strand generated
 * .fungi fixtures in gitignored build/, the diff's worktree walk picked them
 * up, and (absent from every ref) each read as an added flow — one declaring
 * network.outbound kept phase-close governance:diff permanently at
 * "WIDENS AUTHORITY — review required".
 *
 * Verifies excludeGitIgnored(): ignored files dropped, tracked and
 * untracked-but-not-ignored files kept, non-repo dirs left unchanged.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { excludeGitIgnored } from "../dist/git-ignore-filter.js";

const gitAvailable = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "galerina-govdiff-ignore-"));
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" }).status, 0);
  writeFileSync(join(dir, ".gitignore"), "build/\n");
  mkdirSync(join(dir, "build"));
  mkdirSync(join(dir, "src"));
  writeFileSync(
    join(dir, "src", "real.fungi"),
    "pure flow real(x: Int) -> Int contract { effects {} } { return x }\n",
  );
  writeFileSync(
    join(dir, "build", "stranded-fixture.fungi"),
    "guarded flow leftover(x: Int) -> Int contract { effects { network.outbound } } { return x }\n",
  );
  writeFileSync(
    join(dir, "untracked-new.fungi"),
    "pure flow brandNew(x: Int) -> Int contract { effects {} } { return x }\n",
  );
  return dir;
}

describe("governance diff — excludeGitIgnored", { skip: !gitAvailable && "git not available" }, () => {
  it("drops git-ignored files, keeps tracked and untracked-but-not-ignored ones", () => {
    const dir = makeRepo();
    try {
      const files = [
        join(dir, "src", "real.fungi"),
        join(dir, "build", "stranded-fixture.fungi"),
        join(dir, "untracked-new.fungi"),
      ];
      const kept = excludeGitIgnored(files, dir);
      assert.deepEqual(kept, [
        join(dir, "src", "real.fungi"),
        join(dir, "untracked-new.fungi"),
      ], "only the gitignored build/ fixture is dropped");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns the list unchanged outside a git repository", () => {
    const dir = mkdtempSync(join(tmpdir(), "galerina-govdiff-norepo-"));
    try {
      const file = join(dir, "loose.fungi");
      writeFileSync(file, "pure flow loose(x: Int) -> Int contract { effects {} } { return x }\n");
      assert.deepEqual(excludeGitIgnored([file], dir), [file]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns [] for an empty input without spawning git", () => {
    assert.deepEqual(excludeGitIgnored([], process.cwd()), []);
  });
});
