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
    command: ["node", "fixture.mjs"],
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
    assertRefused(manifest([validEntry({ command: [] })]));
    assertRefused(manifest([validEntry({ command: ["node", "fixture.mjs;whoami"] })]));
    assertRefused(manifest([validEntry({ command: ["../outside-tool"] })]));
    assertRefused(manifest([validEntry({ command: ["C:outside-tool"] })]));
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
});
