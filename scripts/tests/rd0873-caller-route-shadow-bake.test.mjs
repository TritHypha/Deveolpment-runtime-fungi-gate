// RD-0873 caller-route/shadow-bake fixture.
//
// The TypeScript secret gate remains the live consumer.  This fixture exercises both
// callers that matter for the RD-0361 seam:
//   1. createSecretGate(...).admit(...) as the retained TypeScript shadow, and
//   2. createAppKernel(...).handle(...) through the real gate-9.5 route.
// The admitted secret-gate.fungi twin is run over the same presence evidence.  No
// consumer switch or authority flip is performed here.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const COMPILER = join(ROOT, "packages-ts", "galerina-core-compiler", "dist", "index.js");
const KERNEL = join(ROOT, "packages-ts", "galerina-framework-app-kernel", "dist", "index.js");
const TWIN = join(ROOT, "packages-ts", "galerina-framework-app-kernel", "src", "self-hosted", "secret-gate.fungi");
const decoder = new TextDecoder();

function makeProvider(statusByName) {
  return {
    has(name) {
      const status = statusByName.get(name);
      if (status === "error") throw new Error("backing store disposed");
      return status === "present";
    },
    use(name, fn) {
      if (statusByName.get(name) === "present") fn(new Uint8Array([1, 2, 3]));
    },
  };
}

function shadowDecision(createSecretGate, scenario) {
  const statusByName = new Map(scenario.secrets.map(({ name, status }) => [name, status]));
  const gate = createSecretGate(
    scenario.providerPresent ? makeProvider(statusByName) : undefined,
  );
  const refusal = gate.admit(scenario.secrets.map(({ name }) => name));
  return Object.freeze({
    verdict: refusal === null ? "admit" : refusal,
    admitted: refusal === null,
    authority: "typescript-shadow",
  });
}

function request(over = {}) {
  return {
    method: "GET",
    path: "/secret",
    headers: {},
    body: new Uint8Array(0),
    query: {},
    requestId: "rd0873-caller-route",
    receivedAt: 0,
    ...over,
  };
}

function responseError(response) {
  return response.body === undefined
    ? undefined
    : JSON.parse(decoder.decode(response.body)).error;
}

function routeReceipt(response, handlerCalls, auditEvents) {
  return Object.freeze({
    status: response.status,
    errorCode: responseError(response),
    handlerCalls,
    audit: auditEvents.map((event) => Object.freeze({
      method: event.method,
      path: event.path,
      status: event.status,
      errorCode: event.errorCode,
    })),
  });
}

const S = (name, status) => Object.freeze({ name, status });
const SCENARIOS = Object.freeze([
  Object.freeze({ name: "no provider and no required secret", providerPresent: false, secrets: [] }),
  Object.freeze({ name: "no provider refuses a required secret", providerPresent: false, secrets: [S("db", "present")] }),
  Object.freeze({ name: "present secret admits", providerPresent: true, secrets: [S("db", "present")] }),
  Object.freeze({ name: "absent secret refuses", providerPresent: true, secrets: [S("db", "absent")] }),
  Object.freeze({ name: "faulted secret refuses", providerPresent: true, secrets: [S("db", "faulted")] }),
  Object.freeze({ name: "disposed provider refuses", providerPresent: true, secrets: [S("db", "error")] }),
  Object.freeze({ name: "all required secrets admit", providerPresent: true, secrets: [S("a", "present"), S("b", "present")] }),
  Object.freeze({ name: "mixed required secrets refuse", providerPresent: true, secrets: [S("a", "present"), S("b", "absent")] }),
]);

test("RD-0873 caller-route and TypeScript-shadow differential fixture stays fail-closed", { timeout: 120_000 }, async () => {
  assert.ok(existsSync(COMPILER), "core compiler dist is required for this bounded fixture");
  assert.ok(existsSync(KERNEL), "app-kernel dist is required for this bounded fixture");
  assert.ok(existsSync(TWIN), "the retained secret-gate.fungi twin is required");

  const compiler = await import(pathToFileURL(COMPILER).href);
  const { createAppKernel, createSecretGate, InMemoryAuditSink } = await import(pathToFileURL(KERNEL).href);
  assert.equal(typeof createSecretGate, "function", "the retained TypeScript shadow must be callable");
  assert.equal(typeof createAppKernel, "function", "the real caller route must be callable");

  let source = readFileSync(TWIN, "utf8");
  if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
  const program = compiler.parseProgram(source, "secret-gate.fungi");
  assert.equal(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error").length,
    0,
    "the retained Fungi shadow parses clean",
  );
  const effects = compiler.checkEffects(program.flows, program.ast);
  const { gir } = compiler.emitGIR(program.ast, program.flows, effects);
  const wat = compiler.renderWAT(
    compiler.buildWATModuleFromGIR(gir, undefined, "secret-gate", program.ast, true),
  );
  const assembled = await compiler.assembleWAT(wat);
  assert.ok(assembled.valid && assembled.diagnostics.length === 0, "the Fungi twin assembles cleanly");

  const host = compiler.createHostRuntime();
  for (const entry of compiler.getInternedStrings()) host.seedString(entry.handle, entry.value);
  const keyPair = compiler.generateRunnerKeypair();
  const attestation = compiler.signWasm(assembled.wasm, keyPair.privateKeyPem, "dev");
  const { instance } = await compiler.admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keyPair.publicKeyPem },
    host,
  });
  assert.equal(typeof instance.exports.admitSecrets, "function", "the Fungi twin is admitted and executable");

  const twinDecision = (scenario) => {
    const recordPointers = scenario.secrets.map((secret) => host.allocRecord([
      host.internString(secret.name),
      host.internString(secret.status),
    ]));
    const arrayHandle = host.internArray(recordPointers);
    const verdict = host.readString(instance.exports.admitSecrets(
      scenario.providerPresent ? 1 : 0,
      arrayHandle,
    ));
    return Object.freeze({
      verdict,
      admitted: verdict === "admit",
      authority: "fungi-twin-non-authorizing",
    });
  };

  let checked = 0;
  for (const scenario of SCENARIOS) {
    const shadow = shadowDecision(createSecretGate, scenario);
    const twin = twinDecision(scenario);
    assert.equal(twin.verdict, shadow.verdict, `${scenario.name}: twin and TypeScript shadow verdicts agree`);
    assert.equal(twin.admitted, shadow.admitted, `${scenario.name}: twin and TypeScript shadow admission agrees`);
    assert.equal(twin.authority, "fungi-twin-non-authorizing", `${scenario.name}: twin remains non-authorizing`);

    const statusByName = new Map(scenario.secrets.map(({ name, status }) => [name, status]));
    let handlerCalls = 0;
    const auditSink = new InMemoryAuditSink();
    const kernel = createAppKernel({
      routes: [{
        method: "GET",
        path: "/secret",
        handler: "secret",
        auth: { mode: "public" },
        secrets: { require: scenario.secrets.map(({ name }) => name) },
      }],
      dispatch: {
        secret: () => {
          handlerCalls += 1;
          return { body: { ok: true } };
        },
      },
      auditSink,
      secretsProvider: scenario.providerPresent ? makeProvider(statusByName) : undefined,
    });
    const response = await kernel.handle(request());
    await new Promise((resolveTick) => setImmediate(resolveTick));
    const receipt = routeReceipt(response, handlerCalls, auditSink.drained());
    const expectedStatus = shadow.admitted ? 200 : 503;
    const expectedError = shadow.admitted ? undefined : "secret_unavailable";
    assert.equal(receipt.status, expectedStatus, `${scenario.name}: caller route status follows shadow admission`);
    assert.equal(receipt.errorCode, expectedError, `${scenario.name}: caller route error follows shadow refusal`);
    assert.equal(receipt.handlerCalls, shadow.admitted ? 1 : 0, `${scenario.name}: gate-9.5 precedes handler dispatch`);
    assert.equal(receipt.audit.length, 1, `${scenario.name}: exactly one route receipt is retained`);
    assert.deepEqual(receipt.audit[0], {
      method: "GET",
      path: "/secret",
      status: expectedStatus,
      errorCode: expectedError,
    }, `${scenario.name}: route receipt fields match the differential decision`);
    checked += 1;
  }
  assert.equal(checked, SCENARIOS.length, "every caller-route/shadow case was checked");
});
