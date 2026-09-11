import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { applyAgentMergePolicy } from "../../galerina-ai-agent/dist/index.js";

// Executes the actual policy twin on typed inert records. This proves ordered
// policy outcomes and warning text, not active JavaScript object behaviour or
// physical SLIDE/VOK admission.
const vectors = [
  {
    name: "clean findings remain included",
    findings: [
      { title: "shape", severity: "Low", evidence: "observed", confidence: 0.9 },
      { title: "auth", severity: "High", evidence: "receipt", confidence: 0.95 },
    ],
    policy: { requireEvidenceFor: ["High", "Critical"], minimumConfidence: 0.8, lowConfidenceAction: "drop" },
  },
  {
    name: "required evidence drops before confidence handling",
    findings: [
      { title: "missing", severity: "High", evidence: "", confidence: 0.99 },
      { title: "kept", severity: "Low", evidence: "note", confidence: 0.99 },
    ],
    policy: { requireEvidenceFor: ["High"], minimumConfidence: 0.8, lowConfidenceAction: "drop" },
  },
  {
    name: "low confidence drop",
    findings: [{ title: "weak", severity: "Medium", evidence: "note", confidence: 0.4 }],
    policy: { requireEvidenceFor: [], minimumConfidence: 0.8, lowConfidenceAction: "drop" },
  },
  {
    name: "low confidence review",
    findings: [{ title: "weak", severity: "Medium", evidence: "note", confidence: 0.4 }],
    policy: { requireEvidenceFor: [], minimumConfidence: 0.8, lowConfidenceAction: "review" },
  },
  {
    name: "low confidence include with warning",
    findings: [{ title: "weak", severity: "Medium", evidence: "note", confidence: 0.4 }],
    policy: { requireEvidenceFor: [], minimumConfidence: 0.8, lowConfidenceAction: "include_with_warning" },
  },
  {
    name: "mixed order and multiple warnings",
    findings: [
      { title: "high-missing", severity: "High", evidence: "", confidence: 0.2 },
      { title: "low-review", severity: "Low", evidence: "note", confidence: 0.2 },
      { title: "good", severity: "Critical", evidence: "signed", confidence: 0.95 },
    ],
    policy: { requireEvidenceFor: ["High", "Critical"], minimumConfidence: 0.8, lowConfidenceAction: "review" },
  },
];

const str = JSON.stringify;
function findingExpression(finding) {
  return `AgentFinding { title: ${str(finding.title)}, severity: ${str(finding.severity)}, evidence: ${str(finding.evidence)}, confidence: ${finding.confidence} }`;
}

function probe(index, vector) {
  const expected = applyAgentMergePolicy(vector.findings, {
    name: "test",
    ...vector.policy,
  });
  const findings = vector.findings.reduce(
    (expression, finding) => `${expression}.append(${findingExpression(finding)})`,
    "Array.empty()",
  );
  const required = vector.policy.requireEvidenceFor.reduce(
    (expression, severity) => `${expression}.append(${str(severity)})`,
    "Array.empty()",
  );
  const checks = (rows, field) => rows.map((finding, i) => `
  match outcome.${field}.get(${i}) {
    Some(item) => {
      if item.title != ${str(finding.title)} { return false }
      if item.severity != ${str(finding.severity)} { return false }
      if item.evidence != ${str(finding.evidence)} { return false }
      if item.confidence != ${finding.confidence} { return false }
    }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  const warningChecks = expected.warnings.map((warning, i) => `
  match outcome.warnings.get(${i}) {
    Some(warning) => { if warning != ${str(warning)} { return false } }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the policy twin with its retained TypeScript oracle." } }
{
  let findings: Array<AgentFinding> = ${findings}
  let requireEvidenceFor: Array<String> = ${required}
  let mergePolicy: AgentMergePolicy = AgentMergePolicy {
    name: "test", requireEvidenceFor: requireEvidenceFor,
    minimumConfidence: ${vector.policy.minimumConfidence}, lowConfidenceAction: ${str(vector.policy.lowConfidenceAction)}
  }
  let outcome: AgentMergeOutcome = applyAgentMergePolicy(findings, mergePolicy)
  if outcome.included.count() != ${expected.included.length} { return false }
  if outcome.dropped.count() != ${expected.dropped.length} { return false }
  if outcome.warnings.count() != ${expected.warnings.length} { return false }
  ${checks(expected.included, "included")}
  ${checks(expected.dropped, "dropped")}
  ${warningChecks}
  return true
}
`;
}

test("Wave 01 merge-policy twin preserves ordered outcomes and warnings in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../galerina-ai-agent/src/self-hosted/apply-agent-merge-policy.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "agent-merge-policy-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and policy probes parse/check");
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
