import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  checkTypes,
  executeFlow,
  parseProgram,
} from "../dist/index.js";
import { decodeCBOR } from "../dist/manifest-generator.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const EXPECTED_DIGEST =
  "3086e47d7a14c711e60b8581fffb554ee1a755f8481df42ac3cac9b8da0a3f6a";

let encoder;
let validator;
let canonicalProgram;
let canonicalBytes;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

function bytesValue(value) {
  return { __tag: "bytes", value: new Uint8Array(value) };
}

async function parseChecked(source, filename) {
  const parsed = parseProgram(source, filename, { requireVersionHeader: true });
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
  return parsed;
}

async function loadCombined(names, filename) {
  const sources = await Promise.all(
    names.map((name) => readFile(join(SELF_HOSTED, name), "utf8")),
  );
  return parseChecked(
    sources[0] +
      "\n" +
      sources
        .slice(1)
        .map((source) => source.replace(/^@version 1\r?\n/, ""))
        .join("\n"),
    filename,
  );
}

async function run(parsed, flowName, args = new Map()) {
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

async function validate(value) {
  const result = await run(
    validator,
    "validateCTLLR1CanonicalBody",
    new Map([["candidate", bytesValue(value)]]),
  );
  assert.equal(result.audit.result, "ok");
  return result.value;
}

before(async () => {
  [encoder, validator] = await Promise.all([
    loadCombined(
      [
        "ctll-r1-preflight.fungi",
        "ctll-r1-adapter.fungi",
        "ctll-r1-cbor-encoder.fungi",
      ],
      "ctll-r1-cbor-encoder-combined.fungi",
    ),
    readFile(join(SELF_HOSTED, "ctll-r1-cbor-validator.fungi"), "utf8").then(
      (source) => parseChecked(source, "ctll-r1-cbor-validator.fungi"),
    ),
  ]);

  const materialized = await run(encoder, "materializeCTLLR1Fixture");
  canonicalProgram = materialized.value;
  const exported = await run(
    encoder,
    "exportCTLLR1CanonicalBody",
    new Map([["program", canonicalProgram]]),
  );
  canonicalBytes = field(exported.value, "bytes").value;
});

describe("CTLL R1 canonical CBOR semantic body", () => {
  it("emits deterministic typed bytes and binds the complete frozen logical model", async () => {
    const first = await run(
      encoder,
      "exportCTLLR1CanonicalBody",
      new Map([["program", canonicalProgram]]),
    );
    const second = await run(
      encoder,
      "exportCTLLR1CanonicalBody",
      new Map([["program", canonicalProgram]]),
    );
    const firstBytes = field(first.value, "bytes").value;
    const secondBytes = field(second.value, "bytes").value;

    assert.equal(field(first.value, "verdict").value, 1);
    assert.equal(field(first.value, "byteLength").value, 662);
    assert.deepEqual(firstBytes, secondBytes);
    assert.equal(
      createHash("sha256").update(firstBytes).digest("hex"),
      EXPECTED_DIGEST,
    );

    const decoded = decodeCBOR(firstBytes);
    assert.equal(decoded.nextOffset, firstBytes.length);
    assert.equal(decoded.value["0"], 1);
    assert.equal(decoded.value["2"], "ctll.semantic.galerina-gir.v1");
    assert.deepEqual(decoded.value["8"], ["Int32", "Int32", "Verdict"]);
    assert.equal(decoded.value["10"], 0);
    assert.equal(decoded.value["11"].length, 4);
    assert.deepEqual(decoded.value["11"][0], [
      0,
      "entry",
      [
        "v0=param.Int32.left",
        "v1=param.Int32.right",
        "v2=param.Verdict.admission",
      ],
      "check_k3(v2,allow=1,deny=2,indeterminate=3)",
    ]);
    assert.deepEqual(decoded.value["12"], [
      "CTLL_FAILURE_ARITHMETIC",
      "CTLL_FAILURE_POLICY_DENIED",
      "CTLL_FAILURE_POLICY_UNRESOLVED",
    ]);
  });

  it("uses shortest-form CBOR heads at every supported unsigned boundary", async () => {
    const cases = [
      [0, "00"],
      [23, "17"],
      [24, "1818"],
      [255, "18ff"],
      [256, "190100"],
      [65535, "19ffff"],
    ];
    for (const [value, hex] of cases) {
      const encoded = await run(
        encoder,
        "ctllR1CBORUInt",
        new Map([["value", { __tag: "int", value }]]),
      );
      assert.equal(Buffer.from(encoded.value.value).toString("hex"), hex);
    }

    const refused = await run(
      encoder,
      "ctllR1CBORUInt",
      new Map([["value", { __tag: "int", value: 65536 }]]),
    );
    assert.equal(refused.value.value.length, 0);
  });

  it("fails closed and releases no bytes when any admitted semantic field drifts", async () => {
    const changedFields = new Map(canonicalProgram.fields);
    changedFields.set("memoryProfileId", {
      __tag: "string",
      value: "ctll.memory.unsafe.v1",
    });
    const changedProgram = { __tag: "record", fields: changedFields };
    const result = await run(
      encoder,
      "exportCTLLR1CanonicalBody",
      new Map([["program", changedProgram]]),
    );

    assert.equal(field(result.value, "verdict").value, -1);
    assert.equal(field(result.value, "failureId").value, "CTLL-R1-CBOR-001");
    assert.equal(field(result.value, "bytes").value.length, 0);
  });
});

describe("independent CTLL R1 canonical-vector admission", () => {
  it("admits the encoder output and publishes the independently pinned body checksum", async () => {
    const decision = await validate(canonicalBytes);
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "consumed").value, 662);
    assert.equal(
      field(decision, "bodySha256").value,
      `sha256:${EXPECTED_DIGEST}`,
    );
  });

  it("rejects a mutation at every byte position", async () => {
    for (let offset = 0; offset < canonicalBytes.length; offset += 1) {
      const mutated = canonicalBytes.slice();
      mutated[offset] ^= 0x01;
      const decision = await validate(mutated);
      assert.equal(field(decision, "verdict").value, -1, `offset ${offset}`);
      assert.equal(
        field(decision, "failureId").value,
        "CTLL-R1-CBOR-VALIDATE-004",
        `offset ${offset}`,
      );
      assert.equal(
        field(decision, "mismatchOffset").value,
        offset,
        `offset ${offset}`,
      );
    }
  });

  it("rejects truncation, empty input, and surplus bytes with explicit terminals", async () => {
    for (const truncated of [
      new Uint8Array(),
      canonicalBytes.slice(0, 1),
      canonicalBytes.slice(0, canonicalBytes.length - 1),
    ]) {
      const decision = await validate(truncated);
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(
        field(decision, "failureId").value,
        "CTLL-R1-CBOR-VALIDATE-002",
      );
    }

    const surplus = new Uint8Array(canonicalBytes.length + 1);
    surplus.set(canonicalBytes);
    surplus[surplus.length - 1] = 0;
    const decision = await validate(surplus);
    assert.equal(field(decision, "verdict").value, -1);
    assert.equal(
      field(decision, "failureId").value,
      "CTLL-R1-CBOR-VALIDATE-003",
    );
  });
});
