import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { arch, platform } from 'node:os';
import { spawnSync } from 'node:child_process';
import { isProxy } from 'node:util/types';

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  classifySourcePath,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
  validateRepositoryIdentity,
  validateExpectedParseOutcomes,
  validateParserPolicy,
  validateResolutionPolicy,
  validateSourcePolicy,
  validateToolchainPins,
} from './contract.mjs';

const POLICY_PATHS = Object.freeze({
  repositoryIdentity: 'governance/logic-aig-source-origin-repository-identity.json',
  expectedOutcomes: 'governance/logic-aig-source-origin-expected-parse-outcomes.json',
  parser: 'governance/logic-aig-source-origin-parser-policy.json',
  resolution: 'governance/logic-aig-source-origin-resolution-policy.json',
  source: 'governance/logic-aig-source-origin-source-policy.json',
  toolchainPins: 'governance/logic-aig-source-origin-toolchain-pins.json',
});

const LIMIT_KEYS = Object.freeze(Object.keys(SOURCE_ORIGIN_LIMITS).sort());
const OID_PATTERNS = Object.freeze({
  sha1: /^[0-9a-f]{40}$/,
  sha256: /^[0-9a-f]{64}$/,
});

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
  if (prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const ownNames = Object.getOwnPropertyNames(value);
  for (const name of ownNames) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  const names = ownNames.sort(codeUnitCompare);
  const expected = [...keys].sort(codeUnitCompare);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) refuse(code);
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

function validateLimits(limits) {
  exactObject(limits, LIMIT_KEYS, 'SOURCE_ORIGIN_LIMIT');
  for (const key of LIMIT_KEYS) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value <= 0 || value > SOURCE_ORIGIN_LIMITS[key]) refuse('SOURCE_ORIGIN_LIMIT');
  }
  return Object.freeze({ ...limits });
}

function hardenedEnvironment() {
  const environment = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: platform() === 'win32' ? 'NUL' : '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    GIT_EDITOR: 'false',
    GIT_SEQUENCE_EDITOR: 'false',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_NO_REPLACE_OBJECTS: '1',
    LANG: 'C',
    LC_ALL: 'C',
    TZ: 'UTC',
  };
  if (platform() === 'win32') {
    if (typeof process.env.SystemRoot === 'string') environment.SystemRoot = process.env.SystemRoot;
    if (typeof process.env.WINDIR === 'string') environment.WINDIR = process.env.WINDIR;
    if (typeof process.env.TEMP === 'string') environment.TEMP = process.env.TEMP;
    if (typeof process.env.TMP === 'string') environment.TMP = process.env.TMP;
  }
  return environment;
}

function runGit({ gitExecutable, repositoryRoot, limits, args, input = undefined, outputLimit = limits.processOutputBytes }) {
  const argv = [
    '--no-pager',
    '--no-optional-locks',
    '--no-replace-objects',
    '-c', 'core.fsmonitor=false',
    '-c', 'core.hooksPath=',
    '-c', 'core.attributesFile=',
    '-c', 'diff.external=',
    '-c', 'interactive.diffFilter=',
    '-C', repositoryRoot,
    ...args,
  ];
  const result = spawnSync(gitExecutable, argv, {
    input,
    encoding: null,
    env: hardenedEnvironment(),
    timeout: limits.processMillis,
    maxBuffer: outputLimit + 1,
    windowsHide: true,
    shell: false,
  });
  if (result.error || result.signal || result.status !== 0) refuse('SOURCE_ORIGIN_GIT_PROCESS');
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0);
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0);
  if (stdout.length + stderr.length > outputLimit || stderr.length !== 0) refuse('SOURCE_ORIGIN_GIT_PROCESS');
  return stdout;
}

function decodeLine(bytes, code = 'SOURCE_ORIGIN_GIT_PROCESS') {
  let value;
  try {
    value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
  if (!value.endsWith('\n')) refuse(code);
  value = value.slice(0, -1);
  if (value.endsWith('\r')) value = value.slice(0, -1);
  if (value.length === 0 || value.includes('\n') || value.includes('\r')) refuse(code);
  return value;
}

function decodeUtf8(bytes, code) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
}

function executableIdentity(gitExecutable) {
  if (typeof gitExecutable !== 'string' || !isAbsolute(gitExecutable)) refuse('SOURCE_ORIGIN_GIT_EXECUTABLE');
  let details;
  let bytes;
  try {
    details = statSync(gitExecutable, { bigint: false });
    if (!details.isFile() || !Number.isSafeInteger(details.size) || details.size <= 0 || details.size > SOURCE_ORIGIN_LIMITS.heldFileBytes) refuse('SOURCE_ORIGIN_GIT_EXECUTABLE');
    bytes = readFileSync(gitExecutable);
  } catch {
    refuse('SOURCE_ORIGIN_GIT_EXECUTABLE');
  }
  if (bytes.length !== details.size) refuse('SOURCE_ORIGIN_GIT_DRIFT');
  return Object.freeze({
    executableRawSha256: sha256Raw(bytes),
    executableByteLength: bytes.length,
  });
}

function observeExecutable(context) {
  const identity = executableIdentity(context.gitExecutable);
  const version = decodeLine(runGit({ ...context, args: ['--version'] }));
  return Object.freeze({ version, ...identity });
}

function oidPattern(objectFormat) {
  const pattern = OID_PATTERNS[objectFormat];
  if (!pattern) refuse('SOURCE_ORIGIN_GIT_OBJECT_FORMAT');
  return pattern;
}

function parseTree(bytes, objectFormat) {
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

function observeIndex(context, objectFormat, treeRows) {
  const stages = parseStageRows(
    runGit({ ...context, args: ['ls-files', '--stage', '--sparse', '-z'] }),
    objectFormat,
  );
  const flags = parseFlagRows(runGit({ ...context, args: ['ls-files', '-v', '--sparse', '-z'] }));
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

function frozenHead(context) {
  const objectFormat = decodeLine(runGit({ ...context, args: ['rev-parse', '--show-object-format'] }));
  const pattern = oidPattern(objectFormat);
  const head = decodeLine(runGit({ ...context, args: ['rev-parse', '--verify', 'HEAD^{commit}'] }));
  const tree = decodeLine(runGit({ ...context, args: ['rev-parse', '--verify', 'HEAD^{tree}'] }));
  if (!pattern.test(head) || !pattern.test(tree)) refuse('SOURCE_ORIGIN_GIT_OBJECT_FORMAT');
  return Object.freeze({ objectFormat, head, tree });
}

function repositoryLayout(context) {
  let root;
  let workTree;
  let gitDirectory;
  let index;
  try {
    root = realpathSync(context.repositoryRoot);
    const workTreeLocator = decodeLine(runGit({ ...context, args: ['rev-parse', '--show-toplevel'] }));
    const gitDirectoryLocator = decodeLine(runGit({ ...context, args: ['rev-parse', '--absolute-git-dir'] }));
    const indexLocator = decodeLine(runGit({ ...context, args: ['rev-parse', '--path-format=absolute', '--git-path', 'index'] }));
    if (!isAbsolute(workTreeLocator) || !isAbsolute(gitDirectoryLocator) || !isAbsolute(indexLocator)) refuse('SOURCE_ORIGIN_GIT_LAYOUT');
    workTree = realpathSync(workTreeLocator);
    gitDirectory = realpathSync(gitDirectoryLocator);
    index = realpathSync(indexLocator);
    if (workTree !== root || index !== realpathSync(join(gitDirectory, 'index'))) refuse('SOURCE_ORIGIN_GIT_LAYOUT');
    for (const name of ['alternates', 'http-alternates']) {
      const locator = join(gitDirectory, 'objects', 'info', name);
      if (existsSync(locator)) {
        const details = statSync(locator);
        if (!details.isFile() || details.size !== 0) refuse('SOURCE_ORIGIN_GIT_ALTERNATES');
      }
    }
  } catch (error) {
    if (typeof error?.code === 'string' && error.code.startsWith('SOURCE_ORIGIN_')) throw error;
    refuse('SOURCE_ORIGIN_GIT_LAYOUT');
  }
  return Object.freeze({ root, workTree, gitDirectory, index });
}

function equalLayout(left, right) {
  return left.root === right.root && left.workTree === right.workTree && left.gitDirectory === right.gitDirectory && left.index === right.index;
}

function readBlob(context, oid, maximum) {
  const bytes = runGit({ ...context, args: ['cat-file', 'blob', oid], outputLimit: maximum });
  if (bytes.length > maximum) refuse('SOURCE_ORIGIN_LIMIT');
  return Buffer.from(bytes);
}

function readPolicy({ context, treeByPath, path, label, maximum }) {
  const row = treeByPath.get(path);
  if (!row) return null;
  const bytes = readBlob(context, row.blobOid, maximum);
  return parseCanonicalJsonBytes(bytes, { label });
}

function selectToolchainRecord(pins, executable, version) {
  if (pins.records.length === 0) refuse('SOURCE_ORIGIN_HOLD_TOOLCHAIN');
  const matchingHost = pins.records.filter((record) => record.platform === platform() && record.arch === arch());
  if (matchingHost.length === 0) refuse('SOURCE_ORIGIN_HOLD_TOOLCHAIN');
  if (matchingHost.length !== 1) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  const record = matchingHost[0];
  if (
    record.gitIdentity.version !== version
    || record.gitIdentity.executableRawSha256 !== executable.executableRawSha256
    || record.gitIdentity.executableByteLength !== executable.executableByteLength
  ) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  return record;
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

function buildManifests({ context, frozen, treeRows, treeByPath, repositoryIdentity, sourcePolicy, resolutionPolicy, resolutionOwnerPaths, limits }) {
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
    const maximum = sourceDomain ? Math.min(limits.heldFileBytes, limits.sourceBytes) : Math.min(limits.heldFileBytes, limits.resolutionBytes);
    const bytes = readBlob(context, treeRow.blobOid, maximum);
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

function observationEdge(frozen, index, executable) {
  return Object.freeze({
    head: frozen.head,
    tree: frozen.tree,
    indexDigest: index.indexDigest,
    gitVersion: executable.version,
    gitExecutableRawSha256: executable.executableRawSha256,
    gitExecutableByteLength: executable.executableByteLength,
  });
}

export async function captureFrozenSource(options) {
  exactObject(options, ['repositoryRoot', 'expectedHead', 'gitExecutableLocator', 'limits']);
  const { repositoryRoot, expectedHead, gitExecutableLocator } = options;
  if (typeof repositoryRoot !== 'string' || !isAbsolute(repositoryRoot) || typeof expectedHead !== 'string') refuse('SOURCE_ORIGIN_GIT_SCHEMA');
  const limits = validateLimits(options.limits);
  const context = { gitExecutable: gitExecutableLocator, repositoryRoot, limits };

  const executableBefore = observeExecutable(context);
  const layoutBefore = repositoryLayout(context);
  const frozenBefore = frozenHead(context);
  if (!oidPattern(frozenBefore.objectFormat).test(expectedHead) || expectedHead !== frozenBefore.head) refuse('SOURCE_ORIGIN_GIT_HEAD');
  const treeRows = parseTree(
    runGit({ ...context, args: ['ls-tree', '-r', '--full-tree', '-z', frozenBefore.tree] }),
    frozenBefore.objectFormat,
  );
  const treeByPath = new Map(treeRows.map((row) => [row.path, row]));
  const indexBefore = observeIndex(context, frozenBefore.objectFormat, treeRows);

  const repositoryIdentityValue = readPolicy({ context, treeByPath, path: POLICY_PATHS.repositoryIdentity, label: 'repository identity', maximum: limits.jsonBytes });
  const expectedOutcomesValue = readPolicy({ context, treeByPath, path: POLICY_PATHS.expectedOutcomes, label: 'expected parse outcomes', maximum: limits.jsonBytes });
  const parserPolicyValue = readPolicy({ context, treeByPath, path: POLICY_PATHS.parser, label: 'parser policy', maximum: limits.jsonBytes });
  const sourcePolicyValue = readPolicy({ context, treeByPath, path: POLICY_PATHS.source, label: 'source policy', maximum: limits.jsonBytes });
  const resolutionPolicyValue = readPolicy({ context, treeByPath, path: POLICY_PATHS.resolution, label: 'resolution policy', maximum: limits.jsonBytes });
  const pinsValue = readPolicy({ context, treeByPath, path: POLICY_PATHS.toolchainPins, label: 'toolchain pins', maximum: limits.jsonBytes });
  if (!pinsValue) refuse('SOURCE_ORIGIN_HOLD_TOOLCHAIN');
  if (!expectedOutcomesValue || !parserPolicyValue) refuse('SOURCE_ORIGIN_HOLD_EXPECTED_OUTCOMES');
  if (!repositoryIdentityValue || !sourcePolicyValue || !resolutionPolicyValue) refuse('SOURCE_ORIGIN_GIT_POLICY');

  const repositoryIdentity = validateRepositoryIdentity(repositoryIdentityValue);
  const parserPolicy = validateParserPolicy(parserPolicyValue);
  const expectedOutcomes = validateExpectedParseOutcomes(expectedOutcomesValue, { parserPolicy });
  const sourcePolicy = validateSourcePolicy(sourcePolicyValue);
  const resolutionPolicy = validateResolutionPolicy(resolutionPolicyValue);
  const pins = validateToolchainPins(pinsValue);
  if (sourcePolicy.exclusions.length !== 0) refuse('SOURCE_ORIGIN_GIT_POLICY');
  selectToolchainRecord(pins, executableBefore, executableBefore.version);
  const ownerManifestKindByKind = new Map(parserPolicy.ownerManifestBindings.map((binding) => [binding.ownerKind, binding.manifestKind]));
  const resolutionOwnerPaths = new Set(expectedOutcomes.rows
    .filter((row) => ownerManifestKindByKind.get(row.ownerKind) === 'RESOLUTION_INPUTS')
    .map((row) => row.ownerLocator));

  const manifests = buildManifests({
    context,
    frozen: frozenBefore,
    treeRows,
    treeByPath,
    repositoryIdentity,
    sourcePolicy,
    resolutionPolicy,
    resolutionOwnerPaths,
    limits,
  });

  const executableAfter = observeExecutable(context);
  const layoutAfter = repositoryLayout(context);
  const frozenAfter = frozenHead(context);
  const indexAfter = observeIndex(context, frozenAfter.objectFormat, treeRows);
  if (
    canonicalJsonText(executableAfter) !== canonicalJsonText(executableBefore)
    || !equalLayout(layoutAfter, layoutBefore)
    || frozenAfter.objectFormat !== frozenBefore.objectFormat
    || frozenAfter.head !== frozenBefore.head
    || frozenAfter.tree !== frozenBefore.tree
    || indexAfter.indexDigest !== indexBefore.indexDigest
  ) refuse('SOURCE_ORIGIN_GIT_DRIFT');

  const before = observationEdge(frozenBefore, indexBefore, executableBefore);
  const after = observationEdge(frozenAfter, indexAfter, executableAfter);
  const observation = Object.freeze({
    before,
    after,
    objectFormat: frozenBefore.objectFormat,
    indexDigest: indexBefore.indexDigest,
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
  });
  return Object.freeze({ observation, ...manifests });
}
