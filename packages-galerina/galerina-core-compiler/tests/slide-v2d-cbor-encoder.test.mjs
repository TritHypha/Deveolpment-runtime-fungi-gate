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
  "slide-v2a-cbor-encoder.fungi",
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2c-executable-model.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
  "slide-v2d-executable-model.fungi",
  "slide-v2d-executable-validator.fungi",
  "slide-v2d-cbor-encoder.fungi",
];

let parsed;
let program;
let canonicalBytes;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

function intValue(value) {
  return { __tag: "int", value };
}

function clone(value) {
  return structuredClone(value);
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

async function exportBody(candidate) {
  const result = await run(
    "exportSLIDEV2DCanonicalBody",
    new Map([["program", candidate]]),
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
  parsed = parseProgram(source, "slide-v2d-cbor-encoder.fungi", {
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
  program = (await run("materializeSLIDEV2DExecutableProgram")).value;
  const exported = await exportBody(program);
  assert.equal(field(exported, "verdict").value, 1);
  canonicalBytes = field(exported, "bytes").value;
});

describe("SLIDE V2-D canonical producer", () => {
  it("emits one deterministic shortest-form 24-key body", async () => {
    const second = await exportBody(program);
    assert.deepEqual(field(second, "bytes").value, canonicalBytes);
    assert.deepEqual([...canonicalBytes.slice(0, 2)], [0xb8, 0x18]);
    assert.equal(field(second, "byteLength").value, canonicalBytes.length);
    assert.equal(canonicalBytes.length, 791);
    assert.ok(canonicalBytes.length < 28672);
    assert.equal(field(second, "nativeCertificatePresent").value, false);
    assert.equal(field(second, "authorityReleased").value, false);
  });

  it("binds registry, guarded opcodes, memory descriptors, and complete body hash", () => {
    const decoded = new TextDecoder().decode(canonicalBytes);
    assert.ok(decoded.includes("slide.registry.executable-gir.v2d"));
    assert.ok(decoded.includes("a0531c88fa07e5f2b4b2ff2b000cd351ea9abdc1a3cd9b5d87a5ffdd7de3c648"));
    assert.equal(
      createHash("sha256").update(canonicalBytes).digest("hex"),
      "b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38",
    );
    assert.ok(canonicalBytes.includes(21));
    assert.ok(canonicalBytes.includes(22));
  });

  for (const [name, mutate] of [
    ["registry drift", (candidate) => candidate.fields.set("formatMinor", intValue(1))],
    ["guard drift", (candidate) => field(candidate, "guards").items[0].fields.set("failureId", intValue(3))],
    ["memory drift", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("initializationId", intValue(2))],
    ["authority injection", (candidate) => field(candidate, "graphLimits").fields.set("capabilities", intValue(1))],
  ]) {
    it(`releases no partial bytes for ${name}`, async () => {
      const candidate = clone(program);
      mutate(candidate);
      const refused = await exportBody(candidate);
      assert.equal(field(refused, "verdict").value, -1);
      assert.equal(field(refused, "bytes").value.length, 0);
      assert.equal(field(refused, "byteLength").value, 0);
      assert.equal(field(refused, "nativeCertificatePresent").value, false);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }
});
