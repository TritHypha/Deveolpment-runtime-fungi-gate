import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  REGISTRY_DURABILITY_EVIDENCE_SCHEMA,
  isVerifiedRegistryDurabilityEvidence,
  verifyRegistryDurabilityEvidence,
} from "../dist/index.js";

const SHA = Object.freeze({
  evidence: `sha256:${"1".repeat(64)}`,
  storage: `sha256:${"2".repeat(64)}`,
  implementation: `sha256:${"3".repeat(64)}`,
});

const CHECK_KEYS = Object.freeze([
  "controlledPowerLoss",
  "controlledReboot",
  "functionalPortability",
  "nativeLive",
  "processTermination",
  "productionAdmission",
]);

const CLASS_CHECKS = Object.freeze({
  FUNCTIONAL_PORTABILITY: Object.freeze(["functionalPortability"]),
  NATIVE_LIVE: Object.freeze(["functionalPortability", "nativeLive"]),
  PROCESS_TERMINATION: Object.freeze([
    "functionalPortability",
    "nativeLive",
    "processTermination",
  ]),
  CONTROLLED_REBOOT: Object.freeze([
    "functionalPortability",
    "nativeLive",
    "processTermination",
    "controlledReboot",
  ]),
  CONTROLLED_POWER_LOSS: Object.freeze([
    "functionalPortability",
    "nativeLive",
    "processTermination",
    "controlledReboot",
    "controlledPowerLoss",
  ]),
  PRODUCTION_ADMISSION: CHECK_KEYS,
});

function checks(evidenceClass, overrides = {}) {
  const admitted = CLASS_CHECKS[evidenceClass];
  return Object.fromEntries(CHECK_KEYS.map((key) => [
    key,
    admitted.includes(key) ? "PASS" : "UNVERIFIED",
  ]).concat(Object.entries(overrides)));
}

function evidence(evidenceClass = "PROCESS_TERMINATION", overrides = {}) {
  return {
    schema: "galerina.registry.durability.evidence.v1",
    evidenceClass,
    evidenceId: SHA.evidence,
    repositoryCommit: "a".repeat(40),
    platform: "linux",
    architecture: "x86_64",
    operatingSystem: "ubuntu",
    filesystem: "ext4",
    storageProfileDigest: SHA.storage,
    implementationDigest: SHA.implementation,
    boundaryIds: evidenceClass === "FUNCTIONAL_PORTABILITY"
      ? []
      : ["DIRECTORY_BARRIER", "FILE_BARRIER"],
    checks: checks(evidenceClass),
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
    verdict: 0,
    ...overrides,
  };
}

function policy(overrides = {}) {
  return {
    expectedRepositoryCommit: "a".repeat(40),
    expectedPlatform: "linux",
    expectedArchitecture: "x86_64",
    expectedOperatingSystem: "ubuntu",
    requiredBoundaryIds: ["DIRECTORY_BARRIER", "FILE_BARRIER"],
    ...overrides,
  };
}

describe("registry durability evidence", () => {
  it("owns and deeply freezes every exact evidence class without releasing authority", () => {
    assert.equal(
      REGISTRY_DURABILITY_EVIDENCE_SCHEMA,
      "galerina.registry.durability.evidence.v1",
    );
    for (const evidenceClass of Object.keys(CLASS_CHECKS)) {
      const input = evidence(evidenceClass);
      const requiredBoundaryIds = evidenceClass === "FUNCTIONAL_PORTABILITY"
        ? []
        : ["DIRECTORY_BARRIER", "FILE_BARRIER"];
      const verified = verifyRegistryDurabilityEvidence(
        input,
        policy({ requiredBoundaryIds }),
      );
      assert.notEqual(verified, input);
      assert.equal(verified.evidenceClass, evidenceClass);
      assert.equal(verified.verdict, 0);
      assert.equal(verified.authorityReleased, false);
      assert.equal(verified.productionAuthorizing, false);
      assert.equal(Object.isFrozen(verified), true);
      assert.equal(Object.isFrozen(verified.checks), true);
      assert.equal(Object.isFrozen(verified.boundaryIds), true);
      assert.equal(isVerifiedRegistryDurabilityEvidence(verified), true);
      assert.equal(
        isVerifiedRegistryDurabilityEvidence(structuredClone(verified)),
        false,
      );
    }
  });

  it("refuses a claim above its evidence class with one stable identity", () => {
    assert.throws(
      () => verifyRegistryDurabilityEvidence(
        evidence("PROCESS_TERMINATION", {
          checks: checks("PROCESS_TERMINATION", {
            controlledPowerLoss: "PASS",
          }),
        }),
        policy(),
      ),
      {
        code: "REGISTRY_DURABILITY_EVIDENCE_CLASS_ESCALATION_REFUSED",
      },
    );
  });

  it("refuses incomplete, surplus, inherited and accessor-backed evidence", () => {
    const missing = evidence();
    delete missing.evidenceId;
    const accessor = evidence();
    Object.defineProperty(accessor, "filesystem", {
      enumerable: true,
      get: () => "ext4",
    });
    const inherited = Object.create(evidence());
    const cases = [
      missing,
      { ...evidence(), extraAuthority: true },
      inherited,
      accessor,
    ];
    for (const value of cases) {
      assert.throws(
        () => verifyRegistryDurabilityEvidence(value, policy()),
        { code: "REGISTRY_DURABILITY_EVIDENCE_MALFORMED_REFUSED" },
      );
    }
  });

  it("refuses malformed identities, duplicate boundaries and local-path-shaped facts", () => {
    const cases = [
      evidence("PROCESS_TERMINATION", { evidenceId: "sha256:missing" }),
      evidence("PROCESS_TERMINATION", {
        boundaryIds: ["FILE_BARRIER", "FILE_BARRIER"],
      }),
      evidence("PROCESS_TERMINATION", {
      operatingSystem: "C:\\Users\\owner", // path-leak-audit:allow -- hostile fixture
      }),
      evidence("PROCESS_TERMINATION", { verdict: 1 }),
      evidence("PROCESS_TERMINATION", { authorityReleased: true }),
      evidence("PROCESS_TERMINATION", { productionAuthorizing: true }),
    ];
    for (const value of cases) {
      assert.throws(
        () => verifyRegistryDurabilityEvidence(value, policy()),
        { code: "REGISTRY_DURABILITY_EVIDENCE_MALFORMED_REFUSED" },
      );
    }
  });

  it("refuses platform, commit and exact-boundary policy mismatch", () => {
    const cases = [
      policy({ expectedRepositoryCommit: "b".repeat(40) }),
      policy({
        expectedPlatform: "windows",
        expectedOperatingSystem: "windows-10",
      }),
      policy({ expectedArchitecture: "aarch64" }),
      policy({ expectedOperatingSystem: "debian" }),
      policy({ requiredBoundaryIds: ["FILE_BARRIER"] }),
    ];
    for (const expected of cases) {
      assert.throws(
        () => verifyRegistryDurabilityEvidence(evidence(), expected),
        { code: "REGISTRY_DURABILITY_EVIDENCE_POLICY_MISMATCH_REFUSED" },
      );
    }
  });

  it("converts hostile proxies into a bounded malformed refusal", () => {
    const hostile = new Proxy(evidence(), {
      getOwnPropertyDescriptor() {
        throw new Error("hostile trap");
      },
    });
    assert.throws(
      () => verifyRegistryDurabilityEvidence(hostile, policy()),
      { code: "REGISTRY_DURABILITY_EVIDENCE_MALFORMED_REFUSED" },
    );
  });
});
