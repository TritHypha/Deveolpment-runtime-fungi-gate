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
  "slide-v2c-executable-validator.fungi",
  "slide-v2c-cbor-encoder.fungi",
];

let parsed;
let program;
let aggregate;
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

async function exportBody(candidate, aggregateCandidate = aggregate) {
  const result = await run(
    "exportSLIDEV2CCanonicalBody",
    new Map([
      ["program", candidate],
      ["aggregate", aggregateCandidate],
    ]),
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
  parsed = parseProgram(source, "slide-v2c-cbor-encoder.fungi", {
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
  const [programResult, aggregateResult] = await Promise.all([
    run("materializeSLIDEV2CExecutableProgram"),
    run("materializeSLIDEV2CAggregateProgram"),
  ]);
  program = programResult.value;
  aggregate = aggregateResult.value;
  const exported = await exportBody(program);
  assert.equal(field(exported, "verdict").value, 1);
  canonicalBytes = field(exported, "bytes").value;
});

describe("SLIDE V2-C canonical producer", () => {
  it("emits one deterministic shortest-form 21-key root", async () => {
    const second = await exportBody(program);
    assert.deepEqual(field(second, "bytes").value, canonicalBytes);
    assert.equal(canonicalBytes[0], 0xb5);
    assert.equal(field(second, "byteLength").value, canonicalBytes.length);
    assert.equal(field(second, "authorityReleased").value, false);
    assert.equal(canonicalBytes.length, 725);
    assert.ok(canonicalBytes.length < 24576);
  });

  it("binds the complete registry and executable aggregate payload", () => {
    const text = new TextDecoder().decode(canonicalBytes);
    assert.ok(text.includes("slide.registry.executable-gir.v2c"));
    assert.ok(
      text.includes(
        "c373bd6c12a7e3602a45c608fd0997e2227a703c73ac75c4270539552877bd38",
      ),
    );
    assert.ok(text.includes("Galerina"));
    const digest = createHash("sha256").update(canonicalBytes).digest("hex");
    assert.equal(
      digest,
      "aa6ecf62b9d54167682569a817e8313ce391e51ce649b5025df750f237b72fe3",
    );
  });

  for (const [name, mutate] of [
    [
      "registry drift",
      (candidate) => candidate.fields.set(
        "registrySetDigest",
        { __tag: "string", value: "0".repeat(64) },
      ),
    ],
    [
      "embedded parent drift",
      (candidate) => field(
        field(field(candidate, "functions").items[0], "blocks").items[0],
        "instructions",
      ).items[1].fields.set("opcodeId", intValue(99)),
    ],
    [
      "aggregate operation drift",
      (candidate) => field(
        field(field(candidate, "functions").items[2], "blocks").items[0],
        "instructions",
      ).items[7].fields.set("opcodeId", intValue(99)),
    ],
    [
      "authority injection",
      (candidate) => field(candidate, "limits").fields.set("capabilities", intValue(1)),
    ],
  ]) {
    it(`releases no partial bytes for ${name}`, async () => {
      const candidate = clone(program);
      mutate(candidate);
      const refused = await exportBody(candidate);
      assert.equal(field(refused, "verdict").value, -1);
      assert.equal(field(refused, "bytes").value.length, 0);
      assert.equal(field(refused, "byteLength").value, 0);
      assert.equal(field(refused, "authorityReleased").value, false);
    });
  }
});
