// gate-v3-variants.test.mjs — GD-028 Option B, owner-ratified: per-use
// registered variants. The decision record pre-specified this KAT; every case
// here is one of its numbered closure conditions.
//
// THE SHAPE: `.gate` wire typing is exact nominal equality with no generics,
// so one implementation used at several payload types registers one contract
// PER USE-TYPE. `variantOf` names the family; "one implementation" is a
// CHECKED claim — every member of a family must carry the identical
// implementationDigest (GATE-REGISTRY-016) — and variants must never become a
// conversion side-channel (WIRE-101 still refuses across them).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseGateV3, loadGateV3Registry, dispatchGateSource } from "../dist/index.js";

const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const REGISTRIES = resolve(import.meta.dirname, "fixtures", "gate-registries");

const registryOf = (name) => JSON.parse(readFileSync(join(REGISTRIES, `${name}.registry.json`), "utf8"));
const sourceOf = (name) => readFileSync(join(EXAMPLES, `${name}.gate`), "utf8");

test("variants: closure #1 — 04 and 05 resolve CLEAN through the production dispatcher", () => {
  for (const name of ["04-tenant-scoped-search", "05-token-verify"]) {
    const result = dispatchGateSource(sourceOf(name), `${name}.gate`, { registry: registryOf(name) });
    const errors = result.diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002");
    assert.deepEqual(errors.map((d) => `${d.code}: ${d.message.slice(0, 60)}`), [], `${name} must resolve`);
  }
});

test("variants: closure #3 — a family with MISMATCHED implementationDigests refuses at load", () => {
  const registry = registryOf("04-tenant-scoped-search");
  const tenant = registry.components.find((c) => c.id === "galerina.tower.authorize.tenant");
  tenant.implementationDigest = `sha256:${"9".repeat(64)}`;   // claims the family, differs in implementation
  const loaded = loadGateV3Registry(registry, "<mismatch>");
  assert.equal(loaded.ok, false, "two implementations wearing one family name must refuse");
  assert.ok(loaded.diagnostics.some((d) => d.code === "GATE-REGISTRY-016"),
    `expected REGISTRY-016, got ${loaded.diagnostics.map((d) => d.code).join(" ")}`);
});

test("variants: closure #4 — WIRE-101 still refuses across variants (no conversion side-channel)", () => {
  // Rewire 04 so one authorize variant's output feeds a port typed for a
  // DIFFERENT variant's payload: tenant.allow (TenantGrant) into
  // safe.evidence (EgressGrant). Same family, different nominal types — the
  // wall must hold exactly as between unrelated types.
  const lines = sourceOf("04-tenant-scoped-search").split(/\r?\n/);
  const at = lines.findIndex((l) => /egress\.allow\s*->\s*safe\.evidence/.test(l));
  assert.notEqual(at, -1, "fixture must contain the egress evidence wire");
  lines[at] = "    tenant.allow -> safe.evidence";
  // tenant.allow now has two consumers; its contract does not declare
  // copyable, so WIRE-102 may fire too — the assertion is only that WIRE-101
  // does, which is the side-channel question.
  const parsed = parseGateV3(lines.join("\n"), "<cross-variant>.gate");
  assert.equal(parsed.ok, true);
  const result = dispatchGateSource(lines.join("\n"), "<cross-variant>.gate", { registry: registryOf("04-tenant-scoped-search") });
  const codes = result.diagnostics.map((d) => d.code);
  assert.ok(codes.includes("GATE-WIRE-101"), `cross-variant wiring must type-refuse, got: ${codes.join(" ")}`);
});

test("variants: a family name colliding with a REGISTERED component id refuses", () => {
  const registry = registryOf("04-tenant-scoped-search");
  // Register a concrete component whose id IS the family name.
  registry.components.push({
    id: "galerina.tower.authorize", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "subject", type: "CallerId", required: true }],
    outputs: [{ name: "allow", type: "AuthzGrant" }],
    arguments: [], effects: [], capabilities: []
  });
  const loaded = loadGateV3Registry(registry, "<collision>");
  assert.equal(loaded.ok, false, "a variant of a concrete component would make dispatch ambiguous");
  assert.ok(loaded.diagnostics.some((d) => d.code === "GATE-REGISTRY-016"));
});

test("variants: a malformed variantOf refuses", () => {
  const registry = registryOf("05-token-verify");
  registry.components.find((c) => c.id === "galerina.privacy.cut.token").variantOf = "not a name!";
  const loaded = loadGateV3Registry(registry, "<malformed>");
  assert.equal(loaded.ok, false);
  assert.ok(loaded.diagnostics.some((d) => d.code === "GATE-REGISTRY-016"));
});
