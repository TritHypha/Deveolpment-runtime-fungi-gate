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
  ["web-report-status.fungi", "webReportStatusCore", [false, true, 1], "partial", "string"],
  ["localhost-http-link.fungi", "localhostHttpLinkCore", [true, true, true, true], "localhost", "string"],
  ["web-server-only-import.fungi", "webServerOnlyImportCore", [true, true, false], true, "bool"],
  ["browser-runtime-profile-admission.fungi", "browserRuntimeProfileAdmissionCore", [true, true, true, true, 2], true, "bool"],
  ["web-family-entry-status.fungi", "webFamilyEntryStatusCore", [true, true, true, false, "valid"], "valid", "string"],
  ["component-child-admission.fungi", "componentChildAdmissionCore", [true, false, false], "accepted", "string"],
  ["component-contract-accessibility.fungi", "componentContractAccessibilityCore", [true, true, true, true, true], true, "bool"],
  ["component-prop-admission.fungi", "componentPropAdmissionCore", [true, false, true, 0], "accepted", "string"],
  ["event-payload-field-admission.fungi", "eventPayloadFieldAdmissionCore", [0, true, true], true, "bool"],
  ["event-rate-policy.fungi", "eventRatePolicyCore", [false, false, false, "debounce"], "debounce", "string"],
  ["sensitive-capability-gesture.fungi", "sensitiveCapabilityGestureCore", [1, true, true], "accepted", "string"],
  ["web-event-contract-admission.fungi", "webEventContractAdmissionCore", [true, true, true], "accepted", "string"],
  ["link-scheme-decision.fungi", "linkSchemeDecisionCore", [true, false, true, "https", false], "allowed_secure", "string"],
  ["route-data-fetch-admission.fungi", "routeDataFetchAdmissionCore", [true, true], "accepted", "string"],
  ["route-preload-bound.fungi", "routePreloadBoundCore", [true, true, 4], true, "bool"],
  ["route-contract-param-admission.fungi", "routeContractParamAdmissionCore", [true, true, false, 2, 0, true], "accepted", "string"],
  ["renderable-content-admission.fungi", "renderableContentAdmissionCore", [true, false, false, 2], "accepted", "string"],
  ["render-content-list-status.fungi", "renderContentListStatusCore", [3, 0], "ready", "string"],
  ["streaming-render-plan-admission.fungi", "streamingRenderPlanAdmissionCore", [true, true, true, 8], true, "bool"],
  ["state-diff-render-plan-admission.fungi", "stateDiffRenderPlanAdmissionCore", [true, true, true, 16], true, "bool"],
  ["api-state-conversion-admission.fungi", "apiStateConversionAdmissionCore", [true, true, true], "accepted", "string"],
  ["hydration-field-admission.fungi", "hydrationFieldAdmissionCore", [true, true, true, false, 0], "accepted", "string"],
  ["page-state-field-admission.fungi", "pageStateFieldAdmissionCore", [true, true, false, true, false], "accepted", "string"],
  ["state-diff-plan-admission.fungi", "stateDiffPlanAdmissionCore", [true, true, 10], "accepted", "string"],
  ["environment-policy-flags.fungi", "environmentPolicyFlagsCore", ["development"], 3, "int"],
  ["production-strictness-default.fungi", "productionStrictnessDefaultCore", [false, false, true], true, "bool"],
  ["governance-resolution-status.fungi", "governanceResolutionStatusCore", [true, true, "standard"], "standard", "string"],
  ["vector-tier-selection.fungi", "vectorTierSelectionCore", [true, "avx2"], "avx2", "string"],
  ["regex-complement-gap.fungi", "regexComplementGapCore", [true, false, true, false], "gap", "string"],
  ["regex-range-normalization-action.fungi", "regexRangeNormalizationActionCore", [5, 8, true, 4], "merge", "string"],
  ["regex-search-step.fungi", "regexSearchStepCore", [65, 64, 90], "matched", "string"],
  ["regex-veto-record.fungi", "regexVetoRecordCore", [true, true, true], "veto_with_offset", "string"],
  ["certificate-date-admission.fungi", "certificateDateAdmissionCore", [true, true, 1], "parsed", "string"],
  ["url-query-last-wins.fungi", "urlQueryLastWinsCore", [true, true, true, true], "replace_last", "string"],
  ["principal-resolution-admission.fungi", "principalResolutionAdmissionCore", [true, true, true, 2, true], true, "bool"],
  ["tls-principal-admission.fungi", "tlsPrincipalAdmissionCore", [true, true, 128, true], "admitted", "string"],
  ["hybrid-signature-encoding-admission.fungi", "hybridSignatureEncodingAdmissionCore", [true, true, true, true, true], true, "bool"],
  ["hybrid-signature-decoding-admission.fungi", "hybridSignatureDecodingAdmissionCore", [true, 2, true, true], "decoded", "string"],
  ["rotation-transition-admission.fungi", "rotationTransitionAdmissionCore", [false, true, true, true], true, "bool"],
  ["canonical-instant-admission.fungi", "canonicalInstantAdmissionCore", [true, true, true, true], "canonical", "string"],
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

it("publishes and independently re-admits all 40 wave-5 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.5",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.5", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-5-slide-"));
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
