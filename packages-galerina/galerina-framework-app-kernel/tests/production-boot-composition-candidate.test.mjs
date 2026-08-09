/**
 * Sealed production boot composition candidate contract tests.
 * Change control: production boot composition candidate v1, 2026-08-09.
 * Relates to the production boot composition design, authenticated SLIDE
 * restore admission, registry durability production admission and RD-0789.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  admitAuthenticatedSlideRestoreProfile,
  admitProductionBootCompositionCandidate,
  admitRegistryDurabilityProfile,
  isProductionBootCompositionCandidate,
  ProductionBootCompositionError,
  verifyRegistryDurabilityEvidence,
} from "../dist/index.js";

const DIGEST = (value) => `sha256:${value.repeat(64)}`;
const GALERINA_COMMIT = "a".repeat(40);
const SLIDE_COMMIT = "b".repeat(40);
const BOUNDARIES = Object.freeze([
  "DIRECTORY_BARRIER",
  "FILE_BARRIER",
  "PROCESS_TERMINATION",
]);
const MISSING_EXTERNAL_INPUTS = Object.freeze([
  "REAL_OFFLINE_PRODUCTION_BOOT_DELEGATION",
  "REAL_OPERATIONAL_PUBLIC_BUNDLE",
  "REAL_CONTENT_BOUND_NATIVE_SLIDE_HOST",
  "REAL_PLATFORM_DURABILITY_RECEIPTS",
  "OWNER_RELEASE_AUTHORIZATION",
]);

/** Returns a real privately registered SLIDE profile from the Task 1 seam. */
function slideProfile() {
  const manifest = {
    schema: "galerina.production-slide-restore.manifest.v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: SLIDE_COMMIT,
    packageIdentity: "@galerina/core-sentinel-state",
    exportName: "restoreVerdict",
    objectSha256: DIGEST("1"),
    packageSetDigest: DIGEST("2"),
    slideBundleDigest: DIGEST("1"),
    packageDescriptorDigest: DIGEST("3"),
    compilerProfileId: "slide.checked-fungi.scalar.v1",
    toolManifestDigest: DIGEST("4"),
    safeValueTypeId: "Int",
    safeValueStateId: "safe.scalar.int.v1",
    safeValueProvenanceDigest: DIGEST("5"),
    currentEpoch: 15,
    rootKeyId: "offline-root-v1",
    operationalKeyId: "slide-object-signer-v1",
    delegationSerial: 7,
    notBefore: "2026-08-09T00:00:00.000Z",
    notAfter: "2026-08-10T00:00:00.000Z",
    ed25519Signature: "ed25519-public-test-signature",
    mlDsa65Signature: "mldsa65-public-test-signature",
  };
  return admitAuthenticatedSlideRestoreProfile(
    manifest,
    new Uint8Array([0x53, 0x4c, 0x49, 0x44, 0x45]),
    {
      schema: "galerina.production-slide-restore.authority.v1",
      at: "2026-08-09T12:00:00.000Z",
      minDelegationSerial: 6,
      expectedRootKeyId: "offline-root-v1",
      expectedOperationalKeyId: "slide-object-signer-v1",
      isRevoked: () => false,
      digestObject: () => DIGEST("1"),
      verifyEd25519: (preimage, signature, keyId) =>
        preimage.length > 0
        && signature === "ed25519-public-test-signature"
        && keyId === "slide-object-signer-v1",
      verifyMlDsa65: (preimage, signature, keyId) =>
        preimage.length > 0
        && signature === "mldsa65-public-test-signature"
        && keyId === "slide-object-signer-v1",
    },
    {
      schema: "galerina.production-slide-restore.execution-port.v1",
      executeAndVerify(snapshotPresent, integrityOk) {
        return {
          schema: "galerina.production-slide-restore.observation.v1",
          status: "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
          packageIdentity: manifest.packageIdentity,
          exportName: manifest.exportName,
          objectSha256: manifest.objectSha256,
          packageSetDigest: manifest.packageSetDigest,
          slideBundleDigest: manifest.slideBundleDigest,
          packageDescriptorDigest: manifest.packageDescriptorDigest,
          compilerProfileId: manifest.compilerProfileId,
          toolManifestDigest: manifest.toolManifestDigest,
          currentEpoch: manifest.currentEpoch,
          safeValueTypeId: manifest.safeValueTypeId,
          safeValueStateId: manifest.safeValueStateId,
          safeValueProvenanceDigest: manifest.safeValueProvenanceDigest,
          fallbackInvoked: false,
          verificationVerdict: 1,
          value: snapshotPresent && integrityOk ? 1 : -1,
        };
      },
    },
  );
}

/** Returns real verified durability evidence with no authority-release claim. */
function durabilityEvidence() {
  return verifyRegistryDurabilityEvidence({
    schema: "galerina.registry.durability.evidence.v1",
    evidenceClass: "PRODUCTION_ADMISSION",
    evidenceId: DIGEST("a"),
    repositoryCommit: GALERINA_COMMIT,
    platform: "windows",
    architecture: "x86_64",
    operatingSystem: "windows-10",
    filesystem: "ntfs",
    storageProfileDigest: DIGEST("b"),
    implementationDigest: DIGEST("6"),
    boundaryIds: [...BOUNDARIES],
    checks: {
      controlledPowerLoss: "PASS",
      controlledReboot: "PASS",
      functionalPortability: "PASS",
      nativeLive: "PASS",
      processTermination: "PASS",
      productionAdmission: "PASS",
    },
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
    verdict: 0,
  }, {
    expectedRepositoryCommit: GALERINA_COMMIT,
    expectedPlatform: "windows",
    expectedArchitecture: "x86_64",
    expectedOperatingSystem: "windows-10",
    requiredBoundaryIds: [...BOUNDARIES],
  });
}

/** Returns a real privately registered durability profile from its owner. */
function durabilityProfile(rootKeyId = "offline-root-v1") {
  return admitRegistryDurabilityProfile({
    schema: "galerina.registry.durability.production-manifest.v1",
    adapterId: "galerina.registry.durability.windows.v1",
    sourceDigest: DIGEST("6"),
    contractDigest: DIGEST("f"),
    binaryDigest: DIGEST("7"),
    buildRecipeDigest: DIGEST("8"),
    toolchainDigest: DIGEST("9"),
    evidenceId: DIGEST("a"),
    repositoryCommit: GALERINA_COMMIT,
    platform: "windows",
    architecture: "x86_64",
    operatingSystem: "windows-10",
    filesystem: "ntfs",
    storageProfileDigest: DIGEST("b"),
    generationId: "d".repeat(64),
    operationalKeyId: "slide-object-signer-v1",
    delegationSerial: 7,
    indexIssuedAt: "2026-08-09T06:00:00.000Z",
    acceptedCheckpointDigest: DIGEST("c"),
    notBefore: "2026-08-09T00:00:00.000Z",
    notAfter: "2026-08-10T00:00:00.000Z",
    rootSignature: {
      algorithm: "Ed25519+ML-DSA-65",
      keyId: rootKeyId,
      ed25519Signature: "ed25519-public-test-signature",
      mlDsa65Signature: "mldsa65-public-test-signature",
      canon: "jcs",
      context: "galerina.registry.durability.production.sig.v1",
    },
  }, durabilityEvidence(), {
    schema: "galerina.registry.durability.production-authority.v1",
    expectedRootKeyId: rootKeyId,
    expectedOperationalKeyId: "slide-object-signer-v1",
    at: "2026-08-09T12:00:00.000Z",
    minDelegationSerial: 6,
    isRevoked: () => false,
    verifyRootEd25519: (message, signature, keyId) =>
      message.length > 0
      && signature === "ed25519-public-test-signature"
      && keyId === rootKeyId,
    verifyRootMlDsa65: (message, signature, keyId) =>
      message.length > 0
      && signature === "mldsa65-public-test-signature"
      && keyId === rootKeyId,
  });
}

/** Returns the complete closed identity-join policy with hostile overrides. */
function policy(overrides = {}) {
  return {
    schema: "galerina.production-boot-composition.policy.v1",
    releaseId: "galerina-beta-v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: SLIDE_COMMIT,
    packageIdentity: "@galerina/core-sentinel-state",
    exportName: "restoreVerdict",
    objectSha256: DIGEST("1"),
    packageSetDigest: DIGEST("2"),
    slideBundleDigest: DIGEST("1"),
    packageDescriptorDigest: DIGEST("3"),
    compilerProfileId: "slide.checked-fungi.scalar.v1",
    toolManifestDigest: DIGEST("4"),
    safeValueTypeId: "Int",
    safeValueStateId: "safe.scalar.int.v1",
    safeValueProvenanceDigest: DIGEST("5"),
    currentEpoch: 15,
    rootKeyId: "offline-root-v1",
    operationalKeyId: "slide-object-signer-v1",
    platform: "windows",
    architecture: "x86_64",
    operatingSystem: "windows-10",
    filesystem: "ntfs",
    durabilityAdapterId: "galerina.registry.durability.windows.v1",
    durabilityAdapterDigest: DIGEST("6"),
    durabilityBinaryDigest: DIGEST("7"),
    buildRecipeDigest: DIGEST("8"),
    toolchainDigest: DIGEST("9"),
    evidenceId: DIGEST("a"),
    storageProfileDigest: DIGEST("b"),
    acceptedCheckpointDigest: DIGEST("c"),
    generationId: "d".repeat(64),
    minDelegationSerial: 6,
    notBefore: "2026-08-09T00:00:00.000Z",
    notAfter: "2026-08-10T00:00:00.000Z",
    ...overrides,
  };
}

/** Requires a typed K3 -1 refusal and no returned partial candidate. */
function assertRefused(callback, message) {
  assert.throws(
    callback,
    (error) =>
      error instanceof ProductionBootCompositionError
      && error.code === "PRODUCTION_BOOT_COMPOSITION_REFUSED"
      && error.verdict === -1,
    message,
  );
}

describe("sealed production boot composition candidate", () => {
  it("registers only a frozen data-only K3 0 candidate", () => {
    const candidate = admitProductionBootCompositionCandidate(
      policy(),
      slideProfile(),
      durabilityProfile(),
    );

    assert.equal(Object.isFrozen(candidate), true);
    assert.equal(isProductionBootCompositionCandidate(candidate), true);
    assert.equal(isProductionBootCompositionCandidate({ ...candidate }), false);
    assert.equal(candidate.status, "CANDIDATE_INDETERMINATE_NON_AUTHORIZING");
    assert.equal(candidate.verdict, 0);
    assert.equal(candidate.authenticatedObjectExecution, true);
    assert.equal(candidate.authenticatedPlatformDurability, true);
    assert.equal(candidate.authorityReleased, false);
    assert.equal(candidate.productionAuthorizing, false);
    assert.equal("restoreVerdict" in candidate, false);
    assert.equal(Object.isFrozen(candidate.missingExternalInputs), true);
    assert.deepEqual(candidate.missingExternalInputs, MISSING_EXTERNAL_INPUTS);
    assert.equal(
      Object.values(candidate).every((value) =>
        ["string", "number", "boolean"].includes(typeof value)
        || value === candidate.missingExternalInputs
      ),
      true,
    );
  });

  it("refuses copied capabilities, missing evidence and forged authority claims as K3 -1", () => {
    const realSlide = slideProfile();
    const realDurability = durabilityProfile();
    const cases = [
      [policy(), { ...realSlide }, realDurability],
      [policy(), realSlide, { ...realDurability }],
      [policy(), null, realDurability],
      [policy(), realSlide, null],
      [policy(), realSlide, durabilityProfile("different-offline-root")],
      [{}, realSlide, realDurability],
      [policy({ authorityReleased: true }), realSlide, realDurability],
      [policy({ productionAuthorizing: true }), realSlide, realDurability],
    ];
    for (const [index, values] of cases.entries()) {
      assertRefused(
        () => admitProductionBootCompositionCandidate(...values),
        `forgery case ${index}`,
      );
    }
  });

  it("refuses the complete policy-to-profile mismatch matrix as K3 -1", () => {
    const realSlide = slideProfile();
    const realDurability = durabilityProfile();
    const accessorPolicy = policy();
    Object.defineProperty(accessorPolicy, "slideCommit", {
      configurable: true,
      enumerable: true,
      get: () => SLIDE_COMMIT,
    });
    const inheritedPolicy = Object.assign(Object.create({ inherited: true }), policy());
    const cases = [
      ["schema", policy({ schema: "galerina.production-boot-composition.policy.v2" })],
      ["release", policy({ releaseId: "galerina-beta-v2" })],
      ["Galerina commit", policy({ galerinaCommit: "c".repeat(40) })],
      ["SLIDE commit", policy({ slideCommit: "c".repeat(40) })],
      ["package", policy({ packageIdentity: "@example/forged" })],
      ["export", policy({ exportName: "fallbackRestore" })],
      ["object", policy({ objectSha256: DIGEST("f") })],
      ["package set", policy({ packageSetDigest: DIGEST("f") })],
      ["SLIDE bundle", policy({ slideBundleDigest: DIGEST("f") })],
      ["package descriptor", policy({ packageDescriptorDigest: DIGEST("f") })],
      ["compiler profile", policy({ compilerProfileId: "forged-profile" })],
      ["tool manifest", policy({ toolManifestDigest: DIGEST("f") })],
      ["safe type", policy({ safeValueTypeId: "String" })],
      ["safe state", policy({ safeValueStateId: "unsafe.scalar.int.v1" })],
      ["safe provenance", policy({ safeValueProvenanceDigest: DIGEST("f") })],
      ["epoch", policy({ currentEpoch: 16 })],
      ["root", policy({ rootKeyId: "forged-root" })],
      ["operational", policy({ operationalKeyId: "forged-operational" })],
      ["platform", policy({ platform: "linux" })],
      ["architecture", policy({ architecture: "aarch64" })],
      ["operating system", policy({ operatingSystem: "windows-11" })],
      ["filesystem", policy({ filesystem: "refs" })],
      ["adapter", policy({ durabilityAdapterId: "forged-adapter" })],
      ["adapter digest", policy({ durabilityAdapterDigest: DIGEST("f") })],
      ["binary", policy({ durabilityBinaryDigest: DIGEST("f") })],
      ["build recipe", policy({ buildRecipeDigest: DIGEST("f") })],
      ["toolchain", policy({ toolchainDigest: DIGEST("f") })],
      ["evidence", policy({ evidenceId: DIGEST("f") })],
      ["storage", policy({ storageProfileDigest: DIGEST("f") })],
      ["checkpoint", policy({ acceptedCheckpointDigest: DIGEST("f") })],
      ["generation", policy({ generationId: "e".repeat(64) })],
      ["serial floor", policy({ minDelegationSerial: 7 })],
      ["weakened serial floor", policy({ minDelegationSerial: 5 })],
      ["unsafe serial", policy({ minDelegationSerial: Number.MAX_SAFE_INTEGER + 1 })],
      ["noncanonical time", policy({ notBefore: "2026-08-09T00:00:00Z" })],
      ["unbound earlier window", policy({ notBefore: "2026-08-08T00:00:00.000Z" })],
      ["expired window", policy({ notAfter: "2026-08-11T00:00:00.000Z" })],
      ["surplus", { ...policy(), surplus: true }],
      ["accessor", accessorPolicy],
      ["proxy", new Proxy(policy(), {})],
      ["inherited", inheritedPolicy],
    ];
    for (const [name, changedPolicy] of cases) {
      assertRefused(
        () => admitProductionBootCompositionCandidate(
          changedPolicy,
          realSlide,
          realDurability,
        ),
        name,
      );
    }
  });

  it("exports no production activation, restore-authority or release function", async () => {
    const exported = Object.keys(await import("../dist/index.js"));
    assert.equal(exported.includes("activateProductionBoot"), false);
    assert.equal(exported.includes("releaseProductionBootAuthority"), false);
    assert.equal(exported.includes("createProductionRestoreVerdictAuthority"), false);
  });
});
