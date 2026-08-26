import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  assembleWAT,
  admitAndInstantiate,
  buildWATModuleFromGIR,
  checkEffects,
  createHostRuntime,
  emitGIR,
  executeFlow,
  generateRunnerKeypair,
  getInternedStrings,
  parseProgram,
  renderWAT,
  signWasm,
} from "../../galerina-core-compiler/dist/index.js";
import { requiresLowBitKernel as requiresLowBitKernelTs } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "low-bit-kernel-routing.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const INPUT_TYPES = Object.freeze(["f32", "f16", "bf16", "i8", "i2_s", "ternary"]);
const OPERATIONS = Object.freeze([
  "gemm",
  "gemv",
  "dot",
  "matmul",
  "ternary_matmul",
  "embedding_lookup",
  "low_bit_decode",
]);
const HOSTILE = Object.freeze([
  Object.freeze(["", ""]),
  Object.freeze(["I2_S", "gemm"]),
  Object.freeze([" i2_s", "gemm"]),
  Object.freeze(["i2_s\u0000", "gemm"]),
  Object.freeze(["f32", "LOW_BIT_DECODE"]),
  Object.freeze(["f32", "low_bit_decode "]),
  Object.freeze(["e\u0301", "\u00e9"]),
  Object.freeze(["__proto__", "constructor"]),
]);

function expectedLowBit(inputType, operation) {
  return inputType === "i2_s"
    || inputType === "ternary"
    || operation === "ternary_matmul"
    || operation === "low_bit_decode";
}

function plan(inputType, operation) {
  return Object.freeze({
    name: "slice-29-low-bit-routing",
    operation,
    inputType,
    outputType: "f32",
    requiredFeatures: Object.freeze([]),
    threads: 1,
  });
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned low-bit routing Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "low-bit-kernel-routing.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact low-bit routing Fungi asset must parse and type-check without errors",
  );
  assert.ok(
    program.flows.some((flow) => flow.name === "requiresLowBitKernel"),
    "missing Fungi flow requiresLowBitKernel",
  );
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(gir, undefined, "cpu-low-bit-kernel-routing", program.ast, true),
  );
  const assembled = await assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  assert.match(wat, /call \$host___str_eq/u, "String equality must lower by value");
  const host = createHostRuntime();
  for (const entry of getInternedStrings()) host.seedString(entry.handle, entry.value);
  const keypair = generateRunnerKeypair();
  const attestation = signWasm(assembled.wasm, keypair.privateKeyPem, "dev");
  const { instance } = await admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keypair.publicKeyPem },
    host,
  });
  assert.equal(typeof instance.exports.requiresLowBitKernel, "function");
  return { host, instance, program, source };
}

async function interpret(compiled, inputType, operation) {
  const interpreted = await executeFlow(
    "requiresLowBitKernel",
    new Map([
      ["inputType", { __tag: "string", value: inputType }],
      ["operation", { __tag: "string", value: operation }],
    ]),
    compiled.program.ast,
    compiled.program.flows,
  );
  return interpreted.value;
}

function executeWasm(compiled, inputType, operation) {
  return compiled.instance.exports.requiresLowBitKernel(
    compiled.host.internString(inputType),
    compiled.host.internString(operation),
  ) === 1;
}

describe("CPU-kernel package-owned Fungi low-bit routing", () => {
  it("binds the exact package-owned asset and forbidden-form boundary", async () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.deepEqual(
      packageJson.packageGraph.loadedAssets,
      ["src/self-hosted/low-bit-kernel-routing.fungi"],
    );
    const compiled = await compileCandidate();
    const executableFungi = compiled.source.replace(/^\s*\/\/\/.*$/gmu, "");
    assert.doesNotMatch(
      executableFungi,
      /\b(?:null|NaN|else|throw|try|catch|for|while|loop)\b/u,
      "the bounded Fungi asset must not contain forbidden control or value forms",
    );
  });

  it("preserves all 42 declared pairs and denies hostile labels", async () => {
    const compiled = await compileCandidate();
    for (const inputType of INPUT_TYPES) {
      for (const operation of OPERATIONS) {
        const wanted = expectedLowBit(inputType, operation);
        assert.equal(
          requiresLowBitKernelTs(plan(inputType, operation)),
          wanted,
          `TypeScript ${inputType} x ${operation}`,
        );
        assert.deepEqual(
          await interpret(compiled, inputType, operation),
          { __tag: "bool", value: wanted },
          `Fungi ${inputType} x ${operation}`,
        );
        assert.equal(
          executeWasm(compiled, inputType, operation),
          wanted,
          `Wasm ${inputType} x ${operation}`,
        );
      }
    }

    for (const [inputType, operation] of HOSTILE) {
      assert.equal(requiresLowBitKernelTs(plan(inputType, operation)), false);
      assert.deepEqual(
        await interpret(compiled, inputType, operation),
        { __tag: "bool", value: false },
      );
      assert.equal(executeWasm(compiled, inputType, operation), false);
    }
  });
});
