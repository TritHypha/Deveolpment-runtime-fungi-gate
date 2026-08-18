import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

export const ARTIFACT_REFERENCE_SCHEMA = "galerina.artifact-reference.v1" as const;
export const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024;

export type ArtifactOwner = "galerina" | "slide" | "lyth" | "vok" | "dfe" | "tower";
export type ArtifactKind =
  | "fungi-source"
  | "checked-module-snapshot"
  | "canonical-gir"
  | "physical-slide"
  | "lyth-evidence"
  | "vok-receipt";
export type Sha256Digest = `sha256:${string}`;

export interface ArtifactReferenceV1 {
  readonly schema: typeof ARTIFACT_REFERENCE_SCHEMA;
  readonly owner: ArtifactOwner;
  readonly kind: ArtifactKind;
  readonly digest: Sha256Digest;
  readonly byteLength: number;
}

export type ArtifactReferenceErrorCode =
  | "REFERENCE_TYPE"
  | "REFERENCE_KEYS"
  | "REFERENCE_DESCRIPTOR"
  | "REFERENCE_SCHEMA"
  | "REFERENCE_OWNER"
  | "REFERENCE_KIND"
  | "REFERENCE_DIGEST"
  | "REFERENCE_LENGTH"
  | "OWNER_KIND"
  | "REPOSITORY_OWNER"
  | "REPOSITORY_CAPABILITY"
  | "BODY_TYPE"
  | "BODY_MISSING"
  | "BODY_OVERSIZED"
  | "BODY_LENGTH"
  | "BODY_DIGEST"
  | "BACKEND_READ"
  | "BACKEND_WRITE"
  | "CAPABILITY_SPENT"
  | "TRANSFER_TYPE"
  | "TRANSFER_KEYS"
  | "TRANSFER_ROUTE"
  | "TRANSFER_ARTIFACT_OWNER"
  | "TRANSFER_PREREQUISITES"
  | "TRANSFER_OPERATION"
  | "TRANSFER_AUTHORITY"
  | "TRANSFER_RUN_IDENTITY"
  | "AUTHENTICATOR_CAPABILITY"
  | "AUTHENTICATOR_FAILED"
  | "RETENTION_REQUEST"
  | "RETENTION_CAPACITY"
  | "RECEIPT_TYPE"
  | "RECEIPT_KEYS"
  | "RECEIPT_FIELD"
  | "RECEIPT_BINDING"
  | "RECEIPT_AUTHENTICATOR"
  | "EVIDENCE_SET_TYPE"
  | "EVIDENCE_SET_KEYS"
  | "EVIDENCE_SET_FIELD"
  | "EVIDENCE_SET_ORDER"
  | "EVIDENCE_SET_BINDING"
  | "EVIDENCE_SET_AUTHENTICATION"
  | "VOK_ENVELOPE_TYPE"
  | "VOK_ENVELOPE_KEYS"
  | "VOK_ENVELOPE_FIELD"
  | "VOK_ENVELOPE_BINDING";

export class ArtifactReferenceError extends Error {
  readonly code: ArtifactReferenceErrorCode;

  constructor(code: ArtifactReferenceErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ArtifactReferenceError";
    this.code = code;
  }
}

const OWNERS = new Set<ArtifactOwner>(["galerina", "slide", "lyth", "vok", "dfe", "tower"]);
const KINDS = new Set<ArtifactKind>([
  "fungi-source",
  "checked-module-snapshot",
  "canonical-gir",
  "physical-slide",
  "lyth-evidence",
  "vok-receipt",
]);
const LEGAL_KINDS: Readonly<Record<ArtifactOwner, ReadonlySet<ArtifactKind>>> = {
  galerina: new Set(["fungi-source", "checked-module-snapshot", "canonical-gir"]),
  slide: new Set(["physical-slide"]),
  lyth: new Set(["lyth-evidence"]),
  vok: new Set(["vok-receipt"]),
  dfe: new Set(),
  tower: new Set(),
};
const REFERENCE_KEYS = ["byteLength", "digest", "kind", "owner", "schema"] as const;
export const ARTIFACT_SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function artifactReferenceFail(code: ArtifactReferenceErrorCode, message: string): never {
  throw new ArtifactReferenceError(code, message);
}

export function validArtifactMaximum(maxByteLength: number): number {
  if (!Number.isSafeInteger(maxByteLength) || maxByteLength < 0) {
    artifactReferenceFail("REFERENCE_LENGTH", "maximum byte length must be a non-negative safe integer");
  }
  return maxByteLength;
}

function exactDataValues(input: unknown): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input) || utilTypes.isProxy(input)) {
    artifactReferenceFail("REFERENCE_TYPE", "artifact reference must be an ordinary record");
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      artifactReferenceFail("REFERENCE_TYPE", "artifact reference must have an ordinary or null prototype");
    }
    const keys = Reflect.ownKeys(input);
    if (
      keys.length !== REFERENCE_KEYS.length
      || keys.some((key) => typeof key !== "string" || !REFERENCE_KEYS.includes(key as typeof REFERENCE_KEYS[number]))
      || REFERENCE_KEYS.some((key) => !keys.includes(key))
    ) {
      artifactReferenceFail("REFERENCE_KEYS", "artifact reference must contain exactly the five version-one fields");
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of REFERENCE_KEYS) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor)) {
        artifactReferenceFail("REFERENCE_DESCRIPTOR", `artifact reference field '${key}' must be own data`);
      }
      values[key] = descriptor.value;
    }
    return values;
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    artifactReferenceFail("REFERENCE_DESCRIPTOR", "artifact reference descriptors could not be captured");
  }
}

export function isArtifactOwner(value: unknown): value is ArtifactOwner {
  return typeof value === "string" && OWNERS.has(value as ArtifactOwner);
}

export function isArtifactKind(value: unknown): value is ArtifactKind {
  return typeof value === "string" && KINDS.has(value as ArtifactKind);
}

export function assertLegalArtifactOwnerKind(owner: ArtifactOwner, kind: ArtifactKind): void {
  if (!LEGAL_KINDS[owner].has(kind)) {
    artifactReferenceFail("OWNER_KIND", `owner '${owner}' cannot own artifact kind '${kind}' in schema v1`);
  }
}

export function validateArtifactReferenceV1(
  input: unknown,
  options: { readonly maxByteLength?: number } = {},
): ArtifactReferenceV1 {
  const maxByteLength = validArtifactMaximum(options.maxByteLength ?? MAX_ARTIFACT_BYTES);
  const values = exactDataValues(input);
  if (values["schema"] !== ARTIFACT_REFERENCE_SCHEMA) artifactReferenceFail("REFERENCE_SCHEMA", "unsupported artifact-reference schema");
  if (!isArtifactOwner(values["owner"])) artifactReferenceFail("REFERENCE_OWNER", "unknown artifact owner");
  if (!isArtifactKind(values["kind"])) artifactReferenceFail("REFERENCE_KIND", "unknown artifact kind");
  if (typeof values["digest"] !== "string" || !ARTIFACT_SHA256_PATTERN.test(values["digest"])) {
    artifactReferenceFail("REFERENCE_DIGEST", "digest must be canonical lowercase sha256 hex");
  }
  if (
    typeof values["byteLength"] !== "number"
    || !Number.isSafeInteger(values["byteLength"])
    || values["byteLength"] < 0
    || values["byteLength"] > maxByteLength
  ) {
    artifactReferenceFail("REFERENCE_LENGTH", "byte length is outside the admitted safe bound");
  }
  assertLegalArtifactOwnerKind(values["owner"], values["kind"]);
  return Object.freeze({
    schema: ARTIFACT_REFERENCE_SCHEMA,
    owner: values["owner"],
    kind: values["kind"],
    digest: values["digest"] as Sha256Digest,
    byteLength: values["byteLength"],
  });
}

export function captureImmutableBytes(input: unknown): Uint8Array {
  if (!(input instanceof Uint8Array)) artifactReferenceFail("BODY_TYPE", "artifact body must be a Uint8Array");
  if (typeof SharedArrayBuffer !== "undefined" && input.buffer instanceof SharedArrayBuffer) {
    artifactReferenceFail("BODY_TYPE", "shared artifact bytes require a separate admitted live-view contract");
  }
  try {
    const capturedLength = input.byteLength;
    const copy = new Uint8Array(capturedLength);
    copy.set(input);
    if (input.byteLength !== capturedLength || copy.byteLength !== capturedLength) {
      artifactReferenceFail("BODY_TYPE", "artifact byte view changed while it was captured");
    }
    return copy;
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    artifactReferenceFail("BODY_TYPE", "artifact byte view could not be captured");
  }
}

export function sha256ArtifactBytes(bytes: Uint8Array): Sha256Digest {
  const captured = captureImmutableBytes(bytes);
  return `sha256:${createHash("sha256").update(captured).digest("hex")}`;
}

export function verifyArtifactBytes(
  referenceInput: unknown,
  bytesInput: unknown,
  options: { readonly maxByteLength?: number } = {},
): Uint8Array {
  const maxByteLength = validArtifactMaximum(options.maxByteLength ?? MAX_ARTIFACT_BYTES);
  const reference = validateArtifactReferenceV1(referenceInput, { maxByteLength });
  const bytes = captureImmutableBytes(bytesInput);
  if (bytes.byteLength > maxByteLength) artifactReferenceFail("BODY_OVERSIZED", "artifact body exceeds the configured byte bound");
  if (bytes.byteLength !== reference.byteLength) artifactReferenceFail("BODY_LENGTH", "artifact body length does not match its reference");
  if (`sha256:${createHash("sha256").update(bytes).digest("hex")}` !== reference.digest) {
    artifactReferenceFail("BODY_DIGEST", "artifact body digest does not match its reference");
  }
  return bytes;
}
