# SLIDE V2-B canonical lease and hybrid verifier checkpoint

**Date:** 2026-07-29

This checkpoint closes two prerequisites without granting execution authority:

1. `.fungi` derives the canonical V2-B lease signing body and its
   domain-separated SHA-256 digest; and
2. a minimal Galerina host-crypto reference verifies the registered hybrid
   Ed25519 + ML-DSA-65 signature suite and returns a typed K3 receipt.

## Canonical signing evidence

`slide-v2b-lease-canonical.fungi` validates the unsigned request-bound lease,
then encodes a deterministic-CBOR array containing the schema plus all twenty
signed fields. `signedBytesDigest` is deliberately excluded from its own
preimage. The fixture is:

- schema: `slide.capability.lease.v2b`;
- domain: `slide.capability.lease-signing.v2b`;
- canonical body: 463 bytes; and
- signing digest:
  `79bb25fab044097d0c014c92d55f7e26768922493d6793aef0173cc3c567ed4a`.

The digest is independently re-derived in the JavaScript test. Changing a
signed field changes the digest; changing only the digest field does not alter
the preimage. The full `.fungi` lease gate now independently re-derives and
compares the digest before accepting the verifier-receipt shape.

## Hybrid verifier

`slide-v2b-crypto-verifier.ts` is a deliberately narrow Galerina reference
host primitive, not the independent SLIDE production verifier. It exists
because the current `.fungi` runtime has byte hashing but no Ed25519 or
ML-DSA-65 verification intrinsic. Canonicalization, request/lease policy,
chronology, ceilings, K3 handling, and authority remain in `.fungi`.

The shim:

- accepts exact canonical bytes and bindings, never a Boolean validity claim;
- performs no file/key discovery and owns no ambient key store;
- verifies Ed25519 and ML-DSA-65 over the same domain-separated bytes;
- requires both halves, with no classical downgrade;
- binds ML-DSA to the `slide.capability.lease.v2b` protocol context;
- checks exact suite, role, key identity, digest, key revocation, key/signature
  sizes, and body ceiling;
- returns `ALLOW`, `DENY`, or `INDETERMINATE` in a typed receipt; and
- uses length-framed receipt/evidence hashing to avoid concatenation
  ambiguity.

Missing public-key evidence produces `INDETERMINATE`; the `.fungi` consumer
turns that into terminal refusal. Tampered bytes, either bad signature half,
classical-only downgrade, wrong role/key, revoked key, and cross-protocol
ML-DSA context all deny.

## Honest boundary

Focused evidence is 35/35. This checkpoint replaces no Galerina component and
does not create a lease reference, nonce state, broker opcode, host handle, or
dispatch authority. The TypeScript verifier is a development/reference
bootstrap boundary. The independent SLIDE implementation must supply the same
public receipt contract through a pinned audited crypto primitive before any
production cut.

Next: implement atomic nonce/call-budget state and all-evidence K3 composition.
Only after those gates pass may an isolated broker lease reference be
considered.

Verification evidence:

- compiler package: 5,360/5,360 tests;
- repository: 94/94 packages and 8,102/8,102 tests;
- project graph: 7,264 nodes / 7,521 edges, zero integrity violations;
- KB graph: zero orphans and zero broken links;
- Hardened Border: 97/97;
- explicitly selected Galerina memory graph: clean; and
- dev-tool index: 97 packages / 124 tools / 40 proofs.
