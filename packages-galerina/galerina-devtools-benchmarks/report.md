# Galerina Benchmark Report

## Key

**Traffic lights** (🚦) compare each runtime to **Node.js** (the production baseline):

| Light | Meaning | Speed vs Node.js |
|---|---|---|
| 🟢 | Green — fast | At or faster than Node.js (within 10%, or quicker) |
| ⚪ | White — comparable | Within 2× of Node.js |
| 🟡 | Yellow — a little slower | 2–10× slower than Node.js |
| 🔴 | Red — much slower | 10–100× slower than Node.js |
| ⚫ | Black — terrible | 100×+ slower than Node.js |

**Medals** (🥇🥈🥉) rank runtimes by throughput within each benchmark — fastest first.

**Runtimes:**
- **Rust (generic / AVX2)** — native compiled baseline (ceiling).
- **Node.js** — V8 JIT (production baseline for traffic lights).
- **Python** — CPython interpreter (comparison floor).
- **WASM ▶ production** — `galerina run` → WAT → WebAssembly. Governance gates compiled IN. **This is the production governed runtime** — the row to read for shipping cost.

> **Taxonomy — read this before the governance numbers.** The three `⟨interp⟩` rows below are **Stage-A interpreter diagnostic tiers**, NOT the production path. They exist to (a) *measure* the cost of pre-planning vs runtime proving, and (b) *verify* the WASM compiler against the reference interpreter. Do not read the interpreter's governed throughput as the shipping governance cost — read the **WASM ▶ production** row for that.
- **Galerina governed ⟨interp⟩** — Stage-A: full governance tree-walker (capabilities + audit + proof rebuilt per call). *Diagnostic worst-case.*
- **Galerina manifest ⟨interp⟩** — Stage-A: pre-verified runtime manifest, governance erased at runtime. *Diagnostic.*
- **Galerina passive ⟨interp⟩** — Stage-A: pre-compiled deployment model with LRU result cache (warm path). *Diagnostic.*

---

## 1. Per-Metric Scoreboards

> Categories: 15 certified · 3 shape-only(→Memory) · 1 internal-ratio(Governance) · 11 uncertified — a cross-runtime ratio is shown only for work-equivalence-certified lanes.

### CPU Throughput — inner-ops/s (cross-runtime; certified lanes only)

> 🚦 **vs Rust / vs Node** compare the **WASM ▶ production** lane to native. A traffic-light ratio
> appears ONLY for work-equivalence-certified benchmarks; `UNCERTIFIED` lanes show raw throughput and
> NO ratio (their N/work is not yet proven equivalent across runtimes).

| Benchmark | WASM ▶ production | vs Rust | vs Node | Galerina governed ⟨interp⟩ | Implication |
|---|---|---|---|---|---|
| compute-mix | 78.36M/s | ⚪ 1.7× slower | ⚪ 1.7× slower | 1.67M/s | WASM near native |
| arithmetic-threshold | 485.52M/s | UNCERTIFIED | UNCERTIFIED | 5.38M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.81M/s | UNCERTIFIED | UNCERTIFIED | 45.8K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.4K/s | UNCERTIFIED | UNCERTIFIED | 14.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 122.81M/s | 🟡 2.1× slower | 🟢 1.1× | 85.1K/s | WASM usable |
| hardware-targets | 39.14M/s | UNCERTIFIED | UNCERTIFIED | 4.3K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 443.82M/s | 🟡 3.4× slower | ⚪ 1.4× slower | 644.8K/s | WASM usable |
| tri-logic | 473.69M/s | 🟡 3.0× slower | 🟡 2.1× slower | 298.7K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 213.8K/s | WASM not built for this lane yet |
| call-chain | 55.45M/s | — | 🟡 5.7× slower | 48.1K/s | WASM 2–10× under Node |
| nbody | 29.45M/s | — | 🟡 4.2× slower | 57.3K/s | WASM 2–10× under Node |
| mandelbrot | 8.93M/s | 🟡 2.6× slower | 🟢 1.3× | 7.2K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Rust (generic) — 2.41B/s on verified-native-operation.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | 2 B/op | ~0 | ~0 | 6 B/op | 9 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 37 B/op | 38 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 8 B/op | 12 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.19B/s | 475.35M/s | 3.99M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.60B/s | 443.82M/s | 1.60B/s | ⚪ 1.4× slower | real GPU dispatch wins |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (220.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 220.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (926.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 926.0/s |
| json-parse | records/s | **Node.js** (3.13M/s) | 3.13M/s | 441.0K/s | not run — no native impl | no WASM — strings/records | 5.6K/s |
| spore-container | containers/s | **Rust (generic)** (151.1K/s) | 46.8K/s | 66.7K/s | 151.1K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (405.8K/s) | 405.8K/s | 122.0K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.4K/s) | 3.4K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.7K/s) | 6.7K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (17.7K/s) | 17.7K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (107.8K/s) | 107.8K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (743.0/s) | 743.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 804.0/s | 884.0/s | 2.89M/s | 0.91× governed/manifest (gov overhead ≈ 1.10×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **131.02M/s** | **133.47M/s** | not run — no C++ impl | **136.42M/s** | 782.7K/s | 2.06M/s | 1.79M/s | 1.67M/s | 78.36M/s | not run — no GPU path | 81.8× |
| arithmetic-threshold | not run — no AVX-512 | **1.59B/s** | **1.59B/s** | not run — no C++ impl | 969.69M/s | 3.97M/s | 23.3K/s | 5.35M/s | 5.38M/s | 485.52M/s | not run — no GPU path | 180.3× |
| six-digit-guess | not run — no AVX-512 | **76.91M/s** | **79.74M/s** | not run — no C++ impl | 2.68M/s | 81.3K/s | 25.5K/s | 45.3K/s | 45.8K/s | 36.81M/s | not run — no GPU path | 58.4× |
| record-allocation | not run — no AVX-512 | **1.18B/s** | **1.17B/s** | not run — no C++ impl | 57.67M/s | 3.80M/s | 8.07M/s | 2.57M/s | 2.48M/s | 556.87M/s | not run — no GPU path | 23.3× |
| fibonacci-recursive | not run — no AVX-512 | 505.1/s | 502.0/s | not run — no C++ impl | 128.5/s | 5.5/s | **68.7K/s** | 17.0/s | 14.0/s | 17.4K/s | not run — no GPU path | 9.18× |
| tower-of-hanoi | not run — no AVX-512 | **254.64M/s** | **254.80M/s** | not run — no C++ impl | 107.72M/s | 3.23M/s | 85.2K/s | 83.6K/s | 85.1K/s | 122.81M/s | not run — no GPU path | 1.3K× |
| collection-pipeline | not run — no AVX-512 | **13.29B/s** | 4.12B/s | not run — no C++ impl | 72.00M/s | 9.87M/s | 8.45M/s | 2.23M/s | 2.18M/s | 425.52M/s | not run — no GPU path | 33.0× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.19M/s | 1.19M/s | not run — no C++ impl | 909.3K/s | not run | 90.7K/s | 4.8K/s | 4.3K/s | **39.14M/s** | not run — no GPU path | 209.1× |
| low-memory | not run — no AVX-512 | **5.90B/s** | 1.32B/s | not run — no C++ impl | 717.16M/s | 3.32M/s | 157.5K/s | 111.1K/s | 135.6K/s | 475.76M/s | not run — no GPU path | 5.3K× |
| gpu-compute | not run — no AVX-512 | **1.19B/s** | **1.19B/s** | not run — no C++ impl | 994.41M/s | 5.78M/s | 361.0K/s | 318.2K/s | 314.4K/s | 475.35M/s | 3.99M/s | 3.2K× |
| matrix-multiply | not run — no AVX-512 | 1.44B/s | 1.52B/s | not run — no C++ impl | 606.03M/s | 7.68M/s | 841.5K/s | 632.7K/s | 644.8K/s | 443.82M/s | **1.60B/s** | 939.9× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.4K/s** | 2.0K/s | 220.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **69.7K/s** | 2.4K/s | 926.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.40B/s** | **1.40B/s** | not run — no C++ impl | 1.00B/s | 7.06M/s | 315.0K/s | 296.8K/s | 298.7K/s | 473.69M/s | not run — no GPU path | 3.3K× |
| verified-native-operation | not run — no AVX-512 | **2.41B/s** | **2.41B/s** | not run — no C++ impl | 2.03B/s | 9.87M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **380.50M/s** | 4.04M/s | 259.2K/s | 234.2K/s | 213.8K/s | no WASM build | not run — no GPU path | 1.8K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **318.22M/s** | 1.44M/s | 52.0K/s | 47.2K/s | 48.1K/s | 55.45M/s | not run — no GPU path | 6.6K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.24M/s** | 1.45M/s | 56.4K/s | 55.5K/s | 57.3K/s | 29.45M/s | not run — no GPU path | 2.1K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.13M/s** | 441.0K/s | 9.6K/s | 4.9K/s | 5.6K/s | no WASM — strings/records | not run — no GPU path | 561.7× |
| mandelbrot | not run — no AVX-512 | **23.52M/s** | **23.65M/s** | not run — no C++ impl | 6.88M/s | 142.1K/s | 7.2K/s | 7.5K/s | 7.2K/s | 8.93M/s | not run — no GPU path | 953.8× |
| spectral-norm | not run — no AVX-512 | **378.78M/s** | **379.14M/s** | not run — no C++ impl | 238.30M/s | 1.66M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 20.58M/s | 15.42M/s | not run — no C++ impl | 78.96M/s | 3.01M/s | 377.7K/s | 341.3K/s | 332.3K/s | **594.25M/s** | not run — no GPU path | 237.6× |
| spore-container | not run — no AVX-512 | 142.9K/s | **151.1K/s** | not run — no C++ impl | 46.8K/s | 66.7K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **405.8K/s** | 122.0K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| http-throughput | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| naming-check | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| context-receipt | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| intelligence-search | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| provenance-trace | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |

> †`Node/Galerina > 1` = Node.js faster (the usual case for the Stage-A tree-walker). `< 1` = Galerina faster.
> †fibonacci: Galerina=fib(20), others=fib(30) — different workload depth.
> ⚠️ rows are excluded — their workloads are not unit-aligned across runtimes (see §1.6).
> **Bold** = winner (within 5% of fastest). 🖥️ CPU = CPU execution. 🎮 GPU = Deno WebGPU (NVIDIA GeForce RTX 2060).

## 1.6 Unit Alignment Check

> Throughput is only meaningful when every runtime measures the **same unit**. This
> table is the report-side view of the `assertBenchmarkUnits` guard in `throughput-units.mjs`.

| Benchmark | Status | Unit | Notes |
|---|---|---|---|
| compute-mix | ✅ aligned | mix-ops/s | all runtimes normalised to one unit |
| arithmetic-threshold | — legacy | per-call | not centrally normalised (out of scope) |
| six-digit-guess | — legacy | per-call | not centrally normalised (out of scope) |
| record-allocation | ✅ aligned | records/s | all runtimes normalised to one unit |
| fibonacci-recursive | — legacy | per-call | not centrally normalised (out of scope) |
| tower-of-hanoi | ✅ aligned | moves/s | all runtimes normalised to one unit |
| collection-pipeline | ✅ aligned | elements/s | all runtimes normalised to one unit |
| governance-cost | ⚠️ excluded | gov-factor | internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design |
| hardware-targets | — legacy | per-call | not centrally normalised (out of scope) |
| low-memory | ✅ aligned | items/s | all runtimes normalised to one unit |
| gpu-compute | ✅ aligned | kernel-evals/s | all runtimes normalised to one unit |
| matrix-multiply | ✅ aligned | mul-adds/s | all runtimes normalised to one unit |
| crypto-ops | — legacy | per-call | not centrally normalised (out of scope) |
| text-html | — legacy | per-call | not centrally normalised (out of scope) |
| tri-logic | ✅ aligned | trit-ops/s | all runtimes normalised to one unit |
| verified-native-operation | ✅ aligned | element-reads/s | all runtimes normalised to one unit |
| data-query | ✅ aligned | record-scans/s | all runtimes normalised to one unit |
| call-chain | ✅ aligned | chains/s | all runtimes normalised to one unit |
| nbody | ✅ aligned | force-evals/s | all runtimes normalised to one unit |
| json-parse | ✅ aligned | records/s | all runtimes normalised to one unit |
| mandelbrot | ✅ aligned | pixels/s | all runtimes normalised to one unit |
| spectral-norm | ✅ aligned | A-evals/s | all runtimes normalised to one unit |
| binary-trees | ✅ aligned | nodes/s | all runtimes normalised to one unit |
| spore-container | ✅ aligned | containers/s | all runtimes normalised to one unit |
| framework-pipeline | ✅ aligned | requests/s | all runtimes normalised to one unit |
| http-throughput | — legacy | per-call | not centrally normalised (out of scope) |
| naming-check | — legacy | per-call | not centrally normalised (out of scope) |
| context-receipt | — legacy | per-call | not centrally normalised (out of scope) |
| intelligence-search | — legacy | per-call | not centrally normalised (out of scope) |
| provenance-trace | — legacy | per-call | not centrally normalised (out of scope) |

> **Excluded** benchmarks are dropped from the winner table and the Python-floor check until their
> workloads are realigned across runtimes. Excluding them is what stops false "Galerina wins" on
> mismatched workloads (the same class of bug the unit normalisation fixed for the numeric loops).

## 2. Memory Allocation per Operation (low-memory benchmark)

> **Key metric:** bytes allocated on the JS heap per integer operation.
> WASM and bytecode VM should be near 0. Tree-walker allocates per AST node.

| # | 🚦 | Runtime | Bytes/Op | Throughput | Total Ops | Heap Δ |
|---|---|---|---|---|---|---|
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -37.96 bytes/op ⚡ ~0 — no boxing | 157.5K/s | — | -380KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 5.90B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.32B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 717.16M/s | — | 17KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 475.76M/s | — | 44KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 3.32M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 37 bytes/op ⚠ moderate | 135.6K/s | — | 375KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 38 bytes/op ⚠ moderate | 111.1K/s | — | 375KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 45.2MB | 45.5MB | 5.0MB | 953KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 80.4MB | 80.4MB | 26.8MB | 366KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 76.4MB | 76.4MB | 21.9MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 75.8MB | 75.8MB | 21.6MB | 4.5MB |
| compute-mix | WASM ▶ production | 74.8MB | 74.8MB | 17.4MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 46.1MB | 46.4MB | 4.4MB | 263KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 82.3MB | 82.3MB | 18.6MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 82.0MB | 82.0MB | 18.5MB | 846KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 81.9MB | 81.9MB | 18.5MB | 841KB |
| arithmetic-threshold | WASM ▶ production | 84.6MB | 84.6MB | 18.0MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 50.9MB | 50.9MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 83.9MB | 83.9MB | 20.2MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 83.6MB | 83.6MB | 19.4MB | 1.1MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 83.2MB | 83.2MB | 19.1MB | 1.2MB |
| six-digit-guess | WASM ▶ production | 85.0MB | 85.0MB | 18.2MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 47.3MB | 47.3MB | 4.4MB | 309KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 83.9MB | 83.9MB | 19.1MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 83.8MB | 83.8MB | 18.5MB | 89KB |
| record-allocation | Galerina governed ⟨interp⟩ | 84.7MB | 84.7MB | 18.5MB | 60KB |
| record-allocation | WASM ▶ production | 86.3MB | 86.3MB | 18.8MB | 49KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 45.3MB | 45.3MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 84.5MB | 84.5MB | 20.0MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 84.5MB | 84.5MB | 19.6MB | 890KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 84.1MB | 84.1MB | 19.4MB | 828KB |
| fibonacci-recursive | WASM ▶ production | 86.2MB | 86.2MB | 18.9MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 45.6MB | 45.6MB | 4.1MB | 17KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 89.5MB | 89.5MB | 20.0MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 86.3MB | 86.3MB | 19.4MB | 1.7MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 86.4MB | 86.4MB | 21.5MB | 3.8MB |
| tower-of-hanoi | WASM ▶ production | 86.5MB | 86.5MB | 18.1MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 62.3MB | 62.3MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 89.2MB | 89.2MB | 18.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 89.2MB | 89.2MB | 17.8MB | 143KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 90.1MB | 90.1MB | 17.9MB | 168KB |
| collection-pipeline | WASM ▶ production | 91.8MB | 91.8MB | 18.0MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 45.3MB | 45.3MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 91.3MB | 91.3MB | 18.8MB | 525KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 92.7MB | 92.7MB | 18.4MB | 487KB |
| governance-cost | Galerina governed ⟨interp⟩ | 90.9MB | 90.9MB | 18.4MB | 516KB |
| governance-cost | WASM ▶ production | 91.9MB | 91.9MB | 18.2MB | 51KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 47.3MB | 47.3MB | 4.5MB | 386KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 91.5MB | 91.5MB | 19.1MB | 327KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 89.8MB | 89.8MB | 18.1MB | 82KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 89.6MB | 89.6MB | 18.1MB | 83KB |
| hardware-targets | WASM ▶ production | 92.0MB | 92.0MB | 18.4MB | 80KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 45.6MB | 45.6MB | 4.1MB | 17KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 89.7MB | 89.7MB | 18.5MB | -380KB |
| low-memory | Galerina manifest ⟨interp⟩ | 90.2MB | 90.2MB | 18.5MB | 375KB |
| low-memory | Galerina governed ⟨interp⟩ | 89.9MB | 89.9MB | 18.4MB | 375KB |
| low-memory | WASM ▶ production | 92.2MB | 92.2MB | 18.3MB | 44KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 45.7MB | 45.7MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 90.2MB | 90.2MB | 18.7MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 90.1MB | 90.1MB | 19.4MB | 1.2MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 90.1MB | 90.1MB | 18.6MB | 415KB |
| gpu-compute | WASM ▶ production | 92.6MB | 92.6MB | 18.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 47.3MB | 47.3MB | 5.2MB | 1.1MB |
| matrix-multiply | Python | — | — | 392B | 392B |
| matrix-multiply | Galerina passive ⟨interp⟩ | 90.4MB | 90.4MB | 18.9MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 90.4MB | 90.4MB | 19.4MB | 1.1MB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 90.2MB | 90.2MB | 19.3MB | 1.0MB |
| matrix-multiply | WASM ▶ production | 93.2MB | 93.2MB | 18.5MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 55.9MB | 55.9MB | 7.8MB | 2.3MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 90.4MB | 90.4MB | 18.9MB | -105KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 90.2MB | 90.2MB | 18.6MB | 354KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 90.2MB | 90.2MB | 18.5MB | 332KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 92.6MB | 92.6MB | 19.3MB | -375KB |
| text-html | Galerina manifest ⟨interp⟩ | 90.9MB | 90.9MB | 18.8MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 90.6MB | 90.6MB | 18.9MB | 176KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 337KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 91.0MB | 91.0MB | 21.1MB | 267KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 92.7MB | 92.7MB | 20.9MB | 2.0MB |
| tri-logic | Galerina governed ⟨interp⟩ | 90.6MB | 90.6MB | 19.2MB | 419KB |
| tri-logic | WASM ▶ production | 94.2MB | 94.2MB | 19.3MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 22KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 91.5MB | 91.5MB | 20.0MB | -930KB |
| data-query | Galerina manifest ⟨interp⟩ | 91.3MB | 91.3MB | 19.7MB | 717KB |
| data-query | Galerina governed ⟨interp⟩ | 91.5MB | 91.5MB | 20.0MB | 949KB |
| call-chain | Node.js | 46.2MB | 46.2MB | 4.1MB | 11KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 91.1MB | 91.1MB | 21.1MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 92.0MB | 92.0MB | 22.3MB | 3.3MB |
| call-chain | Galerina governed ⟨interp⟩ | 91.4MB | 91.4MB | 20.6MB | 1.5MB |
| call-chain | WASM ▶ production | 94.4MB | 94.4MB | 19.3MB | 1KB |
| nbody | Node.js | 47.7MB | 47.7MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 93.3MB | 93.3MB | 20.0MB | 236KB |
| nbody | Galerina manifest ⟨interp⟩ | 93.3MB | 93.3MB | 19.6MB | 487KB |
| nbody | Galerina governed ⟨interp⟩ | 91.5MB | 91.5MB | 19.8MB | 673KB |
| nbody | WASM ▶ production | 93.4MB | 93.4MB | 19.3MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 100.5MB | 100.5MB | 21.6MB | 433KB |
| json-parse | Galerina manifest ⟨interp⟩ | 92.7MB | 92.7MB | 20.5MB | 934KB |
| json-parse | Galerina governed ⟨interp⟩ | 100.1MB | 100.1MB | 21.7MB | 2.7MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 47.3MB | 47.3MB | 4.9MB | 797KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 93.1MB | 93.1MB | 23.0MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 93.1MB | 93.1MB | 22.6MB | 3.1MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 95.1MB | 95.1MB | 20.9MB | 1.1MB |
| mandelbrot | WASM ▶ production | 95.2MB | 95.2MB | 20.0MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 47.8MB | 47.8MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 47.5MB | 47.5MB | 4.6MB | 429KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 94.8MB | 94.8MB | 19.8MB | -4.1MB |
| binary-trees | Galerina manifest ⟨interp⟩ | 94.8MB | 94.8MB | 21.2MB | 1.7MB |
| binary-trees | Galerina governed ⟨interp⟩ | 94.6MB | 94.6MB | 20.6MB | 1.1MB |
| binary-trees | WASM ▶ production | 96.0MB | 96.0MB | 19.8MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 63.6MB | 63.6MB | 8.9MB | 1.7MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 73.4MB | 73.4MB | 14.2MB | 7.4MB |
| framework-pipeline | Python | — | — | 2KB | 2KB |
| http-throughput | Node.js | — | — | — | — |
| naming-check | Node.js | — | — | — | — |
| context-receipt | Node.js | — | — | — | — |
| intelligence-search | Node.js | — | — | — | — |
| provenance-trace | Node.js | — | — | — | — |

> **Heap Δ** = heap after minus heap before execution. Negative means GC reclaimed memory during the run.
> **Galerina:** each tree-walker node evaluation allocates a new GalerinaValue object — visible as positive heap delta.

## 3. CPU Efficiency

| Benchmark | Runtime | Wall time | CPU time | CPU utilisation | Ops/CPU-ms |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | 5.00s | — | — | — |
| compute-mix | Rust (generic) | 5.00s | — | — | — |
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 136.4K ops/CPU-ms |
| compute-mix | Python | 5.05s | 5.05s | 100% | 782.66 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 27.9ms | 47.0ms | 169% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.0ms | 31.0ms | 103% | 1.6K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.28s | 1.28s | 100% | 78.0K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.6ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.6ms | — | — | — |
| arithmetic-threshold | Node.js | 20.6ms | 47.0ms | 228% | 425.5K ops/CPU-ms |
| arithmetic-threshold | Python | 5.03s | 5.03s | 100% | 4.0K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 11.8ms | 15.0ms | 127% | 4.2K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 11.8ms | 0.0ms | 0% | — |
| arithmetic-threshold | WASM ▶ production | 1.04s | 1.00s | 96% | 506.0K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.5ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 15.7ms | 47.0ms | 299% | 895.13 ops/CPU-ms |
| six-digit-guess | Python | 517.7ms | 515.6ms | 100% | 81.59 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 929.5ms | 984.0ms | 106% | 42.75 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 917.7ms | 954.0ms | 104% | 44.10 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.14s | 1.14s | 100% | 36.9K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.5ms | 0.0ms | 0% | — |
| record-allocation | Python | 52.6ms | 46.9ms | 89% | 4.3K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 3.9ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 4.0ms | 0.0ms | 0% | — |
| record-allocation | WASM ▶ production | 1.01s | 1.02s | 101% | 551.2K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 395.9ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 398.4ms | — | — | — |
| fibonacci-recursive | Node.js | 778.0ms | 781.0ms | 100% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 3.61s | 3.61s | 100% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 60.2ms | 77.0ms | 128% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 71.8ms | 94.0ms | 131% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.03s | 1.05s | 101% | 17.19 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 514.7ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 514.4ms | — | — | — |
| tower-of-hanoi | Node.js | 121.7ms | 125.0ms | 103% | 104.9K ops/CPU-ms |
| tower-of-hanoi | Python | 406.0ms | 406.3ms | 100% | 3.2K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 784.1ms | 797.0ms | 102% | 82.23 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 770.3ms | 860.0ms | 112% | 76.20 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.07s | 1.06s | 100% | 123.4K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 75.3ms | — | — | — |
| collection-pipeline | Rust (generic) | 242.5ms | — | — | — |
| collection-pipeline | Node.js | 694.4ms | 703.0ms | 101% | 71.1K ops/CPU-ms |
| collection-pipeline | Python | 5.07s | 5.06s | 100% | 9.9K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.5ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.6ms | 0.0ms | 0% | — |
| collection-pipeline | WASM ▶ production | 1.01s | 1.02s | 101% | 423.2K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.0ms | — | — | — |
| governance-cost | Rust (generic) | 11.0ms | — | — | — |
| governance-cost | Node.js | 47.1ms | 47.0ms | 100% | — |
| governance-cost | Python | 4.04s | 4.05s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.7ms | 31.0ms | 1869% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.01s | 101% | — |
| hardware-targets | Rust AVX2 | 843.3ms | — | — | — |
| hardware-targets | Rust (generic) | 838.5ms | — | — | — |
| hardware-targets | Node.js | 1.10s | 1.13s | 102% | 888.89 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 11.0ms | 32.0ms | 290% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.00s | 100% | 39.1K ops/CPU-ms |
| low-memory | Rust AVX2 | 169.4ms | — | — | — |
| low-memory | Rust (generic) | 759.3ms | — | — | — |
| low-memory | Node.js | 69.7ms | 93.0ms | 133% | 537.6K ops/CPU-ms |
| low-memory | Python | 3.01s | 3.02s | 100% | 3.3K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 90.0ms | 109.0ms | 121% | 91.74 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 73.7ms | 78.0ms | 106% | 128.21 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.01s | 1.02s | 101% | 472.4K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.18s | — | — | — |
| gpu-compute | Rust (generic) | 4.19s | — | — | — |
| gpu-compute | Node.js | 502.8ms | 515.0ms | 102% | 970.9K ops/CPU-ms |
| gpu-compute | Python | 8.64s | 8.64s | 100% | 5.8K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 314.2ms | 343.0ms | 109% | 291.54 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 318.1ms | 329.0ms | 103% | 303.95 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.05s | 1.05s | 100% | 477.6K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.1ms | — | — | — |
| matrix-multiply | Rust AVX2 | 91.0ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.4ms | — | — | — |
| matrix-multiply | Node.js | 216.3ms | 234.0ms | 108% | 560.1K ops/CPU-ms |
| matrix-multiply | Python | 1.71s | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 51.8ms | 94.0ms | 182% | 348.60 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 50.8ms | 78.0ms | 153% | 420.10 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.03s | 1.03s | 100% | 445.0K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 13.1ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 18.5ms | 15.0ms | 81% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 4.5ms | 16.0ms | 352% | 0.06 ops/CPU-ms |
| text-html | Galerina passive ⟨interp⟩ | 1.4ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.1ms | 78.0ms | 7222% | 0.01 ops/CPU-ms |
| tri-logic | Rust AVX2 | 428.9ms | — | — | — |
| tri-logic | Rust (generic) | 429.6ms | — | — | — |
| tri-logic | Node.js | 300.0ms | — | — | — |
| tri-logic | Python | 1.70s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 1.01s | 1.09s | 108% | 274.47 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 1.00s | 1.03s | 103% | 290.70 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.27s | 1.27s | 100% | 473.9K ops/CPU-ms |
| data-query | Node.js | 131.4ms | — | — | — |
| data-query | Python | 741.8ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.9ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 42.7ms | 47.0ms | 110% | 212.77 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 46.8ms | 63.0ms | 135% | 158.73 ops/CPU-ms |
| call-chain | Node.js | 6.3ms | 0.0ms | 0% | — |
| call-chain | Python | 693.3ms | 687.5ms | 99% | 1.5K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.06s | 1.08s | 102% | 46.38 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.04s | 1.06s | 102% | 47.04 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.80s | 1.81s | 100% | 55.2K ops/CPU-ms |
| nbody | Node.js | 53.6ms | 78.0ms | 145% | 84.0K ops/CPU-ms |
| nbody | Python | 1.13s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 590.9ms | 672.0ms | 114% | 48.76 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 571.6ms | 657.0ms | 115% | 49.88 ops/CPU-ms |
| nbody | WASM ▶ production | 1.11s | 1.11s | 100% | 29.5K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 102.1ms | 188.0ms | 184% | 2.66 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 89.6ms | 141.0ms | 157% | 3.55 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 139.3ms | — | — | — |
| mandelbrot | Rust (generic) | 138.5ms | — | — | — |
| mandelbrot | Node.js | 476.4ms | 469.0ms | 98% | 7.0K ops/CPU-ms |
| mandelbrot | Python | 23.06s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.17s | 2.17s | 100% | 7.54 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.27s | 2.30s | 101% | 7.13 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.83s | 1.83s | 100% | 9.0K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.4ms | — | — | — |
| spectral-norm | Rust (generic) | 26.4ms | — | — | — |
| spectral-norm | Node.js | 42.0ms | 47.0ms | 112% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 6.02s | — | — | — |
| binary-trees | Rust AVX2 | 6.6ms | — | — | — |
| binary-trees | Rust (generic) | 8.8ms | — | — | — |
| binary-trees | Node.js | 1.7ms | 0.0ms | 0% | — |
| binary-trees | Python | 45.1ms | 46.9ms | 104% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 398.0ms | 469.0ms | 118% | 289.67 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 408.9ms | 453.0ms | 111% | 299.90 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.14s | 1.14s | 100% | 595.3K ops/CPU-ms |
| spore-container | Rust AVX2 | 2.10s | — | — | — |
| spore-container | Rust (generic) | 1.99s | — | — | — |
| spore-container | Node.js | 6.41s | 7.61s | 119% | 39.42 ops/CPU-ms |
| spore-container | Python | 1.50s | — | — | — |
| framework-pipeline | Node.js | 492.8ms | 1.19s | 241% | 168.35 ops/CPU-ms |
| framework-pipeline | Python | 1.64s | — | — | — |
| http-throughput | Node.js | 87.0ms | — | — | — |
| naming-check | Node.js | 460.0ms | — | — | — |
| context-receipt | Node.js | 328.0ms | — | — | — |
| intelligence-search | Node.js | 46.0ms | — | — | — |
| provenance-trace | Node.js | 2.09s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 136.42M/s | 5.00s | 5.00s | 45.2MB | ~0 | 174.3× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 133.47M/s | 5.00s | — | — | ~0 (native) | 170.5× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 131.02M/s | 5.00s | — | — | ~0 (native) | 167.4× | 0.96× |
| 4 | ⚪ | WASM ▶ production | 78.36M/s | 1.28s | 1.28s | 74.8MB | ~0 | 100.1× | 0.57× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.06M/s | 0.4ms | 0.0ms | 80.4MB | 468 B/op | 2.63× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.79M/s | 27.9ms | 47.0ms | 76.4MB | 89 B/op | 2.29× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.67M/s | 30.0ms | 31.0ms | 75.8MB | 90 B/op | 2.13× | 0.01× |
| 8 | ⚫ | Python | 782.7K/s | 5.05s | 5.05s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (468 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.59B/s | 12.6ms | — | — | ~0 (native) | 400.2× | 1.64× |
| 🥈 | 🟢 | Rust AVX2 | 1.59B/s | 12.6ms | — | — | ~0 (native) | 400.2× | 1.64× |
| 🥉 | 🟢 | Node.js | 969.69M/s | 20.6ms | 47.0ms | 46.1MB | ~0 | 244.1× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 485.52M/s | 1.04s | 1.00s | 84.6MB | ~0 | 122.2× | 0.50× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 5.38M/s | 11.8ms | 0.0ms | 81.9MB | 13 B/op | 1.35× | 0.01× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 5.35M/s | 11.8ms | 15.0ms | 82.0MB | 13 B/op | 1.35× | 0.01× |
| 7 | ⚫ | Python | 3.97M/s | 5.03s | 5.03s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 23.3K/s | 0.1ms | 0.0ms | 82.3MB | 18.6 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 79.74M/s | 0.5ms | — | — | ~0 (native) | 981.2× | 29.8× |
| 🥈 | 🟢 | Rust AVX2 | 76.91M/s | 0.5ms | — | — | ~0 (native) | 946.4× | 28.7× |
| 🥉 | 🟢 | WASM ▶ production | 36.81M/s | 1.14s | 1.14s | 85.0MB | ~0 | 453.0× | 13.8× |
| 4 | 🟢 | Node.js | 2.68M/s | 15.7ms | 47.0ms | 50.9MB | 26 B/op | 32.9× | 1.00× |
| 5 | 🔴 | Python | 81.3K/s | 517.7ms | 515.6ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina governed ⟨interp⟩ | 45.8K/s | 917.7ms | 954.0ms | 83.2MB | 29 B/op | 0.56× | 0.02× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 45.3K/s | 929.5ms | 984.0ms | 83.6MB | 25 B/op | 0.56× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 25.5K/s | 0.1ms | 0.0ms | 83.9MB | 32.4 KB/op | 0.31× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (32.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 8.5ms | — | — | ~0 (native) | 309.6× | 20.4× |
| 🥈 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 307.9× | 20.3× |
| 🥉 | 🟢 | WASM ▶ production | 556.87M/s | 1.01s | 1.02s | 86.3MB | ~0 | 146.5× | 9.66× |
| 4 | 🟢 | Node.js | 57.67M/s | 3.5ms | 0.0ms | 47.3MB | 2 B/op | 15.2× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.07M/s | 0.2ms | 0.0ms | 83.9MB | 140 B/op | 2.12× | 0.14× |
| 6 | 🔴 | Python | 3.80M/s | 52.6ms | 46.9ms | — | ~0 | 1.00× | 0.07× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.57M/s | 3.9ms | 0.0ms | 83.8MB | 9 B/op | 0.68× | 0.04× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.48M/s | 4.0ms | 0.0ms | 84.7MB | 6 B/op | 0.65× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (140 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 68.7K/s | 0.1ms | 0.0ms | 84.5MB | 11.9 KB/op | 12.4K× | 534.3× |
| 🥈 | 🟢 | WASM ▶ production | 17.4K/s | 1.03s | 1.05s | 86.2MB | ~0 | 3.1K× | 135.3× |
| 🥉 | 🟢 | Rust AVX2 | 505.1/s | 395.9ms | — | — | ~0 (native) | 91.2× | 3.93× |
| 4 | 🟢 | Rust (generic) | 502.0/s | 398.4ms | — | — | ~0 (native) | 90.6× | 3.91× |
| 5 | 🟢 | Node.js | 128.5/s | 778.0ms | 781.0ms | 45.3MB | 53 B/op | 23.2× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 17.0/s | 60.2ms | 77.0ms | 84.5MB | 849.2 KB/op | 3.07× | 0.13× |
| 7 | 🟡 | Galerina governed ⟨interp⟩ | 14.0/s | 71.8ms | 94.0ms | 84.1MB | 804.6 KB/op | 2.53× | 0.11× |
| 8 | 🔴 | Python | 5.5/s | 3.61s | 3.61s | — | 23 B/op | 1.00× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (849.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 254.80M/s | 514.4ms | — | — | ~0 (native) | 78.9× | 2.37× |
| 🥈 | 🟢 | Rust AVX2 | 254.64M/s | 514.7ms | — | — | ~0 (native) | 78.9× | 2.36× |
| 🥉 | 🟢 | WASM ▶ production | 122.81M/s | 1.07s | 1.06s | 86.5MB | ~0 | 38.0× | 1.14× |
| 4 | 🟢 | Node.js | 107.72M/s | 121.7ms | 125.0ms | 45.6MB | ~0 | 33.4× | 1.00× |
| 5 | 🔴 | Python | 3.23M/s | 406.0ms | 406.3ms | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 85.2K/s | 0.1ms | 0.0ms | 89.5MB | 10.2 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 85.1K/s | 770.3ms | 860.0ms | 86.4MB | 59 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 83.6K/s | 784.1ms | 797.0ms | 86.3MB | 26 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (10.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.29B/s | 75.3ms | — | — | ~0 (native) | 1.3K× | 184.5× |
| 🥈 | 🟢 | Rust (generic) | 4.12B/s | 242.5ms | — | — | ~0 (native) | 417.9× | 57.3× |
| 🥉 | 🟢 | WASM ▶ production | 425.52M/s | 1.01s | 1.02s | 91.8MB | ~0 | 43.1× | 5.91× |
| 4 | 🟢 | Node.js | 72.00M/s | 694.4ms | 703.0ms | 62.3MB | ~0 | 7.30× | 1.00× |
| 5 | 🟡 | Python | 9.87M/s | 5.07s | 5.06s | — | ~0 | 1.00× | 0.14× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.45M/s | 0.3ms | 0.0ms | 89.2MB | 145 B/op | 0.86× | 0.12× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.23M/s | 4.5ms | 0.0ms | 89.2MB | 14 B/op | 0.23× | 0.03× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.18M/s | 4.6ms | 0.0ms | 90.1MB | 17 B/op | 0.22× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (145 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 906.25M/s | 11.0ms |
| Rust (generic) | 911.82M/s | 11.0ms |
| Node.js | 2.12M/s | 47.1ms |
| Python | 24.7K/s | 4.04s |
| Galerina passive ⟨interp⟩ | 1.9K/s | 1.7ms |
| Galerina manifest ⟨interp⟩ | 884.0/s | 1.1ms |
| Galerina governed ⟨interp⟩ | 804.0/s | 1.2ms |
| WASM ▶ production | 2.89M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 39.14M/s | 1.00s | 1.00s | 92.0MB | ~0 | — | 43.0× |
| 🥈 | 🟢 | Rust (generic) | 1.19M/s | 838.5ms | — | — | ~0 (native) | — | 1.31× |
| 🥉 | 🟢 | Rust AVX2 | 1.19M/s | 843.3ms | — | — | ~0 (native) | — | 1.30× |
| 4 | 🟢 | Node.js | 909.3K/s | 1.10s | 1.13s | 47.3MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 90.7K/s | 11.0ms | 32.0ms | 91.5MB | 327 B/op | — | 0.10× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 4.8K/s | 0.2ms | 0.0ms | 89.8MB | 79.6 KB/op | — | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 4.3K/s | 0.2ms | 0.0ms | 89.6MB | 81.5 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (81.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 5.90B/s | 169.4ms | — | — | ~0 | 1.8K× | 8.23× |
| 🥈 | 🟢 | Rust (generic) | 1.32B/s | 759.3ms | — | — | ~0 | 396.2× | 1.84× |
| 🥉 | 🟢 | Node.js | 717.16M/s | 69.7ms | 93.0ms | 45.6MB | ~0 | 215.8× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 475.76M/s | 1.01s | 1.02s | 92.2MB | ~0 | 143.1× | 0.66× |
| 5 | ⚫ | Python | 3.32M/s | 3.01s | 3.02s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 157.5K/s | 0.6ms | 0.0ms | 89.7MB | -4.0 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 135.6K/s | 73.7ms | 78.0ms | 89.9MB | 37 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 111.1K/s | 90.0ms | 109.0ms | 90.2MB | 38 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.0 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (38 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.19B/s | 4.18s | — | — | ~0 (native) | 206.6× | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 1.19B/s | 4.19s | — | — | ~0 (native) | 206.5× | 1.20× |
| 🥉 | 🟢 | Node.js | 994.41M/s | 502.8ms | 515.0ms | 45.7MB | ~0 | 171.9× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 475.35M/s | 1.05s | 1.05s | 92.6MB | ~0 | 82.2× | 0.48× |
| 5 | ⚫ | Python | 5.78M/s | 8.64s | 8.64s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.99M/s | 25.1ms | — | — | — | 0.69× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 361.0K/s | 0.2ms | 0.0ms | 90.2MB | 3.2 KB/op | 0.06× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 318.2K/s | 314.2ms | 343.0ms | 90.1MB | 12 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 314.4K/s | 318.1ms | 329.0ms | 90.1MB | 4 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.60B/s | 13.1ms | — | — | — | 208.3× | 2.64× |
| 🥈 | 🟢 | Rust (generic) | 1.52B/s | 86.4ms | — | — | ~0 (native) | 197.5× | 2.50× |
| 🥉 | 🟢 | Rust AVX2 | 1.44B/s | 91.0ms | — | — | ~0 (native) | 187.6× | 2.38× |
| 4 | 🟢 | Node.js | 606.03M/s | 216.3ms | 234.0ms | 47.3MB | ~0 | 78.9× | 1.00× |
| 5 | ⚪ | WASM ▶ production | 443.82M/s | 1.03s | 1.03s | 93.2MB | ~0 | 57.8× | 0.73× |
| 6 | 🔴 | Python | 7.68M/s | 1.71s | — | — | 8 B/op | 1.00× | 0.01× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 841.5K/s | 0.1ms | 0.0ms | 90.4MB | 1.4 KB/op | 0.11× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 644.8K/s | 50.8ms | 78.0ms | 90.2MB | 32 B/op | 0.08× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 632.7K/s | 51.8ms | 94.0ms | 90.4MB | 35 B/op | 0.08× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.4K/s | 18.5ms | 15.0ms | 90.4MB | -1.0 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 2.0K/s | 0.5ms | 0.0ms | 90.2MB | 345.2 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 220.0/s | 4.5ms | 16.0ms | 90.2MB | 324.1 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-1.0 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (345.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 69.7K/s | 1.4ms | 0.0ms | 92.6MB | -3.7 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.4K/s | 0.4ms | 0.0ms | 90.9MB | 152.2 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 926.0/s | 1.1ms | 78.0ms | 90.6MB | 171.4 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.7 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.40B/s | 428.9ms | — | — | ~0 (native) | 198.1× | 1.40× |
| 🥈 | 🟢 | Rust (generic) | 1.40B/s | 429.6ms | — | — | ~0 (native) | 197.8× | 1.40× |
| 🥉 | 🟢 | Node.js | 1.00B/s | 300.0ms | — | — | ~0 | 141.6× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 473.69M/s | 1.27s | 1.27s | 94.2MB | ~0 | 67.1× | 0.47× |
| 5 | ⚫ | Python | 7.06M/s | 1.70s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 315.0K/s | 1.6ms | 0.0ms | 91.0MB | 543 B/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 298.7K/s | 1.00s | 1.03s | 90.6MB | 1 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 296.8K/s | 1.01s | 1.09s | 92.7MB | 7 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (543 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 2.41B/s | — | — | — | ~0 (native) | 243.8× | 1.19× |
| 🥈 | 🟢 | Rust AVX2 | 2.41B/s | — | — | — | ~0 (native) | 243.7× | 1.18× |
| 🥉 | 🟢 | Node.js | 2.03B/s | — | — | — | — | 205.7× | 1.00× |
| 4 | ⚫ | Python | 9.87M/s | — | — | — | — | 1.00× | 0.00× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 380.50M/s | 131.4ms | — | — | ~0 | 94.1× | 1.00× |
| 🥈 | 🔴 | Python | 4.04M/s | 741.8ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 259.2K/s | 0.9ms | 0.0ms | 91.5MB | -3.9 KB/op | 0.06× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 234.2K/s | 42.7ms | 47.0ms | 91.3MB | 72 B/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 213.8K/s | 46.8ms | 63.0ms | 91.5MB | 95 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.9 KB/op) · **highest:** Galerina governed ⟨interp⟩ (95 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 318.22M/s | 6.3ms | 0.0ms | 46.2MB | ~0 | 220.6× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 55.45M/s | 1.80s | 1.81s | 94.4MB | ~0 | 38.4× | 0.17× |
| 🥉 | ⚫ | Python | 1.44M/s | 693.3ms | 687.5ms | — | ~0 | 1.00× | 0.00× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 52.0K/s | 0.1ms | 0.0ms | 91.1MB | 21.2 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 48.1K/s | 1.04s | 1.06s | 91.4MB | 31 B/op | 0.03× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 47.2K/s | 1.06s | 1.08s | 92.0MB | 66 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (21.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.24M/s | 53.6ms | 78.0ms | 47.7MB | ~0 | 84.5× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 29.45M/s | 1.11s | 1.11s | 93.4MB | ~0 | 20.4× | 0.24× |
| 🥉 | 🔴 | Python | 1.45M/s | 1.13s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 57.3K/s | 571.6ms | 657.0ms | 91.5MB | 21 B/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina passive ⟨interp⟩ | 56.4K/s | 0.2ms | 0.0ms | 93.3MB | 22.1 KB/op | 0.04× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 55.5K/s | 590.9ms | 672.0ms | 93.3MB | 15 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (22.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.13M/s | — | — | — | — | 7.11× | 1.00× |
| 🥈 | 🟡 | Python | 441.0K/s | — | — | — | 1 B/op | 1.00× | 0.14× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 9.6K/s | 0.4ms | 0.0ms | 100.5MB | 114.3 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 5.6K/s | 89.6ms | 141.0ms | 100.1MB | 5.2 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.9K/s | 102.1ms | 188.0ms | 92.7MB | 1.8 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (114.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 23.65M/s | 138.5ms | — | — | ~0 (native) | 166.5× | 3.44× |
| 🥈 | 🟢 | Rust AVX2 | 23.52M/s | 139.3ms | — | — | ~0 (native) | 165.5× | 3.42× |
| 🥉 | 🟢 | WASM ▶ production | 8.93M/s | 1.83s | 1.83s | 95.2MB | ~0 | 62.9× | 1.30× |
| 4 | 🟢 | Node.js | 6.88M/s | 476.4ms | 469.0ms | 47.3MB | ~0 | 48.4× | 1.00× |
| 5 | 🔴 | Python | 142.1K/s | 23.06s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 7.5K/s | 2.17s | 2.17s | 93.1MB | 191 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 7.2K/s | 2.27s | 2.30s | 95.1MB | 69 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 7.2K/s | 0.2ms | 0.0ms | 93.1MB | 141.3 KB/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (141.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 379.14M/s | 26.4ms | — | — | ~0 (native) | 228.1× | 1.59× |
| 🥈 | 🟢 | Rust AVX2 | 378.78M/s | 26.4ms | — | — | ~0 (native) | 227.9× | 1.59× |
| 🥉 | 🟢 | Node.js | 238.30M/s | 42.0ms | 47.0ms | 47.8MB | ~0 | 143.4× | 1.00× |
| 4 | ⚫ | Python | 1.66M/s | 6.02s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 594.25M/s | 1.14s | 1.14s | 96.0MB | ~0 | 197.3× | 7.53× |
| 🥈 | 🟢 | Node.js | 78.96M/s | 1.7ms | 0.0ms | 47.5MB | 3 B/op | 26.2× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 20.58M/s | 6.6ms | — | — | ~0 (native) | 6.83× | 0.26× |
| 4 | 🟡 | Rust (generic) | 15.42M/s | 8.8ms | — | — | ~0 (native) | 5.12× | 0.20× |
| 5 | 🔴 | Python | 3.01M/s | 45.1ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 377.7K/s | 0.2ms | 0.0ms | 94.8MB | -54.5 KB/op | 0.13× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 341.3K/s | 398.0ms | 469.0ms | 94.8MB | 12 B/op | 0.11× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 332.3K/s | 408.9ms | 453.0ms | 94.6MB | 8 B/op | 0.11× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-54.5 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (12 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 151.1K/s | 1.99s | — | — | ~0 (native) | 2.27× | 3.23× |
| 🥈 | 🟢 | Rust AVX2 | 142.9K/s | 2.10s | — | — | ~0 (native) | 2.14× | 3.05× |
| 🥉 | 🟢 | Python | 66.7K/s | 1.50s | — | — | ~0 | 1.00× | 1.42× |
| 4 | 🟢 | Node.js | 46.8K/s | 6.41s | 7.61s | 63.6MB | 6 B/op | 0.70× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (6 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 405.8K/s | 492.8ms | 1.19s | 73.4MB | 37 B/op | 3.33× | 1.00× |
| 🥈 | 🟡 | Python | 122.0K/s | 1.64s | — | — | ~0 | 1.00× | 0.30× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (37 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### http-throughput

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### naming-check

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### context-receipt

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### intelligence-search

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### provenance-trace

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|


## 4b. GPU-Compute Workload (parallel map-reduce)

> A **GPU-shaped** workload: a per-element kernel `f(i)=i*2+1` applied across 100,000 elements + reduction.
> On a GPU this parallelises across thousands of threads. 🖥️ CPU = running on CPU; 🎮 GPU = real GPU dispatch.

**GPU detected:** NVIDIA GeForce RTX 2060 (driver 610.74, 6144 MiB)
**Compute toolchain:** NVIDIA GeForce RTX 2060 — GPU compute available.
**Deno WebGPU:** ✅ available — real GPU dispatch enabled (NVIDIA GeForce RTX 2060)
**Galerina GPU backend:** `not-implemented` — gpu-plan.ts emits a WGSL skeleton only; no dispatch path (pending Phase 38).

| # | 🚦 | Runtime | Device (🖥️ CPU / 🎮 GPU) | Throughput (kernel ops/s) | Wall | vs Node |
|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.18s | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.19s | 1.20× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 994.41M/s | 502.8ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 475.35M/s | 1.05s | 0.48× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.78M/s | 8.64s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 3.99M/s | 25.1ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 361.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 318.2K/s | 314.2ms | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 314.4K/s | 318.1ms | 0.00× |

**GPU execution status (this machine):**

| Runtime | GPU path | Device | Status |
|---|---|---|---|
| Rust | wgpu (Vulkan/D3D12) | 🖥️ CPU (GPU pending) | 🔧 buildable (cargo present, harness pending) |
| Python | torch CUDA / cupy | 🖥️ CPU (GPU pending) | ⏳ toolchain required (CPU-only torch) |
| Node.js | WebGPU | 🖥️ CPU only | ⏳ toolchain required (no navigator.gpu in Node.js) |
| Deno | WebGPU (built-in) | 🎮 GPU (NVIDIA GeForce RTX 2060) | ✅ available — real GPU dispatch detected (Phase 38 ready) |
| **Galerina** | WebGPUComputePlan → WGSL | 🖥️ CPU (GPU pending) | ❌ **pending Phase 38** — stub only, no measured number (by design) |

> Per the project's honesty rule (same as the Runtime-in-Galerina 0% metric): no GPU number is shown until a backend actually executes. Galerina's real result on this workload is its **WASM/CPU** row above.
> 🖥️ CPU = running on CPU cores. 🎮 GPU = real GPU dispatch via WebGPU/WGSL. Deno WebGPU is the only path currently capable of real GPU execution.

## 5. Key Observations

**Throughput gap (general):**
- Rust and Node.js JIT compile to native machine code — tree-walker cannot compete on hot arithmetic loops.
- Python CPython is 5-100× faster than Galerina on integer-intensive workloads.
- Galerina governed ≈ Galerina manifest — governance overhead is low; tree-walker dispatch dominates.

**collection-pipeline: the old "Galerina wins 43×" was a UNIT bug, now fixed:**
- That claim compared Galerina's *elements/sec* against the other languages' *whole-pipeline-passes/sec* —
  off by the per-pass element count (size = 10,000). Apples to oranges.
- Normalised to elements/sec for every runtime, the tree-walker no longer beats Node.js or Python here.
- Node/Python still pay real intermediate-array allocation for `.filter().map().reduce()`, but V8/CPython
  per-element throughput dwarfs the Stage-A interpreter once the units match.
- **Lesson:** normalise units before declaring a winner — a big `opsPerRun` multiplier flatters whoever it's applied to.

**fibonacci-recursive: different workloads:**
- Node.js/Rust/Python benchmark: fib(30) = 832040, ~2.7M recursive calls per invocation.
- Galerina benchmark: fib(20) = 6765, ~21K recursive calls per invocation (fib(30) would take ~19s/call).
- Calls/sec are not directly comparable — structural complexity differs by ~130×.
- Comparable result: Galerina handles ~1M+ AST node evaluations per second for recursive dispatch.

**Memory:**
- Galerina tree-walker allocates a new `{ __tag, value }` object per AST node — visible as heap growth.
- Negative heap delta = GC ran during execution and reclaimed more than was allocated.
- Node.js V8 JIT uses native tagged integers (no boxing) — heap stays flat on numeric workloads.

**passive mode: pre-compiled deployment throughput:**
- Galerina (passive) warm = LRU cache hits: steady-state deployment model (same input, same output).
- Galerina (passive) cold = execution without cache: different input each call, no cache benefit.
- Passive warm is typically 10-50× faster than governed — governance amortized, cache serves result.
- Passive cold shows pure execution cost: governance was pre-verified at compile time.

**hardware-targets: AVX2 vs generic for float dot product:**
- On i5-11400H (Tiger Lake H): generic x86 ≈ AVX2 for small arrays (both auto-vectorize to SSE4.2).
- Real AVX2 advantage appears on large tensors (L2/L3 cache boundary crossing, 16K+ float elements).
- WASM Phase 27: once WebAssembly.instantiate is wired, WASM SIMD 128 will show 10-100× over tree-walker.

**governance-cost: measuring the governance tax:**
- This benchmark isolates the overhead of the governance layer (ProofGraph + capability checking + audit).
- Key metric: galerinaGoverned/galerinaManifest ratio. Current baseline: ~2-3× slower (37% of manifest speed).
- Governance overhead sources: ProofGraph construction, GovernanceFlags bitmask, capability lookup, audit event.
- Target (Phase 30): <1.2× overhead via compile-time governance caching and proof reuse.

**Phase 25 projection (WASM):**
- Phase 25 WASM real arithmetic: pure flows now emit i32.add/sub/mul/div instead of (local.get $p0) stubs.
- Expected: 10-100× speedup for numeric pure flows when executed via WebAssembly.instantiate.
- collection-pipeline Galerina result already shows what the model delivers at the right abstraction level.

## 6. Distance from Winner — Every Runtime vs 🏆

> How much slower (or faster) is each runtime compared to the winner of that benchmark?
> **1.0×** = tied with winner. **2.0×** = half the speed. **100×** = one hundred times slower.

| Benchmark | 🏆 Winner | Rust AVX2 | Rust (generic) | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) |
|---|---|---|---|---|---|---|---|---|---|---|
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **174× slower** | **66× slower** | **76× slower** | **82× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **400× slower** | **68.4K× slower** | **297× slower** | **296× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **30× slower** | **981× slower** | **3.1K× slower** | **1.8K× slower** | **1.7K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | **20× slower** | **310× slower** | **146× slower** | **458× slower** | **475× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **136× slower** | **137× slower** | **534× slower** | **12.4K× slower** | **🏆 winner** | **4.0K× slower** | **4.9K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **79× slower** | **3.0K× slower** | **3.0K× slower** | **3.0K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **185× slower** | **1.3K× slower** | **1.6K× slower** | **6.0K× slower** | **6.1K× slower** | **31× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **33× slower** | **33× slower** | **43× slower** | not run | **431× slower** | **8.2K× slower** | **9.0K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 4× slower | 8× slower | **1.8K× slower** | **37.5K× slower** | **53.1K× slower** | **43.5K× slower** | **12× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **207× slower** | **3.3K× slower** | **3.8K× slower** | **3.8K× slower** | 3× slower | **300× slower** |
| **matrix-multiply** | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.1× slower | 1.1× slower | 3× slower | **208× slower** | **1.9K× slower** | **2.5K× slower** | **2.5K× slower** | 4× slower | **🏆 winner** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 3× slower | **25× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **29× slower** | **75× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.4× slower | **198× slower** | **4.4K× slower** | **4.7K× slower** | **4.7K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.2× slower | **244× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **94× slower** | **1.5K× slower** | **1.6K× slower** | **1.8K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **221× slower** | **6.1K× slower** | **6.7K× slower** | **6.6K× slower** | 6× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **85× slower** | **2.2K× slower** | **2.2K× slower** | **2.1K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 7× slower | **326× slower** | **640× slower** | **562× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust (generic) | **🏆 winner** | **🏆 winner** | 3× slower | **166× slower** | **3.3K× slower** | **3.1K× slower** | **3.3K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **228× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **29× slower** | **39× slower** | 8× slower | **197× slower** | **1.6K× slower** | **1.7K× slower** | **1.8K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | 1.1× slower | **🏆 winner** | 3× slower | 2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

> Bold = significantly behind (>10×). A non-numeric cell states why that runtime has no figure (e.g. "not run — no native impl", "errored", "no WASM build") — never a silent blank.
> Fibonacci passive is excluded from 'winner' comparison — LRU cache hit is not a fair race.
> gpu-compute GPU: NVIDIA GeForce RTX 2060 slower than CPU at 100K elements (setup overhead dominates — crossover ~500K elements).

## 7. Per-Benchmark Scoreboard — Winner → Slowest (full spread)

> Every runtime that ran, ranked fastest→slowest, with distance from the winner AND from the slowest.
> ⚠️ **`Galerina passive ⟨interp⟩` figures are LRU cache-HIT rates** (a memoised result for a repeated
> input), **not compute** — flagged `⚠️cache` below. Read the first non-cache row for the real compute winner.

### compute-mix
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 136.42M/s | 🏆 winner | 174× faster |
| 🥈 | Rust (generic) | 133.47M/s | 1.0× slower | 171× faster |
| 🥉 | Rust AVX2 | 131.02M/s | 1.0× slower | 167× faster |
| 4 | WASM ▶ production | 78.36M/s | 1.7× slower | 100× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.06M/s | 66× slower | 2.6× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.79M/s | 76× slower | 2.3× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.67M/s | 82× slower | 2.1× faster |
| 8 | Python | 782.7K/s | 174× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.59B/s | 🏆 winner | 68.4K× faster |
| 🥈 | Rust AVX2 | 1.59B/s | 1.0× slower | 68.4K× faster |
| 🥉 | Node.js | 969.69M/s | 1.6× slower | 41.7K× faster |
| 4 | WASM ▶ production | 485.52M/s | 3.3× slower | 20.9K× faster |
| 5 | Galerina governed ⟨interp⟩ | 5.38M/s | 296× slower | 231× faster |
| 6 | Galerina manifest ⟨interp⟩ | 5.35M/s | 297× slower | 230× faster |
| 7 | Python | 3.97M/s | 400× slower | 171× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 23.3K/s | 68.4K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 79.74M/s | 🏆 winner | 3.1K× faster |
| 🥈 | Rust AVX2 | 76.91M/s | 1.0× slower | 3.0K× faster |
| 🥉 | WASM ▶ production | 36.81M/s | 2.2× slower | 1.4K× faster |
| 4 | Node.js | 2.68M/s | 30× slower | 105× faster |
| 5 | Python | 81.3K/s | 981× slower | 3.2× faster |
| 6 | Galerina governed ⟨interp⟩ | 45.8K/s | 1.7K× slower | 1.8× faster |
| 7 | Galerina manifest ⟨interp⟩ | 45.3K/s | 1.8K× slower | 1.8× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 25.5K/s | 3.1K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 475× faster |
| 🥈 | Rust (generic) | 1.17B/s | 1.0× slower | 473× faster |
| 🥉 | WASM ▶ production | 556.87M/s | 2.1× slower | 225× faster |
| 4 | Node.js | 57.67M/s | 20× slower | 23× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.07M/s | 146× slower | 3.3× faster |
| 6 | Python | 3.80M/s | 310× slower | 1.5× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.57M/s | 458× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.48M/s | 475× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 17.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 68.7K/s | 🏆 winner | 12.4K× faster |
| 🥈 | WASM ▶ production | 17.4K/s | 3.9× slower | 3.1K× faster |
| 🥉 | Rust AVX2 | 505.1/s | 136× slower | 91× faster |
| 4 | Rust (generic) | 502.0/s | 137× slower | 91× faster |
| 5 | Node.js | 128.5/s | 534× slower | 23× faster |
| 6 | Galerina manifest ⟨interp⟩ | 17.0/s | 4.0K× slower | 3.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 14.0/s | 4.9K× slower | 2.5× faster |
| 8 | Python | 5.5/s | 12.4K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 254.80M/s | 🏆 winner | 3.0K× faster |
| 🥈 | Rust AVX2 | 254.64M/s | 1.0× slower | 3.0K× faster |
| 🥉 | WASM ▶ production | 122.81M/s | 2.1× slower | 1.5K× faster |
| 4 | Node.js | 107.72M/s | 2.4× slower | 1.3K× faster |
| 5 | Python | 3.23M/s | 79× slower | 39× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 85.2K/s | 3.0K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 85.1K/s | 3.0K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 83.6K/s | 3.0K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.29B/s | 🏆 winner | 6.1K× faster |
| 🥈 | Rust (generic) | 4.12B/s | 3.2× slower | 1.9K× faster |
| 🥉 | WASM ▶ production | 425.52M/s | 31× slower | 195× faster |
| 4 | Node.js | 72.00M/s | 185× slower | 33× faster |
| 5 | Python | 9.87M/s | 1.3K× slower | 4.5× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.45M/s | 1.6K× slower | 3.9× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.23M/s | 6.0K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.18M/s | 6.1K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 39.14M/s | 🏆 winner | 9.0K× faster |
| 🥈 | Rust (generic) | 1.19M/s | 33× slower | 274× faster |
| 🥉 | Rust AVX2 | 1.19M/s | 33× slower | 273× faster |
| 4 | Node.js | 909.3K/s | 43× slower | 209× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 90.7K/s | 431× slower | 21× faster |
| 6 | Galerina manifest ⟨interp⟩ | 4.8K/s | 8.2K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 4.3K/s | 9.0K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 5.90B/s | 🏆 winner | 53.1K× faster |
| 🥈 | Rust (generic) | 1.32B/s | 4.5× slower | 11.9K× faster |
| 🥉 | Node.js | 717.16M/s | 8.2× slower | 6.5K× faster |
| 4 | WASM ▶ production | 475.76M/s | 12× slower | 4.3K× faster |
| 5 | Python | 3.32M/s | 1.8K× slower | 30× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 157.5K/s | 37.5K× slower | 1.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 135.6K/s | 43.5K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 111.1K/s | 53.1K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.19B/s | 🏆 winner | 3.8K× faster |
| 🥈 | Rust (generic) | 1.19B/s | 1.0× slower | 3.8K× faster |
| 🥉 | Node.js | 994.41M/s | 1.2× slower | 3.2K× faster |
| 4 | WASM ▶ production | 475.35M/s | 2.5× slower | 1.5K× faster |
| 5 | Python | 5.78M/s | 207× slower | 18× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.99M/s | 300× slower | 13× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 361.0K/s | 3.3K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 318.2K/s | 3.8K× slower | 1.0× faster |
| 9 | Galerina governed ⟨interp⟩ | 314.4K/s | 3.8K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.60B/s | 🏆 winner | 2.5K× faster |
| 🥈 | Rust (generic) | 1.52B/s | 1.1× slower | 2.4K× faster |
| 🥉 | Rust AVX2 | 1.44B/s | 1.1× slower | 2.3K× faster |
| 4 | Node.js | 606.03M/s | 2.6× slower | 958× faster |
| 5 | WASM ▶ production | 443.82M/s | 3.6× slower | 701× faster |
| 6 | Python | 7.68M/s | 208× slower | 12× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 841.5K/s | 1.9K× slower | 1.3× faster |
| 8 | Galerina governed ⟨interp⟩ | 644.8K/s | 2.5K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 632.7K/s | 2.5K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.0K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.4K/s | 🏆 winner | 25× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.0K/s | 2.6× slower | 9.3× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 220.0/s | 25× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 69.7K/s | 🏆 winner | 75× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.4K/s | 29× slower | 2.6× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 926.0/s | 75× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.40B/s | 🏆 winner | 4.7K× faster |
| 🥈 | Rust (generic) | 1.40B/s | 1.0× slower | 4.7K× faster |
| 🥉 | Node.js | 1.00B/s | 1.4× slower | 3.4K× faster |
| 4 | WASM ▶ production | 473.69M/s | 3.0× slower | 1.6K× faster |
| 5 | Python | 7.06M/s | 198× slower | 24× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 315.0K/s | 4.4K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 298.7K/s | 4.7K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 296.8K/s | 4.7K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 2.41B/s | 🏆 winner | 244× faster |
| 🥈 | Rust AVX2 | 2.41B/s | 1.0× slower | 244× faster |
| 🥉 | Node.js | 2.03B/s | 1.2× slower | 206× faster |
| 4 | Python | 9.87M/s | 244× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 380.50M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Python | 4.04M/s | 94× slower | 19× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 259.2K/s | 1.5K× slower | 1.2× faster |
| 4 | Galerina manifest ⟨interp⟩ | 234.2K/s | 1.6K× slower | 1.1× faster |
| 5 | Galerina governed ⟨interp⟩ | 213.8K/s | 1.8K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 318.22M/s | 🏆 winner | 6.7K× faster |
| 🥈 | WASM ▶ production | 55.45M/s | 5.7× slower | 1.2K× faster |
| 🥉 | Python | 1.44M/s | 221× slower | 31× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 52.0K/s | 6.1K× slower | 1.1× faster |
| 5 | Galerina governed ⟨interp⟩ | 48.1K/s | 6.6K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 47.2K/s | 6.7K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.24M/s | 🏆 winner | 2.2K× faster |
| 🥈 | WASM ▶ production | 29.45M/s | 4.2× slower | 531× faster |
| 🥉 | Python | 1.45M/s | 85× slower | 26× faster |
| 4 | Galerina governed ⟨interp⟩ | 57.3K/s | 2.1K× slower | 1.0× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 56.4K/s | 2.2K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 55.5K/s | 2.2K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.13M/s | 🏆 winner | 640× faster |
| 🥈 | Python | 441.0K/s | 7.1× slower | 90× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 9.6K/s | 326× slower | 2.0× faster |
| 4 | Galerina governed ⟨interp⟩ | 5.6K/s | 562× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.9K/s | 640× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 23.65M/s | 🏆 winner | 3.3K× faster |
| 🥈 | Rust AVX2 | 23.52M/s | 1.0× slower | 3.3K× faster |
| 🥉 | WASM ▶ production | 8.93M/s | 2.6× slower | 1.2K× faster |
| 4 | Node.js | 6.88M/s | 3.4× slower | 954× faster |
| 5 | Python | 142.1K/s | 166× slower | 20× faster |
| 6 | Galerina manifest ⟨interp⟩ | 7.5K/s | 3.1K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 7.2K/s | 3.3K× slower | 1.0× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 7.2K/s | 3.3K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 379.14M/s | 🏆 winner | 228× faster |
| 🥈 | Rust AVX2 | 378.78M/s | 1.0× slower | 228× faster |
| 🥉 | Node.js | 238.30M/s | 1.6× slower | 143× faster |
| 4 | Python | 1.66M/s | 228× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 594.25M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Node.js | 78.96M/s | 7.5× slower | 238× faster |
| 🥉 | Rust AVX2 | 20.58M/s | 29× slower | 62× faster |
| 4 | Rust (generic) | 15.42M/s | 39× slower | 46× faster |
| 5 | Python | 3.01M/s | 197× slower | 9.1× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 377.7K/s | 1.6K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 341.3K/s | 1.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 332.3K/s | 1.8K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 151.1K/s | 🏆 winner | 3.2× faster |
| 🥈 | Rust AVX2 | 142.9K/s | 1.1× slower | 3.1× faster |
| 🥉 | Python | 66.7K/s | 2.3× slower | 1.4× faster |
| 4 | Node.js | 46.8K/s | 3.2× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 405.8K/s | 🏆 winner | 3.3× faster |
| 🥈 | Python | 122.0K/s | 3.3× slower | — (slowest) |


---

## Benchmark Glossary — what each benchmark measures

| Benchmark | What it measures | Why it matters |
|---|---|---|
| **arithmetic-threshold** | Integer arithmetic loop: count operations above a threshold at 4B/s | Raw CPU / WASM JIT ceiling — the fastest possible pure number-crunching |
| **call-chain** | Flow-to-flow call chain (A→B→C→D): function-call overhead | Real programs call multiple governed flows; this isolates dispatch cost |
| **collection-pipeline** | Functional pipeline: filter → map → reduce over 10K integer records | Data transformation throughput — the bread-and-butter of governed APIs |
| **compute-mix** | Mixed workload: string ops, conditionals, arithmetic, object creation | Closest to real-world application code; no single hot path |
| **crypto-ops** | SHA-256 hashing, HMAC, Ed25519 sign+verify (via stdlib) | Performance of governed cryptographic operations (used in every secure flow) |
| **data-query** | `scanRecords(10K)`: one pass — filter (WHERE amount>threshold) + GROUP BY category — the same bulk-N scan on every runtime | Governed data-query throughput in record-scans/sec (aligned 2026-07-11); the `Tainted<String>` query path is a compile-time cost layered on top |
| **fibonacci-recursive** | Recursive fib(20): tail-call and LRU cache warm path | Tests recursion overhead + caching benefit across governed/passive/WASM tiers |
| **governance-cost** | Sum 1..100 (triangle number) with full governance verification overhead | Directly measures the cost of Galerina's contract{} checking vs raw arithmetic |
| **gpu-compute** | Parallel map-reduce kernel (100K elements) via Deno WebGPU | GPU dispatch throughput on RTX 2060 — the WASM/GPU crossover point |
| **hardware-targets** | Dispatch to 5 hardware targets: CPU/GPU/NPU/WASM/fallback | Route decision overhead when contract.targets{} selects execution path |
| **http-throughput** | Sequential HTTP requests/sec to a governed localhost endpoint | Server throughput — how fast Galerina can handle real HTTP requests |
| **json-parse** | Parse 500 JSON records: split on comma, split on colon, accumulate | Real I/O parsing workload — string-heavy, cache-friendly on repeat calls |
| **spore-container** | Create the canonical .spore trust-container (TMX-256 SHAKE Merkle + LE packing). **The "Node.js" column IS Galerina's `@galerina/ext-spore` engine** (pure TS/Node); Python/Rust are byte-identical reference writers — all assert the same golden root | Can other languages create a .spore, and how fast? Honest SHAKE256+packing race (the engine is pure Node, so it has no separate interpreter column) |
| **framework-pipeline** | One full governed request through the **Galerina App Kernel's fixed 12-gate pipeline** (route→policy→size→content-type→auth→decode→idempotency→concurrency→dispatch→encode→audit). **The "Node.js" column IS the App Kernel** (no middleware chain); Python is an equivalent sync gate chain | "Native framework, no middleware" vs a middleware chain — measures pipeline cost in-process (no sockets). The structural win is fewer deps + non-reorderable gates, not raw speed |
| **low-memory** | Process 10K items with strict heap budget (measures bytes/op) | Memory efficiency — critical for edge/embedded deployment targets |
| **matrix-multiply** | 32×32 integer GEMM (matrix multiplication) | Scientific / ML workload: dense arithmetic, benefits from SIMD/GPU |
| **nbody** | N-body gravitational force: pairwise O(N²) physics simulation | Compute-heavy scientific workload — measured in force-evals/sec; Node/Python (native loops) are far faster than the tree-walker |
| **record-allocation** | Create 10K records at 2.3B/s: struct construction throughput | Memory allocation cost under governance — critical for high-frequency APIs |
| **six-digit-guess** | Brute-force 6-digit PIN search with early exit | Branch-heavy search — tests conditional execution + JIT branch prediction |
| **text-html** | HTML template rendering: string interpolation + escaping | Web/rendering workload — string manipulation under governance |
| **tri-logic** | Balanced ternary (base-3) logic operations: trit arithmetic | Photonic/ternary compute path — future hardware target validation |
| **naming-check** | FUNGI-NAMING checker over 27 auth-service .fungi files | DevTools throughput: how fast the naming linter processes a codebase |
| **context-receipt** | Context Receipt generation: 51–97% token reduction per flow | AI context window generation speed — how fast receipts are produced |
| **intelligence-search** | BM25 hybrid code search: index 81 flows, 10 queries/run | Code search latency — how fast galerina search responds |
| **provenance-trace** | Data lineage graph: source→transform→sink for 27 files | Compliance evidence generation speed — how fast the audit trail is built |

