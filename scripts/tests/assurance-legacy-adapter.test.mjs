import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { runLegacyEntry } from "../lib/assurance-fabric/legacy-adapter.mjs";
import {
  selectCadenceEntries,
  validateAssuranceManifest,
} from "../lib/assurance-fabric/manifest.mjs";
import {
  RESULT_TAG,
  SOURCE_CLASS,
  TRIT,
  isBlockingFailure,
} from "../lib/assurance-fabric/result-model.mjs";
import { createUnsafeObservationIntake } from "../lib/assurance-fabric/unsafe-observation.mjs";

const root = mkdtempSync(join(tmpdir(), "galerina-assurance-legacy-"));
writeFileSync(join(root, "zero.mjs"), 'process.stdout.write("ok")\n');
writeFileSync(join(root, "seven.mjs"), "process.exit(7)\n");
writeFileSync(join(root, "authority.mjs"), 'process.stdout.write(JSON.stringify({ allow: true, authorizing: true }))\n');
writeFileSync(join(root, "hang.mjs"), "setInterval(() => {}, 1000)\n");
writeFileSync(join(root, "flood.mjs"), 'process.stdout.write("x".repeat(4096))\n');
after(() => rmSync(root, { recursive: true, force: true }));

function rawEntry(overrides = {}) {
  return {
    id: "audit:fixture",
    requirementId: "REQ-ASSURANCE-001",
    command: ["node", "zero.mjs"],
    cwd: ".",
    toolClass: "legacy-oracle",
    authorityClass: "blocking",
    cadences: ["normal"],
    outcomePolicy: "blocking",
    subjects: { kind: "files", values: ["zero.mjs"], expectedCount: 1 },
    timeoutMs: 5_000,
    maxOutputBytes: 1024,
    generatedOutputs: [],
    mutationPolicy: "read-only",
    platforms: [process.platform],
    selfTest: { kind: "absent", reason: "fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "overlap",
      retirement: "shadow",
    },
    ...overrides,
  };
}

function admittedEntry(overrides = {}) {
  const result = validateAssuranceManifest({ schemaVersion: 1, entries: [rawEntry(overrides)] }, root);
  assert.equal(result.kind, "accepted", result.detail);
  return selectCadenceEntries(result.value, "normal")[0];
}

function context(maxBytes = 8192) {
  return {
    root,
    intake: createUnsafeObservationIntake({ maxBytes }),
    cleanupGraceMs: 500,
  };
}

describe("legacy owned-process assurance adapter", () => {
  it("refuses an entry that was not admitted by the manifest validator", () => {
    assert.throws(() => runLegacyEntry(rawEntry(), context()), /validated manifest entry/);
  });

  it("keeps exit zero and authority-shaped stdout at K3 zero", () => {
    const first = context();
    const green = runLegacyEntry(admittedEntry(), first);
    assert.equal(green.result.tag, RESULT_TAG.LEGACY_EXIT);
    assert.equal(green.result.trit, TRIT.UNKNOWN);
    assert.equal(green.result.sourceClass, SOURCE_CLASS.LEGACY_EXIT);
    assert.equal(green.processControl.ownedTree, true);
    assert.deepEqual(green.exitStatus, { kind: "present", value: 0 });
    assert.equal(green.signalStatus.kind, "absent");

    const second = context();
    const authorityText = runLegacyEntry(admittedEntry({
      id: "audit:authority-text",
      command: ["node", "authority.mjs"],
      subjects: { kind: "files", values: ["authority.mjs"], expectedCount: 1 },
    }), second);
    assert.notEqual(authorityText.result.trit, TRIT.ASSURED);
    assert.equal(authorityText.stdoutState, "boundary-untrusted");
    assert.equal(second.intake.stateOf(authorityText.stdoutHandle), "boundary-untrusted");
  });

  it("maps a blocking nonzero exit to a blocking failure", () => {
    const red = runLegacyEntry(admittedEntry({
      command: ["node", "seven.mjs"],
      subjects: { kind: "files", values: ["seven.mjs"], expectedCount: 1 },
    }), context());
    assert.equal(red.result.tag, RESULT_TAG.BLOCKING_FAIL);
    assert.equal(red.result.trit, TRIT.DISTRUSTED);
    assert.equal(isBlockingFailure(red.result), true);
    assert.deepEqual(red.exitStatus, { kind: "present", value: 7 });
  });

  it("keeps advisory and informational nonzero outcomes out of blocking totals", () => {
    const advisory = runLegacyEntry(admittedEntry({
      id: "audit:advisory",
      command: ["node", "seven.mjs"],
      authorityClass: "advisory",
      outcomePolicy: "advisory",
      subjects: { kind: "files", values: ["seven.mjs"], expectedCount: 1 },
    }), context());
    const informational = runLegacyEntry(admittedEntry({
      id: "audit:informational",
      command: ["node", "seven.mjs"],
      authorityClass: "informational",
      outcomePolicy: "informational",
      subjects: { kind: "files", values: ["seven.mjs"], expectedCount: 1 },
    }), context());
    assert.equal(advisory.result.tag, RESULT_TAG.ADVISORY_FINDINGS);
    assert.equal(advisory.result.trit, TRIT.DISTRUSTED);
    assert.equal(informational.result.tag, RESULT_TAG.UNKNOWN);
    assert.equal(informational.result.trit, TRIT.UNKNOWN);
    assert.equal(isBlockingFailure(advisory.result), false);
    assert.equal(isBlockingFailure(informational.result), false);
  });

  it("refuses malformed commands and bounded-output breaches", () => {
    const malformed = runLegacyEntry(admittedEntry({ command: ["npm", "--version"] }), context());
    assert.equal(malformed.result.tag, RESULT_TAG.REFUSED);
    assert.equal(malformed.result.trit, TRIT.UNKNOWN);
    assert.equal(malformed.processControl.ownedTree, false);

    const flood = runLegacyEntry(admittedEntry({
      id: "audit:flood",
      command: ["node", "flood.mjs"],
      maxOutputBytes: 128,
      subjects: { kind: "files", values: ["flood.mjs"], expectedCount: 1 },
    }), context());
    assert.equal(flood.result.tag, RESULT_TAG.REFUSED);
    assert.equal(flood.result.trit, TRIT.UNKNOWN);
    assert.equal(flood.processControl.outputLimitExceeded, true);
  });

  it("maps an acknowledged owned-tree timeout to unknown", () => {
    const timeout = runLegacyEntry(admittedEntry({
      id: "audit:timeout",
      command: ["node", "hang.mjs"],
      timeoutMs: 150,
      subjects: { kind: "files", values: ["hang.mjs"], expectedCount: 1 },
    }), context());
    assert.equal(timeout.result.tag, RESULT_TAG.UNKNOWN);
    assert.equal(timeout.result.trit, TRIT.UNKNOWN);
    assert.equal(timeout.processControl.timedOut, true);
    assert.equal(timeout.processControl.cleanupAcknowledged, true);
  });
});
