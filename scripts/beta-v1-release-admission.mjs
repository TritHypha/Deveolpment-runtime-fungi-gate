#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const MAX_FILE_BYTES = 1024 * 1024;
const COMMIT = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const FILE_NAME = /^[a-z0-9][a-z0-9._-]{2,127}\.json$/u;
const REQUIRED_SYSTEMS = Object.freeze([
  "windows-10",
  "windows-11",
  "ubuntu",
  "debian",
  "fedora",
  "linuxmint",
  "macos",
]);
const REQUIRED_ROWS = Object.freeze([
  "npm-binary",
  "workspace-discovery",
  "portable-path-contract",
  "compiler-build",
  "strict-fungi-check",
  "wasm-execution",
]);
const EXPECTED_PLATFORM = Object.freeze({
  "windows-10": Object.freeze({ os: "win32", architectures: ["x64"], distribution: "windows" }),
  "windows-11": Object.freeze({ os: "win32", architectures: ["x64", "arm64"], distribution: "windows" }),
  ubuntu: Object.freeze({ os: "linux", architectures: ["x64", "arm64"], distribution: "ubuntu" }),
  debian: Object.freeze({ os: "linux", architectures: ["x64", "arm64"], distribution: "debian" }),
  fedora: Object.freeze({ os: "linux", architectures: ["x64", "arm64"], distribution: "fedora" }),
  linuxmint: Object.freeze({ os: "linux", architectures: ["x64"], distribution: "linuxmint" }),
  macos: Object.freeze({ os: "darwin", architectures: ["x64", "arm64"], distribution: "macos" }),
});
const POLICY_KEYS = Object.freeze([
  "durabilityProfiles",
  "functional",
  "minimumProductionDurabilityProfiles",
  "releaseId",
  "repositoryEvidence",
  "schema",
  "targetRepositoryCommit",
]);
const POLICY_ROW_KEYS = Object.freeze(["operatingSystem", "receiptFile", "sha256"]);
const FUNCTIONAL_KEYS = Object.freeze([
  "authenticated",
  "authorityReleased",
  "cleanWorkingTree",
  "criticalWarnings",
  "evidence",
  "evidenceClass",
  "operatingSystem",
  "platform",
  "productionAuthorizing",
  "repositoryCommit",
  "runnerClass",
  "schema",
  "status",
  "verdict",
]);
const PLATFORM_KEYS = Object.freeze(["architecture", "distribution", "nodeVersion", "os"]);
const DISTRIBUTION_KEYS = Object.freeze(["id", "version"]);
const DURABILITY_KEYS = Object.freeze([
  "acceptedCheckpointDigest",
  "authenticated",
  "authorityReleased",
  "evidenceClass",
  "evidenceId",
  "implementationDigest",
  "operatingSystem",
  "productionAuthorizing",
  "repositoryCommit",
  "schema",
]);
const REPOSITORY_KEYS = Object.freeze([
  "authenticated",
  "authorityReleased",
  "failedChecks",
  "generatorAll",
  "graphAll",
  "phaseClose",
  "phaseCloseExhaustive",
  "productionAuthorizing",
  "releaseBuild",
  "repositoryCommit",
  "schema",
  "securityScan",
  "skippedChecks",
]);

function refuse(code) {
  throw new Error(code);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactObject(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse(code);
  const actual = Object.keys(value).sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== keys[index])) {
    refuse(code);
  }
  return value;
}

function readStableDirectFile(path, parentDirectory) {
  const parent = realpathSync(parentDirectory);
  const candidate = resolve(path);
  if (dirname(candidate) !== parent) refuse("BETA_RELEASE_PATH_SCOPE_REFUSED");
  let before;
  try {
    before = lstatSync(candidate, { bigint: true });
  } catch {
    refuse("BETA_RELEASE_FILE_UNAVAILABLE");
  }
  if (
    !before.isFile()
    || before.isSymbolicLink()
    || before.nlink !== 1n
    || before.size <= 0n
    || before.size > BigInt(MAX_FILE_BYTES)
    || realpathSync(candidate) !== candidate
  ) {
    refuse("BETA_RELEASE_FILE_IDENTITY_REFUSED");
  }
  const descriptor = openSync(candidate, "r");
  try {
    const opened = fstatSync(descriptor, { bigint: true });
    if (
      opened.dev !== before.dev
      || opened.ino !== before.ino
      || opened.size !== before.size
      || opened.nlink !== 1n
    ) {
      refuse("BETA_RELEASE_FILE_IDENTITY_REFUSED");
    }
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (
      BigInt(bytes.length) !== opened.size
      || after.dev !== opened.dev
      || after.ino !== opened.ino
      || after.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs
      || after.nlink !== 1n
    ) {
      refuse("BETA_RELEASE_FILE_CHANGED_REFUSED");
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function canonicalJson(bytes, code) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    refuse(code);
  }
  if (`${JSON.stringify(value, null, 2)}\n` !== text) refuse(code);
  return value;
}

function sensitive(value) {
  const serialized = JSON.stringify(value);
  const slashes = serialized.replaceAll("\\\\", "\\");
  return /[A-Za-z]:\\(?:Users|Documents|Desktop)\\/iu.test(slashes)
    || /\/(?:Users|home)\/[^/"\s]+/iu.test(serialized)
    || /"(?:privateKey|secret|password|token|apiKey|credential)"\s*:/iu.test(serialized)
    || /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/u.test(serialized);
}

function validatePolicy(value) {
  exactObject(value, POLICY_KEYS, "BETA_RELEASE_POLICY_MALFORMED");
  if (
    value.schema !== "galerina.beta-v1.platform-policy.v1"
    || value.releaseId !== "beta-v1"
    || !COMMIT.test(value.targetRepositoryCommit)
    || !Array.isArray(value.functional)
    || value.functional.length !== REQUIRED_SYSTEMS.length
    || !Number.isSafeInteger(value.minimumProductionDurabilityProfiles)
    || value.minimumProductionDurabilityProfiles < 1
    || value.minimumProductionDurabilityProfiles > REQUIRED_SYSTEMS.length
    || !Array.isArray(value.durabilityProfiles)
    || value.repositoryEvidence === null
    || typeof value.repositoryEvidence !== "object"
  ) {
    refuse("BETA_RELEASE_POLICY_MALFORMED");
  }
  const validateRows = (rows, allowSubset) => {
    const systems = new Set();
    for (const row of rows) {
      exactObject(row, POLICY_ROW_KEYS, "BETA_RELEASE_POLICY_MALFORMED");
      if (
        !REQUIRED_SYSTEMS.includes(row.operatingSystem)
        || systems.has(row.operatingSystem)
        || !FILE_NAME.test(row.receiptFile)
        || !SHA256.test(row.sha256)
      ) {
        refuse("BETA_RELEASE_POLICY_MALFORMED");
      }
      systems.add(row.operatingSystem);
    }
    if (!allowSubset && REQUIRED_SYSTEMS.some((system) => !systems.has(system))) {
      refuse("BETA_RELEASE_POLICY_MALFORMED");
    }
  };
  validateRows(value.functional, false);
  validateRows(value.durabilityProfiles, true);
  exactObject(
    value.repositoryEvidence,
    ["receiptFile", "sha256"],
    "BETA_RELEASE_POLICY_MALFORMED",
  );
  if (
    !FILE_NAME.test(value.repositoryEvidence.receiptFile)
    || !SHA256.test(value.repositoryEvidence.sha256)
  ) {
    refuse("BETA_RELEASE_POLICY_MALFORMED");
  }
  if (value.durabilityProfiles.length < value.minimumProductionDurabilityProfiles) {
    refuse("BETA_RELEASE_DURABILITY_PROFILE_MISSING");
  }
  return value;
}

function validateFunctional(value, policyRow, commit) {
  exactObject(value, FUNCTIONAL_KEYS, "BETA_RELEASE_FUNCTIONAL_MALFORMED");
  const platform = exactObject(
    value.platform,
    PLATFORM_KEYS,
    "BETA_RELEASE_FUNCTIONAL_MALFORMED",
  );
  const distribution = exactObject(
    platform.distribution,
    DISTRIBUTION_KEYS,
    "BETA_RELEASE_FUNCTIONAL_MALFORMED",
  );
  const expected = EXPECTED_PLATFORM[policyRow.operatingSystem];
  if (
    value.schema !== "galerina.platform.functional-evidence.v2"
    || value.evidenceClass !== "FUNCTIONAL_PORTABILITY"
    || value.verdict !== 0
    || value.status !== "PASS"
    || value.repositoryCommit !== commit
    || value.operatingSystem !== policyRow.operatingSystem
    || !["container", "hosted-vm", "local-unclassified", "self-hosted"].includes(value.runnerClass)
    || platform.os !== expected.os
    || !expected.architectures.includes(platform.architecture)
    || distribution.id !== expected.distribution
    || typeof distribution.version !== "string"
    || distribution.version.length < 1
    || distribution.version.length > 128
    || typeof platform.nodeVersion !== "string"
    || !/^v\d+\.\d+\.\d+/u.test(platform.nodeVersion)
    || value.cleanWorkingTree !== true
    || !Array.isArray(value.criticalWarnings)
    || value.criticalWarnings.length !== 0
    || !Array.isArray(value.evidence)
    || value.evidence.length !== REQUIRED_ROWS.length
    || value.authenticated !== false
    || value.authorityReleased !== false
    || value.productionAuthorizing !== false
    || sensitive(value)
  ) {
    refuse("BETA_RELEASE_FUNCTIONAL_REFUSED");
  }
  value.evidence.forEach((row, index) => {
    if (
      row === null
      || typeof row !== "object"
      || Array.isArray(row)
      || ![3, 4].includes(Object.keys(row).length)
      || !Object.keys(row).every((key) => ["details", "durationMs", "name", "status"].includes(key))
      || row.name !== REQUIRED_ROWS[index]
      || row.status !== "passed"
      || !Number.isFinite(row.durationMs)
      || row.durationMs < 0
    ) {
      refuse("BETA_RELEASE_FUNCTIONAL_REFUSED");
    }
  });
}

function validateDurability(value, row, commit) {
  exactObject(value, DURABILITY_KEYS, "BETA_RELEASE_DURABILITY_MALFORMED");
  if (
    value.schema !== "galerina.registry.durability.release-evidence.v1"
    || value.operatingSystem !== row.operatingSystem
    || value.repositoryCommit !== commit
    || !DIGEST.test(value.evidenceId)
    || !DIGEST.test(value.implementationDigest)
    || !DIGEST.test(value.acceptedCheckpointDigest)
    || value.evidenceClass !== "PRODUCTION_ADMISSION"
    || value.authenticated !== true
    || value.authorityReleased !== false
    || value.productionAuthorizing !== false
    || sensitive(value)
  ) {
    refuse("BETA_RELEASE_DURABILITY_REFUSED");
  }
}

function validateRepositoryEvidence(value, commit) {
  exactObject(value, REPOSITORY_KEYS, "BETA_RELEASE_REPOSITORY_MALFORMED");
  if (
    value.schema !== "galerina.beta-v1.repository-evidence.v1"
    || value.repositoryCommit !== commit
    || value.phaseClose !== "PASS"
    || value.phaseCloseExhaustive !== "PASS"
    || value.graphAll !== "PASS"
    || value.generatorAll !== "PASS"
    || value.releaseBuild !== "PASS"
    || value.securityScan !== "PASS"
    || value.failedChecks !== 0
    || value.skippedChecks !== 0
    || value.authenticated !== true
    || value.authorityReleased !== false
    || value.productionAuthorizing !== false
    || sensitive(value)
  ) {
    refuse("BETA_RELEASE_REPOSITORY_REFUSED");
  }
}

function verifyBetaV1ReleaseFilesStrict(options) {
  if (options?.cleanPolicyCheckout !== true) refuse("BETA_RELEASE_POLICY_DIRTY");
  const policyDirectory = dirname(resolve(options.policyPath));
  const policyBytes = readStableDirectFile(options.policyPath, policyDirectory);
  const policy = validatePolicy(canonicalJson(policyBytes, "BETA_RELEASE_POLICY_FORMAT"));
  const seenFiles = new Set();
  for (const row of policy.functional) {
    if (seenFiles.has(row.receiptFile)) refuse("BETA_RELEASE_POLICY_MALFORMED");
    seenFiles.add(row.receiptFile);
    const bytes = readStableDirectFile(
      join(options.evidenceDirectory, row.receiptFile),
      options.evidenceDirectory,
    );
    if (sha256(bytes) !== row.sha256) refuse("BETA_RELEASE_RECEIPT_DIGEST_REFUSED");
    validateFunctional(
      canonicalJson(bytes, "BETA_RELEASE_FUNCTIONAL_FORMAT"),
      row,
      policy.targetRepositoryCommit,
    );
  }
  for (const row of policy.durabilityProfiles) {
    if (seenFiles.has(row.receiptFile)) refuse("BETA_RELEASE_POLICY_MALFORMED");
    seenFiles.add(row.receiptFile);
    const bytes = readStableDirectFile(
      join(options.evidenceDirectory, row.receiptFile),
      options.evidenceDirectory,
    );
    if (sha256(bytes) !== row.sha256) refuse("BETA_RELEASE_RECEIPT_DIGEST_REFUSED");
    validateDurability(
      canonicalJson(bytes, "BETA_RELEASE_DURABILITY_FORMAT"),
      row,
      policy.targetRepositoryCommit,
    );
  }
  if (seenFiles.has(policy.repositoryEvidence.receiptFile)) {
    refuse("BETA_RELEASE_POLICY_MALFORMED");
  }
  const repositoryBytes = readStableDirectFile(
    join(options.evidenceDirectory, policy.repositoryEvidence.receiptFile),
    options.evidenceDirectory,
  );
  if (sha256(repositoryBytes) !== policy.repositoryEvidence.sha256) {
    refuse("BETA_RELEASE_RECEIPT_DIGEST_REFUSED");
  }
  validateRepositoryEvidence(
    canonicalJson(repositoryBytes, "BETA_RELEASE_REPOSITORY_FORMAT"),
    policy.targetRepositoryCommit,
  );
  return Object.freeze({
    schema: "galerina.beta-v1.release-admission.v1",
    releaseId: policy.releaseId,
    targetRepositoryCommit: policy.targetRepositoryCommit,
    verdict: 1,
    status: "ADMITTED",
    operatingSystems: Object.freeze([...REQUIRED_SYSTEMS]),
    productionDurabilityProfiles: policy.durabilityProfiles.length,
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
  });
}

export function verifyBetaV1ReleaseFiles(options) {
  try {
    return verifyBetaV1ReleaseFilesStrict(options);
  } catch (error) {
    if (error instanceof Error && error.message === "BETA_RELEASE_FILE_UNAVAILABLE") {
      return Object.freeze({
        schema: "galerina.beta-v1.release-admission.v1",
        releaseId: "beta-v1",
        verdict: 0,
        status: "INCOMPLETE_EXTERNAL_EVIDENCE",
        operatingSystems: Object.freeze([]),
        productionDurabilityProfiles: 0,
        authenticated: false,
        authorityReleased: false,
        productionAuthorizing: false,
      });
    }
    throw error;
  }
}

function parseCli(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (value === undefined) refuse("BETA_RELEASE_CLI_REFUSED");
    if (key === "--policy" && result.policyPath === undefined) result.policyPath = resolve(value);
    else if (key === "--evidence-dir" && result.evidenceDirectory === undefined) {
      result.evidenceDirectory = resolve(value);
    } else refuse("BETA_RELEASE_CLI_REFUSED");
  }
  if (result.policyPath === undefined || result.evidenceDirectory === undefined) {
    refuse("BETA_RELEASE_CLI_REFUSED");
  }
  return result;
}

function cleanCheckout() {
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return result.status === 0 && result.signal === null && String(result.stdout).trim() === "";
}

function main() {
  const options = parseCli(process.argv.slice(2));
  const governancePolicy = resolve(REPOSITORY_ROOT, "governance", "beta-v1-platform-policy.json");
  if (options.policyPath !== governancePolicy) refuse("BETA_RELEASE_POLICY_PATH_REFUSED");
  const result = verifyBetaV1ReleaseFiles({
    ...options,
    cleanPolicyCheckout: cleanCheckout(),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.verdict !== 1) process.exitCode = 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`REFUSED: ${error instanceof Error ? error.message : "BETA_RELEASE_UNKNOWN"}\n`);
    process.exitCode = 1;
  }
}
