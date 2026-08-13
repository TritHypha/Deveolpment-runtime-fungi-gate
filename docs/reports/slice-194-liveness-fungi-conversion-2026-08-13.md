# Slice 194 liveness Fungi conversion adjudication

## Outcome

`HealthRegistry.liveness` is `BLOCKED_BY_ACTIVE_ASYNC_HEALTH_REGISTRY_ABI`.
No placeholder Fungi asset is created. It selects the private liveness map and
the exact `"liveness"` kind, then returns the active asynchronous evaluation
without changing that routing or reconstructing a report in the host.

## Bound source dossier

- Source: `packages-galerina/galerina-observability/src/health.ts:111-114`
- Source SHA-256: `8EDCB6B5AC3E9110AAA7DA4AFAC0F96B809562E79F2CB823A3B85F81489079ED`
- Repository build point: `b06a727934c95469fcf28a34222fd1a6cdaa1c13`
- Consumers: `/health/live`, combined `/health`, package health tests and the
  composed observability surface.
- Existing Fungi: constant liveness examples do not execute registered checks,
  enforce timeouts or return the component map, so they are not parity.

## Decision and effect ledger

| Source operation | Observable contract | Effect/state | Required exit |
|---|---|---|---|
| select `#liveness` | use only liveness callbacks in insertion order | read active private map | pass exact map to evaluation |
| call `#evaluate("liveness", ...)` | execute all fail-closed callback/timer rules | async callbacks and timer capabilities | typed `Promise<HealthReport>` |
| empty registry | report `UP`, kind `liveness`, empty components | derived report | successful completion |

The happy-path scheduling shape is asynchronous, but admission is blocked
until callback ownership, timeout/cancellation, losing-work behavior, open
component keys and report identity cross one exact physical boundary.

## Evidence and exit

Observability passes **36/36**; focused health/kernel consumers pass **19/19**,
with zero failures and zero skips. The public route maps returned `UP` to 200
and `DOWN` to 503; a precomputed host Boolean would not preserve this method.

## Skill review

Existing async, retained-capability, exact-record and host-authority rules cover
the method. No reusable skill update is warranted.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: async active-registry and exact-report rules already cover the blocker
Threadability: ASYNC_HAPPY_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
