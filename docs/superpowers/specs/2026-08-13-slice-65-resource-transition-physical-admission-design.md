# Slice 65 resource-transition physical admission design

## Objective

Reopen the earlier Slice 45 physical refusal for `validateTransition` against
the reconciled independent SLIDE pin. Preserve the exact two-String, seven by
seven lifecycle matrix and add physical `.slide` publication plus independent
VOK re-admission without changing the TypeScript source or any consumer.

## Bound source and authority

- Source: `packages-galerina/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition`.
- Candidate: `packages-galerina/galerina-devtools-project-graph/src/self-hosted/resource-transition.fungi`.
- Retirement tranche: `T3-package-graph`, with no declared bootstrap floor.
- Existing proof: strict frontend, complete interpreted parity and signed-Wasm
  parity are already present; none is physical SLIDE/VOK authority.
- Threadability: `PARALLEL_PURE` for the immutable decision only. Graph
  mutation, state advancement, publication and admission remain ordered.

## Approaches considered

1. **Re-test the unchanged two-String asset through the current package
   compiler (selected).** The pinned scalar parser accepts bounded parameter
   lists and its external-signature gate now permits multiple non-record,
   non-`Option<Int>` parameters. This tests the exact source boundary.
2. **Pack the pair into one String.** Rejected because delimiter construction
   would move semantics into the host and create collision/encoding questions.
3. **Add a special SLIDE profile.** Rejected because the current registered
   profile must first prove or refuse the unchanged source; this slice has no
   authority to widen the runtime.

## Exact behavior

The Fungi flow accepts `from: String` and `to: String`. It returns `true` only
for the eleven transitions declared by the TypeScript `VALID_TRANSITIONS`
table and returns `false` for every other pair, including hostile surplus text.
It contains no null, NaN, `else if`, exception syntax, iteration, effects, host
API, authority grant, Hallmark, border or vault access.

Physical execution must require exactly two valid Strings. Missing, surplus,
non-String, invalid-text, exhausted-work and mutated-artifact inputs refuse.
Receipts are independently verified and remain reference-only with no released
authority.

## Proof contract

1. RED: change the focused Slice 45 test from compile refusal to a complete
   physical success requirement while leaving the source unchanged.
2. GREEN: if the current pin admits the exact asset, publish and re-admit it,
   prove all declared pairs plus hostile pairs, and retain input, exhaustion,
   receipt and artifact mutation refusals.
3. Run the existing package differential proof and exact strict check.
4. Keep TypeScript and every consumer active. This slice grants no retirement,
   signing, production, release or profile-widening authority.
5. Review both private Fungi skills at slice close and update them only if this
   produces a new reusable, evidence-backed rule.

## Failure policy

Any frontend, package, physical, re-admission, mutation or exhaustion failure
closes Slice 65 as blocked at that exact boundary. Do not narrow the pair
domain, precompute a result in the host or change SLIDE to manufacture a pass.

## Adjudicated outcome

`BLOCKED_BY_PHYSICAL_BLOCK_CEILING`.

The exact existing nested `if`/`match` form strict-checks and passes complete
package parity, but independent scalar compilation refuses with
`SLIDE-REF-LIMIT-002`. A shallow six-condition form also exceeds the block
ceiling after Boolean short-circuit lowering. An outer exhaustive `match` with
six nested `to` matches conserves the same refusal. After three bounded shapes,
the original authoritative asset and explicit physical refusal were restored.
The current pin admits the two-String signature; the blocker is the complete
decision graph, not parameter count. No SLIDE ceiling was changed.
