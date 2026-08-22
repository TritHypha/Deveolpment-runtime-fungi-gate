import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isProxy as importedIsProxy } from "node:util/types";

import {
  decodeCanonicalFrame,
  encodeCanonicalFrame,
  hashProtocolBytes,
  MAX_FRAME_BYTES,
  PROTOCOL_SCHEMA_VERSION,
  type CanonicalValue,
  type ExecutionState,
  type LauncherRequest,
  type WorkerResult,
} from "./requirement-process-protocol.js";

export const BOOTSTRAP_PROBE_FLOW = "rd0858/unit4/bootstrap-probe" as const;
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
  readonly executionState: "REFUSED" | "ERROR";
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

const DEFAULT_BOOL = freeze({ __tag: "bool", value: true });
const DEFAULT_VERDICT = freeze({ __tag: "verdict", value: 0 });

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
    executionState: "REFUSED" | "ERROR",
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
    let refusalCode = "BOOTSTRAP_PROBE_ONLY";
    let executionState: "REFUSED" | "ERROR" = "REFUSED";
    if (event.kind === "timeout") {
      refusalCode = "WORKER_TIMEOUT";
    } else if (event.kind === "crash") {
      refusalCode = "WORKER_CRASH";
      executionState = "ERROR";
    } else if (!(event.frame instanceof Uint8ArrayRoot) || event.frame.byteLength > MAX_WIRE_FRAME_BYTES) {
      refusalCode = "REQUEST_BOUND";
    } else {
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

    const result = encodeFrame(
      "worker-result",
      makeResult(captured, refusalCode, requestValue, executionState),
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
    write(data: Uint8Array, callback: (error?: Error | null) => void): boolean;
  };
  await new Promise<void>((resolveWrite, rejectWrite) => {
    stdout.write(frame, (error?: Error | null) => {
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
