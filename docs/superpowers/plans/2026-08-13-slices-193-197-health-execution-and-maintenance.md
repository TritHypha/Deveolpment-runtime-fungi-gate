# Slices 193-197 Health Execution and Maintenance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the remaining `HealthRegistry` execution methods without
moving mutable state, callback, timer, cleanup or aggregation authority into a
host wrapper, then close the scheduled 25-slice maintenance boundary.

**Architecture:** Keep removal, evaluation and timeout execution behind one
active registry boundary. Classify each exact method from source and consumer
evidence; emit no placeholder Fungi when the current physical profile cannot
preserve the object, callback, scheduling and failure contracts.

**Tech Stack:** TypeScript, Node `node:test`, Myco, checked Fungi/SLIDE evidence,
private Fungi skills and governed Markdown receipts.

## Global Constraints

- Local commits only; never push.
- No placeholder Fungi or host-precomputed health result.
- Preserve mutable map ordering, callback identity, Promise scheduling/race,
  timer cleanup, sync/async failures, open component keys and exact `this`
  identity.
- New Fungi may not use `null`, `NaN`, `else if`, `throw`, `try/catch`, `for`
  or unbounded `loop`.
- Repository closure remains `UNKNOWN`; crash-linked aggregate lanes stay
  excluded.
- Slice 197 is the next 25-slice maintenance boundary after Slice 172.

---

### Task 1: Bind Slices 193-197

**Files:**
- Read: `packages-galerina/galerina-observability/src/health.ts`
- Read: `packages-galerina/galerina-observability/tests/health.test.mjs`
- Read: `packages-galerina/galerina-observability/tests/kernel-integration.test.mjs`

**Interfaces:**
- Consumes: exact current `HealthRegistry` private maps, callbacks and timers.
- Produces: five symbol-scoped classifications with explicit threadability and
  blocker identifiers.

- [x] Classify `unregister` at both mutable-map deletions and exact `this`
  identity.
- [x] Classify `liveness` and `readiness` at the active async evaluation
  boundary, retaining their distinct map/kind routing.
- [x] Classify private `#evaluate` at ordered map enumeration, concurrent check
  execution, open component-map construction and fail-closed aggregation.
- [x] Classify private `#runOne` at callback invocation, Promise race, injected
  timer capability, sync/async failure mapping and mandatory cleanup.
- [x] Search exact consumers and existing Fungi assets before deciding.

### Task 2: Run bounded verification

**Files:**
- Test: `packages-galerina/galerina-observability/tests/health.test.mjs`
- Test: `packages-galerina/galerina-observability/tests/kernel-integration.test.mjs`

**Interfaces:**
- Consumes: the unmodified TypeScript package and its public consumers.
- Produces: fresh focused test counts with zero hidden skips.

- [x] Run observability typecheck and complete package suite.
- [x] Run focused health and kernel integration tests.
- [x] Review both private Fungi skills and record either a verified update or
  `NO_SKILL_UPDATE` with a source-backed reason.

### Task 3: Publish the bounded slice record

**Files:**
- Create: `docs/reports/slice-193-unregister-health-check-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-194-liveness-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-195-readiness-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-196-health-evaluate-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-197-health-run-one-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`

**Interfaces:**
- Consumes: five classifications and fresh bounded verification.
- Produces: append-only slice receipts and the current conversion checkpoint.

- [x] Write one exact receipt per method, including source observations,
  decision/effect ledger, blocker, threadability and retained TypeScript exit.
- [x] Update the live register and TODO without claiming whole-file retirement.
- [x] Run receipt, staged-path and private-document checks.
- [x] Commit only bounded authored documents.

### Task 4: Close the Slice 197 maintenance boundary

**Files:**
- Modify: registered generated graph, index, component-health, status, roadmap,
  subway, queue and receipt outputs through their owning tools only.

**Interfaces:**
- Consumes: the committed Slice 193-197 authored record.
- Produces: current bounded owners and an explicit `UNKNOWN` entry for any
  unavailable navigation index.

- [x] Run retirement and conversion-queue owners individually.
- [x] Run package, project, KB and semantic graph owners individually; do not
  invoke crash-linked `graph-all`.
- [x] Run dev-tool/Fungi inventories, code-index, component-health, status,
  roadmap/subway, canonical counts, receipts and path/private-document guards.
- [x] Commit owner outputs and rerun exact freshness checks at the
  owner-output build point.
- [ ] Refresh Myco once after the final authored/owner-output commit and prove
  Slice 197 is queryable.
- [x] Record codebase-memory as `UNKNOWN` because its transport remains unavailable;
  do not substitute another graph for missing exact-HEAD evidence.

## Self-review

- Empty liveness/readiness defaults remain exact source behavior, not a general
  production-health claim.
- `Promise.all` preserves result order while checks may settle independently;
  neither property authorizes general parallel execution.
- `Promise.race` does not cancel the losing callback; timer cleanup remains
  mandatory on every exit.
- No slice emits a `.fungi` file unless the complete active boundary becomes
  physically admissible.
