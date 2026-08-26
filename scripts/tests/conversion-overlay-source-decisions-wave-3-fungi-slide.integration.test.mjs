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
  ["explicit-resilience-presence.fungi", "explicitResiliencePresenceCore", [true, true], true, "bool"],
  ["gate-call-name-classification.fungi", "gateCallNameClassificationCore", [false, false, true, true], true, "bool"],
  ["resilience-fallback-selection.fungi", "resilienceFallbackSelectionCore", [true, true, "return_cached"], "return_cached", "string"],
  ["resilience-retry-count.fungi", "resilienceRetryCountCore", [true, true, 3], 3, "int"],
  ["resilience-quarantine-action.fungi", "resilienceQuarantineActionCore", [true, true, true, "isolated"], "isolated", "string"],
  ["effect-namespace-selection.fungi", "effectNamespaceSelectionCore", [6, "secret", "secret.read"], "secret", "string"],
  ["diagnostic-capability-selection.fungi", "diagnosticCapabilitySelectionCore", [false, "secret.read"], "unknown", "string"],
  ["import-profile-mask.fungi", "importProfileMaskCore", ["on"], 1, "int"],
  ["log-call-classification.fungi", "logCallClassificationCore", [false, "logger"], true, "bool"],
  ["tri-state-record-admission.fungi", "triStateRecordAdmissionCore", [true, true, true, false], true, "bool"],
  ["query-option-unwrap.fungi", "queryOptionUnwrapCore", [false, "present", "fallback"], "fallback", "string"],
  ["sensitive-header-decision.fungi", "sensitiveHeaderDecisionCore", ["set-cookie"], true, "bool"],
  ["ternary-mac-step.fungi", "ternaryMacStepCore", [-1, 3, 10], 7, "int"],
  ["regex-global-flag-action.fungi", "regexGlobalFlagActionCore", [true, false], "append_g", "string"],
  ["high-risk-permission-decision.fungi", "highRiskPermissionDecisionCore", ["native"], true, "bool"],
  ["code-unit-ordering.fungi", "codeUnitOrderingCore", [false, true], 1, "int"],
  ["exact-data-shape-admission.fungi", "exactDataShapeAdmissionCore", [true, true, true, false, false], true, "bool"],
  ["oracle-int32-agreement.fungi", "oracleInt32AgreementCore", [17, 17], true, "bool"],
  ["result-count-limit.fungi", "resultCountLimitCore", [true, 11, 10], "results", "string"],
  ["query-length-limit.fungi", "queryLengthLimitCore", [true, 80, 100], false, "bool"],
  ["amount-limit.fungi", "amountLimitCore", [true, 101, 100], 101, "int"],
  ["concurrent-task-limit.fungi", "concurrentTaskLimitCore", [true, 5, 4], "concurrent_tasks", "string"],
  ["client-address-source.fungi", "clientAddressSourceCore", [true, true], "forwarded", "string"],
  ["throttle-threshold-selection.fungi", "throttleThresholdSelectionCore", [true, true, false, 2, 1], 1, "int"],
  ["residency-floor-decision.fungi", "residencyFloorDecisionCore", [1, 2], true, "bool"],
  ["serialization-call-classification.fungi", "serializationCallClassificationCore", [false, true, false, false, false], true, "bool"],
  ["cpu-feature-coverage.fungi", "cpuFeatureCoverageCore", [-1, 3], true, "bool"],
  ["sandbox-path-escape.fungi", "sandboxPathEscapeCore", [false], true, "bool"],
  ["unsafe-modifier-presence.fungi", "unsafeModifierPresenceCore", [false, true, true], true, "bool"],
  ["boundary-access-expression.fungi", "boundaryAccessExpressionCore", [true, false, false, true, false], true, "bool"],
  ["source-file-decision.fungi", "sourceFileDecisionCore", [false, true], true, "bool"],
  ["fungi-fixture-classification.fungi", "fungiFixtureClassificationCore", [false, true, false], true, "bool"],
  ["opaque-id-decision.fungi", "opaqueIdDecisionCore", [true, true, false, true], true, "bool"],
  ["flow-risk-tier.fungi", "flowRiskTierCore", [false, true, 1], "medium", "string"],
  ["hostname-classification.fungi", "hostnameClassificationCore", [false, false, false, true, false], "private", "string"],
  ["parsed-network-octet.fungi", "parsedNetworkOctetCore", [false, false, true, true, 127], 127, "int"],
  ["logic-state-admission.fungi", "logicStateAdmissionCore", [true, true, 2, 3], true, "bool"],
  ["provenance-transform-classification.fungi", "provenanceTransformClassificationCore", [false, true, false, false], "hash", "string"],
  ["secret-source-expression.fungi", "secretSourceExpressionCore", [false, false, true, false, false, true, false], true, "bool"],
  ["unsafe-network-backend.fungi", "unsafeNetworkBackendCore", [false, false, true], true, "bool"],
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

it("publishes and independently re-admits all 40 wave-3 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.3",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.3", exports: [{
          name: candidate.flow,
          sourceFlowName: candidate.flow,
          sourceBytes: sources[index],
        }], dependencies: [], resources: [] }],
        context,
        gates: ALL_ALLOW,
      });
      if (isolated.verdict !== 1) failures.push(candidate.flow);
    }
    assert.fail(`physical SLIDE compilation refused: ${failures.join(", ")}`);
  }

  const mutatedSources = sources.map((source) => Uint8Array.from(source));
  mutatedSources[0][0] ^= 1;
  assert.equal(slide.compileCheckedFungiPackageSet(request(mutatedSources)).verdict, -1);

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-3-slide-"));
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
