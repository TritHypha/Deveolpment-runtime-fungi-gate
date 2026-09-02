import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

export const SOURCE_ORIGIN_LIMITS = deepFreeze({
  capturedFileBytes: 67_108_864,
  jsonBytes: 67_108_864,
  sourceFiles: 16_384,
  sourceBytes: 67_108_864,
  resolutionFiles: 1_024,
  resolutionBytes: 4_194_304,
  nodes: 65_536,
  edges: 200_000,
  unresolvedRows: 262_144,
  processMillis: 900_000,
  processOutputBytes: 1_048_576,
});

const HEX64 = /^[0-9a-f]{64}$/;
const HEX40 = /^[0-9a-f]{40}$/;
const DIAGNOSTIC = /^(?:[A-Z][A-Z0-9]*-)+[0-9]{3,5}[A-Z]?$/;

class SourceOriginRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'SourceOriginRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new SourceOriginRefusal(code);
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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

function dataObject(value, keys) {
  if (value === null || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) refuse('SOURCE_ORIGIN_SCHEMA');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) refuse('SOURCE_ORIGIN_SCHEMA');
  if (Object.getOwnPropertySymbols(value).length !== 0) refuse('SOURCE_ORIGIN_SCHEMA');
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== keys.length || [...names].sort(codeUnitCompare).some((name, index) => name !== [...keys].sort(codeUnitCompare)[index])) refuse('SOURCE_ORIGIN_SCHEMA');
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('SOURCE_ORIGIN_SCHEMA');
  }
}

function checkedArray(value, code) {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const length = value.length;
  if (!Number.isSafeInteger(length) || length < 0 || length > SOURCE_ORIGIN_LIMITS.jsonBytes) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== length + 1 || !names.includes('length')) refuse(code);
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  return value;
}

function array(value) {
  return checkedArray(value, 'SOURCE_ORIGIN_SCHEMA');
}

function hasUnpairedSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

function nfcString(value) {
  if (typeof value !== 'string' || hasUnpairedSurrogate(value) || value !== value.normalize('NFC')) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function canonicalValue(value, active, depth = 0) {
  if (depth > 128) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
    return value;
  }
  if (typeof value === 'string') {
    if (hasUnpairedSurrogate(value) || value !== value.normalize('NFC')) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
    return value;
  }
  if (typeof value !== 'object' || isProxy(value) || active.has(value)) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
  active.add(value);
  try {
    if (Array.isArray(value)) {
      checkedArray(value, 'SOURCE_ORIGIN_JSON_CANONICAL');
      const output = [];
      for (let index = 0; index < value.length; index += 1) output.push(canonicalValue(Object.getOwnPropertyDescriptor(value, String(index)).value, active, depth + 1));
      return output;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(value).length !== 0) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
    const output = {};
    for (const key of Object.getOwnPropertyNames(value).sort(codeUnitCompare)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
      output[nfcString(key)] = canonicalValue(descriptor.value, active, depth + 1);
    }
    return output;
  } finally {
    active.delete(value);
  }
}

export function canonicalJsonText(value) {
  const text = JSON.stringify(canonicalValue(value, new Set()));
  if (text === undefined || Buffer.byteLength(text, 'utf8') > SOURCE_ORIGIN_LIMITS.jsonBytes) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
  return text;
}

export function sha256Raw(bytes) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) refuse('SOURCE_ORIGIN_SCHEMA');
  return createHash('sha256').update(bytes).digest('hex');
}

export function sha256Canonical(domain, value) {
  nfcString(domain);
  return sha256Raw(Buffer.concat([Buffer.from(domain, 'utf8'), Buffer.from([0]), Buffer.from(canonicalJsonText(value), 'utf8')]));
}

function assertNoDuplicateMembers(text) {
  const objectScopes = [];
  for (let index = 0; index < text.length;) {
    const char = text[index];
    if (char === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        if (text[index] === '\\') index += 2;
        else if (text[index] === '"') { index += 1; break; }
        else index += 1;
      }
      let cursor = index;
      while (/\s/.test(text[cursor] ?? '')) cursor += 1;
      if (text[cursor] === ':' && objectScopes.length > 0) {
        let key;
        try { key = JSON.parse(text.slice(start, index)); } catch { return; }
        const scope = objectScopes.at(-1);
        if (scope.has(key)) refuse('SOURCE_ORIGIN_JSON_DUPLICATE');
        scope.add(key);
      }
      continue;
    }
    if (char === '{') objectScopes.push(new Set());
    else if (char === '}') objectScopes.pop();
    index += 1;
  }
}

export function parseCanonicalJsonBytes(bytes, { label } = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length > SOURCE_ORIGIN_LIMITS.jsonBytes || typeof label !== 'string') refuse('SOURCE_ORIGIN_SCHEMA');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { refuse('SOURCE_ORIGIN_JSON_CANONICAL'); }
  if (text.charCodeAt(0) === 0xfeff) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
  assertNoDuplicateMembers(text);
  let value;
  try { value = JSON.parse(text); } catch { refuse('SOURCE_ORIGIN_JSON_CANONICAL'); }
  if (canonicalJsonText(value) !== text) refuse('SOURCE_ORIGIN_JSON_CANONICAL');
  return deepFreeze(canonicalValue(value, new Set()));
}

function immutableCopy(value) {
  return deepFreeze(canonicalValue(value, new Set()));
}

function without(value, key) {
  const copy = {};
  for (const name of Object.keys(value)) if (name !== key) copy[name] = value[name];
  return copy;
}

function checkDigest(value, field) {
  if (typeof value[field] !== 'string' || !HEX64.test(value[field])) refuse('SOURCE_ORIGIN_DIGEST');
  const expected = sha256Canonical(value.schema, without(value, field));
  if (value[field] !== expected) refuse('SOURCE_ORIGIN_DIGEST');
}

function equalExact(actual, expected) {
  if (canonicalJsonText(actual) !== canonicalJsonText(expected)) refuse('SOURCE_ORIGIN_POLICY');
}

function assertSortedUniqueStrings(values) {
  array(values);
  for (const value of values) nfcString(value);
  for (let index = 1; index < values.length; index += 1) if (codeUnitCompare(values[index - 1], values[index]) >= 0) refuse('SOURCE_ORIGIN_ORDER');
}

export function validateRepositoryIdentity(value) {
  dataObject(value, ['schema', 'ownerNamespace', 'repositoryName', 'canonicalIdentity', 'authorizing', 'identityDigest']);
  if (value.schema !== 'galerina.logic-aig-repository-identity.v1' || value.authorizing !== false) refuse('SOURCE_ORIGIN_POLICY');
  for (const field of ['ownerNamespace', 'repositoryName', 'canonicalIdentity']) nfcString(value[field]);
  if (!value.ownerNamespace || !value.repositoryName || value.ownerNamespace.includes('/') || value.repositoryName.includes('/') || value.ownerNamespace !== 'TritHypha' || value.repositoryName !== 'Galerina' || value.canonicalIdentity !== 'TritHypha/Galerina') refuse('SOURCE_ORIGIN_POLICY');
  checkDigest(value, 'identityDigest');
  return immutableCopy(value);
}

export const SOURCE_POLICY_BODY = deepFreeze({
  schema: 'galerina.logic-aig-source-policy.v1',
  domains: ['FUNGI', 'GATE', 'HOST'],
  suffixes: [
    { domain: 'HOST', suffix: '.cjs' }, { domain: 'HOST', suffix: '.cts' }, { domain: 'HOST', suffix: '.d.ts' },
    { domain: 'FUNGI', suffix: '.fungi' }, { domain: 'GATE', suffix: '.gate' }, { domain: 'HOST', suffix: '.js' },
    { domain: 'HOST', suffix: '.jsx' }, { domain: 'HOST', suffix: '.mjs' }, { domain: 'HOST', suffix: '.mts' },
    { domain: 'HOST', suffix: '.ts' }, { domain: 'HOST', suffix: '.tsx' },
  ],
  exclusions: [],
  authorizing: false,
});

export function validateSourcePolicy(value) {
  dataObject(value, ['schema', 'domains', 'suffixes', 'exclusions', 'authorizing', 'policyDigest']);
  array(value.domains); array(value.suffixes); array(value.exclusions);
  for (const row of value.suffixes) dataObject(row, ['domain', 'suffix']);
  const body = without(value, 'policyDigest');
  const expected = SOURCE_POLICY_BODY;
  if (value.domains.length === expected.domains.length && [...value.domains].sort(codeUnitCompare).every((entry, index) => entry === expected.domains[index]) && canonicalJsonText(value.domains) !== canonicalJsonText(expected.domains)) refuse('SOURCE_ORIGIN_ORDER');
  const expectedSuffixKeys = new Set(expected.suffixes.map((row) => `${row.suffix}\0${row.domain}`));
  const actualSuffixKeys = value.suffixes.map((row) => `${row.suffix}\0${row.domain}`);
  if (new Set(actualSuffixKeys).size !== actualSuffixKeys.length) refuse('SOURCE_ORIGIN_ORDER');
  if (actualSuffixKeys.length === expectedSuffixKeys.size && actualSuffixKeys.every((key) => expectedSuffixKeys.has(key)) && canonicalJsonText(value.suffixes) !== canonicalJsonText(expected.suffixes)) refuse('SOURCE_ORIGIN_ORDER');
  equalExact(body, expected);
  checkDigest(value, 'policyDigest');
  return immutableCopy(value);
}

export function classifySourcePath(path, policy) {
  policy = validateSourcePolicy(policy);
  nfcString(path);
  let selected = null;
  for (const row of policy.suffixes) if (path.endsWith(row.suffix) && (!selected || row.suffix.length > selected.suffix.length)) selected = row;
  return selected?.domain ?? null;
}

export const RESOLUTION_POLICY_BODY = deepFreeze({
  schema: 'galerina.logic-aig-resolution-policy.v1',
  sourceSuffixes: ['.cjs', '.cts', '.d.ts', '.fungi', '.gate', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'],
  resolutionBasenames: ['galerina.workspace.json', 'npm-shrinkwrap.json', 'package-lock.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'yarn.lock'],
  resolutionNamePatterns: ['^jsconfig(?:\\.[A-Za-z0-9_-]+)?\\.json$', '^tsconfig(?:\\.[A-Za-z0-9_-]+)?\\.json$'],
  includeExpectedOutcomeOwners: true,
  testPathComponents: ['test', 'tests'],
  testBasenamePattern: '^(?:.+[.-])?(?:test|spec)\\.(?:cjs|cts|fungi|gate|js|jsx|mjs|mts|ts|tsx)$',
  authorizing: false,
});

export function validateResolutionPolicy(value) {
  dataObject(value, ['schema', 'sourceSuffixes', 'resolutionBasenames', 'resolutionNamePatterns', 'includeExpectedOutcomeOwners', 'testPathComponents', 'testBasenamePattern', 'authorizing', 'policyDigest']);
  for (const field of ['sourceSuffixes', 'resolutionBasenames', 'resolutionNamePatterns', 'testPathComponents']) assertSortedUniqueStrings(value[field]);
  if (value.includeExpectedOutcomeOwners !== true) refuse('SOURCE_ORIGIN_POLICY');
  equalExact(without(value, 'policyDigest'), RESOLUTION_POLICY_BODY);
  checkDigest(value, 'policyDigest');
  return immutableCopy(value);
}

export const UNRESOLVED_REASON_ROWS = deepFreeze([
  ['CALLER','AMBIGUOUS_TARGET',['EXACT_SET']],['CALLER','DYNAMIC_TARGET',['EXACT_SET','UNKNOWN']],['CALLER','MISSING_TARGET',['UNKNOWN']],['CALLER','OWNER_DISPOSITION_CALLER_UNRESOLVED',['NOT_APPLICABLE']],['CALLER','TARGET_OUTSIDE_SOURCE_DOMAIN',['UNKNOWN']],
  ['CONTRACT','AMBIGUOUS_TARGET',['EXACT_SET']],['CONTRACT','DYNAMIC_TARGET',['EXACT_SET','UNKNOWN']],['CONTRACT','MISSING_TARGET',['UNKNOWN']],['CONTRACT','OWNER_DISPOSITION_CONTRACT_UNRESOLVED',['NOT_APPLICABLE']],['CONTRACT','TARGET_OUTSIDE_SOURCE_DOMAIN',['UNKNOWN']],
  ['GENERATED_CONSUMER','OWNER_DISPOSITION_GENERATED_CONSUMER_UNRESOLVED',['NOT_APPLICABLE']],
  ['IMPORT','AMBIGUOUS_TARGET',['EXACT_SET']],['IMPORT','DYNAMIC_TARGET',['EXACT_SET','UNKNOWN']],['IMPORT','MISSING_TARGET',['UNKNOWN']],['IMPORT','OWNER_DISPOSITION_IMPORT_UNRESOLVED',['NOT_APPLICABLE']],['IMPORT','TARGET_OUTSIDE_SOURCE_DOMAIN',['UNKNOWN']],
  ['TEST','AMBIGUOUS_TARGET',['EXACT_SET']],['TEST','DYNAMIC_TARGET',['EXACT_SET','UNKNOWN']],['TEST','MISSING_TARGET',['UNKNOWN']],['TEST','OWNER_DISPOSITION_TEST_UNRESOLVED',['NOT_APPLICABLE']],['TEST','TARGET_OUTSIDE_SOURCE_DOMAIN',['UNKNOWN']],
].map(([relationshipClass, reasonCode, permittedCandidateStates]) => ({ relationshipClass, reasonCode, permittedCandidateStates })));

export const PARSER_POLICY_BODY = deepFreeze({
  schema: 'galerina.logic-aig-parser-policy.v1',
  parserIds: ['galerina-fungi-parser', 'galerina-gate-v3-parser', 'typescript-compiler-api'],
  domainParserBindings: [{ domain: 'FUNGI', parserId: 'galerina-fungi-parser' }, { domain: 'GATE', parserId: 'galerina-gate-v3-parser' }, { domain: 'HOST', parserId: 'typescript-compiler-api' }],
  dispositions: ['EXPECTED_REFUSAL', 'OPAQUE_PROPOSED'],
  diagnosticCodePattern: '^(?:[A-Z][A-Z0-9]*-)+[0-9]{3,5}[A-Z]?$',
  diagnosticSetEncoding: 'ASCII_COMMA_OR_WHITESPACE_V1',
  diagnosticCanonicalization: 'UTF16_CODE_UNIT_ASCENDING_UNIQUE',
  typescriptDiagnosticMapping: { schema: 'galerina.logic-aig-typescript-diagnostic-mapping.v1', inputCodeType: 'NON_NEGATIVE_SAFE_INTEGER', minimumCode: 0, maximumCode: 99999, minimumDigits: 3, prefix: 'TS-', categoryRows: [{ typescriptCategory: 0, name: 'WARNING', codeSetAction: 'EXCLUDE' }, { typescriptCategory: 1, name: 'ERROR', codeSetAction: 'INCLUDE' }, { typescriptCategory: 2, name: 'SUGGESTION', codeSetAction: 'EXCLUDE' }, { typescriptCategory: 3, name: 'MESSAGE', codeSetAction: 'EXCLUDE' }], relatedInformationAction: 'VALIDATE_AND_EXCLUDE', deduplicate: true, ordering: 'UTF16_CODE_UNIT_ASCENDING', authorizing: false },
  ownerKinds: ['GATE_V3_VERDICT', 'INLINE_EXPECTATION', 'PROPOSED_BASELINE', 'SIDECAR_EXPECTATION'],
  ownerManifestBindings: [
    { ownerKind: 'GATE_V3_VERDICT', manifestKind: 'RESOLUTION_INPUTS', ownerKeyRequired: true, ownerReasonRequired: false },
    { ownerKind: 'INLINE_EXPECTATION', manifestKind: 'SOURCE_MANIFEST', ownerKeyRequired: true, ownerReasonRequired: false },
    { ownerKind: 'PROPOSED_BASELINE', manifestKind: 'RESOLUTION_INPUTS', ownerKeyRequired: true, ownerReasonRequired: true },
    { ownerKind: 'SIDECAR_EXPECTATION', manifestKind: 'RESOLUTION_INPUTS', ownerKeyRequired: true, ownerReasonRequired: false },
  ],
  actualOutcomeBindings: [
    { disposition: 'EXPECTED_REFUSAL', actualStatus: 'REFUSED_AS_EXPECTED', diagnosticCodesRule: 'NON_EMPTY_EXACT_CANONICAL_SET' },
    { disposition: 'OPAQUE_PROPOSED', actualStatus: 'OPAQUE_AS_PROPOSED', diagnosticCodesRule: 'NULL' },
  ],
  unresolvedReasonRows: UNRESOLVED_REASON_ROWS,
  authorizing: false,
});

export function validateParserPolicy(value) {
  dataObject(value, ['schema','parserIds','domainParserBindings','dispositions','diagnosticCodePattern','diagnosticSetEncoding','diagnosticCanonicalization','typescriptDiagnosticMapping','ownerKinds','ownerManifestBindings','actualOutcomeBindings','unresolvedReasonRows','authorizing','policyDigest']);
  for (const field of ['parserIds','dispositions','ownerKinds']) array(value[field]);
  for (const field of ['domainParserBindings','ownerManifestBindings','actualOutcomeBindings','unresolvedReasonRows']) array(value[field]);
  const expectedReasonRows = canonicalJsonText(PARSER_POLICY_BODY.unresolvedReasonRows);
  const actualReasonRows = canonicalJsonText(value.unresolvedReasonRows);
  const sortedReasonRows = canonicalJsonText([...value.unresolvedReasonRows].sort((a,b) => codeUnitCompare(`${a.relationshipClass}\0${a.reasonCode}`, `${b.relationshipClass}\0${b.reasonCode}`)));
  if (actualReasonRows !== expectedReasonRows && sortedReasonRows === expectedReasonRows) refuse('SOURCE_ORIGIN_ORDER');
  if (value.diagnosticSetEncoding !== 'ASCII_COMMA_OR_WHITESPACE_V1') refuse('SOURCE_ORIGIN_POLICY');
  equalExact(without(value, 'policyDigest'), PARSER_POLICY_BODY);
  checkDigest(value, 'policyDigest');
  return immutableCopy(value);
}

export function decodeDiagnosticSet(text, policy) {
  policy = validateParserPolicy(policy);
  if (typeof text !== 'string' || /[^\x00-\x7f]/.test(text) || text !== text.normalize('NFC')) refuse('SOURCE_ORIGIN_DIAGNOSTIC_SET');
  const trimmed = text.replace(/^[\x09-\x0d\x20]+|[\x09-\x0d\x20]+$/g, '');
  if (!trimmed || /^,|,$|,,/.test(trimmed)) refuse('SOURCE_ORIGIN_DIAGNOSTIC_SET');
  const tokens = trimmed.split(/(?:[\x09-\x0d\x20]*,[\x09-\x0d\x20]*|[\x09-\x0d\x20]+)/);
  if (tokens.some((token) => !token || !DIAGNOSTIC.test(token)) || new Set(tokens).size !== tokens.length) refuse('SOURCE_ORIGIN_DIAGNOSTIC_SET');
  return tokens.sort(codeUnitCompare);
}

export function validateGeneratedConsumerPolicy(value) {
  dataObject(value, ['schema','relations','authorizing','policyDigest']);
  if (value.schema !== 'galerina.logic-aig-generated-consumers.v1' || value.authorizing !== false) refuse('SOURCE_ORIGIN_POLICY');
  array(value.relations);
  if (value.relations.length !== 0) refuse('SOURCE_ORIGIN_POLICY');
  checkDigest(value, 'policyDigest');
  return immutableCopy(value);
}

function validateSortedEntries(entries, key) {
  array(entries);
  for (let index = 1; index < entries.length; index += 1) if (codeUnitCompare(entries[index - 1][key], entries[index][key]) >= 0) refuse('SOURCE_ORIGIN_ORDER');
}

export function validateProposedBaseline(value) {
  dataObject(value, ['schema','entries','authorizing','policyDigest']);
  if (value.schema !== 'galerina.example-proposed-baseline.v1' || value.authorizing !== false) refuse('SOURCE_ORIGIN_POLICY');
  array(value.entries);
  for (const entry of value.entries) { dataObject(entry, ['directoryName','reason']); nfcString(entry.directoryName); nfcString(entry.reason); if (!entry.directoryName || !entry.reason) refuse('SOURCE_ORIGIN_POLICY'); }
  validateSortedEntries(value.entries, 'directoryName');
  checkDigest(value, 'policyDigest');
  return immutableCopy(value);
}

function nonEmptyString(value) {
  nfcString(value);
  if (!value) refuse('SOURCE_ORIGIN_POLICY');
  return value;
}

function canonicalLocator(value) {
  nonEmptyString(value);
  if (value.includes('\0') || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/.test(value)) refuse('SOURCE_ORIGIN_POLICY');
  const components = value.split('/');
  if (components.some((component) => component === '' || component === '.' || component === '..')) refuse('SOURCE_ORIGIN_POLICY');
  return value;
}

function nonNegativeInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) refuse('SOURCE_ORIGIN_SCHEMA');
  return value;
}

function digest(value) {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse('SOURCE_ORIGIN_DIGEST');
  return value;
}

function validateExpectedOutcomeRow(row, parserPolicy) {
  dataObject(row, ['path','domain','parserId','disposition','diagnosticCodes','ownerKind','ownerLocator','ownerKey']);
  for (const field of ['path','domain','parserId','disposition','ownerKind','ownerLocator','ownerKey']) nonEmptyString(row[field]);
  const parserByDomain = new Map(parserPolicy.domainParserBindings.map((binding) => [binding.domain, binding.parserId]));
  canonicalLocator(row.path); canonicalLocator(row.ownerLocator);
  if (parserByDomain.get(row.domain) !== row.parserId || !parserPolicy.dispositions.includes(row.disposition) || !parserPolicy.ownerKinds.includes(row.ownerKind)) refuse('SOURCE_ORIGIN_POLICY');
  if (row.disposition === 'EXPECTED_REFUSAL') {
    if (row.ownerKind === 'PROPOSED_BASELINE') refuse('SOURCE_ORIGIN_POLICY');
    assertSortedUniqueStrings(row.diagnosticCodes);
    if (row.diagnosticCodes.length === 0 || row.diagnosticCodes.some((code) => !DIAGNOSTIC.test(code))) refuse('SOURCE_ORIGIN_POLICY');
  } else {
    if (row.ownerKind !== 'PROPOSED_BASELINE' || row.diagnosticCodes !== null) refuse('SOURCE_ORIGIN_POLICY');
  }
  if (row.ownerKind === 'INLINE_EXPECTATION' && (row.ownerLocator !== row.path || row.ownerKey !== 'expected_diagnostics')) refuse('SOURCE_ORIGIN_POLICY');
  if (row.ownerKind === 'SIDECAR_EXPECTATION' && (row.ownerLocator !== `${row.path}.expected.diagnostics.txt` || row.ownerKey !== 'complete-file')) refuse('SOURCE_ORIGIN_POLICY');
  if (row.ownerKind === 'GATE_V3_VERDICT' && (row.ownerLocator !== 'packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json' || row.ownerKey !== row.path.slice(row.path.lastIndexOf('/') + 1))) refuse('SOURCE_ORIGIN_POLICY');
  if (row.ownerKind === 'PROPOSED_BASELINE') {
    const ownerComponentCount = row.path.split('/').filter((component) => component === row.ownerKey).length;
    if (row.ownerLocator !== 'governance/example-proposed-baseline.json' || ownerComponentCount !== 1) refuse('SOURCE_ORIGIN_POLICY');
  }
}

export function validateExpectedParseOutcomes(value, { parserPolicy } = {}) {
  dataObject(value, ['schema','parserPolicyDigest','rows','authorizing','expectedOutcomesDigest']);
  parserPolicy = validateParserPolicy(parserPolicy);
  if (value.schema !== 'galerina.logic-aig-expected-parse-outcomes.v1' || value.authorizing !== false || value.parserPolicyDigest !== parserPolicy.policyDigest) refuse('SOURCE_ORIGIN_POLICY');
  array(value.rows);
  for (const row of value.rows) validateExpectedOutcomeRow(row, parserPolicy);
  validateSortedEntries(value.rows, 'path');
  checkDigest(value, 'expectedOutcomesDigest');
  return immutableCopy(value);
}

function validateExecutableIdentity(value) {
  dataObject(value, ['version','executableRawSha256','executableByteLength']);
  nonEmptyString(value.version); digest(value.executableRawSha256); nonNegativeInteger(value.executableByteLength);
}

function validatePackageIdentity(value) {
  dataObject(value, ['name','version','packageLocator','packageRawSha256','packageByteLength','entryLocator','entryRawSha256','entryByteLength']);
  for (const field of ['name','version','packageLocator','entryLocator']) nonEmptyString(value[field]);
  canonicalLocator(value.packageLocator); canonicalLocator(value.entryLocator);
  digest(value.packageRawSha256); digest(value.entryRawSha256);
  nonNegativeInteger(value.packageByteLength); nonNegativeInteger(value.entryByteLength);
}

function validateClosureRows(rows) {
  array(rows);
  for (const row of rows) {
    dataObject(row, ['locator','rawSha256','byteLength']);
    canonicalLocator(row.locator); digest(row.rawSha256); nonNegativeInteger(row.byteLength);
  }
  validateSortedEntries(rows, 'locator');
}

const TOOLCHAIN_HOST_ROOT = 'packages-ts/galerina-core-compiler/node_modules/typescript';
const TOOLCHAIN_PARSER_ROOT = 'generated-source-origin-parser';
const TOOLCHAIN_PARSER_EXPORTS = deepFreeze(['lex', 'parseGateV3', 'parseProgram']);
const TOOLCHAIN_DOMAIN_SELECTIONS = deepFreeze([
  { domain: 'FUNGI', parserId: 'galerina-fungi-parser', runtimeLoadSetId: 'PARSER', operation: 'parseProgram' },
  { domain: 'GATE', parserId: 'galerina-gate-v3-parser', runtimeLoadSetId: 'PARSER', operation: 'parseGateV3' },
  { domain: 'HOST', parserId: 'typescript-compiler-api', runtimeLoadSetId: 'HOST', operation: 'typescript-compiler-api' },
]);
const TOOLCHAIN_SOURCE_EDGES = deepFreeze([
  { fromLocator: 'src/gate-v3-parser.ts', kind: 'IMPORT_TYPE', exportName: null, specifier: './parser.js', toLocator: 'src/parser.ts' },
  { fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'src/lexer.ts' },
  { fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'src/requirement-diagnostics.ts' },
  { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'src/lexer.ts' },
  { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'src/gate-v3-parser.ts' },
  { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'src/parser.ts' },
]);
const TOOLCHAIN_EMITTED_EDGES = deepFreeze([
  { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'lexer.js' },
  { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'requirement-diagnostics.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'lexer.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'gate-v3-parser.js' },
  { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'parser.js' },
]);
const TOOLCHAIN_PARSER_MODULES = deepFreeze([
  'gate-v3-parser.js',
  'lexer.js',
  'parser.js',
  'requirement-diagnostics.js',
  'source-origin-parser-entry.js',
]);

function validateBuiltinModules(values) {
  assertSortedUniqueStrings(values);
  if (values.some((specifier) => {
    if (!/^node:[a-z0-9][a-z0-9_./-]*$/.test(specifier)) return true;
    const components = specifier.slice(5).split('/');
    return components.some((component) => component === '' || component === '.' || component === '..');
  })) refuse('SOURCE_ORIGIN_POLICY');
}

function validateRootedIdentity(value) {
  dataObject(value, ['rootLocator','locator','rawSha256','byteLength']);
  canonicalLocator(value.rootLocator); canonicalLocator(value.locator);
  digest(value.rawSha256); nonNegativeInteger(value.byteLength);
}

function validateSourceEntry(value) {
  dataObject(value, ['rootLocator','locator','gitBlobOid','rawSha256','byteLength','exportNames']);
  canonicalLocator(value.rootLocator); canonicalLocator(value.locator);
  if (!HEX40.test(value.gitBlobOid)) refuse('SOURCE_ORIGIN_POLICY');
  digest(value.rawSha256); nonNegativeInteger(value.byteLength);
  equalExact(value.exportNames, TOOLCHAIN_PARSER_EXPORTS);
  if (value.rootLocator !== 'packages-ts/galerina-core-compiler' || value.locator !== 'src/source-origin-parser-entry.ts') refuse('SOURCE_ORIGIN_POLICY');
}

function validateSourceProject(value) {
  dataObject(value, ['rootLocator','locator','gitBlobOid','rawSha256','byteLength','extendsLocator','files','include','compilerOptions']);
  canonicalLocator(value.rootLocator); canonicalLocator(value.locator);
  if (!HEX40.test(value.gitBlobOid)) refuse('SOURCE_ORIGIN_POLICY');
  digest(value.rawSha256); nonNegativeInteger(value.byteLength);
  const expectedOptions = {
    types: [], noEmitOnError: true, incremental: false, composite: false,
    sourceMap: false, declarationMap: false,
  };
  if (
    value.rootLocator !== 'packages-ts/galerina-core-compiler'
    || value.locator !== 'tsconfig.source-origin-parser.json'
    || value.extendsLocator !== './tsconfig.json'
  ) refuse('SOURCE_ORIGIN_POLICY');
  equalExact(value.files, ['src/source-origin-parser-entry.ts']);
  equalExact(value.include, []);
  equalExact(value.compilerOptions, expectedOptions);
}

function validateEdgeRows(value, expected) {
  array(value);
  for (const row of value) {
    dataObject(row, ['fromLocator','kind','exportName','specifier','toLocator']);
    canonicalLocator(row.fromLocator); canonicalLocator(row.toLocator);
    nonEmptyString(row.kind); nonEmptyString(row.specifier);
    if (row.exportName !== null) nonEmptyString(row.exportName);
  }
  equalExact(value, expected);
}

function validateSourceOriginParser(value) {
  dataObject(value, ['sourceEntry','project','generatedEntry','generatedPackageManifest','exportNames','sourceEdgeRows','emittedEdgeRows','generatedClosureDigest']);
  validateSourceEntry(value.sourceEntry);
  validateSourceProject(value.project);
  validateRootedIdentity(value.generatedEntry);
  validateRootedIdentity(value.generatedPackageManifest);
  if (
    value.generatedEntry.rootLocator !== TOOLCHAIN_PARSER_ROOT
    || value.generatedEntry.locator !== 'source-origin-parser-entry.js'
    || value.generatedPackageManifest.rootLocator !== TOOLCHAIN_PARSER_ROOT
    || value.generatedPackageManifest.locator !== 'package.json'
    || value.generatedPackageManifest.byteLength !== 17
    || value.generatedPackageManifest.rawSha256 !== sha256Raw(Buffer.from('{"type":"module"}', 'utf8'))
  ) refuse('SOURCE_ORIGIN_POLICY');
  equalExact(value.exportNames, TOOLCHAIN_PARSER_EXPORTS);
  validateEdgeRows(value.sourceEdgeRows, TOOLCHAIN_SOURCE_EDGES);
  validateEdgeRows(value.emittedEdgeRows, TOOLCHAIN_EMITTED_EDGES);
  digest(value.generatedClosureDigest);
}

function validateRuntimeLoadSet(value) {
  dataObject(value, ['id','entry','moduleRows','builtinModules']);
  nonEmptyString(value.id);
  dataObject(value.entry, ['rootLocator','locator']);
  canonicalLocator(value.entry.rootLocator); canonicalLocator(value.entry.locator);
  validateClosureRows(value.moduleRows);
  validateBuiltinModules(value.builtinModules);
  const entryRows = value.moduleRows.filter((row) => row.locator === value.entry.locator);
  if (entryRows.length !== 1) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  if (value.id === 'HOST') {
    if (value.entry.rootLocator !== TOOLCHAIN_HOST_ROOT || value.entry.locator !== 'lib/typescript.js') refuse('SOURCE_ORIGIN_TOOLCHAIN');
  } else if (value.id === 'PARSER') {
    if (value.entry.rootLocator !== TOOLCHAIN_PARSER_ROOT || value.entry.locator !== 'source-origin-parser-entry.js') refuse('SOURCE_ORIGIN_TOOLCHAIN');
    if (value.builtinModules.length !== 0) refuse('SOURCE_ORIGIN_TOOLCHAIN');
    equalExact(value.moduleRows.map((row) => row.locator), TOOLCHAIN_PARSER_MODULES);
  } else refuse('SOURCE_ORIGIN_TOOLCHAIN');
}

function joinedRuntimeProjection(runtimeLoadSets) {
  const pairs = new Map();
  for (const loadSet of runtimeLoadSets) {
    for (const row of loadSet.moduleRows) {
      const pairKey = `${loadSet.entry.rootLocator}\0${row.locator}`;
      const retained = pairs.get(pairKey);
      if (retained) {
        if (retained.rawSha256 !== row.rawSha256 || retained.byteLength !== row.byteLength) refuse('SOURCE_ORIGIN_TOOLCHAIN');
        continue;
      }
      pairs.set(pairKey, { rootLocator: loadSet.entry.rootLocator, ...row });
    }
  }
  const exact = new Set();
  const folded = new Set();
  const rows = [];
  for (const row of pairs.values()) {
    const locator = `${row.rootLocator}/${row.locator}`;
    const lower = locator.toLowerCase();
    if (exact.has(locator) || folded.has(lower)) refuse('SOURCE_ORIGIN_TOOLCHAIN');
    exact.add(locator); folded.add(lower);
    rows.push({ locator, rawSha256: row.rawSha256, byteLength: row.byteLength });
  }
  rows.sort((left, right) => codeUnitCompare(left.locator, right.locator));
  return rows;
}

function assertGlobalLocatorClosure(executableRows, dataRows) {
  const exact = new Set();
  const folded = new Set();
  for (const row of [...executableRows, ...dataRows]) {
    const lower = row.locator.toLowerCase();
    if (exact.has(row.locator) || folded.has(lower)) refuse('SOURCE_ORIGIN_TOOLCHAIN');
    exact.add(row.locator); folded.add(lower);
  }
}

function requireRepresented(rows, rootedIdentity) {
  const locator = `${rootedIdentity.rootLocator}/${rootedIdentity.locator}`;
  const row = rows.find((candidate) => candidate.locator === locator);
  if (!row || row.rawSha256 !== rootedIdentity.rawSha256 || row.byteLength !== rootedIdentity.byteLength) refuse('SOURCE_ORIGIN_TOOLCHAIN');
}

function validateToolchainRecord(record) {
  dataObject(record, [
    'recordId','platform','arch','sourceObservationDigest','loadObservationDigest',
    'nodeIdentity','gitIdentity','typescript','sourceOriginParser','runtimeLoadSets',
    'domainSelections','builtinModules','executableModuleRows','dataRows',
    'moduleClosureDigest','recordDigest',
  ]);
  for (const field of ['recordId','platform','arch']) nonEmptyString(record[field]);
  digest(record.sourceObservationDigest); digest(record.loadObservationDigest);
  if (
    record.recordId === 'win32-x64'
      ? record.platform !== 'win32' || record.arch !== 'x64'
      : record.recordId === 'linux-x64'
        ? record.platform !== 'linux' || record.arch !== 'x64'
        : true
  ) refuse('SOURCE_ORIGIN_POLICY');
  validateExecutableIdentity(record.nodeIdentity); validateExecutableIdentity(record.gitIdentity);
  validatePackageIdentity(record.typescript);
  if (
    record.typescript.name !== 'typescript'
    || record.typescript.packageLocator !== `${TOOLCHAIN_HOST_ROOT}/package.json`
    || record.typescript.entryLocator !== `${TOOLCHAIN_HOST_ROOT}/lib/typescript.js`
  ) refuse('SOURCE_ORIGIN_POLICY');
  validateSourceOriginParser(record.sourceOriginParser);
  array(record.runtimeLoadSets);
  for (const loadSet of record.runtimeLoadSets) validateRuntimeLoadSet(loadSet);
  equalExact(record.runtimeLoadSets.map((row) => row.id), ['HOST', 'PARSER']);
  equalExact(record.domainSelections, TOOLCHAIN_DOMAIN_SELECTIONS);
  validateBuiltinModules(record.builtinModules);
  validateClosureRows(record.executableModuleRows); validateClosureRows(record.dataRows);
  if (record.executableModuleRows.length === 0 || record.dataRows.length === 0) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  assertGlobalLocatorClosure(record.executableModuleRows, record.dataRows);
  const projection = joinedRuntimeProjection(record.runtimeLoadSets);
  equalExact(record.executableModuleRows, projection);
  const builtinUnion = [...new Set(record.runtimeLoadSets.flatMap((row) => row.builtinModules))].sort(codeUnitCompare);
  equalExact(record.builtinModules, builtinUnion);

  const hostSet = record.runtimeLoadSets[0];
  const parserSet = record.runtimeLoadSets[1];
  const hostEntry = hostSet.moduleRows.find((row) => row.locator === hostSet.entry.locator);
  const parserEntry = parserSet.moduleRows.find((row) => row.locator === parserSet.entry.locator);
  if (
    !hostEntry
    || record.typescript.entryRawSha256 !== hostEntry.rawSha256
    || record.typescript.entryByteLength !== hostEntry.byteLength
    || !parserEntry
    || record.sourceOriginParser.generatedEntry.rawSha256 !== parserEntry.rawSha256
    || record.sourceOriginParser.generatedEntry.byteLength !== parserEntry.byteLength
  ) refuse('SOURCE_ORIGIN_TOOLCHAIN');
  requireRepresented(record.executableModuleRows, record.sourceOriginParser.generatedEntry);
  requireRepresented(record.dataRows, record.sourceOriginParser.sourceEntry);
  requireRepresented(record.dataRows, record.sourceOriginParser.project);
  requireRepresented(record.dataRows, record.sourceOriginParser.generatedPackageManifest);

  const moduleClosureBody = {
    schema: 'galerina.logic-aig-module-closure.v1',
    executableModuleRows: record.executableModuleRows,
    dataRows: record.dataRows,
    builtinModules: record.builtinModules,
    counts: { executableModules: record.executableModuleRows.length, dataRows: record.dataRows.length, builtinModules: record.builtinModules.length },
    authorizing: false,
  };
  digest(record.moduleClosureDigest); digest(record.recordDigest);
  if (record.moduleClosureDigest !== sha256Canonical(moduleClosureBody.schema, moduleClosureBody)) refuse('SOURCE_ORIGIN_DIGEST');
  if (record.recordDigest !== sha256Canonical('galerina.logic-aig-toolchain-pin-record.v2', without(record, 'recordDigest'))) refuse('SOURCE_ORIGIN_DIGEST');
}

export function validateToolchainPins(value) {
  dataObject(value, ['schema','records','authorizing','pinsDigest']);
  if (value.schema !== 'galerina.logic-aig-toolchain-pins.v2' || value.authorizing !== false) refuse('SOURCE_ORIGIN_POLICY');
  array(value.records);
  for (const record of value.records) validateToolchainRecord(record);
  for (let index = 1; index < value.records.length; index += 1) if (codeUnitCompare(value.records[index - 1].recordId, value.records[index].recordId) >= 0) refuse('SOURCE_ORIGIN_ORDER');
  checkDigest(value, 'pinsDigest');
  return immutableCopy(value);
}
