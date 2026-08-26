// gate-v3-gir-proofs.test.mjs — G6 rung 4 (KTA plan 32 §3).
//
// ★ THE PROPERTY, AND IT IS THE WHOLE RUNG: `missing` is not `satisfied`.
//
// A semantic pass that stays silent because the contract declared NO OBLIGATION
// has proved nothing. Recording that as `satisfied` would put a safety claim in
// the artifact that no pass ever established — the same fabrication as folding
// an empty set to ALLOW, which this language exists to refuse.
//
// So the plan's rung-4 test is: strip a declaration, and the PROOF must
// disappear — not silently stay true. Both halves are asserted here, because
// only the pair is evidence:
//
//   cut declared    -> cut-dominates-egress: satisfied
//   cut removed     -> cut-dominates-egress: MISSING   (never satisfied)
//   zone declared   -> zone-domination: satisfied
//   zone removed    -> zone-domination: MISSING
//   zone violated   -> zone-domination: FAILED         (recorded, not thrown)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  loadGateV3Registry,
  lowerCircuitToGIR,
  circuitProofs,
} from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

const source = () => readFileSync(join(EXAMPLES, "06-analytic-query.gate"), "utf8");
const contract = () => JSON.parse(readFileSync(join(REGISTRIES, "06-analytic-query.registry.json"), "utf8"));

function proofsFor(registryValue = contract(), text = source()) {
  const parsed = parseGateV3(text, "06-analytic-query.gate");
  assert.equal(parsed.ok, true, "fixture must parse");
  const loaded = loadGateV3Registry(registryValue, "<proofs registry>");
  assert.equal(loaded.ok, true, "registry must load");
  const graph = buildGateGraph(parsed.circuit, loaded.registry);
  return {
    proofs: circuitProofs(parsed.circuit, graph, loaded.registry),
    lowered: lowerCircuitToGIR(parsed.circuit, loaded.registry, graph),
  };
}

const statusOf = (proofs, name) => proofs.find((p) => p.name === name)?.status;

test("the shipped circuit earns its proofs", () => {
  const { proofs } = proofsFor();
  assert.equal(statusOf(proofs, "cut-dominates-egress"), "satisfied");
  assert.equal(statusOf(proofs, "taint-cut-separator"), "satisfied");
  assert.equal(statusOf(proofs, "decision-shape"), "satisfied");
  assert.equal(statusOf(proofs, "deny-arm-containment"), "satisfied");
  assert.equal(statusOf(proofs, "zone-domination"), "satisfied");
});

test("★ removing the CUT declaration makes its proof MISSING, never satisfied", () => {
  // The plan's rung-4 test verbatim: strip a declaration and the proof must
  // disappear rather than silently stay true. If this returned "satisfied" the
  // artifact would assert a privacy property nobody checked.
  const uncut = contract();
  delete uncut.components.find((c) => c.id === "galerina.privacy.cut").cut;
  const { proofs } = proofsFor(uncut);

  assert.equal(statusOf(proofs, "cut-dominates-egress"), "missing");
  assert.equal(statusOf(proofs, "taint-cut-separator"), "missing");
  // …and the unrelated proofs are untouched, so this is a targeted change.
  assert.equal(statusOf(proofs, "zone-domination"), "satisfied");
});

test("★ removing the ZONE tag makes its proof MISSING, never satisfied", () => {
  const unzoned = contract();
  unzoned.types.find((t) => t.id === "LivePlan").zone = "opaque";
  const { proofs } = proofsFor(unzoned);

  assert.equal(statusOf(proofs, "zone-domination"), "missing");
  assert.equal(statusOf(proofs, "cut-dominates-egress"), "satisfied", "unrelated proofs must not move");
});

test("★ a VIOLATED obligation records as failed — the lowering does not throw or refuse", () => {
  // The third status, and the reason the lowering is a recorder. SEM-014 owns
  // the refusal; this must carry the verdict into the artifact and return
  // normally, so a consumer sees the failure rather than an exception.
  const ungated = contract();
  delete ungated.components.find((c) => c.id === "tritmesh.ql.gate").zoneGate;
  const { proofs } = proofsFor(ungated);

  assert.equal(statusOf(proofs, "zone-domination"), "failed");
});

test("the proof set is CLOSED and ordered — coverage cannot drift silently", () => {
  // A named set, asserted as a whole. Adding a pass is an edit to PROOFS and to
  // this row together; it can never happen by accident at a call site.
  const { proofs } = proofsFor();
  assert.deepEqual(proofs.map((p) => p.name), [
    "cut-dominates-egress",
    "taint-cut-separator",
    "decision-shape",
    "deny-arm-containment",
    "zone-domination",
  ]);
});

test("proofs appear on the lowered circuit only when a graph is supplied", () => {
  const { lowered } = proofsFor();
  assert.ok(Array.isArray(lowered.proofs), "with a graph, proofs are present");

  const parsed = parseGateV3(source(), "06-analytic-query.gate");
  const loaded = loadGateV3Registry(contract(), "<no-graph>");
  const withoutGraph = lowerCircuitToGIR(parsed.circuit, loaded.registry);
  assert.ok(!("proofs" in withoutGraph),
    "without a graph the field must be ABSENT — an empty array would claim no proof failed");
});
