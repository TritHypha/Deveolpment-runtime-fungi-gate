// Cadence test for audit-gate-selftests.mjs — the META-GATE that proves every audit/lint gate's --self-test
// is NON-VACUOUS (owner ask 2026-07-12: "do we have anything that audits/tests the dev tools/audits/graphs
// to make sure they do the correct job and just not exiting?"). Living in scripts/tests/, it runs in the
// phase-close `tests:tooling` step every close — so a neutered detector, or a new gate born without a
// self-test, fails the close instead of surfacing only on a manual run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = join(SCRIPTS, "audit-gate-selftests.mjs");
const ROOT = join(SCRIPTS, "..");
const node = process.execPath;

// Run the meta-gate once and share — a full sweep spawns every gate's --self-test, so keep it to one.
const selfTest = spawnSync(node, [TOOL, "--self-test"], { encoding: "utf8" });
const sweep = JSON.parse(spawnSync(node, [TOOL, "--json"], { cwd: ROOT, encoding: "utf8" }).stdout);

// The current advisory baseline: audit/lint gates with no proven --self-test. RATCHET — it may only SHRINK.
// A NEW audit/lint tool that lands without a self-test pushes this over the line and fails here, forcing it
// to be born self-tested (the "born fail-closed" discipline applied to the gate suite itself). Lower this
// number as gates gain self-tests; never raise it.
const ADVISORY_BASELINE = 13;

// ── The count above is NOT the authority (2026-07-25) ────────────────────────────────────────────
// A count ratchet is MASKABLE: one advisory gate gaining a self-test (13→12) while a new uncontrolled
// gate lands (12→13) nets to 13 and stays green while a real regression entered. That is the same hole
// R&D 0182 ruled on for the dead set, the one the phantom ratchet was upgraded out of on this date, and
// the one R&D applied to the recon map when they replaced count-agreement with SET equality. Three
// independent instances of one principle: SETS, NOT COUNTS.
//
// It matters specifically here: `audit-signed-fixture-drift.mjs` is on this list — a SIGNING-PATH gate
// with no proven self-test, whose neutering would be self-undetectable. A swap that quietly moved it
// off the burn-down list and a different gate onto it must not read as "no change".
const ADVISORY_SET = Object.freeze([
  "audit-allowlist-sensitive.mjs", "audit-codes-full.mjs", "audit-corpus-effect-names.mjs",
  "audit-diagnostic-codes.mjs", "audit-kernel-floor.mjs", "audit-scratchdir-hygiene.mjs",
  "audit-selfhost-readiness.mjs", "audit-signed-fixture-drift.mjs", "audit-stray-docs.mjs",
  "audit-syntax-reference-links.mjs", "audit-syntax.mjs", "lint-conventions.mjs", "lint-fungi.mjs",
]);

test("gate-selftests: the meta-gate's own --self-test passes (it is itself non-vacuous)", () => {
  assert.equal(selfTest.status, 0, `meta-gate self-test failed:\n${selfTest.stdout}\n${selfTest.stderr}`);
});

test("gate-selftests: ZERO declared gate self-tests fail — no neutered detector (blocking)", () => {
  const failing = sweep.results.filter((r) => r.violation);
  assert.equal(failing.length, 0,
    `a DECLARED gate self-test does not pass — a fail-open disguised as green:\n${JSON.stringify(failing, null, 2)}`);
});

test("gate-selftests: advisory baseline (gates without a proven self-test) does not GROW", () => {
  assert.ok(sweep.totals.advisories <= ADVISORY_BASELINE,
    `advisory baseline grew to ${sweep.totals.advisories} (baseline ${ADVISORY_BASELINE}) — a new audit/lint gate ` +
    `landed without a --self-test. Give it one (see audit-web-stub-guard.mjs::selfTest for the pattern), or add a ` +
    `verified fixture test to SELFTEST_VIA_TEST. Gates without a proven self-test: ` +
    sweep.results.filter((r) => r.advisory).map((r) => r.name).join(", "));
});

test("gate-selftests: the advisory list is the NAMED baseline set — a swap cannot mask it", () => {
  const now = sweep.results.filter((r) => r.advisory).map((r) => r.name).sort();
  // ENTERED = a gate became advisory that was not on the burn-down list. Fix: give it a self-test.
  const entered = now.filter((n) => !ADVISORY_SET.includes(n));
  // LEFT = a listed gate is no longer advisory (it earned a self-test) — GOOD news, but the stale entry
  // must be REMOVED from ADVISORY_SET, or it pads the set and hides a future entrant behind the count.
  const left = ADVISORY_SET.filter((n) => !now.includes(n));
  assert.deepEqual(entered, [],
    `a gate became advisory without being on the burn-down list — give it a --self-test, or a fixture ` +
    `test registered in SELFTEST_VIA_TEST. Do NOT add it to ADVISORY_SET to quieten this.`);
  assert.deepEqual(left, [],
    `these gates are no longer advisory (they gained a proven self-test) — REMOVE them from ADVISORY_SET ` +
    `and lower ADVISORY_BASELINE. Leaving them pads the set and lets a future entrant hide under the count.`);
});

test("gate-selftests: every fixture-test credit (GUARDED_BY_TEST) still resolves to a live proof", () => {
  const stale = sweep.results.filter((r) => r.note && /fixture proof is gone/.test(r.note));
  assert.equal(stale.length, 0,
    `a GUARDED_BY_TEST credit lost its fixture proof (test deleted/renamed) — the credit is now dishonest:\n${JSON.stringify(stale, null, 2)}`);
});

test("gate-selftests: audit-mutation is credited by fixture test and NEVER run via --self-test (safety)", () => {
  const m = sweep.results.find((r) => r.name === "audit-mutation.mjs");
  assert.equal(m?.status, "GUARDED_BY_TEST",
    "audit-mutation must be credited via its hermetic fixture test, not spawned with --self-test (it would mutate real security source)");
});
