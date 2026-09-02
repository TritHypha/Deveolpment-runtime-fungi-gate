import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  canonicalJsonText,
  sha256Canonical,
  sha256Raw,
} from '../lib/logic-aig-source-origin/contract.mjs';

const DERIVATION_MODULE = '../lib/logic-aig-source-origin/toolchain-pin-derivation.mjs';
let derivation;
try {
  derivation = await import(DERIVATION_MODULE);
} catch (error) {
  assert.fail(`toolchain pin derivation is not implemented: ${error?.code ?? error?.name}`);
}

const {
  ToolchainPinDerivationRefusal,
  canonicalToolchainPinsText,
  deriveToolchainPinsV2,
  validateToolchainPinsV2,
} = derivation;

const SOURCE_SCHEMA = 'galerina.logic-aig-toolchain-pin-observation.v2';
const LOAD_SCHEMA = 'galerina.logic-aig-toolchain-load-observation.v1';
const CLOSURE_SCHEMA = 'galerina.logic-aig-declared-closure-observation.v1';
const PHASE_SCHEMA = 'galerina.logic-aig-toolchain-phase-load-set.v1';
const PINS_SCHEMA = 'galerina.logic-aig-toolchain-pins.v2';
const RECORD_SCHEMA = 'galerina.logic-aig-toolchain-pin-record.v2';
const MODULE_CLOSURE_SCHEMA = 'galerina.logic-aig-module-closure.v1';
const COMPILER_ROOT = 'packages-ts/galerina-core-compiler';
const TYPESCRIPT_ROOT = `${COMPILER_ROOT}/node_modules/typescript`;
const GENERATED_ROOT = 'generated-source-origin-parser';
const BASE_COMMIT = 'b1a34077bb47ede7967a315693c9f19b5207eca4';
const BASE_TREE = '8d870b335577ca00735f6c2e578b8e3a764f4a5f';

const SOURCE_EDGES = [
  { fromLocator: 'src/gate-v3-parser.ts', kind: 'IMPORT_TYPE', exportName: null, specifier: './parser.js', toLocator: 'src/parser.ts' },
  { fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'src/lexer.ts' },
  { fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'src/requirement-diagnostics.ts' },
  { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'src/lexer.ts' },
  { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'src/gate-v3-parser.ts' },
  { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'src/parser.ts' },
];

const EMITTED_EDGES = [
  { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'lexer.js' },
  { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'requirement-diagnostics.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'lexer.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'gate-v3-parser.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'parser.js' },
];

const SOURCE_LOCATORS = [
  'src/gate-v3-parser.ts',
  'src/lexer.ts',
  'src/parser.ts',
  'src/requirement-diagnostics.ts',
  'src/source-origin-parser-entry.ts',
];

const GENERATED_LOCATORS = [
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
];

const PARSER_MODULES = [
  'gate-v3-parser.js',
  'lexer.js',
  'parser.js',
  'requirement-diagnostics.js',
  'source-origin-parser-entry.js',
];

const EXPORT_NAMES = ['lex', 'parseGateV3', 'parseProgram'];
const LIMITS = {
  closureFiles: 16_384,
  traversalEntries: 16_384,
  closureBytes: 67_108_864,
  executableBytes: 268_435_456,
  locatorDepth: 64,
  locatorBytes: 4_096,
};

const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const raw = (...parts) => createHash('sha256').update(parts.join('\0')).digest('hex');
const blob = (...parts) => createHash('sha1').update(parts.join('\0')).digest('hex');
const row = (locator, salt) => ({ locator, rawSha256: raw(salt, locator), byteLength: Buffer.byteLength(`${salt}:${locator}`) });
const joined = (rootLocator, identity) => ({
  locator: `${rootLocator}/${identity.locator}`,
  rawSha256: identity.rawSha256,
  byteLength: identity.byteLength,
});

function exactKeys(value, keys) {
  assert.deepEqual(Object.keys(value).sort(compare), [...keys].sort(compare));
}

function closure(id, rule, rootLocator, entryLocator, rows) {
  const ordered = [...rows].sort((left, right) => compare(left.locator, right.locator));
  const body = {
    schema: CLOSURE_SCHEMA,
    id,
    declaration: { rule, rootLocator, entryLocator },
    rows: ordered,
    counts: { files: ordered.length, bytes: ordered.reduce((sum, current) => sum + current.byteLength, 0) },
    authorizing: false,
  };
  return { ...body, closureDigest: sha256Canonical(CLOSURE_SCHEMA, body) };
}

function sourceObservation(platform) {
  const salt = `source-${platform}`;
  const sourceRows = SOURCE_LOCATORS.map((locator) => row(locator, 'source-common'));
  const typescriptRows = [
    row('lib/platform-data.js', salt),
    row('lib/tsc.js', salt),
    row('lib/typescript.js', salt),
    row('package.json', salt),
  ].sort((left, right) => compare(left.locator, right.locator));
  const sourceClosure = closure(
    'source-origin-parser-source',
    'exact-source-edge-row-closure.v1',
    COMPILER_ROOT,
    'src/source-origin-parser-entry.ts',
    sourceRows,
  );
  const typescriptClosure = closure(
    'typescript',
    'all-regular-files-under-package-root.v1',
    TYPESCRIPT_ROOT,
    'lib/typescript.js',
    typescriptRows,
  );
  const sourceEntryRow = sourceRows.find((current) => current.locator === 'src/source-origin-parser-entry.ts');
  const packageRow = typescriptRows.find((current) => current.locator === 'package.json');
  const typescriptEntryRow = typescriptRows.find((current) => current.locator === 'lib/typescript.js');
  const tscRow = typescriptRows.find((current) => current.locator === 'lib/tsc.js');
  const nodeIdentity = {
    version: 'v24.8.0',
    executableRawSha256: raw(platform, 'node'),
    executableByteLength: 100 + platform.length,
  };
  const gitIdentity = {
    version: 'git version 2.51.0',
    executableRawSha256: raw(platform, 'git'),
    executableByteLength: 200 + platform.length,
  };
  const body = {
    schema: SOURCE_SCHEMA,
    repository: {
      repositoryId: 'galerina',
      objectFormat: 'sha1',
      pre: { commitOid: BASE_COMMIT, treeOid: BASE_TREE },
      post: { commitOid: BASE_COMMIT, treeOid: BASE_TREE },
    },
    platform,
    arch: 'x64',
    gitExecutionBinding: 'cooperative-path-endpoint-sampling.v1',
    nodeIdentityBefore: nodeIdentity,
    nodeIdentityAfter: structuredClone(nodeIdentity),
    gitIdentityBefore: gitIdentity,
    gitIdentityAfter: structuredClone(gitIdentity),
    compilerLock: {
      locator: `${COMPILER_ROOT}/package-lock.json`,
      gitBlobOid: blob('compiler-lock'),
      rawSha256: raw('compiler-lock'),
      byteLength: 401,
      lockfileVersion: 3,
      compilerPackage: { name: '@galerina/core-compiler', version: '1.0.0-fixture', typescriptDependencyRange: '^5.9.3' },
      typescriptDependency: {
        packageKey: 'node_modules/typescript',
        version: '5.9.3',
        resolved: 'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz',
        integrity: 'sha512-fixture',
      },
    },
    typescript: {
      name: 'typescript',
      version: '5.9.3',
      packageLocator: `${TYPESCRIPT_ROOT}/package.json`,
      packageRawSha256: packageRow.rawSha256,
      packageByteLength: packageRow.byteLength,
      entryLocator: `${TYPESCRIPT_ROOT}/lib/typescript.js`,
      entryRawSha256: typescriptEntryRow.rawSha256,
      entryByteLength: typescriptEntryRow.byteLength,
    },
    typescriptCompilerCli: { rootLocator: TYPESCRIPT_ROOT, ...tscRow },
    sourceOriginParserEntry: {
      rootLocator: COMPILER_ROOT,
      ...sourceEntryRow,
      gitBlobOid: blob('source-entry'),
      exportNames: EXPORT_NAMES,
    },
    sourceOriginParserProject: {
      rootLocator: COMPILER_ROOT,
      locator: 'tsconfig.source-origin-parser.json',
      gitBlobOid: blob('source-project'),
      rawSha256: raw('source-project'),
      byteLength: 311,
      extendsLocator: './tsconfig.json',
      files: ['src/source-origin-parser-entry.ts'],
      include: [],
      compilerOptions: {
        types: [],
        noEmitOnError: true,
        incremental: false,
        composite: false,
        sourceMap: false,
        declarationMap: false,
      },
    },
    sourceEdgeRows: SOURCE_EDGES,
    declaredClosures: [sourceClosure, typescriptClosure],
    provenanceBlobs: [
      { role: 'collector-cli', locator: 'scripts/logic-aig-source-origin-toolchain-pin-observation.mjs', gitBlobOid: blob('source-cli'), rawSha256: raw('source-cli'), byteLength: 101 },
      { role: 'collector-module', locator: 'scripts/lib/logic-aig-source-origin/toolchain-pin-observation.mjs', gitBlobOid: blob('source-module'), rawSha256: raw('source-module'), byteLength: 102 },
      { role: 'collector-workflow', locator: '.github/workflows/rd0873-toolchain-pin-observation.yml', gitBlobOid: blob('source-workflow'), rawSha256: raw('source-workflow'), byteLength: 103 },
    ],
    limits: LIMITS,
    authorizing: false,
  };
  return { ...body, observationDigest: sha256Canonical(SOURCE_SCHEMA, body) };
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

function phase(phaseId, entry, moduleRows, builtinModules, parserExportNames) {
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

function loadObservation(source) {
  const generatedRows = GENERATED_LOCATORS.map((locator) => (
    locator === 'package.json'
      ? { locator, rawSha256: sha256Raw(Buffer.from('{"type":"module"}', 'utf8')), byteLength: 17 }
      : row(locator, 'generated-common')
  ));
  const generatedClosure = closure(
    GENERATED_ROOT,
    'all-regular-files-under-package-root.v1',
    GENERATED_ROOT,
    'source-origin-parser-entry.js',
    generatedRows,
  );
  const typescriptClosure = source.declaredClosures.find((current) => current.id === 'typescript');
  const tsc = typescriptClosure.rows.find((current) => current.locator === 'lib/tsc.js');
  const typescript = typescriptClosure.rows.find((current) => current.locator === 'lib/typescript.js');
  const parserRows = PARSER_MODULES.map((locator) => generatedRows.find((current) => current.locator === locator));
  const phases = [
    phase('BUILD', { rootLocator: TYPESCRIPT_ROOT, locator: 'lib/tsc.js' }, [tsc, typescript].sort((left, right) => compare(left.locator, right.locator)), ['node:fs', 'node:path', 'node:util'], null),
    phase('HOST', { rootLocator: TYPESCRIPT_ROOT, locator: 'lib/typescript.js' }, [typescript], source.platform === 'win32' ? ['node:fs', 'node:os', 'node:path'] : ['node:fs', 'node:path'], null),
    phase('PARSER', { rootLocator: GENERATED_ROOT, locator: 'source-origin-parser-entry.js' }, parserRows, [], EXPORT_NAMES),
  ];
  const body = {
    schema: LOAD_SCHEMA,
    sourceObservationDigest: source.observationDigest,
    sourceBinding: sourceBinding(source),
    buildProfile: {
      schema: 'galerina.logic-aig-source-origin-parser-build-profile.v1',
      executableRole: 'typescript-compiler-cli',
      workingDirectoryRoot: 'repository',
      compilerRootLocator: TYPESCRIPT_ROOT,
      compilerEntryLocator: 'lib/tsc.js',
      projectLocator: `${COMPILER_ROOT}/tsconfig.source-origin-parser.json`,
      generatedRootLocator: GENERATED_ROOT,
      generatedEntryLocator: 'source-origin-parser-entry.js',
      generatedPackageManifestLocator: 'package.json',
      logicalArgv: [
        'lib/tsc.js', '--project', `${COMPILER_ROOT}/tsconfig.source-origin-parser.json`,
        '--outDir', GENERATED_ROOT, '--pretty', 'false',
      ],
    },
    generatedEntry: { rootLocator: GENERATED_ROOT, ...generatedRows.find((current) => current.locator === 'source-origin-parser-entry.js') },
    generatedPackageManifest: { rootLocator: GENERATED_ROOT, ...generatedRows.find((current) => current.locator === 'package.json') },
    generatedClosure,
    repeatedGeneratedClosureDigest: generatedClosure.closureDigest,
    emittedEdgeRows: EMITTED_EDGES,
    phaseLoadSets: phases,
    provenanceBlobs: [
      { role: 'collector-cli', locator: 'scripts/logic-aig-source-origin-toolchain-load-observation.mjs', gitBlobOid: blob('load-cli'), rawSha256: raw('load-cli'), byteLength: 111 },
      { role: 'collector-module', locator: 'scripts/lib/logic-aig-source-origin/toolchain-load-observation.mjs', gitBlobOid: blob('load-module'), rawSha256: raw('load-module'), byteLength: 112 },
      { role: 'collector-workflow', locator: '.github/workflows/rd0873-toolchain-load-observation.yml', gitBlobOid: blob('load-workflow'), rawSha256: raw('load-workflow'), byteLength: 113 },
    ],
    limits: LIMITS,
    authorizing: false,
  };
  return { ...body, observationDigest: sha256Canonical(LOAD_SCHEMA, body) };
}

function pair(platform) {
  const sourceObservationValue = sourceObservation(platform);
  return {
    sourceObservation: sourceObservationValue,
    loadObservation: loadObservation(sourceObservationValue),
  };
}

function pairs() {
  return [pair('linux'), pair('win32')];
}

function resignSource(value) {
  for (const current of value.declaredClosures ?? []) {
    current.counts = {
      files: current.rows.length,
      bytes: current.rows.reduce((sum, identity) => sum + identity.byteLength, 0),
    };
    const { closureDigest: ignored, ...body } = current;
    current.closureDigest = sha256Canonical(CLOSURE_SCHEMA, body);
  }
  const { observationDigest: ignored, ...body } = value;
  value.observationDigest = sha256Canonical(SOURCE_SCHEMA, body);
  return value;
}

function resignLoad(value) {
  if (value.generatedClosure) {
    value.generatedClosure.counts = {
      files: value.generatedClosure.rows.length,
      bytes: value.generatedClosure.rows.reduce((sum, identity) => sum + identity.byteLength, 0),
    };
    const { closureDigest: ignored, ...closureBody } = value.generatedClosure;
    value.generatedClosure.closureDigest = sha256Canonical(CLOSURE_SCHEMA, closureBody);
    value.repeatedGeneratedClosureDigest = value.generatedClosure.closureDigest;
  }
  for (const current of value.phaseLoadSets ?? []) {
    current.counts = { modules: current.moduleRows.length, builtinModules: current.builtinModules.length };
    const { loadSetDigest: ignored, ...phaseBody } = current;
    current.loadSetDigest = sha256Canonical(PHASE_SCHEMA, phaseBody);
  }
  const { observationDigest: ignored, ...body } = value;
  value.observationDigest = sha256Canonical(LOAD_SCHEMA, body);
  return value;
}

function resignPins(value, { closure = true, records = true, pins = true } = {}) {
  for (const record of value.records ?? []) {
    if (closure) {
      const closureBody = {
        schema: MODULE_CLOSURE_SCHEMA,
        executableModuleRows: record.executableModuleRows,
        dataRows: record.dataRows,
        builtinModules: record.builtinModules,
        counts: {
          executableModules: record.executableModuleRows.length,
          dataRows: record.dataRows.length,
          builtinModules: record.builtinModules.length,
        },
        authorizing: false,
      };
      record.moduleClosureDigest = sha256Canonical(MODULE_CLOSURE_SCHEMA, closureBody);
    }
    if (records) {
      const { recordDigest: ignored, ...recordBody } = record;
      record.recordDigest = sha256Canonical(RECORD_SCHEMA, recordBody);
    }
  }
  if (pins) {
    const { pinsDigest: ignored, ...pinsBody } = value;
    value.pinsDigest = sha256Canonical(PINS_SCHEMA, pinsBody);
  }
  return value;
}

function expectRefusal(operation) {
  assert.throws(operation, (error) => (
    error instanceof ToolchainPinDerivationRefusal
    && error.code === 'TOOLCHAIN_PIN_DERIVATION_REFUSED'
    && error.message === error.code
    && Object.keys(error).every((key) => key === 'name' || key === 'code')
  ));
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert(Object.isFrozen(value));
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

test('derives the exact closed non-authorizing two-record v2 proposal and unchanged module-closure projection', () => {
  const value = deriveToolchainPinsV2(pairs());
  exactKeys(value, ['schema', 'records', 'authorizing', 'pinsDigest']);
  assert.equal(value.schema, PINS_SCHEMA);
  assert.equal(value.authorizing, false);
  assert.deepEqual(value.records.map((record) => record.recordId), ['linux-x64', 'win32-x64']);

  for (const record of value.records) {
    exactKeys(record, [
      'recordId', 'platform', 'arch', 'sourceObservationDigest', 'loadObservationDigest',
      'nodeIdentity', 'gitIdentity', 'typescript', 'sourceOriginParser', 'runtimeLoadSets',
      'domainSelections', 'builtinModules', 'executableModuleRows', 'dataRows',
      'moduleClosureDigest', 'recordDigest',
    ]);
    assert.equal(record.recordId, `${record.platform}-x64`);
    assert.equal(record.arch, 'x64');
    exactKeys(record.sourceOriginParser, [
      'sourceEntry', 'project', 'generatedEntry', 'generatedPackageManifest',
      'exportNames', 'sourceEdgeRows', 'emittedEdgeRows', 'generatedClosureDigest',
    ]);
    assert.deepEqual(record.sourceOriginParser.exportNames, EXPORT_NAMES);
    assert.deepEqual(record.sourceOriginParser.sourceEdgeRows, SOURCE_EDGES);
    assert.deepEqual(record.sourceOriginParser.emittedEdgeRows, EMITTED_EDGES);
    assert.deepEqual(record.runtimeLoadSets.map((runtime) => runtime.id), ['HOST', 'PARSER']);
    assert(!canonicalJsonText(record.runtimeLoadSets).includes('BUILD'));
    for (const runtime of record.runtimeLoadSets) exactKeys(runtime, ['id', 'entry', 'moduleRows', 'builtinModules']);
    assert.deepEqual(record.domainSelections, [
      { domain: 'FUNGI', parserId: 'galerina-fungi-parser', runtimeLoadSetId: 'PARSER', operation: 'parseProgram' },
      { domain: 'GATE', parserId: 'galerina-gate-v3-parser', runtimeLoadSetId: 'PARSER', operation: 'parseGateV3' },
      { domain: 'HOST', parserId: 'typescript-compiler-api', runtimeLoadSetId: 'HOST', operation: 'typescript-compiler-api' },
    ]);
    const executableLocators = new Set(record.executableModuleRows.map((identity) => identity.locator));
    const dataLocators = new Set(record.dataRows.map((identity) => identity.locator));
    assert.equal(executableLocators.has(`${TYPESCRIPT_ROOT}/lib/typescript.js`), true);
    assert.equal(executableLocators.has(`${TYPESCRIPT_ROOT}/lib/tsc.js`), false);
    assert.equal(dataLocators.has(`${TYPESCRIPT_ROOT}/lib/tsc.js`), true);
    assert.equal(dataLocators.has(`${COMPILER_ROOT}/tsconfig.source-origin-parser.json`), true);
    assert.equal(dataLocators.has(`${GENERATED_ROOT}/package.json`), true);
    for (const locator of PARSER_MODULES) assert.equal(executableLocators.has(`${GENERATED_ROOT}/${locator}`), true);
    for (const locator of GENERATED_LOCATORS.filter((locator) => !PARSER_MODULES.includes(locator))) {
      assert.equal(dataLocators.has(`${GENERATED_ROOT}/${locator}`), true);
    }
    assert.equal([...executableLocators].some((locator) => dataLocators.has(locator)), false);
    assert(record.executableModuleRows.length > 0);
    assert(record.dataRows.length > 0);
    const moduleClosureBody = {
      schema: MODULE_CLOSURE_SCHEMA,
      executableModuleRows: record.executableModuleRows,
      dataRows: record.dataRows,
      builtinModules: record.builtinModules,
      counts: {
        executableModules: record.executableModuleRows.length,
        dataRows: record.dataRows.length,
        builtinModules: record.builtinModules.length,
      },
      authorizing: false,
    };
    assert.equal(record.moduleClosureDigest, sha256Canonical(MODULE_CLOSURE_SCHEMA, moduleClosureBody));
    const { recordDigest, ...recordBody } = record;
    assert.equal(recordDigest, sha256Canonical(RECORD_SCHEMA, recordBody));
    assert.notEqual(recordDigest, record.moduleClosureDigest);
    assert.notEqual(record.sourceObservationDigest, record.loadObservationDigest);
    assert.notEqual(record.sourceOriginParser.generatedClosureDigest, record.moduleClosureDigest);
  }
  const { pinsDigest, ...pinsBody } = value;
  assert.equal(pinsDigest, sha256Canonical(PINS_SCHEMA, pinsBody));
  assert(!value.records.some((record) => record.recordDigest === pinsDigest));
  assertDeepFrozen(value);
});

test('canonical bytes are deterministic across pair order, retain no LF, and snapshot caller data', () => {
  const input = pairs();
  const first = deriveToolchainPinsV2(input);
  const second = deriveToolchainPinsV2([...pairs()].reverse());
  const firstText = canonicalToolchainPinsText(first);
  assert.equal(firstText, canonicalJsonText(first));
  assert.equal(firstText, canonicalToolchainPinsText(second));
  assert.equal(Buffer.from(firstText, 'utf8').at(-1), 0x7d);
  input[0].sourceObservation.nodeIdentityBefore.version = 'mutated-after-derivation';
  assert.equal(canonicalToolchainPinsText(first), firstText);
  assert.throws(() => { first.records[0].recordId = 'mutated'; }, TypeError);
  assert.deepEqual(validateToolchainPinsV2(JSON.parse(firstText)), first);
});

test('requires exactly one matching reviewed-style linux-x64 and win32-x64 source/load pair at one repository state', () => {
  expectRefusal(() => deriveToolchainPinsV2([]));
  expectRefusal(() => deriveToolchainPinsV2([pair('linux')]));
  expectRefusal(() => deriveToolchainPinsV2([...pairs(), pair('linux')]));
  expectRefusal(() => deriveToolchainPinsV2([pair('linux'), pair('linux')]));
  const mismatched = pairs();
  [mismatched[0].loadObservation, mismatched[1].loadObservation] = [mismatched[1].loadObservation, mismatched[0].loadObservation];
  expectRefusal(() => deriveToolchainPinsV2(mismatched));
  const differentTree = pairs();
  differentTree[1].sourceObservation.repository.pre.treeOid = 'f'.repeat(40);
  differentTree[1].sourceObservation.repository.post.treeOid = 'f'.repeat(40);
  resignSource(differentTree[1].sourceObservation);
  differentTree[1].loadObservation = loadObservation(differentTree[1].sourceObservation);
  expectRefusal(() => deriveToolchainPinsV2(differentTree));
  const surplusPairKey = pairs();
  surplusPairKey[0].authority = true;
  expectRefusal(() => deriveToolchainPinsV2(surplusPairKey));
});

test('mandatory source/load validators refuse schema, binding, builtin, row, declaration, entry, and digest mutations', () => {
  const sourceSchema = pairs();
  sourceSchema[0].sourceObservation.schema = 'galerina.logic-aig-toolchain-pin-observation.v1';
  expectRefusal(() => deriveToolchainPinsV2(sourceSchema));

  const sourceCaseCollision = pairs();
  sourceCaseCollision[0].sourceObservation.declaredClosures[1].rows.push({
    ...sourceCaseCollision[0].sourceObservation.declaredClosures[1].rows[0],
    locator: sourceCaseCollision[0].sourceObservation.declaredClosures[1].rows[0].locator.toUpperCase(),
  });
  sourceCaseCollision[0].sourceObservation.declaredClosures[1].rows.sort((left, right) => compare(left.locator, right.locator));
  resignSource(sourceCaseCollision[0].sourceObservation);
  expectRefusal(() => deriveToolchainPinsV2(sourceCaseCollision));

  const loadBinding = pairs();
  loadBinding[0].loadObservation.sourceObservationDigest = loadBinding[1].sourceObservation.observationDigest;
  resignLoad(loadBinding[0].loadObservation);
  expectRefusal(() => deriveToolchainPinsV2(loadBinding));

  const buildPromotion = pairs();
  const build = buildPromotion[0].loadObservation.phaseLoadSets[0];
  build.moduleRows.push(buildPromotion[0].loadObservation.generatedClosure.rows.find((identity) => identity.locator === 'package.json'));
  build.moduleRows.sort((left, right) => compare(left.locator, right.locator));
  resignLoad(buildPromotion[0].loadObservation);
  expectRefusal(() => deriveToolchainPinsV2(buildPromotion));

  const parserDeclaration = pairs();
  const parser = parserDeclaration[0].loadObservation.phaseLoadSets[2];
  parser.moduleRows.push(parserDeclaration[0].loadObservation.generatedClosure.rows.find((identity) => identity.locator === 'lexer.d.ts'));
  parser.moduleRows.sort((left, right) => compare(left.locator, right.locator));
  resignLoad(parserDeclaration[0].loadObservation);
  expectRefusal(() => deriveToolchainPinsV2(parserDeclaration));

  const builtinMutation = pairs();
  builtinMutation[0].loadObservation.phaseLoadSets[1].builtinModules.push('fs');
  builtinMutation[0].loadObservation.phaseLoadSets[1].builtinModules.sort(compare);
  resignLoad(builtinMutation[0].loadObservation);
  expectRefusal(() => deriveToolchainPinsV2(builtinMutation));

  const generatedDigestSubstitution = pairs();
  generatedDigestSubstitution[0].loadObservation.generatedClosure.closureDigest = generatedDigestSubstitution[0].loadObservation.observationDigest;
  generatedDigestSubstitution[0].loadObservation.repeatedGeneratedClosureDigest = generatedDigestSubstitution[0].loadObservation.generatedClosure.closureDigest;
  const { observationDigest: ignored, ...loadBody } = generatedDigestSubstitution[0].loadObservation;
  generatedDigestSubstitution[0].loadObservation.observationDigest = sha256Canonical(LOAD_SCHEMA, loadBody);
  expectRefusal(() => deriveToolchainPinsV2(generatedDigestSubstitution));
});

test('standalone v2 validation rejects closed-schema, record identity, selector, and v1 substitutions after redigest', () => {
  const value = structuredClone(deriveToolchainPinsV2(pairs()));
  expectRefusal(() => validateToolchainPinsV2({ ...value, schema: 'galerina.logic-aig-toolchain-pins.v1' }));
  expectRefusal(() => validateToolchainPinsV2({ ...value, approved: true }));
  const recordKey = structuredClone(value);
  recordKey.records[0].approved = true;
  expectRefusal(() => validateToolchainPinsV2(resignPins(recordKey)));
  const identity = structuredClone(value);
  identity.records[0].recordId = 'win32-x64';
  expectRefusal(() => validateToolchainPinsV2(resignPins(identity)));
  const selector = structuredClone(value);
  selector.records[0].domainSelections[0].operation = 'parseGateV3';
  expectRefusal(() => validateToolchainPinsV2(resignPins(selector)));
  const exports = structuredClone(value);
  exports.records[0].sourceOriginParser.exportNames = ['parseProgram'];
  expectRefusal(() => validateToolchainPinsV2(resignPins(exports)));
});

test('runtime sets exclude BUILD and bind exact HOST/PARSER unions, entries, rows, and builtins', () => {
  const value = structuredClone(deriveToolchainPinsV2(pairs()));
  const build = structuredClone(value.records[0].runtimeLoadSets[0]);
  build.id = 'BUILD';
  const withBuild = structuredClone(value);
  withBuild.records[0].runtimeLoadSets.push(build);
  expectRefusal(() => validateToolchainPinsV2(resignPins(withBuild)));

  const wrongEntry = structuredClone(value);
  wrongEntry.records[0].runtimeLoadSets[0].entry.locator = 'lib/tsc.js';
  expectRefusal(() => validateToolchainPinsV2(resignPins(wrongEntry)));

  const missingRuntimeRow = structuredClone(value);
  missingRuntimeRow.records[0].runtimeLoadSets[1].moduleRows.pop();
  expectRefusal(() => validateToolchainPinsV2(resignPins(missingRuntimeRow)));

  const unionRowDrift = structuredClone(value);
  unionRowDrift.records[0].executableModuleRows[0].rawSha256 = '0'.repeat(64);
  expectRefusal(() => validateToolchainPinsV2(resignPins(unionRowDrift)));

  const unionBuiltinDrift = structuredClone(value);
  unionBuiltinDrift.records[0].builtinModules = ['node:fs'];
  expectRefusal(() => validateToolchainPinsV2(resignPins(unionBuiltinDrift)));

  const crossPlatformUnion = structuredClone(value);
  crossPlatformUnion.records[0].executableModuleRows = structuredClone(crossPlatformUnion.records[1].executableModuleRows);
  expectRefusal(() => validateToolchainPinsV2(resignPins(crossPlatformUnion)));
});

test('complete executable/data partition refuses all-executable, all-data, omission, surplus, duplicate, and promotion drift', () => {
  const value = structuredClone(deriveToolchainPinsV2(pairs()));
  const allExecutable = structuredClone(value);
  allExecutable.records[0].executableModuleRows = [
    ...allExecutable.records[0].executableModuleRows,
    ...allExecutable.records[0].dataRows,
  ].sort((left, right) => compare(left.locator, right.locator));
  allExecutable.records[0].dataRows = [];
  expectRefusal(() => validateToolchainPinsV2(resignPins(allExecutable)));

  const allData = structuredClone(value);
  allData.records[0].dataRows = [
    ...allData.records[0].executableModuleRows,
    ...allData.records[0].dataRows,
  ].sort((left, right) => compare(left.locator, right.locator));
  allData.records[0].executableModuleRows = [];
  expectRefusal(() => validateToolchainPinsV2(resignPins(allData)));

  const omittedProject = structuredClone(value);
  omittedProject.records[0].dataRows = omittedProject.records[0].dataRows.filter(
    (identity) => identity.locator !== `${COMPILER_ROOT}/tsconfig.source-origin-parser.json`,
  );
  expectRefusal(() => validateToolchainPinsV2(resignPins(omittedProject)));

  const promotedDeclaration = structuredClone(value);
  const declaration = promotedDeclaration.records[0].dataRows.find(
    (identity) => identity.locator === `${GENERATED_ROOT}/lexer.d.ts`,
  );
  promotedDeclaration.records[0].dataRows = promotedDeclaration.records[0].dataRows.filter(
    (identity) => identity.locator !== declaration.locator,
  );
  promotedDeclaration.records[0].executableModuleRows.push(declaration);
  promotedDeclaration.records[0].executableModuleRows.sort((left, right) => compare(left.locator, right.locator));
  expectRefusal(() => validateToolchainPinsV2(resignPins(promotedDeclaration)));

  const extra = structuredClone(value);
  extra.records[0].dataRows.push({ locator: 'unapproved/extra.dat', rawSha256: raw('extra'), byteLength: 1 });
  extra.records[0].dataRows.sort((left, right) => compare(left.locator, right.locator));
  expectRefusal(() => validateToolchainPinsV2(resignPins(extra)));

  const duplicate = structuredClone(value);
  duplicate.records[0].dataRows.push(structuredClone(duplicate.records[0].dataRows[0]));
  expectRefusal(() => validateToolchainPinsV2(resignPins(duplicate)));
});

test('global joined-locator and pinned-Node case-fold collisions refuse across derived rows', () => {
  const value = structuredClone(deriveToolchainPinsV2(pairs()));
  const exactCollision = structuredClone(value);
  exactCollision.records[0].dataRows.push(structuredClone(exactCollision.records[0].executableModuleRows[0]));
  exactCollision.records[0].dataRows.sort((left, right) => compare(left.locator, right.locator));
  expectRefusal(() => validateToolchainPinsV2(resignPins(exactCollision)));

  const caseCollision = structuredClone(value);
  const executable = caseCollision.records[0].executableModuleRows[0];
  caseCollision.records[0].dataRows.push({
    ...executable,
    locator: executable.locator.toUpperCase(),
  });
  caseCollision.records[0].dataRows.sort((left, right) => compare(left.locator, right.locator));
  expectRefusal(() => validateToolchainPinsV2(resignPins(caseCollision)));
});

test('every v2 digest domain refuses record, pins, module-closure, source, and load substitutions', () => {
  const value = structuredClone(deriveToolchainPinsV2(pairs()));
  const recordDigest = structuredClone(value);
  recordDigest.records[0].recordDigest = recordDigest.records[0].moduleClosureDigest;
  const { pinsDigest: ignoredRecordPins, ...recordPinsBody } = recordDigest;
  recordDigest.pinsDigest = sha256Canonical(PINS_SCHEMA, recordPinsBody);
  expectRefusal(() => validateToolchainPinsV2(recordDigest));

  const pinsDigest = structuredClone(value);
  pinsDigest.pinsDigest = pinsDigest.records[0].recordDigest;
  expectRefusal(() => validateToolchainPinsV2(pinsDigest));

  const moduleDigest = structuredClone(value);
  moduleDigest.records[0].moduleClosureDigest = moduleDigest.records[0].sourceOriginParser.generatedClosureDigest;
  resignPins(moduleDigest, { closure: false });
  expectRefusal(() => validateToolchainPinsV2(moduleDigest));

  const sourceDigest = pairs();
  sourceDigest[0].sourceObservation.observationDigest = sourceDigest[0].loadObservation.observationDigest;
  expectRefusal(() => deriveToolchainPinsV2(sourceDigest));

  const loadDigest = pairs();
  loadDigest[0].loadObservation.observationDigest = loadDigest[0].sourceObservation.observationDigest;
  expectRefusal(() => deriveToolchainPinsV2(loadDigest));
});

test('defensive data boundary rejects accessors, proxies, symbols, cycles, and sparse arrays without invoking caller code', () => {
  let getterCalls = 0;
  const accessorPair = pair('linux');
  Object.defineProperty(accessorPair, 'loadObservation', {
    enumerable: true,
    get() { getterCalls += 1; return loadObservation(accessorPair.sourceObservation); },
  });
  expectRefusal(() => deriveToolchainPinsV2([accessorPair, pair('win32')]));
  assert.equal(getterCalls, 0);

  expectRefusal(() => deriveToolchainPinsV2(new Proxy(pairs(), {})));
  const symbol = pairs();
  symbol[0][Symbol('authority')] = true;
  expectRefusal(() => deriveToolchainPinsV2(symbol));
  const cyclic = pairs();
  cyclic[0].cycle = cyclic;
  expectRefusal(() => deriveToolchainPinsV2(cyclic));
  const sparse = Array(2);
  sparse[0] = pair('linux');
  expectRefusal(() => deriveToolchainPinsV2(sparse));
});
