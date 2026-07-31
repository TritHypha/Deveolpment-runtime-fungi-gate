import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS,
  assessRegistryDurabilityAdapterCandidate,
} from "../dist/index.js";

const DIGESTS = Object.freeze({
  source: `sha256:${"1".repeat(64)}`,
  contract: `sha256:${"2".repeat(64)}`,
  binary: `sha256:${"3".repeat(64)}`,
  toolchain: `sha256:${"4".repeat(64)}`,
  build: `sha256:${"5".repeat(64)}`,
  sourceReview: `sha256:${"6".repeat(64)}`,
  loaderTests: `sha256:${"7".repeat(64)}`,
  faultMatrix: `sha256:${"8".repeat(64)}`,
  crashEvidence: `sha256:${"9".repeat(64)}`,
  independentReview: `sha256:${"a".repeat(64)}`,
});

function descriptor(overrides = {}) {
  return {
    schema: "galerina-registry-durability-adapter/v1",
    adapterId: "galerina.registry.durability.windows.v1",
    abiVersion: "galerina.registry.durability.abi.v1",
    platform: "windows",
    architecture: "x86_64",
    targetTriple: "x86_64-pc-windows-msvc",
    filesystems: ["ntfs", "refs"],
    loaderRelativePath: "native/win32-x64/registry-durability.node",
    binaryFormat: "pe-coff-node-api-v10",
    sourceDigest: DIGESTS.source,
    contractDigest: DIGESTS.contract,
    binaryDigest: DIGESTS.binary,
    toolchainDigest: DIGESTS.toolchain,
    buildRecipeDigest: DIGESTS.build,
    evidence: {
      sourceReviewDigest: DIGESTS.sourceReview,
      hostileLoaderTestsDigest: DIGESTS.loaderTests,
      deterministicFaultMatrixDigest: DIGESTS.faultMatrix,
      platformCrashEvidenceDigest: DIGESTS.crashEvidence,
      independentReviewDigest: DIGESTS.independentReview,
    },
    ...overrides,
  };
}

function host(overrides = {}) {
  return {
    schema: "galerina-registry-durability-host/v1",
    platform: "windows",
    architecture: "x86_64",
    filesystem: "ntfs",
    volumeKind: "fixed-local",
    network: false,
    removable: false,
    overlay: false,
    virtual: false,
    ...overrides,
  };
}

describe("registry durability adapter candidate admission", () => {
  it("keeps the production digest allow-set empty", () => {
    assert.deepEqual(PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS, []);
    assert.equal(
      Object.isFrozen(PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS),
      true,
    );
  });

  it("recognizes a source-bound local candidate without admitting production", () => {
    const decision = assessRegistryDurabilityAdapterCandidate(
      descriptor(),
      host(),
    );
    assert.equal(decision.verdict, "CANDIDATE");
    assert.equal(decision.reason, "EVIDENCE_COMPLETE_NOT_PRODUCTION_ADMITTED");
    assert.equal(decision.adapterId, "galerina.registry.durability.windows.v1");
    assert.equal(decision.binaryDigest, DIGESTS.binary);
    assert.equal(Object.isFrozen(decision), true);
  });

  it("refuses network, removable, overlay, virtual, and unknown volumes", () => {
    const cases = [
      { network: true },
      { removable: true },
      { overlay: true },
      { virtual: true },
      { volumeKind: "unknown" },
    ];
    for (const facts of cases) {
      assert.equal(
        assessRegistryDurabilityAdapterCandidate(
          descriptor(),
          host(facts),
        ).verdict,
        "DENY",
        JSON.stringify(facts),
      );
    }
  });

  it("refuses platform, architecture, target, filesystem, and ABI mismatch", () => {
    const cases = [
      [descriptor(), host({ platform: "linux" })],
      [descriptor(), host({ architecture: "aarch64" })],
      [descriptor({ targetTriple: "x86_64-unknown-linux-gnu" }), host()],
      [descriptor(), host({ filesystem: "fat32" })],
      [descriptor({ abiVersion: "galerina.registry.durability.abi.v2" }), host()],
      [descriptor({ binaryFormat: "elf-node-api-v10" }), host()],
    ];
    for (const [candidate, facts] of cases) {
      assert.equal(
        assessRegistryDurabilityAdapterCandidate(candidate, facts).verdict,
        "DENY",
      );
    }
  });

  it("refuses missing, malformed, unsorted, extra, or accessor-backed evidence", () => {
    const accessor = descriptor();
    Object.defineProperty(accessor, "binaryDigest", {
      enumerable: true,
      get: () => DIGESTS.binary,
    });
    const cases = [
      descriptor({ binaryDigest: "sha256:missing" }),
      descriptor({ filesystems: ["refs", "ntfs"] }),
      descriptor({ filesystems: [] }),
      { ...descriptor(), productionAdmitted: true },
      descriptor({ evidence: {
        ...descriptor().evidence,
        platformCrashEvidenceDigest: "",
      } }),
      accessor,
    ];
    for (const candidate of cases) {
      assert.equal(
        assessRegistryDurabilityAdapterCandidate(candidate, host()).verdict,
        "DENY",
      );
    }
  });

  it("refuses a host or descriptor object with inherited authority fields", () => {
    const inheritedDescriptor = Object.create(descriptor());
    const inheritedHost = Object.create(host());
    assert.equal(
      assessRegistryDurabilityAdapterCandidate(
        inheritedDescriptor,
        host(),
      ).verdict,
      "DENY",
    );
    assert.equal(
      assessRegistryDurabilityAdapterCandidate(
        descriptor(),
        inheritedHost,
      ).verdict,
      "DENY",
    );
  });
});
