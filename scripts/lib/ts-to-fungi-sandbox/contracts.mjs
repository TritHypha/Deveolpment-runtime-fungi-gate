import { isAbsolute } from "node:path";

export const SCHEMA = "galerina.ts-to-fungi-sandbox.v1";
export const TOOL_VERSION = 1;
export const MAX_BATCH_REQUESTS = 10;
export const MAX_DIFFERENTIAL_VECTORS = 16;
export const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
export const OUTCOMES = Object.freeze(["CONVERTED", "BLOCKED", "MANUAL_REVIEW"]);
export const BLOCKERS = Object.freeze({
  ACTIVE_OBJECT: "BLOCKED_BY_ACTIVE_OBJECT_IDENTITY_OR_MUTABLE_STATE",
  ASYNC_OR_GENERATOR: "BLOCKED_BY_ASYNC_GENERATOR_OR_PROMISE_ABI",
  BINARY64: "BLOCKED_BY_JAVASCRIPT_BINARY64_OR_NON_INTEGER_NUMBER_ABI",
  CALL_OR_HOST_API: "BLOCKED_BY_UNRESOLVED_CALL_OR_HOST_API_EFFECT_ABI",
  COERCION: "BLOCKED_BY_JAVASCRIPT_COERCION_ABI",
  DECLARATION_ONLY: "NO_RUNTIME_BEHAVIOR_PUBLIC_DTS_DECLARATION",
  DUPLICATE_OR_SHADOW: "BLOCKED_BY_EXISTING_EXACT_OR_ALPHA_RENAMED_FUNGI_TWIN",
  NULLISH: "BLOCKED_BY_NULL_UNDEFINED_OR_OPTION_BOUNDARY_ABI",
  UNSUPPORTED_CONTROL: "BLOCKED_BY_UNSUPPORTED_CONTROL_FLOW_OR_AST_NODE",
  VECTOR_DOMAIN: "BLOCKED_BY_UNBOUNDED_OR_OVERSIZED_DIFFERENTIAL_VECTOR_DOMAIN",
});

export class SandboxRefusal extends Error {
  constructor(code, detail, outcome = "MANUAL_REVIEW") {
    super(detail);
    this.name = "SandboxRefusal";
    this.code = code;
    this.outcome = outcome;
  }
}

export function canonicalRelativeTsPath(value) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.includes("\\")
    || isAbsolute(value)
    || !value.endsWith(".ts")
  ) {
    throw new SandboxRefusal("SOURCE_PATH_INVALID", "source path must be a canonical repository-relative .ts path");
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new SandboxRefusal("SOURCE_PATH_INVALID", "source path contains a non-canonical segment");
  }
  if (parts.some((part) => part === "node_modules" || part === "dist" || part === "build")) {
    throw new SandboxRefusal("SOURCE_PATH_GENERATED", "generated and dependency sources are outside the sandbox boundary");
  }
  return value;
}

export function assertPlainRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new SandboxRefusal("INPUT_RECORD_INVALID", `${label} must be an exact plain record`);
  }
  return value;
}

export function codeUnitCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
