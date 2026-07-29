import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  ERR_REGISTRY_INDEX_BAD_SIGNATURE,
  ERR_REGISTRY_INDEX_MALFORMED,
  ERR_REGISTRY_INDEX_NO_KEY,
  ERR_REGISTRY_INDEX_UNSIGNED,
  REGISTRY_INDEX_V2_CONTEXT,
  RegistryIndexError,
  buildRegistryIndex,
  registryIndexSignaturePreimage,
  signRegistryIndex,
  signRegistryIndexHybrid,
  verifyRegistryIndex,
} from "../dist/index.js";

const KEY_ID = "registry-hybrid-test";
const digest = (prefix, message) =>
  `${prefix}:${createHash("sha256").update(message).digest("base64")}`;
const signEd25519 = (message) => digest("ed25519", message);
const signMlDsa65 = (message) => digest("ml-dsa-65", message);
const verifiers = {
  ed25519: (message, signature, keyId) =>
    keyId === KEY_ID ? signature === signEd25519(message) : "no-key",
  mlDsa65: (message, signature, keyId) =>
    keyId === KEY_ID ? signature === signMlDsa65(message) : "no-key",
};

const unsigned = () =>
  buildRegistryIndex({
    registry: "galerina-central",
    issuedAt: "2026-07-29T00:00:00Z",
    entries: [],
  });
const signed = () =>
  signRegistryIndexHybrid(unsigned(), KEY_ID, signEd25519, signMlDsa65);

test("v2 hybrid index signs and verifies both component signatures", () => {
  const index = signed();
  assert.equal(index.schema, "galerina-registry-index/v2");
  assert.equal(index.signature.algorithm, "Ed25519+ML-DSA-65");
  assert.equal(index.signature.context, REGISTRY_INDEX_V2_CONTEXT);
  assert.equal(verifyRegistryIndex(index, verifiers), "verified");
});

test("v2 signature preimage carries a fixed domain before canonical bytes", () => {
  const preimage = new TextDecoder().decode(registryIndexSignaturePreimage(unsigned(), KEY_ID));
  assert.match(
    preimage,
    new RegExp(
      `^${REGISTRY_INDEX_V2_CONTEXT}\\u0000Ed25519\\+ML-DSA-65\\u0000${KEY_ID}\\u0000jcs\\u0000`,
    ),
  );
  assert.match(preimage, /"schema":"galerina-registry-index\/v2"/);
});

test("missing or tampered hybrid halves are terminal refusals", () => {
  const index = signed();
  const missingMlDsa = {
    ...index,
    signature: { ...index.signature, mlDsa65Signature: "" },
  };
  assert.throws(
    () => verifyRegistryIndex(missingMlDsa, verifiers),
    (error) => error instanceof RegistryIndexError && error.code === ERR_REGISTRY_INDEX_UNSIGNED,
  );

  const badEd25519 = {
    ...index,
    signature: { ...index.signature, ed25519Signature: "tampered" },
  };
  assert.throws(
    () => verifyRegistryIndex(badEd25519, verifiers),
    (error) => error.code === ERR_REGISTRY_INDEX_BAD_SIGNATURE,
  );

  const badMlDsa = {
    ...index,
    signature: { ...index.signature, mlDsa65Signature: "tampered" },
  };
  assert.throws(
    () => verifyRegistryIndex(badMlDsa, verifiers),
    (error) => error.code === ERR_REGISTRY_INDEX_BAD_SIGNATURE,
  );

  const wrongContext = {
    ...index,
    signature: { ...index.signature, context: "galerina.registry.index.sig.other" },
  };
  assert.throws(
    () => verifyRegistryIndex(wrongContext, verifiers),
    (error) => error.code === ERR_REGISTRY_INDEX_UNSIGNED,
  );
});

test("legacy verifier injection and algorithm downgrade cannot verify v2", () => {
  const index = signed();
  assert.throws(
    () => verifyRegistryIndex(index, verifiers.ed25519),
    (error) => error.code === ERR_REGISTRY_INDEX_NO_KEY,
  );

  const downgraded = {
    ...index,
    signature: {
      algorithm: "Ed25519",
      keyId: KEY_ID,
      signature: index.signature.ed25519Signature,
      canon: "jcs",
    },
  };
  assert.throws(
    () => verifyRegistryIndex(downgraded, verifiers),
    (error) => error.code === ERR_REGISTRY_INDEX_MALFORMED,
  );
});

test("the legacy signer cannot silently sign a v2 index", () => {
  assert.throws(
    () => signRegistryIndex(unsigned(), KEY_ID, signEd25519),
    (error) => error.code === ERR_REGISTRY_INDEX_MALFORMED,
  );
});

test("v2 refuses missing authority identity, non-string signatures, and throwing verifiers", () => {
  assert.throws(
    () => signRegistryIndexHybrid(unsigned(), "", signEd25519, signMlDsa65),
    (error) => error.code === ERR_REGISTRY_INDEX_MALFORMED,
  );
  assert.throws(
    () => signRegistryIndexHybrid(unsigned(), KEY_ID, () => undefined, signMlDsa65),
    (error) => error.code === ERR_REGISTRY_INDEX_UNSIGNED,
  );
  assert.throws(
    () => verifyRegistryIndex(signed(), {
      ...verifiers,
      mlDsa65: () => {
        throw new Error("crypto adapter rejected malformed bytes");
      },
    }),
    (error) => error.code === ERR_REGISTRY_INDEX_BAD_SIGNATURE,
  );
});

test("historical v1 remains verifiable but is not the builder default", () => {
  const legacyUnsigned = {
    ...unsigned(),
    schema: "galerina-registry-index/v1",
  };
  const legacySigned = signRegistryIndex(legacyUnsigned, KEY_ID, signEd25519);
  assert.equal(legacySigned.signature.algorithm, "Ed25519");
  assert.equal(verifyRegistryIndex(legacySigned, verifiers.ed25519), "verified");
  assert.equal(unsigned().schema, "galerina-registry-index/v2");
});
