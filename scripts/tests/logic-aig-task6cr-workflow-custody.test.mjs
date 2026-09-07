import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  captureRegularFile, assertExactInventory, extractPinnedProfile,
  readFixedGitBlob, reserveOwnedRoot, validateOwnedRoot, writePinnedProfile,
} from './helpers/rd0873-task6cr-workflow-custody.mjs';

const HELPER = new URL('./helpers/rd0873-task6cr-workflow-custody.mjs', import.meta.url);
const SOURCE = new URL('../galerina-source-origin-frame.mjs', import.meta.url);
const HOLD = (error) => error?.code === 'HOLD_TASK6CR_CUSTODY';
const HASH = (bytes) => createHash('sha256').update(bytes).digest('hex');
const CONTEXT = Object.freeze({ runId: '123', runAttempt: '1', job: process.platform === 'win32' ? 'producer-windows' : 'producer-linux' });
const PAYLOAD = Object.freeze(['frame.gaaf', 'profile.json']);

async function temporary(body) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'task6cr-custody-test-'));
  try { await body(root); } finally { fs.rmSync(root, { recursive: true, force: false }); }
}

function child(source, args = []) {
  return spawnSync(process.execPath, ['--input-type=module', '--eval', source, ...args], {
    encoding: 'utf8', timeout: 10000, maxBuffer: 1048576, windowsHide: true,
  });
}

test('Task 6C-R custody captures owned regular bytes and exact inventory', async () => temporary(async (root) => {
  fs.writeFileSync(path.join(root, 'profile.json'), 'abc');
  fs.writeFileSync(path.join(root, 'frame.gaaf'), 'frame');
  const bytes = await captureRegularFile(root, 'profile.json', 3);
  fs.writeFileSync(path.join(root, 'profile.json'), 'xyz');
  assert.equal(bytes.toString(), 'abc');
  await assertExactInventory(root, PAYLOAD);
}));

test('Task 6C-R custody refuses pre-read size overflow', async () => temporary(async (root) => {
  fs.writeFileSync(path.join(root, 'profile.json'), Buffer.alloc(17));
  await assert.rejects(captureRegularFile(root, 'profile.json', 16), HOLD);
}));

test('Task 6C-R custody refuses a directory member', async () => temporary(async (root) => {
  fs.mkdirSync(path.join(root, 'frame.gaaf'));
  await assert.rejects(captureRegularFile(root, 'frame.gaaf', 134217728), HOLD);
}));

test('Task 6C-R custody refuses missing files and uncontrolled locators', async () => temporary(async (root) => {
  for (const name of ['profile.json', '../profile.json', 'other.json', '', 'profile.json\n']) {
    await assert.rejects(captureRegularFile(root, name, 16), HOLD);
  }
  for (const cap of [-1, 1.1, NaN, Infinity, '16', 134217729]) {
    await assert.rejects(captureRegularFile(root, 'profile.json', cap), HOLD);
  }
}));

test('Task 6C-R custody refuses sparse overflow without allocation or read', async () => temporary(async (root) => {
  const member = path.join(root, 'frame.gaaf');
  const descriptor = fs.openSync(member, 'wx');
  fs.ftruncateSync(descriptor, 134217729);
  fs.closeSync(descriptor);
  const result = child(`
    import fs from 'node:fs';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    let reads = 0;
    mock.method(fs, 'openSync', () => { reads++; throw new Error('read sentinel'); });
    try { await helper.captureRegularFile(process.argv[1], 'frame.gaaf', 134217728); process.exitCode = 3; }
    catch (error) { if (error.code !== 'HOLD_TASK6CR_CUSTODY' || reads !== 0) process.exitCode = 4; }
  `, [root]);
  assert.equal(result.status, 0, result.stderr);
}));

test('Task 6C-R custody refuses extra and nested inventory members', async () => temporary(async (root) => {
  fs.writeFileSync(path.join(root, 'profile.json'), '{}');
  fs.writeFileSync(path.join(root, 'frame.gaaf'), 'frame');
  fs.writeFileSync(path.join(root, 'extra'), 'x');
  await assert.rejects(assertExactInventory(root, PAYLOAD), HOLD);
  fs.unlinkSync(path.join(root, 'extra'));
  fs.mkdirSync(path.join(root, 'nested'));
  await assert.rejects(assertExactInventory(root, PAYLOAD), HOLD);
  await assert.rejects(assertExactInventory(root, ['frame.gaaf', 'profile.json']), HOLD);
}));

test('Task 6C-R custody refuses symlink and junction ancestry', async () => temporary(async (root) => {
  const target = path.join(root, 'target');
  const alias = path.join(root, 'alias');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'profile.json'), '{}');
  fs.symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(captureRegularFile(alias, 'profile.json', 16), HOLD);
  await assert.rejects(assertExactInventory(alias, Object.freeze(['profile.json'])), HOLD);
}));

test('Task 6C-R custody refuses a linked member', async () => temporary(async (root) => {
  fs.writeFileSync(path.join(root, 'frame.gaaf'), 'frame');
  fs.linkSync(path.join(root, 'frame.gaaf'), path.join(root, 'profile.json'));
  await assert.rejects(captureRegularFile(root, 'profile.json', 16), HOLD);
}));

test('Task 6C-R custody refuses a symbolic file member', async () => temporary(async (root) => {
  fs.writeFileSync(path.join(root, 'frame.gaaf'), 'frame');
  fs.symlinkSync(path.join(root, 'frame.gaaf'), path.join(root, 'profile.json'), 'file');
  await assert.rejects(captureRegularFile(root, 'profile.json', 16), HOLD);
}));

for (const fault of ['changed-identity', 'short-read', 'close-failure']) {
  test(`Task 6C-R custody refuses ${fault}`, async () => temporary(async (root) => {
    fs.writeFileSync(path.join(root, 'profile.json'), 'abc');
    const result = child(`
      import fs from 'node:fs';
      import { mock } from 'node:test';
      const helper = await import(${JSON.stringify(HELPER.href)});
      const originalRead = fs.readSync;
      const originalStat = fs.fstatSync;
      const originalClose = fs.closeSync;
      let touched = 0;
      const fault = ${JSON.stringify(fault)};
      if (fault === 'short-read') mock.method(fs, 'readSync', () => { touched++; return 0; });
      if (fault === 'changed-identity') mock.method(fs, 'fstatSync', (...args) => {
        touched++;
        const stat = originalStat(...args);
        Object.defineProperty(stat, 'ino', { value: stat.ino + 1n });
        return stat;
      });
      if (fault === 'close-failure') mock.method(fs, 'closeSync', (fd) => {
        touched++; originalClose(fd); throw new Error('PRIVATE_PATH_SENTINEL');
      });
      try { await helper.captureRegularFile(process.argv[1], 'profile.json', 3); process.exitCode = 3; }
      catch (error) {
        if (error.code !== 'HOLD_TASK6CR_CUSTODY' || touched === 0 || /PRIVATE/.test(String(error))) process.exitCode = 4;
      }
    `, [root]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));
}

test('Task 6C-R custody extracts only the exact non-evaluated profile literal', () => {
  const source = fs.readFileSync(SOURCE);
  const profile = extractPinnedProfile(source);
  assert.equal(profile.length, 1131);
  assert.equal(HASH(profile), '8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e');
  assert.equal(profile.includes(10) || profile.includes(13), false);
  const declaration = source.toString().match(/^const PINNED_PROFILE_JSON = .*$/mu)[0];
  for (const invalid of [Buffer.alloc(0), Buffer.from([255]), Buffer.from(declaration + '\n' + declaration),
    Buffer.from(declaration.replace('1131', '1132').replace('galerina.source-origin', 'changed.source-origin')),
    Buffer.from("const PINNED_PROFILE_JSON = 'escaped\\n';")]) {
    assert.throws(() => extractPinnedProfile(invalid), HOLD);
  }
  assert.deepEqual(extractPinnedProfile(Buffer.from(`throw new Error('must not execute');\n${declaration}\n`)), profile);
});

test('Task 6C-R custody reserves exclusive current-run roots and rejects stale records', async () => {
  const custody = await reserveOwnedRoot(CONTEXT);
  try {
    await validateOwnedRoot(custody, CONTEXT);
    assert.equal(path.isAbsolute(custody.root), true);
    assert.deepEqual(fs.readdirSync(custody.root), ['custody.json']);
    await assert.rejects(validateOwnedRoot(custody, { ...CONTEXT, runAttempt: '2' }), HOLD);
    await assert.rejects(validateOwnedRoot({ ...custody, nonce: '0'.repeat(64) }, CONTEXT), HOLD);
    fs.appendFileSync(path.join(custody.root, 'custody.json'), '\n');
    await assert.rejects(validateOwnedRoot(custody, CONTEXT), HOLD);
  } finally { fs.rmSync(custody.root, { recursive: true, force: false }); }
  await assert.rejects(reserveOwnedRoot({ ...CONTEXT, runId: '1\n' }), HOLD);
  await assert.rejects(reserveOwnedRoot({ ...CONTEXT, unexpected: true }), HOLD);
});

test('Task 6C-R custody refuses missing root records', async () => {
  const custody = await reserveOwnedRoot(CONTEXT);
  try {
    fs.unlinkSync(path.join(custody.root, 'custody.json'));
    await assert.rejects(validateOwnedRoot(custody, CONTEXT), HOLD);
  } finally { fs.rmdirSync(custody.root); }
});

test('Task 6C-R custody removes its empty reservation after record-write failure', () => {
  const result = child(`
    import fs from 'node:fs';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    const original = fs.mkdtempSync;
    let created;
    mock.method(fs, 'mkdtempSync', (...args) => { created = original(...args); return created; });
    mock.method(fs, 'writeFileSync', () => { throw new Error('PRIVATE_PATH_SENTINEL'); });
    let code;
    try { await helper.reserveOwnedRoot(${JSON.stringify(CONTEXT)}); } catch (error) { code = error.code; }
    const retained = created && fs.existsSync(created);
    if (retained) fs.rmdirSync(created);
    if (code !== 'HOLD_TASK6CR_CUSTODY' || !created || retained) process.exitCode = 4;
  `);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('Task 6C-R custody refuses uncontrolled Git kinds and commits before Git', async () => temporary(async (root) => {
  for (const [commit, kind] of [['main', 'workflow'], ['1'.repeat(40), 'other'], ['1'.repeat(40) + '\n', 'workflow']]) {
    await assert.rejects(readFixedGitBlob(root, commit, kind), HOLD);
  }
}));

test('Task 6C-R custody fixed CLI refuses unknown inputs without leaking bodies', () => {
  for (const args of [['--unknown', 'PRIVATE_BODY_PATH_SENTINEL'], ['--self-test', 'extra']]) {
    const result = spawnSync(process.execPath, [fileURLToPath(HELPER), ...args], {
      encoding: 'utf8', timeout: 10000, maxBuffer: 1048576, windowsHide: true,
    });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, 'HOLD_TASK6CR_CUSTODY\n');
    assert.equal(result.stderr, '');
  }
});

test('Task 6C-R custody fixed self-test emits only its success marker', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(HELPER), '--self-test'], {
    encoding: 'utf8', timeout: 10000, maxBuffer: 1048576, windowsHide: true,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout, 'TASK6CR_CUSTODY_SELF_TEST_OK\n');
  assert.equal(result.stderr, '');
});

test('Task 6C-R custody profile write is exclusive and validates custody before effects', async () => {
  const custody = await reserveOwnedRoot(CONTEXT);
  try {
    const source = fs.readFileSync(SOURCE);
    await assert.rejects(writePinnedProfile(custody, { ...CONTEXT, runAttempt: '2' }, source), HOLD);
    assert.deepEqual(fs.readdirSync(custody.root), ['custody.json']);
    await writePinnedProfile(custody, CONTEXT, source);
    const first = fs.readFileSync(path.join(custody.root, 'profile.json'));
    assert.equal(HASH(first), '8b89fa23a5e84d2c16f885ce8946bf1b7e4547a8f06bf63c66b9e3db60479f0e');
    await assert.rejects(writePinnedProfile(custody, CONTEXT, source), HOLD);
    assert.deepEqual(fs.readFileSync(path.join(custody.root, 'profile.json')), first);
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(custody.root, 'profile.json')).mode & 0o777, 0o600);
  } finally { fs.rmSync(custody.root, { recursive: true, force: false }); }
});

for (const fault of ['timeout', 'overflow', 'stderr', 'wrong-marker']) {
  test(`Task 6C-R custody bounded child refuses ${fault} with body-free output`, () => {
    const result = child(`
      import cp from 'node:child_process';
      import { mock } from 'node:test';
      const original = cp.spawnSync;
      let called = 0;
      mock.method(cp, 'spawnSync', (exe, args, options) => {
        called++;
        if (exe !== process.execPath || options.shell !== false || options.windowsHide !== true
          || options.timeout !== 30000 || options.maxBuffer !== 1048576) throw new Error('bounds not enforced');
        if (Object.keys(options.env).some((key) => /TOKEN|SECRET|NODE_OPTIONS|PATH/.test(key))) throw new Error('environment leak');
        const fault = ${JSON.stringify(fault)};
        if (fault === 'overflow') return original(exe, ['--input-type=module', '--eval', "process.stdout.write('PRIVATE_BODY_PATH_SENTINEL'.repeat(60000))"], options);
        if (fault === 'timeout') return { error: new Error('PRIVATE_BODY_PATH_SENTINEL'), status: null, signal: 'SIGTERM', stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
        if (fault === 'stderr') return original(exe, ['--input-type=module', '--eval', "process.stderr.write('PRIVATE_BODY_PATH_SENTINEL')"], options);
        return { status: 0, signal: null, stdout: Buffer.from('PRIVATE_BODY_PATH_SENTINEL'), stderr: Buffer.alloc(0) };
      });
      process.env.GITHUB_TOKEN = 'PRIVATE_TOKEN_SENTINEL';
      process.argv = [process.execPath, ${JSON.stringify(fileURLToPath(HELPER))}, '--self-test'];
      await import(${JSON.stringify(HELPER.href)});
      process.on('beforeExit', () => { if (called !== 1) process.exitCode = 4; });
    `);
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.equal(result.stdout, 'HOLD_TASK6CR_CUSTODY\n');
    assert.equal(result.stderr, '');
  });
}

test('Task 6C-R custody reads immutable Git blobs despite CRLF checkout and refuses non-blob objects', async () => temporary(async (root) => {
  const repository = fileURLToPath(new URL('../../', import.meta.url));
  const git = process.platform === 'win32'
    ? path.join(repository, '.superpowers/sdd/2026-08-31-rd0873-portable-artifact-admission/toolchains/mingit-2.55.0.5/expanded/cmd/git.exe')
    : '/usr/bin/git';
  const run = (...args) => {
    const result = spawnSync(git, ['-c', `safe.directory=${root}`, '-c', 'user.name=Task6CR',
      '-c', 'user.email=task6cr@example.invalid', '-c', 'commit.gpgsign=false', '-C', root, ...args], {
      encoding: 'utf8', timeout: 30000, maxBuffer: 1048576, windowsHide: true,
    });
    assert.equal(result.error, undefined, 'Pinned Git must be provisioned; no ambient Git fallback');
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  run('init', '--quiet');
  fs.mkdirSync(path.join(root, '.github/workflows'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts/tests/fixtures'), { recursive: true });
  fs.writeFileSync(path.join(root, '.gitattributes'), '*.mjs text eol=crlf\n*.yml text eol=crlf\n');
  fs.writeFileSync(path.join(root, '.github/workflows/platform-smoke.yml'), 'name: fixture\r\n');
  fs.writeFileSync(path.join(root, 'scripts/galerina-source-origin-frame.mjs'), 'const fixture = true;\r\n');
  for (const lane of ['windows', 'linux']) fs.writeFileSync(path.join(root, `scripts/tests/fixtures/rd0873-task6-producer-${lane}-x64.v1.json`), '{}');
  run('add', '--all');
  run('commit', '--quiet', '-m', 'Temporary local custody fixture');
  const commit = run('rev-parse', 'HEAD');
  assert.equal(fs.readFileSync(path.join(root, '.github/workflows/platform-smoke.yml')).includes(13), true);
  assert.equal((await readFixedGitBlob(root, commit, 'workflow')).toString(), 'name: fixture\n');
  assert.equal((await readFixedGitBlob(root, commit, 'profile-source')).toString(), 'const fixture = true;\n');
  for (const lane of ['windows', 'linux']) assert.equal((await readFixedGitBlob(root, commit, `${lane}-fixture`)).toString(), '{}');
  fs.writeFileSync(path.join(root, '.github/workflows/platform-smoke.yml'), 'changed checkout\r\n');
  assert.equal((await readFixedGitBlob(root, commit, 'workflow')).toString(), 'name: fixture\n');
  await assert.rejects(readFixedGitBlob(root, run('rev-parse', 'HEAD^{tree}'), 'workflow'), HOLD);
  fs.writeFileSync(path.join(root, 'scripts/galerina-source-origin-frame.mjs'), Buffer.from([255]));
  run('add', '--all');
  run('commit', '--quiet', '-m', 'Temporary malformed source fixture');
  await assert.rejects(readFixedGitBlob(root, run('rev-parse', 'HEAD'), 'profile-source'), HOLD);
  fs.writeFileSync(path.join(root, '.github/workflows/platform-smoke.yml'), Buffer.alloc(1048577, 65));
  run('add', '--all');
  run('commit', '--quiet', '-m', 'Temporary oversized blob fixture');
  await assert.rejects(readFixedGitBlob(root, run('rev-parse', 'HEAD'), 'workflow'), HOLD);
  fs.writeFileSync(path.join(root, '.github/workflows/platform-smoke.yml'), 'symlink-target');
  const symlinkBlob = run('hash-object', '-w', '.github/workflows/platform-smoke.yml');
  run('update-index', '--add', '--cacheinfo', `120000,${symlinkBlob},.github/workflows/platform-smoke.yml`);
  run('commit', '--quiet', '-m', 'Temporary non-regular Git mode fixture');
  await assert.rejects(readFixedGitBlob(root, run('rev-parse', 'HEAD'), 'workflow'), HOLD);
}));

test('Task 6C-R custody Git reads prohibit lazy fetch and caller environment inheritance', () => {
  const result = child(`
    import cp from 'node:child_process';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    let observed = false;
    mock.method(cp, 'spawnSync', (executable, args, options) => {
      observed = options.env.GIT_NO_LAZY_FETCH === '1'
        && args.includes('protocol.allow=never') && !Object.hasOwn(options.env, 'GITHUB_TOKEN')
        && options.timeout > 0 && options.timeout <= 30000 && options.maxBuffer === 1048576;
      return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('PRIVATE_PATH_SENTINEL') };
    });
    try { await helper.readFixedGitBlob(process.argv[1], '1'.repeat(40), 'workflow'); } catch {}
    if (!observed) process.exitCode = 4;
  `, [fileURLToPath(new URL('../../', import.meta.url))]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('Task 6C-R custody Git read shares one finite deadline across object observations', () => {
  const result = child(`
    import cp from 'node:child_process';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    let clock = Date.now();
    let calls = 0;
    mock.method(Date, 'now', () => clock);
    mock.method(cp, 'spawnSync', () => {
      calls++;
      clock += 30001;
      return { status: 0, signal: null, stdout: Buffer.from(${JSON.stringify(`git version ${process.platform === 'win32' ? '2.55.0.windows.5' : '2.55.0'}\n`)}), stderr: Buffer.alloc(0) };
    });
    let code;
    try { await helper.readFixedGitBlob(process.argv[1], '1'.repeat(40), 'workflow'); } catch (error) { code = error.code; }
    if (code !== 'HOLD_TASK6CR_CUSTODY' || calls !== 1) process.exitCode = 4;
  `, [fileURLToPath(new URL('../../', import.meta.url))]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

function observeCompleteGitRead(corrupt) {
  const result = child(`
    import assert from 'node:assert/strict';
    import cp from 'node:child_process';
    import { createHash } from 'node:crypto';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    const lf = String.fromCharCode(10);
    const commit = '1'.repeat(40);
    const locator = '.github/workflows/platform-smoke.yml';
    const object = commit + ':' + locator;
    const original = Buffer.from('name: fixture' + lf);
    const captured = Buffer.from(${corrupt ? "'name: altered'" : "'name: fixture'"} + lf);
    const gitBlobOid = (bytes) => createHash('sha1')
      .update('blob ' + bytes.length + String.fromCharCode(0)).update(bytes).digest('hex');
    const treeBlobOid = gitBlobOid(original);
    const responses = [
      { args: ['--version'], text: 'git version ' + ${JSON.stringify(process.platform === 'win32' ? '2.55.0.windows.5' : '2.55.0')} + lf },
      { args: ['cat-file', '-t', commit], text: 'commit' + lf },
      { args: ['ls-tree', '-z', commit, '--', locator], text: '100644 blob ' + treeBlobOid + String.fromCharCode(9) + locator + String.fromCharCode(0) },
      { args: ['cat-file', '-t', object], text: 'blob' + lf },
      { args: ['cat-file', '-s', object], text: String(captured.length) + lf },
      { args: ['cat-file', 'blob', object], bytes: captured },
      { args: ['hash-object', '--stdin'] },
    ];
    const calls = [];
    const clock = Date.now();
    mock.method(Date, 'now', () => clock);
    process.env.GITHUB_TOKEN = 'PRIVATE_TOKEN_SENTINEL';
    mock.method(cp, 'spawnSync', (executable, args, options) => {
      const response = responses[calls.length];
      assert.ok(response, 'unexpected extra Git observation');
      const operation = args.slice(args.indexOf('-C') + 2);
      assert.deepEqual(operation, response.args);
      assert.equal(options.timeout, 30000);
      assert.equal(options.maxBuffer, 1048576);
      assert.equal(options.shell, false);
      assert.equal(options.env.GIT_NO_LAZY_FETCH, '1');
      assert.equal(Object.hasOwn(options.env, 'GITHUB_TOKEN'), false);
      let output;
      if (operation[0] === 'hash-object') {
        assert.ok(Buffer.isBuffer(options.input));
        assert.deepEqual(options.input, captured);
        output = Buffer.from(gitBlobOid(options.input) + lf);
      } else output = response.bytes ?? Buffer.from(response.text);
      calls.push(operation[0]);
      return { status: 0, signal: null, stdout: output, stderr: Buffer.alloc(0) };
    });
    let code = null;
    let returnedOriginal = false;
    try { returnedOriginal = (await helper.readFixedGitBlob(process.argv[1], commit, 'workflow')).equals(original); }
    catch (error) { code = error.code; }
    process.stdout.write(JSON.stringify({ calls, code, returnedOriginal }));
  `, [fileURLToPath(new URL('../../', import.meta.url))]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

test('Task 6C-R custody binds captured Git bytes to the tree blob OID', () => {
  const observed = observeCompleteGitRead(true);
  assert.equal(observed.code, 'HOLD_TASK6CR_CUSTODY');
  assert.equal(observed.returnedOriginal, false);
  assert.equal(observed.calls.at(-1), 'hash-object');
});

test('Task 6C-R custody unchanged clock permits every fixed Git observation through content hashing', () => {
  const observed = observeCompleteGitRead(false);
  assert.equal(observed.code, null);
  assert.equal(observed.returnedOriginal, true);
  assert.deepEqual(observed.calls, ['--version', 'cat-file', 'ls-tree', 'cat-file', 'cat-file', 'cat-file', 'hash-object']);
});
