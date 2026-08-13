# Slice 266 nmrFailureProbability Fungi conversion adjudication

## Outcome

`nmrFailureProbability` is `BLOCKED_BY_BOOTSTRAP_FLOOR`. It has unbounded work,
uses `Math.pow`, lacks an exact physical Float/Int envelope and violates its
documented range over accepted inputs.

Fresh proof: `nmr(0.25,1021)` returns false `1`; `N=1023` returns forbidden NaN.
Required exit: cap/reformulate the algorithm and prove exact numerical KATs,
termination, physical SLIDE/VOK and the package fixpoint.

Pinned source: `d357030d2847de0f0d9c5728ad3eab9556c6c2c4`; SHA-256
`AFDE94ABFB73EB6A3B2E9FC533784735DEAA4049D414903203304A1819CAA762`.
Substrate math passes 6/6. The paired writing-skill update is `c2ae041cf11b992d7245e914ac70626b47270576`.
`SERIAL_HARD_PATH` is conservative until termination and numeric effects are proved.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 38c3b15f4ae61283f090ea3db81599f7a79f3c1b
Threadability: SERIAL_HARD_PATH
Source classification: BOOTSTRAP_FLOOR
Bounded closure: COMPLETE
