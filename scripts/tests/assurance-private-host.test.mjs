import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRIT } from "../lib/assurance-fabric/result-model.mjs";
import {
  canonicalJson,
  createPrivateAssuranceHost,
} from "../lib/assurance-fabric/private-host.mjs";
import { createUnsafeObservationIntake } from "../lib/assurance-fabric/unsafe-observation.mjs";

const envelope = Object.freeze({
  schemaVersion: 1,
  componentDigest: "sha256:" + "11".repeat(32),
  policyDigest: "sha256:" + "22".repeat(32),
  target: "node-esm",
  abi: "galerina.assurance-host.v1",
  dependencyClosureDigest: "sha256:" + "33".repeat(32),
  capabilityDigest: "sha256:" + "44".repeat(32),
  buildPoint: "git:" + "55".repeat(20),
  epoch: 1,
  evidenceSetDigest: "sha256:" + "66".repeat(32),
});

const config = Object.freeze({
  profileId: "profile:chapter-one",
  policyDigest: envelope.policyDigest,
  target: envelope.target,
  abi: envelope.abi,
  buildPoint: envelope.buildPoint,
  subjects: Object.freeze([
    Object.freeze({ subjectId: "subject:component", digest: envelope.componentDigest }),
  ]),
});

const assuredCoordinates = Object.freeze({ data: 1, component: 1, authority: 1 });

function makeObservationCandidate() {
  const intake = createUnsafeObservationIntake({ maxBytes: 4096 });
  const bytes = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    analyzerId: "analyzer:fixture",
    subjectId: "subject:component",
    outcome: "UNKNOWN",
    authorityCeiling: 0,
    findings: [],
    measurements: [],
    generatedArtifact: { kind: "absent", reason: "none" },
  }));
  return intake.validate(intake.capture(bytes, "analyzer:fixture")).value;
}

describe("private VOK Signet and Wax Seal host", () => {
  it("admits exactly one Tri-1 vector and exposes no analyzer authority methods", () => {
    const { analyzerApi, hostApi } = createPrivateAssuranceHost(config);
    assert.deepEqual(Object.keys(analyzerApi).sort(), ["subject", "submit"]);
    assert.equal(analyzerApi.admit, undefined);
    assert.equal(analyzerApi.openLease, undefined);
    assert.equal(analyzerApi.consumeLease, undefined);

    const values = [-1, 0, 1];
    let admitted = 0;
    for (const data of values) {
      for (const component of values) {
        for (const authority of values) {
          try {
            hostApi.admit(envelope, { data, component, authority });
            admitted += 1;
          } catch (error) {
            assert.match(error.message, /admission coordinates/);
          }
        }
      }
    }
    assert.equal(admitted, 1);
  });

  it("provides immutable declared subjects and accepts only branded observation candidates", () => {
    const { analyzerApi } = createPrivateAssuranceHost(config);
    const subject = analyzerApi.subject("subject:component");
    assert.deepEqual(subject, config.subjects[0]);
    assert.equal(Object.isFrozen(subject), true);
    assert.throws(() => analyzerApi.subject("subject:missing"), /undeclared/);

    const candidate = makeObservationCandidate();
    const pending = analyzerApi.submit(candidate);
    assert.equal(Object.isFrozen(pending), true);
    assert.throws(() => analyzerApi.submit(structuredClone(candidate)), /validated observation/);
    assert.throws(() => analyzerApi.submit(Object.freeze({})), /validated observation/);
  });

  it("uses affine admitted and lease handles and emits a terminal non-authorizing seal", () => {
    const { hostApi } = createPrivateAssuranceHost(config);
    const admitted = hostApi.admit(envelope, assuredCoordinates);
    assert.throws(() => hostApi.openLease(structuredClone(admitted)), /foreign or consumed/);
    const lease = hostApi.openLease(admitted);
    assert.throws(() => hostApi.openLease(admitted), /foreign or consumed/);
    assert.throws(() => hostApi.consumeLease(structuredClone(lease), "CONSUMED"), /foreign or consumed/);
    const seal = hostApi.consumeLease(lease, "CONSUMED");
    assert.equal(seal.kind, "WAX_SEAL");
    assert.equal(seal.authentication, "UNAUTHENTICATED_REFERENCE");
    assert.equal(seal.authorizing, false);
    assert.equal(seal.replayable, false);
    assert.equal(Object.isFrozen(seal), true);
    assert.throws(() => hostApi.consumeLease(lease, "CONSUMED"), /foreign or consumed/);
    assert.throws(() => hostApi.openLease(seal), /foreign or consumed/);
  });

  it("classifies missing as zero and every broken, copied, wrong-subject or revoked seal as minus one", () => {
    const { hostApi } = createPrivateAssuranceHost(config);
    const seal = hostApi.consumeLease(
      hostApi.openLease(hostApi.admit(envelope, assuredCoordinates)),
      "CONSUMED",
    );
    assert.equal(hostApi.classifySeal({ kind: "absent", reason: "not produced" }, "subject:component"), TRIT.UNKNOWN);
    assert.equal(hostApi.classifySeal(seal, "subject:component"), TRIT.ASSURED);
    assert.equal(hostApi.classifySeal(seal, "subject:other"), TRIT.DISTRUSTED);
    assert.equal(hostApi.classifySeal(structuredClone(seal), "subject:component"), TRIT.DISTRUSTED);

    for (const key of Object.keys(seal)) {
      const broken = { ...seal, [key]: typeof seal[key] === "boolean" ? !seal[key] : "broken" };
      assert.equal(hostApi.classifySeal(broken, "subject:component"), TRIT.DISTRUSTED, key);
    }

    hostApi.revokeSubject("subject:component");
    assert.equal(hostApi.classifySeal(seal, "subject:component"), TRIT.DISTRUSTED);
  });

  it("refuses context drift at both affine transitions", () => {
    const first = createPrivateAssuranceHost(config).hostApi;
    const admitted = first.admit(envelope, assuredCoordinates);
    first.rotateContext({
      policyDigest: envelope.policyDigest,
      target: envelope.target,
      abi: envelope.abi,
      buildPoint: "git:" + "77".repeat(20),
    });
    assert.throws(() => first.openLease(admitted), /context drift/);

    const second = createPrivateAssuranceHost(config).hostApi;
    const lease = second.openLease(second.admit(envelope, assuredCoordinates));
    second.rotateContext({
      policyDigest: envelope.policyDigest,
      target: envelope.target,
      abi: envelope.abi,
      buildPoint: "git:" + "77".repeat(20),
    });
    assert.throws(() => second.consumeLease(lease, "CONSUMED"), /context drift/);

    const third = createPrivateAssuranceHost(config).hostApi;
    const seal = third.consumeLease(
      third.openLease(third.admit(envelope, assuredCoordinates)),
      "CONSUMED",
    );
    third.rotateContext({
      policyDigest: envelope.policyDigest,
      target: envelope.target,
      abi: envelope.abi,
      buildPoint: "git:" + "77".repeat(20),
    });
    assert.equal(third.classifySeal(seal, "subject:component"), TRIT.DISTRUSTED);
  });

  it("rejects malformed envelopes, coordinate fields and terminal outcomes", () => {
    const { hostApi } = createPrivateAssuranceHost(config);
    assert.throws(() => hostApi.admit({ ...envelope, surplus: true }, assuredCoordinates), /Envelope/);
    assert.throws(() => hostApi.admit({ ...envelope, policyDigest: "sha256:" + "99".repeat(32) }, assuredCoordinates), /context/);
    assert.throws(() => hostApi.admit(envelope, { ...assuredCoordinates, surplus: 0 }), /coordinates/);
    const lease = hostApi.openLease(hostApi.admit(envelope, assuredCoordinates));
    assert.throws(() => hostApi.consumeLease(lease, "ALLOW"), /terminal outcome/);
  });

  it("canonical encoding refuses ambiguous and unbounded structures without invoking accessors", () => {
    assert.throws(() => canonicalJson(null), /absence sentinels/);
    assert.throws(() => canonicalJson(Number.NaN), /safe integers/);
    assert.throws(() => canonicalJson(Number.POSITIVE_INFINITY), /safe integers/);
    assert.throws(() => canonicalJson(new Proxy({}, {})), /ordinary exact objects/);
    assert.throws(() => canonicalJson({ [Symbol("x")]: 1 }), /symbol keys/);
    assert.throws(() => canonicalJson(new Array(1)), /holes or surplus/);

    let getterRan = false;
    const accessor = {};
    Object.defineProperty(accessor, "x", {
      enumerable: true,
      get() {
        getterRan = true;
        return 1;
      },
    });
    assert.throws(() => canonicalJson(accessor), /ordinary enumerable data/);
    assert.equal(getterRan, false);

    const cycle = {};
    cycle.self = cycle;
    assert.throws(() => canonicalJson(cycle), /structural bounds/);
    let deep = {};
    for (let index = 0; index < 65; index += 1) deep = { child: deep };
    assert.throws(() => canonicalJson(deep), /structural bounds/);
    assert.throws(() => canonicalJson(Array.from({ length: 4096 }, (_, index) => index)), /structural bounds/);
  });
});
