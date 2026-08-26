// S1 (bridge 0148, F1 fix) — `if`/`while` conditions must type as Bool (FUNGI-TYPE-033).
// F1: `if <Int>` / `if <Verdict>` compiled clean today, even --strict-types — a non-Bool control-flow
// condition is a fail-open. check(){} is the Verdict-dispatch construct; if/while are Bool-only.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram, checkTypes, resolveSymbols } from "../dist/index.js";

function checkDiags(src) {
  const p = parseProgram(src, "t.fungi");
  resolveSymbols(p.ast);
  return checkTypes(p.ast).diagnostics ?? [];
}
const has = (d, code) => d.some((x) => x.code === code);

describe("S1 — if/while condition-type gate (FUNGI-TYPE-033)", () => {
  it("`if <Int>` ⇒ FUNGI-TYPE-033 (the F1 fail-open, now caught)", () => {
    assert.ok(has(checkDiags(`pure flow g(n: Int) -> Int { if n { return 1 } return 0 }`), "FUNGI-TYPE-033"));
  });
  it("`while <Int>` ⇒ FUNGI-TYPE-033", () => {
    assert.ok(has(checkDiags(`pure flow g(n: Int) -> Int { while n { return 1 } return 0 }`), "FUNGI-TYPE-033"));
  });
  it("`if <Verdict>` (all{}) ⇒ FUNGI-TYPE-033 — use check(), not if", () => {
    assert.ok(has(checkDiags(`pure flow g(n: Int) -> Int { if all{} { return 1 } return 0 }`), "FUNGI-TYPE-033"));
  });
  it("`if <Bool>` ⇒ clean (control)", () => {
    assert.ok(!has(checkDiags(`pure flow g(b: Bool) -> Int { if b { return 1 } return 0 }`), "FUNGI-TYPE-033"));
  });
  it("`if <comparison>` (Bool) ⇒ clean", () => {
    assert.ok(!has(checkDiags(`pure flow g(n: Int) -> Int { if n > 0 { return 1 } return 0 }`), "FUNGI-TYPE-033"));
  });
  it("`while <comparison>` (Bool) ⇒ clean", () => {
    assert.ok(!has(checkDiags(`pure flow g(n: Int) -> Int { while n > 0 { return 1 } return 0 }`), "FUNGI-TYPE-033"));
  });
});
