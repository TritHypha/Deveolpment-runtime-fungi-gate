/**
 * Phases 43-46 — Governance, Audit Chain, Proof Verifier, Type Registry services
 *
 * Tests four new governed HTTP services that form the runtime-in-Galerina
 * introspection and audit layer:
 *
 *   Phase 43 — governanceService.fungi      POST /governance/verify  (port 3920)
 *   Phase 44 — auditChainService.fungi      POST /audit/chain        (port 3921)
 *   Phase 45 — proofVerifierService.fungi   POST /proof/verify       (port 3922)
 *   Phase 46 — typeRegistryService.fungi    POST /types/resolve      (port 3923)
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseProgram, serve } from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const SERVICES = join(__dir, "..", "..", "..", "examples", "auth-service");

function loadService(filename) {
  const src = readFileSync(join(SERVICES, filename), "utf8");
  return parseProgram(src, filename);
}

function serveService(filename, config) {
  const src = readFileSync(join(SERVICES, filename), "utf8");
  return serve(src, filename, config);
}

// ── Phase 43: governanceService.fungi ──────────────────────────────────────────

describe("Phase 43: governanceService.fungi", () => {
  let server;
  const PORT = 3920;
  const url = `http://127.0.0.1:${PORT}/governance/verify`;

  before(async () => {
    server = await serveService("governanceService.fungi", { port: PORT });
  });

  after(async () => { if (server) await server.close(); });

  async function post(body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, json: JSON.parse(await r.text()) };
  }

  it("governanceService.fungi parses with zero errors", () => {
    const prog = loadService("governanceService.fungi");
    const errs = (prog.diagnostics ?? []).filter(d => d.severity === "error");
    assert.equal(errs.length, 0, errs.map(e => e.message).join(", "));
  });

  it("canonical 'secure' → level 2, governed: true", async () => {
    const r = await post({ effects: "secure", qualifier: "secure" });
    assert.equal(r.status, 200);
    assert.equal(r.json.level, 2);
    assert.equal(r.json.governed, true);
  });

  it("canonical 'critical' → level 3", async () => {
    const r = await post({ effects: "critical", qualifier: "secure" });
    assert.equal(r.status, 200);
    assert.equal(r.json.level, 3);
  });

  it("canonical 'guarded' → level 1", async () => {
    const r = await post({ effects: "guarded", qualifier: "guarded" });
    assert.equal(r.status, 200);
    assert.equal(r.json.level, 1);
  });

  it("unknown effects fail closed at the public boundary", async () => {
    const r = await post({ effects: "network.inbound", qualifier: "pure" });
    assert.equal(r.status, 500);
    assert.equal(r.json.error, "Internal runtime error");
    assert.equal(r.json.governed, undefined);
  });

  it("a compound string containing a policy word is not admitted", async () => {
    const r = await post({ effects: "network.inbound, audit.write (secure)", qualifier: "secure" });
    assert.equal(r.status, 500);
    assert.equal(r.json.error, "Internal runtime error");
    assert.equal(r.json.governed, undefined);
  });

  it("level 2 → requiresAudit: true", async () => {
    const r = await post({ effects: "secure", qualifier: "secure" });
    assert.equal(r.json.requiresAudit, true);
  });

  it("level 1 → requiresAudit: false", async () => {
    const r = await post({ effects: "guarded", qualifier: "guarded" });
    assert.equal(r.json.requiresAudit, false);
  });

  it("qualifier 'pure' → qualifierValid: true", async () => {
    const r = await post({ effects: "secure", qualifier: "pure" });
    assert.equal(r.json.qualifierValid, true);
  });

  it("qualifier 'guarded' → qualifierValid: true", async () => {
    const r = await post({ effects: "guarded", qualifier: "guarded" });
    assert.equal(r.json.qualifierValid, true);
  });

  it("qualifier 'unknown' fails closed at the public boundary", async () => {
    const r = await post({ effects: "secure", qualifier: "unknown" });
    assert.equal(r.status, 500);
    assert.equal(r.json.error, "Internal runtime error");
    assert.equal(r.json.qualifierValid, undefined);
  });
});

// ── Phase 44: auditChainService.fungi ──────────────────────────────────────────

describe("Phase 44: auditChainService.fungi", () => {
  let server;
  const PORT = 3921;
  const url = `http://127.0.0.1:${PORT}/audit/chain`;

  before(async () => {
    server = await serveService("auditChainService.fungi", { port: PORT });
  });

  after(async () => { if (server) await server.close(); });

  async function post(body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, json: JSON.parse(await r.text()) };
  }

  it("auditChainService.fungi parses with zero errors", () => {
    const prog = loadService("auditChainService.fungi");
    const errs = (prog.diagnostics ?? []).filter(d => d.severity === "error");
    assert.equal(errs.length, 0, errs.map(e => e.message).join(", "));
  });

  it("returns eventId as flowName:timestamp", async () => {
    const r = await post({ flowName: "verifyPassword", status: "Success", timestamp: "2026-06-01T00:00:00Z" });
    assert.equal(r.status, 200);
    assert.equal(r.json.eventId, "verifyPassword:2026-06-01T00:00:00Z");
  });

  it("returns chained: true and correct schemaVersion", async () => {
    const r = await post({ flowName: "checkCapability", status: "Denied", timestamp: "2026-06-01T12:00:00Z" });
    assert.equal(r.json.chained, true);
    assert.equal(r.json.schemaVersion, "fungi.runtime.audit.v1");
  });

  it("status 'Success' → statusValid: true", async () => {
    const r = await post({ flowName: "f", status: "Success", timestamp: "t1" });
    assert.equal(r.json.statusValid, true);
  });

  it("status 'Denied' → statusValid: true", async () => {
    const r = await post({ flowName: "f", status: "Denied", timestamp: "t2" });
    assert.equal(r.json.statusValid, true);
  });

  it("status 'Failed' → statusValid: true", async () => {
    const r = await post({ flowName: "f", status: "Failed", timestamp: "t3" });
    assert.equal(r.json.statusValid, true);
  });

  it("status 'Pending' fails closed before ledger admission", async () => {
    const r = await post({ flowName: "f", status: "Pending", timestamp: "t4" });
    assert.equal(r.status, 500);
    assert.equal(r.json.error, "Internal runtime error");
    assert.equal(r.json.statusValid, undefined);
  });

  it("eventId is stable concat regardless of content", async () => {
    const r = await post({ flowName: "a", status: "Success", timestamp: "b" });
    assert.equal(r.json.eventId, "a:b");
  });
});

// ── Phase 45: proofVerifierService.fungi ───────────────────────────────────────

describe("Phase 45: proofVerifierService.fungi", () => {
  let server;
  const PORT = 3922;
  const url = `http://127.0.0.1:${PORT}/proof/verify`;

  before(async () => {
    server = await serveService("proofVerifierService.fungi", { port: PORT });
  });

  after(async () => { if (server) await server.close(); });

  async function post(body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, json: JSON.parse(await r.text()) };
  }

  it("proofVerifierService.fungi parses with zero errors", () => {
    const prog = loadService("proofVerifierService.fungi");
    const errs = (prog.diagnostics ?? []).filter(d => d.severity === "error");
    assert.equal(errs.length, 0, errs.map(e => e.message).join(", "));
  });

  it("algorithm 'fungi.gov.sig.v1' → valid: true, strength: 3", async () => {
    const r = await post({ algorithm: "fungi.gov.sig.v1", signaturePresent: true });
    assert.equal(r.status, 200);
    assert.equal(r.json.valid, true);
    assert.equal(r.json.strength, 3);
  });

  it("algorithm 'sha256' → valid: true, strength: 2", async () => {
    const r = await post({ algorithm: "sha256", signaturePresent: true });
    assert.equal(r.json.valid, true);
    assert.equal(r.json.strength, 2);
  });

  it("unknown algorithm fails closed before proof evaluation", async () => {
    const r = await post({ algorithm: "md5", signaturePresent: false });
    assert.equal(r.status, 500);
    assert.equal(r.json.error, "Internal runtime error");
    assert.equal(r.json.valid, undefined);
  });

  it("phase39Ready matches valid field", async () => {
    const r = await post({ algorithm: "fungi.gov.sig.v1", signaturePresent: true });
    assert.equal(r.json.phase39Ready, r.json.valid);
  });

  it("algorithm is echoed back in response", async () => {
    const r = await post({ algorithm: "sha256", signaturePresent: false });
    assert.equal(r.json.algorithm, "sha256");
  });
});

// ── Phase 46: typeRegistryService.fungi ────────────────────────────────────────

describe("Phase 46: typeRegistryService.fungi", () => {
  let server;
  const PORT = 3923;
  const url = `http://127.0.0.1:${PORT}/types/resolve`;

  before(async () => {
    server = await serveService("typeRegistryService.fungi", { port: PORT });
  });

  after(async () => { if (server) await server.close(); });

  async function post(body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, json: JSON.parse(await r.text()) };
  }

  it("typeRegistryService.fungi parses with zero errors", () => {
    const prog = loadService("typeRegistryService.fungi");
    const errs = (prog.diagnostics ?? []).filter(d => d.severity === "error");
    assert.equal(errs.length, 0, errs.map(e => e.message).join(", "));
  });

  it("'Int' → isBuiltin: true, category: 'primitive', resolved: true", async () => {
    const r = await post({ typeName: "Int" });
    assert.equal(r.status, 200);
    assert.equal(r.json.isBuiltin, true);
    assert.equal(r.json.category, "primitive");
    assert.equal(r.json.resolved, true);
  });

  it("'Bool' → isBuiltin: true, category: 'primitive'", async () => {
    const r = await post({ typeName: "Bool" });
    assert.equal(r.json.isBuiltin, true);
    assert.equal(r.json.category, "primitive");
  });

  it("'String' → isBuiltin: true, category: 'primitive'", async () => {
    const r = await post({ typeName: "String" });
    assert.equal(r.json.isBuiltin, true);
    assert.equal(r.json.category, "primitive");
  });

  it("'Bytes' → isBuiltin: true, category: 'primitive'", async () => {
    const r = await post({ typeName: "Bytes" });
    assert.equal(r.json.isBuiltin, true);
  });

  it("'UserId' (unregistered custom type) fails closed", async () => {
    const r = await post({ typeName: "UserId" });
    assert.equal(r.status, 500);
    assert.equal(r.json.error, "Internal runtime error");
    assert.equal(r.json.isBuiltin, undefined);
  });

  it("typeName is echoed back in response", async () => {
    const r = await post({ typeName: "Float" });
    assert.equal(r.json.typeName, "Float");
  });
});
