import assert from "node:assert/strict";
import {
  createPublicKey,
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
  releaseEvidenceDelegationPreimage,
  releaseEvidenceStatementPreimage,
  verifyReleaseEvidenceDelegation,
  verifyReleaseEvidenceEnvelope,
} from "../lib/beta-release-evidence-envelope.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(
    compilerRequire.resolve("@noble/post-quantum/ml-dsa.js"),
  ).href
);

const AT = "2026-08-02T12:00:00.000Z";

function hybridKey(keyId) {
  const ed = generateKeyPairSync("ed25519");
  const seed = randomBytes(32);
  const ml = mlDsa65.keygen(seed);
  return {
    keyId,
    edPrivate: ed.privateKey,
    edPublicPem: ed.publicKey.export({ type: "spki", format: "pem" }).toString(),
    mlPrivate: ml.secretKey,
    mlPublic: ml.publicKey,
  };
}

function sha256PublicKey(key) {
  const { createHash } = compilerRequire("node:crypto");
  return createHash("sha256").update(key).digest("hex");
}

function signHybrid(message, key, context) {
  return {
    ed25519Signature: signEd25519(
      null,
      Buffer.from(message),
      key.edPrivate,
    ).toString("base64"),
    mlDsa65Signature: Buffer.from(
      mlDsa65.sign(message, key.mlPrivate, {
        context: new TextEncoder().encode(context),
      }),
    ).toString("base64"),
  };
}

function fixture() {
  const root = hybridKey("1111111111111111");
  const operational = hybridKey("2222222222222222");
  const delegationBase = {
    schema: "galerina.release-evidence.delegation.v1",
    releaseId: "beta-v1",
    serial: 1,
    issuedAt: "2026-08-02T10:00:00.000Z",
    notBefore: "2026-08-02T10:00:00.000Z",
    notAfter: "2026-08-03T10:00:00.000Z",
    rootKeyId: root.keyId,
    operational: {
      keyId: operational.keyId,
      ed25519Sha256: sha256PublicKey(
        createPublicKey(operational.edPublicPem).export({ type: "spki", format: "der" }),
      ),
      mlDsa65Sha256: sha256PublicKey(operational.mlPublic),
      roles: [
        RELEASE_EVIDENCE_ROLE.DURABILITY,
        RELEASE_EVIDENCE_ROLE.REPOSITORY,
      ],
    },
  };
  const delegation = {
    ...delegationBase,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: "galerina.release.evidence.delegation.sig.v1",
      keyId: root.keyId,
      ...signHybrid(
        releaseEvidenceDelegationPreimage(delegationBase),
        root,
        "galerina.release.evidence.delegation.sig.v1",
      ),
    },
  };
  const statement = {
    _type: "https://in-toto.io/Statement/v1",
    subject: [{
      name: "galerina/test-subject",
      digest: { sha256: "a".repeat(64) },
    }],
    predicateType: "https://galerina.dev/attestation/repository-fixed-point/v1",
    predicate: { schema: "test-only.v1" },
  };
  const envelope = {
    schema: "galerina.release-evidence.envelope.v1",
    statement,
    signature: {
      algorithm: "hybrid-ed25519-mldsa65",
      canon: "galerina-canonical-json-v1",
      context: "galerina.release.evidence.repository.sig.v1",
      keyId: operational.keyId,
      ...signHybrid(
        releaseEvidenceStatementPreimage(
          statement,
          RELEASE_EVIDENCE_ROLE.REPOSITORY,
        ),
        operational,
        "galerina.release.evidence.repository.sig.v1",
      ),
    },
  };
  return { root, operational, delegation, envelope };
}

function publicOptions(value, overrides = {}) {
  return {
    releaseId: "beta-v1",
    expectedRootKeyId: value.root.keyId,
    minimumSerial: 1,
    at: AT,
    rootPublicBundle: {
      keyId: value.root.keyId,
      ed25519PublicKeyPem: value.root.edPublicPem,
      mlDsa65PublicKey: value.root.mlPublic,
    },
    operationalPublicBundle: {
      keyId: value.operational.keyId,
      ed25519PublicKeyPem: value.operational.edPublicPem,
      mlDsa65PublicKey: value.operational.mlPublic,
    },
    isRevoked: () => false,
    ...overrides,
  };
}

function verifyDelegation(value, overrides = {}) {
  return verifyReleaseEvidenceDelegation(
    value.delegation,
    publicOptions(value, overrides),
  );
}

function envelopeOptions(value, delegation, overrides = {}) {
  return {
    role: RELEASE_EVIDENCE_ROLE.REPOSITORY,
    at: AT,
    delegation,
    operationalPublicBundle: {
      keyId: value.operational.keyId,
      ed25519PublicKeyPem: value.operational.edPublicPem,
      mlDsa65PublicKey: value.operational.mlPublic,
    },
    isRevoked: () => false,
    ...overrides,
  };
}

test("a statement requires a root-delegated two-component role signature", () => {
  const value = fixture();
  const verifiedDelegation = verifyDelegation(value);
  const verified = verifyReleaseEvidenceEnvelope(value.envelope, {
    ...envelopeOptions(value, verifiedDelegation),
  });
  assert.deepEqual(verified.statement, value.envelope.statement);
  assert.equal(Object.isFrozen(verified.statement), true);
  assert.equal(verified.role, RELEASE_EVIDENCE_ROLE.REPOSITORY);
  assert.equal(verified.keyId, value.operational.keyId);
  assert.equal(Object.isFrozen(verified), true);
});

test("delegation rejects either forged signature component", () => {
  for (const field of ["ed25519Signature", "mlDsa65Signature"]) {
    const value = fixture();
    const bytes = Buffer.from(value.delegation.signature[field], "base64");
    bytes[0] ^= 1;
    value.delegation.signature[field] = bytes.toString("base64");
    assert.throws(
      () => verifyDelegation(value),
      /RELEASE_EVIDENCE_DELEGATION_SIGNATURE_REFUSED/u,
    );
  }
});

test("statement rejects either forged signature component and wrong role context", () => {
  for (const field of ["ed25519Signature", "mlDsa65Signature"]) {
    const value = fixture();
    const delegation = verifyDelegation(value);
    const bytes = Buffer.from(value.envelope.signature[field], "base64");
    bytes[bytes.length - 1] ^= 1;
    value.envelope.signature[field] = bytes.toString("base64");
    assert.throws(
      () => verifyReleaseEvidenceEnvelope(
        value.envelope,
        envelopeOptions(value, delegation),
      ),
      /RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED/u,
    );
  }

  const wrongRole = fixture();
  const delegation = verifyDelegation(wrongRole);
  assert.throws(
    () => verifyReleaseEvidenceEnvelope(
      wrongRole.envelope,
      envelopeOptions(wrongRole, delegation, {
        role: RELEASE_EVIDENCE_ROLE.DURABILITY,
      }),
    ),
    /RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED/u,
  );
});

test("delegation policy fails closed on key, serial, time and revocation", () => {
  const wrongKey = fixture();
  assert.throws(
    () => verifyDelegation(wrongKey, { expectedRootKeyId: "f".repeat(16) }),
    /RELEASE_EVIDENCE_DELEGATION_POLICY_REFUSED/u,
  );

  const staleSerial = fixture();
  assert.throws(
    () => verifyDelegation(staleSerial, { minimumSerial: 2 }),
    /RELEASE_EVIDENCE_DELEGATION_POLICY_REFUSED/u,
  );

  const expired = fixture();
  assert.throws(
    () => verifyDelegation(expired, { at: "2026-08-04T00:00:00.000Z" }),
    /RELEASE_EVIDENCE_DELEGATION_INACTIVE/u,
  );

  const revoked = fixture();
  assert.throws(
    () => verifyDelegation(revoked, {
      isRevoked: (keyId) => keyId === revoked.operational.keyId,
    }),
    /RELEASE_EVIDENCE_DELEGATION_REVOKED/u,
  );
});

test("canonical boundary refuses proxies, accessors and sparse arrays", () => {
  const proxied = fixture();
  proxied.envelope.statement = new Proxy(proxied.envelope.statement, {});
  assert.throws(
    () => releaseEvidenceStatementPreimage(
      proxied.envelope.statement,
      RELEASE_EVIDENCE_ROLE.REPOSITORY,
    ),
    /RELEASE_EVIDENCE_CANONICAL_TYPE/u,
  );

  const accessor = { safe: "value" };
  Object.defineProperty(accessor, "unsafe", {
    enumerable: true,
    get: () => "value",
  });
  assert.throws(
    () => releaseEvidenceStatementPreimage(
      accessor,
      RELEASE_EVIDENCE_ROLE.REPOSITORY,
    ),
    /RELEASE_EVIDENCE_CANONICAL_OBJECT/u,
  );

  const sparse = [];
  sparse.length = 1;
  assert.throws(
    () => releaseEvidenceStatementPreimage(
      sparse,
      RELEASE_EVIDENCE_ROLE.REPOSITORY,
    ),
    /RELEASE_EVIDENCE_CANONICAL_ARRAY/u,
  );
});
