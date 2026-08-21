import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
import * as compiler from "../dist/index.js";

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

const CHECKED_FLOW_DIGEST_DOMAIN = "galerina.requirement-validator.checked-flow.v1";
const CHECKED_FLOW_MAX_NODES = 4_096;
const CHECKED_FLOW_MAX_DEPTH = 128;
const CHECKED_FLOW_MAX_BYTES = 262_144;

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

function referenceCheckedFlowDigest(flow, flowNode) {
  if (flow === undefined || flowNode === undefined) return undefined;
  const qualifier = flow.qualifier;
  if (typeof flow.name !== "string"
    || !["flow", "secure", "pure", "guarded"].includes(qualifier)
    || !Array.isArray(flow.params) || flow.params.some((param) => typeof param !== "string")
    || typeof flow.returnType !== "string"
    || !Array.isArray(flow.declaredEffects)
    || flow.declaredEffects.some((effect) => typeof effect !== "string")
    || (flow.decreasesMetric !== undefined && typeof flow.decreasesMetric !== "string")) {
    return undefined;
  }

  let nodeCount = 0;
  const normalizeNode = (node, depth) => {
    if (node === null || typeof node !== "object" || Array.isArray(node)
      || typeof node.kind !== "string" || depth > CHECKED_FLOW_MAX_DEPTH
      || ++nodeCount > CHECKED_FLOW_MAX_NODES) return undefined;
    const stringFields = [
      node.value,
      node.callStyle,
      node.typeName,
      node.conformsTo,
      node.flowRef,
      node.claim,
    ];
    if (stringFields.some((value) => value !== undefined && typeof value !== "string")
      || (node.flags !== undefined && (!Number.isSafeInteger(node.flags) || node.flags < 0))
      || (node.children !== undefined && !Array.isArray(node.children))) return undefined;
    const children = [];
    for (const child of node.children ?? []) {
      const normalized = normalizeNode(child, depth + 1);
      if (normalized === undefined) return undefined;
      children.push(normalized);
    }
    return [
      node.kind,
      node.value ?? null,
      node.callStyle ?? null,
      node.typeName ?? null,
      node.conformsTo ?? null,
      node.flowRef ?? null,
      node.claim ?? null,
      node.flags ?? null,
      children,
    ];
  };
  const ast = normalizeNode(flowNode, 1);
  if (ast === undefined) return undefined;
  const canonical = JSON.stringify({
    domain: CHECKED_FLOW_DIGEST_DOMAIN,
    flow: [
      flow.name,
      qualifier,
      [...flow.params],
      flow.returnType,
      [...flow.declaredEffects],
      flow.decreasesMetric ?? null,
    ],
    ast,
  });
  if (Buffer.byteLength(canonical, "utf8") > CHECKED_FLOW_MAX_BYTES) return undefined;
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function findFlowNode(parsed, name = "validateInput", ast = parsed.ast) {
  const flow = parsed.flows.find((candidate) => candidate.name === name);
  if (flow === undefined) return { flow: undefined, node: undefined };
  const candidates = (ast?.children ?? []).filter((candidate) =>
    candidate.location?.file === flow.location.file
      && candidate.location?.offset === flow.location.offset);
  return { flow, node: candidates.length === 1 ? candidates[0] : undefined };
}

function checkedFlowDigest(flow, node) {
  const publicHelper = compiler.computeRequirementValidatorCheckedFlowDigest;
  return typeof publicHelper === "function"
    ? publicHelper(flow, node)
    : referenceCheckedFlowDigest(flow, node);
}

function checkedFlowDigestForSource(source, file = "requirement-taint.fungi") {
  const parsed = parseProgram(source, file);
  const { flow, node } = findFlowNode(parsed);
  const digest = checkedFlowDigest(flow, node);
  assert.match(digest ?? "", /^sha256:[0-9a-f]{64}$/);
  return digest;
}

function requirementTaintDiagnostics(source, authorityOverrides = {}) {
  const parsed = parseProgram(source, authorityOverrides.file ?? "requirement-taint.fungi");
  assert.deepEqual(
    parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
    `unexpected parser errors: ${JSON.stringify(parsed.diagnostics)}`,
  );
  const ast = authorityOverrides.ast ?? parsed.ast ?? { kind: "program" };
  const { flow: validatorFlow, node: validatorNode } = findFlowNode(parsed, "validateInput", ast);
  const checkedDigest = authorityOverrides.digest
    ?? checkedFlowDigest(validatorFlow, validatorNode)
    ?? TAINT_DIGEST;
  assert.match(checkedDigest ?? "", /^sha256:[0-9a-f]{64}$/);
  const effectResults = checkEffects(parsed.flows, ast);
  const row = {
    authorityVersion: TAINT_VERSION,
    qualifiedFlowIdentity: "package.example.policy::validateInput",
    sourceBuild: TAINT_SOURCE_BUILD,
    inputType: "String",
    taintClasses: ["declared.untrusted"],
    outputType: "Verdict",
    observedEffect: "EffectFree",
    checkedProfile: TAINT_PROFILE,
    checkedDigest,
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
      checkedDigest,
      ...(authorityOverrides.checkedFlow ?? {}),
    }],
    effectResults,
    flows: parsed.flows,
    ...(authorityOverrides.input ?? {}),
  };
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
    const source = taintProgram("validateInput(input)");
    const exactDigest = checkedFlowDigestForSource(source);
    const checkedFlows = [
      { localFlowName: "validateInput", checkedDigest: exactDigest },
      ...Array.from({ length: 255 }, (_, index) => ({
        localFlowName: `other${index}`,
        checkedDigest: `sha256:${"b".repeat(64)}`,
      })),
    ];
    const exact = requirementTaintDiagnostics(source, {
      input: { checkedFlows },
    });
    const exceeded = requirementTaintDiagnostics(source, {
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

describe("RD-0858 Task 3 fix round 1", () => {
  const effectfulValidatorSource = () => taintProgram(
    "validateInput(input)",
    "let stored = AgesDB.get(value)\n  return stored == value",
  ).replace(
    "pure flow validateInput(value: String) -> Verdict\ncontract { effects {} }",
    "secure flow validateInput(value: String) -> Verdict\ncontract { effects { database.read } }",
  );

  it("binds EffectFree evidence to the actual validator AST instead of a same-name clean source", () => {
    const evidenceSource = `@version 1
pure flow unrelated() -> Bool
contract { effects {} }
{
  return true
}

${taintProgram("validateInput(input)").replace("@version 1\n", "")}`;
    const evidence = parseProgram(evidenceSource, "different-evidence-source.fungi");
    assert.deepEqual(
      evidence.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    const forgedCleanResults = checkEffects(
      evidence.flows,
      evidence.ast ?? { kind: "program" },
    );
    const checked = requirementTaintDiagnostics(effectfulValidatorSource(), {
      input: { effectResults: forgedCleanResults },
    });
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
    assert.deepEqual(checked.valueState.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("keeps same-AST clean evidence valid and same-AST effectful evidence invalid", () => {
    const clean = requirementTaintDiagnostics(taintProgram("validateInput(input)"));
    const effectful = requirementTaintDiagnostics(effectfulValidatorSource());
    assert.deepEqual(clean.taint, []);
    assert.deepEqual(clean.valueState, []);
    assert.deepEqual(effectful.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
    assert.deepEqual(effectful.valueState.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("refuses duplicate checked-flow and effect evidence instead of choosing one", () => {
    const source = taintProgram("validateInput(input)");
    const parsed = parseProgram(source, "duplicate-evidence.fungi");
    const effects = checkEffects(parsed.flows, parsed.ast ?? { kind: "program" });
    const checkedDuplicate = requirementTaintDiagnostics(source, {
      input: {
        checkedFlows: [
          { localFlowName: "validateInput", checkedDigest: TAINT_DIGEST },
          { localFlowName: "validateInput", checkedDigest: TAINT_DIGEST },
        ],
      },
    });
    const effectDuplicate = requirementTaintDiagnostics(source, {
      input: {
        effectResults: [
          ...effects,
          effects.find((result) => result.flowName === "validateInput"),
        ].filter(Boolean),
      },
    });
    assert.deepEqual(checkedDuplicate.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
    assert.deepEqual(effectDuplicate.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  const joinProgram = (control, params = "") => taintProgram("candidate == \"allow\"")
    .replace("tainted input: String", `tainted input: String${params}`)
    .replace(
      "let result: Verdict = requirement",
      `mut candidate: String = "clean"\n  ${control}\n  let result: Verdict = requirement`,
    );

  for (const [label, source] of [
    ["if", joinProgram("if true {\n    candidate = input\n  }")],
    ["while", joinProgram("while true {\n    candidate = input\n  }")],
    ["for", joinProgram("for item in items {\n    candidate = input\n  }", ", items: List<String>")],
    ["conditional join", joinProgram(
      "if flag {\n    candidate = input\n  } else {\n    candidate = \"clean\"\n  }",
      ", flag: Bool",
    )],
    ["match", joinProgram(
      "match flag {\n    true => { candidate = input }\n    _ => { candidate = \"clean\" }\n  }",
      ", flag: Bool",
    )],
  ]) {
    it(`joins ${label} child assignments back into an outer binding with taint dominance`, () => {
      const checked = requirementTaintDiagnostics(source, {
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

  it("does not leak a branch-local binding name into the outer scope", () => {
    const source = taintProgram("true").replace(
      "let result: Verdict = requirement",
      "if true {\n    let branchOnly: String = input\n  }\n  let result: Verdict = requirement",
    );
    const checked = requirementTaintDiagnostics(source, {
      registry: createRequirementValidatorAuthorityRegistry([]),
    });
    assert.deepEqual(checked.taint, []);
    assert.deepEqual(checked.valueState, []);
  });

  it("does not join a branch-local shadow over an outer binding with the same name", () => {
    const source = joinProgram("if true {\n    let candidate: String = input\n  }");
    const checked = requirementTaintDiagnostics(source, {
      registry: createRequirementValidatorAuthorityRegistry([]),
    });
    assert.deepEqual(checked.taint, []);
    assert.deepEqual(checked.valueState, []);
  });

  it("keeps an outer binding clean when every child assignment is clean", () => {
    const source = joinProgram(
      "if flag {\n    candidate = \"allow\"\n  } else {\n    candidate = \"deny\"\n  }",
      ", flag: Bool",
    );
    const checked = requirementTaintDiagnostics(source, {
      registry: createRequirementValidatorAuthorityRegistry([]),
    });
    assert.deepEqual(checked.taint, []);
    assert.deepEqual(checked.valueState, []);
  });
});

describe("RD-0858 Task 3 fix round 2", () => {
  const requirementCodes = (diagnostics) => diagnostics
    .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
      || diagnostic.code === "FUNGI-REQUIREMENT-010")
    .map((diagnostic) => diagnostic.code);

  const findNode = (node, predicate) => {
    if (predicate(node)) return node;
    for (const child of node.children ?? []) {
      const found = findNode(child, predicate);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const mutateValidatorAst = (source, mutate) => {
    const parsed = parseProgram(source, "requirement-taint.fungi");
    const ast = structuredClone(parsed.ast ?? { kind: "program" });
    const { node } = findFlowNode(parsed, "validateInput", ast);
    assert.notEqual(node, undefined);
    mutate(node);
    return ast;
  };

  it("binds a checked digest to the exact validator body semantics", () => {
    const exactSource = taintProgram("validateInput(input)");
    const exactDigest = checkedFlowDigestForSource(exactSource);
    const exact = requirementTaintDiagnostics(exactSource, { digest: exactDigest });
    const changed = requirementTaintDiagnostics(
      taintProgram("validateInput(input)", 'return value == "allow"'),
      { digest: exactDigest },
    );
    assert.deepEqual(exact.taint, []);
    assert.deepEqual(exact.valueState, []);
    assert.deepEqual(requirementCodes(changed.taint), ["FUNGI-REQUIREMENT-010"]);
    assert.deepEqual(requirementCodes(changed.valueState), ["FUNGI-REQUIREMENT-010"]);
  });

  for (const [label, changedSource, row] of [
    [
      "parameter contract",
      taintProgram("validateInput(input)").replace(
        "validateInput(value: String)",
        "validateInput(candidate: String)",
      ),
      {},
    ],
    [
      "return contract",
      taintProgram("validateInput(input)").replace(
        "pure flow validateInput(value: String) -> Verdict",
        "pure flow validateInput(value: String) -> Bool",
      ),
      { outputType: "Bool" },
    ],
    [
      "qualifier contract",
      taintProgram("validateInput(input)").replace(
        "pure flow validateInput(value: String) -> Verdict",
        "secure flow validateInput(value: String) -> Verdict",
      ),
      {},
    ],
  ]) {
    it(`binds the checked digest to the exact ${label}`, () => {
      const exactDigest = checkedFlowDigestForSource(taintProgram("validateInput(input)"));
      const checked = requirementTaintDiagnostics(changedSource, {
        digest: exactDigest,
        row: { ...row, checkedDigest: exactDigest },
      });
      assert.deepEqual(requirementCodes(checked.taint), ["FUNGI-REQUIREMENT-010"]);
      assert.deepEqual(requirementCodes(checked.valueState), ["FUNGI-REQUIREMENT-010"]);
    });
  }

  for (const [label, mutate] of [
    ["AST value", (node) => {
      const literal = findNode(node, (candidate) => candidate.kind === "boolLiteral");
      assert.notEqual(literal, undefined);
      literal.value = literal.value === "true" ? "false" : "true";
    }],
    ["AST child", (node) => {
      const body = (node.children ?? []).find((child) => child.kind === "block");
      assert.notEqual(body, undefined);
      body.children = [...(body.children ?? []), { kind: "boolLiteral", value: "true" }];
    }],
  ]) {
    it(`binds the checked digest to every exact ${label} field`, () => {
      const source = taintProgram("validateInput(input)");
      const exactDigest = checkedFlowDigestForSource(source);
      const ast = mutateValidatorAst(source, mutate);
      const checked = requirementTaintDiagnostics(source, { ast, digest: exactDigest });
      assert.deepEqual(requirementCodes(checked.taint), ["FUNGI-REQUIREMENT-010"]);
      assert.deepEqual(requirementCodes(checked.valueState), ["FUNGI-REQUIREMENT-010"]);
    });
  }

  it("excludes source locations, and only source locations, from checked-flow identity", () => {
    const source = taintProgram("validateInput(input)");
    const first = parseProgram(source, "first-location.fungi");
    const second = parseProgram(source, "second-location.fungi");
    const firstTarget = findFlowNode(first);
    const secondTarget = findFlowNode(second);
    const firstDigest = checkedFlowDigest(firstTarget.flow, firstTarget.node);
    const secondDigest = checkedFlowDigest(secondTarget.flow, secondTarget.node);
    assert.match(firstDigest ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(firstDigest, secondDigest);
    const checked = requirementTaintDiagnostics(source, {
      file: "second-location.fungi",
      digest: firstDigest,
    });
    assert.deepEqual(checked.taint, []);
    assert.deepEqual(checked.valueState, []);
  });

  it("refuses missing, duplicate, malformed, and well-formed unknown checked digests", () => {
    const source = taintProgram("validateInput(input)");
    const exactDigest = checkedFlowDigestForSource(source);
    const unknownDigest = `sha256:${"f".repeat(64)}`;
    const cases = [
      { input: { checkedFlows: [] } },
      { input: { checkedFlows: [
        { localFlowName: "validateInput", checkedDigest: exactDigest },
        { localFlowName: "validateInput", checkedDigest: exactDigest },
      ] } },
      { checkedFlow: { checkedDigest: "unknown" } },
      {
        digest: unknownDigest,
        row: { checkedDigest: unknownDigest },
      },
    ];
    for (const overrides of cases) {
      const checked = requirementTaintDiagnostics(source, overrides);
      assert.deepEqual(requirementCodes(checked.taint), ["FUNGI-REQUIREMENT-010"]);
      assert.deepEqual(requirementCodes(checked.valueState), ["FUNGI-REQUIREMENT-010"]);
    }
  });

  for (const [label, mutate] of [
    ["node ceiling", (node) => {
      const body = (node.children ?? []).find((child) => child.kind === "block");
      assert.notEqual(body, undefined);
      body.children = Array.from(
        { length: CHECKED_FLOW_MAX_NODES + 1 },
        () => ({ kind: "boolLiteral", value: "true" }),
      );
    }],
    ["depth ceiling", (node) => {
      const body = (node.children ?? []).find((child) => child.kind === "block");
      assert.notEqual(body, undefined);
      let nested = { kind: "boolLiteral", value: "true" };
      for (let depth = 0; depth <= CHECKED_FLOW_MAX_DEPTH; depth += 1) {
        nested = { kind: "block", children: [nested] };
      }
      body.children = [nested];
    }],
    ["canonical byte ceiling", (node) => {
      const body = (node.children ?? []).find((child) => child.kind === "block");
      assert.notEqual(body, undefined);
      body.children = [{ kind: "identifier", value: "x".repeat(CHECKED_FLOW_MAX_BYTES + 1) }];
    }],
    ["malformed node", (node) => {
      const body = (node.children ?? []).find((child) => child.kind === "block");
      assert.notEqual(body, undefined);
      body.children = [{ kind: "boolLiteral", value: "true", flags: "invalid" }];
    }],
  ]) {
    it(`refuses a checked validator AST over the ${label}`, () => {
      const source = taintProgram("validateInput(input)");
      const exactDigest = checkedFlowDigestForSource(source);
      const ast = mutateValidatorAst(source, mutate);
      const checked = requirementTaintDiagnostics(source, { ast, digest: exactDigest });
      assert.deepEqual(requirementCodes(checked.taint), ["FUNGI-REQUIREMENT-010"]);
      assert.deepEqual(requirementCodes(checked.valueState), ["FUNGI-REQUIREMENT-010"]);
    });
  }

  it("checks raw requirement taint through the public checkValueStates default", () => {
    const parsed = parseProgram(taintProgram('input == "allow"'), "default-value-state.fungi");
    const diagnostics = checkValueStates(parsed.ast ?? { kind: "program" }).diagnostics;
    assert.deepEqual(requirementCodes(diagnostics), ["FUNGI-REQUIREMENT-004"]);
  });

  it("keeps a clean requirement clean through the public checkValueStates default", () => {
    const parsed = parseProgram(taintProgram("true"), "default-clean-value-state.fungi");
    const diagnostics = checkValueStates(parsed.ast ?? { kind: "program" }).diagnostics;
    assert.deepEqual(requirementCodes(diagnostics), []);
  });

  it("never mints authority from a local validator when default flows and evidence are empty", () => {
    const parsed = parseProgram(
      taintProgram("validateInput(input)"),
      "default-validator-value-state.fungi",
    );
    const diagnostics = checkValueStates(parsed.ast ?? { kind: "program" }).diagnostics;
    assert.deepEqual(requirementCodes(diagnostics), ["FUNGI-REQUIREMENT-004"]);
  });

  it("preserves the explicit exact valid authority route", () => {
    const checked = requirementTaintDiagnostics(taintProgram("validateInput(input)"));
    assert.deepEqual(checked.taint, []);
    assert.deepEqual(checked.valueState, []);
  });
});
