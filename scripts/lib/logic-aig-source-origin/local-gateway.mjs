import {
  buildLocalAdmissionProfile,
  inspectLocalAdmissionFrame,
} from './local-frame.mjs';
import { canonicalJsonText, sha256Canonical } from './contract.mjs';

const PROFILE = buildLocalAdmissionProfile();
const RELATIONSHIP_KINDS = Object.freeze(['CALLER', 'CONTRACT', 'GENERATED_CONSUMER', 'IMPORT', 'TEST']);
const EVIDENCE_VIEWS = Object.freeze(['FUNGI', 'HOST', 'TASK6_OBLIGATION']);
const QUERY_SCHEMA = 'galerina.logic-aig-local-workset-query.v1';
const CLAIM_SCHEMA = 'galerina.logic-aig-local-task6-claim.v1';
const OBLIGATION_SCHEMA = 'galerina.logic-aig-local-task6-obligation.v1';
const PROJECTION_SCHEMA = 'galerina.logic-aig-local-workset-projection.v1';
const RESULT_SCHEMA = 'galerina.logic-aig-local-gateway-result.v1';
const SELECTION_SCHEMA = 'galerina.logic-aig-local-task6-selection.v1';
const HEX64 = /^[0-9a-f]{64}$/u;
const NODE_ID = /^ga1:[0-9a-f]{64}$/u;
const ADMITTED_GATEWAYS = new WeakSet();

export class LocalGatewayRefusal extends Error {
  constructor(code) {
    super(code);
    this.name = 'LocalGatewayRefusal';
    this.code = code;
  }
}

function refuse(code) { throw new LocalGatewayRefusal(`LOCAL_GATEWAY_${code}`); }

function exactRecord(value, keys, code = 'SCHEMA') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) refuse(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) refuse(code);
  return value;
}

function digest(value, code = 'DIGEST') {
  if (typeof value !== 'string' || !HEX64.test(value)) refuse(code);
  return value;
}

function digestBody(schema, value, field) {
  const body = {};
  for (const key of Object.keys(value)) if (key !== field) body[key] = value[key];
  return sha256Canonical(schema, body);
}

function selfDigest(value, field, code = 'DIGEST') {
  digest(value[field], code);
  if (digestBody(value.schema, value, field) !== value[field]) refuse(code);
}

function arrayExact(value, code = 'SCHEMA') {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) refuse(code);
  return value;
}

function equalJson(left, right) { return canonicalJsonText(left) === canonicalJsonText(right); }

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.keys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function profileBinding(profile) {
  if (!equalJson(profile, PROFILE)) refuse('PROFILE');
  return sha256Canonical(PROFILE.schema, PROFILE);
}

function artifactValue(inspected, id) {
  const artifact = inspected.artifacts.find((entry) => entry.id === id);
  if (!artifact) refuse('FRAME');
  return artifact.value;
}

function queryBody(options) {
  exactRecord(options, [
    'authorizing', 'frameSha256', 'profileDigest', 'profileId', 'relationshipKinds', 'runId',
    'schema', 'seedNodeIds', 'subjectDigest', 'queryDigest',
  ]);
  if (options.schema !== QUERY_SCHEMA || options.authorizing !== false
    || options.profileId !== PROFILE.profileId || options.profileDigest !== sha256Canonical(PROFILE.schema, PROFILE)
    || !digest(options.frameSha256) || !digest(options.runId) || !digest(options.subjectDigest)
    || !Array.isArray(options.seedNodeIds) || options.seedNodeIds.length === 0
    || options.seedNodeIds.some((id) => typeof id !== 'string' || !NODE_ID.test(id))
    || [...new Set(options.seedNodeIds)].length !== options.seedNodeIds.length
    || options.seedNodeIds.some((id, index) => index > 0 && options.seedNodeIds[index - 1] >= id)
    || !Array.isArray(options.relationshipKinds) || !equalJson(options.relationshipKinds, RELATIONSHIP_KINDS)) refuse('QUERY');
  selfDigest(options, 'queryDigest');
  return options;
}

function claimBody(value) {
  exactRecord(value, [
    'authorizing', 'candidate', 'claimDigest', 'frameSha256', 'profileDigest', 'profileId',
    'requiredEvidenceViews', 'runId', 'schema', 'subjectDigest', 'worksetQueryDigest',
  ]);
  exactRecord(value.candidate, ['candidateState', 'nodeId', 'sourceLocator', 'sourceRawSha256']);
  if (value.schema !== CLAIM_SCHEMA || value.authorizing !== false
    || value.profileId !== PROFILE.profileId || value.profileDigest !== sha256Canonical(PROFILE.schema, PROFILE)
    || !digest(value.frameSha256) || !digest(value.runId) || !digest(value.subjectDigest)
    || !digest(value.worksetQueryDigest) || value.candidate.candidateState !== 'NOT_AUTHORED'
    || !NODE_ID.test(value.candidate.nodeId) || typeof value.candidate.sourceLocator !== 'string'
    || !digest(value.candidate.sourceRawSha256) || !Array.isArray(value.requiredEvidenceViews)
    || !equalJson(value.requiredEvidenceViews, EVIDENCE_VIEWS)) refuse('CLAIM');
  selfDigest(value, 'claimDigest');
  return value;
}

function buildQuery({ frameSha256, runId, subjectDigest, seedNodeIds }) {
  const value = {
    schema: QUERY_SCHEMA, profileId: PROFILE.profileId,
    profileDigest: sha256Canonical(PROFILE.schema, PROFILE), frameSha256, runId, subjectDigest,
    seedNodeIds: [...seedNodeIds], relationshipKinds: [...RELATIONSHIP_KINDS], authorizing: false,
  };
  return Object.freeze({ ...value, queryDigest: digestBody(QUERY_SCHEMA, { ...value, queryDigest: null }, 'queryDigest') });
}

export function buildLocalWorksetQuery(options) {
  exactRecord(options, ['frameSha256', 'runId', 'seedNodeIds', 'subjectDigest']);
  const value = buildQuery(options);
  return queryBody(value);
}

export function buildLocalTask6Claim(options) {
  exactRecord(options, ['candidate', 'frameSha256', 'runId', 'subjectDigest', 'worksetQueryDigest']);
  const value = {
    schema: CLAIM_SCHEMA, profileId: PROFILE.profileId,
    profileDigest: sha256Canonical(PROFILE.schema, PROFILE), frameSha256: options.frameSha256,
    runId: options.runId, subjectDigest: options.subjectDigest,
    worksetQueryDigest: options.worksetQueryDigest, candidate: options.candidate,
    requiredEvidenceViews: [...EVIDENCE_VIEWS], authorizing: false,
  };
  const claim = { ...value, claimDigest: digestBody(CLAIM_SCHEMA, { ...value, claimDigest: null }, 'claimDigest') };
  return claimBody(claim);
}

function deriveProjection(project, query, bindings) {
  const selected = new Set(query.seedNodeIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of project.edges) {
      if (!query.relationshipKinds.includes(edge.kind)) continue;
      if (selected.has(edge.from) && !selected.has(edge.to)) { selected.add(edge.to); changed = true; }
      if (selected.has(edge.to) && !selected.has(edge.from)) { selected.add(edge.from); changed = true; }
    }
  }
  const nodeIds = [...selected].sort();
  const edgeIds = project.edges
    .filter((edge) => selected.has(edge.from) && selected.has(edge.to) && query.relationshipKinds.includes(edge.kind))
    .map((edge) => edge.id).sort();
  const projection = {
    schema: PROJECTION_SCHEMA,
    subjectDigest: bindings.subjectDigest,
    profileId: PROFILE.profileId,
    profileDigest: bindings.profileDigest,
    frameSha256: bindings.frameSha256,
    runId: bindings.runId,
    worksetQueryDigest: query.queryDigest,
    nodeIds,
    edgeIds,
    graphDigest: sha256Canonical('galerina.logic-aig-local-graph.v1', { nodes: project.nodes, edges: project.edges }),
    authorizing: false,
  };
  return { projection, nodeIds };
}

export function admitLocalSourceOrigin(options) {
  exactRecord(options, ['claim', 'frame', 'profile', 'query']);
  const profileDigest = profileBinding(options.profile);
  const inspected = inspectLocalAdmissionFrame(options.frame, options.profile);
  const bindings = {
    subjectDigest: inspected.manifest.subjectDigest,
    profileId: PROFILE.profileId,
    profileDigest,
    frameSha256: inspected.receipt.frameSha256,
    runId: inspected.manifest.runId,
    worksetQueryDigest: null,
  };
  const query = queryBody(options.query);
  const claim = claimBody(options.claim);
  if (!equalJson({ ...query, queryDigest: query.queryDigest }, options.query)
    || query.subjectDigest !== bindings.subjectDigest || query.frameSha256 !== bindings.frameSha256
    || query.runId !== bindings.runId || claim.subjectDigest !== bindings.subjectDigest
    || claim.frameSha256 !== bindings.frameSha256 || claim.runId !== bindings.runId
    || claim.worksetQueryDigest !== query.queryDigest || claim.profileDigest !== bindings.profileDigest) refuse('BINDING');
  bindings.worksetQueryDigest = query.queryDigest;
  bindings.task6ClaimDigest = claim.claimDigest;
  const project = artifactValue(inspected, 'project');
  const source = artifactValue(inspected, 'source-manifest');
  const projectNodeIds = new Set(project.nodes.map((node) => node.id));
  if (query.seedNodeIds.some((nodeId) => !projectNodeIds.has(nodeId))) refuse('QUERY');
  const candidate = project.nodes.find((node) => node.id === claim.candidate.nodeId);
  if (!candidate || candidate.locator !== claim.candidate.sourceLocator || candidate.digest !== claim.candidate.sourceRawSha256) refuse('CLAIM');
  const { projection, nodeIds } = deriveProjection(project, query, bindings);
  if (!nodeIds.includes(candidate.id)) refuse('CLAIM');
  const applicable = project.unresolved.filter((row) => nodeIds.includes(row.sourceNodeId));
  const applicableUnresolvedRowsDigest = sha256Canonical('galerina.logic-aig-local-applicable-unresolved.v1', applicable);
  const obligationBody = {
    schema: OBLIGATION_SCHEMA,
    subjectDigest: bindings.subjectDigest,
    profileId: PROFILE.profileId,
    profileDigest: bindings.profileDigest,
    frameSha256: bindings.frameSha256,
    runId: bindings.runId,
    worksetQueryDigest: query.queryDigest,
    task6ClaimDigest: claim.claimDigest,
    worksetProjectionDigest: sha256Canonical(PROJECTION_SCHEMA, projection),
    worksetNodeSetDigest: sha256Canonical('galerina.logic-aig-local-workset-node-set.v1', nodeIds),
    applicableUnresolvedCount: applicable.length,
    applicableUnresolvedRowsDigest,
    status: applicable.length === 0 ? 'ZERO_APPLICABLE' : 'HOLD',
    candidateState: claim.candidate.candidateState,
    authorizing: false,
  };
  const obligation = { ...obligationBody, obligationDigest: digestBody(OBLIGATION_SCHEMA, { ...obligationBody, obligationDigest: null }, 'obligationDigest') };
  const resultBody = {
    schema: RESULT_SCHEMA,
    status: applicable.length === 0 ? 'LOCAL_VERIFIED' : 'HOLD',
    reason: applicable.length === 0 ? null : 'APPLICABLE_UNRESOLVED',
    provenance: 'COOPERATIVE_LOCAL',
    authorizing: false,
    authentication: 'NONE',
    executionBoundary: 'COOPERATIVE_LOCAL_SAME_USER',
    bindings,
    worksetProjection: projection,
    worksetProjectionDigest: sha256Canonical(PROJECTION_SCHEMA, projection),
    task6Obligation: obligation,
    task6ObligationDigest: obligation.obligationDigest,
  };
  const result = Object.freeze({ ...resultBody, resultDigest: digestBody(RESULT_SCHEMA, { ...resultBody, resultDigest: null }, 'resultDigest') });
  const gateway = deepFreeze({ result, project, source, query, claim });
  ADMITTED_GATEWAYS.add(gateway);
  return gateway;
}

export function buildLocalTask6SelectionReport({ gateway, candidate }) {
  if (!ADMITTED_GATEWAYS.has(gateway)) refuse('SELECTION');
  exactRecord(gateway, ['claim', 'project', 'query', 'result', 'source']);
  exactRecord(candidate, ['candidateState', 'nodeId', 'sourceLocator', 'sourceRawSha256']);
  const query = queryBody(gateway.query);
  const claim = claimBody(gateway.claim);
  const result = gateway.result;
  exactRecord(result, [
    'authentication', 'authorizing', 'bindings', 'executionBoundary', 'provenance', 'reason',
    'resultDigest', 'schema', 'status', 'task6Obligation', 'task6ObligationDigest',
    'worksetProjection', 'worksetProjectionDigest',
  ]);
  if (result.schema !== RESULT_SCHEMA || result.authorizing !== false
    || result.authentication !== 'NONE' || result.executionBoundary !== 'COOPERATIVE_LOCAL_SAME_USER'
    || result.provenance !== 'COOPERATIVE_LOCAL' || result.status !== 'LOCAL_VERIFIED' || result.reason !== null) refuse('SELECTION');
  exactRecord(result.bindings, ['frameSha256', 'profileDigest', 'profileId', 'runId', 'subjectDigest', 'task6ClaimDigest', 'worksetQueryDigest']);
  if (result.bindings.profileId !== PROFILE.profileId || result.bindings.profileDigest !== sha256Canonical(PROFILE.schema, PROFILE)
    || result.bindings.task6ClaimDigest !== claim.claimDigest || result.bindings.worksetQueryDigest !== query.queryDigest) refuse('SELECTION');
  exactRecord(result.worksetProjection, ['authorizing', 'edgeIds', 'frameSha256', 'graphDigest', 'nodeIds', 'profileDigest', 'profileId', 'runId', 'schema', 'subjectDigest', 'worksetQueryDigest']);
  if (result.worksetProjection.schema !== PROJECTION_SCHEMA || result.worksetProjection.authorizing !== false
    || result.worksetProjectionDigest !== digestBody(PROJECTION_SCHEMA, result.worksetProjection)) refuse('SELECTION');
  exactRecord(result.task6Obligation, [
    'applicableUnresolvedCount', 'applicableUnresolvedRowsDigest', 'authorizing', 'candidateState',
    'frameSha256', 'obligationDigest', 'profileDigest', 'profileId', 'runId', 'schema', 'status',
    'subjectDigest', 'worksetNodeSetDigest', 'worksetProjectionDigest', 'worksetQueryDigest', 'task6ClaimDigest',
  ]);
  if (result.task6Obligation.schema !== OBLIGATION_SCHEMA || result.task6Obligation.authorizing !== false
    || result.task6ObligationDigest !== result.task6Obligation.obligationDigest
    || result.task6ObligationDigest !== digestBody(OBLIGATION_SCHEMA, result.task6Obligation, 'obligationDigest')) refuse('SELECTION');
  if (result.resultDigest !== digestBody(RESULT_SCHEMA, result, 'resultDigest')) refuse('SELECTION');
  if (result.status !== 'LOCAL_VERIFIED' || result.task6Obligation.status !== 'ZERO_APPLICABLE'
    || candidate.candidateState !== 'NOT_AUTHORED' || !equalJson(candidate, claim.candidate)) refuse('SELECTION');
  const body = {
    schema: SELECTION_SCHEMA,
    subjectDigest: result.bindings.subjectDigest,
    profileId: result.bindings.profileId,
    profileDigest: result.bindings.profileDigest,
    frameSha256: result.bindings.frameSha256,
    runId: result.bindings.runId,
    worksetQueryDigest: result.bindings.worksetQueryDigest,
    task6ClaimDigest: gateway.claim.claimDigest,
    gatewayResultDigest: result.resultDigest,
    task6ObligationDigest: result.task6ObligationDigest,
    candidate,
    candidateState: candidate.candidateState,
    requiredEvidenceViews: [...EVIDENCE_VIEWS],
    status: 'ZERO_APPLICABLE',
    authorizing: false,
  };
  return Object.freeze({ ...body, selectionDigest: digestBody(SELECTION_SCHEMA, { ...body, selectionDigest: null }, 'selectionDigest') });
}
