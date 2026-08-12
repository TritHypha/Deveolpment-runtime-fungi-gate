import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  assertScalarClassifierAsset,
  proveScalarClassifier,
} from "../../../scripts/lib/scalar-classifier-fungi-proof.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET = "src/self-hosted/omni-uncertain.fungi";
const CASES = Object.freeze([
  { value: "unknown", expected: true },
  { value: "partial_true", expected: true },
  { value: "partial_false", expected: true },
  { value: "conflicted", expected: true },
  { value: "deferred", expected: true },
  { value: "inconsistent", expected: true },
  { value: "true", expected: false },
  { value: "false", expected: false },
  { value: "", expected: false },
  { value: "Unknown", expected: false },
  { value: "partial-true", expected: false },
  { value: "partial_True", expected: false },
  { value: " unknown", expected: false },
  { value: "unknown ", expected: false },
  { value: "unknown\n", expected: false },
  { value: "unknown\uFEFF", expected: false },
  { value: "unknown\u0000", expected: false },
]);

describe("core-logic package-owned Fungi Omni uncertainty decision", () => {
  it("requires the exact governed Fungi asset and live source state set", () => {
    assertScalarClassifierAsset({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      referenceRelative: "src/omni/omni-state.ts",
      assertReference(reference) {
        assert.match(
          reference,
          /export const OMNI_UNCERTAIN_STATES:[\s\S]*"unknown",[\s\S]*"partial_true",[\s\S]*"partial_false",[\s\S]*"conflicted",[\s\S]*"deferred",[\s\S]*"inconsistent",/u,
        );
        assert.match(
          reference,
          /export function isOmniUncertain\(state: OmniState\): boolean \{\s*return OMNI_UNCERTAIN_STATES\.has\(state\);\s*\}/u,
        );
      },
    });
  });

  it("matches every Omni state and denies hostile surplus text", async () => {
    await proveScalarClassifier({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      flowName: "isOmniUncertain",
      parameterName: "state",
      cases: CASES,
    });
  });
});
