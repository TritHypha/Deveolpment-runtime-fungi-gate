# Slice 90 `vNot` Fungi Conversion Design

## Decision

Attempt one symbol-scoped, reference-only conversion of
`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vNot`.
The candidate is retained only if the closed TypeScript K3 oracle, checked
Fungi, GIR, physical `.slide`, independent VOK re-admission and typed receipt
verification all agree for `DENY`, `INDETERMINATE` and `ALLOW`.

The TypeScript source, package export and callers remain active. This slice
adds evidence; it does not switch production authority or authorize source
retirement.

The source contract is the closed Kleene K3 negation table:

| Input | Output |
|---:|---:|
| `DENY (-1)` | `ALLOW (+1)` |
| `INDETERMINATE (0)` | `INDETERMINATE (0)` |
| `ALLOW (+1)` | `DENY (-1)` |

## Options considered

### 1. Typed `Verdict -> Verdict` exhaustive `check` - selected

Use one `pure flow` that accepts and returns `Verdict`. An exhaustive `check`
returns the opposite closed constructor for `deny` and `if`, while `ambig`
returns `Verdict.Unknown`. This preserves the branded K3 input and output and
maps directly to the independently proved SLIDE checked-Fungi shape.

### 2. Canonical `flip(candidateVerdict)` - deferred at the physical boundary

Galerina's language source of truth defines `flip(expr)` as the dedicated K3
negation operator, and it is the preferred compact surface once the physical
pipeline proves it. The pinned SLIDE checked-Fungi frontend does not currently
parse or lower `flip`. Using it in this slice would therefore produce a known
physical refusal. The selected exhaustive `check` is the exact closed
desugaring, preserves typed `Verdict` at both boundaries and does not widen
SLIDE. This slice must not claim that direct `flip` is physically supported.

### 3. `Int -> Int` arithmetic bridge - rejected

Encoding the decision as an integer would reproduce the three numbers but
discard the `Verdict` contract and permit non-K3 integers at the interface.
It would be representation laundering, not a faithful conversion.

### 4. Host-side tag conversion - rejected

Mapping a host integer or Boolean to a precomputed result before invoking
Fungi would leave the decision in the host code and could not prove that the
Fungi/SLIDE path performs K3 negation.

## Candidate and custody

The candidate path is
`packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-not.fungi`.
The package-owned differential proof belongs at
`packages-galerina/galerina-tower-citizen/tests/verdict-not-fungi-conversion.test.mjs`.
The independent physical proof belongs at
`scripts/tests/tower-citizen-vnot-fungi-slide.integration.test.mjs`.

The package already owns other governed Fungi assets but has no Fungi
replacement for `vNot`. The retirement ledger currently records the owning
TypeScript file as `replacement-absent`, with no execution authority and no
declared bootstrap floor. The new asset is reference-only and must be declared
in `packageGraph.loadedAssets`; it must not change exports or runtime entrypoints.

## Control, failure and threadability

The source starts with `@version 1`, declares one `pure flow`, uses exhaustive
`check`, and has an explicit return in every K3 arm. It uses no `null`, `NaN`,
`else if`, exception syntax, `for`, `loop`, or host projection.

`vNot` delegates to `negTrit` and then `asVerdict`. For a typed `Verdict` input,
the three admitted source values form a closed domain and `negTrit` produces
only another admitted trit. The source helper's invalid-value trap is therefore
unreachable for the declared domain; hostile non-K3 physical inputs must still
be refused before execution.

Threadability is `PARALLEL_PURE`: the selected symbol reads one immutable
value, mutates no state, performs no I/O, acquires no lease and releases no
authority. This classification applies only to `vNot`, not the whole package.

## Verification

The proof must establish:

1. the existing independent TypeScript `K3_NOT` oracle remains 3/3;
2. the candidate is absent during RED, then strict parsing, type/effect checking
   and interpreter execution agree for all three values;
3. the exact pinned SLIDE build compiles a typed parameter type ID `3` and
   result type ID `3`, publishes one physical `.slide`, independently re-admits
   it through VOK and returns the exact three outputs with no fallback;
4. absent, surplus, wrong-type and non-K3 arguments refuse; exhausted execution,
   mutated source, artifact and typed receipts also refuse;
5. the complete Tower-Citizen package suite remains green.

Checker-only, interpreter-only, signed-Wasm-only or host-projected evidence is
insufficient. A physical refusal closes the slice as `BLOCKED`; it is not
permission to widen a compiler profile or weaken typed admission.

## Slice close

Close the slice with one governed receipt. Review both private Fungi skills and
record either the exact private-skill commit or `NO_SKILL_UPDATE`. Update the
conversion register, TODO, status report and active roadmap, then run only
bounded registered owners. Repository-wide closure remains `UNKNOWN` until the
crash-linked monolithic lane has a chunked resumable replacement.
