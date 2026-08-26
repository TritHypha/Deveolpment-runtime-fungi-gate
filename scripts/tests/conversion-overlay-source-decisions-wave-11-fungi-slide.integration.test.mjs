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
const SOURCE_ROOT = join(process.cwd(), "packages-ts", "galerina-test", "src", "self-hosted", "conversion-overlays");
const ALL_ALLOW = Object.freeze({
  identity: 1, provenance: 1, target: 1, effects: 1,
  policy: 1, revocation: 1, validation: 1, memory: 1,
});

const CANDIDATES = Object.freeze([
  ["ecc-bit-extraction.fungi", "eccBitExtractionCore", [true, true], 1, "int"],
  ["ecc-nibble-encode-admission.fungi", "eccNibbleEncodeAdmissionCore", [true, true, true], "encode", "string"],
  ["ecc-data-extraction-status.fungi", "eccDataExtractionStatusCore", [true, true], "nibble", "string"],
  ["ecc-nibble-decode-status.fungi", "eccNibbleDecodeStatusCore", [true, true, true], "corrected_data_bit", "string"],
  ["ecc-stream-encode-status.fungi", "eccStreamEncodeStatusCore", [true, true], "expanded", "string"],
  ["ecc-stream-decode-status.fungi", "eccStreamDecodeStatusCore", [true, true, true, true], "ok_corrected", "string"],
  ["photonic-adc-range-status.fungi", "photonicAdcRangeStatusCore", [true], "scaled_range", "string"],
  ["photonic-variance-status.fungi", "photonicVarianceStatusCore", [true, true, true], "phase_and_readout", "string"],
  ["wdm-application-status.fungi", "wdmApplicationStatusCore", [true, true, true], "applied", "string"],
  ["binomial-domain-status.fungi", "binomialDomainStatusCore", [false, false, true], "computed", "string"],
  ["photonic-clamp-position.fungi", "photonicClampPositionCore", [false, true], 1, "int"],
  ["vote-count-selection-status.fungi", "voteCountSelectionStatusCore", [true, true, false, true, true], "max_clamped", "string"],
  ["photonic-tmac-exact-action.fungi", "photonicTmacExactActionCore", [false, true, true], "subtract", "string"],
  ["photonic-tmac-quantization-status.fungi", "photonicTmacQuantizationStatusCore", [false, true, true, true], "quantized_scaled", "string"],
  ["photonic-tmac-vote-status.fungi", "photonicTmacVoteStatusCore", [true, true], "mean", "string"],
  ["wdm-matrix-row-status.fungi", "wdmMatrixRowStatusCore", [false, true, true, true], "two_neighbor_split", "string"],
  ["photonic-flip-probability-status.fungi", "photonicFlipProbabilityStatusCore", [false, true], "clamped_one", "string"],
  ["photonic-single-lane-status.fungi", "photonicSingleLaneStatusCore", [false, true], "combined_probability", "string"],
  ["photonic-nmr-failure-status.fungi", "photonicNmrFailureStatusCore", [true, true, true], "bounded_probability", "string"],
  ["photonic-quant-step-status.fungi", "photonicQuantStepStatusCore", [true, true], "finite_step", "string"],
  ["photonic-hex-repeat-status.fungi", "photonicHexRepeatStatusCore", [true, true], "placeholder_64", "string"],
  ["photonic-fnv-input-status.fungi", "photonicFnvInputStatusCore", [true, true, true], "u32_hash", "string"],
  ["freivalds-matvec-status.fungi", "freivaldsMatvecStatusCore", [true, true, true], "vector_ready", "string"],
  ["freivalds-verification-status.fungi", "freivaldsVerificationStatusCore", [true, true, true], true, "bool"],
  ["freivalds-cost-factor.fungi", "freivaldsCostFactorCore", [true, true], 3, "int"],
  ["photonic-tolerance-check.fungi", "photonicToleranceCheckCore", [true, true, true], true, "bool"],
  ["photonic-parity-conformance-status.fungi", "photonicParityConformanceStatusCore", [false, false, true], "both_admitted_within_tolerance", "string"],
  ["photonic-parity-report-status.fungi", "photonicParityReportStatusCore", [true, true, true, true], "all_conformant_measured", "string"],
  ["photonic-digital-cost-status.fungi", "photonicDigitalCostStatusCore", [true], "cubic_cost", "string"],
  ["photonic-offload-cost-status.fungi", "photonicOffloadCostStatusCore", [true, true, true, true], "voted_verified_cost", "string"],
  ["photonic-crossover-status.fungi", "photonicCrossoverStatusCore", [true, true], "finite_threshold", "string"],
  ["photonic-meech-ratio-status.fungi", "photonicMeechRatioStatusCore", [true, true, true], "realized_after_tax", "string"],
  ["photonic-redundancy-selection.fungi", "photonicRedundancySelectionCore", [false, true, true], "single_read", "string"],
  ["photonic-backend-selection-status.fungi", "photonicBackendSelectionStatusCore", [true, true, true, true], "hardware", "string"],
  ["photonic-backend-resolution-status.fungi", "photonicBackendResolutionStatusCore", [true, true], "hardware_backend", "string"],
  ["photonic-effective-tolerance-status.fungi", "photonicEffectiveToleranceStatusCore", [true, true, true], "caller_band", "string"],
  ["photonic-router-construction-status.fungi", "photonicRouterConstructionStatusCore", [true, true], "router_ready", "string"],
  ["photonic-router-hit-status.fungi", "photonicRouterHitStatusCore", [true, true, true], "hit", "string"],
  ["photonic-partition-decision-status.fungi", "photonicPartitionDecisionStatusCore", [true, true, true, true, true], "photonic_net_win", "string"],
  ["photonic-xorshift-next-status.fungi", "photonicXorshiftNextStatusCore", [true, true, true], "uniform", "string"],
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

it("publishes and independently re-admits all 40 wave-11 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.11",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.11", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-11-slide-"));
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
