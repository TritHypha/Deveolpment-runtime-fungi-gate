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

> Categories: 14 certified · 3 shape-only(→Memory) · 1 internal-ratio(Governance) · 11 uncertified — a cross-runtime ratio is shown only for work-equivalence-certified lanes.

### CPU Throughput — inner-ops/s (cross-runtime; certified lanes only)

> 🚦 **vs Rust / vs Node** compare the **WASM ▶ production** lane to native. A traffic-light ratio
> appears ONLY for work-equivalence-certified benchmarks; `UNCERTIFIED` lanes show raw throughput and
> NO ratio (their N/work is not yet proven equivalent across runtimes).

| Benchmark | WASM ▶ production | vs Rust | vs Node | Galerina governed ⟨interp⟩ | Implication |
|---|---|---|---|---|---|
| compute-mix | 76.93M/s | ⚪ 1.7× slower | ⚪ 1.8× slower | 1.65M/s | WASM near native |
| arithmetic-threshold | 495.15M/s | UNCERTIFIED | UNCERTIFIED | 5.16M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.48M/s | UNCERTIFIED | UNCERTIFIED | 48.2K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.3K/s | UNCERTIFIED | UNCERTIFIED | 13.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 121.06M/s | 🟡 2.1× slower | 🟢 1.1× slower | 97.3K/s | WASM usable |
| hardware-targets | 38.09M/s | UNCERTIFIED | UNCERTIFIED | 4.5K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 445.75M/s | 🟡 3.4× slower | ⚪ 1.4× slower | 702.4K/s | WASM usable |
| tri-logic | 472.70M/s | 🟡 2.9× slower | 🟡 2.1× slower | 335.3K/s | WASM usable |
| data-query | no WASM build | — | — | 241.5K/s | WASM not built for this lane yet |
| call-chain | 54.28M/s | — | 🟡 5.9× slower | 53.9K/s | WASM 2–10× under Node |
| nbody | 29.59M/s | — | 🟡 4.1× slower | 61.8K/s | WASM 2–10× under Node |
| mandelbrot | 9.09M/s | 🟡 2.6× slower | 🟢 1.5× | 7.3K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Deno WebGPU (NVIDIA GeForce RTX 2060) — 1.73B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 6 B/op | 9 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 16 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 47 B/op | 55 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 16 B/op | 12 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust (generic) | 1.19B/s | 472.80M/s | 4.14M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.73B/s | 445.75M/s | 1.73B/s | ⚪ 1.4× slower | real GPU dispatch wins |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (86.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 86.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (909.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 909.0/s |
| json-parse | records/s | **Node.js** (3.41M/s) | 3.41M/s | 448.0K/s | not run — no native impl | no WASM — strings/records | 5.2K/s |
| spore-container | containers/s | **Rust (generic)** (167.2K/s) | 43.1K/s | 66.0K/s | 167.2K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Python** (114.0K/s) | not run | 114.0K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.7K/s) | 3.7K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (7.6K/s) | 7.6K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (19.6K/s) | 19.6K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (120.6K/s) | 120.6K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (794.0/s) | 794.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 810.0/s | 1.0K/s | 2.88M/s | 0.77× governed/manifest (gov overhead ≈ 1.29×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **129.27M/s** | **132.23M/s** | **132.47M/s** | **135.41M/s** | 758.6K/s | 2.08M/s | 1.78M/s | 1.65M/s | 76.93M/s | not run — no GPU path | 81.9× |
| arithmetic-threshold | not run — no AVX-512 | 1.57B/s | 1.56B/s | **1.88B/s** | 972.69M/s | 3.90M/s | 40.4K/s | 5.15M/s | 5.16M/s | 495.15M/s | not run — no GPU path | 188.4× |
| six-digit-guess | not run — no AVX-512 | **75.31M/s** | **78.02M/s** | 68.97M/s | 2.83M/s | 91.0K/s | 16.3K/s | 47.7K/s | 48.2K/s | 36.48M/s | not run — no GPU path | 58.7× |
| record-allocation | not run — no AVX-512 | **1.18B/s** | **1.17B/s** | not run — no C++ impl | 55.24M/s | 3.61M/s | 8.59M/s | 2.67M/s | 2.44M/s | 555.48M/s | not run — no GPU path | 22.6× |
| fibonacci-recursive | not run — no AVX-512 | 498.1/s | 499.6/s | not run — no C++ impl | 126.7/s | 5.1/s | **73.2K/s** | 20.0/s | 13.0/s | 17.3K/s | not run — no GPU path | 9.75× |
| tower-of-hanoi | not run — no AVX-512 | **252.03M/s** | **252.39M/s** | not run — no C++ impl | 129.78M/s | 3.16M/s | 97.0K/s | 96.2K/s | 97.3K/s | 121.06M/s | not run — no GPU path | 1.3K× |
| collection-pipeline | not run — no AVX-512 | **12.90B/s** | 4.32B/s | not run — no C++ impl | 70.36M/s | 10.63M/s | 8.44M/s | 2.32M/s | 2.29M/s | 419.43M/s | not run — no GPU path | 30.7× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.17M/s | 1.17M/s | not run — no C++ impl | 903.8K/s | not run | 108.8K/s | 5.0K/s | 4.5K/s | **38.09M/s** | not run — no GPU path | 198.9× |
| low-memory | not run — no AVX-512 | **6.11B/s** | 1.34B/s | not run — no C++ impl | 710.20M/s | 2.94M/s | 160.5K/s | 123.4K/s | 134.4K/s | 467.71M/s | not run — no GPU path | 5.3K× |
| gpu-compute | not run — no AVX-512 | **1.19B/s** | **1.19B/s** | not run — no C++ impl | 985.48M/s | 5.90M/s | 377.0K/s | 326.0K/s | 336.5K/s | 472.80M/s | 4.14M/s | 2.9K× |
| matrix-multiply | not run — no AVX-512 | 1.42B/s | 1.52B/s | not run — no C++ impl | 617.74M/s | 7.11M/s | 857.9K/s | 663.2K/s | 702.4K/s | 445.75M/s | **1.73B/s** | 879.4× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **4.7K/s** | 1.3K/s | 86.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **75.0K/s** | 2.4K/s | 909.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.39B/s** | **1.38B/s** | not run — no C++ impl | 980.88M/s | 6.89M/s | 345.0K/s | 325.3K/s | 335.3K/s | 472.70M/s | not run — no GPU path | 2.9K× |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **391.44M/s** | 3.86M/s | 268.8K/s | 251.7K/s | 241.5K/s | no WASM build | not run — no GPU path | 1.6K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **317.82M/s** | 1.58M/s | 64.0K/s | 55.8K/s | 53.9K/s | 54.28M/s | not run — no GPU path | 5.9K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.73M/s** | 1.22M/s | 64.9K/s | 63.6K/s | 61.8K/s | 29.59M/s | not run — no GPU path | 2.0K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.41M/s** | 448.0K/s | 8.4K/s | 4.9K/s | 5.2K/s | no WASM — strings/records | not run — no GPU path | 657.0× |
| mandelbrot | not run — no AVX-512 | **23.43M/s** | **23.42M/s** | not run — no C++ impl | 6.23M/s | 152.8K/s | 7.5K/s | 7.3K/s | 7.3K/s | 9.09M/s | not run — no GPU path | 850.2× |
| spectral-norm | not run — no AVX-512 | **359.26M/s** | **366.56M/s** | not run — no C++ impl | 240.27M/s | 1.74M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 19.30M/s | 19.62M/s | not run — no C++ impl | 60.37M/s | 3.07M/s | 398.1K/s | 350.5K/s | 344.2K/s | **581.01M/s** | not run — no GPU path | 175.4× |
| spore-container | not run — no AVX-512 | **179.5K/s** | 167.2K/s | not run — no C++ impl | 43.1K/s | 66.0K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | not run | **114.0K/s** | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — neither ran |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -39.66 bytes/op ⚡ ~0 — no boxing | 160.5K/s | — | -397KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.11B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.34B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 710.20M/s | — | 20KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 467.71M/s | — | 44KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 2.94M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 47 bytes/op ⚠ moderate | 134.4K/s | — | 465KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 55 bytes/op ⚠ moderate | 123.4K/s | — | 549KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | C++ | — | — | — | — |
| compute-mix | Node.js | 44.2MB | 44.4MB | 5.0MB | 947KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 78.5MB | 78.5MB | 17.2MB | 63KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 74.5MB | 74.5MB | 21.0MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 73.4MB | 73.4MB | 20.7MB | 4.5MB |
| compute-mix | WASM ▶ production | 72.6MB | 72.6MB | 16.4MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | C++ | — | — | — | — |
| arithmetic-threshold | Node.js | 47.2MB | 47.5MB | 4.3MB | 172KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 80.2MB | 80.2MB | 17.5MB | 38KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 80.0MB | 80.0MB | 17.6MB | 837KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 79.7MB | 79.7MB | 17.5MB | 854KB |
| arithmetic-threshold | WASM ▶ production | 81.9MB | 81.9MB | 17.1MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | C++ | — | — | — | — |
| six-digit-guess | Node.js | 52.1MB | 52.1MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 81.3MB | 81.3MB | 17.7MB | 85KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 81.0MB | 81.0MB | 18.2MB | 885KB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 80.9MB | 80.9MB | 18.4MB | 1.5MB |
| six-digit-guess | WASM ▶ production | 82.7MB | 82.7MB | 17.3MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 48.4MB | 48.4MB | 4.3MB | 152KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 81.4MB | 81.4MB | 18.0MB | 179KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 81.4MB | 81.4MB | 17.5MB | 93KB |
| record-allocation | Galerina governed ⟨interp⟩ | 82.0MB | 82.0MB | 17.5MB | 56KB |
| record-allocation | WASM ▶ production | 83.8MB | 83.8MB | 17.8MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 46.7MB | 46.7MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 81.9MB | 81.9MB | 18.6MB | 57KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 81.9MB | 81.9MB | 17.9MB | 175KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 81.6MB | 81.6MB | 18.5MB | 941KB |
| fibonacci-recursive | WASM ▶ production | 83.9MB | 83.9MB | 19.5MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 46.7MB | 46.7MB | 4.1MB | 15KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 85.2MB | 85.2MB | 23.2MB | 46KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 84.3MB | 84.3MB | 18.1MB | 1.3MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 84.1MB | 84.1MB | 18.2MB | 1.4MB |
| tower-of-hanoi | WASM ▶ production | 83.9MB | 83.9MB | 17.1MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 63.5MB | 63.5MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 84.6MB | 84.6MB | 17.4MB | 257KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 84.6MB | 84.6MB | 16.9MB | 137KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 85.4MB | 85.4MB | 16.9MB | 164KB |
| collection-pipeline | WASM ▶ production | 87.5MB | 87.5MB | 17.1MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 46.4MB | 46.4MB | 4.1MB | 27KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 86.1MB | 86.1MB | 17.6MB | 456KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 88.3MB | 88.3MB | 17.3MB | 417KB |
| governance-cost | Galerina governed ⟨interp⟩ | 86.4MB | 86.4MB | 17.3MB | 442KB |
| governance-cost | WASM ▶ production | 87.1MB | 87.1MB | 17.2MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 48.3MB | 48.3MB | 4.5MB | 354KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 85.3MB | 85.3MB | 18.5MB | 791KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 85.0MB | 85.0MB | 17.1MB | 73KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 84.9MB | 84.9MB | 17.1MB | 75KB |
| hardware-targets | WASM ▶ production | 87.4MB | 87.4MB | 17.4MB | 86KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 46.5MB | 46.5MB | 4.1MB | 20KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 85.3MB | 85.3MB | 17.7MB | -397KB |
| low-memory | Galerina manifest ⟨interp⟩ | 85.7MB | 85.7MB | 17.6MB | 549KB |
| low-memory | Galerina governed ⟨interp⟩ | 85.9MB | 85.9MB | 17.5MB | 465KB |
| low-memory | WASM ▶ production | 87.4MB | 87.4MB | 17.3MB | 44KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 46.9MB | 46.9MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 85.5MB | 85.5MB | 18.3MB | 187KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 85.4MB | 85.4MB | 17.7MB | 509KB |
| gpu-compute | Galerina governed ⟨interp⟩ | 85.3MB | 85.3MB | 18.0MB | 821KB |
| gpu-compute | WASM ▶ production | 88.1MB | 88.1MB | 17.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 48.4MB | 48.4MB | 4.3MB | 204KB |
| matrix-multiply | Python | — | — | 392B | 392B |
| matrix-multiply | Galerina passive ⟨interp⟩ | 85.9MB | 85.9MB | 17.5MB | -886KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 85.8MB | 85.8MB | 18.2MB | 1.0MB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 85.7MB | 85.7MB | 18.1MB | 905KB |
| matrix-multiply | WASM ▶ production | 88.4MB | 88.4MB | 17.5MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 61.9MB | 61.9MB | 7.9MB | 2.4MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 85.7MB | 85.7MB | 17.8MB | -202KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 85.7MB | 85.7MB | 17.5MB | 198KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 85.7MB | 85.7MB | 17.5MB | 357KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 87.7MB | 87.7MB | 18.1MB | -492KB |
| text-html | Galerina manifest ⟨interp⟩ | 86.1MB | 86.1MB | 17.8MB | 151KB |
| text-html | Galerina governed ⟨interp⟩ | 85.9MB | 85.9MB | 17.8MB | 171KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 324KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 86.2MB | 86.2MB | 18.3MB | 185KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 86.1MB | 86.1MB | 18.1MB | 232KB |
| tri-logic | Galerina governed ⟨interp⟩ | 86.2MB | 86.2MB | 18.5MB | 697KB |
| tri-logic | WASM ▶ production | 89.8MB | 89.8MB | 18.1MB | 1KB |
| data-query | Node.js | — | — | — | 14KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 89.0MB | 89.0MB | 20.7MB | 1.1MB |
| data-query | Galerina manifest ⟨interp⟩ | 89.0MB | 89.0MB | 18.4MB | 608KB |
| data-query | Galerina governed ⟨interp⟩ | 86.9MB | 86.9MB | 20.0MB | 2.1MB |
| call-chain | Node.js | 47.4MB | 47.4MB | 4.1MB | 11KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 88.3MB | 88.3MB | 21.6MB | 81KB |
| call-chain | Galerina manifest ⟨interp⟩ | 88.3MB | 88.3MB | 19.9MB | 2.0MB |
| call-chain | Galerina governed ⟨interp⟩ | 88.4MB | 88.4MB | 18.9MB | 1.1MB |
| call-chain | WASM ▶ production | 89.4MB | 89.4MB | 18.1MB | 1KB |
| nbody | Node.js | 48.7MB | 48.7MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 88.3MB | 88.3MB | 18.3MB | -1.9MB |
| nbody | Galerina manifest ⟨interp⟩ | 88.3MB | 88.3MB | 18.3MB | 342KB |
| nbody | Galerina governed ⟨interp⟩ | 88.4MB | 88.4MB | 19.5MB | 1.6MB |
| nbody | WASM ▶ production | 89.1MB | 89.1MB | 18.2MB | 1KB |
| json-parse | Node.js | — | — | — | 254KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 94.6MB | 94.6MB | 19.7MB | 416KB |
| json-parse | Galerina manifest ⟨interp⟩ | 87.9MB | 87.9MB | 20.2MB | 1.8MB |
| json-parse | Galerina governed ⟨interp⟩ | 90.7MB | 90.7MB | 18.9MB | 958KB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 48.5MB | 48.5MB | 4.5MB | 403KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 90.9MB | 90.9MB | 19.9MB | 164KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 90.9MB | 90.9MB | 22.6MB | 4.3MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 90.6MB | 90.6MB | 19.7MB | 1.2MB |
| mandelbrot | WASM ▶ production | 91.4MB | 91.4MB | 18.8MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 48.5MB | 48.5MB | 4.4MB | 294KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 48.6MB | 48.6MB | 4.6MB | 429KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 91.1MB | 91.1MB | 18.7MB | 67KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 91.1MB | 91.1MB | 20.0MB | 1.6MB |
| binary-trees | Galerina governed ⟨interp⟩ | 89.7MB | 89.7MB | 20.5MB | 2.1MB |
| binary-trees | WASM ▶ production | 92.2MB | 92.2MB | 18.6MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 64.3MB | 64.3MB | 8.9MB | 1.7MB |
| spore-container | Python | — | — | 5KB | 5KB |
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
| compute-mix | C++ | 30.00s | — | — | — |
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 135.4K ops/CPU-ms |
| compute-mix | Python | 5.01s | 5.02s | 100% | 757.63 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.0ms | 47.0ms | 168% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.2ms | 16.0ms | 53% | 3.1K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.30s | 1.30s | 100% | 77.1K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.7ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | C++ | 10.6ms | — | — | — |
| arithmetic-threshold | Node.js | 20.6ms | 15.0ms | 73% | 1.33M ops/CPU-ms |
| arithmetic-threshold | Python | 5.13s | 5.13s | 100% | 3.9K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 12.3ms | 31.0ms | 252% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.3ms | 16.0ms | 131% | 4.0K ops/CPU-ms |
| arithmetic-threshold | WASM ▶ production | 1.02s | 1.03s | 101% | 490.8K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | C++ | 0.6ms | — | — | — |
| six-digit-guess | Node.js | 14.9ms | 15.0ms | 101% | 2.8K ops/CPU-ms |
| six-digit-guess | Python | 462.5ms | 437.5ms | 95% | 96.16 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 881.3ms | 891.0ms | 101% | 47.22 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 873.0ms | 923.0ms | 106% | 45.58 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.15s | 1.16s | 100% | 36.4K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.6ms | 0.0ms | 0% | — |
| record-allocation | Python | 55.5ms | 62.5ms | 113% | 3.2K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 3.7ms | 79.0ms | 2112% | 126.58 ops/CPU-ms |
| record-allocation | Galerina governed ⟨interp⟩ | 4.1ms | 0.0ms | 0% | — |
| record-allocation | WASM ▶ production | 1.01s | 1.03s | 102% | 543.2K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 401.6ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 400.3ms | — | — | — |
| fibonacci-recursive | Node.js | 789.3ms | 781.0ms | 99% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 3.93s | 3.92s | 100% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 49.3ms | 125.0ms | 253% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 77.1ms | 126.0ms | 163% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.04s | 1.11s | 106% | 16.23 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 520.1ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 519.3ms | — | — | — |
| tower-of-hanoi | Node.js | 101.0ms | 94.0ms | 93% | 139.4K ops/CPU-ms |
| tower-of-hanoi | Python | 415.0ms | 421.9ms | 102% | 3.1K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.0ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 681.0ms | 703.0ms | 103% | 93.22 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 673.5ms | 688.0ms | 102% | 95.25 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.08s | 1.08s | 100% | 121.5K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 77.5ms | — | — | — |
| collection-pipeline | Rust (generic) | 231.6ms | — | — | — |
| collection-pipeline | Node.js | 710.6ms | 719.0ms | 101% | 69.5K ops/CPU-ms |
| collection-pipeline | Python | 4.70s | 4.70s | 100% | 10.6K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.4ms | 78.0ms | 1785% | 128.21 ops/CPU-ms |
| collection-pipeline | WASM ▶ production | 1.00s | 1.00s | 100% | 420.0K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.1ms | — | — | — |
| governance-cost | Rust (generic) | 11.3ms | — | — | — |
| governance-cost | Node.js | 47.3ms | 47.0ms | 99% | — |
| governance-cost | Python | 4.98s | 4.98s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 0.9ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.02s | 102% | — |
| hardware-targets | Rust AVX2 | 855.9ms | — | — | — |
| hardware-targets | Rust (generic) | 853.5ms | — | — | — |
| hardware-targets | Node.js | 1.11s | 1.11s | 100% | 900.90 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 9.2ms | 47.0ms | 511% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.00s | 100% | 38.1K ops/CPU-ms |
| low-memory | Rust AVX2 | 163.6ms | — | — | — |
| low-memory | Rust (generic) | 745.1ms | — | — | — |
| low-memory | Node.js | 70.4ms | 79.0ms | 112% | 632.9K ops/CPU-ms |
| low-memory | Python | 3.41s | 3.42s | 100% | 2.9K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 81.1ms | 109.0ms | 134% | 91.74 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 74.4ms | 62.0ms | 83% | 161.29 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.00s | 1.00s | 100% | 470.0K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.21s | — | — | — |
| gpu-compute | Rust (generic) | 4.20s | — | — | — |
| gpu-compute | Node.js | 507.4ms | 500.0ms | 99% | 1000.0K ops/CPU-ms |
| gpu-compute | Python | 8.47s | 8.47s | 100% | 5.9K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 306.7ms | 344.0ms | 112% | 290.70 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 297.2ms | 312.0ms | 105% | 320.51 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.06s | 1.06s | 100% | 470.8K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 24.2ms | — | — | — |
| matrix-multiply | Rust AVX2 | 92.3ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.5ms | — | — | — |
| matrix-multiply | Node.js | 212.2ms | 234.0ms | 110% | 560.1K ops/CPU-ms |
| matrix-multiply | Python | 1.84s | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 49.4ms | 63.0ms | 128% | 520.13 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 46.6ms | 78.0ms | 167% | 420.10 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.03s | 1.03s | 100% | 444.5K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.1ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 21.4ms | 46.0ms | 215% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.8ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 11.6ms | 16.0ms | 138% | 0.06 ops/CPU-ms |
| text-html | Galerina passive ⟨interp⟩ | 1.3ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 430.7ms | — | — | — |
| tri-logic | Rust (generic) | 434.1ms | — | — | — |
| tri-logic | Node.js | 305.8ms | — | — | — |
| tri-logic | Python | 1.74s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.5ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 922.4ms | 953.0ms | 103% | 314.80 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 894.7ms | 938.0ms | 105% | 319.83 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.27s | 1.26s | 100% | 474.3K ops/CPU-ms |
| data-query | Node.js | 127.7ms | — | — | — |
| data-query | Python | 777.2ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 39.7ms | 31.0ms | 78% | 322.58 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 41.4ms | 62.0ms | 150% | 161.29 ops/CPU-ms |
| call-chain | Node.js | 6.3ms | 16.0ms | 254% | 125.0K ops/CPU-ms |
| call-chain | Python | 631.7ms | 625.0ms | 99% | 1.6K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 895.8ms | 906.0ms | 101% | 55.19 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 927.6ms | 1.03s | 111% | 48.50 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.84s | 1.84s | 100% | 54.2K ops/CPU-ms |
| nbody | Node.js | 53.4ms | 62.0ms | 116% | 105.7K ops/CPU-ms |
| nbody | Python | 1.34s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 515.0ms | 515.0ms | 100% | 63.63 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 530.3ms | 578.0ms | 109% | 56.69 ops/CPU-ms |
| nbody | WASM ▶ production | 1.11s | 1.11s | 100% | 29.5K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 102.8ms | 110.0ms | 107% | 4.55 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 96.4ms | 156.0ms | 162% | 3.21 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 139.8ms | — | — | — |
| mandelbrot | Rust (generic) | 139.9ms | — | — | — |
| mandelbrot | Node.js | 525.8ms | 532.0ms | 101% | 6.2K ops/CPU-ms |
| mandelbrot | Python | 21.45s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.24s | 2.28s | 102% | 7.18 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.24s | 2.23s | 100% | 7.33 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.80s | 1.81s | 101% | 9.0K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 27.8ms | — | — | — |
| spectral-norm | Rust (generic) | 27.3ms | — | — | — |
| spectral-norm | Node.js | 41.6ms | 47.0ms | 113% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 5.74s | — | — | — |
| binary-trees | Rust AVX2 | 7.0ms | — | — | — |
| binary-trees | Rust (generic) | 6.9ms | — | — | — |
| binary-trees | Node.js | 2.3ms | 0.0ms | 0% | — |
| binary-trees | Python | 44.3ms | 46.9ms | 106% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 387.6ms | 375.0ms | 97% | 362.28 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 394.7ms | 437.0ms | 111% | 310.88 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.17s | 1.17s | 100% | 579.6K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.67s | — | — | — |
| spore-container | Rust (generic) | 1.79s | — | — | — |
| spore-container | Node.js | 6.96s | 8.33s | 120% | 36.02 ops/CPU-ms |
| spore-container | Python | 1.52s | — | — | — |
| framework-pipeline | Python | 1.75s | — | — | — |
| http-throughput | Node.js | 82.0ms | — | — | — |
| naming-check | Node.js | 409.0ms | — | — | — |
| context-receipt | Node.js | 288.0ms | — | — | — |
| intelligence-search | Node.js | 41.0ms | — | — | — |
| provenance-trace | Node.js | 1.95s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 135.41M/s | 5.00s | 5.00s | 44.2MB | ~0 | 178.5× | 1.00× |
| 🥈 | 🟢 | C++ | 132.47M/s | 30.00s | — | — | ~0 (native) | 174.6× | 0.98× |
| 🥉 | 🟢 | Rust (generic) | 132.23M/s | 5.00s | — | — | ~0 (native) | 174.3× | 0.98× |
| 4 | 🟢 | Rust AVX2 | 129.27M/s | 5.00s | — | — | ~0 (native) | 170.4× | 0.95× |
| 5 | ⚪ | WASM ▶ production | 76.93M/s | 1.30s | 1.30s | 72.6MB | ~0 | 101.4× | 0.57× |
| 6 | 🔴 | Galerina passive ⟨interp⟩ | 2.08M/s | 0.3ms | 0.0ms | 78.5MB | 92 B/op | 2.74× | 0.02× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 1.78M/s | 28.0ms | 47.0ms | 74.5MB | 89 B/op | 2.35× | 0.01× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 1.65M/s | 30.2ms | 16.0ms | 73.4MB | 90 B/op | 2.18× | 0.01× |
| 9 | ⚫ | Python | 758.6K/s | 5.01s | 5.02s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (92 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | C++ | 1.88B/s | 10.6ms | — | — | ~0 (native) | 482.5× | 1.94× |
| 🥈 | 🟢 | Rust AVX2 | 1.57B/s | 12.7ms | — | — | ~0 (native) | 402.4× | 1.61× |
| 🥉 | 🟢 | Rust (generic) | 1.56B/s | 12.8ms | — | — | ~0 (native) | 400.1× | 1.60× |
| 4 | 🟢 | Node.js | 972.69M/s | 20.6ms | 15.0ms | 47.2MB | ~0 | 249.4× | 1.00× |
| 5 | ⚪ | WASM ▶ production | 495.15M/s | 1.02s | 1.03s | 81.9MB | ~0 | 126.9× | 0.51× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 5.16M/s | 12.3ms | 16.0ms | 79.7MB | 13 B/op | 1.32× | 0.01× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 5.15M/s | 12.3ms | 31.0ms | 80.0MB | 13 B/op | 1.32× | 0.01× |
| 8 | ⚫ | Python | 3.90M/s | 5.13s | 5.13s | — | ~0 | 1.00× | 0.00× |
| 9 | ⚫ | Galerina passive ⟨interp⟩ | 40.4K/s | 0.1ms | 0.0ms | 80.2MB | 12.3 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (12.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 78.02M/s | 0.5ms | — | — | ~0 (native) | 857.8× | 27.6× |
| 🥈 | 🟢 | Rust AVX2 | 75.31M/s | 0.6ms | — | — | ~0 (native) | 828.0× | 26.6× |
| 🥉 | 🟢 | C++ | 68.97M/s | 0.6ms | — | — | ~0 (native) | 758.2× | 24.4× |
| 4 | 🟢 | WASM ▶ production | 36.48M/s | 1.15s | 1.16s | 82.7MB | ~0 | 401.0× | 12.9× |
| 5 | 🟢 | Node.js | 2.83M/s | 14.9ms | 15.0ms | 52.1MB | 26 B/op | 31.1× | 1.00× |
| 6 | 🔴 | Python | 91.0K/s | 462.5ms | 437.5ms | — | ~0 | 1.00× | 0.03× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 48.2K/s | 873.0ms | 923.0ms | 80.9MB | 35 B/op | 0.53× | 0.02× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 47.7K/s | 881.3ms | 891.0ms | 81.0MB | 21 B/op | 0.52× | 0.02× |
| 9 | ⚫ | Galerina passive ⟨interp⟩ | 16.3K/s | 0.2ms | 0.0ms | 81.3MB | 27.6 KB/op | 0.18× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (27.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 8.5ms | — | — | ~0 (native) | 325.8× | 21.3× |
| 🥈 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 325.4× | 21.2× |
| 🥉 | 🟢 | WASM ▶ production | 555.48M/s | 1.01s | 1.03s | 83.8MB | ~0 | 154.0× | 10.1× |
| 4 | 🟢 | Node.js | 55.24M/s | 3.6ms | 0.0ms | 48.4MB | ~0 | 15.3× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.59M/s | 0.3ms | 0.0ms | 81.4MB | 79 B/op | 2.38× | 0.16× |
| 6 | 🔴 | Python | 3.61M/s | 55.5ms | 62.5ms | — | ~0 | 1.00× | 0.07× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.67M/s | 3.7ms | 79.0ms | 81.4MB | 9 B/op | 0.74× | 0.05× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.44M/s | 4.1ms | 0.0ms | 82.0MB | 6 B/op | 0.68× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (79 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 73.2K/s | 0.1ms | 0.0ms | 81.9MB | 11.1 KB/op | 14.4K× | 577.8× |
| 🥈 | 🟢 | WASM ▶ production | 17.3K/s | 1.04s | 1.11s | 83.9MB | ~0 | 3.4K× | 136.3× |
| 🥉 | 🟢 | Rust (generic) | 499.6/s | 400.3ms | — | — | ~0 (native) | 98.2× | 3.94× |
| 4 | 🟢 | Rust AVX2 | 498.1/s | 401.6ms | — | — | ~0 (native) | 97.9× | 3.93× |
| 5 | 🟢 | Node.js | 126.7/s | 789.3ms | 781.0ms | 46.7MB | 53 B/op | 24.9× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 20.0/s | 49.3ms | 125.0ms | 81.9MB | 173.2 KB/op | 3.93× | 0.16× |
| 7 | 🟡 | Galerina governed ⟨interp⟩ | 13.0/s | 77.1ms | 126.0ms | 81.6MB | 916.7 KB/op | 2.55× | 0.10× |
| 8 | 🔴 | Python | 5.1/s | 3.93s | 3.92s | — | 23 B/op | 1.00× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (916.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 252.39M/s | 519.3ms | — | — | ~0 (native) | 79.9× | 1.94× |
| 🥈 | 🟢 | Rust AVX2 | 252.03M/s | 520.1ms | — | — | ~0 (native) | 79.8× | 1.94× |
| 🥉 | 🟢 | Node.js | 129.78M/s | 101.0ms | 94.0ms | 46.7MB | ~0 | 41.1× | 1.00× |
| 4 | 🟢 | WASM ▶ production | 121.06M/s | 1.08s | 1.08s | 83.9MB | ~0 | 38.3× | 0.93× |
| 5 | 🔴 | Python | 3.16M/s | 415.0ms | 421.9ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 97.3K/s | 673.5ms | 688.0ms | 84.1MB | 22 B/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 97.0K/s | 0.0ms | 0.0ms | 85.2MB | 9.5 KB/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 96.2K/s | 681.0ms | 703.0ms | 84.3MB | 20 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (9.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 12.90B/s | 77.5ms | — | — | ~0 (native) | 1.2K× | 183.4× |
| 🥈 | 🟢 | Rust (generic) | 4.32B/s | 231.6ms | — | — | ~0 (native) | 406.1× | 61.4× |
| 🥉 | 🟢 | WASM ▶ production | 419.43M/s | 1.00s | 1.00s | 87.5MB | ~0 | 39.4× | 5.96× |
| 4 | 🟢 | Node.js | 70.36M/s | 710.6ms | 719.0ms | 63.5MB | ~0 | 6.62× | 1.00× |
| 5 | 🟡 | Python | 10.63M/s | 4.70s | 4.70s | — | ~0 | 1.00× | 0.15× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.44M/s | 0.2ms | 0.0ms | 84.6MB | 138 B/op | 0.79× | 0.12× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.32M/s | 4.3ms | 0.0ms | 84.6MB | 14 B/op | 0.22× | 0.03× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.29M/s | 4.4ms | 78.0ms | 85.4MB | 16 B/op | 0.22× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (138 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 900.63M/s | 11.1ms |
| Rust (generic) | 884.18M/s | 11.3ms |
| Node.js | 2.11M/s | 47.3ms |
| Python | 20.1K/s | 4.98s |
| Galerina passive ⟨interp⟩ | 2.1K/s | 1.6ms |
| Galerina manifest ⟨interp⟩ | 1.0K/s | 0.9ms |
| Galerina governed ⟨interp⟩ | 810.0/s | 1.2ms |
| WASM ▶ production | 2.88M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 38.09M/s | 1.00s | 1.00s | 87.4MB | ~0 | — | 42.1× |
| 🥈 | 🟢 | Rust (generic) | 1.17M/s | 853.5ms | — | — | ~0 (native) | — | 1.30× |
| 🥉 | 🟢 | Rust AVX2 | 1.17M/s | 855.9ms | — | — | ~0 (native) | — | 1.29× |
| 4 | 🟢 | Node.js | 903.8K/s | 1.11s | 1.11s | 48.3MB | ~0 | — | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 108.8K/s | 9.2ms | 47.0ms | 85.3MB | 791 B/op | — | 0.12× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 5.0K/s | 0.2ms | 0.0ms | 85.0MB | 71.3 KB/op | — | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 4.5K/s | 0.2ms | 0.0ms | 84.9MB | 73.2 KB/op | — | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (73.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.11B/s | 163.6ms | — | — | ~0 | 2.1K× | 8.61× |
| 🥈 | 🟢 | Rust (generic) | 1.34B/s | 745.1ms | — | — | ~0 | 457.2× | 1.89× |
| 🥉 | 🟢 | Node.js | 710.20M/s | 70.4ms | 79.0ms | 46.5MB | ~0 | 242.0× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 467.71M/s | 1.00s | 1.00s | 87.4MB | ~0 | 159.3× | 0.66× |
| 5 | ⚫ | Python | 2.94M/s | 3.41s | 3.42s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 160.5K/s | 0.6ms | 0.0ms | 85.3MB | -4.2 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 134.4K/s | 74.4ms | 62.0ms | 85.9MB | 47 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 123.4K/s | 81.1ms | 109.0ms | 85.7MB | 55 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.2 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (55 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.19B/s | 4.20s | — | — | ~0 (native) | 201.7× | 1.21× |
| 🥈 | 🟢 | Rust AVX2 | 1.19B/s | 4.21s | — | — | ~0 (native) | 201.2× | 1.20× |
| 🥉 | 🟢 | Node.js | 985.48M/s | 507.4ms | 500.0ms | 46.9MB | ~0 | 167.0× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 472.80M/s | 1.06s | 1.06s | 88.1MB | ~0 | 80.1× | 0.48× |
| 5 | ⚫ | Python | 5.90M/s | 8.47s | 8.47s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.14M/s | 24.2ms | — | — | — | 0.70× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 377.0K/s | 0.2ms | 0.0ms | 85.5MB | 3.0 KB/op | 0.06× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 336.5K/s | 297.2ms | 312.0ms | 85.3MB | 8 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 326.0K/s | 306.7ms | 344.0ms | 85.4MB | 5 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.73B/s | 12.1ms | — | — | — | 243.4× | 2.80× |
| 🥈 | 🟢 | Rust (generic) | 1.52B/s | 86.5ms | — | — | ~0 (native) | 213.3× | 2.45× |
| 🥉 | 🟢 | Rust AVX2 | 1.42B/s | 92.3ms | — | — | ~0 (native) | 199.8× | 2.30× |
| 4 | 🟢 | Node.js | 617.74M/s | 212.2ms | 234.0ms | 48.4MB | ~0 | 86.9× | 1.00× |
| 5 | ⚪ | WASM ▶ production | 445.75M/s | 1.03s | 1.03s | 88.4MB | ~0 | 62.7× | 0.72× |
| 6 | 🔴 | Python | 7.11M/s | 1.84s | — | — | 8 B/op | 1.00× | 0.01× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 857.9K/s | 0.2ms | 0.0ms | 85.9MB | -5.0 KB/op | 0.12× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 702.4K/s | 46.6ms | 78.0ms | 85.7MB | 28 B/op | 0.10× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 663.2K/s | 49.4ms | 63.0ms | 85.8MB | 31 B/op | 0.09× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-5.0 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (31 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 4.7K/s | 21.4ms | 46.0ms | 85.7MB | -2.0 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.3K/s | 0.8ms | 0.0ms | 85.7MB | 193.1 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 86.0/s | 11.6ms | 16.0ms | 85.7MB | 349.4 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-2.0 KB/op) · **highest:** Galerina governed ⟨interp⟩ (349.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 75.0K/s | 1.3ms | 0.0ms | 87.7MB | -4.8 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.4K/s | 0.4ms | 0.0ms | 86.1MB | 147.6 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 909.0/s | 1.1ms | 0.0ms | 85.9MB | 167.4 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.8 KB/op) · **highest:** Galerina governed ⟨interp⟩ (167.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.39B/s | 430.7ms | — | — | ~0 (native) | 202.2× | 1.42× |
| 🥈 | 🟢 | Rust (generic) | 1.38B/s | 434.1ms | — | — | ~0 (native) | 200.7× | 1.41× |
| 🥉 | 🟢 | Node.js | 980.88M/s | 305.8ms | — | — | ~0 | 142.4× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 472.70M/s | 1.27s | 1.26s | 89.8MB | ~0 | 68.6× | 0.48× |
| 5 | ⚫ | Python | 6.89M/s | 1.74s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 345.0K/s | 1.5ms | 0.0ms | 86.2MB | 347 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 335.3K/s | 894.7ms | 938.0ms | 86.2MB | 2 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 325.3K/s | 922.4ms | 953.0ms | 86.1MB | ~0 | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (347 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 391.44M/s | 127.7ms | — | — | ~0 | 101.4× | 1.00× |
| 🥈 | ⚫ | Python | 3.86M/s | 777.2ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 268.8K/s | 0.7ms | 0.0ms | 89.0MB | 5.7 KB/op | 0.07× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 251.7K/s | 39.7ms | 31.0ms | 89.0MB | 61 B/op | 0.07× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 241.5K/s | 41.4ms | 62.0ms | 86.9MB | 213 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (5.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 317.82M/s | 6.3ms | 16.0ms | 47.4MB | ~0 | 200.8× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 54.28M/s | 1.84s | 1.84s | 89.4MB | ~0 | 34.3× | 0.17× |
| 🥉 | ⚫ | Python | 1.58M/s | 631.7ms | 625.0ms | — | ~0 | 1.00× | 0.00× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 64.0K/s | 0.1ms | 0.0ms | 88.3MB | 14.1 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 55.8K/s | 895.8ms | 906.0ms | 88.3MB | 40 B/op | 0.04× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 53.9K/s | 927.6ms | 1.03s | 88.4MB | 21 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (14.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.73M/s | 53.4ms | 62.0ms | 48.7MB | ~0 | 100.6× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 29.59M/s | 1.11s | 1.11s | 89.1MB | ~0 | 24.3× | 0.24× |
| 🥉 | ⚫ | Python | 1.22M/s | 1.34s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 64.9K/s | 0.3ms | 0.0ms | 88.3MB | -99.8 KB/op | 0.05× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 63.6K/s | 515.0ms | 515.0ms | 88.3MB | 10 B/op | 0.05× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 61.8K/s | 530.3ms | 578.0ms | 88.4MB | 48 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-99.8 KB/op) · **highest:** Galerina governed ⟨interp⟩ (48 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.41M/s | — | — | — | — | 7.61× | 1.00× |
| 🥈 | 🟡 | Python | 448.0K/s | — | — | — | 1 B/op | 1.00× | 0.13× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 8.4K/s | 0.4ms | 0.0ms | 94.6MB | 121.1 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 5.2K/s | 96.4ms | 156.0ms | 90.7MB | 1.9 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.9K/s | 102.8ms | 110.0ms | 87.9MB | 3.5 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (121.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 23.43M/s | 139.8ms | — | — | ~0 (native) | 153.4× | 3.76× |
| 🥈 | 🟢 | Rust (generic) | 23.42M/s | 139.9ms | — | — | ~0 (native) | 153.3× | 3.76× |
| 🥉 | 🟢 | WASM ▶ production | 9.09M/s | 1.80s | 1.81s | 91.4MB | ~0 | 59.5× | 1.46× |
| 4 | 🟢 | Node.js | 6.23M/s | 525.8ms | 532.0ms | 48.5MB | ~0 | 40.8× | 1.00× |
| 5 | 🔴 | Python | 152.8K/s | 21.45s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 7.5K/s | 0.2ms | 0.0ms | 90.9MB | 129.1 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 7.3K/s | 2.24s | 2.23s | 90.6MB | 72 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 7.3K/s | 2.24s | 2.28s | 90.9MB | 263 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (129.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 366.56M/s | 27.3ms | — | — | ~0 (native) | 210.4× | 1.53× |
| 🥈 | 🟢 | Rust AVX2 | 359.26M/s | 27.8ms | — | — | ~0 (native) | 206.2× | 1.50× |
| 🥉 | 🟢 | Node.js | 240.27M/s | 41.6ms | 47.0ms | 48.5MB | ~0 | 137.9× | 1.00× |
| 4 | ⚫ | Python | 1.74M/s | 5.74s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 581.01M/s | 1.17s | 1.17s | 92.2MB | ~0 | 189.5× | 9.62× |
| 🥈 | 🟢 | Node.js | 60.37M/s | 2.3ms | 0.0ms | 48.6MB | 3 B/op | 19.7× | 1.00× |
| 🥉 | 🟡 | Rust (generic) | 19.62M/s | 6.9ms | — | — | ~0 (native) | 6.40× | 0.32× |
| 4 | 🟡 | Rust AVX2 | 19.30M/s | 7.0ms | — | — | ~0 (native) | 6.30× | 0.32× |
| 5 | 🔴 | Python | 3.07M/s | 44.3ms | 46.9ms | — | ~0 | 1.00× | 0.05× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 398.1K/s | 0.1ms | 0.0ms | 91.1MB | 2.1 KB/op | 0.13× | 0.01× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 350.5K/s | 387.6ms | 375.0ms | 91.1MB | 12 B/op | 0.11× | 0.01× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 344.2K/s | 394.7ms | 437.0ms | 89.7MB | 16 B/op | 0.11× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 179.5K/s | 1.67s | — | — | ~0 (native) | 2.72× | 4.16× |
| 🥈 | 🟢 | Rust (generic) | 167.2K/s | 1.79s | — | — | ~0 (native) | 2.53× | 3.88× |
| 🥉 | 🟢 | Python | 66.0K/s | 1.52s | — | — | ~0 | 1.00× | 1.53× |
| 4 | 🟢 | Node.js | 43.1K/s | 6.96s | 8.33s | 64.3MB | 6 B/op | 0.65× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (6 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 114.0K/s | 1.75s | — | — | ~0 | 1.00× | — |

> 🧠 **Lowest heap/op:** Python (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.20s | 1.21× |
| 🥈 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.21s | 1.20× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 985.48M/s | 507.4ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 472.80M/s | 1.06s | 0.48× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.90M/s | 8.47s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.14M/s | 24.2ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 377.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 336.5K/s | 297.2ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 326.0K/s | 306.7ms | 0.00× |

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

| Benchmark | 🏆 Winner | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **🏆 winner** | **179× slower** | **65× slower** | **76× slower** | **82× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | C++ | 1.2× slower | 1.2× slower | **🏆 winner** | 2× slower | **483× slower** | **46.6K× slower** | **365× slower** | **365× slower** | 4× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.1× slower | **28× slower** | **858× slower** | **4.8K× slower** | **1.6K× slower** | **1.6K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | **21× slower** | **326× slower** | **137× slower** | **439× slower** | **482× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **147× slower** | **147× slower** | not run — no C++ impl | **578× slower** | **14.4K× slower** | **🏆 winner** | **3.7K× slower** | **5.6K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust (generic) | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 2× slower | **80× slower** | **2.6K× slower** | **2.6K× slower** | **2.6K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | not run — no C++ impl | **183× slower** | **1.2K× slower** | **1.5K× slower** | **5.6K× slower** | **5.6K× slower** | **31× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **33× slower** | **33× slower** | not run — no C++ impl | **42× slower** | not run | **350× slower** | **7.6K× slower** | **8.4K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | not run — no C++ impl | 9× slower | **2.1K× slower** | **38.1K× slower** | **49.6K× slower** | **45.5K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust (generic) | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 1.2× slower | **202× slower** | **3.2K× slower** | **3.7K× slower** | **3.5K× slower** | 3× slower | **288× slower** |
| **matrix-multiply** | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.2× slower | 1.1× slower | not run — no C++ impl | 3× slower | **243× slower** | **2.0K× slower** | **2.6K× slower** | **2.5K× slower** | 4× slower | **🏆 winner** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **🏆 winner** | 4× slower | **54× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **🏆 winner** | **31× slower** | **83× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 1.4× slower | **202× slower** | **4.0K× slower** | **4.3K× slower** | **4.2K× slower** | 3× slower | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | **101× slower** | **1.5K× slower** | **1.6K× slower** | **1.6K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | **201× slower** | **5.0K× slower** | **5.7K× slower** | **5.9K× slower** | 6× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | **101× slower** | **1.9K× slower** | **1.9K× slower** | **2.0K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | 8× slower | **408× slower** | **701× slower** | **657× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 4× slower | **153× slower** | **3.1K× slower** | **3.2K× slower** | **3.2K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 2× slower | **210× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **30× slower** | **30× slower** | not run — no C++ impl | 10× slower | **190× slower** | **1.5K× slower** | **1.7K× slower** | **1.7K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust AVX2 | **🏆 winner** | 1.1× slower | not run — no C++ impl | 4× slower | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Python | not run — no native impl | not run — no native impl | not run — no C++ impl | not run | **🏆 winner** | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 135.41M/s | 🏆 winner | 179× faster |
| 🥈 | C++ | 132.47M/s | 1.0× slower | 175× faster |
| 🥉 | Rust (generic) | 132.23M/s | 1.0× slower | 174× faster |
| 4 | Rust AVX2 | 129.27M/s | 1.0× slower | 170× faster |
| 5 | WASM ▶ production | 76.93M/s | 1.8× slower | 101× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 2.08M/s | 65× slower | 2.7× faster |
| 7 | Galerina manifest ⟨interp⟩ | 1.78M/s | 76× slower | 2.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 1.65M/s | 82× slower | 2.2× faster |
| 9 | Python | 758.6K/s | 179× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | C++ | 1.88B/s | 🏆 winner | 46.6K× faster |
| 🥈 | Rust AVX2 | 1.57B/s | 1.2× slower | 38.8K× faster |
| 🥉 | Rust (generic) | 1.56B/s | 1.2× slower | 38.6K× faster |
| 4 | Node.js | 972.69M/s | 1.9× slower | 24.1K× faster |
| 5 | WASM ▶ production | 495.15M/s | 3.8× slower | 12.2K× faster |
| 6 | Galerina governed ⟨interp⟩ | 5.16M/s | 365× slower | 128× faster |
| 7 | Galerina manifest ⟨interp⟩ | 5.15M/s | 365× slower | 127× faster |
| 8 | Python | 3.90M/s | 483× slower | 96× faster |
| 9 | Galerina passive ⟨interp⟩ ⚠️cache | 40.4K/s | 46.6K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 78.02M/s | 🏆 winner | 4.8K× faster |
| 🥈 | Rust AVX2 | 75.31M/s | 1.0× slower | 4.6K× faster |
| 🥉 | C++ | 68.97M/s | 1.1× slower | 4.2K× faster |
| 4 | WASM ▶ production | 36.48M/s | 2.1× slower | 2.2K× faster |
| 5 | Node.js | 2.83M/s | 28× slower | 174× faster |
| 6 | Python | 91.0K/s | 858× slower | 5.6× faster |
| 7 | Galerina governed ⟨interp⟩ | 48.2K/s | 1.6K× slower | 3.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 47.7K/s | 1.6K× slower | 2.9× faster |
| 9 | Galerina passive ⟨interp⟩ ⚠️cache | 16.3K/s | 4.8K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 482× faster |
| 🥈 | Rust (generic) | 1.17B/s | 1.0× slower | 481× faster |
| 🥉 | WASM ▶ production | 555.48M/s | 2.1× slower | 228× faster |
| 4 | Node.js | 55.24M/s | 21× slower | 23× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.59M/s | 137× slower | 3.5× faster |
| 6 | Python | 3.61M/s | 326× slower | 1.5× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.67M/s | 439× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.44M/s | 482× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 17.3K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 73.2K/s | 🏆 winner | 14.4K× faster |
| 🥈 | WASM ▶ production | 17.3K/s | 4.2× slower | 3.4K× faster |
| 🥉 | Rust (generic) | 499.6/s | 147× slower | 98× faster |
| 4 | Rust AVX2 | 498.1/s | 147× slower | 98× faster |
| 5 | Node.js | 126.7/s | 578× slower | 25× faster |
| 6 | Galerina manifest ⟨interp⟩ | 20.0/s | 3.7K× slower | 3.9× faster |
| 7 | Galerina governed ⟨interp⟩ | 13.0/s | 5.6K× slower | 2.6× faster |
| 8 | Python | 5.1/s | 14.4K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 252.39M/s | 🏆 winner | 2.6K× faster |
| 🥈 | Rust AVX2 | 252.03M/s | 1.0× slower | 2.6K× faster |
| 🥉 | Node.js | 129.78M/s | 1.9× slower | 1.3K× faster |
| 4 | WASM ▶ production | 121.06M/s | 2.1× slower | 1.3K× faster |
| 5 | Python | 3.16M/s | 80× slower | 33× faster |
| 6 | Galerina governed ⟨interp⟩ | 97.3K/s | 2.6K× slower | 1.0× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 97.0K/s | 2.6K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 96.2K/s | 2.6K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 12.90B/s | 🏆 winner | 5.6K× faster |
| 🥈 | Rust (generic) | 4.32B/s | 3.0× slower | 1.9K× faster |
| 🥉 | WASM ▶ production | 419.43M/s | 31× slower | 183× faster |
| 4 | Node.js | 70.36M/s | 183× slower | 31× faster |
| 5 | Python | 10.63M/s | 1.2K× slower | 4.6× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.44M/s | 1.5K× slower | 3.7× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.32M/s | 5.6K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.29M/s | 5.6K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 38.09M/s | 🏆 winner | 8.4K× faster |
| 🥈 | Rust (generic) | 1.17M/s | 33× slower | 258× faster |
| 🥉 | Rust AVX2 | 1.17M/s | 33× slower | 257× faster |
| 4 | Node.js | 903.8K/s | 42× slower | 199× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 108.8K/s | 350× slower | 24× faster |
| 6 | Galerina manifest ⟨interp⟩ | 5.0K/s | 7.6K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 4.5K/s | 8.4K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.11B/s | 🏆 winner | 49.6K× faster |
| 🥈 | Rust (generic) | 1.34B/s | 4.6× slower | 10.9K× faster |
| 🥉 | Node.js | 710.20M/s | 8.6× slower | 5.8K× faster |
| 4 | WASM ▶ production | 467.71M/s | 13× slower | 3.8K× faster |
| 5 | Python | 2.94M/s | 2.1K× slower | 24× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 160.5K/s | 38.1K× slower | 1.3× faster |
| 7 | Galerina governed ⟨interp⟩ | 134.4K/s | 45.5K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 123.4K/s | 49.6K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.19B/s | 🏆 winner | 3.7K× faster |
| 🥈 | Rust AVX2 | 1.19B/s | 1.0× slower | 3.6K× faster |
| 🥉 | Node.js | 985.48M/s | 1.2× slower | 3.0K× faster |
| 4 | WASM ▶ production | 472.80M/s | 2.5× slower | 1.5K× faster |
| 5 | Python | 5.90M/s | 202× slower | 18× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.14M/s | 288× slower | 13× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 377.0K/s | 3.2K× slower | 1.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 336.5K/s | 3.5K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 326.0K/s | 3.7K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.73B/s | 🏆 winner | 2.6K× faster |
| 🥈 | Rust (generic) | 1.52B/s | 1.1× slower | 2.3K× faster |
| 🥉 | Rust AVX2 | 1.42B/s | 1.2× slower | 2.1K× faster |
| 4 | Node.js | 617.74M/s | 2.8× slower | 931× faster |
| 5 | WASM ▶ production | 445.75M/s | 3.9× slower | 672× faster |
| 6 | Python | 7.11M/s | 243× slower | 11× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 857.9K/s | 2.0K× slower | 1.3× faster |
| 8 | Galerina governed ⟨interp⟩ | 702.4K/s | 2.5K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 663.2K/s | 2.6K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.3K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 4.7K/s | 🏆 winner | 54× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.3K/s | 3.6× slower | 15× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 86.0/s | 54× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 75.0K/s | 🏆 winner | 83× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.4K/s | 31× slower | 2.7× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 909.0/s | 83× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.39B/s | 🏆 winner | 4.3K× faster |
| 🥈 | Rust (generic) | 1.38B/s | 1.0× slower | 4.3K× faster |
| 🥉 | Node.js | 980.88M/s | 1.4× slower | 3.0K× faster |
| 4 | WASM ▶ production | 472.70M/s | 2.9× slower | 1.5K× faster |
| 5 | Python | 6.89M/s | 202× slower | 21× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 345.0K/s | 4.0K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 335.3K/s | 4.2K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 325.3K/s | 4.3K× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 391.44M/s | 🏆 winner | 1.6K× faster |
| 🥈 | Python | 3.86M/s | 101× slower | 16× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 268.8K/s | 1.5K× slower | 1.1× faster |
| 4 | Galerina manifest ⟨interp⟩ | 251.7K/s | 1.6K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 241.5K/s | 1.6K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 317.82M/s | 🏆 winner | 5.9K× faster |
| 🥈 | WASM ▶ production | 54.28M/s | 5.9× slower | 1.0K× faster |
| 🥉 | Python | 1.58M/s | 201× slower | 29× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 64.0K/s | 5.0K× slower | 1.2× faster |
| 5 | Galerina manifest ⟨interp⟩ | 55.8K/s | 5.7K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 53.9K/s | 5.9K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.73M/s | 🏆 winner | 2.0K× faster |
| 🥈 | WASM ▶ production | 29.59M/s | 4.1× slower | 479× faster |
| 🥉 | Python | 1.22M/s | 101× slower | 20× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 64.9K/s | 1.9K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 63.6K/s | 1.9K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 61.8K/s | 2.0K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.41M/s | 🏆 winner | 701× faster |
| 🥈 | Python | 448.0K/s | 7.6× slower | 92× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 8.4K/s | 408× slower | 1.7× faster |
| 4 | Galerina governed ⟨interp⟩ | 5.2K/s | 657× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.9K/s | 701× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 23.43M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust (generic) | 23.42M/s | 1.0× slower | 3.2K× faster |
| 🥉 | WASM ▶ production | 9.09M/s | 2.6× slower | 1.2K× faster |
| 4 | Node.js | 6.23M/s | 3.8× slower | 853× faster |
| 5 | Python | 152.8K/s | 153× slower | 21× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 7.5K/s | 3.1K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 7.3K/s | 3.2K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 7.3K/s | 3.2K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 366.56M/s | 🏆 winner | 210× faster |
| 🥈 | Rust AVX2 | 359.26M/s | 1.0× slower | 206× faster |
| 🥉 | Node.js | 240.27M/s | 1.5× slower | 138× faster |
| 4 | Python | 1.74M/s | 210× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 581.01M/s | 🏆 winner | 1.7K× faster |
| 🥈 | Node.js | 60.37M/s | 9.6× slower | 175× faster |
| 🥉 | Rust (generic) | 19.62M/s | 30× slower | 57× faster |
| 4 | Rust AVX2 | 19.30M/s | 30× slower | 56× faster |
| 5 | Python | 3.07M/s | 190× slower | 8.9× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 398.1K/s | 1.5K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 350.5K/s | 1.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 344.2K/s | 1.7K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 179.5K/s | 🏆 winner | 4.2× faster |
| 🥈 | Rust (generic) | 167.2K/s | 1.1× slower | 3.9× faster |
| 🥉 | Python | 66.0K/s | 2.7× slower | 1.5× faster |
| 4 | Node.js | 43.1K/s | 4.2× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 114.0K/s | 🏆 winner | — (slowest) |


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

