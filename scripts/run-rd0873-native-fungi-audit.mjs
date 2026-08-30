#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync, existsSync, fstatSync, lstatSync, mkdtempSync, openSync, readFileSync,
  realpathSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FROZEN_SUBJECT_HEAD = "f6261ef362f0583896e24039547da33c5f0d052d";
export const FROZEN_SUBJECT_TREE = "d2b100ae35abf8dbcdf18f408afc525dafc570d0";
export const CANONICAL_AGENTS_HEAD = "e654756036d756e72b3de20b395278fcd0eecc1c";
export const CANONICAL_AGENTS_TREE = "d7d774b1a0630929ad3fd66a99a35d7a31b5a7e2";
export const CANONICAL_CONTROLLERS = Object.freeze({
  "tools/audit-map.mjs": Object.freeze({
    blob: "9afd01b0e61879862d1fe84d781051662ae6e245",
    bytes: "9ba23d9f963dd96398ac291b192f99ff46a8819b750c81ef171a282308b29db0",
  }),
  "tools/bounded-tool-batch.mjs": Object.freeze({
    blob: "7a48da4b11471474716bff450e1c81a6de3defb4",
    bytes: "3413baeaa1a6bb2c7c6d62713e65aede0902374d73f233fa44caa20bd2de4ba4",
  }),
});
export const PRODUCER_PATH = "scripts/run-rd0873-native-fungi-audit.mjs";
export const RUNTIME_GIT_SHA256 = "22fead8244ef3a7225fb800099a4e43eca8bcec0466774917669599c2f19a05a";
export const MANIFEST_PLAN_DIGEST = "8cacc113e8e77de44b03e95564a868c07e0910f937d34942155156d27845a09d";
export const MANIFEST_RAW_SHA256 = "afcf7efa93b3b52d8a62795d83b18a9432f3638c7d133a122afd8e1dc35d543a";
export const APPROVAL_RAW_SHA256 = "0f00ed2444e0696702c7d56f28029a4574c58139be02b2b0c62720eb376a674f";
export const APPROVAL_RECEIPT_DIGEST = "ba4633423e8ee1f56a88a3a5bf33f889c719733c3c6c31109c909cc635da677d";
export const POLICY_RAW_SHA256 = "94c9dd1d74334dc6d6d5043f5c60c86379ca41e25ac91ecac2c495114d0620e2";
export const POLICY_CANONICAL_SHA256 = "73c98083a242f4996fa7b9e53b120742e4307b4649637b3fe56ce6e12fecebf7";

const modulePath = fileURLToPath(import.meta.url);
const controllerRepositoryRoot = resolve(dirname(modulePath), "..");
const MANIFEST_RELATIVE_PATH = "governance/rd0873-native-fungi-audit-map.json";
const APPROVAL_RELATIVE_PATH = "governance/rd0873-native-fungi-audit-approval.json";
const POLICY_RELATIVE_PATH = "tools/bounded-tool-batch-policy.json";
const APPROVAL_SCHEMA = "rd0873-native-fungi-audit-approval.v1";
const OUTER_SCHEMA = "rd0873-native-fungi-audit-run.v1";
const MAX_CONTROLLER_BYTES = 2_097_152;
const MAX_INPUT_BYTES = 4_194_304;
const MAX_GIT_OUTPUT_BYTES = 16_777_216;
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

class OperatorRefusal extends Error {
  constructor(code, message) {
    super(`REFUSED: ${code}: ${message}`);
    this.name = "OperatorRefusal";
    this.code = code;
  }
}

function refuse(code, message) {
  throw new OperatorRefusal(code, message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function repositoryTextDigest(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > MAX_INPUT_BYTES
      || bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    refuse("CONTROL_TEXT_REFUSED", "control text is empty, over-bound, or has a BOM");
  }
  let text;
  try { text = utf8Decoder.decode(bytes); }
  catch { refuse("CONTROL_TEXT_REFUSED", "control text is not valid UTF-8"); }
  if (/\r(?!\n)/u.test(text)) refuse("CONTROL_TEXT_REFUSED", "control text contains a bare carriage return");
  return sha256(Buffer.from(text.replace(/\r\n/gu, "\n"), "utf8"));
}

function plainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!plainRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

export function canonicalDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value)), "utf8"));
}

function closedRecord(value, keys, code, label) {
  if (!plainRecord(value)) refuse(code, `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    refuse(code, `${label} fields are not the closed schema`);
  }
}

function exactCanonicalPath(path, code, kind = "file") {
  if (typeof path !== "string" || path.length === 0 || !isAbsolute(path)) {
    refuse(code, "path must be explicit and absolute");
  }
  const absolute = resolve(path);
  let canonicalPath;
  let stats;
  try {
    canonicalPath = realpathSync.native(absolute);
    stats = lstatSync(absolute);
  } catch {
    refuse(code, "path is unavailable");
  }
  if (canonicalPath !== absolute || stats.isSymbolicLink()
      || (kind === "file" ? !stats.isFile() : !stats.isDirectory())) {
    refuse(code, "path is aliased, case-mismatched, linked, or the wrong kind");
  }
  return absolute;
}

function assertOutside(path, roots, code) {
  for (const rootValue of roots) {
    if (typeof rootValue !== "string" || rootValue.length === 0) continue;
    const root = resolve(rootValue);
    const rel = relative(root, path);
    if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) {
      refuse(code, "executable path is inside a controlled repository");
    }
  }
}

function verifyGitExecutable(path, forbiddenRoots = []) {
  const canonicalPath = exactCanonicalPath(path, "GIT_EXECUTABLE_REFUSED");
  assertOutside(canonicalPath, forbiddenRoots, "GIT_EXECUTABLE_REFUSED");
  const stats = statSync(canonicalPath, { bigint: true });
  if (stats.nlink !== 1n || stats.size < 1n || stats.size > 67_108_864n) {
    refuse("GIT_EXECUTABLE_REFUSED", "Git executable is not a bounded regular single-link file");
  }
  let bytes;
  try { bytes = readFileSync(canonicalPath); }
  catch { refuse("GIT_EXECUTABLE_REFUSED", "Git executable cannot be read"); }
  const digest = sha256(bytes);
  if (digest !== RUNTIME_GIT_SHA256) refuse("GIT_EXECUTABLE_REFUSED", "Git executable digest is not approved");
  return Object.freeze({ path: canonicalPath, digest });
}

function childEnvironment(source = process.env, safeDirectory = null) {
  const allowed = [
    "APPDATA", "COMSPEC", "HOME", "LANG", "LC_ALL", "LOCALAPPDATA", "PATH", "PATHEXT",
    "SYSTEMDRIVE", "SYSTEMROOT", "TEMP", "TMP", "USERPROFILE", "WINDIR",
  ];
  const environment = {};
  for (const key of allowed) if (typeof source[key] === "string") environment[key] = source[key];
  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  return {
    ...environment,
    GIT_CONFIG_COUNT: safeDirectory === null ? "4" : "5",
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_KEY_1: "core.hooksPath",
    GIT_CONFIG_KEY_2: "core.untrackedCache",
    GIT_CONFIG_KEY_3: "core.excludesFile",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_VALUE_0: "false",
    GIT_CONFIG_VALUE_1: "__rd0873_hooks_disabled__",
    GIT_CONFIG_VALUE_2: "false",
    GIT_CONFIG_VALUE_3: nullDevice,
    ...(safeDirectory === null ? {} : {
      GIT_CONFIG_KEY_4: "safe.directory",
      GIT_CONFIG_VALUE_4: safeDirectory,
    }),
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function gitOutput(git, repositoryRoot, argv, encoding = "utf8") {
  if (sha256(readFileSync(git.path)) !== git.digest) {
    refuse("GIT_EXECUTABLE_REFUSED", "Git executable changed during observation");
  }
  let output;
  try {
    output = execFileSync(git.path, [
      "--no-optional-locks",
      "-c", "core.fsmonitor=false",
      "-c", "core.hooksPath=__rd0873_hooks_disabled__",
      "-c", "core.untrackedCache=false",
      "-C", repositoryRoot,
      ...argv,
    ], {
      encoding: encoding === "buffer" ? undefined : encoding,
      env: childEnvironment(process.env, repositoryRoot),
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      timeout: 30_000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    refuse("OWNER_GIT_REFUSED", "bounded controller Git observation failed");
  }
  return encoding === "buffer" ? Buffer.from(output) : String(output);
}

function gitObjectDigest(format, bytes) {
  if (!new Set(["sha1", "sha256"]).has(format)) refuse("OWNER_OBJECT_FORMAT_REFUSED", "Git object format is unsupported");
  return createHash(format).update(Buffer.from(`blob ${bytes.length}\0`, "utf8")).update(bytes).digest("hex");
}

function collectControllerEvidence(agentsRepositoryRoot, gitExecutablePath) {
  const root = exactCanonicalPath(agentsRepositoryRoot, "OWNER_PATH_REFUSED", "directory");
  const git = verifyGitExecutable(gitExecutablePath, [root, controllerRepositoryRoot]);
  const topLevel = gitOutput(git, root, ["rev-parse", "--show-toplevel"]).trim();
  if (resolve(topLevel) !== root) refuse("OWNER_PATH_REFUSED", "AGENTS repository root is not the exact Git top level");
  let identity;
  try {
    identity = gitOutput(git, root, ["show", "-s", "--format=%H%n%T", CANONICAL_AGENTS_HEAD]).trim().split(/\r?\n/u);
  } catch {
    refuse("OWNER_HEAD_REFUSED", "controller commit is unavailable or wrong");
  }
  if (identity.length !== 2 || identity[0] !== CANONICAL_AGENTS_HEAD) refuse("OWNER_HEAD_REFUSED", "controller commit is unavailable or wrong");
  if (identity[1] !== CANONICAL_AGENTS_TREE) refuse("OWNER_TREE_REFUSED", "controller tree is unavailable or wrong");
  const format = gitOutput(git, root, ["rev-parse", "--show-object-format"]).trim();
  const paths = Object.keys(CANONICAL_CONTROLLERS);
  const treeBytes = gitOutput(git, root, ["ls-tree", "-z", CANONICAL_AGENTS_HEAD, "--", ...paths], "buffer");
  let treeText;
  try { treeText = utf8Decoder.decode(treeBytes); }
  catch { refuse("OWNER_TREE_REFUSED", "controller tree rows are not UTF-8"); }
  const rows = treeText.split("\0").filter((row) => row !== "");
  if (rows.length !== paths.length) refuse("OWNER_TREE_REFUSED", "controller tree row count is not exact");
  const controllers = [];
  const material = new Map();
  for (const [index, expectedPath] of paths.entries()) {
    const match = /^100644 blob ([0-9a-f]{40,64})\t([^\0]+)$/u.exec(rows[index] ?? "");
    if (!match || match[2] !== expectedPath) refuse("OWNER_ORDER_REFUSED", "controller tree rows are missing or reordered");
    const expected = CANONICAL_CONTROLLERS[expectedPath];
    if (match[1] !== expected.blob) refuse("OWNER_BLOB_REFUSED", `controller blob is wrong: ${expectedPath}`);
    const bytes = gitOutput(git, root, ["cat-file", "blob", match[1]], "buffer");
    if (bytes.length === 0 || bytes.length > MAX_CONTROLLER_BYTES) refuse("OWNER_BYTES_REFUSED", "controller blob size is invalid");
    if (gitObjectDigest(format, bytes) !== match[1]) refuse("OWNER_BLOB_REFUSED", "controller Git object digest is invalid");
    const bytesDigest = sha256(bytes);
    if (bytesDigest !== expected.bytes) refuse("OWNER_BYTES_REFUSED", `controller bytes are wrong: ${expectedPath}`);
    controllers.push({ path: expectedPath, blob: match[1], bytesDigest });
    material.set(expectedPath, bytes);
  }
  if (sha256(readFileSync(git.path)) !== git.digest) refuse("GIT_EXECUTABLE_REFUSED", "Git executable changed after observation");
  return {
    evidence: { head: CANONICAL_AGENTS_HEAD, tree: CANONICAL_AGENTS_TREE, controllers },
    git,
    material,
  };
}

export function verifyControllerEvidence(evidence, { beforeImport = () => {} } = {}) {
  closedRecord(evidence, ["head", "tree", "controllers"], "OWNER_EVIDENCE_REFUSED", "controller evidence");
  if (evidence.head !== CANONICAL_AGENTS_HEAD) refuse("OWNER_HEAD_REFUSED", "controller HEAD is wrong");
  if (evidence.tree !== CANONICAL_AGENTS_TREE) refuse("OWNER_TREE_REFUSED", "controller tree is wrong");
  if (!Array.isArray(evidence.controllers) || evidence.controllers.length !== 2) {
    refuse("OWNER_ORDER_REFUSED", "controller evidence count is wrong");
  }
  for (const [index, [path, expected]] of Object.entries(CANONICAL_CONTROLLERS).entries()) {
    const row = evidence.controllers[index];
    closedRecord(row, ["path", "blob", "bytesDigest"], "OWNER_EVIDENCE_REFUSED", `controller ${index}`);
    if (row.path !== path) refuse("OWNER_ORDER_REFUSED", "controller evidence is reordered");
    if (row.blob !== expected.blob) refuse("OWNER_BLOB_REFUSED", `controller blob is wrong: ${path}`);
    if (row.bytesDigest !== expected.bytes) refuse("OWNER_BYTES_REFUSED", `controller bytes are wrong: ${path}`);
  }
  beforeImport();
  return evidence;
}

function removeOwnedModuleRoot(root) {
  const tempRoot = realpathSync.native(resolve(tmpdir()));
  const canonicalRoot = realpathSync.native(resolve(root));
  if (dirname(canonicalRoot) !== tempRoot || !basename(canonicalRoot).startsWith("rd0873-controller-")
      || lstatSync(canonicalRoot).isSymbolicLink()) {
    refuse("OWNER_TEMP_REFUSED", "controller module root escaped owned temporary state");
  }
  rmSync(canonicalRoot, { recursive: true, force: true });
  if (existsSync(canonicalRoot)) refuse("OWNER_TEMP_REFUSED", "controller module cleanup was incomplete");
}

export async function loadCanonicalControllers({ agentsRepositoryRoot, gitExecutablePath } = {}) {
  const collected = collectControllerEvidence(agentsRepositoryRoot, gitExecutablePath);
  verifyControllerEvidence(collected.evidence);
  const moduleRoot = mkdtempSync(resolve(tmpdir(), "rd0873-controller-"), { encoding: "utf8" });
  try {
    for (const [controllerPath, bytes] of collected.material) {
      const target = resolve(moduleRoot, basename(controllerPath));
      writeFileSync(target, bytes, { flag: "wx", mode: 0o600 });
      const stats = statSync(target);
      if (!stats.isFile() || stats.size !== bytes.length || sha256(readFileSync(target)) !== sha256(bytes)) {
        refuse("OWNER_TEMP_REFUSED", "materialized controller bytes are not exact");
      }
    }
    const auditMapModule = await import(pathToFileURL(resolve(moduleRoot, "audit-map.mjs")).href);
    const batchModule = await import(pathToFileURL(resolve(moduleRoot, "bounded-tool-batch.mjs")).href);
    return Object.freeze({
      auditMapModule,
      batchModule,
      evidence: Object.freeze({
        head: collected.evidence.head,
        tree: collected.evidence.tree,
        controllers: Object.freeze(collected.evidence.controllers.map((row) => Object.freeze({ ...row }))),
      }),
      gitAuthority: collected.git,
    });
  } finally {
    removeOwnedModuleRoot(moduleRoot);
  }
}

function readBoundedStableFile(path, expectedRelativePath, code) {
  const expected = resolve(controllerRepositoryRoot, ...expectedRelativePath.split("/"));
  if (resolve(path) !== expected) refuse(code, "input path is not the exact operator-owned locator");
  const canonicalPath = exactCanonicalPath(expected, code);
  const descriptor = openSync(canonicalPath, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.size < 1n || before.size > BigInt(MAX_INPUT_BYTES)) refuse(code, "input size is invalid");
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
        || before.mtimeNs !== after.mtimeNs || BigInt(bytes.length) !== before.size) {
      refuse(code, "input changed while being read");
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

export function parseApprovalText(text) {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES) {
    refuse("APPROVAL_PARSE_REFUSED", "approval text is invalid or over-bound");
  }
  try { return JSON.parse(text); }
  catch { refuse("APPROVAL_PARSE_REFUSED", "approval receipt is not valid JSON"); }
}

function approvalBody(value) {
  const { receiptDigest: _receiptDigest, ...body } = value;
  return body;
}

export function validateApprovalReceipt(value, { manifestBytes, policyBytes, auditMapModule, batchModule } = {}) {
  closedRecord(value, [
    "schema", "authorizing", "status", "authority", "subject", "manifest", "policy", "controller",
    "runtime", "producer", "receiptDigest",
  ], "APPROVAL_FIELD_UNKNOWN", "approval receipt");
  if (value.schema !== APPROVAL_SCHEMA || value.authorizing !== false || value.status !== "APPROVED"
      || value.authority !== "authority://galerina/rd-0873-native-fungi-audit") {
    refuse("APPROVAL_SCHEMA_REFUSED", "approval envelope is invalid");
  }
  closedRecord(value.subject, ["owner", "head", "tree"], "APPROVAL_SUBJECT_REFUSED", "approval subject");
  if (value.subject.owner !== "galerina" || value.subject.head !== FROZEN_SUBJECT_HEAD
      || value.subject.tree !== FROZEN_SUBJECT_TREE) refuse("APPROVAL_SUBJECT_REFUSED", "approval subject is wrong");
  closedRecord(value.controller, ["owner", "head", "tree", "controllers"], "APPROVAL_CONTROLLER_REFUSED", "approval controller");
  if (value.controller.owner !== "agents") refuse("APPROVAL_CONTROLLER_REFUSED", "approval controller owner is wrong");
  try { verifyControllerEvidence({
    head: value.controller.head,
    tree: value.controller.tree,
    controllers: value.controller.controllers,
  }); } catch (error) {
    if (error?.code === "OWNER_ORDER_REFUSED") refuse("APPROVAL_CONTROLLER_ORDER_REFUSED", "approval controller rows are reordered");
    refuse("APPROVAL_CONTROLLER_REFUSED", "approval controller identity is wrong");
  }
  closedRecord(value.manifest, ["path", "rawDigest", "planDigest"], "APPROVAL_MANIFEST_REFUSED", "approval manifest");
  if (!Buffer.isBuffer(manifestBytes) || value.manifest.path !== MANIFEST_RELATIVE_PATH
      || value.manifest.rawDigest !== repositoryTextDigest(manifestBytes) || value.manifest.rawDigest !== MANIFEST_RAW_SHA256) {
    refuse("APPROVAL_MANIFEST_REFUSED", "approval manifest raw identity is wrong");
  }
  let manifest;
  try { manifest = auditMapModule.parseManifestText(utf8Decoder.decode(manifestBytes)); }
  catch { refuse("APPROVAL_MANIFEST_REFUSED", "approval manifest cannot be parsed"); }
  if (auditMapModule.auditManifest(manifest, { requireApproved: true }).length !== 0
      || value.manifest.planDigest !== MANIFEST_PLAN_DIGEST
      || auditMapModule.planDigest(manifest) !== MANIFEST_PLAN_DIGEST) {
    refuse("APPROVAL_MANIFEST_REFUSED", "approval manifest plan identity is wrong");
  }
  closedRecord(value.policy, ["path", "rawDigest", "canonicalDigest"], "APPROVAL_POLICY_REFUSED", "approval policy");
  if (!Buffer.isBuffer(policyBytes) || value.policy.path !== POLICY_RELATIVE_PATH
      || value.policy.rawDigest !== repositoryTextDigest(policyBytes) || value.policy.rawDigest !== POLICY_RAW_SHA256) {
    refuse("APPROVAL_POLICY_REFUSED", "approval policy raw identity is wrong");
  }
  let policy;
  try { policy = batchModule.validatePolicy(batchModule.parsePolicyText(utf8Decoder.decode(policyBytes))); }
  catch { refuse("APPROVAL_POLICY_REFUSED", "approval policy cannot be parsed"); }
  if (value.policy.canonicalDigest !== POLICY_CANONICAL_SHA256
      || batchModule.canonicalDigest(policy) !== POLICY_CANONICAL_SHA256) {
    refuse("APPROVAL_POLICY_REFUSED", "approval policy canonical identity is wrong");
  }
  closedRecord(value.runtime, ["gitExecutableDigest", "minimumNode"], "APPROVAL_RUNTIME_REFUSED", "approval runtime");
  if (value.runtime.gitExecutableDigest !== RUNTIME_GIT_SHA256 || value.runtime.minimumNode !== "18.19.0") {
    refuse("APPROVAL_RUNTIME_REFUSED", "approval runtime identity is wrong");
  }
  closedRecord(value.producer, ["path", "binding", "controllerReceiptSchema"], "APPROVAL_PRODUCER_REFUSED", "approval producer");
  if (value.producer.path !== PRODUCER_PATH || value.producer.binding !== "CONTROLLER_COMMIT_REQUIRED"
      || value.producer.controllerReceiptSchema !== "rd0873-native-fungi-audit-controller.v1") {
    refuse("APPROVAL_PRODUCER_REFUSED", "approval producer convention is wrong");
  }
  if (!/^[0-9a-f]{64}$/u.test(value.receiptDigest ?? "")
      || canonicalDigest(approvalBody(value)) !== value.receiptDigest) {
    refuse("APPROVAL_DIGEST_REFUSED", "approval receipt digest is invalid");
  }
  return value;
}

function semanticTaskRows(receipt) {
  return receipt.tasks.map((task) => ({
    id: task.id,
    ordinal: task.ordinal,
    lane: task.lane,
    outcome: task.outcome,
    reasonCode: task.reasonCode,
    exitCode: task.exitCode,
    stdoutBytes: task.stdoutBytes,
    stderrBytes: task.stderrBytes,
    stdoutDigest: task.stdoutDigest,
    stderrDigest: task.stderrDigest,
  }));
}

function outerBody(value) {
  const { receiptDigest: _receiptDigest, ...body } = value;
  return body;
}

function buildOuterReceipt({ approval, ownerEvidence, manifest, policy, innerReceipt, execution, sequential, batchModule }) {
  const body = {
    schema: OUTER_SCHEMA,
    authorizing: false,
    verdict: innerReceipt.verdict,
    controlPlaneStatus: "PENDING_CONTROLLER_COMMIT",
    subject: { owner: "galerina", head: FROZEN_SUBJECT_HEAD, tree: FROZEN_SUBJECT_TREE },
    controller: { owner: "agents", ...ownerEvidence },
    manifest: { ...approval.manifest },
    approval: {
      path: APPROVAL_RELATIVE_PATH,
      rawDigest: APPROVAL_RAW_SHA256,
      receiptDigest: approval.receiptDigest,
    },
    policy: { ...approval.policy },
    runtime: { gitExecutableDigest: RUNTIME_GIT_SHA256 },
    producer: { ...approval.producer },
    execution: {
      mode: sequential ? "sequential" : "parallel",
      concurrency: sequential ? 1 : policy.defaultConcurrency,
      preSnapshot: execution.preSnapshot,
      postSnapshot: execution.postSnapshot,
      semanticTaskDigest: canonicalDigest(semanticTaskRows(innerReceipt)),
    },
    innerReceipt,
  };
  return validateOuterReceipt(Object.freeze({ ...body, receiptDigest: canonicalDigest(body) }), { batchModule });
}

function validateOuterSnapshot(value) {
  closedRecord(value, [
    "schema", "head", "tree", "gitExecutableDigest", "gitAuthorityPinned", "clean", "statusBytes", "statusDigest",
  ], "OUTER_EXECUTION_REFUSED", "outer snapshot");
  const expectedStatusBytes = value.clean === true ? 0 : value.clean === false ? 1 : null;
  const expectedStatusDigest = sha256(Buffer.from(value.clean === true ? "" : "DIRTY", "utf8"));
  if (value.schema !== "bounded-tool-git-snapshot.v1" || value.head !== FROZEN_SUBJECT_HEAD
      || value.tree !== FROZEN_SUBJECT_TREE || value.gitExecutableDigest !== RUNTIME_GIT_SHA256
      || value.gitAuthorityPinned !== true || typeof value.clean !== "boolean" || value.statusBytes !== expectedStatusBytes
      || value.statusDigest !== expectedStatusDigest) {
    refuse("OUTER_EXECUTION_REFUSED", "outer snapshot identity is invalid");
  }
}

function validateInnerReceiptBinding(value, execution, batchModule) {
  closedRecord(value, [
    "schema", "authorizing", "verdict", "subject", "manifestDigest", "policyDigest", "mode", "concurrency",
    "preSnapshotDigest", "postSnapshotDigest", "snapshotStable", "integrityReason", "taskCounts", "tasks", "receiptDigest",
  ], "OUTER_INNER_REFUSED", "inner receipt");
  closedRecord(value.subject, ["id", "owner", "head"], "OUTER_INNER_REFUSED", "inner receipt subject");
  const { receiptDigest: _receiptDigest, ...body } = value;
  if (value.schema !== "bounded-tool-batch-receipt.v1" || value.authorizing !== false
      || value.subject.id !== "rd-0873-native-fungi-audit-base" || value.subject.owner !== "galerina"
      || value.subject.head !== FROZEN_SUBJECT_HEAD || value.manifestDigest !== MANIFEST_PLAN_DIGEST
      || value.policyDigest !== POLICY_CANONICAL_SHA256 || value.mode !== execution.mode
      || value.concurrency !== execution.concurrency
      || value.preSnapshotDigest !== canonicalDigest(execution.preSnapshot)
      || value.postSnapshotDigest !== canonicalDigest(execution.postSnapshot)
      || canonicalDigest(body) !== value.receiptDigest) {
    refuse("OUTER_INNER_REFUSED", "inner receipt identity or digest is invalid");
  }
  if ((typeof batchModule !== "object" && typeof batchModule !== "function")
      || typeof batchModule?.validateReceipt !== "function") {
    refuse("OUTER_INNER_REFUSED", "canonical batch validator is unavailable");
  }
  try { batchModule.validateReceipt(value); }
  catch { refuse("OUTER_INNER_REFUSED", "canonical inner receipt validation failed"); }
}

export function validateOuterReceipt(value, { batchModule = null } = {}) {
  closedRecord(value, [
    "schema", "authorizing", "verdict", "controlPlaneStatus", "subject", "controller", "manifest",
    "approval", "policy", "runtime", "producer", "execution", "innerReceipt", "receiptDigest",
  ], "OUTER_FIELD_UNKNOWN", "outer receipt");
  if (value.schema !== OUTER_SCHEMA || value.authorizing !== false
      || !["PASS", "FINDING", "REFUSED"].includes(value.verdict)
      || value.controlPlaneStatus !== "PENDING_CONTROLLER_COMMIT") {
    refuse("OUTER_SCHEMA_REFUSED", "outer receipt envelope is invalid");
  }
  closedRecord(value.subject, ["owner", "head", "tree"], "OUTER_SUBJECT_REFUSED", "outer subject");
  if (value.subject.owner !== "galerina" || value.subject.head !== FROZEN_SUBJECT_HEAD
      || value.subject.tree !== FROZEN_SUBJECT_TREE) refuse("OUTER_SUBJECT_REFUSED", "outer subject is wrong");
  closedRecord(value.controller, ["owner", "head", "tree", "controllers"], "OUTER_CONTROLLER_REFUSED", "outer controller");
  if (value.controller.owner !== "agents") refuse("OUTER_CONTROLLER_REFUSED", "outer controller owner is wrong");
  try { verifyControllerEvidence({ head: value.controller.head, tree: value.controller.tree, controllers: value.controller.controllers }); }
  catch { refuse("OUTER_CONTROLLER_REFUSED", "outer controller identity is wrong"); }
  closedRecord(value.manifest, ["path", "rawDigest", "planDigest"], "OUTER_MANIFEST_REFUSED", "outer manifest");
  if (value.manifest.path !== MANIFEST_RELATIVE_PATH || value.manifest.rawDigest !== MANIFEST_RAW_SHA256
      || value.manifest.planDigest !== MANIFEST_PLAN_DIGEST) refuse("OUTER_MANIFEST_REFUSED", "outer manifest is wrong");
  closedRecord(value.approval, ["path", "rawDigest", "receiptDigest"], "OUTER_APPROVAL_REFUSED", "outer approval");
  if (value.approval.path !== APPROVAL_RELATIVE_PATH || value.approval.rawDigest !== APPROVAL_RAW_SHA256
      || value.approval.receiptDigest !== APPROVAL_RECEIPT_DIGEST) {
    refuse("OUTER_APPROVAL_REFUSED", "outer approval is wrong");
  }
  closedRecord(value.policy, ["path", "rawDigest", "canonicalDigest"], "OUTER_POLICY_REFUSED", "outer policy");
  if (value.policy.path !== POLICY_RELATIVE_PATH || value.policy.rawDigest !== POLICY_RAW_SHA256
      || value.policy.canonicalDigest !== POLICY_CANONICAL_SHA256) refuse("OUTER_POLICY_REFUSED", "outer policy is wrong");
  closedRecord(value.runtime, ["gitExecutableDigest"], "OUTER_RUNTIME_REFUSED", "outer runtime");
  if (value.runtime.gitExecutableDigest !== RUNTIME_GIT_SHA256) refuse("OUTER_RUNTIME_REFUSED", "outer runtime is wrong");
  closedRecord(value.producer, ["path", "binding", "controllerReceiptSchema"], "OUTER_PRODUCER_REFUSED", "outer producer");
  if (value.producer.path !== PRODUCER_PATH || value.producer.binding !== "CONTROLLER_COMMIT_REQUIRED"
      || value.producer.controllerReceiptSchema !== "rd0873-native-fungi-audit-controller.v1") {
    refuse("OUTER_PRODUCER_REFUSED", "outer producer is wrong");
  }
  closedRecord(value.execution, ["mode", "concurrency", "preSnapshot", "postSnapshot", "semanticTaskDigest"], "OUTER_EXECUTION_REFUSED", "outer execution");
  validateOuterSnapshot(value.execution.preSnapshot);
  validateOuterSnapshot(value.execution.postSnapshot);
  if (!["parallel", "sequential"].includes(value.execution.mode)
      || value.execution.concurrency !== (value.execution.mode === "parallel" ? 2 : 1)
      || !/^[0-9a-f]{64}$/u.test(value.execution.semanticTaskDigest ?? "")
      || canonicalDigest(value.execution.preSnapshot) !== canonicalDigest(value.execution.postSnapshot)) {
    refuse("OUTER_EXECUTION_REFUSED", "outer execution identity is wrong or unstable");
  }
  if (!plainRecord(value.innerReceipt) || value.innerReceipt.verdict !== value.verdict
      || canonicalDigest(semanticTaskRows(value.innerReceipt)) !== value.execution.semanticTaskDigest) {
    refuse("OUTER_INNER_REFUSED", "outer receipt does not bind its inner receipt");
  }
  validateInnerReceiptBinding(value.innerReceipt, value.execution, batchModule);
  if (!/^[0-9a-f]{64}$/u.test(value.receiptDigest ?? "")
      || canonicalDigest(outerBody(value)) !== value.receiptDigest) {
    refuse("OUTER_DIGEST_REFUSED", "outer receipt digest is invalid");
  }
  return value;
}

function revalidateRunEvidence({ manifestPath, approvalPath, manifestDigest, approvalDigest, policyDigest, agentsRepositoryRoot, gitExecutablePath, ownerEvidence }) {
  const manifestAgain = readBoundedStableFile(manifestPath, MANIFEST_RELATIVE_PATH, "MANIFEST_FILE_REFUSED");
  const approvalAgain = readBoundedStableFile(approvalPath, APPROVAL_RELATIVE_PATH, "APPROVAL_FILE_REFUSED");
  const policyAgain = readBoundedStableFile(resolve(controllerRepositoryRoot, ...POLICY_RELATIVE_PATH.split("/")), POLICY_RELATIVE_PATH, "POLICY_FILE_REFUSED");
  if (repositoryTextDigest(manifestAgain) !== manifestDigest || repositoryTextDigest(approvalAgain) !== approvalDigest
      || repositoryTextDigest(policyAgain) !== policyDigest) {
    refuse("CONTROL_PLANE_DRIFT", "control-plane inputs changed during execution");
  }
  const recollected = collectControllerEvidence(agentsRepositoryRoot, gitExecutablePath);
  verifyControllerEvidence(recollected.evidence);
  if (canonicalDigest(recollected.evidence) !== canonicalDigest(ownerEvidence)) {
    refuse("OWNER_DRIFT_REFUSED", "controller evidence changed during execution");
  }
}

export async function runAudit({
  targetRepositoryRoot,
  agentsRepositoryRoot,
  gitExecutablePath,
  manifestPath,
  approvalPath,
  sequential = false,
  captureSnapshot,
  runTask,
} = {}) {
  const producerExpected = resolve(controllerRepositoryRoot, ...PRODUCER_PATH.split("/"));
  if (modulePath !== producerExpected || realpathSync.native(modulePath) !== producerExpected) {
    refuse("PRODUCER_PATH_REFUSED", "operator is not executing from its exact declared path");
  }
  const nodeMatch = /^(\d+)\.(\d+)\./u.exec(process.versions.node);
  if (!nodeMatch || Number(nodeMatch[1]) < 18 || (Number(nodeMatch[1]) === 18 && Number(nodeMatch[2]) < 19)) {
    refuse("NODE_RUNTIME_REFUSED", "Node 18.19 or later is required");
  }
  const targetRoot = exactCanonicalPath(targetRepositoryRoot, "SUBJECT_PATH_REFUSED", "directory");
  const manifestBytes = readBoundedStableFile(manifestPath, MANIFEST_RELATIVE_PATH, "MANIFEST_FILE_REFUSED");
  const approvalBytes = readBoundedStableFile(approvalPath, APPROVAL_RELATIVE_PATH, "APPROVAL_FILE_REFUSED");
  const policyPath = resolve(controllerRepositoryRoot, ...POLICY_RELATIVE_PATH.split("/"));
  const policyBytes = readBoundedStableFile(policyPath, POLICY_RELATIVE_PATH, "POLICY_FILE_REFUSED");
  if (repositoryTextDigest(manifestBytes) !== MANIFEST_RAW_SHA256) refuse("MANIFEST_FILE_REFUSED", "manifest repository-byte digest is not approved");
  if (repositoryTextDigest(approvalBytes) !== APPROVAL_RAW_SHA256) refuse("APPROVAL_FILE_REFUSED", "approval repository-byte digest is not approved");
  if (repositoryTextDigest(policyBytes) !== POLICY_RAW_SHA256) refuse("POLICY_FILE_REFUSED", "policy repository-byte digest is not approved");
  const loaded = await loadCanonicalControllers({ agentsRepositoryRoot, gitExecutablePath });
  const { auditMapModule: auditMap, batchModule: batch } = loaded;
  let manifest;
  let policy;
  try {
    manifest = auditMap.parseManifestText(utf8Decoder.decode(manifestBytes));
    policy = batch.validatePolicy(batch.parsePolicyText(utf8Decoder.decode(policyBytes)));
  } catch { refuse("CONTROL_PLANE_REFUSED", "manifest or policy parsing failed"); }
  const approval = parseApprovalText(utf8Decoder.decode(approvalBytes));
  validateApprovalReceipt(approval, { manifestBytes, policyBytes, auditMapModule: auditMap, batchModule: batch });
  const gitAuthority = verifyGitExecutable(gitExecutablePath, [targetRoot, agentsRepositoryRoot, controllerRepositoryRoot]);
  const admission = batch.admitBatch(manifest, policy, {
    repoRoot: targetRoot,
    sequential,
    gitAuthority,
  });
  if (admission.head !== FROZEN_SUBJECT_HEAD || admission.manifestDigest !== MANIFEST_PLAN_DIGEST
      || admission.policyDigest !== POLICY_CANONICAL_SHA256) {
    refuse("ADMISSION_REFUSED", "canonical admission does not bind the approved tuple");
  }
  const execution = await batch.executeBatch(admission, {
    captureSnapshot: captureSnapshot ?? batch.captureGitSnapshot,
    runTask: runTask ?? batch.runBoundedTool,
  });
  const innerReceipt = batch.buildReceipt(admission, execution);
  batch.validateReceipt(innerReceipt);
  if (execution.preSnapshot?.head !== FROZEN_SUBJECT_HEAD || execution.preSnapshot?.tree !== FROZEN_SUBJECT_TREE
      || execution.postSnapshot?.head !== FROZEN_SUBJECT_HEAD || execution.postSnapshot?.tree !== FROZEN_SUBJECT_TREE) {
    refuse("SUBJECT_SNAPSHOT_REFUSED", "inner receipt snapshots do not bind the frozen subject tree");
  }
  revalidateRunEvidence({
    manifestPath,
    approvalPath,
    manifestDigest: repositoryTextDigest(manifestBytes),
    approvalDigest: repositoryTextDigest(approvalBytes),
    policyDigest: repositoryTextDigest(policyBytes),
    agentsRepositoryRoot,
    gitExecutablePath,
    ownerEvidence: loaded.evidence,
  });
  batch.validateReceipt(innerReceipt);
  return buildOuterReceipt({
    approval,
    ownerEvidence: loaded.evidence,
    manifest,
    policy,
    innerReceipt,
    execution,
    sequential,
    batchModule: batch,
  });
}

function parseCli(argv) {
  if (!Array.isArray(argv) || argv[0] !== "run") refuse("USAGE_REFUSED", "expected run command");
  const values = new Map();
  let sequential = false;
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--sequential" && !sequential) { sequential = true; continue; }
    if (!["--target-root", "--agents-repo", "--git", "--manifest", "--approval"].includes(token)
        || values.has(token) || typeof argv[index + 1] !== "string") {
      refuse("USAGE_REFUSED", "operator arguments are missing, unknown, or duplicated");
    }
    values.set(token, argv[index + 1]);
    index += 1;
  }
  for (const key of ["--target-root", "--agents-repo", "--git", "--manifest", "--approval"]) {
    if (!values.has(key)) refuse("USAGE_REFUSED", `${key} is required`);
  }
  return Object.freeze({
    targetRepositoryRoot: values.get("--target-root"),
    agentsRepositoryRoot: values.get("--agents-repo"),
    gitExecutablePath: values.get("--git"),
    manifestPath: values.get("--manifest"),
    approvalPath: values.get("--approval"),
    sequential,
  });
}

export async function runCli(argv, {
  writeStdout = (text) => process.stdout.write(text),
  writeStderr = (text) => process.stderr.write(text),
} = {}) {
  try {
    const receipt = await runAudit(parseCli(argv));
    const output = `${JSON.stringify(canonical(receipt))}\n`;
    if (Buffer.byteLength(output, "utf8") > 1_048_576) refuse("OUTER_OUTPUT_REFUSED", "outer receipt exceeds output ceiling");
    writeStdout(output);
    return receipt.verdict === "PASS" ? 0 : receipt.verdict === "FINDING" ? 1 : 2;
  } catch (error) {
    writeStderr(`REFUSED: ${typeof error?.code === "string" ? error.code : "OPERATOR_REFUSED"}\n`);
    return 2;
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === modulePath;
if (isMain) process.exitCode = await runCli(process.argv.slice(2));
