"use strict";

const MAX_TEST_CONCURRENCY = 4;
const DEFAULT_TEST_CONCURRENCY = 2;
const MAX_PACKAGE_CONCURRENCY = 2;

function policyError(message) {
  const error = new Error(message);
  error.code = "TEST-CONCURRENCY-INVALID";
  return error;
}

function parseTestConcurrency(value) {
  if (value === undefined) return DEFAULT_TEST_CONCURRENCY;
  if ((typeof value !== "string" && typeof value !== "number")
      || String(value).trim() === "") {
    throw policyError("Test concurrency must be an integer from one through four.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)
      || parsed < 1
      || parsed > MAX_TEST_CONCURRENCY) {
    throw policyError("Test concurrency must be an integer from one through four.");
  }
  return parsed;
}

function parsePackageConcurrency(value) {
  if (value === undefined) return MAX_PACKAGE_CONCURRENCY;
  if ((typeof value !== "string" && typeof value !== "number")
      || String(value).trim() === "") {
    const error = new Error("Package concurrency must be one or two.");
    error.code = "PACKAGE-CONCURRENCY-INVALID";
    throw error;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)
      || parsed < 1
      || parsed > MAX_PACKAGE_CONCURRENCY) {
    const error = new Error("Package concurrency must be one or two.");
    error.code = "PACKAGE-CONCURRENCY-INVALID";
    throw error;
  }
  return parsed;
}

function hasStandardNodeTest(testScript) {
  if (typeof testScript !== "string") return false;
  return /(?:^|&&|\|\||;)\s*node(?:\.exe)?\s+--test(?:\s|$)/.test(testScript);
}

function npmTestInvocation({
  platform,
  commandShell,
  testScript,
  concurrency,
}) {
  const bounded = hasStandardNodeTest(testScript);
  const limit = parseTestConcurrency(concurrency);
  const testArgs = bounded
    ? ["test", "--", `--test-concurrency=${limit}`]
    : ["test"];
  if (platform === "win32") {
    return {
      command: commandShell || "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "npm.cmd", ...testArgs],
      boundedNodeTest: bounded,
    };
  }
  return {
    command: "npm",
    args: testArgs,
    boundedNodeTest: bounded,
  };
}

module.exports = Object.freeze({
  DEFAULT_TEST_CONCURRENCY,
  MAX_PACKAGE_CONCURRENCY,
  MAX_TEST_CONCURRENCY,
  npmTestInvocation,
  parsePackageConcurrency,
  parseTestConcurrency,
});
