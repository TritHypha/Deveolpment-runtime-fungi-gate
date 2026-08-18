import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  ARTIFACT_REFERENCE_SCHEMA,
  ArtifactReferenceError,
  type ArtifactReferenceV1,
  type Sha256Digest,
  captureImmutableBytes,
  validateArtifactReferenceV1,
  verifyArtifactBytes,
} from "./artifact-reference-core.js";

export const CHECKED_MODULE_SNAPSHOT_SCHEMA = "galerina.checked-module-snapshot.v1" as const;
export const CHECKED_MODULE_TRACE_STAGES = Object.freeze([
  "lexer",
  "parser",
  "type",
  "effect",
  "value-state",
  "governance",
] as const);

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const GIT_COMMIT = /^git:[0-9a-f]{40}$/;
const VERSIONED_CANONICAL_JSON_SCHEMAS = new Set<string>([
  CHECKED_MODULE_SNAPSHOT_SCHEMA,
  "galerina.checked-module-stage-output.v1",
  "galerina.checked-module-run-identity.v1",
]);
const MAX_ITEMS = 100_000;
const MAX_TEXT_BYTES = 64 * 1024;
const MAX_CANONICAL_JSON_DEPTH = 64;
const MAX_CANONICAL_JSON_NODES = 8_000_000;

export type CheckedModuleTraceStage = typeof CHECKED_MODULE_TRACE_STAGES[number];
export type CheckedModuleVerdict = "ALLOW" | "DENY" | "INDETERMINATE";
export type CheckedModuleDiagnosticSeverity = "error" | "warning" | "info";

export interface CheckedModuleSpanV1 {
  readonly spanId: string;
  readonly startByte: number;
  readonly endByte: number;
}

export interface CheckedModuleTokenV1 {
  readonly tokenId: string;
  readonly kind: string;
  readonly lexemeDigest: Sha256Digest;
  readonly spanId: string;
}

export interface CheckedModuleDeclarationV1 {
  readonly declarationId: string;
  readonly kind: string;
  readonly name: string;
  readonly spanId: string;
}

export interface CheckedModuleTypeFactV1 {
  readonly factId: string;
  readonly declarationId: string;
  readonly typeIdentity: string;
  readonly spanId: string;
}

export interface CheckedModuleEffectFactV1 {
  readonly factId: string;
  readonly declarationId: string;
  readonly effect: string;
  readonly spanId: string;
}

export interface CheckedModuleValueStateFactV1 {
  readonly factId: string;
  readonly declarationId: string;
  readonly state: string;
  readonly spanId: string;
}

export interface CheckedModuleGovernanceDecisionV1 {
  readonly decisionId: string;
  readonly declarationId: string;
  readonly verdict: CheckedModuleVerdict;
  readonly policyDigest: Sha256Digest;
  readonly evidenceDigest: Sha256Digest;
  readonly spanId: string;
}

export interface CheckedModuleConstantV1 {
  readonly constantId: string;
  readonly declarationId: string;
  readonly domainTag: string;
  readonly canonicalValue: string;
  readonly valueDigest: Sha256Digest;
  readonly spanId: string;
}

export interface CheckedModuleDiagnosticV1 {
  readonly diagnosticId: string;
  readonly code: string;
  readonly severity: CheckedModuleDiagnosticSeverity;
  readonly messageDigest: Sha256Digest;
  readonly spanId: string;
}

export interface CheckedModuleCheckerVersionV1 {
  readonly stage: CheckedModuleTraceStage;
  readonly version: string;
  readonly rulesetDigest: Sha256Digest;
}

export interface CheckedModuleTraceEntryV1 extends CheckedModuleCheckerVersionV1 {
  readonly inputDigest: Sha256Digest;
  readonly outputDigest: Sha256Digest;
}

export interface CheckedModuleTraceInputV1 {
  readonly source: ArtifactReferenceV1;
  readonly spans: readonly CheckedModuleSpanV1[];
  readonly tokens: readonly CheckedModuleTokenV1[];
  readonly declarations: readonly CheckedModuleDeclarationV1[];
  readonly typeFacts: readonly CheckedModuleTypeFactV1[];
  readonly effects: readonly CheckedModuleEffectFactV1[];
  readonly valueStates: readonly CheckedModuleValueStateFactV1[];
  readonly governanceDecisions: readonly CheckedModuleGovernanceDecisionV1[];
  readonly constants: readonly CheckedModuleConstantV1[];
  readonly diagnostics: readonly CheckedModuleDiagnosticV1[];
  readonly checkerVersions: readonly CheckedModuleCheckerVersionV1[];
}

export interface CheckedModuleSnapshotInputV1 {
  readonly schema: typeof CHECKED_MODULE_SNAPSHOT_SCHEMA;
  readonly source: ArtifactReferenceV1;
  readonly sourceBytes: Uint8Array;
  readonly edition: string;
  readonly spans: readonly CheckedModuleSpanV1[];
  readonly tokens: readonly CheckedModuleTokenV1[];
  readonly declarations: readonly CheckedModuleDeclarationV1[];
  readonly typeFacts: readonly CheckedModuleTypeFactV1[];
  readonly effects: readonly CheckedModuleEffectFactV1[];
  readonly valueStates: readonly CheckedModuleValueStateFactV1[];
  readonly governanceDecisions: readonly CheckedModuleGovernanceDecisionV1[];
  readonly constants: readonly CheckedModuleConstantV1[];
  readonly diagnostics: readonly CheckedModuleDiagnosticV1[];
  readonly checkerTrace: readonly CheckedModuleTraceEntryV1[];
  readonly compilerCommit: `git:${string}`;
  readonly compilerVersion: string;
  readonly checkerProfileVersion: string;
}

export interface CheckedModuleSnapshotV1 extends Omit<CheckedModuleSnapshotInputV1, "sourceBytes"> {
  readonly snapshotBodyDigest: Sha256Digest;
  readonly runIdentity: Sha256Digest;
}

export type CheckedModuleSnapshotErrorCode =
  | "SNAPSHOT_TYPE"
  | "SNAPSHOT_KEYS"
  | "SNAPSHOT_DESCRIPTOR"
  | "SNAPSHOT_FIELD"
  | "SNAPSHOT_REFERENCE"
  | "SNAPSHOT_DUPLICATE_IDENTITY"
  | "SNAPSHOT_INCOMPLETE_FACTS"
  | "SNAPSHOT_SOURCE_IDENTITY"
  | "SNAPSHOT_SOURCE_MISMATCH"
  | "SNAPSHOT_TRACE"
  | "SNAPSHOT_DIGEST"
  | "SNAPSHOT_BYTES";

export class CheckedModuleSnapshotError extends Error {
  readonly code: CheckedModuleSnapshotErrorCode;

  constructor(code: CheckedModuleSnapshotErrorCode, message: string) {
    super(message);
    this.name = "CheckedModuleSnapshotError";
    this.code = code;
  }
}

const INPUT_KEYS = Object.freeze([
  "schema", "source", "sourceBytes", "edition", "spans", "tokens", "declarations",
  "typeFacts", "effects", "valueStates", "governanceDecisions", "constants", "diagnostics",
  "checkerTrace", "compilerCommit", "compilerVersion", "checkerProfileVersion",
] as const);

const SNAPSHOT_KEYS = Object.freeze([
  "schema", "source", "edition", "spans", "tokens", "declarations", "typeFacts", "effects",
  "valueStates", "governanceDecisions", "constants", "diagnostics", "checkerTrace",
  "compilerCommit", "compilerVersion", "checkerProfileVersion", "snapshotBodyDigest", "runIdentity",
] as const);

type DataRecord = Readonly<Record<string, unknown>>;

function fail(code: CheckedModuleSnapshotErrorCode, message: string): never {
  throw new CheckedModuleSnapshotError(code, message);
}

function captureRecord(input: unknown, keys: readonly string[], label: string): DataRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input) || utilTypes.isProxy(input)) {
    fail("SNAPSHOT_TYPE", `${label} must be an ordinary non-proxy record`);
  }
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("SNAPSHOT_TYPE", `${label} must have an ordinary or null prototype`);
    }
    const ownKeys = Reflect.ownKeys(input);
    if (
      ownKeys.length !== keys.length
      || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
      || keys.some((key) => !ownKeys.includes(key))
    ) {
      fail("SNAPSHOT_KEYS", `${label} must contain exactly its version-one fields`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor)) {
        fail("SNAPSHOT_DESCRIPTOR", `${label}.${key} must be an own data field`);
      }
      values[key] = descriptor.value;
    }
    return values;
  } catch (error) {
    if (error instanceof CheckedModuleSnapshotError) throw error;
    fail("SNAPSHOT_DESCRIPTOR", `${label} could not be captured`);
  }
}

function captureArray(input: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(input) || utilTypes.isProxy(input) || input.length > MAX_ITEMS) {
    fail("SNAPSHOT_FIELD", `${label} must be a bounded ordinary array`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).some((key) => typeof key === "symbol")) {
    fail("SNAPSHOT_FIELD", `${label} must not contain symbol fields`);
  }
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor)) {
      fail("SNAPSHOT_FIELD", `${label} must be dense and contain only data elements`);
    }
    values.push(descriptor.value);
  }
  const allowed = new Set(["length", ...values.map((_, index) => String(index))]);
  if (Reflect.ownKeys(input).some((key) => typeof key !== "string" || !allowed.has(key))) {
    fail("SNAPSHOT_FIELD", `${label} must not contain surplus fields`);
  }
  return values;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || new TextEncoder().encode(value).byteLength > MAX_TEXT_BYTES) {
    fail("SNAPSHOT_FIELD", `${label} must be a non-empty bounded String`);
  }
  return value;
}

function digest(value: unknown, label: string): Sha256Digest {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("SNAPSHOT_FIELD", `${label} must be a canonical lowercase sha256 digest`);
  }
  return value as Sha256Digest;
}

function safeOffset(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail("SNAPSHOT_FIELD", `${label} must be a non-negative safe integer`);
  }
  return value;
}

function sha256Text(value: string): Sha256Digest {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

interface CanonicalJsonCaptureState {
  nodes: number;
  readonly active: WeakSet<object>;
}

function captureCanonicalJsonValue(value: unknown, state: CanonicalJsonCaptureState, depth: number): unknown {
  state.nodes += 1;
  if (state.nodes > MAX_CANONICAL_JSON_NODES || depth > MAX_CANONICAL_JSON_DEPTH) {
    fail("SNAPSHOT_BYTES", "canonical JSON value exceeds the admitted work bound");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("SNAPSHOT_BYTES", "canonical JSON numbers must be finite and must not be negative zero");
    }
    return value;
  }
  if (typeof value !== "object" || utilTypes.isProxy(value)) {
    fail("SNAPSHOT_BYTES", "canonical JSON contains an unsupported value");
  }
  if (state.active.has(value)) fail("SNAPSHOT_BYTES", "canonical JSON must be acyclic");
  state.active.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      if (value.length > MAX_ITEMS) fail("SNAPSHOT_BYTES", "canonical JSON array exceeds the admitted item bound");
      const allowed = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
      if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.has(key))) {
        fail("SNAPSHOT_BYTES", "canonical JSON arrays must be dense own-data sequences");
      }
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
          fail("SNAPSHOT_BYTES", "canonical JSON arrays must contain enumerable data elements");
        }
        result.push(captureCanonicalJsonValue(descriptor.value, state, depth + 1));
      }
      Object.setPrototypeOf(result, null);
      return Object.freeze(result);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("SNAPSHOT_BYTES", "canonical JSON records must have an ordinary or null prototype");
    }
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") fail("SNAPSHOT_BYTES", "canonical JSON records must not contain symbol keys");
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
        fail("SNAPSHOT_BYTES", "canonical JSON records must contain only enumerable data fields");
      }
      result[key] = captureCanonicalJsonValue(descriptor.value, state, depth + 1);
    }
    return Object.freeze(result);
  } catch (error) {
    if (error instanceof CheckedModuleSnapshotError) throw error;
    fail("SNAPSHOT_BYTES", "canonical JSON value could not be captured");
  } finally {
    state.active.delete(value);
  }
}

function admitVersionedCanonicalJsonRoot(value: unknown): object {
  const admitted = captureCanonicalJsonValue(value, { nodes: 0, active: new WeakSet() }, 0);
  if (typeof admitted !== "object" || admitted === null || Array.isArray(admitted)) {
    fail("SNAPSHOT_BYTES", "canonical JSON root must be an admitted versioned record");
  }
  const schema = Object.getOwnPropertyDescriptor(admitted, "schema");
  if (
    schema === undefined
    || !("value" in schema)
    || typeof schema.value !== "string"
    || !VERSIONED_CANONICAL_JSON_SCHEMAS.has(schema.value)
  ) {
    fail("SNAPSHOT_BYTES", "canonical JSON root must carry an admitted version-one schema field");
  }
  return admitted;
}

function canonicalJson(value: unknown): string {
  const admitted = admitVersionedCanonicalJsonRoot(value);
  const encoded = JSON.stringify(admitted);
  if (typeof encoded !== "string") fail("SNAPSHOT_BYTES", "snapshot did not encode as JSON text");
  return encoded;
}

function assertExactCanonicalJsonBytes(bytesInput: unknown, snapshot: CheckedModuleSnapshotV1): void {
  const bytes = captureImmutableBytes(bytesInput);
  const canonical = new TextEncoder().encode(canonicalJson(snapshot));
  if (canonical.byteLength !== bytes.byteLength || canonical.some((value, index) => value !== bytes[index])) {
    fail("SNAPSHOT_BYTES", "snapshot bytes are not the exact canonical encoding");
  }
}

function frozenArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function captureRows<T>(input: unknown, label: string, capture: (value: unknown, index: number) => T): readonly T[] {
  return frozenArray(captureArray(input, label).map((value, index) => Object.freeze(capture(value, index))));
}

function spanRow(value: unknown, index: number): CheckedModuleSpanV1 {
  const row = captureRecord(value, ["spanId", "startByte", "endByte"], `spans[${index}]`);
  const startByte = safeOffset(row["startByte"], `spans[${index}].startByte`);
  const endByte = safeOffset(row["endByte"], `spans[${index}].endByte`);
  if (endByte < startByte) fail("SNAPSHOT_FIELD", `spans[${index}] has an inverted byte range`);
  return { spanId: text(row["spanId"], `spans[${index}].spanId`), startByte, endByte };
}

function tokenRow(value: unknown, index: number): CheckedModuleTokenV1 {
  const row = captureRecord(value, ["tokenId", "kind", "lexemeDigest", "spanId"], `tokens[${index}]`);
  return {
    tokenId: text(row["tokenId"], `tokens[${index}].tokenId`),
    kind: text(row["kind"], `tokens[${index}].kind`),
    lexemeDigest: digest(row["lexemeDigest"], `tokens[${index}].lexemeDigest`),
    spanId: text(row["spanId"], `tokens[${index}].spanId`),
  };
}

function declarationRow(value: unknown, index: number): CheckedModuleDeclarationV1 {
  const row = captureRecord(value, ["declarationId", "kind", "name", "spanId"], `declarations[${index}]`);
  return {
    declarationId: text(row["declarationId"], `declarations[${index}].declarationId`),
    kind: text(row["kind"], `declarations[${index}].kind`),
    name: text(row["name"], `declarations[${index}].name`),
    spanId: text(row["spanId"], `declarations[${index}].spanId`),
  };
}

function typeFactRow(value: unknown, index: number): CheckedModuleTypeFactV1 {
  const row = captureRecord(value, ["factId", "declarationId", "typeIdentity", "spanId"], `typeFacts[${index}]`);
  return {
    factId: text(row["factId"], `typeFacts[${index}].factId`),
    declarationId: text(row["declarationId"], `typeFacts[${index}].declarationId`),
    typeIdentity: text(row["typeIdentity"], `typeFacts[${index}].typeIdentity`),
    spanId: text(row["spanId"], `typeFacts[${index}].spanId`),
  };
}

function effectRow(value: unknown, index: number): CheckedModuleEffectFactV1 {
  const row = captureRecord(value, ["factId", "declarationId", "effect", "spanId"], `effects[${index}]`);
  return {
    factId: text(row["factId"], `effects[${index}].factId`),
    declarationId: text(row["declarationId"], `effects[${index}].declarationId`),
    effect: text(row["effect"], `effects[${index}].effect`),
    spanId: text(row["spanId"], `effects[${index}].spanId`),
  };
}

function valueStateRow(value: unknown, index: number): CheckedModuleValueStateFactV1 {
  const row = captureRecord(value, ["factId", "declarationId", "state", "spanId"], `valueStates[${index}]`);
  return {
    factId: text(row["factId"], `valueStates[${index}].factId`),
    declarationId: text(row["declarationId"], `valueStates[${index}].declarationId`),
    state: text(row["state"], `valueStates[${index}].state`),
    spanId: text(row["spanId"], `valueStates[${index}].spanId`),
  };
}

function governanceRow(value: unknown, index: number): CheckedModuleGovernanceDecisionV1 {
  const row = captureRecord(
    value,
    ["decisionId", "declarationId", "verdict", "policyDigest", "evidenceDigest", "spanId"],
    `governanceDecisions[${index}]`,
  );
  if (row["verdict"] !== "ALLOW" && row["verdict"] !== "DENY" && row["verdict"] !== "INDETERMINATE") {
    fail("SNAPSHOT_FIELD", `governanceDecisions[${index}].verdict is not a closed Verdict`);
  }
  return {
    decisionId: text(row["decisionId"], `governanceDecisions[${index}].decisionId`),
    declarationId: text(row["declarationId"], `governanceDecisions[${index}].declarationId`),
    verdict: row["verdict"],
    policyDigest: digest(row["policyDigest"], `governanceDecisions[${index}].policyDigest`),
    evidenceDigest: digest(row["evidenceDigest"], `governanceDecisions[${index}].evidenceDigest`),
    spanId: text(row["spanId"], `governanceDecisions[${index}].spanId`),
  };
}

function constantRow(value: unknown, index: number): CheckedModuleConstantV1 {
  const row = captureRecord(
    value,
    ["constantId", "declarationId", "domainTag", "canonicalValue", "valueDigest", "spanId"],
    `constants[${index}]`,
  );
  const canonicalValue = text(row["canonicalValue"], `constants[${index}].canonicalValue`);
  const valueDigest = digest(row["valueDigest"], `constants[${index}].valueDigest`);
  if (sha256Text(canonicalValue) !== valueDigest) {
    fail("SNAPSHOT_DIGEST", `constants[${index}] canonical value does not match its digest`);
  }
  return {
    constantId: text(row["constantId"], `constants[${index}].constantId`),
    declarationId: text(row["declarationId"], `constants[${index}].declarationId`),
    domainTag: text(row["domainTag"], `constants[${index}].domainTag`),
    canonicalValue,
    valueDigest,
    spanId: text(row["spanId"], `constants[${index}].spanId`),
  };
}

function diagnosticRow(value: unknown, index: number): CheckedModuleDiagnosticV1 {
  const row = captureRecord(value, ["diagnosticId", "code", "severity", "messageDigest", "spanId"], `diagnostics[${index}]`);
  if (row["severity"] !== "error" && row["severity"] !== "warning" && row["severity"] !== "info") {
    fail("SNAPSHOT_FIELD", `diagnostics[${index}].severity is invalid`);
  }
  return {
    diagnosticId: text(row["diagnosticId"], `diagnostics[${index}].diagnosticId`),
    code: text(row["code"], `diagnostics[${index}].code`),
    severity: row["severity"],
    messageDigest: digest(row["messageDigest"], `diagnostics[${index}].messageDigest`),
    spanId: text(row["spanId"], `diagnostics[${index}].spanId`),
  };
}

function checkerVersionRow(value: unknown, index: number): CheckedModuleCheckerVersionV1 {
  const row = captureRecord(value, ["stage", "version", "rulesetDigest"], `checkerVersions[${index}]`);
  const stage = CHECKED_MODULE_TRACE_STAGES[index];
  if (stage === undefined || row["stage"] !== stage) fail("SNAPSHOT_TRACE", "checker versions must use the complete ordered stage set");
  return {
    stage,
    version: text(row["version"], `checkerVersions[${index}].version`),
    rulesetDigest: digest(row["rulesetDigest"], `checkerVersions[${index}].rulesetDigest`),
  };
}

function traceRow(value: unknown, index: number): CheckedModuleTraceEntryV1 {
  const row = captureRecord(value, ["stage", "version", "rulesetDigest", "inputDigest", "outputDigest"], `checkerTrace[${index}]`);
  const stage = CHECKED_MODULE_TRACE_STAGES[index];
  if (stage === undefined || row["stage"] !== stage) fail("SNAPSHOT_TRACE", "checker trace must use the complete ordered stage set");
  return {
    stage,
    version: text(row["version"], `checkerTrace[${index}].version`),
    rulesetDigest: digest(row["rulesetDigest"], `checkerTrace[${index}].rulesetDigest`),
    inputDigest: digest(row["inputDigest"], `checkerTrace[${index}].inputDigest`),
    outputDigest: digest(row["outputDigest"], `checkerTrace[${index}].outputDigest`),
  };
}

interface CapturedFacts {
  readonly source: ArtifactReferenceV1;
  readonly spans: readonly CheckedModuleSpanV1[];
  readonly tokens: readonly CheckedModuleTokenV1[];
  readonly declarations: readonly CheckedModuleDeclarationV1[];
  readonly typeFacts: readonly CheckedModuleTypeFactV1[];
  readonly effects: readonly CheckedModuleEffectFactV1[];
  readonly valueStates: readonly CheckedModuleValueStateFactV1[];
  readonly governanceDecisions: readonly CheckedModuleGovernanceDecisionV1[];
  readonly constants: readonly CheckedModuleConstantV1[];
  readonly diagnostics: readonly CheckedModuleDiagnosticV1[];
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) fail("SNAPSHOT_DUPLICATE_IDENTITY", `${label} identities must be unique`);
}

function validateReferences(facts: CapturedFacts): void {
  unique(facts.spans.map((row) => row.spanId), "span");
  unique(facts.tokens.map((row) => row.tokenId), "token");
  unique(facts.declarations.map((row) => row.declarationId), "declaration");
  unique([
    ...facts.typeFacts.map((row) => row.factId),
    ...facts.effects.map((row) => row.factId),
    ...facts.valueStates.map((row) => row.factId),
  ], "semantic fact");
  unique(facts.governanceDecisions.map((row) => row.decisionId), "governance decision");
  unique(facts.constants.map((row) => row.constantId), "constant");
  unique(facts.diagnostics.map((row) => row.diagnosticId), "diagnostic");

  const spans = new Set(facts.spans.map((row) => row.spanId));
  const declarations = new Set(facts.declarations.map((row) => row.declarationId));
  if (facts.spans.some((row) => row.endByte > facts.source.byteLength)) {
    fail("SNAPSHOT_REFERENCE", "span extends beyond the admitted source bytes");
  }
  const spanRows = [
    ...facts.tokens,
    ...facts.declarations,
    ...facts.typeFacts,
    ...facts.effects,
    ...facts.valueStates,
    ...facts.governanceDecisions,
    ...facts.constants,
    ...facts.diagnostics,
  ];
  if (spanRows.some((row) => !spans.has(row.spanId))) fail("SNAPSHOT_REFERENCE", "snapshot row refers to an unknown span");
  const declarationRows = [
    ...facts.typeFacts,
    ...facts.effects,
    ...facts.valueStates,
    ...facts.governanceDecisions,
    ...facts.constants,
  ];
  if (declarationRows.some((row) => !declarations.has(row.declarationId))) {
    fail("SNAPSHOT_REFERENCE", "semantic row refers to an unknown declaration");
  }
  for (const declarationId of declarations) {
    if (
      !facts.typeFacts.some((row) => row.declarationId === declarationId)
      || !facts.effects.some((row) => row.declarationId === declarationId)
      || !facts.valueStates.some((row) => row.declarationId === declarationId)
      || !facts.governanceDecisions.some((row) => row.declarationId === declarationId)
    ) {
      fail("SNAPSHOT_INCOMPLETE_FACTS", `declaration '${declarationId}' lacks a required semantic fact`);
    }
  }
}

function captureFacts(values: DataRecord): CapturedFacts {
  let source: ArtifactReferenceV1;
  try {
    source = validateArtifactReferenceV1(values["source"]);
  } catch (error) {
    if (error instanceof ArtifactReferenceError) fail("SNAPSHOT_SOURCE_IDENTITY", error.message);
    fail("SNAPSHOT_SOURCE_IDENTITY", "source artifact reference could not be captured");
  }
  if (source.owner !== "galerina" || source.kind !== "fungi-source") {
    fail("SNAPSHOT_SOURCE_IDENTITY", "checked snapshot source must be a Galerina fungi-source artifact");
  }
  const facts: CapturedFacts = Object.freeze({
    source,
    spans: captureRows(values["spans"], "spans", spanRow),
    tokens: captureRows(values["tokens"], "tokens", tokenRow),
    declarations: captureRows(values["declarations"], "declarations", declarationRow),
    typeFacts: captureRows(values["typeFacts"], "typeFacts", typeFactRow),
    effects: captureRows(values["effects"], "effects", effectRow),
    valueStates: captureRows(values["valueStates"], "valueStates", valueStateRow),
    governanceDecisions: captureRows(values["governanceDecisions"], "governanceDecisions", governanceRow),
    constants: captureRows(values["constants"], "constants", constantRow),
    diagnostics: captureRows(values["diagnostics"], "diagnostics", diagnosticRow),
  });
  validateReferences(facts);
  return facts;
}

function stagePayload(stage: CheckedModuleTraceStage, facts: CapturedFacts): unknown {
  switch (stage) {
    case "lexer": return { source: facts.source, spans: facts.spans, tokens: facts.tokens };
    case "parser": return { declarations: facts.declarations };
    case "type": return { typeFacts: facts.typeFacts, constants: facts.constants };
    case "effect": return { effects: facts.effects };
    case "value-state": return { valueStates: facts.valueStates };
    case "governance": return { governanceDecisions: facts.governanceDecisions, diagnostics: facts.diagnostics };
  }
}

export function deriveCheckedModuleTraceV1(input: unknown): readonly CheckedModuleTraceEntryV1[] {
  const values = captureRecord(input, [
    "source", "spans", "tokens", "declarations", "typeFacts", "effects", "valueStates",
    "governanceDecisions", "constants", "diagnostics", "checkerVersions",
  ], "checked-module trace input");
  const facts = captureFacts(values);
  const versions = captureRows(values["checkerVersions"], "checkerVersions", checkerVersionRow);
  if (versions.length !== CHECKED_MODULE_TRACE_STAGES.length) fail("SNAPSHOT_TRACE", "checker versions are incomplete");
  let inputDigest = facts.source.digest;
  const entries: CheckedModuleTraceEntryV1[] = [];
  for (let index = 0; index < CHECKED_MODULE_TRACE_STAGES.length; index += 1) {
    const stage = CHECKED_MODULE_TRACE_STAGES[index];
    const version = versions[index];
    if (stage === undefined || version === undefined) fail("SNAPSHOT_TRACE", "checker versions are incomplete");
    const outputDigest = sha256Text(canonicalJson({
      schema: "galerina.checked-module-stage-output.v1",
      stage,
      inputDigest,
      payload: stagePayload(stage, facts),
    }));
    entries.push(Object.freeze({ ...version, inputDigest, outputDigest }));
    inputDigest = outputDigest;
  }
  return frozenArray(entries);
}

function equalTrace(left: readonly CheckedModuleTraceEntryV1[], right: readonly CheckedModuleTraceEntryV1[]): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.stage === other.stage
      && entry.version === other.version
      && entry.rulesetDigest === other.rulesetDigest
      && entry.inputDigest === other.inputDigest
      && entry.outputDigest === other.outputDigest;
  });
}

function bodyRecord(
  facts: CapturedFacts,
  edition: string,
  trace: readonly CheckedModuleTraceEntryV1[],
  compilerCommit: `git:${string}`,
  compilerVersion: string,
  checkerProfileVersion: string,
): Omit<CheckedModuleSnapshotV1, "snapshotBodyDigest" | "runIdentity"> {
  return {
    schema: CHECKED_MODULE_SNAPSHOT_SCHEMA,
    source: facts.source,
    edition,
    spans: facts.spans,
    tokens: facts.tokens,
    declarations: facts.declarations,
    typeFacts: facts.typeFacts,
    effects: facts.effects,
    valueStates: facts.valueStates,
    governanceDecisions: facts.governanceDecisions,
    constants: facts.constants,
    diagnostics: facts.diagnostics,
    checkerTrace: trace,
    compilerCommit,
    compilerVersion,
    checkerProfileVersion,
  };
}

function runIdentity(body: Omit<CheckedModuleSnapshotV1, "snapshotBodyDigest" | "runIdentity">, bodyDigest: Sha256Digest): Sha256Digest {
  return sha256Text(canonicalJson({
    schema: "galerina.checked-module-run-identity.v1",
    sourceDigest: body.source.digest,
    snapshotSchema: body.schema,
    compilerCommit: body.compilerCommit,
    compilerVersion: body.compilerVersion,
    checkerProfileVersion: body.checkerProfileVersion,
    checkers: body.checkerTrace.map((entry) => ({
      stage: entry.stage,
      version: entry.version,
      rulesetDigest: entry.rulesetDigest,
    })),
    snapshotBodyDigest: bodyDigest,
  }));
}

function sealCaptured(values: DataRecord, includeSourceBytes: boolean): CheckedModuleSnapshotV1 {
  if (values["schema"] !== CHECKED_MODULE_SNAPSHOT_SCHEMA) fail("SNAPSHOT_FIELD", "unsupported checked-module snapshot schema");
  const facts = captureFacts(values);
  if (includeSourceBytes) {
    try {
      verifyArtifactBytes(facts.source, values["sourceBytes"]);
    } catch (error) {
      if (error instanceof ArtifactReferenceError) fail("SNAPSHOT_SOURCE_MISMATCH", error.message);
      fail("SNAPSHOT_SOURCE_MISMATCH", "source bytes could not be verified");
    }
  }
  const edition = text(values["edition"], "edition");
  const compilerCommitValue = values["compilerCommit"];
  if (typeof compilerCommitValue !== "string" || !GIT_COMMIT.test(compilerCommitValue)) {
    fail("SNAPSHOT_FIELD", "compilerCommit must be a canonical git commit identity");
  }
  const compilerCommit = compilerCommitValue as `git:${string}`;
  const compilerVersion = text(values["compilerVersion"], "compilerVersion");
  const checkerProfileVersion = text(values["checkerProfileVersion"], "checkerProfileVersion");
  const trace = captureRows(values["checkerTrace"], "checkerTrace", traceRow);
  if (trace.length !== CHECKED_MODULE_TRACE_STAGES.length) fail("SNAPSHOT_TRACE", "checker trace is incomplete");
  const checkerVersions = trace.map(({ stage, version, rulesetDigest }) => ({ stage, version, rulesetDigest }));
  const expectedTrace = deriveCheckedModuleTraceV1({ ...facts, checkerVersions });
  if (!equalTrace(trace, expectedTrace)) fail("SNAPSHOT_TRACE", "checker trace is not bound to the captured snapshot facts");
  const body = Object.freeze(bodyRecord(facts, edition, trace, compilerCommit, compilerVersion, checkerProfileVersion));
  const snapshotBodyDigest = sha256Text(canonicalJson(body));
  const expectedRunIdentity = runIdentity(body, snapshotBodyDigest);
  if (!includeSourceBytes) {
    if (values["snapshotBodyDigest"] !== snapshotBodyDigest || values["runIdentity"] !== expectedRunIdentity) {
      fail("SNAPSHOT_DIGEST", "stored checked-module snapshot identity does not match its canonical body");
    }
  }
  return Object.freeze({ ...body, snapshotBodyDigest, runIdentity: expectedRunIdentity });
}

export function sealCheckedModuleSnapshotV1(input: unknown): CheckedModuleSnapshotV1 {
  return sealCaptured(captureRecord(input, INPUT_KEYS, "checked-module snapshot input"), true);
}

function captureStoredSnapshot(input: unknown): CheckedModuleSnapshotV1 {
  return sealCaptured(captureRecord(input, SNAPSHOT_KEYS, "checked-module snapshot"), false);
}

export function canonicalCheckedModuleSnapshotBytes(snapshotInput: unknown): Uint8Array {
  const snapshot = captureStoredSnapshot(snapshotInput);
  return new TextEncoder().encode(canonicalJson(snapshot));
}

export function verifyCheckedModuleSnapshotBytesV1(bytesInput: unknown): CheckedModuleSnapshotV1 {
  try {
    if (!(bytesInput instanceof Uint8Array) || utilTypes.isProxy(bytesInput)) {
      fail("SNAPSHOT_BYTES", "checked-module snapshot bytes must be a Uint8Array");
    }
    const bytes = Uint8Array.from(bytesInput);
    const textValue = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed = JSON.parse(textValue);
    const snapshot = captureStoredSnapshot(parsed);
    assertExactCanonicalJsonBytes(bytes, snapshot);
    return snapshot;
  } catch (error) {
    if (error instanceof CheckedModuleSnapshotError && error.code === "SNAPSHOT_BYTES") throw error;
    fail("SNAPSHOT_BYTES", "checked-module snapshot bytes failed independent verification");
  }
}
