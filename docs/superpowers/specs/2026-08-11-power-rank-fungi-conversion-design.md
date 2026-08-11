# Power Rank Fungi Conversion Design

## Objective

Translate the private, deterministic `powerRank` decision in
`packages-galerina/galerina-core-sentinel-power/src/power-governor.ts` into the
existing package-owned `power-governor.fungi` twin and prove the exact mapping
through canonical compiler execution and physical SLIDE/VOK. TypeScript and
`PowerGovernor.requestAdjustment` remain active.

## Source dossier

- Galerina build point: `1312e299b8dddde86896e1437aa556791880d3d7`.
- TypeScript source SHA-256:
  `0abc8869abcb06b062ca7d6103b36ee0aff90afe175579b8a160812c8f3ced47`.
- Existing Fungi twin SHA-256 before this slice:
  `f15b09d1a852ab0ee63fa239476e19e1de77373867b7526a5e1ba5c08685f967`.
- Node.js: `v24.18.0`.
- Independent SLIDE build point:
  `ac8a0418ec0bfe6443807db1b100b0a02d5b1ea8`.
- Production caller: `PowerGovernor.requestAdjustment`.
- Existing observable tests: `power-governor.test.mjs` and
  `full-sentinel-flight.test.mjs`.

The source uses `KERNEL_POWER_ORDER.indexOf(k)` over
`["native", "simd", "shadow"]`. The exact observable mapping is therefore
`native -> 0`, `simd -> 1`, `shadow -> 2`, and every other runtime String
value -> `-1`. It has no effects, mutation, exception, async scheduling,
absence, numeric coercion, or partial progress.

## Considered approaches

1. **Extend `power-governor.fungi` (selected).** One package-owned semantic
   twin retains the existing power-state and admission flows and gains the
   exact String-to-rank boundary. Existing compiler/Wasm proof infrastructure
   is reused.
2. **Create `power-rank.fungi`.** This isolates the slice but creates a second
   semantic owner for the same governor and expands package asset custody
   without need.
3. **Classify the source as already superseded.** Rejected: the current Fungi
   file documents numeric ranks but has no flow proving String mapping or the
   invalid-value `-1` result.

## Exact Fungi boundary

Add `pure flow powerRank(kernel: String) -> Int`. It compares the bounded
String against the three canonical tier names in source order and returns the
corresponding rank. A terminal `return 0 - 1` preserves JavaScript `indexOf`
for every non-member String.

The flow contains no null, NaN, `else if`, `throw`, `try`, `catch`, `for`, or
`loop`. It grants no effect or authority. Sequential Boolean `if` statements
are used because the source is an ordered membership lookup, not an
`else if` chain, and each successful arm terminates.

## Decision and effect ledger

| Source expression | Subject | Terminal | Fungi construct | Effects | Failure exit | Evidence |
|---|---|---:|---|---|---|---|
| `k == "native"` through `indexOf` | `Bool` | yes | `if` | none | continue | fixed source array |
| `k == "simd"` through `indexOf` | `Bool` | yes | `if` | none | continue | fixed source array |
| `k == "shadow"` through `indexOf` | `Bool` | yes | `if` | none | continue | fixed source array |
| no member matched | exhausted String membership | yes | terminal return | none | `-1` | JavaScript `indexOf` contract |

## Proof shape

1. Extend the existing RD-0361 compiler/Wasm test before the flow exists and
   retain the missing-export RED result.
2. Check the three canonical tiers plus empty, case-changed, whitespace,
   embedded-NUL, and unknown Strings through typed interpretation and signed,
   admitted Wasm.
3. Compare the public TypeScript caller over every permitted/target tier pair
   so the rank ordering remains tied to production behaviour.
4. Add a physical integration test that compiles the exact Fungi bytes with
   independent SLIDE, publishes one `.slide` export, independently re-admits
   it, verifies typed Int receipts, and refuses malformed arguments, source
   mutation, and physical artifact mutation.

## Authority boundary

This is a reference-only, non-retiring slice. It does not export the private
TypeScript helper, switch `requestAdjustment`, remove TypeScript, or grant
bootstrap, production, hardware, signing, release, durability, or retirement
authority. The existing governor twin remains one package asset; only the new
flow receives physical SLIDE/VOK evidence.

## Acceptance evidence

- Focused RED fails because the `powerRank` Fungi export is absent.
- Exact Fungi source passes strict type and governance checking.
- Existing RD-0361 test passes all old vectors plus the new String rank vectors.
- Physical SLIDE/VOK integration passes with zero skips.
- The sentinel-power package remains green.
- Generated owners and indexes are refreshed after the slice; the crashing
  tooling process and whole-memory evaluation remain excluded.
