import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { parseProgram } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const CONTRACT_PATH = join(
  PACKAGE_ROOT,
  "src",
  "self-hosted",
  "slide-checked-decision-frontend.fungi",
);

describe("checked decision frontend .fungi contract", () => {
  it("defines a closed K3-preserving non-authorizing receipt model", () => {
    const source = readFileSync(CONTRACT_PATH, "utf8");
    const parsed = parseProgram(source, "slide-checked-decision-frontend.fungi", {
      requireVersionHeader: true,
    });
    assert.deepEqual(
      parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
      [],
    );
    for (const surface of [
      "record SLIDECheckedDecisionParameter",
      "record SLIDECheckedDecisionMapEntry",
      "record SLIDECheckedDecisionFrontendReceipt",
      "record SLIDECheckedDecisionFrontendResult",
      "pure flow validateSLIDECheckedDecisionFrontendReceipt(",
    ]) {
      assert.ok(source.includes(surface), `missing ${surface}`);
    }
    assert.match(source, /check\(verdict\)/u);
    assert.doesNotMatch(
      source,
      /\bif\s+(?:verdict|[A-Za-z][A-Za-z0-9_]*\.verdict)\b/u,
    );
    assert.doesNotMatch(source, /authorityReleased:\s*true/u);
  });

  it("registers the contract as a compiler package asset", () => {
    const descriptor = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"),
    );
    assert.ok(
      descriptor.packageGraph.loadedAssets.includes(
        "src/self-hosted/slide-checked-decision-frontend.fungi",
      ),
    );
  });
});
