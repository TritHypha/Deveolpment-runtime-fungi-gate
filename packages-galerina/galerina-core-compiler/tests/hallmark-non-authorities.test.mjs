import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..", "..");

test("build-generated Hallmark non-authority list matches its canonical registry", async () => {
  const registry = JSON.parse(await readFile(
    resolve(PACKAGE_ROOT, "governance", "hallmark-non-authorities.json"),
    "utf8",
  ));
  const distRegistry = JSON.parse(await readFile(
    resolve(PACKAGE_ROOT, "dist", "hallmark-non-authorities.json"),
    "utf8",
  ));
  const documentation = await readFile(
    resolve(REPOSITORY_ROOT, "docs", "generated", "HALLMARK-NON-AUTHORITIES.md"),
    "utf8",
  );

  assert.deepEqual(distRegistry, registry);
  assert.ok(registry.entries.some(
    (entry) => entry.id === "verified-native.checked-read-loop.v1",
  ));
  for (const entry of registry.entries) {
    assert.match(documentation, new RegExp(entry.id.replaceAll(".", "\\.")));
  }
});
