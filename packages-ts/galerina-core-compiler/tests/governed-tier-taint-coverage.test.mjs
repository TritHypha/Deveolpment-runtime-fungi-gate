// =============================================================================
// The `governed` tier must be TAINT-CHECKED like every other tier.
//
// THE DEFECT UNDER TEST (IMP-235). `taint-checker.ts` mentioned `governedFlowDecl`
// zero times. `checkTaint` indexed top-level flow nodes with a local four-kind set
// AND keyed that index by `c.value` — which for a governed flow is the encoded
// `governed:<floor>:<name>`. Either fault alone makes the `flowNodeByName.get(flow.name)`
// lookup miss, and the loop `continue`s: the flow is skipped entirely.
//
// The consequence is not a missing diagnostic. It is that **a tainted value reaching
// an injection sink signs CLEAN at the highest governance tier** — the tier a reader
// would trust most.
//
// THE VECTORS ARE NOT INVENTED. They are the fixtures phase28-profile-taint.test.mjs
// already asserts fire, reused verbatim with the tier keyword as the only variable.
// =============================================================================
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseProgram, checkTaint } from "../dist/index.js";

function taint(src) {
  const p = parseProgram(src, "governed-taint.fungi");
  return {
    parseErrors: p.diagnostics.filter((d) => d.severity === "error"),
    codes: checkTaint(p.ast, p.flows).map((d) => d.code),
  };
}

/** Tainted request body reaches a SQL sink. `tier` is the only variable. */
const toSink = (tier) => [
  `${tier}flow q(req: Request) -> Response contract { effects { database.read } }`,
  "{ let userId: String = req.body  let r: String = Database.query(userId)  return r }",
].join("\n");

/** Cleaned for HTML, then used at a SQL sink — clean for the wrong context. */
const wrongContext = (tier) => [
  `${tier}flow q(req: Request) -> Response contract { effects { database.read } }`,
  "{ let h: String = Html.escapeContent(req.body)  let r: String = Database.query(h)  return r }",
].join("\n");

/** Properly parameterised — must stay silent at EVERY tier. */
const sanitised = (tier) => [
  `${tier}flow q(req: Request) -> Response contract { effects { database.read } }`,
  "{ let safe: String = Sql.parameterize(req.body)  let r: String = Database.query(safe)  return r }",
].join("\n");

// NOTE: the templates already carry the `flow` keyword, so the PLAIN tier is the
// EMPTY prefix. Writing "flow" here yields `flow flow q(…)` — a malformed fixture
// that scores 0 and reads exactly like a finding.
const GOVERNED = "governed floor_3 ";
const OTHER_TIERS = [["plain", ""], ["pure", "pure "], ["secure", "secure "], ["guarded", "guarded "]];

describe("governed tier taint coverage (IMP-235)", () => {
  it("CONTROL: the governed fixtures parse clean — the vectors are well-formed", () => {
    for (const mk of [toSink, wrongContext, sanitised]) {
      assert.deepEqual(taint(mk(GOVERNED)).parseErrors, [],
        "a parse error would make the governed arm untestable, not exempt");
    }
  });

  it("CONTROL: FUNGI-TAINT-001 fires at all four non-governed tiers", () => {
    for (const [name, prefix] of OTHER_TIERS) {
      assert.ok(taint(toSink(prefix)).codes.includes("FUNGI-TAINT-001"),
        `if the gate does not fire at '${name}' this file proves nothing about tiers`);
    }
  });

  it("CONTROL: a properly sanitised value is silent at every tier, governed included", () => {
    for (const [, prefix] of [...OTHER_TIERS, ["governed", GOVERNED]]) {
      assert.deepEqual(taint(sanitised(prefix)).codes, [],
        "if this fires the checker is indiscriminate and a silence elsewhere means nothing");
    }
  });

  it("★ a tainted value reaching a SQL sink is refused at the GOVERNED tier", () => {
    const { codes } = taint(toSink(GOVERNED));
    assert.ok(codes.includes("FUNGI-TAINT-001"),
      "the identical program is FUNGI-TAINT-001 at plain, pure, secure and guarded. A governed flow "
      + "skipped by checkTaint means an injection path signs clean at the HIGHEST governance tier. "
      + `Got: ${codes.join(",") || "(nothing at all)"}`);
  });

  it("★ a value cleaned for the WRONG context is refused at the GOVERNED tier", () => {
    const { codes } = taint(wrongContext(GOVERNED));
    assert.ok(codes.includes("FUNGI-TAINT-003"),
      `'clean for the sink it was cleaned for' must hold at every tier. Got: ${codes.join(",") || "(none)"}`);
  });
});
