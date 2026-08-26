import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
} from "node:crypto";
import test from "node:test";

import {
  ERR_REGISTRY_DELEGATION_BAD_SIGNATURE,
  ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  ERR_REGISTRY_DELEGATION_MALFORMED,
  ERR_REGISTRY_DELEGATION_NOT_ACTIVE,
  ERR_REGISTRY_DELEGATION_REVOKED,
  ERR_REGISTRY_DELEGATION_ROLE,
  ERR_REGISTRY_DELEGATION_STALE,
  ERR_REGISTRY_DELEGATION_UNSIGNED,
  REGISTRY_DELEGATION_V1_CONTEXT,
  RegistryAuthorityError,
  buildRegistryAuthorityDelegation,
  signRegistryPackageManifest,
  registryAuthorityDelegationPreimage,
  signRegistryAuthorityDelegation,
  buildRegistryIndex,
  signRegistryIndexHybrid,
  verifyRegistryAuthorityDelegation,
  verifyRegistryIndexUnderDelegation,
  verifyRegistryPackageManifestUnderDelegation,
} from "../dist/index.js";

const ROOT_KEY_ID = "21415420b447e219";
const OPERATIONAL_KEY_ID = "registry-operational-test-1";
const { privateKey: rootPrivateKey, publicKey: rootPublicKey } =
  generateKeyPairSync("ed25519");

const fingerprint = (text) =>
  createHash("sha256").update(text).digest("hex");

const unsigned = () =>
  buildRegistryAuthorityDelegation({
    registry: "galerina-central",
    serial: 1,
    issuedAt: "2026-07-30T10:00:00.000Z",
    notBefore: "2026-07-30T10:00:00.000Z",
    notAfter: "2027-07-30T10:00:00.000Z",
    rootKeyId: ROOT_KEY_ID,
    operational: {
      keyId: OPERATIONAL_KEY_ID,
      algorithm: "Ed25519+ML-DSA-65",
      ed25519PublicKeySha256: fingerprint("disposable-ed25519-public-key"),
      mlDsa65PublicKeySha256: fingerprint("disposable-ml-dsa-65-public-key"),
    },
    roles: ["package-manifest.sign", "registry-index.sign"],
  });

const signed = () =>
  signRegistryAuthorityDelegation(
    unsigned(),
    (message) => cryptoSign(null, message, rootPrivateKey).toString("base64"),
    (message) => Buffer.from(
      `root-ml-dsa-65:${fingerprint(message)}`,
    ).toString("base64"),
  );

const verifyRoot = {
  ed25519: (message, signature, keyId) => {
    if (keyId !== ROOT_KEY_ID) return "no-key";
    return cryptoVerify(
      null,
      message,
      rootPublicKey,
      Buffer.from(signature, "base64"),
    );
  },
  mlDsa65: (message, signature, keyId) =>
    keyId === ROOT_KEY_ID
      ? signature === Buffer.from(
        `root-ml-dsa-65:${fingerprint(message)}`,
      ).toString("base64")
      : "no-key",
};

const verify = (delegation, overrides = {}) =>
  verifyRegistryAuthorityDelegation(delegation, {
    expectedRootKeyId: ROOT_KEY_ID,
    at: "2026-08-01T00:00:00.000Z",
    minSerial: 0,
    requiredRoles: ["package-manifest.sign", "registry-index.sign"],
    isRevoked: () => false,
    verifyRoot,
    ...overrides,
  });

test("root-signed operational delegation verifies with the two exact signing roles", () => {
  const delegation = signed();
  assert.deepEqual(delegation.roles, [
    "package-manifest.sign",
    "registry-index.sign",
  ]);
  assert.equal(delegation.rootSignature.algorithm, "Ed25519+ML-DSA-65");
  assert.equal(delegation.operational.keyId, OPERATIONAL_KEY_ID);
  assert.equal(verify(delegation), "verified");
});

test("delegation preimage domain-separates the root signature", () => {
  const preimage = new TextDecoder().decode(
    registryAuthorityDelegationPreimage(unsigned()),
  );
  assert.match(
    preimage,
    new RegExp(
      `^${REGISTRY_DELEGATION_V1_CONTEXT}\\u0000Ed25519\\+ML-DSA-65\\u0000${ROOT_KEY_ID}\\u0000jcs\\u0000`,
    ),
  );
  assert.match(
    preimage,
    /"keyId":"registry-operational-test-1"/,
  );
});

test("tampering with the operational identity or fingerprints invalidates the root signature", () => {
  const delegation = signed();
  for (const operational of [
    { ...delegation.operational, keyId: "attacker" },
    {
      ...delegation.operational,
      ed25519PublicKeySha256: "0".repeat(64),
    },
    {
      ...delegation.operational,
      mlDsa65PublicKeySha256: "0".repeat(64),
    },
  ]) {
    assert.throws(
      () => verify({ ...delegation, operational }),
      (error) =>
        error instanceof RegistryAuthorityError
        && error.code === ERR_REGISTRY_DELEGATION_BAD_SIGNATURE,
    );
  }
});

test("root pin mismatch and unavailable root refuse the delegation", () => {
  assert.throws(
    () => verify(signed(), { expectedRootKeyId: "different-root" }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  );
  assert.throws(
    () => verify(signed(), {
      verifyRoot: {
        ...verifyRoot,
        ed25519: () => "no-key",
      },
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  );
});

test("not-yet-valid and expired delegations are terminal refusals", () => {
  assert.throws(
    () => verify(signed(), { at: "2026-07-30T09:59:59.999Z" }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_NOT_ACTIVE,
  );
  assert.throws(
    () => verify(signed(), { at: "2027-07-30T10:00:00.001Z" }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_NOT_ACTIVE,
  );
});

test("revocation of either authority refuses the delegation", () => {
  for (const revokedKeyId of [ROOT_KEY_ID, OPERATIONAL_KEY_ID]) {
    assert.throws(
      () => verify(signed(), {
        isRevoked: (keyId) => keyId === revokedKeyId,
      }),
      (error) => error.code === ERR_REGISTRY_DELEGATION_REVOKED,
    );
  }
});

test("roles are closed, unique, and must include the caller's required roles", () => {
  assert.throws(
    () => buildRegistryAuthorityDelegation({
      ...unsigned(),
      roles: ["registry-index.sign", "registry-index.sign"],
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_MALFORMED,
  );
  assert.throws(
    () => buildRegistryAuthorityDelegation({
      ...unsigned(),
      roles: ["registry-index.sign", "root.rotate"],
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_MALFORMED,
  );
  assert.throws(
    () => verify(signed(), { requiredRoles: ["package-manifest.sign", "unknown"] }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_ROLE,
  );
});

test("delegation serial must be strictly newer than the accepted floor", () => {
  assert.throws(
    () => verify(signed(), { minSerial: 1 }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_STALE,
  );
  assert.equal(verify(signed(), { minSerial: 0 }), "verified");
});

test("malformed dates, validity inversion, and malformed fingerprints are refused", () => {
  for (const patch of [
    { issuedAt: "not-a-date" },
    { notBefore: "2027-07-30T10:00:00.001Z" },
    { notAfter: "2026-07-30T09:59:59.999Z" },
    {
      operational: {
        ...unsigned().operational,
        ed25519PublicKeySha256: "sha256:pending",
      },
    },
  ]) {
    assert.throws(
      () => buildRegistryAuthorityDelegation({ ...unsigned(), ...patch }),
      (error) => error.code === ERR_REGISTRY_DELEGATION_MALFORMED,
    );
  }
});

test("throwing and truthy non-boolean verifiers cannot authorize", () => {
  assert.throws(
    () => verify(signed(), {
      verifyRoot: {
        ...verifyRoot,
        ed25519: () => {
          throw new Error("adapter failure");
        },
      },
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_BAD_SIGNATURE,
  );
  assert.throws(
    () => verify(signed(), {
      verifyRoot: {
        ...verifyRoot,
        mlDsa65: () => ({ ok: true }),
      },
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_BAD_SIGNATURE,
  );
});

test("missing or downgraded root signature halves cannot authorize delegation", () => {
  const delegation = signed();
  assert.throws(
    () => verify({
      ...delegation,
      rootSignature: {
        ...delegation.rootSignature,
        mlDsa65Signature: "",
      },
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_UNSIGNED,
  );
  assert.throws(
    () => verify({
      ...delegation,
      rootSignature: {
        algorithm: "Ed25519",
        keyId: ROOT_KEY_ID,
        signature: delegation.rootSignature.ed25519Signature,
        canon: "jcs",
        context: REGISTRY_DELEGATION_V1_CONTEXT,
      },
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_UNSIGNED,
  );
});

test("registry index verification is bound to the delegated operational key", () => {
  const indexSign = (prefix, message) =>
    Buffer.from(`${prefix}:${fingerprint(message)}`).toString("base64");
  const index = signRegistryIndexHybrid(
    buildRegistryIndex({
      registry: "galerina-central",
      issuedAt: "2026-08-01T00:00:00.000Z",
      entries: [],
    }),
    OPERATIONAL_KEY_ID,
    (message) => indexSign("ed25519", message),
    (message) => indexSign("ml-dsa-65", message),
  );
  const verifyIndex = {
    ed25519: (message, signature, keyId) =>
      keyId === OPERATIONAL_KEY_ID
        ? signature === indexSign("ed25519", message)
        : "no-key",
    mlDsa65: (message, signature, keyId) =>
      keyId === OPERATIONAL_KEY_ID
        ? signature === indexSign("ml-dsa-65", message)
        : "no-key",
  };
  const options = {
    authority: {
      expectedRootKeyId: ROOT_KEY_ID,
      at: "2026-08-01T00:00:00.000Z",
      minSerial: 0,
      isRevoked: () => false,
      verifyRoot,
    },
    operationalPublicKeyFingerprints: {
      ed25519: unsigned().operational.ed25519PublicKeySha256,
      mlDsa65: unsigned().operational.mlDsa65PublicKeySha256,
    },
    verifyIndex,
  };

  assert.equal(
    verifyRegistryIndexUnderDelegation(index, signed(), options),
    "verified",
  );
  assert.throws(
    () => verifyRegistryIndexUnderDelegation(index, signed(), {
      ...options,
      operationalPublicKeyFingerprints: {
        ...options.operationalPublicKeyFingerprints,
        mlDsa65: "0".repeat(64),
      },
    }),
    (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  );
  assert.throws(
    () => verifyRegistryIndexUnderDelegation(
      {
        ...index,
        signature: { ...index.signature, keyId: "different-operational-key" },
      },
      signed(),
      options,
    ),
    (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  );
  assert.throws(
    () => verifyRegistryIndexUnderDelegation(
      {
        ...index,
        schema: "galerina-registry-index/v1",
        signature: {
          algorithm: "Ed25519",
          keyId: OPERATIONAL_KEY_ID,
          signature: index.signature.ed25519Signature,
          canon: "jcs",
        },
      },
      signed(),
      options,
    ),
    (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  );
});

const manifestSign = (prefix, message) =>
  Buffer.from(`${prefix}:${fingerprint(message)}`).toString("base64");

const unsignedPackageManifest = () => ({
  schema: "galerina-package-manifest/v1",
  name: "@galerina/auth",
  version: "1.0.0-beta.2",
  hash: `sha256:${"a".repeat(64)}`,
  keyId: OPERATIONAL_KEY_ID,
  governance: {
    reviewed: true,
    reviewedBy: "disposable-test-reviewer",
    reviewedAt: "2026-07-30T10:00:00.000Z",
  },
});

const signedPackageManifest = () =>
  signRegistryPackageManifest(
    unsignedPackageManifest(),
    OPERATIONAL_KEY_ID,
    (message) => manifestSign("manifest-ed25519", message),
    (message) => manifestSign("manifest-ml-dsa-65", message),
  );

const verifyManifest = {
  ed25519: (message, signature, keyId) =>
    keyId === OPERATIONAL_KEY_ID
      ? signature === manifestSign("manifest-ed25519", message)
      : "no-key",
  mlDsa65: (message, signature, keyId) =>
    keyId === OPERATIONAL_KEY_ID
      ? signature === manifestSign("manifest-ml-dsa-65", message)
      : "no-key",
};

const packageManifestOptions = (overrides = {}) => ({
  authority: {
    expectedRootKeyId: ROOT_KEY_ID,
    at: "2026-08-01T00:00:00.000Z",
    minSerial: 0,
    isRevoked: () => false,
    verifyRoot,
    ...overrides.authority,
  },
  operationalPublicKeyFingerprints: {
    ed25519: unsigned().operational.ed25519PublicKeySha256,
    mlDsa65: unsigned().operational.mlDsa65PublicKeySha256,
    ...overrides.operationalPublicKeyFingerprints,
  },
  verifyManifest: overrides.verifyManifest ?? verifyManifest,
});

test("package manifest verification is bound to delegated operational authority", () => {
  assert.equal(
    verifyRegistryPackageManifestUnderDelegation(
      signedPackageManifest(),
      signed(),
      packageManifestOptions(),
    ),
    "verified",
  );
});

test("delegated package manifest refuses fingerprint and signer substitution", () => {
  assert.throws(
    () => verifyRegistryPackageManifestUnderDelegation(
      signedPackageManifest(),
      signed(),
      packageManifestOptions({
        operationalPublicKeyFingerprints: {
          mlDsa65: "0".repeat(64),
        },
      }),
    ),
    (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
  );

  for (const patch of [
    { keyId: "different-operational-key" },
    { signerKeyId: "different-operational-key" },
  ]) {
    assert.throws(
      () => verifyRegistryPackageManifestUnderDelegation(
        { ...signedPackageManifest(), ...patch },
        signed(),
        packageManifestOptions(),
      ),
      (error) => error.code === ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
    );
  }
});

test("delegated package manifest requires role, active serial, and non-revoked key", () => {
  const indexOnlyDelegation = signRegistryAuthorityDelegation(
    buildRegistryAuthorityDelegation({
      ...unsigned(),
      roles: ["registry-index.sign"],
    }),
    (message) => cryptoSign(null, message, rootPrivateKey).toString("base64"),
    (message) => Buffer.from(
      `root-ml-dsa-65:${fingerprint(message)}`,
    ).toString("base64"),
  );

  assert.throws(
    () => verifyRegistryPackageManifestUnderDelegation(
      signedPackageManifest(),
      indexOnlyDelegation,
      packageManifestOptions(),
    ),
    (error) => error.code === ERR_REGISTRY_DELEGATION_ROLE,
  );
  assert.throws(
    () => verifyRegistryPackageManifestUnderDelegation(
      signedPackageManifest(),
      signed(),
      packageManifestOptions({
        authority: { minSerial: 1 },
      }),
    ),
    (error) => error.code === ERR_REGISTRY_DELEGATION_STALE,
  );
  assert.throws(
    () => verifyRegistryPackageManifestUnderDelegation(
      signedPackageManifest(),
      signed(),
      packageManifestOptions({
        authority: {
          isRevoked: (keyId) => keyId === OPERATIONAL_KEY_ID,
        },
      }),
    ),
    (error) => error.code === ERR_REGISTRY_DELEGATION_REVOKED,
  );
});
