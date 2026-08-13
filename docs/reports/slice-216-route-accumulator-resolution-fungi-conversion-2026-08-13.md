# Slice 216 route-accumulator resolution Fungi conversion adjudication

## Outcome

Private `metrics.ts#MetricsCollector.#routeAccumulator` is
`BLOCKED_BY_DYNAMIC_METHOD_KEY_MUTABLE_CARDINALITY_ABI`. No placeholder Fungi
asset is created. It reads/mutates the live route map, returns retained object
identity, builds dynamic compound keys and allocates per-method overflow state.

## Evidence and exit

Pinned source: `472c4af7`, SHA-256
`626F6078133DBE422228280D91CB4AEB7BF1BE8C4F02A5B0F87D8063B12582AC`.
Observability passes **36/36** and focused metrics/kernel consumers pass
**20/20**, with zero failures and zero skips. An exact hostile probe with
`maxRoutes: 1`, one base route and 100 distinct methods yields **101 route
series**, including **100 overflow series**. The documented cardinality bound
is therefore not conserved across the method dimension.

## Skill review

Existing mutable-map, active-state and fail-closed evidence rules cover it.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: the defect is project-specific and existing boundedness rules already catch it
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
