import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

import {
  ARTIFACT_REFERENCE_SCHEMA,
  CHECKED_MODULE_SNAPSHOT_SCHEMA,
  canonicalCheckedModuleSnapshotBytes,
  deriveCheckedModuleTraceV1,
  emitCanonicalGIRFromSnapshot,
  sealCheckedModuleSnapshotV1,
} from "../dist/index.js";

const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const marker = (character) => `sha256:${character.repeat(64)}`;
const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(TEST_DIR, "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..", "..");

function snapshotFixture(overrides = {}) {
  const sourceBytes = new TextEncoder().encode("@version 1\npure flow answer() -> Int { return 42 }\n");
  const source = {
    schema: ARTIFACT_REFERENCE_SCHEMA,
    owner: "galerina",
    kind: "fungi-source",
    digest: digest(sourceBytes),
    byteLength: sourceBytes.byteLength,
  };
  const spans = [
    { spanId: "span.module", startByte: 0, endByte: sourceBytes.byteLength },
    { spanId: "span.answer", startByte: 11, endByte: sourceBytes.byteLength - 1 },
  ];
  const tokens = [
    { tokenId: "token.version", kind: "VersionDirective", lexemeDigest: marker("1"), spanId: "span.module" },
    { tokenId: "token.answer", kind: "Identifier", lexemeDigest: marker("2"), spanId: "span.answer" },
  ];
  const declarations = [
    { declarationId: "decl.answer", kind: "PureFlow", name: "answer", spanId: "span.answer" },
  ];
  const typeFacts = [
    { factId: "type.answer", declarationId: "decl.answer", typeIdentity: "() -> Int", spanId: "span.answer" },
  ];
  const effects = [
    { factId: "effect.answer", declarationId: "decl.answer", effect: "pure", spanId: "span.answer" },
  ];
  const valueStates = [
    { factId: "state.answer", declarationId: "decl.answer", state: "safe", spanId: "span.answer" },
  ];
  const governanceDecisions = [
    {
      decisionId: "governance.answer",
      declarationId: "decl.answer",
      verdict: "ALLOW",
      policyDigest: marker("3"),
      evidenceDigest: marker("4"),
      spanId: "span.answer",
    },
  ];
  const constants = [
    {
      constantId: "constant.answer",
      declarationId: "decl.answer",
      domainTag: "Int.i32",
      canonicalValue: "42",
      valueDigest: digest(new TextEncoder().encode("42")),
      spanId: "span.answer",
    },
  ];
  const diagnostics = [];
  const checkerVersions = [
    { stage: "lexer", version: "lexer.v1", rulesetDigest: marker("a") },
    { stage: "parser", version: "parser.v1", rulesetDigest: marker("b") },
    { stage: "type", version: "type.v1", rulesetDigest: marker("c") },
    { stage: "effect", version: "effect.v1", rulesetDigest: marker("d") },
    { stage: "value-state", version: "value-state.v1", rulesetDigest: marker("e") },
    { stage: "governance", version: "governance.v1", rulesetDigest: marker("f") },
  ];
  const facts = {
    source,
    spans,
    tokens,
    declarations,
    typeFacts,
    effects,
    valueStates,
    governanceDecisions,
    constants,
    diagnostics,
    ...overrides,
  };
  const checkerTrace = deriveCheckedModuleTraceV1({ ...facts, checkerVersions })
    .map((entry) => ({ ...entry }));
  const snapshot = sealCheckedModuleSnapshotV1({
    schema: CHECKED_MODULE_SNAPSHOT_SCHEMA,
    source,
    sourceBytes,
    edition: "fungi.v1",
    ...facts,
    checkerTrace,
    compilerCommit: `git:${"6".repeat(40)}`,
    compilerVersion: "galerina-core-compiler@1.0.0-beta.2",
    checkerProfileVersion: "galerina.checked-module.profile.v1",
  });
  const snapshotBytes = canonicalCheckedModuleSnapshotBytes(snapshot);
  const expected = {
    schema: ARTIFACT_REFERENCE_SCHEMA,
    owner: "galerina",
    kind: "checked-module-snapshot",
    digest: digest(snapshotBytes),
    byteLength: snapshotBytes.byteLength,
  };
  return { snapshot, snapshotBytes, expected };
}

function transitiveRelativeImports(entry) {
  const visited = new Set();
  const visit = (file) => {
    const absolute = resolve(file);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    const source = readFileSync(absolute, "utf8");
    const imports = [...source.matchAll(/from\s+["'](\.[^"']+)["']/gu)].map((match) => match[1]);
    for (const specifier of imports) {
      const base = resolve(dirname(absolute), specifier);
      const candidate = base.endsWith(".js") ? `${base.slice(0, -3)}.ts` : `${base}.ts`;
      if (existsSync(candidate)) visit(candidate);
    }
  };
  visit(entry);
  return [...visited];
}

function constantFunctionFacts(count) {
  const declarations = [];
  const typeFacts = [];
  const effects = [];
  const valueStates = [];
  const governanceDecisions = [];
  const constants = [];
  for (let index = 0; index < count; index += 1) {
    const suffix = String(index + 1);
    const declarationId = `decl.answer${suffix}`;
    declarations.push({ declarationId, kind: "PureFlow", name: `answer${suffix}`, spanId: "span.answer" });
    typeFacts.push({ factId: `type.answer${suffix}`, declarationId, typeIdentity: "() -> Int", spanId: "span.answer" });
    effects.push({ factId: `effect.answer${suffix}`, declarationId, effect: "pure", spanId: "span.answer" });
    valueStates.push({ factId: `state.answer${suffix}`, declarationId, state: "safe", spanId: "span.answer" });
    governanceDecisions.push({
      decisionId: `governance.answer${suffix}`,
      declarationId,
      verdict: "ALLOW",
      policyDigest: marker("3"),
      evidenceDigest: marker("4"),
      spanId: "span.answer",
    });
    constants.push({
      constantId: `constant.answer${suffix}`,
      declarationId,
      domainTag: "Int.i32",
      canonicalValue: suffix,
      valueDigest: digest(new TextEncoder().encode(suffix)),
      spanId: "span.answer",
    });
  }
  return { declarations, typeFacts, effects, valueStates, governanceDecisions, constants };
}

test("detached emitter transitive imports cannot reach the AST or bootstrap lowering route", () => {
  const entry = resolve(PACKAGE_ROOT, "src", "checked-snapshot-gir-emitter.ts");
  const closure = transitiveRelativeImports(entry);
  const normalized = closure.map((file) => file.replaceAll("\\", "/"));
  const forbiddenFiles = [
    "/parser.ts",
    "/gir-emitter.ts",
    "/semantic-graph.ts",
    "/execution-plan.ts",
  ];
  for (const suffix of forbiddenFiles) {
    assert.equal(normalized.some((file) => file.endsWith(suffix)), false, `${suffix} reached from detached emitter`);
  }
  const combined = closure.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(combined, /\bSemanticGraphBuilder\b|\bbuildExecutionPlan\b|\bemitGIR\s*\(|from\s+["']typescript["']/u);
});

test("emits the exact parent V2-C canonical CBOR bytes from snapshot facts only", async () => {
  const { snapshotBytes, expected } = snapshotFixture();
  const first = emitCanonicalGIRFromSnapshot(snapshotBytes, expected);
  const second = emitCanonicalGIRFromSnapshot(snapshotBytes, expected);
  assert.equal(first.emitted, true);
  assert.equal(second.emitted, true);
  if (!first.emitted || !second.emitted) return;
  assert.equal(first.semanticProfileId, "slide.semantic.executable-gir.v2");
  assert.equal(first.registrySetId, "slide.registry.executable-gir.v2c");
  assert.equal(first.registrySetDigest, "366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66");
  assert.equal(first.memoryProfileId, "slide.memory.safe-value.v1");
  assert.equal(first.limits.length, 21);
  assert.deepEqual(first.bytes, second.bytes);
  assert.notEqual(first.bytes, second.bytes);
  assert.equal(first.reference.owner, "galerina");
  assert.equal(first.reference.kind, "canonical-gir");
  assert.equal(first.reference.digest, digest(first.bytes));

  const slideModule = resolve(REPOSITORY_ROOT, "..", "SLIDE", "src", "v2c-reference-frontend.mjs");
  const { compileV2CReferenceSource } = await import(pathToFileURL(slideModule).href);
  const oracle = compileV2CReferenceSource([
    "slide-reference 1",
    "",
    "function answer () -> i32",
    "block entry ()",
    "%value = const 42 : i32",
    "return %value",
    "endfunction",
    "",
  ].join("\n"));
  assert.equal(oracle.verdict, 1);
  assert.deepEqual(first.bytes, oracle.bytes);
});

test("trace claims every emitted instruction and terminator exactly once", () => {
  const { snapshotBytes, expected } = snapshotFixture();
  const result = emitCanonicalGIRFromSnapshot(snapshotBytes, expected);
  assert.equal(result.emitted, true);
  if (!result.emitted) return;
  assert.deepEqual(result.trace, [
    {
      functionId: 1,
      blockId: 0,
      nodeKind: "instruction",
      nodeId: 0,
      sourceFactId: "constant.answer",
      spanId: "span.answer",
    },
    {
      functionId: 1,
      blockId: 0,
      nodeKind: "terminator",
      nodeId: 4,
      sourceFactId: "decl.answer",
      spanId: "span.answer",
    },
  ]);
});

test("mismatched snapshot references and unsupported semantics refuse without partial bytes", () => {
  const { snapshotBytes, expected } = snapshotFixture();
  const mismatch = emitCanonicalGIRFromSnapshot(snapshotBytes, { ...expected, digest: marker("9") });
  assert.deepEqual(mismatch, { emitted: false, code: "SNAPSHOT_REFERENCE" });

  const unsupported = snapshotFixture({
    constants: [{
      constantId: "constant.answer",
      declarationId: "decl.answer",
      domainTag: "String",
      canonicalValue: "42",
      valueDigest: digest(new TextEncoder().encode("42")),
      spanId: "span.answer",
    }],
  });
  assert.deepEqual(
    emitCanonicalGIRFromSnapshot(unsupported.snapshotBytes, unsupported.expected),
    { emitted: false, code: "UNSUPPORTED_SNAPSHOT_SEMANTIC" },
  );
});

test("the detached constant-return family refuses a fourth function before emitting bytes", () => {
  const overLimit = snapshotFixture(constantFunctionFacts(4));
  assert.deepEqual(
    emitCanonicalGIRFromSnapshot(overLimit.snapshotBytes, overLimit.expected),
    { emitted: false, code: "GIR_LIMIT" },
  );
});
