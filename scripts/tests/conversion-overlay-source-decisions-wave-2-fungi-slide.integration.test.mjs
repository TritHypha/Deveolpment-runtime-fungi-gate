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
  "packages-galerina",
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
  ["capability-bitmask-core.fungi", "capabilityBitmaskCore", [true, "ai.inference"], 32, "int"],
  ["composite-capability-bitmask.fungi", "compositeCapabilityBitmaskCore", ["ledger.mutate", 0], 10, "int"],
  ["capability-alias-normalization.fungi", "normalizeCapabilityCore", ["db.read"], "database.read", "string"],
  ["capability-admission.fungi", "admissibleCapabilityCore", [false, true, false], true, "bool"],
  ["governance-floor-normalization.fungi", "normaliseFloorCore", ["proof_zone"], "floor_3", "string"],
  ["decimal-round-mode.fungi", "isDecimalRoundModeCore", ["halfEven"], true, "bool"],
  ["plugin-type-compatibility.fungi", "pluginTypeCompatibleCore", ["Int", "Float"], true, "bool"],
  ["recognized-limit-declaration.fungi", "recognizedLimitDeclarationCore", [true, true, "request_size"], true, "bool"],
  ["retry-strategy.fungi", "validRetryStrategyCore", ["exponential_backoff"], true, "bool"],
  ["canonical-limit-token.fungi", "canonicalLimitTokenCore", ["request", "size", true], "request_size", "string"],
  ["wat-record-field-admission.fungi", "watRecordFieldSupportedCore", ["Int64", "i64"], true, "bool"],
  ["wat-64bit-type.fungi", "wat64BitTypeCore", [true, "UInt64"], true, "bool"],
  ["wasm-flow-exportability.fungi", "wasmFlowExportableCore", ["guarded", 0], true, "bool"],
  ["environment-mode-membership.fungi", "environmentModeMemberCore", ["production"], true, "bool"],
  ["governance-mode-membership.fungi", "governanceModeMemberCore", [true, "lean"], true, "bool"],
  ["package-graph-alias.fungi", "packageGraphAliasCore", [true, "Galerina.lock"], true, "bool"],
  ["secret-config-source-kind.fungi", "secretConfigSourceKindCore", ["env"], true, "bool"],
  ["security-posture-membership.fungi", "securityPostureMemberCore", ["auto"], true, "bool"],
  ["decision-state-classification.fungi", "classifyDecisionStateCore", ["review"], 0, "int"],
  ["tensor-shape-compatibility.fungi", "tensorShapeCompatibleCore", [true, true, false], false, "bool"],
  ["response-safe-classification.fungi", "responseSafeClassificationCore", ["public"], true, "bool"],
  ["localhost-host-membership.fungi", "localhostHostCore", ["127.0.0.1"], true, "bool"],
  ["governance-delta-classification.fungi", "classifyGovernanceDeltaCore", [false, false, false, true], "tightening", "string"],
  ["boundary-crossing-admission.fungi", "boundaryCrossingAllowedCore", [true, false, 1], false, "bool"],
  ["implicit-return-type.fungi", "implicitReturnTypeCore", ["Void"], true, "bool"],
  ["generic-type-name.fungi", "genericTypeNameCore", ["unknown"], true, "bool"],
  ["payment-flow-classification.fungi", "paymentFlowCore", [false, true], true, "bool"],
  ["gate-call-classification.fungi", "gateCallCore", [false, true], true, "bool"],
  ["nonempty-string-admission.fungi", "nonEmptyStringCore", [true, 0], false, "bool"],
  ["durability-platform.fungi", "durabilityPlatformCore", ["linux"], true, "bool"],
  ["durability-architecture.fungi", "durabilityArchitectureCore", ["aarch64"], true, "bool"],
  ["durability-evidence-class.fungi", "durabilityEvidenceClassCore", [true, false], false, "bool"],
  ["literal-verification-success.fungi", "literalVerificationSuccessCore", [true], true, "bool"],
  ["external-href-classification.fungi", "externalHrefCore", [false, false, true, false], true, "bool"],
  ["private-path-classification.fungi", "privatePathCore", [false, true], true, "bool"],
  ["search-error-presence.fungi", "searchErrorPresenceCore", [true], true, "bool"],
  ["epistemic-state-classification.fungi", "classifyEpistemicStateCore", ["UNKNOWN"], 0, "int"],
  ["server-only-import.fungi", "serverOnlyImportCore", [false, true], true, "bool"],
  ["benchmark-shareability.fungi", "benchmarkShareableCore", [true, false, true, true, true, true], true, "bool"],
  ["positive-safe-integer.fungi", "positiveSafeIntegerCore", [true, 3], true, "bool"],
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
  "publishes and independently re-admits all 40 wave-2 source decisions through physical SLIDE/VOK",
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

    const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-2-slide-"));
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
        const receipt = slide.executeTypedCheckedFungiPackagePublication(
          prepared.packageExecutionHandle,
          candidate.args,
          undefined,
        );
        assert.equal(receipt.status, "SUCCEEDED_PHYSICAL_REFERENCE_ONLY", candidate.flow);
        assert.equal(receipt.safeValueTypeId, slide.SAFE_VALUE_TYPE_IDS[candidate.type], candidate.flow);
        const verified = slide.verifyTypedCheckedFungiPackageReceipt(receipt, verificationExpectation(receipt));
        assert.equal(verified.verdict, 1, candidate.flow);
        assert.equal(verified.value, candidate.expected, candidate.flow);
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
