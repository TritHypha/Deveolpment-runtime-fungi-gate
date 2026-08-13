# Slice 72 registry issued-at floor adjudication

## Objective

Determine whether `registry-index.ts#isStrictlyNewerThanFloor` can be
translated to an exact package-owned Fungi/SLIDE decision without collapsing
an absent floor or replacing JavaScript String ordering with host authority.

## Bound source

- Package: `galerina-framework-app-kernel`, tranche `T1-trust-root`.
- Retirement ledger: no declared bootstrap floor and no existing replacement.
- Production callers: `verifyRegistryIndex` and `verifyRegistryIndexV2`, with
  downstream generation, delegation, rotation, runtime and bootstrap paths.
- TypeScript inputs: `issuedAt: string` and
  `minIssuedAt: string | undefined`.
- TypeScript behavior: true when the floor is absent; otherwise JavaScript
  lexicographic `issuedAt > minIssuedAt`.

## Adjudication

`BLOCKED_BY_OPTION_STRING_ORDERING_ABI`.

The pinned physical profile has no `Option<String>` parameter. It supports
bounded immutable text equality and named prefix/suffix/contains operations,
but no exact JavaScript relational String comparison. JavaScript `>` compares
String values lexicographically by UTF-16 code units after the source's static
types have excluded coercion. A UTF-8 byte comparison, locale comparison or
host-precomputed Boolean is not the same boundary.

Callers may validate timestamp shapes elsewhere, but this helper's exact scope
accepts arbitrary Strings. Replacing it with parsed epoch arithmetic would be
a deliberate API/security redesign requiring an owner-adopted canonical time
format and overflow/range contract, not a translation shortcut.

## Alternatives rejected

1. **Pass an `hasFloor` Boolean plus two Strings.** This host-projects
   `undefined` and does not prove the optional-value ABI.
2. **Compare UTF-8 bytes.** UTF-8 byte order is not a general proof of the
   source's UTF-16 code-unit relation.
3. **Parse timestamps in the host.** This moves freshness authority outside
   the candidate and changes malformed-String behavior.
4. **Treat absence as an empty String.** The source distinguishes absence from
   every present String, including empty.

## Threadability and authority

`PARALLEL_PURE`: the leaf is deterministic and observes immutable primitive
values only. Registry verification and admission remain ordered trust-root
work. No Fungi asset, queue candidate, consumer switch or retirement is
authorized.
