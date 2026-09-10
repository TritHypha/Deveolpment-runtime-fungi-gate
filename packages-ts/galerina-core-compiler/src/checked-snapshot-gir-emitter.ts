import {
  createArtifactReference,
  decodeArtifactReference,
  digestArtifactBytes,
  type ArtifactReferenceV1,
  type Sha256Digest,
} from "./artifact-reference.js";
import { decodeCheckedModuleSnapshot, type CheckedModuleSnapshotV1, type SnapshotTraceFactV1 } from "./checked-module-snapshot.js";

export const SLIDE_SEMANTIC_PROFILE_ID = "slide.semantic.executable-gir.v2" as const;
export const SLIDE_DIGEST_SUITE_ID = "slide.digest.sha256.v1" as const;
export const SLIDE_REGISTRY_SET_ID = "slide.registry.executable-gir.v2c" as const;
export const SLIDE_REGISTRY_SET_DIGEST = "366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66" as const;
export const SLIDE_MEMORY_PROFILE_ID = "slide.memory.safe-value.v1" as const;
export const SLIDE_BASE_LIMITS = Object.freeze([24576, 1, 3, 8, 32, 48, 4, 2, 0, 0, 0, 0, 96, 256, 1024, 16, 8, 8, 4, 4096, 0] as const);

const TYPE_IDS = Object.freeze({ Int: 1, Bool: 2, Trit: 3, Verdict: 4 } as const);
const OPCODES = Object.freeze({ param: 1, const: 2 } as const);
const FAILURES = Object.freeze([[1, 2, 1, 1], [2, 3, 2, 1], [3, 4, 2, 1], [4, 1, 1, 1]] as const);

export interface DetachedGIREmissionResult {
  readonly schema: "galerina.detached-gir-emission.v1";
  readonly snapshotReference: ArtifactReferenceV1;
  readonly girReference: ArtifactReferenceV1;
  readonly girBytes: Uint8Array;
  readonly girDigest: Sha256Digest;
  readonly authorityReleased: false;
}

export class CheckedSnapshotGIREmissionRefusal extends Error {
  constructor(readonly code: string) {
    super(`CHECKED_SNAPSHOT_GIR_${code}: refused`);
    this.name = "CheckedSnapshotGIREmissionRefusal";
  }
}

function refuse(code: string): never {
  throw new CheckedSnapshotGIREmissionRefusal(code);
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
  return Uint8Array.of((major * 32) + 26, (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

const uint = (value: number): Uint8Array => head(0, value);
const integer = (value: number): Uint8Array => value >= 0 ? head(0, value) : head(1, -1 - value);
const text = (value: string): Uint8Array => {
  const payload = new TextEncoder().encode(value);
  return concat(head(3, payload.byteLength), payload);
};
const array = (values: readonly Uint8Array[]): Uint8Array => concat(head(4, values.length), ...values);
const map = (entries: readonly (readonly [Uint8Array, Uint8Array])[]): Uint8Array => concat(head(5, entries.length), ...entries.flatMap(([key, value]) => [key, value]));

function instruction(resultId: number, opcodeId: number, typeId: number, operands: readonly number[], immediate: number): Uint8Array {
  return array([uint(resultId), uint(opcodeId), uint(typeId), array(operands.map(uint)), integer(immediate)]);
}

function terminator(id: number, operands: readonly number[], edges: readonly (readonly [number, readonly number[]])[]): Uint8Array {
  return array([uint(id), array(operands.map(uint)), array(edges.map(([target, args]) => array([uint(target), array(args.map(uint))]))) ]);
}

function block(id: number, instructions: readonly Uint8Array[], end: Uint8Array): Uint8Array {
  return array([uint(id), array([]), array(instructions), end]);
}

function functionValue(parameterTypes: readonly number[], resultTypeId: number, blocks: readonly Uint8Array[]): Uint8Array {
  return array([uint(1), uint(1), array(parameterTypes.map(uint)), uint(resultTypeId), array([]), array([]), uint(0), array(blocks), uint(1)]);
}

function typeId(snapshot: CheckedModuleSnapshotV1, snapshotTypeId: number): number {
  const type = snapshot.resolvedTypes.find((candidate) => candidate.id === snapshotTypeId);
  if (type === undefined) refuse("TYPE_ID");
  return TYPE_IDS[type.primitive];
}

function declarationType(snapshot: CheckedModuleSnapshotV1, declarationId: number): number {
  const declaration = snapshot.declarations.find((candidate) => candidate.id === declarationId);
  if (declaration === undefined) refuse("DECLARATION_ID");
  return typeId(snapshot, declaration.typeId);
}

function root(snapshot: CheckedModuleSnapshotV1, functions: readonly Uint8Array[]): Uint8Array {
  const values: readonly Uint8Array[] = [
    uint(2),
    uint(1),
    text(SLIDE_SEMANTIC_PROFILE_ID),
    text(SLIDE_DIGEST_SUITE_ID),
    array([text(SLIDE_REGISTRY_SET_ID), text(SLIDE_REGISTRY_SET_DIGEST)]),
    text(SLIDE_MEMORY_PROFILE_ID),
    array([1, 2, 3, 4, 5].map(uint)),
    array(SLIDE_BASE_LIMITS.map(uint)),
    array([uint(1)]),
    array(Array.from({ length: 13 }, (_, index) => uint(index + 1))),
    array([]),
    array(functions),
    array(FAILURES.map((failure) => array(failure.map(uint)))),
    array([]),
    array([]),
    array([]),
    array([]),
    array([]),
    array([]),
    array([]),
    array([]),
  ];
  return map(values.map((value, key) => [uint(key), value] as const));
}

function refForFact(facts: readonly SnapshotTraceFactV1[], factId: number, resultIds: ReadonlyMap<number, number>): number {
  const resultId = resultIds.get(factId);
  if (resultId === undefined) refuse("TRACE_RESULT");
  return resultId;
}

function emitFactInstruction(snapshot: CheckedModuleSnapshotV1, fact: SnapshotTraceFactV1, resultId: number, declarationToResult: ReadonlyMap<number, number>, constantToResult: ReadonlyMap<number, number>, parameterIndex: ReadonlyMap<number, number>): Uint8Array {
  if (fact.operation === "parameter") {
    const index = parameterIndex.get(fact.declarationId);
    if (index === undefined) refuse("PARAMETER_INDEX");
    return instruction(resultId, OPCODES.param, declarationType(snapshot, fact.declarationId), [], index);
  }
  if (fact.operation === "constant") {
    if (fact.constantId === null) refuse("CONSTANT_ID");
    const constant = snapshot.constants.find((candidate) => candidate.id === fact.constantId);
    if (constant === undefined || typeof constant.value !== "number" || !Number.isSafeInteger(constant.value)) refuse("CONSTANT_SEMANTIC");
    return instruction(resultId, OPCODES.const, typeId(snapshot, constant.typeId), [], constant.value);
  }
  if (fact.operation === "binary" || fact.operation === "call") refuse("UNSUPPORTED_SNAPSHOT_SEMANTIC");
  if (fact.operation === "branch" || fact.operation === "return") refuse("TRACE_TERMINATOR_AS_INSTRUCTION");
  refuse("TRACE_OPERATION");
}

function emitReturn(snapshot: CheckedModuleSnapshotV1, fact: SnapshotTraceFactV1, declarationToResult: ReadonlyMap<number, number>, constantToResult: ReadonlyMap<number, number>): Uint8Array {
  if (fact.operation !== "return") refuse("RETURN_EXPECTED");
  const operand = fact.constantId === null
    ? (fact.operandDeclarationIds[0] === undefined ? undefined : declarationToResult.get(fact.operandDeclarationIds[0]))
    : constantToResult.get(fact.constantId);
  if (operand === undefined) refuse("RETURN_OPERAND");
  return terminator(4, [operand], []);
}

function emitFunction(snapshot: CheckedModuleSnapshotV1): Uint8Array {
  const entry = snapshot.declarations.find((declaration) => declaration.id === snapshot.entryFlowId);
  if (entry === undefined || entry.kind !== "function") refuse("ENTRY_FLOW");
  const parameters = snapshot.declarations.filter((declaration) => declaration.kind === "parameter").sort((left, right) => left.id - right.id);
  const parameterIndex = new Map(parameters.map((parameter, index) => [parameter.id, index] as const));
  const parameterTypes = parameters.map((parameter) => typeId(snapshot, parameter.typeId));
  const facts = snapshot.traceFacts;
  if (facts.length === 0) refuse("TRACE_EMPTY");
  const branchIndex = facts.findIndex((fact) => fact.operation === "branch");
  const declarationToResult = new Map<number, number>();
  const constantToResult = new Map<number, number>();
  const factToResult = new Map<number, number>();
  let nextResultId = 0;
  const emitInstructions = (items: readonly SnapshotTraceFactV1[]): Uint8Array[] => {
    const output: Uint8Array[] = [];
    for (const fact of items) {
      if (fact.operation === "return" || fact.operation === "branch") continue;
      const resultId = nextResultId;
      nextResultId += 1;
      const encoded = emitFactInstruction(snapshot, fact, resultId, declarationToResult, constantToResult, parameterIndex);
      output.push(encoded);
      factToResult.set(fact.id, resultId);
      if (fact.operation === "parameter") declarationToResult.set(fact.declarationId, resultId);
      if (fact.operation === "constant" && fact.constantId !== null) constantToResult.set(fact.constantId, resultId);
    }
    return output;
  };
  if (branchIndex < 0) {
    const last = facts.at(-1);
    if (last === undefined || last.operation !== "return") refuse("RETURN_MISSING");
    const instructions = emitInstructions(facts.slice(0, -1));
    const end = emitReturn(snapshot, last, declarationToResult, constantToResult);
    return functionValue(parameterTypes, declarationType(snapshot, entry.id), [block(0, instructions, end)]);
  }
  const branch = facts[branchIndex];
  if (branch === undefined || branch.operation !== "branch" || branch.targetFactIds.length !== 2 || branch.operandDeclarationIds.length !== 1) refuse("BRANCH_SHAPE");
  const firstTarget = branch.targetFactIds[0];
  const secondTarget = branch.targetFactIds[1];
  if (firstTarget === undefined || secondTarget === undefined) refuse("BRANCH_TARGET");
  const firstIndex = facts.findIndex((fact) => fact.id === firstTarget);
  const secondIndex = facts.findIndex((fact) => fact.id === secondTarget);
  if (firstIndex <= branchIndex || secondIndex <= firstIndex) refuse("BRANCH_TARGET_ORDER");
  const entryInstructions = emitInstructions(facts.slice(0, branchIndex));
  const conditionDeclaration = branch.operandDeclarationIds[0];
  if (conditionDeclaration === undefined) refuse("BRANCH_CONDITION");
  const condition = declarationToResult.get(conditionDeclaration);
  if (condition === undefined) refuse("BRANCH_CONDITION");
  const thenFacts = facts.slice(firstIndex, secondIndex);
  const elseFacts = facts.slice(secondIndex);
  const thenReturn = thenFacts.at(-1);
  const elseReturn = elseFacts.at(-1);
  if (thenReturn === undefined || thenReturn.operation !== "return" || elseReturn === undefined || elseReturn.operation !== "return") refuse("BRANCH_RETURNS");
  const thenInstructions = emitInstructions(thenFacts.slice(0, -1));
  const thenEnd = emitReturn(snapshot, thenReturn, declarationToResult, constantToResult);
  const elseInstructions = emitInstructions(elseFacts.slice(0, -1));
  const elseEnd = emitReturn(snapshot, elseReturn, declarationToResult, constantToResult);
  return functionValue(parameterTypes, declarationType(snapshot, entry.id), [
    block(0, entryInstructions, terminator(2, [condition], [[1, []], [2, []]])),
    block(1, thenInstructions, thenEnd),
    block(2, elseInstructions, elseEnd),
  ]);
}

export function emitCanonicalGIRFromSnapshot(snapshotBytes: Uint8Array, expected: ArtifactReferenceV1): DetachedGIREmissionResult {
  const snapshotReference = decodeArtifactReference(expected);
  if (snapshotReference.owner !== "galerina" || snapshotReference.kind !== "checked-module-snapshot") refuse("REFERENCE_KIND");
  const snapshotDigest = digestArtifactBytes(snapshotBytes);
  if (snapshotReference.digest !== snapshotDigest || snapshotReference.byteLength !== snapshotBytes.byteLength) refuse("SNAPSHOT_REFERENCE");
  const snapshot = decodeCheckedModuleSnapshot(snapshotBytes);
  const girBytes = root(snapshot, [emitFunction(snapshot)]);
  const girReference = createArtifactReference("galerina", "canonical-gir", girBytes);
  return Object.freeze({
    schema: "galerina.detached-gir-emission.v1",
    snapshotReference,
    girReference,
    girBytes: new Uint8Array(girBytes),
    girDigest: girReference.digest,
    authorityReleased: false,
  });
}
