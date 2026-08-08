import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyDescriptiveDiagnosticIdentities,
} from "../lib/descriptive-diagnostic-identities.mjs";

test("descriptive diagnostic classifier admits bounded runtime sinks", () => {
  const source = [
    'console.error(`FUNGI-MANIFEST-TAMPER: refused`);',
    'return fuseError(',
    '  "FUNGI-FUSE-HASH-MISMATCH",',
    '  "hash mismatch",',
    ');',
    'throw new Error(`FUNGI-MANIFEST-DEPTH: refused`);',
    'findings.push({ code: "FUNGI-LINT-CONTRACT", msg: "missing" });',
    'add("FUNGI-SYNTAX-TAB", line, "tab");',
    'readonly code = "FUNGI-SUBSTRATE-DEADZONE" as const;',
  ].join("\n");

  const result = classifyDescriptiveDiagnosticIdentities(source);
  assert.deepEqual(
    result.identities.map((entry) => entry.code),
    [
      "FUNGI-MANIFEST-TAMPER",
      "FUNGI-FUSE-HASH-MISMATCH",
      "FUNGI-MANIFEST-DEPTH",
      "FUNGI-LINT-CONTRACT",
      "FUNGI-SYNTAX-TAB",
      "FUNGI-SUBSTRATE-DEADZONE",
    ],
  );
  assert.equal(result.unclassified.length, 0);
});

test("descriptive diagnostic classifier refuses prefixes, prose, types, and fixtures as identities", () => {
  const source = [
    "// FUNGI-BOOL-BOUNDARY is a family, not an identity.",
    "/** FUNGI-PROOF-CERT-00x is illustrative prose. */",
    'type Result = { readonly code: "FUNGI-TYPE-REFERENCE" };',
    'const domain = "FUNGI-WASM-ADMIT-v1";',
    '// code-catalog-reference: deliberately unemittable fixture',
    'const fixture = "diagnostic_on_reject: FUNGI-NOT-A-REAL-CODE";',
  ].join("\n");

  const result = classifyDescriptiveDiagnosticIdentities(source);
  assert.deepEqual(result.identities, []);
  assert.deepEqual(
    result.references.map((entry) => entry.code),
    ["FUNGI-TYPE-REFERENCE", "FUNGI-WASM-ADMIT", "FUNGI-NOT-A-REAL-CODE"],
  );
});

test("descriptive diagnostic classifier reports novel ambiguous source tokens", () => {
  const result = classifyDescriptiveDiagnosticIdentities(
    'const unexplained = "FUNGI-NOVEL-AMBIGUOUS";\n',
  );
  assert.deepEqual(result.identities, []);
  assert.deepEqual(
    result.unclassified.map((entry) => entry.code),
    ["FUNGI-NOVEL-AMBIGUOUS"],
  );
});

test("descriptive diagnostic classifier refuses dynamically assembled code prefixes", () => {
  const result = classifyDescriptiveDiagnosticIdentities(
    'return fuseError("FUNGI-FUSE-" + suffix, "x");\n',
  );
  assert.deepEqual(result.identities, []);
  assert.deepEqual(
    result.unclassified.map((entry) => [entry.code, entry.reason]),
    [["FUNGI-FUSE", "partial-token"]],
  );
});

test("regex literals containing quotes cannot corrupt later sink classification", () => {
  const result = classifyDescriptiveDiagnosticIdentities([
    "const quoted = /['\"]/;",
    'add("FUNGI-LINT-CONTRACT", 1, "missing");',
  ].join("\n"));
  assert.deepEqual(result.identities.map((entry) => entry.code), ["FUNGI-LINT-CONTRACT"]);
  assert.equal(result.unclassified.length, 0);
});

test("family-prefix tables and prefix comparisons remain references", () => {
  const result = classifyDescriptiveDiagnosticIdentities([
    'const PREFIX_CATEGORY = [["FUNGI-TENANT-", "tenant"]];',
    'const governed = code.startsWith("FUNGI-GOV-");',
  ].join("\n"));
  assert.deepEqual(result.identities, []);
  assert.deepEqual(result.unclassified, []);
  assert.deepEqual(
    result.references.map((entry) => entry.code),
    ["FUNGI-TENANT", "FUNGI-GOV"],
  );
});

test("descriptive diagnostic classifier keeps test-only tokens non-authorizing", () => {
  const result = classifyDescriptiveDiagnosticIdentities(
    'throw new Error("FUNGI-FIXTURE-REFUSAL");\n',
    { testOnly: true },
  );
  assert.deepEqual(result.identities, []);
  assert.deepEqual(result.references.map((entry) => entry.code), ["FUNGI-FIXTURE-REFUSAL"]);
});
