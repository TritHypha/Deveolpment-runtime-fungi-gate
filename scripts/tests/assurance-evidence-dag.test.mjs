import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateEvidenceDag,
  isEvidenceDagReport,
} from "../lib/assurance-fabric/evidence-dag.mjs";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const HEAD = "d".repeat(40);

function externalInput(kind = "absent") {
  return kind === "present"
    ? { kind: "present", digest: SHA_C }
    : { kind: "absent", reason: "no external input" };
}

function node(id, localTrit = 1, overrides = {}) {
  return {
    id,
    kind: "generated",
    subjectDigest: SHA_A,
    toolDigest: SHA_B,
    repositoryHead: HEAD,
    workingTreeClass: "CLEAN",
    externalInput: externalInput(),
    evidencePath: `build/${id}/report.json`,
    localTrit,
    ...overrides,
  };
}

function edge(from, to, type = "DERIVED_FROM") {
  return { from, to, type };
}

function graph({ nodes, edges = [], overrides = {} }) {
  return {
    schemaVersion: 1,
    repositoryHead: HEAD,
    nodes,
    edges,
    ...overrides,
  };
}

function accepted(input) {
  const result = evaluateEvidenceDag(input);
  assert.equal(result.kind, "accepted", JSON.stringify(result));
  return result.value;
}

function refused(input, code) {
  const result = evaluateEvidenceDag(input);
  assert.equal(result.kind, "refused", JSON.stringify(result));
  assert.equal(result.code, code);
  assert.equal(typeof result.detail, "string");
  assert.ok(result.detail.length > 0);
}

describe("closed assurance evidence DAG", () => {
  it("brands and freezes an exact current root without releasing authority", () => {
    const report = accepted(graph({ nodes: [node("roadmap")] }));

    assert.equal(isEvidenceDagReport(report), true);
    assert.equal(isEvidenceDagReport({ ...report }), false);
    assert.equal(report.verdictTrit, 1);
    assert.equal(report.authorizing, false);
    assert.deepEqual(report.roots, ["roadmap"]);
    assert.equal(report.nodes[0].effectiveTrit, 1);
    assert.equal(Object.isFrozen(report), true);
    assert.equal(Object.isFrozen(report.nodes), true);
    assert.equal(Object.isFrozen(report.nodes[0]), true);
  });

  it("propagates stale predecessor state to every dependent root", () => {
    const report = accepted(graph({
      nodes: [node("graph", 0), node("roadmap", 1)],
      edges: [edge("roadmap", "graph")],
    }));

    assert.equal(report.nodes.find((item) => item.id === "graph").effectiveTrit, 0);
    assert.equal(report.nodes.find((item) => item.id === "roadmap").effectiveTrit, 0);
    assert.equal(report.verdictTrit, 0);
    assert.deepEqual(report.roots, ["roadmap"]);
  });

  it("propagates deny ahead of unknown across every admitted edge kind", () => {
    const edgeTypes = [
      "DERIVED_FROM",
      "CHECKED_BY",
      "TESTS",
      "PRODUCES",
      "BLOCKS",
      "SUPERSEDES",
      "REPLACES",
    ];
    const predecessors = edgeTypes.map((type, index) => node(`n${index}`, index === 0 ? -1 : 0));
    const report = accepted(graph({
      nodes: [...predecessors, node("root")],
      edges: edgeTypes.map((type, index) => edge("root", `n${index}`, type)),
    }));

    assert.equal(report.verdictTrit, -1);
    assert.equal(report.nodes.find((item) => item.id === "root").effectiveTrit, -1);
  });

  it("takes the minimum across independent terminal roots", () => {
    const report = accepted(graph({ nodes: [node("current"), node("unknown", 0)] }));
    assert.deepEqual(report.roots, ["current", "unknown"]);
    assert.equal(report.verdictTrit, 0);
  });

  it("admits an exact external-input digest without conflating it with absence", () => {
    const report = accepted(graph({
      nodes: [node("kb", 1, {
        kind: "external",
        workingTreeClass: "EXTERNAL_INPUT",
        externalInput: externalInput("present"),
      })],
    }));
    assert.deepEqual(report.nodes[0].externalInput, { kind: "present", digest: SHA_C });
  });

  it("refuses dependency cycles, unknown endpoints, duplicates and rootless graphs", () => {
    refused(graph({
      nodes: [node("a"), node("b")],
      edges: [edge("a", "b"), edge("b", "a")],
    }), "ASSURANCE-DAG-CYCLE");
    refused(graph({ nodes: [node("a")], edges: [edge("a", "missing")] }), "ASSURANCE-DAG-ENDPOINT");
    refused(graph({ nodes: [node("a"), node("a")] }), "ASSURANCE-DAG-DUPLICATE");
    refused(graph({ nodes: [node("a"), node("b")], edges: [edge("a", "b"), edge("a", "b")] }), "ASSURANCE-DAG-DUPLICATE");
    refused(graph({ nodes: [] }), "ASSURANCE-DAG-SHAPE");
  });

  it("refuses null, non-finite state, invalid identities, paths and surplus fields", () => {
    refused(null, "ASSURANCE-DAG-SHAPE");
    refused(graph({ nodes: [node("a", Number.NaN)] }), "ASSURANCE-DAG-TRIT");
    refused(graph({ nodes: [node("a", 1, { subjectDigest: "short" })] }), "ASSURANCE-DAG-DIGEST");
    refused(graph({ nodes: [node("a", 1, { repositoryHead: "short" })] }), "ASSURANCE-DAG-GIT");
    refused(graph({ nodes: [node("a", 1, { evidencePath: "../escape" })] }), "ASSURANCE-DAG-PATH");
    refused({ ...graph({ nodes: [node("a")] }), surplus: true }, "ASSURANCE-DAG-SHAPE");
    refused(graph({ nodes: [{ ...node("a"), surplus: true }] }), "ASSURANCE-DAG-SHAPE");
    refused(graph({ nodes: [node("a")], edges: [{ ...edge("a", "a"), surplus: true }] }), "ASSURANCE-DAG-SHAPE");
  });

  it("refuses sparse arrays, proxies and accessors without invoking hostile code", () => {
    const sparse = [node("a")];
    sparse.length = 2;
    refused(graph({ nodes: sparse }), "ASSURANCE-DAG-SHAPE");

    refused(graph({ nodes: new Proxy([node("a")], {}) }), "ASSURANCE-DAG-SHAPE");

    let getterRan = false;
    const hostile = node("a");
    Object.defineProperty(hostile, "id", {
      enumerable: true,
      get() {
        getterRan = true;
        return "a";
      },
    });
    refused(graph({ nodes: [hostile] }), "ASSURANCE-DAG-SHAPE");
    assert.equal(getterRan, false);
  });

  it("refuses ambiguous external-input tags and cross-build node identities", () => {
    refused(graph({ nodes: [node("a", 1, { externalInput: { kind: "absent", reason: "x", digest: SHA_C } })] }), "ASSURANCE-DAG-SHAPE");
    refused(graph({ nodes: [node("a", 1, { externalInput: { kind: "present", digest: SHA_C, reason: "x" } })] }), "ASSURANCE-DAG-SHAPE");
    refused(graph({ nodes: [node("a", 1, { repositoryHead: "e".repeat(40) })] }), "ASSURANCE-DAG-BUILD-POINT");
  });

  it("refuses authority-positive state that contradicts its evidence class", () => {
    refused(graph({
      nodes: [node("dirty", 1, { workingTreeClass: "DIRTY_UNADMITTED" })],
    }), "ASSURANCE-DAG-CONTRADICTION");
    refused(graph({
      nodes: [node("external", 1, {
        kind: "external",
        workingTreeClass: "EXTERNAL_INPUT",
        externalInput: externalInput(),
      })],
    }), "ASSURANCE-DAG-CONTRADICTION");
  });
});
