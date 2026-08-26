import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { parseStrictJsonObject, verifyFlatPackageRootLock } from "../lib/flat-package-root-lock.mjs";
import { deriveCurrentFlatPackageRootLock } from "../flat-package-root-lock.mjs";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

test("the checked-in lock exactly accounts for every current direct package peer", () => {
  const expected = deriveCurrentFlatPackageRootLock(REPO);
  const actual = parseStrictJsonObject(
    readFileSync(join(REPO, "governance", "flat-package-root-lock.json"), "utf8"),
    "flat package root lock",
  );
  assert.deepEqual(actual, expected);
  assert.equal(actual.authorityReleased, false);
  assert.ok(actual.externalBootstrapDependencies.length > 0);
  assert.equal(actual.developmentVersionDrift.length, 2);
  verifyFlatPackageRootLock(actual);

  const directPackageDirectories = readdirSync(join(REPO, "packages-ts"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .length;
  assert.equal(actual.packages.length, directPackageDirectories);
});
