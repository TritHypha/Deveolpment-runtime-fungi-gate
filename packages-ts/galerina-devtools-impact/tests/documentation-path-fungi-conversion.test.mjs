import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  assertScalarClassifierAsset,
  proveScalarClassifier,
} from "../../../scripts/lib/scalar-classifier-fungi-proof.mjs";
import { DOCUMENTATION_PATH_CASES } from "./documentation-path-cases.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET = "src/self-hosted/documentation-path.fungi";

describe("devtools-impact package-owned documentation path decision", () => {
  it("requires the exact governed Fungi asset and live source decision", () => {
    assertScalarClassifierAsset({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      referenceRelative: "src/impact-plan.mjs",
      assertReference(reference) {
        assert.match(
          reference,
          /const DOCUMENT_ROOTS = Object\.freeze\(\["docs\/", "README\.md", "AGENTS\.md", "SECURITY\.md"\]\);/u,
        );
        assert.match(
          reference,
          /function isDocumentation\(path\) \{\s*return DOCUMENT_ROOTS\.some\(\(prefix\) => prefix\.endsWith\("\/"\) \? path\.startsWith\(prefix\) : path === prefix\);\s*\}/u,
        );
      },
    });
  });

  it("matches the complete fixed-root and prefix vector family", async () => {
    await proveScalarClassifier({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      flowName: "isDocumentationPath",
      parameterName: "path",
      cases: DOCUMENTATION_PATH_CASES.map(({ path, expected }) => ({ value: path, expected })),
    });
  });
});
