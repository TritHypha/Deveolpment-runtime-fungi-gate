import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdtemp, open, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { canonicalJsonText } from '../lib/logic-aig-source-origin/contract.mjs';

const FRAME_MODULE_URL = new URL('../lib/logic-aig-source-origin/artifact-frame.mjs', import.meta.url);
const FRAME_CLI = fileURLToPath(new URL('../galerina-source-origin-frame.mjs', import.meta.url));
const RUN_ID = '3'.repeat(64);
const PINNED_PROFILE_JSON = '{"artifactRules":[{"id":"expected-parse-outcomes","maxBytes":67108864,"required":true,"role":"expected-parse-outcomes"},{"id":"export-sidecar","maxBytes":83886080,"required":true,"role":"export-sidecar"},{"id":"parse-outcomes-receipt","maxBytes":67108864,"required":true,"role":"parse-outcomes-receipt"},{"id":"project","maxBytes":67108864,"required":true,"role":"project-graph"},{"id":"resolution-inputs","maxBytes":67108864,"required":true,"role":"resolution-inputs"},{"id":"source-manifest","maxBytes":67108864,"required":true,"role":"source-manifest"},{"id":"toolchain-manifest","maxBytes":67108864,"required":true,"role":"toolchain-manifest"}],"authorizing":false,"ownerPolicy":{"mode":"none"},"profileId":"galerina.source-origin.unsigned.v1","rootArtifactId":"export-sidecar","runBinding":"manifest-artifact-row-equality.v1","schema":"artifact-admission-profile.v1","subjectRules":{"gitObjectFormat":"sha1","repositoryId":"galerina"},"supportedClaims":["captured-bytes-only"],"unsupportedClaims":["path-identity.no-reparse","path-identity.posix-device-inode","path-identity.single-hard-link","path-identity.windows-file-id"]}';
const PINNED_PROFILE = Buffer.from(PINNED_PROFILE_JSON, 'utf8');
const PINNED_PROFILE_SHA256 = '8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e';
const GENUINE_COMMIT = '20f303edc13c3c43194dff9567b06e88cf2c4acd';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Task 6C freezes exact leaf fields before any actual-platform run. These are
// complete dotted fields, never prefixes, patterns, subtrees or catch-alls.
const PLATFORM_TOOLCHAIN_DIFFERENCE_ALLOWLIST = Object.freeze([
  Object.freeze(['export-sidecar', 'parseOutcomesReceiptDigest']),
  Object.freeze(['export-sidecar', 'sidecarDigest']),
  Object.freeze(['export-sidecar', 'toolchain.gitIdentity.executableByteLength']),
  Object.freeze(['export-sidecar', 'toolchain.gitIdentity.executableRawSha256']),
  Object.freeze(['export-sidecar', 'toolchain.gitIdentity.version']),
  Object.freeze(['export-sidecar', 'toolchain.nodeIdentity.executableByteLength']),
  Object.freeze(['export-sidecar', 'toolchain.nodeIdentity.executableRawSha256']),
  Object.freeze(['export-sidecar', 'toolchain.nodeIdentity.version']),
  Object.freeze(['export-sidecar', 'toolchain.selectedPinRecordDigest']),
  Object.freeze(['export-sidecar', 'toolchain.selectedPinRecordId']),
  Object.freeze(['export-sidecar', 'toolchain.toolchainManifestDigest']),
  Object.freeze(['export-sidecar', 'toolchainManifestDigest']),
  Object.freeze(['parse-outcomes-receipt', 'receiptDigest']),
  Object.freeze(['parse-outcomes-receipt', 'toolchainManifestDigest']),
  Object.freeze(['toolchain-manifest', 'actualLoadedBuiltinModules']),
  Object.freeze(['toolchain-manifest', 'actualLoadedModuleRows']),
  Object.freeze(['toolchain-manifest', 'actualLoadedSetDigest']),
  Object.freeze(['toolchain-manifest', 'actualParserExportNames']),
  Object.freeze(['toolchain-manifest', 'actualRuntimeLoadSets']),
  Object.freeze(['toolchain-manifest', 'gitIdentity.executableByteLength']),
  Object.freeze(['toolchain-manifest', 'gitIdentity.executableRawSha256']),
  Object.freeze(['toolchain-manifest', 'gitIdentity.version']),
  Object.freeze(['toolchain-manifest', 'moduleClosureDigest']),
  Object.freeze(['toolchain-manifest', 'nodeIdentity.executableByteLength']),
  Object.freeze(['toolchain-manifest', 'nodeIdentity.executableRawSha256']),
  Object.freeze(['toolchain-manifest', 'nodeIdentity.version']),
  Object.freeze(['toolchain-manifest', 'platform']),
  Object.freeze(['toolchain-manifest', 'runtimeLoadSets']),
  Object.freeze(['toolchain-manifest', 'selectedPinRecordDigest']),
  Object.freeze(['toolchain-manifest', 'selectedPinRecordId']),
  Object.freeze(['toolchain-manifest', 'toolchainManifestDigest']),
]);
const PLATFORM_RECEIPT_KEYS = Object.freeze([
  'schema', 'platform', 'arch', 'producerCommit', 'producerTree',
  'profileByteLength', 'profileSha256', 'runId', 'platformPinRecordId',
  'platformPinRecordDigest', 'otherPlatformPinRecordId', 'otherPlatformPinRecordDigest',
    'git', 'platformPinRecords', 'selectedIdentities', 'toolchainDifferenceAllowlist',
  'artifacts', 'frameByteLength', 'frameSha256', 'authorizing', 'status',
]);
const PLATFORM_GIT_KEYS = Object.freeze(['commitOid', 'treeOid', 'blobModes']);
const PLATFORM_PIN_RECORD_KEYS = Object.freeze(['platform', 'arch', 'recordId', 'recordDigest']);
const PLATFORM_IDENTITY_KEYS = Object.freeze(['version', 'executableByteLength', 'executableRawSha256']);
const PLATFORM_ARTIFACT_KEYS = Object.freeze(['id', 'byteLength', 'sha256']);
const PLATFORM_ARTIFACT_IDS = Object.freeze([
  'expected-parse-outcomes', 'export-sidecar', 'parse-outcomes-receipt',
  'project', 'resolution-inputs', 'source-manifest', 'toolchain-manifest',
]);
const PLATFORM_ARTIFACT_ROLES = Object.freeze([
  'expected-parse-outcomes', 'export-sidecar', 'parse-outcomes-receipt',
  'project-graph', 'resolution-inputs', 'source-manifest', 'toolchain-manifest',
]);
const PLATFORM_GRAPH = Object.freeze({
  schema: 'artifact-admission-graph.v1',
  root: 'export-sidecar',
  nodes: PLATFORM_ARTIFACT_IDS,
  edges: Object.freeze(PLATFORM_ARTIFACT_IDS.filter((id) => id !== 'export-sidecar').map((id) => Object.freeze({
    from: 'export-sidecar', kind: 'requires', to: id,
  }))),
});
const CONTROLLED_PLATFORM_RUNNER_ENV = Object.freeze([
  'GALERINA_TASK6C_PLATFORM_FRAME_PATH',
  'GALERINA_TASK6C_PLATFORM_PROFILE_PATH',
  'GALERINA_TASK6C_PLATFORM_RECEIPT_PATH',
]);
const CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV = 'GALERINA_TASK6C_PLATFORM_RECEIPT_RUN';
const CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ENV = Object.freeze([
  'GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH',
  'GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT',
]);
const CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ACTIVATION_ENV = 'GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN';
const GAAF_MAGIC = Buffer.from('GAAF', 'ascii');

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

function syntheticGAAFFrame({
  artifactBytes,
  runId = '6'.repeat(64),
  commitOid = '2'.repeat(40),
  treeOid = '4'.repeat(40),
  artifactDigestOverride = null,
  artifactRoleOverride = null,
  graphOverride = null,
}) {
  const artifacts = artifactBytes.map((bytes, index) => ({
    id: PLATFORM_ARTIFACT_IDS[index],
    role: artifactRoleOverride?.[index] ?? PLATFORM_ARTIFACT_ROLES[index],
    runId,
    sha256: artifactDigestOverride?.[index] ?? sha256(bytes),
    byteLength: bytes.length,
    required: true,
  }));
  const manifest = {
    schema: 'artifact-admission-manifest.v1',
    authorizing: false,
    profileId: 'galerina.source-origin.unsigned.v1',
    profileDigest: PINNED_PROFILE_SHA256,
    runId,
    subject: {
      repositoryId: 'galerina',
      gitObjectFormat: 'sha1',
      commitOid,
      treeOid,
    },
    artifacts,
    graph: graphOverride ?? PLATFORM_GRAPH,
    claims: ['captured-bytes-only'],
    ownerRecord: null,
  };
  const manifestBytes = Buffer.from(canonicalJsonText(manifest), 'utf8');
  const parts = [Buffer.from('GAAF', 'ascii'), Buffer.from([1]), u32(manifestBytes.length), manifestBytes, u16(artifactBytes.length)];
  for (let index = 0; index < artifactBytes.length; index += 1) {
    const id = Buffer.from(PLATFORM_ARTIFACT_IDS[index], 'utf8');
    parts.push(u16(id.length), id, u64(artifactBytes[index].length), artifactBytes[index]);
  }
  return Buffer.concat(parts);
}

function platformRunnerRefusal(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function boundedFrameInteger(bytes, offset, width, code) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > bytes.length - width) platformRunnerRefusal(code);
  if (width === 2) return bytes.readUInt16BE(offset);
  if (width === 4) return bytes.readUInt32BE(offset);
  const value = bytes.readBigUInt64BE(offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) platformRunnerRefusal(code);
  return Number(value);
}

function canonicalJsonFromBytes(bytes, code) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.includes(0x0a) || bytes.includes(0x0d)) platformRunnerRefusal(code);
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) platformRunnerRefusal(code);
  let value;
  try { value = JSON.parse(text); } catch { platformRunnerRefusal(code); }
  if (canonicalJsonText(value) !== text) platformRunnerRefusal(code);
  return value;
}

function decodeBoundedPlatformGAAF(frameBytes) {
  if (!Buffer.isBuffer(frameBytes) || frameBytes.length < 11 || frameBytes.length > 134_217_728) platformRunnerRefusal('HOLD_PLATFORM_FRAME_SIZE');
  if (!frameBytes.subarray(0, 4).equals(GAAF_MAGIC) || frameBytes[4] !== 1) platformRunnerRefusal('HOLD_PLATFORM_FRAME_SCHEMA');
  const manifestLength = boundedFrameInteger(frameBytes, 5, 4, 'HOLD_PLATFORM_FRAME_SCHEMA');
  if (manifestLength === 0 || manifestLength > 1_048_576 || 9 + manifestLength > frameBytes.length - 2) platformRunnerRefusal('HOLD_PLATFORM_FRAME_SCHEMA');
  const manifest = canonicalJsonFromBytes(frameBytes.subarray(9, 9 + manifestLength), 'HOLD_PLATFORM_MANIFEST');
  if (!exactKeys(manifest, ['schema', 'authorizing', 'profileId', 'profileDigest', 'runId', 'subject', 'artifacts', 'graph', 'claims', 'ownerRecord'])) platformRunnerRefusal('HOLD_PLATFORM_MANIFEST');
  if (manifest.schema !== 'artifact-admission-manifest.v1' || manifest.authorizing !== false || manifest.profileId !== 'galerina.source-origin.unsigned.v1' || manifest.profileDigest !== PINNED_PROFILE_SHA256 || !/^[0-9a-f]{64}$/u.test(manifest.runId)) platformRunnerRefusal('HOLD_PLATFORM_MANIFEST');
  if (!exactKeys(manifest.subject, ['repositoryId', 'gitObjectFormat', 'commitOid', 'treeOid']) || manifest.subject.repositoryId !== 'galerina' || manifest.subject.gitObjectFormat !== 'sha1' || !/^[0-9a-f]{40}$/u.test(manifest.subject.commitOid) || !/^[0-9a-f]{40}$/u.test(manifest.subject.treeOid)) platformRunnerRefusal('HOLD_PLATFORM_MANIFEST');
  if (!exactKeys(manifest.graph, ['schema', 'root', 'nodes', 'edges']) || canonicalJsonText(manifest.graph) !== canonicalJsonText(PLATFORM_GRAPH) || canonicalJsonText(manifest.claims) !== '["captured-bytes-only"]' || manifest.ownerRecord !== null) platformRunnerRefusal('HOLD_PLATFORM_MANIFEST');
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length !== PLATFORM_ARTIFACT_IDS.length) platformRunnerRefusal('HOLD_PLATFORM_MANIFEST');
  let offset = 9 + manifestLength;
  const artifactCount = boundedFrameInteger(frameBytes, offset, 2, 'HOLD_PLATFORM_FRAME_SCHEMA');
  offset += 2;
  if (artifactCount !== PLATFORM_ARTIFACT_IDS.length) platformRunnerRefusal('HOLD_PLATFORM_FRAME_SCHEMA');
  const artifactBytes = [];
  for (let index = 0; index < artifactCount; index += 1) {
    const row = manifest.artifacts[index];
    if (!exactKeys(row, ['id', 'role', 'runId', 'sha256', 'byteLength', 'required']) || row.id !== PLATFORM_ARTIFACT_IDS[index] || row.role !== PLATFORM_ARTIFACT_ROLES[index] || row.runId !== manifest.runId || row.required !== true || !/^[0-9a-f]{64}$/u.test(row.sha256) || !Number.isSafeInteger(row.byteLength) || row.byteLength < 0) platformRunnerRefusal('HOLD_PLATFORM_MANIFEST');
    const idLength = boundedFrameInteger(frameBytes, offset, 2, 'HOLD_PLATFORM_FRAME_SCHEMA');
    offset += 2;
    if (idLength === 0 || idLength > 128 || offset > frameBytes.length - idLength - 8) platformRunnerRefusal('HOLD_PLATFORM_FRAME_SCHEMA');
    const idBytes = frameBytes.subarray(offset, offset + idLength);
    offset += idLength;
    const id = idBytes.toString('utf8');
    if (!Buffer.from(id, 'utf8').equals(idBytes) || id !== row.id) platformRunnerRefusal('HOLD_PLATFORM_ARTIFACT_BINDING');
    const length = boundedFrameInteger(frameBytes, offset, 8, 'HOLD_PLATFORM_FRAME_SCHEMA');
    offset += 8;
    const maximum = id === 'export-sidecar' ? 83_886_080 : 67_108_864;
    if (length > maximum || length !== row.byteLength || offset > frameBytes.length - length) platformRunnerRefusal('HOLD_PLATFORM_ARTIFACT_BINDING');
    const body = Buffer.from(frameBytes.subarray(offset, offset + length));
    offset += length;
    if (sha256(body) !== row.sha256) platformRunnerRefusal('HOLD_PLATFORM_ARTIFACT_BINDING');
    artifactBytes.push(body);
  }
  if (offset !== frameBytes.length) platformRunnerRefusal('HOLD_PLATFORM_FRAME_SCHEMA');
  return { manifest, artifactBytes };
}

async function readBoundedRegularFile(pathValue, maximum, code) {
  if (typeof pathValue !== 'string' || pathValue.length === 0) platformRunnerRefusal(code);
  let opening;
  try { opening = await lstat(pathValue, { bigint: true }); } catch { platformRunnerRefusal(code); }
  const maximumBytes = BigInt(maximum);
  if (!opening.isFile() || opening.isSymbolicLink() || opening.size < 0n || opening.size > maximumBytes) platformRunnerRefusal(code);
  const sameFile = (left, right) => left.isFile() && !left.isSymbolicLink()
    && left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.size === right.size;
  let handle;
  let bytes;
  let failed = false;
  try {
    const flags = constants.O_RDONLY | (Number.isSafeInteger(constants.O_NOFOLLOW) ? constants.O_NOFOLLOW : 0);
    try {
      handle = await open(pathValue, flags);
    } catch (error) {
      if (error?.code !== 'EINVAL' && error?.code !== 'ENOTSUP' && error?.code !== 'EOPNOTSUPP') throw error;
      handle = await open(pathValue, constants.O_RDONLY);
    }
    const held = await handle.stat({ bigint: true });
    if (!sameFile(opening, held) || held.size > maximumBytes) throw new Error();
    bytes = Buffer.allocUnsafeSlow(Number(held.size));
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(result.bytesRead) || result.bytesRead <= 0) throw new Error();
      offset += result.bytesRead;
    }
    const closing = await lstat(pathValue, { bigint: true });
    if (!sameFile(opening, closing) || !sameFile(held, closing)) throw new Error();
  } catch {
    failed = true;
  } finally {
    if (handle !== undefined) {
      try { await handle.close(); } catch { failed = true; }
    }
  }
  if (failed || bytes === undefined) platformRunnerRefusal(code);
  return bytes;
}

async function requireAbsentPlatformReceipt(pathValue) {
  if (typeof pathValue !== 'string' || pathValue.length === 0) platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_OUTPUT');
  try {
    await lstat(pathValue);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_OUTPUT');
  }
  platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_OUTPUT');
}

async function emitControlledPlatformObservation({ profilePath, framePath, receiptPath }) {
  const platform = process.platform;
  if ((platform !== 'win32' && platform !== 'linux') || process.arch !== 'x64') platformRunnerRefusal('HOLD_PLATFORM_UNAVAILABLE');
  await requireAbsentPlatformReceipt(receiptPath);
  const profileBytes = await readBoundedRegularFile(profilePath, 1_048_576, 'HOLD_PLATFORM_PROFILE');
  if (profileBytes.length !== PINNED_PROFILE.length || sha256(profileBytes) !== PINNED_PROFILE_SHA256 || profileBytes.includes(0x0a) || profileBytes.includes(0x0d)) platformRunnerRefusal('HOLD_PLATFORM_PROFILE');
  const frameBytes = await readBoundedRegularFile(framePath, 134_217_728, 'HOLD_PLATFORM_FRAME_SIZE');
  const { manifest, artifactBytes } = decodeBoundedPlatformGAAF(frameBytes);
  const { receipt, receiptBytes } = buildPendingPlatformObservation({
    platform,
    profileBytes,
    frameBytes,
    artifactBytes,
    producerTree: manifest.subject.treeOid,
    runId: manifest.runId,
    producerCommit: manifest.subject.commitOid,
  });
  try {
    await writeFile(receiptPath, receiptBytes, { flag: 'wx', mode: 0o600 });
  } catch {
    platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_OUTPUT');
  }
  return receipt;
}

async function runControlledPlatformObservationFromEnvironment() {
  const known = new Set([
    ...CONTROLLED_PLATFORM_RUNNER_ENV,
    CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV,
    ...CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ENV,
    CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ACTIVATION_ENV,
  ]);
  for (const name of Object.keys(process.env)) {
    if (name.toUpperCase().startsWith('GALERINA_TASK6C_PLATFORM_') && !known.has(name)) platformRunnerRefusal('HOLD_PLATFORM_CONTROLLED_INPUT');
  }
  const locators = CONTROLLED_PLATFORM_RUNNER_ENV.map((name) => process.env[name]);
  const supplied = locators.map((value) => value !== undefined);
  const present = locators.map((value) => typeof value === 'string' && value.length > 0);
  const activation = process.env[CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV];
  if (activation === undefined && supplied.every((value) => !value)) return null;
  const conflicting = [...CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ENV, CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ACTIVATION_ENV]
    .some((name) => process.env[name] !== undefined);
  if (activation !== '1' || !present.every(Boolean) || conflicting || new Set(locators).size !== locators.length) platformRunnerRefusal('HOLD_PLATFORM_CONTROLLED_INPUT');
  return emitControlledPlatformObservation({
    framePath: locators[0],
    profilePath: locators[1],
    receiptPath: locators[2],
  });
}

async function runControlledPlatformReceiptValidationFromEnvironment() {
  const known = new Set([
    ...CONTROLLED_PLATFORM_RUNNER_ENV,
    CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV,
    ...CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ENV,
    CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ACTIVATION_ENV,
  ]);
  for (const name of Object.keys(process.env)) {
    if (name.toUpperCase().startsWith('GALERINA_TASK6C_PLATFORM_') && !known.has(name)) platformRunnerRefusal('HOLD_PLATFORM_CONTROLLED_INPUT');
  }
  const [receiptPath, expectedCommit] = CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ENV.map((name) => process.env[name]);
  const supplied = [receiptPath, expectedCommit].map((value) => value !== undefined);
  const present = [receiptPath, expectedCommit].map((value) => typeof value === 'string' && value.length > 0);
  const activation = process.env[CONTROLLED_PLATFORM_RECEIPT_VALIDATOR_ACTIVATION_ENV];
  const conflicting = [...CONTROLLED_PLATFORM_RUNNER_ENV, CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV]
    .some((name) => process.env[name] !== undefined);
  if (activation === undefined && supplied.every((value) => !value) && !conflicting) return null;
  if (activation !== '1' || !present.every(Boolean) || conflicting || !/^[0-9a-f]{40}$/u.test(expectedCommit)) {
    platformRunnerRefusal('HOLD_PLATFORM_CONTROLLED_INPUT');
  }
  const platform = process.platform;
  if ((platform !== 'win32' && platform !== 'linux') || process.arch !== 'x64') platformRunnerRefusal('HOLD_PLATFORM_UNAVAILABLE');
  const receiptBytes = await readBoundedRegularFile(receiptPath, 1_048_576, 'HOLD_PLATFORM_RECEIPT_SCHEMA');
  let receipt;
  try {
    const receiptPlatform = canonicalJsonFromBytes(receiptBytes, 'HOLD_PLATFORM_RECEIPT_SCHEMA')?.platform;
    if (receiptPlatform !== 'win32' && receiptPlatform !== 'linux') platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_SCHEMA');
    receipt = validatePendingPlatformReceipt(receiptBytes, receiptPlatform, null, true);
  } catch {
    platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_SCHEMA');
  }
  if (receipt.producerCommit !== expectedCommit) platformRunnerRefusal('HOLD_PLATFORM_RECEIPT_IDENTITY');
  return receipt;
}

function exactKeys(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function pendingPlatformReceipt(platform) {
  const schema = platform === 'win32'
    ? 'rd0873-task6-producer-windows-x64.v1'
    : 'rd0873-task6-producer-linux-x64.v1';
  const pendingPin = (pinPlatform) => ({
    platform: pinPlatform,
    arch: 'x64',
    recordId: 'PENDING_EXACT_BYTES',
    recordDigest: null,
  });
  return {
    schema,
    platform,
    arch: 'x64',
    producerCommit: GENUINE_COMMIT,
    producerTree: '1'.repeat(40),
    profileByteLength: PINNED_PROFILE.length,
    profileSha256: PINNED_PROFILE_SHA256,
    runId: RUN_ID,
    platformPinRecordId: 'PENDING_EXACT_BYTES',
    platformPinRecordDigest: null,
    otherPlatformPinRecordId: 'PENDING_EXACT_BYTES',
    otherPlatformPinRecordDigest: null,
    git: {
      commitOid: GENUINE_COMMIT,
      treeOid: '1'.repeat(40),
      blobModes: 'PENDING_EXACT_BYTES',
    },
    platformPinRecords: [pendingPin('win32'), pendingPin('linux')],
    selectedIdentities: {
      git: { version: 'PENDING_EXACT_BYTES', executableByteLength: null, executableRawSha256: null },
      node: { version: 'PENDING_EXACT_BYTES', executableByteLength: null, executableRawSha256: null },
    },
    toolchainDifferenceAllowlist: PLATFORM_TOOLCHAIN_DIFFERENCE_ALLOWLIST,
    artifacts: PLATFORM_ARTIFACT_IDS.map((id) => ({ id, byteLength: null, sha256: null })),
    frameByteLength: null,
    frameSha256: null,
    authorizing: false,
    status: 'PENDING_EXACT_BYTES',
  };
}

// This is the bounded runner contract for the later Windows/Linux observation
// step. It binds independently captured raw bytes into the pending no-LF
// receipt without invoking the Task 6E verifier or writing a fixture.
function buildPendingPlatformObservation({
  platform,
  profileBytes,
  frameBytes,
  artifactBytes,
  producerCommit = GENUINE_COMMIT,
  producerTree = '1'.repeat(40),
  runId = RUN_ID,
  metadata = null,
}) {
  assert.equal(platform === 'win32' || platform === 'linux', true);
  assert.equal(Buffer.isBuffer(profileBytes), true);
  assert.equal(Buffer.isBuffer(frameBytes), true);
  assert.equal(Array.isArray(artifactBytes), true);
  assert.equal(artifactBytes.length, PLATFORM_ARTIFACT_IDS.length);
  const receipt = pendingPlatformReceipt(platform);
  receipt.producerCommit = producerCommit;
  receipt.producerTree = producerTree;
  receipt.runId = runId;
  receipt.git.commitOid = producerCommit;
  receipt.git.treeOid = producerTree;
  if (metadata !== null) {
    assert.deepEqual(Object.keys(metadata).sort(), [
      'git', 'platformPinRecords', 'selectedIdentities', 'selectedPinIdentities',
    ]);
    const toolchainArtifact = artifactBytes.find((body, index) => PLATFORM_ARTIFACT_IDS[index] === 'toolchain-manifest');
    const decodedToolchain = JSON.parse(toolchainArtifact.toString('utf8'));
    const decodedToolchainIdentities = {
      git: decodedToolchain.gitIdentity,
      node: decodedToolchain.nodeIdentity,
    };
    assert.deepEqual(metadata.selectedIdentities, metadata.selectedPinIdentities);
    assert.deepEqual(metadata.selectedIdentities, decodedToolchainIdentities);
    receipt.git = metadata.git;
    receipt.platformPinRecords = metadata.platformPinRecords;
    receipt.platformPinRecordId = metadata.platformPinRecords.find((pin) => pin.platform === platform).recordId;
    receipt.platformPinRecordDigest = metadata.platformPinRecords.find((pin) => pin.platform === platform).recordDigest;
    const otherPlatform = platform === 'win32' ? 'linux' : 'win32';
    receipt.otherPlatformPinRecordId = metadata.platformPinRecords.find((pin) => pin.platform === otherPlatform).recordId;
    receipt.otherPlatformPinRecordDigest = metadata.platformPinRecords.find((pin) => pin.platform === otherPlatform).recordDigest;
    receipt.selectedIdentities = metadata.selectedIdentities;
  }
  receipt.profileByteLength = profileBytes.length;
  receipt.profileSha256 = sha256(profileBytes);
  receipt.artifacts = artifactBytes.map((body, index) => {
    assert.equal(Buffer.isBuffer(body), true);
    return {
      id: PLATFORM_ARTIFACT_IDS[index],
      byteLength: body.length,
      sha256: sha256(body),
    };
  });
  receipt.frameByteLength = frameBytes.length;
  receipt.frameSha256 = sha256(frameBytes);
  const receiptBytes = Buffer.from(canonicalJsonText(receipt), 'utf8');
  validatePendingPlatformReceipt(
    receiptBytes,
    platform,
    null,
    true,
    frameBytes,
    profileBytes,
    artifactBytes,
  );
  return { receipt, receiptBytes };
}

function validatePendingPlatformReceipt(
  receiptBytes,
  platform,
  expectedFrameSha256 = null,
  allowExactBytes = false,
  frameBytes = null,
  profileBytes = null,
  artifactBytes = null,
) {
  assert.ok(Buffer.isBuffer(receiptBytes));
  assert.equal(receiptBytes.includes(0x0a), false);
  assert.equal(receiptBytes.includes(0x0d), false);
  const text = receiptBytes.toString('utf8');
  assert.equal(Buffer.from(text, 'utf8').equals(receiptBytes), true);
  const receipt = JSON.parse(text);
  assert.equal(canonicalJsonText(receipt), text);
  assert.equal(exactKeys(receipt, PLATFORM_RECEIPT_KEYS), true);
  assert.equal(receipt.schema, platform === 'win32'
    ? 'rd0873-task6-producer-windows-x64.v1'
    : 'rd0873-task6-producer-linux-x64.v1');
  assert.equal(receipt.platform, platform);
  assert.equal(receipt.arch, 'x64');
  assert.match(receipt.producerCommit, /^[0-9a-f]{40}$/u);
  assert.match(receipt.producerTree, /^[0-9a-f]{40}$/u);
  assert.equal(receipt.profileByteLength, PINNED_PROFILE.length);
  assert.equal(receipt.profileSha256, PINNED_PROFILE_SHA256);
  if (profileBytes !== null) {
    assert.equal(Buffer.isBuffer(profileBytes), true);
    assert.equal(profileBytes.length <= 1_048_576, true);
    assert.equal(profileBytes.length, receipt.profileByteLength);
    assert.equal(sha256(profileBytes), receipt.profileSha256);
  }
  assert.match(receipt.runId, /^[0-9a-f]{64}$/u);
  assert.equal(receipt.status, 'PENDING_EXACT_BYTES');
  assert.equal(receipt.authorizing, false);
  const concretePinMetadata = allowExactBytes && receipt.platformPinRecordId !== 'PENDING_EXACT_BYTES';
  if (concretePinMetadata) {
    assert.match(receipt.platformPinRecordId, /^[a-z0-9-]+$/u);
    assert.match(receipt.platformPinRecordDigest, /^[0-9a-f]{64}$/u);
    assert.match(receipt.otherPlatformPinRecordId, /^[a-z0-9-]+$/u);
    assert.match(receipt.otherPlatformPinRecordDigest, /^[0-9a-f]{64}$/u);
  } else {
    assert.equal(receipt.platformPinRecordId, 'PENDING_EXACT_BYTES');
    assert.equal(receipt.platformPinRecordDigest, null);
    assert.equal(receipt.otherPlatformPinRecordId, 'PENDING_EXACT_BYTES');
    assert.equal(receipt.otherPlatformPinRecordDigest, null);
  }
  assert.equal(exactKeys(receipt.git, PLATFORM_GIT_KEYS), true);
  assert.equal(receipt.git.commitOid, receipt.producerCommit);
  assert.equal(receipt.git.treeOid, receipt.producerTree);
  if (allowExactBytes && receipt.git.blobModes !== 'PENDING_EXACT_BYTES') {
    assert.equal(typeof receipt.git.blobModes, 'string');
    assert.notEqual(receipt.git.blobModes.length, 0);
    assert.match(receipt.git.commitOid, /^[0-9a-f]{40}$/u);
    assert.match(receipt.git.treeOid, /^[0-9a-f]{40}$/u);
    const modes = receipt.git.blobModes.split(',');
    assert.equal(modes.every((mode) => mode === '100644' || mode === '100755'), true);
    assert.deepEqual([...new Set(modes)].sort(), modes);
  } else {
    assert.equal(receipt.git.blobModes, 'PENDING_EXACT_BYTES');
  }
  assert.equal(Array.isArray(receipt.platformPinRecords), true);
  assert.equal(receipt.platformPinRecords.length, 2);
  assert.deepEqual(receipt.platformPinRecords.map((pin) => pin.platform), ['win32', 'linux']);
  for (const pin of receipt.platformPinRecords) {
    assert.equal(exactKeys(pin, PLATFORM_PIN_RECORD_KEYS), true);
    assert.equal(pin.arch, 'x64');
    if (concretePinMetadata) {
      assert.match(pin.recordId, /^[a-z0-9-]+$/u);
      assert.match(pin.recordDigest, /^[0-9a-f]{64}$/u);
    } else {
      assert.equal(pin.recordId, 'PENDING_EXACT_BYTES');
      assert.equal(pin.recordDigest, null);
    }
  }
  if (concretePinMetadata) {
    const selectedPin = receipt.platformPinRecords.find((pin) => pin.platform === receipt.platform);
    const otherPin = receipt.platformPinRecords.find((pin) => pin.platform !== receipt.platform);
    assert.ok(selectedPin);
    assert.ok(otherPin);
    assert.equal(receipt.platformPinRecordId, selectedPin.recordId);
    assert.equal(receipt.platformPinRecordDigest, selectedPin.recordDigest);
    assert.equal(receipt.otherPlatformPinRecordId, otherPin.recordId);
    assert.equal(receipt.otherPlatformPinRecordDigest, otherPin.recordDigest);
  }
  assert.equal(exactKeys(receipt.selectedIdentities, ['git', 'node']), true);
  for (const identity of Object.values(receipt.selectedIdentities)) {
    assert.equal(exactKeys(identity, PLATFORM_IDENTITY_KEYS), true);
    if (concretePinMetadata) {
      assert.equal(typeof identity.version, 'string');
      assert.equal(Number.isSafeInteger(identity.executableByteLength), true);
      assert.equal(identity.executableByteLength >= 0, true);
      assert.match(identity.executableRawSha256, /^[0-9a-f]{64}$/u);
    } else {
      assert.equal(identity.version, 'PENDING_EXACT_BYTES');
      assert.equal(identity.executableByteLength, null);
      assert.equal(identity.executableRawSha256, null);
    }
  }
  assert.deepEqual(receipt.toolchainDifferenceAllowlist, PLATFORM_TOOLCHAIN_DIFFERENCE_ALLOWLIST);
  assert.equal(Array.isArray(receipt.artifacts), true);
  assert.equal(receipt.artifacts.length, PLATFORM_ARTIFACT_IDS.length);
  receipt.artifacts.forEach((artifact, index) => {
    assert.equal(exactKeys(artifact, PLATFORM_ARTIFACT_KEYS), true);
    assert.equal(artifact.id, PLATFORM_ARTIFACT_IDS[index]);
    if (allowExactBytes) {
      assert.equal(Number.isSafeInteger(artifact.byteLength), true);
      assert.equal(artifact.byteLength >= 0, true);
      assert.match(artifact.sha256, /^[0-9a-f]{64}$/u);
      const maximum = artifact.id === 'export-sidecar' ? 83_886_080 : 67_108_864;
      assert.equal(artifact.byteLength <= maximum, true);
    } else {
      assert.equal(artifact.byteLength, null);
      assert.equal(artifact.sha256, null);
    }
  });
  if (allowExactBytes) {
    assert.equal(Number.isSafeInteger(receipt.frameByteLength), true);
    assert.equal(receipt.frameByteLength >= 0, true);
    assert.equal(receipt.frameByteLength <= 134_217_728, true);
    assert.match(receipt.frameSha256, /^[0-9a-f]{64}$/u);
  } else {
    assert.equal(receipt.frameByteLength, null);
    if (receipt.frameSha256 !== expectedFrameSha256) throw new Error('frameSha256 identity mismatch');
  }
  if (expectedFrameSha256 !== null && receipt.frameSha256 !== expectedFrameSha256) throw new Error('frameSha256 identity mismatch');
  if (frameBytes !== null) {
    assert.equal(Buffer.isBuffer(frameBytes), true);
    assert.equal(frameBytes.length <= 134_217_728, true);
    assert.equal(frameBytes.length, receipt.frameByteLength);
    if (sha256(frameBytes) !== receipt.frameSha256) throw new Error('frameSha256 raw identity mismatch');
  }
  if (artifactBytes !== null) {
    assert.equal(Array.isArray(artifactBytes), true);
    assert.equal(artifactBytes.length, PLATFORM_ARTIFACT_IDS.length);
    for (let index = 0; index < artifactBytes.length; index += 1) {
      const body = artifactBytes[index];
      assert.equal(Buffer.isBuffer(body), true);
      assert.equal(body.length, receipt.artifacts[index].byteLength);
      if (sha256(body) !== receipt.artifacts[index].sha256) throw new Error('artifact sha256 raw identity mismatch');
    }
  }
  return receipt;
}

function changedPlatformFields(base, candidate) {
  const leafMap = (value, prefix = '') => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return new Map([[prefix, JSON.stringify(value)]]);
    }
    if (Object.keys(value).length === 0) return new Map([[prefix, '{}']]);
    const output = new Map();
    for (const key of Object.keys(value).sort()) {
      for (const [path, encoded] of leafMap(value[key], prefix ? `${prefix}.${key}` : key)) {
        output.set(path, encoded);
      }
    }
    return output;
  };
  const changes = [];
  const documentIds = [...new Set([...Object.keys(base), ...Object.keys(candidate)])].sort();
  for (const documentId of documentIds) {
    const left = leafMap(base[documentId]);
    const right = leafMap(candidate[documentId]);
    const fields = [...new Set([...left.keys(), ...right.keys()])].sort();
    for (const fieldPath of fields) {
      if (left.get(fieldPath) !== right.get(fieldPath)) changes.push([documentId, fieldPath]);
    }
  }
  return changes;
}

function assertClosedFieldSet(changes) {
  for (const change of changes) {
    if (!PLATFORM_TOOLCHAIN_DIFFERENCE_ALLOWLIST.some(([documentId, fieldPath]) =>
      documentId === change[0] && fieldPath === change[1])) {
      throw new Error(`unlisted platform difference: ${change[0]}.${change[1]}`);
    }
  }
}

async function refusalCode(operation) {
  try {
    await operation();
  } catch (error) {
    return error?.code;
  }
  return undefined;
}

test('Task 6C binds the 1131-byte capacity profile', async () => {
  assert.equal(PINNED_PROFILE.length, 1_131);
  assert.equal(sha256(PINNED_PROFILE), PINNED_PROFILE_SHA256);
  const frameModule = await import(FRAME_MODULE_URL);
  assert.equal(typeof frameModule.buildFrozenGitAdmissionFrame, 'function');
  assert.equal(
    await refusalCode(() => frameModule.buildFrozenGitAdmissionFrame({
      commitOid: 'not-a-commit',
      profileBytes: Buffer.from(PINNED_PROFILE),
      runId: RUN_ID,
    })),
    'REFUSED_OPTIONS_CAPTURE',
  );
});

test('Task 6C exposes an opaque zero-argument frozen-frame self-test', async () => {
  const frameModule = await import(FRAME_MODULE_URL);
  assert.equal(typeof frameModule.runFrozenGitAdmissionFrameSelfTest, 'function');
  assert.equal(frameModule.runFrozenGitAdmissionFrameSelfTest(), undefined);
  assert.throws(
    () => frameModule.runFrozenGitAdmissionFrameSelfTest('unexpected'),
    (error) => Object.getPrototypeOf(error) === null
      && Object.isFrozen(error)
      && Object.getOwnPropertyNames(error).length === 0
      && Object.getOwnPropertySymbols(error).length === 0,
  );
});

test('Task 6C freezes a closed platform/toolchain difference allowlist', () => {
  const keys = PLATFORM_TOOLCHAIN_DIFFERENCE_ALLOWLIST.map(([documentId, fieldPath]) => `${documentId}\u0000${fieldPath}`);
  assert.deepEqual([...keys].sort(), keys);
  assert.equal(new Set(keys).size, keys.length);
  PLATFORM_TOOLCHAIN_DIFFERENCE_ALLOWLIST.forEach(([documentId, fieldPath]) => {
    assert.match(documentId, /^[a-z][a-z0-9-]*$/u);
    assert.match(fieldPath, /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)*$/u);
    assert.equal(fieldPath.endsWith('.'), false);
  });
  const base = {
    'toolchain-manifest': {
      platform: 'win32',
      nodeIdentity: { version: 'v24.18.0' },
      unrelated: 'same',
    },
    'export-sidecar': {
      toolchain: { nodeIdentity: { version: 'v24.18.0' } },
      parseOutcomesReceiptDigest: 'a'.repeat(64),
      sidecarDigest: 'a'.repeat(64),
      toolchainManifestDigest: 'a'.repeat(64),
    },
    'parse-outcomes-receipt': {
      receiptDigest: 'b'.repeat(64),
      toolchainManifestDigest: 'c'.repeat(64),
    },
  };
  const allowed = structuredClone(base);
  allowed['toolchain-manifest'].platform = 'linux';
  allowed['export-sidecar'].toolchain.nodeIdentity.version = 'v24.18.1';
  allowed['export-sidecar'].parseOutcomesReceiptDigest = 'd'.repeat(64);
  allowed['export-sidecar'].sidecarDigest = 'd'.repeat(64);
  allowed['export-sidecar'].toolchainManifestDigest = 'd'.repeat(64);
  allowed['parse-outcomes-receipt'].receiptDigest = 'e'.repeat(64);
  allowed['parse-outcomes-receipt'].toolchainManifestDigest = 'f'.repeat(64);
  const allowedChanges = changedPlatformFields(base, allowed);
  assertClosedFieldSet(allowedChanges);
  assert.deepEqual(allowedChanges, [
    ['export-sidecar', 'parseOutcomesReceiptDigest'],
    ['export-sidecar', 'sidecarDigest'],
    ['export-sidecar', 'toolchain.nodeIdentity.version'],
    ['export-sidecar', 'toolchainManifestDigest'],
    ['parse-outcomes-receipt', 'receiptDigest'],
    ['parse-outcomes-receipt', 'toolchainManifestDigest'],
    ['toolchain-manifest', 'platform'],
  ]);
  assert.throws(
    () => assertClosedFieldSet([['toolchain-manifest', 'unrelated']]),
    /unlisted platform difference/u,
  );
  const emptyObjectCandidate = structuredClone(base);
  emptyObjectCandidate['export-sidecar'].unlistedEmptyObject = {};
  assert.throws(
    () => assertClosedFieldSet(changedPlatformFields(base, emptyObjectCandidate)),
    /unlisted platform difference/u,
  );
});

test('Task 6C validates closed actual-platform receipt schemas', () => {
  for (const platform of ['win32', 'linux']) {
    const receipt = pendingPlatformReceipt(platform);
    const bytes = Buffer.from(canonicalJsonText(receipt), 'utf8');
    assert.deepEqual(validatePendingPlatformReceipt(bytes, platform), receipt);
  }
});

test('Task 6C rejects receipt frame identity mismatch before decode', () => {
  const receipt = pendingPlatformReceipt('win32');
  const bytes = Buffer.from(canonicalJsonText(receipt), 'utf8');
  assert.throws(
    () => validatePendingPlatformReceipt(bytes, 'win32', 'f'.repeat(64)),
    /frameSha256/u,
  );
});

test('Task 6C binds exact receipt fields to bounded raw bytes', () => {
  const receipt = pendingPlatformReceipt('win32');
  const frameBytes = Buffer.from('synthetic-frame', 'utf8');
  const profileBytes = Buffer.from(PINNED_PROFILE);
  const artifactBytes = receipt.artifacts.map((artifact) => Buffer.from(artifact.id, 'utf8'));
  receipt.frameByteLength = frameBytes.length;
  receipt.frameSha256 = sha256(frameBytes);
  receipt.artifacts = receipt.artifacts.map((artifact, index) => {
    const body = artifactBytes[index];
    return { ...artifact, byteLength: body.length, sha256: sha256(body) };
  });
  const bytes = Buffer.from(canonicalJsonText(receipt), 'utf8');
  assert.deepEqual(
    validatePendingPlatformReceipt(bytes, 'win32', null, true, frameBytes, profileBytes, artifactBytes),
    receipt,
  );
  const changedFrame = Buffer.from(frameBytes);
  changedFrame[0] ^= 0xff;
  assert.throws(
    () => validatePendingPlatformReceipt(bytes, 'win32', null, true, changedFrame, profileBytes, artifactBytes),
    /frameSha256/u,
  );
});

test('Task 6C defines the pending actual-platform observation runner', () => {
  const profileBytes = Buffer.from(PINNED_PROFILE);
  const frameBytes = Buffer.from('synthetic-frame', 'utf8');
  const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(id, 'utf8'));
  for (const platform of ['win32', 'linux']) {
    const { receipt, receiptBytes } = buildPendingPlatformObservation({
      platform,
      profileBytes,
      frameBytes,
      artifactBytes,
    });
    assert.equal(receipt.status, 'PENDING_EXACT_BYTES');
    assert.equal(receiptBytes.includes(0x0a), false);
    assert.equal(receiptBytes.includes(0x0d), false);
    assert.equal(receipt.profileByteLength, profileBytes.length);
    assert.equal(receipt.frameByteLength, frameBytes.length);
    assert.deepEqual(
      receipt.artifacts.map(({ id, byteLength, sha256: digest }) => ({ id, byteLength, digest })),
      artifactBytes.map((body, index) => ({
        id: PLATFORM_ARTIFACT_IDS[index],
        byteLength: body.length,
        digest: sha256(body),
      })),
    );
  }
  const concrete = buildPendingPlatformObservation({
    platform: 'win32',
    profileBytes,
    frameBytes,
    artifactBytes: artifactBytes.map((body, index) => index === PLATFORM_ARTIFACT_IDS.indexOf('toolchain-manifest')
      ? Buffer.from(JSON.stringify({
        gitIdentity: { version: '2.55.0.5', executableByteLength: 1, executableRawSha256: 'c'.repeat(64) },
        nodeIdentity: { version: 'v24.18.0', executableByteLength: 1, executableRawSha256: 'd'.repeat(64) },
      }), 'utf8')
      : body),
    producerTree: '2'.repeat(40),
    metadata: {
      git: {
        commitOid: GENUINE_COMMIT,
        treeOid: '2'.repeat(40),
        blobModes: '100644',
      },
      platformPinRecords: [
        { platform: 'win32', arch: 'x64', recordId: 'win32-x64', recordDigest: 'a'.repeat(64) },
        { platform: 'linux', arch: 'x64', recordId: 'linux-x64', recordDigest: 'b'.repeat(64) },
      ],
      selectedIdentities: {
        git: { version: '2.55.0.5', executableByteLength: 1, executableRawSha256: 'c'.repeat(64) },
        node: { version: 'v24.18.0', executableByteLength: 1, executableRawSha256: 'd'.repeat(64) },
      },
      selectedPinIdentities: {
        git: { version: '2.55.0.5', executableByteLength: 1, executableRawSha256: 'c'.repeat(64) },
        node: { version: 'v24.18.0', executableByteLength: 1, executableRawSha256: 'd'.repeat(64) },
      },
    },
  });
  assert.equal(concrete.receipt.git.blobModes, '100644');
  assert.equal(concrete.receipt.platformPinRecordId, 'win32-x64');
  assert.equal(concrete.receipt.selectedIdentities.node.version, 'v24.18.0');
  assert.throws(() => buildPendingPlatformObservation({
    platform: 'win32',
    profileBytes,
    frameBytes,
    artifactBytes: artifactBytes.map((body, index) => index === PLATFORM_ARTIFACT_IDS.indexOf('toolchain-manifest')
      ? Buffer.from(JSON.stringify({
        gitIdentity: { version: '2.55.0.5', executableByteLength: 1, executableRawSha256: 'c'.repeat(64) },
        nodeIdentity: { version: 'v24.18.0', executableByteLength: 1, executableRawSha256: 'd'.repeat(64) },
      }), 'utf8')
      : body),
    metadata: {
      git: { commitOid: GENUINE_COMMIT, treeOid: '1'.repeat(40), blobModes: '100644' },
      platformPinRecords: [
        { platform: 'win32', arch: 'x64', recordId: 'win32-x64', recordDigest: 'a'.repeat(64) },
        { platform: 'linux', arch: 'x64', recordId: 'linux-x64', recordDigest: 'b'.repeat(64) },
      ],
      selectedIdentities: concrete.receipt.selectedIdentities,
      selectedPinIdentities: {
        ...concrete.receipt.selectedIdentities,
        node: { ...concrete.receipt.selectedIdentities.node, version: 'v24.18.1' },
      },
    },
  }));
});

test('Task 6C binds a controlled GAAF observation to the manifest run and seven bodies', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-runner-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes }), { flag: 'wx', mode: 0o600 });

    const receipt = await emitControlledPlatformObservation({ profilePath, framePath, receiptPath });

    const platform = process.platform === 'win32' ? 'win32' : 'linux';
    assert.equal(receipt.platform, platform);
    assert.equal(receipt.runId, '6'.repeat(64));
    assert.equal(receipt.producerCommit, '2'.repeat(40));
    assert.equal(receipt.producerTree, '4'.repeat(40));
    assert.deepEqual(
      receipt.artifacts,
      artifactBytes.map((bytes, index) => ({
        id: PLATFORM_ARTIFACT_IDS[index],
        byteLength: bytes.length,
        sha256: sha256(bytes),
      })),
    );
    const receiptBytes = await readFile(receiptPath);
    assert.equal(receiptBytes.includes(0x0a), false);
    assert.equal(receiptBytes.includes(0x0d), false);
    assert.deepEqual(validatePendingPlatformReceipt(receiptBytes, platform, null, true, await readFile(framePath), PINNED_PROFILE, artifactBytes), receipt);
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C refuses a resource-receipt output collision and unbound raw artifact body', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-refusal-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'resource-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes }), { flag: 'wx', mode: 0o600 });
    const resourceReceiptBytes = Buffer.from('{"schema":"galerina.logic-aig-task6-resource-receipt.v1"}', 'utf8');
    await writeFile(receiptPath, resourceReceiptBytes, { flag: 'wx', mode: 0o600 });
    await assert.rejects(
      () => emitControlledPlatformObservation({ profilePath, framePath, receiptPath }),
      /HOLD_PLATFORM_RECEIPT_OUTPUT/u,
    );
    assert.deepEqual(await readFile(receiptPath), resourceReceiptBytes);
    await rm(receiptPath, { force: false });

    const mismatchedDigests = artifactBytes.map((body) => sha256(body));
    mismatchedDigests[0] = '0'.repeat(64);
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes, artifactDigestOverride: mismatchedDigests }), { flag: 'w', mode: 0o600 });
    await assert.rejects(
      () => emitControlledPlatformObservation({ profilePath, framePath, receiptPath }),
      /HOLD_PLATFORM_ARTIFACT_BINDING/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C rejects a GAAF artifact role that diverges from the pinned profile', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-role-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    const roles = [...PLATFORM_ARTIFACT_ROLES];
    roles[3] = 'project';
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes, artifactRoleOverride: roles }), { flag: 'wx', mode: 0o600 });
    await assert.rejects(
      () => emitControlledPlatformObservation({ profilePath, framePath, receiptPath }),
      /HOLD_PLATFORM_MANIFEST/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C rejects a GAAF graph that does not match the frozen producer closure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-graph-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    const graph = { ...PLATFORM_GRAPH, nodes: [...PLATFORM_GRAPH.nodes], edges: [] };
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes, graphOverride: graph }), { flag: 'wx', mode: 0o600 });
    await assert.rejects(
      () => emitControlledPlatformObservation({ profilePath, framePath, receiptPath }),
      /HOLD_PLATFORM_MANIFEST/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C rejects a high-bit GAAF magic spoof before manifest decoding', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-magic-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    const frame = syntheticGAAFFrame({ artifactBytes });
    frame[0] = 0xc7;
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, frame, { flag: 'wx', mode: 0o600 });
    await assert.rejects(
      () => emitControlledPlatformObservation({ profilePath, framePath, receiptPath }),
      /HOLD_PLATFORM_FRAME_SCHEMA/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C refuses a partial controlled actual-platform runner environment', async () => {
  const name = 'GALERINA_TASK6C_PLATFORM_FRAME_PATH';
  const prior = process.env[name];
  try {
    process.env[name] = 'controlled-frame.gaaf';
    await assert.rejects(
      () => runControlledPlatformObservationFromEnvironment(),
      /HOLD_PLATFORM_CONTROLLED_INPUT/u,
    );
  } finally {
    if (prior === undefined) delete process.env[name];
    else process.env[name] = prior;
  }
});

test('Task 6C refuses supplied platform runner locators without exact activation', async () => {
  const names = [...CONTROLLED_PLATFORM_RUNNER_ENV, CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV];
  const prior = new Map(names.map((name) => [name, process.env[name]]));
  try {
    process.env.GALERINA_TASK6C_PLATFORM_FRAME_PATH = 'controlled-frame.gaaf';
    process.env.GALERINA_TASK6C_PLATFORM_PROFILE_PATH = 'controlled-profile.json';
    process.env.GALERINA_TASK6C_PLATFORM_RECEIPT_PATH = 'controlled-receipt.json';
    delete process.env[CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV];
    await assert.rejects(
      () => runControlledPlatformObservationFromEnvironment(),
      /HOLD_PLATFORM_CONTROLLED_INPUT/u,
    );
    process.env[CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV] = '0';
    await assert.rejects(
      () => runControlledPlatformObservationFromEnvironment(),
      /HOLD_PLATFORM_CONTROLLED_INPUT/u,
    );
  } finally {
    for (const [name, value] of prior) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('Task 6C refuses a case-aliased platform runner environment key', async () => {
  const alias = 'galerina_task6c_platform_frame_path';
  const names = [...CONTROLLED_PLATFORM_RUNNER_ENV, CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV, alias];
  const prior = new Map(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    process.env[alias] = 'case-aliased-frame.gaaf';
    await assert.rejects(
      () => runControlledPlatformObservationFromEnvironment(),
      /HOLD_PLATFORM_CONTROLLED_INPUT/u,
    );
  } finally {
    for (const [name, value] of prior) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('Task 6C exercises a synthetic controlled actual-platform receipt runner', async () => {
  const names = [...CONTROLLED_PLATFORM_RUNNER_ENV, CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV];
  const prior = new Map(names.map((name) => [name, process.env[name]]));
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-environment-'));
  try {
    for (const name of CONTROLLED_PLATFORM_RUNNER_ENV) delete process.env[name];
    assert.equal(await runControlledPlatformObservationFromEnvironment(), null);
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes }), { flag: 'wx', mode: 0o600 });
    process.env.GALERINA_TASK6C_PLATFORM_FRAME_PATH = framePath;
    process.env.GALERINA_TASK6C_PLATFORM_PROFILE_PATH = profilePath;
    process.env.GALERINA_TASK6C_PLATFORM_RECEIPT_PATH = receiptPath;
    process.env[CONTROLLED_PLATFORM_RUNNER_ACTIVATION_ENV] = '1';
    const receipt = await runControlledPlatformObservationFromEnvironment();
    const platform = process.platform === 'win32' ? 'win32' : process.platform === 'linux' ? 'linux' : null;
    assert.notEqual(platform, null);
    assert.equal(receipt.platform, platform);
    assert.equal(receipt.arch, 'x64');
    assert.equal(receipt.authorizing, false);
    assert.equal(receipt.status, 'PENDING_EXACT_BYTES');
  } finally {
    for (const [name, value] of prior) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C captures a controlled actual-platform receipt from supplied environment', async () => {
  const receipt = await runControlledPlatformObservationFromEnvironment();
  if (receipt === null) return;
  assert.notEqual(receipt, null);
  const platform = process.platform === 'win32' ? 'win32' : process.platform === 'linux' ? 'linux' : null;
  assert.notEqual(platform, null);
  assert.equal(receipt.platform, platform);
  assert.equal(receipt.arch, 'x64');
  assert.equal(receipt.authorizing, false);
  assert.equal(receipt.status, 'PENDING_EXACT_BYTES');
});

test('Task 6C validates a controlled supplied actual-platform receipt', async () => {
  const receipt = await runControlledPlatformReceiptValidationFromEnvironment();
  if (receipt === null) return;
  assert.equal(receipt.producerCommit, process.env.GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT);
});

test('Task 6C platform receipt validation entry point binds a supplied canonical receipt to the expected producer commit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-validator-'));
  try {
    const platform = process.platform === 'win32' ? 'win32' : process.platform === 'linux' ? 'linux' : null;
    assert.notEqual(platform, null);
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    const { receiptBytes } = buildPendingPlatformObservation({
      platform,
      profileBytes: PINNED_PROFILE,
      frameBytes: syntheticGAAFFrame({ artifactBytes, commitOid: GENUINE_COMMIT }),
      artifactBytes,
      producerTree: '4'.repeat(40),
      runId: '6'.repeat(64),
    });
    await writeFile(receiptPath, receiptBytes, { flag: 'wx', mode: 0o600 });
    const environment = {
      ...process.env,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH: receiptPath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT: GENUINE_COMMIT,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN: '1',
    };
    delete environment.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, [
      '--test', '--test-reporter=tap', '--test-name-pattern',
      '^Task 6C validates a controlled supplied actual-platform receipt$',
      fileURLToPath(import.meta.url),
    ], {
      encoding: 'utf8',
      cwd: directory,
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1_048_576,
      env: environment,
    });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stdout + child.stderr);
    assert.deepEqual(await readdir(directory), ['platform-receipt.json']);
    assert.deepEqual(await readFile(receiptPath), receiptBytes);
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C platform receipt validation entry point accepts the opposite platform and refuses unsupported declarations', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-validator-reciprocal-'));
  try {
    const oppositePlatform = process.platform === 'win32' ? 'linux' : process.platform === 'linux' ? 'win32' : null;
    assert.notEqual(oppositePlatform, null);
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    const { receipt, receiptBytes } = buildPendingPlatformObservation({
      platform: oppositePlatform,
      profileBytes: PINNED_PROFILE,
      frameBytes: syntheticGAAFFrame({ artifactBytes, commitOid: GENUINE_COMMIT }),
      artifactBytes,
      producerTree: '4'.repeat(40),
      runId: '6'.repeat(64),
    });
    const receiptPath = join(directory, 'platform-receipt.json');
    const environment = {
      ...process.env,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH: receiptPath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT: GENUINE_COMMIT,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN: '1',
    };
    delete environment.NODE_TEST_CONTEXT;
    const cases = [
      ['opposite platform', oppositePlatform, true],
      ['unsupported platform', 'darwin', false],
      ['case-aliased platform', 'Linux', false],
      ['null platform', null, false],
      ['non-string platform', ['linux'], false],
    ];
    for (const [label, declaredPlatform, accepted] of cases) {
      await t.test(label, async () => {
        const bytes = accepted ? receiptBytes : Buffer.from(canonicalJsonText({ ...receipt, platform: declaredPlatform }), 'utf8');
        await writeFile(receiptPath, bytes, { flag: accepted ? 'wx' : 'w', mode: 0o600 });
        const child = spawnSync(process.execPath, [
          '--test', '--test-reporter=tap', '--test-name-pattern',
          '^Task 6C validates a controlled supplied actual-platform receipt$',
          fileURLToPath(import.meta.url),
        ], {
          encoding: 'utf8',
          cwd: directory,
          windowsHide: true,
          timeout: 30_000,
          maxBuffer: 1_048_576,
          env: environment,
        });
        assert.equal(child.error, undefined);
        if (accepted) assert.equal(child.status, 0, child.stdout + child.stderr);
        else {
          assert.notEqual(child.status, 0);
          assert.match(child.stdout, /HOLD_PLATFORM_RECEIPT_SCHEMA/u);
        }
        assert.deepEqual(await readdir(directory), ['platform-receipt.json']);
        assert.deepEqual(await readFile(receiptPath), bytes);
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C platform receipt validation entry point refuses a canonical receipt bound to a different producer commit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-validator-refusal-'));
  try {
    const platform = process.platform === 'win32' ? 'win32' : process.platform === 'linux' ? 'linux' : null;
    assert.notEqual(platform, null);
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    const { receiptBytes } = buildPendingPlatformObservation({
      platform,
      profileBytes: PINNED_PROFILE,
      frameBytes: syntheticGAAFFrame({ artifactBytes, commitOid: 'f'.repeat(40) }),
      artifactBytes,
      producerCommit: 'f'.repeat(40),
      producerTree: '4'.repeat(40),
      runId: '6'.repeat(64),
    });
    await writeFile(receiptPath, receiptBytes, { flag: 'wx', mode: 0o600 });
    const environment = {
      ...process.env,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH: receiptPath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT: GENUINE_COMMIT,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN: '1',
    };
    delete environment.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, [
      '--test', '--test-reporter=tap', '--test-name-pattern',
      '^Task 6C validates a controlled supplied actual-platform receipt$',
      fileURLToPath(import.meta.url),
    ], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1_048_576,
      env: environment,
    });
    assert.equal(child.error, undefined);
    assert.notEqual(child.status, 0);
    assert.match(child.stdout, /HOLD_PLATFORM_RECEIPT_IDENTITY/u);
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C platform receipt validation entry point refuses malformed UTF-8 in a concrete receipt', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-validator-utf8-'));
  try {
    const platform = process.platform === 'win32' ? 'win32' : process.platform === 'linux' ? 'linux' : null;
    assert.notEqual(platform, null);
    const selectedIdentities = {
      git: { version: 'git-\ufffd', executableByteLength: 1, executableRawSha256: 'c'.repeat(64) },
      node: { version: 'node-test', executableByteLength: 1, executableRawSha256: 'd'.repeat(64) },
    };
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => id === 'toolchain-manifest'
      ? Buffer.from(canonicalJsonText({ gitIdentity: selectedIdentities.git, nodeIdentity: selectedIdentities.node }), 'utf8')
      : Buffer.from(`body:${id}`, 'utf8'));
    const { receiptBytes } = buildPendingPlatformObservation({
      platform,
      profileBytes: PINNED_PROFILE,
      frameBytes: syntheticGAAFFrame({ artifactBytes, commitOid: GENUINE_COMMIT }),
      artifactBytes,
      producerTree: '4'.repeat(40),
      runId: '6'.repeat(64),
      metadata: {
        git: { commitOid: GENUINE_COMMIT, treeOid: '4'.repeat(40), blobModes: '100644' },
        platformPinRecords: [
          { platform: 'win32', arch: 'x64', recordId: 'win32-x64', recordDigest: 'a'.repeat(64) },
          { platform: 'linux', arch: 'x64', recordId: 'linux-x64', recordDigest: 'b'.repeat(64) },
        ],
        selectedIdentities,
        selectedPinIdentities: selectedIdentities,
      },
    });
    const replacement = Buffer.from('\ufffd', 'utf8');
    const replacementIndex = receiptBytes.indexOf(replacement);
    assert.notEqual(replacementIndex, -1);
    const malformedBytes = Buffer.concat([
      receiptBytes.subarray(0, replacementIndex),
      Buffer.from([0xff]),
      receiptBytes.subarray(replacementIndex + replacement.length),
    ]);
    assert.equal(malformedBytes.toString('utf8'), receiptBytes.toString('utf8'));
    assert.throws(() => new TextDecoder('utf-8', { fatal: true }).decode(malformedBytes), TypeError);
    const receiptPath = join(directory, 'platform-receipt.json');
    const environment = {
      ...process.env,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH: receiptPath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT: GENUINE_COMMIT,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN: '1',
    };
    delete environment.NODE_TEST_CONTEXT;
    for (const bytes of [receiptBytes, malformedBytes]) {
      await writeFile(receiptPath, bytes, { flag: bytes === receiptBytes ? 'wx' : 'w', mode: 0o600 });
      const child = spawnSync(process.execPath, [
        '--test', '--test-reporter=tap', '--test-name-pattern',
        '^Task 6C validates a controlled supplied actual-platform receipt$',
        fileURLToPath(import.meta.url),
      ], {
        encoding: 'utf8',
        cwd: directory,
        windowsHide: true,
        timeout: 30_000,
        maxBuffer: 1_048_576,
        env: environment,
      });
      assert.equal(child.error, undefined);
      if (bytes === receiptBytes) assert.equal(child.status, 0, child.stdout + child.stderr);
      else {
        assert.notEqual(child.status, 0, 'malformed UTF-8 must not be accepted after replacement decoding');
        assert.match(child.stdout, /HOLD_PLATFORM_RECEIPT_SCHEMA/u);
      }
      assert.deepEqual(await readdir(directory), ['platform-receipt.json']);
      assert.deepEqual(await readFile(receiptPath), bytes);
    }
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C platform receipt entry points refuse every mixed control direction before output', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-mixed-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const validationPath = join(directory, 'validation.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes }), { flag: 'wx', mode: 0o600 });
    const captureControls = {
      GALERINA_TASK6C_PLATFORM_FRAME_PATH: framePath,
      GALERINA_TASK6C_PLATFORM_PROFILE_PATH: profilePath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_PATH: join(directory, 'unused-receipt.json'),
      GALERINA_TASK6C_PLATFORM_RECEIPT_RUN: '1',
    };
    const validationControls = {
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH: validationPath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT: GENUINE_COMMIT,
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN: '1',
    };
    const entryPoints = [
      ['capture', captureControls, validationControls, '^Task 6C captures a controlled actual-platform receipt from supplied environment$'],
      ['validation', validationControls, captureControls, '^Task 6C validates a controlled supplied actual-platform receipt$'],
    ];
    let index = 0;
    for (const [mode, controls, conflicts, pattern] of entryPoints) {
      for (const [name, value] of Object.entries(conflicts)) {
        for (const conflictingValue of [value, '']) {
          await t.test(`${mode} refuses ${name}${conflictingValue === '' ? ' empty' : ''}`, async () => {
            const receiptPath = join(directory, `refused-${index++}.json`);
            const environment = { ...process.env };
            for (const control of [...Object.keys(captureControls), ...Object.keys(validationControls)]) delete environment[control];
            Object.assign(environment, controls, { [name]: conflictingValue });
            if (mode === 'capture' || name === 'GALERINA_TASK6C_PLATFORM_RECEIPT_PATH') {
              environment.GALERINA_TASK6C_PLATFORM_RECEIPT_PATH = conflictingValue === '' && mode === 'validation' ? '' : receiptPath;
            }
            delete environment.NODE_TEST_CONTEXT;
            const child = spawnSync(process.execPath, [
              '--test', '--test-reporter=tap', '--test-name-pattern', pattern, fileURLToPath(import.meta.url),
            ], {
              encoding: 'utf8',
              cwd: directory,
              windowsHide: true,
              timeout: 30_000,
              maxBuffer: 1_048_576,
              env: environment,
            });
            assert.equal(child.error, undefined);
            await assert.rejects(lstat(receiptPath), { code: 'ENOENT' });
            assert.notEqual(child.status, 0);
            assert.match(child.stdout, /HOLD_PLATFORM_CONTROLLED_INPUT/u);
          });
        }
      }
    }
    await assert.rejects(lstat(validationPath), { code: 'ENOENT' });
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C proves the platform receipt entry point consumes supplied locators', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-platform-entrypoint-'));
  try {
    const profilePath = join(directory, 'profile.json');
    const framePath = join(directory, 'frame.gaaf');
    const receiptPath = join(directory, 'platform-receipt.json');
    const artifactBytes = PLATFORM_ARTIFACT_IDS.map((id) => Buffer.from(`body:${id}`, 'utf8'));
    await writeFile(profilePath, PINNED_PROFILE, { flag: 'wx', mode: 0o600 });
    await writeFile(framePath, syntheticGAAFFrame({ artifactBytes }), { flag: 'wx', mode: 0o600 });
    const environment = {
      ...process.env,
      GALERINA_TASK6C_PLATFORM_RECEIPT_RUN: '1',
      GALERINA_TASK6C_PLATFORM_FRAME_PATH: framePath,
      GALERINA_TASK6C_PLATFORM_PROFILE_PATH: profilePath,
      GALERINA_TASK6C_PLATFORM_RECEIPT_PATH: receiptPath,
    };
    delete environment.NODE_TEST_CONTEXT;
    const child = spawnSync(process.execPath, [
      '--test', '--test-reporter=tap', '--test-name-pattern',
      '^Task 6C captures a controlled actual-platform receipt from supplied environment$',
      fileURLToPath(import.meta.url),
    ], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1_048_576,
      env: environment,
    });
    assert.equal(child.error, undefined);
    assert.equal(child.status, 0, child.stderr);
    const receiptBytes = await readFile(receiptPath);
    const platform = process.platform === 'win32' ? 'win32' : 'linux';
    assert.deepEqual(validatePendingPlatformReceipt(receiptBytes, platform, null, true, await readFile(framePath), PINNED_PROFILE, artifactBytes).runId, '6'.repeat(64));
  } finally {
    await rm(directory, { recursive: true, force: false });
  }
});

test('Task 6C platform receipt entry point refuses supplied locators lacking activation', () => {
  const environment = {
    ...process.env,
    GALERINA_TASK6C_PLATFORM_FRAME_PATH: 'controlled-frame.gaaf',
    GALERINA_TASK6C_PLATFORM_PROFILE_PATH: 'controlled-profile.json',
    GALERINA_TASK6C_PLATFORM_RECEIPT_PATH: 'controlled-receipt.json',
  };
  delete environment.NODE_TEST_CONTEXT;
  delete environment.GALERINA_TASK6C_PLATFORM_RECEIPT_RUN;
  const child = spawnSync(process.execPath, [
    '--test', '--test-reporter=tap', '--test-name-pattern',
    '^Task 6C captures a controlled actual-platform receipt from supplied environment$',
    fileURLToPath(import.meta.url),
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1_048_576,
    env: environment,
  });
  assert.equal(child.error, undefined);
  assert.notEqual(child.status, 0);
  assert.match(child.stdout, /HOLD_PLATFORM_CONTROLLED_INPUT/u);
});

test('Task 6C platform receipt entry point refuses an explicitly empty locator', () => {
  const environment = { ...process.env, GALERINA_TASK6C_PLATFORM_FRAME_PATH: '' };
  delete environment.NODE_TEST_CONTEXT;
  delete environment.GALERINA_TASK6C_PLATFORM_RECEIPT_RUN;
  delete environment.GALERINA_TASK6C_PLATFORM_PROFILE_PATH;
  delete environment.GALERINA_TASK6C_PLATFORM_RECEIPT_PATH;
  const child = spawnSync(process.execPath, [
    '--test', '--test-reporter=tap', '--test-name-pattern',
    '^Task 6C captures a controlled actual-platform receipt from supplied environment$',
    fileURLToPath(import.meta.url),
  ], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1_048_576,
    env: environment,
  });
  assert.equal(child.error, undefined);
  assert.notEqual(child.status, 0);
  assert.match(child.stdout, /HOLD_PLATFORM_CONTROLLED_INPUT/u);
});

test('Task 6C grants 80 MiB only to the pinned root rule', async () => {
  const frameModule = await import(FRAME_MODULE_URL);
  assert.equal(typeof frameModule.buildFrozenGitAdmissionFrame, 'function');
  const changed = Buffer.from(PINNED_PROFILE_JSON.replace('83886080', '67108864'), 'utf8');
  assert.equal(
    await refusalCode(() => frameModule.buildFrozenGitAdmissionFrame({
      commitOid: 'not-a-commit',
      profileBytes: changed,
      runId: RUN_ID,
    })),
    'REFUSED_PROFILE_CANONICAL',
  );
});

test('Task 6C reproduces the five exact capacity rows', () => {
  const result = spawnSync(process.execPath, [FRAME_CLI, '--self-test'], {
    encoding: 'utf8',
    timeout: 120_000,
    windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'SELF_TEST_OK\n');
  assert.equal(result.stderr, '');
});

test('Task 6C seals capacity output before path creation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-red-'));
  const profilePath = join(directory, 'profile.json');
  const outPath = join(directory, 'frame.bin');
  try {
    await writeFile(profilePath, PINNED_PROFILE);
    const result = spawnSync(process.execPath, [
      FRAME_CLI,
      '--commit', 'not-a-commit',
      '--profile', profilePath,
      '--out', outPath,
    ], {
      encoding: 'utf8',
      timeout: 120_000,
      windowsHide: true,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'REFUSED_OPTIONS_CAPTURE\n');
    await assert.rejects(access(outPath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Task 6C applies profile canonicality before commit and random prerequisites', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'galerina-task6c-precedence-'));
  const profilePath = join(directory, 'profile.json');
  const outPath = join(directory, 'frame.bin');
  try {
    const changed = Buffer.from(PINNED_PROFILE);
    changed[0] ^= 1;
    await writeFile(profilePath, changed);
    const result = spawnSync(process.execPath, [
      FRAME_CLI,
      '--commit', 'not-a-commit',
      '--profile', profilePath,
      '--out', outPath,
    ], {
      encoding: 'utf8',
      timeout: 120_000,
      windowsHide: true,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'REFUSED_PROFILE_CANONICAL\n');
    await assert.rejects(access(outPath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Task 6C wrapper settlement shadows inherited then without changing frame bytes', { timeout: 900_000 }, () => {
  const childSource = `
    import { createHash } from 'node:crypto';
    const frameModule = await import(${JSON.stringify(FRAME_MODULE_URL.href)});
    const inherited = Object.getOwnPropertyDescriptor(Object.prototype, 'then');
    let calls = 0;
    const poison = Object.create(null);
    poison.configurable = true;
    poison.enumerable = false;
    poison.value = function inheritedThen(resolve) { calls += 1; resolve(null); };
    poison.writable = true;
    Object.defineProperty(Object.prototype, 'then', poison);
    let frame;
    let reassimilated;
    try {
      frame = await frameModule.buildFrozenGitAdmissionFrame({
        commitOid: ${JSON.stringify(GENUINE_COMMIT)},
        profileBytes: Buffer.from(${JSON.stringify(PINNED_PROFILE_JSON)}, 'utf8'),
        runId: ${JSON.stringify(RUN_ID)},
      });
      reassimilated = await Promise.resolve(frame);
    } finally {
      if (inherited) Object.defineProperty(Object.prototype, 'then', inherited);
      else delete Object.prototype.then;
    }
    const manifestByteLength = frame.readUInt32BE(5);
    const manifest = JSON.parse(frame.subarray(9, 9 + manifestByteLength).toString('utf8'));
    let cursor = 9 + manifestByteLength;
    const count = frame.readUInt16BE(cursor);
    cursor += 2;
    const bodyRows = [];
    for (let index = 0; index < count; index += 1) {
      const idByteLength = frame.readUInt16BE(cursor);
      cursor += 2;
      const id = frame.subarray(cursor, cursor + idByteLength).toString('utf8');
      cursor += idByteLength;
      const byteLength = Number(frame.readBigUInt64BE(cursor));
      cursor += 8;
      const body = frame.subarray(cursor, cursor + byteLength);
      cursor += byteLength;
      bodyRows.push({
        id,
        byteLength,
        sha256: createHash('sha256').update(body).digest('hex'),
        unresolvedRowByteLength: id === 'export-sidecar'
          ? Buffer.byteLength(JSON.stringify(JSON.parse(body.toString('utf8')).unresolved.rows), 'utf8')
          : null,
      });
    }
    const payloadByteLength = bodyRows.reduce((sum, row) => sum + row.byteLength, 0);
    const frameWithoutManifest = frame.length - manifestByteLength;
    const descriptor = frame && Object.getOwnPropertyDescriptor(frame, 'then');
    process.stdout.write(JSON.stringify({
      calls,
      isBuffer: Buffer.isBuffer(frame),
      same: reassimilated === frame,
      descriptor: descriptor ? {
        valueIsUndefined: descriptor.value === undefined,
        writable: descriptor.writable,
        enumerable: descriptor.enumerable,
        configurable: descriptor.configurable,
      } : null,
      frameByteLength: frame.length,
      manifestByteLength,
      count,
      cursor,
      bodyRows,
      manifestRows: manifest.artifacts,
      graph: manifest.graph,
      payloadByteLength,
      frameWithoutManifest,
      headroomBeforeManifest: 134217728 - frameWithoutManifest,
    }) + '\\n');
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', childSource], {
    encoding: 'utf8',
    timeout: 900_000,
    windowsHide: true,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const observed = JSON.parse(result.stdout);
  assert.deepEqual(observed, {
    calls: 0,
    isBuffer: true,
    same: true,
    descriptor: {
      valueIsUndefined: true,
      writable: false,
      enumerable: false,
      configurable: false,
    },
    frameByteLength: observed.frameByteLength,
    manifestByteLength: observed.manifestByteLength,
    count: 7,
    cursor: observed.frameByteLength,
    bodyRows: observed.bodyRows,
    manifestRows: observed.manifestRows,
    graph: observed.graph,
    payloadByteLength: observed.payloadByteLength,
    frameWithoutManifest: observed.frameWithoutManifest,
    headroomBeforeManifest: observed.headroomBeforeManifest,
  });
  assert.equal(observed.frameByteLength <= 134_217_728, true);
  assert.equal(observed.manifestByteLength <= 1_048_576, true);
  assert.deepEqual(observed.bodyRows.map(({ id }) => id), [
    'expected-parse-outcomes', 'export-sidecar', 'parse-outcomes-receipt',
    'project', 'resolution-inputs', 'source-manifest', 'toolchain-manifest',
  ]);
  assert.deepEqual(observed.bodyRows, observed.manifestRows.map(({ id, byteLength, sha256 }) => ({
    id,
    byteLength,
    sha256,
    unresolvedRowByteLength: id === 'export-sidecar' ? 75091268 : null,
  })));
  assert.equal(observed.bodyRows.reduce((sum, row) => sum + row.byteLength, 0), observed.payloadByteLength);
  assert.equal(observed.bodyRows.find((row) => row.id === 'export-sidecar').unresolvedRowByteLength, 75091268);
  assert.equal(observed.payloadByteLength, 111870916);
  assert.equal(observed.bodyRows.find((row) => row.id === 'export-sidecar').byteLength, 75099849);
  assert.equal(observed.frameWithoutManifest, 111871113);
  assert.equal(observed.headroomBeforeManifest, 22346615);
  for (const row of observed.manifestRows) {
    assert.equal(row.byteLength <= (row.id === 'export-sidecar' ? 83886080 : 67108864), true);
  }
  assert.equal(observed.graph.root, 'export-sidecar');
  assert.deepEqual(observed.graph.nodes, observed.bodyRows.map(({ id }) => id));
  assert.deepEqual(observed.graph.edges, [
    { from: 'export-sidecar', kind: 'requires', to: 'expected-parse-outcomes' },
    { from: 'export-sidecar', kind: 'requires', to: 'parse-outcomes-receipt' },
    { from: 'export-sidecar', kind: 'requires', to: 'project' },
    { from: 'export-sidecar', kind: 'requires', to: 'resolution-inputs' },
    { from: 'export-sidecar', kind: 'requires', to: 'source-manifest' },
    { from: 'export-sidecar', kind: 'requires', to: 'toolchain-manifest' },
  ]);
});
