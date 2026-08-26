import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

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
  const parsed = L.parseProgram(source, file);
  const parserErrors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(parserErrors, [], `unexpected parser errors: ${JSON.stringify(parserErrors)}`);
  return L.checkTypes(parsed.ast).diagnostics;
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

const terminalState = (node, options) =>
  L.proveRequirementHandlerTerminality(node, options);

describe("RD-0858 structural handler terminality", () => {
  it("exports the bounded terminality proof", () => {
    assert.equal(typeof L.proveRequirementHandlerTerminality, "function");
  });

  it("proves direct return and fault statements terminal", () => {
    assert.equal(terminalState({ kind: "returnStmt" }).state, "TERMINAL");
    assert.equal(terminalState({ kind: "faultStmt" }).state, "TERMINAL");
  });

  it("proves a sequential block when a reachable later statement terminates", () => {
    const result = terminalState({
      kind: "block",
      children: [
        { kind: "letDecl", value: "x" },
        { kind: "faultStmt" },
        { kind: "assignStmt", value: "unreachable" },
      ],
    });
    assert.equal(result.state, "TERMINAL");
  });

  it("refuses empty and normally returning blocks", () => {
    assert.equal(terminalState({ kind: "block", children: [] }).state, "NON_TERMINAL");
    assert.equal(
      terminalState({ kind: "block", children: [{ kind: "letDecl", value: "x" }] }).state,
      "NON_TERMINAL",
    );
  });

  it("proves if only when both explicit arms terminate", () => {
    const condition = { kind: "boolLiteral", value: "true" };
    assert.equal(terminalState({
      kind: "ifStmt",
      children: [condition, { kind: "returnStmt" }, { kind: "faultStmt" }],
    }).state, "TERMINAL");
    assert.notEqual(terminalState({
      kind: "ifStmt",
      children: [condition, { kind: "returnStmt" }],
    }).state, "TERMINAL");
    assert.notEqual(terminalState({
      kind: "ifStmt",
      children: [condition, { kind: "returnStmt" }, { kind: "letDecl" }],
    }).state, "TERMINAL");
  });

  it("proves only wildcard-exhaustive matches whose every arm terminates", () => {
    const subject = { kind: "identifier", value: "value" };
    const terminalMatch = {
      kind: "matchExpr",
      children: [
        subject,
        { kind: "matchArm", value: "Some", children: [{ kind: "returnStmt" }] },
        { kind: "matchArm", value: "_", children: [{ kind: "faultStmt" }] },
      ],
    };
    assert.equal(terminalState(terminalMatch).state, "TERMINAL");
    assert.notEqual(terminalState({
      ...terminalMatch,
      children: terminalMatch.children.slice(0, 2),
    }).state, "TERMINAL");
    assert.notEqual(terminalState({
      ...terminalMatch,
      children: [subject, terminalMatch.children[1], {
        kind: "matchArm",
        value: "_",
        children: [{ kind: "letDecl" }],
      }],
    }).state, "TERMINAL");
  });

  it("does not mint terminality for loops or unknown AST kinds", () => {
    assert.notEqual(terminalState({ kind: "whileStmt", children: [] }).state, "TERMINAL");
    assert.notEqual(terminalState({ kind: "forEachStmt", children: [] }).state, "TERMINAL");
    assert.notEqual(terminalState({ kind: "futureAuthorityNode", children: [] }).state, "TERMINAL");
  });

  it("refuses over-depth input without stack exhaustion", () => {
    let node = { kind: "returnStmt" };
    for (let depth = 0; depth < 257; depth += 1) {
      node = { kind: "block", children: [node] };
    }
    assert.equal(terminalState(node).state, "UNRESOLVED");
  });

  it("freezes the result and its first-failing path", () => {
    const result = terminalState({ kind: "block", children: [] });
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.path));
  });
});

describe("RD-0858 require handler checking", () => {
  it("accepts direct return and fault handlers", () => {
    const source =
      `@version 1\npure flow decide(admitted: Verdict) -> Verdict\ncontract { effects {} }\n{\n` +
      `  require admitted { deny: return admitted ambig: fault Unknown }\n` +
      `  return admitted\n}`;
    assert.deepEqual(requirementCodes(check(source)), []);
  });

  for (const failingArm of ["deny", "ambig"]) {
    it(`emits 007 for a non-terminal ${failingArm} handler only`, () => {
      const deny = failingArm === "deny" ? "{ let x = 1 }" : "fault Denied";
      const ambig = failingArm === "ambig" ? "{ let x = 1 }" : "fault Unknown";
      const source =
        `@version 1\npure flow decide(admitted: Verdict) -> Verdict\ncontract { effects {} }\n{\n` +
        `  require admitted { deny: ${deny} ambig: ${ambig} }\n` +
        `  return admitted\n}`;
      const diagnostics = check(source);
      assert.deepEqual(requirementCodes(diagnostics), ["FUNGI-REQUIREMENT-007"]);
      const finding = diagnostics.find((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-007");
      assert.match(finding.message, new RegExp(failingArm));
    });
  }

  it("accepts an if/else handler only when both paths terminate", () => {
    const source =
      `@version 1\npure flow decide(flag: Bool, admitted: Verdict) -> Verdict\ncontract { effects {} }\n{\n` +
      `  require admitted {\n` +
      `    deny: { if flag { return admitted } else { fault Denied } }\n` +
      `    ambig: fault Unknown\n` +
      `  }\n  return admitted\n}`;
    assert.deepEqual(requirementCodes(check(source)), []);
  });

  it("rejects an if handler with no terminal else path", () => {
    const source =
      `@version 1\npure flow decide(flag: Bool, admitted: Verdict) -> Verdict\ncontract { effects {} }\n{\n` +
      `  require admitted {\n` +
      `    deny: { if flag { return admitted } }\n` +
      `    ambig: fault Unknown\n` +
      `  }\n  return admitted\n}`;
    assert.deepEqual(requirementCodes(check(source)), ["FUNGI-REQUIREMENT-007"]);
  });

  it("preserves the enclosing-flow return-type check inside a terminal handler", () => {
    const source =
      `@version 1\npure flow decide(admitted: Verdict) -> Int\ncontract { effects {} }\n{\n` +
      `  require admitted { deny: return \"wrong\" ambig: fault Unknown }\n` +
      `  return 1\n}`;
    const diagnostics = check(source);
    assert.ok(diagnostics.some((diagnostic) => diagnostic.code === "FUNGI-TYPE-008"));
  });
});
