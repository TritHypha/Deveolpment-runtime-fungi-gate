# SLIDE prepared executor benchmark

**Date:** 2026-07-31
**Status:** verified bounded development evidence
**Authority released:** no

## Outcome

Independent SLIDE now measures the difference between:

1. `slideClean`: canonical CBOR decode, complete V2-D semantic validation and
   instruction-driven execution for every input; and
2. `slidePrepared`: the same exact bytes admitted once into a deeply immutable
   process-local execution plan, followed by fresh checked execution for every
   input.

The measured median throughput is:

| Lane | Median duration for 2,048 operations | Median throughput | Median absolute deviation |
|---|---:|---:|---:|
| Clean decode + validate + execute | 253,146,600 ns | 8,090.17 ops/s | 3,326,300 ns (1.31%) |
| Prepared immutable plan | 12,039,700 ns | 170,103.91 ops/s | 226,700 ns (1.88%) |

For this exact workload, prepared median throughput is **21.03x** the clean
path.

## Work-equivalence contract

Every operation executes the admitted V2-D guarded-memory graph once. The
seeded sequence includes successful indices `0`, `1`, and `2`, ordinary bounds
failures, and both Int32 extremes. Both lanes fold the following fields into
the same independent 64-bit checksum:

- terminal status and returned value;
- registered failure identity;
- step and copied-byte accounting;
- aggregate depth and semantic-memory bytes;
- guard checks and guarded observations; and
- native-certificate and authority flags.

All 18 measured lane checksums equal `0cd6050fb325796b`. The input sequence
digest is
`23eb319ea8d1d7f5785409bab50da3a3fdf86c419024a0a28a36323b4aaa59cb`.
The body and semantic digests remain the frozen V2-D identities.

## Provenance

- SLIDE commit: `573670b98a599681248f59d113aac2c38c297f2a`, clean
- Galerina commit: `745ff5beb3dacf9ae89ff35927d225fa77fe3837`, clean
- operating system: Windows `10.0.19045`, x64
- processor: Intel Core i9-9900K at 3.60 GHz
- bootstrap runtime: Node `v24.18.0`
- warmups: 2
- measured samples: 9 per lane
- operations per sample: 2,048
- seed: `1511506913`

Raw evidence and the deterministic SVG live under
`../SLIDE/build/benchmarks/`.

Post-documentation verification is independent SLIDE **47/47**, exact
15-file contract integrity, benchmark verification and deterministic chart
regeneration. Galerina strict phase-close passes every blocking gate; its
stale-report/catalog audit is green.

## Security properties

- canonical bytes receive complete existing V2-D admission before preparation;
- the plan is deeply immutable and carries no per-call input or runtime state;
- a module-private `WeakSet` rejects plain copies, structured clones, proxies,
  deserialization and plans from another module instance;
- every invocation creates a new SSA store, array, guard state, variant and
  accounting record;
- exact Int32 and caller resource budgets are checked for every call;
- guard success precedes observation;
- unknown opcodes, insufficient budgets and unregistered failures refuse;
- every result is frozen and carries neither the plan nor a mutable aggregate;
- benchmark publication independently recomputes inputs, checksum, statistics
  and provenance and preserves prior bytes after candidate refusal; and
- chart generation refuses unverified results.

## Zero-trust score

| Property | Score | Reason |
|---|---:|---|
| Input and semantic admission | 10/10 | Exact canonical body plus complete frozen V2-D validator |
| Prepared-plan anti-forgery | 9/10 | Deep freeze and same-module brand; not yet a portable cryptographic receipt |
| Per-call isolation and cleanup | 9/10 | Fresh flow-local state and no returned references; JavaScript garbage collection remains the bootstrap host |
| Resource determinism | 10/10 | Exact ceilings and terminal accounting are checked every call |
| Benchmark integrity | 9/10 | Exact workload/checksum/provenance and mutation tests; one local host only |
| Production authority safety | 10/10 | Structurally releases none and makes explicit non-claims |

**Weighted decision:** **9.5/10 — ADOPT as bounded development evidence.**

The score does not authorize production deployment. Cryptographic portable
plan receipts, general frontend profiles, post-optimization re-verification,
final-artifact binding, isolated broker execution and platform matrices remain
required.

## Interpretation

The result supports the engineering hypothesis behind deterministic shape
memory: avoiding repeated decode and semantic-validation work can materially
reduce compute for an already admitted fixed graph while variable inputs still
take the checked execution path.

It does not measure a neural engine, L1/L2 residency, native AOT output,
Wasm/Rust/Python, a general Galerina program, database I/O, concurrency or
production isolation. It must not be extrapolated to those surfaces.

## Next gate

Widen the independent frontend and executor only through explicit
registry/profile additions with positive, negative, mutation, resource and
second-frontend evidence. The terminal cross-runtime benchmark remains blocked
until equivalent Wasm/Rust/Python/SLIDE workloads exist and the package
retirement/fixed-point programme is complete.
