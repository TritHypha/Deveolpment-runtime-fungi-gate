import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const SLIDE_AVAILABLE = typeof SLIDE_ROOT === "string"
  && existsSync(join(SLIDE_ROOT, "src", "checked-fungi-package-compiler.mjs"));
const SOURCE_ROOT = join(process.cwd(), "packages-galerina", "galerina-test", "src", "self-hosted", "conversion-overlays");
const ALL_ALLOW = Object.freeze({
  identity: 1, provenance: 1, target: 1, effects: 1,
  policy: 1, revocation: 1, validation: 1, memory: 1,
});

const CANDIDATES = Object.freeze([
  ["spore-crypto-lib-admission-status.fungi", "sporeCryptoLibAdmissionStatusCore", [true, true], "crypto_ready"],
  ["spore-verdict-allow-status.fungi", "sporeVerdictAllowStatusCore", [true], "allowed"],
  ["spore-now-epoch-status.fungi", "sporeNowEpochStatusCore", [true, true], "epoch_ready"],
  ["spore-manifest-bytes-status.fungi", "sporeManifestBytesStatusCore", [true, true, true], "manifest_bytes"],
  ["spore-nonnegative-integer-status.fungi", "sporeNonnegativeIntegerStatusCore", [true, true, true], "nonnegative_integer"],
  ["spore-malformed-manifest-status.fungi", "sporeMalformedManifestStatusCore", [true, true], "manifest_refused"],
  ["spore-secret-meta-validation-status.fungi", "sporeSecretMetaValidationStatusCore", [true, true, true, true], "secret_meta_valid"],
  ["spore-manifest-validation-status.fungi", "sporeManifestValidationStatusCore", [true, true, true, true], "manifest_valid"],
  ["spore-manifest-parse-status.fungi", "sporeManifestParseStatusCore", [true, true, true, true], "manifest_parsed"],
  ["spore-section-seal-status.fungi", "sporeSectionSealStatusCore", [true, true, true, true], "section_sealed"],
  ["spore-section-open-status.fungi", "sporeSectionOpenStatusCore", [true, true, true, true], "section_opened"],
  ["spore-kem-profile-status.fungi", "sporeKemProfileStatusCore", [true, true], "kem_profile_bound"],
  ["spore-environment-init-status.fungi", "sporeEnvironmentInitStatusCore", [true, true, true, true], "environment_initialized"],
  ["spore-compose-read-status.fungi", "sporeComposeReadStatusCore", [true, true, true, true, true], "compose_ready"],
  ["spore-open-value-status.fungi", "sporeOpenValueStatusCore", [true, true, true, true, true, true], "value_used_wiped"],
  ["spore-file-read-status.fungi", "sporeFileReadStatusCore", [true, true], "file_bytes"],
  ["spore-reseal-status.fungi", "sporeResealStatusCore", [true, true, true, true], "resealed"],
  ["spore-arena-edit-status.fungi", "sporeArenaEditStatusCore", [true, true, true, true, true, true], "edited_wiped"],
  ["spore-set-secret-status.fungi", "sporeSetSecretStatusCore", [true, true, true, true], "secret_set"],
  ["spore-remove-secret-status.fungi", "sporeRemoveSecretStatusCore", [true, true, true], "secret_removed"],
  ["spore-recipient-rotation-status.fungi", "sporeRecipientRotationStatusCore", [true, true, true, true, true], "recipient_rotated"],
  ["spore-secret-list-status.fungi", "sporeSecretListStatusCore", [true, true, true], "secret_list"],
  ["vault-credential-load-status.fungi", "vaultCredentialLoadStatusCore", [true, true, true, true], "credential_loaded"],
  ["vault-rotation-lease-status.fungi", "vaultRotationLeaseStatusCore", [true, true, true, true], "rotation_completed"],
  ["vault-rotation-commit-status.fungi", "vaultRotationCommitStatusCore", [true, true, true, true, true, true], "rotation_committed"],
  ["vault-active-use-status.fungi", "vaultActiveUseStatusCore", [true, true, true, true, true], "active_used_wiped"],
  ["vault-handle-status.fungi", "vaultHandleStatusCore", [true, true, true], "handle_status"],
  ["vault-list-ids-status.fungi", "vaultListIdsStatusCore", [true, true], "ids_listed"],
  ["vault-eviction-status.fungi", "vaultEvictionStatusCore", [true, true, true, true], "credential_evicted"],
  ["vault-rotation-fault-status.fungi", "vaultRotationFaultStatusCore", [false, true, true], "fault_handled"],
  ["vault-sweep-start-status.fungi", "vaultSweepStartStatusCore", [true, true, true], "sweep_started"],
  ["vault-sweep-stop-status.fungi", "vaultSweepStopStatusCore", [true, true], "sweep_stopped"],
  ["vault-dispose-status.fungi", "vaultDisposeStatusCore", [true, true, true, true], "vault_disposed"],
  ["vault-http-request-status.fungi", "vaultHttpRequestStatusCore", [true, true, true, true], "request_complete"],
  ["vault-segment-encoding-status.fungi", "vaultSegmentEncodingStatusCore", [true, true, true], "segment_encoded"],
  ["vault-mount-encoding-status.fungi", "vaultMountEncodingStatusCore", [true, true], "mount_encoded"],
  ["vault-path-encoding-status.fungi", "vaultPathEncodingStatusCore", [true, true, true, true], "path_encoded"],
  ["vault-client-constructor-status.fungi", "vaultClientConstructorStatusCore", [true, true, true, true], "client_constructed"],
  ["vault-read-secret-status.fungi", "vaultReadSecretStatusCore", [true, true, true, true, true], "secret_read"],
  ["vault-list-secrets-status.fungi", "vaultListSecretsStatusCore", [true, true, true], "vault_keys"],
].map(([file, flow, args, expected]) => Object.freeze({ file, flow, args, expected, type: "string" })));

async function loadSlide() {
  const fromSlide = async (path) => import(pathToFileURL(join(SLIDE_ROOT, "src", path)).href);
  return {
    ...await fromSlide("checked-fungi-package-compiler.mjs"),
    ...await fromSlide("checked-fungi-package-file.mjs"),
    ...await fromSlide("checked-fungi-package-publication-loader.mjs"),
    ...await fromSlide("safe-value-envelope.mjs"),
    ...await fromSlide("portable-veo.mjs"),
  };
}

function verificationExpectation(receipt) {
  return {
    packageSetDigest: receipt.packageSetDigest,
    packageIdentity: receipt.packageIdentity,
    exportName: receipt.exportName,
    receiptDigest: receipt.receiptDigest,
    safeValueTypeId: receipt.safeValueTypeId,
    safeValueStateId: receipt.safeValueStateId,
    safeValueProvenanceDigest: receipt.safeValueProvenanceDigest,
  };
}

it("publishes and independently re-admits all 40 wave-13 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.13",
      exports: CANDIDATES.map((candidate, index) => ({
        name: candidate.flow,
        sourceFlowName: candidate.flow,
        sourceBytes: candidateSources[index],
      })),
      dependencies: [],
      resources: [],
    }],
    context,
    gates: ALL_ALLOW,
  });
  const compiled = slide.compileCheckedFungiPackageSet(request(sources));
  if (compiled.verdict !== 1) {
    const failures = [];
    for (let index = 0; index < CANDIDATES.length; index += 1) {
      const candidate = CANDIDATES[index];
      const isolated = slide.compileCheckedFungiPackageSet({
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.13", exports: [{
          name: candidate.flow,
          sourceFlowName: candidate.flow,
          sourceBytes: sources[index],
        }], dependencies: [], resources: [] }],
        context,
        gates: ALL_ALLOW,
      });
      if (isolated.verdict !== 1) failures.push(`${candidate.flow}:${JSON.stringify(isolated)}`);
    }
    assert.fail(`physical SLIDE compilation refused: ${failures.join(", ")}`);
  }

  const mutatedSources = sources.map((source) => Uint8Array.from(source));
  mutatedSources[0][0] ^= 1;
  assert.equal(slide.compileCheckedFungiPackageSet(request(mutatedSources)).verdict, -1);

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-13-slide-"));
  const publicationDirectory = join(parent, "published");
  try {
    const published = await slide.publishCheckedFungiPackageBuild({
      packageBuildHandle: compiled.packageBuildHandle,
      outputDirectory: publicationDirectory,
    });
    assert.equal(published.verdict, 1, JSON.stringify(published));
    const slideFiles = published.outputFiles.filter((name) => name.endsWith(".slide"));
    assert.equal(slideFiles.length, 40);

    let retainedReceipt;
    for (const candidate of CANDIDATES) {
      const prepared = await slide.prepareCheckedFungiPackagePublication({
        publicationDirectory,
        packageIdentity: "@galerina/test",
        exportName: candidate.flow,
        context,
        gates: ALL_ALLOW,
      });
      assert.equal(prepared.verdict, 1, `${candidate.flow}: ${JSON.stringify(prepared)}`);
      const receipt = slide.executeTypedCheckedFungiPackagePublication(prepared.packageExecutionHandle, candidate.args, undefined);
      assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", candidate.flow);
      assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS[candidate.type], candidate.flow);
      const verified = slide.verifyTypedCheckedFungiPackageReceipt(receipt, verificationExpectation(receipt));
      assert.equal(verified.verdict, 1, candidate.flow);
      assert.equal(verified.value, candidate.expected, candidate.flow);
      assert.equal(verified.authorityReleased, false, candidate.flow);
      retainedReceipt = receipt;
    }

    assert.ok(retainedReceipt);
    assert.equal(slide.verifyTypedCheckedFungiPackageReceipt(
      { ...retainedReceipt, receiptDigest: `sha256:${"0".repeat(64)}` },
      verificationExpectation(retainedReceipt),
    ).verdict, -1);

    const firstSlidePath = join(publicationDirectory, slideFiles[0]);
    const artifactBytes = await readFile(firstSlidePath);
    artifactBytes[0] ^= 1;
    await writeFile(firstSlidePath, artifactBytes);
    const refused = await slide.prepareCheckedFungiPackagePublication({
      publicationDirectory,
      packageIdentity: "@galerina/test",
      exportName: CANDIDATES[0].flow,
      context,
      gates: ALL_ALLOW,
    });
    assert.equal(refused.verdict, -1);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
