import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const sha256 = (digit) => `sha256:${digit.repeat(64)}`;

function artifact() {
  return {
    schema: "galerina.rd0858.checked-flow.v1",
    hashAlgorithm: "sha256",
    productId: "galerina",
    packageId: "rd0858-unit4-scalar-oracle",
    flowLocator: "rd0858/unit4/scalar-oracle",
    flowName: "scalarOracle",
    languageVersion: 1,
    runtimeProfile: "scalar-1",
    sourceCanonicalization: "UTF8_NO_BOM_LF_NFC_V1",
    sourceDigest: sha256("0"),
    compilerPackageId: "@galerina/core-compiler",
    compilerVersion: "1.0.0-beta.2",
    compilerPackageGraphDigest: sha256("1"),
    checkerSetId: "galerina.strict-checks.v1",
    checkerSetDigest: sha256("2"),
    generatorId: "rd0858-scalar-oracle-generator.v1",
    generatorSourceDigest: sha256("3"),
    qualifier: "pure",
    parameters: [{ name: "subject", type: "Verdict" }],
    returnType: "String",
    declaredEffects: [],
    checkedAst: {
      kind: "pureFlowDecl",
      value: "scalarOracle",
      flags: 33,
      children: [
        {
          kind: "paramDecl",
          value: "subject: Verdict",
          children: [{ kind: "typeRef", value: "Verdict", children: [] }],
        },
        { kind: "typeRef", value: "String", children: [] },
        {
          kind: "contractDecl",
          children: [{ kind: "identifier", value: "effects:block", children: [] }],
        },
        {
          kind: "block",
          children: [{
            kind: "checkExpr",
            children: [
              { kind: "identifier", value: "subject", children: [] },
              ...[["deny", "deny"], ["ambig", "ambig"], ["if", "allow"]].map(([arm, value]) => ({
                kind: "checkArm",
                value: arm,
                children: [{
                  kind: "block",
                  children: [{
                    kind: "returnStmt",
                    children: [{ kind: "stringLiteral", value: `"${value}"`, children: [] }],
                  }],
                }],
              })),
            ],
          }],
        },
      ],
    },
  };
}

const EXPECTED_GIR_BASE64 =
  "tQACAQECeCBzbGlkZS5zZW1hbnRpYy5leGVjdXRhYmxlLWdpci52MgN2c2xpZG" +
  "UuZGlnZXN0LnNoYTI1Ni52MQSCeCFzbGlkZS5yZWdpc3RyeS5leGVjdXRhYmxlLW" +
  "dpci52MmN4QDM2NmMzNmEzNWVlNTQ5M2JkNTljMjMyOTc4M2MzM2NjYmIxNTA1NT" +
  "I4OGIxYTM2MWQyYTE2YjU4YTliMGFhNjYFeBpzbGlkZS5tZW1vcnkuc2FmZS12YW" +
  "x1ZS52MQaFAQIDBAUHlRlgAAEDCBggGDAEAgAAAAAYYBkBABkEABAICAQZEAAAC" +
  "IEBCY0BAgMEBQYHCAkKCwwNCoMBAgMLgYkBAYEDBoCAAISEAICBhQABA4AAgwOB" +
  "AIOCAYCCAoCCA4CEAYCBhQEMBoABgwSBAYCEAoCBhQIMBoACgwSBAoCEA4CBhQM" +
  "MBoADgwSBA4ABDISEAQIBAYQCAwIBhAMEAgGEBAEBAQ2ADoAPgYYBAQABAgMQgB" +
  "GAEoOEAQYBRWFsbG93hAIGAURkZW55hAMGAUVhbWJpZxOAFIA=";

describe("RD-0858 SLIDE GIR adapter", () => {
  it("emits the independently pinned String/K3 V2C bytes", () => {
    const artifactBytes = L.encodeCheckedFlowArtifact(artifact());
    const emission = L.emitRd0858SlideGIR(artifactBytes);
    assert.equal(emission.schema, "galerina.rd0858.slide-gir-emission.v1");
    assert.equal(emission.authorityReleased, false);
    assert.equal(emission.entryFunctionId, 1);
    assert.equal(emission.registrySetId, "slide.registry.executable-gir.v2c");
    assert.equal(emission.resultTypeId, 6);
    assert.equal(emission.girBytes.byteLength, 416);
    assert.equal(Buffer.from(emission.girBytes).toString("base64"), EXPECTED_GIR_BASE64);
    assert.equal(emission.girReference.kind, "canonical-gir");
    assert.equal(emission.girReference.byteLength, 416);
  });

  it("is deterministic and refuses a changed checked-flow artifact", () => {
    const artifactBytes = L.encodeCheckedFlowArtifact(artifact());
    const first = L.emitRd0858SlideGIR(artifactBytes);
    const second = L.emitRd0858SlideGIR(artifactBytes);
    assert.deepEqual(second.girBytes, first.girBytes);
    const changed = Uint8Array.from(artifactBytes);
    changed[changed.length - 2] ^= 1;
    assert.throws(() => L.emitRd0858SlideGIR(changed), /CHECKED_FLOW|JSON|refus/i);
  });
});
