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
  ["table-export-admission.fungi", "tableExportAdmissionCore", "galerina-data-database/src/index.ts", "validateTableExport", args([["headerAccepted", bool(true)], ["checksumAccepted", bool(true)], ["redactionConsistent", bool(true)], ["classificationState", int(1)]]), string("accepted")],
  ["database-export-admission.fungi", "databaseExportAdmissionCore", "galerina-data-database/src/index.ts", "validateDatabaseExport", args([["identityAccepted", bool(true)], ["snapshotAccepted", bool(true)], ["tableCount", int(2)], ["tablesAccepted", bool(true)], ["restoreReferenceValid", bool(true)]]), string("accepted")],
  ["database-report-count-admission.fungi", "databaseReportCountAdmissionCore", "galerina-data-database/src/index.ts", "validateCount", args([["safeInteger", bool(true)], ["value", int(7)]]), int(7)],
  ["database-export-verification-status.fungi", "databaseExportVerificationStatusCore", "galerina-data-database/src/index.ts", "createDatabaseExportReport", args([["countsConsistent", bool(true)], ["tableCount", int(2)], ["failedCount", int(0)], ["verifiedCount", int(2)]]), string("verified")],
  ["database-restore-verification-status.fungi", "databaseRestoreVerificationStatusCore", "galerina-data-database/src/index.ts", "createDatabaseRestoreReport", args([["countsConsistent", bool(true)], ["schemaMatched", bool(true)], ["rowCountsMatched", bool(true)], ["failedCount", int(0)], ["allTablesVerified", bool(true)]]), string("verified")],
  ["db-boundary-operation-admission.fungi", "dbBoundaryOperationAdmissionCore", "galerina-data-db/src/index.ts", "validateDbBoundaryOperation", args([["namePresent", bool(true)], ["kindKnown", bool(true)], ["contractPresent", bool(true)], ["permissionReferenceValid", bool(true)]]), int(0)],
  ["db-boundary-requirements-admission.fungi", "dbBoundaryRequirementsAdmissionCore", "galerina-data-db/src/index.ts", "validateDbBoundaryRequirements", args([["parameterisedOnly", bool(true)], ["rawSqlDenied", bool(true)], ["responseMappingRequired", bool(true)]]), int(0)],
  ["db-model-flow-admission.fungi", "dbModelFlowAdmissionCore", "galerina-data-db/src/index.ts", "validateDbModelFlow", args([["modelPresent", bool(true)], ["operationCount", int(2)], ["operationsAccepted", bool(true)], ["requirementsAccepted", bool(true)], ["responseBoundaryConsistent", bool(true)]]), string("accepted")],
  ["db-report-index-admission.fungi", "dbReportIndexAdmissionCore", "galerina-data-db/src/index.ts", "validateDbReportIndex", args([["flowPresent", bool(true)], ["entryCount", int(2)], ["entriesSafe", bool(true)], ["duplicatesPresent", bool(false)]]), bool(true)],
  ["db-boundary-report-status.fungi", "dbBoundaryReportStatusCore", "galerina-data-db/src/index.ts", "createDbBoundaryReport", args([["flowAccepted", bool(true)], ["operationCount", int(3)], ["warningCount", int(1)]]), string("warning")],
  ["model-field-admission.fungi", "modelFieldAdmissionCore", "galerina-data-model/src/index.ts", "validateModelField", args([["identityAccepted", bool(true)], ["typeKnown", bool(true)], ["classificationKnown", bool(true)], ["secretStorageConsistent", bool(true)]]), int(0)],
  ["data-model-admission.fungi", "dataModelAdmissionCore", "galerina-data-model/src/index.ts", "validateDataModel", args([["structureAccepted", bool(true)], ["primaryKeyCount", int(1)], ["relationsAccepted", bool(true)], ["referencesValid", bool(true)]]), string("accepted")],
  ["response-safe-field-selection.fungi", "responseSafeFieldSelectionCore", "galerina-data-model/src/index.ts", "listResponseSafeFields", args([["classificationSafe", bool(true)], ["namePresent", bool(true)]]), string("project")],
  ["secure-string-reference-flags.fungi", "secureStringReferenceFlagsCore", "galerina-core-security/src/index.ts", "createSecureStringReference", args([["classificationKnown", bool(true)], ["fingerprintPresent", bool(true)]]), int(3)],
  ["redaction-result-status.fungi", "redactionResultStatusCore", "galerina-core-security/src/index.ts", "redactText", args([["inputWithinLimit", bool(true)], ["rulesValid", bool(true)], ["failClosed", bool(true)], ["matchCount", int(2)]]), string("redacted")],
  ["permission-model-default.fungi", "permissionModelDefaultCore", "galerina-core-security/src/index.ts", "definePermissionModel", args([["grantCount", int(2)], ["defaultAllow", bool(false)]]), string("deny_with_grants")],
  ["permission-decision-precedence.fungi", "permissionDecisionPrecedenceCore", "galerina-core-security/src/index.ts", "decidePermission", args([["explicitDeny", bool(false)], ["wildcardDeny", bool(false)], ["explicitAllow", bool(true)], ["wildcardAllow", bool(false)], ["defaultAllow", bool(false)]]), string("allow_explicit")],
  ["permission-model-admission.fungi", "permissionModelAdmissionCore", "galerina-core-security/src/index.ts", "validatePermissionModel", args([["defaultDeny", bool(true)], ["grantsUnique", bool(true)], ["resourcesValid", bool(true)], ["wildcardRiskPresent", bool(false)]]), int(0)],
  ["safe-token-reference-status.fungi", "safeTokenReferenceStatusCore", "galerina-core-security/src/index.ts", "createSafeTokenReference", args([["namePresent", bool(true)], ["scopeCount", int(2)]]), string("scoped")],
  ["safe-cookie-reference-flags.fungi", "safeCookieReferenceFlagsCore", "galerina-core-security/src/index.ts", "createSafeCookieReference", args([["httpOnly", bool(true)], ["secureFlag", bool(true)], ["sameSiteKnown", bool(true)]]), int(3)],
  ["safe-header-redaction-action.fungi", "safeHeaderRedactionActionCore", "galerina-core-security/src/index.ts", "createSafeHeaderReference", args([["sensitive", bool(true)], ["valueIsString", bool(true)]]), int(2)],
  ["cryptographic-policy-admission.fungi", "cryptographicPolicyAdmissionCore", "galerina-core-security/src/index.ts", "validateCryptographicPolicy", args([["minimumKeyBits", int(256)], ["weakAlgorithmAllowed", bool(false)], ["authenticatedEncryption", bool(true)]]), string("accepted")],
  ["redaction-rule-admission.fungi", "redactionRuleAdmissionCore", "galerina-core-security/src/index.ts", "validateRedactionRule", args([["namePresent", bool(true)], ["replacementSafe", bool(true)], ["regexValid", bool(true)]]), int(0)],
  ["security-report-summary.fungi", "securityReportSummaryCore", "galerina-core-security/src/index.ts", "createSecurityReport", args([["diagnosticsPresent", bool(true)], ["redactedSecrets", int(2)], ["blockedOperationCount", int(1)], ["statusKnown", bool(true)]]), string("reported")],
  ["weak-algorithm-membership.fungi", "weakAlgorithmMembershipCore", "galerina-core-security/src/index.ts", "isAllowedWeakAlgorithm", args([["listPresent", bool(true)], ["algorithmAllowed", bool(true)]]), bool(true)],
  ["redaction-compile-action.fungi", "redactionCompileActionCore", "galerina-core-security/src/index.ts", "compileRedactionRule", args([["regexValid", bool(true)], ["failureMode", int(0)]]), string("compiled")],
  ["security-status-selection.fungi", "securityStatusSelectionCore", "galerina-core-security/src/index.ts", "selectSecurityStatus", args([["criticalCount", int(0)], ["errorCount", int(0)], ["warningCount", int(1)]]), string("warning")],
  ["query-option-some-tag.fungi", "queryOptionSomeTagCore", "galerina-data-query/src/index.ts", "optionSome", args([["valueAdmitted", bool(true)]]), bool(true)],
  ["query-option-none-tag.fungi", "queryOptionNoneTagCore", "galerina-data-query/src/index.ts", "optionNone", args([]), string("none")],
  ["query-option-membership.fungi", "queryOptionMembershipCore", "galerina-data-query/src/index.ts", "isSome", args([["tagKnown", bool(true)], ["tagIsSome", bool(true)]]), bool(true)],
  ["query-option-fallback-selection.fungi", "queryOptionFallbackSelectionCore", "galerina-data-query/src/index.ts", "unwrapOr", args([["tagIsSome", bool(true)], ["valueAvailable", bool(true)], ["fallbackAvailable", bool(true)]]), string("value")],
  ["data-report-status-selection.fungi", "dataReportStatusSelectionCore", "galerina-data-reports/src/index.ts", "deriveDataReportStatus", args([["errorCount", int(0)], ["warningCount", int(1)]]), string("partial")],
  ["required-string-admission.fungi", "requiredStringAdmissionCore", "galerina-core-config/src/index.ts", "readRequiredString", args([["valueIsString", bool(true)], ["valueNonempty", bool(true)], ["pathPrefixPresent", bool(false)]]), string("value")],
  ["project-config-admission.fungi", "projectConfigAdmissionCore", "galerina-core-config/src/index.ts", "parseProjectConfig", args([["recordAccepted", bool(true)], ["requiredFieldsPresent", bool(true)], ["governanceAccepted", bool(true)], ["collectionsAccepted", bool(true)]]), int(0)],
  ["environment-variable-reference-flags.fungi", "environmentVariableReferenceFlagsCore", "galerina-core-config/src/index.ts", "defineEnvironmentVariableReference", args([["required", bool(true)], ["secretFlag", bool(true)], ["runtimeScope", bool(true)]]), string("required_secret")],
  ["environment-config-admission.fungi", "environmentConfigAdmissionCore", "galerina-core-config/src/index.ts", "parseEnvironmentConfig", args([["recordAccepted", bool(true)], ["modeAccepted", bool(true)], ["variablesAccepted", bool(true)], ["secretsAccepted", bool(true)]]), bool(true)],
  ["runtime-environment-status.fungi", "runtimeEnvironmentStatusCore", "galerina-core-config/src/index.ts", "validateRuntimeEnvironment", args([["requiredMissing", bool(true)], ["productionMode", bool(true)], ["allowMissingRequired", bool(false)]]), string("error")],
  ["runtime-config-handoff-status.fungi", "runtimeConfigHandoffStatusCore", "galerina-core-config/src/index.ts", "createRuntimeConfigHandoff", args([["environmentValidated", bool(true)], ["hasError", bool(false)], ["warningCount", int(0)], ["maximumWarnings", int(0)], ["productionMode", bool(true)]]), string("accepted")],
  ["config-load-status.fungi", "configLoadStatusCore", "galerina-core-config/src/index.ts", "loadConfigFromObjects", args([["projectPresent", bool(true)], ["environmentPresent", bool(true)], ["runtimeCanRun", bool(true)]]), int(0)],
  ["host-manifest-boundary-status.fungi", "hostManifestBoundaryStatusCore", "galerina-core-config/src/index.ts", "validateHostPackageManifestBoundary", args([["recordAccepted", bool(true)], ["forbiddenKeyPresent", bool(false)], ["dependencyObjectsValid", bool(true)], ["galerinaAliasPresent", bool(false)]]), string("accepted")],
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

describe("40-file source-bound Fungi decision-core overlay wave 8", () => {
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
