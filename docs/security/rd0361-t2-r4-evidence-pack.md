# RD-0361 T2 (Memory) tranche — R4 authority-flip evidence pack

> ## Bounds-hardening addendum — 2026-07-30
>
> The authoritative `memory-validator.fungi` now exposes `isInBounds` as an
> overflow-safe Boolean decision using `len <= capacity - ptr` only after
> rejecting negative values and `ptr > capacity`. Its execution-cutover test
> compares admitted WASM with the TypeScript reference over 8,993 bounded-grid
> cases plus the signed-i32 overflow edge. A distinct fail-open mutation drops
> `ptr` from the remaining-capacity calculation; the full security mutation
> run kills that mutant and all other **60/60** mutants.
>
> The TypeScript shadow also refuses non-finite, fractional, unsafe-integer,
> invalid-alignment, and overflow-prone requests. Sentinel Memory is **39/39**.
> `gather-t2-twin-hashes.mjs` then rebuilt all five modules: **5/5** R0-clean,
> signed, #105-admitted, and the memory-validator module has no host imports.
> The intentional source change moved that one pin to the value below; no
> other T2 hash moved.
>
> ## Hash-integrity addendum — 2026-07-29
>
> The new executable ledger verifier
> `node scripts/gather-r4-twin-hashes.mjs --verify-ledger` found that four of
> the five T2 hashes no longer matched their ledger entries. The twin sources
> had not changed since their original introduction; the deterministic output
> moved with reviewed WAT-emitter evolution after the 2026-07-22 flip.
> `memory-validator` remained byte-identical.
>
> This was treated as a blocking provenance failure, not waived. All five
> current memory differentials were rerun (**5/5**), all five targeted
> fail-open mutants were killed (**5/5**), all current modules were R0-clean,
> signed and #105-admitted, and no import outside the compiler's closed
> deterministic stdlib ABI was present. The four moved hashes were then
> re-pinned in the live authority ledger. The verifier now compares derived
> bytes to every ledger hash and refuses mismatch, malformed hash, duplicate
> entry, missing source/build definition, failed admission, or ambient import.
>
**Assembled + FLIPPED:** 2026-07-22 · **Tranche:** T2 (the five `galerina-core-sentinel-memory` boundary twins) · **State:** ★ **FLIPPED 2026-07-22** under the owner's R4 authorization (*"unlock R4 flip (#143) — GO!"*, given after WAT-emitter completion). The five T2 twins are now **`authoritative`** — recorded in the authority ledger [`rd0361-authoritative-twins.json`](rd0361-authoritative-twins.json) and enforced by `audit-kernel-fungi-twins.mjs` (RED-on-regression + missing-target, self-tested). The five sha256 in item (d) were re-gathered immediately before the flip (`node scripts/gather-t2-twin-hashes.mjs`, exit 0). Shadow-bake in progress: each `.ts` is retained as a differential shadow (its execution-cutover test keeps asserting WASM===`.ts`); it is deleted only post-bake. If any evidence item below later proves false the flip is void and reverted (remove the twins from the ledger).

> **Provenance note:** unlike the T1 pack, this pack is written as-of-flip (present tense = today's live state), so there is no pre-flip/post-flip drift to reconcile. Authority truth = the ledger json + `node scripts/audit-kernel-fungi-twins.mjs`, NOT this prose.

This pack satisfies the **R4 unlock protocol** (the same five items the T1 pack cleared): if any item below later proves false the flip is **void and reverted**. R4 is **not** P9-gated (RD-0361 §2: the gate is differential-verdict-parity, not P9 byte-parity).

## The tranche

| Twin | Package (`src/self-hosted/…`) | Surface |
|---|---|---|
| `memory-validator` | `galerina-core-sentinel-memory` | pointer alignment plus overflow-safe extent gate |
| `pool-allocation-guard` | `galerina-core-sentinel-memory` | pool-exhaustion admission (LSM-POOL-EXHAUSTED) |
| `pool-policy` | `galerina-core-sentinel-memory` | pool block-size policy floor (`blockBytes`) |
| `segmentation-guard` | `galerina-core-sentinel-memory` | cross-segment access guard (LSM-SEGV) |
| `trit-buffer-guard` | `galerina-core-sentinel-memory` | trit-buffer 2-bit-corruption sentinel (LSM-TRIT-CORRUPT) |

## The five evidence items

### (a) Execution column all-`differential` — ✅
`node scripts/audit-kernel-fungi-twins.mjs` reports every T2 memory twin as `differential` (built, #105-admitted, and executed against its `.ts` reference) prior to the flip. No twin is `shadow`. Post-flip they read `authoritative`.

### (b) Zero `.wasm`↔`.ts` verdict mismatches over the suite soak — ✅
Each twin's execution-cutover differential asserts the **WASM verdict === the real `.ts` verdict** over a fail-closed boundary corpus and REJECTS on any disagreement. All five pass in the full workspace run (**95/95 packages · 7,672 tests · 0 fail**):
- `tests/rd0361-memory-validator-execution.test.mjs`
- `tests/rd0361-pool-allocation-guard-execution.test.mjs`
- `tests/rd0361-pool-policy-execution.test.mjs`
- `tests/rd0361-segmentation-guard-execution.test.mjs`
- `tests/rd0361-trit-buffer-guard-execution.test.mjs`

### (c) Anti-neuter — the differential is non-vacuous (mutation-kill) — ✅
`node scripts/audit-mutation.mjs` (SEC-002): for each twin a deliberately-weakened fold (a planted fail-open) is re-introduced into the `.fungi`; its execution-cutover differential rebuilds the WASM from the mutated source and **KILLS the mutant**. Full suite: **52/52 mutants killed, 0 survived**. The five T2 memory mutants:
- `rd0361-t2-memvalidator-align` — `ptr % align == 0` → `!= 0` (an UNALIGNED ptr would pass)
- `rd0361-t2-poolalloc-exhaust` — `runAvailable == false` → `!= false` (an EXHAUSTED pool would allocate)
- `rd0361-t2-poolpolicy-blockbytes` — `blockBytes <= 0` → `< 0` (a ZERO-byte block config accepted)
- `rd0361-t2-segguard-crosssegment` — `actual != intended` → `== intended` (a CROSS-segment access allowed)
- `rd0361-mem-tritbufferguard-tamper` — `checkTritEnc` weakened (a 2-bit-corrupt code 3 decodes 'ok'; tampered backing memory accepted)

### (d) Each twin hash-pinned, signed, #105-admitted — ✅
`node scripts/gather-t2-twin-hashes.mjs` builds each twin to WASM (R0), signs it with an ephemeral in-memory dev keypair (no real signing key is touched), and admits it through the attestation-first #105 gate (R1). All five R0-clean + #105-admitted. The pinned sha256 values below are the current 2026-07-29 outputs after the verified emitter-evolution re-pin:

| Twin | bytes | sha256 |
|---|---|---|
| `memory-validator` | 334 | `780066215a5107254ffd1968a50b57c2f4bea399962a61f443748426153aaeda` |
| `pool-allocation-guard` | 246 | `1b85e0ff9dba897fb42acafbb5110e3f4a766fa94d3f2d17fd0dac46311d207c` |
| `pool-policy` | 171 | `f4657aac19cee85a13b99e4d86fb335afa8b73713dead202b7084af0f6efa370` |
| `segmentation-guard` | 147 | `8f9e5860c5e6117dce4205b674dcbecc42c123d07d395b51dbba63245b31a195` |
| `trit-buffer-guard` | 214 | `4344e9568aec58096f4c590edfd6095b4bca4beabad474aa424cdd5676040a18` |

> These hashes are the current emitter's deterministic output; a change to a
> twin or the emitter moves the hash. `audit-kernel-fungi-twins.mjs` enforces
> check-clean + differential-proof-present, while
> `gather-r4-twin-hashes.mjs --verify-ledger` independently re-derives and
> checks the ledger hashes, signed #105 admission, and ambient-import boundary.

### (e) Measured perf for hot-path twins — N/A
The T2 memory guards are tiny pure verdict folds (147–298-byte modules), not a hot path. No perf waiver needed.

## What the flip does (per surface)

1. Mark the twin's WASM **authoritative** (it becomes the decider).
2. Keep the `.ts` running as a **differential shadow** — compare every verdict, alarm on divergence — for a bake window (shadow-bake; do NOT delete the `.ts` at the moment you start trusting the WASM).
3. Bake clean → delete the `.ts` decision body per surface (a separate, later step — not done here).
4. The twin-audit execution column records `authoritative` and **fails RED on any regression** (`authoritative` → anything lesser).

## Provenance of the nod

The owner's authorization was the general form *"unlock R4 flip (#143) — GO!"* (given after confirming the WAT emitter is complete). Main assembled this pack (a–e, the same bar the T1 pack cleared) and flipped the T2 tranche under that authorization. The flip is reversible: if the owner intended a narrower scope, remove the five T2 entries from the ledger and the twins return to `differential`.
