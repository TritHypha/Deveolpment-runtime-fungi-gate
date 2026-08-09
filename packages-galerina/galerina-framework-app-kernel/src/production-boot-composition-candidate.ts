/**
 * Joins sealed SLIDE execution and platform durability evidence as K3 0.
 * Change control: production boot composition candidate v1, 2026-08-09.
 * Relates to the production boot composition design, both owning admission
 * modules and RD-0789; it deliberately exposes no execution or release port.
 */

import {
  isAuthenticatedSlideRestoreProfile,
  type AuthenticatedSlideRestoreProfile,
} from "./production-slide-restore-admission.js";
import {
  isProductionRegistryDurabilityProfile,
  type ProductionRegistryDurabilityProfile,
} from "./registry-durability-production-admission.js";

export interface ProductionBootCompositionPolicy {
  readonly schema: "galerina.production-boot-composition.policy.v1";
  readonly releaseId: "galerina-beta-v1";
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
  readonly platform: "windows" | "linux" | "macos";
  readonly architecture: "x86_64" | "aarch64";
  readonly operatingSystem: string;
  readonly filesystem: string;
  readonly durabilityAdapterId: string;
  readonly durabilityAdapterDigest: string;
  readonly durabilityBinaryDigest: string;
  readonly buildRecipeDigest: string;
  readonly toolchainDigest: string;
  readonly evidenceId: string;
  readonly storageProfileDigest: string;
  readonly acceptedCheckpointDigest: string;
  readonly generationId: string;
  readonly minDelegationSerial: number;
  readonly notBefore: string;
  readonly notAfter: string;
}

export type ProductionBootMissingInput =
  | "REAL_OFFLINE_PRODUCTION_BOOT_DELEGATION"
  | "REAL_OPERATIONAL_PUBLIC_BUNDLE"
  | "REAL_CONTENT_BOUND_NATIVE_SLIDE_HOST"
  | "REAL_PLATFORM_DURABILITY_RECEIPTS"
  | "OWNER_RELEASE_AUTHORIZATION";

export interface ProductionBootCompositionCandidate {
  readonly schema: "galerina.production-boot-composition.candidate.v1";
  readonly status: "CANDIDATE_INDETERMINATE_NON_AUTHORIZING";
  readonly verdict: 0;
  readonly releaseId: "galerina-beta-v1";
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
  readonly platform: "windows" | "linux" | "macos";
  readonly architecture: "x86_64" | "aarch64";
  readonly operatingSystem: string;
  readonly filesystem: string;
  readonly durabilityAdapterId: string;
  readonly durabilityAdapterDigest: string;
  readonly durabilityBinaryDigest: string;
  readonly buildRecipeDigest: string;
  readonly toolchainDigest: string;
  readonly evidenceId: string;
  readonly storageProfileDigest: string;
  readonly acceptedCheckpointDigest: string;
  readonly generationId: string;
  readonly indexIssuedAt: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly authenticatedObjectExecution: true;
  readonly authenticatedPlatformDurability: true;
  readonly authorityReleased: false;
  readonly productionAuthorizing: false;
  readonly missingExternalInputs: readonly ProductionBootMissingInput[];
}

/** Typed K3 -1 terminal refusal; no partial candidate is attached. */
export class ProductionBootCompositionError extends TypeError {
  readonly code = "PRODUCTION_BOOT_COMPOSITION_REFUSED" as const;
  readonly verdict = -1 as const;

  constructor() {
    super("PRODUCTION_BOOT_COMPOSITION_REFUSED");
    this.name = "ProductionBootCompositionError";
  }
}

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const GENERATION = /^[0-9a-f]{64}$/u;
const POLICY_KEYS = Object.freeze([
  "acceptedCheckpointDigest",
  "architecture",
  "buildRecipeDigest",
  "compilerProfileId",
  "currentEpoch",
  "durabilityAdapterDigest",
  "durabilityAdapterId",
  "durabilityBinaryDigest",
  "evidenceId",
  "exportName",
  "filesystem",
  "galerinaCommit",
  "generationId",
  "minDelegationSerial",
  "notAfter",
  "notBefore",
  "objectSha256",
  "operatingSystem",
  "operationalKeyId",
  "packageDescriptorDigest",
  "packageIdentity",
  "packageSetDigest",
  "platform",
  "releaseId",
  "rootKeyId",
  "safeValueProvenanceDigest",
  "safeValueStateId",
  "safeValueTypeId",
  "schema",
  "slideBundleDigest",
  "slideCommit",
  "storageProfileDigest",
  "toolManifestDigest",
  "toolchainDigest",
]);
const MISSING_EXTERNAL_INPUTS: readonly ProductionBootMissingInput[] =
  Object.freeze([
    "REAL_OFFLINE_PRODUCTION_BOOT_DELEGATION",
    "REAL_OPERATIONAL_PUBLIC_BUNDLE",
    "REAL_CONTENT_BOUND_NATIVE_SLIDE_HOST",
    "REAL_PLATFORM_DURABILITY_RECEIPTS",
    "OWNER_RELEASE_AUTHORIZATION",
  ]);
const candidates = new WeakSet<object>();

/** Throws the only public composition refusal and never returns. */
function refuse(): never {
  throw new ProductionBootCompositionError();
}

/** Accepts only one proxy-free plain record with exact own data properties. */
function hasExactDataShape(value: object, keys: readonly string[]): boolean {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).sort().join(",") !== keys.join(",")) return false;
  const exactData = Object.values(descriptors).every((descriptor) =>
    "value" in descriptor
    && descriptor.get === undefined
    && descriptor.set === undefined
    && typeof descriptor.value !== "function"
  );
  if (!exactData) return false;
  try {
    structuredClone(value);
    return true;
  } catch {
    return false;
  }
}

/** Returns epoch milliseconds only for canonical ISO instants. */
function canonicalInstant(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === value ? parsed : null;
}

/** Checks a non-empty primitive string. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Validates the complete policy without invoking caller-controlled code. */
function policyShapeIsValid(
  value: unknown,
): value is ProductionBootCompositionPolicy {
  if (
    typeof value !== "object"
    || value === null
    || !hasExactDataShape(value, POLICY_KEYS)
  ) return false;
  const policy = value as ProductionBootCompositionPolicy;
  const notBefore = canonicalInstant(policy.notBefore);
  const notAfter = canonicalInstant(policy.notAfter);
  return policy.schema === "galerina.production-boot-composition.policy.v1"
    && policy.releaseId === "galerina-beta-v1"
    && COMMIT.test(policy.galerinaCommit)
    && COMMIT.test(policy.slideCommit)
    && policy.packageIdentity === "@galerina/core-sentinel-state"
    && policy.exportName === "restoreVerdict"
    && DIGEST.test(policy.objectSha256)
    && DIGEST.test(policy.packageSetDigest)
    && DIGEST.test(policy.slideBundleDigest)
    && DIGEST.test(policy.packageDescriptorDigest)
    && isNonEmptyString(policy.compilerProfileId)
    && DIGEST.test(policy.toolManifestDigest)
    && policy.safeValueTypeId === "Int"
    && isNonEmptyString(policy.safeValueStateId)
    && DIGEST.test(policy.safeValueProvenanceDigest)
    && Number.isSafeInteger(policy.currentEpoch)
    && policy.currentEpoch >= 0
    && isNonEmptyString(policy.rootKeyId)
    && isNonEmptyString(policy.operationalKeyId)
    && ["windows", "linux", "macos"].includes(policy.platform)
    && ["x86_64", "aarch64"].includes(policy.architecture)
    && isNonEmptyString(policy.operatingSystem)
    && isNonEmptyString(policy.filesystem)
    && isNonEmptyString(policy.durabilityAdapterId)
    && DIGEST.test(policy.durabilityAdapterDigest)
    && DIGEST.test(policy.durabilityBinaryDigest)
    && DIGEST.test(policy.buildRecipeDigest)
    && DIGEST.test(policy.toolchainDigest)
    && DIGEST.test(policy.evidenceId)
    && DIGEST.test(policy.storageProfileDigest)
    && DIGEST.test(policy.acceptedCheckpointDigest)
    && GENERATION.test(policy.generationId)
    && Number.isSafeInteger(policy.minDelegationSerial)
    && policy.minDelegationSerial >= 0
    && notBefore !== null
    && notAfter !== null
    && notBefore <= notAfter;
}

/** Requires every policy fact to agree with the private SLIDE profile. */
function slideProfileMatches(
  policy: ProductionBootCompositionPolicy,
  profile: AuthenticatedSlideRestoreProfile,
): boolean {
  return policy.galerinaCommit === profile.galerinaCommit
    && policy.slideCommit === profile.slideCommit
    && policy.packageIdentity === profile.packageIdentity
    && policy.exportName === profile.exportName
    && policy.objectSha256 === profile.objectSha256
    && policy.packageSetDigest === profile.packageSetDigest
    && policy.slideBundleDigest === profile.slideBundleDigest
    && policy.packageDescriptorDigest === profile.packageDescriptorDigest
    && policy.compilerProfileId === profile.compilerProfileId
    && policy.toolManifestDigest === profile.toolManifestDigest
    && policy.safeValueTypeId === profile.safeValueTypeId
    && policy.safeValueStateId === profile.safeValueStateId
    && policy.safeValueProvenanceDigest === profile.safeValueProvenanceDigest
    && policy.currentEpoch === profile.currentEpoch
    && policy.rootKeyId === profile.rootKeyId
    && policy.operationalKeyId === profile.operationalKeyId
    && policy.minDelegationSerial === profile.minDelegationSerial
    && profile.delegationSerial > policy.minDelegationSerial
    && policy.notBefore === profile.notBefore
    && policy.notAfter === profile.notAfter
    && profile.authenticatedObjectExecution === true
    && profile.authorityReleased === false
    && profile.productionAuthorizing === false;
}

/** Requires every policy fact to agree with the private durability profile. */
function durabilityProfileMatches(
  policy: ProductionBootCompositionPolicy,
  profile: ProductionRegistryDurabilityProfile,
): boolean {
  const indexIssuedAt = canonicalInstant(profile.indexIssuedAt);
  return policy.galerinaCommit === profile.repositoryCommit
    && policy.rootKeyId === profile.rootKeyId
    && policy.operationalKeyId === profile.operationalKeyId
    && policy.minDelegationSerial === profile.minDelegationSerial
    && policy.platform === profile.platform
    && policy.architecture === profile.architecture
    && policy.operatingSystem === profile.operatingSystem
    && policy.filesystem === profile.filesystem
    && policy.durabilityAdapterId === profile.adapterId
    && policy.durabilityAdapterDigest === profile.durabilityAdapterDigest
    && policy.durabilityBinaryDigest === profile.binaryDigest
    && policy.buildRecipeDigest === profile.buildRecipeDigest
    && policy.toolchainDigest === profile.toolchainDigest
    && policy.evidenceId === profile.evidenceId
    && policy.storageProfileDigest === profile.storageProfileDigest
    && policy.acceptedCheckpointDigest === profile.acceptedCheckpointDigest
    && policy.generationId === profile.generationId
    && profile.delegationSerial > policy.minDelegationSerial
    && policy.notBefore === profile.notBefore
    && indexIssuedAt !== null
    && indexIssuedAt >= (canonicalInstant(profile.notBefore) as number)
    && policy.notAfter === profile.notAfter
    && profile.authenticated === true
    && profile.authorityReleased === false
    && profile.productionAuthorizing === false;
}

/**
 * Joins two privately minted profiles into one immutable, data-only K3 0
 * candidate. Missing, copied or disagreeing evidence throws K3 -1; this API
 * has no K3 +1, restore, activation or authority-release path.
 */
export function admitProductionBootCompositionCandidate(
  policyValue: unknown,
  slideProfileValue: unknown,
  durabilityProfileValue: unknown,
): ProductionBootCompositionCandidate {
  try {
    if (!policyShapeIsValid(policyValue)) refuse();
    if (!isAuthenticatedSlideRestoreProfile(slideProfileValue)) refuse();
    if (!isProductionRegistryDurabilityProfile(durabilityProfileValue)) refuse();

    const policy: ProductionBootCompositionPolicy = Object.freeze({
      ...policyValue,
    });
    const slideProfile = slideProfileValue;
    const durabilityProfile = durabilityProfileValue;
    if (
      !slideProfileMatches(policy, slideProfile)
      || !durabilityProfileMatches(policy, durabilityProfile)
      || slideProfile.delegationSerial !== durabilityProfile.delegationSerial
      || slideProfile.minDelegationSerial !== durabilityProfile.minDelegationSerial
      || slideProfile.rootKeyId !== durabilityProfile.rootKeyId
      || slideProfile.operationalKeyId !== durabilityProfile.operationalKeyId
      || slideProfile.galerinaCommit !== durabilityProfile.repositoryCommit
      || slideProfile.notAfter !== durabilityProfile.notAfter
    ) refuse();

    const candidate = Object.freeze({
      schema: "galerina.production-boot-composition.candidate.v1" as const,
      status: "CANDIDATE_INDETERMINATE_NON_AUTHORIZING" as const,
      verdict: 0 as const,
      releaseId: policy.releaseId,
      galerinaCommit: policy.galerinaCommit,
      slideCommit: policy.slideCommit,
      packageIdentity: policy.packageIdentity,
      exportName: policy.exportName,
      objectSha256: policy.objectSha256,
      packageSetDigest: policy.packageSetDigest,
      slideBundleDigest: policy.slideBundleDigest,
      packageDescriptorDigest: policy.packageDescriptorDigest,
      compilerProfileId: policy.compilerProfileId,
      toolManifestDigest: policy.toolManifestDigest,
      safeValueTypeId: policy.safeValueTypeId,
      safeValueStateId: policy.safeValueStateId,
      safeValueProvenanceDigest: policy.safeValueProvenanceDigest,
      currentEpoch: policy.currentEpoch,
      rootKeyId: policy.rootKeyId,
      operationalKeyId: policy.operationalKeyId,
      minDelegationSerial: policy.minDelegationSerial,
      delegationSerial: slideProfile.delegationSerial,
      platform: policy.platform,
      architecture: policy.architecture,
      operatingSystem: policy.operatingSystem,
      filesystem: policy.filesystem,
      durabilityAdapterId: policy.durabilityAdapterId,
      durabilityAdapterDigest: policy.durabilityAdapterDigest,
      durabilityBinaryDigest: policy.durabilityBinaryDigest,
      buildRecipeDigest: policy.buildRecipeDigest,
      toolchainDigest: policy.toolchainDigest,
      evidenceId: policy.evidenceId,
      storageProfileDigest: policy.storageProfileDigest,
      acceptedCheckpointDigest: policy.acceptedCheckpointDigest,
      generationId: policy.generationId,
      indexIssuedAt: durabilityProfile.indexIssuedAt,
      notBefore: policy.notBefore,
      notAfter: policy.notAfter,
      authenticatedObjectExecution: true as const,
      authenticatedPlatformDurability: true as const,
      authorityReleased: false as const,
      productionAuthorizing: false as const,
      missingExternalInputs: MISSING_EXTERNAL_INPUTS,
    });
    candidates.add(candidate);
    return candidate;
  } catch (error) {
    if (error instanceof ProductionBootCompositionError) throw error;
    refuse();
  }
}

/** Recognizes only candidates minted by this module in the current process. */
export function isProductionBootCompositionCandidate(
  value: unknown,
): value is ProductionBootCompositionCandidate {
  return typeof value === "object"
    && value !== null
    && candidates.has(value);
}
