import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateAgentDefinition, validateAgentLimits } from "../../galerina-ai-agent/dist/index.js";

// This executes the actual Wave 01 twin on inert, typed records. It proves
// diagnostic content/order for these vectors, not a JavaScript object border,
// arbitrary getter/proxy behavior, non-finite input admission, or SLIDE/VOK.
const baseline = {
  name: "reviewer", inputType: "Request", outputType: "Response",
  tools: [], effects: [], permissions: [],
  limits: { timeoutMs: 0.5, memoryBytes: 1024, maxToolCalls: 1 },
  failureBehaviour: "return_typed_error",
};
const vectors = [
  ["valid required limits and absent optional limits", baseline],
  ["all structural and required limit errors in source order", {
    ...baseline, name: " ", inputType: "", outputType: " ",
    limits: { timeoutMs: 0, memoryBytes: -1, maxToolCalls: 0 },
  }],
  ["invalid present optional limits", {
    ...baseline, limits: { ...baseline.limits, maxTokens: 0, rateLimitPerMinute: -1 },
  }],
  ["positive present optional limits", {
    ...baseline, limits: { ...baseline.limits, maxTokens: 12.5, rateLimitPerMinute: 0.25 },
  }],
  ["negative fractional optional limits remain present", {
    ...baseline, limits: { ...baseline.limits, maxTokens: -0.5, rateLimitPerMinute: -2.25 },
  }],
  ["only the invalid token limit is present", {
    ...baseline, limits: { ...baseline.limits, maxTokens: -0.5 },
  }],
  ["only the invalid rate limit is present", {
    ...baseline, limits: { ...baseline.limits, rateLimitPerMinute: -2.25 },
  }],
  ["valid token limit and invalid rate limit stay distinct", {
    ...baseline, limits: { ...baseline.limits, maxTokens: 3.5, rateLimitPerMinute: 0 },
  }],
  ["invalid token limit and valid rate limit stay distinct", {
    ...baseline, limits: { ...baseline.limits, maxTokens: 0, rateLimitPerMinute: 2.25 },
  }],
  ["tool diagnostics precede limit diagnostics", {
    ...baseline, tools: [
      { tool: " ", decision: "allow" },
      { tool: "read", decision: "allow" },
      { tool: "read", decision: "deny" },
      { tool: "read", decision: "allow" },
    ], limits: { timeoutMs: -0.5, memoryBytes: 1, maxToolCalls: 0 },
  }],
];

const str = JSON.stringify;
const optional = (value, name) => value === undefined ? "None" : `Some(AgentLimitValue { value: ${name} })`;
function probe(index, value, target) {
  const expected = target === "definition" ? validateAgentDefinition(value) : validateAgentLimits(value.limits);
  const limits = value.limits;
  const tools = value.tools.reduce((expression, permission) =>
    `${expression}.append(AgentToolPermission { tool: ${str(permission.tool)}, decision: ${str(permission.decision)} })`,
  "Array.empty()");
  const checks = expected.map((diagnostic, i) => `
  match diagnostics.get(${i}) {
    Some(diagnostic) => {
      if diagnostic.code != ${str(diagnostic.code)} { return false }
      if diagnostic.severity != ${str(diagnostic.severity)} { return false }
      if diagnostic.message != ${str(diagnostic.message)} { return false }
      if diagnostic.path != ${str(diagnostic.path)} { return false }
    }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  return `
pure flow probe${index}(timeoutMs: Float64, memoryBytes: Float64, maxToolCalls: Float64, maxTokens: Float64, rateLimit: Float64) -> Bool
contract { intent { "Compare the actual agent-definition twin's ordered diagnostics with its retained TypeScript oracle." } }
{
  let limits: AgentLimits = AgentLimits {
    timeoutMs: timeoutMs, memoryBytes: memoryBytes,
    maxToolCalls: maxToolCalls, maxTokens: ${optional(limits.maxTokens, "maxTokens")},
    rateLimitPerMinute: ${optional(limits.rateLimitPerMinute, "rateLimit")}
  }
  ${target === "definition" ? `let tools: Array<AgentToolPermission> = ${tools}
  let definition: AgentDefinition = AgentDefinition {
    name: ${str(value.name)}, inputType: ${str(value.inputType)}, outputType: ${str(value.outputType)},
    tools: tools, effects: Array.empty(), permissions: Array.empty(), limits: limits,
    failureBehaviour: ${str(value.failureBehaviour)}
  }
  let diagnostics: Array<AgentDiagnostic> = validateAgentDefinition(definition)` :
  "let diagnostics: Array<AgentDiagnostic> = validateAgentLimits(limits)"}
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

for (const target of ["definition", "limits"]) {
test(`Wave 01 ${target} twin preserves ordered diagnostics in WASM`, { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    `../../galerina-ai-agent/src/self-hosted/validate-agent-${target}.fungi`, import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map(([, value], i) => probe(i, value, target)).join("\n"), `agent-${target}-parity.fungi`);
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and diagnostic probes parse/check");
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const strings = [...L.getInternedStrings()];
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  for (const entry of strings) host.seedString(entry.handle, entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  for (let i = 0; i < vectors.length; i++) {
    const limits = vectors[i][1].limits;
    await t.test(vectors[i][0], () => assert.equal(instance.exports[`probe${i}`](
      limits.timeoutMs, limits.memoryBytes, limits.maxToolCalls,
      limits.maxTokens ?? 0, limits.rateLimitPerMinute ?? 0,
    ), 1));
  }
});
}
