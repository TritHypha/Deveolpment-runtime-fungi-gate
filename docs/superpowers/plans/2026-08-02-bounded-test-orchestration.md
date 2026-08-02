# Bounded Test Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent overlapping Galerina root suites, cap Node test-file workers,
and fail closed when an owned test process tree cannot be accounted for.

**Architecture:** A shared atomic checkout lease admits one root suite and an
exact parent-bound nested aggregate. Root package tests append a maximum-four
Node test concurrency flag only to standard `node --test` scripts. A bounded
platform supervisor owns timeout cleanup, while the Claude Stop hook becomes a
status-only heartbeat.

**Tech Stack:** Node.js 18.19+, CommonJS/ES modules, `node:test`, atomic
filesystem operations, Windows process-tree adapter, POSIX process groups.

## Global Constraints

- Zero trust: unknown, malformed, mismatched, timed out, signalled, or
  unaccounted process state refuses.
- Preserve Node process isolation; never hide leaks with `--test-force-exit`.
- Default maximum test-file concurrency is four; callers may lower but never
  raise it.
- Package conversion and retirement evidence are outside this plan.
- Use RED-to-GREEN tests for every behavior change.
- Keep commits local and never push.

---

### Task 1: Add the shared suite lease

**Files:**

- Create: `scripts/lib/suite-run-lease.cjs`
- Create: `scripts/tests/suite-run-lease.test.mjs`
- Modify: `scripts/run-all-tests.cjs`
- Modify: `scripts/run-phase-close.mjs`

**Interfaces:**

- Produces `acquireSuiteLease({ root, commandClass }): SuiteLease`.
- Produces `admitInheritedSuiteLease({ root, expectedCommandClass }): SuiteLease`.
- `SuiteLease.release()` removes only the exact owned lease.
- The phase-close passes the nonce to its direct aggregate child; no other
  environment value grants admission.

- [x] **Step 1: Write failing unit tests for exact acquisition and conflict**

  Test that one lease acquires, a second same-root lease refuses with
  `SUITE-LEASE-HELD`, and a different checkout identity has a different lease.

- [x] **Step 2: Run the lease test and verify RED**

  Run: `node --test scripts/tests/suite-run-lease.test.mjs`

  Expected: failure because `suite-run-lease.cjs` does not exist.

- [x] **Step 3: Implement atomic acquisition and exact release**

  Use `mkdirSync(path, { recursive: false })`, canonical bounded JSON, a
  32-byte random nonce, and exit handlers that remove only a record whose
  nonce still matches the owner.

- [x] **Step 4: Add failing tests for inherited-parent admission**

  Cover correct immediate parent, copied nonce with wrong parent, malformed
  record, wrong root, missing record, and stale record.

- [x] **Step 5: Implement inherited admission and integrate both runners**

  Acquire before executing children. `run-phase-close.mjs` passes the exact
  lease to its direct `run-all-tests.cjs` child; standalone aggregates acquire
  their own lease.

- [x] **Step 6: Run focused runner tests**

  Run:
  `node --test --test-concurrency=1 scripts/tests/suite-run-lease.test.mjs scripts/tests/run-all-tests.test.mjs scripts/tests/run-phase-close.test.mjs`

- [x] **Step 7: Commit the lease slice**

  Commit: `fix: serialize root verification suites`

### Task 2: Bound Node test-file concurrency and expose progress

**Files:**

- Create: `scripts/lib/test-runner-policy.cjs`
- Create: `scripts/tests/test-runner-policy.test.mjs`
- Modify: `scripts/run-all-tests.cjs`
- Modify: `scripts/tests/run-all-tests.test.mjs`

**Interfaces:**

- Produces `parseTestConcurrency(value): number` for the closed range `1..4`.
- Produces `npmTestInvocation({ platform, testScript, concurrency })`.
- Root JSON adds `controls.testConcurrency` and
  `controls.processIsolation: "process"`.

- [x] **Step 1: Write failing policy tests**

  Hand-check standard and custom package commands plus zero, negative,
  non-integer, missing, and values above four.

- [x] **Step 2: Run policy tests and verify RED**

  Run: `node --test scripts/tests/test-runner-policy.test.mjs`

- [x] **Step 3: Implement the closed policy and command construction**

  Standard `node --test` scripts receive npm arguments
  `-- --test-concurrency=<n>`; custom scripts remain unchanged.

- [x] **Step 4: Add a failing aggregate contract test**

  Assert canonical JSON records the bound and progress is emitted on stderr
  without corrupting stdout.

- [x] **Step 5: Integrate the policy and heartbeat**

  Add `--test-concurrency 1..4`, default four, package-start/package-finish
  progress, and the controls result object.

- [x] **Step 6: Run focused tests and a single small real package**

  Run:
  `node --test --test-concurrency=1 scripts/tests/test-runner-policy.test.mjs scripts/tests/run-all-tests.test.mjs`

  Then run:
  `node scripts/run-all-tests.cjs galerina-core-economics --json --test-concurrency 2`

- [x] **Step 7: Commit the bounded-worker slice**

  Commit: `fix: bound package test workers`

### Task 3: Replace automatic full closes with a bounded heartbeat

**Files:**

- Create: `scripts/phase-close-hook.mjs`
- Create: `scripts/tests/phase-close-hook.test.mjs`
- Modify: `.claude/settings.json`

**Interfaces:**

- `phase-close-hook.mjs` reads status/lease facts only and emits one bounded
  `systemMessage`; it never invokes either root runner.

- [x] **Step 1: Write a failing behavior test for the hook**

  Supply a fixture with trap runner files and assert the hook reports explicit
  close required without executing either trap.

- [x] **Step 2: Run the hook test and verify RED**

  Run: `node --test scripts/tests/phase-close-hook.test.mjs`

- [x] **Step 3: Implement the heartbeat and change the Stop hook**

  Replace `node scripts/run-phase-close.mjs` with
  `node scripts/phase-close-hook.mjs` in `.claude/settings.json`.

- [x] **Step 4: Run focused hook/tooling-contract checks**

  Run:
  `node --test --test-concurrency=1 scripts/tests/phase-close-hook.test.mjs scripts/tests/tooling-contract.test.mjs`

- [x] **Step 5: Commit the hook slice**

  Commit: `fix: make stop verification bounded`

### Task 4: Add owned process-tree timeout cleanup

**Files:**

- Create: `scripts/lib/owned-process-tree.cjs`
- Create: `scripts/fixtures/process-tree-parent.cjs`
- Create: `scripts/fixtures/process-tree-child.cjs`
- Create: `scripts/tests/owned-process-tree.test.mjs`
- Modify: `scripts/run-all-tests.cjs`
- Modify: `scripts/run-phase-close.mjs`

**Interfaces:**

- Produces `runOwnedProcess({ command, args, cwd, env, timeoutMs }): Promise<OwnedResult>`.
- `OwnedResult` distinguishes `EXITED`, `TIMED_OUT_TREE_CLOSED`, and
  `TREE_CLEANUP_REFUSED`.

- [x] **Step 1: Write a failing descendant-timeout test**

  The fixture parent launches a long-lived child and publishes both PIDs. The
  assertion requires both PIDs to be absent after timeout acknowledgement.

- [x] **Step 2: Run the process-tree test and verify RED**

  Run: `node --test --test-concurrency=1 scripts/tests/owned-process-tree.test.mjs`

- [x] **Step 3: Implement bounded platform adapters**

  Windows targets the exact PID tree while the parent is live. POSIX starts a
  dedicated process group and signals the negative group PID. All arguments
  are arrays, never interpolated shell strings.

- [x] **Step 4: Integrate the async supervisor into both runners**

  Preserve canonical captured stdout/stderr and existing failure codes. Add a
  distinct cleanup-refusal code.

- [x] **Step 5: Run focused timeout, runner, and mutation tests**

  Run:
  `node --test --test-concurrency=1 scripts/tests/owned-process-tree.test.mjs scripts/tests/run-all-tests.test.mjs scripts/tests/run-phase-close.test.mjs`

- [x] **Step 6: Commit the process-tree slice**

  Commit: `fix: own verification process trees`

### Task 5: Verify containment before resuming broad closes

**Files:**

- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Create: `docs/reports/bounded-test-orchestration-completion-2026-08-02.md`

- [x] **Step 1: Run all focused orchestration tests at concurrency one**

  Run the four new test files plus existing runner/tooling-contract tests.

- [x] **Step 2: Demonstrate overlap refusal**

  Hold one fixture lease, start a second same-root runner, and record its exact
  refusal without starting a package child.

- [x] **Step 3: Run one explicit phase-close with four-worker ceiling**

  Confirm one lease owner, bounded progress, complete exit, exact lease
  release, and no owned descendant remaining. Do not start any other broad
  command concurrently.

- [x] **Step 4: Update living documentation from fresh evidence**

  Record commands, counts, durations, limitations, and the separate future Job
  Object hardening decision without upgrading external authority.

- [x] **Step 5: Commit the verified report and generated documentation**

  Commit: `docs: record bounded verification orchestration`
