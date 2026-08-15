import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  ARTIFACT_REFERENCE_SCHEMA,
  artifactReferencesEqual,
  type ArtifactReferenceV1,
  type OwnedArtifactRepository,
  type Sha256Digest,
  verifyArtifactBytes,
} from "./artifact-reference.js";
import {
  type DetachedGIREmissionResult,
  type DetachedGIRRefusalCode,
  emitCanonicalGIRFromSnapshot,
} from "./checked-snapshot-gir-emitter.js";
import { verifyCheckedModuleSnapshotBytesV1 } from "./checked-module-snapshot.js";

export type DetachedReferenceRefusalCode =
  | "COMPILER_ADMISSION"
  | "DETACHED_CONFIGURATION"
  | "SNAPSHOT_UNAVAILABLE"
  | "REPOSITORY_UNAVAILABLE"
  | DetachedGIRRefusalCode;

export type DetachedReferenceResult =
  | Readonly<{
      accepted: true;
      executionAuthorized: false;
      snapshot: ArtifactReferenceV1 & {
        readonly owner: "galerina";
        readonly kind: "checked-module-snapshot";
      };
      gir: Extract<DetachedGIREmissionResult, { readonly emitted: true }>;
    }>
  | Readonly<{
      accepted: false;
      executionAuthorized: false;
      code: DetachedReferenceRefusalCode;
    }>;

function refuse(code: DetachedReferenceRefusalCode): DetachedReferenceResult {
  return Object.freeze({ accepted: false, executionAuthorized: false, code });
}

function captureImmutableBytes(input: unknown): Uint8Array {
  if (!(input instanceof Uint8Array) || utilTypes.isProxy(input)) {
    throw new TypeError("detached snapshot body must be a non-proxy Uint8Array");
  }
  if (typeof SharedArrayBuffer !== "undefined" && input.buffer instanceof SharedArrayBuffer) {
    throw new TypeError("shared detached snapshot bytes require a separate live-view contract");
  }
  const length = input.byteLength;
  const bytes = Uint8Array.from(input);
  if (input.byteLength !== length || bytes.byteLength !== length) {
    throw new TypeError("detached snapshot bytes changed during capture");
  }
  return bytes;
}

function sha256(bytes: Readonly<Uint8Array>): Sha256Digest {
  return ("sha256:" + createHash("sha256").update(Uint8Array.from(bytes)).digest("hex")) as Sha256Digest;
}

function snapshotReference(bytes: Readonly<Uint8Array>): ArtifactReferenceV1 & {
  readonly owner: "galerina";
  readonly kind: "checked-module-snapshot";
} {
  return Object.freeze({
    schema: ARTIFACT_REFERENCE_SCHEMA,
    owner: "galerina" as const,
    kind: "checked-module-snapshot" as const,
    digest: sha256(bytes),
    byteLength: bytes.byteLength,
  });
}

interface CapturedRepository<O extends "galerina"> {
  readonly write: OwnedArtifactRepository<O>["write"];
  readonly read: OwnedArtifactRepository<O>["read"];
}

function captureRepository<O extends "galerina">(input: unknown, expectedOwner: O): CapturedRepository<O> {
  if (typeof input !== "object" || input === null || utilTypes.isProxy(input)) {
    throw new TypeError("detached repository must be a non-proxy capability object");
  }
  const owner = Reflect.get(input, "owner") as unknown;
  const write = Reflect.get(input, "write") as unknown;
  const read = Reflect.get(input, "read") as unknown;
  if (owner !== expectedOwner || typeof write !== "function" || typeof read !== "function") {
    throw new TypeError("detached repository does not provide the expected owner read/write capability");
  }
  return Object.freeze({
    write: (write as OwnedArtifactRepository<O>["write"]).bind(input),
    read: (read as OwnedArtifactRepository<O>["read"]).bind(input),
  });
}

/**
 * Post-snapshot authority boundary. This module deliberately has no parser,
 * AST, TypeScript emitter, execution planner or runtime execution dependency.
 */
export async function persistAndEmitDetachedSnapshotV1(
  snapshotBytesInput: unknown,
  repositoryInput: unknown,
): Promise<DetachedReferenceResult> {
  let snapshotBytes: ReturnType<typeof captureImmutableBytes>;
  try {
    snapshotBytes = captureImmutableBytes(snapshotBytesInput);
    verifyCheckedModuleSnapshotBytesV1(snapshotBytes);
  } catch {
    return refuse("SNAPSHOT_UNAVAILABLE");
  }
  let repository: CapturedRepository<"galerina">;
  try {
    repository = captureRepository(repositoryInput, "galerina");
  } catch {
    return refuse("REPOSITORY_UNAVAILABLE");
  }

  const expected = snapshotReference(snapshotBytes);
  let stored: ArtifactReferenceV1 & { readonly owner: "galerina" };
  let reread: ReturnType<typeof verifyArtifactBytes>;
  try {
    stored = await repository.write("checked-module-snapshot", Uint8Array.from(snapshotBytes));
    if (!artifactReferencesEqual(stored, expected)) return refuse("REPOSITORY_UNAVAILABLE");
    reread = verifyArtifactBytes(expected, await repository.read(expected));
    verifyCheckedModuleSnapshotBytesV1(reread);
  } catch {
    return refuse("REPOSITORY_UNAVAILABLE");
  }

  const gir = emitCanonicalGIRFromSnapshot(reread, expected);
  if (!gir.emitted) return refuse(gir.code);
  let verifiedGirBytes: ReturnType<typeof verifyArtifactBytes>;
  try {
    const storedGir = await repository.write("canonical-gir", Uint8Array.from(gir.bytes));
    if (!artifactReferencesEqual(storedGir, gir.reference)) return refuse("REPOSITORY_UNAVAILABLE");
    verifiedGirBytes = verifyArtifactBytes(gir.reference, await repository.read(gir.reference));
  } catch {
    return refuse("REPOSITORY_UNAVAILABLE");
  }
  const storedGir = Object.freeze({ ...gir, bytes: verifiedGirBytes });
  return Object.freeze({
    accepted: true,
    executionAuthorized: false,
    snapshot: expected,
    gir: storedGir,
  });
}
