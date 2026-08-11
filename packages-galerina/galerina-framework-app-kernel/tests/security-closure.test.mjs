import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAppKernel,
  InMemoryAuditSink,
  InMemoryIdempotencyStore,
} from "../dist/index.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

function request(over = {}) {
  return {
    method: "GET",
    path: "/x",
    headers: {},
    body: new Uint8Array(0),
    query: {},
    requestId: "security-closure",
    receivedAt: 0,
    ...over,
  };
}

function errorOf(response) {
  return response.body === undefined ? undefined : JSON.parse(dec.decode(response.body)).error;
}

test("required scopes deny an admitted channel that lacks a route scope", async () => {
  let ran = false;
  const kernel = createAppKernel({
    routes: [{ method: "GET", path: "/x", handler: "x", auth: { mode: "required", scopes: ["orders:read"] } }],
    dispatch: { x: () => { ran = true; return { body: { ok: true } }; } },
  });

  const denied = await kernel.handle(request({ channelVerdict: 1, principalScopes: [] }));
  assert.equal(denied.status, 403);
  assert.equal(errorOf(denied), "forbidden");
  assert.equal(ran, false);

  const admitted = await kernel.handle(request({ channelVerdict: 1, principalScopes: ["orders:read"] }));
  assert.equal(admitted.status, 200);
  assert.equal(ran, true);
});

test("legacy header-presence authentication is refused at kernel construction", () => {
  assert.throws(
    () => createAppKernel({
      routes: [{ method: "GET", path: "/x", handler: "x", auth: { mode: "required", allowHeaderPresenceFallback: true } }],
      dispatch: { x: () => ({ body: {} }) },
    }),
    /header-presence authentication is forbidden/i,
  );
});

test("handler secret access is restricted to the route declaration and raw views cannot be returned", async () => {
  const values = new Map([
    ["allowed", new Uint8Array([1, 2, 3])],
    ["other", new Uint8Array([9, 9, 9])],
  ]);
  const provider = {
    has(name) { return values.has(name); },
    use(name, fn) {
      const value = values.get(name);
      return value === undefined ? undefined : fn(value);
    },
  };
  let undeclaredCalled = false;
  let escaped;
  const kernel = createAppKernel({
    routes: [{ method: "GET", path: "/x", handler: "x", auth: { mode: "public" }, secrets: { require: ["allowed"] } }],
    secretsProvider: provider,
    dispatch: {
      x: ({ getSecret }) => {
        const absent = getSecret("other", () => { undeclaredCalled = true; });
        escaped = getSecret("allowed", (view) => view);
        return { body: { absent: absent === undefined, escaped: escaped === undefined } };
      },
    },
  });

  const response = await kernel.handle(request());
  assert.equal(response.status, 200);
  assert.equal(undeclaredCalled, false);
  assert.equal(escaped, undefined);
});

test("duplicate JSON keys are denied before the handler", async () => {
  let ran = false;
  const kernel = createAppKernel({
    routes: [{ method: "POST", path: "/x", handler: "x", auth: { mode: "public" } }],
    dispatch: { x: () => { ran = true; return { body: {} }; } },
  });
  const response = await kernel.handle(request({
    method: "POST",
    body: enc.encode('{"role":"user","role":"admin"}'),
    headers: { "content-type": "application/json" },
  }));
  assert.equal(response.status, 422);
  assert.equal(ran, false);
});

test("named request types require and execute a closed-schema validator", async () => {
  assert.throws(
    () => createAppKernel({
      routes: [{ method: "POST", path: "/x", handler: "x", requestType: "CreateOrder", auth: { mode: "public" } }],
      dispatch: { x: () => ({ body: {} }) },
    }),
    /request validator.*CreateOrder/i,
  );

  let ran = false;
  const kernel = createAppKernel({
    routes: [{ method: "POST", path: "/x", handler: "x", requestType: "CreateOrder", auth: { mode: "public" } }],
    requestValidators: {
      CreateOrder(value) {
        return value !== null && typeof value === "object" && !Array.isArray(value)
          && Object.keys(value).length === 1 && typeof value.amount === "number";
      },
    },
    dispatch: { x: () => { ran = true; return { body: {} }; } },
  });
  const response = await kernel.handle(request({
    method: "POST",
    body: enc.encode('{"amount":10,"admin":true}'),
    headers: { "content-type": "application/json" },
  }));
  assert.equal(response.status, 422);
  assert.equal(ran, false);
});

test("route rate, deadline, and response-memory budgets are enforced", async () => {
  const rateKernel = createAppKernel({
    routes: [{ method: "GET", path: "/x", handler: "x", auth: { mode: "public" }, limits: { rate: "1/minute" } }],
    dispatch: { x: () => ({ body: { ok: true } }) },
  });
  assert.equal((await rateKernel.handle(request())).status, 200);
  assert.equal((await rateKernel.handle(request())).status, 429);

  const deadlineKernel = createAppKernel({
    routes: [{ method: "GET", path: "/x", handler: "x", auth: { mode: "public" }, limits: { timeoutMs: 5 } }],
    dispatch: { x: async () => await new Promise(() => {}) },
  });
  const timed = await deadlineKernel.handle(request());
  assert.equal(timed.status, 504);
  assert.equal(errorOf(timed), "deadline_exceeded");

  const memoryKernel = createAppKernel({
    routes: [{ method: "GET", path: "/x", handler: "x", auth: { mode: "public" }, limits: { memoryBytes: 8 } }],
    dispatch: { x: () => ({ body: "this response is larger than eight bytes" }) },
  });
  const oversized = await memoryKernel.handle(request());
  assert.equal(oversized.status, 503);
  assert.equal(errorOf(oversized), "resource_limit_exceeded");
});

test("default idempotency storage expires entries, rejects oversized keys, and stays bounded", () => {
  let now = 1_000;
  const store = new InMemoryIdempotencyStore({ capacity: 2, maxKeyBytes: 8, now: () => now });
  assert.equal(store.seen("r", "a", 1), false);
  assert.equal(store.seen("r", "a", 1), true);
  now += 1_001;
  assert.equal(store.seen("r", "a", 1), false);
  assert.throws(() => store.seen("r", "0123456789", 1), /idempotency key/i);
  assert.equal(store.seen("r", "b", 60), false);
  assert.throws(() => store.seen("r", "c", 60), /capacity/i);
});

test("default audit retention is a bounded ring", async () => {
  const sink = new InMemoryAuditSink({ capacity: 2 });
  for (let i = 0; i < 3; i += 1) {
    sink.emit({ requestId: `r${i}`, method: "GET", path: "/x", status: 200, errorCode: undefined, appliedDefaults: [], relaxations: [], at: i });
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(sink.drained().map((event) => event.requestId), ["r1", "r2"]);
  assert.equal(sink.dropped(), 1);
});
