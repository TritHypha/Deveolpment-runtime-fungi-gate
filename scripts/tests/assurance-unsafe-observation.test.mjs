import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createUnsafeObservationIntake,
  isValidatedObservationCandidate,
} from "../lib/assurance-fabric/unsafe-observation.mjs";

function validObservation(overrides = {}) {
  return {
    schemaVersion: 1,
    analyzerId: "analyzer:fixture",
    subjectId: "subject:fixture",
    outcome: "UNKNOWN",
    authorityCeiling: 0,
    findings: [],
    measurements: [],
    generatedArtifact: { kind: "absent", reason: "no output proposed" },
    ...overrides,
  };
}

function encoded(value) {
  return Buffer.from(JSON.stringify(value), "utf8");
}

describe("unsafe analyzer observation intake", () => {
  it("preserves boundary-untrusted state through derivation", () => {
    const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
    const raw = intake.capture(encoded(validObservation()), "analyzer:fixture");
    const trimmed = intake.derive(
      raw,
      "trim",
      (bytes) => Buffer.from(bytes.toString("utf8").trim()),
    );

    assert.equal(intake.stateOf(raw), "boundary-untrusted");
    assert.equal(intake.stateOf(trimmed), "boundary-untrusted");
    const accepted = intake.validate(trimmed);
    assert.equal(accepted.kind, "accepted");
    assert.equal(accepted.value.authorityCeiling, 0);
    assert.equal(Object.isFrozen(accepted.value), true);
    assert.equal(isValidatedObservationCandidate(accepted.value), true);

    const copiedRaw = structuredClone(raw);
    assert.equal(intake.stateOf(copiedRaw), "foreign");
    assert.equal(intake.validate(copiedRaw).kind, "refused");
    assert.equal(isValidatedObservationCandidate(structuredClone(accepted.value)), false);
  });

  it("admits typed findings and bounded measurements without authority upgrade", () => {
    const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
    const observation = validObservation({
      outcome: "ADVISORY_FINDINGS",
      authorityCeiling: -1,
      findings: [{
        findingId: "finding:one",
        authorityClass: "advisory",
        detail: "text may mention pass or allow without becoming authority",
      }],
      measurements: [{
        measurementId: "measurement:one",
        value: 7,
        unit: "count",
        evidenceClass: "observed",
      }],
    });
    const accepted = intake.validate(intake.capture(encoded(observation), "analyzer:fixture"));
    assert.equal(accepted.kind, "accepted");
    assert.equal(accepted.value.authorityCeiling, -1);
    assert.equal(accepted.value.findings[0].authorityClass, "advisory");
  });

  it("refuses forged handles, invalid limits and non-buffer transforms", () => {
    assert.throws(() => createUnsafeObservationIntake({ maxBytes: 0 }), /bounded positive/);
    const intake = createUnsafeObservationIntake({ maxBytes: 64 });
    assert.throws(() => intake.capture(Buffer.alloc(65), "analyzer:fixture"), /exceed/);
    assert.equal(intake.validate(Object.freeze({})).kind, "refused");

    const raw = intake.capture(Buffer.from("{}"), "analyzer:fixture");
    assert.throws(
      () => intake.derive(raw, "wrong", (bytes) => new Uint8Array(bytes)),
      /return a Buffer/,
    );
  });

  it("refuses malformed bytes, JSON ambiguity and origin substitution", () => {
    const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
    assert.equal(intake.validate(intake.capture(Buffer.from([0xc3, 0x28]), "analyzer:fixture")).kind, "refused");
    assert.equal(intake.validate(intake.capture(Buffer.from("{"), "analyzer:fixture")).kind, "refused");
    assert.equal(intake.validate(intake.capture(
      Buffer.from('{"schemaVersion":1,"schemaVersion":1}', "utf8"),
      "analyzer:fixture",
    )).kind, "refused");
    assert.equal(intake.validate(intake.capture(
      encoded(validObservation({ analyzerId: "analyzer:substitute" })),
      "analyzer:fixture",
    )).kind, "refused");
  });

  it("refuses null, surplus fields and every authority-positive expression", () => {
    const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
    const refused = (value) => intake.validate(intake.capture(encoded(value), "analyzer:fixture")).kind;
    assert.equal(refused(validObservation({ generatedArtifact: null })), "refused");
    assert.equal(refused({ ...validObservation(), authorizing: true }), "refused");
    assert.equal(refused(validObservation({ authorityCeiling: 1 })), "refused");
    assert.equal(refused(validObservation({ outcome: "BLOCKING_PASS" })), "refused");
    assert.equal(refused(validObservation({ outcome: "pass" })), "refused");
    assert.equal(refused(validObservation({ outcome: "allow" })), "refused");
    assert.equal(refused(validObservation({ outcome: "UNRECOGNIZED" })), "refused");
  });

  it("refuses non-finite and unbounded measurement values", () => {
    const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
    const raw = '{"schemaVersion":1,"analyzerId":"analyzer:fixture","subjectId":"subject:fixture",' +
      '"outcome":"INFORMATIONAL","authorityCeiling":0,"findings":[],' +
      '"measurements":[{"measurementId":"m","value":1e999,"unit":"count","evidenceClass":"observed"}],' +
      '"generatedArtifact":{"kind":"absent","reason":"none"}}';
    assert.equal(intake.validate(intake.capture(Buffer.from(raw), "analyzer:fixture")).kind, "refused");
    const fractional = validObservation({
      measurements: [{ measurementId: "m", value: 1.5, unit: "count", evidenceClass: "observed" }],
    });
    assert.equal(intake.validate(intake.capture(encoded(fractional), "analyzer:fixture")).kind, "refused");
  });

  it("refuses contradictory outcomes and duplicate typed identities", () => {
    const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
    const check = (value) => intake.validate(intake.capture(encoded(value), "analyzer:fixture")).kind;
    assert.equal(check(validObservation({ outcome: "ADVISORY_FINDINGS" })), "refused");
    assert.equal(check(validObservation({ outcome: "BLOCKING_FAIL", authorityCeiling: -1 })), "refused");
    const finding = { findingId: "finding:duplicate", authorityClass: "advisory", detail: "one" };
    assert.equal(check(validObservation({ findings: [finding, { ...finding, detail: "two" }] })), "refused");
    const measurement = {
      measurementId: "measurement:duplicate",
      value: 1,
      unit: "count",
      evidenceClass: "observed",
    };
    assert.equal(check(validObservation({ measurements: [measurement, { ...measurement, value: 2 }] })), "refused");
  });
});
