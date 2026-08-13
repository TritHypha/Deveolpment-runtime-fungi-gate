# Slice 84 Package Alias Adjudication

`packages-galerina/galerina-core-config/src/index.ts#isLoPackageGraphAlias` is
`BLOCKED_BY_CASE_INSENSITIVE_REGEX_TEXT_ABI`. Source SHA-256 is
`71d473cf606fa7cabd2765fa270f10ca969a610a8c115b3c34eb07decd13b530`.

The exact source uses anchored ECMAScript `/i` matching for four aliases in a
live host-manifest boundary. Current physical execution has no regex or
case-fold operation. Canonical-label enumeration and host normalization are
not equivalent. Core Config passes 54/54. No candidate asset was created.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing regex case-fold and host-authority refusal rules cover this boundary
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
