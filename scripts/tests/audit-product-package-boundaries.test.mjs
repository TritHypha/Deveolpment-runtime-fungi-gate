import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { evaluateProductPackageBoundaries } from "../audit-product-package-boundaries.mjs";

const HEAD = "a".repeat(40);
const REGISTRY = Object.freeze({
  schema: "product-profiles.v1",
  schemaVersion: 1,
  products: Object.freeze([
    Object.freeze({
      productId: "galerina",
      productClass: "production",
      governanceClass: "zero-trust",
      compatibilityState: "admitted",
      policyId: "galerina-governance-v1",
      policyDigest: `sha256:${"1".repeat(64)}`,
      packageNamespaces: Object.freeze(["@galerina/"]),
      artifactNamespace: "galerina/v1",
    }),
    Object.freeze({
      productId: "trametes",
      productClass: "production",
      governanceClass: "admitted-closed-network",
      compatibilityState: "planned",
      policyId: "trametes-policy-unavailable",
      policyDigest: `sha256:${"2".repeat(64)}`,
      packageNamespaces: Object.freeze([]),
      artifactNamespace: "trametes/planned/v1",
    }),
  ]),
});
const REGISTRY_BYTES = JSON.stringify(REGISTRY);
const REGISTRY_DIGEST = `sha256:${createHash("sha256").update(REGISTRY_BYTES).digest("hex")}`;

function packageNode(name, tags = []) {
  return {
    id: `package:${name}`,
    kind: "Package",
    label: name,
    sourcePath: `packages-ts/${name.replaceAll("@", "").replaceAll("/", "-")}/package.json`,
    tags: ["package", ...tags],
  };
}

function edge(from, to, confidence = "EXTRACTED") {
  return {
    from: `package:${from}`,
    to: `package:${to}`,
    kind: "depends_on",
    confidence,
    evidencePath: "package.json",
  };
}

function run(nodes, edges, receiptOverrides = {}) {
  const graph = {
    version: "fixture.v1",
    generatedAt: "2026-08-26T00:00:00.000Z",
    nodes,
    edges,
  };
  return evaluateProductPackageBoundaries({
    graph,
    graphReceipt: {
      schema: "product-package-graph-input.v1",
      gitHead: HEAD,
      registryDigest: REGISTRY_DIGEST,
      packageCount: nodes.filter((node) => node.kind === "Package").length,
      edgeCount: edges.length,
      skippedFiles: 0,
      truncated: false,
      ...receiptOverrides,
    },
    registryBytes: REGISTRY_BYTES,
    expectedHead: HEAD,
  });
}

test("holds Trametes dependencies on Galerina governance authority", () => {
  const nodes = [
    packageNode("@trametes/analytics", ["product:trametes"]),
    packageNode("@galerina/governance-verifier", ["product:galerina", "authority:governance"]),
  ];
  const result = run(nodes, [edge("@trametes/analytics", "@galerina/governance-verifier")]);
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.findingCodes, ["PRODUCT_BOUNDARY_001"]);
});

test("holds Gate laboratory dependencies on VOK lease issuance", () => {
  const nodes = [
    packageNode("gate-lab-probe", ["product:gate-lab"]),
    packageNode("@galerina/vok-lease-issuer", ["product:galerina", "authority:vok-lease"]),
  ];
  const result = run(nodes, [edge("gate-lab-probe", "@galerina/vok-lease-issuer")]);
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.findingCodes, ["PRODUCT_BOUNDARY_002"]);
});

test("holds research products that depend on admitted production artifacts", () => {
  const nodes = [
    packageNode("research-probe", ["product:research"]),
    packageNode("@galerina/admitted-artifact", ["product:galerina", "artifact:galerina/v1"]),
  ];
  const result = run(nodes, [edge("research-probe", "@galerina/admitted-artifact")]);
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.findingCodes, ["PRODUCT_BOUNDARY_003"]);
});

test("passes Galerina dependencies on shared trit semantics", () => {
  const nodes = [
    packageNode("@galerina/core-compiler", ["product:galerina"]),
    packageNode("@galerina/substrate-math", ["product:shared", "semantics:trit"]),
  ];
  const result = run(nodes, [edge("@galerina/core-compiler", "@galerina/substrate-math")]);
  assert.equal(result.status, "PASS");
  assert.equal(result.authorizing, false);
  assert.equal(result.checkedPackageCount, 2);
  assert.equal(result.checkedEdgeCount, 1);
  assert.deepEqual(result.findingCodes, []);
});

test("classifies canonical unscoped project-graph package locators by closed product prefix", () => {
  const nodes = [packageNode("galerina-core-compiler"), packageNode("galerina-substrate-math")];
  const result = run(nodes, [edge("galerina-core-compiler", "galerina-substrate-math")]);
  assert.equal(result.status, "PASS");
  assert.equal(result.checkedPackageCount, 2);
});

test("refuses incomplete, stale, skipped or truncated graph evidence", () => {
  const node = packageNode("@galerina/core-compiler", ["product:galerina"]);
  const cases = [
    [[], [], {}, "PRODUCT_GRAPH_EMPTY"],
    [[node], [], { gitHead: "b".repeat(40) }, "PRODUCT_GRAPH_STALE"],
    [[node], [], { registryDigest: undefined }, "PRODUCT_REGISTRY_DIGEST_MISSING"],
    [[node], [], { skippedFiles: 1 }, "PRODUCT_GRAPH_SKIPPED_FILES"],
    [[node], [], { truncated: true }, "PRODUCT_GRAPH_TRUNCATED"],
    [[node], [], { packageCount: 2 }, "PRODUCT_GRAPH_COUNT_MISMATCH"],
    [[node], [], { edgeCount: 1 }, "PRODUCT_GRAPH_COUNT_MISMATCH"],
  ];
  for (const [nodes, edges, override, code] of cases) {
    const result = run(nodes, edges, override);
    assert.equal(result.status, "REFUSED", code);
    assert.deepEqual(result.findingCodes, [code]);
  }
});

test("refuses unknown explicit product identities", () => {
  const result = run([packageNode("unknown-probe", ["product:unknown"])], []);
  assert.equal(result.status, "REFUSED");
  assert.deepEqual(result.findingCodes, ["PRODUCT_UNKNOWN"]);
});

test("inferred hostile edges require review and cannot establish PASS", () => {
  const nodes = [
    packageNode("@trametes/analytics", ["product:trametes"]),
    packageNode("@galerina/governance-verifier", ["product:galerina", "authority:governance"]),
  ];
  const result = run(
    nodes,
    [edge("@trametes/analytics", "@galerina/governance-verifier", "INFERRED")],
  );
  assert.equal(result.status, "HOLD");
  assert.deepEqual(result.findingCodes, ["PRODUCT_BOUNDARY_REVIEW_001"]);
});

test("CLI reports a stable refusal when the generated graph is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "product-boundary-missing-"));
  try {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/audit-product-package-boundaries.mjs"), "--check", "--root", root],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 2);
    assert.deepEqual(JSON.parse(result.stdout).findingCodes, ["PRODUCT_GRAPH_MISSING"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
