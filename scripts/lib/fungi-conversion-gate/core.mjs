import {
  CHAIN_STAGES,
  ConversionGateError,
  GATE_MANIFEST_SCHEMA,
  GATE_ROSTER,
  GATE_SCHEMA,
  GATE_STATUSES,
  GATE_TOOL_VERSION,
  REQUEST_OUTCOMES,
} from "./contracts.mjs";

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const RUN_ID = /^[a-z0-9][a-z0-9.-]{0,95}$/u;
const SYMBOL = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)?$/u;
const OWNER_KEYS = Object.freeze(["galerina", "slide", "vok", "lyth"]);
const STATUS_RANK = Object.freeze({ ALLOW: 0, HOLD: 1, REFUSED: 2, ERROR: 3 });

function fail(code, message) {
  throw new ConversionGateError(code, message);
}

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("RECORD_INVALID", `${label} must be a record`);
  return value;
}

function exactKeys(value, allowed, label) {
  const surplus = Object.keys(value).filter((key) => !allowed.includes(key));
  if (surplus.length > 0) fail("RECORD_SURPLUS", `${label} has surplus fields: ${surplus.join(", ")}`);
}

function nonempty(value, label) {
  if (typeof value !== "string" || value.length === 0 || /[\r\n\0]/u.test(value)) fail("STRING_INVALID", `${label} is malformed`);
  return value;
}

function digest(value, label) {
  if (!DIGEST.test(value)) fail("DIGEST_INVALID", `${label} must be sha256`);
  return value;
}

function status(value, label) {
  if (!GATE_STATUSES.includes(value)) fail("STATUS_INVALID", `${label} status is invalid`);
  return value;
}

function canonicalPath(value, label) {
  nonempty(value, label);
  if (/^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.includes("\\")) fail("PATH_INVALID", `${label} must be repository-relative`);
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) fail("PATH_INVALID", `${label} contains a non-canonical segment`);
  return value;
}

function sourcePath(value) {
  canonicalPath(value, "source path");
  if (!/^packages-galerina\/(?!galerina-test\/)[^/]+\/src\/.+\.ts$/u.test(value) || value.includes("/tests/") || value.includes("/conversion-overlays/")) {
    fail("SOURCE_SCOPE_INVALID", "source path must name one real package src TypeScript file");
  }
  return value;
}

function sandboxPath(value) {
  canonicalPath(value, "sandbox output");
  if (!/^build\/ts-to-fungi-sandbox\/[a-z0-9][a-z0-9./-]*$/u.test(value)) fail("OUTPUT_SCOPE_INVALID", "sandbox output must be inside build/ts-to-fungi-sandbox");
  return value;
}

function locator(value, label) {
  nonempty(value, label);
  if (/^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("/") || value.includes("\\") || value.includes("..")) fail("LOCATOR_INVALID", `${label} must be bounded and non-absolute`);
  return value;
}

export function validateGateManifest(value) {
  record(value, "gate manifest");
  exactKeys(value, ["schema", "runId", "graphProject", "sandboxOutput", "requests"], "gate manifest");
  if (value.schema !== GATE_MANIFEST_SCHEMA) fail("MANIFEST_SCHEMA_INVALID", `expected ${GATE_MANIFEST_SCHEMA}`);
  if (!RUN_ID.test(value.runId)) fail("RUN_ID_INVALID", "runId must be a bounded lower-case identifier");
  nonempty(value.graphProject, "graph project");
  sandboxPath(value.sandboxOutput);
  if (!Array.isArray(value.requests) || value.requests.length < 1 || value.requests.length > 10) fail("REQUEST_COUNT_INVALID", "gate manifest requires 1..10 requests");
  const requests = value.requests.map((item, index) => {
    record(item, `request ${index}`);
    exactKeys(item, ["file", "symbol", "sourceSha256"], `request ${index}`);
    const file = sourcePath(item.file);
    if (!SYMBOL.test(item.symbol)) fail("SYMBOL_INVALID", `request ${index} symbol is invalid`);
    return Object.freeze({ file, symbol: item.symbol, sourceSha256: digest(item.sourceSha256, `request ${index} source digest`) });
  });
  const scopes = requests.map((item) => `${item.file}#${item.symbol}`);
  if (new Set(scopes).size !== scopes.length) fail("REQUEST_DUPLICATE", "gate manifest contains a duplicate scope");
  return Object.freeze({
    schema: GATE_MANIFEST_SCHEMA,
    runId: value.runId,
    graphProject: value.graphProject,
    sandboxOutput: value.sandboxOutput,
    requests: Object.freeze(requests),
  });
}

function owner(value) {
  record(value, "owner envelope");
  exactKeys(value, ["ownerKey", "status", "code", "buildPoint", "locator"], "owner envelope");
  if (!OWNER_KEYS.includes(value.ownerKey)) fail("OWNER_INVALID", "owner key is invalid");
  if (!COMMIT.test(value.buildPoint)) fail("OWNER_BUILD_POINT_INVALID", "owner build point must be a commit");
  return Object.freeze({ ownerKey: value.ownerKey, status: status(value.status, "owner"), code: nonempty(value.code, "owner code"), buildPoint: value.buildPoint, locator: locator(value.locator, "owner locator") });
}

function check(value) {
  record(value, "gate check");
  exactKeys(value, ["id", "status", "code", "locator", "digest"], "gate check");
  if (!GATE_ROSTER.includes(value.id)) fail("CHECK_INVALID", "gate check identifier is invalid");
  return Object.freeze({ id: value.id, status: status(value.status, "check"), code: nonempty(value.code, "check code"), locator: locator(value.locator, "check locator"), ...(value.digest === undefined ? {} : { digest: digest(value.digest, "check digest") }) });
}

function chainEntry(value, stage) {
  record(value, `${stage} chain entry`);
  exactKeys(value, ["digest", "verified"], `${stage} chain entry`);
  return Object.freeze({ digest: digest(value.digest, `${stage} digest`), verified: value.verified === true });
}

function requestResult(value, expected) {
  record(value, "request result");
  exactKeys(value, ["scope", "outcome", "reasonCode", "sourceRetained", "receiptLocator", "chain"], "request result");
  const expectedScope = `${expected.file}#${expected.symbol}`;
  if (value.scope !== expectedScope) fail("REQUEST_SCOPE_MISMATCH", `expected result for ${expectedScope}`);
  if (!REQUEST_OUTCOMES.includes(value.outcome)) fail("REQUEST_OUTCOME_INVALID", "request outcome is invalid");
  const chainValue = record(value.chain, "request chain");
  const allowedStages = value.outcome === "CONVERTED" ? CHAIN_STAGES : ["source"];
  exactKeys(chainValue, allowedStages, "request chain");
  if (allowedStages.some((stage) => !(stage in chainValue))) fail("CHAIN_INCOMPLETE", "request chain is incomplete");
  const chain = Object.fromEntries(allowedStages.map((stage) => [stage, chainEntry(chainValue[stage], stage)]));
  return Object.freeze({
    scope: value.scope,
    outcome: value.outcome,
    reasonCode: nonempty(value.reasonCode, "request reason code"),
    sourceRetained: value.sourceRetained === true,
    receiptLocator: locator(value.receiptLocator, "receipt locator"),
    chain: Object.freeze(chain),
    sourceDigestMatches: chain.source.digest === expected.sourceSha256,
    chainVerified: Object.values(chain).every((item) => item.verified === true),
  });
}

function commitPolicy(value) {
  record(value, "commit policy");
  const keys = ["addedFungi", "reports", "reportOnlyStreak", "finalTailException", "precedingQualifyingBatch", "corpusComplete", "exactDuplicates", "normalizedShadows"];
  exactKeys(value, keys, "commit policy");
  for (const key of ["addedFungi", "reports", "reportOnlyStreak", "exactDuplicates", "normalizedShadows"]) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) fail("COMMIT_POLICY_INVALID", `${key} must be a nonnegative integer`);
  }
  return Object.freeze({
    ...value,
    finalTailException: value.finalTailException === true,
    precedingQualifyingBatch: value.precedingQualifyingBatch === true,
    corpusComplete: value.corpusComplete === true,
    minimumFungi: 40,
    expectedFungi: 50,
  });
}

function policyRefused(value) {
  if (!value.corpusComplete || value.exactDuplicates !== 0 || value.normalizedShadows !== 0 || value.reports > 1 || value.reportOnlyStreak >= 2) return true;
  if (value.reports === 0) return false;
  if (value.addedFungi >= 40) return false;
  return !(value.finalTailException && value.precedingQualifyingBatch && value.reportOnlyStreak === 1);
}

function leastAuthority(statuses) {
  return statuses.reduce((current, item) => STATUS_RANK[item] > STATUS_RANK[current] ? item : current, "ALLOW");
}

export function buildRunCard({ manifest, owners, checks, requests, commitPolicy: policy }) {
  const admitted = validateGateManifest(manifest);
  if (!Array.isArray(owners) || !Array.isArray(checks) || !Array.isArray(requests)) fail("RUN_INPUT_INVALID", "owners, checks and requests must be arrays");
  const ownerRecords = owners.map(owner);
  if (ownerRecords.length !== OWNER_KEYS.length || new Set(ownerRecords.map((item) => item.ownerKey)).size !== OWNER_KEYS.length || OWNER_KEYS.some((key) => !ownerRecords.some((item) => item.ownerKey === key))) fail("OWNER_SET_INVALID", "run card requires one envelope per owner");
  const checkRecords = checks.map(check);
  if (checkRecords.length !== GATE_ROSTER.length || new Set(checkRecords.map((item) => item.id)).size !== GATE_ROSTER.length || GATE_ROSTER.some((id) => !checkRecords.some((item) => item.id === id))) fail("CHECK_SET_INVALID", "run card requires the complete gate roster");
  if (requests.length !== admitted.requests.length) fail("REQUEST_RESULT_COUNT_INVALID", "every request requires one result");
  const byScope = new Map(requests.map((item) => [item.scope, item]));
  if (byScope.size !== requests.length) fail("REQUEST_RESULT_DUPLICATE", "request results contain a duplicate scope");
  const requestRecords = admitted.requests.map((expected) => requestResult(byScope.get(`${expected.file}#${expected.symbol}`), expected));
  const policyRecord = commitPolicy(policy);
  const derived = [];
  if (policyRefused(policyRecord)) derived.push("REFUSED");
  for (const item of requestRecords) {
    if (!item.sourceRetained || !item.sourceDigestMatches || !item.chainVerified) derived.push("REFUSED");
    else if (item.outcome !== "CONVERTED") derived.push("HOLD");
  }
  const overall = leastAuthority([...ownerRecords.map((item) => item.status), ...checkRecords.map((item) => item.status), ...derived]);
  return Object.freeze({
    schema: GATE_SCHEMA,
    toolVersion: GATE_TOOL_VERSION,
    runId: admitted.runId,
    status: overall,
    graphProject: admitted.graphProject,
    sandboxOutput: admitted.sandboxOutput,
    owners: Object.freeze(OWNER_KEYS.map((key) => ownerRecords.find((item) => item.ownerKey === key))),
    checks: Object.freeze(GATE_ROSTER.map((id) => checkRecords.find((item) => item.id === id))),
    requests: Object.freeze(requestRecords),
    commitPolicy: policyRecord,
    actions: Object.freeze({ consumerSwitched: false, typescriptRetired: false, committed: false, pushed: false, productionAuthorityReleased: false }),
  });
}

export function runConversionGateSelfTest() {
  const manifest = validateGateManifest({
    schema: GATE_MANIFEST_SCHEMA,
    runId: "self-test",
    graphProject: "self-test-project",
    sandboxOutput: "build/ts-to-fungi-sandbox/self-test",
    requests: [{ file: "packages-galerina/example/src/self-test.ts", symbol: "VALUE", sourceSha256: `sha256:${"a".repeat(64)}` }],
  });
  const owners = OWNER_KEYS.map((ownerKey) => ({ ownerKey, status: "ALLOW", code: "READY", buildPoint: "a".repeat(40), locator: `owner:${ownerKey}` }));
  const makeChecks = (red = false) => GATE_ROSTER.map((id) => ({ id, status: red && id === "candidate-compiler" ? "REFUSED" : "ALLOW", code: red && id === "candidate-compiler" ? "CONTROL_REFUSED" : "READY", locator: `check:${id}` }));
  const chain = Object.fromEntries(CHAIN_STAGES.map((stage) => [stage, { digest: `sha256:${"a".repeat(64)}`, verified: true }]));
  const requests = [{ scope: `${manifest.requests[0].file}#VALUE`, outcome: "CONVERTED", reasonCode: "CONTROL_GREEN", sourceRetained: true, receiptLocator: "sandbox:records/control.json", chain }];
  const policy = { addedFungi: 0, reports: 0, reportOnlyStreak: 0, finalTailException: false, precedingQualifyingBatch: false, corpusComplete: true, exactDuplicates: 0, normalizedShadows: 0 };
  const green = buildRunCard({ manifest, owners, checks: makeChecks(), requests, commitPolicy: policy });
  const red = buildRunCard({ manifest, owners, checks: makeChecks(true), requests, commitPolicy: policy });
  return Object.freeze({ green: green.status, red: red.status, passed: green.status === "ALLOW" && red.status === "REFUSED" });
}
