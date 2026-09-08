import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { canonicalJsonText, sha256Canonical } from '../lib/logic-aig-source-origin/contract.mjs';
import { buildLocalSourceOriginProject } from '../lib/logic-aig-source-origin/decode-project.mjs';
import { buildLocalFungiGateSemanticRows } from '../lib/logic-aig-source-origin/fungi-decoder.mjs';
import { buildLocalSemanticRows } from '../lib/logic-aig-source-origin/host-decoder.mjs';
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
import { buildLocalKatC } from '../lib/logic-aig-source-origin/local-frame.mjs';
import {
  admitLocalSourceOrigin,
  buildLocalTask6Claim,
  buildLocalTask6SelectionReport,
  buildLocalWorksetQuery,
} from '../lib/logic-aig-source-origin/local-gateway.mjs';

const LIMITS = {
  maxDepth: 8, maxEntries: 16, maxFileBytes: 1_024, maxMillis: 5_000,
  maxResolutionBytes: 1_024, maxResolutionFiles: 8, maxSourceBytes: 4_096,
  maxSourceFiles: 16, maxTotalBytes: 5_120,
};
const ENTRIES = [
  { path: 'generated/schema.json', role: 'GENERATED_INPUT' },
  { path: 'src/a.mjs', role: 'SOURCE' },
];

function bytes(value) { return Buffer.from(value, 'utf8'); }

function repositoryBytes() {
  const body = { schema: 'galerina.logic-aig-repository-identity.v1', ownerNamespace: 'TritHypha', repositoryName: 'Galerina', canonicalIdentity: 'TritHypha/Galerina', authorizing: false };
  return bytes(canonicalJsonText({ ...body, identityDigest: sha256Canonical(body.schema, body) }));
}

function policyBytes() {
  const body = { schema: 'galerina.logic-aig-local-inventory-policy.v1', profile: 'FIXTURE_ONLY', entries: ENTRIES, exclusions: ['.git', 'tmp'], limits: LIMITS, authorizing: false };
  return bytes(canonicalJsonText({ ...body, policyDigest: sha256Canonical(body.schema, body) }));
}

async function evidence(root, unresolved = false) {
  const capability = await captureLocalSourceSnapshot({ rootPath: root, repositoryIdentityBytes: repositoryBytes(), inventoryPolicyBytes: policyBytes() });
  const repository = JSON.parse(repositoryBytes().toString('utf8'));
  const policy = JSON.parse(policyBytes().toString('utf8'));
  const snapshot = getLocalSourceSnapshot(capability);
  const host = buildLocalHostObservation({ allowFixtureOnly: true, platform: 'win32', arch: 'x64', runtime: 'node-v24.18.0', snapshotDigest: snapshot.snapshotDigest, inventoryPolicyDigest: policy.policyDigest, fixtureOnly: true });
  const myco = buildVerifiedLocalDiscoveryReceipt({ allowFixtureOnly: true, kind: 'MYCO', snapshotDigest: snapshot.snapshotDigest, inventoryPolicyDigest: policy.policyDigest, fixtureOnly: true });
  const hypha = buildVerifiedLocalDiscoveryReceipt({ allowFixtureOnly: true, kind: 'HYPHA', snapshotDigest: snapshot.snapshotDigest, inventoryPolicyDigest: policy.policyDigest, fixtureOnly: true });
  const subject = buildLocalSourceOriginSubjectFromCapture({ allowFixtureOnly: true, capability, repository, policy, host, myco, hypha });
  const decoderInput = buildLocalDecoderInput({ allowFixtureOnly: true, capability, repository, policy, subject, host, myco, hypha });
  const parserPolicy = JSON.parse(await readFile(new URL('../../governance/logic-aig-source-origin-parser-policy.json', import.meta.url), 'utf8'));
  const resolutionPolicy = JSON.parse(await readFile(new URL('../../governance/logic-aig-source-origin-resolution-policy.json', import.meta.url), 'utf8'));
  const hostSourceRows = decoderInput.sourceManifest.rows.filter((row) => row.role === 'GENERATED_INPUT');
  const fungiSourceRows = decoderInput.sourceManifest.rows.filter((row) => row.role === 'SOURCE');
  const hostParseResults = hostSourceRows.map((row) => ({ path: row.path, status: 'PARSED', diagnosticCodes: [] }));
  const fungiParseResults = fungiSourceRows.map((row) => ({ path: row.path, status: 'PARSED', diagnosticCodes: [] }));
  const hostSemantic = buildLocalSemanticRows({ subjectDigest: subject.subjectDigest, parserId: 'typescript-compiler-api', sourceRows: hostSourceRows, parseResults: hostParseResults, declarations: [], relations: [], parserPolicy, resolutionPolicy });
  const fungiSemantic = buildLocalFungiGateSemanticRows({ subjectDigest: subject.subjectDigest, parserPolicy, resolutionPolicy, fungi: { parserId: 'galerina-fungi-parser', sourceRows: fungiSourceRows, parseResults: fungiParseResults, declarations: [], relations: unresolved ? [{ path: 'src/a.mjs', ownerNativeKey: null, relationshipClass: 'IMPORT', startByte: 0, endByte: 1, targetNativeKeys: [], targetPaths: [], targetState: 'DYNAMIC' }] : [] }, gate: { parserId: 'galerina-gate-v3-parser', sourceRows: [], parseResults: [], declarations: [], relations: [] } });
  const project = buildLocalSourceOriginProject({ decoderInput, context: { allowFixtureOnly: true, repository, policy, snapshot, subject, host, myco, hypha }, hostSourceRows, hostSemantic, hostParseResults, fungiSourceRows, fungiSemantic });
  const toolchain = { schema: 'galerina.logic-aig-local-toolchain-manifest.v2', subjectDigest: subject.subjectDigest, hostParserId: 'typescript-compiler-api', fungiParserId: 'galerina-fungi-parser', gateParserId: 'galerina-gate-v3-parser', runtime: 'node-v24.18.0', platform: 'win32', arch: 'x64', authorizing: false, authentication: 'NONE', executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER' };
  return { decoderInput, project, kat: buildLocalKatC({ decoderInput, project, toolchain }) };
}

test('local gateway computes ZERO_APPLICABLE and emits a byte-final NOT_AUTHORED report', async () => {
  const root = await mkdtemp(join(tmpdir(), 'galerina-local-gateway-'));
  try {
    await mkdir(join(root, 'generated')); await mkdir(join(root, 'src')); await mkdir(join(root, '.git'));
    await writeFile(join(root, 'generated', 'schema.json'), '{"v":1}\n');
    await writeFile(join(root, 'src', 'a.mjs'), 'export const a = 1;\n');
    await writeFile(join(root, '.git', 'config'), 'excluded\n');
    const { project, kat } = await evidence(root);
    const candidate = project.nodes.find((node) => node.kind === 'FILE' && node.locator === 'src/a.mjs');
    const query = buildLocalWorksetQuery({ frameSha256: kat.frameSha256, runId: kat.manifest.runId, subjectDigest: kat.manifest.subjectDigest, seedNodeIds: [candidate.id] });
    const claim = buildLocalTask6Claim({ frameSha256: kat.frameSha256, runId: kat.manifest.runId, subjectDigest: kat.manifest.subjectDigest, worksetQueryDigest: query.queryDigest, candidate: { candidateState: 'NOT_AUTHORED', nodeId: candidate.id, sourceLocator: candidate.locator, sourceRawSha256: candidate.digest } });
    const gateway = admitLocalSourceOrigin({ frame: kat.frame, profile: kat.profile, query, claim });
    assert.equal(gateway.result.status, 'LOCAL_VERIFIED');
    assert.equal(gateway.result.task6Obligation.status, 'ZERO_APPLICABLE');
    assert.equal(gateway.result.authorizing, false);
    const report = buildLocalTask6SelectionReport({ gateway, candidate: claim.candidate });
    assert.equal(report.candidateState, 'NOT_AUTHORED');
    assert.equal(report.status, 'ZERO_APPLICABLE');
    assert.equal(Object.hasOwn(report, 'selectionReviewDigest'), false);
    assert.equal(Object.hasOwn(report, 'ownerApprovalDigest'), false);
    const unsignedReport = { ...report }; delete unsignedReport.selectionDigest;
    assert.equal(sha256Canonical(report.schema, unsignedReport), report.selectionDigest);
    assert.throws(() => admitLocalSourceOrigin({ frame: kat.frame, profile: kat.profile, query: { ...query, subjectDigest: 'f'.repeat(64) }, claim }), /LOCAL_GATEWAY_/u);
    const other = project.nodes.find((node) => node.kind === 'FILE' && node.locator === 'generated/schema.json');
    const unrelatedQuery = buildLocalWorksetQuery({ frameSha256: kat.frameSha256, runId: kat.manifest.runId, subjectDigest: kat.manifest.subjectDigest, seedNodeIds: [other.id] });
    const mismatchedClaim = buildLocalTask6Claim({ frameSha256: kat.frameSha256, runId: kat.manifest.runId, subjectDigest: kat.manifest.subjectDigest, worksetQueryDigest: unrelatedQuery.queryDigest, candidate: claim.candidate });
    assert.throws(() => admitLocalSourceOrigin({ frame: kat.frame, profile: kat.profile, query: unrelatedQuery, claim: mismatchedClaim }), /LOCAL_GATEWAY_CLAIM/u);
    assert.throws(() => buildLocalTask6SelectionReport({ gateway: structuredClone(gateway), candidate: claim.candidate }), /LOCAL_GATEWAY_SELECTION/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('local gateway holds when an applicable unresolved row intersects the WORKSET', async () => {
  const root = await mkdtemp(join(tmpdir(), 'galerina-local-gateway-hold-'));
  try {
    await mkdir(join(root, 'generated')); await mkdir(join(root, 'src')); await mkdir(join(root, '.git'));
    await writeFile(join(root, 'generated', 'schema.json'), '{"v":1}\n');
    await writeFile(join(root, 'src', 'a.mjs'), 'export const a = 1;\n');
    await writeFile(join(root, '.git', 'config'), 'excluded\n');
    const { project, kat } = await evidence(root, true);
    const candidate = project.nodes.find((node) => node.kind === 'FILE' && node.locator === 'src/a.mjs');
    const query = buildLocalWorksetQuery({ frameSha256: kat.frameSha256, runId: kat.manifest.runId, subjectDigest: kat.manifest.subjectDigest, seedNodeIds: [candidate.id] });
    const claim = buildLocalTask6Claim({ frameSha256: kat.frameSha256, runId: kat.manifest.runId, subjectDigest: kat.manifest.subjectDigest, worksetQueryDigest: query.queryDigest, candidate: { candidateState: 'NOT_AUTHORED', nodeId: candidate.id, sourceLocator: candidate.locator, sourceRawSha256: candidate.digest } });
    const gateway = admitLocalSourceOrigin({ frame: kat.frame, profile: kat.profile, query, claim });
    assert.equal(gateway.result.status, 'HOLD');
    assert.equal(gateway.result.task6Obligation.status, 'HOLD');
    assert.equal(gateway.result.task6Obligation.applicableUnresolvedCount, 1);
    assert.throws(() => buildLocalTask6SelectionReport({ gateway, candidate: claim.candidate }), /LOCAL_GATEWAY_SELECTION/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});
