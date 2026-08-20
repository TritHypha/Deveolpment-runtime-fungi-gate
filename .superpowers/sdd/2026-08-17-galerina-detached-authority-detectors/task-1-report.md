# Task 1 report — detached-authority planted controls

## Status

Task 1 is intentionally RED. It adds only the authority-path contract test and
its planted TypeScript fixtures. `scripts/audit-detached-slide-authority-path.mjs`
was deliberately not created; detector implementation belongs to Task 2.

## RED evidence

Command:

```text
node --test scripts/tests/detached-slide-authority-path.test.mjs
```

Result: exit `1`, `ERR_MODULE_NOT_FOUND`, with Node reporting that
`scripts/audit-detached-slide-authority-path.mjs` cannot be imported from
`scripts/tests/detached-slide-authority-path.test.mjs`. The test runner reports
`1` failed file and `0` passing tests. This is the expected pre-implementation
failure: the test names the Task 2 audit module seam, but this Task 1 slice
must not provide production code that could satisfy it.

## Planted contract

- Green closure: snapshot `Uint8Array` plus artifact reference can yield typed
  GIR bytes/reference or a typed refusal.
- Red controls assert exact identifiers: `AST_REENTRY`,
  `TYPESCRIPT_REENTRY`, `LEGACY_EXECUTION_REENTRY`,
  `COMPONENT_AUTHORITY_BLEED`, and `UNRESOLVED_CLOSURE`.
- Each red control requires a non-zero exit and exactly its named identifier.
- The receipt contract accepts only repository-relative locators, edge IDs,
  digests, and freshness/schema metadata; it rejects embedded fixture source
  bodies.

## Files changed

- `scripts/tests/detached-slide-authority-path.test.mjs`
- `scripts/tests/fixtures/detached-authority/green/entry.ts`
- `scripts/tests/fixtures/detached-authority/red-ast/entry.ts`
- `scripts/tests/fixtures/detached-authority/red-typescript/entry.ts`
- `scripts/tests/fixtures/detached-authority/red-wasm/entry.ts`
- `scripts/tests/fixtures/detached-authority/red-component/entry.ts`
- `scripts/tests/fixtures/detached-authority/red-unresolved/entry.ts`
- `.superpowers/sdd/2026-08-17-galerina-detached-authority-detectors/task-1-report.md`

## Commit

The planted controls and this initial report were committed locally, not
pushed, as `303a5e1b276ad5a8b1937125ed2c25214dad5b1f`
(`test: specify detached authority path controls`).

## Self-review

- No detector, CLI registration, package script, generated artifact, or other
  production file was created or edited.
- All fixture imports and receipt locators are repository-relative in committed
  content.
- The deliberate RED is caused by the absent named module, not a fixture typo
  or unrelated failing test.
- Local commits are not pushed. An independent audit remains pending for any
  later implementation.

## Fix Round 1

Strengthened `scripts/tests/detached-slide-authority-path.test.mjs` and the
five red fixture entries. The receipt now requires `FRESH` state with matching
40-character `indexed_head_sha` and `repository_head_sha` values, normalized
repository-contained file and edge locators, and recursive rejection of both
literal and JSON-escaped fixture source bodies. The planted controls now cover
all named AST, TypeScript, legacy execution, component, and unresolved-import
forms, with exact repeated failure identifiers for every required form.

Covering test:

```text
scripts/tests/detached-slide-authority-path.test.mjs
```

Command:

```text
node --test scripts/tests/detached-slide-authority-path.test.mjs
```

Expected RED output: exit `1` and `ERR_MODULE_NOT_FOUND`, reporting that
`scripts/audit-detached-slide-authority-path.mjs` cannot be imported from the
covering test. This remains expected because Task 1 must not implement the
detector.

Code/control commit: `4b82189722e5bee680028a1126871086f50884b2`
(`test: strengthen detached authority controls`), local only and not pushed.
Evidence-only report commit: `a049dd3a2798dead9b12d037270bec5e9145829d`
(`docs: record detached authority fix round 1`); it is not the fix commit.

## Fix Round 2

Strengthened the receipt freshness contract so the covering test independently
runs `git rev-parse HEAD` in the repository root and requires both
`repository_head_sha` and `indexed_head_sha` to exactly equal that live value.
Matching arbitrary 40-character values can no longer satisfy the test.

Covering test and command:

```text
node --test scripts/tests/detached-slide-authority-path.test.mjs
```

Expected RED output: exit `1` with `ERR_MODULE_NOT_FOUND`, reporting the
absent `scripts/audit-detached-slide-authority-path.mjs` import. This is the
specified pre-implementation result; no detector code was added.

Code/control commit: `a35480cb2d0c010abbc10f961b6df142a7015495`
(`test: bind detached receipt to repository head`), local only and not pushed.
