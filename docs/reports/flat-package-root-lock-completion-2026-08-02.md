# Flat package root-lock implementation report

Date: 2026-08-02  
Assurance: reference-only, non-authorizing

## Outcome

Galerina now has one deterministic lock and exact resolver for every direct
package peer under `packages-galerina/`. This closes the missing tooling
implementation without changing, moving or translating package source.

The current lock independently derives:

- 98 direct package identities;
- 45 exact first-party dependency edges;
- one complete dependency-first topological order;
- 138 external bootstrap edges;
- two development-only version-drift records; and
- one domain-separated root digest over every exact package record.

The lock explicitly says `authorityReleased: false`. It does not hide or
authorize the 95 package-local `node_modules` trees, the one nested package, or
any package conversion.

## Security boundary

Repository intake admits only Git-tracked regular files below one canonical
direct package directory. It performs bounded double reads, stable metadata
and real-path checks, fatal UTF-8 decoding and decoded duplicate-JSON-key
refusal. Case-fold collisions, symlinks, path escapes, unstable files, missing
manifests and malformed dependency maps refuse.

First-party dependencies must use the exact `file:../<direct-peer>` target.
Missing identities, duplicate identities/directories/dependencies, cycles and
conflicting external runtime versions refuse. Development-only version drift
is retained as explicit bootstrap debt.

The resolver accepts only an opaque process-local handle created by re-deriving
and exactly verifying the lock. It resolves only a dependency declared by the
named caller. It never searches a parent, child, network registry, cache or
`node_modules` tree.

## Fresh evidence

| Evidence | Result |
|---|---:|
| Pure hostile/determinism tests | 6/6 pass |
| Live repository-accounting test | 1/1 pass |
| Root-lock check | 98 packages, 45 internal edges, root verified |
| Governed generator contracts | 15/15 pass |

The generator contract proves declared writes only, deterministic repeated
generation and a non-mutating check mode.

## Remaining debt

Green applies to the root-lock generator/verifier/resolver control. Physical
dependency retirement remains blue: 138 bootstrap declarations, 95 local
dependency trees and one nested native package remain. Production package ABI,
capability, compiler, signature, SLIDE execution and platform receipts must be
authenticated before the reference lock can become release authority.
