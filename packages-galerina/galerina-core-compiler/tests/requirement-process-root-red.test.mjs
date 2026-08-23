import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const ATTACK_MODES = Object.freeze([
  "detector-direct",
  "detector-retained",
  "descriptor-direct",
  "descriptor-retained",
]);

const sourceForRequire = (flowName) =>
  `@version 1\npure flow ${flowName}(subject: Bool) -> String\n` +
  `contract { effects {} }\n{\n` +
  `  require subject {\n` +
  `    deny: return "deny"\n` +
  `    ambig: return "ambig"\n` +
  `  }\n` +
  `  return "allow"\n}`;

function runPreBootstrapAttack(mode) {
  const parserUrl = new URL("../dist/parser.js", import.meta.url).href;
  const typeCheckerUrl = new URL("../dist/type-checker.js", import.meta.url).href;
  const interpreterUrl = new URL("../dist/interpreter.js", import.meta.url).href;
  const flowName = `processRoot_${mode.replaceAll("-", "_")}`;
  const childSource = String.raw`
    import { createRequire, syncBuiltinESMExports } from "node:module";

    const require = createRequire(import.meta.url);
    const utilTypes = require("node:util/types");
    const vm = require("node:vm");
    const mode = process.argv[5];
    const flowName = process.argv[6];
    const originalDetector = utilTypes.isProxy;
    const originalRunInNewContext = vm.runInNewContext;
    const originalDescriptor = Object.getOwnPropertyDescriptor;
    let armed = !mode.endsWith("-retained");
    let descriptorReads = 0;
    let forgedReads = 0;

    const subject = mode.startsWith("detector-")
      ? new Proxy({}, {
          getOwnPropertyDescriptor(_target, key) {
            descriptorReads += 1;
            if (key === "__tag") {
              return { configurable: true, enumerable: true, writable: true, value: "bool" };
            }
            if (key === "value") {
              return { configurable: true, enumerable: true, writable: true, value: true };
            }
            return undefined;
          },
        })
      : { __tag: "bool", value: mode === "stable-unpoisoned" ? true : 0 };

    if (mode.startsWith("detector-")) {
      utilTypes.isProxy = function (candidate) {
        if (armed && candidate === subject) return false;
        return Reflect.apply(originalDetector, utilTypes, [candidate]);
      };
      syncBuiltinESMExports();
    } else if (mode.startsWith("descriptor-")) {
      vm.runInNewContext = function (code, context, options) {
        if (code === "Object.getOwnPropertyDescriptor") {
          return (candidate, key) => {
            if (armed && candidate === subject && (key === "__tag" || key === "value")) {
              forgedReads += 1;
              return {
                configurable: true,
                enumerable: true,
                writable: true,
                value: key === "__tag" ? "bool" : true,
              };
            }
            return Reflect.apply(originalDescriptor, Object, [candidate, key]);
          };
        }
        return Reflect.apply(originalRunInNewContext, vm, [code, context, options]);
      };
      syncBuiltinESMExports();
    }

    const { parseProgram } = await import(process.argv[1]);
    const { checkTypes } = await import(process.argv[2]);
    const parsed = parseProgram(process.argv[4], mode + ".fungi");
    const parserErrors = parsed.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    const typeErrors = checkTypes(parsed.ast).diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    if (parserErrors.length > 0 || typeErrors.length > 0) {
      throw new Error("unexpected parser or type errors in process-root fixture");
    }

    const interpreter = await import(process.argv[3] + "?" + mode);
    utilTypes.isProxy = originalDetector;
    vm.runInNewContext = originalRunInNewContext;
    const detectorRestored = utilTypes.isProxy === originalDetector;
    const descriptorRestored = vm.runInNewContext === originalRunInNewContext;
    armed = true;

    try {
      const result = await interpreter.executeFlow(
        flowName,
        new Map([["subject", subject]]),
        parsed.ast,
        parsed.flows,
      );
      process.stdout.write(JSON.stringify({
        audit: result.audit.result,
        tag: result.value?.__tag,
        value: result.value?.value,
        descriptorReads,
        forgedReads,
        detectorRestored,
        descriptorRestored,
      }));
    } finally {
      syncBuiltinESMExports();
    }
  `;
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      childSource,
      parserUrl,
      typeCheckerUrl,
      interpreterUrl,
      sourceForRequire(flowName),
      mode,
      flowName,
    ],
    {
      encoding: "utf8",
      maxBuffer: 1_048_576,
      timeout: 30_000,
      windowsHide: true,
    },
  );
  assert.equal(child.error, undefined);
  assert.equal(child.signal, null);
  assert.equal(child.status, 0, child.stderr);
  assert.notEqual(child.stdout, "");
  return JSON.parse(child.stdout);
}

describe("RD-0858 Unit 4 causal in-process process-root controls", () => {
  it("keeps the unpoisoned canonical discriminator operational", () => {
    const result = runPreBootstrapAttack("stable-unpoisoned");
    assert.equal(result.audit, "ok");
    assert.equal(result.tag, "string");
    assert.equal(result.value, "allow");
    assert.equal(result.detectorRestored, true);
    assert.equal(result.descriptorRestored, true);
  });

  it("refuses the unpoisoned malformed discriminator", () => {
    const result = runPreBootstrapAttack("malformed-unpoisoned");
    assert.equal(result.audit, "error");
    assert.equal(result.tag, "runtimeError");
    assert.notEqual(result.value, "allow");
    assert.equal(result.detectorRestored, true);
    assert.equal(result.descriptorRestored, true);
  });

  for (const mode of ATTACK_MODES) {
    it(`isolates ${mode} before first interpreter evaluation`, () => {
      const result = runPreBootstrapAttack(mode);
      assert.equal(result.detectorRestored, true);
      assert.equal(result.descriptorRestored, true);
      if (mode.startsWith("detector-")) assert.equal(result.descriptorReads, 2);
      if (mode.startsWith("descriptor-")) assert.equal(result.forgedReads, 2);
      assert.notEqual(result.value, "allow");
      assert.notEqual(result.audit, "ok");
    });
  }
});
