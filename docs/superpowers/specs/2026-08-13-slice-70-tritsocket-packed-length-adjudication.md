# Slice 70 Tritsocket packed-length adjudication

## Objective

Determine whether `galerina-ext-tritsocket/src/prefilter.ts#packedLen` can be
translated to an exact package-owned Fungi/SLIDE arithmetic flow without
narrowing JavaScript `number` or changing `Math.floor` behavior.

## Bound source

- Package: `galerina-ext-tritsocket`, tranche `T3-package-graph`.
- Retirement ledger: no declared bootstrap floor and no existing replacement.
- Surface: exported public entry point called by `pack`, `dot`, `prefilter`,
  `prefilterBatch` and the package test module.
- TypeScript behavior: `Math.floor((lenTrits + 3) / 4)` over the complete
  JavaScript binary64 `number` domain.

## Adjudication

`BLOCKED_BY_BINARY64_FLOOR_DOMAIN`.

The pinned physical profile exposes signed-i32 `Int`, not JavaScript binary64.
The public source accepts fractions, infinities, `NaN`, signed zero and values
outside i32. JavaScript addition, division and `Math.floor` preserve or produce
behaviors for those values that cannot cross the selected physical boundary.
Even within integer inputs, `lenTrits + 3` can exceed i32 while remaining a
valid JavaScript number.

The live callers generally derive lengths from arrays, but caller habits do
not narrow an exported function's declared domain. A source-level branded
non-negative bounded integer contract would make a future checked arithmetic
translation possible; the conversion cannot invent that contract.

## Alternatives rejected

1. **Map `number` to `Int`.** This loses fractions, non-finite values, signed
   zero and values outside signed i32.
2. **Clamp to i32.** The source neither clamps nor refuses such inputs.
3. **Validate only at the Fungi border.** Refusing source-accepted inputs is a
   behavior change unless the TypeScript API first adopts the same contract.
4. **Prove only current array-length callers.** That is caller-scoped evidence,
   not parity for the exported `packedLen` API.

## Threadability and authority

`PARALLEL_PURE`: the arithmetic leaf is deterministic and has no shared state
or ambient effect. This classification does not make its unsupported numeric
domain admissible. No Fungi asset, queue candidate, consumer switch or
retirement is authorized.
