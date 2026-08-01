import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const OBSERVATION_KEYS = Object.freeze([
  "platform",
  "visualStudioVersion",
  "visualStudioPath",
  "clangVersion",
  "clangPath",
  "clangToolsetPresent",
  "nasmVersion",
  "nasmPath",
]);
const VERSION = /^[0-9]+(?:\.[0-9]+){1,3}$/;
const CLANG_VERSION = /^clang version [0-9]+(?:\.[0-9]+){1,3}(?:\s|$)/;
const NASM_VERSION = /^NASM version [0-9]+(?:\.[0-9]+){1,3}(?:\s|$)/;

function exactDataSnapshot(value, keys) {
  try {
    if (
      typeof value !== "object"
      || value === null
      || Object.getPrototypeOf(value) !== Object.prototype
    ) {
      return null;
    }
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== keys.length
      || !keys.every((key, index) => ownKeys[index] === key)
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const snapshot = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || descriptor.enumerable !== true
        || !("value" in descriptor)
        || "get" in descriptor
        || "set" in descriptor
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function refused(reason) {
  return Object.freeze({
    schema: "galerina.registry.static-host-toolchain.v1",
    verdict: "REFUSED",
    reason,
    productionAuthorizing: false,
  });
}

function directAbsolute(path, expectedKind) {
  if (typeof path !== "string" || !isAbsolute(path) || !existsSync(path)) {
    return false;
  }
  try {
    const stats = statSync(path, { throwIfNoEntry: true });
    const direct = expectedKind === "file" ? stats.isFile() : stats.isDirectory();
    return direct && resolve(realpathSync(path)) === resolve(path);
  } catch {
    return false;
  }
}

export function assessRegistryStaticHostToolchain(observation) {
  const evidence = exactDataSnapshot(observation, OBSERVATION_KEYS);
  if (evidence === null) {
    return refused("STATIC_HOST_TOOLCHAIN_EVIDENCE_MALFORMED");
  }
  if (evidence.platform !== "win32") {
    return refused("STATIC_HOST_TOOLCHAIN_PLATFORM_REFUSED");
  }
  if (
    typeof evidence.visualStudioVersion !== "string"
    || !VERSION.test(evidence.visualStudioVersion)
    || typeof evidence.visualStudioPath !== "string"
    || !isAbsolute(evidence.visualStudioPath)
  ) {
    return refused("STATIC_HOST_VISUAL_STUDIO_EVIDENCE_REFUSED");
  }
  if (
    evidence.clangToolsetPresent !== true
    || typeof evidence.clangVersion !== "string"
    || !CLANG_VERSION.test(evidence.clangVersion)
    || typeof evidence.clangPath !== "string"
    || !isAbsolute(evidence.clangPath)
  ) {
    return refused("STATIC_HOST_CLANG_TOOLSET_REFUSED");
  }
  if (
    typeof evidence.nasmVersion !== "string"
    || !NASM_VERSION.test(evidence.nasmVersion)
    || typeof evidence.nasmPath !== "string"
    || !isAbsolute(evidence.nasmPath)
  ) {
    return refused("STATIC_HOST_NASM_REFUSED");
  }
  return Object.freeze({
    schema: "galerina.registry.static-host-toolchain.v1",
    verdict: "CANDIDATE",
    platform: evidence.platform,
    visualStudioVersion: evidence.visualStudioVersion,
    clangVersion: evidence.clangVersion,
    nasmVersion: evidence.nasmVersion,
    productionAuthorizing: false,
  });
}

function run(file, args) {
  const result = spawnSync(file, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1_048_576,
  });
  if (result.error || result.status !== 0 || result.signal !== null) return null;
  return result.stdout.trim();
}

function findVisualStudio(vswhere) {
  for (const range of ["[18.0,19.0)", "[17.0,18.0)"]) {
    const output = run(vswhere, [
      "-latest",
      "-products", "*",
      "-version", range,
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Llvm.Clang",
      "Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset",
      "-format", "json",
      "-utf8",
    ]);
    if (output === null) continue;
    let instances;
    try {
      instances = JSON.parse(output);
    } catch {
      continue;
    }
    if (Array.isArray(instances) && instances.length === 1) return instances[0];
  }
  return null;
}

export function probeRegistryStaticHostToolchain() {
  if (process.platform !== "win32") {
    return refused("STATIC_HOST_TOOLCHAIN_PLATFORM_REFUSED");
  }
  const vswhere = "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe";
  if (!directAbsolute(vswhere, "file")) {
    return refused("STATIC_HOST_VSWHERE_UNAVAILABLE");
  }
  const instance = findVisualStudio(vswhere);
  if (
    typeof instance !== "object"
    || instance === null
    || typeof instance.installationPath !== "string"
    || typeof instance.installationVersion !== "string"
    || !directAbsolute(instance.installationPath, "directory")
  ) {
    return refused("STATIC_HOST_CLANG_COMPONENTS_ABSENT");
  }
  const clangPath = resolve(
    instance.installationPath,
    "VC", "Tools", "Llvm", "x64", "bin", "clang.exe",
  );
  if (!directAbsolute(clangPath, "file")) {
    return refused("STATIC_HOST_CLANG_BINARY_ABSENT");
  }
  const clangOutput = run(clangPath, ["--version"]);
  const clangVersion = clangOutput?.split(/\r?\n/, 1)[0] ?? "";
  if (!CLANG_VERSION.test(clangVersion)) {
    return refused("STATIC_HOST_CLANG_VERSION_REFUSED");
  }
  const whereOutput = run("where.exe", ["nasm.exe"]);
  const nasmPath = whereOutput?.split(/\r?\n/, 1)[0] ?? "";
  if (!directAbsolute(nasmPath, "file")) {
    return refused("STATIC_HOST_NASM_ABSENT");
  }
  const nasmOutput = run(nasmPath, ["-v"]);
  const nasmVersion = nasmOutput?.split(/\r?\n/, 1)[0] ?? "";
  if (!NASM_VERSION.test(nasmVersion)) {
    return refused("STATIC_HOST_NASM_VERSION_REFUSED");
  }
  return assessRegistryStaticHostToolchain({
    platform: process.platform,
    visualStudioVersion: instance.installationVersion,
    visualStudioPath: realpathSync(instance.installationPath),
    clangVersion,
    clangPath: realpathSync(clangPath),
    clangToolsetPresent: true,
    nasmVersion,
    nasmPath: realpathSync(nasmPath),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = probeRegistryStaticHostToolchain();
  console.log(JSON.stringify(result));
  if (result.verdict !== "CANDIDATE") process.exitCode = 1;
}
