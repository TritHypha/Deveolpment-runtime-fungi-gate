import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runReceiptBoundSlidePackageCli } from "../build-receipt-bound-slide-package.mjs";

const ARGS = [
  "--root", "project",
  "--manifest", "project/package-set.json",
  "--out", "project/out/build-one",
  "--slide-tool-root", "slide",
  "--slide-tool-manifest", "slide/governance/tool.json",
  "--slide-tool-digest", `sha256:${"1".repeat(64)}`,
  "--runtime-digest", `sha256:${"2".repeat(64)}`,
];

describe("build-slide-package CLI", () => {
  it("maps one exact ordered flag surface to the receipt-bound build", async () => {
    let captured;
    const result = await runReceiptBoundSlidePackageCli(ARGS, {
      build: async (request) => {
        captured = request;
        return { verdict: 1, status: "GALERINA_SLIDE_PACKAGE_VERIFIED_REFERENCE_ONLY" };
      },
    });
    assert.equal(result.verdict, 1);
    assert.deepEqual(captured, {
      rootDirectory: "project",
      sourceManifestPath: "project/package-set.json",
      outputDirectory: "project/out/build-one",
      slideToolRoot: "slide",
      slideToolManifestPath: "slide/governance/tool.json",
      expectedSlideToolManifestDigest: `sha256:${"1".repeat(64)}`,
      expectedRuntimeDigest: `sha256:${"2".repeat(64)}`,
    });
  });

  it("refuses missing, reordered, duplicate and surplus arguments without building", async () => {
    let calls = 0;
    const options = { build: async () => { calls += 1; return { verdict: 1 }; } };
    for (const args of [
      ARGS.slice(0, -2),
      [ARGS[2], ARGS[3], ARGS[0], ARGS[1], ...ARGS.slice(4)],
      [...ARGS.slice(0, -2), "--slide-tool-digest", ARGS.at(-1)],
      [...ARGS, "--extra", "value"],
    ]) {
      assert.equal((await runReceiptBoundSlidePackageCli(args, options)).verdict, -1);
    }
    assert.equal(calls, 0);
  });
});
