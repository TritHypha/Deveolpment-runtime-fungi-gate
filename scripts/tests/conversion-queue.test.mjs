import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync, existsSync, linkSync, lstatSync, mkdtempSync, mkdirSync, readFileSync,
  realpathSync, renameSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { aggregateCorpusReceipts } from "../lib/fungi-corpus-receipt.mjs";
import { deriveCorpusShards } from "../lib/fungi-corpus-shards.mjs";
import {
  validateProjectEvidence, validateProjectEvidenceEnvelope,
} from "../conversion-queue.mjs";
import { RUNTIME_GIT_SHA256 } from "../run-rd0873-native-fungi-audit.mjs";

const TOOL = join(import.meta.dirname, "..", "conversion-queue.mjs");
const digest = "a".repeat(64);
const limits = { maxFiles: 8, maxBytes: 1_048_576, timeoutMs: 10_000, maxOutputBytes: 65_536 };

function boundedSpawn(file, args, {
  cwd = undefined, encoding = "utf8", env = process.env, input = undefined,
} = {}) {
  return spawnSync(file, args, {
    cwd,
    encoding,
    env,
    input,
    maxBuffer: 16_777_216,
    shell: false,
    timeout: 30_000,
    windowsHide: true,
  });
}

function discoverPinnedGit() {
  const command = process.platform === "win32" ? "where.exe" : "which";
  const result = boundedSpawn(command, ["git"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const candidates = result.stdout.split(/\r?\n/u).filter(Boolean).map((path) => realpathSync(path));
  const match = candidates.find((path) => lstatSync(path, { bigint: true }).nlink === 1n
    && createHash("sha256").update(readFileSync(path)).digest("hex") === RUNTIME_GIT_SHA256);
  assert.ok(match, "the Task 4 pinned Git executable must be available for this integration fixture");
  return match;
}

const PINNED_GIT = discoverPinnedGit();
const GIT_AUTHORITY = {
  gitExecutablePath: PINNED_GIT,
  gitExecutableDigest: RUNTIME_GIT_SHA256,
};

function canonicalDigest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex")}`;
}

function git(root, args) {
  const result = boundedSpawn(PINNED_GIT, args, { cwd: root });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, relativePath, contents) {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function makeRoot(decisions = []) {
  const root = mkdtempSync(join(tmpdir(), "galerina-conversion-queue-"));
  const paths = ["packages/a/src/a.ts", "packages/a/src/b.mjs", "packages/b/src/c.ts", "packages/b/src/d.js"];
  const ledger = paths.map((path, index) => ({
    path,
    package: index < 2 ? "a" : "b",
    dependencyTranche: index === 0 ? "T0-compiler" : "T3-package-graph",
    declaredFloor: index === 1 ? "bounded-bootstrap-floor" : null,
  }));
  const retirement = { allTrackedExecutablePaths: paths, retirementLedger: ledger, twinnedPairs: [paths[2]] };
  write(root, "build/ts-retirement/ts-retirement.json", `${JSON.stringify(retirement)}\n`);
  write(root, "governance/conversion-queue-decisions.json", `${JSON.stringify({ schemaVersion: 2, decisions })}\n`);
  for (const path of paths) write(root, path, `export const fixture = "${path}";\n`);
  const fungiPath = "packages/fungi/products/galerina/fixture/fixture.fungi";
  write(root, fungiPath, "@version 1\npure flow fixture() -> Int { return 1 }\n");
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.name", "Queue Fixture"]);
  git(root, ["config", "user.email", "queue@example.invalid"]);
  git(root, ["add", "--", "build/ts-retirement/ts-retirement.json", "governance/conversion-queue-decisions.json", "packages"]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  const head = git(root, ["rev-parse", "HEAD"]);
  const tree = git(root, ["rev-parse", "HEAD^{tree}"]);
  const request = {
    schema: "galerina.fungi-corpus-request.v2",
    profile: "PROJECT",
    productId: "galerina",
    repositoryHead: head,
    repositoryTree: tree,
    compilerDigest: canonicalDigest({ compiler: "fixture" }),
    fileSetDigest: canonicalDigest({ files: [fungiPath] }),
    shardCount: 1,
    files: [{
      path: fungiPath,
      digest: canonicalDigest("@version 1\npure flow fixture() -> Int { return 1 }\n"),
      expectationDigest: canonicalDigest({ expected: [] }),
      mode: "plain",
    }],
  };
  writeProjectEvidence(root, request);
  return root;
}

function projectEvidence(root, request, mutate = (value) => value) {
  const shardsResult = deriveCorpusShards(request, limits);
  assert.equal(shardsResult.kind, "accepted");
  const shard = shardsResult.value[0];
  const completed = shard.files.map((file) => ({ ...file, resultDigest: canonicalDigest({ path: file.path, ok: true }) }));
  const receiptBase = {
    schema: "galerina.fungi-corpus-shard-receipt.v2",
    shardId: shard.shardId,
    shardDigest: canonicalDigest(shard),
    requestDigest: shard.requestDigest,
    startIndex: shard.startIndex,
    endIndexExclusive: shard.endIndexExclusive,
    status: "PASS",
    termination: "COMPLETE",
    completed,
    unprocessed: [],
  };
  const receipt = { ...receiptBase, resultDigest: canonicalDigest(receiptBase) };
  const aggregate = aggregateCorpusReceipts(request, shardsResult.value, [receipt]);
  assert.equal(aggregate.kind, "accepted");
  const base = {
    schema: "galerina.fungi-corpus-evidence.v1",
    request,
    limits,
    run: {
      schema: "galerina.fungi-corpus-run.v2",
      receipts: [receipt],
      aggregate: aggregate.value,
    },
  };
  const changed = mutate(structuredClone(base));
  return { ...changed, digest: canonicalDigest(changed) };
}

function writeProjectEvidence(root, request, mutate) {
  const relative = "build/fungi-corpus-check/evidence/project.json";
  write(root, relative, `${JSON.stringify(projectEvidence(root, request, mutate))}\n`);
  return relative;
}

function readRequest(root) {
  const receipt = JSON.parse(readFileSync(join(root, "build", "fungi-corpus-check", "evidence", "project.json"), "utf8"));
  return receipt.request;
}

function run(root, mode, receipt = "build/fungi-corpus-check/evidence/project.json", env = process.env) {
  return boundedSpawn(process.execPath, [
    TOOL, mode, "--root", root, "--project-corpus-receipt", receipt,
    "--git-executable", PINNED_GIT, "--git-digest", RUNTIME_GIT_SHA256,
  ], { env });
}

test("conversion queue can be imported without CLI side effects and exports PROJECT evidence validation", () => {
  const source = `import { validateProjectEvidence, validateProjectEvidenceEnvelope } from ${JSON.stringify(pathToFileURL(TOOL).href)};\n`
    + `if (typeof validateProjectEvidence !== "function" || typeof validateProjectEvidenceEnvelope !== "function") process.exit(3);\n`;
  const result = boundedSpawn(process.execPath, ["--input-type=module", "--eval", source]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("exported PROJECT evidence validation refuses hostile paths and duplicate JSON fields", () => {
  const root = makeRoot();
  for (const hostile of [
    "build/fungi-corpus-check/evidence/../project.json",
    "build\\fungi-corpus-check\\evidence\\project.json",
    join(root, "build", "fungi-corpus-check", "evidence", "project.json"),
  ]) assert.throws(() => validateProjectEvidence(root, hostile));
  const path = join(root, "build", "fungi-corpus-check", "evidence", "project.json");
  writeFileSync(path, '{"schema":"galerina.fungi-corpus-evidence.v1","schema":"duplicate"}\n');
  assert.throws(() => validateProjectEvidence(root, "build/fungi-corpus-check/evidence/project.json"));
});

test("exported PROJECT evidence returns exact covered files after repository validation", () => {
  const root = makeRoot();
  const request = readRequest(root);
  const result = validateProjectEvidence(root, "build/fungi-corpus-check/evidence/project.json", GIT_AUTHORITY);
  assert.deepEqual(result.repository, { head: request.repositoryHead, tree: request.repositoryTree });
  assert.deepEqual(result.files, request.files.map(({ path, digest }) => ({ path, digest })));
});

test("pure envelope validation exposes bounded identity without weakening exact-head queue validation", () => {
  const root = makeRoot();
  const request = readRequest(root);
  write(root, "later.txt", "later\n");
  git(root, ["add", "--", "later.txt"]);
  git(root, ["commit", "--quiet", "-m", "later"]);
  assert.throws(() => validateProjectEvidence(
    root, "build/fungi-corpus-check/evidence/project.json", GIT_AUTHORITY,
  ));
  const parsed = validateProjectEvidenceEnvelope(root, "build/fungi-corpus-check/evidence/project.json");
  assert.deepEqual(parsed.repository, { head: request.repositoryHead, tree: request.repositoryTree });
  assert.deepEqual(parsed.files, request.files.map(({ path, digest: fileDigest }) => ({ path, digest: fileDigest })));
});

test("PROJECT evidence refuses hard-link aliases in both validators", () => {
  const root = makeRoot();
  const relativePath = "build/fungi-corpus-check/evidence/project.json";
  const path = join(root, ...relativePath.split("/"));
  const hardLinkRelative = "build/fungi-corpus-check/evidence/project-linked.json";
  const hardLink = join(root, ...hardLinkRelative.split("/"));
  linkSync(path, hardLink);
  assert.throws(() => validateProjectEvidenceEnvelope(root, hardLinkRelative));
  assert.throws(() => validateProjectEvidence(root, hardLinkRelative, GIT_AUTHORITY));
  rmSync(hardLink);
});

test("PROJECT evidence refuses a path/read ABA in both validators", () => {
  const root = makeRoot();
  const relativePath = "build/fungi-corpus-check/evidence/project.json";
  const path = join(root, ...relativePath.split("/"));
  const replacement = join(dirname(path), "project-replacement.json");
  const displaced = join(dirname(path), "project-displaced.json");
  copyFileSync(path, replacement);
  let swapped = false;
  const afterOpen = () => {
    renameSync(path, displaced);
    renameSync(replacement, path);
    swapped = true;
  };
  assert.throws(() => validateProjectEvidenceEnvelope(root, relativePath, { afterOpen }));
  assert.equal(swapped, true, "the ABA mutation must occur after the evidence file is opened");

  rmSync(path);
  renameSync(displaced, path);
  copyFileSync(path, replacement);
  swapped = false;
  assert.throws(() => validateProjectEvidence(root, relativePath, { ...GIT_AUTHORITY, afterOpen }));
  assert.equal(swapped, true, "the exact-head validator must use the held-file observation");
  assert.equal(existsSync(path), true);
});

test("queue CLI requires the approved pinned Git and ignores hostile PATH", () => {
  const root = makeRoot();
  const unpinned = boundedSpawn(process.execPath, [
    TOOL, "--write", "--root", root, "--project-corpus-receipt",
    "build/fungi-corpus-check/evidence/project.json",
  ]);
  assert.equal(unpinned.status, 1, "unpinned queue CLI must refuse");
  const wrongDigest = boundedSpawn(process.execPath, [
    TOOL, "--write", "--root", root, "--project-corpus-receipt",
    "build/fungi-corpus-check/evidence/project.json",
    "--git-executable", PINNED_GIT, "--git-digest", "0".repeat(64),
  ]);
  assert.equal(wrongDigest.status, 1, "a non-approved Git digest must refuse");

  const hostile = mkdtempSync(join(tmpdir(), "galerina-queue-hostile-git-"));
  const sentinel = join(hostile, "sentinel.txt");
  const fake = process.platform === "win32" ? join(hostile, "git.cmd") : join(hostile, "git");
  writeFileSync(fake, process.platform === "win32"
    ? `@echo off\r\n>"${sentinel}" echo executed\r\nexit /b 99\r\n`
    : `#!/bin/sh\nprintf executed > '${sentinel}'\nexit 99\n`);
  const result = boundedSpawn(process.execPath, [
    TOOL, "--write", "--root", root, "--project-corpus-receipt",
    "build/fungi-corpus-check/evidence/project.json",
    "--git-executable", PINNED_GIT, "--git-digest", RUNTIME_GIT_SHA256,
  ], { env: { ...process.env, PATH: hostile } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(sentinel), false);
});

test("queue v3 conserves every executable path and binds only the PROJECT evidence digest", () => {
  const root = makeRoot();
  assert.equal(run(root, "--write").status, 0);
  const queue = JSON.parse(readFileSync(join(root, "build", "conversion-queue", "queue.json"), "utf8"));
  assert.equal(queue.schemaVersion, 3);
  assert.equal(queue.counts.total, 4);
  assert.equal(queue.counts.BOOTSTRAP_FLOOR, 2);
  assert.equal(queue.counts.BLOCKED, 2);
  assert.equal(queue.counts.CANDIDATE, 0);
  assert.match(queue.projectCorpusReceiptDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(Object.hasOwn(queue, "projectCorpusReceipt"), false);
  assert.equal(queue.entries.length, new Set(queue.entries.map((entry) => entry.path)).size);
  assert.equal(run(root, "--check").status, 0);
});

test("repository identity ignores ambient Git redirection", () => {
  const root = makeRoot();
  const env = { ...process.env, GIT_DIR: join(root, "missing-git-directory") };
  assert.equal(run(root, "--write", undefined, env).status, 0);
});

test("symbol candidates carry exact product, package, file and symbol scope", () => {
  const root = makeRoot([{
    path: "packages/b/src/d.js",
    scope: "SYMBOLS",
    symbols: ["alphaDecision", "betaDecision"],
    classification: "CANDIDATE",
    reason: "BOUNDED_PURE_LEAF_DOSSIER",
    evidenceDigest: digest,
  }]);
  assert.equal(run(root, "--write").status, 0);
  const queue = JSON.parse(readFileSync(join(root, "build", "conversion-queue", "queue.json"), "utf8"));
  assert.deepEqual(queue.scopedCandidates.map(({ product, package: packageName, file, symbol }) => ({
    product, package: packageName, file, symbol,
  })), [
    { product: "galerina", package: "b", file: "packages/b/src/d.js", symbol: "alphaDecision" },
    { product: "galerina", package: "b", file: "packages/b/src/d.js", symbol: "betaDecision" },
  ]);
  assert.equal(queue.entries[3].classification, "BLOCKED");
  assert.equal(queue.entries[3].reason, "SCOPED_CANDIDATES_ONLY");
});

test("missing, stale, wrong-profile, product-mismatched and non-PASS corpus evidence refuses", () => {
  const root = makeRoot();
  const request = readRequest(root);
  const cases = [
    ["build/fungi-corpus-check/evidence/missing.json", null],
    [null, (value) => ({ ...value, request: { ...value.request, repositoryHead: "0".repeat(40) } })],
    [null, (value) => ({ ...value, request: { ...value.request, profile: "WORKSET" } })],
    [null, (value) => ({ ...value, request: { ...value.request, productId: "trametes" } })],
    [null, (value) => ({ ...value, run: { ...value.run, aggregate: { ...value.run.aggregate, status: "FINDING" } } })],
  ];
  for (const [path, mutate] of cases) {
    if (mutate !== null) writeProjectEvidence(root, request, mutate);
    assert.equal(run(root, "--write", path ?? undefined).status, 1);
  }
});

test("invalid, incomplete, duplicate and digest-mismatched PROJECT evidence refuses", () => {
  const root = makeRoot();
  const request = readRequest(root);
  for (const mutate of [
    (value) => ({ ...value, surplus: true }),
    (value) => ({ ...value, run: { ...value.run, receipts: [] } }),
    (value) => ({ ...value, run: { ...value.run, receipts: [...value.run.receipts, value.run.receipts[0]] } }),
    (value) => ({ ...value, limits: { ...value.limits, maxFiles: 0 } }),
  ]) {
    writeProjectEvidence(root, request, mutate);
    assert.equal(run(root, "--write").status, 1);
  }
  const path = join(root, "build", "fungi-corpus-check", "evidence", "project.json");
  const evidence = projectEvidence(root, request);
  writeFileSync(path, `${JSON.stringify({ ...evidence, digest: canonicalDigest({ foreign: true }) })}\n`);
  assert.equal(run(root, "--write").status, 1);
});

test("unknown, duplicate, reordered, unscoped and bootstrap-floor decisions refuse", () => {
  const candidate = { scope: "WHOLE_FILE", symbols: [], classification: "CANDIDATE", reason: "DOSSIER", evidenceDigest: digest };
  for (const decisions of [
    [{ path: "missing.ts", ...candidate }],
    [{ path: "packages/b/src/d.js", ...candidate }, { path: "packages/b/src/d.js", ...candidate }],
    [{ path: "packages/b/src/d.js", ...candidate }, { path: "packages/b/src/c.ts", ...candidate }],
    [{ path: "packages/b/src/d.js", ...candidate, scope: undefined }],
    [{ path: "packages/a/src/a.ts", ...candidate }],
  ]) {
    const normalized = decisions.map((decision) => Object.fromEntries(Object.entries(decision).filter(([, value]) => value !== undefined)));
    assert.equal(run(makeRoot(normalized), "--write").status, 1);
  }
});

test("malformed and product-mismatched symbol scopes refuse", () => {
  const base = {
    path: "packages/b/src/d.js",
    scope: "SYMBOLS",
    symbols: ["alphaDecision"],
    classification: "CANDIDATE",
    reason: "DOSSIER",
    evidenceDigest: digest,
  };
  for (const decision of [
    { ...base, symbols: [] },
    { ...base, symbols: ["betaDecision", "alphaDecision"] },
    { ...base, symbols: ["alphaDecision", "alphaDecision"] },
    { ...base, symbols: ["not-a-symbol"] },
    { ...base, classification: "BLOCKED" },
    { ...base, scope: "WHOLE_FILE" },
    { ...base, path: "packages/a/src/a.ts" },
  ]) assert.equal(run(makeRoot([decision]), "--write").status, 1);
});
