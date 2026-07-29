import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { checkTypes, executeFlow, parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "..", "src", "self-hosted", "slide-r1-preflight.fungi");

const stringValue = (value) => ({ __tag: "string", value });
const intValue = (value) => ({ __tag: "int", value });
const boolValue = (value) => ({ __tag: "bool", value });

function validFields() {
  return new Map([
    ["fixtureName", stringValue("slide_k3_checked_add_v1")],
    ["qualifier", stringValue("pure")],
    ["parameterCount", intValue(3)],
    ["leftType", stringValue("Int32")],
    ["rightType", stringValue("Int32")],
    ["admissionType", stringValue("Verdict")],
    ["resultType", stringValue("Result<Int32,FixtureFailure>")],
    ["hasExhaustiveK3", boolValue(true)],
    ["hasCheckedInt32", boolValue(true)],
    ["hasExplicitTerminals", boolValue(true)],
    ["hasCompleteBody", boolValue(true)],
    ["hasAstDependency", boolValue(false)],
    ["hasEffects", boolValue(false)],
    ["hasHostHandles", boolValue(false)],
    ["failureCount", intValue(3)],
  ]);
}

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing decision field '${name}'`);
  return value;
}

async function loadPreflight() {
  const source = await readFile(SOURCE, "utf8");
  const parsed = parseProgram(source, SOURCE, { requireVersionHeader: true });
  const parseErrors = parsed.diagnostics.filter((diag) => diag.severity === "error");
  assert.deepEqual(parseErrors, [], JSON.stringify(parseErrors));
  const typeErrors = checkTypes(parsed.ast).diagnostics.filter((diag) => diag.severity === "error");
  assert.deepEqual(typeErrors, [], JSON.stringify(typeErrors));
  return parsed;
}

async function run(fields) {
  const parsed = await loadPreflight();
  return executeFlow(
    "preflightSLIDER1",
    new Map([["request", { __tag: "record", fields }]]),
    parsed.ast,
    parsed.flows,
  );
}

describe("SLIDE R1 .fungi preflight", () => {
  it("accepts only the exact frozen first-slice fact set", async () => {
    const result = await run(validFields());
    assert.equal(result.audit.result, "ok");
    assert.equal(field(result.value, "verdict").value, 1);
    assert.equal(field(result.value, "status").value, "SUPPORTED");
    assert.equal(field(result.value, "failureId").value, "NONE");
    assert.equal(
      field(result.value, "semanticProfileId").value,
      "slide.semantic.galerina-gir.v1",
    );
    assert.equal(
      field(result.value, "memoryProfileId").value,
      "slide.memory.safe-value.v1",
    );
  });

  const mutations = [
    ["fixtureName", stringValue("another_fixture"), "SLIDE-R1-EXPORT-001"],
    ["qualifier", stringValue("secure"), "SLIDE-R1-EXPORT-002"],
    ["parameterCount", intValue(2), "SLIDE-R1-EXPORT-003"],
    ["leftType", stringValue("Int64"), "SLIDE-R1-EXPORT-004"],
    ["rightType", stringValue("UInt32"), "SLIDE-R1-EXPORT-005"],
    ["admissionType", stringValue("Bool"), "SLIDE-R1-EXPORT-006"],
    ["resultType", stringValue("Int32"), "SLIDE-R1-EXPORT-007"],
    ["hasExhaustiveK3", boolValue(false), "SLIDE-R1-EXPORT-008"],
    ["hasCheckedInt32", boolValue(false), "SLIDE-R1-EXPORT-009"],
    ["hasExplicitTerminals", boolValue(false), "SLIDE-R1-EXPORT-010"],
    ["hasCompleteBody", boolValue(false), "SLIDE-R1-EXPORT-011"],
    ["hasAstDependency", boolValue(true), "SLIDE-R1-EXPORT-012"],
    ["hasEffects", boolValue(true), "SLIDE-R1-EXPORT-013"],
    ["hasHostHandles", boolValue(true), "SLIDE-R1-EXPORT-014"],
    ["failureCount", intValue(2), "SLIDE-R1-EXPORT-015"],
  ];

  for (const [name, value, expectedFailure] of mutations) {
    it(`refuses the ${name} mutation as ${expectedFailure}`, async () => {
      const fields = validFields();
      fields.set(name, value);
      const result = await run(fields);
      assert.equal(result.audit.result, "ok");
      assert.equal(field(result.value, "verdict").value, -1);
      assert.equal(field(result.value, "status").value, "REFUSED");
      assert.equal(field(result.value, "failureId").value, expectedFailure);
    });
  }

  it("refuses a missing critical body fact rather than assuming completeness", async () => {
    const fields = validFields();
    fields.delete("hasCompleteBody");
    const result = await run(fields);
    assert.equal(field(result.value, "verdict").value, -1);
    assert.equal(field(result.value, "failureId").value, "SLIDE-R1-EXPORT-011");
  });

  it("refuses a malformed non-Boolean K3 fact", async () => {
    const fields = validFields();
    fields.set("hasExhaustiveK3", intValue(2));
    const result = await run(fields);
    assert.equal(field(result.value, "verdict").value, -1);
    assert.equal(field(result.value, "failureId").value, "SLIDE-R1-EXPORT-008");
  });

  it("refuses a missing fixture identity before inspecting later facts", async () => {
    const fields = validFields();
    fields.delete("fixtureName");
    fields.set("hasCompleteBody", boolValue(false));
    const result = await run(fields);
    assert.equal(field(result.value, "verdict").value, -1);
    assert.equal(field(result.value, "failureId").value, "SLIDE-R1-EXPORT-001");
  });

  it("uses deterministic first-failure ordering for multiple mismatches", async () => {
    const fields = validFields();
    fields.set("qualifier", stringValue("secure"));
    fields.set("hasHostHandles", boolValue(true));
    const result = await run(fields);
    assert.equal(field(result.value, "verdict").value, -1);
    assert.equal(field(result.value, "failureId").value, "SLIDE-R1-EXPORT-002");
  });
});
