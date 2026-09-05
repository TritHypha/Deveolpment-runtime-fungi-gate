import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  TASK6_RESOURCE_LIMITS,
  gradeCompleteProcessTreeResourceReceipt,
  runFrozenGitResourceHarness,
} from '../lib/logic-aig-source-origin/process-tree-resource.mjs';
import { canonicalJsonText } from '../lib/logic-aig-source-origin/contract.mjs';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function processRow({ stage, processKey, parentProcessKey, pid, parentPid, startTick, endTick, peakRssKiB, terminationKind = 'exit', terminationCode = 0 }) {
  return { stage, processKey, parentProcessKey, pid, parentPid, startTick, endTick, peakRssKiB, terminationKind, terminationCode };
}

function receipt(overrides = {}) {
  const processes = [
    processRow({ stage: 'producer', processKey: 'producer:0001', parentProcessKey: null, pid: 101, parentPid: 0, startTick: '100', endTick: '200', peakRssKiB: 100 }),
    processRow({ stage: 'producer', processKey: 'producer:0002', parentProcessKey: 'producer:0001', pid: 102, parentPid: 101, startTick: '120', endTick: '180', peakRssKiB: 200 }),
    processRow({ stage: 'verifier', processKey: 'verifier:0001', parentProcessKey: 'producer:0001', pid: 103, parentPid: 101, startTick: '200', endTick: '300', peakRssKiB: 300 }),
  ];
  const body = {
    schema: 'galerina.logic-aig-task6-resource-receipt.v1',
    platform: 'win32',
    arch: 'x64',
    producerCommit: '1'.repeat(40),
    producerTree: '2'.repeat(40),
    agentsCommit: '3'.repeat(40),
    agentsTree: '4'.repeat(40),
    profileByteLength: 10,
    profileSha256: 'a'.repeat(64),
    frameByteLength: 20,
    frameSha256: 'b'.repeat(64),
    targetTriple: 'x86_64-pc-windows-msvc',
    observerSourceSha256: 'c'.repeat(64),
    observerBinarySha256: 'd'.repeat(64),
    toolchainSha256: 'e'.repeat(64),
    measurementMechanism: 'windows-debug-job-v1',
    mechanismEvidence: {
      nativeCreateEvents: 3,
      nativeExitEvents: 3,
      secondaryCreateEvents: 3,
      secondaryExitEvents: 3,
      retainedHandleRows: 3,
      accountedProcessRows: 3,
      terminalState: 'reconciled',
    },
    mechanismSha256: '',
    clock: { kind: 'qpc', frequency: '1000000' },
    processes,
    maxProcessPeakRssKiB: 300,
    maxConcurrentTreePeakRssKiB: 400,
    maximizingProcessKeys: ['producer:0001', 'verifier:0001'],
    measurementInterval: 'native-root-lifetime-conservative-superset.v1',
    elapsedMillis: 1,
    limits: { ...TASK6_RESOURCE_LIMITS },
    status: 'PASS',
    authorizing: false,
  };
  body.mechanismSha256 = sha256(canonicalJsonText(body.mechanismEvidence));
  const changed = { ...body, ...overrides };
  changed.mechanismSha256 = sha256(canonicalJsonText(changed.mechanismEvidence));
  const receiptDigest = sha256(`galerina.logic-aig-task6-resource-receipt.v1\0${canonicalJsonText(changed)}`);
  return { ...changed, receiptDigest };
}

test('Task 6C-R refuses an unverified harness before native execution', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'galerina-task6-resource-test-'));
  try {
    const agentsRoot = path.join(root, 'agents');
    mkdirSync(agentsRoot);
    const profilePath = path.join(root, 'profile.json');
    const framePath = path.join(root, 'frame.gaaf');
    writeFileSync(profilePath, '{}');
    await assert.rejects(
      () => runFrozenGitResourceHarness({ commitOid: '1'.repeat(40), profilePath, framePath, agentsRoot, receiptPath: path.join(root, 'receipt.json') }),
      (error) => error?.code === 'HOLD_NATIVE_OBSERVER_UNAVAILABLE' || error?.code === 'HOLD_WINDOWS_NATIVE_COVERAGE_UNIMPLEMENTED' || error?.code === 'HOLD_RESOURCE_RECEIPT_SCHEMA' || error?.code === 'HOLD_RESOURCE_VERIFIER_UNAVAILABLE',
    );
  } finally {
    rmSync(root, { recursive: true, force: false });
  }
});

test('Task 6C-R reconciles every native lifecycle', () => {
  const result = gradeCompleteProcessTreeResourceReceipt(receipt());
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.maximizingProcessKeys, ['producer:0001', 'verifier:0001']);
});

test('Task 6C-R grades conservative overlap', () => {
  const result = gradeCompleteProcessTreeResourceReceipt(receipt({
    processes: [
      processRow({ stage: 'producer', processKey: 'producer:0001', parentProcessKey: null, pid: 101, parentPid: 0, startTick: '100', endTick: '200', peakRssKiB: 100 }),
      processRow({ stage: 'producer', processKey: 'producer:0002', parentProcessKey: 'producer:0001', pid: 102, parentPid: 101, startTick: '120', endTick: '180', peakRssKiB: 200 }),
      processRow({ stage: 'verifier', processKey: 'verifier:0001', parentProcessKey: 'producer:0001', pid: 103, parentPid: 101, startTick: '150', endTick: '250', peakRssKiB: 300 }),
    ],
    maxProcessPeakRssKiB: 300,
    maxConcurrentTreePeakRssKiB: 600,
    maximizingProcessKeys: ['producer:0001', 'producer:0002', 'verifier:0001'],
  }));
  assert.equal(result.maxConcurrentTreePeakRssKiB, 600);
  assert.deepEqual(result.maximizingProcessKeys, ['producer:0001', 'producer:0002', 'verifier:0001']);
});

test('Task 6C-R fails closed without native coverage', async () => {
  assert.throws(
    () => gradeCompleteProcessTreeResourceReceipt(receipt({ mechanismEvidence: { ...receipt().mechanismEvidence, terminalState: 'unknown' } })),
    (error) => error?.code === 'HOLD_RESOURCE_RECONCILIATION',
  );
  const hostile = new Proxy({}, {
    getPrototypeOf() { throw new Error('prototype trap'); },
    ownKeys() { throw new Error('ownKeys trap'); },
  });
  await assert.rejects(() => runFrozenGitResourceHarness(hostile), (error) => error?.code === 'REFUSED_RESOURCE_OPTIONS');
});

test('Task 6C-R refuses every inclusive resource ceiling overrun', () => {
  const individualRows = receipt().processes.map((row) => row.processKey === 'producer:0002'
    ? { ...row, peakRssKiB: TASK6_RESOURCE_LIMITS.processPeakRssKiB + 1 }
    : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({
    processes: individualRows,
    maxProcessPeakRssKiB: TASK6_RESOURCE_LIMITS.processPeakRssKiB + 1,
    maxConcurrentTreePeakRssKiB: TASK6_RESOURCE_LIMITS.processPeakRssKiB + 101,
    maximizingProcessKeys: ['producer:0001', 'producer:0002'],
  })), (error) => error?.code === 'HOLD_RESOURCE_LIMIT');

  const aggregateRows = receipt().processes.map((row) => row.processKey === 'producer:0001' || row.processKey === 'producer:0002'
    ? { ...row, peakRssKiB: 3145729 }
    : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({
    processes: aggregateRows,
    maxProcessPeakRssKiB: 3145729,
    maxConcurrentTreePeakRssKiB: TASK6_RESOURCE_LIMITS.concurrentTreePeakRssKiB + 2,
    maximizingProcessKeys: ['producer:0001', 'producer:0002'],
  })), (error) => error?.code === 'HOLD_RESOURCE_LIMIT');

  const elapsedRows = receipt().processes.map((row) => row.processKey === 'verifier:0001' ? { ...row, endTick: '900001100' } : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({
    processes: elapsedRows,
    elapsedMillis: TASK6_RESOURCE_LIMITS.elapsedMillis + 1,
  })), (error) => error?.code === 'HOLD_RESOURCE_LIMIT');
});

test('Task 6C-R refuses gaps, bad parentage, and nonmonotonic lifetimes', () => {
  const base = receipt();
  const missingParent = base.processes.map((row) => row.processKey === 'verifier:0001' ? { ...row, parentProcessKey: 'missing:0000' } : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ processes: missingParent })), (error) => error?.code === 'HOLD_RESOURCE_PARENTAGE');
  const reversed = base.processes.map((row) => row.processKey === 'producer:0002' ? { ...row, startTick: '181', endTick: '180' } : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ processes: reversed })), (error) => error?.code === 'HOLD_RESOURCE_CLOCK');
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt({ ...base, receiptDigest: '0'.repeat(64) }), (error) => error?.code === 'HOLD_RESOURCE_DIGEST');
  const long = base.processes.map((row) => row.processKey === 'producer:0001' ? { ...row, endTick: '900001' } : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ processes: long })), (error) => error?.code === 'HOLD_RESOURCE_LIMIT');
  const noVerifier = base.processes.filter((row) => row.stage !== 'verifier');
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ processes: noVerifier, maxConcurrentTreePeakRssKiB: 300, maximizingProcessKeys: ['producer:0001', 'producer:0002'] })), (error) => error?.code === 'HOLD_RESOURCE_RECONCILIATION' || error?.code === 'HOLD_RESOURCE_STAGES');
  const unknownStages = base.processes.map((row) => ({ ...row, stage: row.stage === 'producer' ? 'unknown-a' : 'unknown-b' }));
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ processes: unknownStages })), (error) => error?.code === 'HOLD_RESOURCE_STAGES');
  const killed = base.processes.map((row) => row.processKey === 'producer:0002' ? { ...row, terminationKind: 'killed', terminationCode: 9 } : row);
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ processes: killed })), (error) => error?.code === 'HOLD_RESOURCE_TERMINATION');
  const cycle = [
    processRow({ stage: 'producer', processKey: 'producer:0000', parentProcessKey: null, pid: 100, parentPid: 0, startTick: '50', endTick: '300', peakRssKiB: 10 }),
    { ...base.processes[0], processKey: 'producer:0001', parentProcessKey: 'producer:0002', parentPid: 102, startTick: '100', endTick: '200' },
    { ...base.processes[1], processKey: 'producer:0002', parentProcessKey: 'producer:0001', parentPid: 101, startTick: '100', endTick: '180' },
    { ...base.processes[2], parentProcessKey: 'producer:0000', parentPid: 100 },
  ];
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({
    processes: cycle,
    mechanismEvidence: { ...base.mechanismEvidence, nativeCreateEvents: 4, nativeExitEvents: 4, secondaryCreateEvents: 4, secondaryExitEvents: 4, retainedHandleRows: 4, accountedProcessRows: 4 },
  })), (error) => error?.code === 'HOLD_RESOURCE_PARENTAGE');
  assert.throws(() => gradeCompleteProcessTreeResourceReceipt(receipt({ clock: { kind: 'qpc', frequency: '999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999' } })), (error) => error?.code === 'HOLD_RESOURCE_CLOCK' || error?.code === 'HOLD_RESOURCE_ELAPSED');
});
