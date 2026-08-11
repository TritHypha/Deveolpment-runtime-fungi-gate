import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  deriveCadenceCoverage,
  discoverTooling,
} from "../lib/tooling-inventory.mjs";
import { validateAssuranceManifest } from "../lib/assurance-fabric/manifest.mjs";

const roots = [];
after(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

function write(root, relativePath, contents = "process.exit(0);\n") {
  const path = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "transitive-inventory-"));
  roots.push(root);
  write(root, "galerina.workspace.json", "{\"packages\":[]}\n");
  return root;
}

function entry(id, script, overrides = {}) {
  const requirementId = `REQ-${id.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
  return {
    id,
    requirementId,
    satisfies: [requirementId],
    execution: { kind: "process", command: ["node", script] },
    acceptedExitCodes: [0],
    leasePolicy: "none",
    cwd: ".",
    toolClass: "analyzer",
    authorityClass: "blocking",
    cadences: ["normal"],
    outcomePolicy: "blocking",
    subjects: { kind: "requirements", values: [requirementId], expectedCount: 1 },
    timeoutMs: 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    nestedTools: [],
    mutationPolicy: "read-only",
    platforms: [process.platform],
    selfTest: { kind: "absent", reason: "fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "canonical",
      retirement: "active",
      evidence: { kind: "absent", reason: "active" },
    },
    ...overrides,
  };
}

function accepted(root, entries) {
  const result = validateAssuranceManifest({ schemaVersion: 1, entries }, root);
  assert.equal(result.kind, "accepted", result.detail);
  return result.value;
}

function policy(overrides = {}) {
  return { schemaVersion: 1, packageNoTest: {}, toolExceptions: {}, generators: {}, ...overrides };
}

test("one manifest orchestrator gives its declared children exact transitive cadence custody", () => {
  const root = fixture();
  write(root, "scripts/graph-all.mjs");
  write(root, "scripts/package-graph-generator.mjs");
  write(root, "scripts/gen-assurance-semantic-graph.mjs");
  const manifest = accepted(root, [entry("graph:all", "scripts/graph-all.mjs", {
    nestedTools: [
      "scripts/package-graph-generator.mjs",
      "scripts/gen-assurance-semantic-graph.mjs",
    ],
  })]);

  const result = deriveCadenceCoverage(discoverTooling(root), manifest, policy());

  assert.equal(result.kind, "accepted");
  const packageGraph = result.records.find((record) => record.tool === "package-graph-generator.mjs");
  assert.deepEqual(packageGraph.directEntryIds, []);
  assert.deepEqual(packageGraph.transitiveEntryIds, ["graph:all"]);
  assert.deepEqual(packageGraph.via, [["graph:all", "graph-all.mjs", "package-graph-generator.mjs"]]);
  assert.deepEqual(packageGraph.cadences, ["normal"]);
  assert.equal(packageGraph.disposition, "scheduled");
});

test("missing nested tools and uncovered audits refuse instead of disappearing", () => {
  const missingRoot = fixture();
  write(missingRoot, "scripts/graph-all.mjs");
  const missing = deriveCadenceCoverage(
    discoverTooling(missingRoot),
    accepted(missingRoot, [entry("graph:all", "scripts/graph-all.mjs", {
      nestedTools: ["scripts/missing-child.mjs"],
    })]),
    policy(),
  );
  assert.equal(missing.kind, "refused");
  assert.match(missing.detail, /missing-child/);

  const uncoveredRoot = fixture();
  write(uncoveredRoot, "scripts/run-phase-close.mjs");
  write(uncoveredRoot, "scripts/audit-uncovered.mjs");
  const uncovered = deriveCadenceCoverage(
    discoverTooling(uncoveredRoot),
    accepted(uncoveredRoot, [entry("runner", "scripts/run-phase-close.mjs")]),
    policy(),
  );
  assert.equal(uncovered.kind, "accepted");
  assert.ok(uncovered.violations.some((item) =>
    item.code === "TOOLING-AUDIT-UNCOVERED" && item.subject === "audit-uncovered.mjs"));
});

test("active legacy controls publish a non-empty independent consumer record", () => {
  const root = fixture();
  write(root, "scripts/audit-wat-lowering.mjs");
  const manifest = accepted(root, [entry("wat-lowering", "scripts/audit-wat-lowering.mjs", {
    toolClass: "legacy-oracle",
    authorityClass: "legacy-oracle",
    outcomePolicy: "legacy-exit",
  })]);

  const result = deriveCadenceCoverage(discoverTooling(root), manifest, policy());

  assert.equal(result.kind, "accepted");
  assert.deepEqual(result.legacyConsumers, [{ controlId: "wat-lowering", consumerIds: ["wat-lowering"] }]);
  assert.equal(result.records.find((record) => record.tool === "audit-wat-lowering.mjs").disposition, "legacy-active");
});
