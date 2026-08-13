# Slice 292 CpuWorkloadClass Fungi conversion adjudication

## Outcome

`CpuWorkloadClass` is an erased five-string alias with
`NO_RUNTIME_BEHAVIOR`. It refuses no rogue workload before plan selection or
calibration reporting.

CPU evidence: HEAD `83e400895d37d1d883c49b366e575a35c8507946`, SHA-256
`4EF20E25E0BC8DBCEA71344965561FDDE5C77D49847BC032928B568EAB1148D4`,
tests 3/3 and no exact twin. Exact tags, empty/case/typo, wrong-family,
non-string and hostile runtime values require terminal refusal.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: erased closed-union rules already cover this declaration
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE
