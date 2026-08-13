# Slices 103-112 arithmetic-Trit design

## Decision

The next ten `tpl-simulator.ts` primitives cannot be translated through the
current physical checked-Fungi profile without deleting either their source
numeric domain or the nominal arithmetic-Trit authority boundary.

| Slice | Symbol | Classification |
|---:|---|---|
| 103 | `asTrit` | `BLOCKED_BY_ARITH_TRIT_BRAND_BINARY64_ABI` |
| 104 | `negTrit` | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |
| 105 | `negT` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 106 | `sumTrit` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 107 | `xorTrit` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 108 | `carryTrit` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 109 | `addTrit` | `BLOCKED_BY_ARITH_TRIT_RECORD_ABI` |
| 110 | `mulTrit` | `BLOCKED_BY_ARITH_TRIT_BRAND_ABI` |
| 111 | `minTrit` | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |
| 112 | `maxTrit` | `BLOCKED_BY_BINARY64_TRIT_GUARD_ABI` |

No placeholder Fungi source is created.

## Brand boundary

Arithmetic `Trit` and governance `Verdict` share the values `-1/0/+1` but are
not interchangeable types. The Tower-Citizen compile-time gate prevents either
family entering the other. This is load-bearing: arithmetic
`sumTrit(Deny,Deny)` produces `+1`, while governance K3 composition may
authorize only a typed Allow. Representing arithmetic Trit as Verdict would
create an authority-laundering path.

The pinned SLIDE safe-value envelope has type identities for Int, Bool,
Verdict, String, Bytes, Array<Int> and record, but no arithmetic Trit. Its
checked-Fungi scalar frontend likewise exposes no distinct Trit Brand/Hallmark
type. Using physical Int would erase the brand; using Verdict would assign the
wrong authority family. Both are refused.

## Numeric boundary

`asTrit`, `negTrit`, `minTrit` and `maxTrit` accept JavaScript `number` and run
the source trit validator. A physical signed-i32 parameter rejects fractions,
non-finite numbers, signed zero and wider binary64 inputs before the source
operation. Boundary refusal is not the same observable failure contract as the
source validator.

The branded faces `negT`, `sumTrit`, `xorTrit`, `carryTrit` and `mulTrit`
require a distinct arithmetic Trit parameter/result identity. `addTrit`
additionally returns an exact two-field record whose fields remain arithmetic
Trit, not governance Verdict or unbranded Int.

## Reopen exit

Reopen only after SLIDE/VOK admits a distinct arithmetic-Trit type identity
through source parsing, GIR, physical parameters/results, safe-value envelopes
and receipt verification. Raw-number helpers additionally require an exact
source-domain admission/failure contract. `addTrit` requires a record whose two
fields retain that same brand. Every reopened symbol still needs complete
truth tables, hostile inputs, mutation/work refusal and independent VOK proof.

All ten scopes are `PARALLEL_PURE`. Repository-wide closure and the final
codebase-memory build point remain `UNKNOWN`.

## Skill finding

This group exposed a reusable guidance gap. The private skills now explicitly
forbid equating arithmetic Trit and governance Verdict because their bytes
match. The verified private commits are `1d22556` for `writing-fungi` and
`4079723` for `translating-typescript-to-fungi`; both remain private and
unpushed.
