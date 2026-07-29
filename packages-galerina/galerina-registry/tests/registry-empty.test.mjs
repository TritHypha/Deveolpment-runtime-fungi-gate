import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const REGISTRY_CLI = join(REPOSITORY_ROOT, "scripts", "registry-index-cli.mjs");
const LIVE_REGISTRY = join(PACKAGE_ROOT, "packages");
const FIXED_ISSUED_AT = "2026-07-29T00:00:00Z";

function runRegistryCli(args) {
  return spawnSync(process.execPath, [REGISTRY_CLI, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  });
}

function withTempRegistry(run) {
  const root = mkdtempSync(join(tmpdir(), "galerina-registry-denial-"));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeManifest(root, relativeDirectory, text) {
  const path = join(root, relativeDirectory, "package.galerina.yaml");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
  return path;
}

const REVIEWED_BUT_UNSIGNED = `name: "@galerina/unsigned"
version: "1.0.0"
registry: "https://registry.galerina.dev"
capabilities:
  - audit.write
effects:
  - audit.write
installScript: null
hash: "sha256:${"a".repeat(64)}"
signature: null
publisher: "galerina-governance"
keyId: "package-key-1"
certificationLevel: "certified"
riskRating: "low"
governance:
  reviewed: true
  reviewedBy: "governance-authority"
  reviewedAt: "2026-07-29T00:00:00Z"
`;

test("an empty certified registry is terminally refused without an output", () =>
  withTempRegistry((registryRoot) => {
    const output = join(registryRoot, "index.json");
    const result = runRegistryCli([
      "build",
      "--registry-dir",
      registryRoot,
      "--issued-at",
      FIXED_ISSUED_AT,
      "--out",
      output,
    ]);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /REFUSED: no package\.galerina\.yaml manifests/);
    assert.equal(existsSync(output), false, "refusal must not publish a partial index");
  }));

test("a reviewed but unsigned package entry cannot enter an index", () =>
  withTempRegistry((registryRoot) => {
    writeManifest(registryRoot, join("@galerina", "unsigned"), REVIEWED_BUT_UNSIGNED);
    const output = join(registryRoot, "index.json");
    const result = runRegistryCli([
      "build",
      "--registry-dir",
      registryRoot,
      "--issued-at",
      FIXED_ISSUED_AT,
      "--out",
      output,
    ]);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /signature/i);
    assert.equal(existsSync(output), false, "unsigned refusal must not publish an index");
  }));

test("the live placeholder catalog remains un-signable", () =>
  withTempRegistry((registryRoot) => {
    const output = join(registryRoot, "index.json");
    const result = runRegistryCli([
      "build",
      "--registry-dir",
      LIVE_REGISTRY,
      "--issued-at",
      FIXED_ISSUED_AT,
      "--out",
      output,
    ]);

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /REFUSED: 2 of 2 manifest\(s\) fail the review gate/);
    assert.match(result.stderr, /deny-by-default: unreviewed/);
    assert.equal(existsSync(output), false);
  }));

test("the real admission seam refuses unknown packages and unsigned indexes", () => {
  const result = runRegistryCli(["--self-test"]);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /unlisted package → PACKAGE_UNKNOWN refusal/);
  assert.match(result.stdout, /unsigned index → UNSIGNED refusal/);
  assert.match(result.stdout, /registry-index-cli self-test: 16\/16 checks pass/);
});
