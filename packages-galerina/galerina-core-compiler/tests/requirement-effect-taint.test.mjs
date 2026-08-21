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
const CHECKED_FLOW_MAX_PARAMS = 256;
const CHECKED_FLOW_MAX_EFFECTS = 256;
const CHECKED_FLOW_MAX_ITEM_BYTES = 32_768;

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

function referenceCheckedFlowCanonical(flow, flowNode) {
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
  return canonical;
}

function referenceCheckedFlowDigest(flow, flowNode) {
  const canonical = referenceCheckedFlowCanonical(flow, flowNode);
  if (canonical === undefined || Buffer.byteLength(canonical, "utf8") > CHECKED_FLOW_MAX_BYTES) {
    return undefined;
  }
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
  const analysisFlows = authorityOverrides.flows ?? parsed.flows;
  const { flow: validatorFlow, node: validatorNode } = findFlowNode(parsed, "validateInput", ast);
  const checkedDigest = authorityOverrides.digest
    ?? checkedFlowDigest(validatorFlow, validatorNode)
    ?? TAINT_DIGEST;
  assert.match(checkedDigest ?? "", /^sha256:[0-9a-f]{64}$/);
  const effectResults = checkEffects(analysisFlows, ast);
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
    flows: analysisFlows,
    ...(authorityOverrides.input ?? {}),
  };
  return {
    taint: checkTaint(ast, analysisFlows, input).filter((diagnostic) =>
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

describe("RD-0858 Task 3 fix round 3", () => {
  const exactPair = (source = taintProgram("validateInput(input)")) => {
    const parsed = parseProgram(source, "round-3-pair.fungi");
    const { flow, node } = findFlowNode(parsed);
    assert.notEqual(flow, undefined);
    assert.notEqual(node, undefined);
    return {
      parsed,
      flow: { ...flow, params: [...flow.params], declaredEffects: [...flow.declaredEffects] },
      node: structuredClone(node),
    };
  };

  const bodyOf = (node) => {
    const body = (node.children ?? []).find((child) => child.kind === "block");
    assert.notEqual(body, undefined);
    return body;
  };

  const setParams = (pair, params) => {
    pair.flow.params = params;
    const rest = (pair.node.children ?? []).filter((child) => child.kind !== "paramDecl");
    pair.node.children = [
      ...params.map((value) => ({ kind: "paramDecl", value })),
      ...rest,
    ];
  };

  const setEffects = (pair, effects) => {
    pair.flow.declaredEffects = effects;
    const contract = (pair.node.children ?? []).find((child) => child.kind === "contractDecl");
    assert.notEqual(contract, undefined);
    const effectsBlock = (contract.children ?? []).find((child) =>
      child.kind === "identifier" && child.value === "effects:block");
    assert.notEqual(effectsBlock, undefined);
    effectsBlock.children = [];
    const children = pair.node.children ?? [];
    const returnIndex = children.findIndex((child) => child.kind === "typeRef");
    assert.notEqual(returnIndex, -1);
    pair.node.children = [
      ...children.slice(0, returnIndex + 1),
      {
        kind: "effectsDecl",
        value: effects.join(", "),
        children: effects.map((effect) => ({ kind: "effectRef", value: effect })),
      },
      ...children.slice(returnIndex + 1).filter((child) => child.kind !== "effectsDecl"),
    ];
  };

  const accessBoundedArray = (length, valueAt, accessLimit) => {
    let accesses = 0;
    const target = [];
    const array = new Proxy(target, {
      get(inner, property, receiver) {
        if (property === "length") return length;
        if (typeof property === "string" && /^\d+$/.test(property)) {
          accesses += 1;
          if (accesses > accessLimit) {
            throw new Error(`UNBOUNDED_ARRAY_ACCESS:${accesses}`);
          }
          return valueAt(Number(property));
        }
        return Reflect.get(inner, property, receiver);
      },
      has(inner, property) {
        if (typeof property === "string" && /^\d+$/.test(property)) {
          return Number(property) < length;
        }
        return Reflect.has(inner, property);
      },
    });
    return { array, accesses: () => accesses };
  };

  for (const [label, field] of [
    ["parameter", "params"],
    ["effect", "declaredEffects"],
  ]) {
    it(`refuses over-cardinality ${label} collections before reading their items`, () => {
      const pair = exactPair();
      const probe = accessBoundedArray(
        Number.MAX_SAFE_INTEGER,
        (index) => `${label}${index}: String`,
        8,
      );
      pair.flow[field] = probe.array;
      assert.equal(checkedFlowDigest(pair.flow, pair.node), undefined);
      assert.equal(probe.accesses(), 0);
    });

    it(`stops cumulative ${label} byte accounting before scanning the full bounded collection`, () => {
      const pair = exactPair();
      const probe = accessBoundedArray(
        field === "params" ? CHECKED_FLOW_MAX_PARAMS : CHECKED_FLOW_MAX_EFFECTS,
        () => "x".repeat(CHECKED_FLOW_MAX_ITEM_BYTES),
        16,
      );
      pair.flow[field] = probe.array;
      assert.equal(checkedFlowDigest(pair.flow, pair.node), undefined);
      assert.ok(probe.accesses() <= 16);
    });
  }

  it("stops cumulative AST byte accounting before materializing every child tuple", () => {
    const pair = exactPair();
    const probe = accessBoundedArray(
      100,
      () => ({ kind: "identifier", value: "x".repeat(CHECKED_FLOW_MAX_ITEM_BYTES) }),
      16,
    );
    bodyOf(pair.node).children = probe.array;
    assert.equal(checkedFlowDigest(pair.flow, pair.node), undefined);
    assert.ok(probe.accesses() <= 16);
  });

  it("admits the exact parameter cardinality ceiling and refuses one over it", () => {
    const exact = exactPair();
    setParams(exact, Array.from(
      { length: CHECKED_FLOW_MAX_PARAMS },
      (_, index) => `p${index}: String`,
    ));
    const over = exactPair();
    setParams(over, Array.from(
      { length: CHECKED_FLOW_MAX_PARAMS + 1 },
      (_, index) => `p${index}: String`,
    ));
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(over.flow, over.node), undefined);
  });

  it("admits the exact effect cardinality ceiling and refuses one over it", () => {
    const exact = exactPair();
    setEffects(exact, Array.from(
      { length: CHECKED_FLOW_MAX_EFFECTS },
      (_, index) => `effect.${index}`,
    ));
    const over = exactPair();
    setEffects(over, Array.from(
      { length: CHECKED_FLOW_MAX_EFFECTS + 1 },
      (_, index) => `effect.${index}`,
    ));
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(over.flow, over.node), undefined);
  });

  it("admits the exact semantic-item byte ceiling and refuses one byte over for params", () => {
    const exact = exactPair();
    setParams(exact, ["p".repeat(CHECKED_FLOW_MAX_ITEM_BYTES)]);
    const over = exactPair();
    setParams(over, ["p".repeat(CHECKED_FLOW_MAX_ITEM_BYTES + 1)]);
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(over.flow, over.node), undefined);
  });

  it("admits the exact semantic-item byte ceiling and refuses one byte over for effects", () => {
    const exact = exactPair();
    setEffects(exact, ["e".repeat(CHECKED_FLOW_MAX_ITEM_BYTES)]);
    const over = exactPair();
    setEffects(over, ["e".repeat(CHECKED_FLOW_MAX_ITEM_BYTES + 1)]);
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(over.flow, over.node), undefined);
  });

  const pairAtCanonicalBytes = (targetBytes) => {
    const pair = exactPair();
    const body = bodyOf(pair.node);
    body.children = [];
    while (true) {
      const current = referenceCheckedFlowCanonical(pair.flow, pair.node);
      assert.notEqual(current, undefined);
      const currentBytes = Buffer.byteLength(current, "utf8");
      if (currentBytes === targetBytes) return pair;
      assert.ok(currentBytes < targetBytes);
      body.children.push({ kind: "identifier", value: "" });
      const withEmpty = referenceCheckedFlowCanonical(pair.flow, pair.node);
      assert.notEqual(withEmpty, undefined);
      const itemOverhead = Buffer.byteLength(withEmpty, "utf8") - currentBytes;
      body.children.pop();
      const remainingValueBytes = targetBytes - currentBytes - itemOverhead;
      if (remainingValueBytes <= CHECKED_FLOW_MAX_ITEM_BYTES) {
        assert.ok(remainingValueBytes >= 0);
        body.children.push({ kind: "identifier", value: "x".repeat(remainingValueBytes) });
        continue;
      }
      body.children.push({ kind: "identifier", value: "x".repeat(30_000) });
    }
  };

  it("admits the exact aggregate canonical-byte ceiling and refuses one byte over", () => {
    const exact = pairAtCanonicalBytes(CHECKED_FLOW_MAX_BYTES);
    const over = pairAtCanonicalBytes(CHECKED_FLOW_MAX_BYTES + 1);
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(over.flow, over.node), undefined);
  });

  const countNodes = (node) => 1 + (node.children ?? [])
    .reduce((total, child) => total + countNodes(child), 0);

  it("admits the exact AST node ceiling and refuses one node over", () => {
    const exact = exactPair();
    const body = bodyOf(exact.node);
    body.children = [];
    const baseNodes = countNodes(exact.node);
    body.children = Array.from(
      { length: CHECKED_FLOW_MAX_NODES - baseNodes },
      () => ({ kind: "identifier" }),
    );
    const over = structuredClone(exact.node);
    bodyOf(over).children.push({ kind: "identifier" });
    assert.equal(countNodes(exact.node), CHECKED_FLOW_MAX_NODES);
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(exact.flow, over), undefined);
  });

  it("admits the exact AST depth ceiling and refuses one level over", () => {
    const nestedPair = (blockCount) => {
      const pair = exactPair();
      let nested = { kind: "identifier" };
      for (let depth = 0; depth < blockCount; depth += 1) {
        nested = { kind: "block", children: [nested] };
      }
      bodyOf(pair.node).children = [nested];
      return pair;
    };
    const exact = nestedPair(CHECKED_FLOW_MAX_DEPTH - 3);
    const over = nestedPair(CHECKED_FLOW_MAX_DEPTH - 2);
    assert.match(checkedFlowDigest(exact.flow, exact.node) ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(over.flow, over.node), undefined);
  });

  const forgedCases = [
    {
      label: "return type",
      source: taintProgram("validateInput(input)").replace(
        "pure flow validateInput(value: String) -> Verdict",
        "pure flow validateInput(value: String) -> Bool",
      ),
      mutate(flow) { flow.returnType = "Verdict"; },
      row: { outputType: "Verdict" },
    },
    {
      label: "parameters",
      source: taintProgram("validateInput(input)"),
      mutate(flow) { flow.params = ["value: Bytes"]; },
      row: { inputType: "Bytes" },
    },
    {
      label: "qualifier",
      source: taintProgram("validateInput(input)"),
      mutate(flow) { flow.qualifier = "guarded"; },
      row: {},
    },
    {
      label: "declared effects",
      source: taintProgram("validateInput(input)"),
      mutate(flow) { flow.declaredEffects = ["database.read"]; },
      row: {},
    },
    {
      label: "decreases metric",
      source: taintProgram("validateInput(input)"),
      mutate(flow) { flow.decreasesMetric = "value"; },
      row: {},
    },
  ];

  const forgedFlowInput = ({ source, mutate }) => {
    const parsed = parseProgram(source, "round-3-forged-flow.fungi");
    const { flow, node } = findFlowNode(parsed);
    assert.notEqual(flow, undefined);
    assert.notEqual(node, undefined);
    const forged = {
      ...flow,
      params: [...flow.params],
      declaredEffects: [...flow.declaredEffects],
    };
    mutate(forged);
    const flows = parsed.flows.map((candidate) => candidate === flow ? forged : candidate);
    const legacyDigest = referenceCheckedFlowDigest(forged, node);
    assert.match(legacyDigest ?? "", /^sha256:[0-9a-f]{64}$/);
    return { parsed, forged, node, flows, legacyDigest };
  };

  for (const testCase of forgedCases) {
    it(`refuses a digest for FlowMeta ${testCase.label} that disagrees with the AST`, () => {
      const forged = forgedFlowInput(testCase);
      assert.equal(checkedFlowDigest(forged.forged, forged.node), undefined);
    });

    it(`emits 010 when forged FlowMeta ${testCase.label} evidence is present`, () => {
      const forged = forgedFlowInput(testCase);
      const checked = requirementTaintDiagnostics(testCase.source, {
        flows: forged.flows,
        digest: forged.legacyDigest,
        row: { ...testCase.row, checkedDigest: forged.legacyDigest },
      });
      assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
        "FUNGI-REQUIREMENT-010",
      ]);
      assert.deepEqual(checked.valueState.map((diagnostic) => diagnostic.code), [
        "FUNGI-REQUIREMENT-010",
      ]);
    });
  }

  it("keeps an exact parser-produced pair and SourceLocation-only drift valid", () => {
    const pair = exactPair();
    const exactDigest = checkedFlowDigest(pair.flow, pair.node);
    const relocatedFlow = {
      ...pair.flow,
      location: { ...pair.flow.location, file: "relocated.fungi", offset: 1_000 },
    };
    const relocatedNode = structuredClone(pair.node);
    const relocate = (node) => {
      if (node.location !== undefined) {
        node.location = { ...node.location, file: "relocated.fungi", offset: node.location.offset + 1_000 };
      }
      for (const child of node.children ?? []) relocate(child);
    };
    relocate(relocatedNode);
    assert.match(exactDigest ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(checkedFlowDigest(relocatedFlow, relocatedNode), exactDigest);
  });
});

describe("RD-0858 Task 3 fix round 4", () => {
  const exactPair = () => {
    const source = taintProgram("validateInput(input)");
    const parsed = parseProgram(source, "round-4-pair.fungi");
    const { flow, node } = findFlowNode(parsed);
    assert.notEqual(flow, undefined);
    assert.notEqual(node, undefined);
    return {
      source,
      parsed,
      flow: { ...flow, params: [...flow.params], declaredEffects: [...flow.declaredEffects] },
      node: structuredClone(node),
    };
  };

  const iteratorChangedArray = (stable, changed) => {
    let iteratorReads = 0;
    let indexedReads = 0;
    const array = new Proxy([...stable], {
      get(target, property, receiver) {
        if (property === Symbol.iterator) {
          iteratorReads += 1;
          return function* changedIterator() {
            yield* changed;
          };
        }
        if (typeof property === "string" && /^\d+$/.test(property)) indexedReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    return { array, iteratorReads: () => iteratorReads, indexedReads: () => indexedReads };
  };

  it("hashes the bounded indexed parameter snapshot, never a changed iterator view", () => {
    const pair = exactPair();
    const exactDigest = checkedFlowDigest(pair.flow, pair.node);
    const probe = iteratorChangedArray(pair.flow.params, ["forged: Bytes"]);
    const hostileFlow = { ...pair.flow, params: probe.array };
    assert.equal(checkedFlowDigest(hostileFlow, pair.node), exactDigest);
    assert.equal(probe.iteratorReads(), 0);
    assert.ok(probe.indexedReads() > 0);
  });

  it("emits 010 for authority carrying the changed parameter iterator digest", () => {
    const pair = exactPair();
    const probe = iteratorChangedArray(pair.flow.params, ["forged: Bytes"]);
    const hostileFlow = { ...pair.flow, params: probe.array };
    const attackerDigest = referenceCheckedFlowDigest(hostileFlow, pair.node);
    assert.match(attackerDigest ?? "", /^sha256:[0-9a-f]{64}$/);
    const flows = pair.parsed.flows.map((flow) =>
      flow.name === hostileFlow.name ? hostileFlow : flow);
    const checked = requirementTaintDiagnostics(pair.source, {
      flows,
      digest: attackerDigest,
      row: { checkedDigest: attackerDigest },
    });
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
    assert.deepEqual(checked.valueState.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("never expands a bounded parameter collection through a later iterator", () => {
    const pair = exactPair();
    const exactDigest = checkedFlowDigest(pair.flow, pair.node);
    const expanded = Array.from({ length: CHECKED_FLOW_MAX_PARAMS + 1 },
      (_, index) => `forged${index}: Bytes`);
    const probe = iteratorChangedArray(pair.flow.params, expanded);
    assert.equal(checkedFlowDigest({ ...pair.flow, params: probe.array }, pair.node), exactDigest);
    assert.equal(probe.iteratorReads(), 0);
  });

  it("hashes the bounded indexed effect snapshot, never a changed iterator view", () => {
    const pair = exactPair();
    const exactDigest = checkedFlowDigest(pair.flow, pair.node);
    const probe = iteratorChangedArray(pair.flow.declaredEffects, ["database.read"]);
    const hostileFlow = { ...pair.flow, declaredEffects: probe.array };
    assert.equal(checkedFlowDigest(hostileFlow, pair.node), exactDigest);
    assert.equal(probe.iteratorReads(), 0);
  });

  it("emits 010 for authority carrying the changed effect iterator digest", () => {
    const pair = exactPair();
    const probe = iteratorChangedArray(pair.flow.declaredEffects, ["database.read"]);
    const hostileFlow = { ...pair.flow, declaredEffects: probe.array };
    const attackerDigest = referenceCheckedFlowDigest(hostileFlow, pair.node);
    assert.match(attackerDigest ?? "", /^sha256:[0-9a-f]{64}$/);
    const flows = pair.parsed.flows.map((flow) =>
      flow.name === hostileFlow.name ? hostileFlow : flow);
    const checked = requirementTaintDiagnostics(pair.source, {
      flows,
      digest: attackerDigest,
      row: { checkedDigest: attackerDigest },
    });
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
    assert.deepEqual(checked.valueState.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("hashes one AST field snapshot when a getter changes on later reads", () => {
    const pair = exactPair();
    const exactDigest = checkedFlowDigest(pair.flow, pair.node);
    let valueReads = 0;
    const hostileNode = new Proxy(pair.node, {
      get(target, property, receiver) {
        if (property === "value") {
          valueReads += 1;
          return valueReads <= 2 ? target.value : "forgedValidator";
        }
        return Reflect.get(target, property, receiver);
      },
    });
    assert.equal(checkedFlowDigest(pair.flow, hostileNode), exactDigest);
    assert.equal(valueReads, 1);
  });

  it("hashes one AST child snapshot when children change before final canonicalization", () => {
    const pair = exactPair();
    const exactDigest = checkedFlowDigest(pair.flow, pair.node);
    const changedChildren = structuredClone(pair.node.children ?? []);
    const body = changedChildren.find((child) => child.kind === "block");
    assert.notEqual(body, undefined);
    body.children = [{ kind: "identifier", value: "forgedBody" }];
    let childrenReads = 0;
    const hostileNode = new Proxy(pair.node, {
      get(target, property, receiver) {
        if (property === "children") {
          childrenReads += 1;
          return childrenReads <= 3 ? target.children : changedChildren;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    assert.equal(checkedFlowDigest(pair.flow, hostileNode), exactDigest);
    assert.equal(childrenReads, 1);
  });

  it("keeps the stable plain parser-produced pair deterministic", () => {
    const pair = exactPair();
    const first = checkedFlowDigest(pair.flow, pair.node);
    const second = checkedFlowDigest(pair.flow, pair.node);
    assert.match(first ?? "", /^sha256:[0-9a-f]{64}$/);
    assert.equal(second, first);
  });
});

describe("RD-0858 Task 3 fix round 5", () => {
  const exactPair = (source = taintProgram("validateInput(input)")) => {
    const parsed = parseProgram(source, "round-5-pair.fungi");
    const { flow, node } = findFlowNode(parsed);
    assert.notEqual(flow, undefined);
    assert.notEqual(node, undefined);
    const digest = checkedFlowDigest(flow, node);
    assert.match(digest ?? "", /^sha256:[0-9a-f]{64}$/);
    return { source, parsed, flow, node, digest };
  };

  const authorityInput = (pair, hostileFlow, rowOverride) => {
    const effectResults = checkEffects(pair.parsed.flows, pair.parsed.ast);
    const row = {
      authorityVersion: TAINT_VERSION,
      qualifiedFlowIdentity: "package.example.policy::validateInput",
      sourceBuild: TAINT_SOURCE_BUILD,
      inputType: "String",
      taintClasses: ["declared.untrusted"],
      outputType: "Verdict",
      observedEffect: "EffectFree",
      checkedProfile: TAINT_PROFILE,
      checkedDigest: pair.digest,
      validFrom: "2026-08-20T00:00:00.000Z",
      expiresAt: "2026-08-22T00:00:00.000Z",
      ...rowOverride,
    };
    const registry = createRequirementValidatorAuthorityRegistry([row]);
    return {
      registry,
      context: {
        expectedRegistryDigest: registry.digest,
        canonicalSourceUnitId: "package.example.policy",
        sourceBuild: TAINT_SOURCE_BUILD,
        checkedProfile: TAINT_PROFILE,
        acceptedAuthorityVersion: TAINT_VERSION,
        comparisonTime: "2026-08-21T00:00:00.000Z",
      },
      checkedFlows: [{
        localFlowName: "validateInput",
        checkedDigest: pair.digest,
      }],
      effectResults,
      flows: pair.parsed.flows.map((flow) =>
        flow.name === "validateInput" ? hostileFlow : flow),
    };
  };

  const authorityCodes = (pair, makeHostileFlow, rowOverride) => {
    const taintFlow = makeHostileFlow();
    const taintInput = authorityInput(pair, taintFlow, rowOverride);
    const taint = checkTaint(pair.parsed.ast, taintInput.flows, taintInput)
      .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
        || diagnostic.code === "FUNGI-REQUIREMENT-010")
      .map((diagnostic) => diagnostic.code);

    const valueFlow = makeHostileFlow();
    const valueInput = authorityInput(pair, valueFlow, rowOverride);
    const valueState = checkValueStates(pair.parsed.ast, "development", valueInput).diagnostics
      .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
        || diagnostic.code === "FUNGI-REQUIREMENT-010")
      .map((diagnostic) => diagnostic.code);
    return { taint, valueState };
  };

  it("refuses authority when an indexed parameter changes after checked-flow validation", () => {
    const pair = exactPair();
    const makeHostileFlow = () => {
      let indexedReads = 0;
      const params = new Proxy([...pair.flow.params], {
        get(target, property, receiver) {
          if (property === "0") {
            indexedReads += 1;
            return indexedReads === 1 ? "value: String" : "value: Bytes";
          }
          return Reflect.get(target, property, receiver);
        },
      });
      return { ...pair.flow, params };
    };
    assert.deepEqual(authorityCodes(pair, makeHostileFlow, { inputType: "Bytes" }), {
      taint: ["FUNGI-REQUIREMENT-010"],
      valueState: ["FUNGI-REQUIREMENT-010"],
    });
  });

  it("refuses authority when returnType changes after checked-flow validation", () => {
    const pair = exactPair(taintProgram("validateInput(input)").replace(
      "pure flow validateInput(value: String) -> Verdict",
      "pure flow validateInput(value: String) -> Bool",
    ));
    const makeHostileFlow = () => {
      let returnTypeReads = 0;
      return new Proxy({
        ...pair.flow,
        params: [...pair.flow.params],
        declaredEffects: [...pair.flow.declaredEffects],
      }, {
        get(target, property, receiver) {
          if (property === "returnType") {
            returnTypeReads += 1;
            return returnTypeReads === 1 ? "Bool" : "Verdict";
          }
          return Reflect.get(target, property, receiver);
        },
      });
    };
    assert.deepEqual(authorityCodes(pair, makeHostileFlow, {}), {
      taint: ["FUNGI-REQUIREMENT-010"],
      valueState: ["FUNGI-REQUIREMENT-010"],
    });
  });

  it("keeps an exact stable parser-produced semantic pair authoritative", () => {
    const pair = exactPair();
    assert.deepEqual(authorityCodes(pair, () => pair.flow, {}), {
      taint: [],
      valueState: [],
    });
  });
});

describe("RD-0858 Task 3 fix round 6", () => {
  const effectfulSource = () => taintProgram(
    "validateInput(input)",
    "let stored = AgesDB.get(value)\n  return stored == value",
  );

  const splitReadDiagnostics = () => {
    const source = effectfulSource();
    const effectful = parseProgram(source, "round-6-split-read.fungi");
    const clean = parseProgram(
      taintProgram("validateInput(input)"),
      "round-6-split-read.fungi",
    );
    assert.deepEqual(
      effectful.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    assert.deepEqual(
      clean.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    const effectfulPair = findFlowNode(effectful);
    const cleanPair = findFlowNode(clean);
    assert.notEqual(effectfulPair.flow, undefined);
    assert.notEqual(effectfulPair.node, undefined);
    assert.notEqual(cleanPair.node, undefined);
    const digest = checkedFlowDigest(effectfulPair.flow, effectfulPair.node);
    assert.match(digest ?? "", /^sha256:[0-9a-f]{64}$/);

    const effectfulBody = (effectfulPair.node.children ?? [])
      .find((child) => child.kind === "block");
    const cleanBody = (cleanPair.node.children ?? [])
      .find((child) => child.kind === "block");
    assert.notEqual(effectfulBody, undefined);
    assert.notEqual(cleanBody, undefined);
    const splitBody = new Proxy(effectfulBody, {
      get(target, property, receiver) {
        if (property !== "children") return Reflect.get(target, property, receiver);
        const stack = new Error().stack ?? "";
        if (stack.includes("effect-checker.js")) {
          return cleanBody.children;
        }
        return target.children;
      },
    });
    const validatorNode = {
      ...effectfulPair.node,
      children: (effectfulPair.node.children ?? []).map((child) =>
        child === effectfulBody ? splitBody : child),
    };
    const hostileAst = {
      ...effectful.ast,
      children: (effectful.ast.children ?? []).map((child) =>
        child === effectfulPair.node ? validatorNode : child),
    };
    const diagnostics = requirementTaintDiagnostics(source, {
      ast: hostileAst,
      digest,
    });
    return diagnostics;
  };

  it("refuses split-read AST authority through the full taint pass", () => {
    const checked = splitReadDiagnostics();
    assert.deepEqual(checked.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("refuses split-read AST authority through the public value-state pass", () => {
    const checked = splitReadDiagnostics();
    assert.deepEqual(checked.valueState.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });

  it("keeps stable clean and stable effectful AST controls discriminating", () => {
    const clean = requirementTaintDiagnostics(taintProgram("validateInput(input)"));
    const effectful = requirementTaintDiagnostics(effectfulSource());
    assert.deepEqual(clean.taint, []);
    assert.deepEqual(clean.valueState, []);
    assert.deepEqual(effectful.taint.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
    assert.deepEqual(effectful.valueState.map((diagnostic) => diagnostic.code), [
      "FUNGI-REQUIREMENT-010",
    ]);
  });
});

describe("RD-0858 Task 3 fix round 7", () => {
  const requirementCodesOnly = (diagnostics) => diagnostics
    .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
      || diagnostic.code === "FUNGI-REQUIREMENT-010")
    .map((diagnostic) => diagnostic.code);

  const findNode = (node, kind) => {
    if (node.kind === kind) return node;
    for (const child of node.children ?? []) {
      const found = findNode(child, kind);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const replaceNode = (node, target, replacement) => {
    if (node === target) return replacement;
    if (node.children === undefined) return node;
    return {
      ...node,
      children: node.children.map((child) => replaceNode(child, target, replacement)),
    };
  };

  const exactAuthorityInput = (parsed) => {
    const { flow, node } = findFlowNode(parsed);
    assert.notEqual(flow, undefined);
    assert.notEqual(node, undefined);
    const digest = checkedFlowDigest(flow, node);
    assert.match(digest ?? "", /^sha256:[0-9a-f]{64}$/);
    const effectResults = checkEffects(parsed.flows, parsed.ast);
    const registry = createRequirementValidatorAuthorityRegistry([{
      authorityVersion: TAINT_VERSION,
      qualifiedFlowIdentity: "package.example.policy::validateInput",
      sourceBuild: TAINT_SOURCE_BUILD,
      inputType: "String",
      taintClasses: ["declared.untrusted"],
      outputType: "Verdict",
      observedEffect: "EffectFree",
      checkedProfile: TAINT_PROFILE,
      checkedDigest: digest,
      validFrom: "2026-08-20T00:00:00.000Z",
      expiresAt: "2026-08-22T00:00:00.000Z",
    }]);
    return {
      registry,
      context: {
        expectedRegistryDigest: registry.digest,
        canonicalSourceUnitId: "package.example.policy",
        sourceBuild: TAINT_SOURCE_BUILD,
        checkedProfile: TAINT_PROFILE,
        acceptedAuthorityVersion: TAINT_VERSION,
        comparisonTime: "2026-08-21T00:00:00.000Z",
      },
      checkedFlows: [{ localFlowName: "validateInput", checkedDigest: digest }],
      effectResults,
      flows: parsed.flows,
    };
  };

  it("uses one caller-owned AST snapshot for public value-state requirement authority", () => {
    const file = "round-7-value-state-atomic-view.fungi";
    const authoritative = parseProgram(taintProgram("validateInput(input)"), file);
    const raw = parseProgram(taintProgram('input == "allow"'), file);
    const authoritativeConstraint = findNode(authoritative.ast, "requirementConstraint");
    const rawConstraint = findNode(raw.ast, "requirementConstraint");
    assert.notEqual(authoritativeConstraint, undefined);
    assert.notEqual(rawConstraint, undefined);

    let callerChildrenReads = 0;
    let postSnapshotReads = 0;
    const mutatingConstraint = new Proxy(authoritativeConstraint, {
      get(target, property, receiver) {
        if (property !== "children") return Reflect.get(target, property, receiver);
        callerChildrenReads += 1;
        if (callerChildrenReads === 1) return target.children;
        postSnapshotReads += 1;
        return rawConstraint.children;
      },
    });
    const hostileAst = replaceNode(
      authoritative.ast,
      authoritativeConstraint,
      mutatingConstraint,
    );
    const diagnostics = checkValueStates(
      hostileAst,
      "development",
      exactAuthorityInput(authoritative),
    ).diagnostics;

    assert.deepEqual(requirementCodesOnly(diagnostics), []);
    assert.equal(callerChildrenReads, 1);
    assert.equal(postSnapshotReads, 0);
  });

  it("keeps stable authoritative and stable raw public value-state views discriminating", () => {
    const authoritative = parseProgram(
      taintProgram("validateInput(input)"),
      "round-7-stable-authority.fungi",
    );
    const raw = parseProgram(
      taintProgram('input == "allow"'),
      "round-7-stable-raw.fungi",
    );
    assert.deepEqual(requirementCodesOnly(checkValueStates(
      authoritative.ast,
      "development",
      exactAuthorityInput(authoritative),
    ).diagnostics), []);
    assert.deepEqual(
      requirementCodesOnly(checkValueStates(raw.ast).diagnostics),
      ["FUNGI-REQUIREMENT-004"],
    );
  });
});

describe("RD-0858 Task 3 fix round 8", () => {
  const requirementCodesOnly = (diagnostics) => diagnostics
    .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
      || diagnostic.code === "FUNGI-REQUIREMENT-010")
    .map((diagnostic) => diagnostic.code);

  const findNode = (node, kind) => {
    if (node.kind === kind) return node;
    for (const child of node.children ?? []) {
      const found = findNode(child, kind);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const replaceNode = (node, target, replacement) => {
    if (node === target) return replacement;
    if (node.children === undefined) return node;
    return {
      ...node,
      children: node.children.map((child) => replaceNode(child, target, replacement)),
    };
  };

  const malformedRequirementAst = (parsed) => {
    const constraint = findNode(parsed.ast, "requirementConstraint");
    assert.notEqual(constraint, undefined);
    const malformedConstraint = new Proxy(constraint, {
      get(target, property, receiver) {
        if (property === "flags") return "malformed-authority-field";
        return Reflect.get(target, property, receiver);
      },
    });
    return replaceNode(parsed.ast, constraint, malformedConstraint);
  };

  it("refuses a malformed requirement AST through the public taint default", () => {
    const parsed = parseProgram(
      taintProgram('input == "allow"'),
      "round-8-malformed-taint.fungi",
    );
    const diagnostics = checkTaint(
      malformedRequirementAst(parsed),
      parsed.flows,
    );
    assert.deepEqual(requirementCodesOnly(diagnostics), ["FUNGI-REQUIREMENT-010"]);
  });

  it("refuses a malformed requirement AST through the public value-state default", () => {
    const parsed = parseProgram(
      taintProgram('input == "allow"'),
      "round-8-malformed-value-state.fungi",
    );
    const diagnostics = checkValueStates(malformedRequirementAst(parsed)).diagnostics;
    assert.deepEqual(requirementCodesOnly(diagnostics), ["FUNGI-REQUIREMENT-010"]);
  });

  it("keeps stable raw and stable clean defaults discriminating in both public passes", () => {
    const raw = parseProgram(
      taintProgram('input == "allow"'),
      "round-8-stable-raw.fungi",
    );
    const clean = parseProgram(
      taintProgram("true"),
      "round-8-stable-clean.fungi",
    );
    assert.deepEqual(
      requirementCodesOnly(checkTaint(raw.ast, raw.flows)),
      ["FUNGI-REQUIREMENT-004"],
    );
    assert.deepEqual(
      requirementCodesOnly(checkValueStates(raw.ast).diagnostics),
      ["FUNGI-REQUIREMENT-004"],
    );
    assert.deepEqual(requirementCodesOnly(checkTaint(clean.ast, clean.flows)), []);
    assert.deepEqual(requirementCodesOnly(checkValueStates(clean.ast).diagnostics), []);
  });
});

describe("RD-0858 Task 3 fix round 9", () => {
  const requirementCodesOnly = (diagnostics) => diagnostics
    .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
      || diagnostic.code === "FUNGI-REQUIREMENT-010")
    .map((diagnostic) => diagnostic.code);

  const findNode = (node, kind) => {
    if (node.kind === kind) return node;
    for (const child of node.children ?? []) {
      const found = findNode(child, kind);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  const replaceNode = (node, target, replacement) => {
    if (node === target) return replacement;
    if (node.children === undefined) return node;
    return {
      ...node,
      children: node.children.map((child) => replaceNode(child, target, replacement)),
    };
  };

  const hostileRequirementAst = (parsed, children) => {
    const constraint = findNode(parsed.ast, "requirementConstraint");
    assert.notEqual(constraint, undefined);
    return replaceNode(parsed.ast, constraint, new Proxy(constraint, {
      get(target, property, receiver) {
        if (property === "children") return children();
        return Reflect.get(target, property, receiver);
      },
    }));
  };

  const assertPublicRefusal = (ast, flows) => {
    let diagnostics;
    assert.doesNotThrow(() => {
      diagnostics = checkTaint(ast, flows);
    });
    assert.deepEqual(requirementCodesOnly(diagnostics), ["FUNGI-REQUIREMENT-010"]);
  };

  it("returns 010 instead of throwing when requirement children access throws", () => {
    const parsed = parseProgram(
      taintProgram('input == "allow"'),
      "round-9-throwing-children.fungi",
    );
    const hostileAst = hostileRequirementAst(parsed, () => {
      throw new Error("hostile requirement children");
    });

    assertPublicRefusal(hostileAst, parsed.flows);
    assert.deepEqual(
      requirementCodesOnly(checkValueStates(hostileAst).diagnostics),
      ["FUNGI-REQUIREMENT-010"],
    );
  });

  it("returns 010 instead of throwing when requirement children are not an array", () => {
    const parsed = parseProgram(
      taintProgram('input == "allow"'),
      "round-9-non-array-children.fungi",
    );
    const hostileAst = hostileRequirementAst(parsed, () => Object.freeze({}));

    assertPublicRefusal(hostileAst, parsed.flows);
    assert.deepEqual(
      requirementCodesOnly(checkValueStates(hostileAst).diagnostics),
      ["FUNGI-REQUIREMENT-010"],
    );
  });

  it("keeps stable raw and stable clean public taint controls discriminating", () => {
    const raw = parseProgram(
      taintProgram('input == "allow"'),
      "round-9-stable-raw.fungi",
    );
    const clean = parseProgram(
      taintProgram("true"),
      "round-9-stable-clean.fungi",
    );

    assert.deepEqual(
      requirementCodesOnly(checkTaint(raw.ast, raw.flows)),
      ["FUNGI-REQUIREMENT-004"],
    );
    assert.deepEqual(requirementCodesOnly(checkTaint(clean.ast, clean.flows)), []);
  });
});

describe("RD-0858 Task 3 fix round 10", () => {
  const source = `@version 1
secure flow q(req: Request) -> Response
contract { effects { database.read } }
{
  let allowed: Verdict = requirement {
    req.body == "allow"
  }
  let userId: String = req.body
  let result: String = Database.query(userId)
  return result
}`;

  const parse = (file) => {
    const parsed = parseProgram(source, file);
    assert.deepEqual(
      parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    assert.equal(parsed.flows.length, 1);
    assert.equal(parsed.flows[0].name, "q");
    return parsed;
  };

  const emptyValidatorInput = (flows) => ({
    registry: createRequirementValidatorAuthorityRegistry([]),
    checkedFlows: [],
    effectResults: [],
    flows,
  });

  const relevantCodes = (diagnostics) => diagnostics
    .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004"
      || diagnostic.code === "FUNGI-TAINT-001")
    .map((diagnostic) => diagnostic.code);

  const assertTaintPass = (ast, flows) => {
    let diagnostics;
    assert.doesNotThrow(() => {
      diagnostics = checkTaint(ast, flows);
    });
    assert.deepEqual(relevantCodes(diagnostics), [
      "FUNGI-REQUIREMENT-004",
      "FUNGI-TAINT-001",
    ]);
    return diagnostics;
  };

  it("never invokes the caller-owned flow iterator after indexed snapshotting", () => {
    const parsed = parse("round-10-flow-iterator.fungi");
    const hostileFlows = new Proxy(parsed.flows, {
      get(target, property, receiver) {
        if (property === Symbol.iterator) throw new Error("hostile flow iterator");
        return Reflect.get(target, property, receiver);
      },
    });

    assertTaintPass(parsed.ast, hostileFlows);
    let valueStateDiagnostics;
    assert.doesNotThrow(() => {
      valueStateDiagnostics = checkValueStates(
        parsed.ast,
        "development",
        emptyValidatorInput(hostileFlows),
      ).diagnostics;
    });
    assert.deepEqual(
      valueStateDiagnostics
        .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004")
        .map((diagnostic) => diagnostic.code),
      ["FUNGI-REQUIREMENT-004"],
    );
  });

  it("uses the snapshotted flow name when a later raw read changes it", () => {
    const parsed = parse("round-10-flow-name-mutation.fungi");
    let nameReads = 0;
    const hostileFlow = new Proxy(parsed.flows[0], {
      get(target, property, receiver) {
        if (property === "name") {
          nameReads += 1;
          return nameReads === 1 ? "q" : "not-q";
        }
        return Reflect.get(target, property, receiver);
      },
    });

    assertTaintPass(parsed.ast, [hostileFlow]);
  });

  it("does not throw when a raw flow name getter throws after snapshotting", () => {
    const parsed = parse("round-10-flow-name-throw.fungi");
    let nameReads = 0;
    const hostileFlow = new Proxy(parsed.flows[0], {
      get(target, property, receiver) {
        if (property === "name" && ++nameReads > 1) {
          throw new Error("hostile flow name");
        }
        return Reflect.get(target, property, receiver);
      },
    });

    assertTaintPass(parsed.ast, [hostileFlow]);
  });

  it("attributes injection diagnostics to the snapshotted flow name", () => {
    const parsed = parse("round-10-flow-name-attribution.fungi");
    let nameReads = 0;
    const hostileFlow = new Proxy(parsed.flows[0], {
      get(target, property, receiver) {
        if (property === "name") {
          nameReads += 1;
          return nameReads <= 2 ? "q" : "not-q";
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const diagnostics = assertTaintPass(parsed.ast, [hostileFlow]);
    assert.deepEqual(
      diagnostics
        .filter((diagnostic) => diagnostic.code === "FUNGI-TAINT-001")
        .map((diagnostic) => diagnostic.flowName),
      ["q"],
    );
  });

  it("keeps stable injection taint and stable requirement 004 discriminating", () => {
    const parsed = parse("round-10-stable-controls.fungi");
    assertTaintPass(parsed.ast, parsed.flows);
    assert.deepEqual(
      checkValueStates(parsed.ast).diagnostics
        .filter((diagnostic) => diagnostic.code === "FUNGI-REQUIREMENT-004")
        .map((diagnostic) => diagnostic.code),
      ["FUNGI-REQUIREMENT-004"],
    );
  });
});
