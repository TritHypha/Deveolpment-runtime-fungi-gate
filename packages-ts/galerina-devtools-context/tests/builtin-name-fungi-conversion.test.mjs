import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { assertScalarClassifierAsset, proveScalarClassifier } from "../../../scripts/lib/scalar-classifier-fungi-proof.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET = "../../packages/fungi/products/galerina/rd0873-devtools-context/builtin-name.fungi";
const ACCEPTED = Object.freeze(["AuditLog", "Secrets", "Crypto", "Database", "Http", "File", "Auth", "Session", "validate", "redact", "emit", "return", "Ok", "Err", "Some", "None", "true", "false"]);
const CASES = Object.freeze([
  ...ACCEPTED.map((value) => ({ value, expected: true })),
  ...["", "auditlog", "Validate", " return", "false\u0000", "constructor"].map((value) => ({ value, expected: false })),
]);

describe("devtools-context package-owned builtin name decision", () => {
  it("requires the exact governed Fungi asset and live source table", () => {
    assertScalarClassifierAsset({
      packageRoot: PACKAGE_ROOT,
      assetRelative: ASSET,
      referenceRelative: "src/receipt-generator.ts",
      assertReference(reference) {
        for (const value of ACCEPTED) assert.match(reference, new RegExp(`"${value}"`, "u"));
        assert.match(
          reference,
          /function isBuiltin\(name: string\): boolean \{\s*return \([\s\S]*name === "AuditLog"[\s\S]*name === "false"[\s\S]*\);\s*\}/u,
        );
        assert.doesNotMatch(reference, /function isBuiltin[\s\S]*?BUILTINS\.has/u);
      },
    });
  });

  it("matches every builtin and hostile surplus text", async () => {
    await proveScalarClassifier({ packageRoot: PACKAGE_ROOT, assetRelative: ASSET, flowName: "isBuiltin", parameterName: "name", cases: CASES });
  });
});
