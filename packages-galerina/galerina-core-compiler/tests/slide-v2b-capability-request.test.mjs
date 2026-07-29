import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign as signEd25519,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  checkTypes,
  executeFlow,
  parseProgram,
  SLIDEV2BAtomicStateReference,
  verifySLIDEV2BHybridLeaseSignature,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-capability-request.fungi",
);
const LEASE_SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-lease-shape.fungi",
);
const LEASE_CANONICAL_SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-lease-canonical.fungi",
);
const LEASE_USE_STATE_SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-lease-use-state.fungi",
);
const ADMISSION_COMPOSITION_SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "slide-v2b-admission-composition.fungi",
);

let parsed;
let capabilitySet;
let leaseFixture;
let leaseSigningEvidence;
let hybridCandidate;
let hybridPolicy;
let hybridSigningInput;
let hybridMLSecretKey;
let hybridFungiReceipt;
let leaseUseFixture;
let evidenceShapeSet;
let initialStateCanonicalBytes;

function field(record, name) {
  assert.equal(record.__tag, "record");
  const value = record.fields.get(name);
  assert.ok(value, `missing field ${name}`);
  return value;
}

function intValue(value) {
  return { __tag: "int", value };
}

function stringValue(value) {
  return { __tag: "string", value };
}

function recordValue(fields) {
  return { __tag: "record", fields: new Map(Object.entries(fields)) };
}

async function run(flowName, args = new Map()) {
  return executeFlow(
    flowName,
    args,
    parsed.ast,
    parsed.flows,
    undefined,
    undefined,
    { pureFastPath: false },
  );
}

async function validate(candidate) {
  const result = await run(
    "validateSLIDEV2BCapabilitySet",
    new Map([["candidate", candidate]]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function validateLease(
  lease,
  request = field(leaseFixture, "request"),
  verifierReceipt = field(leaseFixture, "verifierReceipt"),
  validationTime = field(leaseFixture, "validationTime"),
) {
  const result = await run(
    "validateSLIDEV2BLeaseShape",
    new Map([
      ["lease", lease],
      ["request", request],
      ["verifierReceipt", verifierReceipt],
      ["validationTime", validationTime],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function deriveLeaseSigningEvidence(
  lease,
  request = field(leaseFixture, "request"),
) {
  const result = await run(
    "deriveSLIDEV2BLeaseSigningEvidence",
    new Map([
      ["lease", lease],
      ["request", request],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

async function proposeLeaseUseReservation({
  lease = field(leaseFixture, "lease"),
  request = field(leaseFixture, "request"),
  receipt = hybridFungiReceipt,
  state = field(leaseUseFixture, "state"),
  expectedStateDigest = field(leaseUseFixture, "stateDigest"),
  expectedGeneration = intValue(0),
  requestBytes = intValue(128),
  validationTime = field(leaseFixture, "validationTime"),
} = {}) {
  const result = await run(
    "proposeSLIDEV2BLeaseUseReservation",
    new Map([
      ["lease", lease],
      ["request", request],
      ["verifierReceipt", receipt],
      ["state", state],
      ["expectedStateDigest", expectedStateDigest],
      ["expectedGeneration", expectedGeneration],
      ["requestBytes", requestBytes],
      ["validationTime", validationTime],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

function atomicReceiptValue(receipt) {
  return recordValue({
    schemaId: stringValue(receipt.schemaId),
    storeId: stringValue(receipt.storeId),
    leaseId: stringValue(receipt.leaseId),
    nonceDigest: stringValue(receipt.nonceDigest),
    priorStateDigest: stringValue(receipt.priorStateDigest),
    nextStateDigest: stringValue(receipt.nextStateDigest),
    priorGeneration: intValue(receipt.priorGeneration),
    nextGeneration: intValue(receipt.nextGeneration),
    proposedCallNumber: intValue(receipt.proposedCallNumber),
    verdict: { __tag: "verdict", value: receipt.verdict },
    committedAt: intValue(receipt.committedAt),
    evidenceDigest: stringValue(receipt.evidenceDigest),
  });
}

async function composeEvidenceShapes({
  evidence = evidenceShapeSet,
  atomicReceipt,
  reservation,
} = {}) {
  const result = await run(
    "composeSLIDEV2BAdmissionEvidenceShapes",
    new Map([
      ["evidenceSet", evidence],
      ["atomicReceipt", atomicReceipt],
      ["reservation", reservation],
      ["lease", field(leaseFixture, "lease")],
      ["expectedStoreId", stringValue("slide.reference.atomic-store.v2b")],
      ["validationTime", field(leaseFixture, "validationTime")],
    ]),
  );
  assert.equal(result.audit.result, "ok", JSON.stringify(result.audit));
  return result.value;
}

before(async () => {
  const requestSource = await readFile(SOURCE, "utf8");
  const leaseSource = await readFile(LEASE_SOURCE, "utf8");
  const leaseCanonicalSource = await readFile(LEASE_CANONICAL_SOURCE, "utf8");
  const leaseUseStateSource = await readFile(LEASE_USE_STATE_SOURCE, "utf8");
  const admissionCompositionSource = await readFile(
    ADMISSION_COMPOSITION_SOURCE,
    "utf8",
  );
  const source = [
    requestSource,
    leaseSource.replace(/^@version 1\r?\n/, ""),
    leaseCanonicalSource.replace(/^@version 1\r?\n/, ""),
    leaseUseStateSource.replace(/^@version 1\r?\n/, ""),
    admissionCompositionSource.replace(/^@version 1\r?\n/, ""),
  ].join("\n");
  parsed = parseProgram(source, SOURCE, { requireVersionHeader: true });
  assert.deepEqual(
    parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkTypes(parsed.ast).diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ),
    [],
  );
  const result = await run("materializeSLIDEV2BCapabilitySet");
  assert.equal(result.audit.result, "ok");
  capabilitySet = result.value;
  const fixtureResult = await run(
    "materializeSLIDEV2BLeaseFixture",
    new Map([["capabilitySet", capabilitySet]]),
  );
  assert.equal(fixtureResult.audit.result, "ok");
  leaseFixture = fixtureResult.value;
  leaseSigningEvidence = await deriveLeaseSigningEvidence(
    field(leaseFixture, "lease"),
  );
  const canonicalBytes = field(leaseSigningEvidence, "canonicalBytes").value;
  const domain = Buffer.from("slide.capability.lease-signing.v2b\0", "utf8");
  const signingInput = Buffer.concat([domain, Buffer.from(canonicalBytes)]);
  hybridSigningInput = signingInput;
  const ed25519 = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const { ml_dsa65 } = await import("@noble/post-quantum/ml-dsa.js");
  const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const mlDsa65 = ml_dsa65.keygen(seed);
  hybridMLSecretKey = mlDsa65.secretKey;
  hybridCandidate = {
    schemaId: "slide.capability.lease.v2b",
    signatureSuiteId: 1,
    signerRoleId: 1,
    keyId: "slide-test-hybrid-key-1",
    canonicalBytes,
    signedBytesDigest: field(leaseSigningEvidence, "signingDigest").value,
    ed25519Signature: new Uint8Array(
      signEd25519(null, signingInput, ed25519.privateKey),
    ),
    mlDsa65Signature: ml_dsa65.sign(
      signingInput,
      mlDsa65.secretKey,
      { context: new TextEncoder().encode("slide.capability.lease.v2b") },
    ),
  };
  hybridPolicy = {
    expectedKeyId: hybridCandidate.keyId,
    ed25519PublicKeyPem: ed25519.publicKey,
    mlDsa65PublicKey: mlDsa65.publicKey,
    revokedKeyIds: new Set(),
    verifiedAt: 1001,
  };
  const hybridReceipt = await verifySLIDEV2BHybridLeaseSignature(
    hybridCandidate,
    hybridPolicy,
  );
  hybridFungiReceipt = recordValue({
    schemaId: stringValue(hybridReceipt.schemaId),
    verifierId: stringValue(hybridReceipt.verifierId),
    signatureSuiteId: intValue(hybridReceipt.signatureSuiteId),
    signerRoleId: intValue(hybridReceipt.signerRoleId),
    keyId: stringValue(hybridReceipt.keyId),
    signedBytesDigest: stringValue(hybridReceipt.signedBytesDigest),
    signatureDigest: stringValue(hybridReceipt.signatureDigest),
    verdict: { __tag: "verdict", value: hybridReceipt.verdict },
    verifiedAt: intValue(hybridReceipt.verifiedAt),
    evidenceDigest: stringValue(hybridReceipt.evidenceDigest),
  });
  const stateResult = await run(
    "materializeSLIDEV2BInitialLeaseUseState",
    new Map([["lease", field(leaseFixture, "lease")]]),
  );
  assert.equal(stateResult.audit.result, "ok");
  leaseUseFixture = stateResult.value;
  const initialStateCanonicalResult = await run(
    "slideV2BLeaseUseStateCanonicalBytes",
    new Map([["state", field(leaseUseFixture, "state")]]),
  );
  assert.equal(initialStateCanonicalResult.audit.result, "ok");
  initialStateCanonicalBytes = initialStateCanonicalResult.value.value;
  const evidenceResult = await run(
    "materializeSLIDEV2BEvidenceShapeSet",
    new Map([
      ["lease", field(leaseFixture, "lease")],
      ["validationTime", field(leaseFixture, "validationTime")],
    ]),
  );
  assert.equal(evidenceResult.audit.result, "ok");
  evidenceShapeSet = evidenceResult.value;
});

describe("SLIDE V2-B capability request shape", () => {
  it("validates the three exact requests while releasing no authority", async () => {
    const decision = await validate(capabilitySet);
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "SHAPE_VALIDATED");
    assert.equal(field(decision, "authorityReleased").value, false);
    assert.equal(field(capabilitySet, "requests").items.length, 3);
  });

  const mutations = [
    [
      "profile drift",
      (candidate) =>
        candidate.fields.set("profileId", stringValue("slide.capability.any")),
      "SLIDE-V2B-CAPABILITY-001",
    ],
    [
      "descriptor drift",
      (candidate) =>
        candidate.fields.set("descriptorDigest", stringValue("00")),
      "SLIDE-V2B-CAPABILITY-002",
    ],
    [
      "effect/class mismatch",
      (candidate) =>
        field(candidate, "requests").items[0].fields.set("effectId", intValue(2)),
      "SLIDE-V2B-CAPABILITY-004",
    ],
    [
      "wildcard-like surplus calls",
      (candidate) =>
        field(candidate, "requests").items[1].fields.set("maxCalls", intValue(99)),
      "SLIDE-V2B-CAPABILITY-005",
    ],
    [
      "database resource drift",
      (candidate) =>
        field(candidate, "requests").items[0].fields.set(
          "resourceDescriptorDigest",
          stringValue(
            "750102fc1c2df495cb09d059ad844f6df2465d31d53db846e003efd14c23acd8",
          ),
        ),
      "SLIDE-V2B-CAPABILITY-006",
    ],
    [
      "missing audit requirement",
      (candidate) =>
        field(candidate, "requests").items[2].fields.set(
          "auditRequirementId",
          intValue(0),
        ),
      "SLIDE-V2B-CAPABILITY-005",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const candidate = structuredClone(capabilitySet);
      mutate(candidate);
      const decision = await validate(candidate);
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "authorityReleased").value, false);
      assert.equal(field(decision, "failureId").value, expectedFailure);
    });
  }
});

describe("SLIDE V2-B lease and typed verifier-receipt shape", () => {
  it("validates exact binding while releasing no authority", async () => {
    const decision = await validateLease(field(leaseFixture, "lease"));
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "LEASE_SHAPE_VALIDATED");
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  it("derives deterministic domain-separated signing bytes without authority", async () => {
    const second = await deriveLeaseSigningEvidence(
      field(leaseFixture, "lease"),
    );
    const firstDecision = field(leaseSigningEvidence, "decision");
    assert.equal(field(firstDecision, "verdict").value, 1);
    assert.equal(field(firstDecision, "authorityReleased").value, false);
    assert.equal(
      field(leaseSigningEvidence, "signingDigest").value,
      field(field(leaseFixture, "lease"), "signedBytesDigest").value,
    );
    assert.equal(
      field(second, "signingDigest").value,
      field(leaseSigningEvidence, "signingDigest").value,
    );
    assert.deepEqual(
      field(second, "canonicalBytes").value,
      field(leaseSigningEvidence, "canonicalBytes").value,
    );
    assert.equal(
      field(second, "canonicalByteLength").value,
      field(second, "canonicalBytes").value.length,
    );
    assert.equal(field(second, "canonicalByteLength").value, 463);
    assert.equal(
      field(second, "signingDigest").value,
      "79bb25fab044097d0c014c92d55f7e26768922493d6793aef0173cc3c567ed4a",
    );
    const independentlyDerived = createHash("sha256")
      .update("slide.capability.lease-signing.v2b\0", "utf8")
      .update(field(second, "canonicalBytes").value)
      .digest("hex");
    assert.equal(
      independentlyDerived,
      field(second, "signingDigest").value,
    );
  });

  it("excludes the digest field from its own canonical preimage", async () => {
    const lease = structuredClone(field(leaseFixture, "lease"));
    lease.fields.set(
      "signedBytesDigest",
      stringValue(
        "abababababababababababababababababababababababababababababababab",
      ),
    );
    const evidence = await deriveLeaseSigningEvidence(lease);
    assert.equal(
      field(evidence, "signingDigest").value,
      field(leaseSigningEvidence, "signingDigest").value,
    );
  });

  it("changes the digest for any changed signed lease field", async () => {
    const lease = structuredClone(field(leaseFixture, "lease"));
    lease.fields.set("subjectId", stringValue("subject-fixture-2"));
    const evidence = await deriveLeaseSigningEvidence(lease);
    assert.notEqual(
      field(evidence, "signingDigest").value,
      field(leaseSigningEvidence, "signingDigest").value,
    );
  });

  const mutations = [
    [
      "absent lease identity",
      ({ lease }) => lease.fields.set("leaseId", stringValue("")),
      "SLIDE-V2B-LEASE-001",
    ],
    [
      "malformed artifact digest",
      ({ lease }) =>
        lease.fields.set("artifactSemanticDigest", stringValue("00")),
      "SLIDE-V2B-LEASE-002",
    ],
    [
      "request binding drift",
      ({ lease }) => lease.fields.set("effectId", intValue(2)),
      "SLIDE-V2B-LEASE-003",
    ],
    [
      "expired validation window",
      ({ validationTime }) => {
        validationTime.value = 1100;
      },
      "SLIDE-V2B-LEASE-004",
    ],
    [
      "widened call ceiling",
      ({ lease }) => lease.fields.set("maxCalls", intValue(2)),
      "SLIDE-V2B-LEASE-005",
    ],
    [
      "unrecognized issuer role",
      ({ lease }) => lease.fields.set("issuerRoleId", intValue(2)),
      "SLIDE-V2B-LEASE-006",
    ],
    [
      "absent verifier identity",
      ({ receipt }) => receipt.fields.set("verifierId", stringValue("")),
      "SLIDE-V2B-LEASE-007",
    ],
    [
      "unregistered verifier identity",
      ({ receipt }) =>
        receipt.fields.set(
          "verifierId",
          stringValue("slide.crypto.verifier-unregistered.v1"),
        ),
      "SLIDE-V2B-LEASE-007",
    ],
    [
      "signed-byte digest mismatch",
      ({ receipt }) =>
        receipt.fields.set(
          "signedBytesDigest",
          stringValue(
            "abababababababababababababababababababababababababababababababab",
          ),
        ),
      "SLIDE-V2B-LEASE-008",
    ],
    [
      "non-canonical lease signed-byte digest",
      ({ lease }) =>
        lease.fields.set(
          "signedBytesDigest",
          stringValue(
            "abababababababababababababababababababababababababababababababab",
          ),
        ),
      "SLIDE-V2B-LEASE-012",
    ],
    [
      "malformed verifier evidence",
      ({ receipt }) =>
        receipt.fields.set("evidenceDigest", stringValue("00")),
      "SLIDE-V2B-LEASE-009",
    ],
    [
      "cryptographic denial",
      ({ receipt }) =>
        receipt.fields.set("verdict", { __tag: "verdict", value: -1 }),
      "SLIDE-V2B-LEASE-010",
    ],
    [
      "cryptographic ambiguity",
      ({ receipt }) =>
        receipt.fields.set("verdict", { __tag: "verdict", value: 0 }),
      "SLIDE-V2B-LEASE-011",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const lease = structuredClone(field(leaseFixture, "lease"));
      const request = structuredClone(field(leaseFixture, "request"));
      const receipt = structuredClone(field(leaseFixture, "verifierReceipt"));
      const validationTime = structuredClone(field(leaseFixture, "validationTime"));
      mutate({ lease, request, receipt, validationTime });
      const decision = await validateLease(
        lease,
        request,
        receipt,
        validationTime,
      );
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "authorityReleased").value, false);
      assert.equal(field(decision, "failureId").value, expectedFailure);
    });
  }
});

describe("SLIDE V2-B independent hybrid cryptographic verifier", () => {
  it("requires both registered signatures and emits a typed ALLOW receipt", async () => {
    const receipt = await verifySLIDEV2BHybridLeaseSignature(
      hybridCandidate,
      hybridPolicy,
    );
    assert.equal(receipt.verdict, 1);
    assert.equal(receipt.schemaId, "slide.crypto.verifier-receipt.v1");
    assert.equal(
      receipt.verifierId,
      "slide.crypto.hybrid-ed25519-mldsa65.v1",
    );
    assert.equal(receipt.signedBytesDigest, hybridCandidate.signedBytesDigest);
    assert.equal(receipt.signatureDigest.length, 64);
    assert.equal(receipt.evidenceDigest.length, 64);

    const fungiReceipt = recordValue({
      schemaId: stringValue(receipt.schemaId),
      verifierId: stringValue(receipt.verifierId),
      signatureSuiteId: intValue(receipt.signatureSuiteId),
      signerRoleId: intValue(receipt.signerRoleId),
      keyId: stringValue(receipt.keyId),
      signedBytesDigest: stringValue(receipt.signedBytesDigest),
      signatureDigest: stringValue(receipt.signatureDigest),
      verdict: { __tag: "verdict", value: receipt.verdict },
      verifiedAt: intValue(receipt.verifiedAt),
      evidenceDigest: stringValue(receipt.evidenceDigest),
    });
    const decision = await validateLease(
      field(leaseFixture, "lease"),
      field(leaseFixture, "request"),
      fungiReceipt,
    );
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  const denials = [
    [
      "tampered canonical bytes",
      () => ({
        candidate: {
          ...hybridCandidate,
          canonicalBytes: Uint8Array.from([
            ...hybridCandidate.canonicalBytes.slice(0, -1),
            hybridCandidate.canonicalBytes.at(-1) ^ 1,
          ]),
        },
        policy: hybridPolicy,
      }),
    ],
    [
      "invalid Ed25519 half",
      () => {
        const signature = hybridCandidate.ed25519Signature.slice();
        signature[0] ^= 1;
        return {
          candidate: { ...hybridCandidate, ed25519Signature: signature },
          policy: hybridPolicy,
        };
      },
    ],
    [
      "invalid ML-DSA-65 half",
      () => {
        const signature = hybridCandidate.mlDsa65Signature.slice();
        signature[0] ^= 1;
        return {
          candidate: { ...hybridCandidate, mlDsa65Signature: signature },
          policy: hybridPolicy,
        };
      },
    ],
    [
      "classical-only downgrade",
      () => ({
        candidate: {
          ...hybridCandidate,
          mlDsa65Signature: new Uint8Array(),
        },
        policy: hybridPolicy,
      }),
    ],
    [
      "wrong signer role",
      () => ({
        candidate: { ...hybridCandidate, signerRoleId: 2 },
        policy: hybridPolicy,
      }),
    ],
    [
      "wrong key identity",
      () => ({
        candidate: { ...hybridCandidate, keyId: "slide-test-hybrid-key-2" },
        policy: hybridPolicy,
      }),
    ],
    [
      "oversize key identity",
      () => ({
        candidate: { ...hybridCandidate, keyId: "k".repeat(129) },
        policy: hybridPolicy,
      }),
    ],
    [
      "revoked key",
      () => ({
        candidate: hybridCandidate,
        policy: {
          ...hybridPolicy,
          revokedKeyIds: new Set([hybridCandidate.keyId]),
        },
      }),
    ],
  ];

  for (const [name, arrange] of denials) {
    it(`fails closed for ${name}`, async () => {
      const { candidate, policy } = arrange();
      const receipt = await verifySLIDEV2BHybridLeaseSignature(
        candidate,
        policy,
      );
      assert.equal(receipt.verdict, -1);
      assert.equal(receipt.evidenceDigest.length, 64);
    });
  }

  it("rejects an ML-DSA signature from another protocol context", async () => {
    const { ml_dsa65 } = await import("@noble/post-quantum/ml-dsa.js");
    const crossProtocolSignature = ml_dsa65.sign(
      hybridSigningInput,
      hybridMLSecretKey,
      { context: new TextEncoder().encode("galerina.audit.attestation.v2") },
    );
    const receipt = await verifySLIDEV2BHybridLeaseSignature(
      { ...hybridCandidate, mlDsa65Signature: crossProtocolSignature },
      hybridPolicy,
    );
    assert.equal(receipt.verdict, -1);
  });

  it("reports missing PQ verification evidence as INDETERMINATE, never ALLOW", async () => {
    const receipt = await verifySLIDEV2BHybridLeaseSignature(
      hybridCandidate,
      { ...hybridPolicy, mlDsa65PublicKey: undefined },
    );
    assert.equal(receipt.verdict, 0);

    const fungiReceipt = recordValue({
      schemaId: stringValue(receipt.schemaId),
      verifierId: stringValue(receipt.verifierId),
      signatureSuiteId: intValue(receipt.signatureSuiteId),
      signerRoleId: intValue(receipt.signerRoleId),
      keyId: stringValue(receipt.keyId),
      signedBytesDigest: stringValue(receipt.signedBytesDigest),
      signatureDigest: stringValue(receipt.signatureDigest),
      verdict: { __tag: "verdict", value: receipt.verdict },
      verifiedAt: intValue(receipt.verifiedAt),
      evidenceDigest: stringValue(receipt.evidenceDigest),
    });
    const decision = await validateLease(
      field(leaseFixture, "lease"),
      field(leaseFixture, "request"),
      fungiReceipt,
    );
    assert.equal(field(decision, "verdict").value, -1);
    assert.equal(
      field(decision, "failureId").value,
      "SLIDE-V2B-LEASE-011",
    );
    assert.equal(field(decision, "authorityReleased").value, false);
  });
});

describe("SLIDE V2-B lease-use state proposal", () => {
  it("proposes one exact transition while releasing no authority", async () => {
    const initialState = field(leaseUseFixture, "state");
    const canonicalResult = await run(
      "slideV2BLeaseUseStateCanonicalBytes",
      new Map([["state", initialState]]),
    );
    assert.equal(canonicalResult.audit.result, "ok");
    assert.equal(canonicalResult.value.value.length, 135);
    assert.equal(
      field(initialState, "nonceDigest").value,
      "cf3ecc0f8b7b2c0a380d1aa0da7560ca143262acc6cb7c8f05709dd55b96f3ed",
    );
    assert.equal(
      field(leaseUseFixture, "stateDigest").value,
      "15e5b121b6a00d97f0dc1b99f86b7af7fc3e46c86c19369ff6f185212c15001b",
    );
    const independentlyDerived = createHash("sha256")
      .update("slide.capability.lease-use-state.v2b\0", "utf8")
      .update(canonicalResult.value.value)
      .digest("hex");
    assert.equal(
      independentlyDerived,
      field(leaseUseFixture, "stateDigest").value,
    );
    const reservation = await proposeLeaseUseReservation();
    const decision = field(reservation, "decision");
    const nextState = field(reservation, "nextState");
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "RESERVATION_PROPOSED");
    assert.equal(field(decision, "authorityReleased").value, false);
    assert.equal(field(reservation, "priorStateDigest").value.length, 64);
    assert.equal(field(reservation, "nextStateDigest").value.length, 64);
    assert.notEqual(
      field(reservation, "priorStateDigest").value,
      field(reservation, "nextStateDigest").value,
    );
    assert.equal(field(nextState, "generation").value, 1);
    assert.equal(field(nextState, "callsConsumed").value, 1);
    assert.equal(field(nextState, "requestBytesConsumed").value, 128);
    assert.equal(field(nextState, "statusId").value, 2);
  });

  const mutations = [
    [
      "state lease drift",
      ({ state }) => state.fields.set("leaseId", stringValue("other-lease")),
      "SLIDE-V2B-STATE-002",
    ],
    [
      "nonce drift",
      ({ state }) =>
        state.fields.set(
          "nonceDigest",
          stringValue(
            "abababababababababababababababababababababababababababababababab",
          ),
        ),
      "SLIDE-V2B-STATE-003",
    ],
    [
      "negative generation",
      ({ state }) => state.fields.set("generation", intValue(-1)),
      "SLIDE-V2B-STATE-004",
    ],
    [
      "stale expected digest",
      ({ expectedStateDigest }) => {
        expectedStateDigest.value =
          "abababababababababababababababababababababababababababababababab";
      },
      "SLIDE-V2B-STATE-005",
    ],
    [
      "stale expected generation",
      ({ expectedGeneration }) => {
        expectedGeneration.value = 1;
      },
      "SLIDE-V2B-STATE-006",
    ],
    [
      "zero request bytes",
      ({ requestBytes }) => {
        requestBytes.value = 0;
      },
      "SLIDE-V2B-STATE-008",
    ],
    [
      "oversize request bytes",
      ({ requestBytes }) => {
        requestBytes.value = 4097;
      },
      "SLIDE-V2B-STATE-008",
    ],
  ];

  for (const [name, mutate, expectedFailure] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const state = structuredClone(field(leaseUseFixture, "state"));
      const expectedStateDigest = structuredClone(
        field(leaseUseFixture, "stateDigest"),
      );
      const expectedGeneration = intValue(0);
      const requestBytes = intValue(128);
      mutate({
        state,
        expectedStateDigest,
        expectedGeneration,
        requestBytes,
      });
      const reservation = await proposeLeaseUseReservation({
        state,
        expectedStateDigest,
        expectedGeneration,
        requestBytes,
      });
      const decision = field(reservation, "decision");
      assert.equal(field(decision, "verdict").value, -1);
      assert.equal(field(decision, "authorityReleased").value, false);
      assert.equal(field(decision, "failureId").value, expectedFailure);
      assert.equal(field(reservation, "priorStateDigest").value, "");
      assert.equal(field(reservation, "nextStateDigest").value, "");
      assert.equal(field(field(reservation, "nextState"), "statusId").value, 0);
    });
  }

  it("refuses a replay of the proposed terminal next state", async () => {
    const first = await proposeLeaseUseReservation();
    const replay = await proposeLeaseUseReservation({
      state: field(first, "nextState"),
      expectedStateDigest: field(first, "nextStateDigest"),
      expectedGeneration: intValue(1),
    });
    const decision = field(replay, "decision");
    assert.equal(field(decision, "verdict").value, -1);
    assert.equal(field(decision, "failureId").value, "SLIDE-V2B-STATE-007");
    assert.equal(field(decision, "authorityReleased").value, false);
  });
});

describe("SLIDE V2-B reference atomic state commit", () => {
  const storeId = "slide.reference.atomic-store.v2b";

  function initialRecord() {
    const state = field(leaseUseFixture, "state");
    return {
      leaseId: field(state, "leaseId").value,
      nonceDigest: field(state, "nonceDigest").value,
      stateDigest: field(leaseUseFixture, "stateDigest").value,
      generation: field(state, "generation").value,
      callsConsumed: field(state, "callsConsumed").value,
      requestBytesConsumed: field(state, "requestBytesConsumed").value,
      expiresAt: field(state, "expiresAt").value,
      statusId: field(state, "statusId").value,
      canonicalBytes: initialStateCanonicalBytes,
    };
  }

  async function candidateFor(reservation) {
    const state = field(leaseUseFixture, "state");
    const nextState = field(reservation, "nextState");
    const canonicalResult = await run(
      "slideV2BLeaseUseStateCanonicalBytes",
      new Map([["state", nextState]]),
    );
    assert.equal(canonicalResult.audit.result, "ok");
    return {
      schemaId: "slide.capability.lease-use-reservation.v2b",
      storeId,
      leaseId: field(state, "leaseId").value,
      nonceDigest: field(state, "nonceDigest").value,
      priorStateDigest: field(reservation, "priorStateDigest").value,
      nextStateDigest: field(reservation, "nextStateDigest").value,
      priorGeneration: field(state, "generation").value,
      nextGeneration: field(nextState, "generation").value,
      proposedCallNumber: field(nextState, "callsConsumed").value,
      commitTime: 1050,
      nextStateCanonicalBytes: canonicalResult.value.value,
    };
  }

  it("commits exactly the proposed digest/generation and releases no authority", async () => {
    const reservation = await proposeLeaseUseReservation();
    const candidate = await candidateFor(reservation);
    const store = new SLIDEV2BAtomicStateReference(storeId, [initialRecord()]);
    const receipt = store.reserve(candidate);
    assert.equal(receipt.verdict, 1);
    assert.equal(receipt.schemaId, "slide.atomic-state-receipt.v1");
    assert.equal(receipt.authorityReleased, false);
    assert.equal(receipt.evidenceDigest.length, 64);
    const stored = store.inspect(candidate.leaseId);
    assert.equal(stored.leaseId, candidate.leaseId);
    assert.equal(stored.nonceDigest, candidate.nonceDigest);
    assert.equal(stored.stateDigest, candidate.nextStateDigest);
    assert.equal(stored.generation, candidate.nextGeneration);
    assert.equal(stored.callsConsumed, candidate.proposedCallNumber);
    assert.deepEqual(stored.canonicalBytes, candidate.nextStateCanonicalBytes);
  });

  it("allows exactly one of sixteen competing one-call reservations", async () => {
    const reservation = await proposeLeaseUseReservation();
    const candidate = await candidateFor(reservation);
    const store = new SLIDEV2BAtomicStateReference(storeId, [initialRecord()]);
    const receipts = await Promise.all(
      Array.from({ length: 16 }, async () => store.reserve(candidate)),
    );
    assert.equal(receipts.filter((receipt) => receipt.verdict === 1).length, 1);
    assert.equal(receipts.filter((receipt) => receipt.verdict === -1).length, 15);
    assert.equal(receipts.filter((receipt) => receipt.verdict === 0).length, 0);
    assert.ok(receipts.every((receipt) => receipt.authorityReleased === false));
  });

  it("returns INDETERMINATE for absent store state", async () => {
    const reservation = await proposeLeaseUseReservation();
    const candidate = await candidateFor(reservation);
    const store = new SLIDEV2BAtomicStateReference(storeId, []);
    const receipt = store.reserve(candidate);
    assert.equal(receipt.verdict, 0);
    assert.equal(receipt.authorityReleased, false);
  });

  const mutations = [
    ["wrong store", (candidate) => ({ ...candidate, storeId: "other-store" })],
    [
      "wrong nonce",
      (candidate) => ({
        ...candidate,
        nonceDigest:
          "abababababababababababababababababababababababababababababababab",
      }),
    ],
    [
      "stale prior digest",
      (candidate) => ({
        ...candidate,
        priorStateDigest:
          "abababababababababababababababababababababababababababababababab",
      }),
    ],
    [
      "non-advancing digest",
      (candidate) => ({
        ...candidate,
        nextStateDigest: candidate.priorStateDigest,
      }),
    ],
    [
      "skipped generation",
      (candidate) => ({
        ...candidate,
        nextGeneration: candidate.nextGeneration + 1,
      }),
    ],
    [
      "wrong call number",
      (candidate) => ({
        ...candidate,
        proposedCallNumber: candidate.proposedCallNumber + 1,
      }),
    ],
    [
      "tampered next-state bytes",
      (candidate) => {
        const bytes = candidate.nextStateCanonicalBytes.slice();
        bytes[bytes.length - 1] ^= 1;
        return { ...candidate, nextStateCanonicalBytes: bytes };
      },
    ],
    [
      "surplus next-state bytes",
      (candidate) => ({
        ...candidate,
        nextStateCanonicalBytes: Uint8Array.from([
          ...candidate.nextStateCanonicalBytes,
          0,
        ]),
      }),
    ],
  ];

  for (const [name, mutate] of mutations) {
    it(`fails closed for ${name}`, async () => {
      const reservation = await proposeLeaseUseReservation();
      const store = new SLIDEV2BAtomicStateReference(storeId, [initialRecord()]);
      const receipt = store.reserve(mutate(await candidateFor(reservation)));
      assert.equal(receipt.verdict, -1);
      assert.equal(receipt.authorityReleased, false);
      assert.deepEqual(store.inspect(initialRecord().leaseId), initialRecord());
    });
  }
});

describe("SLIDE V2-B typed receipt K3 composition", () => {
  const storeId = "slide.reference.atomic-store.v2b";

  async function committedFixture({ seedStore = true } = {}) {
    const reservation = await proposeLeaseUseReservation();
    const state = field(leaseUseFixture, "state");
    const initial = {
      leaseId: field(state, "leaseId").value,
      nonceDigest: field(state, "nonceDigest").value,
      stateDigest: field(leaseUseFixture, "stateDigest").value,
      generation: field(state, "generation").value,
      callsConsumed: field(state, "callsConsumed").value,
      requestBytesConsumed: field(state, "requestBytesConsumed").value,
      expiresAt: field(state, "expiresAt").value,
      statusId: field(state, "statusId").value,
      canonicalBytes: initialStateCanonicalBytes,
    };
    const store = new SLIDEV2BAtomicStateReference(
      storeId,
      seedStore ? [initial] : [],
    );
    const nextState = field(reservation, "nextState");
    const canonicalResult = await run(
      "slideV2BLeaseUseStateCanonicalBytes",
      new Map([["state", nextState]]),
    );
    assert.equal(canonicalResult.audit.result, "ok");
    const receipt = store.reserve({
      schemaId: "slide.capability.lease-use-reservation.v2b",
      storeId,
      leaseId: initial.leaseId,
      nonceDigest: initial.nonceDigest,
      priorStateDigest: field(reservation, "priorStateDigest").value,
      nextStateDigest: field(reservation, "nextStateDigest").value,
      priorGeneration: initial.generation,
      nextGeneration: field(nextState, "generation").value,
      proposedCallNumber: field(nextState, "callsConsumed").value,
      commitTime: 1050,
      nextStateCanonicalBytes: canonicalResult.value.value,
    });
    return { reservation, receipt };
  }

  it("composes seven exact ALLOW shapes but still releases no authority", async () => {
    const { reservation, receipt } = await committedFixture();
    const decision = await composeEvidenceShapes({
      atomicReceipt: atomicReceiptValue(receipt),
      reservation,
    });
    assert.equal(field(decision, "verdict").value, 1);
    assert.equal(field(decision, "status").value, "EVIDENCE_SHAPES_COMPOSED");
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  it("preserves the exact Kleene K3 AND truth table", async () => {
    const expected = new Map([
      ["-1,-1", -1],
      ["-1,0", -1],
      ["-1,1", -1],
      ["0,-1", -1],
      ["0,0", 0],
      ["0,1", 0],
      ["1,-1", -1],
      ["1,0", 0],
      ["1,1", 1],
    ]);
    for (const [key, value] of expected) {
      const [left, right] = key.split(",").map(Number);
      const result = await run(
        "slideV2BK3And",
        new Map([
          ["left", { __tag: "verdict", value: left }],
          ["right", { __tag: "verdict", value: right }],
        ]),
      );
      assert.equal(result.audit.result, "ok", `${key}: ${JSON.stringify(result.audit)}`);
      assert.equal(result.value.value, value, key);
    }
  });

  for (const verdict of [-1, 0]) {
    it(`preserves evidence-shape Verdict ${verdict} as a terminal composition`, async () => {
      const { reservation, receipt } = await committedFixture();
      const evidence = structuredClone(evidenceShapeSet);
      const replacementResult = await run(
        "materializeSLIDEV2BEvidenceShape",
        new Map([
          ["kindId", intValue(3)],
          ["lease", field(leaseFixture, "lease")],
          ["validationTime", field(leaseFixture, "validationTime")],
          ["verdict", { __tag: "verdict", value: verdict }],
        ]),
      );
      assert.equal(replacementResult.audit.result, "ok");
      field(evidence, "receipts").items[2] = replacementResult.value;
      const decision = await composeEvidenceShapes({
        evidence,
        atomicReceipt: atomicReceiptValue(receipt),
        reservation,
      });
      assert.equal(field(decision, "verdict").value, verdict);
      assert.equal(field(decision, "authorityReleased").value, false);
    });
  }

  it("preserves an absent atomic state as terminal INDETERMINATE", async () => {
    const { reservation, receipt } = await committedFixture({
      seedStore: false,
    });
    assert.equal(receipt.verdict, 0);
    const decision = await composeEvidenceShapes({
      atomicReceipt: atomicReceiptValue(receipt),
      reservation,
    });
    assert.equal(field(decision, "verdict").value, 0);
    assert.equal(field(decision, "status").value, "EVIDENCE_COMPOSITION_UNRESOLVED");
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  it("fails closed for a changed atomic receipt digest", async () => {
    const { reservation, receipt } = await committedFixture();
    const atomicReceipt = atomicReceiptValue(receipt);
    atomicReceipt.fields.set("evidenceDigest", stringValue("00"));
    const decision = await composeEvidenceShapes({
      atomicReceipt,
      reservation,
    });
    assert.equal(field(decision, "verdict").value, -1);
    assert.equal(field(decision, "authorityReleased").value, false);
  });

  it("fails closed for a swapped evidence kind", async () => {
    const { reservation, receipt } = await committedFixture();
    const evidence = structuredClone(evidenceShapeSet);
    field(evidence, "receipts").items[0].fields.set("kindId", intValue(2));
    const decision = await composeEvidenceShapes({
      evidence,
      atomicReceipt: atomicReceiptValue(receipt),
      reservation,
    });
    assert.equal(field(decision, "verdict").value, -1);
    assert.equal(field(decision, "authorityReleased").value, false);
  });
});
