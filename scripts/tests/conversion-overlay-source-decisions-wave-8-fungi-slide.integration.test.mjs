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
  ["table-export-admission.fungi", "tableExportAdmissionCore", [true, true, true, 1], "accepted", "string"],
  ["database-export-admission.fungi", "databaseExportAdmissionCore", [true, true, 2, true, true], "accepted", "string"],
  ["database-report-count-admission.fungi", "databaseReportCountAdmissionCore", [true, 7], 7, "int"],
  ["database-export-verification-status.fungi", "databaseExportVerificationStatusCore", [true, 2, 0, 2], "verified", "string"],
  ["database-restore-verification-status.fungi", "databaseRestoreVerificationStatusCore", [true, true, true, 0, true], "verified", "string"],
  ["db-boundary-operation-admission.fungi", "dbBoundaryOperationAdmissionCore", [true, true, true, true], 0, "int"],
  ["db-boundary-requirements-admission.fungi", "dbBoundaryRequirementsAdmissionCore", [true, true, true], 0, "int"],
  ["db-model-flow-admission.fungi", "dbModelFlowAdmissionCore", [true, 2, true, true, true], "accepted", "string"],
  ["db-report-index-admission.fungi", "dbReportIndexAdmissionCore", [true, 2, true, false], true, "bool"],
  ["db-boundary-report-status.fungi", "dbBoundaryReportStatusCore", [true, 3, 1], "warning", "string"],
  ["model-field-admission.fungi", "modelFieldAdmissionCore", [true, true, true, true], 0, "int"],
  ["data-model-admission.fungi", "dataModelAdmissionCore", [true, 1, true, true], "accepted", "string"],
  ["response-safe-field-selection.fungi", "responseSafeFieldSelectionCore", [true, true], "project", "string"],
  ["secure-string-reference-flags.fungi", "secureStringReferenceFlagsCore", [true, true], 3, "int"],
  ["redaction-result-status.fungi", "redactionResultStatusCore", [true, true, true, 2], "redacted", "string"],
  ["permission-model-default.fungi", "permissionModelDefaultCore", [2, false], "deny_with_grants", "string"],
  ["permission-decision-precedence.fungi", "permissionDecisionPrecedenceCore", [false, false, true, false, false], "allow_explicit", "string"],
  ["permission-model-admission.fungi", "permissionModelAdmissionCore", [true, true, true, false], 0, "int"],
  ["safe-token-reference-status.fungi", "safeTokenReferenceStatusCore", [true, 2], "scoped", "string"],
  ["safe-cookie-reference-flags.fungi", "safeCookieReferenceFlagsCore", [true, true, true], 3, "int"],
  ["safe-header-redaction-action.fungi", "safeHeaderRedactionActionCore", [true, true], 2, "int"],
  ["cryptographic-policy-admission.fungi", "cryptographicPolicyAdmissionCore", [256, false, true], "accepted", "string"],
  ["redaction-rule-admission.fungi", "redactionRuleAdmissionCore", [true, true, true], 0, "int"],
  ["security-report-summary.fungi", "securityReportSummaryCore", [true, 2, 1, true], "reported", "string"],
  ["weak-algorithm-membership.fungi", "weakAlgorithmMembershipCore", [true, true], true, "bool"],
  ["redaction-compile-action.fungi", "redactionCompileActionCore", [true, 0], "compiled", "string"],
  ["security-status-selection.fungi", "securityStatusSelectionCore", [0, 0, 1], "warning", "string"],
  ["query-option-some-tag.fungi", "queryOptionSomeTagCore", [true], true, "bool"],
  ["query-option-none-tag.fungi", "queryOptionNoneTagCore", [], "none", "string"],
  ["query-option-membership.fungi", "queryOptionMembershipCore", [true, true], true, "bool"],
  ["query-option-fallback-selection.fungi", "queryOptionFallbackSelectionCore", [true, true, true], "value", "string"],
  ["data-report-status-selection.fungi", "dataReportStatusSelectionCore", [0, 1], "partial", "string"],
  ["required-string-admission.fungi", "requiredStringAdmissionCore", [true, true, false], "value", "string"],
  ["project-config-admission.fungi", "projectConfigAdmissionCore", [true, true, true, true], 0, "int"],
  ["environment-variable-reference-flags.fungi", "environmentVariableReferenceFlagsCore", [true, true, true], "required_secret", "string"],
  ["environment-config-admission.fungi", "environmentConfigAdmissionCore", [true, true, true, true], true, "bool"],
  ["runtime-environment-status.fungi", "runtimeEnvironmentStatusCore", [true, true, false], "error", "string"],
  ["runtime-config-handoff-status.fungi", "runtimeConfigHandoffStatusCore", [true, false, 0, 0, true], "accepted", "string"],
  ["config-load-status.fungi", "configLoadStatusCore", [true, true, true], 0, "int"],
  ["host-manifest-boundary-status.fungi", "hostManifestBoundaryStatusCore", [true, false, true, false], "accepted", "string"],
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

it("publishes and independently re-admits all 40 wave-8 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.8",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.8", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-8-slide-"));
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
