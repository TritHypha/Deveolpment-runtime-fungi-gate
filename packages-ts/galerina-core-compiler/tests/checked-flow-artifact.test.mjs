import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const sha256 = (digit) => `sha256:${digit.repeat(64)}`;

const checkedAst = () => ({
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
});

const artifact = () => ({
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
  checkedAst: checkedAst(),
});

const call = (name, ...args) => {
  assert.equal(typeof L[name], "function", `${name} must be exported`);
  return L[name](...args);
};

describe("RD-0858 closed checked-flow artifact", () => {
  it("exports the frozen codec bounds", () => {
    assert.equal(L.CHECKED_FLOW_ARTIFACT_MAX_BYTES, 262_144);
    assert.equal(L.CHECKED_FLOW_ARTIFACT_MAX_DEPTH, 64);
    assert.equal(L.CHECKED_FLOW_ARTIFACT_MAX_VALUES, 16_384);
    assert.equal(L.CHECKED_FLOW_ARTIFACT_MAX_AST_NODES, 8_192);
  });

  it("round-trips one exact canonical artifact with one terminal LF", () => {
    const bytes = call("encodeCheckedFlowArtifact", artifact());
    assert.equal(bytes.at(-1), 0x0a);
    assert.notEqual(bytes.at(-2), 0x0a);
    assert.deepEqual(call("decodeCheckedFlowArtifact", bytes), artifact());
  });

  it("uses fixed schema order independent of caller key order", () => {
    const expected = call("encodeCheckedFlowArtifact", artifact());
    const reversed = Object.fromEntries(Object.entries(artifact()).reverse());
    assert.deepEqual(call("encodeCheckedFlowArtifact", reversed), expected);
    assert.match(call("digestCheckedFlowArtifact", expected), /^sha256:[0-9a-f]{64}$/);
  });

  it("refuses missing, unknown and identity-neighbour fields", () => {
    const { schema: _schema, ...missing } = artifact();
    assert.throws(() => call("encodeCheckedFlowArtifact", missing), /SCHEMA|field|refus/i);
    assert.throws(
      () => call("encodeCheckedFlowArtifact", { ...artifact(), authorizing: true }),
      /UNKNOWN|field|refus/i,
    );
    assert.throws(
      () => call("encodeCheckedFlowArtifact", { ...artifact(), productId: "trametes" }),
      /IDENTITY|product|refus/i,
    );
  });

  it("refuses duplicate fields before object construction", () => {
    const source = new TextDecoder().decode(call("encodeCheckedFlowArtifact", artifact()));
    const duplicate = source.replace(
      '"schema":"galerina.rd0858.checked-flow.v1",',
      '"schema":"galerina.rd0858.checked-flow.v1","schema":"galerina.rd0858.checked-flow.v1",',
    );
    assert.throws(
      () => call("decodeCheckedFlowArtifact", new TextEncoder().encode(duplicate)),
      /DUPLICATE|canonical|refus/i,
    );
  });

  it("refuses non-canonical bytes, CRLF, BOM and trailing data", () => {
    const canonical = new TextDecoder().decode(call("encodeCheckedFlowArtifact", artifact()));
    for (const neighbour of [
      canonical.replace(/\n$/, "\r\n"),
      `\ufeff${canonical}`,
      canonical.replace(/\n$/, " \n"),
      canonical.replace('"schema":', '"schema" :'),
    ]) {
      assert.throws(
        () => call("decodeCheckedFlowArtifact", new TextEncoder().encode(neighbour)),
        /CANONICAL|UTF8|JSON|refus/i,
      );
    }
  });

  it("refuses NFD strings rather than normalizing silently", () => {
    const current = artifact();
    current.checkedAst.children[3].children[0].children[1].children[0].value = "de\u0301ny";
    assert.throws(
      () => call("encodeCheckedFlowArtifact", current),
      /NFC|CANONICAL|STRING|refus/i,
    );
  });

  it("refuses hostile accessors and Proxies", () => {
    const hostile = new Proxy(artifact(), {
      ownKeys() {
        throw new Error("hostile ownKeys");
      },
    });
    assert.throws(
      () => call("encodeCheckedFlowArtifact", hostile),
      /ACCESS|OBJECT|refus/i,
    );
  });

  it("refuses unsafe numbers and non-closed AST fields", () => {
    assert.throws(
      () => call("encodeCheckedFlowArtifact", { ...artifact(), languageVersion: 1.5 }),
      /INTEGER|VERSION|refus/i,
    );
    const current = artifact();
    current.checkedAst.location = { file: "source.fungi", line: 1, column: 1 };
    assert.throws(
      () => call("encodeCheckedFlowArtifact", current),
      /AST|UNKNOWN|field|refus/i,
    );
  });

  it("refuses top-level versus checked-AST contract mismatch", () => {
    assert.throws(
      () => call("encodeCheckedFlowArtifact", { ...artifact(), flowName: "other" }),
      /IDENTITY|AST|flow|refus/i,
    );
    assert.throws(
      () => call("encodeCheckedFlowArtifact", { ...artifact(), returnType: "Bool" }),
      /CONTRACT|AST|return|refus/i,
    );
  });

  it("refuses surplus root and block nodes outside the exact scalar body", () => {
    const surplusRoot = artifact();
    surplusRoot.checkedAst.children.push({ kind: "identifier", value: "surplus" });
    assert.throws(
      () => call("encodeCheckedFlowArtifact", surplusRoot),
      /AST|CONTRACT|UNKNOWN|refus/i,
    );

    const surplusBlock = artifact();
    surplusBlock.checkedAst.children[3].children.push({ kind: "identifier", value: "surplus" });
    assert.throws(
      () => call("encodeCheckedFlowArtifact", surplusBlock),
      /AST|CONTRACT|UNKNOWN|refus/i,
    );
  });

  it("refuses excessive depth and AST node count", () => {
    const deep = artifact();
    let cursor = deep.checkedAst;
    for (let index = 0; index < 65; index += 1) {
      const child = { kind: "block", children: [] };
      cursor.children = [child];
      cursor = child;
    }
    assert.throws(() => call("encodeCheckedFlowArtifact", deep), /DEPTH|BOUND|refus/i);

    const wide = artifact();
    wide.checkedAst.children = Array.from(
      { length: L.CHECKED_FLOW_ARTIFACT_MAX_AST_NODES },
      () => ({ kind: "identifier", value: "x" }),
    );
    assert.throws(() => call("encodeCheckedFlowArtifact", wide), /NODE|BOUND|refus/i);
  });

  it("refuses artifacts above the byte ceiling", () => {
    const current = artifact();
    current.checkedAst.children[3].children[0].children[1].children[0].value = "x".repeat(262_144);
    assert.throws(() => call("encodeCheckedFlowArtifact", current), /BYTE|BOUND|refus/i);
  });
});
