/**
 * Closed, non-authorizing evidence vocabulary for registry durability.
 *
 * Verification here proves only that one record is internally complete and
 * matches an exact caller policy. Production authority is a separate private
 * composition performed after signature and recovery verification.
 */

export const REGISTRY_DURABILITY_EVIDENCE_SCHEMA =
  "galerina.registry.durability.evidence.v1" as const;

export type RegistryDurabilityEvidenceClass =
  | "FUNCTIONAL_PORTABILITY"
  | "NATIVE_LIVE"
  | "PROCESS_TERMINATION"
  | "CONTROLLED_REBOOT"
  | "CONTROLLED_POWER_LOSS"
  | "PRODUCTION_ADMISSION";

export type RegistryDurabilityCheckStatus = "PASS" | "UNVERIFIED";

export interface RegistryDurabilityChecks {
  readonly controlledPowerLoss: RegistryDurabilityCheckStatus;
  readonly controlledReboot: RegistryDurabilityCheckStatus;
  readonly functionalPortability: RegistryDurabilityCheckStatus;
  readonly nativeLive: RegistryDurabilityCheckStatus;
  readonly processTermination: RegistryDurabilityCheckStatus;
  readonly productionAdmission: RegistryDurabilityCheckStatus;
}

export interface RegistryDurabilityEvidenceRecord {
  readonly schema: typeof REGISTRY_DURABILITY_EVIDENCE_SCHEMA;
  readonly evidenceClass: RegistryDurabilityEvidenceClass;
  readonly evidenceId: string;
  readonly repositoryCommit: string;
  readonly platform: "windows" | "linux" | "macos";
  readonly architecture: "x86_64" | "aarch64";
  readonly operatingSystem:
    | "windows-10"
    | "windows-11"
    | "windows-server-2022"
    | "ubuntu"
    | "debian"
    | "fedora"
    | "linuxmint"
    | "macos";
  readonly filesystem: string;
  readonly storageProfileDigest: string;
  readonly implementationDigest: string;
  readonly boundaryIds: readonly string[];
  readonly checks: RegistryDurabilityChecks;
  readonly authenticated: false;
  readonly authorityReleased: false;
  readonly productionAuthorizing: false;
  readonly verdict: 0;
}

export interface RegistryDurabilityEvidencePolicy {
  readonly expectedRepositoryCommit: string;
  readonly expectedPlatform: RegistryDurabilityEvidenceRecord["platform"];
  readonly expectedArchitecture:
    RegistryDurabilityEvidenceRecord["architecture"];
  readonly expectedOperatingSystem:
    RegistryDurabilityEvidenceRecord["operatingSystem"];
  readonly requiredBoundaryIds: readonly string[];
}

export type VerifiedRegistryDurabilityEvidence =
  RegistryDurabilityEvidenceRecord;

export class RegistryDurabilityEvidenceError extends TypeError {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RegistryDurabilityEvidenceError";
    this.code = code;
  }
}

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const FILESYSTEM = /^[a-z0-9][a-z0-9.-]{1,31}$/;
const BOUNDARY_ID = /^[A-Z][A-Z0-9_]{2,63}$/;
const MAX_BOUNDARIES = 64;

const EVIDENCE_KEYS = Object.freeze([
  "architecture",
  "authenticated",
  "authorityReleased",
  "boundaryIds",
  "checks",
  "evidenceClass",
  "evidenceId",
  "filesystem",
  "implementationDigest",
  "operatingSystem",
  "platform",
  "productionAuthorizing",
  "repositoryCommit",
  "schema",
  "storageProfileDigest",
  "verdict",
]);

const CHECK_KEYS = Object.freeze([
  "controlledPowerLoss",
  "controlledReboot",
  "functionalPortability",
  "nativeLive",
  "processTermination",
  "productionAdmission",
]);

const POLICY_KEYS = Object.freeze([
  "expectedArchitecture",
  "expectedOperatingSystem",
  "expectedPlatform",
  "expectedRepositoryCommit",
  "requiredBoundaryIds",
]);

function freezeCheckKeys(
  ...keys: (keyof RegistryDurabilityChecks)[]
): readonly (keyof RegistryDurabilityChecks)[] {
  return Object.freeze(keys);
}

const CLASS_CHECKS: Readonly<Record<
  RegistryDurabilityEvidenceClass,
  readonly (keyof RegistryDurabilityChecks)[]
>> = Object.freeze({
  FUNCTIONAL_PORTABILITY: freezeCheckKeys("functionalPortability"),
  NATIVE_LIVE: freezeCheckKeys("functionalPortability", "nativeLive"),
  PROCESS_TERMINATION: freezeCheckKeys(
    "functionalPortability",
    "nativeLive",
    "processTermination",
  ),
  CONTROLLED_REBOOT: freezeCheckKeys(
    "functionalPortability",
    "nativeLive",
    "processTermination",
    "controlledReboot",
  ),
  CONTROLLED_POWER_LOSS: freezeCheckKeys(
    "functionalPortability",
    "nativeLive",
    "processTermination",
    "controlledReboot",
    "controlledPowerLoss",
  ),
  PRODUCTION_ADMISSION: CHECK_KEYS as readonly (keyof RegistryDurabilityChecks)[],
});

const OPERATING_SYSTEM_PLATFORM = Object.freeze({
  "windows-10": "windows",
  "windows-11": "windows",
  "windows-server-2022": "windows",
  ubuntu: "linux",
  debian: "linux",
  fedora: "linux",
  linuxmint: "linux",
  macos: "macos",
} as const);

const PLATFORM_FILESYSTEMS = Object.freeze({
  windows: Object.freeze(["ntfs", "refs"]),
  linux: Object.freeze(["btrfs", "ext4", "xfs"]),
  macos: Object.freeze(["apfs"]),
});

const verifiedEvidence = new WeakSet<object>();

function refuse(code: string): never {
  throw new RegistryDurabilityEvidenceError(code);
}

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

function canonicalBoundaries(value: unknown): value is readonly string[] {
  if (
    !Array.isArray(value)
    || value.length > MAX_BOUNDARIES
    || Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return false;
  }
  let prior = "";
  for (const boundaryId of value) {
    if (
      typeof boundaryId !== "string"
      || !BOUNDARY_ID.test(boundaryId)
      || boundaryId <= prior
    ) {
      return false;
    }
    prior = boundaryId;
  }
  return true;
}

function isEvidenceClass(
  value: unknown,
): value is RegistryDurabilityEvidenceClass {
  return typeof value === "string"
    && Object.prototype.hasOwnProperty.call(CLASS_CHECKS, value);
}

function evidenceShapeIsValid(
  value: unknown,
): value is RegistryDurabilityEvidenceRecord {
  if (
    typeof value !== "object"
    || value === null
    || !hasPlainDataShape(value, EVIDENCE_KEYS)
  ) {
    return false;
  }
  const record = value as RegistryDurabilityEvidenceRecord;
  if (
    record.schema !== REGISTRY_DURABILITY_EVIDENCE_SCHEMA
    || !isEvidenceClass(record.evidenceClass)
    || !DIGEST.test(record.evidenceId)
    || !COMMIT.test(record.repositoryCommit)
    || !(record.platform in PLATFORM_FILESYSTEMS)
    || (record.architecture !== "x86_64" && record.architecture !== "aarch64")
    || !(record.operatingSystem in OPERATING_SYSTEM_PLATFORM)
    || OPERATING_SYSTEM_PLATFORM[record.operatingSystem] !== record.platform
    || !FILESYSTEM.test(record.filesystem)
    || !PLATFORM_FILESYSTEMS[record.platform].includes(record.filesystem)
    || !DIGEST.test(record.storageProfileDigest)
    || !DIGEST.test(record.implementationDigest)
    || !canonicalBoundaries(record.boundaryIds)
    || record.authenticated !== false
    || record.authorityReleased !== false
    || record.productionAuthorizing !== false
    || record.verdict !== 0
  ) {
    return false;
  }
  return typeof record.checks === "object"
    && record.checks !== null
    && hasPlainDataShape(record.checks, CHECK_KEYS)
    && Object.values(record.checks).every(
      (status) => status === "PASS" || status === "UNVERIFIED",
    );
}

function policyShapeIsValid(
  value: unknown,
): value is RegistryDurabilityEvidencePolicy {
  if (
    typeof value !== "object"
    || value === null
    || !hasPlainDataShape(value, POLICY_KEYS)
  ) {
    return false;
  }
  const policy = value as RegistryDurabilityEvidencePolicy;
  return COMMIT.test(policy.expectedRepositoryCommit)
    && policy.expectedPlatform in PLATFORM_FILESYSTEMS
    && (
      policy.expectedArchitecture === "x86_64"
      || policy.expectedArchitecture === "aarch64"
    )
    && policy.expectedOperatingSystem in OPERATING_SYSTEM_PLATFORM
    && OPERATING_SYSTEM_PLATFORM[policy.expectedOperatingSystem]
      === policy.expectedPlatform
    && canonicalBoundaries(policy.requiredBoundaryIds);
}

function checkClaimCeiling(record: RegistryDurabilityEvidenceRecord): void {
  const admitted = CLASS_CHECKS[record.evidenceClass];
  for (const key of CHECK_KEYS as readonly (keyof RegistryDurabilityChecks)[]) {
    const status = record.checks[key];
    if (!admitted.includes(key) && status === "PASS") {
      refuse("REGISTRY_DURABILITY_EVIDENCE_CLASS_ESCALATION_REFUSED");
    }
    if (admitted.includes(key) && status !== "PASS") {
      refuse("REGISTRY_DURABILITY_EVIDENCE_MALFORMED_REFUSED");
    }
  }
}

function boundariesEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

export function verifyRegistryDurabilityEvidence(
  evidenceValue: unknown,
  policyValue: RegistryDurabilityEvidencePolicy,
): VerifiedRegistryDurabilityEvidence {
  try {
    if (!evidenceShapeIsValid(evidenceValue)) {
      refuse("REGISTRY_DURABILITY_EVIDENCE_MALFORMED_REFUSED");
    }
    if (!policyShapeIsValid(policyValue)) {
      refuse("REGISTRY_DURABILITY_EVIDENCE_POLICY_MALFORMED_REFUSED");
    }
    checkClaimCeiling(evidenceValue);
    if (
      evidenceValue.repositoryCommit !== policyValue.expectedRepositoryCommit
      || evidenceValue.platform !== policyValue.expectedPlatform
      || evidenceValue.architecture !== policyValue.expectedArchitecture
      || evidenceValue.operatingSystem !== policyValue.expectedOperatingSystem
      || !boundariesEqual(
        evidenceValue.boundaryIds,
        policyValue.requiredBoundaryIds,
      )
    ) {
      refuse("REGISTRY_DURABILITY_EVIDENCE_POLICY_MISMATCH_REFUSED");
    }
    const ownedChecks = Object.freeze({ ...evidenceValue.checks });
    const ownedBoundaries = Object.freeze([...evidenceValue.boundaryIds]);
    const verified = Object.freeze({
      ...evidenceValue,
      boundaryIds: ownedBoundaries,
      checks: ownedChecks,
    });
    verifiedEvidence.add(verified);
    return verified;
  } catch (error) {
    if (error instanceof RegistryDurabilityEvidenceError) throw error;
    refuse("REGISTRY_DURABILITY_EVIDENCE_MALFORMED_REFUSED");
  }
}

export function isVerifiedRegistryDurabilityEvidence(
  value: unknown,
): value is VerifiedRegistryDurabilityEvidence {
  return typeof value === "object"
    && value !== null
    && verifiedEvidence.has(value);
}
