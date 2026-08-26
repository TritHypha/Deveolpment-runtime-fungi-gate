export type ProductId = string;
export type PhysicalProfile = "1" | "32" | "64" | "256";
export type ProductCompatibilityState = "planned" | "admitted" | "lab" | "retired";

export interface ProductSelection {
  readonly productId: string;
  readonly safetyProfile: string;
  readonly buildMode: string;
  readonly physicalProfile: PhysicalProfile;
}

export interface AdmittedProductProfile {
  readonly productId: ProductId;
  readonly productClass: "production" | "research-nonprod";
  readonly governanceClass: "zero-trust" | "admitted-closed-network" | "research-only";
  readonly compatibilityState: "admitted";
  readonly policyId: string;
  readonly policyDigest: string;
  readonly packageNamespaces: readonly string[];
  readonly artifactNamespace: string;
  readonly admittedSafetyProfiles: readonly string[];
  readonly admittedBuildModes: readonly string[];
  readonly admittedPhysicalProfiles: readonly PhysicalProfile[];
  readonly entrypointId: string;
  readonly externalAuthorizerId: "vok";
}

interface ProductProfileRecord extends Omit<AdmittedProductProfile, "compatibilityState"> {
  readonly compatibilityState: ProductCompatibilityState;
}

export interface ProductRegistry {
  readonly schema: "product-profiles.v1";
  readonly schemaVersion: 1;
  readonly products: readonly ProductProfileRecord[];
}

export type ProductProfileResult =
  | { readonly ok: true; readonly profile: AdmittedProductProfile }
  | {
      readonly ok: false;
      readonly code:
        | "PRODUCT_UNKNOWN"
        | "PRODUCT_NOT_ADMITTED"
        | "SAFETY_PROFILE_NOT_ADMITTED"
        | "BUILD_MODE_NOT_ADMITTED"
        | "PHYSICAL_PROFILE_NOT_ADMITTED";
    };

const MAX_REGISTRY_BYTES = 1_048_576;
const PRODUCT_CLASSES = new Set(["production", "research-nonprod"]);
const GOVERNANCE_CLASSES = new Set(["zero-trust", "admitted-closed-network", "research-only"]);
const COMPATIBILITY_STATES = new Set(["planned", "admitted", "lab", "retired"]);
const PHYSICAL_PROFILES = new Set<PhysicalProfile>(["1", "32", "64", "256"]);
const SAFETY_PROFILES = new Set(["strict", "high_integrity", "deterministic"]);
const BUILD_MODES = new Set([
  "build-production",
  "build-deterministic",
  "build-wasm-standalone",
  "build-wasm-hybrid",
]);
const ROOT_FIELDS = ["products", "schema", "schemaVersion"];
const PRODUCT_FIELDS = [
  "admittedBuildModes",
  "admittedPhysicalProfiles",
  "admittedSafetyProfiles",
  "artifactNamespace",
  "compatibilityState",
  "entrypointId",
  "externalAuthorizerId",
  "governanceClass",
  "packageNamespaces",
  "policyDigest",
  "policyId",
  "productClass",
  "productId",
];

function refuse(code: string, detail: string): never {
  throw new Error(`${code}: ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === fields.length && actual.every((field, index) => field === fields[index]);
}

function rejectDuplicateDecodedKeys(text: string): void {
  const stack: Array<
    | { readonly kind: "array" }
    | { readonly kind: "object"; readonly keys: Set<string>; expectKey: boolean }
  > = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') {
      let end = index + 1;
      while (end < text.length) {
        if (text[end] === "\\") {
          end += 2;
          continue;
        }
        if (text[end] === '"') break;
        end += 1;
      }
      if (end >= text.length) refuse("REGISTRY_JSON", "unterminated string");
      const top = stack.at(-1);
      if (top?.kind === "object" && top.expectKey) {
        let key: unknown;
        try {
          key = JSON.parse(text.slice(index, end + 1));
        } catch {
          refuse("REGISTRY_JSON", "malformed object key");
        }
        if (typeof key !== "string") refuse("REGISTRY_JSON", "object key must decode to a string");
        if (top.keys.has(key)) refuse("REGISTRY_JSON_DUPLICATE", `duplicate decoded key ${JSON.stringify(key)}`);
        top.keys.add(key);
        top.expectKey = false;
      }
      index = end + 1;
      continue;
    }
    if (character === "{") stack.push({ kind: "object", keys: new Set(), expectKey: true });
    else if (character === "[") stack.push({ kind: "array" });
    else if (character === "}" || character === "]") stack.pop();
    else if (character === ",") {
      const top = stack.at(-1);
      if (top?.kind === "object") top.expectKey = true;
    }
    index += 1;
  }
}

function decodeRegistry(input: string | Uint8Array): unknown {
  let text: string;
  if (typeof input === "string") {
    const byteLength = new TextEncoder().encode(input).byteLength;
    if (byteLength < 1 || byteLength > MAX_REGISTRY_BYTES) {
      refuse("REGISTRY_BOUNDS", "registry text is outside the closed byte bounds");
    }
    text = input;
  } else if (input instanceof Uint8Array) {
    if (input.byteLength < 1 || input.byteLength > MAX_REGISTRY_BYTES) {
      refuse("REGISTRY_BOUNDS", "registry bytes are outside the closed byte bounds");
    }
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(input);
    } catch {
      refuse("REGISTRY_UTF8", "registry bytes are not canonical UTF-8");
    }
  } else {
    throw new TypeError("loadProductRegistry requires a string or Uint8Array");
  }
  rejectDuplicateDecodedKeys(text);
  try {
    return JSON.parse(text);
  } catch {
    refuse("REGISTRY_JSON", "registry is not valid JSON");
  }
}

function stringArray(
  value: unknown,
  field: string,
  admitted: ReadonlySet<string> | null = null,
): readonly string[] {
  if (!Array.isArray(value) || value.length > 64 || !value.every((entry) => typeof entry === "string")) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${field} must be a bounded string array`);
  }
  const strings = value as string[];
  if (new Set(strings).size !== strings.length) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${field} must not contain duplicates`);
  }
  if (admitted !== null && strings.some((entry) => !admitted.has(entry))) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${field} contains an unknown value`);
  }
  return Object.freeze([...strings]);
}

function requiredIdentity(value: unknown, pattern: RegExp, field: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${field} has an invalid identity`);
  }
  return value;
}

function loadProduct(row: unknown): ProductProfileRecord {
  if (!isRecord(row) || !exactFields(row, PRODUCT_FIELDS)) {
    refuse("REGISTRY_PRODUCT_FIELDS", "product row has missing or unknown fields");
  }
  const productId = requiredIdentity(row.productId, /^[a-z][a-z0-9-]{0,63}$/, "productId");
  const productClass = row.productClass;
  const governanceClass = row.governanceClass;
  const compatibilityState = row.compatibilityState;
  if (typeof productClass !== "string" || !PRODUCT_CLASSES.has(productClass)) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId}.productClass is unknown`);
  }
  if (typeof governanceClass !== "string" || !GOVERNANCE_CLASSES.has(governanceClass)) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId}.governanceClass is unknown`);
  }
  if (typeof compatibilityState !== "string" || !COMPATIBILITY_STATES.has(compatibilityState)) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId}.compatibilityState is unknown`);
  }
  const policyId = requiredIdentity(row.policyId, /^[a-z][a-z0-9-]{0,127}$/, "policyId");
  if (typeof row.policyDigest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(row.policyDigest)) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId}.policyDigest is invalid`);
  }
  const packageNamespaces = stringArray(row.packageNamespaces, `${productId}.packageNamespaces`);
  const artifactNamespace = requiredIdentity(row.artifactNamespace, /^[a-z][a-z0-9/-]{0,127}$/, "artifactNamespace");
  const admittedSafetyProfiles = stringArray(row.admittedSafetyProfiles, `${productId}.admittedSafetyProfiles`, SAFETY_PROFILES);
  const admittedBuildModes = stringArray(row.admittedBuildModes, `${productId}.admittedBuildModes`, BUILD_MODES);
  const physicalStrings = stringArray(row.admittedPhysicalProfiles, `${productId}.admittedPhysicalProfiles`, PHYSICAL_PROFILES);
  const admittedPhysicalProfiles = Object.freeze([...physicalStrings] as PhysicalProfile[]);
  const entrypointId = requiredIdentity(row.entrypointId, /^[a-z][a-z0-9-]{0,127}$/, "entrypointId");
  if (row.externalAuthorizerId !== "vok") {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId}.externalAuthorizerId is unknown`);
  }
  if (
    compatibilityState !== "admitted"
    && (admittedSafetyProfiles.length !== 0
      || admittedBuildModes.length !== 0
      || admittedPhysicalProfiles.length !== 0)
  ) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId} is non-admitted but exposes execution profiles`);
  }
  if (
    compatibilityState === "admitted"
    && (admittedSafetyProfiles.length === 0
      || admittedBuildModes.length === 0
      || admittedPhysicalProfiles.length === 0)
  ) {
    refuse("REGISTRY_PRODUCT_FIELDS", `${productId} is admitted without a complete execution profile`);
  }
  return Object.freeze({
    productId,
    productClass: productClass as ProductProfileRecord["productClass"],
    governanceClass: governanceClass as ProductProfileRecord["governanceClass"],
    compatibilityState: compatibilityState as ProductCompatibilityState,
    policyId,
    policyDigest: row.policyDigest,
    packageNamespaces,
    artifactNamespace,
    admittedSafetyProfiles,
    admittedBuildModes,
    admittedPhysicalProfiles,
    entrypointId,
    externalAuthorizerId: "vok",
  });
}

export function loadProductRegistry(input: string | Uint8Array): ProductRegistry {
  const value = decodeRegistry(input);
  if (!isRecord(value) || !exactFields(value, ROOT_FIELDS)) {
    refuse("REGISTRY_FIELDS", "registry has missing or unknown fields");
  }
  if (value.schema !== "product-profiles.v1" || value.schemaVersion !== 1) {
    refuse("REGISTRY_FIELDS", "registry schema identity is unsupported");
  }
  if (!Array.isArray(value.products) || value.products.length < 1 || value.products.length > 64) {
    refuse("REGISTRY_FIELDS", "registry products are outside the closed bounds");
  }
  const products = value.products.map(loadProduct);
  const ids = products.map((product) => product.productId);
  if (new Set(ids).size !== ids.length) refuse("REGISTRY_PRODUCT_DUPLICATE", "productId values must be unique");
  return Object.freeze({
    schema: "product-profiles.v1",
    schemaVersion: 1,
    products: Object.freeze(products),
  });
}

function denied(code: ProductProfileResult extends infer _T ? Exclude<ProductProfileResult, { ok: true }>["code"] : never): ProductProfileResult {
  return Object.freeze({ ok: false, code });
}

export function resolveProductProfile(
  registry: ProductRegistry,
  selection: ProductSelection,
): ProductProfileResult {
  const product = registry.products.find((candidate) => candidate.productId === selection.productId);
  if (product === undefined) return denied("PRODUCT_UNKNOWN");
  if (product.compatibilityState !== "admitted") return denied("PRODUCT_NOT_ADMITTED");
  if (!product.admittedSafetyProfiles.includes(selection.safetyProfile)) {
    return denied("SAFETY_PROFILE_NOT_ADMITTED");
  }
  if (!product.admittedBuildModes.includes(selection.buildMode)) {
    return denied("BUILD_MODE_NOT_ADMITTED");
  }
  if (!product.admittedPhysicalProfiles.includes(selection.physicalProfile)) {
    return denied("PHYSICAL_PROFILE_NOT_ADMITTED");
  }
  return Object.freeze({ ok: true, profile: product as AdmittedProductProfile });
}
