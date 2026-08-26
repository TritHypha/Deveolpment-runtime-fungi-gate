import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import * as L from "../dist/index.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const registry = L.loadProductRegistry(
  readFileSync(resolve(REPOSITORY_ROOT, "product-registry/product-profiles.v1.json")),
);
const galerinaProfile = L.resolveProductProfile(registry, {
  productId: "galerina",
  safetyProfile: "strict",
  buildMode: "build-production",
  physicalProfile: "1",
});
assert.equal(galerinaProfile.ok, true);
const plannedTrametes = registry.products.find((row) => row.productId === "trametes");
assert.ok(plannedTrametes);

test("fixed Galerina selection resolves through the generated runtime registry", () => {
  const selected = L.requireAdmittedProductProfile(L.GALERINA_SELECTION);
  assert.equal(selected.productId, "galerina");
  assert.equal(selected.policyDigest, galerinaProfile.profile.policyDigest);
});

function input(source, deploymentProfile = "dev") {
  const parsed = L.parseProgram(source, "product-policy.fungi");
  return {
    ast: parsed.ast,
    flows: parsed.flows,
    effectResults: L.checkEffects(parsed.flows, parsed.ast),
    deploymentProfile,
    sourceFile: "product-policy.fungi",
  };
}

const clean = `flow answer() -> Int {
  return 1
}`;
const denied = `secure flow getUser(id: String) -> Result<String, String>
contract {
  intent { "Return user data." }
  effects { database.read }
  response {
    returns UserDto
    denies { email }
  }
}
{
  let user = UsersDB.read(id)?
  return Ok(user.email)
}`;

test("Galerina product policy is behaviourally identical for clean and denied fixtures", () => {
  for (const source of [clean, denied]) {
    const policyInput = input(source, "production");
    const expected = L.verifyGovernance(
      policyInput.ast,
      policyInput.flows,
      policyInput.effectResults,
      policyInput.deploymentProfile,
      policyInput.sourceFile,
    );
    const actual = L.evaluateProductPolicy(galerinaProfile.profile, policyInput);
    assert.equal(actual.ok, true);
    assert.deepEqual(actual.diagnostics, expected.diagnostics);
    assert.deepEqual(actual.evidence, expected);
  }
});

test("non-admitted and substituted policy identities refuse without diagnostics", () => {
  const policyInput = input(clean);
  assert.deepEqual(
    L.evaluateProductPolicy(plannedTrametes, policyInput),
    { ok: false, code: "PRODUCT_POLICY_NOT_ADMITTED", diagnostics: [] },
  );
  assert.deepEqual(
    L.evaluateProductPolicy({
      ...galerinaProfile.profile,
      policyId: "substituted-policy",
    }, policyInput),
    { ok: false, code: "PRODUCT_POLICY_NOT_ADMITTED", diagnostics: [] },
  );
});

test("CLI and runtime cannot bypass the product policy seam", () => {
  for (const path of [
    "packages-ts/galerina-core-compiler/src/cli.ts",
    "packages-ts/galerina-core-compiler/src/runtime.ts",
  ]) {
    const source = readFileSync(resolve(REPOSITORY_ROOT, path), "utf8");
    assert.doesNotMatch(source, /\bverifyGovernance\s*\(/, `${path} contains a direct governance call`);
    assert.match(source, /\bevaluateProductPolicy\s*\(/, `${path} does not route through product policy`);
  }
});
