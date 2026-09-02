import { isProxy } from 'node:util/types';

import {
  canonicalJsonText,
  sha256Canonical,
  validateToolchainPins,
} from './contract.mjs';

const HEX64 = /^[0-9a-f]{64}$/;
const BUILTIN = /^node:[a-z0-9][a-z0-9_./-]*$/;

class ToolchainSnapshotRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'ToolchainSnapshotRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new ToolchainSnapshotRefusal(code);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function copyClosedData(value, seen = new Set(), depth = 0) {
  if (depth > 128) refuse('SOURCE_ORIGIN_SCHEMA');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value !== value.normalize('NFC')) refuse('SOURCE_ORIGIN_SCHEMA');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) refuse('SOURCE_ORIGIN_SCHEMA');
    return value;
  }
  if (typeof value !== 'object' || isProxy(value) || seen.has(value)) refuse('SOURCE_ORIGIN_SCHEMA');
  seen.add(value);

  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse('SOURCE_ORIGIN_SCHEMA');
    const length = value.length;
    if (!Number.isSafeInteger(length) || length < 0) refuse('SOURCE_ORIGIN_SCHEMA');
    const names = Object.getOwnPropertyNames(value);
    if (names.length !== length + 1 || !names.includes('length')) refuse('SOURCE_ORIGIN_SCHEMA');
    const output = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('SOURCE_ORIGIN_SCHEMA');
      output.push(copyClosedData(descriptor.value, seen, depth + 1));
    }
    return output;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(value).length !== 0) refuse('SOURCE_ORIGIN_SCHEMA');
  const output = {};
  for (const name of Object.getOwnPropertyNames(value).sort(compareCodeUnits)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('SOURCE_ORIGIN_SCHEMA');
    if (name !== name.normalize('NFC')) refuse('SOURCE_ORIGIN_SCHEMA');
    output[name] = copyClosedData(descriptor.value, seen, depth + 1);
  }
  return output;
}

function exactObject(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) refuse('SOURCE_ORIGIN_SCHEMA');
  const names = Object.keys(value).sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) refuse('SOURCE_ORIGIN_SCHEMA');
}

function array(value) {
  if (!Array.isArray(value)) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function nonEmptyText(value) {
  if (typeof value !== 'string' || value.length === 0) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function digest(value) {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function nonNegativeInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function canonicalLocator(value) {
  nonEmptyText(value);
  if (
    value.includes('\\')
    || value.includes('\0')
    || value.startsWith('/')
    || value.endsWith('/')
    || value.includes(':')
    || value.split('/').some((component) => component === '' || component === '.' || component === '..')
  ) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function validateExecutableIdentity(value) {
  exactObject(value, ['version', 'executableRawSha256', 'executableByteLength']);
  nonEmptyText(value.version);
  digest(value.executableRawSha256);
  nonNegativeInteger(value.executableByteLength);
}

function validateClosureRow(value) {
  exactObject(value, ['locator', 'rawSha256', 'byteLength']);
  canonicalLocator(value.locator);
  digest(value.rawSha256);
  nonNegativeInteger(value.byteLength);
}

function assertSortedUnique(values, selector = (value) => value) {
  for (let index = 1; index < values.length; index += 1) {
    if (compareCodeUnits(selector(values[index - 1]), selector(values[index])) >= 0) refuse('SOURCE_ORIGIN_ORDER');
  }
}

function sameData(left, right) {
  return canonicalJsonText(left) === canonicalJsonText(right);
}

function validateLoadedRows(rows, admittedRows) {
  array(rows);
  for (const row of rows) validateClosureRow(row);
  assertSortedUnique(rows, (row) => row.locator);
  const admittedByLocator = new Map(admittedRows.map((row) => [row.locator, row]));
  for (const row of rows) {
    const admitted = admittedByLocator.get(row.locator);
    if (!admitted || !sameData(row, admitted)) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  }
}

function validateLoadedBuiltins(values, admittedValues) {
  array(values);
  for (const value of values) {
    if (typeof value !== 'string' || !BUILTIN.test(value)) refuse('SOURCE_ORIGIN_SCHEMA');
  }
  assertSortedUnique(values);
  for (const value of values) if (!admittedValues.includes(value)) refuse('SOURCE_ORIGIN_TOOLCHAIN');
}

function validateActualRuntimeLoadSets(values, record) {
  array(values);
  if (values.length !== 2 || values[0]?.id !== 'HOST' || values[1]?.id !== 'PARSER') refuse('SOURCE_ORIGIN_TOOLCHAIN');
  for (let index = 0; index < values.length; index += 1) {
    const actual = values[index];
    const admitted = record.runtimeLoadSets[index];
    exactObject(actual, ['id', 'moduleRows', 'builtinModules']);
    if (actual.id !== admitted.id) refuse('SOURCE_ORIGIN_TOOLCHAIN');
    validateLoadedRows(actual.moduleRows, admitted.moduleRows);
    validateLoadedBuiltins(actual.builtinModules, admitted.builtinModules);
    if (!actual.moduleRows.some((row) => row.locator === admitted.entry.locator)) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  }
}

function joinActualModuleRows(actualRuntimeLoadSets, admittedRuntimeLoadSets) {
  const exactLocators = new Set();
  const foldedLocators = new Set();
  const output = [];
  for (let index = 0; index < actualRuntimeLoadSets.length; index += 1) {
    const actual = actualRuntimeLoadSets[index];
    const rootLocator = admittedRuntimeLoadSets[index].entry.rootLocator;
    for (const row of actual.moduleRows) {
      const locator = `${rootLocator}/${row.locator}`;
      const folded = locator.toLowerCase();
      if (exactLocators.has(locator) || foldedLocators.has(folded)) refuse('SOURCE_ORIGIN_TOOLCHAIN');
      exactLocators.add(locator);
      foldedLocators.add(folded);
      output.push({ locator, rawSha256: row.rawSha256, byteLength: row.byteLength });
    }
  }
  output.sort((left, right) => compareCodeUnits(left.locator, right.locator));
  return output;
}

function builtinUnion(actualRuntimeLoadSets) {
  return [...new Set(actualRuntimeLoadSets.flatMap((row) => row.builtinModules))].sort(compareCodeUnits);
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const name of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (descriptor && 'value' in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

export function prepareToolchainSelection(options) {
  const input = copyClosedData(options);
  canonicalJsonText(input);
  exactObject(input, [
    'pins', 'platform', 'arch', 'nodeIdentity', 'gitIdentity',
    'selector', 'guardRuntimeLoadSet', 'parserExportNames',
  ]);
  nonEmptyText(input.platform);
  nonEmptyText(input.arch);
  validateExecutableIdentity(input.nodeIdentity);
  validateExecutableIdentity(input.gitIdentity);

  const pins = validateToolchainPins(input.pins);
  if (pins.records.length === 0) refuse('SOURCE_ORIGIN_HOLD_TOOLCHAIN');
  const matchingRecords = pins.records.filter(
    (record) => record.platform === input.platform && record.arch === input.arch,
  );
  if (matchingRecords.length !== 1) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  const record = matchingRecords[0];
  if (!sameData(input.nodeIdentity, record.nodeIdentity) || !sameData(input.gitIdentity, record.gitIdentity)) refuse('SOURCE_ORIGIN_TOOLCHAIN');

  exactObject(input.selector, [
    'domain', 'parserId', 'runtimeLoadSetId', 'operation', 'recordId',
    'recordDigest', 'resolutionMode', 'entry',
  ]);
  for (const field of ['domain', 'parserId', 'runtimeLoadSetId', 'operation', 'recordId', 'resolutionMode']) nonEmptyText(input.selector[field]);
  digest(input.selector.recordDigest);
  exactObject(input.selector.entry, ['rootLocator', 'locator']);
  canonicalLocator(input.selector.entry.rootLocator);
  canonicalLocator(input.selector.entry.locator);
  if (
    input.selector.recordId !== record.recordId
    || input.selector.recordDigest !== record.recordDigest
    || input.selector.resolutionMode !== 'EXACT_ROOT_LOCAL_V1'
  ) refuse('SOURCE_ORIGIN_TOOLCHAIN');

  const domainSelection = record.domainSelections.find((row) => row.domain === input.selector.domain);
  if (!domainSelection || !sameData(domainSelection, {
    domain: input.selector.domain,
    parserId: input.selector.parserId,
    runtimeLoadSetId: input.selector.runtimeLoadSetId,
    operation: input.selector.operation,
  })) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  const runtimeLoadSet = record.runtimeLoadSets.find((row) => row.id === domainSelection.runtimeLoadSetId);
  if (!runtimeLoadSet || !sameData(input.selector.entry, runtimeLoadSet.entry)) refuse('SOURCE_ORIGIN_TOOLCHAIN');

  exactObject(input.guardRuntimeLoadSet, ['id', 'entry', 'moduleRows', 'builtinModules']);
  nonEmptyText(input.guardRuntimeLoadSet.id);
  exactObject(input.guardRuntimeLoadSet.entry, ['rootLocator', 'locator']);
  canonicalLocator(input.guardRuntimeLoadSet.entry.rootLocator);
  canonicalLocator(input.guardRuntimeLoadSet.entry.locator);
  validateLoadedRows(input.guardRuntimeLoadSet.moduleRows, runtimeLoadSet.moduleRows);
  validateLoadedBuiltins(input.guardRuntimeLoadSet.builtinModules, runtimeLoadSet.builtinModules);
  if (!sameData(input.guardRuntimeLoadSet, runtimeLoadSet)) refuse('SOURCE_ORIGIN_TOOLCHAIN');

  if (input.selector.domain === 'HOST') {
    if (input.parserExportNames !== null) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  } else {
    array(input.parserExportNames);
    assertSortedUnique(input.parserExportNames);
    if (!sameData(input.parserExportNames, ['lex', 'parseGateV3', 'parseProgram'])) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  }

  return deepFreeze({
    domain: domainSelection.domain,
    parserId: domainSelection.parserId,
    runtimeLoadSetId: domainSelection.runtimeLoadSetId,
    operation: domainSelection.operation,
    recordId: record.recordId,
    recordDigest: record.recordDigest,
    entry: runtimeLoadSet.entry,
    moduleRows: runtimeLoadSet.moduleRows,
    builtinModules: runtimeLoadSet.builtinModules,
    parserExportNames: input.parserExportNames,
    authorizing: false,
  });
}

export function buildToolchainSnapshot(options) {
  const input = copyClosedData(options);
  canonicalJsonText(input);
  exactObject(input, [
    'pins', 'platform', 'arch', 'nodeIdentity', 'gitIdentity',
    'actualRuntimeLoadSets', 'actualParserExportNames',
  ]);
  nonEmptyText(input.platform);
  nonEmptyText(input.arch);
  validateExecutableIdentity(input.nodeIdentity);
  validateExecutableIdentity(input.gitIdentity);

  const pins = validateToolchainPins(input.pins);
  if (pins.records.length === 0) refuse('SOURCE_ORIGIN_HOLD_TOOLCHAIN');
  const matchingRecords = pins.records.filter(
    (record) => record.platform === input.platform && record.arch === input.arch,
  );
  if (matchingRecords.length !== 1) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  const record = matchingRecords[0];
  if (!sameData(input.nodeIdentity, record.nodeIdentity) || !sameData(input.gitIdentity, record.gitIdentity)) refuse('SOURCE_ORIGIN_TOOLCHAIN');

  validateActualRuntimeLoadSets(input.actualRuntimeLoadSets, record);
  array(input.actualParserExportNames);
  assertSortedUnique(input.actualParserExportNames);
  if (
    !sameData(input.actualParserExportNames, ['lex', 'parseGateV3', 'parseProgram'])
    || !sameData(input.actualParserExportNames, record.sourceOriginParser.exportNames)
  ) refuse('SOURCE_ORIGIN_TOOLCHAIN');

  const actualLoadedModuleRows = joinActualModuleRows(input.actualRuntimeLoadSets, record.runtimeLoadSets);
  validateLoadedRows(actualLoadedModuleRows, record.executableModuleRows);
  const actualLoadedBuiltinModules = builtinUnion(input.actualRuntimeLoadSets);
  validateLoadedBuiltins(actualLoadedBuiltinModules, record.builtinModules);

  const closureBody = {
    schema: 'galerina.logic-aig-module-closure.v1',
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
  const moduleClosureDigest = sha256Canonical(closureBody.schema, closureBody);
  if (moduleClosureDigest !== record.moduleClosureDigest) refuse('SOURCE_ORIGIN_DIGEST');

  const loadedBody = {
    schema: 'galerina.logic-aig-actual-loaded-set.v2',
    actualRuntimeLoadSets: input.actualRuntimeLoadSets,
    actualLoadedModuleRows,
    actualLoadedBuiltinModules,
    actualParserExportNames: input.actualParserExportNames,
    counts: {
      runtimeLoadSets: input.actualRuntimeLoadSets.length,
      modules: actualLoadedModuleRows.length,
      builtinModules: actualLoadedBuiltinModules.length,
      parserExports: input.actualParserExportNames.length,
    },
    authorizing: false,
  };
  const body = {
    schema: 'galerina.logic-aig-toolchain-manifest.v2',
    selectedPinRecordId: record.recordId,
    selectedPinRecordDigest: record.recordDigest,
    pinsDigest: pins.pinsDigest,
    sourceObservationDigest: record.sourceObservationDigest,
    loadObservationDigest: record.loadObservationDigest,
    platform: input.platform,
    arch: input.arch,
    nodeIdentity: record.nodeIdentity,
    gitIdentity: record.gitIdentity,
    typescript: record.typescript,
    sourceOriginParser: record.sourceOriginParser,
    runtimeLoadSets: record.runtimeLoadSets,
    domainSelections: record.domainSelections,
    builtinModules: record.builtinModules,
    executableModuleRows: record.executableModuleRows,
    dataRows: record.dataRows,
    moduleClosureDigest,
    actualRuntimeLoadSets: input.actualRuntimeLoadSets,
    actualLoadedModuleRows,
    actualLoadedBuiltinModules,
    actualParserExportNames: input.actualParserExportNames,
    actualLoadedSetDigest: sha256Canonical(loadedBody.schema, loadedBody),
    authorizing: false,
  };
  return deepFreeze({
    ...body,
    toolchainManifestDigest: sha256Canonical(body.schema, body),
  });
}
