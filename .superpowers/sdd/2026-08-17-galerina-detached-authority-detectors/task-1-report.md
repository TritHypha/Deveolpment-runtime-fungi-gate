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
