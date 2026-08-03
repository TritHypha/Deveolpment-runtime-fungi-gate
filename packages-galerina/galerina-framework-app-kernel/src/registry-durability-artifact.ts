/**
 * Read-only inspection of one native registry-durability artifact candidate.
 *
 * This module never loads or executes the candidate and never mints a
 * production persistence capability. Its strongest result is CANDIDATE.
 */

import {
  isRegistryDurabilityAdapterDescriptor,
  type RegistryDurabilityAdapterDescriptor,
} from "./registry-durability-admission.js";
import { loadDurabilityArtifactHostFloor } from "./host-floor.js";

const MAX_NATIVE_ARTIFACT_BYTES = 16 * 1024 * 1024;

interface NodeHash {
  update(data: Uint8Array): NodeHash;
  digest(encoding: "hex"): string;
}

interface NodeCrypto {
  createHash(algorithm: "sha256"): NodeHash;
}

interface NodeStats {
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
  readonly nlink: number;
  readonly size: number;
  readonly mtimeMs: number;
  readonly ctimeMs: number;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface NodeFs {
  readonly constants: {
    readonly O_RDONLY: number;
    readonly O_NOFOLLOW?: number;
  };
  closeSync(fileDescriptor: number): void;
  fstatSync(fileDescriptor: number): NodeStats;
  lstatSync(
    path: string,
    options?: { readonly throwIfNoEntry: false },
  ): NodeStats | undefined;
  openSync(path: string, flags: number): number;
  readFileSync(fileDescriptor: number): Uint8Array;
}

interface NodePath {
  readonly sep: string;
  dirname(path: string): string;
  isAbsolute(path: string): boolean;
  resolve(...parts: string[]): string;
}

async function loadNode(): Promise<{
  readonly crypto: NodeCrypto;
  readonly fs: NodeFs;
  readonly path: NodePath;
}> {
  const host = await loadDurabilityArtifactHostFloor();
  return host as {
    readonly crypto: NodeCrypto;
    readonly fs: NodeFs;
    readonly path: NodePath;
  };
}

export interface RegistryDurabilityArtifactDecision {
  readonly verdict: "CANDIDATE" | "DENY";
  readonly reason: string;
  readonly adapterId: string | null;
  readonly binaryDigest: string | null;
  readonly byteLength: number | null;
}

function deny(reason: string): RegistryDurabilityArtifactDecision {
  return Object.freeze({
    verdict: "DENY",
    reason,
    adapterId: null,
    binaryDigest: null,
    byteLength: null,
  });
}

function statsIdentityMatches(left: NodeStats, right: NodeStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

function uint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]!
    | (bytes[offset + 1]! << 8);
}

function uint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]!
    | (bytes[offset + 1]! << 8)
    | (bytes[offset + 2]! << 16)
    | (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function peCoffMatches(
  bytes: Uint8Array,
  descriptor: RegistryDurabilityAdapterDescriptor,
): boolean {
  if (
    bytes.length < 70
    || bytes[0] !== 0x4d
    || bytes[1] !== 0x5a
  ) {
    return false;
  }
  const peOffset = uint32LE(bytes, 0x3c);
  if (peOffset < 64 || peOffset + 6 > bytes.length) {
    return false;
  }
  if (
    bytes[peOffset] !== 0x50
    || bytes[peOffset + 1] !== 0x45
    || bytes[peOffset + 2] !== 0
    || bytes[peOffset + 3] !== 0
  ) {
    return false;
  }
  const expectedMachine = descriptor.architecture === "x86_64"
    ? 0x8664
    : 0xaa64;
  return uint16LE(bytes, peOffset + 4) === expectedMachine;
}

function elfMatches(
  bytes: Uint8Array,
  descriptor: RegistryDurabilityAdapterDescriptor,
): boolean {
  if (
    bytes.length < 20
    || bytes[0] !== 0x7f
    || bytes[1] !== 0x45
    || bytes[2] !== 0x4c
    || bytes[3] !== 0x46
    || bytes[4] !== 2
    || bytes[5] !== 1
    || bytes[6] !== 1
  ) {
    return false;
  }
  const expectedMachine = descriptor.architecture === "x86_64"
    ? 0x003e
    : 0x00b7;
  return uint16LE(bytes, 18) === expectedMachine;
}

function machOMatches(
  bytes: Uint8Array,
  descriptor: RegistryDurabilityAdapterDescriptor,
): boolean {
  if (bytes.length < 8 || uint32LE(bytes, 0) !== 0xfeedfacf) {
    return false;
  }
  const expectedCpuType = descriptor.architecture === "x86_64"
    ? 0x01000007
    : 0x0100000c;
  return uint32LE(bytes, 4) === expectedCpuType;
}

function binaryContainerMatches(
  bytes: Uint8Array,
  descriptor: RegistryDurabilityAdapterDescriptor,
): boolean {
  switch (descriptor.binaryFormat) {
    case "pe-coff-node-api-v10":
      return peCoffMatches(bytes, descriptor);
    case "elf-node-api-v10":
      return elfMatches(bytes, descriptor);
    case "mach-o-node-api-v10":
      return machOMatches(bytes, descriptor);
    default:
      return false;
  }
}

function hasSymbolicOrUnavailableAncestor(
  fs: NodeFs,
  path: NodePath,
  start: string,
): boolean {
  let current = start;
  while (true) {
    const stats = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stats === undefined || stats.isSymbolicLink()) {
      return true;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return false;
    }
    current = parent;
  }
}

function directArtifactPath(
  fs: NodeFs,
  path: NodePath,
  packageRoot: string,
  descriptor: RegistryDurabilityAdapterDescriptor,
): string | null {
  if (
    packageRoot.length === 0
    || packageRoot.length > 32_768
    || packageRoot.includes("\0")
    || !path.isAbsolute(packageRoot)
    || path.resolve(packageRoot) !== packageRoot
  ) {
    return null;
  }
  if (hasSymbolicOrUnavailableAncestor(fs, path, packageRoot)) {
    return null;
  }
  const rootStats = fs.lstatSync(packageRoot, { throwIfNoEntry: false });
  if (
    rootStats === undefined
    || !rootStats.isDirectory()
    || rootStats.isSymbolicLink()
  ) {
    return null;
  }
  const parts = descriptor.loaderRelativePath.split("/");
  let current = packageRoot;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.resolve(current, parts[index]!);
    if (!current.startsWith(`${packageRoot}${path.sep}`)) {
      return null;
    }
    const stats = fs.lstatSync(current, { throwIfNoEntry: false });
    if (stats === undefined || stats.isSymbolicLink()) {
      return null;
    }
    if (index === parts.length - 1) {
      if (!stats.isFile() || stats.nlink !== 1) {
        return null;
      }
    } else if (!stats.isDirectory()) {
      return null;
    }
  }
  return current;
}

export async function inspectRegistryDurabilityArtifactCandidate(
  descriptorValue: unknown,
  packageRootValue: unknown,
): Promise<RegistryDurabilityArtifactDecision> {
  if (!isRegistryDurabilityAdapterDescriptor(descriptorValue)) {
    return deny("ADAPTER_DESCRIPTOR_MALFORMED");
  }
  if (typeof packageRootValue !== "string") {
    return deny("ARTIFACT_ROOT_REFUSED");
  }

  let node: Awaited<ReturnType<typeof loadNode>>;
  try {
    node = await loadNode();
  } catch {
    return deny("ARTIFACT_HOST_API_UNAVAILABLE");
  }

  let artifactPath: string | null;
  try {
    artifactPath = directArtifactPath(
      node.fs,
      node.path,
      packageRootValue,
      descriptorValue,
    );
  } catch {
    return deny("ARTIFACT_PATH_REFUSED");
  }
  if (artifactPath === null) {
    return deny("ARTIFACT_PATH_REFUSED");
  }

  let before: NodeStats | null = null;
  let after: NodeStats | null = null;
  let bytes: Uint8Array | null = null;
  let fileDescriptor: number | null = null;
  let metadataRefused = false;
  let readRefused = false;
  let closeRefused = false;
  try {
    const descriptorStats = node.fs.lstatSync(artifactPath, {
      throwIfNoEntry: false,
    });
    if (descriptorStats === undefined) {
      readRefused = true;
    } else {
      const noFollow = node.fs.constants.O_NOFOLLOW ?? 0;
      fileDescriptor = node.fs.openSync(
        artifactPath,
        node.fs.constants.O_RDONLY | noFollow,
      );
      before = node.fs.fstatSync(fileDescriptor);
      metadataRefused = !before.isFile()
        || before.nlink !== 1
        || before.size <= 0
        || before.size > MAX_NATIVE_ARTIFACT_BYTES
        || !statsIdentityMatches(descriptorStats, before);
      if (!metadataRefused) {
        bytes = new Uint8Array(node.fs.readFileSync(fileDescriptor));
        after = node.fs.fstatSync(fileDescriptor);
      }
    }
  } catch {
    readRefused = true;
  } finally {
    if (fileDescriptor !== null) {
      try {
        node.fs.closeSync(fileDescriptor);
      } catch {
        closeRefused = true;
      }
    }
  }

  if (closeRefused) {
    return deny("ARTIFACT_CLOSE_REFUSED");
  }
  if (metadataRefused) {
    return deny("ARTIFACT_METADATA_REFUSED");
  }
  if (
    readRefused
    || before === null
    || after === null
    || bytes === null
  ) {
    return deny("ARTIFACT_READ_REFUSED");
  }
  if (
    bytes.length !== before.size
    || !statsIdentityMatches(before, after)
  ) {
    return deny("ARTIFACT_IDENTITY_CHANGED");
  }
  if (!binaryContainerMatches(bytes, descriptorValue)) {
    return deny("ARTIFACT_BINARY_FORMAT_MISMATCH");
  }
  const binaryDigest =
    `sha256:${node.crypto.createHash("sha256").update(bytes).digest("hex")}`;
  if (binaryDigest !== descriptorValue.binaryDigest) {
    return deny("ARTIFACT_DIGEST_MISMATCH");
  }
  return Object.freeze({
    verdict: "CANDIDATE",
    reason: "ARTIFACT_VERIFIED_NON_EXECUTED_CANDIDATE",
    adapterId: descriptorValue.adapterId,
    binaryDigest,
    byteLength: bytes.length,
  });
}
