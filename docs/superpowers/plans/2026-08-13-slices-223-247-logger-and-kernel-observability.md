# Slices 223-247 Logger and Kernel Observability Plan

**Goal:** Account for the active logger and kernel-observability graph without
inventing Fungi state/effect authority, then publish one governed receipt per
symbol and defer aggregate maintenance until Slice 247.

**Architecture:** Three read-only evidence workers partition the symbol set;
the primary agent independently checks source, hostile probes and focused
tests, remains the sole writer, and admits only source-conserving outcomes.

## Constraints

- Local commits only; never push.
- No placeholder Fungi.
- New Fungi may not contain `null`, `NaN`, `else if`, `throw`, `try/catch`,
  `for` or `loop`; iteration requires a proved bounded Boolean `while`.
- Immutable record/array transport does not authorize active object identity,
  retained callbacks, mutable aliases, clocks, sinks or audit leases.
- Run only focused package/type checks for these slices. Crash-linked full
  tooling, normal phase-close, `graph-all` and monolithic memory evaluation
  remain excluded; repository-wide closure stays `UNKNOWN`.

## Task 1: Slices 223-230 logger ingress and construction

- [x] Account `LogSink`, `MemoryLogSink`, `JsonLineSink`, `LoggerOptions` and
  `Logger.constructor` against exact alias, callback, JSON and capability
  semantics.
- [x] Reproduce the live-array alias, direct writer failure, invalid-level
  fail-open and retained base-field behaviors.

## Task 2: Slices 231-238 logger execution

- [x] Account the four level wrappers, child derivation, failure observation,
  complete emit transaction and clock normalization.
- [x] Reproduce nested-secret leakage and the mixed-purpose failure counter.

## Task 3: Slices 239-247 record, JSON and kernel integration

- [x] Account redaction, level mapping, serialization, logger construction,
  audit adaptation, instrumentation and request recording.
- [x] Reproduce dynamic `__proto__` hazards, non-string JSON output and the
  lossy authority-bearing metrics audit adapter.
- [x] Classify `instrumentDispatch` as `ASYNC_HAPPY_PATH` with a mandatory
  serialized metrics-state sub-edge, not as parallel-pure.

## Task 4: Verify, update skills and publish

- [x] Pass observability 36/36, focused logger/kernel 17/17 and typecheck.
- [x] Update both private skills with reusable prototype-safe record and JSON
  wire discriminators; verify, forward-test and commit them locally without a
  push.
- [x] Publish 25 governed receipts, update the live register, TODO and roadmap,
  and pass receipt/leak/freshness checks.
- [ ] At the Slice 247 maintenance boundary, run registered owners individually,
  commit their exact outputs, refresh Myco once, and keep unavailable exact
  codebase-memory freshness `UNKNOWN`.
