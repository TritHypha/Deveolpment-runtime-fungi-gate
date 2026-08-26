# Product-family package readiness independent review — HOLD

**Review state:** HOLD

**Severity:** Critical 0 / Important 1 / Minor 2

**Exact target:** `ad76fbee1aeecae5e1fcfbe053df6513ae402f88`

**Exact tree:** `92bd1ae5e5bcf54e735bf96a31cb239a3302d766`

**Exact base:** `c3360c143db4659ae18560322dc6b7a3cf3e122a`

**Reviewer task:** `product_family_readiness_immutable_review`

**Scope:** read-only review of the complete 17-file documentation range. No
compiler estate was run and no repository, graph, Git or native-source state
was changed.

## Important root

The generated product registry could not represent planned Trametes
deterministically. The design required a `policyDigest` on every generated
row, while the source row used an empty `policyPath` and the generator only
defined admitted-policy hashing.

Smallest required correction:

- distinguish closed source and generated schemas;
- for admitted products, hash exact policy bytes;
- for non-admitted states, hash a domain-separated unavailable-policy record;
- remove `policyPath` from generated rows;
- require `policyDigest` on every generated row;
- add a generate, load and `PRODUCT_NOT_ADMITTED` Trametes round trip.

## Minor roots

1. The design described a logical `packages-ts` alias phase that the plan did
   not implement. The correction is a single-root inventory and rollback phase,
   followed by one physical Git move without a compatibility alias.
2. The first Grok article omitted the inline primary-source links required by
   its own prompt. It must be locally marked `SELF_REJECTED`; only separately
   checked local source and primary sources may sustain its hypotheses.

## Evidence that passed

- Exact target, tree, base, merge-base, branch and clean status.
- Exact graph `Galerina-product-family-readiness-ad76fbe-full`: 65,196 nodes,
  166,527 edges and exact target HEAD.
- Documentation fixed point: 297 indexes and 1,999 documents.
- Prompt, response and receipt byte counts and SHA-256 bindings.
- Direct governance calls, unbound cache-key shapes, width-independent GIR hash
  and scalar-only launcher validation.
- No `.fungi`, `.gate`, native-package or code changes.

This receipt records a historical immutable HOLD. A later replacement requires
a fresh exact-head graph and independent review; it cannot overwrite this
verdict.
