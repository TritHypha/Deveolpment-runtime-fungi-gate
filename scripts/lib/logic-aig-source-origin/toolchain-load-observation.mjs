import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  opendirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { types as utilTypes } from 'node:util';

import {
  TOOLCHAIN_PIN_OBSERVATION_LIMITS,
  canonicalToolchainObservationText,
  validateToolchainPinObservation,
} from './toolchain-pin-observation.mjs';

export const TOOLCHAIN_LOAD_OBSERVATION_LIMITS = Object.freeze({
  ...TOOLCHAIN_PIN_OBSERVATION_LIMITS,
});

const OBSERVATION_SCHEMA = 'galerina.logic-aig-toolchain-load-observation.v1';
const CLOSURE_SCHEMA = 'galerina.logic-aig-declared-closure-observation.v1';
const BUILD_PROFILE_SCHEMA = 'galerina.logic-aig-source-origin-parser-build-profile.v1';
const PHASE_SCHEMA = 'galerina.logic-aig-toolchain-phase-load-set.v1';
const SOURCE_SCHEMA = 'galerina.logic-aig-toolchain-pin-observation.v2';
const TYPESCRIPT_ROOT_LOCATOR = 'packages-ts/galerina-core-compiler/node_modules/typescript';
const COMPILER_ROOT_LOCATOR = 'packages-ts/galerina-core-compiler';
const GENERATED_ROOT_LOCATOR = 'generated-source-origin-parser';
const MANIFEST_BYTES = Buffer.from('{"type":"module"}', 'utf8');
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const CHILD_TIMEOUT_MS = 30_000;
const CHILD_MAX_BUFFER = 8 * 1024 * 1024;

const EXPECTED_GENERATED_LOCATORS = Object.freeze([
  'gate-v3-parser.d.ts',
  'gate-v3-parser.js',
  'lexer.d.ts',
  'lexer.js',
  'package.json',
  'parser.d.ts',
  'parser.js',
  'requirement-diagnostics.d.ts',
  'requirement-diagnostics.js',
  'source-origin-parser-entry.d.ts',
  'source-origin-parser-entry.js',
]);

const EXPECTED_PARSER_MODULES = Object.freeze([
  'gate-v3-parser.js',
  'lexer.js',
  'parser.js',
  'requirement-diagnostics.js',
  'source-origin-parser-entry.js',
]);

const EXPECTED_EMITTED_EDGES = Object.freeze([
  Object.freeze({ fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'lexer.js' }),
  Object.freeze({ fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'requirement-diagnostics.js' }),
  Object.freeze({ fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'lexer.js' }),
  Object.freeze({ fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'gate-v3-parser.js' }),
  Object.freeze({ fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'parser.js' }),
]);

const BUILD_PROFILE = Object.freeze({
  schema: BUILD_PROFILE_SCHEMA,
  executableRole: 'typescript-compiler-cli',
  workingDirectoryRoot: 'repository',
  compilerRootLocator: TYPESCRIPT_ROOT_LOCATOR,
  compilerEntryLocator: 'lib/tsc.js',
  projectLocator: `${COMPILER_ROOT_LOCATOR}/tsconfig.source-origin-parser.json`,
  generatedRootLocator: GENERATED_ROOT_LOCATOR,
  generatedEntryLocator: 'source-origin-parser-entry.js',
  generatedPackageManifestLocator: 'package.json',
  logicalArgv: Object.freeze([
    'lib/tsc.js',
    '--project',
    `${COMPILER_ROOT_LOCATOR}/tsconfig.source-origin-parser.json`,
    '--outDir',
    GENERATED_ROOT_LOCATOR,
    '--pretty',
    'false',
  ]),
});

const PROVENANCE = Object.freeze([
  Object.freeze({ role: 'collector-cli', locator: 'scripts/logic-aig-source-origin-toolchain-load-observation.mjs' }),
  Object.freeze({ role: 'collector-module', locator: 'scripts/lib/logic-aig-source-origin/toolchain-load-observation.mjs' }),
  Object.freeze({ role: 'collector-workflow', locator: '.github/workflows/rd0873-toolchain-load-observation.yml' }),
]);

const CANONICAL_BUILTINS = new Map();
for (const name of builtinModules) {
  const canonical = name.startsWith('node:') ? name : `node:${name}`;
  CANONICAL_BUILTINS.set(name, canonical);
  CANONICAL_BUILTINS.set(canonical, canonical);
}

export class ToolchainLoadObservationRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'ToolchainLoadObservationRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new ToolchainLoadObservationRefusal(code);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalToolchainLoadObservationText(value) {
  try {
    return canonicalToolchainObservationText(value);
  } catch {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
}

function sha256Raw(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256Canonical(domain, value) {
  return sha256Raw(Buffer.concat([
    Buffer.from(domain, 'utf8'),
    Buffer.from([0]),
    Buffer.from(canonicalToolchainLoadObservationText(value), 'utf8'),
  ]));
}

function assertPlainRecord(value, keys, code = 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) refuse(code);
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) refuse(code);
  actual.sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) refuse(code);
}

function assertHex(value, expression) {
  if (typeof value !== 'string' || !expression.test(value)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
}

function assertSafeLength(value) {
  if (!Number.isSafeInteger(value) || value < 0) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
}

function equalCanonical(left, right) {
  return canonicalToolchainLoadObservationText(left) === canonicalToolchainLoadObservationText(right);
}

function assertCanonicalLocator(locator) {
  if (typeof locator !== 'string' || locator.length === 0 || locator !== locator.normalize('NFC')
    || locator.includes('\\') || locator.includes('\0') || locator.includes(':')
    || locator.startsWith('/') || locator.endsWith('/')) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  if (Buffer.byteLength(locator, 'utf8') > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.locatorBytes) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const components = locator.split('/');
  if (components.length > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.locatorDepth
    || components.some((component) => component === '' || component === '.' || component === '..')) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
}

function assertSortedUnique(values, tuple) {
  let prior;
  const identities = new Set();
  for (const value of values) {
    const current = tuple(value);
    const identity = canonicalToolchainLoadObservationText(current);
    if (identities.has(identity) || (prior !== undefined && compareCodeUnits(prior, identity) >= 0)) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    }
    identities.add(identity);
    prior = identity;
  }
}

function validateIdentityRow(row) {
  assertPlainRecord(row, ['locator', 'rawSha256', 'byteLength']);
  assertCanonicalLocator(row.locator);
  assertHex(row.rawSha256, SHA256);
  assertSafeLength(row.byteLength);
}

function validateClosure(closure) {
  assertPlainRecord(closure, ['schema', 'id', 'declaration', 'rows', 'counts', 'authorizing', 'closureDigest']);
  if (closure.schema !== CLOSURE_SCHEMA || closure.id !== GENERATED_ROOT_LOCATOR || closure.authorizing !== false) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  assertPlainRecord(closure.declaration, ['rule', 'rootLocator', 'entryLocator']);
  if (!equalCanonical(closure.declaration, {
    rule: 'all-regular-files-under-package-root.v1',
    rootLocator: GENERATED_ROOT_LOCATOR,
    entryLocator: 'source-origin-parser-entry.js',
  })) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  assertPlainRecord(closure.counts, ['files', 'bytes']);
  if (!Array.isArray(closure.rows) || closure.rows.length !== 11 || closure.counts.files !== 11
    || !equalCanonical(closure.rows.map((row) => row.locator), EXPECTED_GENERATED_LOCATORS)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  let bytes = 0;
  for (const row of closure.rows) {
    validateIdentityRow(row);
    bytes += row.byteLength;
  }
  assertSortedUnique(closure.rows, (row) => [row.locator]);
  if (!Number.isSafeInteger(bytes) || bytes !== closure.counts.bytes
    || bytes > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const { closureDigest, ...body } = closure;
  if (closureDigest !== sha256Canonical(CLOSURE_SCHEMA, body)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
}

function validateSourceBinding(binding, topDigest) {
  assertPlainRecord(binding, [
    'sourceObservationSchema', 'sourceObservationDigest', 'repository', 'platform', 'arch',
    'nodeIdentity', 'gitIdentity', 'compilerLock', 'typescript', 'typescriptCompilerCli',
    'sourceOriginParserEntry', 'sourceOriginParserProject', 'declaredClosureDigests', 'sourceEdgeRows',
  ]);
  if (binding.sourceObservationSchema !== SOURCE_SCHEMA || binding.sourceObservationDigest !== topDigest
    || !['win32', 'linux'].includes(binding.platform) || binding.arch !== 'x64') {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  assertPlainRecord(binding.repository, ['repositoryId', 'objectFormat', 'pre', 'post']);
  if (binding.repository.repositoryId !== 'galerina' || binding.repository.objectFormat !== 'sha1'
    || !equalCanonical(binding.repository.pre, binding.repository.post)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  for (const endpoint of [binding.repository.pre, binding.repository.post]) {
    assertPlainRecord(endpoint, ['commitOid', 'treeOid']);
    assertHex(endpoint.commitOid, SHA1);
    assertHex(endpoint.treeOid, SHA1);
  }
  for (const identity of [binding.nodeIdentity, binding.gitIdentity]) {
    assertPlainRecord(identity, ['version', 'executableRawSha256', 'executableByteLength']);
    if (typeof identity.version !== 'string') refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    assertHex(identity.executableRawSha256, SHA256);
    assertSafeLength(identity.executableByteLength);
  }
  assertPlainRecord(binding.typescriptCompilerCli, ['rootLocator', 'locator', 'rawSha256', 'byteLength']);
  if (binding.typescriptCompilerCli.rootLocator !== TYPESCRIPT_ROOT_LOCATOR
    || binding.typescriptCompilerCli.locator !== 'lib/tsc.js') refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  assertHex(binding.typescriptCompilerCli.rawSha256, SHA256);
  assertSafeLength(binding.typescriptCompilerCli.byteLength);
  if (!Array.isArray(binding.declaredClosureDigests) || binding.declaredClosureDigests.length !== 2) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  for (const row of binding.declaredClosureDigests) {
    assertPlainRecord(row, ['id', 'closureDigest']);
    assertHex(row.closureDigest, SHA256);
  }
  if (!equalCanonical(binding.declaredClosureDigests.map((row) => row.id), [
    'source-origin-parser-source', 'typescript',
  ])) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  if (!Array.isArray(binding.sourceEdgeRows) || binding.sourceEdgeRows.length !== 6) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
}

function validateBuildProfile(profile) {
  assertPlainRecord(profile, [
    'schema', 'executableRole', 'workingDirectoryRoot', 'compilerRootLocator',
    'compilerEntryLocator', 'projectLocator', 'generatedRootLocator',
    'generatedEntryLocator', 'generatedPackageManifestLocator', 'logicalArgv',
  ]);
  if (!equalCanonical(profile, BUILD_PROFILE)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
}

function validateEdgeRows(rows) {
  if (!Array.isArray(rows) || !equalCanonical(rows, EXPECTED_EMITTED_EDGES)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  for (const row of rows) {
    assertPlainRecord(row, ['fromLocator', 'kind', 'exportName', 'specifier', 'toLocator']);
  }
}

function validatePhaseSets(phases, binding, generatedClosure) {
  if (!Array.isArray(phases) || phases.length !== 3
    || !equalCanonical(phases.map((phase) => phase.phaseId), ['BUILD', 'HOST', 'PARSER'])) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const expectedEntries = {
    BUILD: { rootLocator: TYPESCRIPT_ROOT_LOCATOR, locator: 'lib/tsc.js' },
    HOST: { rootLocator: TYPESCRIPT_ROOT_LOCATOR, locator: 'lib/typescript.js' },
    PARSER: { rootLocator: GENERATED_ROOT_LOCATOR, locator: 'source-origin-parser-entry.js' },
  };
  for (const phase of phases) {
    assertPlainRecord(phase, [
      'schema', 'phaseId', 'entry', 'moduleRows', 'builtinModules',
      'parserExportNames', 'counts', 'authorizing', 'loadSetDigest',
    ]);
    if (phase.schema !== PHASE_SCHEMA || phase.authorizing !== false) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    assertPlainRecord(phase.entry, ['rootLocator', 'locator']);
    if (!equalCanonical(phase.entry, expectedEntries[phase.phaseId])) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    if (!Array.isArray(phase.moduleRows) || phase.moduleRows.length === 0
      || !Array.isArray(phase.builtinModules)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    for (const row of phase.moduleRows) {
      validateIdentityRow(row);
      if (!row.locator.endsWith('.js')) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    }
    assertSortedUnique(phase.moduleRows, (row) => [row.locator]);
    for (const builtin of phase.builtinModules) {
      if (typeof builtin !== 'string' || !builtin.startsWith('node:')
        || CANONICAL_BUILTINS.get(builtin) !== builtin) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    }
    assertSortedUnique(phase.builtinModules, (name) => [name]);
    assertPlainRecord(phase.counts, ['modules', 'builtinModules']);
    if (phase.counts.modules !== phase.moduleRows.length
      || phase.counts.builtinModules !== phase.builtinModules.length) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    }
    const { loadSetDigest, ...body } = phase;
    if (loadSetDigest !== sha256Canonical(PHASE_SCHEMA, body)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const [build, host, parser] = phases;
  if (build.parserExportNames !== null || host.parserExportNames !== null
    || !build.moduleRows.some((row) => row.locator === 'lib/tsc.js')
    || !host.moduleRows.some((row) => row.locator === 'lib/typescript.js')
    || !equalCanonical(parser.moduleRows.map((row) => row.locator), EXPECTED_PARSER_MODULES)
    || !equalCanonical(parser.builtinModules, [])
    || !equalCanonical(parser.parserExportNames, ['lex', 'parseGateV3', 'parseProgram'])) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const tsc = build.moduleRows.find((row) => row.locator === 'lib/tsc.js');
  if (tsc.rawSha256 !== binding.typescriptCompilerCli.rawSha256
    || tsc.byteLength !== binding.typescriptCompilerCli.byteLength) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const typescript = host.moduleRows.find((row) => row.locator === 'lib/typescript.js');
  if (typescript.rawSha256 !== binding.typescript.entryRawSha256
    || typescript.byteLength !== binding.typescript.entryByteLength) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  for (const row of parser.moduleRows) {
    const generated = generatedClosure.rows.find((candidate) => candidate.locator === row.locator);
    if (!generated || !equalCanonical(row, generated)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
}

function validateLoadObservationInternal(value) {
  assertPlainRecord(value, [
    'schema', 'sourceObservationDigest', 'sourceBinding', 'buildProfile',
    'generatedEntry', 'generatedPackageManifest', 'generatedClosure',
    'repeatedGeneratedClosureDigest', 'emittedEdgeRows', 'phaseLoadSets',
    'provenanceBlobs', 'limits', 'authorizing', 'observationDigest',
  ]);
  if (value.schema !== OBSERVATION_SCHEMA || value.authorizing !== false) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  assertHex(value.sourceObservationDigest, SHA256);
  validateSourceBinding(value.sourceBinding, value.sourceObservationDigest);
  validateBuildProfile(value.buildProfile);
  validateClosure(value.generatedClosure);
  if (value.repeatedGeneratedClosureDigest !== value.generatedClosure.closureDigest) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  for (const identity of [value.generatedEntry, value.generatedPackageManifest]) {
    assertPlainRecord(identity, ['rootLocator', 'locator', 'rawSha256', 'byteLength']);
    if (identity.rootLocator !== GENERATED_ROOT_LOCATOR) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    assertHex(identity.rawSha256, SHA256);
    assertSafeLength(identity.byteLength);
  }
  const entryRow = value.generatedClosure.rows.find((row) => row.locator === 'source-origin-parser-entry.js');
  if (value.generatedEntry.locator !== 'source-origin-parser-entry.js'
    || value.generatedEntry.rawSha256 !== entryRow.rawSha256
    || value.generatedEntry.byteLength !== entryRow.byteLength
    || !equalCanonical(value.generatedPackageManifest, {
      rootLocator: GENERATED_ROOT_LOCATOR,
      locator: 'package.json',
      rawSha256: sha256Raw(MANIFEST_BYTES),
      byteLength: MANIFEST_BYTES.length,
    })) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  validateEdgeRows(value.emittedEdgeRows);
  validatePhaseSets(value.phaseLoadSets, value.sourceBinding, value.generatedClosure);
  if (!Array.isArray(value.provenanceBlobs) || value.provenanceBlobs.length !== PROVENANCE.length) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  for (let index = 0; index < PROVENANCE.length; index += 1) {
    const row = value.provenanceBlobs[index];
    const expected = PROVENANCE[index];
    assertPlainRecord(row, ['role', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength']);
    if (row.role !== expected.role || row.locator !== expected.locator) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
    assertHex(row.gitBlobOid, SHA1);
    assertHex(row.rawSha256, SHA256);
    assertSafeLength(row.byteLength);
  }
  if (!equalCanonical(value.limits, TOOLCHAIN_LOAD_OBSERVATION_LIMITS)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  const { observationDigest, ...body } = value;
  if (observationDigest !== sha256Canonical(OBSERVATION_SCHEMA, body)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA');
  }
  return value;
}

export function validateToolchainLoadObservation(value) {
  try {
    return validateLoadObservationInternal(value);
  } catch (error) {
    if (error instanceof ToolchainLoadObservationRefusal) throw error;
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_INTERNAL');
  }
}

function samePlatformPath(left, right) {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function readRegularFile(target, maximumBytes, code = 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE') {
  let stats;
  let canonical;
  try {
    stats = lstatSync(target, { bigint: true });
    canonical = realpathSync.native(target);
  } catch {
    refuse(code);
  }
  if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1n
    || stats.size > BigInt(maximumBytes) || !samePlatformPath(canonical, path.resolve(target))) refuse(code);
  let bytes;
  try {
    bytes = readFileSync(target);
  } catch {
    refuse(code);
  }
  if (bytes.length !== Number(stats.size) || bytes.length > maximumBytes) refuse(code);
  return bytes;
}

function assertNoDuplicateJsonMembers(text) {
  const scopes = [];
  for (let index = 0; index < text.length;) {
    if (text[index] === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        if (text[index] === '\\') index += 2;
        else if (text[index] === '"') { index += 1; break; }
        else index += 1;
      }
      let cursor = index;
      while (/\s/u.test(text[cursor] ?? '')) cursor += 1;
      if (text[cursor] === ':' && scopes.length > 0) {
        let key;
        try { key = JSON.parse(text.slice(start, index)); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE'); }
        const scope = scopes.at(-1);
        if (scope.has(key)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
        scope.add(key);
      }
      continue;
    }
    if (text[index] === '{') scopes.push(new Set());
    else if (text[index] === '}') scopes.pop();
    index += 1;
  }
}

function parseSourceObservation(bytes, expectedDigest) {
  if (bytes.length > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  }
  if (text.charCodeAt(0) === 0xfeff) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  assertNoDuplicateJsonMembers(text);
  let parsed;
  try { parsed = JSON.parse(text); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE'); }
  let observation;
  try { observation = validateToolchainPinObservation(parsed); } catch {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  }
  if (canonicalToolchainObservationText(observation) !== text
    || observation.observationDigest !== expectedDigest) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
  return observation;
}

function readCollectorOptions(options) {
  if (utilTypes.isProxy(options) || options === null || typeof options !== 'object'
    || Object.getPrototypeOf(options) !== Object.prototype) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string')) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  keys.sort(compareCodeUnits);
  const expected = ['gitExecutable', 'repositoryRoot', 'sourceObservationBytes', 'sourceObservationDigest'];
  if (!equalCanonical(keys, expected)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  for (const key of expected) {
    if (!Object.hasOwn(descriptors[key], 'value')) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  }
  const repositoryRoot = descriptors.repositoryRoot.value;
  const gitExecutable = descriptors.gitExecutable.value;
  const sourceObservationDigest = descriptors.sourceObservationDigest.value;
  const sourceObservationBytes = descriptors.sourceObservationBytes.value;
  if (typeof repositoryRoot !== 'string' || typeof gitExecutable !== 'string'
    || !path.isAbsolute(repositoryRoot) || !path.isAbsolute(gitExecutable)
    || typeof sourceObservationDigest !== 'string' || !SHA256.test(sourceObservationDigest)
    || utilTypes.isProxy(sourceObservationBytes) || !Buffer.isBuffer(sourceObservationBytes)
    || Object.getPrototypeOf(sourceObservationBytes) !== Buffer.prototype
    || sourceObservationBytes.buffer instanceof SharedArrayBuffer) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  }
  return {
    repositoryRoot,
    gitExecutable,
    sourceObservationDigest,
    sourceObservationBytes: Buffer.from(sourceObservationBytes),
  };
}

function executableIdentity(target, version) {
  const bytes = readRegularFile(target, TOOLCHAIN_LOAD_OBSERVATION_LIMITS.executableBytes, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_IDENTITY');
  return {
    version,
    executableRawSha256: sha256Raw(bytes),
    executableByteLength: bytes.length,
  };
}

function runGit(gitExecutable, repositoryRoot, expectedIdentity, args, { binary = false } = {}) {
  const before = executableIdentity(gitExecutable, expectedIdentity.version);
  if (before.executableRawSha256 !== expectedIdentity.executableRawSha256
    || before.executableByteLength !== expectedIdentity.executableByteLength) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_IDENTITY');
  }
  let output;
  try {
    output = execFileSync(gitExecutable, ['-C', repositoryRoot, ...args], {
      encoding: binary ? 'buffer' : 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
      maxBuffer: TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes,
      windowsHide: true,
    });
  } catch {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GIT');
  }
  const after = executableIdentity(gitExecutable, expectedIdentity.version);
  if (!equalCanonical(before, after)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_IDENTITY');
  return output;
}

function validateRepositoryRoot(root, gitExecutable, source) {
  let repositoryRoot;
  try { repositoryRoot = realpathSync.native(root); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT'); }
  const rootStats = lstatSync(repositoryRoot, { bigint: true, throwIfNoEntry: false });
  if (!rootStats || !rootStats.isDirectory() || rootStats.isSymbolicLink()) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  const expectedGit = source.gitIdentityBefore;
  const reportedRoot = runGit(gitExecutable, repositoryRoot, expectedGit, ['rev-parse', '--show-toplevel']).trim();
  let canonicalReported;
  try { canonicalReported = realpathSync.native(reportedRoot); } catch { refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT'); }
  if (!samePlatformPath(repositoryRoot, canonicalReported)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT');
  const gitVersion = runGit(gitExecutable, repositoryRoot, expectedGit, ['--version']).trim();
  if (gitVersion !== `git version ${expectedGit.version}`) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_IDENTITY');
  return repositoryRoot;
}

function readGitState(gitExecutable, repositoryRoot, source) {
  const identity = source.gitIdentityBefore;
  const commitOid = runGit(gitExecutable, repositoryRoot, identity, ['rev-parse', 'HEAD']).trim();
  const treeOid = runGit(gitExecutable, repositoryRoot, identity, ['rev-parse', 'HEAD^{tree}']).trim();
  const format = runGit(gitExecutable, repositoryRoot, identity, ['rev-parse', '--show-object-format']).trim();
  const status = runGit(gitExecutable, repositoryRoot, identity, [
    'status', '--porcelain=v1', '-z', '--untracked-files=all',
  ], { binary: true });
  if (format !== 'sha1' || status.length !== 0 || !SHA1.test(commitOid) || !SHA1.test(treeOid)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_STATE');
  }
  const expected = source.repository.pre;
  if (commitOid !== expected.commitOid || treeOid !== expected.treeOid) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_STATE');
  }
  return { commitOid, treeOid };
}

function resolveContained(root, locator, code = 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE') {
  const target = path.resolve(root, ...locator.split('/'));
  const relative = path.relative(root, target);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) refuse(code);
  return target;
}

function enumerateClosure(root, code = 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE') {
  const rows = [];
  let entries = 0;
  const visit = (directory, prefix) => {
    const stats = lstatSync(directory, { bigint: true, throwIfNoEntry: false });
    let canonical;
    try { canonical = realpathSync.native(directory); } catch { refuse(code); }
    if (!stats || !stats.isDirectory() || stats.isSymbolicLink()
      || !samePlatformPath(canonical, path.resolve(directory))) refuse(code);
    let handle;
    try { handle = opendirSync(directory); } catch { refuse(code); }
    try {
      let entry;
      while ((entry = handle.readSync()) !== null) {
        entries += 1;
        if (entries > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.traversalEntries) refuse(code);
        const locator = prefix ? `${prefix}/${entry.name}` : entry.name;
        assertCanonicalLocator(locator);
        const target = path.join(directory, entry.name);
        const childStats = lstatSync(target, { bigint: true, throwIfNoEntry: false });
        if (!childStats || childStats.isSymbolicLink()) refuse(code);
        if (childStats.isDirectory()) visit(target, locator);
        else if (childStats.isFile()) {
          const bytes = readRegularFile(target, TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes, code);
          rows.push({ locator, rawSha256: sha256Raw(bytes), byteLength: bytes.length });
          if (rows.length > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureFiles) refuse(code);
        } else refuse(code);
      }
    } finally {
      try { handle.closeSync(); } catch { refuse(code); }
    }
  };
  visit(root, '');
  rows.sort((left, right) => compareCodeUnits(left.locator, right.locator));
  const total = rows.reduce((sum, row) => sum + row.byteLength, 0);
  if (!Number.isSafeInteger(total) || total > TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes) refuse(code);
  return rows;
}

function assertRowsEqual(actual, expected, code = 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE') {
  if (!equalCanonical(actual, expected)) refuse(code);
}

function verifySourceFilesystem(repositoryRoot, source) {
  const sourceClosure = source.declaredClosures.find((closure) => closure.id === 'source-origin-parser-source');
  const typescriptClosure = source.declaredClosures.find((closure) => closure.id === 'typescript');
  for (const row of sourceClosure.rows) {
    const bytes = readRegularFile(resolveContained(repositoryRoot, `${COMPILER_ROOT_LOCATOR}/${row.locator}`),
      TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes);
    if (bytes.length !== row.byteLength || sha256Raw(bytes) !== row.rawSha256) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
    }
  }
  const typescriptRoot = resolveContained(repositoryRoot, TYPESCRIPT_ROOT_LOCATOR);
  assertRowsEqual(enumerateClosure(typescriptRoot), typescriptClosure.rows);
  for (const identity of [source.compilerLock, source.sourceOriginParserProject, source.sourceOriginParserEntry]) {
    const locator = typeof identity.rootLocator === 'string'
      ? `${identity.rootLocator}/${identity.locator}`
      : identity.locator;
    const bytes = readRegularFile(resolveContained(repositoryRoot, locator), TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes);
    if (bytes.length !== identity.byteLength || sha256Raw(bytes) !== identity.rawSha256) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE');
    }
  }
  return { sourceClosure, typescriptClosure };
}

function readProvenance(gitExecutable, repositoryRoot, source) {
  const commit = source.repository.pre.commitOid;
  return PROVENANCE.map(({ role, locator }) => {
    const gitBlobOid = runGit(gitExecutable, repositoryRoot, source.gitIdentityBefore, [
      'rev-parse', `${commit}:${locator}`,
    ]).trim();
    const gitBytes = runGit(gitExecutable, repositoryRoot, source.gitIdentityBefore, [
      'cat-file', 'blob', `${commit}:${locator}`,
    ], { binary: true });
    const liveBytes = readRegularFile(resolveContained(repositoryRoot, locator), TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes);
    if (!SHA1.test(gitBlobOid) || !gitBytes.equals(liveBytes)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_STATE');
    return { role, locator, gitBlobOid, rawSha256: sha256Raw(gitBytes), byteLength: gitBytes.length };
  });
}

function literalRequires(text) {
  const output = [];
  const expression = /\brequire\s*\(\s*(["'])([^"'\\]+)\1\s*\)/gu;
  for (const match of text.matchAll(expression)) output.push(match[2]);
  return output;
}

function candidateBuiltins(root, closureRows, entryLocator) {
  const rows = new Map(closureRows.map((row) => [row.locator, row]));
  const pending = [entryLocator];
  const seen = new Set();
  const builtins = new Set();
  while (pending.length > 0) {
    const locator = pending.pop();
    if (seen.has(locator)) continue;
    const row = rows.get(locator);
    if (!row || !locator.endsWith('.js')) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
    seen.add(locator);
    const bytes = readRegularFile(resolveContained(root, locator, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION'),
      TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
    if (bytes.length !== row.byteLength || sha256Raw(bytes) !== row.rawSha256) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    for (const specifier of literalRequires(text)) {
      const builtin = CANONICAL_BUILTINS.get(specifier);
      if (builtin) builtins.add(builtin);
      else if (specifier.startsWith('.') && specifier.endsWith('.js')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(locator), specifier));
        if (target.startsWith('../') || !rows.has(target)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
        pending.push(target);
      }
    }
  }
  return [...builtins].sort(compareCodeUnits);
}

function phaseChildMain() {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const path = require('node:path');
  const Module = require('node:module');
  const url = require('node:url');

  class GuardRefusal extends Error {
    constructor(code) { super(code); this.code = code; }
  }
  const fail = (code) => { throw new GuardRefusal(code); };
  const samePath = (left, right) => process.platform === 'win32'
    ? left.toLowerCase() === right.toLowerCase() : left === right;
  const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
  const sort = (values) => values.sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const canonicalBuiltin = new Map();
  for (const name of Module.builtinModules) {
    const canonical = name.startsWith('node:') ? name : `node:${name}`;
    canonicalBuiltin.set(name, canonical);
    canonicalBuiltin.set(canonical, canonical);
  }

  let config;
  try { config = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exitCode = 2; return; }
  const root = path.resolve(config.root);
  const entry = path.resolve(root, ...config.entryLocator.split('/'));
  const candidates = new Map(config.allowedRows.map((row) => [row.locator, row]));
  const allowedBuiltins = new Set(config.allowedBuiltins);
  const loadedModules = new Set();
  const loadedBuiltins = new Set();

  const locatorFor = (filename) => {
    const absolute = path.resolve(filename);
    const relative = path.relative(root, absolute);
    if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      fail('RESOLUTION');
    }
    return relative.split(path.sep).join('/');
  };
  const readExact = (filename) => {
    const locator = locatorFor(filename);
    const expected = candidates.get(locator);
    if (!expected || !locator.endsWith('.js')) fail('RESOLUTION');
    let stats;
    let canonical;
    let bytes;
    try {
      stats = fs.lstatSync(filename, { bigint: true });
      canonical = fs.realpathSync.native(filename);
      bytes = fs.readFileSync(filename);
    } catch { fail('RESOLUTION'); }
    if (!stats.isFile() || stats.isSymbolicLink() || stats.nlink !== 1n
      || !samePath(canonical, path.resolve(filename)) || bytes.length !== expected.byteLength
      || hash(bytes) !== expected.rawSha256) fail('RESOLUTION');
    loadedModules.add(locator);
    return bytes;
  };
  const recordBuiltin = (specifier) => {
    const canonical = canonicalBuiltin.get(specifier);
    if (!canonical || !allowedBuiltins.has(canonical)) fail('RESOLUTION');
    loadedBuiltins.add(canonical);
  };
  const finish = (parserExportNames) => {
    const body = {
      moduleLocators: sort([...loadedModules]),
      builtinModules: sort([...loadedBuiltins]),
      parserExportNames,
    };
    process.stdout.write(JSON.stringify(body));
  };
  const finishRefusal = (error) => {
    const refusal = error instanceof GuardRefusal ? error.code : 'CHILD';
    process.stdout.write(JSON.stringify({ refusal }));
    process.exitCode = 2;
  };

  try {
    if (!samePath(process.cwd(), path.resolve(config.cwd))) fail('RESOLUTION');
    process.chdir = () => fail('RESOLUTION');
    if (config.kind === 'cjs') {
      const originalLoad = Module._load;
      Module._load = function guardedLoad(request, parent, isMain) {
        if (typeof request !== 'string') fail('RESOLUTION');
        const builtin = canonicalBuiltin.get(request);
        if (builtin) {
          recordBuiltin(request);
          return originalLoad.call(this, request, parent, isMain);
        }
        let filename;
        if (path.isAbsolute(request)) {
          if (parent !== null || !isMain || !samePath(path.resolve(request), entry)) fail('RESOLUTION');
          filename = entry;
        } else if ((request.startsWith('./') || request.startsWith('../'))
          && request.endsWith('.js') && parent && typeof parent.filename === 'string') {
          filename = path.resolve(path.dirname(parent.filename), request);
        } else fail('RESOLUTION');
        const locator = locatorFor(filename);
        if (!candidates.has(locator)) fail('RESOLUTION');
        return originalLoad.call(this, filename, parent, isMain);
      };
      Module._extensions['.js'] = function guardedJavaScript(module, filename) {
        const bytes = readExact(filename);
        module._compile(new TextDecoder('utf-8', { fatal: true }).decode(bytes), filename);
      };
      let requestedExit;
      process.exit = (code = 0) => { requestedExit = code; };
      if (config.phaseId === 'BUILD') {
        process.argv = [process.execPath, entry, ...config.buildArgv];
      }
      Module._load(entry, null, true);
      const exitCode = requestedExit ?? process.exitCode ?? 0;
      if (config.phaseId === 'BUILD' && exitCode !== 0) fail('BUILD');
      process.exitCode = 0;
      finish(null);
      return;
    }
    if (config.kind !== 'esm' || typeof Module.registerHooks !== 'function') fail('RESOLUTION');
    Module.registerHooks({
      resolve(specifier, context) {
        let filename;
        if (specifier.startsWith('file:')) {
          filename = url.fileURLToPath(specifier);
          if (!samePath(path.resolve(filename), entry)) fail('RESOLUTION');
        } else if ((specifier.startsWith('./') || specifier.startsWith('../'))
          && specifier.endsWith('.js') && typeof context.parentURL === 'string'
          && context.parentURL.startsWith('file:')) {
          filename = url.fileURLToPath(new URL(specifier, context.parentURL));
        } else fail('RESOLUTION');
        const locator = locatorFor(filename);
        if (!candidates.has(locator)) fail('RESOLUTION');
        return { url: url.pathToFileURL(filename).href, shortCircuit: true };
      },
      load(moduleUrl) {
        if (!moduleUrl.startsWith('file:')) fail('RESOLUTION');
        const filename = url.fileURLToPath(moduleUrl);
        return { format: 'module', source: readExact(filename), shortCircuit: true };
      },
    });
    import(url.pathToFileURL(entry).href).then((namespace) => {
      finish(sort(Object.keys(namespace)));
    }, finishRefusal);
  } catch (error) {
    finishRefusal(error);
  }
}

const PHASE_CHILD_SOURCE = `(${phaseChildMain.toString()})()`;

function childEnvironment() {
  const environment = { NODE_DISABLE_COMPILE_CACHE: '1' };
  if (process.platform === 'win32' && typeof process.env.SystemRoot === 'string') {
    environment.SystemRoot = process.env.SystemRoot;
  }
  return environment;
}

function runPhaseChild(config, phaseFailureCode) {
  const result = spawnSync(process.execPath, [
    '--no-warnings', '--input-type=commonjs', '--eval', PHASE_CHILD_SOURCE,
  ], {
    cwd: config.cwd,
    env: childEnvironment(),
    input: canonicalToolchainLoadObservationText(config),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: CHILD_TIMEOUT_MS,
    maxBuffer: CHILD_MAX_BUFFER,
    windowsHide: true,
  });
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { refuse(phaseFailureCode); }
  if (result.signal !== null || result.error || result.stderr !== '') refuse(phaseFailureCode);
  if (result.status !== 0) {
    if (parsed?.refusal === 'RESOLUTION') refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
    if (parsed?.refusal === 'BUILD') refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_BUILD');
    refuse(phaseFailureCode);
  }
  assertPlainRecord(parsed, ['moduleLocators', 'builtinModules', 'parserExportNames'], phaseFailureCode);
  if (!Array.isArray(parsed.moduleLocators) || !Array.isArray(parsed.builtinModules)) refuse(phaseFailureCode);
  return parsed;
}

function identityRows(locators, candidateRows, code) {
  const candidates = new Map(candidateRows.map((row) => [row.locator, row]));
  const rows = locators.map((locator) => {
    const row = candidates.get(locator);
    if (!row) refuse(code);
    return { ...row };
  });
  rows.sort((left, right) => compareCodeUnits(left.locator, right.locator));
  return rows;
}

function runDiscoveryReplay({ phaseId, kind, cwd, discoveryRoot, replayRoot, entryLocator, candidateRows, candidateBuiltins, discoveryArgv, replayArgv }) {
  const discovery = runPhaseChild({
    phaseId, kind, cwd, root: discoveryRoot, entryLocator,
    allowedRows: candidateRows, allowedBuiltins: candidateBuiltins,
    ...(discoveryArgv ? { buildArgv: discoveryArgv } : {}),
  }, phaseId === 'BUILD' ? 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_BUILD' : 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_PHASE');
  const replayRows = identityRows(discovery.moduleLocators, candidateRows, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_PHASE');
  const replay = runPhaseChild({
    phaseId, kind, cwd, root: replayRoot, entryLocator,
    allowedRows: replayRows, allowedBuiltins: discovery.builtinModules,
    ...(replayArgv ? { buildArgv: replayArgv } : {}),
  }, phaseId === 'BUILD' ? 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_BUILD' : 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_PHASE');
  if (!equalCanonical(discovery, replay)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_MISMATCH');
  return { result: replay, moduleRows: replayRows };
}

function writeManifest(generatedRoot) {
  const target = path.join(generatedRoot, 'package.json');
  let descriptor;
  try {
    descriptor = openSync(target, 'wx', 0o600);
    writeFileSync(descriptor, MANIFEST_BYTES);
    closeSync(descriptor);
    descriptor = undefined;
  } catch {
    if (descriptor !== undefined) {
      try { closeSync(descriptor); } catch { /* cleanup of the enclosing root follows */ }
    }
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
  }
}

function generatedClosure(root) {
  const rows = enumerateClosure(root, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
  if (!equalCanonical(rows.map((row) => row.locator), EXPECTED_GENERATED_LOCATORS)) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
  }
  const counts = {
    files: rows.length,
    bytes: rows.reduce((sum, row) => sum + row.byteLength, 0),
  };
  const body = {
    schema: CLOSURE_SCHEMA,
    id: GENERATED_ROOT_LOCATOR,
    declaration: {
      rule: 'all-regular-files-under-package-root.v1',
      rootLocator: GENERATED_ROOT_LOCATOR,
      entryLocator: 'source-origin-parser-entry.js',
    },
    rows,
    counts,
    authorizing: false,
  };
  return { ...body, closureDigest: sha256Canonical(CLOSURE_SCHEMA, body) };
}

function withoutComments(text) {
  let output = '';
  for (let index = 0; index < text.length;) {
    const current = text[index];
    const next = text[index + 1];
    if (current === '"' || current === "'" || current === '`') {
      const quote = current;
      output += current;
      index += 1;
      while (index < text.length) {
        const char = text[index];
        output += char;
        index += 1;
        if (char === '\\' && index < text.length) {
          output += text[index];
          index += 1;
        } else if (char === quote) break;
      }
      continue;
    }
    if (current === '/' && next === '/') {
      output += '  ';
      index += 2;
      while (index < text.length && text[index] !== '\n') { output += ' '; index += 1; }
      continue;
    }
    if (current === '/' && next === '*') {
      output += '  ';
      index += 2;
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        output += text[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      if (index < text.length) { output += '  '; index += 2; }
      continue;
    }
    output += current;
    index += 1;
  }
  return output;
}

function emittedEdges(root) {
  const executable = new Set(EXPECTED_PARSER_MODULES);
  const rows = [];
  for (const fromLocator of EXPECTED_PARSER_MODULES) {
    const bytes = readRegularFile(path.join(root, fromLocator), TOOLCHAIN_LOAD_OBSERVATION_LIMITS.closureBytes,
      'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
    const source = withoutComments(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (/\bimport\s*\(|\brequire\s*\(/u.test(source)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
    const importExpression = /\bimport\s+(?:[^;"']*?\s+from\s+)?(["'])([^"']+)\1\s*;/gu;
    for (const match of source.matchAll(importExpression)) {
      const specifier = match[2];
      const toLocator = resolveGeneratedSpecifier(fromLocator, specifier, executable);
      rows.push({ fromLocator, kind: 'IMPORT', exportName: null, specifier, toLocator });
    }
    const exportExpression = /\bexport\s*\{([^}]*)\}\s*from\s*(["'])([^"']+)\2\s*;/gu;
    for (const match of source.matchAll(exportExpression)) {
      const specifier = match[3];
      const toLocator = resolveGeneratedSpecifier(fromLocator, specifier, executable);
      const names = match[1].split(',').map((part) => part.trim()).filter(Boolean).map((part) => part.split(/\s+as\s+/u)[1] ?? part.split(/\s+as\s+/u)[0]);
      for (const exportName of names) rows.push({ fromLocator, kind: 'EXPORT_FROM', exportName, specifier, toLocator });
    }
  }
  rows.sort((left, right) => {
    const leftTuple = [left.fromLocator, left.kind, left.exportName ?? '', left.specifier, left.toLocator];
    const rightTuple = [right.fromLocator, right.kind, right.exportName ?? '', right.specifier, right.toLocator];
    for (let index = 0; index < leftTuple.length; index += 1) {
      const order = compareCodeUnits(leftTuple[index], rightTuple[index]);
      if (order !== 0) return order;
    }
    return 0;
  });
  if (!equalCanonical(rows, EXPECTED_EMITTED_EDGES)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
  return rows;
}

function resolveGeneratedSpecifier(fromLocator, specifier, executable) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.') || !specifier.endsWith('.js')) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
  }
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromLocator), specifier));
  if (target.startsWith('../') || !executable.has(target)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION');
  return target;
}

function phaseLoadSet(phaseId, entry, moduleRows, builtinModules, parserExportNames) {
  const body = {
    schema: PHASE_SCHEMA,
    phaseId,
    entry,
    moduleRows,
    builtinModules,
    parserExportNames,
    counts: { modules: moduleRows.length, builtinModules: builtinModules.length },
    authorizing: false,
  };
  return { ...body, loadSetDigest: sha256Canonical(PHASE_SCHEMA, body) };
}

function sourceBinding(source) {
  return {
    sourceObservationSchema: source.schema,
    sourceObservationDigest: source.observationDigest,
    repository: source.repository,
    platform: source.platform,
    arch: source.arch,
    nodeIdentity: source.nodeIdentityBefore,
    gitIdentity: source.gitIdentityBefore,
    compilerLock: source.compilerLock,
    typescript: source.typescript,
    typescriptCompilerCli: source.typescriptCompilerCli,
    sourceOriginParserEntry: source.sourceOriginParserEntry,
    sourceOriginParserProject: source.sourceOriginParserProject,
    declaredClosureDigests: source.declaredClosures.map(({ id, closureDigest }) => ({ id, closureDigest })),
    sourceEdgeRows: source.sourceEdgeRows,
  };
}

async function collectInternal(options) {
  const captured = readCollectorOptions(options);
  const source = parseSourceObservation(captured.sourceObservationBytes, captured.sourceObservationDigest);
  if (source.platform !== process.platform || source.arch !== process.arch) {
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_IDENTITY');
  }
  const nodeIdentity = executableIdentity(process.execPath, process.version);
  if (!equalCanonical(nodeIdentity, source.nodeIdentityBefore)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_IDENTITY');
  const repositoryRoot = validateRepositoryRoot(captured.repositoryRoot, captured.gitExecutable, source);
  readGitState(captured.gitExecutable, repositoryRoot, source);
  const sourceClosuresBefore = verifySourceFilesystem(repositoryRoot, source);
  const provenanceBefore = readProvenance(captured.gitExecutable, repositoryRoot, source);

  const typescriptRoot = resolveContained(repositoryRoot, TYPESCRIPT_ROOT_LOCATOR);
  const buildBuiltins = candidateBuiltins(typescriptRoot, sourceClosuresBefore.typescriptClosure.rows, 'lib/tsc.js');
  const hostBuiltins = candidateBuiltins(typescriptRoot, sourceClosuresBefore.typescriptClosure.rows, 'lib/typescript.js');
  let temporaryParent;
  let observation;
  let pendingError;
  try {
    temporaryParent = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'rd0873-generated-load-')));
    const relativeTemp = path.relative(repositoryRoot, temporaryParent);
    if (relativeTemp === '' || (relativeTemp !== '..' && !relativeTemp.startsWith(`..${path.sep}`))
      || path.isAbsolute(relativeTemp)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
    const discoveryRoot = path.join(temporaryParent, 'discovery', GENERATED_ROOT_LOCATOR);
    const replayRoot = path.join(temporaryParent, 'replay', GENERATED_ROOT_LOCATOR);
    mkdirSync(path.dirname(discoveryRoot), { recursive: true });
    mkdirSync(path.dirname(replayRoot), { recursive: true });
    if (lstatSync(discoveryRoot, { throwIfNoEntry: false }) || lstatSync(replayRoot, { throwIfNoEntry: false })) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
    }

    const projectPath = resolveContained(repositoryRoot, BUILD_PROFILE.projectLocator);
    const buildDiscoveryArgv = ['--project', projectPath, '--outDir', discoveryRoot, '--pretty', 'false'];
    const buildReplayArgv = ['--project', projectPath, '--outDir', replayRoot, '--pretty', 'false'];
    const build = runDiscoveryReplay({
      phaseId: 'BUILD', kind: 'cjs', cwd: repositoryRoot,
      discoveryRoot: typescriptRoot, replayRoot: typescriptRoot,
      entryLocator: 'lib/tsc.js', candidateRows: sourceClosuresBefore.typescriptClosure.rows,
      candidateBuiltins: buildBuiltins, discoveryArgv: buildDiscoveryArgv, replayArgv: buildReplayArgv,
    });
    writeManifest(discoveryRoot);
    writeManifest(replayRoot);
    const discoveryClosure = generatedClosure(discoveryRoot);
    const replayClosure = generatedClosure(replayRoot);
    if (!equalCanonical(discoveryClosure, replayClosure)) {
      refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_MISMATCH');
    }
    const edges = emittedEdges(discoveryRoot);

    const host = runDiscoveryReplay({
      phaseId: 'HOST', kind: 'cjs', cwd: repositoryRoot,
      discoveryRoot: typescriptRoot, replayRoot: typescriptRoot,
      entryLocator: 'lib/typescript.js', candidateRows: sourceClosuresBefore.typescriptClosure.rows,
      candidateBuiltins: hostBuiltins,
    });
    const generatedExecutableRows = discoveryClosure.rows.filter((row) => EXPECTED_PARSER_MODULES.includes(row.locator));
    const parser = runDiscoveryReplay({
      phaseId: 'PARSER', kind: 'esm', cwd: repositoryRoot,
      discoveryRoot, replayRoot, entryLocator: 'source-origin-parser-entry.js',
      candidateRows: generatedExecutableRows, candidateBuiltins: [],
    });

    const phaseLoadSets = [
      phaseLoadSet('BUILD', { rootLocator: TYPESCRIPT_ROOT_LOCATOR, locator: 'lib/tsc.js' },
        build.moduleRows, build.result.builtinModules, null),
      phaseLoadSet('HOST', { rootLocator: TYPESCRIPT_ROOT_LOCATOR, locator: 'lib/typescript.js' },
        host.moduleRows, host.result.builtinModules, null),
      phaseLoadSet('PARSER', { rootLocator: GENERATED_ROOT_LOCATOR, locator: 'source-origin-parser-entry.js' },
        parser.moduleRows, parser.result.builtinModules, parser.result.parserExportNames),
    ];
    readGitState(captured.gitExecutable, repositoryRoot, source);
    const sourceClosuresAfter = verifySourceFilesystem(repositoryRoot, source);
    const provenanceAfter = readProvenance(captured.gitExecutable, repositoryRoot, source);
    const nodeIdentityAfter = executableIdentity(process.execPath, process.version);
    if (!equalCanonical(sourceClosuresBefore.sourceClosure, sourceClosuresAfter.sourceClosure)
      || !equalCanonical(sourceClosuresBefore.typescriptClosure, sourceClosuresAfter.typescriptClosure)
      || !equalCanonical(provenanceBefore, provenanceAfter)
      || !equalCanonical(nodeIdentity, nodeIdentityAfter)) refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_MISMATCH');

    const entryRow = discoveryClosure.rows.find((row) => row.locator === 'source-origin-parser-entry.js');
    const body = {
      schema: OBSERVATION_SCHEMA,
      sourceObservationDigest: source.observationDigest,
      sourceBinding: sourceBinding(source),
      buildProfile: BUILD_PROFILE,
      generatedEntry: { rootLocator: GENERATED_ROOT_LOCATOR, ...entryRow },
      generatedPackageManifest: {
        rootLocator: GENERATED_ROOT_LOCATOR,
        locator: 'package.json',
        rawSha256: sha256Raw(MANIFEST_BYTES),
        byteLength: MANIFEST_BYTES.length,
      },
      generatedClosure: discoveryClosure,
      repeatedGeneratedClosureDigest: replayClosure.closureDigest,
      emittedEdgeRows: edges,
      phaseLoadSets,
      provenanceBlobs: provenanceBefore,
      limits: TOOLCHAIN_LOAD_OBSERVATION_LIMITS,
      authorizing: false,
    };
    observation = validateToolchainLoadObservation({
      ...body,
      observationDigest: sha256Canonical(OBSERVATION_SCHEMA, body),
    });
  } catch (error) {
    pendingError = error;
  }
  if (temporaryParent !== undefined) {
    try {
      rmSync(temporaryParent, { recursive: true, force: true });
      if (lstatSync(temporaryParent, { throwIfNoEntry: false })) {
        refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
      }
    } catch (error) {
      pendingError = error instanceof ToolchainLoadObservationRefusal
        ? error : new ToolchainLoadObservationRefusal('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_GENERATED');
    }
  }
  if (pendingError) throw pendingError;
  return observation;
}

export async function collectToolchainLoadObservation(options) {
  try {
    return await collectInternal(options);
  } catch (error) {
    if (error instanceof ToolchainLoadObservationRefusal) throw error;
    refuse('TOOLCHAIN_LOAD_OBSERVATION_REFUSED_INTERNAL');
  }
}
