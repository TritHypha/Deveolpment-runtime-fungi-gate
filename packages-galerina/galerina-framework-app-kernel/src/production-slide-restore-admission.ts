/**
 * Seals authenticated, reference-only SLIDE restore execution evidence.
 * Change control: production boot composition candidate v1, 2026-08-09.
 * Relates to the production boot composition design, registry durability
 * production admission, Contract 85 and RD-0789.
 */

export interface ProductionSlideRestoreManifest {
  readonly schema: "galerina.production-slide-restore.manifest.v1";
  readonly galerinaCommit: string;
  readonly slideCommit: string;
  readonly packageIdentity: "@galerina/core-sentinel-state";
  readonly exportName: "restoreVerdict";
  readonly objectSha256: string;
  readonly packageSetDigest: string;
  readonly slideBundleDigest: string;
  readonly packageDescriptorDigest: string;
  readonly compilerProfileId: string;
  readonly toolManifestDigest: string;
  readonly safeValueTypeId: "Int";
  readonly safeValueStateId: string;
  readonly safeValueProvenanceDigest: string;
  readonly currentEpoch: number;
  readonly rootKeyId: string;
  readonly operationalKeyId: string;
  readonly delegationSerial: number;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly ed25519Signature: string;
  readonly mlDsa65Signature: string;
}

export interface ProductionSlideRestoreAuthority {
  readonly schema: "galerina.production-slide-restore.authority.v1";
  readonly at: string;
  readonly minDelegationSerial: number;
  readonly expectedRootKeyId: string;
  readonly expectedOperationalKeyId: string;
  readonly isRevoked: (keyId: string) => boolean;
  readonly digestObject: (objectBytes: Uint8Array) => string;
  readonly verifyEd25519: (
    preimage: Uint8Array,
    signature: string,
    keyId: string,
  ) => boolean;
  readonly verifyMlDsa65: (
    preimage: Uint8Array,
    signature: string,
    keyId: string,
  ) => boolean;
}

export interface ProductionSlideRestoreExecutionPort {
  readonly schema: "galerina.production-slide-restore.execution-port.v1";
  executeAndVerify(snapshotPresent: boolean, integrityOk: boolean): unknown;
}

export interface ProductionSlideRestoreObservation {
  readonly schema: "galerina.production-slide-restore.observation.v1";
  readonly status: "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY";
  readonly packageIdentity: "@galerina/core-sentinel-state";
  readonly exportName: "restoreVerdict";
  readonly objectSha256: string;
  readonly packageSetDigest: string;
  readonly slideBundleDigest: string;
  readonly packageDescriptorDigest: string;
  readonly compilerProfileId: string;
  readonly toolManifestDigest: string;
  readonly currentEpoch: number;
  readonly safeValueTypeId: "Int";
  readonly safeValueStateId: string;
  readonly safeValueProvenanceDigest: string;
  readonly fallbackInvoked: false;
  readonly verificationVerdict: 1;
  readonly value: 1 | -1;
}

export interface AuthenticatedSlideRestoreProfile {
  readonly schema: "galerina.authenticated-slide-restore.profile.v1";
  readonly galerinaCommit: string;
  readonly slideCommit: string;
  readonly packageIdentity: "@galerina/core-sentinel-state";
  readonly exportName: "restoreVerdict";
  readonly objectSha256: string;
  readonly packageSetDigest: string;
  readonly slideBundleDigest: string;
  readonly packageDescriptorDigest: string;
  readonly compilerProfileId: string;
  readonly toolManifestDigest: string;
  readonly safeValueTypeId: "Int";
  readonly safeValueStateId: string;
  readonly safeValueProvenanceDigest: string;
  readonly currentEpoch: number;
  readonly rootKeyId: string;
  readonly operationalKeyId: string;
  readonly minDelegationSerial: number;
  readonly delegationSerial: number;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly authenticatedObjectExecution: true;
  readonly authorityReleased: false;
  readonly productionAuthorizing: false;
}

export type ProductionSlideRestoreAdmissionCode =
  | "PRODUCTION_SLIDE_RESTORE_MANIFEST_REFUSED"
  | "PRODUCTION_SLIDE_RESTORE_OBJECT_REFUSED"
  | "PRODUCTION_SLIDE_RESTORE_AUTHORITY_REFUSED"
  | "PRODUCTION_SLIDE_RESTORE_REVOKED"
  | "PRODUCTION_SLIDE_RESTORE_SIGNATURE_REFUSED"
  | "PRODUCTION_SLIDE_RESTORE_EXECUTION_REFUSED"
  | "PRODUCTION_SLIDE_RESTORE_MALFORMED_REFUSED";

/** Typed terminal refusal; callers receive no partial profile. */
export class ProductionSlideRestoreAdmissionError extends TypeError {
  readonly code: ProductionSlideRestoreAdmissionCode;

  constructor(code: ProductionSlideRestoreAdmissionCode) {
    super(code);
    this.name = "ProductionSlideRestoreAdmissionError";
    this.code = code;
  }
}

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const MANIFEST_KEYS = Object.freeze([
  "compilerProfileId",
  "currentEpoch",
  "delegationSerial",
  "ed25519Signature",
  "exportName",
  "galerinaCommit",
  "mlDsa65Signature",
  "notAfter",
  "notBefore",
  "objectSha256",
  "operationalKeyId",
  "packageDescriptorDigest",
  "packageIdentity",
  "packageSetDigest",
  "rootKeyId",
  "safeValueProvenanceDigest",
  "safeValueStateId",
  "safeValueTypeId",
  "schema",
  "slideBundleDigest",
  "slideCommit",
  "toolManifestDigest",
]);
const SIGNED_MANIFEST_KEYS = Object.freeze(
  MANIFEST_KEYS.filter((key) =>
    key !== "ed25519Signature" && key !== "mlDsa65Signature"
  ),
);
const AUTHORITY_KEYS = Object.freeze([
  "at",
  "digestObject",
  "expectedOperationalKeyId",
  "expectedRootKeyId",
  "isRevoked",
  "minDelegationSerial",
  "schema",
  "verifyEd25519",
  "verifyMlDsa65",
]);
const EXECUTION_PORT_KEYS = Object.freeze(["executeAndVerify", "schema"]);
const OBSERVATION_KEYS = Object.freeze([
  "compilerProfileId",
  "currentEpoch",
  "exportName",
  "fallbackInvoked",
  "objectSha256",
  "packageDescriptorDigest",
  "packageIdentity",
  "packageSetDigest",
  "safeValueProvenanceDigest",
  "safeValueStateId",
  "safeValueTypeId",
  "schema",
  "slideBundleDigest",
  "status",
  "toolManifestDigest",
  "value",
  "verificationVerdict",
]);
const VECTORS = Object.freeze([
  Object.freeze([true, true, 1] as const),
  Object.freeze([true, false, -1] as const),
  Object.freeze([false, true, -1] as const),
  Object.freeze([false, false, -1] as const),
]);
const authenticatedProfiles = new WeakSet<object>();

/** Throws one stable typed refusal and never returns. */
function refuse(code: ProductionSlideRestoreAdmissionCode): never {
  throw new ProductionSlideRestoreAdmissionError(code);
}

/** Accepts only a plain record with exactly the named own data properties. */
function hasExactDataShape(
  value: object,
  keys: readonly string[],
  functionsAllowed = false,
): boolean {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).sort().join(",") !== keys.join(",")) return false;
  const dataPropertiesAreValid = Object.values(descriptors).every((descriptor) =>
    "value" in descriptor
    && descriptor.get === undefined
    && descriptor.set === undefined
    && (functionsAllowed || typeof descriptor.value !== "function")
  );
  if (!dataPropertiesAreValid) return false;
  if (functionsAllowed) return true;
  try {
    structuredClone(value);
    return true;
  } catch {
    // The structured-clone boundary rejects Proxy exotics without invoking a
    // caller-supplied trap as trusted evidence.
    return false;
  }
}

/** Returns the epoch milliseconds only for a canonical ISO instant. */
function canonicalInstant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === value ? parsed : null;
}

/** Checks a non-empty string without accepting boxed or coerced values. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Validates the complete closed manifest before any callback executes. */
function manifestShapeIsValid(
  value: unknown,
): value is ProductionSlideRestoreManifest {
  if (
    typeof value !== "object"
    || value === null
    || !hasExactDataShape(value, MANIFEST_KEYS)
  ) return false;
  const manifest = value as ProductionSlideRestoreManifest;
  return manifest.schema === "galerina.production-slide-restore.manifest.v1"
    && COMMIT.test(manifest.galerinaCommit)
    && COMMIT.test(manifest.slideCommit)
    && manifest.packageIdentity === "@galerina/core-sentinel-state"
    && manifest.exportName === "restoreVerdict"
    && DIGEST.test(manifest.objectSha256)
    && DIGEST.test(manifest.packageSetDigest)
    && DIGEST.test(manifest.slideBundleDigest)
    && DIGEST.test(manifest.packageDescriptorDigest)
    && isNonEmptyString(manifest.compilerProfileId)
    && DIGEST.test(manifest.toolManifestDigest)
    && manifest.safeValueTypeId === "Int"
    && isNonEmptyString(manifest.safeValueStateId)
    && DIGEST.test(manifest.safeValueProvenanceDigest)
    && Number.isSafeInteger(manifest.currentEpoch)
    && manifest.currentEpoch >= 0
    && isNonEmptyString(manifest.rootKeyId)
    && isNonEmptyString(manifest.operationalKeyId)
    && Number.isSafeInteger(manifest.delegationSerial)
    && manifest.delegationSerial >= 0
    && canonicalInstant(manifest.notBefore) !== null
    && canonicalInstant(manifest.notAfter) !== null
    && isNonEmptyString(manifest.ed25519Signature)
    && isNonEmptyString(manifest.mlDsa65Signature);
}

/** Validates the authority record and exact callback surface. */
function authorityShapeIsValid(
  value: unknown,
): value is ProductionSlideRestoreAuthority {
  if (
    typeof value !== "object"
    || value === null
    || !hasExactDataShape(value, AUTHORITY_KEYS, true)
  ) return false;
  const authority = value as ProductionSlideRestoreAuthority;
  return authority.schema === "galerina.production-slide-restore.authority.v1"
    && canonicalInstant(authority.at) !== null
    && Number.isSafeInteger(authority.minDelegationSerial)
    && authority.minDelegationSerial >= 0
    && isNonEmptyString(authority.expectedRootKeyId)
    && isNonEmptyString(authority.expectedOperationalKeyId)
    && typeof authority.isRevoked === "function"
    && typeof authority.digestObject === "function"
    && typeof authority.verifyEd25519 === "function"
    && typeof authority.verifyMlDsa65 === "function";
}

/** Validates the only executable capability accepted by this module. */
function executionPortShapeIsValid(
  value: unknown,
): value is ProductionSlideRestoreExecutionPort {
  if (
    typeof value !== "object"
    || value === null
    || !hasExactDataShape(value, EXECUTION_PORT_KEYS, true)
  ) return false;
  const port = value as ProductionSlideRestoreExecutionPort;
  return port.schema === "galerina.production-slide-restore.execution-port.v1"
    && typeof port.executeAndVerify === "function";
}

/** Builds the deterministic domain-separated manifest signature preimage. */
function signaturePreimage(manifest: ProductionSlideRestoreManifest): Uint8Array {
  const record = manifest as unknown as Record<string, unknown>;
  const text = [
    "galerina.production-slide-restore.sig.v1",
    ...SIGNED_MANIFEST_KEYS.map((key) => {
      const value = String(record[key]);
      return `${key.length}:${key}=${value.length}:${value}`;
    }),
  ].join("\n");
  return new TextEncoder().encode(text);
}

/** Requires one verifier to return literal true; throws and truthy values deny. */
function verifyComponent(
  verifier: ProductionSlideRestoreAuthority["verifyEd25519"],
  preimage: Uint8Array,
  signature: string,
  keyId: string,
): void {
  let verified = false;
  try {
    verified = verifier(preimage, signature, keyId) === true;
  } catch {
    verified = false;
  }
  if (!verified) refuse("PRODUCTION_SLIDE_RESTORE_SIGNATURE_REFUSED");
}

/** Requires one exact observation to agree with all manifest facts and KAT output. */
function observationIsValid(
  value: unknown,
  manifest: ProductionSlideRestoreManifest,
  expectedValue: 1 | -1,
): value is ProductionSlideRestoreObservation {
  if (
    typeof value !== "object"
    || value === null
    || !hasExactDataShape(value, OBSERVATION_KEYS)
  ) return false;
  const observation = value as ProductionSlideRestoreObservation;
  return observation.schema === "galerina.production-slide-restore.observation.v1"
    && observation.status === "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY"
    && observation.packageIdentity === manifest.packageIdentity
    && observation.exportName === manifest.exportName
    && observation.objectSha256 === manifest.objectSha256
    && observation.packageSetDigest === manifest.packageSetDigest
    && observation.slideBundleDigest === manifest.slideBundleDigest
    && observation.packageDescriptorDigest === manifest.packageDescriptorDigest
    && observation.compilerProfileId === manifest.compilerProfileId
    && observation.toolManifestDigest === manifest.toolManifestDigest
    && observation.currentEpoch === manifest.currentEpoch
    && observation.safeValueTypeId === manifest.safeValueTypeId
    && observation.safeValueStateId === manifest.safeValueStateId
    && observation.safeValueProvenanceDigest === manifest.safeValueProvenanceDigest
    && observation.fallbackInvoked === false
    && observation.verificationVerdict === 1
    && observation.value === expectedValue;
}

/**
 * Authenticates one retained SLIDE object and its complete restore truth table.
 * Inputs must be closed, current and exact; any callback fault or disagreement
 * throws a typed refusal and no executable handle escapes in the profile.
 */
export function admitAuthenticatedSlideRestoreProfile(
  manifestValue: unknown,
  objectBytes: Uint8Array,
  authorityValue: unknown,
  executionPortValue: unknown,
): AuthenticatedSlideRestoreProfile {
  try {
    if (!manifestShapeIsValid(manifestValue)) {
      refuse("PRODUCTION_SLIDE_RESTORE_MANIFEST_REFUSED");
    }
    if (!(objectBytes instanceof Uint8Array) || objectBytes.length === 0) {
      refuse("PRODUCTION_SLIDE_RESTORE_OBJECT_REFUSED");
    }
    if (!authorityShapeIsValid(authorityValue)) {
      refuse("PRODUCTION_SLIDE_RESTORE_AUTHORITY_REFUSED");
    }
    if (!executionPortShapeIsValid(executionPortValue)) {
      refuse("PRODUCTION_SLIDE_RESTORE_EXECUTION_REFUSED");
    }
    // Snapshot every accepted surface before invoking caller-controlled code;
    // otherwise a verifier can mutate an already-validated record (TOCTOU).
    const manifest: ProductionSlideRestoreManifest = Object.freeze({
      ...manifestValue,
    });
    const authority: ProductionSlideRestoreAuthority = Object.freeze({
      ...authorityValue,
    });
    const executionPort: ProductionSlideRestoreExecutionPort = Object.freeze({
      ...executionPortValue,
    });
    const retainedObjectBytes = objectBytes.slice();
    const at = canonicalInstant(authority.at) as number;
    const notBefore = canonicalInstant(manifest.notBefore) as number;
    const notAfter = canonicalInstant(manifest.notAfter) as number;
    if (
      notBefore > notAfter
      || at < notBefore
      || at > notAfter
      || manifest.delegationSerial <= authority.minDelegationSerial
      || manifest.rootKeyId !== authority.expectedRootKeyId
      || manifest.operationalKeyId !== authority.expectedOperationalKeyId
    ) {
      refuse("PRODUCTION_SLIDE_RESTORE_AUTHORITY_REFUSED");
    }

    let revoked = true;
    try {
      revoked = authority.isRevoked(manifest.rootKeyId) !== false
        || authority.isRevoked(manifest.operationalKeyId) !== false;
    } catch {
      revoked = true;
    }
    if (revoked) refuse("PRODUCTION_SLIDE_RESTORE_REVOKED");

    let objectDigest = "";
    try {
      objectDigest = authority.digestObject(retainedObjectBytes);
    } catch {
      refuse("PRODUCTION_SLIDE_RESTORE_OBJECT_REFUSED");
    }
    if (!DIGEST.test(objectDigest) || objectDigest !== manifest.objectSha256) {
      refuse("PRODUCTION_SLIDE_RESTORE_OBJECT_REFUSED");
    }

    const preimage = signaturePreimage(manifest);
    verifyComponent(
      authority.verifyEd25519,
      preimage,
      manifest.ed25519Signature,
      manifest.operationalKeyId,
    );
    verifyComponent(
      authority.verifyMlDsa65,
      preimage,
      manifest.mlDsa65Signature,
      manifest.operationalKeyId,
    );

    for (const [snapshotPresent, integrityOk, expectedValue] of VECTORS) {
      let observation: unknown;
      try {
        observation = executionPort.executeAndVerify(snapshotPresent, integrityOk);
      } catch {
        refuse("PRODUCTION_SLIDE_RESTORE_EXECUTION_REFUSED");
      }
      if (!observationIsValid(observation, manifest, expectedValue)) {
        refuse("PRODUCTION_SLIDE_RESTORE_EXECUTION_REFUSED");
      }
    }

    const profile = Object.freeze({
      schema: "galerina.authenticated-slide-restore.profile.v1" as const,
      galerinaCommit: manifest.galerinaCommit,
      slideCommit: manifest.slideCommit,
      packageIdentity: manifest.packageIdentity,
      exportName: manifest.exportName,
      objectSha256: manifest.objectSha256,
      packageSetDigest: manifest.packageSetDigest,
      slideBundleDigest: manifest.slideBundleDigest,
      packageDescriptorDigest: manifest.packageDescriptorDigest,
      compilerProfileId: manifest.compilerProfileId,
      toolManifestDigest: manifest.toolManifestDigest,
      safeValueTypeId: manifest.safeValueTypeId,
      safeValueStateId: manifest.safeValueStateId,
      safeValueProvenanceDigest: manifest.safeValueProvenanceDigest,
      currentEpoch: manifest.currentEpoch,
      rootKeyId: manifest.rootKeyId,
      operationalKeyId: manifest.operationalKeyId,
      minDelegationSerial: authority.minDelegationSerial,
      delegationSerial: manifest.delegationSerial,
      notBefore: manifest.notBefore,
      notAfter: manifest.notAfter,
      authenticatedObjectExecution: true as const,
      authorityReleased: false as const,
      productionAuthorizing: false as const,
    });
    authenticatedProfiles.add(profile);
    return profile;
  } catch (error) {
    if (error instanceof ProductionSlideRestoreAdmissionError) throw error;
    refuse("PRODUCTION_SLIDE_RESTORE_MALFORMED_REFUSED");
  }
}

/** Recognizes only profiles minted by this module in the current process. */
export function isAuthenticatedSlideRestoreProfile(
  value: unknown,
): value is AuthenticatedSlideRestoreProfile {
  return typeof value === "object"
    && value !== null
    && authenticatedProfiles.has(value);
}
