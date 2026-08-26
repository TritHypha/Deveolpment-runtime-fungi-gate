import assert from "node:assert/strict";
import { test } from "node:test";

import * as L from "../dist/index.js";

const POLICY_DIGEST = `sha256:${"a".repeat(64)}`;

function registry(overrides = {}) {
  return JSON.stringify({
    schema: "product-profiles.v1",
    schemaVersion: 1,
    products: [
      {
        productId: "galerina",
        productClass: "production",
        governanceClass: "zero-trust",
        compatibilityState: "admitted",
        policyId: "galerina-governance-v1",
        policyDigest: POLICY_DIGEST,
        packageNamespaces: ["@galerina/"],
        artifactNamespace: "galerina/v1",
        admittedSafetyProfiles: ["strict", "high_integrity", "deterministic"],
        admittedBuildModes: [
          "build-production",
          "build-deterministic",
          "build-wasm-standalone",
          "build-wasm-hybrid",
        ],
        admittedPhysicalProfiles: ["1"],
        entrypointId: "galerina",
        externalAuthorizerId: "vok",
      },
      {
        productId: "trametes",
        productClass: "production",
        governanceClass: "admitted-closed-network",
        compatibilityState: "planned",
        policyId: "trametes-policy-unavailable",
        policyDigest: POLICY_DIGEST,
        packageNamespaces: [],
        artifactNamespace: "trametes/planned/v1",
        admittedSafetyProfiles: [],
        admittedBuildModes: [],
        admittedPhysicalProfiles: [],
        entrypointId: "trametes-unavailable",
        externalAuthorizerId: "vok",
      },
    ],
    ...overrides,
  });
}

function selection(overrides = {}) {
  return {
    productId: "galerina",
    safetyProfile: "strict",
    buildMode: "build-production",
    physicalProfile: "1",
    ...overrides,
  };
}

test("closed registry admits only the exact Galerina selection", () => {
  const loaded = L.loadProductRegistry(registry());
  const admitted = L.resolveProductProfile(loaded, selection());
  assert.equal(admitted.ok, true);
  assert.equal(Object.isFrozen(admitted), true);
  assert.equal(Object.isFrozen(admitted.profile), true);
  assert.equal(Object.isFrozen(admitted.profile.admittedBuildModes), true);

  assert.deepEqual(
    L.resolveProductProfile(loaded, selection({ productId: "trametes" })),
    { ok: false, code: "PRODUCT_NOT_ADMITTED" },
  );
  assert.deepEqual(
    L.resolveProductProfile(loaded, selection({ productId: "quantum-research" })),
    { ok: false, code: "PRODUCT_UNKNOWN" },
  );
  for (const physicalProfile of ["64", "32", "256"]) {
    assert.deepEqual(
      L.resolveProductProfile(loaded, selection({ physicalProfile })),
      { ok: false, code: "PHYSICAL_PROFILE_NOT_ADMITTED" },
    );
  }
  assert.deepEqual(
    L.resolveProductProfile(loaded, selection({ safetyProfile: "fast" })),
    { ok: false, code: "SAFETY_PROFILE_NOT_ADMITTED" },
  );
  assert.deepEqual(
    L.resolveProductProfile(loaded, selection({ buildMode: "build-trametes" })),
    { ok: false, code: "BUILD_MODE_NOT_ADMITTED" },
  );
});

test("runtime registry admission refuses surplus, duplicate and malformed identities", () => {
  assert.throws(
    () => L.loadProductRegistry(registry({ extra: true })),
    /REGISTRY_FIELDS/,
  );

  const duplicate = JSON.parse(registry());
  duplicate.products.push({ ...duplicate.products[0] });
  assert.throws(() => L.loadProductRegistry(JSON.stringify(duplicate)), /REGISTRY_PRODUCT_DUPLICATE/);

  const malformed = JSON.parse(registry());
  malformed.products[0].policyDigest = "sha256:not-a-digest";
  assert.throws(() => L.loadProductRegistry(JSON.stringify(malformed)), /REGISTRY_PRODUCT_FIELDS/);

  const duplicateKey = registry().replace(
    '"schema":"product-profiles.v1",',
    '"schema":"product-profiles.v1","\\u0073chema":"product-profiles.v1",',
  );
  assert.throws(() => L.loadProductRegistry(duplicateKey), /REGISTRY_JSON_DUPLICATE/);
});
