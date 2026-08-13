# Slice 219 promLabel Fungi conversion adjudication

## Outcome

Private `metrics.ts#promLabel` is
`BLOCKED_BY_REGEX_UTF16_LABEL_ESCAPE_ABI`. No placeholder Fungi asset is
created. It applies one global JavaScript regex over backslash, newline and
quote code units and replaces every match with the empty string.

## Evidence and exit

Pinned source: `d7128da5`, SHA-256
`626F6078133DBE422228280D91CB4AEB7BF1BE8C4F02A5B0F87D8063B12582AC`.
Observability passes **36/36** and focused metrics/logger/kernel consumers pass
**27/27**, with zero failures and zero skips. A host-sanitized label would move
the exact escaping decision outside Fungi.

## Skill review

Existing regex, text-boundary and no-host-projection rules cover it.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing exact regex/text rules cover the blocker
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
