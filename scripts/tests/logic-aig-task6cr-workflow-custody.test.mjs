import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import * as custodyHelper from './helpers/rd0873-task6cr-workflow-custody.mjs';
import { canonicalJsonText } from '../lib/logic-aig-source-origin/contract.mjs';

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
const REPOSITORY = fileURLToPath(new URL('../../', import.meta.url));
const PRODUCER_COMMIT = '20f303edc13c3c43194dff9567b06e88cf2c4acd';
const RECEIPT_CONTEXT = Object.freeze({ mode: 'observe', producerCommit: PRODUCER_COMMIT,
  producerTree: '4'.repeat(40), agentsCommit: '3'.repeat(40), agentsTree: '5'.repeat(40),
  evidenceCommit: null, ...CONTEXT, platform: process.platform, producerRoot: REPOSITORY, agentsRoot: REPOSITORY });

const ARTIFACT_NAMES = Object.freeze(['rd0873-task6-full-frame-windows-x64', 'rd0873-task6-receipt-windows-x64',
  'rd0873-task6-full-frame-linux-x64', 'rd0873-task6-receipt-linux-x64']);
const ARTIFACT_OUTPUT = Object.freeze({ id: '71', digest: 'a'.repeat(64), name: ARTIFACT_NAMES[0],
  producerCommit: '1'.repeat(40), agentsCommit: '2'.repeat(40), runId: '81', runAttempt: '1' });

test('Task 6C-R artifact binding captures a closed immutable output without granting provenance', () => {
  assert.equal(typeof custodyHelper.validateArtifactBinding, 'function');
  const output = { ...ARTIFACT_OUTPUT };
  const captured = custodyHelper.validateArtifactBinding(output, ARTIFACT_OUTPUT);
  assert.deepEqual(captured, ARTIFACT_OUTPUT);
  assert.notEqual(captured, output);
  assert.equal(Object.isFrozen(captured), true);
  output.id = '99';
  assert.equal(captured.id, '71');
});

test('Task 6C-R artifact binding refuses one changed field and malformed expectations', () => {
  assert.equal(typeof custodyHelper.validateArtifactBinding, 'function');
  for (const [key, values] of Object.entries({ id: ['0', '-1', '01', '71\n', 71, '72'],
    digest: ['', 'A'.repeat(64), 'a'.repeat(63), 'b'.repeat(64), 'a'.repeat(64) + '\n'],
    name: ['other', ARTIFACT_NAMES[1], ARTIFACT_NAMES[2]], producerCommit: ['3'.repeat(40), 'main'],
    agentsCommit: ['3'.repeat(40), '2'.repeat(40) + '\n'], runId: ['82', '0', '81\n'], runAttempt: ['2', '01', '1\n'] })) {
    for (const value of values) assert.throws(() => custodyHelper.validateArtifactBinding(
      { ...ARTIFACT_OUTPUT, [key]: value }, ARTIFACT_OUTPUT), HOLD, `${key}:${value}`);
  }
  for (const key of Object.keys(ARTIFACT_OUTPUT)) {
    const missing = { ...ARTIFACT_OUTPUT }; delete missing[key];
    assert.throws(() => custodyHelper.validateArtifactBinding(missing, ARTIFACT_OUTPUT), HOLD);
  }
  for (const invalid of [{ ...ARTIFACT_OUTPUT, extra: true }, { ...ARTIFACT_OUTPUT, id: '0' },
    { ...ARTIFACT_OUTPUT, name: 'not-an-artifact' }, { ...ARTIFACT_OUTPUT, digest: '' }]) {
    assert.throws(() => custodyHelper.validateArtifactBinding(invalid, invalid), HOLD);
  }
  let observed = false;
  const accessor = { ...ARTIFACT_OUTPUT };
  Object.defineProperty(accessor, 'id', { enumerable: true, get() { observed = true; return '71'; } });
  assert.throws(() => custodyHelper.validateArtifactBinding(accessor, ARTIFACT_OUTPUT), HOLD);
  assert.equal(observed, false);
  assert.throws(() => custodyHelper.validateArtifactBinding(ARTIFACT_OUTPUT, ARTIFACT_OUTPUT, {}), HOLD);
});

async function evidenceExample(body, fault = '') {
  return temporary(async (root) => {
    const git = process.platform === 'win32'
      ? path.join(REPOSITORY, '.superpowers/sdd/2026-08-31-rd0873-portable-artifact-admission/toolchains/mingit-2.55.0.5/expanded/cmd/git.exe')
      : '/usr/bin/git';
    const run = (...args) => {
      const result = spawnSync(git, ['-c', `safe.directory=${root}`, '-c', 'user.name=Task6CR',
        '-c', 'user.email=task6cr@example.invalid', '-c', 'commit.gpgsign=false', '-C', root, ...args], {
        encoding: 'utf8', timeout: 30000, maxBuffer: 1048576, windowsHide: true,
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    run('init', '--quiet');
    fs.mkdirSync(path.join(root, '.github/workflows'), { recursive: true });
    fs.mkdirSync(path.join(root, 'scripts/tests/fixtures'), { recursive: true });
    fs.writeFileSync(path.join(root, '.gitattributes'), '*.yml text eol=crlf\n');
    const workflow = path.join(root, '.github/workflows/platform-smoke.yml');
    fs.writeFileSync(workflow, 'name: temporary fixture\r\n');
    const fixturePath = (lane) => path.join(root, `scripts/tests/fixtures/rd0873-task6-producer-${lane}-x64.v1.json`);
    if (['present-parent', 'deletion'].includes(fault)) fs.writeFileSync(fixturePath('windows'), '{}');
    if (fault === 'rename') fs.writeFileSync(path.join(root, 'old-fixture.json'), '{}');
    run('add', '--all'); run('commit', '--quiet', '-m', 'Temporary producer');
    const producerCommit = run('rev-parse', 'HEAD');
    const producerTree = run('rev-parse', 'HEAD^{tree}');
    let captured;
    await temporary(async (captureRoot) => { captured = captureExample(captureRoot); });
    const base = JSON.parse(captured.receiptBytes);
    const receipts = {};
    for (const lane of ['windows', 'linux']) {
      const platform = lane === 'windows' ? 'win32' : 'linux';
      const receipt = { ...base, producerCommit, producerTree, platform,
        schema: `rd0873-task6-producer-${lane}-x64.v1`, git: { ...base.git, commitOid: producerCommit, treeOid: producerTree } };
      receipts[lane] = Buffer.from(canonicalJsonText(receipt));
      fs.writeFileSync(fixturePath(lane), receipts[lane]);
    }
    if (fault === 'wrong-parent') run('commit', '--allow-empty', '--quiet', '-m', 'Temporary intervening parent');
    if (fault === 'third-path') fs.writeFileSync(path.join(root, 'extra.txt'), 'extra');
    if (fault === 'workflow') fs.writeFileSync(workflow, 'name: changed workflow\r\n');
    if (fault === 'deletion') fs.unlinkSync(fixturePath('windows'));
    if (fault === 'rename') fs.unlinkSync(path.join(root, 'old-fixture.json'));
    if (fault === 'schema') fs.writeFileSync(fixturePath('linux'), canonicalJsonText({ ...JSON.parse(receipts.linux), schema: 'wrong' }));
    if (fault === 'platform') fs.writeFileSync(fixturePath('linux'), receipts.windows);
    run('add', '--all');
    if (fault === 'link-mode') {
      const oid = run('hash-object', '-w', fixturePath('linux'));
      run('update-index', '--cacheinfo', `120000,${oid},scripts/tests/fixtures/rd0873-task6-producer-linux-x64.v1.json`);
    }
    if (fault === 'hidden-submodule') {
      run('update-index', '--add', '--cacheinfo', `160000,${producerCommit},hidden-submodule`);
      run('config', 'diff.ignoreSubmodules', 'all');
    }
    run('commit', '--quiet', '-m', 'Temporary evidence additions');
    let evidenceCommit = run('rev-parse', 'HEAD');
    if (fault === 'multiple-parents') {
      const other = run('commit-tree', producerTree, '-m', 'Temporary unrelated root');
      evidenceCommit = run('commit-tree', run('rev-parse', 'HEAD^{tree}'), '-p', producerCommit, '-p', other, '-m', 'Temporary merge evidence');
    }
    await temporary(async (receiptRoot) => {
      const receiptPath = path.join(receiptRoot, 'platform-receipt.json');
      const selected = receipts[process.platform === 'win32' ? 'windows' : 'linux'];
      fs.writeFileSync(receiptPath, fault === 'unequal' ? Buffer.from(canonicalJsonText({ ...JSON.parse(selected), runId: '7'.repeat(64) })) : selected);
      // Working-tree bytes are explicitly not evidence; the committed LF blob is.
      if (fault === '') fs.writeFileSync(workflow, 'uncommitted CRLF checkout change\r\n');
      await body({ root, receiptPath, context: { ...RECEIPT_CONTEXT, mode: 'verify', producerCommit, producerTree, evidenceCommit } });
    });
  });
}

test('Task 6C-R evidence validates exact committed fixture additions despite changed CRLF checkout', async () => {
  assert.equal(typeof custodyHelper.validateEvidenceFixtures, 'function');
  await evidenceExample(async ({ root, receiptPath, context }) => {
    assert.equal(await custodyHelper.validateEvidenceFixtures(context, root, receiptPath), 'TASK6CR_EVIDENCE_FIXTURES_OK');
    await assert.rejects(custodyHelper.validateEvidenceFixtures({ ...context, mode: 'observe', evidenceCommit: null }, root, receiptPath), HOLD);
  });
});

for (const fault of ['wrong-parent', 'multiple-parents', 'third-path', 'rename', 'deletion', 'present-parent',
  'link-mode', 'schema', 'platform', 'unequal', 'workflow', 'hidden-submodule']) {
  test(`Task 6C-R evidence refuses ${fault}`, async () => {
    assert.equal(typeof custodyHelper.validateEvidenceFixtures, 'function');
    await evidenceExample(async ({ root, receiptPath, context }) => {
      await assert.rejects(custodyHelper.validateEvidenceFixtures(context, root, receiptPath), HOLD);
    }, fault);
  });
}

test('Task 6C-R evidence compares the fixed opposite fixture for a reciprocal lane', async () => {
  await evidenceExample(async ({ root, receiptPath, context }) => {
    const opposite = process.platform === 'win32' ? 'linux' : 'windows';
    fs.writeFileSync(receiptPath, fs.readFileSync(path.join(root, `scripts/tests/fixtures/rd0873-task6-producer-${opposite}-x64.v1.json`)));
    const reciprocal = { ...context, platform: process.platform === 'win32' ? 'linux' : 'win32',
      job: process.platform === 'win32' ? 'reciprocal-windows' : 'reciprocal-linux' };
    assert.equal(await custodyHelper.validateEvidenceFixtures(reciprocal, root, receiptPath), 'TASK6CR_EVIDENCE_FIXTURES_OK');
    await assert.rejects(custodyHelper.validateEvidenceFixtures({ ...reciprocal, producerTree: '9'.repeat(40) }, root, receiptPath), HOLD);
  });
});

test('Task 6C-R evidence accepts only the exact fixed Git interpreted-parent response', async () => {
  await evidenceExample(async ({ root, receiptPath, context }) => {
    for (const fault of ['none', 'empty', 'root', 'wrong-parent', 'multiple', 'extra-line', 'trailing-space', 'crlf']) {
      const result = child(`
        import assert from 'node:assert/strict';
        import cp from 'node:child_process';
        import { mock } from 'node:test';
        const helper = await import(${JSON.stringify(HELPER.href)});
        const original = cp.spawnSync;
        const context = ${JSON.stringify(context)};
        const fault = ${JSON.stringify(fault)};
        let observed = 0;
        let laterCalls = 0;
        mock.method(cp, 'spawnSync', (exe, args, options) => {
          const operation = args.slice(args.indexOf('-C') + 2);
          if (operation[0] === 'rev-list') {
            observed++;
            assert.deepEqual(operation, ['rev-list', '--parents', '--no-walk', '--no-abbrev-commit', context.evidenceCommit]);
            assert.equal(options.env.GIT_NO_REPLACE_OBJECTS, '1');
            assert.equal(options.env.GIT_NO_LAZY_FETCH, '1');
            assert.equal(options.shell, false);
            assert.ok(options.timeout > 0 && options.timeout <= 30000);
            const exact = context.evidenceCommit + ' ' + context.producerCommit;
            const outputs = { none: exact + '\\n', empty: '', root: context.evidenceCommit + '\\n',
              'wrong-parent': context.evidenceCommit + ' ' + '9'.repeat(40) + '\\n',
              multiple: exact + ' ' + '9'.repeat(40) + '\\n', 'extra-line': exact + '\\n' + exact + '\\n',
              'trailing-space': exact + ' \\n', crlf: exact + '\\r\\n' };
            return { status: 0, signal: null, stdout: Buffer.from(outputs[fault]), stderr: Buffer.alloc(0) };
          }
          if (observed) laterCalls++;
          return original(exe, args, options);
        });
        let code = null;
        let value;
        try { value = await helper.validateEvidenceFixtures(context, ${JSON.stringify(root)}, ${JSON.stringify(receiptPath)}); }
        catch (error) { code = error.code; }
        assert.equal(observed, 1, 'parent authority must come from the fixed Git interpreter');
        if (fault === 'none') { assert.equal(code, null); assert.equal(value, 'TASK6CR_EVIDENCE_FIXTURES_OK'); }
        else { assert.equal(code, 'HOLD_TASK6CR_CUSTODY'); assert.equal(laterCalls, 0); }
      `);
      assert.equal(result.status, 0, fault + ': ' + result.stdout + result.stderr);
    }
  });
});

test('Task 6C-R evidence scratch unlink failure retains HOLD and leaves outside roots untouched', async () => {
  await evidenceExample(async ({ root, receiptPath, context }) => {
    const sentinel = path.join(root, 'native-root-sentinel');
    fs.writeFileSync(sentinel, 'untouched');
    const result = child(`
      import fs from 'node:fs';
      import path from 'node:path';
      import assert from 'node:assert/strict';
      import { mock } from 'node:test';
      const helper = await import(${JSON.stringify(HELPER.href)});
      const unlink = fs.unlinkSync;
      let refusedRoot;
      mock.method(fs, 'unlinkSync', (locator) => {
        if (path.basename(locator) === 'platform-receipt.json' && path.basename(path.dirname(locator)).startsWith('task6cr-custody-')) {
          refusedRoot = path.dirname(locator);
          throw new Error('PRIVATE_CLEANUP_SENTINEL');
        }
        return unlink(locator);
      });
      let code;
      try { await helper.validateEvidenceFixtures(${JSON.stringify(context)}, ${JSON.stringify(root)}, ${JSON.stringify(receiptPath)}); }
      catch (error) { code = error.code; }
      assert.equal(code, 'HOLD_TASK6CR_CUSTODY');
      assert.ok(refusedRoot);
      assert.equal(fs.readFileSync(${JSON.stringify(sentinel)}, 'utf8'), 'untouched');
      assert.deepEqual(fs.readdirSync(refusedRoot).sort(), ['custody.json', 'platform-receipt.json']);
      mock.restoreAll();
      fs.unlinkSync(path.join(refusedRoot, 'platform-receipt.json'));
      fs.unlinkSync(path.join(refusedRoot, 'custody.json'));
      fs.rmdirSync(refusedRoot);
    `);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });
});

test('Task 6C-R evidence late scratch cleanup HOLD does not promise record retention', async () => {
  await evidenceExample(async ({ root, receiptPath, context }) => {
    const sentinel = path.join(root, 'native-root-sentinel');
    fs.writeFileSync(sentinel, 'untouched');
    for (const fault of ['record-unlink', 'ancestry', 'inventory', 'rmdir', 'rmdir-after-effect']) {
      const result = child(`
        import fs from 'node:fs';
        import path from 'node:path';
        import assert from 'node:assert/strict';
        import { mock } from 'node:test';
        const helper = await import(${JSON.stringify(HELPER.href)});
        const fault = ${JSON.stringify(fault)};
        const unlink = fs.unlinkSync;
        const lstat = fs.lstatSync;
        const readdir = fs.readdirSync;
        const rmdir = fs.rmdirSync;
        let scratch;
        let deleted = false;
        let injected = 0;
        const fail = () => { injected++; throw new Error('PRIVATE_CLEANUP_SENTINEL'); };
        mock.method(fs, 'unlinkSync', (locator) => {
          if (path.basename(locator) === 'custody.json' && path.basename(path.dirname(locator)).startsWith('task6cr-custody-')) {
            scratch = path.dirname(locator);
            if (fault === 'record-unlink') fail();
            unlink(locator); deleted = true; return;
          }
          return unlink(locator);
        });
        mock.method(fs, 'lstatSync', (locator, ...args) => {
          if (deleted && locator === scratch && fault === 'ancestry') fail();
          return lstat(locator, ...args);
        });
        mock.method(fs, 'readdirSync', (locator, ...args) => {
          if (deleted && locator === scratch && fault === 'inventory') fail();
          return readdir(locator, ...args);
        });
        mock.method(fs, 'rmdirSync', (locator) => {
          if (deleted && locator === scratch && fault === 'rmdir') fail();
          const result = rmdir(locator);
          if (deleted && locator === scratch && fault === 'rmdir-after-effect') fail();
          return result;
        });
        let code;
        try { await helper.validateEvidenceFixtures(${JSON.stringify(context)}, ${JSON.stringify(root)}, ${JSON.stringify(receiptPath)}); }
        catch (error) { code = error.code; assert.equal(String(error).includes('PRIVATE'), false); }
        mock.restoreAll();
        assert.equal(code, 'HOLD_TASK6CR_CUSTODY');
        assert.equal(injected, 1);
        assert.ok(scratch);
        assert.equal(fs.readFileSync(${JSON.stringify(sentinel)}, 'utf8'), 'untouched');
        assert.equal(fs.existsSync(scratch), fault !== 'rmdir-after-effect');
        assert.equal(fs.existsSync(path.join(scratch, 'custody.json')), fault === 'record-unlink');
        if (fs.existsSync(scratch)) {
          assert.deepEqual(fs.readdirSync(scratch), fault === 'record-unlink' ? ['custody.json'] : []);
          if (fault === 'record-unlink') fs.unlinkSync(path.join(scratch, 'custody.json'));
          fs.rmdirSync(scratch);
        }
      `);
      assert.equal(result.status, 0, fault + ': ' + result.stdout + result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, '');
    }
  });
});

test('Task 6C-R completion CLI remains HOLD for plausible caller completion and artifact records', async () => temporary(async (root) => {
  const sentinel = path.join(root, 'native-root-sentinel');
  fs.writeFileSync(sentinel, 'untouched');
  for (const operation of ['bind-upload', 'bind-download', 'verify-download', 'cleanup', 'aggregate']) {
    const result = spawnSync(process.execPath, [fileURLToPath(HELPER), operation], {
      encoding: 'utf8', timeout: 10000, maxBuffer: 1048576, windowsHide: true,
      env: receiptEnvironment({ RD0873_TASK6CR_COMPLETION: JSON.stringify({ result: 'success', cleanup: 'TASK6CR_CLEANUP_OK', root }),
        RD0873_TASK6CR_ARTIFACTS: JSON.stringify(ARTIFACT_NAMES.map((name, index) => ({ ...ARTIFACT_OUTPUT, id: String(71 + index), name }))) }),
    });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, 'HOLD_TASK6CR_CUSTODY\n');
    assert.equal(result.stderr, '');
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'untouched');
  }
}));

function receiptEnvironment(controls) {
  const env = Object.create(null);
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) {
    if (Object.hasOwn(process.env, key)) env[key] = process.env[key];
  }
  return Object.assign(env, controls);
}

// Temporary protocol example, accepted by the real capture runner. The opaque
// bodies deliberately are not Task 6E admission evidence or a native observation.
function exampleFrame(profileBytes) {
  const ids = ['expected-parse-outcomes', 'export-sidecar', 'parse-outcomes-receipt',
    'project', 'resolution-inputs', 'source-manifest', 'toolchain-manifest'];
  const roles = ['expected-parse-outcomes', 'export-sidecar', 'parse-outcomes-receipt',
    'project-graph', 'resolution-inputs', 'source-manifest', 'toolchain-manifest'];
  const runId = '6'.repeat(64);
  const bodies = ids.map((id) => Buffer.from(`body:${id}`));
  const integer = (value, width) => {
    const bytes = Buffer.alloc(width);
    if (width === 8) bytes.writeBigUInt64BE(BigInt(value));
    else bytes.writeUIntBE(value, 0, width);
    return bytes;
  };
  const manifest = Buffer.from(canonicalJsonText({ schema: 'artifact-admission-manifest.v1', authorizing: false,
    profileId: 'galerina.source-origin.unsigned.v1', profileDigest: HASH(profileBytes), runId,
    subject: { repositoryId: 'galerina', gitObjectFormat: 'sha1', commitOid: PRODUCER_COMMIT, treeOid: '4'.repeat(40) },
    artifacts: ids.map((id, index) => ({ id, role: roles[index], runId, sha256: HASH(bodies[index]), byteLength: bodies[index].length, required: true })),
    graph: { schema: 'artifact-admission-graph.v1', root: 'export-sidecar', nodes: ids,
      edges: ids.filter((id) => id !== 'export-sidecar').map((id) => ({ from: 'export-sidecar', kind: 'requires', to: id })) },
    claims: ['captured-bytes-only'], ownerRecord: null,
  }));
  return Buffer.concat([Buffer.from('GAAF'), Buffer.from([1]), integer(manifest.length, 4), manifest,
    integer(ids.length, 2), ...ids.flatMap((id, index) => [integer(Buffer.byteLength(id), 2), Buffer.from(id), integer(bodies[index].length, 8), bodies[index]])]);
}

function captureExample(root) {
  const profileBytes = extractPinnedProfile(fs.readFileSync(SOURCE));
  const frameBytes = exampleFrame(profileBytes);
  fs.writeFileSync(path.join(root, 'profile.json'), profileBytes);
  fs.writeFileSync(path.join(root, 'frame.gaaf'), frameBytes);
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-name-pattern',
    '^Task 6C captures a controlled actual-platform receipt from supplied environment$',
    path.join(REPOSITORY, 'scripts/tests/logic-aig-source-origin-frame.test.mjs')], {
    env: receiptEnvironment({ GALERINA_TASK6C_PLATFORM_RECEIPT_RUN: '1',
      GALERINA_TASK6C_PLATFORM_FRAME_PATH: path.join(root, 'frame.gaaf'),
      GALERINA_TASK6C_PLATFORM_PROFILE_PATH: path.join(root, 'profile.json'),
      GALERINA_TASK6C_PLATFORM_RECEIPT_PATH: path.join(root, 'platform-receipt.json') }),
    encoding: 'utf8', timeout: 30000, maxBuffer: 1048576, windowsHide: true,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return { profileBytes, frameBytes, receiptBytes: fs.readFileSync(path.join(root, 'platform-receipt.json')) };
}

function resourceExample(platformReceipt, overrides = {}) {
  const platform = platformReceipt.platform;
  const processes = [
    { stage: 'producer', processKey: 'producer:1', parentProcessKey: null, pid: 101, parentPid: 0,
      startTick: '0', endTick: '1000', peakRssKiB: 100, terminationKind: 'exit', terminationCode: 0 },
    { stage: 'verifier', processKey: 'verifier:1', parentProcessKey: 'producer:1', pid: 102, parentPid: 101,
      startTick: '500', endTick: '1000', peakRssKiB: 100, terminationKind: 'exit', terminationCode: 0 },
  ];
  const mechanismEvidence = { nativeCreateEvents: 2, nativeExitEvents: 2, secondaryCreateEvents: 2,
    secondaryExitEvents: 2, retainedHandleRows: 2, accountedProcessRows: 2, terminalState: 'reconciled' };
  const body = { schema: 'galerina.logic-aig-task6-resource-receipt.v1', platform, arch: 'x64',
    producerCommit: PRODUCER_COMMIT, producerTree: RECEIPT_CONTEXT.producerTree,
    agentsCommit: RECEIPT_CONTEXT.agentsCommit, agentsTree: RECEIPT_CONTEXT.agentsTree,
    profileByteLength: platformReceipt.profileByteLength, profileSha256: platformReceipt.profileSha256,
    frameByteLength: platformReceipt.frameByteLength, frameSha256: platformReceipt.frameSha256,
    targetTriple: platform === 'win32' ? 'x86_64-pc-windows-msvc' : 'x86_64-unknown-linux-gnu',
    observerSourceSha256: 'c'.repeat(64), observerBinarySha256: 'd'.repeat(64), toolchainSha256: 'e'.repeat(64),
    measurementMechanism: platform === 'win32' ? 'windows-debug-job-v1' : 'linux-ptrace-wait4-v1',
    mechanismEvidence, mechanismSha256: HASH(Buffer.from(canonicalJsonText(mechanismEvidence))),
    clock: { kind: platform === 'win32' ? 'qpc' : 'monotonic-raw', frequency: '1000000' }, processes,
    maxProcessPeakRssKiB: 100, maxConcurrentTreePeakRssKiB: 200,
    maximizingProcessKeys: ['producer:1', 'verifier:1'], measurementInterval: 'native-root-lifetime-conservative-superset.v1',
    elapsedMillis: 1, limits: { processPeakRssKiB: 4194304, concurrentTreePeakRssKiB: 6291456, elapsedMillis: 900000 },
    status: 'PASS', authorizing: false, ...overrides };
  return Buffer.from(canonicalJsonText({ ...body, receiptDigest: HASH(Buffer.from(
    `galerina.logic-aig-task6-resource-receipt.v1\0${canonicalJsonText(body)}`)) }));
}

async function exampleBundle(body) {
  const custody = await reserveOwnedRoot(CONTEXT);
  try {
    const payloadRoot = path.join(custody.root, 'payload');
    const receiptRoot = path.join(custody.root, 'receipt');
    fs.mkdirSync(payloadRoot);
    fs.mkdirSync(receiptRoot);
    const captured = captureExample(payloadRoot);
    fs.renameSync(path.join(payloadRoot, 'platform-receipt.json'), path.join(receiptRoot, 'platform-receipt.json'));
    const platformReceipt = JSON.parse(captured.receiptBytes);
    fs.writeFileSync(path.join(receiptRoot, 'resource-receipt.json'), resourceExample(platformReceipt));
    fs.writeFileSync(path.join(receiptRoot, 'native-build.log'), 'PROCESS_TREE_OBSERVER_OK\n');
    for (const [kind, root] of [['payload', payloadRoot], ['receipt', receiptRoot]]) {
      fs.writeFileSync(path.join(root, 'rd0873-artifact-binding.json'), canonicalJsonText({ schema: 'rd0873-artifact-binding-v1',
        runId: CONTEXT.runId, runAttempt: CONTEXT.runAttempt, producerCommit: PRODUCER_COMMIT,
        producerTree: RECEIPT_CONTEXT.producerTree, agentsCommit: RECEIPT_CONTEXT.agentsCommit, agentsTree: RECEIPT_CONTEXT.agentsTree,
        artifactName: `rd0873-task6-${kind === 'payload' ? 'full-frame' : 'receipt'}-${process.platform === 'win32' ? 'windows' : 'linux'}-x64`, artifactKind: kind }));
    }
    await body({ custody, payloadRoot, receiptRoot, platformReceipt, ...captured });
  } finally { fs.rmSync(custody.root, { recursive: true, force: false }); }
}

function bundleCli(payloadRoot, receiptRoot) {
  return spawnSync(process.execPath, [fileURLToPath(HELPER), 'prepare-upload'], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1048576, windowsHide: true,
    env: receiptEnvironment({ RD0873_TASK6CR_CONTEXT: JSON.stringify(RECEIPT_CONTEXT),
      RD0873_TASK6CR_PAYLOAD_ROOT: payloadRoot, RD0873_TASK6CR_RECEIPT_ROOT: receiptRoot }),
  });
}

test('Task 6C-R bundle accepts separated graded records and retains owned raw bytes', async () => exampleBundle(async (bundle) => {
  assert.equal(typeof custodyHelper.validateUploadBundle, 'function');
  const result = await custodyHelper.validateUploadBundle(RECEIPT_CONTEXT, bundle.payloadRoot, bundle.receiptRoot);
  assert.deepEqual(result.frameBytes, bundle.frameBytes);
  assert.deepEqual(result.profileBytes, bundle.profileBytes);
  fs.writeFileSync(path.join(bundle.payloadRoot, 'frame.gaaf'), 'changed');
  assert.deepEqual(result.frameBytes, bundle.frameBytes);
}));

test('Task 6C-R bundle actual CLI accepts exactly the complete upload inventory', async () => exampleBundle(async (bundle) => {
  const result = bundleCli(bundle.payloadRoot, bundle.receiptRoot);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout, 'TASK6CR_UPLOAD_BUNDLE_OK\n');
  assert.equal(result.stderr, '');
}));

test('Task 6C-R bundle actual CLI refuses each missing nonregular and surplus member', async () => exampleBundle(async (bundle) => {
  for (const root of [bundle.payloadRoot, bundle.receiptRoot]) {
    for (const name of fs.readdirSync(root)) {
      const locator = path.join(root, name);
      const bytes = fs.readFileSync(locator);
      for (const fault of ['missing', 'directory', 'hardlink', 'symlink']) {
        fs.unlinkSync(locator);
        if (fault === 'directory') fs.mkdirSync(locator);
        if (fault === 'hardlink') fs.linkSync(path.join(bundle.custody.root, 'custody.json'), locator);
        if (fault === 'symlink') fs.symlinkSync(path.join(bundle.custody.root, 'custody.json'), locator, 'file');
        const result = bundleCli(bundle.payloadRoot, bundle.receiptRoot);
        assert.equal(result.status, 2, `${name} ${fault}`);
        assert.equal(result.stdout, 'HOLD_TASK6CR_CUSTODY\n');
        assert.equal(result.stderr, '');
        if (fault === 'directory') fs.rmdirSync(locator);
        else if (fault !== 'missing') fs.unlinkSync(locator);
        fs.writeFileSync(locator, bytes);
      }
    }
    for (const directory of [false, true]) {
      const extra = path.join(root, 'extra');
      if (directory) fs.mkdirSync(extra); else fs.writeFileSync(extra, 'private sentinel');
      const result = bundleCli(bundle.payloadRoot, bundle.receiptRoot);
      assert.equal(result.status, 2);
      assert.equal(result.stdout, 'HOLD_TASK6CR_CUSTODY\n');
      assert.equal(result.stderr, '');
      if (directory) fs.rmdirSync(extra); else fs.unlinkSync(extra);
    }
  }
}));

test('Task 6C-R raw refuses each independently mismatched common identity and resource grade', async () => exampleBundle(async (bundle) => {
  assert.equal(typeof custodyHelper.validateUploadBundle, 'function');
  for (const [key, value] of [['producerCommit', 'a'.repeat(40)], ['producerTree', 'b'.repeat(40)],
    ['agentsCommit', 'c'.repeat(40)], ['agentsTree', 'd'.repeat(40)], ['arch', 'arm64'],
    ['platform', process.platform === 'win32' ? 'linux' : 'win32'], ['profileByteLength', 1130],
    ['profileSha256', 'a'.repeat(64)], ['frameByteLength', bundle.frameBytes.length + 1],
    ['frameSha256', 'b'.repeat(64)], ['status', 'HOLD']]) {
    fs.writeFileSync(path.join(bundle.receiptRoot, 'resource-receipt.json'), resourceExample(bundle.platformReceipt, { [key]: value }));
    await assert.rejects(custodyHelper.validateUploadBundle(RECEIPT_CONTEXT, bundle.payloadRoot, bundle.receiptRoot), HOLD, key);
  }
}));

test('Task 6C-R raw refuses raw size and digest mismatches and build marker changes', async () => exampleBundle(async (bundle) => {
  assert.equal(typeof custodyHelper.validateUploadBundle, 'function');
  for (const [root, name] of [[bundle.payloadRoot, 'frame.gaaf'], [bundle.payloadRoot, 'profile.json'], [bundle.receiptRoot, 'native-build.log']]) {
    const locator = path.join(root, name);
    const original = fs.readFileSync(locator);
    for (const bytes of [Buffer.concat([original, Buffer.from('x')]), Buffer.alloc(original.length, 120)]) {
      fs.writeFileSync(locator, bytes);
      await assert.rejects(custodyHelper.validateUploadBundle(RECEIPT_CONTEXT, bundle.payloadRoot, bundle.receiptRoot), HOLD);
    }
    fs.writeFileSync(locator, original);
  }
}));

test('Task 6C-R receipt executes the accepted validator and retains pending pin status', async () => temporary(async (root) => {
  const { receiptBytes } = captureExample(root);
  assert.equal(typeof custodyHelper.validatePlatformReceiptFile, 'function');
  const validated = await custodyHelper.validatePlatformReceiptFile(RECEIPT_CONTEXT, path.join(root, 'platform-receipt.json'));
  assert.deepEqual(validated.bytes, receiptBytes);
  assert.equal(validated.receipt.status, 'PENDING_EXACT_BYTES');
  assert.equal(validated.receipt.platformPinRecordId, 'PENDING_EXACT_BYTES');
  assert.equal(validated.receipt.authorizing, false);
}));

test('Task 6C-R receipt refuses resource substitution malformed bytes and wrong identity', async () => temporary(async (root) => {
  const { receiptBytes } = captureExample(root);
  const receipt = JSON.parse(receiptBytes);
  assert.equal(typeof custodyHelper.validatePlatformReceiptFile, 'function');
  for (const bytes of [Buffer.from('{"schema":"galerina.logic-aig-task6-resource-receipt.v1"}'),
    Buffer.concat([receiptBytes, Buffer.from('\n')]), Buffer.from([0xff]),
    Buffer.from(canonicalJsonText({ ...receipt, producerCommit: 'a'.repeat(40) })),
    Buffer.from(canonicalJsonText({ ...receipt, platform: 'darwin' })),
    Buffer.from(canonicalJsonText({ ...receipt, platform: 'Linux' }))]) {
    fs.writeFileSync(path.join(root, 'platform-receipt.json'), bytes);
    await assert.rejects(custodyHelper.validatePlatformReceiptFile(RECEIPT_CONTEXT, path.join(root, 'platform-receipt.json')), HOLD);
  }
}));

test('Task 6C-R receipt pins length hash and identity across the actual child', async () => temporary(async (root) => {
  const { receiptBytes } = captureExample(root);
  for (const fault of ['changed-bytes', 'replaced-file', 'rewrite-same-bytes']) {
    fs.writeFileSync(path.join(root, 'platform-receipt.json'), receiptBytes);
    const result = child(`
      import fs from 'node:fs';
      import cp from 'node:child_process';
      import { mock } from 'node:test';
      const helper = await import(${JSON.stringify(HELPER.href)});
      const original = cp.spawnSync;
      const locator = process.argv[1];
      let calls = 0;
      mock.method(cp, 'spawnSync', (...args) => {
        calls++;
        const result = original(...args);
        if (result.status !== 0) throw new Error('control child failed');
        const bytes = fs.readFileSync(locator);
        const fault = ${JSON.stringify(fault)};
        if (fault === 'replaced-file') { fs.renameSync(locator, locator + '.old'); fs.writeFileSync(locator, bytes); }
        else if (fault === 'changed-bytes') { bytes[bytes.length - 1] = 32; fs.writeFileSync(locator, bytes); }
        else fs.writeFileSync(locator, bytes);
        return result;
      });
      let code;
      try { await helper.validatePlatformReceiptFile(${JSON.stringify(RECEIPT_CONTEXT)}, locator); }
      catch (error) { code = error.code; }
      if (calls !== 1 || code !== 'HOLD_TASK6CR_CUSTODY') process.exitCode = 4;
    `, [path.join(root, 'platform-receipt.json')]);
    assert.equal(result.status, 0, `${fault}: ${result.stdout}${result.stderr}`);
  }
}));

test('Task 6C-R receipt fixed child excludes ambient credentials and Node execution controls', async () => temporary(async (root) => {
  captureExample(root);
  const result = child(`
    import assert from 'node:assert/strict';
    import cp from 'node:child_process';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    const original = cp.spawnSync;
    let calls = 0;
    for (const key of ['GITHUB_TOKEN', 'ACTIONS_RUNTIME_TOKEN', 'NODE_OPTIONS', 'NODE_PATH', 'NODE_TEST_CONTEXT', 'PATH']) process.env[key] = 'PRIVATE_SENTINEL';
    mock.method(cp, 'spawnSync', (exe, args, options) => {
      calls++;
      assert.equal(exe, process.execPath);
      assert.deepEqual(args, ['--test', '--test-reporter=tap', '--test-name-pattern',
        '^Task 6C validates a controlled supplied actual-platform receipt$',
        ${JSON.stringify(path.join(REPOSITORY, 'scripts/tests/logic-aig-source-origin-frame.test.mjs'))}]);
      assert.equal(options.timeout, 30000);
      assert.equal(options.maxBuffer, 1048576);
      assert.equal(options.shell, false);
      assert.equal(options.windowsHide, true);
      for (const key of Object.keys(options.env)) assert.ok(!/TOKEN|SECRET|NODE_|PATH$/i.test(key)
        || key === 'GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_PATH');
      assert.equal(options.env.GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN, '1');
      assert.equal(options.env.GALERINA_TASK6C_PLATFORM_RECEIPT_EXPECTED_COMMIT, ${JSON.stringify(PRODUCER_COMMIT)});
      return original(exe, args, options);
    });
    await helper.validatePlatformReceiptFile(${JSON.stringify(RECEIPT_CONTEXT)}, process.argv[1]);
    if (calls !== 1) process.exitCode = 4;
  `, [path.join(root, 'platform-receipt.json')]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
}));

test('Task 6C-R receipt refuses surplus aliased empty and mixed ambient directions before spawning', async () => temporary(async (root) => {
  captureExample(root);
  for (const control of ['GALERINA_TASK6C_PLATFORM_RECEIPT_RUN', 'GALERINA_TASK6C_PLATFORM_RECEIPT_VALIDATE_RUN',
    'GALERINA_TASK6C_PLATFORM_FRAME_PATH', 'GALERINA_TASK6C_PLATFORM_EXTRA', 'galerina_task6c_platform_extra', 'RD0873_TASK6E_INPUT_MODE']) {
    for (const value of ['', '1']) {
      const result = child(`
        import cp from 'node:child_process';
        import { mock } from 'node:test';
        const helper = await import(${JSON.stringify(HELPER.href)});
        let calls = 0;
        mock.method(cp, 'spawnSync', () => { calls++; throw new Error('unexpected child'); });
        process.env[${JSON.stringify(control)}] = ${JSON.stringify(value)};
        let code;
        try { await helper.validatePlatformReceiptFile(${JSON.stringify(RECEIPT_CONTEXT)}, process.argv[1]); }
        catch (error) { code = error.code; }
        if (calls !== 0 || code !== 'HOLD_TASK6CR_CUSTODY') process.exitCode = 4;
      `, [path.join(root, 'platform-receipt.json')]);
      assert.equal(result.status, 0, `${control}: ${result.stdout}${result.stderr}`);
    }
  }
}));

test('Task 6C-R raw validates receipts before payload opens and refuses a same-sized intervening mutation', async () => exampleBundle(async (bundle) => {
  for (const fault of ['resource-substitution', 'after-validator-mutation', 'sparse-frame', 'oversized-receipt']) {
    fs.writeFileSync(path.join(bundle.receiptRoot, 'platform-receipt.json'), bundle.receiptBytes);
    fs.writeFileSync(path.join(bundle.payloadRoot, 'frame.gaaf'), bundle.frameBytes);
    if (fault === 'resource-substitution') fs.copyFileSync(path.join(bundle.receiptRoot, 'resource-receipt.json'), path.join(bundle.receiptRoot, 'platform-receipt.json'));
    if (fault === 'sparse-frame' || fault === 'oversized-receipt') {
      const locator = fault === 'sparse-frame' ? path.join(bundle.payloadRoot, 'frame.gaaf') : path.join(bundle.receiptRoot, 'platform-receipt.json');
      const fd = fs.openSync(locator, 'r+');
      fs.ftruncateSync(fd, fault === 'sparse-frame' ? 134217729 : 1048577);
      fs.closeSync(fd);
    }
    const result = child(`
      import fs from 'node:fs';
      import cp from 'node:child_process';
      import { mock } from 'node:test';
      const helper = await import(${JSON.stringify(HELPER.href)});
      const originalSpawn = cp.spawnSync;
      const originalOpen = fs.openSync;
      let receiptChildren = 0, verifierChildren = 0, payloadOpens = 0;
      const fault = ${JSON.stringify(fault)};
      mock.method(cp, 'spawnSync', (exe, args, options) => {
        if (args.some((arg) => arg.includes('external-input'))) verifierChildren++;
        else receiptChildren++;
        const result = originalSpawn(exe, args, options);
        if (fault === 'after-validator-mutation' && result.status === 0) {
          const bytes = fs.readFileSync(process.argv[1] + '/frame.gaaf');
          bytes[bytes.length - 1] ^= 1;
          fs.writeFileSync(process.argv[1] + '/frame.gaaf', bytes);
        }
        return result;
      });
      mock.method(fs, 'openSync', (locator, ...args) => {
        if (/frame\.gaaf$|profile\.json$/.test(String(locator)) && typeof args[0] === 'number') {
          payloadOpens++;
          if (receiptChildren !== 1) throw new Error('early payload access');
        }
        return originalOpen(locator, ...args);
      });
      let code;
      try { await helper.validateUploadBundle(${JSON.stringify(RECEIPT_CONTEXT)}, process.argv[1], process.argv[2]); }
      catch (error) { code = error.code; }
      if (code !== 'HOLD_TASK6CR_CUSTODY' || verifierChildren !== 0
        || (fault !== 'after-validator-mutation' && payloadOpens !== 0)
        || (fault === 'after-validator-mutation' && payloadOpens !== 2)
        || receiptChildren !== (fault === 'oversized-receipt' ? 0 : 1)) process.exitCode = 4;
    `, [bundle.payloadRoot, bundle.receiptRoot]);
    assert.equal(result.status, 0, `${fault}: ${result.stdout}${result.stderr}`);
  }
}));

test('Task 6C-R hosted advisory verifier holds without the fixed owned digest result and never invokes a child', async () => {
  assert.equal(typeof custodyHelper.verifyDownloadedBundle, 'function');
  const reciprocal = { ...RECEIPT_CONTEXT, job: process.platform === 'win32' ? 'reciprocal-windows' : 'reciprocal-linux',
    platform: process.platform === 'win32' ? 'linux' : 'win32' };
  const result = child(`
    import cp from 'node:child_process';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    let calls = 0;
    mock.method(cp, 'spawnSync', () => { calls++; throw new Error('unexpected child'); });
    for (const input of [undefined, {}, Buffer.from('{}'), 'PRIVATE_PATH_SENTINEL']) {
      let code;
      try { await helper.verifyDownloadedBundle(${JSON.stringify(reciprocal)}, input, input); }
      catch (error) { code = error.code; }
      if (code !== 'HOLD_TASK6CR_CUSTODY') process.exitCode = 4;
    }
    if (calls !== 0) process.exitCode = 4;
  `);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('Task 6C-R bundle rejects a replaced payload directory across receipt validation', async () => exampleBundle(async (bundle) => temporary(async (backup) => {
  const result = child(`
    import fs from 'node:fs';
    import path from 'node:path';
    import cp from 'node:child_process';
    import { mock } from 'node:test';
    const helper = await import(${JSON.stringify(HELPER.href)});
    const originalSpawn = cp.spawnSync;
    let calls = 0;
    mock.method(cp, 'spawnSync', (...args) => {
      const result = originalSpawn(...args);
      if (result.status !== 0) throw new Error('control child failed');
      calls++;
      const saved = path.join(process.argv[3], 'payload');
      fs.renameSync(process.argv[1], saved);
      fs.mkdirSync(process.argv[1]);
      for (const name of fs.readdirSync(saved)) fs.copyFileSync(path.join(saved, name), path.join(process.argv[1], name));
      return result;
    });
    let code;
    try { await helper.validateUploadBundle(${JSON.stringify(RECEIPT_CONTEXT)}, process.argv[1], process.argv[2]); }
    catch (error) { code = error.code; }
    if (calls !== 1 || code !== 'HOLD_TASK6CR_CUSTODY') process.exitCode = 4;
  `, [bundle.payloadRoot, bundle.receiptRoot, backup]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
})));

test('Task 6C-R bundle rejects swapped receipts and independently altered artifact bindings', async () => exampleBundle(async (bundle) => {
  const platformPath = path.join(bundle.receiptRoot, 'platform-receipt.json');
  const resourcePath = path.join(bundle.receiptRoot, 'resource-receipt.json');
  const resource = fs.readFileSync(resourcePath);
  fs.writeFileSync(platformPath, resource);
  fs.writeFileSync(resourcePath, bundle.receiptBytes);
  let result = bundleCli(bundle.payloadRoot, bundle.receiptRoot);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, 'HOLD_TASK6CR_CUSTODY\n');
  assert.equal(result.stderr, '');
  fs.writeFileSync(platformPath, bundle.receiptBytes);
  fs.writeFileSync(resourcePath, resource);
  for (const root of [bundle.payloadRoot, bundle.receiptRoot]) {
    const locator = path.join(root, 'rd0873-artifact-binding.json');
    const bytes = fs.readFileSync(locator);
    const record = JSON.parse(bytes);
    for (const key of Object.keys(record)) {
      fs.writeFileSync(locator, canonicalJsonText({ ...record, [key]: key.endsWith('Commit') || key.endsWith('Tree') ? 'f'.repeat(40) : 'changed' }));
      await assert.rejects(custodyHelper.validateUploadBundle(RECEIPT_CONTEXT, bundle.payloadRoot, bundle.receiptRoot), HOLD, key);
    }
    fs.writeFileSync(locator, bytes);
  }
}));

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

// RD-0873 local-first byte-custody controls. These synthetic fixtures do not
// authenticate a platform, decode a frame, or prove a cross-host exchange.
const LOCAL_REFUSED = (error) => error?.code === 'REFUSED_LOCAL_CONTEXT';
const LOCAL_HOLD = (error) => error?.code === 'HOLD_LOCAL_EVIDENCE';
const LOCAL_MEMBERS = custodyHelper.LOCAL_EVIDENCE_CONTRACT.members;
const localDigest = (value) => HASH(Buffer.from(canonicalJsonText(value), 'utf8'));
const localAbsent = (name) => {
  const error = new Error(`${name} is not implemented`);
  error.code = 'LOCAL_ROUTE_NOT_IMPLEMENTED';
  return error;
};
const captureLocalEvidenceBundle = (...args) => typeof custodyHelper.captureLocalEvidenceBundle === 'function'
  ? custodyHelper.captureLocalEvidenceBundle(...args) : Promise.reject(localAbsent('captureLocalEvidenceBundle'));
const verifyLocalEvidenceBundle = (...args) => typeof custodyHelper.verifyLocalEvidenceBundle === 'function'
  ? custodyHelper.verifyLocalEvidenceBundle(...args) : Promise.reject(localAbsent('verifyLocalEvidenceBundle'));
const consumeVerifiedLocalReciprocalEvidence = (...args) => typeof custodyHelper.consumeVerifiedLocalReciprocalEvidence === 'function'
  ? custodyHelper.consumeVerifiedLocalReciprocalEvidence(...args) : Promise.reject(localAbsent('consumeVerifiedLocalReciprocalEvidence'));

async function localFixture(body) {
  await temporary(async (root) => {
    const source = Object.fromEntries(LOCAL_MEMBERS.map(({ path: name }) => [name,
      Buffer.from(`RD0873:${name}\n`, 'utf8')]));
    for (const [name, bytes] of Object.entries(source)) fs.writeFileSync(path.join(root, name), bytes);
    const manifest = LOCAL_MEMBERS.map(({ path: name, role }) => Object.freeze({ path: name, role,
      sha256: HASH(source[name]), maxBytes: source[name].length }));
    const context = Object.freeze({ platform: 'windows-x64', nonce: '1'.repeat(64),
      sourceSetDigest: localDigest([...manifest].sort((left, right) => left.path.localeCompare(right.path))
        .map(({ path: name, role, sha256, maxBytes }) => ({ path: name, role, sha256, maxBytes }))) });
    await body({ root, source, manifest, context });
  });
}

function localBundle(fixture) {
  const members = fixture.manifest.map(({ path: name, role, sha256 }) => Object.freeze({ path: name, role,
    bytes: Buffer.from(fixture.source[name]), bytesSha256: sha256, byteLength: fixture.source[name].length }));
  return Object.freeze({ schema: custodyHelper.LOCAL_EVIDENCE_CONTRACT.schema, platform: fixture.context.platform,
    nonce: fixture.context.nonce, sourceSetDigest: fixture.context.sourceSetDigest, members: Object.freeze(members) });
}

test('local capture refuses a GitHub transport selector', async () => localFixture(async ({ root, manifest }) => {
  await assert.rejects(captureLocalEvidenceBundle({ platform: 'windows-x64', transport: 'github' }, root, manifest), LOCAL_REFUSED);
}));

test('local capture refuses every non-local selector before filesystem access', async () => localFixture(async ({ root, manifest, context }) => {
  for (const value of [
    { ...context, extra: true }, { nonce: context.nonce, sourceSetDigest: context.sourceSetDigest },
    { ...context, url: 'https://example.invalid' }, { ...context, command: 'git status' },
    { ...context, repository: 'owner/private' }, { ...context, token: 'not-a-token' },
  ]) await assert.rejects(captureLocalEvidenceBundle(value, root, manifest), LOCAL_REFUSED);
  await assert.rejects(captureLocalEvidenceBundle(context, root, [{ path: 'other', role: 'other', sha256: 'a'.repeat(64), maxBytes: 1 }, ...manifest.slice(1)]), LOCAL_REFUSED);
}));

test('local capture returns the exact owned non-serializable source set', async () => localFixture(async ({ root, manifest, context, source }) => {
  const bundle = await captureLocalEvidenceBundle(context, root, manifest);
  assert.deepEqual(Object.keys(bundle), ['schema', 'platform', 'nonce', 'sourceSetDigest', 'members']);
  assert.equal(bundle.schema, custodyHelper.LOCAL_EVIDENCE_CONTRACT.schema);
  assert.equal(bundle.platform, context.platform);
  assert.equal(bundle.nonce, context.nonce);
  assert.equal(bundle.sourceSetDigest, context.sourceSetDigest);
  assert.deepEqual(bundle.members.map(({ path: name, role, bytesSha256, byteLength }) => ({ path: name, role, bytesSha256, byteLength })),
    [...manifest].sort((left, right) => left.path.localeCompare(right.path)).map(({ path: name, role, sha256 }) =>
      ({ path: name, role, bytesSha256: sha256, byteLength: source[name].length })));
  assert.throws(() => JSON.stringify(bundle), LOCAL_HOLD);
}));

test('local capture rejects accessor metadata without evaluating it', async () => localFixture(async ({ root, manifest, context }) => {
  let reads = 0;
  const accessor = { ...manifest[0] };
  Object.defineProperty(accessor, 'path', { enumerable: true, get() { reads++; return manifest[0].path; } });
  await assert.rejects(captureLocalEvidenceBundle(context, root, [accessor, ...manifest.slice(1)]), LOCAL_HOLD);
  assert.equal(reads, 0);
}));

test('local capture rejects accessor array entries without evaluating them', async () => localFixture(async ({ root, manifest, context }) => {
  let reads = 0;
  const entries = [...manifest];
  Object.defineProperty(entries, '0', { enumerable: true, get() { reads++; return manifest[0]; } });
  await assert.rejects(captureLocalEvidenceBundle(context, root, entries), LOCAL_HOLD);
  assert.equal(reads, 0);
}));

test('local verification returns only the body-free result for an owned captured bundle', async () => localFixture(async ({ root, manifest, context, source }) => {
  const bundle = await captureLocalEvidenceBundle(context, root, manifest);
  const result = await verifyLocalEvidenceBundle(context, bundle);
  assert.equal(result, 'TASK6CR_LOCAL_BUNDLE_OK');
  assert.equal(JSON.stringify(result).includes(source['frame.gaaf'].toString('utf8')), false);
  assert.deepEqual(bundle.members.map((member) => Buffer.from(member.bytes)),
    [...LOCAL_MEMBERS].sort((left, right) => left.path.localeCompare(right.path)).map(({ path: name }) => source[name]));
}));

test('local verification holds if an owned member buffer changes after capture', async () => localFixture(async ({ root, manifest, context }) => {
  const bundle = await captureLocalEvidenceBundle(context, root, manifest);
  bundle.members[0].bytes[0] ^= 1;
  await assert.rejects(verifyLocalEvidenceBundle(context, bundle), LOCAL_HOLD);
}));

test('local reciprocal consumer accepts only verified opposite-platform direct buffers', async () => temporary(async (windowsRoot) => temporary(async (linuxRoot) => {
  const capture = async (root, platform, nonce) => {
    const source = Object.fromEntries(LOCAL_MEMBERS.map(({ path: name }) => [name, Buffer.from(`RD0873:${platform}:${name}\n`, 'utf8')]));
    for (const [name, bytes] of Object.entries(source)) fs.writeFileSync(path.join(root, name), bytes);
    const manifest = LOCAL_MEMBERS.map(({ path: name, role }) => ({ path: name, role, sha256: HASH(source[name]), maxBytes: source[name].length }));
    const context = { platform, nonce, sourceSetDigest: localDigest([...manifest].sort((left, right) => left.path.localeCompare(right.path))) };
    const bundle = await captureLocalEvidenceBundle(context, root, manifest);
    assert.equal(await verifyLocalEvidenceBundle(context, bundle), 'TASK6CR_LOCAL_BUNDLE_OK');
    return { context, bundle, source };
  };
  const windows = await capture(windowsRoot, 'windows-x64', '3'.repeat(64));
  const linux = await capture(linuxRoot, 'linux-x64', '4'.repeat(64));
  assert.equal(await consumeVerifiedLocalReciprocalEvidence(windows.context, linux.bundle.members), 'TASK6CR_LOCAL_RECIPROCAL_OK');
  assert.equal(await consumeVerifiedLocalReciprocalEvidence(linux.context, windows.bundle.members), 'TASK6CR_LOCAL_RECIPROCAL_OK');
  await assert.rejects(consumeVerifiedLocalReciprocalEvidence(windows.context, { path: linuxRoot, members: linux.bundle.members }), LOCAL_HOLD);
  await assert.rejects(consumeVerifiedLocalReciprocalEvidence(windows.context, { id: '71', digest: 'a'.repeat(64), name: 'artifact', members: linux.bundle.members }), LOCAL_HOLD);
  await assert.rejects(consumeVerifiedLocalReciprocalEvidence(windows.context, windows.bundle.members), LOCAL_HOLD);
  assert.equal(JSON.stringify('TASK6CR_LOCAL_RECIPROCAL_OK').includes(linux.source['frame.gaaf'].toString('utf8')), false);
})));

test('local capture and verification stay local when process Git and GitHub access are unavailable', () => {
  const result = child(`
    import assert from 'node:assert/strict';
    import cp from 'node:child_process';
    import { createHash } from 'node:crypto';
    import fs from 'node:fs';
    import os from 'node:os';
    import path from 'node:path';
    import { canonicalJsonText } from ${JSON.stringify(new URL('../lib/logic-aig-source-origin/contract.mjs', import.meta.url).href)};
    const helper = await import(${JSON.stringify(HELPER.href)});
    cp.spawnSync = () => { throw new Error('process access forbidden'); };
    const actualEnvironment = process.env;
    process.env = new Proxy(actualEnvironment, { get(target, key, receiver) {
      if (String(key).toLowerCase().includes('github')) throw new Error('environment access forbidden');
      return Reflect.get(target, key, receiver);
    }});
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rd0873-local-child-'));
    try {
      const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
      const source = Object.fromEntries(helper.LOCAL_EVIDENCE_CONTRACT.members.map(({ path: name }) => [name, Buffer.from('RD0873:' + name + String.fromCharCode(10))]));
      for (const [name, bytes] of Object.entries(source)) fs.writeFileSync(path.join(root, name), bytes);
      const manifest = helper.LOCAL_EVIDENCE_CONTRACT.members.map(({ path: name, role }) => ({ path: name, role, sha256: hash(source[name]), maxBytes: source[name].length }));
      const context = { platform: 'linux-x64', nonce: '2'.repeat(64), sourceSetDigest: hash(Buffer.from(canonicalJsonText([...manifest].sort((a, b) => a.path.localeCompare(b.path))), 'utf8')) };
      const bundle = await helper.captureLocalEvidenceBundle(context, root, manifest);
      const value = await helper.verifyLocalEvidenceBundle(context, bundle);
      assert.equal(value, 'TASK6CR_LOCAL_BUNDLE_OK');
      assert.equal(/https|github|repository|artifact|runId/i.test(value), false);
      process.stdout.write(value);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  `);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'TASK6CR_LOCAL_BUNDLE_OK');
});

for (const [fault, mutate] of [
  ['changed bytes after manifest capture', ({ root }) => fs.appendFileSync(path.join(root, 'frame.gaaf'), 'x')],
  ['missing member', ({ root }) => fs.unlinkSync(path.join(root, 'profile.json'))],
  ['extra member', ({ root }) => fs.writeFileSync(path.join(root, 'extra-member'), 'x')],
  ['symlink or reparse member', ({ root }) => { fs.unlinkSync(path.join(root, 'frame.gaaf')); fs.symlinkSync(path.join(root, 'profile.json'), path.join(root, 'frame.gaaf'), 'file'); }],
  ['wrong role', ({ manifest }) => { manifest[0] = { ...manifest[0], role: 'profile' }; }],
  ['wrong platform', (fixture) => { fixture.context = { ...fixture.context, platform: 'macos-x64' }; }],
  ['wrong digest', ({ manifest }) => { manifest[0] = { ...manifest[0], sha256: '0'.repeat(64) }; }],
  ['over-ceiling member', ({ manifest }) => { manifest[0] = { ...manifest[0], maxBytes: 1 }; }],
  ['duplicate member', ({ manifest }) => manifest.push({ ...manifest[0] })],
  ['fifth member', ({ root, manifest }) => { fs.writeFileSync(path.join(root, 'fifth-member'), 'x'); manifest.push({ path: 'fifth-member', role: 'other', sha256: HASH(Buffer.from('x')), maxBytes: 1 }); }],
  ['trailing bytes', ({ root }) => fs.appendFileSync(path.join(root, 'platform-receipt.json'), 'trailing')],
]) test(`local capture holds on ${fault}`, async () => localFixture(async (fixture) => {
  // Each row changes one cause after this closed manifest/context is prepared.
  mutate(fixture);
  await assert.rejects(captureLocalEvidenceBundle(fixture.context, fixture.root, fixture.manifest), LOCAL_HOLD);
}));

for (const [fault, mutate] of [
  ['missing bundle member', (bundle) => ({ ...bundle, members: bundle.members.slice(1) })],
  ['extra bundle member', (bundle) => ({ ...bundle, members: [...bundle.members, { ...bundle.members[0], path: 'other-extra' }] })],
  ['wrong bundle role', (bundle) => ({ ...bundle, members: [{ ...bundle.members[0], role: 'profile' }, ...bundle.members.slice(1)] })],
  ['wrong bundle platform', (bundle) => ({ ...bundle, platform: 'linux-x64' })],
  ['wrong bundle digest', (bundle) => ({ ...bundle, members: [{ ...bundle.members[0], bytesSha256: '0'.repeat(64) }, ...bundle.members.slice(1)] })],
  ['over-ceiling bundle member', (bundle) => ({ ...bundle, members: [{ ...bundle.members[0], maxBytes: 1 }, ...bundle.members.slice(1)] })],
  ['duplicate bundle member', (bundle) => ({ ...bundle, members: [bundle.members[0], bundle.members[0], ...bundle.members.slice(1)] })],
  ['fifth bundle member', (bundle) => ({ ...bundle, members: [...bundle.members, { ...bundle.members[0], path: 'fifth' }] })],
  ['trailing bundle bytes', (bundle) => ({ ...bundle, members: [{ ...bundle.members[0], bytes: Buffer.concat([bundle.members[0].bytes, Buffer.from('x')]) }, ...bundle.members.slice(1)] })],
]) test(`local verification rejects an unowned object with ${fault}`, async () => localFixture(async (fixture) => {
  await assert.rejects(verifyLocalEvidenceBundle(fixture.context, mutate(localBundle(fixture))), LOCAL_HOLD);
}));

test('local verification rejects unowned cleanup-shaped inputs and leaves an outside sentinel intact', async () => localFixture(async (fixture) => {
  const { root, context } = fixture;
  const outside = fs.mkdtempSync(path.join(tmpdir(), 'rd0873-local-sentinel-'));
  const sentinel = path.join(outside, 'sentinel');
  fs.writeFileSync(sentinel, 'retain');
  try {
    for (const bundle of [
      { ...localBundle(fixture), evidenceRoot: outside },
      { ...localBundle(fixture), nonce: '0'.repeat(64) },
      { ...localBundle(fixture), reservation: { root, nonEmpty: true } },
      { ...localBundle(fixture), cleanup: { close: 'failed' } },
      { ...localBundle(fixture), cleanup: { unlink: 'failed' } },
      { ...localBundle(fixture), reciprocalVerified: false },
    ]) await assert.rejects(verifyLocalEvidenceBundle(context, bundle), LOCAL_HOLD);
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'retain');
  } finally { fs.unlinkSync(sentinel); fs.rmdirSync(outside); }
}));
