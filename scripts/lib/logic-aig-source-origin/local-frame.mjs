import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import {
  canonicalJsonText,
  sha256Canonical,
  sha256Raw,
} from './contract.mjs';

const FRAME_MAGIC = 'GAAF';
const FRAME_VERSION = 1;
const FRAME_MAX_BYTES = 128 * 1024 * 1024;
const ARTIFACT_MAX_BYTES = 64 * 1024 * 1024;
const HEX64 = /^[0-9a-f]{64}$/u;
const RUN_ID = /^[0-9a-f]{64}$/u;
const ARTIFACT_IDS = Object.freeze([
  'expected-parse-outcomes',
  'export-sidecar',
  'parse-outcomes-receipt',
  'project',
  'resolution-inputs',
  'source-manifest',
  'toolchain-manifest',
]);
const ARTIFACT_ROLES = Object.freeze({
  'expected-parse-outcomes': 'expected-parse-outcomes',
  'export-sidecar': 'export-sidecar',
  'parse-outcomes-receipt': 'parse-outcomes-receipt',
  project: 'project-graph',
  'resolution-inputs': 'resolution-inputs',
  'source-manifest': 'source-manifest',
  'toolchain-manifest': 'toolchain-manifest',
});
const PROFILE = Object.freeze({
  schema: 'galerina.logic-aig-local-admission-profile.v1',
  profileId: 'galerina.source-origin.local.v1',
  rootArtifactId: 'export-sidecar',
  authorizing: false,
  authentication: 'NONE',
  executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
  supportedClaims: Object.freeze(['captured-bytes-only']),
  unsupportedClaims: Object.freeze(['authenticated-provenance', 'git-object-identity', 'hostile-writer-exclusion']),
  artifactRules: Object.freeze(ARTIFACT_IDS.map((id) => Object.freeze({
    id,
    role: ARTIFACT_ROLES[id],
    required: true,
    maxBytes: ARTIFACT_MAX_BYTES,
  }))),
});
const PROFILE_DIGEST = sha256Raw(Buffer.from(canonicalJsonText(PROFILE), 'utf8'));
function rawDigest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

export class LocalFrameRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'LocalFrameRefusal';
    this.code = code;
  }
}

function refuse(code) { throw new LocalFrameRefusal(`LOCAL_FRAME_${code}`); }

function exactObject(value, keys, code = 'SCHEMA') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) refuse(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) refuse(code);
  return value;
}

function exactDigest(value, code = 'DIGEST') {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse(code);
  return value;
}

function bodyBytes(value, code = 'SCHEMA') {
  let text;
  try { text = canonicalJsonText(value); } catch { refuse(code); }
  return Buffer.from(text, 'utf8');
}

function bodyFromBytes(bytes, code = 'SCHEMA') {
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch { refuse(code); }
  if (canonicalJsonText(value) !== bytes.toString('utf8')) refuse('CANONICAL');
  return value;
}

function selfDigest(value, field, code = 'DIGEST') {
  exactDigest(value[field], code);
  const body = {};
  for (const key of Object.keys(value)) if (key !== field) body[key] = value[key];
  if (sha256Canonical(value.schema, body) !== value[field]) refuse(code);
}

function u64(value) {
  const output = Buffer.allocUnsafe(8);
  output.writeBigUInt64BE(BigInt(value));
  return output;
}

function artifactBody(id, value) {
  const bytes = bodyBytes(value);
  return { id, bytes, sha256: sha256Raw(bytes), byteLength: bytes.length };
}

function localArtifactBodies({ decoderInput, project, toolchain }) {
  exactObject(decoderInput, ['schema', 'sourceManifest', 'resolutionInputs', 'subject', 'sourceBlobs', 'resolutionBlobs']);
  exactObject(project, [
    'schema', 'subjectDigest', 'sourceManifestDigest', 'resolutionInputsDigest', 'sourceManifest',
    'resolutionInputs', 'nodes', 'edges', 'unresolved', 'parseResults', 'idMapRows', 'idMapDigest',
    'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly',
  ]);
  exactObject(toolchain, [
    'schema', 'subjectDigest', 'hostParserId', 'fungiParserId', 'gateParserId', 'runtime', 'platform', 'arch',
    'authorizing', 'authentication', 'executionBoundary',
  ]);
  const subjectDigest = decoderInput.subject.subjectDigest;
  exactDigest(subjectDigest);
  if (project.subjectDigest !== subjectDigest || project.authorizing !== false
    || project.authentication !== 'NONE' || project.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER') refuse('PROJECT');
  if (toolchain.subjectDigest !== subjectDigest || toolchain.authorizing !== false || toolchain.authentication !== 'NONE'
    || toolchain.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER') refuse('TOOLCHAIN');
  const expectedRows = project.parseResults;
  const expected = {
    schema: 'galerina.logic-aig-local-expected-parse-outcomes.v1',
    subjectDigest,
    rows: expectedRows,
    authorizing: false,
  };
  expected.expectedOutcomesDigest = sha256Canonical(expected.schema, expected);
  const parse = {
    schema: 'galerina.logic-aig-local-parse-outcomes-receipt.v1',
    subjectDigest,
    sourceManifestDigest: decoderInput.sourceManifest.manifestDigest,
    resolutionInputsDigest: decoderInput.resolutionInputs.resolutionInputsDigest,
    expectedOutcomesDigest: expected.expectedOutcomesDigest,
    rows: expectedRows,
    counts: { outcomeRows: expectedRows.length },
    authorizing: false,
  };
  parse.receiptDigest = sha256Canonical(parse.schema, parse);
  const projectBytes = bodyBytes(project);
  const graphDigest = sha256Canonical('galerina.logic-aig-local-graph.v1', { nodes: project.nodes, edges: project.edges });
  const unresolvedRowsDigest = sha256Canonical('galerina.logic-aig-local-unresolved-rows.v1', project.unresolved);
  const sidecar = {
    schema: 'galerina.logic-aig-local-export-receipt.v1',
    subjectDigest,
    sourceManifestDigest: decoderInput.sourceManifest.manifestDigest,
    resolutionInputsDigest: decoderInput.resolutionInputs.resolutionInputsDigest,
    expectedOutcomesDigest: expected.expectedOutcomesDigest,
    parseOutcomesReceiptDigest: parse.receiptDigest,
    projectDigest: sha256Raw(projectBytes),
    graphDigest,
    unresolvedRowsDigest,
    unresolvedRowCount: project.unresolved.length,
    status: 'COMPLETE',
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    fixtureOnly: decoderInput.subject.fixtureOnly,
  };
  sidecar.receiptDigest = sha256Canonical(sidecar.schema, sidecar);
  return [
    artifactBody('expected-parse-outcomes', expected),
    artifactBody('export-sidecar', sidecar),
    artifactBody('parse-outcomes-receipt', parse),
    artifactBody('project', project),
    artifactBody('resolution-inputs', decoderInput.resolutionInputs),
    artifactBody('source-manifest', decoderInput.sourceManifest),
    artifactBody('toolchain-manifest', toolchain),
  ];
}

function buildManifest(artifacts, runId, subjectDigest) {
  const rows = artifacts.map((artifact) => ({
    id: artifact.id,
    role: ARTIFACT_ROLES[artifact.id],
    required: true,
    byteLength: artifact.byteLength,
    sha256: artifact.sha256,
  }));
  return {
    schema: 'galerina.logic-aig-local-admission-manifest.v1',
    profileId: PROFILE.profileId,
    profileDigest: PROFILE_DIGEST,
    runId,
    subjectDigest,
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    graph: {
      schema: 'galerina.logic-aig-local-artifact-graph.v1',
      root: 'export-sidecar',
      nodes: [...ARTIFACT_IDS],
      edges: ARTIFACT_IDS.filter((id) => id !== 'export-sidecar').map((id) => ({ from: 'export-sidecar', kind: 'requires', to: id })),
    },
    artifacts: rows,
  };
}

function encodeFrame(manifest, artifacts) {
  const manifestBytes = bodyBytes(manifest);
  const parts = [Buffer.from(FRAME_MAGIC, 'ascii'), Buffer.from([FRAME_VERSION])];
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(manifestBytes.length);
  parts.push(length, manifestBytes);
  const count = Buffer.allocUnsafe(2);
  count.writeUInt16BE(artifacts.length);
  parts.push(count);
  for (const artifact of artifacts) {
    const id = Buffer.from(artifact.id, 'utf8');
    const idLength = Buffer.allocUnsafe(2);
    idLength.writeUInt16BE(id.length);
    parts.push(idLength, id, u64(artifact.bytes.length), artifact.bytes);
  }
  const frame = Buffer.concat(parts);
  if (frame.length > FRAME_MAX_BYTES) refuse('LIMIT');
  return frame;
}

export function buildLocalAdmissionProfile() { return PROFILE; }

export function buildLocalAdmissionFrame(options) {
  exactObject(options, ['decoderInput', 'project', 'toolchain', 'runId']);
  if (!RUN_ID.test(options.runId)) refuse('RUN_ID');
  const artifacts = localArtifactBodies(options);
  const manifest = buildManifest(artifacts, options.runId, options.decoderInput.subject.subjectDigest);
  return { profile: PROFILE, profileId: PROFILE.profileId, profileDigest: PROFILE_DIGEST, manifest, frame: encodeFrame(manifest, artifacts) };
}

export function buildLocalKatC(options) {
  const input = { ...options, runId: options.runId ?? 'c'.repeat(64) };
  const built = buildLocalAdmissionFrame(input);
  return { ...built, frameSha256: rawDigest(built.frame), kat: 'KAT-C' };
}

function parseFrame(frame) {
  if (!Buffer.isBuffer(frame) || frame.length > FRAME_MAX_BYTES) refuse('FRAME');
  let offset = 0;
  if (frame.length < 11 || frame.subarray(0, 4).toString('ascii') !== FRAME_MAGIC || frame[4] !== FRAME_VERSION) refuse('FRAME_HEADER');
  offset = 5;
  const manifestLength = frame.readUInt32BE(offset); offset += 4;
  if (manifestLength > frame.length - offset) refuse('FRAME_LENGTH');
  const manifestBytes = frame.subarray(offset, offset + manifestLength); offset += manifestLength;
  const manifest = bodyFromBytes(manifestBytes, 'FRAME_MANIFEST');
  if (offset + 2 > frame.length) refuse('FRAME_LENGTH');
  const count = frame.readUInt16BE(offset); offset += 2;
  const artifacts = [];
  for (let index = 0; index < count; index += 1) {
    if (offset + 2 > frame.length) refuse('FRAME_LENGTH');
    const idLength = frame.readUInt16BE(offset); offset += 2;
    if (offset + idLength + 8 > frame.length) refuse('FRAME_LENGTH');
    const id = frame.subarray(offset, offset + idLength).toString('utf8'); offset += idLength;
    const byteLength = Number(frame.readBigUInt64BE(offset)); offset += 8;
    if (!Number.isSafeInteger(byteLength) || byteLength > ARTIFACT_MAX_BYTES || byteLength > frame.length - offset) refuse('FRAME_LENGTH');
    const bytes = Buffer.from(frame.subarray(offset, offset + byteLength)); offset += byteLength;
    artifacts.push({ id, bytes, byteLength, sha256: sha256Raw(bytes) });
  }
  if (offset !== frame.length) refuse('FRAME_TRAILING');
  return { manifest, manifestBytes, artifacts };
}

function verifyArtifactRows(manifest, artifacts) {
  exactObject(manifest, [
    'artifacts', 'authentication', 'authorizing', 'executionBoundary', 'graph', 'profileDigest',
    'profileId', 'runId', 'schema', 'subjectDigest',
  ], 'MANIFEST');
  if (manifest.schema !== 'galerina.logic-aig-local-admission-manifest.v1'
    || manifest.profileId !== PROFILE.profileId || manifest.profileDigest !== PROFILE_DIGEST
    || manifest.authorizing !== false || manifest.authentication !== 'NONE'
    || manifest.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER' || !RUN_ID.test(manifest.runId)) refuse('MANIFEST');
  exactDigest(manifest.subjectDigest);
  exactObject(manifest.graph, ['edges', 'nodes', 'root', 'schema'], 'GRAPH');
  if (manifest.graph.schema !== 'galerina.logic-aig-local-artifact-graph.v1'
    || manifest.graph.root !== 'export-sidecar'
    || canonicalJsonText(manifest.graph.nodes) !== canonicalJsonText(ARTIFACT_IDS)
    || manifest.graph.edges.length !== ARTIFACT_IDS.length - 1) refuse('GRAPH');
  if (!Array.isArray(manifest.graph.nodes) || !Array.isArray(manifest.graph.edges)) refuse('GRAPH');
  for (const edge of manifest.graph.edges) {
    exactObject(edge, ['from', 'kind', 'to'], 'GRAPH');
    if (edge.from !== 'export-sidecar' || edge.kind !== 'requires' || !ARTIFACT_IDS.includes(edge.to)
      || edge.to === 'export-sidecar') refuse('GRAPH');
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length !== ARTIFACT_IDS.length) refuse('ARTIFACTS');
  const seen = new Set();
  for (const row of manifest.artifacts) {
    exactObject(row, ['byteLength', 'id', 'required', 'role', 'sha256'], 'ARTIFACTS');
    if (!ARTIFACT_IDS.includes(row.id) || seen.has(row.id) || row.required !== true
      || row.role !== ARTIFACT_ROLES[row.id] || !Number.isSafeInteger(row.byteLength)
      || row.byteLength < 0 || row.byteLength > ARTIFACT_MAX_BYTES) refuse('ARTIFACTS');
    exactDigest(row.sha256);
    seen.add(row.id);
  }
}

function validateLocalManifestArtifact(value, schema, digestKey, subjectDigest, roles) {
  exactObject(value, [
    'schema', 'repositoryIdentityDigest', 'inventoryPolicyDigest', 'snapshotDigest', 'subjectDigest',
    'rows', 'counts', 'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly', digestKey,
  ], 'MANIFEST');
  if (value.schema !== schema || value.subjectDigest !== subjectDigest || value.authorizing !== false
    || value.authentication !== 'NONE' || value.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER'
    || typeof value.fixtureOnly !== 'boolean') refuse('MANIFEST');
  exactDigest(value.repositoryIdentityDigest);
  exactDigest(value.inventoryPolicyDigest);
  exactDigest(value.snapshotDigest);
  exactDigest(value[digestKey]);
  exactObject(value.counts, ['bytes', 'paths'], 'MANIFEST');
  if (!Array.isArray(value.rows)) refuse('MANIFEST');
  if (!Number.isSafeInteger(value.counts.paths) || !Number.isSafeInteger(value.counts.bytes)
    || value.counts.paths !== value.rows.length || value.counts.paths < 0 || value.counts.bytes < 0) refuse('MANIFEST');
  let previousPath = null;
  let totalBytes = 0;
  const paths = new Set();
  for (const row of value.rows) {
    exactObject(row, ['byteLength', 'path', 'rawSha256', 'role'], 'MANIFEST');
    if (!roles.includes(row.role) || typeof row.path !== 'string' || row.path.length === 0
      || (previousPath !== null && previousPath >= row.path) || paths.has(row.path)
      || !Number.isSafeInteger(row.byteLength) || row.byteLength < 0 || !exactDigest(row.rawSha256)) refuse('MANIFEST');
    previousPath = row.path;
    paths.add(row.path);
    totalBytes += row.byteLength;
  }
  if (totalBytes !== value.counts.bytes) refuse('MANIFEST');
  selfDigest(value, digestKey);
}

function validateLocalProjectArtifact(project, source, resolution, subjectDigest) {
  exactObject(project, [
    'schema', 'subjectDigest', 'sourceManifestDigest', 'resolutionInputsDigest', 'sourceManifest',
    'resolutionInputs', 'nodes', 'edges', 'unresolved', 'parseResults', 'idMapRows', 'idMapDigest',
    'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly',
  ], 'PROJECT');
  if (project.schema !== 'galerina.logic-aig-local-project.v1' || project.subjectDigest !== subjectDigest
    || project.authorizing !== false || project.authentication !== 'NONE'
    || project.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER'
    || typeof project.fixtureOnly !== 'boolean'
    || canonicalJsonText(project.sourceManifest) !== canonicalJsonText(source)
    || canonicalJsonText(project.resolutionInputs) !== canonicalJsonText(resolution)) refuse('PROJECT');
  exactDigest(project.sourceManifestDigest);
  exactDigest(project.resolutionInputsDigest);
  exactDigest(project.idMapDigest);
  if (project.sourceManifestDigest !== source.manifestDigest
    || project.resolutionInputsDigest !== resolution.resolutionInputsDigest) refuse('PROJECT');
  if (!Array.isArray(project.nodes) || !Array.isArray(project.edges) || !Array.isArray(project.unresolved)
    || !Array.isArray(project.parseResults) || !Array.isArray(project.idMapRows)) refuse('PROJECT');
  const sourceByPath = new Map(source.rows.map((row) => [row.path, row]));
  const nodeById = new Map();
  const filePaths = new Set();
  for (const node of project.nodes) {
    exactObject(node, ['digest', 'id', 'kind', 'locator'], 'PROJECT');
    if (typeof node.kind !== 'string' || typeof node.locator !== 'string' || !exactDigest(node.digest)
      || !/^ga1:[0-9a-f]{64}$/u.test(node.id)) refuse('PROJECT');
    const path = node.locator.split('#', 1)[0];
    const row = sourceByPath.get(path);
    if (!row || row.rawSha256 !== node.digest || node.id !== `ga1:${sha256Canonical('galerina.logic-aig-node-id.v1', {
      repositoryId: subjectDigest, kind: node.kind, locator: node.locator,
    })}` || nodeById.has(node.id)) refuse('PROJECT');
    nodeById.set(node.id, node);
    if (node.kind === 'FILE') filePaths.add(node.locator);
  }
  if (filePaths.size !== source.rows.length || source.rows.some((row) => !filePaths.has(row.path))) refuse('PROJECT');
  for (const edge of project.edges) {
    exactObject(edge, ['digest', 'evidenceLocation', 'from', 'id', 'kind', 'to'], 'PROJECT');
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to) || !/^ga1:[0-9a-f]{64}$/u.test(edge.id)
      || !exactDigest(edge.digest)) refuse('PROJECT');
    exactObject(edge.evidenceLocation, ['endByte', 'kind', 'sourceRawSha256', 'startByte'], 'PROJECT');
    const sourceRow = sourceByPath.get(nodeById.get(edge.from).locator.split('#', 1)[0]);
    if (!sourceRow || edge.evidenceLocation.kind !== 'SOURCE_SYNTAX'
      || edge.evidenceLocation.sourceRawSha256 !== sourceRow.rawSha256
      || !Number.isSafeInteger(edge.evidenceLocation.startByte)
      || !Number.isSafeInteger(edge.evidenceLocation.endByte)
      || edge.evidenceLocation.startByte < 0 || edge.evidenceLocation.endByte <= edge.evidenceLocation.startByte
      || edge.evidenceLocation.endByte > sourceRow.byteLength
      || edge.digest !== sha256Canonical('galerina.logic-aig-edge-evidence.v1', {
        schema: 'galerina.logic-aig-edge-evidence.v1', relationshipKind: edge.kind,
        sourceNodeId: edge.from, targetNodeId: edge.to, evidenceLocation: edge.evidenceLocation, authorizing: false,
      })
      || edge.id !== `ga1:${sha256Canonical('galerina.logic-aig-edge-id.v1', {
        relationshipKind: edge.kind, sourceNodeId: edge.from, targetNodeId: edge.to, evidenceDigest: edge.digest,
      })}`) refuse('PROJECT');
  }
  const unresolvedDigests = new Set();
  for (const row of project.unresolved) {
    exactObject(row, ['evidenceDigest', 'evidenceOwner', 'evidenceOwnerDigest', 'reasonCode', 'relationshipClass', 'sourceLocator', 'sourceNodeId'], 'PROJECT');
    const sourceNode = nodeById.get(row.sourceNodeId);
    if (!sourceNode || sourceNode.locator !== row.sourceLocator || unresolvedDigests.has(row.evidenceDigest)
      || !exactDigest(row.evidenceDigest) || !exactDigest(row.evidenceOwnerDigest)) refuse('PROJECT');
    exactObject(row.evidenceOwner, ['authorizing', 'candidateNodeIds', 'candidateState', 'reasonCode', 'relationshipClass', 'schema', 'sourceBinding', 'sourceLocator', 'sourceNodeId'], 'PROJECT');
    exactObject(row.evidenceOwner.sourceBinding, ['endByte', 'sourceRawSha256', 'startByte'], 'PROJECT');
    if (row.evidenceOwner.schema !== 'galerina.logic-aig-unresolved-relation-owner.v1'
      || row.evidenceOwner.authorizing !== false || row.evidenceOwner.sourceNodeId !== row.sourceNodeId
      || row.evidenceOwner.sourceLocator !== row.sourceLocator || row.evidenceOwner.relationshipClass !== row.relationshipClass
      || row.evidenceOwner.reasonCode !== row.reasonCode || !Array.isArray(row.evidenceOwner.candidateNodeIds)
      || row.evidenceOwner.candidateNodeIds.some((id) => !nodeById.has(id))) refuse('PROJECT');
    const sourceRow = sourceByPath.get(row.sourceLocator.split('#', 1)[0]);
    if (!sourceRow || row.evidenceOwner.sourceBinding.sourceRawSha256 !== sourceRow.rawSha256
      || !Number.isSafeInteger(row.evidenceOwner.sourceBinding.startByte)
      || !Number.isSafeInteger(row.evidenceOwner.sourceBinding.endByte)
      || row.evidenceOwner.sourceBinding.startByte < 0
      || row.evidenceOwner.sourceBinding.endByte <= row.evidenceOwner.sourceBinding.startByte
      || row.evidenceOwner.sourceBinding.endByte > sourceRow.byteLength
      || row.evidenceOwnerDigest !== sha256Canonical(row.evidenceOwner.schema, row.evidenceOwner)
      || row.evidenceDigest !== sha256Canonical('galerina.logic-aig-unresolved-evidence.v1', {
        sourceNodeId: row.sourceNodeId, sourceLocator: row.sourceLocator,
        relationshipClass: row.relationshipClass, reasonCode: row.reasonCode,
        evidenceOwnerDigest: row.evidenceOwnerDigest,
      })) refuse('PROJECT');
    unresolvedDigests.add(row.evidenceDigest);
  }
  const parsePaths = new Set();
  for (const row of project.parseResults) {
    exactObject(row, ['diagnosticCodes', 'path', 'status'], 'PROJECT');
    if (!sourceByPath.has(row.path) || parsePaths.has(row.path) || !Array.isArray(row.diagnosticCodes)
      || (row.status !== 'PARSED' && row.status !== 'REFUSED') || row.diagnosticCodes.some((code) => typeof code !== 'string')) refuse('PROJECT');
    parsePaths.add(row.path);
  }
  if (parsePaths.size !== source.rows.length || source.rows.some((row) => !parsePaths.has(row.path))) refuse('PROJECT');
  const idMapDigests = new Set();
  for (const row of project.idMapRows) {
    exactObject(row, ['kind', 'locator', 'nativeIdentity', 'nodeId', 'rowDigest', 'sourceRawSha256'], 'PROJECT');
    exactObject(row.nativeIdentity, ['endByte', 'parserId', 'parserNodeKind', 'preorderOrdinal', 'startByte'], 'PROJECT');
    const node = nodeById.get(row.nodeId);
    const sourceRow = sourceByPath.get(row.locator.split('#', 1)[0]);
    if (!node || node.kind !== row.kind || node.locator !== row.locator || !sourceRow
      || row.sourceRawSha256 !== sourceRow.rawSha256 || !exactDigest(row.rowDigest) || idMapDigests.has(row.rowDigest)) refuse('PROJECT');
    const { rowDigest, ...rowBody } = row;
    if (rowDigest !== sha256Canonical('galerina.logic-aig-id-map-row.v1', rowBody)) refuse('PROJECT');
    idMapDigests.add(rowDigest);
  }
  if (project.idMapDigest !== sha256Canonical('galerina.logic-aig-id-map.v1', project.idMapRows)) refuse('PROJECT');
}

export function verifyLocalAdmissionFrame(frame, profile = PROFILE) {
  if (canonicalJsonText(profile) !== canonicalJsonText(PROFILE)) refuse('PROFILE');
  const parsed = parseFrame(frame);
  verifyArtifactRows(parsed.manifest, parsed.artifacts);
  const byId = new Map(parsed.artifacts.map((artifact) => [artifact.id, artifact]));
  if (parsed.artifacts.length !== ARTIFACT_IDS.length) refuse('ARTIFACTS');
  for (const id of ARTIFACT_IDS) {
    const artifact = byId.get(id);
    if (!artifact) refuse('ARTIFACTS');
    const row = parsed.manifest.artifacts.find((candidate) => candidate.id === id);
    if (!row || row.role !== ARTIFACT_ROLES[id] || row.required !== true
      || row.byteLength !== artifact.byteLength || row.sha256 !== artifact.sha256) refuse('ARTIFACTS');
  }
  const source = bodyFromBytes(byId.get('source-manifest').bytes);
  const resolution = bodyFromBytes(byId.get('resolution-inputs').bytes);
  const expected = bodyFromBytes(byId.get('expected-parse-outcomes').bytes);
  const parse = bodyFromBytes(byId.get('parse-outcomes-receipt').bytes);
  const project = bodyFromBytes(byId.get('project').bytes);
  const toolchain = bodyFromBytes(byId.get('toolchain-manifest').bytes);
  const sidecar = bodyFromBytes(byId.get('export-sidecar').bytes);
  validateLocalManifestArtifact(source, 'galerina.logic-aig-local-source-manifest.v1', 'manifestDigest', parsed.manifest.subjectDigest, ['DEPENDENCY', 'GENERATED_INPUT', 'SOURCE']);
  validateLocalManifestArtifact(resolution, 'galerina.logic-aig-local-resolution-inputs.v1', 'resolutionInputsDigest', parsed.manifest.subjectDigest, ['POLICY_OWNER', 'RESOLUTION']);
  validateLocalProjectArtifact(project, source, resolution, parsed.manifest.subjectDigest);
  exactObject(toolchain, [
    'schema', 'subjectDigest', 'hostParserId', 'fungiParserId', 'gateParserId', 'runtime', 'platform', 'arch',
    'authorizing', 'authentication', 'executionBoundary',
  ], 'TOOLCHAIN');
  if (toolchain.schema !== 'galerina.logic-aig-local-toolchain-manifest.v2'
    || toolchain.subjectDigest !== parsed.manifest.subjectDigest
    || toolchain.authorizing !== false || toolchain.authentication !== 'NONE'
    || toolchain.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER') refuse('TOOLCHAIN');
  exactObject(expected, ['schema', 'subjectDigest', 'rows', 'authorizing', 'expectedOutcomesDigest'], 'EXPECTED');
  if (expected.schema !== 'galerina.logic-aig-local-expected-parse-outcomes.v1') refuse('EXPECTED');
  exactObject(parse, [
    'schema', 'subjectDigest', 'sourceManifestDigest', 'resolutionInputsDigest', 'expectedOutcomesDigest',
    'rows', 'counts', 'authorizing', 'receiptDigest',
  ], 'PARSE');
  if (parse.schema !== 'galerina.logic-aig-local-parse-outcomes-receipt.v1') refuse('PARSE');
  exactObject(parse.counts, ['outcomeRows'], 'PARSE');
  if (!Array.isArray(parse.rows) || !Number.isSafeInteger(parse.counts.outcomeRows)
    || parse.counts.outcomeRows !== parse.rows.length || parse.counts.outcomeRows < 0) refuse('PARSE');
  exactObject(sidecar, [
    'schema', 'subjectDigest', 'sourceManifestDigest', 'resolutionInputsDigest', 'expectedOutcomesDigest',
    'parseOutcomesReceiptDigest', 'projectDigest', 'graphDigest', 'unresolvedRowsDigest', 'unresolvedRowCount',
    'status', 'authorizing', 'authentication', 'executionBoundary', 'fixtureOnly', 'receiptDigest',
  ], 'SIDECAR');
  if (sidecar.schema !== 'galerina.logic-aig-local-export-receipt.v1') refuse('SIDECAR');
  if (source.authorizing !== false || resolution.authorizing !== false || project.authorizing !== false
    || expected.authorizing !== false || parse.authorizing !== false || toolchain.authorizing !== false
    || sidecar.authorizing !== false || expected.subjectDigest !== parsed.manifest.subjectDigest
    || parse.subjectDigest !== parsed.manifest.subjectDigest
    || sidecar.subjectDigest !== parsed.manifest.subjectDigest
    || project.subjectDigest !== parsed.manifest.subjectDigest
    || project.sourceManifestDigest !== source.manifestDigest
    || project.resolutionInputsDigest !== resolution.resolutionInputsDigest
    || project.fixtureOnly !== source.fixtureOnly || resolution.fixtureOnly !== source.fixtureOnly
    || typeof sidecar.fixtureOnly !== 'boolean' || sidecar.fixtureOnly !== source.fixtureOnly) refuse('SEMANTIC');
  selfDigest(expected, 'expectedOutcomesDigest');
  selfDigest(parse, 'receiptDigest');
  selfDigest(sidecar, 'receiptDigest');
  if (canonicalJsonText(expected.rows) !== canonicalJsonText(project.parseResults)
    || parse.expectedOutcomesDigest !== expected.expectedOutcomesDigest
    || canonicalJsonText(parse.rows) !== canonicalJsonText(expected.rows)
    || sidecar.expectedOutcomesDigest !== expected.expectedOutcomesDigest
    || sidecar.parseOutcomesReceiptDigest !== parse.receiptDigest
    || sidecar.projectDigest !== sha256Raw(byId.get('project').bytes)
    || sidecar.sourceManifestDigest !== source.manifestDigest
    || sidecar.resolutionInputsDigest !== resolution.resolutionInputsDigest
    || sidecar.graphDigest !== sha256Canonical('galerina.logic-aig-local-graph.v1', { nodes: project.nodes, edges: project.edges })
    || sidecar.unresolvedRowsDigest !== sha256Canonical('galerina.logic-aig-local-unresolved-rows.v1', project.unresolved)
    || sidecar.unresolvedRowCount !== project.unresolved.length
    || sidecar.status !== 'COMPLETE') refuse('SEMANTIC');
  return {
    status: 'HOLD', reason: 'UNAUTHENTICATED_PROVENANCE', authorizing: false,
    logicRequestDigest: null, capsuleDigest: null, frameSha256: rawDigest(frame),
    artifactIds: [...ARTIFACT_IDS],
  };
}
