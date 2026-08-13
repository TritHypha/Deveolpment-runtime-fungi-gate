# Slice 280 AiAcceleratorTargetPreference Fungi conversion adjudication

## Outcome

`AiAcceleratorTargetPreference` is an erased interface with
`NO_RUNTIME_BEHAVIOR`. Current selection ignores `requireOnDevice`,
`allowSilentFallback` and `reportFallback`, while only the first fallback is
used; literal Boolean types do not enforce policy at runtime.

At HEAD `83e400895d37d1d883c49b366e575a35c8507946`, accelerator source SHA-256 is
`31045854A8E81F3A58622B3B9D67A39F82667DFC96C458F7BF78953200E5C308`,
tests pass 5/5 and no exact twin exists. Flipped literals, rogue/empty/multiple
fallbacks, on-device mismatch, wrong Boolean classes and hostile records must
be refused or explicitly enforced before selection.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: erased literal policy and exact-border rules already cover this interface
Threadability: PARALLEL_PURE
Source classification: NO_RUNTIME_BEHAVIOR
Bounded closure: COMPLETE
