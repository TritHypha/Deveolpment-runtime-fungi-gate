import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = dirname(fileURLToPath(import.meta.url));
const PACKAGE = dirname(TESTS);

function siblingDistImports() {
  const packages = new Set();
  for (const file of readdirSync(TESTS).sort()) {
    if (!file.endsWith(".test.mjs")) continue;
    const source = readFileSync(join(TESTS, file), "utf8");
    for (const match of source.matchAll(
      /(?:\.\.\/){2}(galerina-[a-z0-9-]+)\/dist\/index\.js/gu,
    )) {
      packages.add(match[1]);
    }
  }
  return [...packages].sort();
}

function declaredPrerequisites() {
  const manifest = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));
  const firstCommand = manifest.scripts.test.split("&&", 1)[0].trim();
  const parts = firstCommand.split(/\s+/u);
  assert.deepEqual(
    parts.slice(0, 2),
    ["node", "../../scripts/build-core-chain.mjs"],
    "Tower tests must build their sibling dist prerequisites through the governed chain tool",
  );
  return parts.slice(2).sort();
}

test("Tower declares every sibling dist import as a test build prerequisite", () => {
  assert.deepEqual(declaredPrerequisites(), siblingDistImports());
});
