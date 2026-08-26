// gate-v3-construction.test.mjs — G3 rung 7: the construction axis becomes a
// guard (KTA plan 27, step 7; closes GD-025).
//
// GD-025's finding: `construction` is validated at registry load and read by
// NOTHING — occurrence count 0 in every resolution rule. Same family as GD-010
// and GD-011: a field that looks like a guard but is never read is not a
// guard. This suite proves the field is now read, at the one place it is
// enforceable: a non-source type must not arrive as a circuit parameter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseGateV3, loadGateV3Registry, verifyConstructionEntry, dispatchGateSource } from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

function circuitOf(source) {
  const parsed = parseGateV3(source, "<construction>.gate");
  assert.equal(parsed.ok, true, `fixture must parse: ${parsed.ok ? "" : parsed.diagnostics.map((d) => d.code).join(" ")}`);
  return parsed.circuit;
}

function loadedRegistry(value) {
  const loaded = loadGateV3Registry(value, "<construction registry>");
  assert.equal(loaded.ok, true, `registry must load: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  return loaded.registry;
}

const SOURCE = `@gate 3.0.0
CIRCUIT probe(v: Minted) -> Minted
  INTENT "construction probe"
  REQUIRES:
  PARTS:
    [e :: test.echo@1.0.0]
  WIRES:
    IN.v -> e.value
    e.value -> OUT.value
END
`;

const registryWith = (construction) => ({
  version: "1.0.0",
  types: [{ id: "Minted", kind: "opaque", construction }],
  components: [{
    id: "test.echo", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "value", type: "Minted" }],
    outputs: [{ name: "value", type: "Minted" }],
    arguments: [], effects: [], capabilities: []
  }]
});

test("construction: a canonical-only type as circuit parameter REFUSES", () => {
  const codes = verifyConstructionEntry(circuitOf(SOURCE), loadedRegistry(registryWith("canonical-only"))).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-005"]);
});

test("construction: a verified-measurement-only type as parameter REFUSES", () => {
  const codes = verifyConstructionEntry(circuitOf(SOURCE), loadedRegistry(registryWith("verified-measurement-only"))).map((d) => d.code);
  assert.deepEqual(codes, ["GATE-SEM-005"]);
});

test("construction: a source type as parameter is SILENT — that is what source means", () => {
  assert.deepEqual(verifyConstructionEntry(circuitOf(SOURCE), loadedRegistry(registryWith("source"))), []);
});

test("construction: canonical-only as RETURN is sound — produced inside by its constructor", () => {
  // The shipped PHI example is exactly this shape: PatientView is
  // canonical-only, produced by the cut, returned on OUT — and its parameters
  // are all source. The rule must leave it untouched.
  const source = readFileSync(join(EXAMPLES, "03-phi-redaction.gate"), "utf8");
  const registry = JSON.parse(readFileSync(join(REGISTRIES, "03-phi-redaction.registry.json"), "utf8"));
  const view = registry.types.find((t) => t.id === "PatientView");
  assert.equal(view.construction, "canonical-only", "the fixture's return type is the minted class");
  const diagnostics = verifyConstructionEntry(circuitOf(source), loadedRegistry(registry));
  assert.deepEqual(diagnostics, []);
});

test("construction: a type ABSENT from the catalogue is not judged here", () => {
  // RESOLVE-108/109 owns unknown types; inventing a construction verdict for
  // an unknown type would be manufacturing a fact.
  const registry = registryWith("canonical-only");
  registry.types = [{ id: "Other", kind: "opaque", construction: "source" }];
  registry.components[0].inputs[0].type = "Other";
  registry.components[0].outputs[0].type = "Other";
  const diagnostics = verifyConstructionEntry(circuitOf(SOURCE), loadedRegistry(registry));
  assert.deepEqual(diagnostics, [], "unknown-type refusals belong to resolution, not this rule");
});

test("construction: reachable through the PRODUCTION dispatcher", () => {
  const result = dispatchGateSource(SOURCE, "<construction>.gate", { registry: registryWith("canonical-only") });
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-SEM-005"), `dispatch must surface the refusal, got: ${codes.join(" ")}`);
});
