import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { SOURCE_ORIGIN_LIMITS, canonicalJsonText, sha256Canonical, sha256Raw } from "../lib/logic-aig-source-origin/contract.mjs";
import {
  GIT_ENVIRONMENT_POLICY,
  GIT_PROCESS_POLICY,
  OWNER_PROPOSAL_POLICY,
  PRODUCER_ARGV_POLICY,
  buildGitEnvironment,
  createExporterPolicyCandidate,
  createOwnerProposalPolicyCandidate,
  selectGitCommandClass,
  validateExporterPolicy,
  validateGitEnvironmentPolicy,
  validateGitOutputLength,
  validateGitProcessPolicy,
  validateOwnerProposalPolicy,
  validateProducerArgvPolicy,
} from "../lib/logic-aig-source-origin/owner-proposal-policy.mjs";

const MODULE = new URL("../lib/logic-aig-source-origin/owner-proposal-policy.mjs", import.meta.url);

function clone(value) {
  return structuredClone(value);
}

function expectCode(code, operation) {
  assert.throws(operation, (error) => error?.code === code);
}

function redigest(value) {
  const body = clone(value);
  delete body.policyDigest;
  value.policyDigest = sha256Canonical(value.schema, body);
  return value;
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert(Object.isFrozen(value));
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

const EXPORTER_BINDINGS = Object.freeze({
  sourcePolicyDigest: "1".repeat(64),
  exclusionDigest: "2".repeat(64),
  resolutionPolicyDigest: "3".repeat(64),
  parserPolicyDigest: "4".repeat(64),
  generatedConsumerPolicyDigest: "5".repeat(64),
  repositoryIdentityDigest: "6".repeat(64),
  toolchainPinsDigest: OWNER_PROPOSAL_POLICY.toolchainPinsDigest,
  expectedOutcomesDigest: "7".repeat(64),
  proposedBaselineDigest: "8".repeat(64),
});

test("Step 1 module is pure and exposes no process or filesystem execution surface", async () => {
  const source = await readFile(MODULE, "utf8");
  assert.doesNotMatch(source, /node:(?:child_process|fs|worker_threads)|\b(?:spawn|execFile|exec|fork)\s*\(/);
  assert(!Object.hasOwn(OWNER_PROPOSAL_POLICY, "run"));
});

test("portable source-origin limits retain ten existing values and raise only the global process output ceiling", () => {
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
});

test("sealed Git process policy fixes all command, config and output-limit rows", () => {
  const policy = validateGitProcessPolicy(clone(GIT_PROCESS_POLICY));
  assertDeepFrozen(policy);
  assert.equal(policy.schema, "galerina.logic-aig-git-process-policy.v1");
  assert.equal(policy.commandRows.length, 14);
  assert.equal(policy.configAllowanceRows.length, 17);
  assert.equal(policy.outputLimitRows.length, 6);
  assert.equal(policy.stderrRule, "EMPTY");
  assert.equal(policy.shell, false);
  assert.equal(policy.windowsHide, true);
  assert.equal(policy.authorizing, false);
  assert.equal(policy.policyDigest, sha256Canonical(policy.schema, Object.fromEntries(Object.entries(policy).filter(([key]) => key !== "policyDigest"))));
});

test("process-policy validators refuse structural, semantic and coherently redigested drift", () => {
  for (const mutate of [
    (value) => { delete value.windowsHide; },
    (value) => { value.surplus = false; },
    (value) => { value.authorizing = true; },
    (value) => { value.fixedPrefix[0] = "--paginate"; },
    (value) => { value.commandRows.reverse(); },
    (value) => { value.configAllowanceRows[0].valueRule = "ANY"; },
    (value) => { value.outputLimitRows[5].maximumBytes = 8_388_609; },
  ]) {
    const candidate = clone(GIT_PROCESS_POLICY);
    mutate(candidate);
    redigest(candidate);
    expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_POLICY", () => validateGitProcessPolicy(candidate));
  }
});

test("portable environment is closed, empty-parent on Linux and SystemRoot-only on Windows", () => {
  validateGitEnvironmentPolicy(clone(GIT_ENVIRONMENT_POLICY));
  const linux = buildGitEnvironment(GIT_ENVIRONMENT_POLICY, {
    platform: "linux",
    architecture: "x64",
    parentEnvironment: {},
    systemRootDirectoryObservation: null,
  });
  assert.equal(linux.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(linux.GIT_CONFIG_SYSTEM, "/dev/null");
  assert.equal(linux.GIT_NO_LAZY_FETCH, "1");
  assert(!Object.hasOwn(linux, "PATH"));
  assert.equal(Object.getPrototypeOf(linux), null);
  assertDeepFrozen(linux);

  const windows = buildGitEnvironment(GIT_ENVIRONMENT_POLICY, {
    platform: "win32",
    architecture: "x64",
    parentEnvironment: { SystemRoot: "C:\\Windows", PATH: "ignored" },
    systemRootDirectoryObservation: { locator: "C:\\Windows", kind: "DIRECTORY", exists: true },
  });
  assert.equal(windows.GIT_CONFIG_GLOBAL, "NUL");
  assert.equal(windows.GIT_CONFIG_SYSTEM, "NUL");
  assert.equal(windows.SystemRoot, "C:\\Windows");
  assert(!Object.hasOwn(windows, "PATH"));
  assert.equal(Object.getPrototypeOf(windows), null);
  assert.deepEqual([...function* () { for (const key in windows) yield key; }()].sort(), Object.keys(windows).sort());

  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT", () => buildGitEnvironment(GIT_ENVIRONMENT_POLICY, { platform: "darwin", architecture: "x64", parentEnvironment: {}, systemRootDirectoryObservation: null }));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT", () => buildGitEnvironment(GIT_ENVIRONMENT_POLICY, { platform: "linux", architecture: "arm64", parentEnvironment: {}, systemRootDirectoryObservation: null }));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT", () => buildGitEnvironment(GIT_ENVIRONMENT_POLICY, { platform: "win32", architecture: "x64", parentEnvironment: {}, systemRootDirectoryObservation: null }));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT", () => buildGitEnvironment(GIT_ENVIRONMENT_POLICY, { platform: "win32", architecture: "x64", parentEnvironment: { SystemRoot: "C:\\Missing" }, systemRootDirectoryObservation: { locator: "C:\\Missing", kind: "DIRECTORY", exists: false } }));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT", () => buildGitEnvironment(GIT_ENVIRONMENT_POLICY, { platform: "win32", architecture: "x64", parentEnvironment: { SystemRoot: "C:\\Windows" }, systemRootDirectoryObservation: { locator: "C:\\Other", kind: "DIRECTORY", exists: true } }));
});

test("environment construction rejects proxies and accessors without consulting unrelated parent state", () => {
  let getterCalls = 0;
  const parent = { SystemRoot: "C:\\Windows" };
  Object.defineProperty(parent, "PATH", {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error("must not be consulted");
    },
  });
  const windows = buildGitEnvironment(GIT_ENVIRONMENT_POLICY, {
    platform: "win32",
    architecture: "x64",
    parentEnvironment: parent,
    systemRootDirectoryObservation: { locator: "C:\\Windows", kind: "DIRECTORY", exists: true },
  });
  assert.equal(windows.SystemRoot, "C:\\Windows");
  assert.equal(getterCalls, 0);

  const proxiedParent = new Proxy({ SystemRoot: "C:\\Windows" }, {});
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT", () => buildGitEnvironment(GIT_ENVIRONMENT_POLICY, { platform: "win32", architecture: "x64", parentEnvironment: proxiedParent, systemRootDirectoryObservation: { locator: "C:\\Windows", kind: "DIRECTORY", exists: true } }));
});

test("command-class selection atomically derives its governed output limit without a repository-root or limit slot", () => {
  const head = selectGitCommandClass(GIT_PROCESS_POLICY, "HEAD");
  assert.deepEqual(head, {
    commandId: "HEAD",
    arguments: ["rev-parse", "--verify", "HEAD^{commit}"],
    outputLimitId: "SCALAR",
    maximumBytes: 65_536,
    maximumSource: "FIXED",
    stdoutRule: "ONE_UTF8_LINE",
  });
  assertDeepFrozen(head);

  const heldBlob = selectGitCommandClass(GIT_PROCESS_POLICY, "BLOB", { operationClass: "CAPTURED_FILE" });
  assert.equal(heldBlob.maximumBytes, SOURCE_ORIGIN_LIMITS.capturedFileBytes);
  assert.equal(heldBlob.maximumSource, "capturedFileBytes");
  const jsonBlob = selectGitCommandClass(GIT_PROCESS_POLICY, "BLOB", { operationClass: "JSON" });
  assert.equal(jsonBlob.maximumBytes, SOURCE_ORIGIN_LIMITS.jsonBytes);
  assert.equal(jsonBlob.maximumSource, "jsonBytes");

  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND", () => selectGitCommandClass(GIT_PROCESS_POLICY, "UNKNOWN"));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND", () => selectGitCommandClass(GIT_PROCESS_POLICY, "HEAD", { outputLimitId: "TREE_ROWS" }));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND", () => selectGitCommandClass(GIT_PROCESS_POLICY, "BLOB", { operationClass: "CALLER_MAXIMUM", maximumBytes: 1_234 }));
});

test("every command class accepts its exact maximum and refuses maximum plus one", () => {
  const operations = GIT_PROCESS_POLICY.commandRows.map((row) => ({
    commandId: row.commandId,
    options: row.commandId === "BLOB" ? { operationClass: "CAPTURED_FILE" } : undefined,
  }));
  for (const operation of operations) {
    const selected = selectGitCommandClass(GIT_PROCESS_POLICY, operation.commandId, operation.options);
    assert.equal(validateGitOutputLength(GIT_PROCESS_POLICY, operation.commandId, operation.options, selected.maximumBytes), selected.maximumBytes);
    expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT", () => validateGitOutputLength(GIT_PROCESS_POLICY, operation.commandId, operation.options, selected.maximumBytes + 1));
  }
  const json = selectGitCommandClass(GIT_PROCESS_POLICY, "BLOB", { operationClass: "JSON" });
  assert.equal(validateGitOutputLength(GIT_PROCESS_POLICY, "BLOB", { operationClass: "JSON" }, json.maximumBytes), json.maximumBytes);
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT", () => validateGitOutputLength(GIT_PROCESS_POLICY, "BLOB", { operationClass: "JSON" }, json.maximumBytes + 1));
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT", () => validateGitOutputLength(GIT_PROCESS_POLICY, "HEAD", undefined, -1));
});

test("policy capture rejects proxies, symbols and accessors without invoking attacker code", () => {
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_POLICY", () => validateOwnerProposalPolicy(new Proxy(clone(OWNER_PROPOSAL_POLICY), {})));

  const withSymbol = clone(OWNER_PROPOSAL_POLICY);
  withSymbol[Symbol("surplus")] = false;
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_POLICY", () => validateOwnerProposalPolicy(withSymbol));

  let getterCalls = 0;
  const withAccessor = clone(OWNER_PROPOSAL_POLICY);
  Object.defineProperty(withAccessor, "authorizing", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return false;
    },
  });
  expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_POLICY", () => validateOwnerProposalPolicy(withAccessor));
  assert.equal(getterCalls, 0);
});

test("producer argv policy fixes the portable ten-slot target and isolated self-test", () => {
  const policy = validateProducerArgvPolicy(clone(PRODUCER_ARGV_POLICY));
  assertDeepFrozen(policy);
  assert.equal(policy.schema, "galerina.logic-aig-producer-argv-policy.v2");
  assert.deepEqual(policy.nodeExecArgv, []);
  assert.deepEqual(policy.targetArgumentSlots.map((row) => row.index), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(policy.targetArgumentSlots.filter((row) => row.kind === "LITERAL").map((row) => row.value), ["--commit", "--git-executable", "--profile", "--run-id", "--out"]);
  assert.deepEqual(policy.selfTestSlots, [{ index: 0, kind: "LITERAL", value: "--self-test" }]);
  assert.equal(policy.authorizing, false);
});

test("producer argv policy refuses v1, old slots, missing run-id, package roots and mixed self-test", () => {
  for (const mutate of [
    (value) => { value.schema = "galerina.logic-aig-producer-argv-policy.v1"; },
    (value) => { value.targetArgumentSlots.push({ index: 10, kind: "LITERAL", value: "--package-root" }); },
    (value) => { value.targetArgumentSlots.splice(6, 2); },
    (value) => { value.targetArgumentSlots.reverse(); },
    (value) => { value.selfTestSlots.push(value.targetArgumentSlots[0]); },
    (value) => { value.authorizing = true; },
  ]) {
    const candidate = clone(PRODUCER_ARGV_POLICY);
    mutate(candidate);
    redigest(candidate);
    expectCode("SOURCE_ORIGIN_EXPORTER_POLICY", () => validateProducerArgvPolicy(candidate));
  }
});

test("exporter-policy v2 constructor and validator bind all repeated and nested policies", () => {
  const candidate = createExporterPolicyCandidate(EXPORTER_BINDINGS);
  const policy = validateExporterPolicy(candidate.value, EXPORTER_BINDINGS);
  assertDeepFrozen(policy);
  assert.equal(policy.schema, "galerina.logic-aig-exporter-policy.v2");
  assert.equal(policy.decoderId, "galerina-source-origin");
  assert.equal(policy.canonicalizationId, "utf8-nfc-code-unit-canonical-json-v1");
  assert.deepEqual(policy.argvPolicy, PRODUCER_ARGV_POLICY);
  assert.equal(policy.argvPolicyDigest, policy.argvPolicy.policyDigest);
  assert.deepEqual(policy.gitProcessPolicy, GIT_PROCESS_POLICY);
  assert.equal(policy.gitProcessPolicyDigest, policy.gitProcessPolicy.policyDigest);
  assert.deepEqual(policy.environmentPolicy, GIT_ENVIRONMENT_POLICY);
  assert.equal(policy.environmentPolicyDigest, policy.environmentPolicy.policyDigest);
  assert.deepEqual(policy.nodeKinds, ["CLASS", "FILE", "FLOW", "FUNCTION", "GATE", "INTERFACE", "METHOD", "MODULE", "ROUTE", "SYMBOL", "TYPE"]);
  assert.deepEqual(policy.relationshipKinds, ["CALLER", "CONTRACT", "GENERATED_CONSUMER", "IMPORT", "TEST"]);
  assert.deepEqual(policy.limits, SOURCE_ORIGIN_LIMITS);
  assert.equal(policy.authorizing, false);
  assert.equal(candidate.bytes.toString("utf8"), canonicalJsonText(policy));
  assert.equal(candidate.bytes.at(-1), "}".charCodeAt(0));
  assert.equal(candidate.rawSha256, sha256Raw(candidate.bytes));
  assert.equal(candidate.policyDigest, policy.policyDigest);
});

test("exporter-policy validator refuses v1, structural drift and mismatched authenticated bindings", () => {
  const original = createExporterPolicyCandidate(EXPORTER_BINDINGS).value;
  for (const mutate of [
    (value) => { value.schema = "galerina.logic-aig-exporter-policy.v1"; },
    (value) => { delete value.expectedOutcomesDigest; },
    (value) => { value.surplus = false; },
    (value) => { value.argvPolicy.targetArgumentSlots.reverse(); redigest(value.argvPolicy); value.argvPolicyDigest = value.argvPolicy.policyDigest; },
    (value) => { value.gitProcessPolicyDigest = "0".repeat(64); },
    (value) => { value.environmentPolicyDigest = "0".repeat(64); },
    (value) => { value.nodeKinds.reverse(); },
    (value) => { value.relationshipKinds.reverse(); },
    (value) => { value.authorizing = true; },
  ]) {
    const candidate = clone(original);
    mutate(candidate);
    redigest(candidate);
    expectCode("SOURCE_ORIGIN_EXPORTER_POLICY", () => validateExporterPolicy(candidate, EXPORTER_BINDINGS));
  }

  const coherentlyRedigested = clone(original);
  coherentlyRedigested.expectedOutcomesDigest = "9".repeat(64);
  redigest(coherentlyRedigested);
  expectCode("SOURCE_ORIGIN_EXPORTER_POLICY", () => validateExporterPolicy(coherentlyRedigested, EXPORTER_BINDINGS));
});

test("temporary owner binds exact nested policies, interface, frozen owners and historical source", () => {
  const policy = validateOwnerProposalPolicy(clone(OWNER_PROPOSAL_POLICY));
  assertDeepFrozen(policy);
  assert.equal(policy.schema, "galerina.logic-aig-owner-proposal-policy.v1");
  assert.equal(policy.toolchainPinsDigest, "a287faaf55f698b7e78d085a24a34bae4998e78e55706731fe9779a0fe4834f8");
  assert.equal(policy.gitProcessPolicyDigest, policy.gitProcessPolicy.policyDigest);
  assert.equal(policy.environmentPolicyDigest, policy.environmentPolicy.policyDigest);
  assert.deepEqual(policy.limits, SOURCE_ORIGIN_LIMITS);
  assert.deepEqual(policy.proposalOutputKinds, ["PROPOSED_BASELINE", "EXPECTED_OUTCOMES", "EXPORTER_POLICY"]);
  assert.deepEqual(policy.proposalInterface.optionFields, ["gitExecutableLocator"]);
  assert.deepEqual(policy.proposalInterface.returnFields, ["proposedBaselineBytes", "expectedOutcomesBytes", "exporterPolicyBytes", "receiptBytes"]);
  assert.equal(policy.proposalInterface.repositoryRootSource, "MODULE_RELATIVE");
  assert.equal(policy.proposalInterface.commitSource, "AUTHENTICATED_HEAD");
  assert.equal(policy.proposalInterface.writes, "NONE");
  assert.equal(policy.frozenOwnerLocators.length, 6);
  assert.deepEqual(policy.historicalBaselineSource, {
    treeOid: "1ba65a7df2a11a7f0cecdf09b59ce84bc6939482",
    path: "scripts/audit-example-diagnostics.mjs",
    blobOid: "47d494e067bec5ece78e256a22f6a29abddc2918",
    rawSha256: "dde2f512249536661a7edb13cd90bcf61ba89f0b69be83c16cc275100394031c",
    byteLength: 21_544,
  });
  assert.equal(policy.authorizing, false);
});

test("temporary owner refuses nested equality, interface, locator and historical-source drift", () => {
  for (const mutate of [
    (value) => { value.gitProcessPolicyDigest = "0".repeat(64); },
    (value) => { value.environmentPolicy.commonEntries[0].valueByPlatform.win32 = "/dev/null"; redigest(value.environmentPolicy); value.environmentPolicyDigest = value.environmentPolicy.policyDigest; },
    (value) => { value.limits.processMillis += 1; },
    (value) => { value.proposalInterface.optionFields.push("commitOid"); },
    (value) => { value.proposalInterface.writes = "PRIVATE"; },
    (value) => { value.frozenOwnerLocators.reverse(); },
    (value) => { value.historicalBaselineSource.byteLength += 1; },
    (value) => { value.authorizing = true; },
  ]) {
    const candidate = clone(OWNER_PROPOSAL_POLICY);
    mutate(candidate);
    redigest(candidate);
    expectCode("SOURCE_ORIGIN_OWNER_PROPOSAL_POLICY", () => validateOwnerProposalPolicy(candidate));
  }
});

test("candidate generation is deterministic, canonical, non-authorizing and file-free", () => {
  const first = createOwnerProposalPolicyCandidate();
  const second = createOwnerProposalPolicyCandidate();
  assert(Buffer.isBuffer(first.bytes));
  assert.notStrictEqual(first.bytes, second.bytes);
  assert.deepEqual(first.bytes, second.bytes);
  assert.equal(first.bytes.at(-1), "}".charCodeAt(0));
  assert.equal(first.bytes.includes(0x0a), false);
  assert.equal(first.rawSha256, sha256Raw(first.bytes));
  assert.equal(first.byteLength, first.bytes.length);
  assert.equal(first.policyDigest, OWNER_PROPOSAL_POLICY.policyDigest);
  assert.equal(first.byteLength, 8_371);
  assert.equal(first.rawSha256, "097abc918cd054c82fd10b339053d1400c1aaf6c8f9a41bc47d065e0aca80407");
  assert.equal(first.policyDigest, "73ebb11db247b6b94f8099d9e16d6adefc3e03e1c292d6f562a9b00743b01d9b");
  assert.equal(first.bytes.toString("utf8"), canonicalJsonText(OWNER_PROPOSAL_POLICY));
  assert.equal(first.value.authorizing, false);
  assertDeepFrozen(first.value);
});
