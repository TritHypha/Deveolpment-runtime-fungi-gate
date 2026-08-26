import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

const digest = (byte) => byte.repeat(64);

const request = () => ({
  schemaVersion: 1,
  nonce: "00112233445566778899aabbccddeeff",
  runtimeProfile: "scalar-1",
  subjectDigest: digest("0"),
  flowLocator: "rd0858/unit4/scalar-oracle",
  flowDigest: digest("1"),
  argumentDigest: digest("2"),
  argumentBytes: "eyJzdWJqZWN0Ijp0cnVlfQ==",
});

const receipt = () => ({
  schemaVersion: 1,
  hashAlgorithm: "sha256",
  launcherDigest: digest("0"),
  processOwnerDigest: digest("1"),
  runtimeDigest: digest("2"),
  workerDigest: digest("3"),
  registryDigest: digest("4"),
  osEvidenceLocator: "evidence/os/windows-job-v1",
  processPolicyEvidenceLocator: "evidence/process/single-worker-v1",
  environmentPolicyDigest: digest("5"),
  scalarProfileDigest: digest("6"),
  requestDigest: digest("7"),
  subjectDigest: digest("8"),
  flowDigest: digest("9"),
  argumentDigest: digest("a"),
  responseDigest: digest("b"),
  valueDigest: digest("c"),
  auditDigest: digest("d"),
  nonce: "00112233445566778899aabbccddeeff",
  monotonicDurationMs: 17,
  executionState: "REFUSED",
  timedOut: false,
  truncated: false,
  partial: false,
  missingEvidence: [],
  exitCode: 1,
  refusalCode: "WORKER_NOT_ADMITTED",
  authorizing: false,
});

function rawFrame(body, declaredLength = body.length) {
  const prefix = Buffer.alloc(8);
  prefix.writeBigUInt64BE(BigInt(declaredLength));
  return Buffer.concat([prefix, Buffer.from(body)]);
}

function call(name, ...args) {
  assert.equal(typeof L[name], "function", `${name} must be exported`);
  return L[name](...args);
}

describe("RD-0858 Unit 4 bounded process protocol", () => {
  it("exports the frozen proof-slice constants", () => {
    assert.equal(L.PROTOCOL_SCHEMA_VERSION, 1);
    assert.equal(L.SCALAR_PROFILE, "scalar-1");
    assert.equal(L.MAX_FRAME_BYTES, 262_144);
    assert.equal(L.MAX_JSON_DEPTH, 32);
    assert.equal(L.MAX_JSON_VALUES, 4_096);
  });

  it("round-trips one canonical launcher request", () => {
    const expected = request();
    const frame = call("encodeCanonicalFrame", "launcher-request", expected);
    assert.equal(frame.byteLength > 8, true);
    assert.deepEqual(call("decodeCanonicalFrame", "launcher-request", frame), expected);
  });

  it("produces deterministic canonical bytes and digest", () => {
    const first = call("encodeCanonicalFrame", "launcher-request", request());
    const reversed = Object.fromEntries(Object.entries(request()).reverse());
    const second = call("encodeCanonicalFrame", "launcher-request", reversed);
    assert.deepEqual(second, first);
    assert.equal(call("hashProtocolBytes", first), call("hashProtocolBytes", second));
    assert.match(call("hashProtocolBytes", first), /^[0-9a-f]{64}$/);
  });

  it("refuses a duplicate key before object construction", () => {
    assert.equal(typeof L.decodeCanonicalFrame, "function", "decodeCanonicalFrame must be exported");
    const canonical = JSON.stringify(request());
    const duplicate = canonical.replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1');
    assert.throws(
      () => call("decodeCanonicalFrame", "launcher-request", rawFrame(duplicate)),
      /DUPLICATE|canonical|refus/i,
    );
  });

  it("refuses an unknown field", () => {
    assert.equal(typeof L.encodeCanonicalFrame, "function", "encodeCanonicalFrame must be exported");
    assert.throws(
      () => call("encodeCanonicalFrame", "launcher-request", { ...request(), authorizing: true }),
      /UNKNOWN|field|refus/i,
    );
  });

  it("refuses invalid UTF-8", () => {
    assert.equal(typeof L.decodeCanonicalFrame, "function", "decodeCanonicalFrame must be exported");
    assert.throws(
      () => call("decodeCanonicalFrame", "launcher-request", rawFrame(Buffer.from([0xc3, 0x28]))),
      /UTF|canonical|refus/i,
    );
  });

  it("refuses whitespace and non-canonical key order", () => {
    assert.equal(typeof L.decodeCanonicalFrame, "function", "decodeCanonicalFrame must be exported");
    const nonCanonical = JSON.stringify(request(), null, 2);
    assert.throws(
      () => call("decodeCanonicalFrame", "launcher-request", rawFrame(nonCanonical)),
      /canonical|refus/i,
    );
  });

  it("refuses zero, truncated, oversized and trailing frames", () => {
    assert.equal(typeof L.decodeCanonicalFrame, "function", "decodeCanonicalFrame must be exported");
    assert.equal(typeof L.encodeCanonicalFrame, "function", "encodeCanonicalFrame must be exported");
    assert.throws(() => call("decodeCanonicalFrame", "launcher-request", Buffer.alloc(8)), /FRAME|refus/i);
    assert.throws(() => call("decodeCanonicalFrame", "launcher-request", rawFrame("{}", 3)), /FRAME|refus/i);
    assert.throws(
      () => call("decodeCanonicalFrame", "launcher-request", rawFrame(Buffer.alloc(262_145, 0x20))),
      /FRAME|bound|refus/i,
    );
    const valid = call("encodeCanonicalFrame", "launcher-request", request());
    assert.throws(
      () => call("decodeCanonicalFrame", "launcher-request", Buffer.concat([valid, Buffer.from("x")])),
      /FRAME|trailing|refus/i,
    );
  });

  it("refuses depth and value-count ceilings before JSON parsing", () => {
    assert.equal(typeof L.decodeCanonicalFrame, "function", "decodeCanonicalFrame must be exported");
    const deep = `${"[".repeat(33)}0${"]".repeat(33)}`;
    assert.throws(() => call("decodeCanonicalFrame", "worker-result", rawFrame(deep)), /DEPTH|bound|refus/i);
    const wide = `[${Array.from({ length: 4_097 }, () => "0").join(",")}]`;
    assert.throws(() => call("decodeCanonicalFrame", "worker-result", rawFrame(wide)), /VALUE|bound|refus/i);
  });

  it("refuses accessors without invoking them", () => {
    assert.equal(typeof L.encodeCanonicalFrame, "function", "encodeCanonicalFrame must be exported");
    let reads = 0;
    const hostile = request();
    Object.defineProperty(hostile, "schemaVersion", {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    assert.throws(() => call("encodeCanonicalFrame", "launcher-request", hostile), /ACCESSOR|record|refus/i);
    assert.equal(reads, 0);
  });

  it("validates and freezes a non-authorizing receipt", () => {
    const validated = call("validateNonAuthorizingReceipt", receipt());
    assert.equal(validated.authorizing, false);
    assert.equal(validated.executionState, "REFUSED");
    assert.equal(Object.isFrozen(validated), true);
    assert.equal(Object.isFrozen(validated.missingEvidence), true);
  });

  it("refuses authorizing and body-bearing receipts", () => {
    assert.equal(
      typeof L.validateNonAuthorizingReceipt,
      "function",
      "validateNonAuthorizingReceipt must be exported",
    );
    assert.throws(
      () => call("validateNonAuthorizingReceipt", { ...receipt(), authorizing: true }),
      /AUTHORIZ|refus/i,
    );
    assert.throws(
      () => call("validateNonAuthorizingReceipt", { ...receipt(), source: "copied body" }),
      /UNKNOWN|BODY|field|refus/i,
    );
  });

  it("refuses non-scalar profiles and open execution states", () => {
    assert.equal(typeof L.encodeCanonicalFrame, "function", "encodeCanonicalFrame must be exported");
    assert.equal(
      typeof L.validateNonAuthorizingReceipt,
      "function",
      "validateNonAuthorizingReceipt must be exported",
    );
    assert.throws(
      () => call("encodeCanonicalFrame", "launcher-request", { ...request(), runtimeProfile: "64" }),
      /PROFILE|scalar|refus/i,
    );
    assert.throws(
      () => call("validateNonAuthorizingReceipt", { ...receipt(), executionState: "TIMEOUT" }),
      /STATE|execution|refus/i,
    );
  });
});
