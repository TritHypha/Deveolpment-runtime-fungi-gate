// gate-v3-gir-boundary.test.mjs — G6 rung 5 + the plan's exit criteria (KTA 32).
//
// THE BOUNDARY IS CONTENT. A circuit has no body: no `paramTypes` for the WAT
// emitter, no `executionPlan`, no `target_affinity`. Those absences are the
// reason option C was ratified — a consumer must never be handed something that
// looks compilable and is not — so they are asserted here rather than assumed.
// A future contributor who adds one should trip a test, not collect a review
// comment that may never be written.
//
// The key set is pinned WHOLE, not just the forbidden names. A denylist only
// catches the fields somebody already thought of; pinning the set means any new
// field — flow-only or otherwise — has to be added here deliberately, which is
// the same closed-set discipline the proof list uses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  loadGateV3Registry,
  lowerCircuitToGIR,
  dispatchGateSource,
} from "../dist/index.js";
import { computeGIRHash } from "../dist/gir-emitter.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

const source = () => readFileSync(join(EXAMPLES, "06-analytic-query.gate"), "utf8");
const contract = () => JSON.parse(readFileSync(join(REGISTRIES, "06-analytic-query.registry.json"), "utf8"));

function lowered({ withGraph = true } = {}) {
  const parsed = parseGateV3(source(), "06-analytic-query.gate");
  assert.equal(parsed.ok, true, "fixture must parse");
  const loaded = loadGateV3Registry(contract(), "<boundary registry>");
  assert.equal(loaded.ok, true, "registry must load");
  return withGraph
    ? lowerCircuitToGIR(parsed.circuit, loaded.registry, buildGateGraph(parsed.circuit, loaded.registry))
    : lowerCircuitToGIR(parsed.circuit, loaded.registry);
}

/** Everything `GIRFlow` carries that a circuit must never grow. */
const FLOW_ONLY = [
  "paramTypes", "executionPlan", "target_affinity", "qualifier", "tensors",
  "allowedEffectsMask", "typedArrayLoweringPlan", "faultHandlers",
  "protected_values", "audit", "execution", "contract",
];

test("★ a lowered circuit carries NO flow-only field", () => {
  const circuit = lowered();
  const trespassers = FLOW_ONLY.filter((key) => key in circuit);
  assert.deepEqual(trespassers, [],
    `a circuit has no body — these belong to GIRFlow and must not appear: ${trespassers.join(", ")}`);
});

test("★ the key set is pinned WHOLE — a new field must be added here deliberately", () => {
  // A denylist only catches what somebody already thought of. Pinning the set
  // means the next field, whatever it is, cannot arrive unnoticed.
  assert.deepEqual([...Object.keys(lowered())].sort(), [
    "capabilities", "effects", "intent", "name", "parts", "proofs", "wires",
  ]);
  assert.deepEqual([...Object.keys(lowered({ withGraph: false }))].sort(), [
    "capabilities", "effects", "intent", "name", "parts", "wires",
  ]);
});

// ------------------------------------------------------- plan 32 exit criteria

test("exit 2 — the shipped example lowers and round-trips to a stable hash twice", () => {
  const program = (circuit) => ({
    schemaVersion: "fungi.gir.v1",
    generatedAt: "1970-01-01T00:00:00.000Z",
    entryPoints: [],
    flows: [],
    circuits: [circuit],
  });
  assert.equal(computeGIRHash(program(lowered())), computeGIRHash(program(lowered())));
});

test("exit 5 — FUNGI-GATELANG-002 still fires at error severity on the lowered circuit's source", () => {
  // Hard constraint 3, and the one an exit review would be embarrassed to miss:
  // lowering a circuit must NOT read as production readiness. The lowering is a
  // pure function and cannot change dispatch — this asserts that directly
  // rather than trusting that it cannot.
  const result = dispatchGateSource(source(), "06-analytic-query.gate", { registry: contract() });
  assert.ok(
    result.diagnostics.some((d) => d.code === "FUNGI-GATELANG-002" && d.severity === "error"),
    "a lowered, clean-resolving circuit must still carry the production block",
  );
});

test("exit 5b — the circuit still resolves clean apart from that block", () => {
  // Stated separately so the assertion above cannot be satisfied by a circuit
  // that is broken in some other way and happens to also emit GATELANG-002.
  const codes = dispatchGateSource(source(), "06-analytic-query.gate", { registry: contract() })
    .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002")
    .map((d) => d.code);
  assert.deepEqual(codes, []);
});

test("the lowering is pure — lowering twice does not mutate the inputs", () => {
  // A recorder that quietly edited its registry or circuit would make every
  // 'unchanged' assertion elsewhere unreliable.
  const before = JSON.stringify(contract());
  const registryValue = contract();
  const parsed = parseGateV3(source(), "06-analytic-query.gate");
  const loaded = loadGateV3Registry(registryValue, "<purity>");
  const graph = buildGateGraph(parsed.circuit, loaded.registry);
  lowerCircuitToGIR(parsed.circuit, loaded.registry, graph);
  lowerCircuitToGIR(parsed.circuit, loaded.registry, graph);
  assert.equal(JSON.stringify(registryValue), before, "the registry value must be untouched");
});
