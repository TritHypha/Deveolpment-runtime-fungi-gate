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
const PACKAGE_ROOT = join(ROOT, "packages-ts", "galerina-test");
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
  ["explicit-resilience-presence.fungi", "explicitResiliencePresenceCore", "galerina-core-compiler/src/resilience-inference.ts", "hasExplicitResilience", args([["contractFound", bool(true)], ["markerFound", bool(true)]]), bool(true)],
  ["gate-call-name-classification.fungi", "gateCallNameClassificationCore", "galerina-core-compiler/src/value-state-checker.ts", "isGateCallName", args([["builtinPrefix", bool(false)], ["userPrefix", bool(false)], ["registryPresent", bool(true)], ["registryMatched", bool(true)]]), bool(true)],
  ["resilience-fallback-selection.fungi", "resilienceFallbackSelectionCore", "galerina-core-compiler/src/resilience-inference.ts", "extractFallback", args([["rawPresent", bool(true)], ["recognized", bool(true)], ["value", string("return_cached")]]), string("return_cached")],
  ["resilience-retry-count.fungi", "resilienceRetryCountCore", "galerina-core-compiler/src/resilience-inference.ts", "extractRetryCount", args([["rawPresent", bool(true)], ["matchPresent", bool(true)], ["parsed", int(3)]]), int(3)],
  ["resilience-quarantine-action.fungi", "resilienceQuarantineActionCore", "galerina-core-compiler/src/resilience-inference.ts", "extractOnQuarantine", args([["rawPresent", bool(true)], ["setPostureBit", bool(true)], ["actionCaptured", bool(true)], ["action", string("isolated")]]), string("isolated")],
  ["effect-namespace-selection.fungi", "effectNamespaceSelectionCore", "galerina-core-compiler/src/leak-proof.ts", "nsOf", args([["dotIndex", int(6)], ["prefix", string("secret")], ["effect", string("secret.read")]]), string("secret")],
  ["diagnostic-capability-selection.fungi", "diagnosticCapabilitySelectionCore", "galerina-core-compiler/src/leak-proof.ts", "extractCapability", args([["matched", bool(false)], ["captured", string("secret.read")]]), string("unknown")],
  ["import-profile-mask.fungi", "importProfileMaskCore", "galerina-core-config/src/posture.ts", "deriveImportProfile", args([["effective", string("on")]]), int(1)],
  ["log-call-classification.fungi", "logCallClassificationCore", "galerina-core-compiler/src/value-state-checker.ts", "isLogCall", args([["directPrint", bool(false)], ["receiverSegment", string("logger")]]), bool(true)],
  ["tri-state-record-admission.fungi", "triStateRecordAdmissionCore", "galerina-core-logic/src/bool-boundary/bool-enforce.ts", "isTriState", args([["objectLike", bool(true)], ["kindPresent", bool(true)], ["validKind", bool(true)], ["reasonPresent", bool(false)]]), bool(true)],
  ["query-option-unwrap.fungi", "queryOptionUnwrapCore", "galerina-data-query/src/index.ts", "unwrapOr", args([["some", bool(false)], ["value", string("present")], ["fallbackValue", string("fallback")]]), string("fallback")],
  ["sensitive-header-decision.fungi", "sensitiveHeaderDecisionCore", "galerina-core-security/src/index.ts", "isSensitiveHeaderName", args([["normalizedName", string("set-cookie")]]), bool(true)],
  ["ternary-mac-step.fungi", "ternaryMacStepCore", "galerina-ext-photonic-emulator/src/emulator.ts", "tmacExact", args([["weight", int(-1)], ["activation", int(3)], ["sum", int(10)]]), int(7)],
  ["regex-global-flag-action.fungi", "regexGlobalFlagActionCore", "galerina-core-security/src/index.ts", "normalizeRegexFlags", args([["flagsProvided", bool(true)], ["globalPresent", bool(false)]]), string("append_g")],
  ["high-risk-permission-decision.fungi", "highRiskPermissionDecisionCore", "galerina-core-security/src/index.ts", "isHighRiskPermissionAction", args([["action", string("native")]]), bool(true)],
  ["code-unit-ordering.fungi", "codeUnitOrderingCore", "galerina-core-compiler/src/gate-v3-parser.ts", "byCodeUnit", args([["leftLess", bool(false)], ["leftGreater", bool(true)]]), int(1)],
  ["exact-data-shape-admission.fungi", "exactDataShapeAdmissionCore", "galerina-framework-app-kernel/src/registry-durability-production-admission.ts", "hasExactDataShape", args([["ordinaryPrototype", bool(true)], ["keysExact", bool(true)], ["dataDescriptors", bool(true)], ["functionsAllowed", bool(false)], ["functionValuePresent", bool(false)]]), bool(true)],
  ["oracle-int32-agreement.fungi", "oracleInt32AgreementCore", "galerina-inference-bridge-contract/src/oracle.ts", "oracleAgrees", args([["candidate", int(17)], ["reference", int(17)]]), bool(true)],
  ["result-count-limit.fungi", "resultCountLimitCore", "galerina-core-compiler/src/runtime/limitPolicy.ts", "checkResultCount", args([["configured", bool(true)], ["count", int(11)], ["limit", int(10)]]), string("results")],
  ["query-length-limit.fungi", "queryLengthLimitCore", "galerina-core-compiler/src/runtime/limitPolicy.ts", "checkQueryLength", args([["configured", bool(true)], ["chars", int(80)], ["limit", int(100)]]), bool(false)],
  ["amount-limit.fungi", "amountLimitCore", "galerina-core-compiler/src/runtime/limitPolicy.ts", "checkAmount", args([["configured", bool(true)], ["amount", int(101)], ["limit", int(100)]]), int(101)],
  ["concurrent-task-limit.fungi", "concurrentTaskLimitCore", "galerina-core-compiler/src/runtime/limitPolicy.ts", "checkConcurrentTasks", args([["configured", bool(true)], ["current", int(5)], ["limit", int(4)]]), string("concurrent_tasks")],
  ["client-address-source.fungi", "clientAddressSourceCore", "galerina-core-network/src/defensive-controls.ts", "resolveClientAddress", args([["proxyTrusted", bool(true)], ["forwardedPresent", bool(true)]]), string("forwarded")],
  ["throttle-threshold-selection.fungi", "throttleThresholdSelectionCore", "galerina-core-network/src/admission-feedback.ts", "resolveThrottleThreshold", args([["numberPresent", bool(true)], ["finite", bool(true)], ["inRange", bool(false)], ["candidate", int(2)], ["fallbackValue", int(1)]]), int(1)],
  ["residency-floor-decision.fungi", "residencyFloorDecisionCore", "galerina-core-compiler/src/hardening-residency.ts", "atLeastAsStrict", args([["tierRank", int(1)], ["floorRank", int(2)]]), bool(true)],
  ["serialization-call-classification.fungi", "serializationCallClassificationCore", "galerina-core-compiler/src/value-state-checker.ts", "isSerializationCall", args([["directMethod", bool(false)], ["jsonEncode", bool(true)], ["jsonStringify", bool(false)], ["tomlEncode", bool(false)], ["xmlEncode", bool(false)]]), bool(true)],
  ["cpu-feature-coverage.fungi", "cpuFeatureCoverageCore", "galerina-target-cpu/src/index.ts", "supportsCpuFeatures", args([["firstMissingIndex", int(-1)], ["requiredCount", int(3)]]), bool(true)],
  ["sandbox-path-escape.fungi", "sandboxPathEscapeCore", "galerina-devtools-security/src/path-sandbox.ts", "isPathEscape", args([["sandboxAllowed", bool(false)]]), bool(true)],
  ["unsafe-modifier-presence.fungi", "unsafeModifierPresenceCore", "galerina-devtools-provenance/src/analyzer.ts", "hasUnsafeModifier", args([["valueContainsUnsafe", bool(false)], ["childIdentifier", bool(true)], ["childUnsafe", bool(true)]]), bool(true)],
  ["boundary-access-expression.fungi", "boundaryAccessExpressionCore", "galerina-devtools-provenance/src/analyzer.ts", "isBoundaryAccessExpr", args([["memberExpression", bool(true)], ["requestRoot", bool(false)], ["reqRoot", bool(false)], ["inputRoot", bool(true)], ["paramsRoot", bool(false)]]), bool(true)],
  ["source-file-decision.fungi", "sourceFileDecisionCore", "galerina-devtools-package-graph/src/scanner.ts", "isSourceFile", args([["declarationFile", bool(false)], ["extensionMatched", bool(true)]]), bool(true)],
  ["fungi-fixture-classification.fungi", "fungiFixtureClassificationCore", "galerina-devtools-fungi-scan/src/inline-fixtures.ts", "looksLikeFungi", args([["versionHeader", bool(false)], ["flowDeclaration", bool(true)], ["contractBlock", bool(false)]]), bool(true)],
  ["opaque-id-decision.fungi", "opaqueIdDecisionCore", "galerina-core-network/src/defensive-controls.ts", "isOpaqueId", args([["stringValue", bool(true)], ["longEnough", bool(true)], ["numericOnly", bool(false)], ["charsetMatched", bool(true)]]), bool(true)],
  ["flow-risk-tier.fungi", "flowRiskTierCore", "galerina-devtools-intelligence/src/search.ts", "deriveRiskTier", args([["isTainted", bool(false)], ["hasSecrets", bool(true)], ["sensitiveEffects", int(1)]]), string("medium")],
  ["hostname-classification.fungi", "hostnameClassificationCore", "galerina-core-network/src/egress-guard.ts", "classifyHostname", args([["loopback", bool(false)], ["metadata", bool(false)], ["linkLocal", bool(false)], ["internalName", bool(true)], ["bareName", bool(false)]]), string("private")],
  ["parsed-network-octet.fungi", "parsedNetworkOctetCore", "galerina-core-network/src/egress-guard.ts", "parseOctet", args([["hexMatched", bool(false)], ["octalMatched", bool(false)], ["decimalMatched", bool(true)], ["parsedInteger", bool(true)], ["value", int(127)]]), int(127)],
  ["logic-state-admission.fungi", "logicStateAdmissionCore", "galerina-core-logic/src/index.ts", "isValidLogicState", args([["widthEqual", bool(true)], ["safeInteger", bool(true)], ["state", int(2)], ["definitionWidth", int(3)]]), bool(true)],
  ["provenance-transform-classification.fungi", "provenanceTransformClassificationCore", "galerina-devtools-provenance/src/analyzer.ts", "classifyTransform", args([["validateOrSanitize", bool(false)], ["hashFamily", bool(true)], ["encryptFamily", bool(false)], ["redact", bool(false)]]), string("hash")],
  ["secret-source-expression.fungi", "secretSourceExpressionCore", "galerina-core-compiler/src/value-state-checker.ts", "isSecretSourceExpression", args([["errorPropagation", bool(false)], ["innerSecret", bool(false)], ["callExpression", bool(true)], ["secretNs", bool(false)], ["secretsNs", bool(false)], ["vaultNs", bool(true)], ["kmsNs", bool(false)]]), bool(true)],
  ["unsafe-network-backend.fungi", "unsafeNetworkBackendCore", "galerina-core-network/src/index.ts", "isUnsafeNetworkBackend", args([["elevated", bool(false)], ["dpdk", bool(false)], ["xdp", bool(true)]]), bool(true)],
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

describe("40-file source-bound Fungi decision-core overlay wave 3", () => {
  it("binds 40 distinct live source behaviours and package assets", () => {
    assert.equal(CANDIDATES.length, 40);
    const loadedAssets = JSON.parse(readFileSync(PACKAGE, "utf8")).packageGraph?.loadedAssets ?? [];
    for (const candidate of CANDIDATES) {
      assert.ok(loadedAssets.includes(`src/self-hosted/conversion-overlays/${candidate.file}`), `${candidate.file} must be a loaded asset`);
      const reference = readFileSync(join(ROOT, "packages-ts", candidate.source), "utf8");
      assert.ok(reference.includes(candidate.symbol), `${candidate.source} must contain ${candidate.symbol}`);
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
