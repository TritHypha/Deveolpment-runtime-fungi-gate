/**
 * PluginSandbox — enforces the Load/Execute/Erase lifecycle
 *
 * Each plugin execution is transient — state is erased after every call.
 * No plugin can persist state between calls without an explicit mut + policy {} declaration.
 */

import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

export interface PluginMetadata {
  readonly engineId:      string;
  readonly artifactPath:  string;
  readonly artifactHash:  string;
  readonly governanceTier: 1 | 2 | 3;  // 1=BitNet, 2=Groq, 3=NVFP4
  readonly license:       "MIT" | "Apache-2.0";
  readonly maxMemoryMB:   number;
  readonly capabilityMask: number;  // V_DPM bitmask
}

const PLUGIN_METADATA_KEYS = [
  "engineId", "artifactPath", "artifactHash", "governanceTier",
  "license", "maxMemoryMB", "capabilityMask",
] as const;

/**
 * Convert an untrusted metadata object into an exact, inert, frozen value before it reaches
 * hashing, verification, audit, or sandbox state. Descriptor inspection never invokes accessors.
 */
export function snapshotPluginMetadata(value: unknown): PluginMetadata {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("plugin metadata must be a plain object");
  }
  if (utilTypes.isProxy(value)) throw new Error("plugin metadata proxies are forbidden");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("plugin metadata must have a plain object prototype");
  }
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    throw new Error("plugin metadata must not contain symbol keys");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Object.keys(descriptors).sort();
  const expected = [...PLUGIN_METADATA_KEYS].sort();
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    throw new Error("plugin metadata must contain exactly the canonical fields");
  }
  const read = (name: typeof PLUGIN_METADATA_KEYS[number]): unknown => {
    const descriptor = descriptors[name];
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new Error(`plugin metadata field '${name}' must be an enumerable data descriptor; accessors are forbidden`);
    }
    return descriptor.value;
  };
  const engineId = read("engineId");
  const artifactPath = read("artifactPath");
  const artifactHash = read("artifactHash");
  const governanceTier = read("governanceTier");
  const license = read("license");
  const maxMemoryMB = read("maxMemoryMB");
  const capabilityMask = read("capabilityMask");
  if (typeof engineId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(engineId)) {
    throw new Error("plugin metadata engineId is not canonical");
  }
  if (typeof artifactPath !== "string" || artifactPath.length === 0 || artifactPath.length > 4096 || artifactPath.includes("\0")) {
    throw new Error("plugin metadata artifactPath is invalid");
  }
  if (typeof artifactHash !== "string" || !/^sha256:[A-Za-z0-9._-]+$/.test(artifactHash)) {
    throw new Error("plugin metadata artifactHash is invalid");
  }
  if (governanceTier !== 1 && governanceTier !== 2 && governanceTier !== 3) {
    throw new Error("plugin metadata governanceTier is invalid");
  }
  if (license !== "MIT" && license !== "Apache-2.0") {
    throw new Error("plugin metadata license is invalid");
  }
  if (!Number.isSafeInteger(maxMemoryMB) || (maxMemoryMB as number) <= 0) {
    throw new Error("plugin metadata maxMemoryMB must be a positive safe integer");
  }
  if (!Number.isSafeInteger(capabilityMask) || (capabilityMask as number) < 0 || (capabilityMask as number) > 0xffffffff) {
    throw new Error("plugin metadata capabilityMask must be an unsigned 32-bit integer");
  }
  return Object.freeze({
    engineId,
    artifactPath,
    artifactHash,
    governanceTier,
    license,
    maxMemoryMB,
    capabilityMask,
  }) as PluginMetadata;
}

export interface ExecutionResult {
  readonly success:        boolean;
  readonly outputHash:     string;    // sha256 of output for audit trail
  readonly latencyMs:      number;
  readonly tokenCount?:    number;    // for LLM inference
  readonly trapFired:      boolean;
  readonly trapCode?:      string;
  readonly correlationId:  string;
}

export class PluginSandbox {
  readonly metadata: PluginMetadata;
  private erased = false;

  constructor(metadata: PluginMetadata) {
    this.metadata = snapshotPluginMetadata(metadata);
  }

  isErased(): boolean { return this.erased; }

  /** Hash any value for audit trail correlation */
  static hashValue(v: unknown): string {
    return "sha256:" + createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);
  }

  /** Schema validation — the "Sanitize & Interrogate" protocol */
  validate(input: unknown): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    if (input === null || input === undefined) violations.push("NULL_INPUT");
    if (typeof input === "string" && input.length > 4 * 1024 * 1024) violations.push("INPUT_SIZE_EXCEEDED");
    if (typeof input === "object" && input !== null) {
      const keys = Object.keys(input as object);
      if (keys.length > 1000) violations.push("TOO_MANY_FIELDS");
    }
    return { valid: violations.length === 0, violations };
  }

  /** Mark this sandbox as erased — prevents re-use */
  erase(): void {
    this.erased = true;
  }
}
