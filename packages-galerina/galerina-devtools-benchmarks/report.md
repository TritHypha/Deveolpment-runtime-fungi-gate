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
| compute-mix | 75.29M/s | ⚪ 1.7× slower | ⚪ 1.8× slower | 1.62M/s | WASM near native |
| arithmetic-threshold | 489.89M/s | UNCERTIFIED | UNCERTIFIED | 5.13M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 34.69M/s | UNCERTIFIED | UNCERTIFIED | 40.2K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 16.7K/s | UNCERTIFIED | UNCERTIFIED | 10.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 119.25M/s | 🟡 2.1× slower | 🟢 1.1× slower | 76.8K/s | WASM usable |
| hardware-targets | 35.83M/s | UNCERTIFIED | UNCERTIFIED | 4.0K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 415.29M/s | 🟡 3.4× slower | ⚪ 1.5× slower | 635.2K/s | WASM usable |
| tri-logic | 458.38M/s | 🟡 3.0× slower | 🟡 2.1× slower | 281.0K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 182.1K/s | WASM not built for this lane yet |
| call-chain | 51.22M/s | — | 🟡 4.2× slower | 46.0K/s | WASM 2–10× under Node |
| nbody | 28.79M/s | — | 🟡 4.3× slower | 49.4K/s | WASM 2–10× under Node |
| mandelbrot | 8.85M/s | 🟡 2.6× slower | 🟢 1.4× | 7.0K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 27.82B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 6 B/op | 14 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 15 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 47 B/op | 89 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 14 B/op | 6 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.18B/s | 466.45M/s | 3.86M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 27.82B/s | 415.29M/s | 1.63B/s | ⚪ 1.5× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (196.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 196.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (980.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 980.0/s |
| json-parse | records/s | **Node.js** (2.76M/s) | 2.76M/s | 441.0K/s | not run — no native impl | no WASM — strings/records | 4.9K/s |
| spore-container | containers/s | **Rust (generic)** (162.3K/s) | 42.8K/s | 63.3K/s | 162.3K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (128.4K/s) | 128.4K/s | 104.8K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.5K/s) | 3.5K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.4K/s) | 6.4K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (15.3K/s) | 15.3K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (104.0K/s) | 104.0K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (707.0/s) | 707.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 525.0/s | 660.0/s | 2.90M/s | 0.80× governed/manifest (gov overhead ≈ 1.26×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **129.31M/s** | **131.63M/s** | not run — no C++ impl | **133.93M/s** | 719.9K/s | 1.76M/s | 1.66M/s | 1.62M/s | 75.29M/s | not run — no GPU path | 82.7× |
| arithmetic-threshold | not run — no AVX-512 | **1.57B/s** | **1.57B/s** | not run — no C++ impl | 987.29M/s | 3.74M/s | 28.5K/s | 4.85M/s | 5.13M/s | 489.89M/s | not run — no GPU path | 192.6× |
| six-digit-guess | not run — no AVX-512 | **75.38M/s** | **77.39M/s** | not run — no C++ impl | 2.55M/s | 77.2K/s | 24.1K/s | 45.4K/s | 40.2K/s | 34.69M/s | not run — no GPU path | 63.6× |
| record-allocation | not run — no AVX-512 | **1.17B/s** | **1.17B/s** | not run — no C++ impl | 57.75M/s | 3.26M/s | 7.52M/s | 4.83M/s | 1.36M/s | 535.31M/s | not run — no GPU path | 42.4× |
| fibonacci-recursive | not run — no AVX-512 | 499.4/s | 500.0/s | not run — no C++ impl | 123.7/s | 4.1/s | **65.4K/s** | 15.0/s | 10.0/s | 16.7K/s | not run — no GPU path | 12.4× |
| tower-of-hanoi | not run — no AVX-512 | **250.86M/s** | **250.81M/s** | not run — no C++ impl | 129.57M/s | 2.71M/s | 85.2K/s | 82.4K/s | 76.8K/s | 119.25M/s | not run — no GPU path | 1.7K× |
| collection-pipeline | not run — no AVX-512 | **13.28B/s** | 4.31B/s | not run — no C++ impl | 71.13M/s | 9.26M/s | 8.01M/s | 2.00M/s | 2.25M/s | 416.84M/s | not run — no GPU path | 31.7× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.17M/s | 1.17M/s | not run — no C++ impl | 867.9K/s | not run | 79.2K/s | 3.4K/s | 4.0K/s | **35.83M/s** | not run — no GPU path | 217.0× |
| low-memory | not run — no AVX-512 | **6.07B/s** | 1.35B/s | not run — no C++ impl | 686.59M/s | 2.72M/s | 146.6K/s | 80.3K/s | 99.3K/s | 468.42M/s | not run — no GPU path | 6.9K× |
| gpu-compute | not run — no AVX-512 | **1.18B/s** | **1.18B/s** | not run — no C++ impl | 985.02M/s | 5.74M/s | 345.0K/s | 243.1K/s | 276.4K/s | 466.45M/s | 3.86M/s | 3.6K× |
| matrix-multiply | not run — no AVX-512 | 1.41B/s | 1.39B/s | not run — no C++ impl | 610.44M/s | **27.82B/s** | 801.2K/s | 574.6K/s | 635.2K/s | 415.29M/s | 1.63B/s | 961.1× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.4K/s** | 1.2K/s | 196.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **66.1K/s** | 1.7K/s | 980.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.37B/s** | **1.37B/s** | not run — no C++ impl | 973.88M/s | 6.28M/s | 309.0K/s | 293.1K/s | 281.0K/s | 458.38M/s | not run — no GPU path | 3.5K× |
| verified-native-operation | not run — no AVX-512 | **3.29B/s** | 2.33B/s | not run — no C++ impl | 1.98B/s | 8.96M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **374.09M/s** | 3.44M/s | 246.6K/s | 212.3K/s | 182.1K/s | no WASM build | not run — no GPU path | 2.1K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **216.40M/s** | 1.39M/s | 49.0K/s | 45.5K/s | 46.0K/s | 51.22M/s | not run — no GPU path | 4.7K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **123.20M/s** | 1.01M/s | 59.6K/s | 53.5K/s | 49.4K/s | 28.79M/s | not run — no GPU path | 2.5K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **2.76M/s** | 441.0K/s | 9.3K/s | 4.8K/s | 4.9K/s | no WASM — strings/records | not run — no GPU path | 561.5× |
| mandelbrot | not run — no AVX-512 | **23.43M/s** | **23.36M/s** | not run — no C++ impl | 6.25M/s | 135.1K/s | 7.0K/s | 7.0K/s | 7.0K/s | 8.85M/s | not run — no GPU path | 887.2× |
| spectral-norm | not run — no AVX-512 | **372.62M/s** | **372.42M/s** | not run — no C++ impl | 240.27M/s | 1.58M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 14.66M/s | 14.52M/s | not run — no C++ impl | 77.61M/s | 2.89M/s | 369.5K/s | 307.8K/s | 280.2K/s | **568.33M/s** | not run — no GPU path | 276.9× |
| spore-container | not run — no AVX-512 | **156.7K/s** | **162.3K/s** | not run — no C++ impl | 42.8K/s | 63.3K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **128.4K/s** | 104.8K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.07B/s | — | — |
| 🥈 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.35B/s | — | — |
| 🥉 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 686.59M/s | — | 19KB |
| 4 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 468.42M/s | — | 42KB |
| 5 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 2.72M/s | — | 272B |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 47 bytes/op ⚠ moderate | 99.3K/s | — | 470KB |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 67 bytes/op ⚠ moderate | 146.6K/s | — | 666KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 89 bytes/op ⚠ moderate | 80.3K/s | — | 893KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 66.8MB | 67.1MB | 5.0MB | 940KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 98.0MB | 98.0MB | 19.2MB | 120KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 94.0MB | 94.0MB | 22.8MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 93.0MB | 93.0MB | 22.6MB | 4.5MB |
| compute-mix | WASM ▶ production | 93.7MB | 93.7MB | 18.3MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 66.2MB | 66.5MB | 4.2MB | 104KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 99.5MB | 99.5MB | 19.5MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 99.3MB | 99.3MB | 19.4MB | 861KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 99.2MB | 99.2MB | 19.4MB | 835KB |
| arithmetic-threshold | WASM ▶ production | 101.6MB | 101.6MB | 18.9MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 71.0MB | 71.0MB | 5.9MB | 1.2MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 100.6MB | 100.6MB | 20.2MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 100.5MB | 100.5MB | 21.4MB | 2.2MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 100.1MB | 100.1MB | 20.3MB | 1.5MB |
| six-digit-guess | WASM ▶ production | 102.3MB | 102.3MB | 19.1MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 67.0MB | 67.0MB | 4.2MB | 91KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 100.4MB | 100.4MB | 20.0MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 100.8MB | 100.8MB | 19.5MB | 143KB |
| record-allocation | Galerina governed ⟨interp⟩ | 101.4MB | 101.4MB | 19.4MB | 59KB |
| record-allocation | WASM ▶ production | 102.5MB | 102.5MB | 19.7MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 65.2MB | 65.2MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 101.3MB | 101.3MB | 21.9MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 101.3MB | 101.3MB | 21.4MB | 1.6MB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 100.9MB | 100.9MB | 20.3MB | 754KB |
| fibonacci-recursive | WASM ▶ production | 102.9MB | 102.9MB | 19.8MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 65.2MB | 65.2MB | 4.1MB | 15KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 103.7MB | 103.7MB | 24.3MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 102.5MB | 102.5MB | 22.5MB | 3.9MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 102.7MB | 102.7MB | 22.3MB | 3.7MB |
| tower-of-hanoi | WASM ▶ production | 103.6MB | 103.6MB | 19.0MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 82.0MB | 82.0MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 103.5MB | 103.5MB | 19.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 103.5MB | 103.5MB | 18.8MB | 145KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 104.3MB | 104.3MB | 18.8MB | 168KB |
| collection-pipeline | WASM ▶ production | 106.0MB | 106.0MB | 18.9MB | 26KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 65.1MB | 65.1MB | 4.1MB | 27KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 105.0MB | 105.0MB | 19.7MB | 526KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 106.4MB | 106.4MB | 19.3MB | 481KB |
| governance-cost | Galerina governed ⟨interp⟩ | 105.6MB | 105.6MB | 19.3MB | 518KB |
| governance-cost | WASM ▶ production | 105.8MB | 105.8MB | 19.1MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 67.0MB | 67.0MB | 4.5MB | 397KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 106.1MB | 106.1MB | 19.8MB | 107KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 103.6MB | 103.6MB | 19.0MB | 90KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 103.9MB | 103.9MB | 19.0MB | 83KB |
| hardware-targets | WASM ▶ production | 106.2MB | 106.2MB | 19.3MB | 76KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 65.3MB | 65.3MB | 4.1MB | 19KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 104.1MB | 104.1MB | 20.0MB | 666KB |
| low-memory | Galerina manifest ⟨interp⟩ | 104.1MB | 104.1MB | 20.0MB | 893KB |
| low-memory | Galerina governed ⟨interp⟩ | 104.2MB | 104.2MB | 19.5MB | 470KB |
| low-memory | WASM ▶ production | 106.3MB | 106.3MB | 19.3MB | 42KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 65.3MB | 65.3MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 105.2MB | 105.2MB | 21.5MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 105.1MB | 105.1MB | 20.1MB | 917KB |
| gpu-compute | Galerina governed ⟨interp⟩ | 104.9MB | 104.9MB | 19.4MB | 218KB |
| gpu-compute | WASM ▶ production | 107.2MB | 107.2MB | 19.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 67.4MB | 67.4MB | 4.9MB | 782KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 105.3MB | 105.3MB | 20.9MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 105.3MB | 105.3MB | 19.8MB | 567KB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 105.8MB | 105.8MB | 20.8MB | 1.6MB |
| matrix-multiply | WASM ▶ production | 108.3MB | 108.3MB | 19.5MB | 2KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 75.5MB | 75.5MB | 8.0MB | 2.4MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 105.6MB | 105.6MB | 20.0MB | -22KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 105.2MB | 105.2MB | 19.5MB | 215KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 105.2MB | 105.2MB | 19.5MB | 345KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 105.6MB | 105.6MB | 20.3MB | -342KB |
| text-html | Galerina manifest ⟨interp⟩ | 106.0MB | 106.0MB | 19.8MB | 167KB |
| text-html | Galerina governed ⟨interp⟩ | 105.7MB | 105.7MB | 19.8MB | 175KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 318KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 106.1MB | 106.1MB | 21.6MB | 299KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 105.9MB | 105.9MB | 21.2MB | 1.4MB |
| tri-logic | Galerina governed ⟨interp⟩ | 105.4MB | 105.4MB | 20.0MB | 261KB |
| tri-logic | WASM ▶ production | 107.4MB | 107.4MB | 20.1MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 27KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 107.1MB | 107.1MB | 21.2MB | -930KB |
| data-query | Galerina manifest ⟨interp⟩ | 106.1MB | 106.1MB | 20.6MB | 718KB |
| data-query | Galerina governed ⟨interp⟩ | 105.6MB | 105.6MB | 21.3MB | 1.4MB |
| call-chain | Node.js | 66.1MB | 66.1MB | 4.5MB | 389KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 105.7MB | 105.7MB | 22.7MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 107.4MB | 107.4MB | 24.0MB | 4.0MB |
| call-chain | Galerina governed ⟨interp⟩ | 107.4MB | 107.4MB | 21.0MB | 1.0MB |
| call-chain | WASM ▶ production | 108.4MB | 108.4MB | 20.2MB | 1KB |
| nbody | Node.js | 67.6MB | 67.6MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 105.7MB | 105.7MB | 21.4MB | 237KB |
| nbody | Galerina manifest ⟨interp⟩ | 105.7MB | 105.7MB | 21.0MB | 975KB |
| nbody | Galerina governed ⟨interp⟩ | 106.0MB | 106.0MB | 21.8MB | 1.8MB |
| nbody | WASM ▶ production | 108.1MB | 108.1MB | 20.3MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 109.1MB | 109.1MB | 23.8MB | 432KB |
| json-parse | Galerina manifest ⟨interp⟩ | 107.2MB | 107.2MB | 22.0MB | 1.4MB |
| json-parse | Galerina governed ⟨interp⟩ | 114.5MB | 114.5MB | 22.0MB | 2.0MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 67.2MB | 67.2MB | 4.9MB | 803KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 108.7MB | 108.7MB | 20.8MB | -4.0MB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 111.1MB | 111.1MB | 24.5MB | 4.1MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 111.2MB | 111.2MB | 22.8MB | 2.1MB |
| mandelbrot | WASM ▶ production | 116.8MB | 116.8MB | 21.0MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 67.5MB | 67.5MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 67.1MB | 67.1MB | 4.6MB | 428KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 108.9MB | 108.9MB | 21.9MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 108.8MB | 108.8MB | 21.3MB | 759KB |
| binary-trees | Galerina governed ⟨interp⟩ | 110.6MB | 110.6MB | 22.4MB | 1.9MB |
| binary-trees | WASM ▶ production | 111.9MB | 111.9MB | 20.8MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 83.1MB | 83.1MB | 9.3MB | 2.0MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 93.9MB | 93.9MB | 20.5MB | 13.9MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 133.9K ops/CPU-ms |
| compute-mix | Python | 5.00s | 5.00s | 100% | 720.00 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 30.1ms | 47.0ms | 156% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.9ms | 31.0ms | 100% | 1.6K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.33s | 1.33s | 100% | 75.3K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 20.3ms | 15.0ms | 74% | 1.33M ops/CPU-ms |
| arithmetic-threshold | Python | 5.35s | 5.34s | 100% | 3.7K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 13.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.3ms | 0.0ms | 0% | — |
| arithmetic-threshold | WASM ▶ production | 1.03s | 1.03s | 100% | 490.8K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 16.5ms | 32.0ms | 194% | 1.3K ops/CPU-ms |
| six-digit-guess | Python | 545.1ms | 531.3ms | 97% | 79.19 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 926.0ms | 969.0ms | 105% | 43.41 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 1.05s | 1.09s | 104% | 38.45 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.21s | 1.20s | 99% | 35.0K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.6ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.5ms | 0.0ms | 0% | — |
| record-allocation | Python | 61.4ms | 62.5ms | 102% | 3.2K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 2.1ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 7.3ms | 31.0ms | 422% | 322.58 ops/CPU-ms |
| record-allocation | WASM ▶ production | 1.01s | 1.03s | 102% | 523.3K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 400.5ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 400.0ms | — | — | — |
| fibonacci-recursive | Node.js | 808.2ms | 812.0ms | 100% | 0.12 ops/CPU-ms |
| fibonacci-recursive | Python | 4.87s | 4.88s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 65.5ms | 63.0ms | 96% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 97.2ms | 125.0ms | 129% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.02s | 1.02s | 100% | 16.73 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 522.5ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 522.6ms | — | — | — |
| tower-of-hanoi | Node.js | 101.2ms | 109.0ms | 108% | 120.2K ops/CPU-ms |
| tower-of-hanoi | Python | 484.5ms | 484.4ms | 100% | 2.7K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 795.0ms | 812.0ms | 102% | 80.71 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 852.9ms | 875.0ms | 103% | 74.90 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.10s | 1.11s | 101% | 118.2K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 75.3ms | — | — | — |
| collection-pipeline | Rust (generic) | 232.1ms | — | — | — |
| collection-pipeline | Node.js | 703.0ms | 704.0ms | 100% | 71.0K ops/CPU-ms |
| collection-pipeline | Python | 5.40s | 5.39s | 100% | 9.3K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 5.0ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.5ms | 31.0ms | 697% | 322.58 ops/CPU-ms |
| collection-pipeline | WASM ▶ production | 1.01s | 1.00s | 99% | 420.0K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.2ms | — | — | — |
| governance-cost | Rust (generic) | 11.3ms | — | — | — |
| governance-cost | Node.js | 48.2ms | 47.0ms | 97% | — |
| governance-cost | Python | 5.03s | 5.03s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 2.2ms | 31.0ms | 1430% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.5ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.9ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.00s | 100% | — |
| hardware-targets | Rust AVX2 | 852.7ms | — | — | — |
| hardware-targets | Rust (generic) | 856.6ms | — | — | — |
| hardware-targets | Node.js | 1.15s | 1.17s | 102% | 853.24 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 12.6ms | 31.0ms | 246% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.08s | 108% | 33.2K ops/CPU-ms |
| low-memory | Rust AVX2 | 164.7ms | — | — | — |
| low-memory | Rust (generic) | 740.7ms | — | — | — |
| low-memory | Node.js | 72.8ms | 78.0ms | 107% | 641.0K ops/CPU-ms |
| low-memory | Python | 3.68s | 3.66s | 99% | 2.7K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 124.6ms | 187.0ms | 150% | 53.48 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 100.7ms | 188.0ms | 187% | 53.19 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.00s | 1.01s | 101% | 463.1K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.24s | — | — | — |
| gpu-compute | Rust (generic) | 4.24s | — | — | — |
| gpu-compute | Node.js | 507.6ms | 500.0ms | 99% | 1.00M ops/CPU-ms |
| gpu-compute | Python | 8.72s | 8.72s | 100% | 5.7K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 411.3ms | 485.0ms | 118% | 206.19 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 361.9ms | 406.0ms | 112% | 246.31 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.07s | 1.08s | 101% | 463.8K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.9ms | — | — | — |
| matrix-multiply | Rust AVX2 | 92.7ms | — | — | — |
| matrix-multiply | Rust (generic) | 94.1ms | — | — | — |
| matrix-multiply | Node.js | 214.7ms | 203.0ms | 95% | 645.7K ops/CPU-ms |
| matrix-multiply | Python | 0.5ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 57.0ms | 109.0ms | 191% | 300.62 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 51.6ms | 78.0ms | 151% | 420.10 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.03s | 1.03s | 101% | 413.2K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.9ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 18.4ms | 32.0ms | 174% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.8ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 5.1ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 1.5ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.0ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 437.8ms | — | — | — |
| tri-logic | Rust (generic) | 437.6ms | — | — | — |
| tri-logic | Node.js | 308.0ms | — | — | — |
| tri-logic | Python | 1.91s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.7ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 1.02s | 1.06s | 104% | 282.22 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 1.07s | 1.14s | 107% | 262.93 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.31s | 1.31s | 100% | 457.3K ops/CPU-ms |
| data-query | Node.js | 133.7ms | — | — | — |
| data-query | Python | 871.4ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.9ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 47.1ms | 63.0ms | 134% | 158.73 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 54.9ms | 78.0ms | 142% | 128.21 ops/CPU-ms |
| call-chain | Node.js | 9.2ms | 16.0ms | 173% | 125.0K ops/CPU-ms |
| call-chain | Python | 719.0ms | 718.8ms | 100% | 1.4K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.10s | 1.14s | 104% | 43.82 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.09s | 1.11s | 102% | 45.09 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.95s | 1.94s | 99% | 51.6K ops/CPU-ms |
| nbody | Node.js | 53.2ms | 63.0ms | 118% | 104.0K ops/CPU-ms |
| nbody | Python | 1.63s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 612.2ms | 687.0ms | 112% | 47.70 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 662.7ms | 671.0ms | 101% | 48.83 ops/CPU-ms |
| nbody | WASM ▶ production | 1.14s | 1.14s | 100% | 28.7K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 105.0ms | 203.0ms | 193% | 2.46 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 101.7ms | 187.0ms | 184% | 2.67 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 139.9ms | — | — | — |
| mandelbrot | Rust (generic) | 140.3ms | — | — | — |
| mandelbrot | Node.js | 524.2ms | 531.0ms | 101% | 6.2K ops/CPU-ms |
| mandelbrot | Python | 24.26s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.33s | 2.31s | 99% | 7.08 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.33s | 2.41s | 103% | 6.81 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.85s | 1.84s | 100% | 8.9K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.8ms | — | — | — |
| spectral-norm | Rust (generic) | 26.9ms | — | — | — |
| spectral-norm | Node.js | 41.6ms | 47.0ms | 113% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 6.31s | — | — | — |
| binary-trees | Rust AVX2 | 9.3ms | — | — | — |
| binary-trees | Rust (generic) | 9.4ms | — | — | — |
| binary-trees | Node.js | 1.8ms | 0.0ms | 0% | — |
| binary-trees | Python | 47.0ms | 46.9ms | 100% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 441.4ms | 453.0ms | 103% | 299.90 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 484.8ms | 532.0ms | 110% | 255.36 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.20s | 1.20s | 101% | 564.6K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.91s | — | — | — |
| spore-container | Rust (generic) | 1.85s | — | — | — |
| spore-container | Node.js | 7.01s | 8.31s | 119% | 36.09 ops/CPU-ms |
| spore-container | Python | 1.58s | — | — | — |
| framework-pipeline | Node.js | 1.56s | 2.36s | 151% | 84.78 ops/CPU-ms |
| framework-pipeline | Python | 1.91s | — | — | — |
| http-throughput | Node.js | 85.0ms | — | — | — |
| naming-check | Node.js | 486.0ms | — | — | — |
| context-receipt | Node.js | 380.0ms | — | — | — |
| intelligence-search | Node.js | 48.0ms | — | — | — |
| provenance-trace | Node.js | 2.19s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 133.93M/s | 5.00s | 5.00s | 66.8MB | ~0 | 186.0× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 131.63M/s | 5.00s | — | — | ~0 (native) | 182.8× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 129.31M/s | 5.00s | — | — | ~0 (native) | 179.6× | 0.97× |
| 4 | ⚪ | WASM ▶ production | 75.29M/s | 1.33s | 1.33s | 93.7MB | ~0 | 104.6× | 0.56× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 1.76M/s | 0.4ms | 0.0ms | 98.0MB | 161 B/op | 2.44× | 0.01× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.66M/s | 30.1ms | 47.0ms | 94.0MB | 90 B/op | 2.31× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.62M/s | 30.9ms | 31.0ms | 93.0MB | 91 B/op | 2.25× | 0.01× |
| 8 | ⚫ | Python | 719.9K/s | 5.00s | 5.00s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (161 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.57B/s | 12.8ms | — | — | ~0 (native) | 419.0× | 1.59× |
| 🥈 | 🟢 | Rust (generic) | 1.57B/s | 12.8ms | — | — | ~0 (native) | 418.5× | 1.59× |
| 🥉 | 🟢 | Node.js | 987.29M/s | 20.3ms | 15.0ms | 66.2MB | ~0 | 263.9× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 489.89M/s | 1.03s | 1.03s | 101.6MB | ~0 | 131.0× | 0.50× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 5.13M/s | 12.3ms | 0.0ms | 99.2MB | 13 B/op | 1.37× | 0.01× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 4.85M/s | 13.1ms | 0.0ms | 99.3MB | 14 B/op | 1.30× | 0.00× |
| 7 | ⚫ | Python | 3.74M/s | 5.35s | 5.34s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 28.5K/s | 0.1ms | 0.0ms | 99.5MB | 18.6 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.39M/s | 0.5ms | — | — | ~0 (native) | 1.0K× | 30.3× |
| 🥈 | 🟢 | Rust AVX2 | 75.38M/s | 0.6ms | — | — | ~0 (native) | 976.8× | 29.5× |
| 🥉 | 🟢 | WASM ▶ production | 34.69M/s | 1.21s | 1.20s | 102.3MB | ~0 | 449.5× | 13.6× |
| 4 | 🟢 | Node.js | 2.55M/s | 16.5ms | 32.0ms | 71.0MB | 28 B/op | 33.1× | 1.00× |
| 5 | 🔴 | Python | 77.2K/s | 545.1ms | 531.3ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 45.4K/s | 926.0ms | 969.0ms | 100.5MB | 51 B/op | 0.59× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 40.2K/s | 1.05s | 1.09s | 100.1MB | 36 B/op | 0.52× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 24.1K/s | 0.1ms | 0.0ms | 100.6MB | 32.5 KB/op | 0.31× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (32.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 360.2× | 20.3× |
| 🥈 | 🟢 | Rust AVX2 | 1.17B/s | 8.6ms | — | — | ~0 (native) | 357.9× | 20.2× |
| 🥉 | 🟢 | WASM ▶ production | 535.31M/s | 1.01s | 1.03s | 102.5MB | ~0 | 164.4× | 9.27× |
| 4 | 🟢 | Node.js | 57.75M/s | 3.5ms | 0.0ms | 67.0MB | ~0 | 17.7× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 7.52M/s | 0.3ms | 0.0ms | 100.4MB | 119 B/op | 2.31× | 0.13× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 4.83M/s | 2.1ms | 0.0ms | 100.8MB | 14 B/op | 1.48× | 0.08× |
| 7 | 🔴 | Python | 3.26M/s | 61.4ms | 62.5ms | — | ~0 | 1.00× | 0.06× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 1.36M/s | 7.3ms | 31.0ms | 101.4MB | 6 B/op | 0.42× | 0.02× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (119 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 65.4K/s | 0.1ms | 0.0ms | 101.3MB | 12.0 KB/op | 15.9K× | 528.2× |
| 🥈 | 🟢 | WASM ▶ production | 16.7K/s | 1.02s | 1.02s | 102.9MB | ~0 | 4.1K× | 135.1× |
| 🥉 | 🟢 | Rust (generic) | 500.0/s | 400.0ms | — | — | ~0 (native) | 121.7× | 4.04× |
| 4 | 🟢 | Rust AVX2 | 499.4/s | 400.5ms | — | — | ~0 (native) | 121.5× | 4.04× |
| 5 | 🟢 | Node.js | 123.7/s | 808.2ms | 812.0ms | 65.2MB | 53 B/op | 30.1× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 15.0/s | 65.5ms | 63.0ms | 101.3MB | 1559.1 KB/op | 3.65× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 10.0/s | 97.2ms | 125.0ms | 100.9MB | 757.9 KB/op | 2.43× | 0.08× |
| 8 | 🔴 | Python | 4.1/s | 4.87s | 4.88s | — | 23 B/op | 1.00× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (1559.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 250.86M/s | 522.5ms | — | — | ~0 (native) | 92.7× | 1.94× |
| 🥈 | 🟢 | Rust (generic) | 250.81M/s | 522.6ms | — | — | ~0 (native) | 92.7× | 1.94× |
| 🥉 | 🟢 | Node.js | 129.57M/s | 101.2ms | 109.0ms | 65.2MB | ~0 | 47.9× | 1.00× |
| 4 | 🟢 | WASM ▶ production | 119.25M/s | 1.10s | 1.11s | 103.6MB | ~0 | 44.1× | 0.92× |
| 5 | 🔴 | Python | 2.71M/s | 484.5ms | 484.4ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 85.2K/s | 0.1ms | 0.0ms | 103.7MB | 10.7 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 82.4K/s | 795.0ms | 812.0ms | 102.5MB | 59 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 76.8K/s | 852.9ms | 875.0ms | 102.7MB | 57 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (10.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.28B/s | 75.3ms | — | — | ~0 (native) | 1.4K× | 186.7× |
| 🥈 | 🟢 | Rust (generic) | 4.31B/s | 232.1ms | — | — | ~0 (native) | 465.3× | 60.6× |
| 🥉 | 🟢 | WASM ▶ production | 416.84M/s | 1.01s | 1.00s | 106.0MB | ~0 | 45.0× | 5.86× |
| 4 | 🟢 | Node.js | 71.13M/s | 703.0ms | 704.0ms | 82.0MB | ~0 | 7.68× | 1.00× |
| 5 | 🟡 | Python | 9.26M/s | 5.40s | 5.39s | — | ~0 | 1.00× | 0.13× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.01M/s | 0.3ms | 0.0ms | 103.5MB | 141 B/op | 0.87× | 0.11× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.25M/s | 4.5ms | 31.0ms | 104.3MB | 17 B/op | 0.24× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.00M/s | 5.0ms | 0.0ms | 103.5MB | 15 B/op | 0.22× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (141 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 889.87M/s | 11.2ms |
| Rust (generic) | 887.68M/s | 11.3ms |
| Node.js | 2.07M/s | 48.2ms |
| Python | 19.9K/s | 5.03s |
| Galerina passive ⟨interp⟩ | 1.4K/s | 2.2ms |
| Galerina manifest ⟨interp⟩ | 660.0/s | 1.5ms |
| Galerina governed ⟨interp⟩ | 525.0/s | 1.9ms |
| WASM ▶ production | 2.90M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 35.83M/s | 1.00s | 1.08s | 106.2MB | ~0 | — | 41.3× |
| 🥈 | 🟢 | Rust AVX2 | 1.17M/s | 852.7ms | — | — | ~0 (native) | — | 1.35× |
| 🥉 | 🟢 | Rust (generic) | 1.17M/s | 856.6ms | — | — | ~0 (native) | — | 1.35× |
| 4 | 🟢 | Node.js | 867.9K/s | 1.15s | 1.17s | 67.0MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 79.2K/s | 12.6ms | 31.0ms | 106.1MB | 107 B/op | — | 0.09× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 4.0K/s | 0.3ms | 0.0ms | 103.9MB | 81.5 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 3.4K/s | 0.3ms | 0.0ms | 103.6MB | 87.9 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (87.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.07B/s | 164.7ms | — | — | ~0 | 2.2K× | 8.84× |
| 🥈 | 🟢 | Rust (generic) | 1.35B/s | 740.7ms | — | — | ~0 | 496.4× | 1.97× |
| 🥉 | 🟢 | Node.js | 686.59M/s | 72.8ms | 78.0ms | 65.3MB | ~0 | 252.5× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 468.42M/s | 1.00s | 1.01s | 106.3MB | ~0 | 172.2× | 0.68× |
| 5 | ⚫ | Python | 2.72M/s | 3.68s | 3.66s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 146.6K/s | 0.5ms | 0.0ms | 104.1MB | 8.5 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 99.3K/s | 100.7ms | 188.0ms | 104.2MB | 47 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 80.3K/s | 124.6ms | 187.0ms | 104.1MB | 89 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Rust AVX2 (~0) · **highest:** Galerina passive ⟨interp⟩ (8.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 4.24s | — | — | ~0 (native) | 205.6× | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 1.18B/s | 4.24s | — | — | ~0 (native) | 205.5× | 1.20× |
| 🥉 | 🟢 | Node.js | 985.02M/s | 507.6ms | 500.0ms | 65.3MB | ~0 | 171.8× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 466.45M/s | 1.07s | 1.08s | 107.2MB | ~0 | 81.3× | 0.47× |
| 5 | ⚫ | Python | 5.74M/s | 8.72s | 8.72s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.86M/s | 25.9ms | — | — | — | 0.67× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 345.0K/s | 0.3ms | 0.0ms | 105.2MB | 1.8 KB/op | 0.06× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 276.4K/s | 361.9ms | 406.0ms | 104.9MB | 2 B/op | 0.05× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 243.1K/s | 411.3ms | 485.0ms | 105.1MB | 9 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 27.82B/s | 0.5ms | — | — | 332 B/op | 1.00× | 45.6× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 12.9ms | — | — | — | 0.06× | 2.67× |
| 🥉 | 🟢 | Rust AVX2 | 1.41B/s | 92.7ms | — | — | ~0 (native) | 0.05× | 2.32× |
| 4 | 🟢 | Rust (generic) | 1.39B/s | 94.1ms | — | — | ~0 (native) | 0.05× | 2.28× |
| 5 | 🟢 | Node.js | 610.44M/s | 214.7ms | 203.0ms | 67.4MB | ~0 | 0.02× | 1.00× |
| 6 | ⚪ | WASM ▶ production | 415.29M/s | 1.03s | 1.03s | 108.3MB | ~0 | 0.01× | 0.68× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 801.2K/s | 0.2ms | 0.0ms | 105.3MB | 1.1 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 635.2K/s | 51.6ms | 78.0ms | 105.8MB | 48 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 574.6K/s | 57.0ms | 109.0ms | 105.3MB | 17 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.4K/s | 18.4ms | 32.0ms | 105.6MB | -217 B/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.2K/s | 0.8ms | 0.0ms | 105.2MB | 209.5 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 196.0/s | 5.1ms | 0.0ms | 105.2MB | 337.4 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-217 B/op) · **highest:** Galerina governed ⟨interp⟩ (337.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 66.1K/s | 1.5ms | 0.0ms | 105.6MB | -3.3 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 1.7K/s | 0.6ms | 0.0ms | 106.0MB | 163.2 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 980.0/s | 1.0ms | 0.0ms | 105.7MB | 171.4 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.3 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.37B/s | 437.6ms | — | — | ~0 (native) | 218.3× | 1.41× |
| 🥈 | 🟢 | Rust AVX2 | 1.37B/s | 437.8ms | — | — | ~0 (native) | 218.2× | 1.41× |
| 🥉 | 🟢 | Node.js | 973.88M/s | 308.0ms | — | — | ~0 | 155.0× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 458.38M/s | 1.31s | 1.31s | 107.4MB | ~0 | 73.0× | 0.47× |
| 5 | ⚫ | Python | 6.28M/s | 1.91s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 309.0K/s | 1.7ms | 0.0ms | 106.1MB | 578 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 293.1K/s | 1.02s | 1.06s | 105.9MB | 5 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 281.0K/s | 1.07s | 1.14s | 105.4MB | ~0 | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (578 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 3.29B/s | — | — | — | ~0 (native) | 367.6× | 1.66× |
| 🥈 | 🟢 | Rust (generic) | 2.33B/s | — | — | — | ~0 (native) | 260.4× | 1.18× |
| 🥉 | 🟢 | Node.js | 1.98B/s | — | — | — | — | 221.1× | 1.00× |
| 4 | ⚫ | Python | 8.96M/s | — | — | — | — | 1.00× | 0.00× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 374.09M/s | 133.7ms | — | — | ~0 | 108.7× | 1.00× |
| 🥈 | ⚫ | Python | 3.44M/s | 871.4ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 246.6K/s | 0.9ms | 0.0ms | 107.1MB | -4.0 KB/op | 0.07× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 212.3K/s | 47.1ms | 63.0ms | 106.1MB | 72 B/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 182.1K/s | 54.9ms | 78.0ms | 105.6MB | 137 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.0 KB/op) · **highest:** Galerina governed ⟨interp⟩ (137 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 216.40M/s | 9.2ms | 16.0ms | 66.1MB | ~0 | 155.6× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 51.22M/s | 1.95s | 1.94s | 108.4MB | ~0 | 36.8× | 0.24× |
| 🥉 | ⚫ | Python | 1.39M/s | 719.0ms | 718.8ms | — | ~0 | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 49.0K/s | 0.1ms | 0.0ms | 105.7MB | 19.3 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 46.0K/s | 1.09s | 1.11s | 107.4MB | 20 B/op | 0.03× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 45.5K/s | 1.10s | 1.14s | 107.4MB | 80 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (19.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 123.20M/s | 53.2ms | 63.0ms | 67.6MB | ~0 | 122.5× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 28.79M/s | 1.14s | 1.14s | 108.1MB | ~0 | 28.6× | 0.23× |
| 🥉 | ⚫ | Python | 1.01M/s | 1.63s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 59.6K/s | 0.3ms | 0.0ms | 105.7MB | 15.2 KB/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 53.5K/s | 612.2ms | 687.0ms | 105.7MB | 30 B/op | 0.05× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 49.4K/s | 662.7ms | 671.0ms | 106.0MB | 55 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (15.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 2.76M/s | — | — | — | — | 6.26× | 1.00× |
| 🥈 | 🟡 | Python | 441.0K/s | — | — | — | 1 B/op | 1.00× | 0.16× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 9.3K/s | 0.5ms | 0.0ms | 109.1MB | 84.2 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 4.9K/s | 101.7ms | 187.0ms | 114.5MB | 3.8 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.8K/s | 105.0ms | 203.0ms | 107.2MB | 2.8 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (84.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 23.43M/s | 139.9ms | — | — | ~0 (native) | 173.4× | 3.75× |
| 🥈 | 🟢 | Rust (generic) | 23.36M/s | 140.3ms | — | — | ~0 (native) | 172.9× | 3.74× |
| 🥉 | 🟢 | WASM ▶ production | 8.85M/s | 1.85s | 1.84s | 116.8MB | ~0 | 65.5× | 1.42× |
| 4 | 🟢 | Node.js | 6.25M/s | 524.2ms | 531.0ms | 67.2MB | ~0 | 46.3× | 1.00× |
| 5 | 🔴 | Python | 135.1K/s | 24.26s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 7.0K/s | 2.33s | 2.31s | 111.1MB | 251 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 7.0K/s | 2.33s | 2.41s | 111.2MB | 130 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 7.0K/s | 0.3ms | 0.0ms | 108.7MB | -2096.1 KB/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-2096.1 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (251 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 372.62M/s | 26.8ms | — | — | ~0 (native) | 235.3× | 1.55× |
| 🥈 | 🟢 | Rust (generic) | 372.42M/s | 26.9ms | — | — | ~0 (native) | 235.1× | 1.55× |
| 🥉 | 🟢 | Node.js | 240.27M/s | 41.6ms | 47.0ms | 67.5MB | ~0 | 151.7× | 1.00× |
| 4 | ⚫ | Python | 1.58M/s | 6.31s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 568.33M/s | 1.20s | 1.20s | 111.9MB | ~0 | 196.6× | 7.32× |
| 🥈 | 🟢 | Node.js | 77.61M/s | 1.8ms | 0.0ms | 67.1MB | 3 B/op | 26.9× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 14.66M/s | 9.3ms | — | — | ~0 (native) | 5.07× | 0.19× |
| 4 | 🟡 | Rust (generic) | 14.52M/s | 9.4ms | — | — | ~0 (native) | 5.02× | 0.19× |
| 5 | 🔴 | Python | 2.89M/s | 47.0ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 369.5K/s | 0.1ms | 0.0ms | 108.9MB | 2.2 KB/op | 0.13× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 307.8K/s | 441.4ms | 453.0ms | 108.8MB | 6 B/op | 0.11× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 280.2K/s | 484.8ms | 532.0ms | 110.6MB | 14 B/op | 0.10× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 162.3K/s | 1.85s | — | — | ~0 (native) | 2.56× | 3.79× |
| 🥈 | 🟢 | Rust AVX2 | 156.7K/s | 1.91s | — | — | ~0 (native) | 2.48× | 3.66× |
| 🥉 | 🟢 | Python | 63.3K/s | 1.58s | — | — | ~0 | 1.00× | 1.48× |
| 4 | 🟢 | Node.js | 42.8K/s | 7.01s | 8.31s | 83.1MB | 7 B/op | 0.68× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (7 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 128.4K/s | 1.56s | 2.36s | 93.9MB | 70 B/op | 1.23× | 1.00× |
| 🥈 | ⚪ | Python | 104.8K/s | 1.91s | — | — | ~0 | 1.00× | 0.82× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (70 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.24s | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.24s | 1.20× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 985.02M/s | 507.6ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 466.45M/s | 1.07s | 0.47× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.74M/s | 8.72s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 3.86M/s | 25.9ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 345.0K/s | 0.3ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 276.4K/s | 361.9ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 243.1K/s | 411.3ms | 0.00× |

**GPU execution status (archived run):**

| Runtime | GPU path | Device | Status |
|---|---|---|---|
| Rust | wgpu (Vulkan/D3D12) | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Python | torch CUDA / cupy | 🖥️ CPU (GPU pending) | no archived GPU execution |
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
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **186× slower** | **76× slower** | **81× slower** | **83× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **419× slower** | **55.1K× slower** | **323× slower** | **306× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **30× slower** | **1.0K× slower** | **3.2K× slower** | **1.7K× slower** | **1.9K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust (generic) | **🏆 winner** | **🏆 winner** | **20× slower** | **360× slower** | **156× slower** | **243× slower** | **861× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **131× slower** | **131× slower** | **528× slower** | **15.9K× slower** | **🏆 winner** | **4.4K× slower** | **6.5K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **93× slower** | **2.9K× slower** | **3.0K× slower** | **3.3K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **187× slower** | **1.4K× slower** | **1.7K× slower** | **6.6K× slower** | **5.9K× slower** | **32× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **31× slower** | **31× slower** | **41× slower** | not run | **452× slower** | **10.4K× slower** | **9.0K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 4× slower | 9× slower | **2.2K× slower** | **41.4K× slower** | **75.6K× slower** | **61.2K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **206× slower** | **3.4K× slower** | **4.9K× slower** | **4.3K× slower** | 3× slower | **305× slower** |
| **matrix-multiply** | Python | **20× slower** | **20× slower** | **46× slower** | **🏆 winner** | **34.7K× slower** | **48.4K× slower** | **43.8K× slower** | **67× slower** | **17× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 5× slower | **28× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **38× slower** | **67× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.4× slower | **218× slower** | **4.4K× slower** | **4.7K× slower** | **4.9K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | 1.4× slower | 2× slower | **368× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **109× slower** | **1.5K× slower** | **1.8K× slower** | **2.1K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **156× slower** | **4.4K× slower** | **4.8K× slower** | **4.7K× slower** | 4× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **122× slower** | **2.1K× slower** | **2.3K× slower** | **2.5K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 6× slower | **298× slower** | **580× slower** | **562× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **173× slower** | **3.3K× slower** | **3.3K× slower** | **3.3K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **235× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **39× slower** | **39× slower** | 7× slower | **197× slower** | **1.5K× slower** | **1.8K× slower** | **2.0K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 1.2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 133.93M/s | 🏆 winner | 186× faster |
| 🥈 | Rust (generic) | 131.63M/s | 1.0× slower | 183× faster |
| 🥉 | Rust AVX2 | 129.31M/s | 1.0× slower | 180× faster |
| 4 | WASM ▶ production | 75.29M/s | 1.8× slower | 105× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 1.76M/s | 76× slower | 2.4× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.66M/s | 81× slower | 2.3× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.62M/s | 83× slower | 2.2× faster |
| 8 | Python | 719.9K/s | 186× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.57B/s | 🏆 winner | 55.1K× faster |
| 🥈 | Rust (generic) | 1.57B/s | 1.0× slower | 55.0K× faster |
| 🥉 | Node.js | 987.29M/s | 1.6× slower | 34.7K× faster |
| 4 | WASM ▶ production | 489.89M/s | 3.2× slower | 17.2K× faster |
| 5 | Galerina governed ⟨interp⟩ | 5.13M/s | 306× slower | 180× faster |
| 6 | Galerina manifest ⟨interp⟩ | 4.85M/s | 323× slower | 170× faster |
| 7 | Python | 3.74M/s | 419× slower | 131× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 28.5K/s | 55.1K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.39M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust AVX2 | 75.38M/s | 1.0× slower | 3.1K× faster |
| 🥉 | WASM ▶ production | 34.69M/s | 2.2× slower | 1.4K× faster |
| 4 | Node.js | 2.55M/s | 30× slower | 106× faster |
| 5 | Python | 77.2K/s | 1.0K× slower | 3.2× faster |
| 6 | Galerina manifest ⟨interp⟩ | 45.4K/s | 1.7K× slower | 1.9× faster |
| 7 | Galerina governed ⟨interp⟩ | 40.2K/s | 1.9K× slower | 1.7× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 24.1K/s | 3.2K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.17B/s | 🏆 winner | 861× faster |
| 🥈 | Rust AVX2 | 1.17B/s | 1.0× slower | 855× faster |
| 🥉 | WASM ▶ production | 535.31M/s | 2.2× slower | 393× faster |
| 4 | Node.js | 57.75M/s | 20× slower | 42× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 7.52M/s | 156× slower | 5.5× faster |
| 6 | Galerina manifest ⟨interp⟩ | 4.83M/s | 243× slower | 3.5× faster |
| 7 | Python | 3.26M/s | 360× slower | 2.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 1.36M/s | 861× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 16.7K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 65.4K/s | 🏆 winner | 15.9K× faster |
| 🥈 | WASM ▶ production | 16.7K/s | 3.9× slower | 4.1K× faster |
| 🥉 | Rust (generic) | 500.0/s | 131× slower | 122× faster |
| 4 | Rust AVX2 | 499.4/s | 131× slower | 121× faster |
| 5 | Node.js | 123.7/s | 528× slower | 30× faster |
| 6 | Galerina manifest ⟨interp⟩ | 15.0/s | 4.4K× slower | 3.6× faster |
| 7 | Galerina governed ⟨interp⟩ | 10.0/s | 6.5K× slower | 2.4× faster |
| 8 | Python | 4.1/s | 15.9K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 250.86M/s | 🏆 winner | 3.3K× faster |
| 🥈 | Rust (generic) | 250.81M/s | 1.0× slower | 3.3K× faster |
| 🥉 | Node.js | 129.57M/s | 1.9× slower | 1.7K× faster |
| 4 | WASM ▶ production | 119.25M/s | 2.1× slower | 1.6K× faster |
| 5 | Python | 2.71M/s | 93× slower | 35× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 85.2K/s | 2.9K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 82.4K/s | 3.0K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 76.8K/s | 3.3K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.28B/s | 🏆 winner | 6.6K× faster |
| 🥈 | Rust (generic) | 4.31B/s | 3.1× slower | 2.1K× faster |
| 🥉 | WASM ▶ production | 416.84M/s | 32× slower | 208× faster |
| 4 | Node.js | 71.13M/s | 187× slower | 35× faster |
| 5 | Python | 9.26M/s | 1.4K× slower | 4.6× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.01M/s | 1.7K× slower | 4.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.25M/s | 5.9K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.00M/s | 6.6K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 35.83M/s | 🏆 winner | 10.4K× faster |
| 🥈 | Rust AVX2 | 1.17M/s | 31× slower | 340× faster |
| 🥉 | Rust (generic) | 1.17M/s | 31× slower | 339× faster |
| 4 | Node.js | 867.9K/s | 41× slower | 252× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 79.2K/s | 452× slower | 23× faster |
| 6 | Galerina governed ⟨interp⟩ | 4.0K/s | 9.0K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 3.4K/s | 10.4K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.07B/s | 🏆 winner | 75.6K× faster |
| 🥈 | Rust (generic) | 1.35B/s | 4.5× slower | 16.8K× faster |
| 🥉 | Node.js | 686.59M/s | 8.8× slower | 8.6K× faster |
| 4 | WASM ▶ production | 468.42M/s | 13× slower | 5.8K× faster |
| 5 | Python | 2.72M/s | 2.2K× slower | 34× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 146.6K/s | 41.4K× slower | 1.8× faster |
| 7 | Galerina governed ⟨interp⟩ | 99.3K/s | 61.2K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 80.3K/s | 75.6K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 4.9K× faster |
| 🥈 | Rust (generic) | 1.18B/s | 1.0× slower | 4.8K× faster |
| 🥉 | Node.js | 985.02M/s | 1.2× slower | 4.1K× faster |
| 4 | WASM ▶ production | 466.45M/s | 2.5× slower | 1.9K× faster |
| 5 | Python | 5.74M/s | 206× slower | 24× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.86M/s | 305× slower | 16× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 345.0K/s | 3.4K× slower | 1.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 276.4K/s | 4.3K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 243.1K/s | 4.9K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 27.82B/s | 🏆 winner | 48.4K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 17× slower | 2.8K× faster |
| 🥉 | Rust AVX2 | 1.41B/s | 20× slower | 2.5K× faster |
| 4 | Rust (generic) | 1.39B/s | 20× slower | 2.4K× faster |
| 5 | Node.js | 610.44M/s | 46× slower | 1.1K× faster |
| 6 | WASM ▶ production | 415.29M/s | 67× slower | 723× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 801.2K/s | 34.7K× slower | 1.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 635.2K/s | 43.8K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 574.6K/s | 48.4K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.2K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.4K/s | 🏆 winner | 28× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.2K/s | 4.5× slower | 6.1× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 196.0/s | 28× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.7K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 66.1K/s | 🏆 winner | 67× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.7K/s | 38× slower | 1.8× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 980.0/s | 67× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.37B/s | 🏆 winner | 4.9K× faster |
| 🥈 | Rust AVX2 | 1.37B/s | 1.0× slower | 4.9K× faster |
| 🥉 | Node.js | 973.88M/s | 1.4× slower | 3.5K× faster |
| 4 | WASM ▶ production | 458.38M/s | 3.0× slower | 1.6K× faster |
| 5 | Python | 6.28M/s | 218× slower | 22× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 309.0K/s | 4.4K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 293.1K/s | 4.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 281.0K/s | 4.9K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 3.29B/s | 🏆 winner | 368× faster |
| 🥈 | Rust (generic) | 2.33B/s | 1.4× slower | 260× faster |
| 🥉 | Node.js | 1.98B/s | 1.7× slower | 221× faster |
| 4 | Python | 8.96M/s | 368× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 374.09M/s | 🏆 winner | 2.1K× faster |
| 🥈 | Python | 3.44M/s | 109× slower | 19× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 246.6K/s | 1.5K× slower | 1.4× faster |
| 4 | Galerina manifest ⟨interp⟩ | 212.3K/s | 1.8K× slower | 1.2× faster |
| 5 | Galerina governed ⟨interp⟩ | 182.1K/s | 2.1K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 216.40M/s | 🏆 winner | 4.8K× faster |
| 🥈 | WASM ▶ production | 51.22M/s | 4.2× slower | 1.1K× faster |
| 🥉 | Python | 1.39M/s | 156× slower | 31× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 49.0K/s | 4.4K× slower | 1.1× faster |
| 5 | Galerina governed ⟨interp⟩ | 46.0K/s | 4.7K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 45.5K/s | 4.8K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 123.20M/s | 🏆 winner | 2.5K× faster |
| 🥈 | WASM ▶ production | 28.79M/s | 4.3× slower | 582× faster |
| 🥉 | Python | 1.01M/s | 122× slower | 20× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 59.6K/s | 2.1K× slower | 1.2× faster |
| 5 | Galerina manifest ⟨interp⟩ | 53.5K/s | 2.3K× slower | 1.1× faster |
| 6 | Galerina governed ⟨interp⟩ | 49.4K/s | 2.5K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 2.76M/s | 🏆 winner | 580× faster |
| 🥈 | Python | 441.0K/s | 6.3× slower | 93× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 9.3K/s | 298× slower | 1.9× faster |
| 4 | Galerina governed ⟨interp⟩ | 4.9K/s | 562× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.8K/s | 580× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 23.43M/s | 🏆 winner | 3.3K× faster |
| 🥈 | Rust (generic) | 23.36M/s | 1.0× slower | 3.3K× faster |
| 🥉 | WASM ▶ production | 8.85M/s | 2.6× slower | 1.3K× faster |
| 4 | Node.js | 6.25M/s | 3.7× slower | 887× faster |
| 5 | Python | 135.1K/s | 173× slower | 19× faster |
| 6 | Galerina manifest ⟨interp⟩ | 7.0K/s | 3.3K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 7.0K/s | 3.3K× slower | 1.0× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 7.0K/s | 3.3K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 372.62M/s | 🏆 winner | 235× faster |
| 🥈 | Rust (generic) | 372.42M/s | 1.0× slower | 235× faster |
| 🥉 | Node.js | 240.27M/s | 1.6× slower | 152× faster |
| 4 | Python | 1.58M/s | 235× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 568.33M/s | 🏆 winner | 2.0K× faster |
| 🥈 | Node.js | 77.61M/s | 7.3× slower | 277× faster |
| 🥉 | Rust AVX2 | 14.66M/s | 39× slower | 52× faster |
| 4 | Rust (generic) | 14.52M/s | 39× slower | 52× faster |
| 5 | Python | 2.89M/s | 197× slower | 10× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 369.5K/s | 1.5K× slower | 1.3× faster |
| 7 | Galerina manifest ⟨interp⟩ | 307.8K/s | 1.8K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 280.2K/s | 2.0K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 162.3K/s | 🏆 winner | 3.8× faster |
| 🥈 | Rust AVX2 | 156.7K/s | 1.0× slower | 3.7× faster |
| 🥉 | Python | 63.3K/s | 2.6× slower | 1.5× faster |
| 4 | Node.js | 42.8K/s | 3.8× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 128.4K/s | 🏆 winner | 1.2× faster |
| 🥈 | Python | 104.8K/s | 1.2× slower | — (slowest) |


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

