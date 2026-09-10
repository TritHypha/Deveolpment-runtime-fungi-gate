import {
  createArtifactReference,
  digestArtifactBytes,
  type ArtifactReferenceV1,
  type Sha256Digest,
} from "./artifact-reference.js";
import {
  decodeCheckedFlowArtifact,
  digestCheckedFlowArtifact,
} from "./checked-flow-artifact.js";

export const RD0858_SLIDE_GIR_SCHEMA = "galerina.rd0858.slide-gir-emission.v1" as const;
export const RD0858_SLIDE_REGISTRY_SET_ID = "slide.registry.executable-gir.v2c" as const;
export const RD0858_SLIDE_REGISTRY_SET_DIGEST = "366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66" as const;
export const RD0858_SLIDE_ENTRY_FUNCTION_ID = 1 as const;
export const RD0858_SLIDE_RESULT_TYPE_ID = 6 as const;

const SEMANTIC_PROFILE_ID = "slide.semantic.executable-gir.v2";
const DIGEST_SUITE_ID = "slide.digest.sha256.v1";
const MEMORY_PROFILE_ID = "slide.memory.safe-value.v1";
const BASE_LIMITS = Object.freeze([
  24_576, 1, 3, 8, 32, 48, 4, 2, 0, 0, 0, 0, 96,
  256, 1_024, 16, 8, 8, 4, 4_096, 0,
] as const);
const FAILURE_ROWS = Object.freeze([
  [1, 2, 1, 1],
  [2, 3, 2, 1],
  [3, 4, 2, 1],
  [4, 1, 1, 1],
] as const);

export interface Rd0858SlideGIREmissionResult {
  readonly schema: typeof RD0858_SLIDE_GIR_SCHEMA;
  readonly sourceDigest: string;
  readonly checkedFlowDigest: Sha256Digest;
  readonly girReference: ArtifactReferenceV1;
  readonly girBytes: Uint8Array;
  readonly girDigest: Sha256Digest;
  readonly entryFunctionId: typeof RD0858_SLIDE_ENTRY_FUNCTION_ID;
  readonly registrySetId: typeof RD0858_SLIDE_REGISTRY_SET_ID;
  readonly registrySetDigest: typeof RD0858_SLIDE_REGISTRY_SET_DIGEST;
  readonly resultTypeId: typeof RD0858_SLIDE_RESULT_TYPE_ID;
  readonly authorityReleased: false;
}

export class Rd0858SlideGIREmissionRefusal extends Error {
  constructor(readonly code: string) {
    super(`RD0858_SLIDE_GIR_${code}: refused`);
    this.name = "Rd0858SlideGIREmissionRefusal";
  }
}

function refuse(code: string): never {
  throw new Rd0858SlideGIREmissionRefusal(code);
}

function concat(...parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function head(major: number, value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647) refuse("CBOR_BOUND");
  if (value < 24) return Uint8Array.of((major * 32) + value);
  if (value < 256) return Uint8Array.of((major * 32) + 24, value);
  if (value < 65_536) return Uint8Array.of((major * 32) + 25, value >>> 8, value & 0xff);
  return Uint8Array.of(
    (major * 32) + 26,
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

const uint = (value: number): Uint8Array => head(0, value);
const integer = (value: number): Uint8Array => value >= 0 ? head(0, value) : head(1, -1 - value);
const text = (value: string): Uint8Array => {
  const payload = new TextEncoder().encode(value);
  return concat(head(3, payload.byteLength), payload);
};
const bytes = (value: Uint8Array): Uint8Array => concat(head(2, value.byteLength), value);
const array = (values: readonly Uint8Array[]): Uint8Array => concat(head(4, values.length), ...values);
const map = (entries: readonly (readonly [Uint8Array, Uint8Array])[]): Uint8Array => concat(
  head(5, entries.length),
  ...entries.flatMap(([key, value]) => [key, value]),
);

function instruction(
  resultId: number,
  opcodeId: number,
  typeId: number,
  operands: readonly number[],
  immediate: number,
): Uint8Array {
  return array([uint(resultId), uint(opcodeId), uint(typeId), array(operands.map(uint)), integer(immediate)]);
}

function terminator(
  id: number,
  operands: readonly number[],
  edges: readonly (readonly [number, readonly number[]])[],
): Uint8Array {
  return array([
    uint(id),
    array(operands.map(uint)),
    array(edges.map(([target, arguments_]) => array([uint(target), array(arguments_.map(uint))]))),
  ]);
}

function block(id: number, instructions: readonly Uint8Array[], end: Uint8Array): Uint8Array {
  return array([uint(id), array([]), array(instructions), end]);
}

function constantRow(id: number, value: string): Uint8Array {
  return array([uint(id), uint(6), uint(1), bytes(new TextEncoder().encode(value))]);
}

function functionValue(): Uint8Array {
  return array([
    uint(1),
    uint(1),
    array([uint(3)]),
    uint(RD0858_SLIDE_RESULT_TYPE_ID),
    array([]),
    array([]),
    uint(0),
    array([
      block(
        0,
        [instruction(0, 1, 3, [], 0)],
        terminator(3, [0], [[1, []], [2, []], [3, []]]),
      ),
      block(1, [instruction(1, 12, 6, [], 1)], terminator(4, [1], [])),
      block(2, [instruction(2, 12, 6, [], 2)], terminator(4, [2], [])),
      block(3, [instruction(3, 12, 6, [], 3)], terminator(4, [3], [])),
    ]),
    uint(1),
  ]);
}

function emitGIR(): Uint8Array {
  const values: readonly Uint8Array[] = [
    uint(2),
    uint(1),
    text(SEMANTIC_PROFILE_ID),
    text(DIGEST_SUITE_ID),
    array([text(RD0858_SLIDE_REGISTRY_SET_ID), text(RD0858_SLIDE_REGISTRY_SET_DIGEST)]),
    text(MEMORY_PROFILE_ID),
    array([1, 2, 3, 4, 5].map(uint)),
    array(BASE_LIMITS.map(uint)),
    array([uint(1)]),
    array(Array.from({ length: 13 }, (_, index) => uint(index + 1))),
    array([1, 2, 3].map(uint)),
    array([functionValue()]),
    array(FAILURE_ROWS.map((row) => array(row.map(uint)))),
    array([]),
    array([]),
    array([array([1, 1, 0, 1, 2, 3].map(uint))]),
    array([]),
    array([]),
    array([constantRow(1, "allow"), constantRow(2, "deny"), constantRow(3, "ambig")]),
    array([]),
    array([]),
  ];
  return map(values.map((value, key) => [uint(key), value] as const));
}

export function emitRd0858SlideGIR(artifactBytes: Uint8Array): Rd0858SlideGIREmissionResult {
  const artifact = decodeCheckedFlowArtifact(artifactBytes);
  const checkedFlowDigest = digestCheckedFlowArtifact(artifactBytes) as Sha256Digest;
  const girBytes = emitGIR();
  const girReference = createArtifactReference("galerina", "canonical-gir", girBytes);
  return Object.freeze({
    schema: RD0858_SLIDE_GIR_SCHEMA,
    sourceDigest: artifact.sourceDigest,
    checkedFlowDigest,
    girReference,
    girBytes: new Uint8Array(girBytes),
    girDigest: digestArtifactBytes(girBytes),
    entryFunctionId: RD0858_SLIDE_ENTRY_FUNCTION_ID,
    registrySetId: RD0858_SLIDE_REGISTRY_SET_ID,
    registrySetDigest: RD0858_SLIDE_REGISTRY_SET_DIGEST,
    resultTypeId: RD0858_SLIDE_RESULT_TYPE_ID,
    authorityReleased: false,
  });
}
