import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import * as L from "../dist/index.js";

test("fixed and generic entrypoints select only an admitted explicit product", () => {
  assert.deepEqual(L.parseProductCliSelection("galerina", []), { ok: true, productId: "galerina" });
  assert.deepEqual(L.parseProductCliSelection("fungi", ["--product=galerina"]), { ok: true, productId: "galerina" });
  assert.equal(L.parseProductCliSelection("fungi", []).code, "PRODUCT_REQUIRED");
  assert.equal(L.parseProductCliSelection("fungi", ["--product=trametes"]).code, "PRODUCT_NOT_ADMITTED");
  assert.equal(L.parseProductCliSelection("galerina", ["--product=trametes"]).code, "ENTRYPOINT_PRODUCT_MISMATCH");
  assert.equal(L.parseProductCliSelection("galerina", ["--governance=off"]).code, "GOVERNANCE_OFF_FORBIDDEN");
});

test("product parsing is closed over duplicates, aliases and governance switches", () => {
  assert.equal(L.parseProductCliSelection("fungi", ["--product=galerina", "--product", "galerina"]).code, "PRODUCT_DUPLICATE");
  assert.equal(L.parseProductCliSelection("fungi", ["--product", "gate"]).code, "PRODUCT_UNKNOWN");
  assert.equal(L.parseProductCliSelection("unknown", ["--product=galerina"]).code, "ENTRYPOINT_UNKNOWN");
  assert.equal(L.parseProductCliSelection("galerina", ["--native-root=packages/fungi"]).code, "NATIVE_ROOT_NOT_ADMITTED");
  assert.equal(L.parseProductCliSelection("galerina", ["--physical-profile=1", "--physical-profile=1"]).code, "PHYSICAL_PROFILE_DUPLICATE");
  assert.equal(L.parseProductCliSelection("galerina", ["--deterministic", "--target=wasm-hybrid"]).code, "BUILD_MODE_CONFLICT");
  for (const spelling of ["--governance", "--governance=on", "--governance-off", "--no-governance"]) {
    assert.equal(L.parseProductCliSelection("galerina", [spelling]).code, "GOVERNANCE_OFF_FORBIDDEN");
  }
});

test("full admission returns a frozen product context and strips only the validated selector", () => {
  const admitted = L.resolveProductCliSelection("fungi", ["build", "--product=galerina", "sample.fungi"]);
  assert.equal(admitted.ok, true);
  assert.deepEqual(admitted.remainingArgs, ["build", "sample.fungi"]);
  assert.equal(admitted.context.productId, "galerina");
  assert.equal(admitted.context.physicalProfile, "1");
  assert.equal(Object.isFrozen(admitted.context), true);
  assert.deepEqual(admitted.receipt, {
    schemaVersion: "fungi.product-cli-receipt.v1",
    status: "ADMITTED",
    authorizing: false,
    entrypointId: "fungi",
    externalAuthorizerId: "vok",
    context: admitted.context,
  });
  assert.equal(Object.isFrozen(admitted.receipt), true);

  const deterministic = L.resolveProductCliSelection("galerina", ["build", "--deterministic"]);
  assert.equal(deterministic.ok, true);
  assert.equal(deterministic.context.buildMode, "build-deterministic");
});

test("the product and width refusal matrix cannot produce an admitted context", () => {
  for (const args of [
    [],
    ["--product=trametes"],
    ["--product=gate"],
    ["--product=galerina", "--physical-profile=32"],
    ["--product=galerina", "--physical-profile=64"],
    ["--product=galerina", "--physical-profile=256"],
  ]) {
    const result = L.resolveProductCliSelection("fungi", args);
    assert.equal(result.ok, false, JSON.stringify(args));
    assert.equal("context" in result, false, JSON.stringify(args));
    assert.equal("receipt" in result, false, JSON.stringify(args));
  }
});

test("both executable surfaces perform product admission before discovery", () => {
  const compilerCli = readFileSync(resolve("packages-ts/galerina-core-compiler/src/cli.ts"), "utf8");
  const rootCli = readFileSync(resolve("galerina.mjs"), "utf8");
  const compilerMain = compilerCli.slice(compilerCli.indexOf("function main(): void"));
  const rootMain = rootCli.slice(rootCli.indexOf("async function main()"));
  assert.match(compilerMain, /resolveProductCliSelection\("galerina"/);
  assert.ok(compilerMain.indexOf("resolveProductCliSelection(\"galerina\"") < compilerMain.indexOf("findFungiFiles(targetDir)"));
  assert.match(rootMain, /resolveProductCliSelection\(entrypointId/);
  assert.ok(rootMain.indexOf("resolveProductCliSelection(entrypointId") < rootMain.indexOf("readUntrustedSource(fungiFile)"));

  const rootPackage = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  assert.equal(rootPackage.bin.galerina, "./galerina.mjs");
  assert.equal(rootPackage.bin.fungi, "./fungi.mjs");
});

test("physical launchers preserve fixed versus generic product admission", () => {
  const run = (script, args) => spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });
  const omitted = run("fungi.mjs", ["help"]);
  assert.equal(omitted.status, 2);
  assert.match(omitted.stderr, /PRODUCT_REQUIRED/);

  const admitted = run("fungi.mjs", ["help", "--product=galerina"]);
  assert.equal(admitted.status, 0, admitted.stderr);
  assert.match(admitted.stdout, /Galerina compiler/);

  const mismatch = run("galerina.mjs", ["help", "--product=trametes"]);
  assert.equal(mismatch.status, 2);
  assert.match(mismatch.stderr, /ENTRYPOINT_PRODUCT_MISMATCH/);
});
