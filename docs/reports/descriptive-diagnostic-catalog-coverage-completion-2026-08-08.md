# Descriptive diagnostic catalog coverage completion

Date: 2026-08-08
Status: implemented and locally verified; not pushed

## Outcome

The generated diagnostic registry now owns both numeric-tail codes and
descriptive identities such as `FUNGI-FUSE-HASH-MISMATCH`. The current derived
surface is **974 registry entries**, including **73 syntax-admitted descriptive
identities** and **51 descriptive identities on the signing path**.

The authoritative coverage result is:

| measure | result |
|---|---:|
| tracked JavaScript/TypeScript sources enumerated | 1,740 |
| tracked-but-unreadable sources | 0 |
| admitted descriptive identities | 73 |
| signing-path descriptive identities | 51 |
| admitted identities absent from registry | 0 |
| ambiguous source tokens | 0 |
| detector self-test | 7/7 |

## What changed

The former report used a shape-agnostic regular expression. Its **81 real
codes** headline included actual refusals, prefixes, examples, domain tags and
negative fixtures. It was useful as a warning but was correctly report-only;
it could not prove a complete catalog.

The replacement is a bounded JavaScript/TypeScript lexer and context
classifier. It ignores comments and separately recognizes strings, templates,
regular expressions, identifiers and punctuation. A descriptive token is an
identity only when it is bound to a diagnostic sink such as:

- a `code` or `errorCode` field;
- `throw new ...Error(...)`;
- `fuseError`, `runtimeError`, `readJson`, `add`, `warn`, or equivalent
  diagnostic constructors;
- `console.error`, `console.warn`, or an intentionally diagnostic
  `console.log` path; or
- a code/error/warning/diagnostic binding.

Comments, tests, type-only fields, domain/family/prefix tables, and explicit
`code-catalog-reference` mutation fixtures remain references. A code assembled
from a string prefix is refused rather than granted an invented partial
identity.

The index now scans the root CLI and `governance/` in addition to packages,
scripts and documents. Descriptive identities emitted by dev tools are no
longer erased by the old assumption that every `scripts/` occurrence is only a
fixture.

## Fail-closed behavior

Registry generation refuses before writing when:

1. source enumeration or identity observation is vacuous;
2. an admitted identity is absent from the generated index; or
3. a descriptive source token is ambiguous.

Phase-close runs the detector self-test and then the authoritative coverage
gate immediately after the code index and registry drift checks. The audit
module also has a main-module guard, so importing its measurement function
cannot execute the command-line program or terminate its caller.

## Red-to-green evidence

Before regeneration, the new authoritative gate refused with **73 missing**,
including **51 signing-path identities**, and **0 ambiguous**. After the code
index and registry were regenerated from the same sources, the gate passed
with **0 missing / 0 ambiguous**. No diagnostic was renamed or renumbered.

Hermetic tests additionally prove that generation refuses both a missing
descriptive identity and a novel ambiguous token without writing a registry.
The focused catalog/phase-close suite passes **28/28**.

The first complete phase-close correctly found three stale downstream
artifacts after the registry expansion: Golden Pack runtime closure, code
coverage output, and one historical report that repeated the exact spelling of
an already-retired phantom. Each owning artifact was repaired and independently
rechecked. The second complete blocking phase-close then passed every gate in
**643 seconds**, including **433 tooling tests**, graph-all **5/5**, Golden Pack
**11/11**, coverage **974/974**, artifact drift and crypto suites. The post-run
Node census returned to the single pre-existing MCP process.

## Boundary and next work

This closes catalog visibility and drift; it does not by itself authenticate a
diagnostic, grant signing authority, or complete hosted CI. A new diagnostic
emission form must extend the bounded classifier together with positive,
negative and mutation controls. The current Galerina head remains local until
the owner pushes it and hosted CI runs that exact commit.
