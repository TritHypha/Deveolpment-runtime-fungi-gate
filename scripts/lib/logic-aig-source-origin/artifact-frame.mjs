import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

const LIMITS = Object.freeze({
  frameBytes: 134217728,
  profileBytes: 1048576,
  manifestBytes: 1048576,
  artifacts: 64,
  artifactIdBytes: 128,
  artifactBytes: 67108864,
  graphNodes: 256,
  graphEdges: 1024,
});

const PROFILE_KEYS = ['artifactRules', 'authorizing', 'ownerPolicy', 'profileId', 'rootArtifactId', 'runBinding', 'schema', 'subjectRules', 'supportedClaims', 'unsupportedClaims'];
const RULE_KEYS = ['id', 'maxBytes', 'required', 'role'];
const SUBJECT_RULE_KEYS = ['gitObjectFormat', 'repositoryId'];
const SUBJECT_KEYS = ['commitOid', 'gitObjectFormat', 'repositoryId', 'treeOid'];
const ARTIFACT_INPUT_KEYS = ['bytes', 'id'];
const ARTIFACT_ROW_KEYS = ['byteLength', 'id', 'required', 'role', 'runId', 'sha256'];
const GRAPH_KEYS = ['edges', 'nodes', 'root', 'schema'];
const EDGE_KEYS = ['from', 'kind', 'to'];
const MANIFEST_KEYS = ['artifacts', 'authorizing', 'claims', 'graph', 'ownerRecord', 'profileDigest', 'profileId', 'runId', 'schema', 'subject'];
const OWNER_NONE_KEYS = ['mode'];
const OWNER_POLICY_KEYS = ['algorithm', 'keyId', 'mode', 'publicKeySha256', 'publicKeySpkiDerHex'];
const OWNER_RECORD_KEYS = ['algorithm', 'keyId', 'publicKeySha256', 'signature', 'signedPayloadSha256'];
const UNSUPPORTED_CLAIMS = Object.freeze([
  'path-identity.no-reparse',
  'path-identity.posix-device-inode',
  'path-identity.single-hard-link',
  'path-identity.windows-file-id',
]);
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;
const SPKI_PREFIX = '302a300506032b6570032100';

class ArtifactFrameRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'ArtifactFrameRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new ArtifactFrameRefusal(code);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function hasOnlyDataProperties(value, expectedKeys, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) refuse(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length !== 0 || names.length !== expectedKeys.length) refuse(code);
  const actual = [...names].sort(compareText);
  const expected = [...expectedKeys].sort(compareText);
  if (actual.some((name, index) => name !== expected[index])) refuse(code);
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
  }
}

function compareText(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function compareEdge(left, right) {
  return compareText(left.from, right.from) || compareText(left.kind, right.kind) || compareText(left.to, right.to);
}

function assertSortedUnique(values, comparator, code) {
  for (let index = 1; index < values.length; index += 1) {
    if (comparator(values[index - 1], values[index]) >= 0) refuse(code);
  }
}

function validUnicodeScalars(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function encodeString(text) {
  if (typeof text !== 'string' || !validUnicodeScalars(text)) refuse('REFUSED_CANONICAL');
  let encoded = '"';
  for (const scalar of text) {
    const code = scalar.codePointAt(0);
    if (scalar === '"') encoded += '\\"';
    else if (scalar === '\\') encoded += '\\\\';
    else if (code <= 0x1f) encoded += `\\u00${code.toString(16).padStart(2, '0')}`;
    else encoded += scalar;
  }
  return `${encoded}"`;
}

function canonicalText(value, active) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) refuse('REFUSED_CANONICAL');
    return String(value);
  }
  if (typeof value === 'string') return encodeString(value);
  if (typeof value !== 'object') refuse('REFUSED_CANONICAL');
  if (active.has(value)) refuse('REFUSED_CANONICAL');
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const names = Object.getOwnPropertyNames(value);
      if (names.length !== value.length + 1 || names.at(-1) !== 'length') refuse('REFUSED_CANONICAL');
      const parts = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('REFUSED_CANONICAL');
        parts.push(canonicalText(descriptor.value, active));
      }
      return `[${parts.join(',')}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) refuse('REFUSED_CANONICAL');
    if (Object.getOwnPropertySymbols(value).length !== 0) refuse('REFUSED_CANONICAL');
    const names = Object.getOwnPropertyNames(value).sort(compareText);
    const parts = names.map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('REFUSED_CANONICAL');
      return `${encodeString(name)}:${canonicalText(descriptor.value, active)}`;
    });
    return `{${parts.join(',')}}`;
  } finally {
    active.delete(value);
  }
}

export function canonicalArtifactAdmissionJson(value) {
  return Buffer.from(canonicalText(value, new Set()), 'utf8');
}

function identifier(value, code) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value) || Buffer.byteLength(value) > LIMITS.artifactIdBytes) refuse(code);
}

function digest(value, code) {
  if (typeof value !== 'string' || !SHA256.test(value)) refuse(code);
}

function validateProfile(profile) {
  hasOnlyDataProperties(profile, PROFILE_KEYS, 'REFUSED_PROFILE');
  if (profile.schema !== 'artifact-admission-profile.v1' || profile.authorizing !== false || profile.runBinding !== 'manifest-artifact-row-equality.v1') refuse('REFUSED_PROFILE');
  identifier(profile.profileId, 'REFUSED_PROFILE');
  identifier(profile.rootArtifactId, 'REFUSED_PROFILE');
  hasOnlyDataProperties(profile.subjectRules, SUBJECT_RULE_KEYS, 'REFUSED_PROFILE');
  identifier(profile.subjectRules.repositoryId, 'REFUSED_PROFILE');
  if (profile.subjectRules.gitObjectFormat !== 'sha1' && profile.subjectRules.gitObjectFormat !== 'sha256') refuse('REFUSED_PROFILE');
  if (!Array.isArray(profile.artifactRules) || profile.artifactRules.length === 0 || profile.artifactRules.length > LIMITS.artifacts) refuse('REFUSED_PROFILE');
  for (const rule of profile.artifactRules) {
    hasOnlyDataProperties(rule, RULE_KEYS, 'REFUSED_PROFILE');
    identifier(rule.id, 'REFUSED_PROFILE');
    identifier(rule.role, 'REFUSED_PROFILE');
    if (typeof rule.required !== 'boolean' || !Number.isSafeInteger(rule.maxBytes) || rule.maxBytes < 0 || rule.maxBytes > LIMITS.artifactBytes) refuse('REFUSED_PROFILE');
  }
  assertSortedUnique(profile.artifactRules, (a, b) => compareText(a.id, b.id), 'REFUSED_PROFILE');
  const rootRule = profile.artifactRules.find((rule) => rule.id === profile.rootArtifactId);
  if (!rootRule || !rootRule.required) refuse('REFUSED_PROFILE');
  for (const [claims, code] of [[profile.supportedClaims, 'REFUSED_PROFILE'], [profile.unsupportedClaims, 'REFUSED_PROFILE']]) {
    if (!Array.isArray(claims)) refuse(code);
    for (const claim of claims) identifier(claim, code);
    assertSortedUnique(claims, compareText, code);
  }
  if (profile.supportedClaims.length !== 1 || profile.supportedClaims[0] !== 'captured-bytes-only') refuse('REFUSED_PROFILE');
  if (profile.unsupportedClaims.length !== UNSUPPORTED_CLAIMS.length || profile.unsupportedClaims.some((claim, index) => claim !== UNSUPPORTED_CLAIMS[index])) refuse('REFUSED_PROFILE');
  if (profile.supportedClaims.some((claim) => profile.unsupportedClaims.includes(claim))) refuse('REFUSED_PROFILE');
  if (profile.ownerPolicy?.mode === 'none') {
    hasOnlyDataProperties(profile.ownerPolicy, OWNER_NONE_KEYS, 'REFUSED_PROFILE');
  } else if (profile.ownerPolicy?.mode === 'ed25519') {
    hasOnlyDataProperties(profile.ownerPolicy, OWNER_POLICY_KEYS, 'REFUSED_PROFILE');
    if (profile.ownerPolicy.algorithm !== 'Ed25519') refuse('REFUSED_PROFILE');
    identifier(profile.ownerPolicy.keyId, 'REFUSED_PROFILE');
    if (typeof profile.ownerPolicy.publicKeySpkiDerHex !== 'string' || !/^[0-9a-f]{88}$/.test(profile.ownerPolicy.publicKeySpkiDerHex) || !profile.ownerPolicy.publicKeySpkiDerHex.startsWith(SPKI_PREFIX)) refuse('REFUSED_PROFILE');
    digest(profile.ownerPolicy.publicKeySha256, 'REFUSED_PROFILE');
    if (sha256(Buffer.from(profile.ownerPolicy.publicKeySpkiDerHex, 'hex')) !== profile.ownerPolicy.publicKeySha256) refuse('REFUSED_PROFILE');
  } else {
    refuse('REFUSED_PROFILE');
  }
  const bytes = canonicalArtifactAdmissionJson(profile);
  if (bytes.length > LIMITS.profileBytes) refuse('REFUSED_PROFILE');
  return bytes;
}

function validateSubject(subject, profile) {
  hasOnlyDataProperties(subject, SUBJECT_KEYS, 'REFUSED_PROFILE');
  if (subject.repositoryId !== profile.subjectRules.repositoryId || subject.gitObjectFormat !== profile.subjectRules.gitObjectFormat) refuse('REFUSED_PROFILE');
  const length = subject.gitObjectFormat === 'sha1' ? 40 : 64;
  const pattern = new RegExp(`^[0-9a-f]{${length}}$`);
  if (!pattern.test(subject.commitOid) || !pattern.test(subject.treeOid)) refuse('REFUSED_PROFILE');
}

function captureArtifacts(artifacts, profile, code = 'REFUSED_ARTIFACT') {
  if (!Array.isArray(artifacts) || artifacts.length > LIMITS.artifacts) refuse(code);
  const rules = new Map(profile.artifactRules.map((rule) => [rule.id, rule]));
  const captured = [];
  for (const artifact of artifacts) {
    hasOnlyDataProperties(artifact, ARTIFACT_INPUT_KEYS, code);
    identifier(artifact.id, code);
    const rule = rules.get(artifact.id);
    if (!rule || !Buffer.isBuffer(artifact.bytes)) refuse(code);
    const length = artifact.bytes.length;
    if (length > rule.maxBytes || length > LIMITS.artifactBytes) refuse(code);
    captured.push({ id: artifact.id, bytes: Buffer.from(artifact.bytes), rule });
  }
  captured.sort((a, b) => compareText(a.id, b.id));
  assertSortedUnique(captured, (a, b) => compareText(a.id, b.id), code);
  for (const rule of profile.artifactRules) {
    if (rule.required && !captured.some((artifact) => artifact.id === rule.id)) refuse(code);
  }
  return captured;
}

function validateClaims(claims, profile) {
  if (!Array.isArray(claims)) refuse('REFUSED_CLAIM');
  for (const claim of claims) identifier(claim, 'REFUSED_CLAIM');
  assertSortedUnique(claims, compareText, 'REFUSED_CLAIM');
  for (const claim of claims) {
    if (profile.unsupportedClaims.includes(claim)) refuse('REFUSED_UNSUPPORTED_CLAIM');
    if (!profile.supportedClaims.includes(claim)) refuse('REFUSED_CLAIM');
  }
}

function validateGraph(graph, rootId, artifactIds) {
  hasOnlyDataProperties(graph, GRAPH_KEYS, 'REFUSED_GRAPH_CLOSURE');
  if (graph.schema !== 'artifact-admission-graph.v1' || graph.root !== rootId) refuse('REFUSED_GRAPH_CLOSURE');
  if (!Array.isArray(graph.nodes) || graph.nodes.length > LIMITS.graphNodes || !Array.isArray(graph.edges) || graph.edges.length > LIMITS.graphEdges) refuse('REFUSED_GRAPH_CLOSURE');
  for (const node of graph.nodes) identifier(node, 'REFUSED_GRAPH_CLOSURE');
  assertSortedUnique(graph.nodes, compareText, 'REFUSED_GRAPH_CLOSURE');
  if (graph.nodes.length !== artifactIds.length || graph.nodes.some((node, index) => node !== artifactIds[index])) refuse('REFUSED_GRAPH_CLOSURE');
  for (const edge of graph.edges) {
    hasOnlyDataProperties(edge, EDGE_KEYS, 'REFUSED_GRAPH_CLOSURE');
    identifier(edge.from, 'REFUSED_GRAPH_CLOSURE');
    identifier(edge.kind, 'REFUSED_GRAPH_CLOSURE');
    identifier(edge.to, 'REFUSED_GRAPH_CLOSURE');
    if (edge.kind !== 'requires' || edge.from === edge.to || !artifactIds.includes(edge.from) || !artifactIds.includes(edge.to)) refuse('REFUSED_GRAPH_CLOSURE');
  }
  assertSortedUnique(graph.edges, compareEdge, 'REFUSED_GRAPH_CLOSURE');
  const visiting = new Set();
  const visited = new Set();
  const visit = (node) => {
    if (visiting.has(node)) refuse('REFUSED_GRAPH_CLOSURE');
    if (visited.has(node)) return;
    visiting.add(node);
    for (const edge of graph.edges) if (edge.from === node) visit(edge.to);
    visiting.delete(node);
    visited.add(node);
  };
  visit(rootId);
  if (visited.size !== artifactIds.length) refuse('REFUSED_GRAPH_CLOSURE');
}

function u16(value) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16BE(value);
  return bytes;
}

function u32(value) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function u64(value) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(value));
  return bytes;
}

function signaturePreimage(unsignedManifestBytes, rows) {
  const parts = [Buffer.from('artifact-admission-owner-payload.v1\0', 'ascii'), u32(unsignedManifestBytes.length), unsignedManifestBytes, u16(rows.length)];
  for (const row of rows) {
    const id = Buffer.from(row.id, 'utf8');
    parts.push(u16(id.length), id, u64(row.byteLength), Buffer.from(row.sha256, 'hex'));
  }
  return Buffer.concat(parts);
}

function validateOwnerRecord(ownerRecord, ownerPolicy, unsignedManifest, rows) {
  if (ownerPolicy.mode === 'none') {
    if (ownerRecord !== null) refuse('REFUSED_OWNER_RECORD');
    return null;
  }
  hasOnlyDataProperties(ownerRecord, OWNER_RECORD_KEYS, 'REFUSED_OWNER_RECORD');
  if (ownerRecord.algorithm !== ownerPolicy.algorithm || ownerRecord.keyId !== ownerPolicy.keyId || ownerRecord.publicKeySha256 !== ownerPolicy.publicKeySha256) refuse('REFUSED_OWNER_RECORD');
  digest(ownerRecord.signedPayloadSha256, 'REFUSED_OWNER_RECORD');
  if (typeof ownerRecord.signature !== 'string' || !HEX128.test(ownerRecord.signature)) refuse('REFUSED_OWNER_RECORD');
  const preimage = signaturePreimage(canonicalArtifactAdmissionJson(unsignedManifest), rows);
  const payloadDigest = sha256(preimage);
  if (payloadDigest !== ownerRecord.signedPayloadSha256) refuse('REFUSED_OWNER_RECORD');
  try {
    const key = createPublicKey({ key: Buffer.from(ownerPolicy.publicKeySpkiDerHex, 'hex'), format: 'der', type: 'spki' });
    if (!verifySignature(null, Buffer.from(payloadDigest, 'hex'), key, Buffer.from(ownerRecord.signature, 'hex'))) refuse('REFUSED_OWNER_RECORD');
  } catch (error) {
    if (error?.code === 'REFUSED_OWNER_RECORD') throw error;
    refuse('REFUSED_OWNER_RECORD');
  }
  return { ...ownerRecord };
}

export function buildAdmissionManifest({ profile, subject, runId, artifacts, graph, claims, ownerRecord }) {
  const profileBytes = validateProfile(profile);
  validateSubject(subject, profile);
  digest(runId, 'REFUSED_RUN_BINDING');
  validateClaims(claims, profile);
  const captured = captureArtifacts(artifacts, profile);
  const artifactIds = captured.map((artifact) => artifact.id);
  validateGraph(graph, profile.rootArtifactId, artifactIds);
  const rows = captured.map(({ id, bytes, rule }) => ({
    id,
    role: rule.role,
    runId,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    required: rule.required,
  }));
  const unsignedManifest = {
    schema: 'artifact-admission-manifest.v1',
    authorizing: false,
    profileId: profile.profileId,
    profileDigest: sha256(profileBytes),
    runId,
    subject: { ...subject },
    artifacts: rows,
    graph: { schema: graph.schema, root: graph.root, nodes: [...graph.nodes], edges: graph.edges.map((edge) => ({ ...edge })) },
    claims: [...claims],
    ownerRecord: null,
  };
  const validatedOwner = validateOwnerRecord(ownerRecord, profile.ownerPolicy, unsignedManifest, rows);
  const manifest = { ...unsignedManifest, ownerRecord: validatedOwner };
  if (canonicalArtifactAdmissionJson(manifest).length > LIMITS.manifestBytes) refuse('REFUSED_MANIFEST');
  return manifest;
}

function validateManifestForFrame(manifest) {
  hasOnlyDataProperties(manifest, MANIFEST_KEYS, 'REFUSED_MANIFEST');
  if (manifest.schema !== 'artifact-admission-manifest.v1' || manifest.authorizing !== false) refuse('REFUSED_MANIFEST');
  identifier(manifest.profileId, 'REFUSED_MANIFEST');
  digest(manifest.profileDigest, 'REFUSED_MANIFEST');
  digest(manifest.runId, 'REFUSED_RUN_BINDING');
  hasOnlyDataProperties(manifest.subject, SUBJECT_KEYS, 'REFUSED_MANIFEST');
  identifier(manifest.subject.repositoryId, 'REFUSED_MANIFEST');
  const oidLength = manifest.subject.gitObjectFormat === 'sha1' ? 40 : manifest.subject.gitObjectFormat === 'sha256' ? 64 : 0;
  if (!oidLength || !new RegExp(`^[0-9a-f]{${oidLength}}$`).test(manifest.subject.commitOid) || !new RegExp(`^[0-9a-f]{${oidLength}}$`).test(manifest.subject.treeOid)) refuse('REFUSED_MANIFEST');
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length > LIMITS.artifacts) refuse('REFUSED_ARTIFACT');
  for (const row of manifest.artifacts) {
    hasOnlyDataProperties(row, ARTIFACT_ROW_KEYS, 'REFUSED_ARTIFACT');
    identifier(row.id, 'REFUSED_ARTIFACT');
    identifier(row.role, 'REFUSED_ARTIFACT');
    digest(row.sha256, 'REFUSED_ARTIFACT');
    digest(row.runId, 'REFUSED_RUN_BINDING');
    if (row.runId !== manifest.runId) refuse('REFUSED_RUN_BINDING');
    if (typeof row.required !== 'boolean' || !Number.isSafeInteger(row.byteLength) || row.byteLength < 0 || row.byteLength > LIMITS.artifactBytes) refuse('REFUSED_ARTIFACT');
  }
  assertSortedUnique(manifest.artifacts, (a, b) => compareText(a.id, b.id), 'REFUSED_ARTIFACT');
  validateGraph(manifest.graph, manifest.graph?.root, manifest.artifacts.map((row) => row.id));
  if (!Array.isArray(manifest.claims)) refuse('REFUSED_CLAIM');
  for (const claim of manifest.claims) identifier(claim, 'REFUSED_CLAIM');
  assertSortedUnique(manifest.claims, compareText, 'REFUSED_CLAIM');
  if (manifest.ownerRecord !== null) {
    hasOnlyDataProperties(manifest.ownerRecord, OWNER_RECORD_KEYS, 'REFUSED_OWNER_RECORD');
    digest(manifest.ownerRecord.publicKeySha256, 'REFUSED_OWNER_RECORD');
    digest(manifest.ownerRecord.signedPayloadSha256, 'REFUSED_OWNER_RECORD');
    if (manifest.ownerRecord.algorithm !== 'Ed25519' || typeof manifest.ownerRecord.signature !== 'string' || !HEX128.test(manifest.ownerRecord.signature)) refuse('REFUSED_OWNER_RECORD');
    identifier(manifest.ownerRecord.keyId, 'REFUSED_OWNER_RECORD');
  }
}

export function encodeAdmissionFrame({ manifest, artifacts }) {
  validateManifestForFrame(manifest);
  if (!Array.isArray(artifacts) || artifacts.length !== manifest.artifacts.length) refuse('REFUSED_ARTIFACT');
  const captured = [];
  for (const artifact of artifacts) {
    hasOnlyDataProperties(artifact, ARTIFACT_INPUT_KEYS, 'REFUSED_ARTIFACT');
    identifier(artifact.id, 'REFUSED_ARTIFACT');
    if (!Buffer.isBuffer(artifact.bytes)) refuse('REFUSED_ARTIFACT');
    captured.push({ id: artifact.id, bytes: Buffer.from(artifact.bytes) });
  }
  captured.sort((a, b) => compareText(a.id, b.id));
  assertSortedUnique(captured, (a, b) => compareText(a.id, b.id), 'REFUSED_ARTIFACT');
  for (let index = 0; index < captured.length; index += 1) {
    const body = captured[index];
    const row = manifest.artifacts[index];
    if (body.id !== row.id || body.bytes.length !== row.byteLength || sha256(body.bytes) !== row.sha256) refuse('REFUSED_ARTIFACT_DIGEST');
  }
  const manifestBytes = canonicalArtifactAdmissionJson(manifest);
  if (manifestBytes.length > LIMITS.manifestBytes) refuse('REFUSED_MANIFEST');
  const parts = [Buffer.from('GAAF', 'ascii'), Buffer.from([1]), u32(manifestBytes.length), manifestBytes, u16(captured.length)];
  for (const artifact of captured) {
    const id = Buffer.from(artifact.id, 'utf8');
    parts.push(u16(id.length), id, u64(artifact.bytes.length), artifact.bytes);
  }
  const frame = Buffer.concat(parts);
  if (frame.length > LIMITS.frameBytes) refuse('REFUSED_FRAME_LIMIT');
  return frame;
}
