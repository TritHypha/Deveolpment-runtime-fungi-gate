// gate-v3-parser.test.mjs — Round-one G1 step 1: the `.gate` v3 front-end parser.
//
// Separate from the v1 `gate-parser.ts` (Ruling A / hard constraint 1: the v1
// parser and its 14 tests stay intact). This suite proves the v3 header
// recognition and the fail-closed dispatch boundary frozen in the KTA
// (22-g0-boundary-freeze.md §1): first line must be exactly `@gate 3.0.0`;
// v1 `@version`, v2 glyph headers, blanks, and anything else REFUSE.
//
// Tests-first (KAT discipline): written before the parser exists, so it goes
// red on the missing export, then green once the skeleton lands. Step 2 adds
// the full section parse with exact spans.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGateV3, GATE_V3_VERSION, GATE_PARSE_002 } from "../dist/index.js";

const codesOf = (r) => r.diagnostics.map((d) => d.code);

test("gate-v3: a valid `@gate 3.0.0` header is accepted (no version refusal)", () => {
  const r = parseGateV3("@gate 3.0.0\n", "probe.gate");
  assert.equal(r.ok, true, "the exact header is accepted");
  assert.equal(r.exactVersion, GATE_V3_VERSION);
  assert.ok(!codesOf(r).includes(GATE_PARSE_002.code), "no version refusal on the exact header");
});

test("gate-v3: the v1 `@version 1.0.0` header REFUSES (one parser - Ruling A)", () => {
  const r = parseGateV3("@version 1.0.0\nINTENT \"x\"\n", "v1.gate");
  assert.equal(r.ok, false);
  assert.deepEqual(codesOf(r), [GATE_PARSE_002.code]);
});

test("gate-v3: a v2 glyph header REFUSES (no best-effort parse)", () => {
  const r = parseGateV3("GATE getCustomer(caller: CallerId) -> View:\n", "v2.gate");
  assert.equal(r.ok, false);
  assert.deepEqual(codesOf(r), [GATE_PARSE_002.code]);
});

test("gate-v3: a leading blank line REFUSES (literal first line - no non-blank leniency)", () => {
  const r = parseGateV3("\n@gate 3.0.0\n", "blank.gate");
  assert.equal(r.ok, false);
  assert.deepEqual(codesOf(r), [GATE_PARSE_002.code]);
});

test("gate-v3: a two-space header REFUSES (exactly one space)", () => {
  const r = parseGateV3("@gate  3.0.0\n", "twospace.gate");
  assert.equal(r.ok, false);
  assert.deepEqual(codesOf(r), [GATE_PARSE_002.code]);
});

test("gate-v3: CRLF line endings are normalized - `@gate 3.0.0\\r\\n` is accepted", () => {
  const r = parseGateV3("@gate 3.0.0\r\n", "crlf.gate");
  assert.equal(r.ok, true, "CR before LF is normalized away before the header check");
});

test("gate-v3: the version refusal carries a line:column location", () => {
  const r = parseGateV3("nope\n", "loc.gate");
  assert.equal(r.ok, false);
  const diag = r.diagnostics.find((d) => d.code === GATE_PARSE_002.code);
  assert.equal(diag.location.file, "loc.gate");
  assert.equal(diag.location.line, 1);
  assert.equal(diag.location.column, 1);
});
