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
import { createReportDiagnostic, summarizeDiagnostics } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "report-status.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "index.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const COUNTS = Object.freeze([-1, 0, 1]);

function expectedStatus({ warnings, errors, critical }) {
  if (critical > 0) return "critical";
  if (errors > 0) return "error";
  if (warnings > 0) return "warning";
  return "ok";
}

function interpreterRecord(input) {
  return {
    __tag: "record",
    fields: new Map([
      ["warnings", { __tag: "int", value: input.warnings }],
      ["errors", { __tag: "int", value: input.errors }],
      ["critical", { __tag: "int", value: input.critical }],
    ]),
  };
}

function publicStatus(input) {
  const diagnostics = [];
  for (const [severity, count] of [
    ["warning", input.warnings],
    ["error", input.errors],
    ["critical", input.critical],
  ]) {
    for (let index = 0; index < count; index += 1) {
      diagnostics.push(createReportDiagnostic(`Galerina_TEST_${severity}_${index}`, severity, severity));
    }
  }
  return summarizeDiagnostics(diagnostics).status;
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned report status Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "report-status.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact report status Fungi asset must parse and type-check without errors",
  );
  for (const name of ["selectReportStatus", "selectReportStatusCounts"]) {
    assert.ok(program.flows.some((flow) => flow.name === name), `missing Fungi flow ${name}`);
  }
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(gir, undefined, "report-status", program.ast, true),
  );
  const assembled = await assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
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
  assert.equal(typeof instance.exports.selectReportStatusCounts, "function");
  return { host, instance, program, source };
}

async function interpret(compiled, input) {
  const interpreted = await executeFlow(
    "selectReportStatus",
    new Map([["input", interpreterRecord(input)]]),
    compiled.program.ast,
    compiled.program.flows,
  );
  return interpreted.value;
}

function executeWasm(compiled, input) {
  const handle = compiled.instance.exports.selectReportStatusCounts(
    input.warnings,
    input.errors,
    input.critical,
  );
  return compiled.host.readString(handle);
}

describe("reports package-owned Fungi status priority", () => {
  it("binds the exact private source decision and package-owned asset", async () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.deepEqual(
      packageJson.packageGraph?.loadedAssets,
      ["src/self-hosted/report-status.fungi"],
    );
    const compiled = await compileCandidate();
    const executableFungi = compiled.source.replace(/^\s*\/\/\/.*$/gmu, "");
    assert.doesNotMatch(
      executableFungi,
      /\b(?:null|NaN|else|throw|try|catch|for|while|loop)\b/u,
    );
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /function selectReportStatus\(input: \{[\s\S]*?readonly warnings: number;[\s\S]*?readonly errors: number;[\s\S]*?readonly critical: number;[\s\S]*?\}\): ReportStatus \{[\s\S]*?if \(input\.critical > 0\)[\s\S]*?return "critical";[\s\S]*?if \(input\.errors > 0\)[\s\S]*?return "error";[\s\S]*?if \(input\.warnings > 0\)[\s\S]*?return "warning";[\s\S]*?return "ok";/u,
    );
  });

  it("preserves the complete bounded priority cube", async () => {
    const compiled = await compileCandidate();
    for (const warnings of COUNTS) {
      for (const errors of COUNTS) {
        for (const critical of COUNTS) {
          const input = Object.freeze({ warnings, errors, critical });
          const wanted = expectedStatus(input);
          if (warnings >= 0 && errors >= 0 && critical >= 0) {
            assert.equal(publicStatus(input), wanted, `TypeScript ${JSON.stringify(input)}`);
          }
          assert.deepEqual(
            await interpret(compiled, input),
            { __tag: "string", value: wanted },
            `Fungi ${JSON.stringify(input)}`,
          );
          assert.equal(executeWasm(compiled, input), wanted, `Wasm ${JSON.stringify(input)}`);
        }
      }
    }
  });
});
