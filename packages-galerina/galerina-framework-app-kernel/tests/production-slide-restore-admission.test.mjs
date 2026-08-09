/**
 * Authenticated SLIDE restore profile contract tests.
 * Change control: production boot composition candidate v1, 2026-08-09.
 * Relates to the production boot composition design, the registry durability
 * production admission sibling, Contract 85 and RD-0789.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  admitAuthenticatedSlideRestoreProfile,
  isAuthenticatedSlideRestoreProfile,
  ProductionSlideRestoreAdmissionError,
} from "../dist/index.js";

const DIGEST = (value) => `sha256:${value.repeat(64)}`;
const GALERINA_COMMIT = "a".repeat(40);
const SLIDE_COMMIT = "b".repeat(40);

/** Returns the exact signed public manifest, with explicit hostile overrides. */
function manifest(overrides = {}) {
  return {
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
    ...overrides,
  };
}

/** Returns the pinned verification boundary used by known-answer fixtures. */
function authority(overrides = {}) {
  return {
    schema: "galerina.production-slide-restore.authority.v1",
    at: "2026-08-09T12:00:00.000Z",
    minDelegationSerial: 6,
    expectedRootKeyId: "offline-root-v1",
    expectedOperationalKeyId: "slide-object-signer-v1",
    isRevoked: () => false,
    digestObject: (objectBytes) =>
      objectBytes instanceof Uint8Array && objectBytes.length > 0
        ? DIGEST("1")
        : "invalid",
    verifyEd25519: (preimage, signature, keyId) =>
      preimage instanceof Uint8Array
      && preimage.length > 0
      && signature === "ed25519-public-test-signature"
      && keyId === "slide-object-signer-v1",
    verifyMlDsa65: (preimage, signature, keyId) =>
      preimage instanceof Uint8Array
      && preimage.length > 0
      && signature === "mldsa65-public-test-signature"
      && keyId === "slide-object-signer-v1",
    ...overrides,
  };
}

/** Returns a reference-only execution port with literal expected observations. */
function executionPort(sourceManifest, calls, overrides = {}) {
  return {
    schema: "galerina.production-slide-restore.execution-port.v1",
    executeAndVerify(snapshotPresent, integrityOk) {
      calls.push([snapshotPresent, integrityOk]);
      return {
        schema: "galerina.production-slide-restore.observation.v1",
        status: "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
        packageIdentity: sourceManifest.packageIdentity,
        exportName: sourceManifest.exportName,
        objectSha256: sourceManifest.objectSha256,
        packageSetDigest: sourceManifest.packageSetDigest,
        slideBundleDigest: sourceManifest.slideBundleDigest,
        packageDescriptorDigest: sourceManifest.packageDescriptorDigest,
        compilerProfileId: sourceManifest.compilerProfileId,
        toolManifestDigest: sourceManifest.toolManifestDigest,
        currentEpoch: sourceManifest.currentEpoch,
        safeValueTypeId: sourceManifest.safeValueTypeId,
        safeValueStateId: sourceManifest.safeValueStateId,
        safeValueProvenanceDigest: sourceManifest.safeValueProvenanceDigest,
        fallbackInvoked: false,
        verificationVerdict: 1,
        value: snapshotPresent && integrityOk ? 1 : -1,
        ...overrides,
      };
    },
  };
}

/** Exercises admission with real module behavior and narrow boundary fixtures. */
function admit({
  sourceManifest = manifest(),
  objectBytes = new Uint8Array([0x53, 0x4c, 0x49, 0x44, 0x45]),
  sourceAuthority = authority(),
  portFactory = (value, calls) => executionPort(value, calls),
} = {}) {
  const calls = [];
  return admitAuthenticatedSlideRestoreProfile(
    sourceManifest,
    objectBytes,
    sourceAuthority,
    portFactory(sourceManifest, calls),
  );
}

/** Requires one call to end in the stable typed refusal family. */
function assertRefused(callback, message) {
  assert.throws(
    callback,
    (error) =>
      error instanceof ProductionSlideRestoreAdmissionError
      && error.code.startsWith("PRODUCTION_SLIDE_RESTORE_"),
    message,
  );
}

describe("authenticated SLIDE restore profile", () => {
  it("executes the complete known-answer table and registers only the returned profile", () => {
    const sourceManifest = manifest();
    const calls = [];
    const profile = admitAuthenticatedSlideRestoreProfile(
      sourceManifest,
      new Uint8Array([0x53, 0x4c, 0x49, 0x44, 0x45]),
      authority(),
      executionPort(sourceManifest, calls),
    );

    assert.deepEqual(calls, [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ]);
    assert.equal(Object.isFrozen(profile), true);
    assert.equal(isAuthenticatedSlideRestoreProfile(profile), true);
    assert.equal(isAuthenticatedSlideRestoreProfile({ ...profile }), false);
    assert.equal(profile.authenticatedObjectExecution, true);
    assert.equal(profile.authorityReleased, false);
    assert.equal(profile.productionAuthorizing, false);
    assert.equal("restoreVerdict" in profile, false);
  });

  it("refuses hostile manifest, authority and retained-object substitutions", () => {
    const accessorManifest = manifest();
    Object.defineProperty(accessorManifest, "slideCommit", {
      configurable: true,
      enumerable: true,
      get: () => SLIDE_COMMIT,
    });
    const inheritedManifest = Object.assign(Object.create({ inherited: true }), manifest());
    const cases = [
      { sourceManifest: { ...manifest(), surplus: true } },
      { sourceManifest: accessorManifest },
      { sourceManifest: new Proxy(manifest(), {}) },
      { sourceManifest: inheritedManifest },
      { sourceManifest: manifest({ galerinaCommit: "a".repeat(39) }) },
      { sourceManifest: manifest({ objectSha256: "sha256:ABC" }) },
      { sourceManifest: manifest({ packageIdentity: "@example/forged" }) },
      { sourceManifest: manifest({ exportName: "fallbackRestore" }) },
      { sourceManifest: manifest({ safeValueTypeId: "String" }) },
      { sourceManifest: manifest({ currentEpoch: Number.MAX_SAFE_INTEGER + 1 }) },
      { sourceAuthority: authority({ at: "2026-08-11T00:00:00.000Z" }) },
      { sourceManifest: manifest({ delegationSerial: 6 }) },
      { sourceAuthority: authority({ isRevoked: (keyId) => keyId === "offline-root-v1" }) },
      { sourceAuthority: authority({ isRevoked: (keyId) => keyId === "slide-object-signer-v1" }) },
      { sourceAuthority: authority({ verifyEd25519: () => false }) },
      { sourceAuthority: authority({ verifyMlDsa65: () => "true" }) },
      { sourceAuthority: authority({ verifyEd25519: () => { throw new Error("fault"); } }) },
      { sourceAuthority: authority({ digestObject: () => DIGEST("9") }) },
      { objectBytes: new Uint8Array() },
    ];
    for (const [index, input] of cases.entries()) {
      assertRefused(() => admit(input), `hostile substitution case ${index}`);
    }
  });

  it("refuses every malformed or disagreeing execution observation", () => {
    const changes = [
      { status: "SUCCEEDED_UNAUTHENTICATED" },
      { packageIdentity: "@example/forged" },
      { exportName: "fallbackRestore" },
      { objectSha256: DIGEST("9") },
      { packageSetDigest: DIGEST("9") },
      { slideBundleDigest: DIGEST("9") },
      { packageDescriptorDigest: DIGEST("9") },
      { compilerProfileId: "forged-profile" },
      { toolManifestDigest: DIGEST("9") },
      { currentEpoch: 16 },
      { safeValueTypeId: "String" },
      { safeValueStateId: "unsafe.scalar.int.v1" },
      { safeValueProvenanceDigest: DIGEST("9") },
      { fallbackInvoked: true },
      { verificationVerdict: 0 },
      { value: 0 },
      { surplus: true },
    ];
    for (const change of changes) {
      assertRefused(() => admit({
        portFactory: (sourceManifest, calls) =>
          executionPort(sourceManifest, calls, change),
      }));
    }

    assertRefused(() => admit({
      portFactory: () => ({
        schema: "galerina.production-slide-restore.execution-port.v1",
        executeAndVerify() {
          throw new Error("execution fault");
        },
      }),
    }));
  });

  it("refuses callback mutation of a manifest after its initial validation", () => {
    const mutableManifest = manifest();
    assertRefused(() => admit({
      sourceManifest: mutableManifest,
      sourceAuthority: authority({
        digestObject() {
          mutableManifest.safeValueStateId = "";
          return DIGEST("1");
        },
      }),
    }));
  });
});
