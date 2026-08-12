# Tower authorization Fungi conversion proof

## Outcome

Tower-Citizen's exported `authorize` trust-boundary decision now has an exact
package-owned `.fungi` counterpart and a physical SLIDE/VOK proof. TypeScript
remains the executing differential/bootstrap layer; no consumer was switched
and no TypeScript was retired.

## Closed decision

The input is a typed K3 `Verdict`. Exact `Allow (+1)` returns `true`;
`Unknown (0)` and `Deny (-1)` both return `false`. The flow uses exhaustive
`check` and contains no `null`, `NaN`, `else if`, `throw`, `try`/`catch`,
`for`, `while`, or `loop`.

## Exact custody at the tenth feature commit

| Item | Evidence |
|---|---|
| TypeScript reference | 14,145 bytes; SHA-256 `801F3AA1366BEE32AA2015B76A5F457677193D621FE0D425780C90DD6B5C37A1` |
| Fungi candidate | 475 bytes; SHA-256 `1628027794D5F0C23E7E28E96F9EB19E10900D1F9BFA988E4CA63A97EFA128DE` |
| Differential test | 3,133 bytes; SHA-256 `D81D5CAA3CC10735B95B3819A5BEE112B4BC8B727990AC38B1E32F858E3E667A` |
| Physical SLIDE/VOK test | 5,714 bytes; SHA-256 `EB29E93E01CF39E231586DA00236E12E17E4EFBC64827EE808BA96FE7D3E5702` |
| Independent SLIDE build point | `dc1add78215cfce2b5d23fcf194076b56501fa53` |
| Galerina source/proof commit | `79ca32bc` |
| Retirement owner commit | `1fcf499e` |

## Verification

- Focused differential proof: 2/2 across the complete K3 table.
- Physical proof: 1/1 with zero skips. It publishes one `.slide`, independently
  re-admits it through VOK, and verifies typed Bool receipts.
- Non-Verdict input, wrong type or arity, surplus input, source mutation and a
  one-byte artifact mutation all refuse.
- Complete Tower-Citizen package lane at this slice: 503/503 pass.
- Retirement evidence at this slice records 1,429 executable-family paths and
  120 `.fungi` source assets.
- The monitored canonical owner completed after the adjacent collapse proof
  joined the same package. Its honest combined result is 100/100 packages and
  9,574 tests in 277.8 seconds with captured exit code 0; it is not presented
  as an isolated tenth-only aggregate.

## Authority boundary

`three-valued-governance.ts`, `authorize`, and every caller remain active.
This proof grants no consumer-switch, production, release, signing, platform,
or terminal-retirement authority. Repository-wide closure remains UNKNOWN
because crash-linked full tooling, normal phase-close, graph-all-after-roadmap,
and whole-memory evaluation remain excluded.
