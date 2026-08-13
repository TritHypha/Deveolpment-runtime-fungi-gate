# Slice 265 binom Fungi conversion adjudication

## Outcome

`binom` is `BLOCKED_BY_BOOTSTRAP_FLOOR`. Its loop count is derived from an
effectively unbounded JavaScript number and its left-to-right binary64
multiply/divide recurrence can overflow before the mathematical coefficient.

Required exit: one admitted finite integer bound and exact operation-order,
rounding and overflow behavior using bounded Boolean `while` only.

Pinned source: `d357030d2847de0f0d9c5728ad3eab9556c6c2c4`; SHA-256
`AFDE94ABFB73EB6A3B2E9FC533784735DEAA4049D414903203304A1819CAA762`.
Substrate math passes 6/6. The paired writing-skill update is `c2ae041cf11b992d7245e914ac70626b47270576`.
`SERIAL_HARD_PATH` is conservative until the finite bound and arithmetic order are proved.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 38c3b15f4ae61283f090ea3db81599f7a79f3c1b
Threadability: SERIAL_HARD_PATH
Source classification: BOOTSTRAP_FLOOR
Bounded closure: COMPLETE
