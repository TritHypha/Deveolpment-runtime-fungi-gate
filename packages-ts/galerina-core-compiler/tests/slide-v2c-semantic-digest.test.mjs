import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const FILES = [
  "slide-v2a-logical-model.fungi",
  "slide-v2a-validator.fungi",
  "slide-v2a-cbor-importer.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2c-semantic-digest.fungi",
];

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
    "bindSLIDEV2CSemanticDigest",
    new Map([["body", { __tag: "bytes", value: bytes }]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  const sources = await Promise.all(
    FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  const source = sources
    .map((value, index) =>
      index === 0 ? value : value.replace(/^@version 1\r?\n/, ""),
    )
    .join("\n");
  parsed = parseProgram(source, "slide-v2c-semantic-digest.fungi", {
    requireVersionHeader: true,
  });
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
  const vector = await run("slideV2CCanonicalReferenceBytes");
  canonicalBytes = vector.value.value;
});

describe("SLIDE V2-C domain-separated semantic binding", () => {
  it("binds only the independently decoded and admitted body", async () => {
    const binding = await bind(canonicalBytes);
    assert.equal(field(field(binding, "decision"), "verdict").value, 1);
    assert.equal(
      field(binding, "bodyDigest").value,
      "bb15c49cfed356e7bbf059f29605028291bdeacfa2e24343672343289f88fe24",
    );
    const expectedSemantic = createHash("sha256")
      .update(Buffer.from("slide.gir.semantic.v2\0", "utf8"))
      .update(canonicalBytes)
      .digest("hex");
    assert.equal(
      expectedSemantic,
      "7e89c7c807a04a600a46343f95c1ecfb358e3c1806817f052c950dd1c4d5155c",
    );
    assert.equal(field(binding, "semanticDigest").value, expectedSemantic);
    assert.equal(field(binding, "domainId").value, "slide.gir.semantic.v2");
    assert.equal(field(binding, "authorityReleased").value, false);
  });

  it("releases no digest for structural or semantic refusal", async () => {
    for (const bytes of [
      canonicalBytes.slice(0, -1),
      Uint8Array.from([...canonicalBytes, 0]),
      (() => {
        const value = canonicalBytes.slice();
        value[0] = 0xb4;
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
