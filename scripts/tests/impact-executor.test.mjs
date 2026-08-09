import test from "node:test";
import assert from "node:assert/strict";

import { executeImpactPlan } from "../lib/impact-executor.mjs";

function plan(commands) {
  return {
    tool: "galerina-devtools-impact",
    schemaVersion: 1,
    status: "AFFECTED_SCOPE",
    fullRequired: false,
    authorizing: false,
    commands,
  };
}

test("impact executor runs commands sequentially and remains non-authorizing", async () => {
  let active = 0;
  let peak = 0;
  const seen = [];
  const report = await executeImpactPlan(plan([
    { id: "one", command: ["node", "one.mjs"] },
    { id: "two", command: ["node", "two.mjs"] },
  ]), {
    root: ".",
    runOwnedProcess: async ({ args }) => {
      active += 1;
      peak = Math.max(peak, active);
      seen.push(args[0]);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return {
        status: 0,
        signal: null,
        stdout: "ok",
        stderr: "",
        timedOut: false,
        outputLimitExceeded: false,
        cleanupAttempted: false,
        cleanupAcknowledged: false,
        cleanupDetail: "not required",
        spawnError: null,
      };
    },
  });
  assert.equal(peak, 1);
  assert.deepEqual(seen, ["one.mjs", "two.mjs"]);
  assert.equal(report.ok, true);
  assert.equal(report.authorizing, false);
  assert.equal(report.results.length, 2);
});

test("impact executor refuses malformed commands and full-required plans", async () => {
  let calls = 0;
  const runOwnedProcess = async () => { calls += 1; };
  const malformed = await executeImpactPlan(plan([
    { id: "bad", command: ["node", ""] },
  ]), { root: ".", runOwnedProcess });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, "IMPACT-COMMAND-MALFORMED");

  const full = await executeImpactPlan({
    ...plan([]),
    status: "FULL_REQUIRED",
    fullRequired: true,
  }, { root: ".", runOwnedProcess });
  assert.equal(full.ok, false);
  assert.equal(full.code, "IMPACT-FULL-REQUIRED");
  assert.equal(calls, 0);
});
