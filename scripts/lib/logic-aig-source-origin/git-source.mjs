import { closeSync, lstatSync, openSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { arch, platform } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isProxy } from 'node:util/types';

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  classifySourcePath,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
  validateGeneratedConsumerPolicy,
  validateProposedBaseline,
  validateRepositoryIdentity,
  validateExpectedParseOutcomes,
  validateParserPolicy,
  validateResolutionPolicy,
  validateSourcePolicy,
  validateToolchainPins,
} from './contract.mjs';
import {
  OWNER_PROPOSAL_POLICY,
  buildGitEnvironment,
  selectGitCommandClass,
  validateExporterPolicy,
  validateGitProcessPolicy,
} from './owner-proposal-policy.mjs';

const REPOSITORY_ROOT = realpathSync.native(fileURLToPath(new URL('../../../', import.meta.url)));

const POLICY_PATHS = Object.freeze({
  proposedBaseline: 'governance/example-proposed-baseline.json',
  exporter: 'governance/logic-aig-source-origin-exporter-policy.json',
  generated: 'governance/logic-aig-source-origin-generated-consumers.json',
  gate: 'packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json',
  repositoryIdentity: 'governance/logic-aig-source-origin-repository-identity.json',
  expectedOutcomes: 'governance/logic-aig-source-origin-expected-parse-outcomes.json',
  parser: 'governance/logic-aig-source-origin-parser-policy.json',
  resolution: 'governance/logic-aig-source-origin-resolution-policy.json',
  source: 'governance/logic-aig-source-origin-source-policy.json',
  toolchainPins: 'governance/logic-aig-source-origin-toolchain-pins.json',
});
const OWNER_IDENTITIES = Object.freeze({
  pins: Object.freeze({ byteLength: 69_452, rawSha256: '0c5bb3b5e77e36741c479f65442dec01c76c57aa67b57fdcdba975e9a6f036cf', semanticDigest: 'a287faaf55f698b7e78d085a24a34bae4998e78e55706731fe9779a0fe4834f8' }),
  proposedBaseline: Object.freeze({ byteLength: 1_605, rawSha256: 'eb1620e43d72f2d1afc3fc7c467c06856d99d936d45c905ef4f1b77abdff8817', semanticDigest: '7e244a1486778fc21fefbb9412ac1057172f716124ec0266f0ccedbae6dca6f8' }),
  expectedOutcomes: Object.freeze({ byteLength: 35_998, rawSha256: 'e86aa47550164ee30fac455c73f3e32f0e0cb1a047175924805087d2301afbe9', semanticDigest: '9a22abb0889101c39e30a07a546a00829320c5fa679a31e97e70312d93ae14a5' }),
  exporter: Object.freeze({ byteLength: 9_451, rawSha256: '97770da53732b1b09cddef4dbe550beca1b5c80cd203a30d29630f305612225a', semanticDigest: 'd45f8e0c7404d608fc735ee406b1abc6348c4466988e6a150d7aa08a8707b96a' }),
  gate: Object.freeze({ byteLength: 2_029, rawSha256: 'd83ce2590520b152e1c838322e1762e4840c274e812bf6006e275118ada59467', semanticDigest: '4dfceb7f2bf2b6642c3b0cc2838735d41b8aad9e3c08e45f394637eb43bf8a58' }),
});
const EXPORTER_BINDING_FIELDS = Object.freeze([
  'sourcePolicyDigest',
  'exclusionDigest',
  'resolutionPolicyDigest',
  'parserPolicyDigest',
  'generatedConsumerPolicyDigest',
  'repositoryIdentityDigest',
  'toolchainPinsDigest',
  'expectedOutcomesDigest',
  'proposedBaselineDigest',
]);
const OID_PATTERNS = Object.freeze({
  sha1: /^[0-9a-f]{40}$/,
  sha256: /^[0-9a-f]{64}$/,
});
const HEX_OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const CONTROL = /[\u0000-\u001f\u007f]/u;

class SourceOriginCaptureRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'SourceOriginCaptureRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new SourceOriginCaptureRefusal(code);
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code = 'SOURCE_ORIGIN_GIT_SCHEMA') {
  if (value === null || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) refuse(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const ownNames = Object.getOwnPropertyNames(value);
  for (const name of ownNames) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  const names = ownNames.sort(codeUnitCompare);
  const expected = [...keys].sort(codeUnitCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) refuse(code);
}

function captureOptions(value) {
  exactObject(value, ['commitOid', 'gitExecutableLocator']);
  if (typeof value.commitOid !== 'string' || !HEX_OID.test(value.commitOid) ||
      typeof value.gitExecutableLocator !== 'string' || value.gitExecutableLocator.length === 0 ||
      value.gitExecutableLocator.includes('\0') || !path.isAbsolute(value.gitExecutableLocator) ||
      path.normalize(value.gitExecutableLocator) !== value.gitExecutableLocator) refuse('SOURCE_ORIGIN_GIT_SCHEMA');
  const captured = Object.create(null);
  captured.commitOid = value.commitOid;
  captured.gitExecutableLocator = value.gitExecutableLocator;
  return Object.freeze(captured);
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

function validatePath(path) {
  if (
    typeof path !== 'string'
    || path.length === 0
    || path.includes('\0')
    || path.includes('\\')
    || path.startsWith('/')
    || /^[A-Za-z]:\//.test(path)
    || path.endsWith('/')
    || hasUnpairedSurrogate(path)
    || path !== path.normalize('NFC')
  ) refuse('SOURCE_ORIGIN_GIT_PATH');
  const components = path.split('/');
  if (components.some((component) => component.length === 0 || component === '.' || component === '..')) refuse('SOURCE_ORIGIN_GIT_PATH');
  return path;
}

function exporterBindings(value) {
  const bindings = {};
  for (const field of EXPORTER_BINDING_FIELDS) bindings[field] = value[field];
  return bindings;
}

function readBoundWorkingOwner(locator, identity, validate, semanticDigestField) {
  const absolute = path.join(REPOSITORY_ROOT, ...locator.split('/'));
  let before;
  let bytes;
  let after;
  try {
    before = lstatSync(absolute, { bigint: true });
    if (before.isSymbolicLink() || !before.isFile() || before.size !== BigInt(identity.byteLength) || realpathSync.native(absolute) !== absolute) refuse('SOURCE_ORIGIN_GIT_POLICY');
    const descriptor = openSync(absolute, 'r');
    try { bytes = readFileSync(descriptor); } finally { closeSync(descriptor); }
    after = lstatSync(absolute, { bigint: true });
  } catch (error) {
    if (error instanceof SourceOriginCaptureRefusal) throw error;
    refuse('SOURCE_ORIGIN_GIT_POLICY');
  }
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs ||
      bytes.length !== identity.byteLength || sha256Raw(bytes) !== identity.rawSha256) refuse('SOURCE_ORIGIN_GIT_POLICY');
  let value;
  try { value = validate(parseCanonicalJsonBytes(bytes, { label: locator })); } catch { refuse('SOURCE_ORIGIN_GIT_POLICY'); }
  if (value[semanticDigestField] !== identity.semanticDigest) refuse('SOURCE_ORIGIN_GIT_POLICY');
  return Object.freeze({ bytes: Buffer.from(bytes), value, ...identity });
}

function readBootstrapOwners() {
  const pins = readBoundWorkingOwner(POLICY_PATHS.toolchainPins, OWNER_IDENTITIES.pins, validateToolchainPins, 'pinsDigest');
  const exporter = readBoundWorkingOwner(
    POLICY_PATHS.exporter,
    OWNER_IDENTITIES.exporter,
    (value) => validateExporterPolicy(value, exporterBindings(value)),
    'policyDigest',
  );
  if (exporter.value.toolchainPinsDigest !== pins.value.pinsDigest ||
      canonicalJsonText(exporter.value.gitProcessPolicy) !== canonicalJsonText(OWNER_PROPOSAL_POLICY.gitProcessPolicy) ||
      canonicalJsonText(exporter.value.environmentPolicy) !== canonicalJsonText(OWNER_PROPOSAL_POLICY.environmentPolicy) ||
      canonicalJsonText(exporter.value.limits) !== canonicalJsonText(OWNER_PROPOSAL_POLICY.limits)) refuse('SOURCE_ORIGIN_GIT_POLICY');
  return Object.freeze({ pins, exporter });
}

function selectHostPin(pins) {
  const rows = pins.records.filter((row) => row.platform === platform() && row.arch === arch());
  if ((platform() !== 'win32' && platform() !== 'linux') || arch() !== 'x64' || rows.length !== 1) refuse('SOURCE_ORIGIN_HOLD_TOOLCHAIN');
  return rows[0];
}

function observeRegularFile(locator, expectedByteLength, code = 'SOURCE_ORIGIN_GIT_EXECUTABLE') {
  if (typeof locator !== 'string' || !path.isAbsolute(locator) || path.normalize(locator) !== locator || locator.includes('\0')) refuse(code);
  let before;
  let bytes;
  let after;
  try {
    before = lstatSync(locator, { bigint: true });
    if (before.isSymbolicLink() || !before.isFile() || before.size !== BigInt(expectedByteLength) || realpathSync.native(locator) !== locator) refuse(code);
    const descriptor = openSync(locator, 'r');
    try { bytes = readFileSync(descriptor); } finally { closeSync(descriptor); }
    after = lstatSync(locator, { bigint: true });
  } catch (error) {
    if (error instanceof SourceOriginCaptureRefusal) throw error;
    refuse(code);
  }
  if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || bytes.length !== expectedByteLength) refuse(code);
  return Object.freeze({ locator, byteLength: bytes.length, rawSha256: sha256Raw(bytes), stat: after });
}

function authenticateGitExecutable(locator, hostPin) {
  const observed = observeRegularFile(locator, hostPin.gitIdentity.executableByteLength);
  if (observed.rawSha256 !== hostPin.gitIdentity.executableRawSha256) refuse('SOURCE_ORIGIN_GIT_EXECUTABLE');
  return observed;
}

function buildEnvironment(policy) {
  if (platform() === 'win32') {
    const systemRoot = process.env.SystemRoot;
    if (typeof systemRoot !== 'string' || systemRoot.length === 0 || systemRoot.includes('\0') || !path.isAbsolute(systemRoot)) refuse('SOURCE_ORIGIN_GIT_ENVIRONMENT');
    let details;
    try { details = statSync(systemRoot); } catch { refuse('SOURCE_ORIGIN_GIT_ENVIRONMENT'); }
    const parentEnvironment = Object.create(null);
    parentEnvironment.SystemRoot = systemRoot;
    try {
      return buildGitEnvironment(policy, {
        architecture: arch(),
        parentEnvironment,
        platform: platform(),
        systemRootDirectoryObservation: { exists: true, kind: details.isDirectory() ? 'DIRECTORY' : 'OTHER', locator: systemRoot },
      });
    } catch { refuse('SOURCE_ORIGIN_GIT_ENVIRONMENT'); }
  }
  try {
    return buildGitEnvironment(policy, {
      architecture: arch(),
      parentEnvironment: Object.create(null),
      platform: platform(),
      systemRootDirectoryObservation: null,
    });
  } catch { refuse('SOURCE_ORIGIN_GIT_ENVIRONMENT'); }
}

function substituteArguments(values, substitutions, repositoryRoot = REPOSITORY_ROOT) {
  return values.map((value) => {
    if (value === '<REPOSITORY_ROOT>') return repositoryRoot;
    if (value === 'core.worktree=<REPOSITORY_ROOT>') return `core.worktree=${repositoryRoot}`;
    if (value === '<BLOB_OID>') {
      if (!HEX_OID.test(substitutions.blobOid ?? '')) refuse('SOURCE_ORIGIN_GIT_PROCESS');
      return substitutions.blobOid;
    }
    if (value === '<TREE_OID>') {
      if (!HEX_OID.test(substitutions.treeOid ?? '')) refuse('SOURCE_ORIGIN_GIT_PROCESS');
      return substitutions.treeOid;
    }
    if (value.includes('<')) refuse('SOURCE_ORIGIN_GIT_PROCESS');
    return value;
  });
}

export function materializeGitCommand(processPolicy, commandId, repositoryRoot, substitutions = {}, blobClass) {
  if (typeof repositoryRoot !== 'string' || !path.isAbsolute(repositoryRoot) || path.normalize(repositoryRoot) !== repositoryRoot || repositoryRoot.includes('\0')) refuse('SOURCE_ORIGIN_GIT_PROCESS');
  let selected;
  try { selected = selectGitCommandClass(processPolicy, commandId, commandId === 'BLOB' ? { operationClass: blobClass } : undefined); } catch { refuse('SOURCE_ORIGIN_GIT_PROCESS'); }
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
  try { child.kill('SIGKILL'); } catch { /* fail path */ }
}

export function exceedsChildOutputLimit(stdoutBytes, stderrBytes, commandMaximumBytes, processOutputBytes) {
  if (![stdoutBytes, stderrBytes, commandMaximumBytes, processOutputBytes].every((value) => Number.isSafeInteger(value) && value >= 0)) refuse('SOURCE_ORIGIN_LIMIT');
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
      reject(new SourceOriginCaptureRefusal(code));
    };
    const remaining = deadline - Date.now();
    if (remaining <= 0) return fail('SOURCE_ORIGIN_GIT_PROCESS');
    timer = setTimeout(() => fail('SOURCE_ORIGIN_GIT_PROCESS'), remaining);
    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (exceedsChildOutputLimit(stdoutBytes, stderrBytes, maximumBytes, processOutputBytes)) fail('SOURCE_ORIGIN_LIMIT');
      else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on('data', (chunk) => {
      stderrBytes += chunk.length;
      if (exceedsChildOutputLimit(stdoutBytes, stderrBytes, maximumBytes, processOutputBytes)) fail('SOURCE_ORIGIN_LIMIT');
      else stderr.push(Buffer.from(chunk));
    });
    child.on('error', () => fail('SOURCE_ORIGIN_GIT_PROCESS'));
    child.on('close', (status, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const stderrBuffer = Buffer.concat(stderr);
      if (status !== 0 || signal !== null || stderrBuffer.length !== 0) reject(new SourceOriginCaptureRefusal('SOURCE_ORIGIN_GIT_PROCESS'));
      else resolve(Buffer.concat(stdout));
    });
  });
}

function hasUtf8Bom(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}

export function decodeGitLine(bytes, code = 'SOURCE_ORIGIN_GIT_PROCESS') {
  if (!Buffer.isBuffer(bytes) || isProxy(bytes) || hasUtf8Bom(bytes)) refuse(code);
  let value;
  try {
    value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
  if (!value.endsWith('\n')) refuse(code);
  value = value.slice(0, -1);
  if (value.endsWith('\r')) value = value.slice(0, -1);
  if (value.length === 0 || value.includes('\0') || value.includes('\n') || value.includes('\r')) refuse(code);
  return value;
}

function decodeUtf8(bytes, code) {
  if (!Buffer.isBuffer(bytes) || isProxy(bytes) || hasUtf8Bom(bytes)) refuse(code);
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text !== text.normalize('NFC')) refuse(code);
    return text;
  } catch {
    refuse(code);
  }
}

function configAssignmentRows(processPolicy, repositoryRoot) {
  const rows = [];
  for (let index = 0; index < processPolicy.fixedPrefix.length; index += 1) {
    if (processPolicy.fixedPrefix[index] !== '-c') continue;
    const assignment = processPolicy.fixedPrefix[index + 1].replace('<REPOSITORY_ROOT>', repositoryRoot);
    const split = assignment.indexOf('=');
    if (split <= 0) refuse('SOURCE_ORIGIN_GIT_CONFIG');
    rows.push({ key: assignment.slice(0, split), value: assignment.slice(split + 1) });
  }
  return rows.sort((left, right) => codeUnitCompare(`${left.key}\0${left.value}`, `${right.key}\0${right.value}`));
}

function allowanceMatches(key, row) {
  if (!row.keyRule.includes('<SUBSECTION>')) return key === row.keyRule;
  const [prefix, suffix] = row.keyRule.split('<SUBSECTION>');
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false;
  const subsection = key.slice(prefix.length, key.length - suffix.length);
  return subsection.length > 0 && subsection === subsection.normalize('NFC') && !CONTROL.test(subsection);
}

function allowanceValueMatches(value, rule) {
  if (rule === 'BOOL') return value === 'true' || value === 'false';
  if (rule === 'BOOL_OR_ALWAYS') return value === 'true' || value === 'false' || value === 'always';
  if (rule === 'FALSE') return value === 'false';
  if (rule === 'TRUE') return value === 'true';
  if (rule === 'ZERO') return value === '0';
  if (rule === 'DOT') return value === '.';
  if (rule === 'NONEMPTY_TEXT') return value.length > 0 && value === value.normalize('NFC') && !CONTROL.test(value);
  return false;
}

export function parseGitConfigRows(bytes, processPolicyValue, repositoryRoot) {
  let processPolicy;
  try { processPolicy = validateGitProcessPolicy(processPolicyValue); } catch { refuse('SOURCE_ORIGIN_GIT_CONFIG'); }
  if (typeof repositoryRoot !== 'string' || !path.isAbsolute(repositoryRoot) || repositoryRoot.includes('\0')) refuse('SOURCE_ORIGIN_GIT_CONFIG');
  const text = decodeUtf8(bytes, 'SOURCE_ORIGIN_GIT_CONFIG');
  if (!text.endsWith('\0')) refuse('SOURCE_ORIGIN_GIT_CONFIG');
  const fields = text.slice(0, -1).split('\0');
  if (fields.length === 0 || fields.length % 3 !== 0) refuse('SOURCE_ORIGIN_GIT_CONFIG');
  const commandRows = [];
  const localRows = [];
  for (let index = 0; index < fields.length; index += 3) {
    const [scope, origin, assignment] = fields.slice(index, index + 3);
    const newline = assignment.indexOf('\n');
    if ((scope !== 'command' && scope !== 'local') || !origin || CONTROL.test(origin) || origin !== origin.normalize('NFC') ||
        newline <= 0 || assignment.indexOf('\n', newline + 1) !== -1) refuse('SOURCE_ORIGIN_GIT_CONFIG');
    const key = assignment.slice(0, newline);
    const value = assignment.slice(newline + 1);
    if (!key || key !== key.normalize('NFC') || CONTROL.test(key)) refuse('SOURCE_ORIGIN_GIT_CONFIG');
    (scope === 'command' ? commandRows : localRows).push({ key, value });
  }
  commandRows.sort((left, right) => codeUnitCompare(`${left.key}\0${left.value}`, `${right.key}\0${right.value}`));
  if (canonicalJsonText(commandRows) !== canonicalJsonText(configAssignmentRows(processPolicy, repositoryRoot))) refuse('SOURCE_ORIGIN_GIT_CONFIG');
  const normalized = [];
  const seen = new Map();
  for (const row of localRows) {
    const matches = processPolicy.configAllowanceRows.filter((allowance) => allowanceMatches(row.key, allowance));
    if (matches.length !== 1 || !allowanceValueMatches(row.value, matches[0].valueRule)) refuse('SOURCE_ORIGIN_GIT_CONFIG');
    const allowance = matches[0];
    const prior = seen.get(row.key) ?? [];
    if (allowance.cardinality === 'SINGLETON' ? prior.length !== 0 : prior.includes(row.value)) refuse('SOURCE_ORIGIN_GIT_CONFIG');
    prior.push(row.value);
    seen.set(row.key, prior);
    normalized.push({ scope: 'local', key: row.key, value: row.value });
  }
  normalized.sort((left, right) => codeUnitCompare(`${left.key}\0${left.value}`, `${right.key}\0${right.value}`));
  return Object.freeze({
    commandRowCount: commandRows.length,
    localRowCount: normalized.length,
    semanticDigest: sha256Canonical('galerina.logic-aig-local-git-config.v1', normalized),
  });
}

function oidPattern(objectFormat) {
  const pattern = OID_PATTERNS[objectFormat];
  if (!pattern) refuse('SOURCE_ORIGIN_GIT_OBJECT_FORMAT');
  return pattern;
}

export function parseGitTreeRows(bytes, objectFormat) {
  if (bytes.length === 0 || bytes.at(-1) !== 0) refuse('SOURCE_ORIGIN_GIT_TREE');
  const pattern = oidPattern(objectFormat);
  const rows = [];
  const paths = new Set();
  const foldedPaths = new Set();
  for (const record of decodeUtf8(bytes.subarray(0, -1), 'SOURCE_ORIGIN_GIT_TREE').split('\0')) {
    const match = /^(\d{6}) (blob|tree|commit) ([0-9a-f]+)\t([\s\S]+)$/.exec(record);
    if (!match) refuse('SOURCE_ORIGIN_GIT_TREE');
    const [, mode, type, blobOid, path] = match;
    validatePath(path);
    if (!pattern.test(blobOid)) refuse('SOURCE_ORIGIN_GIT_OBJECT_FORMAT');
    if (mode !== '100644' && mode !== '100755' || type !== 'blob') refuse('SOURCE_ORIGIN_GIT_MODE');
    const folded = path.toLowerCase();
    if (paths.has(path)) refuse('SOURCE_ORIGIN_GIT_DUPLICATE');
    if (foldedPaths.has(folded)) refuse('SOURCE_ORIGIN_GIT_CASE_SHADOW');
    paths.add(path);
    foldedPaths.add(folded);
    rows.push(Object.freeze({ path, mode, blobOid }));
  }
  return Object.freeze(rows);
}

function parseStageRows(bytes, objectFormat) {
  if (bytes.length !== 0 && bytes.at(-1) !== 0) refuse('SOURCE_ORIGIN_GIT_INDEX');
  const pattern = oidPattern(objectFormat);
  const rows = [];
  const stageKeys = new Set();
  const records = bytes.length === 0 ? [] : decodeUtf8(bytes.subarray(0, -1), 'SOURCE_ORIGIN_GIT_INDEX').split('\0');
  for (const record of records) {
    const match = /^(\d{6}) ([0-9a-f]+) ([0-3])\t([\s\S]+)$/.exec(record);
    if (!match) refuse('SOURCE_ORIGIN_GIT_INDEX');
    const [, mode, blobOid, stageText, path] = match;
    validatePath(path);
    if (!pattern.test(blobOid)) refuse('SOURCE_ORIGIN_GIT_OBJECT_FORMAT');
    const stage = Number(stageText);
    const key = `${path}\0${stage}`;
    if (stageKeys.has(key)) refuse('SOURCE_ORIGIN_GIT_INDEX');
    stageKeys.add(key);
    rows.push({ path, mode, blobOid, stage });
  }
  return rows;
}

function parseFlagRows(bytes) {
  if (bytes.length !== 0 && bytes.at(-1) !== 0) refuse('SOURCE_ORIGIN_GIT_INDEX');
  const flags = new Map();
  const records = bytes.length === 0 ? [] : decodeUtf8(bytes.subarray(0, -1), 'SOURCE_ORIGIN_GIT_INDEX').split('\0');
  for (const record of records) {
    const match = /^([A-Za-z?]) ([\s\S]+)$/.exec(record);
    if (!match) refuse('SOURCE_ORIGIN_GIT_INDEX');
    const [, tag, path] = match;
    validatePath(path);
    if (flags.has(path)) refuse('SOURCE_ORIGIN_GIT_INDEX');
    flags.set(path, Object.freeze({
      assumeUnchanged: tag === tag.toLowerCase(),
      skipWorktree: tag.toUpperCase() === 'S',
    }));
  }
  return flags;
}

export function observeGitIndex(stageBytes, flagBytes, objectFormat, treeRows) {
  const stages = parseStageRows(stageBytes, objectFormat);
  const flags = parseFlagRows(flagBytes);
  if (stages.some((row) => row.stage !== 0 || row.mode !== '100644' && row.mode !== '100755')) refuse('SOURCE_ORIGIN_GIT_INDEX');
  const rows = stages
    .map((row) => {
      const observedFlags = flags.get(row.path);
      if (!observedFlags || observedFlags.assumeUnchanged || observedFlags.skipWorktree) refuse('SOURCE_ORIGIN_GIT_INDEX');
      return Object.freeze({ ...row, ...observedFlags });
    })
    .sort((left, right) => codeUnitCompare(left.path, right.path));
  if (flags.size !== rows.length || rows.length !== treeRows.length) refuse('SOURCE_ORIGIN_GIT_INDEX');
  const sortedTree = [...treeRows].sort((left, right) => codeUnitCompare(left.path, right.path));
  for (let index = 0; index < rows.length; index += 1) {
    const actual = rows[index];
    const expected = sortedTree[index];
    if (actual.path !== expected.path || actual.mode !== expected.mode || actual.blobOid !== expected.blobOid) refuse('SOURCE_ORIGIN_GIT_INDEX');
  }
  const digestRows = rows.map((row) => ({
    path: row.path,
    mode: row.mode,
    blobOid: row.blobOid,
    stage: row.stage,
    assumeUnchanged: row.assumeUnchanged,
    skipWorktree: row.skipWorktree,
  }));
  return Object.freeze({
    rows: Object.freeze(digestRows.map(Object.freeze)),
    indexDigest: sha256Canonical('galerina.logic-aig-git-index.v1', { objectFormat, rows: digestRows }),
  });
}

export function canonicalExistingPath(locator, kind, code = 'SOURCE_ORIGIN_GIT_LAYOUT') {
  if (typeof locator !== 'string' || !path.isAbsolute(locator) || locator.includes('\0')) refuse(code);
  let observed;
  let real;
  try {
    observed = lstatSync(locator);
    real = realpathSync.native(locator);
  } catch { refuse(code); }
  if (observed.isSymbolicLink() || (kind === 'DIRECTORY' ? !observed.isDirectory() : !observed.isFile())) refuse(code);
  const canonicalText = platform() === 'win32' ? real.replaceAll('\\', '/') : real;
  if (locator !== canonicalText) refuse(code);
  return real;
}

export function assertCanonicalRepositoryLayout(value) {
  exactObject(value, ['repositoryRoot', 'toplevel', 'gitDirectory', 'indexPath'], 'SOURCE_ORIGIN_GIT_LAYOUT');
  let repositoryRoot;
  try {
    const details = lstatSync(value.repositoryRoot);
    repositoryRoot = realpathSync.native(value.repositoryRoot);
    if (details.isSymbolicLink() || !details.isDirectory() || repositoryRoot !== value.repositoryRoot) refuse('SOURCE_ORIGIN_GIT_LAYOUT');
  } catch (error) {
    if (error instanceof SourceOriginCaptureRefusal) throw error;
    refuse('SOURCE_ORIGIN_GIT_LAYOUT');
  }
  const toplevel = canonicalExistingPath(value.toplevel, 'DIRECTORY');
  const gitDirectory = canonicalExistingPath(value.gitDirectory, 'DIRECTORY');
  const indexPath = canonicalExistingPath(value.indexPath, 'FILE');
  if (toplevel !== repositoryRoot || indexPath !== path.join(gitDirectory, 'index')) refuse('SOURCE_ORIGIN_GIT_LAYOUT');
  return Object.freeze({ repositoryRoot, gitDirectory, indexPath });
}

function commonGitDirectory(gitDirectory) {
  return path.basename(path.dirname(gitDirectory)).toLowerCase() === 'worktrees'
    ? path.dirname(path.dirname(gitDirectory))
    : gitDirectory;
}

function alternateExpectation(gitDirectory, kind) {
  return path.join(commonGitDirectory(gitDirectory), 'objects', 'info', kind);
}

function observeAlternateFile(locator, expected) {
  if (typeof locator !== 'string' || locator.includes('\0') || !path.isAbsolute(locator)) refuse('SOURCE_ORIGIN_GIT_ALTERNATES');
  let canonicalExpected;
  try {
    const parent = realpathSync.native(path.dirname(expected));
    canonicalExpected = path.join(parent, path.basename(expected));
  } catch { refuse('SOURCE_ORIGIN_GIT_ALTERNATES'); }
  const canonicalText = platform() === 'win32' ? canonicalExpected.replaceAll('\\', '/') : canonicalExpected;
  if (locator !== canonicalText) refuse('SOURCE_ORIGIN_GIT_ALTERNATES');
  try {
    const observed = lstatSync(canonicalExpected);
    if (observed.isSymbolicLink() || !observed.isFile() || observed.size !== 0 || realpathSync.native(canonicalExpected) !== canonicalExpected) refuse('SOURCE_ORIGIN_GIT_ALTERNATES');
    return 'ZERO_REGULAR_FILE';
  } catch (error) {
    if (error instanceof SourceOriginCaptureRefusal) throw error;
    if (error?.code !== 'ENOENT') refuse('SOURCE_ORIGIN_GIT_ALTERNATES');
    return 'ABSENT';
  }
}

async function repositoryState(run) {
  const layout = assertCanonicalRepositoryLayout({
    repositoryRoot: REPOSITORY_ROOT,
    toplevel: await run('TOPLEVEL'),
    gitDirectory: await run('GIT_DIR'),
    indexPath: await run('INDEX_PATH'),
  });
  const alternates = observeAlternateFile(await run('ALTERNATES'), alternateExpectation(layout.gitDirectory, 'alternates'));
  const httpAlternates = observeAlternateFile(await run('HTTP_ALTERNATES'), alternateExpectation(layout.gitDirectory, 'http-alternates'));
  const objectFormat = await run('OBJECT_FORMAT');
  const pattern = oidPattern(objectFormat);
  const head = await run('HEAD');
  const tree = await run('TREE');
  if (!pattern.test(head) || !pattern.test(tree)) refuse('SOURCE_ORIGIN_GIT_OBJECT_FORMAT');
  const treeRows = parseGitTreeRows(await run('TREE_ROWS', { treeOid: tree }), objectFormat);
  const index = observeGitIndex(await run('INDEX_STAGE'), await run('INDEX_FLAGS'), objectFormat, treeRows);
  return Object.freeze({ ...layout, alternates, httpAlternates, objectFormat, head, tree, treeRows, index });
}

function closureView(state, configDigest, ownerSetDigest) {
  return Object.freeze({
    repositoryRoot: state.repositoryRoot,
    gitDirectory: state.gitDirectory,
    indexPath: state.indexPath,
    alternates: state.alternates,
    httpAlternates: state.httpAlternates,
    objectFormat: state.objectFormat,
    commitOid: state.head,
    treeOid: state.tree,
    treeDigest: sha256Canonical('galerina.logic-aig-git-tree.v1', state.treeRows),
    indexDigest: state.index.indexDigest,
    configDigest,
    ownerSetDigest,
  });
}

export function assertFrozenSourceClosure(opening, closing) {
  if (opening === null || typeof opening !== 'object' || isProxy(opening) || closing === null || typeof closing !== 'object' || isProxy(closing) ||
      canonicalJsonText(opening) !== canonicalJsonText(closing)) refuse('SOURCE_ORIGIN_GIT_DRIFT');
}

async function readBlob(run, oid, operationClass = 'CAPTURED_FILE') {
  const bytes = await run('BLOB', { blobOid: oid }, operationClass);
  return Buffer.from(bytes);
}

function regularTreeRow(treeByPath, locator, code = 'SOURCE_ORIGIN_GIT_POLICY') {
  const row = treeByPath.get(locator);
  if (!row || (row.mode !== '100644' && row.mode !== '100755')) refuse(code);
  return row;
}

async function heldBlob(run, treeByPath, locator, operationClass = 'JSON', code = 'SOURCE_ORIGIN_GIT_POLICY') {
  const row = regularTreeRow(treeByPath, locator, code);
  const bytes = await readBlob(run, row.blobOid, operationClass);
  return Object.freeze({ locator, blobOid: row.blobOid, bytes, byteLength: bytes.length, rawSha256: sha256Raw(bytes) });
}

function classifyResolutionPath(path, policy) {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (policy.resolutionBasenames.includes(name)) return true;
  return policy.resolutionNamePatterns.some((source) => new RegExp(source).test(name));
}

function addAggregate(total, increment, maximum) {
  if (!Number.isSafeInteger(increment) || increment < 0 || total > maximum - increment) refuse('SOURCE_ORIGIN_LIMIT');
  return total + increment;
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || ArrayBuffer.isView(value) || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

class DefensiveBlobMap extends Map {
  #held;

  constructor(entries) {
    super();
    this.#held = new Map(entries.map(([key, bytes]) => [key, Buffer.from(bytes)]));
    Object.freeze(this);
  }

  set() { throw new TypeError('immutable blob map'); }
  delete() { throw new TypeError('immutable blob map'); }
  clear() { throw new TypeError('immutable blob map'); }

  get size() { return this.#held.size; }

  has(key) { return this.#held.has(key); }

  get(key) {
    const bytes = this.#held.get(key);
    return bytes === undefined ? undefined : Buffer.from(bytes);
  }

  *entries() {
    for (const [key, bytes] of this.#held) yield [key, Buffer.from(bytes)];
  }

  *keys() {
    for (const key of this.#held.keys()) yield key;
  }

  *values() {
    for (const [, bytes] of this.entries()) yield bytes;
  }

  [Symbol.iterator]() { return this.entries(); }

  forEach(callback, thisArg) {
    for (const [key, bytes] of this.entries()) callback.call(thisArg, bytes, key, this);
  }
}

function closedArrayValues(value, code) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== value.length + 1 || !names.includes('length')) refuse(code);
  const output = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
    output.push(descriptor.value);
  }
  return output;
}

function exactBuffer(value, code) {
  if (
    isProxy(value)
    || !Buffer.isBuffer(value)
    || Object.getPrototypeOf(value) !== Buffer.prototype
    || value.buffer instanceof SharedArrayBuffer
  ) refuse(code);
  return Buffer.from(value);
}

export function admitFrozenBlobSet(rowsValue, blobs, options) {
  const code = 'SOURCE_ORIGIN_GIT_BLOB_SET';
  exactObject(options, ['label'], code);
  if (options.label !== 'SOURCE_MANIFEST' && options.label !== 'RESOLUTION_INPUTS' && options.label !== 'OWNER_SET') refuse(code);
  const rows = closedArrayValues(rowsValue, code);
  const byPath = new Map();
  for (const row of rows) {
    if (isProxy(row) || row === null || typeof row !== 'object') refuse(code);
    const keys = Object.getOwnPropertyNames(row ?? {}).sort(codeUnitCompare);
    const short = ['byteLength','path','rawSha256'];
    const full = ['blobOid','byteLength','mode','objectFormat','path','rawSha256'];
    const expected = keys.length === short.length ? short : full;
    exactObject(row, expected, code);
    validatePath(row.path);
    if (!Number.isSafeInteger(row.byteLength) || row.byteLength < 0 || row.byteLength > SOURCE_ORIGIN_LIMITS.capturedFileBytes || typeof row.rawSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.rawSha256) || byPath.has(row.path)) refuse(code);
    if (expected === full && (
      row.mode !== '100644' && row.mode !== '100755'
      || row.objectFormat !== 'sha1' && row.objectFormat !== 'sha256'
      || typeof row.blobOid !== 'string'
      || !(row.objectFormat === 'sha1' ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{64}$/).test(row.blobOid)
    )) refuse(code);
    byPath.set(row.path, row);
  }
  if (isProxy(blobs) || blobs === null || typeof blobs !== 'object') refuse(code);
  const prototype = Object.getPrototypeOf(blobs);
  let entries;
  if (prototype === Map.prototype) entries = [...Map.prototype.entries.call(blobs)];
  else if (prototype === DefensiveBlobMap.prototype) entries = [...blobs.entries()];
  else refuse(code);
  if (entries.length !== rows.length) refuse(code);
  const captured = new Map();
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) refuse(code);
    const [locator, value] = entry;
    const row = byPath.get(locator);
    if (!row || captured.has(locator)) refuse(code);
    const bytes = exactBuffer(value, code);
    if (bytes.length !== row.byteLength || sha256Raw(bytes) !== row.rawSha256) refuse(code);
    if (Object.hasOwn(row, 'blobOid')) {
      const blobOid = createHash(row.objectFormat)
        .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
        .update(bytes)
        .digest('hex');
      if (blobOid !== row.blobOid) refuse(code);
    }
    captured.set(locator, bytes);
  }
  const ordered = rows.map((row) => {
    const bytes = captured.get(row.path);
    if (bytes === undefined) refuse(code);
    return [row.path, bytes];
  });
  return new DefensiveBlobMap(ordered);
}

async function buildManifests({ run, frozen, treeRows, treeByPath, repositoryIdentity, sourcePolicy, resolutionPolicy, resolutionOwnerPaths, limits }) {
  const sourceRows = [];
  const resolutionRows = [];
  const sourceEntries = [];
  const resolutionEntries = [];
  let sourceBytes = 0;
  let resolutionBytes = 0;

  for (const treeRow of treeRows) {
    const sourceDomain = classifySourcePath(treeRow.path, sourcePolicy);
    const isResolution = classifyResolutionPath(treeRow.path, resolutionPolicy) || resolutionOwnerPaths.has(treeRow.path);
    if (!sourceDomain && !isResolution) continue;
    const bytes = await readBlob(run, treeRow.blobOid, 'CAPTURED_FILE');
    const row = Object.freeze({
      path: treeRow.path,
      mode: treeRow.mode,
      blobOid: treeRow.blobOid,
      objectFormat: frozen.objectFormat,
      byteLength: bytes.length,
      rawSha256: sha256Raw(bytes),
    });
    if (sourceDomain) {
      if (sourceRows.length >= limits.sourceFiles) refuse('SOURCE_ORIGIN_LIMIT');
      sourceBytes = addAggregate(sourceBytes, bytes.length, limits.sourceBytes);
      sourceRows.push(row);
      sourceEntries.push([row.path, bytes]);
    }
    if (isResolution) {
      if (resolutionRows.length >= limits.resolutionFiles) refuse('SOURCE_ORIGIN_LIMIT');
      resolutionBytes = addAggregate(resolutionBytes, bytes.length, limits.resolutionBytes);
      resolutionRows.push(row);
      resolutionEntries.push([row.path, bytes]);
    }
  }

  sourceRows.sort((left, right) => codeUnitCompare(left.path, right.path));
  resolutionRows.sort((left, right) => codeUnitCompare(left.path, right.path));
  sourceEntries.sort((left, right) => codeUnitCompare(left[0], right[0]));
  resolutionEntries.sort((left, right) => codeUnitCompare(left[0], right[0]));
  for (const ownerPath of resolutionOwnerPaths) if (!treeByPath.has(ownerPath) || !resolutionRows.some((row) => row.path === ownerPath)) refuse('SOURCE_ORIGIN_GIT_EXPECTED_OUTCOMES');

  const repositoryId = `repository:${repositoryIdentity.identityDigest}`;
  const exclusionDigest = sha256Canonical('galerina.logic-aig-exclusions.v1', sourcePolicy.exclusions);
  const sourceBody = {
    schema: 'galerina.logic-aig-source-manifest.v1',
    repositoryId,
    expectedHead: frozen.head,
    expectedTree: frozen.tree,
    objectFormat: frozen.objectFormat,
    policyDigest: sourcePolicy.policyDigest,
    exclusionDigest,
    rows: sourceRows,
    counts: {
      paths: sourceRows.length,
      blobs: new Set(sourceRows.map((row) => row.blobOid)).size,
      bytes: sourceBytes,
      mode100644: sourceRows.filter((row) => row.mode === '100644').length,
      mode100755: sourceRows.filter((row) => row.mode === '100755').length,
      exclusions: 0,
    },
    authorizing: false,
  };
  const sourceManifest = {
    ...sourceBody,
    manifestDigest: sha256Canonical(sourceBody.schema, sourceBody),
  };
  const resolutionBody = {
    schema: 'galerina.logic-aig-resolution-inputs.v1',
    repositoryId,
    expectedHead: frozen.head,
    expectedTree: frozen.tree,
    policyDigest: resolutionPolicy.policyDigest,
    rows: resolutionRows,
    authorizing: false,
  };
  const resolutionInputs = {
    ...resolutionBody,
    resolutionInputsDigest: sha256Canonical(resolutionBody.schema, resolutionBody),
  };
  return {
    sourceManifest: deepFreeze(sourceManifest),
    sourceBlobs: new DefensiveBlobMap(sourceEntries),
    resolutionInputs: deepFreeze(resolutionInputs),
    resolutionBlobs: new DefensiveBlobMap(resolutionEntries),
  };
}

function assertNoDuplicateJsonMembers(text, code) {
  const scopes = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === '"') {
      const start = index++;
      while (index < text.length) {
        if (text[index] === '\\') index += 2;
        else if (text[index++] === '"') break;
      }
      let cursor = index;
      while (/\s/u.test(text[cursor] ?? '')) cursor += 1;
      if (text[cursor] === ':' && scopes.length > 0) {
        let key;
        try { key = JSON.parse(text.slice(start, index)); } catch { refuse(code); }
        const scope = scopes.at(-1);
        if (scope.has(key)) refuse(code);
        scope.add(key);
      }
      continue;
    }
    if (character === '{') scopes.push(new Set());
    else if (character === '}') {
      if (scopes.length === 0) refuse(code);
      scopes.pop();
    }
    index += 1;
  }
  if (scopes.length !== 0) refuse(code);
}

export function authenticateGateOwnerBytes(bytes, parserPolicy) {
  const text = decodeUtf8(bytes, 'SOURCE_ORIGIN_GIT_POLICY');
  if (!text.endsWith('\n') || text.endsWith('\n\n') || text.endsWith('\r\n')) refuse('SOURCE_ORIGIN_GIT_POLICY');
  assertNoDuplicateJsonMembers(text, 'SOURCE_ORIGIN_GIT_POLICY');
  let value;
  try { value = JSON.parse(text); } catch { refuse('SOURCE_ORIGIN_GIT_POLICY'); }
  if (value === null || typeof value !== 'object' || Array.isArray(value) || isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse('SOURCE_ORIGIN_GIT_POLICY');
  const pattern = new RegExp(parserPolicy.diagnosticCodePattern, 'u');
  for (const key of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !key || key !== key.normalize('NFC') || CONTROL.test(key)) refuse('SOURCE_ORIGIN_GIT_POLICY');
    const row = descriptor.value;
    exactObject(row, ['ok', 'codes'], 'SOURCE_ORIGIN_GIT_POLICY');
    if (typeof row.ok !== 'boolean' || !Array.isArray(row.codes) || isProxy(row.codes) || Object.getPrototypeOf(row.codes) !== Array.prototype) refuse('SOURCE_ORIGIN_GIT_POLICY');
    const codes = [...row.codes];
    if (codes.some((code) => typeof code !== 'string' || !pattern.test(code)) ||
        canonicalJsonText(codes) !== canonicalJsonText([...new Set(codes)].sort(codeUnitCompare)) ||
        (!row.ok && codes.length === 0)) refuse('SOURCE_ORIGIN_GIT_POLICY');
  }
  const rawSha256 = sha256Raw(bytes);
  const semanticDigest = sha256Canonical('galerina.logic-aig-gate-v3-reference-verdicts.v1', value);
  if (bytes.length !== OWNER_IDENTITIES.gate.byteLength || rawSha256 !== OWNER_IDENTITIES.gate.rawSha256 ||
      semanticDigest !== OWNER_IDENTITIES.gate.semanticDigest) refuse('SOURCE_ORIGIN_GIT_POLICY');
  return Object.freeze({ value: deepFreeze(value), byteLength: bytes.length, rawSha256, semanticDigest });
}

function semanticOwner(blob, validate, digestField, options) {
  let value;
  try { value = validate(parseCanonicalJsonBytes(blob.bytes, { label: blob.locator }), options); } catch { refuse('SOURCE_ORIGIN_GIT_POLICY'); }
  return Object.freeze({ ...blob, value, semanticDigest: value[digestField] });
}

async function readHeldOwners(run, state) {
  const treeByPath = new Map(state.treeRows.map((row) => [row.path, row]));
  const blobs = {};
  for (const [name, locator] of Object.entries(POLICY_PATHS)) blobs[name] = await heldBlob(run, treeByPath, locator);
  const pins = semanticOwner(blobs.toolchainPins, validateToolchainPins, 'pinsDigest');
  const parser = semanticOwner(blobs.parser, validateParserPolicy, 'policyDigest');
  const proposedBaseline = semanticOwner(blobs.proposedBaseline, validateProposedBaseline, 'policyDigest');
  const expectedOutcomes = semanticOwner(blobs.expectedOutcomes, validateExpectedParseOutcomes, 'expectedOutcomesDigest', { parserPolicy: parser.value });
  const generated = semanticOwner(blobs.generated, validateGeneratedConsumerPolicy, 'policyDigest');
  const repositoryIdentity = semanticOwner(blobs.repositoryIdentity, validateRepositoryIdentity, 'identityDigest');
  const resolution = semanticOwner(blobs.resolution, validateResolutionPolicy, 'policyDigest');
  const source = semanticOwner(blobs.source, validateSourcePolicy, 'policyDigest');
  const gateParsed = authenticateGateOwnerBytes(blobs.gate.bytes, parser.value);
  const gate = Object.freeze({ ...blobs.gate, value: gateParsed.value, semanticDigest: gateParsed.semanticDigest });
  const bindings = {
    sourcePolicyDigest: source.value.policyDigest,
    exclusionDigest: sha256Canonical('galerina.logic-aig-exclusions.v1', source.value.exclusions),
    resolutionPolicyDigest: resolution.value.policyDigest,
    parserPolicyDigest: parser.value.policyDigest,
    generatedConsumerPolicyDigest: generated.value.policyDigest,
    repositoryIdentityDigest: repositoryIdentity.value.identityDigest,
    toolchainPinsDigest: pins.value.pinsDigest,
    expectedOutcomesDigest: expectedOutcomes.value.expectedOutcomesDigest,
    proposedBaselineDigest: proposedBaseline.value.policyDigest,
  };
  const exporter = semanticOwner(blobs.exporter, (value) => validateExporterPolicy(value, bindings), 'policyDigest');
  const owners = { pins, proposedBaseline, expectedOutcomes, exporter, generated, parser, repositoryIdentity, resolution, source, gate };
  const identities = Object.values(owners).map((owner) => ({
    locator: owner.locator,
    blobOid: owner.blobOid,
    byteLength: owner.byteLength,
    rawSha256: owner.rawSha256,
    semanticDigest: owner.semanticDigest,
  })).sort((left, right) => codeUnitCompare(left.locator, right.locator));
  return Object.freeze({ ...owners, identities: deepFreeze(identities), ownerSetDigest: sha256Canonical('galerina.logic-aig-frozen-owner-set.v1', identities) });
}

function capturedOwnerSnapshot(held) {
  const ownerNames = [
    'expectedOutcomes', 'exporter', 'gate', 'generated', 'parser', 'pins',
    'proposedBaseline', 'repositoryIdentity', 'resolution', 'source',
  ];
  const values = {};
  const entries = [];
  for (const name of ownerNames) {
    const owner = held[name];
    if (!owner || !Buffer.isBuffer(owner.bytes)) refuse('SOURCE_ORIGIN_GIT_POLICY');
    values[name] = owner.value;
    entries.push([owner.locator, owner.bytes]);
  }
  entries.sort((left, right) => codeUnitCompare(left[0], right[0]));
  const owners = deepFreeze({
    values,
    identities: held.identities,
    ownerSetDigest: held.ownerSetDigest,
    authorizing: false,
  });
  const rows = held.identities.map((row) => ({
    path: row.locator,
    byteLength: row.byteLength,
    rawSha256: row.rawSha256,
  }));
  const ownerBlobs = admitFrozenBlobSet(rows, new Map(entries), { label: 'OWNER_SET' });
  return Object.freeze({ owners, ownerBlobs });
}

function readInstalledWorkingOwners(parserPolicy) {
  const pins = readBoundWorkingOwner(POLICY_PATHS.toolchainPins, OWNER_IDENTITIES.pins, validateToolchainPins, 'pinsDigest');
  const proposedBaseline = readBoundWorkingOwner(POLICY_PATHS.proposedBaseline, OWNER_IDENTITIES.proposedBaseline, validateProposedBaseline, 'policyDigest');
  const expectedOutcomes = readBoundWorkingOwner(
    POLICY_PATHS.expectedOutcomes,
    OWNER_IDENTITIES.expectedOutcomes,
    (value) => validateExpectedParseOutcomes(value, { parserPolicy }),
    'expectedOutcomesDigest',
  );
  const exporter = readBoundWorkingOwner(
    POLICY_PATHS.exporter,
    OWNER_IDENTITIES.exporter,
    (value) => validateExporterPolicy(value, exporterBindings(value)),
    'policyDigest',
  );
  return Object.freeze({ pins, proposedBaseline, expectedOutcomes, exporter });
}

function assertHeldWorkingOwners(held, working) {
  for (const name of ['pins', 'proposedBaseline', 'expectedOutcomes', 'exporter']) {
    if (!held[name].bytes.equals(working[name].bytes) || held[name].semanticDigest !== working[name].semanticDigest) refuse('SOURCE_ORIGIN_GIT_POLICY');
  }
}

function sameExecutable(left, right) {
  return left.locator === right.locator && left.byteLength === right.byteLength && left.rawSha256 === right.rawSha256 &&
    left.stat.dev === right.stat.dev && left.stat.ino === right.stat.ino && left.stat.size === right.stat.size && left.stat.mtimeNs === right.stat.mtimeNs;
}

function sameWorkingOwners(left, right) {
  return ['pins', 'proposedBaseline', 'expectedOutcomes', 'exporter'].every((name) =>
    left[name].rawSha256 === right[name].rawSha256 && left[name].semanticDigest === right[name].semanticDigest && left[name].bytes.equals(right[name].bytes));
}

function makeRunner({ executable, environment, policy, deadline }) {
  const trace = [];
  const runCommand = async (commandId, substitutions = {}, blobClass) => {
    const selected = materializeGitCommand(policy.gitProcessPolicy, commandId, REPOSITORY_ROOT, substitutions, blobClass);
    let child;
    try {
      child = spawn(executable, selected.arguments, {
        cwd: REPOSITORY_ROOT,
        env: environment,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch { refuse('SOURCE_ORIGIN_GIT_PROCESS'); }
    const bytes = await collectChild(child, selected.maximumBytes, policy.limits.processOutputBytes, deadline);
    trace.push(commandId);
    return selected.stdoutRule === 'ONE_UTF8_LINE' ? decodeGitLine(bytes) : bytes;
  };
  Object.defineProperty(runCommand, 'trace', { value: trace });
  return runCommand;
}

function assertCommandTrace(trace, processPolicy) {
  const expected = processPolicy.commandRows.map((row) => row.commandId).sort(codeUnitCompare);
  if (!Array.isArray(trace) || trace.length < expected.length + 2 || trace[0] !== 'GIT_VERSION' || trace[1] !== 'CONFIG_ROWS' ||
      trace.at(-2) !== 'CONFIG_ROWS' || trace.at(-1) !== 'GIT_VERSION' ||
      trace.filter((id) => id === 'GIT_VERSION').length !== 2 || trace.filter((id) => id === 'CONFIG_ROWS').length !== 2 ||
      !expected.every((commandId) => trace.includes(commandId)) || trace.some((commandId) => !expected.includes(commandId))) refuse('SOURCE_ORIGIN_GIT_PROCESS');
}

function observationEdge(frozen, executable, version) {
  return Object.freeze({
    head: frozen.head,
    tree: frozen.tree,
    indexDigest: frozen.index.indexDigest,
    gitVersion: version,
    gitExecutableRawSha256: executable.rawSha256,
    gitExecutableByteLength: executable.byteLength,
  });
}

export async function captureFrozenSource(options) {
  const captured = captureOptions(options);
  const bootstrap = readBootstrapOwners();
  const hostPin = selectHostPin(bootstrap.pins.value);
  const executableOpening = authenticateGitExecutable(captured.gitExecutableLocator, hostPin);
  const environment = buildEnvironment(bootstrap.exporter.value.environmentPolicy);
  const deadline = Date.now() + bootstrap.exporter.value.limits.processMillis;
  const run = makeRunner({ executable: captured.gitExecutableLocator, environment, policy: bootstrap.exporter.value, deadline });

  const version = await run('GIT_VERSION');
  if (version !== `git version ${hostPin.gitIdentity.version}`) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  const openingConfig = parseGitConfigRows(await run('CONFIG_ROWS'), bootstrap.exporter.value.gitProcessPolicy, REPOSITORY_ROOT);
  const frozenBefore = await repositoryState(run);
  if (frozenBefore.head !== captured.commitOid) refuse('SOURCE_ORIGIN_GIT_HEAD');
  const heldOpening = await readHeldOwners(run, frozenBefore);
  const workingOpening = readInstalledWorkingOwners(heldOpening.parser.value);
  assertHeldWorkingOwners(heldOpening, workingOpening);
  if (!workingOpening.pins.bytes.equals(bootstrap.pins.bytes) || !workingOpening.exporter.bytes.equals(bootstrap.exporter.bytes)) refuse('SOURCE_ORIGIN_GIT_POLICY');

  const treeByPath = new Map(frozenBefore.treeRows.map((row) => [row.path, row]));
  const ownerManifestKindByKind = new Map(heldOpening.parser.value.ownerManifestBindings.map((binding) => [binding.ownerKind, binding.manifestKind]));
  const resolutionOwnerPaths = new Set(heldOpening.expectedOutcomes.value.rows
    .filter((row) => ownerManifestKindByKind.get(row.ownerKind) === 'RESOLUTION_INPUTS')
    .map((row) => row.ownerLocator));

  const manifests = await buildManifests({
    run,
    frozen: frozenBefore,
    treeRows: frozenBefore.treeRows,
    treeByPath,
    repositoryIdentity: heldOpening.repositoryIdentity.value,
    sourcePolicy: heldOpening.source.value,
    resolutionPolicy: heldOpening.resolution.value,
    resolutionOwnerPaths,
    limits: bootstrap.exporter.value.limits,
  });

  const frozenAfter = await repositoryState(run);
  const heldClosing = await readHeldOwners(run, frozenAfter);
  const closingConfig = parseGitConfigRows(await run('CONFIG_ROWS'), bootstrap.exporter.value.gitProcessPolicy, REPOSITORY_ROOT);
  const workingBeforeVersion = readInstalledWorkingOwners(heldClosing.parser.value);
  assertHeldWorkingOwners(heldClosing, workingBeforeVersion);
  assertFrozenSourceClosure(
    closureView(frozenBefore, openingConfig.semanticDigest, heldOpening.ownerSetDigest),
    closureView(frozenAfter, closingConfig.semanticDigest, heldClosing.ownerSetDigest),
  );
  if (!sameWorkingOwners(workingOpening, workingBeforeVersion)) refuse('SOURCE_ORIGIN_GIT_DRIFT');
  const executableBeforeVersion = authenticateGitExecutable(captured.gitExecutableLocator, hostPin);
  if (!sameExecutable(executableOpening, executableBeforeVersion)) refuse('SOURCE_ORIGIN_GIT_DRIFT');
  const closingVersion = await run('GIT_VERSION');
  if (closingVersion !== version) refuse('SOURCE_ORIGIN_GIT_DRIFT');
  const workingAfterVersion = readInstalledWorkingOwners(heldClosing.parser.value);
  assertHeldWorkingOwners(heldClosing, workingAfterVersion);
  const executableAfterVersion = authenticateGitExecutable(captured.gitExecutableLocator, hostPin);
  if (!sameWorkingOwners(workingOpening, workingAfterVersion) || !sameExecutable(executableOpening, executableAfterVersion)) refuse('SOURCE_ORIGIN_GIT_DRIFT');
  assertCommandTrace(run.trace, bootstrap.exporter.value.gitProcessPolicy);

  const before = observationEdge(frozenBefore, executableOpening, version);
  const after = observationEdge(frozenAfter, executableAfterVersion, closingVersion);
  const observation = Object.freeze({
    before,
    after,
    objectFormat: frozenBefore.objectFormat,
    indexDigest: frozenBefore.index.indexDigest,
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
  });
  const semanticOwners = capturedOwnerSnapshot(heldClosing);
  const sourceBlobs = admitFrozenBlobSet(manifests.sourceManifest.rows, manifests.sourceBlobs, { label: 'SOURCE_MANIFEST' });
  const resolutionBlobs = admitFrozenBlobSet(manifests.resolutionInputs.rows, manifests.resolutionBlobs, { label: 'RESOLUTION_INPUTS' });
  return Object.freeze({
    observation,
    sourceManifest: manifests.sourceManifest,
    sourceBlobs,
    resolutionInputs: manifests.resolutionInputs,
    resolutionBlobs,
    ...semanticOwners,
  });
}
