import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import {
  selectCadenceEntries,
  validateAssuranceManifest,
} from "../lib/assurance-fabric/manifest.mjs";

const root = mkdtempSync(join(tmpdir(), "galerina-assurance-manifest-"));
after(() => rmSync(root, { recursive: true, force: true }));

function validEntry(overrides = {}) {
  return {
    id: "audit:fixture",
    requirementId: "REQ-ASSURANCE-001",
    satisfies: ["REQ-ASSURANCE-001"],
    execution: { kind: "process", command: ["node", "fixture.mjs"] },
    cwd: ".",
    toolClass: "analyzer",
    authorityClass: "blocking",
    cadences: ["normal", "exhaustive"],
    outcomePolicy: "blocking",
    subjects: { kind: "files", values: ["fixture.mjs"], expectedCount: 1 },
    timeoutMs: 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    mutationPolicy: "read-only",
    platforms: ["win32", "linux", "darwin"],
    selfTest: {
      kind: "present",
      command: ["node", "fixture.mjs", "--self-test"],
      plantedDefectId: "DEFECT-ASSURANCE-001",
    },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "canonical",
      retirement: "active",
    },
    ...overrides,
  };
}

function manifest(entries = [validEntry()]) {
  return { schemaVersion: 1, entries };
}

function assertRefused(value, pattern = /ASSURANCE-MANIFEST-/) {
  const result = validateAssuranceManifest(value, root);
  assert.equal(result.kind, "refused");
  assert.match(result.code, pattern);
  assert.equal(Object.isFrozen(result), true);
}

describe("candidate assurance manifest", () => {
  it("accepts one exact manifest and selects a closed cadence", () => {
    const result = validateAssuranceManifest(manifest(), root);
    assert.equal(result.kind, "accepted");
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.value), true);
    assert.deepEqual(
      selectCadenceEntries(result.value, "normal").map((entry) => entry.id),
      ["audit:fixture"],
    );
    assert.deepEqual(selectCadenceEntries(result.value, "nightly"), []);
    assert.throws(() => selectCadenceEntries(result.value, "weekly"), /cadence/);
    assert.throws(() => selectCadenceEntries(structuredClone(result.value), "normal"), /accepted manifest/);
  });

  it("refuses surplus fields, absence sentinels and authority-positive vocabulary", () => {
    assertRefused({ ...manifest(), surplus: true });
    assertRefused(manifest([validEntry({ subjects: null })]));
    assertRefused(manifest([validEntry({ authorityClass: "authorizing" })]));
    assertRefused(manifest([validEntry({ cadences: ["normal", "allow"] })]));
  });

  it("refuses duplicate identities, unknown predecessors and dependency cycles", () => {
    const duplicate = validEntry({ id: "audit:duplicate" });
    assertRefused(manifest([duplicate, structuredClone(duplicate)]));
    assertRefused(manifest([validEntry({ predecessors: ["audit:missing"] })]));
    assertRefused(manifest([
      validEntry({ id: "audit:a", predecessors: ["audit:b"] }),
      validEntry({ id: "audit:b", predecessors: ["audit:a"] }),
    ]));
  });

  it("refuses root escape, shell-shaped commands and invalid output bounds", () => {
    assertRefused(manifest([validEntry({ cwd: "../escape" })]));
    assertRefused(manifest([validEntry({ execution: { kind: "process", command: [] } })]));
    assertRefused(manifest([validEntry({ execution: { kind: "process", command: ["node", "fixture.mjs;whoami"] } })]));
    assertRefused(manifest([validEntry({ execution: { kind: "process", command: ["../outside-tool"] } })]));
    assertRefused(manifest([validEntry({ execution: { kind: "process", command: ["C:outside-tool"] } })]));
    assertRefused(manifest([validEntry({ generatedOutputs: ["../outside.json"] })]));
    assertRefused(manifest([validEntry({ maxOutputBytes: Number.NaN })]));
    assertRefused(manifest([validEntry({ timeoutMs: Number.POSITIVE_INFINITY })]));
  });

  it("refuses empty subject scope, duplicate array values, proxies and accessors", () => {
    assertRefused(manifest([validEntry({
      subjects: { kind: "files", values: ["fixture.mjs"], expectedCount: 0 },
    })]));
    assertRefused(manifest([validEntry({ platforms: ["linux", "linux"] })]));
    assertRefused(new Proxy(manifest(), {}));

    let getterRan = false;
    const entry = validEntry();
    Object.defineProperty(entry, "id", {
      enumerable: true,
      get() {
        getterRan = true;
        return "audit:accessor";
      },
    });
    assertRefused(manifest([entry]));
    assert.equal(getterRan, false);
  });

  it("accepts one closed predecessor receipt and refuses unknown verifier shapes", () => {
    const producer = validEntry({ id: "graph:all" });
    const receipt = validEntry({
      id: "semantic:coverage",
      requirementId: "REQ-SEMANTIC-COVERAGE",
      satisfies: ["REQ-SEMANTIC-COVERAGE"],
      execution: {
        kind: "predecessor-receipt",
        predecessorId: "graph:all",
        verifierId: "graph-all-semantic-v1",
      },
      predecessors: ["graph:all"],
    });
    assert.equal(validateAssuranceManifest(manifest([producer, receipt]), root).kind, "accepted");
    assertRefused(manifest([producer, {
      ...receipt,
      execution: { ...receipt.execution, verifierId: "invented-verifier" },
    }]));
    assertRefused(manifest([producer, {
      ...receipt,
      execution: { ...receipt.execution, command: ["node", "bad.mjs"] },
    }]));
    assertRefused(manifest([{
      ...receipt,
      predecessors: [],
      execution: { ...receipt.execution, predecessorId: "missing" },
    }]));
  });

  it("refuses duplicate satisfies values and receipt dependency cycles", () => {
    assertRefused(manifest([validEntry({
      satisfies: ["REQ-ASSURANCE-001", "REQ-ASSURANCE-001"],
    })]));
    assertRefused(manifest([
      validEntry({
        id: "receipt:a",
        execution: {
          kind: "predecessor-receipt",
          predecessorId: "receipt:b",
          verifierId: "graph-all-semantic-v1",
        },
        predecessors: [],
      }),
      validEntry({
        id: "receipt:b",
        execution: {
          kind: "predecessor-receipt",
          predecessorId: "receipt:a",
          verifierId: "graph-all-semantic-v1",
        },
        predecessors: [],
      }),
    ]));
  });
});
