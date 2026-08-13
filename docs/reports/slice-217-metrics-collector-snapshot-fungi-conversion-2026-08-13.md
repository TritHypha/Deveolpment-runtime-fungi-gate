# Slice 217 MetricsCollector snapshot Fungi conversion adjudication

## Outcome

`metrics.ts#MetricsCollector.snapshot` is
`BLOCKED_BY_MUTABLE_METRICS_SNAPSHOT_SORT_ABI`. No placeholder Fungi asset is
created. It snapshots every retained route accumulator, sorts by method/route,
clones global status state, derives a binary64 error rate and snapshots the
global histogram before publishing dropped/overflow state.

## Evidence and exit

Pinned source: `472c4af7`, SHA-256
`626F6078133DBE422228280D91CB4AEB7BF1BE8C4F02A5B0F87D8063B12582AC`.
Observability passes **36/36** and focused metrics/kernel consumers pass
**20/20**, with zero failures and zero skips. A host-sorted immutable record
would move both ordering and active aggregation authority.

## Skill review

Existing mutable-state, collection-order, exact-record and binary64 rules cover
it.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing snapshot and ordering rules cover the blocker
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
