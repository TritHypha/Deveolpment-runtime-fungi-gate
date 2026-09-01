import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  canonicalJsonText,
  validateToolchainPins,
} from '../lib/logic-aig-source-origin/contract.mjs';

const COLLECTOR_MODULE = '../lib/logic-aig-source-origin/toolchain-pin-observation.mjs';
const COLLECTOR_CLI = '../logic-aig-source-origin-toolchain-pin-observation.mjs';
const COLLECTOR_WORKFLOW = '../../.github/workflows/rd0873-toolchain-pin-observation.yml';

function git(gitExecutable, repositoryRoot, ...args) {
  return execFileSync(gitExecutable, ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  }).trim();
}

function resolveGitExecutable() {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const output = execFileSync(locator, ['git'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  });
  const candidates = output.split(/\r?\n/u).filter(Boolean).map((value) => realpathSync(value));
  const singleLinkCandidate = candidates.find((value) => {
    const stats = lstatSync(value, { bigint: true });
    return stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1n;
  });
  assert(singleLinkCandidate, 'test fixture requires one resolved single-link Git endpoint');
  return singleLinkCandidate;
}

function writeFixtureFile(root, locator, body) {
  const target = path.join(root, ...locator.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, body);
}

function createCanonicalTemporaryDirectory(prefix) {
  return realpathSync.native(mkdtempSync(path.join(tmpdir(), prefix)));
}

function createRepositoryFixture() {
  const root = createCanonicalTemporaryDirectory('rd0873-pin-observation-');
  const gitExecutable = resolveGitExecutable();

  writeFixtureFile(root, '.gitignore', 'packages-ts/galerina-core-compiler/node_modules/\n');
  writeFixtureFile(root, '.github/workflows/rd0873-toolchain-pin-observation.yml', 'name: fixture\n');
  writeFixtureFile(root, 'scripts/lib/logic-aig-source-origin/toolchain-pin-observation.mjs', 'export const fixture = true;\n');
  writeFixtureFile(root, 'scripts/logic-aig-source-origin-toolchain-pin-observation.mjs', 'export const fixture = true;\n');
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/package.json', JSON.stringify({
    name: '@galerina/core-compiler',
    version: '1.0.0-fixture',
    type: 'module',
    main: './dist/index.js',
    devDependencies: { typescript: '^5.9.0' },
  }, null, 2));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/package-lock.json', JSON.stringify({
    name: '@galerina/core-compiler',
    version: '1.0.0-fixture',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: '@galerina/core-compiler',
        version: '1.0.0-fixture',
        devDependencies: { typescript: '^5.9.0' },
      },
      'node_modules/typescript': {
        version: '5.9.3',
        resolved: 'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz',
        integrity: 'sha512-fixture',
        dev: true,
        license: 'Apache-2.0',
      },
    },
  }, null, 2));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/tsconfig.json', '{"include":["src/**/*.ts"]}\n');
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/index.ts', 'export { parseProgram } from "./parser.js";\n');
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/parser.ts', 'export function parseProgram() { throw new Error("must not run"); }\n');
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/node_modules/typescript/package.json', JSON.stringify({
    name: 'typescript',
    version: '5.9.3',
    main: './lib/typescript.js',
  }, null, 2));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/node_modules/typescript/lib/typescript.js', 'throw new Error("must not execute");\n');
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/node_modules/typescript/lib/lib.d.ts', 'declare const fixture: true;\n');

  execFileSync(gitExecutable, ['init', root], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 });
  git(gitExecutable, root, 'config', 'core.autocrlf', 'false');
  git(gitExecutable, root, 'add', '--', '.gitignore', '.github', 'scripts', 'packages-ts/galerina-core-compiler/package.json', 'packages-ts/galerina-core-compiler/package-lock.json', 'packages-ts/galerina-core-compiler/tsconfig.json', 'packages-ts/galerina-core-compiler/src');
  execFileSync(gitExecutable, [
    '-C', root,
    '-c', 'user.name=RD0873 Fixture',
    '-c', 'user.email=rd0873-fixture@example.invalid',
    'commit', '-m', 'fixture',
  ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 });

  return { root, gitExecutable };
}

function commitFixture(gitExecutable, root, message) {
  git(gitExecutable, root, 'add', '--', '.');
  execFileSync(gitExecutable, [
    '-C', root,
    '-c', 'user.name=RD0873 Fixture',
    '-c', 'user.email=rd0873-fixture@example.invalid',
    'commit', '-m', message,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 10_000 });
}

function createExecutableRepositoryFixture() {
  const fixture = createRepositoryFixture();
  const moduleBytes = readFileSync(new URL(COLLECTOR_MODULE, import.meta.url));
  const cliBytes = readFileSync(new URL(COLLECTOR_CLI, import.meta.url));
  writeFixtureFile(
    fixture.root,
    'scripts/lib/logic-aig-source-origin/toolchain-pin-observation.mjs',
    moduleBytes,
  );
  writeFixtureFile(
    fixture.root,
    'scripts/logic-aig-source-origin-toolchain-pin-observation.mjs',
    cliBytes,
  );
  commitFixture(fixture.gitExecutable, fixture.root, 'install collector');
  return fixture;
}

function runCollectorCli({ root, gitExecutable, outputPath }) {
  const cliPath = path.join(root, 'scripts', 'logic-aig-source-origin-toolchain-pin-observation.mjs');
  return spawnSync(process.execPath, [
    cliPath, '--git', gitExecutable, '--out', outputPath,
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    windowsHide: true,
  });
}

function assertBodyFreeCliRefusal(result, code, outputPath) {
  assert.equal(result.status, 2);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `${code}\n`);
  assert.equal(existsSync(outputPath), false);
}

function assertNoForbiddenPinAuthority(value) {
  const forbidden = new Set([
    'records', 'recordDigest', 'pinsDigest', 'selectedPinRecordId',
    'selectedPinRecordDigest', 'actualLoadedModuleRows',
    'actualLoadedBuiltinModules',
  ]);
  const visit = (candidate) => {
    if (candidate === null || typeof candidate !== 'object') return;
    for (const [key, child] of Object.entries(candidate)) {
      assert(!forbidden.has(key), `observation contains forbidden pin-authority field ${key}`);
      visit(child);
    }
  };
  visit(value);
}

function assertExactKeys(value, keys) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

function canonicalDomainDigest(domain, value) {
  return createHash('sha256')
    .update(Buffer.from(domain, 'utf8'))
    .update(Buffer.from([0]))
    .update(Buffer.from(canonicalJsonText(value), 'utf8'))
    .digest('hex');
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectStrings(entry, output));
  }
  return output;
}

async function waitForFile(target) {
  const deadline = Date.now() + 5_000;
  while (!existsSync(target)) {
    if (Date.now() >= deadline) throw new Error('fixture mutator did not start');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function holdFileUnreadable(target) {
  if (process.platform !== 'win32') {
    chmodSync(target, 0o000);
    return async () => chmodSync(target, 0o600);
  }
  const readyFile = path.join(tmpdir(), `rd0873-exclusive-ready-${process.pid}-${Date.now()}`);
  const scriptFile = path.join(tmpdir(), `rd0873-exclusive-lock-${process.pid}-${Date.now()}.ps1`);
  writeFileSync(scriptFile, [
    'param([string]$Target, [string]$Ready)',
    '$stream = [IO.File]::Open($Target, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)',
    '[IO.File]::WriteAllText($Ready, "ready")',
    '[Console]::In.ReadLine() | Out-Null',
    '$stream.Dispose()',
  ].join('\r\n'));
  const locker = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptFile,
    target,
    readyFile,
  ], {
    stdio: ['pipe', 'ignore', 'pipe'],
    windowsHide: true,
  });
  let stderr = '';
  locker.stderr.setEncoding('utf8');
  locker.stderr.on('data', (chunk) => {
    if (stderr.length < 4_096) stderr += chunk.slice(0, 4_096 - stderr.length);
  });
  const deadline = Date.now() + 5_000;
  while (!existsSync(readyFile)) {
    if (locker.exitCode !== null || locker.signalCode !== null) {
      rmSync(scriptFile, { force: true });
      throw new Error(`exclusive-lock fixture exited before ready: ${stderr}`);
    }
    if (Date.now() >= deadline) throw new Error('exclusive-lock fixture did not become ready');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return async () => {
    const exited = locker.exitCode !== null || locker.signalCode !== null
      ? Promise.resolve()
      : new Promise((resolve) => locker.once('exit', resolve));
    locker.stdin.end('\n');
    await exited;
    rmSync(readyFile, { force: true });
    rmSync(scriptFile, { force: true });
  };
}

test('repository fixtures canonicalize aliased temporary roots', { concurrency: false }, (t) => {
  const canonicalBase = realpathSync.native(
    mkdtempSync(path.join(tmpdir(), 'rd0873-pin-alias-base-')),
  );
  const aliasBase = `${canonicalBase}-alias`;
  symlinkSync(canonicalBase, aliasBase, process.platform === 'win32' ? 'junction' : 'dir');
  let fixtureRoot;
  t.after(() => {
    if (fixtureRoot) rmSync(realpathSync.native(fixtureRoot), { recursive: true, force: true });
    rmSync(aliasBase, { recursive: true, force: true });
    rmSync(canonicalBase, { recursive: true, force: true });
  });

  const savedTemporaryEnvironment = new Map(
    ['TMPDIR', 'TMP', 'TEMP'].map((name) => [name, process.env[name]]),
  );
  let fixture;
  try {
    process.env.TMPDIR = aliasBase;
    process.env.TMP = aliasBase;
    process.env.TEMP = aliasBase;
    fixture = createRepositoryFixture();
    fixtureRoot = fixture.root;
  } finally {
    for (const [name, value] of savedTemporaryEnvironment) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }

  assert.equal(fixture.root, realpathSync.native(fixture.root));
});

test('repository fixtures disable Git line-ending conversion before the first add', (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const result = spawnSync(gitExecutable, [
    '-C', root, 'config', '--local', '--get', 'core.autocrlf',
  ], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
    windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout.trim(), 'false');
  assert.equal(result.stderr, '');
});

test('collector emits deterministic canonical observation bytes that remain outside the pin schema', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  const first = await collectToolchainPinObservation({ repositoryRoot: root, gitExecutable });
  const second = await collectToolchainPinObservation({ repositoryRoot: root, gitExecutable });

  assert.deepEqual(second, first);
  assert.equal(first.schema, 'galerina.logic-aig-toolchain-pin-observation.v1');
  assert.equal(first.authorizing, false);
  assert.deepEqual(first.repository.pre, first.repository.post);
  assert.equal(first.platform, process.platform);
  assert.equal(first.arch, process.arch);
  assert.equal(
    first.gitExecutionBinding,
    'cooperative-path-endpoint-sampling.v1',
  );
  assert.match(first.nodeIdentityBefore.version, /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u);
  assert.equal(first.typescript.name, 'typescript');
  assert.equal(first.typescript.version, '5.9.3');
  assert.equal(first.galerinaParser.name, '@galerina/core-compiler');
  assert.match(first.compilerLock.gitBlobOid, /^[0-9a-f]{40}$/u);
  assert.deepEqual(first.declaredClosures.map(({ id }) => id), ['galerina-parser', 'typescript']);
  assert(first.declaredClosures.every(({ rows, counts }) => rows.length === counts.files));
  assert.deepEqual(
    first.provenanceBlobs.map(({ role }) => role),
    ['collector-cli', 'collector-module', 'collector-workflow'],
  );
  assertExactKeys(first, [
    'schema', 'repository', 'platform', 'arch', 'gitExecutionBinding',
    'nodeIdentityBefore', 'nodeIdentityAfter',
    'gitIdentityBefore', 'gitIdentityAfter', 'compilerLock', 'typescript', 'galerinaParser',
    'declaredClosures', 'provenanceBlobs', 'limits', 'authorizing', 'observationDigest',
  ]);
  assertExactKeys(first.repository, ['repositoryId', 'objectFormat', 'pre', 'post']);
  assertExactKeys(first.repository.pre, ['commitOid', 'treeOid']);
  assertExactKeys(first.repository.post, ['commitOid', 'treeOid']);
  for (const identity of [
    first.nodeIdentityBefore, first.nodeIdentityAfter, first.gitIdentityBefore, first.gitIdentityAfter,
  ]) assertExactKeys(identity, ['version', 'executableRawSha256', 'executableByteLength']);
  assertExactKeys(first.compilerLock, [
    'locator', 'gitBlobOid', 'rawSha256', 'byteLength', 'lockfileVersion',
    'compilerPackage', 'typescriptDependency',
  ]);
  assertExactKeys(
    first.compilerLock.compilerPackage,
    ['name', 'version', 'typescriptDependencyRange'],
  );
  assertExactKeys(
    first.compilerLock.typescriptDependency,
    ['packageKey', 'version', 'resolved', 'integrity'],
  );
  for (const packageValue of [first.typescript, first.galerinaParser]) {
    assertExactKeys(packageValue, [
      'name', 'version', 'packageLocator', 'packageRawSha256', 'packageByteLength',
      'entryLocator', 'entryRawSha256', 'entryByteLength',
    ]);
  }
  for (const closure of first.declaredClosures) {
    assertExactKeys(closure, [
      'schema', 'id', 'declaration', 'rows', 'counts', 'authorizing', 'closureDigest',
    ]);
    assertExactKeys(closure.declaration, ['rule', 'rootLocator', 'entryLocator']);
    assertExactKeys(closure.counts, ['files', 'bytes']);
    closure.rows.forEach((closureRow) => assertExactKeys(
      closureRow,
      ['locator', 'rawSha256', 'byteLength'],
    ));
    const { closureDigest, ...closureBody } = closure;
    assert.equal(closureDigest, canonicalDomainDigest(closure.schema, closureBody));
  }
  first.provenanceBlobs.forEach((blob) => assertExactKeys(
    blob,
    ['role', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength'],
  ));
  assertExactKeys(
    first.limits,
    [
      'closureFiles', 'traversalEntries', 'closureBytes', 'executableBytes',
      'locatorDepth', 'locatorBytes',
    ],
  );
  const { observationDigest, ...observationBody } = first;
  assert.equal(observationDigest, canonicalDomainDigest(first.schema, observationBody));
  assertNoForbiddenPinAuthority(first);

  const bytes = Buffer.from(canonicalJsonText(first), 'utf8');
  assert.equal(bytes.at(-1), 0x7d);
  assert.doesNotMatch(bytes.toString('utf8'), /[A-Za-z]:\\|\/home\/|\/Users\//u);
  const retainedStrings = collectStrings(first);
  assert(retainedStrings.every((value) => !path.isAbsolute(value)));
  assert(retainedStrings.every((value) => !value.includes(root)));
  assert(retainedStrings.every((value) => !value.includes('must not run')));
  assert(retainedStrings.every((value) => !value.includes('must not execute')));
  assert.throws(() => validateToolchainPins(first), /SOURCE_ORIGIN_(?:POLICY|SCHEMA)/u);
});

test('canonical locator validation enforces UTF-8 bytes, depth, NFC and traversal limits', async () => {
  const {
    TOOLCHAIN_PIN_OBSERVATION_LIMITS,
    validateToolchainPinObservationLocator,
  } = await import(COLLECTOR_MODULE);
  assert.equal(TOOLCHAIN_PIN_OBSERVATION_LIMITS.locatorBytes, 4_096);
  assert.equal(TOOLCHAIN_PIN_OBSERVATION_LIMITS.locatorDepth, 64);
  assert.equal(validateToolchainPinObservationLocator('lib/typescript.js'), 'lib/typescript.js');
  assert.throws(
    () => validateToolchainPinObservationLocator('a'.repeat(4_097)),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
  );
  assert.throws(
    () => validateToolchainPinObservationLocator(Array.from({ length: 65 }, () => 'a').join('/')),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
  );
  assert.throws(
    () => validateToolchainPinObservationLocator('lib/e\u0301.js'),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PATH',
  );
  assert.throws(
    () => validateToolchainPinObservationLocator('lib/../outside.js'),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PATH',
  );
});

test('collector refuses unsupported platform and architecture identities', (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const moduleUrl = new URL(COLLECTOR_MODULE, import.meta.url).href;
  const script = [
    `const collector = await import(${JSON.stringify(moduleUrl)});`,
    "Object.defineProperty(process, 'platform', { value: 'darwin' });",
    "Object.defineProperty(process, 'arch', { value: 'arm64' });",
    'try {',
    `  await collector.collectToolchainPinObservation(${JSON.stringify({
      repositoryRoot: root,
      gitExecutable,
    })});`,
    '} catch (error) {',
    "  if (error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_IDENTITY') process.exit(0);",
    '}',
    'process.exit(1);',
  ].join('\n');
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('collector refuses missing or surplus root options before filesystem use', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_ROOT',
  );
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable, surplus: true }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_ROOT',
  );
  await assert.rejects(
    () => collectToolchainPinObservation({
      repositoryRoot: root,
      gitExecutable,
      [Symbol('ambiguous-root-option')]: true,
    }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_ROOT',
  );
});

test('collector contains unexpected Proxy and native path exceptions as stable internal refusals', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  const proxySecret = path.join(root, 'proxy-secret');
  const hostileOptions = new Proxy({}, {
    getPrototypeOf() {
      throw new Error(`unexpected Proxy trap at ${proxySecret}`);
    },
  });
  await assert.rejects(
    () => collectToolchainPinObservation(hostileOptions),
    (error) => (
      error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL'
      && error.message === 'TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL'
      && !String(error).includes(proxySecret)
    ),
  );

  const nativePathSecret = `${root}\0native-path-secret`;
  await assert.rejects(
    () => collectToolchainPinObservation({
      repositoryRoot: nativePathSecret,
      gitExecutable,
    }),
    (error) => (
      error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL'
      && error.message === 'TOOLCHAIN_OBSERVATION_REFUSED_INTERNAL'
      && !String(error).includes(nativePathSecret)
    ),
  );
});

test('collector refuses duplicate package metadata members as schema drift', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFixtureFile(
    root,
    'packages-ts/galerina-core-compiler/node_modules/typescript/package.json',
    '{"name":"typescript","name":"typescript","version":"5.9.3","main":"./lib/typescript.js"}',
  );

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_SCHEMA',
  );
});

test('collector refuses a TypeScript manifest whose declared entry drifts', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFixtureFile(
    root,
    'packages-ts/galerina-core-compiler/node_modules/typescript/package.json',
    JSON.stringify({
      name: 'typescript',
      version: '5.9.3',
      main: './lib/not-typescript.js',
    }),
  );

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PACKAGE',
  );
});

test('collector refuses compiler manifest and committed lock identity disagreement', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lockLocator = 'packages-ts/galerina-core-compiler/package-lock.json';
  const lockPath = path.join(root, ...lockLocator.split('/'));
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  lock.version = '9.9.9-drift';
  lock.packages[''].version = '9.9.9-drift';
  writeFixtureFile(root, lockLocator, JSON.stringify(lock, null, 2));
  commitFixture(gitExecutable, root, 'commit inconsistent lock identity');

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PACKAGE',
  );
});

test('collector refuses an ignored untracked parser entry in place of a frozen Git blob', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entryLocator = 'packages-ts/galerina-core-compiler/src/index.ts';
  rmSync(path.join(root, ...entryLocator.split('/')));
  writeFixtureFile(
    root,
    '.gitignore',
    'packages-ts/galerina-core-compiler/node_modules/\npackages-ts/galerina-core-compiler/src/index.ts\n',
  );
  commitFixture(gitExecutable, root, 'remove and ignore parser entry');
  writeFixtureFile(root, entryLocator, 'export const untrackedParserEntry = true;\n');

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_STATE',
  );
});

test('collector refuses a case-shadowed dependency package root', {
  skip: process.platform === 'win32' ? 'case-insensitive filesystems cannot create this fixture' : false,
}, async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFixtureFile(
    root,
    'packages-ts/galerina-core-compiler/node_modules/TypeScript/package.json',
    '{"name":"typescript","version":"5.9.3"}\n',
  );

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PATH',
  );
});

test('collector refuses case-shadowed directory members inside the TypeScript closure', {
  skip: process.platform === 'win32' ? 'case-insensitive filesystems cannot create this fixture' : false,
}, async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFixtureFile(
    root,
    'packages-ts/galerina-core-compiler/node_modules/typescript/lib/CaseShadow/first.js',
    'export const first = true;\n',
  );
  writeFixtureFile(
    root,
    'packages-ts/galerina-core-compiler/node_modules/typescript/lib/caseshadow/second.js',
    'export const second = true;\n',
  );

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PATH',
  );
});

test('collector refuses a dependency closure that changes during repeated observation', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  const movingFile = path.join(
    root,
    'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'lib', 'moving.js',
  );
  const readyFile = path.join(tmpdir(), `rd0873-mutator-ready-${process.pid}-${Date.now()}`);
  const mutator = spawn(process.execPath, ['-e', [
    'const fs=require("node:fs");',
    'const target=process.argv[1];',
    'const ready=process.argv[2];',
    'fs.writeFileSync(ready, "ready");',
    'let n=0;',
    'const end=Date.now()+10000;',
    'function tick(){',
    'fs.writeFileSync(target, Buffer.alloc(8192+(n%2), n%251));',
    'n+=1;',
    'if(Date.now()<end)setImmediate(tick);',
    '}',
    'tick();',
  ].join(''), movingFile, readyFile], {
    stdio: 'ignore',
    windowsHide: true,
  });
  t.after(async () => {
    const exited = mutator.exitCode !== null || mutator.signalCode !== null
      ? Promise.resolve()
      : new Promise((resolve) => mutator.once('exit', resolve));
    if (mutator.exitCode === null && mutator.signalCode === null) mutator.kill();
    await exited;
    rmSync(readyFile, { force: true });
    rmSync(root, { recursive: true, force: true });
  });
  await waitForFile(readyFile);

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_DRIFT',
  );
});

test('sealed CLI writes one canonical no-LF observation outside the checkout without process output', (t) => {
  const { root, gitExecutable } = createExecutableRepositoryFixture();
  const outputRoot = createCanonicalTemporaryDirectory('rd0873-pin-output-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outputRoot, { recursive: true, force: true });
  });
  const outputPath = path.join(outputRoot, 'observation.json');
  const cliPath = path.join(root, 'scripts', 'logic-aig-source-origin-toolchain-pin-observation.mjs');

  const result = execFileSync(process.execPath, [
    cliPath, '--git', gitExecutable, '--out', outputPath,
  ], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  assert.equal(result.length, 0);
  const bytes = readFileSync(outputPath);
  assert.equal(bytes.at(-1), 0x7d);
  const value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value.schema, 'galerina.logic-aig-toolchain-pin-observation.v1');
  assert.equal(value.authorizing, false);
  assert.equal(canonicalJsonText(value), bytes.toString('utf8'));
});

test('sealed CLI emits only a stable code and no file for dirty required Git state', (t) => {
  const { root, gitExecutable } = createExecutableRepositoryFixture();
  const outputRoot = createCanonicalTemporaryDirectory('rd0873-pin-output-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outputRoot, { recursive: true, force: true });
  });
  writeFixtureFile(
    root,
    'packages-ts/galerina-core-compiler/src/parser.ts',
    'export const dirtyRequiredFile = true;\n',
  );
  const outputPath = path.join(outputRoot, 'observation.json');

  assertBodyFreeCliRefusal(
    runCollectorCli({ root, gitExecutable, outputPath }),
    'TOOLCHAIN_OBSERVATION_REFUSED_STATE',
    outputPath,
  );
});

test('sealed CLI refuses an output path inside the checkout before collection', (t) => {
  const { root, gitExecutable } = createExecutableRepositoryFixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const outputPath = path.join(root, 'observation.json');

  assertBodyFreeCliRefusal(
    runCollectorCli({ root, gitExecutable, outputPath }),
    'TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT',
    outputPath,
  );
});

test('sealed CLI never unlinks a foreign pathname replacement after output creation', (t) => {
  const { root, gitExecutable } = createExecutableRepositoryFixture();
  const outputRoot = createCanonicalTemporaryDirectory('rd0873-pin-output-replacement-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outputRoot, { recursive: true, force: true });
  });
  const outputPath = path.join(outputRoot, 'observation.json');
  const openedPath = path.join(outputRoot, 'opened-observation.json');
  const preloadPath = path.join(outputRoot, 'replace-on-fsync.mjs');
  const foreignBytes = 'foreign replacement must survive\n';
  writeFileSync(preloadPath, [
    "import fs from 'node:fs';",
    "import { syncBuiltinESMExports } from 'node:module';",
    'fs.fsyncSync = () => {',
    '  fs.renameSync(process.env.RD0873_OUTPUT_PATH, process.env.RD0873_OPENED_PATH);',
    '  fs.writeFileSync(process.env.RD0873_OUTPUT_PATH, process.env.RD0873_FOREIGN_BYTES);',
    "  throw new Error('forced fsync refusal');",
    '};',
    'syncBuiltinESMExports();',
  ].join('\n'));
  const cliPath = path.join(root, 'scripts', 'logic-aig-source-origin-toolchain-pin-observation.mjs');

  const result = spawnSync(process.execPath, [
    '--import', pathToFileURL(preloadPath).href,
    cliPath, '--git', gitExecutable, '--out', outputPath,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      RD0873_OUTPUT_PATH: outputPath,
      RD0873_OPENED_PATH: openedPath,
      RD0873_FOREIGN_BYTES: foreignBytes,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    windowsHide: true,
  });

  assert.equal(result.status, 2);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT\n');
  assert.equal(readFileSync(outputPath, 'utf8'), foreignBytes);
});

test('sealed CLI refuses when its output parent is replaced after file creation', {
  skip: process.platform === 'win32' ? 'Windows prevents replacing the parent while the output handle is open' : false,
}, (t) => {
  const { root, gitExecutable } = createExecutableRepositoryFixture();
  const outputRoot = createCanonicalTemporaryDirectory('rd0873-pin-output-parent-replacement-');
  const displacedOutputRoot = `${outputRoot}-displaced`;
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outputRoot, { recursive: true, force: true });
    rmSync(displacedOutputRoot, { recursive: true, force: true });
  });
  const outputPath = path.join(outputRoot, 'observation.json');
  const preloadPath = path.join(outputRoot, 'replace-parent-on-write.mjs');
  const foreignPath = path.join(outputRoot, 'foreign-parent-sentinel.txt');
  const foreignBytes = 'foreign parent must survive\n';
  writeFileSync(preloadPath, [
    "import fs from 'node:fs';",
    "import { syncBuiltinESMExports } from 'node:module';",
    'const originalWriteFileSync = fs.writeFileSync;',
    'let replaced = false;',
    'fs.writeFileSync = (...args) => {',
    '  if (!replaced) {',
    '    replaced = true;',
    '    fs.renameSync(process.env.RD0873_OUTPUT_PARENT, process.env.RD0873_DISPLACED_OUTPUT_PARENT);',
    '    fs.mkdirSync(process.env.RD0873_OUTPUT_PARENT);',
    '    originalWriteFileSync(process.env.RD0873_FOREIGN_PARENT_PATH, process.env.RD0873_FOREIGN_PARENT_BYTES);',
    '  }',
    '  return originalWriteFileSync(...args);',
    '};',
    'syncBuiltinESMExports();',
  ].join('\n'));
  const cliPath = path.join(root, 'scripts', 'logic-aig-source-origin-toolchain-pin-observation.mjs');

  const result = spawnSync(process.execPath, [
    '--import', pathToFileURL(preloadPath).href,
    cliPath, '--git', gitExecutable, '--out', outputPath,
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      RD0873_OUTPUT_PARENT: outputRoot,
      RD0873_DISPLACED_OUTPUT_PARENT: displacedOutputRoot,
      RD0873_FOREIGN_PARENT_PATH: foreignPath,
      RD0873_FOREIGN_PARENT_BYTES: foreignBytes,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    windowsHide: true,
  });

  assert.equal(result.status, 2);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'TOOLCHAIN_OBSERVATION_REFUSED_OUTPUT\n');
  assert.equal(existsSync(outputPath), false);
  assert.equal(readFileSync(foreignPath, 'utf8'), foreignBytes);
  assert(existsSync(path.join(displacedOutputRoot, 'observation.json')));
});

test('collector refuses a symbolic-link or junction member in a declared closure', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  const externalRoot = createCanonicalTemporaryDirectory('rd0873-pin-external-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(externalRoot, { recursive: true, force: true });
  });
  writeFixtureFile(externalRoot, 'outside.js', 'export const outside = true;\n');
  symlinkSync(
    externalRoot,
    path.join(root, 'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PATH',
  );
});

test('collector refuses an external hard-linked file inside a declared closure', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  const externalRoot = createCanonicalTemporaryDirectory('rd0873-pin-hardlink-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(externalRoot, { recursive: true, force: true });
  });
  const externalFile = path.join(externalRoot, 'external.js');
  const closureFile = path.join(
    root,
    'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'lib', 'linked.js',
  );
  writeFileSync(externalFile, 'export const externalHardLink = true;\n');
  linkSync(externalFile, closureFile);

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_PATH',
  );
});

test('collector enforces the declared closure byte and depth limits', async (t) => {
  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);

  await t.test('closure bytes', async (subtest) => {
    const { root, gitExecutable } = createRepositoryFixture();
    subtest.after(() => rmSync(root, { recursive: true, force: true }));
    const target = path.join(
      root,
      'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'oversized.bin',
    );
    writeFixtureFile(
      root,
      'packages-ts/galerina-core-compiler/node_modules/typescript/oversized.bin',
      '',
    );
    truncateSync(target, (64 * 1024 * 1024) + 1);
    await assert.rejects(
      () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
      (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
    );
  });

  await t.test('locator depth', async (subtest) => {
    const { root, gitExecutable } = createRepositoryFixture();
    subtest.after(() => rmSync(root, { recursive: true, force: true }));
    const deepLocator = [
      'packages-ts/galerina-core-compiler/node_modules/typescript',
      ...Array.from({ length: 65 }, (_, index) => `d${index}`),
      'deep.js',
    ].join('/');
    writeFixtureFile(root, deepLocator, 'export const tooDeep = true;\n');
    await assert.rejects(
      () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
      (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
    );
  });

  await t.test('aggregate bytes refuse before opening a later file', {
    skip: process.platform !== 'win32' && process.getuid?.() === 0
      ? 'root can read a mode-000 sentinel'
      : false,
  }, async (subtest) => {
    const { root, gitExecutable } = createRepositoryFixture();
    const first = path.join(
      root,
      'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'lib', '000-first.bin',
    );
    const later = path.join(
      root,
      'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'lib', '001-unreadable.bin',
    );
    writeFileSync(first, '');
    writeFileSync(later, '');
    truncateSync(first, 40 * 1024 * 1024);
    truncateSync(later, 30 * 1024 * 1024);
    const release = await holdFileUnreadable(later);
    subtest.after(async () => {
      await release();
      rmSync(root, { recursive: true, force: true });
    });
    await assert.rejects(
      () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
      (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
    );
  });

  await t.test('tracked aggregate bytes refuse before opening a later file', {
    skip: process.platform !== 'win32' && process.getuid?.() === 0
      ? 'root can read a mode-000 sentinel'
      : false,
  }, async (subtest) => {
    const { root, gitExecutable } = createRepositoryFixture();
    const first = path.join(
      root,
      'packages-ts', 'galerina-core-compiler', 'src', '000-first.bin',
    );
    const laterLocator = 'packages-ts/galerina-core-compiler/src/001-unreadable.bin';
    const later = path.join(root, ...laterLocator.split('/'));
    writeFileSync(first, '');
    writeFileSync(later, '');
    truncateSync(first, 40 * 1024 * 1024);
    truncateSync(later, 30 * 1024 * 1024);
    commitFixture(gitExecutable, root, 'add tracked aggregate sentinel');
    assert.equal(
      git(gitExecutable, root, 'status', '--porcelain=v1', '-z', '--untracked-files=all'),
      '',
    );
    if (process.platform !== 'win32') {
      git(gitExecutable, root, 'update-index', '--assume-unchanged', '--', laterLocator);
    }
    const release = await holdFileUnreadable(later);
    subtest.after(async () => {
      await release();
      rmSync(root, { recursive: true, force: true });
    });
    assert.equal(
      git(gitExecutable, root, 'status', '--porcelain=v1', '-z', '--untracked-files=all'),
      '',
    );
    await assert.rejects(
      () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
      (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
    );
  });

  await t.test('closure file count', async (subtest) => {
    const { root, gitExecutable } = createRepositoryFixture();
    const externalRoot = createCanonicalTemporaryDirectory('rd0873-pin-count-sentinel-');
    subtest.after(() => {
      rmSync(root, { recursive: true, force: true });
      rmSync(externalRoot, { recursive: true, force: true });
    });
    const closureDirectory = path.join(
      root,
      'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript', 'many',
    );
    mkdirSync(closureDirectory, { recursive: true });
    const externalFile = path.join(externalRoot, 'external.js');
    writeFileSync(externalFile, 'export const traversalSentinel = true;\n');
    linkSync(externalFile, path.join(closureDirectory, '00000-hardlink-sentinel.js'));
    for (let index = 0; index < 16_385; index += 1) {
      writeFileSync(path.join(closureDirectory, `f${String(index).padStart(5, '0')}`), '');
    }
    await assert.rejects(
      () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
      (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
    );
  });
});

test('collector refuses excessive tracked rows before closure materialization', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  const externalRoot = createCanonicalTemporaryDirectory('rd0873-pin-tracked-count-sentinel-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(externalRoot, { recursive: true, force: true });
  });
  const closureDirectory = path.join(
    root,
    'packages-ts', 'galerina-core-compiler', '000-many',
  );
  mkdirSync(closureDirectory, { recursive: true });
  const externalFile = path.join(externalRoot, 'external.js');
  writeFileSync(externalFile, 'export const trackedTraversalSentinel = true;\n');
  const sentinelDirectory = path.join(closureDirectory, 'd000');
  mkdirSync(sentinelDirectory);
  linkSync(externalFile, path.join(sentinelDirectory, '00000-hardlink-sentinel.js'));
  for (let index = 0; index < 16_385; index += 1) {
    const directory = path.join(
      closureDirectory,
      `d${String(Math.floor(index / 128)).padStart(3, '0')}`,
    );
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, `f${String(index).padStart(5, '0')}`), '');
  }
  commitFixture(gitExecutable, root, 'add excessive tracked closure rows');

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
  );
});

test('collector refuses a Git executable above the declared byte limit before hashing it', async (t) => {
  const { root, gitExecutable } = createRepositoryFixture();
  const executableRoot = createCanonicalTemporaryDirectory('rd0873-pin-git-');
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(executableRoot, { recursive: true, force: true });
  });
  const oversizedGit = path.join(executableRoot, process.platform === 'win32' ? 'git.exe' : 'git');
  copyFileSync(gitExecutable, oversizedGit);
  if (process.platform !== 'win32') chmodSync(oversizedGit, 0o755);
  truncateSync(oversizedGit, (256 * 1024 * 1024) + 1);

  const { collectToolchainPinObservation } = await import(COLLECTOR_MODULE);
  await assert.rejects(
    () => collectToolchainPinObservation({ repositoryRoot: root, gitExecutable: oversizedGit }),
    (error) => error?.code === 'TOOLCHAIN_OBSERVATION_REFUSED_LIMIT',
  );
});

test('private workflow is a two-lane dispatch-only bounded observation run', () => {
  const workflow = readFileSync(new URL(COLLECTOR_WORKFLOW, import.meta.url), 'utf8');
  assert.match(workflow, /^on:\r?\n {2}workflow_dispatch:\s*\{\}\s*$/mu);
  assert.doesNotMatch(workflow, /^ {2}(?:push|pull_request|schedule):/mu);
  assert.match(workflow, /^permissions:\r?\n {2}contents: read\s*$/mu);
  assert.equal((workflow.match(/timeout-minutes:/gu) ?? []).length, 1);
  assert.match(workflow, /runner: windows-2022/u);
  assert.match(workflow, /runner: ubuntu-24\.04/u);
  assert.equal((workflow.match(/runner:/gu) ?? []).length, 2);
  assert.match(workflow, /actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5/u);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/u);
  assert.match(workflow, /persist-credentials: false/u);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/u);
  assert.match(workflow, /node-version: "24\.18\.0"/u);
  assert.doesNotMatch(workflow, /^\s*cache:/mu);
  assert.match(
    workflow,
    /npm ci --ignore-scripts --no-audit --no-fund --prefix packages-ts\/galerina-core-compiler/u,
  );
  assert.match(
    workflow,
    /node --test scripts\/tests\/logic-aig-source-origin-toolchain-pin-observation\.test\.mjs/u,
  );
  assert.match(workflow, /\$\{\{ runner\.temp \}\}/u);
  assert.equal((workflow.match(/realpathSync\.native/gu) ?? []).length, 2);
  assert.equal((workflow.match(/nlink !== 1n/gu) ?? []).length, 2);
  assert.match(workflow, /bin\\git\.exe/u);
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u);
  assert.match(workflow, /retention-days: 1/u);
  assert.doesNotMatch(workflow, /platform-smoke|galerina-source-origin-frame|parseProgram|parseGateV3|secrets\./u);
});
