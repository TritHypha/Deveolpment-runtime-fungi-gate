# Slice 68 hardware vector-tier record adjudication

## Objective

Determine whether `galerina-core-economics/src/index.ts#selectVectorTier` can
be translated to an exact package-owned Fungi/SLIDE projection without moving
the `HardwareProfile` record boundary or narrowing JavaScript values.

## Bound source

- Package: `galerina-core-economics`, tranche `T2-runtime-core`.
- Retirement ledger: no declared bootstrap floor and no existing replacement.
- Surface: exported public entry point with one test-module caller in the
  indexed repository.
- TypeScript behavior: return `hw.vectorTier` from a `HardwareProfile` record.
- Record fields: `model: string`, `cores: number`, `maxTurboHz: number`,
  `vectorTier: "scalar" | "avx2" | "avx512"`, and
  `topology: "symmetric" | "hybrid"`.

## Adjudication

`BLOCKED_BY_HARDWARE_PROFILE_RECORD_ABI`.

The pinned checked-Fungi physical profile supports `Int`, `Bool`, `Verdict`,
`String`, `Bytes`, `Array<Int>` and `Option<Int>`. Its `Int` representation is
signed i32 and it has no `Float` type. It therefore cannot preserve both
JavaScript `number` fields in the exact public record domain. Passing only the
`vectorTier` String would project the answer in TypeScript and would not prove
the record ABI.

JavaScript property access also admits inherited properties, accessors and
proxies unless callers constrain them elsewhere. A closed physical record that
refuses those shapes is safer, but it is not behaviorally identical to this
exported JavaScript function without an adopted boundary contract.

## Alternatives rejected

1. **Pass only `vectorTier`.** This moves the record projection into the host.
2. **Map both numbers to `Int`.** This narrows binary64, non-integral,
   non-finite, signed-zero and out-of-i32 source values.
3. **Drop unused record fields.** This changes the exported ABI and cannot
   detect malformed, surplus, inherited, accessor or proxy inputs at the same
   boundary.

## Threadability and authority

For an admitted immutable closed record the leaf would be `PARALLEL_PURE`.
The current exported JavaScript boundary is `UNKNOWN` for parallel scheduling
because proxy/accessor and concurrent-mutation behavior is not constrained.
No Fungi asset, queue candidate, consumer switch or retirement is authorized.
Revisit only after an exact `HardwareProfile` wire/record contract and physical
numeric representation are adopted and independently admitted.
