import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  REGISTRY_ARTIFACT_PROFILE,
  hashFlatPackageArtifact,
} from "../../../scripts/lib/registry-package-artifact.mjs";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const AUTHORITY_CLI = join(
  REPOSITORY_ROOT,
  "scripts",
  "registry-authority-cli.mjs",
);
const compilerRequire = createRequire(join(
  REPOSITORY_ROOT,
  "packages-ts",
  "galerina-core-compiler",
  "package.json",
));
const mlDsaModulePath =
  compilerRequire.resolve("@noble/post-quantum/ml-dsa.js");
const { ml_dsa65: mlDsa65 } =
  await import(pathToFileURL(mlDsaModulePath).href);

function run(args, env = process.env) {
  return spawnSync(process.execPath, [AUTHORITY_CLI, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env,
    timeout: 30_000,
    windowsHide: true,
  });
}

test("authority CLI disposable-key ceremony covers export, draft, sign, and verify", () => {
  const result = run(["--self-test"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /registry-authority-cli self-test: 9\/9/);
  assert.match(result.stdout, /wrong operational key id refused/);
  assert.match(result.stdout, /tampered delegation refused/);
});

test("authority CLI publishes no artifact without complete explicit arguments", () => {
  const output = join(PACKAGE_ROOT, "must-not-exist-delegation.json");
  const result = run(["draft", "--out", output]);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /REFUSED:/);
  assert.equal(existsSync(output), false);
});

test("file-backed disposable ceremony enforces distinct root and operational keys", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-ceremony-"));
  try {
    const rootId = "root-file-backed";
    const operationalId = "operational-file-backed";
    const root = generateKeyPairSync("ed25519");
    const rootMl = mlDsa65.keygen(randomBytes(32));
    const operationalEd = generateKeyPairSync("ed25519");
    const operationalMl = mlDsa65.keygen(randomBytes(32));
    const rootEnv = join(temp, "root.env");
    const operationalEnv = join(temp, "operational.env");
    const rootPublic = join(temp, "root.pub.pem");
    const rootMlPublic = join(temp, "root.mldsa.pub.b64");
    const operationalEdPublic = join(temp, "operational.pub.pem");
    const operationalMlPublic = join(temp, "operational.mldsa.pub.b64");
    const draft = join(temp, "delegation.unsigned.json");
    const signed = join(temp, "delegation.json");
    const rootPrivatePem = root.privateKey.export({ type: "pkcs8", format: "pem" });
    const operationalPrivatePem =
      operationalEd.privateKey.export({ type: "pkcs8", format: "pem" });
    writeFileSync(rootEnv, [
      `GALERINA_SIGNING_KEY_ID=${rootId}`,
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${Buffer.from(rootPrivatePem).toString("base64")}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${Buffer.from(rootMl.secretKey).toString("base64")}`,
      "",
    ].join("\n"));
    writeFileSync(operationalEnv, [
      `GALERINA_SIGNING_KEY_ID=${operationalId}`,
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${Buffer.from(operationalPrivatePem).toString("base64")}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${Buffer.from(operationalMl.secretKey).toString("base64")}`,
      "",
    ].join("\n"));
    writeFileSync(
      rootPublic,
      root.publicKey.export({ type: "spki", format: "pem" }),
    );
    writeFileSync(
      rootMlPublic,
      Buffer.from(rootMl.publicKey).toString("base64"),
    );

    const exported = run([
      "export-public",
      "--operational-key-id", operationalId,
      "--ed25519-out", operationalEdPublic,
      "--mldsa65-out", operationalMlPublic,
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: operationalEnv,
    });
    assert.equal(exported.status, 0, exported.stdout + exported.stderr);

    const drafted = run([
      "draft",
      "--root-key-id", rootId,
      "--operational-key-id", operationalId,
      "--ed25519-pubkey", operationalEdPublic,
      "--mldsa65-pubkey", operationalMlPublic,
      "--serial", "1",
      "--issued-at", "2026-07-30T10:00:00.000Z",
      "--not-before", "2026-07-30T10:00:00.000Z",
      "--not-after", "2027-07-30T10:00:00.000Z",
      "--out", draft,
    ]);
    assert.equal(drafted.status, 0, drafted.stdout + drafted.stderr);

    const rootSigned = run([
      "sign",
      "--in", draft,
      "--out", signed,
      "--root-key-id", rootId,
    ], {
      ...process.env,
      GALERINA_ROOT_SIGNING_ENV_PATH: rootEnv,
    });
    assert.equal(rootSigned.status, 0, rootSigned.stdout + rootSigned.stderr);

    const verified = run([
      "verify",
      "--in", signed,
      "--root-pubkey", rootPublic,
      "--root-mldsa65-pubkey", rootMlPublic,
      "--root-key-id", rootId,
      "--at", "2026-08-01T00:00:00.000Z",
      "--min-serial", "0",
    ]);
    assert.equal(verified.status, 0, verified.stdout + verified.stderr);
    const artifact = JSON.parse(readFileSync(signed, "utf8"));
    assert.equal(artifact.rootKeyId, rootId);
    assert.equal(artifact.operational.keyId, operationalId);
    assert.deepEqual(artifact.roles, [
      "package-manifest.sign",
      "registry-index.sign",
    ]);

    const workspace = join(temp, "packages-ts");
    const packageRoot = join(workspace, "fixture-package");
    mkdirSync(join(packageRoot, "src"), { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      `${JSON.stringify({
        name: "@galerina/fixture",
        version: "1.0.0",
      }, null, 2)}\n`,
    );
    writeFileSync(join(packageRoot, "LICENSE"), "Apache-2.0\n");
    writeFileSync(
      join(packageRoot, "src", "index.ts"),
      "export const fixture = true;\n",
    );
    const artifactFiles = ["LICENSE", "package.json", "src/index.ts"];
    const packageArtifact = hashFlatPackageArtifact({
      workspacePackagesDir: workspace,
      packageName: "@galerina/fixture",
      artifactProfile: REGISTRY_ARTIFACT_PROFILE,
      artifactFiles,
    });
    const unsignedManifest = join(temp, "package.unsigned.galerina.yaml");
    const signedManifest = join(temp, "package.galerina.yaml");
    writeFileSync(unsignedManifest, [
      'schema: "galerina-package-manifest/v1"',
      'name: "@galerina/fixture"',
      'version: "1.0.0"',
      'registry: "https://registry.galerina.dev"',
      `artifactProfile: "${REGISTRY_ARTIFACT_PROFILE}"`,
      "artifactFiles:",
      ...artifactFiles.map((path) => `  - "${path}"`),
      "capabilities:",
      '  - "crypto.verify"',
      "effects:",
      '  - "crypto.verify"',
      "installScript: null",
      `hash: "${packageArtifact.hash}"`,
      'publisher: "galerina-owner-governance"',
      `keyId: "${operationalId}"`,
      "signerKeyId: null",
      'certificationLevel: "verified"',
      'riskRating: "high"',
      "signature: null",
      "governance:",
      "  reviewed: true",
      '  reviewedBy: "galerina-owner-governance"',
      '  reviewedAt: "2026-07-30T10:30:00.000Z"',
      "",
    ].join("\n"));

    const manifestSigned = run([
      "sign-manifest",
      "--in", unsignedManifest,
      "--out", signedManifest,
      "--workspace-packages-dir", workspace,
      "--delegation", signed,
      "--root-pubkey", rootPublic,
      "--root-mldsa65-pubkey", rootMlPublic,
      "--root-key-id", rootId,
      "--operational-ed25519-pubkey", operationalEdPublic,
      "--operational-mldsa65-pubkey", operationalMlPublic,
      "--authority-at", "2026-08-01T00:00:00.000Z",
      "--min-delegation-serial", "0",
      "--operational-key-id", operationalId,
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: operationalEnv,
    });
    assert.equal(
      manifestSigned.status,
      0,
      manifestSigned.stdout + manifestSigned.stderr,
    );
    assert.match(manifestSigned.stdout, /SIGNED package manifest/);
    assert.equal(existsSync(signedManifest), true);

    const manifestVerified = run([
      "verify-manifest",
      "--in", signedManifest,
      "--workspace-packages-dir", workspace,
      "--delegation", signed,
      "--root-pubkey", rootPublic,
      "--root-mldsa65-pubkey", rootMlPublic,
      "--root-key-id", rootId,
      "--operational-ed25519-pubkey", operationalEdPublic,
      "--operational-mldsa65-pubkey", operationalMlPublic,
      "--authority-at", "2026-08-01T00:00:00.000Z",
      "--min-delegation-serial", "0",
      "--operational-key-id", operationalId,
    ]);
    assert.equal(
      manifestVerified.status,
      0,
      manifestVerified.stdout + manifestVerified.stderr,
    );
    assert.match(
      manifestVerified.stdout,
      /VERIFIED package manifest '@galerina\/fixture' version '1\.0\.0'/,
    );

    const futureApproval = join(temp, "package.future-approval.yaml");
    const futureOutput = join(temp, "must-not-exist-future-approval.yaml");
    writeFileSync(
      futureApproval,
      readFileSync(unsignedManifest, "utf8").replace(
        "2026-07-30T10:30:00.000Z",
        "2026-08-02T00:00:00.000Z",
      ),
    );
    const futureResult = run([
      "sign-manifest",
      "--in", futureApproval,
      "--out", futureOutput,
      "--workspace-packages-dir", workspace,
      "--delegation", signed,
      "--root-pubkey", rootPublic,
      "--root-mldsa65-pubkey", rootMlPublic,
      "--root-key-id", rootId,
      "--operational-ed25519-pubkey", operationalEdPublic,
      "--operational-mldsa65-pubkey", operationalMlPublic,
      "--authority-at", "2026-08-01T00:00:00.000Z",
      "--min-delegation-serial", "0",
      "--operational-key-id", operationalId,
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: operationalEnv,
    });
    assert.equal(futureResult.status, 1, futureResult.stdout + futureResult.stderr);
    assert.match(
      futureResult.stderr,
      /REFUSED: governance\.reviewedAt is later than authority-at/,
    );
    assert.equal(existsSync(futureOutput), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("root signing refuses a revoked delegated key before reading root private material", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-revoked-"));
  try {
    const draft = join(temp, "revoked-operational-draft.json");
    const output = join(temp, "must-not-exist.json");
    writeFileSync(draft, JSON.stringify({
      schema: "galerina-registry-delegation/v1",
      registry: "https://registry.galerina.dev",
      serial: 1,
      issuedAt: "2026-07-30T10:00:00.000Z",
      notBefore: "2026-07-30T10:00:00.000Z",
      notAfter: "2027-07-30T10:00:00.000Z",
      rootKeyId: "disposable-root",
      operational: {
        keyId: "8eecf4187ebc9341",
        algorithm: "Ed25519+ML-DSA-65",
        ed25519PublicKeySha256: "a".repeat(64),
        mlDsa65PublicKeySha256: "b".repeat(64),
      },
      roles: ["package-manifest.sign", "registry-index.sign"],
    }));
    const result = run([
      "sign",
      "--in", draft,
      "--out", output,
      "--root-key-id", "disposable-root",
    ], {
      ...process.env,
      GALERINA_ROOT_SIGNING_ENV_PATH: join(temp, "missing-root-private.env"),
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /keyId '8eecf4187ebc9341' is revoked/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("legacy Ed25519 operational files explain that a new hybrid key is required", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-legacy-"));
  try {
    const legacy = generateKeyPairSync("ed25519");
    const legacyId = "legacy-ed25519-only";
    const legacyEnv = join(temp, "legacy.env");
    const legacyPrivatePem =
      legacy.privateKey.export({ type: "pkcs8", format: "pem" });
    writeFileSync(legacyEnv, [
      `GALERINA_SIGNING_KEY_ID=${legacyId}`,
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${Buffer.from(legacyPrivatePem).toString("base64")}`,
      "",
    ].join("\n"));
    const result = run([
      "export-public",
      "--operational-key-id", legacyId,
      "--ed25519-out", join(temp, "must-not-exist.pem"),
      "--mldsa65-out", join(temp, "must-not-exist.b64"),
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: legacyEnv,
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /legacy Ed25519-only.*mint a new dedicated hybrid operational key/i,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("authority CLI inspects canonical signing structure without exposing private values", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-inspect-valid-"));
  try {
    const keyId = "operational-inspection";
    const secretMarker = "PRIVATE-MARKER-MUST-NOT-APPEAR";
    const signingEnv = join(temp, "operational.env");
    writeFileSync(signingEnv, [
      "# disposable structural-inspection fixture",
      `GALERINA_SIGNING_KEY_ID=${keyId}`,
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      "GALERINA_SIGNING_KEY_CREATED=2026-07-30T10:00:00.000Z",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${secretMarker}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${secretMarker}`,
      "",
    ].join("\n"));

    const result = run([
      "inspect-environment",
      "--operational-key-id", keyId,
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnv,
    });

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(
      result.stdout,
      /STRUCTURE OK: canonical UTF-8 signing environment has 5 unique fields/,
    );
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretMarker));
    assert.doesNotMatch(result.stdout + result.stderr, /operational\.env/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("authority CLI identifies non-UTF-8 signing structure without exposing contents", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-inspect-encoding-"));
  try {
    const secretMarker = "PRIVATE-UTF16-MARKER-MUST-NOT-APPEAR";
    const signingEnv = join(temp, "operational.env");
    writeFileSync(
      signingEnv,
      Buffer.from([
        "GALERINA_SIGNING_KEY_ID=operational-inspection",
        "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
        `GALERINA_SIGNING_PRIVATE_KEY_B64=${secretMarker}`,
        `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${secretMarker}`,
        "",
      ].join("\r\n"), "utf16le"),
    );

    const result = run([
      "inspect-environment",
      "--operational-key-id", "operational-inspection",
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnv,
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /REFUSED: signing environment must be UTF-8 without a byte-order mark/,
    );
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretMarker));
    assert.doesNotMatch(result.stdout + result.stderr, /operational\.env/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("authority CLI refuses a UTF-8 byte-order mark without exposing contents", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-inspect-bom-"));
  try {
    const secretMarker = "PRIVATE-BOM-MARKER-MUST-NOT-APPEAR";
    const signingEnv = join(temp, "operational.env");
    const content = Buffer.from([
      "GALERINA_SIGNING_KEY_ID=operational-inspection",
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${secretMarker}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${secretMarker}`,
      "",
    ].join("\n"), "utf8");
    writeFileSync(
      signingEnv,
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), content]),
    );

    const result = run([
      "inspect-environment",
      "--operational-key-id", "operational-inspection",
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnv,
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /REFUSED: signing environment must be UTF-8 without a byte-order mark/,
    );
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretMarker));
    assert.doesNotMatch(result.stdout + result.stderr, /operational\.env/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("authority CLI reports repeated signing field by name without exposing values", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-inspect-repeat-"));
  try {
    const secretMarker = "PRIVATE-REPEAT-MARKER-MUST-NOT-APPEAR";
    const signingEnv = join(temp, "operational.env");
    writeFileSync(signingEnv, [
      "GALERINA_SIGNING_KEY_ID=operational-inspection",
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${secretMarker}`,
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${secretMarker}-duplicate`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${secretMarker}`,
      "",
    ].join("\n"));

    const result = run([
      "inspect-environment",
      "--operational-key-id", "operational-inspection",
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnv,
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /REFUSED: signing environment repeats 'GALERINA_SIGNING_PRIVATE_KEY_B64' at line 4/,
    );
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretMarker));
    assert.doesNotMatch(result.stdout + result.stderr, /operational\.env/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("authority CLI reports malformed signing record by line without exposing contents", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-inspect-malformed-"));
  try {
    const secretMarker = "PRIVATE-MALFORMED-MARKER-MUST-NOT-APPEAR";
    const signingEnv = join(temp, "operational.env");
    writeFileSync(signingEnv, [
      "GALERINA_SIGNING_KEY_ID=operational-inspection",
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `THIS LINE HAS NO EQUALS ${secretMarker}`,
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${secretMarker}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${secretMarker}`,
      "",
    ].join("\n"));

    const result = run([
      "inspect-environment",
      "--operational-key-id", "operational-inspection",
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnv,
    });

    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /REFUSED: signing environment contains a malformed record at line 3; private values not shown/,
    );
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secretMarker));
    assert.doesNotMatch(result.stdout + result.stderr, /operational\.env/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("authority CLI refuses repeated command-line authority fields", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-authority-repeat-arg-"));
  try {
    const keyId = "operational-repeat-arg";
    const signingEnv = join(temp, "operational.env");
    writeFileSync(signingEnv, [
      `GALERINA_SIGNING_KEY_ID=${keyId}`,
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      "GALERINA_SIGNING_PRIVATE_KEY_B64=disposable",
      "GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=disposable",
      "",
    ].join("\n"));
    const result = run([
      "inspect-environment",
      "--operational-key-id", keyId,
      "--operational-key-id", "substituted-key",
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnv,
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /REFUSED: command line repeats '--operational-key-id'/,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
