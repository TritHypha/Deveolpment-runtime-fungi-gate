# Slice 267 AiAcceleratorKind Fungi conversion adjudication

## Outcome

`AiAcceleratorKind` is an erased eight-string alias with
`NO_RUNTIME_BEHAVIOR`. A future record decoder must map each spelling exactly
once and refuse every surplus tag; the declaration supplies no runtime proof.

## Evidence

Pinned source: `d357030d`; SHA-256
`31045854A8E81F3A58622B3B9D67A39F82667DFC96C458F7BF78953200E5C308`.
Accelerator contracts pass 5/5. No Fungi/SLIDE/VOK twin exists.
Empty, case-changed, `gpu`, unknown, wrong-class and forged runtime values must
terminate at the future exact eight-way decoder.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing erased-declaration and closed-union rules cover this alias
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE
