import { createHash } from "node:crypto";
import { isProxy as isNodeProxy } from "node:util/types";

export const PROTOCOL_SCHEMA_VERSION = 1 as const;
export const SCALAR_PROFILE = "scalar-1" as const;
export const MAX_FRAME_BYTES = 262_144;
export const MAX_JSON_DEPTH = 32;
export const MAX_JSON_VALUES = 4_096;

const MAX_STRING_BYTES = 65_536;
const MAX_ARRAY_ITEMS = 4_096;
const MAX_RECORD_FIELDS = 128;
const HEX_32 = /^[0-9a-f]{32}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const LOCATOR = /^[a-z0-9][a-z0-9._/-]{0,255}$/u;
const REFUSAL_CODE = /^[A-Z][A-Z0-9_]{0,63}$/u;
const CONTROL_OR_FORMAT = /[\u0000-\u001f\u007f-\u009f]|\p{Cf}/u;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;
const getPrototypeOf = Object.getPrototypeOf;

export type FrameKind = "launcher-request" | "worker-execution" | "worker-ready" | "worker-result" | "receipt";
export type ExecutionState = "COMPLETE" | "REFUSED" | "ERROR" | "CANCELLED";

// NULL AUDIT 2026-08-24: JSON null is one required canonical wire token, not
// an absence convention for product state. Naming it keeps that wire-only
// boundary distinct from ordinary optional product state.
const CANONICAL_NULL = null;
export type CanonicalNull = typeof CANONICAL_NULL;

export interface LauncherRequest {
  readonly schemaVersion: 1;
  readonly nonce: string;
  readonly runtimeProfile: "scalar-1";
  readonly subjectDigest: string;
  readonly flowLocator: string;
  readonly flowDigest: string;
  readonly argumentDigest: string;
  readonly argumentBytes: string;
}

export interface WorkerReady {
  readonly schemaVersion: 1;
  readonly nonce: string;
  readonly workerDigest: string;
  readonly runtimeDigest: string;
  readonly bootstrapControlDigest: string;
}

export interface WorkerExecutionRequest {
  readonly schemaVersion: 1;
  readonly nonce: string;
  readonly artifactDigest: string;
  readonly artifactBytes: string;
  readonly requestDigest: string;
  readonly requestBytes: string;
}

export interface WorkerResult {
  readonly schemaVersion: 1;
  readonly nonce: string;
  readonly executionState: ExecutionState;
  readonly valueDigest: string;
  readonly auditDigest: string;
  readonly boundedValue: CanonicalValue;
  readonly boundedAudit: CanonicalValue;
}

export interface NonAuthorizingReceipt {
  readonly schemaVersion: 1;
  readonly hashAlgorithm: "sha256";
  readonly launcherDigest: string;
  readonly processOwnerDigest: string;
  readonly runtimeDigest: string;
  readonly workerDigest: string;
  readonly registryDigest: string;
  readonly osEvidenceLocator: string;
  readonly processPolicyEvidenceLocator: string;
  readonly environmentPolicyDigest: string;
  readonly scalarProfileDigest: string;
  readonly requestDigest: string;
  readonly subjectDigest: string;
  readonly flowDigest: string;
  readonly argumentDigest: string;
  readonly responseDigest: string;
  readonly valueDigest: string;
  readonly auditDigest: string;
  readonly nonce: string;
  readonly monotonicDurationMs: number;
  readonly executionState: ExecutionState;
  readonly timedOut: boolean;
  readonly truncated: boolean;
  readonly partial: boolean;
  readonly missingEvidence: readonly string[];
  readonly exitCode: number | CanonicalNull;
  readonly refusalCode: string | CanonicalNull;
  readonly authorizing: false;
}

export type CanonicalValue =
  | CanonicalNull
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

export class ProtocolRefusal extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(`UNIT4_PROTOCOL_REFUSED:${code}:${message}`);
    this.name = "ProtocolRefusal";
    this.code = code;
  }
}

interface Budget {
  values: number;
  bytes: number;
}

const FRAME_KEYS: Readonly<Record<FrameKind, readonly string[]>> = Object.freeze({
  "launcher-request": Object.freeze([
    "schemaVersion",
    "nonce",
    "runtimeProfile",
    "subjectDigest",
    "flowLocator",
    "flowDigest",
    "argumentDigest",
    "argumentBytes",
  ]),
  "worker-execution": Object.freeze([
    "schemaVersion",
    "nonce",
    "artifactDigest",
    "artifactBytes",
    "requestDigest",
    "requestBytes",
  ]),
  "worker-ready": Object.freeze([
    "schemaVersion",
    "nonce",
    "workerDigest",
    "runtimeDigest",
    "bootstrapControlDigest",
  ]),
  "worker-result": Object.freeze([
    "schemaVersion",
    "nonce",
    "executionState",
    "valueDigest",
    "auditDigest",
    "boundedValue",
    "boundedAudit",
  ]),
  receipt: Object.freeze([
    "schemaVersion",
    "hashAlgorithm",
    "launcherDigest",
    "processOwnerDigest",
    "runtimeDigest",
    "workerDigest",
    "registryDigest",
    "osEvidenceLocator",
    "processPolicyEvidenceLocator",
    "environmentPolicyDigest",
    "scalarProfileDigest",
    "requestDigest",
    "subjectDigest",
    "flowDigest",
    "argumentDigest",
    "responseDigest",
    "valueDigest",
    "auditDigest",
    "nonce",
    "monotonicDurationMs",
    "executionState",
    "timedOut",
    "truncated",
    "partial",
    "missingEvidence",
    "exitCode",
    "refusalCode",
    "authorizing",
  ]),
});

function refuse(code: string, message?: string): never {
  throw new ProtocolRefusal(code, message);
}

function spendValue(budget: Budget): void {
  budget.values += 1;
  if (budget.values > MAX_JSON_VALUES) refuse("VALUE_BOUND");
}

function checkedString(value: string, label: string): string {
  const bytes = textEncoder.encode(value).byteLength;
  if (bytes > MAX_STRING_BYTES) refuse("STRING_BOUND", label);
  if (value !== value.normalize("NFC")) refuse("STRING_NFC", label);
  if (CONTROL_OR_FORMAT.test(value)) refuse("STRING_CONTROL", label);
  return value;
}

function checkedRecord(value: unknown, depth: number, budget: Budget): Readonly<Record<string, CanonicalValue>> {
  if (depth > MAX_JSON_DEPTH) refuse("DEPTH_BOUND");
  if (value === null || typeof value !== "object" || Array.isArray(value)) refuse("RECORD_REQUIRED");
  if (isNodeProxy(value)) refuse("PROXY_RECORD");
  const prototype = getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) refuse("RECORD_PROTOTYPE");
  if (getOwnPropertySymbols(value).length !== 0) refuse("SYMBOL_FIELD");
  const descriptors = getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  if (keys.length > MAX_RECORD_FIELDS) refuse("FIELD_BOUND");
  const result: Record<string, CanonicalValue> = {};
  for (const key of keys.sort()) {
    checkedString(key, "property-name");
    const descriptor = descriptors[key];
    if (descriptor === undefined || !("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ACCESSOR_FIELD", key);
    }
    if (!descriptor.enumerable) refuse("NON_ENUMERABLE_FIELD", key);
    result[key] = snapshotCanonical(descriptor.value, depth + 1, budget);
  }
  return Object.freeze(result);
}

function checkedArray(value: readonly unknown[], depth: number, budget: Budget): readonly CanonicalValue[] {
  if (depth > MAX_JSON_DEPTH) refuse("DEPTH_BOUND");
  if (isNodeProxy(value)) refuse("PROXY_ARRAY");
  if (getPrototypeOf(value) !== Array.prototype) refuse("ARRAY_PROTOTYPE");
  if (getOwnPropertySymbols(value).length !== 0) refuse("SYMBOL_FIELD");
  const descriptors = getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
  const lengthDescriptor = descriptors["length"];
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value)) {
    refuse("ARRAY_LENGTH");
  }
  const length = lengthDescriptor.value as number;
  if (length > MAX_ARRAY_ITEMS) refuse("ARRAY_BOUND");
  const keys = Object.keys(descriptors).filter((key) => key !== "length");
  if (keys.length !== length) refuse("SPARSE_ARRAY");
  const result: CanonicalValue[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined) {
      refuse("ACCESSOR_ARRAY", String(index));
    }
    result.push(snapshotCanonical(descriptor.value, depth + 1, budget));
  }
  return Object.freeze(result);
}

function snapshotCanonical(value: unknown, depth: number, budget: Budget): CanonicalValue {
  if (depth > MAX_JSON_DEPTH) refuse("DEPTH_BOUND");
  spendValue(budget);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return checkedString(value, "value");
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) refuse("NUMBER_REQUIRED");
    return value;
  }
  if (Array.isArray(value)) return checkedArray(value, depth, budget);
  if (typeof value === "object") return checkedRecord(value, depth, budget);
  refuse("VALUE_TYPE");
}

function exactKeys(record: Readonly<Record<string, CanonicalValue>>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    refuse("UNKNOWN_FIELD", actual.join(","));
  }
}

function stringField(record: Readonly<Record<string, CanonicalValue>>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") refuse("FIELD_TYPE", key);
  return value;
}

function booleanField(record: Readonly<Record<string, CanonicalValue>>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") refuse("FIELD_TYPE", key);
  return value;
}

function integerField(record: Readonly<Record<string, CanonicalValue>>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) refuse("FIELD_TYPE", key);
  return value;
}

function requireDigest(value: string, key: string): string {
  if (!HEX_64.test(value)) refuse("DIGEST_FIELD", key);
  return value;
}

function requireNonce(value: string): string {
  if (!HEX_32.test(value)) refuse("NONCE_FIELD");
  return value;
}

function requireLocator(value: string, key: string): string {
  if (!LOCATOR.test(value) || value.includes("..") || value.includes("//")) refuse("LOCATOR_FIELD", key);
  return value;
}

function requireState(value: string): ExecutionState {
  if (value !== "COMPLETE" && value !== "REFUSED" && value !== "ERROR" && value !== "CANCELLED") {
    refuse("EXECUTION_STATE");
  }
  return value;
}

function validateLauncherRequest(record: Readonly<Record<string, CanonicalValue>>): LauncherRequest {
  exactKeys(record, FRAME_KEYS["launcher-request"]);
  if (record.schemaVersion !== PROTOCOL_SCHEMA_VERSION) refuse("SCHEMA_VERSION");
  if (record.runtimeProfile !== SCALAR_PROFILE) refuse("PROFILE_SCALAR_ONLY");
  const argumentBytes = stringField(record, "argumentBytes");
  if (argumentBytes.length > MAX_FRAME_BYTES || !BASE64.test(argumentBytes)) refuse("ARGUMENT_BYTES");
  return Object.freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    nonce: requireNonce(stringField(record, "nonce")),
    runtimeProfile: SCALAR_PROFILE,
    subjectDigest: requireDigest(stringField(record, "subjectDigest"), "subjectDigest"),
    flowLocator: requireLocator(stringField(record, "flowLocator"), "flowLocator"),
    flowDigest: requireDigest(stringField(record, "flowDigest"), "flowDigest"),
    argumentDigest: requireDigest(stringField(record, "argumentDigest"), "argumentDigest"),
    argumentBytes,
  });
}

function validateWorkerReady(record: Readonly<Record<string, CanonicalValue>>): WorkerReady {
  exactKeys(record, FRAME_KEYS["worker-ready"]);
  if (record.schemaVersion !== PROTOCOL_SCHEMA_VERSION) refuse("SCHEMA_VERSION");
  return Object.freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    nonce: requireNonce(stringField(record, "nonce")),
    workerDigest: requireDigest(stringField(record, "workerDigest"), "workerDigest"),
    runtimeDigest: requireDigest(stringField(record, "runtimeDigest"), "runtimeDigest"),
    bootstrapControlDigest: requireDigest(
      stringField(record, "bootstrapControlDigest"),
      "bootstrapControlDigest",
    ),
  });
}

function validateWorkerExecution(
  record: Readonly<Record<string, CanonicalValue>>,
): WorkerExecutionRequest {
  exactKeys(record, FRAME_KEYS["worker-execution"]);
  if (record.schemaVersion !== PROTOCOL_SCHEMA_VERSION) refuse("SCHEMA_VERSION");
  const artifactBytes = stringField(record, "artifactBytes");
  const requestBytes = stringField(record, "requestBytes");
  if (!BASE64.test(artifactBytes) || artifactBytes.length > MAX_FRAME_BYTES) {
    refuse("ARTIFACT_BYTES");
  }
  if (!BASE64.test(requestBytes) || requestBytes.length > MAX_FRAME_BYTES) {
    refuse("REQUEST_BYTES");
  }
  return Object.freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    nonce: requireNonce(stringField(record, "nonce")),
    artifactDigest: requireDigest(stringField(record, "artifactDigest"), "artifactDigest"),
    artifactBytes,
    requestDigest: requireDigest(stringField(record, "requestDigest"), "requestDigest"),
    requestBytes,
  });
}

function validateWorkerResult(record: Readonly<Record<string, CanonicalValue>>): WorkerResult {
  exactKeys(record, FRAME_KEYS["worker-result"]);
  if (record.schemaVersion !== PROTOCOL_SCHEMA_VERSION) refuse("SCHEMA_VERSION");
  return Object.freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    nonce: requireNonce(stringField(record, "nonce")),
    executionState: requireState(stringField(record, "executionState")),
    valueDigest: requireDigest(stringField(record, "valueDigest"), "valueDigest"),
    auditDigest: requireDigest(stringField(record, "auditDigest"), "auditDigest"),
    boundedValue: record.boundedValue ?? null,
    boundedAudit: record.boundedAudit ?? null,
  });
}

function validateReceiptRecord(record: Readonly<Record<string, CanonicalValue>>): NonAuthorizingReceipt {
  exactKeys(record, FRAME_KEYS.receipt);
  if (record.schemaVersion !== PROTOCOL_SCHEMA_VERSION) refuse("SCHEMA_VERSION");
  if (record.hashAlgorithm !== "sha256") refuse("HASH_ALGORITHM");
  if (record.authorizing !== false) refuse("AUTHORIZING_RECEIPT");
  const missing = record.missingEvidence;
  if (!Array.isArray(missing) || missing.some((entry) => typeof entry !== "string")) {
    refuse("MISSING_EVIDENCE");
  }
  const exitCode = record.exitCode;
  if (exitCode !== null && (typeof exitCode !== "number" || !Number.isSafeInteger(exitCode))) {
    refuse("EXIT_CODE");
  }
  const refusalCode = record.refusalCode;
  if (refusalCode !== null && (typeof refusalCode !== "string" || !REFUSAL_CODE.test(refusalCode))) {
    refuse("REFUSAL_CODE");
  }
  const checkedMissing = Object.freeze(missing.map((entry) => requireLocator(entry as string, "missingEvidence")));
  return Object.freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    hashAlgorithm: "sha256",
    launcherDigest: requireDigest(stringField(record, "launcherDigest"), "launcherDigest"),
    processOwnerDigest: requireDigest(stringField(record, "processOwnerDigest"), "processOwnerDigest"),
    runtimeDigest: requireDigest(stringField(record, "runtimeDigest"), "runtimeDigest"),
    workerDigest: requireDigest(stringField(record, "workerDigest"), "workerDigest"),
    registryDigest: requireDigest(stringField(record, "registryDigest"), "registryDigest"),
    osEvidenceLocator: requireLocator(stringField(record, "osEvidenceLocator"), "osEvidenceLocator"),
    processPolicyEvidenceLocator: requireLocator(
      stringField(record, "processPolicyEvidenceLocator"),
      "processPolicyEvidenceLocator",
    ),
    environmentPolicyDigest: requireDigest(
      stringField(record, "environmentPolicyDigest"),
      "environmentPolicyDigest",
    ),
    scalarProfileDigest: requireDigest(stringField(record, "scalarProfileDigest"), "scalarProfileDigest"),
    requestDigest: requireDigest(stringField(record, "requestDigest"), "requestDigest"),
    subjectDigest: requireDigest(stringField(record, "subjectDigest"), "subjectDigest"),
    flowDigest: requireDigest(stringField(record, "flowDigest"), "flowDigest"),
    argumentDigest: requireDigest(stringField(record, "argumentDigest"), "argumentDigest"),
    responseDigest: requireDigest(stringField(record, "responseDigest"), "responseDigest"),
    valueDigest: requireDigest(stringField(record, "valueDigest"), "valueDigest"),
    auditDigest: requireDigest(stringField(record, "auditDigest"), "auditDigest"),
    nonce: requireNonce(stringField(record, "nonce")),
    monotonicDurationMs: integerField(record, "monotonicDurationMs"),
    executionState: requireState(stringField(record, "executionState")),
    timedOut: booleanField(record, "timedOut"),
    truncated: booleanField(record, "truncated"),
    partial: booleanField(record, "partial"),
    missingEvidence: checkedMissing,
    exitCode: exitCode as number | CanonicalNull,
    refusalCode: refusalCode as string | CanonicalNull,
    authorizing: false,
  });
}

function validateKind(kind: FrameKind, value: unknown): CanonicalValue {
  const budget: Budget = { values: 0, bytes: 0 };
  const snapshot = snapshotCanonical(value, 1, budget);
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) refuse("RECORD_REQUIRED");
  const record = snapshot as Readonly<Record<string, CanonicalValue>>;
  if (kind === "launcher-request") return validateLauncherRequest(record) as unknown as CanonicalValue;
  if (kind === "worker-execution") return validateWorkerExecution(record) as unknown as CanonicalValue;
  if (kind === "worker-ready") return validateWorkerReady(record) as unknown as CanonicalValue;
  if (kind === "worker-result") return validateWorkerResult(record) as unknown as CanonicalValue;
  return validateReceiptRecord(record) as unknown as CanonicalValue;
}

function canonicalJson(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  const record = value as Readonly<Record<string, CanonicalValue>>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key] ?? null)}`).join(",")}}`;
}

class JsonScanner {
  private index = 0;
  private values = 0;

  constructor(private readonly source: string) {}

  parse(): CanonicalValue {
    const value = this.parseValue(1);
    if (this.index !== this.source.length) refuse("JSON_TRAILING");
    return value;
  }

  private spend(depth: number): void {
    if (depth > MAX_JSON_DEPTH) refuse("DEPTH_BOUND");
    this.values += 1;
    if (this.values > MAX_JSON_VALUES) refuse("VALUE_BOUND");
  }

  private parseValue(depth: number): CanonicalValue {
    this.spend(depth);
    const current = this.source[this.index];
    if (current === "{") return this.parseObject(depth);
    if (current === "[") return this.parseArray(depth);
    if (current === '"') return this.parseString();
    if (current === "t" && this.takeLiteral("true")) return true;
    if (current === "f" && this.takeLiteral("false")) return false;
    if (current === "n" && this.takeLiteral("null")) return null;
    return this.parseNumber();
  }

  private takeLiteral(literal: string): boolean {
    if (!this.source.startsWith(literal, this.index)) return false;
    this.index += literal.length;
    return true;
  }

  private parseString(): string {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const code = this.source.charCodeAt(this.index);
      if (code === 0x22) {
        this.index += 1;
        let decoded: unknown;
        try {
          decoded = JSON.parse(this.source.slice(start, this.index));
        } catch {
          refuse("JSON_STRING");
        }
        if (typeof decoded !== "string") refuse("JSON_STRING");
        return checkedString(decoded, "json-string");
      }
      if (code < 0x20) refuse("JSON_STRING_CONTROL");
      if (code === 0x5c) {
        this.index += 1;
        const escaped = this.source[this.index];
        if (escaped === "u") {
          const digits = this.source.slice(this.index + 1, this.index + 5);
          if (!/^[0-9a-fA-F]{4}$/u.test(digits)) refuse("JSON_ESCAPE");
          this.index += 5;
          continue;
        }
        if (escaped === undefined || !'"\\/bfnrt'.includes(escaped)) refuse("JSON_ESCAPE");
      }
      this.index += 1;
    }
    refuse("JSON_STRING_TRUNCATED");
  }

  private parseNumber(): number {
    const remainder = this.source.slice(this.index);
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(remainder);
    if (match === null) refuse("JSON_TOKEN");
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isSafeInteger(value)) refuse("NUMBER_REQUIRED");
    return value;
  }

  private parseArray(depth: number): readonly CanonicalValue[] {
    this.index += 1;
    const values: CanonicalValue[] = [];
    if (this.source[this.index] === "]") {
      this.index += 1;
      return Object.freeze(values);
    }
    while (true) {
      if (values.length >= MAX_ARRAY_ITEMS) refuse("ARRAY_BOUND");
      values.push(this.parseValue(depth + 1));
      const separator = this.source[this.index];
      this.index += 1;
      if (separator === "]") return Object.freeze(values);
      if (separator !== ",") refuse("JSON_ARRAY");
    }
  }

  private parseObject(depth: number): Readonly<Record<string, CanonicalValue>> {
    this.index += 1;
    const result: Record<string, CanonicalValue> = {};
    const seen = new Set<string>();
    if (this.source[this.index] === "}") {
      this.index += 1;
      return Object.freeze(result);
    }
    while (true) {
      if (seen.size >= MAX_RECORD_FIELDS) refuse("FIELD_BOUND");
      if (this.source[this.index] !== '"') refuse("JSON_OBJECT_KEY");
      const key = this.parseString();
      if (seen.has(key)) refuse("DUPLICATE_KEY", key);
      seen.add(key);
      if (this.source[this.index] !== ":") refuse("JSON_OBJECT_COLON");
      this.index += 1;
      result[key] = this.parseValue(depth + 1);
      const separator = this.source[this.index];
      this.index += 1;
      if (separator === "}") return Object.freeze(result);
      if (separator !== ",") refuse("JSON_OBJECT");
    }
  }
}

export function hashProtocolBytes(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_FRAME_BYTES + 8) refuse("HASH_INPUT_BOUND");
  return createHash("sha256").update(bytes).digest("hex");
}

export function hashCanonicalProtocolValue(value: unknown): string {
  const budget: Budget = { values: 0, bytes: 0 };
  const snapshot = snapshotCanonical(value, 1, budget);
  const bytes = textEncoder.encode(canonicalJson(snapshot));
  if (bytes.byteLength > MAX_FRAME_BYTES) refuse("HASH_INPUT_BOUND");
  return createHash("sha256").update(bytes).digest("hex");
}

export function encodeCanonicalFrame(kind: FrameKind, value: unknown): Uint8Array {
  if (!(kind in FRAME_KEYS)) refuse("FRAME_KIND");
  const validated = validateKind(kind, value);
  const body = textEncoder.encode(canonicalJson(validated));
  if (body.byteLength < 1 || body.byteLength > MAX_FRAME_BYTES) refuse("FRAME_BOUND");
  const frame = new Uint8Array(body.byteLength + 8);
  new DataView(frame.buffer).setBigUint64(0, BigInt(body.byteLength), false);
  frame.set(body, 8);
  return frame;
}

export function decodeCanonicalFrame(kind: FrameKind, frame: Uint8Array): CanonicalValue {
  if (!(kind in FRAME_KEYS)) refuse("FRAME_KIND");
  if (!(frame instanceof Uint8Array) || frame.byteLength < 9) refuse("FRAME_TRUNCATED");
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const declaredBig = view.getBigUint64(0, false);
  if (declaredBig > BigInt(MAX_FRAME_BYTES)) refuse("FRAME_BOUND");
  const declared = Number(declaredBig);
  if (declared < 1 || frame.byteLength !== declared + 8) refuse("FRAME_LENGTH");
  let source: string;
  try {
    source = textDecoder.decode(frame.subarray(8));
  } catch {
    refuse("UTF8_INVALID");
  }
  const parsed = new JsonScanner(source).parse();
  const validated = validateKind(kind, parsed);
  if (canonicalJson(validated) !== source) refuse("JSON_NON_CANONICAL");
  return validated;
}

export function validateNonAuthorizingReceipt(value: unknown): NonAuthorizingReceipt {
  const validated = validateKind("receipt", value);
  return validated as unknown as NonAuthorizingReceipt;
}
