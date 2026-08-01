import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoSensitiveOutput,
  assertPlatformIdentity,
  buildFunctionalPlatformEvidence,
  classifyOperatingSystem,
  normalizePortableRelativePath,
  requireExecutable,
  validateEvidence,
} from "../platform-smoke.mjs";

test("Windows client, server, Linux distributions, and macOS remain distinct", () => {
  assert.equal(classifyOperatingSystem({
    platform: "win32",
    release: "10.0.19045",
    windowsProductType: "client",
  }), "windows-10");
  assert.equal(classifyOperatingSystem({
    platform: "win32",
    release: "10.0.22631",
    windowsProductType: "client",
  }), "windows-11");
  assert.equal(classifyOperatingSystem({
    platform: "win32",
    release: "10.0.20348",
    windowsProductType: "server",
  }), "windows-server-2022");
  assert.equal(classifyOperatingSystem({ platform: "linux", distributionId: "ubuntu" }), "ubuntu");
  assert.equal(classifyOperatingSystem({ platform: "darwin" }), "macos");
  assert.throws(
    () => classifyOperatingSystem({ platform: "win32", release: "10.0.22631" }),
    /PLATFORM-SMOKE-WINDOWS-EDITION-UNKNOWN/u,
  );
});

test("functional evidence v2 remains K3-neutral, public, and closed to six rows", () => {
  const rows = [
    "npm-binary",
    "workspace-discovery",
    "portable-path-contract",
    "compiler-build",
    "strict-fungi-check",
    "wasm-execution",
  ].map((name) => ({ name, status: "passed", durationMs: 1 }));
  const report = buildFunctionalPlatformEvidence({
    repositoryCommit: "a".repeat(40),
    operatingSystem: "windows-10",
    runnerClass: "local-unclassified",
    platformIdentity: { os: "win32", architecture: "x64" },
    distribution: { id: "windows", version: "10.0.19045" },
    nodeVersion: "v20.19.0",
    cleanWorkingTree: true,
    evidence: rows,
  });
  assert.equal(report.schema, "galerina.platform.functional-evidence.v2");
  assert.equal(report.evidenceClass, "FUNCTIONAL_PORTABILITY");
  assert.equal(report.verdict, 0);
  assert.equal(report.status, "PASS");
  assert.equal(report.authenticated, false);
  assert.equal(report.authorityReleased, false);
  assert.equal(report.productionAuthorizing, false);
  assert.equal(report.evidence.length, 6);
  assert.deepEqual(report.criticalWarnings, []);
  assert.equal(Object.isFrozen(report), true);
  assert.throws(
    () => buildFunctionalPlatformEvidence({
      repositoryCommit: "a".repeat(40),
      operatingSystem: "windows-10",
      runnerClass: "local-unclassified",
      platformIdentity: { os: "win32", architecture: "x64" },
      distribution: { id: "windows", version: "10.0.19045" },
      nodeVersion: "v20.19.0",
      cleanWorkingTree: false,
      evidence: rows,
    }),
    /PLATFORM-SMOKE-WORKTREE-DIRTY/u,
  );
});

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
