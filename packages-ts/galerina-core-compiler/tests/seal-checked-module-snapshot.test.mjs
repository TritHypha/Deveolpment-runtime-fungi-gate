import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const digest = (digit) => `sha256:${digit.repeat(64)}`;
const source = "@version 1\npure flow choose(v: Bool) -> Int { if v { return 1 } return 0 }\n";
const evidence = () => ({
  schema: L.CHECKED_MODULE_EVIDENCE_SCHEMA,
  stages: ["parser", "symbols", "types", "effects", "values", "governance"].map((name, index) => ({
    id: index + 1,
    name,
    digest: digest(String.fromCharCode(97 + index)),
    outcome: "passed",
  })),
});

const seal = (text = source, checkerEvidence = evidence()) => {
  const sourceBytes = new TextEncoder().encode(text);
  const parseResult = L.parseProgram(text, "fixture.fungi", { requireVersionHeader: true });
  return L.sealCheckedModuleSnapshot({
    sourceBytes,
    sourceFile: "fixture.fungi",
    parseResult,
    checkerEvidence,
    compilerIdentity: {
      packageId: "@galerina/core-compiler",
      version: "1.0.0-beta.2",
      commitDigest: digest("f"),
    },
  });
};

describe("sealCheckedModuleSnapshot", () => {
  it("captures the checked scalar family without retaining AST objects", () => {
    const result = seal();
    assert.match(result.sourceDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.match(result.snapshotDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(result.snapshot.sourceIdentity.byteLength, new TextEncoder().encode(source).byteLength);
    assert.equal(result.snapshot.traceFacts.some((fact) => fact.operation === "branch"), true);
    assert.equal(result.snapshot.traceFacts.some((fact) => fact.operation === "return"), true);
    assert.doesNotMatch(new TextDecoder().decode(result.snapshotBytes), /AstNode|parser token|callback/u);
    assert.equal(Object.isFrozen(result.snapshot), true);
  });

  it("owns the source bytes and is stable after caller mutation", () => {
    const result = seal();
    const before = new Uint8Array(result.snapshotBytes);
    const callerBytes = new TextEncoder().encode(source);
    callerBytes[0] = 0;
    assert.deepEqual(result.snapshotBytes, before);
    assert.equal(result.runIdentity.snapshotBodyDigest, result.snapshotDigest);
  });

  it("refuses source identity mismatch, checker substitution, and unsupported semantics", () => {
    assert.throws(() => seal(source, { ...evidence(), stages: [{ ...evidence().stages[1], id: 1 }, ...evidence().stages.slice(1)] }), /EVIDENCE_STAGE_ORDER/u);
    const parsed = L.parseProgram(source, "other.fungi", { requireVersionHeader: true });
    assert.throws(() => L.sealCheckedModuleSnapshot({
      sourceBytes: new TextEncoder().encode(source),
      sourceFile: "fixture.fungi",
      parseResult: parsed,
      checkerEvidence: evidence(),
      compilerIdentity: { packageId: "@galerina/core-compiler", version: "1.0.0-beta.2", commitDigest: digest("f") },
    }), /SOURCE_FILE_MISMATCH/u);
    assert.throws(() => seal("@version 1\npure flow loop(v: Int) -> Int { while v { return v } return 0 }\n"), /UNSUPPORTED|PARSE_DIAGNOSTICS|FLOW_ADMISSION/u);
  });
});
