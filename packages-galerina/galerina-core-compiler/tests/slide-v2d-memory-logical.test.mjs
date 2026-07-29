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
  "slide-v2c-aggregate-model.fungi",
  "slide-v2c-aggregate-validator.fungi",
  "slide-v2d-memory-model.fungi",
  "slide-v2d-memory-validator.fungi",
];

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

async function validate(candidate) {
  const result = await run(
    "validateSLIDEV2DMemoryProgram",
    new Map([["program", candidate]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

function block(candidate) {
  return field(field(candidate, "function"), "blocks").items[0];
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
  parsed = parseProgram(source, "slide-v2d-memory-logical.fungi", {
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
  program = (await run("materializeSLIDEV2DMemoryProgram")).value;
});

describe("SLIDE V2-D safe-value semantic-memory logical gate", () => {
  it("admits one exact no-address initialized immutable object and guard", async () => {
    for (const [index, instruction] of field(block(program), "instructions").items.entries()) {
      const instructionDecision = await run(
        "validateSLIDEV2DInstruction",
        new Map([
          ["instruction", instruction],
          ["index", intValue(index)],
        ]),
      );
      assert.equal(instructionDecision.audit.result, "ok");
      assert.equal(
        field(instructionDecision.value, "verdict").value,
        1,
        `instruction ${index}`,
      );
    }
    for (const flowName of [
      "validateSLIDEV2DRegistry",
      "validateSLIDEV2DLimits",
      "validateSLIDEV2DIds",
      "validateSLIDEV2DRegionAndObject",
      "validateSLIDEV2DGuardedFunction",
      "validateSLIDEV2DGuardDescriptor",
    ]) {
      const subdecision = await run(
        flowName,
        new Map([["program", program]]),
      );
      assert.equal(subdecision.audit.result, "ok");
      assert.equal(
        field(subdecision.value, "verdict").value,
        1,
        `${flowName}: ${field(subdecision.value, "failureId").value} ${field(subdecision.value, "detail").value}`,
      );
    }
    const decision = await validate(program);
    assert.equal(
      field(decision, "verdict").value,
      1,
      `${field(decision, "failureId").value}: ${field(decision, "detail").value}`,
    );
    assert.equal(field(decision, "status").value, "SEMANTIC_MEMORY_PLAN_VALIDATED");
    assert.equal(field(decision, "semanticMemoryBytes").value, 12);
    assert.equal(field(decision, "guardCount").value, 1);
    assert.equal(field(decision, "nativeCertificatePresent").value, false);
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  it("keeps V2-C IDs append-only and introduces explicit guard/access operations", () => {
    assert.deepEqual(
      field(program, "typeIds").items.map((value) => value.value),
      Array.from({ length: 14 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      field(program, "opcodeIds").items.map((value) => value.value),
      Array.from({ length: 22 }, (_, index) => index + 1),
    );
    assert.deepEqual(
      field(block(program), "instructions").items.slice(8, 10).map(
        (instruction) => field(instruction, "opcodeId").value,
      ),
      [21, 22],
    );
  });

  const mutations = [
    ["registry digest drift", (candidate) => candidate.fields.set("registrySetDigest", stringValue("0".repeat(64))), "SLIDE-V2D-MEMORY-002"],
    ["V2-C parent drift", (candidate) => candidate.fields.set("parentSemanticDigest", stringValue("0".repeat(64))), "SLIDE-V2D-MEMORY-004"],
    ["native certificate claim", (candidate) => candidate.fields.set("nativeCertificatePresent", { __tag: "bool", value: true }), "SLIDE-V2D-MEMORY-006"],
    ["memory-byte ceiling drift", (candidate) => field(candidate, "limits").fields.set("memoryBytes", intValue(11)), "SLIDE-V2D-MEMORY-007"],
    ["heap injection", (candidate) => field(candidate, "limits").fields.set("heapBytes", intValue(1)), "SLIDE-V2D-MEMORY-008"],
    ["raw pointer injection", (candidate) => field(candidate, "limits").fields.set("rawPointers", intValue(1)), "SLIDE-V2D-MEMORY-009"],
    ["manual free injection", (candidate) => field(candidate, "limits").fields.set("manualDeallocations", intValue(1)), "SLIDE-V2D-MEMORY-009"],
    ["shared mutable alias injection", (candidate) => field(candidate, "limits").fields.set("sharedMutableAliases", intValue(1)), "SLIDE-V2D-MEMORY-009"],
    ["FFI injection", (candidate) => field(candidate, "limits").fields.set("ffiBoundaries", intValue(1)), "SLIDE-V2D-MEMORY-009"],
    ["effect injection", (candidate) => candidate.fields.set("effectIds", arrayValue([intValue(1)])), "SLIDE-V2D-MEMORY-010"],
    ["type table gap", (candidate) => field(candidate, "typeIds").items[13] = intValue(15), "SLIDE-V2D-MEMORY-011"],
    ["missing region", (candidate) => field(candidate, "regions").items.pop(), "SLIDE-V2D-MEMORY-012"],
    ["duplicate object", (candidate) => field(candidate, "memoryObjects").items.push(clone(field(candidate, "memoryObjects").items[0])), "SLIDE-V2D-MEMORY-012"],
    ["unknown cleanup policy", (candidate) => field(candidate, "regions").items[0].fields.set("cleanupPolicyId", intValue(2)), "SLIDE-V2D-MEMORY-013"],
    ["owner-region drift", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("ownerRegionId", intValue(2)), "SLIDE-V2D-MEMORY-014"],
    ["zero extent", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("extentElements", intValue(0)), "SLIDE-V2D-MEMORY-015"],
    ["under-alignment", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("alignment", intValue(2)), "SLIDE-V2D-MEMORY-016"],
    ["extent multiplication overflow", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("extentElements", intValue(16)), "SLIDE-V2D-MEMORY-017"],
    ["mutable object", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("mutabilityId", intValue(2)), "SLIDE-V2D-MEMORY-018"],
    ["uninitialized object", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("initializationId", intValue(2)), "SLIDE-V2D-MEMORY-019"],
    ["unknown sensitivity", (candidate) => field(candidate, "memoryObjects").items[0].fields.set("sensitivityId", intValue(2)), "SLIDE-V2D-MEMORY-020"],
    ["guard removed", (candidate) => field(block(candidate), "instructions").items.splice(8, 1), "SLIDE-V2D-MEMORY-025"],
    ["guard moved after access", (candidate) => field(block(candidate), "instructions").items.reverse(), "SLIDE-V2D-MEMORY-022"],
    ["guard bound to another index", (candidate) => field(block(candidate), "instructions").items[8].fields.set("operands", arrayValue([intValue(6), intValue(3)])), "SLIDE-V2D-MEMORY-022"],
    ["access bound to another guard", (candidate) => field(block(candidate), "instructions").items[9].fields.set("operands", arrayValue([intValue(6), intValue(2), intValue(7)])), "SLIDE-V2D-MEMORY-022"],
    ["guard failure drift", (candidate) => field(candidate, "guards").items[0].fields.set("failureId", intValue(3)), "SLIDE-V2D-MEMORY-028"],
    ["guard dominance drift", (candidate) => field(candidate, "guards").items[0].fields.set("guardResultId", intValue(10)), "SLIDE-V2D-MEMORY-029"],
    ["fallthrough edge", (candidate) => field(block(candidate), "terminator").fields.set("edges", arrayValue([{ __tag: "record", fields: new Map([["targetBlockId", intValue(0)], ["arguments", arrayValue([])]]) }])), "SLIDE-V2D-MEMORY-026"],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const candidate = clone(program);
      mutate(candidate);
      const decision = await validate(candidate);
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "status").value, "REFUSED");
      assert.equal(field(decision, "failureId").value, expectedFailure);
      assert.equal(field(decision, "semanticMemoryBytes").value, 0);
      assert.equal(field(decision, "guardCount").value, 0);
      assert.equal(field(decision, "nativeCertificatePresent").value, false);
      assert.equal(field(decision, "authorityReleased").value, false);
    });
  }
});
