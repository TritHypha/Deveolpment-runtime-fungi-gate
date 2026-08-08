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

## Files

| file | what |
|---|---|
| `index-cache.mjs` | the prototype — index in memory, bytes in I/O, digest-verified, `REFUSED ≠ MISS` |
| `bench-rebuild-vs-verify.mjs` | the measurement, with four controls and the cost decomposition |
| `kat-index-fail-open.mjs` | the security KAT — fail-open demonstrated, then closed |
