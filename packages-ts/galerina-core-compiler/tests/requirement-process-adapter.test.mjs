import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import * as L from "../dist/index.js";

const ZERO = "0".repeat(64);
const digest = (byte) => byte.repeat(64);
const nonce = "00112233445566778899aabbccddeeff";
const missingWorkerResult = Object.freeze([
  "evidence/audit",
  "evidence/response",
  "evidence/value",
]);

const binding = Object.freeze({
  launcherDigest: digest("1"),
  processOwnerDigest: digest("2"),
  runtimeDigest: digest("3"),
  workerDigest: digest("4"),
  registryDigest: digest("5"),
  environmentPolicyDigest: digest("6"),
  scalarProfileDigest: digest("7"),
  requestDigest: digest("8"),
  subjectDigest: digest("9"),
  flowDigest: digest("a"),
  argumentDigest: digest("b"),
  nonce,
});

const terminalRows = Object.freeze([
  ["COMPLETE", "NONE", false, false, false],
  ["REFUSED", "CHECKED_ARTIFACT_SCHEMA", false, false, false],
  ["REFUSED", "CHECKED_ARTIFACT_CANONICAL", false, false, false],
  ["REFUSED", "CHECKED_ARTIFACT_DIGEST", false, false, false],
  ["REFUSED", "CHECKED_ARTIFACT_IDENTITY", false, false, false],
  ["REFUSED", "CHECKED_AST_UNSUPPORTED", false, false, false],
  ["REFUSED", "ARGUMENT_CONTRACT", false, false, false],
  ["REFUSED", "NONCE_MISMATCH", false, false, false],
  ["REFUSED", "SECOND_REQUEST", false, false, false],
  ["REFUSED", "BOOTSTRAP_CONTROL", false, false, true],
  ["REFUSED", "UNSUPPORTED_PLATFORM", false, false, true],
  ["ERROR", "FLOW_EXECUTION", false, false, false],
  ["ERROR", "WORKER_TIMEOUT", true, false, true],
  ["ERROR", "WORKER_CRASH", false, false, true],
  ["ERROR", "WORKER_CRASH", false, true, true],
  ["CANCELLED", "CALLER_CANCELLED", false, false, true],
]);

function scalarValue(decision = "allow") {
  return {
    admitted: true,
    authorizing: false,
    decision,
    operation: "scalar-oracle",
    scalarProfile: "scalar-1",
  };
}

function receipt(row, overrides = {}) {
  const [executionState, refusalCode, timedOut, truncated, missing] = row;
  const complete = executionState === "COMPLETE";
  return {
    schemaVersion: 1,
    hashAlgorithm: "sha256",
    ...binding,
    osEvidenceLocator: "evidence/os/windows-proof-slice-v1",
    processPolicyEvidenceLocator: "evidence/process/owned-worker-v1",
    responseDigest: missing ? ZERO : digest("c"),
    valueDigest: complete
      ? L.hashCanonicalProtocolValue(scalarValue())
      : (missing ? ZERO : digest("d")),
    auditDigest: missing ? ZERO : digest("e"),
    monotonicDurationMs: 17,
    executionState,
    timedOut,
    truncated,
    partial: false,
    missingEvidence: missing ? missingWorkerResult : [],
    exitCode: executionState === "CANCELLED" ? null : 1,
    refusalCode,
    authorizing: false,
    ...overrides,
  };
}

function adapt(value, expected = binding) {
  const frame = L.encodeCanonicalFrame("receipt", value);
  return L.adaptRequirementProcessReceipt(frame, expected);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function rawFrame(value) {
  const body = Buffer.from(canonicalJson(value), "utf8");
  const prefix = Buffer.alloc(8);
  prefix.writeBigUInt64BE(BigInt(body.byteLength));
  return Buffer.concat([prefix, body]);
}

async function loadMutant(mutateAdapter, mutateProtocol = identityMutation) {
  const directory = mkdtempSync(join(tmpdir(), "rd0858-adapter-mutant-"));
  const adapterPath = new URL("../dist/requirement-process-adapter.js", import.meta.url);
  const protocolPath = new URL("../dist/requirement-process-protocol.js", import.meta.url);
  const targetAdapter = join(directory, "requirement-process-adapter.js");
  const targetProtocol = join(directory, "requirement-process-protocol.js");
  copyFileSync(new URL("../package.json", import.meta.url), join(directory, "package.json"));
  const adapterSource = readFileSync(adapterPath, "utf8");
  const protocolSource = readFileSync(protocolPath, "utf8");
  const mutatedAdapter = mutateAdapter(adapterSource);
  const mutatedProtocol = mutateProtocol(protocolSource);
  assert.notEqual(mutatedAdapter, adapterSource, "adapter mutation must locate its target");
  if (mutateProtocol !== identityMutation) {
    assert.notEqual(mutatedProtocol, protocolSource, "protocol mutation must locate its target");
  }
  writeFileSync(targetAdapter, mutatedAdapter, "utf8");
  writeFileSync(targetProtocol, mutatedProtocol, "utf8");
  try {
    return await import(`${pathToFileURL(targetAdapter).href}?v=${Date.now()}-${Math.random()}`);
  } finally {
    // The imported module is fully evaluated before import() resolves on Node.
    setTimeout(() => rmSync(directory, { recursive: true, force: true }), 0);
  }
}

function identityMutation(source) {
  return source;
}

describe("RD-0858 Unit 4 parent terminal receipt adapter", () => {
  it("admits every closed terminal row as non-authorizing evidence", () => {
    for (const row of terminalRows) {
      const adapted = adapt(receipt(row));
      assert.equal(adapted.authorizing, false);
      assert.equal(adapted.executionState, row[0]);
      assert.equal(adapted.refusalCode, row[1]);
      assert.match(adapted.receiptDigest, /^[0-9a-f]{64}$/u);
      assert.equal(Object.isFrozen(adapted), true);
    }
  });

  it("recomputes only the three fixed scalar decisions from exact value digests", () => {
    for (const decision of ["deny", "ambig", "allow"]) {
      const valueDigest = L.hashCanonicalProtocolValue(scalarValue(decision));
      const adapted = adapt(receipt(terminalRows[0], { valueDigest }));
      assert.equal(adapted.decision, decision);
    }
  });

  it("refuses false COMPLETE, binding substitution and open terminal tuples", () => {
    assert.throws(
      () => adapt(receipt(terminalRows[0], { valueDigest: digest("f") })),
      /SCALAR_VALUE_DIGEST/u,
    );
    assert.throws(
      () => adapt(receipt(terminalRows[0]), { ...binding, flowDigest: digest("f") }),
      /RECEIPT_BINDING/u,
    );
    assert.throws(
      () => adapt(receipt(["COMPLETE", "WORKER_CRASH", false, false, false])),
      /TERMINAL_TUPLE/u,
    );
    assert.throws(
      () => adapt(receipt(["ERROR", "WORKER_TIMEOUT", false, false, true])),
      /TERMINAL_TUPLE/u,
    );
  });

  it("requires explicit missing worker evidence and never admits authority", () => {
    assert.throws(
      () => adapt(receipt(terminalRows[12], { missingEvidence: [] })),
      /MISSING_WORKER_EVIDENCE/u,
    );
    assert.throws(
      () => L.adaptRequirementProcessReceipt(
        L.encodeCanonicalFrame("receipt", receipt(terminalRows[0], { authorizing: true })),
        binding,
      ),
      /AUTHORIZ/u,
    );
  });

  it("causally kills every terminal-row deletion and the authorizing invariant", async () => {
    for (const row of terminalRows) {
      const token = `"${row.map(String).join("\\0")}"`;
      const mutant = await loadMutant((source) => source.replace(token, `"MUTATED\\0${token.slice(1)}`));
      const frame = L.encodeCanonicalFrame("receipt", receipt(row));
      assert.throws(
        () => mutant.adaptRequirementProcessReceipt(frame, binding),
        /TERMINAL_TUPLE/u,
      );
    }

    const authorityMutant = await loadMutant(
      (source) => source.replace(
        'if (receipt.authorizing !== false || receipt.partial !== false',
        'if (false || receipt.partial !== false',
      ),
      (source) => source
        .replace('if (record.authorizing !== false)', 'if (false)')
        .replace('authorizing: false,', 'authorizing: record.authorizing,'),
    );
    const escaped = authorityMutant.adaptRequirementProcessReceipt(
      rawFrame(receipt(terminalRows[0], { authorizing: true })),
      binding,
    );
    assert.equal(escaped.receipt.authorizing, true, "mutant must expose the authority violation");
  });
});
