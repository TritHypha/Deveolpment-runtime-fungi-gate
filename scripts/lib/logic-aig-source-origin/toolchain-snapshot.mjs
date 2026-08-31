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

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const name of Object.getOwnPropertyNames(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (descriptor && 'value' in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

export function buildToolchainSnapshot(options) {
  const input = copyClosedData(options);
  canonicalJsonText(input);
  exactObject(input, [
    'pins', 'platform', 'arch', 'nodeIdentity', 'gitIdentity',
    'actualLoadedModuleRows', 'actualLoadedBuiltinModules',
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

  validateLoadedRows(input.actualLoadedModuleRows, record.executableModuleRows);
  validateLoadedBuiltins(input.actualLoadedBuiltinModules, record.builtinModules);

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
    schema: 'galerina.logic-aig-actual-loaded-set.v1',
    actualLoadedModuleRows: input.actualLoadedModuleRows,
    count: input.actualLoadedModuleRows.length,
    authorizing: false,
  };
  const body = {
    schema: 'galerina.logic-aig-toolchain-manifest.v1',
    selectedPinRecordId: record.recordId,
    selectedPinRecordDigest: record.recordDigest,
    pinsDigest: pins.pinsDigest,
    platform: input.platform,
    arch: input.arch,
    nodeIdentity: record.nodeIdentity,
    gitIdentity: record.gitIdentity,
    typescript: record.typescript,
    galerinaParser: record.galerinaParser,
    builtinModules: record.builtinModules,
    executableModuleRows: record.executableModuleRows,
    dataRows: record.dataRows,
    moduleClosureDigest,
    actualLoadedModuleRows: input.actualLoadedModuleRows,
    actualLoadedSetDigest: sha256Canonical(loadedBody.schema, loadedBody),
    authorizing: false,
  };
  return deepFreeze({
    ...body,
    toolchainManifestDigest: sha256Canonical(body.schema, body),
  });
}
