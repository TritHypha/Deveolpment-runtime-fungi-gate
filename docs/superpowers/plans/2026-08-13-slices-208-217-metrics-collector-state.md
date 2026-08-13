# Slices 208-217 Metrics Collector State Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Account for the remaining status-map, route-accumulator and
`MetricsCollector` state scopes without moving open input, mutable maps,
binary64 behavior, error containment or ordering into a host wrapper.

**Architecture:** Keep active aggregation behind its TypeScript object until
the selected Fungi/SLIDE profile admits exact string/numeric records, affine
mutable state and transaction ordering. Treat the options interface as erased
metadata and preserve newly discovered cardinality failure as a priority
runtime defect rather than normalizing it away during translation.

**Tech Stack:** TypeScript, Node `node:test`, Myco, checked Fungi/SLIDE evidence,
private Fungi skills and governed Markdown receipts.

## Global Constraints

- Local commits only; never push.
- No placeholder Fungi or host-computed metric/status result.
- Preserve complete JavaScript number, string, regex, UTF-16, Map, property
  access, mutation, sorting, exception containment and object-identity behavior.
- New Fungi may not contain `null`, `NaN`, `else if`, `throw`, `try/catch`,
  `for` or `loop`; iteration requires a proved bounded Boolean `while`.
- Defer aggregate graph/index/roadmap owners until Slice 222. Repository-wide
  closure remains `UNKNOWN`; crash-linked aggregate lanes stay excluded.

---

### Task 1: Bind helper and route-accumulator scopes

**Files:**
- Read: `packages-galerina/galerina-observability/src/metrics.ts`
- Test: `packages-galerina/galerina-observability/tests/metrics.test.mjs`

**Interfaces:**
- Consumes: exact source behavior for `emptyStatusClasses`,
  `RouteAccumulator.constructor`, `RouteAccumulator.snapshot`,
  `normaliseRoute` and `statusClassOf`.
- Produces: Slices 208-212 with explicit physical blockers.

- [x] Preserve the fixed external status-key map and fresh mutable identity.
- [x] Preserve route-accumulator construction and snapshot reads across nested
  mutable histogram state and binary64 rates.
- [x] Preserve open host-string observation, query stripping, whitespace regex,
  UTF-16 slicing and JavaScript-number HTTP-class derivation.

### Task 2: Bind the active collector scopes

**Files:**
- Read: `packages-galerina/galerina-observability/src/metrics.ts`
- Read: `packages-galerina/galerina-observability/src/kernel-integration.ts`
- Read: `packages-galerina/galerina-observability/src/observability.ts`

**Interfaces:**
- Consumes: `MetricsCollectorOptions`, constructor, `record`,
  `#routeAccumulator` and `snapshot` with all current consumers.
- Produces: Slices 213-217, including one measured runtime defect.

- [x] Account the erased options declaration without treating it as validation.
- [x] Retain construction at private maps/histograms, binary64 option validation
  and active object identity.
- [x] Retain `record` as one ordered error-contained mutation transaction over
  open host input and both global/per-route state.
- [x] Prove the cardinality comment is false for hostile method diversity:
  `maxRoutes: 1` plus 100 new methods yields 101 series.
- [x] Retain snapshot at ordered Map materialization, comparator sorting,
  binary64 rates and nested mutable-state snapshots.

### Task 3: Verify and publish the batch

**Files:**
- Create: `docs/reports/slice-208-empty-status-classes-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-209-route-accumulator-constructor-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-210-route-accumulator-snapshot-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-211-normalise-route-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-212-status-class-of-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-213-metrics-collector-options-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-214-metrics-collector-constructor-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-215-metrics-collector-record-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-216-route-accumulator-resolution-fungi-conversion-2026-08-13.md`
- Create: `docs/reports/slice-217-metrics-collector-snapshot-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`

**Interfaces:**
- Consumes: ten classifications, focused tests and the hostile-method probe.
- Produces: ten governed receipts and one explicit priority defect queue item.

- [x] Run complete observability and focused metrics/kernel tests.
- [x] Write ten exact receipts and update the live register/TODO.
- [x] Review both private skills; update only for a reusable compiler- or
  SLIDE-backed rule, otherwise record `NO_SKILL_UPDATE`.
- [x] Run receipt, path-leak and private-document guards and commit only the
  bounded authored files.

## Self-review

- Exception containment does not make a multi-object mutable transaction pure.
- A declared `maxRoutes` cap is not a proof when arbitrary methods create one
  overflow series each.
- TypeScript remains active; no focused test or declaration authorizes a
  consumer switch, retirement or release.
