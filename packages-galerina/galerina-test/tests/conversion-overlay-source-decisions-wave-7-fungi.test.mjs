import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

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
  ["query-parameter-admission.fungi", "queryParameterAdmissionCore", "galerina-data-query/src/index.ts", "validateParameters", args([["nameValid", bool(true)], ["duplicate", bool(false)], ["typeKnown", bool(true)], ["parameterIndex", int(0)]]), string("accepted")],
  ["query-template-admission.fungi", "queryTemplateAdmissionCore", "galerina-data-query/src/index.ts", "validateTemplate", args([["templatePresent", bool(true)], ["rawInterpolation", bool(false)], ["stackedStatements", bool(false)], ["placeholdersDeclared", bool(true)], ["unusedCount", int(0)]]), string("accepted")],
  ["typed-query-admission.fungi", "typedQueryAdmissionCore", "galerina-data-query/src/index.ts", "validateTypedQuery", args([["identityFieldsPresent", bool(true)], ["cardinalityKnown", bool(true)], ["parametersAccepted", bool(true)], ["templateAccepted", bool(true)]]), bool(true)],
  ["typed-command-admission.fungi", "typedCommandAdmissionCore", "galerina-data-query/src/index.ts", "validateTypedCommand", args([["namePresent", bool(true)], ["modelPresent", bool(true)], ["effectKnown", bool(true)], ["parametersAccepted", bool(true)], ["templateAccepted", bool(true)]]), string("accepted")],
  ["database-access-policy-core.fungi", "databaseAccessPolicyCore", "galerina-data-query/src/index.ts", "validateDatabaseAccessPolicy", args([["namePresent", bool(true)], ["rawSqlDenied", bool(true)], ["exceptionsReviewed", bool(true)], ["expiriesValid", bool(true)], ["exceptionCount", int(1)]]), string("accepted_with_exceptions")],
  ["query-report-status-core.fungi", "queryReportStatusCore", "galerina-data-query/src/index.ts", "createQueryReport", args([["flowPresent", bool(true)], ["queriesAccepted", bool(true)], ["commandsAccepted", bool(true)], ["policyAccepted", bool(true)], ["exceptionCount", int(1)]]), string("warning")],
  ["pipeline-backpressure-admission.fungi", "pipelineBackpressureAdmissionCore", "galerina-data-pipeline/src/index.ts", "validateBackpressurePolicy", args([["maxInFlightValid", bool(true)], ["saturationModeKnown", bool(true)], ["timeoutSemanticsValid", bool(true)]]), bool(true)],
  ["pipeline-quarantine-admission.fungi", "pipelineQuarantineAdmissionCore", "galerina-data-pipeline/src/index.ts", "validateQuarantinePolicy", args([["destinationPresent", bool(true)], ["maxItems", int(100)], ["maxItemsValid", bool(true)]]), string("accepted")],
  ["pipeline-stage-admission.fungi", "pipelineStageAdmissionCore", "galerina-data-pipeline/src/index.ts", "validatePipelineStage", args([["identityPresent", bool(true)], ["transformTypesPresent", bool(true)], ["backpressureAccepted", bool(true)], ["batchPresent", bool(true)], ["batchAccepted", bool(true)], ["retryPresent", bool(false)], ["retryAccepted", bool(true)]]), string("accepted")],
  ["pipeline-definition-admission.fungi", "pipelineDefinitionAdmissionCore", "galerina-data-pipeline/src/index.ts", "validatePipelineDefinition", args([["identityAccepted", bool(true)], ["stagesAccepted", bool(true)], ["runtimeAccepted", bool(true)], ["quarantineConsistent", bool(true)]]), bool(true)],
  ["pipeline-report-status-core.fungi", "pipelineReportStatusCore", "galerina-data-pipeline/src/index.ts", "createPipelineReport", args([["identityPresent", bool(true)], ["countsValid", bool(true)], ["failedCount", int(2)], ["quarantinedCount", int(1)]]), string("warning_unquarantined")],
  ["response-mapping-admission.fungi", "responseMappingAdmissionCore", "galerina-data-response/src/index.ts", "validateResponseMapping", args([["mappingAccepted", bool(true)], ["allowlistCount", int(2)], ["forbiddenExposure", bool(false)], ["piiExposure", bool(false)]]), string("accepted")],
  ["response-field-projection.fungi", "responseFieldProjectionCore", "galerina-data-response/src/index.ts", "applyResponseMapping", args([["allowlisted", bool(true)], ["ownField", bool(true)], ["targetPresent", bool(true)], ["alreadyMapped", bool(false)]]), string("project")],
  ["response-report-status-core.fungi", "responseReportStatusCore", "galerina-data-response/src/index.ts", "createResponseReport", args([["kindKnown", bool(true)], ["mappingAccepted", bool(true)], ["countsValid", bool(true)], ["mappedCount", int(3)], ["droppedCount", int(1)]]), string("accepted")],
  ["data-report-envelope-admission.fungi", "dataReportEnvelopeAdmissionCore", "galerina-data-reports/src/index.ts", "validateDataReportEnvelope", args([["identityAccepted", bool(true)], ["evidenceAccepted", bool(true)], ["statusConsistent", bool(true)], ["countsValid", bool(true)]]), int(0)],
  ["data-report-envelope-construction.fungi", "dataReportEnvelopeConstructionCore", "galerina-data-reports/src/index.ts", "createDataReportEnvelope", args([["hasError", bool(false)], ["hasWarning", bool(true)], ["generatedAtPresent", bool(true)], ["countsPresent", bool(true)]]), string("partial")],
  ["search-document-admission.fungi", "searchDocumentAdmissionCore", "galerina-data-search/src/index.ts", "validateSearchDocument", args([["idPresent", bool(true)], ["fieldCount", int(2)], ["searchablePresent", bool(true)], ["fieldsNamed", bool(true)], ["duplicatesPresent", bool(false)], ["kindsKnown", bool(true)]]), string("accepted")],
  ["search-index-policy-admission.fungi", "searchIndexPolicyAdmissionCore", "galerina-data-search/src/index.ts", "validateSearchIndexPolicy", args([["namePresent", bool(true)], ["allowlistCount", int(2)], ["fieldNamesValid", bool(true)], ["piiIndexed", bool(false)]]), string("accepted")],
  ["search-index-input-status.fungi", "searchIndexInputStatusCore", "galerina-data-search/src/index.ts", "validateSearchIndexInput", args([["indexPresent", bool(true)], ["documentAccepted", bool(true)], ["policyAccepted", bool(true)], ["fieldsPresent", bool(true)], ["indexablePresent", bool(true)]]), string("accepted")],
  ["search-query-admission.fungi", "searchQueryAdmissionCore", "galerina-data-search/src/index.ts", "validateSearchQuery", args([["indexPresent", bool(true)], ["limitValid", bool(true)], ["offsetPresent", bool(true)], ["offsetValid", bool(true)], ["filtersValid", bool(true)]]), string("accepted")],
  ["search-ranking-admission.fungi", "searchRankingAdmissionCore", "galerina-data-search/src/index.ts", "validateSearchRanking", args([["strategyKnown", bool(true)], ["fieldBoost", bool(true)], ["boostCount", int(2)], ["boostsValid", bool(true)]]), string("accepted_boost")],
  ["search-index-report-status.fungi", "searchIndexReportStatusCore", "galerina-data-search/src/index.ts", "createSearchIndexReport", args([["indexPresent", bool(true)], ["policyAccepted", bool(true)], ["documentCountValid", bool(true)], ["skippedCountValid", bool(true)], ["skippedCount", int(0)]]), string("accepted")],
  ["html-parse-plan-admission.fungi", "htmlParsePlanAdmissionCore", "galerina-data-html/src/index.ts", "validateHtmlParsePlan", args([["namePresent", bool(true)], ["modeKnown", bool(true)], ["inputLimitValid", bool(true)], ["nodeLimitPresent", bool(true)], ["nodeLimitValid", bool(true)]]), string("accepted")],
  ["html-sanitize-policy-admission.fungi", "htmlSanitizePolicyAdmissionCore", "galerina-data-html/src/index.ts", "validateHtmlSanitizePolicy", args([["namePresent", bool(true)], ["allowlistEmpty", bool(false)], ["tagNamesValid", bool(true)], ["forbiddenTag", bool(false)], ["attributeNamesValid", bool(true)], ["eventHandlerAttribute", bool(false)]]), string("accepted")],
  ["html-render-plan-admission.fungi", "htmlRenderPlanAdmissionCore", "galerina-data-html/src/index.ts", "validateHtmlRenderPlan", args([["namePresent", bool(true)], ["sanitizeErrorCount", int(0)]]), int(0)],
  ["html-extraction-plan-admission.fungi", "htmlExtractionPlanAdmissionCore", "galerina-data-html/src/index.ts", "validateHtmlExtractionPlan", args([["sourcePresent", bool(true)], ["targetCount", int(2)], ["targetsKnown", bool(true)]]), string("accepted")],
  ["html-search-document-admission.fungi", "htmlSearchDocumentAdmissionCore", "galerina-data-html/src/index.ts", "validateHtmlSearchDocumentPlan", args([["documentIdPresent", bool(true)], ["fieldCount", int(2)], ["fieldNamesPresent", bool(true)], ["sourcesKnown", bool(true)]]), string("accepted")],
  ["html-processing-report-status.fungi", "htmlProcessingReportStatusCore", "galerina-data-html/src/index.ts", "createHtmlProcessingReport", args([["reportAccepted", bool(true)], ["countsValid", bool(true)], ["unsafeTotal", int(2)]]), string("unsafe_found")],
  ["archive-checksum-admission.fungi", "archiveChecksumAdmissionCore", "galerina-data-archive/src/index.ts", "validateChecksumRef", args([["algorithmKnown", bool(true)], ["digestLengthValid", bool(true)], ["hexValid", bool(true)]]), string("accepted")],
  ["archive-item-admission.fungi", "archiveItemAdmissionCore", "galerina-data-archive/src/index.ts", "validateArchiveItem", args([["pathPresent", bool(true)], ["relativePath", bool(true)], ["noTraversal", bool(true)], ["sizeValid", bool(true)], ["checksumAccepted", bool(true)]]), string("accepted")],
  ["archive-manifest-admission.fungi", "archiveManifestAdmissionCore", "galerina-data-archive/src/index.ts", "validateArchiveManifest", args([["identityAccepted", bool(true)], ["itemsAccepted", bool(true)], ["contentAccepted", bool(true)], ["optionalEvidenceConsistent", bool(true)]]), bool(true)],
  ["archive-integrity-status.fungi", "archiveIntegrityStatusCore", "galerina-data-archive/src/index.ts", "createArchiveIntegrityReport", args([["countsValid", bool(true)], ["itemCount", int(4)], ["verifiedCount", int(4)], ["failedCount", int(0)]]), string("verified")],
  ["archive-restore-status.fungi", "archiveRestoreStatusCore", "galerina-data-archive/src/index.ts", "createArchiveRestoreReport", args([["countsConsistent", bool(true)], ["requestedCount", int(4)], ["failedCount", int(0)], ["allRestoredVerified", bool(true)]]), string("verified")],
  ["json-memory-policy-admission.fungi", "jsonMemoryPolicyAdmissionCore", "galerina-data-json/src/index.ts", "validateJsonMemoryPolicy", args([["depthValid", bool(true)], ["documentLimitValid", bool(true)], ["stringLimitPresent", bool(true)], ["stringLimitValid", bool(true)]]), string("accepted_bounded_string")],
  ["json-decode-plan-admission.fungi", "jsonDecodePlanAdmissionCore", "galerina-data-json/src/index.ts", "validateJsonDecodePlan", args([["namePresent", bool(true)], ["modeKnown", bool(true)], ["memoryPolicyAccepted", bool(true)]]), string("accepted")],
  ["json-schema-contract-admission.fungi", "jsonSchemaContractAdmissionCore", "galerina-data-json/src/index.ts", "validateJsonSchemaContract", args([["headerAccepted", bool(true)], ["fieldCount", int(3)], ["fieldsAccepted", bool(true)]]), string("accepted")],
  ["json-extraction-plan-admission.fungi", "jsonExtractionPlanAdmissionCore", "galerina-data-json/src/index.ts", "validateJsonExtractionPlan", args([["sourcePresent", bool(true)], ["pointerCount", int(2)], ["allPointersAbsolute", bool(true)]]), string("accepted")],
  ["json-redaction-policy-admission.fungi", "jsonRedactionPolicyAdmissionCore", "galerina-data-json/src/index.ts", "validateJsonRedactionPolicy", args([["namePresent", bool(true)], ["containsPersonalData", bool(true)], ["fieldCount", int(2)], ["fieldNamesPresent", bool(true)]]), string("accepted")],
  ["json-archive-report-status.fungi", "jsonArchiveReportStatusCore", "galerina-data-json/src/index.ts", "createJsonArchiveReport", args([["archivePresent", bool(true)], ["decodePlanAccepted", bool(true)], ["redactionPresent", bool(true)], ["redactionAccepted", bool(true)], ["countsValid", bool(true)], ["documentCount", int(3)]]), string("accepted")],
  ["database-snapshot-admission.fungi", "databaseSnapshotAdmissionCore", "galerina-data-database/src/index.ts", "validateDatabaseSnapshot", args([["snapshotIdPresent", bool(true)], ["timestampValid", bool(true)], ["schemaVersionPresent", bool(true)], ["checksumAccepted", bool(true)]]), string("accepted")],
].map(([file, flow, source, symbol, input, expected]) => Object.freeze({ file, flow, source, symbol, input, expected })));

function shadowFingerprint(source) {
  const identifiers = new Map();
  return createHash("sha256").update(source
    .replace(/^\uFEFF/u, "")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/^\s*\/\/.*$/gmu, " ")
    .replace(/\b((?:pure|secure)\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*/gu, (match) => match.replace(/([A-Za-z_][A-Za-z0-9_]*)$/u, "FLOW"))
    .replace(/"(?:\\.|[^"\\])*"/gu, '"STRING"')
    .replace(/\b-?(?:0x[0-9a-fA-F_]+|\d[\d_]*)\b/gu, "NUMBER")
    .replace(/\s+/gu, " ").trim()
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

describe("40-file source-bound Fungi decision-core overlay wave 7", () => {
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
