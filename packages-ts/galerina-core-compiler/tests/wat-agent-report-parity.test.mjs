import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { createAgentReport } from "../../galerina-ai-agent/dist/index.js";

// The report twin is exercised as a pure, typed core.  The retained TypeScript
// function remains the oracle for optional defaults, warning order and review
// routing; no host object or production consumer is admitted by this test.
const vectors = [
  {
    name: "defaults and run-status ordering",
    flow: "wave-01",
    parallel: true,
    timeoutMs: 125.5,
    runs: [
      { name: "sol", status: "passed", toolCalls: 1.5, memoryBytes: 2048.25, durationMs: 40.75 },
      { name: "grok", status: "timeout", toolCalls: 3, memoryBytes: 4096, durationMs: 90.5 },
    ],
  },
  {
    name: "merge warnings precede runs and unsafe tools",
    flow: "review",
    parallel: false,
    timeoutMs: 900,
    runs: [
      { name: "astra", status: "failed", toolCalls: 2, memoryBytes: 100, durationMs: 12 },
    ],
    findings: [
      { title: "missing", severity: "High", evidence: "", confidence: 0.99 },
      { title: "weak", severity: "Low", evidence: "note", confidence: 0.4 },
      { title: "critical", severity: "Critical", evidence: "receipt", confidence: 0.95 },
    ],
    mergePolicy: {
      name: "strict",
      requireEvidenceFor: ["High", "Critical"],
      minimumConfidence: 0.8,
      lowConfidenceAction: "review",
    },
    unsafeToolsUsed: ["shell", "network"],
  },
  {
    name: "findings without policy remain and safe empty tools do not require review",
    flow: "clean",
    parallel: false,
    timeoutMs: 50,
    runs: [],
    findings: [
      { title: "shape", severity: "Medium", evidence: "observed", confidence: 0.7 },
    ],
    unsafeToolsUsed: [],
  },
  {
    name: "include with warning retains high-impact review",
    flow: "adjudication",
    parallel: true,
    timeoutMs: 1.25,
    runs: [
      { name: "reviewer", status: "passed", toolCalls: 0, memoryBytes: 0, durationMs: 0.25 },
    ],
    findings: [
      { title: "high", severity: "High", evidence: "signed", confidence: 0.25 },
    ],
    mergePolicy: {
      name: "permissive-review",
      requireEvidenceFor: [],
      minimumConfidence: 0.8,
      lowConfidenceAction: "include_with_warning",
    },
    unsafeToolsUsed: [],
  },
];

const str = JSON.stringify;

function runExpression(run) {
  return `AgentReportRunStat { name: ${str(run.name)}, status: ${str(run.status)}, toolCalls: ${run.toolCalls}, memoryBytes: ${run.memoryBytes}, durationMs: ${run.durationMs} }`;
}

function findingExpression(finding) {
  return `AgentReportFinding { title: ${str(finding.title)}, severity: ${str(finding.severity)}, evidence: ${str(finding.evidence)}, confidence: ${finding.confidence} }`;
}

function policyExpression(policy) {
  const required = policy.requireEvidenceFor.reduce(
    (expression, severity) => `${expression}.append(${str(severity)})`,
    "Array.empty()",
  );
  return `AgentReportMergePolicy { name: ${str(policy.name)}, requireEvidenceFor: ${required}, minimumConfidence: ${policy.minimumConfidence}, lowConfidenceAction: ${str(policy.lowConfidenceAction)} }`;
}

function checks(expected) {
  const agentChecks = expected.agents.map((agent, index) => `
  match report.agents.get(${index}) {
    Some(item) => {
      if item.name != ${str(agent.name)} { return false }
      if item.status != ${str(agent.status)} { return false }
      if item.toolCalls != ${agent.toolCalls} { return false }
      if item.memoryBytes != ${agent.memoryBytes} { return false }
      if item.durationMs != ${agent.durationMs} { return false }
    }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  const warningChecks = expected.warnings.map((warning, index) => `
  match report.warnings.get(${index}) {
    Some(item) => { if item != ${str(warning)} { return false } }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  const unsafeChecks = expected.unsafeToolsUsed.map((tool, index) => `
  match report.unsafeToolsUsed.get(${index}) {
    Some(item) => { if item != ${str(tool)} { return false } }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  return `
  if report.flow != ${str(expected.flow)} { return false }
  if report.parallel != ${expected.parallel} { return false }
  if report.timeoutMs != ${expected.timeoutMs} { return false }
  if report.agents.count() != ${expected.agents.length} { return false }
  if report.unsafeToolsUsed.count() != ${expected.unsafeToolsUsed.length} { return false }
  if report.humanReviewRequired != ${expected.humanReviewRequired} { return false }
  if report.warnings.count() != ${expected.warnings.length} { return false }
  ${agentChecks}
  ${warningChecks}
  ${unsafeChecks}
  return true
`;
}

function probe(index, vector) {
  const expected = createAgentReport({
    flow: vector.flow,
    parallel: vector.parallel,
    timeoutMs: vector.timeoutMs,
    runs: vector.runs,
    ...(vector.findings === undefined ? {} : { findings: vector.findings }),
    ...(vector.mergePolicy === undefined ? {} : { mergePolicy: vector.mergePolicy }),
    ...(vector.unsafeToolsUsed === undefined ? {} : { unsafeToolsUsed: vector.unsafeToolsUsed }),
  });
  const runs = vector.runs.reduce(
    (expression, run) => `${expression}.append(${runExpression(run)})`,
    "Array.empty()",
  );
  const findings = vector.findings === undefined
    ? "None"
    : `Some(${vector.findings.reduce(
      (expression, finding) => `${expression}.append(${findingExpression(finding)})`,
      "Array.empty()",
    )})`;
  const policy = vector.mergePolicy === undefined ? "None" : `Some(${policyExpression(vector.mergePolicy)})`;
  const unsafe = vector.unsafeToolsUsed === undefined
    ? "None"
    : `Some(${vector.unsafeToolsUsed.reduce(
      (expression, tool) => `${expression}.append(${str(tool)})`,
      "Array.empty()",
    )})`;
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the report twin with its retained TypeScript oracle." } }
{
  let runs: Array<AgentReportRunStat> = ${runs}
  let findings: Option<Array<AgentReportFinding>> = ${findings}
  let mergePolicy: Option<AgentReportMergePolicy> = ${policy}
  let unsafeToolsUsed: Option<Array<String>> = ${unsafe}
  let timeoutMs: Float64 = ${vector.timeoutMs}
  let report: AgentReportResult = createAgentReport(${str(vector.flow)}, ${vector.parallel}, timeoutMs, runs, findings, mergePolicy, unsafeToolsUsed)
  ${checks(expected)}
}
`;
}

test("Wave 01 report twin preserves defaults, warning order, metrics and review routing in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-ai-agent-report/create-agent-report.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "agent-report-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and report probes parse/check");
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  for (const entry of L.getInternedStrings()) host.seedString(entry.handle, entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  for (let i = 0; i < vectors.length; i++) {
    await t.test(vectors[i].name, () => assert.equal(instance.exports[`probe${i}`](), 1));
  }
});
