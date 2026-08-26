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
const verdict = (value) => ({ __tag: "verdict", value });
const args = (entries) => new Map(entries);
const SHADOW_RESERVED_IDENTIFIERS = new Set([
  "version", "pure", "secure", "flow", "FLOW", "contract", "intent", "record",
  "return", "if", "match", "check", "deny", "ambig", "mut", "let",
  "Bool", "Int", "String", "Verdict", "Result", "Option", "Array",
  "true", "false", "Ok", "Err", "Some", "None", "Allow", "Deny", "Unknown",
]);

const CANDIDATES = Object.freeze([
  ["stage-b-parity-status.fungi", "stageBParityStatus", "galerina-core-compiler/src/stage-b-report.ts", "parityStatusFromErrors", args([["errors", int(0)]]), string("complete")],
  ["stage-b-overall-status.fungi", "stageBOverallStatus", "galerina-core-compiler/src/stage-b-report.ts", "overallStatusFromMilestones", args([["total", int(4)], ["complete", int(3)], ["nonPending", int(4)]]), string("partial")],
  ["request-size-limit.fungi", "requestSizeWithinLimit", "galerina-core-compiler/src/runtime/limitPolicy.ts", "checkRequestSize", args([["configured", bool(true)], ["actual", int(1025)], ["maximum", int(1024)]]), bool(false)],
  ["batch-size-limit.fungi", "batchSizeWithinLimit", "galerina-core-compiler/src/runtime/limitPolicy.ts", "checkBatchSize", args([["configured", bool(true)], ["count", int(16)], ["maximum", int(16)]]), bool(true)],
  ["byte-unit-multiplier.fungi", "byteUnitMultiplier", "galerina-core-compiler/src/runtime/limitPolicy.ts", "toBytes", args([["unit", string("mb")]]), int(1_048_576)],
  ["rate-period-milliseconds.fungi", "ratePeriodMilliseconds", "galerina-core-compiler/src/runtime/limitPolicy.ts", "toPeriodMs", args([["unit", string("day")]]), int(86_400_000)],
  ["rate-scope-normalization.fungi", "normaliseRateScope", "galerina-core-compiler/src/runtime/limitPolicy.ts", "normaliseRateScope", args([["raw", string("global")]]), string("global")],
  ["fault-action-coercion.fungi", "coerceFaultAction", "galerina-core-compiler/src/resilience-inference.ts", "coerceFaultAction", args([["signal", string("on_rotation_fault")], ["raw", string("log")]]), string("log")],
  ["environment-mode-resolution.fungi", "resolveEnvironmentModeCore", "galerina-core-config/src/index.ts", "resolveEnvironmentMode", args([["present", bool(false)], ["valid", bool(false)], ["requested", string("production")], ["fallbackMode", string("development")]]), string("development")],
  ["security-posture-resolution.fungi", "resolveSecurityPostureCore", "galerina-core-config/src/posture.ts", "resolvePosture", args([["requested", string("auto")], ["relax", bool(false)]]), string("on")],
  ["economic-route-branch.fungi", "selectEconomicRouteBranch", "galerina-core-economics/src/index.ts", "selectRoute", args([["overBudget", bool(false)], ["riskAtThreshold", bool(true)]]), string("proof-escalation")],
  ["proxy-trust-decision.fungi", "proxyTrustDecision", "galerina-core-network/src/defensive-controls.ts", "proxyIsTrusted", args([["method", string("mtls")], ["certificateVerified", bool(true)], ["subjectPinned", bool(false)], ["tokenVerified", bool(true)]]), bool(false)],
  ["pagination-bound-decision.fungi", "boundPageLimitCore", "galerina-core-network/src/defensive-controls.ts", "boundPageLimit", args([["present", bool(true)], ["valid", bool(true)], ["requested", int(500)], ["defaultLimit", int(25)], ["maximum", int(100)]]), int(100)],
  ["report-status-selection.fungi", "selectReportStatusCore", "galerina-core-reports/src/index.ts", "selectReportStatus", args([["warnings", int(4)], ["errors", int(1)], ["critical", int(0)]]), string("error")],
  ["task-run-status-summary.fungi", "summarizeTaskRunStatusCore", "galerina-core-tasks/src/task-report.ts", "summarizeTaskRunStatus", args([["failed", int(0)], ["running", int(0)], ["pending", int(2)], ["total", int(5)]]), string("pending")],
  ["data-report-status.fungi", "deriveDataReportStatusCore", "galerina-data-reports/src/index.ts", "deriveDataReportStatus", args([["hasError", bool(false)], ["hasWarning", bool(true)]]), string("partial")],
  ["lowbit-cpu-admission.fungi", "canUseLowBitCpuPathCore", "galerina-target-cpu/src/index.ts", "canUseLowBitCpuPath", args([["supportsLowBit", bool(true)], ["architecture", string("arm64")], ["hasAvx2", bool(false)], ["hasNeon", bool(true)]]), bool(true)],
  ["trit-encoding.fungi", "encodeTritCore", "galerina-tower-citizen/src/tpl-simulator.ts", "encodeTrit", args([["value", int(-1)]]), int(0)],
  ["trit-decoding.fungi", "decodeTritCore", "galerina-tower-citizen/src/tpl-simulator.ts", "decodeTrit", args([["encoded", int(2)]]), int(1)],
  ["provenance-kind-label.fungi", "provenanceKindLabel", "galerina-devtools-provenance/src/reporter.ts", "kindLabel", args([["kind", string("transform")]]), string("TRANSFORM")],
  ["provenance-trust-label.fungi", "provenanceTrustLabel", "galerina-devtools-provenance/src/reporter.ts", "trustLabel", args([["kind", string("sink")], ["trusted", bool(false)]]), string("ungated-high-risk")],
  ["package-specifier-classification.fungi", "classifyPackageSpecifierCore", "galerina-devtools-package-graph/src/scanner.ts", "classify", args([["relative", bool(false)], ["nodeCore", bool(false)], ["workspace", bool(true)]]), string("workspace")],
  ["real-specifier-admission.fungi", "isRealSpecifierCore", "galerina-devtools-package-graph/src/scanner.ts", "isRealSpecifier", args([["hasInterpolation", bool(false)], ["isEmitterLiteral", bool(true)]]), bool(false)],
  ["registry-manifest-order.fungi", "compareRegistryManifestCore", "galerina-framework-app-kernel/src/registry-generation.ts", "compareManifest", args([["nameOrder", int(0)], ["versionOrder", int(-1)]]), int(-1)],
  ["admission-telemetry-verdict.fungi", "telemetrySideSignalCore", "galerina-core-network/src/admission-feedback.ts", "telemetryToSideSignal", args([["healthUp", bool(true)], ["anomalyState", int(2)], ["denyEnabled", bool(true)]]), verdict(-1)],
  ["optical-signal-validation-mask.fungi", "opticalSignalValidationMask", "galerina-core-photonic/src/index.ts", "validateOpticalSignal", args([["wavelengthFault", int(1)], ["phaseFault", int(0)], ["amplitudeFault", int(1)]]), int(5)],
  ["photonic-mapping-validation-mask.fungi", "photonicMappingValidationMask", "galerina-core-photonic/src/index.ts", "validatePhotonicMapping", args([["nameFault", int(0)], ["statesFault", int(0)], ["stateNameFault", int(1)], ["duplicateFault", int(1)]]), int(12)],
  ["photonic-plan-validation-mask.fungi", "photonicPlanValidationMask", "galerina-core-photonic/src/index.ts", "validatePhotonicPlan", args([["namePresent", bool(false)], ["channelsValid", bool(true)], ["mappingsValid", bool(false)]]), int(5)],
  ["checkpoint-policy-validation-mask.fungi", "checkpointPolicyValidationMask", "galerina-data-pipeline/src/index.ts", "validateCheckpointPolicy", args([["intervalValid", bool(false)], ["storePresent", bool(false)]]), int(3)],
  ["retry-policy-validation-mask.fungi", "retryPolicyValidationMask", "galerina-data-pipeline/src/index.ts", "validateRetryPolicy", args([["attemptFault", int(0)], ["backoffFault", int(0)], ["maximumFault", int(1)]]), int(4)],
  ["response-flow-admission.fungi", "responseFlowAdmissionCore", "galerina-data-response/src/index.ts", "validateResponseFlow", args([["endpointPresent", bool(true)], ["mappingPresent", bool(false)], ["mappingValid", bool(true)]]), verdict(-1)],
  ["mysql-credential-validation-mask.fungi", "mysqlCredentialValidationMask", "galerina-db-mysql/src/index.ts", "validateMysqlCredentialRef", args([["kindFault", int(1)], ["referenceFault", int(0)], ["inlineCredentialFault", int(1)]]), int(5)],
  ["slide-vade-observation-verdict.fungi", "classifySlideVadeObservationCore", "galerina-devtools-benchmarks/src/audit-slide-vade.mjs", "classifySlideVadeObservation", args([["shapeValid", bool(true)], ["identityValid", bool(true)], ["digestValid", bool(false)], ["authorityReleased", bool(false)]]), verdict(-1)],
  ["benchmark-memory-admission.fungi", "benchmarkMemoryAdmission", "galerina-devtools-benchmarks/src/benchmark-interpretation.mjs", "bytesPerOperation", args([["resultUsable", bool(true)], ["directFinite", bool(false)], ["derivedInputsFinite", bool(true)], ["operationsPositive", bool(true)]]), int(2)],
  ["ordinal-suffix.fungi", "ordinalSuffix", "galerina-devtools-benchmarks/src/benchmark-interpretation.mjs", "ordinal", args([["place", int(22)]]), string("nd")],
  ["optical-channel-validation-mask.fungi", "opticalChannelValidationMask", "galerina-target-photonic/src/index.ts", "validateOpticalChannelLayout", args([["idFault", int(0)], ["wavelengthFault", int(1)], ["phaseFault", int(1)], ["amplitudeFault", int(0)]]), int(6)],
  ["photonic-lowering-validation-mask.fungi", "photonicLoweringValidationMask", "galerina-target-photonic/src/index.ts", "validatePhotonicLoweringPlan", args([["statusFault", int(0)], ["explanationFault", int(1)], ["consistencyFault", int(1)], ["emptyPlanFault", int(0)]]), int(6)],
  ["tri-state-xnor.fungi", "triStateXnorCore", "galerina-core-logic/src/tri/tri-ops.ts", "triStateXnor", args([["left", verdict(0)], ["right", verdict(1)]]), verdict(0)],
  ["tri-state-implies.fungi", "triStateImpliesCore", "galerina-core-logic/src/tri/tri-ops.ts", "triStateImplies", args([["antecedent", verdict(1)], ["consequent", verdict(-1)]]), verdict(-1)],
  ["wasm-export-admission.fungi", "moduleDefinesFunctionExportCore", "galerina-core-runtime-wasm/src/seam-adapters.ts", "moduleDefinesExport", args([["moduleValid", bool(true)], ["nameMatched", bool(true)], ["functionKind", bool(false)]]), bool(false)],
].map(([file, flow, source, symbol, input, expected]) =>
  Object.freeze({ file, flow, source, symbol, input, expected })));

function shadowFingerprint(source) {
  const identifiers = new Map();
  const executable = source
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
    });
  return createHash("sha256").update(executable, "utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay", () => {
  it("binds 40 distinct source behaviours and package assets", () => {
    assert.equal(CANDIDATES.length, 40);
    const loadedAssets = JSON.parse(readFileSync(PACKAGE, "utf8")).packageGraph?.loadedAssets ?? [];
    for (const candidate of CANDIDATES) {
      assert.ok(
        loadedAssets.includes(`src/self-hosted/conversion-overlays/${candidate.file}`),
        `${candidate.file} must be a loaded asset`,
      );
      const reference = readFileSync(join(ROOT, "packages-ts", candidate.source), "utf8");
      assert.ok(reference.includes(candidate.symbol), `${candidate.source} must contain ${candidate.symbol}`);
    }
  });

  it("has no exact duplicate or normalized template shadow", () => {
    const existing = new Map();
    for (const candidate of CANDIDATES) {
      const path = join(OVERLAY_ROOT, candidate.file);
      assert.ok(existsSync(path), `${candidate.file} must exist`);
      const source = readFileSync(path, "utf8");
      const exact = createHash("sha256").update(source, "utf8").digest("hex");
      assert.equal(existing.has(exact), false, `${candidate.file} exact duplicate of ${existing.get(exact)}`);
      existing.set(exact, candidate.file);
      const shadow = shadowFingerprint(source);
      assert.equal(existing.has(shadow), false, `${candidate.file} template shadow of ${existing.get(shadow)}`);
      existing.set(shadow, candidate.file);
    }
  });

  it("parses, effect-checks, emits GIR and executes every decision core", async () => {
    for (const candidate of CANDIDATES) {
      const source = readFileSync(join(OVERLAY_ROOT, candidate.file), "utf8").replace(/^\uFEFF/u, "");
      const program = parseProgram(source, candidate.file);
      assert.deepEqual(
        (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
        [],
        candidate.file,
      );
      const effects = checkEffects(program.flows, program.ast);
      assert.deepEqual(
        effects.flatMap((result) => result.diagnostics).filter((diagnostic) => diagnostic.severity === "error"),
        [],
        candidate.file,
      );
      const { gir } = emitGIR(program.ast, program.flows, effects);
      assert.equal(gir.flows.length, 1, candidate.file);
      const execution = await executeFlow(candidate.flow, candidate.input, program.ast, program.flows);
      assert.deepEqual(execution.value, candidate.expected, candidate.file);
    }
  });
});
