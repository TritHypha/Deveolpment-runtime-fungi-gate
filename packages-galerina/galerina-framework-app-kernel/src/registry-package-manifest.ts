// =============================================================================
// Galerina App Kernel — hybrid package-manifest signature contract
//
// Package source identity, declared powers, governance facts, and signing-key
// identity are covered by the same domain-separated Ed25519 + ML-DSA-65
// preimage. Both components are mandatory. The compact text envelope preserves
// compatibility with the strict package.galerina.yaml scalar parser.
// =============================================================================

import { canonicalJson } from "./fuse-loader.js";

export const REGISTRY_PACKAGE_MANIFEST_V1_CONTEXT =
  "galerina.registry.package.manifest.sig.v1" as const;
export const REGISTRY_PACKAGE_MANIFEST_V1_PREFIX =
  "galerina-hybrid-v1" as const;

export const ERR_REGISTRY_MANIFEST_UNSIGNED =
  "ERR_REGISTRY_MANIFEST_UNSIGNED";
export const ERR_REGISTRY_MANIFEST_MALFORMED =
  "ERR_REGISTRY_MANIFEST_MALFORMED";
export const ERR_REGISTRY_MANIFEST_BAD_SIGNATURE =
  "ERR_REGISTRY_MANIFEST_BAD_SIGNATURE";
export const ERR_REGISTRY_MANIFEST_NO_KEY =
  "ERR_REGISTRY_MANIFEST_NO_KEY";
export const ERR_REGISTRY_MANIFEST_KEY_MISMATCH =
  "ERR_REGISTRY_MANIFEST_KEY_MISMATCH";

export interface RegistryPackageManifest {
  readonly schema: "galerina-package-manifest/v1";
  readonly signerKeyId?: string;
  readonly signature?: string;
  readonly [field: string]: unknown;
}

export type RegistryManifestVerifier = (
  message: Uint8Array,
  signature: string,
  keyId: string,
) => boolean | "no-key";

export interface RegistryManifestVerifiers {
  readonly ed25519: RegistryManifestVerifier;
  readonly mlDsa65: RegistryManifestVerifier;
}

export class RegistryPackageManifestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RegistryPackageManifestError";
    this.code = code;
  }
}

function malformed(message: string): never {
  throw new RegistryPackageManifestError(
    ERR_REGISTRY_MANIFEST_MALFORMED,
    message,
  );
}

function requireSigningIdentity(
  manifest: RegistryPackageManifest,
): string {
  if (manifest.schema !== "galerina-package-manifest/v1") {
    malformed(`unsupported package manifest schema '${String(manifest.schema)}'.`);
  }
  if (
    typeof manifest.signerKeyId !== "string"
    || manifest.signerKeyId.length === 0
  ) {
    malformed("signerKeyId must be a non-empty string.");
  }
  return manifest.signerKeyId;
}

function canonicalBase64(value: string): boolean {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return false;
  }
  try {
    return btoa(atob(value)) === value;
  } catch {
    return false;
  }
}

function manifestSigningInput(
  manifest: RegistryPackageManifest,
): string {
  const { signature: _omit, ...withoutSignature } = manifest;
  return canonicalJson(withoutSignature);
}

export function packageManifestSignaturePreimage(
  manifest: RegistryPackageManifest,
): Uint8Array {
  const keyId = requireSigningIdentity(manifest);
  return new TextEncoder().encode(
    `${REGISTRY_PACKAGE_MANIFEST_V1_CONTEXT}\0Ed25519+ML-DSA-65\0${keyId}\0jcs\0${manifestSigningInput(manifest)}`,
  );
}

export function signRegistryPackageManifest(
  manifest: RegistryPackageManifest,
  keyId: string,
  signEd25519: (message: Uint8Array) => string,
  signMlDsa65: (message: Uint8Array) => string,
): RegistryPackageManifest {
  if (typeof keyId !== "string" || keyId.length === 0) {
    malformed("operational package-manifest signer keyId must not be empty.");
  }
  const {
    signerKeyId: _omitSigner,
    signature: _omitSignature,
    ...unsignedManifest
  } = manifest;
  const prepared: RegistryPackageManifest = {
    ...unsignedManifest,
    signerKeyId: keyId,
  };
  const message = packageManifestSignaturePreimage(prepared);
  const ed25519Signature = signEd25519(message);
  const mlDsa65Signature = signMlDsa65(message);
  if (
    typeof ed25519Signature !== "string"
    || ed25519Signature.length === 0
    || typeof mlDsa65Signature !== "string"
    || mlDsa65Signature.length === 0
  ) {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_UNSIGNED,
      "Both operational package-manifest signatures are required.",
    );
  }
  if (
    !canonicalBase64(ed25519Signature)
    || !canonicalBase64(mlDsa65Signature)
  ) {
    malformed("Package-manifest signature components must be canonical base64.");
  }
  return {
    ...prepared,
    signature:
      `${REGISTRY_PACKAGE_MANIFEST_V1_PREFIX}.${ed25519Signature}.${mlDsa65Signature}`,
  };
}

function parseEnvelope(signature: string): {
  readonly ed25519: string;
  readonly mlDsa65: string;
} {
  const parts = signature.split(".");
  if (
    parts.length !== 3
    || parts[0] !== REGISTRY_PACKAGE_MANIFEST_V1_PREFIX
    || parts[1] === undefined
    || parts[2] === undefined
    || !canonicalBase64(parts[1])
    || !canonicalBase64(parts[2])
  ) {
    malformed(
      "Package manifest must carry the exact galerina-hybrid-v1 dual-signature envelope.",
    );
  }
  return { ed25519: parts[1], mlDsa65: parts[2] };
}

function verifyComponent(
  verifier: RegistryManifestVerifier,
  message: Uint8Array,
  signature: string,
  keyId: string,
): void {
  let result: boolean | "no-key";
  try {
    result = verifier(message, signature, keyId);
  } catch {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_BAD_SIGNATURE,
      `Package-manifest verifier rejected a component for keyId '${keyId}'.`,
    );
  }
  if (result === "no-key") {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_NO_KEY,
      `No admitted operational public key is available for keyId '${keyId}'.`,
    );
  }
  if (result !== true) {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_BAD_SIGNATURE,
      `Package-manifest signature verification failed for keyId '${keyId}'.`,
    );
  }
}

export function verifyRegistryPackageManifest(
  manifest: RegistryPackageManifest,
  verifiers: RegistryManifestVerifiers,
  expectedKeyId: string,
): "verified" {
  const keyId = requireSigningIdentity(manifest);
  if (keyId !== expectedKeyId) {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_KEY_MISMATCH,
      `Package manifest signer '${keyId}' does not match delegated operational key '${expectedKeyId}'.`,
    );
  }
  if (
    typeof manifest.signature !== "string"
    || manifest.signature.length === 0
  ) {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_UNSIGNED,
      "Package manifest is unsigned.",
    );
  }
  if (
    typeof verifiers !== "object"
    || verifiers === null
    || typeof verifiers.ed25519 !== "function"
    || typeof verifiers.mlDsa65 !== "function"
  ) {
    throw new RegistryPackageManifestError(
      ERR_REGISTRY_MANIFEST_NO_KEY,
      "Both operational package-manifest verifiers are required.",
    );
  }
  const envelope = parseEnvelope(manifest.signature);
  const message = packageManifestSignaturePreimage(manifest);
  verifyComponent(verifiers.ed25519, message, envelope.ed25519, keyId);
  verifyComponent(verifiers.mlDsa65, message, envelope.mlDsa65, keyId);
  return "verified";
}
