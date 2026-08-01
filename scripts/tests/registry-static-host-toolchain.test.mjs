import assert from "node:assert/strict";
import { test } from "node:test";

import {
  assessRegistryStaticHostToolchain,
  probeRegistryStaticHostToolchain,
} from "../verify-registry-static-host-toolchain.mjs";

const COMPLETE = Object.freeze({
  platform: "win32",
  visualStudioVersion: "17.14.37411.7",
  visualStudioPath: "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community",
  clangVersion: "clang version 19.1.5",
  clangPath: "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Tools\\Llvm\\x64\\bin\\clang.exe",
  clangToolsetPresent: true,
  nasmVersion: "NASM version 3.02 compiled on Jul 10 2026",
  nasmPath: "C:\\Tools\\nasm\\nasm.exe",
});

test("complete closed Windows toolchain is only a build candidate", () => {
  assert.deepEqual(assessRegistryStaticHostToolchain(COMPLETE), {
    schema: "galerina.registry.static-host-toolchain.v1",
    verdict: "CANDIDATE",
    platform: "win32",
    visualStudioVersion: COMPLETE.visualStudioVersion,
    clangVersion: COMPLETE.clangVersion,
    nasmVersion: COMPLETE.nasmVersion,
    productionAuthorizing: false,
  });
});

test("missing, malformed, or surplus tool evidence refuses", () => {
  for (const observation of [
    { ...COMPLETE, clangToolsetPresent: false },
    { ...COMPLETE, clangVersion: "" },
    { ...COMPLETE, nasmPath: "relative\\nasm.exe" },
    { ...COMPLETE, extra: true },
  ]) {
    assert.equal(
      assessRegistryStaticHostToolchain(observation).verdict,
      "REFUSED",
    );
  }
});

test("accessor and hostile Proxy evidence refuse without executing authority logic", () => {
  let getterCalls = 0;
  const accessor = { ...COMPLETE };
  Object.defineProperty(accessor, "clangVersion", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return COMPLETE.clangVersion;
    },
  });
  assert.equal(
    assessRegistryStaticHostToolchain(accessor).verdict,
    "REFUSED",
  );
  assert.equal(getterCalls, 0);

  const hostile = new Proxy({}, {
    getPrototypeOf() {
      throw new Error("hostile prototype trap");
    },
  });
  assert.doesNotThrow(() => assessRegistryStaticHostToolchain(hostile));
  assert.equal(
    assessRegistryStaticHostToolchain(hostile).verdict,
    "REFUSED",
  );
});

test("live probe is total and non-authorizing", () => {
  const result = probeRegistryStaticHostToolchain();
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.productionAuthorizing, false);
  assert.match(result.verdict, /^(?:CANDIDATE|REFUSED)$/);
  if (result.verdict === "REFUSED") {
    assert.match(result.reason, /^STATIC_HOST_[A-Z0-9_]+$/);
  }
});
