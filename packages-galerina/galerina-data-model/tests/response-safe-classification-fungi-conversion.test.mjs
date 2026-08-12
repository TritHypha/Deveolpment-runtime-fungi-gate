import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { assertScalarClassifierAsset, proveScalarClassifier } from "../../../scripts/lib/scalar-classifier-fungi-proof.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET = "src/self-hosted/response-safe-classification.fungi";
const CASES = Object.freeze([
  { value: "public", expected: true },
  ...["internal", "pii", "secret", "", "Public", " public", "public\u0000"].map((value) => ({ value, expected: false })),
]);

describe("data-model package-owned response-safe classification decision", () => {
  it("requires the exact governed Fungi asset and live source union", () => {
    assertScalarClassifierAsset({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      referenceRelative: "src/index.ts",
      assertReference(reference) {
        assert.match(reference, /export type ModelFieldClassification = "public" \| "internal" \| "pii" \| "secret";/u);
        assert.match(reference, /export function isResponseSafeClassification\(\s*classification: ModelFieldClassification,\s*\): boolean \{\s*return classification === "public";\s*\}/u);
      },
    });
  });

  it("matches every classification and hostile surplus text", async () => {
    await proveScalarClassifier({ packageRoot: PACKAGE_ROOT, assetRelative: ASSET, flowName: "isResponseSafeClassification", parameterName: "classification", cases: CASES });
  });
});
