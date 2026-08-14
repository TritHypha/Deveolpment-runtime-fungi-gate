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
  ["capability-bitmask-core.fungi", "capabilityBitmaskCore", "galerina-core-compiler/src/capability-types.ts", "capabilityToBitmask", args([["runtimeFamily", bool(true)], ["effect", string("ai.inference")]]), int(32)],
  ["composite-capability-bitmask.fungi", "compositeCapabilityBitmaskCore", "galerina-core-compiler/src/capability-types.ts", "resolveCompositeBitmask", args([["effect", string("ledger.mutate")], ["atomicMask", int(0)]]), int(10)],
  ["capability-alias-normalization.fungi", "normalizeCapabilityCore", "galerina-core-compiler/src/capability-types.ts", "normalizeCapability", args([["name", string("db.read")]]), string("database.read")],
  ["capability-admission.fungi", "admissibleCapabilityCore", "galerina-core-compiler/src/capability-types.ts", "isAdmissibleCapability", args([["canonicalKnown", bool(false)], ["extraKnown", bool(true)], ["wildcard", bool(false)]]), bool(true)],
  ["governance-floor-normalization.fungi", "normaliseFloorCore", "galerina-core-compiler/src/capability-types.ts", "normaliseFloor", args([["name", string("proof_zone")]]), string("floor_3")],
  ["decimal-round-mode.fungi", "isDecimalRoundModeCore", "galerina-core-compiler/src/decimal-arith.ts", "isRoundMode", args([["mode", string("halfEven")]]), bool(true)],
  ["plugin-type-compatibility.fungi", "pluginTypeCompatibleCore", "galerina-core-compiler/src/plugin-schema.ts", "isCompatibleType", args([["actual", string("Int")], ["expected", string("Float")]]), bool(true)],
  ["recognized-limit-declaration.fungi", "recognizedLimitDeclarationCore", "galerina-core-compiler/src/runtime/limitPolicy.ts", "isRecognizedLimitDecl", args([["normalized", bool(true)], ["regexClassified", bool(true)], ["family", string("request_size")]]), bool(true)],
  ["retry-strategy.fungi", "validRetryStrategyCore", "galerina-core-compiler/src/runtime/retryPolicy.ts", "isValidStrategy", args([["strategy", string("exponential_backoff")]]), bool(true)],
  ["canonical-limit-token.fungi", "canonicalLimitTokenCore", "galerina-core-compiler/src/governance-verifier.ts", "canonicalLimitName", args([["base", string("request")], ["unit", string("size")], ["hasUnit", bool(true)]]), string("request_size")],
  ["wat-record-field-admission.fungi", "watRecordFieldSupportedCore", "galerina-core-compiler/src/wat-emitter.ts", "isWATRecordFieldTypeSupported", args([["base", string("Int64")], ["lowered", string("i64")]]), bool(true)],
  ["wat-64bit-type.fungi", "wat64BitTypeCore", "galerina-core-compiler/src/wat-emitter.ts", "is64BitWatType", args([["baseAdmitted", bool(true)], ["base", string("UInt64")]]), bool(true)],
  ["wasm-flow-exportability.fungi", "wasmFlowExportableCore", "galerina-core-compiler/src/wat-emitter.ts", "isWasmExportable", args([["qualifier", string("guarded")], ["effectCount", int(0)]]), bool(true)],
  ["environment-mode-membership.fungi", "environmentModeMemberCore", "galerina-core-config/src/index.ts", "isEnvironmentMode", args([["mode", string("production")]]), bool(true)],
  ["governance-mode-membership.fungi", "governanceModeMemberCore", "galerina-core-config/src/governance.ts", "isGovernanceMode", args([["modeAdmitted", bool(true)], ["mode", string("lean")]]), bool(true)],
  ["package-graph-alias.fungi", "packageGraphAliasCore", "galerina-core-config/src/index.ts", "isLoPackageGraphAlias", args([["normalizedString", bool(true)], ["alias", string("Galerina.lock")]]), bool(true)],
  ["secret-config-source-kind.fungi", "secretConfigSourceKindCore", "galerina-core-config/src/index.ts", "isSecretConfigSourceKind", args([["kind", string("env")]]), bool(true)],
  ["security-posture-membership.fungi", "securityPostureMemberCore", "galerina-core-config/src/posture.ts", "isSecurityPosture", args([["posture", string("auto")]]), bool(true)],
  ["decision-state-classification.fungi", "classifyDecisionStateCore", "galerina-core-logic/src/decision/decision-state.ts", "isAllow", args([["kind", string("review")]]), int(0)],
  ["tensor-shape-compatibility.fungi", "tensorShapeCompatibleCore", "galerina-ai-neural/src/index.ts", "isSameTensorShape", args([["elementTypeEqual", bool(true)], ["rankEqual", bool(true)], ["dimensionsEqual", bool(false)]]), bool(false)],
  ["response-safe-classification.fungi", "responseSafeClassificationCore", "galerina-data-model/src/index.ts", "isResponseSafeClassification", args([["classification", string("public")]]), bool(true)],
  ["localhost-host-membership.fungi", "localhostHostCore", "galerina-db-mysql/src/index.ts", "isLocalhostHost", args([["host", string("127.0.0.1")]]), bool(true)],
  ["governance-delta-classification.fungi", "classifyGovernanceDeltaCore", "galerina-core-compiler/src/governance-diff.ts", "classifyDelta", args([["isAdded", bool(false)], ["afterGuarded", bool(false)], ["authorityGrowth", bool(false)], ["authorityReduction", bool(true)]]), string("tightening")],
  ["boundary-crossing-admission.fungi", "boundaryCrossingAllowedCore", "galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts", "isCrossingAllowed", args([["secureCaller", bool(true)], ["externalCaller", bool(false)], ["calleeRank", int(1)]]), bool(false)],
  ["implicit-return-type.fungi", "implicitReturnTypeCore", "galerina-devtools-naming/src/naming-checker.ts", "isImplicitReturnType", args([["typeName", string("Void")]]), bool(true)],
  ["generic-type-name.fungi", "genericTypeNameCore", "galerina-devtools-naming/src/naming-checker.ts", "isGenericTypeName", args([["typeName", string("unknown")]]), bool(true)],
  ["payment-flow-classification.fungi", "paymentFlowCore", "galerina-devtools-pci/src/pci-checker.ts", "isPaymentFlow", args([["nameMatched", bool(false)], ["paymentTypePresent", bool(true)]]), bool(true)],
  ["gate-call-classification.fungi", "gateCallCore", "galerina-devtools-provenance/src/analyzer.ts", "isGateCall", args([["exactGate", bool(false)], ["gatePrefix", bool(true)]]), bool(true)],
  ["nonempty-string-admission.fungi", "nonEmptyStringCore", "galerina-framework-app-kernel/src/production-boot-composition-candidate.ts", "isNonEmptyString", args([["isString", bool(true)], ["length", int(0)]]), bool(false)],
  ["durability-platform.fungi", "durabilityPlatformCore", "galerina-framework-app-kernel/src/registry-durability-admission.ts", "isPlatform", args([["platform", string("linux")]]), bool(true)],
  ["durability-architecture.fungi", "durabilityArchitectureCore", "galerina-framework-app-kernel/src/registry-durability-admission.ts", "isArchitecture", args([["architecture", string("aarch64")]]), bool(true)],
  ["durability-evidence-class.fungi", "durabilityEvidenceClassCore", "galerina-framework-app-kernel/src/registry-durability-evidence.ts", "isEvidenceClass", args([["valueIsString", bool(true)], ["recognized", bool(false)]]), bool(false)],
  ["literal-verification-success.fungi", "literalVerificationSuccessCore", "galerina-framework-app-kernel/src/registry-index.ts", "isLiteralVerificationSuccess", args([["result", bool(true)]]), bool(true)],
  ["external-href-classification.fungi", "externalHrefCore", "galerina-tools-myco/src/query/links.ts", "isExternalHref", args([["scheme", bool(false)], ["fileScheme", bool(false)], ["drivePath", bool(true)], ["rootPath", bool(false)]]), bool(true)],
  ["private-path-classification.fungi", "privatePathCore", "galerina-tools-myco/src/query/links.ts", "isPrivatePath", args([["privateFilename", bool(false)], ["privateDirectory", bool(true)]]), bool(true)],
  ["search-error-presence.fungi", "searchErrorPresenceCore", "galerina-tools-myco/src/query/search.ts", "isError", args([["errorPresent", bool(true)]]), bool(true)],
  ["epistemic-state-classification.fungi", "classifyEpistemicStateCore", "galerina-tower-citizen/src/epistemic-type-state.ts", "isTrusted", args([["state", string("UNKNOWN")]]), int(0)],
  ["server-only-import.fungi", "serverOnlyImportCore", "galerina-target-js/src/index.ts", "isServerOnlyImport", args([["nodePrefix", bool(false)], ["knownServerOnly", bool(true)]]), bool(true)],
  ["benchmark-shareability.fungi", "benchmarkShareableCore", "galerina-tools-benchmark/src/index.ts", "isBenchmarkReportShareable", args([["allowSubmit", bool(true)], ["containsPersonalData", bool(false)], ["machineExcluded", bool(true)], ["hostExcluded", bool(true)], ["userExcluded", bool(true)], ["pathExcluded", bool(true)]]), bool(true)],
  ["positive-safe-integer.fungi", "positiveSafeIntegerCore", "galerina-core-vector/src/index.ts", "isPositiveSafeInteger", args([["safeInteger", bool(true)], ["value", int(3)]]), bool(true)],
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

describe("40-file source-bound Fungi decision-core overlay wave 2", () => {
  it("binds 40 distinct live source behaviours and package assets", () => {
    assert.equal(CANDIDATES.length, 40);
    const loadedAssets = JSON.parse(readFileSync(PACKAGE, "utf8")).packageGraph?.loadedAssets ?? [];
    for (const candidate of CANDIDATES) {
      assert.ok(
        loadedAssets.includes(`src/self-hosted/conversion-overlays/${candidate.file}`),
        `${candidate.file} must be a loaded asset`,
      );
      const reference = readFileSync(join(ROOT, "packages-galerina", candidate.source), "utf8");
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
