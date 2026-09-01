import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  fstatSync,
  openSync,
  opendirSync,
  closeSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export const TOOLCHAIN_PIN_OBSERVATION_LIMITS = Object.freeze({
  closureFiles: 16_384,
  traversalEntries: 16_384,
  closureBytes: 64 * 1024 * 1024,
  executableBytes: 256 * 1024 * 1024,
  locatorDepth: 64,
  locatorBytes: 4_096,
});

const OBSERVATION_SCHEMA = 'galerina.logic-aig-toolchain-pin-observation.v2';
const CLOSURE_SCHEMA = 'galerina.logic-aig-declared-closure-observation.v1';
const GIT_EXECUTION_BINDING = 'cooperative-path-endpoint-sampling.v1';
const REPOSITORY_ID = 'galerina';
const COMPILER_ROOT_LOCATOR = 'packages-ts/galerina-core-compiler';
const TYPESCRIPT_ROOT_LOCATOR = `${COMPILER_ROOT_LOCATOR}/node_modules/typescript`;
const TYPESCRIPT_PACKAGE_LOCATOR = `${TYPESCRIPT_ROOT_LOCATOR}/package.json`;
const COMPILER_PACKAGE_LOCATOR = `${COMPILER_ROOT_LOCATOR}/package.json`;
const COMPILER_LOCK_LOCATOR = `${COMPILER_ROOT_LOCATOR}/package-lock.json`;
const TYPESCRIPT_ENTRY_LOCATOR = `${TYPESCRIPT_ROOT_LOCATOR}/lib/typescript.js`;
const TYPESCRIPT_COMPILER_CLI_LOCATOR = `${TYPESCRIPT_ROOT_LOCATOR}/lib/tsc.js`;
const SOURCE_ENTRY_LOCATOR = `${COMPILER_ROOT_LOCATOR}/src/source-origin-parser-entry.ts`;
const SOURCE_PROJECT_LOCATOR = `${COMPILER_ROOT_LOCATOR}/tsconfig.source-origin-parser.json`;
const SOURCE_ENTRY_LOCAL_LOCATOR = 'src/source-origin-parser-entry.ts';
const SOURCE_EDGE_ROWS = Object.freeze([
  Object.freeze({ fromLocator: 'src/gate-v3-parser.ts', kind: 'IMPORT_TYPE', exportName: null, specifier: './parser.js', toLocator: 'src/parser.ts' }),
  Object.freeze({ fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'src/lexer.ts' }),
  Object.freeze({ fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'src/requirement-diagnostics.ts' }),
  Object.freeze({ fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'src/lexer.ts' }),
  Object.freeze({ fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'src/gate-v3-parser.ts' }),
  Object.freeze({ fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'src/parser.ts' }),
]);
const SOURCE_MEMBER_LOCATORS = Object.freeze([
  'src/gate-v3-parser.ts',
  'src/lexer.ts',
  'src/parser.ts',
  'src/requirement-diagnostics.ts',
  'src/source-origin-parser-entry.ts',
]);
const PROVENANCE = Object.freeze([
  Object.freeze({
    role: 'collector-cli',
    locator: 'scripts/logic-aig-source-origin-toolchain-pin-observation.mjs',
  }),
  Object.freeze({
    role: 'collector-module',
    locator: 'scripts/lib/logic-aig-source-origin/toolchain-pin-observation.mjs',
  }),
  Object.freeze({
    role: 'collector-workflow',
    locator: '.github/workflows/rd0873-toolchain-pin-observation.yml',
  }),
]);

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const FULL_NODE_VERSION = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const GIT_VERSION = /^git version ([0-9]+\.[0-9]+\.[0-9]+(?:\.[0-9A-Za-z.-]+)?)$/u;

export class ToolchainPinObservationRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'ToolchainPinObservationRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new ToolchainPinObservationRefusal(code);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  const output = {};
  for (const key of Object.keys(value).sort(compareCodeUnits)) output[key] = canonicalValue(value[key]);
  return output;
}

export function canonicalToolchainObservationText(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Raw(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256Canonical(domain, value) {
  return sha256Raw(Buffer.concat([
    Buffer.from(domain, 'utf8'),
    Buffer.from([0]),
    Buffer.from(canonicalToolchainObservationText(value), 'utf8'),
  ]));
}

function assertCanonicalLocator(locator) {
  if (typeof locator !== 'string' || locator.length === 0 || locator !== locator.normalize('NFC')) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  }
  if (Buffer.byteLength(locator, 'utf8') > TOOLCHAIN_PIN_OBSERVATION_LIMITS.locatorBytes) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
  }
  if (
    locator.includes('\\')
    || locator.includes('\0')
    || locator.startsWith('/')
    || locator.endsWith('/')
    || locator.includes(':')
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  const components = locator.split('/');
  if (components.length > TOOLCHAIN_PIN_OBSERVATION_LIMITS.locatorDepth) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
  }
  if (components.some((component) => component === '' || component === '.' || component === '..')) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  }
  return locator;
}

export function validateToolchainPinObservationLocator(locator) {
  return assertCanonicalLocator(locator);
}

function resolveContained(root, locator) {
  assertCanonicalLocator(locator);
  let target = path.resolve(root);
  for (const component of locator.split('/')) {
    assertPlainDirectory(target);
    const entries = readBoundedDirectoryEntries(
      target,
      TOOLCHAIN_PIN_OBSERVATION_LIMITS.traversalEntries,
    );
    const caseMatches = entries.filter(
      (entry) => entry.name.toLowerCase() === component.toLowerCase(),
    );
    if (caseMatches.length !== 1 || caseMatches[0].name !== component) {
      refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
    }
    target = path.join(target, component);
  }
  const relative = path.relative(root, target);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  }
  return target;
}

function readBoundedDirectoryEntries(directoryPath, maximumEntries) {
  const entries = [];
  let directory;
  try {
    directory = opendirSync(directoryPath);
    for (;;) {
      const entry = directory.readSync();
      if (entry === null) break;
      if (entries.length >= maximumEntries) {
        refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
      }
      entries.push(entry);
    }
    directory.closeSync();
    directory = undefined;
    return entries;
  } catch (error) {
    if (error instanceof ToolchainPinObservationRefusal) throw error;
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  } finally {
    if (directory !== undefined) {
      try { directory.closeSync(); } catch { /* stable outer refusal */ }
    }
  }
}

function samePlatformPath(left, right) {
  if (process.platform === 'win32') return left.toLowerCase() === right.toLowerCase();
  return left === right;
}

function assertPlainDirectory(target) {
  const stats = lstatSync(target, { throwIfNoEntry: false });
  if (!stats || !stats.isDirectory() || stats.isSymbolicLink()) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  const resolved = realpathSync.native(target);
  if (!samePlatformPath(path.resolve(target), resolved)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
}

function readRegularFile(target, maximumBytes) {
  let stats;
  let resolved;
  try {
    stats = lstatSync(target, { bigint: true, throwIfNoEntry: false });
    resolved = stats ? realpathSync.native(target) : undefined;
  } catch {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  }
  if (
    !stats
    || !stats.isFile()
    || stats.isSymbolicLink()
    || stats.nlink !== 1n
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  if (!samePlatformPath(path.resolve(target), resolved)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  if (stats.size < 0n || stats.size > BigInt(maximumBytes)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
  }
  let descriptor;
  try {
    descriptor = openSync(target, 'r');
    const before = fstatSync(descriptor, { bigint: true });
    if (
      !before.isFile()
      || before.nlink !== 1n
      || before.dev !== stats.dev
      || before.ino !== stats.ino
      || before.size !== stats.size
    ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_DRIFT');
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor, { bigint: true });
    if (
      after.dev !== before.dev
      || after.ino !== before.ino
      || after.nlink !== 1n
      || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs
      || after.ctimeNs !== before.ctimeNs
      || BigInt(bytes.length) !== before.size
    ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_DRIFT');
    return bytes;
  } catch (error) {
    if (error instanceof ToolchainPinObservationRefusal) throw error;
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function row(locator, bytes) {
  assertCanonicalLocator(locator);
  return {
    locator,
    rawSha256: sha256Raw(bytes),
    byteLength: bytes.length,
  };
}

function assertGitEndpointSample(gitExecutable, expectedIdentity) {
  const observed = executableBytesIdentity(
    gitExecutable,
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.executableBytes,
  );
  if (
    observed.executableRawSha256 !== expectedIdentity.executableRawSha256
    || observed.executableByteLength !== expectedIdentity.executableByteLength
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_DRIFT');
}

function runGit(
  gitExecutable,
  repositoryRoot,
  args,
  expectedExecutableIdentity,
  { binary = false } = {},
) {
  assertGitEndpointSample(gitExecutable, expectedExecutableIdentity);
  let output;
  let failed = false;
  try {
    output = execFileSync(gitExecutable, ['-C', repositoryRoot, ...args], {
      encoding: binary ? 'buffer' : 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
      maxBuffer: TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes,
      windowsHide: true,
    });
  } catch {
    failed = true;
  }
  assertGitEndpointSample(gitExecutable, expectedExecutableIdentity);
  if (failed) refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
  return output;
}

function readGitState(gitExecutable, repositoryRoot, expectedExecutableIdentity) {
  const commitOid = runGit(
    gitExecutable, repositoryRoot, ['rev-parse', 'HEAD'], expectedExecutableIdentity,
  ).trim();
  const treeOid = runGit(
    gitExecutable, repositoryRoot, ['rev-parse', 'HEAD^{tree}'], expectedExecutableIdentity,
  ).trim();
  const objectFormat = runGit(
    gitExecutable, repositoryRoot, ['rev-parse', '--show-object-format'], expectedExecutableIdentity,
  ).trim();
  if (objectFormat !== 'sha1' || !SHA1.test(commitOid) || !SHA1.test(treeOid)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
  }
  const status = runGit(gitExecutable, repositoryRoot, [
    'status', '--porcelain=v1', '-z', '--untracked-files=all',
  ], expectedExecutableIdentity, { binary: true });
  if (status.length !== 0) refuse('TOOLCHAIN_OBSERVATION_REFUSED_STATE');
  return { commitOid, treeOid };
}

function executableIdentity(target, version, maximumBytes) {
  const bytes = readRegularFile(target, maximumBytes);
  return {
    version,
    executableRawSha256: sha256Raw(bytes),
    executableByteLength: bytes.length,
  };
}

function executableBytesIdentity(target, maximumBytes) {
  const bytes = readRegularFile(target, maximumBytes);
  return {
    executableRawSha256: sha256Raw(bytes),
    executableByteLength: bytes.length,
  };
}

function assertNoDuplicateJsonMembers(text) {
  const objectScopes = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        if (text[index] === '\\') index += 2;
        else if (text[index] === '"') { index += 1; break; }
        else index += 1;
      }
      let cursor = index;
      while (/\s/u.test(text[cursor] ?? '')) cursor += 1;
      if (text[cursor] === ':' && objectScopes.length > 0) {
        let key;
        try {
          key = JSON.parse(text.slice(start, index));
        } catch {
          refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
        }
        const scope = objectScopes.at(-1);
        if (scope.has(key)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
        scope.add(key);
      }
      continue;
    }
    if (character === '{') objectScopes.push(new Set());
    else if (character === '}') objectScopes.pop();
    index += 1;
  }
}

function readJson(target) {
  const bytes = readRegularFile(target, TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes);
  let text;
  let value;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
    assertNoDuplicateJsonMembers(text);
    value = JSON.parse(text);
  } catch {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  return { bytes, value };
}

function packageIdentity({
  repositoryRoot,
  packageLocator,
  entryLocator,
  expectedName,
  expectedVersion,
}) {
  const packagePath = resolveContained(repositoryRoot, packageLocator);
  const entryPath = resolveContained(repositoryRoot, entryLocator);
  const { bytes: packageBytes, value: packageValue } = readJson(packagePath);
  if (
    packageValue.name !== expectedName
    || packageValue.version !== expectedVersion
    || typeof packageValue.name !== 'string'
    || typeof packageValue.version !== 'string'
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PACKAGE');
  const entryBytes = readRegularFile(entryPath, TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes);
  return {
    name: packageValue.name,
    version: packageValue.version,
    packageLocator,
    packageRawSha256: sha256Raw(packageBytes),
    packageByteLength: packageBytes.length,
    entryLocator,
    entryRawSha256: sha256Raw(entryBytes),
    entryByteLength: entryBytes.length,
  };
}

function assertClosureBounds(rows) {
  if (rows.length === 0 || rows.length > TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureFiles) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
  }
  let total = 0;
  for (const current of rows) {
    total += current.byteLength;
    if (!Number.isSafeInteger(total) || total > TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes) {
      refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
    }
  }
  return total;
}

function closureBody({ id, rule, rootLocator, entryLocator, rows }) {
  rows.sort((left, right) => compareCodeUnits(left.locator, right.locator));
  const total = assertClosureBounds(rows);
  const seen = new Set();
  const caseSeen = new Set();
  for (const current of rows) {
    if (seen.has(current.locator) || caseSeen.has(current.locator.toLowerCase())) {
      refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
    }
    seen.add(current.locator);
    caseSeen.add(current.locator.toLowerCase());
  }
  const body = {
    schema: CLOSURE_SCHEMA,
    id,
    declaration: { rule, rootLocator, entryLocator },
    rows,
    counts: { files: rows.length, bytes: total },
    authorizing: false,
  };
  return {
    ...body,
    closureDigest: sha256Canonical(body.schema, body),
  };
}

function observeFilesystemClosure(repositoryRoot, rootLocator, entryLocator) {
  const closureRoot = resolveContained(repositoryRoot, rootLocator);
  assertPlainDirectory(closureRoot);
  const files = [];
  let traversalEntries = 0;
  const walk = (directory, locatorPrefix, depth) => {
    if (depth > TOOLCHAIN_PIN_OBSERVATION_LIMITS.locatorDepth) refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
    assertPlainDirectory(directory);
    const entries = readBoundedDirectoryEntries(
      directory,
      TOOLCHAIN_PIN_OBSERVATION_LIMITS.traversalEntries - traversalEntries,
    );
    traversalEntries += entries.length;
    const caseSeen = new Set();
    for (const entry of entries) {
      const foldedName = entry.name.toLowerCase();
      if (caseSeen.has(foldedName)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
      caseSeen.add(foldedName);
    }
    entries.sort((left, right) => compareCodeUnits(left.name, right.name));
    for (const entry of entries) {
      const locator = locatorPrefix === '' ? entry.name : `${locatorPrefix}/${entry.name}`;
      assertCanonicalLocator(locator);
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
      if (entry.isDirectory()) walk(target, locator, depth + 1);
      else if (entry.isFile()) files.push({ locator, target });
      else refuse('TOOLCHAIN_OBSERVATION_REFUSED_PATH');
      if (files.length > TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureFiles) {
        refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
      }
    }
  };
  walk(closureRoot, '', 0);
  files.sort((left, right) => compareCodeUnits(left.locator, right.locator));
  const rows = [];
  let observedBytes = 0;
  for (const { locator, target } of files) {
    const bytes = readRegularFile(
      target,
      TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes - observedBytes,
    );
    observedBytes += bytes.length;
    rows.push(row(locator, bytes));
  }
  return closureBody({
    id: 'typescript',
    rule: 'all-regular-files-under-package-root.v1',
    rootLocator,
    entryLocator: path.posix.relative(`${rootLocator}/`, entryLocator),
    rows,
  });
}

function parseLsTreeRows(bytes) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
  }
  const rows = [];
  let start = 0;
  while (start < text.length) {
    const end = text.indexOf('\0', start);
    if (end === -1) refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
    if (rows.length >= Math.min(
      TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureFiles,
      TOOLCHAIN_PIN_OBSERVATION_LIMITS.traversalEntries,
    )) refuse('TOOLCHAIN_OBSERVATION_REFUSED_LIMIT');
    const record = text.slice(start, end);
    if (record === '') refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u.exec(record);
    if (!match) refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
    rows.push({ mode: match[1], gitBlobOid: match[2], locator: match[3] });
    start = end + 1;
  }
  return rows;
}

function gitBlobOid(bytes, objectFormat) {
  return createHash(objectFormat)
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

function trackedBlobRow(gitExecutable, repositoryRoot, expectedExecutableIdentity, locator, objectFormat) {
  assertCanonicalLocator(locator);
  const output = runGit(gitExecutable, repositoryRoot, [
    'ls-tree', '--full-tree', 'HEAD', '--', locator,
  ], expectedExecutableIdentity).trim();
  const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u.exec(output);
  if (!match || match[3] !== locator) refuse('TOOLCHAIN_OBSERVATION_REFUSED_STATE');
  const bytes = readRegularFile(
    resolveContained(repositoryRoot, locator),
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes,
  );
  if (gitBlobOid(bytes, objectFormat) !== match[2]) refuse('TOOLCHAIN_OBSERVATION_REFUSED_STATE');
  return { gitBlobOid: match[2], bytes };
}

function assertExactKeys(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
}

function equalCanonical(left, right) {
  return canonicalToolchainObservationText(left) === canonicalToolchainObservationText(right);
}

function assertCanonicalSortedRows(rows, tuple) {
  if (!Array.isArray(rows)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  for (let index = 1; index < rows.length; index += 1) {
    const previous = tuple(rows[index - 1]);
    const current = tuple(rows[index]);
    for (let item = 0; item < previous.length; item += 1) {
      if (previous[item] < current[item]) break;
      if (previous[item] > current[item]) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
      if (item === previous.length - 1) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
    }
  }
}

function sourceEdgeTuple(edge) {
  return [edge.fromLocator, edge.kind, edge.exportName ?? '', edge.specifier, edge.toLocator];
}

function assertExactSourceEdgeRows(rows) {
  assertCanonicalSortedRows(rows, sourceEdgeTuple);
  if (!equalCanonical(rows, SOURCE_EDGE_ROWS)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
}

function readSourceProject(gitExecutable, repositoryRoot, expectedExecutableIdentity, objectFormat) {
  const tracked = trackedBlobRow(
    gitExecutable, repositoryRoot, expectedExecutableIdentity, SOURCE_PROJECT_LOCATOR, objectFormat,
  );
  const { value } = readJson(resolveContained(repositoryRoot, SOURCE_PROJECT_LOCATOR));
  assertExactKeys(value, ['extends', 'files', 'include', 'compilerOptions']);
  if (value.extends !== './tsconfig.json' || !equalCanonical(value.files, [SOURCE_ENTRY_LOCAL_LOCATOR])
    || !equalCanonical(value.include, [])) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertExactKeys(value.compilerOptions, [
    'types', 'noEmitOnError', 'incremental', 'composite', 'sourceMap', 'declarationMap',
  ]);
  if (!equalCanonical(value.compilerOptions, {
    types: [], noEmitOnError: true, incremental: false, composite: false, sourceMap: false, declarationMap: false,
  })) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  return {
    rootLocator: COMPILER_ROOT_LOCATOR,
    locator: 'tsconfig.source-origin-parser.json',
    gitBlobOid: tracked.gitBlobOid,
    rawSha256: sha256Raw(tracked.bytes),
    byteLength: tracked.bytes.length,
    extendsLocator: value.extends,
    files: value.files,
    include: value.include,
    compilerOptions: value.compilerOptions,
  };
}

function readSourceEntry(gitExecutable, repositoryRoot, expectedExecutableIdentity, objectFormat) {
  const tracked = trackedBlobRow(
    gitExecutable, repositoryRoot, expectedExecutableIdentity, SOURCE_ENTRY_LOCATOR, objectFormat,
  );
  return {
    rootLocator: COMPILER_ROOT_LOCATOR,
    locator: SOURCE_ENTRY_LOCAL_LOCATOR,
    gitBlobOid: tracked.gitBlobOid,
    rawSha256: sha256Raw(tracked.bytes),
    byteLength: tracked.bytes.length,
    exportNames: ['lex', 'parseGateV3', 'parseProgram'],
  };
}

function loadPinnedTypeScript(repositoryRoot, expectedRawSha256) {
  const target = resolveContained(repositoryRoot, TYPESCRIPT_ENTRY_LOCATOR);
  const before = readRegularFile(target, TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes);
  if (sha256Raw(before) !== expectedRawSha256) refuse('TOOLCHAIN_OBSERVATION_REFUSED_DRIFT');
  const requireExact = createRequire(import.meta.url);
  let typescript;
  try {
    delete requireExact.cache[target];
    typescript = requireExact(target);
  } catch {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_TYPESCRIPT');
  }
  const after = readRegularFile(target, TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes);
  if (sha256Raw(after) !== expectedRawSha256 || before.equals(after) === false) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_DRIFT');
  }
  if (typescript === null || typeof typescript !== 'object'
    || typeof typescript.createSourceFile !== 'function' || typeof typescript.forEachChild !== 'function') {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_TYPESCRIPT');
  }
  return typescript;
}

function resolveSourceSpecifier(fromLocator, specifier, members) {
  if (typeof specifier !== 'string' || !specifier.startsWith('.') || !specifier.endsWith('.js')) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
  }
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromLocator), `${specifier.slice(0, -3)}.ts`));
  if (target.startsWith('../') || target === '..' || !members.has(target)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
  }
  return target;
}

function scanSourceEdges(typescript, sources) {
  const members = new Set(sources.keys());
  const rows = [];
  for (const [fromLocator, bytes] of sources) {
    const entryExportNames = [];
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE'); }
    const sourceFile = typescript.createSourceFile(
      fromLocator, text, typescript.ScriptTarget.Latest, false, typescript.ScriptKind.TS,
    );
    if (!sourceFile || sourceFile.parseDiagnostics?.length > 0 || sourceFile.referencedFiles?.length > 0
      || sourceFile.typeReferenceDirectives?.length > 0 || sourceFile.libReferenceDirectives?.length > 0) {
      refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
    }
    const add = (kind, exportName, moduleSpecifier) => {
      if (!moduleSpecifier || !typescript.isStringLiteral(moduleSpecifier)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
      const specifier = moduleSpecifier.text;
      rows.push({
        fromLocator,
        kind,
        exportName,
        specifier,
        toLocator: resolveSourceSpecifier(fromLocator, specifier, members),
      });
    };
    for (const statement of sourceFile.statements) {
      if (typescript.isImportDeclaration(statement)) {
        if (statement.attributes || statement.assertClause) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
        add(statement.importClause?.isTypeOnly ? 'IMPORT_TYPE' : 'IMPORT', null, statement.moduleSpecifier);
      } else if (typescript.isExportDeclaration(statement) && statement.moduleSpecifier) {
        if (statement.attributes || statement.assertClause) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
        if (statement.exportClause && typescript.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            if (fromLocator === SOURCE_ENTRY_LOCAL_LOCATOR
              && (statement.isTypeOnly || element.isTypeOnly || element.propertyName)) {
              refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
            }
            entryExportNames.push(element.name.text);
            add('EXPORT_FROM', element.name.text, statement.moduleSpecifier);
          }
        } else if (statement.exportClause && typescript.isNamespaceExport(statement.exportClause)) {
          if (fromLocator === SOURCE_ENTRY_LOCAL_LOCATOR) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
          add('EXPORT_FROM', statement.exportClause.name.text, statement.moduleSpecifier);
        } else add('EXPORT_FROM', null, statement.moduleSpecifier);
      } else if (fromLocator === SOURCE_ENTRY_LOCAL_LOCATOR
        && (typescript.isExportDeclaration(statement) || typescript.isExportAssignment(statement)
          || statement.modifiers?.some((modifier) => modifier.kind === typescript.SyntaxKind.ExportKeyword))) {
        refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
      }
    }
    const inspect = (node) => {
      if (typescript.isImportTypeNode(node)
        || (typescript.isCallExpression(node) && (node.expression.kind === typescript.SyntaxKind.ImportKeyword
          || (typescript.isIdentifier(node.expression) && node.expression.text === 'require')))
        || (typescript.isPropertyAccessExpression(node) && node.name.text === 'resolve'
          && node.expression?.kind === typescript.SyntaxKind.MetaProperty
          && node.expression.keywordToken === typescript.SyntaxKind.ImportKeyword)) {
        refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
      }
      typescript.forEachChild(node, inspect);
    };
    inspect(sourceFile);
    if (fromLocator === SOURCE_ENTRY_LOCAL_LOCATOR
      && !equalCanonical(entryExportNames.sort(compareCodeUnits), ['lex', 'parseGateV3', 'parseProgram'])) {
      refuse('TOOLCHAIN_OBSERVATION_REFUSED_SOURCE');
    }
  }
  rows.sort((left, right) => {
    const leftTuple = sourceEdgeTuple(left);
    const rightTuple = sourceEdgeTuple(right);
    for (let index = 0; index < leftTuple.length; index += 1) {
      const compared = compareCodeUnits(leftTuple[index], rightTuple[index]);
      if (compared !== 0) return compared;
    }
    return 0;
  });
  assertExactSourceEdgeRows(rows);
  return rows;
}

function observeExactSourceClosure(gitExecutable, repositoryRoot, expectedExecutableIdentity, objectFormat, typescriptHash) {
  const sources = new Map();
  const rows = [];
  for (const localLocator of SOURCE_MEMBER_LOCATORS) {
    const fullLocator = `${COMPILER_ROOT_LOCATOR}/${localLocator}`;
    const tracked = trackedBlobRow(gitExecutable, repositoryRoot, expectedExecutableIdentity, fullLocator, objectFormat);
    sources.set(localLocator, tracked.bytes);
    rows.push(row(localLocator, tracked.bytes));
  }
  const typescript = loadPinnedTypeScript(repositoryRoot, typescriptHash);
  scanSourceEdges(typescript, sources);
  return closureBody({
    id: 'source-origin-parser-source',
    rule: 'exact-source-edge-row-closure.v1',
    rootLocator: COMPILER_ROOT_LOCATOR,
    entryLocator: SOURCE_ENTRY_LOCAL_LOCATOR,
    rows,
  });
}

function provenanceBlob(
  gitExecutable,
  repositoryRoot,
  expectedExecutableIdentity,
  descriptor,
  objectFormat,
) {
  const output = runGit(gitExecutable, repositoryRoot, [
    'ls-tree', '--full-tree', 'HEAD', '--', descriptor.locator,
  ], expectedExecutableIdentity).trim();
  const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u.exec(output);
  if (!match || match[3] !== descriptor.locator) refuse('TOOLCHAIN_OBSERVATION_REFUSED_GIT');
  const bytes = readRegularFile(
    resolveContained(repositoryRoot, descriptor.locator),
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes,
  );
  if (gitBlobOid(bytes, objectFormat) !== match[2]) refuse('TOOLCHAIN_OBSERVATION_REFUSED_STATE');
  return {
    role: descriptor.role,
    locator: descriptor.locator,
    gitBlobOid: match[2],
    rawSha256: sha256Raw(bytes),
    byteLength: bytes.length,
  };
}

function compilerLockObservation(
  gitExecutable,
  repositoryRoot,
  expectedExecutableIdentity,
  objectFormat,
) {
  const lockPath = resolveContained(repositoryRoot, COMPILER_LOCK_LOCATOR);
  const { bytes, value } = readJson(lockPath);
  const treeOutput = runGit(gitExecutable, repositoryRoot, [
    'ls-tree', '--full-tree', 'HEAD', '--', COMPILER_LOCK_LOCATOR,
  ], expectedExecutableIdentity).trim();
  const treeMatch = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u.exec(treeOutput);
  if (
    !treeMatch
    || treeMatch[3] !== COMPILER_LOCK_LOCATOR
    || gitBlobOid(bytes, objectFormat) !== treeMatch[2]
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_STATE');
  const compilerPackage = value.packages?.[''];
  const typescript = value.packages?.['node_modules/typescript'];
  if (
    value.lockfileVersion !== 3
    || typeof value.name !== 'string'
    || typeof value.version !== 'string'
    || compilerPackage === null
    || typeof compilerPackage !== 'object'
    || Array.isArray(compilerPackage)
    || compilerPackage.name !== value.name
    || compilerPackage.version !== value.version
    || typeof compilerPackage.devDependencies?.typescript !== 'string'
    || typescript === null
    || typeof typescript !== 'object'
    || Array.isArray(typescript)
    || typeof typescript.version !== 'string'
    || typeof typescript.resolved !== 'string'
    || typeof typescript.integrity !== 'string'
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  return {
    locator: COMPILER_LOCK_LOCATOR,
    gitBlobOid: treeMatch[2],
    rawSha256: sha256Raw(bytes),
    byteLength: bytes.length,
    lockfileVersion: value.lockfileVersion,
    compilerPackage: {
      name: compilerPackage.name,
      version: compilerPackage.version,
      typescriptDependencyRange: compilerPackage.devDependencies.typescript,
    },
    typescriptDependency: {
      packageKey: 'node_modules/typescript',
      version: typescript.version,
      resolved: typescript.resolved,
      integrity: typescript.integrity,
    },
  };
}

function validateRoot(repositoryRoot, gitExecutable) {
  if (!path.isAbsolute(repositoryRoot) || !path.isAbsolute(gitExecutable)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_ROOT');
  }
  assertPlainDirectory(repositoryRoot);
  return realpathSync.native(repositoryRoot);
}

function validateGitRepositoryRoot(gitExecutable, repositoryRoot, expectedExecutableIdentity) {
  const reported = runGit(
    gitExecutable,
    repositoryRoot,
    ['rev-parse', '--show-toplevel'],
    expectedExecutableIdentity,
  ).trim();
  let reportedRoot;
  try {
    reportedRoot = realpathSync.native(reported);
  } catch {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_ROOT');
  }
  if (!samePlatformPath(repositoryRoot, reportedRoot)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_ROOT');
  }
}

function readCollectorOptions(options) {
  if (options === null || typeof options !== 'object' || Object.getPrototypeOf(options) !== Object.prototype) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_ROOT');
  }
  const descriptors = Object.getOwnPropertyDescriptors(options);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string')) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_ROOT');
  }
  keys.sort(compareCodeUnits);
  if (
    keys.length !== 2
    || keys[0] !== 'gitExecutable'
    || keys[1] !== 'repositoryRoot'
    || !Object.hasOwn(descriptors.gitExecutable, 'value')
    || !Object.hasOwn(descriptors.repositoryRoot, 'value')
    || typeof descriptors.gitExecutable.value !== 'string'
    || typeof descriptors.repositoryRoot.value !== 'string'
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_ROOT');
  return {
    gitExecutable: descriptors.gitExecutable.value,
    repositoryRoot: descriptors.repositoryRoot.value,
  };
}

function typescriptCompilerCli(repositoryRoot) {
  const bytes = readRegularFile(
    resolveContained(repositoryRoot, TYPESCRIPT_COMPILER_CLI_LOCATOR),
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.closureBytes,
  );
  return {
    rootLocator: TYPESCRIPT_ROOT_LOCATOR,
    locator: 'lib/tsc.js',
    rawSha256: sha256Raw(bytes),
    byteLength: bytes.length,
  };
}

function assertCompilerPackage(repositoryRoot, compilerLock) {
  const compilerPackage = readJson(resolveContained(repositoryRoot, COMPILER_PACKAGE_LOCATOR)).value;
  if (
    compilerPackage.name !== '@galerina/core-compiler'
    || typeof compilerPackage.version !== 'string'
    || compilerPackage.name !== compilerLock.compilerPackage.name
    || compilerPackage.version !== compilerLock.compilerPackage.version
    || compilerPackage.devDependencies?.typescript !== compilerLock.compilerPackage.typescriptDependencyRange
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_PACKAGE');
}

function assertHex(value, expression) {
  if (typeof value !== 'string' || !expression.test(value)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
}

function validateClosure(closure) {
  assertExactKeys(closure, ['schema', 'id', 'declaration', 'rows', 'counts', 'authorizing', 'closureDigest']);
  if (closure.schema !== CLOSURE_SCHEMA || closure.authorizing !== false) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertExactKeys(closure.declaration, ['rule', 'rootLocator', 'entryLocator']);
  assertExactKeys(closure.counts, ['files', 'bytes']);
  if (!Array.isArray(closure.rows) || closure.rows.length === 0 || closure.counts.files !== closure.rows.length
    || !Number.isSafeInteger(closure.counts.bytes) || closure.counts.bytes < 0) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertCanonicalSortedRows(closure.rows, (current) => [current.locator]);
  let bytes = 0;
  for (const current of closure.rows) {
    assertExactKeys(current, ['locator', 'rawSha256', 'byteLength']);
    assertCanonicalLocator(current.locator);
    assertHex(current.rawSha256, SHA256);
    if (!Number.isSafeInteger(current.byteLength) || current.byteLength < 0) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
    bytes += current.byteLength;
  }
  if (!Number.isSafeInteger(bytes) || bytes !== closure.counts.bytes
    || closure.closureDigest !== sha256Canonical(CLOSURE_SCHEMA, {
      schema: closure.schema,
      id: closure.id,
      declaration: closure.declaration,
      rows: closure.rows,
      counts: closure.counts,
      authorizing: closure.authorizing,
    })) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
}

function validateToolchainPinObservationInternal(value) {
  assertExactKeys(value, [
    'schema', 'repository', 'platform', 'arch', 'gitExecutionBinding',
    'nodeIdentityBefore', 'nodeIdentityAfter', 'gitIdentityBefore', 'gitIdentityAfter',
    'compilerLock', 'typescript', 'typescriptCompilerCli', 'sourceOriginParserEntry',
    'sourceOriginParserProject', 'sourceEdgeRows', 'declaredClosures', 'provenanceBlobs',
    'limits', 'authorizing', 'observationDigest',
  ]);
  if (value.schema !== OBSERVATION_SCHEMA || value.authorizing !== false
    || !['win32', 'linux'].includes(value.platform) || value.arch !== 'x64'
    || value.gitExecutionBinding !== GIT_EXECUTION_BINDING) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertExactKeys(value.repository, ['repositoryId', 'objectFormat', 'pre', 'post']);
  if (value.repository.repositoryId !== REPOSITORY_ID || value.repository.objectFormat !== 'sha1'
    || !equalCanonical(value.repository.pre, value.repository.post)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  for (const endpoint of [value.repository.pre, value.repository.post]) {
    assertExactKeys(endpoint, ['commitOid', 'treeOid']);
    assertHex(endpoint.commitOid, SHA1);
    assertHex(endpoint.treeOid, SHA1);
  }
  for (const identity of [
    value.nodeIdentityBefore, value.nodeIdentityAfter, value.gitIdentityBefore, value.gitIdentityAfter,
  ]) {
    assertExactKeys(identity, ['version', 'executableRawSha256', 'executableByteLength']);
    if (typeof identity.version !== 'string' || !Number.isSafeInteger(identity.executableByteLength)
      || identity.executableByteLength < 0) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
    assertHex(identity.executableRawSha256, SHA256);
  }
  if (!equalCanonical(value.nodeIdentityBefore, value.nodeIdentityAfter)
    || !equalCanonical(value.gitIdentityBefore, value.gitIdentityAfter)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertExactKeys(value.compilerLock, [
    'locator', 'gitBlobOid', 'rawSha256', 'byteLength', 'lockfileVersion', 'compilerPackage', 'typescriptDependency',
  ]);
  if (value.compilerLock.locator !== COMPILER_LOCK_LOCATOR || value.compilerLock.lockfileVersion !== 3) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  assertHex(value.compilerLock.gitBlobOid, SHA1);
  assertHex(value.compilerLock.rawSha256, SHA256);
  assertExactKeys(value.compilerLock.compilerPackage, ['name', 'version', 'typescriptDependencyRange']);
  assertExactKeys(value.compilerLock.typescriptDependency, ['packageKey', 'version', 'resolved', 'integrity']);
  if (value.compilerLock.compilerPackage.name !== '@galerina/core-compiler'
    || value.compilerLock.typescriptDependency.packageKey !== 'node_modules/typescript') {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  assertExactKeys(value.typescript, [
    'name', 'version', 'packageLocator', 'packageRawSha256', 'packageByteLength',
    'entryLocator', 'entryRawSha256', 'entryByteLength',
  ]);
  if (value.typescript.name !== 'typescript' || value.typescript.version !== value.compilerLock.typescriptDependency.version
    || value.typescript.packageLocator !== TYPESCRIPT_PACKAGE_LOCATOR || value.typescript.entryLocator !== TYPESCRIPT_ENTRY_LOCATOR) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  assertExactKeys(value.typescriptCompilerCli, ['rootLocator', 'locator', 'rawSha256', 'byteLength']);
  if (value.typescriptCompilerCli.rootLocator !== TYPESCRIPT_ROOT_LOCATOR || value.typescriptCompilerCli.locator !== 'lib/tsc.js') {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  assertExactKeys(value.sourceOriginParserEntry, ['rootLocator', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength', 'exportNames']);
  if (value.sourceOriginParserEntry.rootLocator !== COMPILER_ROOT_LOCATOR
    || value.sourceOriginParserEntry.locator !== SOURCE_ENTRY_LOCAL_LOCATOR
    || !equalCanonical(value.sourceOriginParserEntry.exportNames, ['lex', 'parseGateV3', 'parseProgram'])) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  assertExactKeys(value.sourceOriginParserProject, [
    'rootLocator', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength', 'extendsLocator', 'files', 'include', 'compilerOptions',
  ]);
  if (value.sourceOriginParserProject.rootLocator !== COMPILER_ROOT_LOCATOR
    || value.sourceOriginParserProject.locator !== 'tsconfig.source-origin-parser.json'
    || value.sourceOriginParserProject.extendsLocator !== './tsconfig.json'
    || !equalCanonical(value.sourceOriginParserProject.files, [SOURCE_ENTRY_LOCAL_LOCATOR])
    || !equalCanonical(value.sourceOriginParserProject.include, [])) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertExactKeys(value.sourceOriginParserProject.compilerOptions, [
    'types', 'noEmitOnError', 'incremental', 'composite', 'sourceMap', 'declarationMap',
  ]);
  assertExactSourceEdgeRows(value.sourceEdgeRows);
  if (!Array.isArray(value.declaredClosures) || value.declaredClosures.length !== 2) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertCanonicalSortedRows(value.declaredClosures, (current) => [current.id]);
  for (const closure of value.declaredClosures) validateClosure(closure);
  const sourceClosure = value.declaredClosures[0];
  const typescriptClosure = value.declaredClosures[1];
  if (sourceClosure.id !== 'source-origin-parser-source'
    || sourceClosure.declaration.rule !== 'exact-source-edge-row-closure.v1'
    || sourceClosure.declaration.rootLocator !== COMPILER_ROOT_LOCATOR
    || sourceClosure.declaration.entryLocator !== SOURCE_ENTRY_LOCAL_LOCATOR
    || sourceClosure.counts.files !== 5
    || !equalCanonical(sourceClosure.rows.map((rowValue) => rowValue.locator), SOURCE_MEMBER_LOCATORS)
    || typescriptClosure.id !== 'typescript'
    || typescriptClosure.declaration.rule !== 'all-regular-files-under-package-root.v1'
    || typescriptClosure.declaration.rootLocator !== TYPESCRIPT_ROOT_LOCATOR
    || typescriptClosure.declaration.entryLocator !== 'lib/typescript.js') refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  if (!Array.isArray(value.provenanceBlobs) || value.provenanceBlobs.length !== PROVENANCE.length) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  assertCanonicalSortedRows(value.provenanceBlobs, (current) => [current.role]);
  for (let index = 0; index < PROVENANCE.length; index += 1) {
    const observed = value.provenanceBlobs[index];
    const expected = PROVENANCE[index];
    assertExactKeys(observed, ['role', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength']);
    if (observed.role !== expected.role || observed.locator !== expected.locator) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  if (!equalCanonical(value.limits, TOOLCHAIN_PIN_OBSERVATION_LIMITS)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  const { observationDigest, ...body } = value;
  if (typeof observationDigest !== 'string' || observationDigest !== sha256Canonical(OBSERVATION_SCHEMA, body)) {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA');
  }
  return value;
}

export function validateToolchainPinObservation(value) {
  try {
    return validateToolchainPinObservationInternal(value);
  } catch (error) {
    if (error instanceof ToolchainPinObservationRefusal) throw error;
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL');
  }
}

async function collectToolchainPinObservationInternal(options) {
  const { repositoryRoot, gitExecutable } = readCollectorOptions(options);
  const root = validateRoot(repositoryRoot, gitExecutable);
  if (!['win32', 'linux'].includes(process.platform) || process.arch !== 'x64') {
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_IDENTITY');
  }
  if (!FULL_NODE_VERSION.test(process.version)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_IDENTITY');

  const nodeIdentityBefore = executableIdentity(
    process.execPath,
    process.version,
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.executableBytes,
  );
  const gitExecutableBytesBefore = executableBytesIdentity(
    gitExecutable,
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.executableBytes,
  );
  validateGitRepositoryRoot(gitExecutable, root, gitExecutableBytesBefore);
  const gitVersionOutput = runGit(
    gitExecutable, root, ['--version'], gitExecutableBytesBefore,
  ).trim();
  const gitVersionMatch = GIT_VERSION.exec(gitVersionOutput);
  if (!gitVersionMatch) refuse('TOOLCHAIN_OBSERVATION_REFUSED_IDENTITY');
  const gitIdentityBefore = {
    version: gitVersionMatch[1],
    ...gitExecutableBytesBefore,
  };
  const pre = readGitState(gitExecutable, root, gitExecutableBytesBefore);
  const objectFormat = 'sha1';
  const compilerLock = compilerLockObservation(
    gitExecutable, root, gitExecutableBytesBefore, objectFormat,
  );
  const typescript = packageIdentity({
    repositoryRoot: root,
    packageLocator: TYPESCRIPT_PACKAGE_LOCATOR,
    entryLocator: TYPESCRIPT_ENTRY_LOCATOR,
    expectedName: 'typescript',
    expectedVersion: compilerLock.typescriptDependency.version,
  });
  assertCompilerPackage(root, compilerLock);
  const typescriptCompilerCliBefore = typescriptCompilerCli(root);
  const sourceOriginParserEntry = readSourceEntry(gitExecutable, root, gitExecutableBytesBefore, objectFormat);
  const sourceOriginParserProject = readSourceProject(gitExecutable, root, gitExecutableBytesBefore, objectFormat);
  const declaredClosures = [
    observeExactSourceClosure(gitExecutable, root, gitExecutableBytesBefore, objectFormat, typescript.entryRawSha256),
    observeFilesystemClosure(root, TYPESCRIPT_ROOT_LOCATOR, TYPESCRIPT_ENTRY_LOCATOR),
  ].sort((left, right) => compareCodeUnits(left.id, right.id));
  const provenanceBlobs = PROVENANCE.map((descriptor) => provenanceBlob(
    gitExecutable,
    root,
    gitExecutableBytesBefore,
    descriptor,
    objectFormat,
  ));

  const repeatedCompilerLock = compilerLockObservation(
    gitExecutable, root, gitExecutableBytesBefore, objectFormat,
  );
  const repeatedTypescript = packageIdentity({
    repositoryRoot: root,
    packageLocator: TYPESCRIPT_PACKAGE_LOCATOR,
    entryLocator: TYPESCRIPT_ENTRY_LOCATOR,
    expectedName: 'typescript',
    expectedVersion: repeatedCompilerLock.typescriptDependency.version,
  });
  assertCompilerPackage(root, repeatedCompilerLock);
  const typescriptCompilerCliAfter = typescriptCompilerCli(root);
  const repeatedSourceOriginParserEntry = readSourceEntry(gitExecutable, root, gitExecutableBytesBefore, objectFormat);
  const repeatedSourceOriginParserProject = readSourceProject(gitExecutable, root, gitExecutableBytesBefore, objectFormat);
  const repeatedDeclaredClosures = [
    observeExactSourceClosure(gitExecutable, root, gitExecutableBytesBefore, objectFormat, repeatedTypescript.entryRawSha256),
    observeFilesystemClosure(root, TYPESCRIPT_ROOT_LOCATOR, TYPESCRIPT_ENTRY_LOCATOR),
  ].sort((left, right) => compareCodeUnits(left.id, right.id));
  const repeatedProvenanceBlobs = PROVENANCE.map((descriptor) => provenanceBlob(
    gitExecutable,
    root,
    gitExecutableBytesBefore,
    descriptor,
    objectFormat,
  ));
  const post = readGitState(gitExecutable, root, gitExecutableBytesBefore);
  const nodeVersionAfter = process.version;
  if (!FULL_NODE_VERSION.test(nodeVersionAfter)) refuse('TOOLCHAIN_OBSERVATION_REFUSED_IDENTITY');
  const gitVersionOutputAfter = runGit(
    gitExecutable, root, ['--version'], gitExecutableBytesBefore,
  ).trim();
  const gitVersionMatchAfter = GIT_VERSION.exec(gitVersionOutputAfter);
  if (!gitVersionMatchAfter) refuse('TOOLCHAIN_OBSERVATION_REFUSED_IDENTITY');
  const nodeIdentityAfter = executableIdentity(
    process.execPath,
    nodeVersionAfter,
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.executableBytes,
  );
  const gitIdentityAfter = executableIdentity(
    gitExecutable,
    gitVersionMatchAfter[1],
    TOOLCHAIN_PIN_OBSERVATION_LIMITS.executableBytes,
  );
  if (
    canonicalToolchainObservationText(pre) !== canonicalToolchainObservationText(post)
    || canonicalToolchainObservationText(nodeIdentityBefore) !== canonicalToolchainObservationText(nodeIdentityAfter)
    || canonicalToolchainObservationText(gitIdentityBefore) !== canonicalToolchainObservationText(gitIdentityAfter)
    || canonicalToolchainObservationText(compilerLock) !== canonicalToolchainObservationText(repeatedCompilerLock)
    || canonicalToolchainObservationText(typescript) !== canonicalToolchainObservationText(repeatedTypescript)
    || canonicalToolchainObservationText(typescriptCompilerCliBefore) !== canonicalToolchainObservationText(typescriptCompilerCliAfter)
    || canonicalToolchainObservationText(sourceOriginParserEntry) !== canonicalToolchainObservationText(repeatedSourceOriginParserEntry)
    || canonicalToolchainObservationText(sourceOriginParserProject) !== canonicalToolchainObservationText(repeatedSourceOriginParserProject)
    || canonicalToolchainObservationText(declaredClosures) !== canonicalToolchainObservationText(repeatedDeclaredClosures)
    || canonicalToolchainObservationText(provenanceBlobs) !== canonicalToolchainObservationText(repeatedProvenanceBlobs)
  ) refuse('TOOLCHAIN_OBSERVATION_REFUSED_DRIFT');

  const body = {
    schema: OBSERVATION_SCHEMA,
    repository: { repositoryId: REPOSITORY_ID, objectFormat, pre, post },
    platform: process.platform,
    arch: process.arch,
    gitExecutionBinding: GIT_EXECUTION_BINDING,
    nodeIdentityBefore,
    nodeIdentityAfter,
    gitIdentityBefore,
    gitIdentityAfter,
    compilerLock,
    typescript,
    typescriptCompilerCli: typescriptCompilerCliBefore,
    sourceOriginParserEntry,
    sourceOriginParserProject,
    sourceEdgeRows: SOURCE_EDGE_ROWS,
    declaredClosures,
    provenanceBlobs,
    limits: TOOLCHAIN_PIN_OBSERVATION_LIMITS,
    authorizing: false,
  };
  const observation = Object.freeze({
    ...body,
    observationDigest: sha256Canonical(body.schema, body),
  });
  return Object.freeze(validateToolchainPinObservation(observation));
}

export async function collectToolchainPinObservation(options) {
  try {
    return await collectToolchainPinObservationInternal(options);
  } catch (error) {
    if (error instanceof ToolchainPinObservationRefusal) throw error;
    refuse('TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL');
  }
}
