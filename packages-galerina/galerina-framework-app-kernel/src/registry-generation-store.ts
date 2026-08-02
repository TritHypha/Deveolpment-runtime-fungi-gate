import {
  registryGenerationCanonicalJson,
  registryGenerationFileName,
  registryGenerationId,
  verifyRegistryGeneration,
  type RegistryGeneration,
  type VerifyRegistryGenerationOptions,
} from "./registry-generation.js";
import {
  PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS,
} from "./registry-durability-admission.js";

interface NodeStats {
  readonly dev: number;
  readonly ino: number;
  readonly mtimeMs: number;
  readonly size: number;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface NodeFileHandle {
  close(): Promise<void>;
  readFile(): Promise<Uint8Array>;
  stat(): Promise<NodeStats>;
  sync(): Promise<void>;
  writeFile(bytes: Uint8Array): Promise<void>;
}

interface NodeFsPromises {
  chmod(path: string, mode: number): Promise<void>;
  link(existingPath: string, newPath: string): Promise<void>;
  lstat(path: string): Promise<NodeStats>;
  open(path: string, flags: string, mode?: number): Promise<NodeFileHandle>;
  realpath(path: string): Promise<string>;
  unlink(path: string): Promise<void>;
}

interface NodePath {
  isAbsolute(path: string): boolean;
  join(...parts: string[]): string;
  resolve(path: string): string;
}

export interface VerifiedRegistryGeneration {
  readonly generationId: string;
  readonly delegationSerial: number;
  readonly operationalKeyId: string;
  readonly indexIssuedAt: string;
  readonly path: string;
  readonly generation: RegistryGeneration;
}

export interface PersistedRegistryGeneration
  extends VerifiedRegistryGeneration {
  readonly durabilityAdapterDigest: string;
}

export interface RegistryGenerationForwardProbe {
  readonly schema: "galerina.registry.generation-forward-probe.v1";
  readonly generationId: string;
  readonly delegationSerial: number;
  readonly operationalKeyId: string;
  readonly indexIssuedAt: string;
  readonly path: string;
  readonly authorityReleased: false;
  readonly productionAuthorizing: false;
}

export interface RegistryGenerationDurabilityAdapter {
  readonly adapterId: string;
  readonly sourceDigest: string;
  flushDirectory(directory: string): Promise<boolean>;
}

export interface RegistryGenerationHostEvidenceAdapterOptions {
  readonly adapterId: string;
  readonly sourceDigest: string;
  readonly flushDirectory: (directory: string) => Promise<boolean>;
}

export interface RegistryGenerationStoreOptions {
  readonly directory: string;
  readonly generation: RegistryGeneration;
  readonly verify: VerifyRegistryGenerationOptions;
  readonly durabilityAdapter: RegistryGenerationDurabilityAdapter;
  readonly maxBytes?: number;
}

export interface RegistryGenerationLoadOptions {
  readonly directory: string;
  readonly generationId: string;
  readonly verify: VerifyRegistryGenerationOptions;
  readonly maxBytes?: number;
}

const MAX_GENERATION_BYTES = 32 * 1_048_576;
const ADAPTER_DIGEST = /^sha256:[0-9a-f]{64}$/;
const ADAPTER_ID = /^galerina\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.v[1-9][0-9]*$/;
const PRODUCTION_ADMITTED_DURABILITY_ADAPTERS = new Set<string>(
  PRODUCTION_ADMITTED_REGISTRY_DURABILITY_DIGESTS,
);
const issuedDurabilityAdapters = new WeakSet<object>();
const productionDurabilityAdapters = new WeakSet<object>();
const verifiedReceipts = new WeakSet<object>();
const durableReceipts = new WeakSet<object>();
const productionReceipts = new WeakSet<object>();
const forwardProbeReceipts = new WeakSet<object>();
const dynImport = (specifier: string): Promise<unknown> =>
  (Function("s", "return import(s)") as
    (value: string) => Promise<unknown>)(specifier);

async function loadNode(): Promise<{
  readonly fs: NodeFsPromises;
  readonly path: NodePath;
}> {
  const [fs, path] = await Promise.all([
    dynImport("node:fs/promises") as Promise<NodeFsPromises>,
    dynImport("node:path") as Promise<NodePath>,
  ]);
  return { fs, path };
}

function errorCode(error: unknown): string | undefined {
  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

function samePath(left: string, right: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(left)
    ? left.toLocaleLowerCase("en-US") === right.toLocaleLowerCase("en-US")
    : left === right;
}

function sameFile(
  before: NodeStats,
  handle: NodeStats,
  after: NodeStats,
): boolean {
  return before.isFile()
    && handle.isFile()
    && after.isFile()
    && !before.isSymbolicLink()
    && !after.isSymbolicLink()
    && before.size === handle.size
    && handle.size === after.size
    && before.mtimeMs === handle.mtimeMs
    && handle.mtimeMs === after.mtimeMs
    && (
      before.ino === 0
      || handle.ino === 0
      || after.ino === 0
      || (
        before.dev === handle.dev
        && handle.dev === after.dev
        && before.ino === handle.ino
        && handle.ino === after.ino
      )
    );
}

function sizeBound(value: number | undefined): number {
  const bound = value ?? MAX_GENERATION_BYTES;
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > MAX_GENERATION_BYTES) {
    throw new TypeError("registry generation byte bound is malformed");
  }
  return bound;
}

function decodeCanonicalUtf8(bytes: Uint8Array): string {
  if (
    bytes.length === 0
    || (
      bytes.length >= 3
      && bytes[0] === 0xef
      && bytes[1] === 0xbb
      && bytes[2] === 0xbf
    )
  ) {
    throw new TypeError("registry generation is empty or has a byte-order mark");
  }
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TypeError("registry generation is not canonical UTF-8");
  }
  if (value.includes("\0")) {
    throw new TypeError("registry generation contains a forbidden NUL");
  }
  return value;
}

function deepFreeze(value: unknown): void {
  if (
    typeof value !== "object"
    || value === null
    || Object.isFrozen(value)
  ) {
    return;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  Object.freeze(value);
}

async function canonicalDirectory(
  fs: NodeFsPromises,
  path: NodePath,
  directory: string,
): Promise<string> {
  if (
    typeof directory !== "string"
    || directory.length === 0
    || directory.includes("\0")
    || !path.isAbsolute(directory)
  ) {
    throw new TypeError("registry generation directory must be absolute");
  }
  const resolved = path.resolve(directory);
  let stats: NodeStats;
  let real: string;
  try {
    [stats, real] = await Promise.all([
      fs.lstat(resolved),
      fs.realpath(resolved),
    ]);
  } catch {
    throw new TypeError("registry generation directory is unavailable");
  }
  if (
    !stats.isDirectory()
    || stats.isSymbolicLink()
    || !samePath(resolved, path.resolve(real))
  ) {
    throw new TypeError(
      "registry generation directory is not a direct regular directory",
    );
  }
  return resolved;
}

async function readBoundedRegularFile(
  fs: NodeFsPromises,
  filePath: string,
  maxBytes: number,
): Promise<Uint8Array> {
  let before: NodeStats;
  try {
    before = await fs.lstat(filePath);
  } catch {
    throw new TypeError("registry generation file is unavailable");
  }
  if (
    !before.isFile()
    || before.isSymbolicLink()
    || !Number.isSafeInteger(before.size)
    || before.size < 1
    || before.size > maxBytes
  ) {
    throw new TypeError("registry generation is not a bounded regular file");
  }
  let handle: NodeFileHandle;
  try {
    handle = await fs.open(filePath, "r");
  } catch {
    throw new TypeError("registry generation file could not be opened");
  }
  try {
    const opened = await handle.stat();
    const bytes = await handle.readFile();
    const afterRead = await handle.stat();
    const afterPath = await fs.lstat(filePath);
    if (
      bytes.length !== before.size
      || bytes.length > maxBytes
      || !sameFile(before, opened, afterRead)
      || !sameFile(before, afterRead, afterPath)
    ) {
      throw new TypeError("registry generation changed while being read");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

function makeReceipt(
  generationId: string,
  path: string,
  generation: RegistryGeneration,
): VerifiedRegistryGeneration {
  deepFreeze(generation);
  const receipt = Object.freeze({
    generationId,
    delegationSerial: generation.delegationSerial,
    operationalKeyId: generation.operationalKeyId,
    indexIssuedAt: generation.index.issuedAt,
    path,
    generation,
  });
  verifiedReceipts.add(receipt);
  return receipt;
}

function makeDurableReceipt(
  verified: VerifiedRegistryGeneration,
  durabilityAdapter: RegistryGenerationDurabilityAdapter,
): PersistedRegistryGeneration {
  const receipt = Object.freeze({
    ...verified,
    durabilityAdapterDigest: durabilityAdapter.sourceDigest,
  });
  verifiedReceipts.add(receipt);
  durableReceipts.add(receipt);
  if (productionDurabilityAdapters.has(durabilityAdapter)) {
    productionReceipts.add(receipt);
  }
  return receipt;
}

export function createRegistryGenerationHostEvidenceAdapter(
  options: RegistryGenerationHostEvidenceAdapterOptions,
): RegistryGenerationDurabilityAdapter {
  if (
    typeof options !== "object"
    || options === null
    || !ADAPTER_ID.test(options.adapterId)
    || !ADAPTER_DIGEST.test(options.sourceDigest)
    || typeof options.flushDirectory !== "function"
  ) {
    throw new TypeError(
      "registry generation host-evidence adapter is malformed",
    );
  }
  const flushDirectory = options.flushDirectory;
  const adapter = Object.freeze({
    adapterId: options.adapterId,
    sourceDigest: options.sourceDigest,
    async flushDirectory(directory: string): Promise<boolean> {
      return await flushDirectory(directory);
    },
  });
  issuedDurabilityAdapters.add(adapter);
  return adapter;
}

async function proveDirectoryDurability(
  adapter: RegistryGenerationDurabilityAdapter,
  directory: string,
): Promise<boolean> {
  if (
    typeof adapter !== "object"
    || adapter === null
    || !issuedDurabilityAdapters.has(adapter)
    || !ADAPTER_ID.test(adapter.adapterId)
    || !ADAPTER_DIGEST.test(adapter.sourceDigest)
  ) {
    throw new TypeError(
      "registry generation durability adapter is not an issued capability",
    );
  }
  try {
    return await adapter.flushDirectory(directory) === true;
  } catch {
    return false;
  }
}

export function isVerifiedRegistryGeneration(
  value: unknown,
): value is VerifiedRegistryGeneration {
  return typeof value === "object"
    && value !== null
    && verifiedReceipts.has(value);
}

export function isPersistedRegistryGeneration(
  value: unknown,
): value is PersistedRegistryGeneration {
  return typeof value === "object"
    && value !== null
    && verifiedReceipts.has(value)
    && durableReceipts.has(value);
}

export function isProductionAdmittedRegistryGeneration(
  value: unknown,
): value is PersistedRegistryGeneration {
  return isPersistedRegistryGeneration(value)
    && productionReceipts.has(value)
    && PRODUCTION_ADMITTED_DURABILITY_ADAPTERS.has(
      value.durabilityAdapterDigest,
    );
}

export function isRegistryGenerationForwardProbe(
  value: unknown,
  generation: VerifiedRegistryGeneration,
): value is RegistryGenerationForwardProbe {
  return typeof value === "object"
    && value !== null
    && forwardProbeReceipts.has(value)
    && isVerifiedRegistryGeneration(generation)
    && (value as RegistryGenerationForwardProbe).generationId
      === generation.generationId
    && (value as RegistryGenerationForwardProbe).delegationSerial
      === generation.delegationSerial
    && (value as RegistryGenerationForwardProbe).operationalKeyId
      === generation.operationalKeyId
    && (value as RegistryGenerationForwardProbe).indexIssuedAt
      === generation.indexIssuedAt
    && (value as RegistryGenerationForwardProbe).path === generation.path;
}

export function consumeRegistryGenerationForwardProbe(
  value: unknown,
  generation: VerifiedRegistryGeneration,
): value is RegistryGenerationForwardProbe {
  if (!isRegistryGenerationForwardProbe(value, generation)) return false;
  forwardProbeReceipts.delete(value);
  return true;
}

export async function loadRegistryGeneration(
  options: RegistryGenerationLoadOptions,
): Promise<VerifiedRegistryGeneration> {
  const maxBytes = sizeBound(options.maxBytes);
  const { fs, path } = await loadNode();
  const directory = await canonicalDirectory(fs, path, options.directory);
  const filePath = path.join(
    directory,
    registryGenerationFileName(options.generationId),
  );
  const bytes = await readBoundedRegularFile(fs, filePath, maxBytes);
  const canonical = decodeCanonicalUtf8(bytes);
  let generation: RegistryGeneration;
  try {
    generation = JSON.parse(canonical) as RegistryGeneration;
  } catch {
    throw new TypeError("registry generation is not valid JSON");
  }
  if (registryGenerationCanonicalJson(generation) !== canonical) {
    throw new TypeError("registry generation bytes are not canonical");
  }
  const derivedId = await registryGenerationId(generation);
  if (derivedId !== options.generationId) {
    throw new TypeError("registry generation identity does not match its bytes");
  }
  verifyRegistryGeneration(generation, options.verify);
  return makeReceipt(derivedId, filePath, generation);
}

export async function verifyRegistryGenerationForwardProbe(
  options: RegistryGenerationLoadOptions,
): Promise<RegistryGenerationForwardProbe> {
  const verified = await loadRegistryGeneration(options);
  const receipt = Object.freeze({
    schema: "galerina.registry.generation-forward-probe.v1" as const,
    generationId: verified.generationId,
    delegationSerial: verified.delegationSerial,
    operationalKeyId: verified.operationalKeyId,
    indexIssuedAt: verified.indexIssuedAt,
    path: verified.path,
    authorityReleased: false as const,
    productionAuthorizing: false as const,
  });
  forwardProbeReceipts.add(receipt);
  return receipt;
}

function randomSuffix(): string {
  const bytes = new Uint8Array(16);
  try {
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    throw new TypeError("registry generation staging identity is unavailable");
  }
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function persistRegistryGeneration(
  options: RegistryGenerationStoreOptions,
): Promise<PersistedRegistryGeneration> {
  const maxBytes = sizeBound(options.maxBytes);
  if (
    typeof options.durabilityAdapter !== "object"
    || options.durabilityAdapter === null
    || !issuedDurabilityAdapters.has(options.durabilityAdapter)
  ) {
    throw new TypeError(
      "registry generation durability adapter is not an issued capability",
    );
  }
  verifyRegistryGeneration(options.generation, options.verify);
  const canonical = registryGenerationCanonicalJson(options.generation);
  const bytes = new TextEncoder().encode(canonical);
  if (bytes.length < 1 || bytes.length > maxBytes) {
    throw new TypeError("registry generation exceeds its fixed byte bound");
  }
  const generationId = await registryGenerationId(options.generation);
  const { fs, path } = await loadNode();
  const directory = await canonicalDirectory(fs, path, options.directory);
  const finalPath = path.join(
    directory,
    registryGenerationFileName(generationId),
  );
  try {
    const existing = await loadRegistryGeneration({
      directory,
      generationId,
      verify: options.verify,
      maxBytes,
    });
    const durable = await proveDirectoryDurability(
      options.durabilityAdapter,
      directory,
    );
    if (!durable) {
      throw new TypeError(
        "registry generation directory durability was not proven",
      );
    }
    return makeDurableReceipt(
      existing,
      options.durabilityAdapter,
    );
  } catch (error) {
    if (errorCode(error) !== "ENOENT") {
      try {
        await fs.lstat(finalPath);
      } catch (statError) {
        if (errorCode(statError) !== "ENOENT") throw error;
      }
      try {
        await fs.lstat(finalPath);
        throw error;
      } catch (statError) {
        if (errorCode(statError) !== "ENOENT") throw statError;
      }
    }
  }

  const stagingPath = path.join(
    directory,
    `.registry-generation-${generationId}.${randomSuffix()}.tmp`,
  );
  let handle: NodeFileHandle | undefined;
  let published = false;
  let completed = false;
  try {
    handle = await fs.open(stagingPath, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    const staged = await handle.stat();
    if (!staged.isFile() || staged.size !== bytes.length) {
      throw new TypeError("registry generation staging write was incomplete");
    }
    await handle.close();
    handle = undefined;
    try {
      await fs.link(stagingPath, finalPath);
      published = true;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      const existing = await loadRegistryGeneration({
        directory,
        generationId,
        verify: options.verify,
        maxBytes,
      });
      const durable = await proveDirectoryDurability(
        options.durabilityAdapter,
        directory,
      );
      if (!durable) {
        throw new TypeError(
          "registry generation directory durability was not proven",
        );
      }
      return makeDurableReceipt(
        existing,
        options.durabilityAdapter,
      );
    }
    await fs.chmod(finalPath, 0o444);
    const reopened = await loadRegistryGeneration({
      directory,
      generationId,
      verify: options.verify,
      maxBytes,
    });
    const durable = await proveDirectoryDurability(
      options.durabilityAdapter,
      directory,
    );
    if (!durable) {
      throw new TypeError(
        "registry generation directory durability was not proven",
      );
    }
    const durableReceipt = makeDurableReceipt(
      reopened,
      options.durabilityAdapter,
    );
    completed = true;
    return durableReceipt;
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {
        // The operation is already refusing; do not replace its diagnostic.
      }
    }
    try {
      await fs.unlink(stagingPath);
    } catch {
      // A non-authorizing staging file is harmless and may be quarantined.
    }
    if (published && !completed) {
      try {
        await fs.unlink(finalPath);
      } catch {
        // The caller receives no receipt; any survivor remains non-authorizing.
      }
    }
  }
}
