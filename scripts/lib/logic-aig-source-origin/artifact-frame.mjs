import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { isProxy } from 'node:util/types';

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
const BUILD_KEYS = ['artifacts', 'claims', 'graph', 'ownerRecord', 'profile', 'runId', 'subject'];
const ENCODE_KEYS = ['artifacts', 'manifest'];
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
const TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
).get;
const TYPED_ARRAY_SET = Uint8Array.prototype.set;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe.bind(Buffer);

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
  if (value === null || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) refuse(code);
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

function captureDataObject(value, expectedKeys, code) {
  hasOnlyDataProperties(value, expectedKeys, code);
  const captured = {};
  for (const name of expectedKeys) {
    captured[name] = Object.getOwnPropertyDescriptor(value, name).value;
  }
  return captured;
}

function captureDataArray(value, code, maxLength) {
  if (isProxy(value) || !Array.isArray(value)) refuse(code);
  if (Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (!lengthDescriptor || !('value' in lengthDescriptor) || lengthDescriptor.enumerable) refuse(code);
  const length = lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < 0) refuse(code);
  if (maxLength !== undefined && length > maxLength) refuse(code);
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== length + 1) refuse(code);
  const captured = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse(code);
    captured[index] = descriptor.value;
  }
  return captured;
}

function captureOwnerPolicy(value) {
  if (value === null || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) refuse('REFUSED_PROFILE');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) refuse('REFUSED_PROFILE');
  if (Object.getOwnPropertySymbols(value).length !== 0) refuse('REFUSED_PROFILE');
  const modeDescriptor = Object.getOwnPropertyDescriptor(value, 'mode');
  if (!modeDescriptor || !('value' in modeDescriptor) || !modeDescriptor.enumerable) refuse('REFUSED_PROFILE');
  if (modeDescriptor.value === 'none') return captureDataObject(value, OWNER_NONE_KEYS, 'REFUSED_PROFILE');
  if (modeDescriptor.value === 'ed25519') return captureDataObject(value, OWNER_POLICY_KEYS, 'REFUSED_PROFILE');
  refuse('REFUSED_PROFILE');
}

function intrinsicBufferLength(value, code) {
  if (!Buffer.isBuffer(value)) refuse(code);
  if (Object.getOwnPropertyDescriptor(value, 'length') || Object.getOwnPropertyDescriptor(value, 'byteLength')) refuse(code);
  let length;
  try {
    length = Reflect.apply(TYPED_ARRAY_LENGTH_GETTER, value, []);
  } catch {
    refuse(code);
  }
  if (!Number.isSafeInteger(length) || length < 0) refuse(code);
  return length;
}

function copyBuffer(value, expectedLength, code) {
  let copy;
  try {
    copy = BUFFER_ALLOC_UNSAFE(expectedLength);
    Reflect.apply(TYPED_ARRAY_SET, copy, [value, 0]);
  } catch {
    refuse(code);
  }
  if (intrinsicBufferLength(copy, code) !== expectedLength) refuse(code);
  return copy;
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

function canonicalText(value, state, depth = 0) {
  if (depth > 128) refuse('REFUSED_CANONICAL');
  state.nodes += 1;
  if (state.nodes > 100000) refuse('REFUSED_CANONICAL');
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) refuse('REFUSED_CANONICAL');
    return String(value);
  }
  if (typeof value === 'string') return encodeString(value);
  if (typeof value !== 'object') refuse('REFUSED_CANONICAL');
  if (isProxy(value)) refuse('REFUSED_CANONICAL');
  if (state.active.has(value)) refuse('REFUSED_CANONICAL');
  state.active.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length !== 0) refuse('REFUSED_CANONICAL');
      const names = Object.getOwnPropertyNames(value);
      if (names.length !== value.length + 1 || names.at(-1) !== 'length') refuse('REFUSED_CANONICAL');
      const parts = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) refuse('REFUSED_CANONICAL');
        parts.push(canonicalText(descriptor.value, state, depth + 1));
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
      return `${encodeString(name)}:${canonicalText(descriptor.value, state, depth + 1)}`;
    });
    return `{${parts.join(',')}}`;
  } finally {
    state.active.delete(value);
  }
}

export function canonicalArtifactAdmissionJson(value) {
  const bytes = Buffer.from(canonicalText(value, { active: new Set(), nodes: 0 }), 'utf8');
  if (bytes.length > LIMITS.manifestBytes) refuse('REFUSED_CANONICAL');
  return bytes;
}

function identifier(value, code) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value) || Buffer.byteLength(value) > LIMITS.artifactIdBytes) refuse(code);
}

function digest(value, code) {
  if (typeof value !== 'string' || !SHA256.test(value)) refuse(code);
}

function validateProfile(profile) {
  const raw = captureDataObject(profile, PROFILE_KEYS, 'REFUSED_PROFILE');
  if (raw.schema !== 'artifact-admission-profile.v1' || raw.authorizing !== false || raw.runBinding !== 'manifest-artifact-row-equality.v1') refuse('REFUSED_PROFILE');
  identifier(raw.profileId, 'REFUSED_PROFILE');
  identifier(raw.rootArtifactId, 'REFUSED_PROFILE');
  const subjectRules = captureDataObject(raw.subjectRules, SUBJECT_RULE_KEYS, 'REFUSED_PROFILE');
  identifier(subjectRules.repositoryId, 'REFUSED_PROFILE');
  if (subjectRules.gitObjectFormat !== 'sha1' && subjectRules.gitObjectFormat !== 'sha256') refuse('REFUSED_PROFILE');
  const artifactRuleInputs = captureDataArray(raw.artifactRules, 'REFUSED_PROFILE', LIMITS.artifacts);
  if (artifactRuleInputs.length === 0) refuse('REFUSED_PROFILE');
  const artifactRules = artifactRuleInputs.map((rule) => captureDataObject(rule, RULE_KEYS, 'REFUSED_PROFILE'));
  for (const rule of artifactRules) {
    identifier(rule.id, 'REFUSED_PROFILE');
    identifier(rule.role, 'REFUSED_PROFILE');
    if (typeof rule.required !== 'boolean' || !Number.isSafeInteger(rule.maxBytes) || rule.maxBytes < 0 || rule.maxBytes > LIMITS.artifactBytes) refuse('REFUSED_PROFILE');
  }
  assertSortedUnique(artifactRules, (a, b) => compareText(a.id, b.id), 'REFUSED_PROFILE');
  const rootRule = artifactRules.find((rule) => rule.id === raw.rootArtifactId);
  if (!rootRule || !rootRule.required) refuse('REFUSED_PROFILE');
  const supportedClaims = captureDataArray(raw.supportedClaims, 'REFUSED_PROFILE', UNSUPPORTED_CLAIMS.length);
  const unsupportedClaims = captureDataArray(raw.unsupportedClaims, 'REFUSED_PROFILE', UNSUPPORTED_CLAIMS.length);
  for (const claims of [supportedClaims, unsupportedClaims]) {
    for (const claim of claims) identifier(claim, 'REFUSED_PROFILE');
    assertSortedUnique(claims, compareText, 'REFUSED_PROFILE');
  }
  if (supportedClaims.length !== 1 || supportedClaims[0] !== 'captured-bytes-only') refuse('REFUSED_PROFILE');
  if (unsupportedClaims.length !== UNSUPPORTED_CLAIMS.length || unsupportedClaims.some((claim, index) => claim !== UNSUPPORTED_CLAIMS[index])) refuse('REFUSED_PROFILE');
  if (supportedClaims.some((claim) => unsupportedClaims.includes(claim))) refuse('REFUSED_PROFILE');
  const ownerPolicy = captureOwnerPolicy(raw.ownerPolicy);
  if (ownerPolicy.mode === 'ed25519') {
    if (ownerPolicy.algorithm !== 'Ed25519') refuse('REFUSED_PROFILE');
    identifier(ownerPolicy.keyId, 'REFUSED_PROFILE');
    if (typeof ownerPolicy.publicKeySpkiDerHex !== 'string' || !/^[0-9a-f]{88}$/.test(ownerPolicy.publicKeySpkiDerHex) || !ownerPolicy.publicKeySpkiDerHex.startsWith(SPKI_PREFIX)) refuse('REFUSED_PROFILE');
    digest(ownerPolicy.publicKeySha256, 'REFUSED_PROFILE');
    if (sha256(Buffer.from(ownerPolicy.publicKeySpkiDerHex, 'hex')) !== ownerPolicy.publicKeySha256) refuse('REFUSED_PROFILE');
  }
  const capturedProfile = {
    ...raw,
    artifactRules,
    ownerPolicy,
    subjectRules,
    supportedClaims,
    unsupportedClaims,
  };
  const bytes = canonicalArtifactAdmissionJson(capturedProfile);
  if (bytes.length > LIMITS.profileBytes) refuse('REFUSED_PROFILE');
  return { bytes, profile: capturedProfile };
}

function validateSubject(subject, profile) {
  const captured = captureDataObject(subject, SUBJECT_KEYS, 'REFUSED_PROFILE');
  if (captured.repositoryId !== profile.subjectRules.repositoryId || captured.gitObjectFormat !== profile.subjectRules.gitObjectFormat) refuse('REFUSED_PROFILE');
  const length = captured.gitObjectFormat === 'sha1' ? 40 : 64;
  const pattern = new RegExp(`^[0-9a-f]{${length}}$`);
  if (!pattern.test(captured.commitOid) || !pattern.test(captured.treeOid)) refuse('REFUSED_PROFILE');
  return captured;
}

function captureArtifacts(artifacts, profile, code = 'REFUSED_ARTIFACT') {
  const artifactInputs = captureDataArray(artifacts, code, LIMITS.artifacts);
  const rules = new Map(profile.artifactRules.map((rule) => [rule.id, rule]));
  const captured = [];
  for (const input of artifactInputs) {
    const artifact = captureDataObject(input, ARTIFACT_INPUT_KEYS, code);
    identifier(artifact.id, code);
    const rule = rules.get(artifact.id);
    if (!rule) refuse(code);
    const length = intrinsicBufferLength(artifact.bytes, code);
    if (length > rule.maxBytes || length > LIMITS.artifactBytes) refuse(code);
    captured.push({ id: artifact.id, bytes: artifact.bytes, length, rule });
  }
  captured.sort((a, b) => compareText(a.id, b.id));
  assertSortedUnique(captured, (a, b) => compareText(a.id, b.id), code);
  for (const rule of profile.artifactRules) {
    if (rule.required && !captured.some((artifact) => artifact.id === rule.id)) refuse(code);
  }
  let minimumFrameLength = 4 + 1 + 4 + 2;
  for (const artifact of captured) {
    const increment = 2 + Buffer.byteLength(artifact.id, 'utf8') + 8 + artifact.length;
    if (!Number.isSafeInteger(increment) || minimumFrameLength > LIMITS.frameBytes - increment) refuse('REFUSED_FRAME_LIMIT');
    minimumFrameLength += increment;
  }
  return captured.map((artifact) => ({
    ...artifact,
    bytes: copyBuffer(artifact.bytes, artifact.length, code),
  }));
}

function validateClaims(claims, profile) {
  const captured = captureDataArray(claims, 'REFUSED_CLAIM', UNSUPPORTED_CLAIMS.length + 1);
  for (const claim of captured) identifier(claim, 'REFUSED_CLAIM');
  assertSortedUnique(captured, compareText, 'REFUSED_CLAIM');
  for (const claim of captured) {
    if (profile.unsupportedClaims.includes(claim)) refuse('REFUSED_UNSUPPORTED_CLAIM');
    if (!profile.supportedClaims.includes(claim)) refuse('REFUSED_CLAIM');
  }
  return captured;
}

function validateGraph(graph, rootId, artifactIds) {
  const raw = captureDataObject(graph, GRAPH_KEYS, 'REFUSED_GRAPH_CLOSURE');
  const nodes = captureDataArray(raw.nodes, 'REFUSED_GRAPH_CLOSURE', LIMITS.graphNodes);
  const edgeInputs = captureDataArray(raw.edges, 'REFUSED_GRAPH_CLOSURE', LIMITS.graphEdges);
  const edges = edgeInputs.map((edge) => captureDataObject(edge, EDGE_KEYS, 'REFUSED_GRAPH_CLOSURE'));
  const expectedRoot = rootId === undefined ? raw.root : rootId;
  if (raw.schema !== 'artifact-admission-graph.v1' || raw.root !== expectedRoot) refuse('REFUSED_GRAPH_CLOSURE');
  for (const node of nodes) identifier(node, 'REFUSED_GRAPH_CLOSURE');
  assertSortedUnique(nodes, compareText, 'REFUSED_GRAPH_CLOSURE');
  if (nodes.length !== artifactIds.length || nodes.some((node, index) => node !== artifactIds[index])) refuse('REFUSED_GRAPH_CLOSURE');
  for (const edge of edges) {
    identifier(edge.from, 'REFUSED_GRAPH_CLOSURE');
    identifier(edge.kind, 'REFUSED_GRAPH_CLOSURE');
    identifier(edge.to, 'REFUSED_GRAPH_CLOSURE');
    if (edge.kind !== 'requires' || edge.from === edge.to || !artifactIds.includes(edge.from) || !artifactIds.includes(edge.to)) refuse('REFUSED_GRAPH_CLOSURE');
  }
  assertSortedUnique(edges, compareEdge, 'REFUSED_GRAPH_CLOSURE');
  const visiting = new Set();
  const visited = new Set();
  const visit = (node) => {
    if (visiting.has(node)) refuse('REFUSED_GRAPH_CLOSURE');
    if (visited.has(node)) return;
    visiting.add(node);
    for (const edge of edges) if (edge.from === node) visit(edge.to);
    visiting.delete(node);
    visited.add(node);
  };
  visit(expectedRoot);
  if (visited.size !== artifactIds.length) refuse('REFUSED_GRAPH_CLOSURE');
  return { schema: raw.schema, root: raw.root, nodes, edges };
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

export function buildAdmissionManifest(options) {
  const capturedOptions = captureDataObject(options, BUILD_KEYS, 'REFUSED_PROFILE');
  const validatedProfile = validateProfile(capturedOptions.profile);
  const profile = validatedProfile.profile;
  const profileBytes = validatedProfile.bytes;
  const subject = validateSubject(capturedOptions.subject, profile);
  const { runId, artifacts, ownerRecord } = capturedOptions;
  digest(runId, 'REFUSED_RUN_BINDING');
  const claims = validateClaims(capturedOptions.claims, profile);
  const captured = captureArtifacts(artifacts, profile);
  const artifactIds = captured.map((artifact) => artifact.id);
  const graph = validateGraph(capturedOptions.graph, profile.rootArtifactId, artifactIds);
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
    subject,
    artifacts: rows,
    graph,
    claims,
    ownerRecord: null,
  };
  const validatedOwner = validateOwnerRecord(ownerRecord, profile.ownerPolicy, unsignedManifest, rows);
  const manifest = { ...unsignedManifest, ownerRecord: validatedOwner };
  if (canonicalArtifactAdmissionJson(manifest).length > LIMITS.manifestBytes) refuse('REFUSED_MANIFEST');
  return manifest;
}

function validateManifestForFrame(manifest) {
  const raw = captureDataObject(manifest, MANIFEST_KEYS, 'REFUSED_MANIFEST');
  if (raw.schema !== 'artifact-admission-manifest.v1' || raw.authorizing !== false) refuse('REFUSED_MANIFEST');
  identifier(raw.profileId, 'REFUSED_MANIFEST');
  digest(raw.profileDigest, 'REFUSED_MANIFEST');
  digest(raw.runId, 'REFUSED_RUN_BINDING');
  const subject = captureDataObject(raw.subject, SUBJECT_KEYS, 'REFUSED_MANIFEST');
  identifier(subject.repositoryId, 'REFUSED_MANIFEST');
  const oidLength = subject.gitObjectFormat === 'sha1' ? 40 : subject.gitObjectFormat === 'sha256' ? 64 : 0;
  if (!oidLength || !new RegExp(`^[0-9a-f]{${oidLength}}$`).test(subject.commitOid) || !new RegExp(`^[0-9a-f]{${oidLength}}$`).test(subject.treeOid)) refuse('REFUSED_MANIFEST');
  const artifactInputs = captureDataArray(raw.artifacts, 'REFUSED_ARTIFACT', LIMITS.artifacts);
  const artifacts = artifactInputs.map((row) => captureDataObject(row, ARTIFACT_ROW_KEYS, 'REFUSED_ARTIFACT'));
  for (const row of artifacts) {
    identifier(row.id, 'REFUSED_ARTIFACT');
    identifier(row.role, 'REFUSED_ARTIFACT');
    digest(row.sha256, 'REFUSED_ARTIFACT');
    digest(row.runId, 'REFUSED_RUN_BINDING');
    if (row.runId !== raw.runId) refuse('REFUSED_RUN_BINDING');
    if (typeof row.required !== 'boolean' || !Number.isSafeInteger(row.byteLength) || row.byteLength < 0 || row.byteLength > LIMITS.artifactBytes) refuse('REFUSED_ARTIFACT');
  }
  assertSortedUnique(artifacts, (a, b) => compareText(a.id, b.id), 'REFUSED_ARTIFACT');
  const graph = validateGraph(raw.graph, undefined, artifacts.map((row) => row.id));
  const claims = captureDataArray(raw.claims, 'REFUSED_CLAIM', UNSUPPORTED_CLAIMS.length + 1);
  for (const claim of claims) identifier(claim, 'REFUSED_CLAIM');
  assertSortedUnique(claims, compareText, 'REFUSED_CLAIM');
  let ownerRecord = null;
  if (raw.ownerRecord !== null) {
    ownerRecord = captureDataObject(raw.ownerRecord, OWNER_RECORD_KEYS, 'REFUSED_OWNER_RECORD');
    digest(ownerRecord.publicKeySha256, 'REFUSED_OWNER_RECORD');
    digest(ownerRecord.signedPayloadSha256, 'REFUSED_OWNER_RECORD');
    if (ownerRecord.algorithm !== 'Ed25519' || typeof ownerRecord.signature !== 'string' || !HEX128.test(ownerRecord.signature)) refuse('REFUSED_OWNER_RECORD');
    identifier(ownerRecord.keyId, 'REFUSED_OWNER_RECORD');
  }
  return { ...raw, artifacts, claims, graph, ownerRecord, subject };
}

export function encodeAdmissionFrame(options) {
  const capturedOptions = captureDataObject(options, ENCODE_KEYS, 'REFUSED_MANIFEST');
  const manifest = validateManifestForFrame(capturedOptions.manifest);
  const { artifacts } = capturedOptions;
  const manifestBytes = canonicalArtifactAdmissionJson(manifest);
  if (manifestBytes.length > LIMITS.manifestBytes) refuse('REFUSED_MANIFEST');
  let frameLength = 4 + 1 + 4 + manifestBytes.length + 2;
  for (const row of manifest.artifacts) {
    const increment = 2 + Buffer.byteLength(row.id, 'utf8') + 8 + row.byteLength;
    if (!Number.isSafeInteger(increment) || frameLength > LIMITS.frameBytes - increment) refuse('REFUSED_FRAME_LIMIT');
    frameLength += increment;
  }
  const artifactInputs = captureDataArray(artifacts, 'REFUSED_ARTIFACT', LIMITS.artifacts);
  if (artifactInputs.length !== manifest.artifacts.length) refuse('REFUSED_ARTIFACT');
  const preflight = [];
  for (const input of artifactInputs) {
    const artifact = captureDataObject(input, ARTIFACT_INPUT_KEYS, 'REFUSED_ARTIFACT');
    identifier(artifact.id, 'REFUSED_ARTIFACT');
    const length = intrinsicBufferLength(artifact.bytes, 'REFUSED_ARTIFACT');
    preflight.push({ id: artifact.id, bytes: artifact.bytes, length });
  }
  preflight.sort((a, b) => compareText(a.id, b.id));
  assertSortedUnique(preflight, (a, b) => compareText(a.id, b.id), 'REFUSED_ARTIFACT');
  for (let index = 0; index < preflight.length; index += 1) {
    const body = preflight[index];
    const row = manifest.artifacts[index];
    if (body.id !== row.id || body.length !== row.byteLength) refuse('REFUSED_ARTIFACT');
  }
  const captured = preflight.map((artifact) => ({
    id: artifact.id,
    bytes: copyBuffer(artifact.bytes, artifact.length, 'REFUSED_ARTIFACT'),
  }));
  for (let index = 0; index < captured.length; index += 1) {
    if (sha256(captured[index].bytes) !== manifest.artifacts[index].sha256) refuse('REFUSED_ARTIFACT_DIGEST');
  }
  const parts = [Buffer.from('GAAF', 'ascii'), Buffer.from([1]), u32(manifestBytes.length), manifestBytes, u16(captured.length)];
  for (const artifact of captured) {
    const id = Buffer.from(artifact.id, 'utf8');
    const length = intrinsicBufferLength(artifact.bytes, 'REFUSED_ARTIFACT');
    parts.push(u16(id.length), id, u64(length), artifact.bytes);
  }
  const frame = Buffer.concat(parts);
  if (frame.length !== frameLength) refuse('REFUSED_FRAME_LIMIT');
  return frame;
}
