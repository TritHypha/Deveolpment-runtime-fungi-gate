// gate-v3-gir-lowering.test.mjs — G6 rung 2 (KTA plan 32 §3).
//
// THE RUNG: a circuit's GIR identity must depend on what the circuit IS, and on
// nothing else. Two consequences, and the tests exist for both:
//
//   - reordering the PARTS block is a COSMETIC edit and must not move the hash.
//     If it did, every artifact keyed on girHash would move when someone
//     alphabetised a list, and nobody would trust the hash again.
//   - changing a WIRE is a real edit and MUST move it. The topology is the
//     artifact — that is the whole claim `.gate` makes.
//
// Also proven here: the lowering RECORDS the effect envelope and does not
// re-check it. An undeclared observed effect lowers with status "violation" and
// produces no diagnostic, because GATE-SEM-009/010 owns that refusal. Two
// checkers for one property drift, and the drift is silent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseGateV3, loadGateV3Registry, lowerCircuitToGIR } from "../dist/index.js";
import { computeGIRHash } from "../dist/gir-emitter.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

const source = () => readFileSync(join(EXAMPLES, "06-analytic-query.gate"), "utf8");
const contract = () => JSON.parse(readFileSync(join(REGISTRIES, "06-analytic-query.registry.json"), "utf8"));

function lower(text = source(), registryValue = contract()) {
  const parsed = parseGateV3(text, "06-analytic-query.gate");
  assert.equal(parsed.ok, true,
    `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  const loaded = loadGateV3Registry(registryValue, "<lowering registry>");
  assert.equal(loaded.ok, true, "registry must load");
  return lowerCircuitToGIR(parsed.circuit, loaded.registry);
}

/** Hash a lone circuit the way a program carrying it would. */
const hashOf = (circuit) => computeGIRHash({
  schemaVersion: "fungi.gir.v1",
  generatedAt: "1970-01-01T00:00:00.000Z",
  entryPoints: [],
  flows: [],
  circuits: [circuit],
});

/** Swap two adjacent lines inside the PARTS block — a purely cosmetic edit. */
function reorderParts(text) {
  const lines = text.split(/\r?\n/);
  const first = lines.findIndex((l) => /^\s*\[scan ::/.test(l));
  assert.ok(first > 0, "the fixture must contain the scan part");
  const swapped = [...lines];
  [swapped[first], swapped[first + 1]] = [swapped[first + 1], swapped[first]];
  assert.notEqual(swapped.join("\n"), text, "the reorder must actually change the source");
  return swapped.join("\n");
}

test("the shipped circuit lowers, and lowers identically twice", () => {
  const once = lower();
  assert.equal(once.name, "daily_trip_maximum");
  assert.ok(once.parts.includes("gate") && once.parts.includes("execute"));
  assert.equal(hashOf(once), hashOf(lower()), "lowering must be deterministic");
});

test("★ reordering the PARTS block does NOT move the hash — declaration order is not identity", () => {
  assert.equal(hashOf(lower()), hashOf(lower(reorderParts(source()))),
    "a cosmetic reorder must be inert, or the hash cannot be trusted");
});

test("★ changing a WIRE moves the hash — the topology IS the artifact", () => {
  // The control that makes the test above meaningful. If a reorder is inert
  // because the lowering ignores structure entirely, this must still fail.
  const rewired = source().replace("cut.value -> OUT.value", "execute.value -> OUT.value");
  assert.notEqual(rewired, source(), "the rewire must actually change the source");
  assert.notEqual(hashOf(lower()), hashOf(lower(rewired)),
    "a different topology must be a different artifact");
});

test("parts and wires are emitted in canonical order, not source order", () => {
  const circuit = lower();
  assert.deepEqual([...circuit.parts].sort(), circuit.parts, "parts must already be sorted");
  assert.deepEqual([...circuit.wires].sort(), circuit.wires, "wires must already be sorted");
});

test("the effect envelope is RECORDED, declared covering observed", () => {
  const circuit = lower();
  assert.deepEqual(circuit.effects.declared, ["audit.write", "database.read"]);
  assert.deepEqual(circuit.effects.observed, ["audit.write", "database.read"]);
  assert.equal(circuit.effects.status, "compliant");
  assert.deepEqual(circuit.capabilities, ["trips.aggregate"]);
});

test("★ an undeclared observed effect lowers as a VIOLATION, and is not re-refused here", () => {
  // The lowering records; GATE-SEM-009/010 refuses. Give a part an effect the
  // circuit never declared and the artifact must say so — without this module
  // growing an opinion about it.
  const mutated = contract();
  mutated.components.find((c) => c.id === "tritmesh.ql.scan").effects = ["network.outbound"];
  const circuit = lower(source(), mutated);

  assert.equal(circuit.effects.status, "violation");
  assert.ok(circuit.effects.observed.includes("network.outbound"),
    "the observed set must carry the undeclared effect rather than hide it");
  assert.ok(!circuit.effects.declared.includes("network.outbound"),
    "and must not quietly add it to declared — that would launder the violation");
});

test("proofs are ABSENT, not empty — rung 4 has not run", () => {
  // An empty array reads as 'no proof failed', which is a safety claim this
  // rung has not earned. Absence reads as 'nobody asked', which is the truth.
  assert.ok(!("proofs" in lower()), "proofs must be omitted until they are computed");
});
