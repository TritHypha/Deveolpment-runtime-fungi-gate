# Slice 211 normaliseRoute Fungi conversion adjudication

## Outcome

Private `metrics.ts#normaliseRoute` is
`BLOCKED_BY_OPEN_HOST_STRING_REGEX_UTF16_ABI`. No placeholder Fungi asset is
created. It observes an open host value, defaults non-string/empty inputs,
removes the query suffix, removes JavaScript-regex whitespace and truncates to
200 UTF-16 code units.

## Evidence and exit

Pinned source: `472c4af7`, SHA-256
`626F6078133DBE422228280D91CB4AEB7BF1BE8C4F02A5B0F87D8063B12582AC`.
Observability passes **36/36** and focused metrics/kernel consumers pass
**20/20**, with zero failures and zero skips. Pre-sanitized host text would
remove source observations and cannot prove parity.

## Skill review

Existing open-value, regex, text-boundary and no-host-projection rules cover it.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current open-text rules already cover the blocker
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
