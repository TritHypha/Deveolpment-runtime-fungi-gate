import { createHash } from "node:crypto";

export const MAX_REQUIREMENT_VALIDATOR_AUTHORITY_ROWS = 256;
export const MAX_REQUIREMENT_VALIDATOR_AUTHORITY_BYTES = 1_048_576;

const REGISTRY_DIGEST_DOMAIN = "galerina.requirement-validator-authority.registry.v1";
const MAX_FIELD_CHARS = 512;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const SEMVER_RE = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const SOURCE_BUILD_RE = /^git:[0-9a-f]{40,64}$/;
const SOURCE_UNIT_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,126}[A-Za-z0-9])?$/;
const LOCAL_FLOW_RE = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const TYPE_RE = /^[A-Za-z_][A-Za-z0-9_.<>, ]{0,255}$/;
const PROFILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const INSTANT_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/;

export const REQUIREMENT_TAINT_CLASSES = Object.freeze([
  "declared.untrusted",
  "environment.input",
  "process.input",
  "web.request",
  "web.storage",
] as const);

export type RequirementTaintClass = typeof REQUIREMENT_TAINT_CLASSES[number];

const TAINT_CLASS_SET: ReadonlySet<string> = new Set(REQUIREMENT_TAINT_CLASSES);

export interface RequirementValidatorAuthorityRow {
  readonly authorityVersion: string;
  readonly qualifiedFlowIdentity: string;
  readonly sourceBuild: string;
  readonly inputType: string;
  readonly taintClasses: readonly RequirementTaintClass[];
  readonly outputType: "Verdict";
  readonly observedEffect: "EffectFree";
  readonly checkedProfile: string;
  readonly checkedDigest: string;
  readonly validFrom: string;
  readonly expiresAt: string;
}

export interface RequirementValidatorAuthorityLimits {
  readonly maxRows?: number;
  readonly maxCanonicalBytes?: number;
}

export type RequirementValidatorAuthorityRefusalReason =
  | "INVALID_LIMITS"
  | "EMPTY_REGISTRY"
  | "ROW_LIMIT_EXCEEDED"
  | "BYTE_LIMIT_EXCEEDED"
  | "MALFORMED_ROW"
  | "DUPLICATE_IDENTITY"
  | "REGISTRY_REFUSED"
  | "TRUST_ANCHOR_INVALID"
  | "REGISTRY_DIGEST_MISMATCH"
  | "REQUEST_INVALID"
  | "EFFECTFUL"
  | "NO_MATCH"
  | "NOT_YET_VALID"
  | "EXPIRED";

export interface RequirementValidatorAuthorityRefused {
  readonly state: "REFUSED";
  readonly reason: RequirementValidatorAuthorityRefusalReason;
}

export interface StructurallyValidRequirementValidatorAuthorityRegistry {
  readonly state: "STRUCTURALLY_VALID";
  readonly rows: readonly RequirementValidatorAuthorityRow[];
  readonly digest: string;
  readonly canonicalBytes: number;
}

export type RequirementValidatorAuthorityRegistry =
  | StructurallyValidRequirementValidatorAuthorityRegistry
  | RequirementValidatorAuthorityRefused;

export interface RequirementValidatorAuthorityRequest {
  readonly localFlowName: string;
  readonly inputType: string;
  readonly taintClasses: readonly RequirementTaintClass[];
  readonly outputType: string;
  readonly observedEffects: readonly string[];
  readonly checkedDigest: string;
}

export interface RequirementValidatorAuthorityContext {
  readonly expectedRegistryDigest: string;
  readonly canonicalSourceUnitId: string;
  readonly sourceBuild: string;
  readonly checkedProfile: string;
  readonly acceptedAuthorityVersion: string;
  readonly comparisonTime: string;
}

export interface MatchedRequirementValidatorAuthority {
  readonly state: "MATCHED";
  readonly qualifiedFlowIdentity: string;
  readonly registryDigest: string;
  readonly authorityVersion: string;
}

export type RequirementValidatorAuthorityResult =
  | MatchedRequirementValidatorAuthority
  | RequirementValidatorAuthorityRefused;

function refused(
  reason: RequirementValidatorAuthorityRefusalReason,
): RequirementValidatorAuthorityRefused {
  return Object.freeze({ state: "REFUSED", reason });
}

function isBoundedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_FIELD_CHARS;
}

function isCanonicalInstant(value: unknown): value is string {
  if (!isBoundedString(value) || !INSTANT_RE.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}

function canonicalTaintClasses(value: unknown): readonly RequirementTaintClass[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > REQUIREMENT_TAINT_CLASSES.length) {
    return undefined;
  }
  if (!value.every((entry) => typeof entry === "string" && TAINT_CLASS_SET.has(entry))) {
    return undefined;
  }
  const unique = new Set(value as RequirementTaintClass[]);
  if (unique.size !== value.length) return undefined;
  return Object.freeze([...unique].sort() as RequirementTaintClass[]);
}

function canonicalRow(value: unknown): RequirementValidatorAuthorityRow | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const taintClasses = canonicalTaintClasses(row.taintClasses);
  if (
    !isBoundedString(row.authorityVersion) || !SEMVER_RE.test(row.authorityVersion)
    || !isBoundedString(row.qualifiedFlowIdentity)
    || !isBoundedString(row.sourceBuild) || !SOURCE_BUILD_RE.test(row.sourceBuild)
    || !isBoundedString(row.inputType) || !TYPE_RE.test(row.inputType)
    || taintClasses === undefined
    || row.outputType !== "Verdict"
    || row.observedEffect !== "EffectFree"
    || !isBoundedString(row.checkedProfile) || !PROFILE_RE.test(row.checkedProfile)
    || !isBoundedString(row.checkedDigest) || !DIGEST_RE.test(row.checkedDigest)
    || !isCanonicalInstant(row.validFrom)
    || !isCanonicalInstant(row.expiresAt)
    || Date.parse(row.validFrom) >= Date.parse(row.expiresAt)
  ) {
    return undefined;
  }

  const separator = row.qualifiedFlowIdentity.indexOf("::");
  if (
    separator <= 0
    || separator !== row.qualifiedFlowIdentity.lastIndexOf("::")
    || !SOURCE_UNIT_RE.test(row.qualifiedFlowIdentity.slice(0, separator))
    || !LOCAL_FLOW_RE.test(row.qualifiedFlowIdentity.slice(separator + 2))
  ) {
    return undefined;
  }

  return Object.freeze({
    authorityVersion: row.authorityVersion,
    qualifiedFlowIdentity: row.qualifiedFlowIdentity,
    sourceBuild: row.sourceBuild,
    inputType: row.inputType,
    taintClasses,
    outputType: "Verdict",
    observedEffect: "EffectFree",
    checkedProfile: row.checkedProfile,
    checkedDigest: row.checkedDigest,
    validFrom: row.validFrom,
    expiresAt: row.expiresAt,
  });
}

function canonicalRegistryRows(rows: readonly RequirementValidatorAuthorityRow[]): string {
  return JSON.stringify(rows.map((row) => ({
    authorityVersion: row.authorityVersion,
    qualifiedFlowIdentity: row.qualifiedFlowIdentity,
    sourceBuild: row.sourceBuild,
    inputType: row.inputType,
    taintClasses: row.taintClasses,
    outputType: row.outputType,
    observedEffect: row.observedEffect,
    checkedProfile: row.checkedProfile,
    checkedDigest: row.checkedDigest,
    validFrom: row.validFrom,
    expiresAt: row.expiresAt,
  })));
}

function digestRegistry(canonicalRows: string): string {
  return `sha256:${createHash("sha256")
    .update(REGISTRY_DIGEST_DOMAIN, "utf8")
    .update("\0", "utf8")
    .update(canonicalRows, "utf8")
    .digest("hex")}`;
}

/**
 * Compare canonical ASCII field values by code unit, rather than by locale.
 * Registry order is hashed, so collation must not depend on host settings.
 */
function compareCanonicalStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validLimit(value: number | undefined, hardMaximum: number): boolean {
  return value === undefined
    || (Number.isSafeInteger(value) && value > 0 && value <= hardMaximum);
}

export function createRequirementValidatorAuthorityRegistry(
  rows: readonly RequirementValidatorAuthorityRow[],
  limits: RequirementValidatorAuthorityLimits = {},
): RequirementValidatorAuthorityRegistry {
  if (
    typeof limits !== "object" || limits === null
    || !validLimit(limits.maxRows, MAX_REQUIREMENT_VALIDATOR_AUTHORITY_ROWS)
    || !validLimit(limits.maxCanonicalBytes, MAX_REQUIREMENT_VALIDATOR_AUTHORITY_BYTES)
  ) {
    return refused("INVALID_LIMITS");
  }
  if (!Array.isArray(rows) || rows.length === 0) return refused("EMPTY_REGISTRY");
  const maxRows = limits.maxRows ?? MAX_REQUIREMENT_VALIDATOR_AUTHORITY_ROWS;
  if (rows.length > maxRows) return refused("ROW_LIMIT_EXCEEDED");

  const accepted: RequirementValidatorAuthorityRow[] = [];
  for (const row of rows) {
    const canonical = canonicalRow(row);
    if (canonical === undefined) return refused("MALFORMED_ROW");
    accepted.push(canonical);
  }
  accepted.sort((left, right) =>
    compareCanonicalStrings(left.qualifiedFlowIdentity, right.qualifiedFlowIdentity)
    || compareCanonicalStrings(left.authorityVersion, right.authorityVersion)
    || compareCanonicalStrings(left.checkedDigest, right.checkedDigest));

  for (let index = 1; index < accepted.length; index += 1) {
    if (accepted[index - 1]?.qualifiedFlowIdentity === accepted[index]?.qualifiedFlowIdentity) {
      return refused("DUPLICATE_IDENTITY");
    }
  }

  const frozenRows = Object.freeze(accepted);
  const canonicalRows = canonicalRegistryRows(frozenRows);
  const canonicalBytes = new TextEncoder().encode(canonicalRows).byteLength;
  if (canonicalBytes > (limits.maxCanonicalBytes ?? MAX_REQUIREMENT_VALIDATOR_AUTHORITY_BYTES)) {
    return refused("BYTE_LIMIT_EXCEEDED");
  }

  return Object.freeze({
    state: "STRUCTURALLY_VALID",
    rows: frozenRows,
    digest: digestRegistry(canonicalRows),
    canonicalBytes,
  });
}

function isValidContext(value: unknown): value is RequirementValidatorAuthorityContext {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const context = value as Record<string, unknown>;
  return isBoundedString(context.expectedRegistryDigest) && DIGEST_RE.test(context.expectedRegistryDigest)
    && isBoundedString(context.canonicalSourceUnitId) && SOURCE_UNIT_RE.test(context.canonicalSourceUnitId)
    && isBoundedString(context.sourceBuild) && SOURCE_BUILD_RE.test(context.sourceBuild)
    && isBoundedString(context.checkedProfile) && PROFILE_RE.test(context.checkedProfile)
    && isBoundedString(context.acceptedAuthorityVersion) && SEMVER_RE.test(context.acceptedAuthorityVersion)
    && isCanonicalInstant(context.comparisonTime);
}

function canonicalRequest(value: unknown): RequirementValidatorAuthorityRequest | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const request = value as Record<string, unknown>;
  const taintClasses = canonicalTaintClasses(request.taintClasses);
  if (
    !isBoundedString(request.localFlowName) || !LOCAL_FLOW_RE.test(request.localFlowName)
    || !isBoundedString(request.inputType) || !TYPE_RE.test(request.inputType)
    || taintClasses === undefined
    || !isBoundedString(request.outputType) || !TYPE_RE.test(request.outputType)
    || !Array.isArray(request.observedEffects)
    || request.observedEffects.length > 256
    || !request.observedEffects.every((effect) => isBoundedString(effect))
    || !isBoundedString(request.checkedDigest) || !DIGEST_RE.test(request.checkedDigest)
  ) {
    return undefined;
  }
  return Object.freeze({
    localFlowName: request.localFlowName,
    inputType: request.inputType,
    taintClasses,
    outputType: request.outputType,
    observedEffects: Object.freeze([...request.observedEffects] as string[]),
    checkedDigest: request.checkedDigest,
  });
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function verifyRequirementValidatorAuthority(
  registry: RequirementValidatorAuthorityRegistry,
  requestValue: RequirementValidatorAuthorityRequest,
  contextValue: RequirementValidatorAuthorityContext,
): RequirementValidatorAuthorityResult {
  if (registry.state !== "STRUCTURALLY_VALID") return refused("REGISTRY_REFUSED");
  if (!isValidContext(contextValue)) return refused("TRUST_ANCHOR_INVALID");
  if (registry.digest !== contextValue.expectedRegistryDigest) {
    return refused("REGISTRY_DIGEST_MISMATCH");
  }
  const request = canonicalRequest(requestValue);
  if (request === undefined) return refused("REQUEST_INVALID");
  if (request.observedEffects.length !== 0) return refused("EFFECTFUL");

  const qualifiedFlowIdentity = `${contextValue.canonicalSourceUnitId}::${request.localFlowName}`;
  const row = registry.rows.find((candidate) =>
    candidate.qualifiedFlowIdentity === qualifiedFlowIdentity
    && candidate.sourceBuild === contextValue.sourceBuild
    && candidate.inputType === request.inputType
    && sameStrings(candidate.taintClasses, request.taintClasses)
    && candidate.outputType === request.outputType
    && candidate.observedEffect === "EffectFree"
    && candidate.checkedProfile === contextValue.checkedProfile
    && candidate.checkedDigest === request.checkedDigest
    && candidate.authorityVersion === contextValue.acceptedAuthorityVersion);
  if (row === undefined) return refused("NO_MATCH");

  const comparisonMilliseconds = Date.parse(contextValue.comparisonTime);
  if (comparisonMilliseconds < Date.parse(row.validFrom)) return refused("NOT_YET_VALID");
  if (comparisonMilliseconds >= Date.parse(row.expiresAt)) return refused("EXPIRED");

  return Object.freeze({
    state: "MATCHED",
    qualifiedFlowIdentity,
    registryDigest: registry.digest,
    authorityVersion: row.authorityVersion,
  });
}
