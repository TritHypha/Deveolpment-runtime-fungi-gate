import assert from "node:assert/strict";
import {
  createHash,
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

import {
  deriveFungiExecutionStatement,
  deriveHostOwnershipStatement,
  validateFungiExecutionStatement,
  validateHostOwnershipStatement,
} from "../lib/post-slide-authority-receipts.mjs";
import { verifyPostSlideAuthorityLedgerEntries } from "../lib/post-slide-authority-ledger.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const compilerRequire = createRequire(
  join(ROOT, "packages-galerina", "galerina-core-compiler", "package.json"),
);
const { ml_dsa65: mlDsa65 } = await import(
  pathToFileURL(compilerRequire.resolve("@noble/post-quantum/ml-dsa.js")).href
);

const sha = (digit) => digit.repeat(64);

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

function signHybrid(message, key, context) {
  return {
    algorithm: "hybrid-ed25519-mldsa65",
    canon: "galerina-canonical-json-v1",
    context,
    keyId: key.keyId,
    ed25519Signature: signEd25519(null, Buffer.from(message), key.edPrivate).toString("base64"),
    mlDsa65Signature: Buffer.from(mlDsa65.sign(message, key.mlPrivate, {
      context: new TextEncoder().encode(context),
    })).toString("base64"),
  };
}

function fungiInput() {
  return {
    releaseId: "beta-v1",
    repositoryCommit: "a".repeat(40),
    receiptSerial: 7,
    issuedAt: "2026-08-02T10:00:00.000Z",
    expiresAt: "2026-08-03T10:00:00.000Z",
    ownerPackage: "galerina-core-sentinel-state",
    sourcePath: "packages-galerina/galerina-core-sentinel-state/src/self-hosted/cold-boot.fungi",
    sourceSha256: sha("1"),
    frontendReceiptSha256: sha("2"),
    decisionGraphSha256: sha("3"),
    compilerSha256: sha("4"),
    girSha256: sha("5"),
    slideContractSha256: sha("6"),
    targetSha256: sha("7"),
    policySha256: sha("8"),
    verifierSha256: sha("9"),
    objectSha256: sha("a"),
    admissionSha256: sha("b"),
    leaseReceiptSha256: sha("c"),
    terminalReceiptSha256: sha("d"),
    platformEvidenceSha256: sha("e"),
    evidenceBundleSha256: sha("f"),
  };
}

function hostInput() {
  return {
    releaseId: "beta-v1",
    repositoryCommit: "a".repeat(40),
    receiptSerial: 9,
    issuedAt: "2026-08-02T10:00:00.000Z",
    expiresAt: "2026-08-03T10:00:00.000Z",
    ownerPackage: "galerina-tools-myco",
    sourcePath: "packages-galerina/galerina-tools-myco/src/query/regex-worker.js",
    sourceSha256: sha("1"),
    boundaryKind: "isolated-worker",
    capabilityPolicySha256: sha("2"),
    leastAuthorityPolicySha256: sha("3"),
    disposition: "retain",
    replacementId: "NONE",
    targetSha256: sha("4"),
    platformEvidenceSha256: sha("5"),
    isolationEvidenceSha256: sha("6"),
    cleanupEvidenceSha256: sha("7"),
    ownershipReceiptSha256: sha("8"),
    evidenceBundleSha256: sha("9"),
  };
}

test("derives and validates one exact Fungi execution statement", () => {
  const input = fungiInput();
  const statement = deriveFungiExecutionStatement(input);
  assert.equal(statement.predicateType, "https://galerina.dev/attestation/post-slide-fungi-execution/v1");
  assert.equal(statement.subject[0].digest.sha256, input.evidenceBundleSha256);
  assert.equal(validateFungiExecutionStatement(statement, input), statement);
  assert.equal(Object.isFrozen(statement.predicate), true);
});

test("Fungi execution refuses a wrong path, digest, subject or surplus field", () => {
  const sourceBytes = Buffer.from("@version 1.0.0\nflow example() -> I32 { return 1 }\n", "utf8");
  const evidenceBytes = Buffer.from("typed terminal evidence bytes\n", "utf8");
  const input = {
    ...fungiInput(),
    sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
    evidenceBundleSha256: createHash("sha256").update(evidenceBytes).digest("hex"),
  };
  assert.throws(
    () => deriveFungiExecutionStatement({ ...input, sourcePath: "packages-galerina/other/src/x.fungi" }),
    /POST_SLIDE_FUNGI_INPUT_REFUSED/,
  );
  assert.throws(
    () => deriveFungiExecutionStatement({
      ...input,
      sourcePath: `${input.sourcePath.split("/src/")[0]}/src/../escape.fungi`,
    }),
    /POST_SLIDE_FUNGI_INPUT_REFUSED/,
  );
  assert.throws(
    () => deriveFungiExecutionStatement({ ...input, sourceSha256: "F".repeat(64) }),
    /POST_SLIDE_FUNGI_INPUT_REFUSED/,
  );
  const wrongSubject = structuredClone(deriveFungiExecutionStatement(input));
  wrongSubject.subject[0].digest.sha256 = sha("0");
  assert.throws(
    () => validateFungiExecutionStatement(wrongSubject, input),
    /POST_SLIDE_FUNGI_STATEMENT_REFUSED/,
  );
  assert.throws(
    () => deriveFungiExecutionStatement({ ...input, trusted: true }),
    /POST_SLIDE_FUNGI_INPUT_REFUSED/,
  );
});

test("derives and validates one exact host-boundary ownership statement", () => {
  const input = hostInput();
  const statement = deriveHostOwnershipStatement(input);
  assert.equal(statement.predicateType, "https://galerina.dev/attestation/post-slide-host-ownership/v1");
  assert.equal(statement.subject[0].digest.sha256, input.evidenceBundleSha256);
  assert.equal(validateHostOwnershipStatement(statement, input), statement);
});

test("host ownership refuses ambiguous disposition, time, kind and owner", () => {
  const input = hostInput();
  assert.throws(
    () => deriveHostOwnershipStatement({ ...input, disposition: "replace", replacementId: "NONE" }),
    /POST_SLIDE_HOST_INPUT_REFUSED/,
  );
  assert.throws(
    () => deriveHostOwnershipStatement({ ...input, expiresAt: input.issuedAt }),
    /POST_SLIDE_HOST_INPUT_REFUSED/,
  );
  assert.throws(
    () => deriveHostOwnershipStatement({ ...input, boundaryKind: "anything" }),
    /POST_SLIDE_HOST_INPUT_REFUSED/,
  );
  assert.throws(
    () => deriveHostOwnershipStatement({ ...input, ownerPackage: "galerina-other" }),
    /POST_SLIDE_HOST_INPUT_REFUSED/,
  );
});

test("a Fungi predicate becomes usable only after the existing hybrid root delegation and envelope verify", () => {
  const root = hybridKey("1111111111111111");
  const operational = hybridKey("2222222222222222");
  const operationalEdDer = createPublicKey(operational.edPublicPem)
    .export({ type: "spki", format: "der" });
  const delegationBase = {
    schema: "galerina.release-evidence.delegation.v1",
    releaseId: "beta-v1",
    serial: 1,
    issuedAt: "2026-08-02T09:00:00.000Z",
    notBefore: "2026-08-02T09:00:00.000Z",
    notAfter: "2026-08-03T09:00:00.000Z",
    rootKeyId: root.keyId,
    operational: {
      keyId: operational.keyId,
      ed25519Sha256: createHash("sha256").update(operationalEdDer).digest("hex"),
      mlDsa65Sha256: createHash("sha256").update(operational.mlPublic).digest("hex"),
      roles: [RELEASE_EVIDENCE_ROLE.DURABILITY, RELEASE_EVIDENCE_ROLE.REPOSITORY],
    },
  };
  const delegation = {
    ...delegationBase,
    signature: signHybrid(
      releaseEvidenceDelegationPreimage(delegationBase),
      root,
      "galerina.release.evidence.delegation.sig.v1",
    ),
  };
  const publicBundle = (key) => ({
    keyId: key.keyId,
    ed25519PublicKeyPem: key.edPublicPem,
    mlDsa65PublicKey: key.mlPublic,
  });
  const verifiedDelegation = verifyReleaseEvidenceDelegation(delegation, {
    releaseId: "beta-v1",
    expectedRootKeyId: root.keyId,
    minimumSerial: 1,
    at: "2026-08-02T10:00:00.000Z",
    rootPublicBundle: publicBundle(root),
    operationalPublicBundle: publicBundle(operational),
    isRevoked: () => false,
  });
  const sourceBytes = Buffer.from("@version 1.0.0\nflow example() -> I32 { return 1 }\n", "utf8");
  const evidenceBytes = Buffer.from("typed terminal evidence bytes\n", "utf8");
  const input = {
    ...fungiInput(),
    sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
    evidenceBundleSha256: createHash("sha256").update(evidenceBytes).digest("hex"),
  };
  const statement = deriveFungiExecutionStatement(input);
  const envelope = {
    schema: "galerina.release-evidence.envelope.v1",
    statement,
    signature: signHybrid(
      releaseEvidenceStatementPreimage(statement, RELEASE_EVIDENCE_ROLE.REPOSITORY),
      operational,
      "galerina.release.evidence.repository.sig.v1",
    ),
  };
  const verified = verifyReleaseEvidenceEnvelope(envelope, {
    role: RELEASE_EVIDENCE_ROLE.REPOSITORY,
    at: "2026-08-02T10:00:00.000Z",
    delegation: verifiedDelegation,
    operationalPublicBundle: publicBundle(operational),
    isRevoked: () => false,
  });
  assert.equal(validateFungiExecutionStatement(verified.statement, input), verified.statement);

  const envelopeBytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  const evidencePath = "docs/security/post-slide-authority-receipts/example.evidence.bin";
  const envelopePath = "docs/security/post-slide-authority-receipts/example.envelope.json";
  const artifacts = new Map([
    [input.sourcePath, sourceBytes],
    [evidencePath, evidenceBytes],
    [envelopePath, envelopeBytes],
  ]);
  const result = verifyPostSlideAuthorityLedgerEntries({
    authority: {
      verifiedDelegation,
      operationalPublicBundle: publicBundle(operational),
      verificationTime: "2026-08-02T10:00:00.000Z",
      minimumReceiptSerial: 1,
      isRevoked: () => false,
    },
    fungiSources: [{
      ...input,
      state: "executed",
      evidencePath,
      envelopePath,
      envelopeSha256: createHash("sha256").update(envelopeBytes).digest("hex"),
    }],
    hostBridges: [],
    repositoryCommit: input.repositoryCommit,
    trackedPaths: new Set(artifacts.keys()),
    readArtifact: (path) => artifacts.get(path),
  });
  assert.deepEqual(result.fungiSources, [input.sourcePath]);
  assert.deepEqual(result.hostBridges, []);

  const accessorEntries = [];
  Object.defineProperty(accessorEntries, "0", {
    enumerable: true,
    configurable: true,
    get: () => ({
      ...input,
      state: "executed",
      evidencePath,
      envelopePath,
      envelopeSha256: createHash("sha256").update(envelopeBytes).digest("hex"),
    }),
  });
  accessorEntries.length = 1;
  assert.throws(
    () => verifyPostSlideAuthorityLedgerEntries({
      authority: {
        verifiedDelegation,
        operationalPublicBundle: publicBundle(operational),
        verificationTime: "2026-08-02T10:00:00.000Z",
        minimumReceiptSerial: 1,
        isRevoked: () => false,
      },
      fungiSources: accessorEntries,
      hostBridges: [],
      repositoryCommit: input.repositoryCommit,
      trackedPaths: new Set(artifacts.keys()),
      readArtifact: (path) => artifacts.get(path),
    }),
    /POST_SLIDE_AUTHORITY_LEDGER_REFUSED/,
  );

  artifacts.set(evidencePath, Buffer.from("mutated evidence\n"));
  assert.throws(
    () => verifyPostSlideAuthorityLedgerEntries({
      authority: {
        verifiedDelegation,
        operationalPublicBundle: publicBundle(operational),
        verificationTime: "2026-08-02T10:00:00.000Z",
        minimumReceiptSerial: 1,
        isRevoked: () => false,
      },
      fungiSources: [{
        ...input,
        state: "executed",
        evidencePath,
        envelopePath,
        envelopeSha256: createHash("sha256").update(envelopeBytes).digest("hex"),
      }],
      hostBridges: [],
      repositoryCommit: input.repositoryCommit,
      trackedPaths: new Set(artifacts.keys()),
      readArtifact: (path) => artifacts.get(path),
    }),
    /POST_SLIDE_FUNGI_ENTRY_REFUSED/,
  );

  const forged = structuredClone(envelope);
  const bytes = Buffer.from(forged.signature.mlDsa65Signature, "base64");
  bytes[0] ^= 1;
  forged.signature.mlDsa65Signature = bytes.toString("base64");
  assert.throws(
    () => verifyReleaseEvidenceEnvelope(forged, {
      role: RELEASE_EVIDENCE_ROLE.REPOSITORY,
      at: "2026-08-02T10:00:00.000Z",
      delegation: verifiedDelegation,
      operationalPublicBundle: publicBundle(operational),
      isRevoked: () => false,
    }),
    /RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED/,
  );
});
