import {
  PREFLIGHT_OWNERS,
  PREFLIGHT_PROFILE,
  PREFLIGHT_SCHEMA,
  PREFLIGHT_STATUSES,
  PREFLIGHT_TOOL_VERSION,
  PreflightError,
} from "./contracts.mjs";

const STATUS_RANK = Object.freeze({ ALLOW: 0, HOLD: 1, REFUSED: 2, ERROR: 3 });
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;

function refuse(code, message) {
  throw new PreflightError(code, message);
}

function nonempty(value, label) {
  if (typeof value !== "string" || value.length === 0 || /[\r\n\0]/u.test(value)) refuse("ENVELOPE_INVALID", `${label} is malformed`);
  return value;
}

function status(value) {
  if (!PREFLIGHT_STATUSES.includes(value)) refuse("STATUS_INVALID", "preflight status is invalid");
  return value;
}

function locator(value) {
  nonempty(value, "locator");
  if (/^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.includes("\\") || value.includes("..")) {
    refuse("LOCATOR_INVALID", "preflight locators must be bounded and non-absolute");
  }
  return value;
}

function identity(value, ownerKey) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse("IDENTITY_INVALID", `${ownerKey} identity is missing`);
  if (value.logicalKey !== ownerKey || value.root !== "." || value.stale !== false) refuse("IDENTITY_INVALID", `${ownerKey} identity is stale or misbound`);
  if (!COMMIT.test(value.requiredHead) || value.indexedHeadSha !== value.requiredHead) refuse("IDENTITY_INVALID", `${ownerKey} build point is not exact`);
  if (value.probe === null || typeof value.probe !== "object" || Array.isArray(value.probe)) refuse("IDENTITY_INVALID", `${ownerKey} probe is missing`);
  locator(value.probe.filePath);
  nonempty(value.probe.name, "probe name");
  nonempty(value.probe.qualifiedName, "qualified name");
  nonempty(value.probe.label, "probe label");
  return Object.freeze({
    schema: nonempty(value.schema, "identity schema"),
    toolVersion: nonempty(value.toolVersion, "identity tool version"),
    logicalKey: ownerKey,
    declaredProject: nonempty(value.declaredProject, "declared project"),
    project: nonempty(value.project, "project"),
    repository: nonempty(value.repository, "repository"),
    componentScope: locator(value.componentScope),
    root: ".",
    requiredHead: value.requiredHead,
    indexedHeadSha: value.indexedHeadSha,
    stale: false,
    probe: Object.freeze({
      name: value.probe.name,
      qualifiedName: value.probe.qualifiedName,
      filePath: value.probe.filePath,
      label: value.probe.label,
    }),
  });
}

function owner(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse("OWNER_INVALID", "owner envelope is malformed");
  if (!PREFLIGHT_OWNERS.includes(value.ownerKey)) refuse("OWNER_INVALID", "owner key is invalid");
  const ownerStatus = status(value.status);
  if (ownerStatus === "ALLOW" && value.clean !== true) refuse("OWNER_INVALID", "an ALLOW owner must have a clean worktree");
  if (ownerStatus === "ALLOW" && value.identity === null) refuse("IDENTITY_INVALID", "an ALLOW owner requires an exact identity");
  return Object.freeze({
    ownerKey: value.ownerKey,
    status: ownerStatus,
    code: nonempty(value.code, "owner code"),
    clean: value.clean === true,
    identity: value.identity === null ? null : identity(value.identity, value.ownerKey),
  });
}

function check(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse("CHECK_INVALID", "check envelope is malformed");
  if (value.ownerKey !== "shared" && !PREFLIGHT_OWNERS.includes(value.ownerKey)) refuse("CHECK_INVALID", "check owner is invalid");
  const digest = value.digest === undefined ? undefined : nonempty(value.digest, "check digest");
  if (digest !== undefined && !SHA256.test(digest)) refuse("CHECK_INVALID", "check digest is not SHA-256");
  return Object.freeze({
    id: nonempty(value.id, "check id"),
    ownerKey: value.ownerKey,
    status: status(value.status),
    code: nonempty(value.code, "check code"),
    locator: locator(value.locator),
    ...(digest === undefined ? {} : { digest }),
  });
}

function leastAuthority(items) {
  return items.reduce((current, item) => STATUS_RANK[item.status] > STATUS_RANK[current] ? item.status : current, "ALLOW");
}

export function buildPreflightReport({ profile, owners, checks }) {
  if (profile !== PREFLIGHT_PROFILE) refuse("PROFILE_INVALID", `expected ${PREFLIGHT_PROFILE}`);
  if (!Array.isArray(owners) || !Array.isArray(checks)) refuse("ENVELOPE_INVALID", "owners and checks must be arrays");
  const ownerRecords = owners.map(owner);
  if (ownerRecords.length !== PREFLIGHT_OWNERS.length
    || new Set(ownerRecords.map((item) => item.ownerKey)).size !== PREFLIGHT_OWNERS.length
    || PREFLIGHT_OWNERS.some((key) => !ownerRecords.some((item) => item.ownerKey === key))) {
    refuse("OWNER_SET_INVALID", "preflight requires exactly one envelope for every owner");
  }
  const orderedOwners = PREFLIGHT_OWNERS.map((key) => ownerRecords.find((item) => item.ownerKey === key));
  const checkRecords = checks.map(check);
  if (new Set(checkRecords.map((item) => item.id)).size !== checkRecords.length) refuse("CHECK_SET_INVALID", "check identifiers must be unique");
  const overall = leastAuthority([...orderedOwners, ...checkRecords]);
  return Object.freeze({
    schema: PREFLIGHT_SCHEMA,
    toolVersion: PREFLIGHT_TOOL_VERSION,
    profile,
    status: overall,
    owners: Object.freeze(orderedOwners),
    checks: Object.freeze(checkRecords),
    authority: "preflight-only",
    candidatePublished: false,
  });
}

export function runPreflightSelfTest() {
  const makeIdentity = (key) => ({
    schema: "galerina.graph-project-identity.v1", toolVersion: "1.0.0", logicalKey: key,
    declaredProject: key, project: key, repository: key, componentScope: ".", root: ".",
    requiredHead: "a".repeat(40), indexedHeadSha: "a".repeat(40), stale: false,
    probe: { name: "probe", qualifiedName: `${key}.probe`, filePath: `src/${key}.mjs`, label: "Function" },
  });
  const owners = PREFLIGHT_OWNERS.map((ownerKey) => ({ ownerKey, status: "ALLOW", code: "READY", clean: true, identity: makeIdentity(ownerKey) }));
  const green = buildPreflightReport({ profile: PREFLIGHT_PROFILE, owners, checks: [{ id: "control", ownerKey: "shared", status: "ALLOW", code: "READY", locator: "control:green" }] });
  const red = buildPreflightReport({ profile: PREFLIGHT_PROFILE, owners, checks: [{ id: "control", ownerKey: "shared", status: "REFUSED", code: "CONTROL_DENY", locator: "control:red" }] });
  return Object.freeze({ green: green.status, red: red.status, passed: green.status === "ALLOW" && red.status === "REFUSED" });
}
