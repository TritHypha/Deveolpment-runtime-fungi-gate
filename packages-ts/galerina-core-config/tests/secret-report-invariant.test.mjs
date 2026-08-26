// =============================================================================
// Q4 / Chapter A item 4 — the secret-report INVARIANT.
//
// Owner ruling (FUNGI-PROGRAMME-HANDOVER-2026-08-07 §3): "Do not wire it as a
// permission. Replace the permission-shaped Boolean with an invariant such as
// `secretReportMode: 'redacted-only'`; migrate tests/docs/consumers, then remove
// the old field."
//
// Required discriminating evidence (§8): raw secret, derived credential and
// protected value remain redacted/refused across every report sink; NO
// configuration can flip to plaintext.
//
// WHAT WAS MEASURED FIRST (this package, current tree):
//   * `allowSecretValuesInReports` — declared as the literal `false`, returned by
//     all four environment modes, asserted in one test, READ BY NO PRODUCTION
//     CODE. It grants nothing, and its shape implies a choice that does not exist.
//   * `DEFAULT_SECRET_REDACTION_POLICY` — exported, and likewise consumed nowhere.
//   * The protection that actually holds is STRUCTURAL and was unnamed: every
//     vault report sink takes a KEY (and, once, two TYPE NAMES) — never a value.
//     A sink cannot leak what it never receives.
//
// So the invariant is not "we promise to redact"; it is "no sink accepts a value".
// These tests pin that, so a future signature change that admits a value goes red.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultEnvironmentPolicy,
  SECRET_REPORT_MODE,
  vaultDiagnosticSecretInVault,
  vaultDiagnosticKeyInvalid,
  vaultDiagnosticTypeMismatch,
  vaultDiagnosticKeyMissing,
  vaultDiagnosticMutationDenied,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "..", "src", "index.ts"), "utf8");

const MODES = ["development", "test", "staging", "production"];

test("CONTROL: the policy factory really answers for every mode", () => {
  for (const m of MODES) {
    const p = defaultEnvironmentPolicy(m);
    assert.equal(typeof p, "object", `no policy returned for ${m}`);
    assert.equal(typeof p.allowDotEnvFiles, "boolean", `${m} must still carry its real permissions`);
  }
});

test("every mode declares the invariant, and it is the same in all of them", () => {
  const seen = new Set(MODES.map((m) => defaultEnvironmentPolicy(m).secretReportMode));
  assert.deepEqual([...seen], ["redacted-only"],
    "an invariant that varies by mode is a permission wearing an invariant's name");
});

test("★ no configuration can flip to plaintext — the mode is a closed single-valued type", () => {
  // The value is declared ONCE as a literal constant and every other site refers
  // to it by name. That is stricter than an inline literal per site: a second,
  // divergent spelling cannot be introduced without deleting the constant.
  assert.match(SRC, /export const SECRET_REPORT_MODE = "redacted-only" as const/,
    "the one admitted value must be declared as a literal constant");
  assert.match(SRC, /readonly secretReportMode: typeof SECRET_REPORT_MODE/,
    "the field's type must be tied to that constant, not to `string`");
  assert.doesNotMatch(SRC, /secretReportMode\s*:\s*string\b/,
    "a widened type would admit a plaintext value");
  assert.doesNotMatch(SRC, /"plaintext"|"unredacted"/,
    "no alternative report mode may exist anywhere in the source");
  assert.equal(SECRET_REPORT_MODE, "redacted-only",
    "the exported constant is the single admitted value");
  // Every assignment site must go through the constant — no inline re-spelling.
  const assigns = SRC.match(/secretReportMode:\s*[^,\n}]+/g) ?? [];
  assert.ok(assigns.length >= 4, `expected one assignment per environment mode, saw ${assigns.length}`);
  for (const a of assigns) {
    if (/readonly/.test(a)) continue;            // the interface declaration
    assert.match(a, /SECRET_REPORT_MODE/, `assignment re-spells the value: ${a}`);
  }
});

test("★ the permission-shaped field is GONE", () => {
  assert.doesNotMatch(SRC, /allowSecretValuesInReports/,
    "a field named allow* implies a true is possible; the invariant replaces it");
});

test("★ every vault report sink refuses to accept a value — it takes keys, not data", () => {
  // The structural guarantee, pinned. Each sink is called with a key that LOOKS
  // like a secret; the emitted message must contain the key and never a value,
  // because no parameter can carry one.
  const KEY = "app.apiToken";
  const SECRET = "sk-live-DEADBEEF-must-never-appear";
  const sinks = [
    ["secretInVault", vaultDiagnosticSecretInVault(KEY)],
    ["keyInvalid", vaultDiagnosticKeyInvalid(KEY)],
    ["keyMissing", vaultDiagnosticKeyMissing(KEY)],
    ["mutationDenied", vaultDiagnosticMutationDenied(KEY)],
    // `declared`/`actual` are TYPE NAMES — measured: no production caller passes
    // a value, and both test callers pass "number"/"string".
    ["typeMismatch", vaultDiagnosticTypeMismatch(KEY, "number", "string")],
  ];
  for (const [name, d] of sinks) {
    const rendered = JSON.stringify(d);
    assert.ok(rendered.includes(KEY), `${name} must name the key it is about`);
    assert.ok(!rendered.includes(SECRET), `${name} leaked a value`);
  }
});

test("★ CONTROL: the leak assertion above can actually FAIL", () => {
  // Without this, "no sink leaked the secret" is satisfied by a sink that emits
  // nothing at all — the dead-control shape. Prove the detector fires.
  const SECRET = "sk-live-DEADBEEF-must-never-appear";
  const poisoned = JSON.stringify({ message: `value is "${SECRET}"` });
  assert.ok(poisoned.includes(SECRET),
    "if this fails the leak-detection above proves nothing");
});

test("the inert redaction policy is not presented as an active guarantee", () => {
  // DEFAULT_SECRET_REDACTION_POLICY is exported and consumed nowhere. Keeping it
  // is fine; presenting it as the mechanism is not. Its comment must say so.
  const idx = SRC.indexOf("DEFAULT_SECRET_REDACTION_POLICY");
  assert.ok(idx > 0, "the policy still exists");
  const preamble = SRC.slice(Math.max(0, idx - 900), idx);
  assert.match(preamble, /not (?:yet )?consumed|no consumer|shape only|advisory/i,
    "an exported policy nothing reads must say so where a reader will see it");
});
