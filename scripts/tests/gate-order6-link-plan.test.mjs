// gate-order6-link-plan.test.mjs — order 6's RED suite, THIRD submission.
//
// KTA 43 Q2 unlocked order 6 for "plan and red tests first". Submission 1 was
// rejected by KTA 45; submission 2 by KTA 57. This is the rewrite against
// KTA 57 §4's eight-item bar. Schema contract: KTA 44 §8.
//
// ★ THE ERROR I HAVE NOW MADE TWICE, so it is at the top of the file:
// **I keep widening the public surface to make testing easier.**
//   sub 1 (KTA 45 F1) — demanded a PUBLIC `admittedPayloadFor` reader;
//   sub 2 (KTA 57 F3) — demanded a PUBLIC `__planFieldOmissionForTesting` hook.
// Both contradict the module-private authority boundary they were meant to
// verify. **A test that needs production to expose a hole is not a test of that
// hole; it is the hole.** Row 15 now mutates an ISOLATED COPY and the production
// namespace stays closed.
//
// ⚠ EXPECTED STATE: **11 red · 7 green** — NOT the 14/1 of submission 2, and
// the change is a CONSEQUENCE of complying with KTA 57 F2, not a drift from it.
//
//   RED (11)   — rows 1-6, 10-13, 15: every one needs `buildLinkPlan`,
//                `resolveComponentArtifact`, `linkPlanDigest` or
//                `assertNotEmitterInput`, none of which exist. Link layer.
//   GREEN (7)  — rows 7a/7b/7c + its control, 8, 9: these assert ADMISSION-layer
//                refusals, and that layer already exists and already refuses.
//                Row 14 is the composite chapter gate.
//
// ★ F2 required controls for missing proof, rewritten proof and revoked
// evidence. Those refusals are enforced by admission, which is built — so they
// PASS, and passing is the correct result. Submission 2 forced them red by
// guarding them on an unrelated absent export; that is "red for the wrong
// reason", the very fault KTA 45 F6 rejected. **The count moved because the
// suite stopped lying about why a row was red.**
//
// Red rows fail at the `order6(...)` resolve; every assertion after it is
// written out in full so the row tests real behaviour the moment the export
// lands.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import {
  admittedControl, admissionInputs, inHandOf, envelopeFor, delegationFixture,
  verifiedOptions, compiler, gate, lib, seams, SOURCE, REGISTRY_VALUE,
} from "./helpers/gate-admission-fixture.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const MODULE = join(ROOT, "scripts", "lib", "gate-admission-envelope.mjs");

function order6(name) {
  const fn = gate[name];
  if (fn === undefined) {
    assert.fail(
      `ORDER-6 NOT IMPLEMENTED: \`${name}\` is not exported. Expected red for this ` +
      `chapter — the behaviour is absent, not broken. The assertions below specify it.`,
    );
  }
  assert.equal(typeof fn, "function", `\`${name}\` exists but is not callable`);
  return fn;
}

function mintedCapability(control) {
  const r = gate.linkableFromAdmission(control.envelope, control.options, control.inHand);
  assert.equal(r.ok, true, "fixture check: the control must admit, or every row below is vacuous");
  return r.linkable;
}

/** The eleven keys of KTA 44 §8.1, in sorted order. */
const PLAN_KEYS = [
  "admissionDigest", "circuitDigest", "components", "linkerRules",
  "productionAuthorizing", "proofSetDigest", "registryDigest", "schema",
  "sourceDigest", "target", "verifierRules",
];
const SHA256 = /^sha256:[0-9a-f]{64}$/;

// ── row 1 · the admitted control, against the closed schema ─────────────────

test("row 1: a valid linkable ALONE produces the exact closed plan (KTA 44 §8.1)", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const plan = buildLinkPlan(mintedCapability(control));

  assert.deepEqual(Object.keys(plan).sort(), PLAN_KEYS, "exactly eleven keys — absent and extra are both refusals");
  assert.equal(plan.schema, "gate-v3-link-plan.v1");
  assert.equal(plan.productionAuthorizing, false);
  for (const k of ["admissionDigest", "sourceDigest", "registryDigest", "circuitDigest", "proofSetDigest"]) {
    assert.match(plan[k], SHA256, `${k} must be sha256:<64 hex>`);
  }
  assert.equal(plan.circuitDigest, control.statement.circuitDigest);
  assert.equal(plan.registryDigest, control.statement.registryDigest);
  assert.equal(plan.sourceDigest, control.statement.sourceDigest);
  assert.equal(plan.target, control.statement.target);
  assert.match(plan.target, /^[A-Za-z0-9._-]+$/);
  assert.ok(plan.components.length >= 1 && plan.components.length <= 4096);
  for (const c of plan.components) {
    assert.deepEqual(Object.keys(c).sort(), ["id", "implementationDigest", "version"]);
    assert.match(c.version, /^\d+\.\d+\.\d+$/);
    assert.match(c.implementationDigest, SHA256);
  }
  const sorted = [...plan.components].sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version));
  assert.deepEqual(plan.components, sorted, "components are sorted at construction, so caller order cannot move the digest");
  assert.ok(plan.verifierRules.length > 0 && plan.linkerRules.length > 0);
});

// ── row 2 · clone ────────────────────────────────────────────────────────────

test("row 2: a structural clone of the capability refuses", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const real = mintedCapability(admittedControl());
  const clone = JSON.parse(JSON.stringify(real));
  assert.deepEqual(clone, JSON.parse(JSON.stringify(real)), "the clone IS structurally identical");
  assert.throws(() => buildLinkPlan(clone), /GATE_LINK_NOT_ADMITTED/);
});

// ── row 3 · capability A + circuit B — the substitution KTA 57 F2 required ───

test("row 3: capability A paired with a DISTINCT circuit B is refused or ignored", () => {
  // KTA 57 F2: submission 2 only mutated A's own object. That is a different
  // control. This supplies a genuinely distinct B as a surplus argument — which
  // JavaScript always permits — and requires that B cannot influence the result.
  const buildLinkPlan = order6("buildLinkPlan");
  const controlA = admittedControl();
  const capabilityA = mintedCapability(controlA);
  const controlB = admittedControl({ source: SOURCE.replace("CIRCUIT probe(", "CIRCUIT other(") });
  assert.notEqual(controlB.statement.circuitDigest, controlA.statement.circuitDigest,
    "fixture check: B must really be a different circuit");

  const honest = buildLinkPlan(capabilityA);

  // Either the surplus argument is refused outright, or it is ignored entirely.
  // Both are acceptable; silently honouring B is not.
  let withB;
  try { withB = buildLinkPlan(capabilityA, controlB.input.circuitCanonicalForm); }
  catch (e) { assert.match(String(e.message), /GATE_LINK_/, "if it refuses, it refuses with a named code"); return; }
  assert.deepEqual(withB, honest, "a supplied circuit B must not influence the plan built from capability A");
  assert.equal(withB.circuitDigest, controlA.statement.circuitDigest, "the plan still describes A");
});

// ── row 4 · post-mint registry mutation ─────────────────────────────────────

test("row 4: mutating the ORIGINAL registry material after mint changes nothing", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const control = admittedControl();
  const capability = mintedCapability(control);
  const before = buildLinkPlan(capability);
  try { control.input.registryCanonicalForm.components[0].implementationDigest = `sha256:${"9".repeat(64)}`; } catch { /* frozen is fine */ }
  assert.deepEqual(buildLinkPlan(capability), before, "registry material is snapshotted at admission, not read at link time");
});

// ── rows 5, 6 · component and target binding ────────────────────────────────

test("row 5: a component whose bytes differ from the admitted digest refuses", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const resolveComponent = order6("resolveComponentArtifact");
  const capability = mintedCapability(admittedControl());
  const wanted = buildLinkPlan(capability).components[0];
  assert.throws(
    () => resolveComponent(capability, { ...wanted, implementationDigest: `sha256:${"b".repeat(64)}` }),
    /GATE_LINK_COMPONENT_DIGEST_MISMATCH/,
    "name and version are not identity; the implementation digest is",
  );
  assert.doesNotThrow(() => resolveComponent(capability, wanted));
});

test("row 6: the correct component digest under a DIFFERENT target refuses", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const resolveComponent = order6("resolveComponentArtifact");
  const capability = mintedCapability(admittedControl());
  const wanted = buildLinkPlan(capability).components[0];
  assert.throws(() => resolveComponent(capability, wanted, { target: "wasm32-other" }), /GATE_LINK_TARGET_MISMATCH/);
  assert.doesNotThrow(() => resolveComponent(capability, wanted, { target: "wasm32-test" }));
});

// ── row 7 · proof identity — missing, reordered AND rewritten (KTA 57 F2) ────

const tamperedProofEnvelope = (transform) => {
  const input = admissionInputs();
  const built = compiler.buildAdmissionStatement(input, seams);
  const f = delegationFixture();
  const statement = { ...built.statement, proofs: transform([...built.statement.proofs]) };
  return { envelope: envelopeFor(statement, f.operational), options: verifiedOptions(f), inHand: inHandOf(input) };
};

for (const [label, transform] of [
  ["MISSING — one proof removed", (p) => p.slice(1)],
  ["REORDERED — same set, reversed", (p) => [...p].reverse()],
  ["REWRITTEN — same cardinality, one status changed", (p) => p.map((x, i) => (i === 0 ? { ...x, status: x.status === "satisfied" ? "missing" : "satisfied" } : x))],
]) {
  test(`row 7: proof material ${label} must not mint a capability`, () => {
    const { envelope, options, inHand } = tamperedProofEnvelope(transform);
    const r = gate.linkableFromAdmission(envelope, options, inHand);
    assert.equal(r.ok, false, `${label}: must refuse`);
    assert.equal(r.linkable, null);
  });
}

test("row 7 control: an untampered proof set DOES mint — so the three above are not vacuous", () => {
  const control = admittedControl();
  assert.equal(gate.linkableFromAdmission(control.envelope, control.options, control.inHand).ok, true);
});

// ── row 8 · expired, revoked and wrong-role (KTA 57 F2 added revoked) ───────

test("row 8: expired, REVOKED and wrong-role evidence refuse before binding selection", () => {
  const input = admissionInputs();
  const built = compiler.buildAdmissionStatement(input, seams);

  const expect = (label, r) => {
    assert.equal(r.ok, false, `${label} must refuse`);
    assert.equal(r.linkable, null, `${label} must yield no capability`);
    assert.equal(r.refusals.some((c) => String(c).startsWith("RELEASE_EVIDENCE")), true,
      `${label}: the ENVELOPE layer must refuse — unauthenticated fields never steer selection`);
  };

  const f1 = delegationFixture();
  expect("expired", gate.linkableFromAdmission(
    envelopeFor(built.statement, f1.operational),
    verifiedOptions(f1, { at: "2026-09-01T00:00:00.000Z" }), inHandOf(input)));

  // REVOKED — the operational key is revoked at verification time.
  const f2 = delegationFixture();
  expect("revoked", gate.linkableFromAdmission(
    envelopeFor(built.statement, f2.operational),
    verifiedOptions(f2, { isRevoked: (keyId) => keyId === f2.operational.keyId }), inHandOf(input)));

  const f3 = delegationFixture({ roles: [lib.RELEASE_EVIDENCE_ROLE.DURABILITY, lib.RELEASE_EVIDENCE_ROLE.REPOSITORY] });
  expect("wrong role", gate.linkableFromAdmission(
    envelopeFor(built.statement, f3.operational), verifiedOptions(f3), inHandOf(input)));
});

// ── row 9 · unknown suite ────────────────────────────────────────────────────

test("row 9: an unknown signing suite refuses through the existing catalogue", () => {
  const control = admittedControl();
  const bogus = { ...control.envelope, signature: { ...control.envelope.signature, algorithm: "hybrid-ed25519-mldsa99" } };
  const r = gate.linkableFromAdmission(bogus, control.options, control.inHand);
  assert.equal(r.ok, false);
  assert.equal(r.linkable, null);
  assert.deepEqual([...r.refusals], ["RELEASE_EVIDENCE_ENVELOPE_SIGNATURE_REFUSED"]);
  assert.equal(gate.linkableFromAdmission(control.envelope, control.options, control.inHand).ok, true);
});

// ── row 10 · no forged entry, no alternate path, no public payload reader ───

test("row 10: forged objects refuse, no alternate public link path, no payload reader", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  for (const junk of [null, undefined, 42, "linkable", {}, [],
    { kind: "gate-v3-linkable.v1", circuitDigest: `sha256:${"0".repeat(64)}`, target: "wasm32-test", components: [] }]) {
    assert.throws(() => buildLinkPlan(junk), /GATE_LINK_NOT_ADMITTED/, `must refuse ${JSON.stringify(junk)}`);
  }
  const linkish = Object.keys(gate).filter((k) => /link/i.test(k)
    && !["buildLinkPlan", "linkableFromAdmission", "assertLinkableAdmitted", "linkPlanDigest", "assertLinkPlanComplete", "GATE_LINK_CODES"].includes(k));
  assert.deepEqual(linkish, [], `alternate public link surface(s): ${linkish.join(", ")}`);
  assert.equal(gate.admittedPayloadFor, undefined, "the payload reader stays module-private (KTA 43 Q3)");
  assert.equal(gate.__planFieldOmissionForTesting, undefined,
    "★ KTA 57 F3: production must NOT ship a mutation hook — row 15 mutates an isolated copy instead");
});

// ── row 11 · the emitter boundary, runtime-enforced (KTA 57 F4) ─────────────

test("row 11: a link plan is REFUSED by the emitter-boundary discriminator", () => {
  // KTA 57 F4: absence of flow-shaped keys proves nothing. KTA 44 §8.5 requires
  // a runtime discriminator that recognises a link plan by WHAT IT IS.
  const buildLinkPlan = order6("buildLinkPlan");
  const assertNotEmitterInput = order6("assertNotEmitterInput");
  const plan = buildLinkPlan(mintedCapability(admittedControl()));

  assert.throws(() => assertNotEmitterInput(plan), /GATE_LINK_PLAN_NOT_EMITTER_INPUT/,
    "the plan is refused by identity — `schema: gate-v3-link-plan.v1` — not by missing fields");

  // Negative control: a genuine GIRProgram passes the same seam, so the guard
  // discriminates rather than refusing everything.
  const parsed = compiler.parseGateV3(SOURCE, "row11.gate");
  const loaded = compiler.loadGateV3Registry(REGISTRY_VALUE, "row11.json");
  const program = {
    schemaVersion: "fungi.gir.v1",
    generatedAt: "1970-01-01T00:00:00.000Z",
    entryPoints: [], flows: [],
    circuits: [compiler.lowerCircuitToGIR(parsed.circuit, loaded.registry)],
  };
  assert.doesNotThrow(() => assertNotEmitterInput(program), "a real GIRProgram must pass");
  assert.equal("schemaVersion" in plan, false, "and the plan is still not GIRProgram-shaped");
});

// ── rows 12, 13 · canonical determinism ─────────────────────────────────────

test("row 12: semantic identity is stable while the provenance-bound plan digest changes", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const planDigest = order6("linkPlanDigest");
  const respaced = SOURCE.replace("    IN.v -> a.subject", "    IN.v  ->  a.subject");
  assert.notEqual(respaced, SOURCE, "fixture check: the spellings must differ");
  const a = buildLinkPlan(mintedCapability(admittedControl()));
  const b = buildLinkPlan(mintedCapability(admittedControl({ source: respaced })));
  assert.match(planDigest(a), SHA256);
  assert.equal(b.circuitDigest, a.circuitDigest, "semantic circuit identity ignores whitespace");
  assert.notEqual(b.sourceDigest, a.sourceDigest, "raw source provenance remains exact");
  assert.notEqual(planDigest(b), planDigest(a),
    "the closed plan binds raw source provenance, so its digest must not erase a byte change");
});

test("row 13: repeated construction from ONE capability is byte-identical", () => {
  const buildLinkPlan = order6("buildLinkPlan");
  const planDigest = order6("linkPlanDigest");
  const capability = mintedCapability(admittedControl());
  const first = buildLinkPlan(capability);
  const second = buildLinkPlan(capability);
  assert.equal(planDigest(second), planDigest(first));
  assert.equal(
    Buffer.from(lib.canonicalReleaseEvidenceBytes(second)).toString("hex"),
    Buffer.from(lib.canonicalReleaseEvidenceBytes(first)).toString("hex"),
    "byte-identical through the PRODUCTION canonicaliser (KTA 44 §8.2), not merely deepEqual",
  );
});

// ── row 14 · the composite chapter gate ─────────────────────────────────────

test("row 14: the owning flow-hash suite is INVOKED and its failure propagates", () => {
  const suite = join(ROOT, "packages-galerina", "galerina-core-compiler", "tests", "gate-v3-flow-hash-invariance.test.mjs");
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  let out;
  try {
    out = execFileSync(process.execPath, ["--test", "--test-concurrency=1", suite], {
      encoding: "utf8", timeout: 120_000, cwd: ROOT, env: childEnv,
    });
  } catch (error) {
    assert.fail(`the owning flow-hash suite FAILED or could not run (exit ${error.status}):\n` +
      String(error.stdout ?? error.message).split("\n").slice(-15).join("\n"));
  }
  assert.match(out, /pass 16/, `expected 16 passing:\n${out.split("\n").slice(-10).join("\n")}`);
  assert.match(out, /fail 0/, "and zero failing");
});

// ── row 15 · detector-of-detector, ISOLATED (KTA 57 F3) ─────────────────────

test("★ row 15: a source mutant in an ISOLATED COPY makes a behavioural assertion fail", () => {
  // KTA 57 F3 rejected the previous row for requiring a PUBLIC mutation hook.
  // The mutant now lives in a temp copy of the module: production exposes
  // nothing, and the checkout is left untouched.

  const dir = mkdtempSync(join(tmpdir(), "order6-mutant-"));
  try {
    // Copy the module, rewriting its relative import to an absolute one so the
    // copy still resolves its sibling.
    let src = readFileSync(MODULE, "utf8");
    src = src.replace(/from "\.\/beta-release-evidence-envelope\.mjs"/g,
      `from ${JSON.stringify(pathToFileURL(join(ROOT, "scripts", "lib", "beta-release-evidence-envelope.mjs")).href)}`);
    src = src.replace(
      /const ROOT = join\(import\.meta\.dirname, "\.\.", "\.\."\);/,
      `const ROOT = ${JSON.stringify(ROOT)};`,
    );

    // THE MUTANT: drop `circuitDigest` from the constructed plan — the single
    // field binding the plan to its admitted circuit. If the suite survives it,
    // row 1's identity assertions are decoration.
    const mutated = src.replace(
      "circuitDigest: statement.circuitDigest,",
      "circuitDigest: statement.sourceDigest,",
    );
    assert.notEqual(mutated, src, "the mutation must actually apply, or this row proves nothing");

    const file = join(dir, "mutant.mjs");
    writeFileSync(file, mutated);
    assert.equal(readFileSync(MODULE, "utf8").includes("circuitDigest"), true,
      "the ORIGINAL module is untouched — the mutation is isolated");

    // The behavioural consequence a real detector must show: a plan built by the
    // mutant fails row 1's closed-key assertion.
    return import(pathToFileURL(file).href).then((mutant) => {
      const control = admittedControl();
      const cap = mutant.linkableFromAdmission(control.envelope, control.options, control.inHand).linkable;
      const plan = mutant.buildLinkPlan(cap);
      assert.throws(() => assert.equal(plan.circuitDigest, control.statement.circuitDigest),
        "the mutant must NOT satisfy the closed-key schema — if it does, the schema assertion is not load-bearing");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
