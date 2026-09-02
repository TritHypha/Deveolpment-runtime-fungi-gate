import { win32 } from "node:path";
import { isProxy } from "node:util/types";

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  sha256Canonical,
  sha256Raw,
} from "./contract.mjs";

const REFUSAL = "SOURCE_ORIGIN_OWNER_PROPOSAL_POLICY";
const HEX64 = /^[0-9a-f]{64}$/;

class OwnerProposalRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = "OwnerProposalRefusal";
    this.code = code;
  }
}

function refuse(code = REFUSAL) {
  throw new OwnerProposalRefusal(code);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

function captureData(value, active = new Set(), depth = 0) {
  if (depth > 128) refuse();
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) refuse();
    return value;
  }
  if (typeof value === "string") {
    if (hasUnpairedSurrogate(value) || value !== value.normalize("NFC")) refuse();
    return value;
  }
  if (typeof value !== "object" || isProxy(value) || active.has(value)) refuse();
  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse();
      const names = Object.getOwnPropertyNames(value);
      if (names.length !== value.length + 1 || !names.includes("length")) refuse();
      const output = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) refuse();
        output.push(captureData(descriptor.value, active, depth + 1));
      }
      return output;
    }
    const prototype = Object.getPrototypeOf(value);
    if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(value).length !== 0) refuse();
    const output = {};
    for (const key of Object.getOwnPropertyNames(value).sort(compare)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) refuse();
      output[key] = captureData(descriptor.value, active, depth + 1);
    }
    return output;
  } finally {
    active.delete(value);
  }
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function frozen(value) {
  return deepFreeze(captureData(value));
}

function withoutDigest(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "policyDigest"));
}

function withDigest(schema, body) {
  return frozen({ ...body, policyDigest: sha256Canonical(schema, body) });
}

function exact(value, expected, code = REFUSAL) {
  const captured = captureData(value);
  if (canonicalJsonText(captured) !== canonicalJsonText(expected)) refuse(code);
  return deepFreeze(captured);
}

const FIXED_PREFIX = frozen([
  "--no-pager",
  "--no-optional-locks",
  "--no-replace-objects",
  "-c", "core.commitgraph=false",
  "-c", "core.fsmonitor=false",
  "-c", "core.hookspath=/dev/null",
  "-c", "core.maxtreedepth=512",
  "-c", "core.multipackindex=false",
  "-c", "core.usereplacerefs=false",
  "-c", "core.worktree=<REPOSITORY_ROOT>",
  "-c", "feature.experimental=false",
  "-c", "feature.manyfiles=false",
  "-c", "index.skiphash=false",
  "-c", "index.sparse=false",
  "-c", "pack.readreverseindex=false",
  "-C", "<REPOSITORY_ROOT>",
]);

const COMMAND_ROWS = frozen([
  { commandId: "ALTERNATES", arguments: ["rev-parse", "--path-format=absolute", "--git-path", "objects/info/alternates"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "BLOB", arguments: ["cat-file", "blob", "<BLOB_OID>"], outputLimitId: "BLOB", stdoutRule: "RAW_BYTES" },
  { commandId: "CONFIG_ROWS", arguments: ["config", "--null", "--list", "--show-origin", "--show-scope", "--no-includes"], outputLimitId: "CONFIG_ROWS", stdoutRule: "NUL_CONFIG_ROWS" },
  { commandId: "GIT_DIR", arguments: ["rev-parse", "--absolute-git-dir"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "GIT_VERSION", arguments: ["--version"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "HEAD", arguments: ["rev-parse", "--verify", "HEAD^{commit}"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "HTTP_ALTERNATES", arguments: ["rev-parse", "--path-format=absolute", "--git-path", "objects/info/http-alternates"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "INDEX_FLAGS", arguments: ["ls-files", "-v", "--sparse", "-z"], outputLimitId: "INDEX_FLAGS", stdoutRule: "NUL_RECORDS" },
  { commandId: "INDEX_PATH", arguments: ["rev-parse", "--path-format=absolute", "--git-path", "index"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "INDEX_STAGE", arguments: ["ls-files", "--stage", "--sparse", "-z"], outputLimitId: "INDEX_STAGE", stdoutRule: "NUL_RECORDS" },
  { commandId: "OBJECT_FORMAT", arguments: ["rev-parse", "--show-object-format"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "TOPLEVEL", arguments: ["rev-parse", "--show-toplevel"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "TREE", arguments: ["rev-parse", "--verify", "HEAD^{tree}"], outputLimitId: "SCALAR", stdoutRule: "ONE_UTF8_LINE" },
  { commandId: "TREE_ROWS", arguments: ["ls-tree", "-r", "--full-tree", "-z", "<TREE_OID>"], outputLimitId: "TREE_ROWS", stdoutRule: "NUL_RECORDS" },
]);

const CONFIG_ALLOWANCE_ROWS = frozen([
  { allowanceId: "BRANCH_MERGE", scope: "local", keyRule: "branch.<SUBSECTION>.merge", valueRule: "NONEMPTY_TEXT", cardinality: "MULTI_UNIQUE" },
  { allowanceId: "BRANCH_REMOTE", scope: "local", keyRule: "branch.<SUBSECTION>.remote", valueRule: "NONEMPTY_TEXT", cardinality: "SINGLETON" },
  { allowanceId: "BRANCH_VSCODE_MERGE_BASE", scope: "local", keyRule: "branch.<SUBSECTION>.vscode-merge-base", valueRule: "NONEMPTY_TEXT", cardinality: "SINGLETON" },
  { allowanceId: "COMMIT_GPGSIGN", scope: "local", keyRule: "commit.gpgsign", valueRule: "BOOL", cardinality: "SINGLETON" },
  { allowanceId: "CORE_BARE", scope: "local", keyRule: "core.bare", valueRule: "FALSE", cardinality: "SINGLETON" },
  { allowanceId: "CORE_FILEMODE", scope: "local", keyRule: "core.filemode", valueRule: "BOOL", cardinality: "SINGLETON" },
  { allowanceId: "CORE_IGNORECASE", scope: "local", keyRule: "core.ignorecase", valueRule: "BOOL", cardinality: "SINGLETON" },
  { allowanceId: "CORE_LOGALLREFUPDATES", scope: "local", keyRule: "core.logallrefupdates", valueRule: "BOOL_OR_ALWAYS", cardinality: "SINGLETON" },
  { allowanceId: "CORE_LONGPATHS", scope: "local", keyRule: "core.longpaths", valueRule: "BOOL", cardinality: "SINGLETON" },
  { allowanceId: "CORE_REPOSITORYFORMATVERSION", scope: "local", keyRule: "core.repositoryformatversion", valueRule: "ZERO", cardinality: "SINGLETON" },
  { allowanceId: "CORE_SYMLINKS", scope: "local", keyRule: "core.symlinks", valueRule: "BOOL", cardinality: "SINGLETON" },
  { allowanceId: "EXTENSIONS_WORKTREECONFIG", scope: "local", keyRule: "extensions.worktreeconfig", valueRule: "TRUE", cardinality: "SINGLETON" },
  { allowanceId: "LFS_REPOSITORYFORMATVERSION", scope: "local", keyRule: "lfs.repositoryformatversion", valueRule: "ZERO", cardinality: "SINGLETON" },
  { allowanceId: "MERGE_OURS_DRIVER", scope: "local", keyRule: "merge.ours.driver", valueRule: "TRUE", cardinality: "SINGLETON" },
  { allowanceId: "REMOTE_FETCH", scope: "local", keyRule: "remote.<SUBSECTION>.fetch", valueRule: "NONEMPTY_TEXT", cardinality: "MULTI_UNIQUE" },
  { allowanceId: "REMOTE_URL", scope: "local", keyRule: "remote.<SUBSECTION>.url", valueRule: "NONEMPTY_TEXT", cardinality: "SINGLETON" },
  { allowanceId: "SUBMODULE_ACTIVE", scope: "local", keyRule: "submodule.active", valueRule: "DOT", cardinality: "MULTI_UNIQUE" },
]);

const OUTPUT_LIMIT_ROWS = frozen([
  { outputLimitId: "BLOB", maximumBytes: null, maximumSource: "REQUESTED_HELD_FILE_OR_JSON_LIMIT" },
  { outputLimitId: "CONFIG_ROWS", maximumBytes: 4_194_304, maximumSource: "FIXED" },
  { outputLimitId: "INDEX_FLAGS", maximumBytes: 4_194_304, maximumSource: "FIXED" },
  { outputLimitId: "INDEX_STAGE", maximumBytes: 8_388_608, maximumSource: "FIXED" },
  { outputLimitId: "SCALAR", maximumBytes: 65_536, maximumSource: "FIXED" },
  { outputLimitId: "TREE_ROWS", maximumBytes: 8_388_608, maximumSource: "FIXED" },
]);

const GIT_PROCESS_POLICY_BODY = frozen({
  schema: "galerina.logic-aig-git-process-policy.v1",
  fixedPrefix: FIXED_PREFIX,
  commandRows: COMMAND_ROWS,
  configAllowanceRows: CONFIG_ALLOWANCE_ROWS,
  outputLimitRows: OUTPUT_LIMIT_ROWS,
  stderrRule: "EMPTY",
  shell: false,
  windowsHide: true,
  authorizing: false,
});

export const GIT_PROCESS_POLICY = withDigest(GIT_PROCESS_POLICY_BODY.schema, GIT_PROCESS_POLICY_BODY);

const COMMON_ENTRIES = frozen([
  { key: "GIT_CONFIG_GLOBAL", valueByPlatform: { linux: "/dev/null", win32: "NUL" } },
  { key: "GIT_CONFIG_NOSYSTEM", value: "1" },
  { key: "GIT_CONFIG_SYSTEM", valueByPlatform: { linux: "/dev/null", win32: "NUL" } },
  { key: "GIT_NO_LAZY_FETCH", value: "1" },
  { key: "GIT_NO_REPLACE_OBJECTS", value: "1" },
  { key: "GIT_OPTIONAL_LOCKS", value: "0" },
  { key: "GIT_TERMINAL_PROMPT", value: "0" },
  { key: "LANG", value: "C" },
  { key: "LC_ALL", value: "C" },
  { key: "TZ", value: "UTC" },
]);

const PLATFORM_ROWS = frozen([
  { platform: "linux", copiedParentKeys: [] },
  { platform: "win32", copiedParentKeys: ["SystemRoot"] },
]);

const FORBIDDEN_KEYS = frozen([
  "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_ATTR_SOURCE", "GIT_COMMON_DIR", "GIT_CONFIG_COUNT",
  "GIT_DIR", "GIT_EXTERNAL_DIFF", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY", "GIT_TRACE",
  "GIT_TRACE2", "GIT_TRACE2_EVENT", "GIT_TRACE2_PERF", "GIT_WORK_TREE", "HOME", "NODE_OPTIONS",
  "NODE_PATH", "PATH", "TEMP", "TMP", "WINDIR", "XDG_CONFIG_HOME",
]);

const GIT_ENVIRONMENT_POLICY_BODY = frozen({
  schema: "galerina.logic-aig-git-environment-policy.v2",
  commonEntries: COMMON_ENTRIES,
  platformRows: PLATFORM_ROWS,
  forbiddenKeys: FORBIDDEN_KEYS,
  authorizing: false,
});

export const GIT_ENVIRONMENT_POLICY = withDigest(GIT_ENVIRONMENT_POLICY_BODY.schema, GIT_ENVIRONMENT_POLICY_BODY);

const PRODUCER_ARGV_POLICY_BODY = frozen({
  schema: "galerina.logic-aig-producer-argv-policy.v2",
  nodeExecArgv: [],
  targetArgumentSlots: [
    { index: 0, kind: "LITERAL", value: "--commit" },
    { index: 1, kind: "VALUE", name: "commitOid", rule: "LOWER_HEX_COMMIT_OID", source: "CALLER_PRIMITIVE" },
    { index: 2, kind: "LITERAL", value: "--git-executable" },
    { index: 3, kind: "VALUE", name: "gitExecutableLocator", rule: "ABSOLUTE_CANONICAL_REGULAR_FILE", source: "INPUT_PARAMETER" },
    { index: 4, kind: "LITERAL", value: "--profile" },
    { index: 5, kind: "VALUE", name: "profileLocator", rule: "ABSOLUTE_CANONICAL_REGULAR_FILE", source: "INPUT_PARAMETER" },
    { index: 6, kind: "LITERAL", value: "--run-id" },
    { index: 7, kind: "VALUE", name: "runId", rule: "LOWER_HEX_SHA256", source: "CALLER_PRIMITIVE" },
    { index: 8, kind: "LITERAL", value: "--out" },
    { index: 9, kind: "VALUE", name: "outputFrame", rule: "ABSENT_CANONICAL_REGULAR_FILE", source: "OUTPUT_PARAMETER" },
  ],
  selfTestSlots: [{ index: 0, kind: "LITERAL", value: "--self-test" }],
  authorizing: false,
});

export const PRODUCER_ARGV_POLICY = withDigest(PRODUCER_ARGV_POLICY_BODY.schema, PRODUCER_ARGV_POLICY_BODY);

const PROPOSAL_INTERFACE = frozen({
  schema: "galerina.logic-aig-owner-proposal-interface.v1",
  optionFields: ["gitExecutableLocator"],
  returnFields: ["proposedBaselineBytes", "expectedOutcomesBytes", "exporterPolicyBytes", "receiptBytes"],
  repositoryRootSource: "MODULE_RELATIVE",
  commitSource: "AUTHENTICATED_HEAD",
  writes: "NONE",
  authorizing: false,
});

const FROZEN_OWNER_LOCATORS = frozen([
  "governance/logic-aig-source-origin-generated-consumers.json",
  "governance/logic-aig-source-origin-parser-policy.json",
  "governance/logic-aig-source-origin-repository-identity.json",
  "governance/logic-aig-source-origin-resolution-policy.json",
  "governance/logic-aig-source-origin-source-policy.json",
  "packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json",
]);

const HISTORICAL_BASELINE_SOURCE = frozen({
  treeOid: "1ba65a7df2a11a7f0cecdf09b59ce84bc6939482",
  path: "scripts/audit-example-diagnostics.mjs",
  blobOid: "47d494e067bec5ece78e256a22f6a29abddc2918",
  rawSha256: "dde2f512249536661a7edb13cd90bcf61ba89f0b69be83c16cc275100394031c",
  byteLength: 21_544,
});

const OWNER_PROPOSAL_POLICY_BODY = frozen({
  schema: "galerina.logic-aig-owner-proposal-policy.v1",
  toolchainPinsDigest: "a287faaf55f698b7e78d085a24a34bae4998e78e55706731fe9779a0fe4834f8",
  gitProcessPolicy: GIT_PROCESS_POLICY,
  gitProcessPolicyDigest: GIT_PROCESS_POLICY.policyDigest,
  environmentPolicy: GIT_ENVIRONMENT_POLICY,
  environmentPolicyDigest: GIT_ENVIRONMENT_POLICY.policyDigest,
  limits: SOURCE_ORIGIN_LIMITS,
  proposalInterface: PROPOSAL_INTERFACE,
  proposalOutputKinds: ["PROPOSED_BASELINE", "EXPECTED_OUTCOMES", "EXPORTER_POLICY"],
  frozenOwnerLocators: FROZEN_OWNER_LOCATORS,
  historicalBaselineSource: HISTORICAL_BASELINE_SOURCE,
  authorizing: false,
});

export const OWNER_PROPOSAL_POLICY = withDigest(OWNER_PROPOSAL_POLICY_BODY.schema, OWNER_PROPOSAL_POLICY_BODY);

export function validateProducerArgvPolicy(value) {
  const captured = exact(value, PRODUCER_ARGV_POLICY, "SOURCE_ORIGIN_EXPORTER_POLICY");
  if (captured.policyDigest !== sha256Canonical(captured.schema, withoutDigest(captured))) refuse("SOURCE_ORIGIN_EXPORTER_POLICY");
  return captured;
}

export function validateGitProcessPolicy(value) {
  const captured = exact(value, GIT_PROCESS_POLICY);
  if (captured.policyDigest !== sha256Canonical(captured.schema, withoutDigest(captured))) refuse();
  return captured;
}

export function validateGitEnvironmentPolicy(value) {
  const captured = exact(value, GIT_ENVIRONMENT_POLICY);
  if (captured.policyDigest !== sha256Canonical(captured.schema, withoutDigest(captured))) refuse();
  return captured;
}

export function validateOwnerProposalPolicy(value) {
  const captured = exact(value, OWNER_PROPOSAL_POLICY);
  validateGitProcessPolicy(captured.gitProcessPolicy);
  validateGitEnvironmentPolicy(captured.environmentPolicy);
  if (captured.gitProcessPolicyDigest !== captured.gitProcessPolicy.policyDigest ||
      captured.environmentPolicyDigest !== captured.environmentPolicy.policyDigest ||
      canonicalJsonText(captured.limits) !== canonicalJsonText(SOURCE_ORIGIN_LIMITS) ||
      captured.policyDigest !== sha256Canonical(captured.schema, withoutDigest(captured))) refuse();
  return captured;
}

function captureExactOptions(value, keys, code) {
  if (value === null || typeof value !== "object" || isProxy(value) || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) refuse(code);
  if (Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value).sort(compare);
  const expected = [...keys].sort(compare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) refuse(code);
  const output = {};
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) refuse(code);
    output[name] = descriptor.value;
  }
  return output;
}

export function selectGitCommandClass(policyValue, commandId, optionsValue) {
  const policy = validateGitProcessPolicy(policyValue);
  if (typeof commandId !== "string") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
  const row = policy.commandRows.find((candidate) => candidate.commandId === commandId);
  if (!row) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
  const limitRow = policy.outputLimitRows.find((candidate) => candidate.outputLimitId === row.outputLimitId);
  if (!limitRow) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
  let maximumBytes;
  let maximumSource;
  if (row.outputLimitId === "BLOB") {
    const options = captureExactOptions(optionsValue, ["operationClass"], "SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
    if (options.operationClass === "CAPTURED_FILE") {
      maximumBytes = Math.min(SOURCE_ORIGIN_LIMITS.capturedFileBytes, SOURCE_ORIGIN_LIMITS.processOutputBytes);
      maximumSource = "capturedFileBytes";
    } else if (options.operationClass === "JSON") {
      maximumBytes = Math.min(SOURCE_ORIGIN_LIMITS.jsonBytes, SOURCE_ORIGIN_LIMITS.processOutputBytes);
      maximumSource = "jsonBytes";
    } else {
      refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
    }
  } else {
    if (optionsValue !== undefined) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
    maximumBytes = limitRow.maximumBytes;
    maximumSource = limitRow.maximumSource;
  }
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0 || maximumBytes > SOURCE_ORIGIN_LIMITS.processOutputBytes) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT");
  return frozen({
    commandId: row.commandId,
    arguments: row.arguments,
    outputLimitId: row.outputLimitId,
    maximumBytes,
    maximumSource,
    stdoutRule: row.stdoutRule,
  });
}

export function validateGitOutputLength(policyValue, commandId, optionsValue, observedBytes) {
  const selected = selectGitCommandClass(policyValue, commandId, optionsValue);
  if (!Number.isSafeInteger(observedBytes) || observedBytes < 0 || observedBytes > selected.maximumBytes) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT");
  return observedBytes;
}

export function buildGitEnvironment(policyValue, optionsValue) {
  const policy = validateGitEnvironmentPolicy(policyValue);
  const options = captureExactOptions(optionsValue, ["architecture", "parentEnvironment", "platform", "systemRootDirectoryObservation"], "SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
  if (options.platform !== "linux" && options.platform !== "win32") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
  if (options.architecture !== "x64") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
  const parent = options.parentEnvironment;
  if (parent === null || typeof parent !== "object" || isProxy(parent) || Array.isArray(parent)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
  const prototype = Object.getPrototypeOf(parent);
  if (prototype !== Object.prototype && prototype !== null) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
  const output = Object.create(null);
  for (const row of policy.commonEntries) {
    output[row.key] = Object.hasOwn(row, "value") ? row.value : row.valueByPlatform[options.platform];
  }
  if (options.platform === "win32") {
    const descriptor = Object.getOwnPropertyDescriptor(parent, "SystemRoot");
    if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "string" || descriptor.value.length === 0 || descriptor.value.includes("\0") || !win32.isAbsolute(descriptor.value)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
    const observation = captureExactOptions(options.systemRootDirectoryObservation, ["exists", "kind", "locator"], "SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
    if (observation.exists !== true || observation.kind !== "DIRECTORY" || observation.locator !== descriptor.value) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
    output.SystemRoot = descriptor.value;
  } else if (options.systemRootDirectoryObservation !== null) {
    refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
  }
  return deepFreeze(output);
}

const EXPORTER_BINDING_FIELDS = frozen([
  "sourcePolicyDigest",
  "exclusionDigest",
  "resolutionPolicyDigest",
  "parserPolicyDigest",
  "generatedConsumerPolicyDigest",
  "repositoryIdentityDigest",
  "toolchainPinsDigest",
  "expectedOutcomesDigest",
  "proposedBaselineDigest",
]);

function captureExporterBindings(value) {
  const bindings = captureExactOptions(value, EXPORTER_BINDING_FIELDS, "SOURCE_ORIGIN_EXPORTER_POLICY");
  for (const field of EXPORTER_BINDING_FIELDS) {
    if (typeof bindings[field] !== "string" || !HEX64.test(bindings[field])) refuse("SOURCE_ORIGIN_EXPORTER_POLICY");
  }
  return frozen(bindings);
}

function createExporterPolicyValue(bindingsValue) {
  const bindings = captureExporterBindings(bindingsValue);
  const body = frozen({
    schema: "galerina.logic-aig-exporter-policy.v2",
    decoderId: "galerina-source-origin",
    canonicalizationId: "utf8-nfc-code-unit-canonical-json-v1",
    ...bindings,
    argvPolicy: PRODUCER_ARGV_POLICY,
    argvPolicyDigest: PRODUCER_ARGV_POLICY.policyDigest,
    gitProcessPolicy: GIT_PROCESS_POLICY,
    gitProcessPolicyDigest: GIT_PROCESS_POLICY.policyDigest,
    environmentPolicy: GIT_ENVIRONMENT_POLICY,
    environmentPolicyDigest: GIT_ENVIRONMENT_POLICY.policyDigest,
    nodeKinds: ["CLASS", "FILE", "FLOW", "FUNCTION", "GATE", "INTERFACE", "METHOD", "MODULE", "ROUTE", "SYMBOL", "TYPE"],
    relationshipKinds: ["CALLER", "CONTRACT", "GENERATED_CONSUMER", "IMPORT", "TEST"],
    limits: SOURCE_ORIGIN_LIMITS,
    authorizing: false,
  });
  return withDigest(body.schema, body);
}

export function validateExporterPolicy(value, expectedBindings) {
  const expected = createExporterPolicyValue(expectedBindings);
  const captured = exact(value, expected, "SOURCE_ORIGIN_EXPORTER_POLICY");
  validateProducerArgvPolicy(captured.argvPolicy);
  validateGitProcessPolicy(captured.gitProcessPolicy);
  validateGitEnvironmentPolicy(captured.environmentPolicy);
  if (captured.argvPolicyDigest !== captured.argvPolicy.policyDigest ||
      captured.gitProcessPolicyDigest !== captured.gitProcessPolicy.policyDigest ||
      captured.environmentPolicyDigest !== captured.environmentPolicy.policyDigest ||
      canonicalJsonText(captured.limits) !== canonicalJsonText(SOURCE_ORIGIN_LIMITS) ||
      captured.policyDigest !== sha256Canonical(captured.schema, withoutDigest(captured))) refuse("SOURCE_ORIGIN_EXPORTER_POLICY");
  return captured;
}

export function createExporterPolicyCandidate(bindingsValue) {
  const value = createExporterPolicyValue(bindingsValue);
  const text = canonicalJsonText(value);
  const bytes = Buffer.from(text, "utf8");
  return Object.freeze({
    value: validateExporterPolicy(value, bindingsValue),
    bytes,
    byteLength: bytes.length,
    rawSha256: sha256Raw(bytes),
    policyDigest: value.policyDigest,
  });
}

const OWNER_PROPOSAL_POLICY_TEXT = canonicalJsonText(OWNER_PROPOSAL_POLICY);
const OWNER_PROPOSAL_POLICY_BYTES = Buffer.from(OWNER_PROPOSAL_POLICY_TEXT, "utf8");
const OWNER_PROPOSAL_POLICY_RAW_SHA256 = sha256Raw(OWNER_PROPOSAL_POLICY_BYTES);

export function createOwnerProposalPolicyCandidate() {
  return Object.freeze({
    value: validateOwnerProposalPolicy(OWNER_PROPOSAL_POLICY),
    bytes: Buffer.from(OWNER_PROPOSAL_POLICY_BYTES),
    byteLength: OWNER_PROPOSAL_POLICY_BYTES.length,
    rawSha256: OWNER_PROPOSAL_POLICY_RAW_SHA256,
    policyDigest: OWNER_PROPOSAL_POLICY.policyDigest,
  });
}
