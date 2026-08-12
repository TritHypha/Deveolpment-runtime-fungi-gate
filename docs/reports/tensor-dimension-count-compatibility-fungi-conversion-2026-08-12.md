# Tensor dimension-count compatibility Fungi conversion proof

## Outcome

The compiler's exported `tensorDimensionCountsCompatible` decision now has an
exact package-owned Fungi counterpart over cardinality-preserving rank tokens
and a physical SLIDE/VOK proof. TypeScript, the type checker and every consumer
remain active.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 37,999 bytes; SHA-256 `922ACA599C553C5764546055E7D64C3DEAB2CD44CB9F7E8C5817978B2E9EBFC7` |
| Fungi candidate | 430 bytes; SHA-256 `D3928A03C0A83CB896E320286BADA8721970492572B0A78B9590757F84A87A4D` |
| Differential test | 3,982 bytes; SHA-256 `12A28ADFA6D8EC380156F6E1D6C346D5A61E37F084D1ED7FC27AD92BD6997AEA` |
| Physical test | 6,761 bytes; SHA-256 `592F34D89B3A58145EEA3E6BCE51E7BC457C6FCB2629889E0369088AD1270929` |
| SLIDE build point | `053cc7573c7b035ab532a9bb69532276981aac96` |
| Registry | `slide.registry.executable-gir.v2c-immutable-array-option.v1` |
| Registry digest | `0ca2e25be48aab5d5e3355069144e79b33888345c8771bffc5afbaab59c8dfbc` |
| Galerina source commit | `167d2310` |
| Galerina physical-proof commit | `812d1e4f` |

## Exact semantic boundary

The TypeScript helper observes only the lengths of its two immutable dimension
arrays. The proof adapter therefore maps every source dimension—fixed or
`"dynamic"`—to one opaque `Int` token while preserving order and cardinality.
The Fungi flow compares only `expected.count()` and `actual.count()`; it never
reads or interprets a token value. No sentinel meaning or union encoding is
introduced.

## Verification

- Exported TypeScript and the typed Fungi interpreter agree across empty,
  singleton, dynamic, equal multi-rank and both unequal-rank directions
  (**3/3**, including the real `FUNGI-TYPE-016` caller).
- Physical SLIDE publication and independent VOK re-admission pass **1/1** with
  zero skips; wrong arity/type, non-Int elements, oversized arrays, exhausted
  work, source mutation and artifact mutation refuse.
- Focused tensor/physical neighborhood: **44/44**.
- Golden Pack: **11/11** strict checks and **11/11** execution vectors.
- Compiler package: **6,369/6,369**.
- Canonical owner: **100/100 packages, 9,589 tests**, exit 0 in **273.8s**.
- Retirement: **1,436** executable-family paths, **489** source `.ts`, **905**
  `.mjs`, **12** `.js`, and **125** source `.fungi` assets.

## Authority boundary

The Fungi source contains no null, NaN, `else if`, `else`, exceptions or loop
forms. No TypeScript/MJS file or consumer is retired or switched. No production,
signing, release, platform or terminal-retirement authority follows. Full
tooling, normal phase-close and whole-memory evaluation remain excluded, so
repository-wide closure is **UNKNOWN**.
