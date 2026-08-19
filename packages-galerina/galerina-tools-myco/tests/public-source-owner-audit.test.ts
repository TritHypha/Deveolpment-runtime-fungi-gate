import test from "node:test";
import assert from "node:assert/strict";

import { compareSnapshot } from "../scripts/audit-public-source-owner.mjs";

const expected = {
  upstreamFileCount: 2,
  exactFileCount: 1,
  divergentPaths: ["src/b.ts"],
  missingPaths: [],
  localOnlyPaths: ["src/local.ts"],
};

test("public-source owner audit accepts the exact declared partial fork", () => {
  const result = compareSnapshot({
    upstreamPaths: ["src/a.ts", "src/b.ts"],
    exactPaths: ["src/a.ts"],
    divergentPaths: ["src/b.ts"],
    missingPaths: [],
    localOnlyPaths: ["src/local.ts"],
  }, expected);
  assert.deepEqual(result.findings, []);
});

test("public-source owner audit turns red when divergence grows", () => {
  const result = compareSnapshot({
    upstreamPaths: ["src/a.ts", "src/b.ts"],
    exactPaths: [],
    divergentPaths: ["src/a.ts", "src/b.ts"],
    missingPaths: [],
    localOnlyPaths: ["src/local.ts"],
  }, expected);
  assert.ok(result.findings.some((finding) => finding.field === "exactFileCount"));
  assert.ok(result.findings.some((finding) => finding.field === "divergentPaths"));
});
