// gate-v3-registry-closed.test.mjs — GD-029: the registry schema is closed at
// the TOP level too, not only at the four nested levels.
//
// GD-029 was recorded at LOW and explicitly labelled NOT a fail-open, because
// that was measured rather than assumed: a misspelled `components` is caught by
// REGISTRY-003's required-key check and a misspelled `types` by GD-010's
// empty-catalogue refusal. Those two rows are kept here — the fix must not be
// justified by a danger that does not exist, and a future reader should find
// the measurement rather than have to re-run it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadGateV3Registry, dispatchGateSource } from "../dist/index.js";

const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");
const base = () => JSON.parse(readFileSync(join(REGISTRIES, "01-authorized-read.registry.json"), "utf8"));

const load = (mutate) => {
  const registry = base();
  mutate(registry);
  return loadGateV3Registry(registry, "<closed>");
};

test("closed: the shipped fixtures still load — closing a schema must not break what it governs", () => {
  for (const name of ["01-authorized-read", "02-write-transaction", "03-phi-redaction", "04-tenant-scoped-search", "05-token-verify"]) {
    const registry = JSON.parse(readFileSync(join(REGISTRIES, `${name}.registry.json`), "utf8"));
    const loaded = loadGateV3Registry(registry, name);
    assert.equal(loaded.ok, true, `${name}: ${loaded.ok ? "" : loaded.diagnostics.map((d) => d.code).join(" ")}`);
  }
});

test("closed: the reference registry's effects/capabilities catalogues are ADMITTED", () => {
  // This loader does not consult them — the envelope is checked against
  // component contracts, not a name catalogue — but they are legitimate
  // registry content and must not be refused as surplus.
  const loaded = load((r) => { r.effects = ["database.read"]; r.capabilities = ["customer.read"]; });
  assert.equal(loaded.ok, true, "known top-level catalogues must load");
});

test("closed: an unknown TOP-LEVEL key now refuses, naming itself", () => {
  const loaded = load((r) => { r.surprise = "hello"; });
  assert.equal(loaded.ok, false);
  const hit = loaded.diagnostics.find((d) => d.code === "GATE-REGISTRY-014");
  assert.ok(hit, `expected REGISTRY-014, got ${loaded.diagnostics.map((d) => d.code).join(" ")}`);
  assert.match(hit.message, /surprise/, "the refusal must name the offending key");
});

test("closed: a MISSPELLED key refuses as unknown — and its consequence is still caught", () => {
  // The measurement GD-029 recorded, kept executable. Before this fix the
  // typo was silently accepted and only its CONSEQUENCE refused; now both the
  // cause and the consequence are reported, which is strictly more useful.
  const misspelled = load((r) => { r.componets = r.components; delete r.components; });
  assert.equal(misspelled.ok, false);
  const codes = misspelled.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-REGISTRY-014"), "the typo itself is now named");
  assert.ok(codes.includes("GATE-REGISTRY-003"), "the missing required key is STILL caught — the pre-existing guard holds");
});

test("closed: nested levels are unchanged — component, type, port, argument", () => {
  for (const [label, mutate] of [
    ["component", (r) => { r.components[0].surprise = 1; }],
    ["type", (r) => { r.types[0].surprise = 1; }],
    ["port", (r) => { r.components[0].inputs[0].surprise = 1; }],
    ["argument", (r) => { r.components[0].arguments[0].surprise = 1; }],
  ]) {
    const loaded = load(mutate);
    assert.equal(loaded.ok, false, `${label} surplus key must still refuse`);
    assert.ok(loaded.diagnostics.some((d) => d.code === "GATE-REGISTRY-014"), label);
  }
});

test("closed: reachable through the PRODUCTION dispatcher", () => {
  const registry = base();
  registry.surprise = "hello";
  const source = readFileSync(resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate", "01-authorized-read.gate"), "utf8");
  const codes = dispatchGateSource(source, "01.gate", { registry }).diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-REGISTRY-014"), `dispatch must surface it, got: ${codes.join(" ")}`);
});
