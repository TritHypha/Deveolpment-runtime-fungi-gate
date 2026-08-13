# Slice 191 registerLiveness Fungi conversion adjudication

## Outcome

`HealthRegistry.registerLiveness` is
`BLOCKED_BY_MUTABLE_CALLBACK_REGISTRY_AND_THIS_IDENTITY_ABI`. No placeholder
Fungi asset is created. It retains a callback under an arbitrary string key,
replaces any previous entry, mutates private state and returns the identical
registry object for chaining.

## Evidence and exit

Observability passes **36/36**; focused health/kernel consumers pass **19/19**,
with zero skips. Reopen only with exact key/callback ownership, replacement,
revocation and affine object identity.

## Skill review

Existing active-registry and affine-capability rules cover it.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: active registry and affine callback rules already cover the blocker
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
