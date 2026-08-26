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
  ["health-result-coercion-status.fungi", "healthResultCoercionStatusCore", [true, true, false, false, false], "boolean_up", "string"],
  ["health-timeout-selection.fungi", "healthTimeoutSelectionCore", [true, true, true], 1, "int"],
  ["liveness-registration-status.fungi", "livenessRegistrationStatusCore", [true, true], "registered_liveness", "string"],
  ["readiness-registration-status.fungi", "readinessRegistrationStatusCore", [false, true], 1, "int"],
  ["health-unregister-mask.fungi", "healthUnregisterMaskCore", [true, true], 3, "int"],
  ["liveness-summary.fungi", "livenessSummaryCore", [0, false], "up_default", "string"],
  ["readiness-summary.fungi", "readinessSummaryCore", [0, false], true, "bool"],
  ["health-aggregate-status.fungi", "healthAggregateStatusCore", [2, false, true], "readiness_up", "string"],
  ["health-check-outcome.fungi", "healthCheckOutcomeCore", [false, false, true, true], "up", "string"],
  ["audit-reservation-admission.fungi", "auditReservationAdmissionCore", [true, false], "live", "string"],
  ["audit-commit-status.fungi", "auditCommitStatusCore", [true, true], "committed", "string"],
  ["audit-cancel-status.fungi", "auditCancelStatusCore", [true, false], "cancelled", "string"],
  ["audit-emit-status.fungi", "auditEmitStatusCore", [true, true], "emitted", "string"],
  ["dispatch-instrumentation-status.fungi", "dispatchInstrumentationStatusCore", [true, true, true], "returned_recorded", "string"],
  ["safe-clock-status.fungi", "safeClockStatusCore", [true, true], 1, "int"],
  ["request-recording-status.fungi", "requestRecordingStatusCore", [true, true, true, false], "success_recorded", "string"],
  ["health-report-http-status.fungi", "healthReportHttpStatusCore", [true], 200, "int"],
  ["observability-route-flags.fungi", "observabilityRouteFlagsCore", [true, true], 3, "int"],
  ["health-failsafe-status.fungi", "healthFailsafeStatusCore", [true, true], "handler_result", "string"],
  ["base-path-normalisation-status.fungi", "basePathNormalisationStatusCore", [false, true, true], "trim", "string"],
  ["combined-health-http-status.fungi", "combinedHealthHttpStatusCore", [true, true, true], 200, "int"],
  ["metrics-route-status.fungi", "metricsRouteStatusCore", [true, false], "required_auth_200", "string"],
  ["observability-assembly-flags.fungi", "observabilityAssemblyFlagsCore", [false, false, false, false], "defaults", "string"],
  ["observability-instrument-status.fungi", "observabilityInstrumentStatusCore", [true, false], "instrumented_default", "string"],
  ["log-level-selection.fungi", "logLevelSelectionCore", [30], "warn", "string"],
  ["log-serialization-status.fungi", "logSerializationStatusCore", [false, true, true], "fallback_with_logger", "string"],
  ["logger-clock-status.fungi", "loggerClockStatusCore", [true, true], "finite", "string"],
  ["logger-redaction-action.fungi", "loggerRedactionActionCore", [true, true], "redacted", "string"],
  ["logger-emission-status.fungi", "loggerEmissionStatusCore", [true, true, true], "written", "string"],
  ["memory-log-write-status.fungi", "memoryLogWriteStatusCore", [true, true], "appended", "string"],
  ["memory-log-view-status.fungi", "memoryLogViewStatusCore", [2, true], "populated_live_alias", "string"],
  ["logger-sink-failure-status.fungi", "loggerSinkFailureStatusCore", [0], "healthy", "string"],
  ["logger-construction-status.fungi", "loggerConstructionStatusCore", [true, true, true], "custom_sink_clock", "string"],
  ["metric-clamp-position.fungi", "metricClampPositionCore", [false, true], 1, "int"],
  ["route-normalisation-status.fungi", "routeNormalisationStatusCore", [true, true, true, true], "query_removed", "string"],
  ["http-status-classification.fungi", "httpStatusClassificationCore", [2], "2xx", "string"],
  ["histogram-observation-status.fungi", "histogramObservationStatusCore", [true, true, true], "bucketed", "string"],
  ["percentile-selection-status.fungi", "percentileSelectionStatusCore", [false, true, false], "interpolated", "string"],
  ["route-cardinality-status.fungi", "routeCardinalityStatusCore", [false, true, true], "overflow_reused", "string"],
  ["prometheus-series-admission.fungi", "prometheusSeriesAdmissionCore", [true, true, true, true], "request_and_error_series", "string"],
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

it("publishes and independently re-admits all 40 wave-10 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.10",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.10", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-10-slide-"));
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
