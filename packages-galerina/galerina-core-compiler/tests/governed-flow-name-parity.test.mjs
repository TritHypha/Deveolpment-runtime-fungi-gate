// =============================================================================
// Q1 KAT — governed-flow name parity (owner-approved, 2026-08-06)
//
// A governed flow parses to `kind: "governedFlowDecl"`, `value:
// "governed:<floor>:<name>"`. The old checker-lane lookup —
//   FLOW_DECL_KINDS.has(node.kind) && node.value === name
// — missed it twice, so effect-checker and profile-checker treated a governed
// flow as if it had no body (observedEffects empty; under-checked). The shared
// `flow-name.ts` decoder fixes that. These KATs prove the decoder against REAL
// parser output (not a hand-built AST), and demonstrate the two-fold miss.
//
// Discriminating controls throughout: the OLD shape is computed alongside the
// NEW one on the same node, so "found" vs "missed" is shown, not asserted.
// =============================================================================
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram } from "../dist/index.js";
import { decodeFlowDecl, isFlowDeclNamed, FLOW_DECL_KINDS } from "../dist/flow-name.js";

/** Depth-first find of the first node of a given kind. */
function findByKind(node, kind) {
  if (node.kind === kind) return node;
  for (const c of node.children ?? []) {
    const f = findByKind(c, kind);
    if (f !== undefined) return f;
  }
  return undefined;
}
/** The OLD, buggy lookup shape — kept here as the discriminating control. */
const OLD_SHAPE = (node, name) => FLOW_DECL_KINDS.has(node.kind) && node.value === name;

describe("Q1 — governed flow is found by its declared name", () => {
  it("the parser encodes a governed flow as governedFlowDecl with governed:<floor>:<name>", () => {
    const p = parseProgram(
      `governed floor_2 flow moveit(x: Int) -> Int contract { intent { "move" } } { return x }`,
      "gov.fungi",
    );
    assert.deepEqual((p.diagnostics ?? []).filter((d) => d.severity === "error"), [],
      "fixture sanity: the governed flow must parse with zero errors (a reserved name would void the test — IMP-134)");
    const node = findByKind(p.ast, "governedFlowDecl");
    assert.ok(node, "the parser must produce a governedFlowDecl node (fixture/parse sanity)");
    assert.equal(node.value, "governed:floor_2:moveit", "encoding is governed:<floor>:<name>");
  });

  it("★ the OLD shape MISSES the governed flow; the decoder FINDS it (the two-fold miss, fixed)", () => {
    const p = parseProgram(
      `governed floor_2 flow moveit(x: Int) -> Int contract { intent { "move" } } { return x }`,
      "gov.fungi",
    );
    assert.deepEqual((p.diagnostics ?? []).filter((d) => d.severity === "error"), [], "fixture sanity");
    const node = findByKind(p.ast, "governedFlowDecl");
    assert.equal(OLD_SHAPE(node, "moveit"), false, "control: the old lookup misses governed 'moveit'");
    assert.equal(isFlowDeclNamed(node, "moveit"), true, "the fix: the decoder finds governed 'moveit'");
  });

  it("the four non-governed tiers are found by both old and new (fix changes nothing for them)", () => {
    for (const [kw, kind] of [["flow", "flowDecl"], ["secure flow", "secureFlowDecl"],
                              ["pure flow", "pureFlowDecl"], ["guarded flow", "guardedFlowDecl"]]) {
      const p = parseProgram(`${kw} f(x: Int) -> Int contract { intent { "i" } } { return x }`, "t.fungi");
      const node = findByKind(p.ast, kind);
      assert.ok(node, `parser must produce a ${kind}`);
      assert.equal(OLD_SHAPE(node, "f"), true, `${kind}: old shape finds it`);
      assert.equal(isFlowDeclNamed(node, "f"), true, `${kind}: decoder finds it`);
    }
  });

  it("the floor is decoded and is load-bearing", () => {
    const p2 = parseProgram(`governed floor_2 flow g(x: Int) -> Int contract { intent { "i" } } { return x }`, "a.fungi");
    const p3 = parseProgram(`governed floor_3 flow g(x: Int) -> Int contract { intent { "i" } } { return x }`, "b.fungi");
    const d2 = decodeFlowDecl(findByKind(p2.ast, "governedFlowDecl"));
    const d3 = decodeFlowDecl(findByKind(p3.ast, "governedFlowDecl"));
    assert.equal(d2.name, "g"); assert.equal(d3.name, "g");
    assert.equal(d2.floor, "floor_2"); assert.equal(d3.floor, "floor_3");
    assert.notEqual(d2.floor, d3.floor, "floor_2 and floor_3 must be distinguishable");
  });

  it("a malformed governed value is an ERROR, never a silent name (owner condition 3)", () => {
    for (const bad of ["governed:floor_2:", "governed::x", "", "flow:floor_2:x", "governed"]) {
      const r = decodeFlowDecl({ kind: "governedFlowDecl", value: bad });
      assert.ok(r && "error" in r, `malformed ${JSON.stringify(bad)} must return an error, not a name`);
    }
  });

  it("a qualified governed name containing ':' survives (slice(2).join, not [2])", () => {
    const r = decodeFlowDecl({ kind: "governedFlowDecl", value: "governed:floor_3:ns:sub:flow" });
    assert.equal(r.name, "ns:sub:flow", "the whole tail is the name; [2] would return only 'ns'");
    assert.equal(r.floor, "floor_3");
  });

  it("a non-flow node decodes to undefined (not a name, not an error)", () => {
    assert.equal(decodeFlowDecl({ kind: "callExpr", value: "transfer" }), undefined);
  });
});
