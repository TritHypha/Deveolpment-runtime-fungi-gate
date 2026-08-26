// =============================================================================
// Type Checker Tensor Diagnostics Tests
//
// Tests for FUNGI-TYPE-016, FUNGI-TYPE-017, FUNGI-TYPE-030 enforcement
// and KNOWN_DOMAIN_TYPES suppression of FUNGI-TYPE-001.
//
// Tests:
//   1. Tensor<Float32,[768]> assigned from Tensor<Int8,[768]> → FUNGI-TYPE-030
//   2. Tensor<Float32,[768]> assigned from Tensor<Float32,[512]> → FUNGI-TYPE-016
//   3. Tensor<Float32,[768]> assigned from Tensor<Float32,[768]> → no error
//   4. PatientId (from KNOWN_DOMAIN_TYPES) does not emit FUNGI-TYPE-001
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkTypes } from "../../dist/index.js";

function parseAndCheck(source) {
  const parsed = parseProgram(source, "test.fungi");
  return checkTypes(parsed.ast);
}

function diagCodes(result) {
  return result.diagnostics.map((d) => d.code);
}

// ---------------------------------------------------------------------------
// Test 1: Tensor<Float32,[768]> assigned from Tensor<Int8,[768]> → FUNGI-TYPE-030
// ---------------------------------------------------------------------------

describe("FUNGI-TYPE-030: Tensor element type mismatch", () => {
  it("Tensor<Float32,[768]> assigned from Tensor<Int8,[768]> emits FUNGI-TYPE-030", () => {
    const result = parseAndCheck(`
flow testTensorElementMismatch(quantized: Tensor<Int8, [768]>) -> String {
  let embedding: Tensor<Float32, [768]> = quantized
  return "done"
}
`);
    const codes = diagCodes(result);
    assert.ok(
      codes.includes("FUNGI-TYPE-030"),
      `Expected FUNGI-TYPE-030 (TensorElementTypeMismatch) but got: [${codes.join(", ")}]`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 2: Tensor<Float32,[768]> assigned from Tensor<Float32,[512]> → FUNGI-TYPE-016
// ---------------------------------------------------------------------------

describe("FUNGI-TYPE-016: Tensor shape mismatch", () => {
  it("Tensor<Float32,[768]> assigned from Tensor<Float32,[512]> emits FUNGI-TYPE-016", () => {
    const result = parseAndCheck(`
flow testTensorShapeMismatch(small: Tensor<Float32, [512]>) -> String {
  let embedding: Tensor<Float32, [768]> = small
  return "done"
}
`);
    const codes = diagCodes(result);
    assert.ok(
      codes.includes("FUNGI-TYPE-016"),
      `Expected FUNGI-TYPE-016 (TensorShapeMismatch) but got: [${codes.join(", ")}]`,
    );
    // FUNGI-TYPE-030 must NOT fire (same element type)
    assert.ok(
      !codes.includes("FUNGI-TYPE-030"),
      `FUNGI-TYPE-030 must not fire when element types match. Got: [${codes.join(", ")}]`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3: Tensor<Float32,[768]> assigned from Tensor<Float32,[768]> → no error
// ---------------------------------------------------------------------------

describe("Tensor assignment: compatible types produce no error", () => {
  it("Tensor<Float32,[768]> assigned from Tensor<Float32,[768]> produces no tensor error", () => {
    const result = parseAndCheck(`
flow testTensorCompatible(input: Tensor<Float32, [768]>) -> String {
  let embedding: Tensor<Float32, [768]> = input
  return "done"
}
`);
    const codes = diagCodes(result);
    assert.ok(
      !codes.includes("FUNGI-TYPE-016"),
      `FUNGI-TYPE-016 must not fire for compatible tensor shapes. Got: [${codes.join(", ")}]`,
    );
    assert.ok(
      !codes.includes("FUNGI-TYPE-030"),
      `FUNGI-TYPE-030 must not fire for compatible tensor element types. Got: [${codes.join(", ")}]`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test 4: PatientId (from KNOWN_DOMAIN_TYPES) does not emit FUNGI-TYPE-001
// ---------------------------------------------------------------------------

describe("KNOWN_DOMAIN_TYPES: known domain types suppress FUNGI-TYPE-001", () => {
  it("PatientId used as a type annotation does not emit FUNGI-TYPE-001", () => {
    const result = parseAndCheck(`
flow lookupPatient(id: PatientId) -> String {
  return "patient"
}
`);
    const type001Diags = result.diagnostics.filter((d) => d.code === "FUNGI-TYPE-001");
    assert.equal(
      type001Diags.length,
      0,
      `PatientId is a KNOWN_DOMAIN_TYPE and must not emit FUNGI-TYPE-001. Got: ${type001Diags.map((d) => d.message).join("; ")}`,
    );
  });
});
