import { isProxy as isNodeProxy } from "node:util/types";

import {
  decodeCanonicalFrame,
  hashCanonicalProtocolValue,
  hashProtocolBytes,
  type ExecutionState,
  type NonAuthorizingReceipt,
} from "./requirement-process-protocol.js";

const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;
const getPrototypeOf = Object.getPrototypeOf;
const HEX_32 = /^[0-9a-f]{32}$/u;
const HEX_64 = /^[0-9a-f]{64}$/u;
const ZERO_DIGEST = "0".repeat(64);
const MISSING_WORKER_RESULT = Object.freeze([
  "evidence/audit",
  "evidence/response",
  "evidence/value",
]);

export interface RequirementProcessReceiptBinding {
  readonly launcherDigest: string;
  readonly processOwnerDigest: string;
  readonly runtimeDigest: string;
  readonly workerDigest: string;
  readonly registryDigest: string;
  readonly environmentPolicyDigest: string;
  readonly scalarProfileDigest: string;
  readonly requestDigest: string;
  readonly subjectDigest: string;
  readonly flowDigest: string;
  readonly argumentDigest: string;
  readonly nonce: string;
}

export interface AdaptedRequirementProcessReceipt {
  readonly authorizing: false;
  readonly executionState: ExecutionState;
  readonly refusalCode: string;
  readonly receiptDigest: string;
  readonly decision?: "deny" | "ambig" | "allow";
  readonly receipt: NonAuthorizingReceipt;
}

export class RequirementProcessAdapterRefusal extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`REQUIREMENT_PROCESS_ADAPTER_REFUSED:${code}`);
    this.name = "RequirementProcessAdapterRefusal";
    this.code = code;
  }
}

const BINDING_KEYS = Object.freeze([
  "launcherDigest",
  "processOwnerDigest",
  "runtimeDigest",
  "workerDigest",
  "registryDigest",
  "environmentPolicyDigest",
  "scalarProfileDigest",
  "requestDigest",
  "subjectDigest",
  "flowDigest",
  "argumentDigest",
  "nonce",
] as const);

const TERMINAL_ROWS = new Set(Object.freeze([
  "COMPLETE\0NONE\0false\0false\0false",
  "REFUSED\0CHECKED_ARTIFACT_SCHEMA\0false\0false\0false",
  "REFUSED\0CHECKED_ARTIFACT_CANONICAL\0false\0false\0false",
  "REFUSED\0CHECKED_ARTIFACT_DIGEST\0false\0false\0false",
  "REFUSED\0CHECKED_ARTIFACT_IDENTITY\0false\0false\0false",
  "REFUSED\0CHECKED_AST_UNSUPPORTED\0false\0false\0false",
  "REFUSED\0ARGUMENT_CONTRACT\0false\0false\0false",
  "REFUSED\0NONCE_MISMATCH\0false\0false\0false",
  "REFUSED\0SECOND_REQUEST\0false\0false\0false",
  "REFUSED\0BOOTSTRAP_CONTROL\0false\0false\0true",
  "REFUSED\0UNSUPPORTED_PLATFORM\0false\0false\0true",
  "ERROR\0FLOW_EXECUTION\0false\0false\0false",
  "ERROR\0WORKER_TIMEOUT\0true\0false\0true",
  "ERROR\0WORKER_CRASH\0false\0false\0true",
  "ERROR\0WORKER_CRASH\0false\0true\0true",
  "CANCELLED\0CALLER_CANCELLED\0false\0false\0true",
]));

const SCALAR_VALUE_DIGESTS = new Map<
  string,
  "deny" | "ambig" | "allow"
>(["deny", "ambig", "allow"].map((decision) => [
  hashCanonicalProtocolValue(Object.freeze({
    admitted: true,
    authorizing: false,
    decision,
    operation: "scalar-oracle",
    scalarProfile: "scalar-1",
  })),
  decision as "deny" | "ambig" | "allow",
]));

function refuse(code: string): never {
  throw new RequirementProcessAdapterRefusal(code);
}

function captureBinding(value: unknown): RequirementProcessReceiptBinding {
  if (value === null || typeof value !== "object" || Array.isArray(value) || isNodeProxy(value)) {
    refuse("RECEIPT_BINDING");
  }
  if (getPrototypeOf(value) !== Object.prototype || getOwnPropertySymbols(value).length !== 0) {
    refuse("RECEIPT_BINDING");
  }
  const descriptors = getOwnPropertyDescriptors(value);
  const actual = Object.keys(descriptors).sort();
  const expected = [...BINDING_KEYS].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    refuse("RECEIPT_BINDING");
  }
  const captured: Record<string, string> = {};
  for (const key of BINDING_KEYS) {
    const descriptor = descriptors[key];
    if (descriptor === undefined || !("value" in descriptor) || descriptor.get !== undefined
      || descriptor.set !== undefined || !descriptor.enumerable || typeof descriptor.value !== "string") {
      refuse("RECEIPT_BINDING");
    }
    const pattern = key === "nonce" ? HEX_32 : HEX_64;
    if (!pattern.test(descriptor.value)) refuse("RECEIPT_BINDING");
    captured[key] = descriptor.value;
  }
  return Object.freeze(captured) as unknown as RequirementProcessReceiptBinding;
}

function exactMissing(receipt: NonAuthorizingReceipt, required: boolean): void {
  if (!required) {
    if (receipt.missingEvidence.length !== 0) refuse("MISSING_WORKER_EVIDENCE");
    if ([receipt.responseDigest, receipt.valueDigest, receipt.auditDigest].some((value) => value === ZERO_DIGEST)) {
      refuse("MISSING_WORKER_EVIDENCE");
    }
    return;
  }
  if (receipt.missingEvidence.length !== MISSING_WORKER_RESULT.length
    || receipt.missingEvidence.some((value, index) => value !== MISSING_WORKER_RESULT[index])) {
    refuse("MISSING_WORKER_EVIDENCE");
  }
  if ([receipt.responseDigest, receipt.valueDigest, receipt.auditDigest].some((value) => value !== ZERO_DIGEST)) {
    refuse("MISSING_WORKER_EVIDENCE");
  }
}

export function adaptRequirementProcessReceipt(
  receiptFrame: Uint8Array,
  expectedBinding: RequirementProcessReceiptBinding,
): AdaptedRequirementProcessReceipt {
  const binding = captureBinding(expectedBinding);
  const receipt = decodeCanonicalFrame(
    "receipt",
    receiptFrame,
  ) as unknown as NonAuthorizingReceipt;
  for (const key of BINDING_KEYS) {
    if (receipt[key] !== binding[key]) refuse("RECEIPT_BINDING");
  }
  if (receipt.authorizing !== false || receipt.partial !== false || typeof receipt.refusalCode !== "string") {
    refuse("TERMINAL_TUPLE");
  }
  const missing = receipt.refusalCode === "BOOTSTRAP_CONTROL"
    || receipt.refusalCode === "UNSUPPORTED_PLATFORM"
    || receipt.refusalCode === "WORKER_TIMEOUT"
    || receipt.refusalCode === "WORKER_CRASH"
    || receipt.refusalCode === "CALLER_CANCELLED";
  const tuple = `${receipt.executionState}\0${receipt.refusalCode}\0${receipt.timedOut}\0${receipt.truncated}\0${missing}`;
  if (!TERMINAL_ROWS.has(tuple)) refuse("TERMINAL_TUPLE");
  exactMissing(receipt, missing);
  if (receipt.executionState === "COMPLETE") {
    if (receipt.exitCode !== 1) refuse("TERMINAL_TUPLE");
    const decision = SCALAR_VALUE_DIGESTS.get(receipt.valueDigest);
    if (decision === undefined) refuse("SCALAR_VALUE_DIGEST");
    return Object.freeze({
      authorizing: false,
      executionState: receipt.executionState,
      refusalCode: receipt.refusalCode,
      receiptDigest: hashProtocolBytes(receiptFrame),
      decision,
      receipt,
    });
  }
  if (receipt.executionState === "CANCELLED") {
    if (receipt.exitCode !== null) refuse("TERMINAL_TUPLE");
  } else if (receipt.exitCode === null || receipt.exitCode === 0) {
    refuse("TERMINAL_TUPLE");
  }
  return Object.freeze({
    authorizing: false,
    executionState: receipt.executionState,
    refusalCode: receipt.refusalCode,
    receiptDigest: hashProtocolBytes(receiptFrame),
    receipt,
  });
}
