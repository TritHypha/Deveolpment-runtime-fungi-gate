import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync,
  statSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE_HEAD = "f6261ef362f0583896e24039547da33c5f0d052d";
const BASE_TREE = "d2b100ae35abf8dbcdf18f408afc525dafc570d0";
const AGENTS_HEAD = "e654756036d756e72b3de20b395278fcd0eecc1c";
const AGENTS_TREE = "d7d774b1a0630929ad3fd66a99a35d7a31b5a7e2";
const AGENTS_CONTROLLERS = Object.freeze({
  "tools/audit-map.mjs": Object.freeze({
    blob: "9afd01b0e61879862d1fe84d781051662ae6e245",
    bytes: "9ba23d9f963dd96398ac291b192f99ff46a8819b750c81ef171a282308b29db0",
  }),
  "tools/bounded-tool-batch.mjs": Object.freeze({
    blob: "7a48da4b11471474716bff450e1c81a6de3defb4",
    bytes: "3413baeaa1a6bb2c7c6d62713e65aede0902374d73f233fa44caa20bd2de4ba4",
  }),
});
const EMPTY_DIGEST = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const testFilePath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(testFilePath), "..", "..");
const manifestPath = join(repositoryRoot, "governance", "rd0873-native-fungi-audit-map.json");
const approvalPath = join(repositoryRoot, "governance", "rd0873-native-fungi-audit-approval.json");
const policyPath = join(repositoryRoot, "tools", "bounded-tool-batch-policy.json");
const operatorPath = join(repositoryRoot, "scripts", "run-rd0873-native-fungi-audit.mjs");
const agentsRoot = process.env.AGENTS_ROOT;
const gitPath = process.env.RD0873_GIT_PATH;

function refuse(code, message) {
  const error = new Error(`REFUSED: ${code}: ${message}`);
  error.code = code;
  throw error;
}

function runGit(root, args, accepted = [0]) {
  assert.equal(typeof gitPath, "string", "RD0873_GIT_PATH is required");
  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = spawnSync(gitPath, ["-c", `safe.directory=${root}`, "-c", "core.hooksPath=__disabled__", "-c", "core.fsmonitor=false", "-C", root, ...args], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      WINDIR: process.env.WINDIR,
      GIT_CONFIG_GLOBAL: nullDevice,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
    },
    maxBuffer: 1_048_576,
    timeout: 30_000,
    windowsHide: true,
  });
  if (result.error || !accepted.includes(result.status)) {
    refuse("OWNER_GIT_REFUSED", `non-executing Git identity operation failed: ${args[0] ?? "unknown"}`);
  }
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const operator = await import(pathToFileURL(operatorPath).href);
const { auditMapModule: auditMap, batchModule: batch, evidence: ownerEvidence } = await operator.loadCanonicalControllers({
  agentsRepositoryRoot: agentsRoot,
  gitExecutablePath: gitPath,
});
const manifest = auditMap.parseManifestText(readFileSync(manifestPath, "utf8"));
const policy = batch.validatePolicy(batch.parsePolicyText(readFileSync(policyPath, "utf8")));

function approve(value) {
  value.approval = {
    status: "APPROVED",
    planDigest: null,
    authority: "authority://galerina/rd-0873-native-fungi-audit",
    evidence: "receipt://galerina/rd-0873-native-fungi-audit-approval.json",
  };
  value.approval.planDigest = auditMap.planDigest(value);
  return value;
}

function refusalCode(callback) {
  try { callback(); }
  catch (error) { return error?.code ?? error?.message; }
  return null;
}

function parseToolReceipt(toolPath) {
  const result = spawnSync(process.execPath, [join(repositoryRoot, ...toolPath.split("/"))], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 1_048_576,
    timeout: 120_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${toolPath}: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

function semanticRows(receipt) {
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

function stableSubjectSnapshot() {
  return Object.freeze({
    schema: "bounded-tool-git-snapshot.v1",
    head: BASE_HEAD,
    tree: BASE_TREE,
    gitExecutableDigest: operator.RUNTIME_GIT_SHA256,
    gitAuthorityPinned: true,
    clean: true,
    statusBytes: 0,
    statusDigest: EMPTY_DIGEST,
  });
}

async function passingTask(task) {
  return {
    kind: "EXITED",
    exitCode: 0,
    durationMs: 0,
    stdoutBytes: task.id.length,
    stderrBytes: 0,
    stdoutDigest: sha256(Buffer.from(task.id, "utf8")),
    stderrDigest: EMPTY_DIGEST,
  };
}

function runRawGit(argv, cwd) {
  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = spawnSync(gitPath, argv, {
    cwd,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      WINDIR: process.env.WINDIR,
      GIT_CONFIG_GLOBAL: nullDevice,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0",
    },
    maxBuffer: 16_777_216,
    timeout: 120_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${argv[0]}: ${result.stderr}`);
  return result.stdout.trim();
}

function makeFixture(t, toolNames) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "rd0873-audit-fixture-"));
  const fixtureRepository = join(fixtureRoot, "repository");
  const fixtureTools = join(fixtureRepository, "tools");
  mkdirSync(fixtureTools, { recursive: true });
  copyFileSync(join(repositoryRoot, "tools", "rd0873-read-only-audit-lib.mjs"), join(fixtureTools, "rd0873-read-only-audit-lib.mjs"));
  for (const toolName of toolNames) copyFileSync(join(repositoryRoot, "tools", toolName), join(fixtureTools, toolName));
  t.after(() => {
    const rel = relative(tmpdir(), fixtureRoot);
    if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("temporary fixture escaped temp root");
    rmSync(fixtureRoot, { recursive: true, force: true });
  });
  return { fixtureRoot, fixtureRepository };
}

function writeFixture(repository, relativePath, bytes) {
  const target = resolve(repository, ...relativePath.split("/"));
  const rel = relative(repository, target);
  assert.equal(rel === "" || rel === ".." || rel.startsWith(`..${sep}`), false);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return target;
}

function runFixtureTool(repository, toolName, args = []) {
  return spawnSync(process.execPath, [join(repository, "tools", toolName), ...args], {
    cwd: repository,
    encoding: "utf8",
    maxBuffer: 1_048_576,
    timeout: 120_000,
    windowsHide: true,
  });
}

test("test harness remains statically compatible with Node 18", () => {
  const source = readFileSync(testFilePath, "utf8");
  const forbidden = [
    ["import", "meta", "dirname"].join("."),
    ["Promise", "withResolvers"].join("."),
    ["Array", "fromAsync"].join("."),
    ["Object", "groupBy"].join("."),
  ];
  for (const token of forbidden) assert.equal(source.includes(token), false, token);
  assert.equal(dirname(fileURLToPath(import.meta.url)), dirname(testFilePath));
});

test("stale wrong and reordered AGENTS controller evidence refuses before import", async () => {
  const cases = [
    ["OWNER_HEAD_REFUSED", (value) => { value.head = "f".repeat(40); }],
    ["OWNER_TREE_REFUSED", (value) => { value.tree = "e".repeat(40); }],
    ["OWNER_BLOB_REFUSED", (value) => { value.controllers[0].blob = "d".repeat(40); }],
    ["OWNER_BYTES_REFUSED", (value) => { value.controllers[1].bytesDigest = "c".repeat(64); }],
    ["OWNER_ORDER_REFUSED", (value) => { value.controllers.reverse(); }],
  ];
  for (const [expected, mutate] of cases) {
    const evidence = structuredClone(ownerEvidence);
    mutate(evidence);
    let imports = 0;
    assert.throws(() => operator.verifyControllerEvidence(evidence, {
      beforeImport: () => { imports += 1; },
    }), (error) => error?.code === expected);
    assert.equal(imports, 0, expected);
  }
});

test("a hostile wrong-owner repository cannot execute top-level sentinel code", async (t) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "rd0873-hostile-owner-"));
  const hostileRoot = join(fixtureRoot, "AGENTS");
  const sentinel = join(fixtureRoot, "sentinel.txt");
  mkdirSync(join(hostileRoot, "tools"), { recursive: true });
  const hostileSource = [
    'import { writeFileSync } from "node:fs";',
    'writeFileSync(process.env.RD0873_SENTINEL, "executed");',
    "export const poisoned = true;",
  ].join("\n");
  writeFileSync(join(hostileRoot, "tools", "audit-map.mjs"), hostileSource);
  writeFileSync(join(hostileRoot, "tools", "bounded-tool-batch.mjs"), hostileSource);
  runGit(hostileRoot, ["init"]);
  runGit(hostileRoot, ["config", "user.name", "RD0873 Test"]);
  runGit(hostileRoot, ["config", "user.email", "rd0873@example.invalid"]);
  runGit(hostileRoot, ["add", "tools/audit-map.mjs", "tools/bounded-tool-batch.mjs"]);
  runGit(hostileRoot, ["commit", "-m", "hostile fixture"]);
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  await assert.rejects(operator.loadCanonicalControllers({
    agentsRepositoryRoot: hostileRoot,
    gitExecutablePath: gitPath,
  }), (error) => error?.code === "OWNER_HEAD_REFUSED");
  assert.equal(existsSync(sentinel), false);
});

test("canonical AGENTS owner is exact committed and exports both controllers", () => {
  assert.equal(ownerEvidence.head, AGENTS_HEAD);
  assert.equal(ownerEvidence.tree, AGENTS_TREE);
  assert.deepEqual(ownerEvidence.controllers, Object.entries(AGENTS_CONTROLLERS).map(([path, identity]) => ({
    path,
    blob: identity.blob,
    bytesDigest: identity.bytes,
  })));
  assert.equal(typeof auditMap.auditManifest, "function");
  assert.equal(typeof batch.runCli, "function");
});

test("bounded operator pins the frozen subject and exact controller tuple", () => {
  assert.equal(operator.FROZEN_SUBJECT_HEAD, BASE_HEAD);
  assert.equal(operator.FROZEN_SUBJECT_TREE, BASE_TREE);
  assert.equal(operator.CANONICAL_AGENTS_HEAD, AGENTS_HEAD);
  assert.equal(operator.CANONICAL_AGENTS_TREE, AGENTS_TREE);
  assert.deepEqual(operator.CANONICAL_CONTROLLERS, AGENTS_CONTROLLERS);
  assert.equal(operator.PRODUCER_PATH, "scripts/run-rd0873-native-fungi-audit.mjs");
});

test("approved exact-base DAG is closed bounded and ordered", () => {
  assert.deepEqual(auditMap.auditManifest(manifest, { requireApproved: true }), []);
  assert.equal(manifest.subject.locator, `git://galerina/${BASE_HEAD}`);
  assert.equal(manifest.approval.evidence, "receipt://galerina/governance/rd0873-native-fungi-audit-approval.json");
  assert.equal(policy.defaultConcurrency, 2);
  assert.equal(policy.maximumConcurrency, 4);
  assert.deepEqual(manifest.audits.map(({ id, dependsOn }) => ({ id, dependsOn })), [
    { id: "corpus-packages-fungi", dependsOn: [] },
    { id: "corpus-self-hosted", dependsOn: [] },
    { id: "static-snippets", dependsOn: ["corpus-packages-fungi", "corpus-self-hosted"] },
    { id: "generated-state", dependsOn: ["static-snippets"] },
    { id: "final-check", dependsOn: ["generated-state"] },
  ]);
  assert.equal(manifest.audits.every((audit) => Number.isSafeInteger(audit.timeoutMs) && audit.timeoutMs > 0), true);
  assert.equal(manifest.audits.every((audit) => Number.isSafeInteger(audit.maxOutputBytes) && audit.maxOutputBytes > 0), true);
  assert.deepEqual(manifest.audits.map((audit) => audit.exit), Array.from({ length: 5 }, () => ({
    pass: [0], finding: [1], refused: [2],
  })));
});

test("tracked approval receipt closes the subject controller manifest policy runtime and producer convention", () => {
  const approvalBytes = readFileSync(approvalPath);
  const approval = operator.parseApprovalText(approvalBytes.toString("utf8"));
  assert.equal(operator.validateApprovalReceipt(approval, {
    manifestBytes: readFileSync(manifestPath),
    policyBytes: readFileSync(policyPath),
    auditMapModule: auditMap,
    batchModule: batch,
  }), approval);
  assert.deepEqual(Object.keys(approval).sort(), [
    "authority", "authorizing", "controller", "manifest", "policy", "producer", "receiptDigest",
    "runtime", "schema", "status", "subject",
  ]);
  assert.equal(approval.schema, "rd0873-native-fungi-audit-approval.v1");
  assert.equal(approval.status, "APPROVED");
  assert.equal(approval.authorizing, false);
  assert.deepEqual(approval.subject, { owner: "galerina", head: BASE_HEAD, tree: BASE_TREE });
  assert.deepEqual(approval.controller, {
    owner: "agents",
    head: AGENTS_HEAD,
    tree: AGENTS_TREE,
    controllers: Object.entries(AGENTS_CONTROLLERS).map(([path, identity]) => ({
      path,
      blob: identity.blob,
      bytesDigest: identity.bytes,
    })),
  });
  assert.equal(approval.manifest.path, "governance/rd0873-native-fungi-audit-map.json");
  assert.equal(approval.manifest.planDigest, auditMap.planDigest(manifest));
  assert.equal(approval.manifest.rawDigest, operator.repositoryTextDigest(readFileSync(manifestPath)));
  assert.equal(approval.policy.path, "tools/bounded-tool-batch-policy.json");
  assert.equal(approval.policy.rawDigest, operator.repositoryTextDigest(readFileSync(policyPath)));
  assert.equal(approval.policy.canonicalDigest, batch.canonicalDigest(policy));
  assert.equal(approval.runtime.gitExecutableDigest, operator.RUNTIME_GIT_SHA256);
  assert.deepEqual(approval.producer, {
    path: "scripts/run-rd0873-native-fungi-audit.mjs",
    binding: "CONTROLLER_COMMIT_REQUIRED",
    controllerReceiptSchema: "rd0873-native-fungi-audit-controller.v1",
  });
  assert.equal(operator.repositoryTextDigest(approvalBytes), operator.APPROVAL_RAW_SHA256);
});

test("repository text digest accepts Git-declared CRLF checkout bytes and refuses ambiguous carriage returns", () => {
  const manifestBytes = readFileSync(manifestPath);
  const crlfBytes = Buffer.from(manifestBytes.toString("utf8").replace(/\n/gu, "\r\n"), "utf8");
  assert.equal(operator.repositoryTextDigest(manifestBytes), operator.MANIFEST_RAW_SHA256);
  assert.equal(operator.repositoryTextDigest(crlfBytes), operator.MANIFEST_RAW_SHA256);
  assert.throws(
    () => operator.repositoryTextDigest(Buffer.from("{\r}\n", "utf8")),
    (error) => error?.code === "CONTROL_TEXT_REFUSED",
  );
});

test("approval receipt refuses missing reordered unknown and one-field mutations", () => {
  const base = operator.parseApprovalText(readFileSync(approvalPath, "utf8"));
  const cases = [
    ["APPROVAL_FIELD_UNKNOWN", (value) => { value.unknown = true; }],
    ["APPROVAL_CONTROLLER_ORDER_REFUSED", (value) => { value.controller.controllers.reverse(); }],
    ["APPROVAL_SUBJECT_REFUSED", (value) => { value.subject.tree = "f".repeat(40); }],
    ["APPROVAL_MANIFEST_REFUSED", (value) => { value.manifest.rawDigest = "e".repeat(64); }],
    ["APPROVAL_POLICY_REFUSED", (value) => { value.policy.canonicalDigest = "d".repeat(64); }],
    ["APPROVAL_RUNTIME_REFUSED", (value) => { value.runtime.gitExecutableDigest = "c".repeat(64); }],
    ["APPROVAL_PRODUCER_REFUSED", (value) => { delete value.producer.binding; }],
    ["APPROVAL_DIGEST_REFUSED", (value) => { value.receiptDigest = "b".repeat(64); }],
  ];
  for (const [expected, mutate] of cases) {
    const value = structuredClone(base);
    mutate(value);
    assert.throws(() => operator.validateApprovalReceipt(value, {
      manifestBytes: readFileSync(manifestPath),
      policyBytes: readFileSync(policyPath),
      auditMapModule: auditMap,
      batchModule: batch,
    }), (error) => error?.code === expected, expected);
  }
});

test("operator outer receipts bind full snapshots and preserve parallel sequential semantics", async () => {
  const run = (sequential) => operator.runAudit({
    targetRepositoryRoot: repositoryRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    sequential,
    captureSnapshot: async () => stableSubjectSnapshot(),
    runTask: passingTask,
  });
  const parallel = await run(false);
  const sequential = await run(true);
  assert.equal(operator.validateOuterReceipt(parallel, { batchModule: batch }), parallel);
  assert.equal(operator.validateOuterReceipt(sequential, { batchModule: batch }), sequential);
  assert.equal(parallel.authorizing, false);
  assert.equal(parallel.controlPlaneStatus, "PENDING_CONTROLLER_COMMIT");
  assert.equal(parallel.execution.mode, "parallel");
  assert.equal(parallel.execution.concurrency, 2);
  assert.equal(sequential.execution.mode, "sequential");
  assert.equal(sequential.execution.concurrency, 1);
  assert.deepEqual(parallel.execution.preSnapshot, stableSubjectSnapshot());
  assert.deepEqual(parallel.execution.postSnapshot, stableSubjectSnapshot());
  assert.deepEqual(semanticRows(parallel.innerReceipt), semanticRows(sequential.innerReceipt));
  assert.equal(parallel.execution.semanticTaskDigest, sequential.execution.semanticTaskDigest);
});

test("outer receipt refuses unknown subject controller and digest mutations", async () => {
  const receipt = await operator.runAudit({
    targetRepositoryRoot: repositoryRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    captureSnapshot: async () => stableSubjectSnapshot(),
    runTask: passingTask,
  });
  const cases = [
    ["OUTER_FIELD_UNKNOWN", (value) => { value.unknown = true; }],
    ["OUTER_SUBJECT_REFUSED", (value) => { value.subject.tree = "f".repeat(40); }],
    ["OUTER_CONTROLLER_REFUSED", (value) => { value.controller.controllers.reverse(); }],
    ["OUTER_DIGEST_REFUSED", (value) => { value.receiptDigest = "e".repeat(64); }],
  ];
  for (const [expected, mutate] of cases) {
    const value = structuredClone(receipt);
    mutate(value);
    assert.throws(() => operator.validateOuterReceipt(value, { batchModule: batch }), (error) => error?.code === expected, expected);
  }
});

test("outer receipt refuses recomputed reviewer mutants", async (t) => {
  const receipt = await operator.runAudit({
    targetRepositoryRoot: repositoryRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    captureSnapshot: async () => stableSubjectSnapshot(),
    runTask: passingTask,
  });
  const resign = (value) => {
    const { receiptDigest: _receiptDigest, ...body } = value;
    value.receiptDigest = operator.canonicalDigest(body);
  };
  const cases = [
    ["OUTER_EXECUTION_REFUSED", (value) => {
      value.execution.preSnapshot.head = "f".repeat(40);
      value.execution.postSnapshot.head = "f".repeat(40);
    }],
    ["OUTER_APPROVAL_REFUSED", (value) => { value.approval.receiptDigest = "e".repeat(64); }],
    ["OUTER_INNER_REFUSED", (value) => { value.innerReceipt.subject.head = "d".repeat(40); }],
  ];
  for (const [expected, mutate] of cases) {
    await t.test(expected, () => {
      const value = structuredClone(receipt);
      mutate(value);
      resign(value);
      assert.throws(() => operator.validateOuterReceipt(value, { batchModule: batch }), (error) => error?.code === expected, expected);
    });
  }
});

test("wrong subject snapshot and path-hostile manifest refuse with zero task launches", async (t) => {
  let launches = 0;
  await assert.rejects(operator.runAudit({
    targetRepositoryRoot: repositoryRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    captureSnapshot: async () => ({ ...stableSubjectSnapshot(), head: "f".repeat(40) }),
    runTask: async (task) => { launches += 1; return passingTask(task); },
  }), (error) => error?.code === "SUBJECT_SNAPSHOT_REFUSED");
  assert.equal(launches, 0);

  const hostileRoot = mkdtempSync(join(tmpdir(), "rd0873-hostile-manifest-"));
  const hostileManifest = join(hostileRoot, "manifest.json");
  writeFileSync(hostileManifest, readFileSync(manifestPath));
  t.after(() => rmSync(hostileRoot, { recursive: true, force: true }));
  await assert.rejects(operator.runAudit({
    targetRepositoryRoot: repositoryRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath: hostileManifest,
    approvalPath,
    captureSnapshot: async () => stableSubjectSnapshot(),
    runTask: async (task) => { launches += 1; return passingTask(task); },
  }), (error) => error?.code === "MANIFEST_FILE_REFUSED");
  assert.equal(launches, 0);
});

test("policy admits only the five real read-only entry points in prescribed lanes", () => {
  assert.deepEqual(policy.tools.map(({ path, lane, temporaryState, argumentMode }) => ({
    path, lane, temporaryState, argumentMode,
  })), [
    { path: "tools/rd0873-corpus-packages-fungi.mjs", lane: "parallel-read", temporaryState: "none", argumentMode: "none" },
    { path: "tools/rd0873-corpus-self-hosted.mjs", lane: "parallel-read", temporaryState: "none", argumentMode: "none" },
    { path: "tools/rd0873-static-snippets.mjs", lane: "snapshot-read", temporaryState: "none", argumentMode: "none" },
    { path: "tools/rd0873-generated-state.mjs", lane: "exclusive", temporaryState: "none", argumentMode: "none" },
    { path: "tools/rd0873-final-check.mjs", lane: "exclusive", temporaryState: "none", argumentMode: "none" },
  ]);
  const admission = batch.admitBatch(manifest, policy, { repoRoot: repositoryRoot });
  assert.equal(admission.concurrency, 2);
  assert.deepEqual(admission.tasks.map(({ id, lane }) => ({ id, lane })), [
    { id: "corpus-packages-fungi", lane: "parallel-read" },
    { id: "corpus-self-hosted", lane: "parallel-read" },
    { id: "static-snippets", lane: "snapshot-read" },
    { id: "generated-state", lane: "exclusive" },
    { id: "final-check", lane: "exclusive" },
  ]);
});

test("each local entry point emits one bounded non-authorizing receipt", () => {
  for (const tool of policy.tools) {
    const receipt = parseToolReceipt(tool.path);
    assert.equal(receipt.schema, "rd0873-read-only-audit.v1", tool.path);
    assert.equal(receipt.authorizing, false, tool.path);
    assert.equal(receipt.verdict, "PASS", tool.path);
    assert.match(receipt.digest, /^[0-9a-f]{64}$/u, tool.path);
    assert.equal(Number.isSafeInteger(receipt.files) && receipt.files > 0, true, tool.path);
    assert.equal(Object.hasOwn(receipt, "elapsedMs"), false, tool.path);
  }
});

test("local entry points refuse ambient argv even outside the controller", () => {
  for (const tool of policy.tools) {
    const result = spawnSync(process.execPath, [join(repositoryRoot, ...tool.path.split("/")), "unexpected"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 1_048_576,
      timeout: 120_000,
      windowsHide: true,
    });
    assert.equal(result.status, 2, tool.path);
    assert.match(result.stderr, /REFUSED: ARGV_REFUSED/u, tool.path);
  }
});

test("corpus wrapper refuses an intermediate junction escape", (t) => {
  const { fixtureRoot, fixtureRepository } = makeFixture(t, ["rd0873-corpus-packages-fungi.mjs"]);
  const outside = join(fixtureRoot, "outside-fungi");
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(outside, "escape.fungi"), "flow escaped() {}\n");
  mkdirSync(join(fixtureRepository, "packages"), { recursive: true });
  symlinkSync(outside, join(fixtureRepository, "packages", "fungi"), "junction");
  const result = runFixtureTool(fixtureRepository, "rd0873-corpus-packages-fungi.mjs");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /REFUSED: PATH_(?:LINK|ALIAS)/u);
});

test("audit locator traversal refuses before a corpus read", (t) => {
  const { fixtureRepository } = makeFixture(t, []);
  writeFixture(fixtureRepository, "tools/traversal.mjs", [
    'import { auditCorpus, runAudit } from "./rd0873-read-only-audit-lib.mjs";',
    'runAudit(() => auditCorpus("traversal", "packages/../outside"));',
  ].join("\n"));
  const result = runFixtureTool(fixtureRepository, "traversal.mjs");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /REFUSED: PATH_INVALID/u);
});

test("corpus wrapper refuses oversized and invalid UTF-8 files", (t) => {
  for (const [label, bytes, expected] of [
    ["oversized", Buffer.alloc(8_388_609, 0x61), "FILE_TOO_LARGE"],
    ["invalid UTF-8", Buffer.from([0xff]), "UTF8_INVALID"],
  ]) {
    const { fixtureRepository } = makeFixture(t, ["rd0873-corpus-packages-fungi.mjs"]);
    writeFixture(fixtureRepository, "packages/fungi/input.fungi", bytes);
    const result = runFixtureTool(fixtureRepository, "rd0873-corpus-packages-fungi.mjs");
    assert.equal(result.status, 2, label);
    assert.match(result.stderr, new RegExp(`REFUSED: ${expected}`, "u"), label);
  }
});

test("corpus wrapper refuses a controlled post-read identity mutation", (t) => {
  const { fixtureRepository } = makeFixture(t, ["rd0873-corpus-packages-fungi.mjs"]);
  const libraryPath = join(fixtureRepository, "tools", "rd0873-read-only-audit-lib.mjs");
  const original = readFileSync(libraryPath, "utf8");
  const withWriter = original.replace("closeSync, constants, fstatSync", "closeSync, constants, fstatSync, writeFileSync");
  const mutated = withWriter.replace(
    "    bytes = readFileSync(descriptor);\n    const descriptorAfter = fstatSync(descriptor, { bigint: true });",
    "    bytes = readFileSync(descriptor);\n    writeFileSync(path, Buffer.concat([bytes, Buffer.from(\"mutation\")]));\n    const descriptorAfter = fstatSync(descriptor, { bigint: true });",
  );
  assert.notEqual(mutated, original);
  writeFileSync(libraryPath, mutated);
  writeFixture(fixtureRepository, "packages/fungi/input.fungi", "flow input() {}\n");
  const result = runFixtureTool(fixtureRepository, "rd0873-corpus-packages-fungi.mjs");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /REFUSED: FILE_CHANGED/u);
});

test("generated-state wrapper refuses invalid JSON", (t) => {
  const { fixtureRepository } = makeFixture(t, ["rd0873-generated-state.mjs"]);
  writeFixture(fixtureRepository, "build/code-index/code-index.json", "{invalid\n");
  writeFixture(fixtureRepository, "build/code-registry/registry.json", "{}\n");
  const result = runFixtureTool(fixtureRepository, "rd0873-generated-state.mjs");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /REFUSED: GENERATED_JSON_INVALID/u);
});

test("corpus wrapper reports an empty corpus and refuses unsupported entries", (t) => {
  const empty = makeFixture(t, ["rd0873-corpus-packages-fungi.mjs"]);
  mkdirSync(join(empty.fixtureRepository, "packages", "fungi"), { recursive: true });
  const emptyResult = runFixtureTool(empty.fixtureRepository, "rd0873-corpus-packages-fungi.mjs");
  assert.equal(emptyResult.status, 1);
  assert.match(emptyResult.stdout, /"code":"CORPUS_EMPTY"/u);

  const unsupported = makeFixture(t, ["rd0873-corpus-packages-fungi.mjs"]);
  writeFixture(unsupported.fixtureRepository, "packages/fungi/README.txt", "unsupported\n");
  const unsupportedResult = runFixtureTool(unsupported.fixtureRepository, "rd0873-corpus-packages-fungi.mjs");
  assert.equal(unsupportedResult.status, 2);
  assert.match(unsupportedResult.stderr, /REFUSED: ENTRY_UNSUPPORTED/u);
});

test("corpus traversal work is bounded independently of selected fungi files", (t) => {
  const { fixtureRepository } = makeFixture(t, ["rd0873-corpus-packages-fungi.mjs"]);
  const corpusRoot = join(fixtureRepository, "packages", "fungi");
  mkdirSync(corpusRoot, { recursive: true });
  for (let index = 0; index < 1_025; index += 1) {
    mkdirSync(join(corpusRoot, `directory-${String(index).padStart(4, "0")}`));
  }
  const result = runFixtureTool(fixtureRepository, "rd0873-corpus-packages-fungi.mjs");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /REFUSED: ENTRY_CEILING/u);
});

test("unsafe Myco graph index Git dist shell missing bounds cycles and unlisted tools refuse", () => {
  const mutations = [
    ["Myco refresh", (value) => { value.audits[0].argv = ["node", "tools/myco-refresh.mjs"]; }, "TOOL_NOT_ADMITTED"],
    ["graph writer", (value) => { value.audits[0].argv = ["node", "tools/graph-write.mjs"]; }, "TOOL_NOT_ADMITTED"],
    ["index writer", (value) => { value.audits[0].argv = ["node", "tools/index-write.mjs"]; }, "TOOL_NOT_ADMITTED"],
    ["Git", (value) => { value.audits[0].argv = ["git", "status"]; }, "EXECUTABLE_REFUSED"],
    ["shared dist writer", (value) => { value.audits[0].argv = ["node", "tools/build-dist.mjs"]; }, "TOOL_NOT_ADMITTED"],
    ["shell string", (value) => { value.audits[0].argv = ["node", "tools/rd0873-corpus-packages-fungi.mjs && git status"]; }, "SCRIPT_PATH_REFUSED"],
    ["missing timeout", (value) => { delete value.audits[0].timeoutMs; }, "MANIFEST_REFUSED"],
    ["missing output bound", (value) => { delete value.audits[0].maxOutputBytes; }, "MANIFEST_REFUSED"],
    ["cycle", (value) => { value.audits[0].dependsOn = ["final-check"]; }, "MANIFEST_REFUSED"],
    ["unlisted tool", (value) => { value.audits[0].argv = ["node", "tools/unknown.mjs"]; }, "TOOL_NOT_ADMITTED"],
  ];
  for (const [label, mutate, expected] of mutations) {
    const value = structuredClone(manifest);
    mutate(value);
    approve(value);
    assert.equal(refusalCode(() => batch.admitBatch(value, policy, { repoRoot: repositoryRoot })), expected, label);
  }
});

test("audited base HEAD is exact and any different current snapshot refuses", async () => {
  const admission = batch.admitBatch(manifest, policy, { repoRoot: repositoryRoot });
  let launches = 0;
  const execution = await batch.executeBatch(admission, {
    captureSnapshot: async () => ({
      schema: "bounded-tool-git-snapshot.v1",
      head: "f".repeat(40),
      clean: true,
      statusBytes: 0,
      statusDigest: EMPTY_DIGEST,
    }),
    runTask: async () => {
      launches += 1;
      return {
        kind: "EXITED", exitCode: 0, durationMs: 0, stdoutBytes: 0, stderrBytes: 0,
        stdoutDigest: EMPTY_DIGEST, stderrDigest: EMPTY_DIGEST,
      };
    },
  });
  assert.equal(execution.integrity, "REFUSED");
  assert.equal(execution.integrityReason, "HEAD_MISMATCH");
  assert.equal(launches, 0);
});

test("canonical normal and sequential CLI runs preserve ordered outcomes and output digests", async () => {
  const stableSnapshot = Object.freeze({
    schema: "bounded-tool-git-snapshot.v1",
    head: BASE_HEAD,
    tree: BASE_TREE,
    gitExecutableDigest: operator.RUNTIME_GIT_SHA256,
    gitAuthorityPinned: true,
    clean: true,
    statusBytes: 0,
    statusDigest: EMPTY_DIGEST,
  });
  const runTask = async (task) => ({
    kind: "EXITED",
    exitCode: 0,
    durationMs: 0,
    stdoutBytes: task.id.length,
    stderrBytes: 0,
    stdoutDigest: sha256(Buffer.from(task.id, "utf8")),
    stderrDigest: EMPTY_DIGEST,
  });
  const run = async (sequential) => {
    const stdout = [];
    const stderr = [];
    const argv = ["run", manifestPath, "--format", "json", ...(sequential ? ["--sequential"] : [])];
    const exit = await batch.runCli(argv, {
      repoRoot: repositoryRoot,
      captureSnapshot: async () => stableSnapshot,
      runTask,
      gitAuthority: { path: gitPath, digest: operator.RUNTIME_GIT_SHA256 },
      skipSelfTest: true,
      writeStdout: (text) => stdout.push(text),
      writeStderr: (text) => stderr.push(text),
    });
    assert.equal(exit, 0);
    assert.deepEqual(stderr, []);
    return JSON.parse(stdout.at(-1));
  };
  const normal = await run(false);
  const sequential = await run(true);
  assert.equal(normal.mode, "parallel");
  assert.equal(normal.concurrency, 2);
  assert.equal(sequential.mode, "sequential");
  assert.equal(sequential.concurrency, 1);
  assert.equal(normal.authorizing, false);
  assert.equal(sequential.authorizing, false);
  assert.deepEqual(normal.taskCounts, { total: 5, pass: 5, finding: 0, refused: 0, skipped: 0 });
  assert.deepEqual(sequential.taskCounts, normal.taskCounts);
  assert.deepEqual(semanticRows(normal), semanticRows(sequential));
});

test("real clean detached frozen subject launches approved tools with parallel sequential parity", { timeout: 300_000 }, async (t) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "rd0873-detached-subject-"));
  const targetRoot = join(fixtureRoot, "subject");
  const commonGitDirectory = runGit(repositoryRoot, ["rev-parse", "--path-format=absolute", "--git-common-dir"]).stdout;
  const sourceRoot = dirname(commonGitDirectory);
  t.after(() => {
    const rel = relative(tmpdir(), fixtureRoot);
    if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("detached subject escaped temp root");
    rmSync(fixtureRoot, { recursive: true, force: true });
  });
  runRawGit([
    "-c", `safe.directory=${sourceRoot}`,
    "-c", `safe.directory=${commonGitDirectory}`,
    "clone", "--local", "--no-hardlinks", "--no-checkout", sourceRoot, targetRoot,
  ], tmpdir());
  runRawGit(["-C", targetRoot, "checkout", "--detach", BASE_HEAD], fixtureRoot);
  assert.equal(runRawGit(["-C", targetRoot, "rev-parse", "HEAD"], fixtureRoot), BASE_HEAD);
  assert.equal(runRawGit(["-C", targetRoot, "rev-parse", "HEAD^{tree}"], fixtureRoot), BASE_TREE);
  assert.equal(runRawGit(["-C", targetRoot, "status", "--porcelain=v1", "--untracked-files=all"], fixtureRoot), "");

  const run = (sequential) => operator.runAudit({
    targetRepositoryRoot: targetRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    sequential,
  });
  const stdout = [];
  const stderr = [];
  const parallelExit = await operator.runCli([
    "run",
    "--target-root", targetRoot,
    "--agents-repo", agentsRoot,
    "--git", gitPath,
    "--manifest", manifestPath,
    "--approval", approvalPath,
  ], {
    writeStdout: (text) => stdout.push(text),
    writeStderr: (text) => stderr.push(text),
  });
  assert.equal(parallelExit, 0);
  assert.deepEqual(stderr, []);
  assert.equal(stdout.length, 1);
  const parallel = JSON.parse(stdout[0]);
  const sequential = await run(true);
  assert.equal(operator.validateOuterReceipt(parallel, { batchModule: batch }), parallel);
  assert.equal(parallel.verdict, "PASS");
  assert.equal(sequential.verdict, "PASS");
  assert.equal(parallel.innerReceipt.snapshotStable, true);
  assert.equal(sequential.innerReceipt.snapshotStable, true);
  assert.deepEqual(parallel.innerReceipt.taskCounts, { total: 5, pass: 5, finding: 0, refused: 0, skipped: 0 });
  assert.deepEqual(sequential.innerReceipt.taskCounts, parallel.innerReceipt.taskCounts);
  assert.deepEqual(semanticRows(parallel.innerReceipt), semanticRows(sequential.innerReceipt));
  assert.equal(parallel.execution.semanticTaskDigest, sequential.execution.semanticTaskDigest);
  assert.equal(runRawGit(["-C", targetRoot, "status", "--porcelain=v1", "--untracked-files=all"], fixtureRoot), "");

  let launches = 0;
  const dirtyPath = join(targetRoot, "unexpected-dirty-state.txt");
  writeFileSync(dirtyPath, "dirty\n");
  const dirty = await operator.runAudit({
    targetRepositoryRoot: targetRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    runTask: async (task) => { launches += 1; return passingTask(task); },
  });
  assert.equal(dirty.verdict, "REFUSED");
  assert.equal(dirty.innerReceipt.integrityReason, "DIRTY_ENTRY");
  assert.equal(launches, 0);
  rmSync(dirtyPath, { force: true });

  const toolPath = join(targetRoot, "tools", "rd0873-corpus-packages-fungi.mjs");
  const exactToolBytes = readFileSync(toolPath);
  writeFileSync(toolPath, Buffer.concat([exactToolBytes, Buffer.from("// drift\r\n", "utf8")]));
  const toolDrift = await operator.runAudit({
    targetRepositoryRoot: targetRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    runTask: async (task) => { launches += 1; return passingTask(task); },
  });
  assert.equal(toolDrift.verdict, "REFUSED");
  assert.equal(toolDrift.innerReceipt.integrityReason, "DIRTY_ENTRY");
  assert.equal(launches, 0);
  writeFileSync(toolPath, exactToolBytes);
  assert.equal(runRawGit(["-C", targetRoot, "status", "--porcelain=v1", "--untracked-files=all"], fixtureRoot), "");

  const wrongHead = runRawGit(["-C", targetRoot, "rev-parse", `${BASE_HEAD}^`], fixtureRoot);
  runRawGit(["-C", targetRoot, "checkout", "--detach", wrongHead], fixtureRoot);
  await assert.rejects(operator.runAudit({
    targetRepositoryRoot: targetRoot,
    agentsRepositoryRoot: agentsRoot,
    gitExecutablePath: gitPath,
    manifestPath,
    approvalPath,
    runTask: async (task) => { launches += 1; return passingTask(task); },
  }), (error) => error?.code === "SUBJECT_SNAPSHOT_REFUSED");
  assert.equal(launches, 0);
});
