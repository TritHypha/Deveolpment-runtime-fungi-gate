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

let parsed;
let capabilitySet;
let leaseFixture;
let leaseSigningEvidence;
let hybridCandidate;
let hybridPolicy;
let hybridSigningInput;
let hybridMLSecretKey;

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

before(async () => {
  const requestSource = await readFile(SOURCE, "utf8");
  const leaseSource = await readFile(LEASE_SOURCE, "utf8");
  const leaseCanonicalSource = await readFile(LEASE_CANONICAL_SOURCE, "utf8");
  const source = [
    requestSource,
    leaseSource.replace(/^@version 1\r?\n/, ""),
    leaseCanonicalSource.replace(/^@version 1\r?\n/, ""),
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
