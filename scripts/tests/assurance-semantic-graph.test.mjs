import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateSemanticGraph,
  isSemanticGraphReport,
} from "../lib/assurance-fabric/semantic-graph.mjs";

const HEAD = "a".repeat(40);
const DIGEST = "b".repeat(64);

function requirement(id = "vok-sem-001", criticality = "release") {
  return { id, criticality, evidencePath: `governance/${id}.json` };
}

function systemContract(kind = "absent") {
  return kind === "present"
    ? { kind: "present", id: "system-contract:repository-governance" }
    : { kind: "absent", reason: "mapped to a requirement" };
}

function testNode(id, polarity, requirementIds = ["vok-sem-001"], overrides = {}) {
  return {
    id,
    sourcePath: `scripts/tests/${id}.test.mjs`,
    class: polarity === "refusal" ? "negative-refusal" : "contract",
    polarity,
    requirementIds,
    systemContract: systemContract(),
    ...overrides,
  };
}

function route(overrides = {}) {
  return {
    id: "route:get:/health",
    sourcePath: "packages-galerina/galerina-core/src/health.fungi",
    line: 3,
    method: "GET",
    path: "/health",
    flowName: "health",
    parserProvenance: "canonical-fungi-ast",
    ...overrides,
  };
}

function packageNode(overrides = {}) {
  return {
    id: "package:galerina-core",
    sourcePath: "packages-galerina/galerina-core/package.json",
    declaredFanIn: 0,
    declaredFanOut: 1,
    derivedFanIn: 0,
    derivedFanOut: 1,
    ...overrides,
  };
}

function detector(overrides = {}) {
  return {
    id: "detector:route-provenance",
    ruleId: "route-provenance",
    plantedDefectId: "route-text-must-not-enter",
    testId: "route-refusal",
    ...overrides,
  };
}

function executableFamily(overrides = {}) {
  return {
    ts: ["packages-galerina/galerina-core/src/a.ts"],
    declarationTs: [],
    mts: [],
    cts: [],
    mjs: ["packages-galerina/galerina-core/src/a.mjs"],
    js: [],
    cjs: [],
    total: 2,
    ...overrides,
  };
}

function graph(overrides = {}) {
  return {
    schemaVersion: 1,
    repositoryHead: HEAD,
    requirements: [requirement()],
    systemContracts: [{
      id: "system-contract:repository-governance",
      evidencePath: "AGENTS.md",
    }],
    routes: [route()],
    packages: [packageNode()],
    tests: [
      testNode("route-positive", "positive"),
      testNode("route-refusal", "refusal", ["vok-sem-001"], {
        class: "detector-self-test",
      }),
    ],
    detectors: [detector()],
    executableFamily: executableFamily(),
    legacyUnmapped: {
      baselineCount: 0,
      currentCount: 0,
      pathsDigest: DIGEST,
    },
    ...overrides,
  };
}

function accepted(value) {
  const result = evaluateSemanticGraph(value);
  assert.equal(result.kind, "accepted", JSON.stringify(result));
  return result.value;
}

function refused(value, code) {
  const result = evaluateSemanticGraph(value);
  assert.equal(result.kind, "refused", JSON.stringify(result));
  assert.equal(result.code, code);
  assert.equal(typeof result.detail, "string");
  assert.ok(result.detail.length > 0);
}

describe("closed semantic assurance graph", () => {
  it("brands and freezes a complete non-authorizing graph", () => {
    const report = accepted(graph());
    assert.equal(isSemanticGraphReport(report), true);
    assert.equal(isSemanticGraphReport({ ...report }), false);
    assert.equal(report.verdictTrit, 1);
    assert.equal(report.authorizing, false);
    assert.equal(report.totals.requirements, 1);
    assert.equal(report.totals.systemContracts, 1);
    assert.equal(report.totals.routes, 1);
    assert.equal(report.totals.packages, 1);
    assert.equal(report.totals.tests, 2);
    assert.equal(report.totals.detectors, 1);
    assert.equal(report.totals.executableFamily, 2);
    assert.ok(report.edges.some((edge) => (
      edge.from === "test:route-positive"
      && edge.to === "requirement:vok-sem-001"
      && edge.type === "TESTS"
    )));
    assert.equal(Object.isFrozen(report), true);
    assert.equal(Object.isFrozen(report.nodes), true);
    assert.equal(Object.isFrozen(report.edges), true);
  });

  it("requires positive and refusal evidence for every release requirement", () => {
    refused(graph({
      tests: [testNode("only-positive", "positive")],
      detectors: [],
    }), "ASSURANCE-SEMANTIC-REQUIREMENT");
    refused(graph({
      tests: [testNode("only-refusal", "refusal")],
      detectors: [],
    }), "ASSURANCE-SEMANTIC-REQUIREMENT");
  });

  it("maps every test to requirements or one explicit system contract", () => {
    const report = accepted(graph({
      detectors: [],
      tests: [
        testNode("positive", "positive"),
        testNode("refusal", "refusal"),
        testNode("system", "neutral", [], {
          class: "system-contract",
          systemContract: systemContract("present"),
        }),
      ],
    }));
    assert.ok(report.edges.some((edge) => (
      edge.from === "test:system"
      && edge.to === "system-contract:repository-governance"
      && edge.type === "CLASSIFIES"
    )));

    refused(graph({
      tests: [
        testNode("positive", "positive"),
        testNode("refusal", "refusal"),
        testNode("unmapped", "neutral", [], {
          class: "system-contract",
          systemContract: systemContract(),
        }),
      ],
    }), "ASSURANCE-SEMANTIC-TEST");
    refused(graph({
      tests: [
        testNode("positive", "positive"),
        testNode("refusal", "refusal"),
        testNode("both", "neutral", ["vok-sem-001"], {
          class: "system-contract",
          systemContract: systemContract("present"),
        }),
      ],
    }), "ASSURANCE-SEMANTIC-TEST");
    refused(graph({
      tests: [testNode("positive", "positive", ["missing"]), testNode("refusal", "refusal")],
    }), "ASSURANCE-SEMANTIC-ENDPOINT");
    refused(graph({
      tests: [testNode("duplicate", "positive"), testNode("duplicate", "refusal")],
    }), "ASSURANCE-SEMANTIC-DUPLICATE");
  });

  it("requires canonical parser provenance for every live route", () => {
    refused(graph({ routes: [route({ parserProvenance: "regex" })] }), "ASSURANCE-SEMANTIC-ROUTE");
    refused(graph({ routes: [route({ line: 0 })] }), "ASSURANCE-SEMANTIC-ROUTE");
    refused(graph({ routes: [route({ method: "get" })] }), "ASSURANCE-SEMANTIC-ROUTE");
    refused(graph({ routes: [route({ sourcePath: "docs/example.fungi" })] }), "ASSURANCE-SEMANTIC-ROUTE");
  });

  it("requires declared and derived package fan counts to conserve", () => {
    refused(graph({
      packages: [packageNode({ derivedFanOut: 0 })],
    }), "ASSURANCE-SEMANTIC-PACKAGE");
    refused(graph({
      packages: [packageNode({ declaredFanIn: Number.NaN })],
    }), "ASSURANCE-SEMANTIC-COUNT");
  });

  it("requires every detector rule to name a real planted-defect test", () => {
    refused(graph({ detectors: [detector({ testId: "missing" })] }), "ASSURANCE-SEMANTIC-ENDPOINT");
    refused(graph({
      detectors: [detector()],
      tests: [
        testNode("route-positive", "positive"),
        testNode("route-refusal", "refusal"),
      ],
    }), "ASSURANCE-SEMANTIC-DETECTOR");
    refused(graph({ detectors: [detector({ plantedDefectId: "" })] }), "ASSURANCE-SEMANTIC-VALUE");
  });

  it("requires all seven executable-family classes and exact conservation", () => {
    const incomplete = executableFamily();
    delete incomplete.cjs;
    refused(graph({ executableFamily: incomplete }), "ASSURANCE-SEMANTIC-SHAPE");
    refused(graph({
      executableFamily: executableFamily({ total: 1 }),
    }), "ASSURANCE-SEMANTIC-COUNT");
    refused(graph({
      executableFamily: executableFamily({
        mjs: [
          "packages-galerina/galerina-core/src/a.mjs",
          "packages-galerina/galerina-core/src/a.mjs",
        ],
      }),
    }), "ASSURANCE-SEMANTIC-DUPLICATE");
  });

  it("keeps a shrink-only legacy baseline visible as unknown", () => {
    const report = accepted(graph({
      legacyUnmapped: {
        baselineCount: 2,
        currentCount: 1,
        pathsDigest: DIGEST,
      },
    }));
    assert.equal(report.verdictTrit, 0);
    refused(graph({
      legacyUnmapped: {
        baselineCount: 2,
        currentCount: 3,
        pathsDigest: DIGEST,
      },
    }), "ASSURANCE-SEMANTIC-BASELINE");
  });

  it("refuses null, surplus fields, invalid build points and ambiguous paths", () => {
    refused(null, "ASSURANCE-SEMANTIC-SHAPE");
    refused({ ...graph(), surplus: true }, "ASSURANCE-SEMANTIC-SHAPE");
    refused(graph({ repositoryHead: "short" }), "ASSURANCE-SEMANTIC-GIT");
    refused(graph({ routes: [route({ sourcePath: "../escape.fungi" })] }), "ASSURANCE-SEMANTIC-PATH");
    refused(graph({ routes: [route({ sourcePath: "packages-galerina/core/src/a.fungi:stream" })] }), "ASSURANCE-SEMANTIC-PATH");
  });

  it("refuses sparse arrays, proxies and accessors without invoking them", () => {
    const sparse = [route()];
    sparse.length = 2;
    refused(graph({ routes: sparse }), "ASSURANCE-SEMANTIC-SHAPE");
    refused(graph({ tests: new Proxy(graph().tests, {}) }), "ASSURANCE-SEMANTIC-SHAPE");

    let getterRan = false;
    const hostile = route();
    Object.defineProperty(hostile, "id", {
      enumerable: true,
      get() {
        getterRan = true;
        return "route:get:/health";
      },
    });
    refused(graph({ routes: [hostile] }), "ASSURANCE-SEMANTIC-SHAPE");
    assert.equal(getterRan, false);
  });
});
