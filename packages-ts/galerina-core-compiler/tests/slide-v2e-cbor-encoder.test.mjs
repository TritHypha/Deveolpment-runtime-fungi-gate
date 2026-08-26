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
];
const ENCODER = "slide-v2e-cbor-encoder.fungi";

let parsed;
let sourceText;
let semanticBody;
let evidence;
let pinnedReceiptBytes;

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

async function makeEvidence(diagnosticSetDigest = "d".repeat(64)) {
  const result = await run(
    "materializeSLIDEV2EFrontendEvidence",
    new Map([
      ["sourceText", vString(sourceText)],
      ["compilerArtifactDigest", vString("c".repeat(64))],
      ["diagnosticSetDigest", vString(diagnosticSetDigest)],
      ["corpusDigest", vString("e".repeat(64))],
      ["vectorSetDigest", vString("f".repeat(64))],
      ["buildActionRootDigest", vString("a".repeat(64))],
      ["toolchainLockDigest", vString("b".repeat(64))],
      ["environmentContractDigest", vString("9".repeat(64))],
      ["semanticBody", vBytes(semanticBody)],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function encode(
  candidate = evidence,
  expected = externalEvidence(),
) {
  const result = await run(
    "exportSLIDEV2ECanonicalReceipt",
    new Map([
      ["evidence", candidate],
      ["sourceText", vString(sourceText)],
      ["semanticBody", vBytes(semanticBody)],
      ["expectedExternalEvidence", expected],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  sourceText = await readFile(FIXTURE, "utf8");
  pinnedReceiptBytes = Uint8Array.from(
    Buffer.from((await readFile(RECEIPT_FIXTURE, "utf8")).trim(), "hex"),
  );
  const sources = await Promise.all(
    FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  try {
    sources.push(await readFile(join(SELF_HOSTED, ENCODER), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const combined = sources
    .map((source, index) =>
      index === 0 ? source : source.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  parsed = parseProgram(combined, ENCODER, { requireVersionHeader: true });
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
      (flow) => flow.name === "exportSLIDEV2ECanonicalReceipt",
    ),
    "V2-E canonical receipt encoder is not implemented",
  );
  semanticBody = (await run("slideV2DCanonicalReferenceBytes")).value.value;
  evidence = await makeEvidence();
});

describe("SLIDE V2-E canonical producer receipt", () => {
  it("emits one deterministic shortest-form body and receipt digest", async () => {
    const first = await encode();
    const second = await encode();
    assert.equal(field(first, "verdict").value, 1);
    assert.equal(field(first, "byteLength").value, 1739);
    assert.deepEqual(field(first, "bytes").value, pinnedReceiptBytes);
    assert.deepEqual(field(first, "bytes").value, field(second, "bytes").value);
    assert.equal(field(first, "byteLength").value, field(first, "bytes").value.length);
    assert.equal(field(first, "receiptDigest").value.length, 64);
    assert.equal(
      field(first, "receiptDigest").value,
      "0398e41a3465f7effa9d9e098d5ff350c07e59c53ed2b52314e52a9c53b8e7d6",
    );
    assert.equal(
      createHash("sha256").update(field(first, "bytes").value).digest("hex"),
      "2a9edb1f3336c77740c330555d78ad1c24cc23640f2a65489c53ce0e04739537",
    );
    assert.equal(
      field(first, "receiptDigest").value,
      createHash("sha256")
        .update(Buffer.from("slide.frontend.galerina.v1\0", "utf8"))
        .update(field(first, "bytes").value)
        .digest("hex"),
    );
    assert.equal(
      field(first, "semanticDigest").value,
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
    assert.equal(field(first, "authorityReleased").value, false);
  });

  it("changes receipt identity but not semantic identity for diagnostics", async () => {
    const first = await encode();
    const changed = await encode(
      await makeEvidence("8".repeat(64)),
      externalEvidence("8".repeat(64)),
    );
    assert.notDeepEqual(field(first, "bytes").value, field(changed, "bytes").value);
    assert.notEqual(
      field(first, "receiptDigest").value,
      field(changed, "receiptDigest").value,
    );
    assert.equal(
      field(first, "semanticDigest").value,
      field(changed, "semanticDigest").value,
    );
  });

  for (const [name, mutate] of [
    ["plan lie", (candidate) =>
      field(field(candidate, "receipt"), "plans").fields.set(
        "memoryPlanDigest",
        vString("0".repeat(64)),
      )],
    ["source-map lie", (candidate) =>
      field(candidate, "sourceMappings").items[0].fields.set(
        "nodeId",
        { __tag: "int", value: 99 },
      )],
    ["authority claim", (candidate) =>
      field(candidate, "receipt").fields.set(
        "authorityReleased",
        { __tag: "bool", value: true },
      )],
  ]) {
    it(`releases no canonical bytes for ${name}`, async () => {
      const candidate = structuredClone(evidence);
      mutate(candidate);
      const refused = await encode(candidate);
      assert.equal(field(refused, "verdict").value, -1);
      assert.equal(field(refused, "bytes").value.length, 0);
      assert.equal(field(refused, "receiptDigest").value, "");
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }
});
