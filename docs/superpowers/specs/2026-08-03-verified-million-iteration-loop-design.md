# Verified Million-Iteration Loop Design

**Date:** 2026-08-03
**Status:** approved for test-first implementation under the owner's full-auto direction
**R&D:** `ZTF-Knowledge-Bases/RD-0681-verified-loop-envelope-one-million-index-operations.md`

## Goal

Show how Galerina can execute one million indexed reads without asking the
developer to manage pointers and without performing a governance decision for
every element. The operation must remain memory-managed, zero-trust and
fail-closed.

This chapter is about bounds-check elimination in one exact loop. It does not
claim that every loop becomes native or that a developer-written `unsafe`
marker is proof.

## Chosen source shape

The application writes an ordinary `while` over a flow-owned collection. It
does not write `unsafe while`, raw pointers, an unchecked access, a VOK lease or
a proof object.

The first worked example uses one million sequential reads because it is the
closest safe comparison with the supplied unchecked-indexing example. The
collection is assayed once for exact cardinality. That Hallmark is a typed
input fact, not authority.

## Considered approaches

| Approach | Benefit | Defect | Decision |
|---|---|---|---|
| developer writes `unsafe while` | small syntax and direct intent | converts a human promise into memory authority; conflicts with `unsafe let`; exposes an application escape hatch | reject |
| compiler alone removes checks | no developer pointer surface and low overhead | the optimizer authorizes its own transformation | reject for VOK/native admission |
| compiler derives an exact loop envelope; independent verifier re-derives it; VOK binds one lease | one admission cost, independent proof, no pointer surface, replay/stale closure | more build-time work and proof metadata | adopt |

## Verified Loop Envelope

The compiler may propose a `Verified Loop Envelope` only when it can derive all
of these facts from canonical source and GIR:

1. the collection generation and exact length are fixed for the operation;
2. the induction variable starts at zero;
3. the loop condition is the Boolean `i < bound`;
4. the bound is exactly `1_000_000` and equals the admitted collection length;
5. one `i = i + 1` update dominates every back edge;
6. no other write can modify `i`, the bound, collection length or backing
   generation;
7. the only indexed collection access uses `i` without an offset;
8. integer range analysis proves that initialization, comparison and increment
   cannot overflow under the target integer semantics;
9. the loop body has no effect, alias, call, early-exit, exception or concurrent
   mutation that invalidates the proof; and
10. the checked and proposed native implementations have the same typed result
    for the admitted input domain.

The independent verifier receives canonical GIR and final object facts. It
re-derives these facts rather than trusting a compiler Boolean or serialized
certificate. VOK then binds the proof result to the exact source, GIR, object,
target, policy and collection generation and opens one affine lease.

## Runtime path

```text
ordinary pointer-free .fungi while
  -> exact-cardinality assay
  -> canonical GIR
  -> compiler proposes Verified Loop Envelope
  -> independent verifier re-derives the envelope
  -> VOK opens one affine lease for the complete loop
  -> 1,000,000 proven indexed reads, no per-read governance decision
  -> result revalidation and value-only receipt
  -> lease and flow-local region close on every exit
```

The loop condition and arithmetic still execute unless later vectorization or
another independently verified transformation removes them. The avoided work
is the repeated collection bounds check and repeated governance admission, not
the physical memory access or all loop instructions.

## K3 admission

The first envelope adds a distinct loop gate to the eight Verified Native
Operation gates:

```text
V = min(p_source, p_transform, p_target, p_memory,
        p_effect, p_lifecycle, p_verifier, p_policy,
        p_loop)

execute_native only when V = +1
otherwise checked_peer or _=>
```

There are `3^9 = 19,683` possible gate vectors. Only the all-`+1` vector may
open the native lease, so the authorization density is
`1 / 19,683 = 0.00508053%`.

## Failure handling

- A proof result of `0` or `-1` never reaches the native operation.
- A separately verified checked implementation may run only when policy admits
  that exact fallback.
- If the profile requires the native operation or checked-peer equivalence is
  unknown, execution terminates with `_=>`.
- Proof, receipt and Hallmark records are not authority and cannot be replayed
  to mint a lease.
- Any post-proof change to the collection generation, GIR, object, target,
  policy or revocation epoch invalidates admission.

## Existing checker defect exposed by this design

The current strict-profile bounded-loop heuristic recognizes a comparison with
a numeric literal but does not prove the documented monotonic-update condition.
It is suitable only as an early diagnostic heuristic. It must not authorize the
Verified Loop Envelope or bounds-check elimination.

The implementation must introduce a separate exact analyzer and regression
tests. It must not silently strengthen the meaning of the existing heuristic
without preserving its diagnostic compatibility.

## Test obligations

- the exact one-million loop is recognized and receives a deterministic
  non-authorizing proposal;
- changed start, bound, step, comparison, index expression or second counter
  refuses;
- missing, duplicate, conditional or non-dominating increments refuse;
- mutation, alias, call, effect, early exit and integer-overflow uncertainty
  refuse;
- a forged Hallmark, compiler Boolean or copied receipt cannot admit;
- collection-generation and object mutation after proof refuse;
- checked and admitted executions agree on boundary and randomized values;
- the checked path remains available under explicitly admitted fallback
  policy; and
- paired measurements report proof/admission cost, checked cost, admitted cost
  and the break-even iteration count without claiming a speedup in advance.

## Non-goals

- no public pointer or manual-lifetime syntax;
- no `unsafe while` or developer-authored proof escape hatch;
- no generic loop vectorizer in this chapter;
- no parallel pointer sharing;
- no promise that one million operations are faster until measured; and
- no weakening of the always-on global compute, wall-clock or lifecycle gates.
