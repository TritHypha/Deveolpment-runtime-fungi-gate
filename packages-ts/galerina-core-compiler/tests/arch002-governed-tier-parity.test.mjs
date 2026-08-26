// =============================================================================
// FUNGI-ARCH-002 must fire on EVERY flow tier — including `governed`.
//
// The gate's own comment (governance-verifier.ts:2811) reads: "Owner decision:
// ALWAYS a hard error (every profile)." This file tests the OTHER universal
// quantifier the comment implies but does not state: every TIER.
//
// THE DEFECT UNDER TEST (IMP-229). `verifyArchitectureStability` (:2814) opens by
// declaring a LOCAL four-kind set:
//
//     const FLOW_KINDS = new Set(["pureFlowDecl","flowDecl","secureFlowDecl","guardedFlowDecl"]);
//
// which SHADOWS the module-level `FLOW_KINDS` at :112 — and that one is correct:
// it contains `governedFlowDecl` and even carries the `slice(2).join(":")` decode
// at :120-123. The use at :2820 (`if (!FLOW_KINDS.has(child.kind)) continue`)
// therefore skips every governed flow before the gate runs.
//
// WHY THE PAIRED CONTROL IS THE WHOLE TEST. A single failing case proves nothing:
// the violation might simply not be a violation. So each vector is run TWICE with
// ONE variable changed — the tier keyword — over an otherwise identical program:
//
//     guarded  caller(LOW) -> callee(HIGH)   MUST be refused   (proves the gate works)
//     governed caller(LOW) -> callee(HIGH)   is NOT refused    (proves the gap is the TIER)
//
// If the guarded arm ever stops firing, this file has stopped testing the gap and
// says so rather than reporting a false gap.
// =============================================================================
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseProgram, checkEffects, verifyGovernance } from "../dist/index.js";

function verify(src) {
  const p = parseProgram(src, "arch002-tier.fungi");
  const fx = checkEffects(p.flows, p.ast);
  const gov = verifyGovernance(p.ast, p.flows, fx, "production");
  return {
    parseErrors: p.diagnostics.filter((d) => d.severity === "error"),
    arch002: gov.diagnostics.filter((d) => d.code === "FUNGI-ARCH-002"),
  };
}

/**
 * One program, two flows, a LOW caller depending on a HIGH callee — the exact
 * shape the existing suite proves is a hard error for `pure`. `tier` is the only
 * thing that varies.
 */
const violation = (tier) => `pure flow callee(x: Int) -> Int
contract { intent { "volatile leaf" } architecture { volatility: HIGH } }
{ return x }
${tier} flow caller(x: Int) -> Int
contract { intent { "stable caller" } architecture { volatility: LOW } }
{ return callee(x) }`;

describe("FUNGI-ARCH-002 tier parity (IMP-229)", () => {
  it("CONTROL: the guarded tier IS refused — the gate and the fixture both work", () => {
    const { parseErrors, arch002 } = verify(violation("guarded"));
    assert.deepEqual(parseErrors, [], "the control fixture must parse clean");
    assert.equal(arch002.length, 1,
      "if this is 0 the gate is not firing at all and this file proves nothing about tiers");
    assert.equal(arch002[0].severity, "error", "always a hard error");
  });

  it("CONTROL: the same program WITHOUT a violation is clean at the guarded tier", () => {
    const ok = `pure flow callee(x: Int) -> Int
contract { intent { "stable leaf" } architecture { volatility: LOW } }
{ return x }
guarded flow caller(x: Int) -> Int
contract { intent { "volatile caller" } architecture { volatility: HIGH } }
{ return callee(x) }`;
    assert.equal(verify(ok).arch002.length, 0,
      "a HIGH depending on a LOW is legal; if this fires the detector is indiscriminate");
  });

  it("the governed fixture parses clean — the vector is well-formed", () => {
    assert.deepEqual(verify(violation("governed floor_3")).parseErrors, [],
      "a parse error here would make the governed arm untestable, not exempt");
  });

  it("★ the governed tier is refused for the SAME violation", () => {
    const { arch002 } = verify(violation("governed floor_3"));
    assert.equal(arch002.length, 1,
      "governed is the MOST governed tier; a gate declared 'always a hard error' that skips it is a "
      + "silent exemption. Cause: governance-verifier.ts:2815 declares a local four-kind FLOW_KINDS "
      + "that shadows the correct module-level set at :112, so :2820 skips every governedFlowDecl.");
  });

  it("★ the governed flow is keyed by its DECLARED name, not the encoded value", () => {
    // Second half of the same defect: :2821 does `flowNodes.set(child.value)`, and
    // a governed flow's value is "governed:<floor>:<name>". Even with the kind
    // admitted, the diagnostic would name the encoding rather than the flow.
    const { arch002 } = verify(violation("governed floor_3"));
    if (arch002.length === 0) return;   // the arm above already reports the gap
    assert.ok(arch002[0].message.includes("caller"),
      `the diagnostic must name the flow 'caller', got: ${arch002[0].message}`);
    assert.ok(!arch002[0].message.includes("governed:floor_3:"),
      "the encoded value must never appear in a diagnostic — decode via flow-name.ts");
  });
});
