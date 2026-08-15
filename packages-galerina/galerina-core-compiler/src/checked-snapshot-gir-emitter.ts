import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  ARTIFACT_REFERENCE_SCHEMA,
  ArtifactReferenceError,
  type ArtifactReferenceV1,
  type Sha256Digest,
  verifyArtifactBytes,
} from "./artifact-reference.js";
import {
  CheckedModuleSnapshotError,
  type CheckedModuleSnapshotV1,
  verifyCheckedModuleSnapshotBytesV1,
} from "./checked-module-snapshot.js";

export const DETACHED_GIR_SEMANTIC_PROFILE = "slide.semantic.executable-gir.v2" as const;
export const DETACHED_GIR_REGISTRY_SET = "slide.registry.executable-gir.v2c" as const;
export const DETACHED_GIR_REGISTRY_DIGEST =
  "366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66" as const;
export const DETACHED_GIR_MEMORY_PROFILE = "slide.memory.safe-value.v1" as const;
export const DETACHED_GIR_LIMITS = Object.freeze([
  24_576, 1, 3, 8, 32, 48, 4, 2, 0, 0, 0, 0, 96,
  256, 1_024, 16, 8, 8, 4, 4_096, 0,
] as const);

const DIGEST_SUITE = "slide.digest.sha256.v1";
const PARENT_TYPES = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
const PARENT_FAILURES = Object.freeze([
  Object.freeze([1, 2, 1, 1]),
  Object.freeze([2, 3, 2, 1]),
  Object.freeze([3, 4, 2, 1]),
  Object.freeze([4, 1, 1, 1]),
]);
const I32_MIN = -2_147_483_648;
const I32_MAX = 2_147_483_647;

export type DetachedGIRRefusalCode =
  | "SNAPSHOT_REFERENCE"
  | "SNAPSHOT_BYTES"
  | "UNSUPPORTED_SNAPSHOT_SEMANTIC"
  | "GIR_LIMIT"
  | "GIR_TRACE";

export interface DetachedGIRTraceEntryV1 {
  readonly functionId: number;
  readonly blockId: number;
  readonly nodeKind: "instruction" | "terminator";
  readonly nodeId: number;
  readonly sourceFactId: string;
  readonly spanId: string;
}

export type DetachedGIREmissionResult =
  | Readonly<{
      emitted: true;
      semanticProfileId: typeof DETACHED_GIR_SEMANTIC_PROFILE;
      registrySetId: typeof DETACHED_GIR_REGISTRY_SET;
      registrySetDigest: typeof DETACHED_GIR_REGISTRY_DIGEST;
      memoryProfileId: typeof DETACHED_GIR_MEMORY_PROFILE;
      limits: typeof DETACHED_GIR_LIMITS;
      bytes: Readonly<Uint8Array>;
      reference: ArtifactReferenceV1 & { readonly owner: "galerina"; readonly kind: "canonical-gir" };
      trace: readonly DetachedGIRTraceEntryV1[];
    }>
  | Readonly<{ emitted: false; code: DetachedGIRRefusalCode }>;

type Encoded = Uint8Array;

function concat(...parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

function head(major: number, value: number): Encoded {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("CBOR length is outside the admitted integer domain");
  const prefix = major << 5;
  if (value < 24) return Uint8Array.of(prefix | value);
  if (value <= 0xff) return Uint8Array.of(prefix | 24, value);
  if (value <= 0xffff) return Uint8Array.of(prefix | 25, value >>> 8, value & 0xff);
  if (value <= 0xffffffff) {
    return Uint8Array.of(prefix | 26, (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  }
  throw new RangeError("CBOR value exceeds the detached i32 profile");
}

function uint(value: number): Encoded {
  return head(0, value);
}

function integer(value: number): Encoded {
  if (!Number.isSafeInteger(value) || value < I32_MIN || value > I32_MAX) throw new RangeError("integer is outside i32");
  return value >= 0 ? uint(value) : head(1, -1 - value);
}

function text(value: string): Encoded {
  const bytes = new TextEncoder().encode(value);
  return concat(head(3, bytes.byteLength), bytes);
}

function array(values: readonly Encoded[]): Encoded {
  return concat(head(4, values.length), ...values);
}

function map(entries: readonly (readonly [number, Encoded])[]): Encoded {
  return concat(head(5, entries.length), ...entries.flatMap(([key, value]) => [uint(key), value]));
}

function captureImmutableBytes(input: unknown): Uint8Array {
  if (!(input instanceof Uint8Array) || utilTypes.isProxy(input)) {
    throw new TypeError("detached input bytes must be a non-proxy Uint8Array");
  }
  if (typeof SharedArrayBuffer !== "undefined" && input.buffer instanceof SharedArrayBuffer) {
    throw new TypeError("shared detached input bytes require a separate live-view contract");
  }
  const capturedLength = input.byteLength;
  const copy = new Uint8Array(capturedLength);
  copy.set(input);
  if (input.byteLength !== capturedLength || copy.byteLength !== capturedLength) {
    throw new TypeError("detached input bytes changed during capture");
  }
  return copy;
}

function sha256(bytesInput: Readonly<Uint8Array>): Sha256Digest {
  return ("sha256:" + createHash("sha256").update(Uint8Array.from(bytesInput)).digest("hex")) as Sha256Digest;
}

interface LoweredFunction {
  readonly bytes: Encoded;
  readonly trace: readonly DetachedGIRTraceEntryV1[];
}

function exactOne<T>(values: readonly T[], predicate: (value: T) => boolean): T | undefined {
  const selected = values.filter(predicate);
  return selected.length === 1 ? selected[0] : undefined;
}

function canonicalI32(value: string): number | undefined {
  if (!/^-?(?:0|[1-9][0-9]*)$/u.test(value) || value === "-0") return undefined;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < I32_MIN || number > I32_MAX || String(number) !== value) return undefined;
  return number;
}

function lowerFunction(snapshot: CheckedModuleSnapshotV1, declarationIndex: number): LoweredFunction | undefined {
  const declaration = snapshot.declarations[declarationIndex];
  if (declaration === undefined || declaration.kind !== "PureFlow") return undefined;
  const typeFact = exactOne(snapshot.typeFacts, (row) => row.declarationId === declaration.declarationId);
  const effect = exactOne(snapshot.effects, (row) => row.declarationId === declaration.declarationId);
  const valueState = exactOne(snapshot.valueStates, (row) => row.declarationId === declaration.declarationId);
  const governance = exactOne(snapshot.governanceDecisions, (row) => row.declarationId === declaration.declarationId);
  const constant = exactOne(snapshot.constants, (row) => row.declarationId === declaration.declarationId);
  if (typeFact === undefined || effect === undefined || valueState === undefined || governance === undefined || constant === undefined) {
    return undefined;
  }
  if (
    typeFact.typeIdentity !== "() -> Int"
    || effect.effect !== "pure"
    || valueState.state !== "safe"
    || governance["verdict"] !== "ALLOW"
    || constant.domainTag !== "Int.i32"
  ) return undefined;
  const immediate = canonicalI32(constant.canonicalValue);
  if (immediate === undefined) return undefined;

  const functionId = declarationIndex + 1;
  const instruction = array([uint(0), uint(2), uint(1), array([]), integer(immediate)]);
  const terminator = array([uint(4), array([uint(0)]), array([])]);
  const block = array([uint(0), array([]), array([instruction]), terminator]);
  const fn = array([
    uint(functionId),
    uint(1),
    array([]),
    uint(1),
    array([]),
    array([]),
    uint(0),
    array([block]),
    uint(1),
  ]);
  return {
    bytes: fn,
    trace: Object.freeze([
      Object.freeze({
        functionId,
        blockId: 0,
        nodeKind: "instruction" as const,
        nodeId: 0,
        sourceFactId: constant.constantId,
        spanId: constant.spanId,
      }),
      Object.freeze({
        functionId,
        blockId: 0,
        nodeKind: "terminator" as const,
        nodeId: 4,
        sourceFactId: declaration.declarationId,
        spanId: declaration.spanId,
      }),
    ]),
  };
}

function encodeParentRoot(functions: readonly Encoded[]): Encoded {
  const entries: readonly (readonly [number, Encoded])[] = [
    [0, uint(2)],
    [1, uint(1)],
    [2, text(DETACHED_GIR_SEMANTIC_PROFILE)],
    [3, text(DIGEST_SUITE)],
    [4, array([text(DETACHED_GIR_REGISTRY_SET), text(DETACHED_GIR_REGISTRY_DIGEST)])],
    [5, text(DETACHED_GIR_MEMORY_PROFILE)],
    [6, array([1, 2, 3, 4, 5].map(uint))],
    [7, array(DETACHED_GIR_LIMITS.map(uint))],
    [8, array([uint(1)])],
    [9, array(PARENT_TYPES.map(uint))],
    [10, array([])],
    [11, array(functions)],
    [12, array(PARENT_FAILURES.map((failure) => array(failure.map(uint))))],
    [13, array([])],
    [14, array([])],
    [15, array([])],
    [16, array([])],
    [17, array([])],
    [18, array([])],
    [19, array([])],
    [20, array([])],
  ];
  return map(entries);
}

function refuse(code: DetachedGIRRefusalCode): DetachedGIREmissionResult {
  return Object.freeze({ emitted: false, code });
}

export function emitCanonicalGIRFromSnapshot(
  snapshotBytes: Uint8Array,
  expected: ArtifactReferenceV1,
): DetachedGIREmissionResult {
  try {
    const capturedSnapshotBytes = captureImmutableBytes(snapshotBytes);
    const ownedSnapshotBytes = verifyArtifactBytes(expected, capturedSnapshotBytes);
    if (expected.owner !== "galerina" || expected.kind !== "checked-module-snapshot") {
      return refuse("SNAPSHOT_REFERENCE");
    }
    let snapshot: CheckedModuleSnapshotV1;
    try {
      snapshot = verifyCheckedModuleSnapshotBytesV1(ownedSnapshotBytes);
    } catch (error) {
      if (error instanceof CheckedModuleSnapshotError) return refuse("SNAPSHOT_BYTES");
      return refuse("SNAPSHOT_BYTES");
    }
    if (snapshot.diagnostics.length !== 0) return refuse("UNSUPPORTED_SNAPSHOT_SEMANTIC");
    if (snapshot.declarations.length === 0 || snapshot.declarations.length > 3) return refuse("GIR_LIMIT");

    const lowered = snapshot.declarations.map((_, index) => lowerFunction(snapshot, index));
    if (lowered.some((value) => value === undefined)) return refuse("UNSUPPORTED_SNAPSHOT_SEMANTIC");
    const complete = lowered as readonly LoweredFunction[];
    const instructionCount = complete.length;
    const blockCount = complete.length;
    const conservativeWork = instructionCount + blockCount + complete.length;
    if (blockCount > 8 || instructionCount > 32 || conservativeWork > 96) return refuse("GIR_LIMIT");

    const bytes = encodeParentRoot(complete.map((value) => value.bytes));
    const trace = Object.freeze(complete.flatMap((value) => value.trace));
    if (trace.length !== complete.length * 2) return refuse("GIR_TRACE");
    const ownedGirBytes = Uint8Array.from(bytes);
    const reference = Object.freeze({
      schema: ARTIFACT_REFERENCE_SCHEMA,
      owner: "galerina" as const,
      kind: "canonical-gir" as const,
      digest: sha256(bytes),
      byteLength: bytes.byteLength,
    });
    return Object.freeze({
      emitted: true,
      semanticProfileId: DETACHED_GIR_SEMANTIC_PROFILE,
      registrySetId: DETACHED_GIR_REGISTRY_SET,
      registrySetDigest: DETACHED_GIR_REGISTRY_DIGEST,
      memoryProfileId: DETACHED_GIR_MEMORY_PROFILE,
      limits: DETACHED_GIR_LIMITS,
      bytes: ownedGirBytes,
      reference,
      trace,
    });
  } catch (error) {
    if (error instanceof ArtifactReferenceError) return refuse("SNAPSHOT_REFERENCE");
    return refuse("SNAPSHOT_BYTES");
  }
}
