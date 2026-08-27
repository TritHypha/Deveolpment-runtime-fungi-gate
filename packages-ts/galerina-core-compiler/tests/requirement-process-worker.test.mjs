import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  BOOTSTRAP_PROBE_ARGUMENT_BYTES,
  BOOTSTRAP_PROBE_FLOW,
  decodeCanonicalFrame,
  encodeCheckedFlowArtifact,
  encodeCanonicalFrame,
  runRequirementProcessWorker,
} from "../dist/index.js";

const NONCE = "00112233445566778899aabbccddeeff";
const WORKER_DIGEST = "a".repeat(64);
const RUNTIME_DIGEST = "b".repeat(64);
const SCALAR_FLOW = "rd0858/unit4/scalar-oracle";
const ARTIFACT_BYTES = readFileSync(new URL(
  "../../../packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json",
  import.meta.url,
));
const SOURCE_BYTES = readFileSync(new URL(
  "../../../packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi",
  import.meta.url,
));

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function request(overrides = {}) {
  const argument = Buffer.from(BOOTSTRAP_PROBE_ARGUMENT_BYTES, "base64");
  return {
    schemaVersion: 1,
    nonce: NONCE,
    runtimeProfile: "scalar-1",
    subjectDigest: "c".repeat(64),
    flowLocator: BOOTSTRAP_PROBE_FLOW,
    flowDigest: "d".repeat(64),
    argumentDigest: digest(argument),
    argumentBytes: BOOTSTRAP_PROBE_ARGUMENT_BYTES,
    ...overrides,
  };
}

function scalarArgument(subject, overrideBytes) {
  const bytes = overrideBytes ?? Buffer.from(`{"subject":${subject}}`, "utf8");
  return {
    bytes,
    digest: digest(bytes),
    base64: bytes.toString("base64"),
  };
}

function scalarRequest(subject, overrides = {}, overrideBytes) {
  const argument = scalarArgument(subject, overrideBytes);
  return {
    schemaVersion: 1,
    nonce: NONCE,
    runtimeProfile: "scalar-1",
    subjectDigest: argument.digest,
    flowLocator: SCALAR_FLOW,
    flowDigest: digest(ARTIFACT_BYTES),
    argumentDigest: argument.digest,
    argumentBytes: argument.base64,
    ...overrides,
  };
}

function executionFrame(subject, {
  artifactBytes = ARTIFACT_BYTES,
  executionOverrides = {},
  requestOverrides = {},
  argumentBytes,
} = {}) {
  const launcherFrame = encodeCanonicalFrame(
    "launcher-request",
    scalarRequest(subject, { flowDigest: digest(artifactBytes), ...requestOverrides }, argumentBytes),
  );
  return encodeCanonicalFrame("worker-execution", {
    schemaVersion: 1,
    nonce: NONCE,
    artifactDigest: digest(artifactBytes),
    artifactBytes: Buffer.from(artifactBytes).toString("base64"),
    requestDigest: digest(launcherFrame),
    requestBytes: Buffer.from(launcherFrame).toString("base64"),
    ...executionOverrides,
  });
}

function harness({
  frame = encodeCanonicalFrame("launcher-request", request()),
  read,
  write,
  selfControls,
  timeoutMs = 50,
} = {}) {
  const frames = [];
  let reads = 0;
  let closes = 0;
  const input = {
    async read() {
      reads += 1;
      assert.equal(frames.length, 1, "WorkerReady must be written before input is read");
      if (read) return read({ frames, reads });
      return frame;
    },
  };
  const output = {
    async write(bytes) {
      if (write) return write(bytes, { frames });
      frames.push(Uint8Array.from(bytes));
    },
    async close() {
      closes += 1;
    },
  };
  const bootstrap = {
    nonce: NONCE,
    workerDigest: WORKER_DIGEST,
    runtimeDigest: RUNTIME_DIGEST,
    timeoutMs,
    ...(selfControls ? { selfControls } : {}),
  };
  return {
    input,
    output,
    bootstrap,
    frames,
    counts: () => ({ reads, closes }),
  };
}

function resultFrame(frames) {
  assert.equal(frames.length, 2);
  return decodeCanonicalFrame("worker-result", frames[1]);
}

describe("RD-0858 Unit 4 single-use requirement worker", () => {
  it("keeps the executable closure to the registered worker and protocol", () => {
    const source = readFileSync(new URL("../src/requirement-process-worker.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /from\s+["']\.\/(?:checked-flow-artifact|interpreter)\.js["']/u);
    assert.match(source, /from\s+["']\.\/requirement-process-protocol\.js["']/u);
    assert.match(source, /function\s+executeExactScalarAst/u);
  });

  for (const [subject, decision] of [[-1, "deny"], [0, "ambig"], [1, "allow"]]) {
    it(`executes canonical Verdict ${subject} only on the tree tier`, async () => {
      const h = harness({ frame: executionFrame(subject) });
      const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
      const result = resultFrame(h.frames);

      assert.equal(outcome.executionState, "COMPLETE");
      assert.equal(outcome.refusalCode, "NONE");
      assert.equal(result.executionState, "COMPLETE");
      assert.deepEqual(result.boundedValue, {
        admitted: true,
        authorizing: false,
        decision,
        operation: "scalar-oracle",
        scalarProfile: "scalar-1",
      });
      assert.equal(result.boundedAudit.executionTier, "tree");
      assert.equal(result.boundedAudit.refusalCode, "NONE");
      assert.equal(result.boundedAudit.authorizing, false);
      assert.deepEqual(h.counts(), { reads: 1, closes: 1 });
    });
  }

  for (const [name, bytes] of [
    ["wrong class", Buffer.from('{"subject":true}', "utf8")],
    ["surplus field", Buffer.from('{"subject":1,"extra":0}', "utf8")],
    ["aliased field", Buffer.from('{"Subject":1}', "utf8")],
  ]) {
    it(`refuses ${name} scalar arguments`, async () => {
      const h = harness({ frame: executionFrame(1, { argumentBytes: bytes }) });
      const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
      assert.equal(outcome.executionState, "REFUSED");
      assert.equal(outcome.refusalCode, "ARGUMENT_CONTRACT");
      assert.equal(resultFrame(h.frames).boundedAudit.refusalCode, "ARGUMENT_CONTRACT");
    });
  }

  it("refuses an artifact digest mismatch before execution", async () => {
    const h = harness({
      frame: executionFrame(1, {
        executionOverrides: { artifactDigest: "f".repeat(64) },
      }),
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.executionState, "REFUSED");
    assert.equal(outcome.refusalCode, "CHECKED_ARTIFACT_DIGEST");
  });

  it("refuses a product-identity mismatch inside otherwise digest-bound bytes", async () => {
    const artifact = JSON.parse(ARTIFACT_BYTES.toString("utf8"));
    artifact.productId = "trametes";
    const bytes = Buffer.from(`${JSON.stringify(artifact)}\n`, "utf8");
    const h = harness({ frame: executionFrame(1, { artifactBytes: bytes }) });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.executionState, "REFUSED");
    assert.equal(outcome.refusalCode, "CHECKED_ARTIFACT_IDENTITY");
  });

  it("refuses canonical source bytes instead of parsing them in the worker", async () => {
    const h = harness({ frame: executionFrame(1, { artifactBytes: SOURCE_BYTES }) });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.executionState, "REFUSED");
    assert.match(outcome.refusalCode, /^CHECKED_ARTIFACT_(?:CANONICAL|SCHEMA)$/u);
  });

  it("independently refuses a checked AST outside the exact scalar oracle shape", async () => {
    const artifact = JSON.parse(ARTIFACT_BYTES.toString("utf8"));
    artifact.checkedAst.children[3].children[0].children[3].value = "surplus";
    const bytes = Buffer.from(`${JSON.stringify(artifact)}\n`, "utf8");
    const h = harness({ frame: executionFrame(1, { artifactBytes: bytes }) });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.executionState, "REFUSED");
    assert.equal(outcome.refusalCode, "CHECKED_AST_UNSUPPORTED");
  });

  it("refuses an outer nonce mismatch without reading a second request", async () => {
    const h = harness({
      frame: executionFrame(1, { executionOverrides: { nonce: "f".repeat(32) } }),
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.refusalCode, "NONCE_MISMATCH");
    assert.deepEqual(h.counts(), { reads: 1, closes: 1 });
  });

  it("refuses a second concatenated scalar execution envelope", async () => {
    const one = executionFrame(1);
    const two = new Uint8Array(one.byteLength * 2);
    two.set(one, 0);
    two.set(one, one.byteLength);
    const h = harness({ frame: two });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.executionState, "REFUSED");
    assert.equal(outcome.refusalCode, "REQUEST_PROTOCOL");
    assert.deepEqual(h.counts(), { reads: 1, closes: 1 });
  });

  it("captures roots, proves canonical Bool/Verdict controls, then emits READY -> REFUSED -> CLOSED", async () => {
    const h = harness();
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    const ready = decodeCanonicalFrame("worker-ready", h.frames[0]);
    const result = resultFrame(h.frames);

    assert.equal(ready.nonce, NONCE);
    assert.equal(ready.workerDigest, WORKER_DIGEST);
    assert.equal(ready.runtimeDigest, RUNTIME_DIGEST);
    assert.match(ready.bootstrapControlDigest, /^[0-9a-f]{64}$/u);
    assert.equal(result.executionState, "REFUSED");
    assert.equal(result.boundedValue.operation, "bootstrap-probe");
    assert.equal(result.boundedValue.authorizing, false);
    assert.equal(result.boundedAudit.bootstrapControlDigest, ready.bootstrapControlDigest);
    assert.equal(outcome.phase, "CLOSED");
    assert.equal(outcome.executionState, "REFUSED");
    assert.deepEqual(h.counts(), { reads: 1, closes: 1 });
  });

  it("uses roots captured before input.read even if the ambient descriptor reader is replaced", async () => {
    const original = Object.getOwnPropertyDescriptor;
    const h = harness({
      read() {
        Object.getOwnPropertyDescriptor = () => {
          throw new Error("ambient reader must not be reached");
        };
        return encodeCanonicalFrame("launcher-request", request());
      },
    });
    try {
      const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
      assert.equal(outcome.executionState, "REFUSED");
      assert.equal(resultFrame(h.frames).boundedAudit.refusalCode, "BOOTSTRAP_PROBE_ONLY");
    } finally {
      Object.getOwnPropertyDescriptor = original;
    }
  });

  it("refuses Proxy and accessor self-controls without invoking their traps", async () => {
    let proxyReads = 0;
    let accessorReads = 0;
    const proxy = new Proxy({ __tag: "bool", value: true }, {
      get() {
        proxyReads += 1;
        throw new Error("proxy trap invoked");
      },
      getOwnPropertyDescriptor() {
        proxyReads += 1;
        throw new Error("proxy descriptor trap invoked");
      },
    });
    const accessor = { __tag: "verdict" };
    Object.defineProperty(accessor, "value", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return 0;
      },
    });

    for (const selfControls of [
      { boolValue: proxy, verdictValue: { __tag: "verdict", value: 0 } },
      { boolValue: { __tag: "bool", value: true }, verdictValue: accessor },
    ]) {
      const h = harness({ selfControls });
      const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
      assert.equal(outcome.executionState, "REFUSED");
      assert.equal(outcome.refusalCode, "BOOTSTRAP_CONTROL");
      assert.equal(h.counts().reads, 0);
    }
    assert.equal(proxyReads, 0);
    assert.equal(accessorReads, 0);
  });

  it("refuses a Proxy bootstrap object without consulting any caller trap", async () => {
    let trapReads = 0;
    const h = harness();
    const hostileBootstrap = new Proxy(h.bootstrap, {
      get() {
        trapReads += 1;
        throw new Error("bootstrap getter invoked");
      },
      getOwnPropertyDescriptor() {
        trapReads += 1;
        throw new Error("bootstrap descriptor invoked");
      },
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, hostileBootstrap);
    assert.equal(outcome.refusalCode, "BOOTSTRAP_CONTROL");
    assert.equal(outcome.executionState, "REFUSED");
    assert.equal(h.counts().reads, 0);
    assert.equal(trapReads, 0);
  });

  it("refuses a worker-result sent where the one launcher request is required", async () => {
    const h = harness({
      frame: encodeCanonicalFrame("worker-result", {
        schemaVersion: 1,
        nonce: NONCE,
        executionState: "REFUSED",
        valueDigest: "0".repeat(64),
        auditDigest: "1".repeat(64),
        boundedValue: null,
        boundedAudit: null,
      }),
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.executionState, "REFUSED");
    assert.equal(resultFrame(h.frames).boundedAudit.refusalCode, "REQUEST_PROTOCOL");
  });

  it("refuses nonce mismatch", async () => {
    const h = harness({
      frame: encodeCanonicalFrame("launcher-request", request({ nonce: "f".repeat(32) })),
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.refusalCode, "NONCE_MISMATCH");
    assert.equal(resultFrame(h.frames).executionState, "REFUSED");
  });

  it("refuses a second concatenated request and performs one read", async () => {
    const one = encodeCanonicalFrame("launcher-request", request());
    const two = new Uint8Array(one.byteLength * 2);
    two.set(one, 0);
    two.set(one, one.byteLength);
    const h = harness({ frame: two });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.refusalCode, "REQUEST_PROTOCOL");
    assert.deepEqual(h.counts(), { reads: 1, closes: 1 });
  });

  for (const flowLocator of [
    "rd0858/unit4/dynamic-import",
    "rd0858/unit4/child-process",
    "rd0858/unit4/network",
  ]) {
    it(`refuses non-bootstrap operation ${flowLocator}`, async () => {
      const h = harness({
        frame: encodeCanonicalFrame("launcher-request", request({ flowLocator })),
      });
      const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
      assert.equal(outcome.refusalCode, "OPERATION_NOT_ADMITTED");
      assert.notEqual(outcome.executionState, "COMPLETE");
    });
  }

  it("refuses unknown effects and non-exact bootstrap arguments", async () => {
    const argument = Buffer.from('{"operation":"bootstrap-probe","requestedEffects":["network"]}', "utf8");
    const h = harness({
      frame: encodeCanonicalFrame("launcher-request", request({
        argumentBytes: argument.toString("base64"),
        argumentDigest: digest(argument),
      })),
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.refusalCode, "ARGUMENT_CONTRACT");
    assert.equal(outcome.executionState, "REFUSED");
  });

  it("refuses oversized input without an oversized result or audit", async () => {
    const h = harness({ frame: new Uint8Array(262_153) });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    const result = resultFrame(h.frames);
    assert.equal(outcome.refusalCode, "REQUEST_BOUND");
    assert.ok(h.frames[1].byteLength <= 262_152);
    assert.equal(result.executionState, "REFUSED");
  });

  it("times out one stalled read and closes once", async () => {
    const h = harness({
      read: () => new Promise(() => {}),
      timeoutMs: 15,
    });
    const outcome = await runRequirementProcessWorker(h.input, h.output, h.bootstrap);
    assert.equal(outcome.refusalCode, "WORKER_TIMEOUT");
    assert.equal(outcome.executionState, "REFUSED");
    assert.deepEqual(h.counts(), { reads: 1, closes: 1 });
  });

  it("contains input and output crashes without returning COMPLETE", async () => {
    const inputCrash = harness({
      read() {
        throw new Error("input crash");
      },
    });
    const first = await runRequirementProcessWorker(
      inputCrash.input,
      inputCrash.output,
      inputCrash.bootstrap,
    );
    assert.equal(first.executionState, "ERROR");
    assert.equal(first.refusalCode, "WORKER_CRASH");

    const outputCrash = harness({
      write() {
        throw new Error("output crash");
      },
    });
    const second = await runRequirementProcessWorker(
      outputCrash.input,
      outputCrash.output,
      outputCrash.bootstrap,
    );
    assert.equal(second.executionState, "ERROR");
    assert.equal(second.refusalCode, "OUTPUT_WRITE");
    assert.equal(outputCrash.counts().reads, 0);
  });
});
