import {
  canonicalJsonText,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
} from './contract.mjs';
import { validateToolchainPinObservation } from './toolchain-pin-observation.mjs';
import { validateToolchainLoadObservation } from './toolchain-load-observation.mjs';

const REFUSAL_CODE = 'TOOLCHAIN_PIN_DERIVATION_REFUSED';
const SOURCE_SCHEMA = 'galerina.logic-aig-toolchain-pin-observation.v2';
const LOAD_SCHEMA = 'galerina.logic-aig-toolchain-load-observation.v1';
const PINS_SCHEMA = 'galerina.logic-aig-toolchain-pins.v2';
const RECORD_SCHEMA = 'galerina.logic-aig-toolchain-pin-record.v2';
const MODULE_CLOSURE_SCHEMA = 'galerina.logic-aig-module-closure.v1';
const COMPILER_ROOT = 'packages-ts/galerina-core-compiler';
const TYPESCRIPT_ROOT = `${COMPILER_ROOT}/node_modules/typescript`;
const GENERATED_ROOT = 'generated-source-origin-parser';
const SOURCE_ENTRY = 'src/source-origin-parser-entry.ts';
const PROJECT = 'tsconfig.source-origin-parser.json';
const GENERATED_ENTRY = 'source-origin-parser-entry.js';
const GENERATED_MANIFEST = 'package.json';
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const BUILTIN = /^node:[a-z0-9][a-z0-9_./-]*$/u;
const MAX_LOCATOR_BYTES = 4_096;
const MAX_LOCATOR_DEPTH = 64;

const EXPORT_NAMES = Object.freeze(['lex', 'parseGateV3', 'parseProgram']);
const SOURCE_EDGE_ROWS = Object.freeze([
  Object.freeze({ fromLocator: 'src/gate-v3-parser.ts', kind: 'IMPORT_TYPE', exportName: null, specifier: './parser.js', toLocator: 'src/parser.ts' }),
  Object.freeze({ fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'src/lexer.ts' }),
  Object.freeze({ fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'src/requirement-diagnostics.ts' }),
  Object.freeze({ fromLocator: SOURCE_ENTRY, kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'src/lexer.ts' }),
  Object.freeze({ fromLocator: SOURCE_ENTRY, kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'src/gate-v3-parser.ts' }),
  Object.freeze({ fromLocator: SOURCE_ENTRY, kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'src/parser.ts' }),
]);
const EMITTED_EDGE_ROWS = Object.freeze([
  Object.freeze({ fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'lexer.js' }),
  Object.freeze({ fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'requirement-diagnostics.js' }),
  Object.freeze({ fromLocator: GENERATED_ENTRY, kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'lexer.js' }),
  Object.freeze({ fromLocator: GENERATED_ENTRY, kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'gate-v3-parser.js' }),
  Object.freeze({ fromLocator: GENERATED_ENTRY, kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'parser.js' }),
]);
const SOURCE_LOCATORS = Object.freeze([
  'src/gate-v3-parser.ts',
  'src/lexer.ts',
  'src/parser.ts',
  'src/requirement-diagnostics.ts',
  SOURCE_ENTRY,
]);
const GENERATED_LOCATORS = Object.freeze([
  'gate-v3-parser.d.ts',
  'gate-v3-parser.js',
  'lexer.d.ts',
  'lexer.js',
  GENERATED_MANIFEST,
  'parser.d.ts',
  'parser.js',
  'requirement-diagnostics.d.ts',
  'requirement-diagnostics.js',
  'source-origin-parser-entry.d.ts',
  GENERATED_ENTRY,
]);
const PARSER_MODULES = Object.freeze([
  'gate-v3-parser.js',
  'lexer.js',
  'parser.js',
  'requirement-diagnostics.js',
  GENERATED_ENTRY,
]);
const DOMAIN_SELECTIONS = Object.freeze([
  Object.freeze({ domain: 'FUNGI', parserId: 'galerina-fungi-parser', runtimeLoadSetId: 'PARSER', operation: 'parseProgram' }),
  Object.freeze({ domain: 'GATE', parserId: 'galerina-gate-v3-parser', runtimeLoadSetId: 'PARSER', operation: 'parseGateV3' }),
  Object.freeze({ domain: 'HOST', parserId: 'typescript-compiler-api', runtimeLoadSetId: 'HOST', operation: 'typescript-compiler-api' }),
]);

export class ToolchainPinDerivationRefusal extends Error {
  constructor() {
    super(REFUSAL_CODE);
    this.name = 'ToolchainPinDerivationRefusal';
    this.code = REFUSAL_CODE;
  }
}

function refuse() {
  throw new ToolchainPinDerivationRefusal();
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshot(value) {
  try {
    return JSON.parse(canonicalJsonText(value));
  } catch {
    refuse();
  }
}

function freezeCanonical(value) {
  try {
    const bytes = Buffer.from(canonicalJsonText(value), 'utf8');
    return parseCanonicalJsonBytes(bytes, { label: 'toolchain-pins-v2' });
  } catch {
    refuse();
  }
}

function exactObject(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) refuse();
  const actual = Object.keys(value).sort(compare);
  const expected = [...keys].sort(compare);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) refuse();
}

function exactArray(value, length) {
  if (!Array.isArray(value) || (length !== undefined && value.length !== length)) refuse();
}

function exactEqual(left, right) {
  if (canonicalJsonText(left) !== canonicalJsonText(right)) refuse();
}

function nonEmptyString(value) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.normalize('NFC')) refuse();
}

function digest(value) {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse();
}

function byteLength(value) {
  if (!Number.isSafeInteger(value) || value < 0) refuse();
}

function locator(value) {
  nonEmptyString(value);
  if (Buffer.byteLength(value, 'utf8') > MAX_LOCATOR_BYTES
    || value.includes('\\') || value.includes('\0') || value.includes(':')
    || value.startsWith('/') || value.endsWith('/')) refuse();
  const components = value.split('/');
  if (components.length > MAX_LOCATOR_DEPTH
    || components.some((component) => component === '' || component === '.' || component === '..')) refuse();
}

function identityRow(value) {
  exactObject(value, ['locator', 'rawSha256', 'byteLength']);
  locator(value.locator);
  digest(value.rawSha256);
  byteLength(value.byteLength);
}

function rootedIdentity(rootLocator, value) {
  locator(rootLocator);
  identityRow(strippedIdentity(value));
  return {
    rootLocator,
    locator: value.locator,
    rawSha256: value.rawSha256,
    byteLength: value.byteLength,
  };
}

function strippedIdentity(value) {
  return { locator: value.locator, rawSha256: value.rawSha256, byteLength: value.byteLength };
}

function joinedIdentity(value) {
  return {
    locator: `${value.rootLocator}/${value.locator}`,
    rawSha256: value.rawSha256,
    byteLength: value.byteLength,
  };
}

function pairKey(value) {
  return `${value.rootLocator}\0${value.locator}`;
}

function sameRawIdentity(left, right) {
  return left.rawSha256 === right.rawSha256 && left.byteLength === right.byteLength;
}

function uniquePairs(values) {
  const byPair = new Map();
  for (const value of values) {
    locator(value.rootLocator);
    identityRow(strippedIdentity(value));
    const key = pairKey(value);
    const prior = byPair.get(key);
    if (prior && !sameRawIdentity(prior, value)) refuse();
    if (!prior) byPair.set(key, value);
  }
  return byPair;
}

function globalCollisionCheck(values) {
  const byPair = uniquePairs(values);
  const exactJoined = new Set();
  const foldedJoined = new Set();
  for (const value of byPair.values()) {
    const joined = `${value.rootLocator}/${value.locator}`;
    const folded = joined.toLowerCase();
    if (exactJoined.has(joined) || foldedJoined.has(folded)) refuse();
    exactJoined.add(joined);
    foldedJoined.add(folded);
  }
}

function sortedUniqueStrings(values) {
  exactArray(values);
  let prior;
  for (const value of values) {
    nonEmptyString(value);
    if (prior !== undefined && compare(prior, value) >= 0) refuse();
    prior = value;
  }
}

function sortedUniqueRows(values) {
  exactArray(values);
  let prior;
  for (const value of values) {
    identityRow(value);
    if (prior !== undefined && compare(prior, value.locator) >= 0) refuse();
    prior = value.locator;
  }
}

function canonicalBuiltin(value) {
  if (!BUILTIN.test(value)) refuse();
  const components = value.slice(5).split('/');
  if (components.some((component) => component === '' || component === '.' || component === '..')) refuse();
}

function executableIdentity(value) {
  exactObject(value, ['version', 'executableRawSha256', 'executableByteLength']);
  nonEmptyString(value.version);
  digest(value.executableRawSha256);
  byteLength(value.executableByteLength);
}

function packageIdentity(value) {
  exactObject(value, [
    'name', 'version', 'packageLocator', 'packageRawSha256', 'packageByteLength',
    'entryLocator', 'entryRawSha256', 'entryByteLength',
  ]);
  for (const field of ['name', 'version', 'packageLocator', 'entryLocator']) nonEmptyString(value[field]);
  locator(value.packageLocator);
  locator(value.entryLocator);
  digest(value.packageRawSha256);
  digest(value.entryRawSha256);
  byteLength(value.packageByteLength);
  byteLength(value.entryByteLength);
  if (value.name !== 'typescript' || value.packageLocator !== `${TYPESCRIPT_ROOT}/package.json`
    || value.entryLocator !== `${TYPESCRIPT_ROOT}/lib/typescript.js`) refuse();
}

function findPhase(load, id) {
  const matches = load.phaseLoadSets.filter((phase) => phase.phaseId === id);
  if (matches.length !== 1) refuse();
  return matches[0];
}

function pairFromFullLocator(rootLocator, fullLocator, rawSha256, length) {
  const prefix = `${rootLocator}/`;
  if (!fullLocator.startsWith(prefix)) refuse();
  return rootedIdentity(rootLocator, { locator: fullLocator.slice(prefix.length), rawSha256, byteLength: length });
}

function sourceAndLoadRows(source, load) {
  const observed = [];
  const universe = [];
  for (const closure of source.declaredClosures) {
    for (const row of closure.rows) {
      const current = rootedIdentity(closure.declaration.rootLocator, row);
      observed.push(current);
      universe.push(current);
    }
  }

  const sourceEntry = rootedIdentity(source.sourceOriginParserEntry.rootLocator, source.sourceOriginParserEntry);
  const project = rootedIdentity(source.sourceOriginParserProject.rootLocator, source.sourceOriginParserProject);
  observed.push(sourceEntry, project);
  universe.push(sourceEntry, project);

  observed.push(
    pairFromFullLocator(
      TYPESCRIPT_ROOT,
      source.typescript.packageLocator,
      source.typescript.packageRawSha256,
      source.typescript.packageByteLength,
    ),
    pairFromFullLocator(
      TYPESCRIPT_ROOT,
      source.typescript.entryLocator,
      source.typescript.entryRawSha256,
      source.typescript.entryByteLength,
    ),
    rootedIdentity(source.typescriptCompilerCli.rootLocator, source.typescriptCompilerCli),
  );

  const generatedEntry = rootedIdentity(load.generatedEntry.rootLocator, load.generatedEntry);
  const generatedManifest = rootedIdentity(load.generatedPackageManifest.rootLocator, load.generatedPackageManifest);
  observed.push(generatedEntry, generatedManifest);
  for (const row of load.generatedClosure.rows) {
    const current = rootedIdentity(load.generatedClosure.declaration.rootLocator, row);
    observed.push(current);
    universe.push(current);
  }

  for (const phase of load.phaseLoadSets) {
    for (const row of phase.moduleRows) observed.push(rootedIdentity(phase.entry.rootLocator, row));
  }

  const runtimePhases = [findPhase(load, 'HOST'), findPhase(load, 'PARSER')];
  const executable = [];
  for (const phase of runtimePhases) {
    for (const row of phase.moduleRows) executable.push(rootedIdentity(phase.entry.rootLocator, row));
  }
  const executableByPair = uniquePairs(executable);
  const universeByPair = uniquePairs(universe);
  for (const key of executableByPair.keys()) if (!universeByPair.has(key)) refuse();
  const data = [...universeByPair].filter(([key]) => !executableByPair.has(key)).map(([, value]) => value);
  if (executableByPair.size === 0 || data.length === 0) refuse();

  const executablePairs = [...executableByPair.values()];
  globalCollisionCheck([...observed, ...executablePairs, ...data]);
  return {
    executablePairs,
    dataPairs: data,
    executableModuleRows: executablePairs.map(joinedIdentity).sort((left, right) => compare(left.locator, right.locator)),
    dataRows: data.map(joinedIdentity).sort((left, right) => compare(left.locator, right.locator)),
  };
}

function moduleClosureDigest(executableModuleRows, dataRows, builtinModules) {
  const body = {
    schema: MODULE_CLOSURE_SCHEMA,
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
  return sha256Canonical(MODULE_CLOSURE_SCHEMA, body);
}

function deriveRecord(source, load) {
  const platformToRecord = { linux: 'linux-x64', win32: 'win32-x64' };
  const recordId = platformToRecord[source.platform];
  if (!recordId || source.arch !== 'x64' || load.sourceBinding.platform !== source.platform
    || load.sourceBinding.arch !== source.arch) refuse();
  const host = findPhase(load, 'HOST');
  const parser = findPhase(load, 'PARSER');
  const runtimeLoadSets = [host, parser].map((phase) => ({
    id: phase.phaseId,
    entry: phase.entry,
    moduleRows: phase.moduleRows,
    builtinModules: phase.builtinModules,
  }));
  const builtinModules = [...new Set([...host.builtinModules, ...parser.builtinModules])].sort(compare);
  const partition = sourceAndLoadRows(source, load);
  const closureDigest = moduleClosureDigest(
    partition.executableModuleRows,
    partition.dataRows,
    builtinModules,
  );
  const body = {
    recordId,
    platform: source.platform,
    arch: source.arch,
    sourceObservationDigest: source.observationDigest,
    loadObservationDigest: load.observationDigest,
    nodeIdentity: source.nodeIdentityBefore,
    gitIdentity: source.gitIdentityBefore,
    typescript: source.typescript,
    sourceOriginParser: {
      sourceEntry: source.sourceOriginParserEntry,
      project: source.sourceOriginParserProject,
      generatedEntry: load.generatedEntry,
      generatedPackageManifest: load.generatedPackageManifest,
      exportNames: source.sourceOriginParserEntry.exportNames,
      sourceEdgeRows: source.sourceEdgeRows,
      emittedEdgeRows: load.emittedEdgeRows,
      generatedClosureDigest: load.generatedClosure.closureDigest,
    },
    runtimeLoadSets,
    domainSelections: DOMAIN_SELECTIONS,
    builtinModules,
    executableModuleRows: partition.executableModuleRows,
    dataRows: partition.dataRows,
    moduleClosureDigest: closureDigest,
  };
  return { ...body, recordDigest: sha256Canonical(RECORD_SCHEMA, body) };
}

function validateSourceEntry(value) {
  exactObject(value, ['rootLocator', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength', 'exportNames']);
  if (value.rootLocator !== COMPILER_ROOT || value.locator !== SOURCE_ENTRY || !HEX40.test(value.gitBlobOid)) refuse();
  identityRow(strippedIdentity(value));
  exactEqual(value.exportNames, EXPORT_NAMES);
}

function validateProject(value) {
  exactObject(value, [
    'rootLocator', 'locator', 'gitBlobOid', 'rawSha256', 'byteLength',
    'extendsLocator', 'files', 'include', 'compilerOptions',
  ]);
  if (value.rootLocator !== COMPILER_ROOT || value.locator !== PROJECT || !HEX40.test(value.gitBlobOid)
    || value.extendsLocator !== './tsconfig.json') refuse();
  identityRow(strippedIdentity(value));
  exactEqual(value.files, [SOURCE_ENTRY]);
  exactEqual(value.include, []);
  exactObject(value.compilerOptions, ['types', 'noEmitOnError', 'incremental', 'composite', 'sourceMap', 'declarationMap']);
  exactEqual(value.compilerOptions, {
    types: [], noEmitOnError: true, incremental: false, composite: false,
    sourceMap: false, declarationMap: false,
  });
}

function validateGeneratedIdentity(value, expectedLocator) {
  exactObject(value, ['rootLocator', 'locator', 'rawSha256', 'byteLength']);
  if (value.rootLocator !== GENERATED_ROOT || value.locator !== expectedLocator) refuse();
  identityRow(strippedIdentity(value));
}

function validateSourceOriginParser(value) {
  exactObject(value, [
    'sourceEntry', 'project', 'generatedEntry', 'generatedPackageManifest',
    'exportNames', 'sourceEdgeRows', 'emittedEdgeRows', 'generatedClosureDigest',
  ]);
  validateSourceEntry(value.sourceEntry);
  validateProject(value.project);
  validateGeneratedIdentity(value.generatedEntry, GENERATED_ENTRY);
  validateGeneratedIdentity(value.generatedPackageManifest, GENERATED_MANIFEST);
  if (value.generatedPackageManifest.rawSha256 !== sha256Raw(Buffer.from('{"type":"module"}', 'utf8'))
    || value.generatedPackageManifest.byteLength !== 17) refuse();
  exactEqual(value.exportNames, EXPORT_NAMES);
  exactEqual(value.sourceEntry.exportNames, EXPORT_NAMES);
  exactEqual(value.sourceEdgeRows, SOURCE_EDGE_ROWS);
  exactEqual(value.emittedEdgeRows, EMITTED_EDGE_ROWS);
  digest(value.generatedClosureDigest);
}

function validateRuntimeLoadSets(value, typescript, sourceOriginParser) {
  exactArray(value, 2);
  if (value[0].id !== 'HOST' || value[1].id !== 'PARSER') refuse();
  for (const runtime of value) {
    exactObject(runtime, ['id', 'entry', 'moduleRows', 'builtinModules']);
    exactObject(runtime.entry, ['rootLocator', 'locator']);
    locator(runtime.entry.rootLocator);
    locator(runtime.entry.locator);
    sortedUniqueRows(runtime.moduleRows);
    sortedUniqueStrings(runtime.builtinModules);
    for (const builtin of runtime.builtinModules) canonicalBuiltin(builtin);
  }
  const [host, parser] = value;
  if (host.entry.rootLocator !== TYPESCRIPT_ROOT || host.entry.locator !== 'lib/typescript.js'
    || parser.entry.rootLocator !== GENERATED_ROOT || parser.entry.locator !== GENERATED_ENTRY
    || parser.builtinModules.length !== 0
    || canonicalJsonText(parser.moduleRows.map((row) => row.locator)) !== canonicalJsonText(PARSER_MODULES)) refuse();
  const hostEntry = host.moduleRows.filter((row) => row.locator === host.entry.locator);
  const parserEntry = parser.moduleRows.filter((row) => row.locator === parser.entry.locator);
  if (hostEntry.length !== 1 || parserEntry.length !== 1
    || hostEntry[0].rawSha256 !== typescript.entryRawSha256
    || hostEntry[0].byteLength !== typescript.entryByteLength
    || parserEntry[0].rawSha256 !== sourceOriginParser.generatedEntry.rawSha256
    || parserEntry[0].byteLength !== sourceOriginParser.generatedEntry.byteLength) refuse();
}

function rowMap(rows) {
  return new Map(rows.map((row) => [row.locator, row]));
}

function requireRow(rows, locatorValue, expected) {
  const matched = rows.get(locatorValue);
  if (!matched) refuse();
  if (expected && !sameRawIdentity(matched, expected)) refuse();
}

function derivedPair(value) {
  let rootLocator;
  if (value.locator.startsWith(`${TYPESCRIPT_ROOT}/`)) rootLocator = TYPESCRIPT_ROOT;
  else if (value.locator.startsWith(`${COMPILER_ROOT}/`)) rootLocator = COMPILER_ROOT;
  else if (value.locator.startsWith(`${GENERATED_ROOT}/`)) rootLocator = GENERATED_ROOT;
  else refuse();
  return rootedIdentity(rootLocator, {
    locator: value.locator.slice(rootLocator.length + 1),
    rawSha256: value.rawSha256,
    byteLength: value.byteLength,
  });
}

function validatePartition(record) {
  sortedUniqueRows(record.executableModuleRows);
  sortedUniqueRows(record.dataRows);
  if (record.executableModuleRows.length === 0 || record.dataRows.length === 0) refuse();
  const executableRows = rowMap(record.executableModuleRows);
  const dataRows = rowMap(record.dataRows);
  for (const locatorValue of executableRows.keys()) {
    if (dataRows.has(locatorValue) || dataRows.has(locatorValue.toLowerCase())) refuse();
  }
  const folded = new Set();
  for (const row of [...record.executableModuleRows, ...record.dataRows]) {
    const key = row.locator.toLowerCase();
    if (folded.has(key)) refuse();
    folded.add(key);
  }

  const runtimePairs = [];
  for (const runtime of record.runtimeLoadSets) {
    for (const row of runtime.moduleRows) runtimePairs.push(rootedIdentity(runtime.entry.rootLocator, row));
  }
  const expectedExecutable = [...uniquePairs(runtimePairs).values()]
    .map(joinedIdentity)
    .sort((left, right) => compare(left.locator, right.locator));
  exactEqual(record.executableModuleRows, expectedExecutable);

  requireRow(dataRows, `${COMPILER_ROOT}/${PROJECT}`, record.sourceOriginParser.project);
  requireRow(dataRows, `${COMPILER_ROOT}/${SOURCE_ENTRY}`, record.sourceOriginParser.sourceEntry);
  for (const locatorValue of SOURCE_LOCATORS) requireRow(dataRows, `${COMPILER_ROOT}/${locatorValue}`);
  requireRow(dataRows, record.typescript.packageLocator, {
    rawSha256: record.typescript.packageRawSha256,
    byteLength: record.typescript.packageByteLength,
  });
  requireRow(dataRows, `${TYPESCRIPT_ROOT}/lib/tsc.js`);
  requireRow(executableRows, record.typescript.entryLocator, {
    rawSha256: record.typescript.entryRawSha256,
    byteLength: record.typescript.entryByteLength,
  });
  requireRow(executableRows, `${GENERATED_ROOT}/${GENERATED_ENTRY}`, record.sourceOriginParser.generatedEntry);
  requireRow(dataRows, `${GENERATED_ROOT}/${GENERATED_MANIFEST}`, record.sourceOriginParser.generatedPackageManifest);
  for (const locatorValue of GENERATED_LOCATORS) {
    const target = PARSER_MODULES.includes(locatorValue) ? executableRows : dataRows;
    requireRow(target, `${GENERATED_ROOT}/${locatorValue}`);
  }

  const exactSourceData = new Set([...SOURCE_LOCATORS, PROJECT].map((value) => `${COMPILER_ROOT}/${value}`));
  const exactGeneratedData = new Set(
    GENERATED_LOCATORS.filter((value) => !PARSER_MODULES.includes(value)).map((value) => `${GENERATED_ROOT}/${value}`),
  );
  for (const row of record.dataRows) {
    if (!exactSourceData.has(row.locator) && !exactGeneratedData.has(row.locator)
      && !row.locator.startsWith(`${TYPESCRIPT_ROOT}/`)) refuse();
  }

  const globalRows = [
    rootedIdentity(record.sourceOriginParser.sourceEntry.rootLocator, record.sourceOriginParser.sourceEntry),
    rootedIdentity(record.sourceOriginParser.project.rootLocator, record.sourceOriginParser.project),
    rootedIdentity(record.sourceOriginParser.generatedEntry.rootLocator, record.sourceOriginParser.generatedEntry),
    rootedIdentity(record.sourceOriginParser.generatedPackageManifest.rootLocator, record.sourceOriginParser.generatedPackageManifest),
    ...runtimePairs,
    ...record.executableModuleRows.map(derivedPair),
    ...record.dataRows.map(derivedPair),
  ];
  globalCollisionCheck(globalRows);
}

function validateRecord(record) {
  exactObject(record, [
    'recordId', 'platform', 'arch', 'sourceObservationDigest', 'loadObservationDigest',
    'nodeIdentity', 'gitIdentity', 'typescript', 'sourceOriginParser', 'runtimeLoadSets',
    'domainSelections', 'builtinModules', 'executableModuleRows', 'dataRows',
    'moduleClosureDigest', 'recordDigest',
  ]);
  const expected = record.platform === 'linux' ? 'linux-x64'
    : record.platform === 'win32' ? 'win32-x64' : undefined;
  if (!expected || record.recordId !== expected || record.arch !== 'x64') refuse();
  digest(record.sourceObservationDigest);
  digest(record.loadObservationDigest);
  executableIdentity(record.nodeIdentity);
  executableIdentity(record.gitIdentity);
  packageIdentity(record.typescript);
  validateSourceOriginParser(record.sourceOriginParser);
  validateRuntimeLoadSets(record.runtimeLoadSets, record.typescript, record.sourceOriginParser);
  exactEqual(record.domainSelections, DOMAIN_SELECTIONS);
  sortedUniqueStrings(record.builtinModules);
  for (const builtin of record.builtinModules) canonicalBuiltin(builtin);
  const expectedBuiltins = [...new Set(record.runtimeLoadSets.flatMap((runtime) => runtime.builtinModules))].sort(compare);
  exactEqual(record.builtinModules, expectedBuiltins);
  validatePartition(record);
  digest(record.moduleClosureDigest);
  digest(record.recordDigest);
  const expectedClosureDigest = moduleClosureDigest(
    record.executableModuleRows,
    record.dataRows,
    record.builtinModules,
  );
  if (record.moduleClosureDigest !== expectedClosureDigest) refuse();
  const { recordDigest, ...body } = record;
  if (recordDigest !== sha256Canonical(RECORD_SCHEMA, body)) refuse();
  const domains = [
    record.sourceObservationDigest,
    record.loadObservationDigest,
    record.sourceOriginParser.generatedClosureDigest,
    record.moduleClosureDigest,
    record.recordDigest,
  ];
  if (new Set(domains).size !== domains.length) refuse();
}

function validatePinsInternal(value) {
  exactObject(value, ['schema', 'records', 'authorizing', 'pinsDigest']);
  if (value.schema !== PINS_SCHEMA || value.authorizing !== false) refuse();
  exactArray(value.records, 2);
  if (value.records[0].recordId !== 'linux-x64' || value.records[1].recordId !== 'win32-x64') refuse();
  for (const record of value.records) validateRecord(record);
  if (value.records[0].sourceObservationDigest === value.records[1].sourceObservationDigest
    || value.records[0].loadObservationDigest === value.records[1].loadObservationDigest
    || value.records[0].recordDigest === value.records[1].recordDigest) refuse();
  digest(value.pinsDigest);
  const { pinsDigest, ...body } = value;
  if (pinsDigest !== sha256Canonical(PINS_SCHEMA, body)
    || value.records.some((record) => record.recordDigest === pinsDigest)) refuse();
  return value;
}

export function validateToolchainPinsV2(value) {
  try {
    return freezeCanonical(validatePinsInternal(snapshot(value)));
  } catch (error) {
    if (error instanceof ToolchainPinDerivationRefusal) throw error;
    refuse();
  }
}

export function canonicalToolchainPinsText(value) {
  try {
    return canonicalJsonText(validateToolchainPinsV2(value));
  } catch (error) {
    if (error instanceof ToolchainPinDerivationRefusal) throw error;
    refuse();
  }
}

export function deriveToolchainPinsV2(pairs) {
  try {
    const captured = snapshot(pairs);
    exactArray(captured, 2);
    const records = [];
    const repositories = [];
    for (const pair of captured) {
      exactObject(pair, ['sourceObservation', 'loadObservation']);
      let source;
      let load;
      try {
        source = validateToolchainPinObservation(pair.sourceObservation);
        load = validateToolchainLoadObservation(pair.loadObservation, source);
      } catch {
        refuse();
      }
      if (source.schema !== SOURCE_SCHEMA || load.schema !== LOAD_SCHEMA
        || source.observationDigest !== load.sourceObservationDigest) refuse();
      records.push(deriveRecord(source, load));
      repositories.push(source.repository.pre);
    }
    exactEqual(repositories[0], repositories[1]);
    records.sort((left, right) => compare(left.recordId, right.recordId));
    if (records[0].recordId !== 'linux-x64' || records[1].recordId !== 'win32-x64') refuse();
    const body = { schema: PINS_SCHEMA, records, authorizing: false };
    return validateToolchainPinsV2({
      ...body,
      pinsDigest: sha256Canonical(PINS_SCHEMA, body),
    });
  } catch (error) {
    if (error instanceof ToolchainPinDerivationRefusal) throw error;
    refuse();
  }
}
