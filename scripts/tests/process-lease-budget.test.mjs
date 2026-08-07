// =============================================================================
// Q6 / Chapter A item 3 (first half) — the GLOBAL process lease budget.
//
// Owner ruling (FUNGI-PROGRAMME-HANDOVER-2026-08-07 §3): "Add one process-tree
// owner with a global bounded lease budget, inherited by nested tools. Record
// spawn/start/heartbeat/exit/reap receipts and kill the owned tree on timeout or
// parent loss."
//
// WHAT WAS MEASURED FIRST. `scripts/lib/owned-process-tree.cjs` (419 lines)
// already contains receipts (18 mentions) and per-child limits (timeout, cleanup
// grace, output bytes). It contains NO cap, NO budget, NO heartbeat, NO reap —
// exactly the two absences WP09 named. A per-child timeout bounds one child's
// life; nothing bounds the POPULATION, which is what produced the >100-process
// incident.
//
// SCOPE OF THIS FILE — stated, not implied. The budget is a pure accounting
// problem and is tested here WITHOUT SPAWNING ANYTHING: the arithmetic, the
// refusal, and the inheritance across a process boundary (an environment
// carrying the lease state) are all decidable from values. The heartbeat and
// reap-on-parent-loss halves require real children and belong in a separate,
// carefully-bounded change — they are NOT claimed by this file.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const {
  LEASE_ENV_CAP,
  LEASE_ENV_HELD,
  DEFAULT_LEASE_CAP,
  readLeaseState,
  acquireLease,
  releaseLease,
  childLeaseEnv,
} = require(join(HERE, "..", "lib", "process-lease-budget.cjs"));

const envWith = (cap, held) => {
  const e = {};
  if (cap !== undefined) e[LEASE_ENV_CAP] = String(cap);
  if (held !== undefined) e[LEASE_ENV_HELD] = String(held);
  return e;
};

test("CONTROL: an unconfigured environment yields the default cap and zero held", () => {
  const s = readLeaseState({});
  assert.equal(s.cap, DEFAULT_LEASE_CAP);
  assert.equal(s.held, 0);
  assert.ok(DEFAULT_LEASE_CAP >= 1 && DEFAULT_LEASE_CAP <= 64,
    "a default cap outside 1..64 is a typo, not a policy");
});

test("a lease is granted while the budget has room", () => {
  const r = acquireLease(envWith(4, 1), "audit-tool");
  assert.equal(r.granted, true);
  assert.equal(r.held, 2, "acquiring must increment the held count");
  assert.equal(r.receipt.event, "lease-acquired");
  assert.equal(r.receipt.owner, "audit-tool");
});

test("★ the cap REFUSES rather than queueing or overcommitting", () => {
  const r = acquireLease(envWith(2, 2), "one-too-many");
  assert.equal(r.granted, false, "at the cap, a lease must be refused");
  assert.equal(r.receipt.event, "lease-refused");
  assert.equal(r.receipt.reason, "cap-reached");
  assert.equal(r.held, 2, "a refusal must not consume budget");
});

test("★ a nested tool INHERITS the budget — it cannot mint its own", () => {
  // The outer runner holds 2 of 3. The env handed to a child must carry both the
  // cap and the running total, so the child sees 1 remaining, not a fresh 3.
  const outer = envWith(3, 2);
  const childEnv = childLeaseEnv(outer, { ...outer, PATH: "x" });
  const childState = readLeaseState(childEnv);
  assert.equal(childState.cap, 3, "the child must inherit the SAME cap");
  assert.equal(childState.held, 2, "the child must inherit the running total");
  const childAcquire = acquireLease(childEnv, "nested");
  assert.equal(childAcquire.granted, true, "one slot remained");
  const childAtCap = acquireLease({ ...childEnv, [LEASE_ENV_HELD]: "3" }, "nested-2");
  assert.equal(childAtCap.granted, false, "the child hits the SHARED cap, not its own");
});

test("★ a child cannot RAISE the cap it was given", () => {
  const outer = envWith(2, 0);
  // A nested tool that tries to hand itself a larger budget must not succeed.
  const forged = childLeaseEnv(outer, { ...outer, [LEASE_ENV_CAP]: "999" });
  assert.equal(readLeaseState(forged).cap, 2,
    "the inherited cap is authoritative; a child-supplied larger cap is ignored");
});

test("a child MAY lower the cap for its own subtree", () => {
  const outer = envWith(8, 0);
  const tightened = childLeaseEnv(outer, { ...outer, [LEASE_ENV_CAP]: "2" });
  assert.equal(readLeaseState(tightened).cap, 2,
    "tightening is always admissible — only widening is refused");
});

test("releasing returns budget and emits a receipt naming the outcome", () => {
  for (const outcome of ["clean-exit", "timeout", "crash", "reap-failure"]) {
    const r = releaseLease(envWith(4, 3), "tool", outcome);
    assert.equal(r.held, 2, `${outcome} must return exactly one slot`);
    assert.equal(r.receipt.event, "lease-released");
    assert.equal(r.receipt.outcome, outcome,
      "receipts must distinguish clean exit, timeout, crash and reap failure");
  }
});

test("★ an unknown outcome is REFUSED — the receipt vocabulary is closed", () => {
  assert.throws(() => releaseLease(envWith(4, 3), "tool", "probably-fine"),
    /outcome/i, "an open outcome vocabulary cannot be audited");
});

test("★ malformed lease state FAILS CLOSED — it does not reset to a fresh budget", () => {
  for (const bad of ["", "-1", "abc", "1e9", "3.5"]) {
    const s = readLeaseState({ [LEASE_ENV_CAP]: "4", [LEASE_ENV_HELD]: bad });
    assert.equal(s.held, s.cap,
      `held=${JSON.stringify(bad)} is unreadable, so the budget must read as EXHAUSTED, never as free`);
  }
});

test("CONTROL: the exhaustion rule does not fire on a WELL-FORMED zero", () => {
  const s = readLeaseState({ [LEASE_ENV_CAP]: "4", [LEASE_ENV_HELD]: "0" });
  assert.equal(s.held, 0, "a real zero must remain zero, or the fail-closed rule is vacuous");
});
