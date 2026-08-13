# Slice 69 optional Boolean open-record adjudication

## Objective

Determine whether `galerina-core-config/src/index.ts#readOptionalBoolean` can be
translated to an exact package-owned Fungi/SLIDE decision without closing its
open JavaScript object domain, pre-projecting the dynamic key or collapsing
absence into a Boolean.

## Bound source

- Package: `galerina-core-config`, tranche `T2-runtime-core`.
- Retirement ledger: no declared bootstrap floor and no existing replacement.
- Production callers: `parseProjectConfig` and
  `parseEnvironmentVariableReference`, with downstream environment/config
  parsing paths.
- TypeScript input: `Readonly<Record<string, unknown>>` plus a runtime String
  key.
- TypeScript output: the selected value when its runtime type is Boolean;
  otherwise `undefined`.

## Adjudication

`BLOCKED_BY_OPEN_RECORD_OPTION_BOOL_ABI`.

The current physical record surface requires a closed named field schema; it
does not admit a runtime-key lookup into an open unknown-valued record. The
pinned scalar type table also has no `Option<Bool>` boundary. Mapping absence
to `false`, a K3 `Verdict`, or an integer tag would change the return contract.

JavaScript dynamic property reads can observe inherited properties, accessors
and proxies. Converting to a closed own-data-field record would be a desirable
zero-trust API hardening, but it must be adopted by the TypeScript callers and
configuration contract first; the translation cannot silently impose it.

## Alternatives rejected

1. **Pass the selected value only.** This leaves key lookup and type authority
   in TypeScript.
2. **Use `false` for absence.** This collapses two distinct source results.
3. **Use `Option<Int>` or a tag.** This invents a bridge ABI not owned by the
   source interface and requires a host-side Boolean conversion.
4. **Create one closed record per known key.** The helper's exact scope is a
   reusable runtime-key operation over an open record, not one fixed schema.

## Threadability and authority

`UNKNOWN`. The helper has no declared effects, but an accessor/proxy property
read can execute arbitrary host behavior and concurrent mutation is not ruled
out. A future closed immutable data-record projection could be
`PARALLEL_PURE`. No Fungi asset, queue candidate, consumer switch or retirement
is authorized.
