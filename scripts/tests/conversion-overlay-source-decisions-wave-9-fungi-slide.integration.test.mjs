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
  ["cert-gate-boundary-status.fungi", "certGateBoundaryStatusCore", [true, true, true, true, true], "authorized", "string"],
  ["cert-telemetry-boundary-status.fungi", "certTelemetryBoundaryStatusCore", [true, true, 0, true], "authorized", "string"],
  ["cert-verdict-fold.fungi", "certVerdictFoldCore", [false, false], 1, "int"],
  ["chain-validation-verdict.fungi", "chainValidationVerdictCore", [1], 1, "int"],
  ["host-kind-routing.fungi", "hostKindRoutingCore", [true, false, true, false], "ipv4", "string"],
  ["ipv4-category-classification.fungi", "ipv4CategoryClassificationCore", [false, false, false, false, false, false], "public", "string"],
  ["ipv6-category-classification.fungi", "ipv6CategoryClassificationCore", [true, false, false, false, false, false], "public", "string"],
  ["host-classification-flags.fungi", "hostClassificationFlagsCore", [true, true], 3, "int"],
  ["network-diagnostic-status.fungi", "networkDiagnosticStatusCore", [true, true], 3, "int"],
  ["network-report-summary.fungi", "networkReportSummaryCore", [0, 1, false, false], "warning", "string"],
  ["network-policy-default-flags.fungi", "networkPolicyDefaultFlagsCore", [false, false, false, false, false], 1, "int"],
  ["embedded-ipv4-category.fungi", "embeddedIpv4CategoryCore", [true, true], "public_ipv4_in_ipv6", "string"],
  ["ipv6-group-admission.fungi", "ipv6GroupAdmissionCore", [false, true, 3], "accepted", "string"],
  ["cors-request-admission.fungi", "corsRequestAdmissionCore", [false, false, false, true, false, true, true], "allowed", "string"],
  ["inbound-request-admission.fungi", "inboundRequestAdmissionCore", [true, false, true, false], "explicit_allow", "string"],
  ["outbound-host-admission.fungi", "outboundHostAdmissionCore", [false, false, false, false, false, false, false], "public_allowed", "string"],
  ["outbound-url-admission.fungi", "outboundUrlAdmissionCore", [true, false, true, true], "allowed", "string"],
  ["resolved-address-admission.fungi", "resolvedAddressAdmissionCore", [true, false, true], "all_public", "string"],
  ["poll-interval-admission.fungi", "pollIntervalAdmissionCore", [true, true], true, "bool"],
  ["inbound-rule-match.fungi", "inboundRuleMatchCore", [true, true], true, "bool"],
  ["certificate-expiry-verdict.fungi", "certificateExpiryVerdictCore", [true, true, true], 1, "int"],
  ["rate-limit-parse-status.fungi", "rateLimitParseStatusCore", [true, true, true, true, true], "accepted", "string"],
  ["pin-match-verdict.fungi", "pinMatchVerdictCore", [true, true, true], 1, "int"],
  ["inbound-port-match.fungi", "inboundPortMatchCore", [true, true], true, "bool"],
  ["inbound-protocol-match.fungi", "inboundProtocolMatchCore", [true, true], true, "bool"],
  ["rate-limit-key-dimension.fungi", "rateLimitKeyDimensionCore", [2, true], "service", "string"],
  ["revocation-recheck-due.fungi", "revocationRecheckDueCore", [false, true, true, true, true], true, "bool"],
  ["revocation-freshness-verdict.fungi", "revocationFreshnessVerdictCore", [false, false, true, true, true, true], 1, "int"],
  ["network-backend-selection-status.fungi", "networkBackendSelectionStatusCore", [true, true, false, false, true], "preferred", "string"],
  ["cert-subverdict-summary.fungi", "certSubverdictSummaryCore", [1, 1, 1, 1], "all_allow", "string"],
  ["uniform-auth-response-status.fungi", "uniformAuthResponseStatusCore", [true], 200, "int"],
  ["uniform-resource-response-status.fungi", "uniformResourceResponseStatusCore", [false, 404], 404, "int"],
  ["unique-string-summary.fungi", "uniqueStringSummaryCore", [3, 3, true], "unique_sorted", "string"],
  ["egress-policy-diagnostic-status.fungi", "egressPolicyDiagnosticStatusCore", [false, false, false, true, false], "accepted", "string"],
  ["endpoint-rule-admission.fungi", "endpointRuleAdmissionCore", [false, false, true, true, true], "accepted", "string"],
  ["network-policy-admission.fungi", "networkPolicyAdmissionCore", [true, true, true], "accepted", "string"],
  ["tls-policy-admission.fungi", "tlsPolicyAdmissionCore", [true, false, false, true, true, true], "accepted", "string"],
  ["webhook-target-admission.fungi", "webhookTargetAdmissionCore", [true, false], true, "bool"],
  ["side-signal-verdict-fold.fungi", "sideSignalVerdictFoldCore", [1, 0], 0, "int"],
  ["telemetry-feedback-verdict-fold.fungi", "telemetryFeedbackVerdictFoldCore", [1, 0, true], 0, "int"],
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

it("publishes and independently re-admits all 40 wave-9 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.9",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.9", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-9-slide-"));
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
