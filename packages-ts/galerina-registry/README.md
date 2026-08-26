# @galerina/registry — Certified Package Registry

The Galerina registry is the fail-closed source of governance-reviewed,
content-addressed and hybrid-signed package identities.

> **No admitted live package.** The `@galerina/auth` bytes changed during
> security hardening, so the prior signed manifest and signed index were
> removed from the live surface. The refreshed unsigned reviewed source record
> remains under `candidates/` pending a new offline hybrid-signing ceremony.
> No healthcare package exists, so no healthcare or compliance manifest is
> claimed.

## Admission contract

A live package is admitted only when all of these facts verify:

- one matching direct child of the top-level `packages-ts/` directory;
- a canonical, bounded `galerina-flat-package-tree/v1` file list;
- a freshly re-derived SHA-256 digest of those exact paths and bytes;
- an explicit reviewed governance record and no install script;
- a complete Ed25519 plus ML-DSA-65 package-manifest signature;
- an active, non-revoked, rollback-safe offline-root delegation with the
  `package-manifest.sign` role; and
- operational public-key bytes whose two fingerprints equal the delegation.

One invalid entry refuses the complete build. The builder never skips a bad
entry or emits a partial index.

## Structure

```text
packages/                         # empty until a newly signed manifest is admitted
candidates/
  @galerina/
    auth/
      package.galerina.yaml       # unsigned reviewed source/provenance record
```

The package bytes exist exactly once as direct children of
`packages-ts/`. The registry does not copy a package or create an
npm-style nested dependency forest. A prior immutable generation may remain
as historical signed evidence, but it is not a current live registry surface.

## Moving a candidate live

1. Re-run the package tests and all required package/security audits.
2. Re-derive the declared artifact digest from the canonical workspace.
3. Review the declared capabilities, effects, risk and certification facts.
4. Complete the offline operational-key delegation ceremony.
5. The owner records governance approval and hybrid-signs the complete
   package manifest.
6. Independently verify the artifact, delegation and both signatures.
7. Move the verified manifest into `packages/` and build the unsigned index.
8. The owner hybrid-signs the index offline; independently verify it before
   publication.

The completed owner ceremony record is documented in
[`docs/security/OFFLINE-KEY-SIGNING-WALKTHROUGH.md`](../../docs/security/OFFLINE-KEY-SIGNING-WALKTHROUGH.md).
Locked later commands are kept separately in
[`docs/security/OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md`](../../docs/security/OFFLINE-KEY-SIGNING-CEREMONY-REFERENCE.md).

## Diagnostic codes

| Code | Meaning |
|---|---|
| `FUNGI-PKG-001` | Package declares new capabilities outside its admitted contract |
| `FUNGI-PKG-002` | Registry or public authority is unregistered/unverified |
| `FUNGI-PKG-003` | Artifact has no valid re-derived content identity |
| `FUNGI-PKG-004` | Package declares an install script |
| `FUNGI-PKG-005` | Package has no valid complete hybrid signature |

## Current status

The artifact hasher, strict manifest reader, root delegation, manifest
verification, index builder/signer/verifier, revocation checks and denial tests
are implemented. The hardened auth package is candidate-only: its refreshed
artifact digest is unsigned, the live manifest is absent, and no signed index
is published. A new offline operational-key ceremony is required before it can
return to the live registry. Distribution and production authority remain
denied in the meantime.
