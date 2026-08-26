// gate-v3-budget.test.mjs — G3 rung 8: tropical budget composition, deny-side
// only (KTA plan 27, step 8; RD-0215's distinction is the design).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  composeWorstCaseBudgets,
  verifyBudgetComposition,
  dispatchGateSource,
} from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");

function circuitOf(source) {
  const parsed = parseGateV3(source, "<budget>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}

/** Two hops annotated 30 and 40, one unannotated: worst case to OUT = 70. */
const WEIGHTED = (ceiling) => `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "budget fixture"
  REQUIRES:
    budget hops=${ceiling}
  PARTS:
    [a :: t.a@1.0.0]
    [b :: t.b@1.0.0]
  WIRES:
    IN.v -> a.value budget=30
    a.value -> b.value budget=40
    b.value -> OUT.value
END
`;

test("budget: the hand-computed composition — 30 + 40 along the chain is 70 at OUT", () => {
  const worst = composeWorstCaseBudgets(buildGateGraph(circuitOf(WEIGHTED(100))));
  assert.equal(worst.get("a"), 30);
  assert.equal(worst.get("b"), 70);
  assert.equal(worst.get("OUT"), 70);
  assert.equal(worst.get("IN"), 0);
});

test("budget: worst case is MAX over paths — the expensive branch decides", () => {
  // Fork: cheap branch (5) and expensive branch (60) converge on OUT. min-plus
  // would report 5 and flatter the drawing; the ceiling must see 60. This row
  // is the semiring choice as an executable fact.
  const source = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "fork"
  REQUIRES:
    budget hops=50
  PARTS:
    [cheap :: t.c@1.0.0]
    [dear :: t.d@1.0.0]
    [merge :: t.m@1.0.0]
  WIRES:
    IN.v -> cheap.value budget=5
    IN.v -> dear.value budget=60
    cheap.value -> merge.a
    dear.value -> merge.b
    merge.value -> OUT.value
END
`;
  const graph = buildGateGraph(circuitOf(source));
  assert.equal(composeWorstCaseBudgets(graph).get("OUT"), 60, "max-plus: the dear branch decides");
  const codes = verifyBudgetComposition(circuitOf(source), graph).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-006"], "60 > hops=50 must refuse even though a 5-cost path exists");
});

test("budget: within the ceiling — SILENT, and silence is the ONLY success output", () => {
  // Deny-side only: no diagnostic, no admission artifact, nothing to consume.
  const circuit = circuitOf(WEIGHTED(100));
  assert.deepEqual(verifyBudgetComposition(circuit, buildGateGraph(circuit)), []);
});

test("budget: one past the composed cost REFUSES at the exact boundary", () => {
  const at = circuitOf(WEIGHTED(70));
  assert.deepEqual(verifyBudgetComposition(at, buildGateGraph(at)), [], "70 <= 70 holds");
  const over = circuitOf(WEIGHTED(69));
  const codes = verifyBudgetComposition(over, buildGateGraph(over)).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-006"], "70 > 69 refuses");
});

test("budget: no declared REQUIRES budget — no ceiling, no obligation, silent", () => {
  const source = WEIGHTED(100).replace(/\n    budget hops=100/, "");
  const circuit = circuitOf(source);
  assert.deepEqual(verifyBudgetComposition(circuit, buildGateGraph(circuit)), []);
});

test("budget: the shipped bounded-scan example composes to 0 extra hops and stays green", () => {
  // 04 declares hops=64; its wires carry no budget annotations (the paging
  // bound lives INSIDE the component contract as max_hops), so the composed
  // wire cost is 0 — the plan's hand result, matched here.
  const source = readFileSync(join(EXAMPLES, "04-tenant-scoped-search.gate"), "utf8");
  const circuit = circuitOf(source);
  const graph = buildGateGraph(circuit);
  const worst = composeWorstCaseBudgets(graph);
  assert.equal(worst.get("OUT"), 0);
  assert.deepEqual(verifyBudgetComposition(circuit, graph), []);
});

test("budget: reachable through the PRODUCTION dispatcher, registry-free", () => {
  // The pass reads only the drawing (REQUIRES + wire annotations), so it must
  // fire with NO registry supplied — a drawing-tier obligation.
  const result = dispatchGateSource(WEIGHTED(69), "<budget>.gate", {});
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-006"), `dispatch must surface the refusal, got: ${codes.join(" ")}`);
});
