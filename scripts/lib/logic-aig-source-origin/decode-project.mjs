import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

import {
  SOURCE_ORIGIN_LIMITS,
  canonicalJsonText,
  classifySourcePath,
  decodeDiagnosticSet,
  parseCanonicalJsonBytes,
  sha256Canonical,
  sha256Raw,
  validateExpectedParseOutcomes,
  validateGeneratedConsumerPolicy,
  validateParseOutcomesReceipt,
  validateParserPolicy,
  validateProposedBaseline,
  validateRepositoryIdentity,
  validateResolutionInputs,
  validateResolutionPolicy,
  validateSourceManifest,
  validateSourcePolicy,
  validateToolchainManifest,
  validateToolchainPins,
} from './contract.mjs';
import { decodeFungiGateProject } from './fungi-decoder.mjs';
import { admitFrozenBlobSet } from './git-source.mjs';
import { buildSemanticRows, decodeHostProject } from './host-decoder.mjs';
import { validateExporterPolicy } from './owner-proposal-policy.mjs';
import { buildToolchainSnapshot } from './toolchain-snapshot.mjs';

const OPTION_KEYS = Object.freeze([
  'owners', 'ownerBlobs', 'sourceManifest', 'sourceBlobs', 'resolutionInputs',
  'resolutionBlobs', 'toolchainBlobs', 'platform', 'arch', 'nodeIdentity',
  'gitIdentity',
]);
const OWNER_NAMES = Object.freeze([
  'expectedOutcomes', 'exporter', 'gate', 'generated', 'parser', 'pins',
  'proposedBaseline', 'repositoryIdentity', 'resolution', 'source',
]);
const OWNER_LOCATORS = Object.freeze({
  expectedOutcomes: 'governance/logic-aig-source-origin-expected-parse-outcomes.json',
  exporter: 'governance/logic-aig-source-origin-exporter-policy.json',
  gate: 'packages-ts/galerina-core-compiler/tests/fixtures/gate-v3/REFERENCE-VERDICTS.json',
  generated: 'governance/logic-aig-source-origin-generated-consumers.json',
  parser: 'governance/logic-aig-source-origin-parser-policy.json',
  pins: 'governance/logic-aig-source-origin-toolchain-pins.json',
  proposedBaseline: 'governance/example-proposed-baseline.json',
  repositoryIdentity: 'governance/logic-aig-source-origin-repository-identity.json',
  resolution: 'governance/logic-aig-source-origin-resolution-policy.json',
  source: 'governance/logic-aig-source-origin-source-policy.json',
});
const RELATIONSHIP_CLASSES = Object.freeze(['CALLER', 'CONTRACT', 'GENERATED_CONSUMER', 'IMPORT', 'TEST']);
const DIAGNOSTIC_HEADER = /^\/\/\/\s*expected_diagnostics:\s*(.+)$/gim;
const HEX40_OR_64 = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const CONTROL = /[\u0000-\u001f\u007f]/u;

class ProjectDecoderRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProjectDecoderRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new ProjectDecoderRefusal(code);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code = 'SOURCE_ORIGIN_PROJECT_SCHEMA') {
  if (isProxy(value) || value === null || typeof value !== 'object' || Array.isArray(value)) refuse(code);
  const prototype = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  const sorted = names.sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (sorted.length !== expected.length || sorted.some((name, index) => name !== expected[index])) refuse(code);
}

function exactArray(value, code = 'SOURCE_ORIGIN_PROJECT_SCHEMA') {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== value.length + 1 || !names.includes('length')) refuse(code);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
  return value;
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

function decodeUtf8(bytes, code = 'SOURCE_ORIGIN_PROJECT_OWNER') {
  if (isProxy(bytes) || !Buffer.isBuffer(bytes) || Object.getPrototypeOf(bytes) !== Buffer.prototype || bytes.buffer instanceof SharedArrayBuffer) refuse(code);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    refuse(code);
  }
}

function sameData(left, right) {
  return canonicalJsonText(left) === canonicalJsonText(right);
}

function verifyGitBlobOid(blobOid, bytes, code) {
  const algorithm = blobOid.length === 40 ? 'sha1' : blobOid.length === 64 ? 'sha256' : refuse(code);
  const observed = createHash(algorithm)
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
  if (observed !== blobOid) refuse(code);
}

function exporterBindings(values) {
  return {
    sourcePolicyDigest: values.source.policyDigest,
    exclusionDigest: sha256Canonical('galerina.logic-aig-exclusions.v1', values.source.exclusions),
    resolutionPolicyDigest: values.resolution.policyDigest,
    parserPolicyDigest: values.parser.policyDigest,
    generatedConsumerPolicyDigest: values.generated.policyDigest,
    repositoryIdentityDigest: values.repositoryIdentity.identityDigest,
    toolchainPinsDigest: values.pins.pinsDigest,
    expectedOutcomesDigest: values.expectedOutcomes.expectedOutcomesDigest,
    proposedBaselineDigest: values.proposedBaseline.policyDigest,
  };
}

function assertNoDuplicateJsonMembers(text) {
  const scopes = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === '"') {
      const start = index++;
      while (index < text.length) {
        if (text[index] === '\\') index += 2;
        else if (text[index++] === '"') break;
      }
      let cursor = index;
      while (/\s/u.test(text[cursor] ?? '')) cursor += 1;
      if (text[cursor] === ':' && scopes.length > 0) {
        let key;
        try { key = JSON.parse(text.slice(start, index)); } catch { refuse('SOURCE_ORIGIN_PROJECT_OWNER'); }
        const scope = scopes.at(-1);
        if (scope.has(key)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
        scope.add(key);
      }
      continue;
    }
    if (character === '{') scopes.push(new Set());
    else if (character === '}') {
      if (scopes.length === 0) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
      scopes.pop();
    }
    index += 1;
  }
  if (scopes.length !== 0) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
}

function parseGateOwnerBytes(bytes, parserPolicy) {
  const text = decodeUtf8(bytes);
  if (!text.endsWith('\n') || text.endsWith('\n\n') || text.endsWith('\r\n')) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  assertNoDuplicateJsonMembers(text);
  let value;
  try { value = JSON.parse(text); } catch { refuse('SOURCE_ORIGIN_PROJECT_OWNER'); }
  return validateGateOwner(value, parserPolicy);
}

function validateGateOwner(value, parserPolicy) {
  exactObject(value, Object.getOwnPropertyNames(value), 'SOURCE_ORIGIN_PROJECT_OWNER');
  const keys = Object.getOwnPropertyNames(value);
  const sorted = [...keys].sort(compareCodeUnits);
  if (keys.some((key, index) => key !== sorted[index])) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  const pattern = new RegExp(parserPolicy.diagnosticCodePattern, 'u');
  for (const key of keys) {
    if (!key || key !== key.normalize('NFC') || CONTROL.test(key)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
    const row = value[key];
    exactObject(row, ['ok','codes'], 'SOURCE_ORIGIN_PROJECT_OWNER');
    if (typeof row.ok !== 'boolean') refuse('SOURCE_ORIGIN_PROJECT_OWNER');
    exactArray(row.codes, 'SOURCE_ORIGIN_PROJECT_OWNER');
    let previous;
    for (const code of row.codes) {
      if (typeof code !== 'string' || !pattern.test(code) || (previous !== undefined && compareCodeUnits(previous, code) >= 0)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
      previous = code;
    }
    if (!row.ok && row.codes.length === 0) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  }
  return value;
}

function ownerSemanticDigest(name, value) {
  if (name === 'expectedOutcomes') return value.expectedOutcomesDigest;
  if (name === 'repositoryIdentity') return value.identityDigest;
  if (name === 'pins') return value.pinsDigest;
  if (name === 'gate') return sha256Canonical('galerina.logic-aig-gate-v3-reference-verdicts.v1', value);
  return value.policyDigest;
}

function validateOwners(owners, ownerBlobsInput) {
  exactObject(owners, ['values','identities','ownerSetDigest','authorizing'], 'SOURCE_ORIGIN_PROJECT_OWNER');
  if (owners.authorizing !== false || typeof owners.ownerSetDigest !== 'string' || !HEX64.test(owners.ownerSetDigest)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  exactObject(owners.values, OWNER_NAMES, 'SOURCE_ORIGIN_PROJECT_OWNER');
  exactArray(owners.identities, 'SOURCE_ORIGIN_PROJECT_OWNER');
  if (owners.identities.length !== OWNER_NAMES.length) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  const identityByLocator = new Map();
  let previous;
  for (const row of owners.identities) {
    exactObject(row, ['locator','blobOid','byteLength','rawSha256','semanticDigest'], 'SOURCE_ORIGIN_PROJECT_OWNER');
    if (
      typeof row.locator !== 'string'
      || row.locator.length === 0
      || !HEX40_OR_64.test(row.blobOid)
      || !Number.isSafeInteger(row.byteLength)
      || row.byteLength < 0
      || !HEX64.test(row.rawSha256)
      || !HEX64.test(row.semanticDigest)
      || (previous !== undefined && compareCodeUnits(previous, row.locator) >= 0)
      || identityByLocator.has(row.locator)
    ) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
    previous = row.locator;
    identityByLocator.set(row.locator, row);
  }
  if (owners.ownerSetDigest !== sha256Canonical('galerina.logic-aig-frozen-owner-set.v1', owners.identities)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  let ownerBlobs;
  try {
    ownerBlobs = admitFrozenBlobSet(owners.identities.map((row) => ({ path: row.locator, byteLength: row.byteLength, rawSha256: row.rawSha256 })), ownerBlobsInput, { label: 'OWNER_SET' });
  } catch {
    refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  }

  const parser = validateParserPolicy(owners.values.parser);
  const validatedValues = {
    repositoryIdentity: validateRepositoryIdentity(owners.values.repositoryIdentity),
    source: validateSourcePolicy(owners.values.source),
    resolution: validateResolutionPolicy(owners.values.resolution),
    parser,
    pins: validateToolchainPins(owners.values.pins),
    generated: validateGeneratedConsumerPolicy(owners.values.generated),
    proposedBaseline: validateProposedBaseline(owners.values.proposedBaseline),
    expectedOutcomes: validateExpectedParseOutcomes(owners.values.expectedOutcomes, { parserPolicy: parser }),
    gate: validateGateOwner(owners.values.gate, parser),
  };
  validatedValues.exporter = validateExporterPolicy(owners.values.exporter, exporterBindings({ ...validatedValues, exporter: owners.values.exporter }));
  for (const name of OWNER_NAMES) {
    const locator = OWNER_LOCATORS[name];
    const identity = identityByLocator.get(locator);
    const bytes = ownerBlobs.get(locator);
    const value = validatedValues[name];
    if (!identity || !bytes || !sameData(value, owners.values[name]) || identity.semanticDigest !== ownerSemanticDigest(name, value)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
    verifyGitBlobOid(identity.blobOid, bytes, 'SOURCE_ORIGIN_PROJECT_OWNER');
    if (name === 'gate') {
      if (!sameData(parseGateOwnerBytes(bytes, parser), value)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
    } else {
      let parsed;
      try { parsed = parseCanonicalJsonBytes(bytes, { label: locator }); } catch { refuse('SOURCE_ORIGIN_PROJECT_OWNER'); }
      if (!sameData(parsed, value)) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
    }
  }
  return {
    values: validatedValues,
    ownerBlobs,
    ownerSetDigest: owners.ownerSetDigest,
    ownerObjectFormats: [...new Set(owners.identities.map((row) => row.blobOid.length === 40 ? 'sha1' : 'sha256'))],
  };
}

function manifestBinding(manifestKind, row) {
  const domain = manifestKind === 'SOURCE_MANIFEST'
    ? 'galerina.logic-aig-source-manifest-row.v1'
    : manifestKind === 'RESOLUTION_INPUTS'
      ? 'galerina.logic-aig-resolution-input-row.v1'
      : refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
  return {
    manifestKind,
    manifestRowDigest: sha256Canonical(domain, row),
    path: row.path,
    blobOid: row.blobOid,
    rawSha256: row.rawSha256,
    byteLength: row.byteLength,
  };
}

function ownerBinding(expected, sourceByPath, resolutionByPath, proposedByName) {
  const manifestKind = expected.ownerKind === 'INLINE_EXPECTATION' ? 'SOURCE_MANIFEST' : 'RESOLUTION_INPUTS';
  const row = manifestKind === 'SOURCE_MANIFEST' ? sourceByPath.get(expected.ownerLocator) : resolutionByPath.get(expected.ownerLocator);
  if (!row) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
  const binding = manifestBinding(manifestKind, row);
  return {
    ownerKind: expected.ownerKind,
    manifestKind: binding.manifestKind,
    manifestRowDigest: binding.manifestRowDigest,
    locator: binding.path,
    blobOid: binding.blobOid,
    rawSha256: binding.rawSha256,
    byteLength: binding.byteLength,
    ownerKey: expected.ownerKey,
    ownerReason: expected.ownerKind === 'PROPOSED_BASELINE' ? proposedByName.get(expected.ownerKey)?.reason ?? refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES') : null,
  };
}

function parserIdForDomain(parserPolicy, domain) {
  return parserPolicy.domainParserBindings.find((row) => row.domain === domain)?.parserId ?? refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
}

function sourceBasename(locator) {
  const index = locator.lastIndexOf('/');
  return index === -1 ? locator : locator.slice(index + 1);
}

function decodeSourceText(bytes) {
  return decodeUtf8(bytes, 'SOURCE_ORIGIN_PROJECT_OUTCOMES');
}

function deriveExpectedOutcomes(captured) {
  const sourceByPath = new Map(captured.sourceManifest.rows.map((row) => [row.path, row]));
  const resolutionByPath = new Map(captured.resolutionInputs.rows.map((row) => [row.path, row]));
  const proposedByName = new Map(captured.values.proposedBaseline.entries.map((row) => [row.directoryName, row]));
  const derived = [];
  for (const sourceRow of captured.sourceManifest.rows) {
    const bytes = captured.sourceBlobs.get(sourceRow.path);
    if (!bytes) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
    const proposedMatches = sourceRow.path.split('/').filter((component) => proposedByName.has(component));
    if (proposedMatches.length > 1) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
    const proposedName = proposedMatches[0] ?? null;
    const sidecarLocator = `${sourceRow.path}.expected.diagnostics.txt`;
    const sidecarRow = resolutionByPath.get(sidecarLocator);
    const domain = classifySourcePath(sourceRow.path, captured.values.source);
    const parserId = parserIdForDomain(captured.values.parser, domain);
    const candidates = [];
    if (proposedName !== null) {
      if (sidecarRow) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
      candidates.push({
        path: sourceRow.path, domain, parserId, disposition: 'OPAQUE_PROPOSED',
        diagnosticCodes: null, ownerKind: 'PROPOSED_BASELINE',
        ownerLocator: OWNER_LOCATORS.proposedBaseline, ownerKey: proposedName,
      });
    } else {
      const text = decodeSourceText(bytes);
      const matches = [...text.matchAll(DIAGNOSTIC_HEADER)];
      if (matches.length > 1) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
      const inlineHeader = matches[0]?.[1] ?? null;
      const hasInlineExpectation = inlineHeader !== null && inlineHeader !== 'none';
      if (hasInlineExpectation && sidecarRow) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
      if (hasInlineExpectation) {
        let diagnosticCodes;
        try { diagnosticCodes = decodeDiagnosticSet(inlineHeader, captured.values.parser); } catch { refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES'); }
        candidates.push({
          path: sourceRow.path, domain, parserId, disposition: 'EXPECTED_REFUSAL',
          diagnosticCodes, ownerKind: 'INLINE_EXPECTATION', ownerLocator: sourceRow.path,
          ownerKey: 'expected_diagnostics',
        });
      }
      if (sidecarRow) {
        const sidecarBytes = captured.resolutionBlobs.get(sidecarLocator);
        if (!sidecarBytes) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
        let diagnosticCodes;
        try { diagnosticCodes = decodeDiagnosticSet(decodeSourceText(sidecarBytes), captured.values.parser); } catch { refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES'); }
        candidates.push({
          path: sourceRow.path, domain, parserId, disposition: 'EXPECTED_REFUSAL',
          diagnosticCodes, ownerKind: 'SIDECAR_EXPECTATION', ownerLocator: sidecarLocator,
          ownerKey: 'complete-file',
        });
      }
      if (domain === 'GATE') {
        const key = sourceBasename(sourceRow.path);
        const verdict = captured.values.gate[key];
        if (verdict !== undefined && verdict.ok === false) candidates.push({
          path: sourceRow.path, domain, parserId, disposition: 'EXPECTED_REFUSAL',
          diagnosticCodes: verdict.codes, ownerKind: 'GATE_V3_VERDICT',
          ownerLocator: OWNER_LOCATORS.gate, ownerKey: key,
        });
      }
    }
    if (candidates.length > 1) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
    if (candidates.length === 1) derived.push(candidates[0]);
  }
  derived.sort((left, right) => compareCodeUnits(left.path, right.path));
  if (!sameData(derived, captured.values.expectedOutcomes.rows)) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
  return { rows: derived, sourceByPath, resolutionByPath, proposedByName };
}

function filteredSource(captured, outcomePaths) {
  const rows = captured.sourceManifest.rows.filter((row) => !outcomePaths.has(row.path));
  const body = {
    schema: captured.sourceManifest.schema,
    repositoryId: captured.sourceManifest.repositoryId,
    expectedHead: captured.sourceManifest.expectedHead,
    expectedTree: captured.sourceManifest.expectedTree,
    objectFormat: captured.sourceManifest.objectFormat,
    policyDigest: captured.sourceManifest.policyDigest,
    exclusionDigest: captured.sourceManifest.exclusionDigest,
    rows,
    counts: {
      paths: rows.length,
      blobs: new Set(rows.map((row) => row.blobOid)).size,
      bytes: rows.reduce((sum, row) => sum + row.byteLength, 0),
      mode100644: rows.filter((row) => row.mode === '100644').length,
      mode100755: rows.filter((row) => row.mode === '100755').length,
      exclusions: captured.values.source.exclusions.length,
    },
    authorizing: false,
  };
  return {
    manifest: { ...body, manifestDigest: sha256Canonical(body.schema, body) },
    blobs: new Map(rows.map((row) => [row.path, captured.sourceBlobs.get(row.path)])),
  };
}

function decoderOptions(captured, filtered, toolchainBlobs) {
  return {
    repositoryIdentity: captured.values.repositoryIdentity,
    sourcePolicy: captured.values.source,
    resolutionPolicy: captured.values.resolution,
    parserPolicy: captured.values.parser,
    pins: captured.values.pins,
    sourceManifest: filtered.manifest,
    sourceBlobs: filtered.blobs,
    resolutionInputs: captured.resolutionInputs,
    resolutionBlobs: captured.resolutionBlobs,
    toolchainBlobs,
    platform: captured.platform,
    arch: captured.arch,
    nodeIdentity: captured.nodeIdentity,
    gitIdentity: captured.gitIdentity,
  };
}

function toolchainSubsets(captured) {
  const record = captured.values.pins.records.find((row) => row.platform === captured.platform && row.arch === captured.arch);
  if (!record) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
  const host = record.runtimeLoadSets.find((row) => row.id === 'HOST');
  if (!host) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
  const hostLocator = `${host.entry.rootLocator}/${host.entry.locator}`;
  const parserSourceLocators = [...new Set([
    record.sourceOriginParser.sourceEntry.locator,
    ...record.sourceOriginParser.sourceEdgeRows.flatMap((edge) => [edge.fromLocator, edge.toLocator]),
  ])].sort(compareCodeUnits).map((locator) => `${record.sourceOriginParser.sourceEntry.rootLocator}/${locator}`);
  const required = [hostLocator, ...parserSourceLocators].sort(compareCodeUnits);
  const rows = required.map((locator) => {
    const executable = record.executableModuleRows.find((row) => row.locator === locator);
    const data = record.dataRows.find((row) => row.locator === locator);
    const identity = executable ?? data;
    if (!identity) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
    return { path: locator, byteLength: identity.byteLength, rawSha256: identity.rawSha256 };
  });
  let all;
  try { all = admitFrozenBlobSet(rows, captured.toolchainBlobsInput, { label: 'SOURCE_MANIFEST' }); } catch { refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN'); }
  return {
    host: new Map([[hostLocator, all.get(hostLocator)]]),
    parser: new Map(required.map((locator) => [locator, all.get(locator)])),
  };
}

function validateGlobalLocatorClosure(sourceManifest, pins, platform, arch) {
  const record = pins.records.find((row) => row.platform === platform && row.arch === arch);
  if (!record) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
  const rows = [
    ...sourceManifest.rows.map((row) => ({ locator: row.path, byteLength: row.byteLength, rawSha256: row.rawSha256 })),
    ...record.executableModuleRows,
    ...record.dataRows,
  ];
  const exact = new Map();
  const folded = new Map();
  for (const row of rows) {
    const retained = exact.get(row.locator);
    if (retained) {
      if (retained.byteLength !== row.byteLength || retained.rawSha256 !== row.rawSha256) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
      continue;
    }
    const lower = row.locator.toLowerCase();
    if (folded.has(lower)) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
    exact.set(row.locator, row);
    folded.set(lower, row.locator);
  }
}

function captureOptions(options) {
  exactObject(options, OPTION_KEYS);
  const ownerCapture = validateOwners(options.owners, options.ownerBlobs);
  const values = ownerCapture.values;
  const sourceManifest = validateSourceManifest(options.sourceManifest, { repositoryIdentity: values.repositoryIdentity, sourcePolicy: values.source });
  const resolutionInputs = validateResolutionInputs(options.resolutionInputs, { repositoryIdentity: values.repositoryIdentity, resolutionPolicy: values.resolution });
  if (ownerCapture.ownerObjectFormats.length !== 1 || ownerCapture.ownerObjectFormats[0] !== sourceManifest.objectFormat) refuse('SOURCE_ORIGIN_PROJECT_OWNER');
  if (
    sourceManifest.repositoryId !== resolutionInputs.repositoryId
    || sourceManifest.expectedHead !== resolutionInputs.expectedHead
    || sourceManifest.expectedTree !== resolutionInputs.expectedTree
  ) refuse('SOURCE_ORIGIN_PROJECT_SCHEMA');
  const sourceBlobs = admitFrozenBlobSet(sourceManifest.rows, options.sourceBlobs, { label: 'SOURCE_MANIFEST' });
  const resolutionBlobs = admitFrozenBlobSet(resolutionInputs.rows, options.resolutionBlobs, { label: 'RESOLUTION_INPUTS' });
  for (const row of sourceManifest.rows) verifyGitBlobOid(row.blobOid, sourceBlobs.get(row.path), 'SOURCE_ORIGIN_PROJECT_SOURCE');
  for (const row of resolutionInputs.rows) verifyGitBlobOid(row.blobOid, resolutionBlobs.get(row.path), 'SOURCE_ORIGIN_PROJECT_RESOLUTION');
  if (typeof options.platform !== 'string' || typeof options.arch !== 'string') refuse('SOURCE_ORIGIN_PROJECT_SCHEMA');
  validateGlobalLocatorClosure(sourceManifest, values.pins, options.platform, options.arch);
  return {
    ...ownerCapture,
    sourceManifest,
    sourceBlobs,
    resolutionInputs,
    resolutionBlobs,
    toolchainBlobsInput: options.toolchainBlobs,
    platform: options.platform,
    arch: options.arch,
    nodeIdentity: options.nodeIdentity,
    gitIdentity: options.gitIdentity,
  };
}

function compareUnresolved(left, right) {
  for (const field of ['sourceNodeId','relationshipClass','reasonCode','sourceLocator','evidenceDigest']) {
    const compared = compareCodeUnits(left[field], right[field]);
    if (compared !== 0) return compared;
  }
  return 0;
}

function compareIdMapRows(left, right) {
  let compared = compareCodeUnits(left.nodeId, right.nodeId);
  if (compared !== 0) return compared;
  compared = compareCodeUnits(left.nativeIdentity.parserId, right.nativeIdentity.parserId);
  if (compared !== 0) return compared;
  compared = compareCodeUnits(left.nativeIdentity.parserNodeKind, right.nativeIdentity.parserNodeKind);
  if (compared !== 0) return compared;
  for (const field of ['startByte','endByte','preorderOrdinal']) {
    if (left.nativeIdentity[field] !== right.nativeIdentity[field]) return left.nativeIdentity[field] - right.nativeIdentity[field];
  }
  return 0;
}

function outcomeSemanticRows(captured, outcomes) {
  const grouped = new Map();
  for (const expected of outcomes.rows) {
    const rows = grouped.get(expected.parserId) ?? [];
    rows.push(outcomes.sourceByPath.get(expected.path));
    grouped.set(expected.parserId, rows);
  }
  const outputs = [];
  for (const [parserId, sourceRows] of grouped) {
    try {
      outputs.push(buildSemanticRows({
        repositoryId: captured.sourceManifest.repositoryId,
        parserId,
        sourceRows,
        parseResults: sourceRows.map((row) => ({ path: row.path, status: 'REFUSED', diagnosticCodes: [] })),
        declarations: [],
        relations: [],
        parserPolicy: captured.values.parser,
        resolutionPolicy: captured.values.resolution,
      }));
    } catch {
      refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
    }
  }
  return outputs;
}

function makeOutcomeRows(captured, outcomes, fileNodes, unresolved) {
  const rows = [];
  for (const expected of outcomes.rows) {
    const sourceRow = outcomes.sourceByPath.get(expected.path);
    const fileNode = fileNodes.get(expected.path);
    if (!sourceRow || !fileNode) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
    const sourceBinding = manifestBinding('SOURCE_MANIFEST', sourceRow);
    const ownerBindings = [ownerBinding(expected, outcomes.sourceByPath, outcomes.resolutionByPath, outcomes.proposedByName)];
    const membershipBody = {
      schema: 'galerina.logic-aig-outcome-membership-proof.v1',
      expectedOutcomesDigest: captured.values.expectedOutcomes.expectedOutcomesDigest,
      path: expected.path,
      disposition: expected.disposition,
      parserId: expected.parserId,
      expectedDiagnosticCodes: expected.diagnosticCodes,
      sourceBinding,
      ownerBindings,
      authorizing: false,
    };
    const membershipProofDigest = sha256Canonical(membershipBody.schema, membershipBody);
    const outcomeUnresolved = [];
    for (const relationshipClass of RELATIONSHIP_CLASSES) {
      const reasonCode = `OWNER_DISPOSITION_${relationshipClass}_UNRESOLVED`;
      const policyRow = captured.values.parser.unresolvedReasonRows.find((row) => row.relationshipClass === relationshipClass && row.reasonCode === reasonCode);
      if (!policyRow || !sameData(policyRow.permittedCandidateStates, ['NOT_APPLICABLE'])) refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
      const evidenceBody = {
        sourceNodeId: fileNode.id,
        sourceLocator: fileNode.locator,
        relationshipClass,
        reasonCode,
        evidenceOwnerDigest: membershipProofDigest,
      };
      outcomeUnresolved.push({ ...evidenceBody, evidenceDigest: sha256Canonical('galerina.logic-aig-unresolved-evidence.v1', evidenceBody) });
    }
    outcomeUnresolved.sort(compareUnresolved);
    unresolved.push(...outcomeUnresolved);
    const body = {
      path: expected.path,
      disposition: expected.disposition,
      parserId: expected.parserId,
      actualStatus: expected.disposition === 'EXPECTED_REFUSAL' ? 'REFUSED_AS_EXPECTED' : 'OPAQUE_AS_PROPOSED',
      actualDiagnosticCodes: expected.diagnosticCodes,
      sourceBinding,
      ownerBindings,
      membershipProofDigest,
      representedFileNodeId: fileNode.id,
      unresolvedRowsDigest: sha256Canonical('galerina.logic-aig-outcome-unresolved-rows.v1', outcomeUnresolved),
    };
    rows.push({ ...body, rowDigest: sha256Canonical('galerina.logic-aig-parse-outcome-row.v1', body) });
  }
  return rows;
}

function makeOutcomeReceipt(captured, rows, toolchainManifest) {
  const body = {
    schema: 'galerina.logic-aig-parse-outcomes-receipt.v1',
    repositoryId: captured.sourceManifest.repositoryId,
    expectedHead: captured.sourceManifest.expectedHead,
    expectedTree: captured.sourceManifest.expectedTree,
    expectedOutcomesDigest: captured.values.expectedOutcomes.expectedOutcomesDigest,
    sourceManifestDigest: captured.sourceManifest.manifestDigest,
    resolutionInputsDigest: captured.resolutionInputs.resolutionInputsDigest,
    toolchainManifestDigest: toolchainManifest.toolchainManifestDigest,
    rows,
    counts: {
      outcomeRows: rows.length,
      expectedRefusalRows: rows.filter((row) => row.disposition === 'EXPECTED_REFUSAL').length,
      opaqueProposedRows: rows.filter((row) => row.disposition === 'OPAQUE_PROPOSED').length,
      representedFileNodes: new Set(rows.map((row) => row.representedFileNodeId)).size,
      unresolvedRows: rows.length * RELATIONSHIP_CLASSES.length,
      ownerBindings: rows.reduce((sum, row) => sum + row.ownerBindings.length, 0),
    },
    authorizing: false,
  };
  const receipt = { ...body, receiptDigest: sha256Canonical(body.schema, body) };
  try {
    return validateParseOutcomesReceipt(receipt, {
      parserPolicy: captured.values.parser,
      expectedOutcomes: captured.values.expectedOutcomes,
      sourceManifest: captured.sourceManifest,
      resolutionInputs: captured.resolutionInputs,
      toolchainManifest,
    });
  } catch {
    refuse('SOURCE_ORIGIN_PROJECT_OUTCOMES');
  }
}

export async function decodeSourceProject(options) {
  const captured = captureOptions(options);
  const outcomes = deriveExpectedOutcomes(captured);
  const outcomePaths = new Set(outcomes.rows.map((row) => row.path));
  const filtered = filteredSource(captured, outcomePaths);
  const toolchains = toolchainSubsets(captured);
  let host;
  let fungiGate;
  try {
    host = await decodeHostProject(decoderOptions(captured, filtered, toolchains.host));
    fungiGate = await decodeFungiGateProject(decoderOptions(captured, filtered, toolchains.parser));
  } catch {
    refuse('SOURCE_ORIGIN_PROJECT_PARSE');
  }
  if (!sameData(host.actualRuntimeLoadSet, fungiGate.actualRuntimeLoadSets[0])) refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
  let toolchainManifest;
  try {
    toolchainManifest = buildToolchainSnapshot({
      pins: captured.values.pins,
      platform: captured.platform,
      arch: captured.arch,
      nodeIdentity: captured.nodeIdentity,
      gitIdentity: captured.gitIdentity,
      actualRuntimeLoadSets: fungiGate.actualRuntimeLoadSets,
      actualParserExportNames: fungiGate.actualParserExportNames,
    });
    toolchainManifest = validateToolchainManifest(toolchainManifest, { pins: captured.values.pins });
  } catch {
    refuse('SOURCE_ORIGIN_PROJECT_TOOLCHAIN');
  }

  const ownerSemantic = outcomeSemanticRows(captured, outcomes);
  const nodes = [host.nodes, fungiGate.nodes, ...ownerSemantic.map((row) => row.nodes)].flat().sort((left, right) => compareCodeUnits(left.id, right.id));
  const edges = [...host.edges, ...fungiGate.edges].sort((left, right) => compareCodeUnits(left.id, right.id));
  const unresolved = [...host.unresolved, ...fungiGate.unresolved];
  const idMapRows = [host.idMapRows, fungiGate.idMapRows, ...ownerSemantic.map((row) => row.idMapRows)].flat().sort(compareIdMapRows);
  if (
    nodes.length > SOURCE_ORIGIN_LIMITS.nodes
    || edges.length > SOURCE_ORIGIN_LIMITS.edges
    || new Set(nodes.map((row) => row.id)).size !== nodes.length
    || new Set(edges.map((row) => row.id)).size !== edges.length
    || new Set(idMapRows.map((row) => row.rowDigest)).size !== idMapRows.length
  ) refuse('SOURCE_ORIGIN_PROJECT_CONSERVATION');
  const fileNodes = new Map(nodes.filter((row) => row.kind === 'FILE').map((row) => [row.locator, row]));
  if (fileNodes.size !== captured.sourceManifest.rows.length || captured.sourceManifest.rows.some((row) => !fileNodes.has(row.path))) refuse('SOURCE_ORIGIN_PROJECT_CONSERVATION');
  const outcomeRows = makeOutcomeRows(captured, outcomes, fileNodes, unresolved);
  unresolved.sort(compareUnresolved);
  if (unresolved.length > SOURCE_ORIGIN_LIMITS.unresolvedRows || new Set(unresolved.map((row) => row.evidenceDigest)).size !== unresolved.length) refuse('SOURCE_ORIGIN_PROJECT_CONSERVATION');
  const parseOutcomesReceipt = makeOutcomeReceipt(captured, outcomeRows, toolchainManifest);
  const parseResults = [...host.parseResults, ...fungiGate.parseResults].sort((left, right) => compareCodeUnits(left.path, right.path));
  if (parseResults.length + outcomeRows.length !== captured.sourceManifest.rows.length || parseResults.some((row) => row.status !== 'PARSED')) refuse('SOURCE_ORIGIN_PROJECT_PARSE');
  return deepFreeze({
    nodes,
    edges,
    unresolved,
    parseResults,
    idMapRows,
    idMapDigest: sha256Canonical('galerina.logic-aig-id-map.v1', idMapRows),
    toolchainManifest,
    parseOutcomesReceipt,
    authorizing: false,
  });
}
