import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  sha256Canonical,
  sha256Raw,
} from '../lib/logic-aig-source-origin/contract.mjs';
import { buildToolchainSnapshot } from '../lib/logic-aig-source-origin/toolchain-snapshot.mjs';

// The approved owners name the module and manifest behavior, but not its export.
// This RED slice fixes the bounded fixture-first seam as buildToolchainSnapshot(options).

const FIXTURE_PLATFORM = 'fixture-os';
const FIXTURE_ARCH = 'fixture-arch';

function without(value, key) {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

function fixtureRow(locator, body) {
  const bytes = Buffer.from(body, 'utf8');
  return {
    locator,
    rawSha256: sha256Raw(bytes),
    byteLength: bytes.length,
  };
}

function executableIdentity(version, body) {
  const bytes = Buffer.from(body, 'utf8');
  return {
    version,
    executableRawSha256: sha256Raw(bytes),
    executableByteLength: bytes.length,
  };
}

function packageIdentity(name) {
  const packageBytes = Buffer.from(`${name}-package`, 'utf8');
  const entryBytes = Buffer.from(`${name}-entry`, 'utf8');
  return {
    name,
    version: 'fixture-1.0.0',
    packageLocator: `fixture/${name}/package.json`,
    packageRawSha256: sha256Raw(packageBytes),
    packageByteLength: packageBytes.length,
    entryLocator: `fixture/${name}/index.mjs`,
    entryRawSha256: sha256Raw(entryBytes),
    entryByteLength: entryBytes.length,
  };
}

function moduleClosureDigest({ executableModuleRows, dataRows, builtinModules }) {
  const body = {
    schema: 'galerina.logic-aig-module-closure.v1',
    executableModuleRows,
    dataRows,
    builtinModules,
    counts: {
      executableModules: executableModuleRows.length,
      dataRows: dataRows.length,
      builtinModules: builtinModules.length,
    },
    authorizing: false,
  };
  return sha256Canonical(body.schema, body);
}

function fixtureRecord(overrides = {}) {
  const executableModuleRows = overrides.executableModuleRows ?? [
    fixtureRow('fixture/parser/index.mjs', 'parser-entry'),
    fixtureRow('fixture/typescript/index.js', 'typescript-entry'),
  ];
  const dataRows = overrides.dataRows ?? [
    fixtureRow('fixture/parser/build-receipt.json', '{"status":"fixture"}'),
    fixtureRow('fixture/typescript/lib.d.ts', 'declare const fixture: true;'),
  ];
  const builtinModules = overrides.builtinModules ?? ['node:path', 'node:util'];
  const body = {
    recordId: overrides.recordId ?? 'fixture-record-a',
    platform: overrides.platform ?? FIXTURE_PLATFORM,
    arch: overrides.arch ?? FIXTURE_ARCH,
    nodeIdentity: overrides.nodeIdentity ?? executableIdentity('fixture-node', 'node-executable'),
    gitIdentity: overrides.gitIdentity ?? executableIdentity('fixture-git', 'git-executable'),
    typescript: overrides.typescript ?? packageIdentity('typescript'),
    galerinaParser: overrides.galerinaParser ?? packageIdentity('galerina-parser'),
    builtinModules,
    executableModuleRows,
    dataRows,
    moduleClosureDigest: overrides.moduleClosureDigest ?? moduleClosureDigest({
      executableModuleRows,
      dataRows,
      builtinModules,
    }),
  };
  return {
    ...body,
    recordDigest: sha256Canonical('galerina.logic-aig-toolchain-pin-record.v1', body),
  };
}

function fixturePins(records = [fixtureRecord()]) {
  const body = {
    schema: 'galerina.logic-aig-toolchain-pins.v1',
    records,
    authorizing: false,
  };
  return { ...body, pinsDigest: sha256Canonical(body.schema, body) };
}

function fixtureOptions(overrides = {}) {
  const record = fixtureRecord();
  return {
    pins: fixturePins([record]),
    platform: FIXTURE_PLATFORM,
    arch: FIXTURE_ARCH,
    nodeIdentity: structuredClone(record.nodeIdentity),
    gitIdentity: structuredClone(record.gitIdentity),
    actualLoadedModuleRows: [structuredClone(record.executableModuleRows[0])],
    actualLoadedBuiltinModules: ['node:path'],
    ...overrides,
  };
}

function expectRefusal(operation, pattern = /^SOURCE_ORIGIN_(?!HOLD)[A-Z0-9_]+$/) {
  assert.throws(operation, (error) => {
    assert.match(error?.code ?? '', pattern);
    return true;
  });
}

function assertClosedObject(value, keys) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
}

test('buildToolchainSnapshot creates the exact closed non-authorizing fixture manifest', () => {
  const options = fixtureOptions();
  const record = options.pins.records[0];
  const manifest = buildToolchainSnapshot(options);

  assertClosedObject(manifest, [
    'schema', 'selectedPinRecordId', 'selectedPinRecordDigest', 'pinsDigest',
    'platform', 'arch', 'nodeIdentity', 'gitIdentity', 'typescript',
    'galerinaParser', 'builtinModules', 'executableModuleRows', 'dataRows',
    'moduleClosureDigest', 'actualLoadedModuleRows', 'actualLoadedSetDigest',
    'authorizing', 'toolchainManifestDigest',
  ]);
  assert.equal(manifest.schema, 'galerina.logic-aig-toolchain-manifest.v1');
  assert.equal(manifest.selectedPinRecordId, record.recordId);
  assert.equal(manifest.selectedPinRecordDigest, record.recordDigest);
  assert.equal(manifest.pinsDigest, options.pins.pinsDigest);
  assert.deepEqual(manifest.nodeIdentity, record.nodeIdentity);
  assert.deepEqual(manifest.gitIdentity, record.gitIdentity);
  assert.deepEqual(manifest.typescript, record.typescript);
  assert.deepEqual(manifest.galerinaParser, record.galerinaParser);
  assert.deepEqual(manifest.executableModuleRows, record.executableModuleRows);
  assert.deepEqual(manifest.dataRows, record.dataRows);
  assert.equal(manifest.authorizing, false);
  assert.equal(
    manifest.toolchainManifestDigest,
    sha256Canonical(manifest.schema, without(manifest, 'toolchainManifestDigest')),
  );
});

test('portable toolchain input produces a closed manifest without startup or execution authority', () => {
  const manifest = buildToolchainSnapshot(fixtureOptions());
  assertClosedObject(manifest, [
    'schema', 'selectedPinRecordId', 'selectedPinRecordDigest', 'pinsDigest',
    'platform', 'arch', 'nodeIdentity', 'gitIdentity', 'typescript',
    'galerinaParser', 'builtinModules', 'executableModuleRows', 'dataRows',
    'moduleClosureDigest', 'actualLoadedModuleRows', 'actualLoadedSetDigest',
    'authorizing', 'toolchainManifestDigest',
  ]);
  assert.equal(manifest.authorizing, false);
});

test('legacy nodeStartup input is a closed-schema refusal', () => {
  expectRefusal(
    () => buildToolchainSnapshot({ ...fixtureOptions(), nodeStartup: { legacy: true } }),
    /^SOURCE_ORIGIN_SCHEMA$/,
  );
});

test('toolchain manifest contains no Windows SystemRoot held-startup or execution-boundary literals', () => {
  const manifestText = canonicalJsonText(buildToolchainSnapshot(fixtureOptions()));
  assert.doesNotMatch(
    manifestText,
    /WINDOWS_SYSTEMROOT_ONLY|SystemRoot|HELD_SYSTEM_ROOT_REGISTRY_OWNER|COOPERATIVE_LOCAL_SAME_USER|nodeStartup|executionBoundary/,
  );
});

test('production-equivalent empty pins remain HOLD and return no partial manifest', () => {
  const options = fixtureOptions({ pins: fixturePins([]) });
  expectRefusal(
    () => buildToolchainSnapshot(options),
    /^SOURCE_ORIGIN_HOLD_TOOLCHAIN$/,
  );
});

test('selection requires exactly one platform and architecture match', () => {
  const first = fixtureRecord({ recordId: 'fixture-record-a' });
  const second = fixtureRecord({ recordId: 'fixture-record-b' });
  expectRefusal(() => buildToolchainSnapshot(fixtureOptions({ pins: fixturePins([first, second]) })));
  expectRefusal(() => buildToolchainSnapshot(fixtureOptions({ platform: 'other-os' })));
  expectRefusal(() => buildToolchainSnapshot(fixtureOptions({ arch: 'other-arch' })));
});

test('selection binds exact Node and Git identities rather than version-only matches', () => {
  const options = fixtureOptions();
  const wrongNode = { ...options.nodeIdentity, executableRawSha256: '4'.repeat(64) };
  const wrongGit = { ...options.gitIdentity, executableByteLength: options.gitIdentity.executableByteLength + 1 };
  expectRefusal(() => buildToolchainSnapshot({ ...options, nodeIdentity: wrongNode }));
  expectRefusal(() => buildToolchainSnapshot({ ...options, gitIdentity: wrongGit }));
});

test('moduleClosureDigest uses the independent closed closure domain', () => {
  const options = fixtureOptions();
  const record = options.pins.records[0];
  assert.equal(record.moduleClosureDigest, moduleClosureDigest(record));

  const manifest = buildToolchainSnapshot(options);
  assert.equal(manifest.moduleClosureDigest, record.moduleClosureDigest);
  assert.notEqual(manifest.moduleClosureDigest, manifest.actualLoadedSetDigest);
});

test('executable, data and builtin owners must be sorted, unique and disjoint', () => {
  const base = fixtureRecord();
  const hostileRecords = [
    fixtureRecord({ executableModuleRows: [...base.executableModuleRows].reverse() }),
    fixtureRecord({ executableModuleRows: [base.executableModuleRows[0], base.executableModuleRows[0]] }),
    fixtureRecord({ dataRows: [base.executableModuleRows[0], ...base.dataRows] }),
    fixtureRecord({ builtinModules: ['node:util', 'node:path'] }),
    fixtureRecord({ builtinModules: ['node:path', 'node:path'] }),
  ];
  for (const record of hostileRecords) {
    expectRefusal(() => buildToolchainSnapshot(fixtureOptions({ pins: fixturePins([record]) })));
  }
});

test('actual loaded rows are a sorted byte-identical subset with an independent digest', () => {
  const options = fixtureOptions();
  const manifest = buildToolchainSnapshot(options);
  const body = {
    schema: 'galerina.logic-aig-actual-loaded-set.v1',
    actualLoadedModuleRows: options.actualLoadedModuleRows,
    count: options.actualLoadedModuleRows.length,
    authorizing: false,
  };
  assert.deepEqual(manifest.actualLoadedModuleRows, options.actualLoadedModuleRows);
  assert.equal(manifest.actualLoadedSetDigest, sha256Canonical(body.schema, body));
});

test('an extra, altered, duplicated or reordered module load refuses', () => {
  const options = fixtureOptions();
  const record = options.pins.records[0];
  const extra = fixtureRow('fixture/unapproved/index.mjs', 'unapproved');
  const altered = { ...record.executableModuleRows[0], rawSha256: '5'.repeat(64) };
  for (const actualLoadedModuleRows of [
    [extra],
    [altered],
    [record.executableModuleRows[0], record.executableModuleRows[0]],
    [...record.executableModuleRows].reverse(),
  ]) {
    expectRefusal(() => buildToolchainSnapshot({ ...options, actualLoadedModuleRows }));
  }
});

test('an actual built-in outside the admitted sorted allowlist refuses', () => {
  const options = fixtureOptions();
  expectRefusal(() => buildToolchainSnapshot({
    ...options,
    actualLoadedBuiltinModules: ['node:fs'],
  }));
  expectRefusal(() => buildToolchainSnapshot({
    ...options,
    actualLoadedBuiltinModules: ['node:util', 'node:path'],
  }));
});

test('same inputs are deterministic and returned evidence is deeply immutable and unaliased', () => {
  const options = fixtureOptions();
  const first = buildToolchainSnapshot(options);
  const second = buildToolchainSnapshot(structuredClone(options));
  assert.deepEqual(second, first);
  assert(Object.isFrozen(first));
  assert(Object.isFrozen(first.executableModuleRows));
  assert(Object.isFrozen(first.executableModuleRows[0]));

  const retainedLocator = first.executableModuleRows[0].locator;
  options.pins.records[0].executableModuleRows[0].locator = 'fixture/substituted.mjs';
  options.actualLoadedModuleRows[0].locator = 'fixture/also-substituted.mjs';
  assert.equal(first.executableModuleRows[0].locator, retainedLocator);
  assert.throws(() => { first.executableModuleRows[0].locator = 'fixture/mutation.mjs'; }, TypeError);
});

test('proxy and accessor attacks refuse before caller code runs', () => {
  let calls = 0;
  const hostile = new Proxy({}, {
    get() { calls += 1; throw new Error('proxy get ran'); },
    getOwnPropertyDescriptor() { calls += 1; throw new Error('proxy descriptor ran'); },
    getPrototypeOf() { calls += 1; throw new Error('proxy prototype ran'); },
    ownKeys() { calls += 1; throw new Error('proxy keys ran'); },
  });
  expectRefusal(() => buildToolchainSnapshot(hostile));
  expectRefusal(() => buildToolchainSnapshot({ ...fixtureOptions(), pins: hostile }));
  assert.equal(calls, 0);

  let getterCalls = 0;
  const accessor = fixtureOptions();
  Object.defineProperty(accessor, 'platform', {
    enumerable: true,
    get() { getterCalls += 1; return FIXTURE_PLATFORM; },
  });
  expectRefusal(() => buildToolchainSnapshot(accessor));
  assert.equal(getterCalls, 0);
});

test('sparse, cyclic, deeply nested, unsafe-length and executable-injection inputs refuse', () => {
  const sparseRows = new Array(1);
  expectRefusal(() => buildToolchainSnapshot({ ...fixtureOptions(), actualLoadedModuleRows: sparseRows }));

  const cyclicOptions = fixtureOptions();
  cyclicOptions.pins.records[0].typescript = cyclicOptions;
  expectRefusal(() => buildToolchainSnapshot(cyclicOptions));

  let deeplyNested = null;
  for (let index = 0; index <= 129; index += 1) deeplyNested = [deeplyNested];
  const deeplyNestedOptions = fixtureOptions();
  deeplyNestedOptions.pins.records[0].dataRows[0].locator = deeplyNested;
  expectRefusal(() => buildToolchainSnapshot(deeplyNestedOptions));

  const record = fixtureRecord();
  record.executableModuleRows[0].byteLength = Number.MAX_SAFE_INTEGER + 1;
  expectRefusal(() => buildToolchainSnapshot(fixtureOptions({ pins: fixturePins([record]) })));

  let executions = 0;
  expectRefusal(() => buildToolchainSnapshot({
    ...fixtureOptions(),
    executeParser() { executions += 1; },
  }));
  assert.equal(executions, 0);
});
