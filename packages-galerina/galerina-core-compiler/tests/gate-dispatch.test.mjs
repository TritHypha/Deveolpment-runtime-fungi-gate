// gate-dispatch.test.mjs — Round-one G1 step 6: file dispatch + GATELANG-002.
//
// Proves the frozen dispatch rule (KTA 22-g0-boundary-freeze.md §1): a `.gate`
// file routes to the v3 parser ONLY; v1 `@version`, v2 glyph and anything else
// REFUSE fail-closed; one parser is tried, never both. And constraint 3: the
// production-signing block (FUNGI-GATELANG-002) survives the new dispatch — a
// v3 file still carries an error-severity diagnostic that withholds signing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchGateSource, FUNGI_GATELANG_002 } from "../dist/index.js";

const V3 = [
  "@gate 3.0.0",
  "CIRCUIT probe(value: T) -> T",
  '  INTENT "dispatch probe"',
  "  REQUIRES:",
  "  PARTS:",
  "    [e :: test.echo@1.0.0]",
  "  WIRES:",
  "    IN.value -> e.value",
  "    e.value -> OUT.value",
  "END",
  "",
].join("\n");

const codesOf = (r) => r.diagnostics.map((d) => d.code);

test("dispatch: a v3 file routes to the v3 parser and yields a circuit", () => {
  const r = dispatchGateSource(V3, "probe.gate");
  assert.equal(r.dialect, "gate-v3");
  assert.ok(r.circuit, "the v3 circuit is produced");
  assert.equal(r.circuit.name, "probe");
});

test("dispatch: constraint 3 — a v3 file still carries GATELANG-002 (signing withheld)", () => {
  const r = dispatchGateSource(V3, "probe.gate");
  assert.ok(codesOf(r).includes(FUNGI_GATELANG_002.code), "production block present");
  assert.ok(r.diagnostics.some((d) => d.severity === "error"), "it is an ERROR — a prod build refuses to sign");
});

test("dispatch: a v1 `@version` file REFUSES with a migration pointer (Ruling A)", () => {
  const r = dispatchGateSource("@version 1.0.0\nINTENT \"x\"\n", "old.gate");
  assert.equal(r.dialect, "refused");
  assert.equal(r.circuit, undefined);
  assert.ok(codesOf(r).includes("GATE-PARSE-002"));
  assert.match(r.diagnostics[0].message, /@version|retired|v3 files begin/i, "carries a migration pointer");
});

test("dispatch: a v2 glyph file and junk REFUSE fail-closed", () => {
  for (const src of ["GATE Foo(x: T) -> T:\n", "hello\n", "", "\n@gate 3.0.0\n"]) {
    const r = dispatchGateSource(src, "x.gate");
    assert.equal(r.dialect, "refused", JSON.stringify(src));
    assert.equal(r.circuit, undefined);
  }
});

test("dispatch: ONE parser is tried, never both — a refused file yields no v1 attempt", () => {
  // A source that the v1 parser would accept must still be refused here: the
  // dispatcher does not fall back (the 'old tool eats new format' trap).
  const v1Valid = "@version 1.0.0\nINTENT \"x\"\nEFFECTS { database.read }\nFLOW:\n  [a] -> [b]\n";
  const r = dispatchGateSource(v1Valid, "v1.gate");
  assert.equal(r.dialect, "refused");
  assert.ok(!codesOf(r).includes("FUNGI-GATELANG-001"), "the v1 parser was not consulted");
});

test("dispatch: a structurally invalid v3 file reports structure, not a fallback", () => {
  const noOut = V3.replace("    e.value -> OUT.value", "    e.value -> DRAIN.discarded");
  const r = dispatchGateSource(noOut, "bad.gate");
  assert.equal(r.dialect, "gate-v3", "still v3 — dispatch keyed on the header, not on success");
  assert.ok(codesOf(r).includes("GATE-WIRE-005"), "structural verdict surfaces");
  assert.ok(codesOf(r).includes(FUNGI_GATELANG_002.code), "the signing block is present regardless");
});

// ── G2: registry-bearing dispatch ──────────────────────────────────────────
// Without a registry the dispatcher does structure only (round one). WITH one
// it must also resolve and check liveness — otherwise G2's checks exist but
// never run on a real file, which is the "capability that is never invoked"
// trap (GF-006's lesson, applied to my own work).

const REGISTRY_FIXTURE = {
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "test.echo", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "value", type: "T", required: true }],
    outputs: [{ name: "value", type: "T", copyable: true }],
    arguments: [], effects: [], capabilities: [],
  }],
};

test("dispatch: WITHOUT a registry, resolution codes do not appear (structure only)", () => {
  const r = dispatchGateSource(V3, "probe.gate");
  assert.equal(r.dialect, "gate-v3");
  assert.ok(!codesOf(r).some((c) => c.startsWith("GATE-RESOLVE-1")), "no registry => no resolution verdict");
});

test("dispatch: WITH a registry, an unknown component REFUSES through the dispatcher", () => {
  const ghost = V3.replace("test.echo@1.0.0", "test.absent@1.0.0");
  const r = dispatchGateSource(ghost, "probe.gate", { registry: REGISTRY_FIXTURE });
  assert.ok(codesOf(r).includes("GATE-RESOLVE-101"), `expected resolution to run, got ${codesOf(r)}`);
});

test("dispatch: WITH a registry, a clean circuit carries ONLY the production block", () => {
  const r = dispatchGateSource(V3, "probe.gate", { registry: REGISTRY_FIXTURE });
  assert.deepEqual(codesOf(r), [FUNGI_GATELANG_002.code], "clean under registry resolution");
});

test("dispatch: WITH a registry, liveness runs — the ghost part REFUSES", () => {
  const withGhost = [
    "@gate 3.0.0",
    "CIRCUIT probe(value: T) -> T",
    '  INTENT "dispatch probe"',
    "  REQUIRES:",
    "  PARTS:",
    "    [e :: test.echo@1.0.0]",
    "    [ghost :: test.echo@1.0.0]",
    "  WIRES:",
    "    IN.value -> e.value",
    "    e.value -> DRAIN.discarded",
    "    ghost.value -> OUT.value",
    "END",
    "",
  ].join("\n");
  const r = dispatchGateSource(withGhost, "probe.gate", { registry: REGISTRY_FIXTURE });
  assert.ok(codesOf(r).includes("GATE-LIVE-001"), `expected liveness to run, got ${codesOf(r)}`);
});

test("dispatch: a malformed registry REFUSES the file rather than checking it half-way", () => {
  const r = dispatchGateSource(V3, "probe.gate", { registry: { version: "9.9.9", components: [] } });
  assert.ok(codesOf(r).some((c) => c.startsWith("GATE-REGISTRY-")), `expected a registry refusal, got ${codesOf(r)}`);
  assert.ok(!codesOf(r).some((c) => c.startsWith("GATE-RESOLVE-1")), "no half-resolved verdict on a bad registry");
});
