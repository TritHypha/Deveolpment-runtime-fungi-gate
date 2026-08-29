import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import {
  NodeFlags,
  buildAiGraph,
  buildExecutionPlan,
  buildWATModuleFromGIR,
  checkEffects,
  emitGIR,
  parseProgram,
} from "../dist/index.js";
import {
  canonicalJson,
  generateManifest,
  manifestSigningInput,
} from "../dist/manifest-generator.js";

const FIXED_TIME = "2026-08-29T00:00:00.000Z";
const SOURCE_FILE = "secure-artifact.fungi";
const SECURE_SOURCE = `governed floor_3 secure flow secureArtifact(payload: String) -> String
contract {
  intent "secure artifact"
  effects { network.outbound secret.read }
  resilience { on_timeout_fault quarantine }
  secrets {
    credential api { provider vault }
    rotation { interval 1h on_rotation_fault halt }
  }
}
{
  let token: protected String = payload
  compute target best { prefer [npu, gpu, cpu] fallback cpu }
  emit ArtifactReady
  let routed: String = helperArtifact(payload)
  return routed
}
pure flow helperArtifact(value: String) -> String
contract { intent "artifact helper" effects {} }
{ return value }
`;
const EFFECT_FREE_SOURCE = `governed floor_3 secure flow effectFree(payload: String) -> String
contract { intent "secure without effects" effects {} }
{ return payload }
`;
const LEGACY_SOURCE = `governed floor_3 flow legacyArtifact(input: String) -> String
contract { intent "legacy artifact" effects {} }
{ return input }
`;

function parseFixture(source, file = SOURCE_FILE, expectedFlowCount = 1) {
  const parsed = parseProgram(source, file);
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `fixture must parse cleanly: ${JSON.stringify(errors)}`);
  assert.equal(parsed.flows.length, expectedFlowCount, "fixture flow count must stay intentional");
  return parsed;
}

function emitFixture(source, file = SOURCE_FILE, expectedFlowCount = 1) {
  const parsed = parseFixture(source, file, expectedFlowCount);
  const effects = checkEffects(parsed.flows, parsed.ast);
  const emitted = emitGIR(parsed.ast, parsed.flows, effects);
  assert.equal(emitted.diagnostics.length, 0);
  return { parsed, gir: emitted.gir };
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function artifactBytes(value) {
  return JSON.stringify(value, (_key, item) => item instanceof Map ? Object.fromEntries(item) : item);
}

function withFixedTime(run) {
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(FIXED_TIME);
      else super(...args);
    }

    static now() {
      return new RealDate(FIXED_TIME).getTime();
    }
  };
  try {
    return run();
  } finally {
    globalThis.Date = RealDate;
  }
}

function manifestBody(manifest) {
  const { governanceSignature: _signature, ...body } = manifest;
  return body;
}

describe("flagged governed-secure artifact resolution", () => {
  it("emits governed-secure GIR metadata retained by the current AST shape", () => {
    const { gir } = emitFixture(SECURE_SOURCE, SOURCE_FILE, 2);
    const flow = gir.flows[0];

    assert.equal(flow.qualifier, "secure");
    assert.deepEqual(flow.paramTypes, ["String"]);
    assert.deepEqual(flow.effects.declared, ["network.outbound", "secret.read"]);
    assert.deepEqual(flow.intent, { declared: "secure artifact", status: "satisfied" });
    assert.deepEqual(flow.protected_values, [{ name: "token", type: "String" }]);
    assert.deepEqual(flow.audit, { protected_values_redacted: false });
    // Compute-block preferences are currently collapsed by the parser; bind
    // only the honest default execution shape instead of claiming retention.
    assert.deepEqual(flow.execution, { preferred: ["cpu"], denied: [], fallback: null });
    assert.deepEqual(flow.faultHandlers, [
      { signal: "on_timeout_fault", action: "quarantine", source: "declared" },
      { signal: "on_rotation_fault", action: "halt", source: "inferred-default" },
      { signal: "on_denial_fault", action: "halt", source: "inferred-default" },
      { signal: "on_substrate_fault", action: "halt", source: "inferred-default" },
    ]);
    assert.ok(flow.proofs.some((proof) => proof.name === "intent_matches_behavior"));
    assert.ok(flow.proofs.some((proof) => proof.name === "protected_values_redacted" && proof.status === "missing"));
    assert.deepEqual(flow.contract, {
      hasIntent: true,
      hasPrivacy: false,
      hasAuditRequirements: false,
      hasSensitivityQualifiers: false,
      effectCount: 0,
    });
  });

  it("emits AI metadata from the same decoded governed-secure AST node", () => {
    const { parsed } = emitFixture(SECURE_SOURCE, SOURCE_FILE, 2);
    const graph = withFixedTime(() => buildAiGraph(parsed.ast, parsed.flows, SOURCE_FILE));
    const flow = graph.flows[0];

    assert.equal(flow.qualifier, "secure");
    assert.equal(flow.intent, "secure artifact");
    assert.deepEqual(flow.parameters, [{ name: "payload", type: "String", isReadonly: false }]);
    assert.deepEqual(flow.effects, ["network.outbound", "secret.read"]);
    assert.deepEqual(flow.capabilities, ["host.network.outbound"]);
    assert.deepEqual(flow.calls, ["helperArtifact"]);
    assert.deepEqual(flow.events, [{ kind: "emits", name: "ArtifactReady" }]);
    assert.deepEqual(flow.contract, {
      effects: [],
      privacy: [],
      audit: [],
      rules: [],
      errors: [],
      context: [],
      timeouts: "",
      retries: "",
      limits: [],
    });
  });

  it("preserves ordinary bare-name lookup precedence over a governed-secure duplicate", () => {
    const source = `secure flow duplicate(value: String) -> String
intent "ordinary authority"
{ return value }
governed floor_3 secure flow duplicate(value: String) -> String
intent "governed authority"
{ return value }
`;
    const parsed = parseProgram(source, "duplicate.fungi");
    const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
    assert.deepEqual(errors, []);
    const ordinaryMeta = parsed.flows[0];
    const emitted = emitGIR(parsed.ast, [ordinaryMeta], checkEffects([ordinaryMeta], parsed.ast));

    assert.equal(emitted.gir.flows[0].intent.declared, "ordinary authority");
    assert.equal(buildAiGraph(parsed.ast, [ordinaryMeta]).flows[0].intent, "ordinary authority");
  });

  it("keeps execution-plan lookup closed to governed-secure artifacts", () => {
    const parsed = parseFixture(SECURE_SOURCE, SOURCE_FILE, 2);
    assert.throws(
      () => buildExecutionPlan(parsed.ast, parsed.flows[0]),
      /buildExecutionPlan: flow 'secureArtifact' not found in AST/,
    );
  });

  it("keeps effect-free governed-secure WAT non-pure, unreachable, and unexported", () => {
    const { parsed, gir } = emitFixture(EFFECT_FREE_SOURCE, "effect-free.fungi");
    const wat = buildWATModuleFromGIR(gir, new Map(), "wasm-standalone", parsed.ast, true);
    const fn = wat.functions.find((candidate) => candidate.name === "effectFree");

    assert.ok(fn !== undefined);
    assert.equal(fn.isPure, false);
    assert.equal(fn.body, "unreachable");
    assert.equal(fn.isEntryPoint, false);
    assert.equal(wat.exports.some((entry) => entry.name === "effectFree"), false);
  });
});

describe("governed-secure manifest artifacts", () => {
  it("uses only existing manifest keys while binding secure proof, fingerprint, and rotation", () => {
    const parsed = parseFixture(SECURE_SOURCE, SOURCE_FILE, 2);
    const manifest = generateManifest(
      SECURE_SOURCE,
      SOURCE_FILE,
      parsed.flows,
      undefined,
      FIXED_TIME,
      parsed.ast,
      SECURE_SOURCE,
    );

    assert.deepEqual(Object.keys(manifest).sort(), [
      "behavioralFingerprint",
      "compilerVersion",
      "derivedConstraints",
      "flowCount",
      "generatedAt",
      "governanceSignature",
      "policyResolutionDag",
      "productArtifactKey",
      "productIdentity",
      "proofObligations",
      "schemaVersion",
      "sourceFile",
      "sourceHash",
    ]);
    assert.ok(manifest.proofObligations.some((obligation) =>
      obligation.flowName === "secureArtifact" &&
      obligation.kind === "effect-safety" &&
      obligation.description.startsWith("secure flow declares effects"),
    ));
    assert.equal(
      manifest.behavioralFingerprint,
      "sha256:3ee2f2c8cb86f1f048278c09e1952e7faebb5edc4760d03fb737e0304d0e27b5",
    );
    assert.deepEqual(
      manifest.proofObligations.filter((obligation) => obligation.kind === "secret-rotation"),
      [{
        flowName: "secureArtifact",
        kind: "secret-rotation",
        description: "api rotates every 1h; on_rotation_fault=halt",
        verified: "runtime-precheck",
      }],
    );
    const body = manifestBody(manifest);
    const expectedBodyHash = sha256(canonicalJson(body));
    assert.equal(manifest.governanceSignature.ed25519, `placeholder:sha256:${expectedBodyHash}`);
    assert.equal(manifest.governanceSignature.mlDsa65, `placeholder:sha256:${expectedBodyHash}`);
  });

  it("does not promote legacy or malformed governed nodes into rotation authority", () => {
    const legacySource = SECURE_SOURCE.replace("floor_3 secure flow", "floor_3 flow");
    const legacy = parseFixture(legacySource, SOURCE_FILE, 2);
    const legacyManifest = generateManifest(
      legacySource,
      SOURCE_FILE,
      legacy.flows,
      undefined,
      FIXED_TIME,
      legacy.ast,
      legacySource,
    );
    assert.equal(legacyManifest.proofObligations.some((obligation) => obligation.kind === "secret-rotation"), false);

    const secure = parseFixture(SECURE_SOURCE, SOURCE_FILE, 2);
    const governedNode = secure.ast.children[0];
    const malformedAst = {
      ...secure.ast,
      children: [{
        ...governedNode,
        value: "governed:floor_3:",
        flags: (governedNode.flags ?? NodeFlags.None) | NodeFlags.IsSecure,
      }],
    };
    const malformedManifest = generateManifest(
      SECURE_SOURCE,
      SOURCE_FILE,
      secure.flows,
      undefined,
      FIXED_TIME,
      malformedAst,
      SECURE_SOURCE,
    );
    assert.equal(malformedManifest.proofObligations.some((obligation) => obligation.kind === "secret-rotation"), false);
  });

  for (const floor of ["floor_5", "execution", "floor_unknown"]) {
    it(`does not promote flagged governed ${floor} into GIR, AI, or signed rotation authority`, () => {
      const parsed = parseFixture(SECURE_SOURCE, SOURCE_FILE, 2);
      const governedNode = parsed.ast.children[0];
      const adversarialAst = {
        ...parsed.ast,
        children: [{
          ...governedNode,
          value: `governed:${floor}:secureArtifact`,
          flags: (governedNode.flags ?? NodeFlags.None) | NodeFlags.IsSecure,
        }, ...parsed.ast.children.slice(1)],
      };
      const effects = checkEffects(parsed.flows, adversarialAst);
      const gir = emitGIR(adversarialAst, parsed.flows, effects).gir.flows[0];
      const ai = withFixedTime(() => buildAiGraph(adversarialAst, parsed.flows, SOURCE_FILE)).flows[0];
      const manifest = generateManifest(
        SECURE_SOURCE,
        SOURCE_FILE,
        parsed.flows,
        undefined,
        FIXED_TIME,
        adversarialAst,
        SECURE_SOURCE,
      );

      assert.equal(gir.paramTypes, undefined);
      assert.deepEqual(gir.intent, { declared: null, status: null });
      assert.deepEqual(gir.protected_values, []);
      assert.equal(gir.contract, undefined);
      assert.equal(ai.intent, undefined);
      assert.deepEqual(ai.calls, []);
      assert.deepEqual(ai.events, []);
      assert.equal(ai.contract, undefined);
      assert.equal(
        manifest.proofObligations.some((obligation) => obligation.kind === "secret-rotation"),
        false,
      );
    });
  }
});

describe("legacy artifact byte stability", () => {
  it("preserves fixed-time legacy governed GIR and AI bytes", () => {
    const { parsed, gir } = withFixedTime(() => emitFixture(LEGACY_SOURCE, "legacy-artifact.fungi"));
    const ai = withFixedTime(() => buildAiGraph(parsed.ast, parsed.flows, "legacy-artifact.fungi"));
    const girBytes = artifactBytes(gir);
    const aiBytes = artifactBytes(ai);

    assert.equal(Buffer.byteLength(girBytes), 573);
    assert.equal(sha256(girBytes), "5917ea6a7574af078cbec10a3efa948d7329547826c4f56ebdf34507f4694733");
    assert.equal(Buffer.byteLength(aiBytes), 434);
    assert.equal(sha256(aiBytes), "9e5480cdcfa44d8001b0ed4603a109211951e19dc52bff2a5499bdd11341dc9f");
  });

  it("preserves the canonical legacy manifest body, body hash, and signature preimage", () => {
    const parsed = parseFixture(LEGACY_SOURCE, "legacy-artifact.fungi");
    const manifest = generateManifest(
      LEGACY_SOURCE,
      "legacy-artifact.fungi",
      parsed.flows,
      undefined,
      FIXED_TIME,
      parsed.ast,
      LEGACY_SOURCE,
    );
    const body = manifestBody(manifest);
    const canonicalBody = canonicalJson(body);
    const signingInput = manifestSigningInput(body, "jcs");

    assert.equal(Buffer.byteLength(canonicalBody), 1042);
    assert.equal(sha256(canonicalBody), "bd1111a17438a76b848f3150984ea4d7a38e3a85516c07b088c9c106fe827725");
    assert.equal(signingInput, canonicalBody);
    assert.equal(Buffer.byteLength(signingInput), 1042);
    assert.equal(sha256(signingInput), "bd1111a17438a76b848f3150984ea4d7a38e3a85516c07b088c9c106fe827725");
    assert.equal(
      manifest.governanceSignature.ed25519,
      "placeholder:sha256:bd1111a17438a76b848f3150984ea4d7a38e3a85516c07b088c9c106fe827725",
    );
  });
});
