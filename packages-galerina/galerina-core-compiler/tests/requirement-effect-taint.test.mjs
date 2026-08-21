import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  canonicalRequirementTaintTuple,
  checkTaint,
  checkValueStates,
  checkEffects,
  checkFlowEffects,
  createRequirementValidatorAuthorityRegistry,
  effectResultsToDiagnostics,
  parseProgram,
  runProductionSecurityGate,
} from "../dist/index.js";
import { compileFile } from "../dist/cli.js";

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

const TAINT_SOURCE_BUILD = "git:0123456789abcdef0123456789abcdef01234567";
const TAINT_PROFILE = "slide.scalar-1";
const TAINT_VERSION = "1.0.0";
const TAINT_DIGEST = `sha256:${"a".repeat(64)}`;

const taintProgram = (constraint, validatorBody = "return true") =>
  `@version 1
pure flow decide(tainted input: String) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    ${constraint}
  }
  return result
}

pure flow validateInput(value: String) -> Verdict
contract { effects {} }
{
  ${validatorBody}
}`;

function requirementTaintDiagnostics(source, authorityOverrides = {}) {
  const parsed = parseProgram(source, "requirement-taint.fungi");
  assert.deepEqual(
    parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
    `unexpected parser errors: ${JSON.stringify(parsed.diagnostics)}`,
  );
  const effectResults = checkEffects(parsed.flows, parsed.ast ?? { kind: "program" });
  const row = {
    authorityVersion: TAINT_VERSION,
    qualifiedFlowIdentity: "package.example.policy::validateInput",
    sourceBuild: TAINT_SOURCE_BUILD,
    inputType: "String",
    taintClasses: ["declared.untrusted"],
    outputType: "Verdict",
    observedEffect: "EffectFree",
    checkedProfile: TAINT_PROFILE,
    checkedDigest: TAINT_DIGEST,
    validFrom: "2026-08-20T00:00:00.000Z",
    expiresAt: "2026-08-22T00:00:00.000Z",
    ...(authorityOverrides.row ?? {}),
  };
  const registry = authorityOverrides.registry
    ?? createRequirementValidatorAuthorityRegistry([row]);
  const input = {
    registry,
    context: {
      expectedRegistryDigest: registry.digest,
      canonicalSourceUnitId: "package.example.policy",
      sourceBuild: TAINT_SOURCE_BUILD,
      checkedProfile: TAINT_PROFILE,
      acceptedAuthorityVersion: TAINT_VERSION,
      comparisonTime: "2026-08-21T00:00:00.000Z",
      ...(authorityOverrides.context ?? {}),
    },
    checkedFlows: [{
      localFlowName: "validateInput",
      checkedDigest: TAINT_DIGEST,
      ...(authorityOverrides.checkedFlow ?? {}),
    }],
    effectResults,
    flows: parsed.flows,
    ...(authorityOverrides.input ?? {}),
  };
  const ast = parsed.ast ?? { kind: "program" };
  return {
    taint: checkTaint(ast, parsed.flows, input).filter((diagnostic) =>
      diagnostic.code === "FUNGI-REQUIREMENT-004"
        || diagnostic.code === "FUNGI-REQUIREMENT-010"),
    valueState: checkValueStates(ast, "development", input).diagnostics.filter((diagnostic) =>
      diagnostic.code === "FUNGI-REQUIREMENT-004"
        || diagnostic.code === "FUNGI-REQUIREMENT-010"),
    parsed,
  };
}

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

  it("does not let a helper nested in an uncalled sibling scope shadow an outer requirement", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  fn container(value: Int) -> Bool {
    fn localPolicy(inner: Int) -> Bool {
      let stored = AgesDB.get(inner)
      return stored >= 18
    }
    return value >= 18
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
    assert.deepEqual(checked.requirement003, []);
  });

  it("does not let a later helper declaration shadow an earlier requirement call", () => {
    const checked = checkRequirementEffects(
      `@version 1
pure flow decide(age: Int) -> Verdict
contract { effects {} }
{
  let result: Verdict = requirement {
    localPolicy(age)
  }
  fn localPolicy(value: Int) -> Bool {
    let stored = AgesDB.get(value)
    return stored >= 18
  }
  return result
}

pure flow localPolicy(age: Int) -> Bool
contract { effects {} }
{
  return age >= 18
}`,
    );
    assert.deepEqual(checked.requirement003, []);
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

  it("matches a cloned later duplicate FlowMeta by stable occurrence evidence", () => {
    const parsed = parseProgram(
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
      "requirement-effects-cloned-meta.fungi",
    );
    assert.deepEqual(
      parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    const later = parsed.flows[1];
    assert.notEqual(later, undefined);
    const clonedLater = {
      ...later,
      location: later.location === undefined ? undefined : { ...later.location },
    };
    const result = checkFlowEffects(
      clonedLater,
      parsed.ast ?? { kind: "program" },
      parsed.flows,
      new Map(),
      new Set(),
    );
    const requirement003 = effectResultsToDiagnostics([result]).filter(
      (diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-003",
    );
    assert.equal(requirement003.length, 1);
    assert.equal(requirement003[0]?.location?.line, 12);
  });

  it("allows a unique effect-free local flow call beside an unrelated side-effect import", () => {
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
    assert.deepEqual(checked.requirement003, []);
  });

  it("refuses a local-flow call colliding with an actual named import alias", () => {
    const checked = checkRequirementEffects(
      `@version 1
import { remotePolicy as localPolicy } from "./policies.fungi"

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

  for (const [label, importLine] of [
    ["a safe plugin alias", 'import plugin safe "./policies.fungi" as localPolicy'],
    ["an assimilated plugin alias", 'import plugin assimilate "./policies.fungi" as localPolicy'],
    ["a default import binding", 'import localPolicy from "./policies.fungi"'],
    ["a namespace import alias", 'import * as localPolicy from "./policies.fungi"'],
  ]) {
    it(`refuses a local-flow call colliding with ${label}`, () => {
      const checked = checkRequirementEffects(
        `@version 1
${importLine}

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
  }

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

describe("RD-0858 requirement constraint taint authority", () => {
  it("canonicalizes the closed provenance domain as sorted unique bounded tuples", () => {
    assert.deepEqual(
      canonicalRequirementTaintTuple([
        "web.storage",
        "declared.untrusted",
        "web.storage",
        "environment.input",
      ]),
      ["declared.untrusted", "environment.input", "web.storage"],
    );
    assert.equal(canonicalRequirementTaintTuple(["attacker.named"]), undefined);
    assert.deepEqual(canonicalRequirementTaintTuple([
      "declared.untrusted",
      "environment.input",
      "process.input",
      "web.request",
      "web.storage",
      "web.storage",
    ]), [
      "declared.untrusted",
      "environment.input",
      "process.input",
      "web.request",
      "web.storage",
    ]);
  });

  for (const [label, expression] of [
    ["direct identifier", "input"],
    ["member access", "input.length"],
    ["comparison", "input == \"allow\""],
    ["Boolean expression", "input == \"allow\" && true"],
  ]) {
    it(`rejects ${label} taint without a validator-authority route`, () => {
      const checked = requirementTaintDiagnostics(taintProgram(expression), {
        registry: createRequirementValidatorAuthorityRegistry([]),
      });
      assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
        "FUNGI-REQUIREMENT-004",
      ]);
      assert.deepEqual(checked.valueState.map((diagnostic) => diagnostic.code), [
        "FUNGI-REQUIREMENT-004",
      ]);
    });
  }

  for (const [label, name] of [
    ["validate", "validate"],
    ["sanitize", "sanitize"],
    ["check", "checkInput"],
    ["verify", "verify"],
    ["parse", "parse"],
    ["decode", "decode"],
    ["helper", "helper"],
  ]) {
    it(`does not let an ordinary ${label} name mint validator authority`, () => {
      const source = taintProgram(`${name}(input)`).replace(
        "pure flow validateInput(value: String)",
        `pure flow ${name}(value: String)`,
      );
      const checked = requirementTaintDiagnostics(source, {
        registry: createRequirementValidatorAuthorityRegistry([]),
      });
      assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
        "FUNGI-REQUIREMENT-004",
      ]);
    });
  }

  it("accepts only the exact local Verdict validator with matched fresh authority", () => {
    const checked = requirementTaintDiagnostics(taintProgram("validateInput(input)"));
    assert.deepEqual(checked.taint, []);
    assert.deepEqual(checked.valueState, []);
  });

  it("retains taint through aliases and refuses nested validator-shaped expressions", () => {
    const alias = requirementTaintDiagnostics(taintProgram("alias == \"allow\"").replace(
      "let result: Verdict = requirement",
      "let alias: String = input\n  let result: Verdict = requirement",
    ), { registry: createRequirementValidatorAuthorityRegistry([]) });
    const nested = requirementTaintDiagnostics(
      taintProgram("validateInput(input) == Verdict.Allow"),
    );
    assert.deepEqual(alias.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-004"]);
    assert.deepEqual(nested.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-004"]);
  });

  it("admits a pre-checked boundary before requirement but not the same boundary inside it", () => {
    const before = requirementTaintDiagnostics(taintProgram("checked == \"allow\"").replace(
      "let result: Verdict = requirement",
      "let checked: String = Sql.parameterize(input)\n  let result: Verdict = requirement",
    ), { registry: createRequirementValidatorAuthorityRegistry([]) });
    const inside = requirementTaintDiagnostics(
      taintProgram("Sql.parameterize(input)"),
      { registry: createRequirementValidatorAuthorityRegistry([]) },
    );
    assert.deepEqual(before.taint, []);
    assert.deepEqual(before.valueState, []);
    assert.deepEqual(inside.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-004"]);
  });

  it("requires the exact mixed provenance tuple and refuses a subset", () => {
    const source = taintProgram("validateInput(input, env, request)")
      .replace("tainted input: String", "tainted input: String, env: String, request: String")
      .replace("value: String", "value: String, envValue: String, requestValue: String");
    const exact = requirementTaintDiagnostics(source, {
      row: { taintClasses: ["web.request", "declared.untrusted", "environment.input"] },
    });
    const subset = requirementTaintDiagnostics(source, {
      row: { taintClasses: ["declared.untrusted", "environment.input"] },
    });
    assert.deepEqual(exact.taint, []);
    assert.deepEqual(subset.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-010"]);
  });

  it("maps an unregistered exact local validator to 004", () => {
    const checked = requirementTaintDiagnostics(taintProgram("validateInput(input)"), {
      row: { qualifiedFlowIdentity: "package.example.policy::otherValidator" },
    });
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-004"]);
  });

  it("refuses malformed and duplicate present registries with 010", () => {
    const malformed = createRequirementValidatorAuthorityRegistry([{
      authorityVersion: "bad",
    }]);
    const base = {
      authorityVersion: TAINT_VERSION,
      qualifiedFlowIdentity: "package.example.policy::validateInput",
      sourceBuild: TAINT_SOURCE_BUILD,
      inputType: "String",
      taintClasses: ["declared.untrusted"],
      outputType: "Verdict",
      observedEffect: "EffectFree",
      checkedProfile: TAINT_PROFILE,
      checkedDigest: TAINT_DIGEST,
      validFrom: "2026-08-20T00:00:00.000Z",
      expiresAt: "2026-08-22T00:00:00.000Z",
    };
    const duplicate = createRequirementValidatorAuthorityRegistry([base, base]);
    for (const registry of [malformed, duplicate]) {
      const checked = requirementTaintDiagnostics(taintProgram("validateInput(input)"), { registry });
      assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-010"]);
    }
  });

  it("admits the exact checked-flow evidence ceiling and refuses one above it", () => {
    const checkedFlows = [
      { localFlowName: "validateInput", checkedDigest: TAINT_DIGEST },
      ...Array.from({ length: 255 }, (_, index) => ({
        localFlowName: `other${index}`,
        checkedDigest: `sha256:${"b".repeat(64)}`,
      })),
    ];
    const exact = requirementTaintDiagnostics(taintProgram("validateInput(input)"), {
      input: { checkedFlows },
    });
    const exceeded = requirementTaintDiagnostics(taintProgram("validateInput(input)"), {
      input: {
        checkedFlows: [...checkedFlows, {
          localFlowName: "overflow",
          checkedDigest: `sha256:${"c".repeat(64)}`,
        }],
      },
    });
    assert.deepEqual(exact.taint, []);
    assert.deepEqual(exceeded.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-010"]);
  });

  it("refuses imported and dynamic validator collisions", () => {
    const imported = taintProgram("validateInput(input)").replace(
      "@version 1",
      '@version 1\nimport { remote as validateInput } from "./policy.fungi"',
    );
    const dynamic = taintProgram("validators.validateInput(input)");
    for (const source of [imported, dynamic]) {
      const checked = requirementTaintDiagnostics(source);
      assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), ["FUNGI-REQUIREMENT-004"]);
    }
  });

  it("refuses receiver, aliased and shadowed validator collisions", () => {
    const fixtures = [
      taintProgram("policy.validateInput(input)"),
      taintProgram("alias(input)").replace(
        "let result: Verdict = requirement",
        "let alias = validateInput\n  let result: Verdict = requirement",
      ),
      taintProgram("validateInput(input)").replace(
        "let result: Verdict = requirement",
        "let validateInput: Bool = true\n  let result: Verdict = requirement",
      ),
    ];
    for (const source of fixtures) {
      const checked = requirementTaintDiagnostics(source);
      assert.equal(checked.taint.length, 1);
      assert.ok(["FUNGI-REQUIREMENT-004", "FUNGI-REQUIREMENT-010"].includes(checked.taint[0].code));
    }
  });

  for (const [label, overrides] of [
    ["wrong source build", { context: { sourceBuild: `git:${"f".repeat(40)}` } }],
    ["wrong profile", { context: { checkedProfile: "slide.scalar-64" } }],
    ["wrong checked digest", { checkedFlow: { checkedDigest: `sha256:${"b".repeat(64)}` } }],
    ["wrong registry digest", { context: { expectedRegistryDigest: `sha256:${"b".repeat(64)}` } }],
    ["wrong accepted version", { context: { acceptedAuthorityVersion: "2.0.0" } }],
    ["expired authority", { context: { comparisonTime: "2026-08-22T00:00:00.000Z" } }],
    ["wrong taint tuple", { row: { taintClasses: ["web.request"] } }],
    ["wrong input type", { row: { inputType: "Bytes" } }],
    ["non-Verdict validator", { row: { outputType: "Bool" } }],
  ]) {
    it(`emits 010 for ${label} instead of silently accepting it`, () => {
      let source = taintProgram("validateInput(input)");
      if (label === "non-Verdict validator") {
        source = source
          .replace("pure flow validateInput(value: String) -> Verdict", "pure flow validateInput(value: String) -> Bool")
          .replace("let result: Verdict = requirement", "let result: Verdict = requirement");
      }
      const checked = requirementTaintDiagnostics(source, overrides);
      assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
        "FUNGI-REQUIREMENT-010",
      ]);
    });
  }

  it("emits 010 when the exact validator has a real observed effect", () => {
    const source = taintProgram(
      "validateInput(input)",
      "let stored = AgesDB.get(value)\n  return stored == value",
    ).replace(
      "pure flow validateInput(value: String) -> Verdict\ncontract { effects {} }",
      "secure flow validateInput(value: String) -> Verdict\ncontract { effects { database.read } }",
    );
    const checked = requirementTaintDiagnostics(source);
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("keeps a legacy sanitizer valid outside requirement but not as requirement authority", () => {
    const source = taintProgram("sanitize(input)").replace(
      "pure flow validateInput(value: String)",
      "pure flow sanitize(value: String)",
    );
    const parsed = parseProgram(source, "requirement-sanitizer.fungi");
    assert.deepEqual(
      parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    assert.equal(
      checkTaint(parsed.ast, parsed.flows).filter((diagnostic) =>
        diagnostic.code === "FUNGI-REQUIREMENT-004").length,
      1,
    );
  });

  it("checks every later tainted constraint after the first refusal", () => {
    const checked = requirementTaintDiagnostics(
      taintProgram("input\n    input.length\n    input == \"allow\""),
      { registry: createRequirementValidatorAuthorityRegistry([]) },
    );
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-004",
      "FUNGI-REQUIREMENT-004",
      "FUNGI-REQUIREMENT-004",
    ]);
  });

  it("keeps the production security gate fail-closed with empty validator authority", () => {
    const source = taintProgram("validateInput(input)");
    const parsed = parseProgram(source, "requirement-security-gate.fungi");
    const diagnostics = runProductionSecurityGate(
      parsed.ast,
      parsed.flows,
      source,
      "requirement-security-gate.fungi",
    );
    assert.equal(
      diagnostics.filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004").length,
      1,
    );
  });

  it("keeps the CLI fail-closed with explicit empty validator authority", () => {
    const directory = mkdtempSync(join(tmpdir(), "galerina-rd0858-"));
    try {
      const file = join(directory, "requirement-source.txt");
      writeFileSync(file, taintProgram("validateInput(input)"), "utf8");
      const result = compileFile(file, "check");
      assert.equal(
        result.diagnostics.filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004").length,
        1,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
