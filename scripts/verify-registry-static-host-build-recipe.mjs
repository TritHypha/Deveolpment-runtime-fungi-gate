import { isProxy } from "node:util/types";

const KEYS = Object.freeze([
  "schema",
  "nodeVersion",
  "nodeSourceArchive",
  "nodeSourceSha256",
  "nodeGypPreimageSha256",
  "realmPreimageSha256",
  "sourceManifestSha256",
  "bindingSourceSha256",
  "patchSha256",
  "nasmArchiveSha256",
  "nasmExecutableSha256",
  "nasmVersion",
  "rustTarget",
  "rustProfile",
  "rustFeatures",
  "rustcVersion",
  "rustcCommit",
  "cargoVersion",
  "cargoLockSha256",
  "nodeBuildArguments",
  "opensslAssemblyRequired",
  "faultInjectionPresent",
  "externalAdapterLoaderPresent",
  "childProcessPresent",
  "toolchainIdentityMode",
  "productionAuthorizing",
]);
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const EXPECTED_DIGESTS = Object.freeze({
  nodeSourceSha256: "c8348067b41d8739ec69fd4da615cd8995ad6a76eb53e84a7fa7291c8a477eb7",
  nodeGypPreimageSha256: "6be40699da2d2211561997eed87313780bd6cd58ffce021d4e83cfa96580450d",
  realmPreimageSha256: "6b19b7e820c099e28748019277b1cfdcdf2f1167c4f937f2645072764d2ac421",
  sourceManifestSha256: "da21ac6b47d349f9afdbb3ff1335a28ddb61e3461ab36a283a506f7dbd3bdb6e",
  bindingSourceSha256: "4ec010ca2f421eb5d920d78256a08013daaaf553fe6a7aa94237a47a17fa7518",
  patchSha256: "47d618dbcf1b88cc9977a8ee83c66eea557dbf62d824ed644249e58c9e263894",
  nasmArchiveSha256: "161d0bfaff53c2f9e9f3e69fd0672323ebabafd1268976a5cec11be92a19aee7",
  nasmExecutableSha256: "04ec2385879f7e1c45dbe76c4020970555de48eeb97c23f59620ede061328f51",
  cargoLockSha256: "01e924d977bb38901aa916c290b1158c578c339e3cd96706024a466947210c90",
});

function refuse() {
  throw new TypeError("STATIC_HOST_BUILD_RECIPE_REFUSED");
}

function snapshot(value) {
  try {
    if (
      typeof value !== "object"
      || value === null
      || isProxy(value)
      || Object.getPrototypeOf(value) !== Object.prototype
    ) refuse();
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== KEYS.length
      || !KEYS.every((key, index) => ownKeys[index] === key)
    ) refuse();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result = {};
    for (const key of KEYS) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !("value" in descriptor)
        || "get" in descriptor
        || "set" in descriptor
      ) refuse();
      result[key] = descriptor.value;
    }
    return result;
  } catch (error) {
    if (error instanceof TypeError && error.message === "STATIC_HOST_BUILD_RECIPE_REFUSED") {
      throw error;
    }
    refuse();
  }
}

function exactArray(value, expected) {
  try {
    return !isProxy(value)
      && Array.isArray(value)
      && value.length === expected.length
      && value.every((item, index) => item === expected[index]);
  } catch {
    return false;
  }
}

export function verifyRegistryStaticHostBuildRecipe(value) {
  const recipe = snapshot(value);
  for (const [key, expected] of Object.entries(EXPECTED_DIGESTS)) {
    if (!SHA256.test(recipe[key]) || recipe[key] !== expected) refuse();
  }
  if (
    recipe.schema !== "galerina.registry.static-host-build-recipe.v1"
    || recipe.nodeVersion !== "24.18.0"
    || recipe.nodeSourceArchive !== "node-v24.18.0.tar.gz"
    || recipe.nasmVersion !== "3.02"
    || recipe.rustTarget !== "x86_64-pc-windows-msvc"
    || recipe.rustProfile !== "release"
    || !exactArray(recipe.rustFeatures, [])
    || recipe.rustcVersion !== "1.96.1"
    || !COMMIT.test(recipe.rustcCommit)
    || recipe.rustcCommit !== "31fca3adb283cc9dfd56b49cdee9a96eb9c96ffd"
    || recipe.cargoVersion !== "1.96.1"
    || !exactArray(recipe.nodeBuildArguments, ["release", "x64", "clang-cl"])
    || recipe.opensslAssemblyRequired !== true
    || recipe.faultInjectionPresent !== false
    || recipe.externalAdapterLoaderPresent !== false
    || recipe.childProcessPresent !== false
    || recipe.toolchainIdentityMode !== "RECORD_EXACT_AT_BUILD"
    || recipe.productionAuthorizing !== false
  ) refuse();
  return Object.freeze({
    schema: "galerina.registry.static-host-build-recipe-verification.v1",
    verdict: "CANDIDATE",
    nodeVersion: recipe.nodeVersion,
    rustTarget: recipe.rustTarget,
    rustProfile: recipe.rustProfile,
    opensslAssemblyRequired: true,
    productionAuthorizing: false,
  });
}
