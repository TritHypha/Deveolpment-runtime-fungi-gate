# Slices 198-207 Metrics Types and Histogram Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the first ten `metrics.ts` scopes without laundering
erased declarations, JavaScript binary64 behavior, mutable histogram state or
iteration into a narrower Fungi/SLIDE profile.

**Architecture:** Treat the five exported type/interface declarations as
non-executing transport descriptions. Keep histogram execution in TypeScript
until one admitted profile preserves mutable state, complete binary64 edge
semantics, bounded bucket traversal, interpolation, rounding and snapshot
ordering.

**Tech Stack:** TypeScript, Node `node:test`, Myco, checked Fungi/SLIDE evidence,
private Fungi skills and governed Markdown receipts.

## Global Constraints

- Local commits only; never push.
- No placeholder Fungi and no host-precomputed histogram result.
- Preserve NaN/infinity/signed-zero behavior at the TypeScript boundary even
  though new Fungi source may never contain `null` or `NaN`.
- New Fungi may not use `else if`, `throw`, `try/catch`, `for` or `loop`; only
  a proved bounded Boolean `while` is admissible.
- Do not infer runtime validation from an erased TypeScript declaration.
- Defer aggregate graph/index/roadmap owners until Slice 222. Repository-wide
  closure remains `UNKNOWN`; crash-linked aggregate lanes stay excluded.

---

### Task 1: Bind the five declaration slices

**Files:**
- Read: `packages-galerina/galerina-observability/src/metrics.ts`
- Read: `packages-galerina/galerina-observability/src/kernel-integration.ts`
- Read: `packages-galerina/galerina-observability/tests/metrics.test.mjs`

**Interfaces:**
- Consumes: `StatusClass`, `RequestObservation`, `LatencySnapshot`,
  `RouteMetric` and `MetricsSnapshot` at the current source digest.
- Produces: Slices 198-202 as exact `NO_RUNTIME_BEHAVIOR` classifications.

- [x] Account `StatusClass` without treating its five spellings as validation.
- [x] Account `RequestObservation` without inventing an Option, binary64 or
  exact-record wire codec.
- [x] Account the three nested snapshot records without treating their arrays,
  status maps, binary64 values or route labels as admitted runtime values.

### Task 2: Bind the histogram execution slices

**Files:**
- Read: `packages-galerina/galerina-observability/src/metrics.ts`
- Test: `packages-galerina/galerina-observability/tests/metrics.test.mjs`

**Interfaces:**
- Consumes: the live private histogram fields and exact JavaScript-number
  operations.
- Produces: Slices 203-207 with precise physical-profile blockers and
  threadability classes.

- [x] Retain `Histogram.observe` at validation, mutable accumulation, ordered
  first-bucket selection and overflow mutation.
- [x] Retain `Histogram.#percentile` at mutable-state reads, interpolation,
  cumulative traversal, clamping and overflow estimation.
- [x] Retain `Histogram.snapshot` at ordered cumulative materialization,
  min-sentinel handling, rounding and four percentile calls.
- [x] Retain `clamp` and `round` at the complete JavaScript binary64 contract,
  including non-finite and signed-zero behavior.

### Task 3: Verify and publish the batch

**Files:**
- Create: `docs/reports/slice-198-status-class-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-199-request-observation-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-200-latency-snapshot-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-201-route-metric-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-202-metrics-snapshot-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-203-histogram-observe-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-204-histogram-percentile-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-205-histogram-snapshot-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-206-clamp-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-207-round-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`

**Interfaces:**
- Consumes: the ten classifications and fresh bounded test evidence.
- Produces: ten slice receipts, one current checkpoint and no runtime authority.

- [x] Run the complete observability package and focused metrics/kernel tests.
- [x] Write one exact receipt per scope and update the live register/TODO.
- [x] Review both private Fungi skills and record a verified update or
  `NO_SKILL_UPDATE`.
- [x] Run receipt, path-leak and private-document guards; commit only the
  bounded authored files.

## Self-review

- The five declarations do not execute or validate their represented values.
- `Histogram` reads and mutates active private state; immutable record/array
  transport cannot replace it.
- Binary64 arithmetic, interpolation and `Math.round` are not signed-i32
  arithmetic, and a host-computed scalar would move the decision boundary.
- No conversion result authorizes a consumer switch, retirement or release.
