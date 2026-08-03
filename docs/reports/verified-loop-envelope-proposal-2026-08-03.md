# Verified Loop Envelope proposal report

Date: 2026-08-03

## Outcome

Galerina now recognizes one exact pointer-free, one-million-read loop and
derives a non-authorizing Verified Loop Envelope proposal. This is the first
compiler-side implementation of the design recorded in RD-0681. It does not
emit unchecked machine code, remove a bounds check, mint a VOK lease or claim
performance improvement.

The developer-facing source remains ordinary memory-managed `.fungi`. The
developer never supplies a pointer, raw address, proof Boolean, lease or native
object identity.

The developer may add one flow-local, target-scoped contract opt-in:

```fungi
permissions {
  require verified_native_checked_read_loop_v1 on values
}
```

This permits the compiler to attempt proof-backed lowering; it does not bypass
a check. When the permission or an exact empty-effect profile is absent, the
normal checked source remains valid and runs with its checks. The proposal
reports the canonical block as a developer suggestion but cannot insert
authority or self-admit. The scope is the named `values` parameter in the same
flow only.

## Implemented boundary

The first profile accepts exactly one secure flow with:

- one `Array<Int>` input and a `Result<Int,String>` result;
- an exact `values.count() != 1000000` rejecting gate;
- induction and result variables initialized to zero;
- one `while i < 1000000` loop;
- one checked `values.get(i)` operation;
- an exhaustive `Option<Int>` match with terminal refusal arms;
- one exact `i = i + 1` induction step;
- no collection write, surplus loop, extra call or alternate terminal result.

The v2 proposal also binds a compiler-derived induction certificate:

- checked-integer arithmetic model;
- `i(0) = 0`, step `1` and invariant `i(k) = k`;
- exclusive bound and maximum access index;
- overflow exclusion through terminal `i = 1000000`;
- exact trip count; and
- domination of the read by the cardinality and loop guards.

Any structural drift produces K3 deny. The exact shape produces K3 unknown
with `INDEPENDENT_VERIFIER_UNAVAILABLE`. The TypeScript analyzer and its
independently executable `.fungi` fact model therefore cannot release native
authority.

## Verification

- 27 analyzer tests cover the exact proposal, permission grammar and scope,
  induction certificate and adversarial structural drift.
- The `.fungi` model passes production parse, type, value-state, effect and
  governance gates.
- All 8,192 combinations of thirteen Boolean facts execute through the interpreter;
  none returns K3 allow.
- The checked example passes all production source gates and derives only the
  exact K3-unknown proposal.
- The focused combined corpus, including the generated Hallmark registry,
  passes 32/32 with Node count unchanged.
- The complete compiler package passes 5,823/5,823; graph generation/check is
  5/5, the flat root lock re-verifies all 98 peers, and Node remains 1 -> 1.

## Still required before optimized execution

1. SLIDE must independently re-derive the complete loop facts from canonical
   source/GIR/object evidence rather than accept compiler claims.
2. VOK must bind the exact object, collection generation, target, policy and
   verifier identities to one affine lease.
3. The checked semantic peer and optimized object must have hostile parity,
   lifecycle, cleanup and platform evidence.
4. Benchmarks must measure total proof, preparation and demand cost. A speed
   claim requires measured break-even, not an assumed reduction in checks.
5. Every K3 unknown or deny must select only a separately admitted checked peer
   or terminate with `_=>`; it may not silently fall back.

The current implementation is therefore green as a bounded proposal control
and blue as an executable optimization.

## Independent SLIDE follow-up

SLIDE commit `b7d1705` now independently re-parses the exact source, owns and
digests a fixed million-value generation, binds source and collection into VOK,
executes one affine lease and zeroes the owned generation. Complete serial
SLIDE is 476/476, contracts are 29/29 and security closure retains authenticated
evidence K3 `0`.

This closes items 1 and 2 above for the bounded reference profile only. The
Galerina production switch, general loop-to-GIR/serialized `.slide` lowering,
native/platform evidence remain open. The compiler proposal itself remains
non-authorizing.

The first paired component benchmark is also complete. Median checked demand
was 1.700 ms, direct control 0.517 ms, VLE preparation 8.878 ms, VLE demand
1.713 ms and VLE total 10.640 ms. Demand is 1.008x and total 6.259x the checked
peer, so the current speed hypothesis fails. The direct lane identifies
headroom but omits VOK, receipt and cleanup. Evidence remains K3 `0`; no speed
or production claim follows. The detailed maths and break-even ruling are in
KB RD-0682.
