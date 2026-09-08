import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';

import {
  canonicalJsonText,
  sha256Canonical,
  sha256Raw,
} from '../lib/logic-aig-source-origin/contract.mjs';
import { validateLocalSourceManifest } from '../lib/logic-aig-source-origin/local-producer.mjs';
import {
  buildLocalHostObservation,
  buildVerifiedLocalDiscoveryReceipt,
} from '../lib/logic-aig-source-origin/local-subject.mjs';
import {
  buildLocalSourceOriginSubjectFromCapture,
  captureLocalSourceSnapshot,
  getCapturedLocalSourceBytes,
  getLocalSourceSnapshot,
} from '../lib/logic-aig-source-origin/local-source.mjs';

const MODULE_URL = new URL('../lib/logic-aig-source-origin/local-producer.mjs', import.meta.url);
let PRODUCER;
try {
  PRODUCER = await import(MODULE_URL);
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  PRODUCER = Object.freeze({});
}

const TEMP_PREFIX = 'galerina-local-producer-fixture-';
const POLICY_SCHEMA = 'galerina.logic-aig-local-inventory-policy.v1';
const DEFAULT_ENTRIES = Object.freeze([
  Object.freeze({ path: 'generated/schema.json', role: 'GENERATED_INPUT' }),
  Object.freeze({ path: 'package.json', role: 'RESOLUTION' }),
  Object.freeze({ path: 'src/a.mjs', role: 'SOURCE' }),
]);
const DEFAULT_LIMITS = Object.freeze({
  maxDepth: 8,
  maxEntries: 32,
  maxFileBytes: 1_024,
  maxMillis: 5_000,
  maxResolutionBytes: 1_024,
  maxResolutionFiles: 8,
  maxSourceBytes: 4_096,
  maxSourceFiles: 16,
  maxTotalBytes: 5_120,
});

function api(name) {
  assert.equal(typeof PRODUCER[name], 'function', `${name} should be exported`);
  return PRODUCER[name];
}

function bytesOf(value) {
  return Buffer.from(value, 'utf8');
}

function repositoryIdentityBytes() {
  const body = {
    schema: 'galerina.logic-aig-repository-identity.v1',
    ownerNamespace: 'TritHypha',
    repositoryName: 'Galerina',
    canonicalIdentity: 'TritHypha/Galerina',
    authorizing: false,
  };
  return bytesOf(canonicalJsonText({
    ...body,
    identityDigest: sha256Canonical(body.schema, body),
  }));
}

function inventoryPolicyBytes({ profile = 'FIXTURE_ONLY' } = {}) {
  const body = {
    schema: POLICY_SCHEMA,
    profile,
    entries: DEFAULT_ENTRIES,
    exclusions: ['.git', 'tmp'],
    limits: DEFAULT_LIMITS,
    authorizing: false,
  };
  return bytesOf(canonicalJsonText({
    ...body,
    policyDigest: sha256Canonical(body.schema, body),
  }));
}

async function withOwnedFixture(run) {
  const base = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  const ownedBase = resolve(base);
  assert.equal(dirname(ownedBase), resolve(tmpdir()));
  assert.match(basename(ownedBase), /^galerina-local-producer-fixture-/u);
  const rootPath = join(ownedBase, 'repository');
  await mkdir(rootPath);
  try {
    return await run(rootPath);
  } finally {
    await rm(ownedBase, { force: true, recursive: true });
  }
}

async function makeEvidence(rootPath, { profile = 'FIXTURE_ONLY' } = {}) {
  await mkdir(join(rootPath, 'generated'));
  await mkdir(join(rootPath, 'src'));
  await mkdir(join(rootPath, '.git'));
  await writeFile(join(rootPath, 'generated', 'schema.json'), '{"v":1}\n');
  await writeFile(join(rootPath, 'package.json'), '{"type":"module"}\n');
  await writeFile(join(rootPath, 'src', 'a.mjs'), 'export const a = 1;\n');
  await writeFile(join(rootPath, '.git', 'config'), 'excluded administrative bytes\n');

  const capability = await captureLocalSourceSnapshot({
    rootPath,
    repositoryIdentityBytes: repositoryIdentityBytes(),
    inventoryPolicyBytes: inventoryPolicyBytes({ profile }),
  });
  const snapshot = getLocalSourceSnapshot(capability);
  const repository = JSON.parse(repositoryIdentityBytes().toString('utf8'));
  const policy = JSON.parse(inventoryPolicyBytes({ profile }).toString('utf8'));
  const fixtureOnly = profile === 'FIXTURE_ONLY';
  const host = buildLocalHostObservation({
    allowFixtureOnly: fixtureOnly,
    platform: 'win32',
    arch: 'x64',
    runtime: 'node-v24.18.0',
    snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest,
    fixtureOnly,
  });
  const myco = buildVerifiedLocalDiscoveryReceipt({
    allowFixtureOnly: fixtureOnly,
    kind: 'MYCO',
    snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest,
    fixtureOnly,
  });
  const hypha = buildVerifiedLocalDiscoveryReceipt({
    allowFixtureOnly: fixtureOnly,
    kind: 'HYPHA',
    snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest,
    fixtureOnly,
  });
  const subject = buildLocalSourceOriginSubjectFromCapture({
    allowFixtureOnly: fixtureOnly,
    capability,
    repository,
    policy,
    host,
    myco,
    hypha,
  });
  return { capability, repository, policy, host, myco, hypha, subject, snapshot };
}

test('local producer derives subject-bound source and resolution manifests from retained bytes', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const manifests = api('buildLocalProducerManifests')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });

    assert.deepEqual(Object.keys(manifests).sort(), ['resolutionInputs', 'sourceManifest']);
    const { sourceManifest, resolutionInputs } = manifests;
    assert.equal(sourceManifest.schema, 'galerina.logic-aig-local-source-manifest.v1');
    assert.equal(resolutionInputs.schema, 'galerina.logic-aig-local-resolution-inputs.v1');
    assert.equal(sourceManifest.subjectDigest, evidence.subject.subjectDigest);
    assert.equal(resolutionInputs.subjectDigest, evidence.subject.subjectDigest);
    assert.deepEqual(sourceManifest.rows.map(({ path, role }) => ({ path, role })), [
      { path: 'generated/schema.json', role: 'GENERATED_INPUT' },
      { path: 'src/a.mjs', role: 'SOURCE' },
    ]);
    assert.deepEqual(resolutionInputs.rows.map(({ path, role }) => ({ path, role })), [
      { path: 'package.json', role: 'RESOLUTION' },
    ]);

    for (const manifest of [sourceManifest, resolutionInputs]) {
      const digestField = manifest.schema.endsWith('source-manifest.v1') ? 'manifestDigest' : 'resolutionInputsDigest';
      const { [digestField]: digest, ...body } = manifest;
      assert.equal(digest, sha256Canonical(manifest.schema, body));
      assert.equal(manifest.repositoryIdentityDigest, evidence.repository.identityDigest);
      assert.equal(manifest.inventoryPolicyDigest, evidence.policy.policyDigest);
      assert.equal(manifest.snapshotDigest, evidence.snapshot.snapshotDigest);
      assert.equal(manifest.authorizing, false);
      assert.equal(manifest.authentication, 'NONE');
      assert.equal(manifest.fixtureOnly, true);
      assert.equal(Object.hasOwn(manifest, 'expectedHead'), false);
      assert.equal(Object.hasOwn(manifest, 'expectedTree'), false);
      assert.equal(Object.hasOwn(manifest, 'objectFormat'), false);
      assert.equal(Object.hasOwn(manifest, 'blobOid'), false);
      for (const row of manifest.rows) {
        assert.equal(Object.hasOwn(row, 'blobOid'), false);
        assert.equal(Object.hasOwn(row, 'objectFormat'), false);
        assert.equal(sha256Raw(getCapturedLocalSourceBytes(evidence.capability, row.path)), row.rawSha256);
      }
    }
  });
});

test('local producer exposes a separate defensive held-byte handoff for downstream decoders', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const input = api('buildLocalProducerInput')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    assert.deepEqual(Object.keys(input).sort(), [
      'resolutionBlobEntries', 'resolutionInputs', 'sourceBlobEntries', 'sourceManifest', 'subject',
    ]);
    assert.deepEqual(input.sourceBlobEntries.map(({ path }) => path), input.sourceManifest.rows.map(({ path }) => path));
    assert.deepEqual(input.resolutionBlobEntries.map(({ path }) => path), input.resolutionInputs.rows.map(({ path }) => path));
    for (const entry of [...input.sourceBlobEntries, ...input.resolutionBlobEntries]) {
      assert.ok(entry.bytes instanceof Uint8Array);
      assert.equal(sha256Raw(entry.bytes),
        [...input.sourceManifest.rows, ...input.resolutionInputs.rows].find((row) => row.path === entry.path).rawSha256);
    }
    const original = input.sourceBlobEntries[0].bytes[0];
    input.sourceBlobEntries[0].bytes[0] ^= 0xff;
    const second = api('buildLocalProducerInput')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    assert.notEqual(input.sourceBlobEntries[0].bytes[0], original);
    assert.equal(sha256Raw(second.sourceBlobEntries[0].bytes), evidence.snapshot.entries.find(({ path }) => path === second.sourceBlobEntries[0].path).rawSha256);
  });
});

test('local producer freezes the validated subject copy before returning the byte handoff', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const mutableSubject = { ...evidence.subject };
    const input = api('buildLocalProducerInput')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: mutableSubject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    const subjectDigest = input.subject.subjectDigest;
    mutableSubject.subjectDigest = '0'.repeat(64);
    assert.equal(input.subject.subjectDigest, subjectDigest);
    assert.equal(input.sourceManifest.subjectDigest, subjectDigest);
    assert.equal(Object.isFrozen(input.subject), true);
  });
});

test('local producer refuses an unbound capability or fixture without explicit fixture admission', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const build = api('buildLocalProducerManifests');
    assert.throws(
      () => build({
        allowFixtureOnly: true,
        capability: {},
        repository: evidence.repository,
        policy: evidence.policy,
        subject: evidence.subject,
        host: evidence.host,
        myco: evidence.myco,
        hypha: evidence.hypha,
      }),
      (error) => error?.code === 'LOCAL_SOURCE_CAPABILITY',
    );
    assert.throws(
      () => build({
        allowFixtureOnly: false,
        capability: evidence.capability,
        repository: evidence.repository,
        policy: evidence.policy,
        subject: evidence.subject,
        host: evidence.host,
        myco: evidence.myco,
        hypha: evidence.hypha,
      }),
      (error) => error?.code === 'SOURCE_ORIGIN_LOCAL_FIXTURE',
    );
  });
});

test('local manifest validation refuses a resealed row that is absent from the captured snapshot', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const manifests = api('buildLocalProducerManifests')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    const sourceManifest = manifests.sourceManifest;
    const { manifestDigest: _manifestDigest, ...sourceBody } = sourceManifest;
    const body = {
      ...sourceBody,
      rows: sourceManifest.rows.map((row, index) => index === 0
        ? { ...row, rawSha256: '0'.repeat(64) }
        : row),
    };
    const tampered = {
      ...body,
      manifestDigest: sha256Canonical(body.schema, body),
    };
    assert.throws(
      () => validateLocalSourceManifest(tampered, {
        allowFixtureOnly: true,
        repository: evidence.repository,
        policy: evidence.policy,
        snapshot: evidence.snapshot,
        subject: evidence.subject,
        host: evidence.host,
        myco: evidence.myco,
        hypha: evidence.hypha,
      }),
      (error) => error?.code === 'SOURCE_ORIGIN_LOCAL_DIGEST',
    );
  });
});

test('local producer supports the production profile without fixture admission', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath, { profile: 'LOCAL_PRODUCTION_V1' });
    const manifests = api('buildLocalProducerManifests')({
      allowFixtureOnly: false,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    assert.equal(manifests.sourceManifest.fixtureOnly, false);
    assert.equal(manifests.resolutionInputs.fixtureOnly, false);
  });
});

test('local manifest validation rejects traversal paths before digest acceptance', () => {
  const body = {
    schema: 'galerina.logic-aig-local-source-manifest.v1',
    repositoryIdentityDigest: '0'.repeat(64),
    inventoryPolicyDigest: '0'.repeat(64),
    snapshotDigest: '0'.repeat(64),
    subjectDigest: '0'.repeat(64),
    rows: [{ path: '../outside.mjs', role: 'SOURCE', byteLength: 1, rawSha256: '0'.repeat(64) }],
    counts: { paths: 1, bytes: 1 },
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    fixtureOnly: false,
  };
  assert.throws(
    () => validateLocalSourceManifest({
      ...body,
      manifestDigest: sha256Canonical(body.schema, body),
    }),
    (error) => error?.code === 'SOURCE_ORIGIN_LOCAL_SCHEMA',
  );
});

test('local manifest validators require complete subject context', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const manifests = api('buildLocalProducerManifests')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    assert.throws(
      () => validateLocalSourceManifest(manifests.sourceManifest, { allowFixtureOnly: true }),
      (error) => error?.code === 'SOURCE_ORIGIN_LOCAL_SCHEMA',
    );
  });
});

test('local manifest validation refuses a resealed manifest that omits a role-matching snapshot row', async () => {
  await withOwnedFixture(async (rootPath) => {
    const evidence = await makeEvidence(rootPath);
    const manifests = api('buildLocalProducerManifests')({
      allowFixtureOnly: true,
      capability: evidence.capability,
      repository: evidence.repository,
      policy: evidence.policy,
      subject: evidence.subject,
      host: evidence.host,
      myco: evidence.myco,
      hypha: evidence.hypha,
    });
    const { manifestDigest: _manifestDigest, ...sourceBody } = manifests.sourceManifest;
    const rows = sourceBody.rows.slice(1);
    const body = {
      ...sourceBody,
      rows,
      counts: { paths: rows.length, bytes: rows.reduce((sum, row) => sum + row.byteLength, 0) },
    };
    const tampered = { ...body, manifestDigest: sha256Canonical(body.schema, body) };
    assert.throws(
      () => validateLocalSourceManifest(tampered, {
        allowFixtureOnly: true,
        repository: evidence.repository,
        policy: evidence.policy,
        snapshot: evidence.snapshot,
        subject: evidence.subject,
        host: evidence.host,
        myco: evidence.myco,
        hypha: evidence.hypha,
      }),
      (error) => error?.code === 'SOURCE_ORIGIN_LOCAL_DIGEST',
    );
  });
});
