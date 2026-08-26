import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  createProductArtifactContext,
  type ProductArtifactContext,
} from "./product-artifact-identity.js";
import {
  loadProductRegistry,
  resolveProductProfile,
  GALERINA_SELECTION,
  type AdmittedProductProfile,
  type ProductSelection,
} from "./product-profile.js";

const GENERATED_REGISTRY_URL = new URL(
  "../../../product-registry/product-profiles.v1.json",
  import.meta.url,
);

export type ProductCliRefusalCode =
  | "ENTRYPOINT_UNKNOWN"
  | "ENTRYPOINT_PRODUCT_MISMATCH"
  | "GOVERNANCE_OFF_FORBIDDEN"
  | "NATIVE_ROOT_NOT_ADMITTED"
  | "PRODUCT_DUPLICATE"
  | "PHYSICAL_PROFILE_DUPLICATE"
  | "PRODUCT_REQUIRED"
  | "PRODUCT_UNKNOWN"
  | "PRODUCT_NOT_ADMITTED"
  | "SAFETY_PROFILE_NOT_ADMITTED"
  | "BUILD_MODE_NOT_ADMITTED"
  | "BUILD_MODE_CONFLICT"
  | "PHYSICAL_PROFILE_NOT_ADMITTED";

export interface ProductCliReceipt {
  readonly schemaVersion: "fungi.product-cli-receipt.v1";
  readonly status: "ADMITTED";
  readonly authorizing: false;
  readonly entrypointId: "galerina" | "fungi";
  readonly externalAuthorizerId: "vok";
  readonly context: Readonly<ProductArtifactContext>;
}

export type ProductCliAdmission =
  | {
      readonly ok: true;
      readonly productId: string;
      readonly selection: Readonly<ProductSelection>;
      readonly profile: AdmittedProductProfile;
      readonly context: Readonly<ProductArtifactContext>;
      readonly receipt: Readonly<ProductCliReceipt>;
      readonly remainingArgs: readonly string[];
    }
  | { readonly ok: false; readonly code: ProductCliRefusalCode };

function refused(code: ProductCliRefusalCode): ProductCliAdmission {
  return Object.freeze({ ok: false, code });
}

function isGovernanceSwitch(arg: string): boolean {
  return arg === "--governance"
    || arg.startsWith("--governance=")
    || arg.startsWith("--governance-")
    || arg === "--no-governance"
    || arg.startsWith("--no-governance=");
}

export function resolveProductCliSelection(
  entrypointId: string,
  args: readonly string[],
  registryBytes: Uint8Array = readFileSync(fileURLToPath(GENERATED_REGISTRY_URL.href)),
): ProductCliAdmission {
  if (entrypointId !== "galerina" && entrypointId !== "fungi") return refused("ENTRYPOINT_UNKNOWN");

  let requestedProduct: string | undefined;
  let physicalProfile = GALERINA_SELECTION.physicalProfile;
  let physicalProfileSeen = false;
  const requestedBuildModes = new Set<ProductSelection["buildMode"]>();
  const remainingArgs: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (isGovernanceSwitch(arg)) return refused("GOVERNANCE_OFF_FORBIDDEN");
    if (arg === "--native-root" || arg.startsWith("--native-root=")) {
      return refused("NATIVE_ROOT_NOT_ADMITTED");
    }
    if (arg === "--product" || arg.startsWith("--product=")) {
      if (requestedProduct !== undefined) return refused("PRODUCT_DUPLICATE");
      const value = arg === "--product" ? args[index + 1] : arg.slice("--product=".length);
      if (arg === "--product") index += 1;
      if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
        return refused("PRODUCT_REQUIRED");
      }
      requestedProduct = value;
      continue;
    }
    if (arg.startsWith("--physical-profile=")) {
      if (physicalProfileSeen) return refused("PHYSICAL_PROFILE_DUPLICATE");
      physicalProfileSeen = true;
      const value = arg.slice("--physical-profile=".length);
      if (!(["1", "32", "64", "256"] as const).includes(value as "1" | "32" | "64" | "256")) {
        return refused("PHYSICAL_PROFILE_NOT_ADMITTED");
      }
      physicalProfile = value as ProductSelection["physicalProfile"];
      continue;
    }
    if (arg === "--deterministic") requestedBuildModes.add("build-deterministic");
    else if (arg === "--target=wasm-standalone" || arg === "--target=wasm-wasi") requestedBuildModes.add("build-wasm-standalone");
    else if (arg === "--target=wasm-hybrid") requestedBuildModes.add("build-wasm-hybrid");
    remainingArgs.push(arg);
  }

  if (entrypointId === "fungi" && requestedProduct === undefined) return refused("PRODUCT_REQUIRED");
  if (entrypointId === "galerina" && requestedProduct !== undefined && requestedProduct !== "galerina") {
    return refused("ENTRYPOINT_PRODUCT_MISMATCH");
  }
  if (requestedBuildModes.size > 1) return refused("BUILD_MODE_CONFLICT");
  const productId = requestedProduct ?? "galerina";
  const buildMode = requestedBuildModes.values().next().value ?? GALERINA_SELECTION.buildMode;
  const selection: Readonly<ProductSelection> = Object.freeze({
    productId,
    safetyProfile: GALERINA_SELECTION.safetyProfile,
    buildMode,
    physicalProfile,
  });
  const result = resolveProductProfile(loadProductRegistry(registryBytes), selection);
  if (!result.ok) return refused(result.code);
  const context = createProductArtifactContext(result.profile, selection);
  const receipt: Readonly<ProductCliReceipt> = Object.freeze({
    schemaVersion: "fungi.product-cli-receipt.v1",
    status: "ADMITTED",
    authorizing: false,
    entrypointId,
    externalAuthorizerId: "vok",
    context,
  });
  return Object.freeze({
    ok: true,
    productId,
    selection,
    profile: result.profile,
    context,
    receipt,
    remainingArgs: Object.freeze(remainingArgs),
  });
}

export function parseProductCliSelection(
  entrypointId: string,
  args: readonly string[],
  registryBytes?: Uint8Array,
): { readonly ok: true; readonly productId: string } | { readonly ok: false; readonly code: ProductCliRefusalCode } {
  const result = registryBytes === undefined
    ? resolveProductCliSelection(entrypointId, args)
    : resolveProductCliSelection(entrypointId, args, registryBytes);
  return result.ok
    ? Object.freeze({ ok: true, productId: result.productId })
    : result;
}

let fixedGalerinaContext: Readonly<ProductArtifactContext> | undefined;

export function requireFixedGalerinaProductContext(): Readonly<ProductArtifactContext> {
  if (fixedGalerinaContext !== undefined) return fixedGalerinaContext;
  const result = resolveProductCliSelection("galerina", []);
  if (!result.ok) throw new Error(`${result.code}: fixed Galerina product context refused`);
  fixedGalerinaContext = result.context;
  return fixedGalerinaContext;
}
