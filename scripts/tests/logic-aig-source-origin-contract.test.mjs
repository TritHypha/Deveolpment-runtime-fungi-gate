import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  classifySourcePath,
  decodeDiagnosticSet,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
  validateExpectedParseOutcomes,
  validateGeneratedConsumerPolicy,
  validateParserPolicy,
  validateProposedBaseline,
  validateRepositoryIdentity,
  validateResolutionPolicy,
  validateSourcePolicy,
  validateToolchainPins,
} from "../lib/logic-aig-source-origin/contract.mjs";

const GOVERNANCE = new URL("../../governance/", import.meta.url);

const POLICY_FILES = Object.freeze({
  generated: "logic-aig-source-origin-generated-consumers.json",
  parser: "logic-aig-source-origin-parser-policy.json",
  repository: "logic-aig-source-origin-repository-identity.json",
  resolution: "logic-aig-source-origin-resolution-policy.json",
  source: "logic-aig-source-origin-source-policy.json",
});

const EXPECTED_UNRESOLVED_REASON_ROWS = Object.freeze([
  { relationshipClass: "CALLER", reasonCode: "AMBIGUOUS_TARGET", permittedCandidateStates: ["EXACT_SET"] },
  { relationshipClass: "CALLER", reasonCode: "DYNAMIC_TARGET", permittedCandidateStates: ["EXACT_SET", "UNKNOWN"] },
  { relationshipClass: "CALLER", reasonCode: "MISSING_TARGET", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "CALLER", reasonCode: "OWNER_DISPOSITION_CALLER_UNRESOLVED", permittedCandidateStates: ["NOT_APPLICABLE"] },
  { relationshipClass: "CALLER", reasonCode: "TARGET_OUTSIDE_SOURCE_DOMAIN", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "CONTRACT", reasonCode: "AMBIGUOUS_TARGET", permittedCandidateStates: ["EXACT_SET"] },
  { relationshipClass: "CONTRACT", reasonCode: "DYNAMIC_TARGET", permittedCandidateStates: ["EXACT_SET", "UNKNOWN"] },
  { relationshipClass: "CONTRACT", reasonCode: "MISSING_TARGET", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "CONTRACT", reasonCode: "OWNER_DISPOSITION_CONTRACT_UNRESOLVED", permittedCandidateStates: ["NOT_APPLICABLE"] },
  { relationshipClass: "CONTRACT", reasonCode: "TARGET_OUTSIDE_SOURCE_DOMAIN", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "GENERATED_CONSUMER", reasonCode: "OWNER_DISPOSITION_GENERATED_CONSUMER_UNRESOLVED", permittedCandidateStates: ["NOT_APPLICABLE"] },
  { relationshipClass: "IMPORT", reasonCode: "AMBIGUOUS_TARGET", permittedCandidateStates: ["EXACT_SET"] },
  { relationshipClass: "IMPORT", reasonCode: "DYNAMIC_TARGET", permittedCandidateStates: ["EXACT_SET", "UNKNOWN"] },
  { relationshipClass: "IMPORT", reasonCode: "MISSING_TARGET", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "IMPORT", reasonCode: "OWNER_DISPOSITION_IMPORT_UNRESOLVED", permittedCandidateStates: ["NOT_APPLICABLE"] },
  { relationshipClass: "IMPORT", reasonCode: "TARGET_OUTSIDE_SOURCE_DOMAIN", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "TEST", reasonCode: "AMBIGUOUS_TARGET", permittedCandidateStates: ["EXACT_SET"] },
  { relationshipClass: "TEST", reasonCode: "DYNAMIC_TARGET", permittedCandidateStates: ["EXACT_SET", "UNKNOWN"] },
  { relationshipClass: "TEST", reasonCode: "MISSING_TARGET", permittedCandidateStates: ["UNKNOWN"] },
  { relationshipClass: "TEST", reasonCode: "OWNER_DISPOSITION_TEST_UNRESOLVED", permittedCandidateStates: ["NOT_APPLICABLE"] },
  { relationshipClass: "TEST", reasonCode: "TARGET_OUTSIDE_SOURCE_DOMAIN", permittedCandidateStates: ["UNKNOWN"] },
]);

async function readPolicy(name) {
  const bytes = await readFile(new URL(POLICY_FILES[name], GOVERNANCE));
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function clone(value) {
  return structuredClone(value);
}

function expectCode(code, operation) {
  assert.throws(operation, (error) => error?.code === code);
}

test("exports the sole exact immutable eleven-field limit owner", () => {
  assert.deepEqual(SOURCE_ORIGIN_LIMITS, {
    heldFileBytes: 67_108_864,
    jsonBytes: 67_108_864,
    sourceFiles: 16_384,
    sourceBytes: 67_108_864,
    resolutionFiles: 1_024,
    resolutionBytes: 4_194_304,
    nodes: 65_536,
    edges: 200_000,
    unresolvedRows: 262_144,
    processMillis: 900_000,
    processOutputBytes: 1_048_576,
  });
  assert(Object.isFrozen(SOURCE_ORIGIN_LIMITS));
});

test("raw and domain-separated canonical SHA-256 helpers match independent literals", () => {
  assert.equal(sha256Raw(Buffer.from("abc", "ascii")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(
    sha256Canonical("fixture.v1", { z: 1, a: false }),
    "24f3b0b2d25f2e6f4b20e2f73f9f92cec10e38aa5ecdbe3cd2d2d99d6efc2d26",
  );
  assert.equal(canonicalJsonText({ z: 1, a: false }), '{"a":false,"z":1}');
});

test("canonical byte parsing rejects duplicate members and semantically equal noncanonical bytes", () => {
  expectCode(
    "SOURCE_ORIGIN_JSON_DUPLICATE",
    () => parseCanonicalJsonBytes(Buffer.from('{"a":1,"a":1}', "utf8"), { label: "duplicate" }),
  );
  expectCode(
    "SOURCE_ORIGIN_JSON_CANONICAL",
    () => parseCanonicalJsonBytes(Buffer.from('{ "a": 1 }', "utf8"), { label: "spaced" }),
  );
  assert.deepEqual(
    parseCanonicalJsonBytes(Buffer.from('{"a":1}', "utf8"), { label: "canonical" }),
    { a: 1 },
  );
});

test("the five tracked static owners are canonical, closed, self-digested and non-authorizing", async () => {
  const repository = await readPolicy("repository");
  const source = await readPolicy("source");
  const resolution = await readPolicy("resolution");
  const parser = await readPolicy("parser");
  const generated = await readPolicy("generated");

  for (const { bytes, value } of [repository, source, resolution, parser, generated]) {
    assert.equal(bytes.toString("utf8"), canonicalJsonText(value));
    assert.equal(value.authorizing, false);
  }

  assert.deepEqual(validateRepositoryIdentity(repository.value), repository.value);
  assert.deepEqual(validateSourcePolicy(source.value), source.value);
  assert.deepEqual(validateResolutionPolicy(resolution.value), resolution.value);
  assert.deepEqual(validateParserPolicy(parser.value), parser.value);
  assert.deepEqual(validateGeneratedConsumerPolicy(generated.value), generated.value);
  assert.equal(generated.value.policyDigest, "60c7c6d588d3c888206093c43da6b433bc6d904cb3059376b87c54b83750a5e9");
});

test("repository identity rejects missing, surplus, alias, literal-join and digest drift", async () => {
  const { value } = await readPolicy("repository");
  const missing = clone(value);
  delete missing.repositoryName;
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateRepositoryIdentity(missing));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateRepositoryIdentity({ ...value, remote: "origin" }));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateRepositoryIdentity({ ...value, repositoryId: value.canonicalIdentity }));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateRepositoryIdentity({ ...value, canonicalIdentity: "TritHypha/Other" }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateRepositoryIdentity({ ...value, identityDigest: "0".repeat(64) }));
});

test("source policy rejects shape/order/alias drift and classifies by exact longest suffix", async () => {
  const { value } = await readPolicy("source");
  const reorderedDomains = clone(value);
  reorderedDomains.domains.reverse();
  expectCode("SOURCE_ORIGIN_ORDER", () => validateSourcePolicy(reorderedDomains));

  const duplicateSuffix = clone(value);
  duplicateSuffix.suffixes[1] = clone(duplicateSuffix.suffixes[0]);
  expectCode("SOURCE_ORIGIN_ORDER", () => validateSourcePolicy(duplicateSuffix));

  const aliasRow = clone(value);
  aliasRow.suffixes[0].classification = aliasRow.suffixes[0].domain;
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateSourcePolicy(aliasRow));

  const missing = clone(value);
  missing.suffixes.pop();
  expectCode("SOURCE_ORIGIN_POLICY", () => validateSourcePolicy(missing));

  assert.equal(classifySourcePath("types/index.d.ts", value), "HOST");
  assert.equal(classifySourcePath("types/index.ts", value), "HOST");
  assert.equal(classifySourcePath("src/module.mts", value), "HOST");
  assert.equal(classifySourcePath("src/module.fungi", value), "FUNGI");
  assert.equal(classifySourcePath("src/module.gate", value), "GATE");
  assert.equal(classifySourcePath("src/module.txt", value), null);
});

test("resolution policy fixes exact arrays, regex sources and test-domain classification inputs", async () => {
  const { value } = await readPolicy("resolution");
  const reordered = clone(value);
  [reordered.sourceSuffixes[0], reordered.sourceSuffixes[1]] = [reordered.sourceSuffixes[1], reordered.sourceSuffixes[0]];
  expectCode("SOURCE_ORIGIN_ORDER", () => validateResolutionPolicy(reordered));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateResolutionPolicy({ ...value, resolutionGlobs: [] }));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateResolutionPolicy({ ...value, includeExpectedOutcomeOwners: false }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateResolutionPolicy({ ...value, policyDigest: "f".repeat(64) }));
});

test("parser policy fixes the shared diagnostic decoder and complete unresolved vocabulary", async () => {
  const { value } = await readPolicy("parser");
  assert.equal(value.diagnosticSetEncoding, "ASCII_COMMA_OR_WHITESPACE_V1");
  assert.deepEqual(value.unresolvedReasonRows, EXPECTED_UNRESOLVED_REASON_ROWS);
  assert.deepEqual(decodeDiagnosticSet("  TS-007, FUNGI-PARSE-001\tTS-1234  ", value), ["FUNGI-PARSE-001", "TS-007", "TS-1234"]);
  assert.deepEqual(decodeDiagnosticSet("TS-1234 FUNGI-PARSE-001", value), ["FUNGI-PARSE-001", "TS-1234"]);

  for (const invalid of ["", ",TS-007", "TS-007,", "TS-007,,TS-008", "TS-007\u00a0TS-008", "TS-007 TS-007", "not-a-code"]) {
    expectCode("SOURCE_ORIGIN_DIAGNOSTIC_SET", () => decodeDiagnosticSet(invalid, value));
  }

  const missingEncoding = clone(value);
  delete missingEncoding.diagnosticSetEncoding;
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateParserPolicy(missingEncoding));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateParserPolicy({ ...value, diagnosticSeparator: "," }));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateParserPolicy({ ...value, diagnosticSetEncoding: "CSV_V1" }));

  const reorderedReasons = clone(value);
  [reorderedReasons.unresolvedReasonRows[0], reorderedReasons.unresolvedReasonRows[1]] = [reorderedReasons.unresolvedReasonRows[1], reorderedReasons.unresolvedReasonRows[0]];
  expectCode("SOURCE_ORIGIN_ORDER", () => validateParserPolicy(reorderedReasons));

  const unknownReason = clone(value);
  unknownReason.unresolvedReasonRows[0].reasonCode = "UNKNOWN_ALIAS";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateParserPolicy(unknownReason));
});

test("generated-consumer policy rejects aliases, relation order drift and digest drift", async () => {
  const { value } = await readPolicy("generated");
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateGeneratedConsumerPolicy({ ...value, generatedRelations: [] }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateGeneratedConsumerPolicy({ ...value, policyDigest: "0".repeat(64) }));
});

test("inline Proposed-baseline fixtures enforce closed rows, ordering, uniqueness and digest", () => {
  const body = {
    schema: "galerina.example-proposed-baseline.v1",
    entries: [
      { directoryName: "Proposed-A", reason: "first" },
      { directoryName: "Proposed-B", reason: "second" },
    ],
    authorizing: false,
  };
  const value = { ...body, policyDigest: sha256Canonical(body.schema, body) };
  assert.deepEqual(validateProposedBaseline(value), value);
  expectCode("SOURCE_ORIGIN_ORDER", () => validateProposedBaseline({ ...value, entries: [...value.entries].reverse() }));
  expectCode("SOURCE_ORIGIN_ORDER", () => validateProposedBaseline({ ...value, entries: [value.entries[0], value.entries[0]] }));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateProposedBaseline({ ...value, entries: [{ ...value.entries[0], alias: "x" }] }));
});

test("inline expected-outcome fixtures enforce exact closed row comparator and digest", async () => {
  const parser = (await readPolicy("parser")).value;
  const body = {
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parser.policyDigest,
    rows: [],
    authorizing: false,
  };
  const value = { ...body, expectedOutcomesDigest: sha256Canonical(body.schema, body) };
  assert.deepEqual(validateExpectedParseOutcomes(value, { parserPolicy: parser }), value);
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateExpectedParseOutcomes({ ...value, outcomes: [] }, { parserPolicy: parser }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateExpectedParseOutcomes({ ...value, expectedOutcomesDigest: "0".repeat(64) }, { parserPolicy: parser }));
});

test("inline toolchain-pin fixtures enforce empty authority and sorted unique record IDs", () => {
  const body = {
    schema: "galerina.logic-aig-toolchain-pins.v1",
    records: [],
    authorizing: false,
  };
  const value = { ...body, pinsDigest: sha256Canonical(body.schema, body) };
  assert.deepEqual(validateToolchainPins(value), value);
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins({ ...value, pins: [] }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateToolchainPins({ ...value, pinsDigest: "0".repeat(64) }));
});
