import assert from "node:assert/strict";
import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as signEd25519,
} from "node:crypto";
import { createRequire } from "node:module";
import {
  linkSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { verifyBetaV1ReleaseFiles } from "../beta-v1-release-admission.mjs";
import {
  RELEASE_EVIDENCE_ROLE,
  releaseEvidenceDelegationPreimage,
  releaseEvidenceStatementPreimage,
} from "../lib/beta-release-evidence-envelope.mjs";
import {
  RELEASE_REPOSITORY_CHECKS,
  deriveDurabilityStatement,
  deriveRepositoryStatement,
} from "../lib/beta-release-evidence-receipts.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(
    compilerRequire.resolve("@noble/post-quantum/ml-dsa.js"),
  ).href
);

const COMMIT = "a".repeat(40);
const AT = "2026-08-02T12:00:00.000Z";
const SYSTEMS = Object.freeze([
  ["windows-10", "win32", "x64", "windows"],
  ["windows-11", "win32", "x64", "windows"],
  ["ubuntu", "linux", "x64", "ubuntu"],
  ["debian", "linux", "x64", "debian"],
  ["fedora", "linux", "x64", "fedora"],
  ["linuxmint", "linux", "x64", "linuxmint"],
  ["macos", "darwin", "arm64", "macos"],
]);
const ROWS = Object.freeze([
  "npm-binary",
  "workspace-discovery",
  "portable-path-contract",
  "compiler-build",
  "strict-fungi-check",
  "wasm-execution",
]);

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hybridKey(keyId) {
  const ed = generateKeyPairSync("ed25519");
  const ml = mlDsa65.keygen(randomBytes(32));
  return {
    keyId,
    edPrivate: ed.privateKey,
    edPublicPem: ed.publicKey.export({ type: "spki", format: "pem" }).toString(),
    mlPrivate: ml.secretKey,
    mlPublic: ml.publicKey,
  };
}

function signHybrid(message, key, context) {
  return {
    algorithm: "hybrid-ed25519-mldsa65",
    canon: "galerina-canonical-json-v1",
    context,
    keyId: key.keyId,
    ed25519Signature: signEd25519(
      null,
      Buffer.from(message),
      key.edPrivate,
    ).toString("base64"),
    mlDsa65Signature: Buffer.from(
      mlDsa65.sign(message, key.mlPrivate, {
        context: new TextEncoder().encode(context),
      }),
    ).toString("base64"),
  };
}

function signedEnvelope(statement, key, role, context) {
  return {
    schema: "galerina.release-evidence.envelope.v1",
    statement,
    signature: signHybrid(
      releaseEvidenceStatementPreimage(statement, role),
      key,
      context,
    ),
  };
}

function writeBytes(directory, file, bytes) {
  writeFileSync(join(directory, file), bytes, { flag: "wx" });
  return sha256(bytes);
}

function functionalReceipt([operatingSystem, os, architecture, distributionId]) {
  return {
    schema: "galerina.platform.functional-evidence.v2",
    evidenceClass: "FUNCTIONAL_PORTABILITY",
    verdict: 0,
    status: "PASS",
    repositoryCommit: COMMIT,
    operatingSystem,
    runnerClass: "hosted-vm",
    platform: {
      os,
      architecture,
      distribution: { id: distributionId, version: "1.0" },
      nodeVersion: "v20.19.0",
    },
    cleanWorkingTree: true,
    criticalWarnings: [],
    evidence: ROWS.map((name) => ({ name, status: "passed", durationMs: 1 })),
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
  };
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-beta-release-"));
  const evidenceDirectory = join(root, "evidence");
  mkdirSync(evidenceDirectory);
  const rootKey = hybridKey("1111111111111111");
  const operationalKey = hybridKey("2222222222222222");
  const rootEdFile = "release-root.pub.pem";
  const rootMlFile = "release-root.mldsa.pub.b64";
  const operationalEdFile = "release-operational.pub.pem";
  const operationalMlFile = "release-operational.mldsa.pub.b64";
  const rootEdBytes = Buffer.from(rootKey.edPublicPem, "utf8");
  const rootMlBytes = Buffer.from(`${Buffer.from(rootKey.mlPublic).toString("base64")}\n`, "utf8");
  const operationalEdBytes = Buffer.from(operationalKey.edPublicPem, "utf8");
  const operationalMlBytes = Buffer.from(
    `${Buffer.from(operationalKey.mlPublic).toString("base64")}\n`,
    "utf8",
  );
  writeBytes(root, rootEdFile, rootEdBytes);
  writeBytes(root, rootMlFile, rootMlBytes);
  writeBytes(root, operationalEdFile, operationalEdBytes);
  writeBytes(root, operationalMlFile, operationalMlBytes);
  const operationalEdDer = createPublicKey(operationalKey.edPublicPem).export({
    type: "spki",
    format: "der",
  });
  const delegationBase = {
    schema: "galerina.release-evidence.delegation.v1",
    releaseId: "beta-v1",
    serial: 1,
    issuedAt: "2026-08-02T10:00:00.000Z",
    notBefore: "2026-08-02T10:00:00.000Z",
    notAfter: "2026-08-03T10:00:00.000Z",
    rootKeyId: rootKey.keyId,
    operational: {
      keyId: operationalKey.keyId,
      ed25519Sha256: sha256(operationalEdDer),
      mlDsa65Sha256: sha256(operationalKey.mlPublic),
      roles: [
        RELEASE_EVIDENCE_ROLE.DURABILITY,
        RELEASE_EVIDENCE_ROLE.REPOSITORY,
      ],
    },
  };
  const delegation = {
    ...delegationBase,
    signature: signHybrid(
      releaseEvidenceDelegationPreimage(delegationBase),
      rootKey,
      "galerina.release.evidence.delegation.sig.v1",
    ),
  };
  const delegationFile = "release-evidence-delegation.json";
  const delegationBytes = Buffer.from(canonical(delegation));
  writeBytes(root, delegationFile, delegationBytes);
  const functional = [];
  for (const system of SYSTEMS) {
    const file = `functional-${system[0]}.json`;
    const bytes = Buffer.from(canonical(functionalReceipt(system)));
    writeFileSync(join(evidenceDirectory, file), bytes, { flag: "wx" });
    functional.push({
      operatingSystem: system[0],
      receiptFile: file,
      sha256: sha256(bytes),
    });
  }
  const rawFiles = {
    evidenceBundleFile: "durability-windows-10.raw.json",
    implementationFile: "registry-durability-native.bin",
    acceptedCheckpointFile: "registry-checkpoint.bin",
    controlledRebootFile: "registry-controlled-reboot.json",
    controlledPowerLossFile: "registry-controlled-power-loss.json",
  };
  const rawBytes = Object.fromEntries(Object.entries(rawFiles).map(([name, file]) => {
    const bytes = Buffer.from(`${name}:${COMMIT}\n`, "utf8");
    writeBytes(evidenceDirectory, file, bytes);
    return [name, bytes];
  }));
  const durabilityInput = {
    releaseId: "beta-v1",
    operatingSystem: "windows-10",
    platform: {
      os: "win32",
      architecture: "x64",
      distribution: "windows",
      distributionVersion: "10",
    },
    repositoryCommit: COMMIT,
    evidenceBundleSha256: sha256(rawBytes.evidenceBundleFile),
    implementationSha256: sha256(rawBytes.implementationFile),
    acceptedCheckpointSha256: sha256(rawBytes.acceptedCheckpointFile),
    controlledRebootSha256: sha256(rawBytes.controlledRebootFile),
    controlledPowerLossSha256: sha256(rawBytes.controlledPowerLossFile),
  };
  const durabilityValue = signedEnvelope(
    deriveDurabilityStatement(durabilityInput),
    operationalKey,
    RELEASE_EVIDENCE_ROLE.DURABILITY,
    "galerina.release.evidence.durability.sig.v1",
  );
  const durabilityFile = "durability-windows-10.json";
  const durabilityBytes = Buffer.from(canonical(durabilityValue));
  writeFileSync(join(evidenceDirectory, durabilityFile), durabilityBytes, { flag: "wx" });
  const repositoryStatement = deriveRepositoryStatement({
    releaseId: "beta-v1",
    repositoryCommit: COMMIT,
    trackedTreeSha256: "7".repeat(64),
    checks: RELEASE_REPOSITORY_CHECKS.map((definition, index) => ({
      id: definition.id,
      command: [...definition.command],
      exitCode: 0,
      stdoutSha256: sha256(Buffer.from(`stdout:${index}`, "utf8")),
      stderrSha256: sha256(Buffer.from(`stderr:${index}`, "utf8")),
    })),
  });
  const repositoryValue = signedEnvelope(
    repositoryStatement,
    operationalKey,
    RELEASE_EVIDENCE_ROLE.REPOSITORY,
    "galerina.release.evidence.repository.sig.v1",
  );
  const repositoryFile = "repository-fixed-point.json";
  const repositoryBytes = Buffer.from(canonical(repositoryValue));
  writeFileSync(join(evidenceDirectory, repositoryFile), repositoryBytes, { flag: "wx" });
  const policy = {
    schema: "galerina.beta-v1.platform-policy.v2",
    releaseId: "beta-v1",
    targetRepositoryCommit: COMMIT,
    releaseEvidenceAuthority: {
      rootKeyId: rootKey.keyId,
      rootEd25519PublicKeyFile: rootEdFile,
      rootEd25519PublicKeySha256: sha256(rootEdBytes),
      rootMlDsa65PublicKeyFile: rootMlFile,
      rootMlDsa65PublicKeySha256: sha256(rootMlBytes),
      operationalEd25519PublicKeyFile: operationalEdFile,
      operationalEd25519PublicKeySha256: sha256(operationalEdBytes),
      operationalMlDsa65PublicKeyFile: operationalMlFile,
      operationalMlDsa65PublicKeySha256: sha256(operationalMlBytes),
      delegationFile,
      delegationSha256: sha256(delegationBytes),
      minimumDelegationSerial: 1,
    },
    functional,
    minimumProductionDurabilityProfiles: 1,
    durabilityProfiles: [{
      operatingSystem: "windows-10",
      receiptFile: durabilityFile,
      sha256: sha256(durabilityBytes),
      platform: durabilityInput.platform,
      ...rawFiles,
    }],
    repositoryEvidence: {
      receiptFile: repositoryFile,
      sha256: sha256(repositoryBytes),
      trackedTreeSha256: repositoryStatement.predicate.trackedTreeSha256,
    },
  };
  const policyPath = join(root, "beta-v1-platform-policy.json");
  writeFileSync(policyPath, canonical(policy), { flag: "wx" });
  return {
    root,
    evidenceDirectory,
    policyPath,
    policy,
    rootKey,
    operationalKey,
  };
}

function verify(fixture, overrides = {}) {
  return verifyBetaV1ReleaseFiles({
    policyPath: fixture.policyPath,
    evidenceDirectory: fixture.evidenceDirectory,
    cleanPolicyCheckout: true,
    verificationTime: AT,
    isRevoked: () => false,
    ...overrides,
  });
}

test("the complete seven-OS matrix plus one pinned production durability profile admits", () => {
  const fixture = makeFixture();
  try {
    const result = verify(fixture);
    assert.equal(result.verdict, 1);
    assert.equal(result.status, "ADMITTED");
    assert.equal(result.operatingSystems.length, 7);
    assert.equal(result.productionAuthorizing, false);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("a duplicated, stale, skipped, warning-bearing, or digest-mismatched row denies", () => {
  for (const mutate of [
    (f) => {
      const value = functionalReceipt(SYSTEMS[2]);
      value.operatingSystem = "debian";
      writeFileSync(join(f.evidenceDirectory, "functional-ubuntu.json"), canonical(value));
    },
    (f) => {
      const path = join(f.evidenceDirectory, "functional-ubuntu.json");
      const value = JSON.parse(readFileSync(path));
      value.repositoryCommit = "b".repeat(40);
      writeFileSync(path, canonical(value));
    },
    (f) => {
      const path = join(f.evidenceDirectory, "functional-ubuntu.json");
      const value = JSON.parse(readFileSync(path));
      value.evidence[0].status = "skipped";
      writeFileSync(path, canonical(value));
    },
    (f) => {
      const path = join(f.evidenceDirectory, "functional-ubuntu.json");
      const value = JSON.parse(readFileSync(path));
      value.criticalWarnings = ["critical"];
      writeFileSync(path, canonical(value));
    },
    (f) => {
      const path = join(f.evidenceDirectory, "functional-ubuntu.json");
      const value = JSON.parse(readFileSync(path));
      value.platform.architecture = "arm64";
      writeFileSync(path, canonical(value));
    },
  ]) {
    const fixture = makeFixture();
    try {
      mutate(fixture);
      assert.throws(() => verify(fixture), /BETA_RELEASE_/u);
    } finally {
      rmSync(fixture.root, { recursive: true });
    }
  }
});

test("absent external execution remains K3 indeterminate and non-authorizing", () => {
  for (const missing of ["functional-fedora.json", "durability-windows-10.json", "repository-fixed-point.json"]) {
    const fixture = makeFixture();
    try {
      rmSync(join(fixture.evidenceDirectory, missing));
      const result = verify(fixture);
      assert.equal(result.verdict, 0);
      assert.equal(result.status, "INCOMPLETE_EXTERNAL_EVIDENCE");
      assert.equal(result.productionAuthorizing, false);
    } finally {
      rmSync(fixture.root, { recursive: true });
    }
  }
  const missingAuthority = makeFixture();
  try {
    rmSync(join(missingAuthority.root, "release-evidence-delegation.json"));
    const result = verify(missingAuthority);
    assert.equal(result.verdict, 0);
    assert.equal(result.status, "INCOMPLETE_EXTERNAL_EVIDENCE");
  } finally {
    rmSync(missingAuthority.root, { recursive: true });
  }
});

test("an absent governance policy denies rather than becoming incomplete evidence", () => {
  const fixture = makeFixture();
  try {
    rmSync(fixture.policyPath);
    assert.throws(() => verify(fixture), /BETA_RELEASE_POLICY_UNAVAILABLE/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("dirty policy checkout, hard links, and local path leakage deny", () => {
  for (const action of [
    (f) => {
      const linked = join(f.evidenceDirectory, "extra-hard-link.json");
      linkSync(join(f.evidenceDirectory, "functional-ubuntu.json"), linked);
    },
    (f) => {
      const path = join(f.evidenceDirectory, "functional-ubuntu.json");
      const value = JSON.parse(readFileSync(path));
      value.evidence[0].details = { cwd: "C:\\Users\\owner\\repo" }; // path-leak-audit:allow -- hostile fixture
      writeFileSync(path, canonical(value));
    },
  ]) {
    const fixture = makeFixture();
    try {
      action(fixture);
      assert.throws(() => verify(fixture), /BETA_RELEASE_/u);
    } finally {
      rmSync(fixture.root, { recursive: true });
    }
  }
  const fixture = makeFixture();
  try {
    assert.throws(
      () => verify(fixture, { cleanPolicyCheckout: false }),
      /BETA_RELEASE_POLICY_DIRTY/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("a recomputed policy pin cannot authenticate a forged signed predicate", () => {
  const fixture = makeFixture();
  try {
    const path = join(fixture.evidenceDirectory, "durability-windows-10.json");
    const value = JSON.parse(readFileSync(path));
    value.statement.predicate.controlledPowerLossSha256 = "f".repeat(64);
    const forgedBytes = Buffer.from(canonical(value));
    writeFileSync(path, forgedBytes);
    fixture.policy.durabilityProfiles[0].sha256 = sha256(forgedBytes);
    writeFileSync(fixture.policyPath, canonical(fixture.policy));
    assert.throws(
      () => verify(fixture),
      /RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("signature downgrade, stale delegation and Boolean-only legacy evidence refuse", () => {
  for (const mutate of [
    (fixture) => {
      const path = join(fixture.evidenceDirectory, "durability-windows-10.json");
      const value = JSON.parse(readFileSync(path));
      delete value.signature.mlDsa65Signature;
      const bytes = Buffer.from(canonical(value));
      writeFileSync(path, bytes);
      fixture.policy.durabilityProfiles[0].sha256 = sha256(bytes);
    },
    (fixture) => {
      fixture.policy.releaseEvidenceAuthority.minimumDelegationSerial = 2;
    },
    (fixture) => {
      const path = join(fixture.evidenceDirectory, "durability-windows-10.json");
      const value = {
        schema: "galerina.registry.durability.release-evidence.v1",
        operatingSystem: "windows-10",
        repositoryCommit: COMMIT,
        authenticated: true,
      };
      const bytes = Buffer.from(canonical(value));
      writeFileSync(path, bytes);
      fixture.policy.durabilityProfiles[0].sha256 = sha256(bytes);
    },
  ]) {
    const fixture = makeFixture();
    try {
      mutate(fixture);
      writeFileSync(fixture.policyPath, canonical(fixture.policy));
      assert.throws(() => verify(fixture), /RELEASE_EVIDENCE_/u);
    } finally {
      rmSync(fixture.root, { recursive: true });
    }
  }
});

test("signed durability provenance is re-derived from every raw artefact", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(
      join(fixture.evidenceDirectory, "registry-controlled-reboot.json"),
      "different recovery evidence\n",
    );
    assert.throws(
      () => verify(fixture),
      /RELEASE_DURABILITY_STATEMENT_REFUSED/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});
