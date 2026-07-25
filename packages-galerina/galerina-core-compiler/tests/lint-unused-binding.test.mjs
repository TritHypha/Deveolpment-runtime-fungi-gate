// =============================================================================
// FUNGI-LINT-002 UNUSED_BINDING — dead local / match-pattern binding
// =============================================================================
// Both-direction teeth from R&D's corpus (audit-tooling/unused-binding-diagnostic-corpus,
// bridge 0244): every ACCEPT case must NOT flag (no false positives), every REJECT case
// MUST flag (no false negatives). Scope this rung: locals (let/mut) + match bindings —
// R1..R3. Params (F1) and self-referential dead `mut acc=acc+1` (R4, a syntactic read
// exists) are DEFERRED rungs and asserted to NOT flag here.
// =============================================================================
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram, checkUnusedBindings } from "../dist/index.js";

function flagged(src) {
  const p = parseProgram(src, "unused.fungi");
  return checkUnusedBindings(p.ast, p.flows ?? []).map((d) => d.bindingName).sort();
}

describe("FUNGI-LINT-002 — unused-binding lint (both-direction teeth)", () => {
  // ── ACCEPT: must NOT flag ──
  it("A1: a read local is not flagged", () => {
    assert.deepEqual(flagged(`pure flow f() -> Int {\n  let n = 41\n  return n + 1\n}\n`), []);
  });
  it("A2: a match binding read in its arm is not flagged", () => {
    assert.deepEqual(flagged(`pure flow f(opt: Option<Int>) -> String {\n  mut word = ""\n  match opt {\n    Some(nc) => { word = word + nc.toString() }\n    None => {}\n    _ => {}\n  }\n  return word\n}\n`), []);
  });
  it("A4: a mut that is written AND read is not flagged", () => {
    assert.deepEqual(flagged(`pure flow f(srcLen: Int) -> Int {\n  mut i = 0\n  while i < srcLen {\n    i = i + 1\n  }\n  return i\n}\n`), []);
  });
  it("A5: Ok(x)/Err(e) bindings read in their arms are not flagged", () => {
    assert.deepEqual(flagged(`pure flow f(v: Result<Int, String>) -> Int {\n  match v {\n    Ok(x) => { return x }\n    Err(e) => { return size(e) }\n    _ => { return 0 }\n  }\n}\n`), []);
  });
  it("A6: the bare `_` wildcard binds nothing (structurally out of scope)", () => {
    assert.deepEqual(flagged(`pure flow f(v: Int) -> Int {\n  match v {\n    _ => { return 0 }\n  }\n}\n`), []);
  });

  // ── REJECT: MUST flag ──
  it("R1: a dead local is flagged", () => {
    assert.deepEqual(flagged(`pure flow f() -> Int {\n  let n = compute()\n  return 0\n}\n`), ["n"]);
  });
  it("R2: the wrong-variable match tell — a bound `Some(ex)` never read is flagged (scrutinee spared)", () => {
    assert.deepEqual(flagged(`pure flow f(src: Option<Int>, other: Int) -> Int {\n  let exprOpt = src\n  match exprOpt {\n    Some(ex) => { return other }\n    None => { return 0 }\n    _ => { return 0 }\n  }\n}\n`), ["ex"]);
  });
  it("R3: a dead mut is flagged", () => {
    assert.deepEqual(flagged(`pure flow f(input: Int) -> Int {\n  mut acc = 0\n  return input\n}\n`), ["acc"]);
  });
  it("two dead bindings in one flow are both flagged", () => {
    assert.deepEqual(flagged(`pure flow f() -> Int {\n  let a = 1\n  let b = 2\n  return 0\n}\n`), ["a", "b"]);
  });

  // ── R4/F3: self-referential dead mut (a read only inside its own self-assignment RHS) IS flagged ──
  it("R4: `mut acc = acc + 1` with no other read is flagged (self-write is not a use)", () => {
    assert.deepEqual(flagged(`pure flow f() -> Int {\n  mut acc = 0\n  acc = acc + 1\n  return 0\n}\n`), ["acc"]);
  });

  // ── R4 no-false-positive controls: a real use OUTSIDE the self-assignment RHS keeps it live ──
  it("R4 control: a live accumulator (read in `return acc`) is NOT flagged", () => {
    assert.deepEqual(flagged(`pure flow f(n: Int) -> Int {\n  mut acc = 0\n  acc = acc + n\n  return acc\n}\n`), []);
  });
  it("R4 control: a read on ANOTHER var's assignment RHS keeps it live", () => {
    assert.deepEqual(flagged(`pure flow f(n: Int) -> Int {\n  mut acc = 0\n  mut out = 0\n  out = acc + n\n  return out\n}\n`), []);
  });
  it("R4 control: a loop counter read in the `while` condition is NOT flagged", () => {
    assert.deepEqual(flagged(`pure flow f(n: Int) -> Int {\n  mut i = 0\n  while i < n {\n    i = i + 1\n  }\n  return 0\n}\n`), []);
  });
});
