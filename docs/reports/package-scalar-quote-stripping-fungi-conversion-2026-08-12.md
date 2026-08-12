# Package scalar quote stripping Fungi conversion proof

## Outcome

The package resolver's private `stripQuotes` helper now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. The retained
TypeScript helper and its `parseSimpleYaml` and `loadPackageManifest` consumers
remain active.

## Closed decision

The candidate trims surrounding whitespace, removes exactly one balanced pair
of outer single or double quotes, and otherwise returns the trimmed String
unchanged. The differential corpus includes balanced, unbalanced and mixed
quotes, empty quoted values, prototype names, composed and decomposed Unicode,
and an embedded NUL.

The Fungi source uses a private pure predicate to stay within the frozen
checked-Fungi control-flow bound. It contains no `null`, `NaN`, `else if`,
`throw`, `try`/`catch`, `for`, `while`, or `loop`.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 27,940 bytes; SHA-256 `497383785AAF92389C1A7C0843C8756BA9DF203584D8F8C4FD61EDDE8539B7E9` |
| Fungi candidate | 808 bytes; SHA-256 `9EB06C678CFD89CEBFCC8797936F7FABEEBE7D5A93319CBD0AB29634480AE656` |
| Differential test | 4,003 bytes; SHA-256 `20FF30A261246DB08A8F921CB880E37DFE6F35359F3299B4F41D87415E1225D5` |
| Physical SLIDE/VOK test | 7,135 bytes; SHA-256 `1909AAB08ED1EE204178042A29A8C5D05B0B87DFB8AD02D3D3E764B74284FDFA` |
| Independent SLIDE build point | `053cc7573c7b035ab532a9bb69532276981aac96` |
| Executable registry | `slide.registry.executable-gir.v2c-immutable-text-slice.v1` |
| Registry digest | `2c316a990c2eb08f565bbea774ed623f5412985c31e37182412eacaf1ab0ffa8` |
| Registry contract | Contract 84; 1,036 exact bytes |
| Galerina source/proof commit | `b6b91be2` |

## Verification

- The real `loadPackageManifest` caller and typed Fungi interpreter agree over
  the exact canonical and hostile corpus (**2/2**).
- Independent SLIDE compiles the exact Fungi bytes, publishes one physical
  `.slide`, independently re-admits it through VOK and verifies typed String
  receipts (**1/1**, zero skips).
- Invalid arity or types, insufficient steps, source mutation and one-byte
  artifact mutation refuse. The physical proof pins the exact executable
  registry identity and digest.
- The focused resolver and physical-proof neighborhood passes **70/70**.
- Complete compiler package lane: **6,363/6,363** pass with zero failures and
  zero skips.
- Complete canonical owner: **100/100 packages and 9,583 tests** pass in
  **274.8 seconds** with captured exit code 0.
- Retirement evidence records **1,434 executable-family paths**, **489** source
  `.ts` paths and **123** `.fungi` source assets. TypeScript/MJS counts are
  unchanged by this reference-only slice.

## Prerequisite resolved in SLIDE

The first physical compile correctly refused because the independent frontend
did not admit escaped quote literals or immutable text slicing. Contract 84
adds a successor registry with exact canonical `\\uXXXX` decoding and opcode 44
`text_slice`. The predecessor registry remains frozen and refuses opcode 44.
Execution uses explicit UTF-16 code-unit copying, refuses surrogate-splitting
boundaries, charges the full input text work, and grants no authority.

## Authority boundary

`package-resolver.ts`, `stripQuotes`, `parseSimpleYaml`, `loadPackageManifest`
and every caller remain active. This proof grants no consumer-switch,
production, release, signing, platform or terminal-retirement authority.
Repository-wide closure remains UNKNOWN because the crash-linked full tooling
and phase-close lanes remain deliberately excluded. The primary graph transport
is also UNKNOWN; the bounded Myco index is the current discovery fallback.
