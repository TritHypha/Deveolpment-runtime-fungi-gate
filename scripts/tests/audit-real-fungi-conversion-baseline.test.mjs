import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  BASELINE_SCHEMA,
  classifyFungiBaseline,
} from "../lib/real-fungi-conversion-baseline/core.mjs";

const CLI = join(import.meta.dirname, "..", "audit-real-fungi-conversion-baseline.mjs");

function write(root, path, content) {
  const target = join(root, ...path.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function run(root, command, args) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8" });
}

function git(root, args) {
  const result = run(root, "git", args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function fixtureRepo() {
  const root = mkdtempSync(join(tmpdir(), "galerina-real-fungi-baseline-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Galerina Test"]);
  git(root, ["config", "user.email", "test@invalid.example"]);
  write(root, "packages-galerina/real/src/constants.ts", "export const VALUE = \"BOUND\";\n");
  write(root, "packages-galerina/real/src/self-hosted/value.fungi", candidate("value", "packages-galerina/real/src/constants.ts#VALUE", "BOUND"));
  write(root, "packages-galerina/galerina-test/src/self-hosted/conversion-overlays/value.fungi", candidate("overlay", "packages-galerina/real/src/constants.ts#VALUE", "OVERLAY"));
  git(root, ["add", "--", "packages-galerina"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

const candidate = (flow, oracle, value = "A") => `@version 1
/// Non-authorizing sandbox candidate; TypeScript remains the oracle.
/// TypeScript oracle: ${oracle}
pure flow ${flow}() -> String {
  return "${value}"
}
`;

test("the baseline distinguishes real conversion, overlay, stale, unbound, native and shadow states", () => {
  const current = "sha256:" + "1".repeat(64);
  const prior = "sha256:" + "2".repeat(64);
  const report = classifyFungiBaseline({
    head: "a".repeat(40),
    fungi: [
      {
        path: "packages-galerina/real/src/self-hosted/bound.fungi",
        source: candidate("bound", "packages-galerina/real/src/bound.ts#BOUND", "BOUND"),
        introducedCommit: "b".repeat(40),
      },
      {
        path: "packages-galerina/galerina-test/src/self-hosted/conversion-overlays/wave01-bound.fungi",
        source: candidate("overlay", "packages-galerina/real/src/bound.ts#BOUND", "OVERLAY"),
        introducedCommit: "c".repeat(40),
      },
      {
        path: "packages-galerina/real/src/self-hosted/missing.fungi",
        source: candidate("missing", "packages-galerina/real/src/missing.ts#MISSING", "MISSING"),
        introducedCommit: "d".repeat(40),
      },
      {
        path: "packages-galerina/real/src/self-hosted/stale.fungi",
        source: candidate("stale", "packages-galerina/real/src/stale.ts#STALE", "STALE"),
        introducedCommit: "e".repeat(40),
      },
      {
        path: "packages-galerina/real/src/self-hosted/native.fungi",
        source: "@version 1\npure flow native() -> Int { return 1 }\n",
        introducedCommit: "f".repeat(40),
      },
      {
        path: "packages-galerina/real/src/self-hosted/shadow.fungi",
        source: candidate("renamed", "packages-galerina/real/src/other.ts#OTHER"),
        introducedCommit: "0".repeat(40),
      },
      {
        path: "packages-galerina/real/src/self-hosted/original.fungi",
        source: candidate("original", "packages-galerina/real/src/other.ts#OTHER"),
        introducedCommit: "9".repeat(40),
      },
    ],
    sourceStates: new Map([
      ["packages-galerina/real/src/bound.ts#BOUND", {
        present: true,
        symbolPresent: true,
        currentSha256: current,
        introducedSha256: current,
      }],
      ["packages-galerina/real/src/missing.ts#MISSING", {
        present: false,
        symbolPresent: false,
      }],
      ["packages-galerina/real/src/stale.ts#STALE", {
        present: true,
        symbolPresent: true,
        currentSha256: current,
        introducedSha256: prior,
      }],
      ["packages-galerina/real/src/other.ts#OTHER", {
        present: true,
        symbolPresent: true,
        currentSha256: current,
        introducedSha256: current,
      }],
    ]),
  });

  assert.equal(report.schema, BASELINE_SCHEMA);
  assert.equal(report.head, "a".repeat(40));
  assert.deepEqual(report.counts, {
    totalFungi: 7,
    realPackageFungi: 6,
    excludedTestOverlays: 1,
    conversionCandidates: 5,
    nativeFungi: 1,
    BOUND: 1,
    UNBOUND: 1,
    STALE: 1,
    SHADOWED: 2,
  });

  const byPath = new Map(report.entries.map((entry) => [entry.path, entry]));
  assert.equal(byPath.get("packages-galerina/real/src/self-hosted/bound.fungi").status, "BOUND");
  assert.equal(byPath.get("packages-galerina/real/src/self-hosted/missing.fungi").status, "UNBOUND");
  assert.equal(byPath.get("packages-galerina/real/src/self-hosted/stale.fungi").status, "STALE");
  assert.equal(byPath.get("packages-galerina/real/src/self-hosted/native.fungi").role, "NATIVE_FUNGI");
  assert.equal(byPath.get("packages-galerina/real/src/self-hosted/shadow.fungi").status, "SHADOWED");
  assert.equal(byPath.get("packages-galerina/real/src/self-hosted/original.fungi").status, "SHADOWED");
  assert.equal(byPath.has("packages-galerina/galerina-test/src/self-hosted/conversion-overlays/wave01-bound.fungi"), false);
  assert.deepEqual(report.excluded, [{
    path: "packages-galerina/galerina-test/src/self-hosted/conversion-overlays/wave01-bound.fungi",
    introducedCommit: "c".repeat(40),
    reason: "TEST_OVERLAY_NO_CONVERSION_CREDIT",
  }]);
  assert.deepEqual(report.fixtureDebt, {
    overlayPrefix: "packages-galerina/galerina-test/src/self-hosted/conversion-overlays/",
    fileCount: 1,
    introducingCommits: ["c".repeat(40)],
    conversionCredit: 0,
  });
  assert.equal(JSON.stringify(report).includes("pure flow"), false);
});

test("the baseline refuses malformed absolute and escaping paths", () => {
  for (const path of ["C:/repo/file.fungi", "../file.fungi", "/repo/file.fungi"]) {
    assert.throws(
      () => classifyFungiBaseline({
        head: "a".repeat(40),
        fungi: [{ path, source: "@version 1\npure flow x() -> Int { return 1 }\n", introducedCommit: "b".repeat(40) }],
        sourceStates: new Map(),
      }),
      /repository-relative/u,
    );
  }
});

test("the baseline output is stable regardless of input order", () => {
  const items = [
    { path: "packages-galerina/z/src/self-hosted/z.fungi", source: "@version 1\npure flow z() -> Int { return 1 }\n", introducedCommit: "b".repeat(40) },
    { path: "packages-galerina/a/src/self-hosted/a.fungi", source: "@version 1\npure flow a() -> Int { return 2 }\n", introducedCommit: "c".repeat(40) },
  ];
  const first = classifyFungiBaseline({ head: "a".repeat(40), fungi: items, sourceStates: new Map() });
  const second = classifyFungiBaseline({ head: "a".repeat(40), fungi: [...items].reverse(), sourceStates: new Map() });
  assert.deepEqual(first, second);
});

test("case-only repository paths are shadow defects even when bytes differ", () => {
  const report = classifyFungiBaseline({
    head: "a".repeat(40),
    fungi: [
      { path: "packages-galerina/p/src/self-hosted/Case.fungi", source: "@version 1\npure flow upper() -> Int { return 1 }\n", introducedCommit: "b".repeat(40) },
      { path: "packages-galerina/p/src/self-hosted/case.fungi", source: "@version 1\npure flow lower() -> Int { return 2 }\n", introducedCommit: "c".repeat(40) },
    ],
    sourceStates: new Map(),
  });
  assert.equal(report.counts.SHADOWED, 2);
  assert.ok(report.entries.every((entry) => entry.collision.kind === "CASE_PATH_SHADOW"));
});

test("the CLI self-tests before writing one body-free atomic report", () => {
  const root = fixtureRepo();
  const selfTest = run(root, process.execPath, [CLI, "--self-test"]);
  assert.equal(selfTest.status, 0, selfTest.stderr || selfTest.stdout);
  assert.match(selfTest.stdout, /self-test ALLOW/u);

  const out = "docs/reports/baseline.json";
  const result = run(root, process.execPath, [CLI, "--root", root, "--out", out]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(readFileSync(join(root, ...out.split("/")), "utf8"));
  assert.equal(report.counts.BOUND, 1);
  assert.equal(report.counts.excludedTestOverlays, 1);
  assert.equal(report.entries[0].path, "packages-galerina/real/src/self-hosted/value.fungi");
  assert.equal(JSON.stringify(report).includes(root), false);
  assert.equal(JSON.stringify(report).includes("pure flow"), false);

  const check = run(root, process.execPath, [CLI, "--root", root, "--out", out, "--check"]);
  assert.equal(check.status, 0, check.stderr || check.stdout);
  assert.match(check.stdout, /report current/u);

  git(root, ["add", "--", out]);
  git(root, ["commit", "-q", "-m", "record baseline"]);
  const committedCheck = run(root, process.execPath, [CLI, "--root", root, "--out", out, "--check"]);
  assert.equal(committedCheck.status, 0, committedCheck.stderr || committedCheck.stdout);
  assert.match(committedCheck.stdout, /report current/u);

  const freshnessOnly = run(root, process.execPath, [CLI, "--root", root, "--out", out, "--check-current"]);
  assert.equal(freshnessOnly.status, 0, freshnessOnly.stderr || freshnessOnly.stdout);
  assert.match(freshnessOnly.stdout, /report current/u);

  const collision = run(root, process.execPath, [CLI, "--root", root, "--out", out]);
  assert.equal(collision.status, 2);
  assert.match(collision.stderr, /REPORT_EXISTS/u);

  write(root, "packages-galerina/real/src/constants.ts", "export const VALUE = \"CHANGED\";\n");
  const staleFreshness = run(root, process.execPath, [CLI, "--root", root, "--out", out, "--check-current"]);
  assert.equal(staleFreshness.status, 1, staleFreshness.stderr || staleFreshness.stdout);
  assert.match(staleFreshness.stdout, /stale or missing/u);
});
