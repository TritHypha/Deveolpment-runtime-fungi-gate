# Structured Await Runtime Reducer Implementation Plan

**Status:** design recorded; implementation in progress

> **For agentic workers:** use the repository test-driven implementation and
> verification workflows. Commit locally; never push.

## Task 1: Freeze the admitted plan and error vocabulary

- [ ] Add failing plan-admission tests.
- [ ] Define exported host/runtime error metadata constants.
- [ ] Reconstruct only the closed valid plan.

## Task 2: Implement the deterministic reducer

- [ ] Add failing transition tests for all policies and hostile events.
- [ ] Implement start/cancel/terminal command emission.
- [ ] Keep cancellation pending until running tasks acknowledge termination.
- [ ] Prove `maxInFlight` and monotonic-time invariants in tests.

## Task 3: Document the boundary

- [ ] Update runtime README/TODO and repository TODO/roadmap.
- [ ] Record the difference between cooperative cancellation and hard
      termination.
- [ ] Update the KB R&D row with measured implementation evidence.

## Task 4: Verify and commit

- [ ] Run package typecheck/build/tests.
- [ ] Run authoritative package count and governed graph/generator/security/
      exhaustive gates.
- [ ] Refresh generated evidence and local KB indexes.
- [ ] Commit reviewed Galerina and KB changes locally; do not push.

