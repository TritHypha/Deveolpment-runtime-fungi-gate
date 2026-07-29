import assert from "node:assert/strict";
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
  "slide-v2c-cbor-validator.fungi",
  "slide-v2c-cbor-importer.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-validator.fungi",
];
const IMPORTER = "slide-v2d-cbor-importer.fungi";

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
    "decodeSLIDEV2DProgram",
    new Map([["bytes", { __tag: "bytes", value: bytes }]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

function replaceUnique(bytes, sequence, replacementOffset, replacement) {
  const value = bytes.slice();
  let found = -1;
  for (let i = 0; i <= value.length - sequence.length; i += 1) {
    if (sequence.every((byte, j) => value[i + j] === byte)) {
      assert.equal(found, -1, "mutation sequence must be unique");
      found = i;
    }
  }
  assert.notEqual(found, -1, "mutation sequence must exist");
  value[found + replacementOffset] = replacement;
  return value;
}

before(async () => {
  const sources = await Promise.all(
    REQUIRED_FILES.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  try {
    sources.push(await readFile(join(SELF_HOSTED, IMPORTER), "utf8"));
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
  parsed = parseProgram(source, IMPORTER, { requireVersionHeader: true });
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
    parsed.flows.some((flow) => flow.name === "decodeSLIDEV2DProgram"),
    "independent V2-D structural importer is not implemented",
  );
  canonicalBytes = (await run("slideV2DCanonicalReferenceBytes")).value.value;
});

describe("independent structural SLIDE V2-D import", () => {
  it("reconstructs the graph and exact no-address memory plan", async () => {
    const imported = await decode(canonicalBytes);
    assert.equal(field(field(imported, "decision"), "verdict").value, 1);
    assert.equal(field(imported, "consumed").value, 791);
    assert.equal(field(imported, "authorityReleased").value, false);
    const program = field(imported, "program");
    assert.equal(field(program, "formatMinor").value, 2);
    assert.equal(field(program, "functions").items.length, 3);
    assert.equal(field(program, "regions").items.length, 1);
    assert.equal(field(program, "memoryObjects").items.length, 1);
    assert.equal(field(program, "guards").items.length, 1);
    assert.equal(field(program, "nativeCertificatePresent").value, false);

    const region = field(program, "regions").items[0];
    assert.equal(field(region, "byteCeiling").value, 12);
    const object = field(program, "memoryObjects").items[0];
    assert.equal(field(object, "extentElements").value, 3);
    assert.equal(field(object, "elementBytes").value, 4);
    assert.equal(field(object, "initializationId").value, 1);
    const guard = field(program, "guards").items[0];
    assert.equal(field(guard, "guardResultId").value, 8);
    assert.equal(field(guard, "accessResultId").value, 9);
    assert.equal(field(guard, "failureId").value, 4);
  });

  for (const [name, bytes] of [
    ["empty", () => new Uint8Array()],
    ["truncation", () => canonicalBytes.slice(0, -1)],
    ["suffix", () => Uint8Array.from([...canonicalBytes, 0])],
    ["non-shortest root", () => Uint8Array.from([0xb9, 0x00, 0x18, ...canonicalBytes.slice(2)])],
    ["wrong root count", () => Uint8Array.from([0xb7, ...canonicalBytes.slice(2)])],
    ["root-key reorder", () => {
      const value = canonicalBytes.slice();
      value[2] = 1;
      return value;
    }],
    ["unknown guarded opcode", () =>
      replaceUnique(
        canonicalBytes,
        [0x85, 0x08, 0x15, 0x0e, 0x82, 0x06, 0x02, 0x04],
        2,
        0x18,
      )],
    ["region cleanup drift", () =>
      replaceUnique(
        canonicalBytes,
        [0x15, 0x81, 0x85, 0x01, 0x00, 0x01, 0x01, 0x0c],
        6,
        0x02,
      )],
    ["guard failure drift", () =>
      replaceUnique(
        canonicalBytes,
        [0x17, 0x81, 0x88, 0x01, 0x03, 0x00, 0x08, 0x09, 0x01, 0x02, 0x04],
        10,
        0x03,
      )],
  ]) {
    it(`exposes no partial graph or memory plan for ${name}`, async () => {
      const imported = await decode(bytes());
      assert.equal(field(field(imported, "decision"), "verdict").value, -1);
      const program = field(imported, "program");
      assert.equal(field(program, "functions").items.length, 0);
      assert.equal(field(program, "regions").items.length, 0);
      assert.equal(field(program, "memoryObjects").items.length, 0);
      assert.equal(field(program, "guards").items.length, 0);
      assert.equal(field(imported, "authorityReleased").value, false);
    });
  }
});
