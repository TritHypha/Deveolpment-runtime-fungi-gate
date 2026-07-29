import assert from "node:assert/strict";
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

let parsed;
let program;

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

async function validate(value) {
  const result = await run(
    "validateSLIDEV2AProgram",
    new Map([["program", value]]),
  );
  assert.equal(result.audit.result, "ok");
  return result.value;
}

before(async () => {
  const [modelSource, validatorSource] = await Promise.all([
    readFile(MODEL_PATH, "utf8"),
    readFile(VALIDATOR_PATH, "utf8"),
  ]);
  const source =
    modelSource +
    "\n" +
    validatorSource.replace(/^@version 1\r?\n/, "");
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
  const result = await run("materializeSLIDEV2AProgram");
  assert.equal(result.audit.result, "ok");
  program = result.value;
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
    assert.equal(field(program, "memoryObjectCount").value, 0);
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
        candidate.fields.set("memoryObjectCount", intValue(1));
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
