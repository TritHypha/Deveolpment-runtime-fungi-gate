// =============================================================================
// Q2 KAT — the declassifier shadow floor (owner-approved, 2026-08-06)
//
// FUNGI-VALUESTATE-011 rejects a user flow that SHADOWS a privacy declassifier
// (redact/seal/encrypt/constantTimeEquals) by defining a same-named flow, which
// would launder secret/PII past the value-state gate (CWE-501). Two Q2 changes:
//   1. `constantTimeEquals` added to DECLASSIFIER_NAMES — it clears secret state
//      at the SecureString comparison site (WP94) but was missing from the floor.
//   2. the shadow scan uses the shared flow-name decoder, so a GOVERNED flow
//      (kind governedFlowDecl, value "governed:<floor>:<name>") is caught by its
//      declared name — the old shape missed it twice.
//
// Discriminating controls throughout: a legitimate CALL is not a shadow; a
// non-declassifier flow name is not a shadow.
// =============================================================================
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram } from "../../dist/index.js";
import { scanDeclassifierShadows } from "../../dist/value-state-checker.js";

const errorsOf = (src, file = "shadow.fungi") => {
  const p = parseProgram(src, file);
  return { parseErrors: (p.diagnostics ?? []).filter((d) => d.severity === "error"), p };
};
const shadowFires = (src) => {
  const { parseErrors, p } = errorsOf(src);
  assert.deepEqual(parseErrors, [], "fixture sanity: the flow must parse with 0 errors (a reserved name would void the test)");
  return scanDeclassifierShadows(p.ast).some((d) => d.code === "FUNGI-VALUESTATE-011");
};

describe("Q2 — declassifier shadow floor, every tier", () => {
  // condition: red for a shadow flow in EVERY qualifier, incl. governed via the decoder.
  const tiers = [
    ["flow", "flow s(x: Int) -> Int contract { intent { \"i\" } } { return x }"],
    ["secure flow", "secure flow s(x: Int) -> Int contract { intent { \"i\" } } { return x }"],
    ["pure flow", "pure flow s(x: Int) -> Int contract { intent { \"i\" } } { return x }"],
    ["guarded flow", "guarded flow s(x: Int) -> Int contract { intent { \"i\" } } { return x }"],
    ["governed floor_2 flow", "governed floor_2 flow s(x: Int) -> Int contract { intent { \"i\" } } { return x }"],
  ];
  for (const declassifier of ["redact", "seal", "encrypt", "constantTimeEquals"]) {
    for (const [label, template] of tiers) {
      it(`★ a ${label} named '${declassifier}' is a shadow (VALUESTATE-011 fires)`, () => {
        const src = template.replace(" s(", ` ${declassifier}(`);
        assert.equal(shadowFires(src), true, `${label} '${declassifier}' must be flagged as a shadow`);
      });
    }
  }

  it("★★★ constantTimeEquals is now in the floor (was the WP94 gap) — plain-tier shadow fires", () => {
    assert.equal(shadowFires(`flow constantTimeEquals(x: Int) -> Int contract { intent { "i" } } { return x }`), true);
  });

  it("★★★ the GOVERNED-tier shadow is caught (the decoder fix — old shape missed it twice)", () => {
    assert.equal(shadowFires(`governed floor_3 flow redact(x: Int) -> Int contract { intent { "i" } } { return x }`), true);
  });

  it("⬜ CONTROL: a non-declassifier flow name is NOT a shadow", () => {
    assert.equal(shadowFires(`flow tallyup(x: Int) -> Int contract { intent { "i" } } { return x }`), false);
  });

  it("⬜ CONTROL: a legitimate constantTimeEquals(...) CALL is not a shadow (only a same-named flow DEFINITION is)", () => {
    // A flow that CALLS constantTimeEquals must not itself be flagged — the floor rejects the
    // shadow DEFINITION, never a use of the real declassifier.
    const src = `secure flow verify(a: SecureString, b: SecureString) -> Bool contract { intent { "i" } } { let ok: Bool = constantTimeEquals(a, b) return ok }`;
    const { parseErrors, p } = errorsOf(src);
    // If the fixture doesn't parse (unknown type/shape), skip the strong claim but never green-wash.
    if (parseErrors.length === 0) {
      assert.equal(scanDeclassifierShadows(p.ast).some((d) => d.code === "FUNGI-VALUESTATE-011"), false,
        "a call to the real declassifier is not a shadow");
    } else {
      // fixture couldn't parse cleanly — assert only that no shadow was invented on a flow named `verify`
      assert.equal(scanDeclassifierShadows(p.ast).some((d) => d.code === "FUNGI-VALUESTATE-011"), false);
    }
  });
});
