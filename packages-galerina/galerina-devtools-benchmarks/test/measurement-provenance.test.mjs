import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMeasurementRecord,
  validateMeasurementRecord,
} from "../src/measurement-provenance.mjs";

const resultRaw = "[{\"benchmark\":\"fixture\"}]";
const input = Object.freeze({
  measuredAt: "2026-08-12T20:57:50.457Z",
  resultRaw,
  galerinaCommit: "55fe5eea614cbfc8149916607ac55b8ea1ac3c3a",
  slideCommit: "c908d891efc06b409e16d2ce31fad56f6e469f4a",
  toolchains: Object.freeze({
    node: "v24.18.0",
    python: "Python 3.14.6",
    rust: "rustc 1.96.1",
    go: "go version go1.26.5 windows/amd64",
  }),
});

test("measurement provenance preserves the measurement buildpoint", () => {
  const record = buildMeasurementRecord(input);
  const verified = validateMeasurementRecord(record, resultRaw);

  assert.equal(verified.schemaVersion, 1);
  assert.equal(verified.measuredAt, input.measuredAt);
  assert.equal(verified.galerinaCommit, input.galerinaCommit);
  assert.equal(verified.slideCommit, input.slideCommit);
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.toolchains), true);
});

test("measurement provenance refuses a different result body", () => {
  const record = buildMeasurementRecord(input);
  assert.throws(
    () => validateMeasurementRecord(record, "[{\"benchmark\":\"different\"}]"),
    /resultSha256 does not match/u,
  );
});

test("measurement provenance refuses surplus fields and invalid commits", () => {
  const record = buildMeasurementRecord(input);
  assert.throws(
    () => validateMeasurementRecord({ ...record, authorityReleased: true }, resultRaw),
    /exact keys/u,
  );
  assert.throws(
    () => buildMeasurementRecord({ ...input, galerinaCommit: "not-a-commit" }),
    /galerinaCommit/u,
  );
});
