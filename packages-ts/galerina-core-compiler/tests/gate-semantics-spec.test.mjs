// gate-semantics-spec.test.mjs — SEMANTICS.md is normative, so it is gated.
//
// A specification a clean-room team derives from is only as good as its
// accuracy. Two ways it rots, and both are silent:
//   - it cites a code that no longer exists (or never did), so an implementer
//     builds toward a rule nothing enforces;
//   - a limit it states drifts from the enforcement point, so an implementer
//     builds the wrong ceiling and disagrees with the reference for a reason
//     neither side can see.
//
// Neither is caught by reading. Both are caught here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GATE_V3_LIMITS } from "../dist/index.js";

const GATE_DOCS = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");
const spec = () => readFileSync(join(GATE_DOCS, "SEMANTICS.md"), "utf8");
const catalogue = () => readFileSync(join(GATE_DOCS, "CODES.md"), "utf8");

test("the spec exists and is substantive — a stub would pass every check below", () => {
  const text = spec();
  assert.ok(text.length > 6000, `expected a real specification, got ${text.length} bytes`);
  assert.match(text, /^# `\.gate` v3 — normative semantics/m);
});

test("★ every code the spec cites is a REAL code in the catalogue", () => {
  const cited = [...new Set([...spec().matchAll(/\b(GATE-[A-Z]+-\d+)\b/g)].map((m) => m[1]))].sort();
  assert.ok(cited.length >= 20, `expected the spec to cite the rule set, saw ${cited.length}`);
  const known = catalogue();
  const phantom = cited.filter((code) => !known.includes(code));
  assert.deepEqual(phantom, [],
    `the spec cites code(s) that do not exist — an implementer would build toward nothing:\n  ${phantom.join("\n  ")}`);
});

test("★ the spec's short-form SEM references resolve too", () => {
  // The rule table uses `SEM-014` rather than the full code. A short form that
  // resolves to nothing is the same defect wearing a shorter name.
  const shorts = [...new Set([...spec().matchAll(/\bSEM-(\d+)\b/g)].map((m) => `GATE-SEM-${m[1]}`))].sort();
  const known = catalogue();
  const phantom = shorts.filter((code) => !known.includes(code));
  assert.deepEqual(phantom, [], `unresolvable short reference(s): ${phantom.join(", ")}`);
});

test("★ every ceiling the spec states matches GATE_V3_LIMITS exactly", () => {
  // A spec that states a different number from the enforcement point sends a
  // clean-room implementation to a wrong ceiling, and the disagreement looks
  // like a conformance bug in whichever side is trusted less.
  const text = spec();
  const stated = {
    setNesting: /set nesting \| (\d+)/,
    setCardinality: /set cardinality \| (\d+)/,
    identifier: /identifier length \| (\d+)/,
    argumentsPerPart: /arguments per part \| (\d+)/,
    parts: /\| parts \| (\d+)/,
    wires: /\| wires \| (\d+)/,
  };
  for (const [key, re] of Object.entries(stated)) {
    const m = re.exec(text);
    assert.ok(m, `the spec must state the ${key} ceiling`);
    assert.equal(Number(m[1]), GATE_V3_LIMITS[key], `${key}: spec says ${m[1]}, the limit is ${GATE_V3_LIMITS[key]}`);
  }
  // fileBytes is written with a separator in prose; compare on digits only.
  const bytes = /file bytes \| ([\d,]+)/.exec(text);
  assert.ok(bytes, "the spec must state the file-size ceiling");
  assert.equal(Number(bytes[1].replace(/,/g, "")), GATE_V3_LIMITS.fileBytes);
});

test("the spec states the version as a LITERAL and does not mint a new one", () => {
  // Doc 34 §2.2: G3/G4 completion does not require a grammar change, so no
  // `@gate 4.0.0` may be invented to version a verifier.
  const text = spec();
  assert.match(text, /`@gate 3\.0\.0`/, "must name the literal header");
  assert.ok(!/@gate 4\.\d+\.\d+/.test(text), "must not mint a language version");
  assert.match(text, /gate-v3-conformance-1/, "must name the separate conformance identity");
});

test("★ the two findings recovered by measurement are stated, not implied", () => {
  // Single assignment and the target-scoped capability boundary were both
  // absent from every prior document. They are the reason this spec exists
  // rather than being a restatement of RULES.md.
  const text = spec();
  assert.match(text, /Every consumer endpoint has exactly one producer/,
    "single assignment must be stated normatively");
  assert.match(text, /GATE-WIRE-002/, "and bound to its code");
  assert.match(text, /target-scoped/i, "the capability boundary must be stated");
  assert.match(text, /exit non-zero/i, "including the exit-status obligation");
});

test("the boundaries section survives — a spec listing only what is possible is a trap", () => {
  const text = spec();
  assert.match(text, /not expressible/i);
  assert.match(text, /a circuit proves routing, never semantics/i);
});
