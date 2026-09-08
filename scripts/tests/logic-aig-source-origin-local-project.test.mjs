import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { canonicalJsonText, sha256Canonical } from '../lib/logic-aig-source-origin/contract.mjs';
import { buildLocalSourceOriginProject } from '../lib/logic-aig-source-origin/decode-project.mjs';
import { buildLocalFungiGateSemanticRows } from '../lib/logic-aig-source-origin/fungi-decoder.mjs';
import { buildLocalDecoderInput } from '../lib/logic-aig-source-origin/local-producer.mjs';
import {
  buildLocalHostObservation,
  buildVerifiedLocalDiscoveryReceipt,
} from '../lib/logic-aig-source-origin/local-subject.mjs';
import {
  buildLocalSourceOriginSubjectFromCapture as subjectFromCapture,
  captureLocalSourceSnapshot,
  getLocalSourceSnapshot,
} from '../lib/logic-aig-source-origin/local-source.mjs';
import { buildLocalSemanticRows } from '../lib/logic-aig-source-origin/host-decoder.mjs';

const GOVERNANCE = new URL('../../governance/', import.meta.url);
const TEMP_PREFIX = 'galerina-local-project-fixture-';
const DEFAULT_ENTRIES = [
  { path: 'generated/schema.json', role: 'GENERATED_INPUT' },
  { path: 'src/a.mjs', role: 'SOURCE' },
];
const LIMITS = {
  maxDepth: 8,
  maxEntries: 16,
  maxFileBytes: 1_024,
  maxMillis: 5_000,
  maxResolutionBytes: 1_024,
  maxResolutionFiles: 8,
  maxSourceBytes: 4_096,
  maxSourceFiles: 16,
  maxTotalBytes: 5_120,
};

function bytesOf(value) { return Buffer.from(value, 'utf8'); }

function repositoryBytes() {
  const body = {
    schema: 'galerina.logic-aig-repository-identity.v1',
    ownerNamespace: 'TritHypha',
    repositoryName: 'Galerina',
    canonicalIdentity: 'TritHypha/Galerina',
    authorizing: false,
  };
  return bytesOf(canonicalJsonText({ ...body, identityDigest: sha256Canonical(body.schema, body) }));
}

function policyBytes() {
  const body = {
    schema: 'galerina.logic-aig-local-inventory-policy.v1',
    profile: 'FIXTURE_ONLY',
    entries: DEFAULT_ENTRIES,
    exclusions: ['.git', 'tmp'],
    limits: LIMITS,
    authorizing: false,
  };
  return bytesOf(canonicalJsonText({ ...body, policyDigest: sha256Canonical(body.schema, body) }));
}

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  try {
    await mkdir(join(root, 'generated'));
    await mkdir(join(root, 'src'));
    await mkdir(join(root, '.git'));
    await writeFile(join(root, 'generated', 'schema.json'), '{"v":1}\n');
    await writeFile(join(root, 'src', 'a.mjs'), 'export const a = 1;\n');
    await writeFile(join(root, '.git', 'config'), 'excluded\n');
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function makeEvidence(root) {
  const capability = await captureLocalSourceSnapshot({
    rootPath: root,
    repositoryIdentityBytes: repositoryBytes(),
    inventoryPolicyBytes: policyBytes(),
  });
  const repository = JSON.parse(repositoryBytes().toString('utf8'));
  const policy = JSON.parse(policyBytes().toString('utf8'));
  const snapshot = getLocalSourceSnapshot(capability);
  const host = buildLocalHostObservation({
    allowFixtureOnly: true,
    platform: 'win32',
    arch: 'x64',
    runtime: 'node-v24.18.0',
    snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest,
    fixtureOnly: true,
  });
  const myco = buildVerifiedLocalDiscoveryReceipt({
    allowFixtureOnly: true,
    kind: 'MYCO',
    snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest,
    fixtureOnly: true,
  });
  const hypha = buildVerifiedLocalDiscoveryReceipt({
    allowFixtureOnly: true,
    kind: 'HYPHA',
    snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest,
    fixtureOnly: true,
  });
  const subject = subjectFromCapture({
    allowFixtureOnly: true,
    capability,
    repository,
    policy,
    host,
    myco,
    hypha,
  });
  const decoderInput = buildLocalDecoderInput({
    allowFixtureOnly: true,
    capability,
    repository,
    policy,
    subject,
    host,
    myco,
    hypha,
  });
  const parserPolicy = JSON.parse(await readFile(new URL('logic-aig-source-origin-parser-policy.json', GOVERNANCE), 'utf8'));
  const resolutionPolicy = JSON.parse(await readFile(new URL('logic-aig-source-origin-resolution-policy.json', GOVERNANCE), 'utf8'));
  const hostSourceRows = decoderInput.sourceManifest.rows.filter((row) => row.role === 'GENERATED_INPUT');
  const fungiSourceRows = decoderInput.sourceManifest.rows.filter((row) => row.role === 'SOURCE');
  const hostSemantic = buildLocalSemanticRows({
    subjectDigest: subject.subjectDigest,
    parserId: 'typescript-compiler-api',
    sourceRows: hostSourceRows,
    parseResults: hostSourceRows.map((row) => ({ path: row.path, status: 'PARSED', diagnosticCodes: [] })),
    declarations: [],
    relations: [{
      path: hostSourceRows[0].path,
      ownerNativeKey: null,
      relationshipClass: 'IMPORT',
      startByte: 0,
      endByte: 1,
      targetNativeKeys: [],
      targetPaths: [hostSourceRows[0].path],
      targetState: 'RESOLVED',
    }],
    parserPolicy,
    resolutionPolicy,
  });
  const hostParseResults = hostSourceRows.map((row) => ({
    path: row.path,
    status: 'PARSED',
    diagnosticCodes: [],
  }));
  const fungiSemantic = buildLocalFungiGateSemanticRows({
    subjectDigest: subject.subjectDigest,
    parserPolicy,
    resolutionPolicy,
    fungi: {
      parserId: 'galerina-fungi-parser',
      sourceRows: fungiSourceRows,
      parseResults: fungiSourceRows.map((row) => ({ path: row.path, status: 'PARSED', diagnosticCodes: [] })),
      declarations: [],
      relations: [{
        path: fungiSourceRows[0].path,
        ownerNativeKey: null,
        relationshipClass: 'IMPORT',
        startByte: 0,
        endByte: 1,
        targetNativeKeys: [],
        targetPaths: [],
        targetState: 'DYNAMIC',
      }],
    },
    gate: { parserId: 'galerina-gate-v3-parser', sourceRows: [], parseResults: [], declarations: [], relations: [] },
  });
  return {
    decoderInput,
    context: { allowFixtureOnly: true, repository, policy, snapshot, subject, host, myco, hypha },
    hostSourceRows,
    hostSemantic,
    hostParseResults,
    fungiSourceRows,
    fungiSemantic,
  };
}

test('local project composition validates held bytes and complete semantic coverage', async () => {
  await fixture(async (root) => {
    const evidence = await makeEvidence(root);
    const project = buildLocalSourceOriginProject(evidence);
    assert.equal(project.schema, 'galerina.logic-aig-local-project.v1');
    assert.equal(project.subjectDigest, evidence.context.subject.subjectDigest);
    assert.equal(project.authorizing, false);
    assert.equal(project.authentication, 'NONE');
    assert.equal(project.executionBoundary, 'COOPERATIVE_LOCAL_SAME_USER');
    assert.equal(project.nodes.filter((node) => node.kind === 'FILE').length, evidence.decoderInput.sourceManifest.rows.length);
    assert.equal(project.parseResults.length, evidence.decoderInput.sourceManifest.rows.length);
    assert.equal(project.edges.length, 1);
    assert.equal(project.unresolved.length, 1);
    assert.equal(project.idMapRows.every((row) => !Object.hasOwn(row, 'sourceBlobOid')), true);
    assert.equal(Object.isFrozen(evidence.hostSemantic), true);
    assert.equal(Object.hasOwn(project, 'expectedHead'), false);
    assert.equal(Object.hasOwn(project, 'expectedTree'), false);

    const tamperedHost = {
      ...evidence.hostSemantic,
      edges: evidence.hostSemantic.edges.map((edge) => ({ ...edge, digest: '0'.repeat(64) })),
    };
    assert.throws(
      () => buildLocalSourceOriginProject({ ...evidence, hostSemantic: tamperedHost }),
      (error) => error?.code === 'SOURCE_ORIGIN_PROJECT_DIGEST',
    );
  });
});
