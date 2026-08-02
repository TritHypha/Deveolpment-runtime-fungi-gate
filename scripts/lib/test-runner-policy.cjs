"use strict";

const MAX_TEST_CONCURRENCY = 4;

function policyError(message) {
  const error = new Error(message);
  error.code = "TEST-CONCURRENCY-INVALID";
  return error;
}

function parseTestConcurrency(value) {
  if (value === undefined) return MAX_TEST_CONCURRENCY;
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
  MAX_TEST_CONCURRENCY,
  npmTestInvocation,
  parseTestConcurrency,
});
