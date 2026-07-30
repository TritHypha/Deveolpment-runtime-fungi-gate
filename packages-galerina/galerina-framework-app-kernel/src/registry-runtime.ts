import {
  checkRegistryPolicy,
  lookupCertifiedPackage,
  type AdmissionResult,
  type CertifiedLookup,
  type HybridIndexVerifiers,
  type RegistryIndex,
  type RegistryPolicy,
} from "./registry-index.js";
import {
  verifyRegistryIndexUnderDelegation,
  type RegistryAuthorityDelegation,
} from "./registry-authority.js";
import { createRegistryPublicVerifiers } from "@galerina/tower-citizen";

interface NodeStats {
  readonly size: number;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface NodeFs {
  lstatSync(path: URL): NodeStats;
  readFileSync(path: URL): Uint8Array;
  readdirSync(path: URL): string[];
}

interface NodeHash {
  update(data: Uint8Array): NodeHash;
  digest(encoding: "hex"): string;
}

interface NodePublicKey {
  export(options: { readonly type: "spki"; readonly format: "der" }): Uint8Array;
}

interface NodeCrypto {
  createHash(algorithm: "sha256"): NodeHash;
  createPublicKey(pem: string): NodePublicKey;
}

const dynImport = (specifier: string): Promise<unknown> =>
  (Function("s", "return import(s)") as
    (value: string) => Promise<unknown>)(specifier);

async function loadNode(): Promise<{ fs: NodeFs; crypto: NodeCrypto }> {
  const [fs, crypto] = await Promise.all([
    dynImport("node:fs") as Promise<NodeFs>,
    dynImport("node:crypto") as Promise<NodeCrypto>,
  ]);
  return { fs, crypto };
}

const MAX_INDEX_BYTES = 1_048_576;
const MAX_DELEGATION_BYTES = 1_048_576;
const MAX_PUBLIC_KEY_BYTES = 65_536;
const SIGNED_DELEGATION =
  /^registry-delegation-([0-9a-f]{16})-v1\.json$/;

export const ERR_REGISTRY_RUNTIME_IO = "ERR_REGISTRY_RUNTIME_IO";
export const ERR_REGISTRY_RUNTIME_MALFORMED =
  "ERR_REGISTRY_RUNTIME_MALFORMED";
export const ERR_REGISTRY_RUNTIME_AUTHORITY =
  "ERR_REGISTRY_RUNTIME_AUTHORITY";

export class RegistryRuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RegistryRuntimeError";
    this.code = code;
  }
}

export interface ProductionRegistryOptions {
  readonly expectedRootKeyId: string;
  readonly at: string;
  readonly minDelegationSerial: number;
  readonly minIndexIssuedAt: string;
  readonly isRevoked: (keyId: string) => boolean;
}

export interface ProductionRegistryRuntime {
  readonly rootKeyId: string;
  readonly operationalKeyId: string;
  readonly delegationSerial: number;
  readonly indexIssuedAt: string;
  admit(
    lookup: CertifiedLookup,
    policy: RegistryPolicy,
  ): AdmissionResult;
}

function readBoundedFile(
  fs: NodeFs,
  path: URL,
  maxBytes: number,
  label: string,
): Uint8Array {
  let stats: NodeStats;
  try {
    stats = fs.lstatSync(path);
  } catch {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_IO,
      `${label} is missing or unreadable.`,
    );
  }
  if (
    !stats.isFile()
    || stats.isSymbolicLink()
    || !Number.isSafeInteger(stats.size)
    || stats.size <= 0
    || stats.size > maxBytes
  ) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_IO,
      `${label} is not a bounded regular file.`,
    );
  }
  let bytes: Uint8Array;
  try {
    bytes = fs.readFileSync(path);
  } catch {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_IO,
      `${label} could not be read.`,
    );
  }
  if (bytes.length !== stats.size || bytes.length > maxBytes) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_IO,
      `${label} changed while it was being read.`,
    );
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array, label: string): string {
  if (
    bytes.length >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf
  ) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} must be canonical UTF-8 without a byte-order mark.`,
    );
  }
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} is not valid UTF-8.`,
    );
  }
  if (value.includes("\0")) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} contains a forbidden NUL character.`,
    );
  }
  return value;
}

function parseObject<T>(bytes: Uint8Array, label: string): T {
  let value: unknown;
  try {
    value = JSON.parse(decodeUtf8(bytes, label));
  } catch (error) {
    if (error instanceof RegistryRuntimeError) throw error;
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} is not valid JSON.`,
    );
  }
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
  ) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} must contain one JSON object.`,
    );
  }
  return value as T;
}

function decodeCanonicalBase64(value: string, label: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} is not canonical base64.`,
    );
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  let roundTrip = "";
  for (const byte of bytes) roundTrip += String.fromCharCode(byte);
  if (btoa(roundTrip) !== value) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `${label} is not canonical base64.`,
    );
  }
  return bytes;
}

function sha256(crypto: NodeCrypto, bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function publicKeyFacts(
  fs: NodeFs,
  crypto: NodeCrypto,
  governanceRoot: URL,
  keyId: string,
): {
  readonly ed25519PublicKeyPem: string;
  readonly mlDsa65PublicKey: Uint8Array;
  readonly ed25519Sha256: string;
  readonly mlDsa65Sha256: string;
} {
  const edBytes = readBoundedFile(
    fs,
    new URL(`signing-key-${keyId}.pub.pem`, governanceRoot),
    MAX_PUBLIC_KEY_BYTES,
    `Ed25519 public key '${keyId}'`,
  );
  const ed25519PublicKeyPem = decodeUtf8(
    edBytes,
    `Ed25519 public key '${keyId}'`,
  );
  let edDer: Uint8Array;
  try {
    edDer = crypto.createPublicKey(ed25519PublicKeyPem).export({
      type: "spki",
      format: "der",
    });
  } catch {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_MALFORMED,
      `Ed25519 public key '${keyId}' is malformed.`,
    );
  }
  const mlText = decodeUtf8(
    readBoundedFile(
      fs,
      new URL(`signing-key-${keyId}.mldsa.pub.b64`, governanceRoot),
      MAX_PUBLIC_KEY_BYTES,
      `ML-DSA-65 public key '${keyId}'`,
    ),
    `ML-DSA-65 public key '${keyId}'`,
  ).trim();
  const mlDsa65PublicKey = decodeCanonicalBase64(
    mlText,
    `ML-DSA-65 public key '${keyId}'`,
  );
  return {
    ed25519PublicKeyPem,
    mlDsa65PublicKey,
    ed25519Sha256: sha256(crypto, edDer),
    mlDsa65Sha256: sha256(crypto, mlDsa65PublicKey),
  };
}

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  Object.freeze(value);
}

async function loadProductionRegistryFromRoot(
  repositoryRoot: URL,
  options: ProductionRegistryOptions,
): Promise<ProductionRegistryRuntime> {
  const { fs, crypto } = await loadNode();
  const governanceRoot = new URL("governance/", repositoryRoot);
  const registryRoot = new URL(
    "packages-galerina/galerina-registry/",
    repositoryRoot,
  );
  const index = parseObject<RegistryIndex>(
    readBoundedFile(
      fs,
      new URL("registry-index-v2.json", registryRoot),
      MAX_INDEX_BYTES,
      "production registry index",
    ),
    "production registry index",
  );
  const indexKeyId = index.signature?.keyId;
  if (typeof indexKeyId !== "string" || indexKeyId.length === 0) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_AUTHORITY,
      "Production registry index has no signing identity.",
    );
  }

  let delegationNames: string[];
  try {
    delegationNames = fs.readdirSync(governanceRoot);
  } catch {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_IO,
      "Registry governance directory is missing or unreadable.",
    );
  }
  const matching: RegistryAuthorityDelegation[] = [];
  for (const name of delegationNames.sort()) {
    const match = SIGNED_DELEGATION.exec(name);
    if (match === null) continue;
    const delegation = parseObject<RegistryAuthorityDelegation>(
      readBoundedFile(
        fs,
        new URL(name, governanceRoot),
        MAX_DELEGATION_BYTES,
        `registry delegation '${name}'`,
      ),
      `registry delegation '${name}'`,
    );
    if (delegation.operational?.keyId === indexKeyId) {
      matching.push(delegation);
    }
  }
  matching.sort((left, right) => right.serial - left.serial);
  const delegation = matching[0];
  if (delegation === undefined) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_AUTHORITY,
      `No signed delegation matches operational key '${indexKeyId}'.`,
    );
  }
  if (
    matching[1] !== undefined
    && matching[1].serial === delegation.serial
  ) {
    throw new RegistryRuntimeError(
      ERR_REGISTRY_RUNTIME_AUTHORITY,
      `Operational key '${indexKeyId}' has an ambiguous delegation serial.`,
    );
  }

  const rootFacts = publicKeyFacts(
    fs,
    crypto,
    governanceRoot,
    options.expectedRootKeyId,
  );
  const operationalFacts = publicKeyFacts(
    fs,
    crypto,
    governanceRoot,
    indexKeyId,
  );
  const verifyRoot = createRegistryPublicVerifiers({
    role: "root",
    keyId: options.expectedRootKeyId,
    ed25519PublicKeyPem: rootFacts.ed25519PublicKeyPem,
    mlDsa65PublicKey: rootFacts.mlDsa65PublicKey,
  });
  const verifyIndex = createRegistryPublicVerifiers({
    role: "operational",
    keyId: indexKeyId,
    ed25519PublicKeyPem: operationalFacts.ed25519PublicKeyPem,
    mlDsa65PublicKey: operationalFacts.mlDsa65PublicKey,
  }) as HybridIndexVerifiers;

  verifyRegistryIndexUnderDelegation(index, delegation, {
    authority: {
      expectedRootKeyId: options.expectedRootKeyId,
      verifyRoot,
      at: options.at,
      minSerial: options.minDelegationSerial,
      isRevoked: options.isRevoked,
    },
    operationalPublicKeyFingerprints: {
      ed25519: operationalFacts.ed25519Sha256,
      mlDsa65: operationalFacts.mlDsa65Sha256,
    },
    verifyIndex,
    minIndexIssuedAt: options.minIndexIssuedAt,
  });
  deepFreeze(index);
  deepFreeze(delegation);

  return Object.freeze({
    rootKeyId: delegation.rootKeyId,
    operationalKeyId: delegation.operational.keyId,
    delegationSerial: delegation.serial,
    indexIssuedAt: index.issuedAt,
    admit(
      lookup: CertifiedLookup,
      policy: RegistryPolicy,
    ): AdmissionResult {
      const found = lookupCertifiedPackage(index, lookup);
      if (!found.ok) return found;
      const checked = checkRegistryPolicy(found.entry, policy);
      if (!checked.ok) {
        return {
          ok: false,
          code: checked.code,
          reason: checked.reason,
        };
      }
      return { ok: true, entry: found.entry };
    },
  });
}

export async function loadProductionRegistry(
  options: ProductionRegistryOptions,
): Promise<ProductionRegistryRuntime> {
  return loadProductionRegistryFromRoot(
    new URL("../../../", import.meta.url),
    options,
  );
}
