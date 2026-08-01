import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  verifyRegistryStaticHostBuildRecipe,
} from "../verify-registry-static-host-build-recipe.mjs";

const recipePath = new URL(
  "../../packages-galerina/galerina-framework-app-kernel/native/registry-activation-host/host-build-recipe.json",
  import.meta.url,
);

async function recipe() {
  return JSON.parse(await readFile(recipePath, "utf8"));
}

test("exact closed linked-host recipe remains non-authorizing", async () => {
  const result = verifyRegistryStaticHostBuildRecipe(await recipe());
  assert.deepEqual(result, {
    schema: "galerina.registry.static-host-build-recipe-verification.v1",
    verdict: "CANDIDATE",
    nodeVersion: "24.18.0",
    rustTarget: "x86_64-pc-windows-msvc",
    rustProfile: "release",
    opensslAssemblyRequired: true,
    productionAuthorizing: false,
  });
  assert.equal(Object.isFrozen(result), true);
});

test("substitution, debug features, no-assembly and surplus fields refuse", async () => {
  const valid = await recipe();
  for (const candidate of [
    { ...valid, nodeSourceSha256: "0".repeat(64) },
    { ...valid, nodeGypPreimageSha256: "0".repeat(64) },
    { ...valid, bindingSourceSha256: "0".repeat(64) },
    { ...valid, nasmExecutableSha256: "0".repeat(64) },
    { ...valid, rustProfile: "debug" },
    { ...valid, rustFeatures: ["fault-injection"] },
    { ...valid, opensslAssemblyRequired: false },
    { ...valid, externalAdapterLoaderPresent: true },
    { ...valid, extra: true },
  ]) {
    assert.throws(
      () => verifyRegistryStaticHostBuildRecipe(candidate),
      /STATIC_HOST_BUILD_RECIPE_REFUSED/u,
    );
  }
});

test("accessors and hostile proxies refuse without invoking caller code", async () => {
  const accessor = await recipe();
  let getterCalls = 0;
  Object.defineProperty(accessor, "nodeVersion", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "24.18.0";
    },
  });
  assert.throws(
    () => verifyRegistryStaticHostBuildRecipe(accessor),
    /STATIC_HOST_BUILD_RECIPE_REFUSED/u,
  );
  assert.equal(getterCalls, 0);

  const hostile = new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype trap");
    },
  });
  assert.throws(
    () => verifyRegistryStaticHostBuildRecipe(hostile),
    /STATIC_HOST_BUILD_RECIPE_REFUSED/u,
  );

  const valid = await recipe();
  const revoked = Proxy.revocable([], {});
  revoked.revoke();
  assert.throws(
    () => verifyRegistryStaticHostBuildRecipe({
      ...valid,
      rustFeatures: revoked.proxy,
    }),
    /STATIC_HOST_BUILD_RECIPE_REFUSED/u,
  );
});
