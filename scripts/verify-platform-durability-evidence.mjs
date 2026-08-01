#!/usr/bin/env node

import { createHash } from "node:crypto";
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

const MAX_EVIDENCE_BYTES = 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const RELEASE = /^[0-9A-Za-z._+~-]{1,128}$/u;
const RUNTIME_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]{1,64})?$/u;
const BOUNDARIES = Object.freeze([
  "stage-opened",
  "bytes-written",
  "file-flushed",
  "stage-closed",
  "published",
  "reopened-verified",
  "directory-flushed",
]);
const STATIC_KEYS = Object.freeze([
  "abi",
  "adapterSourceSha256",
  "architecture",
  "buildProfile",
  "executableSha256",
  "fungiContractSha256",
  "platform",
  "pollutedWorkingDirectoryInvariant",
  "productionAuthorizing",
  "schema",
  "verdict",
]);
const PLATFORM_KEYS = Object.freeze([
  "authenticated",
  "authorityReleased",
  "decision",
  "evidenceKind",
  "executionEvidence",
  "failureId",
  "observation",
  "productionAuthorizing",
  "schema",
  "status",
]);
const OBSERVATION_KEYS = Object.freeze([
  "architecture",
  "distributionId",
  "osRelease",
  "platform",
  "runtimeKind",
  "runtimeVersion",
  "schema",
]);
const DECISION_KEYS = Object.freeze([
  "authorityReleased",
  "compatibilityVerdict",
  "executionEvidence",
  "failureId",
  "productionAuthorizing",
  "profileId",
  "schema",
  "status",
]);
const NATIVE_KEYS = Object.freeze([
  "architecture",
  "authenticated",
  "authorityReleased",
  "controlledPowerLoss",
  "controlledReboot",
  "distributionId",
  "failedTests",
  "faultRefusals",
  "filesystem",
  "galerinaCommit",
  "liveTests",
  "platform",
  "processTerminationBoundaries",
  "productionAuthorizing",
  "pureTests",
  "schema",
  "selfSha256",
  "skippedTests",
  "slideCommit",
]);
const BINDING_KEYS = Object.freeze([
  "galerinaCommit",
  "nativeReceiptSha256",
  "platformReceiptSha256",
  "productionAuthorizing",
  "schema",
  "slideCommit",
  "staticReceiptSha256",
]);
const REPORT_PATTERN = /^[\s\S]{1,524288}<!-- GALERINA_PLATFORM_DURABILITY_BINDING_BEGIN -->\r?\n```json\r?\n([\s\S]+?)\r?\n```\r?\n<!-- GALERINA_PLATFORM_DURABILITY_BINDING_END -->\r?\n?$/u;

function refuse(code) {
  throw new Error(code);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactObject(value, expectedKeys, refusal) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse(refusal);
  const keys = Object.keys(value).sort();
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
  ) {
    refuse(refusal);
  }
  return value;
}

function readBoundedDirectFile(path, reportsDirectory) {
  const reportsReal = realpathSync(reportsDirectory);
  const candidate = resolve(path);
  if (dirname(candidate) !== reportsReal) refuse("EVIDENCE_PATH_SCOPE_REFUSED");
  let before;
  try {
    before = lstatSync(candidate, { bigint: true });
  } catch {
    refuse("EVIDENCE_FILE_IDENTITY_REFUSED");
  }
  if (
    !before.isFile()
    || before.isSymbolicLink()
    || before.nlink !== 1n
    || before.size <= 0n
    || before.size > BigInt(MAX_EVIDENCE_BYTES)
  ) {
    refuse("EVIDENCE_FILE_IDENTITY_REFUSED");
  }
  if (realpathSync(candidate) !== candidate) refuse("EVIDENCE_FILE_IDENTITY_REFUSED");
  const descriptor = openSync(candidate, "r");
  try {
    const openedBefore = fstatSync(descriptor, { bigint: true });
    if (
      openedBefore.dev !== before.dev
      || openedBefore.ino !== before.ino
      || openedBefore.size !== before.size
      || openedBefore.nlink !== 1n
    ) {
      refuse("EVIDENCE_FILE_IDENTITY_REFUSED");
    }
    const bytes = readFileSync(descriptor);
    const openedAfter = fstatSync(descriptor, { bigint: true });
    if (
      BigInt(bytes.length) !== openedBefore.size
      || openedAfter.dev !== openedBefore.dev
      || openedAfter.ino !== openedBefore.ino
      || openedAfter.size !== openedBefore.size
      || openedAfter.mtimeNs !== openedBefore.mtimeNs
      || openedAfter.nlink !== 1n
    ) {
      refuse("EVIDENCE_FILE_CHANGED_REFUSED");
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function strictUtf8(bytes, refusal) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    refuse(refusal);
  }
  return text;
}

function strictCanonicalJson(bytes, refusal) {
  const text = strictUtf8(bytes, refusal);
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    refuse(refusal);
  }
  if (`${JSON.stringify(value, null, 2)}\n` !== text) refuse(refusal);
  return value;
}

function validateStatic(value) {
  exactObject(value, STATIC_KEYS, "EVIDENCE_STATIC_SEMANTICS_REFUSED");
  if (
    value.schema !== "galerina-registry-durability-static-link-proof/v1"
    || value.verdict !== "CANDIDATE"
    || value.productionAuthorizing !== false
    || value.platform !== "linux"
    || !["x64", "arm64"].includes(value.architecture)
    || !SHA256.test(value.executableSha256)
    || !SHA256.test(value.adapterSourceSha256)
    || !SHA256.test(value.fungiContractSha256)
    || value.abi !== "galerina.registry.durability.abi.v1"
    || value.buildProfile !== "release"
    || value.pollutedWorkingDirectoryInvariant !== true
  ) {
    refuse("EVIDENCE_STATIC_SEMANTICS_REFUSED");
  }
}

function validatePlatform(value) {
  exactObject(value, PLATFORM_KEYS, "EVIDENCE_PLATFORM_SEMANTICS_REFUSED");
  const observation = exactObject(
    value.observation,
    OBSERVATION_KEYS,
    "EVIDENCE_PLATFORM_SEMANTICS_REFUSED",
  );
  const decision = exactObject(
    value.decision,
    DECISION_KEYS,
    "EVIDENCE_PLATFORM_SEMANTICS_REFUSED",
  );
  if (
    value.schema !== "slide.reference-platform-report.v1"
    || value.status !== "MATCH"
    || value.failureId !== "NONE"
    || value.evidenceKind !== "LOCAL_SELF_OBSERVATION"
    || value.authenticated !== false
    || value.executionEvidence !== "UNVERIFIED"
    || value.authorityReleased !== false
    || value.productionAuthorizing !== false
    || observation.schema !== "slide.reference-platform-observation.v1"
    || observation.platform !== "linux"
    || !["x64", "arm64"].includes(observation.architecture)
    || observation.distributionId !== "ubuntu"
    || typeof observation.osRelease !== "string"
    || !RELEASE.test(observation.osRelease)
    || observation.runtimeKind !== "node-bootstrap"
    || typeof observation.runtimeVersion !== "string"
    || !RUNTIME_VERSION.test(observation.runtimeVersion)
    || decision.schema !== "slide.reference-platform-decision.v1"
    || decision.compatibilityVerdict !== 1
    || decision.status !== "MATCH"
    || decision.failureId !== "NONE"
    || decision.profileId !== `slide.reference.ubuntu-${observation.architecture}.v1`
    || decision.executionEvidence !== "UNVERIFIED"
    || decision.authorityReleased !== false
    || decision.productionAuthorizing !== false
  ) {
    refuse("EVIDENCE_PLATFORM_SEMANTICS_REFUSED");
  }
  return observation;
}

function validateNative(value, expectedGalerinaCommit, expectedSlideCommit) {
  exactObject(value, NATIVE_KEYS, "EVIDENCE_NATIVE_SEMANTICS_REFUSED");
  const { selfSha256, ...base } = value;
  const calculated = sha256(Buffer.from(`${JSON.stringify(base, null, 2)}\n`, "utf8"));
  if (
    value.schema !== "galerina.platform-native-evidence.v1"
    || value.galerinaCommit !== expectedGalerinaCommit
    || value.slideCommit !== expectedSlideCommit
    || value.platform !== "linux"
    || value.distributionId !== "ubuntu"
    || !["x64", "arm64"].includes(value.architecture)
    || !["ext4", "xfs", "btrfs"].includes(value.filesystem)
    || value.pureTests !== 10
    || value.liveTests !== 4
    || value.faultRefusals !== 9
    || JSON.stringify(value.processTerminationBoundaries) !== JSON.stringify(BOUNDARIES)
    || value.failedTests !== 0
    || value.skippedTests !== 0
    || value.controlledReboot !== false
    || value.controlledPowerLoss !== false
    || value.authenticated !== false
    || value.authorityReleased !== false
    || value.productionAuthorizing !== false
    || !SHA256.test(selfSha256)
    || selfSha256 !== calculated
  ) {
    refuse("EVIDENCE_NATIVE_SEMANTICS_REFUSED");
  }
}

function extractBinding(reportBytes) {
  const text = strictUtf8(reportBytes, "EVIDENCE_REPORT_FORMAT_REFUSED");
  if (
    /(?:[A-Za-z]:\\Users\\|\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/)/u.test(text)
    || /(?:private[_ -]?key|password|secret|bearer[_ -]?token)\s*[:=]/iu.test(text)
  ) {
    refuse("EVIDENCE_REPORT_SENSITIVE_REFUSED");
  }
  if (
    text.split("GALERINA_PLATFORM_DURABILITY_BINDING_BEGIN").length !== 2
    || text.split("GALERINA_PLATFORM_DURABILITY_BINDING_END").length !== 2
  ) {
    refuse("EVIDENCE_REPORT_FORMAT_REFUSED");
  }
  const match = REPORT_PATTERN.exec(text);
  if (match === null) refuse("EVIDENCE_REPORT_FORMAT_REFUSED");
  const block = Buffer.from(`${match[1]}\n`, "utf8");
  return strictCanonicalJson(block, "EVIDENCE_REPORT_FORMAT_REFUSED");
}

function validateBinding(
  binding,
  expectedGalerinaCommit,
  expectedSlideCommit,
  receiptBytes,
) {
  exactObject(binding, BINDING_KEYS, "EVIDENCE_REPORT_BINDING_REFUSED");
  if (
    binding.schema !== "galerina.platform-durability-report-binding.v1"
    || binding.galerinaCommit !== expectedGalerinaCommit
    || binding.slideCommit !== expectedSlideCommit
    || binding.productionAuthorizing !== false
    || binding.staticReceiptSha256 !== sha256(receiptBytes.staticReceipt)
    || binding.platformReceiptSha256 !== sha256(receiptBytes.platformReceipt)
    || binding.nativeReceiptSha256 !== sha256(receiptBytes.nativeReceipt)
  ) {
    refuse("EVIDENCE_REPORT_BINDING_REFUSED");
  }
}

function exactSiblingNames(options) {
  const prefix = `ubuntu-desktop-linux-adapter-`;
  const suffix = `-${options.expectedGalerinaCommit.slice(0, 12)}`;
  const reportName = options.reportPath.slice(dirname(options.reportPath).length + 1);
  const match = /^ubuntu-desktop-linux-adapter-(\d{4}-\d{2}-\d{2})-([0-9a-f]{12})\.md$/u.exec(reportName);
  if (match === null || !reportName.startsWith(prefix)) {
    refuse("EVIDENCE_FILENAME_REFUSED");
  }
  if (match[2] !== suffix.slice(1)) refuse("EVIDENCE_COMMIT_MISMATCH");
  const base = reportName.slice(0, -3);
  const expected = [
    [options.staticReceiptPath, `${base}.receipt.json`],
    [options.platformReceiptPath, `${base}.slide-platform.json`],
    [options.nativeReceiptPath, `${base}.native-evidence.json`],
  ];
  for (const [path, name] of expected) {
    if (path.slice(dirname(path).length + 1) !== name) refuse("EVIDENCE_FILENAME_REFUSED");
  }
}

export function verifyPlatformDurabilityEvidence(options) {
  if (
    options === null
    || typeof options !== "object"
    || !COMMIT.test(options.expectedGalerinaCommit ?? "")
    || !COMMIT.test(options.expectedSlideCommit ?? "")
  ) {
    refuse("EVIDENCE_INPUT_REFUSED");
  }
  const receiptBytes = {
    report: readBoundedDirectFile(options.reportPath, options.reportsDirectory),
    staticReceipt: readBoundedDirectFile(options.staticReceiptPath, options.reportsDirectory),
    platformReceipt: readBoundedDirectFile(options.platformReceiptPath, options.reportsDirectory),
    nativeReceipt: readBoundedDirectFile(options.nativeReceiptPath, options.reportsDirectory),
  };
  exactSiblingNames(options);
  const staticValue = strictCanonicalJson(
    receiptBytes.staticReceipt,
    "EVIDENCE_STATIC_FORMAT_REFUSED",
  );
  const platformValue = strictCanonicalJson(
    receiptBytes.platformReceipt,
    "EVIDENCE_PLATFORM_FORMAT_REFUSED",
  );
  const nativeValue = strictCanonicalJson(
    receiptBytes.nativeReceipt,
    "EVIDENCE_NATIVE_FORMAT_REFUSED",
  );
  validateStatic(staticValue);
  const observation = validatePlatform(platformValue);
  validateNative(nativeValue, options.expectedGalerinaCommit, options.expectedSlideCommit);
  if (
    staticValue.architecture !== observation.architecture
    || nativeValue.architecture !== observation.architecture
  ) {
    refuse("EVIDENCE_CROSS_RECEIPT_MISMATCH");
  }
  const binding = extractBinding(receiptBytes.report);
  validateBinding(
    binding,
    options.expectedGalerinaCommit,
    options.expectedSlideCommit,
    receiptBytes,
  );
  return Object.freeze({
    schema: "galerina.platform-durability-decision.v1",
    verdict: 1,
    reason: "UBUNTU_ROUND_TWO_COMPLETE",
    evidenceClass: "PROCESS_TERMINATION",
    platform: "linux",
    distributionId: "ubuntu",
    architecture: observation.architecture,
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
    galerinaCommit: options.expectedGalerinaCommit.slice(0, 12),
    slideCommit: options.expectedSlideCommit.slice(0, 12),
  });
}

function readGitHead(repositoryRoot) {
  const gitPath = join(repositoryRoot, ".git");
  const gitStats = lstatSync(gitPath);
  let gitDirectory = gitPath;
  if (gitStats.isFile()) {
    const pointer = readFileSync(gitPath, "utf8").trim();
    if (!pointer.startsWith("gitdir: ")) refuse("EVIDENCE_GIT_IDENTITY_REFUSED");
    gitDirectory = resolve(repositoryRoot, pointer.slice(8));
  } else if (!gitStats.isDirectory()) {
    refuse("EVIDENCE_GIT_IDENTITY_REFUSED");
  }
  const head = readFileSync(join(gitDirectory, "HEAD"), "utf8").trim();
  if (COMMIT.test(head)) return head;
  if (!head.startsWith("ref: refs/") || head.includes("..")) refuse("EVIDENCE_GIT_IDENTITY_REFUSED");
  const ref = head.slice(5);
  try {
    const commit = readFileSync(join(gitDirectory, ...ref.split("/")), "utf8").trim();
    if (COMMIT.test(commit)) return commit;
  } catch {
    const commonDirectory = gitDirectory.includes(`${join(".git", "worktrees")}`)
      ? resolve(gitDirectory, "..", "..")
      : gitDirectory;
    const packed = readFileSync(join(commonDirectory, "packed-refs"), "utf8");
    for (const line of packed.split(/\r?\n/u)) {
      const [commit, name] = line.split(" ");
      if (name === ref && COMMIT.test(commit)) return commit;
    }
  }
  refuse("EVIDENCE_GIT_IDENTITY_REFUSED");
}

function parseCli(argv) {
  const keys = new Map([
    ["--report", "reportPath"],
    ["--static-receipt", "staticReceiptPath"],
    ["--platform-receipt", "platformReceiptPath"],
    ["--native-receipt", "nativeReceiptPath"],
  ]);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = keys.get(argv[index]);
    const value = argv[index + 1];
    if (key === undefined || value === undefined || parsed[key] !== undefined) {
      refuse("EVIDENCE_CLI_REFUSED");
    }
    parsed[key] = resolve(value);
  }
  if (Object.keys(parsed).length !== keys.size) refuse("EVIDENCE_CLI_REFUSED");
  return parsed;
}

function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const paths = parseCli(process.argv.slice(2));
  const reportsDirectory = join(
    repoRoot,
    "docs",
    "platform-handover",
    "ubuntu-desktop",
    "reports",
  );
  const result = verifyPlatformDurabilityEvidence({
    ...paths,
    reportsDirectory,
    expectedGalerinaCommit: readGitHead(repoRoot),
    expectedSlideCommit: readGitHead(resolve(repoRoot, "..", "SLIDE")),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`REFUSED: ${error instanceof Error ? error.message : "EVIDENCE_UNKNOWN_REFUSED"}\n`);
    process.exitCode = 1;
  }
}
