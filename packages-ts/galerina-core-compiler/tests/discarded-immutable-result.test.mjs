// A collection transform returns a new value.  Discarding that value is almost
// certainly an attempted mutation and must fail closed instead of doing nothing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkTypes, parseProgram } from "../dist/index.js";

const CODE = "FUNGI-TYPE-028";

function diagnostics(source) {
  const parsed = parseProgram(source, "discarded-immutable-result.fungi");
  assert.equal(parsed.diagnostics.length, 0, `source must parse: ${JSON.stringify(parsed.diagnostics)}`);
  return checkTypes(parsed.ast).diagnostics;
}

function hasCode(source) {
  return diagnostics(source).some((diagnostic) => diagnostic.code === CODE);
}

describe("discarded immutable collection result (FUNGI-TYPE-028)", () => {
  it("refuses a discarded Array.push result", () => {
    assert.equal(hasCode(`pure flow bad() -> Int {
      mut items: Array<Int> = []
      items.push(1)
      return items.count()
    }`), true);
  });

  it("refuses a discarded Array.append result", () => {
    assert.equal(hasCode(`pure flow bad() -> Int {
      mut items: Array<Int> = []
      items.append(1)
      return items.count()
    }`), true);
  });

  it("admits explicit rebinding of the returned collection", () => {
    assert.equal(hasCode(`pure flow good() -> Int {
      mut items: Array<Int> = []
      items = items.push(1)
      return items.count()
    }`), false);
  });

  it("admits a returned immutable transform", () => {
    assert.equal(hasCode(`pure flow good(items: Array<Int>) -> Array<Int> {
      return items.append(1)
    }`), false);
  });

  it("does not classify a nested immutable transform as discarded", () => {
    assert.equal(hasCode(`pure flow consume(items: Array<Int>) -> Int { return items.count() }
    pure flow good(items: Array<Int>) -> Int {
      return consume(items.append(1))
    }`), false);
  });
});
