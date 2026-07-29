# CTLL R1 Compiler-Owned Adapter

- **Date:** 2026-07-29
- **Branch:** `codex/ctll-v2-architecture`
- **Scope:** the owner-confirmed `ctll_k3_checked_add_v1` fixture only
- **Result at this checkpoint:** exact compiler-owned internal GIR can be
  converted into a closed logical R1 program

## Implemented boundary

`buildFlowTable` now appends compiler-derived qualifier, ordered parameter
types, return type, and declared effects to its existing runtime-stable
`FlowEntry` fields. The new
`src/self-hosted/ctll-r1-adapter.fungi` consumes that entry and:

1. validates the exact fixture identity, signature, empty effect set, and one
   complete body;
2. validates one `check_k3` with exactly one DENY, INDETERMINATE, and ALLOW
   successor;
3. validates exact terminal `Err` arms and exact
   `Ok(int32.add.checked(left,right))` source-GIR shape;
4. derives every `CTLLR1PreflightRequest` field rather than accepting support
   booleans from a caller;
5. invokes the existing `.fungi` preflight kernel;
6. materializes a closed four-block logical R1 program only on K3 `ALLOW`.

The materialized model declares three typed failure identities, the safe-value
memory profile, one K3 obligation, ordered Int32/Int32/Verdict parameters, and
explicit terminators. A refusal returns an empty non-program with
`materialized=false`; no identity/default body is emitted.

## Fail-closed evidence

The adapter refuses:

- wrong fixture, qualifier, parameter/result type, or parameter name;
- missing, duplicate, extra, or relabelled K3 successors;
- hidden data in a K3 statement shell;
- unchecked/different arithmetic;
- a negative arm that does not return a typed refusal;
- surplus derived type facts;
- effects, host-handle-shaped/unsupported bodies, and incomplete failures.

The adapter input type has no AST field, so `hasAstDependency=false` is a
property of this bounded compiler seam rather than a caller assertion.
Nevertheless, the compiler remains an evidence producer, not admission
authority; independent validation is still required.

## What was not implemented at this checkpoint

- deterministic CBOR;
- semantic digest computation;
- registered numeric IDs;
- bounded byte import or canonicality validation;
- fresh-process reference execution;
- independent decoder/validator;
- serialized mutation artifacts;
- a `.slide` bundle, signature, admission, native code, or benchmark.

At this checkpoint the logical program used frozen operation strings. The
subsequent typed-ID checkpoint replaced them; they are not in the current wire
format.

## Subsequent boundary

Canonical body export and independent exact-vector validation were implemented
after this adapter checkpoint. See
`ctll-r1-canonical-body-2026-07-29.md`. It now includes registered typed IDs
and an independent structural importer. Detached execution remains open.

## Verification

```text
node --test tests/ctll-r1-adapter.test.mjs
  PASS: 13 tests

node --test \
  tests/ctll-r1-preflight.test.mjs \
  tests/ctll-r1-adapter.test.mjs \
  tests/ctll-r1-selfhost-k3.test.mjs \
  tests/self-hosted-gir-body.test.mjs \
  tests/self-hosted-runtime.test.mjs \
  tests/self-hosted-bootstrap.test.mjs
  PASS: 118 tests

npm.cmd test
  PASS: typecheck, build, 5,270 tests
```

The next step recorded here was completed by the canonical-body checkpoint.
Neither report claims a signed payload, structural general importer, or
detached executable authority.
