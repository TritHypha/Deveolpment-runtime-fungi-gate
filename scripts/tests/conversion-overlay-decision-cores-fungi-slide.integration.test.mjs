import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";

const SLIDE_ROOT = process.env.GALERINA_SLIDE_REPO;
const SLIDE_AVAILABLE =
  typeof SLIDE_ROOT === "string"
  && existsSync(join(SLIDE_ROOT, "src", "checked-fungi-package-compiler.mjs"));
const SOURCE_ROOT = join(
  process.cwd(),
  "packages-ts",
  "galerina-test",
  "src",
  "self-hosted",
  "conversion-overlays",
);
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
const CANDIDATES = Object.freeze([
  ["stage-b-parity-status.fungi", "stageBParityStatus", [0], "complete", "string"],
  ["stage-b-overall-status.fungi", "stageBOverallStatus", [4, 3, 4], "partial", "string"],
  ["request-size-limit.fungi", "requestSizeWithinLimit", [true, 1025, 1024], false, "bool"],
  ["batch-size-limit.fungi", "batchSizeWithinLimit", [true, 16, 16], true, "bool"],
  ["byte-unit-multiplier.fungi", "byteUnitMultiplier", ["mb"], 1_048_576, "int"],
  ["rate-period-milliseconds.fungi", "ratePeriodMilliseconds", ["day"], 86_400_000, "int"],
  ["rate-scope-normalization.fungi", "normaliseRateScope", ["global"], "global", "string"],
  ["fault-action-coercion.fungi", "coerceFaultAction", ["on_rotation_fault", "log"], "log", "string"],
  ["environment-mode-resolution.fungi", "resolveEnvironmentModeCore", [false, false, "production", "development"], "development", "string"],
  ["security-posture-resolution.fungi", "resolveSecurityPostureCore", ["auto", false], "on", "string"],
  ["economic-route-branch.fungi", "selectEconomicRouteBranch", [false, true], "proof-escalation", "string"],
  ["proxy-trust-decision.fungi", "proxyTrustDecision", ["mtls", true, false, true], false, "bool"],
  ["pagination-bound-decision.fungi", "boundPageLimitCore", [true, true, 500, 25, 100], 100, "int"],
  ["report-status-selection.fungi", "selectReportStatusCore", [4, 1, 0], "error", "string"],
  ["task-run-status-summary.fungi", "summarizeTaskRunStatusCore", [0, 0, 2, 5], "pending", "string"],
  ["data-report-status.fungi", "deriveDataReportStatusCore", [false, true], "partial", "string"],
  ["lowbit-cpu-admission.fungi", "canUseLowBitCpuPathCore", [true, "arm64", false, true], true, "bool"],
  ["trit-encoding.fungi", "encodeTritCore", [-1], 0, "int"],
  ["trit-decoding.fungi", "decodeTritCore", [2], 1, "int"],
  ["provenance-kind-label.fungi", "provenanceKindLabel", ["transform"], "TRANSFORM", "string"],
  ["provenance-trust-label.fungi", "provenanceTrustLabel", ["sink", false], "ungated-high-risk", "string"],
  ["package-specifier-classification.fungi", "classifyPackageSpecifierCore", [false, false, true], "workspace", "string"],
  ["real-specifier-admission.fungi", "isRealSpecifierCore", [false, true], false, "bool"],
  ["registry-manifest-order.fungi", "compareRegistryManifestCore", [0, -1], -1, "int"],
  ["admission-telemetry-verdict.fungi", "telemetrySideSignalCore", [true, 2, true], -1, "verdict"],
  ["optical-signal-validation-mask.fungi", "opticalSignalValidationMask", [1, 0, 1], 5, "int"],
  ["photonic-mapping-validation-mask.fungi", "photonicMappingValidationMask", [0, 0, 1, 1], 12, "int"],
  ["photonic-plan-validation-mask.fungi", "photonicPlanValidationMask", [false, true, false], 5, "int"],
  ["checkpoint-policy-validation-mask.fungi", "checkpointPolicyValidationMask", [false, false], 3, "int"],
  ["retry-policy-validation-mask.fungi", "retryPolicyValidationMask", [0, 0, 1], 4, "int"],
  ["response-flow-admission.fungi", "responseFlowAdmissionCore", [true, false, true], -1, "verdict"],
  ["mysql-credential-validation-mask.fungi", "mysqlCredentialValidationMask", [1, 0, 1], 5, "int"],
  ["slide-vade-observation-verdict.fungi", "classifySlideVadeObservationCore", [true, true, false, false], -1, "verdict"],
  ["benchmark-memory-admission.fungi", "benchmarkMemoryAdmission", [true, false, true, true], 2, "int"],
  ["ordinal-suffix.fungi", "ordinalSuffix", [22], "nd", "string"],
  ["optical-channel-validation-mask.fungi", "opticalChannelValidationMask", [0, 1, 1, 0], 6, "int"],
  ["photonic-lowering-validation-mask.fungi", "photonicLoweringValidationMask", [0, 1, 1, 0], 6, "int"],
  ["tri-state-xnor.fungi", "triStateXnorCore", [0, 1], 0, "verdict"],
  ["tri-state-implies.fungi", "triStateImpliesCore", [1, -1], -1, "verdict"],
  ["wasm-export-admission.fungi", "moduleDefinesFunctionExportCore", [true, true, false], false, "bool"],
].map(([file, flow, args, expected, type]) => Object.freeze({ file, flow, args, expected, type })));

async function loadSlide() {
  const fromSlide = async (path) => import(pathToFileURL(join(SLIDE_ROOT, "src", path)).href);
  const compiler = await fromSlide("checked-fungi-package-compiler.mjs");
  const file = await fromSlide("checked-fungi-package-file.mjs");
  const loader = await fromSlide("checked-fungi-package-publication-loader.mjs");
  const values = await fromSlide("safe-value-envelope.mjs");
  const veo = await fromSlide("portable-veo.mjs");
  return { ...compiler, ...file, ...loader, ...values, ...veo };
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

it(
  "publishes and independently re-admits all 40 source-bound decision cores through physical SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
    const request = (candidateSources) => ({
      packages: [{
        identity: "@galerina/test",
        version: "1.0.0-beta.2",
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
          packages: [{
            identity: "@galerina/test",
            version: "1.0.0-beta.2",
            exports: [{
              name: candidate.flow,
              sourceFlowName: candidate.flow,
              sourceBytes: sources[index],
            }],
            dependencies: [],
            resources: [],
          }],
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

    const parent = await mkdtemp(join(tmpdir(), "galerina-decision-cores-slide-"));
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
      const executionFailures = [];
      for (const candidate of CANDIDATES) {
        const prepared = await slide.prepareCheckedFungiPackagePublication({
          publicationDirectory,
          packageIdentity: "@galerina/test",
          exportName: candidate.flow,
          context,
          gates: ALL_ALLOW,
        });
        assert.equal(prepared.verdict, 1, `${candidate.flow}: ${JSON.stringify(prepared)}`);
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          candidate.args,
          undefined,
        );
        if (receipt.status !== "SUCCEEDED_PHYSICAL_REFERENCE_ONLY") {
          executionFailures.push(`${candidate.flow}[${prepared.registrySetId ?? "unknown-profile"}]`);
          continue;
        }
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS[candidate.type], candidate.flow);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(receipt, verificationExpectation(receipt));
        assert.equal(verified.verdict, 1, candidate.flow);
        assert.equal(verified.value, candidate.expected, candidate.flow);
        assert.equal(verified.authorityReleased, false, candidate.flow);
        retainedReceipt = receipt;
      }

      assert.deepEqual(executionFailures, [], `physical execution refused: ${executionFailures.join(", ")}`);

      assert.ok(retainedReceipt);
      assert.equal(
        slide.verifyTypedCheckedFungiPackageReceipt(
          { ...retainedReceipt, receiptDigest: `sha256:${"0".repeat(64)}` },
          verificationExpectation(retainedReceipt),
        ).verdict,
        -1,
      );

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
  },
);
