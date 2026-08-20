import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

describe("RD-0858 requirement semantic algebra", () => {
  it("exports the closed semantic helpers", () => {
    assert.equal(typeof L.liftRequirementValue, "function");
    assert.equal(typeof L.foldRequirementValues, "function");
  });

  it("lifts only the five exact Bool and Verdict rows", () => {
    assert.equal(L.liftRequirementValue(false), -1);
    assert.equal(L.liftRequirementValue(true), 1);
    assert.equal(L.liftRequirementValue(-1), -1);
    assert.equal(L.liftRequirementValue(0), 0);
    assert.equal(L.liftRequirementValue(1), 1);

    for (const value of [2, -2, "true", "allow", {}, [], null, undefined]) {
      assert.equal(L.liftRequirementValue(value), undefined);
    }
  });

  it("implements every binary K3 minimum vector", () => {
    for (const left of [-1, 0, 1]) {
      for (const right of [-1, 0, 1]) {
        assert.deepEqual(
          L.foldRequirementValues([left, right]),
          { ok: true, verdict: Math.min(left, right) },
        );
      }
    }
  });

  it("folds mixed Bool and Verdict values without coercion", () => {
    assert.deepEqual(
      L.foldRequirementValues([true, 0, true]),
      { ok: true, verdict: 0 },
    );
    assert.deepEqual(
      L.foldRequirementValues([true, false, 1]),
      { ok: true, verdict: -1 },
    );
  });

  it("refuses empty input instead of minting UNKNOWN or ALLOW", () => {
    const result = L.foldRequirementValues([]);
    assert.deepEqual(result, { ok: false, reason: "EMPTY", ordinal: 0 });
    assert.ok(Object.isFrozen(result));
  });

  it("consumes every normally yielded ordinal after an early DENY", () => {
    const visited = [];
    function* values() {
      for (const [ordinal, value] of [[0, 1], [1, -1], [2, 0], [3, 1]]) {
        visited.push(ordinal);
        yield value;
      }
    }

    const result = L.foldRequirementValues(values());
    assert.deepEqual(result, { ok: true, verdict: -1 });
    assert.deepEqual(visited, [0, 1, 2, 3]);
    assert.ok(Object.isFrozen(result));
  });

  it("refuses the exact first non-canonical ordinal", () => {
    const result = L.foldRequirementValues([true, 0, 2, -1]);
    assert.deepEqual(
      result,
      { ok: false, reason: "NON_CANONICAL", ordinal: 2 },
    );
    assert.ok(Object.isFrozen(result));
  });

  it("propagates operational iterator failures rather than converting them", () => {
    const failure = new Error("controlled iterator failure");
    function* values() {
      yield true;
      throw failure;
    }

    assert.throws(() => L.foldRequirementValues(values()), (error) => error === failure);
  });
});
