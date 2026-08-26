// =============================================================================
// Audit-receipt central redaction sink (candidate C).
//
// buildFlowAuditEvent now routes every audit field VALUE through @galerina/core-security
// redactText — the "redact before writing" the checkNoSecrets tripwire (Rule 5) asks for.
// This preserves the compliance record minus the secret, catches assignment-style secrets
// that checkNoSecrets' narrow value-patterns miss, and leaves the fail-closed tripwire intact
// for anything redactText does not match.
// =============================================================================

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildFlowAuditEvent, createAuditWriter } = await import("../dist/index.js");

test("audit metadata redacts assignment-style secrets checkNoSecrets misses (record preserved, not thrown)", () => {
  const ev = buildFlowAuditEvent("pay", "secure", "Success", "t1", [
    { event: "http.request", fields: { note: "config password=hunter2 loaded" } },
  ]);
  const v = ev.metadata["http.request.note"];
  assert.ok(!v.includes("hunter2"), `secret must be masked, got: ${v}`);
  assert.match(v, /SecureString\(redacted\)/);
  // and the record now survives the checkNoSecrets tripwire on append (was previously a leak path)
  assert.doesNotThrow(() => createAuditWriter().append(ev));
});

test("audit metadata redacts an embedded Bearer token", () => {
  const ev = buildFlowAuditEvent("call", "secure", "Success", "t2", [
    { event: "auth", fields: { hdr: "sent Bearer abcDEF123456ZZ to upstream" } },
  ]);
  assert.ok(!ev.metadata["auth.hdr"].includes("abcDEF123456ZZ"), ev.metadata["auth.hdr"]);
  assert.match(ev.metadata["auth.hdr"], /SecureString\(redacted\)/);
});

test("a non-secret value is preserved unchanged (no over-redaction)", () => {
  const ev = buildFlowAuditEvent("get", "pure", "Success", "t3", [
    { event: "http.request", fields: { url: "https://api.example.com/v1/items?limit=20" } },
  ]);
  assert.equal(ev.metadata["http.request.url"], "https://api.example.com/v1/items?limit=20");
});

test("the checkNoSecrets tripwire is INTACT — a bare JWT (which redactText does not match) still fails closed", () => {
  const ev = buildFlowAuditEvent("tok", "secure", "Success", "t4", [
    { event: "auth", fields: { blob: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9payloadsig" } },
  ]);
  assert.throws(() => createAuditWriter().append(ev), /credential|redact/i);
});
