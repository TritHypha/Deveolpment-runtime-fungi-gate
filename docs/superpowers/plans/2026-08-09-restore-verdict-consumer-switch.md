# Restore Verdict Consumer Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind `ColdBootOrchestrator.restore` to one mandatory, fail-closed `restoreVerdict` authority without moving its host persistence responsibilities.

**Architecture:** Add a narrow literal-identity authority interface to the sentinel-state package. The orchestrator independently derives snapshot presence and integrity, requires exact agreement from the authority, and refuses every invalid or unavailable state without fallback. Contract 85's real source-free SLIDE publication supplies the cross-repository evidence.

**Tech Stack:** TypeScript ES2022, Node `node:test`, existing SLIDE checked-Fungi publication loader, repository graph/audit generators.

## Global Constraints

- Zero trust: verify rather than assume and fail closed.
- Never use an ambient SLIDE path as production authority.
- Never invoke a TypeScript decision fallback.
- Keep checkpoint serialization, atomic storage, durability and scrub ownership unchanged.
- Run tests and generators sequentially; never push.

---

### Task 1: RED consumer contract

**Files:**
- Modify: `packages-galerina/galerina-core-sentinel-state/tests/cold-boot.test.mjs`

**Interfaces:**
- Consumes: existing `ColdBootOrchestrator(serializer, writer)`.
- Produces: executable expectations for a third authority argument with literal identities and `restoreVerdict(Bool, Bool)`.

- [ ] **Step 1: Add an authority-observation test**

Create a test authority whose `restoreVerdict` records its two Boolean inputs
and returns `1`. Checkpoint a valid snapshot, restore it and assert exactly one
call with `[true, true]`.

- [ ] **Step 2: Add fail-closed boundary tests**

Add cases for a missing authority, invalid identity, thrown decision, result
`0`, and a `-1` disagreement for a locally valid snapshot. Every case must
refuse; none may restore a value.

- [ ] **Step 3: Run RED**

Run:

```powershell
npm.cmd test --prefix packages-galerina/galerina-core-sentinel-state
```

Expected: the authority-observation and refusal cases fail because the current
constructor ignores the third argument and `restore` never calls it.

### Task 2: Minimal authority-bound restore

**Files:**
- Modify: `packages-galerina/galerina-core-sentinel-state/src/cold-boot.ts`
- Modify: `packages-galerina/galerina-core-sentinel-state/src/index.ts`

**Interfaces:**
- Consumes: `RestoreVerdictAuthority` with exact package/export identities.
- Produces: mandatory constructor authority and one exact synchronous decision call.

- [ ] **Step 1: Define the narrow interface**

Export `RestoreVerdictAuthority` with literal package identity
`@galerina/core-sentinel-state`, export name `restoreVerdict`, and method
`restoreVerdict(snapshotPresent: boolean, integrityOk: boolean): unknown`.

- [ ] **Step 2: Validate at construction and execution**

Reject absent or wrong identity at construction. In `restore`, derive the local
facts, call once, catch authority failures, require exact `1|-1`, require
agreement with the local expected result, and emit
`LSS-RESTORE-AUTHORITY-001` on authority failure.

- [ ] **Step 3: Preserve terminal diagnostics**

After an agreed `-1`, keep `LSS-NOSNAP-001` for absence and
`LSS-INTEGRITY-001` for tamper. Deserialize only after an agreed `1`.

- [ ] **Step 4: Run GREEN**

Run the sentinel-state package test and require zero failures.

### Task 3: Real Contract 85 consumer evidence

**Files:**
- Modify: `scripts/tests/restore-verdict-slide-candidate.integration.test.mjs`
- Modify: `packages-galerina/galerina-tower-citizen/tests/full-sentinel-flight.test.mjs`

**Interfaces:**
- Consumes: Contract 85 publication loader prepare/execute/verify functions.
- Produces: a synchronous authority backed by independently verified typed receipts.

- [ ] **Step 1: Update the tower test caller**

Supply a deterministic test-only authority with exact identity and expected
Boolean fold. This is a fixture, not a production fallback.

- [ ] **Step 2: Add the real integration case**

Prepare Contract 85 once, wrap its execute and verify functions in the authority
interface, instantiate the real orchestrator, and prove valid restore plus
missing/tampered refusal. Require `fallbackInvoked === false` and exact receipt
identity for every decision.

- [ ] **Step 3: Run focused cross-repository evidence**

Build sentinel-state and run the integration test with
`GALERINA_SLIDE_REPO` set to the sibling checkout. Expected: all cases pass;
the test remains an explicit skip when the checkout is unavailable.

### Task 4: Documentation, generated evidence and closure

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: `scripts/component-health.mjs`
- Create: `docs/reports/restore-verdict-consumer-switch-2026-08-09.md`
- Regenerate: graph, code/contract registry, component-health and canonical test counts through owning tools only.

**Interfaces:**
- Consumes: focused and aggregate evidence.
- Produces: an honest reference-only consumer-switch checkpoint.

- [ ] **Step 1: Run focused package, tower and Contract 85 tests**

- [ ] **Step 2: Run the relevant serialized aggregate and audit gates**

- [ ] **Step 3: Update current documentation without changing package-retirement counters**

- [ ] **Step 4: Regenerate and independently check all affected generated outputs**

- [ ] **Step 5: Commit locally, refresh the structural index and verify exact indexed HEAD**
