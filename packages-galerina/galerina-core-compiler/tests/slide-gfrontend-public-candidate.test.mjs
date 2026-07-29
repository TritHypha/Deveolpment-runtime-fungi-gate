import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const FIXTURE = join(HERE, "fixtures", "slide-g4-checked-source.fungi");
const REQUIRED_FILES = [
  "lexer.fungi",
  "parser.fungi",
  "gir-emitter.fungi",
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
  "slide-v2a-cbor-encoder.fungi",
  "slide-v2a-cbor-importer.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-encoder.fungi",
  "slide-v2c-cbor-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-encoder.fungi",
  "slide-v2d-cbor-validator.fungi",
  "slide-v2d-cbor-importer.fungi",
  "slide-v2d-semantic-digest.fungi",
  "slide-gfrontend-fixture-adapter.fungi",
  "slide-v2e-frontend-schema.fungi",
  "slide-v2e-frontend-validator.fungi",
  "slide-v2e-cbor-encoder.fungi",
  "slide-v2e-cbor-importer.fungi",
  "slide-gfrontend-public-candidate.fungi",
];

const vStr = (value) => ({ __tag: "string", value });
const vBytes = (value) => ({ __tag: "bytes", value });

let compiler;
let sourceText;
let parsedFacts;
let expectations;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

function record(fields) {
  return { __tag: "record", fields: new Map(Object.entries(fields)) };
}

async function run(flowName, args = new Map()) {
  const result = await executeFlow(
    flowName,
    args,
    compiler.ast,
    compiler.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function parseFacts(source) {
  const tokenized = await run("tokenize", new Map([["source", vStr(source)]]));
  const tokens = tokenized.__tag === "ok" ? tokenized.value : tokenized;
  return run("parseFlows", new Map([["tokens", tokens]]));
}

async function materialize(
  source = sourceText,
  facts = parsedFacts,
  expected = expectations,
) {
  return run(
    "materializeSLIDEG4FrontendCandidate",
    new Map([
      ["parsed", facts],
      ["sourceText", vStr(source)],
      ["expectedExternalEvidence", expected],
    ]),
  );
}

before(async () => {
  sourceText = await readFile(FIXTURE, "utf8");
  const sources = await Promise.all(
    REQUIRED_FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  const source = sources
    .map((value, index) =>
      index === 0 ? value : value.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  compiler = parseProgram(source, "slide-gfrontend-public-candidate.fungi", {
    requireVersionHeader: true,
  });
  assert.deepEqual(
    compiler.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.ok(
    compiler.flows.some(
      (flow) => flow.name === "materializeSLIDEG4FrontendCandidate",
    ),
    "G4 materialize-once public candidate is not implemented",
  );
  parsedFacts = await parseFacts(sourceText);
  expectations = record({
    compilerArtifactDigest: vStr("11".repeat(32)),
    diagnosticSetDigest: vStr("22".repeat(32)),
    corpusDigest: vStr("33".repeat(32)),
    vectorSetDigest: vStr("44".repeat(32)),
    buildActionRootDigest: vStr("55".repeat(32)),
    toolchainLockDigest: vStr("66".repeat(32)),
    environmentContractDigest: vStr("77".repeat(32)),
  });
});

describe("SLIDE G4 materialize-once public candidate", () => {
  it("returns exact semantic bytes and independently verified frontend receipt bytes", async () => {
    const candidate = await materialize();
    assert.equal(field(field(candidate, "decision"), "verdict").value, 1);
    assert.equal(field(candidate, "materialized").value, true);
    assert.equal(field(candidate, "semanticBody").value.length, 791);
    assert.equal(
      field(candidate, "semanticDigest").value,
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
    const receiptBody = field(candidate, "frontendReceiptBody").value;
    assert.ok(receiptBody.length > 0);
    assert.ok(receiptBody.length <= 8192);
    const expectedReceiptDigest = createHash("sha256")
      .update(Buffer.from("slide.frontend.galerina.g4.fixture.v1\0", "utf8"))
      .update(receiptBody)
      .digest("hex");
    assert.equal(
      field(candidate, "frontendReceiptDigest").value,
      expectedReceiptDigest,
    );
    assert.equal(field(candidate, "producerEvidencePresent").value, false);
    assert.equal(field(candidate, "authorityReleased").value, false);
  });

  it("is deterministic and materializes exactly once per invocation", async () => {
    assert.deepEqual(await materialize(), await materialize());
  });

  it("independently refuses receipt truncation, suffix, and byte mutation", async () => {
    const candidate = await materialize();
    const receipt = field(candidate, "frontendReceiptBody").value;
    const body = field(candidate, "semanticBody").value;
    const variants = [
      receipt.slice(0, -1),
      Uint8Array.from([...receipt, 0]),
      (() => {
        const value = receipt.slice();
        value[Math.floor(value.length / 2)] ^= 1;
        return value;
      })(),
    ];
    for (const variant of variants) {
      const verified = await run(
        "verifySLIDEG4CanonicalReceipt",
        new Map([
          ["receiptBytes", vBytes(variant)],
          ["sourceText", vStr(sourceText)],
          ["semanticBody", vBytes(body)],
          ["expectedExternalEvidence", expectations],
        ]),
      );
      assert.equal(field(field(verified, "decision"), "verdict").value, -1);
      assert.equal(field(verified, "receiptDigest").value, "");
      assert.equal(field(verified, "authorityReleased").value, false);
    }
  });

  it("refuses source/fact disagreement without partial semantic or receipt bytes", async () => {
    const changedSource = sourceText.replace(
      "return value + 1",
      "return value + 2",
    );
    const candidate = await materialize(changedSource, parsedFacts);
    assert.equal(field(field(candidate, "decision"), "verdict").value, -1);
    assert.equal(field(candidate, "materialized").value, false);
    assert.equal(field(candidate, "semanticBody").value.length, 0);
    assert.equal(field(candidate, "frontendReceiptBody").value.length, 0);
    assert.equal(field(candidate, "semanticDigest").value, "");
    assert.equal(field(candidate, "frontendReceiptDigest").value, "");
    assert.equal(field(candidate, "authorityReleased").value, false);
  });

  it("refuses malformed external evidence without partial outputs", async () => {
    const malformed = structuredClone(expectations);
    malformed.fields.set("diagnosticSetDigest", vStr("not-a-digest"));
    const candidate = await materialize(sourceText, parsedFacts, malformed);
    assert.equal(field(field(candidate, "decision"), "verdict").value, -1);
    assert.equal(field(candidate, "materialized").value, false);
    assert.equal(field(candidate, "semanticBody").value.length, 0);
    assert.equal(field(candidate, "frontendReceiptBody").value.length, 0);
    assert.equal(field(candidate, "authorityReleased").value, false);
  });
});
