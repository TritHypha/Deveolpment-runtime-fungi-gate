# Slice 193 unregister health check Fungi conversion adjudication

## Outcome

`HealthRegistry.unregister` is
`BLOCKED_BY_DUAL_MUTABLE_MAP_DELETE_AND_THIS_IDENTITY_ABI`. No placeholder
Fungi asset is created. The method removes the same arbitrary String key from
both independent private maps, preserves absent-key behavior and returns the
identical mutable registry object for chaining.

## Bound source dossier

- Source: `packages-galerina/galerina-observability/src/health.ts:104-109`
- Source SHA-256: `8EDCB6B5AC3E9110AAA7DA4AFAC0F96B809562E79F2CB823A3B85F81489079ED`
- Repository build point: `b06a727934c95469fcf28a34222fd1a6cdaa1c13`
- Runtime/toolchain: Node `v24.18.0`, npm `12.0.2`, TypeScript package build
- Consumers: the package health test invokes the method; the registry remains
  public through the package barrel and the assembled observability surface.
- Existing Fungi: static health-route examples return constant status or route
  codes. They own no registry object and do not supersede this method.

## Decision and effect ledger

| Source operation | Observable contract | Effect/state | Required exit |
|---|---|---|---|
| `#liveness.delete(name)` | remove the liveness entry when present; absence is accepted | private mutable map | continue to readiness deletion |
| `#readiness.delete(name)` | independently remove the readiness entry | private mutable map | continue to identical-object return |
| `return this` | preserve exact object identity and chaining | affine mutable registry identity | return only after both deletions |

A host-projected “removed” Boolean or prebuilt registry record would leave the
two state changes and object identity in TypeScript. The current immutable
record/array transport profile is not an active mutable-map capability.

## Evidence and exit

Observability passes **36/36**; focused health/kernel consumers pass **19/19**,
with zero failures and zero skips. Reopen only with an affine health-registry
ABI that binds both map identities, key bytes, deletion order, absent-key
semantics and the returned object lease.

## Skill review

Both private skills already forbid treating immutable transport as mutable
state authority and require affine object/capability identity. No reusable
compiler- or SLIDE-backed rule was missing.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: mutable registry and affine object-identity rules already cover the blocker
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
