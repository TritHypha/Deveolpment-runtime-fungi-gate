// gate-v3-registry.test.mjs — Round two G2 steps 1-2: the registry LOADER.
//
// The registry is the authority on what a part IS. A loader that accepts a
// malformed contract poisons every check downstream, so every entry is
// validated BEFORE normalization and a boundary exception never escapes as a
// host error. Vectors come from executed review findings (GD-011, GD-013).
//
// Tests-first: written before the loader, red then green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGateV3Registry, GATE_V3_REGISTRY_CODES } from "../dist/index.js";

const DIGEST = `sha256:${"a".repeat(64)}`;
const base = () => ({
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "test.echo",
    version: "1.0.0",
    status: "SHIPPED",
    implementationDigest: DIGEST,
    inputs: [{ name: "value", type: "T" }],
    outputs: [{ name: "value", type: "T", copyable: true }],
    arguments: [],
    effects: [],
    capabilities: [],
  }],
});
const codesOf = (r) => r.diagnostics.map((d) => d.code);
const load = (mutate) => { const v = base(); mutate?.(v); return loadGateV3Registry(v, "<registry>"); };

test("registry: a well-formed registry loads with zero diagnostics", () => {
  const r = load();
  assert.deepEqual(codesOf(r), []);
  assert.ok(r.registry, "a registry is produced");
  assert.match(r.registry.digest, /^sha256:[a-f0-9]{64}$/, "content digest computed");
});

test("registry: shape violations refuse (version, components, types)", () => {
  assert.ok(codesOf(loadGateV3Registry([], "<r>")).includes(GATE_V3_REGISTRY_CODES.REGISTRY_001.code), "non-object");
  assert.ok(codesOf(load((v) => { v.version = "2.0.0"; })).includes(GATE_V3_REGISTRY_CODES.REGISTRY_002.code));
  assert.ok(codesOf(load((v) => { v.components = {}; })).includes(GATE_V3_REGISTRY_CODES.REGISTRY_003.code));
  assert.ok(codesOf(load((v) => { v.types = {}; })).includes(GATE_V3_REGISTRY_CODES.REGISTRY_007.code));
});

test("registry: GD-013a — a null argument entry REFUSES, never throws", () => {
  // The reference lets `arguments: [null]` escape as an uncaught TypeError.
  let result;
  assert.doesNotThrow(() => { result = load((v) => { v.components[0].arguments = [null]; }); },
    "a malformed entry must not escape as a host exception");
  assert.equal(result.registry, null, "no registry is produced from a malformed contract");
  assert.ok(codesOf(result).includes(GATE_V3_REGISTRY_CODES.REGISTRY_011.code));
});

test("registry: GD-013b — duplicate argument names REFUSE (never last-write-wins)", () => {
  const r = load((v) => {
    v.components[0].arguments = [
      { name: "mode", type: "String", required: true },
      { name: "mode", type: "Int" },
    ];
  });
  assert.equal(r.registry, null, "a contract with a duplicate declaration is not admissible");
  assert.ok(codesOf(r).includes(GATE_V3_REGISTRY_CODES.REGISTRY_012.code));
});

test("registry: duplicate port names REFUSE on inputs and outputs alike", () => {
  assert.ok(codesOf(load((v) => { v.components[0].inputs.push({ name: "value", type: "T" }); }))
    .includes(GATE_V3_REGISTRY_CODES.REGISTRY_012.code));
  assert.ok(codesOf(load((v) => { v.components[0].outputs.push({ name: "value", type: "T" }); }))
    .includes(GATE_V3_REGISTRY_CODES.REGISTRY_012.code));
});

test("registry: GD-011 — copyable must be Boolean or absent; every other spelling REFUSES", () => {
  for (const bad of ["false", "true", 0, 1, null, "yes"]) {
    const r = load((v) => { v.components[0].outputs[0].copyable = bad; });
    assert.equal(r.registry, null, `copyable=${JSON.stringify(bad)} must refuse`);
    assert.ok(codesOf(r).includes(GATE_V3_REGISTRY_CODES.REGISTRY_013.code), JSON.stringify(bad));
  }
  // absent is legal and means NON-copyable (fail-closed default)
  const absent = load((v) => { delete v.components[0].outputs[0].copyable; });
  assert.deepEqual(codesOf(absent), []);
  assert.equal(absent.registry.components.get("test.echo@1.0.0").outputs.get("value").copyable, false,
    "an unmarked output is NON-copyable by default");
});

test("registry: duplicate components and bad identity REFUSE", () => {
  assert.ok(codesOf(load((v) => { v.components.push({ ...v.components[0] }); }))
    .includes(GATE_V3_REGISTRY_CODES.REGISTRY_004.code));
  assert.ok(codesOf(load((v) => { v.components[0].implementationDigest = "sha256:short"; }))
    .includes(GATE_V3_REGISTRY_CODES.REGISTRY_006.code));
  assert.ok(codesOf(load((v) => { v.components[0].version = "1.0"; }))
    .includes(GATE_V3_REGISTRY_CODES.REGISTRY_006.code));
});

test("registry: a declared digest that does not match the content REFUSES", () => {
  const r = load((v) => { v.digest = `sha256:${"0".repeat(64)}`; });
  assert.equal(r.registry, null);
  assert.ok(codesOf(r).includes(GATE_V3_REGISTRY_CODES.REGISTRY_005.code));
});

test("registry: surplus/unknown fields on a component REFUSE (closed schema)", () => {
  const r = load((v) => { v.components[0].backdoor = true; });
  assert.equal(r.registry, null, "a closed schema rejects what it does not declare");
  assert.ok(codesOf(r).includes(GATE_V3_REGISTRY_CODES.REGISTRY_014.code));
});
