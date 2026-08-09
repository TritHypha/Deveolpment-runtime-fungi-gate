import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildReceiptBoundSlidePackage,
  digestRuntimeFile,
  slideToolManifestDigest,
} from "../lib/receipt-bound-slide-build.mjs";
import { createDisposableSlideObjectAuthenticator } from "./helpers/disposable-slide-object-authentication.mjs";
import {
  admitAuthenticatedSlideRestoreProfile,
  admitProductionBootCompositionCandidate,
  admitRegistryDurabilityProfile,
  isProductionBootCompositionCandidate,
  verifyRegistryDurabilityEvidence,
} from "../../packages-galerina/galerina-framework-app-kernel/dist/index.js";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const TEMP = [];
const PIN_PATH = join(ROOT, "docs", "security", "slide-reference-tool-pin.json");
const MANIFEST_PATH = join(ROOT, "docs", "security", "slide-source-manifests", "restore-verdict-v1.json");
const PUBLICATION = join(ROOT, "build", "slide-package-candidates", "restore-verdict-v1", "publication");
const SOURCE_PATH = join(
  ROOT,
  "packages-galerina",
  "galerina-core-sentinel-state",
  "src",
  "self-hosted",
  "cold-boot.fungi",
);
const SOURCE_DIGEST = "5040e0b1ff890f602b8629f6205cee95f4236c502a446579f9184f27d22cf996";
const GALERINA_COMMIT = "a".repeat(40);
const FIXTURE_DIGEST = (value) => `sha256:${value.repeat(64)}`;
const DURABILITY_BOUNDARIES = Object.freeze([
  "DIRECTORY_BARRIER",
  "FILE_BARRIER",
  "PROCESS_TERMINATION",
]);
const RESTORE_VECTORS = Object.freeze([
  Object.freeze([true, true]),
  Object.freeze([true, false]),
  Object.freeze([false, true]),
  Object.freeze([false, false]),
]);
const ALL_ALLOW = Object.freeze({
  identity: 1,
  provenance: 1,
  target: 1,
  effects: 1,
  policy: 1,
  revocation: 1,
  validation: 1,
  memory: 1,
});

after(async () => {
  await Promise.all(TEMP.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}

function authenticatedExpectation(receipt) {
  return {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: receipt.packageIdentity,
    exportName: receipt.exportName,
    slideBundleDigest: receipt.slideBundleDigest,
    compilerProfileId: receipt.compilerProfileId,
    toolManifestDigest: receipt.toolManifestDigest,
    currentEpoch: receipt.currentEpoch,
    authenticationConsumptionDigest: receipt.authenticationConsumptionDigest,
    typedReceiptDigest: receipt.typedReceiptDigest,
    receiptDigest: receipt.receiptDigest,
    typedReceiptExpectation: {
      packageSetDigest: receipt.typedReceipt.packageSetDigest,
      packageIdentity: receipt.typedReceipt.packageIdentity,
      exportName: receipt.typedReceipt.exportName,
      receiptDigest: receipt.typedReceipt.receiptDigest,
      safeValueTypeId: receipt.typedReceipt.safeValueTypeId,
      safeValueStateId: receipt.typedReceipt.safeValueStateId,
      safeValueProvenanceDigest: receipt.typedReceipt.safeValueProvenanceDigest,
    },
  };
}

async function publishedObject() {
  const receipt = JSON.parse(await readFile(join(PUBLICATION, "package-set.receipt.json"), "utf8"));
  const artifact = receipt.artifacts[0];
  const objectBytes = new Uint8Array(
    await readFile(join(PUBLICATION, basename(artifact.fileName))),
  );
  return {
    objectBytes,
    objectSha256: `sha256:${sha256(objectBytes)}`,
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: "@galerina/core-sentinel-state",
    exportName: "restoreVerdict",
    slideBundleDigest: artifact.slideBundleDigest,
    packageDescriptorDigest: artifact.packageDescriptorDigest,
    compilerProfileId: artifact.compilerProfileId,
  };
}

/** Prepares a fixed number of single-use authenticated physical executions. */
async function receiptExecutionQueue(loader, hybrid, manifest, pin, executionCount) {
  const handles = [];
  const observations = [];
  const inputs = [];
  const published = await publishedObject();
  const authenticator = createDisposableSlideObjectAuthenticator(hybrid, {
    ...published,
    toolManifestDigest: pin.toolManifestDigest,
  });
  assert.equal(authenticator.verdict, 1);
  for (let index = 0; index < executionCount; index += 1) {
    const prepared = await loader.prepareCheckedFungiPackagePublication({
      publicationDirectory: PUBLICATION,
      packageIdentity: "@galerina/core-sentinel-state",
      exportName: "restoreVerdict",
      context: manifest.context,
      gates: ALL_ALLOW,
    });
    assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
    const authenticated = authenticator.openHandle();
    assert.equal(authenticated.verdict, 1, JSON.stringify(authenticated));
    handles.push({
      packageExecutionHandle: prepared.packageExecutionHandle,
      authenticatedObjectHandle: authenticated.authenticatedObjectHandle,
    });
  }

  return {
    observations,
    inputs,
    published,
    executeAndVerify(snapshotPresent, integrityOk) {
      const selected = handles.shift();
      assert.notEqual(selected, undefined, "one prepared affine handle per execution");
      const receipt = loader.executeAuthenticatedTypedCheckedFungiPackagePublication(
        selected.packageExecutionHandle,
        selected.authenticatedObjectHandle,
        [snapshotPresent, integrityOk],
        { steps: 64 },
        { toolManifestDigest: pin.toolManifestDigest, currentEpoch: 15 },
      );
      assert.equal(
        receipt.status,
        "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
        JSON.stringify(receipt),
      );
      assert.equal(receipt.fallbackInvoked, false);
      const verified = loader.verifyAuthenticatedTypedCheckedFungiPackageReceipt(
        receipt,
        authenticatedExpectation(receipt),
      );
      assert.equal(verified.verdict, 1, JSON.stringify(verified));
      assert.equal(receipt.typedReceipt.safeValueTypeId, 1);
      assert.equal(receipt.typedReceipt.safeValueStateId, 2);
      assert.match(receipt.typedReceipt.safeValueProvenanceDigest, /^sha256:[0-9a-f]{64}$/u);
      const observation = Object.freeze({
        schema: "galerina.production-slide-restore.observation.v1",
        status: "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
        packageIdentity: published.packageIdentity,
        exportName: published.exportName,
        objectSha256: published.objectSha256,
        packageSetDigest: published.packageSetDigest,
        slideBundleDigest: published.slideBundleDigest,
        packageDescriptorDigest: published.packageDescriptorDigest,
        compilerProfileId: published.compilerProfileId,
        toolManifestDigest: receipt.toolManifestDigest,
        currentEpoch: receipt.currentEpoch,
        safeValueTypeId: "Int",
        safeValueStateId: "safe.scalar.int.v1",
        safeValueProvenanceDigest:
          receipt.typedReceipt.safeValueProvenanceDigest,
        fallbackInvoked: false,
        verificationVerdict: 1,
        value: verified.value,
      });
      inputs.push(Object.freeze([snapshotPresent, integrityOk]));
      observations.push(observation);
      return observation;
    },
    remaining() {
      return handles.length;
    },
  };
}

/** Produces deliberately disposable, non-authorizing durability evidence. */
function disposableDurabilityProfile() {
  const evidence = verifyRegistryDurabilityEvidence({
    schema: "galerina.registry.durability.evidence.v1",
    evidenceClass: "PRODUCTION_ADMISSION",
    evidenceId: FIXTURE_DIGEST("a"),
    repositoryCommit: GALERINA_COMMIT,
    platform: "windows",
    architecture: "x86_64",
    operatingSystem: "windows-10",
    filesystem: "ntfs",
    storageProfileDigest: FIXTURE_DIGEST("b"),
    implementationDigest: FIXTURE_DIGEST("6"),
    boundaryIds: [...DURABILITY_BOUNDARIES],
    checks: {
      controlledPowerLoss: "PASS",
      controlledReboot: "PASS",
      functionalPortability: "PASS",
      nativeLive: "PASS",
      processTermination: "PASS",
      productionAdmission: "PASS",
    },
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
    verdict: 0,
  }, {
    expectedRepositoryCommit: GALERINA_COMMIT,
    expectedPlatform: "windows",
    expectedArchitecture: "x86_64",
    expectedOperatingSystem: "windows-10",
    requiredBoundaryIds: [...DURABILITY_BOUNDARIES],
  });
  return admitRegistryDurabilityProfile({
    schema: "galerina.registry.durability.production-manifest.v1",
    adapterId: "galerina.registry.durability.windows.v1",
    sourceDigest: FIXTURE_DIGEST("6"),
    contractDigest: FIXTURE_DIGEST("f"),
    binaryDigest: FIXTURE_DIGEST("7"),
    buildRecipeDigest: FIXTURE_DIGEST("8"),
    toolchainDigest: FIXTURE_DIGEST("9"),
    evidenceId: FIXTURE_DIGEST("a"),
    repositoryCommit: GALERINA_COMMIT,
    platform: "windows",
    architecture: "x86_64",
    operatingSystem: "windows-10",
    filesystem: "ntfs",
    storageProfileDigest: FIXTURE_DIGEST("b"),
    generationId: "d".repeat(64),
    operationalKeyId: "slide-object-signer-v1",
    delegationSerial: 7,
    indexIssuedAt: "2026-08-09T06:00:00.000Z",
    acceptedCheckpointDigest: FIXTURE_DIGEST("c"),
    notBefore: "2026-08-09T00:00:00.000Z",
    notAfter: "2026-08-10T00:00:00.000Z",
    rootSignature: {
      algorithm: "Ed25519+ML-DSA-65",
      keyId: "offline-root-v1",
      ed25519Signature: "ed25519-public-test-signature",
      mlDsa65Signature: "mldsa65-public-test-signature",
      canon: "jcs",
      context: "galerina.registry.durability.production.sig.v1",
    },
  }, evidence, {
    schema: "galerina.registry.durability.production-authority.v1",
    expectedRootKeyId: "offline-root-v1",
    expectedOperationalKeyId: "slide-object-signer-v1",
    at: "2026-08-09T12:00:00.000Z",
    minDelegationSerial: 6,
    isRevoked: () => false,
    verifyRootEd25519: (message, signature, keyId) =>
      message.length > 0
      && signature === "ed25519-public-test-signature"
      && keyId === "offline-root-v1",
    verifyRootMlDsa65: (message, signature, keyId) =>
      message.length > 0
      && signature === "mldsa65-public-test-signature"
      && keyId === "offline-root-v1",
  });
}

/**
 * Joins real physical SLIDE executions to disposable authentication and
 * durability evidence. The result remains K3 0 and exposes no authority port.
 */
async function productionBootComposition(loader, hybrid, manifest, pin) {
  const preflight = await receiptExecutionQueue(loader, hybrid, manifest, pin, 4);
  for (const [snapshotPresent, integrityOk] of RESTORE_VECTORS) {
    preflight.executeAndVerify(snapshotPresent, integrityOk);
  }
  assert.equal(preflight.remaining(), 0);
  const safeValueProvenanceDigests = preflight.observations.map(
    (observation) => observation.safeValueProvenanceDigest,
  );
  assert.equal(new Set(safeValueProvenanceDigests).size, 4);

  const published = await publishedObject();
  const slideManifest = {
    schema: "galerina.production-slide-restore.manifest.v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: pin.repositoryCommit,
    packageIdentity: published.packageIdentity,
    exportName: published.exportName,
    objectSha256: published.objectSha256,
    packageSetDigest: published.packageSetDigest,
    slideBundleDigest: published.slideBundleDigest,
    packageDescriptorDigest: published.packageDescriptorDigest,
    compilerProfileId: published.compilerProfileId,
    toolManifestDigest: pin.toolManifestDigest,
    safeValueTypeId: "Int",
    safeValueStateId: "safe.scalar.int.v1",
    safeValueProvenanceDigests,
    currentEpoch: 15,
    rootKeyId: "offline-root-v1",
    operationalKeyId: "slide-object-signer-v1",
    delegationSerial: 7,
    notBefore: "2026-08-09T00:00:00.000Z",
    notAfter: "2026-08-10T00:00:00.000Z",
    ed25519Signature: "ed25519-public-test-signature",
    mlDsa65Signature: "mldsa65-public-test-signature",
  };
  const slideAuthority = {
    schema: "galerina.production-slide-restore.authority.v1",
    at: "2026-08-09T12:00:00.000Z",
    minDelegationSerial: 6,
    expectedRootKeyId: "offline-root-v1",
    expectedOperationalKeyId: "slide-object-signer-v1",
    isRevoked: () => false,
    digestObject: (bytes) => `sha256:${sha256(bytes)}`,
    verifyEd25519: (preimage, signature, keyId) =>
      preimage.length > 0
      && signature === "ed25519-public-test-signature"
      && keyId === "slide-object-signer-v1",
    verifyMlDsa65: (preimage, signature, keyId) =>
      preimage.length > 0
      && signature === "mldsa65-public-test-signature"
      && keyId === "slide-object-signer-v1",
  };
  const admission = await receiptExecutionQueue(loader, hybrid, manifest, pin, 4);
  const slideProfile = admitAuthenticatedSlideRestoreProfile(
    slideManifest,
    published.objectBytes,
    slideAuthority,
    {
      schema: "galerina.production-slide-restore.execution-port.v1",
      executeAndVerify: admission.executeAndVerify,
    },
  );
  assert.equal(admission.remaining(), 0);

  const durabilityProfile = disposableDurabilityProfile();
  const policy = {
    schema: "galerina.production-boot-composition.policy.v1",
    releaseId: "galerina-beta-v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: pin.repositoryCommit,
    packageIdentity: published.packageIdentity,
    exportName: published.exportName,
    objectSha256: published.objectSha256,
    packageSetDigest: published.packageSetDigest,
    slideBundleDigest: published.slideBundleDigest,
    packageDescriptorDigest: published.packageDescriptorDigest,
    compilerProfileId: published.compilerProfileId,
    toolManifestDigest: pin.toolManifestDigest,
    safeValueTypeId: "Int",
    safeValueStateId: "safe.scalar.int.v1",
    safeValueProvenanceDigests,
    currentEpoch: 15,
    rootKeyId: "offline-root-v1",
    operationalKeyId: "slide-object-signer-v1",
    platform: durabilityProfile.platform,
    architecture: durabilityProfile.architecture,
    operatingSystem: durabilityProfile.operatingSystem,
    filesystem: durabilityProfile.filesystem,
    durabilityAdapterId: durabilityProfile.adapterId,
    durabilityAdapterDigest: durabilityProfile.durabilityAdapterDigest,
    durabilityBinaryDigest: durabilityProfile.binaryDigest,
    buildRecipeDigest: durabilityProfile.buildRecipeDigest,
    toolchainDigest: durabilityProfile.toolchainDigest,
    evidenceId: durabilityProfile.evidenceId,
    storageProfileDigest: durabilityProfile.storageProfileDigest,
    acceptedCheckpointDigest: durabilityProfile.acceptedCheckpointDigest,
    generationId: durabilityProfile.generationId,
    minDelegationSerial: durabilityProfile.minDelegationSerial,
    notBefore: durabilityProfile.notBefore,
    notAfter: durabilityProfile.notAfter,
  };
  const candidate = admitProductionBootCompositionCandidate(
    policy,
    slideProfile,
    durabilityProfile,
  );

  const consumer = await receiptExecutionQueue(loader, hybrid, manifest, pin, 3);
  const decisionAuthority = Object.freeze({
    packageIdentity: published.packageIdentity,
    exportName: published.exportName,
    restoreVerdict(snapshotPresent, integrityOk) {
      return consumer.executeAndVerify(snapshotPresent, integrityOk).value;
    },
    remaining: consumer.remaining,
  });
  return { candidate, decisionAuthority, preflight, admission, consumer };
}

async function authority() {
  const pinBytes = await readFile(PIN_PATH);
  const manifestBytes = await readFile(MANIFEST_PATH);
  const pin = JSON.parse(pinBytes.toString("utf8"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(`${JSON.stringify(pin, null, 2)}\n`, pinBytes.toString("utf8"));
  assert.equal(`${JSON.stringify(manifest, null, 2)}\n`, manifestBytes.toString("utf8"));
  assert.equal(exactKeys(pin, ["schema", "repositoryCommit", "toolManifestDigest", "toolFileCount"]), true);
  assert.equal(pin.schema, "galerina.slide.reference-tool-pin.v1");
  assert.equal(pin.repositoryCommit, "39920eb997a27bcb8deb937dcd97ef59612245aa");
  assert.equal(pin.toolFileCount, 89);
  assert.equal(exactKeys(manifest, ["schema", "context", "packages"]), true);
  assert.equal(manifest.schema, "slide.checked-fungi.source-manifest.v1");
  const source = await readFile(SOURCE_PATH);
  assert.equal(sha256(source), SOURCE_DIGEST);
  const toolManifestPath = join(SLIDE_ROOT, "governance", "checked-fungi-package-tool-manifest.json");
  const toolManifestBytes = await readFile(toolManifestPath);
  assert.equal(slideToolManifestDigest(toolManifestBytes), pin.toolManifestDigest);
  return { pin, manifest, toolManifestPath };
}

describe("Contract 85 real restoreVerdict source candidate", () => {
  it("re-admits and executes the committed source-free publication", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, manifest } = await authority();
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const hybrid = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "hybrid-object-authentication.mjs"),
    ).href);
    const authenticator = createDisposableSlideObjectAuthenticator(hybrid, {
      ...await publishedObject(),
      toolManifestDigest: pin.toolManifestDigest,
    });
    assert.equal(authenticator.verdict, 1);
    for (const [arguments_, expected] of [
      [[true, true], 1],
      [[false, true], -1],
      [[true, false], -1],
    ]) {
      const prepared = await loader.prepareCheckedFungiPackagePublication({
        publicationDirectory: PUBLICATION,
        packageIdentity: "@galerina/core-sentinel-state",
        exportName: "restoreVerdict",
        context: manifest.context,
        gates: ALL_ALLOW,
      });
      assert.equal(prepared.verdict, 1, JSON.stringify(prepared));
      const authenticated = authenticator.openHandle();
      assert.equal(authenticated.verdict, 1, JSON.stringify(authenticated));
      const receipt = loader.executeAuthenticatedTypedCheckedFungiPackagePublication(
        prepared.packageExecutionHandle,
        authenticated.authenticatedObjectHandle,
        arguments_,
        { steps: 64 },
        { toolManifestDigest: pin.toolManifestDigest, currentEpoch: 15 },
      );
      assert.equal(
        receipt.status,
        "SUCCEEDED_AUTHENTICATED_PHYSICAL_REFERENCE_ONLY",
        JSON.stringify(receipt),
      );
      const verified = loader.verifyAuthenticatedTypedCheckedFungiPackageReceipt(
        receipt,
        authenticatedExpectation(receipt),
      );
      assert.equal(verified.verdict, 1, JSON.stringify(verified));
      assert.equal(verified.value, expected);
      assert.equal(receipt.fallbackInvoked, false);
    }
  });

  it("rebuilds the exact artifact with the pinned SLIDE tool", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, toolManifestPath } = await authority();
    const parent = await mkdtemp(join(ROOT, "build", "contract85-rebuild-"));
    TEMP.push(parent);
    const rebuilt = join(parent, "publication");
    const result = await buildReceiptBoundSlidePackage({
      rootDirectory: ROOT,
      sourceManifestPath: MANIFEST_PATH,
      outputDirectory: rebuilt,
      slideToolRoot: SLIDE_ROOT,
      slideToolManifestPath: toolManifestPath,
      expectedSlideToolManifestDigest: pin.toolManifestDigest,
      expectedRuntimeDigest: await digestRuntimeFile(process.execPath),
    });
    assert.equal(result.verdict, 1, JSON.stringify(result));
    assert.equal(result.artifactCount, 1);
    const artifactName = result.outputFiles.find((name) => name.endsWith(".slide"));
    assert.equal(typeof artifactName, "string");
    assert.deepEqual(
      await readFile(join(rebuilt, artifactName)),
      await readFile(join(PUBLICATION, artifactName)),
    );
  });

  it("refuses a one-byte mutation of the committed physical object", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { manifest } = await authority();
    const parent = await mkdtemp(join(tmpdir(), "galerina-contract85-mutant-"));
    TEMP.push(parent);
    const mutant = join(parent, "publication");
    await cp(PUBLICATION, mutant, { recursive: true, errorOnExist: true });
    const receipt = JSON.parse(await readFile(join(mutant, "package-set.receipt.json"), "utf8"));
    const artifactName = basename(receipt.artifacts[0].fileName);
    const artifactPath = join(mutant, artifactName);
    const bytes = await readFile(artifactPath);
    bytes[bytes.length - 1] ^= 1;
    await writeFile(artifactPath, bytes);
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const prepared = await loader.prepareCheckedFungiPackagePublication({
      publicationDirectory: mutant,
      packageIdentity: "@galerina/core-sentinel-state",
      exportName: "restoreVerdict",
      context: manifest.context,
      gates: ALL_ALLOW,
    });
    assert.equal(prepared.verdict, -1);
  });

  it("drives the real cold-boot consumer with receipt-verified decisions", {
    skip: typeof SLIDE_ROOT !== "string" || SLIDE_ROOT.length < 1,
  }, async () => {
    const { pin, manifest } = await authority();
    const loader = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "checked-fungi-package-publication-loader.mjs"),
    ).href);
    const hybrid = await import(pathToFileURL(
      join(SLIDE_ROOT, "src", "hybrid-object-authentication.mjs"),
    ).href);
    const sentinel = await import(pathToFileURL(join(
      ROOT,
      "packages-galerina",
      "galerina-core-sentinel-state",
      "dist",
      "index.js",
    )).href);
    const parent = await mkdtemp(join(ROOT, "build", "contract85-consumer-"));
    TEMP.push(parent);
    const composition = await productionBootComposition(
      loader,
      hybrid,
      manifest,
      pin,
    );
    const { candidate, decisionAuthority } = composition;
    assert.equal(isProductionBootCompositionCandidate(candidate), true);
    assert.equal(candidate.verdict, 0);
    assert.equal(candidate.authenticatedObjectExecution, true);
    assert.equal(candidate.authenticatedPlatformDurability, true);
    assert.equal(candidate.authorityReleased, false);
    assert.equal(candidate.productionAuthorizing, false);
    assert.equal("restoreVerdict" in candidate, false);
    assert.equal(Object.isFrozen(candidate.safeValueProvenanceDigests), true);
    assert.deepEqual(
      candidate.safeValueProvenanceDigests,
      composition.preflight.observations.map(
        (observation) => observation.safeValueProvenanceDigest,
      ),
    );
    assert.equal(composition.preflight.remaining(), 0);
    assert.equal(composition.admission.remaining(), 0);
    const orchestrator = new sentinel.ColdBootOrchestrator(
      new sentinel.StateSerializer(),
      new sentinel.AtomicWriter(parent),
      decisionAuthority,
    );

    orchestrator.checkpoint("valid", { recovered: true }, 85);
    assert.deepEqual(orchestrator.restore("valid"), {
      payload: { recovered: true },
      logicalTick: 85,
    });

    assert.throws(
      () => orchestrator.restore("missing"),
      (error) => error instanceof sentinel.HardenedBorderViolation
        && error.code === "LSS-NOSNAP-001",
    );

    orchestrator.checkpoint("tampered", { recovered: false }, 86);
    const tamperedPath = join(parent, "tampered.snap");
    const tampered = JSON.parse(await readFile(tamperedPath, "utf8"));
    tampered.payloadJson = tampered.payloadJson.replace("false", "true");
    await writeFile(tamperedPath, JSON.stringify(tampered), "utf8");
    assert.throws(
      () => orchestrator.restore("tampered"),
      (error) => error instanceof sentinel.SecurityTrap
        && error.code === "LSS-INTEGRITY-001",
    );
    assert.equal(composition.consumer.remaining(), 0);
    assert.equal(decisionAuthority.remaining(), 0);
    assert.deepEqual(
      composition.consumer.inputs,
      [[true, true], [false, false], [true, false]],
    );
    assert.deepEqual(
      composition.consumer.observations.map(
        (observation) => observation.safeValueProvenanceDigest,
      ),
      [
        candidate.safeValueProvenanceDigests[0],
        candidate.safeValueProvenanceDigests[3],
        candidate.safeValueProvenanceDigests[1],
      ],
    );
    for (const observation of composition.consumer.observations) {
      assert.equal(observation.objectSha256, candidate.objectSha256);
      assert.equal(observation.packageSetDigest, candidate.packageSetDigest);
      assert.equal(observation.slideBundleDigest, candidate.slideBundleDigest);
      assert.equal(
        observation.packageDescriptorDigest,
        candidate.packageDescriptorDigest,
      );
      assert.equal(observation.compilerProfileId, candidate.compilerProfileId);
      assert.equal(observation.toolManifestDigest, candidate.toolManifestDigest);
      assert.equal(observation.fallbackInvoked, false);
    }
  });
});
