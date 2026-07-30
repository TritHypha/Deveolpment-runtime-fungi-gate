# Galerina #72 — signed central registry index

This issue-specific page is retained as a stable historical link. The current
owner action is:

[`OFFLINE-KEY-SIGNING-WALKTHROUGH.md`](./OFFLINE-KEY-SIGNING-WALKTHROUGH.md)

Later ceremony commands are non-authorizing reference material in
[`OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`](./OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md).

## Current state — 2026-07-30

| Surface | State |
|---|---|
| Index builder | emits `galerina-registry-index/v2` |
| New-production signature | Ed25519 + ML-DSA-65, both mandatory |
| Package artifact identity | deterministic bounded flat-package tree |
| Package manifest | strict parser plus complete hybrid verification |
| Root delegation | role/time/revocation/fingerprint/rollback verified |
| Historical v1 | verify-only; no builder default or silent downgrade |
| Signer CLI | re-hashes and verifies authority before reading private material |
| Disposable ceremony | green |
| Revocation handling | signed revocation registry validated before key use |
| Live registry | empty; empty index refuses |
| Auth candidate | 18-file digest re-derived; unapproved and unsigned |
| Healthcare claim | removed because no canonical package exists |
| Operational registry authority | real public bundle/delegation absent |
| Owner signing | **NOT READY** |

The earlier structural blockers have been corrected in engineering:

1. the false content-less stubs are no longer live;
2. real auth source/test bytes have a deterministic candidate identity;
3. root-to-operational delegation and public-key fingerprint verification are
   implemented; and
4. a non-empty signature can no longer substitute for cryptographic proof.

The remaining blockers are owner authority and custody facts:

- confirm the auth candidate's declared powers, risk and certification;
- use a valid separately custodied operational hybrid key;
- maintain two verified encrypted offline copies in separate physical
  locations;
- root-sign and independently verify its time-bounded delegation;
- complete and hybrid-sign the auth manifest;
- move only that verified manifest into the live tree;
- produce a clean unsigned live index; and
- run the offline index signing and independent public verification acts.

The fail-closed CLI refuses:

- an empty registry;
- one bad entry in an otherwise good tree;
- an unknown/duplicate/ambiguous manifest fact;
- a missing, non-canonical, traversing, symlinked or oversized artifact;
- a content-hash mismatch;
- missing/fake/partial package signatures;
- substituted public keys or a tampered delegation;
- missing roles, inactive windows, stale serials and revoked authorities;
- missing either index-signature component;
- v2 algorithm downgrade; and
- stale/rollback `issuedAt` values.

Do not sign the candidate until the complete owner review and delegation
preflight is green. A valid signature over an unapproved claim is worse than
an absent index because it converts unknown into an authority assertion.
