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
| compute-mix | 75.70M/s | ⚪ 1.7× slower | ⚪ 1.8× slower | 1.66M/s | WASM near native |
| arithmetic-threshold | 478.02M/s | UNCERTIFIED | UNCERTIFIED | 5.12M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.01M/s | UNCERTIFIED | UNCERTIFIED | 43.4K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 16.7K/s | UNCERTIFIED | UNCERTIFIED | 11.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 119.53M/s | 🟡 2.1× slower | 🟢 1.3× | 79.8K/s | WASM usable |
| hardware-targets | 35.89M/s | UNCERTIFIED | UNCERTIFIED | 4.0K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 429.93M/s | 🟡 3.5× slower | ⚪ 1.4× slower | 630.6K/s | WASM usable |
| tri-logic | 461.98M/s | 🟡 3.0× slower | 🟡 2.1× slower | 288.2K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 200.0K/s | WASM not built for this lane yet |
| call-chain | 54.16M/s | — | 🟡 4.9× slower | 44.9K/s | WASM 2–10× under Node |
| nbody | 28.78M/s | — | 🟡 4.2× slower | 56.2K/s | WASM 2–10× under Node |
| mandelbrot | 8.77M/s | 🟡 2.7× slower | 🟢 1.4× | 6.5K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 21.20B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | 2 B/op | ~0 | ~0 | 6 B/op | 8 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 36 B/op | 58 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 2 B/op | 14 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust (generic) | 1.18B/s | 464.00M/s | 4.00M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 21.20B/s | 429.93M/s | 1.51B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (197.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 197.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (893.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 893.0/s |
| json-parse | records/s | **Node.js** (2.91M/s) | 2.91M/s | 428.5K/s | not run — no native impl | no WASM — strings/records | 4.9K/s |
| spore-container | containers/s | **Rust (generic)** (145.3K/s) | 42.1K/s | 62.6K/s | 145.3K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (123.2K/s) | 123.2K/s | 107.8K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.5K/s) | 3.5K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.5K/s) | 6.5K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (15.1K/s) | 15.1K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (105.7K/s) | 105.7K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (699.0/s) | 699.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 701.0/s | 831.0/s | 2.84M/s | 0.84× governed/manifest (gov overhead ≈ 1.19×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **128.47M/s** | **129.72M/s** | not run — no C++ impl | **133.21M/s** | 694.6K/s | 2.16M/s | 1.75M/s | 1.66M/s | 75.70M/s | not run — no GPU path | 80.1× |
| arithmetic-threshold | not run — no AVX-512 | **1.56B/s** | **1.56B/s** | not run — no C++ impl | 949.34M/s | 3.67M/s | 33.9K/s | 5.10M/s | 5.12M/s | 478.02M/s | not run — no GPU path | 185.4× |
| six-digit-guess | not run — no AVX-512 | **75.04M/s** | **78.05M/s** | not run — no C++ impl | 2.62M/s | 83.9K/s | 24.4K/s | 44.0K/s | 43.4K/s | 36.01M/s | not run — no GPU path | 60.2× |
| record-allocation | not run — no AVX-512 | **1.17B/s** | **1.17B/s** | not run — no C++ impl | 48.57M/s | 3.16M/s | 7.91M/s | 2.62M/s | 2.02M/s | 543.07M/s | not run — no GPU path | 24.0× |
| fibonacci-recursive | not run — no AVX-512 | 494.1/s | 493.9/s | not run — no C++ impl | 125.7/s | 4.0/s | **66.4K/s** | 15.0/s | 11.0/s | 16.7K/s | not run — no GPU path | 11.4× |
| tower-of-hanoi | not run — no AVX-512 | **248.94M/s** | **248.72M/s** | not run — no C++ impl | 93.77M/s | 2.47M/s | 83.2K/s | 81.1K/s | 79.8K/s | 119.53M/s | not run — no GPU path | 1.2K× |
| collection-pipeline | not run — no AVX-512 | **13.13B/s** | 4.01B/s | not run — no C++ impl | 68.11M/s | 9.45M/s | 7.83M/s | 2.07M/s | 2.16M/s | 413.34M/s | not run — no GPU path | 31.5× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.17M/s | 1.17M/s | not run — no C++ impl | 886.9K/s | not run | 93.3K/s | 3.4K/s | 4.0K/s | **35.89M/s** | not run — no GPU path | 221.7× |
| low-memory | not run — no AVX-512 | **5.77B/s** | 1.33B/s | not run — no C++ impl | 708.70M/s | 2.60M/s | 143.5K/s | 105.2K/s | 119.4K/s | 441.39M/s | not run — no GPU path | 5.9K× |
| gpu-compute | not run — no AVX-512 | **1.18B/s** | **1.18B/s** | not run — no C++ impl | 980.29M/s | 5.44M/s | 338.0K/s | 293.1K/s | 305.2K/s | 464.00M/s | 4.00M/s | 3.2K× |
| matrix-multiply | not run — no AVX-512 | 1.40B/s | 1.49B/s | not run — no C++ impl | 602.77M/s | **21.20B/s** | 825.4K/s | 590.0K/s | 630.6K/s | 429.93M/s | 1.51B/s | 955.8× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.4K/s** | 1.4K/s | 197.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **59.9K/s** | 1.6K/s | 893.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.36B/s** | **1.34B/s** | not run — no C++ impl | 977.99M/s | 6.76M/s | 300.0K/s | 291.6K/s | 288.2K/s | 461.98M/s | not run — no GPU path | 3.4K× |
| verified-native-operation | not run — no AVX-512 | **3.51B/s** | **3.65B/s** | not run — no C++ impl | 1.85B/s | 9.46M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **388.22M/s** | 3.14M/s | 261.3K/s | 177.4K/s | 200.0K/s | no WASM build | not run — no GPU path | 1.9K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **267.19M/s** | 1.36M/s | 51.0K/s | 45.4K/s | 44.9K/s | 54.16M/s | not run — no GPU path | 6.0K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.26M/s** | 1.08M/s | 58.3K/s | 58.5K/s | 56.2K/s | 28.78M/s | not run — no GPU path | 2.2K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **2.91M/s** | 428.5K/s | 8.9K/s | 4.6K/s | 4.9K/s | no WASM — strings/records | not run — no GPU path | 596.4× |
| mandelbrot | not run — no AVX-512 | **23.39M/s** | **23.24M/s** | not run — no C++ impl | 6.24M/s | 133.1K/s | 6.9K/s | 7.0K/s | 6.5K/s | 8.77M/s | not run — no GPU path | 961.1× |
| spectral-norm | not run — no AVX-512 | 304.31M/s | **370.36M/s** | not run — no C++ impl | 240.52M/s | 1.54M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 15.17M/s | 15.15M/s | not run — no C++ impl | 69.88M/s | 4.78M/s | 353.2K/s | 305.2K/s | 318.5K/s | **583.23M/s** | not run — no GPU path | 219.4× |
| spore-container | not run — no AVX-512 | **144.0K/s** | **145.3K/s** | not run — no C++ impl | 42.1K/s | 62.6K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **123.2K/s** | 107.8K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -37.98 bytes/op ⚡ ~0 — no boxing | 143.5K/s | — | -380KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 5.77B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.33B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 708.70M/s | — | 18KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 441.39M/s | — | 24KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 2.60M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 36 bytes/op ⚠ moderate | 119.4K/s | — | 363KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 58 bytes/op ⚠ moderate | 105.2K/s | — | 578KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 67.0MB | 67.3MB | 5.0MB | 935KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 98.2MB | 98.2MB | 19.3MB | 103KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 94.1MB | 94.1MB | 22.8MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 92.9MB | 92.9MB | 22.5MB | 4.5MB |
| compute-mix | WASM ▶ production | 93.8MB | 93.8MB | 18.3MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 66.2MB | 66.5MB | 4.2MB | 108KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 99.4MB | 99.4MB | 19.5MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 99.2MB | 99.2MB | 19.4MB | 865KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 99.3MB | 99.3MB | 19.4MB | 822KB |
| arithmetic-threshold | WASM ▶ production | 101.5MB | 101.5MB | 18.9MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 70.7MB | 70.7MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 101.1MB | 101.1MB | 21.2MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 101.1MB | 101.1MB | 20.3MB | 1.1MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 100.6MB | 100.6MB | 19.3MB | 481KB |
| six-digit-guess | WASM ▶ production | 102.3MB | 102.3MB | 19.1MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 67.2MB | 67.2MB | 4.5MB | 372KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 100.9MB | 100.9MB | 20.0MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 100.8MB | 100.8MB | 19.4MB | 81KB |
| record-allocation | Galerina governed ⟨interp⟩ | 101.8MB | 101.8MB | 19.5MB | 60KB |
| record-allocation | WASM ▶ production | 103.3MB | 103.3MB | 19.7MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 65.1MB | 65.1MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 101.8MB | 101.8MB | 21.9MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 101.8MB | 101.8MB | 21.5MB | 1.8MB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 101.2MB | 101.2MB | 20.2MB | 723KB |
| fibonacci-recursive | WASM ▶ production | 104.0MB | 104.0MB | 19.8MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 65.2MB | 65.2MB | 4.1MB | 17KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 103.7MB | 103.7MB | 24.8MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 102.8MB | 102.8MB | 22.7MB | 4.0MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 102.9MB | 102.9MB | 23.2MB | 4.6MB |
| tower-of-hanoi | WASM ▶ production | 104.1MB | 104.1MB | 19.0MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 82.3MB | 82.3MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 103.6MB | 103.6MB | 19.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 103.6MB | 103.6MB | 18.8MB | 144KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 104.2MB | 104.2MB | 18.8MB | 168KB |
| collection-pipeline | WASM ▶ production | 105.9MB | 105.9MB | 18.9MB | 26KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 65.1MB | 65.1MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 105.4MB | 105.4MB | 19.7MB | 230KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 106.7MB | 106.7MB | 19.3MB | 491KB |
| governance-cost | Galerina governed ⟨interp⟩ | 105.0MB | 105.0MB | 19.3MB | 518KB |
| governance-cost | WASM ▶ production | 105.8MB | 105.8MB | 19.1MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 67.0MB | 67.0MB | 4.5MB | 379KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 105.3MB | 105.3MB | 20.5MB | 848KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 103.8MB | 103.8MB | 19.0MB | 90KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 103.4MB | 103.4MB | 19.0MB | 83KB |
| hardware-targets | WASM ▶ production | 105.9MB | 105.9MB | 19.3MB | 77KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 65.6MB | 65.6MB | 4.1MB | 18KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 105.0MB | 105.0MB | 19.7MB | -380KB |
| low-memory | Galerina manifest ⟨interp⟩ | 103.9MB | 103.9MB | 19.6MB | 578KB |
| low-memory | Galerina governed ⟨interp⟩ | 103.7MB | 103.7MB | 19.4MB | 363KB |
| low-memory | WASM ▶ production | 106.3MB | 106.3MB | 19.3MB | 24KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 65.4MB | 65.4MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 104.9MB | 104.9MB | 19.7MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 104.8MB | 104.8MB | 20.4MB | 1.2MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 104.6MB | 104.6MB | 19.6MB | 404KB |
| gpu-compute | WASM ▶ production | 107.0MB | 107.0MB | 19.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 67.1MB | 67.1MB | 4.8MB | 620KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 104.9MB | 104.9MB | 19.9MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 104.9MB | 104.9MB | 20.4MB | 1.1MB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 104.1MB | 104.1MB | 20.3MB | 1.1MB |
| matrix-multiply | WASM ▶ production | 108.1MB | 108.1MB | 19.8MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 80.5MB | 80.5MB | 7.9MB | 2.4MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 105.8MB | 105.8MB | 19.9MB | -64KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 105.0MB | 105.0MB | 19.5MB | 202KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 105.0MB | 105.0MB | 19.5MB | 346KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 104.0MB | 104.0MB | 20.4MB | -321KB |
| text-html | Galerina manifest ⟨interp⟩ | 105.8MB | 105.8MB | 19.8MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 105.8MB | 105.8MB | 19.8MB | 175KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 274KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 105.1MB | 105.1MB | 21.3MB | 267KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 105.0MB | 105.0MB | 20.9MB | 1.1MB |
| tri-logic | Galerina governed ⟨interp⟩ | 105.2MB | 105.2MB | 21.2MB | 1.4MB |
| tri-logic | WASM ▶ production | 107.2MB | 107.2MB | 20.3MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 22KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 105.8MB | 105.8MB | 21.3MB | 1.2MB |
| data-query | Galerina manifest ⟨interp⟩ | 105.0MB | 105.0MB | 20.7MB | 775KB |
| data-query | Galerina governed ⟨interp⟩ | 106.9MB | 106.9MB | 21.2MB | 1.3MB |
| call-chain | Node.js | 66.3MB | 66.3MB | 4.4MB | 281KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 107.3MB | 107.3MB | 24.2MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 107.3MB | 107.3MB | 21.2MB | 1.3MB |
| call-chain | Galerina governed ⟨interp⟩ | 105.2MB | 105.2MB | 20.4MB | 484KB |
| call-chain | WASM ▶ production | 108.0MB | 108.0MB | 20.2MB | 1KB |
| nbody | Node.js | 67.4MB | 67.4MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 107.1MB | 107.1MB | 21.0MB | 236KB |
| nbody | Galerina manifest ⟨interp⟩ | 107.1MB | 107.1MB | 20.6MB | 516KB |
| nbody | Galerina governed ⟨interp⟩ | 105.6MB | 105.6MB | 20.8MB | 754KB |
| nbody | WASM ▶ production | 107.7MB | 107.7MB | 20.3MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 114.4MB | 114.4MB | 21.7MB | 433KB |
| json-parse | Galerina manifest ⟨interp⟩ | 106.8MB | 106.8MB | 23.9MB | 3.4MB |
| json-parse | Galerina governed ⟨interp⟩ | 113.5MB | 113.5MB | 22.6MB | 2.6MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 67.1MB | 67.1MB | 5.1MB | 992KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 109.4MB | 109.4MB | 24.0MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 109.4MB | 109.4MB | 23.5MB | 3.1MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 110.1MB | 110.1MB | 20.8MB | 150KB |
| mandelbrot | WASM ▶ production | 115.4MB | 115.4MB | 21.0MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 67.4MB | 67.4MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 67.1MB | 67.1MB | 4.6MB | 428KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 110.6MB | 110.6MB | 23.3MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 110.6MB | 110.6MB | 22.4MB | 1.9MB |
| binary-trees | Galerina governed ⟨interp⟩ | 107.6MB | 107.6MB | 20.7MB | 206KB |
| binary-trees | WASM ▶ production | 111.6MB | 111.6MB | 20.7MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 82.8MB | 82.8MB | 9.1MB | 1.9MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 93.1MB | 93.1MB | 20.5MB | 14.0MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 133.2K ops/CPU-ms |
| compute-mix | Python | 5.04s | 5.05s | 100% | 693.50 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.6ms | 46.0ms | 161% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.1ms | 32.0ms | 106% | 1.6K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.32s | 1.31s | 99% | 76.2K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 21.1ms | 47.0ms | 223% | 425.5K ops/CPU-ms |
| arithmetic-threshold | Python | 5.45s | 5.44s | 100% | 3.7K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 12.4ms | 31.0ms | 250% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.3ms | 16.0ms | 130% | 4.0K ops/CPU-ms |
| arithmetic-threshold | WASM ▶ production | 1.06s | 1.06s | 100% | 476.4K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 16.1ms | 16.0ms | 99% | 2.6K ops/CPU-ms |
| six-digit-guess | Python | 501.2ms | 500.0ms | 100% | 84.14 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 955.6ms | 985.0ms | 103% | 42.71 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 968.9ms | 1.05s | 108% | 40.18 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.17s | 1.17s | 100% | 35.9K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 4.1ms | 16.0ms | 389% | 12.5K ops/CPU-ms |
| record-allocation | Python | 63.4ms | 78.1ms | 123% | 2.6K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 3.8ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 4.9ms | 0.0ms | 0% | — |
| record-allocation | WASM ▶ production | 1.01s | 1.03s | 102% | 533.5K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 404.8ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 404.9ms | — | — | — |
| fibonacci-recursive | Node.js | 795.6ms | 797.0ms | 100% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 4.95s | 4.95s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 66.8ms | 140.0ms | 210% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 91.7ms | 157.0ms | 171% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.02s | 1.01s | 100% | 16.75 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 526.5ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 527.0ms | — | — | — |
| tower-of-hanoi | Node.js | 139.8ms | 140.0ms | 100% | 93.6K ops/CPU-ms |
| tower-of-hanoi | Python | 531.5ms | 531.3ms | 100% | 2.5K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 808.1ms | 907.0ms | 112% | 72.26 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 821.0ms | 905.0ms | 110% | 72.41 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.10s | 1.09s | 100% | 119.8K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 76.1ms | — | — | — |
| collection-pipeline | Rust (generic) | 249.3ms | — | — | — |
| collection-pipeline | Node.js | 734.1ms | 751.0ms | 102% | 66.6K ops/CPU-ms |
| collection-pipeline | Python | 5.29s | 5.28s | 100% | 9.5K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.8ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.6ms | 47.0ms | 1015% | 212.77 ops/CPU-ms |
| collection-pipeline | WASM ▶ production | 1.02s | 1.02s | 100% | 413.4K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.3ms | — | — | — |
| governance-cost | Rust (generic) | 11.3ms | — | — | — |
| governance-cost | Node.js | 47.1ms | 47.0ms | 100% | — |
| governance-cost | Python | 5.13s | 5.14s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.9ms | 0.0ms | 0% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.4ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.02s | 102% | — |
| hardware-targets | Rust AVX2 | 854.6ms | — | — | — |
| hardware-targets | Rust (generic) | 853.6ms | — | — | — |
| hardware-targets | Node.js | 1.13s | 1.13s | 100% | 888.89 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 10.7ms | 78.0ms | 728% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.00s | 100% | 35.9K ops/CPU-ms |
| low-memory | Rust AVX2 | 173.4ms | — | — | — |
| low-memory | Rust (generic) | 753.6ms | — | — | — |
| low-memory | Node.js | 70.6ms | 63.0ms | 89% | 793.6K ops/CPU-ms |
| low-memory | Python | 3.85s | 3.84s | 100% | 2.6K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 95.1ms | 140.0ms | 147% | 71.43 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 83.7ms | 156.0ms | 186% | 64.10 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.02s | 1.02s | 100% | 442.9K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.25s | — | — | — |
| gpu-compute | Rust (generic) | 4.25s | — | — | — |
| gpu-compute | Node.js | 510.1ms | 500.0ms | 98% | 1.00M ops/CPU-ms |
| gpu-compute | Python | 9.18s | 9.17s | 100% | 5.5K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 341.2ms | 343.0ms | 101% | 291.55 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 327.6ms | 421.0ms | 128% | 237.53 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.08s | 1.08s | 100% | 463.4K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.0ms | — | — | — |
| matrix-multiply | Rust AVX2 | 93.8ms | — | — | — |
| matrix-multiply | Rust (generic) | 88.0ms | — | — | — |
| matrix-multiply | Node.js | 217.4ms | 219.0ms | 101% | 598.5K ops/CPU-ms |
| matrix-multiply | Python | 0.6ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 55.5ms | 46.0ms | 83% | 712.35 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 52.0ms | 78.0ms | 150% | 420.10 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.07s | 1.06s | 100% | 431.6K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 13.9ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 18.6ms | 15.0ms | 81% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 5.1ms | 16.0ms | 316% | 0.06 ops/CPU-ms |
| text-html | Galerina passive ⟨interp⟩ | 1.7ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 440.0ms | — | — | — |
| tri-logic | Rust (generic) | 448.3ms | — | — | — |
| tri-logic | Node.js | 306.8ms | — | — | — |
| tri-logic | Python | 1.78s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 1.03s | 1.09s | 106% | 274.22 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 1.04s | 1.13s | 108% | 266.67 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.30s | 1.30s | 100% | 462.6K ops/CPU-ms |
| data-query | Node.js | 128.8ms | — | — | — |
| data-query | Python | 954.4ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.8ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 56.4ms | 110.0ms | 195% | 90.91 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 50.0ms | 47.0ms | 94% | 212.77 ops/CPU-ms |
| call-chain | Node.js | 7.5ms | 0.0ms | 0% | — |
| call-chain | Python | 734.4ms | 734.4ms | 100% | 1.4K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.10s | 1.19s | 108% | 42.09 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.11s | 1.11s | 99% | 45.13 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.85s | 1.84s | 100% | 54.3K ops/CPU-ms |
| nbody | Node.js | 53.6ms | 63.0ms | 118% | 104.0K ops/CPU-ms |
| nbody | Python | 1.52s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 560.0ms | 579.0ms | 103% | 56.59 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 583.4ms | 609.0ms | 104% | 53.81 ops/CPU-ms |
| nbody | WASM ▶ production | 1.14s | 1.14s | 100% | 28.7K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 31.0ms | 8782% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 108.2ms | 125.0ms | 116% | 4.00 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 102.6ms | 172.0ms | 168% | 2.91 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 140.1ms | — | — | — |
| mandelbrot | Rust (generic) | 141.0ms | — | — | — |
| mandelbrot | Node.js | 524.9ms | 547.0ms | 104% | 6.0K ops/CPU-ms |
| mandelbrot | Python | 24.62s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.34s | 2.38s | 101% | 6.90 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.52s | 2.59s | 103% | 6.32 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.87s | 1.88s | 100% | 8.7K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 32.9ms | — | — | — |
| spectral-norm | Rust (generic) | 27.0ms | — | — | — |
| spectral-norm | Node.js | 41.6ms | 31.0ms | 75% | 322.6K ops/CPU-ms |
| spectral-norm | Python | 6.49s | — | — | — |
| binary-trees | Rust AVX2 | 9.0ms | — | — | — |
| binary-trees | Rust (generic) | 9.0ms | — | — | — |
| binary-trees | Node.js | 1.9ms | 31.0ms | 1595% | 4.4K ops/CPU-ms |
| binary-trees | Python | 28.4ms | 31.3ms | 110% | 4.3K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 445.1ms | 468.0ms | 105% | 290.29 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 426.5ms | 454.0ms | 106% | 299.24 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.16s | 1.17s | 101% | 580.1K ops/CPU-ms |
| spore-container | Rust AVX2 | 2.08s | — | — | — |
| spore-container | Rust (generic) | 2.07s | — | — | — |
| spore-container | Node.js | 7.12s | 8.66s | 122% | 34.65 ops/CPU-ms |
| spore-container | Python | 1.60s | — | — | — |
| framework-pipeline | Node.js | 1.62s | 2.47s | 152% | 81.00 ops/CPU-ms |
| framework-pipeline | Python | 1.86s | — | — | — |
| http-throughput | Node.js | 85.0ms | — | — | — |
| naming-check | Node.js | 475.0ms | — | — | — |
| context-receipt | Node.js | 383.0ms | — | — | — |
| intelligence-search | Node.js | 47.0ms | — | — | — |
| provenance-trace | Node.js | 2.22s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 133.21M/s | 5.00s | 5.00s | 67.0MB | ~0 | 191.8× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 129.72M/s | 5.00s | — | — | ~0 (native) | 186.8× | 0.97× |
| 🥉 | 🟢 | Rust AVX2 | 128.47M/s | 5.00s | — | — | ~0 (native) | 185.0× | 0.96× |
| 4 | ⚪ | WASM ▶ production | 75.70M/s | 1.32s | 1.31s | 93.8MB | ~0 | 109.0× | 0.57× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.16M/s | 0.3ms | 0.0ms | 98.2MB | 138 B/op | 3.11× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.75M/s | 28.6ms | 46.0ms | 94.1MB | 90 B/op | 2.52× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.66M/s | 30.1ms | 32.0ms | 92.9MB | 90 B/op | 2.39× | 0.01× |
| 8 | ⚫ | Python | 694.6K/s | 5.04s | 5.05s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (138 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.56B/s | 12.8ms | — | — | ~0 (native) | 426.2× | 1.65× |
| 🥈 | 🟢 | Rust AVX2 | 1.56B/s | 12.8ms | — | — | ~0 (native) | 425.8× | 1.65× |
| 🥉 | 🟢 | Node.js | 949.34M/s | 21.1ms | 47.0ms | 66.2MB | ~0 | 258.6× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 478.02M/s | 1.06s | 1.06s | 101.5MB | ~0 | 130.2× | 0.50× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 5.12M/s | 12.3ms | 16.0ms | 99.3MB | 13 B/op | 1.40× | 0.01× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 5.10M/s | 12.4ms | 31.0ms | 99.2MB | 14 B/op | 1.39× | 0.01× |
| 7 | ⚫ | Python | 3.67M/s | 5.45s | 5.44s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 33.9K/s | 0.1ms | 0.0ms | 99.4MB | 18.7 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 78.05M/s | 0.5ms | — | — | ~0 (native) | 929.9× | 29.8× |
| 🥈 | 🟢 | Rust AVX2 | 75.04M/s | 0.6ms | — | — | ~0 (native) | 894.1× | 28.7× |
| 🥉 | 🟢 | WASM ▶ production | 36.01M/s | 1.17s | 1.17s | 102.3MB | ~0 | 429.0× | 13.8× |
| 4 | 🟢 | Node.js | 2.62M/s | 16.1ms | 16.0ms | 70.7MB | 27 B/op | 31.2× | 1.00× |
| 5 | 🔴 | Python | 83.9K/s | 501.2ms | 500.0ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 44.0K/s | 955.6ms | 985.0ms | 101.1MB | 26 B/op | 0.52× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 43.4K/s | 968.9ms | 1.05s | 100.6MB | 11 B/op | 0.52× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 24.4K/s | 0.1ms | 0.0ms | 101.1MB | 32.4 KB/op | 0.29× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (32.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 371.8× | 24.2× |
| 🥈 | 🟢 | Rust AVX2 | 1.17B/s | 8.5ms | — | — | ~0 (native) | 370.9× | 24.1× |
| 🥉 | 🟢 | WASM ▶ production | 543.07M/s | 1.01s | 1.03s | 103.3MB | ~0 | 172.1× | 11.2× |
| 4 | 🟢 | Node.js | 48.57M/s | 4.1ms | 16.0ms | 67.2MB | 2 B/op | 15.4× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 7.91M/s | 0.3ms | 0.0ms | 100.9MB | 118 B/op | 2.51× | 0.16× |
| 6 | 🔴 | Python | 3.16M/s | 63.4ms | 78.1ms | — | ~0 | 1.00× | 0.06× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.62M/s | 3.8ms | 0.0ms | 100.8MB | 8 B/op | 0.83× | 0.05× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.02M/s | 4.9ms | 0.0ms | 101.8MB | 6 B/op | 0.64× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (118 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 66.4K/s | 0.1ms | 0.0ms | 101.8MB | 11.9 KB/op | 16.4K× | 528.3× |
| 🥈 | 🟢 | WASM ▶ production | 16.7K/s | 1.02s | 1.01s | 104.0MB | ~0 | 4.1K× | 133.0× |
| 🥉 | 🟢 | Rust AVX2 | 494.1/s | 404.8ms | — | — | ~0 (native) | 122.3× | 3.93× |
| 4 | 🟢 | Rust (generic) | 493.9/s | 404.9ms | — | — | ~0 (native) | 122.3× | 3.93× |
| 5 | 🟢 | Node.js | 125.7/s | 795.6ms | 797.0ms | 65.1MB | 53 B/op | 31.1× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 15.0/s | 66.8ms | 140.0ms | 101.8MB | 1796.1 KB/op | 3.71× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 11.0/s | 91.7ms | 157.0ms | 101.2MB | 700.0 KB/op | 2.72× | 0.09× |
| 8 | 🔴 | Python | 4.0/s | 4.95s | 4.95s | — | 23 B/op | 1.00× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (1796.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 248.94M/s | 526.5ms | — | — | ~0 (native) | 101.0× | 2.65× |
| 🥈 | 🟢 | Rust (generic) | 248.72M/s | 527.0ms | — | — | ~0 (native) | 100.9× | 2.65× |
| 🥉 | 🟢 | WASM ▶ production | 119.53M/s | 1.10s | 1.09s | 104.1MB | ~0 | 48.5× | 1.27× |
| 4 | 🟢 | Node.js | 93.77M/s | 139.8ms | 140.0ms | 65.2MB | ~0 | 38.0× | 1.00× |
| 5 | 🔴 | Python | 2.47M/s | 531.5ms | 531.3ms | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 83.2K/s | 0.1ms | 0.0ms | 103.7MB | 10.8 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 81.1K/s | 808.1ms | 907.0ms | 102.8MB | 62 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 79.8K/s | 821.0ms | 905.0ms | 102.9MB | 70 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (10.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.13B/s | 76.1ms | — | — | ~0 (native) | 1.4K× | 192.8× |
| 🥈 | 🟢 | Rust (generic) | 4.01B/s | 249.3ms | — | — | ~0 (native) | 424.4× | 58.9× |
| 🥉 | 🟢 | WASM ▶ production | 413.34M/s | 1.02s | 1.02s | 105.9MB | ~0 | 43.7× | 6.07× |
| 4 | 🟢 | Node.js | 68.11M/s | 734.1ms | 751.0ms | 82.3MB | ~0 | 7.21× | 1.00× |
| 5 | 🟡 | Python | 9.45M/s | 5.29s | 5.28s | — | ~0 | 1.00× | 0.14× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 7.83M/s | 0.3ms | 0.0ms | 103.6MB | 151 B/op | 0.83× | 0.11× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.16M/s | 4.6ms | 47.0ms | 104.2MB | 17 B/op | 0.23× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.07M/s | 4.8ms | 0.0ms | 103.6MB | 14 B/op | 0.22× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (151 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 886.26M/s | 11.3ms |
| Rust (generic) | 888.08M/s | 11.3ms |
| Node.js | 2.13M/s | 47.1ms |
| Python | 19.5K/s | 5.13s |
| Galerina passive ⟨interp⟩ | 1.8K/s | 1.9ms |
| Galerina manifest ⟨interp⟩ | 831.0/s | 1.2ms |
| Galerina governed ⟨interp⟩ | 701.0/s | 1.4ms |
| WASM ▶ production | 2.84M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 35.89M/s | 1.00s | 1.00s | 105.9MB | ~0 | — | 40.5× |
| 🥈 | 🟢 | Rust (generic) | 1.17M/s | 853.6ms | — | — | ~0 (native) | — | 1.32× |
| 🥉 | 🟢 | Rust AVX2 | 1.17M/s | 854.6ms | — | — | ~0 (native) | — | 1.32× |
| 4 | 🟢 | Node.js | 886.9K/s | 1.13s | 1.13s | 67.0MB | ~0 | — | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 93.3K/s | 10.7ms | 78.0ms | 105.3MB | 848 B/op | — | 0.11× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 4.0K/s | 0.3ms | 0.0ms | 103.4MB | 81.5 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 3.4K/s | 0.3ms | 0.0ms | 103.8MB | 87.9 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (87.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 5.77B/s | 173.4ms | — | — | ~0 | 2.2K× | 8.14× |
| 🥈 | 🟢 | Rust (generic) | 1.33B/s | 753.6ms | — | — | ~0 | 510.3× | 1.87× |
| 🥉 | 🟢 | Node.js | 708.70M/s | 70.6ms | 63.0ms | 65.6MB | ~0 | 272.5× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 441.39M/s | 1.02s | 1.02s | 106.3MB | ~0 | 169.7× | 0.62× |
| 5 | ⚫ | Python | 2.60M/s | 3.85s | 3.84s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 143.5K/s | 0.6ms | 0.0ms | 105.0MB | -4.3 KB/op | 0.06× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 119.4K/s | 83.7ms | 156.0ms | 103.7MB | 36 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 105.2K/s | 95.1ms | 140.0ms | 103.9MB | 58 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.3 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (58 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.18B/s | 4.25s | — | — | ~0 (native) | 216.0× | 1.20× |
| 🥈 | 🟢 | Rust AVX2 | 1.18B/s | 4.25s | — | — | ~0 (native) | 215.9× | 1.20× |
| 🥉 | 🟢 | Node.js | 980.29M/s | 510.1ms | 500.0ms | 65.4MB | ~0 | 180.1× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 464.00M/s | 1.08s | 1.08s | 107.0MB | ~0 | 85.2× | 0.47× |
| 5 | ⚫ | Python | 5.44M/s | 9.18s | 9.17s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.00M/s | 25.0ms | — | — | — | 0.74× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 338.0K/s | 0.2ms | 0.0ms | 104.9MB | 3.5 KB/op | 0.06× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 305.2K/s | 327.6ms | 421.0ms | 104.6MB | 4 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 293.1K/s | 341.2ms | 343.0ms | 104.8MB | 12 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 21.20B/s | 0.6ms | — | — | 332 B/op | 1.00× | 35.2× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.51B/s | 13.9ms | — | — | — | 0.07× | 2.51× |
| 🥉 | 🟢 | Rust (generic) | 1.49B/s | 88.0ms | — | — | ~0 (native) | 0.07× | 2.47× |
| 4 | 🟢 | Rust AVX2 | 1.40B/s | 93.8ms | — | — | ~0 (native) | 0.07× | 2.32× |
| 5 | 🟢 | Node.js | 602.77M/s | 217.4ms | 219.0ms | 67.1MB | ~0 | 0.03× | 1.00× |
| 6 | ⚪ | WASM ▶ production | 429.93M/s | 1.07s | 1.06s | 108.1MB | ~0 | 0.02× | 0.71× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 825.4K/s | 0.1ms | 0.0ms | 104.9MB | 1.4 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 630.6K/s | 52.0ms | 78.0ms | 104.1MB | 34 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 590.0K/s | 55.5ms | 46.0ms | 104.9MB | 35 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.4K/s | 18.6ms | 15.0ms | 105.8MB | -644 B/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.4K/s | 0.7ms | 0.0ms | 105.0MB | 196.9 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 197.0/s | 5.1ms | 16.0ms | 105.0MB | 338.2 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-644 B/op) · **highest:** Galerina governed ⟨interp⟩ (338.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 59.9K/s | 1.7ms | 0.0ms | 104.0MB | -3.1 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 1.6K/s | 0.6ms | 0.0ms | 105.8MB | 152.1 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 893.0/s | 1.1ms | 0.0ms | 105.8MB | 171.3 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.1 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.36B/s | 440.0ms | — | — | ~0 (native) | 201.8× | 1.39× |
| 🥈 | 🟢 | Rust (generic) | 1.34B/s | 448.3ms | — | — | ~0 (native) | 198.1× | 1.37× |
| 🥉 | 🟢 | Node.js | 977.99M/s | 306.8ms | — | — | ~0 | 144.8× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 461.98M/s | 1.30s | 1.30s | 107.2MB | ~0 | 68.4× | 0.47× |
| 5 | ⚫ | Python | 6.76M/s | 1.78s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 300.0K/s | 1.6ms | 0.0ms | 105.1MB | 557 B/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 291.6K/s | 1.03s | 1.09s | 105.0MB | 4 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 288.2K/s | 1.04s | 1.13s | 105.2MB | 5 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (557 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 3.65B/s | — | — | — | ~0 (native) | 386.0× | 1.97× |
| 🥈 | 🟢 | Rust AVX2 | 3.51B/s | — | — | — | ~0 (native) | 371.3× | 1.90× |
| 🥉 | 🟢 | Node.js | 1.85B/s | — | — | — | — | 195.6× | 1.00× |
| 4 | ⚫ | Python | 9.46M/s | — | — | — | — | 1.00× | 0.01× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 388.22M/s | 128.8ms | — | — | ~0 | 123.5× | 1.00× |
| 🥈 | ⚫ | Python | 3.14M/s | 954.4ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 261.3K/s | 0.8ms | 0.0ms | 105.8MB | 5.7 KB/op | 0.08× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 200.0K/s | 50.0ms | 47.0ms | 106.9MB | 130 B/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 177.4K/s | 56.4ms | 110.0ms | 105.0MB | 77 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (5.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 267.19M/s | 7.5ms | 0.0ms | 66.3MB | ~0 | 196.2× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 54.16M/s | 1.85s | 1.84s | 108.0MB | ~0 | 39.8× | 0.20× |
| 🥉 | ⚫ | Python | 1.36M/s | 734.4ms | 734.4ms | — | ~0 | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 51.0K/s | 0.1ms | 0.0ms | 107.3MB | 18.7 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 45.4K/s | 1.10s | 1.19s | 107.3MB | 26 B/op | 0.03× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 44.9K/s | 1.11s | 1.11s | 105.2MB | 10 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.26M/s | 53.6ms | 63.0ms | 67.4MB | ~0 | 113.2× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 28.78M/s | 1.14s | 1.14s | 107.7MB | ~0 | 26.7× | 0.24× |
| 🥉 | ⚫ | Python | 1.08M/s | 1.52s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 58.5K/s | 560.0ms | 579.0ms | 107.1MB | 16 B/op | 0.05× | 0.00× |
| 5 | ⚫ | Galerina passive ⟨interp⟩ | 58.3K/s | 0.2ms | 0.0ms | 107.1MB | 17.4 KB/op | 0.05× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 56.2K/s | 583.4ms | 609.0ms | 105.6MB | 23 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (17.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 2.91M/s | — | — | — | — | 6.78× | 1.00× |
| 🥈 | 🟡 | Python | 428.5K/s | — | — | — | 1 B/op | 1.00× | 0.15× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 8.9K/s | 0.4ms | 31.0ms | 114.4MB | 135.2 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 4.9K/s | 102.6ms | 172.0ms | 113.5MB | 5.1 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.6K/s | 108.2ms | 125.0ms | 106.8MB | 6.7 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (135.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 23.39M/s | 140.1ms | — | — | ~0 (native) | 175.7× | 3.75× |
| 🥈 | 🟢 | Rust (generic) | 23.24M/s | 141.0ms | — | — | ~0 (native) | 174.6× | 3.72× |
| 🥉 | 🟢 | WASM ▶ production | 8.77M/s | 1.87s | 1.88s | 115.4MB | ~0 | 65.8× | 1.40× |
| 4 | 🟢 | Node.js | 6.24M/s | 524.9ms | 547.0ms | 67.1MB | ~0 | 46.9× | 1.00× |
| 5 | 🔴 | Python | 133.1K/s | 24.62s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 7.0K/s | 2.34s | 2.38s | 109.4MB | 186 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 6.9K/s | 0.2ms | 0.0ms | 109.4MB | 141.8 KB/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 6.5K/s | 2.52s | 2.59s | 110.1MB | 9 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (141.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 370.36M/s | 27.0ms | — | — | ~0 (native) | 240.2× | 1.54× |
| 🥈 | 🟢 | Rust AVX2 | 304.31M/s | 32.9ms | — | — | ~0 (native) | 197.4× | 1.27× |
| 🥉 | 🟢 | Node.js | 240.52M/s | 41.6ms | 31.0ms | 67.4MB | ~0 | 156.0× | 1.00× |
| 4 | ⚫ | Python | 1.54M/s | 6.49s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 583.23M/s | 1.16s | 1.17s | 111.6MB | ~0 | 122.1× | 8.35× |
| 🥈 | 🟢 | Node.js | 69.88M/s | 1.9ms | 31.0ms | 67.1MB | 3 B/op | 14.6× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 15.17M/s | 9.0ms | — | — | ~0 (native) | 3.18× | 0.22× |
| 4 | 🟡 | Rust (generic) | 15.15M/s | 9.0ms | — | — | ~0 (native) | 3.17× | 0.22× |
| 5 | 🔴 | Python | 4.78M/s | 28.4ms | 31.3ms | — | ~0 | 1.00× | 0.07× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 353.2K/s | 0.1ms | 0.0ms | 110.6MB | 2.4 KB/op | 0.07× | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 318.5K/s | 426.5ms | 454.0ms | 107.6MB | 2 B/op | 0.07× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 305.2K/s | 445.1ms | 468.0ms | 110.6MB | 14 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 145.3K/s | 2.07s | — | — | ~0 (native) | 2.32× | 3.45× |
| 🥈 | 🟢 | Rust AVX2 | 144.0K/s | 2.08s | — | — | ~0 (native) | 2.30× | 3.42× |
| 🥉 | 🟢 | Python | 62.6K/s | 1.60s | — | — | ~0 | 1.00× | 1.49× |
| 4 | 🟢 | Node.js | 42.1K/s | 7.12s | 8.66s | 82.8MB | 6 B/op | 0.67× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (6 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 123.2K/s | 1.62s | 2.47s | 93.1MB | 70 B/op | 1.14× | 1.00× |
| 🥈 | ⚪ | Python | 107.8K/s | 1.86s | — | — | ~0 | 1.00× | 0.88× |

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
| 🥇 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.25s | 1.20× |
| 🥈 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.25s | 1.20× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 980.29M/s | 510.1ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 464.00M/s | 1.08s | 0.47× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.44M/s | 9.18s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.00M/s | 25.0ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 338.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 305.2K/s | 327.6ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 293.1K/s | 341.2ms | 0.00× |

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
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **192× slower** | **62× slower** | **76× slower** | **80× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **426× slower** | **46.2K× slower** | **307× slower** | **306× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **30× slower** | **930× slower** | **3.2K× slower** | **1.8K× slower** | **1.8K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust (generic) | **🏆 winner** | **🏆 winner** | **24× slower** | **372× slower** | **148× slower** | **447× slower** | **580× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **134× slower** | **134× slower** | **528× slower** | **16.4K× slower** | **🏆 winner** | **4.4K× slower** | **6.0K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 3× slower | **101× slower** | **3.0K× slower** | **3.1K× slower** | **3.1K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **193× slower** | **1.4K× slower** | **1.7K× slower** | **6.4K× slower** | **6.1K× slower** | **32× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **31× slower** | **31× slower** | **40× slower** | not run | **385× slower** | **10.4K× slower** | **9.0K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 4× slower | 8× slower | **2.2K× slower** | **40.2K× slower** | **54.8K× slower** | **48.3K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.2× slower | **216× slower** | **3.5K× slower** | **4.0K× slower** | **3.9K× slower** | 3× slower | **294× slower** |
| **matrix-multiply** | Python | **15× slower** | **14× slower** | **35× slower** | **🏆 winner** | **25.7K× slower** | **35.9K× slower** | **33.6K× slower** | **49× slower** | **14× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 4× slower | **27× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **37× slower** | **67× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.4× slower | **202× slower** | **4.5K× slower** | **4.7K× slower** | **4.7K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **386× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **124× slower** | **1.5K× slower** | **2.2K× slower** | **1.9K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **196× slower** | **5.2K× slower** | **5.9K× slower** | **6.0K× slower** | 5× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **113× slower** | **2.1K× slower** | **2.1K× slower** | **2.2K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 7× slower | **328× slower** | **629× slower** | **596× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **176× slower** | **3.4K× slower** | **3.3K× slower** | **3.6K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | 1.2× slower | **🏆 winner** | 2× slower | **240× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **38× slower** | **38× slower** | 8× slower | **122× slower** | **1.7K× slower** | **1.9K× slower** | **1.8K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 3× slower | 2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 1.1× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 133.21M/s | 🏆 winner | 192× faster |
| 🥈 | Rust (generic) | 129.72M/s | 1.0× slower | 187× faster |
| 🥉 | Rust AVX2 | 128.47M/s | 1.0× slower | 185× faster |
| 4 | WASM ▶ production | 75.70M/s | 1.8× slower | 109× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.16M/s | 62× slower | 3.1× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.75M/s | 76× slower | 2.5× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.66M/s | 80× slower | 2.4× faster |
| 8 | Python | 694.6K/s | 192× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.56B/s | 🏆 winner | 46.2K× faster |
| 🥈 | Rust AVX2 | 1.56B/s | 1.0× slower | 46.1K× faster |
| 🥉 | Node.js | 949.34M/s | 1.6× slower | 28.0K× faster |
| 4 | WASM ▶ production | 478.02M/s | 3.3× slower | 14.1K× faster |
| 5 | Galerina governed ⟨interp⟩ | 5.12M/s | 306× slower | 151× faster |
| 6 | Galerina manifest ⟨interp⟩ | 5.10M/s | 307× slower | 150× faster |
| 7 | Python | 3.67M/s | 426× slower | 108× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 33.9K/s | 46.2K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 78.05M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust AVX2 | 75.04M/s | 1.0× slower | 3.1K× faster |
| 🥉 | WASM ▶ production | 36.01M/s | 2.2× slower | 1.5K× faster |
| 4 | Node.js | 2.62M/s | 30× slower | 107× faster |
| 5 | Python | 83.9K/s | 930× slower | 3.4× faster |
| 6 | Galerina manifest ⟨interp⟩ | 44.0K/s | 1.8K× slower | 1.8× faster |
| 7 | Galerina governed ⟨interp⟩ | 43.4K/s | 1.8K× slower | 1.8× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 24.4K/s | 3.2K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.17B/s | 🏆 winner | 580× faster |
| 🥈 | Rust AVX2 | 1.17B/s | 1.0× slower | 578× faster |
| 🥉 | WASM ▶ production | 543.07M/s | 2.2× slower | 268× faster |
| 4 | Node.js | 48.57M/s | 24× slower | 24× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 7.91M/s | 148× slower | 3.9× faster |
| 6 | Python | 3.16M/s | 372× slower | 1.6× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.62M/s | 447× slower | 1.3× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.02M/s | 580× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 16.7K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 66.4K/s | 🏆 winner | 16.4K× faster |
| 🥈 | WASM ▶ production | 16.7K/s | 4.0× slower | 4.1K× faster |
| 🥉 | Rust AVX2 | 494.1/s | 134× slower | 122× faster |
| 4 | Rust (generic) | 493.9/s | 134× slower | 122× faster |
| 5 | Node.js | 125.7/s | 528× slower | 31× faster |
| 6 | Galerina manifest ⟨interp⟩ | 15.0/s | 4.4K× slower | 3.7× faster |
| 7 | Galerina governed ⟨interp⟩ | 11.0/s | 6.0K× slower | 2.7× faster |
| 8 | Python | 4.0/s | 16.4K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 248.94M/s | 🏆 winner | 3.1K× faster |
| 🥈 | Rust (generic) | 248.72M/s | 1.0× slower | 3.1K× faster |
| 🥉 | WASM ▶ production | 119.53M/s | 2.1× slower | 1.5K× faster |
| 4 | Node.js | 93.77M/s | 2.7× slower | 1.2K× faster |
| 5 | Python | 2.47M/s | 101× slower | 31× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 83.2K/s | 3.0K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 81.1K/s | 3.1K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 79.8K/s | 3.1K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.13B/s | 🏆 winner | 6.4K× faster |
| 🥈 | Rust (generic) | 4.01B/s | 3.3× slower | 1.9K× faster |
| 🥉 | WASM ▶ production | 413.34M/s | 32× slower | 200× faster |
| 4 | Node.js | 68.11M/s | 193× slower | 33× faster |
| 5 | Python | 9.45M/s | 1.4K× slower | 4.6× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 7.83M/s | 1.7K× slower | 3.8× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.16M/s | 6.1K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.07M/s | 6.4K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 35.89M/s | 🏆 winner | 10.4K× faster |
| 🥈 | Rust (generic) | 1.17M/s | 31× slower | 340× faster |
| 🥉 | Rust AVX2 | 1.17M/s | 31× slower | 339× faster |
| 4 | Node.js | 886.9K/s | 40× slower | 257× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 93.3K/s | 385× slower | 27× faster |
| 6 | Galerina governed ⟨interp⟩ | 4.0K/s | 9.0K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 3.4K/s | 10.4K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 5.77B/s | 🏆 winner | 54.8K× faster |
| 🥈 | Rust (generic) | 1.33B/s | 4.3× slower | 12.6K× faster |
| 🥉 | Node.js | 708.70M/s | 8.1× slower | 6.7K× faster |
| 4 | WASM ▶ production | 441.39M/s | 13× slower | 4.2K× faster |
| 5 | Python | 2.60M/s | 2.2K× slower | 25× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 143.5K/s | 40.2K× slower | 1.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 119.4K/s | 48.3K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 105.2K/s | 54.8K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.18B/s | 🏆 winner | 4.0K× faster |
| 🥈 | Rust AVX2 | 1.18B/s | 1.0× slower | 4.0K× faster |
| 🥉 | Node.js | 980.29M/s | 1.2× slower | 3.3K× faster |
| 4 | WASM ▶ production | 464.00M/s | 2.5× slower | 1.6K× faster |
| 5 | Python | 5.44M/s | 216× slower | 19× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.00M/s | 294× slower | 14× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 338.0K/s | 3.5K× slower | 1.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 305.2K/s | 3.9K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 293.1K/s | 4.0K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 21.20B/s | 🏆 winner | 35.9K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.51B/s | 14× slower | 2.6K× faster |
| 🥉 | Rust (generic) | 1.49B/s | 14× slower | 2.5K× faster |
| 4 | Rust AVX2 | 1.40B/s | 15× slower | 2.4K× faster |
| 5 | Node.js | 602.77M/s | 35× slower | 1.0K× faster |
| 6 | WASM ▶ production | 429.93M/s | 49× slower | 729× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 825.4K/s | 25.7K× slower | 1.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 630.6K/s | 33.6K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 590.0K/s | 35.9K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.4K/s | 🏆 winner | 27× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.4K/s | 3.7× slower | 7.4× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 197.0/s | 27× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.6K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 59.9K/s | 🏆 winner | 67× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.6K/s | 37× slower | 1.8× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 893.0/s | 67× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.36B/s | 🏆 winner | 4.7K× faster |
| 🥈 | Rust (generic) | 1.34B/s | 1.0× slower | 4.6K× faster |
| 🥉 | Node.js | 977.99M/s | 1.4× slower | 3.4K× faster |
| 4 | WASM ▶ production | 461.98M/s | 3.0× slower | 1.6K× faster |
| 5 | Python | 6.76M/s | 202× slower | 23× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 300.0K/s | 4.5K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 291.6K/s | 4.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 288.2K/s | 4.7K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 3.65B/s | 🏆 winner | 386× faster |
| 🥈 | Rust AVX2 | 3.51B/s | 1.0× slower | 371× faster |
| 🥉 | Node.js | 1.85B/s | 2.0× slower | 196× faster |
| 4 | Python | 9.46M/s | 386× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 388.22M/s | 🏆 winner | 2.2K× faster |
| 🥈 | Python | 3.14M/s | 124× slower | 18× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 261.3K/s | 1.5K× slower | 1.5× faster |
| 4 | Galerina governed ⟨interp⟩ | 200.0K/s | 1.9K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 177.4K/s | 2.2K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 267.19M/s | 🏆 winner | 6.0K× faster |
| 🥈 | WASM ▶ production | 54.16M/s | 4.9× slower | 1.2K× faster |
| 🥉 | Python | 1.36M/s | 196× slower | 30× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 51.0K/s | 5.2K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 45.4K/s | 5.9K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 44.9K/s | 6.0K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.26M/s | 🏆 winner | 2.2K× faster |
| 🥈 | WASM ▶ production | 28.78M/s | 4.2× slower | 512× faster |
| 🥉 | Python | 1.08M/s | 113× slower | 19× faster |
| 4 | Galerina manifest ⟨interp⟩ | 58.5K/s | 2.1K× slower | 1.0× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 58.3K/s | 2.1K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 56.2K/s | 2.2K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 2.91M/s | 🏆 winner | 629× faster |
| 🥈 | Python | 428.5K/s | 6.8× slower | 93× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 8.9K/s | 328× slower | 1.9× faster |
| 4 | Galerina governed ⟨interp⟩ | 4.9K/s | 596× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.6K/s | 629× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 23.39M/s | 🏆 winner | 3.6K× faster |
| 🥈 | Rust (generic) | 23.24M/s | 1.0× slower | 3.6K× faster |
| 🥉 | WASM ▶ production | 8.77M/s | 2.7× slower | 1.3K× faster |
| 4 | Node.js | 6.24M/s | 3.7× slower | 961× faster |
| 5 | Python | 133.1K/s | 176× slower | 20× faster |
| 6 | Galerina manifest ⟨interp⟩ | 7.0K/s | 3.3K× slower | 1.1× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 6.9K/s | 3.4K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 6.5K/s | 3.6K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 370.36M/s | 🏆 winner | 240× faster |
| 🥈 | Rust AVX2 | 304.31M/s | 1.2× slower | 197× faster |
| 🥉 | Node.js | 240.52M/s | 1.5× slower | 156× faster |
| 4 | Python | 1.54M/s | 240× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 583.23M/s | 🏆 winner | 1.9K× faster |
| 🥈 | Node.js | 69.88M/s | 8.3× slower | 229× faster |
| 🥉 | Rust AVX2 | 15.17M/s | 38× slower | 50× faster |
| 4 | Rust (generic) | 15.15M/s | 38× slower | 50× faster |
| 5 | Python | 4.78M/s | 122× slower | 16× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 353.2K/s | 1.7K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 318.5K/s | 1.8K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 305.2K/s | 1.9K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 145.3K/s | 🏆 winner | 3.4× faster |
| 🥈 | Rust AVX2 | 144.0K/s | 1.0× slower | 3.4× faster |
| 🥉 | Python | 62.6K/s | 2.3× slower | 1.5× faster |
| 4 | Node.js | 42.1K/s | 3.4× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 123.2K/s | 🏆 winner | 1.1× faster |
| 🥈 | Python | 107.8K/s | 1.1× slower | — (slowest) |


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
