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
| Galerina source/evidence commit | `37ccee7b` |
| Retirement owner commit | `0b61dd68` |
| Graph owner commit | `dd3d0ef4` |

## Verification

- Complete `@galerina/devtools-naming` package lane: 17/17 pass.
- Complete package aggregate: 100/100 packages and 9,568 tests pass in
  274.9 seconds.
- Focused differential proof: 2/2 pass across 15 canonical and hostile values.
- Physical proof: 1/1 pass with zero skips. It publishes one `.slide`,
  independently re-admits it through VOK, and verifies every value as a typed
  Bool receipt against the real public `checkNaming` caller.
- Wrong argument count/type, surplus input, unpaired surrogate, insufficient
  comparison work, source mutation, and one-byte artifact mutation all refuse.
- The physical execution reports exact trim work equal to the input UTF-8 byte
  length and retains `authorityReleased: false`.
- Generated graph owners pass 7/7 in both generate and check modes; semantic
  outputs are 3/3 current with 100 packages and 897 test nodes. Retirement
  evidence records 1,427 executable-family paths and 118 `.fungi` assets.
- Myco indexes 4,983 files. The primary code graph is force-rebuilt after the
  final closure commit and independently checked for an exact indexed/Git head,
  conserved node and edge totals, `stale: false`, and queryability of the new
  physical proof. Volatile graph counts remain in the graph status rather than
  being copied into this report.
- The bounded owner matrix is current: percentage freshness; status; roadmap
  5/5; canonical counts 7/7 plus anti-neutering self-test; Golden 11/11 checked
  plus 11/11 execution vectors; diagnostic code index; semantic outputs 3/3;
  retirement; pinned SLIDE evidence; and path-leak enforcement.

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
UNKNOWN because the crash-linked full tooling, normal phase-close and
whole-memory evaluation remain deliberately excluded.
