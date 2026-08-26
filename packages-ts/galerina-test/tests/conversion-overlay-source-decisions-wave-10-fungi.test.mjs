import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { checkEffects, emitGIR, executeFlow, parseProgram } from "../../galerina-core-compiler/dist/index.js";

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
  ["health-result-coercion-status.fungi", "healthResultCoercionStatusCore", "galerina-observability/src/health.ts", "coerce", args([["booleanResult", bool(true)], ["booleanUp", bool(true)], ["structuredValid", bool(false)], ["detailPresent", bool(false)], ["detailTruncated", bool(false)]]), string("boolean_up")],
  ["health-timeout-selection.fungi", "healthTimeoutSelectionCore", "galerina-observability/src/health.ts", "constructor", args([["timeoutProvided", bool(true)], ["finite", bool(true)], ["positive", bool(true)]]), int(1)],
  ["liveness-registration-status.fungi", "livenessRegistrationStatusCore", "galerina-observability/src/health.ts", "registerLiveness", args([["namePresent", bool(true)], ["checkCallable", bool(true)]]), string("registered_liveness")],
  ["readiness-registration-status.fungi", "readinessRegistrationStatusCore", "galerina-observability/src/health.ts", "registerReadiness", args([["existing", bool(false)], ["checkCallable", bool(true)]]), int(1)],
  ["health-unregister-mask.fungi", "healthUnregisterMaskCore", "galerina-observability/src/health.ts", "unregister", args([["livenessPresent", bool(true)], ["readinessPresent", bool(true)]]), int(3)],
  ["liveness-summary.fungi", "livenessSummaryCore", "galerina-observability/src/health.ts", "liveness", args([["checkCount", int(0)], ["anyDown", bool(false)]]), string("up_default")],
  ["readiness-summary.fungi", "readinessSummaryCore", "galerina-observability/src/health.ts", "readiness", args([["checkCount", int(0)], ["everyUp", bool(false)]]), bool(true)],
  ["health-aggregate-status.fungi", "healthAggregateStatusCore", "galerina-observability/src/health.ts", "#evaluate", args([["componentCount", int(2)], ["anyDown", bool(false)], ["readinessKind", bool(true)]]), string("readiness_up")],
  ["health-check-outcome.fungi", "healthCheckOutcomeCore", "galerina-observability/src/health.ts", "#runOne", args([["timedOut", bool(false)], ["checkThrew", bool(false)], ["resultValid", bool(true)], ["resultUp", bool(true)]]), string("up")],
  ["audit-reservation-admission.fungi", "auditReservationAdmissionCore", "galerina-observability/src/kernel-integration.ts", "metricsAuditSink", args([["reservationPresent", bool(true)], ["alreadyConsumed", bool(false)]]), string("live")],
  ["audit-commit-status.fungi", "auditCommitStatusCore", "galerina-observability/src/kernel-integration.ts", "commit", args([["reservationLive", bool(true)], ["eventPresent", bool(true)]]), string("committed")],
  ["audit-cancel-status.fungi", "auditCancelStatusCore", "galerina-observability/src/kernel-integration.ts", "cancel", args([["reservationLive", bool(true)], ["previouslyCancelled", bool(false)]]), string("cancelled")],
  ["audit-emit-status.fungi", "auditEmitStatusCore", "galerina-observability/src/kernel-integration.ts", "emit", args([["eventPresent", bool(true)], ["recordSucceeded", bool(true)]]), string("emitted")],
  ["dispatch-instrumentation-status.fungi", "dispatchInstrumentationStatusCore", "galerina-observability/src/kernel-integration.ts", "instrumentDispatch", args([["handlerPresent", bool(true)], ["handlerSucceeded", bool(true)], ["recordingSucceeded", bool(true)]]), string("returned_recorded")],
  ["safe-clock-status.fungi", "safeClockStatusCore", "galerina-observability/src/kernel-integration.ts", "safeNow", args([["callbackSucceeded", bool(true)], ["finiteNumber", bool(true)]]), int(1)],
  ["request-recording-status.fungi", "requestRecordingStatusCore", "galerina-observability/src/kernel-integration.ts", "recordRequest", args([["clockFinite", bool(true)], ["durationNonnegative", bool(true)], ["metricsSucceeded", bool(true)], ["handlerErrored", bool(false)]]), string("success_recorded")],
  ["health-report-http-status.fungi", "healthReportHttpStatusCore", "galerina-observability/src/kernel-integration.ts", "reportToResult", args([["reportUp", bool(true)]]), int(200)],
  ["observability-route-flags.fungi", "observabilityRouteFlagsCore", "galerina-observability/src/kernel-integration.ts", "observabilityRoutes", args([["metricsPublic", bool(true)], ["includePrometheus", bool(true)]]), int(3)],
  ["health-failsafe-status.fungi", "healthFailsafeStatusCore", "galerina-observability/src/kernel-integration.ts", "failSafe", args([["handlerSucceeded", bool(true)], ["resultPresent", bool(true)]]), string("handler_result")],
  ["base-path-normalisation-status.fungi", "basePathNormalisationStatusCore", "galerina-observability/src/kernel-integration.ts", "normaliseBase", args([["emptyOrRoot", bool(false)], ["leadingSlash", bool(true)], ["trailingSlash", bool(true)]]), string("trim")],
  ["combined-health-http-status.fungi", "combinedHealthHttpStatusCore", "galerina-observability/src/kernel-integration.ts", "[healthName]", args([["reportsPresent", bool(true)], ["livenessUp", bool(true)], ["readinessUp", bool(true)]]), int(200)],
  ["metrics-route-status.fungi", "metricsRouteStatusCore", "galerina-observability/src/kernel-integration.ts", "[metricsName]", args([["snapshotReady", bool(true)], ["metricsPublic", bool(false)]]), string("required_auth_200")],
  ["observability-assembly-flags.fungi", "observabilityAssemblyFlagsCore", "galerina-observability/src/observability.ts", "createObservability", args([["healthConfigured", bool(false)], ["metricsConfigured", bool(false)], ["loggerConfigured", bool(false)], ["routesConfigured", bool(false)]]), string("defaults")],
  ["observability-instrument-status.fungi", "observabilityInstrumentStatusCore", "galerina-observability/src/observability.ts", "instrument", args([["dispatchPresent", bool(true)], ["optionsProvided", bool(false)]]), string("instrumented_default")],
  ["log-level-selection.fungi", "logLevelSelectionCore", "galerina-observability/src/logger.ts", "levelName", args([["order", int(30)]]), string("warn")],
  ["log-serialization-status.fungi", "logSerializationStatusCore", "galerina-observability/src/logger.ts", "safeStringify", args([["primarySerializable", bool(false)], ["fallbackSerializable", bool(true)], ["loggerPresent", bool(true)]]), string("fallback_with_logger")],
  ["logger-clock-status.fungi", "loggerClockStatusCore", "galerina-observability/src/logger.ts", "#safeNow", args([["clockReturned", bool(true)], ["finiteNumber", bool(true)]]), string("finite")],
  ["logger-redaction-action.fungi", "loggerRedactionActionCore", "galerina-observability/src/logger.ts", "#redactFields", args([["keySensitive", bool(true)], ["valuePresent", bool(true)]]), string("redacted")],
  ["logger-emission-status.fungi", "loggerEmissionStatusCore", "galerina-observability/src/logger.ts", "#emit", args([["levelEnabled", bool(true)], ["recordConstructed", bool(true)], ["sinkSucceeded", bool(true)]]), string("written")],
  ["memory-log-write-status.fungi", "memoryLogWriteStatusCore", "galerina-observability/src/logger.ts", "this.#records.push(record)", args([["recordPresent", bool(true)], ["capacityAvailable", bool(true)]]), string("appended")],
  ["memory-log-view-status.fungi", "memoryLogViewStatusCore", "galerina-observability/src/logger.ts", "records()", args([["recordCount", int(2)], ["aliasRetained", bool(true)]]), string("populated_live_alias")],
  ["logger-sink-failure-status.fungi", "loggerSinkFailureStatusCore", "galerina-observability/src/logger.ts", "sinkFailures", args([["failureCount", int(0)]]), string("healthy")],
  ["logger-construction-status.fungi", "loggerConstructionStatusCore", "galerina-observability/src/logger.ts", "createLogger", args([["optionsProvided", bool(true)], ["sinkProvided", bool(true)], ["clockProvided", bool(true)]]), string("custom_sink_clock")],
  ["metric-clamp-position.fungi", "metricClampPositionCore", "galerina-observability/src/metrics.ts", "clamp", args([["below", bool(false)], ["above", bool(true)]]), int(1)],
  ["route-normalisation-status.fungi", "routeNormalisationStatusCore", "galerina-observability/src/metrics.ts", "normaliseRoute", args([["routeString", bool(true)], ["nonempty", bool(true)], ["queryRemoved", bool(true)], ["withinBound", bool(true)]]), string("query_removed")],
  ["http-status-classification.fungi", "httpStatusClassificationCore", "galerina-observability/src/metrics.ts", "statusClassOf", args([["hundreds", int(2)]]), string("2xx")],
  ["histogram-observation-status.fungi", "histogramObservationStatusCore", "galerina-observability/src/metrics.ts", "observe", args([["numberValid", bool(true)], ["nonnegative", bool(true)], ["bucketMatched", bool(true)]]), string("bucketed")],
  ["percentile-selection-status.fungi", "percentileSelectionStatusCore", "galerina-observability/src/metrics.ts", "#percentile", args([["empty", bool(false)], ["targetInBucket", bool(true)], ["overflow", bool(false)]]), string("interpolated")],
  ["route-cardinality-status.fungi", "routeCardinalityStatusCore", "galerina-observability/src/metrics.ts", "#routeAccumulator", args([["existing", bool(false)], ["capReached", bool(true)], ["overflowExisting", bool(true)]]), string("overflow_reused")],
  ["prometheus-series-admission.fungi", "prometheusSeriesAdmissionCore", "galerina-observability/src/metrics.ts", "renderMetricsPrometheus", args([["routeSafe", bool(true)], ["methodSafe", bool(true)], ["countPositive", bool(true)], ["errorsPresent", bool(true)]]), string("request_and_error_series")],
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
        replacement = "ID" + identifiers.size;
        identifiers.set(identifier, replacement);
      }
      return replacement;
    }), "utf8").digest("hex");
}

describe("40-file source-bound Fungi decision-core overlay wave 10", () => {
  it("binds 40 distinct live source behaviours and package assets", () => {
    assert.equal(CANDIDATES.length, 40);
    const loadedAssets = JSON.parse(readFileSync(PACKAGE, "utf8")).packageGraph?.loadedAssets ?? [];
    const sourceScopes = new Set();
    for (const candidate of CANDIDATES) {
      assert.ok(loadedAssets.includes(`src/self-hosted/conversion-overlays/${candidate.file}`), `${candidate.file} must be a loaded asset`);
      const reference = readFileSync(join(ROOT, "packages-ts", candidate.source), "utf8");
      assert.ok(reference.includes(candidate.symbol), `${candidate.source} must contain ${candidate.symbol}`);
      assert.equal(sourceScopes.has(`${candidate.source}#${candidate.symbol}`), false, `${candidate.symbol} must be a distinct source scope`);
      sourceScopes.add(`${candidate.source}#${candidate.symbol}`);
    }
  });

  it("has no exact duplicate or normalized whole-corpus template shadow", () => {
    const seen = new Map();
    const candidateFiles = new Set(CANDIDATES.map((candidate) => candidate.file));
    for (const file of readdirSync(OVERLAY_ROOT).filter((file) => file.endsWith(".fungi") && !candidateFiles.has(file))) {
      const source = readFileSync(join(OVERLAY_ROOT, file), "utf8");
      seen.set(createHash("sha256").update(source, "utf8").digest("hex"), file);
      seen.set(shadowFingerprint(source), file);
    }
    const collisions = [];
    for (const candidate of CANDIDATES) {
      const path = join(OVERLAY_ROOT, candidate.file);
      assert.ok(existsSync(path), `${candidate.file} must exist`);
      const source = readFileSync(path, "utf8");
      for (const [kind, fingerprint] of [
        ["exact duplicate", createHash("sha256").update(source, "utf8").digest("hex")],
        ["template shadow", shadowFingerprint(source)],
      ]) {
        if (seen.has(fingerprint)) collisions.push(`${candidate.file} ${kind} of ${seen.get(fingerprint)}`);
        seen.set(fingerprint, candidate.file);
      }
    }
    assert.deepEqual(collisions, []);
  });

  it("parses, effect-checks, emits GIR and executes every decision core", async () => {
    for (const candidate of CANDIDATES) {
      const source = readFileSync(join(OVERLAY_ROOT, candidate.file), "utf8").replace(/^ï»¿/u, "");
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
