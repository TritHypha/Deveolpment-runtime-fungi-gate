import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const REGISTRY_CLI = join(REPOSITORY_ROOT, "scripts", "registry-index-cli.mjs");
const LIVE_REGISTRY = join(PACKAGE_ROOT, "packages");
const FIXED_ISSUED_AT = "2026-07-29T00:00:00Z";
const compilerRequire = createRequire(join(REPOSITORY_ROOT, "packages-galerina", "galerina-core-compiler", "package.json"));
const mlDsaModulePath = compilerRequire.resolve("@noble/post-quantum/ml-dsa.js");
const { ml_dsa65: mlDsa65 } = await import(pathToFileURL(mlDsaModulePath).href);

function runRegistryCli(args, env = process.env) {
  return spawnSync(process.execPath, [REGISTRY_CLI, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env,
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

const REVIEWED_AND_SIGNED = `name: "@galerina/ceremony-fixture"
version: "1.0.0"
registry: "https://registry.galerina.dev"
capabilities:
  - audit.write
effects:
  - audit.write
installScript: null
hash: "sha256:${"b".repeat(64)}"
signature: "fixture-package-signature"
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
  assert.match(result.stdout, /hybrid sign .* verify = verified/);
  assert.match(result.stdout, /missing ML-DSA-65 half .* UNSIGNED refusal/);
  assert.match(result.stdout, /registry-index-cli self-test: 20\/20 checks pass/);
});

test("the file-backed owner CLI emits and verifies only a hybrid v2 envelope", () =>
  withTempRegistry((registryRoot) => {
    writeManifest(registryRoot, join("@galerina", "ceremony-fixture"), REVIEWED_AND_SIGNED);
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const mlKeys = mlDsa65.keygen(randomBytes(32));
    const signingEnvPath = join(registryRoot, ".env.galerina-signing");
    const edPublicPath = join(registryRoot, "owner-ed25519-public.pem");
    const mlPublicPath = join(registryRoot, "owner-mldsa65-public.b64");
    const output = join(registryRoot, "signed-index.json");
    const edPrivatePem = privateKey.export({ type: "pkcs8", format: "pem" });
    writeFileSync(signingEnvPath, [
      "GALERINA_SIGNING_KEY_ID=registry-ceremony-test-1",
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${Buffer.from(edPrivatePem).toString("base64")}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${Buffer.from(mlKeys.secretKey).toString("base64")}`,
      "",
    ].join("\n"), { mode: 0o600 });
    writeFileSync(edPublicPath, publicKey.export({ type: "spki", format: "pem" }));
    writeFileSync(mlPublicPath, Buffer.from(mlKeys.publicKey).toString("base64"));

    const signed = runRegistryCli([
      "sign",
      "--registry-dir",
      registryRoot,
      "--issued-at",
      FIXED_ISSUED_AT,
      "--out",
      output,
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnvPath,
      GALERINA_SIGNING_KEY_ID: "registry-ceremony-test-1",
    });

    assert.equal(signed.status, 0, signed.stdout + signed.stderr);
    assert.match(signed.stdout, /both components self-verified/);
    const index = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(index.schema, "galerina-registry-index/v2");
    assert.equal(index.signature.algorithm, "Ed25519+ML-DSA-65");

    const verified = runRegistryCli([
      "verify",
      "--in",
      output,
      "--ed25519-pubkey",
      edPublicPath,
      "--mldsa65-pubkey",
      mlPublicPath,
      "--key-id",
      "registry-ceremony-test-1",
    ]);
    assert.equal(verified.status, 0, verified.stdout + verified.stderr);
    assert.match(verified.stdout, /^VERIFIED:/m);
  }));

test("a revoked registry authority is refused before private material is read", () =>
  withTempRegistry((registryRoot) => {
    writeManifest(registryRoot, join("@galerina", "ceremony-fixture"), REVIEWED_AND_SIGNED);
    const output = join(registryRoot, "must-not-exist.json");
    const result = runRegistryCli([
      "sign",
      "--registry-dir",
      registryRoot,
      "--issued-at",
      FIXED_ISSUED_AT,
      "--out",
      output,
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_KEY_PEM_PATH: join(registryRoot, "unread-ed25519.key"),
      GALERINA_REGISTRY_MLDSA65_PRIVATE_KEY_B64_PATH: join(registryRoot, "unread-mldsa65.key"),
      GALERINA_SIGNING_KEY_ID: "8eecf4187ebc9341",
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /registry authority keyId .* is revoked/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
    assert.equal(existsSync(output), false);
  }));
