import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  buildAdmissionManifest,
  canonicalArtifactAdmissionJson,
  encodeAdmissionFrame,
} from '../lib/logic-aig-source-origin/artifact-frame.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const KAT_A_BODY = Buffer.from('00ff', 'hex');
const KAT_A_BODY_SHA256 = '06eb7d6a69ee19e5fbdf749018d3d2abfa04bcbd1365db312eb86dc7169389b8';
const KAT_A_PROFILE_SHA256 = 'b47975c92ecc23f3c2e810d3b4b96f59481cda0d4c5293b12070a627839a4f3b';
const KAT_A_FRAME_SHA256 = 'acabbc82905fa66697645fbdd2dfb5715a24c45e8a16ba8f5573e55ca5fb2a4b';
const RUN_ID = '3'.repeat(64);

const KAT_A_PROFILE_JSON = '{"artifactRules":[{"id":"root","maxBytes":2,"required":true,"role":"root"}],"authorizing":false,"ownerPolicy":{"mode":"none"},"profileId":"kat.none","rootArtifactId":"root","runBinding":"manifest-artifact-row-equality.v1","schema":"artifact-admission-profile.v1","subjectRules":{"gitObjectFormat":"sha1","repositoryId":"fixture-repo"},"supportedClaims":["captured-bytes-only"],"unsupportedClaims":["path-identity.no-reparse","path-identity.posix-device-inode","path-identity.single-hard-link","path-identity.windows-file-id"]}';
const KAT_A_MANIFEST_JSON = '{"artifacts":[{"byteLength":2,"id":"root","required":true,"role":"root","runId":"3333333333333333333333333333333333333333333333333333333333333333","sha256":"06eb7d6a69ee19e5fbdf749018d3d2abfa04bcbd1365db312eb86dc7169389b8"}],"authorizing":false,"claims":["captured-bytes-only"],"graph":{"edges":[],"nodes":["root"],"root":"root","schema":"artifact-admission-graph.v1"},"ownerRecord":null,"profileDigest":"b47975c92ecc23f3c2e810d3b4b96f59481cda0d4c5293b12070a627839a4f3b","profileId":"kat.none","runId":"3333333333333333333333333333333333333333333333333333333333333333","schema":"artifact-admission-manifest.v1","subject":{"commitOid":"1111111111111111111111111111111111111111","gitObjectFormat":"sha1","repositoryId":"fixture-repo","treeOid":"2222222222222222222222222222222222222222"}}';
const KAT_A_FRAME_HEX = '4741414601000003127b22617274696661637473223a5b7b22627974654c656e677468223a322c226964223a22726f6f74222c227265717569726564223a747275652c22726f6c65223a22726f6f74222c2272756e4964223a2233333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333222c22736861323536223a2230366562376436613639656531396535666264663734393031386433643261626661303462636264313336356462333132656238366463373136393338396238227d5d2c22617574686f72697a696e67223a66616c73652c22636c61696d73223a5b2263617074757265642d62797465732d6f6e6c79225d2c226772617068223a7b226564676573223a5b5d2c226e6f646573223a5b22726f6f74225d2c22726f6f74223a22726f6f74222c22736368656d61223a2261727469666163742d61646d697373696f6e2d67726170682e7631227d2c226f776e65725265636f7264223a6e756c6c2c2270726f66696c65446967657374223a2262343739373563393265636332336633633265383130643362346239366635393438316364613064346335323933623132303730613632373833396134663362222c2270726f66696c654964223a226b61742e6e6f6e65222c2272756e4964223a2233333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333222c22736368656d61223a2261727469666163742d61646d697373696f6e2d6d616e69666573742e7631222c227375626a656374223a7b22636f6d6d69744f6964223a2231313131313131313131313131313131313131313131313131313131313131313131313131313131222c226769744f626a656374466f726d6174223a2273686131222c227265706f7369746f72794964223a22666978747572652d7265706f222c22747265654f6964223a2232323232323232323232323232323232323232323232323232323232323232323232323232323232227d7d00010004726f6f74000000000000000200ff';

const KAT_B_PROFILE_JSON = '{"artifactRules":[{"id":"root","maxBytes":2,"required":true,"role":"root"}],"authorizing":false,"ownerPolicy":{"algorithm":"Ed25519","keyId":"kat-owner","mode":"ed25519","publicKeySha256":"06e3fd8fda29bb60ab59557de61edb0aecdb231134be30e75b455f8e1b792fa9","publicKeySpkiDerHex":"302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"},"profileId":"kat.ed25519","rootArtifactId":"root","runBinding":"manifest-artifact-row-equality.v1","schema":"artifact-admission-profile.v1","subjectRules":{"gitObjectFormat":"sha1","repositoryId":"fixture-repo"},"supportedClaims":["captured-bytes-only"],"unsupportedClaims":["path-identity.no-reparse","path-identity.posix-device-inode","path-identity.single-hard-link","path-identity.windows-file-id"]}';
const KAT_B_PROFILE_SHA256 = '1cc0644b6c3c98750a9317013ca4ee9dfe3b11ead0763c5fbc32664b0a7960f4';
const KAT_B_UNSIGNED_MANIFEST_JSON = '{"artifacts":[{"byteLength":2,"id":"root","required":true,"role":"root","runId":"3333333333333333333333333333333333333333333333333333333333333333","sha256":"06eb7d6a69ee19e5fbdf749018d3d2abfa04bcbd1365db312eb86dc7169389b8"}],"authorizing":false,"claims":["captured-bytes-only"],"graph":{"edges":[],"nodes":["root"],"root":"root","schema":"artifact-admission-graph.v1"},"ownerRecord":null,"profileDigest":"1cc0644b6c3c98750a9317013ca4ee9dfe3b11ead0763c5fbc32664b0a7960f4","profileId":"kat.ed25519","runId":"3333333333333333333333333333333333333333333333333333333333333333","schema":"artifact-admission-manifest.v1","subject":{"commitOid":"1111111111111111111111111111111111111111","gitObjectFormat":"sha1","repositoryId":"fixture-repo","treeOid":"2222222222222222222222222222222222222222"}}';
const KAT_B_PREIMAGE_HEX = '61727469666163742d61646d697373696f6e2d6f776e65722d7061796c6f61642e763100000003157b22617274696661637473223a5b7b22627974654c656e677468223a322c226964223a22726f6f74222c227265717569726564223a747275652c22726f6c65223a22726f6f74222c2272756e4964223a2233333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333222c22736861323536223a2230366562376436613639656531396535666264663734393031386433643261626661303462636264313336356462333132656238366463373136393338396238227d5d2c22617574686f72697a696e67223a66616c73652c22636c61696d73223a5b2263617074757265642d62797465732d6f6e6c79225d2c226772617068223a7b226564676573223a5b5d2c226e6f646573223a5b22726f6f74225d2c22726f6f74223a22726f6f74222c22736368656d61223a2261727469666163742d61646d697373696f6e2d67726170682e7631227d2c226f776e65725265636f7264223a6e756c6c2c2270726f66696c65446967657374223a2231636330363434623663336339383735306139333137303133636134656539646665336231316561643037363363356662633332363634623061373936306634222c2270726f66696c654964223a226b61742e65643235353139222c2272756e4964223a2233333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333222c22736368656d61223a2261727469666163742d61646d697373696f6e2d6d616e69666573742e7631222c227375626a656374223a7b22636f6d6d69744f6964223a2231313131313131313131313131313131313131313131313131313131313131313131313131313131222c226769744f626a656374466f726d6174223a2273686131222c227265706f7369746f72794964223a22666978747572652d7265706f222c22747265654f6964223a2232323232323232323232323232323232323232323232323232323232323232323232323232323232227d7d00010004726f6f74000000000000000206eb7d6a69ee19e5fbdf749018d3d2abfa04bcbd1365db312eb86dc7169389b8';
const KAT_B_PAYLOAD_SHA256 = '5e284110af6b381bcd97bf224f25a65a0674ae585bf37f43def62563a2e8b0c1';
const KAT_B_SIGNATURE = '9f8c4ffee6d810fea60e61e7f66fe9edf7cf1b9490d72856c315c8f36e0d09e2ffa68fac038f73e6a093d316ff6925c92541acfd29d90092112e757c86e07a0e';
const KAT_B_MANIFEST_SHA256 = 'ac7304a4de3623f099ac28bb583e0b4732708ea3561e498e058d0c845888b429';
const KAT_B_FRAME_SHA256 = 'bc71ac2b95ad08733da23a74f6c08e5a25e95e8814942f27c49c14307467d130';

const SUBJECT = Object.freeze({
  repositoryId: 'fixture-repo',
  gitObjectFormat: 'sha1',
  commitOid: '1'.repeat(40),
  treeOid: '2'.repeat(40),
});
const ROOT_GRAPH = Object.freeze({
  schema: 'artifact-admission-graph.v1',
  root: 'root',
  nodes: ['root'],
  edges: [],
});
const CLAIMS = Object.freeze(['captured-bytes-only']);

function katAInputs(overrides = {}) {
  return {
    profile: JSON.parse(KAT_A_PROFILE_JSON),
    subject: { ...SUBJECT },
    runId: RUN_ID,
    artifacts: [{ id: 'root', bytes: Buffer.from(KAT_A_BODY) }],
    graph: { ...ROOT_GRAPH, nodes: [...ROOT_GRAPH.nodes], edges: [] },
    claims: [...CLAIMS],
    ownerRecord: null,
    ...overrides,
  };
}

function katBOwnerRecord(overrides = {}) {
  return {
    algorithm: 'Ed25519',
    keyId: 'kat-owner',
    publicKeySha256: '06e3fd8fda29bb60ab59557de61edb0aecdb231134be30e75b455f8e1b792fa9',
    signedPayloadSha256: KAT_B_PAYLOAD_SHA256,
    signature: KAT_B_SIGNATURE,
    ...overrides,
  };
}

function expectRefusal(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error?.code, code);
    return true;
  });
}

function u16(value) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16BE(value);
  return bytes;
}

function u32(value) {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes;
}

function u64(value) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(value));
  return bytes;
}

test('canonical JSON emits exact scalar bytes and unsigned UTF-8 key order', () => {
  const value = { z: 0, '\u0080': 'é', a: '\u0000\n"\\/', nested: [true, false, null, 12] };
  const expected = Buffer.from('{"a":"\\u0000\\u000a\\"\\\\/","nested":[true,false,null,12],"z":0,"\u0080":"é"}', 'utf8');
  assert.deepEqual(canonicalArtifactAdmissionJson(value), expected);

  for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, undefined, 1n, '\ud800']) {
    expectRefusal(() => canonicalArtifactAdmissionJson(invalid), 'REFUSED_CANONICAL');
  }
  expectRefusal(() => canonicalArtifactAdmissionJson(Object.defineProperty({}, 'a', { get: () => 1 })), 'REFUSED_CANONICAL');
  const symbolArray = [1];
  Object.defineProperty(symbolArray, Symbol('hostile'), { value: true });
  expectRefusal(() => canonicalArtifactAdmissionJson(symbolArray), 'REFUSED_CANONICAL');
});

test('KAT-A profile, manifest and complete frame match the literal design bytes', () => {
  assert.equal(Buffer.byteLength(KAT_A_PROFILE_JSON), 526);
  assert.equal(sha256(Buffer.from(KAT_A_PROFILE_JSON)), KAT_A_PROFILE_SHA256);
  assert.equal(Buffer.byteLength(KAT_A_MANIFEST_JSON), 786);
  assert.equal(sha256(Buffer.from(KAT_A_MANIFEST_JSON)), '21f08b0746ad1102412d62c917eae4c1ba6eb0e58dfff04ac7cb10239514c187');
  assert.equal(sha256(KAT_A_BODY), KAT_A_BODY_SHA256);

  const manifest = buildAdmissionManifest(katAInputs());
  const manifestBytes = canonicalArtifactAdmissionJson(manifest);
  assert.equal(manifestBytes.toString('utf8'), KAT_A_MANIFEST_JSON);

  const frame = encodeAdmissionFrame({ manifest, artifacts: katAInputs().artifacts });
  const literalFrame = Buffer.from(KAT_A_FRAME_HEX, 'hex');
  assert.equal(literalFrame.length, 813);
  assert.equal(sha256(literalFrame), KAT_A_FRAME_SHA256);
  assert.deepEqual(frame, literalFrame);
});

test('KAT-B exact public profile, signed preimage, signature, manifest and frame', () => {
  assert.equal(Buffer.byteLength(KAT_B_PROFILE_JSON), 772);
  assert.equal(sha256(Buffer.from(KAT_B_PROFILE_JSON)), KAT_B_PROFILE_SHA256);
  assert.equal(Buffer.byteLength(KAT_B_UNSIGNED_MANIFEST_JSON), 789);
  assert.equal(sha256(Buffer.from(KAT_B_UNSIGNED_MANIFEST_JSON)), '2103c91669b4581ce9d9ad06a2b6a6b63d030c6387df69aacb9615a974778757');

  const id = Buffer.from('root');
  const independentlyBuiltPreimage = Buffer.concat([
    Buffer.from('artifact-admission-owner-payload.v1\0', 'ascii'),
    u32(Buffer.byteLength(KAT_B_UNSIGNED_MANIFEST_JSON)),
    Buffer.from(KAT_B_UNSIGNED_MANIFEST_JSON),
    u16(1),
    u16(id.length),
    id,
    u64(2),
    Buffer.from(KAT_A_BODY_SHA256, 'hex'),
  ]);
  assert.equal(independentlyBuiltPreimage.length, 877);
  assert.equal(independentlyBuiltPreimage.toString('hex'), KAT_B_PREIMAGE_HEX);
  assert.equal(sha256(independentlyBuiltPreimage), KAT_B_PAYLOAD_SHA256);
  assert.equal(KAT_B_SIGNATURE.length, 128);

  const manifest = buildAdmissionManifest(katAInputs({
    profile: JSON.parse(KAT_B_PROFILE_JSON),
    ownerRecord: katBOwnerRecord(),
  }));
  const manifestBytes = canonicalArtifactAdmissionJson(manifest);
  assert.equal(manifestBytes.length, 1145);
  assert.equal(sha256(manifestBytes), KAT_B_MANIFEST_SHA256);

  const frame = encodeAdmissionFrame({ manifest, artifacts: katAInputs().artifacts });
  assert.equal(frame.length, 1172);
  assert.equal(sha256(frame), KAT_B_FRAME_SHA256);
});

test('profile, subject, artifact and frame inputs are closed and bounded', () => {
  const surplusProfile = katAInputs();
  surplusProfile.profile.surplus = true;
  expectRefusal(() => buildAdmissionManifest(surplusProfile), 'REFUSED_PROFILE');

  const wrongSubject = katAInputs({ subject: { ...SUBJECT, repositoryId: 'other-repo' } });
  expectRefusal(() => buildAdmissionManifest(wrongSubject), 'REFUSED_PROFILE');

  const missingArtifact = katAInputs({ artifacts: [] });
  expectRefusal(() => buildAdmissionManifest(missingArtifact), 'REFUSED_ARTIFACT');

  const duplicateArtifact = katAInputs({ artifacts: [
    { id: 'root', bytes: KAT_A_BODY },
    { id: 'root', bytes: KAT_A_BODY },
  ] });
  expectRefusal(() => buildAdmissionManifest(duplicateArtifact), 'REFUSED_ARTIFACT');

  const tooLarge = katAInputs({ artifacts: [{ id: 'root', bytes: Buffer.from('00ff00', 'hex') }] });
  expectRefusal(() => buildAdmissionManifest(tooLarge), 'REFUSED_ARTIFACT');

  const manifest = buildAdmissionManifest(katAInputs());
  expectRefusal(
    () => encodeAdmissionFrame({ manifest, artifacts: [{ id: 'root', bytes: Buffer.from('00fe', 'hex') }] }),
    'REFUSED_ARTIFACT_DIGEST',
  );
  expectRefusal(
    () => encodeAdmissionFrame({ manifest, artifacts: [{ id: 'root', bytes: KAT_A_BODY, surplus: true }] }),
    'REFUSED_ARTIFACT',
  );
});

test('captured artifact bytes bind length, digest and later caller mutation', () => {
  const sourceBody = Buffer.from(KAT_A_BODY);
  const manifest = buildAdmissionManifest(katAInputs({ artifacts: [{ id: 'root', bytes: sourceBody }] }));
  sourceBody[1] = 0xfe;
  expectRefusal(
    () => encodeAdmissionFrame({ manifest, artifacts: [{ id: 'root', bytes: sourceBody }] }),
    'REFUSED_ARTIFACT_DIGEST',
  );

  const freshBody = Buffer.from(KAT_A_BODY);
  const frame = encodeAdmissionFrame({ manifest, artifacts: [{ id: 'root', bytes: freshBody }] });
  freshBody.fill(0);
  assert.equal(frame.subarray(-2).toString('hex'), '00ff');
});

test('run binding, graph closure and byte-order sorting fail closed', () => {
  const manifest = buildAdmissionManifest(katAInputs());
  const wrongRun = structuredClone(manifest);
  wrongRun.artifacts[0].runId = '4'.repeat(64);
  expectRefusal(() => encodeAdmissionFrame({ manifest: wrongRun, artifacts: katAInputs().artifacts }), 'REFUSED_RUN_BINDING');

  const twoRuleProfile = JSON.parse(KAT_A_PROFILE_JSON);
  twoRuleProfile.artifactRules.push({ id: 'z-leaf', maxBytes: 1, required: false, role: 'leaf' });
  const disconnected = katAInputs({
    profile: twoRuleProfile,
    artifacts: [
      { id: 'z-leaf', bytes: Buffer.from([1]) },
      { id: 'root', bytes: KAT_A_BODY },
    ],
    graph: {
      schema: 'artifact-admission-graph.v1',
      root: 'root',
      nodes: ['root', 'z-leaf'],
      edges: [],
    },
  });
  expectRefusal(() => buildAdmissionManifest(disconnected), 'REFUSED_GRAPH_CLOSURE');

  const unsortedGraph = katAInputs({
    profile: twoRuleProfile,
    artifacts: [
      { id: 'root', bytes: KAT_A_BODY },
      { id: 'z-leaf', bytes: Buffer.from([1]) },
    ],
    graph: {
      schema: 'artifact-admission-graph.v1',
      root: 'root',
      nodes: ['z-leaf', 'root'],
      edges: [{ from: 'root', kind: 'requires', to: 'z-leaf' }],
    },
  });
  expectRefusal(() => buildAdmissionManifest(unsortedGraph), 'REFUSED_GRAPH_CLOSURE');
});

test('unsupported and unknown claims retain their distinct refusal identities', () => {
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({ claims: ['path-identity.windows-file-id'] })),
    'REFUSED_UNSUPPORTED_CLAIM',
  );
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({ claims: ['captured-bytes-only', 'unknown-claim'] })),
    'REFUSED_CLAIM',
  );
});

test('owner record is closed, payload-bound and verified only with the profile public key', () => {
  const profile = JSON.parse(KAT_B_PROFILE_JSON);
  const badNibble = `${KAT_B_SIGNATURE.slice(0, -1)}${KAT_B_SIGNATURE.endsWith('0') ? '1' : '0'}`;
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({ profile, ownerRecord: katBOwnerRecord({ signature: badNibble }) })),
    'REFUSED_OWNER_RECORD',
  );
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({
      profile,
      ownerRecord: { ...katBOwnerRecord(), surplus: true },
    })),
    'REFUSED_OWNER_RECORD',
  );

  const replacedKeyProfile = JSON.parse(KAT_B_PROFILE_JSON);
  replacedKeyProfile.ownerPolicy.publicKeySpkiDerHex = `${replacedKeyProfile.ownerPolicy.publicKeySpkiDerHex.slice(0, -2)}00`;
  replacedKeyProfile.ownerPolicy.publicKeySha256 = sha256(Buffer.from(replacedKeyProfile.ownerPolicy.publicKeySpkiDerHex, 'hex'));
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({ profile: replacedKeyProfile, ownerRecord: katBOwnerRecord({
      publicKeySha256: replacedKeyProfile.ownerPolicy.publicKeySha256,
    }) })),
    'REFUSED_OWNER_RECORD',
  );
});

test('encoder emits fixed syntax and canonical manifest bytes with no trailing data', () => {
  const manifest = buildAdmissionManifest(katAInputs());
  const frame = encodeAdmissionFrame({ manifest, artifacts: katAInputs().artifacts });
  assert.equal(frame.subarray(0, 4).toString('ascii'), 'GAAF');
  assert.equal(frame[4], 1);
  assert.equal(frame.readUInt32BE(5), Buffer.byteLength(KAT_A_MANIFEST_JSON));
  assert.equal(frame.subarray(9, 9 + Buffer.byteLength(KAT_A_MANIFEST_JSON)).toString('utf8'), KAT_A_MANIFEST_JSON);
  assert.equal(frame.length, 813);
  assert.equal(frame.at(-1), 0xff);
});

test('hostile proxies refuse before caller code can run and deep canonical input is typed', () => {
  let calls = 0;
  const hostile = new Proxy({}, {
    get() {
      calls += 1;
      throw new Error('caller get ran');
    },
    getOwnPropertyDescriptor() {
      calls += 1;
      throw new Error('caller descriptor ran');
    },
    getPrototypeOf() {
      calls += 1;
      throw new Error('caller prototype ran');
    },
    ownKeys() {
      calls += 1;
      throw new Error('caller ownKeys ran');
    },
  });

  expectRefusal(() => buildAdmissionManifest(hostile), 'REFUSED_PROFILE');
  expectRefusal(() => buildAdmissionManifest(katAInputs({ profile: hostile })), 'REFUSED_PROFILE');
  expectRefusal(() => encodeAdmissionFrame(hostile), 'REFUSED_MANIFEST');
  assert.equal(calls, 0);

  let nestedCalls = 0;
  const nestedHandler = {
    get() {
      nestedCalls += 1;
      throw new Error('nested get ran');
    },
    getOwnPropertyDescriptor() {
      nestedCalls += 1;
      throw new Error('nested descriptor ran');
    },
    getPrototypeOf() {
      nestedCalls += 1;
      throw new Error('nested prototype ran');
    },
    ownKeys() {
      nestedCalls += 1;
      throw new Error('nested keys ran');
    },
  };
  const rulesProxy = katAInputs();
  rulesProxy.profile.artifactRules = new Proxy(rulesProxy.profile.artifactRules, nestedHandler);
  expectRefusal(() => buildAdmissionManifest(rulesProxy), 'REFUSED_PROFILE');

  const policyProxy = katAInputs();
  policyProxy.profile.ownerPolicy = new Proxy(policyProxy.profile.ownerPolicy, nestedHandler);
  expectRefusal(() => buildAdmissionManifest(policyProxy), 'REFUSED_PROFILE');

  const graphProxy = katAInputs();
  graphProxy.graph.nodes = new Proxy(graphProxy.graph.nodes, nestedHandler);
  expectRefusal(() => buildAdmissionManifest(graphProxy), 'REFUSED_GRAPH_CLOSURE');

  const artifactsProxy = katAInputs();
  artifactsProxy.artifacts = new Proxy(artifactsProxy.artifacts, nestedHandler);
  expectRefusal(() => buildAdmissionManifest(artifactsProxy), 'REFUSED_ARTIFACT');

  const claimsProxy = katAInputs();
  claimsProxy.claims = new Proxy(claimsProxy.claims, nestedHandler);
  expectRefusal(() => buildAdmissionManifest(claimsProxy), 'REFUSED_CLAIM');

  const proxiedManifestGraph = buildAdmissionManifest(katAInputs());
  proxiedManifestGraph.graph = new Proxy(proxiedManifestGraph.graph, nestedHandler);
  expectRefusal(
    () => encodeAdmissionFrame({ manifest: proxiedManifestGraph, artifacts: katAInputs().artifacts }),
    'REFUSED_GRAPH_CLOSURE',
  );
  assert.equal(nestedCalls, 0);

  let nested = null;
  for (let index = 0; index < 256; index += 1) nested = [nested];
  expectRefusal(() => canonicalArtifactAdmissionJson(nested), 'REFUSED_CANONICAL');
});

test('aggregate frame limit refuses from manifest arithmetic before artifact access or copying', () => {
  const manifest = buildAdmissionManifest(katAInputs());
  const oversized = structuredClone(manifest);
  oversized.artifacts = ['a', 'b', 'root'].map((id) => ({
    byteLength: 50_000_000,
    id,
    required: true,
    role: id,
    runId: RUN_ID,
    sha256: '0'.repeat(64),
  }));
  oversized.graph = {
    schema: 'artifact-admission-graph.v1',
    root: 'root',
    nodes: ['a', 'b', 'root'],
    edges: [
      { from: 'root', kind: 'requires', to: 'a' },
      { from: 'root', kind: 'requires', to: 'b' },
    ],
  };

  let calls = 0;
  const body = new Proxy({}, {
    get() {
      calls += 1;
      throw new Error('body accessed');
    },
    getOwnPropertyDescriptor() {
      calls += 1;
      throw new Error('body descriptor accessed');
    },
    getPrototypeOf() {
      calls += 1;
      throw new Error('body prototype accessed');
    },
    ownKeys() {
      calls += 1;
      throw new Error('body keys accessed');
    },
  });
  expectRefusal(
    () => encodeAdmissionFrame({ manifest: oversized, artifacts: [body, body, body] }),
    'REFUSED_FRAME_LIMIT',
  );
  assert.equal(calls, 0);
});

test('owner policy and caller arrays refuse hostile descriptor shapes without executing caller code', () => {
  let calls = 0;
  const ownerPolicy = {};
  Object.defineProperty(ownerPolicy, 'mode', {
    enumerable: true,
    get() {
      calls += 1;
      throw new Error('owner policy getter ran');
    },
  });
  const policyInput = katAInputs();
  policyInput.profile.ownerPolicy = ownerPolicy;
  expectRefusal(() => buildAdmissionManifest(policyInput), 'REFUSED_PROFILE');

  const customIterator = [{ id: 'root', maxBytes: 2, required: true, role: 'root' }];
  Object.defineProperty(customIterator, Symbol.iterator, {
    get() {
      calls += 1;
      throw new Error('array iterator getter ran');
    },
  });
  const iteratorInput = katAInputs();
  iteratorInput.profile.artifactRules = customIterator;
  expectRefusal(() => buildAdmissionManifest(iteratorInput), 'REFUSED_PROFILE');

  const customMethod = ['captured-bytes-only'];
  Object.defineProperty(customMethod, 'some', {
    enumerable: true,
    get() {
      calls += 1;
      throw new Error('array method getter ran');
    },
  });
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({ claims: customMethod })),
    'REFUSED_CLAIM',
  );

  const sparseNodes = new Array(1);
  const sparseInput = katAInputs();
  sparseInput.graph.nodes = sparseNodes;
  expectRefusal(() => buildAdmissionManifest(sparseInput), 'REFUSED_GRAPH_CLOSURE');

  const accessorEdges = [];
  Object.defineProperty(accessorEdges, '0', {
    enumerable: true,
    configurable: true,
    get() {
      calls += 1;
      throw new Error('array element getter ran');
    },
  });
  accessorEdges.length = 1;
  const accessorInput = katAInputs();
  accessorInput.graph.edges = accessorEdges;
  expectRefusal(() => buildAdmissionManifest(accessorInput), 'REFUSED_GRAPH_CLOSURE');

  const symbolArtifacts = [{ id: 'root', bytes: Buffer.from(KAT_A_BODY) }];
  Object.defineProperty(symbolArtifacts, Symbol('hostile'), { value: true });
  expectRefusal(
    () => buildAdmissionManifest(katAInputs({ artifacts: symbolArtifacts })),
    'REFUSED_ARTIFACT',
  );
  assert.equal(calls, 0);
});

test('intrinsic Buffer extents and complete preflight refuse without executing caller coercion', () => {
  let calls = 0;
  const smallerLength = Buffer.from(KAT_A_BODY);
    Object.defineProperty(smallerLength, 'length', { value: 1 });
    expectRefusal(
      () => buildAdmissionManifest(katAInputs({ artifacts: [{ id: 'root', bytes: smallerLength }] })),
      'REFUSED_ARTIFACT',
    );

    const largerByteLength = Buffer.from(KAT_A_BODY);
    Object.defineProperty(largerByteLength, 'byteLength', { value: 3 });
    const manifest = buildAdmissionManifest(katAInputs());
    expectRefusal(
      () => encodeAdmissionFrame({ manifest, artifacts: [{ id: 'root', bytes: largerByteLength }] }),
      'REFUSED_ARTIFACT',
    );

    const twoRuleProfile = JSON.parse(KAT_A_PROFILE_JSON);
    twoRuleProfile.artifactRules.push({ id: 'z-leaf', maxBytes: 1, required: true, role: 'leaf' });
    const rootBody = Buffer.from(KAT_A_BODY);
    const leafBody = Buffer.from([1]);
    const twoArtifactInput = katAInputs({
      profile: twoRuleProfile,
      artifacts: [
        { id: 'root', bytes: rootBody },
        { id: 'z-leaf', bytes: leafBody },
      ],
      graph: {
        schema: 'artifact-admission-graph.v1',
        root: 'root',
        nodes: ['root', 'z-leaf'],
        edges: [{ from: 'root', kind: 'requires', to: 'z-leaf' }],
      },
    });
    const twoArtifactManifest = buildAdmissionManifest(twoArtifactInput);
    const mismatchedLeaf = Buffer.from([1]);
    Object.defineProperty(mismatchedLeaf, 'byteLength', { value: 2 });
    expectRefusal(
      () => encodeAdmissionFrame({
        manifest: twoArtifactManifest,
        artifacts: [
          { id: 'root', bytes: rootBody },
          { id: 'z-leaf', bytes: mismatchedLeaf },
        ],
      }),
      'REFUSED_ARTIFACT',
    );

    const hostileValueOf = Buffer.from(KAT_A_BODY);
    hostileValueOf.valueOf = function callerValueOf() {
      calls += 1;
      throw new Error('caller valueOf ran');
    };
    const hostileManifest = buildAdmissionManifest(katAInputs({ artifacts: [{ id: 'root', bytes: hostileValueOf }] }));
    const hostileFrame = encodeAdmissionFrame({
      manifest: hostileManifest,
      artifacts: [{ id: 'root', bytes: hostileValueOf }],
    });
    assert.equal(hostileFrame.length, 813);
    assert.equal(calls, 0);
});
