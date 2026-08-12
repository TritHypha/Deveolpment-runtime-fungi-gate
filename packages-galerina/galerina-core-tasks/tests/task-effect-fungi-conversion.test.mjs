import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { assertScalarClassifierAsset, proveScalarClassifier } from "../../../scripts/lib/scalar-classifier-fungi-proof.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET = "src/self-hosted/task-effect.fungi";
const ACCEPTED = Object.freeze(["filesystem", "network", "database", "environment", "shell", "compiler", "reports", "crypto"]);
const CASES = Object.freeze([
  ...ACCEPTED.map((value) => ({ value, expected: true })),
  ...["", "Filesystem", " network", "process", "crypto\u0000"].map((value) => ({ value, expected: false })),
]);

describe("core-tasks package-owned task effect decision", () => {
  it("requires the exact governed Fungi asset and live source table", () => {
    assertScalarClassifierAsset({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      referenceRelative: "src/load-tasks.ts",
      assertReference(reference) {
        for (const value of ACCEPTED) assert.match(reference, new RegExp(`"${value}"`, "u"));
        assert.match(reference, /function isTaskEffect\(value: string\): value is TaskDefinition\["effects"\]\[number\] \{[\s\S]*?\]\.includes\(value\);\s*\}/u);
      },
    });
  });

  it("matches every task effect and hostile surplus text", async () => {
    await proveScalarClassifier({ packageRoot: PACKAGE_ROOT, assetRelative: ASSET, flowName: "isTaskEffect", parameterName: "value", cases: CASES });
  });
});
