import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  ["ecc-bit-extraction.fungi", "eccBitExtractionCore", "galerina-ext-photonic-emulator/src/digital-ecc.ts", "const bit", args([["addressValid", bool(true)], ["selectedOne", bool(true)]]), int(1)],
  ["ecc-nibble-encode-admission.fungi", "eccNibbleEncodeAdmissionCore", "galerina-ext-photonic-emulator/src/digital-ecc.ts", "function eccEncodeNibble", args([["integerInput", bool(true)], ["lowerBounded", bool(true)], ["upperBounded", bool(true)]]), string("encode")],
  ["ecc-data-extraction-status.fungi", "eccDataExtractionStatusCore", "galerina-ext-photonic-emulator/src/digital-ecc.ts", "function extractData", args([["positionsCaptured", bool(true)], ["nibbleReady", bool(true)]]), string("nibble")],
  ["ecc-nibble-decode-status.fungi", "eccNibbleDecodeStatusCore", "galerina-ext-photonic-emulator/src/digital-ecc.ts", "function eccDecodeNibble", args([["inputValid", bool(true)], ["oddParity", bool(true)], ["syndromePresent", bool(true)]]), string("corrected_data_bit")],
  ["ecc-stream-encode-status.fungi", "eccStreamEncodeStatusCore", "galerina-ext-photonic-emulator/src/digital-ecc.ts", "function eccEncode", args([["dataPresent", bool(true)], ["capacityReady", bool(true)]]), string("expanded")],
  ["ecc-stream-decode-status.fungi", "eccStreamDecodeStatusCore", "galerina-ext-photonic-emulator/src/digital-ecc.ts", "function eccDecode", args([["evenLength", bool(true)], ["lowOk", bool(true)], ["highOk", bool(true)], ["correctionsPresent", bool(true)]]), string("ok_corrected")],
  ["photonic-adc-range-status.fungi", "photonicAdcRangeStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function adcRange", args([["dimensionPositive", bool(true)]]), string("scaled_range")],
  ["photonic-variance-status.fungi", "photonicVarianceStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function analogVarianceClosedForm", args([["activeTerms", bool(true)], ["phaseNoise", bool(true)], ["readoutNoise", bool(true)]]), string("phase_and_readout")],
  ["wdm-application-status.fungi", "wdmApplicationStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function applyWdm", args([["matrixReady", bool(true)], ["vectorReady", bool(true)], ["dimensionsMatch", bool(true)]]), string("applied")],
  ["binomial-domain-status.fungi", "binomialDomainStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function binom", args([["kNegative", bool(false)], ["kAboveN", bool(false)], ["symmetricReduction", bool(true)]]), string("computed")],
  ["photonic-clamp-position.fungi", "photonicClampPositionCore", "galerina-ext-photonic-emulator/src/emulator.ts", "const clamp01", args([["belowZero", bool(false)], ["aboveOne", bool(true)]]), int(1)],
  ["vote-count-selection-status.fungi", "voteCountSelectionStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function clampVotes", args([["provided", bool(true)], ["finite", bool(true)], ["belowOne", bool(false)], ["aboveMaximum", bool(true)], ["fallbackValid", bool(true)]]), string("max_clamped")],
  ["photonic-tmac-exact-action.fungi", "photonicTmacExactActionCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function tmacExact", args([["weightPositive", bool(false)], ["weightNegative", bool(true)], ["activationPresent", bool(true)]]), string("subtract")],
  ["photonic-tmac-quantization-status.fungi", "photonicTmacQuantizationStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function tmacPhotonic", args([["zeroWeight", bool(false)], ["gainReady", bool(true)], ["readoutAdded", bool(true)], ["quantBitsPositive", bool(true)]]), string("quantized_scaled")],
  ["photonic-tmac-vote-status.fungi", "photonicTmacVoteStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function tmacVoted", args([["votesBounded", bool(true)], ["sampleCountPositive", bool(true)]]), string("mean")],
  ["wdm-matrix-row-status.fungi", "wdmMatrixRowStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function wdmCrosstalkMatrix", args([["singleChannel", bool(false)], ["leftNeighbor", bool(true)], ["rightNeighbor", bool(true)], ["leakPositive", bool(true)]]), string("two_neighbor_split")],
  ["photonic-flip-probability-status.fungi", "photonicFlipProbabilityStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function flipProbability", args([["rawBelowZero", bool(false)], ["rawAboveOne", bool(true)]]), string("clamped_one")],
  ["photonic-single-lane-status.fungi", "photonicSingleLaneStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function singleLaneErrorProbability", args([["laneFailed", bool(false)], ["flipPresent", bool(true)]]), string("combined_probability")],
  ["photonic-nmr-failure-status.fungi", "photonicNmrFailureStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function nmrFailureProbability", args([["majorityThreshold", bool(true)], ["termsAccumulated", bool(true)], ["withinUnit", bool(true)]]), string("bounded_probability")],
  ["photonic-quant-step-status.fungi", "photonicQuantStepStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "function quantStep", args([["rangeFinite", bool(true)], ["quantBitsPositive", bool(true)]]), string("finite_step")],
  ["photonic-hex-repeat-status.fungi", "photonicHexRepeatStatusCore", "galerina-ext-photonic-emulator/src/photonic-bridge.ts", "const HEX64", args([["characterPresent", bool(true)], ["repeatCountCorrect", bool(true)]]), string("placeholder_64")],
  ["photonic-fnv-input-status.fungi", "photonicFnvInputStatusCore", "galerina-ext-photonic-emulator/src/photonic-bridge.ts", "function fnv1a", args([["utf16Captured", bool(true)], ["loopBounded", bool(true)], ["wrappedU32", bool(true)]]), string("u32_hash")],
  ["freivalds-matvec-status.fungi", "freivaldsMatvecStatusCore", "galerina-ext-photonic-emulator/src/freivalds.ts", "function matvec", args([["matrixSquare", bool(true)], ["vectorLengthMatch", bool(true)], ["rowsComplete", bool(true)]]), string("vector_ready")],
  ["freivalds-verification-status.fungi", "freivaldsVerificationStatusCore", "galerina-ext-photonic-emulator/src/freivalds.ts", "function freivaldsVerify", args([["probesPositive", bool(true)], ["allWithinTolerance", bool(true)], ["rngBounded", bool(true)]]), bool(true)],
  ["freivalds-cost-factor.fungi", "freivaldsCostFactorCore", "galerina-ext-photonic-emulator/src/freivalds.ts", "function freivaldsVerifyCost", args([["dimensionPositive", bool(true)], ["probeCountPositive", bool(true)]]), int(3)],
  ["photonic-tolerance-check.fungi", "photonicToleranceCheckCore", "galerina-ext-photonic-emulator/src/freivalds.ts", "function toleranceCheck", args([["valuesFinite", bool(true)], ["residualWithin", bool(true)], ["spanFloorApplied", bool(true)]]), bool(true)],
  ["photonic-parity-conformance-status.fungi", "photonicParityConformanceStatusCore", "galerina-ext-photonic-emulator/src/parity-conformance.ts", "function checkParity", args([["binaryRejected", bool(false)], ["photonicRejected", bool(false)], ["withinTolerance", bool(true)]]), string("both_admitted_within_tolerance")],
  ["photonic-parity-report-status.fungi", "photonicParityReportStatusCore", "galerina-ext-photonic-emulator/src/parity-conformance.ts", "function proveBifurcatedParity", args([["everyConformant", bool(true)], ["divergencesZero", bool(true)], ["outOfToleranceZero", bool(true)], ["residualsPresent", bool(true)]]), string("all_conformant_measured")],
  ["photonic-digital-cost-status.fungi", "photonicDigitalCostStatusCore", "galerina-ext-photonic-emulator/src/partition-decider.ts", "function Tdigital", args([["dimensionPositive", bool(true)]]), string("cubic_cost")],
  ["photonic-offload-cost-status.fungi", "photonicOffloadCostStatusCore", "galerina-ext-photonic-emulator/src/partition-decider.ts", "function Tphotonic", args([["dimensionPositive", bool(true)], ["votesPositive", bool(true)], ["conversionIncluded", bool(true)], ["fixedIncluded", bool(true)]]), string("voted_verified_cost")],
  ["photonic-crossover-status.fungi", "photonicCrossoverStatusCore", "galerina-ext-photonic-emulator/src/partition-decider.ts", "function crossover", args([["votesPositive", bool(true)], ["digitalRatePositive", bool(true)]]), string("finite_threshold")],
  ["photonic-meech-ratio-status.fungi", "photonicMeechRatioStatusCore", "galerina-ext-photonic-emulator/src/partition-decider.ts", "function meechRealizedRatio", args([["idealPositive", bool(true)], ["conversionTaxIncluded", bool(true)], ["realizedPositive", bool(true)]]), string("realized_after_tax")],
  ["photonic-redundancy-selection.fungi", "photonicRedundancySelectionCore", "galerina-ext-photonic-emulator/src/partition-decider.ts", "function requiredRedundancy", args([["quantFloorExceeds", bool(false)], ["varianceWithin", bool(true)], ["targetPositive", bool(true)]]), string("single_read")],
  ["photonic-backend-selection-status.fungi", "photonicBackendSelectionStatusCore", "galerina-ext-photonic-emulator/src/photonic-switch.ts", "function selectPhotonicBackend", args([["modeHardware", bool(true)], ["hardwarePresent", bool(true)], ["nativeAvailable", bool(true)], ["attested", bool(true)]]), string("hardware")],
  ["photonic-backend-resolution-status.fungi", "photonicBackendResolutionStatusCore", "galerina-ext-photonic-emulator/src/photonic-switch.ts", "function resolvePhotonicBackend", args([["decisionHardware", bool(true)], ["backendUsable", bool(true)]]), string("hardware_backend")],
  ["photonic-effective-tolerance-status.fungi", "photonicEffectiveToleranceStatusCore", "galerina-ext-photonic-emulator/src/runner.ts", "function effectiveTolerance", args([["callerValid", bool(true)], ["callerBelowMaximum", bool(true)], ["maximumBandValid", bool(true)]]), string("caller_band")],
  ["photonic-router-construction-status.fungi", "photonicRouterConstructionStatusCore", "galerina-ext-photonic-emulator/src/runner.ts", "function createPhotonicRouterPort", args([["bridgeConstructed", bool(true)], ["deciderPresent", bool(true)]]), string("router_ready")],
  ["photonic-router-hit-status.fungi", "photonicRouterHitStatusCore", "galerina-ext-photonic-emulator/src/runner.ts", "route(op, kernel)", args([["decisionPhotonic", bool(true)], ["valueFinite", bool(true)], ["withinTolerance", bool(true)]]), string("hit")],
  ["photonic-partition-decision-status.fungi", "photonicPartitionDecisionStatusCore", "galerina-ext-photonic-emulator/src/partition-decider.ts", "decide(kernel: KernelCost)", args([["eligible", bool(true)], ["inputValid", bool(true)], ["laneFeasible", bool(true)], ["votesValid", bool(true)], ["photonicWins", bool(true)]]), string("photonic_net_win")],
  ["photonic-xorshift-next-status.fungi", "photonicXorshiftNextStatusCore", "galerina-ext-photonic-emulator/src/emulator.ts", "next(): number", args([["seedNonzero", bool(true)], ["xorshiftsApplied", bool(true)], ["stateWrapped", bool(true)]]), string("uniform")],
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

describe("40-file source-bound Fungi decision-core overlay wave 11", () => {
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
