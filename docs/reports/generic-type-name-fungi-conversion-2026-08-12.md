# Generic type-name Fungi conversion proof

## Outcome

The naming tool's private `isGenericTypeName` decision now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. TypeScript
remains the executing differential/bootstrap layer; no consumer was switched
and no TypeScript was retired.

## Closed decision

The decision trims immutable input text and returns `true` only for exact
`Any`, `Object`, or `unknown`. It performs no case folding or Unicode
normalization. U+200B, U+180E, compound generic forms, nullable suffixes,
embedded NUL, and differently cased spellings remain ordinary content.

The `.fungi` source contains no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop` construct.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 17,131 bytes; SHA-256 `F710F6A79DD3C2BD2801E30DD2C922ED141A72E9DBD204B70A678BEE3A383910` |
| Fungi candidate | 492 bytes; SHA-256 `734FCF9036CADB4D3E135A9DA0784CBC01E6D4A3647523F5865240029ADCDDA2` |
| Differential test | 4,169 bytes; SHA-256 `DC2A686C5CF14A1383E1B4B2F9B3AC26BB94A2BD4217B48D2534EFEE17AC41BC` |
| Physical SLIDE/VOK test | 7,404 bytes; SHA-256 `7CD93BCDBEC8CB3D1B6FBE0BD867AD4FA54B9CEB39003AC57CC993B9EBCDDCC6` |
| Independent SLIDE build point | `dc1add78215cfce2b5d23fcf194076b56501fa53` |
| SLIDE registry | `slide.registry.executable-gir.v2c-immutable-text-trim.v1` |
| Registry descriptor digest | `15b25801228797c2f0c5230f4b8d5c3e03bd5bdd8d0451281d380801656641ef` |
| Galerina source/proof commit | `ceeb9df6` |
| Retirement owner commit | `780223c8` |

## Verification

- Focused differential proof: 2/2 pass across 18 canonical and hostile values.
- Physical proof: 1/1 pass with zero skips. It publishes one `.slide`,
  independently re-admits it through VOK, and verifies every value as a typed
  Bool receipt against the real public `checkNaming` caller.
- Wrong argument count/type, surplus input, unpaired surrogate, insufficient
  comparison work, source mutation, and one-byte artifact mutation all refuse.
- Complete `@galerina/devtools-naming` package lane: 19/19 pass.
- Complete package owner: 100/100 packages and 9,570 tests pass in 279.7
  seconds with captured exit code 0.
- Retirement evidence records 1,428 executable-family paths and 119 `.fungi`
  assets. Remaining generated owners are refreshed in the shared ninth-slice
  closure wave rather than inferred from earlier evidence.

## Authority boundary

`naming-checker.ts`, its private TypeScript function, `checkNaming`,
`runNamingAudit`, the CLI, and all existing consumers remain active. This proof
grants no consumer-switch, production, release, signing, platform, general
String, or terminal-retirement authority. Repository-wide closure remains
UNKNOWN because crash-linked full tooling, normal phase-close,
graph-all-after-roadmap, and whole-memory evaluation remain excluded.
