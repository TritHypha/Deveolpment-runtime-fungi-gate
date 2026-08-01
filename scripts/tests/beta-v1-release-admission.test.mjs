import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

import { verifyBetaV1ReleaseFiles } from "../beta-v1-release-admission.mjs";

const COMMIT = "a".repeat(40);
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
  const durabilityValue = {
    schema: "galerina.registry.durability.release-evidence.v1",
    operatingSystem: "windows-10",
    repositoryCommit: COMMIT,
    evidenceId: `sha256:${"1".repeat(64)}`,
    implementationDigest: `sha256:${"2".repeat(64)}`,
    acceptedCheckpointDigest: `sha256:${"3".repeat(64)}`,
    evidenceClass: "PRODUCTION_ADMISSION",
    authenticated: true,
    authorityReleased: false,
    productionAuthorizing: false,
  };
  const durabilityFile = "durability-windows-10.json";
  const durabilityBytes = Buffer.from(canonical(durabilityValue));
  writeFileSync(join(evidenceDirectory, durabilityFile), durabilityBytes, { flag: "wx" });
  const repositoryValue = {
    schema: "galerina.beta-v1.repository-evidence.v1",
    repositoryCommit: COMMIT,
    phaseClose: "PASS",
    phaseCloseExhaustive: "PASS",
    graphAll: "PASS",
    generatorAll: "PASS",
    releaseBuild: "PASS",
    securityScan: "PASS",
    failedChecks: 0,
    skippedChecks: 0,
    authenticated: true,
    authorityReleased: false,
    productionAuthorizing: false,
  };
  const repositoryFile = "repository-fixed-point.json";
  const repositoryBytes = Buffer.from(canonical(repositoryValue));
  writeFileSync(join(evidenceDirectory, repositoryFile), repositoryBytes, { flag: "wx" });
  const policy = {
    schema: "galerina.beta-v1.platform-policy.v1",
    releaseId: "beta-v1",
    targetRepositoryCommit: COMMIT,
    functional,
    minimumProductionDurabilityProfiles: 1,
    durabilityProfiles: [{
      operatingSystem: "windows-10",
      receiptFile: durabilityFile,
      sha256: sha256(durabilityBytes),
    }],
    repositoryEvidence: {
      receiptFile: repositoryFile,
      sha256: sha256(repositoryBytes),
    },
  };
  const policyPath = join(root, "beta-v1-platform-policy.json");
  writeFileSync(policyPath, canonical(policy), { flag: "wx" });
  return { root, evidenceDirectory, policyPath, policy };
}

function verify(fixture, overrides = {}) {
  return verifyBetaV1ReleaseFiles({
    policyPath: fixture.policyPath,
    evidenceDirectory: fixture.evidenceDirectory,
    cleanPolicyCheckout: true,
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
      value.evidence[0].details = { cwd: "C:\\Users\\owner\\repo" };
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

test("a recomputed semantic forgery cannot escape the policy digest pins", () => {
  const fixture = makeFixture();
  try {
    const path = join(fixture.evidenceDirectory, "durability-windows-10.json");
    const value = JSON.parse(readFileSync(path));
    value.authorityReleased = true;
    value.selfSha256 = sha256(Buffer.from(canonical(value)));
    writeFileSync(path, canonical(value));
    assert.throws(() => verify(fixture), /BETA_RELEASE_/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});
