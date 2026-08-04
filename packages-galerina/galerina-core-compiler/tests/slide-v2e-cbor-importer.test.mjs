import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const FIXTURE = join(HERE, "fixtures", "slide-v2e-source.fungi");
const RECEIPT_FIXTURE = join(HERE, "fixtures", "slide-v2e-receipt.cbor.hex");
const FILES = [
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
  "slide-v2a-cbor-encoder.fungi",
  "slide-v2a-cbor-importer.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-validator.fungi",
  "slide-v2d-cbor-importer.fungi",
  "slide-v2d-semantic-digest.fungi",
  "slide-v2e-frontend-schema.fungi",
  "slide-v2e-frontend-model.fungi",
  "slide-v2e-frontend-validator.fungi",
  "slide-v2e-cbor-encoder.fungi",
];
const IMPORTER = "slide-v2e-cbor-importer.fungi";
const FRESH_FILES = FILES.filter(
  (name) =>
    name !== "slide-v2e-frontend-model.fungi"
    && name !== "slide-v2e-cbor-encoder.fungi",
);

let parsed;
let freshParsed;
let sourceText;
let semanticBody;
let receiptBytes;
let receipt;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

const vString = (value) => ({ __tag: "string", value });
const vBytes = (value) => ({ __tag: "bytes", value });
const vRecord = (fields) => ({
  __tag: "record",
  fields: new Map(Object.entries(fields)),
});

function externalEvidence(diagnosticSetDigest = "d".repeat(64)) {
  return vRecord({
    compilerArtifactDigest: vString("c".repeat(64)),
    diagnosticSetDigest: vString(diagnosticSetDigest),
    corpusDigest: vString("e".repeat(64)),
    vectorSetDigest: vString("f".repeat(64)),
    buildActionRootDigest: vString("a".repeat(64)),
    toolchainLockDigest: vString("b".repeat(64)),
    environmentContractDigest: vString("9".repeat(64)),
  });
}

async function run(flowName, args = new Map()) {
  return executeFlow(
    flowName,
    args,
    parsed.ast,
    parsed.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function verify(
  bytes = receiptBytes,
  source = sourceText,
  body = semanticBody,
  expected = externalEvidence(),
) {
  const result = await run(
    "verifySLIDEV2ECanonicalReceipt",
    new Map([
      ["receiptBytes", vBytes(bytes)],
      ["sourceText", vString(source)],
      ["semanticBody", vBytes(body)],
      ["expectedExternalEvidence", expected],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function verifySourceBytes(
  sourceBytes,
  bytes = receiptBytes,
  body = semanticBody,
) {
  const result = await run(
    "verifySLIDEV2ECanonicalReceiptBytes",
    new Map([
      ["receiptBytes", vBytes(bytes)],
      ["sourceBytes", vBytes(sourceBytes)],
      ["semanticBody", vBytes(body)],
      ["expectedExternalEvidence", externalEvidence()],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

function replaceUniqueAscii(bytes, text, replacementByte) {
  const needle = Buffer.from(text, "utf8");
  const value = bytes.slice();
  let found = -1;
  for (let i = 0; i <= value.length - needle.length; i += 1) {
    if (needle.every((byte, offset) => value[i + offset] === byte)) {
      assert.equal(found, -1, `sequence must be unique: ${text}`);
      found = i;
    }
  }
  assert.notEqual(found, -1, `sequence must exist: ${text}`);
  value[found] = replacementByte;
  return value;
}

before(async () => {
  sourceText = await readFile(FIXTURE, "utf8");
  const sources = await Promise.all(
    FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  try {
    sources.push(await readFile(join(SELF_HOSTED, IMPORTER), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const combined = sources
    .map((source, index) =>
      index === 0 ? source : source.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  parsed = parseProgram(combined, IMPORTER, { requireVersionHeader: true });
  assert.deepEqual(
    parsed.diagnostics.filter((item) => item.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(parsed.ast).diagnostics.filter(
      (item) => item.severity === "error",
    ),
    [],
  );
  assert.ok(
    parsed.flows.some(
      (flow) => flow.name === "verifySLIDEV2ECanonicalReceipt",
    ),
    "independent V2-E canonical receipt importer is not implemented",
  );
  semanticBody = (await run("slideV2DCanonicalReferenceBytes")).value.value;
  const evidenceResult = await run(
    "materializeSLIDEV2EFrontendEvidence",
    new Map([
      ["sourceText", vString(sourceText)],
      ["compilerArtifactDigest", vString("c".repeat(64))],
      ["diagnosticSetDigest", vString("d".repeat(64))],
      ["corpusDigest", vString("e".repeat(64))],
      ["vectorSetDigest", vString("f".repeat(64))],
      ["buildActionRootDigest", vString("a".repeat(64))],
      ["toolchainLockDigest", vString("b".repeat(64))],
      ["environmentContractDigest", vString("9".repeat(64))],
      ["semanticBody", vBytes(semanticBody)],
    ]),
  );
  const evidence = evidenceResult.value;
  receipt = field(evidence, "receipt");
  const exportResult = await run(
    "exportSLIDEV2ECanonicalReceipt",
    new Map([
      ["evidence", evidence],
      ["sourceText", vString(sourceText)],
      ["semanticBody", vBytes(semanticBody)],
      ["expectedExternalEvidence", externalEvidence()],
    ]),
  );
  receiptBytes = field(exportResult.value, "bytes").value;

  const freshSources = await Promise.all(
    [...FRESH_FILES, IMPORTER].map((name) =>
      readFile(join(SELF_HOSTED, name), "utf8"),
    ),
  );
  const freshCombined = freshSources
    .map((source, index) =>
      index === 0 ? source : source.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  freshParsed = parseProgram(freshCombined, "slide-v2e-fresh-import.fungi", {
    requireVersionHeader: true,
  });
  assert.deepEqual(
    freshParsed.diagnostics.filter((item) => item.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(freshParsed.ast).diagnostics.filter(
      (item) => item.severity === "error",
    ),
    [],
  );
});

describe("independent SLIDE V2-E canonical receipt import", () => {
  it("reconstructs and verifies the complete receipt without trusting its plans", async () => {
    const imported = await verify();
    assert.equal(field(field(imported, "decision"), "verdict").value, 1);
    assert.equal(field(imported, "consumed").value, 1739);
    assert.equal(
      field(imported, "receiptDigest").value,
      "0398e41a3465f7effa9d9e098d5ff350c07e59c53ed2b52314e52a9c53b8e7d6",
    );
    assert.equal(
      field(imported, "semanticDigest").value,
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
    assert.equal(field(imported, "authorityReleased").value, false);
    assert.equal(
      createHash("sha256").update(receiptBytes).digest("hex"),
      "2a9edb1f3336c77740c330555d78ad1c24cc23640f2a65489c53ce0e04739537",
    );
  });

  it("admits the exact normalized UTF-8 source at the byte boundary", async () => {
    const imported = await verifySourceBytes(Buffer.from(sourceText, "utf8"));
    assert.equal(field(field(imported, "decision"), "verdict").value, 1);
    assert.equal(field(imported, "consumed").value, 1739);
    assert.equal(field(imported, "authorityReleased").value, false);
  });

  it("verifies the pinned receipt in a fresh process with no V2-E producer or encoder", async () => {
    assert.equal(
      freshParsed.flows.some(
        (flow) => flow.name === "materializeSLIDEV2EFrontendEvidence",
      ),
      false,
    );
    assert.equal(
      freshParsed.flows.some(
        (flow) => flow.name === "exportSLIDEV2ECanonicalReceipt",
      ),
      false,
    );
    const pinnedReceipt = Uint8Array.from(
      Buffer.from((await readFile(RECEIPT_FIXTURE, "utf8")).trim(), "hex"),
    );
    const result = await executeFlow(
      "verifySLIDEV2ECanonicalReceiptBytes",
      new Map([
        ["receiptBytes", vBytes(pinnedReceipt)],
        ["sourceBytes", vBytes(Buffer.from(sourceText, "utf8"))],
        ["semanticBody", vBytes(semanticBody)],
        ["expectedExternalEvidence", externalEvidence()],
      ]),
      freshParsed.ast,
      freshParsed.flows,
      undefined,
      undefined,
      { pureFastPath: false },
    );
    assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
    assert.equal(
      field(field(result.value, "decision"), "verdict").value,
      1,
    );
    assert.equal(
      field(result.value, "receiptDigest").value,
      "0398e41a3465f7effa9d9e098d5ff350c07e59c53ed2b52314e52a9c53b8e7d6",
    );
    assert.equal(field(result.value, "authorityReleased").value, false);
  });

  for (const [name, sourceBytes] of [
    ["invalid UTF-8", () => Uint8Array.of(0xc3, 0x28)],
    [
      "UTF-8 BOM",
      () =>
        Uint8Array.from([
          0xef,
          0xbb,
          0xbf,
          ...Buffer.from(sourceText, "utf8"),
        ]),
    ],
  ]) {
    it(`refuses ${name} before releasing partial receipt evidence`, async () => {
      const imported = await verifySourceBytes(sourceBytes());
      assert.equal(field(field(imported, "decision"), "verdict").value, -1);
      assert.equal(
        field(field(imported, "decision"), "failureId").value,
        "SLIDE-V2E-RECEIPT-004",
      );
      assert.equal(field(imported, "consumed").value, 0);
      assert.equal(field(imported, "receiptDigest").value, "");
      assert.equal(field(imported, "semanticDigest").value, "");
      assert.equal(field(imported, "authorityReleased").value, false);
    });
  }

  for (const [name, bytes] of [
    ["empty", () => new Uint8Array()],
    ["truncation", () => receiptBytes.slice(0, -1)],
    ["suffix", () => Uint8Array.from([...receiptBytes, 0])],
    ["non-shortest root", () =>
      Uint8Array.from([0xb8, 0x0e, ...receiptBytes.slice(1)])],
    ["wrong root count", () =>
      Uint8Array.from([0xad, ...receiptBytes.slice(1)])],
    ["root-key reorder", () => {
      const value = receiptBytes.slice();
      value[1] = 1;
      return value;
    }],
    ["duplicate root key", () => {
      const value = receiptBytes.slice();
      value[1] = 1;
      return value;
    }],
    ["unknown critical root key", () =>
      Uint8Array.from([0xaf, ...receiptBytes.slice(1), 0x0e, 0x00])],
  ]) {
    it(`releases no partial receipt for ${name}`, async () => {
      const imported = await verify(bytes());
      assert.equal(field(field(imported, "decision"), "verdict").value, -1);
      assert.equal(field(imported, "consumed").value, 0);
      assert.equal(field(imported, "receiptDigest").value, "");
      assert.equal(field(imported, "semanticDigest").value, "");
      assert.equal(field(imported, "authorityReleased").value, false);
    });
  }

  for (const [name, text] of [
    ["semantic digest lie", () => field(receipt, "semanticDigest").value],
    [
      "memory plan lie",
      () => field(field(receipt, "plans"), "memoryPlanDigest").value,
    ],
    ["source map lie", () => field(receipt, "sourceMapDigest").value],
  ]) {
    it(`independently refuses a canonical ${name}`, async () => {
      const imported = await verify(
        replaceUniqueAscii(receiptBytes, text(), 0x30),
      );
      assert.equal(field(field(imported, "decision"), "verdict").value, -1);
      assert.equal(field(imported, "receiptDigest").value, "");
      assert.equal(field(imported, "semanticDigest").value, "");
      assert.equal(field(imported, "authorityReleased").value, false);
    });
  }

  it("rejects source drift without moving frozen semantic identity", async () => {
    const imported = await verify(receiptBytes, `${sourceText}\n`);
    assert.equal(field(field(imported, "decision"), "verdict").value, -1);
    assert.equal(field(imported, "semanticDigest").value, "");
    assert.equal(
      createHash("sha256")
        .update(Buffer.from("slide.gir.semantic.v2\0", "utf8"))
        .update(semanticBody)
        .digest("hex"),
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
  });

  it("rejects semantic body drift with no partial receipt evidence", async () => {
    const changedBody = semanticBody.slice();
    changedBody[changedBody.length - 1] ^= 1;
    const imported = await verify(receiptBytes, sourceText, changedBody);
    assert.equal(field(field(imported, "decision"), "verdict").value, -1);
    assert.equal(field(imported, "consumed").value, 0);
    assert.equal(field(imported, "receiptDigest").value, "");
    assert.equal(field(imported, "semanticDigest").value, "");
    assert.equal(field(imported, "authorityReleased").value, false);
  });

  it("rejects caller-owned external evidence drift", async () => {
    const imported = await verify(
      receiptBytes,
      sourceText,
      semanticBody,
      externalEvidence("8".repeat(64)),
    );
    assert.equal(field(field(imported, "decision"), "verdict").value, -1);
    assert.equal(
      field(field(imported, "decision"), "failureId").value,
      "SLIDE-V2E-RECEIPT-008",
    );
    assert.equal(field(imported, "receiptDigest").value, "");
    assert.equal(field(imported, "authorityReleased").value, false);
  });
});
