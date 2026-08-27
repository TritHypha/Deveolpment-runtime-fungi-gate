import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isProxy as importedIsProxy } from "node:util/types";

import {
  decodeCanonicalFrame,
  decodeCanonicalJsonValue,
  encodeCanonicalFrame,
  hashProtocolBytes,
  MAX_FRAME_BYTES,
  ProtocolRefusal,
  PROTOCOL_SCHEMA_VERSION,
  type CanonicalValue,
  type ExecutionState,
  type LauncherRequest,
  type WorkerExecutionRequest,
  type WorkerResult,
} from "./requirement-process-protocol.js";

export const BOOTSTRAP_PROBE_FLOW = "rd0858/unit4/bootstrap-probe" as const;
export const SCALAR_ORACLE_FLOW = "rd0858/unit4/scalar-oracle" as const;
export const BOOTSTRAP_PROBE_ARGUMENT_BYTES =
  "eyJvcGVyYXRpb24iOiJib290c3RyYXAtcHJvYmUiLCJyZXF1ZXN0ZWRFZmZlY3RzIjpbXX0=" as const;

const BOOTSTRAP_PROBE_ARGUMENT_DIGEST =
  "b2a79b10858e444b823321e075b3d753e91330dc2ad7aa994002a05b2df6de05";
const NONCE = /^[0-9a-f]{32}$/u;
const DIGEST = /^[0-9a-f]{64}$/u;
const MAX_TIMEOUT_MS = 60_000;
const MAX_WIRE_FRAME_BYTES = MAX_FRAME_BYTES + 8;

// These roots are captured once during module evaluation in the admitted fresh
// process, before any caller-controlled input reader can run.
const descriptorReader = Object.getOwnPropertyDescriptor;
const objectKeys = Object.keys;
const freeze = Object.freeze;
const jsonStringify = JSON.stringify;
const arrayIsArray = Array.isArray;
const Uint8ArrayRoot = Uint8Array;
const ProxyRoot = Proxy;
const isNodeProxy = importedIsProxy;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const encodeUtf8 = textEncoder.encode.bind(textEncoder);
const decodeUtf8 = textDecoder.decode.bind(textDecoder);
const hashConstructor = createHash;
const monotonicNow = Date.now.bind(Date);
const ceil = Math.ceil.bind(Math);
const maximum = Math.max.bind(Math);
const scheduleTimeout = globalThis.setTimeout.bind(globalThis);
const cancelTimeout = globalThis.clearTimeout.bind(globalThis);
const readOwnedFile = readFileSync;
const BufferRoot = Buffer;
const bufferFrom = BufferRoot.from.bind(BufferRoot);
const bufferToString = bufferFrom("").toString;
const decodeFrame = decodeCanonicalFrame;
const encodeFrame = encodeCanonicalFrame;
const hashBytes = hashProtocolBytes;

export interface RequirementWorkerInput {
  read(): Promise<Uint8Array> | Uint8Array;
}

export interface RequirementWorkerOutput {
  write(frame: Uint8Array): Promise<void> | void;
  close(): Promise<void> | void;
}

export interface RequirementWorkerSelfControls {
  readonly boolValue: unknown;
  readonly verdictValue: unknown;
}

export interface RequirementWorkerBootstrap {
  readonly nonce: string;
  readonly workerDigest: string;
  readonly runtimeDigest: string;
  readonly timeoutMs: number;
  readonly selfControls?: RequirementWorkerSelfControls;
}

export interface RequirementWorkerOutcome {
  readonly phase: "CLOSED";
  readonly executionState: "COMPLETE" | "REFUSED" | "ERROR";
  readonly refusalCode: string;
  readonly reads: number;
  readonly writes: number;
  readonly monotonicDurationMs: number;
}

interface CapturedBootstrap {
  readonly nonce: string;
  readonly workerDigest: string;
  readonly runtimeDigest: string;
  readonly timeoutMs: number;
  readonly bootstrapControlDigest: string;
}

interface ScalarExecution {
  readonly executionState: "COMPLETE" | "REFUSED" | "ERROR";
  readonly refusalCode: string;
  readonly evidence?: ScalarEvidence;
  readonly result?: WorkerResult;
}

interface ScalarEvidence {
  readonly flowDigest: string;
  readonly subjectDigest: string;
}

interface ScalarAstNode {
  readonly kind: string;
  readonly value?: string;
  readonly flags?: number;
  readonly children?: readonly ScalarAstNode[];
}

const DEFAULT_BOOL = freeze({ __tag: "bool", value: true });
const DEFAULT_VERDICT = freeze({ __tag: "verdict", value: 0 });
const SCALAR_ARGUMENTS = freeze({
  deny: encodeUtf8('{"subject":-1}'),
  ambig: encodeUtf8('{"subject":0}'),
  allow: encodeUtf8('{"subject":1}'),
});
const EXPECTED_SCALAR_AST: ScalarAstNode = freeze({
  kind: "pureFlowDecl",
  value: "scalarOracle",
  flags: 33,
  children: freeze([
    freeze({
      kind: "paramDecl",
      value: "subject: Verdict",
      children: freeze([freeze({ kind: "typeRef", value: "Verdict", children: freeze([]) })]),
    }),
    freeze({ kind: "typeRef", value: "String", children: freeze([]) }),
    freeze({
      kind: "contractDecl",
      children: freeze([freeze({ kind: "identifier", value: "effects:block", children: freeze([]) })]),
    }),
    freeze({
      kind: "block",
      children: freeze([
        freeze({
          kind: "checkExpr",
          children: freeze([
            freeze({ kind: "identifier", value: "subject", children: freeze([]) }),
            ...(["deny", "ambig", "if"] as const).map((arm, index) => freeze({
              kind: "checkArm",
              value: arm,
              children: freeze([freeze({
                kind: "block",
                children: freeze([freeze({
                  kind: "returnStmt",
                  children: freeze([freeze({
                    kind: "stringLiteral",
                    value: `"${(["deny", "ambig", "allow"] as const)[index]}"`,
                    children: freeze([]),
                  })]),
                })]),
              })]),
            })),
          ]),
        }),
      ]),
    }),
  ]),
});

function ownDataValue(value: unknown, key: string): unknown {
  if ((typeof value !== "object" || value === null) && typeof value !== "function") {
    return undefined;
  }
  if (isNodeProxy(value)) return undefined;
  const descriptor = descriptorReader(value, key);
  if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) {
    return undefined;
  }
  return descriptor.value;
}

function snapshotBool(value: unknown): boolean | undefined {
  const tag = ownDataValue(value, "__tag");
  const payload = ownDataValue(value, "value");
  return tag === "bool" && (payload === true || payload === false) ? payload : undefined;
}

function snapshotVerdict(value: unknown): -1 | 0 | 1 | undefined {
  const tag = ownDataValue(value, "__tag");
  const payload = ownDataValue(value, "value");
  return tag === "verdict" && (payload === -1 || payload === 0 || payload === 1)
    ? payload
    : undefined;
}

function canonicalInternal(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return jsonStringify(value);
  }
  if (typeof value === "string") return jsonStringify(value);
  if (arrayIsArray(value)) {
    let body = "";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) body += ",";
      body += canonicalInternal(value[index] ?? null);
    }
    return `[${body}]`;
  }
  const record = value as Readonly<Record<string, CanonicalValue>>;
  const keys = objectKeys(record);
  for (let index = 1; index < keys.length; index += 1) {
    const key = keys[index]!;
    let cursor = index;
    while (cursor > 0 && keys[cursor - 1]! > key) {
      keys[cursor] = keys[cursor - 1]!;
      cursor -= 1;
    }
    keys[cursor] = key;
  }
  let body = "";
  for (let index = 0; index < keys.length; index += 1) {
    if (index > 0) body += ",";
    const key = keys[index]!;
    body += `${jsonStringify(key)}:${canonicalInternal(record[key] ?? null)}`;
  }
  return `{${body}}`;
}

function digestCanonical(value: CanonicalValue): string {
  return hashBytes(encodeUtf8(canonicalInternal(value)));
}

function digestRaw(bytes: Uint8Array): string {
  return hashConstructor("sha256").update(bytes).digest("hex");
}

function decodeExactBase64(value: string): Uint8Array | undefined {
  try {
    const decoded = bufferFrom(value, "base64");
    const encoded = Reflect.apply(bufferToString, decoded, ["base64"]);
    if (encoded !== value) return undefined;
    return new Uint8ArrayRoot(decoded);
  } catch {
    return undefined;
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function exactScalarAst(ast: ScalarAstNode): boolean {
  return canonicalInternal(ast as unknown as CanonicalValue)
    === canonicalInternal(EXPECTED_SCALAR_AST as unknown as CanonicalValue);
}

class ScalarArtifactDecodeRefusal extends Error {
  constructor(readonly code: string) {
    super(`SCALAR_ARTIFACT_${code}: refused`);
    this.name = "ScalarArtifactDecodeRefusal";
  }
}

function refuseArtifact(code: string): never {
  throw new ScalarArtifactDecodeRefusal(code);
}

const SCALAR_ARTIFACT_FIELDS = freeze([
  "schema",
  "hashAlgorithm",
  "productId",
  "packageId",
  "flowLocator",
  "flowName",
  "languageVersion",
  "runtimeProfile",
  "sourceCanonicalization",
  "sourceDigest",
  "compilerPackageId",
  "compilerVersion",
  "compilerPackageGraphDigest",
  "checkerSetId",
  "checkerSetDigest",
  "generatorId",
  "generatorSourceDigest",
  "qualifier",
  "parameters",
  "returnType",
  "declaredEffects",
  "checkedAst",
]);
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const COMPILER_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u;

function scalarRecord(value: CanonicalValue, code: string): Readonly<Record<string, CanonicalValue>> {
  if (value === null || typeof value !== "object" || arrayIsArray(value)) refuseArtifact(code);
  return value as Readonly<Record<string, CanonicalValue>>;
}

function exactOrderedFields(
  record: Readonly<Record<string, CanonicalValue>>,
  expected: readonly string[],
  code: string,
): void {
  const keys = objectKeys(record);
  if (keys.length !== expected.length) refuseArtifact(code);
  for (let index = 0; index < expected.length; index += 1) {
    if (keys[index] !== expected[index]) refuseArtifact(code);
  }
}

function exactArtifactString(
  record: Readonly<Record<string, CanonicalValue>>,
  key: string,
  expected?: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || (expected !== undefined && value !== expected)) {
    refuseArtifact("IDENTITY");
  }
  return value;
}

function decodeCheckedScalarArtifact(bytes: Uint8Array): ScalarAstNode {
  if (
    bytes.byteLength < 2 ||
    bytes.byteLength > MAX_FRAME_BYTES ||
    bytes[bytes.byteLength - 1] !== 0x0a ||
    bytes[bytes.byteLength - 2] === 0x0a ||
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
  ) refuseArtifact("CANONICAL");
  for (const byte of bytes) if (byte === 0x0d) refuseArtifact("CANONICAL");
  const artifact = scalarRecord(
    decodeCanonicalJsonValue(bytes.subarray(0, bytes.byteLength - 1)),
    "SCHEMA",
  );
  exactOrderedFields(artifact, SCALAR_ARTIFACT_FIELDS, "SCHEMA");
  exactArtifactString(artifact, "schema", "galerina.rd0858.checked-flow.v1");
  exactArtifactString(artifact, "hashAlgorithm", "sha256");
  exactArtifactString(artifact, "productId", "galerina");
  exactArtifactString(artifact, "packageId", "rd0858-unit4-scalar-oracle");
  exactArtifactString(artifact, "flowLocator", SCALAR_ORACLE_FLOW);
  exactArtifactString(artifact, "flowName", "scalarOracle");
  if (artifact.languageVersion !== 1) refuseArtifact("IDENTITY");
  exactArtifactString(artifact, "runtimeProfile", "scalar-1");
  exactArtifactString(artifact, "sourceCanonicalization", "UTF8_NO_BOM_LF_NFC_V1");
  for (const key of [
    "sourceDigest",
    "compilerPackageGraphDigest",
    "checkerSetDigest",
    "generatorSourceDigest",
  ]) {
    if (!SHA256_ID.test(exactArtifactString(artifact, key))) refuseArtifact("IDENTITY");
  }
  exactArtifactString(artifact, "compilerPackageId", "@galerina/core-compiler");
  if (!COMPILER_VERSION.test(exactArtifactString(artifact, "compilerVersion"))) {
    refuseArtifact("IDENTITY");
  }
  exactArtifactString(artifact, "checkerSetId", "galerina.strict-checks.v1");
  exactArtifactString(artifact, "generatorId", "rd0858-scalar-oracle-generator.v1");
  exactArtifactString(artifact, "qualifier", "pure");
  exactArtifactString(artifact, "returnType", "String");
  if (!arrayIsArray(artifact.parameters) || artifact.parameters.length !== 1) {
    refuseArtifact("SCHEMA");
  }
  const parameter = scalarRecord(artifact.parameters[0] ?? null, "SCHEMA");
  exactOrderedFields(parameter, ["name", "type"], "SCHEMA");
  exactArtifactString(parameter, "name", "subject");
  exactArtifactString(parameter, "type", "Verdict");
  if (!arrayIsArray(artifact.declaredEffects) || artifact.declaredEffects.length !== 0) {
    refuseArtifact("IDENTITY");
  }
  const ast = scalarRecord(artifact.checkedAst ?? null, "SCHEMA") as unknown as ScalarAstNode;
  if (!exactScalarAst(ast)) refuseArtifact("AST");
  return ast;
}

function classifyArtifactRefusal(error: unknown): string {
  if (error instanceof ProtocolRefusal) {
    return error.code.includes("CANONICAL") || error.code.startsWith("JSON_") || error.code === "UTF8_INVALID"
      ? "CHECKED_ARTIFACT_CANONICAL"
      : "CHECKED_ARTIFACT_SCHEMA";
  }
  if (!(error instanceof ScalarArtifactDecodeRefusal)) return "CHECKED_ARTIFACT_SCHEMA";
  if (error.code === "IDENTITY") return "CHECKED_ARTIFACT_IDENTITY";
  if (
    error.code.includes("CANONICAL") ||
    error.code === "AST"
  ) {
    return error.code === "AST" ? "CHECKED_AST_UNSUPPORTED" : "CHECKED_ARTIFACT_CANONICAL";
  }
  return "CHECKED_ARTIFACT_SCHEMA";
}

function decodeScalarSubject(request: LauncherRequest): {
  readonly decision: "deny" | "ambig" | "allow";
  readonly trit: -1 | 0 | 1;
} | undefined {
  const bytes = decodeExactBase64(request.argumentBytes);
  if (
    bytes === undefined ||
    digestRaw(bytes) !== request.argumentDigest ||
    request.subjectDigest !== request.argumentDigest
  ) {
    return undefined;
  }
  if (equalBytes(bytes, SCALAR_ARGUMENTS.deny)) {
    return freeze({ decision: "deny", trit: -1 });
  }
  if (equalBytes(bytes, SCALAR_ARGUMENTS.ambig)) {
    return freeze({ decision: "ambig", trit: 0 });
  }
  if (equalBytes(bytes, SCALAR_ARGUMENTS.allow)) {
    return freeze({ decision: "allow", trit: 1 });
  }
  return undefined;
}

function executeExactScalarAst(ast: ScalarAstNode, trit: -1 | 0 | 1): string | undefined {
  if (!exactScalarAst(ast)) return undefined;
  const check = ast.children?.[3]?.children?.[0];
  const arm = check?.children?.[trit + 2];
  const literal = arm?.children?.[0]?.children?.[0]?.children?.[0];
  if (literal?.kind !== "stringLiteral" || typeof literal.value !== "string") return undefined;
  return literal.value.slice(1, -1);
}

function scalarEvidence(request: LauncherRequest): ScalarEvidence {
  return freeze({
    flowDigest: request.flowDigest,
    subjectDigest: request.subjectDigest,
  });
}

function structuralBootstrap(
  bootstrap: RequirementWorkerBootstrap,
): CapturedBootstrap | undefined {
  try {
    const nonce = ownDataValue(bootstrap, "nonce");
    const workerDigest = ownDataValue(bootstrap, "workerDigest");
    const runtimeDigest = ownDataValue(bootstrap, "runtimeDigest");
    const timeoutMs = ownDataValue(bootstrap, "timeoutMs");
    if (
      typeof nonce !== "string" ||
      !NONCE.test(nonce) ||
      typeof workerDigest !== "string" ||
      !DIGEST.test(workerDigest) ||
      typeof runtimeDigest !== "string" ||
      !DIGEST.test(runtimeDigest) ||
      typeof timeoutMs !== "number" ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > MAX_TIMEOUT_MS
    ) {
      return undefined;
    }
    const selfDescriptor = descriptorReader(bootstrap, "selfControls");
    if (selfDescriptor && (!("value" in selfDescriptor) || selfDescriptor.get || selfDescriptor.set)) {
      return undefined;
    }
    const controls = selfDescriptor?.value as RequirementWorkerSelfControls | undefined;
    const boolValue = controls
      ? ownDataValue(controls, "boolValue")
      : DEFAULT_BOOL;
    const verdictValue = controls
      ? ownDataValue(controls, "verdictValue")
      : DEFAULT_VERDICT;
    const boolSnapshot = snapshotBool(boolValue);
    const verdictSnapshot = snapshotVerdict(verdictValue);
    if (boolSnapshot !== true || verdictSnapshot !== 0) return undefined;

    const rootControl = freeze({
      bool: boolSnapshot,
      descriptor: ownDataValue(DEFAULT_BOOL, "value") === true,
      proxy: isNodeProxy(new ProxyRoot(freeze({}), {})),
      utf8: decodeUtf8(encodeUtf8("scalar-1")) === "scalar-1",
      verdict: verdictSnapshot,
    });
    if (!rootControl.descriptor || !rootControl.proxy || !rootControl.utf8) return undefined;
    const bootstrapControlDigest = digestCanonical(rootControl);
    return freeze({
      nonce,
      workerDigest,
      runtimeDigest,
      timeoutMs,
      bootstrapControlDigest,
    });
  } catch {
    return undefined;
  }
}

function boundedAudit(
  bootstrap: CapturedBootstrap,
  refusalCode: string,
  request: LauncherRequest | undefined,
  executionState: "REFUSED" | "ERROR",
): CanonicalValue {
  return freeze({
    authorizing: false,
    bootstrapControlDigest: bootstrap.bootstrapControlDigest,
    executionState,
    flowDigest: request?.flowDigest ?? "0".repeat(64),
    operation: "bootstrap-probe",
    refusalCode,
    subjectDigest: request?.subjectDigest ?? "0".repeat(64),
  });
}

function makeResult(
  bootstrap: CapturedBootstrap,
  refusalCode: string,
  request: LauncherRequest | undefined,
  executionState: "REFUSED" | "ERROR" = "REFUSED",
): WorkerResult {
  const boundedValue: CanonicalValue = freeze({
    admitted: false,
    authorizing: false,
    operation: "bootstrap-probe",
    scalarProfile: "scalar-1",
  });
  const audit = boundedAudit(bootstrap, refusalCode, request, executionState);
  return freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    nonce: bootstrap.nonce,
    executionState,
    valueDigest: digestCanonical(boundedValue),
    auditDigest: digestCanonical(audit),
    boundedValue,
    boundedAudit: audit,
  });
}

function makeScalarResult(
  bootstrap: CapturedBootstrap,
  evidence: ScalarEvidence | undefined,
  executionState: "COMPLETE" | "REFUSED" | "ERROR",
  refusalCode: string,
  decision?: "deny" | "ambig" | "allow",
): WorkerResult {
  const boundedValue: CanonicalValue = freeze({
    admitted: executionState === "COMPLETE",
    authorizing: false,
    ...(decision === undefined ? {} : { decision }),
    operation: "scalar-oracle",
    scalarProfile: "scalar-1",
  });
  const audit: CanonicalValue = freeze({
    authorizing: false,
    bootstrapControlDigest: bootstrap.bootstrapControlDigest,
    executionState,
    executionTier: executionState === "COMPLETE" ? "tree" : "none",
    flowDigest: evidence?.flowDigest ?? "0".repeat(64),
    operation: "scalar-oracle",
    refusalCode,
    subjectDigest: evidence?.subjectDigest ?? "0".repeat(64),
  });
  return freeze({
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    nonce: bootstrap.nonce,
    executionState,
    valueDigest: digestCanonical(boundedValue),
    auditDigest: digestCanonical(audit),
    boundedValue,
    boundedAudit: audit,
  });
}

async function executeScalarEnvelope(
  envelope: WorkerExecutionRequest,
  bootstrap: CapturedBootstrap,
): Promise<ScalarExecution> {
  if (envelope.nonce !== bootstrap.nonce) {
    return freeze({ executionState: "REFUSED", refusalCode: "NONCE_MISMATCH" });
  }
  const artifactBytes = decodeExactBase64(envelope.artifactBytes);
  const requestBytes = decodeExactBase64(envelope.requestBytes);
  if (artifactBytes === undefined || requestBytes === undefined) {
    return freeze({ executionState: "REFUSED", refusalCode: "REQUEST_PROTOCOL" });
  }
  if (digestRaw(artifactBytes) !== envelope.artifactDigest) {
    return freeze({ executionState: "REFUSED", refusalCode: "CHECKED_ARTIFACT_DIGEST" });
  }
  if (digestRaw(requestBytes) !== envelope.requestDigest) {
    return freeze({ executionState: "REFUSED", refusalCode: "REQUEST_PROTOCOL" });
  }

  let request: LauncherRequest;
  try {
    request = decodeFrame("launcher-request", requestBytes) as unknown as LauncherRequest;
  } catch {
    return freeze({ executionState: "REFUSED", refusalCode: "REQUEST_PROTOCOL" });
  }
  const evidence = scalarEvidence(request);
  if (request.nonce !== bootstrap.nonce) {
    return freeze({ executionState: "REFUSED", refusalCode: "NONCE_MISMATCH", evidence });
  }
  if (request.flowLocator !== SCALAR_ORACLE_FLOW) {
    return freeze({ executionState: "REFUSED", refusalCode: "OPERATION_NOT_ADMITTED", evidence });
  }
  if (request.flowDigest !== envelope.artifactDigest) {
    return freeze({ executionState: "REFUSED", refusalCode: "CHECKED_ARTIFACT_DIGEST", evidence });
  }

  let artifact;
  try {
    artifact = { checkedAst: decodeCheckedScalarArtifact(artifactBytes) };
  } catch (error) {
    return freeze({ executionState: "REFUSED", refusalCode: classifyArtifactRefusal(error), evidence });
  }
  if (
    !exactScalarAst(artifact.checkedAst)
  ) {
    return freeze({ executionState: "REFUSED", refusalCode: "CHECKED_AST_UNSUPPORTED", evidence });
  }
  const subject = decodeScalarSubject(request);
  if (subject === undefined) {
    return freeze({ executionState: "REFUSED", refusalCode: "ARGUMENT_CONTRACT", evidence });
  }

  try {
    const decision = executeExactScalarAst(artifact.checkedAst, subject.trit);
    if (decision !== subject.decision) {
      return freeze({ executionState: "ERROR", refusalCode: "FLOW_EXECUTION", evidence });
    }
    return freeze({
      executionState: "COMPLETE",
      refusalCode: "NONE",
      evidence,
      result: makeScalarResult(bootstrap, evidence, "COMPLETE", "NONE", subject.decision),
    });
  } catch {
    return freeze({ executionState: "ERROR", refusalCode: "FLOW_EXECUTION", evidence });
  }
}

async function writeFrame(
  output: RequirementWorkerOutput,
  frame: Uint8Array,
): Promise<boolean> {
  try {
    await output.write(frame);
    return true;
  } catch {
    return false;
  }
}

function elapsed(started: number): number {
  return maximum(0, ceil(monotonicNow() - started));
}

export async function runRequirementProcessWorker(
  input: RequirementWorkerInput,
  output: RequirementWorkerOutput,
  bootstrap: RequirementWorkerBootstrap,
): Promise<RequirementWorkerOutcome> {
  const started = monotonicNow();
  let reads = 0;
  let writes = 0;
  let captured: CapturedBootstrap | undefined;
  let outcome: RequirementWorkerOutcome | undefined;

  const finish = (
    executionState: "COMPLETE" | "REFUSED" | "ERROR",
    refusalCode: string,
  ): RequirementWorkerOutcome => freeze({
    phase: "CLOSED",
    executionState,
    refusalCode,
    reads,
    writes,
    monotonicDurationMs: elapsed(started),
  });

  try {
    captured = structuralBootstrap(bootstrap);
    if (!captured) {
      const fallback: CapturedBootstrap = freeze({
        nonce: "0".repeat(32),
        workerDigest: "0".repeat(64),
        runtimeDigest: "0".repeat(64),
        timeoutMs: 1,
        bootstrapControlDigest: "0".repeat(64),
      });
      const frame = encodeFrame(
        "worker-result",
        makeResult(fallback, "BOOTSTRAP_CONTROL", undefined),
      );
      if (await writeFrame(output, frame)) writes += 1;
      outcome = finish("REFUSED", "BOOTSTRAP_CONTROL");
      return outcome;
    }

    const ready = encodeFrame("worker-ready", freeze({
      schemaVersion: PROTOCOL_SCHEMA_VERSION,
      nonce: captured.nonce,
      workerDigest: captured.workerDigest,
      runtimeDigest: captured.runtimeDigest,
      bootstrapControlDigest: captured.bootstrapControlDigest,
    }));
    if (!(await writeFrame(output, ready))) {
      outcome = finish("ERROR", "OUTPUT_WRITE");
      return outcome;
    }
    writes += 1;

    reads += 1;
    const readEvent = Promise.resolve()
      .then(() => input.read())
      .then(
        (frame) => ({ kind: "frame" as const, frame }),
        () => ({ kind: "crash" as const }),
      );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutEvent = new Promise<{ kind: "timeout" }>((resolveTimeout) => {
      timer = scheduleTimeout(() => resolveTimeout({ kind: "timeout" }), captured!.timeoutMs);
    });
    const event = await Promise.race([readEvent, timeoutEvent]);
    if (timer !== undefined) cancelTimeout(timer);

    let requestValue: LauncherRequest | undefined;
    let scalarEvidenceValue: ScalarEvidence | undefined;
    let resultValue: WorkerResult | undefined;
    let refusalCode = "BOOTSTRAP_PROBE_ONLY";
    let executionState: "COMPLETE" | "REFUSED" | "ERROR" = "REFUSED";
    if (event.kind === "timeout") {
      refusalCode = "WORKER_TIMEOUT";
    } else if (event.kind === "crash") {
      refusalCode = "WORKER_CRASH";
      executionState = "ERROR";
    } else if (!(event.frame instanceof Uint8ArrayRoot) || event.frame.byteLength > MAX_WIRE_FRAME_BYTES) {
      refusalCode = "REQUEST_BOUND";
    } else {
      try {
        const envelope = decodeFrame(
          "worker-execution",
          event.frame,
        ) as unknown as WorkerExecutionRequest;
        const scalar = await executeScalarEnvelope(envelope, captured);
        scalarEvidenceValue = scalar.evidence;
        refusalCode = scalar.refusalCode;
        executionState = scalar.executionState;
        resultValue = scalar.result ?? makeScalarResult(
          captured,
          scalarEvidenceValue,
          executionState,
          refusalCode,
        );
      } catch {
        try {
          requestValue = decodeFrame("launcher-request", event.frame) as unknown as LauncherRequest;
          if (requestValue.nonce !== captured.nonce) {
            refusalCode = "NONCE_MISMATCH";
          } else if (requestValue.flowLocator !== BOOTSTRAP_PROBE_FLOW) {
            refusalCode = "OPERATION_NOT_ADMITTED";
          } else if (
            requestValue.argumentBytes !== BOOTSTRAP_PROBE_ARGUMENT_BYTES ||
            requestValue.argumentDigest !== BOOTSTRAP_PROBE_ARGUMENT_DIGEST
          ) {
            refusalCode = "ARGUMENT_CONTRACT";
          }
        } catch {
          refusalCode = "REQUEST_PROTOCOL";
        }
      }
    }

    const result = encodeFrame(
      "worker-result",
      resultValue ?? makeResult(captured, refusalCode, requestValue, executionState === "COMPLETE" ? "ERROR" : executionState),
    );
    if (!(await writeFrame(output, result))) {
      outcome = finish("ERROR", "OUTPUT_WRITE");
      return outcome;
    }
    writes += 1;
    outcome = finish(executionState, refusalCode);
    return outcome;
  } catch {
    outcome = finish("ERROR", "WORKER_CRASH");
    return outcome;
  } finally {
    try {
      await output.close();
    } catch {
      if (!outcome) outcome = finish("ERROR", "OUTPUT_CLOSE");
    }
  }
}

async function readOneStdinFrame(): Promise<Uint8Array> {
  const nodeProcess = process as unknown as {
    readonly stdin: AsyncIterable<Uint8Array>;
  };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of nodeProcess.stdin) {
    const bytes = chunk instanceof Uint8Array ? chunk : Uint8Array.from(chunk as ArrayLike<number>);
    total += bytes.byteLength;
    if (total > MAX_WIRE_FRAME_BYTES) throw new Error("REQUEST_BOUND");
    chunks.push(Uint8Array.from(bytes));
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

async function writeStdoutFrame(frame: Uint8Array): Promise<void> {
  const stdout = process.stdout as unknown as {
    write(data: Uint8Array, callback: (error?: Error) => void): boolean;
  };
  await new Promise<void>((resolveWrite, rejectWrite) => {
    stdout.write(frame, (error?: Error) => {
      if (error) rejectWrite(error);
      else resolveWrite();
    });
  });
}

export async function runRequirementProcessWorkerCli(): Promise<RequirementWorkerOutcome> {
  const nodeProcess = process as unknown as {
    readonly execPath: string;
  };
  const workerPath = resolve(process.argv[1] ?? fileURLToPath(import.meta.url));
  const runtimePath = resolve(nodeProcess.execPath);
  const nonce = process.env.GALERINA_UNIT4_NONCE ?? "";
  const workerDigest = hashConstructor("sha256").update(readOwnedFile(workerPath)).digest("hex");
  const runtimeDigest = hashConstructor("sha256").update(readOwnedFile(runtimePath)).digest("hex");
  return runRequirementProcessWorker(
    { read: readOneStdinFrame },
    {
      write: writeStdoutFrame,
      close() {
        // The native launcher owns the pipe lifetime.
      },
    },
    { nonce, workerDigest, runtimeDigest, timeoutMs: 1_000 },
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && invokedPath === resolve(fileURLToPath(import.meta.url))) {
  void runRequirementProcessWorkerCli().then(
    () => {
      process.exit(1);
    },
    () => {
      process.exit(1);
    },
  );
}
