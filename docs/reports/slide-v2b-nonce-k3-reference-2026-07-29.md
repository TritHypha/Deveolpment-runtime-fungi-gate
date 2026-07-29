# SLIDE V2-B nonce state and K3 reference checkpoint

**Date:** 2026-07-29

This checkpoint implements the first non-authorizing replay boundary and exact
Kleene K3 evidence composition. It deliberately separates a pure `.fungi`
transition proposal from the host operation that must commit it.

## `.fungi` state proposal

`slide-v2b-lease-use-state.fungi`:

- revalidates the request-bound lease and typed hybrid verifier receipt;
- binds lease ID, nonce, expiry, canonical state digest, generation, call
  budget, and request-byte budget;
- proposes exactly one generation/call transition;
- marks the one-call V2-B state terminal; and
- releases no prior/next digest or state on refusal.

The fixture state is a 135-byte deterministic-CBOR record. Its pinned values
are:

- nonce digest:
  `cf3ecc0f8b7b2c0a380d1aa0da7560ca143262acc6cb7c8f05709dd55b96f3ed`;
- initial state digest:
  `15e5b121b6a00d97f0dc1b99f86b7af7fc3e46c86c19369ff6f185212c15001b`.

Success is `RESERVATION_PROPOSED` with `authorityReleased: false`. A pure
proposal is not called an atomic commit.

## Reference compare-and-swap

`slide-v2b-atomic-state-reference.ts` is a bounded single-process Galerina
reference, not the production nonce store. It independently decodes
shortest-form deterministic CBOR for both seeded and next state, recomputes
the state digest, checks every lease/nonce/generation/call/request-byte/
expiry/status transition field, and performs one synchronous compare-and-swap.

Sixteen competing proposals against a one-call lease produce exactly one
`ALLOW` receipt and fifteen `DENY` receipts. Missing state is
`INDETERMINATE`. Wrong store/nonce/digest/generation/call, non-advancing
digest, tampered bytes, and surplus bytes deny without changing state. Every
receipt says `authorityReleased: false`.

This is concurrency and mutation evidence only. It does not prove
multi-process exclusion, crash consistency, durability, distributed
consensus, or trusted wall-clock time.

## K3 receipt composition

`slide-v2b-admission-composition.fungi` independently re-derives the reference
CAS receipt evidence digest, validates six exact non-authorizing evidence
shapes, and folds all seven Verdicts through the exhaustive Kleene K3 AND
truth table.

- any `DENY` produces terminal denial;
- otherwise any `INDETERMINATE` remains unresolved; and
- all `ALLOW` produces only `EVIDENCE_SHAPES_COMPOSED`.

Even the all-ALLOW result has `authorityReleased: false`. The six generic
receipts are shape fixtures, not authentic Tower, Tri-Pipe, artifact,
target/driver/isolation, or lease issuers. They exist to verify binding and K3
behavior without pretending those adapters are integrated.

Focused evidence is 62/62. This checkpoint replaces no Galerina production
component and creates no broker opcode, lease reference, host handle, network
or database call, audit-success claim, or fallback.

Next gates:

1. replace generic evidence fixtures with real versioned producer/verifier
   adapters;
2. implement an independent crash-consistent nonce store;
3. add broker protocol plus audit-before-success; and
4. begin the versioned V2 memory-object increment without widening frozen R1.

Verification evidence:

- local implementation commit: `ac2a7183` (not pushed);
- compiler package: 5,387/5,387 tests;
- repository: 94/94 packages and 8,129/8,129 tests;
- project graph: 7,291 nodes / 7,547 edges, zero integrity violations;
- KB graph: zero orphans and zero broken links;
- Hardened Border: 97/97;
- explicitly selected Galerina memory graph: clean; and
- dev-tool index: 97 packages / 124 tools / 40 proofs; and
- post-commit Myco: 4,105 indexed files, zero over-size skips.
