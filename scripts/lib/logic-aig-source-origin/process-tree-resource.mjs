import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { isProxy } from 'node:util/types';

import { canonicalJsonText, parseCanonicalJsonBytes } from './contract.mjs';

const execFileAsync = promisify(execFile);
const SHA256 = /^[0-9a-f]{64}$/u;
const OID = /^[0-9a-f]{40}$/u;
const DECIMAL = /^(?:0|[1-9][0-9]*)$/u;
const RECEIPT_SCHEMA = 'galerina.logic-aig-task6-resource-receipt.v1';
const RECEIPT_DOMAIN = `${RECEIPT_SCHEMA}\0`;
const MEASUREMENT_INTERVAL = 'native-root-lifetime-conservative-superset.v1';
const OBSERVER_TIMEOUT_MILLIS = 900_000;
const CAPTURED_OUTPUT_LIMIT = 1024 * 1024;
const OBSERVER_EVENT_LIMIT = 1024 * 1024;
const OBSERVER_SCHEMA = 'galerina.process-tree-observer.v1';
const NATIVE_SOURCE_FILES = Object.freeze([
  'Cargo.lock', 'Cargo.toml', 'rust-toolchain.toml',
  'src/linux.rs', 'src/main.rs', 'src/protocol.rs', 'src/windows.rs',
]);
const NATIVE_SOURCE_PREFIX = 'scripts/native/process-tree-observer/';
const OBSERVER_KEYS = Object.freeze(['clock', 'events', 'mechanism', 'observerDigest', 'reconciliation', 'rootTermination', 'schema']);
const OBSERVER_CLOCK_KEYS = Object.freeze(['frequency', 'kind']);
const OBSERVER_RECONCILIATION_KEYS = Object.freeze([
  'accountedProcessRows', 'nativeCreateEvents', 'nativeExitEvents', 'retainedHandleRows',
  'secondaryCreateEvents', 'secondaryExitEvents', 'terminalState',
]);
const OBSERVER_ROOT_KEYS = Object.freeze(['code', 'kind']);
const OBSERVER_CREATE_KEYS = Object.freeze(['kind', 'parentPid', 'parentProcessKey', 'pid', 'processKey', 'tick']);
const OBSERVER_EXIT_KEYS = Object.freeze([
  'kind', 'parentPid', 'parentProcessKey', 'peakRssKiB', 'pid', 'processKey',
  'terminationCode', 'terminationKind', 'tick',
]);
const WINDOWS_MECHANISM = 'windows-debug-job-v1';
const LINUX_MECHANISM = 'linux-ptrace-wait4-v1';
const RECEIPT_KEYS = Object.freeze([
  'agentsCommit', 'agentsTree', 'arch', 'authorizing', 'clock', 'elapsedMillis',
  'frameByteLength', 'frameSha256', 'limits', 'maxConcurrentTreePeakRssKiB',
  'maxProcessPeakRssKiB', 'maximizingProcessKeys', 'measurementInterval',
  'measurementMechanism', 'mechanismEvidence', 'mechanismSha256', 'observerBinarySha256',
  'observerSourceSha256', 'platform', 'processes', 'producerCommit', 'producerTree',
  'profileByteLength', 'profileSha256', 'receiptDigest', 'schema', 'status', 'targetTriple',
  'toolchainSha256',
]);
const MECHANISM_KEYS = Object.freeze([
  'accountedProcessRows', 'nativeCreateEvents', 'nativeExitEvents',
  'retainedHandleRows', 'secondaryCreateEvents', 'secondaryExitEvents', 'terminalState',
]);
const LIMIT_KEYS = Object.freeze(['concurrentTreePeakRssKiB', 'elapsedMillis', 'processPeakRssKiB']);
const CLOCK_KEYS = Object.freeze(['frequency', 'kind']);
const PROCESS_KEYS = Object.freeze([
  'endTick', 'parentPid', 'parentProcessKey', 'peakRssKiB', 'pid', 'processKey',
  'stage', 'startTick', 'terminationCode', 'terminationKind',
]);

export const TASK6_RESOURCE_LIMITS = Object.freeze({
  processPeakRssKiB: 4194304,
  concurrentTreePeakRssKiB: 6291456,
  elapsedMillis: 900000,
});

export class ProcessTreeResourceRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProcessTreeResourceRefusal';
    this.code = code;
  }
}

function refuse(code) {
  throw new ProcessTreeResourceRefusal(code);
}

function exactKeys(value, expected, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) refuse(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((entry, index) => entry !== wanted[index])) refuse(code);
}

function exactSha(value, code) {
  if (typeof value !== 'string' || !SHA256.test(value)) refuse(code);
}

function exactOid(value, code) {
  if (typeof value !== 'string' || !OID.test(value)) refuse(code);
}

function exactDecimal(value, code) {
  if (typeof value !== 'string' || value.length > 128 || !DECIMAL.test(value)) refuse(code);
  try { return BigInt(value); } catch { refuse(code); }
}

function exactInteger(value, code, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) refuse(code);
  return value;
}

function canonicalReceiptDigest(receipt) {
  const { receiptDigest: ignored, ...body } = receipt;
  return createHash('sha256').update(RECEIPT_DOMAIN, 'utf8').update(canonicalJsonText(body), 'utf8').digest('hex');
}

function regularFile(locator, code) {
  if (typeof locator !== 'string' || locator.length === 0) refuse(code);
  let stat;
  try { stat = lstatSync(locator); } catch { refuse(code); }
  if (!stat.isFile() || stat.isSymbolicLink()) refuse(code);
  return stat;
}

function readBounded(locator, limit, code) {
  const stat = regularFile(locator, code);
  if (!Number.isSafeInteger(stat.size) || stat.size > limit) refuse(code);
  let bytes;
  try { bytes = readFileSync(locator); } catch { refuse(code); }
  if (!Buffer.isBuffer(bytes) || bytes.length !== stat.size || bytes.length > limit) refuse(code);
  return bytes;
}

function requireAbsent(locator, code) {
  try {
    lstatSync(locator);
    refuse(code);
  } catch (error) {
    if (error instanceof ProcessTreeResourceRefusal) throw error;
    if (error?.code !== 'ENOENT') refuse(code);
  }
}

function parseReceiptBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 1024 * 1024) refuse('HOLD_RESOURCE_RECEIPT_SIZE');
  try { return parseCanonicalJsonBytes(bytes, { label: 'task6-resource-receipt' }); } catch { refuse('HOLD_RESOURCE_RECEIPT_JSON'); }
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function observerDigest(events) {
  const sorted = [...events].sort((left, right) => codeUnitCompare(left.processKey, right.processKey)
    || codeUnitCompare(left.kind, right.kind) || codeUnitCompare(left.tick, right.tick));
  const preimage = sorted.map((event) => [
    event.kind,
    event.processKey,
    event.parentProcessKey ?? '',
    event.pid,
    event.parentPid,
    event.tick,
    event.peakRssKiB ?? 0,
    event.terminationKind ?? '',
    event.terminationCode ?? -1,
  ].join('\0')).join('\0');
  return sha256Bytes(Buffer.from(preimage, 'utf8'));
}

function parseObserverBytes(bytes, platform) {
  if (!Buffer.isBuffer(bytes) || bytes.length > OBSERVER_EVENT_LIMIT) refuse('HOLD_NATIVE_EVENT_SIZE');
  let observer;
  try { observer = parseCanonicalJsonBytes(bytes, { label: 'process-tree-observer' }); } catch { refuse('HOLD_NATIVE_PROTOCOL_JSON'); }
  exactKeys(observer, OBSERVER_KEYS, 'HOLD_NATIVE_PROTOCOL_SCHEMA');
  if (observer.schema !== OBSERVER_SCHEMA || observer.mechanism !== (platform === 'win32' ? WINDOWS_MECHANISM : LINUX_MECHANISM)) refuse('HOLD_NATIVE_PROTOCOL_SCHEMA');
  exactKeys(observer.clock, OBSERVER_CLOCK_KEYS, 'HOLD_NATIVE_PROTOCOL_CLOCK');
  if (observer.clock.kind !== (platform === 'win32' ? 'qpc' : 'monotonic-raw')) refuse('HOLD_NATIVE_PROTOCOL_CLOCK');
  exactDecimal(observer.clock.frequency, 'HOLD_NATIVE_PROTOCOL_CLOCK');
  exactKeys(observer.reconciliation, OBSERVER_RECONCILIATION_KEYS, 'HOLD_NATIVE_PROTOCOL_RECONCILIATION');
  for (const key of OBSERVER_RECONCILIATION_KEYS.slice(0, -1)) exactInteger(observer.reconciliation[key], 'HOLD_NATIVE_PROTOCOL_RECONCILIATION');
  if (observer.reconciliation.terminalState !== 'reconciled') refuse('HOLD_NATIVE_PROTOCOL_RECONCILIATION');
  exactKeys(observer.rootTermination, OBSERVER_ROOT_KEYS, 'HOLD_NATIVE_PROTOCOL_TERMINATION');
  if (!['exit', 'signal'].includes(observer.rootTermination.kind)) refuse('HOLD_NATIVE_PROTOCOL_TERMINATION');
  exactInteger(observer.rootTermination.code, 'HOLD_NATIVE_PROTOCOL_TERMINATION');
  exactSha(observer.observerDigest, 'HOLD_NATIVE_PROTOCOL_DIGEST');
  if (!Array.isArray(observer.events) || observer.events.length === 0 || observer.events.length > 16384) refuse('HOLD_NATIVE_PROTOCOL_EVENTS');
  let previousOrder = null;
  const creates = new Map();
  const exits = new Map();
  for (const event of observer.events) {
    if (event === null || typeof event !== 'object' || typeof event.kind !== 'string') refuse('HOLD_NATIVE_PROTOCOL_EVENT');
    const expected = event.kind === 'create' ? OBSERVER_CREATE_KEYS : event.kind === 'exit' ? OBSERVER_EXIT_KEYS : null;
    if (!expected) refuse('HOLD_NATIVE_PROTOCOL_EVENT');
    exactKeys(event, expected, 'HOLD_NATIVE_PROTOCOL_EVENT');
    if (typeof event.processKey !== 'string' || event.processKey.length === 0 || event.processKey.length > 128) refuse('HOLD_NATIVE_PROTOCOL_EVENT');
    const order = `${event.processKey}\0${event.kind}\0${event.tick}`;
    if (previousOrder !== null && order < previousOrder) refuse('HOLD_NATIVE_PROTOCOL_EVENT_ORDER');
    previousOrder = order;
    exactInteger(event.pid, 'HOLD_NATIVE_PROTOCOL_EVENT', 1);
    exactInteger(event.parentPid, 'HOLD_NATIVE_PROTOCOL_EVENT', 0);
    if (event.parentProcessKey !== null && typeof event.parentProcessKey !== 'string') refuse('HOLD_NATIVE_PROTOCOL_EVENT');
    exactDecimal(event.tick, 'HOLD_NATIVE_PROTOCOL_CLOCK');
    if (event.kind === 'create') {
      if (creates.has(event.processKey) || event.parentProcessKey === event.processKey) refuse('HOLD_NATIVE_PROTOCOL_EVENT');
      creates.set(event.processKey, event);
    } else {
      exactInteger(event.peakRssKiB, 'HOLD_NATIVE_PROTOCOL_EVENT');
      if (!['exit', 'signal'].includes(event.terminationKind)) refuse('HOLD_NATIVE_PROTOCOL_TERMINATION');
      exactInteger(event.terminationCode, 'HOLD_NATIVE_PROTOCOL_TERMINATION');
      if (exits.has(event.processKey) || !creates.has(event.processKey)) refuse('HOLD_NATIVE_PROTOCOL_EVENT');
      const create = creates.get(event.processKey);
      if (event.pid !== create.pid || event.parentPid !== create.parentPid || event.parentProcessKey !== create.parentProcessKey) {
        refuse('HOLD_NATIVE_PROTOCOL_PARENTAGE');
      }
      exits.set(event.processKey, event);
    }
  }
  if (creates.size !== exits.size || observer.reconciliation.nativeCreateEvents !== creates.size || observer.reconciliation.nativeExitEvents !== exits.size || observer.reconciliation.accountedProcessRows !== creates.size || observer.reconciliation.retainedHandleRows !== creates.size) refuse('HOLD_NATIVE_PROTOCOL_RECONCILIATION');
  if (observer.observerDigest !== observerDigest(observer.events)) refuse('HOLD_NATIVE_PROTOCOL_DIGEST');
  const roots = [...creates.values()].filter((event) => event.parentProcessKey === null);
  if (roots.length !== 1) refuse('HOLD_NATIVE_PROTOCOL_PARENTAGE');
  const rootExit = exits.get(roots[0].processKey);
  if (!rootExit || rootExit.terminationKind !== observer.rootTermination.kind || rootExit.terminationCode !== observer.rootTermination.code) refuse('HOLD_NATIVE_PROTOCOL_TERMINATION');
  for (const create of creates.values()) {
    if (create.parentProcessKey !== null) {
      const parent = creates.get(create.parentProcessKey);
      if (!parent || parent.pid !== create.parentPid) refuse('HOLD_NATIVE_PROTOCOL_PARENTAGE');
    }
    const exit = exits.get(create.processKey);
    if (exactDecimal(exit.tick, 'HOLD_NATIVE_PROTOCOL_CLOCK') < exactDecimal(create.tick, 'HOLD_NATIVE_PROTOCOL_CLOCK')) refuse('HOLD_NATIVE_PROTOCOL_CLOCK');
  }
  return Object.freeze({ observer, creates, exits, root: roots[0] });
}

function stageRows(parsed) {
  const direct = [...parsed.creates.values()]
    .filter((event) => event.parentProcessKey === parsed.root.processKey)
    .sort((left, right) => {
      const leftTick = BigInt(left.tick);
      const rightTick = BigInt(right.tick);
      return (leftTick < rightTick ? -1 : leftTick > rightTick ? 1 : 0)
        || codeUnitCompare(left.processKey, right.processKey);
    });
  if (direct.length !== 2) refuse('HOLD_RESOURCE_STAGE_BRIDGE');
  const stageRoots = new Map([[parsed.root.processKey, 'producer'], [direct[0].processKey, 'producer'], [direct[1].processKey, 'verifier']]);
  const stageFor = (processKey) => {
    let cursor = parsed.creates.get(processKey);
    const seen = new Set();
    while (cursor && !stageRoots.has(cursor.processKey)) {
      if (seen.has(cursor.processKey)) refuse('HOLD_NATIVE_PROTOCOL_PARENTAGE');
      seen.add(cursor.processKey);
      cursor = cursor.parentProcessKey === null ? undefined : parsed.creates.get(cursor.parentProcessKey);
    }
    const stage = cursor === undefined ? undefined : stageRoots.get(cursor.processKey);
    if (!stage) refuse('HOLD_RESOURCE_STAGE_BRIDGE');
    return stage;
  };
  return [...parsed.creates.values()].map((create) => {
    const exit = parsed.exits.get(create.processKey);
    return {
      stage: stageFor(create.processKey),
      processKey: create.processKey,
      parentProcessKey: create.parentProcessKey,
      pid: create.pid,
      parentPid: create.processKey === parsed.root.processKey ? 0 : create.parentPid,
      startTick: create.tick,
      endTick: exit.tick,
      peakRssKiB: exit.peakRssKiB,
      terminationKind: exit.terminationKind,
      terminationCode: exit.terminationCode,
    };
  }).sort((left, right) => codeUnitCompare(left.processKey, right.processKey));
}

function resourceMetrics(processes, frequency) {
  const intervals = processes.map((row) => ({ row, start: BigInt(row.startTick), end: BigInt(row.endTick) }));
  const maxProcessPeakRssKiB = Math.max(...processes.map((row) => row.peakRssKiB));
  const ticks = [...new Set(intervals.flatMap(({ start, end }) => [start, end]))].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  let maxConcurrentTreePeakRssKiB = 0;
  let maximizingProcessKeys = [];
  for (const tick of ticks) {
    const active = intervals.filter(({ start, end }) => start <= tick && tick <= end);
    const sum = active.reduce((total, entry) => total + entry.row.peakRssKiB, 0);
    const keys = active.map((entry) => entry.row.processKey).sort();
    if (sum > maxConcurrentTreePeakRssKiB || (sum === maxConcurrentTreePeakRssKiB && canonicalJsonText(keys) < canonicalJsonText(maximizingProcessKeys))) {
      maxConcurrentTreePeakRssKiB = sum;
      maximizingProcessKeys = keys;
    }
  }
  const observedStart = intervals.reduce((minimum, entry) => entry.start < minimum ? entry.start : minimum, intervals[0].start);
  const observedEnd = intervals.reduce((maximum, entry) => entry.end > maximum ? entry.end : maximum, intervals[0].end);
  const elapsedNumerator = (observedEnd - observedStart) * 1000n;
  const elapsed = (elapsedNumerator + frequency - 1n) / frequency;
  if (elapsed > BigInt(Number.MAX_SAFE_INTEGER)) refuse('HOLD_RESOURCE_ELAPSED');
  return { maxProcessPeakRssKiB, maxConcurrentTreePeakRssKiB, maximizingProcessKeys, elapsedMillis: Number(elapsed) };
}

function validateProcessRow(row, byKey, byPid, previousKey) {
  exactKeys(row, PROCESS_KEYS, 'HOLD_RESOURCE_PROCESS_SCHEMA');
  if (typeof row.stage !== 'string' || row.stage.length === 0 || row.stage.length > 64) refuse('HOLD_RESOURCE_PROCESS_SCHEMA');
  if (typeof row.processKey !== 'string' || row.processKey.length === 0 || row.processKey.length > 128) refuse('HOLD_RESOURCE_PROCESS_SCHEMA');
  if (previousKey !== null && row.processKey <= previousKey) refuse('HOLD_RESOURCE_PROCESS_ORDER');
  if (byKey.has(row.processKey)) refuse('HOLD_RESOURCE_PROCESS_DUPLICATE');
  byKey.set(row.processKey, row);
  exactInteger(row.pid, 'HOLD_RESOURCE_PROCESS_SCHEMA', 1);
  exactInteger(row.parentPid, 'HOLD_RESOURCE_PROCESS_SCHEMA', 0);
  if (row.parentProcessKey !== null && typeof row.parentProcessKey !== 'string') refuse('HOLD_RESOURCE_PROCESS_SCHEMA');
  if (row.parentProcessKey === row.processKey) refuse('HOLD_RESOURCE_PARENTAGE');
  if (byPid.has(row.pid)) refuse('HOLD_RESOURCE_PROCESS_DUPLICATE');
  byPid.set(row.pid, row);
  const start = exactDecimal(row.startTick, 'HOLD_RESOURCE_CLOCK');
  const end = exactDecimal(row.endTick, 'HOLD_RESOURCE_CLOCK');
  if (end < start) refuse('HOLD_RESOURCE_CLOCK');
  exactInteger(row.peakRssKiB, 'HOLD_RESOURCE_PROCESS_RSS');
  if (typeof row.terminationKind !== 'string' || !['exit', 'signal', 'killed', 'timeout'].includes(row.terminationKind)) refuse('HOLD_RESOURCE_TERMINATION');
  exactInteger(row.terminationCode, 'HOLD_RESOURCE_TERMINATION', 0);
  return { start, end };
}

function gradeReceipt(receipt) {
  exactKeys(receipt, RECEIPT_KEYS, 'HOLD_RESOURCE_RECEIPT_SCHEMA');
  if (receipt.schema !== RECEIPT_SCHEMA || receipt.status !== 'PASS' || receipt.authorizing !== false) refuse('HOLD_RESOURCE_RECEIPT_SCHEMA');
  if (receipt.platform !== 'win32' && receipt.platform !== 'linux') refuse('HOLD_RESOURCE_PLATFORM');
  if (receipt.arch !== 'x64') refuse('HOLD_RESOURCE_PLATFORM');
  const expectedMechanism = receipt.platform === 'win32' ? WINDOWS_MECHANISM : LINUX_MECHANISM;
  const expectedTriple = receipt.platform === 'win32' ? 'x86_64-pc-windows-msvc' : 'x86_64-unknown-linux-gnu';
  if (receipt.measurementMechanism !== expectedMechanism || receipt.targetTriple !== expectedTriple) refuse('HOLD_RESOURCE_MECHANISM');
  exactOid(receipt.producerCommit, 'HOLD_RESOURCE_IDENTITY');
  exactOid(receipt.producerTree, 'HOLD_RESOURCE_IDENTITY');
  exactOid(receipt.agentsCommit, 'HOLD_RESOURCE_IDENTITY');
  exactOid(receipt.agentsTree, 'HOLD_RESOURCE_IDENTITY');
  for (const field of ['profileSha256', 'frameSha256', 'observerSourceSha256', 'observerBinarySha256', 'toolchainSha256', 'mechanismSha256']) exactSha(receipt[field], 'HOLD_RESOURCE_DIGEST');
  exactInteger(receipt.profileByteLength, 'HOLD_RESOURCE_BYTES');
  exactInteger(receipt.frameByteLength, 'HOLD_RESOURCE_BYTES');
  if (receipt.profileByteLength > 1048576 || receipt.frameByteLength > 134217728) refuse('HOLD_RESOURCE_BYTES');
  exactKeys(receipt.limits, LIMIT_KEYS, 'HOLD_RESOURCE_LIMITS');
  if (canonicalJsonText(receipt.limits) !== canonicalJsonText(TASK6_RESOURCE_LIMITS)) refuse('HOLD_RESOURCE_LIMITS');
  if (receipt.measurementInterval !== MEASUREMENT_INTERVAL) refuse('HOLD_RESOURCE_INTERVAL');
  exactKeys(receipt.clock, CLOCK_KEYS, 'HOLD_RESOURCE_CLOCK');
  const expectedClock = receipt.platform === 'win32' ? 'qpc' : 'monotonic-raw';
  if (receipt.clock.kind !== expectedClock) refuse('HOLD_RESOURCE_CLOCK');
  const clockFrequency = exactDecimal(receipt.clock.frequency, 'HOLD_RESOURCE_CLOCK');
  if (clockFrequency <= 0n) refuse('HOLD_RESOURCE_CLOCK');
  exactKeys(receipt.mechanismEvidence, MECHANISM_KEYS, 'HOLD_RESOURCE_RECONCILIATION');
  for (const key of MECHANISM_KEYS.slice(0, -1)) exactInteger(receipt.mechanismEvidence[key], 'HOLD_RESOURCE_RECONCILIATION');
  if (receipt.mechanismEvidence.terminalState !== 'reconciled') refuse('HOLD_RESOURCE_RECONCILIATION');
  const mechanismDigest = createHash('sha256').update(canonicalJsonText(receipt.mechanismEvidence), 'utf8').digest('hex');
  if (receipt.mechanismSha256 !== mechanismDigest) refuse('HOLD_RESOURCE_DIGEST');
  const byKey = new Map();
  const byPid = new Map();
  if (!Array.isArray(receipt.processes) || receipt.processes.length === 0 || receipt.processes.length > 16384) refuse('HOLD_RESOURCE_PROCESSES');
  let previousKey = null;
  const intervals = [];
  for (const row of receipt.processes) {
    const interval = validateProcessRow(row, byKey, byPid, previousKey);
    previousKey = row.processKey;
    intervals.push({ row, ...interval });
  }
  for (const { row } of intervals) {
    if (row.terminationKind !== 'exit' || row.terminationCode !== 0) refuse('HOLD_RESOURCE_TERMINATION');
    if (row.parentProcessKey !== null) {
      const parent = byKey.get(row.parentProcessKey);
      if (!parent || parent.pid !== row.parentPid) refuse('HOLD_RESOURCE_PARENTAGE');
      const childInterval = intervals.find((entry) => entry.row === row);
      const parentInterval = intervals.find((entry) => entry.row === parent);
      if (!childInterval || !parentInterval || childInterval.start < parentInterval.start) refuse('HOLD_RESOURCE_PARENTAGE');
    } else if (row.parentPid !== 0) refuse('HOLD_RESOURCE_PARENTAGE');
  }
  for (const { row } of intervals) {
    const ancestry = new Set([row.processKey]);
    let cursor = row;
    while (cursor.parentProcessKey !== null) {
      if (ancestry.has(cursor.parentProcessKey)) refuse('HOLD_RESOURCE_PARENTAGE');
      ancestry.add(cursor.parentProcessKey);
      cursor = byKey.get(cursor.parentProcessKey);
      if (!cursor) refuse('HOLD_RESOURCE_PARENTAGE');
    }
  }
  if (receipt.mechanismEvidence.accountedProcessRows !== intervals.length || receipt.mechanismEvidence.nativeCreateEvents !== intervals.length || receipt.mechanismEvidence.nativeExitEvents !== intervals.length || receipt.mechanismEvidence.secondaryCreateEvents !== intervals.length || receipt.mechanismEvidence.secondaryExitEvents !== intervals.length || receipt.mechanismEvidence.retainedHandleRows !== intervals.length) refuse('HOLD_RESOURCE_RECONCILIATION');
  const roots = intervals.filter(({ row }) => row.parentProcessKey === null);
  if (roots.length === 0 || roots.some(({ row }) => row.terminationKind !== 'exit' || row.terminationCode !== 0)) refuse('HOLD_RESOURCE_TERMINATION');
  const maxProcessPeakRssKiB = Math.max(...intervals.map(({ row }) => row.peakRssKiB));
  if (receipt.maxProcessPeakRssKiB !== maxProcessPeakRssKiB || maxProcessPeakRssKiB > TASK6_RESOURCE_LIMITS.processPeakRssKiB) refuse('HOLD_RESOURCE_LIMIT');
  const ticks = [...new Set(intervals.flatMap(({ start, end }) => [start, end]))].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  let maxConcurrentTreePeakRssKiB = 0;
  let maximizingProcessKeys = [];
  for (const tick of ticks) {
    const active = intervals.filter(({ start, end }) => start <= tick && tick <= end);
    const sum = active.reduce((total, { row }) => total + row.peakRssKiB, 0);
    const keys = active.map(({ row }) => row.processKey).sort();
    if (sum > maxConcurrentTreePeakRssKiB || (sum === maxConcurrentTreePeakRssKiB && canonicalJsonText(keys) < canonicalJsonText(maximizingProcessKeys))) {
      maxConcurrentTreePeakRssKiB = sum;
      maximizingProcessKeys = keys;
    }
  }
  if (receipt.maxConcurrentTreePeakRssKiB !== maxConcurrentTreePeakRssKiB || maxConcurrentTreePeakRssKiB > TASK6_RESOURCE_LIMITS.concurrentTreePeakRssKiB) refuse('HOLD_RESOURCE_LIMIT');
  if (!Array.isArray(receipt.maximizingProcessKeys) || canonicalJsonText(receipt.maximizingProcessKeys) !== canonicalJsonText(maximizingProcessKeys)) refuse('HOLD_RESOURCE_OVERLAP');
  exactInteger(receipt.elapsedMillis, 'HOLD_RESOURCE_ELAPSED');
  const observedStart = intervals.reduce((minimum, entry) => entry.start < minimum ? entry.start : minimum, intervals[0].start);
  const observedEnd = intervals.reduce((maximum, entry) => entry.end > maximum ? entry.end : maximum, intervals[0].end);
  const elapsedNumerator = (observedEnd - observedStart) * 1000n;
  const expectedElapsedBigInt = (elapsedNumerator + clockFrequency - 1n) / clockFrequency;
  if (expectedElapsedBigInt > BigInt(Number.MAX_SAFE_INTEGER)) refuse('HOLD_RESOURCE_ELAPSED');
  const expectedElapsedMillis = Number(expectedElapsedBigInt);
  if (receipt.elapsedMillis !== expectedElapsedMillis || receipt.elapsedMillis > TASK6_RESOURCE_LIMITS.elapsedMillis) refuse('HOLD_RESOURCE_LIMIT');
  const stages = [...new Set(intervals.map(({ row }) => row.stage))].sort();
  if (canonicalJsonText(stages) !== canonicalJsonText(['producer', 'verifier'])) refuse('HOLD_RESOURCE_STAGES');
  if (receipt.receiptDigest !== canonicalReceiptDigest(receipt)) refuse('HOLD_RESOURCE_DIGEST');
  return Object.freeze({
    status: 'PASS',
    maxProcessPeakRssKiB,
    maxConcurrentTreePeakRssKiB,
    maximizingProcessKeys: Object.freeze([...maximizingProcessKeys]),
    elapsedMillis: receipt.elapsedMillis,
  });
}

export function gradeCompleteProcessTreeResourceReceipt(receipt) {
  try { return gradeReceipt(receipt); } catch (error) {
    if (error instanceof ProcessTreeResourceRefusal) throw error;
    refuse('HOLD_RESOURCE_SCHEMA');
  }
}

function captureOptions(options) {
  if (options === null || typeof options !== 'object' || isProxy(options)) refuse('REFUSED_RESOURCE_OPTIONS');
  let descriptors;
  try {
    if (Object.getPrototypeOf(options) !== Object.prototype) refuse('REFUSED_RESOURCE_OPTIONS');
    descriptors = Object.getOwnPropertyDescriptors(options);
  } catch { refuse('REFUSED_RESOURCE_OPTIONS'); }
  const expected = ['agentsRoot', 'commitOid', 'framePath', 'profilePath', 'receiptPath'];
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== expected.length || keys.some((key) => typeof key !== 'string') || [...keys].sort().some((key, index) => key !== [...expected].sort()[index])) refuse('REFUSED_RESOURCE_OPTIONS');
  const captured = Object.create(null);
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor) || descriptor.get || descriptor.set) refuse('REFUSED_RESOURCE_OPTIONS');
    const value = descriptor.value;
    if (typeof value !== 'string' || value.length === 0) refuse('REFUSED_RESOURCE_OPTIONS');
    captured[key] = value;
  }
  if (!OID.test(captured.commitOid)) refuse('REFUSED_RESOURCE_OPTIONS');
  return captured;
}

async function invokeObserver(observerPath, eventPath, stdoutPath, stderrPath, stageExecutable, stageArgs) {
  const args = ['--protocol', 'galerina.process-tree-observer.v1', '--events', eventPath, '--stdout', stdoutPath, '--stderr', stderrPath, '--', stageExecutable, ...stageArgs];
  try {
    return await execFileAsync(observerPath, args, {
      windowsHide: true,
      maxBuffer: CAPTURED_OUTPUT_LIMIT,
      timeout: OBSERVER_TIMEOUT_MILLIS,
      killSignal: 'SIGKILL',
    });
  } catch (error) {
    if (error?.killed || error?.timedOut || error?.code === 'ETIMEDOUT') refuse('HOLD_NATIVE_TIMEOUT');
    throw error;
  }
}

async function gitText(args, cwd, code) {
  try {
    const result = await execFileAsync('git', args, { cwd, windowsHide: true, maxBuffer: CAPTURED_OUTPUT_LIMIT });
    const value = result.stdout.trim();
    if (value.length === 0 || /\r|\n/u.test(value)) refuse(code);
    return value;
  } catch (error) {
    if (error instanceof ProcessTreeResourceRefusal) throw error;
    refuse(code);
  }
}

async function requireCleanGit(cwd, code) {
  try {
    const result = await execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
      cwd,
      windowsHide: true,
      maxBuffer: CAPTURED_OUTPUT_LIMIT,
    });
    if (result.stdout.length !== 0 || result.stderr.length !== 0) refuse(code);
  } catch (error) {
    if (error instanceof ProcessTreeResourceRefusal) throw error;
    refuse(code);
  }
}

async function toolText(file, args, code) {
  try {
    const result = await execFileAsync(file, args, { windowsHide: true, maxBuffer: CAPTURED_OUTPUT_LIMIT });
    const value = result.stdout.trim();
    if (value.length === 0 || /\r|\n/u.test(value)) refuse(code);
    return value;
  } catch (error) {
    if (error instanceof ProcessTreeResourceRefusal) throw error;
    refuse(code);
  }
}

function nativeSourceDigest(nativeRoot) {
  const hash = createHash('sha256');
  for (const relative of NATIVE_SOURCE_FILES) {
    const bytes = readFileSync(path.join(nativeRoot, ...relative.split('/')));
    const length = Buffer.allocUnsafe(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(`${NATIVE_SOURCE_PREFIX}${relative}`, 'utf8').update('\0', 'utf8').update(length).update(bytes);
  }
  return hash.digest('hex');
}

function nonceFixtureSource() {
  return `import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [nonce, role] = process.argv.slice(2);
const file = fileURLToPath(import.meta.url);
const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));
function announce(name) {
  process.stdout.write(\`nonce:\${nonce}:\${name}:\${process.pid}\\n\`);
}
function child(name) {
  return new Promise((resolve, reject) => {
    const spawned = spawn(process.execPath, [file, nonce, name], { stdio: ['ignore', 'inherit', 'inherit'] });
    spawned.once('error', reject);
    spawned.once('exit', (code, signal) => code === 0 && signal === null ? resolve() : reject(new Error('fixture child failed')));
  });
}

if (role === 'root') {
  announce('root');
  await Promise.all([child('child-a'), child('child-b')]);
} else if (role === 'child-a') {
  announce('child-a');
  await child('grandchild-a');
  await sleep(80);
} else if (role === 'child-b') {
  announce('child-b');
  await sleep(140);
} else if (role === 'grandchild-a') {
  announce('grandchild-a');
  await sleep(20);
} else {
  process.exitCode = 2;
}
`;
}

function validateNoncePreflight(parsed, outputBytes, nonce) {
  const text = outputBytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(outputBytes) || text.includes('\r')) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
  const lines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : [];
  const expected = ['root', 'child-a', 'child-b', 'grandchild-a'];
  const announced = new Map();
  for (const line of lines) {
    const match = /^nonce:([0-9a-f]+):([a-z-]+):([0-9]+)$/u.exec(line);
    if (!match || match[1] !== nonce || announced.has(match[2]) || !expected.includes(match[2])) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
    announced.set(match[2], Number(match[3]));
  }
  if (lines.length !== expected.length || announced.size !== expected.length) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
  if (parsed.creates.size !== expected.length || parsed.exits.size !== expected.length) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
  const byPid = new Map([...parsed.creates.values()].map((event) => [event.pid, event]));
  const byRole = new Map(expected.map((role) => [role, byPid.get(announced.get(role))]));
  if ([...byRole.values()].some((event) => !event)) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
  const root = byRole.get('root');
  const childA = byRole.get('child-a');
  const childB = byRole.get('child-b');
  const grandchild = byRole.get('grandchild-a');
  if (new Set(byRole.values()).size !== expected.length || root.processKey !== parsed.root.processKey || root.parentProcessKey !== null || childA.parentPid !== root.pid || childB.parentPid !== root.pid || grandchild.parentPid !== childA.pid || childA.parentProcessKey !== root.processKey || childB.parentProcessKey !== root.processKey || grandchild.parentProcessKey !== childA.processKey) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
  const direct = [childA, childB];
  if (direct.length !== 2) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
  const exit = (event) => parsed.exits.get(event.processKey);
  const overlaps = (left, right) => BigInt(left.tick) <= BigInt(exit(right).tick) && BigInt(right.tick) <= BigInt(exit(left).tick);
  if (!overlaps(childA, childB) || BigInt(childA.tick) > BigInt(grandchild.tick) || BigInt(exit(grandchild).tick) > BigInt(exit(childA).tick)) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
}

function stageRunnerSource() {
  return `import { spawnSync } from 'node:child_process';

const values = process.argv.slice(2);
if (values.length !== 5) process.exit(2);
const [producerScript, commitOid, profilePath, framePath, verifierTest] = values;
function run(command) {
  const child = spawnSync(process.execPath, command, { encoding: 'buffer', windowsHide: true, maxBuffer: 1048576 });
  if (child.error || child.status === null || child.status !== 0) process.exit(2);
  return child;
}
const producer = run([producerScript, '--commit', commitOid, '--profile', profilePath, '--out', framePath]);
if (producer.stdout.length !== 0 || producer.stderr.length !== 0) process.exit(2);
const verifier = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern', '^Task 6E verifies controlled-runner frame bytes$', verifierTest], {
  encoding: 'buffer',
  windowsHide: true,
  maxBuffer: 1048576,
  env: {
    ...process.env,
    GALERINA_TASK6C_R_FRAME_PATH: framePath,
    GALERINA_TASK6C_R_PROFILE_PATH: profilePath,
  },
});
if (verifier.error || verifier.status === null || verifier.status !== 0) process.exit(2);
if (verifier.stderr.length !== 0) process.exit(2);
process.stdout.write(verifier.stdout);
`;
}

function parseVerifierOutput(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > CAPTURED_OUTPUT_LIMIT || bytes[bytes.length - 1] !== 0x0a) refuse('HOLD_RESOURCE_VERIFIER_OUTPUT');
  const text = bytes.toString('utf8');
  const lines = text.split('\n');
  if (!Buffer.from(text, 'utf8').equals(bytes) || text.includes('\r')
    || lines[0] !== 'TAP version 13'
    || lines.filter((line) => /^(?:not )?ok\b/u.test(line)).length !== 1
    || lines.filter((line) => line === 'ok 1 - Task 6E verifies controlled-runner frame bytes').length !== 1
    || lines.filter((line) => /^1\.\.[0-9]+$/u.test(line)).length !== 1
    || lines.find((line) => /^1\.\./u.test(line)) !== '1..1'
    || /^not ok\b/mu.test(text)) refuse('HOLD_RESOURCE_VERIFIER_OUTPUT');
  const summaries = new Map([
    ['# tests', '1'], ['# suites', '0'], ['# pass', '1'], ['# fail', '0'],
    ['# cancelled', '0'], ['# skipped', '0'], ['# todo', '0'],
  ]);
  for (const [prefix, expected] of summaries) {
    const matching = lines.filter((line) => line.startsWith(`${prefix} `));
    if (matching.length !== 1 || matching[0] !== `${prefix} ${expected}`) refuse('HOLD_RESOURCE_VERIFIER_OUTPUT');
  }
}

function buildResourceReceipt({ parsed, processes, profileBytes, frameBytes, producerCommit, producerTree, agentsCommit, agentsTree, observerSourceSha256, observerBinarySha256, toolchainSha256, targetTriple, platform }) {
  const frequency = exactDecimal(parsed.observer.clock.frequency, 'HOLD_NATIVE_PROTOCOL_CLOCK');
  const metrics = resourceMetrics(processes, frequency);
  const body = {
    agentsCommit,
    agentsTree,
    arch: 'x64',
    authorizing: false,
    clock: parsed.observer.clock,
    elapsedMillis: metrics.elapsedMillis,
    frameByteLength: frameBytes.length,
    frameSha256: sha256Bytes(frameBytes),
    limits: { ...TASK6_RESOURCE_LIMITS },
    maxConcurrentTreePeakRssKiB: metrics.maxConcurrentTreePeakRssKiB,
    maxProcessPeakRssKiB: metrics.maxProcessPeakRssKiB,
    maximizingProcessKeys: metrics.maximizingProcessKeys,
    measurementInterval: MEASUREMENT_INTERVAL,
    measurementMechanism: parsed.observer.mechanism,
    mechanismEvidence: parsed.observer.reconciliation,
    mechanismSha256: sha256Bytes(Buffer.from(canonicalJsonText(parsed.observer.reconciliation), 'utf8')),
    observerBinarySha256,
    observerSourceSha256,
    platform,
    processes,
    producerCommit,
    producerTree,
    profileByteLength: profileBytes.length,
    profileSha256: sha256Bytes(profileBytes),
    receiptDigest: '',
    schema: RECEIPT_SCHEMA,
    status: 'PASS',
    targetTriple,
    toolchainSha256,
  };
  body.receiptDigest = canonicalReceiptDigest(body);
  return body;
}

export async function runFrozenGitResourceHarness(options) {
  const captured = captureOptions(options);
  regularFile(captured.profilePath, 'REFUSED_RESOURCE_PROFILE');
  requireAbsent(captured.framePath, 'REFUSED_RESOURCE_FRAME_PATH');
  const profileBytes = readBounded(captured.profilePath, 1024 * 1024, 'HOLD_RESOURCE_PROFILE_SIZE');
  let agentsStat;
  try { agentsStat = lstatSync(captured.agentsRoot); } catch { refuse('REFUSED_RESOURCE_AGENTS_ROOT'); }
  if (!agentsStat.isDirectory() || agentsStat.isSymbolicLink()) refuse('REFUSED_RESOURCE_AGENTS_ROOT');
  requireAbsent(captured.receiptPath, 'REFUSED_RESOURCE_RECEIPT_PATH');
  const platform = process.platform;
  const arch = process.arch;
  if ((platform !== 'win32' && platform !== 'linux') || arch !== 'x64') refuse('HOLD_NATIVE_PLATFORM_UNAVAILABLE');
  const targetTriple = platform === 'win32' ? 'x86_64-pc-windows-msvc' : 'x86_64-unknown-linux-gnu';
  const root = mkdtempSync(path.join(tmpdir(), 'galerina-task6-resource-'));
  let rootReal;
  try { rootReal = realpathSync.native(root); } catch { refuse('HOLD_RESOURCE_CLEANUP'); }
  let buildRoot = null;
  let failure = null;
  let graded = null;
  let receiptText = null;
  let finalFrameBytes = null;
  try {
    const modulePath = fileURLToPath(import.meta.url);
    const repositoryRoot = path.resolve(path.dirname(modulePath), '../../..');
    const nativeRoot = path.resolve(path.dirname(modulePath), '../../native/process-tree-observer');
    const buildScript = path.resolve(path.dirname(modulePath), '../../build-process-tree-observer.mjs');
    const verifierTest = path.resolve(captured.agentsRoot, 'tools', 'artifact-admission.test.mjs');
    regularFile(verifierTest, 'HOLD_RESOURCE_VERIFIER_UNAVAILABLE');
    await requireCleanGit(repositoryRoot, 'HOLD_RESOURCE_PRODUCER_IDENTITY');
    await requireCleanGit(captured.agentsRoot, 'HOLD_RESOURCE_AGENTS_IDENTITY');
    const producerHead = await gitText(['rev-parse', 'HEAD'], repositoryRoot, 'HOLD_RESOURCE_PRODUCER_IDENTITY');
    const producerTree = await gitText(['rev-parse', `${captured.commitOid}^{tree}`], repositoryRoot, 'HOLD_RESOURCE_PRODUCER_IDENTITY');
    const agentsCommit = await gitText(['rev-parse', 'HEAD'], captured.agentsRoot, 'HOLD_RESOURCE_AGENTS_IDENTITY');
    const agentsTree = await gitText(['rev-parse', 'HEAD^{tree}'], captured.agentsRoot, 'HOLD_RESOURCE_AGENTS_IDENTITY');
    if (producerHead !== captured.commitOid) refuse('HOLD_RESOURCE_PRODUCER_IDENTITY');
    const rustc = await toolText('rustc', ['--version'], 'HOLD_RESOURCE_TOOLCHAIN');
    const cargo = await toolText('cargo', ['--version'], 'HOLD_RESOURCE_TOOLCHAIN');
    const toolchainSha256 = sha256Bytes(Buffer.from(`${rustc}\0${cargo}\0${targetTriple}`, 'utf8'));
    const observerSourceSha256 = nativeSourceDigest(nativeRoot);
    const build = await execFileAsync(process.execPath, [buildScript], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const observerPath = build.stdout.trim();
    if (!observerPath || observerPath.includes('\n')) refuse('HOLD_NATIVE_OBSERVER_UNAVAILABLE');
    const resolvedObserver = path.resolve(observerPath);
    buildRoot = path.resolve(path.dirname(path.dirname(path.dirname(resolvedObserver))));
    if (!buildRoot.startsWith(path.resolve(tmpdir()) + path.sep)) refuse('HOLD_NATIVE_OBSERVER_UNAVAILABLE');
    const eventPath = path.join(root, 'events.json');
    const stdoutPath = path.join(root, 'stdout.txt');
    const stderrPath = path.join(root, 'stderr.txt');
    const frameOutputPath = path.join(root, 'produced.gaaf');
    const wrapperPath = path.join(root, 'stage-runner.mjs');
    const nonceFixturePath = path.join(root, 'nonce-fixture.mjs');
    const nonceEventPath = path.join(root, 'nonce-events.json');
    const nonceStdoutPath = path.join(root, 'nonce-stdout.txt');
    const nonceStderrPath = path.join(root, 'nonce-stderr.txt');
    const profileStagePath = path.join(root, 'profile.json');
    writeFileSync(wrapperPath, stageRunnerSource(), { flag: 'wx', mode: 0o600 });
    writeFileSync(nonceFixturePath, nonceFixtureSource(), { flag: 'wx', mode: 0o600 });
    writeFileSync(profileStagePath, profileBytes, { flag: 'wx', mode: 0o600 });
    const frameStage = path.resolve(path.dirname(modulePath), '../../galerina-source-origin-frame.mjs');
    const observerBinarySha256 = sha256Bytes(readFileSync(resolvedObserver));
    const nonce = sha256Bytes(Buffer.from(`${process.pid}\0${root}`, 'utf8')).slice(0, 32);
    const preflight = await invokeObserver(resolvedObserver, nonceEventPath, nonceStdoutPath, nonceStderrPath, process.execPath, [nonceFixturePath, nonce, 'root']);
    if (preflight.stdout || preflight.stderr || statSync(nonceStderrPath).size !== 0 || statSync(nonceStdoutPath).size > CAPTURED_OUTPUT_LIMIT || statSync(nonceStderrPath).size > CAPTURED_OUTPUT_LIMIT) refuse('HOLD_NATIVE_NONCE_PREFLIGHT');
    validateNoncePreflight(parseObserverBytes(readBounded(nonceEventPath, OBSERVER_EVENT_LIMIT, 'HOLD_NATIVE_NONCE_PREFLIGHT'), platform), readBounded(nonceStdoutPath, CAPTURED_OUTPUT_LIMIT, 'HOLD_NATIVE_NONCE_PREFLIGHT'), nonce);
    const result = await invokeObserver(observerPath, eventPath, stdoutPath, stderrPath, process.execPath, [wrapperPath, frameStage, captured.commitOid, profileStagePath, frameOutputPath, verifierTest]);
    if (result.stderr || statSync(stderrPath).size !== 0) refuse('HOLD_NATIVE_OBSERVER_STDERR');
    if (result.stdout || statSync(stdoutPath).size > CAPTURED_OUTPUT_LIMIT || statSync(stderrPath).size > CAPTURED_OUTPUT_LIMIT) refuse('HOLD_NATIVE_OBSERVER_STDOUT');
    const observerResult = parseObserverBytes(readBounded(eventPath, OBSERVER_EVENT_LIMIT, 'HOLD_NATIVE_EVENT_SIZE'), platform);
    const frameBytes = readBounded(frameOutputPath, 134217728, 'HOLD_RESOURCE_FRAME_BINDING');
    parseVerifierOutput(readBounded(stdoutPath, CAPTURED_OUTPUT_LIMIT, 'HOLD_RESOURCE_VERIFIER_OUTPUT'));
    finalFrameBytes = Buffer.from(frameBytes);
    const processes = stageRows(observerResult);
    await requireCleanGit(repositoryRoot, 'HOLD_RESOURCE_PRODUCER_IDENTITY');
    await requireCleanGit(captured.agentsRoot, 'HOLD_RESOURCE_AGENTS_IDENTITY');
    if (await gitText(['rev-parse', 'HEAD'], repositoryRoot, 'HOLD_RESOURCE_PRODUCER_IDENTITY') !== producerHead
      || producerHead !== captured.commitOid
      || await gitText(['rev-parse', `${captured.commitOid}^{tree}`], repositoryRoot, 'HOLD_RESOURCE_PRODUCER_IDENTITY') !== producerTree
      || await gitText(['rev-parse', 'HEAD'], captured.agentsRoot, 'HOLD_RESOURCE_AGENTS_IDENTITY') !== agentsCommit
      || await gitText(['rev-parse', 'HEAD^{tree}'], captured.agentsRoot, 'HOLD_RESOURCE_AGENTS_IDENTITY') !== agentsTree
      || await toolText('rustc', ['--version'], 'HOLD_RESOURCE_TOOLCHAIN') !== rustc
      || await toolText('cargo', ['--version'], 'HOLD_RESOURCE_TOOLCHAIN') !== cargo
      || nativeSourceDigest(nativeRoot) !== observerSourceSha256
      || sha256Bytes(readFileSync(resolvedObserver)) !== observerBinarySha256) refuse('HOLD_RESOURCE_IDENTITY_DRIFT');
    const receipt = buildResourceReceipt({
      parsed: observerResult,
      processes,
      profileBytes,
      frameBytes,
      producerCommit: captured.commitOid,
      producerTree,
      agentsCommit,
      agentsTree,
      observerSourceSha256,
      observerBinarySha256,
      toolchainSha256,
      targetTriple,
      platform,
    });
    graded = gradeCompleteProcessTreeResourceReceipt(receipt);
    receiptText = canonicalJsonText(receipt);
  } catch (error) {
    failure = error instanceof ProcessTreeResourceRefusal ? error : new ProcessTreeResourceRefusal('HOLD_NATIVE_OBSERVER_UNAVAILABLE');
  } finally {
    try {
      const stat = lstatSync(root);
      if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync.native(root) !== rootReal) throw new Error('root identity changed');
      rmSync(rootReal, { recursive: true, force: false });
    } catch { failure ??= new ProcessTreeResourceRefusal('HOLD_RESOURCE_CLEANUP'); }
    try {
      if (buildRoot) {
        const stat = lstatSync(buildRoot);
        if (!stat.isDirectory() || stat.isSymbolicLink() || !buildRoot.startsWith(path.resolve(tmpdir()) + path.sep) || realpathSync.native(buildRoot) !== buildRoot) throw new Error('build identity uncertain');
        rmSync(buildRoot, { recursive: true, force: false });
      }
    } catch { failure ??= new ProcessTreeResourceRefusal('HOLD_RESOURCE_CLEANUP'); }
  }
  if (failure) throw failure;
  try { writeFileSync(captured.framePath, finalFrameBytes, { flag: 'wx', mode: 0o600 }); } catch { refuse('HOLD_RESOURCE_FRAME_OUTPUT'); }
  try { writeFileSync(captured.receiptPath, Buffer.from(receiptText, 'utf8'), { flag: 'wx' }); } catch { refuse('HOLD_RESOURCE_OUTPUT'); }
  return graded;
}
