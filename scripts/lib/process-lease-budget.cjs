"use strict";
// =============================================================================
// scripts/lib/process-lease-budget.cjs
//
// A GLOBAL, INHERITED lease budget for owned child processes.
//
// WHY THIS EXISTS. `owned-process-tree.cjs` bounds each child — timeout, cleanup
// grace, output bytes — and emits receipts. It does not bound the POPULATION: a
// per-child timeout limits one child's lifetime, not how many exist at once,
// which is what produced the >100-process accumulation. Two absences were
// measured in that file: no cap/budget, and no heartbeat/reap. This module
// closes the first.
//
// THE INHERITANCE PROBLEM, AND WHY IT IS ENVIRONMENT-CARRIED. A cap held in
// module state bounds one process. Aggregate runners spawn nested runners, which
// spawn tools — so a budget that does not cross the process boundary is not a
// budget, it is a suggestion. The cap and the running total therefore travel in
// the child's ENVIRONMENT, and a child reads them rather than minting its own.
//
// THE ASYMMETRY THAT MAKES IT SAFE. A child may LOWER the cap for its own
// subtree (tightening is always admissible) and may never RAISE it — an
// inherited cap is authoritative, so a nested tool cannot vote itself more
// budget. Widening is silently clamped rather than refused, because a nested
// tool that inherits a smaller budget than it expects should proceed within it,
// not fail.
//
// FAIL-CLOSED. Unreadable lease state reads as EXHAUSTED, never as free. A
// corrupted or truncated environment must not present as a fresh budget — that
// is precisely how an accumulation restarts.
//
// Pure accounting. Spawns nothing, writes nothing, opens nothing.
// =============================================================================

/** Environment keys. Named so a stray `env` dump is self-describing. */
const LEASE_ENV_CAP = "GALERINA_PROCESS_LEASE_CAP";
const LEASE_ENV_HELD = "GALERINA_PROCESS_LEASE_HELD";

/**
 * Default population cap when nothing is configured.
 *
 * Deliberately small. The incident this bounds was runaway accumulation, and the
 * cost of a cap that is slightly too low is a serialised run; the cost of one
 * slightly too high is the incident. Chosen over `cores - 2` because a budget
 * must be reproducible across machines to be auditable.
 */
const DEFAULT_LEASE_CAP = 8;

/** The closed outcome vocabulary. An open set cannot be audited. */
const LEASE_OUTCOMES = Object.freeze(["clean-exit", "timeout", "crash", "reap-failure"]);

/** Strict non-negative integer parse: no floats, no exponents, no whitespace. */
function strictCount(raw) {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/**
 * Read the lease state an environment carries.
 *
 * A missing cap means "not yet configured" and takes the default. An unreadable
 * HELD value means the accounting cannot be trusted, so the budget reads as
 * fully consumed — `held === cap` — and every further acquire refuses.
 */
function readLeaseState(env) {
  const source = env ?? {};
  const capRaw = source[LEASE_ENV_CAP];
  const cap = capRaw === undefined ? DEFAULT_LEASE_CAP : strictCount(capRaw);
  const effectiveCap = cap === null || cap < 1 ? DEFAULT_LEASE_CAP : cap;
  const heldRaw = source[LEASE_ENV_HELD];
  if (heldRaw === undefined) return { cap: effectiveCap, held: 0 };
  const held = strictCount(heldRaw);
  if (held === null) return { cap: effectiveCap, held: effectiveCap };  // fail closed
  return { cap: effectiveCap, held: Math.min(held, effectiveCap) };
}

function receipt(event, owner, extra) {
  return Object.freeze({ event, owner, ...extra });
}

/**
 * Attempt to take one slot. Returns the decision, the new held count and a
 * receipt. Never throws for a full budget — refusal is an ordinary outcome and
 * the caller decides whether to serialise or stop.
 */
function acquireLease(env, owner) {
  if (typeof owner !== "string" || owner.length === 0) {
    throw new Error("process lease: an owner name is required so a receipt can name who holds the slot.");
  }
  const { cap, held } = readLeaseState(env);
  if (held >= cap) {
    return { granted: false, cap, held, receipt: receipt("lease-refused", owner, { reason: "cap-reached", cap, held }) };
  }
  const next = held + 1;
  return { granted: true, cap, held: next, receipt: receipt("lease-acquired", owner, { cap, held: next }) };
}

/**
 * Return one slot, naming how the child ended. The outcome vocabulary is closed
 * so a receipt log can be audited by enumeration rather than by reading prose.
 */
function releaseLease(env, owner, outcome) {
  if (!LEASE_OUTCOMES.includes(outcome)) {
    throw new Error(
      `process lease: unknown outcome ${JSON.stringify(outcome)}; expected one of ${LEASE_OUTCOMES.join(", ")}.`,
    );
  }
  const { cap, held } = readLeaseState(env);
  const next = Math.max(0, held - 1);
  return { cap, held: next, receipt: receipt("lease-released", owner, { outcome, cap, held: next }) };
}

/**
 * Build the environment for a child, carrying the budget forward.
 *
 * `parentEnv` is authoritative for the cap. `proposed` is whatever the caller
 * wants the child to see; a cap in it may TIGHTEN the budget and may never widen
 * it. The held count always comes from the parent — a child cannot reset it.
 */
function childLeaseEnv(parentEnv, proposed) {
  const parent = readLeaseState(parentEnv);
  const out = { ...(proposed ?? {}) };
  const requested = strictCount(out[LEASE_ENV_CAP]);
  const cap = requested !== null && requested >= 1 && requested < parent.cap ? requested : parent.cap;
  out[LEASE_ENV_CAP] = String(cap);
  out[LEASE_ENV_HELD] = String(Math.min(parent.held, cap));
  return out;
}

module.exports = Object.freeze({
  LEASE_ENV_CAP,
  LEASE_ENV_HELD,
  DEFAULT_LEASE_CAP,
  LEASE_OUTCOMES,
  readLeaseState,
  acquireLease,
  releaseLease,
  childLeaseEnv,
});
