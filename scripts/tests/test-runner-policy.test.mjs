import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptsRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const {
  npmTestInvocation,
  parseTestConcurrency,
} = require("../lib/test-runner-policy.cjs");

test("test concurrency accepts only the closed range one through four", () => {
  assert.equal(parseTestConcurrency(undefined), 4);
  assert.equal(parseTestConcurrency("1"), 1);
  assert.equal(parseTestConcurrency("4"), 4);

  for (const value of ["0", "5", "-1", "1.5", "x", "", null]) {
    assert.throws(
      () => parseTestConcurrency(value),
      (error) => error.code === "TEST-CONCURRENCY-INVALID",
    );
  }
});

test("a standard Windows node test receives the bounded npm argument", () => {
  assert.deepEqual(npmTestInvocation({
    platform: "win32",
    commandShell: "C:\\Windows\\System32\\cmd.exe",
    testScript: "npm run build && node --test tests/*.test.mjs",
    concurrency: 3,
  }), {
    command: "C:\\Windows\\System32\\cmd.exe",
    args: [
      "/d",
      "/s",
      "/c",
      "npm.cmd",
      "test",
      "--",
      "--test-concurrency=3",
    ],
    boundedNodeTest: true,
  });
});

test("a standard POSIX node test receives the bounded npm argument", () => {
  assert.deepEqual(npmTestInvocation({
    platform: "linux",
    testScript: "node --test test/*.test.mjs",
    concurrency: 2,
  }), {
    command: "npm",
    args: ["test", "--", "--test-concurrency=2"],
    boundedNodeTest: true,
  });
});

test("a custom package runner receives no Node-only argument", () => {
  assert.deepEqual(npmTestInvocation({
    platform: "win32",
    commandShell: "cmd.exe",
    testScript: "node scripts/run-tests.mjs",
    concurrency: 4,
  }), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd", "test"],
    boundedNodeTest: false,
  });
});

test("phase-close bounds its repository-wide tooling test workers", () => {
  const source = readFileSync(join(scriptsRoot, "run-phase-close.mjs"), "utf8");
  assert.match(
    source,
    /run\("tests:tooling",\s*"node",\s*\["--test",\s*"--test-concurrency=4",\s*\.\.\.toolingTests\]\)/,
    "the direct Node tooling suite must not inherit the host CPU count as its worker ceiling",
  );
});
