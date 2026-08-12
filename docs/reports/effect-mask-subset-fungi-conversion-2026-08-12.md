# Effect-mask subset Fungi conversion

## Result

The compiler's exported `effectsSubset` decision now has one package-owned
Fungi translation and independent physical SLIDE/VOK evidence. The translation
is reference-only: TypeScript remains the executing border, effect-name
derivation and mask provenance remain outside the flow, and no consumer has
switched.

## Exact source custody

| Artifact | SHA-256 |
|---|---|
| `packages-galerina/galerina-core-compiler/src/type-registry.ts` | `922aca599c553c5764546055e7d64c3deab2cd44cb9f7e8c5817978b2e9ebfc7` |
| `packages-galerina/galerina-core-compiler/src/self-hosted/effect-mask-subset.fungi` | `9c63933a8bbcc9f038e78260a98c30f022540dbac18f9b1763b9864b24b8524c` |

The Fungi implementation is committed at `25fac0ab`, its bounded source-shape
correction at `1b990800`, and its physical integration proof at `5f91242b`.
Independent SLIDE Contract 85 is implemented at `6de4d91`.

## Semantic proof

The admitted flow accepts two signed Int32 masks and returns true only when
every bit in `required` is present in `declared`. It uses governed
`Int.bitAnd`, a Bool condition, and an explicit terminal false exit. The proof
covers:

- zero, individual, combined, disjoint, unmapped, signed-negative, minimum and
  maximum Int32 masks;
- byte-exact differential comparison with the live TypeScript export;
- strict parse, type, effect and governance checking;
- physical SLIDE publication, independent re-admission, affine VOK execution,
  and typed Bool receipt verification for all fourteen vectors;
- refusal of wrong argument types and counts, NaN, infinity, fractions,
  out-of-range Int values, inadequate work, mutated source bytes, receipt
  fields, every safe-value envelope byte, and the physical `.slide` artifact.

The differential and physical proofs each pass **1/1** with zero skips. The
compiler package passes **6,380/6,380**. SLIDE passes **1,006/1,006 across 101
suites** and pins registry `slide.registry.executable-gir.v2c-bitwise-and.v1`
with descriptor digest
`361f086de7b88928cde0b49c02ce480669192f16e3494353e9e82a2962a40a8c`.

## Language constraints

The Fungi source contains no null, NaN, `else if`, `else`, exception syntax,
`for`, `while`, or `loop`. It invents no language syntax and widens no existing
registry. Equality remains a condition rather than being added to SLIDE's
general expression grammar.

## Closure and authority boundary

The monitored canonical owner completed with recorded exit code 0: **100/100
packages and 9,600 tests** in about **282 seconds**. Retirement derives
**1,445** executable-family paths and **131** source Fungi assets. The Golden
and retirement checks correctly refused stale generated owners after the new
source and test were committed; those owners must be regenerated before their
freshness can be claimed.

`effectsSubset`, `effectsToFlags`, authoritative effect-name checks, and every
consumer remain active. This slice does not authenticate either mask or prove
its provenance. It authorizes no consumer switch, TypeScript retirement,
bootstrap fixpoint, signing, release, production, durability, or general source
family. Crash-linked full tooling, normal phase-close, graph-all, and monolithic
memory evaluation remain excluded, so repository-wide closure is `UNKNOWN`.
