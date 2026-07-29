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

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_HOSTED = join(HERE, "..", "src", "self-hosted");
const MODEL_PATH = join(
  SELF_HOSTED,
  "slide-v2a-logical-model.fungi",
);
const VALIDATOR_PATH = join(SELF_HOSTED, "slide-v2a-validator.fungi");
const ENCODER_PATH = join(SELF_HOSTED, "slide-v2a-cbor-encoder.fungi");
const IMPORTER_PATH = join(SELF_HOSTED, "slide-v2a-cbor-importer.fungi");
const DIGEST_PATH = join(SELF_HOSTED, "slide-v2a-semantic-digest.fungi");

let parsed;
let importer;
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

function stringValue(value) {
  return { __tag: "string", value };
}

function arrayValue(items) {
  return { __tag: "array", items };
}

function clone(value) {
  return structuredClone(value);
}

function functionAt(value, index) {
  return field(value, "functions").items[index];
}

function blockAt(fn, index) {
  return field(fn, "blocks").items[index];
}

function instructionAt(block, index) {
  return field(block, "instructions").items[index];
}

function edgeAt(block, index) {
  return field(field(block, "terminator"), "edges").items[index];
}

function mutateUniqueSequence(source, sequence, relativeOffset, replacement) {
  const matches = [];
  for (let i = 0; i <= source.length - sequence.length; i += 1) {
    if (sequence.every((byte, j) => source[i + j] === byte)) matches.push(i);
  }
  assert.equal(matches.length, 1, `sequence must occur exactly once: ${sequence}`);
  const value = source.slice();
  value[matches[0] + relativeOffset] = replacement;
  return value;
}

async function run(flowName, args = new Map()) {
  return runOn(parsed, flowName, args);
}

async function runOn(target, flowName, args = new Map()) {
  return executeFlow(
    flowName,
    args,
    target.ast,
    target.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function validate(value) {
  const result = await run(
    "validateSLIDEV2AProgram",
    new Map([["program", value]]),
  );
  assert.equal(result.audit.result, "ok");
  return result.value;
}

before(async () => {
  const [modelSource, validatorSource, encoderSource, importerSource, digestSource] = await Promise.all([
    readFile(MODEL_PATH, "utf8"),
    readFile(VALIDATOR_PATH, "utf8"),
    readFile(ENCODER_PATH, "utf8"),
    readFile(IMPORTER_PATH, "utf8"),
    readFile(DIGEST_PATH, "utf8"),
  ]);
  const source =
    modelSource +
    "\n" +
    validatorSource.replace(/^@version 1\r?\n/, "") +
    "\n" +
    encoderSource.replace(/^@version 1\r?\n/, "");
  parsed = parseProgram(source, "slide-v2a-logical-model.fungi", {
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
  const independentSource =
    modelSource +
    "\n" +
    validatorSource.replace(/^@version 1\r?\n/, "") +
    "\n" +
    importerSource.replace(/^@version 1\r?\n/, "");
  const independentSourceWithDigest =
    independentSource +
    "\n" +
    digestSource.replace(/^@version 1\r?\n/, "");
  importer = parseProgram(independentSourceWithDigest, "slide-v2a-cbor-importer.fungi", {
    requireVersionHeader: true,
  });
  assert.deepEqual(
    importer.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(importer.ast).diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ),
    [],
  );
  const result = await run("materializeSLIDEV2AProgram");
  assert.equal(result.audit.result, "ok");
  program = result.value;
  const exported = await run(
    "exportSLIDEV2ACanonicalBody",
    new Map([["program", program]]),
  );
  assert.equal(exported.audit.result, "ok");
  assert.equal(field(exported.value, "verdict").value, 1);
  canonicalBytes = field(exported.value, "bytes").value;
});

describe("SLIDE executable GIR V2-A logical model", () => {
  it("uses a new frontend-neutral major without changing R1", () => {
    assert.equal(field(program, "formatMajor").value, 2);
    assert.equal(
      field(program, "semanticProfileId").value,
      "slide.semantic.executable-gir.v2",
    );
    assert.equal(
      field(program, "registrySetId").value,
      "slide.registry.executable-gir.v2a",
    );
    assert.equal(field(program, "memoryObjectIds").items.length, 0);
    assert.equal(
      field(program, "registrySetDigest").value,
      "991257bbf4d6d352d3108e27cd423c22e9bf11394571cecb509bc5e8a74df327",
    );
  });

  it("materializes two typed functions with a call and block-parameter join", () => {
    const functions = field(program, "functions").items;
    assert.equal(functions.length, 2);
    assert.equal(field(functions[0], "functionId").value, 1);
    assert.equal(field(functions[1], "functionId").value, 2);

    const mainBlocks = field(functions[1], "blocks").items;
    assert.equal(mainBlocks.length, 7);
    assert.equal(field(mainBlocks[3], "blockId").value, 3);
    assert.deepEqual(
      field(mainBlocks[3], "parameters").items.map((parameter) => [
        field(parameter, "resultId").value,
        field(parameter, "typeId").value,
      ]),
      [[13, 1], [14, 1], [15, 3]],
    );
    assert.equal(
      field(field(mainBlocks[3], "terminator"), "terminatorId").value,
      3,
    );
  });

  it("declares zero effects, capabilities, back edges, and memory objects", () => {
    for (const fn of field(program, "functions").items) {
      assert.equal(field(fn, "declaredEffectIds").items.length, 0);
      assert.equal(field(fn, "requestedCapabilityIds").items.length, 0);
    }
    const limits = field(program, "limits");
    assert.equal(field(limits, "backEdges").value, 0);
    assert.equal(field(limits, "effects").value, 0);
    assert.equal(field(limits, "capabilities").value, 0);
    assert.equal(field(limits, "memoryObjects").value, 0);
    assert.equal(field(limits, "executionSteps").value, 64);
  });

  it("admits the exact closed V2-A graph", async () => {
    const decision = await validate(program);
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "VALIDATED");
    assert.equal(field(decision, "failureId").value, "NONE");
  });

  it("exports deterministic canonical bytes only after semantic admission", async () => {
    const second = await run(
      "exportSLIDEV2ACanonicalBody",
      new Map([["program", program]]),
    );
    assert.equal(field(second.value, "verdict").value, 1);
    assert.deepEqual(field(second.value, "bytes").value, canonicalBytes);
    assert.equal(field(second.value, "byteLength").value, 540);
    assert.equal(canonicalBytes.length, 540);
    assert.equal(canonicalBytes[0], 0xb2);
    assert.equal(
      createHash("sha256").update(canonicalBytes).digest("hex"),
      "ee143f6de55eab66e7e2d6f23ab03816337165d771f8645040ba60ff06976a07",
    );
  });

  it("releases no partial bytes when the graph is not admitted", async () => {
    const candidate = clone(program);
    candidate.fields.set("memoryObjectIds", arrayValue([intValue(1)]));
    const result = await run(
      "exportSLIDEV2ACanonicalBody",
      new Map([["program", candidate]]),
    );
    assert.equal(field(result.value, "verdict").value, -1);
    assert.equal(field(result.value, "status").value, "REFUSED");
    assert.equal(field(result.value, "byteLength").value, 0);
    assert.equal(field(result.value, "bytes").value.length, 0);
  });

  it("independently decodes and semantically admits the canonical body", async () => {
    const result = await runOn(
      importer,
      "decodeSLIDEV2AProgram",
      new Map([["bytes", { __tag: "bytes", value: canonicalBytes }]]),
    );
    assert.equal(result.audit.result, "ok");
    assert.equal(field(field(result.value, "decision"), "verdict").value, 1);
    assert.equal(field(result.value, "consumed").value, 540);
    const decoded = field(result.value, "program");
    assert.equal(field(decoded, "formatMajor").value, 2);
    assert.equal(field(decoded, "functions").items.length, 2);
    assert.equal(
      field(blockAt(functionAt(decoded, 1), 3), "parameters").items.length,
      3,
    );
  });

  it("binds only independently admitted bytes to the v2 semantic domain", async () => {
    const result = await runOn(
      importer,
      "bindSLIDEV2ASemanticDigest",
      new Map([["body", { __tag: "bytes", value: canonicalBytes }]]),
    );
    assert.equal(result.audit.result, "ok");
    assert.equal(field(field(result.value, "decision"), "verdict").value, 1);
    assert.equal(
      field(result.value, "bodyDigest").value,
      "ee143f6de55eab66e7e2d6f23ab03816337165d771f8645040ba60ff06976a07",
    );
    assert.equal(
      field(result.value, "semanticDigest").value,
      "910727d92460501cd592af8130dbef4acd6abd1432d7ea384ba52be66e9d3464",
    );

    const refused = await runOn(
      importer,
      "bindSLIDEV2ASemanticDigest",
      new Map([[
        "body",
        { __tag: "bytes", value: Uint8Array.from([...canonicalBytes, 0]) },
      ]]),
    );
    assert.equal(field(field(refused.value, "decision"), "verdict").value, -1);
    assert.equal(field(refused.value, "bodyDigest").value, "");
    assert.equal(field(refused.value, "semanticDigest").value, "");
  });

  for (const [name, bytes] of [
    ["truncation", () => canonicalBytes.slice(0, -1)],
    ["suffix", () => Uint8Array.from([...canonicalBytes, 0])],
    ["root-key drift", () => {
      const value = canonicalBytes.slice();
      value[2] = 1;
      return value;
    }],
    ["non-shortest root length", () =>
      Uint8Array.from([0xb8, 0x12, ...canonicalBytes.slice(1)])],
    ["unknown decoded opcode", () =>
      mutateUniqueSequence(
        canonicalBytes,
        [0x85, 0x08, 0x05, 0x01, 0x81, 0x05, 0x01],
        2,
        0x09,
      )],
    ["decoded K3 successor drift", () =>
      mutateUniqueSequence(
        canonicalBytes,
        [0x86, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06],
        6,
        0x05,
      )],
    ["registry-digest drift", () => {
      const value = canonicalBytes.slice();
      const marker = new TextEncoder().encode(
        "991257bbf4d6d352d3108e27cd423c22e9bf11394571cecb509bc5e8a74df327",
      );
      let offset = -1;
      for (let i = 0; i <= value.length - marker.length; i += 1) {
        if (marker.every((byte, j) => value[i + j] === byte)) {
          offset = i;
          break;
        }
      }
      assert.notEqual(offset, -1);
      value[offset] ^= 1;
      return value;
    }],
  ]) {
    it(`independent import exposes no partial graph for ${name}`, async () => {
      const result = await runOn(
        importer,
        "decodeSLIDEV2AProgram",
        new Map([["bytes", { __tag: "bytes", value: bytes() }]]),
      );
      assert.equal(field(field(result.value, "decision"), "verdict").value, -1);
      assert.equal(field(field(result.value, "program"), "functions").items.length, 0);
    });
  }

  const mutations = [
    [
      "semantic profile drift",
      (candidate) => {
        candidate.fields.set(
          "semanticProfileId",
          stringValue("slide.semantic.galerina-gir.v1"),
        );
      },
      "SLIDE-V2A-PROGRAM-001",
    ],
    [
      "authority ceiling",
      (candidate) => {
        field(candidate, "limits").fields.set("capabilities", intValue(1));
      },
      "SLIDE-V2A-PROGRAM-002",
    ],
    [
      "unknown opcode",
      (candidate) => {
        instructionAt(blockAt(functionAt(candidate, 0), 0), 1).fields.set(
          "opcodeId",
          intValue(99),
        );
      },
      "SLIDE-V2A-PROGRAM-004",
    ],
    [
      "non-dominating operand",
      (candidate) => {
        field(
          instructionAt(blockAt(functionAt(candidate, 1), 3), 0),
          "operands",
        ).items[0] = intValue(16);
      },
      "SLIDE-V2A-PROGRAM-007",
    ],
    [
      "recursive call target",
      (candidate) => {
        instructionAt(blockAt(functionAt(candidate, 1), 1), 0).fields.set(
          "immediate",
          intValue(2),
        );
      },
      "SLIDE-V2A-PROGRAM-008",
    ],
    [
      "backward edge",
      (candidate) => {
        edgeAt(blockAt(functionAt(candidate, 1), 3), 0).fields.set(
          "targetBlockId",
          intValue(2),
        );
      },
      "SLIDE-V2A-PROGRAM-010",
    ],
    [
      "block argument count drift",
      (candidate) => {
        edgeAt(blockAt(functionAt(candidate, 1), 0), 0).fields.set(
          "arguments",
          arrayValue([intValue(0), intValue(1)]),
        );
      },
      "SLIDE-V2A-PROGRAM-011",
    ],
    [
      "requested capability injection",
      (candidate) => {
        functionAt(candidate, 1).fields.set(
          "requestedCapabilityIds",
          arrayValue([intValue(1)]),
        );
      },
      "SLIDE-V2A-PROGRAM-013",
    ],
    [
      "memory object injection",
      (candidate) => {
        candidate.fields.set("memoryObjectIds", arrayValue([intValue(1)]));
      },
      "SLIDE-V2A-PROGRAM-013",
    ],
    [
      "K3 obligation drift",
      (candidate) => {
        field(candidate, "k3Obligations").items[0].fields.set(
          "denyBlockId",
          intValue(6),
        );
      },
      "SLIDE-V2A-PROGRAM-017",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const candidate = clone(program);
      mutate(candidate);
      const decision = await validate(candidate);
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "status").value, "REFUSED");
      assert.equal(field(decision, "failureId").value, expectedFailure);
    });
  }
});
