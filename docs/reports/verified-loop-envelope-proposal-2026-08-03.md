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

Any structural drift produces K3 deny. The exact shape produces K3 unknown
with `INDEPENDENT_VERIFIER_UNAVAILABLE`. The TypeScript analyzer and its
independently executable `.fungi` fact model therefore cannot release native
authority.

## Verification

- 23 analyzer tests cover the exact proposal and adversarial structural drift.
- The `.fungi` model passes production parse, type, value-state, effect and
  governance gates.
- All 256 combinations of eight Boolean facts execute through the interpreter;
  none returns K3 allow.
- The checked example passes all production source gates and derives only the
  exact K3-unknown proposal.
- The focused combined corpus passes 27/27 with Node count unchanged.
- The complete compiler package passes 5,818/5,818; graph generation/check is
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
SLIDE is 472/472, contracts are 29/29 and security closure retains authenticated
evidence K3 `0`.

This closes items 1 and 2 above for the bounded reference profile only. The
Galerina production switch, general loop-to-GIR/serialized `.slide` lowering,
native/platform evidence and total-cost measurement remain open. The compiler
proposal itself remains non-authorizing.
