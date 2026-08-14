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
  ["phase1-input-binding-status.fungi", "phase1InputBindingStatusCore", [true, true, true], "input_and_result_hashes", "string"],
  ["phase1-verification-status.fungi", "phase1VerificationStatusCore", [true, true, true, true, true], true, "bool"],
  ["sha256-seal-backend-status.fungi", "sha256SealBackendStatusCore", [true, true, true], "backend_ready", "string"],
  ["sha256-seal-prove-status.fungi", "sha256SealProveStatusCore", [true, true], "proof_ready", "string"],
  ["sha256-seal-verify-status.fungi", "sha256SealVerifyStatusCore", [true, true, true], true, "bool"],
  ["snarkjs-prover-class-status.fungi", "snarkjsProverClassStatusCore", [true, true, true], "wrapper_ready", "string"],
  ["snarkjs-prover-constructor-status.fungi", "snarkjsProverConstructorStatusCore", [true, true], "constructed", "string"],
  ["snarkjs-prover-prove-status.fungi", "snarkjsProverProveStatusCore", [true, true], "delegated_proof", "string"],
  ["snarkjs-prover-verify-status.fungi", "snarkjsProverVerifyStatusCore", [true, true, true], "delegated_verify", "string"],
  ["snarkjs-prover-factory-status.fungi", "snarkjsProverFactoryStatusCore", [true], "new_backend", "string"],
  ["wrap-key-derivation-status.fungi", "wrapKeyDerivationStatusCore", [true, true, true], "derived_32", "string"],
  ["recipient-secret-wrap-status.fungi", "recipientSecretWrapStatusCore", [true, true, true, true, true, true], "wrapped_wiped", "string"],
  ["recipient-secret-unwrap-status.fungi", "recipientSecretUnwrapStatusCore", [true, true, true, true, true], "unwrapped_wiped", "string"],
  ["prod-anchor-admission-status.fungi", "prodAnchorAdmissionStatusCore", [true, true, true, true], "anchor_wiped", "string"],
  ["seal-arena-put-status.fungi", "sealArenaPutStatusCore", [true, true, true, true, true], "replaced_and_wiped", "string"],
  ["seal-arena-use-status.fungi", "sealArenaUseStatusCore", [true, true, true, true, true], "served_wiped", "string"],
  ["seal-arena-has-status.fungi", "sealArenaHasStatusCore", [true, false], true, "bool"],
  ["seal-arena-names-status.fungi", "sealArenaNamesStatusCore", [true, true], "names_snapshot", "string"],
  ["seal-arena-rotate-status.fungi", "sealArenaRotateStatusCore", [true, true, true, true, true], "rotated_wiped", "string"],
  ["seal-arena-fault-status.fungi", "sealArenaFaultStatusCore", [true, true, true], "faulted_wiped", "string"],
  ["seal-arena-remove-status.fungi", "sealArenaRemoveStatusCore", [true, true, true], "removed_wiped", "string"],
  ["seal-arena-dispose-status.fungi", "sealArenaDisposeStatusCore", [true, true, true], "disposed", "string"],
  ["transient-wipe-status.fungi", "transientWipeStatusCore", [true, true, true], "callback_then_wipe", "string"],
  ["stdin-secret-read-status.fungi", "stdinSecretReadStatusCore", [true, true, true, true], "crlf_stripped_wiped", "string"],
  ["noecho-prompt-status.fungi", "noechoPromptStatusCore", [true, true, true, true, true], "captured_noecho_wiped", "string"],
  ["ciphertext-atomic-write-status.fungi", "ciphertextAtomicWriteStatusCore", [true, true, true, true], "durable_replace", "string"],
  ["mlock-hook-status.fungi", "mlockHookStatusCore", [true], "hook_installed", "string"],
  ["mlock-attempt-status.fungi", "mlockAttemptStatusCore", [true, true, false], "locked", "string"],
  ["spore-load-all-status.fungi", "sporeLoadAllStatusCore", [true, true, true, true, true], "arena_ready", "string"],
  ["spore-coordinate-status.fungi", "sporeCoordinateStatusCore", [true, true, true], "opaque_coord_16", "string"],
  ["spore-empty-manifest-status.fungi", "sporeEmptyManifestStatusCore", [true, true, true], "empty_manifest", "string"],
  ["spore-pack-seal-status.fungi", "sporePackSealStatusCore", [true, true, true, true, true], "packed_seal", "string"],
  ["spore-unpack-seal-status.fungi", "sporeUnpackSealStatusCore", [true, true, true, true], "unpacked_exact", "string"],
  ["spore-context-binding-status.fungi", "sporeContextBindingStatusCore", [true, true, true, true], "context_bound", "string"],
  ["spore-secret-section-status.fungi", "sporeSecretSectionStatusCore", [true, true], "secret_section", "string"],
  ["spore-manifest-section-status.fungi", "sporeManifestSectionStatusCore", [true, true], "manifest_section", "string"],
  ["spore-u16le-status.fungi", "sporeU16leStatusCore", [true, true, true], "u16le", "string"],
  ["spore-u32le-status.fungi", "sporeU32leStatusCore", [true, true, true], "u32le", "string"],
  ["spore-read-u16-status.fungi", "sporeReadU16StatusCore", [true, true, true], "read_u16le", "string"],
  ["spore-read-u32-status.fungi", "sporeReadU32StatusCore", [true, true, true], "read_u32le", "string"],
].map(([file, flow, args, expected, type]) => Object.freeze({ file, flow, args, expected, type })));

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

it("publishes and independently re-admits all 40 wave-12 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.12",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.12", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-12-slide-"));
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
