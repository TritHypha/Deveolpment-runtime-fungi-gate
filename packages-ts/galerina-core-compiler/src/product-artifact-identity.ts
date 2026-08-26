import { createHash } from "node:crypto";

import type {
  AdmittedProductProfile,
  PhysicalProfile,
  ProductSelection,
} from "./product-profile.js";

export interface ProductArtifactContext {
  readonly schemaVersion: 1;
  readonly artifactNamespace: string;
  readonly productId: string;
  readonly governanceClass: string;
  readonly policyDigest: string;
  readonly safetyProfile: string;
  readonly buildMode: string;
  readonly physicalProfile: PhysicalProfile;
}

const CONTEXT_FIELDS = [
  "artifactNamespace",
  "buildMode",
  "governanceClass",
  "physicalProfile",
  "policyDigest",
  "productId",
  "safetyProfile",
  "schemaVersion",
] as const;
const GOVERNANCE_CLASSES = new Set(["zero-trust", "admitted-closed-network", "research-only"]);
const SAFETY_PROFILES = new Set(["strict", "high_integrity", "deterministic"]);
const BUILD_MODES = new Set([
  "build-production",
  "build-deterministic",
  "build-wasm-standalone",
  "build-wasm-hybrid",
]);
const PHYSICAL_PROFILES = new Set(["1", "32", "64", "256"]);
const SHA256 = /^sha256:[0-9a-f]{64}$/;

function refuse(code: "PRODUCT_ARTIFACT_CONTEXT" | "PRODUCT_ARTIFACT_DIGEST", detail: string): never {
  throw new Error(`${code}: ${detail}`);
}

function validateContext(value: ProductArtifactContext): ProductArtifactContext {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "context must be a closed object");
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "context prototype is not admitted");
  }
  const fields = Object.keys(value).sort();
  if (fields.length !== CONTEXT_FIELDS.length || fields.some((field, index) => field !== CONTEXT_FIELDS[index])) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "context has missing or surplus fields");
  }
  if (value.schemaVersion !== 1) refuse("PRODUCT_ARTIFACT_CONTEXT", "schemaVersion is unsupported");
  if (!/^[a-z][a-z0-9/-]{0,127}$/.test(value.artifactNamespace)) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "artifactNamespace is invalid");
  }
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(value.productId)) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "productId is invalid");
  }
  if (!GOVERNANCE_CLASSES.has(value.governanceClass)) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "governanceClass is unsupported");
  }
  if (!SHA256.test(value.policyDigest)) refuse("PRODUCT_ARTIFACT_CONTEXT", "policyDigest is invalid");
  if (!SAFETY_PROFILES.has(value.safetyProfile)) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "safetyProfile is unsupported");
  }
  if (!BUILD_MODES.has(value.buildMode)) refuse("PRODUCT_ARTIFACT_CONTEXT", "buildMode is unsupported");
  if (!PHYSICAL_PROFILES.has(value.physicalProfile)) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "physicalProfile is unsupported");
  }
  return value;
}

export function createProductArtifactContext(
  profile: AdmittedProductProfile,
  selection: ProductSelection,
): Readonly<ProductArtifactContext> {
  if (
    profile.compatibilityState !== "admitted"
    || profile.productId !== selection.productId
    || !profile.admittedSafetyProfiles.includes(selection.safetyProfile)
    || !profile.admittedBuildModes.includes(selection.buildMode)
    || !profile.admittedPhysicalProfiles.includes(selection.physicalProfile)
  ) {
    refuse("PRODUCT_ARTIFACT_CONTEXT", "selection is not admitted by the supplied profile");
  }
  return Object.freeze(validateContext({
    schemaVersion: 1,
    artifactNamespace: profile.artifactNamespace,
    productId: profile.productId,
    governanceClass: profile.governanceClass,
    policyDigest: profile.policyDigest,
    safetyProfile: selection.safetyProfile,
    buildMode: selection.buildMode,
    physicalProfile: selection.physicalProfile,
  }));
}

export function canonicalProductArtifactIdentity(
  context: ProductArtifactContext,
  contentDigest: string,
): string {
  validateContext(context);
  if (!SHA256.test(contentDigest)) refuse("PRODUCT_ARTIFACT_DIGEST", "content digest must be sha256");
  return JSON.stringify({
    schemaVersion: context.schemaVersion,
    artifactNamespace: context.artifactNamespace,
    productId: context.productId,
    governanceClass: context.governanceClass,
    policyDigest: context.policyDigest,
    safetyProfile: context.safetyProfile,
    buildMode: context.buildMode,
    physicalProfile: context.physicalProfile,
    contentDigest,
  });
}

export function productArtifactKey(context: ProductArtifactContext, contentDigest: string): string {
  const canonical = canonicalProductArtifactIdentity(context, contentDigest);
  return `product-artifact-v1:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}
