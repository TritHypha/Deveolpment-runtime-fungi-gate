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

const BASE_HEAD = "926eb0237aaac904cbe48e8f69702e95d2d30676";
const AGENTS_HEAD = "6cad3837711112899c4b91645a1ff98815da7d36";
const AGENTS_CONTROLLERS = Object.freeze({
  "tools/audit-map.mjs": Object.freeze({
    blob: "9afd01b0e61879862d1fe84d781051662ae6e245",
    bytes: "9ba23d9f963dd96398ac291b192f99ff46a8819b750c81ef171a282308b29db0",
  }),
  "tools/bounded-tool-batch.mjs": Object.freeze({
    blob: "300ad5ab757cbafb897f1c10e1764ed56d850464",
    bytes: "d93bb37c4ff6f93626824a1c6e380e02956d11fd0e39a027e4fb2fd2da3dca2c",
  }),
});
const EMPTY_DIGEST = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const testFilePath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(testFilePath), "..", "..");
const manifestPath = join(repositoryRoot, "governance", "rd0873-native-fungi-audit-map.json");
const policyPath = join(repositoryRoot, "tools", "bounded-tool-batch-policy.json");
const agentsRoot = process.env.AGENTS_ROOT;

function refuse(code, message) {
  const error = new Error(`REFUSED: ${code}: ${message}`);
  error.code = code;
  throw error;
}

function pathKey(value) {
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLocaleLowerCase("en-US") : normalized;
}

function runGit(root, args, accepted = [0]) {
  const result = spawnSync("git", ["-c", `safe.directory=${root}`, "-C", root, ...args], {
    encoding: "utf8",
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

function collectOwnerEvidence(rootValue) {
  if (typeof rootValue !== "string" || rootValue.length === 0) {
    refuse("OWNER_ROOT_REQUIRED", "AGENTS_ROOT is required");
  }
  const resolvedRoot = resolve(rootValue);
  let canonicalRoot;
  try { canonicalRoot = realpathSync.native(resolvedRoot); }
  catch { refuse("OWNER_ROOT_REFUSED", "AGENTS_ROOT is unavailable"); }
  if (pathKey(canonicalRoot) !== pathKey(resolvedRoot) || basename(canonicalRoot) !== "AGENTS") {
    refuse("OWNER_PATH_REFUSED", "AGENTS_ROOT must be the exact canonical AGENTS path");
  }
  if (!statSync(canonicalRoot, { bigint: true }).isDirectory()) {
    refuse("OWNER_PATH_REFUSED", "AGENTS_ROOT must be a directory");
  }

  const topLevel = runGit(canonicalRoot, ["rev-parse", "--show-toplevel"]).stdout;
  const head = runGit(canonicalRoot, ["rev-parse", "HEAD"]).stdout;
  const controllers = {};
  for (const [controllerPath, expected] of Object.entries(AGENTS_CONTROLLERS)) {
    const filePath = resolve(canonicalRoot, ...controllerPath.split("/"));
    let canonicalFile;
    try { canonicalFile = realpathSync.native(filePath); }
    catch { refuse("OWNER_CONTROLLER_REFUSED", `controller unavailable: ${controllerPath}`); }
    if (pathKey(canonicalFile) !== pathKey(filePath) || !statSync(canonicalFile, { bigint: true }).isFile()) {
      refuse("OWNER_CONTROLLER_REFUSED", `controller path is aliased or non-regular: ${controllerPath}`);
    }
    const bytes = readFileSync(canonicalFile);
    controllers[controllerPath] = {
      expected,
      committedBlob: runGit(canonicalRoot, ["rev-parse", `HEAD:${controllerPath}`]).stdout,
      workingBytes: sha256(bytes),
      filePath: canonicalFile,
    };
  }
  const controllerPaths = Object.keys(AGENTS_CONTROLLERS);
  const clean = runGit(canonicalRoot, ["diff", "--quiet", "HEAD", "--", ...controllerPaths], [0, 1]).status === 0;
  return { basename: basename(canonicalRoot), canonicalRoot, resolvedRoot, topLevel, head, clean, controllers };
}

function verifyOwnerEvidence(evidence) {
  if (evidence.basename !== "AGENTS" || pathKey(evidence.canonicalRoot) !== pathKey(evidence.resolvedRoot)
      || pathKey(evidence.topLevel) !== pathKey(evidence.canonicalRoot)) {
    refuse("OWNER_PATH_REFUSED", "owner path identity does not match canonical AGENTS root");
  }
  if (evidence.head !== AGENTS_HEAD) refuse("OWNER_HEAD_REFUSED", "canonical AGENTS HEAD is stale or wrong");
  for (const [controllerPath, expected] of Object.entries(AGENTS_CONTROLLERS)) {
    const controller = evidence.controllers[controllerPath];
    if (!controller || controller.expected.blob !== expected.blob || controller.expected.bytes !== expected.bytes
        || controller.committedBlob !== expected.blob) {
      refuse("OWNER_BLOB_REFUSED", `committed controller blob is wrong: ${controllerPath}`);
    }
    if (controller.workingBytes !== expected.bytes || evidence.clean !== true) {
      refuse("OWNER_CONTROLLER_DIRTY", `controller working bytes are dirty: ${controllerPath}`);
    }
  }
  return evidence;
}

async function loadVerifiedOwner(rootValue, options = {}) {
  const collect = options.collect ?? collectOwnerEvidence;
  const importer = options.importer ?? ((filePath) => import(pathToFileURL(filePath).href));
  const evidence = verifyOwnerEvidence(collect(rootValue));
  const auditMapModule = await importer(evidence.controllers["tools/audit-map.mjs"].filePath);
  const batchModule = await importer(evidence.controllers["tools/bounded-tool-batch.mjs"].filePath);
  return { auditMapModule, batchModule, evidence };
}

const { auditMapModule: auditMap, batchModule: batch, evidence: ownerEvidence } = await loadVerifiedOwner(agentsRoot);
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

test("stale wrong and dirty AGENTS controller evidence refuses before import", async () => {
  const cases = [
    ["OWNER_HEAD_REFUSED", (value) => { value.head = "f".repeat(40); }],
    ["OWNER_BLOB_REFUSED", (value) => { value.controllers["tools/audit-map.mjs"].committedBlob = "e".repeat(40); }],
    ["OWNER_CONTROLLER_DIRTY", (value) => {
      value.controllers["tools/bounded-tool-batch.mjs"].workingBytes = "d".repeat(64);
      value.clean = false;
    }],
  ];
  for (const [expected, mutate] of cases) {
    const evidence = structuredClone(ownerEvidence);
    mutate(evidence);
    let imports = 0;
    await assert.rejects(
      loadVerifiedOwner(agentsRoot, {
        collect: () => evidence,
        importer: async () => { imports += 1; return {}; },
      }),
      (error) => error?.code === expected,
    );
    assert.equal(imports, 0, expected);
  }
});

test("a hostile wrong-owner module cannot execute top-level sentinel code", (t) => {
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

  const child = spawnSync(process.execPath, [testFilePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, AGENTS_ROOT: hostileRoot, RD0873_SENTINEL: sentinel },
    maxBuffer: 1_048_576,
    timeout: 30_000,
    windowsHide: true,
  });
  assert.notEqual(child.status, 0, `${child.stdout}\n${child.stderr}`);
  assert.match(child.stderr, /OWNER_HEAD_REFUSED/u);
  assert.equal(existsSync(sentinel), false);
});

test("canonical AGENTS owner is exact committed and exports both controllers", () => {
  assert.equal(ownerEvidence.head, AGENTS_HEAD);
  assert.equal(ownerEvidence.clean, true);
  assert.equal(ownerEvidence.basename, "AGENTS");
  assert.equal(pathKey(ownerEvidence.topLevel), pathKey(ownerEvidence.canonicalRoot));
  assert.equal(typeof auditMap.auditManifest, "function");
  assert.equal(typeof batch.runCli, "function");
});

test("approved exact-base DAG is closed bounded and ordered", () => {
  assert.deepEqual(auditMap.auditManifest(manifest, { requireApproved: true }), []);
  assert.equal(manifest.subject.locator, `git://galerina/${BASE_HEAD}`);
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
    clean: true,
    statusBytes: 0,
    statusDigest: EMPTY_DIGEST,
  });
  const run = async (sequential) => {
    const stdout = [];
    const stderr = [];
    const argv = ["run", manifestPath, "--format", "json", ...(sequential ? ["--sequential"] : [])];
    const exit = await batch.runCli(argv, {
      repoRoot: repositoryRoot,
      captureSnapshot: async () => stableSnapshot,
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
