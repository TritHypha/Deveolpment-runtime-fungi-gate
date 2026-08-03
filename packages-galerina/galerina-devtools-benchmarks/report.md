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
| compute-mix | 77.74M/s | ⚪ 1.7× slower | ⚪ 1.7× slower | 1.71M/s | WASM near native |
| arithmetic-threshold | 493.38M/s | UNCERTIFIED | UNCERTIFIED | 5.47M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.65M/s | UNCERTIFIED | UNCERTIFIED | 44.2K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.0K/s | UNCERTIFIED | UNCERTIFIED | 11.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 121.39M/s | 🟡 2.1× slower | 🟢 1.0× slower | 87.4K/s | WASM usable |
| hardware-targets | 40.04M/s | UNCERTIFIED | UNCERTIFIED | 3.2K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 442.54M/s | 🟡 3.3× slower | ⚪ 1.4× slower | 687.8K/s | WASM usable |
| tri-logic | 469.61M/s | 🟡 3.0× slower | 🟡 2.1× slower | 302.7K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 232.4K/s | WASM not built for this lane yet |
| call-chain | 54.95M/s | — | 🟡 5.5× slower | 48.8K/s | WASM 2–10× under Node |
| nbody | 29.25M/s | — | 🟡 4.2× slower | 56.0K/s | WASM 2–10× under Node |
| mandelbrot | 9.11M/s | 🟡 2.6× slower | 🟢 1.5× | 7.2K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Rust AVX2 — 2.41B/s on verified-native-operation.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 6 B/op | 9 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 27 B/op | 46 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 15 B/op | 12 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.19B/s | 466.22M/s | 4.01M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.59B/s | 442.54M/s | 1.59B/s | ⚪ 1.4× slower | real GPU dispatch wins |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (206.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 206.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (917.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 917.0/s |
| json-parse | records/s | **Node.js** (3.16M/s) | 3.16M/s | 549.5K/s | not run — no native impl | no WASM — strings/records | 5.3K/s |
| spore-container | containers/s | **Rust (generic)** (163.6K/s) | 46.3K/s | 68.6K/s | 163.6K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (393.6K/s) | 393.6K/s | 125.2K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (4.2K/s) | 4.2K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.9K/s) | 6.9K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (18.5K/s) | 18.5K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (110.0K/s) | 110.0K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (758.0/s) | 758.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 786.0/s | 915.0/s | 2.93M/s | 0.86× governed/manifest (gov overhead ≈ 1.16×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **130.44M/s** | **132.68M/s** | not run — no C++ impl | **135.45M/s** | 749.7K/s | 2.12M/s | 1.31M/s | 1.71M/s | 77.74M/s | not run — no GPU path | 79.3× |
| arithmetic-threshold | not run — no AVX-512 | **1.56B/s** | **1.57B/s** | not run — no C++ impl | 970.77M/s | 4.57M/s | 35.9K/s | 5.45M/s | 5.47M/s | 493.38M/s | not run — no GPU path | 177.4× |
| six-digit-guess | not run — no AVX-512 | **75.17M/s** | **78.04M/s** | not run — no C++ impl | 2.87M/s | 89.3K/s | 26.8K/s | 45.0K/s | 44.2K/s | 36.65M/s | not run — no GPU path | 65.0× |
| record-allocation | not run — no AVX-512 | **1.18B/s** | **1.17B/s** | not run — no C++ impl | 56.88M/s | 4.53M/s | 8.01M/s | 2.51M/s | 2.33M/s | 551.98M/s | not run — no GPU path | 24.4× |
| fibonacci-recursive | not run — no AVX-512 | 503.5/s | 497.3/s | not run — no C++ impl | 127.8/s | 4.5/s | **63.4K/s** | 15.0/s | 11.0/s | 17.0K/s | not run — no GPU path | 11.6× |
| tower-of-hanoi | not run — no AVX-512 | **252.92M/s** | **251.85M/s** | not run — no C++ impl | 124.65M/s | 3.28M/s | 89.1K/s | 87.8K/s | 87.4K/s | 121.39M/s | not run — no GPU path | 1.4K× |
| collection-pipeline | not run — no AVX-512 | **13.29B/s** | 4.31B/s | not run — no C++ impl | 71.25M/s | 12.46M/s | 8.53M/s | 2.20M/s | 2.43M/s | 422.77M/s | not run — no GPU path | 29.3× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.18M/s | 1.18M/s | not run — no C++ impl | 918.3K/s | not run | 89.7K/s | 4.5K/s | 3.2K/s | **40.04M/s** | not run — no GPU path | 284.7× |
| low-memory | not run — no AVX-512 | **5.84B/s** | 1.36B/s | not run — no C++ impl | 704.58M/s | 3.83M/s | 154.4K/s | 115.8K/s | 145.9K/s | 473.52M/s | not run — no GPU path | 4.8K× |
| gpu-compute | not run — no AVX-512 | **1.19B/s** | **1.19B/s** | not run — no C++ impl | 991.39M/s | 7.92M/s | 341.0K/s | 318.0K/s | 307.5K/s | 466.22M/s | 4.01M/s | 3.2K× |
| matrix-multiply | not run — no AVX-512 | 1.43B/s | 1.48B/s | not run — no C++ impl | 616.00M/s | 7.53M/s | 737.6K/s | 630.6K/s | 687.8K/s | 442.54M/s | **1.59B/s** | 895.6× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **4.5K/s** | 2.0K/s | 206.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **64.1K/s** | 1.6K/s | 917.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.39B/s** | **1.39B/s** | not run — no C++ impl | 998.35M/s | 7.93M/s | 306.0K/s | 293.2K/s | 302.7K/s | 469.61M/s | not run — no GPU path | 3.3K× |
| verified-native-operation | not run — no AVX-512 | **2.41B/s** | **2.41B/s** | not run — no C++ impl | 2.03B/s | 10.66M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **392.98M/s** | 3.96M/s | 268.2K/s | 231.4K/s | 232.4K/s | no WASM build | not run — no GPU path | 1.7K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **304.41M/s** | 1.54M/s | 52.5K/s | 48.0K/s | 48.8K/s | 54.95M/s | not run — no GPU path | 6.2K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.16M/s** | 1.25M/s | 59.3K/s | 58.7K/s | 56.0K/s | 29.25M/s | not run — no GPU path | 2.2K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.16M/s** | 549.5K/s | 9.5K/s | 4.9K/s | 5.3K/s | no WASM — strings/records | not run — no GPU path | 594.3× |
| mandelbrot | not run — no AVX-512 | **22.57M/s** | **23.45M/s** | not run — no C++ impl | 6.13M/s | 167.2K/s | 7.2K/s | 7.2K/s | 7.2K/s | 9.11M/s | not run — no GPU path | 854.2× |
| spectral-norm | not run — no AVX-512 | **373.42M/s** | **376.82M/s** | not run — no C++ impl | 240.13M/s | 1.97M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 20.08M/s | 16.32M/s | not run — no C++ impl | 85.83M/s | 3.14M/s | 377.7K/s | 326.0K/s | 337.8K/s | **590.26M/s** | not run — no GPU path | 254.0× |
| spore-container | not run — no AVX-512 | **163.1K/s** | **163.6K/s** | not run — no C++ impl | 46.3K/s | 68.6K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **393.6K/s** | 125.2K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -38.00 bytes/op ⚡ ~0 — no boxing | 154.4K/s | — | -380KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 5.84B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.36B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 704.58M/s | — | 17KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 473.52M/s | — | 42KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 3.83M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 27 bytes/op ⚠ moderate | 145.9K/s | — | 271KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 46 bytes/op ⚠ moderate | 115.8K/s | — | 459KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 43.5MB | 43.8MB | 5.0MB | 947KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 76.3MB | 76.3MB | 20.3MB | 125KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 75.3MB | 75.3MB | 21.9MB | 4.4MB |
| compute-mix | Galerina governed ⟨interp⟩ | 74.3MB | 74.3MB | 21.6MB | 4.5MB |
| compute-mix | WASM ▶ production | 73.4MB | 73.4MB | 17.4MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 45.4MB | 45.6MB | 4.3MB | 206KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 78.5MB | 78.5MB | 18.6MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 78.3MB | 78.3MB | 18.5MB | 843KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 78.2MB | 78.2MB | 18.5MB | 845KB |
| arithmetic-threshold | WASM ▶ production | 80.3MB | 80.3MB | 18.0MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 50.0MB | 50.0MB | 5.9MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 80.4MB | 80.4MB | 19.0MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 79.9MB | 79.9MB | 20.3MB | 1.9MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 80.0MB | 80.0MB | 19.4MB | 1.5MB |
| six-digit-guess | WASM ▶ production | 81.5MB | 81.5MB | 18.2MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 46.2MB | 46.2MB | 4.2MB | 68KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 80.4MB | 80.4MB | 19.1MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 80.3MB | 80.3MB | 18.5MB | 86KB |
| record-allocation | Galerina governed ⟨interp⟩ | 81.2MB | 81.2MB | 18.5MB | 60KB |
| record-allocation | WASM ▶ production | 82.5MB | 82.5MB | 18.8MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 44.5MB | 44.5MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 81.0MB | 81.0MB | 20.9MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 81.0MB | 81.0MB | 19.5MB | 801KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 80.6MB | 80.6MB | 19.3MB | 679KB |
| fibonacci-recursive | WASM ▶ production | 82.6MB | 82.6MB | 18.8MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 44.6MB | 44.6MB | 4.1MB | 15KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 85.1MB | 85.1MB | 24.4MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 81.0MB | 81.0MB | 19.5MB | 1.8MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 81.2MB | 81.2MB | 21.7MB | 4.0MB |
| tower-of-hanoi | WASM ▶ production | 82.9MB | 82.9MB | 18.1MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 61.4MB | 61.4MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 84.6MB | 84.6MB | 18.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 84.6MB | 84.6MB | 17.8MB | 143KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 85.4MB | 85.4MB | 17.9MB | 168KB |
| collection-pipeline | WASM ▶ production | 87.3MB | 87.3MB | 18.0MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 44.5MB | 44.5MB | 4.1MB | 27KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 86.8MB | 86.8MB | 18.8MB | 525KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 88.1MB | 88.1MB | 18.3MB | 487KB |
| governance-cost | Galerina governed ⟨interp⟩ | 85.9MB | 85.9MB | 18.4MB | 516KB |
| governance-cost | WASM ▶ production | 86.8MB | 86.8MB | 18.1MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 46.5MB | 46.5MB | 4.5MB | 334KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 86.3MB | 86.3MB | 20.0MB | 1.2MB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 84.9MB | 84.9MB | 18.0MB | 82KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 84.6MB | 84.6MB | 18.1MB | 83KB |
| hardware-targets | WASM ▶ production | 86.6MB | 86.6MB | 18.3MB | 75KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 44.6MB | 44.6MB | 4.1MB | 17KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 84.8MB | 84.8MB | 18.6MB | -380KB |
| low-memory | Galerina manifest ⟨interp⟩ | 85.2MB | 85.2MB | 18.5MB | 459KB |
| low-memory | Galerina governed ⟨interp⟩ | 84.9MB | 84.9MB | 18.3MB | 271KB |
| low-memory | WASM ▶ production | 87.0MB | 87.0MB | 18.3MB | 42KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 44.7MB | 44.7MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 85.1MB | 85.1MB | 19.7MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 85.0MB | 85.0MB | 20.4MB | 2.2MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 84.8MB | 84.8MB | 18.6MB | 423KB |
| gpu-compute | WASM ▶ production | 87.1MB | 87.1MB | 18.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 47.0MB | 47.0MB | 5.0MB | 844KB |
| matrix-multiply | Python | — | — | 392B | 392B |
| matrix-multiply | Galerina passive ⟨interp⟩ | 85.3MB | 85.3MB | 18.9MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 86.8MB | 86.8MB | 19.4MB | 1.2MB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 86.8MB | 86.8MB | 19.2MB | 1.0MB |
| matrix-multiply | WASM ▶ production | 88.2MB | 88.2MB | 18.4MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 61.2MB | 61.2MB | 10.0MB | 4.5MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 86.9MB | 86.9MB | 18.8MB | -161KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 85.6MB | 85.6MB | 18.5MB | 198KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 85.6MB | 85.6MB | 18.5MB | 334KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 85.4MB | 85.4MB | 19.3MB | -348KB |
| text-html | Galerina manifest ⟨interp⟩ | 85.9MB | 85.9MB | 18.8MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 85.5MB | 85.5MB | 18.9MB | 176KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 282KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 85.9MB | 85.9MB | 20.3MB | 267KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 85.7MB | 85.7MB | 20.0MB | 1.2MB |
| tri-logic | Galerina governed ⟨interp⟩ | 87.5MB | 87.5MB | 19.3MB | 565KB |
| tri-logic | WASM ▶ production | 88.5MB | 88.5MB | 19.1MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 12KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 86.4MB | 86.4MB | 20.1MB | -936KB |
| data-query | Galerina manifest ⟨interp⟩ | 86.3MB | 86.3MB | 19.6MB | 714KB |
| data-query | Galerina governed ⟨interp⟩ | 87.9MB | 87.9MB | 20.2MB | 1.3MB |
| call-chain | Node.js | 45.5MB | 45.5MB | 4.1MB | 11KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 86.3MB | 86.3MB | 21.1MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 86.3MB | 86.3MB | 22.4MB | 3.4MB |
| call-chain | Galerina governed ⟨interp⟩ | 86.8MB | 86.8MB | 19.4MB | 456KB |
| call-chain | WASM ▶ production | 89.0MB | 89.0MB | 19.2MB | 1KB |
| nbody | Node.js | 46.8MB | 46.8MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 88.2MB | 88.2MB | 19.9MB | 236KB |
| nbody | Galerina manifest ⟨interp⟩ | 88.2MB | 88.2MB | 19.5MB | 488KB |
| nbody | Galerina governed ⟨interp⟩ | 88.1MB | 88.1MB | 20.6MB | 1.6MB |
| nbody | WASM ▶ production | 88.4MB | 88.4MB | 19.3MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 96.0MB | 96.0MB | 21.6MB | 432KB |
| json-parse | Galerina manifest ⟨interp⟩ | 92.2MB | 92.2MB | 20.6MB | 1.0MB |
| json-parse | Galerina governed ⟨interp⟩ | 95.1MB | 95.1MB | 21.5MB | 2.5MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 46.6MB | 46.6MB | 4.2MB | 33KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 90.4MB | 90.4MB | 20.8MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 90.4MB | 90.4MB | 20.4MB | 996KB |
| mandelbrot | Galerina governed ⟨interp⟩ | 90.6MB | 90.6MB | 21.9MB | 2.2MB |
| mandelbrot | WASM ▶ production | 96.2MB | 96.2MB | 20.0MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 46.5MB | 46.5MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 46.7MB | 46.7MB | 4.6MB | 429KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 91.3MB | 91.3MB | 23.8MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 91.3MB | 91.3MB | 21.1MB | 1.6MB |
| binary-trees | Galerina governed ⟨interp⟩ | 90.4MB | 90.4MB | 21.5MB | 2.0MB |
| binary-trees | WASM ▶ production | 92.7MB | 92.7MB | 19.8MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 62.5MB | 62.5MB | 8.9MB | 1.6MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 77.2MB | 77.2MB | 9.6MB | 2.9MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 135.4K ops/CPU-ms |
| compute-mix | Python | 5.07s | 5.06s | 100% | 750.62 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 38.3ms | 31.0ms | 81% | 1.6K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 29.3ms | 47.0ms | 160% | 1.1K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.29s | 1.28s | 100% | 78.1K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 20.6ms | 16.0ms | 78% | 1.25M ops/CPU-ms |
| arithmetic-threshold | Python | 4.38s | 4.38s | 100% | 4.6K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 11.6ms | 31.0ms | 267% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 11.6ms | 32.0ms | 277% | 2.0K ops/CPU-ms |
| arithmetic-threshold | WASM ▶ production | 1.03s | 1.03s | 101% | 490.8K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 14.6ms | 0.0ms | 0% | — |
| six-digit-guess | Python | 471.2ms | 468.8ms | 99% | 89.75 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 934.3ms | 968.0ms | 104% | 43.46 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 951.8ms | 985.0ms | 103% | 42.71 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.15s | 1.14s | 99% | 36.9K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.5ms | 0.0ms | 0% | — |
| record-allocation | Python | 44.1ms | 46.9ms | 106% | 4.3K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 4.0ms | 31.0ms | 779% | 322.58 ops/CPU-ms |
| record-allocation | Galerina governed ⟨interp⟩ | 4.3ms | 0.0ms | 0% | — |
| record-allocation | WASM ▶ production | 1.01s | 1.00s | 99% | 560.0K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 397.2ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 402.2ms | — | — | — |
| fibonacci-recursive | Node.js | 782.4ms | 781.0ms | 100% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 4.42s | 4.42s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 66.6ms | 63.0ms | 95% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 88.0ms | 109.0ms | 124% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.00s | 984.0ms | 98% | 17.28 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 518.2ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 520.4ms | — | — | — |
| tower-of-hanoi | Node.js | 105.1ms | 125.0ms | 119% | 104.9K ops/CPU-ms |
| tower-of-hanoi | Python | 399.3ms | 406.3ms | 102% | 3.2K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 746.0ms | 781.0ms | 105% | 83.91 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 749.8ms | 735.0ms | 98% | 89.16 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.08s | 1.08s | 100% | 121.6K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 75.2ms | — | — | — |
| collection-pipeline | Rust (generic) | 232.2ms | — | — | — |
| collection-pipeline | Node.js | 701.8ms | 703.0ms | 100% | 71.1K ops/CPU-ms |
| collection-pipeline | Python | 4.01s | 4.02s | 100% | 12.5K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.5ms | 46.0ms | 1013% | 217.39 ops/CPU-ms |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.1ms | 0.0ms | 0% | — |
| collection-pipeline | WASM ▶ production | 1.02s | 1.02s | 100% | 423.2K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.1ms | — | — | — |
| governance-cost | Rust (generic) | 11.1ms | — | — | — |
| governance-cost | Node.js | 47.6ms | 47.0ms | 99% | — |
| governance-cost | Python | 4.04s | 4.03s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.8ms | 0.0ms | 0% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.3ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.00s | 100% | — |
| hardware-targets | Rust AVX2 | 849.0ms | — | — | — |
| hardware-targets | Rust (generic) | 847.6ms | — | — | — |
| hardware-targets | Node.js | 1.09s | 1.11s | 102% | 900.90 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 11.1ms | 93.0ms | 835% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.02s | 102% | 39.4K ops/CPU-ms |
| low-memory | Rust AVX2 | 171.2ms | — | — | — |
| low-memory | Rust (generic) | 735.9ms | — | — | — |
| low-memory | Node.js | 71.0ms | 63.0ms | 89% | 793.7K ops/CPU-ms |
| low-memory | Python | 2.61s | 2.61s | 100% | 3.8K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 86.4ms | 171.0ms | 198% | 58.48 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 68.5ms | 125.0ms | 182% | 80.00 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.01s | 1.02s | 100% | 472.4K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.21s | — | — | — |
| gpu-compute | Rust (generic) | 4.21s | — | — | — |
| gpu-compute | Node.js | 504.3ms | 515.0ms | 102% | 970.9K ops/CPU-ms |
| gpu-compute | Python | 6.32s | 6.33s | 100% | 7.9K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 314.5ms | 359.0ms | 114% | 278.55 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 325.2ms | 422.0ms | 130% | 236.97 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.07s | 1.05s | 98% | 477.6K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 24.9ms | — | — | — |
| matrix-multiply | Rust AVX2 | 91.4ms | — | — | — |
| matrix-multiply | Rust (generic) | 88.8ms | — | — | — |
| matrix-multiply | Node.js | 212.8ms | 204.0ms | 96% | 642.5K ops/CPU-ms |
| matrix-multiply | Python | 1.74s | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 52.0ms | 93.0ms | 179% | 352.34 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 47.6ms | 78.0ms | 164% | 420.10 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.04s | 1.03s | 99% | 445.0K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 13.2ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 22.1ms | 47.0ms | 212% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 4.9ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 1.6ms | 15.0ms | 961% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 432.6ms | — | — | — |
| tri-logic | Rust (generic) | 432.3ms | — | — | — |
| tri-logic | Node.js | 300.5ms | — | — | — |
| tri-logic | Python | 1.51s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 1.02s | 1.01s | 99% | 295.57 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 991.0ms | 1.03s | 104% | 290.70 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.28s | 1.28s | 100% | 468.4K ops/CPU-ms |
| data-query | Node.js | 127.2ms | — | — | — |
| data-query | Python | 758.0ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.6ms | 15.0ms | 2530% | — |
| data-query | Galerina manifest ⟨interp⟩ | 43.2ms | 109.0ms | 252% | 91.74 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 43.0ms | 47.0ms | 109% | 212.77 ops/CPU-ms |
| call-chain | Node.js | 6.6ms | 16.0ms | 244% | 125.0K ops/CPU-ms |
| call-chain | Python | 648.5ms | 656.3ms | 101% | 1.5K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.04s | 1.08s | 103% | 46.34 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.03s | 1.09s | 107% | 45.75 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.82s | 1.81s | 100% | 55.2K ops/CPU-ms |
| nbody | Node.js | 53.6ms | 47.0ms | 88% | 139.4K ops/CPU-ms |
| nbody | Python | 1.31s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 558.7ms | 626.0ms | 112% | 52.35 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 585.5ms | 609.0ms | 104% | 53.81 ops/CPU-ms |
| nbody | WASM ▶ production | 1.12s | 1.11s | 99% | 29.5K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 101.2ms | 172.0ms | 170% | 2.91 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 93.9ms | 141.0ms | 150% | 3.55 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 145.2ms | — | — | — |
| mandelbrot | Rust (generic) | 139.7ms | — | — | — |
| mandelbrot | Node.js | 534.2ms | 563.0ms | 105% | 5.8K ops/CPU-ms |
| mandelbrot | Python | 19.59s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.28s | 2.31s | 101% | 7.08 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.28s | 2.30s | 101% | 7.13 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.80s | 1.78s | 99% | 9.2K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.8ms | — | — | — |
| spectral-norm | Rust (generic) | 26.5ms | — | — | — |
| spectral-norm | Node.js | 41.6ms | 47.0ms | 113% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 5.08s | — | — | — |
| binary-trees | Rust AVX2 | 6.8ms | — | — | — |
| binary-trees | Rust (generic) | 8.3ms | — | — | — |
| binary-trees | Node.js | 1.6ms | 0.0ms | 0% | — |
| binary-trees | Python | 43.2ms | 46.9ms | 108% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 416.7ms | 485.0ms | 116% | 280.11 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 402.1ms | 437.0ms | 109% | 310.88 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.15s | 1.14s | 99% | 595.3K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.84s | — | — | — |
| spore-container | Rust (generic) | 1.83s | — | — | — |
| spore-container | Node.js | 6.48s | 7.88s | 122% | 38.10 ops/CPU-ms |
| spore-container | Python | 1.46s | — | — | — |
| framework-pipeline | Node.js | 508.1ms | 1.23s | 243% | 162.07 ops/CPU-ms |
| framework-pipeline | Python | 1.60s | — | — | — |
| http-throughput | Node.js | 71.0ms | — | — | — |
| naming-check | Node.js | 450.0ms | — | — | — |
| context-receipt | Node.js | 313.0ms | — | — | — |
| intelligence-search | Node.js | 45.0ms | — | — | — |
| provenance-trace | Node.js | 2.04s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 135.45M/s | 5.00s | 5.00s | 43.5MB | ~0 | 180.7× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 132.68M/s | 5.00s | — | — | ~0 (native) | 177.0× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 130.44M/s | 5.00s | — | — | ~0 (native) | 174.0× | 0.96× |
| 4 | ⚪ | WASM ▶ production | 77.74M/s | 1.29s | 1.28s | 73.4MB | ~0 | 103.7× | 0.57× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.12M/s | 0.5ms | 0.0ms | 76.3MB | 108 B/op | 2.83× | 0.02× |
| 6 | 🔴 | Galerina governed ⟨interp⟩ | 1.71M/s | 29.3ms | 47.0ms | 74.3MB | 90 B/op | 2.28× | 0.01× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 1.31M/s | 38.3ms | 31.0ms | 75.3MB | 89 B/op | 1.74× | 0.01× |
| 8 | ⚫ | Python | 749.7K/s | 5.07s | 5.06s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (108 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.57B/s | 12.8ms | — | — | ~0 (native) | 343.0× | 1.61× |
| 🥈 | 🟢 | Rust AVX2 | 1.56B/s | 12.8ms | — | — | ~0 (native) | 342.3× | 1.61× |
| 🥉 | 🟢 | Node.js | 970.77M/s | 20.6ms | 16.0ms | 45.4MB | ~0 | 212.4× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 493.38M/s | 1.03s | 1.03s | 80.3MB | ~0 | 107.9× | 0.51× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 5.47M/s | 11.6ms | 32.0ms | 78.2MB | 13 B/op | 1.20× | 0.01× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 5.45M/s | 11.6ms | 31.0ms | 78.3MB | 13 B/op | 1.19× | 0.01× |
| 7 | ⚫ | Python | 4.57M/s | 4.38s | 4.38s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 35.9K/s | 0.1ms | 0.0ms | 78.5MB | 18.4 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 78.04M/s | 0.5ms | — | — | ~0 (native) | 874.0× | 27.2× |
| 🥈 | 🟢 | Rust AVX2 | 75.17M/s | 0.6ms | — | — | ~0 (native) | 841.8× | 26.2× |
| 🥉 | 🟢 | WASM ▶ production | 36.65M/s | 1.15s | 1.14s | 81.5MB | ~0 | 410.4× | 12.8× |
| 4 | 🟢 | Node.js | 2.87M/s | 14.6ms | 0.0ms | 50.0MB | 27 B/op | 32.2× | 1.00× |
| 5 | 🔴 | Python | 89.3K/s | 471.2ms | 468.8ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 45.0K/s | 934.3ms | 968.0ms | 79.9MB | 45 B/op | 0.50× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 44.2K/s | 951.8ms | 985.0ms | 80.0MB | 35 B/op | 0.49× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 26.8K/s | 0.1ms | 0.0ms | 80.4MB | 32.4 KB/op | 0.30× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (32.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 8.5ms | — | — | ~0 (native) | 259.3× | 20.7× |
| 🥈 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 258.9× | 20.6× |
| 🥉 | 🟢 | WASM ▶ production | 551.98M/s | 1.01s | 1.00s | 82.5MB | ~0 | 121.8× | 9.70× |
| 4 | 🟢 | Node.js | 56.88M/s | 3.5ms | 0.0ms | 46.2MB | ~0 | 12.5× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.01M/s | 0.3ms | 0.0ms | 80.4MB | 123 B/op | 1.77× | 0.14× |
| 6 | 🔴 | Python | 4.53M/s | 44.1ms | 46.9ms | — | ~0 | 1.00× | 0.08× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.51M/s | 4.0ms | 31.0ms | 80.3MB | 9 B/op | 0.55× | 0.04× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.33M/s | 4.3ms | 0.0ms | 81.2MB | 6 B/op | 0.51× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (123 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 63.4K/s | 0.1ms | 0.0ms | 81.0MB | 11.9 KB/op | 14.0K× | 495.8× |
| 🥈 | 🟢 | WASM ▶ production | 17.0K/s | 1.00s | 984.0ms | 82.6MB | ~0 | 3.8K× | 132.9× |
| 🥉 | 🟢 | Rust AVX2 | 503.5/s | 397.2ms | — | — | ~0 (native) | 111.4× | 3.94× |
| 4 | 🟢 | Rust (generic) | 497.3/s | 402.2ms | — | — | ~0 (native) | 110.0× | 3.89× |
| 5 | 🟢 | Node.js | 127.8/s | 782.4ms | 781.0ms | 44.5MB | 53 B/op | 28.3× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 15.0/s | 66.6ms | 63.0ms | 81.0MB | 783.1 KB/op | 3.32× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 11.0/s | 88.0ms | 109.0ms | 80.6MB | 685.3 KB/op | 2.43× | 0.09× |
| 8 | 🔴 | Python | 4.5/s | 4.42s | 4.42s | — | 23 B/op | 1.00× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (783.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 252.92M/s | 518.2ms | — | — | ~0 (native) | 77.0× | 2.03× |
| 🥈 | 🟢 | Rust (generic) | 251.85M/s | 520.4ms | — | — | ~0 (native) | 76.7× | 2.02× |
| 🥉 | 🟢 | Node.js | 124.65M/s | 105.1ms | 125.0ms | 44.6MB | ~0 | 38.0× | 1.00× |
| 4 | 🟢 | WASM ▶ production | 121.39M/s | 1.08s | 1.08s | 82.9MB | ~0 | 37.0× | 0.97× |
| 5 | 🔴 | Python | 3.28M/s | 399.3ms | 406.3ms | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 89.1K/s | 0.1ms | 0.0ms | 85.1MB | 9.5 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 87.8K/s | 746.0ms | 781.0ms | 81.0MB | 28 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 87.4K/s | 749.8ms | 735.0ms | 81.2MB | 61 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (9.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.29B/s | 75.2ms | — | — | ~0 (native) | 1.1K× | 186.5× |
| 🥈 | 🟢 | Rust (generic) | 4.31B/s | 232.2ms | — | — | ~0 (native) | 345.6× | 60.4× |
| 🥉 | 🟢 | WASM ▶ production | 422.77M/s | 1.02s | 1.02s | 87.3MB | ~0 | 33.9× | 5.93× |
| 4 | 🟢 | Node.js | 71.25M/s | 701.8ms | 703.0ms | 61.4MB | ~0 | 5.72× | 1.00× |
| 5 | 🟡 | Python | 12.46M/s | 4.01s | 4.02s | — | ~0 | 1.00× | 0.17× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.53M/s | 0.3ms | 0.0ms | 84.6MB | 167 B/op | 0.69× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.43M/s | 4.1ms | 0.0ms | 85.4MB | 17 B/op | 0.20× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.20M/s | 4.5ms | 46.0ms | 84.6MB | 14 B/op | 0.18× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (167 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 904.68M/s | 11.1ms |
| Rust (generic) | 899.46M/s | 11.1ms |
| Node.js | 2.10M/s | 47.6ms |
| Python | 24.8K/s | 4.04s |
| Galerina passive ⟨interp⟩ | 2.1K/s | 1.8ms |
| Galerina manifest ⟨interp⟩ | 915.0/s | 1.1ms |
| Galerina governed ⟨interp⟩ | 786.0/s | 1.3ms |
| WASM ▶ production | 2.93M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 40.04M/s | 1.00s | 1.02s | 86.6MB | ~0 | — | 43.6× |
| 🥈 | 🟢 | Rust (generic) | 1.18M/s | 847.6ms | — | — | ~0 (native) | — | 1.28× |
| 🥉 | 🟢 | Rust AVX2 | 1.18M/s | 849.0ms | — | — | ~0 (native) | — | 1.28× |
| 4 | 🟢 | Node.js | 918.3K/s | 1.09s | 1.11s | 46.5MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 89.7K/s | 11.1ms | 93.0ms | 86.3MB | 1.2 KB/op | — | 0.10× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 4.5K/s | 0.2ms | 0.0ms | 84.9MB | 79.7 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 3.2K/s | 0.3ms | 0.0ms | 84.6MB | 80.9 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (80.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 5.84B/s | 171.2ms | — | — | ~0 | 1.5K× | 8.29× |
| 🥈 | 🟢 | Rust (generic) | 1.36B/s | 735.9ms | — | — | ~0 | 354.9× | 1.93× |
| 🥉 | 🟢 | Node.js | 704.58M/s | 71.0ms | 63.0ms | 44.6MB | ~0 | 184.0× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 473.52M/s | 1.01s | 1.02s | 87.0MB | ~0 | 123.7× | 0.67× |
| 5 | ⚫ | Python | 3.83M/s | 2.61s | 2.61s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 154.4K/s | 0.6ms | 0.0ms | 84.8MB | -4.1 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 145.9K/s | 68.5ms | 125.0ms | 84.9MB | 27 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 115.8K/s | 86.4ms | 171.0ms | 85.2MB | 46 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.1 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (46 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.19B/s | 4.21s | — | — | ~0 (native) | 150.0× | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 1.19B/s | 4.21s | — | — | ~0 (native) | 149.9× | 1.20× |
| 🥉 | 🟢 | Node.js | 991.39M/s | 504.3ms | 515.0ms | 44.7MB | ~0 | 125.2× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 466.22M/s | 1.07s | 1.05s | 87.1MB | ~0 | 58.9× | 0.47× |
| 5 | ⚫ | Python | 7.92M/s | 6.32s | 6.33s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.01M/s | 24.9ms | — | — | — | 0.51× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 341.0K/s | 0.2ms | 0.0ms | 85.1MB | 3.7 KB/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 318.0K/s | 314.5ms | 359.0ms | 85.0MB | 22 B/op | 0.04× | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 307.5K/s | 325.2ms | 422.0ms | 84.8MB | 4 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.59B/s | 13.2ms | — | — | — | 210.7× | 2.57× |
| 🥈 | 🟢 | Rust (generic) | 1.48B/s | 88.8ms | — | — | ~0 (native) | 196.2× | 2.40× |
| 🥉 | 🟢 | Rust AVX2 | 1.43B/s | 91.4ms | — | — | ~0 (native) | 190.5× | 2.33× |
| 4 | 🟢 | Node.js | 616.00M/s | 212.8ms | 204.0ms | 47.0MB | ~0 | 81.8× | 1.00× |
| 5 | ⚪ | WASM ▶ production | 442.54M/s | 1.04s | 1.03s | 88.2MB | ~0 | 58.8× | 0.72× |
| 6 | 🔴 | Python | 7.53M/s | 1.74s | — | — | 8 B/op | 1.00× | 0.01× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 737.6K/s | 0.1ms | 0.0ms | 85.3MB | 1.7 KB/op | 0.10× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 687.8K/s | 47.6ms | 78.0ms | 86.8MB | 32 B/op | 0.09× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 630.6K/s | 52.0ms | 93.0ms | 86.8MB | 36 B/op | 0.08× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 4.5K/s | 22.1ms | 47.0ms | 86.9MB | -1.6 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 2.0K/s | 0.5ms | 0.0ms | 85.6MB | 193.6 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 206.0/s | 4.9ms | 0.0ms | 85.6MB | 325.3 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-1.6 KB/op) · **highest:** Galerina governed ⟨interp⟩ (325.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 64.1K/s | 1.6ms | 15.0ms | 85.4MB | -3.4 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 1.6K/s | 0.6ms | 0.0ms | 85.9MB | 152.3 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 917.0/s | 1.1ms | 0.0ms | 85.5MB | 171.5 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.4 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.39B/s | 432.3ms | — | — | ~0 (native) | 175.0× | 1.39× |
| 🥈 | 🟢 | Rust AVX2 | 1.39B/s | 432.6ms | — | — | ~0 (native) | 174.9× | 1.39× |
| 🥉 | 🟢 | Node.js | 998.35M/s | 300.5ms | — | — | ~0 | 125.9× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 469.61M/s | 1.28s | 1.28s | 88.5MB | ~0 | 59.2× | 0.47× |
| 5 | ⚫ | Python | 7.93M/s | 1.51s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 306.0K/s | 1.6ms | 0.0ms | 85.9MB | 534 B/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 302.7K/s | 991.0ms | 1.03s | 87.5MB | 2 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 293.2K/s | 1.02s | 1.01s | 85.7MB | 4 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (534 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 2.41B/s | — | — | — | ~0 (native) | 225.8× | 1.19× |
| 🥈 | 🟢 | Rust (generic) | 2.41B/s | — | — | — | ~0 (native) | 225.8× | 1.19× |
| 🥉 | 🟢 | Node.js | 2.03B/s | — | — | — | — | 190.5× | 1.00× |
| 4 | ⚫ | Python | 10.66M/s | — | — | — | — | 1.00× | 0.01× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 392.98M/s | 127.2ms | — | — | ~0 | 99.3× | 1.00× |
| 🥈 | 🔴 | Python | 3.96M/s | 758.0ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 268.2K/s | 0.6ms | 15.0ms | 86.4MB | -5.7 KB/op | 0.07× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 232.4K/s | 43.0ms | 47.0ms | 87.9MB | 128 B/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 231.4K/s | 43.2ms | 109.0ms | 86.3MB | 71 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-5.7 KB/op) · **highest:** Galerina governed ⟨interp⟩ (128 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 304.41M/s | 6.6ms | 16.0ms | 45.5MB | ~0 | 197.4× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 54.95M/s | 1.82s | 1.81s | 89.0MB | ~0 | 35.6× | 0.18× |
| 🥉 | ⚫ | Python | 1.54M/s | 648.5ms | 656.3ms | — | ~0 | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 52.5K/s | 0.1ms | 0.0ms | 86.3MB | 15.0 KB/op | 0.03× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 48.8K/s | 1.03s | 1.09s | 86.8MB | 9 B/op | 0.03× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 48.0K/s | 1.04s | 1.08s | 86.3MB | 68 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (15.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.16M/s | 53.6ms | 47.0ms | 46.8MB | ~0 | 98.0× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 29.25M/s | 1.12s | 1.11s | 88.4MB | ~0 | 23.5× | 0.24× |
| 🥉 | 🔴 | Python | 1.25M/s | 1.31s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 59.3K/s | 0.2ms | 0.0ms | 88.2MB | 18.4 KB/op | 0.05× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 58.7K/s | 558.7ms | 626.0ms | 88.2MB | 15 B/op | 0.05× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 56.0K/s | 585.5ms | 609.0ms | 88.1MB | 49 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.16M/s | — | — | — | — | 5.76× | 1.00× |
| 🥈 | 🟡 | Python | 549.5K/s | — | — | — | 1 B/op | 1.00× | 0.17× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 9.5K/s | 0.4ms | 0.0ms | 96.0MB | 124.0 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 5.3K/s | 93.9ms | 141.0ms | 95.1MB | 4.9 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.9K/s | 101.2ms | 172.0ms | 92.2MB | 2.0 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (124.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 23.45M/s | 139.7ms | — | — | ~0 (native) | 140.2× | 3.82× |
| 🥈 | 🟢 | Rust AVX2 | 22.57M/s | 145.2ms | — | — | ~0 (native) | 135.0× | 3.68× |
| 🥉 | 🟢 | WASM ▶ production | 9.11M/s | 1.80s | 1.78s | 96.2MB | ~0 | 54.5× | 1.49× |
| 4 | 🟢 | Node.js | 6.13M/s | 534.2ms | 563.0ms | 46.6MB | ~0 | 36.7× | 1.00× |
| 5 | 🔴 | Python | 167.2K/s | 19.59s | — | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 7.2K/s | 0.2ms | 0.0ms | 90.4MB | 122.3 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 7.2K/s | 2.28s | 2.31s | 90.4MB | 61 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 7.2K/s | 2.28s | 2.30s | 90.6MB | 135 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (122.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 376.82M/s | 26.5ms | — | — | ~0 (native) | 191.4× | 1.57× |
| 🥈 | 🟢 | Rust AVX2 | 373.42M/s | 26.8ms | — | — | ~0 (native) | 189.7× | 1.56× |
| 🥉 | 🟢 | Node.js | 240.13M/s | 41.6ms | 47.0ms | 46.5MB | ~0 | 122.0× | 1.00× |
| 4 | ⚫ | Python | 1.97M/s | 5.08s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 590.26M/s | 1.15s | 1.14s | 92.7MB | ~0 | 187.8× | 6.88× |
| 🥈 | 🟢 | Node.js | 85.83M/s | 1.6ms | 0.0ms | 46.7MB | 3 B/op | 27.3× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 20.08M/s | 6.8ms | — | — | ~0 (native) | 6.39× | 0.23× |
| 4 | 🟡 | Rust (generic) | 16.32M/s | 8.3ms | — | — | ~0 (native) | 5.19× | 0.19× |
| 5 | 🔴 | Python | 3.14M/s | 43.2ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 377.7K/s | 0.1ms | 0.0ms | 91.3MB | 2.4 KB/op | 0.12× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 337.8K/s | 402.1ms | 437.0ms | 90.4MB | 15 B/op | 0.11× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 326.0K/s | 416.7ms | 485.0ms | 91.3MB | 12 B/op | 0.10× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 163.6K/s | 1.83s | — | — | ~0 (native) | 2.39× | 3.53× |
| 🥈 | 🟢 | Rust AVX2 | 163.1K/s | 1.84s | — | — | ~0 (native) | 2.38× | 3.52× |
| 🥉 | 🟢 | Python | 68.6K/s | 1.46s | — | — | ~0 | 1.00× | 1.48× |
| 4 | 🟢 | Node.js | 46.3K/s | 6.48s | 7.88s | 62.5MB | 5 B/op | 0.68× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (5 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 393.6K/s | 508.1ms | 1.23s | 77.2MB | 14 B/op | 3.14× | 1.00× |
| 🥈 | 🟡 | Python | 125.2K/s | 1.60s | — | — | ~0 | 1.00× | 0.32× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (14 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.21s | 1.20× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.21s | 1.20× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 991.39M/s | 504.3ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 466.22M/s | 1.07s | 0.47× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 7.92M/s | 6.32s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.01M/s | 24.9ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 341.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 318.0K/s | 314.5ms | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 307.5K/s | 325.2ms | 0.00× |

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
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **181× slower** | **64× slower** | **104× slower** | **79× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **343× slower** | **43.6K× slower** | **288× slower** | **287× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **27× slower** | **874× slower** | **2.9K× slower** | **1.7K× slower** | **1.8K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | **21× slower** | **259× slower** | **147× slower** | **468× slower** | **504× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **126× slower** | **127× slower** | **496× slower** | **14.0K× slower** | **🏆 winner** | **4.2K× slower** | **5.8K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **77× slower** | **2.8K× slower** | **2.9K× slower** | **2.9K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **187× slower** | **1.1K× slower** | **1.6K× slower** | **6.0K× slower** | **5.5K× slower** | **31× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **34× slower** | **34× slower** | **44× slower** | not run | **446× slower** | **8.8K× slower** | **12.4K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 4× slower | 8× slower | **1.5K× slower** | **37.8K× slower** | **50.4K× slower** | **40.0K× slower** | **12× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **150× slower** | **3.5K× slower** | **3.7K× slower** | **3.9K× slower** | 3× slower | **296× slower** |
| **matrix-multiply** | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.1× slower | 1.1× slower | 3× slower | **211× slower** | **2.1K× slower** | **2.5K× slower** | **2.3K× slower** | 4× slower | **🏆 winner** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 2× slower | **22× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **40× slower** | **70× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.4× slower | **175× slower** | **4.5K× slower** | **4.7K× slower** | **4.6K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **226× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **99× slower** | **1.5K× slower** | **1.7K× slower** | **1.7K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **197× slower** | **5.8K× slower** | **6.3K× slower** | **6.2K× slower** | 6× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **98× slower** | **2.1K× slower** | **2.1K× slower** | **2.2K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 6× slower | **335× slower** | **640× slower** | **594× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | **140× slower** | **3.3K× slower** | **3.3K× slower** | **3.3K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **191× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **29× slower** | **36× slower** | 7× slower | **188× slower** | **1.6K× slower** | **1.8K× slower** | **1.7K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | 2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
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
| 🥇 | Node.js | 135.45M/s | 🏆 winner | 181× faster |
| 🥈 | Rust (generic) | 132.68M/s | 1.0× slower | 177× faster |
| 🥉 | Rust AVX2 | 130.44M/s | 1.0× slower | 174× faster |
| 4 | WASM ▶ production | 77.74M/s | 1.7× slower | 104× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.12M/s | 64× slower | 2.8× faster |
| 6 | Galerina governed ⟨interp⟩ | 1.71M/s | 79× slower | 2.3× faster |
| 7 | Galerina manifest ⟨interp⟩ | 1.31M/s | 104× slower | 1.7× faster |
| 8 | Python | 749.7K/s | 181× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.57B/s | 🏆 winner | 43.6K× faster |
| 🥈 | Rust AVX2 | 1.56B/s | 1.0× slower | 43.6K× faster |
| 🥉 | Node.js | 970.77M/s | 1.6× slower | 27.0K× faster |
| 4 | WASM ▶ production | 493.38M/s | 3.2× slower | 13.7K× faster |
| 5 | Galerina governed ⟨interp⟩ | 5.47M/s | 287× slower | 152× faster |
| 6 | Galerina manifest ⟨interp⟩ | 5.45M/s | 288× slower | 152× faster |
| 7 | Python | 4.57M/s | 343× slower | 127× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 35.9K/s | 43.6K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 78.04M/s | 🏆 winner | 2.9K× faster |
| 🥈 | Rust AVX2 | 75.17M/s | 1.0× slower | 2.8K× faster |
| 🥉 | WASM ▶ production | 36.65M/s | 2.1× slower | 1.4K× faster |
| 4 | Node.js | 2.87M/s | 27× slower | 107× faster |
| 5 | Python | 89.3K/s | 874× slower | 3.3× faster |
| 6 | Galerina manifest ⟨interp⟩ | 45.0K/s | 1.7K× slower | 1.7× faster |
| 7 | Galerina governed ⟨interp⟩ | 44.2K/s | 1.8K× slower | 1.6× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 26.8K/s | 2.9K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 504× faster |
| 🥈 | Rust (generic) | 1.17B/s | 1.0× slower | 503× faster |
| 🥉 | WASM ▶ production | 551.98M/s | 2.1× slower | 237× faster |
| 4 | Node.js | 56.88M/s | 21× slower | 24× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.01M/s | 147× slower | 3.4× faster |
| 6 | Python | 4.53M/s | 259× slower | 1.9× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.51M/s | 468× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.33M/s | 504× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 17.0K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 63.4K/s | 🏆 winner | 14.0K× faster |
| 🥈 | WASM ▶ production | 17.0K/s | 3.7× slower | 3.8K× faster |
| 🥉 | Rust AVX2 | 503.5/s | 126× slower | 111× faster |
| 4 | Rust (generic) | 497.3/s | 127× slower | 110× faster |
| 5 | Node.js | 127.8/s | 496× slower | 28× faster |
| 6 | Galerina manifest ⟨interp⟩ | 15.0/s | 4.2K× slower | 3.3× faster |
| 7 | Galerina governed ⟨interp⟩ | 11.0/s | 5.8K× slower | 2.4× faster |
| 8 | Python | 4.5/s | 14.0K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 252.92M/s | 🏆 winner | 2.9K× faster |
| 🥈 | Rust (generic) | 251.85M/s | 1.0× slower | 2.9K× faster |
| 🥉 | Node.js | 124.65M/s | 2.0× slower | 1.4K× faster |
| 4 | WASM ▶ production | 121.39M/s | 2.1× slower | 1.4K× faster |
| 5 | Python | 3.28M/s | 77× slower | 38× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 89.1K/s | 2.8K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 87.8K/s | 2.9K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 87.4K/s | 2.9K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.29B/s | 🏆 winner | 6.0K× faster |
| 🥈 | Rust (generic) | 4.31B/s | 3.1× slower | 2.0K× faster |
| 🥉 | WASM ▶ production | 422.77M/s | 31× slower | 192× faster |
| 4 | Node.js | 71.25M/s | 187× slower | 32× faster |
| 5 | Python | 12.46M/s | 1.1K× slower | 5.7× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.53M/s | 1.6K× slower | 3.9× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.43M/s | 5.5K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.20M/s | 6.0K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 40.04M/s | 🏆 winner | 12.4K× faster |
| 🥈 | Rust (generic) | 1.18M/s | 34× slower | 366× faster |
| 🥉 | Rust AVX2 | 1.18M/s | 34× slower | 365× faster |
| 4 | Node.js | 918.3K/s | 44× slower | 285× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 89.7K/s | 446× slower | 28× faster |
| 6 | Galerina manifest ⟨interp⟩ | 4.5K/s | 8.8K× slower | 1.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 3.2K/s | 12.4K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 5.84B/s | 🏆 winner | 50.4K× faster |
| 🥈 | Rust (generic) | 1.36B/s | 4.3× slower | 11.7K× faster |
| 🥉 | Node.js | 704.58M/s | 8.3× slower | 6.1K× faster |
| 4 | WASM ▶ production | 473.52M/s | 12× slower | 4.1K× faster |
| 5 | Python | 3.83M/s | 1.5K× slower | 33× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 154.4K/s | 37.8K× slower | 1.3× faster |
| 7 | Galerina governed ⟨interp⟩ | 145.9K/s | 40.0K× slower | 1.3× faster |
| 8 | Galerina manifest ⟨interp⟩ | 115.8K/s | 50.4K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.19B/s | 🏆 winner | 3.9K× faster |
| 🥈 | Rust (generic) | 1.19B/s | 1.0× slower | 3.9K× faster |
| 🥉 | Node.js | 991.39M/s | 1.2× slower | 3.2K× faster |
| 4 | WASM ▶ production | 466.22M/s | 2.5× slower | 1.5K× faster |
| 5 | Python | 7.92M/s | 150× slower | 26× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.01M/s | 296× slower | 13× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 341.0K/s | 3.5K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 318.0K/s | 3.7K× slower | 1.0× faster |
| 9 | Galerina governed ⟨interp⟩ | 307.5K/s | 3.9K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.59B/s | 🏆 winner | 2.5K× faster |
| 🥈 | Rust (generic) | 1.48B/s | 1.1× slower | 2.3K× faster |
| 🥉 | Rust AVX2 | 1.43B/s | 1.1× slower | 2.3K× faster |
| 4 | Node.js | 616.00M/s | 2.6× slower | 977× faster |
| 5 | WASM ▶ production | 442.54M/s | 3.6× slower | 702× faster |
| 6 | Python | 7.53M/s | 211× slower | 12× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 737.6K/s | 2.1K× slower | 1.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 687.8K/s | 2.3K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 630.6K/s | 2.5K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.0K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 4.5K/s | 🏆 winner | 22× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.0K/s | 2.2× slower | 9.9× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 206.0/s | 22× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.6K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 64.1K/s | 🏆 winner | 70× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.6K/s | 40× slower | 1.7× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 917.0/s | 70× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.39B/s | 🏆 winner | 4.7K× faster |
| 🥈 | Rust AVX2 | 1.39B/s | 1.0× slower | 4.7K× faster |
| 🥉 | Node.js | 998.35M/s | 1.4× slower | 3.4K× faster |
| 4 | WASM ▶ production | 469.61M/s | 3.0× slower | 1.6K× faster |
| 5 | Python | 7.93M/s | 175× slower | 27× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 306.0K/s | 4.5K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 302.7K/s | 4.6K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 293.2K/s | 4.7K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 2.41B/s | 🏆 winner | 226× faster |
| 🥈 | Rust (generic) | 2.41B/s | 1.0× slower | 226× faster |
| 🥉 | Node.js | 2.03B/s | 1.2× slower | 190× faster |
| 4 | Python | 10.66M/s | 226× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 392.98M/s | 🏆 winner | 1.7K× faster |
| 🥈 | Python | 3.96M/s | 99× slower | 17× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 268.2K/s | 1.5K× slower | 1.2× faster |
| 4 | Galerina governed ⟨interp⟩ | 232.4K/s | 1.7K× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 231.4K/s | 1.7K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 304.41M/s | 🏆 winner | 6.3K× faster |
| 🥈 | WASM ▶ production | 54.95M/s | 5.5× slower | 1.1K× faster |
| 🥉 | Python | 1.54M/s | 197× slower | 32× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 52.5K/s | 5.8K× slower | 1.1× faster |
| 5 | Galerina governed ⟨interp⟩ | 48.8K/s | 6.2K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 48.0K/s | 6.3K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.16M/s | 🏆 winner | 2.2K× faster |
| 🥈 | WASM ▶ production | 29.25M/s | 4.2× slower | 523× faster |
| 🥉 | Python | 1.25M/s | 98× slower | 22× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 59.3K/s | 2.1K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 58.7K/s | 2.1K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 56.0K/s | 2.2K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.16M/s | 🏆 winner | 640× faster |
| 🥈 | Python | 549.5K/s | 5.8× slower | 111× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 9.5K/s | 335× slower | 1.9× faster |
| 4 | Galerina governed ⟨interp⟩ | 5.3K/s | 594× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.9K/s | 640× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 23.45M/s | 🏆 winner | 3.3K× faster |
| 🥈 | Rust AVX2 | 22.57M/s | 1.0× slower | 3.1K× faster |
| 🥉 | WASM ▶ production | 9.11M/s | 2.6× slower | 1.3K× faster |
| 4 | Node.js | 6.13M/s | 3.8× slower | 854× faster |
| 5 | Python | 167.2K/s | 140× slower | 23× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 7.2K/s | 3.3K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 7.2K/s | 3.3K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 7.2K/s | 3.3K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 376.82M/s | 🏆 winner | 191× faster |
| 🥈 | Rust AVX2 | 373.42M/s | 1.0× slower | 190× faster |
| 🥉 | Node.js | 240.13M/s | 1.6× slower | 122× faster |
| 4 | Python | 1.97M/s | 191× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 590.26M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Node.js | 85.83M/s | 6.9× slower | 263× faster |
| 🥉 | Rust AVX2 | 20.08M/s | 29× slower | 62× faster |
| 4 | Rust (generic) | 16.32M/s | 36× slower | 50× faster |
| 5 | Python | 3.14M/s | 188× slower | 9.6× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 377.7K/s | 1.6K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 337.8K/s | 1.7K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 326.0K/s | 1.8K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 163.6K/s | 🏆 winner | 3.5× faster |
| 🥈 | Rust AVX2 | 163.1K/s | 1.0× slower | 3.5× faster |
| 🥉 | Python | 68.6K/s | 2.4× slower | 1.5× faster |
| 4 | Node.js | 46.3K/s | 3.5× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 393.6K/s | 🏆 winner | 3.1× faster |
| 🥈 | Python | 125.2K/s | 3.1× slower | — (slowest) |


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

