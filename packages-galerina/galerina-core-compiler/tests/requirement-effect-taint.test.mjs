import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkEffects,
  checkFlowEffects,
  effectResultsToDiagnostics,
  parseProgram,
} from "../dist/index.js";

function checkRequirementEffects(source, file = "requirement-effects.fungi") {
  const parsed = parseProgram(source, file);
  const parserErrors = parsed.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  assert.deepEqual(
    parserErrors,
    [],
    `unexpected parser errors: ${JSON.stringify(parserErrors)}`,
  );
  const results = checkEffects(parsed.flows, parsed.ast ?? { kind: "program" });
  const diagnostics = effectResultsToDiagnostics(results);
  return {
    results,
    diagnostics,
    requirement003: diagnostics.filter(
      (diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-003",
    ),
  };
}

const requirementFlow = (constraints) =>
  `@version 1
pure flow decide(age: Int, eligible: Bool, admitted: Verdict) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
${constraints}
  }
  return result
}`;

const syntheticLocation = (line = 1) => ({
  file: "requirement-effects-boundary.fungi",
  line,
  column: 1,
  offset: line - 1,
  endLine: line,
  endColumn: 2,
  endOffset: line,
  length: 1,
});

function syntheticFlow(name, line) {
  return {
    name,
    qualifier: "pure",
    params: [],
    returnType: "Bool",
    declaredEffects: [],
    location: syntheticLocation(line),
  };
}

function syntheticFlowNode(name, line, constraintExpression) {
  const bodyChildren = constraintExpression === undefined
    ? []
    : [{
        kind: "requirementConstraint",
        location: syntheticLocation(line),
        children: [constraintExpression],
      }];
  return {
    kind: "pureFlowDecl",
    value: name,
    location: syntheticLocation(line),
    children: [{ kind: "block", children: bodyChildren }],
  };
}

function syntheticRequirementDiagnostics(flows, ast, focus = flows[0]) {
  const result = checkFlowEffects(
    focus,
    ast,
    flows,
    new Map(),
    new Set(),
  );
  return effectResultsToDiagnostics([result]).filter(
    (diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-003",
  );
}

describe("RD-0858 requirement constraint effect closure", () => {
  it("keeps literals, comparisons, Boolean expressions, and Verdict values effect-free", () => {
    const checked = checkRequirementEffects(requirementFlow(
      "    true\n    age >= 18\n    eligible == true\n    admitted",
    ));
    assert.deepEqual(checked.requirement003, []);
  });

  it("admits a unique local pure flow only when its observed closure is empty", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    isAdult(age)
  }
  return result
}

pure flow isAdult(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}`,
    );
    assert.deepEqual(checked.requirement003, []);
  });

  it("rejects direct database, mutation, network, audit, and ambient-state effects in source order", () => {
    const checked = checkRequirementEffects(
      `@version 1
secure flow decide(age: Int, endpoint: String) -> Verdict
contract {
  effects {
    database.read
    database.write
    network.outbound
    audit.write
    secret.read
  }
}
{
  let result: Verdict = requirement {
    AgesDB.get(age)
    AgesDB.update(age)
    http.get(endpoint)
    AuditLog.write("requirement")
    Env.get("MODE")
  }
  return result
}`,
    );
    assert.equal(checked.requirement003.length, 5);
    assert.deepEqual(
      checked.requirement003.map((diagnostic) => diagnostic.location?.line),
      [14, 15, 16, 17, 18],
    );
  });

  it("rejects transitively observed effects even when every flow is named and declared pure", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    validateAge(age)
  }
  return result
}

pure flow validateAge(age: Int) -> Bool
contract { effects {} }
{
  return readAge(age)
}

pure flow readAge(age: Int) -> Bool
contract { effects {} }
{
  let stored = AgesDB.get(age)
  return stored >= 18
}`,
    );
    assert.equal(checked.requirement003.length, 1);
    assert.equal(checked.requirement003[0]?.location?.line, 6);
  });

  it("rejects unknown, receiver, imported, aliased, shadowed, and dynamic calls", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int, admittedPolicy: Bool, policyValue: Policy) -> Verdict
contract { effects {} }
{
  let alias = localPolicy
  let result: Verdict = requirement {
    missingPolicy(age)
    policyValue.check(age)
    Policies.localPolicy(age)
    alias(age)
    admittedPolicy(age)
  }
  return result
}

pure flow localPolicy(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}`,
    );
    assert.equal(checked.requirement003.length, 5);
    assert.deepEqual(
      checked.requirement003.map((diagnostic) => diagnostic.location?.line),
      [7, 8, 9, 10, 11],
    );
  });

  it("rejects a typed local binding that shadows an otherwise unique local flow", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int, seed: Bool) -> Verdict
contract { effects {} }
{
  let localPolicy: Bool = seed
  let result: Verdict = requirement {
    localPolicy(age)
  }
  return result
}

pure flow localPolicy(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}`,
    );
    assert.equal(checked.requirement003.length, 1);
  });

  it("checks an effectful requirement inside a flow-local fn declaration", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Bool
contract { effects {} }
{
  fn inspect(value: Int) -> Verdict {
    let result: Verdict = requirement {
      AgesDB.get(value)
    }
    return result
  }
  return true
}`,
    );
    assert.equal(checked.requirement003.length, 1);
    assert.equal(checked.requirement003[0]?.location?.line, 7);
  });

  it("does not add an uncalled helper body's effects to the containing flow closure", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    outerPolicy(age)
  }
  return result
}

pure flow outerPolicy(age: Int) -> Bool
contract { effects {} }
{
  fn unused(value: Int) -> Bool {
    let stored = AgesDB.get(value)
    return stored >= 18
  }
  return age >= 18
}`,
    );
    assert.deepEqual(checked.requirement003, []);
  });

  it("refuses a same-named local fn helper instead of resolving the top-level flow", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  fn localPolicy(value: Int) -> Bool {
    let stored = AgesDB.get(value)
    return stored >= 18
  }
  let result: Verdict = requirement {
    localPolicy(age)
  }
  return result
}

pure flow localPolicy(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}`,
    );
    assert.equal(checked.requirement003.length, 1);
    assert.equal(checked.requirement003[0]?.location?.line, 10);
  });

  it("checks the later AST body when duplicate FlowMeta and flow nodes share a name", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow duplicate(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}

pure flow duplicate(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    AgesDB.get(age)
  }
  return result
}`,
    );
    assert.equal(checked.requirement003.length, 1);
    assert.equal(checked.requirement003[0]?.location?.line, 12);
  });

  it("refuses a bare local-flow call when an actual importDecl makes resolution ambiguous", () => {
    const checked = checkRequirementEffects(
      `@version 1
import "./policies.fungi"

pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    localPolicy(age)
  }
  return result
}

pure flow localPolicy(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}`,
    );
    assert.equal(checked.requirement003.length, 1);
    assert.equal(checked.requirement003[0]?.location?.line, 8);
  });

  it("admits exactly 4,096 flows and refuses 4,097 flows", () => {
    const makeFixture = (flowCount) => {
      const flows = Array.from(
        { length: flowCount },
        (_, index) => syntheticFlow(`flow${index}`, index + 1),
      );
      const ast = {
        kind: "program",
        children: flows.map((flow, index) => syntheticFlowNode(
          flow.name,
          index + 1,
          index === 0 ? { kind: "boolLiteral", value: "true" } : undefined,
        )),
      };
      return syntheticRequirementDiagnostics(flows, ast);
    };

    assert.equal(makeFixture(4_096).length, 0);
    assert.equal(makeFixture(4_097).length, 1);
  });

  it("admits exactly 16,384 classified calls and refuses 16,385 calls", () => {
    const makeFixture = (callCount) => {
      const flows = [syntheticFlow("focus", 1), syntheticFlow("callee", 2)];
      const expression = {
        kind: "arrayLiteral",
        children: Array.from(
          { length: callCount },
          () => ({ kind: "callExpr", value: "callee", children: [] }),
        ),
      };
      const ast = {
        kind: "program",
        children: [
          syntheticFlowNode("focus", 1, expression),
          syntheticFlowNode("callee", 2),
        ],
      };
      return syntheticRequirementDiagnostics(flows, ast);
    };

    assert.equal(makeFixture(16_384).length, 0);
    assert.equal(makeFixture(16_385).length, 1);
  });

  it("does not let a validator-like name or pure declaration bypass observed effects", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    validateAge(age)
  }
  return result
}

pure flow validateAge(age: Int) -> Bool
contract { effects {} }
{
  let stored = AgesDB.get(age)
  return stored >= 18
}`,
    );
    assert.equal(checked.requirement003.length, 1);
  });

  it("terminates on local recursive cycles and refuses only cycles with an observed effect", () => {
    const effectFree = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    left(age)
  }
  return result
}

pure flow left(age: Int) -> Bool
contract { effects {} }
{
  return right(age)
}

pure flow right(age: Int) -> Bool
contract { effects {} }
{
  return left(age)
}`,
    );
    assert.deepEqual(effectFree.requirement003, []);

    const effectful = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    left(age)
  }
  return result
}

pure flow left(age: Int) -> Bool
contract { effects {} }
{
  return right(age)
}

pure flow right(age: Int) -> Bool
contract { effects {} }
{
  let stored = AgesDB.get(age)
  return left(stored)
}`,
    );
    assert.equal(effectful.requirement003.length, 1);
  });

  it("checks every later constraint after an earlier effect fault", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int, policyValue: Policy) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    policyValue.check(age)
    AgesDB.get(age)
    missingPolicy(age)
  }
  return result
}`,
    );
    assert.equal(checked.requirement003.length, 3);
    assert.deepEqual(
      checked.requirement003.map((diagnostic) => diagnostic.location?.line),
      [6, 7, 8],
    );
  });

  it("leaves non-requirement effect diagnostics unchanged", () => {
    const checked = checkRequirementEffects(
      `@version 1
secure flow loadAge(age: Int) -> Int
contract { effects {} }
{
  let stored = AgesDB.get(age)
  return stored
}`,
    );
    assert.deepEqual(
      checked.diagnostics.map((diagnostic) => diagnostic.code),
      ["FUNGI-EFFECT-001"],
    );
  });
});
