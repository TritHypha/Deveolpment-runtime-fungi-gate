# Slice 285 generic ONNX NPU profile Fungi conversion adjudication

## Outcome

`GENERIC_ONNX_NPU_PROFILE` is
`BLOCKED_BY_SHARED_MUTABLE_PROFILE_RECORD_ARRAY_ABI`. Its exported singleton,
nested arrays and memory record remain writable and aliased despite TypeScript
`const`/`readonly`; no general record/array physical profile admits it.

Shared accelerator evidence is HEAD `83e400895d37d1d883c49b366e575a35c8507946`, SHA-256
`31045854A8E81F3A58622B3B9D67A39F82667DFC96C458F7BF78953200E5C308`,
5/5 tests and no exact twin. Identity, mutation, freeze/copy and exact-record
negative controls are mandatory before semantic narrowing.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 597d1ba1bdd3238a8d4e58c9bc524838cbddc5d7
Authoring skill disposition: SKILL_UPDATE d58dae2ce112326e89faf47b74974f4cea196078
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
