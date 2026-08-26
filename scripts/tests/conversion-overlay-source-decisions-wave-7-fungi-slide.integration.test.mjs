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
  ["query-parameter-admission.fungi", "queryParameterAdmissionCore", [true, false, true, 0], "accepted", "string"],
  ["query-template-admission.fungi", "queryTemplateAdmissionCore", [true, false, false, true, 0], "accepted", "string"],
  ["typed-query-admission.fungi", "typedQueryAdmissionCore", [true, true, true, true], true, "bool"],
  ["typed-command-admission.fungi", "typedCommandAdmissionCore", [true, true, true, true, true], "accepted", "string"],
  ["database-access-policy-core.fungi", "databaseAccessPolicyCore", [true, true, true, true, 1], "accepted_with_exceptions", "string"],
  ["query-report-status-core.fungi", "queryReportStatusCore", [true, true, true, true, 1], "warning", "string"],
  ["pipeline-backpressure-admission.fungi", "pipelineBackpressureAdmissionCore", [true, true, true], true, "bool"],
  ["pipeline-quarantine-admission.fungi", "pipelineQuarantineAdmissionCore", [true, 100, true], "accepted", "string"],
  ["pipeline-stage-admission.fungi", "pipelineStageAdmissionCore", [true, true, true, true, true, false, true], "accepted", "string"],
  ["pipeline-definition-admission.fungi", "pipelineDefinitionAdmissionCore", [true, true, true, true], true, "bool"],
  ["pipeline-report-status-core.fungi", "pipelineReportStatusCore", [true, true, 2, 1], "warning_unquarantined", "string"],
  ["response-mapping-admission.fungi", "responseMappingAdmissionCore", [true, 2, false, false], "accepted", "string"],
  ["response-field-projection.fungi", "responseFieldProjectionCore", [true, true, true, false], "project", "string"],
  ["response-report-status-core.fungi", "responseReportStatusCore", [true, true, true, 3, 1], "accepted", "string"],
  ["data-report-envelope-admission.fungi", "dataReportEnvelopeAdmissionCore", [true, true, true, true], 0, "int"],
  ["data-report-envelope-construction.fungi", "dataReportEnvelopeConstructionCore", [false, true, true, true], "partial", "string"],
  ["search-document-admission.fungi", "searchDocumentAdmissionCore", [true, 2, true, true, false, true], "accepted", "string"],
  ["search-index-policy-admission.fungi", "searchIndexPolicyAdmissionCore", [true, 2, true, false], "accepted", "string"],
  ["search-index-input-status.fungi", "searchIndexInputStatusCore", [true, true, true, true, true], "accepted", "string"],
  ["search-query-admission.fungi", "searchQueryAdmissionCore", [true, true, true, true, true], "accepted", "string"],
  ["search-ranking-admission.fungi", "searchRankingAdmissionCore", [true, true, 2, true], "accepted_boost", "string"],
  ["search-index-report-status.fungi", "searchIndexReportStatusCore", [true, true, true, true, 0], "accepted", "string"],
  ["html-parse-plan-admission.fungi", "htmlParsePlanAdmissionCore", [true, true, true, true, true], "accepted", "string"],
  ["html-sanitize-policy-admission.fungi", "htmlSanitizePolicyAdmissionCore", [true, false, true, false, true, false], "accepted", "string"],
  ["html-render-plan-admission.fungi", "htmlRenderPlanAdmissionCore", [true, 0], 0, "int"],
  ["html-extraction-plan-admission.fungi", "htmlExtractionPlanAdmissionCore", [true, 2, true], "accepted", "string"],
  ["html-search-document-admission.fungi", "htmlSearchDocumentAdmissionCore", [true, 2, true, true], "accepted", "string"],
  ["html-processing-report-status.fungi", "htmlProcessingReportStatusCore", [true, true, 2], "unsafe_found", "string"],
  ["archive-checksum-admission.fungi", "archiveChecksumAdmissionCore", [true, true, true], "accepted", "string"],
  ["archive-item-admission.fungi", "archiveItemAdmissionCore", [true, true, true, true, true], "accepted", "string"],
  ["archive-manifest-admission.fungi", "archiveManifestAdmissionCore", [true, true, true, true], true, "bool"],
  ["archive-integrity-status.fungi", "archiveIntegrityStatusCore", [true, 4, 4, 0], "verified", "string"],
  ["archive-restore-status.fungi", "archiveRestoreStatusCore", [true, 4, 0, true], "verified", "string"],
  ["json-memory-policy-admission.fungi", "jsonMemoryPolicyAdmissionCore", [true, true, true, true], "accepted_bounded_string", "string"],
  ["json-decode-plan-admission.fungi", "jsonDecodePlanAdmissionCore", [true, true, true], "accepted", "string"],
  ["json-schema-contract-admission.fungi", "jsonSchemaContractAdmissionCore", [true, 3, true], "accepted", "string"],
  ["json-extraction-plan-admission.fungi", "jsonExtractionPlanAdmissionCore", [true, 2, true], "accepted", "string"],
  ["json-redaction-policy-admission.fungi", "jsonRedactionPolicyAdmissionCore", [true, true, 2, true], "accepted", "string"],
  ["json-archive-report-status.fungi", "jsonArchiveReportStatusCore", [true, true, true, true, true, 3], "accepted", "string"],
  ["database-snapshot-admission.fungi", "databaseSnapshotAdmissionCore", [true, true, true, true], "accepted", "string"],
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

it("publishes and independently re-admits all 40 wave-7 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.7",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.7", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-7-slide-"));
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
