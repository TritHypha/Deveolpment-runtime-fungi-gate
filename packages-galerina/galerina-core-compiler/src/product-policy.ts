import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { EffectCheckResult } from "./effect-checker.js";
import {
  verifyGovernance,
  type DeploymentProfile,
  type GovernanceDiagnostic,
  type GovernanceVerifyResult,
} from "./governance-verifier.js";
import type { AstNode, FlowMeta } from "./parser.js";
import {
  loadProductRegistry,
  resolveProductProfile,
  GALERINA_SELECTION,
  type AdmittedProductProfile,
  type ProductSelection,
} from "./product-profile.js";

export { GALERINA_SELECTION } from "./product-profile.js";

const GENERATED_REGISTRY_URL = new URL(
  "../../../product-registry/product-profiles.v1.json",
  import.meta.url,
);

export interface ProductPolicyInput {
  readonly ast: AstNode;
  readonly flows: readonly FlowMeta[];
  readonly effectResults: readonly EffectCheckResult[];
  readonly deploymentProfile: DeploymentProfile;
  readonly sourceFile?: string;
}

export type ProductPolicyResult =
  | {
      readonly ok: true;
      readonly diagnostics: readonly GovernanceDiagnostic[];
      readonly evidence: GovernanceVerifyResult;
    }
  | {
      readonly ok: false;
      readonly code: "PRODUCT_POLICY_NOT_ADMITTED";
      readonly diagnostics: readonly GovernanceDiagnostic[];
    };

export function requireAdmittedProductProfile(
  selection: ProductSelection,
  registryBytes: Uint8Array = readFileSync(fileURLToPath(GENERATED_REGISTRY_URL.href)),
): AdmittedProductProfile {
  const result = resolveProductProfile(loadProductRegistry(registryBytes), selection);
  if (!result.ok) throw new Error(`${result.code}: selected product profile refused`);
  return result.profile;
}

export function evaluateProductPolicy(
  profile: AdmittedProductProfile,
  input: ProductPolicyInput,
): ProductPolicyResult {
  if (
    profile.compatibilityState !== "admitted"
    || profile.productId !== "galerina"
    || profile.policyId !== "galerina-governance-v1"
  ) {
    return Object.freeze({
      ok: false,
      code: "PRODUCT_POLICY_NOT_ADMITTED",
      diagnostics: Object.freeze([]),
    });
  }
  const evidence = verifyGovernance(
    input.ast,
    input.flows,
    input.effectResults,
    input.deploymentProfile,
    input.sourceFile,
  );
  return Object.freeze({
    ok: true,
    diagnostics: evidence.diagnostics,
    evidence,
  });
}
