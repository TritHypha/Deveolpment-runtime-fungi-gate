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
} from "../dist/index.js";
import { parseRetryPolicy } from "../dist/runtime/retryPolicy.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "retry-strategy.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "runtime", "retryPolicy.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VECTORS = Object.freeze([
  Object.freeze(["none", true]),
  Object.freeze(["linear", true]),
  Object.freeze(["exponential_backoff", true]),
  Object.freeze(["", false]),
  Object.freeze(["None", false]),
  Object.freeze(["exponential-backoff", false]),
  Object.freeze([" linear", false]),
  Object.freeze(["none ", false]),
  Object.freeze(["linear\u0000", false]),
  Object.freeze(["unknown", false]),
]);

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned retry strategy Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "retry-strategy.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact retry strategy Fungi asset must parse and type-check without errors",
  );
  const effects = checkEffects(program.flows, program.ast);
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(gir, undefined, "retry-strategy", program.ast, true),
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
  assert.equal(typeof instance.exports.isValidRetryStrategy, "function");
  return { host, instance, program };
}

async function interpret(compiled, strategy) {
  const interpreted = await executeFlow(
    "isValidRetryStrategy",
    new Map([["strategy", { __tag: "string", value: strategy }]]),
    compiled.program.ast,
    compiled.program.flows,
  );
  return interpreted.value;
}

function executeWasm(compiled, strategy) {
  return Boolean(
    compiled.instance.exports.isValidRetryStrategy(compiled.host.internString(strategy)),
  );
}

function contractOf(strategy) {
  const source = `secure flow f(readonly request: Request) -> Result<Response, ApiError>
contract { intent { "x" } effects { database.read }
  retries { database.read attempts 3 strategy ${strategy} } }
{ return Ok(Response.ok({})) }`;
  const { ast } = parseProgram(source, "retry-strategy-public-caller.fungi");
  let found;
  (function walk(node) {
    if (node === undefined || found !== undefined) return;
    if (node.kind === "contractDecl") {
      found = node;
      return;
    }
    for (const child of node.children ?? []) walk(child);
  })(ast);
  return found;
}

describe("compiler package-owned Fungi retry strategy decision", () => {
  it("tracks the private TypeScript predicate as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(packageJson.packageGraph.loadedAssets.includes("src/self-hosted/retry-strategy.fungi"));
    assert.ok(existsSync(SOURCE));
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /function isValidStrategy\(s: string\): s is RetryConfig\["strategy"\] \{\s*return s === "none" \|\| s === "linear" \|\| s === "exponential_backoff";\s*\}/u,
    );
  });

  it("matches canonical and hostile Strings through interpreter and signed Wasm", async () => {
    const compiled = await compileCandidate();
    for (const [strategy, wanted] of VECTORS) {
      assert.deepEqual(
        await interpret(compiled, strategy),
        { __tag: "bool", value: wanted },
        `Fungi ${JSON.stringify(strategy)}`,
      );
      assert.equal(executeWasm(compiled, strategy), wanted, `Wasm ${JSON.stringify(strategy)}`);
    }
  });

  it("keeps the public retry-policy parser on the same three exact strategies", () => {
    for (const strategy of ["none", "linear", "exponential_backoff"]) {
      assert.equal(parseRetryPolicy(contractOf(strategy)).policies.get("database.read")?.strategy, strategy);
    }
    assert.equal(
      parseRetryPolicy(contractOf("unknown")).policies.get("database.read")?.strategy,
      "linear",
    );
  });
});
