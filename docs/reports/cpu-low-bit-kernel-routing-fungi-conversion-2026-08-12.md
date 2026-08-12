# CPU low-bit kernel routing Fungi conversion

## Result

The CPU-kernel package's exported `requiresLowBitKernel` decision now has one
package-owned Fungi translation and independent physical SLIDE/VOK evidence.
The translation is reference-only: TypeScript remains the executing validator
and no consumer has switched.

## Exact source custody

| Artifact | SHA-256 |
|---|---|
| `packages-galerina/galerina-cpu-kernels/src/index.ts` | `2a4d5069f3e5a9143a30ab0a96e391ea68e5fd2c6486af0c386c173ad13ccc7d` |
| `packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi` | `dba10804d96756dfd50c80549133db182d99cff738e211b01c194e17eadf267c` |

The RED proof is committed at `d4aa717a`, the Fungi implementation at
`4935f6f6`, and the physical proof at `f98ee73a`. Independent SLIDE remains
pinned at `6de4d91`.

## Semantic proof

The admitted flow receives only the source function's two observed fields:
`inputType` and `operation`. It returns true exactly for `i2_s`, `ternary`,
`ternary_matmul`, or `low_bit_decode`. Every one of the 42 declared pairs
agrees across the exported TypeScript function, interpreted Fungi, and signed
Wasm. Eight hostile String pairs return false on every surface, preserving the
JavaScript predicate without granting low-bit status to an unknown label.

The candidate-specific proof passes **2/2**. Independent SLIDE publishes and
re-admits one physical `.slide`, then verifies all 50 declared-plus-hostile
vectors through typed VOK Bool receipts (**1/1**, zero skips). Wrong argument
counts and types, invalid Unicode, inadequate work, source mutation, receipt
fields, every safe-value envelope byte, and artifact mutation all refuse.
Every successful receipt records `authorityReleased: false`.

The proof pins the pre-existing registry
`slide.registry.executable-gir.v2c-bounded-wide-control-flow.v1` with digest
`d805dae4b822392e5092126ce4f0fb27e8bfa6aa2de8862ee88e09e23eed43cc`.
No registry or execution limit changed.

## Language constraints

The Fungi source contains no null, NaN, `else`, `else if`, exception syntax,
`for`, `while`, or `loop`. It uses four terminal Boolean checks and one
explicit false exit. It invents no syntax and adds no effect or authority.

## Closure and authority boundary

CPU kernels pass **5/5 across two suites**. The compiler passes
**6,382/6,382 across 1,259 suites** with zero failures or skips. The monitored
canonical owner completed with exit code 0: **100/100 packages and 9,606 tests
in 287 seconds**. Golden remains current at **11/11 checked examples and 11/11
execution vectors**. Retirement derives **1,448** executable-family paths and
**132** source Fungi assets.

The package, project, KB, Fungi inventory and semantic owners were refreshed
or checked individually. Project integrity is **9,325 nodes / 9,555 edges**
with zero dangling edges, duplicate IDs, dependency cycles, or violations; the
semantic graph records **938** tests. These are generated navigation and
assurance evidence, not production authority.

`requiresLowBitKernel`, `validateCpuKernelPlan`, report generation, TypeScript,
and every consumer remain active. This slice grants no consumer switch,
TypeScript retirement, bootstrap fixpoint, signing, release, production,
durability, or general source-family authority. Crash-linked full tooling,
normal phase-close, graph-all, and monolithic memory evaluation remain
excluded, so repository-wide closure is `UNKNOWN`.
