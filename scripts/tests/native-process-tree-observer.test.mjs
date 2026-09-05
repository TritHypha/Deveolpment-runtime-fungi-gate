import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);

function fixtureSource() {
  return `import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [nonce, role] = process.argv.slice(2);
const file = fileURLToPath(import.meta.url);
const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));
function announce(name) { process.stdout.write(\`nonce:\${nonce}:\${name}:\${process.pid}\\n\`); }
function child(name) {
  return new Promise((resolve, reject) => {
    const spawned = spawn(process.execPath, [file, nonce, name], { stdio: ['ignore', 'inherit', 'inherit'] });
    spawned.once('error', reject);
    spawned.once('exit', (code, signal) => code === 0 && signal === null ? resolve() : reject(new Error('fixture child failed')));
  });
}
if (role === 'root') { announce('root'); await Promise.all([child('child-a'), child('child-b')]); }
else if (role === 'child-a') { announce('child-a'); await child('grandchild-a'); await sleep(80); }
else if (role === 'child-b') { announce('child-b'); await sleep(140); }
else if (role === 'grandchild-a') { announce('grandchild-a'); await sleep(20); }
else process.exitCode = 2;
`;
}

function digestNonce(nonce, root) {
  return createHash('sha256').update(`${process.pid}\0${root}\0${nonce}`, 'utf8').digest('hex').slice(0, 32);
}

async function runObserver(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = []; const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('native observer timeout')); }, 120_000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }); });
  });
}

test('Task 6C-R native observer captures every nonce identity on the actual lane', { timeout: 180_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'galerina-native-observer-test-'));
  let buildOutputRoot = null;
  try {
    const build = await execFileAsync(process.execPath, ['scripts/build-process-tree-observer.mjs'], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const binary = build.stdout.trim();
    assert.ok(binary.length > 0 && !binary.includes('\n'));
    buildOutputRoot = path.resolve(binary, '..', '..', '..');
    assert.equal(buildOutputRoot.startsWith(`${path.resolve(tmpdir())}${path.sep}`), true);
    const fixture = path.join(root, 'fixture.mjs');
    const events = path.join(root, 'events.json');
    const stdout = path.join(root, 'stdout.txt');
    const stderr = path.join(root, 'stderr.txt');
    writeFileSync(fixture, fixtureSource(), { flag: 'wx', mode: 0o600 });
    const nonce = digestNonce('native-observer', root);
    const result = await runObserver(binary, ['--protocol', 'galerina.process-tree-observer.v1', '--events', events, '--stdout', stdout, '--stderr', stderr, '--', process.execPath, fixture, nonce, 'root']);
    assert.equal(result.code, 0, result.stderr.toString('utf8'));
    assert.equal(result.signal, null);
    assert.equal(result.stdout.length, 0);
    assert.equal(result.stderr.length, 0);
    const observer = JSON.parse(readFileSync(events, 'utf8'));
    assert.equal(observer.schema, 'galerina.process-tree-observer.v1');
    assert.equal(observer.reconciliation.terminalState, 'reconciled');
    assert.equal(observer.rootTermination.kind, 'exit');
    assert.equal(observer.rootTermination.code, 0);
    const creates = new Map(observer.events.filter((event) => event.kind === 'create').map((event) => [event.pid, event]));
    const exits = new Map(observer.events.filter((event) => event.kind === 'exit').map((event) => [event.pid, event]));
    assert.equal(creates.size, 4);
    assert.equal(exits.size, 4);
    const roles = new Map();
    for (const line of readFileSync(stdout, 'utf8').trimEnd().split('\n')) {
      const match = /^nonce:([0-9a-f]+):([a-z-]+):([0-9]+)$/u.exec(line);
      assert.ok(match);
      assert.equal(match[1], nonce);
      assert.equal(roles.has(match[2]), false);
      roles.set(match[2], Number(match[3]));
    }
    assert.deepEqual([...roles.keys()].sort(), ['child-a', 'child-b', 'grandchild-a', 'root']);
    const rootCreate = creates.get(roles.get('root'));
    const childA = creates.get(roles.get('child-a'));
    const childB = creates.get(roles.get('child-b'));
    const grandchild = creates.get(roles.get('grandchild-a'));
    assert.ok(rootCreate && childA && childB && grandchild);
    assert.equal(rootCreate.parentProcessKey, null);
    assert.equal(childA.parentPid, rootCreate.pid);
    assert.equal(childB.parentPid, rootCreate.pid);
    assert.equal(grandchild.parentPid, childA.pid);
    assert.equal(childA.parentProcessKey, rootCreate.processKey);
    assert.equal(childB.parentProcessKey, rootCreate.processKey);
    assert.equal(grandchild.parentProcessKey, childA.processKey);
    const end = (event) => exits.get(event.pid).tick;
    assert.ok(BigInt(childA.tick) <= BigInt(end(childB)) && BigInt(childB.tick) <= BigInt(end(childA)));
    assert.ok(BigInt(childA.tick) <= BigInt(grandchild.tick) && BigInt(end(grandchild)) <= BigInt(end(childA)));
  } finally {
    if (buildOutputRoot && buildOutputRoot.startsWith(`${path.resolve(tmpdir())}${path.sep}`)) rmSync(buildOutputRoot, { recursive: true, force: false });
    rmSync(root, { recursive: true, force: false });
  }
});
