# Implicit return-type Fungi conversion proof

## Outcome

The naming tool's private `isImplicitReturnType` decision now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. TypeScript
remains the executing differential/bootstrap layer; no consumer was switched
and no TypeScript was retired.

## Closed decision

The decision trims immutable input text using the exact ECMAScript edge
whitespace set and returns `true` only for `""`, `"void"`, or `"Void"`.
U+200B and U+180E are retained, case is not folded, Unicode is not normalized,
and embedded NUL remains ordinary content.

The `.fungi` source uses one named immutable `String` value and three ordinary
Boolean decisions. It contains no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop` construct.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 17,131 bytes; SHA-256 `F710F6A79DD3C2BD2801E30DD2C922ED141A72E9DBD204B70A678BEE3A383910` |
| Fungi candidate | 511 bytes; SHA-256 `FB92E90830245FA45636507274F79E3CFBF0D403EBC161639152B8BF3121BF2F` |
| Differential test | 4,019 bytes; SHA-256 `46B13441B9EA9647F3A23C2AC43B69667CB3379252DD725EA201DCE75618828F` |
| Physical SLIDE/VOK test | 7,357 bytes; SHA-256 `AFCB5D1F1D4BDFE0D902C66E84314D8F61ED060005CCB269FD20F286A16C5B88` |
| Independent SLIDE build point | `dc1add78215cfce2b5d23fcf194076b56501fa53` |
| SLIDE registry | `slide.registry.executable-gir.v2c-immutable-text-trim.v1` |
| Registry descriptor digest | `15b25801228797c2f0c5230f4b8d5c3e03bd5bdd8d0451281d380801656641ef` |

## Verification

- Complete `@galerina/devtools-naming` package lane: 17/17 pass.
- Focused differential proof: 2/2 pass across 15 canonical and hostile values.
- Physical proof: 1/1 pass with zero skips. It publishes one `.slide`,
  independently re-admits it through VOK, and verifies every value as a typed
  Bool receipt against the real public `checkNaming` caller.
- Wrong argument count/type, surplus input, unpaired surrogate, insufficient
  comparison work, source mutation, and one-byte artifact mutation all refuse.
- The physical execution reports exact trim work equal to the input UTF-8 byte
  length and retains `authorityReleased: false`.

## Resolved blocker

SLIDE previously lacked an independently admitted immutable String trim
operation. Contract 83 and opcode 43 now provide that exact bounded operation,
with explicit code-unit semantics, fatal UTF-8 handling, a 256-byte text
ceiling, comparison-work accounting, physical package publication and VOK
re-admission. The predecessor registry refuses the opcode.

## Authority boundary

`naming-checker.ts`, its private TypeScript function, `checkNaming`,
`runNamingAudit`, the CLI, and all existing consumers remain active. This proof
grants no consumer-switch, production, release, signing, platform, general
String, or terminal-retirement authority. Repository-wide closure remains
UNKNOWN until the bounded owner chain is regenerated and checked.
