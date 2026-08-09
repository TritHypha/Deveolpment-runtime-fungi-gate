import { generateKeyPairSync, sign } from "node:crypto";

const SIGNATURE_SUITE = "hybrid-ed25519-ml-dsa-65.v1";

export function createDisposableSlideObjectAuthenticator(hybrid, candidate) {
  const ed25519 = generateKeyPairSync("ed25519");
  const mldsa65 = generateKeyPairSync("ml-dsa-65");
  const statement = hybrid.encodeHybridObjectAuthenticationStatement({
    keyId: "galerina-disposable-slide-test-key-0001",
    signatureSuiteId: SIGNATURE_SUITE,
    role: "slide.object-producer.v1",
    objectDigest: hybrid.digestAuthenticatedObjectBytes(candidate.objectBytes),
    packageSetDigest: candidate.packageSetDigest,
    packageIdentity: candidate.packageIdentity,
    exportName: candidate.exportName,
    compilerProfileId: candidate.compilerProfileId,
    toolManifestDigest: candidate.toolManifestDigest,
    issuedEpoch: 10,
    expiresEpoch: 20,
    revocationGeneration: 3,
  });
  if (statement.verdict !== 1) return Object.freeze({ verdict: -1, openHandle: null });
  const signatures = Object.freeze({
    ed25519: new Uint8Array(sign(null, statement.signingBytes, ed25519.privateKey)),
    mldsa65: new Uint8Array(sign(null, statement.signingBytes, mldsa65.privateKey)),
  });
  const trust = Object.freeze({
    keyId: "galerina-disposable-slide-test-key-0001",
    signatureSuiteId: SIGNATURE_SUITE,
    ed25519PublicKey: ed25519.publicKey,
    mldsa65PublicKey: mldsa65.publicKey,
    ed25519Fingerprint: hybrid.fingerprintAuthenticationPublicKey(ed25519.publicKey),
    mldsa65Fingerprint: hybrid.fingerprintAuthenticationPublicKey(mldsa65.publicKey),
    minIssuedEpoch: 10,
    maxExpiresEpoch: 20,
    minRevocationGeneration: 3,
  });
  return Object.freeze({
    verdict: 1,
    openHandle() {
      return hybrid.verifyHybridObjectAuthentication({
        objectBytes: candidate.objectBytes,
        statementBytes: statement.statementBytes,
        signatures,
        trust,
        currentEpoch: 15,
        authenticationVerdict: 1,
        revocationVerdict: 1,
      });
    },
  });
}
