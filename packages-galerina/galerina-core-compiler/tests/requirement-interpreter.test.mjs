import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { types as nodeUtilTypes } from "node:util";
import * as L from "../dist/index.js";

const sourceForRequirement = (flowName, constraints) =>
  `@version 1\npure flow ${flowName}() -> Verdict\n` +
  `contract { effects {} }\n{\n` +
  `  return requirement {\n${constraints}\n  }\n}`;

const sourceForRequire = (flowName, subjectType = "Verdict") =>
  `@version 1\npure flow ${flowName}(subject: ${subjectType}) -> String\n` +
  `contract { effects {} }\n{\n` +
  `  require subject {\n` +
  `    deny: return "deny"\n` +
  `    ambig: return "ambig"\n` +
  `  }\n` +
  `  return "allow"\n}`;

function prepare(source, file = "requirement-interpreter.fungi") {
  const parsed = L.parseProgram(source, file);
  const parserErrors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(parserErrors, [], `unexpected parser errors: ${JSON.stringify(parserErrors)}`);
  const typeErrors = L.checkTypes(parsed.ast).diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(typeErrors, [], `unexpected type errors: ${JSON.stringify(typeErrors)}`);
  return parsed;
}

function firstNode(ast, kind) {
  let found;
  (function walk(node) {
    if (found !== undefined || node === undefined || node === null || typeof node !== "object") return;
    if (node.kind === kind) {
      found = node;
      return;
    }
    for (const child of node.children ?? []) walk(child);
  })(ast);
  assert.ok(found, `expected ${kind} node`);
  return found;
}

async function runRequirement(flowName, constraints, runtimeOptions) {
  const parsed = prepare(sourceForRequirement(flowName, constraints), `${flowName}.fungi`);
  return await L.executeFlow(flowName, new Map(), parsed.ast, parsed.flows, undefined, undefined, runtimeOptions);
}

const sourceForEcho = (flowName, subjectType) =>
  `@version 1\npure flow ${flowName}(subject: ${subjectType}) -> ${subjectType}\n` +
  `contract { effects {} }\n{\n  return subject\n}`;

function changingBool(laterValue) {
  let reads = 0;
  return {
    __tag: "bool",
    get value() {
      reads += 1;
      return reads <= 2 ? true : laterValue;
    },
  };
}

function proxyScalar(tag, payload) {
  let descriptorReads = 0;
  const value = new Proxy({}, {
    getOwnPropertyDescriptor(_target, key) {
      descriptorReads += 1;
      if (key === "__tag") {
        return { configurable: true, enumerable: true, writable: true, value: tag };
      }
      if (key === "value") {
        return { configurable: true, enumerable: true, writable: true, value: payload };
      }
      return undefined;
    },
  });
  return { value, descriptorReads: () => descriptorReads };
}

describe("RD-0858 Unit 4 requirement expression runtime", () => {
  const cases = [
    ["runtimeBoolAllow", "    true", 1],
    ["runtimeBoolDeny", "    false", -1],
    ["runtimeMixedUnknown", "    true\n    Verdict.Unknown\n    Verdict.Allow", 0],
    ["runtimeMixedDeny", "    Verdict.Allow\n    false\n    Verdict.Unknown", -1],
  ];

  for (const [flowName, constraints, expected] of cases) {
    it(`${flowName} lifts Bool and computes the complete K3 minimum`, async () => {
      const result = await runRequirement(flowName, constraints);
      assert.equal(result.audit.result, "ok");
      assert.deepEqual(result.value, { __tag: "verdict", value: expected });
    });
  }

  it("does not short-circuit after DENY before a later operational failure", async () => {
    const result = await runRequirement(
      "runtimeCompleteEvaluation",
      "    false\n    (1 / 0) == 0",
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /DivisionByZero|operational failure|fail-closed/);
  });

  it("refuses a forged non-Bool, non-Verdict constraint", async () => {
    const parsed = prepare(sourceForRequirement("runtimeBadConstraint", "    true"));
    const constraint = firstNode(parsed.ast, "requirementConstraint");
    constraint.children = [{ kind: "numberLiteral", value: "1", location: constraint.location }];

    const result = await L.executeFlow("runtimeBadConstraint", new Map(), parsed.ast, parsed.flows);
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /Bool or Verdict|fail-closed/);
  });

  it("refuses a forged Bool payload instead of minting Verdict.Unknown", async () => {
    const flowName = "runtimeForgedBoolConstraint";
    const parsed = prepare(
      `@version 1\npure flow ${flowName}(subject: Bool) -> Verdict\n` +
      `contract { effects {} }\n{\n  return requirement {\n    subject\n  }\n}`,
      `${flowName}.fungi`,
    );

    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: 0 }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /malformed Bool|Bool.*fail-closed/);
  });

  it("refuses a changing Bool accessor instead of minting Verdict.Unknown", async () => {
    const flowName = "runtimeChangingBoolConstraint";
    const parsed = prepare(
      `@version 1\npure flow ${flowName}(subject: Bool) -> Verdict\n` +
      `contract { effects {} }\n{\n  return requirement {\n    subject\n  }\n}`,
      `${flowName}.fungi`,
    );
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", changingBool(0)]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /malformed Bool|Bool.*fail-closed/);
  });

  it("refuses a Proxy-forged Bool descriptor without consulting its traps", async () => {
    const flowName = "runtimeProxyBoolConstraint";
    const parsed = prepare(
      `@version 1\npure flow ${flowName}(subject: Bool) -> Verdict\n` +
      `contract { effects {} }\n{\n  return requirement {\n    subject\n  }\n}`,
      `${flowName}.fungi`,
    );
    const hostile = proxyScalar("bool", true);
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", hostile.value]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.equal(hostile.descriptorReads(), 0);
  });

  it("refuses a forged requirement with no constraints", async () => {
    const parsed = prepare(sourceForRequirement("runtimeEmptyConstraint", "    true"));
    firstNode(parsed.ast, "requirementExpr").children = [];

    const result = await L.executeFlow("runtimeEmptyConstraint", new Map(), parsed.ast, parsed.flows);
    assert.equal(result.audit.result, "error");
    assert.match(result.value.message, /at least one constraint|fail-closed/);
  });

  it("refuses a forged 65th constraint before evaluating a truncated prefix", async () => {
    const parsed = prepare(sourceForRequirement("runtimeConstraintCeiling", "    true"));
    const requirement = firstNode(parsed.ast, "requirementExpr");
    const original = requirement.children[0];
    requirement.children = Array.from({ length: 65 }, () => ({
      ...original,
      children: [...(original.children ?? [])],
    }));

    const result = await L.executeFlow("runtimeConstraintCeiling", new Map(), parsed.ast, parsed.flows);
    assert.equal(result.audit.result, "error");
    assert.match(result.value.message, /64 constraints|ceiling|fail-closed/);
  });
});

describe("RD-0858 Unit 4 require statement runtime", () => {
  const cases = [
    ["runtimeRequireDeny", -1, "deny"],
    ["runtimeRequireUnknown", 0, "ambig"],
    ["runtimeRequireAllow", 1, "allow"],
  ];

  for (const [flowName, trit, expected] of cases) {
    it(`${flowName} selects the exact terminal route`, async () => {
      const parsed = prepare(sourceForRequire(flowName), `${flowName}.fungi`);
      const result = await L.executeFlow(
        flowName,
        new Map([["subject", { __tag: "verdict", value: trit }]]),
        parsed.ast,
        parsed.flows,
      );
      assert.equal(result.audit.result, "ok");
      assert.deepEqual(result.value, { __tag: "string", value: expected });
    });
  }

  it("lifts a Bool subject through the same deny/allow mapping", async () => {
    const flowName = "runtimeRequireBool";
    const parsed = prepare(sourceForRequire(flowName, "Bool"));
    const denied = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: false }]]),
      parsed.ast,
      parsed.flows,
    );
    const allowed = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: true }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(denied.value.__tag, "string");
    assert.equal(denied.value.value, "deny");
    assert.equal(allowed.value.__tag, "string");
    assert.equal(allowed.value.value, "allow");
  });

  it("refuses a forged Bool payload before guarded ALLOW continuation", async () => {
    const flowName = "runtimeForgedRequireBool";
    const parsed = prepare(sourceForRequire(flowName, "Bool"));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: 1 }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.notDeepEqual(result.value, { __tag: "string", value: "allow" });
    assert.match(result.value.message, /malformed Bool|Bool.*fail-closed/);
  });

  it("refuses a changing Bool accessor before guarded ALLOW continuation", async () => {
    const flowName = "runtimeChangingRequireBool";
    const parsed = prepare(sourceForRequire(flowName, "Bool"));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", changingBool(1)]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.notDeepEqual(result.value, { __tag: "string", value: "allow" });
    assert.match(result.value.message, /malformed Bool|Bool.*fail-closed/);
  });

  it("refuses a Proxy-forged Bool descriptor before guarded ALLOW continuation", async () => {
    const flowName = "runtimeProxyRequireBool";
    const parsed = prepare(sourceForRequire(flowName, "Bool"));
    const hostile = proxyScalar("bool", true);
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", hostile.value]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.equal(hostile.descriptorReads(), 0);
  });

  it("refuses a forged missing handler instead of reaching guarded continuation", async () => {
    const flowName = "runtimeMissingHandler";
    const parsed = prepare(sourceForRequire(flowName));
    const statement = firstNode(parsed.ast, "requireStmt");
    statement.children = statement.children.filter((child) => child.value !== "ambig");

    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "verdict", value: 0 }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.notEqual(result.value.value, "allow");
    assert.match(result.value.message, /deny.*ambig|handlers|fail-closed/);
  });

  it("refuses a forged handler that returns normally", async () => {
    const flowName = "runtimeNonTerminalHandler";
    const parsed = prepare(sourceForRequire(flowName));
    const denyArm = firstNode(parsed.ast, "requireStmt").children.find((child) => child.value === "deny");
    denyArm.children = [{ kind: "block", children: [], location: denyArm.location }];

    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "verdict", value: -1 }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.match(result.value.message, /handler returned normally|non-terminal|fail-closed/);
  });

  it("refuses a forged fourth Verdict before selecting either handler", async () => {
    const flowName = "runtimeForgedVerdict";
    const parsed = prepare(sourceForRequire(flowName));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "verdict", value: 2 }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.match(result.value.message, /malformed Verdict|fail-closed/);
  });
});

describe("RD-0858 Unit 4 execution-tier differential boundary", () => {
  it("keeps a canonical Bool parameter stable on the governed default path", async () => {
    const flowName = "runtimeCanonicalBoolEcho";
    const parsed = prepare(sourceForEcho(flowName, "Bool"));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: true }]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "ok");
    assert.deepEqual(result.value, { __tag: "bool", value: true });
  });

  it("refuses a malformed Bool before the pure-fast bytecode tier", async () => {
    const flowName = "runtimeMalformedBoolBytecode";
    const parsed = prepare(sourceForEcho(flowName, "Bool"));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: 1 }]]),
      parsed.ast,
      parsed.flows,
      undefined,
      undefined,
      { pureFastPath: true, sourceTag: "rd-0858-malformed-bool-bytecode" },
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
  });

  it("refuses a malformed Bool before the execution-graph tier", async () => {
    const flowName = "runtimeMalformedBoolEgraph";
    const parsed = prepare(sourceForEcho(flowName, "Bool"));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "bool", value: 1 }]]),
      parsed.ast,
      parsed.flows,
      undefined,
      undefined,
      { egraphFastPath: true },
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
  });

  it("declines both sync entry points for unadmitted Bool parameters", () => {
    const flowName = "runtimeMalformedBoolSync";
    const parsed = prepare(sourceForEcho(flowName, "Bool"));
    const args = new Map([["subject", { __tag: "bool", value: 1 }]]);
    assert.equal(L.executeFlowSync(flowName, args, parsed.ast, parsed.flows), null);
    assert.equal(L.tryPureFlowSync(parsed.ast, parsed.flows, flowName, args), null);
  });

  it("refuses a malformed Verdict before the execution-graph tier", async () => {
    const flowName = "runtimeMalformedVerdictEgraph";
    const parsed = prepare(sourceForEcho(flowName, "Verdict"));
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", { __tag: "verdict", value: 2 }]]),
      parsed.ast,
      parsed.flows,
      undefined,
      undefined,
      { egraphFastPath: true },
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
  });

  it("refuses a Proxy-forged Verdict descriptor on the governed tree tier", async () => {
    const flowName = "runtimeProxyVerdict";
    const parsed = prepare(sourceForEcho(flowName, "Verdict"));
    const hostile = proxyScalar("verdict", 1);
    const result = await L.executeFlow(
      flowName,
      new Map([["subject", hostile.value]]),
      parsed.ast,
      parsed.flows,
    );
    assert.equal(result.audit.result, "error");
    assert.equal(result.value.__tag, "runtimeError");
    assert.equal(hostile.descriptorReads(), 0);
  });

  it("refuses a Proxy even after the shared Node detector property is replaced", async () => {
    const flowName = "runtimeTamperedProxyDetector";
    const parsed = prepare(sourceForEcho(flowName, "Bool"));
    const hostile = proxyScalar("bool", true);
    const originalIsProxy = nodeUtilTypes.isProxy;
    try {
      nodeUtilTypes.isProxy = () => false;
      const result = await L.executeFlow(
        flowName,
        new Map([["subject", hostile.value]]),
        parsed.ast,
        parsed.flows,
      );
      assert.equal(result.audit.result, "error");
      assert.equal(result.value.__tag, "runtimeError");
      assert.equal(hostile.descriptorReads(), 0);
    } finally {
      nodeUtilTypes.isProxy = originalIsProxy;
    }
  });

  it("refuses a malformed Bool after the shared descriptor reader is replaced", async () => {
    const flowName = "runtimeTamperedDescriptorReader";
    const parsed = prepare(sourceForRequire(flowName, "Bool"));
    const subject = { __tag: "bool", value: 0 };
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    try {
      Object.getOwnPropertyDescriptor = (target, key) => {
        if (target === subject && key === "__tag") {
          return { configurable: true, enumerable: true, writable: true, value: "bool" };
        }
        if (target === subject && key === "value") {
          return { configurable: true, enumerable: true, writable: true, value: true };
        }
        return originalGetOwnPropertyDescriptor(target, key);
      };
      const result = await L.executeFlow(
        flowName,
        new Map([["subject", subject]]),
        parsed.ast,
        parsed.flows,
      );
      assert.equal(result.audit.result, "error");
      assert.equal(result.value.__tag, "runtimeError");
      assert.notDeepEqual(result.value, { __tag: "string", value: "allow" });
    } finally {
      Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
    }
  });

  it("refuses Proxy-forged Bool when Function bind is poisoned before module import", () => {
    const parserUrl = new URL("../dist/parser.js", import.meta.url).href;
    const typeCheckerUrl = new URL("../dist/type-checker.js", import.meta.url).href;
    const interpreterUrl = new URL("../dist/interpreter.js", import.meta.url).href;
    const childSource = String.raw`
      import { types as nodeUtilTypes } from "node:util";
      const { parseProgram } = await import(process.argv[1]);
      const { checkTypes } = await import(process.argv[2]);
      const source = "@version 1\\npure flow preImportBindPoison(subject: Bool) -> String\\n" +
        "contract { effects {} }\\n{\\n" +
        "  require subject {\\n" +
        "    deny: return \\\"deny\\\"\\n" +
        "    ambig: return \\\"ambig\\\"\\n" +
        "  }\\n" +
        "  return \\\"allow\\\"\\n}";
      const parsed = parseProgram(source, "pre-import-bind-poison.fungi");
      const parserErrors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
      const typeErrors = checkTypes(parsed.ast).diagnostics.filter(
        (diagnostic) => diagnostic.severity === "error",
      );
      if (parserErrors.length > 0 || typeErrors.length > 0) {
        throw new Error("unexpected parser or type errors in bind-poison fixture");
      }
      const originalBind = Function.prototype.bind;
      Function.prototype.bind = function (...args) {
        if (this === nodeUtilTypes.isProxy) return () => false;
        return Reflect.apply(originalBind, this, args);
      };
      try {
        const L = await import(process.argv[3] + "?pre-import-bind-poison=1");
        let descriptorReads = 0;
        const subject = new Proxy({}, {
          getOwnPropertyDescriptor(_target, key) {
            descriptorReads += 1;
            if (key === "__tag") return { configurable: true, value: "bool" };
            if (key === "value") return { configurable: true, value: true };
            return undefined;
          },
        });
        const result = await L.executeFlow(
          "preImportBindPoison",
          new Map([["subject", subject]]),
          parsed.ast,
          parsed.flows,
        );
        process.stdout.write(JSON.stringify({
          audit: result.audit.result,
          tag: result.value?.__tag,
          value: result.value?.value,
          descriptorReads,
        }));
      } finally {
        Function.prototype.bind = originalBind;
      }
    `;
    const child = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", childSource, parserUrl, typeCheckerUrl, interpreterUrl],
      { encoding: "utf8", timeout: 30_000, windowsHide: true },
    );
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout);
    assert.equal(result.audit, "error");
    assert.equal(result.tag, "runtimeError");
    assert.equal(result.descriptorReads, 0);
  });

  it("declines the sync-only API for requirement semantics", () => {
    const flowName = "runtimeSyncDeferral";
    const parsed = prepare(sourceForRequirement(flowName, "    true"));
    assert.equal(L.executeFlowSync(flowName, new Map(), parsed.ast, parsed.flows), null);
    assert.equal(L.tryPureFlowSync(parsed.ast, parsed.flows, flowName, new Map()), null);
  });

  it("keeps every pure-fast-path invocation on the governed tree tier", async () => {
    const flowName = "runtimeFastPathDeferral";
    const parsed = prepare(sourceForRequirement(flowName, "    true"));
    const options = { pureFastPath: true, egraphFastPath: true, sourceTag: "rd-0858-unit4" };

    const first = await L.executeFlow(flowName, new Map(), parsed.ast, parsed.flows, undefined, undefined, options);
    const second = await L.executeFlow(flowName, new Map(), parsed.ast, parsed.flows, undefined, undefined, options);

    assert.deepEqual(first.value, { __tag: "verdict", value: 1 });
    assert.deepEqual(second.value, first.value);
    assert.equal(first.executionTier, "tree");
    assert.equal(second.executionTier, "tree");
  });

  it("returns byte-identical semantic results on default and opt-in execution", async () => {
    const flowName = "runtimeDifferential";
    const parsed = prepare(sourceForRequirement(
      flowName,
      "    Verdict.Allow\n    true\n    Verdict.Unknown",
    ));
    const governed = await L.executeFlow(flowName, new Map(), parsed.ast, parsed.flows);
    const optedIn = await L.executeFlow(
      flowName,
      new Map(),
      parsed.ast,
      parsed.flows,
      undefined,
      undefined,
      { pureFastPath: true, egraphFastPath: true, sourceTag: "rd-0858-differential" },
    );

    assert.deepEqual(governed.value, { __tag: "verdict", value: 0 });
    assert.deepEqual(optedIn.value, governed.value);
    assert.equal(governed.audit.result, "ok");
    assert.equal(optedIn.audit.result, "ok");
    assert.equal(optedIn.executionTier, "tree");
  });
});
