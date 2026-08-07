// gate-admission-envelope.test.mjs — G7.2b: the composed path, per-run keys.
//
// Keys are GENERATED PER RUN (owner ruling 3): no key material of any kind in
// the repository. The fixture mirrors the evidence lib's own test helpers so
// this suite exercises the same delegation → envelope → statement chain the
// release path uses, with the admission role in the delegation.
//
// The load-bearing case is UNKNOWN SUITE — the sixth ratified exit criterion —
// proven through the composed path with NO new refusal code: the envelope
// layer's catalogue check refuses it before any admission logic runs.
import assert from "node:assert/strict";
import {
  createPublicKey,
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign as signEd25519,
} from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  RELEASE_EVIDENCE_ROLE,
  canonicalReleaseEvidenceBytes,
  releaseEvidenceCryptoSuiteCatalog,
  releaseEvidenceDelegationPreimage,
  releaseEvidenceStatementPreimage,
  verifyReleaseEvidenceDelegation,
} from "../lib/beta-release-evidence-envelope.mjs";
import { issueGateAdmissionEnvelope, verifyGateAdmissionEnvelope } from "../lib/gate-admission-envelope.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(compilerRequire.resolve("@noble/post-quantum/ml-dsa.js")).href
);
const compiler = await import(
  pathToFileURL(join(ROOT, "packages-galerina", "galerina-core-compiler", "dist", "index.js")).href
);

const AT = "2026-08-07T12:00:00.000Z";
const SIG_CONTEXT = "galerina.release.evidence.gate-admission.sig.v1";

// ── per-run hybrid keys (never persisted) ────────────────────────────────────
function hybridKey(keyId) {
  const ed = generateKeyPairSync("ed25519");
  const ml = mlDsa65.keygen(randomBytes(32));
  return {
    keyId,
    edPrivate: ed.privateKey,
    edPublicPem: ed.publicKey.export({ type: "spki", format: "pem" }).toString(),
    mlPrivate: ml.secretKey,
    mlPublic: ml.publicKey,
  };
}
const sha256Of = (bytes) => createHash("sha256").update(bytes).digest("hex");
const signHybrid = (message, key, context) => ({
  ed25519Signature: signEd25519(null, Buffer.from(message), key.edPrivate).toString("base64"),
  mlDsa65Signature: Buffer.from(
    mlDsa65.sign(message, key.mlPrivate, { context: new TextEncoder().encode(context) }),
  ).toString("base64"),
});

// ── a real admission statement from the production pipeline ──────────────────
const REGISTRY_VALUE = {
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "c.echo", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "subject", type: "T" }],
    outputs: [{ name: "value", type: "T" }],
    arguments: [], effects: [], capabilities: [],
  }],
};
const SOURCE = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "admission envelope probe"
  REQUIRES:
  PARTS:
    [a :: c.echo@1.0.0]
  WIRES:
    IN.v -> a.subject
    a.value -> OUT.value
END
`;

function admissionInputs(source) {
  const parsed = compiler.parseGateV3(source, "<env>.gate");
  const loaded = compiler.loadGateV3Registry(REGISTRY_VALUE, "<env registry>");
  assert.equal(parsed.ok && loaded.ok, true);
  const graph = compiler.buildGateGraph(parsed.circuit, loaded.registry);
  const errors = compiler.dispatchGateSource(source, "<env>.gate", { registry: REGISTRY_VALUE })
    .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002");
  return {
    sourceBytes: new TextEncoder().encode(source),
    registry: loaded.registry,
    registryCanonicalForm: REGISTRY_VALUE,
    circuit: parsed.circuit,
    circuitCanonicalForm: compiler.lowerCircuitToGIR(parsed.circuit, loaded.registry),
    verifier: { version: "test-0.0.0", ruleSet: "gate-v3-codes@test" },
    proofs: compiler.circuitProofs(parsed.circuit, graph, loaded.registry),
    verificationErrorCount: errors.length,
    target: "wasm32-test",
  };
}
const inHandOf = (i) => ({
  sourceBytes: i.sourceBytes,
  registryCanonicalForm: i.registryCanonicalForm,
  circuitCanonicalForm: i.circuitCanonicalForm,
  proofs: i.proofs,
  target: i.target,
});

// ── delegation + envelope fixture, admission role delegated ──────────────────
function fixture({ roles = [RELEASE_EVIDENCE_ROLE.DURABILITY, RELEASE_EVIDENCE_ROLE.GATE_ADMISSION, RELEASE_EVIDENCE_ROLE.REPOSITORY] } = {}) {
  const root = hybridKey("3333333333333333");
  const operational = hybridKey("4444444444444444");
  const delegationBase = {
    schema: "galerina.release-evidence.delegation.v1",
    releaseId: "beta-v1",
    serial: 2,
    issuedAt: "2026-08-07T10:00:00.000Z",
    notBefore: "2026-08-07T10:00:00.000Z",
    notAfter: "2026-08-08T10:00:00.000Z",
    rootKeyId: root.keyId,
    operational: {
      keyId: operational.keyId,
      ed25519Sha256: sha256Of(createPublicKey(operational.edPublicPem).export({ type: "spki", format: "der" })),
      mlDsa65Sha256: sha256Of(operational.mlPublic),
      roles,
    },
  };
  const delegation = {
    ...delegationBase,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: "galerina.release.evidence.delegation.sig.v1",
      keyId: root.keyId,
      ...signHybrid(releaseEvidenceDelegationPreimage(delegationBase), root, "galerina.release.evidence.delegation.sig.v1"),
    },
  };
  return { root, operational, delegation };
}

function envelopeFor(statement, operational) {
  return {
    schema: "galerina.release-evidence.envelope.v1",
    statement,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: SIG_CONTEXT,
      keyId: operational.keyId,
      ...signHybrid(
        releaseEvidenceStatementPreimage(statement, RELEASE_EVIDENCE_ROLE.GATE_ADMISSION),
        operational,
        SIG_CONTEXT,
      ),
    },
  };
}

function verifiedOptions(f) {
  const delegation = verifyReleaseEvidenceDelegation(f.delegation, {
    releaseId: "beta-v1",
    expectedRootKeyId: f.root.keyId,
    minimumSerial: 1,
    at: AT,
    rootPublicBundle: { keyId: f.root.keyId, ed25519PublicKeyPem: f.root.edPublicPem, mlDsa65PublicKey: f.root.mlPublic },
    operationalPublicBundle: { keyId: f.operational.keyId, ed25519PublicKeyPem: f.operational.edPublicPem, mlDsa65PublicKey: f.operational.mlPublic },
    isRevoked: () => false,
  });
  return {
    delegation,
    at: AT,
    operationalPublicBundle: { keyId: f.operational.keyId, ed25519PublicKeyPem: f.operational.edPublicPem, mlDsa65PublicKey: f.operational.mlPublic },
    isRevoked: () => false,
  };
}

function admittedEnvelope() {
  const input = admissionInputs(SOURCE);
  const built = compiler.buildAdmissionStatement(input, { canonicalBytes: canonicalReleaseEvidenceBytes });
  assert.equal(built.ok, true);
  const f = fixture();
  return { f, input, envelope: envelopeFor(built.statement, f.operational) };
}

// ── the KATs ─────────────────────────────────────────────────────────────────

test("composed: a signed admission envelope verifies against the artifacts in hand — the master control", () => {
  const { f, input, envelope } = admittedEnvelope();
  const r = verifyGateAdmissionEnvelope(envelope, verifiedOptions(f), inHandOf(input));
  assert.deepEqual([...r.refusals], []);
  assert.equal(r.ok, true);
  assert.equal(r.statement.kind, "gate-v3-admission.v1");
});

test("composed: UNKNOWN SUITE refuses through the envelope layer's catalogue — the sixth exit criterion, no new code", () => {
  const { f, input, envelope } = admittedEnvelope();
  const bogus = { ...envelope, signature: { ...envelope.signature, algorithm: "hybrid-ed25519-mldsa99" } };
  const r = verifyGateAdmissionEnvelope(bogus, verifiedOptions(f), inHandOf(input));
  assert.equal(r.ok, false);
  assert.deepEqual([...r.refusals], ["RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED"]);
  assert.equal(r.statement, null, "an unverified statement is never returned");
});

test("composed: a delegation WITHOUT the admission role cannot admit, whatever it signs", () => {
  const input = admissionInputs(SOURCE);
  const built = compiler.buildAdmissionStatement(input, { canonicalBytes: canonicalReleaseEvidenceBytes });
  const f = fixture({ roles: [RELEASE_EVIDENCE_ROLE.DURABILITY, RELEASE_EVIDENCE_ROLE.REPOSITORY] });
  const r = verifyGateAdmissionEnvelope(envelopeFor(built.statement, f.operational), verifiedOptions(f), inHandOf(input));
  assert.equal(r.ok, false);
  assert.deepEqual([...r.refusals], ["RELEASE_EVIDENCE_ENVELOPE_POLICY_REFUSED"]);
});

test("composed: a statement mutated AFTER signing refuses at the signature, before any binding check", () => {
  const { f, input, envelope } = admittedEnvelope();
  const tampered = { ...envelope, statement: { ...envelope.statement, target: "wasm32-other" } };
  const r = verifyGateAdmissionEnvelope(tampered, verifiedOptions(f), inHandOf(input));
  assert.equal(r.ok, false);
  assert.deepEqual([...r.refusals], ["RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED"]);
});

test("composed: SUBSTITUTION — a correctly SIGNED envelope for a different circuit refuses on the binding, distinctly", () => {
  const { f, envelope } = admittedEnvelope();
  const otherInput = admissionInputs(SOURCE.replace("CIRCUIT probe(", "CIRCUIT other("));
  const r = verifyGateAdmissionEnvelope(envelope, verifiedOptions(f), inHandOf(otherInput));
  assert.equal(r.ok, false);
  assert.equal(r.refusals.includes("GATE-ADMIT-009"), true, "substitution named distinctly");
  assert.equal(r.refusals.includes("GATE-ADMIT-005"), true, "the source moved too, and both report (§8.1 rule 1)");
  assert.equal(r.refusals.some((c) => c.startsWith("RELEASE_EVIDENCE")), false, "the signature was GENUINE — that is the attack");
});

// ── G7.3 — issuance behind the suite catalogue ───────────────────────────────

/** A counting signer over per-run keys: the count proves a refusal signed NOTHING. */
function signerFor(operational) {
  const calls = { count: 0 };
  return {
    calls,
    keyId: operational.keyId,
    signEd25519: (preimage) => {
      calls.count += 1;
      return signEd25519(null, Buffer.from(preimage), operational.edPrivate).toString("base64");
    },
    signMlDsa65: (preimage, context) => {
      calls.count += 1;
      return Buffer.from(
        mlDsa65.sign(preimage, operational.mlPrivate, { context: new TextEncoder().encode(context) }),
      ).toString("base64");
    },
  };
}

test("issue: an issued envelope round-trips through the composed verifier — issuance and verification agree", () => {
  const input = admissionInputs(SOURCE);
  const built = compiler.buildAdmissionStatement(input, { canonicalBytes: canonicalReleaseEvidenceBytes });
  const f = fixture();
  const issued = issueGateAdmissionEnvelope(built.statement, signerFor(f.operational));
  assert.equal(issued.ok, true);
  const r = verifyGateAdmissionEnvelope(issued.envelope, verifiedOptions(f), inHandOf(input));
  assert.deepEqual([...r.refusals], []);
  assert.equal(r.ok, true);
});

test("issue: an UNKNOWN suite refuses at issuance and the signer is never invoked", () => {
  const input = admissionInputs(SOURCE);
  const built = compiler.buildAdmissionStatement(input, { canonicalBytes: canonicalReleaseEvidenceBytes });
  const f = fixture();
  const signer = signerFor(f.operational);
  const issued = issueGateAdmissionEnvelope(built.statement, signer, { suiteId: "hybrid-ed25519-mldsa99" });
  assert.equal(issued.ok, false);
  assert.deepEqual([...issued.refusals], ["GATE_ADMISSION_ISSUE_SUITE_REFUSED"]);
  assert.equal(issued.envelope, null);
  assert.equal(signer.calls.count, 0, "a refusal signs NOTHING");
});

test("issue: a REFUSED-verdict statement is not issuable — the refusal is authoritative unsigned", () => {
  const badRegistry = structuredClone(REGISTRY_VALUE);
  badRegistry.types.push({ id: "U", kind: "opaque", construction: "source" });
  badRegistry.components[0].outputs[0].type = "U";
  const parsed = compiler.parseGateV3(SOURCE, "<env>.gate");
  const loaded = compiler.loadGateV3Registry(badRegistry, "<env registry>");
  const graph = compiler.buildGateGraph(parsed.circuit, loaded.registry);
  const errors = compiler.dispatchGateSource(SOURCE, "<env>.gate", { registry: badRegistry })
    .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002");
  const built = compiler.buildAdmissionStatement({
    sourceBytes: new TextEncoder().encode(SOURCE),
    registry: loaded.registry,
    registryCanonicalForm: badRegistry,
    circuit: parsed.circuit,
    circuitCanonicalForm: compiler.lowerCircuitToGIR(parsed.circuit, loaded.registry),
    verifier: { version: "test-0.0.0", ruleSet: "gate-v3-codes@test" },
    proofs: compiler.circuitProofs(parsed.circuit, graph, loaded.registry),
    verificationErrorCount: errors.length,
    target: "wasm32-test",
  }, { canonicalBytes: canonicalReleaseEvidenceBytes });
  assert.equal(built.ok && built.statement.verdict === "refused", true);
  const f = fixture();
  const signer = signerFor(f.operational);
  const issued = issueGateAdmissionEnvelope(built.statement, signer);
  assert.equal(issued.ok, false);
  assert.deepEqual([...issued.refusals], ["GATE_ADMISSION_ISSUE_VERDICT_NOT_ADMITTED"]);
  assert.equal(signer.calls.count, 0);
});

test("issue: a non-statement and a malformed signer refuse, together, signing nothing", () => {
  const f = fixture();
  const signer = signerFor(f.operational);
  const issued = issueGateAdmissionEnvelope({ kind: "junk" }, { keyId: "nope" });
  assert.equal(issued.ok, false);
  assert.deepEqual([...issued.refusals].sort(), [
    "GATE_ADMISSION_ISSUE_NOT_A_STATEMENT",
    "GATE_ADMISSION_ISSUE_SIGNER_REFUSED",
  ]);
  assert.equal(signer.calls.count, 0);
});

test("issue: the catalogue currently holds ONE active suite — this pin fails when that changes, on purpose", () => {
  // Retirement handling (verify-only suites refusing for signing) is written
  // but unreachable while only one active suite exists. This pin makes the
  // catalogue's first change land HERE, where the retirement branch must then
  // get its live KAT — a reminder with an alarm attached, not a hope.
  const catalogue = releaseEvidenceCryptoSuiteCatalog();
  assert.equal(catalogue.length, 1);
  assert.equal(catalogue[0].suiteId, "hybrid-ed25519-mldsa65");
  assert.equal(catalogue[0].status, "active-for-signing");
});

test("composed: the six ratified exit refusals are all reachable, each on its own axis", () => {
  // tamper / wrong registry / wrong target / missing proof — compiler layer;
  // unknown suite — envelope layer; substitution — the composed case above.
  const { f, input, envelope } = admittedEnvelope();
  const opts = verifiedOptions(f);

  const bytes = Uint8Array.from(input.sourceBytes); bytes[0] ^= 1;
  assert.deepEqual([...verifyGateAdmissionEnvelope(envelope, opts, { ...inHandOf(input), sourceBytes: bytes }).refusals], ["GATE-ADMIT-005"]);

  const otherRegistry = structuredClone(REGISTRY_VALUE);
  otherRegistry.components[0].implementationDigest = `sha256:${"b".repeat(64)}`;
  assert.deepEqual([...verifyGateAdmissionEnvelope(envelope, opts, { ...inHandOf(input), registryCanonicalForm: otherRegistry }).refusals], ["GATE-ADMIT-006"]);

  assert.deepEqual([...verifyGateAdmissionEnvelope(envelope, opts, { ...inHandOf(input), target: "wasm32-other" }).refusals], ["GATE-ADMIT-007"]);

  assert.deepEqual([...verifyGateAdmissionEnvelope(envelope, opts, { ...inHandOf(input), proofs: input.proofs.slice(1) }).refusals], ["GATE-ADMIT-008"]);
});
