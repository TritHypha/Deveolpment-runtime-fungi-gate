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

export type PluginInputAdmission =
  | { readonly valid: false; readonly violations: readonly [string, ...string[]] }
  | { readonly valid: true; readonly violations: readonly []; readonly value: unknown };

const MAX_INPUT_BYTES = 4 * 1024 * 1024;
const MAX_INPUT_DEPTH = 32;
const MAX_INPUT_NODES = 10_000;
const MAX_CONTAINER_FIELDS = 1_000;
const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const UTF8 = new TextEncoder();

function refuseInput(code: string): PluginInputAdmission {
  return Object.freeze({
    valid: false as const,
    violations: Object.freeze([code]) as readonly [string, ...string[]],
  });
}

/**
 * Admit untrusted plugin input into a detached, deeply frozen JSON-value snapshot.
 *
 * The walk is iterative so hostile depth cannot consume the host call stack. Property descriptors
 * are inspected without reading properties, which prevents accessor execution. Proxies, cycles,
 * exotic prototypes, sparse/surplus arrays, ambiguous numeric values, and prototype-control keys
 * are refused before any audit hash or engine dispatch can observe the value.
 */
function snapshotPluginInput(input: unknown): PluginInputAdmission {
  type Work = {
    readonly source: unknown;
    readonly depth: number;
    readonly assign: (value: unknown) => void;
  };

  let rootValue: unknown = undefined;
  let nodeCount = 0;
  let textualBytes = 0;
  const seen = new WeakSet<object>();
  const containers: object[] = [];
  const work: Work[] = [{ source: input, depth: 0, assign: (value) => { rootValue = value; } }];

  while (work.length > 0) {
    const current = work.pop()!;
    nodeCount += 1;
    if (nodeCount > MAX_INPUT_NODES) return refuseInput("INPUT_NODE_LIMIT_EXCEEDED");

    const source = current.source;
    if (source === null || source === undefined) return refuseInput("NULL_INPUT");
    if (typeof source === "string") {
      if (source.length > MAX_INPUT_BYTES) return refuseInput("INPUT_SIZE_EXCEEDED");
      textualBytes += UTF8.encode(source).byteLength;
      if (textualBytes > MAX_INPUT_BYTES) return refuseInput("INPUT_SIZE_EXCEEDED");
      current.assign(source);
      continue;
    }
    if (typeof source === "boolean") {
      current.assign(source);
      continue;
    }
    if (typeof source === "number") {
      if (!Number.isFinite(source) || Object.is(source, -0)) return refuseInput("NON_CANONICAL_NUMBER");
      current.assign(source);
      continue;
    }
    if (typeof source !== "object") return refuseInput("UNSUPPORTED_INPUT_TYPE");
    if (current.depth >= MAX_INPUT_DEPTH) return refuseInput("INPUT_DEPTH_EXCEEDED");
    if (utilTypes.isProxy(source)) return refuseInput("PROXY_INPUT");
    if (seen.has(source)) return refuseInput("INPUT_CYCLE");
    seen.add(source);

    try {
      if (Array.isArray(source)) {
        if (Object.getPrototypeOf(source) !== Array.prototype) return refuseInput("EXOTIC_INPUT_PROTOTYPE");
        if (Object.getOwnPropertySymbols(source).length !== 0) return refuseInput("SYMBOL_KEY");
        const descriptors = Object.getOwnPropertyDescriptors(source) as Record<string, PropertyDescriptor>;
        const lengthDescriptor = descriptors["length"];
        if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
          || !Number.isSafeInteger(lengthDescriptor.value) || (lengthDescriptor.value as number) < 0) {
          return refuseInput("NON_CANONICAL_ARRAY");
        }
        const length = lengthDescriptor.value as number;
        if (length > MAX_CONTAINER_FIELDS) return refuseInput("TOO_MANY_FIELDS");
        const names = Object.keys(descriptors).filter((name) => name !== "length");
        if (names.length !== length) return refuseInput("NON_CANONICAL_ARRAY");

        const clone: unknown[] = new Array(length);
        for (let index = length - 1; index >= 0; index -= 1) {
          const name = String(index);
          const descriptor = descriptors[name];
          if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
            return refuseInput("NON_CANONICAL_ARRAY");
          }
          work.push({
            source: descriptor.value,
            depth: current.depth + 1,
            assign: (value) => { clone[index] = value; },
          });
        }
        containers.push(clone);
        current.assign(clone);
        continue;
      }

      const prototype = Object.getPrototypeOf(source);
      if (prototype !== Object.prototype && prototype !== null) return refuseInput("EXOTIC_INPUT_PROTOTYPE");
      if (Object.getOwnPropertySymbols(source).length !== 0) return refuseInput("SYMBOL_KEY");
      const descriptors = Object.getOwnPropertyDescriptors(source);
      const names = Object.keys(descriptors).sort();
      if (names.length > MAX_CONTAINER_FIELDS) return refuseInput("TOO_MANY_FIELDS");
      const clone = Object.create(null) as Record<string, unknown>;
      for (let index = names.length - 1; index >= 0; index -= 1) {
        const name = names[index]!;
        if (FORBIDDEN_OBJECT_KEYS.has(name)) return refuseInput("FORBIDDEN_OBJECT_KEY");
        if (name.length > MAX_INPUT_BYTES) return refuseInput("INPUT_SIZE_EXCEEDED");
        textualBytes += UTF8.encode(name).byteLength;
        if (textualBytes > MAX_INPUT_BYTES) return refuseInput("INPUT_SIZE_EXCEEDED");
        const descriptor = descriptors[name];
        if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
          return refuseInput("ACCESSOR_OR_HIDDEN_FIELD");
        }
        work.push({
          source: descriptor.value,
          depth: current.depth + 1,
          assign: (value) => { clone[name] = value; },
        });
      }
      containers.push(clone);
      current.assign(clone);
    } catch {
      return refuseInput("UNINSPECTABLE_INPUT");
    }
  }

  for (let index = containers.length - 1; index >= 0; index -= 1) {
    Object.freeze(containers[index]!);
  }
  const serialized = JSON.stringify(rootValue);
  if (typeof serialized !== "string" || UTF8.encode(serialized).byteLength > MAX_INPUT_BYTES) {
    return refuseInput("INPUT_SIZE_EXCEEDED");
  }
  return Object.freeze({ valid: true as const, violations: Object.freeze([]) as readonly [], value: rootValue });
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
    const admitted = snapshotPluginInput(v);
    if (!admitted.valid) throw new Error(`ERR_SCHEMA_${admitted.violations[0]}`);
    const encoded = JSON.stringify(admitted.value);
    if (typeof encoded !== "string") throw new Error("ERR_SCHEMA_UNSUPPORTED_INPUT_TYPE");
    return "sha256:" + createHash("sha256").update(encoded).digest("hex").slice(0, 16);
  }

  /** Schema validation — the "Sanitize & Interrogate" protocol */
  validate(input: unknown): PluginInputAdmission {
    return snapshotPluginInput(input);
  }

  /** Mark this sandbox as erased — prevents re-use */
  erase(): void {
    this.erased = true;
  }
}
