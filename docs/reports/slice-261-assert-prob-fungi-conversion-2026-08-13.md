# Slice 261 assertProb Fungi conversion adjudication

## Outcome

`assertProb` is `BLOCKED_BY_BOOTSTRAP_FLOOR`. It also depends on exact thrown
Error identity and interpolates rejected host values, allowing `toString` or
`Symbol.toPrimitive` to replace the promised failure with a foreign exception.

Required exit: capture one inert primitive Float, use a fixed typed failure and
prove caller compatibility plus physical record/Float admission.

Pinned source: `d357030d2847de0f0d9c5728ad3eab9556c6c2c4`; SHA-256
`AFDE94ABFB73EB6A3B2E9FC533784735DEAA4049D414903203304A1819CAA762`.
Substrate math passes 6/6. The paired writing-skill update is `c2ae041cf11b992d7245e914ac70626b47270576`.
`SERIAL_HARD_PATH` is conservative until hostile coercion and Error effects are closed.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 38c3b15f4ae61283f090ea3db81599f7a79f3c1b
Threadability: SERIAL_HARD_PATH
Source classification: BOOTSTRAP_FLOOR
Bounded closure: COMPLETE
