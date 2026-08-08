import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(TEST_DIR, "..", "run-phase-close.mjs");
const require = createRequire(import.meta.url);
const { acquireSuiteLease } = require("../lib/suite-run-lease.cjs");
const RESULT_MODULE = new URL("../lib/phase-close-result.mjs", import.meta.url);
const resultApi = await import(RESULT_MODULE).catch(() => ({}));
const runnerSource = readFileSync(RUNNER, "utf8");
const roots = [];

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function write(root, relativePath, contents) {
  const absolutePath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function fixture({ phaseClose = [], exhaustive = [] }) {
  const root = mkdtempSync(join(tmpdir(), "galerina-phase-close-"));
  roots.push(root);
  write(root, "governance/phase-close-commands.json", JSON.stringify({
    schemaVersion: 1,
    phaseClose,
    exhaustive,
  }));
  return root;
}

function run(root, ...args) {
  return spawnSync(
    process.execPath,
    [RUNNER, "--root", root, ...args, "--json"],
    { encoding: "utf8", timeout: 30_000 },
  );
}

test("one failed child makes phase-close exit non-zero", () => {
  const root = fixture({
    phaseClose: [
      { name: "green", command: ["node", "green.mjs"] },
      { name: "red", command: ["node", "red.mjs"] },
    ],
  });
  write(root, "green.mjs", "process.exit(0);\n");
  write(root, "red.mjs", "process.exit(7);\n");

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.deepEqual(report.failed, ["red"]);
  assert.equal(report.results[1].exitCode, 7);
  assert.deepEqual(report.results[0].processControl, {
    ownedTree: true,
    cleanupAttempted: false,
  });
});

test("each phase-close child has an observable start and end heartbeat", () => {
  const root = fixture({
    phaseClose: [{ name: "visible-gate", command: ["node", "visible.mjs"] }],
  });
  write(root, "visible.mjs", "process.exit(0);\n");

  const result = run(root);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /PHASE-CLOSE START visible-gate/);
  assert.match(result.stderr, /PHASE-CLOSE END visible-gate PASS/);
});

test("--report-only cannot describe a failed run as green", () => {
  const root = fixture({
    phaseClose: [{ name: "red", command: ["node", "red.mjs"] }],
  });
  write(root, "red.mjs", "process.exit(9);\n");

  const result = run(root, "--report-only");

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REPORT_ONLY_FAILED");
  assert.equal(report.authorizing, false);
  assert.deepEqual(report.failed, ["red"]);
});

test("exhaustive includes both phase-close and exhaustive commands", () => {
  const root = fixture({
    phaseClose: [{ name: "base", command: ["node", "base.mjs"] }],
    exhaustive: [{ name: "heavy", command: ["node", "heavy.mjs"] }],
  });
  write(root, "base.mjs", "process.exit(0);\n");
  write(root, "heavy.mjs", "process.exit(0);\n");

  const result = run(root, "--tier", "exhaustive");

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "PASS");
  assert.deepEqual(
    report.results.map((item) => item.name),
    ["base", "heavy"],
  );
});

test("a missing or malformed command result fails closed", () => {
  const root = fixture({
    phaseClose: [{
      name: "missing",
      command: ["node-command-that-does-not-exist", "x"],
    }],
  });

  const result = run(root);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.results[0].ok, false);
  assert.match(report.results[0].detail, /spawn|status|missing/i);
});

test("a Node test child uses its final pass summary instead of an unrelated total", () => {
  const root = fixture({
    phaseClose: [{ name: "tests:tooling", command: ["node", "tooling.mjs"] }],
  });
  write(root, "tooling.mjs", [
    `console.log("fixture total debt: 999");`,
    `console.log("pass 3");`,
    `console.log("fail 0");`,
  ].join("\n") + "\n");

  const result = run(root);

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results[0].detail, "3 tests pass");
});

test("malformed governance-diff JSON is an explicit failed result", () => {
  assert.equal(typeof resultApi.parseGovernanceDiff, "function");

  const malformed = resultApi.parseGovernanceDiff("{", {
    status: 0,
    signal: null,
    error: undefined,
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, "GOVERNANCE-DIFF-UNPARSEABLE");

  const clean = resultApi.parseGovernanceDiff(
    JSON.stringify({ changeClass: "neutral", summary: "no .fungi changes" }),
    { status: 0, signal: null, error: undefined },
  );
  assert.equal(clean.ok, true);
  assert.equal(clean.changeClass, "neutral");
});

test("live phase-close checks generated evidence without rewriting it", () => {
  assert.doesNotMatch(
    runnerSource,
    /spawnSync\(/,
    "every phase-close child must use the owned process-tree boundary",
  );
  assert.match(
    runnerSource,
    /run\("audit:node-floor", "node", \["scripts\/audit-node-dependencies\.mjs"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("graph:all", "node", \["scripts\/graph-all\.mjs", "--quiet", "--check"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("remote-shell-install", "node", \["scripts\/audit-remote-shell-install\.mjs"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("code-index", "node", \["scripts\/code-index\.mjs", "--check"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("code-registry", "node", \["scripts\/gen-code-registry\.mjs", "--check"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("code-catalog-coverage:selftest", "node", \["scripts\/audit-code-catalog-coverage\.mjs", "--self-test"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("code-catalog-coverage", "node", \["scripts\/audit-code-catalog-coverage\.mjs"\]\)/,
  );
  assert.match(
    runnerSource,
    /run\("r4-twin-hashes", "node", \["scripts\/gather-r4-twin-hashes\.mjs", "--verify-ledger"\]\)/,
  );
});

test("a held checkout lease refuses phase-close before any child starts", () => {
  const root = fixture({
    phaseClose: [{ name: "must-not-run", command: ["node", "must-not-run.mjs"] }],
  });
  write(
    root,
    "must-not-run.mjs",
    "import { writeFileSync } from 'node:fs'; writeFileSync('ran.txt', 'bad');\n",
  );
  const lease = acquireSuiteLease({ root, commandClass: "all-tests" });

  const result = run(root);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REFUSED");
  assert.equal(report.code, "SUITE-LEASE-HELD");
  assert.equal(existsSync(join(root, "ran.txt")), false);
  assert.equal(lease.release(), true);
});
