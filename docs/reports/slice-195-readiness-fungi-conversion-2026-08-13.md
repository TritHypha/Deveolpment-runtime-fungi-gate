# Slice 195 readiness Fungi conversion adjudication

## Outcome

`HealthRegistry.readiness` is `BLOCKED_BY_ACTIVE_ASYNC_HEALTH_REGISTRY_ABI`.
No placeholder Fungi asset is created. It selects the readiness map and exact
`"readiness"` kind. This boundary is distinct from liveness even though both
delegate to the same private evaluator.

## Bound source dossier

- Source: `packages-galerina/galerina-observability/src/health.ts:116-119`
- Source SHA-256: `8EDCB6B5AC3E9110AAA7DA4AFAC0F96B809562E79F2CB823A3B85F81489079ED`
- Repository build point: `b06a727934c95469fcf28a34222fd1a6cdaa1c13`
- Consumers: `/health/ready`, combined `/health`, package health tests and the
  composed observability surface.
- Existing Fungi: governed constant-readiness examples do not preserve the
  mutable callback registry, component report or timeout behavior.

## Decision and effect ledger

| Source operation | Observable contract | Effect/state | Required exit |
|---|---|---|---|
| select `#readiness` | exclude liveness callbacks and keep readiness insertion order | read active private map | pass exact map to evaluation |
| call `#evaluate("readiness", ...)` | any returned `DOWN` makes aggregate `DOWN` after all checks run | async callbacks and timer capabilities | typed `Promise<HealthReport>` |
| empty registry | report `UP`, kind `readiness`, empty components | derived report | successful completion |

The public route turns `DOWN` into traffic-shedding 503 behavior. Moving the
aggregate or kind selection into the host would retain the decision authority
outside Fungi.

## Evidence and exit

Observability passes **36/36**; focused health/kernel consumers pass **19/19**,
with zero failures and zero skips. Reopen only with the same exact active ABI as
liveness while preserving the independent readiness map and route outcome.

## Skill review

Existing async, retained-capability, exact-record and fail-closed routing rules
cover the method. No reusable skill update is warranted.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: async active-registry and fail-closed route rules already cover the blocker
Threadability: ASYNC_HAPPY_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
