import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESULT_TAG,
  SOURCE_CLASS,
  TRIT,
  foldRequiredTrits,
  isBlockingFailure,
  makeAssuranceResult,
} from "../lib/assurance-fabric/result-model.mjs";

describe("assurance result model", () => {
  it("authorizes exactly one of 27 three-coordinate vectors", () => {
    const values = [TRIT.DISTRUSTED, TRIT.UNKNOWN, TRIT.ASSURED];
    let authorizing = 0;
    for (const data of values) {
      for (const component of values) {
        for (const authority of values) {
          if (foldRequiredTrits([data, component, authority]) === TRIT.ASSURED) {
            authorizing += 1;
          }
        }
      }
    }
    assert.equal(authorizing, 1);
  });

  it("refuses empty, non-trit and non-finite folds", () => {
    assert.throws(() => foldRequiredTrits([]), /non-empty/);
    assert.throws(() => foldRequiredTrits([2]), /closed trit/);
    assert.throws(() => foldRequiredTrits([Number.NaN]), /closed trit/);
  });

  it("an analyzer cannot construct a blocking pass", () => {
    assert.throws(() => makeAssuranceResult({
      tag: RESULT_TAG.BLOCKING_PASS,
      sourceClass: SOURCE_CLASS.ANALYZER,
      subjectId: "subject:a",
      detail: "self asserted",
      trit: TRIT.ASSURED,
    }), /host-derived/);
  });

  it("refuses surplus, absent, forged and non-closed result values", () => {
    const base = {
      tag: RESULT_TAG.UNKNOWN,
      sourceClass: SOURCE_CLASS.ANALYZER,
      subjectId: "subject:a",
      detail: "bounded unknown",
      trit: TRIT.UNKNOWN,
    };
    assert.throws(() => makeAssuranceResult({ ...base, authorizing: false }), /closed schema/);
    assert.throws(() => makeAssuranceResult({ ...base, detail: null }), /non-empty/);
    assert.throws(() => makeAssuranceResult({ ...base, trit: Number.NaN }), /invalid/);
    assert.throws(() => makeAssuranceResult(new Proxy(base, {})), /exact ordinary/);

    const inherited = Object.assign(Object.create({ inherited: true }), base);
    assert.throws(() => makeAssuranceResult(inherited), /exact ordinary/);

    let getterRan = false;
    const accessor = { ...base };
    Object.defineProperty(accessor, "detail", {
      enumerable: true,
      get() {
        getterRan = true;
        return "forged detail";
      },
    });
    assert.throws(() => makeAssuranceResult(accessor), /ordinary data fields/);
    assert.equal(getterRan, false);
  });

  it("distinguishes blocking failures without upgrading other outcomes", () => {
    const blocking = makeAssuranceResult({
      tag: RESULT_TAG.BLOCKING_FAIL,
      sourceClass: SOURCE_CLASS.HOST,
      subjectId: "subject:a",
      detail: "host refusal",
      trit: TRIT.DISTRUSTED,
    });
    const advisory = makeAssuranceResult({
      tag: RESULT_TAG.ADVISORY_FINDINGS,
      sourceClass: SOURCE_CLASS.ANALYZER,
      subjectId: "subject:a",
      detail: "advisory finding",
      trit: TRIT.DISTRUSTED,
    });
    assert.equal(isBlockingFailure(blocking), true);
    assert.equal(isBlockingFailure(advisory), false);
    assert.equal(Object.isFrozen(blocking), true);
  });
});
