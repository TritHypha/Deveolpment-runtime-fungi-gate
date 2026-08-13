# Slice 92 `vOr` Fungi Conversion Design

## Decision

Attempt one symbol-scoped, reference-only conversion of
`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vOr`.
Retain the candidate only if the existing TypeScript implementation, strict
checked Fungi, the Galerina interpreter, physical `.slide`, independent VOK
re-admission and typed receipt verification agree for the complete
`Verdict x Verdict` domain.

The TypeScript source, export and callers remain active. This slice adds one
bounded candidate and one evidence receipt; it does not switch authority,
retire source or authorize production use.

## Source dossier and closed oracle

The source signature is `vOr(a: Verdict, b: Verdict): Verdict`. `Verdict` is
exactly the closed union `-1 | 0 | 1`. The source delegates to `maxTrit` and
then to the validating `asVerdict` mint. Its contract is Kleene K3 maximum:
the more permissive of two already typed Verdicts is returned.

| Left | Right | K3 maximum |
|---:|---:|---:|
| `DENY (-1)` | `DENY (-1)` | `DENY (-1)` |
| `DENY (-1)` | `UNKNOWN (0)` | `UNKNOWN (0)` |
| `DENY (-1)` | `ALLOW (+1)` | `ALLOW (+1)` |
| `UNKNOWN (0)` | `DENY (-1)` | `UNKNOWN (0)` |
| `UNKNOWN (0)` | `UNKNOWN (0)` | `UNKNOWN (0)` |
| `UNKNOWN (0)` | `ALLOW (+1)` | `ALLOW (+1)` |
| `ALLOW (+1)` | `DENY (-1)` | `ALLOW (+1)` |
| `ALLOW (+1)` | `UNKNOWN (0)` | `ALLOW (+1)` |
| `ALLOW (+1)` | `ALLOW (+1)` | `ALLOW (+1)` |

## Options considered

### 1. Nested typed `check` - selected

Use `pure flow vOrVerdict(left: Verdict, right: Verdict) -> Verdict`. An outer
exhaustive `check(left)` returns `right` for Deny, routes the Unknown row
through an exhaustive `check(right)`, and returns Allow for the Allow row.
This preserves the exact nine-row maximum table and typed Verdict authority at
every boundary.

### 2. De Morgan composition - rejected

Composing `flip(vAnd(flip(left), flip(right)))` is algebraically correct but
adds a helper call graph and direct `flip` dependency that the selected
physical profile has not proved. It supplies no stronger evidence than the
closed table.

### 3. Integer maximum bridge - rejected

Using `Int`, numeric comparison or a host-precomputed trit would accept or
project values outside K3, erase the `Verdict` contract and turn representation
equality into false semantic authority.

## Candidate and decision ledger

The candidate path is
`packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-or.fungi`.
The package proof belongs at
`packages-galerina/galerina-tower-citizen/tests/verdict-or-fungi-conversion.test.mjs`.
The physical proof belongs at
`scripts/tests/tower-citizen-vor-fungi-slide.integration.test.mjs`.

| Source | Proven type | Terminal | Fungi construct | Effects | Exit | Evidence |
|---|---|---:|---|---|---|---|
| `maxTrit(a, b)` outer decision | `left: Verdict` | yes | exhaustive `check` | none | typed Verdict return in every arm | source declaration and K3 tests |
| Unknown-row refinement | `right: Verdict` | yes | nested exhaustive `check` | none | typed Verdict return in every arm | closed nine-row oracle |
| Deny-row result | `right: Verdict` | yes | direct typed return | none | `return right` | structural alias `Verdict == -1 | 0 | 1` |

The direct and transitive effect set is empty, so the flow is `pure`. Missing,
surplus, wrong-type and non-K3 physical inputs refuse before execution.

## Control, failure and threadability

The source starts with `@version 1`, uses only exhaustive typed `check` and has
an explicit return from every route. It uses no `null`, `NaN`, `else if`,
`throw`, `try`, `catch`, `for`, `loop`, host call or mutable state.

Threadability is `PARALLEL_PURE`: the selected symbol consumes two immutable
typed Verdicts, performs no I/O, holds no affine lease and releases no
authority. This classification applies only to this symbol. Callers must still
apply their own trust-boundary collapse rules; K3 OR itself is not admission.

## Verification and authority boundary

The proof must establish:

1. a RED package test fails only because the asset and declaration are absent;
2. the existing TypeScript oracle and interpreted Fungi agree for all 9 rows;
3. strict type, effect and governance checks report zero errors and warnings;
4. pinned SLIDE compiles parameter type IDs `[3, 3]` and result type ID `3`,
   publishes one physical `.slide`, independently re-admits it and returns the
   exact 9 results with no fallback or authority release;
5. missing, surplus, wrong-type and non-K3 arguments, exhausted work, source,
   artifact, receipt and safe-value-envelope mutations all refuse; and
6. the complete Tower-Citizen package suite remains green.

Any valid-path physical refusal closes the slice as
`BLOCKED_BY_TYPED_TWO_VERDICT_PHYSICAL_PROFILE`. It is not permission to widen
SLIDE, substitute integers, compose an unproved helper graph or accept
interpreter-only evidence.

## Slice close

Close with one governed receipt and one end-of-slice review of both private
Fungi skills. Update the conversion register, TODO, status report and active
roadmap, then run only bounded registered owners. Repository-wide closure stays
`UNKNOWN` until the crash-linked monolithic lane has a chunked resumable
replacement.
