# Slice 91 `effectiveVerdict` Fungi Conversion Design

## Decision

Attempt one symbol-scoped, reference-only conversion of
`packages-galerina/galerina-tower-citizen/src/substrate-model.ts#effectiveVerdict`.
The candidate is retained only if the existing TypeScript implementation,
strict checked Fungi, the Galerina interpreter, physical `.slide`, independent
VOK re-admission and typed receipt verification agree for the complete
`Verdict x Verdict` domain.

The TypeScript source, export and callers remain active. This slice adds one
bounded candidate and one evidence receipt; it does not switch authority,
retire source or authorize production use.

## Source dossier and closed oracle

The source signature is `effectiveVerdict(ideal: Verdict, reading: -1 | 0 | 1): Verdict`.
`Verdict` is exactly the closed union `-1 | 0 | 1`, so both operands have the
same three-value domain. The function delegates to `vAnd`, whose call chain is
`vAnd -> minTrit` plus `asVerdict -> assertTrit`. Its contract is Kleene K3
minimum: a substrate reading may confirm or degrade the ideal verdict but can
never upgrade it.

| Ideal | Reading | Effective verdict |
|---:|---:|---:|
| `DENY (-1)` | `DENY (-1)` | `DENY (-1)` |
| `DENY (-1)` | `UNKNOWN (0)` | `DENY (-1)` |
| `DENY (-1)` | `ALLOW (+1)` | `DENY (-1)` |
| `UNKNOWN (0)` | `DENY (-1)` | `DENY (-1)` |
| `UNKNOWN (0)` | `UNKNOWN (0)` | `UNKNOWN (0)` |
| `UNKNOWN (0)` | `ALLOW (+1)` | `UNKNOWN (0)` |
| `ALLOW (+1)` | `DENY (-1)` | `DENY (-1)` |
| `ALLOW (+1)` | `UNKNOWN (0)` | `UNKNOWN (0)` |
| `ALLOW (+1)` | `ALLOW (+1)` | `ALLOW (+1)` |

## Options considered

### 1. Nested typed `check` - selected

Use `pure flow effectiveVerdict(ideal: Verdict, reading: Verdict) -> Verdict`.
An outer exhaustive `check(ideal)` returns Deny immediately for `deny`, routes
the Unknown row through an exhaustive `check(reading)`, and returns `reading`
for the Allow row. This is the exact nine-row minimum table and keeps K3 type
authority at every boundary.

### 2. Nine explicit input pairs - rejected

A flat nine-row selector is longer, duplicates the closed lattice rule and
offers no stronger evidence. It also risks creating syntax not admitted by the
bounded physical profile.

### 3. Integer `vAnd` bridge - rejected

Using `Int` would accept values outside K3, erase the `Verdict` contract and
turn representation equality into false semantic authority.

### 4. Shared or host-side helper - rejected

No package-owned imported Fungi helper currently carries this exact typed and
physical proof. Precomputing the result in JavaScript would leave the decision
outside the Fungi/SLIDE path.

## Candidate and decision ledger

The candidate path is
`packages-galerina/galerina-tower-citizen/src/self-hosted/effective-verdict.fungi`.
The package proof belongs at
`packages-galerina/galerina-tower-citizen/tests/effective-verdict-fungi-conversion.test.mjs`.
The physical proof belongs at
`scripts/tests/tower-citizen-effective-verdict-fungi-slide.integration.test.mjs`.

| Source | Proven type | Terminal | Fungi construct | Effects | Exit | Evidence |
|---|---|---:|---|---|---|---|
| `vAnd(ideal, reading)` outer decision | `ideal: Verdict` | yes | exhaustive `check` | none | typed `Verdict` return in every arm | source declaration and K3 tests |
| Unknown-row refinement | `reading: Verdict` | yes | nested exhaustive `check` | none | typed `Verdict` return in every arm | closed nine-row oracle |
| Allow-row result | `reading: Verdict` | yes | direct typed return | none | `return reading` | structural alias `Verdict == -1 | 0 | 1` |

The direct and transitive effect set is empty, so the flow is `pure`. Unknown,
malformed, missing, surplus and non-K3 physical inputs refuse before execution.

## Control, failure and threadability

The source starts with `@version 1`, uses only exhaustive typed `check` and has
an explicit return from every route. It uses no `null`, `NaN`, `else if`,
`throw`, `try`, `catch`, `for`, `loop`, host call or mutable state.

Threadability is `PARALLEL_PURE`: the selected symbol consumes two immutable
values, performs no I/O, holds no affine lease and releases no authority. This
classification applies only to this symbol, not to the whole package.

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
SLIDE, substitute integers or accept interpreter-only evidence.

## Slice close

Close with one governed receipt and one end-of-slice review of both private
Fungi skills. Update the conversion register, TODO, status report and active
roadmap, then run only bounded registered owners. Repository-wide closure stays
`UNKNOWN` until the crash-linked monolithic lane has a chunked resumable
replacement.
