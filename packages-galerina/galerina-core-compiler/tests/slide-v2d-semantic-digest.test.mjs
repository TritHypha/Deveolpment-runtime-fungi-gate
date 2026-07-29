import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const REQUIRED_FILES = [
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
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
];
const DIGEST_SOURCE = "slide-v2d-semantic-digest.fungi";

let parsed;
let canonicalBytes;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
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

async function bind(bytes) {
  const result = await run(
    "bindSLIDEV2DSemanticDigest",
    new Map([["body", { __tag: "bytes", value: bytes }]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  const sources = await Promise.all(
    REQUIRED_FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  try {
    sources.push(await readFile(join(SELF_HOSTED, DIGEST_SOURCE), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  const source = sources
    .map((value, index) =>
      index === 0 ? value : value.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  parsed = parseProgram(source, DIGEST_SOURCE, { requireVersionHeader: true });
  assert.deepEqual(
    parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(parsed.ast).diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ),
    [],
  );
  assert.ok(
    parsed.flows.some((flow) => flow.name === "bindSLIDEV2DSemanticDigest"),
    "admission-gated V2-D semantic binding is not implemented",
  );
  canonicalBytes = (await run("slideV2DCanonicalReferenceBytes")).value.value;
});

describe("SLIDE V2-D domain-separated semantic binding", () => {
  it("binds only independently reconstructed and admitted bytes", async () => {
    const binding = await bind(canonicalBytes);
    assert.equal(field(field(binding, "decision"), "verdict").value, 1);
    assert.equal(
      field(binding, "bodyDigest").value,
      "b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38",
    );
    const expectedSemantic = createHash("sha256")
      .update(Buffer.from("slide.gir.semantic.v2\0", "utf8"))
      .update(canonicalBytes)
      .digest("hex");
    assert.equal(
      expectedSemantic,
      "a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4",
    );
    assert.equal(field(binding, "semanticDigest").value, expectedSemantic);
    assert.equal(field(binding, "domainId").value, "slide.gir.semantic.v2");
    assert.equal(field(binding, "authorityReleased").value, false);
  });

  it("releases no digest for structural or semantic refusal", async () => {
    for (const bytes of [
      new Uint8Array(),
      canonicalBytes.slice(0, -1),
      Uint8Array.from([...canonicalBytes, 0]),
      (() => {
        const value = canonicalBytes.slice();
        value[2] = 1;
        return value;
      })(),
      (() => {
        const value = canonicalBytes.slice();
        value[value.length - 1] = 3;
        return value;
      })(),
    ]) {
      const binding = await bind(bytes);
      assert.equal(field(field(binding, "decision"), "verdict").value, -1);
      assert.equal(field(binding, "bodyDigest").value, "");
      assert.equal(field(binding, "semanticDigest").value, "");
      assert.equal(field(binding, "authorityReleased").value, false);
    }
  });
});
