# Data-pipeline block-saturation timeout design

**Date:** 2026-08-01

**Status:** approved by the owner's full-auto zero-trust mandate and the live
`docs/TODO.md` contract delta

**Authority released:** no

## Problem

`BackpressurePolicy` bounds queue occupancy with `maxInFlight`, but the
`block` saturation arm can wait indefinitely. The whole-pipeline timeout is
not an equivalent bound: it has different scope, may be much larger, and does
not state how one saturated stage terminates. An omitted local bound therefore
turns deliberate backpressure into an unbounded denial-of-service state.

## Decision

Use one discriminated TypeScript policy:

```ts
export type BackpressurePolicy =
  | {
      readonly maxInFlight: number;
      readonly onSaturation: "block";
      readonly blockTimeoutMs: number;
    }
  | {
      readonly maxInFlight: number;
      readonly onSaturation: "shed_oldest" | "fail";
      readonly blockTimeoutMs?: never;
    };
```

The runtime validator remains authoritative for JavaScript and decoded data.
It requires `blockTimeoutMs` to be a positive safe integer when
`onSaturation` is `block`. It refuses the field on non-blocking arms so dead
configuration cannot create a false timeout claim. An unknown saturation mode
continues to refuse independently and does not acquire meaning from a timeout.

## Diagnostics

- `Galerina_DATA_PIPELINE_BLOCK_TIMEOUT_REQUIRED` — `block` lacks a positive
  safe-integer timeout.
- `Galerina_DATA_PIPELINE_BLOCK_TIMEOUT_UNEXPECTED` — `fail` or `shed_oldest`
  carries a field that cannot affect that arm.

Both diagnostics are errors and carry the exact
`<path>.blockTimeoutMs` location. Existing max-in-flight and unknown-mode
diagnostics remain unchanged and may coexist when more than one independent
field is invalid.

## Compatibility and developer experience

This is a deliberate source-contract break for the unsafe `block` shape. The
package has no external in-repository consumers; its examples and tests are
the complete local migration surface. `fail` and `shed_oldest` remain concise.
The field name exposes unit and purpose directly and does not borrow implicit
state from `PipelineBudgets.timeoutMs`.

## Verification

Test-first coverage must prove:

1. a bounded `block` policy passes;
2. missing, zero, negative, fractional, `NaN`, infinite and unsafe-integer
   block timeouts refuse;
3. timeout fields on `fail` and `shed_oldest` refuse;
4. unknown saturation mode still reports the unknown-mode diagnostic;
5. a complete pipeline with bounded block stages passes; and
6. the package, workspace graphs, generated contracts and phase-close gates
   remain green.

This change validates a policy contract only. It does not claim that every
runtime scheduler already enforces the timeout, and it grants no production
or package-retirement authority.
