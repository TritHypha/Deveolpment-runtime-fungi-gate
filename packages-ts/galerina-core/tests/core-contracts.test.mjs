import assert from "node:assert/strict";
import { describe, it } from "node:test";

// @galerina/core is CommonJS — use default import then destructure for safety.
import pkg from "../dist/index.js";

const {
  createCompilerDiagnostic,
  hasErrors,
  filterBySeverity,
  CONTENT_BLOCK_TYPES,
} = pkg;

describe("@galerina/core utility contracts", () => {
  it("createCompilerDiagnostic builds the canonical diagnostic shape", () => {
    const loc = { file: "auth.fungi", line: 12, column: 5 };

    const d = createCompilerDiagnostic(
      "FUNGI-TEST-001",
      "TEST_DIAGNOSTIC",
      "error",
      "Something went wrong.",
      loc,
    );

    assert.equal(d.code, "FUNGI-TEST-001");
    assert.equal(d.name, "TEST_DIAGNOSTIC");
    assert.equal(d.severity, "error");
    assert.equal(d.message, "Something went wrong.");
    assert.deepEqual(d.location, loc);
    assert.equal(Object.hasOwn(d, "suggestedFix"), false);
  });

  it("createCompilerDiagnostic includes suggestedFix only when provided", () => {
    const withFix = createCompilerDiagnostic(
      "FUNGI-TEST-002",
      "FIX_ME",
      "warning",
      "Use let instead.",
      { file: "x.fungi", line: 1, column: 1 },
      "Replace var with let.",
    );

    const noFix = createCompilerDiagnostic(
      "FUNGI-TEST-002",
      "FIX_ME",
      "warning",
      "Use let instead.",
    );

    assert.equal(withFix.suggestedFix, "Replace var with let.");
    assert.equal(Object.hasOwn(noFix, "suggestedFix"), false);
  });

  it("createCompilerDiagnostic omits location when not provided", () => {
    const d = createCompilerDiagnostic(
      "FUNGI-TEST-003",
      "NO_LOCATION",
      "info",
      "Informational note.",
    );

    assert.equal(Object.hasOwn(d, "location"), false);
  });

  it("hasErrors returns true when at least one diagnostic has severity error", () => {
    const diags = [
      createCompilerDiagnostic("FUNGI-A", "A", "info", "info msg"),
      createCompilerDiagnostic("FUNGI-B", "B", "warning", "warn msg"),
      createCompilerDiagnostic("FUNGI-C", "C", "error", "error msg"),
    ];

    assert.equal(hasErrors(diags), true);
  });

  it("hasErrors returns false when no diagnostics have severity error", () => {
    const diags = [
      createCompilerDiagnostic("FUNGI-A", "A", "info", "info msg"),
      createCompilerDiagnostic("FUNGI-B", "B", "warning", "warn msg"),
    ];

    assert.equal(hasErrors(diags), false);
  });

  it("hasErrors returns false for an empty array", () => {
    assert.equal(hasErrors([]), false);
  });

  it("filterBySeverity returns only diagnostics matching the given severity", () => {
    const diags = [
      createCompilerDiagnostic("FUNGI-1", "ONE", "info", "i"),
      createCompilerDiagnostic("FUNGI-2", "TWO", "warning", "w"),
      createCompilerDiagnostic("FUNGI-3", "THREE", "error", "e"),
      createCompilerDiagnostic("FUNGI-4", "FOUR", "error", "e2"),
    ];

    const errors = filterBySeverity(diags, "error");
    assert.equal(errors.length, 2);
    assert.ok(errors.every((d) => d.severity === "error"));

    const warnings = filterBySeverity(diags, "warning");
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0]?.code, "FUNGI-2");

    const infos = filterBySeverity(diags, "info");
    assert.equal(infos.length, 1);
    assert.equal(infos[0]?.code, "FUNGI-1");
  });

  it("filterBySeverity returns empty array when no diagnostics match", () => {
    const diags = [
      createCompilerDiagnostic("FUNGI-1", "ONE", "info", "i"),
    ];

    assert.deepEqual(filterBySeverity(diags, "error"), []);
  });

  it("CONTENT_BLOCK_TYPES exports the four canonical content block types", () => {
    assert.deepEqual([...CONTENT_BLOCK_TYPES], ["html", "dom", "script", "css"]);
  });
});
