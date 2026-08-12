import test from "node:test";
import assert from "node:assert/strict";

import { validateErrorEnvelope } from "../lib/error-envelope.mjs";

const valid = Object.freeze({
  schema: "zt.error-envelope.v1",
  origin: "SLIDE",
  phase: "EXECUTION",
  state: "REFUSED",
  code: "SLIDE-PACKAGE-SET-001",
  evidenceDigest: "a".repeat(64),
  authorityReleased: false,
});

test("exact error envelope is accepted without granting authority", () => {
  assert.deepEqual(validateErrorEnvelope(valid), {
    ok: true,
    envelope: valid,
  });
});

test("error envelope refuses surplus, ambient reporting and authority release", () => {
  for (const mutation of [
    { ...valid, message: "internal path" },
    { ...valid, logger: () => {} },
    { ...valid, authorityReleased: true },
    { ...valid, evidenceDigest: "A".repeat(64) },
    { ...valid, code: "" },
  ]) {
    assert.deepEqual(validateErrorEnvelope(mutation), {
      ok: false,
      code: "ZT-ERROR-ENVELOPE-REFUSED",
    });
  }
});

test("error envelope refuses inherited, accessor and hostile proxy inputs", () => {
  assert.equal(validateErrorEnvelope(Object.create(valid)).ok, false);
  const accessor = { ...valid };
  Object.defineProperty(accessor, "code", { enumerable: true, get: () => valid.code });
  assert.equal(validateErrorEnvelope(accessor).ok, false);
  assert.equal(validateErrorEnvelope(new Proxy({ ...valid }, {
    getPrototypeOf() { throw new Error("hostile"); },
  })).ok, false);
});
