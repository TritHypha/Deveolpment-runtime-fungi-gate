import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { canonicalJsonText, sha256Canonical } from '../lib/logic-aig-source-origin/contract.mjs';
import {
  buildLocalAdmissionFrame,
  buildLocalKatC,
  verifyLocalAdmissionFrame,
} from '../lib/logic-aig-source-origin/local-frame.mjs';
import { buildLocalSourceOriginProject } from '../lib/logic-aig-source-origin/decode-project.mjs';
import { buildLocalFungiGateSemanticRows } from '../lib/logic-aig-source-origin/fungi-decoder.mjs';
import { buildLocalDecoderInput } from '../lib/logic-aig-source-origin/local-producer.mjs';
import {
  buildLocalHostObservation,
  buildVerifiedLocalDiscoveryReceipt,
} from '../lib/logic-aig-source-origin/local-subject.mjs';
import {
  buildLocalSourceOriginSubjectFromCapture,
  captureLocalSourceSnapshot,
  getLocalSourceSnapshot,
} from '../lib/logic-aig-source-origin/local-source.mjs';
import { buildLocalSemanticRows } from '../lib/logic-aig-source-origin/host-decoder.mjs';

const TEMP_PREFIX = 'galerina-local-frame-fixture-';
const ENTRIES = [
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

function bytes(value) { return Buffer.from(value, 'utf8'); }

function rawDigest(value) { return createHash('sha256').update(value).digest('hex'); }

function rewriteArtifact(frame, targetId, mutate) {
  let offset = 0;
  const magic = frame.subarray(offset, offset + 5); offset += 5;
  const manifestLength = frame.readUInt32BE(offset); offset += 4;
  const manifest = JSON.parse(frame.subarray(offset, offset + manifestLength).toString('utf8')); offset += manifestLength;
  const count = frame.readUInt16BE(offset); offset += 2;
  const artifacts = [];
  for (let index = 0; index < count; index += 1) {
    const idLength = frame.readUInt16BE(offset); offset += 2;
    const id = frame.subarray(offset, offset + idLength).toString('utf8'); offset += idLength;
    const byteLength = Number(frame.readBigUInt64BE(offset)); offset += 8;
    const body = Buffer.from(frame.subarray(offset, offset + byteLength)); offset += byteLength;
    const value = JSON.parse(body.toString('utf8'));
    const next = id === targetId ? mutate(value) : value;
    const nextBody = Buffer.from(canonicalJsonText(next), 'utf8');
    artifacts.push({ id, body: nextBody });
    const row = manifest.artifacts.find((candidate) => candidate.id === id);
    row.byteLength = nextBody.length;
    row.sha256 = rawDigest(nextBody);
  }
  const manifestBody = Buffer.from(canonicalJsonText(manifest), 'utf8');
  const parts = [magic, Buffer.alloc(4), manifestBody, Buffer.alloc(2)];
  parts[1].writeUInt32BE(manifestBody.length);
  parts[3].writeUInt16BE(artifacts.length);
  for (const artifact of artifacts) {
    const id = Buffer.from(artifact.id, 'utf8');
    const idLength = Buffer.alloc(2); idLength.writeUInt16BE(id.length);
    const bodyLength = Buffer.alloc(8); bodyLength.writeBigUInt64BE(BigInt(artifact.body.length));
    parts.push(idLength, id, bodyLength, artifact.body);
  }
  return Buffer.concat(parts);
}

function repositoryBytes() {
  const body = {
    schema: 'galerina.logic-aig-repository-identity.v1',
    ownerNamespace: 'TritHypha', repositoryName: 'Galerina',
    canonicalIdentity: 'TritHypha/Galerina', authorizing: false,
  };
  return bytes(canonicalJsonText({ ...body, identityDigest: sha256Canonical(body.schema, body) }));
}

function policyBytes() {
  const body = {
    schema: 'galerina.logic-aig-local-inventory-policy.v1',
    profile: 'FIXTURE_ONLY', entries: ENTRIES, exclusions: ['.git', 'tmp'],
    limits: LIMITS, authorizing: false,
  };
  return bytes(canonicalJsonText({ ...body, policyDigest: sha256Canonical(body.schema, body) }));
}

async function makeEvidence(root) {
  const capability = await captureLocalSourceSnapshot({
    rootPath: root, repositoryIdentityBytes: repositoryBytes(), inventoryPolicyBytes: policyBytes(),
  });
  const repository = JSON.parse(repositoryBytes().toString('utf8'));
  const policy = JSON.parse(policyBytes().toString('utf8'));
  const snapshot = getLocalSourceSnapshot(capability);
  const host = buildLocalHostObservation({
    allowFixtureOnly: true, platform: 'win32', arch: 'x64', runtime: 'node-v24.18.0',
    snapshotDigest: snapshot.snapshotDigest, inventoryPolicyDigest: policy.policyDigest, fixtureOnly: true,
  });
  const myco = buildVerifiedLocalDiscoveryReceipt({
    allowFixtureOnly: true, kind: 'MYCO', snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest, fixtureOnly: true,
  });
  const hypha = buildVerifiedLocalDiscoveryReceipt({
    allowFixtureOnly: true, kind: 'HYPHA', snapshotDigest: snapshot.snapshotDigest,
    inventoryPolicyDigest: policy.policyDigest, fixtureOnly: true,
  });
  const subject = buildLocalSourceOriginSubjectFromCapture({
    allowFixtureOnly: true, capability, repository, policy, host, myco, hypha,
  });
  const decoderInput = buildLocalDecoderInput({
    allowFixtureOnly: true, capability, repository, policy, subject, host, myco, hypha,
  });
  const parserPolicy = JSON.parse(await readFile(new URL('../../governance/logic-aig-source-origin-parser-policy.json', import.meta.url), 'utf8'));
  const resolutionPolicy = JSON.parse(await readFile(new URL('../../governance/logic-aig-source-origin-resolution-policy.json', import.meta.url), 'utf8'));
  const hostSourceRows = decoderInput.sourceManifest.rows.filter((row) => row.role === 'GENERATED_INPUT');
  const fungiSourceRows = decoderInput.sourceManifest.rows.filter((row) => row.role === 'SOURCE');
  const hostParseResults = hostSourceRows.map((row) => ({ path: row.path, status: 'PARSED', diagnosticCodes: [] }));
  const fungiParseResults = fungiSourceRows.map((row) => ({ path: row.path, status: 'PARSED', diagnosticCodes: [] }));
  const hostSemantic = buildLocalSemanticRows({
    subjectDigest: subject.subjectDigest, parserId: 'typescript-compiler-api', sourceRows: hostSourceRows,
    parseResults: hostParseResults, declarations: [], relations: [], parserPolicy, resolutionPolicy,
  });
  const fungiSemantic = buildLocalFungiGateSemanticRows({
    subjectDigest: subject.subjectDigest, parserPolicy, resolutionPolicy,
    fungi: { parserId: 'galerina-fungi-parser', sourceRows: fungiSourceRows, parseResults: fungiParseResults, declarations: [], relations: [] },
    gate: { parserId: 'galerina-gate-v3-parser', sourceRows: [], parseResults: [], declarations: [], relations: [] },
  });
  const project = buildLocalSourceOriginProject({
    decoderInput,
    context: { allowFixtureOnly: true, repository, policy, snapshot, subject, host, myco, hypha },
    hostSourceRows, hostSemantic, hostParseResults, fungiSourceRows, fungiSemantic,
  });
  return { decoderInput, project };
}

test('producer-built KAT-C frame verifies and remains unauthenticated HOLD', async () => {
  const root = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  try {
    await mkdir(join(root, 'generated'));
    await mkdir(join(root, 'src'));
    await mkdir(join(root, '.git'));
    await writeFile(join(root, 'generated', 'schema.json'), '{"v":1}\n');
    await writeFile(join(root, 'src', 'a.mjs'), 'export const a = 1;\n');
    await writeFile(join(root, '.git', 'config'), 'excluded\n');
    const evidence = await makeEvidence(root);
    const toolchain = {
      schema: 'galerina.logic-aig-local-toolchain-manifest.v2',
      subjectDigest: evidence.decoderInput.subject.subjectDigest,
      hostParserId: 'typescript-compiler-api',
      fungiParserId: 'galerina-fungi-parser',
      gateParserId: 'galerina-gate-v3-parser',
      runtime: 'node-v24.18.0', platform: 'win32', arch: 'x64',
      authorizing: false, authentication: 'NONE', executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    };
    const kat = buildLocalKatC({ decoderInput: evidence.decoderInput, project: evidence.project, toolchain });
    assert.equal(kat.profile.profileId, 'galerina.source-origin.local.v1');
    assert.equal(kat.frame[0], 0x47);
    const verified = verifyLocalAdmissionFrame(kat.frame, kat.profile);
    assert.equal(verified.status, 'HOLD');
    assert.equal(verified.reason, 'UNAUTHENTICATED_PROVENANCE');
    assert.equal(verified.logicRequestDigest, null);
    assert.equal(verified.capsuleDigest, null);
    assert.equal(verified.authorizing, false);
    assert.equal(verified.frameSha256, kat.frameSha256);
    assert.equal(verified.artifactIds.length, 7);
    assert.equal(kat.manifest.schema, 'galerina.logic-aig-local-admission-manifest.v1');
    const mismatchedToolchain = rewriteArtifact(kat.frame, 'toolchain-manifest', (value) => ({
      ...value, subjectDigest: 'd'.repeat(64),
    }));
    assert.throws(() => verifyLocalAdmissionFrame(mismatchedToolchain, kat.profile), /LOCAL_FRAME_TOOLCHAIN/u);
    const forgedCounts = rewriteArtifact(kat.frame, 'parse-outcomes-receipt', (value) => {
      const next = { ...value, counts: { outcomeRows: value.rows.length + 1 } };
      delete next.receiptDigest;
      next.receiptDigest = sha256Canonical(next.schema, next);
      return next;
    });
    assert.throws(() => verifyLocalAdmissionFrame(forgedCounts, kat.profile), /LOCAL_FRAME_PARSE/u);
    const forgedFixtureLabel = rewriteArtifact(kat.frame, 'export-sidecar', (value) => {
      const next = { ...value, fixtureOnly: false };
      delete next.receiptDigest;
      next.receiptDigest = sha256Canonical(next.schema, next);
      return next;
    });
    assert.throws(() => verifyLocalAdmissionFrame(forgedFixtureLabel, kat.profile), /LOCAL_FRAME_SEMANTIC/u);
    const forged = Buffer.from(kat.frame);
    forged[forged.length - 1] ^= 1;
    assert.throws(() => verifyLocalAdmissionFrame(forged, kat.profile), /LOCAL_FRAME_/u);
    const forgedManifestBody = {
      ...evidence.decoderInput.sourceManifest,
      rows: evidence.decoderInput.sourceManifest.rows.map((row, index) => index === 0 ? { ...row, path: 'forged.json' } : row),
    };
    forgedManifestBody.manifestDigest = sha256Canonical(forgedManifestBody.schema, (() => {
      const { manifestDigest, ...body } = forgedManifestBody;
      return body;
    })());
    const forgedInput = { ...evidence.decoderInput, sourceManifest: forgedManifestBody };
    const forgedFrame = buildLocalAdmissionFrame({
      decoderInput: forgedInput, project: evidence.project, toolchain, runId: 'c'.repeat(64),
    });
    assert.throws(() => verifyLocalAdmissionFrame(forgedFrame.frame, forgedFrame.profile), /LOCAL_FRAME_PROJECT/u);
    assert.equal(buildLocalAdmissionFrame({ decoderInput: evidence.decoderInput, project: evidence.project, toolchain, runId: 'c'.repeat(64) }).profileId, kat.profile.profileId);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
