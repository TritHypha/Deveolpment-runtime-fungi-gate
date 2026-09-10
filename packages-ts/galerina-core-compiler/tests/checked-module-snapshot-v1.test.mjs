import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const digest = (digit) => `sha256:${digit.repeat(64)}`;

const makeSnapshot = () => ({
  schema: L.CHECKED_MODULE_SNAPSHOT_SCHEMA,
  edition: L.CHECKED_MODULE_SNAPSHOT_EDITION,
  sourceIdentity: {
    sourceDigest: digest("a"),
    sourceCanonicalization: "UTF8_NO_BOM_LF_NFC_V1",
    byteLength: 32,
  },
  compilerIdentity: {
    packageId: "@galerina/core-compiler",
    version: "1.0.0-beta.2",
    commitDigest: digest("b"),
  },
  checkerIdentities: [{ id: 1, name: "galerina.strict-checks.v1", digest: digest("c") }],
  declarations: [
    { id: 1, name: "main", kind: "function", typeId: 1 },
    { id: 2, name: "value", kind: "parameter", typeId: 1 },
  ],
  resolvedTypes: [
    { id: 1, primitive: "Int" },
  ],
  effects: [{ id: 1, declarationId: 1, checkerId: 1, spanId: 1, effects: [] }],
  valueStates: [{ id: 1, declarationId: 2, checkerId: 1, spanId: 1, state: "known" }],
  governanceFacts: [{ id: 1, declarationId: 1, checkerId: 1, spanId: 1, verdict: "admitted" }],
  constants: [{ id: 1, typeId: 1, value: 42 }],
  sourceSpans: [{ id: 1, startByte: 0, endByte: 10, line: 1, column: 1 }],
  diagnostics: [],
  entryFlowId: 1,
  limits: { maxFunctions: 3, maxBlocks: 8, maxInstructions: 32, maxCallDepth: 2, maxWork: 96 },
  traceFacts: [
    { id: 1, ordinal: 0, operation: "parameter", declarationId: 2, checkerId: 1, spanId: 1, operandDeclarationIds: [], constantId: null, targetFactIds: [] },
    { id: 2, ordinal: 1, operation: "constant", declarationId: 1, checkerId: 1, spanId: 1, operandDeclarationIds: [], constantId: 1, targetFactIds: [] },
    { id: 3, ordinal: 2, operation: "return", declarationId: 1, checkerId: 1, spanId: 1, operandDeclarationIds: [2], constantId: null, targetFactIds: [] },
  ],
});

describe("CheckedModuleSnapshotV1", () => {
  it("round-trips fixed sections and freezes the decoded view", () => {
    const source = makeSnapshot();
    const bytes = L.encodeCheckedModuleSnapshot(source);
    const decoded = L.decodeCheckedModuleSnapshot(bytes);
    assert.deepEqual(decoded, source);
    assert.equal(Object.isFrozen(decoded), true);
    assert.equal(Object.isFrozen(decoded.traceFacts), true);
    assert.doesNotMatch(new TextDecoder().decode(bytes), /AstNode|parser|callback|Map|Set/u);
    assert.match(L.digestCheckedModuleSnapshot(bytes), /^sha256:[0-9a-f]{64}$/u);
    assert.equal(L.computeSnapshotRunIdentity(bytes).sourceDigest, source.sourceIdentity.sourceDigest);
  });

  it("refuses missing or surplus root and fact fields", () => {
    const source = makeSnapshot();
    const { traceFacts: _traceFacts, ...missing } = source;
    assert.throws(() => L.encodeCheckedModuleSnapshot(missing), /ROOT_FIELD/u);
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, extra: true }), /ROOT_FIELD/u);
    const trace = { ...source.traceFacts[0], extra: true };
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, traceFacts: [trace, ...source.traceFacts.slice(1)] }), /TRACE_FACT_FIELD/u);
  });

  it("refuses duplicate and out-of-order IDs, invalid spans and unsupported limits", () => {
    const source = makeSnapshot();
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, declarations: [source.declarations[0], { ...source.declarations[1], id: 1 }] }), /DECLARATIONS_(DUPLICATE|ORDER)/u);
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, traceFacts: [{ ...source.traceFacts[0], ordinal: 1 }, ...source.traceFacts.slice(1)] }), /TRACE_ORDER/u);
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, sourceSpans: [{ ...source.sourceSpans[0], endByte: 99 }] }), /SPAN_END/u);
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, edition: "future" }), /EDITION/u);
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, limits: { ...source.limits, maxWork: 97 } }), /LIMITS/u);
  });

  it("refuses blocking diagnostics, unknown references and hostile records", () => {
    const source = makeSnapshot();
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, diagnostics: [{ id: 1, code: "X", severity: "error", message: "blocked", spanId: null }] }), /DIAGNOSTICS_BLOCKING/u);
    assert.throws(() => L.encodeCheckedModuleSnapshot({ ...source, traceFacts: [{ ...source.traceFacts[2], operandDeclarationIds: [99] }, ...source.traceFacts.slice(0, 2)] }), /TRACE_ORDER|UNKNOWN/u);
    const hostile = { ...source };
    Object.defineProperty(hostile, "schema", { get() { throw new Error("trap"); }, enumerable: true });
    assert.throws(() => L.encodeCheckedModuleSnapshot(hostile), /ACCESSOR/u);
  });
});
