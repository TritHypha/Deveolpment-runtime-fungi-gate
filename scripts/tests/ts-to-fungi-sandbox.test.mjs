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
  SCHEMA,
  TOOL_VERSION,
  canonicalRelativeTsPath,
} from "../lib/ts-to-fungi-sandbox/contracts.mjs";
import { classifyTypeScriptSource, discoverTypeScriptScopes, inventoryTypeScriptScopes } from "../lib/ts-to-fungi-sandbox/classifier.mjs";
import {
  alphaShadowFingerprint,
  buildCompilerEvidence,
  buildPhysicalEvidence,
  findCorpusCollision,
  loadWorkingFungiCorpus,
  stablePhysicalEvidenceMatches,
} from "../lib/ts-to-fungi-sandbox/evidence.mjs";
import { discoverGraphProject, resolveSourceIdentity } from "../lib/ts-to-fungi-sandbox/identity.mjs";
import { appendOutcomeRecord, canonicalJson } from "../lib/ts-to-fungi-sandbox/journal.mjs";
import { lowerClassifiedSymbol } from "../lib/ts-to-fungi-sandbox/lowerer.mjs";
import { assertCliInput, assertCliOutput, loadPriorRefusalScopes, runBatch, runDiscover, runInventory, selectedPhysicalProfileRefusal, verifyReceipt } from "../lib/ts-to-fungi-sandbox/controller.mjs";

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

async function graphProject() {
  return process.env.GALERINA_TS_FUNGI_PROJECT ?? await discoverGraphProject(ROOT);
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
  const discovered = await graphProject();
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

test("5b classifier admits closed primitive binary predicates", async () => {
  const source = 'export function same(left: string, right: string): boolean { return left === right; }\n';
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/test/src/value.ts", symbol: "same" });
  assert.equal(classified.outcome, "SUPPORTED");
  const lowered = lowerClassifiedSymbol(classified);
  assert.match(lowered.source, /return left == right/u);
  assert.equal(lowered.vectors.length, 25);
  assert.equal((await buildCompilerEvidence({ source: lowered.source, file: "sandbox/same.fungi", flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors })).green, true);
});

test("5c classifier resolves earlier primitive constants in static templates and exact integer division", () => {
  const source = [
    'const VERSION = "1.2.3";',
    'export const HEADER = `@gate ${VERSION}`;',
    'export const PAGES = (1024 * 1024) / 65536;',
  ].join("\n");
  const header = classifyTypeScriptSource({ source, file: "packages-galerina/test/src/value.ts", symbol: "HEADER" });
  const pages = classifyTypeScriptSource({ source, file: "packages-galerina/test/src/value.ts", symbol: "PAGES" });
  assert.deepEqual(header.value, { type: "string", value: "@gate 1.2.3" });
  assert.deepEqual(pages.value, { type: "number", value: 16 });
  assert.match(lowerClassifiedSymbol(header).source, /return "@gate 1\.2\.3"/u);
  assert.match(lowerClassifiedSymbol(pages).source, /return 16/u);
});

test("5ca classifier treats satisfies as its runtime-erased operand", () => {
  const source = 'export const CODE = "FUNGI-EXAMPLE-001" satisfies string;\n';
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "CODE" });
  assert.deepEqual(classified.value, { type: "string", value: "FUNGI-EXAMPLE-001" });
  assert.match(lowerClassifiedSymbol(classified).source, /return "FUNGI-EXAMPLE-001"/u);
});

test("5cb classifier resolves primitive fields from an earlier inert object for static bitmasks", () => {
  const source = [
    'const FLAGS = { SEALED: 1 << 0, SIGNED: 1 << 1, ERASED: 1 << 2 } as const;',
    'export const DEFINED = FLAGS.SEALED | FLAGS.SIGNED | FLAGS.ERASED;',
  ].join("\n");
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "DEFINED" });
  assert.deepEqual(classified.value, { type: "number", value: 7 });
  assert.match(lowerClassifiedSymbol(classified).source, /return 7/u);
});

test("5d lowerer preserves primitive conjunction through compiler-admitted nested guards", async () => {
  const source = 'export function both(left: string, right: string): boolean { if (left === "x" && right === "y") return true; return false; }\n';
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/test/src/value.ts", symbol: "both" });
  const lowered = lowerClassifiedSymbol(classified);
  assert.match(lowered.source, /if left == "x" \{\n    if right == "y" \{/u);
  assert.equal((await buildCompilerEvidence({ source: lowered.source, file: "sandbox/both.fungi", flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors })).green, true);
});

test("5e classifier and lowerer admit a const primitive arrow behavior", async () => {
  const source = 'export const retain = (value: string): string => value;\n';
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "retain" });
  assert.equal(classified.outcome, "SUPPORTED");
  const lowered = lowerClassifiedSymbol(classified);
  assert.match(lowered.source, /pure flow retain\(value: String\) -> String/u);
  assert.match(lowered.source, /return value/u);
  assert.equal((await buildCompilerEvidence({ source: lowered.source, file: "sandbox/retain.fungi", flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors })).green, true);
});

test("5f finite binary64 constants stay blocked when the physical profile refuses Float", () => {
  const source = 'export const TOLERANCE = 0.001;\n';
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "TOLERANCE" });
  assert.equal(classified.outcome, "BLOCKED");
  assert.ok(classified.blockers.includes("BLOCKED_BY_JAVASCRIPT_BINARY64_OR_NON_INTEGER_NUMBER_ABI"));
});

test("5g a same-file string-literal alias stays blocked without a physical String-parameter profile", () => {
  const source = 'type Mode = "allow" | "deny";\nexport function isAllow(mode: Mode): boolean { return mode === "allow"; }\n';
  const classified = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "isAllow" });
  assert.equal(classified.outcome, "BLOCKED");
  assert.ok(classified.blockers.includes("BLOCKED_BY_UNSUPPORTED_CONTROL_FLOW_OR_AST_NODE"));
});

test("5h Int candidates are limited to the independently proved signed-i32 physical profile", () => {
  for (const [symbol, value, expected] of [
    ["I32_MIN", "-2147483648", "SUPPORTED"],
    ["I32_MAX", "2147483647", "SUPPORTED"],
    ["ABOVE_I32", "2147483648", "BLOCKED"],
    ["BELOW_I32", "-2147483649", "BLOCKED"],
  ]) {
    const classified = classifyTypeScriptSource({ source: `export const ${symbol} = ${value};\n`, file: "packages-galerina/example/src/value.ts", symbol });
    assert.equal(classified.outcome, expected);
    if (expected === "BLOCKED") assert.ok(classified.blockers.includes("BLOCKED_BY_SELECTED_PHYSICAL_INT_RANGE_ABI"));
  }
});

test("5i String candidates encode scalar escapes exactly and still refuse lone surrogates", async () => {
  for (const [symbol, literal, expected, encoded] of [
    ["PLAIN", '"plain-é-😀"', "SUPPORTED", "plain-é-😀"],
    ["BACKSLASH", '"a\\\\b"', "SUPPORTED", "a\\u005cb"],
    ["NEWLINE", '"a\\nb"', "SUPPORTED", "a\\u000ab"],
    ["QUOTE", '"a\\\"b"', "SUPPORTED", "a\\u0022b"],
    ["LONE", '"\\uD800"', "BLOCKED", null],
  ]) {
    const classified = classifyTypeScriptSource({ source: `export const ${symbol} = ${literal};\n`, file: "packages-galerina/example/src/value.ts", symbol });
    assert.equal(classified.outcome, expected);
    if (expected === "BLOCKED") {
      assert.ok(classified.blockers.includes("BLOCKED_BY_SELECTED_PHYSICAL_STRING_LITERAL_ABI"));
      continue;
    }
    const lowered = lowerClassifiedSymbol(classified);
    assert.ok(lowered.source.includes(encoded));
    assert.equal((await buildCompilerEvidence({ source: lowered.source, file: `sandbox/${symbol.toLowerCase()}.fungi`, flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors })).green, true);
    assert.equal((await buildPhysicalEvidence({ root: ROOT, source: lowered.source, flow: lowered.flow, vectors: lowered.vectors })).green, true);
  }
});

test("5j discovery preflights the selected physical profile without narrowing compiler-level String lowering", () => {
  const stringPredicate = classifyTypeScriptSource({
    source: 'export function same(left: string, right: string): boolean { return left === right; }\n',
    file: "packages-galerina/example/src/value.ts",
    symbol: "same",
  });
  const booleanFlow = classifyTypeScriptSource({
    source: 'export function choose(flag: boolean): string { if (flag) return "yes"; return "no"; }\n',
    file: "packages-galerina/example/src/value.ts",
    symbol: "choose",
  });
  assert.equal(stringPredicate.outcome, "SUPPORTED");
  const refusal = selectedPhysicalProfileRefusal(stringPredicate);
  assert.equal(refusal.code, "BLOCKED_BY_SELECTED_PHYSICAL_STRING_PARAMETER_ABI");
  assert.match(refusal.detail, /lone UTF-16 surrogate/u);
  assert.doesNotMatch(refusal.detail, /does not admit String parameters/u);
  assert.equal(selectedPhysicalProfileRefusal(booleanFlow), undefined);
});

test("5k classifier infers only one visibly closed primitive return type", async () => {
  const source = [
    "export function invert(flag: boolean) { if (flag) return false; return true; }",
    'export function mixed(flag: boolean) { if (flag) return false; return "no"; }',
  ].join("\n");
  const invert = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "invert" });
  const mixed = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "mixed" });
  assert.equal(invert.outcome, "SUPPORTED");
  assert.equal(invert.returnType, "boolean");
  assert.match(lowerClassifiedSymbol(invert).source, /pure flow invert\(flag: Bool\) -> Bool/u);
  assert.equal((await buildCompilerEvidence({
    source: lowerClassifiedSymbol(invert).source,
    file: "sandbox/invert.fungi",
    flow: lowerClassifiedSymbol(invert).flow,
    parameterNames: lowerClassifiedSymbol(invert).parameterNames,
    vectors: lowerClassifiedSymbol(invert).vectors,
  })).green, true);
  assert.equal(mixed.outcome, "BLOCKED");
  assert.ok(mixed.blockers.includes(BLOCKERS.UNSUPPORTED_CONTROL));
});

test("5l classifier logs RegExp constants as active identity-bearing state", () => {
  const classified = classifyTypeScriptSource({
    source: "export const KEY_ID = /^[0-9a-f]{16}$/;\n",
    file: "packages-galerina/example/src/value.ts",
    symbol: "KEY_ID",
  });
  assert.equal(classified.outcome, "BLOCKED");
  assert.ok(classified.blockers.includes(BLOCKERS.ACTIVE_OBJECT));
});

test("5m classifier logs positive and negative BigInt literals against the selected physical profile", () => {
  for (const [symbol, literal] of [["BIG", "1n"], ["NEGATIVE_BIG", "-1n"]]) {
    const classified = classifyTypeScriptSource({
      source: `export const ${symbol} = ${literal};\n`,
      file: "packages-galerina/example/src/value.ts",
      symbol,
    });
    assert.equal(classified.outcome, "BLOCKED");
    assert.ok(classified.blockers.includes(BLOCKERS.BIGINT));
  }
});

test("5n classifier logs unresolved identifier and property observations instead of manual review", () => {
  const cases = [
    ["ALIAS", "const SOURCE = load();\nexport const ALIAS = SOURCE;\n"],
    ["MAX", "const LIMITS = Object.freeze({ value: 6 });\nexport const MAX = LIMITS.value;\n"],
    ["COMMAND", "const args = process.argv;\nexport const COMMAND = args[0];\n"],
  ];
  for (const [symbol, source] of cases) {
    const classified = classifyTypeScriptSource({
      source,
      file: "packages-galerina/example/src/value.ts",
      symbol,
    });
    assert.equal(classified.outcome, "BLOCKED");
    assert.ok(classified.blockers.includes(BLOCKERS.UNRESOLVED_OBSERVATION));
  }
});

test("5o classifier logs unresolved binary and conditional initializers with effect-order obligations", () => {
  const cases = [
    ["COUNT", "const ITEMS = new Set();\nexport const COUNT = ITEMS.size + 1;\n"],
    ["ROOT", 'export const ROOT = process.env.ROOT ? resolve(process.env.ROOT) : resolve(".");\n'],
  ];
  for (const [symbol, source] of cases) {
    const classified = classifyTypeScriptSource({
      source,
      file: "packages-galerina/example/src/value.ts",
      symbol,
    });
    assert.equal(classified.outcome, "BLOCKED");
    assert.ok(classified.blockers.includes(BLOCKERS.UNRESOLVED_EXPRESSION));
  }
});

test("5p ambiguous overload review retains exact file and symbol provenance", () => {
  const file = "packages-galerina/example/src/value.ts";
  const source = [
    "export function choose(value: string): string;",
    "export function choose(value: number): number;",
    "export function choose(value: string | number): string | number { return value; }",
  ].join("\n");
  const classified = classifyTypeScriptSource({ source, file, symbol: "choose" });
  assert.equal(classified.outcome, "MANUAL_REVIEW");
  assert.equal(classified.file, file);
  assert.equal(classified.symbol, "choose");
  assert.match(classified.reason, /expected one declaration/u);
  const inventory = inventoryTypeScriptScopes({ source, file });
  assert.equal(inventory.length, 1);
  assert.equal(inventory[0].symbol, "choose");
});

test("5q classes and enums are logged as runtime active objects, not erased declarations", () => {
  for (const [symbol, source] of [
    ["Mode", "export enum Mode { Allow, Deny }\n"],
    ["Service", "export class Service {}\n"],
  ]) {
    const classified = classifyTypeScriptSource({
      source,
      file: "packages-galerina/example/src/value.ts",
      symbol,
    });
    assert.equal(classified.outcome, "BLOCKED");
    assert.ok(classified.blockers.includes(BLOCKERS.ACTIVE_OBJECT));
    assert.ok(!classified.blockers.includes(BLOCKERS.DECLARATION_ONLY));
  }
});

test("5r one runtime value plus a same-name type declaration selects the runtime declaration", () => {
  const classified = classifyTypeScriptSource({
    source: 'export type Mode = "allow" | "deny";\nexport const Mode = { Allow: "allow", Deny: "deny" } as const;\n',
    file: "packages-galerina/example/src/value.ts",
    symbol: "Mode",
  });
  assert.equal(classified.outcome, "BLOCKED");
  assert.ok(classified.blockers.includes(BLOCKERS.ACTIVE_OBJECT));
  assert.equal(classified.symbol, "Mode");
});

test("5s explicit String const-enum members are retained-oracle primitive leaves", async () => {
  const source = [
    "export const enum Mode {",
    '  Allow = "allow",',
    '  Deny = "deny",',
    "  Numeric = 7,",
    "}",
  ].join("\n");
  const allow = classifyTypeScriptSource({ source, file: "packages-galerina/example/src/value.ts", symbol: "Mode.Allow" });
  assert.equal(allow.outcome, "SUPPORTED");
  assert.deepEqual(allow.value, { type: "string", value: "allow" });
  assert.deepEqual(discoverTypeScriptScopes({ source, file: "packages-galerina/example/src/value.ts" }).map((item) => item.symbol), ["Mode.Allow", "Mode.Deny"]);
  const lowered = lowerClassifiedSymbol(allow);
  assert.match(lowered.source, /pure flow modeAllow\(\) -> String/u);
  assert.equal((await buildCompilerEvidence({ source: lowered.source, file: "sandbox/mode-allow.fungi", flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors })).green, true);
  assert.equal((await buildPhysicalEvidence({ root: ROOT, source: lowered.source, flow: lowered.flow, vectors: lowered.vectors })).green, true);
  const camelSource = 'export const enum SystemCapabilityType { NetworkOutbound = "network.outbound" }';
  const camel = lowerClassifiedSymbol(classifyTypeScriptSource({ source: camelSource, file: "packages-galerina/example/src/value.ts", symbol: "SystemCapabilityType.NetworkOutbound" }));
  assert.match(camel.source, /pure flow systemCapabilityTypeNetworkOutbound\(\) -> String/u);
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
  const reserved = classifyTypeScriptSource({ source: 'export const REDACTED = "[redacted]";\n', file: "packages-galerina/test/src/value.ts", symbol: "REDACTED" });
  const loweredReserved = lowerClassifiedSymbol(reserved);
  assert.equal(loweredReserved.flow, "redactedValue");
  assert.match(loweredReserved.source, /pure flow redactedValue\(\) -> String/u);
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
  assert.match(lowered.source, /contract \{ intent \{ "Preserve the admitted TypeScript decision under differential evidence\." \} \}/u);
  const evidence = await buildCompilerEvidence({ source: lowered.source, file: "sandbox/choose.fungi", flow: lowered.flow, parameterNames: lowered.parameterNames, vectors: lowered.vectors });
  assert.equal(evidence.green, true);
  assert.equal(evidence.girHashFirst, evidence.girHashSecond);
  assert.match(evidence.checkedSnapshotSha256, /^sha256:[0-9a-f]{64}$/u);
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
  assert.match(evidence.profileSha256, /^sha256:[0-9a-f]{64}$/u);
  assert.ok(evidence.vokReceiptDigests.length >= 1);
  assert.ok(evidence.vokReceiptDigests.every((value) => /^sha256:[0-9a-f]{64}$/u.test(value)));
});

test("9a physical re-verification permits fresh VOK receipt nonces but not stable evidence drift", () => {
  const base = {
    green: true,
    toolchain: { buildPoint: "a".repeat(40), modules: { "src/a.mjs": "sha256:" + "1".repeat(64) } },
    profileSha256: "sha256:" + "2".repeat(64),
    vokReceiptDigests: ["sha256:" + "3".repeat(64)],
    authorityReleased: false,
    verifiedValues: [1],
    artifactSha256: "sha256:" + "4".repeat(64),
    packageSetDigest: "sha256:" + "5".repeat(64),
    sourceMutationRefused: true,
    artifactMutationRefused: true,
    receiptMutationRefused: true,
  };
  assert.equal(stablePhysicalEvidenceMatches(base, { ...base, vokReceiptDigests: ["sha256:" + "6".repeat(64)] }), true);
  assert.equal(stablePhysicalEvidenceMatches(base, { ...base, artifactSha256: "sha256:" + "7".repeat(64) }), false);
  assert.equal(stablePhysicalEvidenceMatches(base, { ...base, vokReceiptDigests: [] }), false);
});

test("10 a mixed ten-request audit batch continues, retains TypeScript, and detects receipt tampering", async () => withTemp("ts-fungi-batch-", async (dir) => {
  const manifest = JSON.parse(await readFile(join(ROOT, "scripts", "fixtures", "ts-to-fungi-sandbox-pilot.json"), "utf8"));
  const out = join(dir, "published");
  const project = await graphProject();
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

test("11 bounded discovery writes a unique real-package manifest or an explicit exhausted record", async () => withTemp("ts-fungi-discover-", async (dir) => {
  const project = await graphProject();
  const out = join(dir, "manifest.json");
  const result = await runDiscover({ root: ROOT, project, out, limit: 3 });
  assert.equal(result.limit, 3);
  assert.equal(result.accounted, result.scanned);
  assert.equal(Object.values(result.exclusions).reduce((sum, count) => sum + count, 0) + result.selected, result.scanned);
  assert.ok(result.selected >= 0 && result.selected <= 3);
  assert.ok(Array.isArray(result.skipped));
  if (result.selected === 0) {
    assert.equal(result.exhausted, true);
    assert.equal(result.manifest, null);
    assert.deepEqual(JSON.parse(await readFile(out, "utf8")), JSON.parse(canonicalJson(result)));
  } else {
    assert.equal(result.manifest.requests.length, result.selected);
    assert.ok(result.manifest.requests.every((request) => request.file.startsWith("packages-galerina/") && request.file.includes("/src/") && request.file.endsWith(".ts")));
    assert.equal(new Set(result.manifest.requests.map((request) => `${request.file}#${request.symbol}`)).size, result.selected);
    assert.deepEqual(JSON.parse(await readFile(out, "utf8")), result.manifest);
  }
}));

test("12 discovery logs refused sources, excludes the test package, and continues", async () => withTemp("ts-fungi-discover-skip-", async (dir) => {
  const project = await graphProject();
  const result = await runDiscover({
    root: ROOT,
    project,
    out: join(dir, "manifest.json"),
    limit: 10,
  });
  assert.ok(result.selected >= 0 && result.selected <= 10);
  assert.equal(result.accounted, result.scanned);
  assert.equal(Object.values(result.exclusions).reduce((sum, count) => sum + count, 0) + result.selected, result.scanned);
  if (result.manifest !== null) assert.ok(result.manifest.requests.every((request) => !request.file.startsWith("packages-galerina/galerina-test/")));
  assert.ok(result.skipped.length <= result.scanned);
  assert.ok(result.skipped.every((item) => typeof item.reasonCode === "string" && item.reasonCode.length > 0));
  assert.ok(result.skipped.every((item) => !item.scope.startsWith("packages-galerina/galerina-test/")));
}));

test("13 exhausted discovery writes an explicit zero-candidate log", async () => withTemp("ts-fungi-discover-exhausted-", async (dir) => {
  const project = await graphProject();
  const out = join(dir, "discovery.json");
  const result = await runDiscover({
    root: ROOT,
    project,
    out,
    limit: 10,
    after: "packages-galerina/zzzz/src/zzzz.ts#Z",
  });
  assert.equal(result.exhausted, true);
  assert.equal(result.selected, 0);
  assert.equal(result.accounted, result.scanned);
  assert.equal(Object.values(result.exclusions).reduce((sum, count) => sum + count, 0), result.scanned);
  assert.equal(result.manifest, null);
  assert.deepEqual(JSON.parse(await readFile(out, "utf8")), result);
}));

test("14 discovery reuses only current-tool digest-bound current-project refusal receipts", async () => withTemp("ts-fungi-prior-refusal-", async (dir) => {
  const project = await graphProject();
  const identity = await resolveSourceIdentity({ root: ROOT, project, file: SNAPSHOT_FILE, symbol: SNAPSHOT_SYMBOL });
  const records = join(dir, "prior", "records");
  await mkdir(records, { recursive: true });
  const unsigned = {
    schema: SCHEMA,
    toolVersion: TOOL_VERSION,
    outcome: "MANUAL_REVIEW",
    source: {
      file: SNAPSHOT_FILE,
      symbol: SNAPSHOT_SYMBOL,
      sourceSha256: identity.sourceSha256,
      sourceBuildPoint: identity.sourceBuildPoint,
      graph: identity.graph,
    },
  };
  const receipt = { ...unsigned, receiptSha256: sha256(Buffer.from(canonicalJson(unsigned), "utf8")) };
  await writeFile(join(records, "refusal.json"), `${canonicalJson(receipt)}\n`);
  assert.deepEqual(await loadPriorRefusalScopes({ root: ROOT, project, directory: dir }), [`${SNAPSHOT_FILE}#${SNAPSHOT_SYMBOL}`]);
  const staleRoot = join(dir, "stale-root");
  const staleRecords = join(staleRoot, "prior", "records");
  await mkdir(staleRecords, { recursive: true });
  const staleUnsigned = { ...unsigned, toolVersion: TOOL_VERSION - 1 };
  const staleReceipt = { ...staleUnsigned, receiptSha256: sha256(Buffer.from(canonicalJson(staleUnsigned), "utf8")) };
  await writeFile(join(staleRecords, "refusal.json"), `${canonicalJson(staleReceipt)}\n`);
  assert.deepEqual(await loadPriorRefusalScopes({ root: ROOT, project, directory: staleRoot }), []);
  receipt.receiptSha256 = "sha256:" + "0".repeat(64);
  await writeFile(join(records, "forged.json"), `${canonicalJson(receipt)}\n`);
  assert.deepEqual(await loadPriorRefusalScopes({ root: ROOT, project, directory: dir }), [`${SNAPSHOT_FILE}#${SNAPSHOT_SYMBOL}`]);
}));

test("15 inventory logs bounded blocker groups without treating the test package as conversion source", async () => withTemp("ts-fungi-inventory-", async (dir) => {
  const source = [
    'export const READY = true;',
    'export const ACTIVE = new Set(["x"]);',
    'export interface Shape { readonly value: string }',
  ].join("\n");
  const local = inventoryTypeScriptScopes({ source, file: "packages-galerina/example/src/value.ts" });
  assert.deepEqual(local.map((item) => item.outcome), ["SUPPORTED", "BLOCKED", "BLOCKED"]);
  const out = join(dir, "inventory.json");
  const result = await runInventory({ root: ROOT, project: await graphProject(), out, examples: 2 });
  assert.equal(result.schema, "galerina.ts-to-fungi-sandbox.inventory.v1");
  assert.ok(result.totals.SUPPORTED > 0);
  assert.ok(result.totals.BLOCKED > 0);
  assert.ok(result.groups.every((group) => group.examples.length <= 2));
  assert.ok(result.groups.flatMap((group) => group.examples).every((scope) => !scope.startsWith("packages-galerina/galerina-test/")));
  assert.deepEqual(JSON.parse(await readFile(out, "utf8")), result);
}));
