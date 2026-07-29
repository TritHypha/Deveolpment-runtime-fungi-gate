import assert from "node:assert/strict";
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

async function decode(bytes) {
  const result = await run(
    "decodeSLIDEV2CProgram",
    new Map([["bytes", { __tag: "bytes", value: bytes }]]),
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
  parsed = parseProgram(source, "slide-v2c-cbor-importer.fungi", {
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

describe("independent structural SLIDE V2-C import", () => {
  it("reconstructs the complete executable graph and aggregate descriptors", async () => {
    const imported = await decode(canonicalBytes);
    assert.equal(field(field(imported, "decision"), "verdict").value, 1);
    assert.equal(field(imported, "consumed").value, 725);
    assert.equal(field(imported, "authorityReleased").value, false);
    const program = field(imported, "program");
    assert.equal(field(program, "functions").items.length, 3);
    assert.equal(field(program, "constants").items.length, 2);
    assert.equal(field(program, "recordDescriptors").items.length, 1);
    assert.equal(field(program, "variantDescriptors").items.length, 1);
    assert.equal(
      field(field(program, "functions").items[2], "functionId").value,
      3,
    );
  });

  for (const [name, bytes] of [
    ["empty", () => new Uint8Array()],
    ["truncation", () => canonicalBytes.slice(0, -1)],
    ["suffix", () => Uint8Array.from([...canonicalBytes, 0])],
    ["non-shortest root", () => Uint8Array.from([0xb8, 0x15, ...canonicalBytes.slice(1)])],
    ["wrong root count", () => Uint8Array.from([0xb4, ...canonicalBytes.slice(1)])],
    ["root-key reorder", () => {
      const value = canonicalBytes.slice();
      value[1] = 1;
      return value;
    }],
    ["unknown aggregate opcode", () => {
      const value = canonicalBytes.slice();
      const sequence = [0x85, 0x07, 0x10, 0x0d, 0x82, 0x05, 0x02, 0x00];
      let found = -1;
      for (let i = 0; i <= value.length - sequence.length; i += 1) {
        if (sequence.every((byte, j) => value[i + j] === byte)) {
          assert.equal(found, -1);
          found = i;
        }
      }
      assert.notEqual(found, -1);
      value[found + 2] = 0x18;
      return value;
    }],
  ]) {
    it(`exposes no partial graph for ${name}`, async () => {
      const imported = await decode(bytes());
      assert.equal(field(field(imported, "decision"), "verdict").value, -1);
      const program = field(imported, "program");
      assert.equal(field(program, "functions").items.length, 0);
      assert.equal(field(program, "constants").items.length, 0);
      assert.equal(field(imported, "authorityReleased").value, false);
    });
  }
});
