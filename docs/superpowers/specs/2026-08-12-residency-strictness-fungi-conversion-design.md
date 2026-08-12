# Residency strictness Fungi conversion design

## Decision

Express the exported TypeScript `atLeastAsStrict` predicate as a package-owned
pure Fungi module whose public flow is named `atLeastAsStrictFungi`. The module
contains two closed helpers: one maps the five canonical residency tiers to the
exact TypeScript ranks `0..4` and every other String to sentinel rank `5`; the
other compares two admitted ranks with an early Boolean guard. The public flow
rejects either sentinel in one combined guard before calling the comparator.

This is a reference-only conversion slice. TypeScript, `reconcileExplicit` and
every production caller remain active until consumer-switch, bootstrap-fixpoint
and retirement gates are independently proved.

## Source and compatibility boundary

The source domain is the total order:

| Tier | Rank |
|---|---:|
| `register_only` | 0 |
| `no_dram_spill` | 1 |
| `no_swap` | 2 |
| `no_disk` | 3 |
| `unrestricted` | 4 |

For canonical tiers the result is exactly `rank(tier) <= rank(floor)`. Although
TypeScript declares both parameters as `ResidencyTier`, emitted JavaScript can
still receive hostile Strings. Its missing record lookups make every comparison
with an unknown tier evaluate to `false`. The Fungi boundary preserves that
observable behavior explicitly: any unknown, empty, case-altered, whitespace,
NUL-containing, prototype-like or Unicode String returns `false`.

The rank helper contains exactly five non-wildcard String match arms, which is
the selected SLIDE bounded-wide-control-flow ceiling. Its terminal `_ =>` arm
returns only the sentinel, and the public flow rejects that sentinel before any
comparison. The module contains no null, NaN, `else if`, `else`,
exceptions, host APIs or loop forms. It is pure and releases no authority.

## Decision and effect ledger

| Source | Decision or operation | Proven subject | Fungi construct | Effects | Failure exit |
|---|---|---|---|---|---|
| `hardening-residency.ts:156-162` | map either input to a rank | closed `ResidencyTier` / boundary `String` | exhaustive `match` | none | wildcard returns sentinel `5` |
| `hardening-residency.ts:175-176` | reject either invalid rank | combined `Bool` | one `if` with `or` | none | returns `false` |
| `hardening-residency.ts:175-176` | compare proven ranks | finite `Int` values `0..4` | Boolean `if` using `<=` | none | returns exact `Bool` |

No typed failure is erased: the TypeScript function returns only `boolean`, and
all values outside its declared closed domain already produce `false` at the
JavaScript runtime seam. The conditional helper is required because the
selected independent SLIDE pure-scalar profile admits `<=` as an `if` condition
but refuses it as a directly returned expression; the Galerina frontend accepts
both forms. A separate membership helper was rejected after a physical RED
probe because calling its five-arm String match for both inputs exceeded the
bounded transitive/control profile. The sentinel design performs the same exact
membership classification once per input through the rank helper and uses one
combined invalid guard, which the independent profile admits.

## Verification

1. RED requires the governed package asset before it exists.
2. Differential vectors compare literal expectations, exported TypeScript and
   the typed Fungi interpreter across the complete 25-pair canonical matrix and
   hostile values in either position.
3. Strict type/governance checking must return zero errors and zero warnings.
4. Independent SLIDE compilation, physical publication, VOK re-admission and
   typed Bool receipt verification must execute with zero skips. Wrong
   arity/type, invalid Unicode, inadequate step fuel and mutated bytes must
   refuse. This registry reports zero separately-metered text-comparison work;
   no unproved text-work refusal is claimed.
5. Full compiler and canonical package owners update their exact counts, while
   crash-linked full tooling, normal phase-close and whole-memory evaluation
   remain excluded and repository-wide closure remains `UNKNOWN`.

## Alternatives rejected

- A nested-match matrix avoids rank arithmetic but duplicates the lattice in
  several helpers and increases review and mutation risk.
- An enum-typed public input would make invalid values unrepresentable in the
  language, but the selected independent SLIDE String ABI has not proved enum
  parameter marshalling or physical execution.
- Converting `stricterResidency` in the same slice would add a String-returning
  choice with different hostile-runtime behavior. It remains a separate row so
  this security predicate stays one independently reviewable decision.
