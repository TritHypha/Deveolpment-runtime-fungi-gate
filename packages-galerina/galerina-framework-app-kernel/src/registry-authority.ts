// =============================================================================
// Galerina App Kernel — Offline-root registry authority delegation
//
// The offline root authorizes one short-lived operational hybrid signing key.
// The root does not sign package manifests or registry indexes directly.
// Delegations are closed, time-bounded, revocation-aware, rollback-resistant,
// and bind both operational public-key fingerprints.
// =============================================================================

import { canonicalJson } from "./fuse-loader.js";
import {
  type RegistryIndex,
  type RegistryIndexVerifier,
  verifyRegistryIndex,
} from "./registry-index.js";

export const REGISTRY_DELEGATION_V1_CONTEXT =
  "galerina.registry.delegation.sig.v1" as const;

export const ERR_REGISTRY_DELEGATION_UNSIGNED =
  "ERR_REGISTRY_DELEGATION_UNSIGNED";
export const ERR_REGISTRY_DELEGATION_BAD_SIGNATURE =
  "ERR_REGISTRY_DELEGATION_BAD_SIGNATURE";
export const ERR_REGISTRY_DELEGATION_KEY_MISMATCH =
  "ERR_REGISTRY_DELEGATION_KEY_MISMATCH";
export const ERR_REGISTRY_DELEGATION_MALFORMED =
  "ERR_REGISTRY_DELEGATION_MALFORMED";
export const ERR_REGISTRY_DELEGATION_NOT_ACTIVE =
  "ERR_REGISTRY_DELEGATION_NOT_ACTIVE";
export const ERR_REGISTRY_DELEGATION_REVOKED =
  "ERR_REGISTRY_DELEGATION_REVOKED";
export const ERR_REGISTRY_DELEGATION_ROLE =
  "ERR_REGISTRY_DELEGATION_ROLE";
export const ERR_REGISTRY_DELEGATION_STALE =
  "ERR_REGISTRY_DELEGATION_STALE";

export type RegistryDelegationRole =
  | "package-manifest.sign"
  | "registry-index.sign";

export interface RegistryOperationalAuthority {
  readonly keyId: string;
  readonly algorithm: "Ed25519+ML-DSA-65";
  readonly ed25519PublicKeySha256: string;
  readonly mlDsa65PublicKeySha256: string;
}

export interface RegistryDelegationRootSignature {
  readonly algorithm: "Ed25519+ML-DSA-65";
  readonly keyId: string;
  readonly ed25519Signature: string;
  readonly mlDsa65Signature: string;
  readonly canon: "jcs";
  readonly context: typeof REGISTRY_DELEGATION_V1_CONTEXT;
}

export interface RegistryAuthorityDelegation {
  readonly schema: "galerina-registry-delegation/v1";
  readonly registry: string;
  readonly serial: number;
  readonly issuedAt: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly rootKeyId: string;
  readonly operational: RegistryOperationalAuthority;
  readonly roles: readonly RegistryDelegationRole[];
  readonly rootSignature?: RegistryDelegationRootSignature;
}

export interface RegistryAuthorityDelegationInput {
  readonly registry: string;
  readonly serial: number;
  readonly issuedAt: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly rootKeyId: string;
  readonly operational: RegistryOperationalAuthority;
  readonly roles: readonly string[];
}

export type RegistryRootVerifier = (
  message: Uint8Array,
  signature: string,
  keyId: string,
) => boolean | "no-key";

export interface RegistryRootVerifiers {
  readonly ed25519: RegistryRootVerifier;
  readonly mlDsa65: RegistryRootVerifier;
}

export interface RegistryAuthorityVerification {
  readonly expectedRootKeyId: string;
  readonly at: string;
  readonly minSerial?: number;
  readonly requiredRoles?: readonly string[];
  readonly isRevoked: (keyId: string) => boolean;
  readonly verifyRoot: RegistryRootVerifiers;
}

export class RegistryAuthorityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RegistryAuthorityError";
    this.code = code;
  }
}

const ALLOWED_ROLES: readonly RegistryDelegationRole[] = [
  "package-manifest.sign",
  "registry-index.sign",
];
const SHA256_HEX = /^[0-9a-f]{64}$/;

function malformed(message: string): never {
  throw new RegistryAuthorityError(ERR_REGISTRY_DELEGATION_MALFORMED, message);
}

function requireNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    malformed(`${field} must be a non-empty string.`);
  }
}

function parseCanonicalInstant(value: unknown, field: string): number {
  requireNonEmpty(value, field);
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds)
    || new Date(milliseconds).toISOString() !== value
  ) {
    malformed(`${field} must be a canonical ISO-8601 UTC instant.`);
  }
  return milliseconds;
}

function validateOperational(
  operational: RegistryOperationalAuthority,
): void {
  if (typeof operational !== "object" || operational === null) {
    malformed("operational authority must be an object.");
  }
  requireNonEmpty(operational.keyId, "operational.keyId");
  if (operational.algorithm !== "Ed25519+ML-DSA-65") {
    malformed("operational.algorithm must be Ed25519+ML-DSA-65.");
  }
  if (!SHA256_HEX.test(operational.ed25519PublicKeySha256)) {
    malformed(
      "operational.ed25519PublicKeySha256 must be 64 lowercase hexadecimal characters.",
    );
  }
  if (!SHA256_HEX.test(operational.mlDsa65PublicKeySha256)) {
    malformed(
      "operational.mlDsa65PublicKeySha256 must be 64 lowercase hexadecimal characters.",
    );
  }
}

function validateRoles(
  roles: readonly string[],
): asserts roles is readonly RegistryDelegationRole[] {
  if (!Array.isArray(roles) || roles.length === 0) {
    malformed("roles must be a non-empty array.");
  }
  const seen = new Set<string>();
  for (const role of roles) {
    if (!ALLOWED_ROLES.includes(role as RegistryDelegationRole)) {
      malformed(`unsupported registry delegation role '${String(role)}'.`);
    }
    if (seen.has(role)) {
      malformed(`duplicate registry delegation role '${role}'.`);
    }
    seen.add(role);
  }
}

function validateUnsignedFields(
  delegation: RegistryAuthorityDelegationInput,
): void {
  requireNonEmpty(delegation.registry, "registry");
  requireNonEmpty(delegation.rootKeyId, "rootKeyId");
  if (!Number.isSafeInteger(delegation.serial) || delegation.serial < 1) {
    malformed("serial must be a positive safe integer.");
  }
  const issuedAt = parseCanonicalInstant(delegation.issuedAt, "issuedAt");
  const notBefore = parseCanonicalInstant(delegation.notBefore, "notBefore");
  const notAfter = parseCanonicalInstant(delegation.notAfter, "notAfter");
  if (notBefore > notAfter) {
    malformed("notBefore must not be later than notAfter.");
  }
  if (issuedAt > notAfter) {
    malformed("issuedAt must not be later than notAfter.");
  }
  validateOperational(delegation.operational);
  validateRoles(delegation.roles);
}

export function buildRegistryAuthorityDelegation(
  input: RegistryAuthorityDelegationInput,
): RegistryAuthorityDelegation {
  validateUnsignedFields(input);
  const roles = ALLOWED_ROLES.filter((role) => input.roles.includes(role));
  return {
    schema: "galerina-registry-delegation/v1",
    registry: input.registry,
    serial: input.serial,
    issuedAt: input.issuedAt,
    notBefore: input.notBefore,
    notAfter: input.notAfter,
    rootKeyId: input.rootKeyId,
    operational: { ...input.operational },
    roles,
  };
}

function signingInput(delegation: RegistryAuthorityDelegation): string {
  const { rootSignature: _omit, ...withoutSignature } = delegation;
  return canonicalJson(withoutSignature);
}

export function registryAuthorityDelegationPreimage(
  delegation: RegistryAuthorityDelegation,
): Uint8Array {
  if (delegation.schema !== "galerina-registry-delegation/v1") {
    malformed(`unsupported delegation schema '${String(delegation.schema)}'.`);
  }
  validateUnsignedFields(delegation);
  return new TextEncoder().encode(
    `${REGISTRY_DELEGATION_V1_CONTEXT}\0Ed25519+ML-DSA-65\0${delegation.rootKeyId}\0jcs\0${signingInput(delegation)}`,
  );
}

export function signRegistryAuthorityDelegation(
  delegation: RegistryAuthorityDelegation,
  signRootEd25519: (message: Uint8Array) => string,
  signRootMlDsa65: (message: Uint8Array) => string,
): RegistryAuthorityDelegation {
  const message = registryAuthorityDelegationPreimage(delegation);
  const ed25519Signature = signRootEd25519(message);
  const mlDsa65Signature = signRootMlDsa65(message);
  if (
    typeof ed25519Signature !== "string"
    || ed25519Signature.length === 0
    || typeof mlDsa65Signature !== "string"
    || mlDsa65Signature.length === 0
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_UNSIGNED,
      "Both offline-root signature components must be non-empty.",
    );
  }
  return {
    ...delegation,
    rootSignature: {
      algorithm: "Ed25519+ML-DSA-65",
      keyId: delegation.rootKeyId,
      ed25519Signature,
      mlDsa65Signature,
      canon: "jcs",
      context: REGISTRY_DELEGATION_V1_CONTEXT,
    },
  };
}

function isRevoked(
  keyId: string,
  check: (keyId: string) => boolean,
): boolean {
  try {
    return check(keyId) === true;
  } catch {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_REVOKED,
      `Revocation status could not be established for keyId '${keyId}'.`,
    );
  }
}

export function verifyRegistryAuthorityDelegation(
  delegation: RegistryAuthorityDelegation,
  options: RegistryAuthorityVerification,
): "verified" {
  if (delegation.schema !== "galerina-registry-delegation/v1") {
    malformed(`unsupported delegation schema '${String(delegation.schema)}'.`);
  }
  validateUnsignedFields(delegation);
  requireNonEmpty(options.expectedRootKeyId, "expectedRootKeyId");

  const signature = delegation.rootSignature;
  if (
    signature === undefined
    || signature.algorithm !== "Ed25519+ML-DSA-65"
    || signature.canon !== "jcs"
    || signature.context !== REGISTRY_DELEGATION_V1_CONTEXT
    || typeof signature.ed25519Signature !== "string"
    || signature.ed25519Signature.length === 0
    || typeof signature.mlDsa65Signature !== "string"
    || signature.mlDsa65Signature.length === 0
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_UNSIGNED,
      "Delegation requires the pinned offline-root Ed25519+ML-DSA-65 envelope.",
    );
  }
  if (
    delegation.rootKeyId !== options.expectedRootKeyId
    || signature.keyId !== delegation.rootKeyId
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
      "Delegation root identity does not match the locally pinned root key.",
    );
  }
  if (
    isRevoked(delegation.rootKeyId, options.isRevoked)
    || isRevoked(delegation.operational.keyId, options.isRevoked)
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_REVOKED,
      "The root or operational registry signing authority is revoked.",
    );
  }

  if (
    typeof options.verifyRoot !== "object"
    || options.verifyRoot === null
    || typeof options.verifyRoot.ed25519 !== "function"
    || typeof options.verifyRoot.mlDsa65 !== "function"
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
      "Both pinned offline-root public-key verifiers are required.",
    );
  }
  const rootMessage = registryAuthorityDelegationPreimage(delegation);
  verifyRootComponent(
    rootMessage,
    signature.ed25519Signature,
    signature.keyId,
    options.verifyRoot.ed25519,
  );
  verifyRootComponent(
    rootMessage,
    signature.mlDsa65Signature,
    signature.keyId,
    options.verifyRoot.mlDsa65,
  );

  const at = parseCanonicalInstant(options.at, "at");
  const notBefore = Date.parse(delegation.notBefore);
  const notAfter = Date.parse(delegation.notAfter);
  if (at < notBefore || at > notAfter) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_NOT_ACTIVE,
      "Delegation is not active at the supplied verification instant.",
    );
  }

  const minSerial = options.minSerial ?? 0;
  if (!Number.isSafeInteger(minSerial) || minSerial < 0) {
    malformed("minSerial must be a non-negative safe integer.");
  }
  if (delegation.serial <= minSerial) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_STALE,
      `Delegation serial ${delegation.serial} is not newer than accepted floor ${minSerial}.`,
    );
  }

  for (const role of options.requiredRoles ?? []) {
    if (
      !ALLOWED_ROLES.includes(role as RegistryDelegationRole)
      || !delegation.roles.includes(role as RegistryDelegationRole)
    ) {
      throw new RegistryAuthorityError(
        ERR_REGISTRY_DELEGATION_ROLE,
        `Delegation does not authorize required role '${role}'.`,
      );
    }
  }
  return "verified";
}

function verifyRootComponent(
  message: Uint8Array,
  signature: string,
  keyId: string,
  verifier: RegistryRootVerifier,
): void {
  let result: boolean | "no-key";
  try {
    result = verifier(message, signature, keyId);
  } catch {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_BAD_SIGNATURE,
      `The root signature verifier rejected a component for keyId '${keyId}'.`,
    );
  }
  if (result === "no-key") {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
      `A pinned root public key is unavailable for keyId '${keyId}'.`,
    );
  }
  if (result !== true) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_BAD_SIGNATURE,
      `Root signature verification failed for keyId '${keyId}'.`,
    );
  }
}

export interface DelegatedRegistryIndexVerification {
  readonly authority: Omit<
    RegistryAuthorityVerification,
    "requiredRoles"
  >;
  readonly operationalPublicKeyFingerprints: {
    readonly ed25519: string;
    readonly mlDsa65: string;
  };
  readonly verifyIndex: RegistryIndexVerifier;
  readonly minIndexIssuedAt?: string;
}

/**
 * Verify the complete root -> operational authority -> registry-index chain.
 * The public keys used by the index verifier must match the fingerprints the
 * offline root signed; keyId equality alone is not sufficient.
 */
export function verifyRegistryIndexUnderDelegation(
  index: RegistryIndex,
  delegation: RegistryAuthorityDelegation,
  options: DelegatedRegistryIndexVerification,
): "verified" {
  verifyRegistryAuthorityDelegation(delegation, {
    ...options.authority,
    requiredRoles: ["registry-index.sign"],
  });
  const fingerprints = options.operationalPublicKeyFingerprints;
  if (
    fingerprints.ed25519
      !== delegation.operational.ed25519PublicKeySha256
    || fingerprints.mlDsa65
      !== delegation.operational.mlDsa65PublicKeySha256
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
      "Operational public-key bytes do not match the root-authorized fingerprints.",
    );
  }
  const signature = index.signature;
  if (
    index.schema !== "galerina-registry-index/v2"
    || signature === undefined
    || signature.algorithm !== "Ed25519+ML-DSA-65"
    || signature.keyId !== delegation.operational.keyId
  ) {
    throw new RegistryAuthorityError(
      ERR_REGISTRY_DELEGATION_KEY_MISMATCH,
      "Registry index is not signed by the delegated operational authority.",
    );
  }
  return verifyRegistryIndex(
    index,
    options.verifyIndex,
    options.minIndexIssuedAt,
  );
}
