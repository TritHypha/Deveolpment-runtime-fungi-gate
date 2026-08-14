import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  checkEffects,
  emitGIR,
  executeFlow,
  parseProgram,
} from "../../galerina-core-compiler/dist/index.js";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PACKAGE_ROOT = join(ROOT, "packages-galerina", "galerina-test");
const OVERLAY_ROOT = join(PACKAGE_ROOT, "src", "self-hosted", "conversion-overlays");
const PACKAGE = join(PACKAGE_ROOT, "package.json");

const int = (value) => ({ __tag: "int", value });
const bool = (value) => ({ __tag: "bool", value });
const string = (value) => ({ __tag: "string", value });
const args = (entries) => new Map(entries);
const SHADOW_RESERVED_IDENTIFIERS = new Set([
  "version", "pure", "secure", "flow", "FLOW", "contract", "intent", "record",
  "return", "if", "match", "check", "deny", "ambig", "mut", "let",
  "Bool", "Int", "String", "Verdict", "Result", "Option", "Array",
  "true", "false", "Ok", "Err", "Some", "None", "Allow", "Deny", "Unknown",
]);

const CANDIDATES = Object.freeze([
  ["web-report-status.fungi", "webReportStatusCore", "galerina-web/src/index.ts", "deriveWebReportStatus", args([["hasError", bool(false)], ["hasWarning", bool(true)], ["diagnosticCount", int(1)]]), string("partial")],
  ["localhost-http-link.fungi", "localhostHttpLinkCore", "galerina-web-router/src/index.ts", "httpHostIsLocalhost", args([["authorityWellFormed", bool(true)], ["userInfoResolved", bool(true)], ["bracketHostClosed", bool(true)], ["localhostMember", bool(true)]]), string("localhost")],
  ["web-server-only-import.fungi", "webServerOnlyImportCore", "galerina-web/src/index.ts", "isServerOnlyImport", args([["specifierAdmitted", bool(true)], ["nodePrefix", bool(true)], ["knownServerModule", bool(false)]]), bool(true)],
  ["browser-runtime-profile-admission.fungi", "browserRuntimeProfileAdmissionCore", "galerina-web/src/index.ts", "validateBrowserRuntimeProfile", args([["namePresent", bool(true)], ["failClosed", bool(true)], ["secretFree", bool(true)], ["importsAdmitted", bool(true)], ["importCount", int(2)]]), bool(true)],
  ["web-family-entry-status.fungi", "webFamilyEntryStatusCore", "galerina-web/src/index.ts", "validateWebFamilyReportEntry", args([["entryWellFormed", bool(true)], ["statusConsistent", bool(true)], ["producerKnown", bool(true)], ["failedWithoutErrors", bool(false)], ["admittedStatus", string("valid")]]), string("valid")],
  ["component-child-admission.fungi", "componentChildAdmissionCore", "galerina-web-components/src/index.ts", "validateComponentChildContent", args([["kindKnown", bool(true)], ["safeHtml", bool(false)], ["sanitizePolicyPresent", bool(false)]]), string("accepted")],
  ["component-contract-accessibility.fungi", "componentContractAccessibilityCore", "galerina-web-components/src/index.ts", "validateComponentContract", args([["namePresent", bool(true)], ["propsAdmitted", bool(true)], ["slotsAdmitted", bool(true)], ["eventEmit", bool(true)], ["accessibilityPresent", bool(true)]]), bool(true)],
  ["component-prop-admission.fungi", "componentPropAdmissionCore", "galerina-web-components/src/index.ts", "validateComponentProps", args([["namePresent", bool(true)], ["duplicate", bool(false)], ["kindKnown", bool(true)], ["ordinal", int(0)]]), string("accepted")],
  ["event-payload-field-admission.fungi", "eventPayloadFieldAdmissionCore", "galerina-web-events/src/index.ts", "validateEventPayloadField", args([["index", int(0)], ["namePresent", bool(true)], ["kindKnown", bool(true)]]), bool(true)],
  ["event-rate-policy.fungi", "eventRatePolicyCore", "galerina-web-events/src/index.ts", "validateEventRatePolicy", args([["debounceInvalid", bool(false)], ["throttleInvalid", bool(false)], ["contradictory", bool(false)], ["selectedPolicy", string("debounce")]]), string("debounce")],
  ["sensitive-capability-gesture.fungi", "sensitiveCapabilityGestureCore", "galerina-web-events/src/index.ts", "validateSensitiveCapabilityDeclaration", args([["capabilityCount", int(1)], ["allKnown", bool(true)], ["requiresGesture", bool(true)]]), string("accepted")],
  ["web-event-contract-admission.fungi", "webEventContractAdmissionCore", "galerina-web-events/src/index.ts", "validateWebEventContract", args([["baseContractAdmitted", bool(true)], ["ratePolicyAdmitted", bool(true)], ["sensitiveCapabilityAdmitted", bool(true)]]), string("accepted")],
  ["link-scheme-decision.fungi", "linkSchemeDecisionCore", "galerina-web-router/src/index.ts", "validateLinkTarget", args([["targetPresent", bool(true)], ["protocolRelative", bool(false)], ["schemePresent", bool(true)], ["scheme", string("https")], ["localhost", bool(false)]]), string("allowed_secure")],
  ["route-data-fetch-admission.fungi", "routeDataFetchAdmissionCore", "galerina-web-router/src/index.ts", "validateRouteDataFetchContract", args([["queryReferencePresent", bool(true)], ["responseReferencePresent", bool(true)]]), string("accepted")],
  ["route-preload-bound.fungi", "routePreloadBoundCore", "galerina-web-router/src/index.ts", "validateRoutePreloadPolicy", args([["policyPresent", bool(true)], ["safeInteger", bool(true)], ["maxPreloadRoutes", int(4)]]), bool(true)],
  ["route-contract-param-admission.fungi", "routeContractParamAdmissionCore", "galerina-web-router/src/index.ts", "validateRouteContract", args([["namePresent", bool(true)], ["templatePresent", bool(true)], ["templateMalformed", bool(false)], ["declaredParamCount", int(2)], ["undeclaredCount", int(0)], ["validatorsKnown", bool(true)]]), string("accepted")],
  ["renderable-content-admission.fungi", "renderableContentAdmissionCore", "galerina-web-render/src/index.ts", "validateRenderableContent", args([["kindKnown", bool(true)], ["safeHtml", bool(false)], ["sanitizePolicyPresent", bool(false)], ["contentLength", int(2)]]), string("accepted")],
  ["render-content-list-status.fungi", "renderContentListStatusCore", "galerina-web-render/src/index.ts", "validateRenderableContentList", args([["itemCount", int(3)], ["invalidCount", int(0)]]), string("ready")],
  ["streaming-render-plan-admission.fungi", "streamingRenderPlanAdmissionCore", "galerina-web-render/src/index.ts", "validateStreamingBatchRenderPlan", args([["namePresent", bool(true)], ["itemsBoundValid", bool(true)], ["delayBoundValid", bool(true)], ["maxBatchItems", int(8)]]), bool(true)],
  ["state-diff-render-plan-admission.fungi", "stateDiffRenderPlanAdmissionCore", "galerina-web-render/src/index.ts", "validateStateDiffRenderPlan", args([["namePresent", bool(true)], ["stateReferencePresent", bool(true)], ["patchBoundValid", bool(true)], ["maxPatchOps", int(16)]]), bool(true)],
  ["api-state-conversion-admission.fungi", "apiStateConversionAdmissionCore", "galerina-web-state/src/index.ts", "validateApiToStateConversion", args([["conversionCaptured", bool(true)], ["stateReferencePresent", bool(true)], ["mappingReferencePresent", bool(true)]]), string("accepted")],
  ["hydration-field-admission.fungi", "hydrationFieldAdmissionCore", "galerina-web-state/src/index.ts", "validateHydrationContract", args([["contractNamePresent", bool(true)], ["fieldNamePresent", bool(true)], ["classificationKnown", bool(true)], ["secretClassification", bool(false)], ["fieldIndex", int(0)]]), string("accepted")],
  ["page-state-field-admission.fungi", "pageStateFieldAdmissionCore", "galerina-web-state/src/index.ts", "validatePageStateContract", args([["contractAndPhaseAdmitted", bool(true)], ["countsValid", bool(true)], ["duplicatesPresent", bool(false)], ["fieldKindsKnown", bool(true)], ["emptyContract", bool(false)]]), string("accepted")],
  ["state-diff-plan-admission.fungi", "stateDiffPlanAdmissionCore", "galerina-web-state/src/index.ts", "validateStateDiffPlan", args([["namePresent", bool(true)], ["operationBoundValid", bool(true)], ["maxOperations", int(10)]]), string("accepted")],
  ["environment-policy-flags.fungi", "environmentPolicyFlagsCore", "galerina-core-config/src/index.ts", "defaultEnvironmentPolicy", args([["mode", string("development")]]), int(3)],
  ["production-strictness-default.fungi", "productionStrictnessDefaultCore", "galerina-core-config/src/index.ts", "defineProductionStrictnessPolicy", args([["fieldPresent", bool(false)], ["providedValue", bool(false)], ["defaultValue", bool(true)]]), bool(true)],
  ["governance-resolution-status.fungi", "governanceResolutionStatusCore", "galerina-core-config/src/governance.ts", "resolveProjectGovernance", args([["requestPresent", bool(true)], ["requestedModeKnown", bool(true)], ["requestedMode", string("standard")]]), string("standard")],
  ["vector-tier-selection.fungi", "vectorTierSelectionCore", "galerina-core-economics/src/index.ts", "selectVectorTier", args([["profileAdmitted", bool(true)], ["requestedTier", string("avx2")]]), string("avx2")],
  ["regex-complement-gap.fungi", "regexComplementGapCore", "galerina-tri-regex/src/parser.ts", "complementRanges", args([["boundsValid", bool(true)], ["nextBeyondMaximum", bool(false)], ["gapPresent", bool(true)], ["tailPresent", bool(false)]]), string("gap")],
  ["regex-range-normalization-action.fungi", "regexRangeNormalizationActionCore", "galerina-tri-regex/src/parser.ts", "normalizeRanges", args([["lower", int(5)], ["upper", int(8)], ["hasPrevious", bool(true)], ["previousUpper", int(4)]]), string("merge")],
  ["regex-search-step.fungi", "regexSearchStepCore", "galerina-tri-regex/src/compile.ts", "inRangesWithCost", args([["codePoint", int(65)], ["lower", int(64)], ["upper", int(90)]]), string("matched")],
  ["regex-veto-record.fungi", "regexVetoRecordCore", "galerina-tri-regex/src/parser.ts", "veto", args([["codePresent", bool(true)], ["reasonPresent", bool(true)], ["offsetPresent", bool(true)]]), string("veto_with_offset")],
  ["certificate-date-admission.fungi", "certificateDateAdmissionCore", "galerina-framework-api-server/src/index.ts", "parseCertDate", args([["valuePresent", bool(true)], ["parsedFinite", bool(true)], ["parsedMilliseconds", int(1)]]), string("parsed")],
  ["url-query-last-wins.fungi", "urlQueryLastWinsCore", "galerina-framework-api-server/src/index.ts", "parseUrl", args([["rawPresent", bool(true)], ["pathPresent", bool(true)], ["repeatedKey", bool(true)], ["valuePresent", bool(true)]]), string("replace_last")],
  ["principal-resolution-admission.fungi", "principalResolutionAdmissionCore", "galerina-framework-api-server/src/index.ts", "snapshotPrincipalResolution", args([["objectShapeAdmitted", bool(true)], ["fieldSetCanonical", bool(true)], ["principalIdCanonical", bool(true)], ["scopeCount", int(2)], ["scopesCanonical", bool(true)]]), bool(true)],
  ["tls-principal-admission.fungi", "tlsPrincipalAdmissionCore", "galerina-framework-api-server/src/index.ts", "principalFromAdmittedTls", args([["tlsSocket", bool(true)], ["certificatePresent", bool(true)], ["certificateBytes", int(128)], ["digestBound", bool(true)]]), string("admitted")],
  ["hybrid-signature-encoding-admission.fungi", "hybridSignatureEncodingAdmissionCore", "galerina-tower-citizen/src/registry-key-rotation.ts", "encodeSignature", args([["envelopePresent", bool(true)], ["edSignaturePresent", bool(true)], ["mlSignaturePresent", bool(true)], ["edColonFree", bool(true)], ["mlColonFree", bool(true)]]), bool(true)],
  ["hybrid-signature-decoding-admission.fungi", "hybridSignatureDecodingAdmissionCore", "galerina-tower-citizen/src/registry-key-rotation.ts", "decodeSignature", args([["stringValue", bool(true)], ["partCount", int(2)], ["edSignaturePresent", bool(true)], ["mlSignaturePresent", bool(true)]]), string("decoded")],
  ["rotation-transition-admission.fungi", "rotationTransitionAdmissionCore", "galerina-tower-citizen/src/registry-key-rotation.ts", "transitionWellFormed", args([["nullTransition", bool(false)], ["epochStepAdmitted", bool(true)], ["tickAndHeadAdmitted", bool(true)], ["macEvidenceComplete", bool(true)]]), bool(true)],
  ["canonical-instant-admission.fungi", "canonicalInstantAdmissionCore", "galerina-tower-citizen/src/registry-key-rotation.ts", "canonicalInstant", args([["stringValue", bool(true)], ["nonEmpty", bool(true)], ["parsedFinite", bool(true)], ["roundTripEqual", bool(true)]]), string("canonical")],
].map(([file, flow, source, symbol, input, expected]) =>
  Object.freeze({ file, flow, source, symbol, input, expected })));

function shadowFingerprint(source) {
  const identifiers = new Map();
  return createHash("sha256").update(source
    .replace(/^\uFEFF/u, "")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/^\s*\/\/.*$/gmu, " ")
    .replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu, (match) =>
      match.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u, "FLOW"))
    .replace(/"(?:\\.|[^"\\])*"/gu, '"STRING"')
    .replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu, "NUMBER")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/gu, (identifier) => {
      if (SHADOW_RESERVED_IDENTIFIERS.has(identifier)) return identifier;
      let replacement = identifiers.get(identifier);
      if (replacement === undefined) {
        replacement = `ID${identifiers.size}`;
        identifiers.set(identifier, replacement);
      }
      return replacement;
    }), "utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 5", () => {
  it("binds 40 distinct live source behaviours and package assets", () => {
    assert.equal(CANDIDATES.length, 40);
    const loadedAssets = JSON.parse(readFileSync(PACKAGE, "utf8")).packageGraph?.loadedAssets ?? [];
    const sourceScopes = new Set();
    for (const candidate of CANDIDATES) {
      assert.ok(loadedAssets.includes(`src/self-hosted/conversion-overlays/${candidate.file}`), `${candidate.file} must be a loaded asset`);
      const reference = readFileSync(join(ROOT, "packages-galerina", candidate.source), "utf8");
      assert.ok(reference.includes(candidate.symbol), `${candidate.source} must contain ${candidate.symbol}`);
      assert.equal(sourceScopes.has(`${candidate.source}#${candidate.symbol}`), false, `${candidate.symbol} must be a distinct source scope`);
      sourceScopes.add(`${candidate.source}#${candidate.symbol}`);
    }
  });

  it("has no exact duplicate or normalized template shadow", () => {
    const seen = new Map();
    for (const candidate of CANDIDATES) {
      const path = join(OVERLAY_ROOT, candidate.file);
      assert.ok(existsSync(path), `${candidate.file} must exist`);
      const source = readFileSync(path, "utf8");
      for (const [kind, fingerprint] of [
        ["exact duplicate", createHash("sha256").update(source, "utf8").digest("hex")],
        ["template shadow", shadowFingerprint(source)],
      ]) {
        assert.equal(seen.has(fingerprint), false, `${candidate.file} ${kind} of ${seen.get(fingerprint)}`);
        seen.set(fingerprint, candidate.file);
      }
    }
  });

  it("parses, effect-checks, emits GIR and executes every decision core", async () => {
    for (const candidate of CANDIDATES) {
      const source = readFileSync(join(OVERLAY_ROOT, candidate.file), "utf8").replace(/^\uFEFF/u, "");
      const program = parseProgram(source, candidate.file);
      assert.deepEqual((program.diagnostics ?? []).filter((d) => d.severity === "error"), [], candidate.file);
      const effects = checkEffects(program.flows, program.ast);
      assert.deepEqual(effects.flatMap((r) => r.diagnostics).filter((d) => d.severity === "error"), [], candidate.file);
      const { gir } = emitGIR(program.ast, program.flows, effects);
      assert.equal(gir.flows.length, 1, candidate.file);
      const execution = await executeFlow(candidate.flow, candidate.input, program.ast, program.flows);
      assert.deepEqual(execution.value, candidate.expected, candidate.file);
    }
  });
});
