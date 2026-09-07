import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import childProcess from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isProxy } from 'node:util/types';
import { canonicalJsonText } from '../../lib/logic-aig-source-origin/contract.mjs';
import { gradeCompleteProcessTreeResourceReceipt } from '../../lib/logic-aig-source-origin/process-tree-resource.mjs';

// Test infrastructure only. No caller chooses an executable, command, verifier,
// environment, artifact basename, or profile. Later workflow phases remain closed.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const CODE = 'HOLD_TASK6CR_CUSTODY';
const MAXIMUM = 134217728;
const CHILD_MAXIMUM = 1048576;
const CHILD_TIMEOUT = 30000;
const PROFILE_SHA256 = '8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e';
const NAMES = Object.freeze(['frame.gaaf', 'profile.json', 'platform-receipt.json',
  'resource-receipt.json', 'native-build.log', 'rd0873-artifact-binding.json', 'custody.json']);
const JOBS = Object.freeze(['producer-windows', 'producer-linux', 'reciprocal-windows', 'reciprocal-linux']);
const KINDS = Object.freeze({
  'profile-source': 'scripts/galerina-source-origin-frame.mjs',
  workflow: '.github/workflows/platform-smoke.yml',
  'windows-fixture': 'scripts/tests/fixtures/rd0873-task6-producer-windows-x64.v1.json',
  'linux-fixture': 'scripts/tests/fixtures/rd0873-task6-producer-linux-x64.v1.json',
});
// Exact Git executable identities retained from the governing producer pins.
const GIT_PINS = Object.freeze({
  win32: Object.freeze({ bytes: 43352, sha256: '78211c7ed73988da93a6d8a33d47ec6187f464d7ea2a9a00c182bbd7a1ecf30f', version: '2.55.0.windows.5' }),
  linux: Object.freeze({ bytes: 4576040, sha256: 'd4d2ba562243015206d4248edfec871a74786499292d00ed072dbca2f5ae8073', version: '2.55.0' }),
});
const GIT = process.platform === 'win32'
  ? path.join(ROOT, '.superpowers/sdd/2026-08-31-rd0873-portable-artifact-admission/toolchains/mingit-2.55.0.5/expanded/cmd/git.exe')
  : '/usr/bin/git';
const CONTEXT_KEYS = Object.freeze(['runId', 'runAttempt', 'job']);
const CUSTODY_KEYS = Object.freeze(['schema', ...CONTEXT_KEYS, 'root', 'rootDevice', 'rootInode', 'rootMode', 'nonce']);
const RECEIPT_CONTEXT_KEYS = Object.freeze(['mode', 'producerCommit', 'producerTree', 'agentsCommit', 'agentsTree',
  'evidenceCommit', 'runId', 'runAttempt', 'job', 'platform', 'producerRoot', 'agentsRoot']);
const VALIDATE_TEST = 'Task 6C validates a controlled supplied actual-platform receipt';
const PAYLOAD_NAMES = Object.freeze(['frame.gaaf', 'profile.json', 'rd0873-artifact-binding.json']);
const RECEIPT_NAMES = Object.freeze(['native-build.log', 'platform-receipt.json', 'resource-receipt.json', 'rd0873-artifact-binding.json']);
const BUILD_MARKER = Buffer.from('PROCESS_TREE_OBSERVER_OK\n');
const BINDING_KEYS = Object.freeze(['schema', 'runId', 'runAttempt', 'producerCommit', 'producerTree',
  'agentsCommit', 'agentsTree', 'artifactName', 'artifactKind']);
const OUTPUT_KEYS = Object.freeze(['id', 'digest', 'name', 'producerCommit', 'agentsCommit', 'runId', 'runAttempt']);
const ARTIFACT_NAMES = Object.freeze(['rd0873-task6-full-frame-windows-x64', 'rd0873-task6-receipt-windows-x64',
  'rd0873-task6-full-frame-linux-x64', 'rd0873-task6-receipt-linux-x64']);

// Closed local byte-custody contract for synthetic test infrastructure.
// Platform authentication and complete frame admission are separate obligations.
export const LOCAL_EVIDENCE_CONTRACT = Object.freeze({
  schema: 'rd0873-local-evidence-bundle.v1',
  platforms: Object.freeze(['windows-x64', 'linux-x64']),
  members: Object.freeze([
    Object.freeze({ path: 'frame.gaaf', role: 'frame' }),
    Object.freeze({ path: 'profile.json', role: 'profile' }),
    Object.freeze({ path: 'native-build.log', role: 'build-log' }),
    Object.freeze({ path: 'platform-receipt.json', role: 'platform-receipt' }),
  ]),
});

const LOCAL_CONTEXT_KEYS = Object.freeze(['platform', 'nonce', 'sourceSetDigest']);
const LOCAL_MANIFEST_KEYS = Object.freeze(['path', 'role', 'sha256', 'maxBytes']);
const LOCAL_BUNDLE_KEYS = Object.freeze(['schema', 'platform', 'nonce', 'sourceSetDigest', 'members']);
const LOCAL_BUNDLE_MEMBER_KEYS = Object.freeze(['path', 'role', 'bytes', 'bytesSha256', 'byteLength']);
const LOCAL_MAXIMUM = 1048576;
const OWNED_LOCAL_BUNDLES = new WeakSet();
const LOCAL_BUNDLE_SOURCE_SETS = new WeakMap();
const LOCAL_MEMBER_BUNDLES = new WeakMap();
const VERIFIED_LOCAL_BUNDLES = new WeakSet();

function localFailure(code) {
  const error = new Error(code);
  error.code = code;
  delete error.stack;
  throw error;
}
function localRefuse() { localFailure('REFUSED_LOCAL_CONTEXT'); }
function localHold() { localFailure('HOLD_LOCAL_EVIDENCE'); }
function localClosedObject(value, keys, failure, allowedNonEnumerable = []) {
  if (value === null || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) failure();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) failure();
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length + allowedNonEnumerable.length
    || actual.some((key) => typeof key !== 'string' || (!keys.includes(key) && !allowedNonEnumerable.includes(key)))) failure();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) failure();
  }
  for (const key of allowedNonEnumerable) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) failure();
  }
}
function localContext(context) {
  localClosedObject(context, LOCAL_CONTEXT_KEYS, localRefuse);
  if (!LOCAL_EVIDENCE_CONTRACT.platforms.includes(context.platform)
    || typeof context.nonce !== 'string' || !/^[0-9a-f]{64}$/u.test(context.nonce)
    || typeof context.sourceSetDigest !== 'string' || !/^[0-9a-f]{64}$/u.test(context.sourceSetDigest)) localHold();
  return Object.freeze({ platform: context.platform, nonce: context.nonce, sourceSetDigest: context.sourceSetDigest });
}
function localManifest(manifest) {
  if (isProxy(manifest) || !Array.isArray(manifest)) localRefuse();
  const expected = new Map(LOCAL_EVIDENCE_CONTRACT.members.map((member) => [member.path, member.role]));
  if (manifest.length !== LOCAL_EVIDENCE_CONTRACT.members.length) localHold();
  const members = [];
  for (let index = 0; index < manifest.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(manifest, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) localHold();
    const member = descriptor.value;
    localClosedObject(member, LOCAL_MANIFEST_KEYS, localHold);
    if (!expected.has(member.path)) localRefuse();
    if (typeof member.path !== 'string' || member.path.length === 0 || member.path !== path.basename(member.path)
      || member.path.includes('..') || /[\\/\x00-\x1f\x7f]/u.test(member.path)
      || typeof member.role !== 'string' || typeof member.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(member.sha256)
      || !Number.isSafeInteger(member.maxBytes) || member.maxBytes <= 0 || member.maxBytes > LOCAL_MAXIMUM) localHold();
    if (expected.get(member.path) !== member.role || members.some((entry) => entry.path === member.path)) localHold();
    members.push(Object.freeze({ path: member.path, role: member.role, sha256: member.sha256, maxBytes: member.maxBytes }));
  }
  if (members.some((member) => !expected.has(member.path))) localHold();
  return Object.freeze(members.sort((left, right) => left.path.localeCompare(right.path)));
}
function nonSerializableLocalBundle(bundle, sourceSet) {
  Object.defineProperty(bundle, 'toJSON', { enumerable: false, configurable: false, writable: false,
    value: () => localHold() });
  const frozen = Object.freeze(bundle);
  OWNED_LOCAL_BUNDLES.add(frozen);
  LOCAL_BUNDLE_SOURCE_SETS.set(frozen, sourceSet);
  LOCAL_MEMBER_BUNDLES.set(frozen.members, frozen);
  return frozen;
}

// A local source set is deliberately a closed, direct-byte interface. It neither
// selects nor consults Git, a hosted service, URLs, environment configuration, or
// a caller supplied module/callback/command.
export async function captureLocalEvidenceBundle(context, sourceRoot, manifest) {
  try {
    if (arguments.length !== 3) localRefuse();
    const admittedContext = localContext(context);
    const admittedManifest = localManifest(manifest);
    const serialized = canonicalJsonText(admittedManifest.map(({ path: memberPath, role, sha256, maxBytes }) =>
      ({ path: memberPath, role, sha256, maxBytes })));
    if (digest(Buffer.from(serialized, 'utf8')) !== admittedContext.sourceSetDigest) localHold();
    const root = absolute(sourceRoot);
    const rootAncestry = ancestry(root);
    const names = fs.readdirSync(root);
    if (names.length !== admittedManifest.length || names.some((name) => !admittedManifest.some((member) => member.path === name))) localHold();
    const captured = [];
    for (const member of admittedManifest) {
      const locator = path.join(root, member.path);
      const bytes = capturePath(locator, member.maxBytes);
      if (digest(bytes) !== member.sha256) localHold();
      captured.push(Object.freeze({ path: member.path, role: member.role, bytes: Buffer.from(bytes),
        bytesSha256: member.sha256, byteLength: bytes.length }));
    }
    recheckAncestry(rootAncestry);
    return nonSerializableLocalBundle({ schema: LOCAL_EVIDENCE_CONTRACT.schema, platform: admittedContext.platform,
      nonce: admittedContext.nonce, sourceSetDigest: admittedContext.sourceSetDigest, members: Object.freeze(captured) }, admittedManifest);
  } catch (error) {
    if (error?.code === 'REFUSED_LOCAL_CONTEXT' || error?.code === 'HOLD_LOCAL_EVIDENCE') throw error;
    localHold();
  }
}

// Verification remains a local, direct-buffer boundary.  It accepts only the
// non-serializable bundle captured above and returns no member body or locator.
export async function verifyLocalEvidenceBundle(context, bundle) {
  try {
    if (arguments.length !== 2) localRefuse();
    const admittedContext = localContext(context);
    localClosedObject(bundle, LOCAL_BUNDLE_KEYS, localHold, ['toJSON']);
    if (bundle.schema !== LOCAL_EVIDENCE_CONTRACT.schema || bundle.platform !== admittedContext.platform
      || bundle.nonce !== admittedContext.nonce || bundle.sourceSetDigest !== admittedContext.sourceSetDigest
      || isProxy(bundle.members) || !Array.isArray(bundle.members)
      || bundle.members.length !== LOCAL_EVIDENCE_CONTRACT.members.length) localHold();
    const sourceSet = [];
    const expected = new Map(LOCAL_EVIDENCE_CONTRACT.members.map((member) => [member.path, member.role]));
    for (let index = 0; index < bundle.members.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(bundle.members, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) localHold();
      const member = descriptor.value;
      localClosedObject(member, LOCAL_BUNDLE_MEMBER_KEYS, localHold);
      if (typeof member.path !== 'string' || expected.get(member.path) !== member.role
        || sourceSet.some((entry) => entry.path === member.path) || !Buffer.isBuffer(member.bytes)
        || !Number.isSafeInteger(member.byteLength) || member.byteLength !== member.bytes.length
        || member.byteLength <= 0 || member.byteLength > LOCAL_MAXIMUM
        || typeof member.bytesSha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(member.bytesSha256)
        || digest(member.bytes) !== member.bytesSha256) localHold();
      sourceSet.push(Object.freeze({ path: member.path, role: member.role, sha256: member.bytesSha256,
        maxBytes: member.byteLength }));
    }
    if (sourceSet.length !== expected.size || sourceSet.some((entry) => !expected.has(entry.path))) localHold();
    if (!OWNED_LOCAL_BUNDLES.has(bundle)) localHold();
    const capturedSourceSet = LOCAL_BUNDLE_SOURCE_SETS.get(bundle);
    if (!capturedSourceSet || capturedSourceSet.length !== sourceSet.length) localHold();
    for (const member of sourceSet) {
      const captured = capturedSourceSet.find((entry) => entry.path === member.path);
      if (!captured || captured.role !== member.role || captured.sha256 !== member.sha256
        || member.maxBytes > captured.maxBytes) localHold();
    }
    const sourceSetDigest = digest(Buffer.from(canonicalJsonText([...capturedSourceSet].sort((left, right) =>
      left.path.localeCompare(right.path))), 'utf8'));
    if (sourceSetDigest !== admittedContext.sourceSetDigest) localHold();
    VERIFIED_LOCAL_BUNDLES.add(bundle);
    return 'TASK6CR_LOCAL_BUNDLE_OK';
  } catch (error) {
    if (error?.code === 'REFUSED_LOCAL_CONTEXT' || error?.code === 'HOLD_LOCAL_EVIDENCE') throw error;
    localHold();
  }
}

// A reciprocal consumer receives only the already verified, direct member
// buffers.  The member-array identity is the non-forgeable local hand-off;
// neither a path nor a hosted-artifact-shaped record is an accepted input.
export async function consumeVerifiedLocalReciprocalEvidence(context, members) {
  try {
    if (arguments.length !== 2) localRefuse();
    const consumerContext = localContext(context);
    if (isProxy(members) || !Array.isArray(members)) localHold();
    const bundle = LOCAL_MEMBER_BUNDLES.get(members);
    if (!bundle || !VERIFIED_LOCAL_BUNDLES.has(bundle) || bundle.platform === consumerContext.platform) localHold();
    const sourceSet = LOCAL_BUNDLE_SOURCE_SETS.get(bundle);
    if (!sourceSet || members.length !== sourceSet.length) localHold();
    for (const member of members) {
      if (member === null || typeof member !== 'object' || !Buffer.isBuffer(member.bytes)
        || !Number.isSafeInteger(member.byteLength) || member.byteLength !== member.bytes.length
        || typeof member.bytesSha256 !== 'string' || digest(member.bytes) !== member.bytesSha256) localHold();
      const source = sourceSet.find((entry) => entry.path === member.path);
      if (!source || source.role !== member.role || source.sha256 !== member.bytesSha256
        || member.byteLength > source.maxBytes) localHold();
    }
    return 'TASK6CR_LOCAL_RECIPROCAL_OK';
  } catch (error) {
    if (error?.code === 'REFUSED_LOCAL_CONTEXT' || error?.code === 'HOLD_LOCAL_EVIDENCE') throw error;
    localHold();
  }
}

// Source/evidence authentication is the next task's prerequisite. These closed
// records are local test infrastructure, never self-authenticating provenance.
function receiptContext(context) {
  closedObject(context, RECEIPT_CONTEXT_KEYS);
  validateContext({ runId: context.runId, runAttempt: context.runAttempt, job: context.job });
  if (!['observe', 'verify'].includes(context.mode)) refuse();
  for (const key of ['producerCommit', 'producerTree', 'agentsCommit', 'agentsTree']) {
    if (typeof context[key] !== 'string' || context[key].length !== 40 || !/^[0-9a-f]{40}$/u.test(context[key])) refuse();
  }
  if (context.mode === 'observe' ? context.evidenceCommit !== null
    : typeof context.evidenceCommit !== 'string' || !/^[0-9a-f]{40}$/u.test(context.evidenceCommit)
      || context.evidenceCommit.length !== 40) refuse();
  if (!['win32', 'linux'].includes(process.platform) || process.arch !== 'x64') refuse();
  const lane = process.platform === 'win32' ? 'windows' : 'linux';
  if (!context.job.endsWith(`-${lane}`)) refuse();
  const expected = context.job.startsWith('producer-') ? process.platform : process.platform === 'win32' ? 'linux' : 'win32';
  if (context.platform !== expected || !equalPath(absolute(context.producerRoot), absolute(ROOT))) refuse();
  ancestry(context.producerRoot);
  ancestry(context.agentsRoot);
  return Object.freeze({ ...context });
}

function receiptChild(context, controls) {
  const expected = ['GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN', 'GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH',
      'GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT'];
  closedObject(controls, expected);
  for (const key of expected) if (typeof controls[key] !== 'string' || controls[key].length === 0) refuse();
  if (controls.GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN !== '1') refuse();
  for (const key of Object.keys(process.env)) if (/^(GALERINA_TASK6C_PLATFORM_|RD0873_TASK6E_)/iu.test(key)) refuse();
  const env = childEnvironment();
  const name = VALIDATE_TEST;
  Object.assign(env, controls);
  // All locators are owned inputs; this child needs no PATH or toolchain search.
  const result = childProcess.spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern',
    `^${name}$`, path.join(context.producerRoot, 'scripts/tests/logic-aig-source-origin-frame.test.mjs')], {
    cwd: context.producerRoot, env, shell: false, windowsHide: true,
    timeout: CHILD_TIMEOUT, maxBuffer: CHILD_MAXIMUM, encoding: 'buffer',
  });
  if (result.error || result.signal !== null || result.status !== 0 || !Buffer.isBuffer(result.stdout)
    || !Buffer.isBuffer(result.stderr) || result.stderr.length !== 0 || result.stdout.length > CHILD_MAXIMUM) refuse();
  const output = new TextDecoder('utf-8', { fatal: true }).decode(result.stdout);
  if (!output.includes(`ok 1 - ${name}\n`) || !/^# tests 1$/mu.test(output)
    || !/^# pass 1$/mu.test(output) || !/^# fail 0$/mu.test(output) || !/^# skipped 0$/mu.test(output)) refuse();
}

function canonicalCaptured(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const value = JSON.parse(text);
  if (!Buffer.from(canonicalJsonText(value), 'utf8').equals(bytes)) refuse();
  return value;
}

export async function validatePlatformReceiptFile(context, receiptPath) {
  try {
    if (arguments.length !== 2) refuse();
    const capturedContext = receiptContext(context);
    const locator = absolute(receiptPath);
    if (path.basename(locator) !== 'platform-receipt.json') refuse();
    const opening = fs.lstatSync(locator, { bigint: true });
    const bytes = capturePath(locator, CHILD_MAXIMUM);
    if (!sameFile(opening, fs.lstatSync(locator, { bigint: true }))) refuse();
    receiptChild(capturedContext, {
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN: '1',
      GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH: locator,
      GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT: capturedContext.producerCommit,
    });
    const closing = capturePath(locator, CHILD_MAXIMUM);
    if (!sameFile(opening, fs.lstatSync(locator, { bigint: true })) || closing.length !== bytes.length
      || digest(closing) !== digest(bytes) || !closing.equals(bytes)) refuse();
    const receipt = canonicalCaptured(bytes);
    if (receipt.platform !== capturedContext.platform || receipt.producerTree !== capturedContext.producerTree) refuse();
    return Object.freeze({ bytes, receipt });
  } catch { refuse(); }
}

export async function validateUploadBundle(context, payloadRoot, receiptRoot) {
  try {
    if (arguments.length !== 3) refuse();
    const capturedContext = receiptContext(context);
    if (!capturedContext.job.startsWith('producer-')) refuse();
    const payload = absolute(payloadRoot);
    const receipts = absolute(receiptRoot);
    const parent = path.dirname(payload);
    if (!equalPath(path.dirname(receipts), parent) || path.basename(payload) !== 'payload'
      || path.basename(receipts) !== 'receipt') refuse();
    const custody = canonicalCaptured(capturePath(path.join(parent, 'custody.json'), 4096));
    const runContext = { runId: capturedContext.runId, runAttempt: capturedContext.runAttempt, job: capturedContext.job };
    const payloadAncestry = ancestry(payload);
    const receiptAncestry = ancestry(receipts);
    const checkRoots = async () => {
      await validateOwnedRoot(custody, runContext);
      if (!equalPath(custody.root, parent)) refuse();
      const members = fs.readdirSync(parent);
      if (members.length !== 3 || members.some((name) => !['custody.json', 'payload', 'receipt'].includes(name))) refuse();
      recheckAncestry(payloadAncestry);
      recheckAncestry(receiptAncestry);
      await assertExactInventory(payload, PAYLOAD_NAMES);
      await assertExactInventory(receipts, RECEIPT_NAMES);
    };
    await checkRoots();
    const platform = await validatePlatformReceiptFile(capturedContext, path.join(receipts, 'platform-receipt.json'));
    await checkRoots();
    const resource = canonicalCaptured(capturePath(path.join(receiptRoot, 'resource-receipt.json'), CHILD_MAXIMUM));
    if (gradeCompleteProcessTreeResourceReceipt(resource).status !== 'PASS') refuse();
    for (const key of ['producerCommit', 'producerTree', 'platform', 'arch', 'profileByteLength', 'profileSha256', 'frameByteLength', 'frameSha256']) {
      if (resource[key] !== platform.receipt[key]) refuse();
    }
    if (resource.agentsCommit !== capturedContext.agentsCommit || resource.agentsTree !== capturedContext.agentsTree) refuse();
    const bindings = [];
    for (const [kind, root] of [['payload', payload], ['receipt', receipts]]) {
      const binding = canonicalCaptured(capturePath(path.join(root, 'rd0873-artifact-binding.json'), 4096));
      closedObject(binding, BINDING_KEYS);
      for (const key of ['runId', 'runAttempt', 'producerCommit', 'producerTree', 'agentsCommit', 'agentsTree']) {
        if (binding[key] !== capturedContext[key]) refuse();
      }
      const lane = capturedContext.platform === 'win32' ? 'windows' : 'linux';
      if (binding.schema !== 'rd0873-artifact-binding-v1' || binding.artifactKind !== kind
        || binding.artifactName !== `rd0873-task6-${kind === 'payload' ? 'full-frame' : 'receipt'}-${lane}-x64`) refuse();
      bindings.push(Object.freeze(binding));
    }
    if (!capturePath(path.join(receipts, 'native-build.log'), BUILD_MARKER.length).equals(BUILD_MARKER)) refuse();
    // Receipt validation and grading complete before either payload is opened.
    // Stat both payloads before allocating either owned capture.
    for (const [name, cap] of [['frame.gaaf', MAXIMUM], ['profile.json', CHILD_MAXIMUM]]) {
      const stat = fs.lstatSync(path.join(payload, name), { bigint: true });
      if (!regular(stat) || stat.size > BigInt(cap)) refuse();
    }
    const frameBytes = capturePath(path.join(payload, 'frame.gaaf'), MAXIMUM);
    const profileBytes = capturePath(path.join(payload, 'profile.json'), CHILD_MAXIMUM);
    for (const [prefix, bytes] of [['frame', frameBytes], ['profile', profileBytes]]) {
      if (bytes.length !== resource[`${prefix}ByteLength`] || digest(bytes) !== resource[`${prefix}Sha256`]) refuse();
    }
    await checkRoots();
    return Object.freeze({ frameBytes, profileBytes, bindings: Object.freeze(bindings) });
  } catch { refuse(); }
}

export async function verifyDownloadedBundle(context, payloadRoot, receiptRoot) {
  try {
    if (arguments.length !== 3) refuse();
    const capturedContext = receiptContext(context);
    if (!capturedContext.job.startsWith('reciprocal-')) refuse();
    // Task 0 assigns archive verification/extraction exclusively to the fixed
    // Hosted-download advisory route only; local Task 6C-R evidence does not call it.
    // No owned digest result is available yet: never inspect caller paths or
    // accept supplied result records, callbacks, URLs, modules or buffer claims.
    // In particular, no payload or receipt is forwarded to an external child.
    void payloadRoot;
    void receiptRoot;
    refuse();
  } catch { refuse(); }
}

// Structural comparison only: a matching service digest string is never proof
// of archive verification, extraction custody, or phase completion.
export function validateArtifactBinding(binding, expected) {
  try {
    if (arguments.length !== 2) refuse();
    for (const record of [binding, expected]) {
      closedObject(record, OUTPUT_KEYS);
      for (const key of ['id', 'runId', 'runAttempt']) {
        if (typeof record[key] !== 'string' || record[key].length > (key === 'runAttempt' ? 10 : 30)
          || !/^[1-9][0-9]*$/u.test(record[key]) || record[key].includes('\n')) refuse();
      }
      for (const [key, length] of [['digest', 64], ['producerCommit', 40], ['agentsCommit', 40]]) {
        if (typeof record[key] !== 'string' || record[key].length !== length || !/^[0-9a-f]+$/u.test(record[key])) refuse();
      }
      if (!ARTIFACT_NAMES.includes(record.name)) refuse();
    }
    if (OUTPUT_KEYS.some((key) => binding[key] !== expected[key])) refuse();
    return Object.freeze({ ...binding });
  } catch { refuse(); }
}

export async function validateEvidenceFixtures(context, evidenceRoot, receiptPath) {
  try {
    if (arguments.length !== 3) refuse();
    const capturedContext = receiptContext(context);
    if (capturedContext.mode !== 'verify') refuse();
    const root = absolute(evidenceRoot);
    const observed = ancestry(root);
    checkEvidenceGitBoundary(capturedContext, root);
    const producerWorkflow = await readFixedGitBlob(root, capturedContext.producerCommit, 'workflow');
    const evidenceWorkflow = await readFixedGitBlob(root, capturedContext.evidenceCommit, 'workflow');
    if (!producerWorkflow.equals(evidenceWorkflow)) refuse();
    const fixtures = {};
    for (const [lane, platform] of [['windows', 'win32'], ['linux', 'linux']]) {
      const bytes = await readFixedGitBlob(root, capturedContext.evidenceCommit, `${lane}-fixture`);
      await validateCapturedFixture(capturedContext, bytes, platform);
      fixtures[platform] = bytes;
    }
    const receipt = await validatePlatformReceiptFile(capturedContext, receiptPath);
    if (!fixtures[capturedContext.platform].equals(receipt.bytes)) refuse();
    recheckAncestry(observed);
    // Local Git/receipt consistency only, never archive or hosted provenance.
    return 'TASK6CR_EVIDENCE_FIXTURES_OK';
  } catch { refuse(); }
}

function checkEvidenceGitBoundary(context, root) {
  const deadline = Date.now() + CHILD_TIMEOUT;
  const observed = ancestry(root);
  const pin = authenticateGit();
  const common = ['--no-pager', '-c', `safe.directory=${root}`, '-c', 'core.hooksPath=', '-c', 'protocol.allow=never',
    '-c', 'core.fsmonitor=false', '-c', 'core.attributesFile=', '-c', 'core.autocrlf=false', '-C', root];
  const run = (...args) => fixedChild(GIT, [...common, ...args], root, undefined, deadline);
  if (!run('--version').equals(Buffer.from(`git version ${pin.version}\n`))) refuse();
  for (const commit of [context.producerCommit, context.evidenceCommit]) {
    if (!run('cat-file', '-t', commit).equals(Buffer.from('commit\n'))) refuse();
  }
  // Let pinned Git interpret commit headers; raw line counting need not agree
  // with its parent semantics. Require one complete, unabbreviated result.
  const parents = run('rev-list', '--parents', '--no-walk', '--no-abbrev-commit', context.evidenceCommit);
  if (!parents.equals(Buffer.from(`${context.evidenceCommit} ${context.producerCommit}\n`))) refuse();
  if (!run('rev-parse', `${context.producerCommit}^{tree}`).equals(Buffer.from(`${context.producerTree}\n`))) refuse();
  const paths = [KINDS['linux-fixture'], KINDS['windows-fixture']];
  for (const locator of paths) {
    if (run('ls-tree', '-z', context.producerCommit, '--', locator).length !== 0) refuse();
  }
  const changed = run('diff-tree', '--no-commit-id', '--name-status', '-r', '--no-renames', '-z',
    context.producerCommit, context.evidenceCommit, '--');
  if (!changed.equals(Buffer.from(paths.map((locator) => `A\0${locator}\0`).join('')))) refuse();
  authenticateGit();
  recheckAncestry(observed);
  if (Date.now() >= deadline) refuse();
}

async function validateCapturedFixture(context, bytes, platform) {
  // The fixed Task 6C runner consumes a locator. Materialize only the Git-owned
  // capture in a private verifier scratch reservation, never a transport root
  // handed in by a caller. This does not release producer transport custody.
  const host = process.platform === 'win32' ? 'windows' : 'linux';
  const job = `${platform === process.platform ? 'producer' : 'reciprocal'}-${host}`;
  const run = { runId: context.runId, runAttempt: context.runAttempt, job };
  const custody = await reserveOwnedRoot(run);
  const locator = path.join(custody.root, 'platform-receipt.json');
  let written = false;
  let identity;
  try {
    fs.writeFileSync(locator, bytes, { flag: 'wx', mode: 0o600 });
    written = true;
    identity = fs.lstatSync(locator, { bigint: true });
    const receipt = await validatePlatformReceiptFile({ ...context, job, platform }, locator);
    if (!receipt.bytes.equals(bytes)) refuse();
  } finally {
    await validateOwnedRoot(custody, run);
    await assertExactInventory(custody.root, Object.freeze(written ? ['custody.json', 'platform-receipt.json'] : ['custody.json']));
    const ancestors = ancestry(custody.root);
    if (written) {
      if (!sameFile(identity, fs.lstatSync(locator, { bigint: true })) || !capturePath(locator, CHILD_MAXIMUM).equals(bytes)) refuse();
      recheckAncestry(ancestors);
      fs.unlinkSync(locator);
    }
    await validateOwnedRoot(custody, run);
    await assertExactInventory(custody.root, Object.freeze(['custody.json']));
    recheckAncestry(ancestors);
    // Verifier scratch only, not transport phase cleanup. Once this unlink
    // succeeds a later HOLD may leave an empty root without its record. Do not
    // recreate custody in an uncertain namespace or infer retention from HOLD.
    fs.unlinkSync(path.join(custody.root, 'custody.json'));
    recheckAncestry(ancestors);
    if (fs.readdirSync(custody.root).length !== 0) refuse();
    fs.rmdirSync(custody.root);
  }
}

function refuse() {
  const error = new Error(CODE);
  error.code = CODE;
  delete error.stack;
  throw error;
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const equalPath = (left, right) => process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;

function closedObject(value, keys) {
  if (value === null || typeof value !== 'object' || isProxy(value) || Array.isArray(value)) refuse();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) refuse();
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length || actual.some((key) => typeof key !== 'string' || !keys.includes(key))) refuse();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) refuse();
  }
}
function absolute(locator) {
  if (typeof locator !== 'string' || !path.isAbsolute(locator) || /[\x00-\x1f\x7f]/u.test(locator)) refuse();
  return path.resolve(locator);
}
function ancestry(locator) {
  const directory = absolute(locator);
  const parsed = path.parse(directory);
  let cursor = parsed.root;
  const parts = directory.slice(parsed.root.length).split(path.sep).filter(Boolean);
  const observed = [];
  for (const component of ['', ...parts]) {
    if (component) cursor = path.join(cursor, component);
    const stat = fs.lstatSync(cursor, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink()) refuse();
    observed.push({ path: cursor, stat });
  }
  if (!equalPath(fs.realpathSync.native(directory), directory)) refuse();
  return observed;
}
function sameDirectory(left, right) {
  return left.isDirectory() && right.isDirectory() && !right.isSymbolicLink()
    && left.dev === right.dev && left.ino === right.ino && left.mode === right.mode;
}
function recheckAncestry(observed) {
  for (const row of observed) if (!sameDirectory(row.stat, fs.lstatSync(row.path, { bigint: true }))) refuse();
}
function regular(stat) { return stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n; }
function sameFile(left, right) {
  return regular(left) && regular(right) && left.dev === right.dev && left.ino === right.ino
    && left.mode === right.mode && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}
function maximum(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAXIMUM) refuse();
}
function capturePath(locator, cap) {
  maximum(cap);
  const parent = ancestry(path.dirname(locator));
  const opening = fs.lstatSync(locator, { bigint: true });
  if (!regular(opening) || opening.size > BigInt(cap)) refuse();
  let fd;
  let bytes;
  let failed = false;
  try {
    const nofollow = fs.constants.O_NOFOLLOW ?? 0;
    try { fd = fs.openSync(locator, fs.constants.O_RDONLY | nofollow); }
    catch (error) {
      if (!nofollow || !['EINVAL', 'ENOTSUP', 'EOPNOTSUPP'].includes(error?.code)) throw error;
      fd = fs.openSync(locator, fs.constants.O_RDONLY);
    }
    const held = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(opening, held)) refuse();
    bytes = Buffer.alloc(Number(held.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!Number.isSafeInteger(count) || count <= 0 || count > bytes.length - offset) refuse();
      offset += count;
    }
    if (!sameFile(held, fs.fstatSync(fd, { bigint: true }))
      || !sameFile(held, fs.lstatSync(locator, { bigint: true }))) refuse();
    recheckAncestry(parent);
  } catch { failed = true; }
  finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { failed = true; } }
  }
  if (failed) refuse();
  return bytes;
}

export async function captureRegularFile(root, name, cap) {
  try {
    if (arguments.length !== 3 || !NAMES.includes(name)) refuse();
    return capturePath(path.join(absolute(root), name), cap);
  } catch { refuse(); }
}
export async function assertExactInventory(root, names) {
  try {
    if (arguments.length !== 2 || isProxy(names) || !Array.isArray(names) || !Object.isFrozen(names)
      || names.length === 0 || names.length > NAMES.length) refuse();
    const expected = [];
    for (let index = 0; index < names.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(names, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !NAMES.includes(descriptor.value)
        || expected.includes(descriptor.value)) refuse();
      expected.push(descriptor.value);
    }
    const directory = absolute(root);
    const before = ancestry(directory);
    const actual = fs.readdirSync(directory);
    if (actual.length !== expected.length || actual.some((name) => !expected.includes(name))) refuse();
    for (const name of actual) if (!regular(fs.lstatSync(path.join(directory, name), { bigint: true }))) refuse();
    recheckAncestry(before);
  } catch { refuse(); }
}
export function extractPinnedProfile(sourceBytes) {
  try {
    if (arguments.length !== 1 || isProxy(sourceBytes) || !Buffer.isBuffer(sourceBytes)
      || sourceBytes.length === 0 || sourceBytes.length > CHILD_MAXIMUM) refuse();
    const source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(sourceBytes);
    if (!Buffer.from(source, 'utf8').equals(sourceBytes)) refuse();
    const matches = [...source.matchAll(/^const PINNED_PROFILE_JSON = '([^'\\\r\n]*)';\r?$/gmu)];
    if (matches.length !== 1) refuse();
    const profile = Buffer.from(matches[0][1], 'utf8');
    if (profile.length !== 1131 || digest(profile) !== PROFILE_SHA256 || profile.includes(10) || profile.includes(13)) refuse();
    return profile;
  } catch { refuse(); }
}

export async function writePinnedProfile(custody, context, sourceBytes) {
  try {
    if (arguments.length !== 3) refuse();
    await validateOwnedRoot(custody, context);
    const bytes = extractPinnedProfile(sourceBytes);
    fs.writeFileSync(path.join(custody.root, 'profile.json'), bytes, { flag: 'wx', mode: 0o600 });
    await validateOwnedRoot(custody, context);
    if (!(await captureRegularFile(custody.root, 'profile.json', 1131)).equals(bytes)) refuse();
  } catch { refuse(); }
}

function validateContext(context) {
  closedObject(context, CONTEXT_KEYS);
  if (typeof context.runId !== 'string' || !/^[1-9][0-9]*$/u.test(context.runId)
    || /\n/u.test(context.runId) || context.runId.length > 30
    || typeof context.runAttempt !== 'string' || !/^[1-9][0-9]*$/u.test(context.runAttempt)
    || /\n/u.test(context.runAttempt) || context.runAttempt.length > 10 || !JOBS.includes(context.job)) refuse();
}
function outsideCheckouts(directory) {
  for (let current = directory; ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, '.git'))) refuse();
    if (path.dirname(current) === current) break;
  }
}
function canonicalRecord(record) { return Buffer.from(canonicalJsonText(record), 'utf8'); }

export async function reserveOwnedRoot(context) {
  let root;
  let created;
  try {
    if (arguments.length !== 1) refuse();
    validateContext(context);
    const parent = absolute(tmpdir());
    ancestry(parent);
    outsideCheckouts(parent);
    root = fs.mkdtempSync(path.join(parent, 'task6cr-custody-'));
    const stat = fs.lstatSync(root, { bigint: true });
    created = stat;
    const custody = Object.freeze({ schema: 'rd0873-task6cr-custody.v1', ...context, root,
      rootDevice: String(stat.dev), rootInode: String(stat.ino), rootMode: String(stat.mode), nonce: randomBytes(32).toString('hex') });
    fs.writeFileSync(path.join(root, 'custody.json'), canonicalRecord(custody), { flag: 'wx', mode: 0o600 });
    await validateOwnedRoot(custody, context);
    return custody;
  } catch {
    // Before a record exists, only this freshly created, still-identical empty
    // directory can be reclaimed. Never sweep an uncertain or populated root.
    if (root && created) {
      try {
        if (sameDirectory(created, fs.lstatSync(root, { bigint: true })) && fs.readdirSync(root).length === 0) fs.rmdirSync(root);
      } catch { /* Refusal remains mandatory, including cleanup uncertainty. */ }
    }
    refuse();
  }
}
export async function validateOwnedRoot(custody, context) {
  try {
    if (arguments.length !== 2) refuse();
    validateContext(context);
    closedObject(custody, CUSTODY_KEYS);
    if (custody.schema !== 'rd0873-task6cr-custody.v1'
      || CONTEXT_KEYS.some((key) => custody[key] !== context[key])
      || typeof custody.nonce !== 'string' || custody.nonce.length !== 64 || !/^[0-9a-f]{64}$/u.test(custody.nonce)) refuse();
    const root = absolute(custody.root);
    const parent = absolute(tmpdir());
    if (!equalPath(path.dirname(root), parent) || !/^task6cr-custody-[A-Za-z0-9]+$/u.test(path.basename(root))) refuse();
    const ancestors = ancestry(root);
    outsideCheckouts(root);
    const stat = ancestors.at(-1).stat;
    if (String(stat.dev) !== custody.rootDevice || String(stat.ino) !== custody.rootInode || String(stat.mode) !== custody.rootMode) refuse();
    const bytes = await captureRegularFile(root, 'custody.json', 4096);
    if (!bytes.equals(canonicalRecord(custody))) refuse();
    recheckAncestry(ancestors);
  } catch { refuse(); }
}

function childEnvironment() {
  const environment = Object.create(null);
  // No inheritance of credentials, NODE_OPTIONS, Git overrides or shell startup.
  for (const key of ['SYSTEMROOT', 'WINDIR', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR']) {
    if (Object.hasOwn(process.env, key)) environment[key] = absolute(process.env[key]);
  }
  environment.LANG = 'C';
  environment.LC_ALL = 'C';
  environment.GIT_CONFIG_NOSYSTEM = '1';
  environment.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
  environment.GIT_TERMINAL_PROMPT = '0';
  environment.GIT_NO_REPLACE_OBJECTS = '1';
  environment.GIT_NO_LAZY_FETCH = '1';
  return environment;
}
function fixedChild(executable, args, cwd, input, deadline) {
  const timeout = deadline === undefined ? CHILD_TIMEOUT : deadline - Date.now();
  if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > CHILD_TIMEOUT) refuse();
  const result = childProcess.spawnSync(executable, args, {
    cwd, input, env: childEnvironment(), shell: false, windowsHide: true,
    timeout, maxBuffer: CHILD_MAXIMUM, encoding: 'buffer',
  });
  if (result.error || result.signal !== null || result.status !== 0
    || !Buffer.isBuffer(result.stdout) || !Buffer.isBuffer(result.stderr)
    || result.stderr.length !== 0 || result.stdout.length + result.stderr.length > CHILD_MAXIMUM) refuse();
  return Buffer.from(result.stdout);
}
function authenticateGit() {
  const pin = GIT_PINS[process.platform];
  if (!pin || process.arch !== 'x64') refuse();
  const bytes = capturePath(GIT, pin.bytes);
  if (bytes.length !== pin.bytes || digest(bytes) !== pin.sha256) refuse();
  return pin;
}
export async function readFixedGitBlob(repositoryRoot, commit, kind) {
  try {
    if (arguments.length !== 3 || typeof commit !== 'string' || commit.length !== 40
      || !/^[0-9a-f]{40}$/u.test(commit) || typeof kind !== 'string' || !Object.hasOwn(KINDS, kind)) refuse();
    const deadline = Date.now() + CHILD_TIMEOUT;
    const root = absolute(repositoryRoot);
    const observed = ancestry(root);
    const pin = authenticateGit();
    const common = ['--no-pager', '-c', `safe.directory=${root}`, '-c', 'core.hooksPath=', '-c', 'protocol.allow=never',
      '-c', 'core.fsmonitor=false', '-c', 'core.attributesFile=', '-c', 'core.autocrlf=false', '-C', root];
    const run = (args, input) => fixedChild(GIT, [...common, ...args], root, input, deadline);
    const version = run(['--version']);
    if (!version.equals(Buffer.from(`git version ${pin.version}\n`))) refuse();
    if (!run(['cat-file', '-t', commit]).equals(Buffer.from('commit\n'))) refuse();
    const entry = run(['ls-tree', '-z', commit, '--', KINDS[kind]]).toString('utf8');
    const treeEntry = /^100644 blob ([0-9a-f]{40})\t[^\x00]+\x00$/u.exec(entry);
    if (!treeEntry
      || entry.slice(entry.indexOf('\t') + 1, -1) !== KINDS[kind]) refuse();
    const object = `${commit}:${KINDS[kind]}`;
    if (!run(['cat-file', '-t', object]).equals(Buffer.from('blob\n'))) refuse();
    const size = run(['cat-file', '-s', object]).toString('ascii');
    if (!/^(?:0|[1-9][0-9]*)\n$/u.test(size)) refuse();
    const length = Number(size.slice(0, -1));
    if (!Number.isSafeInteger(length) || length > CHILD_MAXIMUM) refuse();
    const bytes = run(['cat-file', 'blob', object]);
    if (bytes.length !== length) refuse();
    if (!run(['hash-object', '--stdin'], bytes).equals(Buffer.from(`${treeEntry[1]}\n`))) refuse();
    if (kind === 'profile-source') {
      const decoded = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      if (!Buffer.from(decoded, 'utf8').equals(bytes)) refuse();
    }
    authenticateGit();
    recheckAncestry(observed);
    if (Date.now() >= deadline) refuse();
    return bytes;
  } catch { refuse(); }
}

async function selfTest() {
  const context = Object.freeze({ runId: '1', runAttempt: '1', job: process.platform === 'win32' ? 'producer-windows' : 'producer-linux' });
  const custody = await reserveOwnedRoot(context);
  try {
    fs.writeFileSync(path.join(custody.root, 'profile.json'), 'test', { flag: 'wx', mode: 0o600 });
    if (!(await captureRegularFile(custody.root, 'profile.json', 4)).equals(Buffer.from('test'))) refuse();
    let rejected = false;
    try { await captureRegularFile(custody.root, 'profile.json', 3); } catch { rejected = true; }
    if (!rejected) refuse();
    await assertExactInventory(custody.root, Object.freeze(['custody.json', 'profile.json']));
    await validateOwnedRoot(custody, context);
    const marker = fixedChild(process.execPath, ['--input-type=module', '--eval', "process.stdout.write('TASK6CR_CHILD_OK\\n')"], custody.root);
    if (!marker.equals(Buffer.from('TASK6CR_CHILD_OK\n'))) refuse();
  } finally {
    await validateOwnedRoot(custody, context);
    fs.unlinkSync(path.join(custody.root, 'profile.json'));
    fs.unlinkSync(path.join(custody.root, 'custody.json'));
    fs.rmdirSync(custody.root);
  }
}

async function main() {
  if (process.argv.length !== 3) refuse();
  if (process.argv[2] === 'prepare-upload') {
    const expected = ['RD0873_TASK6CR_CONTEXT', 'RD0873_TASK6CR_PAYLOAD_ROOT', 'RD0873_TASK6CR_RECEIPT_ROOT'];
    const found = Object.keys(process.env).filter((key) => /^RD0873_TASK6CR_/iu.test(key));
    if (found.length !== expected.length || found.some((key) => !expected.includes(key))
      || expected.some((key) => !process.env[key] || process.env[key].length > 8192)) refuse();
    await validateUploadBundle(JSON.parse(process.env.RD0873_TASK6CR_CONTEXT),
      process.env.RD0873_TASK6CR_PAYLOAD_ROOT, process.env.RD0873_TASK6CR_RECEIPT_ROOT);
    process.stdout.write('TASK6CR_UPLOAD_BUNDLE_OK\n');
    return;
  }
  if (process.argv[2] !== '--self-test') refuse();
  for (const key of Object.keys(process.env)) if (/^RD0873_TASK6CR_/iu.test(key)) refuse();
  await selfTest();
  process.stdout.write('TASK6CR_CUSTODY_SELF_TEST_OK\n');
}
if (process.argv[1] && equalPath(path.resolve(process.argv[1]), SELF)) {
  main().catch(() => { process.stdout.write(`${CODE}\n`); process.exitCode = 2; });
}
