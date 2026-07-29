/**
 * Minimal host-crypto floor for the SLIDE V2-B lease verifier.
 *
 * Canonicalization and policy stay in `.fungi`. This shim accepts only the
 * canonical bytes and exact bindings, verifies both Ed25519 and ML-DSA-65,
 * and returns a typed K3 receipt. It owns no key discovery, filesystem access,
 * lease issuance, admission composition, nonce state, or broker authority.
 */

import {
  createHash,
  verify as verifyEd25519,
} from "node:crypto";

const LEASE_SCHEMA_ID = "slide.capability.lease.v2b";
const RECEIPT_SCHEMA_ID = "slide.crypto.verifier-receipt.v1";
const VERIFIER_ID = "slide.crypto.hybrid-ed25519-mldsa65.v1";
const SIGNING_DOMAIN = "slide.capability.lease-signing.v2b";
const ML_DSA_CONTEXT = new TextEncoder().encode("slide.capability.lease.v2b");
const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
const ED25519_SIGNATURE_BYTES = 64;
const ML_DSA_65_SIGNATURE_BYTES = 3309;

export type SLIDEV2BCryptoVerdict = 1 | 0 | -1;

export interface SLIDEV2BHybridLeaseSignature {
  readonly schemaId: string;
  readonly signatureSuiteId: number;
  readonly signerRoleId: number;
  readonly keyId: string;
  readonly canonicalBytes: Uint8Array;
  readonly signedBytesDigest: string;
  readonly ed25519Signature: Uint8Array;
  readonly mlDsa65Signature: Uint8Array;
}

export interface SLIDEV2BCryptoVerifierPolicy {
  readonly expectedKeyId: string;
  readonly ed25519PublicKeyPem: string | undefined;
  readonly mlDsa65PublicKey: Uint8Array | undefined;
  readonly revokedKeyIds: ReadonlySet<string>;
  readonly verifiedAt: number;
}

export interface SLIDEV2BCryptoVerifierReceipt {
  readonly schemaId: typeof RECEIPT_SCHEMA_ID;
  readonly verifierId: typeof VERIFIER_ID;
  readonly signatureSuiteId: number;
  readonly signerRoleId: number;
  readonly keyId: string;
  readonly signedBytesDigest: string;
  readonly signatureDigest: string;
  readonly verdict: SLIDEV2BCryptoVerdict;
  readonly verifiedAt: number;
  readonly evidenceDigest: string;
}

function hashRaw(...parts: readonly Uint8Array[]): string {
  const digest = createHash("sha256");
  for (const part of parts) digest.update(part);
  return digest.digest("hex");
}

function hashFramed(domain: string, ...parts: readonly Uint8Array[]): string {
  const digest = createHash("sha256");
  for (const part of [utf8(`${domain}\0`), ...parts]) {
    const length = part.length;
    digest.update(
      Uint8Array.of(
        (length >>> 24) & 0xff,
        (length >>> 16) & 0xff,
        (length >>> 8) & 0xff,
        length & 0xff,
      ),
    );
    digest.update(part);
  }
  return digest.digest("hex");
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function boundedText(value: string, maximumCharacters: number): Uint8Array {
  if (value.length <= maximumCharacters) return utf8(value);
  return utf8(`OVERSIZE:${value.length}`);
}

function signingInput(canonicalBytes: Uint8Array): Uint8Array {
  const domain = utf8(`${SIGNING_DOMAIN}\0`);
  const input = new Uint8Array(domain.length + canonicalBytes.length);
  input.set(domain, 0);
  input.set(canonicalBytes, domain.length);
  return input;
}

function receipt(
  candidate: SLIDEV2BHybridLeaseSignature,
  policy: SLIDEV2BCryptoVerifierPolicy,
  verdict: SLIDEV2BCryptoVerdict,
): SLIDEV2BCryptoVerifierReceipt {
  const signatureShapeValid =
    candidate.ed25519Signature.length === ED25519_SIGNATURE_BYTES &&
    candidate.mlDsa65Signature.length === ML_DSA_65_SIGNATURE_BYTES;
  const signatureDigest = signatureShapeValid
    ? hashFramed(
        "slide.capability.lease-signatures.v2b",
        candidate.ed25519Signature,
        candidate.mlDsa65Signature,
      )
    : hashFramed(
        "slide.capability.lease-signatures-invalid-shape.v2b",
        utf8(String(candidate.ed25519Signature.length)),
        utf8(String(candidate.mlDsa65Signature.length)),
      );
  const evidenceDigest = hashFramed(
    "slide.crypto.verifier-evidence.v1",
    boundedText(candidate.schemaId, 64),
    utf8(String(candidate.signatureSuiteId)),
    utf8(String(candidate.signerRoleId)),
    boundedText(candidate.keyId, 128),
    boundedText(candidate.signedBytesDigest, 64),
    utf8(signatureDigest),
    utf8(String(verdict)),
    utf8(String(policy.verifiedAt)),
  );
  return {
    schemaId: RECEIPT_SCHEMA_ID,
    verifierId: VERIFIER_ID,
    signatureSuiteId: candidate.signatureSuiteId,
    signerRoleId: candidate.signerRoleId,
    keyId: candidate.keyId,
    signedBytesDigest: candidate.signedBytesDigest,
    signatureDigest,
    verdict,
    verifiedAt: policy.verifiedAt,
    evidenceDigest,
  };
}

/**
 * Verify the registered V2-B hybrid suite. Both signatures must verify over
 * `UTF8("slide.capability.lease-signing.v2b\\0") || canonicalBytes`.
 *
 * `0` means required verification evidence is unavailable. It is not a
 * fallback or partial success; the `.fungi` consumer terminates that path.
 */
export async function verifySLIDEV2BHybridLeaseSignature(
  candidate: SLIDEV2BHybridLeaseSignature,
  policy: SLIDEV2BCryptoVerifierPolicy,
): Promise<SLIDEV2BCryptoVerifierReceipt> {
  const malformed =
    candidate.schemaId !== LEASE_SCHEMA_ID ||
    candidate.signatureSuiteId !== 1 ||
    candidate.signerRoleId !== 1 ||
    candidate.keyId.length < 1 ||
    candidate.keyId.length > 128 ||
    candidate.canonicalBytes.length < 1 ||
    candidate.canonicalBytes.length > 4096 ||
    candidate.signedBytesDigest.length !== 64 ||
    candidate.ed25519Signature.length !== ED25519_SIGNATURE_BYTES ||
    candidate.mlDsa65Signature.length !== ML_DSA_65_SIGNATURE_BYTES ||
    !Number.isSafeInteger(policy.verifiedAt) ||
    policy.verifiedAt < 0;
  if (malformed) return receipt(candidate, policy, -1);

  const input = signingInput(candidate.canonicalBytes);
  if (hashRaw(input) !== candidate.signedBytesDigest) {
    return receipt(candidate, policy, -1);
  }
  if (
    candidate.keyId !== policy.expectedKeyId ||
    policy.revokedKeyIds.has(candidate.keyId)
  ) {
    return receipt(candidate, policy, -1);
  }
  if (
    policy.ed25519PublicKeyPem === undefined ||
    policy.mlDsa65PublicKey === undefined
  ) {
    return receipt(candidate, policy, 0);
  }
  if (policy.mlDsa65PublicKey.length !== ML_DSA_65_PUBLIC_KEY_BYTES) {
    return receipt(candidate, policy, -1);
  }

  try {
    const ed25519Allowed = verifyEd25519(
      null,
      input as unknown as BufferSource,
      { key: policy.ed25519PublicKeyPem },
      candidate.ed25519Signature as unknown as BufferSource,
    );
    if (!ed25519Allowed) return receipt(candidate, policy, -1);

    const { ml_dsa65 } = await import("@noble/post-quantum/ml-dsa.js") as {
      ml_dsa65: {
        verify(
          signature: Uint8Array,
          message: Uint8Array,
          publicKey: Uint8Array,
          options?: { context?: Uint8Array },
        ): boolean;
      };
    };
    const mlDsaAllowed = ml_dsa65.verify(
      candidate.mlDsa65Signature,
      input,
      policy.mlDsa65PublicKey,
      { context: ML_DSA_CONTEXT },
    );
    return receipt(candidate, policy, mlDsaAllowed ? 1 : -1);
  } catch {
    return receipt(candidate, policy, -1);
  }
}
