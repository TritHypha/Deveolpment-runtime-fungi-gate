# N1 sandbox — "memory is an index, not a warehouse", applied to Galerina

**Date:** 2026-08-08 · **Status:** R&D, sandbox only — nothing here is wired to anything.
**Scope:** everything outside this folder was read-only.

The concept: hold only an **index** in memory (key, digest, weight, locator) and put the
content in I/O. Memory then bounds on entry *count*, not content *size* — and dropping the
bytes while keeping the digest separates **“do I know this?”** from **“do I have it?”**

Three questions were open: does the maths work, is it fast enough, and is it safe.
All three are now measured.

---

## 1 · The maths — the memory saving is real

Measured on 200 real execution graphs built by `dist/execution-graph.js`.

| | per entry | at the measured 2,048-entry ceiling |
|---|---:|---:|
| warehouse (bytes resident) | 1,153 B | **2,306 KiB** |
| index only (digest + weight + locator) | ~160 B | **320 KiB** |
| **reduction** | **7.2×** | **−1,986 KiB** |

★ **A second, quieter win.** Under this model the in-memory weight of an entry is
**constant** (~160 B), so `maxWeight` stops being a second bound and `maxEntries` alone
becomes complete. That matters because the Tick-523 measurement found `maxWeight` (65,536)
is never the binding ceiling at the real item weight of ~3.0 — it is untested decoration
today. The index model removes the need for it rather than leaving it unexercised.

---

## 2 · Speed — it loses here, and the reason is not what N1 assumed

`node bench-rebuild-vs-verify.mjs` · 200 distinct graphs · four live controls.

**Five runs, because a single run's ratio did not reproduce** — the first two disagreed by
30%, so the range is quoted rather than one figure.

| path | median | range over 5 runs |
|---|---:|---:|
| **rebuild** (`buildExecutionGraph`) | **9.8 µs/graph** | 8.7 – 14.8 |
| **load + verify** (read + sha256 + parse) | **156.8 µs/graph** | 150.7 – 171.5 |
| ratio | **~15× against** | 10.6 – 18.4× |

★ Note the asymmetry: load varies by ~13%, rebuild by ~70%. Rebuild is small enough to be
noise-dominated; load is pinned by the syscall. **The direction is stable in every run** —
loading is an order of magnitude dearer — so the verdict does not rest on the spread.

**But the decomposition inverts the diagnosis:**

| component | µs | share |
|---|---:|---:|
| `read(2)` | 98.7 | **85%** |
| `sha256` — the security tax | 9.2 | **8%** |
| `JSON.parse` | 8.7 | 7% |

★★ **The verification the security model demands is nearly free. What costs is one syscall
per entry.** The concept is not refuted by this number; it is *mis-shaped*. A packed
warehouse (one file, or a memory-mapped region) amortises the syscall away.

**The crossover, measured rather than modelled.** With the syscall fully amortised the
floor is `sha256 + parse` = **17.9 µs**. So:

> The index/warehouse split wins wherever **rebuild costs more than ~18 µs**.
> An execution graph rebuilds in **9–15 µs**, so it loses — but only by roughly **1.2–2×**,
> not 15×. Packing the warehouse removes almost all of the disadvantage; it does not quite
> close it.

**Execution graphs are the wrong target.** They are too cheap to rebuild. The concept
belongs where reconstruction costs milliseconds, not microseconds.

---

## 3 · Security — the fail-open is real, and closing it is cheap

`node kat-index-fail-open.mjs` — PROVEN, three live controls.

| arm | result |
|---|---|
| per-entry digests only; attacker deletes an entry | **every survivor still verifies**, and the loss reads as an ordinary **MISS** |
| index digest covering entry-set **membership** | **detected** |

★ **A MISS is what an eviction looks like, and nobody investigates an eviction.** That is
the whole trap `zt-signed-index` warns about — *"cover the index INSIDE the signature or it
fails open"* — reproduced here on a working prototype.

Two rules fall out, and the prototype enforces both:

1. **The index digest must cover membership**, not just per-entry content. `indexDigest()`
   hashes `count + sorted(key, digest, weight)`.
2. **A digest mismatch is `REFUSED`, never `MISS`.** Collapsing them hands an attacker a
   silent downgrade from *tampering* to *cache miss*. Verified by control C3.

⚠️ One honest limit: this prototype uses a **digest**, not a signature. It detects
corruption and deletion; it does not authenticate an author. Under a real threat model the
index digest is what a signature must cover.

---

## 4 · Changes needed, per repository

### Galerina — *smaller than expected*

- **Do not apply it to the execution-graph cache.** Rebuild at 10.9 µs beats any disk
  scheme. `execution-graph.ts:60`'s retirement ruling (*"disk execution authority is
  retired… durable graph reuse belongs behind SLIDE's authenticated evidence and independent
  re-admission boundary"*) should **stand**, and this measurement is the first evidence
  supporting it rather than merely deferring to it.
- **What is worth taking anyway, with no disk at all:** the `knows()` / `get()` split.
  Keeping `{key, digest, evictedAt}` for an evicted entry costs ~100 B and makes eviction
  **measure-preserving** (design doc §2.143) — the estate would stop losing the fact that a
  computation ever happened. No I/O, no ruling to lift.
- If it is ever applied elsewhere: **one packed file**, not one per entry.

### SLIDE — *no new contract needed*

The intake discipline this requires already exists, specified twice:
`30-REFERENCE-SLIDE-BUNDLE` (copy-before-validate, digest-checked, *"truncation, suffixes
and unknown fields are not representable and refuse"*) and `38-CHECKED-PACKAGE-PUBLICATION-LOADER`
(*"No receipt Boolean, pathname, digest string or local-file status grants authority by
itself"*).

★ Both already say **refuse, never fall back** — the same rule as `REFUSED ≠ MISS`. So a
disk-backed cache does not need a new SLIDE contract; it needs to **route through the
existing boundary** rather than beside it. What SLIDE would need is one addition:
**membership coverage in the index digest**, which no current contract states because no
current contract has an index.

### lyth-weaver — *one small check*

It owns `tools/kb-corpus-audit.ts`, already the estate's index-vs-corpus gate. If any
index/warehouse split lands, the index-digest verification belongs there, beside the
existing check. Same shape, same exit codes. (It should absorb the row-parity check too —
separate finding.)

---

## 5 · Recommendation

**The concept is sound and the security model is affordable. Its first proposed target is
wrong.**

| | verdict |
|---|---|
| memory saving | **real** — 7.2×, and it retires `maxWeight` |
| security | **PROVEN safe if** the index digest covers membership and `REFUSED ≠ MISS` |
| speed, for execution graphs | **loses** — 9–15 µs rebuild sits just below the ~18 µs floor |
| speed, in general | **wins above ~18 µs rebuild cost**, with a packed warehouse |

### ✅ Owner chose option 1 — SHIPPED 2026-08-08

The free half is implemented. `BoundedCache` gained an **opt-in** tombstone index:
on eviction it retains `{ weight, evictedAt }` for the key — never the value.

| decision | why |
|---|---|
| **opt-in, absent = OFF** | the file's own rule is *"No default: an unmeasured default is the rejected constant"*. A cache is not given a bound behind the caller's back. `import-resolver` and `proof-graph` are unchanged. |
| `evictedAt` is a **sequence number**, not wall-clock | answers *in what order were things forgotten*, and keeps `stats()` deterministic — a timestamp would make any test reading stats nondeterministic for no gain |
| the tombstone map is **itself bounded** | an unbounded record of what we forgot is the original defect one level up |
| `forgottenEntirely` counter | the only number measuring what the cache can no longer account for **at all**; a rising count means the ceiling is too low |
| `delete()` leaves **no** tombstone | explicit removal is the caller's decision; eviction is the cache's. Only the cache's is recorded. |

**`maxTombstones: 4096` at the execution-graph cache is the one number here that is NOT
measured, and it is labelled as such in the source.** Eviction never occurs in a one-shot
compile (1,456 keys against a 2,048 ceiling), so the workload that would pin it is a
long-lived process — watch mode, a language server — which has not been profiled.
`forgottenEntirely` is the instrument that will say if it is wrong, and it ships with it.

**Verification:** 19/19 bounded-cache tests (6 new, paired arms — the OFF arm must forget
or the ON arm proves nothing), 21/21 determinism tests, retention gate PASS, path-leak
clean, `tsc --noEmit` clean.

★ **The repo's own metric-surface lock caught the change**, as designed —
`bounded-cache.test.mjs` deep-compares the key set of `stats()`, and three new fields broke
it. Updated deliberately, with the reason recorded in the test.

---

`Sir, a question:` where next —

1. **Take the free half now (recommended)** — retain `{key, digest, evictedAt}` on eviction.
   No disk, no ruling to lift, makes eviction measure-preserving, ~100 B/entry.
2. **Find the right target** — measure which caches in the estate rebuild for **more than
   ~18 µs**; those are where the full split pays.
3. **Park it** — the retirement ruling stands and the sandbox is the record.

---

---

## 6 · XIP (RD-0559 / AXFS) — the maths checked, and one correction to §2

`node bench-xip-verification-tension.mjs` · 32 MiB immutable collection, page cache warm.

**The owner's reading is confirmed in direction.** XIP removes the copy leg, and `.fungi`
immutability really is XIP's hard requirement — most languages cannot use it safely.

### ★ But the throughputs invert the §2 conclusion at scale

| leg | throughput |
|---|---:|
| `readFileSync` (what XIP removes) | **3,181 MB/s** |
| `sha256` (what verification demands) | **572 MB/s** |

**Hashing is 5.6× slower than reading.** §2's "read is 85%, hash is 8%" was measured on
~1 KB objects, where the *syscall's fixed cost* dominates. At 32 MiB the picture reverses:
**bandwidth dominates, and the hash is the bottleneck.** The ~18 µs floor in §2 is a
small-object figure and does not generalise — that is a correction to my own analysis, not
to the owner's.

**Consequence:** XIP alone on whole-object verified data buys
`66 ms → 55.9 ms` = **~1.2×**. Not worth the complexity.

### ★★ The tension the analysis did not name

**XIP's win is laziness — you touch only the pages you walk. Digest verification is eager —
you cannot verify a region without reading every byte.** So whole-object verification turns
a lazy zero-copy walk into an eager full read, in exactly the case XIP exists for:

| scan | lazy read | + whole-object verify | penalty |
|---:|---:|---:|---:|
| 1% | 0.7 ms | 56.6 ms | **81×** |
| 10% | 6.1 ms | 62.0 ms | 10× |
| 100% | 54.2 ms | 110.1 ms | 2× |

### ★★★ The resolution is already in RD-0559 — AXFS decides *per page*

Per-page digests make verification lazy too:

| | |
|---|---|
| index overhead at 32 B/page | **0.78%** (256 KiB for 32 MiB) |
| verifying 1% of pages vs all | **100× cheaper** |
| **1% scan, XIP + per-page digests** | 1.26 ms vs 66 ms whole-object = **~52×** |

> **The per-page digest is what unlocks XIP — not XIP itself.** Alone, XIP is a 1.2×
> curiosity on verified data. With lazy verification and partial access it is ~50×.

⚠️ **And the page-digest index must be covered by the signature.** Delete one page's digest
and every surviving page still verifies — the exact fail-open demonstrated in
`kat-index-fail-open.mjs`. Same defect, one level down.

⚠️ **The owner's own law still binds:** never XIP the hot path. The execution-graph cache is
hot, so none of this applies there — rebuild at 9–15 µs already wins.

---

## 7 · The combination matrix — every axis measured, then composed

`node bench-combination-matrix.mjs` · 10,000 nodes / 80,000 edges, seeded · KAT-first:
a hand-computed 5-node fixture asserted **exact** (`[0,2,5,6,10]`), then three kernels
× five sources in differential parity before any timing was believed. Dense matrix
**refused by arithmetic**: 381 MiB for 0.08% occupancy.

### Component results

| axis | winner | number |
|---|---|---|
| representation | **CSR typed arrays** | Dijkstra 2.7× faster than on Map; 0.65 MiB exact vs ~10 MiB-class heap |
| kernel | ★ **tropical min-plus on CSR** | **2.02 ms vs Dijkstra's 3.68 ms** — fixpoint in 8 rounds on this diameter; linear array scans beat heap machinery |
| encoding | **binary CSR** | decode **0.2 ms** vs JSON 20.6 ms vs gate-text 58.1 ms (~300× / ~100×) |
| compression (".zip") | **gzip on binary only** | 0.65 → 0.10 MiB at +1.8 ms decode; on JSON it *costs* (26–34 ms decode); worth it for I/O and cold storage, never for hot |
| query interface | **prepared, closed grammar** | 1.64× direct; interpreted-per-call 6.3× — parse once is the whole game |
| I/O locate | **index + seek + per-record verify** | **1.65 ms vs 437.7 ms full scan (265×)**; the verify adds 0.7 ms over fail-open |

### Table 1 — with I/O (load + 20 SSSP + 100k queries + 50 locates)

| rank | total | verification | combination |
|---:|---:|---|---|
| 1 | **68.5 ms** | per-record (lazy) | binaryCSR/raw + CSR + **tropical** + prepared + seek+verify |
| 2 | 70.3 ms | per-record (lazy) | binaryCSR/**gzip** + CSR + tropical + prepared + seek+verify |
| 3 | 90.7 ms | ⚠ **none — fail-open** | binaryCSR/raw + CSR + Dijkstra + direct + seek |
| 4 | 101.7 ms | per-record (lazy) | binaryCSR/raw + CSR + Dijkstra + prepared + seek+verify |
| 7 | 169.4 ms | per-record (lazy) | gate-text + CSR + Dijkstra + prepared + seek+verify |
| 9 | 931.6 ms | whole (eager) | JSON + Map + Dijkstra + interpreted + scan |

★ **Verified beats unverified**: rank 1 with full lazy verification beats rank 3's
fail-open — the security is not the cost; the naive substrate is. The naive-everything
baseline is **13.6× slower** than the verified winner.

### Table 2 — same effects, everything resident (RAM becomes a column)

| rank | work | resident | verification | combination |
|---:|---:|---:|---|---|
| 1 | **66.7 ms** | 0.65 MiB | admission-time | CSR resident + tropical + prepared |
| 2 | 89.6 ms | 0.65 MiB | admission-time | CSR resident + Dijkstra + direct |
| 4 | 99.9 ms | 0.65 MiB | **verify buffer once, views free** | binary buffer + zero-copy views + Dijkstra + prepared |
| 5 | 101.8 ms | **0.10 MiB** | at decompress | gzip(binary) resident + decompress/session |
| 6 | 215.4 ms | ~10 MiB-class¹ | admission-time | Map resident + Dijkstra + direct |
| 8 | 275.9 ms | 0.35 MiB | at decompress | gzip(JSON) resident + parse/session |

¹ heap-delta measurement failed (GC fired mid-delta, reading −10 MiB); the class is an
analytic estimate from 80k boxed pair-arrays. Buffer sizes are exact.

**What changes in memory:** verification collapses to **admission time** — inside one
process, hashing your own heap on every read defends against nothing the process cannot
already do. Compression becomes a RAM-vs-CPU dial (6.5× smaller for +2 ms/session).
And the zero-copy-views row is **"XIP in RAM"** — the Arrow/FlatBuffers shape: one
canonical buffer, verified once, views free (0.002 ms).

### ★★ The XIP question answered: "if it never enters memory, does it need hashing?"

**The copy was never why you hash. Provenance is.** XIP removes the copy, not the
question of whether the bytes are the ones that were signed — the CPU consumes them
either way, and tampered XIP bytes execute *directly*, with no load step for a check to
sit in. Three regimes:

| media | verification needed |
|---|---|
| physically read-only (NOR/ROM), verified at provisioning | **none at runtime** — the trust anchor is the hardware write-protection. RD-0559's own home turf. |
| writable file, mapped | **lazy per-page Merkle, verify on first fault** — this is exactly Android's **dm-verity/fs-verity**, and it is the per-page-digest scheme measured in §6 (0.78% overhead, index inside the signature) |
| writable file, no verification | fail-open — `unknown → allow` at the memory boundary |

### ★★★ Lock-1 adjudication (RD-0391 P1–P9): the speed winner is also the most eligible

| candidate | Lock-1 reading |
|---|---|
| **tropical on CSR** | P1 fixed-width ✓ (Int32/Float64 arrays) · P3 no heap ✓ (preallocated, no per-op allocation) · P4 boundable ✓ (rounds ≤ declared ceiling, trap over = the Lock-3 fence) · monotone + idempotent algebra — replayed or reordered edges cannot change the answer, the same deny-side shape as `.gate`'s max-plus budget |
| Dijkstra (binary heap) | dynamic heap arrays — P3 in doubt; data-dependent branching |
| Map adjacency | P1 **REFUTED** by name (maps are excluded from FixedWidth) — it is the cold/reference twin, which is exactly the P9 fallback role, and my differential parity **is** the twin verification |
| interpreted queries | violates RD-0400's no-grammar-surface rule for the hot lane; prepared+closed grammar is the seam, at a measured 1.64× |

### What other open-source projects use (and which row they are)

| project | technique | our measured analogue |
|---|---|---|
| SQLite | B-tree pages + **prepared statements** | prepared plans (1.64× vs 6.3×) |
| LMDB | mmap + copy-on-write, **zero-copy reads** | zero-copy views row (0.002 ms) |
| git | zlib objects + packfiles, **content-addressed** | gzip(binary) + digest index |
| RocksDB | LSM + per-**block** compression + block checksums | per-record verify (lazy, 1.65 ms) |
| Arrow / FlatBuffers | columnar / struct **zero-copy over one buffer** | binary buffer + views |
| SciPy / cuGraph / ligra | **CSR** | CSR (2.7× over Map) |
| NetworkX | dict-of-dicts | the Map row it outgrew |
| Neo4j | index-free adjacency, fixed-size records | CSR offsets as the same idea |
| Android dm-verity | **per-page Merkle, verify-on-fault, signed root** | §6's per-page digests |

Nobody serious ships JSON-parse-per-query or unverified mmap of writable files; everyone
converges on: **one canonical binary buffer, zero-copy access, lazy block-level
verification under a signed root, prepared queries over a closed surface.** The measured
tables independently arrive at the same place.

---

## Files

| file | what |
|---|---|
| `index-cache.mjs` | the prototype — index in memory, bytes in I/O, digest-verified, `REFUSED ≠ MISS` |
| `bench-rebuild-vs-verify.mjs` | the measurement, with four controls and the cost decomposition |
| `kat-index-fail-open.mjs` | the security KAT — fail-open demonstrated, then closed |
