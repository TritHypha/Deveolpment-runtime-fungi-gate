import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildFlatPackageRootLock,
  parseStrictJsonObject,
  resolveFlatPackagePeer,
  verifyFlatPackageRootLock,
} from "../lib/flat-package-root-lock.mjs";

const sha = (digit) => digit.repeat(64);

function packageRecord(identity, directory, dependencies = [], contentDigest = sha("1")) {
  return {
    identity,
    version: "1.0.0",
    directory,
    contentDigest,
    manifestDigests: [{ path: "package.json", digest: sha("2") }],
    dependencies,
  };
}

test("builds one deterministic flat lock and resolves only an exact peer edge", () => {
  const records = [
    packageRecord("@galerina/app", "app", [
      { identity: "@galerina/core", scope: "runtime", specifier: "file:../core" },
      { identity: "typescript", scope: "development", specifier: "^5.5.0" },
    ], sha("3")),
    packageRecord("@galerina/core", "core"),
  ];

  const first = buildFlatPackageRootLock(records);
  const second = buildFlatPackageRootLock([...records].reverse());
  assert.deepEqual(first, second);
  assert.deepEqual(first.topologicalOrder, ["@galerina/core", "@galerina/app"]);
  assert.equal(first.authorityReleased, false);
  assert.equal(first.externalBootstrapDependencies.length, 1);

  const verified = verifyFlatPackageRootLock(first);
  assert.equal(
    resolveFlatPackagePeer(verified, "@galerina/app", "@galerina/core").directory,
    "core",
  );
  assert.throws(
    () => resolveFlatPackagePeer(verified, "@galerina/core", "@galerina/app"),
    /undeclared peer dependency/,
  );
  assert.throws(
    () => resolveFlatPackagePeer(structuredClone(verified), "@galerina/app", "@galerina/core"),
    /verified flat package lock handle/,
  );
});

test("content identity is part of the root identity", () => {
  const before = buildFlatPackageRootLock([packageRecord("@galerina/core", "core")]);
  const after = buildFlatPackageRootLock([
    packageRecord("@galerina/core", "core", [], sha("4")),
  ]);
  assert.notEqual(before.rootDigest, after.rootDigest);
});

test("refuses duplicate, missing, escaping, shadowed and cyclic internal graphs", () => {
  const core = packageRecord("@galerina/core", "core");
  assert.throws(() => buildFlatPackageRootLock([core, core]), /duplicate package identity/);

  assert.throws(
    () => buildFlatPackageRootLock([
      packageRecord("@galerina/app", "app", [
        { identity: "@galerina/missing", scope: "runtime", specifier: "file:../missing" },
      ]),
    ]),
    /missing internal package/,
  );

  assert.throws(
    () => buildFlatPackageRootLock([
      core,
      packageRecord("@galerina/app", "app", [
        { identity: "@galerina/core", scope: "runtime", specifier: "file:../../core" },
      ]),
    ]),
    /canonical direct peer/,
  );

  assert.throws(
    () => buildFlatPackageRootLock([
      packageRecord("@galerina/a", "same"),
      packageRecord("@galerina/b", "same"),
    ]),
    /duplicate package directory/,
  );

  assert.throws(
    () => buildFlatPackageRootLock([
      packageRecord("@galerina/a", "a", [
        { identity: "@galerina/b", scope: "runtime", specifier: "file:../b" },
      ]),
      packageRecord("@galerina/b", "b", [
        { identity: "@galerina/a", scope: "runtime", specifier: "file:../a" },
      ]),
    ]),
    /dependency cycle/,
  );

  assert.throws(
    () => buildFlatPackageRootLock([
      core,
      packageRecord("@galerina/app", "app", [
        { identity: "@galerina/core", scope: "runtime", specifier: "file:../core" },
        { identity: "@galerina/core", scope: "peer", specifier: "file:../core" },
      ]),
    ]),
    /repeats dependency/,
  );
});

test("refuses conflicting runtime bootstrap versions but records development drift", () => {
  assert.throws(
    () => buildFlatPackageRootLock([
      packageRecord("@galerina/a", "a", [
        { identity: "external", scope: "runtime", specifier: "1" },
      ]),
      packageRecord("@galerina/b", "b", [
        { identity: "external", scope: "runtime", specifier: "2" },
      ]),
    ]),
    /conflicting external runtime dependency/,
  );

  const lock = buildFlatPackageRootLock([
    packageRecord("@galerina/a", "a", [
      { identity: "typescript", scope: "development", specifier: "5.5" },
    ]),
    packageRecord("@galerina/b", "b", [
      { identity: "typescript", scope: "development", specifier: "5.9" },
    ]),
  ]);
  assert.deepEqual(lock.developmentVersionDrift, [
    { identity: "typescript", specifiers: ["5.5", "5.9"] },
  ]);
});

test("verification refuses a copied or recomputed-root forged lock", () => {
  const lock = buildFlatPackageRootLock([packageRecord("@galerina/core", "core")]);
  assert.throws(
    () => verifyFlatPackageRootLock({ ...lock, authorityReleased: true }),
    /authority or schema/,
  );
  const verified = verifyFlatPackageRootLock(lock);
  assert.throws(
    () => resolveFlatPackagePeer({ ...verified }, "@galerina/core", "@galerina/core"),
    /verified flat package lock handle/,
  );
});

test("strict JSON intake refuses decoded duplicate keys and a BOM", () => {
  assert.throws(
    () => parseStrictJsonObject('{"name":"first","na\\u006de":"second"}', "manifest"),
    /repeats decoded key/,
  );
  assert.throws(() => parseStrictJsonObject('\uFEFF{"name":"x"}', "manifest"), /canonical UTF-8/);
  assert.deepEqual(parseStrictJsonObject('{"name":"x"}', "manifest"), { name: "x" });
});
