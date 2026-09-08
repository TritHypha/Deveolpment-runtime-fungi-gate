import { types as UTIL_TYPES } from 'node:util';

import {
  sha256Canonical,
  validateLocalInventoryPolicy,
  validateLocalSourceSnapshot,
  validateRepositoryIdentity,
} from './contract.mjs';

export const LOCAL_HOST_OBSERVATION_SCHEMA = 'galerina.logic-aig-local-host-observation.v1';
export const LOCAL_MYCO_RECEIPT_SCHEMA = 'galerina.logic-aig-local-myco-receipt.v1';
export const LOCAL_HYPHA_RECEIPT_SCHEMA = 'galerina.logic-aig-local-hypha-receipt.v1';
export const LOCAL_SOURCE_ORIGIN_SUBJECT_SCHEMA = 'galerina.logic-aig-local-source-origin-subject.v1';

const SUBJECT_KEYS = Object.freeze([
  'schema', 'repositoryIdentityDigest', 'inventoryPolicyDigest', 'snapshotDigest',
  'hostObservationDigest', 'mycoReceiptDigest', 'hyphaReceiptDigest',
  'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly', 'subjectDigest',
]);
const HOST_KEYS = Object.freeze([
  'schema', 'platform', 'arch', 'runtime', 'snapshotDigest', 'inventoryPolicyDigest',
  'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly', 'observationDigest',
]);
const DISCOVERY_KEYS = Object.freeze([
  'schema', 'status', 'snapshotDigest', 'inventoryPolicyDigest', 'authorizing',
  'authentication', 'executionBoundary', 'fixtureOnly', 'receiptDigest',
]);
const SUBJECT_OPTION_KEYS = Object.freeze([
  'allowFixtureOnly', 'repository', 'policy', 'snapshot', 'host', 'myco', 'hypha',
]);
const HOST_BUILDER_KEYS = Object.freeze([
  'allowFixtureOnly', 'platform', 'arch', 'runtime', 'snapshotDigest', 'inventoryPolicyDigest', 'fixtureOnly',
]);
const DISCOVERY_BUILDER_KEYS = Object.freeze([
  'allowFixtureOnly', 'kind', 'snapshotDigest', 'inventoryPolicyDigest', 'fixtureOnly',
]);
const HEX64 = /^[0-9a-f]{64}$/u;

const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_IS_ARRAY = Array.isArray;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_HAS_OWN = Object.hasOwn;
const REFLECT_APPLY = Reflect.apply;
const STRING_NORMALIZE = String.prototype.normalize;

export class LocalSourceOriginSubjectRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'LocalSourceOriginSubjectRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new LocalSourceOriginSubjectRefusal(code);
}

function exactObject(value, keys, code) {
  if (value === null || typeof value !== 'object' || ARRAY_IS_ARRAY(value)
    || UTIL_TYPES.isProxy(value) || OBJECT_GET_PROTOTYPE_OF(value) !== OBJECT_PROTOTYPE
    || OBJECT_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) refuse(code);
  const actual = OBJECT_GET_OWN_PROPERTY_NAMES(value).slice().sort();
  const expected = keys.slice().sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) refuse(code);
  for (const key of keys) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, 'value') || descriptor.enumerable !== true) refuse(code);
  }
  return value;
}

function exactOptionsFor(value, expected, code = 'SOURCE_ORIGIN_LOCAL_SCHEMA') {
  if (value === null || typeof value !== 'object' || ARRAY_IS_ARRAY(value)
    || UTIL_TYPES.isProxy(value) || OBJECT_GET_PROTOTYPE_OF(value) !== OBJECT_PROTOTYPE
    || OBJECT_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) refuse(code);
  const names = OBJECT_GET_OWN_PROPERTY_NAMES(value);
  const actual = names.slice().sort();
  const sortedExpected = expected.slice().sort();
  if (actual.length !== sortedExpected.length || actual.some((key, index) => key !== sortedExpected[index])) refuse(code);
  for (const key of names) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, 'value') || descriptor.enumerable !== true) refuse(code);
  }
  return value;
}

function expectedOptions(value, keys) {
  if (value === null || typeof value !== 'object' || ARRAY_IS_ARRAY(value) || UTIL_TYPES.isProxy(value)) {
    refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
  }
  return OBJECT_HAS_OWN(value, 'allowFixtureOnly') ? keys : keys.slice(1);
}

function exactOptions(value) {
  return exactOptionsFor(value, expectedOptions(value, SUBJECT_OPTION_KEYS));
}

function plainDataObject(value, code) {
  if (value === null || typeof value !== 'object' || ARRAY_IS_ARRAY(value)
    || UTIL_TYPES.isProxy(value) || OBJECT_GET_PROTOTYPE_OF(value) !== OBJECT_PROTOTYPE
    || OBJECT_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) refuse(code);
  for (const name of OBJECT_GET_OWN_PROPERTY_NAMES(value)) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, name);
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, 'value') || descriptor.enumerable !== true) refuse(code);
  }
  return value;
}

function stringValue(value, code) {
  if (typeof value !== 'string' || value.length === 0 || value !== REFLECT_APPLY(STRING_NORMALIZE, value, ['NFC'])) refuse(code);
  return value;
}

function digestValue(value, code) {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse(code);
  return value;
}

function equalDigest(actual, expected, code) {
  if (actual !== expected) refuse(code);
}

function withoutKey(value, key) {
  const copy = {};
  for (const name of OBJECT_GET_OWN_PROPERTY_NAMES(value)) if (name !== key) copy[name] = value[name];
  return copy;
}

function verifyDigest(value, schema, key, code) {
  const digest = digestValue(value[key], code);
  if (sha256Canonical(schema, withoutKey(value, key)) !== digest) refuse(code);
  return digest;
}

function fixtureAdmission(value) {
  if (typeof value.fixtureOnly !== 'boolean') refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
  if (value.fixtureOnly && value.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
}

function validateCommonEvidence(value, schema, keys, digestKey, options) {
  exactObject(value, keys, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  if (value.schema !== schema || value.authorizing !== false
    || value.authentication !== 'NONE'
    || value.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER'
    || typeof value.fixtureOnly !== 'boolean') refuse('SOURCE_ORIGIN_LOCAL_EVIDENCE');
  if (value.fixtureOnly && options.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (value.fixtureOnly !== options.snapshot.fixtureOnly) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (value.status !== undefined && value.status !== 'VERIFIED') refuse('SOURCE_ORIGIN_LOCAL_EVIDENCE');
  digestValue(value.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  digestValue(value.inventoryPolicyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.snapshotDigest, options.snapshot.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.inventoryPolicyDigest, options.policy.policyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  return verifyDigest(value, schema, digestKey, 'SOURCE_ORIGIN_LOCAL_DIGEST');
}

function validateHostObservation(value, options) {
  exactObject(value, HOST_KEYS, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  if (value.schema !== LOCAL_HOST_OBSERVATION_SCHEMA) refuse('SOURCE_ORIGIN_LOCAL_EVIDENCE');
  stringValue(value.platform, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  stringValue(value.arch, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  stringValue(value.runtime, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  if (value.status !== undefined) refuse('SOURCE_ORIGIN_LOCAL_EVIDENCE');
  if (value.fixtureOnly && options.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (value.fixtureOnly !== options.snapshot.fixtureOnly) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (value.authorizing !== false || value.authentication !== 'NONE'
    || value.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER'
    || typeof value.fixtureOnly !== 'boolean') refuse('SOURCE_ORIGIN_LOCAL_EVIDENCE');
  digestValue(value.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  digestValue(value.inventoryPolicyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.snapshotDigest, options.snapshot.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.inventoryPolicyDigest, options.policy.policyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  return verifyDigest(value, LOCAL_HOST_OBSERVATION_SCHEMA, 'observationDigest', 'SOURCE_ORIGIN_LOCAL_DIGEST');
}

function validateDiscoveryReceipt(value, schema, options) {
  return validateCommonEvidence(value, schema, DISCOVERY_KEYS, 'receiptDigest', options);
}

export function buildLocalHostObservation(options) {
  exactOptionsFor(options, expectedOptions(options, HOST_BUILDER_KEYS));
  fixtureAdmission(options);
  stringValue(options.platform, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  stringValue(options.arch, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  stringValue(options.runtime, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  digestValue(options.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  digestValue(options.inventoryPolicyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  const body = {
    schema: LOCAL_HOST_OBSERVATION_SCHEMA,
    platform: options.platform,
    arch: options.arch,
    runtime: options.runtime,
    snapshotDigest: options.snapshotDigest,
    inventoryPolicyDigest: options.inventoryPolicyDigest,
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    fixtureOnly: options.fixtureOnly,
  };
  const observation = Object.freeze({
    ...body,
    observationDigest: sha256Canonical(LOCAL_HOST_OBSERVATION_SCHEMA, body),
  });
  return Object.freeze(observation);
}

export function buildVerifiedLocalDiscoveryReceipt(options) {
  exactOptionsFor(options, expectedOptions(options, DISCOVERY_BUILDER_KEYS));
  fixtureAdmission(options);
  if (options.kind !== 'MYCO' && options.kind !== 'HYPHA') refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
  digestValue(options.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  digestValue(options.inventoryPolicyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  const schema = options.kind === 'MYCO' ? LOCAL_MYCO_RECEIPT_SCHEMA : LOCAL_HYPHA_RECEIPT_SCHEMA;
  const body = {
    schema,
    status: 'VERIFIED',
    snapshotDigest: options.snapshotDigest,
    inventoryPolicyDigest: options.inventoryPolicyDigest,
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    fixtureOnly: options.fixtureOnly,
  };
  const receipt = Object.freeze({
    ...body,
    receiptDigest: sha256Canonical(schema, body),
  });
  return Object.freeze(receipt);
}

function validateInputs(options, allowFixtureOnly) {
  exactOptions(options);
  if (allowFixtureOnly !== undefined && options.allowFixtureOnly !== allowFixtureOnly) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (options.repository === null || options.policy === null || options.snapshot === null
    || options.host === null || options.myco === null || options.hypha === null) refuse('SOURCE_ORIGIN_LOCAL_EVIDENCE');
  plainDataObject(options.repository, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  plainDataObject(options.policy, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  plainDataObject(options.snapshot, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  plainDataObject(options.host, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  plainDataObject(options.myco, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  plainDataObject(options.hypha, 'SOURCE_ORIGIN_LOCAL_EVIDENCE');
  if (options.snapshot.fixtureOnly === true && options.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  const repository = validateRepositoryIdentity(options.repository);
  const policy = validateLocalInventoryPolicy(options.policy, options.allowFixtureOnly === true ? { allowFixtureOnly: true } : undefined);
  const snapshot = validateLocalSourceSnapshot(options.snapshot, {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: policy,
  });
  const fixtureOnly = snapshot.fixtureOnly;
  if (fixtureOnly && options.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (!fixtureOnly && options.allowFixtureOnly === true && policy.profile === 'FIXTURE_ONLY') refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  const context = { ...options, repository, policy, snapshot, allowFixtureOnly: options.allowFixtureOnly === true };
  return {
    ...context,
    hostObservationDigest: validateHostObservation(context.host, context),
    mycoReceiptDigest: validateDiscoveryReceipt(context.myco, LOCAL_MYCO_RECEIPT_SCHEMA, context),
    hyphaReceiptDigest: validateDiscoveryReceipt(context.hypha, LOCAL_HYPHA_RECEIPT_SCHEMA, context),
  };
}

export function buildLocalSourceOriginSubject(options) {
  exactOptions(options);
  const context = validateInputs(options);
  const body = Object.freeze({
    schema: LOCAL_SOURCE_ORIGIN_SUBJECT_SCHEMA,
    repositoryIdentityDigest: context.repository.identityDigest,
    inventoryPolicyDigest: context.policy.policyDigest,
    snapshotDigest: context.snapshot.snapshotDigest,
    hostObservationDigest: context.hostObservationDigest,
    mycoReceiptDigest: context.mycoReceiptDigest,
    hyphaReceiptDigest: context.hyphaReceiptDigest,
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    fixtureOnly: context.snapshot.fixtureOnly,
  });
  return Object.freeze({ ...body, subjectDigest: sha256Canonical(LOCAL_SOURCE_ORIGIN_SUBJECT_SCHEMA, body) });
}

export function validateLocalSourceOriginSubject(value, options) {
  exactObject(value, SUBJECT_KEYS, 'SOURCE_ORIGIN_LOCAL_SCHEMA');
  exactOptions(options);
  if (value.fixtureOnly && options.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  const context = validateInputs(options);
  if (value.schema !== LOCAL_SOURCE_ORIGIN_SUBJECT_SCHEMA || value.authorizing !== false
    || value.authentication !== 'NONE'
    || value.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER'
    || typeof value.fixtureOnly !== 'boolean') refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
  if (value.fixtureOnly && context.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  if (value.fixtureOnly !== context.snapshot.fixtureOnly) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  equalDigest(value.repositoryIdentityDigest, context.repository.identityDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.inventoryPolicyDigest, context.policy.policyDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.snapshotDigest, context.snapshot.snapshotDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.hostObservationDigest, context.hostObservationDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.mycoReceiptDigest, context.mycoReceiptDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  equalDigest(value.hyphaReceiptDigest, context.hyphaReceiptDigest, 'SOURCE_ORIGIN_LOCAL_DIGEST');
  verifyDigest(value, LOCAL_SOURCE_ORIGIN_SUBJECT_SCHEMA, 'subjectDigest', 'SOURCE_ORIGIN_LOCAL_DIGEST');
  return Object.freeze({ ...value });
}
