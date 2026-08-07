// gate-admission-fixture.mjs — ONE admitted-envelope rig, shared.
//
// Extracted so the order-6 suite and the admission-envelope suite cannot drift
// apart. Two copies of a crypto fixture is two sets of constants that agree
// until the day they quietly do not — the same hazard the flow-hash corpus
// avoids by keeping one set of literal hashes.
//
// ★ Keys are GENERATED PER RUN and never persisted (owner ruling, doc 43 Q6:
// real signing waits for order 7). Nothing here is key material at rest.
import {
  createPublicKey,
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign as signEd25519,
} from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const compilerRequire = createRequire(join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"));

export const lib = await import(pathToFileURL(join(ROOT, "scripts", "lib", "beta-release-evidence-envelope.mjs")).href);
export const gate = await import(pathToFileURL(join(ROOT, "scripts", "lib", "gate-admission-envelope.mjs")).href);
export const compiler = await import(pathToFileURL(join(ROOT, "packages-galerina", "galerina-core-compiler", "dist", "index.js")).href);
const { ml_dsa65: mlDsa65 } = await import(pathToFileURL(compilerRequire.resolve("@noble/post-quantum/ml-dsa.js")).href);

export const AT = "2026-08-07T12:00:00.000Z";
export const SIG_CONTEXT = "galerina.release.evidence.gate-admission.sig.v1";
export const seams = { canonicalBytes: lib.canonicalReleaseEvidenceBytes };

const sha256Of = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function hybridKey(keyId) {
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

export const signHybrid = (message, key, context) => ({
  ed25519Signature: signEd25519(null, Buffer.from(message), key.edPrivate).toString("base64"),
  mlDsa65Signature: Buffer.from(
    mlDsa65.sign(message, key.mlPrivate, { context: new TextEncoder().encode(context) }),
  ).toString("base64"),
});

/** The baseline registry. Callers `structuredClone` it before mutating. */
export const REGISTRY_VALUE = Object.freeze({
  version: "1.0.0",
  types: [{ id: "T", kind: "opaque", construction: "source" }],
  components: [{
    id: "c.echo", version: "1.0.0", status: "SHIPPED",
    implementationDigest: `sha256:${"a".repeat(64)}`,
    inputs: [{ name: "subject", type: "T" }],
    outputs: [{ name: "value", type: "T" }],
    arguments: [], effects: [], capabilities: [],
  }],
});

export const SOURCE = `@gate 3.0.0
CIRCUIT probe(v: T) -> T
  INTENT "admission probe"
  REQUIRES:
  PARTS:
    [a :: c.echo@1.0.0]
  WIRES:
    IN.v -> a.subject
    a.value -> OUT.value
END
`;

/** Everything `buildAdmissionStatement` needs, from the production surfaces. */
export function admissionInputs(source = SOURCE, registryValue = REGISTRY_VALUE, target = "wasm32-test") {
  const parsed = compiler.parseGateV3(source, "<fixture>.gate");
  const loaded = compiler.loadGateV3Registry(registryValue, "<fixture registry>");
  if (!parsed.ok || !loaded.ok) throw new Error("fixture must parse and load — the rig is broken, not the subject");
  const graph = compiler.buildGateGraph(parsed.circuit, loaded.registry);
  const errors = compiler.dispatchGateSource(source, "<fixture>.gate", { registry: registryValue })
    .diagnostics.filter((d) => d.severity === "error" && d.code !== "FUNGI-GATELANG-002");
  return {
    sourceBytes: new TextEncoder().encode(source),
    registry: loaded.registry,
    registryCanonicalForm: registryValue,
    circuit: parsed.circuit,
    circuitCanonicalForm: compiler.lowerCircuitToGIR(parsed.circuit, loaded.registry),
    verifier: { version: "test-0.0.0", ruleSet: "gate-v3-codes@test" },
    proofs: compiler.circuitProofs(parsed.circuit, graph, loaded.registry),
    verificationErrorCount: errors.length,
    target,
  };
}

/** The five fields a verifier compares against what the caller actually holds. */
export const inHandOf = (input) => ({
  sourceBytes: input.sourceBytes,
  registryCanonicalForm: input.registryCanonicalForm,
  circuitCanonicalForm: input.circuitCanonicalForm,
  proofs: input.proofs,
  target: input.target,
});

/** A signed delegation carrying the requested roles, plus its verified form. */
export function delegationFixture({
  roles = [lib.RELEASE_EVIDENCE_ROLE.DURABILITY, lib.RELEASE_EVIDENCE_ROLE.GATE_ADMISSION, lib.RELEASE_EVIDENCE_ROLE.REPOSITORY],
  notBefore = "2026-08-07T10:00:00.000Z",
  notAfter = "2026-08-08T10:00:00.000Z",
} = {}) {
  const root = hybridKey("3333333333333333");
  const operational = hybridKey("4444444444444444");
  const base = {
    schema: "galerina.release-evidence.delegation.v1",
    releaseId: "beta-v1",
    serial: 2,
    issuedAt: "2026-08-07T10:00:00.000Z",
    notBefore,
    notAfter,
    rootKeyId: root.keyId,
    operational: {
      keyId: operational.keyId,
      ed25519Sha256: sha256Of(createPublicKey(operational.edPublicPem).export({ type: "spki", format: "der" })),
      mlDsa65Sha256: sha256Of(operational.mlPublic),
      roles,
    },
  };
  const delegation = {
    ...base,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: "galerina.release.evidence.delegation.sig.v1",
      keyId: root.keyId,
      ...signHybrid(lib.releaseEvidenceDelegationPreimage(base), root, "galerina.release.evidence.delegation.sig.v1"),
    },
  };
  return { root, operational, delegation };
}

/** Envelope-layer options with a VERIFIED delegation, as the verifier demands. */
export function verifiedOptions(f, { at = AT, isRevoked = () => false } = {}) {
  const delegation = lib.verifyReleaseEvidenceDelegation(f.delegation, {
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
    at,
    operationalPublicBundle: { keyId: f.operational.keyId, ed25519PublicKeyPem: f.operational.edPublicPem, mlDsa65PublicKey: f.operational.mlPublic },
    isRevoked,
  };
}

/** Sign a statement as the gate-admission role. */
export const envelopeFor = (statement, operational) => ({
  schema: "galerina.release-evidence.envelope.v1",
  statement,
  signature: {
    algorithm: "hybrid-ed25519-mldsa65",
    canon: "galerina-canonical-json-v1",
    context: SIG_CONTEXT,
    keyId: operational.keyId,
    ...signHybrid(lib.releaseEvidenceStatementPreimage(statement, lib.RELEASE_EVIDENCE_ROLE.GATE_ADMISSION), operational, SIG_CONTEXT),
  },
});

/** One complete admitted control: inputs, statement, signed envelope, options. */
export function admittedControl(opts = {}) {
  const input = admissionInputs(opts.source, opts.registryValue, opts.target);
  const built = compiler.buildAdmissionStatement(input, seams);
  if (!built.ok) throw new Error(`fixture must admit: ${built.diagnostics.map((d) => d.code).join(" ")}`);
  const f = delegationFixture(opts.delegation ?? {});
  return {
    input,
    statement: built.statement,
    envelope: envelopeFor(built.statement, f.operational),
    options: verifiedOptions(f, opts.optionsOverrides ?? {}),
    keys: f,
    inHand: inHandOf(input),
  };
}
