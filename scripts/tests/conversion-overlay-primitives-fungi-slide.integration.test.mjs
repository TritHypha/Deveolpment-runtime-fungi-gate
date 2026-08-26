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
  ["myco-max-index-path-length.fungi", "mycoMaxIndexPathLength", "int", 4096],
  ["myco-max-index-term-length.fungi", "mycoMaxIndexTermLength", "int", 4096],
  ["myco-max-index-files.fungi", "mycoMaxIndexFiles", "int", 250_000],
  ["myco-max-index-terms-per-file.fungi", "mycoMaxIndexTermsPerFile", "int", 100_000],
  ["myco-max-index-term-edges.fungi", "mycoMaxIndexTermEdges", "int", 2_000_000],
  ["myco-max-index-bytes.fungi", "mycoMaxIndexBytes", "int", 67_108_864],
  ["myco-index-format.fungi", "mycoIndexFormat", "int", 1],
  ["myco-index-dir.fungi", "mycoIndexDir", "string", ".myco"],
  ["myco-index-file.fungi", "mycoIndexFile", "string", "index.json"],
  ["myco-max-repetition.fungi", "mycoMaxRepetition", "int", 1000],
  ["myco-max-regex-line-length.fungi", "mycoMaxRegexLineLength", "int", 200_000],
  ["myco-search-time-budget-ms.fungi", "mycoSearchTimeBudgetMs", "int", 5_000],
  ["myco-regex-operation-time-budget-ms.fungi", "mycoRegexOperationTimeBudgetMs", "int", 250],
  ["myco-sniff-bytes.fungi", "mycoSniffBytes", "int", 8000],
  ["tri-regex-match.fungi", "triRegexMatch", "verdict", 1],
  ["tower-policy-has-allowlist.fungi", "towerPolicyHasAllowlist", "int", 1],
  ["tower-policy-deny-host-native.fungi", "towerPolicyDenyHostNative", "int", 2],
  ["tower-policy-has-call-budget.fungi", "towerPolicyHasCallBudget", "int", 4],
  ["tower-policy-has-token-budget.fungi", "towerPolicyHasTokenBudget", "int", 8],
  ["tower-policy-has-cost-ceiling.fungi", "towerPolicyHasCostCeiling", "int", 16],
  ["tower-ai-inference-capability.fungi", "towerAiInferenceCapability", "int", 32],
  ["tower-demo-count.fungi", "towerDemoCount", "int", 16],
  ["tower-photonic-reprogram-capability.fungi", "towerPhotonicReprogramCapability", "string", "photonic.reprogram"],
  ["tower-max-plugin-input-bytes.fungi", "towerMaxPluginInputBytes", "int", 4_194_304],
  ["tower-max-plugin-input-depth.fungi", "towerMaxPluginInputDepth", "int", 32],
  ["tower-max-plugin-input-nodes.fungi", "towerMaxPluginInputNodes", "int", 10_000],
  ["tower-max-container-fields.fungi", "towerMaxContainerFields", "int", 1000],
  ["tower-transition-context.fungi", "towerTransitionContext", "string", "galerina.registry.rotation.transition.v1"],
  ["tower-challenge-context.fungi", "towerChallengeContext", "string", "galerina.registry.rotation.challenge.v1"],
  ["tower-snapshot-key-context.fungi", "towerSnapshotKeyContext", "string", "galerina.snapshot.epoch.key.v1"],
  ["tower-storage-admit-capability.fungi", "towerStorageAdmitCapability", "string", "storage.admit"],
  ["tower-governance-diagnostic.fungi", "towerGovernanceDiagnostic", "string", "FUNGI-GOV-3VL-001"],
  ["tower-encoding-reject.fungi", "towerEncodingReject", "int", 0],
  ["tower-encoding-hold.fungi", "towerEncodingHold", "int", 1],
  ["tower-encoding-commit.fungi", "towerEncodingCommit", "int", 2],
  ["tower-encoding-illegal.fungi", "towerEncodingIllegal", "int", 3],
  ["tower-trits-per-i32.fungi", "towerTritsPerI32", "int", 16],
  ["tower-canary.fungi", "towerCanary", "int", 2_119_682_814],
  ["tri-regex-infinity-sentinel.fungi", "triRegexInfinitySentinel", "int", 2_147_483_647],
  ["tri-regex-max-code-point.fungi", "triRegexMaxCodePoint", "int", 1_114_111],
].map(([file, flow, type, value]) => Object.freeze({ file, flow, type, value })));

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

function request(slide, context, sources) {
  return {
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.2",
      exports: CANDIDATES.map((candidate, index) => ({
        name: candidate.flow,
        sourceFlowName: candidate.flow,
        sourceBytes: sources[index],
      })),
      dependencies: [],
      resources: [],
    }],
    context,
    gates: ALL_ALLOW,
  };
}

it(
  "publishes and independently re-admits all 40 primitive overlays through physical SLIDE/VOK",
  { skip: !SLIDE_AVAILABLE },
  async () => {
    const slide = await loadSlide();
    const context = slide.portableVeoReferenceContext();
    const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
    const compiled = slide.compileCheckedFungiPackageSet(request(slide, context, sources));
    assert.equal(compiled.verdict, 1, JSON.stringify(compiled));

    const mutatedSources = sources.map((source) => Uint8Array.from(source));
    mutatedSources[0][0] ^= 1;
    assert.equal(slide.compileCheckedFungiPackageSet(request(slide, context, mutatedSources)).verdict, -1);

    const parent = await mkdtemp(join(tmpdir(), "galerina-conversion-overlays-slide-"));
    const publicationDirectory = join(parent, "published");
    try {
      const published = await slide.publishCheckedFungiPackageBuild({
        packageBuildHandle: compiled.packageBuildHandle,
        outputDirectory: publicationDirectory,
      });
      assert.equal(published.verdict, 1, JSON.stringify(published));
      assert.equal(published.outputFiles.filter((name) => name.endsWith(".slide")).length, 40);

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
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          [],
          { steps: 64 },
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", candidate.flow);
        assert.equal(
          receipt.safeValueTypeId,
          candidate.type === "int"
            ? slide.SAFE_VALUE_TYPE_IDS.int
            : candidate.type === "verdict"
              ? slide.SAFE_VALUE_TYPE_IDS.verdict
              : slide.SAFE_VALUE_TYPE_IDS.string,
          candidate.flow,
        );
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(receipt, verificationExpectation(receipt));
        assert.equal(verified.verdict, 1, candidate.flow);
        assert.equal(verified.value, candidate.value, candidate.flow);
        assert.equal(verified.authorityReleased, false, candidate.flow);
        retainedReceipt = receipt;
      }

      assert.ok(retainedReceipt);
      assert.equal(
        slide.verifyTypedCheckedFungiPackageReceipt(
          { ...retainedReceipt, receiptDigest: `sha256:${"0".repeat(64)}` },
          verificationExpectation(retainedReceipt),
        ).verdict,
        -1,
      );

      const firstSlide = published.outputFiles.find((name) => name.endsWith(".slide"));
      assert.ok(firstSlide);
      const firstSlidePath = join(publicationDirectory, firstSlide);
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
