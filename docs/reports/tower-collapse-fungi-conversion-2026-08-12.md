# Tower collapse Fungi conversion proof

## Outcome

Tower-Citizen's exported `collapse` trust-boundary decision now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. TypeScript
and every consumer remain active.

## Closed decision

The input is a typed K3 `Verdict`. Exact `Allow (+1)` returns `"allow"`;
`Unknown (0)` and `Deny (-1)` both return `"deny"`. The flow uses exhaustive
`check`, performs no numeric or truthiness coercion, and contains no `null`,
`NaN`, `else if`, `throw`, `try`/`catch`, `for`, `while`, or `loop`.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | 14,145 bytes; SHA-256 `801F3AA1366BEE32AA2015B76A5F457677193D621FE0D425780C90DD6B5C37A1` |
| Fungi candidate | 868 bytes; SHA-256 `4C8B643C8966202B628AEBDBFEEAE25D2D2B57036172129588D2443C825334AC` |
| Differential test | 2,853 bytes; SHA-256 `EF832A6850834DBFBDD1BDEE089B209209524BC3349BB29D2A1DE203A0ECB336` |
| Physical SLIDE/VOK test | 5,705 bytes; SHA-256 `6A64614A2F38F1E8CEC2E1179D390E8C4ABF6E728BE3B6351CF9A5D08E3E364A` |
| Independent SLIDE build point | `dc1add78215cfce2b5d23fcf194076b56501fa53` |
| Galerina source/proof commit | `0e1eaa17` |
| Retirement owner commit | `ea2b58d3` |

## Verification

- Differential proof: 2/2 across the complete K3 collapse table; the combined
  authorization/collapse package neighborhood is 4/4.
- Physical proof: 1/1 with zero skips; the combined physical neighborhood is
  2/2. VOK verifies typed String receipts and retains `authorityReleased:
  false`.
- Non-Verdict input, wrong type or arity, surplus input, source mutation and a
  one-byte artifact mutation all refuse.
- Complete Tower-Citizen package lane: 505/505 pass with zero failures/skips.
- Complete canonical owner: 100/100 packages and 9,574 tests pass in 277.8
  seconds with captured exit code 0.
- Retirement evidence records 1,430 executable-family paths, 899 `.mjs`
  paths, and 120 `.fungi` source assets.

## Authority boundary

`three-valued-governance.ts`, `collapse`, `decideAtBoundary`, and all callers
remain active. This proof grants no consumer-switch, production, release,
signing, platform, or terminal-retirement authority. Repository-wide closure
remains UNKNOWN because the crash-linked closure lanes remain excluded.
