// gate-v3-separator.test.mjs — G3 rung 4: the taint-cut separator (KTA plan 27,
// step 4; RD-0229 proof 2, triple-proven with RD-0168 and RD-0231 V2).
//
// THE HOUSE-PROVEN CORRECTION THIS RUNG IMPLEMENTS: naive node-BFS
// unreachability is WRONG for privacy. Asking "is egress reachable from the
// tainted source?" flags the SANITIZED path too — the path that passes
// through the cut is reachable, and correct. The right question is: with
// every declared cut REMOVED, does taint still reach egress? If yes, a bypass
// exists; if no, every tainted path is cut. The KAT demonstrates the naive
// check false-flagging the shipped PHI example, then shows the separator
// giving the correct verdict BOTH ways.
//
// Rung 3 (domination) and this rung overlap on single-cut circuits but differ
// on multi-cut ones: no single cut need dominate egress if the SET of cuts
// collectively separates taint from it. The separator is the set-level truth;
// domination is the stronger single-point guarantee.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseGateV3,
  buildGateGraph,
  verifyTaintCutSeparator,
  loadGateV3Registry,
  dispatchGateSource,
} from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

const phiSource = () => readFileSync(join(EXAMPLES, "03-phi-redaction.gate"), "utf8");
const phiRegistry = () => JSON.parse(readFileSync(join(REGISTRIES, "03-phi-redaction.registry.json"), "utf8"));

function circuitOf(source) {
  const parsed = parseGateV3(source, "<separator>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}

function loadedRegistry(value) {
  const loaded = loadGateV3Registry(value, "<separator registry>");
  assert.equal(loaded.ok, true, "registry must load");
  return loaded.registry;
}

/** The NAIVE check RD-0229 refutes, reproduced here as the negative control:
 *  plain reachability from a source node to OUT, cuts left in place. */
function naiveNodeBfsReaches(graph, fromNode) {
  const successors = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) successors.get(e.from.node)?.push(e.to.node);
  const seen = new Set([fromNode]);
  const queue = [fromNode];
  while (queue.length > 0) {
    for (const next of successors.get(queue.shift()) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen.has("OUT");
}

test("separator: node-BFS FALSE-FLAGS the shipped sanitized circuit — the refuted check, shown refuted", () => {
  // On 03, egress IS reachable from the raw read — through the cut, which is
  // the sanctioned path. A checker built on this question would refuse every
  // correctly-sanitized circuit ever drawn. This is RD-0229's exact point.
  const graph = buildGateGraph(circuitOf(phiSource()));
  assert.equal(naiveNodeBfsReaches(graph, "raw"), true, "the naive check flags the SANITIZED path");
});

test("separator: the shipped sanitized circuit PASSES the cut-removal check", () => {
  const diagnostics = verifyTaintCutSeparator(buildGateGraph(circuitOf(phiSource())), loadedRegistry(phiRegistry()));
  assert.deepEqual(diagnostics.map((d) => d.code), [], "removing the cut disconnects taint from egress");
});

test("separator: the bypass wire REFUSES — taint reaches egress with the cut removed", () => {
  const lines = phiSource().split(/\r?\n/);
  const at = lines.findIndex((l) => /view\.value\s*->\s*OUT\.value/.test(l));
  lines.splice(at, 0, "    raw.value -> OUT.value");
  const codes = verifyTaintCutSeparator(buildGateGraph(circuitOf(lines.join("\n"))), loadedRegistry(phiRegistry())).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-003"]);
});

test("separator: multi-cut set separation — no SINGLE cut dominates, the SET separates, and that PASSES", () => {
  // Two parallel branches, each with its own cut, converging on OUT. Neither
  // cut dominates OUT (the other branch bypasses it), so a domination-only
  // rule would refuse a correctly-sanitized drawing. The separator asks the
  // set-level question and passes it — this row is why rung 4 exists beyond
  // rung 3.
  const source = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "two branches, two cuts"
  REQUIRES:
  PARTS:
    [srcA :: t.read@1.0.0]
    [srcB :: t.read@1.0.0]
    [cutA :: t.cut@1.0.0]
    [cutB :: t.cut@1.0.0]
    [merge :: t.merge@1.0.0]
  WIRES:
    IN.v -> srcA.value
    IN.v -> srcB.value
    srcA.value -> cutA.value
    srcB.value -> cutB.value
    cutA.value -> merge.a
    cutB.value -> merge.b
    merge.value -> OUT.value
END
`;
  const registry = {
    version: "1.0.0",
    types: [{ id: "T", kind: "opaque", construction: "source" }],
    components: [
      { id: "t.read", version: "1.0.0", status: "SHIPPED", implementationDigest: `sha256:${"a".repeat(64)}`,
        inputs: [{ name: "value", type: "T" }], outputs: [{ name: "value", type: "T" }], arguments: [], effects: [], capabilities: [] },
      { id: "t.cut", version: "1.0.0", status: "SHIPPED", implementationDigest: `sha256:${"b".repeat(64)}`, cut: true,
        inputs: [{ name: "value", type: "T" }], outputs: [{ name: "value", type: "T" }], arguments: [], effects: [], capabilities: [] },
      { id: "t.merge", version: "1.0.0", status: "SHIPPED", implementationDigest: `sha256:${"c".repeat(64)}`,
        inputs: [{ name: "a", type: "T" }, { name: "b", type: "T" }], outputs: [{ name: "value", type: "T" }], arguments: [], effects: [], capabilities: [] },
    ],
  };
  const graph = buildGateGraph(circuitOf(source));
  const diagnostics = verifyTaintCutSeparator(graph, loadedRegistry(registry));
  assert.deepEqual(diagnostics.map((d) => d.code), [], "the cut SET separates even though no single cut dominates");
});

test("separator: no declared cut — silent scope, not approval", () => {
  const registry = phiRegistry();
  for (const component of registry.components) delete component.cut;
  const diagnostics = verifyTaintCutSeparator(buildGateGraph(circuitOf(phiSource())), loadedRegistry(registry));
  assert.deepEqual(diagnostics, []);
});

test("separator: reachable through the PRODUCTION dispatcher", () => {
  const lines = phiSource().split(/\r?\n/);
  const at = lines.findIndex((l) => /view\.value\s*->\s*OUT\.value/.test(l));
  lines.splice(at, 0, "    raw.value -> OUT.value");
  const result = dispatchGateSource(lines.join("\n"), "03-bypass.gate", { registry: phiRegistry() });
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-003"), `dispatch must surface the separator refusal, got: ${codes.join(" ")}`);
});
