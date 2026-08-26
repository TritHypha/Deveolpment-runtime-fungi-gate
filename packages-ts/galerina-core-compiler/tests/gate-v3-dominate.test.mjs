// gate-v3-dominate.test.mjs — G3 rung 3: dominators from the input frontier,
// and the cut-dominates-egress rule (KTA plan 27, step 3).
//
// THE PROPERTY: 03-phi-redaction's whole security story is visible in its
// shape — there is no wire from the raw read to OUT; the only path to egress
// passes through the cut. This rung turns that prose into a machine-checked
// refusal: a declared cut must DOMINATE egress, so the same circuit plus one
// bypass wire `raw.value -> OUT.value` must refuse.
//
// CONTRACT-DRIVEN, NEVER NAME-DRIVEN: which part is a cut comes from the
// registry's `cut: true` declaration. Recognising the cut by its component
// NAME would be the exact heuristic GD-008 was raised about, on the privacy
// axis. No registry (or no declared cut) = no domination claim either way —
// the pass is silent and the scope is stated, never silently green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  computeDominators,
  verifyCutDominatesEgress,
  loadGateV3Registry,
  dispatchGateSource,
} from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

const phiSource = () => readFileSync(join(EXAMPLES, "03-phi-redaction.gate"), "utf8");
const phiRegistry = () => JSON.parse(readFileSync(join(REGISTRIES, "03-phi-redaction.registry.json"), "utf8"));

function circuitOf(source) {
  const parsed = parseGateV3(source, "<dominate>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}

function loadedRegistry(value) {
  const loaded = loadGateV3Registry(value, "<dominate registry>");
  assert.equal(loaded.ok, true, `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  return loaded.registry;
}

test("dominators: straight-line chain — each node's idom is its predecessor", () => {
  const graph = buildGateGraph(circuitOf(`@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "chain"
  REQUIRES:
  PARTS:
    [a :: t.a@1.0.0]
    [b :: t.b@1.0.0]
  WIRES:
    IN.v -> a.value
    a.value -> b.value
    b.value -> OUT.value
END
`));
  const idom = computeDominators(graph);
  assert.equal(idom.get("a"), "IN");
  assert.equal(idom.get("b"), "a");
  assert.equal(idom.get("OUT"), "b");
  assert.equal(idom.get("IN"), "IN", "the root dominates itself");
});

test("dominators: a diamond — the join's idom is the fork, not either arm", () => {
  const graph = buildGateGraph(circuitOf(`@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "diamond"
  REQUIRES:
  PARTS:
    [fork :: t.f@1.0.0]
    [left :: t.l@1.0.0]
    [right :: t.r@1.0.0]
    [join :: t.j@1.0.0]
  WIRES:
    IN.v -> fork.value
    fork.a -> left.value
    fork.b -> right.value
    left.value -> join.a
    right.value -> join.b
    join.value -> OUT.value
END
`));
  const idom = computeDominators(graph);
  assert.equal(idom.get("join"), "fork", "neither arm dominates the join");
  assert.equal(idom.get("OUT"), "join");
});

test("cut rule: the shipped PHI circuit PASSES — the cut dominates egress", () => {
  const registry = loadedRegistry(phiRegistry());
  const diagnostics = verifyCutDominatesEgress(buildGateGraph(circuitOf(phiSource())), registry);
  assert.deepEqual(diagnostics.map((d) => d.code), []);
});

test("cut rule: the same circuit plus ONE bypass wire REFUSES", () => {
  // The exact construction the plan names: raw.value -> OUT.value added.
  // OUT gains a path that skips the cut, so the cut no longer dominates it.
  const lines = phiSource().split(/\r?\n/);
  const at = lines.findIndex((l) => /view\.value\s*->\s*OUT\.value/.test(l));
  assert.notEqual(at, -1, "fixture must contain the egress wire");
  lines.splice(at, 0, "    raw.value -> OUT.value");
  const registry = loadedRegistry(phiRegistry());
  const codes = verifyCutDominatesEgress(buildGateGraph(circuitOf(lines.join("\n"))), registry).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-002"], "the bypass must be refused by the domination rule");
});

test("cut rule: no declared cut — SILENT, and the silence is scope not approval", () => {
  const registry = phiRegistry();
  for (const component of registry.components) delete component.cut;
  const diagnostics = verifyCutDominatesEgress(buildGateGraph(circuitOf(phiSource())), loadedRegistry(registry));
  assert.deepEqual(diagnostics, [], "no declaration = no obligation to check");
});

test("cut rule: a truthy STRING cut refuses at registry load — GD-011's discipline", () => {
  const registry = phiRegistry();
  registry.components.find((c) => c.id === "galerina.privacy.cut").cut = "true";
  const loaded = loadGateV3Registry(registry, "<string-cut>");
  assert.equal(loaded.ok, false, "a non-Boolean cut must refuse, never read as true");
});

test("cut rule: reachable through the PRODUCTION dispatcher", () => {
  // GD-024's lesson: a pass that exists but is not wired into the entry point
  // is a capability claim, not a capability.
  const lines = phiSource().split(/\r?\n/);
  const at = lines.findIndex((l) => /view\.value\s*->\s*OUT\.value/.test(l));
  lines.splice(at, 0, "    raw.value -> OUT.value");
  const result = dispatchGateSource(lines.join("\n"), "03-bypass.gate", { registry: phiRegistry() });
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-002"), `dispatch must surface the refusal, got: ${codes.join(" ")}`);
});
