# Decimal round-mode Fungi conversion design

## Decision

Express the exported TypeScript `isRoundMode` predicate as a package-owned pure
Fungi module whose public flow is named `isRoundModeFungi`. Two private-by-use
pure flows partition the seven exact spellings into bounded groups of four and
three. The public flow returns true if group one admits; otherwise it returns
group two's exact result. Every group has a mandatory terminal wildcard that
returns `false`.

This is a reference-only conversion slice. TypeScript and every caller remain
active until consumer-switch, bootstrap-fixpoint and retirement gates are
independently proved.

## Security boundary

`RoundMode` is the caller's explicit rounding obligation for decimal division.
The Fungi flow must therefore preserve exact membership and must not trim,
case-fold, normalize, infer, alias or default a policy. An empty, malformed,
non-canonical or unknown String returns `false`; malformed ABI values refuse
before execution. No value is silently converted to `halfEven` or any other
mode.

The split is required by SLIDE's fail-closed bounded-wide-control-flow registry,
which admits at most five non-wildcard String branches in one flow. The module
contains no null, NaN, `else if`, `else`, exceptions, host APIs, or loop forms.
It is pure and releases no authority.

## Exact mapping

| Input | Result |
|---|---:|
| `halfEven` | `true` |
| `halfUp` | `true` |
| `halfDown` | `true` |
| `up` | `true` |
| `down` | `true` |
| `ceiling` | `true` |
| `floor` | `true` |
| every other exact String | `false` |

## Verification

1. RED requires the governed package asset before it exists.
2. Differential vectors compare literal expectations, exported TypeScript and
   the typed Fungi interpreter, including whitespace, case, prototype-like,
   NUL-containing and Unicode values.
3. Strict type/governance checking must return zero diagnostics.
4. Independent SLIDE compilation, physical publication, VOK re-admission and
   typed Bool receipt verification must execute with zero skips. Wrong
   arity/type, invalid Unicode, inadequate work and mutated bytes must refuse.
5. Full compiler and canonical package owners update their exact counts, while
   crash-linked full tooling, normal phase-close and whole-memory evaluation
   remain excluded and repository-wide closure remains `UNKNOWN`.

## Alternatives rejected

- Reuse a host `Set`: this leaves the decision in TypeScript/JavaScript.
- Normalize input before matching: this widens the accepted policy language.
- Return a selected/default mode: this manufactures a rounding decision the
  caller did not explicitly provide.
- Convert `parseTensorType` first: that larger parser requires several String
  and numeric semantics and is a poorer next bounded physical slice.
