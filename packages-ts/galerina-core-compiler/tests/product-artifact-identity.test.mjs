import assert from "node:assert/strict";
import { test } from "node:test";

import * as L from "../dist/index.js";

const CONTENT_DIGEST = `sha256:${"2".repeat(64)}`;
const BASE = Object.freeze({
  schemaVersion: 1,
  artifactNamespace: "galerina/v1",
  productId: "galerina",
  governanceClass: "zero-trust",
  policyDigest: `sha256:${"a".repeat(64)}`,
  safetyProfile: "strict",
  buildMode: "build-production",
  physicalProfile: "1",
});

test("product artifact identity binds every closed axis", () => {
  const baseline = L.productArtifactKey(BASE, CONTENT_DIGEST);
  assert.match(baseline, /^product-artifact-v1:[0-9a-f]{64}$/);

  for (const [field, value] of [
    ["artifactNamespace", "trametes/v1"],
    ["productId", "trametes"],
    ["governanceClass", "admitted-closed-network"],
    ["policyDigest", `sha256:${"1".repeat(64)}`],
    ["safetyProfile", "deterministic"],
    ["buildMode", "build-deterministic"],
    ["physicalProfile", "64"],
  ]) {
    assert.notEqual(
      baseline,
      L.productArtifactKey({ ...BASE, [field]: value }, CONTENT_DIGEST),
      `${field} must be identity-bearing`,
    );
  }
});

test("canonical identity refuses missing, surplus and malformed fields", () => {
  const { productId: _productId, ...missing } = BASE;
  assert.throws(() => L.productArtifactKey(missing, CONTENT_DIGEST), /PRODUCT_ARTIFACT_CONTEXT/);
  assert.throws(() => L.productArtifactKey({ ...BASE, surplus: true }, CONTENT_DIGEST), /PRODUCT_ARTIFACT_CONTEXT/);
  assert.throws(() => L.productArtifactKey(Object.assign(Object.create({ inherited: true }), BASE), CONTENT_DIGEST), /PRODUCT_ARTIFACT_CONTEXT/);
  assert.throws(() => L.productArtifactKey({ ...BASE, physicalProfile: "65" }, CONTENT_DIGEST), /PRODUCT_ARTIFACT_CONTEXT/);
  assert.throws(() => L.productArtifactKey(BASE, "not-a-digest"), /PRODUCT_ARTIFACT_DIGEST/);
});

test("product binding does not change width-independent semantic GIR bytes", () => {
  const gir = Object.freeze({
    schemaVersion: "fungi.gir.v1",
    flows: Object.freeze([{ name: "answer", nodes: Object.freeze([]) }]),
  });
  const before = L.computeGIRHash(gir);
  L.productArtifactKey(BASE, before);
  assert.equal(L.computeGIRHash(gir), before);
});

test("execution and pure-flow cache keys require and bind product context", () => {
  const args = new Map([["value", { __tag: "int", value: 7 }]]);
  const graphKey = L.executionGraphCacheKey(BASE, "answer", CONTENT_DIGEST);
  const flowKey = L.pureFlowCacheKey(BASE, "answer", args, "source-a");
  assert.notEqual(graphKey, L.executionGraphCacheKey({ ...BASE, productId: "trametes" }, "answer", CONTENT_DIGEST));
  assert.notEqual(flowKey, L.pureFlowCacheKey({ ...BASE, productId: "trametes" }, "answer", args, "source-a"));
});
