# RD-0751 — Memory as an index, not a warehouse: the measured combination matrix

> **R&D hub · 2026-08-08.** Owner concept: *"what if we treated Galerina like you — 'memory is an
> INDEX NOT a warehouse': index in memory and the rest in I/O?"* — followed by the owner's question
> ladder: XIP (RD-0559), compression (".zip"), `.gate` vs binary as the in-memory format,
> Graph + tropical, graph-type benchmarks, a query language over the in-memory graph, and the query
> language + graph locating data in I/O. Everything below is **measured**, in
> `Galerina/memory-sandobx/` (sandbox lane; all other trees read-only), with KAT-first controls on
> every probe. One production change shipped from it (tombstones, commit `74f0f497`); everything
> else is R&D evidence for owner decisions.
> **ID:** RD-0751, next-free after RD-0750.

---

## §1 Verdict ladder, up front

| claim | verdict |
|---|---|
| the index/warehouse split's memory saving | **PROVEN** — 7.2× per entry; **25×** at system scale (1.26 vs 31.2 MiB resident) |
| its security model is affordable | **PROVEN** — sha256 is 8% of a small-object load; the syscall is 85% |
| per-entry digests alone are safe | **DISPROVEN** — deletion fails open; the index digest must cover **membership** |
| the split pays for the execution-graph cache | **DISPROVEN** — rebuild at 9–15 µs beats any disk scheme; the `execution-graph.ts:60` retirement ruling now has affirmative evidence |
| "tropical beats Dijkstra" as a flat claim | **CORRECTED** — true cold (2.02 vs 3.68 ms), **reversed warm** (16 vs 31 ms CPU); JIT-state-dependent, per-lane measurement required (RD-0400's own doctrine) |
| XIP needs no hashing because it skips the copy | **DISPROVEN as stated, refined** — the copy was never why you hash; see §5 |
| the OSS survey table (§8) | mixed tiers, each row labelled — fs-verity **CONFIRMED (primary)**, RocksDB compression **CONFIRMED (primary)**, LMDB **CONFIRMED (secondary)**, remainder knowledge-tier |

---

## §2 The concept, and the two laws it must obey

Hold only an **index** in memory — `{key, digest, weight, locator}` — and put content in I/O.
Memory then bounds on entry *count*, not content *size*; and dropping bytes while keeping the
digest separates **"do I know this?"** from **"do I have it?"**.

Two laws, both demonstrated on a working prototype (`index-cache.mjs`, `kat-index-fail-open.mjs`):

1. **The index digest must cover entry-set MEMBERSHIP, not just per-entry content.** With
   per-entry digests alone, deleting an entry leaves every survivor verifying and the loss reads
   as an ordinary MISS — indistinguishable from an eviction, which nobody investigates. PROVEN by
   paired arms: the naive arm genuinely fails to notice; a membership-covering `indexDigest()`
   detects it. (`zt-signed-index`'s caveat — *"cover the index INSIDE the signature or it fails
   open"* — reproduced live.)
2. **`REFUSED ≠ MISS`.** A digest mismatch is a refusal, never a miss. Collapsing them hands an
   attacker a silent downgrade from *tampering* to *cache miss*.

---

## §3 The decisive measurement — rebuild vs load+verify, and its scale correction

Against the real compiler (`dist/execution-graph.js`, arity-guarded), 200 distinct graphs,
five runs:

| path | median | range |
|---|---:|---:|
| rebuild (`buildExecutionGraph`) | 9.8 µs/graph | 8.7–14.8 |
| load + verify (read + sha256 + parse) | 156.8 µs/graph | 150.7–171.5 |

Decomposition at ~1 KB objects: **read(2) 85% · sha256 8% · parse 7%** — the security tax is
nearly free; the *syscall* is the cost. So the split loses for execution graphs (they rebuild
below the ~18 µs small-object floor) — **and the floor does not generalise**: at 32 MiB the
throughputs invert (read 3,181 MB/s vs sha256 572 MB/s) and **the hash becomes the bottleneck**.
Small objects: amortise the syscall (pack the warehouse). Large objects: make verification lazy
(§5). Two different fixes for two different regimes, and quoting either number outside its regime
overclaims.

**Shipped from this section (owner option 1, commit `74f0f497`):** measure-preserving eviction —
`BoundedCache` retains an **opt-in, bounded** tombstone `{weight, evictedAt}` per evicted key,
`knew()` beside `get()`, `forgottenEntirely` as the too-low-ceiling instrument, `delete()` leaves
no tombstone (the caller's forgetting is not the cache's), and the metric surface stays key-free.
19/19 tests (6 new, paired arms), 21/21 determinism, retention gate PASS.

---

## §4 The combination matrix

10,000 nodes / 80,000 edges, seeded (identical every run). Controls before any timing: a
hand-computed 5-node fixture asserted **exact** (`[0,2,5,6,10]`); three kernels × five sources in
differential parity; dense matrix **refused by arithmetic** (381 MiB for 0.08% occupancy);
every codec round-trip verified byte-identical.

### Component winners

| axis | winner | number |
|---|---|---|
| representation | CSR typed arrays | 2.7× Map on Dijkstra; 0.65 MiB exact vs ~10 MiB-class heap |
| kernel (cold) | tropical min-plus on CSR | 2.02 vs 3.68 ms — fixpoint in 8 rounds |
| kernel (warm CPU) | Dijkstra | 16 vs 31 ms user CPU — see §1's correction |
| encoding | binary CSR | decode 0.2 ms vs JSON 20.6 vs gate-text 58.1 |
| compression | gzip **on binary only** | 0.65→0.10 MiB at +1.8 ms; on JSON it costs more than it saves |
| query interface | prepared, closed grammar | 1.64× direct; interpreted-per-call 6.3× |
| I/O locate | index + seek + per-record verify | **1.65 ms vs 437.7 ms scan (265×)** |

### Table 1 — with I/O (load + 20 SSSP + 100k queries + 50 locates)

| rank | total | verification | combination |
|---:|---:|---|---|
| 1 | **68.5 ms** | per-record, lazy | binaryCSR/raw + CSR + tropical + prepared + seek+verify |
| 2 | 70.3 ms | per-record, lazy | binaryCSR/gzip + CSR + tropical + prepared + seek+verify |
| 3 | 90.7 ms | **none — fail-open** | binaryCSR/raw + CSR + Dijkstra + direct + seek |
| 4 | 101.7 ms | per-record, lazy | binaryCSR/raw + CSR + Dijkstra + prepared + seek+verify |
| 7 | 169.4 ms | per-record, lazy | gate-text + CSR + Dijkstra + prepared + seek+verify |
| 9 | 931.6 ms | whole, eager | JSON + Map + Dijkstra + interpreted + scan |

**The fully-verified winner beats the unverified combo** — security is not the cost; the naive
substrate is. Naive-everything is 13.6× slower.

### Table 2 — same effects, everything resident

| rank | work | resident | verification | combination |
|---:|---:|---:|---|---|
| 1 | 66.7 ms | 0.65 MiB | admission-time | CSR resident + tropical + prepared |
| 2 | 89.6 ms | 0.65 MiB | admission-time | CSR resident + Dijkstra + direct |
| 4 | 99.9 ms | 0.65 MiB | verify buffer once, views free | one binary buffer + zero-copy views |
| 5 | 101.8 ms | 0.10 MiB | at decompress | gzip(binary) resident, decompress/session |
| 6 | 215.4 ms | ~10 MiB-class* | admission-time | Map + Dijkstra + direct |

\* heap-delta measurement **failed** (GC fired mid-delta); analytic class, stated as such.
In-memory, verification collapses to **admission time**; compression becomes a RAM/CPU dial;
zero-copy views over one canonical buffer are "XIP-in-RAM" at 0.002 ms.

### CPU and footprint of the top-2s

All four are **one core, ~100% user-mode**; system time below the tick even with verified seeks
(⚠ Windows quantises `cpuUsage` at ~15.6 ms; fine deltas unresolvable at this length). gzip's
decompress is below the tick — an 85% smaller file for unmeasurably small CPU.

| posture | resident | on disk |
|---|---:|---:|
| Table 1 (index in RAM, warehouse on disk) | **1.26 MiB** | 30.5 MiB |
| Table 2 (everything resident) | **31.2 MiB** | 0 |

**25× less RAM for 1.65 ms of verified seeks per 50 lookups** — the owner's concept, measured
end to end.

### The winner replicated per cache tier (owner's final question)

T1 #1 re-run with the working set **sized to each tier** (L1d 32 KB / L2 256 KB / L3 16 MB /
RAM — i9-9900K), kernel time separated from I/O so small tiers are not contaminated, every
tier looped past the Windows CPU-tick:

| tier | working set | ns/edge-visit | eff GB/s | user CPU/workload | wall/workload | locate (control) |
|---|---:|---:|---:|---:|---:|---:|
| L1 | 19.5 KB | **3.91** | 5.1 | 1.0 ms | 1.6 ms | 0.86 ms |
| L2 | 190 KB | 4.18 | 4.8 | 12.5 ms | 12.8 ms | 0.89 ms |
| L3 | 7.6 MB | 10.11 | 2.0 | 66.5 ms | 63.6 ms | 0.81 ms |
| RAM | 76 MB | **50.04** | 0.4 | 282 ms | 275.8 ms | 0.77 ms |

- **L1 ≡ L2** (1.07×): the hardware prefetcher hides L2 latency entirely on a sequential CSR
  stream. The wall appears at **L3 (2.6×)** and **RAM (12.8×)** — where the *random* `dist[dst]`
  updates, the prefetch-defeating half, dominate.
- **CPU ≈ wall at every tier** — one core, ~100% user-mode even when stall-bound: a cache miss
  burns core time, it does not idle it.
- **The locate control is tier-invariant** (1.16× spread), as it must be — I/O + hash does not
  care how big the graph is. The harness did not leak.
- ★ Production placement: the real 2,048-entry graph cache is **0.65 MiB — the L2↔L3 band**,
  on the flat part of this curve. The 12.8× RAM penalty is what the combination *avoids* by
  keeping the resident index small — the tier table is the mechanism behind Table 1's win,
  made visible.
- Lane discipline stated (RD-0710): this is the **traversal** lane — prefetch softens the tier
  wall on the stream; a pointer-chasing layout (Map, linked nodes) would multiply far harder.
  That is *why* CSR beats Map by more at scale.

---

## §5 XIP (RD-0559), and the owner's question: "if it never enters memory, does it need hashing?"

**The copy was never why you hash; provenance is.** The CPU consumes the bytes either way, and
tampered XIP bytes execute *directly* — there is no load step for a check to sit in. Three
regimes:

| media | verification |
|---|---|
| physically read-only (NOR/ROM), verified at provisioning | **none at runtime** — the anchor is the hardware write-protection (RD-0559's home turf) |
| writable file, mapped | **lazy per-page Merkle, verify on first read, root signed** — measured at 0.78% index overhead; on a 1% partial scan, lazy verification is ~100× cheaper than whole-object, and XIP+per-page ≈ **52×** over whole-object eager |
| writable file, unverified | fail-open — `unknown → allow` at the memory boundary |

The eager/lazy tension is the load-bearing fact: **XIP's win is laziness; whole-object digest
verification is eager** — it converts a lazy zero-copy walk into an eager full read in exactly
the case XIP exists for (81× penalty at a 1% scan). Per-page digests resolve it, and the
page-digest index must sit **inside** the signature (§2 law 1, one level down). The owner's
cold-only law survives intact: never XIP the hot path.

---

## §6 Hot-lane adjudication under the estate's own doctrine (RD-0388/0391/0400)

The estate already has the hot path built — `interpreter.js:22`'s Int fast path with a
fail-closed step counter — and the doctrine written: the triple-lock, the `{−1,0,+1}` placement
axis, and the deliberate inversion (placement-unknown → **cold lane**, never deny).

| candidate | Lock-1 (RD-0391 P1–P9) reading |
|---|---|
| tropical on CSR | P1 fixed-width ✓ · P3 no per-op heap ✓ · P4 boundable rounds ✓ (ceiling + trap = the Lock-3 fence) · monotone + idempotent algebra — replayed or reordered edges cannot change the answer; the deny-side shape of `.gate`'s max-plus budgets |
| Dijkstra (binary heap) | dynamic heap arrays — P3 in doubt; wins warm steady-state CPU; strongest as the **standard-lane** kernel |
| Map adjacency | P1 **REFUTED** by name (maps excluded from FixedWidth) → it is the **P9 cold/reference twin**, and the differential parity run *is* the twin verification |
| interpreted queries | violates RD-0400's no-grammar-surface rule; prepared + closed grammar is the seam, at a measured 1.64× |

---

## §7 External corroboration

Flatiron Institute CCQ + Boston University, *Science*, July 2026: hundreds of entangled qubits
simulated on a laptop via tensor networks — *"a zip file for the wave function"* — driven by
**belief propagation**, a 1980s message-passing fixpoint algorithm on a graph. Belief propagation
and tropical relaxation are one family: **semiring message-passing to fixpoint** (sum-product vs
min-plus). Their result is this document's thesis at physics scale: compressed representation +
semiring message-passing on a graph beats brute-force enumeration on grander hardware.

---

## §8 What other open-source projects do — with provenance tiers

Surveyed this session; each row carries its evidence tier. *Knowledge-tier = from training
knowledge, not verified against the project's own documents this session.*

| project | mechanism | our measured analogue | tier |
|---|---|---|---|
| **fs-verity** (Linux kernel) | Merkle tree over 4096-byte blocks; *"verifies data that has been read into the pagecache"* (lazy, ascends only to an already-verified node); root digest under a **PKCS#7 detached signature** | §5's per-page digests + signed index | **CONFIRMED — kernel.org primary doc, quoted** |
| **RocksDB** | *"Each data block is … optionally compressed"* — compression is **per-block**, never whole-file | gzip-on-binary blocks, lazy access | **CONFIRMED (compression) — project wiki, quoted**; per-block checksums remain knowledge-tier |
| **LMDB** | mmap + copy-on-write B+tree; *"can return direct pointers to memory addresses of keys and values"* — zero-copy reads, MVCC | Table 2's zero-copy-views row | **CONFIRMED — secondary source (encyclopaedic), quoted** |
| SQLite | B-tree pages, **prepared statements** | prepared plans, 1.64× vs 6.3× | knowledge-tier |
| git | zlib objects, packfiles, content-addressing | gzip(binary) + digest index | knowledge-tier |
| Apache Arrow / FlatBuffers | one canonical buffer, zero-copy typed access | binary buffer + views (0.002 ms) | knowledge-tier |
| SciPy / cuGraph / ligra | **CSR** | CSR, 2.7× over Map | knowledge-tier |
| Neo4j | index-free adjacency, fixed-size records | CSR offsets, same idea | knowledge-tier |
| NetworkX | dict-of-dicts | the Map row it outgrew | knowledge-tier |

The convergence, across every tier: **one canonical binary buffer · zero-copy access · lazy
block-level verification under a signed root · prepared queries over a closed surface.** The
combination tables arrived at the same place independently before the survey was checked.

---

## §9 Recommendations (owner-gated where marked)

1. **Shipped:** tombstones (`74f0f497`) — eviction is measure-preserving at ~80 B/key, opt-in.
2. **Do not** apply the disk split to the execution-graph cache; the retirement ruling stands
   with evidence.
3. ⚠ **Owner:** if a disk-backed cache is ever wanted, the target is anything rebuilding above
   the (size-dependent) crossover — measure candidates first; pack the warehouse (one file, not
   one per entry); per-page digests with the index inside the signature; `REFUSED ≠ MISS`.
4. ⚠ **Owner:** the hot-lane kernel question is genuinely open between tropical (cold, eligible,
   algebraically safe) and Dijkstra (warm CPU) — RD-0400's per-lane twin-verification is the
   deciding instrument, not another microbenchmark.
5. The QL seam is affordable: closed grammar + prepared plans at 1.64×. RD-0400's
   no-grammar-surface rule holds at a measured price.

## §10 Artifacts

All in `Galerina/memory-sandobx/` (with a copy of this document): `FINDINGS.md` (running log) ·
`index-cache.mjs` (prototype) · `kat-index-fail-open.mjs` · `kat-tombstone-measure-preserving.mjs` ·
`bench-rebuild-vs-verify.mjs` · `bench-xip-verification-tension.mjs` ·
`bench-combination-matrix.mjs` · `bench-cpu-top2.mjs`. Commits `74f0f497`, `c55f54db`, `7ca84e80`
(Galerina, local).

*Provenance: owner question N1 (`OPEN-QUESTIONS-CONSOLIDATED-2026-08-07`) · RD-0559 (XIP/AXFS) ·
RD-0388/0391/0400 (hot-lane triple-lock) · zt-signed-index (fail-open caveat) · design-evolution
§2.143/§2.144 · kernel.org fs-verity doc · RocksDB wiki · one secondary source for LMDB, labelled.
No absolute paths / no keys. Contact hello@trithypha.dev.*
