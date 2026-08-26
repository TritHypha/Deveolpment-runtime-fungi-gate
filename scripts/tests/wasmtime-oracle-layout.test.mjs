// The Wasmtime engine comparator is a flat development package, never a
// production sidecar hidden under subprojects/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ORACLE = resolve(
  "packages-ts",
  "galerina-devtools-wasmtime-oracle",
);
const LEGACY = resolve("subprojects", "dss-host");

test("Wasmtime oracle has one canonical flat package location", () => {
  assert.equal(
    existsSync(resolve(LEGACY, "Cargo.toml")),
    false,
    "legacy dss-host package identity must be retired",
  );
  assert.equal(
    existsSync(resolve(LEGACY, "src", "main.rs")),
    false,
    "legacy dss-host source surface must be retired",
  );
  assert.equal(existsSync(resolve(ORACLE, "package.json")), true);
  assert.equal(existsSync(resolve(ORACLE, "Cargo.toml")), true);

  const host = JSON.parse(readFileSync(resolve(ORACLE, "package.json"), "utf8"));
  assert.equal(host.name, "@galerina/devtools-wasmtime-oracle");
  assert.equal(host.private, true);

  const cargo = readFileSync(resolve(ORACLE, "Cargo.toml"), "utf8");
  assert.match(cargo, /^name\s*=\s*"galerina-wasmtime-oracle"/m);
  assert.match(cargo, /^wasmtime\s*=\s*"47\.0\.2"/m);
});
