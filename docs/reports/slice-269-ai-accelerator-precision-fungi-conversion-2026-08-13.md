# Slice 269 AiAcceleratorPrecision Fungi conversion adjudication

## Outcome

`AiAcceleratorPrecision` is `NO_RUNTIME_BEHAVIOR`. Its seven case-sensitive
spellings do not close the consumer's open `supportedPrecisions: string[]` or
distinguish plan-only `auto` at runtime.

Shared source evidence is bound by Slice 267: pinned HEAD `d357030d`, SHA-256
`31045854A8E81F3A58622B3B9D67A39F82667DFC96C458F7BF78953200E5C308`,
5/5 tests and no exact twin. Empty, lowercase, `INT16`, wrong-family, forged
runtime and open `supportedPrecisions` values require terminal refusal.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing erased-declaration and closed-union rules cover this alias
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE
