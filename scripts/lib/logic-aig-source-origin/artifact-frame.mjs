import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { isProxy } from 'node:util/types';

import {
  canonicalJsonText as canonicalSourceOriginJsonText,
  parseCanonicalJsonBytes,
  serializeCompleteExportSidecarV1,
  sha256Canonical as sha256SourceOriginCanonical,
  sha256CompleteUnresolvedRowsV1,
  SOURCE_ORIGIN_LIMITS,
} from './contract.mjs';
import { exportSourceOriginProject } from './export-project.mjs';

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

const PINNED_PROFILE_LENGTH = 1131;
const PINNED_PROFILE_SHA256 = '8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e';
const PINNED_CAPACITY_BINDING_SHA256 = '46251796b3dbcd6a358848b4e537ff607ccc466fc9e74e53b5f58e7b9e94aec5';
const PINNED_ARTIFACT_BYTES = 83886080;
const PINNED_PROFILE_JSON = '{"artifactRules":[{"id":"expected-parse-outcomes","maxBytes":67108864,"required":true,"role":"expected-parse-outcomes"},{"id":"export-sidecar","maxBytes":83886080,"required":true,"role":"export-sidecar"},{"id":"parse-outcomes-receipt","maxBytes":67108864,"required":true,"role":"parse-outcomes-receipt"},{"id":"project","maxBytes":67108864,"required":true,"role":"project-graph"},{"id":"resolution-inputs","maxBytes":67108864,"required":true,"role":"resolution-inputs"},{"id":"source-manifest","maxBytes":67108864,"required":true,"role":"source-manifest"},{"id":"toolchain-manifest","maxBytes":67108864,"required":true,"role":"toolchain-manifest"}],"authorizing":false,"ownerPolicy":{"mode":"none"},"profileId":"galerina.source-origin.unsigned.v1","rootArtifactId":"export-sidecar","runBinding":"manifest-artifact-row-equality.v1","schema":"artifact-admission-profile.v1","subjectRules":{"gitObjectFormat":"sha1","repositoryId":"galerina"},"supportedClaims":["captured-bytes-only"],"unsupportedClaims":["path-identity.no-reparse","path-identity.posix-device-inode","path-identity.single-hard-link","path-identity.windows-file-id"]}';

const GENERIC_CAPACITY_POLICY = Object.freeze({
  maxArtifactBytes: LIMITS.artifactBytes,
  capacityBinding: null,
});
const PINNED_CAPACITY_POLICY = Object.freeze({
  maxArtifactBytes: PINNED_ARTIFACT_BYTES,
  capacityBinding: PINNED_CAPACITY_BINDING_SHA256,
  profileByteLength: PINNED_PROFILE_LENGTH,
  profileSha256: PINNED_PROFILE_SHA256,
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
const FROZEN_OPTIONS_KEYS = ['commitOid', 'profileBytes', 'runId'];
const EXPORT_IDS = Object.freeze([
  'expected-parse-outcomes',
  'export-sidecar',
  'parse-outcomes-receipt',
  'project',
  'resolution-inputs',
  'source-manifest',
  'toolchain-manifest',
]);
const UNSUPPORTED_CLAIMS = Object.freeze([
  'path-identity.no-reparse',
  'path-identity.posix-device-inode',
  'path-identity.single-hard-link',
  'path-identity.windows-file-id',
]);
const SELF_TEST_PROFILE = Object.freeze({
  artifactRules: Object.freeze([
    Object.freeze({ id: 'root', maxBytes: 2, required: true, role: 'root' }),
  ]),
  authorizing: false,
  ownerPolicy: Object.freeze({ mode: 'none' }),
  profileId: 'kat.none',
  rootArtifactId: 'root',
  runBinding: 'manifest-artifact-row-equality.v1',
  schema: 'artifact-admission-profile.v1',
  subjectRules: Object.freeze({ gitObjectFormat: 'sha1', repositoryId: 'fixture-repo' }),
  supportedClaims: Object.freeze(['captured-bytes-only']),
  unsupportedClaims: Object.freeze(UNSUPPORTED_CLAIMS),
});
const SELF_TEST_BODY = Buffer.from('00ff', 'hex');
const SELF_TEST_RUN_ID = '3'.repeat(64);
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;
const SPKI_PREFIX = '302a300506032b6570032100';
const TYPED_ARRAY_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'length',
).get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'byteLength',
).get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'byteOffset',
).get;
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  'buffer',
).get;
const ARRAY_BUFFER_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const ARRAY_BUFFER_RESIZABLE_GETTER = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const ARRAY_BUFFER_SLICE = ArrayBuffer.prototype.slice;
const TYPED_ARRAY_SET = Uint8Array.prototype.set;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe.bind(Buffer);
const BUFFER_ALLOC_UNSAFE_SLOW = Buffer.allocUnsafeSlow.bind(Buffer);
const BUFFER_FROM = Buffer.from.bind(Buffer);
const BUFFER_COMPARE = Buffer.compare.bind(Buffer);
const BUFFER_BYTE_LENGTH = Buffer.byteLength.bind(Buffer);
const BUFFER_EQUALS = Buffer.prototype.equals;
const UTIL_TYPES_IS_PROXY = isProxy;
const BUFFER_IS_BUFFER = Buffer.isBuffer;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_NAMES = Object.getOwnPropertyNames;
const OBJECT_GET_OWN_PROPERTY_SYMBOLS = Object.getOwnPropertySymbols;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const SELF_TEST_FAILURE = OBJECT_FREEZE(OBJECT_CREATE(null));
const ARRAY_IS_ARRAY = Array.isArray;
const JSON_PARSE = JSON.parse;
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const TEXT_DECODE = TextDecoder.prototype.decode;
const OWNED_BUFFERS = new WeakSet();
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

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
  if (value === null || typeof value !== 'object' || UTIL_TYPES_IS_PROXY(value) || Array.isArray(value)) refuse(code);
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
  if (UTIL_TYPES_IS_PROXY(value) || !Array.isArray(value)) refuse(code);
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
  if (value === null || typeof value !== 'object' || UTIL_TYPES_IS_PROXY(value) || Array.isArray(value)) refuse('REFUSED_PROFILE');
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
  if (UTIL_TYPES_IS_PROXY(value)) refuse(code);
  if (!BUFFER_IS_BUFFER(value)) refuse(code);
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
  Reflect.apply(WEAK_SET_ADD, OWNED_BUFFERS, [copy]);
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
  if (UTIL_TYPES_IS_PROXY(value)) refuse('REFUSED_CANONICAL');
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

function capacityBindingPreimage(profileByteLength, profileSha256, rootArtifactId, rule) {
  const id = BUFFER_FROM(rule.id, 'utf8');
  const role = BUFFER_FROM(rule.role, 'utf8');
  return Buffer.concat([
    BUFFER_FROM('artifact-admission-profile-capacity-exception.v1\0', 'ascii'),
    u32(profileByteLength),
    BUFFER_FROM(profileSha256, 'hex'),
    u16(id.length),
    id,
    u16(role.length),
    role,
    BUFFER_FROM([rule.required ? 1 : 0, rule.id === rootArtifactId ? 1 : 0]),
    u64(rule.maxBytes),
  ]);
}

function validateProfile(profile, capacityPolicy = GENERIC_CAPACITY_POLICY) {
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
    if (typeof rule.required !== 'boolean' || !Number.isSafeInteger(rule.maxBytes) || rule.maxBytes < 0 || rule.maxBytes > capacityPolicy.maxArtifactBytes) refuse('REFUSED_PROFILE');
  }
  assertSortedUnique(artifactRules, (a, b) => compareText(a.id, b.id), 'REFUSED_PROFILE');
  const rootRule = artifactRules.find((rule) => rule.id === raw.rootArtifactId);
  if (!rootRule || !rootRule.required) refuse('REFUSED_PROFILE');
  if (capacityPolicy.capacityBinding !== null) {
    let matchingRule;
    let matches = 0;
    for (const rule of artifactRules) {
      const preimage = capacityBindingPreimage(
        capacityPolicy.profileByteLength,
        capacityPolicy.profileSha256,
        raw.rootArtifactId,
        rule,
      );
      if (preimage.length === 127 && sha256(preimage) === capacityPolicy.capacityBinding) {
        matchingRule = rule;
        matches += 1;
      }
    }
    if (
      matches !== 1
      || matchingRule !== rootRule
      || matchingRule.id !== 'export-sidecar'
      || matchingRule.role !== 'export-sidecar'
      || matchingRule.required !== true
      || matchingRule.maxBytes !== PINNED_ARTIFACT_BYTES
      || artifactRules.some((rule) => rule !== matchingRule && rule.maxBytes > LIMITS.artifactBytes)
    ) refuse('REFUSED_PROFILE');
  }
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

function captureArtifacts(artifacts, profile, code = 'REFUSED_ARTIFACT', capacityPolicy = GENERIC_CAPACITY_POLICY) {
  const artifactInputs = captureDataArray(artifacts, code, LIMITS.artifacts);
  const rules = new Map(profile.artifactRules.map((rule) => [rule.id, rule]));
  const captured = [];
  for (const input of artifactInputs) {
    const artifact = captureDataObject(input, ARTIFACT_INPUT_KEYS, code);
    identifier(artifact.id, code);
    const rule = rules.get(artifact.id);
    if (!rule) refuse(code);
    const length = intrinsicBufferLength(artifact.bytes, code);
    if (length > rule.maxBytes || length > capacityPolicy.maxArtifactBytes) refuse(code);
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
    bytes: Reflect.apply(WEAK_SET_HAS, OWNED_BUFFERS, [artifact.bytes])
      ? artifact.bytes
      : copyBuffer(artifact.bytes, artifact.length, code),
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

function buildAdmissionManifestCore(capturedOptions, validatedProfile, capacityPolicy) {
  const { profile, bytes: profileBytes } = validatedProfile;
  const subject = validateSubject(capturedOptions.subject, profile);
  const { runId, artifacts, ownerRecord } = capturedOptions;
  digest(runId, 'REFUSED_RUN_BINDING');
  const claims = validateClaims(capturedOptions.claims, profile);
  const captured = captureArtifacts(artifacts, profile, 'REFUSED_ARTIFACT', capacityPolicy);
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

export function buildAdmissionManifest(options) {
  const capturedOptions = captureDataObject(options, BUILD_KEYS, 'REFUSED_PROFILE');
  const validatedProfile = validateProfile(capturedOptions.profile, GENERIC_CAPACITY_POLICY);
  return buildAdmissionManifestCore(capturedOptions, validatedProfile, GENERIC_CAPACITY_POLICY);
}

function artifactCapacity(capacityPolicy, id) {
  return capacityPolicy === PINNED_CAPACITY_POLICY && id === 'export-sidecar'
    ? PINNED_ARTIFACT_BYTES
    : LIMITS.artifactBytes;
}

function validateManifestForFrame(manifest, capacityPolicy) {
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
    if (
      typeof row.required !== 'boolean'
      || !Number.isSafeInteger(row.byteLength)
      || row.byteLength < 0
      || row.byteLength > artifactCapacity(capacityPolicy, row.id)
    ) refuse('REFUSED_ARTIFACT');
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

function encodeAdmissionFrameCore(options, capacityPolicy) {
  const capturedOptions = captureDataObject(options, ENCODE_KEYS, 'REFUSED_MANIFEST');
  const manifest = validateManifestForFrame(capturedOptions.manifest, capacityPolicy);
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
    bytes: Reflect.apply(WEAK_SET_HAS, OWNED_BUFFERS, [artifact.bytes])
      ? artifact.bytes
      : copyBuffer(artifact.bytes, artifact.length, 'REFUSED_ARTIFACT'),
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

export function encodeAdmissionFrame(options) {
  return encodeAdmissionFrameCore(options, GENERIC_CAPACITY_POLICY);
}

function strictBufferObservation(value, maximum, code, inspectNames = false) {
  if (UTIL_TYPES_IS_PROXY(value)) refuse(code);
  if (!BUFFER_IS_BUFFER(value)) refuse(code);
  if (OBJECT_GET_PROTOTYPE_OF(value) !== Buffer.prototype) refuse(code);
  if (inspectNames && OBJECT_GET_OWN_PROPERTY_SYMBOLS(value).length !== 0) refuse(code);
  const reservedNames = ['length', 'byteLength', 'byteOffset', 'buffer', 'parent', 'offset', 'set', 'subarray', 'then'];
  for (let index = 0; index < reservedNames.length; index += 1) {
    const name = reservedNames[index];
    if (OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, name) !== undefined) refuse(code);
  }
  let length;
  let byteLength;
  let byteOffset;
  let storage;
  let storageLength;
  try {
    length = Reflect.apply(TYPED_ARRAY_LENGTH_GETTER, value, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, value, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, value, []);
    storage = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, value, []);
    if (OBJECT_GET_PROTOTYPE_OF(storage) !== ArrayBuffer.prototype) refuse(code);
    if (OBJECT_GET_OWN_PROPERTY_NAMES(storage).length !== 0 || OBJECT_GET_OWN_PROPERTY_SYMBOLS(storage).length !== 0) refuse(code);
    storageLength = Reflect.apply(ARRAY_BUFFER_BYTE_LENGTH_GETTER, storage, []);
    if (ARRAY_BUFFER_RESIZABLE_GETTER && Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, storage, [])) refuse(code);
    Reflect.apply(ARRAY_BUFFER_SLICE, storage, [0, 0]);
  } catch (error) {
    if (error?.code === code) throw error;
    refuse(code);
  }
  if (
    !Number.isSafeInteger(length)
    || length < 0
    || length !== byteLength
    || !Number.isSafeInteger(byteOffset)
    || byteOffset < 0
    || !Number.isSafeInteger(storageLength)
    || storageLength < 0
    || byteOffset > storageLength
    || length > storageLength - byteOffset
    || length > maximum
  ) refuse(code);
  if (inspectNames) {
    const names = OBJECT_GET_OWN_PROPERTY_NAMES(value);
    if (names.length !== length) refuse(code);
    for (let index = 0; index < length; index += 1) {
      if (names[index] !== String(index)) refuse(code);
      const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, names[index]);
      if (
        !descriptor
        || !OBJECT_HAS_OWN(descriptor, 'value')
        || descriptor.enumerable !== true
        || descriptor.configurable !== true
        || descriptor.writable !== true
      ) refuse(code);
    }
  }
  return { source: value, storage, start: byteOffset, end: byteOffset + length, length };
}

function copyObservedBuffer(observation, code) {
  let copy;
  try {
    copy = BUFFER_ALLOC_UNSAFE_SLOW(observation.length);
    Reflect.apply(TYPED_ARRAY_SET, copy, [observation.source, 0]);
  } catch {
    refuse(code);
  }
  if (intrinsicBufferLength(copy, code) !== observation.length) refuse(code);
  Reflect.apply(WEAK_SET_ADD, OWNED_BUFFERS, [copy]);
  return copy;
}

function sameBytes(left, right) {
  return Reflect.apply(BUFFER_EQUALS, left, [right]);
}

function closedDataDescriptor(value, enumerable, configurable, writable) {
  const descriptor = OBJECT_CREATE(null);
  descriptor.value = value;
  descriptor.enumerable = enumerable;
  descriptor.configurable = configurable;
  descriptor.writable = writable;
  return descriptor;
}

function closedAccessorDescriptor(getter, enumerable, configurable) {
  const descriptor = OBJECT_CREATE(null);
  descriptor.get = getter;
  descriptor.enumerable = enumerable;
  descriptor.configurable = configurable;
  return descriptor;
}

function validatePinnedProfileBytes(profileBytes) {
  if (
    profileBytes.length !== PINNED_PROFILE_LENGTH
    || sha256(profileBytes) !== PINNED_PROFILE_SHA256
    || !sameBytes(profileBytes, BUFFER_FROM(PINNED_PROFILE_JSON, 'utf8'))
  ) refuse('REFUSED_PROFILE_CANONICAL');
  let profile;
  try {
    profile = parseCanonicalJsonBytes(profileBytes, { label: 'source-origin-capacity-profile' });
    const validated = validateProfile(profile, PINNED_CAPACITY_POLICY);
    if (!sameBytes(validated.bytes, profileBytes)) refuse('REFUSED_PROFILE_CANONICAL');
    return validated;
  } catch (error) {
    if (error?.code === 'REFUSED_PROFILE_CANONICAL') throw error;
    refuse('REFUSED_PROFILE_CANONICAL');
  }
}

function captureFrozenOptions(options, argumentCount) {
  const proxy = UTIL_TYPES_IS_PROXY(options);
  if (proxy || argumentCount !== 1 || options === null || typeof options !== 'object') refuse('REFUSED_OPTIONS_CAPTURE');
  if (OBJECT_GET_PROTOTYPE_OF(options) !== Object.prototype) refuse('REFUSED_OPTIONS_CAPTURE');
  if (OBJECT_GET_OWN_PROPERTY_SYMBOLS(options).length !== 0) refuse('REFUSED_OPTIONS_CAPTURE');
  const names = OBJECT_GET_OWN_PROPERTY_NAMES(options);
  if (names.length !== FROZEN_OPTIONS_KEYS.length) refuse('REFUSED_OPTIONS_CAPTURE');
  const descriptors = OBJECT_CREATE(null);
  for (let index = 0; index < FROZEN_OPTIONS_KEYS.length; index += 1) {
    const name = FROZEN_OPTIONS_KEYS[index];
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(options, name);
    if (
      !descriptor
      || !OBJECT_HAS_OWN(descriptor, 'value')
      || OBJECT_HAS_OWN(descriptor, 'get')
      || OBJECT_HAS_OWN(descriptor, 'set')
      || descriptor.enumerable !== true
    ) refuse('REFUSED_OPTIONS_CAPTURE');
    OBJECT_DEFINE_PROPERTY(descriptors, name, closedDataDescriptor(descriptor, true, false, false));
  }
  for (let index = 0; index < names.length; index += 1) {
    let known = false;
    for (let keyIndex = 0; keyIndex < FROZEN_OPTIONS_KEYS.length; keyIndex += 1) {
      if (names[index] === FROZEN_OPTIONS_KEYS[keyIndex]) {
        known = true;
        break;
      }
    }
    if (!known) refuse('REFUSED_OPTIONS_CAPTURE');
  }
  return {
    commitOid: descriptors.commitOid.value,
    profileBytes: descriptors.profileBytes.value,
    runId: descriptors.runId.value,
  };
}

function captureExporterArtifacts(records, profile) {
  const code = 'REFUSED_EXPORT_CAPTURE';
  if (UTIL_TYPES_IS_PROXY(records)) refuse(code);
  if (!ARRAY_IS_ARRAY(records) || OBJECT_GET_PROTOTYPE_OF(records) !== Array.prototype) refuse(code);
  if (OBJECT_GET_OWN_PROPERTY_SYMBOLS(records).length !== 0) refuse(code);
  const names = OBJECT_GET_OWN_PROPERTY_NAMES(records);
  const expectedNames = ['0', '1', '2', '3', '4', '5', '6', 'length', 'then'];
  if (names.length !== expectedNames.length) refuse(code);
  for (let index = 0; index < expectedNames.length; index += 1) {
    if (names[index] !== expectedNames[index]) refuse(code);
  }
  const lengthDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(records, 'length');
  const thenDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(records, 'then');
  if (
    !lengthDescriptor
    || !OBJECT_HAS_OWN(lengthDescriptor, 'value')
    || lengthDescriptor.value !== EXPORT_IDS.length
    || lengthDescriptor.enumerable !== false
    || !thenDescriptor
    || !OBJECT_HAS_OWN(thenDescriptor, 'value')
    || thenDescriptor.value !== undefined
    || thenDescriptor.enumerable !== false
    || thenDescriptor.writable !== false
    || thenDescriptor.configurable !== false
  ) refuse(code);

  const seenRecords = [];
  const pending = [];
  for (let index = 0; index < EXPORT_IDS.length; index += 1) {
    const indexDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(records, String(index));
    if (!indexDescriptor || !OBJECT_HAS_OWN(indexDescriptor, 'value') || indexDescriptor.enumerable !== true) refuse(code);
    const record = indexDescriptor.value;
    if (UTIL_TYPES_IS_PROXY(record)) refuse(code);
    if (record === null || typeof record !== 'object' || ARRAY_IS_ARRAY(record) || OBJECT_GET_PROTOTYPE_OF(record) !== Object.prototype) refuse(code);
    if (OBJECT_GET_OWN_PROPERTY_SYMBOLS(record).length !== 0) refuse(code);
    const recordNames = OBJECT_GET_OWN_PROPERTY_NAMES(record);
    let hasId = false;
    let hasBytes = false;
    for (let nameIndex = 0; nameIndex < recordNames.length; nameIndex += 1) {
      if (recordNames[nameIndex] === 'id') hasId = true;
      if (recordNames[nameIndex] === 'bytes') hasBytes = true;
    }
    if (recordNames.length !== 2 || !hasId || !hasBytes) refuse(code);
    const idDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(record, 'id');
    const bytesDescriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(record, 'bytes');
    if (
      !idDescriptor
      || !OBJECT_HAS_OWN(idDescriptor, 'value')
      || idDescriptor.enumerable !== true
      || !bytesDescriptor
      || !OBJECT_HAS_OWN(bytesDescriptor, 'value')
      || bytesDescriptor.enumerable !== true
      || typeof idDescriptor.value !== 'string'
      || idDescriptor.value !== EXPORT_IDS[index]
    ) refuse(code);
    for (let seenIndex = 0; seenIndex < seenRecords.length; seenIndex += 1) {
      if (seenRecords[seenIndex] === record) refuse(code);
    }
    seenRecords[seenRecords.length] = record;
    const rule = profile.artifactRules[index];
    if (rule.id !== idDescriptor.value) refuse(code);
    const observation = strictBufferObservation(
      bytesDescriptor.value,
      artifactCapacity(PINNED_CAPACITY_POLICY, idDescriptor.value),
      code,
      false,
    );
    pending[pending.length] = { id: idDescriptor.value, observation };
  }
  for (let left = 0; left < pending.length; left += 1) {
    for (let right = left + 1; right < pending.length; right += 1) {
      const a = pending[left].observation;
      const b = pending[right].observation;
      if (a.storage === b.storage && a.start < b.end && b.start < a.end) refuse(code);
    }
  }
  const captured = [];
  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index];
    captured[captured.length] = { id: entry.id, bytes: copyObservedBuffer(entry.observation, code) };
  }
  return captured;
}

function withoutOwnField(value, omitted) {
  const output = OBJECT_CREATE(null);
  for (const name of OBJECT_GET_OWN_PROPERTY_NAMES(value)) {
    if (name !== omitted) {
      OBJECT_DEFINE_PROPERTY(
        output,
        name,
        closedDataDescriptor(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, name).value, true, true, true),
      );
    }
  }
  return output;
}

function requireExactJsonObject(value, keys) {
  hasOnlyDataProperties(value, keys, 'REFUSED_EXPORT_SEMANTIC');
  return value;
}

function assertNoDuplicateJsonMembers(text) {
  const scopes = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        const inner = text[index];
        if (inner === '\\') index += 2;
        else {
          index += 1;
          if (inner === '"') break;
        }
      }
      let cursor = index;
      while (cursor < text.length && /\s/u.test(text[cursor])) cursor += 1;
      if (text[cursor] === ':' && scopes.length > 0) {
        let key;
        try { key = Reflect.apply(JSON_PARSE, null, [text.slice(start, index)]); } catch { refuse('REFUSED_EXPORT_SEMANTIC'); }
        const scope = scopes[scopes.length - 1];
        if (scope.has(key)) refuse('REFUSED_EXPORT_SEMANTIC');
        scope.add(key);
      }
      continue;
    }
    if (character === '{') scopes.push(new Set());
    else if (character === '}') {
      if (scopes.length === 0) refuse('REFUSED_EXPORT_SEMANTIC');
      scopes.pop();
    }
    index += 1;
  }
  if (scopes.length !== 0) refuse('REFUSED_EXPORT_SEMANTIC');
}

function parseSmallArtifact(bytes, expectedSchema) {
  let value;
  try {
    const text = Reflect.apply(TEXT_DECODE, TEXT_DECODER, [bytes]);
    if (text.length === 0 || text.charCodeAt(0) === 0xfeff) refuse('REFUSED_EXPORT_SEMANTIC');
    assertNoDuplicateJsonMembers(text);
    value = Reflect.apply(JSON_PARSE, null, [text]);
    if (canonicalSourceOriginJsonText(value) !== text) refuse('REFUSED_EXPORT_SEMANTIC');
  } catch {
    refuse('REFUSED_EXPORT_SEMANTIC');
  }
  if (value?.schema !== expectedSchema) refuse('REFUSED_EXPORT_SEMANTIC');
  return value;
}

function parseCompleteSidecar(bytes) {
  let text;
  let value;
  try {
    text = Reflect.apply(TEXT_DECODE, TEXT_DECODER, [bytes]);
    if (text.length === 0 || text.charCodeAt(0) === 0xfeff) refuse('REFUSED_EXPORT_SEMANTIC');
    value = Reflect.apply(JSON_PARSE, null, [text]);
    requireExactJsonObject(value, [
      'schema', 'repositoryId', 'expectedHead', 'expectedTree', 'gitObservation',
      'sourcePolicy', 'sourceManifestDigest', 'resolutionInputsDigest',
      'toolchainManifestDigest', 'expectedParseOutcomesDigest',
      'parseOutcomesReceiptDigest', 'generatedConsumerPolicyDigest',
      'parserPolicyDigest', 'repositoryIdentityDigest', 'graphDigest',
      'graphRawSha256', 'graphByteLength', 'embeddedReceiptDigest', 'counts',
      'unresolved', 'idMapDigest', 'toolchain', 'executionPolicy',
      'nativeGraphCrossCheck', 'discoveryCrossChecks', 'limits', 'status',
      'authorizing', 'sidecarDigest',
    ]);
    const rebuilt = serializeCompleteExportSidecarV1(withoutOwnField(value, 'sidecarDigest'));
    if (!sameBytes(rebuilt, bytes)) refuse('REFUSED_EXPORT_SEMANTIC');
  } catch (error) {
    if (error?.code === 'REFUSED_EXPORT_SEMANTIC') throw error;
    refuse('REFUSED_EXPORT_SEMANTIC');
  }
  if (value?.schema !== 'galerina.logic-aig-export-receipt.v1') refuse('REFUSED_EXPORT_SEMANTIC');
  return value;
}

function assertSourceOriginSelfDigest(value, field) {
  if (
    typeof value[field] !== 'string'
    || !SHA256.test(value[field])
    || sha256SourceOriginCanonical(value.schema, withoutOwnField(value, field)) !== value[field]
  ) refuse('REFUSED_EXPORT_SEMANTIC');
}

function sumRecordValues(record) {
  if (record === null || typeof record !== 'object' || ARRAY_IS_ARRAY(record)) refuse('REFUSED_EXPORT_SEMANTIC');
  let sum = 0;
  for (const name of OBJECT_GET_OWN_PROPERTY_NAMES(record)) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(record, name);
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, 'value') || !Number.isSafeInteger(descriptor.value) || descriptor.value < 0) refuse('REFUSED_EXPORT_SEMANTIC');
    sum += descriptor.value;
    if (!Number.isSafeInteger(sum)) refuse('REFUSED_EXPORT_SEMANTIC');
  }
  return sum;
}

function validateCapturedExportSemantics(captured, commitOid) {
  const bodyById = new Map();
  for (const artifact of captured) bodyById.set(artifact.id, artifact.bytes);
  const expected = parseSmallArtifact(bodyById.get('expected-parse-outcomes'), 'galerina.logic-aig-expected-parse-outcomes.v1');
  const outcomes = parseSmallArtifact(bodyById.get('parse-outcomes-receipt'), 'galerina.logic-aig-parse-outcomes-receipt.v1');
  const project = parseSmallArtifact(bodyById.get('project'), 'logic-aig-project.v1');
  const resolution = parseSmallArtifact(bodyById.get('resolution-inputs'), 'galerina.logic-aig-resolution-inputs.v1');
  const source = parseSmallArtifact(bodyById.get('source-manifest'), 'galerina.logic-aig-source-manifest.v1');
  if (source.objectFormat !== 'sha1' || !/^repository:[0-9a-f]{64}$/.test(source.repositoryId)) refuse('REFUSED_EXPORT_SEMANTIC');
  const toolchain = parseSmallArtifact(bodyById.get('toolchain-manifest'), 'galerina.logic-aig-toolchain-manifest.v2');
  const sidecar = parseCompleteSidecar(bodyById.get('export-sidecar'));

  requireExactJsonObject(expected, ['schema', 'parserPolicyDigest', 'rows', 'authorizing', 'expectedOutcomesDigest']);
  requireExactJsonObject(source, ['schema', 'repositoryId', 'expectedHead', 'expectedTree', 'objectFormat', 'policyDigest', 'exclusionDigest', 'rows', 'counts', 'authorizing', 'manifestDigest']);
  requireExactJsonObject(resolution, ['schema', 'repositoryId', 'expectedHead', 'expectedTree', 'policyDigest', 'rows', 'authorizing', 'resolutionInputsDigest']);
  requireExactJsonObject(outcomes, ['schema', 'repositoryId', 'expectedHead', 'expectedTree', 'expectedOutcomesDigest', 'sourceManifestDigest', 'resolutionInputsDigest', 'toolchainManifestDigest', 'rows', 'counts', 'authorizing', 'receiptDigest']);
  requireExactJsonObject(project, ['schema', 'receipt', 'nodes', 'edges']);
  requireExactJsonObject(toolchain, ['schema', 'selectedPinRecordId', 'selectedPinRecordDigest', 'pinsDigest', 'sourceObservationDigest', 'loadObservationDigest', 'platform', 'arch', 'nodeIdentity', 'gitIdentity', 'typescript', 'sourceOriginParser', 'runtimeLoadSets', 'domainSelections', 'builtinModules', 'executableModuleRows', 'dataRows', 'moduleClosureDigest', 'actualRuntimeLoadSets', 'actualLoadedModuleRows', 'actualLoadedBuiltinModules', 'actualParserExportNames', 'actualLoadedSetDigest', 'authorizing', 'toolchainManifestDigest']);
  requireExactJsonObject(project.receipt, ['schema', 'profile', 'repositoryId', 'expectedHead', 'indexedHead', 'decoder', 'graphDigest', 'coverage', 'scope', 'parentProjectDigest']);

  for (const [value, field] of [
    [expected, 'expectedOutcomesDigest'],
    [source, 'manifestDigest'],
    [resolution, 'resolutionInputsDigest'],
    [outcomes, 'receiptDigest'],
    [toolchain, 'toolchainManifestDigest'],
  ]) assertSourceOriginSelfDigest(value, field);

  const repeated = [source, resolution, outcomes, sidecar];
  if (
    source.objectFormat !== 'sha1'
    || !/^repository:[0-9a-f]{64}$/.test(source.repositoryId)
    || project.receipt.profile !== 'PROJECT'
    || toolchain.platform !== 'win32' && toolchain.platform !== 'linux'
    || toolchain.arch !== 'x64'
    || sidecar.schema !== 'galerina.logic-aig-export-receipt.v1'
    || sidecar.executionPolicy.concurrencyLimit !== 1
    || sidecar.nativeGraphCrossCheck.status !== 'UNAVAILABLE'
    || sidecar.nativeGraphCrossCheck.receiptDigest !== null
    || sidecar.nativeGraphCrossCheck.authorizing !== false
    || sidecar.discoveryCrossChecks.length !== 0
    || repeated.some((value) => value.expectedHead !== commitOid)
    || project.receipt.expectedHead !== commitOid
    || project.receipt.indexedHead !== commitOid
    || repeated.some((value) => value.expectedTree !== source.expectedTree)
    || project.receipt.repositoryId !== source.repositoryId
    || repeated.some((value) => value.repositoryId !== source.repositoryId)
    || outcomes.expectedOutcomesDigest !== expected.expectedOutcomesDigest
    || sidecar.expectedParseOutcomesDigest !== expected.expectedOutcomesDigest
    || outcomes.sourceManifestDigest !== source.manifestDigest
    || sidecar.sourceManifestDigest !== source.manifestDigest
    || outcomes.resolutionInputsDigest !== resolution.resolutionInputsDigest
    || sidecar.resolutionInputsDigest !== resolution.resolutionInputsDigest
    || outcomes.toolchainManifestDigest !== toolchain.toolchainManifestDigest
    || sidecar.toolchainManifestDigest !== toolchain.toolchainManifestDigest
    || sidecar.parseOutcomesReceiptDigest !== outcomes.receiptDigest
    || sidecar.graphRawSha256 !== sha256(bodyById.get('project'))
    || sidecar.graphByteLength !== bodyById.get('project').length
    || sidecar.embeddedReceiptDigest !== sha256(BUFFER_FROM(canonicalSourceOriginJsonText(project.receipt), 'utf8'))
    || sidecar.graphDigest !== project.receipt.graphDigest
    || project.receipt.graphDigest !== sha256(BUFFER_FROM(canonicalSourceOriginJsonText({ nodes: project.nodes, edges: project.edges }), 'utf8'))
    || sidecar.unresolved.rowCount !== sidecar.unresolved.rows.length
    || sidecar.unresolved.rowsDigest !== sha256CompleteUnresolvedRowsV1(sidecar.unresolved.rows)
    || sumRecordValues(sidecar.counts.nodesByKind) !== project.nodes.length
    || sumRecordValues(sidecar.counts.edgesByKind) !== project.edges.length
    || sumRecordValues(sidecar.counts.unresolvedByClass) !== sidecar.unresolved.rowCount
    || sumRecordValues(sidecar.counts.unresolvedByReason) !== sidecar.unresolved.rowCount
    || outcomes.counts.unresolvedRows !== outcomes.rows.length * 5
    || sidecar.status !== 'COMPLETE'
    || sidecar.authorizing !== false
    || source.authorizing !== false
    || resolution.authorizing !== false
    || outcomes.authorizing !== false
    || expected.authorizing !== false
    || toolchain.authorizing !== false
  ) refuse('REFUSED_EXPORT_SEMANTIC');

  return { expected, outcomes, project, resolution, sidecar, source, toolchain };
}

function sourceOriginGraph() {
  const edges = [];
  for (const id of EXPORT_IDS) {
    if (id !== 'export-sidecar') edges.push({ from: 'export-sidecar', kind: 'requires', to: id });
  }
  edges.sort(compareEdge);
  return {
    schema: 'artifact-admission-graph.v1',
    root: 'export-sidecar',
    nodes: [...EXPORT_IDS],
    edges,
  };
}

function selfVerifyConstructedFrame(frame, manifest, captured) {
  const expectedManifest = canonicalArtifactAdmissionJson(manifest);
  if (
    frame.length > LIMITS.frameBytes
    || frame.subarray(0, 4).toString('ascii') !== 'GAAF'
    || frame[4] !== 1
    || frame.readUInt32BE(5) !== expectedManifest.length
    || !sameBytes(frame.subarray(9, 9 + expectedManifest.length), expectedManifest)
  ) refuse('REFUSED_FRAME_ASSEMBLY');
  const rebuilt = encodeAdmissionFrameCore({ manifest, artifacts: captured }, PINNED_CAPACITY_POLICY);
  if (!sameBytes(rebuilt, frame) || sha256(rebuilt) !== sha256(frame)) refuse('REFUSED_FRAME_ASSEMBLY');
}

function buildSemanticSelfTestFixture(profile) {
  const commitOid = '1'.repeat(40);
  const treeOid = '2'.repeat(40);
  const digest = 'b'.repeat(64);
  const repositoryIdentityDigest = 'a'.repeat(64);
  const repositoryId = `repository:${repositoryIdentityDigest}`;
  const classes = ['CALLER', 'CONTRACT', 'GENERATED_CONSUMER', 'IMPORT', 'TEST'];
  const reasonCodes = [
    'AMBIGUOUS_TARGET', 'DYNAMIC_TARGET', 'MISSING_TARGET',
    'OWNER_DISPOSITION_CALLER_UNRESOLVED', 'OWNER_DISPOSITION_CONTRACT_UNRESOLVED',
    'OWNER_DISPOSITION_GENERATED_CONSUMER_UNRESOLVED', 'OWNER_DISPOSITION_IMPORT_UNRESOLVED',
    'OWNER_DISPOSITION_TEST_UNRESOLVED', 'TARGET_OUTSIDE_SOURCE_DOMAIN',
  ];
  const zeroMap = (keys) => {
    const value = OBJECT_CREATE(null);
    for (let index = 0; index < keys.length; index += 1) value[keys[index]] = 0;
    return value;
  };
  const selfDigest = (value, field) => sha256SourceOriginCanonical(value.schema, withoutOwnField(value, field));
  const executableIdentity = {
    version: 'v', executableRawSha256: digest, executableByteLength: 1,
  };
  const typescript = {
    name: 'typescript', version: 'v', packageLocator: 'x/package.json', packageRawSha256: digest,
    packageByteLength: 1, entryLocator: 'x/lib/typescript.js', entryRawSha256: digest, entryByteLength: 1,
  };
  const sourceEdgeRows = [
    { fromLocator: 'src/gate-v3-parser.ts', kind: 'IMPORT_TYPE', exportName: null, specifier: './parser.js', toLocator: 'src/parser.ts' },
    { fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'src/lexer.ts' },
    { fromLocator: 'src/parser.ts', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'src/requirement-diagnostics.ts' },
    { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'src/lexer.ts' },
    { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'src/gate-v3-parser.ts' },
    { fromLocator: 'src/source-origin-parser-entry.ts', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'src/parser.ts' },
  ];
  const emittedEdgeRows = [
    { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './lexer.js', toLocator: 'lexer.js' },
    { fromLocator: 'parser.js', kind: 'IMPORT', exportName: null, specifier: './requirement-diagnostics.js', toLocator: 'requirement-diagnostics.js' },
    { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'lex', specifier: './lexer.js', toLocator: 'lexer.js' },
    { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseGateV3', specifier: './gate-v3-parser.js', toLocator: 'gate-v3-parser.js' },
    { fromLocator: 'source-origin-parser-entry.js', kind: 'EXPORT_FROM', exportName: 'parseProgram', specifier: './parser.js', toLocator: 'parser.js' },
  ];
  const sourceOriginParser = {
    sourceEntry: {
      rootLocator: 'packages-ts/galerina-core-compiler', locator: 'src/source-origin-parser-entry.ts',
      gitBlobOid: commitOid, rawSha256: digest, byteLength: 1, exportNames: ['lex', 'parseGateV3', 'parseProgram'],
    },
    project: {
      rootLocator: 'packages-ts/galerina-core-compiler', locator: 'tsconfig.source-origin-parser.json',
      gitBlobOid: commitOid, rawSha256: digest, byteLength: 1, extendsLocator: './tsconfig.json',
      files: ['src/source-origin-parser-entry.ts'], include: [],
      compilerOptions: { types: [], noEmitOnError: true, incremental: false, composite: false, sourceMap: false, declarationMap: false },
    },
    generatedEntry: { rootLocator: 'generated-source-origin-parser', locator: 'source-origin-parser-entry.js', rawSha256: digest, byteLength: 1 },
    generatedPackageManifest: { rootLocator: 'generated-source-origin-parser', locator: 'package.json', rawSha256: sha256(BUFFER_FROM('{"type":"module"}', 'utf8')), byteLength: 17 },
    exportNames: ['lex', 'parseGateV3', 'parseProgram'], sourceEdgeRows, emittedEdgeRows, generatedClosureDigest: digest,
  };
  const toolchain = {
    schema: 'galerina.logic-aig-toolchain-manifest.v2', selectedPinRecordId: 'fixture', selectedPinRecordDigest: digest,
    pinsDigest: digest, sourceObservationDigest: digest, loadObservationDigest: digest,
    platform: 'win32', arch: 'x64', nodeIdentity: executableIdentity,
    gitIdentity: { ...executableIdentity, version: '1' }, typescript, sourceOriginParser,
    runtimeLoadSets: [], domainSelections: [], builtinModules: [], executableModuleRows: [], dataRows: [],
    moduleClosureDigest: digest, actualRuntimeLoadSets: [], actualLoadedModuleRows: [], actualLoadedBuiltinModules: [],
    actualParserExportNames: [], actualLoadedSetDigest: digest, authorizing: false,
  };
  toolchain.toolchainManifestDigest = selfDigest(toolchain, 'toolchainManifestDigest');
  const expected = {
    schema: 'galerina.logic-aig-expected-parse-outcomes.v1', parserPolicyDigest: digest,
    rows: [], authorizing: false,
  };
  expected.expectedOutcomesDigest = selfDigest(expected, 'expectedOutcomesDigest');
  const source = {
    schema: 'galerina.logic-aig-source-manifest.v1', repositoryId, expectedHead: commitOid, expectedTree: treeOid,
    objectFormat: 'sha1', policyDigest: digest, exclusionDigest: digest, rows: [],
    counts: { paths: 0, blobs: 0, bytes: 0, mode100644: 0, mode100755: 0, exclusions: 0 }, authorizing: false,
  };
  source.manifestDigest = selfDigest(source, 'manifestDigest');
  const resolution = {
    schema: 'galerina.logic-aig-resolution-inputs.v1', repositoryId, expectedHead: commitOid, expectedTree: treeOid,
    policyDigest: digest, rows: [], authorizing: false,
  };
  resolution.resolutionInputsDigest = selfDigest(resolution, 'resolutionInputsDigest');
  const outcomes = {
    schema: 'galerina.logic-aig-parse-outcomes-receipt.v1', repositoryId, expectedHead: commitOid, expectedTree: treeOid,
    expectedOutcomesDigest: expected.expectedOutcomesDigest, sourceManifestDigest: source.manifestDigest,
    resolutionInputsDigest: resolution.resolutionInputsDigest, toolchainManifestDigest: toolchain.toolchainManifestDigest,
    rows: [], counts: { outcomeRows: 0, expectedRefusalRows: 0, opaqueProposedRows: 0, representedFileNodes: 0, unresolvedRows: 0, ownerBindings: 0 }, authorizing: false,
  };
  outcomes.receiptDigest = selfDigest(outcomes, 'receiptDigest');
  const receipt = {
    schema: 'logic-aig-project-receipt.v1', profile: 'PROJECT', repositoryId, expectedHead: commitOid, indexedHead: commitOid,
    decoder: { id: 'fixture', version: 'v', available: true },
    graphDigest: sha256(BUFFER_FROM(canonicalSourceOriginJsonText({ nodes: [], edges: [] }), 'utf8')),
    coverage: { algorithm: 'project-closure.v1', limits: { maxNodes: 1, maxEdges: 1 }, nodeCount: 0, edgeCount: 0, complete: true },
    scope: { dirtyInventoryDigest: null, locators: [], closureKinds: [], closureComplete: true }, parentProjectDigest: null,
  };
  const project = { schema: 'logic-aig-project.v1', receipt, nodes: [], edges: [] };
  const projectBytes = BUFFER_FROM(canonicalSourceOriginJsonText(project), 'utf8');
  const sidecarBody = {
    schema: 'galerina.logic-aig-export-receipt.v1', repositoryId, expectedHead: commitOid, expectedTree: treeOid,
    gitObservation: {
      before: { head: commitOid, tree: treeOid, indexDigest: digest, gitVersion: 'git version 1', gitExecutableRawSha256: digest, gitExecutableByteLength: 1 },
      after: { head: commitOid, tree: treeOid, indexDigest: digest, gitVersion: 'git version 1', gitExecutableRawSha256: digest, gitExecutableByteLength: 1 },
      objectFormat: 'sha1', indexDigest: digest, executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    },
    sourcePolicy: { policyDigest: digest, exclusionDigest: digest, excludedPaths: 0, excludedBytes: 0 },
    sourceManifestDigest: source.manifestDigest, resolutionInputsDigest: resolution.resolutionInputsDigest,
    toolchainManifestDigest: toolchain.toolchainManifestDigest, expectedParseOutcomesDigest: expected.expectedOutcomesDigest,
    parseOutcomesReceiptDigest: outcomes.receiptDigest, generatedConsumerPolicyDigest: digest, parserPolicyDigest: digest,
    repositoryIdentityDigest, graphDigest: receipt.graphDigest, graphRawSha256: sha256(projectBytes), graphByteLength: projectBytes.length,
    embeddedReceiptDigest: sha256(BUFFER_FROM(canonicalSourceOriginJsonText(receipt), 'utf8')),
    counts: {
      sourcePaths: 0, sourceBlobs: 0, sourceBytes: 0, resolutionRows: 0, resolutionBytes: 0, parseOutcomeRows: 0,
      ownerBindings: 0, representedFileNodes: 0, nodesByKind: zeroMap(['CLASS', 'FILE', 'FLOW', 'FUNCTION', 'GATE', 'INTERFACE', 'METHOD', 'MODULE', 'ROUTE', 'SYMBOL', 'TYPE']),
      edgesByKind: zeroMap(classes), unresolvedByClass: zeroMap(classes), unresolvedByReason: zeroMap(reasonCodes),
      duplicateIds: 0, caseShadows: 0, idMapRows: 0,
    },
    unresolved: { rows: [], rowCount: 0, rowsDigest: sha256CompleteUnresolvedRowsV1([]) },
    idMapDigest: digest,
    toolchain: {
      selectedPinRecordId: toolchain.selectedPinRecordId, selectedPinRecordDigest: toolchain.selectedPinRecordDigest,
      pinsDigest: toolchain.pinsDigest, toolchainManifestDigest: toolchain.toolchainManifestDigest,
      nodeIdentity: toolchain.nodeIdentity, gitIdentity: toolchain.gitIdentity, typescript: toolchain.typescript,
      sourceOriginParser: toolchain.sourceOriginParser, moduleClosureDigest: toolchain.moduleClosureDigest,
      actualLoadedSetDigest: toolchain.actualLoadedSetDigest,
    },
    executionPolicy: { argvPolicyDigest: digest, environmentPolicyDigest: digest, timeoutMillis: SOURCE_ORIGIN_LIMITS.processMillis, outputByteLimit: SOURCE_ORIGIN_LIMITS.processOutputBytes, concurrencyLimit: 1 },
    nativeGraphCrossCheck: { status: 'UNAVAILABLE', receiptDigest: null, authorizing: false }, discoveryCrossChecks: [],
    limits: SOURCE_ORIGIN_LIMITS, status: 'COMPLETE', authorizing: false,
  };
  const sidecarBytes = serializeCompleteExportSidecarV1(sidecarBody);
  const bodies = { expected, source, resolution, outcomes, project, toolchain };
  const recordsFor = (values, sidecar = sidecarBytes) => {
    const bodyById = {
      'expected-parse-outcomes': values.expected,
      'parse-outcomes-receipt': values.outcomes,
      project: values.project,
      'resolution-inputs': values.resolution,
      'source-manifest': values.source,
      'toolchain-manifest': values.toolchain,
    };
    const records = EXPORT_IDS.map((id) => ({ id, bytes: id === 'export-sidecar' ? sidecar : BUFFER_FROM(canonicalSourceOriginJsonText(bodyById[id]), 'utf8') }));
    OBJECT_DEFINE_PROPERTY(records, 'then', closedDataDescriptor(undefined, false, false, false));
    return captureExporterArtifacts(records, profile);
  };
  return { bodies, sidecarBody, sidecarBytes, recordsFor };
}

export function runFrozenGitAdmissionFrameSelfTest() {
  if (arguments.length !== 0) throw SELF_TEST_FAILURE;
  try {
    Reflect.apply(WEAK_SET_ADD, OWNED_BUFFERS, [SELF_TEST_BODY]);
    const validatedProfile = validateProfile(SELF_TEST_PROFILE, GENERIC_CAPACITY_POLICY);
    const artifacts = [{ id: 'root', bytes: SELF_TEST_BODY }];
    const manifest = buildAdmissionManifestCore({
      profile: SELF_TEST_PROFILE,
      subject: {
        repositoryId: 'fixture-repo',
        gitObjectFormat: 'sha1',
        commitOid: '1'.repeat(40),
        treeOid: '2'.repeat(40),
      },
      runId: SELF_TEST_RUN_ID,
      artifacts,
      graph: { schema: 'artifact-admission-graph.v1', root: 'root', nodes: ['root'], edges: [] },
      claims: ['captured-bytes-only'],
      ownerRecord: null,
    }, validatedProfile, GENERIC_CAPACITY_POLICY);
    const frame = encodeAdmissionFrameCore({ manifest, artifacts }, GENERIC_CAPACITY_POLICY);
    if (
      canonicalArtifactAdmissionJson(manifest).length !== 786
      || frame.length !== 813
      || sha256(frame) !== 'acabbc82905fa66697645fbdd2dfb5715a24c45e8a16ba8f5573e55ca5fb2a4b'
    ) throw new Error();
    const hostile = new Proxy({}, {
      get() { throw new Error(); },
      getOwnPropertyDescriptor() { throw new Error(); },
      getPrototypeOf() { throw new Error(); },
      ownKeys() { throw new Error(); },
    });
    let hostileCode;
    try { validateProfile(hostile, GENERIC_CAPACITY_POLICY); } catch (error) { hostileCode = error?.code; }
    if (hostileCode !== 'REFUSED_PROFILE') throw new Error();
    const capacityRows = {
      unresolvedRows: 74_270_556,
      exportSidecar: 74_279_137,
      payloads: 110_300_409,
      frameWithoutManifest: 110_300_606,
      headroomBeforeManifest: 23_917_122,
    };
    const frameEnvelopeWithoutManifest = 4 + 1 + 4 + 2
      + EXPORT_IDS.reduce((sum, id) => sum + 2 + Buffer.byteLength(id) + 8, 0);
    if (
      capacityRows.exportSidecar - capacityRows.unresolvedRows !== 8_581
      || capacityRows.payloads + frameEnvelopeWithoutManifest !== capacityRows.frameWithoutManifest
      || 134_217_728 - capacityRows.frameWithoutManifest !== capacityRows.headroomBeforeManifest
      || capacityRows.headroomBeforeManifest < 1_048_576
    ) throw new Error();
    const body = BUFFER_FROM(SELF_TEST_BODY);
    let accessorCalls = 0;
    const expando = Symbol('unreserved');
    const nonEnumerableExpando = Symbol('non-enumerable-unreserved');
    OBJECT_DEFINE_PROPERTY(body, 'unreserved', closedAccessorDescriptor(() => {
      accessorCalls += 1;
      return 'ignored';
    }, true, true));
    OBJECT_DEFINE_PROPERTY(body, expando, closedDataDescriptor('ignored', true, false, false));
    OBJECT_DEFINE_PROPERTY(body, 'nonEnumerableUnreserved', closedDataDescriptor('ignored', false, false, false));
    OBJECT_DEFINE_PROPERTY(body, nonEnumerableExpando, closedAccessorDescriptor(() => {
      accessorCalls += 1;
      return 'ignored';
    }, false, true));
    const bodyObservation = strictBufferObservation(body, SELF_TEST_BODY.length, 'REFUSED_EXPORT_CAPTURE', false);
    const bodyCopy = copyObservedBuffer(bodyObservation, 'REFUSED_EXPORT_CAPTURE');
    if (accessorCalls !== 0 || !sameBytes(bodyCopy, SELF_TEST_BODY)) throw new Error();
    body[0] ^= 0xff;
    if (!sameBytes(bodyCopy, SELF_TEST_BODY)) throw new Error();

    const pinnedValidation = validatePinnedProfileBytes(BUFFER_FROM(PINNED_PROFILE_JSON, 'utf8'));
    const makeRecords = (buffers) => {
      const records = buffers.map((bytes, index) => ({ id: EXPORT_IDS[index], bytes }));
      OBJECT_DEFINE_PROPERTY(records, 'then', closedDataDescriptor(undefined, false, false, false));
      return records;
    };
    const cleanRecords = makeRecords(EXPORT_IDS.map(() => BUFFER_FROM([0])));
    const cleanCaptured = captureExporterArtifacts(cleanRecords, pinnedValidation.profile);
    if (cleanCaptured.length !== EXPORT_IDS.length) throw new Error();
    const sevenManifest = buildAdmissionManifestCore({
      profile: pinnedValidation.profile,
      subject: {
        repositoryId: 'galerina',
        gitObjectFormat: 'sha1',
        commitOid: '1'.repeat(40),
        treeOid: '2'.repeat(40),
      },
      runId: SELF_TEST_RUN_ID,
      artifacts: cleanCaptured,
      graph: {
        schema: 'artifact-admission-graph.v1',
        root: 'export-sidecar',
        nodes: [...EXPORT_IDS],
        edges: EXPORT_IDS.filter((id) => id !== 'export-sidecar')
          .map((id) => ({ from: 'export-sidecar', kind: 'requires', to: id })),
      },
      claims: ['captured-bytes-only'],
      ownerRecord: null,
    }, pinnedValidation, PINNED_CAPACITY_POLICY);
    const sevenFrame = encodeAdmissionFrameCore(
      { manifest: sevenManifest, artifacts: cleanCaptured },
      PINNED_CAPACITY_POLICY,
    );
    selfVerifyConstructedFrame(sevenFrame, sevenManifest, cleanCaptured);
    const semanticFixture = buildSemanticSelfTestFixture(pinnedValidation.profile);
    const semanticBaseline = semanticFixture.recordsFor(semanticFixture.bodies);
    validateCapturedExportSemantics(semanticBaseline, '1'.repeat(40));
    const rebindSource = (values, sidecar) => {
      values.source.manifestDigest = sha256SourceOriginCanonical(values.source.schema, withoutOwnField(values.source, 'manifestDigest'));
      values.outcomes.sourceManifestDigest = values.source.manifestDigest;
      values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
      sidecar.sourceManifestDigest = values.source.manifestDigest;
      sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
    };
    const rebindResolution = (values, sidecar) => {
      values.resolution.resolutionInputsDigest = sha256SourceOriginCanonical(values.resolution.schema, withoutOwnField(values.resolution, 'resolutionInputsDigest'));
      values.outcomes.resolutionInputsDigest = values.resolution.resolutionInputsDigest;
      values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
      sidecar.resolutionInputsDigest = values.resolution.resolutionInputsDigest;
      sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
    };
    const rebindOutcomes = (values, sidecar) => {
      values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
      sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
    };
    const rebindExpected = (values, sidecar) => {
      values.expected.expectedOutcomesDigest = sha256SourceOriginCanonical(values.expected.schema, withoutOwnField(values.expected, 'expectedOutcomesDigest'));
      values.outcomes.expectedOutcomesDigest = values.expected.expectedOutcomesDigest;
      rebindOutcomes(values, sidecar);
      sidecar.expectedParseOutcomesDigest = values.expected.expectedOutcomesDigest;
    };
    const rebindSidecar = (sidecar) => {
      const body = { ...sidecar };
      delete body.sidecarDigest;
      const bodyText = canonicalSourceOriginJsonText(body);
      sidecar.sidecarDigest = sha256(Buffer.concat([
        BUFFER_FROM('galerina.logic-aig-export-receipt.v1', 'utf8'),
        BUFFER_FROM([0]),
        BUFFER_FROM(bodyText, 'utf8'),
      ]));
    };
    const rebindProject = (values, sidecar) => {
      const projectBytes = BUFFER_FROM(canonicalSourceOriginJsonText(values.project), 'utf8');
      sidecar.graphRawSha256 = sha256(projectBytes);
      sidecar.graphByteLength = projectBytes.length;
      sidecar.embeddedReceiptDigest = sha256(BUFFER_FROM(canonicalSourceOriginJsonText(values.project.receipt), 'utf8'));
    };
    const rebindToolchain = (values, sidecar) => {
      values.toolchain.toolchainManifestDigest = sha256SourceOriginCanonical(values.toolchain.schema, withoutOwnField(values.toolchain, 'toolchainManifestDigest'));
      values.outcomes.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
      values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
      sidecar.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
      sidecar.toolchain.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
      sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
    };
    const semanticNegativeCases = [
      (values, sidecar) => {
        values.expected.schema = 'invalid-schema';
        values.expected.expectedOutcomesDigest = sha256SourceOriginCanonical(values.expected.schema, withoutOwnField(values.expected, 'expectedOutcomesDigest'));
        values.outcomes.expectedOutcomesDigest = values.expected.expectedOutcomesDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.expectedParseOutcomesDigest = values.expected.expectedOutcomesDigest;
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => { values.source.schema = 'invalid-schema'; rebindSource(values, sidecar); },
      (values, sidecar) => { values.resolution.schema = 'invalid-schema'; rebindResolution(values, sidecar); },
      (values, sidecar) => { values.outcomes.schema = 'invalid-schema'; rebindOutcomes(values, sidecar); },
      (values, sidecar) => { values.project.schema = 'invalid-schema'; rebindProject(values, sidecar); },
      (values, sidecar) => { values.toolchain.schema = 'invalid-schema'; rebindToolchain(values, sidecar); },
      (values, sidecar) => {
        values.source.objectFormat = 'sha256';
        values.source.manifestDigest = sha256SourceOriginCanonical(values.source.schema, withoutOwnField(values.source, 'manifestDigest'));
        values.outcomes.sourceManifestDigest = values.source.manifestDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.sourceManifestDigest = values.source.manifestDigest;
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => {
        values.toolchain.platform = 'darwin';
        values.toolchain.toolchainManifestDigest = sha256SourceOriginCanonical(values.toolchain.schema, withoutOwnField(values.toolchain, 'toolchainManifestDigest'));
        values.outcomes.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
        sidecar.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
        sidecar.toolchain.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
      },
      (values, sidecar) => {
        values.expected.expectedOutcomesDigest = '0'.repeat(64);
        values.outcomes.expectedOutcomesDigest = values.expected.expectedOutcomesDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.expectedParseOutcomesDigest = values.expected.expectedOutcomesDigest;
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => {
        values.outcomes.sourceManifestDigest = '0'.repeat(64);
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => { values.project.receipt.profile = 'WRONG'; rebindProject(values, sidecar); },
      (values, sidecar) => { values.toolchain.arch = 'arm64'; rebindToolchain(values, sidecar); },
      (values, sidecar) => { values.resolution.repositoryId = `repository:${'c'.repeat(64)}`; rebindResolution(values, sidecar); },
      (values, sidecar) => { values.resolution.expectedHead = '3'.repeat(40); rebindResolution(values, sidecar); },
      (values, sidecar) => { values.resolution.expectedTree = '3'.repeat(40); rebindResolution(values, sidecar); },
      (values, sidecar) => { values.source.authorizing = true; rebindSource(values, sidecar); },
      (values, sidecar) => { sidecar.graphRawSha256 = 'c'.repeat(64); },
      (values, sidecar) => { sidecar.graphByteLength += 1; },
      (values, sidecar) => { sidecar.embeddedReceiptDigest = 'c'.repeat(64); },
      (values, sidecar) => { sidecar.graphDigest = 'c'.repeat(64); },
      (values, sidecar) => {
        values.project.receipt.graphDigest = 'c'.repeat(64);
        sidecar.graphDigest = values.project.receipt.graphDigest;
        const projectBytes = BUFFER_FROM(canonicalSourceOriginJsonText(values.project), 'utf8');
        sidecar.graphRawSha256 = sha256(projectBytes);
        sidecar.graphByteLength = projectBytes.length;
        sidecar.embeddedReceiptDigest = sha256(BUFFER_FROM(canonicalSourceOriginJsonText(values.project.receipt), 'utf8'));
      },
      (values, sidecar) => { sidecar.counts.nodesByKind.CLASS = 1; sidecar.counts.idMapRows = 1; },
      (values, sidecar) => { sidecar.counts.edgesByKind.CALLER = 1; },
      (values, sidecar) => {
        values.outcomes.counts.unresolvedRows = 1;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => { values.expected.extra = null; rebindExpected(values, sidecar); },
      (values, sidecar) => { values.source.extra = null; rebindSource(values, sidecar); },
      (values, sidecar) => { values.resolution.extra = null; rebindResolution(values, sidecar); },
      (values, sidecar) => { values.outcomes.extra = null; rebindOutcomes(values, sidecar); },
      (values, sidecar) => { values.project.extra = null; rebindProject(values, sidecar); },
      (values, sidecar) => { values.project.receipt.extra = null; rebindProject(values, sidecar); },
      (values, sidecar) => { values.toolchain.extra = null; rebindToolchain(values, sidecar); },
      (values, sidecar) => {
        values.source.manifestDigest = '0'.repeat(64);
        values.outcomes.sourceManifestDigest = values.source.manifestDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.sourceManifestDigest = values.source.manifestDigest;
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => {
        values.resolution.resolutionInputsDigest = '0'.repeat(64);
        values.outcomes.resolutionInputsDigest = values.resolution.resolutionInputsDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.resolutionInputsDigest = values.resolution.resolutionInputsDigest;
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => {
        values.outcomes.receiptDigest = '0'.repeat(64);
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => {
        values.toolchain.toolchainManifestDigest = '0'.repeat(64);
        values.outcomes.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
        values.outcomes.receiptDigest = sha256SourceOriginCanonical(values.outcomes.schema, withoutOwnField(values.outcomes, 'receiptDigest'));
        sidecar.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
        sidecar.toolchain.toolchainManifestDigest = values.toolchain.toolchainManifestDigest;
        sidecar.parseOutcomesReceiptDigest = values.outcomes.receiptDigest;
      },
      (values, sidecar) => { values.project.receipt.expectedHead = '3'.repeat(40); rebindProject(values, sidecar); },
      (values, sidecar) => { values.project.receipt.indexedHead = '3'.repeat(40); rebindProject(values, sidecar); },
      (values, sidecar) => { values.project.receipt.repositoryId = `repository:${'c'.repeat(64)}`; rebindProject(values, sidecar); },
      (values, sidecar) => { values.outcomes.expectedOutcomesDigest = '0'.repeat(64); rebindOutcomes(values, sidecar); },
      (values, sidecar) => { values.outcomes.resolutionInputsDigest = '0'.repeat(64); rebindOutcomes(values, sidecar); },
      (values, sidecar) => { values.outcomes.toolchainManifestDigest = '0'.repeat(64); rebindOutcomes(values, sidecar); },
      (values, sidecar) => { values.resolution.authorizing = true; rebindResolution(values, sidecar); },
      (values, sidecar) => { values.outcomes.authorizing = true; rebindOutcomes(values, sidecar); },
      (values, sidecar) => { values.expected.authorizing = true; rebindExpected(values, sidecar); },
      (values, sidecar) => { values.toolchain.authorizing = true; rebindToolchain(values, sidecar); },
    ];
    for (let index = 0; index < semanticNegativeCases.length; index += 1) {
      const values = JSON.parse(JSON.stringify(semanticFixture.bodies));
      const sidecar = JSON.parse(JSON.stringify(semanticFixture.sidecarBody));
      semanticNegativeCases[index](values, sidecar);
      let semanticNegativeCode;
      try {
        validateCapturedExportSemantics(
          semanticFixture.recordsFor(values, serializeCompleteExportSidecarV1(sidecar)),
          '1'.repeat(40),
        );
      } catch (error) {
        semanticNegativeCode = error?.code;
      }
      if (semanticNegativeCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    }
    const semanticRawNegativeCases = [
      (values, sidecar) => {
        const repositoryId = 'not-a-repository-id';
        values.source.repositoryId = repositoryId;
        values.resolution.repositoryId = repositoryId;
        values.outcomes.repositoryId = repositoryId;
        values.project.receipt.repositoryId = repositoryId;
        sidecar.repositoryId = repositoryId;
        rebindSource(values, sidecar);
        rebindResolution(values, sidecar);
        rebindProject(values, sidecar);
        rebindSidecar(sidecar);
      },
    ];
    for (let index = 0; index < semanticRawNegativeCases.length; index += 1) {
      const values = JSON.parse(JSON.stringify(semanticFixture.bodies));
      const sidecar = JSON.parse(semanticFixture.sidecarBytes.toString('utf8'));
      semanticRawNegativeCases[index](values, sidecar);
      rebindSidecar(sidecar);
      let semanticRawNegativeCode;
      try {
        validateCapturedExportSemantics(
          semanticFixture.recordsFor(values, BUFFER_FROM(canonicalSourceOriginJsonText(sidecar), 'utf8')),
          '1'.repeat(40),
        );
      } catch (error) {
        semanticRawNegativeCode = error?.code;
      }
      if (semanticRawNegativeCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    }
    const directSidecarNegativeCases = [
      (sidecar) => { sidecar.schema = 'invalid-schema'; },
      (sidecar) => { sidecar.executionPolicy.concurrencyLimit = 2; },
      (sidecar) => { sidecar.nativeGraphCrossCheck.status = 'PASS'; },
      (sidecar) => { sidecar.nativeGraphCrossCheck.receiptDigest = '0'.repeat(64); },
      (sidecar) => { sidecar.nativeGraphCrossCheck.authorizing = true; },
      (sidecar) => { sidecar.discoveryCrossChecks = [{}]; },
      (sidecar) => { sidecar.expectedParseOutcomesDigest = '0'.repeat(64); },
      (sidecar) => { sidecar.sourceManifestDigest = '0'.repeat(64); },
      (sidecar) => { sidecar.resolutionInputsDigest = '0'.repeat(64); },
      (sidecar) => { sidecar.toolchainManifestDigest = '0'.repeat(64); },
      (sidecar) => { sidecar.parseOutcomesReceiptDigest = '0'.repeat(64); },
      (sidecar) => {
        sidecar.unresolved.rowCount = 1;
        sidecar.counts.unresolvedByClass.CALLER = 1;
        sidecar.counts.unresolvedByReason.AMBIGUOUS_TARGET = 1;
      },
      (sidecar) => { sidecar.unresolved.rowsDigest = '0'.repeat(64); },
      (sidecar) => { sidecar.counts.unresolvedByClass.CALLER = 1; },
      (sidecar) => { sidecar.counts.unresolvedByReason.AMBIGUOUS_TARGET = 1; },
      (sidecar) => { sidecar.status = 'PARTIAL'; },
      (sidecar) => { sidecar.authorizing = true; },
      (sidecar) => { sidecar.extra = null; },
    ];
    for (let index = 0; index < directSidecarNegativeCases.length; index += 1) {
      const values = JSON.parse(JSON.stringify(semanticFixture.bodies));
      const sidecar = JSON.parse(semanticFixture.sidecarBytes.toString('utf8'));
      directSidecarNegativeCases[index](sidecar);
      rebindSidecar(sidecar);
      let directSidecarNegativeCode;
      try {
        validateCapturedExportSemantics(
          semanticFixture.recordsFor(values, BUFFER_FROM(canonicalSourceOriginJsonText(sidecar), 'utf8')),
          '1'.repeat(40),
        );
      } catch (error) {
        directSidecarNegativeCode = error?.code;
      }
      if (directSidecarNegativeCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    }
    const directSidecarSelfDigest = JSON.parse(semanticFixture.sidecarBytes.toString('utf8'));
    directSidecarSelfDigest.sidecarDigest = '0'.repeat(64);
    let directSidecarSelfDigestCode;
    try {
      validateCapturedExportSemantics(
        semanticFixture.recordsFor(semanticFixture.bodies, BUFFER_FROM(canonicalSourceOriginJsonText(directSidecarSelfDigest), 'utf8')),
        '1'.repeat(40),
      );
    } catch (error) {
      directSidecarSelfDigestCode = error?.code;
    }
    if (directSidecarSelfDigestCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    const nonCanonicalSidecarRecords = semanticFixture.recordsFor(
      semanticFixture.bodies,
      Buffer.concat([semanticFixture.sidecarBytes, BUFFER_FROM('\n', 'utf8')]),
    );
    let nonCanonicalSidecarCode;
    try { validateCapturedExportSemantics(nonCanonicalSidecarRecords, '1'.repeat(40)); } catch (error) { nonCanonicalSidecarCode = error?.code; }
    if (nonCanonicalSidecarCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    const nonCanonicalRecords = semanticFixture.recordsFor(semanticFixture.bodies);
    const expectedRecord = nonCanonicalRecords.find((record) => record.id === 'expected-parse-outcomes');
    expectedRecord.bytes = BUFFER_FROM(`${expectedRecord.bytes.toString('utf8')}\n`, 'utf8');
    let nonCanonicalCode;
    try { validateCapturedExportSemantics(nonCanonicalRecords, '1'.repeat(40)); } catch (error) { nonCanonicalCode = error?.code; }
    if (nonCanonicalCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    const projectNonCanonicalValues = JSON.parse(JSON.stringify(semanticFixture.bodies));
    const projectNonCanonicalSidecar = JSON.parse(semanticFixture.sidecarBytes.toString('utf8'));
    const projectNonCanonicalRecords = semanticFixture.recordsFor(projectNonCanonicalValues, semanticFixture.sidecarBytes);
    const projectRecord = projectNonCanonicalRecords.find((record) => record.id === 'project');
    projectRecord.bytes = BUFFER_FROM(`${projectRecord.bytes.toString('utf8')}\n`, 'utf8');
    projectNonCanonicalSidecar.graphRawSha256 = sha256(projectRecord.bytes);
    projectNonCanonicalSidecar.graphByteLength = projectRecord.bytes.length;
    rebindSidecar(projectNonCanonicalSidecar);
    projectNonCanonicalRecords.find((record) => record.id === 'export-sidecar').bytes = BUFFER_FROM(
      canonicalSourceOriginJsonText(projectNonCanonicalSidecar),
      'utf8',
    );
    let projectNonCanonicalCode;
    try {
      validateCapturedExportSemantics(
        projectNonCanonicalRecords,
        '1'.repeat(40),
      );
    } catch (error) {
      projectNonCanonicalCode = error?.code;
    }
    if (projectNonCanonicalCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    const duplicateRecords = semanticFixture.recordsFor(semanticFixture.bodies);
    const duplicateRecord = duplicateRecords.find((record) => record.id === 'expected-parse-outcomes');
    duplicateRecord.bytes = BUFFER_FROM(
      duplicateRecord.bytes.toString('utf8').replace('{"authorizing":false,', '{"authorizing":false,"authorizing":false,'),
      'utf8',
    );
    let duplicateCode;
    try { validateCapturedExportSemantics(duplicateRecords, '1'.repeat(40)); } catch (error) { duplicateCode = error?.code; }
    if (duplicateCode !== 'REFUSED_EXPORT_SEMANTIC') throw new Error();
    const mutatedSevenManifest = JSON.parse(JSON.stringify(sevenManifest));
    mutatedSevenManifest.artifacts[0].sha256 = '0'.repeat(64);
    let genericMutationCode;
    let pinnedMutationCode;
    try {
      encodeAdmissionFrameCore({ manifest: mutatedSevenManifest, artifacts: cleanCaptured }, GENERIC_CAPACITY_POLICY);
    } catch (error) {
      genericMutationCode = error?.code;
    }
    try {
      encodeAdmissionFrameCore({ manifest: mutatedSevenManifest, artifacts: cleanCaptured }, PINNED_CAPACITY_POLICY);
    } catch (error) {
      pinnedMutationCode = error?.code;
    }
    if (!genericMutationCode || genericMutationCode !== pinnedMutationCode) throw new Error();
    const parityMutations = [
      (value) => { value.schema = 'mutated-schema'; },
      (value) => { value.authorizing = true; },
      (value) => { value.graph.root = 'project'; },
      (value) => { value.graph.edges[0].to = 'project'; },
      (value) => { value.artifacts[0].id = 'mutated-id'; },
      (value) => { value.artifacts[0].sha256 = '0'.repeat(64); },
      (value) => { value.artifacts[0].runId = '4'.repeat(64); },
      (value) => { value.artifacts[0].byteLength += 1; },
    ];
    for (let index = 0; index < parityMutations.length; index += 1) {
      const candidate = JSON.parse(JSON.stringify(sevenManifest));
      parityMutations[index](candidate);
      let genericCode;
      let pinnedCode;
      try { encodeAdmissionFrameCore({ manifest: candidate, artifacts: cleanCaptured }, GENERIC_CAPACITY_POLICY); } catch (error) { genericCode = error?.code; }
      try { encodeAdmissionFrameCore({ manifest: candidate, artifacts: cleanCaptured }, PINNED_CAPACITY_POLICY); } catch (error) { pinnedCode = error?.code; }
      if (!genericCode || genericCode !== pinnedCode) throw new Error();
    }

    const genericExact = BUFFER_ALLOC_UNSAFE_SLOW(LIMITS.artifactBytes);
    strictBufferObservation(genericExact, LIMITS.artifactBytes, 'REFUSED_EXPORT_CAPTURE', false);
    const genericOver = BUFFER_ALLOC_UNSAFE_SLOW(LIMITS.artifactBytes + 1);
    let genericOverCode;
    try { strictBufferObservation(genericOver, LIMITS.artifactBytes, 'REFUSED_EXPORT_CAPTURE', false); } catch (error) { genericOverCode = error?.code; }
    if (genericOverCode !== 'REFUSED_EXPORT_CAPTURE') throw new Error();

    const disjointStorage = BUFFER_ALLOC_UNSAFE_SLOW(2);
    const disjointRecords = makeRecords([
      disjointStorage.subarray(0, 1),
      disjointStorage.subarray(1, 2),
      ...EXPORT_IDS.slice(2).map(() => BUFFER_FROM([0])),
    ]);
    if (captureExporterArtifacts(disjointRecords, pinnedValidation.profile).length !== EXPORT_IDS.length) throw new Error();
    const overlapStorage = BUFFER_ALLOC_UNSAFE_SLOW(2);
    const overlapRecords = makeRecords([
      overlapStorage.subarray(0, 1),
      overlapStorage.subarray(0, 1),
      ...EXPORT_IDS.slice(2).map(() => BUFFER_FROM([0])),
    ]);
    let overlapCode;
    try { captureExporterArtifacts(overlapRecords, pinnedValidation.profile); } catch (error) { overlapCode = error?.code; }
    if (overlapCode !== 'REFUSED_EXPORT_CAPTURE') throw new Error();

    const cleanRootBody = BUFFER_ALLOC_UNSAFE_SLOW(PINNED_ARTIFACT_BYTES);
    cleanRootBody.fill(0);
    strictBufferObservation(cleanRootBody, PINNED_ARTIFACT_BYTES, 'REFUSED_EXPORT_CAPTURE', false);
    const rootSized = BUFFER_ALLOC_UNSAFE_SLOW(PINNED_ARTIFACT_BYTES);
    rootSized.fill(0);
    let rootSizedCalls = 0;
    OBJECT_DEFINE_PROPERTY(rootSized, 'rootSizedUnreserved', closedAccessorDescriptor(() => {
      rootSizedCalls += 1;
      return 'ignored';
    }, true, true));
    strictBufferObservation(rootSized, PINNED_ARTIFACT_BYTES, 'REFUSED_EXPORT_CAPTURE', false);
    if (rootSizedCalls !== 0) throw new Error();
    const cleanRootCaptured = captureExporterArtifacts(
      makeRecords(EXPORT_IDS.map((id, index) => index === 1 ? cleanRootBody : BUFFER_FROM([0]))),
      pinnedValidation.profile,
    );
    const cleanRootManifest = buildAdmissionManifestCore({
      profile: pinnedValidation.profile,
      subject: {
        repositoryId: 'galerina',
        gitObjectFormat: 'sha1',
        commitOid: '1'.repeat(40),
        treeOid: '2'.repeat(40),
      },
      runId: SELF_TEST_RUN_ID,
      artifacts: cleanRootCaptured,
      graph: {
        schema: 'artifact-admission-graph.v1',
        root: 'export-sidecar',
        nodes: [...EXPORT_IDS],
        edges: EXPORT_IDS.filter((id) => id !== 'export-sidecar')
          .map((id) => ({ from: 'export-sidecar', kind: 'requires', to: id })),
      },
      claims: ['captured-bytes-only'],
      ownerRecord: null,
    }, pinnedValidation, PINNED_CAPACITY_POLICY);
    const cleanRootFrame = encodeAdmissionFrameCore(
      { manifest: cleanRootManifest, artifacts: cleanRootCaptured },
      PINNED_CAPACITY_POLICY,
    );
    const expandoRoot = rootSized;
    OBJECT_DEFINE_PROPERTY(expandoRoot, 'rootSizedUnreserved', closedAccessorDescriptor(() => {
      rootSizedCalls += 1;
      return 'ignored';
    }, true, true));
    const expandoRootCaptured = captureExporterArtifacts(
      makeRecords(EXPORT_IDS.map((id, index) => index === 1 ? expandoRoot : BUFFER_FROM([0]))),
      pinnedValidation.profile,
    );
    const expandoRootManifest = buildAdmissionManifestCore({
      profile: pinnedValidation.profile,
      subject: {
        repositoryId: 'galerina',
        gitObjectFormat: 'sha1',
        commitOid: '1'.repeat(40),
        treeOid: '2'.repeat(40),
      },
      runId: SELF_TEST_RUN_ID,
      artifacts: expandoRootCaptured,
      graph: {
        schema: 'artifact-admission-graph.v1',
        root: 'export-sidecar',
        nodes: [...EXPORT_IDS],
        edges: EXPORT_IDS.filter((id) => id !== 'export-sidecar')
          .map((id) => ({ from: 'export-sidecar', kind: 'requires', to: id })),
      },
      claims: ['captured-bytes-only'],
      ownerRecord: null,
    }, pinnedValidation, PINNED_CAPACITY_POLICY);
    const expandoRootFrame = encodeAdmissionFrameCore(
      { manifest: expandoRootManifest, artifacts: expandoRootCaptured },
      PINNED_CAPACITY_POLICY,
    );
    if (!sameBytes(cleanRootFrame, expandoRootFrame) || rootSizedCalls !== 0) throw new Error();
    const reservedBody = BUFFER_FROM(SELF_TEST_BODY);
    let reservedCalls = 0;
    OBJECT_DEFINE_PROPERTY(reservedBody, 'set', closedAccessorDescriptor(() => {
      reservedCalls += 1;
      return undefined;
    }, true, true));
    let reservedCode;
    try { strictBufferObservation(reservedBody, SELF_TEST_BODY.length, 'REFUSED_EXPORT_CAPTURE', false); } catch (error) { reservedCode = error?.code; }
    if (reservedCode !== 'REFUSED_EXPORT_CAPTURE' || reservedCalls !== 0) throw new Error();
    const pinnedBytes = BUFFER_FROM(PINNED_PROFILE_JSON, 'utf8');
    validatePinnedProfileBytes(pinnedBytes);
    pinnedBytes[0] ^= 1;
    let pinnedCode;
    try { validatePinnedProfileBytes(pinnedBytes); } catch (error) { pinnedCode = error?.code; }
    if (pinnedCode !== 'REFUSED_PROFILE_CANONICAL') throw new Error();
    selfVerifyConstructedFrame(frame, manifest, artifacts);
    return undefined;
  } catch {
    throw SELF_TEST_FAILURE;
  }
}

export async function buildFrozenGitAdmissionFrame(options) {
  const capturedOptions = captureFrozenOptions(options, arguments.length);
  let profileObservation;
  try {
    profileObservation = strictBufferObservation(capturedOptions.profileBytes, LIMITS.profileBytes, 'REFUSED_PROFILE_CAPTURE', true);
  } catch (error) {
    if (error?.code === 'REFUSED_PROFILE_CAPTURE') throw error;
    refuse('REFUSED_PROFILE_CAPTURE');
  }
  const ownedProfile = copyObservedBuffer(profileObservation, 'REFUSED_PROFILE_CAPTURE');
  const validatedProfile = validatePinnedProfileBytes(ownedProfile);
  const { commitOid, runId } = capturedOptions;
  const oidLength = validatedProfile.profile.subjectRules.gitObjectFormat === 'sha1' ? 40 : 64;
  if (
    typeof commitOid !== 'string'
    || typeof runId !== 'string'
    || !new RegExp(`^[0-9a-f]{${oidLength}}$`).test(commitOid)
    || !SHA256.test(runId)
  ) refuse('REFUSED_OPTIONS_CAPTURE');

  let exported;
  try {
    exported = await exportSourceOriginProject(commitOid);
  } catch {
    refuse('REFUSED_GIT_EXPORT');
  }
  let artifacts;
  try {
    artifacts = captureExporterArtifacts(exported, validatedProfile.profile);
  } catch (error) {
    if (error?.code === 'REFUSED_EXPORT_CAPTURE') throw error;
    refuse('REFUSED_EXPORT_CAPTURE');
  }
  let bodies;
  try {
    bodies = validateCapturedExportSemantics(artifacts, commitOid);
  } catch (error) {
    if (error?.code === 'REFUSED_EXPORT_SEMANTIC') throw error;
    refuse('REFUSED_EXPORT_SEMANTIC');
  }

  let manifest;
  let frame;
  try {
    manifest = buildAdmissionManifestCore({
      profile: validatedProfile.profile,
      subject: {
        repositoryId: validatedProfile.profile.subjectRules.repositoryId,
        gitObjectFormat: validatedProfile.profile.subjectRules.gitObjectFormat,
        commitOid,
        treeOid: bodies.source.expectedTree,
      },
      runId,
      artifacts,
      graph: sourceOriginGraph(),
      claims: ['captured-bytes-only'],
      ownerRecord: null,
    }, validatedProfile, PINNED_CAPACITY_POLICY);
    frame = encodeAdmissionFrameCore({ manifest, artifacts }, PINNED_CAPACITY_POLICY);
    selfVerifyConstructedFrame(frame, manifest, artifacts);
  } catch {
    refuse('REFUSED_FRAME_ASSEMBLY');
  }
  const thenDescriptor = OBJECT_CREATE(null);
  thenDescriptor.configurable = false;
  thenDescriptor.enumerable = false;
  thenDescriptor.value = undefined;
  thenDescriptor.writable = false;
  OBJECT_DEFINE_PROPERTY(frame, 'then', thenDescriptor);
  return frame;
}
