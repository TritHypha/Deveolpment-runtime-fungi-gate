# Galerina #72 — signed central registry index

This issue-specific page is retained as a stable historical link. The current
operator procedure is:

[`OFFLINE-KEY-SIGNING-WALKTHROUGH.md`](./OFFLINE-KEY-SIGNING-WALKTHROUGH.md)

## Current state — 2026-07-29

| Surface | State |
|---|---|
| Index builder | emits `galerina-registry-index/v2` |
| New-production signature | Ed25519 + ML-DSA-65, both mandatory |
| Domain separation | `galerina.registry.index.sig.v2` |
| Historical v1 | verify-only; no builder default or silent downgrade |
| Signer CLI | built; self-verifies both components before writing |
| Disposable ceremony | green |
| Revocation handling | signed revocation registry validated before key use |
| Live registry | two unreviewed, unsigned, content-less stubs |
| Operational registry authority | not declared or root-delegated |
| Owner signing | **NOT READY** |

The former Ed25519-only design warning is resolved in code. The original two
structural blockers remain:

1. there are no real package bytes behind the two registry stubs, so there is
   nothing honest to hash, review, certify, or sign;
2. the zero-trust design calls for a separate operational registry key, but
   the repository has no root-authorized delegation format or verifier for it.

The cold root must not become a routine registry signer just because the
operational delegation mechanism is absent.

The fail-closed CLI deliberately refuses:

- an empty registry;
- one bad entry in an otherwise good tree;
- `sha256:pending`;
- missing/placeholder package signatures;
- unreviewed manifests;
- missing either index-signature component;
- tampered content or signatures;
- v2 algorithm downgrade;
- unknown or revoked authority keys;
- stale/rollback `issuedAt` values.

Do not sign the current stubs. A valid signature over false or unreviewable
claims is worse than an absent index because it converts “unknown” into an
authority assertion.
