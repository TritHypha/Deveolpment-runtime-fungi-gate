import { spawn } from "node:child_process";
import { closeSync, lstatSync, openSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isProxy } from "node:util/types";

import {
  canonicalJsonText,
  decodeDiagnosticSet,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
  validateGeneratedConsumerPolicy,
  validateExpectedParseOutcomes,
  validateParserPolicy,
  validateProposedBaseline,
  validateRepositoryIdentity,
  validateResolutionPolicy,
  validateSourcePolicy,
  validateToolchainPins,
} from "./contract.mjs";
import {
  buildGitEnvironment,
  createExporterPolicyCandidate,
  selectGitCommandClass,
  validateGitProcessPolicy,
  validateOwnerProposalPolicy,
} from "./owner-proposal-policy.mjs";

const REPOSITORY_ROOT = realpathSync.native(fileURLToPath(new URL("../../../", import.meta.url)));
const PINS_LOCATOR = "governance/logic-aig-source-origin-toolchain-pins.json";
const TEMP_OWNER_LOCATOR = "governance/logic-aig-source-origin-owner-proposal-policy.json";
const PINS_BYTE_LENGTH = 69_452;
const PINS_RAW_SHA256 = "0c5bb3b5e77e36741c479f65442dec01c76c57aa67b57fdcdba975e9a6f036cf";
const PINS_POLICY_DIGEST = "a287faaf55f698b7e78d085a24a34bae4998e78e55706731fe9779a0fe4834f8";
const TEMP_OWNER_BYTE_LENGTH = 8_371;
const TEMP_OWNER_RAW_SHA256 = "097abc918cd054c82fd10b339053d1400c1aaf6c8f9a41bc47d065e0aca80407";
const TEMP_OWNER_POLICY_DIGEST = "73ebb11db247b6b94f8099d9e16d6adefc3e03e1c292d6f562a9b00743b01d9b";
const HEX_OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const CONTROL = /[\u0000-\u001f\u007f]/u;

const HISTORICAL_BASELINE_ENTRIES = Object.freeze([
  { directoryName: "Proposed-024-vault-global-basic", reason: "`vault global` has no grammar — parser.ts:5764 implements only `vault secure` (RD-0531 step 1)" },
  { directoryName: "Proposed-025-vault-global-secret-invalid", reason: "`vault global` has no grammar — same RD-0531 refusal" },
  { directoryName: "Proposed-229-vault-write-without-mut-invalid", reason: "cannot demonstrate FUNGI-VAULT-004: the vault-write syntax `mut secure.x = v` that governance-verifier.ts:302 documents does NOT parse (parser.ts:1601 parseMutDecl takes ONE identifier then expects `=`; no member-path production). Board #174" },
  { directoryName: "Proposed-464-enterprise-supply-chain", reason: "cannot demonstrate FUNGI-MODULE-005: package-policy grammar and a signed/canonical policy input are absent from the root check/build path; current package enforcement uses FUNGI-PKG-* and MODULE-005 remains design-only" },
  { directoryName: "Proposed-473-scoped-vault-request", reason: "`vault request` is not one of the three declared scopes (secure|global|session)" },
  { directoryName: "Proposed-474-vault-session-session-pattern", reason: "`vault session` has no grammar — same RD-0531 refusal" },
  { directoryName: "Proposed-Readable-Logic-Forms", reason: "readable-alias syntax (`status is Active` for `==`) is a LANGUAGE PROPOSAL with no grammar; its examples self-declare \"not yet in grammar\" and an expected_diagnostics contract that applies only \"when adopted\"" },
].map((entry) => Object.freeze(entry)));

export class OwnerProposalRuntimeRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = "OwnerProposalRuntimeRefusal";
    this.code = code;
  }
}

function refuse(code) {
  throw new OwnerProposalRuntimeRefusal(code);
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactDataObject(value, names, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value)) refuse(code);
  if (Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const actual = Object.getOwnPropertyNames(value).sort(codeUnitCompare);
  const expected = [...names].sort(codeUnitCompare);
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) refuse(code);
  const output = Object.create(null);
  for (const name of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) refuse(code);
    output[name] = descriptor.value;
  }
  return output;
}

export function captureOwnerProposalOptions(value) {
  const captured = exactDataObject(value, ["gitExecutableLocator"], "SOURCE_ORIGIN_OWNER_PROPOSAL_OPTIONS");
  if (typeof captured.gitExecutableLocator !== "string" || captured.gitExecutableLocator.length === 0 || captured.gitExecutableLocator.includes("\0") ||
      !path.isAbsolute(captured.gitExecutableLocator) || path.normalize(captured.gitExecutableLocator) !== captured.gitExecutableLocator) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OPTIONS");
  return Object.freeze(captured);
}

function readBoundOwner(locator, byteLength, rawSha256, validate, semanticDigestField, semanticDigest) {
  const absolute = path.join(REPOSITORY_ROOT, ...locator.split("/"));
  let before;
  let bytes;
  let after;
  try {
    before = lstatSync(absolute, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink() || before.size !== BigInt(byteLength)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
    const descriptor = openSync(absolute, "r");
    try { bytes = readFileSync(descriptor); } finally { closeSync(descriptor); }
    after = lstatSync(absolute, { bigint: true });
  } catch (error) {
    if (error instanceof OwnerProposalRuntimeRefusal) throw error;
    refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  }
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs ||
      bytes.length !== byteLength || sha256Raw(bytes) !== rawSha256) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  let value;
  try {
    value = validate(parseCanonicalJsonBytes(bytes, { label: locator }));
  } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"); }
  if (value[semanticDigestField] !== semanticDigest) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  return Object.freeze({ bytes: Buffer.from(bytes), value, byteLength, rawSha256, semanticDigest });
}

function readBootstrapOwners() {
  const pins = readBoundOwner(PINS_LOCATOR, PINS_BYTE_LENGTH, PINS_RAW_SHA256, validateToolchainPins, "pinsDigest", PINS_POLICY_DIGEST);
  const temporary = readBoundOwner(TEMP_OWNER_LOCATOR, TEMP_OWNER_BYTE_LENGTH, TEMP_OWNER_RAW_SHA256, validateOwnerProposalPolicy, "policyDigest", TEMP_OWNER_POLICY_DIGEST);
  if (temporary.value.toolchainPinsDigest !== pins.value.pinsDigest) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  return Object.freeze({ pins, temporary });
}

function selectHostPin(pins) {
  const rows = pins.records.filter((row) => row.platform === process.platform && row.arch === process.arch);
  if (rows.length !== 1 || (process.platform !== "win32" && process.platform !== "linux") || process.arch !== "x64") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_PLATFORM");
  return rows[0];
}

function observeRegularFile(locator, expectedByteLength, code) {
  if (!path.isAbsolute(locator) || path.normalize(locator) !== locator) refuse(code);
  let before;
  let real;
  let bytes;
  let after;
  try {
    before = lstatSync(locator, { bigint: true });
    real = realpathSync.native(locator);
    if (!before.isFile() || before.isSymbolicLink() || real !== locator || before.size !== BigInt(expectedByteLength)) refuse(code);
    const descriptor = openSync(locator, "r");
    try { bytes = readFileSync(descriptor); } finally { closeSync(descriptor); }
    after = lstatSync(locator, { bigint: true });
  } catch (error) {
    if (error instanceof OwnerProposalRuntimeRefusal) throw error;
    refuse(code);
  }
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs) refuse(code);
  return Object.freeze({ locator, byteLength: bytes.length, rawSha256: sha256Raw(bytes), stat: after });
}

function authenticateGitExecutable(locator, hostPin) {
  const observed = observeRegularFile(locator, hostPin.gitIdentity.executableByteLength, "SOURCE_ORIGIN_OWNER_PROPOSAL_EXECUTABLE");
  if (observed.byteLength !== hostPin.gitIdentity.executableByteLength || observed.rawSha256 !== hostPin.gitIdentity.executableRawSha256) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_EXECUTABLE");
  return observed;
}

function buildEnvironment(policy) {
  if (process.platform === "win32") {
    const root = process.env.SystemRoot;
    if (typeof root !== "string" || root.length === 0) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT");
    let observation;
    try { observation = statSync(root); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_ENVIRONMENT"); }
    const parentEnvironment = Object.create(null);
    parentEnvironment.SystemRoot = root;
    return buildGitEnvironment(policy, {
      architecture: process.arch,
      parentEnvironment,
      platform: process.platform,
      systemRootDirectoryObservation: { exists: true, kind: observation.isDirectory() ? "DIRECTORY" : "OTHER", locator: root },
    });
  }
  return buildGitEnvironment(policy, {
    architecture: process.arch,
    parentEnvironment: Object.create(null),
    platform: process.platform,
    systemRootDirectoryObservation: null,
  });
}

function substituteArguments(values, substitutions, repositoryRoot = REPOSITORY_ROOT) {
  return values.map((value) => {
    if (value === "<REPOSITORY_ROOT>") return repositoryRoot;
    if (value === "core.worktree=<REPOSITORY_ROOT>") return `core.worktree=${repositoryRoot}`;
    if (value === "<BLOB_OID>") {
      if (!HEX_OID.test(substitutions.blobOid ?? "")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
      return substitutions.blobOid;
    }
    if (value === "<TREE_OID>") {
      if (!HEX_OID.test(substitutions.treeOid ?? "")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
      return substitutions.treeOid;
    }
    if (value.includes("<")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
    return value;
  });
}

export function materializeGitCommand(processPolicy, commandId, repositoryRoot, substitutions = {}, blobClass) {
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot) || path.normalize(repositoryRoot) !== repositoryRoot || repositoryRoot.includes("\0")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND");
  const selected = selectGitCommandClass(processPolicy, commandId, commandId === "BLOB" ? { operationClass: blobClass } : undefined);
  return Object.freeze({
    arguments: Object.freeze([
      ...substituteArguments(processPolicy.fixedPrefix, substitutions, repositoryRoot),
      ...substituteArguments(selected.arguments, substitutions, repositoryRoot),
    ]),
    maximumBytes: selected.maximumBytes,
    stdoutRule: selected.stdoutRule,
  });
}

function killChild(child) {
  try { child.kill("SIGKILL"); } catch { /* fail path */ }
}

export function exceedsChildOutputLimit(stdoutBytes, stderrBytes, commandMaximumBytes, processOutputBytes) {
  if (![stdoutBytes, stderrBytes, commandMaximumBytes, processOutputBytes].every((value) => Number.isSafeInteger(value) && value >= 0)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT");
  return stdoutBytes > commandMaximumBytes || stderrBytes > commandMaximumBytes || stdoutBytes + stderrBytes > processOutputBytes;
}

async function collectChild(child, maximumBytes, processOutputBytes, deadline) {
  return await new Promise((resolve, reject) => {
    const stdout = [];
    const stderr = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let timer;
    const fail = (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      killChild(child);
      reject(new OwnerProposalRuntimeRefusal(code));
    };
    const remaining = deadline - Date.now();
    if (remaining <= 0) return fail("SOURCE_ORIGIN_OWNER_PROPOSAL_TIMEOUT");
    timer = setTimeout(() => fail("SOURCE_ORIGIN_OWNER_PROPOSAL_TIMEOUT"), remaining);
    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.length;
      if (exceedsChildOutputLimit(stdoutBytes, stderrBytes, maximumBytes, processOutputBytes)) fail("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT");
      else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.length;
      if (exceedsChildOutputLimit(stdoutBytes, stderrBytes, maximumBytes, processOutputBytes)) fail("SOURCE_ORIGIN_OWNER_PROPOSAL_LIMIT");
      else stderr.push(Buffer.from(chunk));
    });
    child.on("error", () => fail("SOURCE_ORIGIN_OWNER_PROPOSAL_CHILD"));
    child.on("close", (status, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const stderrBuffer = Buffer.concat(stderr);
      if (status !== 0 || signal !== null || stderrBuffer.length !== 0) reject(new OwnerProposalRuntimeRefusal("SOURCE_ORIGIN_OWNER_PROPOSAL_CHILD"));
      else resolve(Buffer.concat(stdout));
    });
  });
}

function oneUtf8Line(bytes) {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTPUT"); }
  if (text.startsWith("\ufeff") || text.includes("\0") || !/^[^\r\n]+\r?\n$/u.test(text)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTPUT");
  return text.replace(/\r?\n$/u, "");
}

function strictUtf8(bytes, code) {
  if (!Buffer.isBuffer(bytes)) refuse(code);
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { refuse(code); }
  if (text.startsWith("\ufeff") || text !== text.normalize("NFC")) refuse(code);
  return text;
}

function configAssignmentRows(processPolicy, repositoryRoot) {
  const rows = [];
  for (let index = 0; index < processPolicy.fixedPrefix.length; index += 1) {
    if (processPolicy.fixedPrefix[index] !== "-c") continue;
    const assignment = processPolicy.fixedPrefix[index + 1].replace("<REPOSITORY_ROOT>", repositoryRoot);
    const split = assignment.indexOf("=");
    if (split <= 0) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
    rows.push({ key: assignment.slice(0, split), value: assignment.slice(split + 1) });
  }
  return rows.sort((left, right) => codeUnitCompare(`${left.key}\0${left.value}`, `${right.key}\0${right.value}`));
}

function allowanceMatches(key, row) {
  if (!row.keyRule.includes("<SUBSECTION>")) return key === row.keyRule;
  const [prefix, suffix] = row.keyRule.split("<SUBSECTION>");
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false;
  const subsection = key.slice(prefix.length, key.length - suffix.length);
  return subsection.length > 0 && subsection === subsection.normalize("NFC") && !CONTROL.test(subsection);
}

function allowanceValueMatches(value, rule) {
  if (rule === "BOOL") return value === "true" || value === "false";
  if (rule === "BOOL_OR_ALWAYS") return value === "true" || value === "false" || value === "always";
  if (rule === "FALSE") return value === "false";
  if (rule === "TRUE") return value === "true";
  if (rule === "ZERO") return value === "0";
  if (rule === "DOT") return value === ".";
  if (rule === "NONEMPTY_TEXT") return value.length > 0 && value === value.normalize("NFC") && !CONTROL.test(value);
  return false;
}

export function parseGitConfigRows(bytes, processPolicyValue, repositoryRoot) {
  let processPolicy;
  try { processPolicy = validateGitProcessPolicy(processPolicyValue); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG"); }
  if (typeof repositoryRoot !== "string" || !path.isAbsolute(repositoryRoot) || repositoryRoot.includes("\0")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
  const text = strictUtf8(bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
  if (!text.endsWith("\0")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
  const fields = text.slice(0, -1).split("\0");
  if (fields.length === 0 || fields.length % 3 !== 0) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
  const commandRows = [];
  const localRows = [];
  for (let index = 0; index < fields.length; index += 3) {
    const [scope, origin, assignment] = fields.slice(index, index + 3);
    const newline = assignment.indexOf("\n");
    if ((scope !== "command" && scope !== "local") || !origin || CONTROL.test(origin) || origin !== origin.normalize("NFC") ||
        newline <= 0 || assignment.indexOf("\n", newline + 1) !== -1) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
    const key = assignment.slice(0, newline);
    const value = assignment.slice(newline + 1);
    if (!key || key !== key.normalize("NFC") || CONTROL.test(key)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
    (scope === "command" ? commandRows : localRows).push({ key, value });
  }
  commandRows.sort((left, right) => codeUnitCompare(`${left.key}\0${left.value}`, `${right.key}\0${right.value}`));
  const expectedCommands = configAssignmentRows(processPolicy, repositoryRoot);
  if (canonicalJsonText(commandRows) !== canonicalJsonText(expectedCommands)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");

  const normalized = [];
  const seen = new Map();
  for (const row of localRows) {
    const matches = processPolicy.configAllowanceRows.filter((allowance) => allowanceMatches(row.key, allowance));
    if (matches.length !== 1 || !allowanceValueMatches(row.value, matches[0].valueRule)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
    const allowance = matches[0];
    const prior = seen.get(row.key) ?? [];
    if (allowance.cardinality === "SINGLETON" ? prior.length !== 0 : prior.includes(row.value)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CONFIG");
    prior.push(row.value);
    seen.set(row.key, prior);
    normalized.push({ scope: "local", key: row.key, value: row.value });
  }
  normalized.sort((left, right) => codeUnitCompare(`${left.key}\0${left.value}`, `${right.key}\0${right.value}`));
  return Object.freeze({
    commandRowCount: commandRows.length,
    localRowCount: normalized.length,
    semanticDigest: sha256Canonical("galerina.logic-aig-local-git-config.v1", normalized),
  });
}

function skipHistoricalTrivia(text, state) {
  while (state.index < text.length) {
    if (/\s/u.test(text[state.index])) { state.index += 1; continue; }
    if (text.startsWith("//", state.index)) {
      const newline = text.indexOf("\n", state.index + 2);
      state.index = newline === -1 ? text.length : newline + 1;
      continue;
    }
    break;
  }
}

function historicalString(text, state) {
  skipHistoricalTrivia(text, state);
  if (text[state.index] !== "'") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  const start = ++state.index;
  while (state.index < text.length && text[state.index] !== "'") {
    if (text[state.index] === "\\" || text[state.index] === "\r" || text[state.index] === "\n") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
    state.index += 1;
  }
  if (state.index >= text.length) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  const value = text.slice(start, state.index++);
  if (!value || value !== value.normalize("NFC")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  return value;
}

export function extractHistoricalBaselineEntries(bytes) {
  const text = strictUtf8(bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  const marker = "const PROPOSED_BASELINE = Object.freeze({";
  const start = text.indexOf(marker);
  if (start < 0 || text.indexOf(marker, start + marker.length) !== -1) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  const end = text.indexOf("\n});", start + marker.length);
  if (end < 0) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  const body = text.slice(start + marker.length, end);
  const state = { index: 0 };
  const entries = [];
  while (true) {
    skipHistoricalTrivia(body, state);
    if (state.index === body.length) break;
    const directoryName = historicalString(body, state);
    skipHistoricalTrivia(body, state);
    if (body[state.index++] !== ":") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
    const reason = historicalString(body, state);
    skipHistoricalTrivia(body, state);
    if (body[state.index++] !== ",") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
    entries.push({ directoryName, reason });
  }
  entries.sort((left, right) => codeUnitCompare(left.directoryName, right.directoryName));
  if (canonicalJsonText(entries) !== canonicalJsonText(HISTORICAL_BASELINE_ENTRIES)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

function portableLocator(value, code) {
  if (typeof value !== "string" || !value || value !== value.normalize("NFC") || value.includes("\0") || value.includes("\\") || value.includes(":") || value.startsWith("/")) refuse(code);
  const components = value.split("/");
  if (components.some((component) => !component || component === "." || component === "..")) refuse(code);
  return value;
}

function oidPattern(objectFormat) {
  if (objectFormat === "sha1") return /^[0-9a-f]{40}$/u;
  if (objectFormat === "sha256") return /^[0-9a-f]{64}$/u;
  refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
}

function nulRecords(bytes, code) {
  const text = strictUtf8(bytes, code);
  if (!text.endsWith("\0")) refuse(code);
  const records = text.slice(0, -1).split("\0");
  if (records.length === 0 || records.some((record) => record.length === 0)) refuse(code);
  return records;
}

function validateLeafMode(mode, type, code) {
  const expected = mode === "160000" ? "commit" : "blob";
  if (!["100644", "100755", "120000", "160000"].includes(mode) || type !== expected) refuse(code);
}

export function parseTreeRows(bytes, objectFormat) {
  const oid = oidPattern(objectFormat);
  const rows = nulRecords(bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_TREE").map((record) => {
    const match = /^(\d{6}) (blob|commit) ([0-9a-f]+)\t(.+)$/u.exec(record);
    if (!match || !oid.test(match[3])) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_TREE");
    validateLeafMode(match[1], match[2], "SOURCE_ORIGIN_OWNER_PROPOSAL_TREE");
    return { mode: match[1], type: match[2], oid: match[3], path: portableLocator(match[4], "SOURCE_ORIGIN_OWNER_PROPOSAL_TREE") };
  });
  rows.sort((left, right) => codeUnitCompare(left.path, right.path));
  for (let index = 1; index < rows.length; index += 1) if (rows[index - 1].path === rows[index].path) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_TREE");
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function parseIndexStageRows(bytes, objectFormat) {
  const oid = oidPattern(objectFormat);
  const rows = nulRecords(bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX").map((record) => {
    const match = /^(\d{6}) ([0-9a-f]+) ([0-3])\t(.+)$/u.exec(record);
    if (!match || !oid.test(match[2]) || match[3] !== "0") refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX");
    validateLeafMode(match[1], match[1] === "160000" ? "commit" : "blob", "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX");
    return { mode: match[1], oid: match[2], path: portableLocator(match[4], "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX") };
  });
  rows.sort((left, right) => codeUnitCompare(left.path, right.path));
  for (let index = 1; index < rows.length; index += 1) if (rows[index - 1].path === rows[index].path) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX");
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function parseIndexFlagRows(bytes) {
  const rows = nulRecords(bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX").map((record) => {
    const match = /^(.) (.+)$/u.exec(record);
    if (!match) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX");
    return { flag: match[1], path: portableLocator(match[2], "SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX") };
  });
  rows.sort((left, right) => codeUnitCompare(left.path, right.path));
  for (let index = 1; index < rows.length; index += 1) if (rows[index - 1].path === rows[index].path) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX");
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function assertIndexMatchesTree(treeRows, indexRows, flagRows) {
  const treeProjection = treeRows.map(({ mode, oid, path: locator }) => ({ mode, oid, path: locator }));
  if (canonicalJsonText(treeProjection) !== canonicalJsonText(indexRows) ||
      canonicalJsonText(treeProjection.map((row) => row.path)) !== canonicalJsonText(flagRows.map((row) => row.path)) ||
      flagRows.some((row) => row.flag !== "H")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_INDEX");
}

function decodeHeldText(bytes, code) {
  if (!Buffer.isBuffer(bytes) || isProxy(bytes)) refuse(code);
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { refuse(code); }
  if (text.startsWith("\ufeff")) refuse(code);
  return text;
}

function selectedDomain(locator, sourcePolicy) {
  let selected = null;
  for (const row of sourcePolicy.suffixes) if (locator.endsWith(row.suffix) && (!selected || row.suffix.length > selected.suffix.length)) selected = row;
  return selected?.domain ?? null;
}

function expectedRow({ path: locator, domain, parserId, disposition, diagnosticCodes, ownerKind, ownerLocator, ownerKey }) {
  return Object.freeze({ path: locator, domain, parserId, disposition, diagnosticCodes, ownerKind, ownerLocator, ownerKey });
}

function addExpectedRow(rows, row) {
  if (rows.has(row.path)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
  rows.set(row.path, row);
}

function validateGateVerdicts(value, parserPolicy) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
  const pattern = new RegExp(parserPolicy.diagnosticCodePattern, "u");
  const output = [];
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || !key || key !== key.normalize("NFC") || CONTROL.test(key)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    const row = exactDataObject(descriptor.value, ["ok", "codes"], "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    if (typeof row.ok !== "boolean" || !Array.isArray(row.codes) || isProxy(row.codes) || Object.getPrototypeOf(row.codes) !== Array.prototype) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    const codes = [...row.codes];
    if (codes.some((code) => typeof code !== "string" || !pattern.test(code)) || canonicalJsonText(codes) !== canonicalJsonText([...new Set(codes)].sort(codeUnitCompare)) || (!row.ok && codes.length === 0)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    output.push({ key, ok: row.ok, codes });
  }
  return output;
}

export function deriveExpectedOutcomeRows({ baselineEntries, gateVerdicts, parserPolicy, selectedSources, sourcePolicy }) {
  try {
    parserPolicy = validateParserPolicy(parserPolicy);
    sourcePolicy = validateSourcePolicy(sourcePolicy);
  } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES"); }
  if (!Array.isArray(baselineEntries) || canonicalJsonText(baselineEntries) !== canonicalJsonText(HISTORICAL_BASELINE_ENTRIES) || !Array.isArray(selectedSources) || isProxy(selectedSources)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
  const parserByDomain = new Map(parserPolicy.domainParserBindings.map((binding) => [binding.domain, binding.parserId]));
  const proposedNames = new Set(baselineEntries.map((entry) => entry.directoryName));
  const sources = selectedSources.map((source) => {
    const captured = exactDataObject(source, ["bytes", "path", "sidecarBytes"], "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    portableLocator(captured.path, "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    const domain = selectedDomain(captured.path, sourcePolicy);
    if (!domain || !Buffer.isBuffer(captured.bytes) || isProxy(captured.bytes) || (captured.sidecarBytes !== null && (!Buffer.isBuffer(captured.sidecarBytes) || isProxy(captured.sidecarBytes)))) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    const proposedMembership = captured.path.split("/").filter((component) => proposedNames.has(component));
    if (proposedMembership.length > 1) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    return { ...captured, domain, parserId: parserByDomain.get(domain), proposedDirectoryName: proposedMembership[0] ?? null };
  }).sort((left, right) => codeUnitCompare(left.path, right.path));
  for (let index = 1; index < sources.length; index += 1) if (sources[index - 1].path === sources[index].path) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
  const byPath = new Map(sources.map((source) => [source.path, source]));
  const rows = new Map();

  for (const source of sources) {
    const text = decodeHeldText(source.bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    const matches = [...text.matchAll(/^\/\/\/[\t ]*expected_diagnostics:[\t ]*(.*?)[\t ]*\r?$/gmu)];
    if (matches.length > 1 || (matches.length === 1 && source.sidecarBytes !== null)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    const proposedDraftNone = source.proposedDirectoryName !== null && /^none[\t ]+\(when[\t ]+adopted\)$/iu.test(matches[0]?.[1] ?? "");
    if (matches.length === 1 && !/^none$/iu.test(matches[0][1]) && !proposedDraftNone) {
      let codes;
      try { codes = decodeDiagnosticSet(matches[0][1], parserPolicy); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES"); }
      addExpectedRow(rows, expectedRow({ path: source.path, domain: source.domain, parserId: source.parserId, disposition: "EXPECTED_REFUSAL", diagnosticCodes: codes, ownerKind: "INLINE_EXPECTATION", ownerLocator: source.path, ownerKey: "expected_diagnostics" }));
    }
    if (source.sidecarBytes !== null) {
      let codes;
      try { codes = decodeDiagnosticSet(decodeHeldText(source.sidecarBytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES"), parserPolicy); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES"); }
      addExpectedRow(rows, expectedRow({ path: source.path, domain: source.domain, parserId: source.parserId, disposition: "EXPECTED_REFUSAL", diagnosticCodes: codes, ownerKind: "SIDECAR_EXPECTATION", ownerLocator: `${source.path}.expected.diagnostics.txt`, ownerKey: "complete-file" }));
    }
  }

  const encodedPaths = new Map();
  for (const source of sources) {
    const encoded = source.path.replaceAll("/", "__");
    if (encodedPaths.has(encoded)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    encodedPaths.set(encoded, source.path);
  }
  for (const verdict of validateGateVerdicts(gateVerdicts, parserPolicy)) {
    const locator = encodedPaths.get(verdict.key);
    const source = locator && byPath.get(locator);
    if (!source) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    if (verdict.codes.length === 0) continue;
    addExpectedRow(rows, expectedRow({ path: source.path, domain: source.domain, parserId: source.parserId, disposition: "EXPECTED_REFUSAL", diagnosticCodes: verdict.codes, ownerKind: "GATE_V3_VERDICT", ownerLocator: "packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json", ownerKey: source.path.slice(source.path.lastIndexOf("/") + 1) }));
  }

  for (const entry of baselineEntries) {
    let matches = 0;
    for (const source of sources) {
      const count = source.path.split("/").filter((component) => component === entry.directoryName).length;
      if (count > 1) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
      if (count !== 1) continue;
      matches += 1;
      addExpectedRow(rows, expectedRow({ path: source.path, domain: source.domain, parserId: source.parserId, disposition: "OPAQUE_PROPOSED", diagnosticCodes: null, ownerKind: "PROPOSED_BASELINE", ownerLocator: "governance/example-proposed-baseline.json", ownerKey: entry.directoryName }));
    }
    if (matches === 0) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
  }
  return Object.freeze([...rows.values()].sort((left, right) => codeUnitCompare(left.path, right.path)));
}

function assertNoDuplicateJsonMembers(text, code) {
  const scopes = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === "\"") {
      const start = index++;
      while (index < text.length) {
        if (text[index] === "\\") index += 2;
        else if (text[index++] === "\"") break;
      }
      let cursor = index;
      while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
      if (text[cursor] === ":" && scopes.length > 0) {
        let key;
        try { key = JSON.parse(text.slice(start, index)); } catch { refuse(code); }
        const scope = scopes.at(-1);
        if (scope.has(key)) refuse(code);
        scope.add(key);
      }
      continue;
    }
    if (character === "{") scopes.push(new Set());
    else if (character === "}") {
      if (scopes.length === 0) refuse(code);
      scopes.pop();
    }
    index += 1;
  }
  if (scopes.length !== 0) refuse(code);
}

function parseGateOwner(bytes, parserPolicy) {
  const text = decodeHeldText(bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  if (!text.endsWith("\n") || text.endsWith("\n\n") || text.endsWith("\r\n")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  assertNoDuplicateJsonMembers(text, "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  let value;
  try { value = JSON.parse(text); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"); }
  try { validateGateVerdicts(value, parserPolicy); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"); }
  return Object.freeze({ value, semanticDigest: sha256Canonical("galerina.logic-aig-gate-v3-reference-verdicts.v1", value) });
}

function createDigestedCandidate(body, digestField, validate, options) {
  const value = { ...body, [digestField]: sha256Canonical(body.schema, body) };
  try { validate(value, options); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTPUTS"); }
  const bytes = Buffer.from(canonicalJsonText(value), "utf8");
  return Object.freeze({ value, bytes, byteLength: bytes.length, rawSha256: sha256Raw(bytes), semanticDigest: value[digestField] });
}

export function createProposalOutputs({ baselineEntries, bindings, parserPolicy, rows }) {
  const baseline = createDigestedCandidate({
    schema: "galerina.example-proposed-baseline.v1",
    entries: baselineEntries.map((entry) => ({ ...entry })),
    authorizing: false,
  }, "policyDigest", validateProposedBaseline);
  const expected = createDigestedCandidate({
    schema: "galerina.logic-aig-expected-parse-outcomes.v1",
    parserPolicyDigest: parserPolicy.policyDigest,
    rows: rows.map((row) => ({ ...row, diagnosticCodes: row.diagnosticCodes === null ? null : [...row.diagnosticCodes] })),
    authorizing: false,
  }, "expectedOutcomesDigest", validateExpectedParseOutcomes, { parserPolicy });
  let exporter;
  try {
    exporter = createExporterPolicyCandidate({
      ...bindings,
      expectedOutcomesDigest: expected.semanticDigest,
      proposedBaselineDigest: baseline.semanticDigest,
    });
  } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTPUTS"); }
  return Object.freeze({ baseline, expected, exporter });
}

function countOutcomeOwners(selectedSources, gateVerdicts, rows) {
  let inlineSources = 0;
  let sidecarSources = 0;
  for (const source of selectedSources) {
    const text = decodeHeldText(source.bytes, "SOURCE_ORIGIN_OWNER_PROPOSAL_OUTCOMES");
    if (/^\/\/\/[\t ]*expected_diagnostics:/gmu.test(text)) inlineSources += 1;
    if (source.sidecarBytes !== null) sidecarSources += 1;
  }
  const rowCount = (kind) => rows.filter((row) => row.ownerKind === kind).length;
  return Object.freeze([
    { ownerKind: "GATE_V3_VERDICT", sourceCount: Object.keys(gateVerdicts).length, rowCount: rowCount("GATE_V3_VERDICT") },
    { ownerKind: "INLINE_EXPECTATION", sourceCount: inlineSources, rowCount: rowCount("INLINE_EXPECTATION") },
    { ownerKind: "PROPOSED_BASELINE", sourceCount: rowCount("PROPOSED_BASELINE"), rowCount: rowCount("PROPOSED_BASELINE") },
    { ownerKind: "SIDECAR_EXPECTATION", sourceCount: sidecarSources, rowCount: rowCount("SIDECAR_EXPECTATION") },
  ].map((row) => Object.freeze(row)));
}

export function canonicalExistingPath(locator, kind, code = "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY") {
  if (typeof locator !== "string" || !path.isAbsolute(locator) || locator.includes("\0")) refuse(code);
  let observed;
  let real;
  try {
    observed = lstatSync(locator);
    real = realpathSync.native(locator);
  } catch { refuse(code); }
  if (observed.isSymbolicLink() || (kind === "DIRECTORY" ? !observed.isDirectory() : !observed.isFile())) refuse(code);
  const canonicalText = process.platform === "win32" ? real.replaceAll("\\", "/") : real;
  if (locator !== canonicalText) refuse(code);
  return real;
}

function commonGitDirectory(gitDirectory) {
  if (path.basename(path.dirname(gitDirectory)).toLowerCase() === "worktrees") return path.dirname(path.dirname(gitDirectory));
  return gitDirectory;
}

function alternateExpectation(gitDirectory, kind) {
  return path.join(commonGitDirectory(gitDirectory), "objects", "info", kind);
}

export function observeAlternateFile(locator, expected) {
  if (typeof locator !== "string" || locator.includes("\0") || !path.isAbsolute(locator)) refuse("SOURCE_ORIGIN_GIT_ALTERNATES");
  let canonicalExpected;
  try {
    const parent = realpathSync.native(path.dirname(expected));
    canonicalExpected = path.join(parent, path.basename(expected));
  } catch { refuse("SOURCE_ORIGIN_GIT_ALTERNATES"); }
  const canonicalText = process.platform === "win32" ? canonicalExpected.replaceAll("\\", "/") : canonicalExpected;
  if (locator !== canonicalText) refuse("SOURCE_ORIGIN_GIT_ALTERNATES");
  try {
    const observed = lstatSync(canonicalExpected);
    if (observed.isSymbolicLink() || !observed.isFile() || observed.size !== 0) refuse("SOURCE_ORIGIN_GIT_ALTERNATES");
    if (realpathSync.native(canonicalExpected) !== canonicalExpected) refuse("SOURCE_ORIGIN_GIT_ALTERNATES");
    return "ZERO_REGULAR_FILE";
  } catch (error) {
    if (error instanceof OwnerProposalRuntimeRefusal) throw error;
    if (error?.code !== "ENOENT") refuse("SOURCE_ORIGIN_GIT_ALTERNATES");
    return "ABSENT";
  }
}

function assertOid(value, objectFormat, code) {
  if (!oidPattern(objectFormat).test(value)) refuse(code);
  return value;
}

async function openingRepositoryState(run) {
  const toplevel = canonicalExistingPath(await run("TOPLEVEL"), "DIRECTORY", "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  if (toplevel !== REPOSITORY_ROOT) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  const gitDirectory = canonicalExistingPath(await run("GIT_DIR"), "DIRECTORY", "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  const indexPath = canonicalExistingPath(await run("INDEX_PATH"), "FILE", "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  if (indexPath !== path.join(gitDirectory, "index")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  const alternatesLocator = await run("ALTERNATES");
  const httpAlternatesLocator = await run("HTTP_ALTERNATES");
  const alternates = observeAlternateFile(alternatesLocator, alternateExpectation(gitDirectory, "alternates"));
  const httpAlternates = observeAlternateFile(httpAlternatesLocator, alternateExpectation(gitDirectory, "http-alternates"));
  const objectFormat = await run("OBJECT_FORMAT");
  oidPattern(objectFormat);
  const commitOid = assertOid(await run("HEAD"), objectFormat, "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  const treeOid = assertOid(await run("TREE"), objectFormat, "SOURCE_ORIGIN_OWNER_PROPOSAL_REPOSITORY");
  const treeRows = parseTreeRows(await run("TREE_ROWS", { treeOid }), objectFormat);
  const indexRows = parseIndexStageRows(await run("INDEX_STAGE"), objectFormat);
  const flagRows = parseIndexFlagRows(await run("INDEX_FLAGS"));
  assertIndexMatchesTree(treeRows, indexRows, flagRows);
  return Object.freeze({ toplevel, gitDirectory, indexPath, alternates, httpAlternates, objectFormat, commitOid, treeOid, treeRows, indexRows, flagRows });
}

async function closingRepositoryState(run, opening) {
  const toplevel = canonicalExistingPath(await run("TOPLEVEL"), "DIRECTORY", "SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const gitDirectory = canonicalExistingPath(await run("GIT_DIR"), "DIRECTORY", "SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const indexPath = canonicalExistingPath(await run("INDEX_PATH"), "FILE", "SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const objectFormat = await run("OBJECT_FORMAT");
  const commitOid = assertOid(await run("HEAD"), objectFormat, "SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const treeOid = assertOid(await run("TREE"), objectFormat, "SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const treeRows = parseTreeRows(await run("TREE_ROWS", { treeOid }), objectFormat);
  const indexRows = parseIndexStageRows(await run("INDEX_STAGE"), objectFormat);
  const flagRows = parseIndexFlagRows(await run("INDEX_FLAGS"));
  assertIndexMatchesTree(treeRows, indexRows, flagRows);
  const alternatesLocator = await run("ALTERNATES");
  const httpAlternatesLocator = await run("HTTP_ALTERNATES");
  const alternates = observeAlternateFile(alternatesLocator, alternateExpectation(gitDirectory, "alternates"));
  const httpAlternates = observeAlternateFile(httpAlternatesLocator, alternateExpectation(gitDirectory, "http-alternates"));
  const comparable = { toplevel, gitDirectory, indexPath, alternates, httpAlternates, objectFormat, commitOid, treeOid, treeRows, indexRows, flagRows };
  if (canonicalJsonText(comparable) !== canonicalJsonText(opening)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
}

function regularTreeRow(treeByPath, locator, code) {
  const row = treeByPath.get(locator);
  if (!row || row.type !== "blob" || (row.mode !== "100644" && row.mode !== "100755")) refuse(code);
  return row;
}

async function heldBlob(run, treeByPath, locator, operationClass, code) {
  const row = regularTreeRow(treeByPath, locator, code);
  const bytes = await run("BLOB", { blobOid: row.oid }, operationClass);
  return Object.freeze({ locator, blobOid: row.oid, bytes, byteLength: bytes.length, rawSha256: sha256Raw(bytes) });
}

function semanticOwner(blob, validate, digestField) {
  let value;
  try { value = validate(parseCanonicalJsonBytes(blob.bytes, { label: blob.locator })); } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"); }
  return Object.freeze({ ...blob, value, semanticDigest: value[digestField] });
}

function ownerIdentity(owner) {
  return Object.freeze({ locator: owner.locator, blobOid: owner.blobOid, byteLength: owner.byteLength, rawSha256: owner.rawSha256, semanticDigest: owner.semanticDigest });
}

async function authenticateCurrentOwners(run, treeRows, bootstrap) {
  const treeByPath = new Map(treeRows.map((row) => [row.path, row]));
  const pinsBlob = await heldBlob(run, treeByPath, PINS_LOCATOR, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  const temporaryBlob = await heldBlob(run, treeByPath, TEMP_OWNER_LOCATOR, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  assertHeldOwnerBytes(pinsBlob.bytes, temporaryBlob.bytes, bootstrap.owners.pins.bytes, bootstrap.owners.temporary.bytes);
  const pins = Object.freeze({ ...pinsBlob, value: bootstrap.owners.pins.value, semanticDigest: bootstrap.owners.pins.semanticDigest });
  const temporary = Object.freeze({ ...temporaryBlob, value: bootstrap.owners.temporary.value, semanticDigest: bootstrap.owners.temporary.semanticDigest });

  const locators = bootstrap.owners.temporary.value.frozenOwnerLocators;
  const generatedLocator = "governance/logic-aig-source-origin-generated-consumers.json";
  const parserLocator = "governance/logic-aig-source-origin-parser-policy.json";
  const repositoryLocator = "governance/logic-aig-source-origin-repository-identity.json";
  const resolutionLocator = "governance/logic-aig-source-origin-resolution-policy.json";
  const sourceLocator = "governance/logic-aig-source-origin-source-policy.json";
  const gateLocator = "packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json";
  if (canonicalJsonText(locators) !== canonicalJsonText([generatedLocator, parserLocator, repositoryLocator, resolutionLocator, sourceLocator, gateLocator])) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");

  const generated = semanticOwner(await heldBlob(run, treeByPath, generatedLocator, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"), validateGeneratedConsumerPolicy, "policyDigest");
  const parser = semanticOwner(await heldBlob(run, treeByPath, parserLocator, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"), validateParserPolicy, "policyDigest");
  const repository = semanticOwner(await heldBlob(run, treeByPath, repositoryLocator, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"), validateRepositoryIdentity, "identityDigest");
  const resolution = semanticOwner(await heldBlob(run, treeByPath, resolutionLocator, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"), validateResolutionPolicy, "policyDigest");
  const source = semanticOwner(await heldBlob(run, treeByPath, sourceLocator, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER"), validateSourcePolicy, "policyDigest");
  const gateBlob = await heldBlob(run, treeByPath, gateLocator, "JSON", "SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
  const gateParsed = parseGateOwner(gateBlob.bytes, parser.value);
  const gate = Object.freeze({ ...gateBlob, value: gateParsed.value, semanticDigest: gateParsed.semanticDigest });
  const owners = [pins, temporary, generated, parser, repository, resolution, source, gate].sort((left, right) => codeUnitCompare(left.locator, right.locator));
  return Object.freeze({ generated, gate, identities: Object.freeze(owners.map(ownerIdentity)), parser, repository, resolution, source });
}

export function assertHeldOwnerBytes(heldPins, heldTemporary, modulePins, moduleTemporary) {
  if (![heldPins, heldTemporary, modulePins, moduleTemporary].every((value) => Buffer.isBuffer(value) && !isProxy(value)) ||
      !heldPins.equals(modulePins) || !heldTemporary.equals(moduleTemporary)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OWNER");
}

async function captureHistoricalBaseline(run, temporaryPolicy) {
  const historical = temporaryPolicy.historicalBaselineSource;
  const rows = parseTreeRows(await run("TREE_ROWS", { treeOid: historical.treeOid }), "sha1");
  const matching = rows.filter((row) => row.path === historical.path && row.type === "blob" && (row.mode === "100644" || row.mode === "100755"));
  if (matching.length !== 1 || matching[0].oid !== historical.blobOid) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  const bytes = await run("BLOB", { blobOid: historical.blobOid }, "CAPTURED_FILE");
  if (bytes.length !== historical.byteLength || sha256Raw(bytes) !== historical.rawSha256) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_HISTORICAL");
  return Object.freeze({ entries: extractHistoricalBaselineEntries(bytes), identity: Object.freeze({ ...historical }) });
}

async function captureSelectedSources(run, treeRows, sourcePolicy, limits) {
  const treeByPath = new Map(treeRows.map((row) => [row.path, row]));
  const selectedRows = [];
  for (const row of treeRows) {
    if (!selectedDomain(row.path, sourcePolicy)) continue;
    if (row.type !== "blob" || (row.mode !== "100644" && row.mode !== "100755")) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_SOURCES");
    selectedRows.push(row);
  }
  if (selectedRows.length > limits.sourceFiles) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_SOURCES");
  let sourceBytes = 0;
  let resolutionFiles = 0;
  let resolutionBytes = 0;
  const selectedSources = [];
  for (const row of selectedRows) {
    const bytes = await run("BLOB", { blobOid: row.oid }, "CAPTURED_FILE");
    sourceBytes += bytes.length;
    if (sourceBytes > limits.sourceBytes) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_SOURCES");
    const sidecarLocator = `${row.path}.expected.diagnostics.txt`;
    let sidecarBytes = null;
    if (treeByPath.has(sidecarLocator)) {
      const sidecar = regularTreeRow(treeByPath, sidecarLocator, "SOURCE_ORIGIN_OWNER_PROPOSAL_SOURCES");
      sidecarBytes = await run("BLOB", { blobOid: sidecar.oid }, "CAPTURED_FILE");
      resolutionFiles += 1;
      resolutionBytes += sidecarBytes.length;
      if (resolutionFiles > limits.resolutionFiles || resolutionBytes > limits.resolutionBytes) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_SOURCES");
    }
    selectedSources.push(Object.freeze({ path: row.path, bytes, sidecarBytes }));
  }
  return Object.freeze(selectedSources);
}

function sourceExclusionDigest(sourcePolicy) {
  return sha256Canonical("galerina.logic-aig-exclusions.v1", sourcePolicy.exclusions);
}

function sameBootstrapOwners(left, right) {
  return left.pins.rawSha256 === right.pins.rawSha256 && left.pins.semanticDigest === right.pins.semanticDigest &&
    left.temporary.rawSha256 === right.temporary.rawSha256 && left.temporary.semanticDigest === right.temporary.semanticDigest;
}

function sameExecutable(left, right) {
  return left.locator === right.locator && left.byteLength === right.byteLength && left.rawSha256 === right.rawSha256 &&
    left.stat.dev === right.stat.dev && left.stat.ino === right.stat.ino && left.stat.size === right.stat.size && left.stat.mtimeNs === right.stat.mtimeNs;
}

export function assertClosingBindings(openingOwners, closingOwners, openingExecutable, closingExecutable) {
  if (!sameBootstrapOwners(openingOwners, closingOwners) || !sameExecutable(openingExecutable, closingExecutable)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
}

export function createReceiptBytes({ currentOwners, historical, opening, outcomeCounts, outputs }) {
  const outputRows = [
    { kind: "PROPOSED_BASELINE", byteLength: outputs.baseline.byteLength, rawSha256: outputs.baseline.rawSha256, semanticDigest: outputs.baseline.semanticDigest },
    { kind: "EXPECTED_OUTCOMES", byteLength: outputs.expected.byteLength, rawSha256: outputs.expected.rawSha256, semanticDigest: outputs.expected.semanticDigest },
    { kind: "EXPORTER_POLICY", byteLength: outputs.exporter.byteLength, rawSha256: outputs.exporter.rawSha256, semanticDigest: outputs.exporter.policyDigest },
  ];
  const receipt = {
    schema: "galerina.logic-aig-owner-proposal-receipt.v1",
    commitOid: opening.commitOid,
    treeOid: opening.treeOid,
    objectFormat: opening.objectFormat,
    historicalBaselineSource: historical.identity,
    currentOwners,
    ownerCounts: outcomeCounts,
    ownerLocators: currentOwners.map((owner) => owner.locator),
    outputs: outputRows,
    proposedBaselineDigest: outputs.baseline.semanticDigest,
    expectedOutcomesDigest: outputs.expected.semanticDigest,
    exporterPolicyDigest: outputs.exporter.policyDigest,
    status: "PROPOSED",
    authorizing: false,
  };
  return Buffer.from(canonicalJsonText(receipt), "utf8");
}

function makeRunner({ executable, environment, policy, deadline }) {
  const trace = [];
  const runCommand = async (commandId, substitutions = {}, blobClass) => {
    const selected = materializeGitCommand(policy.gitProcessPolicy, commandId, REPOSITORY_ROOT, substitutions, blobClass);
    let child;
    try {
      child = spawn(executable, selected.arguments, { cwd: REPOSITORY_ROOT, env: environment, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch { refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_CHILD"); }
    const bytes = await collectChild(child, selected.maximumBytes, policy.limits.processOutputBytes, deadline);
    trace.push(commandId);
    return selected.stdoutRule === "ONE_UTF8_LINE" ? oneUtf8Line(bytes) : bytes;
  };
  Object.defineProperty(runCommand, "trace", { value: trace });
  return runCommand;
}

export function assertCommandTrace(trace, processPolicy) {
  if (!Array.isArray(trace) || isProxy(trace) || !processPolicy || !Array.isArray(processPolicy.commandRows)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND_TRACE");
  const expected = processPolicy.commandRows.map((row) => row.commandId).sort(codeUnitCompare);
  if (trace.length < expected.length + 2 || trace[0] !== "GIT_VERSION" || trace[1] !== "CONFIG_ROWS" ||
      trace.at(-2) !== "CONFIG_ROWS" || trace.at(-1) !== "GIT_VERSION" ||
      !expected.every((commandId) => trace.includes(commandId)) || trace.some((commandId) => !expected.includes(commandId))) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_COMMAND_TRACE");
}

function currentBootstrap(options) {
  const captured = captureOwnerProposalOptions(options);
  const owners = readBootstrapOwners();
  const hostPin = selectHostPin(owners.pins.value);
  const executable = authenticateGitExecutable(captured.gitExecutableLocator, hostPin);
  const environment = buildEnvironment(owners.temporary.value.environmentPolicy);
  return Object.freeze({ captured, owners, hostPin, executable, environment });
}

export async function runOwnerProposalRuntime(options) {
  const bootstrap = currentBootstrap(options);
  const deadline = Date.now() + bootstrap.owners.temporary.value.limits.processMillis;
  const run = makeRunner({ executable: bootstrap.executable.locator, environment: bootstrap.environment, policy: bootstrap.owners.temporary.value, deadline });
  const version = await run("GIT_VERSION");
  if (version !== `git version ${bootstrap.hostPin.gitIdentity.version}`) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_GIT_VERSION");
  const openingConfig = parseGitConfigRows(await run("CONFIG_ROWS"), bootstrap.owners.temporary.value.gitProcessPolicy, REPOSITORY_ROOT);
  const opening = await openingRepositoryState(run);
  const currentOwners = await authenticateCurrentOwners(run, opening.treeRows, bootstrap);
  const historical = await captureHistoricalBaseline(run, bootstrap.owners.temporary.value);
  const selectedSources = await captureSelectedSources(run, opening.treeRows, currentOwners.source.value, bootstrap.owners.temporary.value.limits);
  const rows = deriveExpectedOutcomeRows({
    baselineEntries: historical.entries,
    gateVerdicts: currentOwners.gate.value,
    parserPolicy: currentOwners.parser.value,
    selectedSources,
    sourcePolicy: currentOwners.source.value,
  });
  const outcomeCounts = countOutcomeOwners(selectedSources, currentOwners.gate.value, rows);
  const outputs = createProposalOutputs({
    baselineEntries: historical.entries,
    bindings: {
      sourcePolicyDigest: currentOwners.source.value.policyDigest,
      exclusionDigest: sourceExclusionDigest(currentOwners.source.value),
      resolutionPolicyDigest: currentOwners.resolution.value.policyDigest,
      parserPolicyDigest: currentOwners.parser.value.policyDigest,
      generatedConsumerPolicyDigest: currentOwners.generated.value.policyDigest,
      repositoryIdentityDigest: currentOwners.repository.value.identityDigest,
      toolchainPinsDigest: bootstrap.owners.pins.value.pinsDigest,
    },
    parserPolicy: currentOwners.parser.value,
    rows,
  });

  await closingRepositoryState(run, opening);
  const closingConfig = parseGitConfigRows(await run("CONFIG_ROWS"), bootstrap.owners.temporary.value.gitProcessPolicy, REPOSITORY_ROOT);
  if (canonicalJsonText(openingConfig) !== canonicalJsonText(closingConfig)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const ownersBeforeVersion = readBootstrapOwners();
  const executableBeforeVersion = authenticateGitExecutable(bootstrap.captured.gitExecutableLocator, bootstrap.hostPin);
  assertClosingBindings(bootstrap.owners, ownersBeforeVersion, bootstrap.executable, executableBeforeVersion);
  const closingVersion = await run("GIT_VERSION");
  if (closingVersion !== version) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_DRIFT");
  const ownersAfterVersion = readBootstrapOwners();
  const executableAfterVersion = authenticateGitExecutable(bootstrap.captured.gitExecutableLocator, bootstrap.hostPin);
  assertClosingBindings(bootstrap.owners, ownersAfterVersion, bootstrap.executable, executableAfterVersion);
  assertCommandTrace(run.trace, bootstrap.owners.temporary.value.gitProcessPolicy);

  const receiptBytes = createReceiptBytes({ currentOwners: currentOwners.identities, historical, opening, outcomeCounts, outputs });
  return packageProposalResult(outputs, receiptBytes);
}

export function packageProposalResult(outputs, receiptBytes) {
  if (!outputs || !Buffer.isBuffer(outputs.baseline?.bytes) || !Buffer.isBuffer(outputs.expected?.bytes) || !Buffer.isBuffer(outputs.exporter?.bytes) || !Buffer.isBuffer(receiptBytes)) refuse("SOURCE_ORIGIN_OWNER_PROPOSAL_OUTPUTS");
  return Object.freeze({
    proposedBaselineBytes: Buffer.from(outputs.baseline.bytes),
    expectedOutcomesBytes: Buffer.from(outputs.expected.bytes),
    exporterPolicyBytes: Buffer.from(outputs.exporter.bytes),
    receiptBytes: Buffer.from(receiptBytes),
  });
}
