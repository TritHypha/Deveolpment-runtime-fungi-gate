import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkTypes, parseProgram } from "../dist/index.js";

const requirementSource = (constraints) =>
  `@version 1\npure flow decide(age: Int, admitted: Verdict) -> Verdict\n` +
  `contract { effects {} }\n{\n  let result: Verdict = requirement {\n${constraints}\n  }\n` +
  `  return result\n}`;

const requireSource = (subject) =>
  `@version 1\npure flow decide(age: Int, admitted: Verdict) -> Verdict\n` +
  `contract { effects {} }\n{\n` +
  `  require ${subject} {\n    deny: fault Denied\n    ambig: fault Unknown\n  }\n` +
  `  return admitted\n}`;

function check(source, file = "requirement-type.fungi") {
  const parsed = parseProgram(source, file);
  const parserErrors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(parserErrors, [], `unexpected parser errors: ${JSON.stringify(parserErrors)}`);
  return checkTypes(parsed.ast).diagnostics;
}

const requirementCodes = (diagnostics) =>
  diagnostics
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.code)
    .filter((code) => code.startsWith("FUNGI-REQUIREMENT-"));

describe("RD-0858 requirement typing", () => {
  it("accepts Bool, Verdict, and mixed constraints as a Verdict expression", () => {
    const diagnostics = check(requirementSource(
      "    age >= 18\n    admitted\n    true",
    ));
    assert.deepEqual(requirementCodes(diagnostics), []);
  });

  for (const [label, expression] of [
    ["Int", "42"],
    ["Decimal", "1.5"],
    ["String", "\"not-a-policy\""],
    ["List", "[true]"],
    ["Record", "{ ok: true }"],
  ]) {
    it(`emits 002 for a ${label} constraint`, () => {
      const diagnostics = check(requirementSource(`    ${expression}`));
      assert.deepEqual(requirementCodes(diagnostics), ["FUNGI-REQUIREMENT-002"]);
    });
  }

  it("emits 002 when a constraint type cannot be resolved", () => {
    const diagnostics = check(requirementSource("    missingValidator(age)"));
    assert.deepEqual(requirementCodes(diagnostics), ["FUNGI-REQUIREMENT-002"]);
  });
});

describe("RD-0858 require subject typing", () => {
  for (const [label, subject] of [
    ["Bool", "age >= 18"],
    ["Verdict", "admitted"],
    ["inline requirement", "requirement { age >= 18; admitted }"],
  ]) {
    it(`accepts a ${label} subject`, () => {
      const diagnostics = check(requireSource(subject));
      assert.deepEqual(requirementCodes(diagnostics), []);
    });
  }

  for (const [label, subject] of [
    ["Int", "42"],
    ["String", "\"not-a-policy\""],
    ["unresolved call", "missingPolicy(age)"],
  ]) {
    it(`emits 009 for a ${label} subject`, () => {
      const diagnostics = check(requireSource(subject));
      assert.deepEqual(requirementCodes(diagnostics), ["FUNGI-REQUIREMENT-009"]);
    });
  }
});
