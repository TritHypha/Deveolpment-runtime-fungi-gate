// gate-v3-code-reference.test.mjs — every code documented, and the catalogue
// cannot drift (cycle 0111).
//
// THE DEFECT THIS ENCODES: an audit found 47 of 96 GATE-* codes absent from the
// shipped gate docs. RULES.md documents the INVARIANTS — the codes with
// reasoning — but it was also the only catalogue, so a code without an essay
// was a code an author could hit and not look up. CODES.md now carries the
// complete catalogue, generated from source.
//
// Two assertions, and they guard different failures:
//   completeness — a NEW code cannot ship undocumented (the original defect);
//   drift        — the COMMITTED file matches a fresh generation, so nobody
//                  hand-edits the generated file or forgets to regenerate.
// A generated file with no drift gate is a hand-written file with extra steps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectGateCodes, renderReference } from "../scripts/write-gate-code-reference.mjs";

const GATE_DOCS = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");

function shippedDocText() {
  let text = "";
  for (const entry of readdirSync(GATE_DOCS, { withFileTypes: true })) {
    if (entry.isFile()) text += readFileSync(join(GATE_DOCS, entry.name), "utf8");
  }
  return text;
}

test("the collector sees the tree — not a vacuous pass", () => {
  const codes = collectGateCodes();
  assert.ok(codes.size >= 90, `expected the known population (~96), saw ${codes.size}`);
  assert.ok(codes.has("GATE-SEM-014"), "the newest semantic code must be present");
});

test("★ COMPLETENESS: every declared GATE-* code appears in the shipped gate docs", () => {
  const docs = shippedDocText();
  const missing = [...collectGateCodes().keys()].filter((code) => !docs.includes(code)).sort();
  assert.deepEqual(missing, [],
    `undocumented code(s) — regenerate CODES.md:\n  ${missing.join("\n  ")}`);
});

test("★ DRIFT: the committed CODES.md matches a fresh generation byte-for-byte", () => {
  const committed = readFileSync(join(GATE_DOCS, "CODES.md"), "utf8").replace(/\r\n/g, "\n");
  const fresh = `${renderReference(collectGateCodes())}\n`;
  assert.equal(committed, fresh,
    "CODES.md is generated — do not hand-edit; run write-gate-code-reference.mjs");
});

test("the generated file says it is generated, at the top where an editor sees it", () => {
  const head = readFileSync(join(GATE_DOCS, "CODES.md"), "utf8").slice(0, 400);
  assert.match(head, /GENERATED FILE — do not edit by hand/);
});
