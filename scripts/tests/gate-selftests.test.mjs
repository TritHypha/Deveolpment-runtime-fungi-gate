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

test("gate-selftests: the meta-gate's own --self-test passes (it is itself non-vacuous)", () => {
  assert.equal(selfTest.status, 0, `meta-gate self-test failed:\n${selfTest.stdout}\n${selfTest.stderr}`);
});

test("gate-selftests: ZERO declared gate self-tests fail — no neutered detector (blocking)", () => {
  const failing = sweep.results.filter((r) => r.violation);
  assert.equal(failing.length, 0,
    `a DECLARED gate self-test does not pass — a fail-open disguised as green:\n${JSON.stringify(failing, null, 2)}`);
});

test("gate-selftests: every audit/lint has executable anti-neutering evidence", () => {
  assert.equal(
    sweep.totals.advisories,
    0,
    `gates without a proven self-test are fail-open evidence gaps:\n${
      sweep.results.filter((r) => r.advisory).map((r) => r.name).join("\n")
    }`,
  );
  assert.equal(sweep.totals.violations, 0);
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
