import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  PARSER_POLICY_BODY,
  RESOLUTION_POLICY_BODY,
  SOURCE_ORIGIN_LIMITS,
  SOURCE_POLICY_BODY,
  UNRESOLVED_REASON_ROWS,
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

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert(Object.isFrozen(value));
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
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
  for (const policy of [SOURCE_POLICY_BODY, RESOLUTION_POLICY_BODY, PARSER_POLICY_BODY, UNRESOLVED_REASON_ROWS]) {
    assertDeepFrozen(policy);
  }
});

test("raw and domain-separated canonical SHA-256 helpers match independent literals", () => {
  assert.equal(sha256Raw(Buffer.from("abc", "ascii")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(
    sha256Canonical("fixture.v1", { z: 1, a: false }),
    "24f3b0b2d25f2e6f4b20e2f73f9f92cec10e38aa5ecdbe3cd2d2d99d6efc2d26",
  );
  assert.equal(canonicalJsonText({ z: 1, a: false }), '{"a":false,"z":1}');
  expectCode("SOURCE_ORIGIN_JSON_CANONICAL", () => canonicalJsonText(-1));
  expectCode("SOURCE_ORIGIN_JSON_CANONICAL", () => canonicalJsonText({ value: "\ud800" }));
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
  expectCode(
    "SOURCE_ORIGIN_JSON_CANONICAL",
    () => parseCanonicalJsonBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"a":1}')]), { label: "bom" }),
  );

  const sparse = [];
  sparse.length = 1;
  expectCode("SOURCE_ORIGIN_JSON_CANONICAL", () => canonicalJsonText(sparse));

  let getterCalls = 0;
  const accessor = [];
  Object.defineProperty(accessor, "0", { enumerable: true, get() { getterCalls += 1; return 1; } });
  accessor.length = 1;
  expectCode("SOURCE_ORIGIN_JSON_CANONICAL", () => canonicalJsonText(accessor));
  assert.equal(getterCalls, 0);

  const decorated = [1];
  decorated.alias = true;
  expectCode("SOURCE_ORIGIN_JSON_CANONICAL", () => canonicalJsonText(decorated));
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

  const validated = [
    validateRepositoryIdentity(repository.value),
    validateSourcePolicy(source.value),
    validateResolutionPolicy(resolution.value),
    validateParserPolicy(parser.value),
    validateGeneratedConsumerPolicy(generated.value),
  ];
  for (const result of validated) assertDeepFrozen(result);
  assert.notStrictEqual(validated[0], repository.value);
  repository.value.ownerNamespace = "mutated-after-validation";
  assert.equal(validated[0].ownerNamespace, "TritHypha");
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

test("inline expected-outcome fixtures enforce exact closed nested rows, comparator and digest", async () => {
  const parser = (await readPolicy("parser")).value;
  const body = {
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parser.policyDigest,
    rows: [{
      path: "fixtures/negative.ts",
      domain: "HOST",
      parserId: "typescript-compiler-api",
      disposition: "EXPECTED_REFUSAL",
      diagnosticCodes: ["TS-123"],
      ownerKind: "INLINE_EXPECTATION",
      ownerLocator: "fixtures/negative.ts",
      ownerKey: "expected_diagnostics",
    }],
    authorizing: false,
  };
  const value = { ...body, expectedOutcomesDigest: sha256Canonical(body.schema, body) };
  assertDeepFrozen(validateExpectedParseOutcomes(value, { parserPolicy: parser }));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateExpectedParseOutcomes({ ...value, outcomes: [] }, { parserPolicy: parser }));
  const aliasRow = structuredClone(value);
  aliasRow.rows[0].codes = aliasRow.rows[0].diagnosticCodes;
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateExpectedParseOutcomes(aliasRow, { parserPolicy: parser }));
  for (const hostilePath of ["../negative.ts", "/absolute/negative.ts", "C:/absolute/negative.ts", "C:\\absolute\\negative.ts"]) {
    const hostile = structuredClone(value);
    hostile.rows[0].path = hostilePath;
    hostile.rows[0].ownerLocator = hostilePath;
    const hostileBody = { ...hostile };
    delete hostileBody.expectedOutcomesDigest;
    hostile.expectedOutcomesDigest = sha256Canonical(hostile.schema, hostileBody);
    expectCode("SOURCE_ORIGIN_POLICY", () => validateExpectedParseOutcomes(hostile, { parserPolicy: parser }));
  }
  const arbitraryGateOwner = structuredClone(value);
  Object.assign(arbitraryGateOwner.rows[0], {
    path: "fixtures/negative.gate",
    domain: "GATE",
    parserId: "galerina-gate-v3-parser",
    ownerKind: "GATE_V3_VERDICT",
    ownerLocator: "governance/arbitrary.json",
    ownerKey: "arbitrary",
  });
  const gateBody = { ...arbitraryGateOwner };
  delete gateBody.expectedOutcomesDigest;
  arbitraryGateOwner.expectedOutcomesDigest = sha256Canonical(arbitraryGateOwner.schema, gateBody);
  expectCode("SOURCE_ORIGIN_POLICY", () => validateExpectedParseOutcomes(arbitraryGateOwner, { parserPolicy: parser }));
  const arbitraryProposedOwner = structuredClone(value);
  Object.assign(arbitraryProposedOwner.rows[0], {
    path: "fixtures/opaque.fungi",
    domain: "FUNGI",
    parserId: "galerina-fungi-parser",
    disposition: "OPAQUE_PROPOSED",
    diagnosticCodes: null,
    ownerKind: "PROPOSED_BASELINE",
    ownerLocator: "governance/arbitrary.json",
    ownerKey: "Proposed-A",
  });
  const proposedBody = { ...arbitraryProposedOwner };
  delete proposedBody.expectedOutcomesDigest;
  arbitraryProposedOwner.expectedOutcomesDigest = sha256Canonical(arbitraryProposedOwner.schema, proposedBody);
  expectCode("SOURCE_ORIGIN_POLICY", () => validateExpectedParseOutcomes(arbitraryProposedOwner, { parserPolicy: parser }));
  const wrongProposedKey = structuredClone(arbitraryProposedOwner);
  wrongProposedKey.rows[0].path = "examples/Proposed-A/example.fungi";
  wrongProposedKey.rows[0].ownerLocator = "governance/example-proposed-baseline.json";
  wrongProposedKey.rows[0].ownerKey = "NOT-A-PATH-COMPONENT";
  const wrongProposedKeyBody = { ...wrongProposedKey };
  delete wrongProposedKeyBody.expectedOutcomesDigest;
  wrongProposedKey.expectedOutcomesDigest = sha256Canonical(wrongProposedKey.schema, wrongProposedKeyBody);
  expectCode("SOURCE_ORIGIN_POLICY", () => validateExpectedParseOutcomes(wrongProposedKey, { parserPolicy: parser }));
  const validProposedKey = structuredClone(wrongProposedKey);
  validProposedKey.rows[0].ownerKey = "Proposed-A";
  const validProposedKeyBody = { ...validProposedKey };
  delete validProposedKeyBody.expectedOutcomesDigest;
  validProposedKey.expectedOutcomesDigest = sha256Canonical(validProposedKey.schema, validProposedKeyBody);
  assertDeepFrozen(validateExpectedParseOutcomes(validProposedKey, { parserPolicy: parser }));
  const sparseRows = structuredClone(value);
  sparseRows.rows = Array(1);
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateExpectedParseOutcomes(sparseRows, { parserPolicy: parser }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateExpectedParseOutcomes({ ...value, expectedOutcomesDigest: "0".repeat(64) }, { parserPolicy: parser }));
});

test("inline toolchain-pin fixtures enforce closed nested records and sorted unique record IDs", () => {
  const executableIdentity = { version: "fixture-1", executableRawSha256: "1".repeat(64), executableByteLength: 1 };
  const packageIdentity = {
    name: "fixture-package",
    version: "1.0.0",
    packageLocator: "node_modules/fixture-package/package.json",
    packageRawSha256: "2".repeat(64),
    packageByteLength: 2,
    entryLocator: "node_modules/fixture-package/index.js",
    entryRawSha256: "3".repeat(64),
    entryByteLength: 3,
  };
  const moduleClosureBody = {
    schema: "galerina.logic-aig-module-closure.v1",
    executableModuleRows: [],
    dataRows: [],
    builtinModules: [],
    counts: { executableModules: 0, dataRows: 0, builtinModules: 0 },
    authorizing: false,
  };
  const recordBody = {
    recordId: "fixture-record",
    platform: "fixture-platform",
    arch: "fixture-arch",
    nodeIdentity: executableIdentity,
    gitIdentity: executableIdentity,
    typescript: packageIdentity,
    galerinaParser: { ...packageIdentity, name: "fixture-parser" },
    builtinModules: [],
    executableModuleRows: [],
    dataRows: [],
    moduleClosureDigest: sha256Canonical(moduleClosureBody.schema, moduleClosureBody),
  };
  const record = { ...recordBody, recordDigest: sha256Canonical("galerina.logic-aig-toolchain-pin-record.v1", recordBody) };
  const body = {
    schema: "galerina.logic-aig-toolchain-pins.v1",
    records: [record],
    authorizing: false,
  };
  const value = { ...body, pinsDigest: sha256Canonical(body.schema, body) };
  assertDeepFrozen(validateToolchainPins(value));
  const redigest = (candidate) => {
    const candidateRecord = candidate.records[0];
    const closureBody = {
      schema: "galerina.logic-aig-module-closure.v1",
      executableModuleRows: candidateRecord.executableModuleRows,
      dataRows: candidateRecord.dataRows,
      builtinModules: candidateRecord.builtinModules,
      counts: {
        executableModules: candidateRecord.executableModuleRows.length,
        dataRows: candidateRecord.dataRows.length,
        builtinModules: candidateRecord.builtinModules.length,
      },
      authorizing: false,
    };
    candidateRecord.moduleClosureDigest = sha256Canonical(closureBody.schema, closureBody);
    const candidateRecordBody = { ...candidateRecord };
    delete candidateRecordBody.recordDigest;
    candidateRecord.recordDigest = sha256Canonical("galerina.logic-aig-toolchain-pin-record.v1", candidateRecordBody);
    const candidateBody = { ...candidate };
    delete candidateBody.pinsDigest;
    candidate.pinsDigest = sha256Canonical(candidate.schema, candidateBody);
    return candidate;
  };
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins({ ...value, pins: [] }));
  const aliasRecord = structuredClone(value);
  aliasRecord.records[0].proposalDigest = "4".repeat(64);
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins(aliasRecord));
  const sparseRecords = structuredClone(value);
  sparseRecords.records = Array(1);
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins(sparseRecords));
  const traversalPackage = structuredClone(value);
  traversalPackage.records[0].typescript.packageLocator = "../typescript/package.json";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(redigest(traversalPackage)));
  const absoluteEntry = structuredClone(value);
  absoluteEntry.records[0].galerinaParser.entryLocator = "C:/parser/index.mjs";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(redigest(absoluteEntry)));
  const hostileBuiltin = structuredClone(value);
  hostileBuiltin.records[0].builtinModules = ["node:fs/../evil"];
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(redigest(hostileBuiltin)));
  const traversalClosure = structuredClone(value);
  traversalClosure.records[0].executableModuleRows = [{ locator: "../escape.js", rawSha256: "5".repeat(64), byteLength: 1 }];
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(redigest(traversalClosure)));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateToolchainPins({ ...value, pinsDigest: "0".repeat(64) }));
});
