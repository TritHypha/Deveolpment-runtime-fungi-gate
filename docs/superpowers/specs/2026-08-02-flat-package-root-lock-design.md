# Flat package root-lock design

## Outcome

Build one repository-owned reference lock and resolver for the direct children
of `packages-galerina/`. It records every Galerina package once, resolves every
internal dependency to that one peer, emits one deterministic topological
order and makes all remaining third-party bootstrap dependencies visible.

This closes the missing tooling implementation. It does not remove the 95
`node_modules` trees or the one nested package and therefore does not authorize
terminal retirement.

## Inputs

- exact Git-tracked files under each direct package directory;
- one direct `package.json` and optional same-owner `package.fungi.json`;
- exact package identity/version;
- `dependencies`, `optionalDependencies` and `peerDependencies` edges;
- development-only dependencies as separately labelled bootstrap evidence.

Manifest files are bounded canonical UTF-8 inputs. Duplicate decoded JSON keys,
malformed records, symlinks, unstable reads and paths outside the direct peer
directory refuse.

## Reference lock

The non-authorizing version-1 lock contains:

- schema and explicit reference-only assurance;
- one package row per direct identity;
- directory, version, manifest identities and complete tracked-content digest;
- exact internal dependency edges and their declared scope/specifier;
- externally supplied bootstrap edges, never resolved as native peers;
- one deterministic lexicographically tie-broken topological order;
- one domain-separated root digest; and
- `authorityReleased: false`.

Internal dependency specifiers must name the canonical peer exactly through
`file:../<direct-directory>`. Missing, duplicate, shadowed, cyclic or alternate
runtime versions refuse. Development-only version drift remains visible as
non-production bootstrap debt rather than being confused with runtime
authority. The resolver takes the verified lock plus caller and requested
identity and returns only the exact locked peer row; it never searches a parent,
child, `node_modules`, network registry or cache.

## Scope boundary

This reference lock intentionally reports ABI, signature, capability,
compiler, SLIDE and production-receipt admission as future authority fields.
Those cannot be inferred from current npm manifests. Green means the flat
graph generator/verifier/resolver works; physical dependency retirement stays
blue until external bootstrap edges and package-local trees reach zero and the
production fields are authenticated.

## Required tests

- deterministic order/root digest for reordered input;
- duplicate/missing/shadowed identity refusal;
- wrong `file:` target and path escape refusal;
- cycle refusal with no partial order;
- conflicting external runtime versions refuse; development-only drift is
  recorded exactly;
- changed package content changes package and root identities;
- copied, proxied or recomputed-root forged locks cannot become resolver
  authority;
- current repository lock verifies and exactly accounts for every direct
  package and visible bootstrap edge.
