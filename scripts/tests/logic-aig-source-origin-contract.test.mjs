import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  PARSER_POLICY_BODY,
  RESOLUTION_POLICY_BODY,
  SOURCE_ORIGIN_LIMITS,
  SOURCE_POLICY_BODY,
  TOOLCHAIN_TYPESCRIPT_DATA_LOCATORS,
  UNRESOLVED_REASON_ROWS,
  canonicalJsonText,
  classifySourcePath,
  decodeDiagnosticSet,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
  validateExpectedParseOutcomes,
  validateGeneratedConsumerPolicy,
  validateParseOutcomesReceipt,
  validateParserPolicy,
  validateProposedBaseline,
  validateRepositoryIdentity,
  validateResolutionInputs,
  validateResolutionPolicy,
  validateSourceManifest,
  validateSourcePolicy,
  validateToolchainManifest,
  validateToolchainPins,
} from "../lib/logic-aig-source-origin/contract.mjs";
import { buildToolchainSnapshot } from "../lib/logic-aig-source-origin/toolchain-snapshot.mjs";

const GOVERNANCE = new URL("../../governance/", import.meta.url);

const POLICY_FILES = Object.freeze({
  generated: "logic-aig-source-origin-generated-consumers.json",
  parser: "logic-aig-source-origin-parser-policy.json",
  pins: "logic-aig-source-origin-toolchain-pins.json",
  proposed: "example-proposed-baseline.json",
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

function without(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
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

function manifestRow(path, body = path) {
  const bytes = Buffer.from(body, "utf8");
  return {
    path,
    mode: "100644",
    blobOid: "a".repeat(40),
    objectFormat: "sha1",
    byteLength: bytes.length,
    rawSha256: sha256Raw(bytes),
  };
}

function sourceManifestFixture({ repository, source, rows = [manifestRow("src/example.ts")] }) {
  const body = {
    schema: "galerina.logic-aig-source-manifest.v1",
    repositoryId: `repository:${repository.identityDigest}`,
    expectedHead: "b".repeat(40),
    expectedTree: "c".repeat(40),
    objectFormat: "sha1",
    policyDigest: source.policyDigest,
    exclusionDigest: sha256Canonical("galerina.logic-aig-exclusions.v1", source.exclusions),
    rows,
    counts: {
      paths: rows.length,
      blobs: new Set(rows.map((row) => row.blobOid)).size,
      bytes: rows.reduce((sum, row) => sum + row.byteLength, 0),
      mode100644: rows.filter((row) => row.mode === "100644").length,
      mode100755: rows.filter((row) => row.mode === "100755").length,
      exclusions: 0,
    },
    authorizing: false,
  };
  return { ...body, manifestDigest: sha256Canonical(body.schema, body) };
}

function resolutionInputsFixture({ repository, resolution, rows = [manifestRow("package.json", "{}")], head = "b".repeat(40), tree = "c".repeat(40) }) {
  const body = {
    schema: "galerina.logic-aig-resolution-inputs.v1",
    repositoryId: `repository:${repository.identityDigest}`,
    expectedHead: head,
    expectedTree: tree,
    policyDigest: resolution.policyDigest,
    rows,
    authorizing: false,
  };
  return { ...body, resolutionInputsDigest: sha256Canonical(body.schema, body) };
}

function receiptManifestBinding(manifestKind, row) {
  const domain = manifestKind === "SOURCE_MANIFEST"
    ? "galerina.logic-aig-source-manifest-row.v1"
    : "galerina.logic-aig-resolution-input-row.v1";
  return {
    manifestKind,
    manifestRowDigest: sha256Canonical(domain, row),
    path: row.path,
    blobOid: row.blobOid,
    rawSha256: row.rawSha256,
    byteLength: row.byteLength,
  };
}

function resealOutcomeReceipt(receipt, expectedOutcomes) {
  const rows = receipt.rows.map((row) => {
    const expected = expectedOutcomes.rows.find((candidate) => candidate.path === row.path);
    assert(expected);
    const membershipBody = {
      schema: "galerina.logic-aig-outcome-membership-proof.v1",
      expectedOutcomesDigest: expectedOutcomes.expectedOutcomesDigest,
      path: row.path,
      disposition: row.disposition,
      parserId: row.parserId,
      expectedDiagnosticCodes: expected.diagnosticCodes,
      sourceBinding: row.sourceBinding,
      ownerBindings: row.ownerBindings,
      authorizing: false,
    };
    const rowBody = {
      ...row,
      membershipProofDigest: sha256Canonical(membershipBody.schema, membershipBody),
    };
    delete rowBody.rowDigest;
    return {
      ...rowBody,
      rowDigest: sha256Canonical("galerina.logic-aig-parse-outcome-row.v1", rowBody),
    };
  });
  const body = { ...receipt, rows };
  delete body.receiptDigest;
  return { ...body, receiptDigest: sha256Canonical(body.schema, body) };
}

async function nonEmptyReceiptFixture() {
  const repositoryIdentity = (await readPolicy("repository")).value;
  const sourcePolicy = (await readPolicy("source")).value;
  const resolutionPolicy = (await readPolicy("resolution")).value;
  const parserPolicy = (await readPolicy("parser")).value;
  const pins = (await readPolicy("pins")).value;
  const proposedBaseline = (await readPolicy("proposed")).value;
  const record = pins.records.find((row) => row.platform === process.platform && row.arch === process.arch);
  assert(record);
  const sourceRow = manifestRow("src/negative.ts", "/// expected_diagnostics: TS-1109\nconst = ;\n");
  const sidecarRow = manifestRow("src/negative.ts.expected.diagnostics.txt", "TS-1109\n");
  const sourceManifest = sourceManifestFixture({ repository: repositoryIdentity, source: sourcePolicy, rows: [sourceRow] });
  const resolutionInputs = resolutionInputsFixture({ repository: repositoryIdentity, resolution: resolutionPolicy, rows: [sidecarRow] });
  const expectedRow = {
    path: sourceRow.path,
    domain: "HOST",
    parserId: "typescript-compiler-api",
    disposition: "EXPECTED_REFUSAL",
    diagnosticCodes: ["TS-1109"],
    ownerKind: "INLINE_EXPECTATION",
    ownerLocator: sourceRow.path,
    ownerKey: "expected_diagnostics",
  };
  const expectedBody = {
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parserPolicy.policyDigest,
    rows: [expectedRow],
    authorizing: false,
  };
  const expectedOutcomes = {
    ...expectedBody,
    expectedOutcomesDigest: sha256Canonical(expectedBody.schema, expectedBody),
  };
  const toolchainManifest = buildToolchainSnapshot({
    pins,
    platform: record.platform,
    arch: record.arch,
    nodeIdentity: clone(record.nodeIdentity),
    gitIdentity: clone(record.gitIdentity),
    actualRuntimeLoadSets: record.runtimeLoadSets.map((row) => ({
      id: row.id,
      moduleRows: clone(row.moduleRows),
      builtinModules: clone(row.builtinModules),
    })),
    actualParserExportNames: clone(record.sourceOriginParser.exportNames),
  });
  const sourceBinding = receiptManifestBinding("SOURCE_MANIFEST", sourceRow);
  const ownerSourceBinding = receiptManifestBinding("SOURCE_MANIFEST", sourceRow);
  const ownerBinding = {
    ownerKind: expectedRow.ownerKind,
    manifestKind: ownerSourceBinding.manifestKind,
    manifestRowDigest: ownerSourceBinding.manifestRowDigest,
    locator: ownerSourceBinding.path,
    blobOid: ownerSourceBinding.blobOid,
    rawSha256: ownerSourceBinding.rawSha256,
    byteLength: ownerSourceBinding.byteLength,
    ownerKey: expectedRow.ownerKey,
    ownerReason: null,
  };
  const row = {
    path: expectedRow.path,
    disposition: expectedRow.disposition,
    parserId: expectedRow.parserId,
    actualStatus: "REFUSED_AS_EXPECTED",
    actualDiagnosticCodes: clone(expectedRow.diagnosticCodes),
    sourceBinding,
    ownerBindings: [ownerBinding],
    membershipProofDigest: "0".repeat(64),
    representedFileNodeId: `ga1:${"d".repeat(64)}`,
    unresolvedRowsDigest: "e".repeat(64),
    rowDigest: "0".repeat(64),
  };
  const receiptBody = {
    schema: "galerina.logic-aig-parse-outcomes-receipt.v1",
    repositoryId: sourceManifest.repositoryId,
    expectedHead: sourceManifest.expectedHead,
    expectedTree: sourceManifest.expectedTree,
    expectedOutcomesDigest: expectedOutcomes.expectedOutcomesDigest,
    sourceManifestDigest: sourceManifest.manifestDigest,
    resolutionInputsDigest: resolutionInputs.resolutionInputsDigest,
    toolchainManifestDigest: toolchainManifest.toolchainManifestDigest,
    rows: [row],
    counts: {
      outcomeRows: 1,
      expectedRefusalRows: 1,
      opaqueProposedRows: 0,
      representedFileNodes: 1,
      unresolvedRows: 5,
      ownerBindings: 1,
    },
    authorizing: false,
    receiptDigest: "0".repeat(64),
  };
  const receipt = resealOutcomeReceipt(receiptBody, expectedOutcomes);
  return {
    receipt,
    expectedOutcomes,
    sourceManifest,
    resolutionInputs,
    toolchainManifest,
    parserPolicy,
    repositoryIdentity,
    sourcePolicy,
    resolutionPolicy,
    pins,
    proposedBaseline,
    sourceRow,
    sidecarRow,
  };
}

async function proposedReasonReceiptFixture() {
  const fixture = await nonEmptyReceiptFixture();
  const proposedBaseline = (await readPolicy("proposed")).value;
  const proposedEntry = proposedBaseline.entries[0];
  assert(proposedEntry);
  const sourceRow = manifestRow(
    `docs/examples/Level-1-Basics/${proposedEntry.directoryName}/example.fungi`,
    "opaque proposed input\n",
  );
  const proposedOwnerRow = manifestRow(
    "governance/example-proposed-baseline.json",
    canonicalJsonText(proposedBaseline),
  );
  const sourceManifest = sourceManifestFixture({
    repository: fixture.repositoryIdentity,
    source: fixture.sourcePolicy,
    rows: [sourceRow],
  });
  const resolutionInputs = resolutionInputsFixture({
    repository: fixture.repositoryIdentity,
    resolution: fixture.resolutionPolicy,
    rows: [proposedOwnerRow],
  });
  const expectedRow = {
    path: sourceRow.path,
    domain: "FUNGI",
    parserId: "galerina-fungi-parser",
    disposition: "OPAQUE_PROPOSED",
    diagnosticCodes: null,
    ownerKind: "PROPOSED_BASELINE",
    ownerLocator: proposedOwnerRow.path,
    ownerKey: proposedEntry.directoryName,
  };
  const expectedBody = {
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: fixture.parserPolicy.policyDigest,
    rows: [expectedRow],
    authorizing: false,
  };
  const expectedOutcomes = {
    ...expectedBody,
    expectedOutcomesDigest: sha256Canonical(expectedBody.schema, expectedBody),
  };
  const sourceBinding = receiptManifestBinding("SOURCE_MANIFEST", sourceRow);
  const ownerManifestBinding = receiptManifestBinding("RESOLUTION_INPUTS", proposedOwnerRow);
  const receiptBody = {
    ...fixture.receipt,
    repositoryId: sourceManifest.repositoryId,
    expectedHead: sourceManifest.expectedHead,
    expectedTree: sourceManifest.expectedTree,
    expectedOutcomesDigest: expectedOutcomes.expectedOutcomesDigest,
    sourceManifestDigest: sourceManifest.manifestDigest,
    resolutionInputsDigest: resolutionInputs.resolutionInputsDigest,
    rows: [{
      path: expectedRow.path,
      disposition: expectedRow.disposition,
      parserId: expectedRow.parserId,
      actualStatus: "OPAQUE_AS_PROPOSED",
      actualDiagnosticCodes: null,
      sourceBinding,
      ownerBindings: [{
        ownerKind: expectedRow.ownerKind,
        manifestKind: ownerManifestBinding.manifestKind,
        manifestRowDigest: ownerManifestBinding.manifestRowDigest,
        locator: ownerManifestBinding.path,
        blobOid: ownerManifestBinding.blobOid,
        rawSha256: ownerManifestBinding.rawSha256,
        byteLength: ownerManifestBinding.byteLength,
        ownerKey: expectedRow.ownerKey,
        ownerReason: proposedEntry.reason,
      }],
      membershipProofDigest: "0".repeat(64),
      representedFileNodeId: `ga1:${"d".repeat(64)}`,
      unresolvedRowsDigest: "e".repeat(64),
      rowDigest: "0".repeat(64),
    }],
    counts: {
      outcomeRows: 1,
      expectedRefusalRows: 0,
      opaqueProposedRows: 1,
      representedFileNodes: 1,
      unresolvedRows: 5,
      ownerBindings: 1,
    },
    receiptDigest: "0".repeat(64),
  };
  return {
    ...fixture,
    proposedBaseline,
    expectedOutcomes,
    sourceManifest,
    resolutionInputs,
    receipt: resealOutcomeReceipt(receiptBody, expectedOutcomes),
  };
}

function receiptAuthorityOptions(fixture) {
  return {
    repositoryIdentity: fixture.repositoryIdentity,
    sourcePolicy: fixture.sourcePolicy,
    resolutionPolicy: fixture.resolutionPolicy,
    parserPolicy: fixture.parserPolicy,
    pins: fixture.pins,
    proposedBaseline: fixture.proposedBaseline,
    expectedOutcomes: fixture.expectedOutcomes,
    sourceManifest: fixture.sourceManifest,
    resolutionInputs: fixture.resolutionInputs,
    toolchainManifest: fixture.toolchainManifest,
  };
}

function receiptForManifests(fixture, sourceManifest, resolutionInputs) {
  const receipt = clone(fixture.receipt);
  receipt.sourceManifestDigest = sourceManifest.manifestDigest;
  receipt.resolutionInputsDigest = resolutionInputs.resolutionInputsDigest;
  const sourceRow = sourceManifest.rows.find((row) => row.path === fixture.sourceRow.path);
  assert(sourceRow);
  receipt.rows[0].sourceBinding = receiptManifestBinding("SOURCE_MANIFEST", sourceRow);
  const ownerSource = receiptManifestBinding("SOURCE_MANIFEST", sourceRow);
  receipt.rows[0].ownerBindings = [{
    ownerKind: fixture.expectedOutcomes.rows[0].ownerKind,
    manifestKind: ownerSource.manifestKind,
    manifestRowDigest: ownerSource.manifestRowDigest,
    locator: ownerSource.path,
    blobOid: ownerSource.blobOid,
    rawSha256: ownerSource.rawSha256,
    byteLength: ownerSource.byteLength,
    ownerKey: fixture.expectedOutcomes.rows[0].ownerKey,
    ownerReason: null,
  }];
  return resealOutcomeReceipt(receipt, fixture.expectedOutcomes);
}

function resealManifest(manifest, digestField) {
  const body = without(manifest, digestField);
  return { ...body, [digestField]: sha256Canonical(body.schema, body) };
}

test("exports the sole exact immutable eleven-field limit owner", () => {
  assert.deepEqual(SOURCE_ORIGIN_LIMITS, {
    capturedFileBytes: 67_108_864,
    jsonBytes: 67_108_864,
    sourceFiles: 16_384,
    sourceBytes: 67_108_864,
    resolutionFiles: 1_024,
    resolutionBytes: 4_194_304,
    nodes: 65_536,
    edges: 200_000,
    unresolvedRows: 262_144,
    processMillis: 900_000,
    processOutputBytes: 67_108_864,
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

test("contract helpers bypass post-import mutable global and prototype dispatch", async (t) => {
  const SafeObject = Object;
  const safeGetDescriptor = Object.getOwnPropertyDescriptor;
  const safeGetPrototypeOf = Object.getPrototypeOf;
  const safeDefineProperty = Object.defineProperty;
  const safeDeleteProperty = Reflect.deleteProperty;
  const safeSymbolIterator = Symbol.iterator;
  const safeGlobalBuffer = globalThis.Buffer;
  const canonicalInput = { z: 2, a: [1, "é", true] };
  const canonicalExpected = "{\"a\":[1,\"é\",true],\"z\":2}";
  const canonicalBytes = Buffer.from(canonicalExpected, "utf8");
  const topLevelStringBytes = Buffer.from('"x"', "utf8");
  const rawBytes = Buffer.from("abc", "utf8");
  const rawView = new Uint8Array([0x61, 0x62, 0x63]);
  const repository = (await readPolicy("repository")).value;
  const source = (await readPolicy("source")).value;
  const parser = (await readPolicy("parser")).value;
  const pins = (await readPolicy("pins")).value;
  const expectedOutcomes = JSON.parse(await readFile(
    new URL("logic-aig-source-origin-expected-parse-outcomes.json", GOVERNANCE),
    "utf8",
  ));
  const receiptFixture = await nonEmptyReceiptFixture();
  const receiptOptions = receiptAuthorityOptions(receiptFixture);
  const hashProbe = createHash("sha256");
  let hashPrototype = safeGetPrototypeOf(hashProbe);
  while (hashPrototype !== null && !SafeObject.hasOwn(hashPrototype, "update")) {
    hashPrototype = safeGetPrototypeOf(hashPrototype);
  }
  assert(hashPrototype);
  const arrayIteratorPrototype = safeGetPrototypeOf([][safeSymbolIterator]());
  const mapIteratorPrototype = safeGetPrototypeOf(new Map().values());
  const setIteratorPrototype = safeGetPrototypeOf(new Set().values());
  const typedArrayPrototype = safeGetPrototypeOf(Uint8Array.prototype);

  const canonicalOperation = () => canonicalJsonText(canonicalInput);
  const parseOperation = () => canonicalJsonText(parseCanonicalJsonBytes(canonicalBytes, { label: "CONTRACT_TCB" }));
  const parseTopLevelStringOperation = () => canonicalJsonText(parseCanonicalJsonBytes(topLevelStringBytes, { label: "CONTRACT_TCB_STRING" }));
  const rawOperation = () => sha256Raw(rawBytes);
  const rawViewOperation = () => sha256Raw(rawView);
  const digestOperation = () => sha256Canonical("rd0873.contract.tcb.v1", canonicalInput);
  const repositoryOperation = () => validateRepositoryIdentity(repository).canonicalIdentity;
  const sourceOperation = () => validateSourcePolicy(source).schema;
  const expectedOperation = () => validateExpectedParseOutcomes(expectedOutcomes, { parserPolicy: parser }).schema;
  const pinsOperation = () => validateToolchainPins(pins).schema;
  const receiptOperation = () => validateParseOutcomesReceipt(receiptFixture.receipt, receiptOptions).schema;
  const diagnosticOperation = () => canonicalJsonText(decodeDiagnosticSet("TS-1109, TS-2304", parser));

  const expectedByOperation = new Map([
    [canonicalOperation, canonicalExpected],
    [parseOperation, canonicalExpected],
    [parseTopLevelStringOperation, '"x"'],
    [rawOperation, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [rawViewOperation, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [digestOperation, "d2c57eb58741228d6d68b7645a4d30215a34ea278b02daf2f9f55f9a0ec17730"],
    [repositoryOperation, "TritHypha/Galerina"],
    [sourceOperation, "galerina.logic-aig-source-policy.v1"],
    [expectedOperation, "galerina.logic-aig-expected-parse-outcomes.v1"],
    [pinsOperation, "galerina.logic-aig-toolchain-pins.v2"],
    [receiptOperation, "galerina.logic-aig-parse-outcomes-receipt.v1"],
    [diagnosticOperation, "[\"TS-1109\",\"TS-2304\"]"],
  ]);

  const exercise = (target, property, replacement, operation) => {
    const descriptor = safeGetDescriptor(target, property);
    let effects = 0;
    let failure;
    let result;
    const attack = () => {
      effects += 1;
      throw new Error(`ATTACKER_${String(property).toUpperCase()}`);
    };
    safeDefineProperty(target, property, replacement(descriptor, attack));
    try { result = operation(); } catch (error) { failure = error; }
    finally {
      if (descriptor === undefined) safeDeleteProperty(target, property);
      else safeDefineProperty(target, property, descriptor);
    }
    assert.equal(effects, 0);
    assert.equal(failure, undefined);
    assert.equal(result, expectedByOperation.get(operation));
  };
  const replaceFunction = (descriptor, attack) => ({
    ...descriptor,
    configurable: true,
    value() { attack(); },
  });
  const replaceGetter = (descriptor, attack) => ({
    configurable: true,
    enumerable: descriptor.enumerable,
    get() { attack(); },
  });
  const replaceGlobal = (descriptor, attack) => ({
    configurable: true,
    enumerable: descriptor.enumerable,
    writable: true,
    value: new Proxy(descriptor.value ?? safeGlobalBuffer, {
      apply() { attack(); },
      construct() { attack(); },
      get() { attack(); },
    }),
  });

  const globalCases = [
    ["Object", canonicalOperation],
    ["Array", canonicalOperation],
    ["Number", canonicalOperation],
    ["Set", canonicalOperation],
    ["Map", pinsOperation],
    ["JSON", canonicalOperation],
    ["Buffer", digestOperation],
    ["Uint8Array", rawViewOperation],
    ["ArrayBuffer", rawViewOperation],
    ["TextEncoder", digestOperation],
    ["TextDecoder", parseOperation],
    ["Reflect", canonicalOperation],
  ];
  for (let index = 0; index < globalCases.length; index += 1) {
    const [property, operation] = globalCases[index];
    await t.test(`global ${property} cannot steer contract helpers`, () => {
      exercise(globalThis, property, replaceGlobal, operation);
    });
  }

  const objectCases = [
    ["getOwnPropertyDescriptor", canonicalOperation],
    ["getOwnPropertyNames", canonicalOperation],
    ["getOwnPropertySymbols", canonicalOperation],
    ["getPrototypeOf", canonicalOperation],
    ["create", canonicalOperation],
    ["defineProperty", canonicalOperation],
    ["hasOwn", canonicalOperation],
    ["freeze", repositoryOperation],
    ["keys", repositoryOperation],
    ["values", receiptOperation],
    ["entries", receiptOperation],
  ];
  for (let index = 0; index < objectCases.length; index += 1) {
    const [property, operation] = objectCases[index];
    await t.test(`Object.${property} cannot steer contract helpers`, () => {
      exercise(SafeObject, property, replaceFunction, operation);
    });
  }

  const arrayCases = [
    ["push", canonicalOperation],
    ["sort", canonicalOperation],
    ["some", repositoryOperation],
    ["includes", canonicalOperation],
    ["map", pinsOperation],
    ["filter", pinsOperation],
    ["every", sourceOperation],
    ["flatMap", pinsOperation],
    ["reduce", receiptOperation],
    ["find", pinsOperation],
    ["at", parseOperation],
    ["pop", parseOperation],
  ];
  for (let index = 0; index < arrayCases.length; index += 1) {
    const [property, operation] = arrayCases[index];
    await t.test(`Array.prototype.${property} cannot steer contract helpers`, () => {
      exercise(Array.prototype, property, replaceFunction, operation);
    });
  }
  await t.test("Array prototype index setters cannot observe canonicalization", () => {
    exercise(
      Array.prototype,
      "0",
      (_descriptor, attack) => ({ configurable: true, set() { attack(); } }),
      canonicalOperation,
    );
  });
  await t.test("Array iterator lookup cannot steer contract helpers", () => {
    exercise(Array.prototype, safeSymbolIterator, replaceFunction, pinsOperation);
  });
  await t.test("Array iterator next cannot steer contract helpers", () => {
    exercise(arrayIteratorPrototype, "next", replaceFunction, pinsOperation);
  });

  for (const property of ["has", "add", "delete"]) {
    await t.test(`Set prototype ${String(property)} cannot steer contract helpers`, () => {
      exercise(Set.prototype, property, replaceFunction, canonicalOperation);
    });
  }
  await t.test("Set iterator lookup cannot steer contract helpers", () => {
    exercise(Set.prototype, safeSymbolIterator, replaceFunction, pinsOperation);
  });
  await t.test("Set prototype size cannot steer contract helpers", () => {
    exercise(Set.prototype, "size", replaceGetter, sourceOperation);
  });
  await t.test("Set iterator next cannot steer contract helpers", () => {
    exercise(setIteratorPrototype, "next", replaceFunction, pinsOperation);
  });

  for (const property of ["get", "set", "values"]) {
    await t.test(`Map.prototype.${property} cannot steer contract helpers`, () => {
      exercise(Map.prototype, property, replaceFunction, pinsOperation);
    });
  }
  await t.test("Map iterator next cannot steer contract helpers", () => {
    exercise(mapIteratorPrototype, "next", replaceFunction, pinsOperation);
  });

  const stringCases = [
    ["charCodeAt", canonicalOperation],
    ["normalize", canonicalOperation],
    ["includes", repositoryOperation],
    ["startsWith", pinsOperation],
    ["endsWith", () => classifySourcePath("src/example.ts", source)],
    ["split", expectedOperation],
    ["slice", parseOperation],
    ["replace", diagnosticOperation],
    ["lastIndexOf", expectedOperation],
    ["toLowerCase", pinsOperation],
  ];
  expectedByOperation.set(stringCases[4][1], "HOST");
  for (let index = 0; index < stringCases.length; index += 1) {
    const [property, operation] = stringCases[index];
    await t.test(`String.prototype.${property} cannot steer contract helpers`, () => {
      exercise(String.prototype, property, replaceFunction, operation);
    });
  }
  await t.test("String prototype indexed accessors cannot observe canonical parsing", () => {
    exercise(
      String.prototype,
      "3",
      (_descriptor, attack) => ({ configurable: true, get() { attack(); } }),
      parseTopLevelStringOperation,
    );
  });

  await t.test("RegExp.prototype.test cannot steer contract helpers", () => {
    exercise(RegExp.prototype, "test", replaceFunction, repositoryOperation);
  });
  for (const [property, operation] of [["stringify", canonicalOperation], ["parse", parseOperation]]) {
    await t.test(`JSON.${property} cannot steer contract helpers`, () => {
      exercise(JSON, property, replaceFunction, operation);
    });
  }
  await t.test("Number.isSafeInteger cannot steer canonicalization", () => {
    exercise(Number, "isSafeInteger", replaceFunction, canonicalOperation);
  });
  for (const property of ["byteLength", "from", "concat"]) {
    await t.test(`Buffer.${property} cannot steer contract helpers`, () => {
      exercise(Buffer, property, replaceFunction, property === "byteLength" ? canonicalOperation : digestOperation);
    });
  }
  await t.test("Buffer.isBuffer cannot steer raw hashing", () => {
    exercise(Buffer, "isBuffer", replaceFunction, rawOperation);
  });
  await t.test("Buffer.poolSize cannot be observed by canonical hashing", {
    skip: process.version !== "v24.18.0",
  }, () => {
    exercise(
      Buffer,
      "poolSize",
      (descriptor, attack) => ({ configurable: true, enumerable: descriptor.enumerable, get() { attack(); } }),
      digestOperation,
    );
  });
  await t.test("Uint8Array Symbol.hasInstance cannot steer raw hashing", () => {
    exercise(Uint8Array, Symbol.hasInstance, replaceFunction, rawViewOperation);
  });
  await t.test("TextDecoder.prototype.decode cannot steer canonical parsing", () => {
    exercise(TextDecoder.prototype, "decode", replaceFunction, parseOperation);
  });
  await t.test("TextEncoder.prototype.encode cannot steer canonical hashing", () => {
    exercise(TextEncoder.prototype, "encode", replaceFunction, digestOperation);
  });
  for (const property of ["buffer", "byteLength", "byteOffset", "length"]) {
    await t.test(`TypedArray prototype ${property} cannot steer raw hashing`, () => {
      exercise(typedArrayPrototype, property, replaceGetter, rawViewOperation);
    });
  }
  await t.test("ArrayBuffer prototype byteLength cannot steer raw hashing", () => {
    exercise(ArrayBuffer.prototype, "byteLength", replaceGetter, rawViewOperation);
  });
  for (const property of ["update", "digest"]) {
    await t.test(`hash prototype ${property} cannot steer contract helpers`, () => {
      exercise(hashPrototype, property, replaceFunction, rawOperation);
    });
  }

  await t.test("Object prototype descriptor lookalikes cannot reopen accessor input", () => {
    const descriptor = safeGetDescriptor(Object.prototype, "value");
    const hostile = {};
    let effects = 0;
    let failure;
    safeDefineProperty(hostile, "value", {
      configurable: true,
      enumerable: true,
      get() { effects += 1; throw new Error("ATTACKER_INPUT_GET"); },
    });
    safeDefineProperty(Object.prototype, "value", {
      configurable: true,
      get() { effects += 1; throw new Error("ATTACKER_DESCRIPTOR_GET"); },
    });
    try { canonicalJsonText(hostile); } catch (error) { failure = error; }
    finally {
      if (descriptor === undefined) safeDeleteProperty(Object.prototype, "value");
      else safeDefineProperty(Object.prototype, "value", descriptor);
    }
    assert.equal(effects, 0);
    assert.equal(failure?.code, "SOURCE_ORIGIN_JSON_CANONICAL");
  });

  for (const property of ["name", "code"]) {
    await t.test(`Error.prototype.${property} setters cannot observe contract refusal`, () => {
      const descriptor = safeGetDescriptor(Error.prototype, property);
      let effects = 0;
      let failure;
      safeDefineProperty(Error.prototype, property, {
        configurable: true,
        set() { effects += 1; throw new Error("ATTACKER_ERROR_SET"); },
      });
      try { canonicalJsonText(new Proxy({}, {})); } catch (error) { failure = error; }
      finally {
        if (descriptor === undefined) safeDeleteProperty(Error.prototype, property);
        else safeDefineProperty(Error.prototype, property, descriptor);
      }
      assert.equal(effects, 0);
      assert.equal(failure?.code, "SOURCE_ORIGIN_JSON_CANONICAL");
    });
  }
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

test("the approved Step 11 toolchain-pins owner is installed as exact canonical non-authorizing bytes", async () => {
  const { bytes, value } = await readPolicy("pins");
  assert.equal(bytes.toString("utf8"), canonicalJsonText(value));
  assert.equal(bytes.length, 69_452);
  assert.equal(sha256Raw(bytes), "0c5bb3b5e77e36741c479f65442dec01c76c57aa67b57fdcdba975e9a6f036cf");
  assert.equal(bytes.includes(0x0a), false);
  assert.equal(bytes.at(-1), 0x7d);
  assert.deepEqual(Object.keys(value).sort(), ["authorizing", "pinsDigest", "records", "schema"]);
  assert.equal(value.schema, "galerina.logic-aig-toolchain-pins.v2");
  assert.equal(value.authorizing, false);
  assert.equal(value.pinsDigest, "a287faaf55f698b7e78d085a24a34bae4998e78e55706731fe9779a0fe4834f8");
  assert.deepEqual(value.records.map(({ recordId, sourceObservationDigest, loadObservationDigest }) => ({ recordId, sourceObservationDigest, loadObservationDigest })), [
    {
      recordId: "linux-x64",
      sourceObservationDigest: "8a593d26046bcdfa46f97fdbfaaf9cc5406c030088e8144ca0d65e8ac0d7df14",
      loadObservationDigest: "8b73bdda0e355b8bde2bfd95428d61d626f16a2db9128e6c54810aef0cf322a4",
    },
    {
      recordId: "win32-x64",
      sourceObservationDigest: "ff189afc0ac006b1df52ac3af9676756d80d0bf9cc722965dd21e3d70f057867",
      loadObservationDigest: "ee650b421a3eff52705f4224112fd792a168542a3c3b26d7c7a153a90247d443",
    },
  ]);
  assert.deepEqual(value.records.map(({ recordId, recordDigest, moduleClosureDigest }) => ({ recordId, recordDigest, moduleClosureDigest })), [
    {
      recordId: "linux-x64",
      recordDigest: "843b57e373de4ffaadf542b307a7444e6506862796e2fc4cfdc4df5d418d6fee",
      moduleClosureDigest: "56f754bd9c775fcd862bc3d63ef593e31ad0b6ff9b8380fccd1087d70dc04f66",
    },
    {
      recordId: "win32-x64",
      recordDigest: "df13804732d63de39ba3a94ae516902fca747a538cc1c67e897cb6a9000a2fbe",
      moduleClosureDigest: "56f754bd9c775fcd862bc3d63ef593e31ad0b6ff9b8380fccd1087d70dc04f66",
    },
  ]);
  for (const record of value.records) {
    assert.equal(record.nodeIdentity.version, "v24.18.0");
    assert.deepEqual(record.runtimeLoadSets.map(({ id }) => id), ["HOST", "PARSER"]);
    assert.deepEqual(record.domainSelections.map(({ domain }) => domain), ["FUNGI", "GATE", "HOST"]);
  }
  assertDeepFrozen(validateToolchainPins(value));
  const missing = clone(value);
  delete missing.records;
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins(missing));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins({ ...value, pinRecords: value.records }));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins({ ...value, digest: value.pinsDigest }));
  expectCode("SOURCE_ORIGIN_ORDER", () => validateToolchainPins({ ...value, records: [...value.records].reverse() }));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins({ ...value, authorizing: true }));
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

test("inline toolchain-pin-v2 fixtures enforce the closed records and refuse every v1 substitute", () => {
  const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
  const row = (locator, body = locator) => {
    const bytes = Buffer.from(body, "utf8");
    return { locator, rawSha256: sha256Raw(bytes), byteLength: bytes.length };
  };
  const hostRoot = "packages-ts/galerina-core-compiler/node_modules/typescript";
  const parserRoot = "generated-source-origin-parser";
  const parserExports = ["lex", "parseGateV3", "parseProgram"];
  const hostRows = [row("lib/typescript.js", "typescript-entry")];
  const parserRows = [
    row("gate-v3-parser.js"),
    row("lexer.js"),
    row("parser.js"),
    row("requirement-diagnostics.js"),
    row("source-origin-parser-entry.js"),
  ];
  const executableModuleRows = [
    ...hostRows.map((entry) => ({ ...entry, locator: `${hostRoot}/${entry.locator}` })),
    ...parserRows.map((entry) => ({ ...entry, locator: `${parserRoot}/${entry.locator}` })),
  ].sort((left, right) => left.locator < right.locator ? -1 : left.locator > right.locator ? 1 : 0);
  const dataRows = [
    ...[
      "gate-v3-parser.d.ts",
      "lexer.d.ts",
      "package.json",
      "parser.d.ts",
      "requirement-diagnostics.d.ts",
      "source-origin-parser-entry.d.ts",
    ].map((locator) => row(
      parserRoot + "/" + locator,
      locator === "package.json" ? '{"type":"module"}' : locator,
    )),
    ...TOOLCHAIN_TYPESCRIPT_DATA_LOCATORS.map((locator) => (
      locator === "package.json"
        ? { locator: hostRoot + "/" + locator, rawSha256: "3".repeat(64), byteLength: 3 }
        : row(hostRoot + "/" + locator)
    )),
    ...[
      "src/gate-v3-parser.ts",
      "src/lexer.ts",
      "src/parser.ts",
      "src/requirement-diagnostics.ts",
      "src/source-origin-parser-entry.ts",
      "tsconfig.source-origin-parser.json",
    ].map((locator) => row(
      "packages-ts/galerina-core-compiler/" + locator,
      locator === "src/source-origin-parser-entry.ts"
        ? "source-entry"
        : locator === "tsconfig.source-origin-parser.json"
          ? "source-project"
          : locator,
    )),
  ].sort((left, right) => left.locator < right.locator ? -1 : left.locator > right.locator ? 1 : 0);
  const moduleDigest = (record) => {
    const body = {
      schema: "galerina.logic-aig-module-closure.v1",
      executableModuleRows: record.executableModuleRows,
      dataRows: record.dataRows,
      builtinModules: record.builtinModules,
      counts: {
        executableModules: record.executableModuleRows.length,
        dataRows: record.dataRows.length,
        builtinModules: record.builtinModules.length,
      },
      authorizing: false,
    };
    return sha256Canonical(body.schema, body);
  };
  const sourceOriginParser = {
    sourceEntry: {
      rootLocator: "packages-ts/galerina-core-compiler",
      ...row("src/source-origin-parser-entry.ts", "source-entry"),
      gitBlobOid: "a".repeat(40),
      exportNames: parserExports,
    },
    project: {
      rootLocator: "packages-ts/galerina-core-compiler",
      ...row("tsconfig.source-origin-parser.json", "source-project"),
      gitBlobOid: "b".repeat(40),
      extendsLocator: "./tsconfig.json",
      files: ["src/source-origin-parser-entry.ts"],
      include: [],
      compilerOptions: {
        types: [],
        noEmitOnError: true,
        incremental: false,
        composite: false,
        sourceMap: false,
        declarationMap: false,
      },
    },
    generatedEntry: { rootLocator: parserRoot, ...parserRows.at(-1) },
    generatedPackageManifest: { rootLocator: parserRoot, ...row("package.json", '{"type":"module"}') },
    exportNames: parserExports,
    sourceEdgeRows: [
      { fromLocator: "src/gate-v3-parser.ts", kind: "IMPORT_TYPE", exportName: null, specifier: "./parser.js", toLocator: "src/parser.ts" },
      { fromLocator: "src/parser.ts", kind: "IMPORT", exportName: null, specifier: "./lexer.js", toLocator: "src/lexer.ts" },
      { fromLocator: "src/parser.ts", kind: "IMPORT", exportName: null, specifier: "./requirement-diagnostics.js", toLocator: "src/requirement-diagnostics.ts" },
      { fromLocator: "src/source-origin-parser-entry.ts", kind: "EXPORT_FROM", exportName: "lex", specifier: "./lexer.js", toLocator: "src/lexer.ts" },
      { fromLocator: "src/source-origin-parser-entry.ts", kind: "EXPORT_FROM", exportName: "parseGateV3", specifier: "./gate-v3-parser.js", toLocator: "src/gate-v3-parser.ts" },
      { fromLocator: "src/source-origin-parser-entry.ts", kind: "EXPORT_FROM", exportName: "parseProgram", specifier: "./parser.js", toLocator: "src/parser.ts" },
    ],
    emittedEdgeRows: [
      { fromLocator: "parser.js", kind: "IMPORT", exportName: null, specifier: "./lexer.js", toLocator: "lexer.js" },
      { fromLocator: "parser.js", kind: "IMPORT", exportName: null, specifier: "./requirement-diagnostics.js", toLocator: "requirement-diagnostics.js" },
      { fromLocator: "source-origin-parser-entry.js", kind: "EXPORT_FROM", exportName: "lex", specifier: "./lexer.js", toLocator: "lexer.js" },
      { fromLocator: "source-origin-parser-entry.js", kind: "EXPORT_FROM", exportName: "parseGateV3", specifier: "./gate-v3-parser.js", toLocator: "gate-v3-parser.js" },
      { fromLocator: "source-origin-parser-entry.js", kind: "EXPORT_FROM", exportName: "parseProgram", specifier: "./parser.js", toLocator: "parser.js" },
    ],
    generatedClosureDigest: "c".repeat(64),
  };
  const identity = {
    version: "fixture-1",
    executableRawSha256: "d".repeat(64),
    executableByteLength: 1,
  };
  const recordBody = {
    recordId: "win32-x64",
    platform: "win32",
    arch: "x64",
    sourceObservationDigest: "1".repeat(64),
    loadObservationDigest: "2".repeat(64),
    nodeIdentity: identity,
    gitIdentity: identity,
    typescript: {
      name: "typescript",
      version: "fixture-1.0.0",
      packageLocator: `${hostRoot}/package.json`,
      packageRawSha256: "3".repeat(64),
      packageByteLength: 3,
      entryLocator: `${hostRoot}/lib/typescript.js`,
      entryRawSha256: hostRows[0].rawSha256,
      entryByteLength: hostRows[0].byteLength,
    },
    sourceOriginParser,
    runtimeLoadSets: [
      { id: "HOST", entry: { rootLocator: hostRoot, locator: "lib/typescript.js" }, moduleRows: hostRows, builtinModules: [] },
      { id: "PARSER", entry: { rootLocator: parserRoot, locator: "source-origin-parser-entry.js" }, moduleRows: parserRows, builtinModules: [] },
    ],
    domainSelections: [
      { domain: "FUNGI", parserId: "galerina-fungi-parser", runtimeLoadSetId: "PARSER", operation: "parseProgram" },
      { domain: "GATE", parserId: "galerina-gate-v3-parser", runtimeLoadSetId: "PARSER", operation: "parseGateV3" },
      { domain: "HOST", parserId: "typescript-compiler-api", runtimeLoadSetId: "HOST", operation: "typescript-compiler-api" },
    ],
    builtinModules: [],
    executableModuleRows,
    dataRows,
    moduleClosureDigest: "",
  };
  recordBody.moduleClosureDigest = moduleDigest(recordBody);
  const sealRecord = (candidate) => {
    const body = structuredClone(candidate);
    delete body.recordDigest;
    body.moduleClosureDigest = moduleDigest(body);
    return { ...body, recordDigest: sha256Canonical("galerina.logic-aig-toolchain-pin-record.v2", body) };
  };
  const sealPins = (records) => {
    const body = { schema: "galerina.logic-aig-toolchain-pins.v2", records, authorizing: false };
    return { ...body, pinsDigest: sha256Canonical(body.schema, body) };
  };
  const record = sealRecord(recordBody);
  const value = sealPins([record]);

  assertDeepFrozen(validateToolchainPins(value));
  const v1Pins = structuredClone(value);
  v1Pins.schema = "galerina.logic-aig-toolchain-pins.v1";
  v1Pins.pinsDigest = sha256Canonical(v1Pins.schema, without(v1Pins, "pinsDigest"));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(v1Pins));

  const v1Record = structuredClone(record);
  v1Record.recordDigest = sha256Canonical(
    "galerina.logic-aig-toolchain-pin-record.v1",
    without(v1Record, "recordDigest"),
  );
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateToolchainPins(sealPins([v1Record])));

  const aliasRecord = structuredClone(record);
  aliasRecord.galerinaParser = {};
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins(sealPins([aliasRecord])));

  const buildRecord = structuredClone(record);
  buildRecord.runtimeLoadSets.push({
    id: "BUILD",
    entry: { rootLocator: hostRoot, locator: "lib/tsc.js" },
    moduleRows: [row("lib/tsc.js")],
    builtinModules: [],
  });
  expectCode("SOURCE_ORIGIN_TOOLCHAIN", () => validateToolchainPins(sealPins([sealRecord(buildRecord)])));

  const traversal = structuredClone(record);
  traversal.runtimeLoadSets[0].entry.rootLocator = "../typescript";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(sealPins([sealRecord(traversal)])));

  const sparseRecords = structuredClone(value);
  sparseRecords.records = Array(1);
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins(sparseRecords));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainPins({ ...value, pins: [] }));

  const traversalPackage = structuredClone(record);
  traversalPackage.typescript.packageLocator = "../typescript/package.json";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(sealPins([sealRecord(traversalPackage)])));

  const absoluteGeneratedEntry = structuredClone(record);
  absoluteGeneratedEntry.sourceOriginParser.generatedEntry.locator = "C:/parser/index.mjs";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(sealPins([sealRecord(absoluteGeneratedEntry)])));

  const hostileBuiltin = structuredClone(record);
  hostileBuiltin.runtimeLoadSets[0].builtinModules = ["node:fs/../evil"];
  hostileBuiltin.builtinModules = ["node:fs/../evil"];
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(sealPins([sealRecord(hostileBuiltin)])));

  const traversalClosure = structuredClone(record);
  traversalClosure.dataRows[0].locator = "../escape.js";
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainPins(sealPins([sealRecord(traversalClosure)])));

  const duplicateRecords = sealPins([record, record]);
  expectCode("SOURCE_ORIGIN_ORDER", () => validateToolchainPins(duplicateRecords));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateToolchainPins({ ...value, pinsDigest: "0".repeat(64) }));
});

test("source and resolution manifests are closed, owner-bound, counted and self-digested", async () => {
  const repository = (await readPolicy("repository")).value;
  const source = (await readPolicy("source")).value;
  const resolution = (await readPolicy("resolution")).value;
  const sourceManifest = sourceManifestFixture({ repository, source });
  const resolutionInputs = resolutionInputsFixture({ repository, resolution });

  const admittedSource = validateSourceManifest(sourceManifest, { repositoryIdentity: repository, sourcePolicy: source });
  const admittedResolution = validateResolutionInputs(resolutionInputs, { repositoryIdentity: repository, resolutionPolicy: resolution });
  assertDeepFrozen(admittedSource);
  assertDeepFrozen(admittedResolution);
  assert.notStrictEqual(admittedSource, sourceManifest);

  const badCount = clone(sourceManifest);
  badCount.counts.paths += 1;
  badCount.manifestDigest = sha256Canonical(badCount.schema, without(badCount, "manifestDigest"));
  expectCode("SOURCE_ORIGIN_MANIFEST", () => validateSourceManifest(badCount, { repositoryIdentity: repository, sourcePolicy: source }));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateSourceManifest({ ...sourceManifest, sourceBodies: [] }, { repositoryIdentity: repository, sourcePolicy: source }));

  const reversed = resolutionInputsFixture({
    repository,
    resolution,
    rows: [manifestRow("z.json"), manifestRow("a.json")],
  });
  expectCode("SOURCE_ORIGIN_ORDER", () => validateResolutionInputs(reversed, { repositoryIdentity: repository, resolutionPolicy: resolution }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateResolutionInputs({ ...resolutionInputs, resolutionInputsDigest: "0".repeat(64) }, { repositoryIdentity: repository, resolutionPolicy: resolution }));
});

test("toolchain manifest v2 round-trips through the closed contract and refuses aliases", async () => {
  const pins = (await readPolicy("pins")).value;
  const record = pins.records.find((row) => row.platform === process.platform && row.arch === process.arch);
  assert(record);
  const manifest = buildToolchainSnapshot({
    pins,
    platform: record.platform,
    arch: record.arch,
    nodeIdentity: clone(record.nodeIdentity),
    gitIdentity: clone(record.gitIdentity),
    actualRuntimeLoadSets: record.runtimeLoadSets.map((row) => ({
      id: row.id,
      moduleRows: clone(row.moduleRows),
      builtinModules: clone(row.builtinModules),
    })),
    actualParserExportNames: clone(record.sourceOriginParser.exportNames),
  });
  assertDeepFrozen(validateToolchainManifest(manifest, { pins }));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainManifest({ ...manifest, manifestDigest: manifest.toolchainManifestDigest }, { pins }));
  const v1 = clone(manifest);
  v1.schema = "galerina.logic-aig-toolchain-manifest.v1";
  v1.toolchainManifestDigest = sha256Canonical(v1.schema, without(v1, "toolchainManifestDigest"));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateToolchainManifest(v1, { pins }));
  expectCode("SOURCE_ORIGIN_DIGEST", () => validateToolchainManifest({ ...manifest, actualLoadedSetDigest: "0".repeat(64) }, { pins }));
});

test("toolchain manifest authority options refuse proxies and omission without caller effects", async (t) => {
  const fixture = await nonEmptyReceiptFixture();
  await t.test("proxy", () => {
    let effects = 0;
    const hostile = new Proxy({}, {
      getOwnPropertyDescriptor() {
        effects += 1;
        return undefined;
      },
    });
    expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainManifest(fixture.toolchainManifest, hostile));
    assert.equal(effects, 0);
  });
  await t.test("omitted pins", () => {
    expectCode("SOURCE_ORIGIN_SCHEMA", () => validateToolchainManifest(fixture.toolchainManifest, {}));
  });
});

test("parse-outcomes receipt binds the exact expected owner kind, locator and key", async () => {
  const fixture = await nonEmptyReceiptFixture();
  const options = receiptAuthorityOptions(fixture);
  assertDeepFrozen(validateParseOutcomesReceipt(fixture.receipt, options));

  const forged = clone(fixture.receipt);
  const sidecar = receiptManifestBinding("RESOLUTION_INPUTS", fixture.sidecarRow);
  forged.rows[0].ownerBindings = [{
    ownerKind: "SIDECAR_EXPECTATION",
    manifestKind: sidecar.manifestKind,
    manifestRowDigest: sidecar.manifestRowDigest,
    locator: sidecar.path,
    blobOid: sidecar.blobOid,
    rawSha256: sidecar.rawSha256,
    byteLength: sidecar.byteLength,
    ownerKey: "complete-file",
    ownerReason: null,
  }];
  const resealed = resealOutcomeReceipt(forged, fixture.expectedOutcomes);
  expectCode("SOURCE_ORIGIN_OUTCOMES", () => validateParseOutcomesReceipt(resealed, options));
});

test("parse-outcomes receipt binds the exact Proposed-baseline owner reason", async () => {
  const fixture = await proposedReasonReceiptFixture();
  const options = receiptAuthorityOptions(fixture);
  assertDeepFrozen(validateParseOutcomesReceipt(fixture.receipt, options));

  const forged = clone(fixture.receipt);
  forged.rows[0].ownerBindings[0].ownerReason += " [substituted]";
  const resealed = resealOutcomeReceipt(forged, fixture.expectedOutcomes);
  expectCode("SOURCE_ORIGIN_OUTCOMES", () => validateParseOutcomesReceipt(resealed, options));
});

test("parse-outcomes receipt requires the complete explicit owner and pin authority bundle", async () => {
  const fixture = await nonEmptyReceiptFixture();
  const legacyOptions = {
    parserPolicy: fixture.parserPolicy,
    expectedOutcomes: fixture.expectedOutcomes,
    sourceManifest: fixture.sourceManifest,
    resolutionInputs: fixture.resolutionInputs,
    toolchainManifest: fixture.toolchainManifest,
  };
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateParseOutcomesReceipt(fixture.receipt, legacyOptions));
  assertDeepFrozen(validateParseOutcomesReceipt(fixture.receipt, receiptAuthorityOptions(fixture)));
});

test("parse-outcomes receipt rejects a coherently resealed toolchain absent from approved pins", async () => {
  const fixture = await nonEmptyReceiptFixture();
  const forgedToolchain = clone(fixture.toolchainManifest);
  forgedToolchain.selectedPinRecordId = "unapproved-record";
  forgedToolchain.selectedPinRecordDigest = "f".repeat(64);
  forgedToolchain.toolchainManifestDigest = sha256Canonical(
    forgedToolchain.schema,
    without(forgedToolchain, "toolchainManifestDigest"),
  );
  const forgedReceipt = clone(fixture.receipt);
  forgedReceipt.toolchainManifestDigest = forgedToolchain.toolchainManifestDigest;
  const options = {
    ...receiptAuthorityOptions(fixture),
    toolchainManifest: forgedToolchain,
  };
  expectCode(
    "SOURCE_ORIGIN_TOOLCHAIN",
    () => validateParseOutcomesReceipt(
      resealOutcomeReceipt(forgedReceipt, fixture.expectedOutcomes),
      options,
    ),
  );
});

test("parse-outcomes receipt fully validates source-manifest schema, mode, OID and digest", async (t) => {
  const fixture = await nonEmptyReceiptFixture();
  const cases = [
    ["schema", (manifest) => { manifest.schema = "attacker.source-manifest.v1"; return resealManifest(manifest, "manifestDigest"); }],
    ["mode", (manifest) => { manifest.rows[0].mode = "120000"; return resealManifest(manifest, "manifestDigest"); }],
    ["OID", (manifest) => { manifest.rows[0].blobOid = "not-a-git-oid"; return resealManifest(manifest, "manifestDigest"); }],
    ["digest", (manifest) => ({ ...manifest, manifestDigest: "0".repeat(64) })],
  ];
  for (const [label, mutate] of cases) {
    await t.test(label, () => {
      const sourceManifest = mutate(clone(fixture.sourceManifest));
      const receipt = receiptForManifests(fixture, sourceManifest, fixture.resolutionInputs);
      const options = { ...receiptAuthorityOptions(fixture), sourceManifest };
      assert.throws(() => validateParseOutcomesReceipt(receipt, options));
    });
  }
});

test("parse-outcomes receipt fully validates resolution-input schema, mode, OID and digest", async (t) => {
  const fixture = await nonEmptyReceiptFixture();
  const cases = [
    ["schema", (manifest) => { manifest.schema = "attacker.resolution-inputs.v1"; return resealManifest(manifest, "resolutionInputsDigest"); }],
    ["mode", (manifest) => { manifest.rows[0].mode = "120000"; return resealManifest(manifest, "resolutionInputsDigest"); }],
    ["OID", (manifest) => { manifest.rows[0].blobOid = "not-a-git-oid"; return resealManifest(manifest, "resolutionInputsDigest"); }],
    ["digest", (manifest) => ({ ...manifest, resolutionInputsDigest: "0".repeat(64) })],
  ];
  for (const [label, mutate] of cases) {
    await t.test(label, () => {
      const resolutionInputs = mutate(clone(fixture.resolutionInputs));
      const receipt = receiptForManifests(fixture, fixture.sourceManifest, resolutionInputs);
      const options = { ...receiptAuthorityOptions(fixture), resolutionInputs };
      assert.throws(() => validateParseOutcomesReceipt(receipt, options));
    });
  }
});

test("the empty parse-outcomes receipt is a closed cross-bound non-authorizing artifact", async () => {
  const repository = (await readPolicy("repository")).value;
  const source = (await readPolicy("source")).value;
  const resolution = (await readPolicy("resolution")).value;
  const parser = (await readPolicy("parser")).value;
  const pins = (await readPolicy("pins")).value;
  const proposedBaseline = (await readPolicy("proposed")).value;
  const record = pins.records.find((row) => row.platform === process.platform && row.arch === process.arch);
  assert(record);
  const sourceManifest = sourceManifestFixture({ repository, source, rows: [] });
  const resolutionInputs = resolutionInputsFixture({ repository, resolution, rows: [] });
  const expectedBody = {
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parser.policyDigest,
    rows: [],
    authorizing: false,
  };
  const expectedOutcomes = { ...expectedBody, expectedOutcomesDigest: sha256Canonical(expectedBody.schema, expectedBody) };
  const toolchainManifest = buildToolchainSnapshot({
    pins,
    platform: record.platform,
    arch: record.arch,
    nodeIdentity: clone(record.nodeIdentity),
    gitIdentity: clone(record.gitIdentity),
    actualRuntimeLoadSets: record.runtimeLoadSets.map((row) => ({ id: row.id, moduleRows: clone(row.moduleRows), builtinModules: clone(row.builtinModules) })),
    actualParserExportNames: clone(record.sourceOriginParser.exportNames),
  });
  const body = {
    schema: "galerina.logic-aig-parse-outcomes-receipt.v1",
    repositoryId: sourceManifest.repositoryId,
    expectedHead: sourceManifest.expectedHead,
    expectedTree: sourceManifest.expectedTree,
    expectedOutcomesDigest: expectedOutcomes.expectedOutcomesDigest,
    sourceManifestDigest: sourceManifest.manifestDigest,
    resolutionInputsDigest: resolutionInputs.resolutionInputsDigest,
    toolchainManifestDigest: toolchainManifest.toolchainManifestDigest,
    rows: [],
    counts: {
      outcomeRows: 0,
      expectedRefusalRows: 0,
      opaqueProposedRows: 0,
      representedFileNodes: 0,
      unresolvedRows: 0,
      ownerBindings: 0,
    },
    authorizing: false,
  };
  const receipt = { ...body, receiptDigest: sha256Canonical(body.schema, body) };
  const options = {
    repositoryIdentity: repository,
    sourcePolicy: source,
    resolutionPolicy: resolution,
    parserPolicy: parser,
    pins,
    proposedBaseline,
    expectedOutcomes,
    sourceManifest,
    resolutionInputs,
    toolchainManifest,
  };
  assertDeepFrozen(validateParseOutcomesReceipt(receipt, options));
  expectCode("SOURCE_ORIGIN_SCHEMA", () => validateParseOutcomesReceipt({ ...receipt, parserResults: [] }, options));
  const badCounts = clone(receipt);
  badCounts.counts.outcomeRows = 1;
  badCounts.receiptDigest = sha256Canonical(badCounts.schema, without(badCounts, "receiptDigest"));
  expectCode("SOURCE_ORIGIN_OUTCOMES", () => validateParseOutcomesReceipt(badCounts, options));
  expectCode("SOURCE_ORIGIN_POLICY", () => validateParseOutcomesReceipt({ ...receipt, authorizing: true }, options));
});
