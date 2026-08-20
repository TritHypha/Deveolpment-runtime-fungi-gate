import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { authenticateDetachedAuthorityProvider } from "../lib/detached-authority-provider.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURES = resolve(ROOT, "scripts/tests/fixtures/detached-authority");
const EXPECTED_VERSION = "codebase-memory-mcp 0.9.0+dumpswap";
const PINNED_DIGEST = "445dff9d06d613a33a5943c17cc808eca438b1a4922140e9d73400f7ac84bd7f";

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function authenticate(executable, expectedDigest) {
  return authenticateDetachedAuthorityProvider({
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
