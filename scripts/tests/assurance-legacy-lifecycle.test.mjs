import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { evaluateLegacyLifecycle } from "../lib/assurance-fabric/legacy-lifecycle.mjs";
import { validateAssuranceManifest } from "../lib/assurance-fabric/manifest.mjs";

const root = mkdtempSync(join(tmpdir(), "galerina-legacy-lifecycle-"));
after(() => rmSync(root, { recursive: true, force: true }));

function lifecycleEntry(id, overrides = {}) {
  return {
    id,
    requirementId: `REQ-${id.toUpperCase()}`,
    satisfies: [`REQ-${id.toUpperCase()}`],
    execution: { kind: "process", command: ["node", `${id}.mjs`] },
    acceptedExitCodes: [0],
    leasePolicy: "none",
    cwd: ".",
    toolClass: "legacy-oracle",
    authorityClass: "legacy-oracle",
    cadences: ["normal", "nightly", "exhaustive", "release"],
    outcomePolicy: "legacy-exit",
    subjects: { kind: "requirements", values: [`REQ-${id.toUpperCase()}`], expectedCount: 1 },
    timeoutMs: 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    nestedTools: [],
    mutationPolicy: "read-only",
    platforms: [process.platform],
    selfTest: { kind: "present", command: ["node", `${id}.mjs`, "--self-test"], plantedDefectId: `DEFECT-${id}` },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "live bootstrap/differential consumer remains" },
      overlap: "canonical",
      retirement: "active",
      evidence: { kind: "absent", reason: "zero-consumer proof is absent" },
    },
    ...overrides,
  };
}

function replacementEntry() {
  return {
    ...lifecycleEntry("successor"),
    toolClass: "verifier",
    authorityClass: "blocking",
    outcomePolicy: "blocking",
  };
}

function accepted(entries) {
  const result = validateAssuranceManifest({ schemaVersion: 1, entries }, root);
  assert.equal(result.kind, "accepted", result.detail);
  return result.value;
}

function presentEvidence(overrides = {}) {
  return {
    kind: "present",
    consumerCount: 0,
    successorId: "successor",
    invariantIds: ["INV-LEGACY"],
    negativeTestIds: ["TEST-NEG"],
    mutationTestIds: ["TEST-MUT"],
    replacesEdgeId: "EDGE-REPLACES",
    retirementGateId: "GATE-RETIREMENT",
    historicalEvidenceId: "HISTORY-LEGACY",
    ...overrides,
  };
}

function retiredControl(evidence = presentEvidence()) {
  return lifecycleEntry("wat", {
    lifecycle: {
      replacementId: { kind: "present", value: "successor" },
      overlap: "replacement-candidate",
      retirement: "retired",
      evidence,
    },
  });
}

function facts(overrides = {}) {
  return {
    toolInventory: {
      legacyConsumers: [{ controlId: "wat", consumerIds: [] }],
    },
    semanticGraph: {
      nodes: [
        { id: "INV-LEGACY", kind: "requirement" },
        { id: "TEST-NEG", kind: "test", testClass: "negative-refusal" },
        { id: "TEST-MUT", kind: "test", testClass: "mutation" },
      ],
      edges: [{ id: "EDGE-REPLACES", type: "REPLACES", from: "successor", to: "wat" }],
    },
    retirementReport: { terminalReady: true },
    evidenceDag: {
      nodes: [
        { id: "GATE-RETIREMENT", state: "CURRENT_NON_AUTHORIZING", authorizing: false },
        { id: "HISTORY-LEGACY", state: "HISTORICAL", authorizing: false },
      ],
    },
    ...overrides,
  };
}

function evaluate(entries, overrides = {}) {
  return evaluateLegacyLifecycle({
    manifest: accepted(entries),
    ...facts(overrides),
  });
}

test("WAT, Wasm and DSS remain explicit active non-authorizing controls", () => {
  const result = evaluate([
    lifecycleEntry("wat"),
    lifecycleEntry("wasm"),
    lifecycleEntry("dss"),
  ], {
    toolInventory: {
      legacyConsumers: [
        { controlId: "wat", consumerIds: ["compiler-bootstrap"] },
        { controlId: "wasm", consumerIds: ["differential-oracle"] },
        { controlId: "dss", consumerIds: ["sandbox-oracle"] },
      ],
    },
  });

  assert.equal(result.kind, "accepted");
  assert.deepEqual(result.controls.map((item) => item.state), [
    "ACTIVE_LEGACY",
    "ACTIVE_LEGACY",
    "ACTIVE_LEGACY",
  ]);
  assert.equal(result.authorizing, false);
});

test("retirement refuses while any independently indexed consumer remains", () => {
  const result = evaluate([retiredControl(), replacementEntry()], {
    toolInventory: {
      legacyConsumers: [{ controlId: "wat", consumerIds: ["compiler-bootstrap"] }],
    },
  });
  assert.equal(result.kind, "refused");
  assert.equal(result.code, "ASSURANCE-LEGACY-CONSUMERS");
});

test("retirement refuses every missing replacement proof independently", () => {
  const cases = [
    {
      code: "ASSURANCE-LEGACY-SUCCESSOR",
      entries: [retiredControl()],
    },
    {
      code: "ASSURANCE-LEGACY-INVARIANTS",
      entries: [retiredControl(presentEvidence({ invariantIds: ["MISSING"] })), replacementEntry()],
    },
    {
      code: "ASSURANCE-LEGACY-NEGATIVE",
      entries: [retiredControl(presentEvidence({ negativeTestIds: ["MISSING"] })), replacementEntry()],
    },
    {
      code: "ASSURANCE-LEGACY-MUTATION",
      entries: [retiredControl(presentEvidence({ mutationTestIds: ["MISSING"] })), replacementEntry()],
    },
    {
      code: "ASSURANCE-LEGACY-REPLACES",
      entries: [retiredControl(presentEvidence({ replacesEdgeId: "MISSING" })), replacementEntry()],
    },
    {
      code: "ASSURANCE-LEGACY-GATE",
      entries: [retiredControl(presentEvidence({ retirementGateId: "MISSING" })), replacementEntry()],
    },
    {
      code: "ASSURANCE-LEGACY-HISTORY",
      entries: [retiredControl(presentEvidence({ historicalEvidenceId: "MISSING" })), replacementEntry()],
    },
  ];

  for (const item of cases) {
    const result = evaluate(item.entries);
    assert.equal(result.kind, "refused", item.code);
    assert.equal(result.code, item.code);
  }
});

test("complete exact replacement evidence remains non-authorizing", () => {
  const result = evaluate([retiredControl(), replacementEntry()]);
  assert.equal(result.kind, "accepted");
  assert.equal(result.controls[0].state, "RETIRED_WITH_EXACT_REPLACEMENT");
  assert.equal(result.authorizing, false);
});

test("hostile root objects and sparse consumer arrays refuse without invoking accessors", () => {
  let getterRan = false;
  const hostile = {
    toolInventory: { legacyConsumers: [] },
    semanticGraph: { nodes: [], edges: [] },
    retirementReport: { terminalReady: false },
    evidenceDag: { nodes: [] },
  };
  Object.defineProperty(hostile, "manifest", {
    enumerable: true,
    get() {
      getterRan = true;
      return accepted([lifecycleEntry("wat")]);
    },
  });
  const accessor = evaluateLegacyLifecycle(hostile);
  assert.equal(accessor.kind, "refused");
  assert.equal(getterRan, false);

  const proxy = evaluateLegacyLifecycle(new Proxy({
    manifest: accepted([lifecycleEntry("wat")]),
    ...facts(),
  }, {}));
  assert.equal(proxy.kind, "refused");

  const sparse = [];
  sparse.length = 1;
  const sparseResult = evaluate([lifecycleEntry("wat")], {
    toolInventory: { legacyConsumers: sparse },
  });
  assert.equal(sparseResult.kind, "refused");
});
