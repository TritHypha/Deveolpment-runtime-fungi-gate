import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const digest = (digit) => `sha256:${digit.repeat(64)}`;
const source = "@version 1\npure flow choose(v: Bool) -> Int { if v { return 1 } return 0 }\n";
const evidence = {
  schema: L.CHECKED_MODULE_EVIDENCE_SCHEMA,
  stages: ["parser", "symbols", "types", "effects", "values", "governance"].map((name, index) => ({ id: index + 1, name, digest: digest(String.fromCharCode(97 + index)), outcome: "passed" })),
};

describe("emitCanonicalGIRFromSnapshot", () => {
  it("lowers only verified snapshot bytes to the registered scalar GIR", () => {
    const sourceBytes = new TextEncoder().encode(source);
    const parsed = L.parseProgram(source, "fixture.fungi", { requireVersionHeader: true });
    const sealed = L.sealCheckedModuleSnapshot({
      sourceBytes,
      sourceFile: "fixture.fungi",
      parseResult: parsed,
      checkerEvidence: evidence,
      compilerIdentity: { packageId: "@galerina/core-compiler", version: "1.0.0-beta.2", commitDigest: digest("f") },
    });
    const snapshotReference = L.createArtifactReference("galerina", "checked-module-snapshot", sealed.snapshotBytes);
    assert.deepEqual(sealed.snapshot.traceFacts.find((fact) => fact.operation === "branch")?.targetFactIds, [3, 5]);
    assert.deepEqual(sealed.snapshot.traceFacts.find((fact) => fact.operation === "branch")?.operandDeclarationIds, [2]);
    const emission = L.emitCanonicalGIRFromSnapshot(sealed.snapshotBytes, snapshotReference);
    assert.equal(emission.schema, "galerina.detached-gir-emission.v1");
    assert.equal(emission.authorityReleased, false);
    assert.equal(emission.girReference.kind, "canonical-gir");
    assert.equal(emission.girReference.byteLength, emission.girBytes.byteLength);
    assert.equal(emission.girDigest, L.digestArtifactBytes(emission.girBytes));
    assert.equal(emission.girBytes[0], 0xb5);
    assert.deepEqual(L.emitCanonicalGIRFromSnapshot(sealed.snapshotBytes, snapshotReference).girBytes, emission.girBytes);
  });

  it("refuses a mismatched snapshot reference before lowering", () => {
    const sourceBytes = new TextEncoder().encode(source);
    const parsed = L.parseProgram(source, "fixture.fungi", { requireVersionHeader: true });
    const sealed = L.sealCheckedModuleSnapshot({ sourceBytes, sourceFile: "fixture.fungi", parseResult: parsed, checkerEvidence: evidence, compilerIdentity: { packageId: "@galerina/core-compiler", version: "1.0.0-beta.2", commitDigest: digest("f") } });
    const wrong = L.createArtifactReference("galerina", "checked-module-snapshot", new TextEncoder().encode("different"));
    assert.throws(() => L.emitCanonicalGIRFromSnapshot(sealed.snapshotBytes, wrong), /SNAPSHOT_REFERENCE/u);
  });

  it("has no parser or legacy GIR import edge", async () => {
    const sourceText = await readFile(new URL("../src/checked-snapshot-gir-emitter.ts", import.meta.url), "utf8");
    assert.doesNotMatch(sourceText, /from "\.\/parser|from "\.\/gir-emitter|emitGIR|AstNode/u);
  });
});
