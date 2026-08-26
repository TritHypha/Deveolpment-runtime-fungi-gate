import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign as edSign,
} from "node:crypto";
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
import {
  REGISTRY_DELEGATION_V1_CONTEXT,
  REGISTRY_PACKAGE_MANIFEST_V1_CONTEXT,
  buildRegistryAuthorityDelegation,
  signRegistryAuthorityDelegation,
  signRegistryPackageManifest,
} from "../../galerina-framework-app-kernel/dist/index.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const GIT_ATTRIBUTES = join(REPOSITORY_ROOT, ".gitattributes");
const REGISTRY_CLI = join(REPOSITORY_ROOT, "scripts", "registry-index-cli.mjs");
const LIVE_REGISTRY = join(PACKAGE_ROOT, "packages");
const LIVE_SIGNED_INDEX = join(PACKAGE_ROOT, "registry-index-v2.json");
const LIVE_AUTH_MANIFEST = join(
  LIVE_REGISTRY,
  "@galerina",
  "auth",
  "package.galerina.yaml",
);
const AUTH_CANDIDATE = join(
  PACKAGE_ROOT,
  "candidates",
  "@galerina",
  "auth",
  "package.galerina.yaml",
);
const LIVE_DELEGATION = join(
  REPOSITORY_ROOT,
  "governance",
  "registry-delegation-f3172a48372bfb23-v1.json",
);
const LIVE_ROOT_ED_PUBLIC = join(
  REPOSITORY_ROOT,
  "governance",
  "signing-key-21415420b447e219.pub.pem",
);
const LIVE_ROOT_ML_PUBLIC = join(
  REPOSITORY_ROOT,
  "governance",
  "signing-key-21415420b447e219.mldsa.pub.b64",
);
const LIVE_OPERATIONAL_ED_PUBLIC = join(
  REPOSITORY_ROOT,
  "governance",
  "signing-key-f3172a48372bfb23.pub.pem",
);
const LIVE_OPERATIONAL_ML_PUBLIC = join(
  REPOSITORY_ROOT,
  "governance",
  "signing-key-f3172a48372bfb23.mldsa.pub.b64",
);
const AUTH_PACKAGE_FILES = [
  "LICENSE",
  "README.md",
  "package-lock.json",
  "package.json",
  "src/authorization.ts",
  "src/bearer.ts",
  "src/channel.ts",
  "src/compose.ts",
  "src/credential.ts",
  "src/index.ts",
  "src/verdict.ts",
  "tests/authorization.test.mjs",
  "tests/bearer.test.mjs",
  "tests/channel.test.mjs",
  "tests/compose.test.mjs",
  "tests/credential.test.mjs",
  "tests/kernel-integration.test.mjs",
  "tsconfig.json",
];
const FIXED_ISSUED_AT = "2026-08-01T00:00:00.000Z";
const LIVE_INDEX_ISSUED_AT = "2026-07-30T16:33:10.307Z";
const ROOT_KEY_ID = "registry-root-disposable-1";
const OPERATIONAL_KEY_ID = "registry-operational-disposable-1";
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

const delegationMlOptions = {
  context: new TextEncoder().encode(REGISTRY_DELEGATION_V1_CONTEXT),
};
const manifestMlOptions = {
  context: new TextEncoder().encode(REGISTRY_PACKAGE_MANIFEST_V1_CONTEXT),
};

function runRegistryCli(args, env = process.env) {
  return spawnSync(process.execPath, [REGISTRY_CLI, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env,
    timeout: 60_000,
    windowsHide: true,
  });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function publicFacts(edPublicKey, mlPublicKey) {
  return {
    ed25519PublicKeySha256: sha256(
      edPublicKey.export({ type: "spki", format: "der" }),
    ),
    mlDsa65PublicKeySha256: sha256(mlPublicKey),
  };
}

function manifestYaml(manifest) {
  const lines = [
    `schema: ${JSON.stringify(manifest.schema)}`,
    `name: ${JSON.stringify(manifest.name)}`,
    `version: ${JSON.stringify(manifest.version)}`,
    `registry: ${JSON.stringify(manifest.registry)}`,
    `artifactProfile: ${JSON.stringify(manifest.artifactProfile)}`,
    "artifactFiles:",
    ...manifest.artifactFiles.map((value) => `  - ${JSON.stringify(value)}`),
    "capabilities:",
    ...manifest.capabilities.map((value) => `  - ${JSON.stringify(value)}`),
    "effects:",
    ...manifest.effects.map((value) => `  - ${JSON.stringify(value)}`),
    "installScript: null",
    `hash: ${JSON.stringify(manifest.hash)}`,
    `publisher: ${JSON.stringify(manifest.publisher)}`,
    `keyId: ${JSON.stringify(manifest.keyId)}`,
    `signerKeyId: ${JSON.stringify(manifest.signerKeyId)}`,
    `certificationLevel: ${JSON.stringify(manifest.certificationLevel)}`,
    `riskRating: ${JSON.stringify(manifest.riskRating)}`,
    `signature: ${JSON.stringify(manifest.signature)}`,
    "governance:",
    `  reviewed: ${manifest.governance.reviewed ? "true" : "false"}`,
    `  reviewedBy: ${JSON.stringify(manifest.governance.reviewedBy)}`,
    `  reviewedAt: ${JSON.stringify(manifest.governance.reviewedAt)}`,
    "",
  ];
  return lines.join("\n");
}

function createFixture({
  packages = ["@galerina/example"],
  rootKeyId = ROOT_KEY_ID,
  operationalKeyId = OPERATIONAL_KEY_ID,
  roles = ["package-manifest.sign", "registry-index.sign"],
  serial = 1,
  notBefore = "2026-07-30T00:00:00.000Z",
  notAfter = "2027-07-30T00:00:00.000Z",
  reviewedAt = "2026-07-30T00:00:00.000Z",
} = {}) {
  const temp = mkdtempSync(join(tmpdir(), "galerina-registry-chain-"));
  const registryRoot = join(temp, "registry");
  const workspacePackagesDir = join(temp, "packages-ts");
  const output = join(temp, "index.json");
  mkdirSync(registryRoot);
  mkdirSync(workspacePackagesDir);

  const rootEd = generateKeyPairSync("ed25519");
  const rootMl = mlDsa65.keygen(randomBytes(32));
  const operationalEd = generateKeyPairSync("ed25519");
  const operationalMl = mlDsa65.keygen(randomBytes(32));
  const rootEdPublicPath = join(temp, "root.ed25519.pub.pem");
  const rootMlPublicPath = join(temp, "root.mldsa65.pub.b64");
  const operationalEdPublicPath =
    join(temp, "operational.ed25519.pub.pem");
  const operationalMlPublicPath =
    join(temp, "operational.mldsa65.pub.b64");
  const delegationPath = join(temp, "delegation.json");

  writeFileSync(
    rootEdPublicPath,
    rootEd.publicKey.export({ type: "spki", format: "pem" }),
  );
  writeFileSync(
    rootMlPublicPath,
    `${Buffer.from(rootMl.publicKey).toString("base64")}\n`,
  );
  writeFileSync(
    operationalEdPublicPath,
    operationalEd.publicKey.export({ type: "spki", format: "pem" }),
  );
  writeFileSync(
    operationalMlPublicPath,
    `${Buffer.from(operationalMl.publicKey).toString("base64")}\n`,
  );

  const facts = publicFacts(operationalEd.publicKey, operationalMl.publicKey);
  const unsignedDelegation = buildRegistryAuthorityDelegation({
    registry: "https://registry.galerina.dev",
    serial,
    issuedAt: "2026-07-30T00:00:00.000Z",
    notBefore,
    notAfter,
    rootKeyId,
    operational: {
      keyId: operationalKeyId,
      algorithm: "Ed25519+ML-DSA-65",
      ...facts,
    },
    roles,
  });
  const delegation = signRegistryAuthorityDelegation(
    unsignedDelegation,
    (message) => edSign(null, message, rootEd.privateKey).toString("base64"),
    (message) => Buffer.from(
      mlDsa65.sign(message, rootMl.secretKey, delegationMlOptions),
    ).toString("base64"),
  );
  writeFileSync(
    delegationPath,
    `${JSON.stringify(delegation, null, 2)}\n`,
  );

  const manifestPaths = [];
  const packageRoots = [];
  for (const [index, packageName] of packages.entries()) {
    const packageDirectory = `fixture-${index}`;
    const packageRoot = join(workspacePackagesDir, packageDirectory);
    const packageVersion = "1.0.0";
    mkdirSync(join(packageRoot, "src"), { recursive: true });
    writeFileSync(
      join(packageRoot, "package.json"),
      `${JSON.stringify({
        name: packageName,
        version: packageVersion,
      }, null, 2)}\n`,
    );
    writeFileSync(join(packageRoot, "LICENSE"), "Apache-2.0\n");
    writeFileSync(
      join(packageRoot, "src", "index.ts"),
      `export const fixture = ${index};\n`,
    );
    const artifactFiles = ["LICENSE", "package.json", "src/index.ts"];
    const artifact = hashFlatPackageArtifact({
      workspacePackagesDir,
      packageName,
      artifactProfile: REGISTRY_ARTIFACT_PROFILE,
      artifactFiles,
    });
    const signedManifest = signRegistryPackageManifest(
      {
        schema: "galerina-package-manifest/v1",
        name: packageName,
        version: packageVersion,
        registry: "https://registry.galerina.dev",
        artifactProfile: REGISTRY_ARTIFACT_PROFILE,
        artifactFiles,
        capabilities: ["audit.write"],
        effects: ["audit.write"],
        installScript: null,
        hash: artifact.hash,
        publisher: "galerina-governance",
        keyId: operationalKeyId,
        certificationLevel: "certified",
        riskRating: "low",
        governance: {
          reviewed: true,
          reviewedBy: "disposable-review-authority",
          reviewedAt,
        },
      },
      operationalKeyId,
      (message) =>
        edSign(null, message, operationalEd.privateKey).toString("base64"),
      (message) => Buffer.from(
        mlDsa65.sign(message, operationalMl.secretKey, manifestMlOptions),
      ).toString("base64"),
    );
    const manifestPath = join(
      registryRoot,
      packageDirectory,
      "package.galerina.yaml",
    );
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, manifestYaml(signedManifest));
    manifestPaths.push(manifestPath);
    packageRoots.push(packageRoot);
  }

  return {
    temp,
    registryRoot,
    workspacePackagesDir,
    output,
    rootKeyId,
    operationalKeyId,
    rootEdPublicPath,
    rootMlPublicPath,
    operationalEdPublicPath,
    operationalMlPublicPath,
    delegationPath,
    manifestPaths,
    packageRoots,
    operationalEd,
    operationalMl,
  };
}

function authorityArgs(fixture, extra = []) {
  const overrides = new Set(
    extra.filter((value) => value.startsWith("--")),
  );
  const defaults = [
    ["--workspace-packages-dir", fixture.workspacePackagesDir],
    ["--delegation", fixture.delegationPath],
    ["--root-pubkey", fixture.rootEdPublicPath],
    ["--root-mldsa65-pubkey", fixture.rootMlPublicPath],
    ["--root-key-id", fixture.rootKeyId],
    ["--operational-ed25519-pubkey", fixture.operationalEdPublicPath],
    ["--operational-mldsa65-pubkey", fixture.operationalMlPublicPath],
    ["--authority-at", FIXED_ISSUED_AT],
    ["--min-delegation-serial", "0"],
  ];
  return [
    ...defaults
      .filter(([name]) => !overrides.has(name))
      .flat(),
    ...extra,
  ];
}

function runBuild(fixture, extra = []) {
  return runRegistryCli([
    "build",
    "--registry-dir", fixture.registryRoot,
    "--registry", "https://registry.galerina.dev",
    "--issued-at", FIXED_ISSUED_AT,
    "--out", fixture.output,
    ...authorityArgs(fixture, extra),
  ]);
}

function withFixture(options, run) {
  const fixture = createFixture(options);
  try {
    return run(fixture);
  } finally {
    rmSync(fixture.temp, { recursive: true, force: true });
  }
}

test("an empty certified registry is terminally refused without output", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-registry-empty-"));
  try {
    const output = join(temp, "index.json");
    const result = runRegistryCli([
      "build",
      "--registry-dir", temp,
      "--issued-at", FIXED_ISSUED_AT,
      "--out", output,
    ]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /REFUSED: no package\.galerina\.yaml manifests/);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("a valid disposable root-to-package chain builds one unsigned index", () =>
  withFixture({}, (fixture) => {
    const result = runBuild(fixture);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const index = JSON.parse(readFileSync(fixture.output, "utf8"));
    assert.equal(index.schema, "galerina-registry-index/v2");
    assert.equal(index.signature, undefined);
    assert.equal(index.entries.length, 1);
    assert.equal(index.entries[0].name, "@galerina/example");
  }));

test("a cryptographically valid future-dated governance review is refused", () =>
  withFixture({
    reviewedAt: "2026-08-02T00:00:00.000Z",
  }, (fixture) => {
    const result = runBuild(fixture);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /governance\.reviewedAt is later than authority-at/,
    );
    assert.equal(existsSync(fixture.output), false);
  }));

test("missing public authority inputs and duplicate manifest facts refuse", async (t) => {
  await t.test("missing operational ML-DSA-65 public input", () =>
    withFixture({}, (fixture) => {
      const args = authorityArgs(fixture);
      const missingIndex = args.indexOf("--operational-mldsa65-pubkey");
      args.splice(missingIndex, 2);
      const result = runRegistryCli([
        "build",
        "--registry-dir", fixture.registryRoot,
        "--issued-at", FIXED_ISSUED_AT,
        "--out", fixture.output,
        ...args,
      ]);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /build authority is incomplete/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  await t.test("duplicate signed manifest identity", () =>
    withFixture({}, (fixture) => {
      writeFileSync(
        fixture.manifestPaths[0],
        `${readFileSync(fixture.manifestPaths[0], "utf8")}name: "@attacker/repeated"\n`,
      );
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /repeats top-level field 'name'/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  await t.test("duplicate command-line authority option", () =>
    withFixture({}, (fixture) => {
      const result = runRegistryCli([
        "build",
        "--registry-dir", fixture.registryRoot,
        "--issued-at", FIXED_ISSUED_AT,
        "--out", fixture.output,
        ...authorityArgs(fixture),
        "--root-key-id", fixture.rootKeyId,
      ]);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /repeats '--root-key-id'/i);
      assert.equal(existsSync(fixture.output), false);
    }));
});

test("content mutation, fake signatures, and a missing ML-DSA half refuse", async (t) => {
  await t.test("content mutation", () =>
    withFixture({}, (fixture) => {
      writeFileSync(
        join(fixture.packageRoots[0], "src", "index.ts"),
        "export const fixture = 'tampered';\n",
      );
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /artifact digest does not match/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  for (const [name, mutate, expected] of [
    [
      "structurally non-empty fake signature",
      (manifest) => ({ ...manifest, signature: "fixture-package-signature" }),
      /hybrid package envelope|dual-signature envelope|malformed/i,
    ],
    [
      "missing ML-DSA-65 half",
      (manifest) => ({
        ...manifest,
        signature: `${manifest.signature.split(".").slice(0, 2).join(".")}.`,
      }),
      /hybrid package envelope|dual-signature envelope|malformed/i,
    ],
  ]) {
    await t.test(name, () =>
      withFixture({}, (fixture) => {
        const parsed = parseTestManifest(
          readFileSync(fixture.manifestPaths[0], "utf8"),
        );
        writeFileSync(fixture.manifestPaths[0], manifestYaml(mutate(parsed)));
        const result = runBuild(fixture);
        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(result.stderr, expected);
        assert.equal(existsSync(fixture.output), false);
      }));
  }
});

test("public-key substitution and delegation tampering refuse", async (t) => {
  await t.test("wrong operational public key", () =>
    withFixture({}, (fixture) => {
      const wrong = generateKeyPairSync("ed25519");
      writeFileSync(
        fixture.operationalEdPublicPath,
        wrong.publicKey.export({ type: "spki", format: "pem" }),
      );
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /fingerprint|operational/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  await t.test("changed signed delegation", () =>
    withFixture({}, (fixture) => {
      const delegation = JSON.parse(readFileSync(fixture.delegationPath));
      delegation.operational.keyId = "attacker";
      writeFileSync(
        fixture.delegationPath,
        `${JSON.stringify(delegation, null, 2)}\n`,
      );
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /delegation|signature/i);
      assert.equal(existsSync(fixture.output), false);
    }));
});

test("delegation role, active window, serial, and revocation are fail-closed", async (t) => {
  await t.test("missing package-manifest role", () =>
    withFixture({ roles: ["registry-index.sign"] }, (fixture) => {
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /role/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  await t.test("expired delegation", () =>
    withFixture({
      notBefore: "2025-01-01T00:00:00.000Z",
      notAfter: "2026-07-31T00:00:00.000Z",
    }, (fixture) => {
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /not active/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  await t.test("stale delegation serial", () =>
    withFixture({}, (fixture) => {
      const result = runBuild(
        fixture,
        ["--min-delegation-serial", "1"],
      );
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /serial|stale/i);
      assert.equal(existsSync(fixture.output), false);
    }));

  await t.test("revoked operational identity", () =>
    withFixture({
      operationalKeyId: "8eecf4187ebc9341",
    }, (fixture) => {
      const result = runBuild(fixture);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /revoked/i);
      assert.equal(existsSync(fixture.output), false);
    }));
});

test("one bad manifest poisons a multi-package build", () =>
  withFixture({
    packages: ["@galerina/example", "@galerina/second"],
  }, (fixture) => {
    writeFileSync(
      join(fixture.packageRoots[1], "LICENSE"),
      "tampered\n",
    );
    const result = runBuild(fixture);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /artifact digest does not match/i);
    assert.equal(existsSync(fixture.output), false);
  }));

test("the live catalog refuses to build without explicit authority evidence", () => {
  const temp = mkdtempSync(join(tmpdir(), "galerina-live-registry-"));
  try {
    const output = join(temp, "index.json");
    const result = runRegistryCli([
      "build",
      "--registry-dir", LIVE_REGISTRY,
      "--issued-at", FIXED_ISSUED_AT,
      "--out", output,
    ]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /REFUSED:/);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("a changed auth package remains candidate-only until a new hybrid signing ceremony", () => {
  assert.match(
    readFileSync(GIT_ATTRIBUTES, "utf8"),
    /^packages-ts\/galerina-registry\/\*\*\/package\.galerina\.yaml text eol=lf$/mu,
    "hybrid-signed manifest bytes must remain LF-stable across platforms",
  );
  assert.match(
    readFileSync(GIT_ATTRIBUTES, "utf8"),
    /^packages-ts\/galerina-registry\/registry-index-v2\.json text eol=lf$/mu,
    "hybrid-signed index bytes must remain LF-stable across platforms",
  );
  assert.equal(
    existsSync(
      join(
        LIVE_REGISTRY,
        "@galerina",
        "healthcare",
        "package.galerina.yaml",
      ),
    ),
    false,
    "a nonexistent healthcare package must not have a live registry claim",
  );
  assert.equal(
    existsSync(LIVE_AUTH_MANIFEST),
    false,
    "changed package bytes must remove the stale live manifest",
  );
  assert.equal(
    existsSync(LIVE_SIGNED_INDEX),
    false,
    "an index signed for stale package bytes must not remain live",
  );

  const candidate = parseTestManifest(readFileSync(AUTH_CANDIDATE, "utf8"));
  assert.equal(candidate.name, "@galerina/auth");
  assert.equal(candidate.version, "1.0.0-beta.2");
  assert.equal(candidate.artifactProfile, REGISTRY_ARTIFACT_PROFILE);
  assert.deepEqual(candidate.artifactFiles, AUTH_PACKAGE_FILES);
  assert.deepEqual(candidate.capabilities, ["clock.read", "crypto.verify"]);
  assert.deepEqual(candidate.effects, ["clock.read", "crypto.verify"]);
  assert.equal(candidate.publisher, "galerina-owner-governance");
  assert.equal(candidate.keyId, "f3172a48372bfb23");
  assert.equal(candidate.governance.reviewed, true);
  assert.equal(candidate.governance.reviewedBy, "galerina-owner-governance");
  assert.equal(
    candidate.governance.reviewedAt,
    "2026-08-11T14:36:58.000Z",
  );
  assert.equal(candidate.signerKeyId, null);
  assert.equal(candidate.signature, null);
  const artifact = hashFlatPackageArtifact({
    workspacePackagesDir: join(REPOSITORY_ROOT, "packages-ts"),
    packageName: "@galerina/auth",
    artifactProfile: candidate.artifactProfile,
    artifactFiles: candidate.artifactFiles,
  });
  assert.equal(candidate.hash, artifact.hash);

  const temp = mkdtempSync(join(tmpdir(), "galerina-live-authority-"));
  try {
    const output = join(temp, "index.json");
    const result = runRegistryCli([
      "build",
      "--registry-dir", LIVE_REGISTRY,
      "--workspace-packages-dir", join(REPOSITORY_ROOT, "packages-ts"),
      "--delegation", LIVE_DELEGATION,
      "--root-pubkey", LIVE_ROOT_ED_PUBLIC,
      "--root-mldsa65-pubkey", LIVE_ROOT_ML_PUBLIC,
      "--root-key-id", "21415420b447e219",
      "--operational-ed25519-pubkey", LIVE_OPERATIONAL_ED_PUBLIC,
      "--operational-mldsa65-pubkey", LIVE_OPERATIONAL_ML_PUBLIC,
      "--authority-at", LIVE_INDEX_ISSUED_AT,
      "--min-delegation-serial", "0",
      "--issued-at", LIVE_INDEX_ISSUED_AT,
      "--out", output,
    ]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /no package\.galerina\.yaml.*empty certified index/is);
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("the real admission seam self-test uses cryptographic package evidence", () => {
  const result = runRegistryCli(["--self-test"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /registry-index-cli self-test: \d+\/\d+/);
  assert.match(result.stdout, /hybrid sign/);
  assert.match(result.stdout, /missing ML-DSA-65 half/);
});

test("the owner sign mode reuses the delegated operational identity", () =>
  withFixture({}, (fixture) => {
    const signingEnvPath = join(fixture.temp, "operational-signing.env");
    const privatePem = fixture.operationalEd.privateKey.export({
      type: "pkcs8",
      format: "pem",
    });
    writeFileSync(signingEnvPath, [
      `GALERINA_SIGNING_KEY_ID=${fixture.operationalKeyId}`,
      "GALERINA_SIGNING_ALGORITHM=hybrid-ed25519-mldsa65",
      `GALERINA_SIGNING_PRIVATE_KEY_B64=${Buffer.from(privatePem).toString("base64")}`,
      `GALERINA_SIGNING_MLDSA_PRIVATE_KEY_B64=${Buffer.from(fixture.operationalMl.secretKey).toString("base64")}`,
      "",
    ].join("\n"), { mode: 0o600 });
    const result = runRegistryCli([
      "sign",
      "--registry-dir", fixture.registryRoot,
      "--registry", "https://registry.galerina.dev",
      "--issued-at", FIXED_ISSUED_AT,
      "--out", fixture.output,
      ...authorityArgs(fixture),
    ], {
      ...process.env,
      GALERINA_REGISTRY_SIGNING_ENV_PATH: signingEnvPath,
      GALERINA_SIGNING_KEY_ID: fixture.operationalKeyId,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const index = JSON.parse(readFileSync(fixture.output, "utf8"));
    assert.equal(index.signature.algorithm, "Ed25519+ML-DSA-65");
    assert.equal(index.signature.keyId, fixture.operationalKeyId);
  }));

function parseTestScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return JSON.parse(trimmed);
}

function parseTestManifest(text) {
  const manifest = {
    artifactFiles: [],
    capabilities: [],
    effects: [],
    governance: {},
  };
  let list = null;
  let governance = false;
  for (const line of text.trimEnd().split(/\r?\n/u)) {
    const listItem = /^\s{2}-\s+(.+)$/u.exec(line);
    if (listItem && list !== null) {
      manifest[list].push(parseTestScalar(listItem[1]));
      continue;
    }
    const governanceField = /^\s{2}([A-Za-z][A-Za-z0-9]*):\s+(.+)$/u.exec(
      line,
    );
    if (governance && governanceField) {
      manifest.governance[governanceField[1]] =
        parseTestScalar(governanceField[2]);
      continue;
    }
    const field = /^([A-Za-z][A-Za-z0-9]*):(?:\s+(.+))?$/u.exec(line);
    assert.ok(field, line);
    governance = field[1] === "governance";
    list = field[2] === undefined && !governance ? field[1] : null;
    if (list !== null) manifest[list] = [];
    else if (!governance) manifest[field[1]] = parseTestScalar(field[2]);
  }
  return manifest;
}
