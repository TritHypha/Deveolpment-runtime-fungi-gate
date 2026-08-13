# Slice 271 AiAcceleratorModelFormat Fungi conversion adjudication

## Outcome

`AiAcceleratorModelFormat` is `NO_RUNTIME_BEHAVIOR`. Its five literals do not
refuse unknown runtime formats before format-dependent validation.

Shared source evidence is bound by Slice 267: pinned HEAD `d357030d`, SHA-256
`31045854A8E81F3A58622B3B9D67A39F82667DFC96C458F7BF78953200E5C308`,
5/5 tests and no exact twin. Empty, `ONNX`, `.onnx`, wrong-family and forged
runtime values require terminal refusal before format-dependent work.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing erased-declaration and closed-union rules cover this alias
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE
