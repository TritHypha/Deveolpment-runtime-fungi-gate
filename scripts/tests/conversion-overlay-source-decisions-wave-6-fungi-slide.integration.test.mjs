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
  ["regex-pattern-budget.fungi", "regexPatternBudgetCore", [8, 16, true], "parsed", "string"],
  ["regex-compile-admission.fungi", "regexCompileAdmissionCore", [true, true, true, 8], "compiled", "string"],
  ["regex-closure-instruction-action.fungi", "regexClosureInstructionActionCore", [true, false, false, false], "fork", "string"],
  ["regex-parser-peek.fungi", "regexParserPeekCore", [false, 65], 65, "int"],
  ["regex-parser-next-width.fungi", "regexParserNextWidthCore", [false, 128512, 3], 5, "int"],
  ["regex-parser-initial-state.fungi", "regexParserInitialStateCore", [true, true, 0], "ready", "string"],
  ["regex-parse-completion.fungi", "regexParseCompletionCore", [true, true], "accepted", "string"],
  ["regex-alternative-shape.fungi", "regexAlternativeShapeCore", [true, true, 2], "alternative", "string"],
  ["regex-concat-shape.fungi", "regexConcatShapeCore", [true, false, 3], "concat", "string"],
  ["regex-repeat-admission.fungi", "regexRepeatAdmissionCore", [true, true, false, false], "repeat", "string"],
  ["regex-quantifier-shape.fungi", "regexQuantifierShapeCore", [true, true, false, true, 2, 4], "bounded", "string"],
  ["regex-atom-dispatch.fungi", "regexAtomDispatchCore", [true, true, false, false, false], "group", "string"],
  ["regex-escape-range-action.fungi", "regexEscapeRangeActionCore", [true, true, false, true, 65], "class", "string"],
  ["regex-escape-node-result.fungi", "regexEscapeNodeResultCore", [true, true], "class_node", "string"],
  ["regex-character-class-result.fungi", "regexCharacterClassResultCore", [false, false, true, true, 2], "class", "string"],
  ["regex-matcher-construction.fungi", "regexMatcherConstructionCore", [true, true, 2], "uniform", "string"],
  ["regex-match-test-result.fungi", "regexMatchTestResultCore", [true, false, true], "matched", "string"],
  ["regex-stream-feed-verdict.fungi", "regexStreamFeedVerdictCore", [false, true, false, false], 1, "int"],
  ["regex-veto-error-construction.fungi", "regexVetoErrorConstructionCore", [true, true, false], "veto_error", "string"],
  ["regex-emitter-construction.fungi", "regexEmitterConstructionCore", [true, 64], "ready", "string"],
  ["regex-emitter-push-admission.fungi", "regexEmitterPushAdmissionCore", [4, 8, true], 5, "int"],
  ["regex-emitter-finish-action.fungi", "regexEmitterFinishActionCore", [true, 4, 8], "match_appended", "string"],
  ["regex-emitter-node-action.fungi", "regexEmitterNodeActionCore", [false, true, true, false, 2], "emit_char", "string"],
  ["regex-emitter-alternative-action.fungi", "regexEmitterAlternativeActionCore", [true, 3, true], "split_chain", "string"],
  ["regex-emitter-repeat-action.fungi", "regexEmitterRepeatActionCore", [true, 2, false, 4], "finite_tail", "string"],
  ["browser-runtime-report-core.fungi", "browserRuntimeReportCore", [0, 1, 0], "partial", "string"],
  ["web-family-report-index-core.fungi", "webFamilyReportIndexCore", [true, 0, 1, false, false], "partial", "string"],
  ["component-report-core.fungi", "componentReportCore", [true, 0, 0, 0], "success", "string"],
  ["web-event-report-core.fungi", "webEventReportCore", [3, true, false, true], "partial", "string"],
  ["dom-update-report-core.fungi", "domUpdateReportCore", [true, true, true, true, true], "success", "string"],
  ["template-param-segment.fungi", "templateParamSegmentCore", [true, true, 2], "parameter", "string"],
  ["web-route-report-core.fungi", "webRouteReportCore", [true, true, true, 4], "success", "string"],
  ["client-state-report-core.fungi", "clientStateReportCore", [true, true, true, true, false, true], "success", "string"],
  ["lowercase-header-action.fungi", "lowercaseHeaderActionCore", [true, true, 2], "join", "string"],
  ["http-response-write-action.fungi", "httpResponseWriteActionCore", [false, false, true, 3], "write_body", "string"],
  ["certificate-gate-resolution.fungi", "certificateGateResolutionCore", [true, true, 1], 1, "int"],
  ["secure-context-defaults.fungi", "secureContextDefaultsCore", [true, true, false, false, false], "default_verify_peer", "string"],
  ["api-request-dispatch.fungi", "apiRequestDispatchCore", [true, true, true, true, true], "dispatch_tls", "string"],
  ["principal-descriptor-read.fungi", "principalDescriptorReadCore", [true, true, true, true], "value", "string"],
  ["query-diagnostic-record.fungi", "queryDiagnosticRecordCore", [true, "warning", true, false], "without_path", "string"],
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

it("publishes and independently re-admits all 40 wave-6 source decisions through physical SLIDE/VOK", { skip: !SLIDE_AVAILABLE }, async () => {
  const slide = await loadSlide();
  const context = slide.portableVeoReferenceContext();
  const sources = CANDIDATES.map((candidate) => Uint8Array.from(readFileSync(join(SOURCE_ROOT, candidate.file))));
  const request = (candidateSources) => ({
    packages: [{
      identity: "@galerina/test",
      version: "1.0.0-beta.6",
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
        packages: [{ identity: "@galerina/test", version: "1.0.0-beta.6", exports: [{
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

  const parent = await mkdtemp(join(tmpdir(), "galerina-source-decisions-wave-6-slide-"));
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
