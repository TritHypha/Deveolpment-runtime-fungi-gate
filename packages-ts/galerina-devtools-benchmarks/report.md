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
- **Galerina/WASM legacy lane** — `galerina run` → WAT → WebAssembly. Retained as measured historical and differential evidence; it is not the current production target.

> **Taxonomy — read this before the governance numbers.** The three `⟨interp⟩` rows below are Stage-A diagnostic tiers. The WASM row is a legacy baseline. Production Galerina/SLIDE remains a separate admitted lane and is not manufactured from either observation.
- **Galerina governed ⟨interp⟩** — Stage-A: full governance tree-walker (capabilities + audit + proof rebuilt per call). *Diagnostic worst-case.*
- **Galerina manifest ⟨interp⟩** — Stage-A: pre-verified runtime manifest, governance erased at runtime. *Diagnostic.*
- **Galerina passive ⟨interp⟩** — Stage-A: pre-compiled deployment model with LRU result cache (warm path). *Diagnostic.*

---

## 1. Per-Metric Scoreboards

> Categories: 15 certified · 3 shape-only(→Memory) · 1 internal-ratio(Governance) · 11 uncertified — a cross-runtime ratio is shown only for work-equivalence-certified lanes.

### CPU Throughput — inner-ops/s (cross-runtime; certified lanes only)

> 🚦 **vs Rust / vs Node** compare the **Galerina/WASM legacy lane** to native. A traffic-light ratio
> appears ONLY for work-equivalence-certified benchmarks; `UNCERTIFIED` lanes show raw throughput and
> NO ratio (their N/work is not yet proven equivalent across runtimes).

| Benchmark | Galerina/WASM legacy lane | vs Rust | vs Node | Galerina governed ⟨interp⟩ | Implication |
|---|---|---|---|---|---|
| compute-mix | 78.28M/s | ⚪ 1.7× slower | ⚪ 1.7× slower | 1.64M/s | WASM near native |
| arithmetic-threshold | 497.09M/s | UNCERTIFIED | UNCERTIFIED | 5.19M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.85M/s | UNCERTIFIED | UNCERTIFIED | 50.6K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.3K/s | UNCERTIFIED | UNCERTIFIED | 13.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 122.54M/s | 🟡 2.1× slower | 🟢 1.1× slower | 95.7K/s | WASM usable |
| hardware-targets | 49.50M/s | UNCERTIFIED | UNCERTIFIED | 3.6K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 446.08M/s | 🟡 3.4× slower | ⚪ 1.4× slower | 771.6K/s | WASM usable |
| tri-logic | 474.08M/s | 🟡 3.0× slower | 🟡 2.0× slower | 331.5K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 233.1K/s | WASM not built for this lane yet |
| call-chain | 54.81M/s | 🟡 2.8× slower | 🟢 1.3× | 56.4K/s | WASM usable |
| nbody | 29.40M/s | — | 🟡 4.2× slower | 67.2K/s | WASM 2–10× under Node |
| mandelbrot | 9.15M/s | 🟡 2.6× slower | 🟢 1.4× | 8.3K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 18.56B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **Galerina/WASM legacy lane** (~0) | 2 B/op | ~0 | ~0 | 9 B/op | 10 B/op |
| collection-pipeline | **Galerina/WASM legacy lane** (~0) | ~0 | ~0 | ~0 | 5 B/op | 21 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 34 B/op | 64 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 8 B/op | 14 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | Galerina/WASM legacy lane | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust (generic) | 1.19B/s | 475.14M/s | 4.00M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 18.56B/s | 446.08M/s | 1.52B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the Galerina/WASM legacy lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (202.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 202.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (826.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 826.0/s |
| json-parse | records/s | **Node.js** (1.11M/s) | 1.11M/s | 760.5K/s | not run — no native impl | no WASM — strings/records | 5.4K/s |
| spore-container | containers/s | **Rust (generic)** (172.5K/s) | 49.5K/s | 87.9K/s | 172.5K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Python** (168.5K/s) | 145.5K/s | 168.5K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.4K/s) | 3.4K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (7.1K/s) | 7.1K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (18.2K/s) | 18.2K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (106.8K/s) | 106.8K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (340.0/s) | 340.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina/WASM legacy lane | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 628.0/s | 932.0/s | 3.18M/s | 0.67× governed/manifest (gov overhead ≈ 1.48×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | Galerina/WASM legacy lane | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **130.92M/s** | **133.12M/s** | not run — no C++ impl | **136.32M/s** | 1.08M/s | 2.24M/s | 1.73M/s | 1.64M/s | 78.28M/s | not run — no GPU path | 83.2× |
| arithmetic-threshold | not run — no AVX-512 | **1.56B/s** | **1.56B/s** | not run — no C++ impl | 992.87M/s | 5.34M/s | 21.4K/s | 5.18M/s | 5.19M/s | 497.09M/s | not run — no GPU path | 191.4× |
| six-digit-guess | not run — no AVX-512 | **74.82M/s** | **77.33M/s** | not run — no C++ impl | 2.90M/s | 116.2K/s | 16.6K/s | 50.5K/s | 50.6K/s | 36.85M/s | not run — no GPU path | 57.4× |
| record-allocation | not run — no AVX-512 | **1.19B/s** | **1.19B/s** | not run — no C++ impl | 59.48M/s | 5.35M/s | 8.32M/s | 2.67M/s | 2.33M/s | 559.83M/s | not run — no GPU path | 25.6× |
| fibonacci-recursive | not run — no AVX-512 | 507.3/s | 497.4/s | not run — no C++ impl | 126.4/s | 8.7/s | **34.0K/s** | 18.0/s | 13.0/s | 17.3K/s | not run — no GPU path | 9.72× |
| tower-of-hanoi | not run — no AVX-512 | **255.98M/s** | **255.48M/s** | not run — no C++ impl | 129.05M/s | 4.41M/s | 97.6K/s | 94.2K/s | 95.7K/s | 122.54M/s | not run — no GPU path | 1.3K× |
| collection-pipeline | not run — no AVX-512 | **13.26B/s** | 4.32B/s | not run — no C++ impl | 71.72M/s | 21.99M/s | 7.72M/s | 2.02M/s | 8.33M/s | 425.15M/s | not run — no GPU path | 8.61× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.19M/s | 1.19M/s | not run — no C++ impl | 921.4K/s | not run | 41.7K/s | 2.9K/s | 3.6K/s | **49.50M/s** | not run — no GPU path | 258.0× |
| low-memory | not run — no AVX-512 | **6.24B/s** | 1.36B/s | not run — no C++ impl | 716.00M/s | 5.78M/s | 169.3K/s | 123.0K/s | 148.0K/s | 474.42M/s | not run — no GPU path | 4.8K× |
| gpu-compute | not run — no AVX-512 | **1.19B/s** | **1.19B/s** | not run — no C++ impl | 999.79M/s | 12.73M/s | 407.0K/s | 361.6K/s | 345.8K/s | 475.14M/s | 4.00M/s | 2.9K× |
| matrix-multiply | not run — no AVX-512 | 1.44B/s | 1.51B/s | not run — no C++ impl | 623.25M/s | **18.56B/s** | 914.9K/s | 679.6K/s | 771.6K/s | 446.08M/s | 1.52B/s | 807.8× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.4K/s** | 1.9K/s | 202.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **28.6K/s** | 1.7K/s | 826.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.41B/s** | **1.41B/s** | not run — no C++ impl | 958.92M/s | 14.51M/s | 354.0K/s | 347.3K/s | 331.5K/s | 474.08M/s | not run — no GPU path | 2.9K× |
| verified-native-operation | not run — no AVX-512 | **3.71B/s** | 2.40B/s | not run — no C++ impl | 2.03B/s | 20.16M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **387.21M/s** | 7.00M/s | 283.5K/s | 243.4K/s | 233.1K/s | no WASM build | not run — no GPU path | 1.7K× |
| call-chain | not run — no AVX-512 | **153.23M/s** | **154.08M/s** | not run — no C++ impl | 42.40M/s | 2.25M/s | 60.0K/s | 55.9K/s | 56.4K/s | 54.81M/s | not run — no GPU path | 752.2× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.93M/s** | 1.89M/s | 67.5K/s | 65.3K/s | 67.2K/s | 29.40M/s | not run — no GPU path | 1.8K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **1.11M/s** | 760.5K/s | 10.2K/s | 5.5K/s | 5.4K/s | no WASM — strings/records | not run — no GPU path | 205.8× |
| mandelbrot | not run — no AVX-512 | **23.83M/s** | **23.76M/s** | not run — no C++ impl | 6.33M/s | 270.3K/s | 8.4K/s | 8.3K/s | 8.3K/s | 9.15M/s | not run — no GPU path | 764.5× |
| spectral-norm | not run — no AVX-512 | **372.75M/s** | **377.44M/s** | not run — no C++ impl | 240.52M/s | 3.40M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 20.05M/s | 20.27M/s | not run — no C++ impl | 73.79M/s | 5.20M/s | 442.9K/s | 391.2K/s | 367.6K/s | **584.67M/s** | not run — no GPU path | 200.7× |
| spore-container | not run — no AVX-512 | **171.2K/s** | **172.5K/s** | not run — no C++ impl | 49.5K/s | 87.9K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | 145.5K/s | **168.5K/s** | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.24B/s | — | — |
| 🥈 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.36B/s | — | — |
| 🥉 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 716.00M/s | — | 17KB |
| 4 | ⚪ | Galerina/WASM legacy lane | 0.00 bytes/op ⚡ ~0 — no boxing | 474.42M/s | — | 41KB |
| 5 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 5.78M/s | — | 272B |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 34 bytes/op ⚠ moderate | 148.0K/s | — | 343KB |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 64 bytes/op ⚠ moderate | 123.0K/s | — | 639KB |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 78 bytes/op ⚠ moderate | 169.3K/s | — | 784KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 53.9MB | 53.9MB | 5.0MB | 953KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 94.3MB | 94.3MB | 23.5MB | 200KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 94.2MB | 94.2MB | 26.9MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 93.9MB | 93.9MB | 26.7MB | 4.6MB |
| compute-mix | Galerina/WASM legacy lane | 85.5MB | 85.5MB | 19.7MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 54.3MB | 54.6MB | 4.3MB | 213KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 94.6MB | 94.6MB | 24.8MB | 108KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 94.5MB | 94.5MB | 23.6MB | 872KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 94.4MB | 94.4MB | 23.5MB | 876KB |
| arithmetic-threshold | Galerina/WASM legacy lane | 96.7MB | 96.7MB | 22.9MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 59.0MB | 59.0MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 95.2MB | 95.2MB | 25.6MB | 142KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 95.6MB | 95.6MB | 24.5MB | 1.2MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 95.3MB | 95.3MB | 23.5MB | 514KB |
| six-digit-guess | Galerina/WASM legacy lane | 97.1MB | 97.1MB | 23.3MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 55.4MB | 55.4MB | 4.4MB | 319KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 96.0MB | 96.0MB | 24.4MB | 501KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 95.9MB | 95.9MB | 23.6MB | 100KB |
| record-allocation | Galerina governed ⟨interp⟩ | 96.5MB | 96.5MB | 23.6MB | 90KB |
| record-allocation | Galerina/WASM legacy lane | 97.9MB | 97.9MB | 23.8MB | 49KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 53.4MB | 53.4MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 96.7MB | 96.7MB | 25.1MB | 90KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 96.7MB | 96.7MB | 24.6MB | 909KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 96.1MB | 96.1MB | 24.5MB | 850KB |
| fibonacci-recursive | Galerina/WASM legacy lane | 98.5MB | 98.5MB | 23.9MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 53.6MB | 53.6MB | 4.1MB | 15KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 96.8MB | 96.8MB | 30.0MB | 63KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 96.5MB | 96.5MB | 25.0MB | 2.3MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 96.6MB | 96.6MB | 23.4MB | 699KB |
| tower-of-hanoi | Galerina/WASM legacy lane | 99.0MB | 99.0MB | 23.1MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 70.0MB | 70.0MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 96.7MB | 96.7MB | 24.2MB | 773KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 97.7MB | 97.7MB | 23.0MB | 206KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 97.0MB | 97.0MB | 22.9MB | 49KB |
| collection-pipeline | Galerina/WASM legacy lane | 99.4MB | 99.4MB | 22.9MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 53.2MB | 53.2MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 83.9MB | 83.9MB | 23.5MB | 79KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 84.6MB | 84.6MB | 23.4MB | 501KB |
| governance-cost | Galerina governed ⟨interp⟩ | 83.0MB | 83.0MB | 23.5MB | 542KB |
| governance-cost | Galerina/WASM legacy lane | 82.9MB | 82.9MB | 23.3MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 55.2MB | 55.2MB | 4.5MB | 369KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 83.3MB | 83.3MB | 23.9MB | -210KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 84.0MB | 84.0MB | 23.3MB | 133KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 83.6MB | 83.6MB | 23.3MB | 123KB |
| hardware-targets | Galerina/WASM legacy lane | 85.7MB | 85.7MB | 23.5MB | 83KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 53.4MB | 53.4MB | 4.1MB | 17KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 85.8MB | 85.8MB | 25.2MB | 784KB |
| low-memory | Galerina manifest ⟨interp⟩ | 84.0MB | 84.0MB | 23.9MB | 639KB |
| low-memory | Galerina governed ⟨interp⟩ | 84.5MB | 84.5MB | 23.5MB | 343KB |
| low-memory | Galerina/WASM legacy lane | 85.7MB | 85.7MB | 23.5MB | 41KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 53.9MB | 53.9MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 84.8MB | 84.8MB | 24.2MB | 254KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 84.7MB | 84.7MB | 24.8MB | 1.4MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 84.6MB | 84.6MB | 23.8MB | 481KB |
| gpu-compute | Galerina/WASM legacy lane | 87.6MB | 87.6MB | 23.6MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 55.3MB | 55.3MB | 4.8MB | 704KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 86.7MB | 86.7MB | 24.2MB | 194KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 86.7MB | 86.7MB | 23.5MB | 138KB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 85.1MB | 85.1MB | 24.5MB | 1.1MB |
| matrix-multiply | Galerina/WASM legacy lane | 88.0MB | 88.0MB | 23.6MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 69.3MB | 69.3MB | 10.0MB | 4.1MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 86.8MB | 86.8MB | 24.4MB | 161KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 85.3MB | 85.3MB | 23.7MB | 282KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 85.2MB | 85.2MB | 23.7MB | 360KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 85.4MB | 85.4MB | 24.4MB | 370KB |
| text-html | Galerina manifest ⟨interp⟩ | 85.6MB | 85.6MB | 24.0MB | 196KB |
| text-html | Galerina governed ⟨interp⟩ | 85.5MB | 85.5MB | 24.0MB | 216KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 336KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 85.5MB | 85.5MB | 24.1MB | -1.2MB |
| tri-logic | Galerina manifest ⟨interp⟩ | 86.9MB | 86.9MB | 25.1MB | 1.3MB |
| tri-logic | Galerina governed ⟨interp⟩ | 86.9MB | 86.9MB | 25.4MB | 1.6MB |
| tri-logic | Galerina/WASM legacy lane | 88.5MB | 88.5MB | 24.1MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 27KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 92.1MB | 92.1MB | 28.7MB | 1.5MB |
| data-query | Galerina manifest ⟨interp⟩ | 90.5MB | 90.5MB | 25.4MB | 756KB |
| data-query | Galerina governed ⟨interp⟩ | 92.0MB | 92.0MB | 27.2MB | 2.6MB |
| call-chain | Rust AVX2 | — | — | — | — |
| call-chain | Rust (generic) | — | — | — | — |
| call-chain | Node.js | 53.4MB | 53.4MB | 4.2MB | 14KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 100.9MB | 100.9MB | 30.5MB | 148KB |
| call-chain | Galerina manifest ⟨interp⟩ | 100.9MB | 100.9MB | 31.8MB | 6.9MB |
| call-chain | Galerina governed ⟨interp⟩ | 101.2MB | 101.2MB | 31.7MB | 6.9MB |
| call-chain | Galerina/WASM legacy lane | 93.4MB | 93.4MB | 25.0MB | 1KB |
| nbody | Node.js | 55.6MB | 55.6MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 102.1MB | 102.1MB | 26.4MB | 267KB |
| nbody | Galerina manifest ⟨interp⟩ | 102.1MB | 102.1MB | 25.6MB | 682KB |
| nbody | Galerina governed ⟨interp⟩ | 99.4MB | 99.4MB | 26.4MB | 1.5MB |
| nbody | Galerina/WASM legacy lane | 102.1MB | 102.1MB | 25.2MB | 1KB |
| json-parse | Node.js | — | — | — | 251KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 100.8MB | 100.8MB | 27.9MB | 550KB |
| json-parse | Galerina manifest ⟨interp⟩ | 103.1MB | 103.1MB | 28.4MB | 3.0MB |
| json-parse | Galerina governed ⟨interp⟩ | 107.7MB | 107.7MB | 26.7MB | 1.8MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 55.3MB | 55.3MB | 4.5MB | 360KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 103.0MB | 103.0MB | 29.2MB | 196KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 103.0MB | 103.0MB | 28.5MB | 3.1MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 103.0MB | 103.0MB | 26.8MB | 1.2MB |
| mandelbrot | Galerina/WASM legacy lane | 103.4MB | 103.4MB | 25.9MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 55.0MB | 55.0MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 55.3MB | 55.3MB | 4.6MB | 429KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 103.1MB | 103.1MB | 28.1MB | 86KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 103.1MB | 103.1MB | 27.2MB | 1.9MB |
| binary-trees | Galerina governed ⟨interp⟩ | 100.9MB | 100.9MB | 26.5MB | 1.1MB |
| binary-trees | Galerina/WASM legacy lane | 105.1MB | 105.1MB | 25.6MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 71.2MB | 71.2MB | 9.0MB | 1.8MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 82.2MB | 82.2MB | 21.7MB | 11.1MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 136.3K ops/CPU-ms |
| compute-mix | Python | 5.04s | 5.05s | 100% | 1.1K ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.9ms | 16.0ms | 55% | 3.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.5ms | 62.0ms | 203% | 806.45 ops/CPU-ms |
| compute-mix | Galerina/WASM legacy lane | 1.28s | 1.28s | 100% | 78.0K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 20.1ms | 31.0ms | 154% | 645.2K ops/CPU-ms |
| arithmetic-threshold | Python | 3.75s | 3.75s | 100% | 5.3K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 12.2ms | 32.0ms | 262% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.2ms | 15.0ms | 123% | 4.2K ops/CPU-ms |
| arithmetic-threshold | Galerina/WASM legacy lane | 1.02s | 1.03s | 101% | 490.3K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 14.5ms | 0.0ms | 0% | — |
| six-digit-guess | Python | 361.9ms | 359.4ms | 99% | 117.06 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 832.4ms | 859.0ms | 103% | 48.97 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 831.9ms | 860.0ms | 103% | 48.92 ops/CPU-ms |
| six-digit-guess | Galerina/WASM legacy lane | 1.14s | 1.14s | 100% | 36.9K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.4ms | — | — | — |
| record-allocation | Rust (generic) | 8.4ms | — | — | — |
| record-allocation | Node.js | 3.4ms | 0.0ms | 0% | — |
| record-allocation | Python | 37.4ms | 31.3ms | 84% | 6.4K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 3.8ms | 15.0ms | 400% | 666.67 ops/CPU-ms |
| record-allocation | Galerina governed ⟨interp⟩ | 4.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 560.0K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 394.3ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 402.1ms | — | — | — |
| fibonacci-recursive | Node.js | 791.1ms | 797.0ms | 101% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 2.31s | 2.31s | 100% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 55.9ms | 125.0ms | 224% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 77.3ms | 110.0ms | 142% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina/WASM legacy lane | 1.04s | 1.05s | 101% | 17.21 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 512.0ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 513.0ms | — | — | — |
| tower-of-hanoi | Node.js | 101.6ms | 94.0ms | 93% | 139.4K ops/CPU-ms |
| tower-of-hanoi | Python | 296.9ms | 296.9ms | 100% | 4.4K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 696.0ms | 813.0ms | 117% | 80.61 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 685.0ms | 718.0ms | 105% | 91.27 ops/CPU-ms |
| tower-of-hanoi | Galerina/WASM legacy lane | 1.07s | 1.08s | 101% | 121.5K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 75.4ms | — | — | — |
| collection-pipeline | Rust (generic) | 231.4ms | — | — | — |
| collection-pipeline | Node.js | 697.2ms | 704.0ms | 101% | 71.0K ops/CPU-ms |
| collection-pipeline | Python | 2.27s | 2.28s | 100% | 21.9K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.9ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.9ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina/WASM legacy lane | 1.01s | 1.02s | 100% | 423.2K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.0ms | — | — | — |
| governance-cost | Rust (generic) | 11.2ms | — | — | — |
| governance-cost | Node.js | 47.1ms | 47.0ms | 100% | — |
| governance-cost | Python | 2.36s | 2.38s | 101% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 3.0ms | 46.0ms | 1521% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| governance-cost | Galerina/WASM legacy lane | 1.00s | 1.02s | 102% | — |
| hardware-targets | Rust AVX2 | 841.5ms | — | — | — |
| hardware-targets | Rust (generic) | 841.7ms | — | — | — |
| hardware-targets | Node.js | 1.09s | 1.08s | 99% | 927.64 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 24.0ms | 78.0ms | 325% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 47.0ms | 16786% | 0.02 ops/CPU-ms |
| hardware-targets | Galerina/WASM legacy lane | 1.00s | 1.02s | 102% | 48.7K ops/CPU-ms |
| low-memory | Rust AVX2 | 160.2ms | — | — | — |
| low-memory | Rust (generic) | 734.5ms | — | — | — |
| low-memory | Node.js | 69.8ms | 63.0ms | 90% | 793.6K ops/CPU-ms |
| low-memory | Python | 1.73s | 1.73s | 100% | 5.8K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 81.3ms | 125.0ms | 154% | 80.00 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 67.6ms | 62.0ms | 92% | 161.29 ops/CPU-ms |
| low-memory | Galerina/WASM legacy lane | 1.01s | 1.03s | 102% | 465.6K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.20s | — | — | — |
| gpu-compute | Rust (generic) | 4.19s | — | — | — |
| gpu-compute | Node.js | 500.1ms | 500.0ms | 100% | 1000.0K ops/CPU-ms |
| gpu-compute | Python | 3.93s | 3.94s | 100% | 12.7K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 276.6ms | 297.0ms | 107% | 336.70 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 289.1ms | 328.0ms | 113% | 304.88 ops/CPU-ms |
| gpu-compute | Galerina/WASM legacy lane | 1.05s | 1.05s | 99% | 477.6K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.0ms | — | — | — |
| matrix-multiply | Rust AVX2 | 90.9ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.8ms | — | — | — |
| matrix-multiply | Node.js | 210.3ms | 219.0ms | 104% | 598.5K ops/CPU-ms |
| matrix-multiply | Python | 0.7ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 48.2ms | 63.0ms | 131% | 520.13 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 42.5ms | 63.0ms | 148% | 520.13 ops/CPU-ms |
| matrix-multiply | Galerina/WASM legacy lane | 1.03s | 1.03s | 100% | 444.5K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 13.8ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 18.7ms | 16.0ms | 86% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 4.9ms | 16.0ms | 324% | 0.06 ops/CPU-ms |
| text-html | Galerina passive ⟨interp⟩ | 3.5ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 426.2ms | — | — | — |
| tri-logic | Rust (generic) | 426.5ms | — | — | — |
| tri-logic | Node.js | 312.9ms | — | — | — |
| tri-logic | Python | 827.1ms | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 3.3ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 863.9ms | 907.0ms | 105% | 330.76 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 904.9ms | 906.0ms | 100% | 331.13 ops/CPU-ms |
| tri-logic | Galerina/WASM legacy lane | 1.27s | 1.27s | 100% | 473.9K ops/CPU-ms |
| data-query | Node.js | 129.1ms | — | — | — |
| data-query | Python | 428.8ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 1.2ms | 16.0ms | 1318% | — |
| data-query | Galerina manifest ⟨interp⟩ | 41.1ms | 125.0ms | 304% | 80.00 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 42.9ms | 78.0ms | 182% | 128.20 ops/CPU-ms |
| call-chain | Rust AVX2 | 0.3ms | — | — | — |
| call-chain | Rust (generic) | 0.3ms | — | — | — |
| call-chain | Node.js | 1.2ms | 0.0ms | 0% | — |
| call-chain | Python | 22.2ms | 15.6ms | 70% | 3.2K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 893.8ms | 922.0ms | 103% | 54.23 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 887.0ms | 890.0ms | 100% | 56.18 ops/CPU-ms |
| call-chain | Galerina/WASM legacy lane | 1.82s | 1.83s | 100% | 54.7K ops/CPU-ms |
| nbody | Node.js | 53.3ms | 47.0ms | 88% | 139.4K ops/CPU-ms |
| nbody | Python | 869.1ms | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 502.1ms | 516.0ms | 103% | 63.50 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 487.4ms | 531.0ms | 109% | 61.71 ops/CPU-ms |
| nbody | Galerina/WASM legacy lane | 1.11s | 1.13s | 101% | 29.1K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 91.3ms | 156.0ms | 171% | 3.21 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 92.9ms | 156.0ms | 168% | 3.21 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 137.5ms | — | — | — |
| mandelbrot | Rust (generic) | 137.9ms | — | — | — |
| mandelbrot | Node.js | 517.8ms | 515.0ms | 99% | 6.4K ops/CPU-ms |
| mandelbrot | Python | 12.12s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 1.99s | 2.00s | 101% | 8.20 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 1.98s | 2.05s | 103% | 8.00 ops/CPU-ms |
| mandelbrot | Galerina/WASM legacy lane | 1.79s | 1.80s | 100% | 9.1K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.8ms | — | — | — |
| spectral-norm | Rust (generic) | 26.5ms | — | — | — |
| spectral-norm | Node.js | 41.6ms | 47.0ms | 113% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 2.94s | — | — | — |
| binary-trees | Rust AVX2 | 6.8ms | — | — | — |
| binary-trees | Rust (generic) | 6.7ms | — | — | — |
| binary-trees | Node.js | 1.8ms | 0.0ms | 0% | — |
| binary-trees | Python | 26.1ms | 15.6ms | 60% | 8.7K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 347.3ms | 437.0ms | 126% | 310.88 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 369.5ms | 422.0ms | 114% | 321.93 ops/CPU-ms |
| binary-trees | Galerina/WASM legacy lane | 1.16s | 1.16s | 100% | 587.1K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.75s | — | — | — |
| spore-container | Rust (generic) | 1.74s | — | — | — |
| spore-container | Node.js | 6.06s | 7.36s | 121% | 40.77 ops/CPU-ms |
| spore-container | Python | 1.14s | — | — | — |
| framework-pipeline | Node.js | 1.37s | 1.97s | 143% | 101.63 ops/CPU-ms |
| framework-pipeline | Python | 1.19s | — | — | — |
| http-throughput | Node.js | 89.0ms | — | — | — |
| naming-check | Node.js | 439.0ms | — | — | — |
| context-receipt | Node.js | 319.0ms | — | — | — |
| intelligence-search | Node.js | 47.0ms | — | — | — |
| provenance-trace | Node.js | 4.56s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 136.32M/s | 5.00s | 5.00s | 53.9MB | ~0 | 126.1× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 133.12M/s | 5.00s | — | — | ~0 (native) | 123.2× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 130.92M/s | 5.00s | — | — | ~0 (native) | 121.1× | 0.96× |
| 4 | ⚪ | Galerina/WASM legacy lane | 78.28M/s | 1.28s | 1.28s | 85.5MB | ~0 | 72.4× | 0.57× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.24M/s | 0.4ms | 0.0ms | 94.3MB | 246 B/op | 2.07× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.73M/s | 28.9ms | 16.0ms | 94.2MB | 91 B/op | 1.60× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.64M/s | 30.5ms | 62.0ms | 93.9MB | 92 B/op | 1.52× | 0.01× |
| 8 | ⚫ | Python | 1.08M/s | 5.04s | 5.05s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (246 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.56B/s | 12.8ms | — | — | ~0 (native) | 293.0× | 1.58× |
| 🥈 | 🟢 | Rust (generic) | 1.56B/s | 12.8ms | — | — | ~0 (native) | 292.9× | 1.57× |
| 🥉 | 🟢 | Node.js | 992.87M/s | 20.1ms | 31.0ms | 54.3MB | ~0 | 186.0× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 497.09M/s | 1.02s | 1.03s | 96.7MB | ~0 | 93.1× | 0.50× |
| 5 | ⚫ | Python | 5.34M/s | 3.75s | 3.75s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 5.19M/s | 12.2ms | 15.0ms | 94.4MB | 14 B/op | 0.97× | 0.01× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 5.18M/s | 12.2ms | 32.0ms | 94.5MB | 14 B/op | 0.97× | 0.01× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 21.4K/s | 0.1ms | 0.0ms | 94.6MB | 35.3 KB/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (35.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.33M/s | 0.5ms | — | — | ~0 (native) | 665.3× | 26.6× |
| 🥈 | 🟢 | Rust AVX2 | 74.82M/s | 0.6ms | — | — | ~0 (native) | 643.7× | 25.8× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 36.85M/s | 1.14s | 1.14s | 97.1MB | ~0 | 317.0× | 12.7× |
| 4 | 🟢 | Node.js | 2.90M/s | 14.5ms | 0.0ms | 59.0MB | 26 B/op | 25.0× | 1.00× |
| 5 | 🔴 | Python | 116.2K/s | 361.9ms | 359.4ms | — | ~0 | 1.00× | 0.04× |
| 6 | 🔴 | Galerina governed ⟨interp⟩ | 50.6K/s | 831.9ms | 860.0ms | 95.3MB | 12 B/op | 0.44× | 0.02× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 50.5K/s | 832.4ms | 859.0ms | 95.6MB | 28 B/op | 0.43× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 16.6K/s | 0.2ms | 0.0ms | 95.2MB | 46.4 KB/op | 0.14× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (46.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.19B/s | 8.4ms | — | — | ~0 (native) | 221.8× | 20.0× |
| 🥈 | 🟢 | Rust (generic) | 1.19B/s | 8.4ms | — | — | ~0 (native) | 221.5× | 19.9× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 559.83M/s | 1.00s | 1.00s | 97.9MB | ~0 | 104.6× | 9.41× |
| 4 | 🟢 | Node.js | 59.48M/s | 3.4ms | 0.0ms | 55.4MB | 2 B/op | 11.1× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.32M/s | 0.6ms | 0.0ms | 96.0MB | 95 B/op | 1.55× | 0.14× |
| 6 | 🔴 | Python | 5.35M/s | 37.4ms | 31.3ms | — | ~0 | 1.00× | 0.09× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.67M/s | 3.8ms | 15.0ms | 95.9MB | 10 B/op | 0.50× | 0.04× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.33M/s | 4.3ms | 0.0ms | 96.5MB | 9 B/op | 0.43× | 0.04× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (95 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 34.0K/s | 0.1ms | 0.0ms | 96.7MB | 17.7 KB/op | 3.9K× | 268.9× |
| 🥈 | 🟢 | Galerina/WASM legacy lane | 17.3K/s | 1.04s | 1.05s | 98.5MB | ~0 | 2.0K× | 137.1× |
| 🥉 | 🟢 | Rust AVX2 | 507.3/s | 394.3ms | — | — | ~0 (native) | 58.5× | 4.01× |
| 4 | 🟢 | Rust (generic) | 497.4/s | 402.1ms | — | — | ~0 (native) | 57.4× | 3.94× |
| 5 | 🟢 | Node.js | 126.4/s | 791.1ms | 797.0ms | 53.4MB | 53 B/op | 14.6× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 18.0/s | 55.9ms | 125.0ms | 96.7MB | 882.0 KB/op | 2.08× | 0.14× |
| 7 | 🟡 | Galerina governed ⟨interp⟩ | 13.0/s | 77.3ms | 110.0ms | 96.1MB | 826.3 KB/op | 1.50× | 0.10× |
| 8 | 🔴 | Python | 8.7/s | 2.31s | 2.31s | — | 23 B/op | 1.00× | 0.07× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina manifest ⟨interp⟩ (882.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 255.98M/s | 512.0ms | — | — | ~0 (native) | 58.0× | 1.98× |
| 🥈 | 🟢 | Rust (generic) | 255.48M/s | 513.0ms | — | — | ~0 (native) | 57.9× | 1.98× |
| 🥉 | 🟢 | Node.js | 129.05M/s | 101.6ms | 94.0ms | 53.6MB | ~0 | 29.2× | 1.00× |
| 4 | 🟢 | Galerina/WASM legacy lane | 122.54M/s | 1.07s | 1.08s | 99.0MB | ~0 | 27.8× | 0.95× |
| 5 | 🔴 | Python | 4.41M/s | 296.9ms | 296.9ms | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 97.6K/s | 0.1ms | 0.0ms | 96.8MB | 6.9 KB/op | 0.02× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 95.7K/s | 685.0ms | 718.0ms | 96.6MB | 11 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 94.2K/s | 696.0ms | 813.0ms | 96.5MB | 35 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (6.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.26B/s | 75.4ms | — | — | ~0 (native) | 603.1× | 184.9× |
| 🥈 | 🟢 | Rust (generic) | 4.32B/s | 231.4ms | — | — | ~0 (native) | 196.6× | 60.3× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 425.15M/s | 1.01s | 1.02s | 99.4MB | ~0 | 19.3× | 5.93× |
| 4 | 🟢 | Node.js | 71.72M/s | 697.2ms | 704.0ms | 70.0MB | ~0 | 3.26× | 1.00× |
| 5 | 🟡 | Python | 21.99M/s | 2.27s | 2.28s | — | ~0 | 1.00× | 0.31× |
| 6 | 🟡 | Galerina governed ⟨interp⟩ | 8.33M/s | 1.2ms | 0.0ms | 97.0MB | 5 B/op | 0.38× | 0.12× |
| 7 | 🟡 | Galerina passive ⟨interp⟩ | 7.72M/s | 0.9ms | 0.0ms | 96.7MB | 107 B/op | 0.35× | 0.11× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.02M/s | 4.9ms | 0.0ms | 97.7MB | 21 B/op | 0.09× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (107 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 907.32M/s | 11.0ms |
| Rust (generic) | 893.81M/s | 11.2ms |
| Node.js | 2.12M/s | 47.1ms |
| Python | 42.3K/s | 2.36s |
| Galerina passive ⟨interp⟩ | 2.1K/s | 3.0ms |
| Galerina manifest ⟨interp⟩ | 932.0/s | 1.1ms |
| Galerina governed ⟨interp⟩ | 628.0/s | 1.6ms |
| Galerina/WASM legacy lane | 3.18M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 49.50M/s | 1.00s | 1.02s | 85.7MB | ~0 | — | 53.7× |
| 🥈 | 🟢 | Rust AVX2 | 1.19M/s | 841.5ms | — | — | ~0 (native) | — | 1.29× |
| 🥉 | 🟢 | Rust (generic) | 1.19M/s | 841.7ms | — | — | ~0 (native) | — | 1.29× |
| 4 | 🟢 | Node.js | 921.4K/s | 1.09s | 1.08s | 55.2MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 41.7K/s | 24.0ms | 78.0ms | 83.3MB | -210 B/op | — | 0.05× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 3.6K/s | 0.3ms | 47.0ms | 83.6MB | 119.7 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 2.9K/s | 0.3ms | 0.0ms | 84.0MB | 129.5 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-210 B/op) · **highest:** Galerina manifest ⟨interp⟩ (129.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.24B/s | 160.2ms | — | — | ~0 | 1.1K× | 8.72× |
| 🥈 | 🟢 | Rust (generic) | 1.36B/s | 734.5ms | — | — | ~0 | 235.5× | 1.90× |
| 🥉 | 🟢 | Node.js | 716.00M/s | 69.8ms | 63.0ms | 53.4MB | ~0 | 123.9× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 474.42M/s | 1.01s | 1.03s | 85.7MB | ~0 | 82.1× | 0.66× |
| 5 | ⚫ | Python | 5.78M/s | 1.73s | 1.73s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 169.3K/s | 0.7ms | 0.0ms | 85.8MB | 6.1 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 148.0K/s | 67.6ms | 62.0ms | 84.5MB | 34 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 123.0K/s | 81.3ms | 125.0ms | 84.0MB | 64 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Rust AVX2 (~0) · **highest:** Galerina passive ⟨interp⟩ (6.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.19B/s | 4.19s | — | — | ~0 (native) | 93.6× | 1.19× |
| 🥈 | 🟢 | Rust AVX2 | 1.19B/s | 4.20s | — | — | ~0 (native) | 93.6× | 1.19× |
| 🥉 | 🟢 | Node.js | 999.79M/s | 500.1ms | 500.0ms | 53.9MB | ~0 | 78.5× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 475.14M/s | 1.05s | 1.05s | 87.6MB | ~0 | 37.3× | 0.48× |
| 5 | 🔴 | Python | 12.73M/s | 3.93s | 3.94s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.00M/s | 25.0ms | — | — | — | 0.31× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 407.0K/s | 0.3ms | 0.0ms | 84.8MB | 2.1 KB/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 361.6K/s | 276.6ms | 297.0ms | 84.7MB | 14 B/op | 0.03× | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 345.8K/s | 289.1ms | 328.0ms | 84.6MB | 5 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (2.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 18.56B/s | 0.7ms | — | — | 332 B/op | 1.00× | 29.8× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.52B/s | 13.8ms | — | — | — | 0.08× | 2.44× |
| 🥉 | 🟢 | Rust (generic) | 1.51B/s | 86.8ms | — | — | ~0 (native) | 0.08× | 2.42× |
| 4 | 🟢 | Rust AVX2 | 1.44B/s | 90.9ms | — | — | ~0 (native) | 0.08× | 2.31× |
| 5 | 🟢 | Node.js | 623.25M/s | 210.3ms | 219.0ms | 55.3MB | ~0 | 0.03× | 1.00× |
| 6 | ⚪ | Galerina/WASM legacy lane | 446.08M/s | 1.03s | 1.03s | 88.0MB | ~0 | 0.02× | 0.72× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 914.9K/s | 0.2ms | 0.0ms | 86.7MB | 1.1 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 771.6K/s | 42.5ms | 63.0ms | 85.1MB | 34 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 679.6K/s | 48.2ms | 63.0ms | 86.7MB | 4 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (1.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.4K/s | 18.7ms | 16.0ms | 86.8MB | 1.6 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.9K/s | 0.5ms | 0.0ms | 85.3MB | 275.1 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 202.0/s | 4.9ms | 16.0ms | 85.2MB | 352.7 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (1.6 KB/op) · **highest:** Galerina governed ⟨interp⟩ (352.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 28.6K/s | 3.5ms | 0.0ms | 85.4MB | 3.6 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 1.7K/s | 0.6ms | 0.0ms | 85.6MB | 191.8 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 826.0/s | 1.2ms | 0.0ms | 85.5MB | 211.3 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (3.6 KB/op) · **highest:** Galerina governed ⟨interp⟩ (211.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.41B/s | 426.2ms | — | — | ~0 (native) | 97.0× | 1.47× |
| 🥈 | 🟢 | Rust (generic) | 1.41B/s | 426.5ms | — | — | ~0 (native) | 97.0× | 1.47× |
| 🥉 | 🟢 | Node.js | 958.92M/s | 312.9ms | — | — | ~0 | 66.1× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 474.08M/s | 1.27s | 1.27s | 88.5MB | ~0 | 32.7× | 0.49× |
| 5 | 🔴 | Python | 14.51M/s | 827.1ms | — | — | — | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 354.0K/s | 3.3ms | 0.0ms | 85.5MB | -1.0 KB/op | 0.02× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 347.3K/s | 863.9ms | 907.0ms | 86.9MB | 4 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 331.5K/s | 904.9ms | 906.0ms | 86.9MB | 5 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-1.0 KB/op) · **highest:** Galerina governed ⟨interp⟩ (5 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 3.71B/s | — | — | — | ~0 (native) | 184.0× | 1.83× |
| 🥈 | 🟢 | Rust (generic) | 2.40B/s | — | — | — | ~0 (native) | 118.9× | 1.18× |
| 🥉 | 🟢 | Node.js | 2.03B/s | — | — | — | — | 100.8× | 1.00× |
| 4 | ⚫ | Python | 20.16M/s | — | — | — | — | 1.00× | 0.01× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 387.21M/s | 129.1ms | — | — | ~0 | 55.3× | 1.00× |
| 🥈 | 🔴 | Python | 7.00M/s | 428.8ms | — | — | — | 1.00× | 0.02× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 283.5K/s | 1.2ms | 16.0ms | 92.1MB | 4.2 KB/op | 0.04× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 243.4K/s | 41.1ms | 125.0ms | 90.5MB | 76 B/op | 0.03× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 233.1K/s | 42.9ms | 78.0ms | 92.0MB | 255 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (4.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 154.08M/s | 0.3ms | — | — | ~0 (native) | 68.5× | 3.63× |
| 🥈 | 🟢 | Rust AVX2 | 153.23M/s | 0.3ms | — | — | ~0 (native) | 68.1× | 3.61× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 54.81M/s | 1.82s | 1.83s | 93.4MB | ~0 | 24.4× | 1.29× |
| 4 | 🟢 | Node.js | 42.40M/s | 1.2ms | 0.0ms | 53.4MB | ~0 | 18.8× | 1.00× |
| 5 | 🔴 | Python | 2.25M/s | 22.2ms | 15.6ms | — | ~0 | 1.00× | 0.05× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 60.0K/s | 0.2ms | 0.0ms | 100.9MB | 12.8 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 56.4K/s | 887.0ms | 890.0ms | 101.2MB | 137 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 55.9K/s | 893.8ms | 922.0ms | 100.9MB | 139 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (12.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.93M/s | 53.3ms | 47.0ms | 55.6MB | ~0 | 65.2× | 1.00× |
| 🥈 | 🟡 | Galerina/WASM legacy lane | 29.40M/s | 1.11s | 1.13s | 102.1MB | ~0 | 15.6× | 0.24× |
| 🥉 | 🔴 | Python | 1.89M/s | 869.1ms | — | — | 12 B/op | 1.00× | 0.02× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 67.5K/s | 0.3ms | 0.0ms | 102.1MB | 14.4 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 67.2K/s | 487.4ms | 531.0ms | 99.4MB | 46 B/op | 0.04× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 65.3K/s | 502.1ms | 516.0ms | 102.1MB | 21 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (14.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 1.11M/s | — | — | — | — | 1.46× | 1.00× |
| 🥈 | ⚪ | Python | 760.5K/s | — | — | — | 1 B/op | 1.00× | 0.69× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 10.2K/s | 0.7ms | 0.0ms | 100.8MB | 79.0 KB/op | 0.01× | 0.01× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 5.5K/s | 91.3ms | 156.0ms | 103.1MB | 5.8 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 5.4K/s | 92.9ms | 156.0ms | 107.7MB | 3.4 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (79.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 23.83M/s | 137.5ms | — | — | ~0 (native) | 88.2× | 3.77× |
| 🥈 | 🟢 | Rust (generic) | 23.76M/s | 137.9ms | — | — | ~0 (native) | 87.9× | 3.75× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 9.15M/s | 1.79s | 1.80s | 103.4MB | ~0 | 33.8× | 1.45× |
| 4 | 🟢 | Node.js | 6.33M/s | 517.8ms | 515.0ms | 55.3MB | ~0 | 23.4× | 1.00× |
| 5 | 🔴 | Python | 270.3K/s | 12.12s | — | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 8.4K/s | 0.2ms | 0.0ms | 103.0MB | 104.6 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 8.3K/s | 1.98s | 2.05s | 103.0MB | 72 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 8.3K/s | 1.99s | 2.00s | 103.0MB | 191 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (104.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 377.44M/s | 26.5ms | — | — | ~0 (native) | 111.1× | 1.57× |
| 🥈 | 🟢 | Rust AVX2 | 372.75M/s | 26.8ms | — | — | ~0 (native) | 109.7× | 1.55× |
| 🥉 | 🟢 | Node.js | 240.52M/s | 41.6ms | 47.0ms | 55.0MB | ~0 | 70.8× | 1.00× |
| 4 | 🔴 | Python | 3.40M/s | 2.94s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 584.67M/s | 1.16s | 1.16s | 105.1MB | ~0 | 112.5× | 7.92× |
| 🥈 | 🟢 | Node.js | 73.79M/s | 1.8ms | 0.0ms | 55.3MB | 3 B/op | 14.2× | 1.00× |
| 🥉 | 🟡 | Rust (generic) | 20.27M/s | 6.7ms | — | — | ~0 (native) | 3.90× | 0.27× |
| 4 | 🟡 | Rust AVX2 | 20.05M/s | 6.8ms | — | — | ~0 (native) | 3.86× | 0.27× |
| 5 | 🔴 | Python | 5.20M/s | 26.1ms | 15.6ms | — | ~0 | 1.00× | 0.07× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 442.9K/s | 0.1ms | 0.0ms | 103.1MB | 1.6 KB/op | 0.09× | 0.01× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 391.2K/s | 347.3ms | 437.0ms | 103.1MB | 14 B/op | 0.08× | 0.01× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 367.6K/s | 369.5ms | 422.0ms | 100.9MB | 8 B/op | 0.07× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (1.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 172.5K/s | 1.74s | — | — | ~0 (native) | 1.96× | 3.49× |
| 🥈 | 🟢 | Rust AVX2 | 171.2K/s | 1.75s | — | — | ~0 (native) | 1.95× | 3.46× |
| 🥉 | 🟢 | Python | 87.9K/s | 1.14s | — | — | ~0 | 1.00× | 1.78× |
| 4 | 🟢 | Node.js | 49.5K/s | 6.06s | 7.36s | 71.2MB | 6 B/op | 0.56× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (6 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 168.5K/s | 1.19s | — | — | ~0 | 1.00× | 1.16× |
| 🥈 | 🟢 | Node.js | 145.5K/s | 1.37s | 1.97s | 82.2MB | 55 B/op | 0.86× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (55 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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

**Archived GPU evidence:** NVIDIA GeForce RTX 2060 executed the pinned Deno WebGPU lane
**Compute toolchain:** derived from results/latest.json; no live host probe is used while rendering.
**Deno WebGPU:** ✅ measured — real GPU dispatch (NVIDIA GeForce RTX 2060)
**Galerina GPU backend:** `not-implemented` — gpu-plan.ts emits a WGSL skeleton only; no dispatch path (pending Phase 38).

| # | 🚦 | Runtime | Device (🖥️ CPU / 🎮 GPU) | Throughput (kernel ops/s) | Wall | vs Node |
|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.19s | 1.19× |
| 🥈 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.20s | 1.19× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 999.79M/s | 500.1ms | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 🖥️ CPU (cpu (wasm)) | 475.14M/s | 1.05s | 0.48× |
| 5 | 🔴 | Python | 🖥️ CPU (cpu (serial)) | 12.73M/s | 3.93s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.00M/s | 25.0ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 407.0K/s | 0.3ms | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 361.6K/s | 276.6ms | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 345.8K/s | 289.1ms | 0.00× |

**GPU execution status (archived run):**

| Runtime | GPU path | Device | Status |
|---|---|---|---|
| Rust | wgpu (Vulkan/D3D12) | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Python | torch CUDA / cupy | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Node.js | WebGPU | 🖥️ CPU only | ⏳ toolchain required (no navigator.gpu in Node.js) |
| Deno | WebGPU (built-in) | 🎮 GPU (NVIDIA GeForce RTX 2060) | ✅ available — real GPU dispatch detected (Phase 38 ready) |
| **Galerina** | WebGPUComputePlan → WGSL | 🖥️ CPU (GPU pending) | ❌ **pending Phase 38** — stub only, no measured number (by design) |

> Per the project's honesty rule (same as the Runtime-in-Galerina 0% metric): no GPU number is shown until a backend actually executes. The **WASM/CPU** row above is legacy reference evidence, not a production SLIDE result.
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

| Benchmark | 🏆 Winner | Rust AVX2 | Rust (generic) | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | Galerina/WASM legacy lane | Deno WebGPU (NVIDIA GeForce RTX 2060) |
|---|---|---|---|---|---|---|---|---|---|---|
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **126× slower** | **61× slower** | **79× slower** | **83× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **293× slower** | **73.0K× slower** | **302× slower** | **302× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **27× slower** | **665× slower** | **4.6K× slower** | **1.5K× slower** | **1.5K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | **20× slower** | **222× slower** | **143× slower** | **445× slower** | **510× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **67× slower** | **68× slower** | **269× slower** | **3.9K× slower** | **🏆 winner** | **1.9K× slower** | **2.6K× slower** | 2× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **58× slower** | **2.6K× slower** | **2.7K× slower** | **2.7K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **185× slower** | **603× slower** | **1.7K× slower** | **6.6K× slower** | **1.6K× slower** | **31× slower** | not run — no GPU path |
| **hardware-targets** | Galerina/WASM legacy lane | **42× slower** | **42× slower** | **54× slower** | not run | **1.2K× slower** | **17.3K× slower** | **13.9K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | 9× slower | **1.1K× slower** | **36.9K× slower** | **50.7K× slower** | **42.2K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.2× slower | **94× slower** | **2.9K× slower** | **3.3K× slower** | **3.4K× slower** | 3× slower | **298× slower** |
| **matrix-multiply** | Python | **13× slower** | **12× slower** | **30× slower** | **🏆 winner** | **20.3K× slower** | **27.3K× slower** | **24.1K× slower** | **42× slower** | **12× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 3× slower | **27× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **17× slower** | **35× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.5× slower | **97× slower** | **4.0K× slower** | **4.1K× slower** | **4.2K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | 2× slower | 2× slower | **184× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **55× slower** | **1.4K× slower** | **1.6K× slower** | **1.7K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | **68× slower** | **2.6K× slower** | **2.8K× slower** | **2.7K× slower** | 3× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **65× slower** | **1.8K× slower** | **1.9K× slower** | **1.8K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 1.5× slower | **109× slower** | **202× slower** | **206× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **88× slower** | **2.9K× slower** | **2.9K× slower** | **2.9K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **111× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | Galerina/WASM legacy lane | **29× slower** | **29× slower** | 8× slower | **113× slower** | **1.3K× slower** | **1.5K× slower** | **1.6K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 3× slower | 2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Python | not run — no native impl | not run — no native impl | 1.2× slower | **🏆 winner** | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 136.32M/s | 🏆 winner | 126× faster |
| 🥈 | Rust (generic) | 133.12M/s | 1.0× slower | 123× faster |
| 🥉 | Rust AVX2 | 130.92M/s | 1.0× slower | 121× faster |
| 4 | Galerina/WASM legacy lane | 78.28M/s | 1.7× slower | 72× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.24M/s | 61× slower | 2.1× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.73M/s | 79× slower | 1.6× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.64M/s | 83× slower | 1.5× faster |
| 8 | Python | 1.08M/s | 126× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.56B/s | 🏆 winner | 73.0K× faster |
| 🥈 | Rust (generic) | 1.56B/s | 1.0× slower | 72.9K× faster |
| 🥉 | Node.js | 992.87M/s | 1.6× slower | 46.3K× faster |
| 4 | Galerina/WASM legacy lane | 497.09M/s | 3.1× slower | 23.2K× faster |
| 5 | Python | 5.34M/s | 293× slower | 249× faster |
| 6 | Galerina governed ⟨interp⟩ | 5.19M/s | 302× slower | 242× faster |
| 7 | Galerina manifest ⟨interp⟩ | 5.18M/s | 302× slower | 242× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 21.4K/s | 73.0K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.33M/s | 🏆 winner | 4.6K× faster |
| 🥈 | Rust AVX2 | 74.82M/s | 1.0× slower | 4.5K× faster |
| 🥉 | Galerina/WASM legacy lane | 36.85M/s | 2.1× slower | 2.2K× faster |
| 4 | Node.js | 2.90M/s | 27× slower | 174× faster |
| 5 | Python | 116.2K/s | 665× slower | 7.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 50.6K/s | 1.5K× slower | 3.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 50.5K/s | 1.5K× slower | 3.0× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 16.6K/s | 4.6K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.19B/s | 🏆 winner | 510× faster |
| 🥈 | Rust (generic) | 1.19B/s | 1.0× slower | 510× faster |
| 🥉 | Galerina/WASM legacy lane | 559.83M/s | 2.1× slower | 241× faster |
| 4 | Node.js | 59.48M/s | 20× slower | 26× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.32M/s | 143× slower | 3.6× faster |
| 6 | Python | 5.35M/s | 222× slower | 2.3× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.67M/s | 445× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.33M/s | 510× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina/WASM legacy lane at 17.3K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 34.0K/s | 🏆 winner | 3.9K× faster |
| 🥈 | Galerina/WASM legacy lane | 17.3K/s | 2.0× slower | 2.0K× faster |
| 🥉 | Rust AVX2 | 507.3/s | 67× slower | 59× faster |
| 4 | Rust (generic) | 497.4/s | 68× slower | 57× faster |
| 5 | Node.js | 126.4/s | 269× slower | 15× faster |
| 6 | Galerina manifest ⟨interp⟩ | 18.0/s | 1.9K× slower | 2.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 13.0/s | 2.6K× slower | 1.5× faster |
| 8 | Python | 8.7/s | 3.9K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 255.98M/s | 🏆 winner | 2.7K× faster |
| 🥈 | Rust (generic) | 255.48M/s | 1.0× slower | 2.7K× faster |
| 🥉 | Node.js | 129.05M/s | 2.0× slower | 1.4K× faster |
| 4 | Galerina/WASM legacy lane | 122.54M/s | 2.1× slower | 1.3K× faster |
| 5 | Python | 4.41M/s | 58× slower | 47× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 97.6K/s | 2.6K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 95.7K/s | 2.7K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 94.2K/s | 2.7K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.26B/s | 🏆 winner | 6.6K× faster |
| 🥈 | Rust (generic) | 4.32B/s | 3.1× slower | 2.1K× faster |
| 🥉 | Galerina/WASM legacy lane | 425.15M/s | 31× slower | 210× faster |
| 4 | Node.js | 71.72M/s | 185× slower | 35× faster |
| 5 | Python | 21.99M/s | 603× slower | 11× faster |
| 6 | Galerina governed ⟨interp⟩ | 8.33M/s | 1.6K× slower | 4.1× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 7.72M/s | 1.7K× slower | 3.8× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.02M/s | 6.6K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 49.50M/s | 🏆 winner | 17.3K× faster |
| 🥈 | Rust AVX2 | 1.19M/s | 42× slower | 416× faster |
| 🥉 | Rust (generic) | 1.19M/s | 42× slower | 416× faster |
| 4 | Node.js | 921.4K/s | 54× slower | 323× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 41.7K/s | 1.2K× slower | 15× faster |
| 6 | Galerina governed ⟨interp⟩ | 3.6K/s | 13.9K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.9K/s | 17.3K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.24B/s | 🏆 winner | 50.7K× faster |
| 🥈 | Rust (generic) | 1.36B/s | 4.6× slower | 11.1K× faster |
| 🥉 | Node.js | 716.00M/s | 8.7× slower | 5.8K× faster |
| 4 | Galerina/WASM legacy lane | 474.42M/s | 13× slower | 3.9K× faster |
| 5 | Python | 5.78M/s | 1.1K× slower | 47× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 169.3K/s | 36.9K× slower | 1.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 148.0K/s | 42.2K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 123.0K/s | 50.7K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.19B/s | 🏆 winner | 3.4K× faster |
| 🥈 | Rust AVX2 | 1.19B/s | 1.0× slower | 3.4K× faster |
| 🥉 | Node.js | 999.79M/s | 1.2× slower | 2.9K× faster |
| 4 | Galerina/WASM legacy lane | 475.14M/s | 2.5× slower | 1.4K× faster |
| 5 | Python | 12.73M/s | 94× slower | 37× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.00M/s | 298× slower | 12× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 407.0K/s | 2.9K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 361.6K/s | 3.3K× slower | 1.0× faster |
| 9 | Galerina governed ⟨interp⟩ | 345.8K/s | 3.4K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 18.56B/s | 🏆 winner | 27.3K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.52B/s | 12× slower | 2.2K× faster |
| 🥉 | Rust (generic) | 1.51B/s | 12× slower | 2.2K× faster |
| 4 | Rust AVX2 | 1.44B/s | 13× slower | 2.1K× faster |
| 5 | Node.js | 623.25M/s | 30× slower | 917× faster |
| 6 | Galerina/WASM legacy lane | 446.08M/s | 42× slower | 656× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 914.9K/s | 20.3K× slower | 1.3× faster |
| 8 | Galerina governed ⟨interp⟩ | 771.6K/s | 24.1K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 679.6K/s | 27.3K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.9K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.4K/s | 🏆 winner | 27× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.9K/s | 2.9× slower | 9.2× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 202.0/s | 27× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.7K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 28.6K/s | 🏆 winner | 35× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.7K/s | 17× slower | 2.1× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 826.0/s | 35× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.41B/s | 🏆 winner | 4.2K× faster |
| 🥈 | Rust (generic) | 1.41B/s | 1.0× slower | 4.2K× faster |
| 🥉 | Node.js | 958.92M/s | 1.5× slower | 2.9K× faster |
| 4 | Galerina/WASM legacy lane | 474.08M/s | 3.0× slower | 1.4K× faster |
| 5 | Python | 14.51M/s | 97× slower | 44× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 354.0K/s | 4.0K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 347.3K/s | 4.1K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 331.5K/s | 4.2K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 3.71B/s | 🏆 winner | 184× faster |
| 🥈 | Rust (generic) | 2.40B/s | 1.5× slower | 119× faster |
| 🥉 | Node.js | 2.03B/s | 1.8× slower | 101× faster |
| 4 | Python | 20.16M/s | 184× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 387.21M/s | 🏆 winner | 1.7K× faster |
| 🥈 | Python | 7.00M/s | 55× slower | 30× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 283.5K/s | 1.4K× slower | 1.2× faster |
| 4 | Galerina manifest ⟨interp⟩ | 243.4K/s | 1.6K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 233.1K/s | 1.7K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 154.08M/s | 🏆 winner | 2.8K× faster |
| 🥈 | Rust AVX2 | 153.23M/s | 1.0× slower | 2.7K× faster |
| 🥉 | Galerina/WASM legacy lane | 54.81M/s | 2.8× slower | 980× faster |
| 4 | Node.js | 42.40M/s | 3.6× slower | 758× faster |
| 5 | Python | 2.25M/s | 68× slower | 40× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 60.0K/s | 2.6K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 56.4K/s | 2.7K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 55.9K/s | 2.8K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.93M/s | 🏆 winner | 1.9K× faster |
| 🥈 | Galerina/WASM legacy lane | 29.40M/s | 4.2× slower | 450× faster |
| 🥉 | Python | 1.89M/s | 65× slower | 29× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 67.5K/s | 1.8K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 67.2K/s | 1.8K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 65.3K/s | 1.9K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 1.11M/s | 🏆 winner | 206× faster |
| 🥈 | Python | 760.5K/s | 1.5× slower | 141× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 10.2K/s | 109× slower | 1.9× faster |
| 4 | Galerina manifest ⟨interp⟩ | 5.5K/s | 202× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 5.4K/s | 206× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 23.83M/s | 🏆 winner | 2.9K× faster |
| 🥈 | Rust (generic) | 23.76M/s | 1.0× slower | 2.9K× faster |
| 🥉 | Galerina/WASM legacy lane | 9.15M/s | 2.6× slower | 1.1K× faster |
| 4 | Node.js | 6.33M/s | 3.8× slower | 767× faster |
| 5 | Python | 270.3K/s | 88× slower | 33× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.4K/s | 2.9K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 8.3K/s | 2.9K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 8.3K/s | 2.9K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 377.44M/s | 🏆 winner | 111× faster |
| 🥈 | Rust AVX2 | 372.75M/s | 1.0× slower | 110× faster |
| 🥉 | Node.js | 240.52M/s | 1.6× slower | 71× faster |
| 4 | Python | 3.40M/s | 111× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 584.67M/s | 🏆 winner | 1.6K× faster |
| 🥈 | Node.js | 73.79M/s | 7.9× slower | 201× faster |
| 🥉 | Rust (generic) | 20.27M/s | 29× slower | 55× faster |
| 4 | Rust AVX2 | 20.05M/s | 29× slower | 55× faster |
| 5 | Python | 5.20M/s | 113× slower | 14× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 442.9K/s | 1.3K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 391.2K/s | 1.5K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 367.6K/s | 1.6K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 172.5K/s | 🏆 winner | 3.5× faster |
| 🥈 | Rust AVX2 | 171.2K/s | 1.0× slower | 3.5× faster |
| 🥉 | Python | 87.9K/s | 2.0× slower | 1.8× faster |
| 4 | Node.js | 49.5K/s | 3.5× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 168.5K/s | 🏆 winner | 1.2× faster |
| 🥈 | Node.js | 145.5K/s | 1.2× slower | — (slowest) |


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

