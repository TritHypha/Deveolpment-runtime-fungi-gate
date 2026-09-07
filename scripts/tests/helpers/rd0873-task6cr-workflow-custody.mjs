import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import childProcess from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isProxy } from 'node:util/types';
import { canonicalJsonText } from '../../lib/logic-aig-source-origin/contract.mjs';

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
  if (process.argv.length !== 3 || process.argv[2] !== '--self-test') refuse();
  for (const key of Object.keys(process.env)) if (/^RD0873_TASK6CR_/iu.test(key)) refuse();
  await selfTest();
  process.stdout.write('TASK6CR_CUSTODY_SELF_TEST_OK\n');
}
if (process.argv[1] && equalPath(path.resolve(process.argv[1]), SELF)) {
  main().catch(() => { process.stdout.write(`${CODE}\n`); process.exitCode = 2; });
}
