import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { types as utilTypes } from "node:util";

import {
  ARTIFACT_REFERENCE_SCHEMA,
  ARTIFACT_SHA256_PATTERN as SHA256,
  ArtifactReferenceError,
  MAX_ARTIFACT_BYTES,
  artifactReferenceFail as fail,
  assertLegalArtifactOwnerKind as assertLegalOwnerKind,
  captureImmutableBytes as ownedBytes,
  isArtifactKind as isKind,
  isArtifactOwner as isOwner,
  sha256ArtifactBytes as sha256,
  validArtifactMaximum as validMaximum,
  validateArtifactReferenceV1,
  verifyArtifactBytes,
  type ArtifactKind,
  type ArtifactOwner,
  type ArtifactReferenceErrorCode,
  type ArtifactReferenceV1,
  type Sha256Digest,
} from "./artifact-reference-core.js";

export {
  ARTIFACT_REFERENCE_SCHEMA,
  ArtifactReferenceError,
  MAX_ARTIFACT_BYTES,
  validateArtifactReferenceV1,
  verifyArtifactBytes,
};
export type {
  ArtifactKind,
  ArtifactOwner,
  ArtifactReferenceErrorCode,
  ArtifactReferenceV1,
  Sha256Digest,
};

export const COMPUTE_TRANSFER_SCHEMA = "galerina.compute-transfer.v1" as const;
export const AUTHENTICATED_COMPUTE_TRANSFER_SCHEMA = "galerina.authenticated-compute-transfer.v1" as const;
export const STAGE_RECEIPT_SCHEMA = "galerina.stage-receipt.v1" as const;
export const STAGE_EVIDENCE_SET_SCHEMA = "vok.stage-evidence-set.v1" as const;

export interface ComputeTransferV1 {
  readonly schema: typeof COMPUTE_TRANSFER_SCHEMA;
  readonly fromOwner: ArtifactOwner;
  readonly toOwner: ArtifactOwner;
  readonly artifact: ArtifactReferenceV1;
  readonly prerequisiteDigests: readonly Sha256Digest[];
  readonly operationId: string;
  readonly runIdentity: Sha256Digest;
  readonly authorityEpoch: number;
  readonly authorityContextDigest: Sha256Digest;
}

export interface ComputeTransferRunIdentityInputV1 {
  readonly operationId: string;
  readonly initialArtifact: ArtifactReferenceV1;
  readonly authorityEpoch: number;
  readonly authorityContextDigest: Sha256Digest;
}

export interface ComputeTransferSigner {
  readonly id: string;
  sign(bytes: Uint8Array): Promise<Uint8Array>;
}

export interface ComputeTransferVerifier {
  readonly id: string;
  verify(bytes: Uint8Array, signature: Uint8Array): Promise<boolean>;
}

export interface AuthenticatedComputeTransferV1 {
  readonly schema: typeof AUTHENTICATED_COMPUTE_TRANSFER_SCHEMA;
  readonly transfer: ComputeTransferV1;
  readonly transferDigest: Sha256Digest;
  readonly authenticatorId: string;
  readonly authentication: string;
}

export interface AuthorityObservationV1 {
  readonly epoch: number;
  readonly contextDigest: Sha256Digest;
}

export interface StageReceiptInputV1 {
  readonly owner: ArtifactOwner;
  readonly stage: string;
  readonly runIdentity: Sha256Digest;
  readonly authorityEpoch: number;
  readonly authorityContextDigest: Sha256Digest;
  readonly inputDigest: Sha256Digest;
  readonly outputDigest: Sha256Digest;
  readonly evidenceDigest: Sha256Digest;
}

export interface StageReceiptSigner extends StageReceiptSignerIdentity {
  sign(bytes: Uint8Array): Promise<Uint8Array>;
}

export interface StageReceiptVerifier extends StageReceiptSignerIdentity {
  verify(bytes: Uint8Array, signature: Uint8Array): Promise<boolean>;
}

export interface StageReceiptSignerIdentity {
  readonly id: string;
  readonly owner: ArtifactOwner;
  readonly authorityEpoch: number;
  readonly authorityContextDigest: Sha256Digest;
}

export interface StageReceiptV1 extends StageReceiptInputV1 {
  readonly schema: typeof STAGE_RECEIPT_SCHEMA;
  readonly signerId: string;
  readonly receiptDigest: Sha256Digest;
  readonly authentication: string;
}

export interface StageEvidenceSetV1 {
  readonly schema: typeof STAGE_EVIDENCE_SET_SCHEMA;
  readonly runIdentity: Sha256Digest;
  readonly authorityEpoch: number;
  readonly authorityContextDigest: Sha256Digest;
  readonly stages: readonly string[];
  readonly receiptDigests: readonly Sha256Digest[];
  readonly evidenceSetDigest: Sha256Digest;
}

export interface VokEnvelopeV1 {
  readonly schemaVersion: 1;
  readonly componentDigest: Sha256Digest;
  readonly policyDigest: Sha256Digest;
  readonly target: string;
  readonly abi: string;
  readonly dependencyClosureDigest: Sha256Digest;
  readonly capabilityDigest: Sha256Digest;
  readonly buildPoint: `git:${string}`;
  readonly epoch: number;
  readonly evidenceSetDigest: Sha256Digest;
}

export type StageReceiptVerification =
  | Readonly<{ verified: true; receipt: StageReceiptV1 }>
  | Readonly<{
      verified: false;
      code: "RECEIPT_INVALID" | "RECEIPT_AUTHENTICATION_INVALID" | "RECEIPT_AUTHENTICATOR_FAILED";
    }>;

export type ComputeTransferStageCompletion =
  | Readonly<{ completed: true; receipt: StageReceiptV1 }>
  | Readonly<{
      completed: false;
      code:
        | "RETENTION_LAPSED"
        | "RETENTION_RELEASE_FAILED"
        | "TERMINAL_AUTHORITY_UNAVAILABLE"
        | "TERMINAL_AUTHORITY_ROTATED"
        | "RECEIPT_INVALID"
        | "RECEIPT_AUTHENTICATION_INVALID"
        | "RECEIPT_AUTHENTICATOR_FAILED"
        | "RECEIPT_BINDING";
    }>;

export type ComputeTransferAdmissionCode =
  | "ENVELOPE_INVALID"
  | "AUTHENTICATION_INVALID"
  | "AUTHENTICATOR_FAILED"
  | "AUTHORITY_UNAVAILABLE"
  | "AUTHORITY_ROTATED"
  | "RETENTION_UNAVAILABLE"
  | "TRANSFER_REPLAY";

declare const ARTIFACT_RETENTION_HANDLE: unique symbol;
export interface ArtifactRetentionHandle {
  readonly [ARTIFACT_RETENTION_HANDLE]: never;
}

export interface ArtifactRetentionRequestV1 {
  readonly reference: ArtifactReferenceV1;
  readonly runIdentity: Sha256Digest;
  readonly acquirerId: string;
  readonly expiresAt: number;
}

export interface ArtifactRetentionAcquireCapability<O extends ArtifactOwner> {
  readonly owner: O;
  acquire(request: ArtifactRetentionRequestV1): Promise<ArtifactRetentionHandle>;
}

export interface ArtifactRetentionLedger<O extends ArtifactOwner> {
  readonly owner: O;
  readonly capability: ArtifactRetentionAcquireCapability<O>;
  continuity(handle: ArtifactRetentionHandle, acquirerId: string): boolean;
  release(handle: ArtifactRetentionHandle, acquirerId: string): boolean;
  isPinned(reference: ArtifactReferenceV1 & { readonly owner: O }): boolean;
}

export type ComputeTransferAdmission =
  | Readonly<{
      accepted: true;
      queued: true;
      executionAuthorized: false;
      transfer: ComputeTransferV1;
      transferDigest: Sha256Digest;
      retentionHandle: ArtifactRetentionHandle;
    }>
  | Readonly<{ accepted: false; code: ComputeTransferAdmissionCode }>;

export interface ComputeTransferReceiver {
  admit(envelope: unknown): Promise<ComputeTransferAdmission>;
}

export interface OwnedArtifactRepository<O extends ArtifactOwner> {
  readonly owner: O;
  read(reference: ArtifactReferenceV1 & { readonly owner: O }): Promise<Uint8Array>;
  write(kind: ArtifactKind, bytes: Uint8Array): Promise<ArtifactReferenceV1 & { readonly owner: O }>;
}

const GIT_BUILD_POINT = /^git:[0-9a-f]{40}$/;

interface CapturedReadRepository {
  readonly owner: ArtifactOwner;
  readonly read: (reference: ArtifactReferenceV1) => Promise<Uint8Array>;
}

function captureReadRepository(repository: unknown): CapturedReadRepository {
  if (typeof repository !== "object" || repository === null) {
    fail("REPOSITORY_CAPABILITY", "artifact repository must be an object capability");
  }
  try {
    const owner = Reflect.get(repository, "owner") as unknown;
    const read = Reflect.get(repository, "read") as unknown;
    if (!isOwner(owner) || typeof read !== "function") {
      fail("REPOSITORY_CAPABILITY", "artifact repository must expose one known owner and read function");
    }
    return Object.freeze({
      owner,
      read: (read as (reference: ArtifactReferenceV1) => Promise<Uint8Array>).bind(repository),
    });
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("REPOSITORY_CAPABILITY", "artifact repository capability could not be captured");
  }
}

async function readCaptured(
  repository: CapturedReadRepository,
  reference: ArtifactReferenceV1,
  maxByteLength: number,
): Promise<Uint8Array> {
  let bytes: unknown;
  try {
    bytes = await repository.read(reference);
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("BACKEND_READ", "artifact backend refused or failed its read");
  }
  return verifyArtifactBytes(reference, bytes, { maxByteLength });
}

export async function readVerifiedArtifact(
  repositoryInput: unknown,
  referenceInput: unknown,
  options: { readonly maxByteLength?: number } = {},
): Promise<Uint8Array> {
  const maxByteLength = validMaximum(options.maxByteLength ?? MAX_ARTIFACT_BYTES);
  const reference = validateArtifactReferenceV1(referenceInput, { maxByteLength });
  const repository = captureReadRepository(repositoryInput);
  if (repository.owner !== reference.owner) fail("REPOSITORY_OWNER", "repository owner does not match artifact owner");
  return readCaptured(repository, reference, maxByteLength);
}

export function createOneReferenceReadCapability(
  repositoryInput: unknown,
  referenceInput: unknown,
  options: { readonly maxByteLength?: number } = {},
): () => Promise<Uint8Array> {
  const maxByteLength = validMaximum(options.maxByteLength ?? MAX_ARTIFACT_BYTES);
  const reference = validateArtifactReferenceV1(referenceInput, { maxByteLength });
  const repository = captureReadRepository(repositoryInput);
  if (repository.owner !== reference.owner) fail("REPOSITORY_OWNER", "repository owner does not match artifact owner");
  let spent = false;
  return Object.freeze(async (): Promise<Uint8Array> => {
    if (spent) fail("CAPABILITY_SPENT", "one-reference read capability has already been consumed");
    spent = true;
    return readCaptured(repository, reference, maxByteLength);
  });
}

export function artifactReferencesEqual(leftInput: unknown, rightInput: unknown): boolean {
  const left = validateArtifactReferenceV1(leftInput);
  const right = validateArtifactReferenceV1(rightInput);
  return left.schema === right.schema
    && left.owner === right.owner
    && left.kind === right.kind
    && left.digest === right.digest
    && left.byteLength === right.byteLength;
}

function captureExactFields(
  input: unknown,
  keys: readonly string[],
  typeCode: ArtifactReferenceErrorCode,
  keysCode: ArtifactReferenceErrorCode,
  descriptorCode: ArtifactReferenceErrorCode,
  label: string,
): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input) || utilTypes.isProxy(input)) {
    fail(typeCode, `${label} must be an ordinary record`);
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      fail(typeCode, `${label} must have an ordinary or null prototype`);
    }
    const ownKeys = Reflect.ownKeys(input);
    if (
      ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
      || keys.some((key) => !ownKeys.includes(key))
    ) {
      fail(keysCode, `${label} has missing, surplus, or symbolic fields`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor)) {
        fail(descriptorCode, `${label} field '${key}' must be own data`);
      }
      values[key] = descriptor.value;
    }
    return values;
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail(descriptorCode, `${label} fields could not be captured`);
  }
}

function validateDigest(value: unknown, code: ArtifactReferenceErrorCode, label: string): Sha256Digest {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code, `${label} must be canonical lowercase sha256 hex`);
  return value as Sha256Digest;
}

function validateOperationId(value: unknown): string {
  if (typeof value !== "string") fail("TRANSFER_OPERATION", "operationId must be a string");
  const byteLength = new TextEncoder().encode(value).byteLength;
  if (byteLength === 0 || byteLength > 1024) fail("TRANSFER_OPERATION", "operationId must occupy 1..1024 UTF-8 bytes");
  return value;
}

function validateAuthorityEpoch(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail("TRANSFER_AUTHORITY", "authority epoch must be a non-negative safe integer");
  }
  return value;
}

function capturePrerequisiteDigests(value: unknown): readonly Sha256Digest[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    fail("TRANSFER_PREREQUISITES", "prerequisiteDigests must be an ordinary dense array");
  }
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
      fail("TRANSFER_PREREQUISITES", "prerequisiteDigests length must be own data");
    }
    const length = lengthDescriptor.value as unknown;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > 64) {
      fail("TRANSFER_PREREQUISITES", "prerequisiteDigests exceeds the 64-entry bound");
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length !== length + 1 || !keys.includes("length")) {
      fail("TRANSFER_PREREQUISITES", "prerequisiteDigests must be dense and contain no surplus fields");
    }
    const out: Sha256Digest[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !("value" in descriptor)) {
        fail("TRANSFER_PREREQUISITES", "prerequisiteDigests entries must be own data");
      }
      out.push(validateDigest(descriptor.value, "TRANSFER_PREREQUISITES", `prerequisiteDigests[${index}]`));
    }
    if (new Set(out).size !== out.length) fail("TRANSFER_PREREQUISITES", "duplicate prerequisite digests are refused");
    return Object.freeze(out);
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("TRANSFER_PREREQUISITES", "prerequisiteDigests could not be captured");
  }
}

function encodeU64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  let remaining = BigInt(value);
  for (let index = 7; index >= 0; index -= 1) {
    out[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

function frame(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    if (part.byteLength > 0xffff_ffff) fail("TRANSFER_OPERATION", "canonical field exceeds the u32 framing bound");
    total += 4 + part.byteLength;
  }
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let offset = 0;
  for (const part of parts) {
    view.setUint32(offset, part.byteLength, false);
    offset += 4;
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

function deriveRunIdentity(
  operationId: string,
  artifact: ArtifactReferenceV1,
  authorityEpoch: number,
  authorityContextDigest: Sha256Digest,
): Sha256Digest {
  return sha256(frame([
    utf8("galerina.compute-transfer.run-identity.v1"),
    utf8(operationId),
    utf8(artifact.owner),
    utf8(artifact.kind),
    utf8(artifact.digest),
    encodeU64(artifact.byteLength),
    encodeU64(authorityEpoch),
    utf8(authorityContextDigest),
  ]));
}

export function createComputeTransferRunIdentity(input: ComputeTransferRunIdentityInputV1): Sha256Digest {
  const values = captureExactFields(
    input,
    ["operationId", "initialArtifact", "authorityEpoch", "authorityContextDigest"],
    "TRANSFER_TYPE",
    "TRANSFER_KEYS",
    "TRANSFER_KEYS",
    "compute-transfer run identity input",
  );
  const operationId = validateOperationId(values["operationId"]);
  const artifact = validateArtifactReferenceV1(values["initialArtifact"]);
  const authorityEpoch = validateAuthorityEpoch(values["authorityEpoch"]);
  const contextDigest = validateDigest(values["authorityContextDigest"], "TRANSFER_AUTHORITY", "authority context digest");
  return deriveRunIdentity(operationId, artifact, authorityEpoch, contextDigest);
}

const TRANSFER_KEYS = [
  "artifact",
  "authorityContextDigest",
  "authorityEpoch",
  "fromOwner",
  "operationId",
  "prerequisiteDigests",
  "runIdentity",
  "schema",
  "toOwner",
] as const;

export function validateComputeTransferV1(input: unknown): ComputeTransferV1 {
  const values = captureExactFields(
    input,
    TRANSFER_KEYS,
    "TRANSFER_TYPE",
    "TRANSFER_KEYS",
    "TRANSFER_KEYS",
    "compute transfer",
  );
  if (values["schema"] !== COMPUTE_TRANSFER_SCHEMA) fail("TRANSFER_TYPE", "unsupported compute-transfer schema");
  if (!isOwner(values["fromOwner"]) || !isOwner(values["toOwner"])) {
    fail("TRANSFER_ROUTE", "compute-transfer owners are not recognized");
  }
  if (values["fromOwner"] === values["toOwner"]) fail("TRANSFER_ROUTE", "compute transfer must cross an owner boundary");
  const artifact = validateArtifactReferenceV1(values["artifact"]);
  if (artifact.owner !== values["fromOwner"]) {
    fail("TRANSFER_ARTIFACT_OWNER", "the sending owner must own the transferred artifact");
  }
  const prerequisites = capturePrerequisiteDigests(values["prerequisiteDigests"]);
  const operationId = validateOperationId(values["operationId"]);
  const authorityEpoch = validateAuthorityEpoch(values["authorityEpoch"]);
  const contextDigest = validateDigest(values["authorityContextDigest"], "TRANSFER_AUTHORITY", "authority context digest");
  const runIdentity = validateDigest(values["runIdentity"], "TRANSFER_RUN_IDENTITY", "run identity");
  if (runIdentity !== deriveRunIdentity(operationId, artifact, authorityEpoch, contextDigest)) {
    fail("TRANSFER_RUN_IDENTITY", "run identity is not bound to this operation, artifact, and authority observation");
  }
  return Object.freeze({
    schema: COMPUTE_TRANSFER_SCHEMA,
    fromOwner: values["fromOwner"],
    toOwner: values["toOwner"],
    artifact,
    prerequisiteDigests: prerequisites,
    operationId,
    runIdentity,
    authorityEpoch,
    authorityContextDigest: contextDigest,
  });
}

export function canonicalComputeTransferBytes(input: unknown): Uint8Array {
  const transfer = validateComputeTransferV1(input);
  return frame([
    utf8(COMPUTE_TRANSFER_SCHEMA),
    utf8(transfer.fromOwner),
    utf8(transfer.toOwner),
    utf8(transfer.artifact.schema),
    utf8(transfer.artifact.owner),
    utf8(transfer.artifact.kind),
    utf8(transfer.artifact.digest),
    encodeU64(transfer.artifact.byteLength),
    encodeU64(transfer.prerequisiteDigests.length),
    ...transfer.prerequisiteDigests.map(utf8),
    utf8(transfer.operationId),
    utf8(transfer.runIdentity),
    encodeU64(transfer.authorityEpoch),
    utf8(transfer.authorityContextDigest),
  ]);
}

export function computeTransferDigest(input: unknown): Sha256Digest {
  return sha256(canonicalComputeTransferBytes(input));
}

function captureAuthenticatorId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || utf8(value).byteLength > 256) {
    fail("AUTHENTICATOR_CAPABILITY", "authenticator id must occupy 1..256 UTF-8 bytes");
  }
  return value;
}

export async function authenticateComputeTransferV1(
  transferInput: unknown,
  signerInput: unknown,
): Promise<AuthenticatedComputeTransferV1> {
  const transfer = validateComputeTransferV1(transferInput);
  if (typeof signerInput !== "object" || signerInput === null) {
    fail("AUTHENTICATOR_CAPABILITY", "compute-transfer signer must be an object capability");
  }
  let id: string;
  let sign: (bytes: Uint8Array) => Promise<Uint8Array>;
  try {
    id = captureAuthenticatorId(Reflect.get(signerInput, "id"));
    const candidate = Reflect.get(signerInput, "sign") as unknown;
    if (typeof candidate !== "function") fail("AUTHENTICATOR_CAPABILITY", "compute-transfer signer lacks sign capability");
    sign = (candidate as (bytes: Uint8Array) => Promise<Uint8Array>).bind(signerInput);
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("AUTHENTICATOR_CAPABILITY", "compute-transfer signer could not be captured");
  }
  const canonical = canonicalComputeTransferBytes(transfer);
  let signature: Uint8Array;
  try {
    signature = ownedBytes(await sign(canonical.slice()));
  } catch {
    fail("AUTHENTICATOR_FAILED", "compute-transfer signer failed");
  }
  if (signature.byteLength === 0 || signature.byteLength > 4096) {
    fail("AUTHENTICATOR_FAILED", "compute-transfer authentication has invalid length");
  }
  return Object.freeze({
    schema: AUTHENTICATED_COMPUTE_TRANSFER_SCHEMA,
    transfer,
    transferDigest: sha256(canonical),
    authenticatorId: id,
    authentication: Buffer.from(signature).toString("base64"),
  });
}

function decodeCanonicalBase64(value: unknown): Uint8Array | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 8192) return undefined;
  try {
    const bytes = Buffer.from(value, "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > 4096 || bytes.toString("base64") !== value) return undefined;
    return ownedBytes(bytes);
  } catch {
    return undefined;
  }
}

function validateAuthenticatedEnvelope(input: unknown): AuthenticatedComputeTransferV1 & { readonly signatureBytes: Uint8Array } {
  const values = captureExactFields(
    input,
    ["authentication", "authenticatorId", "schema", "transfer", "transferDigest"],
    "TRANSFER_TYPE",
    "TRANSFER_KEYS",
    "TRANSFER_KEYS",
    "authenticated compute-transfer envelope",
  );
  if (values["schema"] !== AUTHENTICATED_COMPUTE_TRANSFER_SCHEMA) fail("TRANSFER_TYPE", "unsupported authenticated transfer schema");
  const transfer = validateComputeTransferV1(values["transfer"]);
  const transferDigest = validateDigest(values["transferDigest"], "TRANSFER_RUN_IDENTITY", "transfer digest");
  if (transferDigest !== computeTransferDigest(transfer)) fail("TRANSFER_RUN_IDENTITY", "transfer digest does not match canonical transfer bytes");
  const authenticatorId = captureAuthenticatorId(values["authenticatorId"]);
  const signatureBytes = decodeCanonicalBase64(values["authentication"]);
  if (signatureBytes === undefined) fail("AUTHENTICATOR_FAILED", "transfer authentication is not canonical base64");
  return Object.freeze({
    schema: AUTHENTICATED_COMPUTE_TRANSFER_SCHEMA,
    transfer,
    transferDigest,
    authenticatorId,
    authentication: values["authentication"] as string,
    signatureBytes,
  });
}

function captureAuthorityObservation(input: unknown): AuthorityObservationV1 {
  const values = captureExactFields(
    input,
    ["contextDigest", "epoch"],
    "TRANSFER_TYPE",
    "TRANSFER_KEYS",
    "TRANSFER_KEYS",
    "authority observation",
  );
  return Object.freeze({
    epoch: validateAuthorityEpoch(values["epoch"]),
    contextDigest: validateDigest(values["contextDigest"], "TRANSFER_AUTHORITY", "authority context digest"),
  });
}

function validateAcquirerId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || utf8(value).byteLength > 256) {
    fail("RETENTION_REQUEST", "retention acquirer id must occupy 1..256 UTF-8 bytes");
  }
  return value;
}

function referenceIdentity(reference: ArtifactReferenceV1): string {
  return `${reference.owner}\0${reference.kind}\0${reference.digest}`;
}

export function createArtifactRetentionLedger<O extends ArtifactOwner>(options: {
  readonly owner: O;
  readonly now: () => number;
  readonly maxRetentionMs: number;
  readonly maxPins?: number;
}): ArtifactRetentionLedger<O> {
  let owner: O;
  let now: () => number;
  let maxRetentionMs: number;
  let maxPins: number;
  try {
    const ownerInput = Reflect.get(options, "owner") as unknown;
    const nowInput = Reflect.get(options, "now") as unknown;
    const retentionInput = Reflect.get(options, "maxRetentionMs") as unknown;
    const maxPinsInput = Reflect.get(options, "maxPins") as unknown;
    if (!isOwner(ownerInput) || typeof nowInput !== "function") throw new Error("retention capability");
    if (typeof retentionInput !== "number" || !Number.isSafeInteger(retentionInput) || retentionInput < 1) {
      fail("RETENTION_REQUEST", "maximum retention duration must be a positive safe integer");
    }
    const capturedMaxPins = maxPinsInput === undefined ? 1024 : maxPinsInput;
    if (typeof capturedMaxPins !== "number" || !Number.isSafeInteger(capturedMaxPins) || capturedMaxPins < 1) {
      fail("RETENTION_REQUEST", "maximum pin count must be a positive safe integer");
    }
    owner = ownerInput as O;
    now = (nowInput as () => number).bind(options);
    maxRetentionMs = retentionInput;
    maxPins = capturedMaxPins;
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("RETENTION_REQUEST", "retention ledger options could not be captured");
  }

  type RecordV1 = {
    readonly referenceIdentity: string;
    readonly runIdentity: Sha256Digest;
    readonly acquirerId: string;
    readonly expiresAt: number;
  };
  const records = new Map<object, RecordV1>();
  const completed = new WeakMap<object, string>();

  const currentTime = (): number => {
    let value: unknown;
    try { value = now(); } catch { fail("RETENTION_REQUEST", "retention clock failed"); }
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
      fail("RETENTION_REQUEST", "retention clock must return a non-negative safe integer");
    }
    return value;
  };

  const acquire = async (requestInput: ArtifactRetentionRequestV1): Promise<ArtifactRetentionHandle> => {
    const values = captureExactFields(
      requestInput,
      ["acquirerId", "expiresAt", "reference", "runIdentity"],
      "RETENTION_REQUEST",
      "RETENTION_REQUEST",
      "RETENTION_REQUEST",
      "retention request",
    );
    const reference = validateArtifactReferenceV1(values["reference"]);
    if (reference.owner !== owner) fail("REPOSITORY_OWNER", "retention owner does not own the referenced artifact");
    const runIdentity = validateDigest(values["runIdentity"], "RETENTION_REQUEST", "retention run identity");
    const acquirerId = validateAcquirerId(values["acquirerId"]);
    const expiresAt = values["expiresAt"];
    const observedNow = currentTime();
    if (
      typeof expiresAt !== "number"
      || !Number.isSafeInteger(expiresAt)
      || expiresAt <= observedNow
      || expiresAt - observedNow > maxRetentionMs
    ) {
      fail("RETENTION_REQUEST", "retention expiry is outside the admitted bounded interval");
    }
    if (records.size >= maxPins) fail("RETENTION_CAPACITY", "retention ledger pin bound is exhausted");
    const handle = Object.freeze(Object.create(null)) as ArtifactRetentionHandle;
    records.set(handle as object, {
      referenceIdentity: referenceIdentity(reference),
      runIdentity,
      acquirerId,
      expiresAt,
    });
    return handle;
  };

  const continuity = (handle: ArtifactRetentionHandle, acquirerIdInput: string): boolean => {
    let acquirerId: string;
    try { acquirerId = validateAcquirerId(acquirerIdInput); } catch { return false; }
    const record = records.get(handle as object);
    if (record === undefined || record.acquirerId !== acquirerId) return false;
    let observedNow: number;
    try { observedNow = currentTime(); } catch { return false; }
    if (observedNow >= record.expiresAt) {
      records.delete(handle as object);
      completed.set(handle as object, record.acquirerId);
      return false;
    }
    return true;
  };

  const release = (handle: ArtifactRetentionHandle, acquirerIdInput: string): boolean => {
    let acquirerId: string;
    try { acquirerId = validateAcquirerId(acquirerIdInput); } catch { return false; }
    const record = records.get(handle as object);
    if (record === undefined) return completed.get(handle as object) === acquirerId;
    if (record.acquirerId !== acquirerId) return false;
    records.delete(handle as object);
    completed.set(handle as object, record.acquirerId);
    return true;
  };

  const isPinned = (referenceInput: ArtifactReferenceV1 & { readonly owner: O }): boolean => {
    let reference: ArtifactReferenceV1;
    try { reference = validateArtifactReferenceV1(referenceInput); } catch { return false; }
    if (reference.owner !== owner) return false;
    const identity = referenceIdentity(reference);
    for (const [handle, record] of records) {
      if (record.referenceIdentity === identity && continuity(handle as ArtifactRetentionHandle, record.acquirerId)) return true;
    }
    return false;
  };

  const capability = Object.freeze({ owner, acquire });
  return Object.freeze({ owner, capability, continuity, release, isPinned });
}

const refused = (code: ComputeTransferAdmissionCode): Readonly<{ accepted: false; code: ComputeTransferAdmissionCode }> =>
  Object.freeze({ accepted: false, code });

export function createComputeTransferReceiver(options: {
  readonly verifier: ComputeTransferVerifier;
  readonly observeAuthority: () => AuthorityObservationV1 | Promise<AuthorityObservationV1>;
  readonly retention: ArtifactRetentionAcquireCapability<ArtifactOwner>;
  readonly acquirerId: string;
  readonly retentionExpiresAt: () => number;
}): ComputeTransferReceiver {
  let verifierId: string;
  let verify: (bytes: Uint8Array, signature: Uint8Array) => Promise<boolean>;
  let observeAuthority: () => AuthorityObservationV1 | Promise<AuthorityObservationV1>;
  let retentionOwner: ArtifactOwner;
  let acquireRetention: (request: ArtifactRetentionRequestV1) => Promise<ArtifactRetentionHandle>;
  let acquirerId: string;
  let retentionExpiresAt: () => number;
  try {
    const verifierInput = Reflect.get(options, "verifier") as unknown;
    if (typeof verifierInput !== "object" || verifierInput === null) throw new Error("verifier");
    verifierId = captureAuthenticatorId(Reflect.get(verifierInput, "id"));
    const verifyInput = Reflect.get(verifierInput, "verify") as unknown;
    const observeInput = Reflect.get(options, "observeAuthority") as unknown;
    const retentionInput = Reflect.get(options, "retention") as unknown;
    const acquirerInput = Reflect.get(options, "acquirerId") as unknown;
    const expiresInput = Reflect.get(options, "retentionExpiresAt") as unknown;
    if (typeof retentionInput !== "object" || retentionInput === null) throw new Error("retention");
    const retentionOwnerInput = Reflect.get(retentionInput, "owner") as unknown;
    const acquireInput = Reflect.get(retentionInput, "acquire") as unknown;
    if (
      typeof verifyInput !== "function"
      || typeof observeInput !== "function"
      || !isOwner(retentionOwnerInput)
      || typeof acquireInput !== "function"
      || typeof expiresInput !== "function"
    ) throw new Error("capability");
    verify = (verifyInput as (bytes: Uint8Array, signature: Uint8Array) => Promise<boolean>).bind(verifierInput);
    observeAuthority = (observeInput as () => AuthorityObservationV1 | Promise<AuthorityObservationV1>).bind(options);
    retentionOwner = retentionOwnerInput;
    acquireRetention = (acquireInput as (request: ArtifactRetentionRequestV1) => Promise<ArtifactRetentionHandle>).bind(retentionInput);
    acquirerId = validateAcquirerId(acquirerInput);
    retentionExpiresAt = (expiresInput as () => number).bind(options);
  } catch {
    fail("AUTHENTICATOR_CAPABILITY", "compute-transfer receiver capabilities could not be captured");
  }

  const accepted = new Set<string>();
  const pending = new Set<string>();
  const admit = async (envelopeInput: unknown): Promise<ComputeTransferAdmission> => {
    let envelope: ReturnType<typeof validateAuthenticatedEnvelope>;
    try {
      envelope = validateAuthenticatedEnvelope(envelopeInput);
    } catch {
      return refused("ENVELOPE_INVALID");
    }
    const replayKey = `${envelope.transfer.runIdentity}\0${envelope.transfer.operationId}\0${envelope.transferDigest}`;
    if (accepted.has(replayKey) || pending.has(replayKey)) return refused("TRANSFER_REPLAY");
    pending.add(replayKey);
    try {
      if (envelope.authenticatorId !== verifierId) return refused("AUTHENTICATION_INVALID");
      let verified: boolean;
      try {
        verified = await verify(canonicalComputeTransferBytes(envelope.transfer), envelope.signatureBytes.slice());
      } catch {
        return refused("AUTHENTICATOR_FAILED");
      }
      if (verified !== true) return refused("AUTHENTICATION_INVALID");
      let observation: AuthorityObservationV1;
      try {
        observation = captureAuthorityObservation(await observeAuthority());
      } catch {
        return refused("AUTHORITY_UNAVAILABLE");
      }
      if (
        observation.epoch !== envelope.transfer.authorityEpoch
        || observation.contextDigest !== envelope.transfer.authorityContextDigest
      ) {
        return refused("AUTHORITY_ROTATED");
      }
      if (retentionOwner !== envelope.transfer.artifact.owner) return refused("RETENTION_UNAVAILABLE");
      let retentionHandle: ArtifactRetentionHandle;
      try {
        const expiresAt = retentionExpiresAt();
        retentionHandle = await acquireRetention({
          reference: envelope.transfer.artifact,
          runIdentity: envelope.transfer.runIdentity,
          acquirerId,
          expiresAt,
        });
        if (
          typeof retentionHandle !== "object"
          || retentionHandle === null
          || Reflect.ownKeys(retentionHandle).length !== 0
        ) {
          return refused("RETENTION_UNAVAILABLE");
        }
      } catch {
        return refused("RETENTION_UNAVAILABLE");
      }
      accepted.add(replayKey);
      return Object.freeze({
        accepted: true,
        queued: true,
        executionAuthorized: false,
        transfer: envelope.transfer,
        transferDigest: envelope.transferDigest,
        retentionHandle,
      });
    } finally {
      pending.delete(replayKey);
    }
  };
  return Object.freeze({ admit });
}

const STAGE_INPUT_KEYS = [
  "authorityContextDigest",
  "authorityEpoch",
  "evidenceDigest",
  "inputDigest",
  "outputDigest",
  "owner",
  "runIdentity",
  "stage",
] as const;

function validateStageName(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || utf8(value).byteLength > 256) {
    fail("RECEIPT_FIELD", "stage tag must occupy 1..256 UTF-8 bytes");
  }
  return value;
}

function validateStageReceiptInput(input: unknown): StageReceiptInputV1 {
  const values = captureExactFields(
    input,
    STAGE_INPUT_KEYS,
    "RECEIPT_TYPE",
    "RECEIPT_KEYS",
    "RECEIPT_KEYS",
    "stage receipt input",
  );
  if (!isOwner(values["owner"])) fail("RECEIPT_FIELD", "stage receipt owner is not recognized");
  return Object.freeze({
    owner: values["owner"],
    stage: validateStageName(values["stage"]),
    runIdentity: validateDigest(values["runIdentity"], "RECEIPT_FIELD", "stage run identity"),
    authorityEpoch: validateAuthorityEpoch(values["authorityEpoch"]),
    authorityContextDigest: validateDigest(values["authorityContextDigest"], "RECEIPT_FIELD", "stage authority context"),
    inputDigest: validateDigest(values["inputDigest"], "RECEIPT_FIELD", "stage input digest"),
    outputDigest: validateDigest(values["outputDigest"], "RECEIPT_FIELD", "stage output digest"),
    evidenceDigest: validateDigest(values["evidenceDigest"], "RECEIPT_FIELD", "stage evidence digest"),
  });
}

type CapturedStageSigner = StageReceiptSignerIdentity & {
  readonly invoke: (bytes: Uint8Array) => Promise<Uint8Array>;
};
type CapturedStageVerifier = StageReceiptSignerIdentity & {
  readonly invoke: (bytes: Uint8Array, signature: Uint8Array) => Promise<boolean>;
};

function captureStageCapability(input: unknown, method: "sign"): CapturedStageSigner;
function captureStageCapability(input: unknown, method: "verify"): CapturedStageVerifier;
function captureStageCapability(input: unknown, method: "sign" | "verify"): CapturedStageSigner | CapturedStageVerifier {
  if (typeof input !== "object" || input === null) fail("RECEIPT_AUTHENTICATOR", "stage authenticator must be an object capability");
  try {
    const id = captureAuthenticatorId(Reflect.get(input, "id"));
    const ownerInput = Reflect.get(input, "owner") as unknown;
    const authorityEpoch = validateAuthorityEpoch(Reflect.get(input, "authorityEpoch"));
    const authorityContextDigest = validateDigest(
      Reflect.get(input, "authorityContextDigest"),
      "RECEIPT_AUTHENTICATOR",
      "stage authenticator context",
    );
    const candidate = Reflect.get(input, method) as unknown;
    if (!isOwner(ownerInput) || typeof candidate !== "function") {
      fail("RECEIPT_AUTHENTICATOR", "stage authenticator identity or method is invalid");
    }
    return Object.freeze({
      id,
      owner: ownerInput,
      authorityEpoch,
      authorityContextDigest,
      invoke: candidate.bind(input) as CapturedStageSigner["invoke"] & CapturedStageVerifier["invoke"],
    });
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("RECEIPT_AUTHENTICATOR", "stage authenticator could not be captured");
  }
}

function canonicalStageReceiptBody(input: StageReceiptInputV1, signerId: string): Uint8Array {
  return frame([
    utf8(STAGE_RECEIPT_SCHEMA),
    utf8(input.owner),
    utf8(input.stage),
    utf8(input.runIdentity),
    encodeU64(input.authorityEpoch),
    utf8(input.authorityContextDigest),
    utf8(input.inputDigest),
    utf8(input.outputDigest),
    utf8(input.evidenceDigest),
    utf8(signerId),
  ]);
}

export async function mintStageReceiptV1(
  input: unknown,
  signerInput: unknown,
): Promise<StageReceiptV1> {
  const fields = validateStageReceiptInput(input);
  const signer = captureStageCapability(signerInput, "sign");
  if (
    signer.owner !== fields.owner
    || signer.authorityEpoch !== fields.authorityEpoch
    || signer.authorityContextDigest !== fields.authorityContextDigest
  ) {
    fail("RECEIPT_BINDING", "stage signer is not bound to the receipt owner and authority epoch");
  }
  const body = canonicalStageReceiptBody(fields, signer.id);
  let signature: Uint8Array;
  try {
    signature = ownedBytes(await signer.invoke(body.slice()));
  } catch {
    fail("RECEIPT_AUTHENTICATOR", "stage signer failed");
  }
  if (signature.byteLength === 0 || signature.byteLength > 4096) {
    fail("RECEIPT_AUTHENTICATOR", "stage receipt authentication has invalid length");
  }
  return Object.freeze({
    schema: STAGE_RECEIPT_SCHEMA,
    ...fields,
    signerId: signer.id,
    receiptDigest: sha256(body),
    authentication: Buffer.from(signature).toString("base64"),
  });
}

const STAGE_RECEIPT_KEYS = [
  "authentication",
  "authorityContextDigest",
  "authorityEpoch",
  "evidenceDigest",
  "inputDigest",
  "outputDigest",
  "owner",
  "receiptDigest",
  "runIdentity",
  "schema",
  "signerId",
  "stage",
] as const;

function validateStageReceiptV1(input: unknown): StageReceiptV1 & { readonly signatureBytes: Uint8Array } {
  const values = captureExactFields(
    input,
    STAGE_RECEIPT_KEYS,
    "RECEIPT_TYPE",
    "RECEIPT_KEYS",
    "RECEIPT_KEYS",
    "stage receipt",
  );
  if (values["schema"] !== STAGE_RECEIPT_SCHEMA) fail("RECEIPT_FIELD", "unsupported stage receipt schema");
  const fields = validateStageReceiptInput({
    owner: values["owner"],
    stage: values["stage"],
    runIdentity: values["runIdentity"],
    authorityEpoch: values["authorityEpoch"],
    authorityContextDigest: values["authorityContextDigest"],
    inputDigest: values["inputDigest"],
    outputDigest: values["outputDigest"],
    evidenceDigest: values["evidenceDigest"],
  });
  const signerId = captureAuthenticatorId(values["signerId"]);
  const receiptDigest = validateDigest(values["receiptDigest"], "RECEIPT_FIELD", "stage receipt digest");
  if (receiptDigest !== sha256(canonicalStageReceiptBody(fields, signerId))) {
    fail("RECEIPT_FIELD", "stage receipt digest does not match its canonical body");
  }
  const signatureBytes = decodeCanonicalBase64(values["authentication"]);
  if (signatureBytes === undefined) fail("RECEIPT_FIELD", "stage receipt authentication is not canonical base64");
  return Object.freeze({
    schema: STAGE_RECEIPT_SCHEMA,
    ...fields,
    signerId,
    receiptDigest,
    authentication: values["authentication"] as string,
    signatureBytes,
  });
}

export async function verifyStageReceiptV1(
  receiptInput: unknown,
  verifierInput: unknown,
): Promise<StageReceiptVerification> {
  let receipt: ReturnType<typeof validateStageReceiptV1>;
  let verifier: CapturedStageVerifier;
  try {
    receipt = validateStageReceiptV1(receiptInput);
    verifier = captureStageCapability(verifierInput, "verify");
  } catch {
    return Object.freeze({ verified: false, code: "RECEIPT_INVALID" });
  }
  if (
    verifier.id !== receipt.signerId
    || verifier.owner !== receipt.owner
    || verifier.authorityEpoch !== receipt.authorityEpoch
    || verifier.authorityContextDigest !== receipt.authorityContextDigest
  ) {
    return Object.freeze({ verified: false, code: "RECEIPT_AUTHENTICATION_INVALID" });
  }
  let verified: boolean;
  try {
    const fields = validateStageReceiptInput({
      owner: receipt.owner,
      stage: receipt.stage,
      runIdentity: receipt.runIdentity,
      authorityEpoch: receipt.authorityEpoch,
      authorityContextDigest: receipt.authorityContextDigest,
      inputDigest: receipt.inputDigest,
      outputDigest: receipt.outputDigest,
      evidenceDigest: receipt.evidenceDigest,
    });
    verified = await verifier.invoke(canonicalStageReceiptBody(fields, receipt.signerId), receipt.signatureBytes.slice());
  } catch {
    return Object.freeze({ verified: false, code: "RECEIPT_AUTHENTICATOR_FAILED" });
  }
  if (verified !== true) return Object.freeze({ verified: false, code: "RECEIPT_AUTHENTICATION_INVALID" });
  const { signatureBytes: _signatureBytes, ...publicReceipt } = receipt;
  return Object.freeze({ verified: true, receipt: Object.freeze(publicReceipt) });
}

function captureDenseArray(
  input: unknown,
  label: string,
  code: ArtifactReferenceErrorCode,
  minimum = 0,
  maximum = 64,
): readonly unknown[] {
  if (!Array.isArray(input) || utilTypes.isProxy(input) || Object.getPrototypeOf(input) !== Array.prototype) {
    fail(code, `${label} must be an ordinary dense array`);
  }
  try {
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
      fail(code, `${label} length must be own data`);
    }
    const length = lengthDescriptor.value as unknown;
    if (
      typeof length !== "number"
      || !Number.isSafeInteger(length)
      || length < minimum
      || length > maximum
    ) {
      fail(code, `${label} length is outside ${minimum}..${maximum}`);
    }
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.some((key) => typeof key !== "string")
      || keys.length !== length + 1
      || !keys.includes("length")
    ) {
      fail(code, `${label} cannot contain holes, symbols, or surplus fields`);
    }
    const values: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined
        || !("value" in descriptor)
        || descriptor.enumerable !== true
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) {
        fail(code, `${label}[${index}] must be an enumerable own-data field`);
      }
      values.push(descriptor.value);
    }
    return Object.freeze(values);
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail(code, `${label} could not be captured`);
  }
}

const STAGE_EVIDENCE_INPUT_KEYS = [
  "authorityContextDigest",
  "authorityEpoch",
  "entries",
  "expectedStages",
  "runIdentity",
] as const;
const STAGE_EVIDENCE_ENTRY_KEYS = ["receipt", "verifier"] as const;
const STAGE_EVIDENCE_SET_KEYS = [
  "authorityContextDigest",
  "authorityEpoch",
  "evidenceSetDigest",
  "receiptDigests",
  "runIdentity",
  "schema",
  "stages",
] as const;

function canonicalStageEvidenceSetBytes(
  runIdentity: Sha256Digest,
  authorityEpoch: number,
  authorityContextDigest: Sha256Digest,
  stages: readonly string[],
  receiptDigests: readonly Sha256Digest[],
): Uint8Array {
  const entries: Uint8Array[] = [];
  for (let index = 0; index < stages.length; index += 1) {
    const receiptDigest = receiptDigests[index];
    if (receiptDigest === undefined) fail("EVIDENCE_SET_ORDER", "stage evidence digest list is incomplete");
    entries.push(utf8(stages[index] as string), utf8(receiptDigest));
  }
  return frame([
    utf8(STAGE_EVIDENCE_SET_SCHEMA),
    utf8(runIdentity),
    encodeU64(authorityEpoch),
    utf8(authorityContextDigest),
    encodeU64(stages.length),
    ...entries,
  ]);
}

function captureStageNames(input: unknown, label: string): readonly string[] {
  const values = captureDenseArray(input, label, "EVIDENCE_SET_ORDER", 1, 64);
  const stages = values.map((value) => validateStageName(value));
  if (new Set(stages).size !== stages.length) fail("EVIDENCE_SET_ORDER", `${label} contains duplicate stages`);
  return Object.freeze(stages);
}

function captureReceiptDigests(input: unknown, label: string): readonly Sha256Digest[] {
  return Object.freeze(captureDenseArray(input, label, "EVIDENCE_SET_FIELD", 1, 64).map(
    (value, index) => validateDigest(value, "EVIDENCE_SET_FIELD", `${label}[${index}]`),
  ));
}

function validateStageEvidenceSetV1(input: unknown): StageEvidenceSetV1 {
  const values = captureExactFields(
    input,
    STAGE_EVIDENCE_SET_KEYS,
    "EVIDENCE_SET_TYPE",
    "EVIDENCE_SET_KEYS",
    "EVIDENCE_SET_FIELD",
    "stage evidence set",
  );
  if (values["schema"] !== STAGE_EVIDENCE_SET_SCHEMA) {
    fail("EVIDENCE_SET_FIELD", "unsupported stage evidence-set schema");
  }
  const runIdentity = validateDigest(values["runIdentity"], "EVIDENCE_SET_FIELD", "evidence-set run identity");
  const authorityEpoch = validateAuthorityEpoch(values["authorityEpoch"]);
  const authorityContextDigest = validateDigest(
    values["authorityContextDigest"],
    "EVIDENCE_SET_FIELD",
    "evidence-set authority context",
  );
  const stages = captureStageNames(values["stages"], "evidence-set stages");
  const receiptDigests = captureReceiptDigests(values["receiptDigests"], "evidence-set receipt digests");
  if (stages.length !== receiptDigests.length) {
    fail("EVIDENCE_SET_ORDER", "stage and receipt-digest counts differ");
  }
  const evidenceSetDigest = validateDigest(
    values["evidenceSetDigest"],
    "EVIDENCE_SET_FIELD",
    "evidence-set digest",
  );
  if (
    evidenceSetDigest !== sha256(canonicalStageEvidenceSetBytes(
      runIdentity,
      authorityEpoch,
      authorityContextDigest,
      stages,
      receiptDigests,
    ))
  ) {
    fail("EVIDENCE_SET_FIELD", "evidence-set digest does not match its canonical stage sequence");
  }
  return Object.freeze({
    schema: STAGE_EVIDENCE_SET_SCHEMA,
    runIdentity,
    authorityEpoch,
    authorityContextDigest,
    stages,
    receiptDigests,
    evidenceSetDigest,
  });
}

/**
 * Verifies each stage receipt before deriving the value-only VOK evidence-set
 * digest. The returned record is transport evidence, not a retained capability;
 * VOK must independently re-verify the receipts during admission.
 */
export async function deriveStageEvidenceSetV1(input: unknown): Promise<StageEvidenceSetV1> {
  const values = captureExactFields(
    input,
    STAGE_EVIDENCE_INPUT_KEYS,
    "EVIDENCE_SET_TYPE",
    "EVIDENCE_SET_KEYS",
    "EVIDENCE_SET_FIELD",
    "stage evidence-set input",
  );
  const runIdentity = validateDigest(values["runIdentity"], "EVIDENCE_SET_FIELD", "evidence-set run identity");
  const authorityEpoch = validateAuthorityEpoch(values["authorityEpoch"]);
  const authorityContextDigest = validateDigest(
    values["authorityContextDigest"],
    "EVIDENCE_SET_FIELD",
    "evidence-set authority context",
  );
  const stages = captureStageNames(values["expectedStages"], "expected evidence stages");
  const entries = captureDenseArray(values["entries"], "stage evidence entries", "EVIDENCE_SET_ORDER", 1, 64);
  if (entries.length !== stages.length) fail("EVIDENCE_SET_ORDER", "stage evidence entries do not match the closed stage list");

  const receiptDigests: Sha256Digest[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = captureExactFields(
      entries[index],
      STAGE_EVIDENCE_ENTRY_KEYS,
      "EVIDENCE_SET_TYPE",
      "EVIDENCE_SET_KEYS",
      "EVIDENCE_SET_FIELD",
      `stage evidence entry ${index}`,
    );
    const verification = await verifyStageReceiptV1(entry["receipt"], entry["verifier"]);
    if (!verification.verified) {
      fail("EVIDENCE_SET_AUTHENTICATION", `stage evidence entry ${index} did not authenticate`);
    }
    const receipt = verification.receipt;
    if (receipt.stage !== stages[index]) {
      fail("EVIDENCE_SET_ORDER", `stage evidence entry ${index} is out of order`);
    }
    if (
      receipt.runIdentity !== runIdentity
      || receipt.authorityEpoch !== authorityEpoch
      || receipt.authorityContextDigest !== authorityContextDigest
    ) {
      fail("EVIDENCE_SET_BINDING", `stage evidence entry ${index} belongs to another run or authority context`);
    }
    receiptDigests.push(receipt.receiptDigest);
  }
  const frozenReceiptDigests = Object.freeze(receiptDigests);
  return Object.freeze({
    schema: STAGE_EVIDENCE_SET_SCHEMA,
    runIdentity,
    authorityEpoch,
    authorityContextDigest,
    stages,
    receiptDigests: frozenReceiptDigests,
    evidenceSetDigest: sha256(canonicalStageEvidenceSetBytes(
      runIdentity,
      authorityEpoch,
      authorityContextDigest,
      stages,
      frozenReceiptDigests,
    )),
  });
}

const VOK_ENVELOPE_KEYS = [
  "abi",
  "buildPoint",
  "capabilityDigest",
  "componentDigest",
  "dependencyClosureDigest",
  "epoch",
  "evidenceSetDigest",
  "policyDigest",
  "schemaVersion",
  "target",
] as const;
const VOK_ENVELOPE_INPUT_KEYS = [
  "abi",
  "buildPoint",
  "capabilityDigest",
  "componentDigest",
  "dependencyClosureDigest",
  "epoch",
  "evidenceSet",
  "policyDigest",
  "schemaVersion",
  "target",
] as const;

function captureVokEnvelopeFields(input: unknown, keys: readonly string[], label: string): Readonly<Record<string, unknown>> {
  if (
    typeof input !== "object"
    || input === null
    || Array.isArray(input)
    || utilTypes.isProxy(input)
    || Object.getPrototypeOf(input) !== Object.prototype
  ) {
    fail("VOK_ENVELOPE_TYPE", `${label} must be an exact ordinary object`);
  }
  try {
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (
      ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
      || keys.some((key) => !ownKeys.includes(key))
    ) {
      fail("VOK_ENVELOPE_KEYS", `${label} has unexpected or missing fields`);
    }
    const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || !("value" in descriptor)
        || descriptor.enumerable !== true
        || descriptor.get !== undefined
        || descriptor.set !== undefined
      ) {
        fail("VOK_ENVELOPE_FIELD", `${label}.${key} must be an enumerable own-data field`);
      }
      values[key] = descriptor.value;
    }
    return values;
  } catch (error: unknown) {
    if (error instanceof ArtifactReferenceError) throw error;
    fail("VOK_ENVELOPE_FIELD", `${label} fields could not be captured`);
  }
}

function validateVokText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail("VOK_ENVELOPE_FIELD", `${label} must be a non-empty string`);
  }
  return value;
}

function validateVokEpoch(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    fail("VOK_ENVELOPE_FIELD", "VOK Envelope epoch must be a positive safe integer");
  }
  return value;
}

function constructVokEnvelope(values: Readonly<Record<string, unknown>>): VokEnvelopeV1 {
  if (values["schemaVersion"] !== 1) fail("VOK_ENVELOPE_FIELD", "VOK Envelope schemaVersion must equal 1");
  const buildPoint = validateVokText(values["buildPoint"], "VOK Envelope buildPoint");
  if (!GIT_BUILD_POINT.test(buildPoint)) {
    fail("VOK_ENVELOPE_FIELD", "VOK Envelope buildPoint must be an exact lowercase Git build point");
  }
  return Object.freeze({
    schemaVersion: 1,
    componentDigest: validateDigest(values["componentDigest"], "VOK_ENVELOPE_FIELD", "VOK component digest"),
    policyDigest: validateDigest(values["policyDigest"], "VOK_ENVELOPE_FIELD", "VOK policy digest"),
    target: validateVokText(values["target"], "VOK Envelope target"),
    abi: validateVokText(values["abi"], "VOK Envelope ABI"),
    dependencyClosureDigest: validateDigest(
      values["dependencyClosureDigest"],
      "VOK_ENVELOPE_FIELD",
      "VOK dependency-closure digest",
    ),
    capabilityDigest: validateDigest(values["capabilityDigest"], "VOK_ENVELOPE_FIELD", "VOK capability digest"),
    buildPoint: buildPoint as `git:${string}`,
    epoch: validateVokEpoch(values["epoch"]),
    evidenceSetDigest: validateDigest(values["evidenceSetDigest"], "VOK_ENVELOPE_FIELD", "VOK evidence-set digest"),
  });
}

export function validateVokEnvelopeV1(input: unknown): VokEnvelopeV1 {
  return constructVokEnvelope(captureVokEnvelopeFields(input, VOK_ENVELOPE_KEYS, "VOK Envelope"));
}

export function createVokEnvelopeV1(input: unknown): VokEnvelopeV1 {
  const values = captureVokEnvelopeFields(input, VOK_ENVELOPE_INPUT_KEYS, "VOK Envelope input");
  const evidenceSet = validateStageEvidenceSetV1(values["evidenceSet"]);
  const epoch = validateVokEpoch(values["epoch"]);
  if (epoch !== evidenceSet.authorityEpoch) {
    fail("VOK_ENVELOPE_BINDING", "VOK Envelope epoch does not match the authenticated stage evidence set");
  }
  return constructVokEnvelope({
    schemaVersion: values["schemaVersion"],
    componentDigest: values["componentDigest"],
    policyDigest: values["policyDigest"],
    target: values["target"],
    abi: values["abi"],
    dependencyClosureDigest: values["dependencyClosureDigest"],
    capabilityDigest: values["capabilityDigest"],
    buildPoint: values["buildPoint"],
    epoch,
    evidenceSetDigest: evidenceSet.evidenceSetDigest,
  });
}

function captureAcceptedAdmission(input: unknown): Extract<ComputeTransferAdmission, { accepted: true }> {
  const values = captureExactFields(
    input,
    ["accepted", "executionAuthorized", "queued", "retentionHandle", "transfer", "transferDigest"],
    "TRANSFER_TYPE",
    "TRANSFER_KEYS",
    "TRANSFER_KEYS",
    "accepted compute-transfer admission",
  );
  if (values["accepted"] !== true || values["queued"] !== true || values["executionAuthorized"] !== false) {
    fail("TRANSFER_TYPE", "terminal completion requires a non-authorizing accepted queue admission");
  }
  const transfer = validateComputeTransferV1(values["transfer"]);
  const transferDigest = validateDigest(values["transferDigest"], "TRANSFER_RUN_IDENTITY", "transfer digest");
  if (transferDigest !== computeTransferDigest(transfer)) fail("TRANSFER_RUN_IDENTITY", "accepted transfer digest is inconsistent");
  if (typeof values["retentionHandle"] !== "object" || values["retentionHandle"] === null) {
    fail("RETENTION_REQUEST", "accepted transfer lacks an opaque retention handle");
  }
  return Object.freeze({
    accepted: true,
    queued: true,
    executionAuthorized: false,
    transfer,
    transferDigest,
    retentionHandle: values["retentionHandle"] as ArtifactRetentionHandle,
  });
}

export async function finalizeComputeTransferStage(options: {
  readonly admission: ComputeTransferAdmission;
  readonly receipt: unknown;
  readonly verifier: StageReceiptVerifier;
  readonly observeAuthority: () => AuthorityObservationV1 | Promise<AuthorityObservationV1>;
  readonly retention: ArtifactRetentionLedger<ArtifactOwner>;
  readonly acquirerId: string;
}): Promise<ComputeTransferStageCompletion> {
  let admission: Extract<ComputeTransferAdmission, { accepted: true }>;
  let acquirerId: string;
  let continuity: (handle: ArtifactRetentionHandle, acquirerId: string) => boolean;
  let release: (handle: ArtifactRetentionHandle, acquirerId: string) => boolean;
  let observeAuthority: () => AuthorityObservationV1 | Promise<AuthorityObservationV1>;
  try {
    admission = captureAcceptedAdmission(Reflect.get(options, "admission"));
    acquirerId = validateAcquirerId(Reflect.get(options, "acquirerId"));
    const retentionInput = Reflect.get(options, "retention") as unknown;
    if (typeof retentionInput !== "object" || retentionInput === null) throw new Error("retention");
    const continuityInput = Reflect.get(retentionInput, "continuity") as unknown;
    const releaseInput = Reflect.get(retentionInput, "release") as unknown;
    const retentionOwner = Reflect.get(retentionInput, "owner") as unknown;
    const observeInput = Reflect.get(options, "observeAuthority") as unknown;
    if (
      typeof continuityInput !== "function"
      || typeof releaseInput !== "function"
      || retentionOwner !== admission.transfer.artifact.owner
      || typeof observeInput !== "function"
    ) throw new Error("terminal capability");
    continuity = (continuityInput as typeof continuity).bind(retentionInput);
    release = (releaseInput as typeof release).bind(retentionInput);
    observeAuthority = (observeInput as typeof observeAuthority).bind(options);
  } catch {
    return Object.freeze({ completed: false, code: "RETENTION_LAPSED" });
  }

  let released = false;
  try {
    if (!continuity(admission.retentionHandle, acquirerId)) {
      return Object.freeze({ completed: false, code: "RETENTION_LAPSED" });
    }
    let observation: AuthorityObservationV1;
    try { observation = captureAuthorityObservation(await observeAuthority()); }
    catch { return Object.freeze({ completed: false, code: "TERMINAL_AUTHORITY_UNAVAILABLE" }); }
    if (
      observation.epoch !== admission.transfer.authorityEpoch
      || observation.contextDigest !== admission.transfer.authorityContextDigest
    ) {
      return Object.freeze({ completed: false, code: "TERMINAL_AUTHORITY_ROTATED" });
    }
    const verification = await verifyStageReceiptV1(Reflect.get(options, "receipt"), Reflect.get(options, "verifier"));
    if (!verification.verified) return Object.freeze({ completed: false, code: verification.code });
    const receipt = verification.receipt;
    if (
      receipt.owner !== admission.transfer.toOwner
      || receipt.runIdentity !== admission.transfer.runIdentity
      || receipt.authorityEpoch !== admission.transfer.authorityEpoch
      || receipt.authorityContextDigest !== admission.transfer.authorityContextDigest
      || receipt.inputDigest !== admission.transfer.artifact.digest
    ) {
      return Object.freeze({ completed: false, code: "RECEIPT_BINDING" });
    }
    try { released = release(admission.retentionHandle, acquirerId); }
    catch { released = false; }
    if (!released) return Object.freeze({ completed: false, code: "RETENTION_RELEASE_FAILED" });
    return Object.freeze({ completed: true, receipt });
  } finally {
    if (!released) {
      try { release(admission.retentionHandle, acquirerId); } catch { /* refusal stays fail-closed */ }
    }
  }
}

export interface FilesystemArtifactRepositoryOptions<O extends ArtifactOwner> {
  readonly rootDirectory: string;
  readonly owner: O;
  readonly maxByteLength?: number;
}

export function createFilesystemArtifactRepository<O extends ArtifactOwner>(
  options: FilesystemArtifactRepositoryOptions<O>,
): OwnedArtifactRepository<O> {
  if (typeof options.rootDirectory !== "string" || options.rootDirectory.length === 0) {
    fail("REPOSITORY_CAPABILITY", "filesystem repository root must be a non-empty string");
  }
  if (!isOwner(options.owner)) fail("REFERENCE_OWNER", "unknown filesystem repository owner");
  const owner = options.owner;
  const rootDirectory = resolve(options.rootDirectory);
  const maxByteLength = validMaximum(options.maxByteLength ?? MAX_ARTIFACT_BYTES);
  const bodyPath = (reference: ArtifactReferenceV1): string =>
    join(rootDirectory, owner, reference.kind, `${reference.digest.slice("sha256:".length)}.bin`);

  const read = async (referenceInput: ArtifactReferenceV1 & { readonly owner: O }): Promise<Uint8Array> => {
    const reference = validateArtifactReferenceV1(referenceInput, { maxByteLength });
    if (reference.owner !== owner) fail("REPOSITORY_OWNER", "repository owner does not match artifact owner");
    const path = bodyPath(reference);
    if (!existsSync(path)) fail("BODY_MISSING", "artifact body is absent from the owner repository");
    try {
      const stat = statSync(path);
      if (!stat.isFile()) fail("BODY_MISSING", "artifact body is not a regular file");
      if (stat.size > maxByteLength) fail("BODY_OVERSIZED", "artifact body exceeds the configured byte bound");
      return verifyArtifactBytes(reference, readFileSync(path), { maxByteLength });
    } catch (error: unknown) {
      if (error instanceof ArtifactReferenceError) throw error;
      fail("BACKEND_READ", "filesystem artifact read failed");
    }
  };

  const write = async (kindInput: ArtifactKind, bytesInput: Uint8Array): Promise<ArtifactReferenceV1 & { readonly owner: O }> => {
    if (!isKind(kindInput)) fail("REFERENCE_KIND", "unknown artifact kind");
    assertLegalOwnerKind(owner, kindInput);
    const bytes = ownedBytes(bytesInput);
    if (bytes.byteLength > maxByteLength) fail("BODY_OVERSIZED", "artifact body exceeds the configured byte bound");
    const reference = validateArtifactReferenceV1({
      schema: ARTIFACT_REFERENCE_SCHEMA,
      owner,
      kind: kindInput,
      digest: sha256(bytes),
      byteLength: bytes.byteLength,
    }, { maxByteLength }) as ArtifactReferenceV1 & { readonly owner: O };
    const path = bodyPath(reference);
    try {
      mkdirSync(join(rootDirectory, owner, kindInput), { recursive: true });
      if (existsSync(path)) await read(reference);
      else writeFileSync(path, bytes);
      return reference;
    } catch (error: unknown) {
      if (error instanceof ArtifactReferenceError) throw error;
      fail("BACKEND_WRITE", "filesystem artifact write failed");
    }
  };

  return Object.freeze({ owner, read, write });
}
