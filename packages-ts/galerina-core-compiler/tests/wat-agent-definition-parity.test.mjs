import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateAgentDefinition, validateAgentLimits } from "../../galerina-ai-agent/dist/index.js";

// This executes the actual Wave 01 twin on inert, typed records. It proves
// diagnostic content/order and raw-f64 predicate behavior for these vectors,
// not a JavaScript object border, arbitrary getter/proxy behavior, host
// marshalling, consumer cutover, or SLIDE/VOK.
const baseline = {
  name: "reviewer", inputType: "Request", outputType: "Response",
  tools: [], effects: [], permissions: [],
  limits: { timeoutMs: 0.5, memoryBytes: 1024, maxToolCalls: 1 },
  failureBehaviour: "return_typed_error",
};

function limitsWith(field, value) {
  return { ...baseline.limits, [field]: value };
}

const nonFiniteLimitVectors = [
  ["timeout positive infinity remains valid", "timeoutMs", Number.POSITIVE_INFINITY],
  ["timeout negative infinity is invalid", "timeoutMs", Number.NEGATIVE_INFINITY],
  ["timeout NaN is invalid", "timeoutMs", Number.NaN],
  ["memory positive infinity remains valid", "memoryBytes", Number.POSITIVE_INFINITY],
  ["memory negative infinity is invalid", "memoryBytes", Number.NEGATIVE_INFINITY],
  ["memory NaN is invalid", "memoryBytes", Number.NaN],
  ["tool calls positive infinity remains valid", "maxToolCalls", Number.POSITIVE_INFINITY],
  ["tool calls negative infinity is invalid", "maxToolCalls", Number.NEGATIVE_INFINITY],
  ["tool calls NaN is invalid", "maxToolCalls", Number.NaN],
  ["tokens positive infinity remains valid", "maxTokens", Number.POSITIVE_INFINITY],
  ["tokens negative infinity is invalid", "maxTokens", Number.NEGATIVE_INFINITY],
  ["tokens NaN is invalid", "maxTokens", Number.NaN],
  ["rate positive infinity remains valid", "rateLimitPerMinute", Number.POSITIVE_INFINITY],
  ["rate negative infinity is invalid", "rateLimitPerMinute", Number.NEGATIVE_INFINITY],
  ["rate NaN is invalid", "rateLimitPerMinute", Number.NaN],
];
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
  ...nonFiniteLimitVectors.map(([name, field, value]) => [name, {
    ...baseline,
    limits: limitsWith(field, value),
  }]),
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

const allInvalidLimits = {
  timeoutMs: 0,
  memoryBytes: -1,
  maxToolCalls: 0,
  maxTokens: -0.5,
  rateLimitPerMinute: -2.25,
};
const customPathVectors = [
  ["explicit default path preserves all five failures", "limits", allInvalidLimits],
  ["definition limits path preserves all five failures", "definition.limits", allInvalidLimits],
  ["empty path preserves all five failures", "", allInvalidLimits],
  ["custom path preserves absent optional limits", "definition.limits", baseline.limits],
  ...nonFiniteLimitVectors.map(([name, field, value], index) => [
    `custom path ${name}`,
    ["limits", "definition.limits", ""][index % 3],
    limitsWith(field, value),
  ]),
];

function customPathProbe(index, path, limits) {
  const expected = validateAgentLimits(limits, path);
  const checks = expected.map((diagnostic, diagnosticIndex) => `
  match diagnostics.get(${diagnosticIndex}) {
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
pure flow customPathProbe${index}(
  timeoutMs: Float64,
  memoryBytes: Float64,
  maxToolCalls: Float64,
  maxTokens: Float64,
  rateLimit: Float64,
) -> Bool
contract { intent { "Compare caller-selected agent-limit diagnostic paths with the retained TypeScript oracle." } }
{
  let limits: AgentLimits = AgentLimits {
    timeoutMs: timeoutMs,
    memoryBytes: memoryBytes,
    maxToolCalls: maxToolCalls,
    maxTokens: ${optional(limits.maxTokens, "maxTokens")},
    rateLimitPerMinute: ${optional(limits.rateLimitPerMinute, "rateLimit")}
  }
  let diagnostics: Array<AgentDiagnostic> = validateAgentLimitsAtPath(limits, ${str(path)})
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 01 agent-limits twin preserves caller-selected diagnostic paths in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-ai-agent/validate-agent-limits.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(
    twin + customPathVectors.map(([, path, limits], index) => customPathProbe(index, path, limits)).join("\n"),
    "agent-limits-custom-path-parity.fungi",
  );
  const errors = program.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], "candidate and custom-path probes parse/check");
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const strings = [...L.getInternedStrings()];
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  for (const entry of strings) host.seedString(entry.handle, entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  for (let index = 0; index < customPathVectors.length; index++) {
    const limits = customPathVectors[index][2];
    await t.test(customPathVectors[index][0], () => assert.equal(
      instance.exports[`customPathProbe${index}`](
        limits.timeoutMs,
        limits.memoryBytes,
        limits.maxToolCalls,
        limits.maxTokens ?? 0,
        limits.rateLimitPerMinute ?? 0,
      ),
      1,
    ));
  }
});

for (const target of ["definition", "limits"]) {
test(`Wave 01 ${target} twin preserves ordered diagnostics in WASM`, { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    `../../../packages/fungi/products/galerina/rd0873-ai-agent/validate-agent-${target}.fungi`, import.meta.url,
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
