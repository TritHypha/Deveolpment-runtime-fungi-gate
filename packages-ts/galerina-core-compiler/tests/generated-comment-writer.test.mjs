// =============================================================================
// //fungi: source WRITER (R&D 0045, decision #3: silently overwrite the machine-owned tier)
// rewriteGeneratedComments() must touch ONLY //fungi: lines — never a human // line or any code.
// =============================================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rewriteGeneratedComments } from "../dist/index.js";

const gen = new Map([
  ["leaf", ["//fungi: USEDBY: (1) top", "//fungi: IMPACT: (1)", "//fungi: COMPLEXITY: 3"]],
  ["top", ["//fungi: USES: (1) leaf", "//fungi: IMPACT: (0) — safe to delete"]],
]);

describe("rewriteGeneratedComments — safe //fungi: overwrite", () => {
  it("inserts the //fungi: block immediately above each flow, preserving human // + code", () => {
    const src = [
      "// HUMAN: stable core",
      "pure flow leaf(x: Int) -> Int { return x }",
      "",
      "// HUMAN: entry",
      "pure flow top(x: Int) -> Int { return leaf(x) }",
    ].join("\n");
    const out = rewriteGeneratedComments(src, gen).split("\n");
    assert.equal(out[0], "// HUMAN: stable core", "human comment preserved");
    assert.deepEqual(out.slice(1, 4), ["//fungi: USEDBY: (1) top", "//fungi: IMPACT: (1)", "//fungi: COMPLEXITY: 3"]);
    assert.equal(out[4], "pure flow leaf(x: Int) -> Int { return x }", "flow code preserved");
    assert.equal(out.includes("// HUMAN: entry"), true, "second human comment preserved");
  });

  it("is idempotent — a second pass changes nothing (no duplicated blocks)", () => {
    const src = "pure flow top(x: Int) -> Int { return leaf(x) }\npure flow leaf(x: Int) -> Int { return x }";
    const once = rewriteGeneratedComments(src, gen);
    const twice = rewriteGeneratedComments(once, gen);
    assert.equal(once, twice, "rewriting an already-current file must be a no-op");
  });

  it("OVERWRITES a stale //fungi: block (does not append a second one)", () => {
    const stale = [
      "//fungi: USEDBY: (99) wrong",
      "//fungi: IMPACT: (99)",
      "pure flow leaf(x: Int) -> Int { return x }",
    ].join("\n");
    const out = rewriteGeneratedComments(stale, gen);
    assert.equal((out.match(/\/\/fungi: USEDBY/g) || []).length, 1, "exactly one USEDBY line (old replaced, not duplicated)");
    assert.ok(out.includes("//fungi: USEDBY: (1) top"), "the fresh value replaced the stale (99)");
    assert.ok(!out.includes("(99)"), "the stale block is gone");
  });

  it("never touches a human // line that merely resembles metadata", () => {
    const src = [
      "// note: this flow is USEDBY many — see the wiki",
      "pure flow leaf(x: Int) -> Int { return x }",
    ].join("\n");
    const out = rewriteGeneratedComments(src, gen).split("\n");
    assert.equal(out[0], "// note: this flow is USEDBY many — see the wiki", "a human // line is never modified");
  });

  it("a flow not in the gen-map is left untouched", () => {
    const src = "pure flow other(x: Int) -> Int { return x }";
    assert.equal(rewriteGeneratedComments(src, gen), src, "unknown flow → no change");
  });

  it("preserves the flow's indentation on the inserted //fungi: lines", () => {
    const src = "  pure flow leaf(x: Int) -> Int { return x }";
    const out = rewriteGeneratedComments(src, gen).split("\n");
    assert.ok(out[0].startsWith("  //fungi:"), "inserted lines match the flow's indentation");
    assert.equal(out[out.length - 1], "  pure flow leaf(x: Int) -> Int { return x }");
  });
});
