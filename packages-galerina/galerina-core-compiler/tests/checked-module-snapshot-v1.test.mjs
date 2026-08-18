import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import {
  CHECKED_MODULE_SNAPSHOT_SCHEMA,
  CheckedModuleSnapshotError,
  canonicalCheckedModuleSnapshotBytes,
  deriveCheckedModuleTraceV1,
  sealCheckedModuleSnapshotV1,
  verifyCheckedModuleSnapshotBytesV1,
} from "../dist/index.js";

const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const marker = (character) => `sha256:${character.repeat(64)}`;

function assertSnapshotError(code) {
  return (error) => {
    assert.equal(error instanceof CheckedModuleSnapshotError, true);
    assert.equal(error.code, code);
    return true;
  };
}

function snapshotFixture() {
  const sourceBytes = new TextEncoder().encode("@version 1\npure flow answer() -> Int { return 42 }\n");
  const source = {
    schema: "galerina.artifact-reference.v1",
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
  const factInput = {
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
  };
  const checkerTrace = deriveCheckedModuleTraceV1({ ...factInput, checkerVersions })
    .map((entry) => ({ ...entry }));
  return {
    input: {
      schema: CHECKED_MODULE_SNAPSHOT_SCHEMA,
      source,
      sourceBytes,
      edition: "fungi.v1",
      ...factInput,
      checkerTrace,
      compilerCommit: `git:${"6".repeat(40)}`,
      compilerVersion: "galerina-core-compiler@1.0.0-beta.2",
      checkerProfileVersion: "galerina.checked-module.profile.v1",
    },
    sourceBytes,
  };
}

test("seals one closed checked-module snapshot and binds its run identity", () => {
  const { input } = snapshotFixture();
  const snapshot = sealCheckedModuleSnapshotV1(input);

  assert.equal(snapshot.schema, CHECKED_MODULE_SNAPSHOT_SCHEMA);
  assert.match(snapshot.snapshotBodyDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(snapshot.runIdentity, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.declarations), true);
  assert.equal("sourceBytes" in snapshot, false);
  assert.equal("ast" in snapshot, false);
  assert.equal("callback" in snapshot, false);
  assert.equal(snapshot.checkerTrace.length, 6);
  assert.deepEqual(snapshot.checkerTrace.map((entry) => entry.stage), [
    "lexer",
    "parser",
    "type",
    "effect",
    "value-state",
    "governance",
  ]);
});

test("source identity and bytes must still match when the snapshot is sealed", () => {
  const { input } = snapshotFixture();
  const changedBytes = input.sourceBytes.slice();
  changedBytes[changedBytes.length - 2] ^= 1;
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, sourceBytes: changedBytes }),
    assertSnapshotError("SNAPSHOT_SOURCE_MISMATCH"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({
      ...input,
      source: { ...input.source, kind: "canonical-gir" },
    }),
    assertSnapshotError("SNAPSHOT_SOURCE_IDENTITY"),
  );
});

test("token spans, declarations and semantic facts must describe one complete source", () => {
  const { input } = snapshotFixture();
  assert.throws(
    () => sealCheckedModuleSnapshotV1({
      ...input,
      tokens: [{ ...input.tokens[0], spanId: "span.missing" }, input.tokens[1]],
    }),
    assertSnapshotError("SNAPSHOT_REFERENCE"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, effects: [] }),
    assertSnapshotError("SNAPSHOT_INCOMPLETE_FACTS"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, valueStates: [] }),
    assertSnapshotError("SNAPSHOT_INCOMPLETE_FACTS"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, governanceDecisions: [] }),
    assertSnapshotError("SNAPSHOT_INCOMPLETE_FACTS"),
  );
});

test("duplicate identities, surplus fields and incomplete checker traces refuse", () => {
  const { input } = snapshotFixture();
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, spans: [input.spans[0], { ...input.spans[1], spanId: input.spans[0].spanId }] }),
    assertSnapshotError("SNAPSHOT_DUPLICATE_IDENTITY"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, ast: { kind: "Program" } }),
    assertSnapshotError("SNAPSHOT_KEYS"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({ ...input, checkerTrace: input.checkerTrace.slice(0, 5) }),
    assertSnapshotError("SNAPSHOT_TRACE"),
  );
  assert.throws(
    () => sealCheckedModuleSnapshotV1({
      ...input,
      checkerTrace: input.checkerTrace.map((entry, index) =>
        index === 2 ? { ...entry, inputDigest: marker("0") } : entry),
    }),
    assertSnapshotError("SNAPSHOT_TRACE"),
  );
});

test("sealing copies aliases once and canonical bytes ignore later caller mutation", () => {
  const { input, sourceBytes } = snapshotFixture();
  const snapshot = sealCheckedModuleSnapshotV1(input);
  const before = canonicalCheckedModuleSnapshotBytes(snapshot);

  sourceBytes.fill(0);
  input.spans[0].endByte = 0;
  input.tokens[0].kind = "Mutated";
  input.declarations[0].name = "mutated";
  input.typeFacts[0].typeIdentity = "String";
  input.effects[0].effect = "network.outbound";
  input.valueStates[0].state = "unsafe";
  input.governanceDecisions[0].verdict = "DENY";
  input.constants[0].domainTag = "String";
  input.constants[0].canonicalValue = "0";
  input.checkerTrace[0].version = "mutated";

  assert.deepEqual(canonicalCheckedModuleSnapshotBytes(snapshot), before);
  assert.equal(snapshot.declarations[0].name, "answer");
  assert.equal(snapshot.effects[0].effect, "pure");
});

test("canonical snapshot verification rejects a one-byte stored-body mutation", () => {
  const { input } = snapshotFixture();
  const snapshot = sealCheckedModuleSnapshotV1(input);
  const bytes = canonicalCheckedModuleSnapshotBytes(snapshot);
  assert.deepEqual(verifyCheckedModuleSnapshotBytesV1(bytes), snapshot);

  const changed = bytes.slice();
  changed[changed.length - 2] ^= 1;
  assert.throws(
    () => verifyCheckedModuleSnapshotBytesV1(changed),
    assertSnapshotError("SNAPSHOT_BYTES"),
  );
});

test("canonical snapshot verification rejects duplicate JSON keys before authority release", () => {
  const { input } = snapshotFixture();
  const snapshot = sealCheckedModuleSnapshotV1(input);
  const canonical = new TextDecoder().decode(canonicalCheckedModuleSnapshotBytes(snapshot));
  const duplicateSchema = canonical.replace(
    `{"schema":"${CHECKED_MODULE_SNAPSHOT_SCHEMA}"`,
    `{"schema":"${CHECKED_MODULE_SNAPSHOT_SCHEMA}","schema":"${CHECKED_MODULE_SNAPSHOT_SCHEMA}"`,
  );
  assert.notEqual(duplicateSchema, canonical);

  assert.throws(
    () => verifyCheckedModuleSnapshotBytesV1(new TextEncoder().encode(duplicateSchema)),
    assertSnapshotError("SNAPSHOT_BYTES"),
  );
});

test("canonical snapshot bytes ignore inherited toJSON hooks", () => {
  const { input } = snapshotFixture();
  const snapshot = sealCheckedModuleSnapshotV1(input);
  const expected = canonicalCheckedModuleSnapshotBytes(snapshot);
  const prior = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  Object.defineProperty(Object.prototype, "toJSON", {
    configurable: true,
    value() { return { schema: "galerina.forged.v1", value: 1 }; },
  });
  try {
    assert.deepEqual(canonicalCheckedModuleSnapshotBytes(snapshot), expected);
    assert.deepEqual(verifyCheckedModuleSnapshotBytesV1(expected), snapshot);
  } finally {
    if (prior === undefined) delete Object.prototype.toJSON;
    else Object.defineProperty(Object.prototype, "toJSON", prior);
  }
});
