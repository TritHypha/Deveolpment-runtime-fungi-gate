# Slice 126 Trit type Fungi conversion adjudication

## Outcome

Slice 126 classifies the nominal
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#Trit` type as
`BLOCKED_BY_ARITH_TRIT_BRAND_ABI`. No placeholder Fungi type is created.

Although erased at JavaScript runtime, the unique-symbol brand is the compile-
time authority boundary that prevents arithmetic values entering governance
operations and vice versa. Plain physical Int or Verdict would defeat that
contract before execution.

## Evidence and exit

- TypeScript typecheck proves the current compile-time barrier.
- Focused arithmetic/governance evidence passes **56/56**; Tower-Citizen
  passes **515/515**, zero skips.
- Reopen only with distinct Fungi, GIR, SLIDE and VOK arithmetic type identity.

TypeScript retains the brand; no consumer switch follows.

## Skill review

Existing semantic-brand rules require refusal; no new skill change is needed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing semantic-brand rules preserve the type boundary
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
