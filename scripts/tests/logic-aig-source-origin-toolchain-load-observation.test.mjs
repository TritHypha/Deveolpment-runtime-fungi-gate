import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canonicalToolchainObservationText,
  collectToolchainPinObservation,
  validateToolchainPinObservation,
} from '../lib/logic-aig-source-origin/toolchain-pin-observation.mjs';

const LOAD_MODULE_URL = new URL('../lib/logic-aig-source-origin/toolchain-load-observation.mjs', import.meta.url);
const LOAD_CLI_URL = new URL('../logic-aig-source-origin-toolchain-load-observation.mjs', import.meta.url);
const LOAD_WORKFLOW_URL = new URL('../../.github/workflows/rd0873-toolchain-load-observation.yml', import.meta.url);
const SOURCE_MODULE_URL = new URL('../lib/logic-aig-source-origin/toolchain-pin-observation.mjs', import.meta.url);
const SOURCE_CLI_URL = new URL('../logic-aig-source-origin-toolchain-pin-observation.mjs', import.meta.url);
const SOURCE_WORKFLOW_URL = new URL('../../.github/workflows/rd0873-toolchain-pin-observation.yml', import.meta.url);
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TYPESCRIPT_SOURCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'packages-ts',
  'galerina-core-compiler',
  'node_modules',
  'typescript',
);

const EXPECTED_TOP_LEVEL_KEYS = [
  'schema', 'sourceObservationDigest', 'sourceBinding', 'buildProfile',
  'generatedEntry', 'generatedPackageManifest', 'generatedClosure',
  'repeatedGeneratedClosureDigest', 'emittedEdgeRows', 'phaseLoadSets',
  'provenanceBlobs', 'limits', 'authorizing', 'observationDigest',
];

const EXPECTED_SOURCE_BINDING_KEYS = [
  'sourceObservationSchema', 'sourceObservationDigest', 'repository', 'platform',
  'arch', 'nodeIdentity', 'gitIdentity', 'compilerLock', 'typescript',
  'typescriptCompilerCli', 'sourceOriginParserEntry', 'sourceOriginParserProject',
  'declaredClosureDigests', 'sourceEdgeRows',
];

const EXPECTED_BUILD_PROFILE = {
  schema: 'galerina.logic-aig-source-origin-parser-build-profile.v1',
  executableRole: 'typescript-compiler-cli',
  workingDirectoryRoot: 'repository',
  compilerRootLocator: 'packages-ts/galerina-core-compiler/node_modules/typescript',
  compilerEntryLocator: 'lib/tsc.js',
  projectLocator: 'packages-ts/galerina-core-compiler/tsconfig.source-origin-parser.json',
  generatedRootLocator: 'generated-source-origin-parser',
  generatedEntryLocator: 'source-origin-parser-entry.js',
  generatedPackageManifestLocator: 'package.json',
  logicalArgv: [
    'lib/tsc.js', '--project',
    'packages-ts/galerina-core-compiler/tsconfig.source-origin-parser.json',
    '--outDir', 'generated-source-origin-parser', '--pretty', 'false',
  ],
};

const EXPECTED_GENERATED_LOCATORS = [
  'gate-v3-parser.d.ts', 'gate-v3-parser.js', 'lexer.d.ts', 'lexer.js',
  'package.json', 'parser.d.ts', 'parser.js', 'requirement-diagnostics.d.ts',
  'requirement-diagnostics.js', 'source-origin-parser-entry.d.ts',
  'source-origin-parser-entry.js',
];

const EXPECTED_EMITTED_EDGES = [
  { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'lexer.js' },
  { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'requirement-diagnostics.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'lexer.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'gate-v3-parser.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'parser.js' },
];

const EXPECTED_PARSER_MODULES = [
  'gate-v3-parser.js', 'lexer.js', 'parser.js',
  'requirement-diagnostics.js', 'source-origin-parser-entry.js',
];

function sha256Raw(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function domainDigest(domain, value) {
  return sha256Raw(Buffer.concat([
    Buffer.from(domain, 'utf8'), Buffer.from([0]),
    Buffer.from(canonicalToolchainObservationText(value), 'utf8'),
  ]));
}

function exactKeys(value, keys) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

function git(gitExecutable, repositoryRoot, ...args) {
  return execFileSync(gitExecutable, ['-C', repositoryRoot, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
  }).trim();
}

function resolveGitExecutable() {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const output = execFileSync(locator, ['git'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
  });
  const candidates = output.split(/\r?\n/u).filter(Boolean).map((value) => realpathSync.native(value));
  const selected = candidates.find((value) => {
    const stats = lstatSync(value, { bigint: true });
    return stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1n;
  });
  assert(selected, 'fixture requires one resolved single-link Git endpoint');
  return selected;
}

function writeFixtureFile(root, locator, bytes) {
  const target = path.join(root, ...locator.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

function copyFixtureFile(root, locator, sourceUrl) {
  writeFixtureFile(root, locator, readFileSync(sourceUrl));
}

function createRepositoryFixture(t) {
  const fixtureParent = realpathSync.native(mkdtempSync(path.join(tmpdir(), 'rd0873-load-observation-')));
  const root = path.join(fixtureParent, 'repository');
  mkdirSync(root);
  const gitExecutable = resolveGitExecutable();
  t.after(() => rmSync(fixtureParent, { recursive: true, force: true }));

  writeFixtureFile(root, '.gitignore', [
    'packages-ts/galerina-core-compiler/node_modules/', 'node_modules/',
    'packages-ts/galerina-core-compiler/dist/', '',
  ].join('\n'));
  copyFixtureFile(root, '.github/workflows/rd0873-toolchain-pin-observation.yml', SOURCE_WORKFLOW_URL);
  copyFixtureFile(root, '.github/workflows/rd0873-toolchain-load-observation.yml', LOAD_WORKFLOW_URL);
  copyFixtureFile(root, 'scripts/lib/logic-aig-source-origin/toolchain-pin-observation.mjs', SOURCE_MODULE_URL);
  copyFixtureFile(root, 'scripts/logic-aig-source-origin-toolchain-pin-observation.mjs', SOURCE_CLI_URL);
  copyFixtureFile(root, 'scripts/lib/logic-aig-source-origin/toolchain-load-observation.mjs', LOAD_MODULE_URL);
  copyFixtureFile(root, 'scripts/logic-aig-source-origin-toolchain-load-observation.mjs', LOAD_CLI_URL);

  const typescriptPackage = JSON.parse(readFileSync(path.join(TYPESCRIPT_SOURCE_ROOT, 'package.json'), 'utf8'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/package.json', `${JSON.stringify({
    name: '@galerina/core-compiler', version: '1.0.0-fixture', type: 'module',
    main: './dist/index.js', devDependencies: { typescript: `^${typescriptPackage.version}` },
  }, null, 2)}\n`);
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/package-lock.json', `${JSON.stringify({
    name: '@galerina/core-compiler', version: '1.0.0-fixture', lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: '@galerina/core-compiler', version: '1.0.0-fixture',
        devDependencies: { typescript: `^${typescriptPackage.version}` },
      },
      'node_modules/typescript': {
        version: typescriptPackage.version,
        resolved: `https://registry.npmjs.org/typescript/-/typescript-${typescriptPackage.version}.tgz`,
        integrity: 'sha512-rd0873-fixture', dev: true, license: 'Apache-2.0',
      },
    },
  }, null, 2)}\n`);
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/tsconfig.json', [
    '{', '  "compilerOptions": {', '    "target": "ES2022",',
    '    "module": "NodeNext",', '    "moduleResolution": "NodeNext",',
    '    "strict": true,', '    "declaration": true,', '    "outDir": "dist",',
    '    "rootDir": "src",', '    "skipLibCheck": true', '  },',
    '  "include": ["src/**/*.ts"]', '}', '',
  ].join('\n'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/tsconfig.source-origin-parser.json', [
    '{', '  "extends": "./tsconfig.json",',
    '  "files": ["src/source-origin-parser-entry.ts"],', '  "include": [],',
    '  "compilerOptions": {', '    "types": [],', '    "noEmitOnError": true,',
    '    "incremental": false,', '    "composite": false,', '    "sourceMap": false,',
    '    "declarationMap": false', '  }', '}', '',
  ].join('\n'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/lexer.ts', [
    'export interface Token { readonly kind: string; }',
    'export interface LexerDiagnostic { readonly code: string; }',
    'export function lex(): never { throw new Error("PARSER_INVOKED"); }', '',
  ].join('\n'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/requirement-diagnostics.ts', [
    'export const FUNGI_REQUIREMENT_001 = "001";',
    'export const FUNGI_REQUIREMENT_005 = "005";',
    'export const FUNGI_REQUIREMENT_006 = "006";',
    'export const FUNGI_REQUIREMENT_008 = "008";', '',
  ].join('\n'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/parser.ts', [
    'import { lex, type Token, type LexerDiagnostic } from "./lexer.js";', 'import {',
    '  FUNGI_REQUIREMENT_001,', '  FUNGI_REQUIREMENT_005,',
    '  FUNGI_REQUIREMENT_006,', '  FUNGI_REQUIREMENT_008,',
    '} from "./requirement-diagnostics.js";',
    'export interface ParseDiagnostic { readonly token?: Token; readonly lexer?: LexerDiagnostic; }',
    'export interface SourceLocation { readonly line: number; }',
    'export function parseProgram(): never {',
    '  void [lex, FUNGI_REQUIREMENT_001, FUNGI_REQUIREMENT_005, FUNGI_REQUIREMENT_006, FUNGI_REQUIREMENT_008];',
    '  throw new Error("PARSER_INVOKED");', '}', '',
  ].join('\n'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/gate-v3-parser.ts', [
    'import type { ParseDiagnostic, SourceLocation } from "./parser.js";',
    'export function parseGateV3(_diagnostic?: ParseDiagnostic, _location?: SourceLocation): never {',
    '  throw new Error("PARSER_INVOKED");', '}', '',
  ].join('\n'));
  writeFixtureFile(root, 'packages-ts/galerina-core-compiler/src/source-origin-parser-entry.ts', [
    'export { lex } from "./lexer.js";',
    'export { parseGateV3 } from "./gate-v3-parser.js";',
    'export { parseProgram } from "./parser.js";', '',
  ].join('\n'));

  const fixtureTypescriptRoot = path.join(
    root, 'packages-ts', 'galerina-core-compiler', 'node_modules', 'typescript',
  );
  mkdirSync(path.dirname(fixtureTypescriptRoot), { recursive: true });
  cpSync(TYPESCRIPT_SOURCE_ROOT, fixtureTypescriptRoot, {
    recursive: true, dereference: false, errorOnExist: true,
  });

  execFileSync(gitExecutable, ['init', root], {
    stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
  });
  git(gitExecutable, root, 'config', 'core.autocrlf', 'false');
  git(gitExecutable, root, 'add', '--', '.');
  execFileSync(gitExecutable, [
    '-C', root, '-c', 'user.name=RD0873 Fixture',
    '-c', 'user.email=rd0873-fixture@example.invalid', 'commit', '-m', 'fixture',
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 10_000 });

  return {
    fixtureParent, root: realpathSync.native(root), gitExecutable,
    tscPath: path.join(fixtureTypescriptRoot, 'lib', 'tsc.js'),
  };
}

async function sourceFixture(fixture) {
  const value = validateToolchainPinObservation(await collectToolchainPinObservation({
    repositoryRoot: fixture.root, gitExecutable: fixture.gitExecutable,
  }));
  const bytes = Buffer.from(canonicalToolchainObservationText(value), 'utf8');
  assert.equal(bytes.at(-1), 0x7d);
  return { value, bytes };
}

function collectorOptions(fixture, source) {
  return {
    repositoryRoot: fixture.root, gitExecutable: fixture.gitExecutable,
    sourceObservationBytes: source.bytes,
    sourceObservationDigest: source.value.observationDigest,
  };
}

function copyObservation(value) {
  return JSON.parse(JSON.stringify(value));
}

function resignLoadObservation(value) {
  if (value.generatedClosure && typeof value.generatedClosure === 'object') {
    const { closureDigest: _closureDigest, ...closureBody } = value.generatedClosure;
    value.generatedClosure.closureDigest = domainDigest(value.generatedClosure.schema, closureBody);
  }
  if (Array.isArray(value.phaseLoadSets)) {
    for (const phase of value.phaseLoadSets) {
      if (!phase || typeof phase !== 'object') continue;
      const { loadSetDigest: _loadSetDigest, ...phaseBody } = phase;
      phase.loadSetDigest = domainDigest(phase.schema, phaseBody);
    }
  }
  const { observationDigest: _observationDigest, ...body } = value;
  value.observationDigest = domainDigest(value.schema, body);
  return value;
}

function resignSourceObservation(value) {
  for (const closure of value.declaredClosures) {
    const { closureDigest: _closureDigest, ...body } = closure;
    closure.closureDigest = domainDigest(closure.schema, body);
  }
  const { observationDigest: _observationDigest, ...body } = value;
  value.observationDigest = domainDigest(value.schema, body);
  return value;
}

function assertSortedUniqueStrings(values) {
  assert.deepEqual([...values].sort(), values);
  assert.equal(new Set(values).size, values.length);
}

function assertLoadRefusal(error, expectedCode) {
  return error?.name === 'ToolchainLoadObservationRefusal' && error?.code === expectedCode;
}

async function withTscMutation(fixture, bytes, operation) {
  const original = readFileSync(fixture.tscPath);
  writeFileSync(fixture.tscPath, bytes);
  try {
    const source = await sourceFixture(fixture);
    return await operation(source);
  } finally {
    writeFileSync(fixture.tscPath, original);
  }
}

test('load-observation-v1 collector emits the exact source-bound build, closure, edge, and phase contracts', async (t) => {
  const module = await import(LOAD_MODULE_URL);
  const fixture = createRepositoryFixture(t);
  const source = await sourceFixture(fixture);
  const first = module.validateToolchainLoadObservation(
    await module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
  );
  const second = module.validateToolchainLoadObservation(
    await module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
  );

  exactKeys(first, EXPECTED_TOP_LEVEL_KEYS);
  assert.equal(first.schema, 'galerina.logic-aig-toolchain-load-observation.v1');
  assert.equal(first.authorizing, false);
  assert.equal(first.sourceObservationDigest, source.value.observationDigest);
  exactKeys(first.sourceBinding, EXPECTED_SOURCE_BINDING_KEYS);
  assert.equal(first.sourceBinding.sourceObservationSchema, source.value.schema);
  assert.equal(first.sourceBinding.sourceObservationDigest, source.value.observationDigest);
  assert.deepEqual(first.sourceBinding.repository, source.value.repository);
  assert.deepEqual(first.sourceBinding.nodeIdentity, source.value.nodeIdentityBefore);
  assert.deepEqual(first.sourceBinding.gitIdentity, source.value.gitIdentityBefore);
  assert.deepEqual(first.sourceBinding.compilerLock, source.value.compilerLock);
  assert.deepEqual(first.sourceBinding.typescript, source.value.typescript);
  assert.deepEqual(first.sourceBinding.typescriptCompilerCli, source.value.typescriptCompilerCli);
  assert.deepEqual(first.sourceBinding.sourceOriginParserEntry, source.value.sourceOriginParserEntry);
  assert.deepEqual(first.sourceBinding.sourceOriginParserProject, source.value.sourceOriginParserProject);
  assert.deepEqual(first.sourceBinding.sourceEdgeRows, source.value.sourceEdgeRows);
  assert.deepEqual(first.sourceBinding.declaredClosureDigests, source.value.declaredClosures.map((closure) => ({
    id: closure.id, closureDigest: closure.closureDigest,
  })));
  assert.deepEqual(first.buildProfile, EXPECTED_BUILD_PROFILE);

  assert.deepEqual(first.generatedClosure.rows.map((row) => row.locator), EXPECTED_GENERATED_LOCATORS);
  assert.equal(first.generatedClosure.schema, 'galerina.logic-aig-declared-closure-observation.v1');
  assert.equal(first.generatedClosure.id, 'generated-source-origin-parser');
  assert.deepEqual(first.generatedClosure.declaration, {
    rule: 'all-regular-files-under-package-root.v1',
    rootLocator: 'generated-source-origin-parser', entryLocator: 'source-origin-parser-entry.js',
  });
  assert.equal(first.generatedClosure.counts.files, 11);
  assert.equal(first.generatedClosure.counts.bytes, first.generatedClosure.rows.reduce(
    (sum, row) => sum + row.byteLength, 0,
  ));
  assert.equal(first.repeatedGeneratedClosureDigest, first.generatedClosure.closureDigest);
  assert.deepEqual(first.emittedEdgeRows, EXPECTED_EMITTED_EDGES);

  const manifestBytes = Buffer.from('{"type":"module"}', 'utf8');
  assert.equal(manifestBytes.length, 17);
  assert.deepEqual(first.generatedPackageManifest, {
    rootLocator: 'generated-source-origin-parser', locator: 'package.json',
    rawSha256: sha256Raw(manifestBytes), byteLength: 17,
  });
  assert.deepEqual(first.generatedEntry, {
    rootLocator: 'generated-source-origin-parser',
    ...first.generatedClosure.rows.find((row) => row.locator === 'source-origin-parser-entry.js'),
  });

  assert.deepEqual(first.phaseLoadSets.map((phase) => phase.phaseId), ['BUILD', 'HOST', 'PARSER']);
  for (const phase of first.phaseLoadSets) {
    exactKeys(phase, [
      'schema', 'phaseId', 'entry', 'moduleRows', 'builtinModules',
      'parserExportNames', 'counts', 'authorizing', 'loadSetDigest',
    ]);
    assert.equal(phase.schema, 'galerina.logic-aig-toolchain-phase-load-set.v1');
    assert.equal(phase.authorizing, false);
    assert.equal(phase.counts.modules, phase.moduleRows.length);
    assert.equal(phase.counts.builtinModules, phase.builtinModules.length);
    assertSortedUniqueStrings(phase.moduleRows.map((row) => row.locator));
    assertSortedUniqueStrings(phase.builtinModules);
    assert(phase.builtinModules.every((name) => name.startsWith('node:')));
    assert(phase.moduleRows.every((row) => row.locator.endsWith('.js')));
  }
  const [build, host, parser] = first.phaseLoadSets;
  assert.deepEqual(build.entry, {
    rootLocator: 'packages-ts/galerina-core-compiler/node_modules/typescript', locator: 'lib/tsc.js',
  });
  assert(build.moduleRows.some((row) => row.locator === 'lib/tsc.js'));
  assert.equal(build.parserExportNames, null);
  assert.deepEqual(host.entry, {
    rootLocator: 'packages-ts/galerina-core-compiler/node_modules/typescript', locator: 'lib/typescript.js',
  });
  assert(host.moduleRows.some((row) => row.locator === 'lib/typescript.js'));
  assert.equal(host.parserExportNames, null);
  assert.deepEqual(parser.entry, {
    rootLocator: 'generated-source-origin-parser', locator: 'source-origin-parser-entry.js',
  });
  assert.deepEqual(parser.moduleRows.map((row) => row.locator), EXPECTED_PARSER_MODULES);
  assert.deepEqual(parser.builtinModules, []);
  assert.deepEqual(parser.parserExportNames, ['lex', 'parseGateV3', 'parseProgram']);
  assert.deepEqual(parser.counts, { modules: 5, builtinModules: 0 });
  assert(first.phaseLoadSets.flatMap((phase) => phase.moduleRows)
    .every((row) => row.locator !== 'package.json' && !row.locator.endsWith('.d.ts')));

  const firstBytes = Buffer.from(module.canonicalToolchainLoadObservationText(first), 'utf8');
  const secondBytes = Buffer.from(module.canonicalToolchainLoadObservationText(second), 'utf8');
  assert(firstBytes.equals(secondBytes), 'two complete collection runs must be byte-identical');
  assert.equal(firstBytes.at(-1), 0x7d, 'canonical observation has no trailing LF');
  const { observationDigest: _observationDigest, ...body } = first;
  assert.equal(first.observationDigest, domainDigest(first.schema, body));
});

test('validator refuses closed-schema, source-binding, build-profile, edge, phase, and executable/data drift after digest repair', async (t) => {
  const module = await import(LOAD_MODULE_URL);
  const fixture = createRepositoryFixture(t);
  const source = await sourceFixture(fixture);
  const observation = await module.collectToolchainLoadObservation(collectorOptions(fixture, source));
  const mutations = [
    ['surplus top-level key', (value) => { value.selectedPinRecordId = 'forbidden'; }],
    ['historical schema', (value) => { value.schema = 'galerina.logic-aig-toolchain-load-observation.v0'; }],
    ['source digest substitution', (value) => { value.sourceObservationDigest = '0'.repeat(64); }],
    ['nested source digest substitution', (value) => { value.sourceBinding.sourceObservationDigest = '0'.repeat(64); }],
    ['source schema substitution', (value) => { value.sourceBinding.sourceObservationSchema = 'galerina.logic-aig-toolchain-pin-observation.v1'; }],
    ['surplus source binding key', (value) => { value.sourceBinding.authorizing = false; }],
    ['alternate working directory', (value) => { value.buildProfile.workingDirectoryRoot = 'compiler'; }],
    ['package-name compiler root', (value) => { value.buildProfile.compilerRootLocator = 'typescript'; }],
    ['package main compiler entry', (value) => { value.buildProfile.compilerEntryLocator = 'package.json'; }],
    ['extra compiler flag', (value) => { value.buildProfile.logicalArgv.splice(5, 0, '--rootDir', '.'); }],
    ['alternate generated root', (value) => { value.buildProfile.logicalArgv[4] = 'dist'; }],
    ['generated closure omission', (value) => {
      value.generatedClosure.rows.pop();
      value.generatedClosure.counts.files -= 1;
      value.generatedClosure.counts.bytes = value.generatedClosure.rows.reduce((sum, row) => sum + row.byteLength, 0);
    }],
    ['generated closure reordering', (value) => { value.generatedClosure.rows.reverse(); }],
    ['manifest identity drift', (value) => { value.generatedPackageManifest.byteLength = 18; }],
    ['emitted edge omission', (value) => { value.emittedEdgeRows.pop(); }],
    ['emitted import-type promotion', (value) => { value.emittedEdgeRows[0].kind = 'IMPORT_TYPE'; }],
    ['phase substitution', (value) => { value.phaseLoadSets[0].phaseId = 'HOST'; }],
    ['phase entry substitution', (value) => { value.phaseLoadSets[1].entry.locator = 'lib/tsc.js'; }],
    ['parser builtin widening', (value) => {
      value.phaseLoadSets[2].builtinModules = ['node:fs']; value.phaseLoadSets[2].counts.builtinModules = 1;
    }],
    ['parser declaration promotion', (value) => {
      const data = value.generatedClosure.rows.find((row) => row.locator === 'lexer.d.ts');
      value.phaseLoadSets[2].moduleRows[1] = { ...data };
    }],
    ['parser manifest promotion', (value) => {
      const data = value.generatedClosure.rows.find((row) => row.locator === 'package.json');
      value.phaseLoadSets[2].moduleRows[1] = { ...data };
    }],
    ['BUILD declaration promotion', (value) => {
      const sourceClosure = source.value.declaredClosures.find((closure) => closure.id === 'typescript');
      const data = sourceClosure.rows.find((row) => row.locator.endsWith('.d.ts'));
      value.phaseLoadSets[0].moduleRows[0] = { ...data };
    }],
    ['parser export mutation', (value) => { value.phaseLoadSets[2].parserExportNames[0] = 'default'; }],
    ['phase count drift', (value) => { value.phaseLoadSets[0].counts.modules += 1; }],
    ['replay digest substitution', (value) => { value.repeatedGeneratedClosureDigest = 'f'.repeat(64); }],
    ['authorizing promotion', (value) => { value.authorizing = true; }],
  ];
  for (const [name, mutate] of mutations) {
    const mutant = copyObservation(observation);
    mutate(mutant);
    resignLoadObservation(mutant);
    assert.throws(
      () => module.validateToolchainLoadObservation(mutant),
      (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SCHEMA'), name,
    );
  }
});

test('collector seals options and canonical source-v2 bytes before filesystem or phase work', async (t) => {
  const module = await import(LOAD_MODULE_URL);
  const fixture = createRepositoryFixture(t);
  const source = await sourceFixture(fixture);
  const good = collectorOptions(fixture, source);
  await assert.rejects(
    module.collectToolchainLoadObservation({ ...good, extraSearchRoot: fixture.fixtureParent }),
    (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT'),
  );
  await assert.rejects(
    module.collectToolchainLoadObservation({ ...good, sourceObservationDigest: '0'.repeat(64) }),
    (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE'),
  );
  await assert.rejects(
    module.collectToolchainLoadObservation({
      ...good, sourceObservationBytes: Buffer.concat([source.bytes, Buffer.from('\n')]),
    }),
    (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_SOURCE'),
  );
  const accessor = {};
  Object.defineProperty(accessor, 'repositoryRoot', { get() { throw new Error('executed accessor'); } });
  Object.defineProperties(accessor, {
    gitExecutable: { value: fixture.gitExecutable, enumerable: true },
    sourceObservationBytes: { value: source.bytes, enumerable: true },
    sourceObservationDigest: { value: source.value.observationDigest, enumerable: true },
  });
  await assert.rejects(
    module.collectToolchainLoadObservation(accessor),
    (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_ROOT'),
  );
});

test('guarded BUILD and PARSER phases refuse nonzero, crash, ambient resolution, replay mismatch, and parser evaluation failure', { concurrency: false }, async (t) => {
  const module = await import(LOAD_MODULE_URL);
  const fixture = createRepositoryFixture(t);
  await withTscMutation(fixture, 'process.exit(9);\n', async (source) => {
    await assert.rejects(module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
      (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_BUILD'));
  });
  await withTscMutation(fixture, 'throw new Error("child crash");\n', async (source) => {
    await assert.rejects(module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
      (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_BUILD'));
  });

  const hostileRoot = path.join(fixture.root, 'node_modules', 'hostile-package');
  const hostileMarker = path.join(fixture.fixtureParent, 'hostile-marker');
  mkdirSync(hostileRoot, { recursive: true });
  writeFileSync(path.join(hostileRoot, 'package.json'), '{"main":"index.cjs"}');
  writeFileSync(path.join(hostileRoot, 'index.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(hostileMarker)}, 'executed');`);
  const priorNodePath = process.env.NODE_PATH;
  process.env.NODE_PATH = path.join(fixture.root, 'node_modules');
  try {
    await withTscMutation(fixture, 'module.exports = require("hostile-package");\n', async (source) => {
      await assert.rejects(module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
        (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_RESOLUTION'));
    });
  } finally {
    if (priorNodePath === undefined) delete process.env.NODE_PATH;
    else process.env.NODE_PATH = priorNodePath;
  }
  assert.equal(existsSync(hostileMarker), false, 'ambient/NODE_PATH package must never execute');

  await withTscMutation(fixture, [
    'module.exports = require("./_tsc.js");', 'const fs = require("node:fs");',
    'const path = require("node:path");', 'const index = process.argv.indexOf("--outDir");',
    'fs.appendFileSync(path.join(process.argv[index + 1], "lexer.js"), `\\n// ${process.pid}\\n`);', '',
  ].join('\n'), async (source) => {
    await assert.rejects(module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
      (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_MISMATCH'));
  });

  await withTscMutation(fixture, [
    'module.exports = require("./_tsc.js");', 'const fs = require("node:fs");',
    'const path = require("node:path");', 'const index = process.argv.indexOf("--outDir");',
    'fs.appendFileSync(path.join(process.argv[index + 1], "lexer.js"), "\\nthrow new Error(\\"PARSER_MODULE_EVALUATED\\");\\n");', '',
  ].join('\n'), async (source) => {
    await assert.rejects(module.collectToolchainLoadObservation(collectorOptions(fixture, source)),
      (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_PHASE'));
  });
});

test('sealed CLI writes one no-LF external observation and rejects extra argv without a partial artifact', async (t) => {
  await import(LOAD_MODULE_URL);
  const fixture = createRepositoryFixture(t);
  const source = await sourceFixture(fixture);
  const sourcePath = path.join(fixture.fixtureParent, 'source-observation-v2.json');
  const outputPath = path.join(fixture.fixtureParent, 'load-observation-v1.json');
  writeFileSync(sourcePath, source.bytes);
  const cliPath = path.join(fixture.root, 'scripts', 'logic-aig-source-origin-toolchain-load-observation.mjs');
  const args = [
    cliPath, '--git', fixture.gitExecutable, '--source-observation', sourcePath,
    '--source-observation-digest', source.value.observationDigest, '--out', outputPath,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: fixture.fixtureParent, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000, windowsHide: true,
  });
  assert.equal(result.status, 0);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  const outputBytes = readFileSync(outputPath);
  assert.equal(outputBytes.at(-1), 0x7d);
  const module = await import(LOAD_MODULE_URL);
  const value = JSON.parse(outputBytes.toString('utf8'));
  module.validateToolchainLoadObservation(value);
  assert.equal(module.canonicalToolchainLoadObservationText(value), outputBytes.toString('utf8'));

  const refusedPath = path.join(fixture.fixtureParent, 'refused-load-observation.json');
  const refused = spawnSync(process.execPath, [...args.slice(0, -1), refusedPath, '--extra'], {
    cwd: fixture.fixtureParent, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000, windowsHide: true,
  });
  assert.equal(refused.status, 2);
  assert.equal(refused.stdout, '');
  assert.equal(refused.stderr, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_USAGE\n');
  assert.equal(existsSync(refusedPath), false);
});

test('private workflow is two-lane, digest-gated, bounded, parser-free, and dispatch-only', async () => {
  await import(LOAD_MODULE_URL);
  const workflow = readFileSync(LOAD_WORKFLOW_URL, 'utf8').replaceAll('\r\n', '\n');
  assert.match(workflow, /^name: rd0873-load-observation-v1$/mu);
  assert.match(workflow, /^\s*workflow_dispatch:$/mu);
  assert.doesNotMatch(workflow, /^\s*(?:push|pull_request|schedule|workflow_run):/mu);
  assert.match(workflow, /^\s*contents: read$/mu);
  assert.match(workflow, /windows-2022/u);
  assert.match(workflow, /ubuntu-24\.04/u);
  assert.match(workflow, /timeout-minutes: 30/u);
  assert.match(workflow, /node-version: "24\.18\.0"/u);
  assert.match(workflow, /npm ci --ignore-scripts --no-audit --no-fund --prefix packages-ts\/galerina-core-compiler/u);
  assert.match(workflow, /node --test scripts\/tests\/logic-aig-source-origin-toolchain-load-observation\.test\.mjs/u);
  assert.match(workflow, /logic-aig-source-origin-toolchain-pin-observation\.mjs/u);
  assert.match(workflow, /logic-aig-source-origin-toolchain-load-observation\.mjs/u);
  assert.match(workflow, /windows-source-observation-digest/u);
  assert.match(workflow, /linux-source-observation-digest/u);
  assert.match(workflow, /digest_input: windows-source-observation-digest/u);
  assert.match(workflow, /digest_input: linux-source-observation-digest/u);
  assert.match(workflow, /SOURCE_OBSERVATION_DIGEST: \$\{\{ inputs\[matrix\.digest_input\] \}\}/u);
  assert.doesNotMatch(workflow, /matrix\.digest-input/u);
  assert.match(workflow, /runner\.temp/u);
  assert.match(workflow, /retention-days: 1/u);
  assert.doesNotMatch(workflow, /actions\/cache|secrets\.|parseProgram\s*\(|parseGateV3\s*\(|\blex\s*\(/u);
  const actionUses = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gmu)].map((match) => match[1]);
  assert(actionUses.length >= 3);
  assert(actionUses.every((value) => /@[0-9a-f]{40}$/u.test(value)), 'every action must use a full commit SHA');
});

test('TypeScript runtime phase mutation cannot be relabelled as a valid HOST observation', async (t) => {
  const module = await import(LOAD_MODULE_URL);
  const fixture = createRepositoryFixture(t);
  const source = await sourceFixture(fixture);
  const runtimePath = path.join(
    fixture.root, 'packages-ts', 'galerina-core-compiler', 'node_modules',
    'typescript', 'lib', 'typescript.js',
  );
  const crashBytes = Buffer.from('throw new Error("HOST_PHASE_CRASH");\n', 'utf8');
  writeFileSync(runtimePath, crashBytes);
  const rebound = copyObservation(source.value);
  const closure = rebound.declaredClosures.find((row) => row.id === 'typescript');
  const runtimeRow = closure.rows.find((row) => row.locator === 'lib/typescript.js');
  closure.counts.bytes += crashBytes.length - runtimeRow.byteLength;
  runtimeRow.rawSha256 = sha256Raw(crashBytes);
  runtimeRow.byteLength = crashBytes.length;
  rebound.typescript.entryRawSha256 = runtimeRow.rawSha256;
  rebound.typescript.entryByteLength = runtimeRow.byteLength;
  resignSourceObservation(rebound);
  validateToolchainPinObservation(rebound);
  const reboundFixture = {
    value: rebound, bytes: Buffer.from(canonicalToolchainObservationText(rebound), 'utf8'),
  };
  await assert.rejects(
    module.collectToolchainLoadObservation(collectorOptions(fixture, reboundFixture)),
    (error) => assertLoadRefusal(error, 'TOOLCHAIN_LOAD_OBSERVATION_REFUSED_PHASE'),
  );
});
