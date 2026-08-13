# Slice 67 registry-generation path equality adjudication

## Objective

Determine whether `registry-generation-store.ts#samePath` can be translated to
an exact package-owned Fungi/SLIDE decision without moving path identity into a
host adapter or narrowing the TypeScript String domain.

## Bound source

- Package: `galerina-framework-app-kernel`, tranche `T1-trust-root`.
- Retirement ledger: no declared bootstrap floor and no existing replacement.
- Callers: `canonicalDirectory` and
  `publishRegistryGenerationWithLinkedHost`, with reachable production load,
  persistence and bootstrap paths.
- TypeScript behavior: if the left path begins with an ASCII drive designator
  and slash, compare both paths after `toLocaleLowerCase("en-US")`; otherwise
  compare exact Strings.

## Adjudication

`BLOCKED_BY_LOCALE_PATH_SEMANTICS`.

The current physical String profile provides bounded value equality and named
immutable text operations. It does not provide the exact JavaScript regular
expression, explicit-locale Unicode case mapping, Unicode-version contract or
complete unbounded String domain used by this trust-root path decision. A
host-projected `isWindowsPath` Boolean or pre-normalized pair would move the
identity decision across the border and is refused.

## Alternatives rejected

1. **Lowercase ASCII only.** This changes non-ASCII Windows path equality.
2. **Always use exact equality.** This breaks the current case-insensitive
   Windows-drive branch.
3. **Normalize in TypeScript and pass two Strings to Fungi.** This leaves the
   authority-bearing comparison inputs under the code being replaced.

## Threadability and authority

The immutable comparison leaf is `PARALLEL_PURE`, but directory resolution,
generation persistence, linked-host publication and bootstrap loading remain
ordered trust-root work. No Fungi asset, queue candidate or consumer switch is
authorized. Revisit only with a versioned, exact path/case-fold profile and a
content-bound border that independently derives both canonical paths.
