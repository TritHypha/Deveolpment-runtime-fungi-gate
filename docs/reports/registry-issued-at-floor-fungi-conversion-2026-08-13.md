# Registry issued-at floor - Slice 72

## Result

Slice 72 is `BLOCKED_BY_OPTION_STRING_ORDERING_ABI`.

The trust-root helper succeeds when the minimum issue time is absent and
otherwise performs JavaScript lexicographic String `>`. The pinned physical
surface can carry Strings, but not `Option<String>` or that exact UTF-16
relational operation.

## Evidence

- Graph callers: `verifyRegistryIndex` and `verifyRegistryIndexV2`; downstream
  paths include registry generation, delegation, rotation, runtime admission
  and bootstrap.
- Retirement row: `T1-trust-root`, replacement absent, no declared bootstrap
  floor.
- Source distinctions: absent floor versus every present String, followed by
  JavaScript UTF-16 code-unit lexicographic ordering.
- Physical gap: no `Option<String>` boundary and no exact relational String
  opcode/profile.
- Focused registry-index lanes: **31/31 tests passed**, zero failures and zero
  skips.

No Fungi asset, queue candidate, test fixture or TypeScript source change was
created. The helper and all trust-root consumers remain active.

## Threadability

`PARALLEL_PURE` as a leaf. Registry verification, index rotation, persistence
and admission remain `SERIAL_HARD_PATH` work and cannot inherit that class.

## Skill review

`NO_SKILL_UPDATE`. The private translation skill already requires exact
`undefined`/`Option` preservation, String encoding and host-boundary parity;
the writing skill already refuses missing physical types and ambient host
decisions. No new reusable compiler-backed rule was found.

## R&D trigger

Revisit after physical `Option<String>` and a versioned JavaScript-compatible
String-order profile exist, or redesign the source contract around a canonical
parsed instant type with explicit malformed, range, timezone and ordering
rules before translation.

This result grants no conversion, retirement, signing, production, release or
push authority. Aggregate closure remains deferred to Slice 87.
