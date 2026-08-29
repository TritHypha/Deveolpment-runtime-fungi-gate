import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GovernanceFlags,
  NodeFlags,
  checkEffects,
  computeRequirementValidatorCheckedFlowDigest,
  diffGovernance,
  parseProgram,
  verifyGovernance,
} from "../dist/index.js";

const SECURE_SOURCE = `@version 1
governed floor_3 secure flow transmit(payload: String) -> String
contract { effects { network.outbound } }
{
  return payload
}
`;

const LEGACY_SOURCE = SECURE_SOURCE.replace("floor_3 secure flow", "floor_3 flow");

function parseSingle(source, file) {
  const parsed = parseProgram(source, file);
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `unexpected parse errors: ${JSON.stringify(errors)}`);
  assert.equal(parsed.flows.length, 1, "fixture must contain exactly one FlowMeta");
  assert.ok(parsed.ast !== undefined, "fixture must produce a program AST");
  const flow = parsed.flows[0];
  const node = (parsed.ast.children ?? []).find((candidate) => candidate.kind === "governedFlowDecl");
  assert.ok(flow !== undefined, "fixture must expose its FlowMeta");
  assert.ok(node !== undefined, "fixture must expose its governedFlowDecl");
  return { parsed, flow, node };
}

function hasDiagnostic(results, code) {
  return results.flatMap((result) => result.diagnostics).some((diagnostic) => diagnostic.code === code);
}

describe("governed secure semantic parity", () => {
  it("reconstructs flagged governed secure as secure with a defined checked digest", () => {
    const { flow, node } = parseSingle(SECURE_SOURCE, "governed-secure.fungi");
    assert.equal(flow.qualifier, "secure");
    assert.notEqual((node.flags ?? NodeFlags.None) & NodeFlags.IsSecure, 0);
    assert.match(
      computeRequirementValidatorCheckedFlowDigest(flow, node) ?? "",
      /^sha256:[0-9a-f]{64}$/,
    );
  });

  it("preserves legacy governed flow as guarded with a defined checked digest", () => {
    const { flow, node } = parseSingle(LEGACY_SOURCE, "governed-legacy.fungi");
    assert.equal(flow.qualifier, "guarded");
    assert.equal((node.flags ?? NodeFlags.None) & NodeFlags.IsSecure, 0);
    assert.match(
      computeRequirementValidatorCheckedFlowDigest(flow, node) ?? "",
      /^sha256:[0-9a-f]{64}$/,
    );
  });

  it("refuses cleared IsSecure when secure FlowMeta is retained", () => {
    const { flow, node } = parseSingle(SECURE_SOURCE, "governed-secure-cleared.fungi");
    const cleared = { ...node, flags: (node.flags ?? NodeFlags.None) & ~NodeFlags.IsSecure };
    assert.equal(computeRequirementValidatorCheckedFlowDigest(flow, cleared), undefined);
  });

  it("refuses added IsSecure when guarded FlowMeta is retained", () => {
    const { flow, node } = parseSingle(LEGACY_SOURCE, "governed-legacy-flagged.fungi");
    const flagged = { ...node, flags: (node.flags ?? NodeFlags.None) | NodeFlags.IsSecure };
    assert.equal(computeRequirementValidatorCheckedFlowDigest(flow, flagged), undefined);
  });

  it("refuses malformed governed posture during checked-flow coherence", () => {
    const { flow, node } = parseSingle(SECURE_SOURCE, "governed-secure-malformed.fungi");
    assert.equal(
      computeRequirementValidatorCheckedFlowDigest(flow, { ...node, value: "governed:floor_3:" }),
      undefined,
    );
  });

  it("refuses contradictory governed posture flags during checked-flow coherence", () => {
    const { flow, node } = parseSingle(SECURE_SOURCE, "governed-secure-contradictory.fungi");
    const contradictory = {
      ...node,
      flags: (node.flags ?? NodeFlags.None) | NodeFlags.IsPure | NodeFlags.IsSecure,
    };
    assert.equal(computeRequirementValidatorCheckedFlowDigest(flow, contradictory), undefined);
  });

  it("applies the secure tier floor only to legacy governed metadata", () => {
    const secure = parseSingle(SECURE_SOURCE, "governed-secure-tier.fungi");
    const legacy = parseSingle(LEGACY_SOURCE, "governed-legacy-tier.fungi");
    const secureEffects = checkEffects(secure.parsed.flows, secure.parsed.ast, "production", true);
    const legacyEffects = checkEffects(legacy.parsed.flows, legacy.parsed.ast, "production", true);
    assert.equal(hasDiagnostic(secureEffects, "FUNGI-TIER-001"), false);
    assert.equal(hasDiagnostic(legacyEffects, "FUNGI-TIER-001"), true);
  });

  it("sets RequiresIntent only for governed secure metadata", () => {
    const secure = parseSingle(SECURE_SOURCE, "governed-secure-intent.fungi");
    const legacy = parseSingle(LEGACY_SOURCE, "governed-legacy-intent.fungi");
    const secureEffects = checkEffects(secure.parsed.flows, secure.parsed.ast);
    const legacyEffects = checkEffects(legacy.parsed.flows, legacy.parsed.ast);
    const secureResult = verifyGovernance(secure.parsed.ast, secure.parsed.flows, secureEffects);
    const legacyResult = verifyGovernance(legacy.parsed.ast, legacy.parsed.flows, legacyEffects);
    const secureFlags = secureResult.governanceFlagsByFlow.get("transmit") ?? GovernanceFlags.None;
    const legacyFlags = legacyResult.governanceFlagsByFlow.get("transmit") ?? GovernanceFlags.None;
    assert.notEqual(secureFlags & GovernanceFlags.RequiresIntent, 0);
    assert.equal(legacyFlags & GovernanceFlags.RequiresIntent, 0);
  });

  it("classifies legacy-to-flagged governed posture as widening authority", () => {
    const secure = parseSingle(SECURE_SOURCE, "governed-secure-diff.fungi");
    const legacy = parseSingle(LEGACY_SOURCE, "governed-legacy-diff.fungi");
    const result = diffGovernance(legacy.parsed.flows, secure.parsed.flows);
    assert.equal(result.widensAuthority, true);
    assert.equal(result.changeClass, "expansion");
    assert.equal(result.changed.length, 1);
    assert.equal(result.changed[0]?.qualifierBefore, "guarded");
    assert.equal(result.changed[0]?.qualifierAfter, "secure");
    assert.equal(result.changed[0]?.widensAuthority, true);
  });
});
