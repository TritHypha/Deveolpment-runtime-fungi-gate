import assert from "node:assert/strict";
import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign as edSign,
} from "node:crypto";
import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  ml_dsa65 as mlDsa65,
} from "../../galerina-tower-citizen/node_modules/@noble/post-quantum/ml-dsa.js";

import {
  admitRegistryRotationCandidate,
  admitRegistryRotationIndex,
  advanceRegistryRotation,
  advanceRegistryRotationState,
  buildRegistryGeneration,
  buildRegistryIndex,
  buildRegistryAuthorityDelegation,
  createRegistryGenerationHostEvidenceAdapter,
  verifyRegistryGenerationForwardProbe,
  isAdmittedRegistryRotationCandidate,
  persistRegistryGeneration,
  signRegistryAuthorityDelegation,
  signRegistryIndexHybrid,
  stageAdmittedRegistryRotationCandidate,
} from "../dist/index.js";
import {
  beginRotation,
  createKeyRing,
  registryRotationKeyCommit,
  restoreRegistryRotationCheckpoint,
  sealRegistryRotationCheckpoint,
} from "../../galerina-tower-citizen/dist/index.js";

const ROOT_ID = "aaaaaaaaaaaaaaaa";
const CANDIDATE_ID = "bbbbbbbbbbbbbbbb";
const ROOT_CONTEXT = new TextEncoder().encode(
  "galerina.registry.delegation.sig.v1",
);
const ROTATION_CONTEXT = new TextEncoder().encode(
  "galerina.registry.rotation.proof.v1",
);
const INDEX_CONTEXT = new TextEncoder().encode(
  "galerina.registry.index.sig.v2",
);
const MANIFEST_CONTEXT = new TextEncoder().encode(
  "galerina.registry.package.manifest.sig.v1",
);
const RING_KEY = new Uint8Array(32).fill(0x71);

function hybridKey(keyId) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const mlSecret = mlDsa65.keygen().secretKey;
  const ed25519PublicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
  const mlDsa65PublicKey = mlDsa65.getPublicKey(mlSecret);
  return {
    publicBundle: {
      keyId,
      ed25519PublicKeyPem,
      mlDsa65PublicKey,
    },
    signRoot(message) {
      return {
        ed: Buffer.from(edSign(null, message, privateKey)).toString("base64"),
        ml: Buffer.from(
          mlDsa65.sign(message, mlSecret, { context: ROOT_CONTEXT }),
        ).toString("base64"),
      };
    },
    signRotation(message) {
      return {
        ed25519: Buffer.from(edSign(null, message, privateKey))
          .toString("base64"),
        mlDsa65: Buffer.from(
          mlDsa65.sign(message, mlSecret, {
            context: ROTATION_CONTEXT,
          }),
        ).toString("base64"),
      };
    },
    signIndex(message) {
      return {
        ed25519: Buffer.from(edSign(null, message, privateKey))
          .toString("base64"),
        mlDsa65: Buffer.from(
          mlDsa65.sign(message, mlSecret, {
            context: INDEX_CONTEXT,
          }),
        ).toString("base64"),
      };
    },
    signManifest(message) {
      return {
        ed25519: Buffer.from(edSign(null, message, privateKey))
          .toString("base64"),
        mlDsa65: Buffer.from(
          mlDsa65.sign(message, mlSecret, {
            context: MANIFEST_CONTEXT,
          }),
        ).toString("base64"),
      };
    },
  };
}

function fingerprints(bundle) {
  const edDer = createPublicKey(bundle.ed25519PublicKeyPem)
    .export({ type: "spki", format: "der" });
  return {
    ed25519PublicKeySha256: createHash("sha256").update(edDer).digest("hex"),
    mlDsa65PublicKeySha256: createHash("sha256")
      .update(bundle.mlDsa65PublicKey)
      .digest("hex"),
  };
}

function fixture() {
  const root = hybridKey(ROOT_ID);
  const candidate = hybridKey(CANDIDATE_ID);
  const pins = fingerprints(candidate.publicBundle);
  const unsigned = buildRegistryAuthorityDelegation({
    registry: "galerina-central",
    serial: 2,
    issuedAt: "2026-08-01T00:00:00.000Z",
    notBefore: "2026-08-01T00:00:00.000Z",
    notAfter: "2026-11-01T00:00:00.000Z",
    rootKeyId: ROOT_ID,
    operational: {
      keyId: CANDIDATE_ID,
      algorithm: "Ed25519+ML-DSA-65",
      ...pins,
    },
    roles: ["package-manifest.sign", "registry-index.sign"],
  });
  const rootSignature = root.signRoot;
  const delegation = signRegistryAuthorityDelegation(
    unsigned,
    (message) => rootSignature(message).ed,
    (message) => rootSignature(message).ml,
  );
  const options = {
    delegation,
    expectedRootKeyId: ROOT_ID,
    rootPublicBundle: root.publicBundle,
    operationalPublicBundle: candidate.publicBundle,
    at: "2026-08-02T00:00:00.000Z",
    minDelegationSerial: 1,
    isRevoked: () => false,
  };
  return { root, candidate, delegation, options };
}

function signedCandidateIndex(candidate) {
  const unsigned = buildRegistryIndex({
    registry: "galerina-central",
    issuedAt: "2026-08-02T00:00:00.000Z",
    entries: [{
      name: "@galerina/example",
      version: "1.0.0",
      sourceHash: `sha256:${"4".repeat(64)}`,
      publisher: "galerina-owner-governance",
      keyId: CANDIDATE_ID,
      certificationLevel: "verified",
      riskRating: "low",
      capabilities: [],
      effects: [],
    }],
  });
  return signRegistryIndexHybrid(
    unsigned,
    CANDIDATE_ID,
    (message) => candidate.signIndex(message).ed25519,
    (message) => candidate.signIndex(message).mlDsa65,
  );
}

function unsignedCandidateManifest() {
  return {
    schema: "galerina-package-manifest/v1",
    name: "@galerina/example",
    version: "1.0.0",
    registry: "galerina-central",
    artifactProfile: "galerina-flat-package-tree/v1",
    artifactFiles: ["LICENSE", "src/index.fungi"],
    capabilities: [],
    effects: [],
    installScript: null,
    hash: `sha256:${"4".repeat(64)}`,
    publisher: "galerina-owner-governance",
    keyId: "1111111111111111",
    signerKeyId: "1111111111111111",
    certificationLevel: "verified",
    riskRating: "low",
    governance: {
      reviewed: true,
      reviewedBy: "galerina-owner-governance",
      reviewedAt: "2026-08-01T00:00:00.000Z",
    },
  };
}

function restoreState(process, facts = {}) {
  const state = {
    process,
    delegationSerialFloor: 0,
    indexIssuedAtFloor: "1970-01-01T00:00:00.000Z",
    acceptedDelegationSerial: 1,
    acceptedIndexIssuedAt: "2026-07-30T16:33:10.307Z",
    acceptedGenerationId: "0".repeat(64),
    ...facts,
  };
  return restoreRegistryRotationCheckpoint(
    sealRegistryRotationCheckpoint(state, RING_KEY),
    RING_KEY,
    {
      minEpochId: state.process.ring.epochs.length,
      minDelegationSerialFloor: state.delegationSerialFloor,
      minIndexIssuedAtFloor: state.indexIssuedAtFloor,
      minAcceptedDelegationSerial: state.acceptedDelegationSerial,
      minAcceptedIndexIssuedAt: state.acceptedIndexIssuedAt,
      expectedAcceptedGenerationId: state.acceptedGenerationId,
    },
  );
}

describe("registry rotation root authority", () => {
  it("mints an unforgeable admitted receipt only after concrete hybrid verification", () => {
    const value = fixture();
    const receipt = admitRegistryRotationCandidate(value.options);

    assert.equal(receipt.keyId, CANDIDATE_ID);
    assert.equal(receipt.delegationSerial, 2);
    assert.equal(receipt.notAfter, "2026-11-01T00:00:00.000Z");
    assert.equal(isAdmittedRegistryRotationCandidate(receipt), true);
    assert.equal(isAdmittedRegistryRotationCandidate({
      ...receipt,
    }), false);
  });

  it("refuses substituted keys, stale/expired authority, revocation, and unsigned delegation", () => {
    const value = fixture();
    const attacker = hybridKey("cccccccccccccccc");
    const denied = [
      {
        ...value.options,
        operationalPublicBundle: {
          ...attacker.publicBundle,
          keyId: CANDIDATE_ID,
        },
      },
      { ...value.options, minDelegationSerial: 2 },
      { ...value.options, at: "2026-11-01T00:00:00.001Z" },
      { ...value.options, isRevoked: () => true },
      {
        ...value.options,
        delegation: {
          ...value.delegation,
          rootSignature: undefined,
        },
      },
    ];

    for (const options of denied) {
      assert.throws(() => admitRegistryRotationCandidate(options));
    }
  });

  it("stages only the exact root-admitted candidate receipt", () => {
    const value = fixture();
    const receipt = admitRegistryRotationCandidate(value.options);
    const genesis = hybridKey("1111111111111111");
    const ring = createKeyRing(RING_KEY, {
      keyId: genesis.publicBundle.keyId,
      keyKind: "asymmetric",
      keyCommit: "1".repeat(64),
      fileRef: `custody://registry/${genesis.publicBundle.keyId}`,
      createdTick: 1,
    });
    const ready = {
      ...beginRotation(ring),
      phase: "ready",
    };
    const staged = stageAdmittedRegistryRotationCandidate({
      process: ready,
      ringMacKey: RING_KEY,
      receipt,
      publicBundle: value.candidate.publicBundle,
      custodyRef: `custody://registry/${CANDIDATE_ID}`,
      createdTick: 2,
      at: "2026-08-02T00:00:00.000Z",
    });
    assert.equal(staged.decision.authorized, true);
    assert.equal(staged.process.phase, "staged");

    const forged = stageAdmittedRegistryRotationCandidate({
      process: ready,
      ringMacKey: RING_KEY,
      receipt: { ...receipt },
      publicBundle: value.candidate.publicBundle,
      custodyRef: `custody://registry/${CANDIDATE_ID}`,
      createdTick: 2,
      at: "2026-08-02T00:00:00.000Z",
    });
    assert.equal(forged.decision.authorized, false);
    assert.equal(forged.process, ready);

    const substituted = stageAdmittedRegistryRotationCandidate({
      process: ready,
      ringMacKey: RING_KEY,
      receipt,
      publicBundle: {
        ...hybridKey("cccccccccccccccc").publicBundle,
        keyId: CANDIDATE_ID,
      },
      custodyRef: `custody://registry/${CANDIDATE_ID}`,
      createdTick: 2,
      at: "2026-08-02T00:00:00.000Z",
    });
    assert.equal(substituted.decision.authorized, false);
    assert.equal(substituted.process, ready);
  });

  it("admits only a fresh candidate-signed index whose entries have migrated to the candidate identity", () => {
    const value = fixture();
    const receipt = admitRegistryRotationCandidate(value.options);
    const index = signedCandidateIndex(value.candidate);
    const admitted = admitRegistryRotationIndex({
      receipt,
      publicBundle: value.candidate.publicBundle,
      index,
      minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
    });
    assert.equal(admitted.keyId, CANDIDATE_ID);
    assert.equal(admitted.entryCount, 1);

    const oldIdentityUnsigned = buildRegistryIndex({
      registry: index.registry,
      issuedAt: "2026-08-02T00:00:00.000Z",
      entries: index.entries.map((entry) => ({
        ...entry,
        keyId: "1111111111111111",
      })),
    });
    const oldIdentityIndex = signRegistryIndexHybrid(
      oldIdentityUnsigned,
      CANDIDATE_ID,
      (message) => value.candidate.signIndex(message).ed25519,
      (message) => value.candidate.signIndex(message).mlDsa65,
    );
    assert.throws(() => admitRegistryRotationIndex({
      receipt,
      publicBundle: value.candidate.publicBundle,
      index: oldIdentityIndex,
      minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
    }));
    assert.throws(() => admitRegistryRotationIndex({
      receipt: { ...receipt },
      publicBundle: value.candidate.publicBundle,
      index,
      minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
    }));
    assert.throws(() => admitRegistryRotationIndex({
      receipt,
      publicBundle: value.candidate.publicBundle,
      index,
      minIndexIssuedAt: index.issuedAt,
    }));
  });

  it("automatically advances one admitted phase at a time and rolls back a failed canary", () => {
    const value = fixture();
    const receipt = admitRegistryRotationCandidate(value.options);
    const oldKey = hybridKey("1111111111111111");
    const custodyKeys = new Map([
      [oldKey.publicBundle.keyId, oldKey],
      [value.candidate.publicBundle.keyId, value.candidate],
    ]);
    const retiredPrivateKeys = [];
    const custody = {
      signHybrid(keyId, message) {
        return custodyKeys.get(keyId)?.signRotation(message) ?? null;
      },
      retirePrivate(keyId) {
        if (!custodyKeys.has(keyId)) {
          return retiredPrivateKeys.includes(keyId);
        }
        custodyKeys.delete(keyId);
        retiredPrivateKeys.push(keyId);
        return true;
      },
    };
    const ring = createKeyRing(RING_KEY, {
      keyId: oldKey.publicBundle.keyId,
      keyKind: "asymmetric",
      keyCommit: registryRotationKeyCommit(oldKey.publicBundle),
      fileRef: `custody://registry/${oldKey.publicBundle.keyId}`,
      createdTick: 1,
    });
    const common = {
      ringMacKey: RING_KEY,
      trigger: {
        nowTick: 100,
        activeSinceTick: 1,
        rotateAfterTicks: 50,
        signedArtifacts: 10,
        maxSignedArtifacts: 100,
      },
      readiness: {
        auditRunsMidFlight: 0,
        queueDepth: 0,
        maxQueueDepth: 4,
      },
      receipt,
      candidatePublicBundle: value.candidate.publicBundle,
      custodyRef: `custody://registry/${CANDIDATE_ID}`,
      createdTick: 2,
      authorityAt: "2026-08-02T00:00:00.000Z",
      oldPublicBundle: oldKey.publicBundle,
      custody,
      chainHead: "f".repeat(64),
      votes: [
        { signer: "owner-a", verdict: 1 },
        { signer: "owner-b", verdict: 1 },
      ],
      quorum: 2,
      transitionTick: 3,
      switchTick: 4,
      verifyEvidence: {
        firstNewBatchPrevHash: "f".repeat(64),
        lastOldBatchHash: "f".repeat(64),
        cleanBatches: 3,
        canaryN: 3,
      },
      drainEvidence: {
        oldEpochPendingSigning: 0,
        oldEpochInFlight: 0,
      },
      retirePolicy: { mode: "destroy-private" },
      retireTick: 5,
      verifyCurrentChain: () => true,
      verifyForwardProbe: () => true,
      verifyBackwardSample: () => true,
    };

    let process = beginRotation(ring);
    for (const phase of [
      "ready",
      "staged",
      "locked",
      "switched",
      "verified",
      "drained",
      "retired",
    ]) {
      const outcome = advanceRegistryRotation({ ...common, process });
      assert.equal(outcome.decision.authorized, true);
      process = outcome.process;
      assert.equal(process.phase, phase);
    }
    assert.deepEqual(retiredPrivateKeys, [oldKey.publicBundle.keyId]);

    custodyKeys.set(oldKey.publicBundle.keyId, oldKey);
    let rollback = beginRotation(ring);
    for (let index = 0; index < 4; index += 1) {
      rollback = advanceRegistryRotation({
        ...common,
        process: rollback,
      }).process;
    }
    assert.equal(rollback.phase, "switched");
    const failed = advanceRegistryRotation({
      ...common,
      process: rollback,
      verifyEvidence: {
        ...common.verifyEvidence,
        firstNewBatchPrevHash: "0".repeat(64),
      },
    });
    assert.equal(failed.decision.authorized, true);
    assert.equal(failed.process.phase, "idle");
    assert.equal(failed.process.ring.epochs[0].status, "active");
    assert.equal(failed.process.ring.epochs[1].status, "revoked");
  });

  it("refuses production rotation until a platform durability adapter is admitted", async () => {
    const directory = await mkdtemp(join(tmpdir(), "galerina-rotation-"));
    try {
    const value = fixture();
    const oldKey = hybridKey("1111111111111111");
    const generation = buildRegistryGeneration({
      delegationSerial: 2,
      operationalPublicBundle: value.candidate.publicBundle,
      unsignedManifests: [unsignedCandidateManifest()],
      registry: "galerina-central",
      issuedAt: "2026-08-02T00:00:00.000Z",
      custody: {
        signHybrid(keyId, message, role) {
          if (keyId !== CANDIDATE_ID) return null;
          return role === "package-manifest"
            ? value.candidate.signManifest(message)
            : value.candidate.signIndex(message);
        },
      },
    });
    const candidateIndex = generation.index;
    const candidateGeneration = await persistRegistryGeneration({
      directory,
      generation,
      verify: {
        expectedDelegationSerial: 2,
        publicBundle: value.candidate.publicBundle,
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      },
      durabilityAdapter: createRegistryGenerationHostEvidenceAdapter({
        adapterId: "galerina.test.host-evidence.v1",
        sourceDigest: `sha256:${"a".repeat(64)}`,
        flushDirectory: async () => true,
      }),
    });
    const forwardProbe = await verifyRegistryGenerationForwardProbe({
      directory,
      generationId: candidateGeneration.generationId,
      verify: {
        expectedDelegationSerial: 2,
        publicBundle: value.candidate.publicBundle,
        minIndexIssuedAt: "2026-07-30T16:33:10.307Z",
      },
    });
    const custodyKeys = new Map([
      [oldKey.publicBundle.keyId, oldKey],
      [value.candidate.publicBundle.keyId, value.candidate],
    ]);
    const custody = {
      signHybrid(keyId, message) {
        return custodyKeys.get(keyId)?.signRotation(message) ?? null;
      },
      retirePrivate(keyId) {
        if (!custodyKeys.has(keyId)) return true;
        custodyKeys.delete(keyId);
        return true;
      },
    };
    const ring = createKeyRing(RING_KEY, {
      keyId: oldKey.publicBundle.keyId,
      keyKind: "asymmetric",
      keyCommit: registryRotationKeyCommit(oldKey.publicBundle),
      fileRef: `custody://registry/${oldKey.publicBundle.keyId}`,
      createdTick: 1,
    });
    const state = restoreState(beginRotation(ring));
    const receipt = admitRegistryRotationCandidate(value.options);
    const admittedIndex = admitRegistryRotationIndex({
      receipt,
      publicBundle: value.candidate.publicBundle,
      index: candidateIndex,
      minIndexIssuedAt: state.acceptedIndexIssuedAt,
    });
    const common = {
      ringMacKey: RING_KEY,
      trigger: {
        nowTick: 100,
        activeSinceTick: 1,
        rotateAfterTicks: 50,
        signedArtifacts: 10,
        maxSignedArtifacts: 100,
      },
      readiness: {
        auditRunsMidFlight: 0,
        queueDepth: 0,
        maxQueueDepth: 4,
      },
      candidatePublicBundle: value.candidate.publicBundle,
      custodyRef: `custody://registry/${CANDIDATE_ID}`,
      createdTick: 2,
      authorityAt: "2026-08-02T00:00:00.000Z",
      oldPublicBundle: oldKey.publicBundle,
      custody,
      chainHead: "f".repeat(64),
      votes: [
        { signer: "owner-a", verdict: 1 },
        { signer: "owner-b", verdict: 1 },
      ],
      quorum: 2,
      transitionTick: 3,
      switchTick: 4,
      verifyEvidence: {
        firstNewBatchPrevHash: "f".repeat(64),
        lastOldBatchHash: "f".repeat(64),
        cleanBatches: 3,
        canaryN: 3,
      },
      drainEvidence: {
        oldEpochPendingSigning: 0,
        oldEpochInFlight: 0,
      },
      retirePolicy: { mode: "destroy-private" },
      retireTick: 5,
      verifyCurrentChain: () => true,
      forwardProbe,
      verifyBackwardSample: () => true,
      candidateGeneration,
    };

    const outcome = advanceRegistryRotationState({
      ...common,
      state,
      receipt,
      admittedIndex,
    });
    assert.equal(outcome.decision.authorized, false);
    assert.equal(outcome.state, state);
    assert.equal(outcome.state.process.phase, "idle");
    assert.equal(outcome.state.acceptedGenerationId, "0".repeat(64));
    assert.match(
      outcome.reasons.join(" "),
      /candidate generation identity is unauthenticated/u,
    );
    const copiedProbeOutcome = advanceRegistryRotationState({
      ...common,
      forwardProbe: { ...forwardProbe },
      state,
      receipt,
      admittedIndex,
    });
    assert.equal(copiedProbeOutcome.decision.authorized, false);
    assert.equal(copiedProbeOutcome.state, state);
    assert.match(
      copiedProbeOutcome.reasons.join(" "),
      /persisted-object-bound forward probe receipt is unavailable/u,
    );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
