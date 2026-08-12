# Transport permit-data Fungi conversion

## Result

Tower-Citizen's exported `permitData` decision now has one package-owned Fungi
translation and independent physical SLIDE/VOK evidence. The translation is
reference-only: TypeScript remains the executing border, the complete
transport FSM remains authoritative, and no consumer has switched.

## Exact source custody

| Artifact | SHA-256 |
|---|---|
| `packages-galerina/galerina-tower-citizen/src/transport-fsm.ts` | `c338ad5cc2b5ec95cb17003cbf65a65e4ad7234d2657198268ac024cacc5e535` |
| `packages-galerina/galerina-tower-citizen/src/self-hosted/transport-fsm.fungi` | `cd5abea90fb5b02b8516e33488abdff604ff6754e6b2f451223453466502cef3` |

The RED differential proof is committed at `2dd69275`, the Fungi source at
`165c7a3d`, and the physical integration proof at `bceb3cb8`. Independent
SLIDE remains pinned at `6de4d91`.

## Semantic proof

The admitted flow accepts the frozen transport-state integer encoding and
returns true only for `0`, the package's existing `Established` state. It
returns false for `Recovering`, `Closed`, and every other signed Int32 value.
The proof covers:

- exact differential comparison with the live TypeScript export for all three
  declared states and representative unknown encodings;
- strict parse, type, effect, and governance checking;
- physical SLIDE publication, independent re-admission, affine VOK execution,
  and typed Bool receipt verification for seven boundary vectors;
- refusal of wrong argument types and counts, non-finite numbers, fractions,
  out-of-range Int values, inadequate work, mutated source bytes, receipt
  fields, every safe-value envelope byte, and the physical `.slide` artifact.

The differential proof passes **2/2** and the physical proof passes **1/1**
with zero skips. Tower-Citizen passes **507/507 across 59 suites**. The
pass-through comparison requires no optional SLIDE operation registry; the
physical proof asserts exact absence rather than substituting a sentinel.

## Language constraints

The Fungi source contains no null, NaN, `else if`, `else`, exception syntax,
`for`, `while`, or `loop`. It uses one happy-path `if` and an explicit terminal
false exit, invents no syntax, widens no registry, and raises no resource
limit.

## Closure and authority boundary

The monitored canonical owner completed with recorded exit code 0: **100/100
packages and 9,602 tests** in **301.0 seconds**. Retirement derives **1,446**
executable-family paths and **131** source Fungi assets. Its registered owner
was stale after the new physical test entered the executable family, then was
regenerated and passed both the exact freshness check and staged-index
anti-neutering proof. Golden remains current at **11/11 checked examples and
11/11 execution vectors**.

`permitData`, `step`, timeout handling, key custody, and every consumer remain
active. This slice does not authenticate the state encoding or prove transport
liveness. It authorizes no consumer switch, TypeScript retirement, bootstrap
fixpoint, signing, release, production, durability, or general source family.
Crash-linked full tooling, normal phase-close, graph-all, and monolithic memory
evaluation remain excluded, so repository-wide closure is `UNKNOWN`.
