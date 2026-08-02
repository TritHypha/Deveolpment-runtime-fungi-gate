import { types } from "node:util";

import { canonicalReleaseEvidenceBytes } from "./beta-release-evidence-envelope.mjs";

const STATEMENT_TYPE = "https://in-toto.io/Statement/v1";
const FUNGI_PREDICATE = "https://galerina.dev/attestation/post-slide-fungi-execution/v1";
const HOST_PREDICATE = "https://galerina.dev/attestation/post-slide-host-ownership/v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const PACKAGE = /^galerina-[a-z0-9][a-z0-9-]{1,95}$/u;
const REPLACEMENT = /^[a-z][a-z0-9.-]{2,127}$/u;
const HOST_KINDS = new Set([
  "compatibility-runtime",
  "development-tool",
  "isolated-worker",
  "native-library",
  "os-adapter",
]);
const COMMON_KEYS = Object.freeze([
  "evidenceBundleSha256",
  "expiresAt",
  "issuedAt",
  "ownerPackage",
  "receiptSerial",
  "releaseId",
  "repositoryCommit",
  "sourcePath",
  "sourceSha256",
]);
const FUNGI_KEYS = Object.freeze([
  ...COMMON_KEYS,
  "admissionSha256",
  "compilerSha256",
  "decisionGraphSha256",
  "frontendReceiptSha256",
  "girSha256",
  "leaseReceiptSha256",
  "objectSha256",
  "platformEvidenceSha256",
  "policySha256",
  "slideContractSha256",
  "targetSha256",
  "terminalReceiptSha256",
  "verifierSha256",
]);
const HOST_KEYS = Object.freeze([
  ...COMMON_KEYS,
  "boundaryKind",
  "capabilityPolicySha256",
  "cleanupEvidenceSha256",
  "disposition",
  "isolationEvidenceSha256",
  "leastAuthorityPolicySha256",
  "ownershipReceiptSha256",
  "platformEvidenceSha256",
  "replacementId",
  "targetSha256",
]);

export const POST_SLIDE_FUNGI_INPUT_FIELDS = FUNGI_KEYS;
export const POST_SLIDE_HOST_INPUT_FIELDS = HOST_KEYS;

function refuse(code) {
  throw new Error(code);
}

function exactObject(value, keys, code) {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || types.isProxy(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) refuse(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  const expected = [...keys].sort();
  if (
    actual.some((key) => typeof key !== "string")
    || actual.length !== expected.length
    || actual.map(String).sort().some((key, index) => key !== expected[index])
    || Object.values(descriptors).some((descriptor) => (
      descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ))
  ) refuse(code);
  return value;
}

function exactArray(value, length, code) {
  if (!Array.isArray(value) || types.isProxy(value) || value.length !== length) refuse(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== length + 1 || descriptors.length?.value !== length) {
    refuse(code);
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined
      || descriptor.enumerable !== true
      || !("value" in descriptor)
      || descriptor.get !== undefined
      || descriptor.set !== undefined
    ) refuse(code);
  }
  return value;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function canonicalInstant(value, code) {
  if (typeof value !== "string") refuse(code);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) refuse(code);
  return milliseconds;
}

function validateCommon(value, keys, code) {
  exactObject(value, keys, code);
  const sourcePrefix = `packages-galerina/${value.ownerPackage}/`;
  const sourceSegments = typeof value.sourcePath === "string"
    ? value.sourcePath.split("/")
    : [];
  if (
    value.releaseId !== "beta-v1"
    || !COMMIT.test(value.repositoryCommit)
    || !Number.isSafeInteger(value.receiptSerial)
    || value.receiptSerial < 1
    || !PACKAGE.test(value.ownerPackage)
    || typeof value.sourcePath !== "string"
    || !value.sourcePath.startsWith(sourcePrefix)
    || value.sourcePath !== value.sourcePath.normalize("NFC")
    || value.sourcePath.includes("\\")
    || sourceSegments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
    || !SHA256.test(value.sourceSha256)
    || !SHA256.test(value.evidenceBundleSha256)
  ) refuse(code);
  const issuedAt = canonicalInstant(value.issuedAt, code);
  const expiresAt = canonicalInstant(value.expiresAt, code);
  if (issuedAt >= expiresAt) refuse(code);
}

function allDigests(value, fields, code) {
  for (const field of fields) if (!SHA256.test(value[field])) refuse(code);
}

function subject(name, digest) {
  return [{ name, digest: { sha256: digest } }];
}

function validateStatementShell(statement, predicateType, name, digest, code) {
  exactObject(statement, ["_type", "predicate", "predicateType", "subject"], code);
  exactArray(statement.subject, 1, code);
  const selected = exactObject(statement.subject[0], ["digest", "name"], code);
  const selectedDigest = exactObject(selected.digest, ["sha256"], code);
  if (
    statement._type !== STATEMENT_TYPE
    || statement.predicateType !== predicateType
    || selected.name !== name
    || selectedDigest.sha256 !== digest
  ) refuse(code);
}

function canonicalEqual(actual, expected, code) {
  if (!canonicalReleaseEvidenceBytes(actual).equals(canonicalReleaseEvidenceBytes(expected))) refuse(code);
}

export function deriveFungiExecutionStatement(input) {
  const code = "POST_SLIDE_FUNGI_INPUT_REFUSED";
  validateCommon(input, FUNGI_KEYS, code);
  if (!input.sourcePath.endsWith(".fungi")) refuse(code);
  allDigests(input, [
    "frontendReceiptSha256", "decisionGraphSha256", "compilerSha256",
    "girSha256", "slideContractSha256", "targetSha256", "policySha256",
    "verifierSha256", "objectSha256", "admissionSha256",
    "leaseReceiptSha256", "terminalReceiptSha256", "platformEvidenceSha256",
  ], code);
  return deepFreeze({
    _type: STATEMENT_TYPE,
    subject: subject(
      `galerina/${input.releaseId}/post-slide/fungi/${input.ownerPackage}`,
      input.evidenceBundleSha256,
    ),
    predicateType: FUNGI_PREDICATE,
    predicate: {
      schema: "galerina.post-slide.fungi-execution-predicate.v1",
      ...Object.fromEntries(FUNGI_KEYS.map((key) => [key, input[key]])),
      verificationResult: "PASSED",
      authorityReleased: false,
    },
  });
}

export function validateFungiExecutionStatement(statement, expected) {
  const code = "POST_SLIDE_FUNGI_STATEMENT_REFUSED";
  try {
    const derived = deriveFungiExecutionStatement(expected);
    validateStatementShell(
      statement,
      FUNGI_PREDICATE,
      `galerina/${expected.releaseId}/post-slide/fungi/${expected.ownerPackage}`,
      expected.evidenceBundleSha256,
      code,
    );
    canonicalEqual(statement, derived, code);
    return statement;
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
    refuse(code);
  }
}

export function deriveHostOwnershipStatement(input) {
  const code = "POST_SLIDE_HOST_INPUT_REFUSED";
  validateCommon(input, HOST_KEYS, code);
  allDigests(input, [
    "capabilityPolicySha256", "leastAuthorityPolicySha256", "targetSha256",
    "platformEvidenceSha256", "isolationEvidenceSha256",
    "cleanupEvidenceSha256", "ownershipReceiptSha256",
  ], code);
  if (
    !HOST_KINDS.has(input.boundaryKind)
    || !["retain", "replace"].includes(input.disposition)
    || (input.disposition === "retain" && input.replacementId !== "NONE")
    || (input.disposition === "replace" && !REPLACEMENT.test(input.replacementId))
  ) refuse(code);
  return deepFreeze({
    _type: STATEMENT_TYPE,
    subject: subject(
      `galerina/${input.releaseId}/post-slide/host/${input.ownerPackage}`,
      input.evidenceBundleSha256,
    ),
    predicateType: HOST_PREDICATE,
    predicate: {
      schema: "galerina.post-slide.host-ownership-predicate.v1",
      ...Object.fromEntries(HOST_KEYS.map((key) => [key, input[key]])),
      verificationResult: "PASSED",
      authorityReleased: false,
    },
  });
}

export function validateHostOwnershipStatement(statement, expected) {
  const code = "POST_SLIDE_HOST_STATEMENT_REFUSED";
  try {
    const derived = deriveHostOwnershipStatement(expected);
    validateStatementShell(
      statement,
      HOST_PREDICATE,
      `galerina/${expected.releaseId}/post-slide/host/${expected.ownerPackage}`,
      expected.evidenceBundleSha256,
      code,
    );
    canonicalEqual(statement, derived, code);
    return statement;
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
    refuse(code);
  }
}
