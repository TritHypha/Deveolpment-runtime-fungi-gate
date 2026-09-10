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
| compute-mix | 77.91M/s | ⚪ 1.7× slower | ⚪ 1.7× slower | 1.63M/s | WASM near native |
| arithmetic-threshold | 489.24M/s | UNCERTIFIED | UNCERTIFIED | 5.35M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 35.98M/s | UNCERTIFIED | UNCERTIFIED | 50.4K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.2K/s | UNCERTIFIED | UNCERTIFIED | 14.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 121.82M/s | 🟡 2.1× slower | 🟢 1.1× slower | 98.3K/s | WASM usable |
| hardware-targets | 48.63M/s | UNCERTIFIED | UNCERTIFIED | 3.3K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 441.74M/s | 🟡 3.4× slower | ⚪ 1.4× slower | 717.7K/s | WASM usable |
| tri-logic | 468.48M/s | 🟡 3.0× slower | 🟡 2.1× slower | 345.7K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 238.6K/s | WASM not built for this lane yet |
| call-chain | 54.94M/s | 🟡 2.8× slower | 🟢 1.1× | 55.5K/s | WASM usable |
| nbody | 29.00M/s | — | 🟡 4.3× slower | 64.7K/s | WASM 2–10× under Node |
| mandelbrot | 9.12M/s | 🟡 2.6× slower | 🟢 1.3× | 8.5K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 4.16B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **Galerina/WASM legacy lane** (~0) | 1 B/op | ~0 | ~0 | 8 B/op | 8 B/op |
| collection-pipeline | **Galerina/WASM legacy lane** (~0) | ~0 | ~0 | ~0 | 5 B/op | 21 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 65 B/op | 203 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 15 B/op | 5 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | Galerina/WASM legacy lane | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.18B/s | 472.43M/s | 4.00M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 4.16B/s | 441.74M/s | 1.63B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the Galerina/WASM legacy lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (206.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 206.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (806.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 806.0/s |
| json-parse | records/s | **Node.js** (3.36M/s) | 3.36M/s | 752.0K/s | not run — no native impl | no WASM — strings/records | 5.6K/s |
| spore-container | containers/s | **Rust (generic)** (153.1K/s) | 49.8K/s | 87.9K/s | 153.1K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Python** (171.0K/s) | 146.5K/s | 171.0K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.3K/s) | 3.3K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.9K/s) | 6.9K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (18.1K/s) | 18.1K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (102.1K/s) | 102.1K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (337.0/s) | 337.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina/WASM legacy lane | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 561.0/s | 780.0/s | 3.05M/s | 0.72× governed/manifest (gov overhead ≈ 1.39×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | Galerina/WASM legacy lane | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **130.41M/s** | **132.55M/s** | not run — no C++ impl | **135.47M/s** | 1.05M/s | 2.23M/s | 1.77M/s | 1.63M/s | 77.91M/s | not run — no GPU path | 83.3× |
| arithmetic-threshold | not run — no AVX-512 | **1.57B/s** | **1.56B/s** | not run — no C++ impl | 966.11M/s | 5.33M/s | 19.8K/s | 5.36M/s | 5.35M/s | 489.24M/s | not run — no GPU path | 180.5× |
| six-digit-guess | not run — no AVX-512 | **74.43M/s** | **77.65M/s** | not run — no C++ impl | 2.90M/s | 115.5K/s | 14.6K/s | 51.4K/s | 50.4K/s | 35.98M/s | not run — no GPU path | 57.5× |
| record-allocation | not run — no AVX-512 | **1.18B/s** | **1.18B/s** | not run — no C++ impl | 61.22M/s | 4.52M/s | 8.20M/s | 6.25M/s | 2.06M/s | 547.89M/s | not run — no GPU path | 29.7× |
| fibonacci-recursive | not run — no AVX-512 | 503.9/s | 499.9/s | not run — no C++ impl | 127.5/s | 8.6/s | **32.2K/s** | 19.0/s | 14.0/s | 17.2K/s | not run — no GPU path | 9.10× |
| tower-of-hanoi | not run — no AVX-512 | **252.77M/s** | **252.75M/s** | not run — no C++ impl | 129.36M/s | 5.00M/s | 100.3K/s | 98.3K/s | 98.3K/s | 121.82M/s | not run — no GPU path | 1.3K× |
| collection-pipeline | not run — no AVX-512 | **12.50B/s** | 4.25B/s | not run — no C++ impl | 68.78M/s | 21.51M/s | 7.07M/s | 1.85M/s | 7.46M/s | 373.69M/s | not run — no GPU path | 9.22× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.17M/s | 1.17M/s | not run — no C++ impl | 887.0K/s | not run | 43.6K/s | 3.0K/s | 3.3K/s | **48.63M/s** | not run — no GPU path | 266.1× |
| low-memory | not run — no AVX-512 | **6.06B/s** | 1.30B/s | not run — no C++ impl | 715.66M/s | 5.71M/s | 166.5K/s | 75.5K/s | 129.9K/s | 457.63M/s | not run — no GPU path | 5.5K× |
| gpu-compute | not run — no AVX-512 | **1.18B/s** | **1.18B/s** | not run — no C++ impl | 984.69M/s | 12.15M/s | 424.0K/s | 346.2K/s | 336.3K/s | 472.43M/s | 4.00M/s | 2.9K× |
| matrix-multiply | not run — no AVX-512 | 1.43B/s | 1.51B/s | not run — no C++ impl | 611.30M/s | **4.16B/s** | 893.3K/s | 702.7K/s | 717.7K/s | 441.74M/s | 1.63B/s | 851.8× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.2K/s** | 1.8K/s | 206.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **30.7K/s** | 2.1K/s | 806.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.40B/s** | **1.39B/s** | not run — no C++ impl | 996.50M/s | 14.33M/s | 366.0K/s | 353.3K/s | 345.7K/s | 468.48M/s | not run — no GPU path | 2.9K× |
| verified-native-operation | not run — no AVX-512 | **3.52B/s** | 2.36B/s | not run — no C++ impl | 1.92B/s | 19.71M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **386.64M/s** | 6.99M/s | 296.5K/s | 249.6K/s | 238.6K/s | no WASM build | not run — no GPU path | 1.6K× |
| call-chain | not run — no AVX-512 | **151.01M/s** | **153.28M/s** | not run — no C++ impl | 49.75M/s | 2.42M/s | 61.5K/s | 57.0K/s | 55.5K/s | 54.94M/s | not run — no GPU path | 896.9× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **123.30M/s** | 1.81M/s | 66.2K/s | 64.6K/s | 64.7K/s | 29.00M/s | not run — no GPU path | 1.9K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.36M/s** | 752.0K/s | 10.1K/s | 5.5K/s | 5.6K/s | no WASM — strings/records | not run — no GPU path | 600.6× |
| mandelbrot | not run — no AVX-512 | **23.42M/s** | **23.46M/s** | not run — no C++ impl | 6.83M/s | 265.8K/s | 8.7K/s | 8.2K/s | 8.5K/s | 9.12M/s | not run — no GPU path | 802.6× |
| spectral-norm | not run — no AVX-512 | **372.25M/s** | **372.11M/s** | not run — no C++ impl | 243.36M/s | 3.33M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 20.07M/s | 19.78M/s | not run — no C++ impl | 76.82M/s | 5.26M/s | 452.4K/s | 378.3K/s | 382.1K/s | **586.86M/s** | not run — no GPU path | 201.1× |
| spore-container | not run — no AVX-512 | **151.5K/s** | **153.1K/s** | not run — no C++ impl | 49.8K/s | 87.9K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | 146.5K/s | **171.0K/s** | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -131.06 bytes/op ⚡ ~0 — no boxing | 166.5K/s | — | -1.3MB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.06B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.30B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 715.66M/s | — | 17KB |
| 5 | ⚪ | Galerina/WASM legacy lane | 0.00 bytes/op ⚡ ~0 — no boxing | 457.63M/s | — | 42KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 5.71M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 65 bytes/op ⚠ moderate | 129.9K/s | — | 652KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 203 bytes/op ✗ high — object per node | 75.5K/s | — | 2.0MB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 53.2MB | 53.5MB | 5.0MB | 947KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 94.2MB | 94.2MB | 23.7MB | 545KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 94.1MB | 94.1MB | 26.8MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 94.2MB | 94.2MB | 26.5MB | 4.6MB |
| compute-mix | Galerina/WASM legacy lane | 84.4MB | 84.4MB | 19.6MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 54.1MB | 54.4MB | 4.4MB | 235KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 94.6MB | 94.6MB | 24.6MB | 108KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 94.5MB | 94.5MB | 23.4MB | 871KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 94.4MB | 94.4MB | 23.4MB | 873KB |
| arithmetic-threshold | Galerina/WASM legacy lane | 97.3MB | 97.3MB | 22.8MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 58.7MB | 58.7MB | 5.9MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 95.3MB | 95.3MB | 25.5MB | 142KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 95.7MB | 95.7MB | 24.5MB | 1.3MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 95.4MB | 95.4MB | 24.4MB | 1.6MB |
| six-digit-guess | Galerina/WASM legacy lane | 97.1MB | 97.1MB | 23.1MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 55.1MB | 55.1MB | 4.4MB | 236KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 95.5MB | 95.5MB | 24.3MB | 501KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 96.5MB | 96.5MB | 23.4MB | 76KB |
| record-allocation | Galerina governed ⟨interp⟩ | 96.5MB | 96.5MB | 23.4MB | 82KB |
| record-allocation | Galerina/WASM legacy lane | 97.9MB | 97.9MB | 23.7MB | 49KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 53.3MB | 53.3MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 96.4MB | 96.4MB | 24.0MB | 90KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 96.4MB | 96.4MB | 25.5MB | 2.0MB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 96.1MB | 96.1MB | 24.4MB | 925KB |
| fibonacci-recursive | Galerina/WASM legacy lane | 98.5MB | 98.5MB | 23.7MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 53.2MB | 53.2MB | 4.1MB | 17KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 96.3MB | 96.3MB | 25.3MB | 63KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 96.2MB | 96.2MB | 24.5MB | 1.9MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 96.3MB | 96.3MB | 24.4MB | 1.9MB |
| tower-of-hanoi | Galerina/WASM legacy lane | 98.7MB | 98.7MB | 24.3MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 70.0MB | 70.0MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 96.6MB | 96.6MB | 24.1MB | 753KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 97.3MB | 97.3MB | 22.9MB | 206KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 96.2MB | 96.2MB | 22.8MB | 49KB |
| collection-pipeline | Galerina/WASM legacy lane | 98.4MB | 98.4MB | 22.8MB | 23KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 53.1MB | 53.1MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 83.4MB | 83.4MB | 24.5MB | 1.1MB |
| governance-cost | Galerina manifest ⟨interp⟩ | 84.9MB | 84.9MB | 23.3MB | 502KB |
| governance-cost | Galerina governed ⟨interp⟩ | 83.2MB | 83.2MB | 23.3MB | 542KB |
| governance-cost | Galerina/WASM legacy lane | 83.2MB | 83.2MB | 23.1MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 55.0MB | 55.0MB | 4.5MB | 333KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 83.9MB | 83.9MB | 23.7MB | -298KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 84.0MB | 84.0MB | 23.1MB | 133KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 83.6MB | 83.6MB | 23.1MB | 123KB |
| hardware-targets | Galerina/WASM legacy lane | 86.0MB | 86.0MB | 23.4MB | 84KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 53.4MB | 53.4MB | 4.1MB | 17KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 84.1MB | 84.1MB | 23.4MB | -1.3MB |
| low-memory | Galerina manifest ⟨interp⟩ | 84.2MB | 84.2MB | 25.1MB | 2.0MB |
| low-memory | Galerina governed ⟨interp⟩ | 84.8MB | 84.8MB | 23.7MB | 652KB |
| low-memory | Galerina/WASM legacy lane | 86.5MB | 86.5MB | 23.3MB | 42KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 53.4MB | 53.4MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 84.8MB | 84.8MB | 24.0MB | 254KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 84.7MB | 84.7MB | 23.5MB | 314KB |
| gpu-compute | Galerina governed ⟨interp⟩ | 84.8MB | 84.8MB | 23.6MB | 466KB |
| gpu-compute | Galerina/WASM legacy lane | 87.2MB | 87.2MB | 23.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 55.0MB | 55.0MB | 4.3MB | 144KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 84.8MB | 84.8MB | 25.0MB | 194KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 84.8MB | 84.8MB | 23.8MB | 567KB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 84.5MB | 84.5MB | 24.7MB | 1.5MB |
| matrix-multiply | Galerina/WASM legacy lane | 87.6MB | 87.6MB | 23.5MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 67.8MB | 67.8MB | 7.9MB | 2.1MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 85.0MB | 85.0MB | 24.2MB | 119KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 84.8MB | 84.8MB | 23.4MB | 204KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 84.8MB | 84.8MB | 23.5MB | 359KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 85.0MB | 85.0MB | 24.3MB | 370KB |
| text-html | Galerina manifest ⟨interp⟩ | 85.4MB | 85.4MB | 23.8MB | 196KB |
| text-html | Galerina governed ⟨interp⟩ | 85.3MB | 85.3MB | 23.9MB | 216KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 375KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 85.7MB | 85.7MB | 24.3MB | -1.2MB |
| tri-logic | Galerina manifest ⟨interp⟩ | 85.5MB | 85.5MB | 25.3MB | 1.6MB |
| tri-logic | Galerina governed ⟨interp⟩ | 85.4MB | 85.4MB | 24.2MB | 565KB |
| tri-logic | Galerina/WASM legacy lane | 87.8MB | 87.8MB | 24.0MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 27KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 90.8MB | 90.8MB | 28.8MB | 1.5MB |
| data-query | Galerina manifest ⟨interp⟩ | 90.4MB | 90.4MB | 25.4MB | 918KB |
| data-query | Galerina governed ⟨interp⟩ | 90.6MB | 90.6MB | 27.1MB | 2.6MB |
| call-chain | Rust AVX2 | — | — | — | — |
| call-chain | Rust (generic) | — | — | — | — |
| call-chain | Node.js | 53.5MB | 53.5MB | 4.2MB | 14KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 101.4MB | 101.4MB | 26.9MB | 148KB |
| call-chain | Galerina manifest ⟨interp⟩ | 101.4MB | 101.4MB | 28.1MB | 3.4MB |
| call-chain | Galerina governed ⟨interp⟩ | 101.2MB | 101.2MB | 28.0MB | 3.4MB |
| call-chain | Galerina/WASM legacy lane | 94.1MB | 94.1MB | 24.8MB | 1KB |
| nbody | Node.js | 55.7MB | 55.7MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 100.1MB | 100.1MB | 29.0MB | 267KB |
| nbody | Galerina manifest ⟨interp⟩ | 99.9MB | 99.9MB | 26.1MB | 1.3MB |
| nbody | Galerina governed ⟨interp⟩ | 100.1MB | 100.1MB | 26.8MB | 2.0MB |
| nbody | Galerina/WASM legacy lane | 102.7MB | 102.7MB | 25.1MB | 1KB |
| json-parse | Node.js | — | — | — | 254KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 101.4MB | 101.4MB | 29.9MB | 550KB |
| json-parse | Galerina manifest ⟨interp⟩ | 103.1MB | 103.1MB | 26.2MB | 957KB |
| json-parse | Galerina governed ⟨interp⟩ | 104.1MB | 104.1MB | 27.5MB | 2.7MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 55.2MB | 55.2MB | 5.1MB | 1.0MB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 104.8MB | 104.8MB | 28.1MB | 196KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 104.8MB | 104.8MB | 27.4MB | 2.2MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 104.5MB | 104.5MB | 26.7MB | 1.3MB |
| mandelbrot | Galerina/WASM legacy lane | 104.1MB | 104.1MB | 25.7MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 55.1MB | 55.1MB | 4.4MB | 294KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 55.4MB | 55.4MB | 4.6MB | 428KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 102.4MB | 102.4MB | 26.7MB | 86KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 102.3MB | 102.3MB | 25.9MB | 695KB |
| binary-trees | Galerina governed ⟨interp⟩ | 104.6MB | 104.6MB | 27.3MB | 2.0MB |
| binary-trees | Galerina/WASM legacy lane | 107.0MB | 107.0MB | 25.5MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 71.1MB | 71.1MB | 9.0MB | 1.8MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 81.6MB | 81.6MB | 21.9MB | 11.3MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 135.5K ops/CPU-ms |
| compute-mix | Python | 5.03s | 4.97s | 99% | 1.1K ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.3ms | 46.0ms | 163% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.8ms | 15.0ms | 49% | 3.3K ops/CPU-ms |
| compute-mix | Galerina/WASM legacy lane | 1.28s | 1.28s | 100% | 78.0K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.7ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 20.7ms | 16.0ms | 77% | 1.25M ops/CPU-ms |
| arithmetic-threshold | Python | 3.75s | 3.73s | 100% | 5.4K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 11.8ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 11.8ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina/WASM legacy lane | 1.03s | 1.03s | 100% | 490.8K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 14.5ms | 16.0ms | 110% | 2.6K ops/CPU-ms |
| six-digit-guess | Python | 364.3ms | 375.0ms | 103% | 112.19 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 819.1ms | 828.0ms | 101% | 50.81 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 834.5ms | 875.0ms | 105% | 48.08 ops/CPU-ms |
| six-digit-guess | Galerina/WASM legacy lane | 1.17s | 1.14s | 98% | 36.9K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.3ms | 0.0ms | 0% | — |
| record-allocation | Python | 44.3ms | 46.9ms | 106% | 4.3K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 4.8ms | 31.0ms | 639% | 322.58 ops/CPU-ms |
| record-allocation | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 550.0K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 396.9ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 400.1ms | — | — | — |
| fibonacci-recursive | Node.js | 784.5ms | 781.0ms | 100% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 2.33s | 2.33s | 100% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 52.0ms | 62.0ms | 119% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 73.4ms | 63.0ms | 86% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina/WASM legacy lane | 1.05s | 1.05s | 100% | 17.19 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 518.5ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 518.6ms | — | — | — |
| tower-of-hanoi | Node.js | 101.3ms | 109.0ms | 108% | 120.2K ops/CPU-ms |
| tower-of-hanoi | Python | 261.9ms | 265.6ms | 101% | 4.9K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 666.4ms | 672.0ms | 101% | 97.52 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 666.9ms | 688.0ms | 103% | 95.25 ops/CPU-ms |
| tower-of-hanoi | Galerina/WASM legacy lane | 1.08s | 1.08s | 100% | 121.6K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 80.0ms | — | — | — |
| collection-pipeline | Rust (generic) | 235.4ms | — | — | — |
| collection-pipeline | Node.js | 727.0ms | 718.0ms | 99% | 69.6K ops/CPU-ms |
| collection-pipeline | Python | 2.32s | 2.33s | 100% | 21.5K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 1.3ms | 46.0ms | 3555% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 5.4ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 1.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina/WASM legacy lane | 1.02s | 1.01s | 100% | 374.4K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.2ms | — | — | — |
| governance-cost | Rust (generic) | 11.3ms | — | — | — |
| governance-cost | Node.js | 48.9ms | 47.0ms | 96% | — |
| governance-cost | Python | 2.45s | 2.45s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 5.6ms | 0.0ms | 0% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.3ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.8ms | 0.0ms | 0% | — |
| governance-cost | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | — |
| hardware-targets | Rust AVX2 | 852.8ms | — | — | — |
| hardware-targets | Rust (generic) | 853.1ms | — | — | — |
| hardware-targets | Node.js | 1.13s | 1.13s | 100% | 888.89 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 22.9ms | 31.0ms | 135% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 48.6K ops/CPU-ms |
| low-memory | Rust AVX2 | 164.9ms | — | — | — |
| low-memory | Rust (generic) | 771.3ms | — | — | — |
| low-memory | Node.js | 69.9ms | 63.0ms | 90% | 793.6K ops/CPU-ms |
| low-memory | Python | 1.75s | 1.75s | 100% | 5.7K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 1.0ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 132.5ms | 188.0ms | 142% | 53.19 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 77.0ms | 109.0ms | 142% | 91.74 ops/CPU-ms |
| low-memory | Galerina/WASM legacy lane | 1.01s | 1.03s | 103% | 446.2K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.22s | — | — | — |
| gpu-compute | Rust (generic) | 4.23s | — | — | — |
| gpu-compute | Node.js | 507.8ms | 515.0ms | 101% | 970.9K ops/CPU-ms |
| gpu-compute | Python | 4.12s | 4.11s | 100% | 12.2K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 288.9ms | 312.0ms | 108% | 320.51 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 297.4ms | 422.0ms | 142% | 236.97 ops/CPU-ms |
| gpu-compute | Galerina/WASM legacy lane | 1.06s | 1.08s | 102% | 463.8K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.0ms | — | — | — |
| matrix-multiply | Rust AVX2 | 91.9ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.6ms | — | — | — |
| matrix-multiply | Node.js | 214.4ms | 188.0ms | 88% | 697.2K ops/CPU-ms |
| matrix-multiply | Python | 3.1ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 46.6ms | 63.0ms | 135% | 520.13 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 45.7ms | 63.0ms | 138% | 520.13 ops/CPU-ms |
| matrix-multiply | Galerina/WASM legacy lane | 1.04s | 1.05s | 101% | 438.2K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.9ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 19.3ms | 47.0ms | 243% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 4.9ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 3.3ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 430.0ms | — | — | — |
| tri-logic | Rust (generic) | 431.9ms | — | — | — |
| tri-logic | Node.js | 301.1ms | — | — | — |
| tri-logic | Python | 837.3ms | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 3.0ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 849.2ms | 844.0ms | 99% | 355.45 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 867.9ms | 922.0ms | 106% | 325.38 ops/CPU-ms |
| tri-logic | Galerina/WASM legacy lane | 1.28s | 1.27s | 99% | 473.9K ops/CPU-ms |
| data-query | Node.js | 129.3ms | — | — | — |
| data-query | Python | 429.5ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 40.1ms | 78.0ms | 195% | 128.20 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 41.9ms | 47.0ms | 112% | 212.77 ops/CPU-ms |
| call-chain | Rust AVX2 | 0.3ms | — | — | — |
| call-chain | Rust (generic) | 0.3ms | — | — | — |
| call-chain | Node.js | 1.0ms | 0.0ms | 0% | — |
| call-chain | Python | 20.6ms | 31.3ms | 151% | 1.6K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 877.0ms | 953.0ms | 109% | 52.47 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 901.4ms | 969.0ms | 108% | 51.60 ops/CPU-ms |
| call-chain | Galerina/WASM legacy lane | 1.82s | 1.83s | 100% | 54.7K ops/CPU-ms |
| nbody | Node.js | 53.1ms | 79.0ms | 149% | 83.0K ops/CPU-ms |
| nbody | Python | 906.9ms | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 507.0ms | 516.0ms | 102% | 63.50 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 506.4ms | 547.0ms | 108% | 59.91 ops/CPU-ms |
| nbody | Galerina/WASM legacy lane | 1.13s | 1.13s | 100% | 29.1K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 90.8ms | 94.0ms | 103% | 5.32 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 89.3ms | 109.0ms | 122% | 4.59 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 139.9ms | — | — | — |
| mandelbrot | Rust (generic) | 139.7ms | — | — | — |
| mandelbrot | Node.js | 480.1ms | 484.0ms | 101% | 6.8K ops/CPU-ms |
| mandelbrot | Python | 12.33s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 1.99s | 2.02s | 101% | 8.13 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 1.93s | 1.97s | 102% | 8.32 ops/CPU-ms |
| mandelbrot | Galerina/WASM legacy lane | 1.80s | 1.78s | 99% | 9.2K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.9ms | — | — | — |
| spectral-norm | Rust (generic) | 26.9ms | — | — | — |
| spectral-norm | Node.js | 41.1ms | 31.0ms | 75% | 322.6K ops/CPU-ms |
| spectral-norm | Python | 3.00s | — | — | — |
| binary-trees | Rust AVX2 | 6.8ms | — | — | — |
| binary-trees | Rust (generic) | 6.9ms | — | — | — |
| binary-trees | Node.js | 1.8ms | 0.0ms | 0% | — |
| binary-trees | Python | 25.8ms | 31.3ms | 121% | 4.3K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 359.1ms | 422.0ms | 118% | 321.93 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 355.6ms | 375.0ms | 105% | 362.28 ops/CPU-ms |
| binary-trees | Galerina/WASM legacy lane | 1.16s | 1.16s | 100% | 587.1K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.98s | — | — | — |
| spore-container | Rust (generic) | 1.96s | — | — | — |
| spore-container | Node.js | 6.03s | 7.39s | 123% | 40.60 ops/CPU-ms |
| spore-container | Python | 1.14s | — | — | — |
| framework-pipeline | Node.js | 1.37s | 2.16s | 158% | 92.72 ops/CPU-ms |
| framework-pipeline | Python | 1.17s | — | — | — |
| http-throughput | Node.js | 91.0ms | — | — | — |
| naming-check | Node.js | 451.0ms | — | — | — |
| context-receipt | Node.js | 321.0ms | — | — | — |
| intelligence-search | Node.js | 49.0ms | — | — | — |
| provenance-trace | Node.js | 4.61s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 135.47M/s | 5.00s | 5.00s | 53.2MB | ~0 | 128.5× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 132.55M/s | 5.00s | — | — | ~0 (native) | 125.7× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 130.41M/s | 5.00s | — | — | ~0 (native) | 123.7× | 0.96× |
| 4 | ⚪ | Galerina/WASM legacy lane | 77.91M/s | 1.28s | 1.28s | 84.4MB | ~0 | 73.9× | 0.58× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.23M/s | 0.4ms | 0.0ms | 94.2MB | 679 B/op | 2.12× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.77M/s | 28.3ms | 46.0ms | 94.1MB | 91 B/op | 1.68× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.63M/s | 30.8ms | 15.0ms | 94.2MB | 92 B/op | 1.54× | 0.01× |
| 8 | ⚫ | Python | 1.05M/s | 5.03s | 4.97s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (679 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.57B/s | 12.7ms | — | — | ~0 (native) | 294.2× | 1.62× |
| 🥈 | 🟢 | Rust (generic) | 1.56B/s | 12.8ms | — | — | ~0 (native) | 293.3× | 1.62× |
| 🥉 | 🟢 | Node.js | 966.11M/s | 20.7ms | 16.0ms | 54.1MB | ~0 | 181.1× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 489.24M/s | 1.03s | 1.03s | 97.3MB | ~0 | 91.7× | 0.51× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 5.36M/s | 11.8ms | 0.0ms | 94.5MB | 14 B/op | 1.00× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 5.35M/s | 11.8ms | 0.0ms | 94.4MB | 14 B/op | 1.00× | 0.01× |
| 7 | ⚫ | Python | 5.33M/s | 3.75s | 3.73s | — | ~0 | 1.00× | 0.01× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 19.8K/s | 0.2ms | 0.0ms | 94.6MB | 35.3 KB/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (35.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.65M/s | 0.5ms | — | — | ~0 (native) | 672.4× | 26.8× |
| 🥈 | 🟢 | Rust AVX2 | 74.43M/s | 0.6ms | — | — | ~0 (native) | 644.5× | 25.7× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 35.98M/s | 1.17s | 1.14s | 97.1MB | ~0 | 311.5× | 12.4× |
| 4 | 🟢 | Node.js | 2.90M/s | 14.5ms | 16.0ms | 58.7MB | 27 B/op | 25.1× | 1.00× |
| 5 | 🔴 | Python | 115.5K/s | 364.3ms | 375.0ms | — | ~0 | 1.00× | 0.04× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 51.4K/s | 819.1ms | 828.0ms | 95.7MB | 31 B/op | 0.44× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 50.4K/s | 834.5ms | 875.0ms | 95.4MB | 38 B/op | 0.44× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 14.6K/s | 0.2ms | 0.0ms | 95.3MB | 46.4 KB/op | 0.13× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (46.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.18B/s | 8.5ms | — | — | ~0 (native) | 260.5× | 19.2× |
| 🥈 | 🟢 | Rust AVX2 | 1.18B/s | 8.5ms | — | — | ~0 (native) | 260.4× | 19.2× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 547.89M/s | 1.00s | 1.00s | 97.9MB | ~0 | 121.2× | 8.95× |
| 4 | 🟢 | Node.js | 61.22M/s | 3.3ms | 0.0ms | 55.1MB | 1 B/op | 13.5× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.20M/s | 0.7ms | 0.0ms | 95.5MB | 94 B/op | 1.81× | 0.13× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 6.25M/s | 1.6ms | 0.0ms | 96.5MB | 8 B/op | 1.38× | 0.10× |
| 7 | 🔴 | Python | 4.52M/s | 44.3ms | 46.9ms | — | ~0 | 1.00× | 0.07× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.06M/s | 4.8ms | 31.0ms | 96.5MB | 8 B/op | 0.46× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (94 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 32.2K/s | 0.2ms | 0.0ms | 96.4MB | 17.7 KB/op | 3.8K× | 252.8× |
| 🥈 | 🟢 | Galerina/WASM legacy lane | 17.2K/s | 1.05s | 1.05s | 98.5MB | ~0 | 2.0K× | 135.0× |
| 🥉 | 🟢 | Rust AVX2 | 503.9/s | 396.9ms | — | — | ~0 (native) | 58.8× | 3.95× |
| 4 | 🟢 | Rust (generic) | 499.9/s | 400.1ms | — | — | ~0 (native) | 58.3× | 3.92× |
| 5 | 🟢 | Node.js | 127.5/s | 784.5ms | 781.0ms | 53.3MB | 53 B/op | 14.9× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 19.0/s | 52.0ms | 62.0ms | 96.4MB | 1956.1 KB/op | 2.22× | 0.15× |
| 7 | 🟡 | Galerina governed ⟨interp⟩ | 14.0/s | 73.4ms | 63.0ms | 96.1MB | 878.9 KB/op | 1.63× | 0.11× |
| 8 | 🔴 | Python | 8.6/s | 2.33s | 2.33s | — | 23 B/op | 1.00× | 0.07× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina manifest ⟨interp⟩ (1956.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 252.77M/s | 518.5ms | — | — | ~0 (native) | 50.5× | 1.95× |
| 🥈 | 🟢 | Rust (generic) | 252.75M/s | 518.6ms | — | — | ~0 (native) | 50.5× | 1.95× |
| 🥉 | 🟢 | Node.js | 129.36M/s | 101.3ms | 109.0ms | 53.2MB | ~0 | 25.8× | 1.00× |
| 4 | 🟢 | Galerina/WASM legacy lane | 121.82M/s | 1.08s | 1.08s | 98.7MB | ~0 | 24.3× | 0.94× |
| 5 | 🔴 | Python | 5.00M/s | 261.9ms | 265.6ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 100.3K/s | 0.1ms | 0.0ms | 96.3MB | 6.9 KB/op | 0.02× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 98.3K/s | 666.4ms | 672.0ms | 96.2MB | 30 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 98.3K/s | 666.9ms | 688.0ms | 96.3MB | 28 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (6.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 12.50B/s | 80.0ms | — | — | ~0 (native) | 581.2× | 181.8× |
| 🥈 | 🟢 | Rust (generic) | 4.25B/s | 235.4ms | — | — | ~0 (native) | 197.5× | 61.8× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 373.69M/s | 1.02s | 1.01s | 98.4MB | ~0 | 17.4× | 5.43× |
| 4 | 🟢 | Node.js | 68.78M/s | 727.0ms | 718.0ms | 70.0MB | ~0 | 3.20× | 1.00× |
| 5 | 🟡 | Python | 21.51M/s | 2.32s | 2.33s | — | ~0 | 1.00× | 0.31× |
| 6 | 🟡 | Galerina governed ⟨interp⟩ | 7.46M/s | 1.3ms | 0.0ms | 96.2MB | 5 B/op | 0.35× | 0.11× |
| 7 | 🟡 | Galerina passive ⟨interp⟩ | 7.07M/s | 1.3ms | 46.0ms | 96.6MB | 82 B/op | 0.33× | 0.10× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 1.85M/s | 5.4ms | 0.0ms | 97.3MB | 21 B/op | 0.09× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (82 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 889.97M/s | 11.2ms |
| Rust (generic) | 887.20M/s | 11.3ms |
| Node.js | 2.05M/s | 48.9ms |
| Python | 40.9K/s | 2.45s |
| Galerina passive ⟨interp⟩ | 1.5K/s | 5.6ms |
| Galerina manifest ⟨interp⟩ | 780.0/s | 1.3ms |
| Galerina governed ⟨interp⟩ | 561.0/s | 1.8ms |
| Galerina/WASM legacy lane | 3.05M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 48.63M/s | 1.00s | 1.00s | 86.0MB | ~0 | — | 54.8× |
| 🥈 | 🟢 | Rust AVX2 | 1.17M/s | 852.8ms | — | — | ~0 (native) | — | 1.32× |
| 🥉 | 🟢 | Rust (generic) | 1.17M/s | 853.1ms | — | — | ~0 (native) | — | 1.32× |
| 4 | 🟢 | Node.js | 887.0K/s | 1.13s | 1.13s | 55.0MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 43.6K/s | 22.9ms | 31.0ms | 83.9MB | -298 B/op | — | 0.05× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 3.3K/s | 0.3ms | 0.0ms | 83.6MB | 119.7 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 3.0K/s | 0.3ms | 0.0ms | 84.0MB | 129.5 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-298 B/op) · **highest:** Galerina manifest ⟨interp⟩ (129.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.06B/s | 164.9ms | — | — | ~0 | 1.1K× | 8.47× |
| 🥈 | 🟢 | Rust (generic) | 1.30B/s | 771.3ms | — | — | ~0 | 227.2× | 1.81× |
| 🥉 | 🟢 | Node.js | 715.66M/s | 69.9ms | 63.0ms | 53.4MB | ~0 | 125.4× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 457.63M/s | 1.01s | 1.03s | 86.5MB | ~0 | 80.2× | 0.64× |
| 5 | ⚫ | Python | 5.71M/s | 1.75s | 1.75s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 166.5K/s | 1.0ms | 0.0ms | 84.1MB | -8.0 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 129.9K/s | 77.0ms | 109.0ms | 84.8MB | 65 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 75.5K/s | 132.5ms | 188.0ms | 84.2MB | 203 B/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-8.0 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (203 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 4.22s | — | — | ~0 (native) | 97.5× | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 1.18B/s | 4.23s | — | — | ~0 (native) | 97.3× | 1.20× |
| 🥉 | 🟢 | Node.js | 984.69M/s | 507.8ms | 515.0ms | 53.4MB | ~0 | 81.1× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 472.43M/s | 1.06s | 1.08s | 87.2MB | ~0 | 38.9× | 0.48× |
| 5 | 🔴 | Python | 12.15M/s | 4.12s | 4.11s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.00M/s | 25.0ms | — | — | — | 0.33× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 424.0K/s | 0.3ms | 0.0ms | 84.8MB | 2.0 KB/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 346.2K/s | 288.9ms | 312.0ms | 84.7MB | 3 B/op | 0.03× | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 336.3K/s | 297.4ms | 422.0ms | 84.8MB | 5 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (2.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 4.16B/s | 3.1ms | — | — | 332 B/op | 1.00× | 6.81× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 12.9ms | — | — | — | 0.39× | 2.66× |
| 🥉 | 🟢 | Rust (generic) | 1.51B/s | 86.6ms | — | — | ~0 (native) | 0.36× | 2.47× |
| 4 | 🟢 | Rust AVX2 | 1.43B/s | 91.9ms | — | — | ~0 (native) | 0.34× | 2.33× |
| 5 | 🟢 | Node.js | 611.30M/s | 214.4ms | 188.0ms | 55.0MB | ~0 | 0.15× | 1.00× |
| 6 | ⚪ | Galerina/WASM legacy lane | 441.74M/s | 1.04s | 1.05s | 87.6MB | ~0 | 0.11× | 0.72× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 893.3K/s | 0.2ms | 0.0ms | 84.8MB | 1.1 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 717.7K/s | 45.7ms | 63.0ms | 84.5MB | 45 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 702.7K/s | 46.6ms | 63.0ms | 84.8MB | 17 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (1.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.2K/s | 19.3ms | 47.0ms | 85.0MB | 1.2 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.8K/s | 0.6ms | 0.0ms | 84.8MB | 198.9 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 206.0/s | 4.9ms | 0.0ms | 84.8MB | 350.3 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (1.2 KB/op) · **highest:** Galerina governed ⟨interp⟩ (350.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 30.7K/s | 3.3ms | 0.0ms | 85.0MB | 3.6 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.1K/s | 0.5ms | 0.0ms | 85.4MB | 191.8 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 806.0/s | 1.2ms | 0.0ms | 85.3MB | 211.3 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (3.6 KB/op) · **highest:** Galerina governed ⟨interp⟩ (211.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.40B/s | 430.0ms | — | — | ~0 (native) | 97.3× | 1.40× |
| 🥈 | 🟢 | Rust (generic) | 1.39B/s | 431.9ms | — | — | ~0 (native) | 96.9× | 1.39× |
| 🥉 | 🟢 | Node.js | 996.50M/s | 301.1ms | — | — | ~0 | 69.5× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 468.48M/s | 1.28s | 1.27s | 87.8MB | ~0 | 32.7× | 0.47× |
| 5 | 🔴 | Python | 14.33M/s | 837.3ms | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 366.0K/s | 3.0ms | 0.0ms | 85.7MB | -1.1 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 353.3K/s | 849.2ms | 844.0ms | 85.5MB | 5 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 345.7K/s | 867.9ms | 922.0ms | 85.4MB | 2 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-1.1 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (5 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 3.52B/s | — | — | — | ~0 (native) | 178.6× | 1.84× |
| 🥈 | 🟢 | Rust (generic) | 2.36B/s | — | — | — | ~0 (native) | 119.5× | 1.23× |
| 🥉 | 🟢 | Node.js | 1.92B/s | — | — | — | — | 97.3× | 1.00× |
| 4 | 🔴 | Python | 19.71M/s | — | — | — | — | 1.00× | 0.01× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 386.64M/s | 129.3ms | — | — | ~0 | 55.4× | 1.00× |
| 🥈 | 🔴 | Python | 6.99M/s | 429.5ms | — | — | — | 1.00× | 0.02× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 296.5K/s | 1.2ms | 0.0ms | 90.8MB | 4.0 KB/op | 0.04× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 249.6K/s | 40.1ms | 78.0ms | 90.4MB | 92 B/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 238.6K/s | 41.9ms | 47.0ms | 90.6MB | 257 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (4.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 153.28M/s | 0.3ms | — | — | ~0 (native) | 63.3× | 3.08× |
| 🥈 | 🟢 | Rust AVX2 | 151.01M/s | 0.3ms | — | — | ~0 (native) | 62.3× | 3.04× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 54.94M/s | 1.82s | 1.83s | 94.1MB | ~0 | 22.7× | 1.10× |
| 4 | 🟢 | Node.js | 49.75M/s | 1.0ms | 0.0ms | 53.5MB | ~0 | 20.5× | 1.00× |
| 5 | 🔴 | Python | 2.42M/s | 20.6ms | 31.3ms | — | ~0 | 1.00× | 0.05× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 61.5K/s | 0.2ms | 0.0ms | 101.4MB | 12.4 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 57.0K/s | 877.0ms | 953.0ms | 101.4MB | 68 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 55.5K/s | 901.4ms | 969.0ms | 101.2MB | 67 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (12.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 123.30M/s | 53.1ms | 79.0ms | 55.7MB | ~0 | 68.3× | 1.00× |
| 🥈 | 🟡 | Galerina/WASM legacy lane | 29.00M/s | 1.13s | 1.13s | 102.7MB | ~0 | 16.1× | 0.24× |
| 🥉 | 🔴 | Python | 1.81M/s | 906.9ms | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 66.2K/s | 0.3ms | 0.0ms | 100.1MB | 13.7 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 64.7K/s | 506.4ms | 547.0ms | 100.1MB | 61 B/op | 0.04× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 64.6K/s | 507.0ms | 516.0ms | 99.9MB | 40 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (13.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.36M/s | — | — | — | — | 4.47× | 1.00× |
| 🥈 | 🟡 | Python | 752.0K/s | — | — | — | 1 B/op | 1.00× | 0.22× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 10.1K/s | 0.7ms | 0.0ms | 101.4MB | 80.4 KB/op | 0.01× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 5.6K/s | 89.3ms | 109.0ms | 104.1MB | 5.2 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 5.5K/s | 90.8ms | 94.0ms | 103.1MB | 1.9 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (80.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 23.46M/s | 139.7ms | — | — | ~0 (native) | 88.3× | 3.44× |
| 🥈 | 🟢 | Rust AVX2 | 23.42M/s | 139.9ms | — | — | ~0 (native) | 88.1× | 3.43× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 9.12M/s | 1.80s | 1.78s | 104.1MB | ~0 | 34.3× | 1.34× |
| 4 | 🟢 | Node.js | 6.83M/s | 480.1ms | 484.0ms | 55.2MB | ~0 | 25.7× | 1.00× |
| 5 | 🔴 | Python | 265.8K/s | 12.33s | — | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 8.7K/s | 0.2ms | 0.0ms | 104.8MB | 102.5 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 8.5K/s | 1.93s | 1.97s | 104.5MB | 78 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 8.2K/s | 1.99s | 2.02s | 104.8MB | 133 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (102.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 372.25M/s | 26.9ms | — | — | ~0 (native) | 111.7× | 1.53× |
| 🥈 | 🟢 | Rust (generic) | 372.11M/s | 26.9ms | — | — | ~0 (native) | 111.7× | 1.53× |
| 🥉 | 🟢 | Node.js | 243.36M/s | 41.1ms | 31.0ms | 55.1MB | ~0 | 73.0× | 1.00× |
| 4 | 🔴 | Python | 3.33M/s | 3.00s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 586.86M/s | 1.16s | 1.16s | 107.0MB | ~0 | 111.5× | 7.64× |
| 🥈 | 🟢 | Node.js | 76.82M/s | 1.8ms | 0.0ms | 55.4MB | 3 B/op | 14.6× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 20.07M/s | 6.8ms | — | — | ~0 (native) | 3.81× | 0.26× |
| 4 | 🟡 | Rust (generic) | 19.78M/s | 6.9ms | — | — | ~0 (native) | 3.76× | 0.26× |
| 5 | 🔴 | Python | 5.26M/s | 25.8ms | 31.3ms | — | ~0 | 1.00× | 0.07× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 452.4K/s | 0.1ms | 0.0ms | 102.4MB | 1.6 KB/op | 0.09× | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 382.1K/s | 355.6ms | 375.0ms | 104.6MB | 15 B/op | 0.07× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 378.3K/s | 359.1ms | 422.0ms | 102.3MB | 5 B/op | 0.07× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (1.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 153.1K/s | 1.96s | — | — | ~0 (native) | 1.74× | 3.08× |
| 🥈 | 🟢 | Rust AVX2 | 151.5K/s | 1.98s | — | — | ~0 (native) | 1.72× | 3.04× |
| 🥉 | 🟢 | Python | 87.9K/s | 1.14s | — | — | ~0 | 1.00× | 1.77× |
| 4 | 🟢 | Node.js | 49.8K/s | 6.03s | 7.39s | 71.1MB | 6 B/op | 0.57× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (6 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 171.0K/s | 1.17s | — | — | ~0 | 1.00× | 1.17× |
| 🥈 | 🟢 | Node.js | 146.5K/s | 1.37s | 2.16s | 81.6MB | 57 B/op | 0.86× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (57 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.22s | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.23s | 1.20× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 984.69M/s | 507.8ms | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 🖥️ CPU (cpu (wasm)) | 472.43M/s | 1.06s | 0.48× |
| 5 | 🔴 | Python | 🖥️ CPU (cpu (serial)) | 12.15M/s | 4.12s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.00M/s | 25.0ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 424.0K/s | 0.3ms | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 346.2K/s | 288.9ms | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 336.3K/s | 297.4ms | 0.00× |

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
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **129× slower** | **61× slower** | **77× slower** | **83× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **294× slower** | **79.4K× slower** | **293× slower** | **293× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **27× slower** | **672× slower** | **5.3K× slower** | **1.5K× slower** | **1.5K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust (generic) | **🏆 winner** | **🏆 winner** | **19× slower** | **260× slower** | **144× slower** | **188× slower** | **571× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **64× slower** | **64× slower** | **253× slower** | **3.8K× slower** | **🏆 winner** | **1.7K× slower** | **2.3K× slower** | 2× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **51× slower** | **2.5K× slower** | **2.6K× slower** | **2.6K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **182× slower** | **581× slower** | **1.8K× slower** | **6.8K× slower** | **1.7K× slower** | **33× slower** | not run — no GPU path |
| **hardware-targets** | Galerina/WASM legacy lane | **41× slower** | **41× slower** | **55× slower** | not run | **1.1K× slower** | **16.0K× slower** | **14.6K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | 8× slower | **1.1K× slower** | **36.4K× slower** | **80.3K× slower** | **46.7K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **97× slower** | **2.8K× slower** | **3.4K× slower** | **3.5K× slower** | 3× slower | **296× slower** |
| **matrix-multiply** | Python | 3× slower | 3× slower | 7× slower | **🏆 winner** | **4.7K× slower** | **5.9K× slower** | **5.8K× slower** | 9× slower | 3× slower |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 3× slower | **25× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **15× slower** | **38× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.4× slower | **97× slower** | **3.8K× slower** | **3.9K× slower** | **4.0K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | 1.5× slower | 2× slower | **179× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **55× slower** | **1.3K× slower** | **1.5K× slower** | **1.6K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Rust (generic) | **🏆 winner** | **🏆 winner** | 3× slower | **63× slower** | **2.5K× slower** | **2.7K× slower** | **2.8K× slower** | 3× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **68× slower** | **1.9K× slower** | **1.9K× slower** | **1.9K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 4× slower | **333× slower** | **611× slower** | **601× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust (generic) | **🏆 winner** | **🏆 winner** | 3× slower | **88× slower** | **2.7K× slower** | **2.9K× slower** | **2.8K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **112× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | Galerina/WASM legacy lane | **29× slower** | **30× slower** | 8× slower | **112× slower** | **1.3K× slower** | **1.6K× slower** | **1.5K× slower** | **🏆 winner** | not run — no GPU path |
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
| 🥇 | Node.js | 135.47M/s | 🏆 winner | 129× faster |
| 🥈 | Rust (generic) | 132.55M/s | 1.0× slower | 126× faster |
| 🥉 | Rust AVX2 | 130.41M/s | 1.0× slower | 124× faster |
| 4 | Galerina/WASM legacy lane | 77.91M/s | 1.7× slower | 74× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.23M/s | 61× slower | 2.1× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.77M/s | 77× slower | 1.7× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.63M/s | 83× slower | 1.5× faster |
| 8 | Python | 1.05M/s | 129× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.57B/s | 🏆 winner | 79.4K× faster |
| 🥈 | Rust (generic) | 1.56B/s | 1.0× slower | 79.2K× faster |
| 🥉 | Node.js | 966.11M/s | 1.6× slower | 48.9K× faster |
| 4 | Galerina/WASM legacy lane | 489.24M/s | 3.2× slower | 24.8K× faster |
| 5 | Galerina manifest ⟨interp⟩ | 5.36M/s | 293× slower | 271× faster |
| 6 | Galerina governed ⟨interp⟩ | 5.35M/s | 293× slower | 271× faster |
| 7 | Python | 5.33M/s | 294× slower | 270× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 19.8K/s | 79.4K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.65M/s | 🏆 winner | 5.3K× faster |
| 🥈 | Rust AVX2 | 74.43M/s | 1.0× slower | 5.1K× faster |
| 🥉 | Galerina/WASM legacy lane | 35.98M/s | 2.2× slower | 2.5K× faster |
| 4 | Node.js | 2.90M/s | 27× slower | 199× faster |
| 5 | Python | 115.5K/s | 672× slower | 7.9× faster |
| 6 | Galerina manifest ⟨interp⟩ | 51.4K/s | 1.5K× slower | 3.5× faster |
| 7 | Galerina governed ⟨interp⟩ | 50.4K/s | 1.5K× slower | 3.5× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 14.6K/s | 5.3K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.18B/s | 🏆 winner | 571× faster |
| 🥈 | Rust AVX2 | 1.18B/s | 1.0× slower | 571× faster |
| 🥉 | Galerina/WASM legacy lane | 547.89M/s | 2.1× slower | 266× faster |
| 4 | Node.js | 61.22M/s | 19× slower | 30× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.20M/s | 144× slower | 4.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 6.25M/s | 188× slower | 3.0× faster |
| 7 | Python | 4.52M/s | 260× slower | 2.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.06M/s | 571× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina/WASM legacy lane at 17.2K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 32.2K/s | 🏆 winner | 3.8K× faster |
| 🥈 | Galerina/WASM legacy lane | 17.2K/s | 1.9× slower | 2.0K× faster |
| 🥉 | Rust AVX2 | 503.9/s | 64× slower | 59× faster |
| 4 | Rust (generic) | 499.9/s | 64× slower | 58× faster |
| 5 | Node.js | 127.5/s | 253× slower | 15× faster |
| 6 | Galerina manifest ⟨interp⟩ | 19.0/s | 1.7K× slower | 2.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 14.0/s | 2.3K× slower | 1.6× faster |
| 8 | Python | 8.6/s | 3.8K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 252.77M/s | 🏆 winner | 2.6K× faster |
| 🥈 | Rust (generic) | 252.75M/s | 1.0× slower | 2.6K× faster |
| 🥉 | Node.js | 129.36M/s | 2.0× slower | 1.3K× faster |
| 4 | Galerina/WASM legacy lane | 121.82M/s | 2.1× slower | 1.2K× faster |
| 5 | Python | 5.00M/s | 51× slower | 51× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 100.3K/s | 2.5K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 98.3K/s | 2.6K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 98.3K/s | 2.6K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 12.50B/s | 🏆 winner | 6.8K× faster |
| 🥈 | Rust (generic) | 4.25B/s | 2.9× slower | 2.3K× faster |
| 🥉 | Galerina/WASM legacy lane | 373.69M/s | 33× slower | 202× faster |
| 4 | Node.js | 68.78M/s | 182× slower | 37× faster |
| 5 | Python | 21.51M/s | 581× slower | 12× faster |
| 6 | Galerina governed ⟨interp⟩ | 7.46M/s | 1.7K× slower | 4.0× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 7.07M/s | 1.8K× slower | 3.8× faster |
| 8 | Galerina manifest ⟨interp⟩ | 1.85M/s | 6.8K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 48.63M/s | 🏆 winner | 16.0K× faster |
| 🥈 | Rust AVX2 | 1.17M/s | 41× slower | 387× faster |
| 🥉 | Rust (generic) | 1.17M/s | 41× slower | 387× faster |
| 4 | Node.js | 887.0K/s | 55× slower | 293× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 43.6K/s | 1.1K× slower | 14× faster |
| 6 | Galerina governed ⟨interp⟩ | 3.3K/s | 14.6K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 3.0K/s | 16.0K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.06B/s | 🏆 winner | 80.3K× faster |
| 🥈 | Rust (generic) | 1.30B/s | 4.7× slower | 17.2K× faster |
| 🥉 | Node.js | 715.66M/s | 8.5× slower | 9.5K× faster |
| 4 | Galerina/WASM legacy lane | 457.63M/s | 13× slower | 6.1K× faster |
| 5 | Python | 5.71M/s | 1.1K× slower | 76× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 166.5K/s | 36.4K× slower | 2.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 129.9K/s | 46.7K× slower | 1.7× faster |
| 8 | Galerina manifest ⟨interp⟩ | 75.5K/s | 80.3K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 3.5K× faster |
| 🥈 | Rust (generic) | 1.18B/s | 1.0× slower | 3.5K× faster |
| 🥉 | Node.js | 984.69M/s | 1.2× slower | 2.9K× faster |
| 4 | Galerina/WASM legacy lane | 472.43M/s | 2.5× slower | 1.4K× faster |
| 5 | Python | 12.15M/s | 97× slower | 36× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.00M/s | 296× slower | 12× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 424.0K/s | 2.8K× slower | 1.3× faster |
| 8 | Galerina manifest ⟨interp⟩ | 346.2K/s | 3.4K× slower | 1.0× faster |
| 9 | Galerina governed ⟨interp⟩ | 336.3K/s | 3.5K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 4.16B/s | 🏆 winner | 5.9K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 2.6× slower | 2.3K× faster |
| 🥉 | Rust (generic) | 1.51B/s | 2.8× slower | 2.2K× faster |
| 4 | Rust AVX2 | 1.43B/s | 2.9× slower | 2.0K× faster |
| 5 | Node.js | 611.30M/s | 6.8× slower | 870× faster |
| 6 | Galerina/WASM legacy lane | 441.74M/s | 9.4× slower | 629× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 893.3K/s | 4.7K× slower | 1.3× faster |
| 8 | Galerina governed ⟨interp⟩ | 717.7K/s | 5.8K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 702.7K/s | 5.9K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.8K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.2K/s | 🏆 winner | 25× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.8K/s | 3.0× slower | 8.5× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 206.0/s | 25× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.1K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 30.7K/s | 🏆 winner | 38× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.1K/s | 15× slower | 2.6× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 806.0/s | 38× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.40B/s | 🏆 winner | 4.0K× faster |
| 🥈 | Rust (generic) | 1.39B/s | 1.0× slower | 4.0K× faster |
| 🥉 | Node.js | 996.50M/s | 1.4× slower | 2.9K× faster |
| 4 | Galerina/WASM legacy lane | 468.48M/s | 3.0× slower | 1.4K× faster |
| 5 | Python | 14.33M/s | 97× slower | 41× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 366.0K/s | 3.8K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 353.3K/s | 3.9K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 345.7K/s | 4.0K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 3.52B/s | 🏆 winner | 179× faster |
| 🥈 | Rust (generic) | 2.36B/s | 1.5× slower | 120× faster |
| 🥉 | Node.js | 1.92B/s | 1.8× slower | 97× faster |
| 4 | Python | 19.71M/s | 179× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 386.64M/s | 🏆 winner | 1.6K× faster |
| 🥈 | Python | 6.99M/s | 55× slower | 29× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 296.5K/s | 1.3K× slower | 1.2× faster |
| 4 | Galerina manifest ⟨interp⟩ | 249.6K/s | 1.5K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 238.6K/s | 1.6K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 153.28M/s | 🏆 winner | 2.8K× faster |
| 🥈 | Rust AVX2 | 151.01M/s | 1.0× slower | 2.7K× faster |
| 🥉 | Galerina/WASM legacy lane | 54.94M/s | 2.8× slower | 991× faster |
| 4 | Node.js | 49.75M/s | 3.1× slower | 897× faster |
| 5 | Python | 2.42M/s | 63× slower | 44× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 61.5K/s | 2.5K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 57.0K/s | 2.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 55.5K/s | 2.8K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 123.30M/s | 🏆 winner | 1.9K× faster |
| 🥈 | Galerina/WASM legacy lane | 29.00M/s | 4.3× slower | 449× faster |
| 🥉 | Python | 1.81M/s | 68× slower | 28× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 66.2K/s | 1.9K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 64.7K/s | 1.9K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 64.6K/s | 1.9K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.36M/s | 🏆 winner | 611× faster |
| 🥈 | Python | 752.0K/s | 4.5× slower | 137× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 10.1K/s | 333× slower | 1.8× faster |
| 4 | Galerina governed ⟨interp⟩ | 5.6K/s | 601× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 5.5K/s | 611× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 23.46M/s | 🏆 winner | 2.9K× faster |
| 🥈 | Rust AVX2 | 23.42M/s | 1.0× slower | 2.8K× faster |
| 🥉 | Galerina/WASM legacy lane | 9.12M/s | 2.6× slower | 1.1K× faster |
| 4 | Node.js | 6.83M/s | 3.4× slower | 829× faster |
| 5 | Python | 265.8K/s | 88× slower | 32× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.7K/s | 2.7K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 8.5K/s | 2.8K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 8.2K/s | 2.9K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 372.25M/s | 🏆 winner | 112× faster |
| 🥈 | Rust (generic) | 372.11M/s | 1.0× slower | 112× faster |
| 🥉 | Node.js | 243.36M/s | 1.5× slower | 73× faster |
| 4 | Python | 3.33M/s | 112× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 586.86M/s | 🏆 winner | 1.6K× faster |
| 🥈 | Node.js | 76.82M/s | 7.6× slower | 203× faster |
| 🥉 | Rust AVX2 | 20.07M/s | 29× slower | 53× faster |
| 4 | Rust (generic) | 19.78M/s | 30× slower | 52× faster |
| 5 | Python | 5.26M/s | 112× slower | 14× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 452.4K/s | 1.3K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 382.1K/s | 1.5K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 378.3K/s | 1.6K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 153.1K/s | 🏆 winner | 3.1× faster |
| 🥈 | Rust AVX2 | 151.5K/s | 1.0× slower | 3.0× faster |
| 🥉 | Python | 87.9K/s | 1.7× slower | 1.8× faster |
| 4 | Node.js | 49.8K/s | 3.1× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 171.0K/s | 🏆 winner | 1.2× faster |
| 🥈 | Node.js | 146.5K/s | 1.2× slower | — (slowest) |


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

