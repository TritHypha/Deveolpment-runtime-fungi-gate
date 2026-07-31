/**
 * Source-bound admission facts for native registry-durability candidates.
 *
 * A CANDIDATE verdict is deliberately not a production capability. The
 * production allow-set stays empty until a separately reviewed adapter and
 * real platform crash evidence are committed.
 */

export type RegistryDurabilityPlatform = "windows" | "linux" | "macos";
export type RegistryDurabilityArchitecture = "x86_64" | "aarch64";

export interface RegistryDurabilityAdapterEvidence {
  readonly sourceReviewDigest: string;
  readonly hostileLoaderTestsDigest: string;
  readonly deterministicFaultMatrixDigest: string;
  readonly platformCrashEvidenceDigest: string;
  readonly independentReviewDigest: string;
}

export interface RegistryDurabilityAdapterDescriptor {
  readonly schema: "galerina-registry-durability-adapter/v1";
  readonly adapterId: string;
  readonly abiVersion: "galerina.registry.durability.abi.v1";
  readonly platform: RegistryDurabilityPlatform;
  readonly architecture: RegistryDurabilityArchitecture;
  readonly targetTriple: string;
  readonly filesystems: readonly string[];
  readonly loaderRelativePath: string;
  readonly binaryFormat: string;
  readonly sourceDigest: string;
  readonly contractDigest: string;
  readonly binaryDigest: string;
  readonly toolchainDigest: string;
  readonly buildRecipeDigest: string;
  readonly evidence: RegistryDurabilityAdapterEvidence;
}

export interface RegistryDurabilityHostFacts {
  readonly schema: "galerina-registry-durability-host/v1";
  readonly platform: RegistryDurabilityPlatform;
  readonly architecture: RegistryDurabilityArchitecture;
  readonly filesystem: string;
  readonly volumeKind: "fixed-local" | "network" | "removable" | "unknown";
  readonly network: boolean;
  readonly removable: boolean;
  readonly overlay: boolean;
  readonly virtual: boolean;
}

export interface RegistryDurabilityCandidateDecision {
  readonly verdict: "CANDIDATE" | "DENY";
  readonly reason: string;
  readonly adapterId: string | null;
  readonly binaryDigest: string | null;
}

export const PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS:
  readonly string[] = Object.freeze([]);

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const ADAPTER_ID =
  /^galerina\.registry\.durability\.(windows|linux|macos)\.v[1-9][0-9]*$/;
const FILESYSTEM = /^[a-z0-9][a-z0-9.-]{1,31}$/;
const DESCRIPTOR_KEYS = Object.freeze([
  "abiVersion",
  "adapterId",
  "architecture",
  "binaryDigest",
  "binaryFormat",
  "buildRecipeDigest",
  "contractDigest",
  "evidence",
  "filesystems",
  "loaderRelativePath",
  "platform",
  "schema",
  "sourceDigest",
  "targetTriple",
  "toolchainDigest",
]);
const EVIDENCE_KEYS = Object.freeze([
  "deterministicFaultMatrixDigest",
  "hostileLoaderTestsDigest",
  "independentReviewDigest",
  "platformCrashEvidenceDigest",
  "sourceReviewDigest",
]);
const HOST_KEYS = Object.freeze([
  "architecture",
  "filesystem",
  "network",
  "overlay",
  "platform",
  "removable",
  "schema",
  "virtual",
  "volumeKind",
]);

const PLATFORM_SPECS = Object.freeze({
  windows: Object.freeze({
    targetTriples: Object.freeze({
      x86_64: "x86_64-pc-windows-msvc",
      aarch64: "aarch64-pc-windows-msvc",
    }),
    loaderDirectories: Object.freeze({
      x86_64: "win32-x64",
      aarch64: "win32-arm64",
    }),
    binaryFormat: "pe-coff-node-api-v10",
    filesystems: Object.freeze(["ntfs", "refs"]),
  }),
  linux: Object.freeze({
    targetTriples: Object.freeze({
      x86_64: "x86_64-unknown-linux-gnu",
      aarch64: "aarch64-unknown-linux-gnu",
    }),
    loaderDirectories: Object.freeze({
      x86_64: "linux-x64",
      aarch64: "linux-arm64",
    }),
    binaryFormat: "elf-node-api-v10",
    filesystems: Object.freeze(["btrfs", "ext4", "xfs"]),
  }),
  macos: Object.freeze({
    targetTriples: Object.freeze({
      x86_64: "x86_64-apple-darwin",
      aarch64: "aarch64-apple-darwin",
    }),
    loaderDirectories: Object.freeze({
      x86_64: "darwin-x64",
      aarch64: "darwin-arm64",
    }),
    binaryFormat: "mach-o-node-api-v10",
    filesystems: Object.freeze(["apfs"]),
  }),
});

function hasPlainDataShape(
  value: object,
  expectedKeys: readonly string[],
): boolean {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).sort().join(",") !== expectedKeys.join(",")) {
    return false;
  }
  return Object.values(descriptors).every(
    (descriptor) =>
      "value" in descriptor
      && descriptor.get === undefined
      && descriptor.set === undefined,
  );
}

function isPlatform(value: unknown): value is RegistryDurabilityPlatform {
  return value === "windows" || value === "linux" || value === "macos";
}

function isArchitecture(
  value: unknown,
): value is RegistryDurabilityArchitecture {
  return value === "x86_64" || value === "aarch64";
}

function stringArrayIsCanonical(
  value: unknown,
  allowed: readonly string[],
): value is readonly string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  let prior = "";
  for (const item of value) {
    if (
      typeof item !== "string"
      || !FILESYSTEM.test(item)
      || !allowed.includes(item)
      || item <= prior
    ) {
      return false;
    }
    prior = item;
  }
  return true;
}

function descriptorIsValid(
  value: unknown,
): value is RegistryDurabilityAdapterDescriptor {
  if (
    typeof value !== "object"
    || value === null
    || !hasPlainDataShape(value, DESCRIPTOR_KEYS)
  ) {
    return false;
  }
  const descriptor = value as RegistryDurabilityAdapterDescriptor;
  if (
    descriptor.schema !== "galerina-registry-durability-adapter/v1"
    || !ADAPTER_ID.test(descriptor.adapterId)
    || descriptor.abiVersion !== "galerina.registry.durability.abi.v1"
    || !isPlatform(descriptor.platform)
    || !isArchitecture(descriptor.architecture)
    || !DIGEST.test(descriptor.sourceDigest)
    || !DIGEST.test(descriptor.contractDigest)
    || !DIGEST.test(descriptor.binaryDigest)
    || !DIGEST.test(descriptor.toolchainDigest)
    || !DIGEST.test(descriptor.buildRecipeDigest)
  ) {
    return false;
  }
  const spec = PLATFORM_SPECS[descriptor.platform];
  const targetTriple = spec.targetTriples[descriptor.architecture];
  const loaderDirectory = spec.loaderDirectories[descriptor.architecture];
  if (
    descriptor.targetTriple !== targetTriple
    || descriptor.binaryFormat !== spec.binaryFormat
    || descriptor.loaderRelativePath
      !== `native/${loaderDirectory}/registry-durability.node`
    || !stringArrayIsCanonical(descriptor.filesystems, spec.filesystems)
    || !descriptor.adapterId.includes(`.${descriptor.platform}.`)
  ) {
    return false;
  }
  if (
    typeof descriptor.evidence !== "object"
    || descriptor.evidence === null
    || !hasPlainDataShape(descriptor.evidence, EVIDENCE_KEYS)
  ) {
    return false;
  }
  return Object.values(descriptor.evidence).every(
    (digest) => typeof digest === "string" && DIGEST.test(digest),
  );
}

function hostIsValid(
  value: unknown,
): value is RegistryDurabilityHostFacts {
  if (
    typeof value !== "object"
    || value === null
    || !hasPlainDataShape(value, HOST_KEYS)
  ) {
    return false;
  }
  const host = value as RegistryDurabilityHostFacts;
  return host.schema === "galerina-registry-durability-host/v1"
    && isPlatform(host.platform)
    && isArchitecture(host.architecture)
    && typeof host.filesystem === "string"
    && FILESYSTEM.test(host.filesystem)
    && (
      host.volumeKind === "fixed-local"
      || host.volumeKind === "network"
      || host.volumeKind === "removable"
      || host.volumeKind === "unknown"
    )
    && typeof host.network === "boolean"
    && typeof host.removable === "boolean"
    && typeof host.overlay === "boolean"
    && typeof host.virtual === "boolean";
}

function deny(reason: string): RegistryDurabilityCandidateDecision {
  return Object.freeze({
    verdict: "DENY",
    reason,
    adapterId: null,
    binaryDigest: null,
  });
}

export function assessRegistryDurabilityAdapterCandidate(
  descriptorValue: unknown,
  hostValue: unknown,
): RegistryDurabilityCandidateDecision {
  if (!descriptorIsValid(descriptorValue)) {
    return deny("ADAPTER_DESCRIPTOR_MALFORMED");
  }
  if (!hostIsValid(hostValue)) {
    return deny("HOST_FACTS_MALFORMED");
  }
  const descriptor = descriptorValue;
  const host = hostValue;
  if (
    host.volumeKind !== "fixed-local"
    || host.network
    || host.removable
    || host.overlay
    || host.virtual
  ) {
    return deny("HOST_STORAGE_NOT_ADMITTED");
  }
  if (
    descriptor.platform !== host.platform
    || descriptor.architecture !== host.architecture
    || !descriptor.filesystems.includes(host.filesystem)
  ) {
    return deny("HOST_ADAPTER_IDENTITY_MISMATCH");
  }
  return Object.freeze({
    verdict: "CANDIDATE",
    reason: "EVIDENCE_COMPLETE_NOT_PRODUCTION_ADMITTED",
    adapterId: descriptor.adapterId,
    binaryDigest: descriptor.binaryDigest,
  });
}
