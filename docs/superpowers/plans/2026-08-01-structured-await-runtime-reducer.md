# Structured Await Runtime Reducer Implementation Plan

**Status:** complete and locally committed; no push

> **For agentic workers:** use the repository test-driven implementation and
> verification workflows. Commit locally; never push.

## Task 1: Freeze the admitted plan and error vocabulary

- [x] Add failing plan-admission tests.
- [x] Define exported host/runtime error metadata constants.
- [x] Reconstruct only the closed valid plan.

## Task 2: Implement the deterministic reducer

- [x] Add failing transition tests for all policies and hostile events.
- [x] Implement start/cancel/terminal command emission.
- [x] Keep cancellation pending until running tasks acknowledge termination.
- [x] Prove `maxInFlight` and monotonic-time invariants in tests.

## Task 3: Document the boundary

- [x] Update runtime README/TODO and repository TODO/roadmap.
- [x] Record the difference between cooperative cancellation and hard
      termination.
- [x] Update the KB R&D row with measured implementation evidence.

## Task 4: Verify and commit

- [x] Run package typecheck/build/tests.
- [x] Run authoritative package count and governed graph/generator/security/
      exhaustive gates: 98/98 packages, 8,770 tests, graph 5/5, generator
      contracts 14/14, security 31 files with zero findings/errors and
      exhaustive 85/85.
- [x] Refresh generated evidence and local KB indexes.
- [x] Commit reviewed changes locally: Galerina implementation `10945699` and
      KB evidence `a40acec`; do not push.
