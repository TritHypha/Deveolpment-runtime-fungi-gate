import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoSensitiveOutput,
  assertPlatformIdentity,
  normalizePortableRelativePath,
  requireExecutable,
  validateEvidence,
} from "../platform-smoke.mjs";

test("portable repository paths refuse foreign separators, traversal, and absolutes", () => {
  assert.equal(
    normalizePortableRelativePath("examples/wasm-hello-world/greet.fungi"),
    "examples/wasm-hello-world/greet.fungi",
  );
  assert.throws(
    () => normalizePortableRelativePath("examples\\wasm-hello-world\\greet.fungi"),
    /PLATFORM-SMOKE-PATH-SEPARATOR/,
  );
  assert.throws(
    () => normalizePortableRelativePath("../outside.fungi"),
    /PLATFORM-SMOKE-PATH-TRAVERSAL/,
  );
  assert.throws(
    () => normalizePortableRelativePath("/absolute/path.fungi"),
    /PLATFORM-SMOKE-PATH-ABSOLUTE/,
  );
});

test("a missing required executable is terminally refused", () => {
  assert.throws(
    () =>
      requireExecutable("missing-tool", () => ({
        status: null,
        stdout: "",
        stderr: "",
        error: Object.assign(new Error("not found"), { code: "ENOENT" }),
      })),
    /PLATFORM-SMOKE-BINARY-MISSING/,
  );
});

test("unknown platform and architecture identities are refused", () => {
  assert.deepEqual(assertPlatformIdentity("win32", "x64"), {
    os: "win32",
    architecture: "x64",
  });
  assert.throws(
    () => assertPlatformIdentity("haiku", "x64"),
    /PLATFORM-SMOKE-PLATFORM-UNKNOWN/,
  );
  assert.throws(
    () => assertPlatformIdentity("linux", "mips"),
    /PLATFORM-SMOKE-ARCH-UNKNOWN/,
  );
});

test("empty, failed, or duplicate evidence cannot become a green report", () => {
  assert.throws(() => validateEvidence([]), /PLATFORM-SMOKE-EVIDENCE-EMPTY/);
  assert.throws(
    () => validateEvidence([{ name: "compiler-build", status: "failed", durationMs: 1 }]),
    /PLATFORM-SMOKE-EVIDENCE-FAILED/,
  );
  assert.throws(
    () =>
      validateEvidence([
        { name: "compiler-build", status: "passed", durationMs: 1 },
        { name: "compiler-build", status: "passed", durationMs: 2 },
      ]),
    /PLATFORM-SMOKE-EVIDENCE-DUPLICATE/,
  );
});

test("structured output refuses local paths and secret-shaped fields", () => {
  assert.doesNotThrow(() =>
    assertNoSensitiveOutput(
      JSON.stringify({
        schemaVersion: 1,
        platform: { os: "win32", architecture: "x64" },
        evidence: [{ name: "compiler-build", status: "passed", durationMs: 1 }],
      }),
    ),
  );
  assert.throws(
    () => assertNoSensitiveOutput('{"cwd":"C:\\\\Users\\\\owner\\\\repo"}'),
    /PLATFORM-SMOKE-OUTPUT-PATH/,
  );
  assert.throws(
    () => assertNoSensitiveOutput('{"privateKey":"do-not-print"}'),
    /PLATFORM-SMOKE-OUTPUT-SECRET/,
  );
});
