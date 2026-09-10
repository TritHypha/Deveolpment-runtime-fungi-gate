import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routeFiles = Object.freeze([
  "src/artifact-reference.ts",
  "src/checked-module-snapshot.ts",
  "src/seal-checked-module-snapshot.ts",
  "src/checked-snapshot-gir-emitter.ts",
  "src/detached-scalar-cli.ts",
]);
const retainedRoots = Object.freeze([
  resolve(packageRoot, "..", "galerina-tower-citizen"),
  resolve(packageRoot, "..", "galerina-tri-pipe"),
]);

describe("detached scalar retained component boundaries", () => {
  it("keeps Tower and Tri-Pipe present but out of the detached runtime closure", () => {
    for (const root of retainedRoots) assert.equal(existsSync(root), true, root);
    for (const relative of routeFiles) {
      const source = readFileSync(join(packageRoot, relative), "utf8");
      assert.doesNotMatch(source, /(?:from|import\s*\()[^\n]*(?:tower|tri[-_ ]?pipe|tri[-_ ]?fuse|hypha)/iu, relative);
      assert.doesNotMatch(source, /(?:require|import\s*\()[^\n]*(?:galerina-tower|galerina-tri|hypha)/iu, relative);
      assert.doesNotMatch(source, /\b(?:executeFlow|emitWAT|runWasmStandaloneBuild)\s*\(/u, relative);
    }
  });

  it("does not admit a WAT/Wasm or component authority substitution", () => {
    const routeSource = routeFiles.map((relative) => readFileSync(join(packageRoot, relative), "utf8")).join("\n");
    assert.doesNotMatch(routeSource, /(?:wasm|wat)\s*(?:runtime|module|assembler|binary)/iu);
    assert.doesNotMatch(routeSource, /\b(?:ALLOW|VOK_LEASE_READY|SUCCEEDED)\b/u);
    assert.match(readFileSync(join(packageRoot, "src/artifact-reference.ts"), "utf8"), /tower/iu);
  });
});
