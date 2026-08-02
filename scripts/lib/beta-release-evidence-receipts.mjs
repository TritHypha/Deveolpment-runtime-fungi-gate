import { types } from "node:util";

import { canonicalReleaseEvidenceBytes } from "./beta-release-evidence-envelope.mjs";

const COMMIT = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const IDENTIFIER = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const OPERATING_SYSTEMS = Object.freeze([
  "windows-10",
  "windows-11",
  "ubuntu",
  "debian",
  "fedora",
  "linuxmint",
  "macos",
]);
const STATEMENT_TYPE = "https://in-toto.io/Statement/v1";
const DURABILITY_PREDICATE =
  "https://galerina.dev/attestation/registry-durability/v1";
const REPOSITORY_PREDICATE =
  "https://galerina.dev/attestation/repository-fixed-point/v1";

export const RELEASE_REPOSITORY_CHECKS = deepFreeze([
  {
    id: "phase-close",
    command: ["node", "scripts/run-phase-close.mjs", "--tier", "phase-close", "--json"],
  },
  {
    id: "phase-close-exhaustive",
    command: ["node", "scripts/run-phase-close.mjs", "--tier", "exhaustive", "--json"],
  },
  {
    id: "graph-all",
    command: ["node", "scripts/graph-all.mjs", "--quiet", "--check"],
  },
  {
    id: "generator-contract",
    command: ["node", "scripts/audit-generator-contract.mjs", "--tier", "exhaustive"],
  },
  {
    id: "release-build",
    command: ["node", "scripts/run-all-tests.cjs"],
  },
  {
    id: "security-scan",
    command: ["node", "scripts/audit-production-blockers.mjs"],
  },
]);

const DURABILITY_INPUT_KEYS = Object.freeze([
  "acceptedCheckpointSha256",
  "controlledPowerLossSha256",
  "controlledRebootSha256",
  "evidenceBundleSha256",
  "implementationSha256",
  "operatingSystem",
  "platform",
  "releaseId",
  "repositoryCommit",
]);
const PLATFORM_KEYS = Object.freeze([
  "architecture",
  "distribution",
  "distributionVersion",
  "os",
]);
const REPOSITORY_INPUT_KEYS = Object.freeze([
  "checks",
  "releaseId",
  "repositoryCommit",
  "trackedTreeSha256",
]);
const REPOSITORY_EXPECTED_KEYS = Object.freeze([
  "releaseId",
  "repositoryCommit",
  "trackedTreeSha256",
]);
const CHECK_KEYS = Object.freeze([
  "command",
  "exitCode",
  "id",
  "stderrSha256",
  "stdoutSha256",
]);
const STATEMENT_KEYS = Object.freeze(["_type", "predicate", "predicateType", "subject"]);
const SUBJECT_KEYS = Object.freeze(["digest", "name"]);

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
  ) {
    refuse(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (
    actual.some((key) => typeof key !== "string")
    || actual.length !== keys.length
    || actual.map(String).sort().some((key, index) => key !== keys[index])
  ) {
    refuse(code);
  }
  if (Object.values(descriptors).some((descriptor) => (
    descriptor.enumerable !== true
    || !("value" in descriptor)
    || descriptor.get !== undefined
    || descriptor.set !== undefined
  ))) {
    refuse(code);
  }
  return value;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

function exactArray(value, length, code) {
  if (!Array.isArray(value) || types.isProxy(value) || value.length !== length) {
    refuse(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== length + 1
    || descriptors.length?.value !== length
  ) {
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
    ) {
      refuse(code);
    }
  }
  return value;
}

function validateReleaseIdentity(value, code) {
  if (value.releaseId !== "beta-v1" || !COMMIT.test(value.repositoryCommit)) {
    refuse(code);
  }
}

function validatePlatform(value, code) {
  exactObject(value, PLATFORM_KEYS, code);
  if (
    !["win32", "linux", "darwin"].includes(value.os)
    || !["x64", "arm64"].includes(value.architecture)
    || !IDENTIFIER.test(value.distribution)
    || typeof value.distributionVersion !== "string"
    || value.distributionVersion.length < 1
    || value.distributionVersion.length > 128
    || value.distributionVersion !== value.distributionVersion.normalize("NFC")
  ) {
    refuse(code);
  }
}

function statementSubject(name, digest) {
  return [{ name, digest: { sha256: digest } }];
}

function validateStatementShell(statement, predicateType, name, digest, code) {
  exactObject(statement, STATEMENT_KEYS, code);
  exactArray(statement.subject, 1, code);
  const subject = exactObject(statement.subject[0], SUBJECT_KEYS, code);
  const subjectDigest = exactObject(subject.digest, ["sha256"], code);
  if (
    statement._type !== STATEMENT_TYPE
    || statement.predicateType !== predicateType
    || subject.name !== name
    || subjectDigest.sha256 !== digest
  ) {
    refuse(code);
  }
}

function canonicalEqual(actual, expected, code) {
  const actualBytes = canonicalReleaseEvidenceBytes(actual);
  const expectedBytes = canonicalReleaseEvidenceBytes(expected);
  if (!actualBytes.equals(expectedBytes)) refuse(code);
}

export function deriveDurabilityStatement(input) {
  const code = "RELEASE_DURABILITY_INPUT_MALFORMED";
  exactObject(input, DURABILITY_INPUT_KEYS, code);
  validateReleaseIdentity(input, code);
  validatePlatform(input.platform, code);
  if (
    !OPERATING_SYSTEMS.includes(input.operatingSystem)
    || !SHA256.test(input.evidenceBundleSha256)
    || !SHA256.test(input.implementationSha256)
    || !SHA256.test(input.acceptedCheckpointSha256)
    || !SHA256.test(input.controlledRebootSha256)
    || !SHA256.test(input.controlledPowerLossSha256)
  ) {
    refuse(code);
  }
  return deepFreeze({
    _type: STATEMENT_TYPE,
    subject: statementSubject(
      `galerina/${input.releaseId}/durability/${input.operatingSystem}`,
      input.evidenceBundleSha256,
    ),
    predicateType: DURABILITY_PREDICATE,
    predicate: {
      schema: "galerina.registry.durability-predicate.v1",
      releaseId: input.releaseId,
      operatingSystem: input.operatingSystem,
      platform: { ...input.platform },
      repositoryCommit: input.repositoryCommit,
      evidenceBundleSha256: input.evidenceBundleSha256,
      implementationSha256: input.implementationSha256,
      acceptedCheckpointSha256: input.acceptedCheckpointSha256,
      controlledRebootSha256: input.controlledRebootSha256,
      controlledPowerLossSha256: input.controlledPowerLossSha256,
      evidenceClass: "PRODUCTION_ADMISSION",
    },
  });
}

export function validateDurabilityStatement(statement, expected) {
  const code = "RELEASE_DURABILITY_STATEMENT_REFUSED";
  let derived;
  try {
    derived = deriveDurabilityStatement(expected);
    validateStatementShell(
      statement,
      DURABILITY_PREDICATE,
      `galerina/${expected.releaseId}/durability/${expected.operatingSystem}`,
      expected.evidenceBundleSha256,
      code,
    );
    canonicalEqual(statement, derived, code);
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
    refuse(code);
  }
  return statement;
}

function validateRepositoryCheck(check, definition, code) {
  exactObject(check, CHECK_KEYS, code);
  exactArray(check.command, definition.command.length, code);
  if (
    check.id !== definition.id
    || check.exitCode !== 0
    || !SHA256.test(check.stdoutSha256)
    || !SHA256.test(check.stderrSha256)
    || check.command.some((part, index) => part !== definition.command[index])
  ) {
    refuse(code);
  }
}

export function deriveRepositoryStatement(input) {
  const code = "RELEASE_REPOSITORY_INPUT_REFUSED";
  exactObject(input, REPOSITORY_INPUT_KEYS, code);
  validateReleaseIdentity(input, code);
  if (!SHA256.test(input.trackedTreeSha256)) refuse(code);
  exactArray(input.checks, RELEASE_REPOSITORY_CHECKS.length, code);
  input.checks.forEach((check, index) => {
    validateRepositoryCheck(check, RELEASE_REPOSITORY_CHECKS[index], code);
  });
  return deepFreeze({
    _type: STATEMENT_TYPE,
    subject: statementSubject(
      `galerina/${input.releaseId}/tracked-tree`,
      input.trackedTreeSha256,
    ),
    predicateType: REPOSITORY_PREDICATE,
    predicate: {
      schema: "galerina.beta-v1.repository-fixed-point-predicate.v1",
      releaseId: input.releaseId,
      repositoryCommit: input.repositoryCommit,
      trackedTreeSha256: input.trackedTreeSha256,
      checks: input.checks.map((check) => ({
        id: check.id,
        command: [...check.command],
        exitCode: check.exitCode,
        stdoutSha256: check.stdoutSha256,
        stderrSha256: check.stderrSha256,
      })),
    },
  });
}

export function validateRepositoryStatement(statement, expected) {
  const code = "RELEASE_REPOSITORY_STATEMENT_REFUSED";
  try {
    exactObject(expected, REPOSITORY_EXPECTED_KEYS, code);
    validateReleaseIdentity(expected, code);
    if (!SHA256.test(expected.trackedTreeSha256)) refuse(code);
    validateStatementShell(
      statement,
      REPOSITORY_PREDICATE,
      `galerina/${expected.releaseId}/tracked-tree`,
      expected.trackedTreeSha256,
      code,
    );
    const predicate = exactObject(
      statement.predicate,
      ["checks", "releaseId", "repositoryCommit", "schema", "trackedTreeSha256"],
      code,
    );
    const derived = deriveRepositoryStatement({
      ...expected,
      checks: predicate.checks,
    });
    canonicalEqual(statement, derived, code);
  } catch (error) {
    if (error instanceof Error && error.message === code) throw error;
    refuse(code);
  }
  return statement;
}
