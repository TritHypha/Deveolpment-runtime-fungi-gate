import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  runOwnedProcess,
  runOwnedProcessSync,
} = require("../lib/owned-process-tree.cjs");
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(TEST_DIR, "..", "fixtures");

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function waitForDead(pid, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !isAlive(pid);
}

test("a normal owned command returns its exact output and exit", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: ["-e", "process.stdout.write('owned-ok')"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
  });

  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, "owned-ok");
  assert.equal(result.stderr, "");
  assert.equal(result.timedOut, false);
  assert.equal(result.cleanupAttempted, false);
});

test("timeout terminates the owned parent and grandchild", async () => {
  const result = await runOwnedProcess({
    command: process.execPath,
    args: [join(FIXTURES, "process-tree-parent.cjs")],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 300,
    cleanupGraceMs: 500,
  });

  assert.equal(result.timedOut, true);
  assert.equal(result.cleanupAttempted, true);
  assert.equal(result.cleanupAcknowledged, true, result.cleanupDetail);
  const identity = JSON.parse(result.stdout.trim().split(/\r?\n/)[0]);
  assert.equal(await waitForDead(identity.parentPid), true, "parent remained alive");
  assert.equal(await waitForDead(identity.childPid), true, "grandchild remained alive");
});

test("invalid command and timeout inputs refuse before spawning", async () => {
  await assert.rejects(
    runOwnedProcess({ command: "", args: [], cwd: FIXTURES, timeoutMs: 1 }),
    (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
  );
  await assert.rejects(
    runOwnedProcess({
      command: process.execPath,
      args: "not-an-array",
      cwd: FIXTURES,
      timeoutMs: 1,
    }),
    (error) => error.code === "OWNED-PROCESS-INPUT-INVALID",
  );
});

test("the synchronous adapter preserves owned output and exit semantics", () => {
  assert.equal(typeof runOwnedProcessSync, "function");
  const result = runOwnedProcessSync({
    command: process.execPath,
    args: ["-e", "process.stdout.write('sync-owned')"],
    cwd: FIXTURES,
    env: process.env,
    timeoutMs: 2_000,
  });

  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.error, undefined);
  assert.equal(result.stdout, "sync-owned");
  assert.equal(result.stderr, "");
  assert.equal(result.owned.cleanupAttempted, false);
});
