import test from "node:test";
import assert from "node:assert/strict";
import { validateBoundedClosureReceipt } from "../lib/bounded-closure-receipt.mjs";

const digest = "a".repeat(64);
const requiredGates = ["differential", "physical-slide-vok", "strict-fungi"];
const requiredExclusions = ["full-tooling", "graph-all", "normal-phase-close"];

function receipt() {
  return {
    schema: "zt.bounded-closure.v1",
    sliceId: "slice-30",
    sourceDigest: digest,
    candidateDigest: "b".repeat(64),
    gates: requiredGates.map((name) => ({
      name,
      status: "PASS",
      evidenceDigest: "c".repeat(64),
    })),
    excludedAggregates: [...requiredExclusions],
  };
}

test("an exact, complete bounded receipt is accepted", () => {
  assert.deepEqual(
    validateBoundedClosureReceipt(receipt(), { requiredGates, requiredExclusions }),
    { kind: "accepted", value: receipt() },
  );
});

test("missing, duplicate, failed or surplus gates refuse", () => {
  const cases = [
    { ...receipt(), gates: receipt().gates.slice(1) },
    { ...receipt(), gates: [...receipt().gates, receipt().gates[0]] },
    { ...receipt(), gates: receipt().gates.map((gate, index) => index === 0 ? { ...gate, status: "FAIL" } : gate) },
    { ...receipt(), gates: [...receipt().gates, { name: "invented", status: "PASS", evidenceDigest: digest }] },
  ];
  for (const candidate of cases) {
    assert.equal(validateBoundedClosureReceipt(candidate, { requiredGates, requiredExclusions }).kind, "refused");
  }
});

test("stale shapes, hostile records and hidden exclusions refuse", () => {
  const surplus = { ...receipt(), authorityReleased: true };
  const inherited = Object.create(receipt());
  const accessor = receipt();
  Object.defineProperty(accessor.gates[0], "name", { get: () => "strict-fungi", enumerable: true });
  const hidden = { ...receipt(), excludedAggregates: requiredExclusions.slice(1) };
  for (const candidate of [surplus, inherited, accessor, hidden]) {
    assert.equal(validateBoundedClosureReceipt(candidate, { requiredGates, requiredExclusions }).kind, "refused");
  }
});
