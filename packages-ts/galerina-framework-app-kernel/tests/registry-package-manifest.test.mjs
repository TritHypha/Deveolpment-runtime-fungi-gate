import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  ERR_REGISTRY_MANIFEST_BAD_SIGNATURE,
  ERR_REGISTRY_MANIFEST_KEY_MISMATCH,
  ERR_REGISTRY_MANIFEST_MALFORMED,
  ERR_REGISTRY_MANIFEST_NO_KEY,
  ERR_REGISTRY_MANIFEST_UNSIGNED,
  REGISTRY_PACKAGE_MANIFEST_V1_CONTEXT,
  RegistryPackageManifestError,
  packageManifestSignaturePreimage,
  signRegistryPackageManifest,
  verifyRegistryPackageManifest,
} from "../dist/index.js";

const KEY_ID = "942d6b2726b0a991";
const digest = (prefix, message) =>
  Buffer.from(
    `${prefix}:${createHash("sha256").update(message).digest("hex")}`,
  ).toString("base64");
const signEd25519 = (message) => digest("ed25519", message);
const signMlDsa65 = (message) => digest("ml-dsa-65", message);
const verifiers = {
  ed25519: (message, signature, keyId) =>
    keyId === KEY_ID ? signature === signEd25519(message) : "no-key",
  mlDsa65: (message, signature, keyId) =>
    keyId === KEY_ID ? signature === signMlDsa65(message) : "no-key",
};

const unsigned = () => ({
  schema: "galerina-package-manifest/v1",
  name: "@galerina/auth",
  version: "1.0.0-beta.2",
  registry: "https://registry.galerina.dev",
  description: "Authentication and authorization factors.",
  capabilities: ["secret.read", "audit.write"],
  effects: ["secret.read", "audit.write", "network.outbound"],
  targets: ["wasm", "cpu"],
  installScript: null,
  hash: `sha256:${"a".repeat(64)}`,
  publisher: "galerina-governance",
  certificationLevel: "certified",
  riskRating: "low",
  governance: {
    reviewed: true,
    reviewedBy: "owner",
    reviewedAt: "2026-07-30T10:00:00.000Z",
  },
});

const signed = () =>
  signRegistryPackageManifest(
    unsigned(),
    KEY_ID,
    signEd25519,
    signMlDsa65,
  );

test("operational hybrid signature verifies a reviewed package manifest", () => {
  const manifest = signed();
  assert.equal(manifest.signerKeyId, KEY_ID);
  assert.match(manifest.signature, /^galerina-hybrid-v1\./);
  assert.equal(
    verifyRegistryPackageManifest(manifest, verifiers, KEY_ID),
    "verified",
  );
});

test("manifest signature preimage carries a fixed domain and signing identity", () => {
  const manifest = { ...unsigned(), signerKeyId: KEY_ID };
  const preimage = new TextDecoder().decode(
    packageManifestSignaturePreimage(manifest),
  );
  assert.match(
    preimage,
    new RegExp(
      `^${REGISTRY_PACKAGE_MANIFEST_V1_CONTEXT}\\u0000Ed25519\\+ML-DSA-65\\u0000${KEY_ID}\\u0000jcs\\u0000`,
    ),
  );
  assert.match(preimage, /"name":"@galerina\/auth"/);
  assert.doesNotMatch(preimage, /"signature"/);
});

test("tampering with any signed manifest fact is refused", () => {
  for (const patch of [
    { version: "1.0.0-attacker" },
    { hash: `sha256:${"b".repeat(64)}` },
    { capabilities: ["secret.read", "process.spawn"] },
    { certificationLevel: "enterprise" },
  ]) {
    assert.throws(
      () => verifyRegistryPackageManifest(
        { ...signed(), ...patch },
        verifiers,
        KEY_ID,
      ),
      (error) =>
        error instanceof RegistryPackageManifestError
        && error.code === ERR_REGISTRY_MANIFEST_BAD_SIGNATURE,
    );
  }
});

test("missing, partial, malformed, and downgraded signatures refuse", () => {
  for (const signature of [
    undefined,
    "",
    "placeholder",
    "galerina-hybrid-v1.only-one-half",
    "ed25519-only.fixture",
  ]) {
    assert.throws(
      () => verifyRegistryPackageManifest(
        { ...unsigned(), signerKeyId: KEY_ID, signature },
        verifiers,
        KEY_ID,
      ),
      (error) =>
        error.code === (
          signature === undefined || signature === ""
            ? ERR_REGISTRY_MANIFEST_UNSIGNED
            : ERR_REGISTRY_MANIFEST_MALFORMED
        ),
    );
  }
});

test("delegated signer identity is pinned and both verifiers are required", () => {
  assert.throws(
    () => verifyRegistryPackageManifest(signed(), verifiers, "different-key"),
    (error) => error.code === ERR_REGISTRY_MANIFEST_KEY_MISMATCH,
  );
  assert.throws(
    () => verifyRegistryPackageManifest(signed(), {
      ...verifiers,
      mlDsa65: () => "no-key",
    }, KEY_ID),
    (error) => error.code === ERR_REGISTRY_MANIFEST_NO_KEY,
  );
});

test("throwing and truthy non-boolean verifiers cannot authorize a manifest", () => {
  assert.throws(
    () => verifyRegistryPackageManifest(signed(), {
      ...verifiers,
      ed25519: () => {
        throw new Error("crypto adapter failure");
      },
    }, KEY_ID),
    (error) => error.code === ERR_REGISTRY_MANIFEST_BAD_SIGNATURE,
  );
  assert.throws(
    () => verifyRegistryPackageManifest(signed(), {
      ...verifiers,
      mlDsa65: () => ({ ok: true }),
    }, KEY_ID),
    (error) => error.code === ERR_REGISTRY_MANIFEST_BAD_SIGNATURE,
  );
});

test("signer refuses an empty identity or incomplete hybrid result", () => {
  assert.throws(
    () => signRegistryPackageManifest(
      unsigned(),
      "",
      signEd25519,
      signMlDsa65,
    ),
    (error) => error.code === ERR_REGISTRY_MANIFEST_MALFORMED,
  );
  assert.throws(
    () => signRegistryPackageManifest(unsigned(), KEY_ID, () => "", signMlDsa65),
    (error) => error.code === ERR_REGISTRY_MANIFEST_UNSIGNED,
  );
});
