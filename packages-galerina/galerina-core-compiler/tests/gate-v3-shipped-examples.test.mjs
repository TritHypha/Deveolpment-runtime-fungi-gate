// gate-v3-shipped-examples.test.mjs — the shipped `.gate` examples must stay valid.
//
// WHY THIS EXISTS. `docs/examples/gate/*.gate` is the on-ramp: the first v3 a
// reader (human or model) ever sees, and the shapes they will copy. Until this
// suite, NOTHING in the repository checked them. `galerina check` cannot: its
// project config (`galerina.check.json`) ignores `docs/**`, so aiming it at the
// examples folder walks zero files and reports "PASS" — a vacuous green that
// reads exactly like a real one. An example could rot through any future
// grammar change and the only signal would be a confused reader.
//
// SCOPE — deliberately stated so the green is not over-read. The examples ship
// without a `gate.registry.json`, so there are no component contracts to
// resolve against; this suite proves SYNTAX and STRUCTURE only (header, parse,
// structural verification). It does NOT prove that the named components exist,
// that argument values satisfy contracts, or that the circuits would resolve —
// that needs a registry beside them, which is a separate decision.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseGateV3, verifyGateV3Structure, GATE_V3_VERSION } from "../dist/index.js";

// tests -> galerina-core-compiler -> packages-galerina -> repository root
const EXAMPLES = resolve(import.meta.dirname, "..", "..", "..", "docs", "examples", "gate");

/** Every shipped example, sorted so failures report in a stable order. */
function shippedExamples() {
  return readdirSync(EXAMPLES).filter((f) => f.endsWith(".gate")).sort();
}

test("shipped examples: the on-ramp set is present", () => {
  const files = shippedExamples();
  assert.ok(files.length >= 5, `expected the five documented examples, found ${files.length}`);
});

test("shipped examples: every file carries the exact v3 header", () => {
  // The header is a LITERAL, not a range: `@gate 3.0.0` and nothing else. A
  // stale `@version 1.0.0` example would be refused by the parser anyway, but
  // this asserts the intended fact directly rather than through a side effect.
  for (const f of shippedExamples()) {
    const first = readFileSync(join(EXAMPLES, f), "utf8").split(/\r?\n/)[0];
    assert.equal(first.trim(), `@gate ${GATE_V3_VERSION}`, `${f}: first line must be the exact v3 header`);
  }
});

test("shipped examples: every file parses and verifies with zero errors", () => {
  const failures = [];
  for (const f of shippedExamples()) {
    const parsed = parseGateV3(readFileSync(join(EXAMPLES, f), "utf8"), f);
    if (!parsed.ok) {
      failures.push(`${f} REFUSED: ${parsed.diagnostics.map((d) => `${d.code}@${d.location?.line}`).join(", ")}`);
      continue;
    }
    const errors = verifyGateV3Structure(parsed.circuit).filter((d) => d.severity !== "warning");
    if (errors.length) {
      failures.push(`${f}: ${errors.map((d) => `${d.code}@${d.location?.line}`).join(", ")}`);
    }
  }
  assert.deepEqual(failures, [], `shipped examples must stay valid:\n  ${failures.join("\n  ")}`);
});

test("shipped examples: the suite is load-bearing (a broken circuit is caught)", () => {
  // Guard against the failure this suite exists to prevent: a check that passes
  // over nothing. Take a real example, delete its K3 indeterminate arm, and
  // require the verifier to object — if this ever goes quiet, the assertions
  // above are no longer evidence.
  const source = readFileSync(join(EXAMPLES, "01-authorized-read.gate"), "utf8");
  const mutated = source.split(/\r?\n/).filter((l) => !/^\s*authz\.indeterminate\s*->/.test(l)).join("\n");
  assert.notEqual(mutated, source, "the mutation must actually change the source");

  const parsed = parseGateV3(mutated, "mutated.gate");
  assert.equal(parsed.ok, true, "the mutation should still parse — it is a semantic break, not a syntax one");
  const codes = verifyGateV3Structure(parsed.circuit).map((d) => d.code);
  assert.ok(codes.includes("GATE-AUTH-002"), `removing the indeterminate arm must be caught, got ${codes}`);
});
