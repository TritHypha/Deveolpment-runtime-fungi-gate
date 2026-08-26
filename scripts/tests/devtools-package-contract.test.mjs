import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(TEST_DIR, "..", "..");
const PACKAGES = join(ROOT, "packages-ts");

function walkHasTypeScript(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && walkHasTypeScript(path)) return true;
    if (entry.isFile() && entry.name.endsWith(".ts")
        && !entry.name.endsWith(".d.ts")) return true;
  }
  return false;
}

function governedPackages() {
  return readdirSync(PACKAGES)
    .filter((name) =>
      name.startsWith("galerina-devtools-") || name === "galerina-test")
    .map((name) => ({ name, directory: join(PACKAGES, name) }))
    .filter(({ directory }) =>
      statSync(directory).isDirectory()
      && existsSync(join(directory, "package.json")))
    .sort((left, right) => left.name.localeCompare(right.name));
}

test("every TypeScript devtools package rebuilds before public-surface tests", () => {
  const violations = [];
  for (const { name, directory } of governedPackages()) {
    const source = join(directory, "src");
    if (!existsSync(source) || !walkHasTypeScript(source)) continue;
    const packageJson = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    );
    const scripts = packageJson.scripts ?? {};
    const testScript = scripts.test ?? "";
    const typecheckAt = testScript.indexOf("npm run typecheck");
    const buildAt = testScript.indexOf("npm run build");
    const nodeTestAt = testScript.indexOf("node --test");
    if (typeof scripts.typecheck !== "string"
        || typeof scripts.build !== "string"
        || typecheckAt < 0
        || buildAt < 0
        || nodeTestAt < 0
        || !(typecheckAt < buildAt && buildAt < nodeTestAt)) {
      violations.push(name);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `stale-dist test chains: ${violations.join(", ")}`,
  );
});
