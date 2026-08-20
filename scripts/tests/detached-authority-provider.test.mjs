import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import * as provider from "../lib/detached-authority-provider.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURES = resolve(ROOT, "scripts/tests/fixtures/detached-authority");
const EXPECTED_VERSION = "codebase-memory-mcp 0.9.0+dumpswap";
const PINNED_DIGEST = "445dff9d06d613a33a5943c17cc808eca438b1a4922140e9d73400f7ac84bd7f";

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function authenticate(executable, expectedDigest) {
  return provider.authenticateDetachedAuthorityProvider({
    executable,
    expectedDigest,
    expectedVersion: EXPECTED_VERSION,
    cwd: ROOT,
    deadline: Date.now() + 10_000,
  });
}

test("missing and wrong-digest providers refuse authentication", async () => {
  const missing = await authenticate(resolve(FIXTURES, ".missing-provider"), PINNED_DIGEST);
  const wrongDigest = await authenticate(process.execPath, "0".repeat(64));

  assert.equal(missing, null);
  assert.equal(wrongDigest, null);
});

test("an authority-bearing provider command requires stable authenticated bytes", async () => {
  assert.equal(typeof provider.runAuthenticatedProviderCommand, "function");
  const temporaryRoot = mkdtempSync(resolve(FIXTURES, ".task-2-provider-command-"));
  const executable = resolve(temporaryRoot, process.platform === "win32" ? "provider.exe" : "provider");
  try {
    copyFileSync(process.execPath, executable);
    const result = await provider.runAuthenticatedProviderCommand({
      executable,
      expectedDigest: digest(executable),
      args: ["-e", "process.stdout.write('authenticated')"],
      cwd: ROOT,
      env: {},
      deadline: Date.now() + 10_000,
      timeoutMs: 5_000,
      maxOutputBytes: 4 * 1024,
    });

    assert.equal(result?.stdout, "authenticated");
    assert.equal(result?.status, 0);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("a provider command refuses when its authenticated snapshot changes during execution", async () => {
  assert.equal(typeof provider.runAuthenticatedProviderCommand, "function");
  const temporaryRoot = mkdtempSync(resolve(FIXTURES, ".task-2-provider-race-"));
  const executable = resolve(temporaryRoot, process.platform === "win32" ? "provider.exe" : "provider");
  try {
    copyFileSync(process.execPath, executable);
    const before = statSync(executable).mtimeMs;
    const result = await provider.runAuthenticatedProviderCommand({
      executable,
      expectedDigest: digest(executable),
      args: [
        "-e",
        "require('node:fs').utimesSync(process.execPath, new Date(1000), new Date(1000));",
      ],
      cwd: ROOT,
      env: {},
      deadline: Date.now() + 10_000,
      timeoutMs: 5_000,
      maxOutputBytes: 4 * 1024,
    });

    assert.notEqual(statSync(executable).mtimeMs, before);
    assert.equal(result, null);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("a provider with authenticated bytes but the wrong version refuses", async () => {
  const result = await authenticate(process.execPath, digest(process.execPath));

  assert.equal(result, null);
});

test("a symlinked provider refuses authentication", async (context) => {
  const temporaryRoot = mkdtempSync(resolve(FIXTURES, ".task-2-provider-link-"));
  const link = resolve(temporaryRoot, process.platform === "win32" ? "provider.exe" : "provider");
  try {
    try {
      symlinkSync(process.execPath, link, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("host does not permit creating a file symlink");
        return;
      }
      throw error;
    }
    const result = await authenticate(link, digest(process.execPath));
    assert.equal(result, null);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
