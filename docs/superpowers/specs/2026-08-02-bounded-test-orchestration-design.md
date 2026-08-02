# Bounded Test Orchestration Design

**Date:** 2026-08-02

**Status:** owner-approved through the full-auto continuation following the
Node process incident diagnosis

**Scope:** Galerina root test/phase-close orchestration and Claude Stop-hook
cadence. Package conversion is explicitly excluded.

## 1. Outcome

Galerina may execute only one root package aggregate or phase-close for a
checkout at a time. Every package test-file runner has an explicit concurrency
ceiling. A quiet JSON child is not classified as healthy merely because it has
not emitted a failure, and a timeout must target the owned process tree rather
than only the immediate shell.

The control is development tooling, not production authority. It nevertheless
follows the same fail-closed rule: an unknown owner, malformed lock, unsupported
platform cleanup path, timeout, or unexplained live child refuses the run.

## 2. Incident evidence

- `run-all-tests.cjs` runs packages sequentially but waits only for the direct
  `cmd/npm` child.
- Node's default test isolation creates a child process per test file and, on
  the current 16-thread host, defaults to 15 concurrent files.
- The core compiler command admits 310 test files.
- None of the 98 package test scripts declares `--test-concurrency`.
- `.claude/settings.json` starts the full phase-close at every Stop event while
  the same command remains manually invocable.
- Neither root runner has a cross-session lock, descendant census, or explicit
  whole-tree timeout cleanup.

The restart destroyed the process tree needed to prove which invocations
overlapped. The design therefore fixes the verified control gaps without
claiming an exact historical trigger.

## 3. Selected architecture

### 3.1 Explicit full closes

Claude Stop hooks must never start the full phase-close. The Stop hook runs a
bounded status heartbeat only. Full `phase-close` and `exhaustive` runs remain
explicit commands so their owner, start, and completion can be observed.

### 3.2 One fail-closed suite lease

`run-phase-close.mjs` and standalone `run-all-tests.cjs` share one checkout-
derived lease under the operating-system temporary directory. Acquisition is
an atomic directory creation. The record contains schema, normalized checkout
identity, owner PID, start time, command class, and a random nonce.

Nested `run-all-tests.cjs` is admitted only when the recorded phase-close
owner, inherited nonce, checkout identity and immediate verified supervisor
PID all match. The native Windows warden or POSIX wrapper installs the
supervisor PID into the inherited environment immediately before starting the
target; package children have every lease field removed. Missing, duplicated,
malformed, mismatched, or pre-existing leases refuse. Normal exit removes the
exact lease. A crash-stale lease is not
silently guessed away; recovery requires an explicit inspection/removal
command naming the recorded checkout and owner.

### 3.3 Bounded package test workers

The root runner defaults to at most four Node test-file workers. The bound can
be reduced with `--test-concurrency 1..4` but cannot be raised by environment
variables. For package scripts containing a real `node --test` command, the
runner appends `--test-concurrency=<n>` through npm's argument boundary.
Custom runners such as Myco retain their own command and receive no unknown
flag.

The machine-readable result records the selected ceiling. Human mode prints a
package-start/package-finish heartbeat. JSON mode keeps stdout canonical and
prints the same progress to stderr.

### 3.4 Owned process-tree termination

The command supervisor starts a process group and retains its direct PID.
Timeout/cancellation first terminates the owned tree while the parent is still
identifiable, waits for bounded acknowledgement, then escalates. Windows uses
an exact tree-targeting adapter; Linux/macOS use a dedicated process group.
Unsupported or failed cleanup returns a distinct failed result. It never
reports the child as closed merely because the direct shell exited.

Windows uses a zero-dependency Rust warden that creates a Job Object with
`KILL_ON_JOB_CLOSE`, creates the target suspended, assigns it before resume,
and monitors both target and owner. Its source, Cargo inputs and generated
binary are bound by a local SHA-256 receipt and any mismatch refuses. POSIX
uses a dedicated process group with bounded TERM/KILL escalation.

## 4. Safety and compatibility rules

- Preserve process-level test isolation; do not use `--test-isolation=none`.
- Never use `--test-force-exit` to conceal an open handle or leaked resource.
- Never infer health from missing output.
- Never run two root suites concurrently for the same checkout.
- The environment cannot increase concurrency or bypass the lease.
- A nested aggregate must prove its exact parent lease; a copied nonce alone
  is insufficient.
- Timeout cleanup failure is a test failure.
- Stop-hook status checks must be bounded and must not call either root runner.
- No package source conversion or package-retirement evidence changes in this
  workstream.

## 5. Verification

Completion requires fresh evidence for:

1. a second same-checkout runner refusing while the first owns the lease;
2. a nested aggregate being admitted only for the exact phase-close parent;
3. malformed, copied, stale, and wrong-checkout lease records refusing;
4. every `node --test` package receiving a ceiling no greater than four;
5. custom runners receiving no Node-only flag;
6. JSON stdout remaining parseable while progress appears on stderr;
7. a deliberate descendant surviving direct-parent exit being detected or
   terminated by the platform adapter;
8. timeout killing the complete owned fixture tree;
9. the Stop hook performing no full-suite invocation; and
10. focused runner tests passing before one explicitly observed contained
    phase-close is allowed.

## 6. Deferred authority

This change bounds the current Node bootstrap tooling. It does not convert a
package to `.fungi`, release SLIDE authority, replace production process
containment, prove operating-system durability, or make any external evidence
green.
