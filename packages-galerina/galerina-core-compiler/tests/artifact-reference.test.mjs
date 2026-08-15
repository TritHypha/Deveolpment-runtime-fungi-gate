import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";

import {
  ArtifactReferenceError,
  authenticateComputeTransferV1,
  artifactReferencesEqual,
  canonicalComputeTransferBytes,
  computeTransferDigest,
  createArtifactRetentionLedger,
  createComputeTransferReceiver,
  createComputeTransferRunIdentity,
  createFilesystemArtifactRepository,
  createOneReferenceReadCapability,
  createVokEnvelopeV1,
  deriveStageEvidenceSetV1,
  finalizeComputeTransferStage,
  mintStageReceiptV1,
  readVerifiedArtifact,
  validateArtifactReferenceV1,
  validateComputeTransferV1,
  validateVokEnvelopeV1,
  verifyStageReceiptV1,
  verifyArtifactBytes,
} from "../dist/index.js";

const roots = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryRoot() {
  const root = await mkdtemp(join(tmpdir(), "galerina-artifact-reference-"));
  roots.push(root);
  return root;
}

async function onlyBodyPath(root) {
  const owners = await readdir(root, { withFileTypes: true });
  assert.equal(owners.length, 1);
  const ownerPath = join(root, owners[0].name);
  const kinds = await readdir(ownerPath, { withFileTypes: true });
  assert.equal(kinds.length, 1);
  const kindPath = join(ownerPath, kinds[0].name);
  const bodies = await readdir(kindPath, { withFileTypes: true });
  assert.equal(bodies.length, 1);
  return join(kindPath, bodies[0].name);
}

function assertArtifactError(code) {
  return (error) => {
    assert.equal(error instanceof ArtifactReferenceError, true);
    assert.equal(error.code, code);
    return true;
  };
}

test("artifact references admit one exact ordinary record and reject path-bearing or malformed records", () => {
  const valid = {
    schema: "galerina.artifact-reference.v1",
    owner: "galerina",
    kind: "fungi-source",
    digest: `sha256:${"a".repeat(64)}`,
    byteLength: 12,
  };

  assert.deepEqual(validateArtifactReferenceV1(valid), valid);
  assert.throws(() => validateArtifactReferenceV1({ ...valid, path: "C:\\secret\\body" }), assertArtifactError("REFERENCE_KEYS"));
  assert.throws(() => validateArtifactReferenceV1({ ...valid, digest: "sha256:ABC" }), assertArtifactError("REFERENCE_DIGEST"));
  assert.throws(() => validateArtifactReferenceV1({ ...valid, kind: "physical-slide" }), assertArtifactError("OWNER_KIND"));
  assert.throws(() => validateArtifactReferenceV1({ ...valid, byteLength: Number.MAX_SAFE_INTEGER + 1 }), assertArtifactError("REFERENCE_LENGTH"));
  assert.throws(() => validateArtifactReferenceV1(new Proxy(valid, {})), assertArtifactError("REFERENCE_TYPE"));
});

test("validation refuses inherited and accessor-backed fields without invoking them", () => {
  let reads = 0;
  const inherited = Object.create({ schema: "galerina.artifact-reference.v1" });
  Object.assign(inherited, {
    owner: "galerina",
    kind: "fungi-source",
    digest: `sha256:${"a".repeat(64)}`,
    byteLength: 0,
  });
  assert.throws(() => validateArtifactReferenceV1(inherited), assertArtifactError("REFERENCE_TYPE"));

  const accessor = {};
  Object.defineProperty(accessor, "schema", { enumerable: true, get() { reads += 1; return "galerina.artifact-reference.v1"; } });
  Object.assign(accessor, {
    owner: "galerina",
    kind: "fungi-source",
    digest: `sha256:${"a".repeat(64)}`,
    byteLength: 0,
  });
  assert.throws(() => validateArtifactReferenceV1(accessor), assertArtifactError("REFERENCE_DESCRIPTOR"));
  assert.equal(reads, 0);
});

test("the bounded filesystem repository writes and reads owned copies", async () => {
  const root = await temporaryRoot();
  const repository = createFilesystemArtifactRepository({ rootDirectory: root, owner: "galerina", maxByteLength: 64 });
  const input = Uint8Array.from([1, 2, 3, 4]);
  const reference = await repository.write("fungi-source", input);
  input[0] = 99;

  const first = await repository.read(reference);
  assert.deepEqual([...first], [1, 2, 3, 4]);
  first[1] = 88;
  assert.deepEqual([...(await repository.read(reference))], [1, 2, 3, 4]);
  assert.equal(JSON.stringify(reference).includes(root), false, "serialized authority never reveals repository layout");
});

test("wrong-owner access is refused before the backend read capability runs", async () => {
  let reads = 0;
  const repository = {
    owner: "slide",
    async read() { reads += 1; return Uint8Array.of(1); },
    async write() { throw new Error("not used"); },
  };
  const reference = {
    schema: "galerina.artifact-reference.v1",
    owner: "galerina",
    kind: "fungi-source",
    digest: `sha256:${"a".repeat(64)}`,
    byteLength: 1,
  };

  await assert.rejects(readVerifiedArtifact(repository, reference), assertArtifactError("REPOSITORY_OWNER"));
  assert.equal(reads, 0);
});

test("missing, short, mutated and oversized bodies refuse", async () => {
  const root = await temporaryRoot();
  const repository = createFilesystemArtifactRepository({ rootDirectory: root, owner: "galerina", maxByteLength: 8 });
  const reference = await repository.write("canonical-gir", Uint8Array.from([1, 2, 3, 4]));
  const bodyPath = await onlyBodyPath(root);

  await writeFile(bodyPath, Uint8Array.from([1, 2, 3]));
  await assert.rejects(repository.read(reference), assertArtifactError("BODY_LENGTH"));

  await writeFile(bodyPath, Uint8Array.from([1, 2, 3, 5]));
  await assert.rejects(repository.read(reference), assertArtifactError("BODY_DIGEST"));

  await writeFile(bodyPath, Uint8Array.from({ length: 9 }, (_, index) => index));
  await assert.rejects(repository.read(reference), assertArtifactError("BODY_OVERSIZED"));

  await unlink(bodyPath);
  await assert.rejects(repository.read(reference), assertArtifactError("BODY_MISSING"));
});

test("backend exceptions are typed and cannot be confused with digest refusal", async () => {
  const bytes = Uint8Array.of(7, 8, 9);
  const root = await temporaryRoot();
  const filesystem = createFilesystemArtifactRepository({ rootDirectory: root, owner: "galerina" });
  const reference = await filesystem.write("checked-module-snapshot", bytes);
  const backend = {
    owner: "galerina",
    async read() { throw new Error("backend secret"); },
    async write() { throw new Error("not used"); },
  };
  await assert.rejects(readVerifiedArtifact(backend, reference), assertArtifactError("BACKEND_READ"));
});

test("a replica with the same verified bytes is semantically equal", async () => {
  const root = await temporaryRoot();
  const filesystem = createFilesystemArtifactRepository({ rootDirectory: root, owner: "galerina" });
  const reference = await filesystem.write("canonical-gir", Uint8Array.of(10, 11, 12));
  const replica = {
    owner: "galerina",
    async read() { return Uint8Array.of(10, 11, 12); },
    async write() { throw new Error("read-only replica"); },
  };

  assert.deepEqual([...(await readVerifiedArtifact(replica, reference))], [10, 11, 12]);
  assert.equal(artifactReferencesEqual(reference, structuredClone(reference)), true);
});

test("one-reference read capabilities capture the repository method and reference once", async () => {
  const bytes = Uint8Array.of(21, 22);
  const root = await temporaryRoot();
  const filesystem = createFilesystemArtifactRepository({ rootDirectory: root, owner: "galerina" });
  const reference = await filesystem.write("fungi-source", bytes);
  let reads = 0;
  const mutableBackend = {
    owner: "galerina",
    async read(candidate) { reads += 1; return filesystem.read(candidate); },
    async write() { throw new Error("not used"); },
  };
  const mutableReference = { ...reference };
  const readOnce = createOneReferenceReadCapability(mutableBackend, mutableReference);
  mutableBackend.read = async () => { throw new Error("substituted"); };
  mutableReference.digest = `sha256:${"0".repeat(64)}`;

  assert.deepEqual([...(await readOnce())], [21, 22]);
  assert.equal(reads, 1);
  await assert.rejects(readOnce(), assertArtifactError("CAPABILITY_SPENT"));
});

test("direct byte verification rejects a one-byte replica mismatch and returns an owned copy", () => {
  const rootReference = validateArtifactReferenceV1({
    schema: "galerina.artifact-reference.v1",
    owner: "vok",
    kind: "vok-receipt",
    digest: "sha256:039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    byteLength: 3,
  });
  const verified = verifyArtifactBytes(rootReference, Uint8Array.of(1, 2, 3));
  verified[0] = 99;
  assert.deepEqual([...verifyArtifactBytes(rootReference, Uint8Array.of(1, 2, 3))], [1, 2, 3]);
  assert.throws(() => verifyArtifactBytes(rootReference, Uint8Array.of(1, 2, 4)), assertArtifactError("BODY_DIGEST"));
});

function hmacPair(id = "test-transfer-hmac") {
  const key = Buffer.from("artifact-transfer-test-key-2026-08-15", "utf8");
  return {
    signer: {
      id,
      async sign(bytes) { return createHmac("sha256", key).update(bytes).digest(); },
    },
    verifier: {
      id,
      async verify(bytes, signature) {
        const expected = createHmac("sha256", key).update(bytes).digest();
        return signature.byteLength === expected.byteLength && timingSafeEqual(signature, expected);
      },
    },
  };
}

function receiverFixture(verifier, transfer, overrides = {}) {
  let now = 10_000;
  const ledger = createArtifactRetentionLedger({
    owner: transfer.fromOwner,
    now: () => now,
    maxRetentionMs: 1_000,
  });
  const receiver = createComputeTransferReceiver({
    verifier,
    observeAuthority: () => ({ epoch: 7, contextDigest: transfer.authorityContextDigest }),
    retention: ledger.capability,
    acquirerId: "slide.transfer.queue",
    retentionExpiresAt: () => now + 500,
    ...overrides,
  });
  return { receiver, ledger, setNow(value) { now = value; } };
}

async function transferFixture() {
  const root = await temporaryRoot();
  const repository = createFilesystemArtifactRepository({ rootDirectory: root, owner: "galerina" });
  const artifact = await repository.write("checked-module-snapshot", Uint8Array.of(31, 32, 33));
  const authorityContextDigest = `sha256:${"c".repeat(64)}`;
  const runIdentity = createComputeTransferRunIdentity({
    operationId: "compile.example",
    initialArtifact: artifact,
    authorityEpoch: 7,
    authorityContextDigest,
  });
  return {
    artifact,
    transfer: {
      schema: "galerina.compute-transfer.v1",
      fromOwner: "galerina",
      toOwner: "slide",
      artifact,
      prerequisiteDigests: Object.freeze([artifact.digest]),
      operationId: "compile.example",
      runIdentity,
      authorityEpoch: 7,
      authorityContextDigest,
    },
  };
}

test("compute transfers capture one exact record and bind the artifact to the sending owner", async () => {
  const { transfer } = await transferFixture();
  assert.deepEqual(validateComputeTransferV1(transfer), transfer);
  assert.throws(
    () => validateComputeTransferV1({ ...transfer, fromOwner: "lyth" }),
    assertArtifactError("TRANSFER_ARTIFACT_OWNER"),
  );
  assert.throws(
    () => validateComputeTransferV1({ ...transfer, surplus: true }),
    assertArtifactError("TRANSFER_KEYS"),
  );
  assert.throws(
    () => validateComputeTransferV1({ ...transfer, toOwner: "galerina" }),
    assertArtifactError("TRANSFER_ROUTE"),
  );
  assert.throws(
    () => validateComputeTransferV1(new Proxy(transfer, {})),
    assertArtifactError("TRANSFER_TYPE"),
  );
});

test("run identity and canonical transfer bytes move on every bound authority input", async () => {
  const { artifact, transfer } = await transferFixture();
  const bytesA = canonicalComputeTransferBytes(transfer);
  const bytesB = canonicalComputeTransferBytes(structuredClone(transfer));
  assert.deepEqual(bytesA, bytesB);
  assert.match(computeTransferDigest(transfer), /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(
    createComputeTransferRunIdentity({
      operationId: transfer.operationId,
      initialArtifact: artifact,
      authorityEpoch: transfer.authorityEpoch + 1,
      authorityContextDigest: transfer.authorityContextDigest,
    }),
    transfer.runIdentity,
  );
  assert.notEqual(
    createComputeTransferRunIdentity({
      operationId: `${transfer.operationId}.other`,
      initialArtifact: artifact,
      authorityEpoch: transfer.authorityEpoch,
      authorityContextDigest: transfer.authorityContextDigest,
    }),
    transfer.runIdentity,
  );
});

test("authenticated transfer admission queues work but never authorizes execution", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const { receiver, ledger } = receiverFixture(verifier, transfer);
  const result = await receiver.admit(envelope);
  assert.equal(result.accepted, true);
  assert.equal(result.queued, true);
  assert.equal(result.executionAuthorized, false);
  assert.deepEqual(result.transfer, transfer);
  assert.equal(Reflect.ownKeys(result.retentionHandle).length, 0, "the pin handle carries no read or admission authority");
  assert.equal(ledger.continuity(result.retentionHandle, "slide.transfer.queue"), true);
});

test("a recomputed transfer digest without a valid authenticator receipt is refused", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const forged = {
    ...envelope,
    transferDigest: computeTransferDigest(transfer),
    authentication: Buffer.alloc(32).toString("base64"),
  };
  const { receiver } = receiverFixture(verifier, transfer);
  assert.deepEqual(await receiver.admit(forged), { accepted: false, code: "AUTHENTICATION_INVALID" });
});

test("authority rotation refuses the next edge even when the old transfer signature is valid", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const { receiver } = receiverFixture(verifier, transfer, {
    observeAuthority: () => ({ epoch: 8, contextDigest: `sha256:${"d".repeat(64)}` }),
  });
  assert.deepEqual(await receiver.admit(envelope), { accepted: false, code: "AUTHORITY_ROTATED" });
});

test("accepted transfers are replay-safe, including concurrent duplicate delivery", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const { receiver } = receiverFixture(verifier, transfer);
  const [left, right] = await Promise.all([receiver.admit(envelope), receiver.admit(envelope)]);
  assert.deepEqual([left.accepted, right.accepted].sort(), [false, true]);
  const refused = left.accepted ? right : left;
  assert.deepEqual(refused, { accepted: false, code: "TRANSFER_REPLAY" });
  assert.deepEqual(await receiver.admit(envelope), { accepted: false, code: "TRANSFER_REPLAY" });
});

test("authenticated transfer envelopes are exact and never accepted as VOK Envelopes", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const { receiver } = receiverFixture(verifier, transfer);
  assert.deepEqual(
    await receiver.admit({ ...envelope, signet: "caller-made" }),
    { accepted: false, code: "ENVELOPE_INVALID" },
  );
  assert.deepEqual(
    await receiver.admit({ ...envelope, schema: "vok.envelope.v1" }),
    { accepted: false, code: "ENVELOPE_INVALID" },
  );
});

test("retention handles are acquirer-bound, idempotently released, and expire per run", async () => {
  const { transfer, artifact } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const { receiver, ledger, setNow } = receiverFixture(verifier, transfer);
  const result = await receiver.admit(envelope);
  assert.equal(result.accepted, true);
  assert.equal(ledger.isPinned(artifact), true);
  assert.equal(ledger.release(result.retentionHandle, "wrong-acquirer"), false);
  assert.equal(ledger.continuity(result.retentionHandle, "slide.transfer.queue"), true);
  assert.equal(ledger.release(result.retentionHandle, "slide.transfer.queue"), true);
  assert.equal(ledger.release(result.retentionHandle, "slide.transfer.queue"), true, "release is idempotent");
  assert.equal(ledger.isPinned(artifact), false);

  const secondTransfer = {
    ...transfer,
    operationId: "compile.second",
    runIdentity: createComputeTransferRunIdentity({
      operationId: "compile.second",
      initialArtifact: artifact,
      authorityEpoch: transfer.authorityEpoch,
      authorityContextDigest: transfer.authorityContextDigest,
    }),
  };
  const second = await receiver.admit(await authenticateComputeTransferV1(secondTransfer, signer));
  assert.equal(second.accepted, true);
  setNow(10_500);
  assert.equal(ledger.continuity(second.retentionHandle, "slide.transfer.queue"), false);
  assert.equal(ledger.isPinned(artifact), false, "expiry affects only the blocked run's pin");
});

test("retention acquisition failure refuses queue admission", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, signer);
  const retention = {
    owner: "galerina",
    async acquire() { throw new Error("retention unavailable"); },
  };
  const receiver = createComputeTransferReceiver({
    verifier,
    observeAuthority: () => ({ epoch: 7, contextDigest: transfer.authorityContextDigest }),
    retention,
    acquirerId: "slide.transfer.queue",
    retentionExpiresAt: () => 10_500,
  });
  assert.deepEqual(await receiver.admit(envelope), { accepted: false, code: "RETENTION_UNAVAILABLE" });
});

function stageHmacPair(transfer, id = "slide-stage-hmac") {
  const key = Buffer.from("stage-receipt-test-key-2026-08-15", "utf8");
  const common = {
    id,
    owner: transfer.toOwner,
    authorityEpoch: transfer.authorityEpoch,
    authorityContextDigest: transfer.authorityContextDigest,
  };
  return {
    signer: {
      ...common,
      async sign(bytes) { return createHmac("sha256", key).update(bytes).digest(); },
    },
    verifier: {
      ...common,
      async verify(bytes, signature) {
        const expected = createHmac("sha256", key).update(bytes).digest();
        return signature.byteLength === expected.byteLength && timingSafeEqual(signature, expected);
      },
    },
  };
}

function stageHmacPairForOwner(transfer, owner, id) {
  const pair = stageHmacPair(transfer, id);
  return {
    signer: { ...pair.signer, owner },
    verifier: { ...pair.verifier, owner },
  };
}

function stageInput(transfer, overrides = {}) {
  return {
    owner: transfer.toOwner,
    stage: "slide.snapshot-to-gir.v1",
    runIdentity: transfer.runIdentity,
    authorityEpoch: transfer.authorityEpoch,
    authorityContextDigest: transfer.authorityContextDigest,
    inputDigest: transfer.artifact.digest,
    outputDigest: `sha256:${"e".repeat(64)}`,
    evidenceDigest: `sha256:${"f".repeat(64)}`,
    ...overrides,
  };
}

test("stage receipts bind run, epoch, stage, input, output and evidence to an owner signer", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = stageHmacPair(transfer);
  const receipt = await mintStageReceiptV1(stageInput(transfer), signer);
  const verified = await verifyStageReceiptV1(receipt, verifier);
  assert.equal(verified.verified, true);
  assert.deepEqual(verified.receipt, receipt);

  for (const [field, value] of [
    ["stage", "slide.other-stage.v1"],
    ["runIdentity", `sha256:${"1".repeat(64)}`],
    ["inputDigest", `sha256:${"2".repeat(64)}`],
    ["outputDigest", `sha256:${"3".repeat(64)}`],
    ["evidenceDigest", `sha256:${"4".repeat(64)}`],
  ]) {
    const tampered = { ...receipt, [field]: value };
    assert.deepEqual(await verifyStageReceiptV1(tampered, verifier), { verified: false, code: "RECEIPT_INVALID" });
  }
});

test("a caller-made receipt digest is not receipt authentication", async () => {
  const { transfer } = await transferFixture();
  const { signer, verifier } = stageHmacPair(transfer);
  const original = await mintStageReceiptV1(stageInput(transfer), signer);
  const replacement = await mintStageReceiptV1(stageInput(transfer, { outputDigest: `sha256:${"9".repeat(64)}` }), signer);
  const forged = {
    ...replacement,
    authentication: original.authentication,
  };
  assert.deepEqual(await verifyStageReceiptV1(forged, verifier), { verified: false, code: "RECEIPT_AUTHENTICATION_INVALID" });
});

test("terminal verified receipt checks retention continuity and releases the pin", async () => {
  const { transfer, artifact } = await transferFixture();
  const transferKeys = hmacPair();
  const envelope = await authenticateComputeTransferV1(transfer, transferKeys.signer);
  const { receiver, ledger } = receiverFixture(transferKeys.verifier, transfer);
  const admission = await receiver.admit(envelope);
  assert.equal(admission.accepted, true);
  const stageKeys = stageHmacPair(transfer);
  const receipt = await mintStageReceiptV1(stageInput(transfer), stageKeys.signer);
  const result = await finalizeComputeTransferStage({
    admission,
    receipt,
    verifier: stageKeys.verifier,
    observeAuthority: () => ({ epoch: 7, contextDigest: transfer.authorityContextDigest }),
    retention: ledger,
    acquirerId: "slide.transfer.queue",
  });
  assert.equal(result.completed, true);
  assert.equal(ledger.isPinned(artifact), false);
  assert.equal(ledger.release(admission.retentionHandle, "slide.transfer.queue"), true, "terminal release remains idempotent");
});

test("lapsed retention or rotated authority refuses only that terminal run", async () => {
  const { transfer } = await transferFixture();
  const transferKeys = hmacPair();
  const stageKeys = stageHmacPair(transfer);
  const receipt = await mintStageReceiptV1(stageInput(transfer), stageKeys.signer);

  const expiring = receiverFixture(transferKeys.verifier, transfer);
  const expiredAdmission = await expiring.receiver.admit(await authenticateComputeTransferV1(transfer, transferKeys.signer));
  assert.equal(expiredAdmission.accepted, true);
  expiring.setNow(10_500);
  assert.deepEqual(await finalizeComputeTransferStage({
    admission: expiredAdmission,
    receipt,
    verifier: stageKeys.verifier,
    observeAuthority: () => ({ epoch: 7, contextDigest: transfer.authorityContextDigest }),
    retention: expiring.ledger,
    acquirerId: "slide.transfer.queue",
  }), { completed: false, code: "RETENTION_LAPSED" });

  const rotatedTransfer = { ...transfer, operationId: "compile.rotated", runIdentity: createComputeTransferRunIdentity({
    operationId: "compile.rotated",
    initialArtifact: transfer.artifact,
    authorityEpoch: transfer.authorityEpoch,
    authorityContextDigest: transfer.authorityContextDigest,
  }) };
  const rotated = receiverFixture(transferKeys.verifier, rotatedTransfer);
  const rotatedAdmission = await rotated.receiver.admit(await authenticateComputeTransferV1(rotatedTransfer, transferKeys.signer));
  assert.equal(rotatedAdmission.accepted, true);
  const rotatedReceipt = await mintStageReceiptV1(stageInput(rotatedTransfer), stageKeys.signer);
  assert.deepEqual(await finalizeComputeTransferStage({
    admission: rotatedAdmission,
    receipt: rotatedReceipt,
    verifier: stageKeys.verifier,
    observeAuthority: () => ({ epoch: 8, contextDigest: `sha256:${"8".repeat(64)}` }),
    retention: rotated.ledger,
    acquirerId: "slide.transfer.queue",
  }), { completed: false, code: "TERMINAL_AUTHORITY_ROTATED" });
});

async function stageEvidenceFixture() {
  const { transfer } = await transferFixture();
  const slideKeys = stageHmacPairForOwner(transfer, "slide", "slide-evidence-hmac");
  const lythKeys = stageHmacPairForOwner(transfer, "lyth", "lyth-evidence-hmac");
  const slideReceipt = await mintStageReceiptV1(
    stageInput(transfer, {
      owner: "slide",
      stage: "slide.physicalize-scalar.v1",
      outputDigest: `sha256:${"5".repeat(64)}`,
      evidenceDigest: `sha256:${"6".repeat(64)}`,
    }),
    slideKeys.signer,
  );
  const lythReceipt = await mintStageReceiptV1(
    stageInput(transfer, {
      owner: "lyth",
      stage: "lyth.proof-work.v1",
      inputDigest: slideReceipt.outputDigest,
      outputDigest: `sha256:${"7".repeat(64)}`,
      evidenceDigest: `sha256:${"8".repeat(64)}`,
    }),
    lythKeys.signer,
  );
  return {
    transfer,
    expectedStages: Object.freeze(["slide.physicalize-scalar.v1", "lyth.proof-work.v1"]),
    entries: Object.freeze([
      Object.freeze({ receipt: slideReceipt, verifier: slideKeys.verifier }),
      Object.freeze({ receipt: lythReceipt, verifier: lythKeys.verifier }),
    ]),
    slideReceipt,
    lythReceipt,
  };
}

test("stage evidence sets authenticate every receipt and bind one closed run, epoch, context and order", async () => {
  const fixture = await stageEvidenceFixture();
  const evidenceSet = await deriveStageEvidenceSetV1({
    runIdentity: fixture.transfer.runIdentity,
    authorityEpoch: fixture.transfer.authorityEpoch,
    authorityContextDigest: fixture.transfer.authorityContextDigest,
    expectedStages: fixture.expectedStages,
    entries: fixture.entries,
  });

  assert.deepEqual(evidenceSet.stages, fixture.expectedStages);
  assert.deepEqual(evidenceSet.receiptDigests, [
    fixture.slideReceipt.receiptDigest,
    fixture.lythReceipt.receiptDigest,
  ]);
  assert.match(evidenceSet.evidenceSetDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(evidenceSet), true);
  assert.equal(Object.isFrozen(evidenceSet.receiptDigests), true);

  await assert.rejects(
    deriveStageEvidenceSetV1({
      runIdentity: fixture.transfer.runIdentity,
      authorityEpoch: fixture.transfer.authorityEpoch,
      authorityContextDigest: fixture.transfer.authorityContextDigest,
      expectedStages: fixture.expectedStages,
      entries: Object.freeze([...fixture.entries].reverse()),
    }),
    assertArtifactError("EVIDENCE_SET_ORDER"),
  );
  await assert.rejects(
    deriveStageEvidenceSetV1({
      runIdentity: fixture.transfer.runIdentity,
      authorityEpoch: fixture.transfer.authorityEpoch + 1,
      authorityContextDigest: fixture.transfer.authorityContextDigest,
      expectedStages: fixture.expectedStages,
      entries: fixture.entries,
    }),
    assertArtifactError("EVIDENCE_SET_BINDING"),
  );
});

test("stage evidence sets refuse caller-made receipt authentication and duplicate stage policy", async () => {
  const fixture = await stageEvidenceFixture();
  const forgedReceipt = {
    ...fixture.slideReceipt,
    authentication: Buffer.alloc(32).toString("base64"),
  };
  await assert.rejects(
    deriveStageEvidenceSetV1({
      runIdentity: fixture.transfer.runIdentity,
      authorityEpoch: fixture.transfer.authorityEpoch,
      authorityContextDigest: fixture.transfer.authorityContextDigest,
      expectedStages: fixture.expectedStages,
      entries: Object.freeze([
        Object.freeze({ ...fixture.entries[0], receipt: forgedReceipt }),
        fixture.entries[1],
      ]),
    }),
    assertArtifactError("EVIDENCE_SET_AUTHENTICATION"),
  );
  await assert.rejects(
    deriveStageEvidenceSetV1({
      runIdentity: fixture.transfer.runIdentity,
      authorityEpoch: fixture.transfer.authorityEpoch,
      authorityContextDigest: fixture.transfer.authorityContextDigest,
      expectedStages: Object.freeze([fixture.expectedStages[0], fixture.expectedStages[0]]),
      entries: fixture.entries,
    }),
    assertArtifactError("EVIDENCE_SET_ORDER"),
  );
});

test("VOK Envelope construction preserves the existing exact subject and never carries Signet authority", async () => {
  const fixture = await stageEvidenceFixture();
  const evidenceSet = await deriveStageEvidenceSetV1({
    runIdentity: fixture.transfer.runIdentity,
    authorityEpoch: fixture.transfer.authorityEpoch,
    authorityContextDigest: fixture.transfer.authorityContextDigest,
    expectedStages: fixture.expectedStages,
    entries: fixture.entries,
  });
  const envelopeInput = {
    schemaVersion: 1,
    componentDigest: `sha256:${"1".repeat(64)}`,
    policyDigest: `sha256:${"2".repeat(64)}`,
    target: "slide-scalar-reference",
    abi: "galerina.detached-scalar.v1",
    dependencyClosureDigest: `sha256:${"3".repeat(64)}`,
    capabilityDigest: `sha256:${"4".repeat(64)}`,
    buildPoint: `git:${"5".repeat(40)}`,
    epoch: fixture.transfer.authorityEpoch,
    evidenceSet,
  };
  const envelope = createVokEnvelopeV1(envelopeInput);

  assert.deepEqual(Object.keys(envelope).sort(), [
    "abi",
    "buildPoint",
    "capabilityDigest",
    "componentDigest",
    "dependencyClosureDigest",
    "epoch",
    "evidenceSetDigest",
    "policyDigest",
    "schemaVersion",
    "target",
  ]);
  assert.equal(envelope.evidenceSetDigest, evidenceSet.evidenceSetDigest);
  assert.equal("signet" in envelope, false);
  assert.equal("executionAuthorized" in envelope, false);
  assert.deepEqual(validateVokEnvelopeV1(envelope), envelope);
  assert.throws(
    () => validateVokEnvelopeV1({ ...envelope, signet: "caller-made" }),
    assertArtifactError("VOK_ENVELOPE_KEYS"),
  );
  assert.throws(
    () => validateVokEnvelopeV1(fixture.transfer),
    assertArtifactError("VOK_ENVELOPE_KEYS"),
  );
  assert.throws(
    () => createVokEnvelopeV1({ ...envelopeInput, epoch: fixture.transfer.authorityEpoch + 1 }),
    assertArtifactError("VOK_ENVELOPE_BINDING"),
  );
});

test("VOK Envelope validation rejects accessors without invoking them", () => {
  let reads = 0;
  const envelope = {
    schemaVersion: 1,
    componentDigest: `sha256:${"1".repeat(64)}`,
    policyDigest: `sha256:${"2".repeat(64)}`,
    target: "slide-scalar-reference",
    abi: "galerina.detached-scalar.v1",
    dependencyClosureDigest: `sha256:${"3".repeat(64)}`,
    capabilityDigest: `sha256:${"4".repeat(64)}`,
    buildPoint: `git:${"5".repeat(40)}`,
    epoch: 7,
    evidenceSetDigest: `sha256:${"6".repeat(64)}`,
  };
  Object.defineProperty(envelope, "target", {
    enumerable: true,
    get() { reads += 1; return "hostile"; },
  });
  assert.throws(() => validateVokEnvelopeV1(envelope), assertArtifactError("VOK_ENVELOPE_FIELD"));
  assert.equal(reads, 0);
});
