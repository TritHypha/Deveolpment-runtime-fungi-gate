import {
  sha256Canonical,
  sha256Raw,
  SOURCE_ORIGIN_LIMITS,
  validateLocalInventoryPolicy,
  validateLocalSourceSnapshot,
  validateRepositoryIdentity,
} from './contract.mjs';
import {
  validateLocalSourceOriginSubject,
} from './local-subject.mjs';
import {
  getCapturedLocalSourceBytes,
  getLocalSourceSnapshot,
  verifyRetainedLocalSourceBytes,
} from './local-source.mjs';

export const LOCAL_SOURCE_MANIFEST_SCHEMA = 'galerina.logic-aig-local-source-manifest.v1';
export const LOCAL_RESOLUTION_INPUTS_SCHEMA = 'galerina.logic-aig-local-resolution-inputs.v1';

const PRODUCER_OPTION_KEYS = Object.freeze([
  'allowFixtureOnly', 'capability', 'repository', 'policy', 'subject', 'host', 'myco', 'hypha',
]);
const MANIFEST_KEYS = Object.freeze([
  'schema', 'repositoryIdentityDigest', 'inventoryPolicyDigest', 'snapshotDigest', 'subjectDigest',
  'rows', 'counts', 'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly',
]);
const MANIFEST_OPTION_KEYS = Object.freeze([
  'allowFixtureOnly', 'repository', 'policy', 'snapshot', 'subject', 'host', 'myco', 'hypha',
]);
const ROW_KEYS = Object.freeze(['path', 'role', 'byteLength', 'rawSha256']);
const COUNT_KEYS = Object.freeze(['paths', 'bytes']);
const SOURCE_ROLES = new Set(['DEPENDENCY', 'GENERATED_INPUT', 'SOURCE']);
const RESOLUTION_ROLES = new Set(['POLICY_OWNER', 'RESOLUTION']);
const HEX64 = /^[0-9a-f]{64}$/u;
const OBJECT_PROTOTYPE = Object.prototype;

export class LocalSourceProducerRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'LocalSourceProducerRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new LocalSourceProducerRefusal(code);
}

function exactRecord(value, keys, code = 'SOURCE_ORIGIN_LOCAL_SCHEMA') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== OBJECT_PROTOTYPE
    || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const actual = Object.getOwnPropertyNames(value).sort();
  const expected = keys.slice().sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) refuse(code);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) refuse(code);
  }
  return value;
}

function digest(value, code = 'SOURCE_ORIGIN_LOCAL_DIGEST') {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse(code);
  return value;
}

function withoutKey(value, key) {
  const copy = {};
  for (const name of Object.getOwnPropertyNames(value)) if (name !== key) copy[name] = value[name];
  return copy;
}

function verifyDigest(value, key) {
  const actual = digest(value[key]);
  if (sha256Canonical(value.schema, withoutKey(value, key)) !== actual) refuse('SOURCE_ORIGIN_LOCAL_DIGEST');
  return actual;
}

function validateRows(rows, allowedRoles, maximumBytes) {
  if (!Array.isArray(rows)) refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
  const paths = new Set();
  let bytes = 0;
  let previousPath = null;
  for (const row of rows) {
    exactRecord(row, ROW_KEYS, 'SOURCE_ORIGIN_LOCAL_SCHEMA');
    if (typeof row.path !== 'string' || row.path.length === 0
      || row.path.normalize('NFC') !== row.path || row.path.startsWith('/')
      || row.path.endsWith('/') || row.path.includes('\\') || row.path.includes('//')) {
      refuse('SOURCE_ORIGIN_LOCAL_PATH');
    }
    if (Buffer.byteLength(row.path, 'utf8') > 4_096) refuse('SOURCE_ORIGIN_LOCAL_PATH');
    for (const component of row.path.split('/')) {
      if (!component || component === '.' || component === '..' || Buffer.byteLength(component, 'utf8') > 255
        || /[<>:"|?*\u0000-\u001f]/u.test(component) || component.endsWith('.') || component.endsWith(' ')
        || /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(component)) {
        refuse('SOURCE_ORIGIN_LOCAL_PATH');
      }
    }
    if (!allowedRoles.has(row.role) || !Number.isSafeInteger(row.byteLength) || row.byteLength < 0
      || row.byteLength > SOURCE_ORIGIN_LIMITS.capturedFileBytes || !HEX64.test(row.rawSha256)) {
      refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
    }
    if (previousPath !== null && previousPath >= row.path) refuse('SOURCE_ORIGIN_LOCAL_ORDER');
    const folded = row.path.toLowerCase().normalize('NFC');
    if (paths.has(folded)) refuse('SOURCE_ORIGIN_LOCAL_ALIAS');
    paths.add(folded);
    previousPath = row.path;
    if (bytes > maximumBytes - row.byteLength) refuse('SOURCE_ORIGIN_LOCAL_LIMIT');
    bytes += row.byteLength;
  }
  return { paths: rows.length, bytes };
}

function validateManifestContext(options) {
  exactRecord(options, MANIFEST_OPTION_KEYS, 'SOURCE_ORIGIN_LOCAL_SCHEMA');
  if (options.policy?.profile === 'FIXTURE_ONLY' && options.allowFixtureOnly !== true) {
    refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  }
  const repository = validateRepositoryIdentity(options.repository);
  const policy = validateLocalInventoryPolicy(
    options.policy,
    options.allowFixtureOnly === true ? { allowFixtureOnly: true } : undefined,
  );
  const snapshot = options.snapshot;
  validateLocalSourceSnapshot(snapshot, {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: policy,
  });
  validateLocalSourceOriginSubject(options.subject, {
    allowFixtureOnly: options.allowFixtureOnly,
    repository,
    policy,
    snapshot: options.snapshot,
    host: options.host,
    myco: options.myco,
    hypha: options.hypha,
  });
  return {
    repository,
    policy,
    snapshot,
    subject: options.subject,
    host: options.host,
    myco: options.myco,
    hypha: options.hypha,
    allowFixtureOnly: options.allowFixtureOnly,
  };
}

function validateManifest(value, schema, roles, digestKey, options) {
  exactRecord(value, [...MANIFEST_KEYS, digestKey], 'SOURCE_ORIGIN_LOCAL_SCHEMA');
  const context = validateManifestContext(options);
  if (value.schema !== schema || value.authorizing !== false || value.authentication !== 'NONE'
    || value.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER' || typeof value.fixtureOnly !== 'boolean') {
    refuse('SOURCE_ORIGIN_LOCAL_SCHEMA');
  }
  digest(value.repositoryIdentityDigest);
  digest(value.inventoryPolicyDigest);
  digest(value.snapshotDigest);
  digest(value.subjectDigest);
  if (value.fixtureOnly !== context.snapshot.fixtureOnly
    || context.repository.identityDigest !== value.repositoryIdentityDigest
    || context.policy.policyDigest !== value.inventoryPolicyDigest
    || context.snapshot.snapshotDigest !== value.snapshotDigest
    || context.subject.subjectDigest !== value.subjectDigest) {
    refuse('SOURCE_ORIGIN_LOCAL_DIGEST');
  }
  const counts = value.counts;
  exactRecord(counts, COUNT_KEYS, 'SOURCE_ORIGIN_LOCAL_SCHEMA');
  const maximumBytes = roles === SOURCE_ROLES
    ? SOURCE_ORIGIN_LIMITS.sourceBytes
    : SOURCE_ORIGIN_LIMITS.resolutionBytes;
  const expectedCounts = validateRows(value.rows, roles, maximumBytes);
  if (counts.paths !== expectedCounts.paths || counts.bytes !== expectedCounts.bytes) refuse('SOURCE_ORIGIN_LOCAL_COUNTS');
  if (!Number.isSafeInteger(counts.paths) || !Number.isSafeInteger(counts.bytes) || counts.paths < 0 || counts.bytes < 0) {
    refuse('SOURCE_ORIGIN_LOCAL_COUNTS');
  }
  const expectedRows = context.snapshot.entries.filter((entry) => roles.has(entry.role));
  if (expectedRows.length !== value.rows.length) refuse('SOURCE_ORIGIN_LOCAL_DIGEST');
  const snapshotByPath = new Map(expectedRows.map((entry) => [entry.path, entry]));
  for (const row of value.rows) {
    const entry = snapshotByPath.get(row.path);
    if (!entry || entry.role !== row.role || entry.byteLength !== row.byteLength || entry.rawSha256 !== row.rawSha256) {
      refuse('SOURCE_ORIGIN_LOCAL_DIGEST');
    }
  }
  verifyDigest(value, digestKey);
  return Object.freeze({ ...value, rows: Object.freeze(value.rows.map((row) => Object.freeze({ ...row })),), counts: Object.freeze({ ...counts }) });
}

export function validateLocalSourceManifest(value, options) {
  return validateManifest(value, LOCAL_SOURCE_MANIFEST_SCHEMA, SOURCE_ROLES, 'manifestDigest', options);
}

export function validateLocalResolutionInputs(value, options) {
  return validateManifest(value, LOCAL_RESOLUTION_INPUTS_SCHEMA, RESOLUTION_ROLES, 'resolutionInputsDigest', options);
}

function validateProducerInputs(options) {
  exactRecord(options, PRODUCER_OPTION_KEYS, 'SOURCE_ORIGIN_LOCAL_SCHEMA');
  if (options.policy?.profile === 'FIXTURE_ONLY' && options.allowFixtureOnly !== true) {
    refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  }
  const repository = validateRepositoryIdentity(options.repository);
  const policy = validateLocalInventoryPolicy(
    options.policy,
    options.allowFixtureOnly === true ? { allowFixtureOnly: true } : undefined,
  );
  const snapshot = getLocalSourceSnapshot(options.capability);
  validateLocalSourceSnapshot(snapshot, {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: policy,
  });
  validateLocalSourceOriginSubject(options.subject, {
    allowFixtureOnly: options.allowFixtureOnly,
    repository,
    policy,
    snapshot,
    host: options.host,
    myco: options.myco,
    hypha: options.hypha,
  });
  verifyRetainedLocalSourceBytes(options.capability);
  if (snapshot.fixtureOnly && options.allowFixtureOnly !== true) refuse('SOURCE_ORIGIN_LOCAL_FIXTURE');
  return {
    repository,
    policy,
    snapshot,
    subject: options.subject,
    host: options.host,
    myco: options.myco,
    hypha: options.hypha,
    allowFixtureOnly: options.allowFixtureOnly,
  };
}

function buildManifest({ schema, digestKey, roles, context }) {
  const rows = context.snapshot.entries
    .filter((entry) => roles.has(entry.role))
    .map((entry) => {
      const bytes = getCapturedLocalSourceBytes(context.capability, entry.path);
      if (bytes.byteLength !== entry.byteLength || sha256Raw(bytes) !== entry.rawSha256) refuse('LOCAL_SOURCE_CHANGED');
      return Object.freeze({
        path: entry.path,
        role: entry.role,
        byteLength: entry.byteLength,
        rawSha256: entry.rawSha256,
      });
    });
  const body = {
    schema,
    repositoryIdentityDigest: context.repository.identityDigest,
    inventoryPolicyDigest: context.policy.policyDigest,
    snapshotDigest: context.snapshot.snapshotDigest,
    subjectDigest: context.subject.subjectDigest,
    rows,
    counts: { paths: rows.length, bytes: rows.reduce((sum, row) => sum + row.byteLength, 0) },
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    fixtureOnly: context.snapshot.fixtureOnly,
  };
  return Object.freeze({ ...body, [digestKey]: sha256Canonical(schema, body) });
}

function buildBlobEntries(capability, manifest) {
  return Object.freeze(manifest.rows.map((row) => Object.freeze({
    path: row.path,
    bytes: getCapturedLocalSourceBytes(capability, row.path),
  })));
}

export function buildLocalProducerManifests(options) {
  const context = validateProducerInputs(options);
  const sourceManifest = buildManifest({
    schema: LOCAL_SOURCE_MANIFEST_SCHEMA,
    digestKey: 'manifestDigest',
    roles: SOURCE_ROLES,
    context: { ...context, capability: options.capability },
  });
  const resolutionInputs = buildManifest({
    schema: LOCAL_RESOLUTION_INPUTS_SCHEMA,
    digestKey: 'resolutionInputsDigest',
    roles: RESOLUTION_ROLES,
    context: { ...context, capability: options.capability },
  });
  return Object.freeze({
    sourceManifest: validateLocalSourceManifest(sourceManifest, context),
    resolutionInputs: validateLocalResolutionInputs(resolutionInputs, context),
  });
}

export function buildLocalProducerInput(options) {
  const context = validateProducerInputs(options);
  const sourceManifest = buildManifest({
    schema: LOCAL_SOURCE_MANIFEST_SCHEMA,
    digestKey: 'manifestDigest',
    roles: SOURCE_ROLES,
    context: { ...context, capability: options.capability },
  });
  const resolutionInputs = buildManifest({
    schema: LOCAL_RESOLUTION_INPUTS_SCHEMA,
    digestKey: 'resolutionInputsDigest',
    roles: RESOLUTION_ROLES,
    context: { ...context, capability: options.capability },
  });
  const validatedSource = validateLocalSourceManifest(sourceManifest, context);
  const validatedResolution = validateLocalResolutionInputs(resolutionInputs, context);
  return Object.freeze({
    sourceManifest: validatedSource,
    resolutionInputs: validatedResolution,
    subject: context.subject,
    sourceBlobEntries: buildBlobEntries(options.capability, validatedSource),
    resolutionBlobEntries: buildBlobEntries(options.capability, validatedResolution),
  });
}
