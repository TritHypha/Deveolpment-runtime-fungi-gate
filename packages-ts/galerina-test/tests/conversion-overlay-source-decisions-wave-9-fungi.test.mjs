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
  ["cert-gate-boundary-status.fungi", "certGateBoundaryStatusCore", "galerina-core-network/src/cert-gate.ts", "certGate", args([["pinAllowed", bool(true)], ["chainAllowed", bool(true)], ["expiryAllowed", bool(true)], ["revocationAllowed", bool(true)], ["sideSignalsAllowed", bool(true)]]), string("authorized")],
  ["cert-telemetry-boundary-status.fungi", "certTelemetryBoundaryStatusCore", "galerina-core-network/src/admission-feedback.ts", "certGateWithTelemetry", args([["certAllowed", bool(true)], ["healthUp", bool(true)], ["anomalyState", int(0)], ["diagnosticReady", bool(true)]]), string("authorized")],
  ["cert-verdict-fold.fungi", "certVerdictFoldCore", "galerina-core-network/src/cert-gate.ts", "certVerdict", args([["anyDenied", bool(false)], ["anyIndeterminate", bool(false)]]), int(1)],
  ["chain-validation-verdict.fungi", "chainValidationVerdictCore", "galerina-core-network/src/cert-gate.ts", "chainValidVerdict", args([["outcomeState", int(1)]]), int(1)],
  ["host-kind-routing.fungi", "hostKindRoutingCore", "galerina-core-network/src/egress-guard.ts", "classifyHost", args([["nonempty", bool(true)], ["ipv6Candidate", bool(false)], ["ipv4Candidate", bool(true)], ["hostnameAccepted", bool(false)]]), string("ipv4")],
  ["ipv4-category-classification.fungi", "ipv4CategoryClassificationCore", "galerina-core-network/src/egress-guard.ts", "classifyIpv4", args([["metadata", bool(false)], ["linkLocal", bool(false)], ["loopback", bool(false)], ["privateRange", bool(false)], ["unspecified", bool(false)], ["reserved", bool(false)]]), string("public")],
  ["ipv6-category-classification.fungi", "ipv6CategoryClassificationCore", "galerina-core-network/src/egress-guard.ts", "classifyIpv6", args([["valid", bool(true)], ["unspecified", bool(false)], ["loopback", bool(false)], ["metadata", bool(false)], ["embeddedNonpublic", bool(false)], ["specialPrefix", bool(false)]]), string("public")],
  ["host-classification-flags.fungi", "hostClassificationFlagsCore", "galerina-core-network/src/egress-guard.ts", "cls", args([["categoryPublic", bool(true)], ["dnsRecheckRequired", bool(true)]]), int(3)],
  ["network-diagnostic-status.fungi", "networkDiagnosticStatusCore", "galerina-core-network/src/index.ts", "createNetworkDiagnostic", args([["errorSeverity", bool(true)], ["pathPresent", bool(true)]]), int(3)],
  ["network-report-summary.fungi", "networkReportSummaryCore", "galerina-core-network/src/index.ts", "createNetworkReport", args([["errorCount", int(0)], ["warningCount", int(1)], ["plaintextAllowed", bool(false)], ["rawSocketsAllowed", bool(false)]]), string("warning")],
  ["network-policy-default-flags.fungi", "networkPolicyDefaultFlagsCore", "galerina-core-network/src/index.ts", "defineNetworkPolicy", args([["effectProvided", bool(false)], ["tlsProvided", bool(false)], ["endpointsProvided", bool(false)], ["privacyProvided", bool(false)], ["egressProvided", bool(false)]]), int(1)],
  ["embedded-ipv4-category.fungi", "embeddedIpv4CategoryCore", "galerina-core-network/src/egress-guard.ts", "embedded", args([["ipv4Valid", bool(true)], ["ipv4Public", bool(true)]]), string("public_ipv4_in_ipv6")],
  ["ipv6-group-admission.fungi", "ipv6GroupAdmissionCore", "galerina-core-network/src/egress-guard.ts", "groups", args([["partEmpty", bool(false)], ["everyHex", bool(true)], ["groupCount", int(3)]]), string("accepted")],
  ["cors-request-admission.fungi", "corsRequestAdmissionCore", "galerina-core-network/src/cors-policy.ts", "guardCorsRequest", args([["sameOrigin", bool(false)], ["nullOrigin", bool(false)], ["wildcardCredentialsDenied", bool(false)], ["originAllowed", bool(true)], ["preflight", bool(false)], ["methodAllowed", bool(true)], ["headersAllowed", bool(true)]]), string("allowed")],
  ["inbound-request-admission.fungi", "inboundRequestAdmissionCore", "galerina-core-network/src/inbound-guard.ts", "guardInboundRequest", args([["portValid", bool(true)], ["explicitDeny", bool(false)], ["explicitAllow", bool(true)], ["defaultAllow", bool(false)]]), string("explicit_allow")],
  ["outbound-host-admission.fungi", "outboundHostAdmissionCore", "galerina-core-network/src/egress-guard.ts", "guardOutboundHost", args([["allowlisted", bool(false)], ["metadata", bool(false)], ["metadataAllowed", bool(false)], ["loopback", bool(false)], ["loopbackAllowed", bool(false)], ["nonpublic", bool(false)], ["nonpublicAllowed", bool(false)]]), string("public_allowed")],
  ["outbound-url-admission.fungi", "outboundUrlAdmissionCore", "galerina-core-network/src/egress-guard.ts", "guardOutboundUrl", args([["prefixAdmitted", bool(true)], ["trustedEndpoint", bool(false)], ["tlsSatisfied", bool(true)], ["portAllowed", bool(true)]]), string("allowed")],
  ["resolved-address-admission.fungi", "resolvedAddressAdmissionCore", "galerina-core-network/src/egress-guard.ts", "guardResolvedAddresses", args([["resolutionPresent", bool(true)], ["hostAllowlisted", bool(false)], ["everyAddressAllowed", bool(true)]]), string("all_public")],
  ["poll-interval-admission.fungi", "pollIntervalAdmissionCore", "galerina-core-network/src/cert-gate.ts", "isValidPollIntervalMs", args([["finite", bool(true)], ["positive", bool(true)]]), bool(true)],
  ["inbound-rule-match.fungi", "inboundRuleMatchCore", "galerina-core-network/src/inbound-guard.ts", "matches", args([["portMatched", bool(true)], ["protocolMatched", bool(true)]]), bool(true)],
  ["certificate-expiry-verdict.fungi", "certificateExpiryVerdictCore", "galerina-core-network/src/cert-gate.ts", "notExpiredVerdict", args([["boundsPresent", bool(true)], ["valuesFinite", bool(true)], ["insideWindow", bool(true)]]), int(1)],
  ["rate-limit-parse-status.fungi", "rateLimitParseStatusCore", "galerina-core-network/src/inbound-guard.ts", "parseRateLimit", args([["syntaxMatched", bool(true)], ["countValid", bool(true)], ["unitKnown", bool(true)], ["unitCountValid", bool(true)], ["withinOperationalBound", bool(true)]]), string("accepted")],
  ["pin-match-verdict.fungi", "pinMatchVerdictCore", "galerina-core-network/src/cert-gate.ts", "pinMatchVerdict", args([["pinsConfigured", bool(true)], ["digestPresented", bool(true)], ["digestMatched", bool(true)]]), int(1)],
  ["inbound-port-match.fungi", "inboundPortMatchCore", "galerina-core-network/src/inbound-guard.ts", "portMatches", args([["portsRestricted", bool(true)], ["requestedPortIncluded", bool(true)]]), bool(true)],
  ["inbound-protocol-match.fungi", "inboundProtocolMatchCore", "galerina-core-network/src/inbound-guard.ts", "protoMatches", args([["protocolRequested", bool(true)], ["protocolEqual", bool(true)]]), bool(true)],
  ["rate-limit-key-dimension.fungi", "rateLimitKeyDimensionCore", "galerina-core-network/src/inbound-guard.ts", "rateLimitKey", args([["scopeState", int(2)], ["valuePresent", bool(true)]]), string("service")],
  ["revocation-recheck-due.fungi", "revocationRecheckDueCore", "galerina-core-network/src/cert-gate.ts", "revocationRecheckDue", args([["atBoundary", bool(false)], ["pollMode", bool(true)], ["intervalValid", bool(true)], ["elapsedFinite", bool(true)], ["intervalElapsed", bool(true)]]), bool(true)],
  ["revocation-freshness-verdict.fungi", "revocationFreshnessVerdictCore", "galerina-core-network/src/cert-gate.ts", "revocationVerdict", args([["checkFailed", bool(false)], ["revoked", bool(false)], ["good", bool(true)], ["freshnessPresent", bool(true)], ["valuesFinite", bool(true)], ["ageWithinWindow", bool(true)]]), int(1)],
  ["network-backend-selection-status.fungi", "networkBackendSelectionStatusCore", "galerina-core-network/src/index.ts", "selectNetworkBackend", args([["preferredAvailable", bool(true)], ["preferredSafe", bool(true)], ["fallbackAvailable", bool(false)], ["fallbackSafe", bool(false)], ["requireSafeFallback", bool(true)]]), string("preferred")],
  ["cert-subverdict-summary.fungi", "certSubverdictSummaryCore", "galerina-core-network/src/cert-gate.ts", "toSubVerdicts", args([["pinVerdict", int(1)], ["chainVerdict", int(1)], ["expiryVerdict", int(1)], ["revocationVerdict", int(1)]]), string("all_allow")],
  ["uniform-auth-response-status.fungi", "uniformAuthResponseStatusCore", "galerina-core-network/src/defensive-controls.ts", "uniformAuthResponse", args([["authenticated", bool(true)]]), int(200)],
  ["uniform-resource-response-status.fungi", "uniformResourceResponseStatusCore", "galerina-core-network/src/defensive-controls.ts", "uniformResourceResponse", args([["authorized", bool(false)], ["denialStatus", int(404)]]), int(404)],
  ["unique-string-summary.fungi", "uniqueStringSummaryCore", "galerina-core-network/src/index.ts", "uniqueStrings", args([["valueCount", int(3)], ["uniqueCount", int(3)], ["orderCanonical", bool(true)]]), string("unique_sorted")],
  ["egress-policy-diagnostic-status.fungi", "egressPolicyDiagnosticStatusCore", "galerina-core-network/src/index.ts", "validateEgressPolicy", args([["metadataAllowed", bool(false)], ["urlCredentialsAllowed", bool(false)], ["nonpublicAllowed", bool(false)], ["production", bool(true)], ["plaintextScheme", bool(false)]]), string("accepted")],
  ["endpoint-rule-admission.fungi", "endpointRuleAdmissionCore", "galerina-core-network/src/index.ts", "validateEndpointRule", args([["plaintextHttpAllowed", bool(false)], ["rawSocketAllowed", bool(false)], ["rawSocketsDenied", bool(true)], ["portsValid", bool(true)], ["hostsValid", bool(true)]]), string("accepted")],
  ["network-policy-admission.fungi", "networkPolicyAdmissionCore", "galerina-core-network/src/index.ts", "validateNetworkPolicy", args([["securityChecksValid", bool(true)], ["timeoutsRequired", bool(true)], ["backpressureRequired", bool(true)]]), string("accepted")],
  ["tls-policy-admission.fungi", "tlsPolicyAdmissionCore", "galerina-core-network/src/index.ts", "validateTlsPolicy", args([["requireTls", bool(true)], ["plaintextFallback", bool(false)], ["downgradeAllowed", bool(false)], ["production", bool(true)], ["certificatesVerified", bool(true)], ["hostnamesVerified", bool(true)]]), string("accepted")],
  ["webhook-target-admission.fungi", "webhookTargetAdmissionCore", "galerina-core-network/src/egress-guard.ts", "validateWebhookTarget", args([["urlAllowed", bool(true)], ["exactHostAllowlisted", bool(false)]]), bool(true)],
  ["side-signal-verdict-fold.fungi", "sideSignalVerdictFoldCore", "galerina-core-network/src/cert-gate.ts", "withSideSignal", args([["baseVerdict", int(1)], ["sideSignal", int(0)]]), int(0)],
  ["telemetry-feedback-verdict-fold.fungi", "telemetryFeedbackVerdictFoldCore", "galerina-core-network/src/admission-feedback.ts", "withTelemetryFeedback", args([["baseVerdict", int(1)], ["telemetryVerdict", int(0)], ["telemetryPresent", bool(true)]]), int(0)],
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

describe("40-file source-bound Fungi decision-core overlay wave 9", () => {
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
