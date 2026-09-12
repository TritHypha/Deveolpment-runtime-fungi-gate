import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateAgentTaskGroupPlan } from "../../galerina-ai-agent/dist/index.js";

// The native task-group validator is tested as a pure typed core. The retained
// TypeScript validator remains the oracle for order and exact diagnostic text.
const vectors = [
  { name: "valid group", groupName: "reviewers", timeoutMs: 1.5, agents: ["sol"], cancelOnFailure: true },
  { name: "blank name", groupName: "   ", timeoutMs: 10, agents: ["sol"], cancelOnFailure: false },
  { name: "non-positive timeout", groupName: "reviewers", timeoutMs: 0, agents: ["sol"], cancelOnFailure: false },
  { name: "empty agents", groupName: "reviewers", timeoutMs: 10, agents: [], cancelOnFailure: false },
  { name: "all structural diagnostics retain order", groupName: "", timeoutMs: -1, agents: [], cancelOnFailure: true },
  { name: "fractional timeout accepted", groupName: "fast", timeoutMs: 0.25, agents: ["astra", "grok"], cancelOnFailure: true },
];

const str = JSON.stringify;

function groupExpression(vector) {
  const agents = vector.agents.reduce(
    (expression, agent) => `${expression}.append(${str(agent)})`,
    "Array.empty()",
  );
  return `AgentTaskGroupPlan { name: ${str(vector.groupName)}, timeoutMs: ${Number.isInteger(vector.timeoutMs) ? `${vector.timeoutMs}.0` : vector.timeoutMs}, agents: ${agents}, cancelOnFailure: ${vector.cancelOnFailure} }`;
}

function probe(index, vector) {
  const expected = validateAgentTaskGroupPlan({
    name: vector.groupName,
    timeoutMs: vector.timeoutMs,
    agents: vector.agents,
    cancelOnFailure: vector.cancelOnFailure,
  });
  const checks = expected.map((diagnostic, diagnosticIndex) => `
  match diagnostics.get(${diagnosticIndex}) {
    Some(item) => {
      if item.code != ${str(diagnostic.code)} { return false }
      if item.severity != ${str(diagnostic.severity)} { return false }
      if item.message != ${str(diagnostic.message)} { return false }
      if item.path != ${str(diagnostic.path)} { return false }
    }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the task-group validator twin with its retained TypeScript oracle." } }
{
  let plan: AgentTaskGroupPlan = ${groupExpression(vector)}
  let diagnostics: Array<AgentDiagnostic> = validateAgentTaskGroupPlan(plan)
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 01 task-group validator twin preserves structural diagnostics in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-ai-agent/validate-agent-task-group-plan.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "agent-task-group-plan-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and task-group probes parse/check");
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
