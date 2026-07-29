import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { before, describe, it } from "node:test";
import { promisify } from "node:util";

import {
  checkTypes,
  executeFlow,
  parseProgram,
} from "../dist/index.js";
import { decodeCBOR } from "../dist/manifest-generator.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const EXPECTED_DIGEST =
  "19843a946cf68b2365cf661c278d52e4ca2b54a4230ae59e024205c0e583664d";
const EXPECTED_SEMANTIC_DIGEST =
  "2f3ee739c5882fb106bc4ff5d104f0dcf5eea55cdc295110681f22dbf5e7533f";
const execFileAsync = promisify(execFile);

let encoder;
let validator;
let importer;
let referenceRuntime;
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
  [encoder, validator, importer, referenceRuntime] = await Promise.all([
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
    readFile(join(SELF_HOSTED, "ctll-r1-cbor-importer.fungi"), "utf8").then(
      (source) => parseChecked(source, "ctll-r1-cbor-importer.fungi"),
    ),
    loadCombined(
      ["ctll-r1-cbor-importer.fungi", "ctll-r1-reference-runtime.fungi"],
      "ctll-r1-reference-runtime-combined.fungi",
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

async function structurallyValidate(value) {
  const result = await run(
    importer,
    "validateCTLLR1StructuralBody",
    new Map([["bytes", bytesValue(value)]]),
  );
  assert.equal(result.audit.result, "ok");
  return result.value;
}

function mutateSequence(source, sequence, relativeOffset, replacement) {
  const start = Buffer.from(source).indexOf(Buffer.from(sequence));
  assert.notEqual(start, -1, `sequence ${Buffer.from(sequence).toString("hex")}`);
  const changed = source.slice();
  changed[start + relativeOffset] = replacement;
  return changed;
}

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
    assert.equal(field(first.value, "byteLength").value, 277);
    assert.deepEqual(firstBytes, secondBytes);
    assert.equal(
      createHash("sha256").update(firstBytes).digest("hex"),
      EXPECTED_DIGEST,
    );
    assert.equal(
      createHash("sha256")
        .update(Buffer.from("ctll.gir.semantic.v1\0", "utf8"))
        .update(firstBytes)
        .digest("hex"),
      EXPECTED_SEMANTIC_DIGEST,
    );

    const decoded = decodeCBOR(firstBytes);
    assert.equal(decoded.nextOffset, firstBytes.length);
    assert.equal(decoded.value["0"], 1);
    assert.equal(decoded.value["2"], "ctll.semantic.galerina-gir.v1");
    assert.deepEqual(decoded.value["8"], [1, 1, 2]);
    assert.equal(decoded.value["10"], 0);
    assert.equal(decoded.value["11"].length, 4);
    assert.deepEqual(decoded.value["11"][0], [
      0,
      [
        [0, 1, 1, [], 0],
        [1, 1, 1, [], 1],
        [2, 1, 2, [], 2],
      ],
      [1, [2, 1, 2, 3]],
    ]);
    assert.deepEqual(decoded.value["12"], [
      [1, 2, 1, 1, 1],
      [2, 3, 1, 2, 1],
      [3, 4, 1, 2, 1],
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
    assert.equal(field(decision, "consumed").value, 277);
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

describe("independent structural CTLL R1 importer", () => {
  it("parses and admits the complete canonical typed-ID graph", async () => {
    const decision = await structurallyValidate(canonicalBytes);
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "IMPORTED");
    assert.equal(field(decision, "consumed").value, 277);
  });

  it("rejects non-shortest and indefinite root encodings before semantics", async () => {
    const nonShortest = new Uint8Array(canonicalBytes.length + 1);
    nonShortest[0] = 0xb8;
    nonShortest[1] = 14;
    nonShortest.set(canonicalBytes.slice(1), 2);
    let decision = await structurallyValidate(nonShortest);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-003");

    const indefinite = canonicalBytes.slice();
    indefinite[0] = 0xbf;
    decision = await structurallyValidate(indefinite);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-004");
  });

  it("classifies duplicate/reordered keys, opcode drift, and K3 successor drift", async () => {
    const duplicateKey = canonicalBytes.slice();
    duplicateKey[3] = 0;
    let decision = await structurallyValidate(duplicateKey);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-011");

    const opcodeDrift = mutateSequence(
      canonicalBytes,
      [0x85, 0x03, 0x02, 0x01, 0x82, 0x00, 0x01, 0x00],
      2,
      6,
    );
    decision = await structurallyValidate(opcodeDrift);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-022");

    const successorDrift = mutateSequence(
      canonicalBytes,
      [0x82, 0x01, 0x84, 0x02, 0x01, 0x02, 0x03],
      4,
      2,
    );
    decision = await structurallyValidate(successorDrift);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-034");
  });

  it("classifies missing failure records and rejects suffixes", async () => {
    const missingFailure = mutateSequence(
      canonicalBytes,
      [0x0c, 0x83, 0x85, 0x01, 0x02, 0x01, 0x01, 0x01],
      1,
      0x82,
    );
    let decision = await structurallyValidate(missingFailure);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-040");

    const suffixed = new Uint8Array(canonicalBytes.length + 1);
    suffixed.set(canonicalBytes);
    decision = await structurallyValidate(suffixed);
    assert.equal(field(decision, "failureId").value, "CTLL-R1-IMPORT-044");
  });
});

describe("detached CTLL R1 reference execution", () => {
  async function executeReference(left, right, admission, body = canonicalBytes) {
    const result = await run(
      referenceRuntime,
      "executeCTLLR1Imported",
      new Map([
        ["body", bytesValue(body)],
        ["left", { __tag: "int", value: left }],
        ["right", { __tag: "int", value: right }],
        ["admission", { __tag: "verdict", value: admission }],
      ]),
    );
    assert.equal(result.audit.result, "ok");
    return result.value;
  }

  it("executes ALLOW, DENY, INDETERMINATE, and overflow as distinct typed outcomes", async () => {
    let result = await executeReference(20, 22, 1);
    assert.equal(field(result, "status").value, "OK");
    assert.equal(field(result, "value").value, 42);
    assert.equal(field(result, "failureId").value, 0);

    result = await executeReference(20, 22, -1);
    assert.equal(field(result, "status").value, "FAILED");
    assert.equal(field(result, "failureId").value, 2);

    result = await executeReference(20, 22, 0);
    assert.equal(field(result, "failureId").value, 3);

    result = await executeReference(2_147_483_647, 1, 1);
    assert.equal(field(result, "failureId").value, 1);
    result = await executeReference(-2_147_483_648, -1, 1);
    assert.equal(field(result, "failureId").value, 1);
  });

  it("never executes a structurally refused body", async () => {
    const changed = canonicalBytes.slice();
    changed[0] = 0xbf;
    const result = await executeReference(20, 22, 1, changed);
    assert.equal(field(result, "status").value, "IMPORT_REFUSED");
    assert.equal(field(result, "success").value, false);
    assert.equal(field(result, "importFailureId").value, "CTLL-R1-IMPORT-004");
  });

  it("executes from canonical bytes in a fresh bootstrap process without fixture source or WAT", async () => {
    const importerPath = join(SELF_HOSTED, "ctll-r1-cbor-importer.fungi");
    const runtimePath = join(SELF_HOSTED, "ctll-r1-reference-runtime.fungi");
    const distPath = join(HERE, "..", "dist", "index.js");
    const script = `
      import { readFile } from "node:fs/promises";
      import { parseProgram, executeFlow } from ${JSON.stringify(pathToFileURL(distPath).href)};
      const importer = await readFile(${JSON.stringify(importerPath)}, "utf8");
      const runtime = await readFile(${JSON.stringify(runtimePath)}, "utf8");
      const parsed = parseProgram(
        importer + "\\n" + runtime.replace(/^@version 1\\\\r?\\\\n/, ""),
        "fresh-ctll-r1-runtime.fungi",
        { requireVersionHeader: true },
      );
      const body = {
        __tag: "bytes",
        value: Uint8Array.from(Buffer.from(${JSON.stringify(Buffer.from(canonicalBytes).toString("hex"))}, "hex")),
      };
      const result = await executeFlow(
        "executeCTLLR1Imported",
        new Map([
          ["body", body],
          ["left", { __tag: "int", value: 20 }],
          ["right", { __tag: "int", value: 22 }],
          ["admission", { __tag: "verdict", value: 1 }],
        ]),
        parsed.ast,
        parsed.flows,
        undefined,
        undefined,
        { pureFastPath: false },
      );
      const out = Object.fromEntries(
        [...result.value.fields].map(([key, value]) => [key, value.value]),
      );
      process.stdout.write(JSON.stringify(out));
    `;
    const { stdout } = await execFileAsync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { maxBuffer: 1024 * 1024 },
    );
    assert.deepEqual(JSON.parse(stdout), {
      status: "OK",
      success: true,
      value: 42,
      failureId: 0,
      importFailureId: "NONE",
    });
  });
});
