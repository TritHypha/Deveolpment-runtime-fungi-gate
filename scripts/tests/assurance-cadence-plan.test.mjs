import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { buildCadencePlan } from "../lib/assurance-fabric/cadence-plan.mjs";
import { validateAssuranceManifest } from "../lib/assurance-fabric/manifest.mjs";

const root = mkdtempSync(join(tmpdir(), "galerina-cadence-plan-"));
after(() => rmSync(root, { recursive: true, force: true }));

function entry(id, subjects, cadences = ["normal", "exhaustive"], overrides = {}) {
  return {
    id,
    requirementId: "REQ-PACKAGE-TESTS",
    satisfies: ["REQ-PACKAGE-TESTS"],
    execution: { kind: "process", command: ["node", `${id}.mjs`] },
    cwd: ".",
    toolClass: "test-runner",
    authorityClass: "blocking",
    cadences,
    outcomePolicy: "blocking",
    subjects: { kind: "packages", values: subjects, expectedCount: subjects.length },
    timeoutMs: 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    mutationPolicy: "read-only",
    platforms: [process.platform],
    selfTest: { kind: "absent", reason: "covered by negative package fixtures" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "canonical",
      retirement: "active",
    },
    ...overrides,
  };
}

function accepted(entries) {
  const result = validateAssuranceManifest({ schemaVersion: 1, entries }, root);
  assert.equal(result.kind, "accepted", result.detail);
  return result.value;
}

test("exhaustive package coverage executes the unique dominating runner once", () => {
  const result = buildCadencePlan(accepted([
    entry("tests-core", ["compiler", "core"]),
    entry("tests-all", ["compiler", "core", "cli"], ["exhaustive"]),
  ]), { cadence: "exhaustive", platform: process.platform });

  assert.equal(result.kind, "accepted");
  assert.deepEqual(result.value.entries.map((item) => item.id), ["tests-all"]);
  assert.deepEqual(result.value.discharged, [
    {
      requirementId: "REQ-PACKAGE-TESTS",
      subjectId: "compiler",
      executorId: "tests-all",
      overlappedEntryIds: ["tests-core"],
    },
    {
      requirementId: "REQ-PACKAGE-TESTS",
      subjectId: "core",
      executorId: "tests-all",
      overlappedEntryIds: ["tests-core"],
    },
  ]);
  assert.equal(result.value.authorizing, false);
});

test("a supposed stronger runner that omits one subject cannot erase the weaker runner", () => {
  const result = buildCadencePlan(accepted([
    entry("tests-core", ["compiler", "core"]),
    entry("tests-all", ["core", "cli"], ["exhaustive"]),
  ]), { cadence: "exhaustive", platform: process.platform });

  assert.equal(result.kind, "refused");
  assert.equal(result.code, "ASSURANCE-CADENCE-OVERLAP");
});

test("receipt verification is planned after its predecessor without a second process", () => {
  const graph = entry("graph-all", ["graph"], ["normal"], {
    requirementId: "REQ-GRAPH",
    satisfies: ["REQ-GRAPH"],
    subjects: { kind: "requirements", values: ["REQ-GRAPH"], expectedCount: 1 },
    toolClass: "generator",
  });
  const receipt = entry("semantic-coverage", ["semantic"], ["normal"], {
    requirementId: "REQ-SEMANTIC",
    satisfies: ["REQ-SEMANTIC"],
    subjects: { kind: "requirements", values: ["REQ-SEMANTIC"], expectedCount: 1 },
    toolClass: "verifier",
    execution: {
      kind: "predecessor-receipt",
      predecessorId: "graph-all",
      verifierId: "graph-all-semantic-v1",
    },
    predecessors: ["graph-all"],
  });
  const result = buildCadencePlan(accepted([receipt, graph]), {
    cadence: "normal",
    platform: process.platform,
  });

  assert.equal(result.kind, "accepted");
  assert.deepEqual(result.value.entries.map((item) => item.id), ["graph-all", "semantic-coverage"]);
  assert.equal(result.value.entries[1].execution.kind, "predecessor-receipt");
});

test("incomparable entries with one command identity refuse duplicate execution", () => {
  const sameExecution = { kind: "process", command: ["node", "shared.mjs"] };
  const result = buildCadencePlan(accepted([
    entry("left", ["a"], ["normal"], { execution: sameExecution }),
    entry("right", ["b"], ["normal"], { execution: sameExecution }),
  ]), { cadence: "normal", platform: process.platform });

  assert.equal(result.kind, "refused");
  assert.equal(result.code, "ASSURANCE-CADENCE-DUPLICATE-EXECUTION");
});

test("an inapplicable platform is explicit refusal rather than an empty green plan", () => {
  const otherPlatform = process.platform === "win32" ? "linux" : "win32";
  const result = buildCadencePlan(accepted([
    entry("platform", ["subject"], ["normal"], { platforms: [otherPlatform] }),
  ]), { cadence: "normal", platform: process.platform });

  assert.equal(result.kind, "refused");
  assert.equal(result.code, "ASSURANCE-CADENCE-PLATFORM");
});
