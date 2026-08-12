# Complete SLIDE Benchmark Suite Design

## Purpose

Produce a complete, work-equivalent Galerina/SLIDE reference benchmark for all
18 comparable benchmark groups without relabelling reference evidence as
production authority. The finished report uses Galerina/SLIDE as the zero
baseline, shows signed peer deltas only for matched work and units, retains the
historic Galerina/WASM evidence separately, and states the winner and Galerina
place for every admitted group.

## Binding decision

The benchmark suite will expand the existing independently re-admitted
`slideReference` lane. It will not manufacture a production `slide` lane.
Every admitted SLIDE result remains K3 `0`, `referenceOnly: true`, and
`authorityReleased: false`. Production coverage remains `0/18` until the
separate release, signing, durability, platform and authority gates admit it.

The following shortcuts are prohibited:

- renaming WASM, the Galerina tree-walker, bytecode, manifest or passive lanes;
- embedding or calling the TypeScript/Node implementation from the SLIDE lane;
- accepting matching output when the work count, allocation shape, unit or
  checksum is different;
- converting a compiler refusal into a zero, estimate or previous result;
- widening compiler or execution limits solely to make a benchmark pass.

## Complete population

The expected population is the 18 unit-aligned groups in the current full
benchmark record:

| Cohort | Workloads | Required SLIDE capability |
|---|---|---|
| Scalar bounded compute | `compute-mix`, `collection-pipeline`, `low-memory`, `gpu-compute`, `matrix-multiply`, `tri-logic`, `data-query`, `call-chain`, `nbody`, `mandelbrot`, `spectral-norm` | Composable checked integer arithmetic, bounded Boolean `while`, nested loops, calls and exact overflow/refusal handling |
| Bounded recursion | `tower-of-hanoi`, `binary-trees` | Proved recursion depth/work budget and independent execution accounting |
| Text and arrays | `json-parse` | Immutable String split/length plus exact `Array`/`Option` access on one composable registry profile |
| Record allocation | `record-allocation` | Real admitted record construction per iteration; scalar-local substitution is excluded |
| Existing verified operation | `verified-native-operation` | Preserve the existing one-million-read publication and admission contract |
| Governed package boundaries | `spore-container`, `framework-pipeline` | Exact component-specific `.fungi` source, closed host/crypto or pipeline contracts, and independently re-admitted package execution |

The current `record-allocation` and `binary-trees` scalar/count-only forms do
not automatically qualify. `record-allocation` must allocate the same record
shape. `binary-trees` must allocate and traverse the same recursive tree shape
or remain explicitly excluded from an allocation/GC comparison. The fused
`collection-pipeline` is admissible only as an explicitly identified
optimization because it preserves semantic work but intentionally avoids the
peer implementations' intermediate allocations.

## Architecture

### 1. Closed benchmark manifest

A checked manifest owns the 18 expected benchmark identities, source path,
entry flow, metric class, canonical unit, exact work count, checksum rule,
execution profile and comparison policy. Publication refuses missing,
duplicate, surplus or reordered identities. A source digest and SLIDE artifact
digest bind each observation.

### 2. Composable checked-Fungi lowering

SLIDE will select capabilities from the complete lowered module rather than
choosing one mutually exclusive registry by precedence. The compiler derives a
canonical registry-set identity, refuses unsupported combinations, and emits a
reference-only `.slide` bundle. Each new capability combination begins with a
RED compiler test, then a GREEN positive vector and mutation/refusal vectors.

Compiler support will be added in the smallest dependency order:

1. bounded scalar loops, calls and checked arithmetic in one registry set;
2. nested bounded loops and wider function/block sets;
3. bounded recursion with explicit depth and execution budgets;
4. immutable text/array/Option operations composed with loops and calls;
5. real record construction and access;
6. component-specific package/host contracts.

### 3. Benchmark-owned SLIDE runners

Every benchmark directory owns a `bench-slide-reference.mjs` adapter or a
manifest-driven equivalent. The adapter can only invoke the registered SLIDE
compiler, independent admission and VOK executor. It returns the canonical
result, work count, elapsed time, throughput unit, artifact identities and
non-authorizing flags. It cannot receive an arbitrary callable or ambient
filesystem path.

### 4. Admission and comparison

Galerina verifies the exact observation bytes and recomputes work equivalence,
unit compatibility, checksum and signed delta. A row is admitted only when:

- the benchmark identity occurs exactly once in the closed manifest;
- the source, compiler, GIR, `.slide`, admission and execution digests match;
- the executed entry flow and parameter vector match the benchmark contract;
- the result/checksum and exact work count match an independent peer oracle;
- throughput is positive and finite and the unit is the canonical unit;
- `referenceOnly` is true and `authorityReleased` is false.

Any failure produces a named refusal and leaves the row visibly unmeasured.

### 5. Reports

The primary chart is workload-grouped and uses Galerina/SLIDE reference as
exactly zero. Faster peers are positive; slower peers are negative. Rust,
Rust-AVX2, Node.js, Python and Go appear only where that exact runtime completed
the same workload. Each group states its winner and Galerina place.

The second page retains historical Galerina/WASM at zero per archived workload.
It never pairs a SLIDE workload with a different historical workload and never
fills missing historic observations. Both pages are date-stamped evidence,
self-contained, script-free, responsive and Roboto-first.

## Error and authority behaviour

Every boundary fails closed. Missing sources, unknown constructs, non-finite
timings, mismatched checksums, incomplete work, budget exhaustion, altered
artifacts, duplicate identities and unsupported host operations return a typed
refusal. No global logger, thrown exception, fallback runtime or previous
result creates an admitted benchmark row.

## Verification and finish gate

The benchmark is finished only when all of the following are current:

1. the closed manifest accounts for exactly 18 groups;
2. all 18 have exact governed sources or an already bound checked source;
3. all 18 strict-check with zero candidate-specific diagnostics;
4. all 18 produce physical `.slide` bundles and pass independent re-admission;
5. positive, boundary, malformed, mutation, budget and authority-refusal tests pass;
6. every SLIDE result matches the independent checksum and work-count oracle;
7. the reference chart reports 18/18, with SLIDE zero and derived peer signs;
8. the historic WASM page retains its exact archived JSON and digest references;
9. the benchmark truth, freshness, publication, path-leak and roadmap-owner checks pass;
10. the skills are reviewed and either updated from reusable evidence or the close report records `NO_SKILL_UPDATE`.

This finish gate proves the complete reference benchmark suite only. It does
not prove production SLIDE authority, application conversion, release signing,
durability, general Fungi coverage or TypeScript retirement.
