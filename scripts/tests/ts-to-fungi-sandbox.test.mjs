import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  BLOCKERS,
  OUTCOMES,
  canonicalRelativeTsPath,
} from "../lib/ts-to-fungi-sandbox/contracts.mjs";
import { classifyTypeScriptSource, discoverTypeScriptScopes } from "../lib/ts-to-fungi-sandbox/classifier.mjs";
import {
  alphaShadowFingerprint,
  buildCompilerEvidence,
  buildPhysicalEvidence,
  findCorpusCollision,
  loadWorkingFungiCorpus,
} from "../lib/ts-to-fungi-sandbox/evidence.mjs";
import { discoverGraphProject, resolveSourceIdentity } from "../lib/ts-to-fungi-sandbox/identity.mjs";
import { appendOutcomeRecord, canonicalJson } from "../lib/ts-to-fungi-sandbox/journal.mjs";
import { lowerClassifiedSymbol } from "../lib/ts-to-fungi-sandbox/lowerer.mjs";
import { assertCliInput, assertCliOutput, runBatch, runDiscover, verifyReceipt } from "../lib/ts-to-fungi-sandbox/controller.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const SNAPSHOT_FILE = "packages-galerina/galerina-tower-citizen/src/snapshot-key-provider.ts";
const SNAPSHOT_SYMBOL = "SNAPSHOT_KEY_CONTEXT";
const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

async function withTemp(prefix, fn) {
  const path = await mkdtemp(join(tmpdir(), prefix));
  try {
    return await fn(path);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
}

test("1 contracts accept only canonical repository-relative TypeScript paths", () => {
  assert.equal(canonicalRelativeTsPath("packages-galerina/x/src/value.ts"), "packages-galerina/x/src/value.ts");
  for (const value of ["", "../value.ts", "packages-galerina\\x\\value.ts", "C:/value.ts", "packages-galerina/x/value.mjs", "packages-galerina//x/value.ts"]) {
    assert.throws(() => canonicalRelativeTsPath(value));
  }
  assert.deepEqual([...OUTCOMES], ["CONVERTED", "BLOCKED", "MANUAL_REVIEW"]);
  assert.match(assertCliInput(ROOT, "scripts/fixtures/ts-to-fungi-sandbox-pilot.json", { sandboxOnly: false }), /ts-to-fungi-sandbox-pilot\.json$/u);
  assert.match(assertCliOutput(ROOT, "build/ts-to-fungi-sandbox/test-output"), /ts-to-fungi-sandbox[\\/]test-output$/u);
  for (const value of ["../outside.json", "C:/outside.json", "scripts\\fixture.json"]) {
    assert.throws(() => assertCliInput(ROOT, value, { sandboxOnly: false }));
  }
  assert.throws(() => assertCliInput(ROOT, "package.json", { sandboxOnly: true }));
});

test("2 identity binds a clean tracked source to the independently fresh graph", async () => {
  const before = readFileSync(join(ROOT, SNAPSHOT_FILE));
  const discovered = await discoverGraphProject(ROOT);
  assert.equal(typeof discovered, "string");
  const identity = await resolveSourceIdentity({ root: ROOT, project: discovered, file: SNAPSHOT_FILE, symbol: SNAPSHOT_SYMBOL });
  assert.equal(identity.file, SNAPSHOT_FILE);
  assert.equal(identity.symbol, SNAPSHOT_SYMBOL);
  assert.equal(identity.sourceSha256, sha256(before));
  assert.equal(identity.graph.indexedHeadSha, identity.sourceBuildPoint);
  assert.equal(identity.graph.stale, false);
  assert.deepEqual(readFileSync(join(ROOT, SNAPSHOT_FILE)), before);
});

test("3 journal canonicalizes keys and refuses overwriting an outcome", async () => withTemp("ts-fungi-journal-", async (dir) => {
  const path = join(dir, "journal.jsonl");
  const record = { z: 2, a: { d: 4, c: 3 }, outcome: "BLOCKED" };
  assert.equal(canonicalJson(record), '{"a":{"c":3,"d":4},"outcome":"BLOCKED","z":2}');
  await appendOutcomeRecord(path, record);
  assert.equal(await readFile(path, "utf8"), `${canonicalJson(record)}\n`);
  await assert.rejects(() => appendOutcomeRecord(path, record));
}));

test("4 classifier admits primitive literals and inventories exact source ranges", () => {
  for (const source of [
    'export const READY = true;\n',
    'export const COUNT = 16;\n',
    'export const CONTEXT = "sandbox.v1";\n',
  ]) {
    const symbol = source.match(/const\s+(\w+)/u)[1];
    const result = classifyTypeScriptSource({ source, file: "packages-galerina/test/src/value.ts", symbol });
    assert.equal(result.outcome, "SUPPORTED");
    assert.equal(result.complete, true);
    assert.ok(result.range.end > result.range.start);
  }
});

test("5 classifier admits a closed scalar function and blocks known active or numeric semantics", () => {
  const fn = classifyTypeScriptSource({
    source: "export function choose(flag: boolean): number { if (flag) { return 1; } return 0; }\n",
    file: "packages-galerina/test/src/value.ts",
    symbol: "choose",
  });
  assert.equal(fn.outcome, "SUPPORTED");
  const floating = classifyTypeScriptSource({ source: "export const RATE = 0.1;\n", file: "packages-galerina/test/src/value.ts", symbol: "RATE" });
  assert.equal(floating.outcome, "BLOCKED");
  assert.ok(floating.blockers.includes(BLOCKERS.BINARY64));
  const active = classifyTypeScriptSource({ source: 'export const ITEMS = new Set(["x"]);\n', file: "packages-galerina/test/src/value.ts", symbol: "ITEMS" });
  assert.equal(active.outcome, "BLOCKED");
  assert.ok(active.blockers.includes(BLOCKERS.ACTIVE_OBJECT));
});

test("5a discovery returns only supported top-level scopes in source order", () => {
  const source = [
    'export const CONTEXT = "sandbox.discovery.v1";',
    'export const ITEMS = new Set(["x"]);',
    'export interface Shape { readonly value: string }',
    'export function choose(flag: boolean): string { if (flag) { return "yes"; } return "no"; }',
  ].join("\n");
  const discovered = discoverTypeScriptScopes({ source, file: "packages-galerina/test/src/value.ts" });
  assert.deepEqual(discovered.map((item) => item.symbol), ["CONTEXT", "choose"]);
  assert.ok(discovered.every((item) => item.outcome === "SUPPORTED"));
});

test("6 lowerer emits documented deterministic Fungi and cannot consume a forged record", () => {
  const constant = classifyTypeScriptSource({ source: 'export const CONTEXT = "sandbox.v1";\n', file: "packages-galerina/test/src/value.ts", symbol: "CONTEXT" });
  const lowered = lowerClassifiedSymbol(constant);
  assert.match(lowered.source, /^@version 1\n/u);
  assert.match(lowered.source, /TypeScript oracle: packages-galerina\/test\/src\/value\.ts#CONTEXT/u);
  assert.match(lowered.source, /pure flow context\(\) -> String/u);
  assert.match(lowered.source, /return "sandbox\.v1"/u);
  assert.deepEqual(lowered.parameterNames, []);
  assert.deepEqual(lowered.vectors, [{ arguments: [], expected: "sandbox.v1" }]);
  const fn = classifyTypeScriptSource({
    source: "export function choose(flag: boolean): number { if (flag) { return 1; } return 0; }\n",
    file: "packages-galerina/test/src/value.ts",
    symbol: "choose",
  });
  const loweredFunction = lowerClassifiedSymbol(fn);
  assert.deepEqual(loweredFunction.parameterNames, ["flag"]);
  assert.deepEqual(loweredFunction.vectors, [
    { arguments: [false], expected: 0 },
    { arguments: [true], expected: 1 },
  ]);
  assert.throws(() => lowerClassifiedSymbol({ ...constant }));
});

test("7 exact and identifier-alpha shadow checks include tracked and untracked worktree Fungi", async () => withTemp("ts-fungi-corpus-", async (dir) => {
  const a = '@version 1\npure flow first(value: Bool) -> String { if value { return "one" } return "zero" }\n';
  const b = '@version 1\npure flow second(flag: Bool) -> String { if flag { return "one" } return "zero" }\n';
  const c = '@version 1\npure flow third(flag: Bool) -> String { if flag { return "two" } return "zero" }\n';
  assert.equal(alphaShadowFingerprint(a), alphaShadowFingerprint(b));
  assert.notEqual(alphaShadowFingerprint(a), alphaShadowFingerprint(c));
  assert.equal(findCorpusCollision(b, [{ path: "a.fungi", source: a }]).kind, "ALPHA_SHADOW");
  execFileSync("git", ["init", "--quiet"], { cwd: dir, windowsHide: true });
  await mkdir(join(dir, "src"));
  await writeFile(join(dir, "src", "tracked.fungi"), a);
  execFileSync("git", ["add", "src/tracked.fungi"], { cwd: dir, windowsHide: true });
  await writeFile(join(dir, "src", "untracked.fungi"), c);
  const corpus = await loadWorkingFungiCorpus(dir);
  assert.deepEqual(corpus.map((item) => item.path), ["src/tracked.fungi", "src/untracked.fungi"]);
}));

test("8 compiler evidence covers parser, types, effects, governance and deterministic GIR", async () => {
  const classified = classifyTypeScriptSource({
    source: "export function choose(flag: boolean): number { if (flag) { return 37; } return 0; }\n",
    file: "packages-galerina/test/src/value.ts",
    symbol: "choose",
  });
  const lowered = lowerClassifiedSymbol(classified);
  const evidence = await buildCompilerEvidence({ source: lowered.source, file: "sandbox/choose.fungi", flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors });
  assert.equal(evidence.green, true);
  assert.equal(evidence.girHashFirst, evidence.girHashSecond);
  assert.deepEqual(evidence.executedValues, [0, 37]);
});

test("9 physical evidence publishes, independently re-admits, VOK-verifies and rejects mutations", async () => {
  const classified = classifyTypeScriptSource({
    source: 'export function token(flag: boolean): string { if (flag) { return "sandbox.physical.unique.v1"; } return "sandbox.physical.unique.v0"; }\n',
    file: "packages-galerina/test/src/value.ts",
    symbol: "token",
  });
  const lowered = lowerClassifiedSymbol(classified);
  const evidence = await buildPhysicalEvidence({ root: ROOT, source: lowered.source, flow: lowered.flow, vectors: lowered.vectors });
  assert.equal(evidence.green, true);
  assert.equal(evidence.authorityReleased, false);
  assert.deepEqual(evidence.verifiedValues, ["sandbox.physical.unique.v0", "sandbox.physical.unique.v1"]);
  assert.equal(evidence.sourceMutationRefused, true);
  assert.equal(evidence.artifactMutationRefused, true);
  assert.equal(evidence.receiptMutationRefused, true);
});

test("10 a mixed ten-request audit batch continues, retains TypeScript, and detects receipt tampering", async () => withTemp("ts-fungi-batch-", async (dir) => {
  const manifest = JSON.parse(await readFile(join(ROOT, "scripts", "fixtures", "ts-to-fungi-sandbox-pilot.json"), "utf8"));
  const out = join(dir, "published");
  const project = await discoverGraphProject(ROOT);
  assert.equal(manifest.requests.length, 10);
  const before = new Map(manifest.requests.filter((request) => existsSync(join(ROOT, request.file))).map((request) => [request.file, sha256(readFileSync(join(ROOT, request.file)))]));
  const summary = await runBatch({ root: ROOT, project, manifest, out, auditOnly: true });
  assert.equal(summary.total, 10);
  assert.equal(summary.outcomes.CONVERTED + summary.outcomes.BLOCKED + summary.outcomes.MANUAL_REVIEW, 10);
  assert.ok(summary.outcomes.BLOCKED >= 2);
  assert.ok(summary.outcomes.MANUAL_REVIEW >= 1);
  for (const [file, digest] of before) assert.equal(sha256(readFileSync(join(ROOT, file))), digest, file);
  const receiptPath = summary.records.find((record) => record.receiptPath)?.receiptPath;
  assert.ok(receiptPath);
  const verifiedReceipt = await verifyReceipt({ root: ROOT, receipt: join(out, receiptPath) });
  assert.equal(verifiedReceipt.valid, true, verifiedReceipt.reason);
  await assert.rejects(() => runBatch({ root: ROOT, project, manifest, out, auditOnly: true }));
  const receipt = JSON.parse(await readFile(join(out, receiptPath), "utf8"));
  receipt.source.sourceSha256 = "sha256:" + "0".repeat(64);
  const tamperedPath = join(out, "tampered.json");
  await writeFile(tamperedPath, `${canonicalJson(receipt)}\n`, { flag: "wx" });
  assert.equal((await verifyReceipt({ root: ROOT, receipt: tamperedPath })).valid, false);
}));

test("11 bounded discovery writes a ten-or-fewer unique real-package manifest", async () => withTemp("ts-fungi-discover-", async (dir) => {
  const project = await discoverGraphProject(ROOT);
  const out = join(dir, "manifest.json");
  const result = await runDiscover({ root: ROOT, project, out, limit: 3 });
  assert.equal(result.limit, 3);
  assert.equal(result.selected, 3);
  assert.equal(result.manifest.requests.length, 3);
  assert.ok(Array.isArray(result.skipped));
  assert.ok(result.manifest.requests.every((request) => request.file.startsWith("packages-galerina/") && request.file.includes("/src/") && request.file.endsWith(".ts")));
  assert.equal(new Set(result.manifest.requests.map((request) => `${request.file}#${request.symbol}`)).size, 3);
  assert.deepEqual(JSON.parse(await readFile(out, "utf8")), result.manifest);
}));
