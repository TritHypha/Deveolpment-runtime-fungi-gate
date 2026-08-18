import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { run } from "../dist/index.js";
import { compileDetachedCanonicalGirToScalarSlide } from "../../../../SLIDE/src/checked-module-snapshot-scalar-compiler.mjs";
import { planRepresentationProfile } from "../../../../SLIDE/src/representation-profile-registry.mjs";
import {
  bindDetachedScalarHostAuthority,
  deriveDetachedScalarContext,
  deriveDetachedScalarLythEvidenceDigest,
  executePreparedDetachedScalarVok,
  inspectTypedPackageExecutionReceiptV3,
  prepareDetachedScalarVok,
} from "../../../../SLIDE/src/typed-package-execution-receipt-v3.mjs";
import { runDetachedScalarAdapter } from "../../../../lyth-weaver/tools/adapter/adapter.ts";

const SOURCE = `@version 1
pure flow answer() -> Int {
  return 42
}
`;
const AUTHORITY_EPOCH = 11;

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function marker(character) {
  return `sha256:${character.repeat(64)}`;
}

function mutate(bytes, seed) {
  const changed = Uint8Array.from(bytes);
  const index = seed % changed.length;
  changed[index] ^= (seed % 251) + 1;
  return changed;
}

function galerinaRepository() {
  const bodies = new Map();
  return {
    owner: "galerina",
    async write(kind, bytes) {
      const body = Uint8Array.from(bytes);
      const reference = Object.freeze({
        schema: "galerina.artifact-reference.v1",
        owner: "galerina",
        kind,
        digest: digest(body),
        byteLength: body.length,
      });
      bodies.set(reference.digest, body);
      return reference;
    },
    async read(reference) {
      const body = bodies.get(reference.digest);
      if (body === undefined) throw new Error("artifact body is absent");
      return Uint8Array.from(body);
    },
  };
}

function readOnlyRepository(bytes, transform = (value) => value) {
  return {
    async read() {
      return Uint8Array.from(transform(Uint8Array.from(bytes)));
    },
  };
}

function stageReceipts(manifest, lythEvidenceDigest) {
  const live = new WeakSet();
  const subjects = [
    ["SOURCE", "galerina", manifest.sourceDigest],
    ["SNAPSHOT", "galerina", manifest.checkedSnapshotDigest],
    ["GIR", "galerina", manifest.girDigest],
    ["PHYSICAL", "slide", manifest.physicalDigest],
    ["LYTH", "lyth", lythEvidenceDigest],
  ];
  const receipts = Object.freeze(subjects.map(([stage, owner, subjectDigest], sequence) => {
    const receiptDigest = digest(Buffer.from(JSON.stringify({
      stage,
      owner,
      runIdentity: manifest.runIdentity,
      authorityEpoch: AUTHORITY_EPOCH,
      subjectDigest,
      sequence,
    }), "utf8"));
    const receipt = Object.freeze({
      schema: "slide.detached-scalar-stage-receipt.v3",
      stage,
      owner,
      runIdentity: manifest.runIdentity,
      authorityEpoch: AUTHORITY_EPOCH,
      subjectDigest,
      receiptDigest,
    });
    live.add(receipt);
    return receipt;
  }));
  return { receipts, live };
}

async function buildChain() {
  const repository = galerinaRepository();
  const detached = await run(SOURCE, "answer.fungi", "answer", new Map(), {
    mode: "detached-reference",
    detachedReference: {
      repository,
      compilerCommit: `git:${"e".repeat(40)}`,
      compilerVersion: "galerina-core-compiler@detached-scalar-integration",
      checkerProfileVersion: "galerina.checked-module.profile.v1",
    },
  });
  assert.equal(detached.ok, true);
  assert.equal(detached.detachedReference?.accepted, true);
  assert.equal(detached.detachedReference?.executionAuthorized, false);

  const gir = detached.detachedReference.gir;
  const profilePlan = planRepresentationProfile({
    preferredProfileIds: ["trit.scalar.v1"],
    availableTargetIds: ["slide.serial-reference-coordinator.v1"],
    availableProviderIds: ["slide.scalar-js-reference-provider.v1"],
  });
  assert.equal(profilePlan.kind, "CANDIDATE_PLAN");
  const runIdentity = marker("1");
  const executionPolicyDigest = marker("4");
  const compiled = await compileDetachedCanonicalGirToScalarSlide({
    girReference: gir.reference,
    repository: readOnlyRepository(gir.bytes),
    profilePlan,
    runIdentity,
    sourceDigest: digest(Buffer.from(SOURCE, "utf8")),
    checkedSnapshotDigest: detached.detachedReference.snapshot.digest,
    executionPolicyDigest,
    artifactId: "galerina.detached-scalar.integration",
    entryFunctionId: 1,
  });
  assert.equal(compiled.kind, "PHYSICAL_SLIDE");

  const physicalRepository = readOnlyRepository(compiled.physicalBytes);
  const lythEvidence = await runDetachedScalarAdapter({
    physicalReference: compiled.physicalReference,
    repository: physicalRepository,
    manifest: compiled.manifest,
    proofRuleIdentity: "proof:detached-scalar-v1",
    registryClosureIdentity: "registry:parent-v2c",
    platformProfileIdentity: "platform:reference-js",
    cryptoSuiteIdentity: "crypto:sha256-test",
    publicKeyEpoch: `epoch:${AUTHORITY_EPOCH}`,
    revocationEpoch: `epoch:${AUTHORITY_EPOCH}`,
    currentPublicKeyEpoch: `epoch:${AUTHORITY_EPOCH}`,
    currentRevocationEpoch: `epoch:${AUTHORITY_EPOCH}`,
    effectClosureIdentity: "effects:pure-scalar",
    reuseEvidence: Object.freeze({ kind: "ABSENT_PRODUCTION_DFE" }),
  });
  assert.equal(lythEvidence.verdict, "evidence");
  assert.equal(lythEvidence.admissionAuthority, false);
  const lythEvidenceDigest = deriveDetachedScalarLythEvidenceDigest(lythEvidence, compiled.manifest);
  const stages = stageReceipts(compiled.manifest, lythEvidenceDigest);
  const context = deriveDetachedScalarContext(compiled.manifest);
  assert.equal(context.kind, "CONTEXT");
  const boundAuthority = bindDetachedScalarHostAuthority(Object.freeze({
    authorityEpoch: AUTHORITY_EPOCH,
    currentAuthorityEpoch: AUTHORITY_EPOCH,
    acceptedTargetDigest: context.targetDigest,
    acceptedPolicyDigest: context.policyDigest,
    acceptedVerifierDigest: context.verifierDigest,
    verifyStageReceipt(receipt) { return stages.live.has(receipt); },
    isSubjectRevoked() { return false; },
  }));
  assert.equal(boundAuthority.status, "HOST_AUTHORITY_BOUND_REFERENCE_ONLY");
  return {
    detached,
    gir,
    profilePlan,
    compiled,
    physicalRepository,
    lythEvidence,
    lythEvidenceDigest,
    stageReceipts: stages.receipts,
    authority: boundAuthority.handle,
  };
}

function prepareRequest(chain, overrides = {}) {
  return {
    physicalReference: chain.compiled.physicalReference,
    repository: chain.physicalRepository,
    manifest: chain.compiled.manifest,
    lythEvidence: chain.lythEvidence,
    authority: chain.authority,
    stageReceipts: chain.stageReceipts,
    ...overrides,
  };
}

function execute(handle) {
  return executePreparedDetachedScalarVok(handle, {
    arguments: Object.freeze([]),
    stepMaximum: 96,
    terminalDirective: "EXECUTE",
    cleanup() { return true; },
  });
}

async function successfulFreshProcessChain() {
  const chain = await buildChain();
  const prepared = await prepareDetachedScalarVok(prepareRequest(chain));
  assert.equal(prepared.status, "VOK_LEASE_READY");
  const terminal = execute(prepared.handle);
  assert.equal(terminal.status, "SUCCEEDED");
  assert.equal(terminal.value, 42);
  const receipt = inspectTypedPackageExecutionReceiptV3(terminal.receipt);
  assert.equal(receipt.verdict, 1);
  return {
    status: terminal.status,
    value: terminal.value,
    receiptDigest: receipt.receiptDigest,
    sourceDigest: receipt.runIdentity === chain.compiled.manifest.runIdentity
      ? chain.compiled.manifest.sourceDigest
      : "mismatch",
  };
}

if (process.env.GALERINA_DETACHED_SCALAR_CHILD === "1") {
  process.stdout.write(`${JSON.stringify(await successfulFreshProcessChain())}\n`);
} else {
  test("fresh process completes source through VOK and emits a live v3 receipt", () => {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { ...process.env, GALERINA_DETACHED_SCALAR_CHILD: "1" },
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout.trim());
    assert.deepEqual({ status: output.status, value: output.value }, { status: "SUCCEEDED", value: 42 });
    assert.match(output.receiptDigest, /^sha256:[0-9a-f]{64}$/u);
    assert.match(output.sourceDigest, /^sha256:[0-9a-f]{64}$/u);
  });

  test("seeded mutation at every transfer arrow produces zero authorization", async () => {
    const chain = await buildChain();
    const manifestMutations = [
      { ...chain.compiled.manifest, sourceDigest: marker("9") },
      { ...chain.compiled.manifest, checkedSnapshotDigest: marker("8") },
    ];
    for (const manifest of manifestMutations) {
      const prepared = await prepareDetachedScalarVok(prepareRequest(chain, { manifest }));
      assert.equal(prepared.status, "REFUSED");
    }

    for (const seed of [7, 31, 113]) {
      const girRefusal = await compileDetachedCanonicalGirToScalarSlide({
        girReference: chain.gir.reference,
        repository: readOnlyRepository(chain.gir.bytes, (bytes) => mutate(bytes, seed)),
        profilePlan: chain.profilePlan,
        runIdentity: chain.compiled.manifest.runIdentity,
        sourceDigest: chain.compiled.manifest.sourceDigest,
        checkedSnapshotDigest: chain.compiled.manifest.checkedSnapshotDigest,
        executionPolicyDigest: chain.compiled.manifest.executionPolicyDigest,
        artifactId: "galerina.detached-scalar.integration",
        entryFunctionId: 1,
      });
      assert.equal(girRefusal.kind, "REFUSAL");

      const physicalRefusal = await prepareDetachedScalarVok(prepareRequest(chain, {
        repository: readOnlyRepository(chain.compiled.physicalBytes, (bytes) => mutate(bytes, seed)),
      }));
      assert.equal(physicalRefusal.status, "REFUSED");
    }

    const profileRefusal = await compileDetachedCanonicalGirToScalarSlide({
      girReference: chain.gir.reference,
      repository: readOnlyRepository(chain.gir.bytes),
      profilePlan: Object.freeze({ ...chain.profilePlan }),
      runIdentity: chain.compiled.manifest.runIdentity,
      sourceDigest: chain.compiled.manifest.sourceDigest,
      checkedSnapshotDigest: chain.compiled.manifest.checkedSnapshotDigest,
      executionPolicyDigest: chain.compiled.manifest.executionPolicyDigest,
      artifactId: "galerina.detached-scalar.integration",
      entryFunctionId: 1,
    });
    assert.equal(profileRefusal.kind, "REFUSAL");

    assert.equal((await prepareDetachedScalarVok(prepareRequest(chain, {
      lythEvidence: Object.freeze({ ...chain.lythEvidence, physicalDigest: marker("7") }),
    }))).status, "REFUSED");
    assert.equal((await prepareDetachedScalarVok(prepareRequest(chain, {
      stageReceipts: Object.freeze(chain.stageReceipts.map((receipt, index) => index === 2
        ? Object.freeze({ ...receipt })
        : receipt)),
    }))).status, "REFUSED");
    assert.equal((await prepareDetachedScalarVok(prepareRequest(chain, {
      authority: Object.freeze({ ...chain.authority, currentAuthorityEpoch: AUTHORITY_EPOCH + 1 }),
    }))).status, "REFUSED");

    const prepared = await prepareDetachedScalarVok(prepareRequest(chain));
    assert.equal(prepared.status, "VOK_LEASE_READY");
    assert.equal(execute(Object.freeze({ ...prepared.handle })).status, "REFUSED");
    assert.equal(execute(prepared.handle).status, "SUCCEEDED");
    assert.equal(execute(prepared.handle).status, "REFUSED");
  });
}
