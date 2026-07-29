# SLIDE V2-B lease and verifier-receipt shape gate

**Date:** 2026-07-29

This checkpoint adds a non-authorizing `.fungi` lease boundary for the first
V2-B database capability request. It validates a candidate lease together with
a typed cryptographic-verifier receipt. It does not verify a signature,
consume a nonce, compose admission evidence, construct a broker handle, or
dispatch a host operation.

The lease binds:

- artifact semantic digest and admitted bundle identity;
- exact request, capability class, effect, and resource descriptor;
- subject and tenant;
- issue, not-before, expiry, and validation times;
- nonce and call/request/response ceilings;
- Tower and Tri-Pipe receipt digests;
- issuer role, signature suite, and canonical signed-bytes digest.

The verifier receipt binds its schema, verifier and key identities, signature
suite, signer role, signed-bytes digest, signature digest, verification time,
evidence digest, and an exhaustive K3 `Verdict`. A Boolean
`signatureValid` fact is neither defined nor accepted. `DENY` and
`INDETERMINATE` are distinct terminal refusals.

Successful shape validation returns `LEASE_SHAPE_VALIDATED` with
`authorityReleased: false`. Eleven hostile mutation classes cover absent
identity, malformed digests, request drift, expiry, widened ceilings, issuer
drift, absent verifier identity, signed-byte mismatch, malformed evidence,
cryptographic denial, and cryptographic ambiguity. Every refusal keeps
`authorityReleased: false`.

Focused evidence is 19/19 tests: the original seven capability-request cases
plus twelve lease cases. The implementation is:

- `slide-v2b-capability-request.fungi`;
- `slide-v2b-lease-shape.fungi`; and
- `tests/slide-v2b-capability-request.test.mjs`.

This changes no Galerina production execution path. The next gates are
canonical lease signing bytes, a real independently owned cryptographic
verifier adapter, nonce/replay state, and K3 composition. No broker dispatch
may exist until those gates pass.

Verification evidence:

- local implementation commit: `27f16d08` (not pushed);
- compiler package: 5,344/5,344 tests;
- repository: 94/94 packages and 8,086/8,086 tests;
- project graph: 7,249 nodes / 7,507 edges, zero integrity violations;
- KB graph: zero orphans and zero broken links;
- Hardened Border: 97/97;
- explicitly selected Galerina memory graph: clean; and
- dev-tool index: 97 packages / 124 tools / 40 proofs; and
- post-commit Myco: 4,098 indexed files, zero over-size skips.
