import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  REGISTRY_ACTIVATION_BOUNDARIES,
  REGISTRY_ACTIVATION_FAULT_MODEL_VERSION,
  exploreRegistryActivationFaultMatrix,
  isProductionAdmittedRegistryGeneration,
  simulateRegistryActivation,
} from "../dist/index.js";

const PRIOR = "1".repeat(64);
const CANDIDATE = "2".repeat(64);
const SIMULATOR_DIGEST = `sha256:${"3".repeat(64)}`;
const ADAPTER_DIGEST = `sha256:${"4".repeat(64)}`;
const SOURCE_DIGEST = `sha256:${"5".repeat(64)}`;

function options(overrides = {}) {
  return {
    seed: "registry-simulator-seed-001",
    simulatorDigest: SIMULATOR_DIGEST,
    adapterDigest: ADAPTER_DIGEST,
    sourceDigest: SOURCE_DIGEST,
    priorGenerationId: PRIOR,
    candidateGenerationId: CANDIDATE,
    exploredBudget: 64,
    canaryVerdict: "allow",
    faults: [],
    ...overrides,
  };
}

describe("registry activation deterministic simulator", () => {
  it("selects only the verified candidate on the complete control schedule", async () => {
    const first = await simulateRegistryActivation(options());
    const replay = await simulateRegistryActivation(options());

    assert.equal(first.schema, "galerina-registry-activation-replay/v1");
    assert.equal(
      first.faultModelVersion,
      REGISTRY_ACTIVATION_FAULT_MODEL_VERSION,
    );
    assert.equal(first.terminalState, "NEW_COMPLETE");
    assert.equal(first.authorityGenerationId, CANDIDATE);
    assert.equal(first.complete, true);
    assert.equal(first.invariant, "OLD_COMPLETE_OR_NEW_COMPLETE_NEVER_MIXED");
    assert.equal(first.receiptDigest, replay.receiptDigest);
    assert.deepEqual(first.executedBoundaries, replay.executedBoundaries);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.executedBoundaries), true);
  });

  it("binds every replay-relevant input into the receipt digest", async () => {
    const base = await simulateRegistryActivation(options());
    const changedSeed = await simulateRegistryActivation(options({
      seed: "registry-simulator-seed-002",
    }));
    const changedAdapter = await simulateRegistryActivation(options({
      adapterDigest: `sha256:${"6".repeat(64)}`,
    }));
    const changedSource = await simulateRegistryActivation(options({
      sourceDigest: `sha256:${"7".repeat(64)}`,
    }));

    assert.notEqual(base.receiptDigest, changedSeed.receiptDigest);
    assert.notEqual(base.receiptDigest, changedAdapter.receiptDigest);
    assert.notEqual(base.receiptDigest, changedSource.receiptDigest);
  });

  it("keeps prior authority for every pre-acceptance crash-before boundary", async () => {
    const acceptance = REGISTRY_ACTIVATION_BOUNDARIES.indexOf(
      "acceptance-checkpoint",
    );
    assert.ok(acceptance > 0);
    for (
      const boundary of REGISTRY_ACTIVATION_BOUNDARIES
        .slice(0, acceptance + 1)
        .filter((candidate) => candidate !== "fallback")
    ) {
      const receipt = await simulateRegistryActivation(options({
        faults: [{ boundary, kind: "crash-before" }],
      }));
      assert.equal(receipt.terminalState, "PRIOR_COMPLETE", boundary);
      assert.equal(receipt.authorityGenerationId, PRIOR, boundary);
      assert.equal(receipt.complete, true, boundary);
    }
  });

  it("retains new authority after an accepted checkpoint crash", async () => {
    const receipt = await simulateRegistryActivation(options({
      faults: [{
        boundary: "acceptance-checkpoint",
        kind: "crash-after",
      }],
    }));
    assert.equal(receipt.terminalState, "NEW_COMPLETE");
    assert.equal(receipt.authorityGenerationId, CANDIDATE);
    assert.equal(receipt.complete, true);
  });

  it("falls back to prior authority after an explicit canary denial", async () => {
    const receipt = await simulateRegistryActivation(options({
      canaryVerdict: "deny",
    }));
    assert.equal(receipt.terminalState, "PRIOR_COMPLETE");
    assert.equal(receipt.authorityGenerationId, PRIOR);
    assert.equal(receipt.executedBoundaries.includes("fallback"), true);
    assert.equal(receipt.executedBoundaries.includes("acceptance-checkpoint"), false);
  });

  it("marks a failed fallback indeterminate and grants no authority", async () => {
    const receipt = await simulateRegistryActivation(options({
      canaryVerdict: "indeterminate",
      faults: [{ boundary: "fallback", kind: "refuse" }],
    }));
    assert.equal(receipt.terminalState, "INDETERMINATE");
    assert.equal(receipt.authorityGenerationId, null);
    assert.equal(receipt.complete, false);
  });

  it("marks an exhausted exploration budget indeterminate", async () => {
    const receipt = await simulateRegistryActivation(options({
      exploredBudget: 2,
    }));
    assert.equal(receipt.terminalState, "INDETERMINATE");
    assert.equal(receipt.authorityGenerationId, null);
    assert.equal(receipt.complete, false);
    assert.equal(receipt.reason, "EXPLORATION_BUDGET_EXHAUSTED");
  });

  it("refuses malformed, ambiguous, duplicate, and unreachable schedules", async () => {
    await assert.rejects(() => simulateRegistryActivation(options({
      seed: "",
    })));
    await assert.rejects(() => simulateRegistryActivation(options({
      candidateGenerationId: PRIOR,
    })));
    await assert.rejects(() => simulateRegistryActivation(options({
      adapterDigest: "sha256:not-a-digest",
    })));
    await assert.rejects(() => simulateRegistryActivation({
      ...options(),
      unboundAuthorityHint: "candidate",
    }));
    const accessorOptions = options();
    Object.defineProperty(accessorOptions, "seed", {
      enumerable: true,
      get: () => "registry-simulator-seed-accessor",
    });
    await assert.rejects(() => simulateRegistryActivation(accessorOptions));
    await assert.rejects(() => simulateRegistryActivation(options({
      faults: [
        { boundary: "write", kind: "short-write" },
        { boundary: "write", kind: "crash-after" },
      ],
    })));
    await assert.rejects(() => simulateRegistryActivation(options({
      faults: [{ boundary: "drain", kind: "short-write" }],
    })));
    await assert.rejects(() => simulateRegistryActivation(options({
      canaryVerdict: "allow",
      faults: [{ boundary: "fallback", kind: "refuse" }],
    })));
  });

  it("never lets corruption, short write, collision, refusal, or reordering authorize", async () => {
    const cases = [
      { boundary: "write", kind: "short-write" },
      { boundary: "publish", kind: "collision" },
      { boundary: "verify", kind: "corrupt" },
      { boundary: "directory-flush", kind: "refuse" },
      { boundary: "publication-order", kind: "reorder" },
    ];
    for (const fault of cases) {
      const receipt = await simulateRegistryActivation(options({
        faults: [fault],
      }));
      assert.notEqual(receipt.terminalState, "NEW_COMPLETE", JSON.stringify(fault));
      assert.notEqual(receipt.authorityGenerationId, CANDIDATE, JSON.stringify(fault));
    }
  });

  it("executes a non-vacuous deterministic matrix with every boundary covered", async () => {
    const first = await exploreRegistryActivationFaultMatrix(options());
    const replay = await exploreRegistryActivationFaultMatrix(options());
    const changedSeed = await exploreRegistryActivationFaultMatrix(options({
      seed: "registry-simulator-seed-002",
    }));

    assert.equal(first.complete, true);
    assert.equal(first.control.terminalState, "NEW_COMPLETE");
    assert.equal(first.plantedFaultsExecuted > 0, true);
    assert.deepEqual(first.coveredBoundaries, REGISTRY_ACTIVATION_BOUNDARIES);
    assert.equal(first.mixedAuthorityOutcomes, 0);
    assert.equal(first.matrixDigest, replay.matrixDigest);
    assert.deepEqual(first.scenarioOrder, replay.scenarioOrder);
    assert.notDeepEqual(first.scenarioOrder, changedSeed.scenarioOrder);
    assert.equal(
      first.receipts.every((receipt) =>
        receipt.terminalState === "PRIOR_COMPLETE"
        || receipt.terminalState === "NEW_COMPLETE"
        || receipt.terminalState === "INDETERMINATE"),
      true,
    );
  });

  it("cannot be confused with a production persistence receipt", async () => {
    const receipt = await simulateRegistryActivation(options());
    assert.equal(isProductionAdmittedRegistryGeneration(receipt), false);
    assert.equal(
      isProductionAdmittedRegistryGeneration({
        ...receipt,
        durabilityAdapterDigest: ADAPTER_DIGEST,
      }),
      false,
    );
  });
});
