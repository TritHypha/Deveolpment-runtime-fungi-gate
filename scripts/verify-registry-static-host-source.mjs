import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FILE_BYTES = 1_048_576;
const MANIFEST_KEYS = Object.freeze([
  "schema",
  "nodeVersion",
  "nodeSourceArchive",
  "nodeSourceSha256",
  "bindingName",
  "bindingSourceSha256",
  "patchSha256",
  "rustAbiVersion",
  "externalAdapterLoaderPresent",
  "childProcessPresent",
  "productionAuthorizing",
]);
const SHA256 = /^[0-9a-f]{64}$/;

function stop(code) {
  throw new TypeError(code);
}

function exactKeys(value, keys) {
  return typeof value === "object"
    && value !== null
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).length === keys.length
    && keys.every((key, index) => Object.keys(value)[index] === key);
}

async function readDirect(path) {
  const before = await lstat(path).catch(() => null);
  if (
    before === null
    || !before.isFile()
    || before.isSymbolicLink()
    || before.nlink !== 1
    || !Number.isSafeInteger(before.size)
    || before.size < 1
    || before.size > MAX_FILE_BYTES
  ) stop("STATIC_HOST_SOURCE_FILE_REFUSED");
  const handle = await open(path, "r").catch(() => null);
  if (handle === null) stop("STATIC_HOST_SOURCE_FILE_REFUSED");
  try {
    const opened = await handle.stat();
    if (
      !opened.isFile()
      || opened.nlink !== 1
      || opened.dev !== before.dev
      || opened.ino !== before.ino
      || opened.size !== before.size
    ) stop("STATIC_HOST_SOURCE_IDENTITY_CHANGED");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.length !== before.size
      || after.dev !== opened.dev
      || after.ino !== opened.ino
      || after.size !== opened.size
      || after.mtimeMs !== opened.mtimeMs
    ) stop("STATIC_HOST_SOURCE_IDENTITY_CHANGED");
    return bytes;
  } finally {
    await handle.close();
  }
}

function decode(bytes) {
  if (
    bytes.length >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf
  ) stop("STATIC_HOST_SOURCE_ENCODING_REFUSED");
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    stop("STATIC_HOST_SOURCE_ENCODING_REFUSED");
  }
  if (value.includes("\0")) stop("STATIC_HOST_SOURCE_ENCODING_REFUSED");
  return value;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function verifyRegistryStaticHostSource(options) {
  if (
    typeof options !== "object"
    || options === null
    || typeof options.hostDirectory !== "string"
    || !isAbsolute(options.hostDirectory)
  ) stop("STATIC_HOST_DIRECTORY_REFUSED");
  const hostDirectory = resolve(options.hostDirectory);
  const canonical = await realpath(hostDirectory).catch(() => null);
  if (canonical === null || resolve(canonical) !== hostDirectory) {
    stop("STATIC_HOST_DIRECTORY_REFUSED");
  }
  const [manifestBytes, bindingBytes, patchBytes] = await Promise.all([
    readDirect(join(hostDirectory, "host-source-manifest.json")),
    readDirect(join(hostDirectory, "galerina_registry_binding.cc")),
    readDirect(join(hostDirectory, "node-v24.18.0-galerina-host.patch")),
  ]);
  const manifestText = decode(manifestBytes);
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    stop("STATIC_HOST_MANIFEST_REFUSED");
  }
  if (
    !exactKeys(manifest, MANIFEST_KEYS)
    || `${JSON.stringify(manifest, null, 2)}\n` !== manifestText
    || manifest.schema !== "galerina.registry.static-host-source-manifest.v1"
    || manifest.nodeVersion !== "24.18.0"
    || manifest.nodeSourceArchive !== "node-v24.18.0.tar.gz"
    || manifest.nodeSourceSha256
      !== "c8348067b41d8739ec69fd4da615cd8995ad6a76eb53e84a7fa7291c8a477eb7"
    || manifest.bindingName !== "galerina_registry_durability"
    || !SHA256.test(manifest.bindingSourceSha256)
    || !SHA256.test(manifest.patchSha256)
    || manifest.rustAbiVersion !== 1
    || manifest.externalAdapterLoaderPresent !== false
    || manifest.childProcessPresent !== false
    || manifest.productionAuthorizing !== false
  ) stop("STATIC_HOST_MANIFEST_REFUSED");
  if (
    digest(bindingBytes) !== manifest.bindingSourceSha256
    || digest(patchBytes) !== manifest.patchSha256
  ) stop("STATIC_HOST_SOURCE_DIGEST_MISMATCH");

  const binding = decode(bindingBytes);
  const patch = decode(patchBytes);
  if (
    /process\.dlopen|LoadLibrary|dlopen\s*\(|\.node(?:['"\s)]|$)|child_process|\bspawn\s*\(|\bsystem\s*\(/i
      .test(binding)
  ) stop("STATIC_HOST_PROHIBITED_LOADER_TEXT");
  if (/v8::Private::ForApi|SetPrivate\s*\(/.test(binding)) {
    stop("STATIC_HOST_FORGEABLE_RECEIPT_BRAND_REFUSED");
  }
  for (const required of [
    "NODE_MODULE_LINKED(galerina_registry_durability, Initialize)",
    "galerina_registry_publish_generation_v1",
    "IsSharedArrayBuffer()",
    "struct BindingState",
    "AddEnvironmentCleanupHook",
    "v8::External::New(isolate, state)",
    "current_receipt.Reset(isolate, result)",
    "current_receipt.Get(isolate)->StrictEquals(args[0])",
    "SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen)",
    "v8::False(isolate)",
  ]) {
    if (!binding.includes(required)) stop("STATIC_HOST_BINDING_CONTRACT_REFUSED");
  }
  for (const required of [
    "src/galerina_registry_binding.cc",
    "galerina_registry_durability_native.lib",
    "ObjectDefineProperty(process, '_galerinaLinkedBinding'",
    "getGalerinaLinkedBinding('galerina_registry_durability')",
    "configurable: false",
    "writable: false",
  ]) {
    if (!patch.includes(required)) stop("STATIC_HOST_PATCH_CONTRACT_REFUSED");
  }
  return Object.freeze({
    schema: "galerina.registry.static-host-source-verification.v1",
    verdict: "CANDIDATE",
    nodeVersion: manifest.nodeVersion,
    nodeSourceSha256: manifest.nodeSourceSha256,
    bindingName: manifest.bindingName,
    rustAbiVersion: manifest.rustAbiVersion,
    externalAdapterLoaderPresent: false,
    childProcessPresent: false,
    productionAuthorizing: false,
  });
}

const invoked = process.argv[1] === fileURLToPath(import.meta.url);
if (invoked) {
  const root = resolve(import.meta.dirname, "..");
  const hostDirectory = join(
    root,
    "packages-galerina",
    "galerina-framework-app-kernel",
    "native",
    "registry-activation-host",
  );
  try {
    console.log(JSON.stringify(
      await verifyRegistryStaticHostSource({ hostDirectory }),
    ));
  } catch (error) {
    console.error(`REFUSED: ${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 1;
  }
}
