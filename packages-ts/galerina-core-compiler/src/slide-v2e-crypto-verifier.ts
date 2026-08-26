/**
 * Minimal host-crypto floor for SLIDE V2-E frontend producer evidence.
 *
 * Canonicalization, semantic import, plan comparison, source mapping, and
 * policy remain in `.fungi`. This shim performs only the registered hybrid
 * signature primitive over caller-supplied canonical receipt bytes.
 */

import {
  createHash,
  verify as verifyEd25519,
} from "node:crypto";

const SIGNATURE_SCHEMA_ID = "slide.frontend.signature.v1";
const RECEIPT_SCHEMA_ID = "slide.frontend.crypto-verifier-receipt.v1";
const VERIFIER_ID = "slide.crypto.frontend-hybrid-ed25519-mldsa65.v1";
const SIGNING_DOMAIN = "slide.frontend.galerina.v1";
const ML_DSA_CONTEXT = new TextEncoder().encode("slide.frontend.galerina.v1");
const FRONTEND_EVIDENCE_ROLE_ID = 2;
const DEVELOPMENT_KEY_CLASS_ID = 1;
const PRODUCTION_KEY_CLASS_ID = 2;
const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
const ED25519_SIGNATURE_BYTES = 64;
const ML_DSA_65_SIGNATURE_BYTES = 3309;

export type SLIDEV2ECryptoVerdict = 1 | 0 | -1;

export interface SLIDEV2EHybridFrontendSignature {
  readonly schemaId: string;
  readonly signatureSuiteId: number;
  readonly signerRoleId: number;
  readonly keyClassId: number;
  readonly keyId: string;
  readonly canonicalBytes: Uint8Array;
  readonly receiptDigest: string;
  readonly ed25519Signature: Uint8Array;
  readonly mlDsa65Signature: Uint8Array;
}

export interface SLIDEV2ECryptoVerifierPolicy {
  readonly expectedKeyId: string;
  readonly ed25519PublicKeyPem: string | undefined;
  readonly mlDsa65PublicKey: Uint8Array | undefined;
  readonly revokedKeyIds: ReadonlySet<string>;
  readonly verifiedAt: number;
  readonly productionPolicy: boolean;
}

export interface SLIDEV2ECryptoVerifierReceipt {
  readonly schemaId: typeof RECEIPT_SCHEMA_ID;
  readonly verifierId: typeof VERIFIER_ID;
  readonly signatureSuiteId: number;
  readonly signerRoleId: number;
  readonly keyClassId: number;
  readonly keyId: string;
  readonly subjectReceiptDigest: string;
  readonly signatureDigest: string;
  readonly verdict: SLIDEV2ECryptoVerdict;
  readonly verifiedAt: number;
  readonly evidenceDigest: string;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
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

function boundedText(value: string, maximumCharacters: number): Uint8Array {
  return value.length <= maximumCharacters
    ? utf8(value)
    : utf8(`OVERSIZE:${value.length}`);
}

function signingInput(canonicalBytes: Uint8Array): Uint8Array {
  const domain = utf8(`${SIGNING_DOMAIN}\0`);
  const input = new Uint8Array(domain.length + canonicalBytes.length);
  input.set(domain, 0);
  input.set(canonicalBytes, domain.length);
  return input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCandidate(
  value: unknown,
): SLIDEV2EHybridFrontendSignature {
  const candidate = isRecord(value) ? value : {};
  return {
    schemaId:
      typeof candidate.schemaId === "string" ? candidate.schemaId : "",
    signatureSuiteId: Number.isSafeInteger(candidate.signatureSuiteId)
      ? candidate.signatureSuiteId as number
      : -1,
    signerRoleId: Number.isSafeInteger(candidate.signerRoleId)
      ? candidate.signerRoleId as number
      : -1,
    keyClassId: Number.isSafeInteger(candidate.keyClassId)
      ? candidate.keyClassId as number
      : -1,
    keyId: typeof candidate.keyId === "string" ? candidate.keyId : "",
    canonicalBytes: candidate.canonicalBytes instanceof Uint8Array
      ? candidate.canonicalBytes
      : new Uint8Array(),
    receiptDigest:
      typeof candidate.receiptDigest === "string"
        ? candidate.receiptDigest
        : "",
    ed25519Signature: candidate.ed25519Signature instanceof Uint8Array
      ? candidate.ed25519Signature
      : new Uint8Array(),
    mlDsa65Signature: candidate.mlDsa65Signature instanceof Uint8Array
      ? candidate.mlDsa65Signature
      : new Uint8Array(),
  };
}

function normalizePolicy(value: unknown): SLIDEV2ECryptoVerifierPolicy {
  const policy = isRecord(value) ? value : {};
  return {
    expectedKeyId:
      typeof policy.expectedKeyId === "string" ? policy.expectedKeyId : "",
    ed25519PublicKeyPem:
      typeof policy.ed25519PublicKeyPem === "string"
        ? policy.ed25519PublicKeyPem
        : undefined,
    mlDsa65PublicKey:
      policy.mlDsa65PublicKey instanceof Uint8Array
        ? policy.mlDsa65PublicKey
        : undefined,
    revokedKeyIds:
      policy.revokedKeyIds instanceof Set
        ? new Set(policy.revokedKeyIds)
        : new Set<string>(),
    verifiedAt: Number.isSafeInteger(policy.verifiedAt)
      ? policy.verifiedAt as number
      : 0,
    productionPolicy:
      typeof policy.productionPolicy === "boolean"
        ? policy.productionPolicy
        : true,
  };
}

function candidateRuntimeShapeValid(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.schemaId === "string"
    && Number.isSafeInteger(value.signatureSuiteId)
    && Number.isSafeInteger(value.signerRoleId)
    && Number.isSafeInteger(value.keyClassId)
    && typeof value.keyId === "string"
    && value.canonicalBytes instanceof Uint8Array
    && typeof value.receiptDigest === "string"
    && value.ed25519Signature instanceof Uint8Array
    && value.mlDsa65Signature instanceof Uint8Array
  );
}

function policyRuntimeShapeValid(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.expectedKeyId === "string"
    && (
      value.ed25519PublicKeyPem === undefined
      || typeof value.ed25519PublicKeyPem === "string"
    )
    && (
      value.mlDsa65PublicKey === undefined
      || value.mlDsa65PublicKey instanceof Uint8Array
    )
    && value.revokedKeyIds instanceof Set
    && Number.isSafeInteger(value.verifiedAt)
    && typeof value.productionPolicy === "boolean"
  );
}

function makeReceipt(
  candidate: SLIDEV2EHybridFrontendSignature,
  policy: SLIDEV2ECryptoVerifierPolicy,
  verdict: SLIDEV2ECryptoVerdict,
): SLIDEV2ECryptoVerifierReceipt {
  const signatureShapeValid =
    candidate.ed25519Signature.length === ED25519_SIGNATURE_BYTES &&
    candidate.mlDsa65Signature.length === ML_DSA_65_SIGNATURE_BYTES;
  const signatureDigest = signatureShapeValid
    ? hashFramed(
        "slide.frontend.signatures.v1",
        candidate.ed25519Signature,
        candidate.mlDsa65Signature,
      )
    : hashFramed(
        "slide.frontend.signatures-invalid-shape.v1",
        utf8(String(candidate.ed25519Signature.length)),
        utf8(String(candidate.mlDsa65Signature.length)),
      );
  const evidenceDigest = hashFramed(
    "slide.frontend.crypto-verifier-evidence.v1",
    utf8(RECEIPT_SCHEMA_ID),
    utf8(VERIFIER_ID),
    utf8(String(candidate.signatureSuiteId)),
    utf8(String(candidate.signerRoleId)),
    utf8(String(candidate.keyClassId)),
    boundedText(candidate.keyId, 128),
    boundedText(candidate.receiptDigest, 64),
    utf8(signatureDigest),
    utf8(String(verdict)),
    utf8(String(policy.verifiedAt)),
    utf8(policy.productionPolicy ? "production" : "development"),
  );
  return {
    schemaId: RECEIPT_SCHEMA_ID,
    verifierId: VERIFIER_ID,
    signatureSuiteId: candidate.signatureSuiteId,
    signerRoleId: candidate.signerRoleId,
    keyClassId: candidate.keyClassId,
    keyId: candidate.keyId,
    subjectReceiptDigest: candidate.receiptDigest,
    signatureDigest,
    verdict,
    verifiedAt: policy.verifiedAt,
    evidenceDigest,
  };
}

/**
 * Verify both registered signatures over
 * `UTF8("slide.frontend.galerina.v1\\0") || canonicalBytes`.
 *
 * `0` means required key evidence is unavailable. It never means partial
 * success and the `.fungi` consumer terminates that trust path.
 */
export async function verifySLIDEV2EHybridFrontendSignature(
  candidate: SLIDEV2EHybridFrontendSignature,
  policy: SLIDEV2ECryptoVerifierPolicy,
): Promise<SLIDEV2ECryptoVerifierReceipt> {
  let candidateShapeValid = false;
  let policyShapeValid = false;
  try {
    candidateShapeValid = candidateRuntimeShapeValid(candidate);
    policyShapeValid = policyRuntimeShapeValid(policy);
    candidate = normalizeCandidate(candidate);
    policy = normalizePolicy(policy);
  } catch {
    candidate = normalizeCandidate(undefined);
    policy = normalizePolicy(undefined);
  }
  if (!candidateShapeValid || !policyShapeValid) {
    return makeReceipt(candidate, policy, -1);
  }
  const keyClassValid =
    candidate.keyClassId === DEVELOPMENT_KEY_CLASS_ID ||
    candidate.keyClassId === PRODUCTION_KEY_CLASS_ID;
  const malformed =
    candidate.schemaId !== SIGNATURE_SCHEMA_ID ||
    candidate.signatureSuiteId !== 1 ||
    candidate.signerRoleId !== FRONTEND_EVIDENCE_ROLE_ID ||
    !keyClassValid ||
    candidate.keyId.length < 1 ||
    candidate.keyId.length > 128 ||
    candidate.canonicalBytes.length < 1 ||
    candidate.canonicalBytes.length > 8192 ||
    candidate.receiptDigest.length !== 64 ||
    candidate.ed25519Signature.length !== ED25519_SIGNATURE_BYTES ||
    candidate.mlDsa65Signature.length !== ML_DSA_65_SIGNATURE_BYTES ||
    !Number.isSafeInteger(policy.verifiedAt) ||
    policy.verifiedAt < 0;
  if (malformed) return makeReceipt(candidate, policy, -1);

  const input = signingInput(candidate.canonicalBytes);
  if (hashRaw(input) !== candidate.receiptDigest) {
    return makeReceipt(candidate, policy, -1);
  }
  if (
    candidate.keyId !== policy.expectedKeyId ||
    policy.revokedKeyIds.has(candidate.keyId) ||
    (policy.productionPolicy &&
      candidate.keyClassId !== PRODUCTION_KEY_CLASS_ID)
  ) {
    return makeReceipt(candidate, policy, -1);
  }
  if (
    policy.ed25519PublicKeyPem === undefined ||
    policy.mlDsa65PublicKey === undefined
  ) {
    return makeReceipt(candidate, policy, 0);
  }
  if (policy.mlDsa65PublicKey.length !== ML_DSA_65_PUBLIC_KEY_BYTES) {
    return makeReceipt(candidate, policy, -1);
  }

  try {
    const ed25519Allowed = verifyEd25519(
      null,
      input as unknown as BufferSource,
      { key: policy.ed25519PublicKeyPem },
      candidate.ed25519Signature as unknown as BufferSource,
    );
    if (!ed25519Allowed) return makeReceipt(candidate, policy, -1);

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
    return makeReceipt(candidate, policy, mlDsaAllowed ? 1 : -1);
  } catch {
    return makeReceipt(candidate, policy, -1);
  }
}
