# Slice 128 decodeTrit Fungi conversion adjudication

## Outcome

Slice 128 classifies private
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#decodeTrit`
as `BLOCKED_BY_BINARY64_TRIT_DECODING_FAULT_ABI`. No placeholder Fungi asset is
created.

The source selector is a JavaScript number, maps the three legal two-bit codes
and reports every other value with distinct `TPLIntegrityFault` identity. A
four-arm i32 table would narrow the source and delete surplus numeric behavior.

## Evidence and exit

- Exact round-trip and planted illegal-`0b11` evidence passes in **56/56**.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen with exact numeric selector and integrity-fault identity proof.

TypeScript remains active; no retirement follows.

## Skill review

Existing numeric-domain, exhaustive-match and Error-identity rules require refusal.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing numeric-domain and error-identity rules require refusal
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
