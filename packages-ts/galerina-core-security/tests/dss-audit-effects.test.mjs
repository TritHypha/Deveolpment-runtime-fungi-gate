import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  checkEffects,
  parseProgram,
} from "../../galerina-core-compiler/dist/index.js";

const SOURCE_PATHS = Object.freeze({
  supervisor: "src/dss/dss-supervisor.fungi",
  allocator: "src/dss/dwi-allocator.fungi",
  receipt: "src/dss/epilogue-receipt.fungi",
  trapHandler: "src/dss/trap-handler.fungi",
});

function readSource(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8")
    .replaceAll("\r\n", "\n");
}

const SOURCES = Object.freeze(Object.fromEntries(
  Object.entries(SOURCE_PATHS).map(([name, relativePath]) => [name, readSource(relativePath)]),
));

function parse(source, relativePath) {
  const file = `packages-ts/galerina-core-security/${relativePath}`;
  const parsed = parseProgram(source, file);
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `fixture must parse cleanly: ${JSON.stringify(errors)}`);
  return parsed;
}

function checkOne(source, relativePath) {
  const parsed = parse(source, relativePath);
  return checkEffects(parsed.flows, parsed.ast, "production", true);
}

function checkCombined(entries) {
  const parsed = entries.map(([source, relativePath]) => parse(source, relativePath));
  const [first] = parsed;
  assert.ok(first !== undefined, "combined effect check requires at least one source");
  const ast = {
    ...first.ast,
    children: parsed.flatMap((candidate) => candidate.ast.children),
  };
  const flows = parsed.flatMap((candidate) => candidate.flows);
  return checkEffects(flows, ast, "production", true);
}

function diagnostics(results) {
  return results.flatMap((result) => result.diagnostics);
}

function diagnosticCodes(results) {
  return diagnostics(results).map((diagnostic) => diagnostic.code);
}

function flowMeta(source, relativePath, name) {
  const meta = parse(source, relativePath).flows.find((flow) => flow.name === name);
  assert.ok(meta !== undefined, `${name} FlowMeta must exist`);
  return meta;
}

function assertOrdered(source, values) {
  let previous = -1;
  for (const value of values) {
    const current = source.indexOf(value, previous + 1);
    assert.ok(current > previous, `${JSON.stringify(value)} must retain source order`);
    previous = current;
  }
}

describe("DSS audit effect contracts", () => {
  it("removes every spurious allow token from the four DSS sources", () => {
    for (const [name, source] of Object.entries(SOURCES)) {
      assert.doesNotMatch(source, /(^|[^A-Za-z0-9_])allow([^A-Za-z0-9_]|$)/u, name);
    }
  });

  it("keeps bootstrap, allocation, and receipt generation effect-free", () => {
    for (const [sourceName, flowName] of [
      ["supervisor", "bootstrapDSS"],
      ["allocator", "allocateDWI"],
      ["receipt", "generateReceipt"],
    ]) {
      const meta = flowMeta(SOURCES[sourceName], SOURCE_PATHS[sourceName], flowName);
      assert.deepEqual(meta.declaredEffects, [], `${flowName} must declare effects {}`);
    }

    assert.deepEqual(diagnostics(checkOne(SOURCES.allocator, SOURCE_PATHS.allocator)), []);
    assert.deepEqual(diagnostics(checkOne(SOURCES.receipt, SOURCE_PATHS.receipt)), []);
  });

  it("states truthfully that allocation emits no audit event", () => {
    assert.doesNotMatch(SOURCES.allocator, /AuditEvent emitted/u);
    assert.match(SOURCES.allocator, /does not emit an AuditEvent/u);
  });

  it("binds generatedAt once and reuses the same local for receipt identity and data", () => {
    const binding = 'let generatedAt = "now"';
    const bindingIndex = SOURCES.receipt.indexOf(binding);
    const receiptIdIndex = SOURCES.receipt.indexOf("receiptId:", bindingIndex);

    assert.ok(bindingIndex >= 0, "generateReceipt must capture generatedAt once");
    assert.ok(bindingIndex < receiptIdIndex, "generatedAt must be bound before receiptId");
    assert.match(SOURCES.receipt, /receiptId:\s+flowId \+ ":" \+ generatedAt/u);
    assert.match(SOURCES.receipt, /generatedAt:\s+generatedAt/u);
    assert.equal((SOURCES.receipt.match(/"now"/gu) ?? []).length, 1);
  });

  for (const flowName of ["handleTrap", "handlePluginEviction"]) {
    it(`${flowName} is governed-secure and writes its event exactly once immediately before return`, () => {
      const meta = flowMeta(SOURCES.trapHandler, SOURCE_PATHS.trapHandler, flowName);
      assert.equal(meta.qualifier, "secure");
      assert.deepEqual(meta.declaredEffects, ["audit.write"]);

      const writes = SOURCES.trapHandler.match(/\bAuditLog\.write\(event\)/gu) ?? [];
      assert.equal(writes.length, 2, "the two handlers must own one direct write each");

      const flowStart = SOURCES.trapHandler.indexOf(`flow ${flowName}`);
      const nextFlow = SOURCES.trapHandler.indexOf("\ngoverned ", flowStart + 1);
      const body = SOURCES.trapHandler.slice(flowStart, nextFlow < 0 ? undefined : nextFlow);
      assert.equal((body.match(/\bAuditLog\.write\(event\)/gu) ?? []).length, 1);
      assert.match(body, /AuditLog\.write\(event\)\s*\n\s*return event/u);
    });
  }

  it("routeTrapSignal declares the inherited audit effect without duplicating the handler write", () => {
    const meta = flowMeta(SOURCES.supervisor, SOURCE_PATHS.supervisor, "routeTrapSignal");
    assert.equal(meta.qualifier, "secure");
    assert.deepEqual(meta.declaredEffects, ["audit.write"]);
    assert.equal((SOURCES.supervisor.match(/\bhandleTrap\(signal\)/gu) ?? []).length, 1);
    assert.equal((SOURCES.supervisor.match(/\bAuditLog\.write\(/gu) ?? []).length, 0);

    const results = checkCombined([
      [SOURCES.trapHandler, SOURCE_PATHS.trapHandler],
      [SOURCES.supervisor, SOURCE_PATHS.supervisor],
    ]);
    assert.deepEqual(diagnostics(results), []);
  });

  it("preserves both DSS event codes and their ordered fields", () => {
    assertOrdered(SOURCES.trapHandler, [
      'code:           "FUNGI-INV-000"',
      "flowId:         signal.flowId",
      "contractHash:   signal.contractHash",
      "meterSnapshot:  signal.meterSnapshot",
      "trapKind:       signal.trapKind",
      "vdpmAtTrap:     signal.vdpmSnapshot",
      "rollbackStatus: ROLLBACK_ALWAYS_CLEAN",
      "timestamp:      signal.timestamp",
    ]);
    assertOrdered(SOURCES.trapHandler, [
      'code:           "FUNGI-PLUGIN-001"',
      'flowId:         "Tower.evict"',
      "contractHash:   signal.pluginAlias",
      "meterSnapshot:  0",
      "trapKind:       TRAP_KIND_PLUGIN",
      "vdpmAtTrap:     0",
      "rollbackStatus: ROLLBACK_ALWAYS_CLEAN",
      "timestamp:      signal.reason",
    ]);
  });

  it("controlled mutant: removing a handler write emits FUNGI-AUDIT-001", () => {
    const mutated = SOURCES.trapHandler.replace(
      "  AuditLog.write(event)\n  return event",
      "  return event",
    );
    assert.notEqual(mutated, SOURCES.trapHandler, "mutation must remove one handler write");
    assert.ok(diagnosticCodes(checkOne(mutated, SOURCE_PATHS.trapHandler)).includes("FUNGI-AUDIT-001"));
  });

  it("controlled mutant: removing routeTrapSignal audit declaration emits FUNGI-EFFECT-002", () => {
    const mutated = SOURCES.supervisor.replace(
      "  effects { audit.write }\n  invariant {",
      "  effects {}\n  invariant {",
    );
    assert.notEqual(mutated, SOURCES.supervisor, "mutation must remove the route declaration");
    const results = checkCombined([
      [SOURCES.trapHandler, SOURCE_PATHS.trapHandler],
      [mutated, SOURCE_PATHS.supervisor],
    ]);
    assert.ok(diagnosticCodes(results).includes("FUNGI-EFFECT-002"));
  });

  it("controlled mutant: downgrading an effectful handler emits FUNGI-TIER-001", () => {
    const mutated = SOURCES.trapHandler.replace(
      "governed floor_2 secure flow handleTrap",
      "governed floor_2 flow handleTrap",
    );
    assert.notEqual(mutated, SOURCES.trapHandler, "mutation must downgrade handleTrap");
    assert.ok(diagnosticCodes(checkOne(mutated, SOURCE_PATHS.trapHandler)).includes("FUNGI-TIER-001"));
  });
});
