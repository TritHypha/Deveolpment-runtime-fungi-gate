# Slice 209 RouteAccumulator constructor Fungi conversion adjudication

## Outcome

Private `metrics.ts#RouteAccumulator.constructor` is
`BLOCKED_BY_MUTABLE_ROUTE_ACCUMULATOR_IDENTITY_ABI`. No placeholder Fungi asset
is created. It retains method/route labels and creates live total, status-map,
error and nested histogram state under one object identity.

## Evidence and exit

Pinned source: `472c4af7`, SHA-256
`626F6078133DBE422228280D91CB4AEB7BF1BE8C4F02A5B0F87D8063B12582AC`.
Observability passes **36/36** and focused metrics/kernel consumers pass
**20/20**, with zero failures and zero skips. Immutable record transport does
not preserve retained mutable identity.

## Skill review

Existing mutable-object and immutable-transport rules cover it.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current active-object rules already require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
