import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_INVENTORY_POLICY_SCHEMA,
  LOCAL_SOURCE_SNAPSHOT_SCHEMA,
  canonicalJsonText,
  sha256Canonical,
  validateLocalInventoryPolicy,
  validateLocalSourceSnapshot,
} from '../lib/logic-aig-source-origin/contract.mjs';

const ENTRIES = [
  { path: 'package.json', role: 'RESOLUTION' },
  { path: 'src/main.mjs', role: 'SOURCE' },
];
const LIMITS = {
  maxDepth: 8,
  maxEntries: 32,
  maxFileBytes: 1024,
  maxMillis: 5000,
  maxResolutionBytes: 1024,
  maxResolutionFiles: 8,
  maxSourceBytes: 4096,
  maxSourceFiles: 16,
  maxTotalBytes: 5120,
};

function digestBody(schema, body) {
  return { ...body, policyDigest: sha256Canonical(schema, body) };
}

function resealPolicy(value) {
  const { policyDigest: _policyDigest, ...body } = value;
  return digestBody(LOCAL_INVENTORY_POLICY_SCHEMA, body);
}

function resealSnapshot(value) {
  const { snapshotDigest: _snapshotDigest, ...body } = value;
  return { ...body, snapshotDigest: sha256Canonical(LOCAL_SOURCE_SNAPSHOT_SCHEMA, body) };
}

function identity() {
  const body = {
    schema: 'galerina.logic-aig-repository-identity.v1',
    ownerNamespace: 'TritHypha',
    repositoryName: 'Galerina',
    canonicalIdentity: 'TritHypha/Galerina',
    authorizing: false,
  };
  return { ...body, identityDigest: sha256Canonical(body.schema, body) };
}

function policy() {
  const body = {
    schema: LOCAL_INVENTORY_POLICY_SCHEMA,
    profile: 'FIXTURE_ONLY',
    entries: ENTRIES,
    exclusions: ['.git'],
    limits: LIMITS,
    authorizing: false,
  };
  return digestBody(body.schema, body);
}

function snapshot(repository, inventory, fixtureOnly = true) {
  const body = {
    schema: LOCAL_SOURCE_SNAPSHOT_SCHEMA,
    repositoryIdentityDigest: repository.identityDigest,
    inventoryPolicyDigest: inventory.policyDigest,
    entries: [
      { path: 'package.json', role: 'RESOLUTION', byteLength: 9, rawSha256: 'a'.repeat(64) },
      { path: 'src/main.mjs', role: 'SOURCE', byteLength: 18, rawSha256: 'b'.repeat(64) },
    ],
    counts: {
      entries: 2,
      sourceFiles: 1,
      sourceBytes: 18,
      resolutionFiles: 1,
      resolutionBytes: 9,
      totalBytes: 27,
    },
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    atomicSnapshot: false,
    hostileWriterResistance: false,
    fixtureOnly,
  };
  return { ...body, snapshotDigest: sha256Canonical(body.schema, body) };
}

function expectCode(code, operation) {
  assert.throws(operation, (error) => error?.code === code);
}

test('local contract validators require explicit fixture admission and bind policy and identity', () => {
  const repository = identity();
  const inventory = policy();
  const captured = snapshot(repository, inventory);

  assert.deepEqual(
    validateLocalInventoryPolicy(inventory, { allowFixtureOnly: true }),
    inventory,
  );
  assert.deepEqual(
    validateLocalSourceSnapshot(captured, {
      allowFixtureOnly: true,
      repositoryIdentity: repository,
      inventoryPolicy: inventory,
    }),
    captured,
  );
  expectCode('SOURCE_ORIGIN_FIXTURE', () => validateLocalInventoryPolicy(inventory));
  expectCode('SOURCE_ORIGIN_FIXTURE', () => validateLocalSourceSnapshot(captured));
  expectCode('SOURCE_ORIGIN_SCHEMA', () => validateLocalSourceSnapshot(captured, {
    allowFixtureOnly: true,
    repositoryIdentity: undefined,
    inventoryPolicy: undefined,
  }));
});

test('local contract validators reject resealed order, counts, roles, and bindings', () => {
  const repository = identity();
  const inventory = policy();
  const captured = snapshot(repository, inventory);
  const mutations = [
    { ...inventory, entries: inventory.entries.slice().reverse() },
    { ...captured, entries: captured.entries.slice().reverse() },
    { ...captured, counts: { ...captured.counts, totalBytes: 28 } },
    { ...captured, entries: [{ ...captured.entries[0], role: 'UNKNOWN' }, captured.entries[1]] },
    { ...captured, repositoryIdentityDigest: 'c'.repeat(64) },
    { ...captured, inventoryPolicyDigest: 'd'.repeat(64) },
  ];
  expectCode('SOURCE_ORIGIN_ORDER', () => validateLocalInventoryPolicy(mutations[0], { allowFixtureOnly: true }));
  expectCode('SOURCE_ORIGIN_ORDER', () => validateLocalSourceSnapshot(mutations[1], { allowFixtureOnly: true }));
  expectCode('SOURCE_ORIGIN_COUNTS', () => validateLocalSourceSnapshot(mutations[2], {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: inventory,
  }));
  expectCode('SOURCE_ORIGIN_SCHEMA', () => validateLocalSourceSnapshot(mutations[3], {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: inventory,
  }));
  for (const mutation of mutations.slice(4)) {
    expectCode('SOURCE_ORIGIN_DIGEST', () => validateLocalSourceSnapshot(mutation, {
      allowFixtureOnly: true,
      repositoryIdentity: repository,
      inventoryPolicy: inventory,
    }));
  }
});

test('local contract validators keep production claims bound and fixture policies closed', () => {
  const repository = identity();
  const inventory = policy();
  const captured = snapshot(repository, inventory);
  const productionClaim = resealSnapshot(snapshot(repository, inventory, false));

  expectCode('SOURCE_ORIGIN_FIXTURE', () => validateLocalSourceSnapshot(productionClaim));
  expectCode('SOURCE_ORIGIN_FIXTURE', () => validateLocalSourceSnapshot(productionClaim, {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: inventory,
  }));
  expectCode('SOURCE_ORIGIN_FIXTURE', () => validateLocalSourceSnapshot(captured, {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: resealPolicy({ ...inventory, profile: 'LOCAL_PRODUCTION_V1' }),
  }));
});

test('local inventory policy validators reject exclusions that collide with admitted paths', () => {
  const inventory = policy();
  const mutations = [
    { ...inventory, exclusions: ['.git', 'src'] },
    { ...inventory, exclusions: ['.git', 'src/main.mjs'] },
    { ...inventory, exclusions: ['.git', 'SRC'] },
  ];
  const resealed = mutations.map(resealPolicy);
  expectCode('SOURCE_ORIGIN_POLICY', () => validateLocalInventoryPolicy(resealed[0], { allowFixtureOnly: true }));
  expectCode('SOURCE_ORIGIN_ALIAS', () => validateLocalInventoryPolicy(resealed[1], { allowFixtureOnly: true }));
  expectCode('SOURCE_ORIGIN_POLICY', () => validateLocalInventoryPolicy(resealed[2], { allowFixtureOnly: true }));
});

test('local source snapshots cannot exceed bound policy byte and file ceilings', () => {
  const repository = identity();
  const inventory = resealPolicy({
    ...policy(),
    limits: { ...LIMITS, maxFileBytes: 10, maxSourceBytes: 10 },
  });
  const captured = snapshot(repository, inventory);
  expectCode('SOURCE_ORIGIN_LIMIT', () => validateLocalSourceSnapshot(captured, {
    allowFixtureOnly: true,
    repositoryIdentity: repository,
    inventoryPolicy: inventory,
  }));
});

test('local contract canonical bytes have an independent literal digest preimage', () => {
  const repository = identity();
  const inventory = policy();
  const captured = snapshot(repository, inventory);
  const withoutDigest = { ...captured };
  delete withoutDigest.snapshotDigest;
  assert.equal(
    sha256Canonical(LOCAL_SOURCE_SNAPSHOT_SCHEMA, JSON.parse(canonicalJsonText(withoutDigest))),
    captured.snapshotDigest,
  );
});
