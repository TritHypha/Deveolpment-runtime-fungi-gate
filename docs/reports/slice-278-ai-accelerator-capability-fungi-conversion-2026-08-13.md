# Slice 278 AiAcceleratorCapability Fungi conversion adjudication

## Outcome

`AiAcceleratorCapability` is an erased interface with
`NO_RUNTIME_BEHAVIOR`. Its open `string[]` precision field permits matching
rogue model/capability precision; consumers also omit on-device and memory
enforcement. Those defects belong to active selection slices.

Shared accelerator evidence: HEAD `83e400895d37d1d883c49b366e575a35c8507946`, SHA-256
`31045854A8E81F3A58622B3B9D67A39F82667DFC96C458F7BF78953200E5C308`,
5/5 tests and no exact twin. Rogue tags, absent on-device proof, invalid memory,
duplicate/mutating arrays and hostile records require closed evidence-bound
capability admission before selection.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: erased capability records and closed-runtime validation are already governed
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE
