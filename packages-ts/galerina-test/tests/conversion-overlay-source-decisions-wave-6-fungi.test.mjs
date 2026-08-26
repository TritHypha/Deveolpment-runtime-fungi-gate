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
  ["regex-pattern-budget.fungi", "regexPatternBudgetCore", "galerina-tri-regex/src/parser.ts", "parsePattern", args([["patternLength", int(8)], ["maxPatternLength", int(16)], ["parserAccepted", bool(true)]]), string("parsed")],
  ["regex-compile-admission.fungi", "regexCompileAdmissionCore", "galerina-tri-regex/src/compile.ts", "compileAst", args([["parseAccepted", bool(true)], ["instructionBudgetAccepted", bool(true)], ["closureBudgetAccepted", bool(true)], ["workBound", int(8)]]), string("compiled")],
  ["regex-closure-instruction-action.fungi", "regexClosureInstructionActionCore", "galerina-tri-regex/src/compile.ts", "walk", args([["splitInstruction", bool(true)], ["endAssertion", bool(false)], ["startAssertion", bool(false)], ["assertionSatisfied", bool(false)]]), string("fork")],
  ["regex-parser-peek.fungi", "regexParserPeekCore", "galerina-tri-regex/src/parser.ts", "peek", args([["atEnd", bool(false)], ["codePoint", int(65)]]), int(65)],
  ["regex-parser-next-width.fungi", "regexParserNextWidthCore", "galerina-tri-regex/src/parser.ts", "next", args([["atEnd", bool(false)], ["codePoint", int(128512)], ["index", int(3)]]), int(5)],
  ["regex-parser-initial-state.fungi", "regexParserInitialStateCore", "galerina-tri-regex/src/parser.ts", "constructor", args([["patternCaptured", bool(true)], ["budgetCaptured", bool(true)], ["initialIndex", int(0)]]), string("ready")],
  ["regex-parse-completion.fungi", "regexParseCompletionCore", "galerina-tri-regex/src/parser.ts", "parse", args([["alternativeAccepted", bool(true)], ["atEnd", bool(true)]]), string("accepted")],
  ["regex-alternative-shape.fungi", "regexAlternativeShapeCore", "galerina-tri-regex/src/parser.ts", "alt", args([["concatAccepted", bool(true)], ["separatorPresent", bool(true)], ["itemCount", int(2)]]), string("alternative")],
  ["regex-concat-shape.fungi", "regexConcatShapeCore", "galerina-tri-regex/src/parser.ts", "concat", args([["repeatAccepted", bool(true)], ["terminatorSeen", bool(false)], ["itemCount", int(3)]]), string("concat")],
  ["regex-repeat-admission.fungi", "regexRepeatAdmissionCore", "galerina-tri-regex/src/parser.ts", "repeated", args([["atomAccepted", bool(true)], ["quantifierPresent", bool(true)], ["anchorAtom", bool(false)], ["stackedModifier", bool(false)]]), string("repeat")],
  ["regex-quantifier-shape.fungi", "regexQuantifierShapeCore", "galerina-tri-regex/src/parser.ts", "quant", args([["digitsPresent", bool(true)], ["closingBracePresent", bool(true)], ["openMaximum", bool(false)], ["rangePresent", bool(true)], ["minimum", int(2)], ["maximum", int(4)]]), string("bounded")],
  ["regex-atom-dispatch.fungi", "regexAtomDispatchCore", "galerina-tri-regex/src/parser.ts", "atom", args([["groupAtom", bool(true)], ["groupClosed", bool(true)], ["unsupportedPrefix", bool(false)], ["nakedQuantifier", bool(false)], ["classAtom", bool(false)]]), string("group")],
  ["regex-escape-range-action.fungi", "regexEscapeRangeActionCore", "galerina-tri-regex/src/parser.ts", "escapeRanges", args([["payloadValid", bool(true)], ["withinCodePoint", bool(true)], ["unsupportedEscape", bool(false)], ["classEscape", bool(true)], ["codePoint", int(65)]]), string("class")],
  ["regex-escape-node-result.fungi", "regexEscapeNodeResultCore", "galerina-tri-regex/src/parser.ts", "escape", args([["escapeAccepted", bool(true)], ["rangesPresent", bool(true)]]), string("class_node")],
  ["regex-character-class-result.fungi", "regexCharacterClassResultCore", "galerina-tri-regex/src/parser.ts", "charClass", args([["unterminated", bool(false)], ["rangeOutOfOrder", bool(false)], ["normalizedNonEmpty", bool(true)], ["negated", bool(true)], ["rangeCount", int(2)]]), string("class")],
  ["regex-matcher-construction.fungi", "regexMatcherConstructionCore", "galerina-tri-regex/src/engine.ts", "constructor", args([["compiledCaptured", bool(true)], ["uniformScan", bool(true)], ["wordCount", int(2)]]), string("uniform")],
  ["regex-match-test-result.fungi", "regexMatchTestResultCore", "galerina-tri-regex/src/engine.ts", "test", args([["streamCreated", bool(true)], ["feedFailed", bool(false)], ["matched", bool(true)]]), string("matched")],
  ["regex-stream-feed-verdict.fungi", "regexStreamFeedVerdictCore", "galerina-tri-regex/src/engine.ts", "stream", args([["ended", bool(false)], ["matched", bool(true)], ["impossible", bool(false)], ["uniformScan", bool(false)]]), int(1)],
  ["regex-veto-error-construction.fungi", "regexVetoErrorConstructionCore", "galerina-tri-regex/src/compile.ts", "VetoError", args([["reasonPresent", bool(true)], ["vetoCaptured", bool(true)], ["foreignFailure", bool(false)]]), string("veto_error")],
  ["regex-emitter-construction.fungi", "regexEmitterConstructionCore", "galerina-tri-regex/src/compile.ts", "Emitter", args([["budgetCaptured", bool(true)], ["maxInstructions", int(64)]]), string("ready")],
  ["regex-emitter-push-admission.fungi", "regexEmitterPushAdmissionCore", "galerina-tri-regex/src/compile.ts", "push", args([["currentLength", int(4)], ["maxInstructions", int(8)], ["instructionPresent", bool(true)]]), int(5)],
  ["regex-emitter-finish-action.fungi", "regexEmitterFinishActionCore", "galerina-tri-regex/src/compile.ts", "finish", args([["emitterReady", bool(true)], ["currentLength", int(4)], ["maxInstructions", int(8)]]), string("match_appended")],
  ["regex-emitter-node-action.fungi", "regexEmitterNodeActionCore", "galerina-tri-regex/src/compile.ts", "emit", args([["emptyNode", bool(false)], ["characterNode", bool(true)], ["rangesPresent", bool(true)], ["compositeNode", bool(false)], ["itemCount", int(2)]]), string("emit_char")],
  ["regex-emitter-alternative-action.fungi", "regexEmitterAlternativeActionCore", "galerina-tri-regex/src/compile.ts", "emitAlt", args([["itemsPresent", bool(true)], ["itemCount", int(3)], ["budgetAccepted", bool(true)]]), string("split_chain")],
  ["regex-emitter-repeat-action.fungi", "regexEmitterRepeatActionCore", "galerina-tri-regex/src/compile.ts", "emitRep", args([["itemPresent", bool(true)], ["minimum", int(2)], ["unbounded", bool(false)], ["maximum", int(4)]]), string("finite_tail")],
  ["browser-runtime-report-core.fungi", "browserRuntimeReportCore", "galerina-web/src/index.ts", "createBrowserRuntimeReport", args([["errorCount", int(0)], ["warningCount", int(1)], ["failedCheckCount", int(0)]]), string("partial")],
  ["web-family-report-index-core.fungi", "webFamilyReportIndexCore", "galerina-web/src/index.ts", "createWebFamilyReportIndex", args([["timestampValid", bool(true)], ["duplicateCount", int(0)], ["missingProducerCount", int(1)], ["anyFailed", bool(false)], ["anyPartial", bool(false)]]), string("partial")],
  ["component-report-core.fungi", "componentReportCore", "galerina-web-components/src/index.ts", "createComponentReport", args([["componentAdmitted", bool(true)], ["errorCount", int(0)], ["warningCount", int(0)], ["failedCheckCount", int(0)]]), string("success")],
  ["web-event-report-core.fungi", "webEventReportCore", "galerina-web-events/src/index.ts", "createWebEventReport", args([["eventCount", int(3)], ["eventsAdmitted", bool(true)], ["errorOrFailedCheck", bool(false)], ["warningPresent", bool(true)]]), string("partial")],
  ["dom-update-report-core.fungi", "domUpdateReportCore", "galerina-web-render/src/index.ts", "createDomUpdateReport", args([["targetPresent", bool(true)], ["planAdmitted", bool(true)], ["contentAdmitted", bool(true)], ["streamingAdmitted", bool(true)], ["countsAdmitted", bool(true)]]), string("success")],
  ["template-param-segment.fungi", "templateParamSegmentCore", "galerina-web-router/src/index.ts", "parseTemplateParams", args([["startsWithColon", bool(true)], ["namePresent", bool(true)], ["segmentIndex", int(2)]]), string("parameter")],
  ["web-route-report-core.fungi", "webRouteReportCore", "galerina-web-router/src/index.ts", "createWebRouteReport", args([["routesAdmitted", bool(true)], ["linksAdmitted", bool(true)], ["preloadAdmitted", bool(true)], ["routeCount", int(4)]]), string("success")],
  ["client-state-report-core.fungi", "clientStateReportCore", "galerina-web-state/src/index.ts", "createClientStateReport", args([["contractAdmitted", bool(true)], ["conversionAdmitted", bool(true)], ["hydrationPresent", bool(true)], ["hydrationAdmitted", bool(true)], ["diffPresent", bool(false)], ["diffAdmitted", bool(true)]]), string("success")],
  ["lowercase-header-action.fungi", "lowercaseHeaderActionCore", "galerina-framework-api-server/src/index.ts", "lowercaseHeaders", args([["valuePresent", bool(true)], ["arrayValue", bool(true)], ["memberCount", int(2)]]), string("join")],
  ["http-response-write-action.fungi", "httpResponseWriteActionCore", "galerina-framework-api-server/src/index.ts", "writeResponse", args([["headersSent", bool(false)], ["writableEnded", bool(false)], ["bodyPresent", bool(true)], ["bodyLength", int(3)]]), string("write_body")],
  ["certificate-gate-resolution.fungi", "certificateGateResolutionCore", "galerina-framework-api-server/src/index.ts", "makeCertGateResolver", args([["tlsSocket", bool(true)], ["certificateInputAdmitted", bool(true)], ["certificateVerdict", int(1)]]), int(1)],
  ["secure-context-defaults.fungi", "secureContextDefaultsCore", "galerina-framework-api-server/src/index.ts", "buildSecureContext", args([["keyPresent", bool(true)], ["certificatePresent", bool(true)], ["caPresent", bool(false)], ["requestCertProvided", bool(false)], ["rejectUnauthorizedProvided", bool(false)]]), string("default_verify_peer")],
  ["api-request-dispatch.fungi", "apiRequestDispatchCore", "galerina-framework-api-server/src/index.ts", "onRequest", args([["kernelReady", bool(true)], ["bodyBoundValid", bool(true)], ["channelResolverPresent", bool(true)], ["principalResolverPresent", bool(true)], ["tlsEnabled", bool(true)]]), string("dispatch_tls")],
  ["principal-descriptor-read.fungi", "principalDescriptorReadCore", "galerina-framework-api-server/src/index.ts", "read", args([["descriptorPresent", bool(true)], ["dataDescriptor", bool(true)], ["enumerable", bool(true)], ["valuePresent", bool(true)]]), string("value")],
  ["query-diagnostic-record.fungi", "queryDiagnosticRecordCore", "galerina-data-query/src/index.ts", "queryDiagnostic", args([["codePresent", bool(true)], ["severityClass", string("warning")], ["messagePresent", bool(true)], ["pathPresent", bool(false)]]), string("without_path")],
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

describe("40-file source-bound Fungi decision-core overlay wave 6", () => {
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
