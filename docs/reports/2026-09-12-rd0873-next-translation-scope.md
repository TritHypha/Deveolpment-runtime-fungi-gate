# RD-0873 next translation scope: `triNot`

Date: 2026-09-12
Reviewed build identity: `main` HEAD `5180110132f5893d5ce30a88139b8ec405ac5db3`
Reviewed tree: `0d14f8f1d8c8e3bf6bf1fecbb8295a7af20003d6`
Status: **TRANSLATION_SCOPE_SELECTED_NON_AUTHORING**

This record selects one exact, reversible product-runtime scope after the
role inventory. It is a scope manifest, not permission to replace a file,
switch a consumer, retire TypeScript, or claim physical SLIDE/VOK admission.

## Exact scope

| Item | Selection |
|---|---|
| Package | `galerina-core-logic` |
| TypeScript source | `packages-ts/galerina-core-logic/src/index.ts` |
| Symbol | `triNot` (lines 83-85 at this head) |
| Signature | `export function triNot(value: Tri): Tri` |
| Source identity | 13,409 bytes; SHA-256 `2bdc2a8f8743da317fa769aebb056317622839da018c0a4897765bce8402e91a` |
| Fungi target to create | `packages/fungi/products/galerina/rd0873-core-logic/tri-not.fungi` |
| Target state | New product-tree twin; no target file currently exists |
| Focused test | `packages-ts/galerina-core-logic/tests/tri-ops-fungi-conversion.test.mjs`, narrowed to the `triNot` flow and retargeted from the package `src/self-hosted` fixture to the product target |
| Current test identity | 2,990 bytes; SHA-256 `d4a24950cf3c2a8d62e53b2e6b573e3873dc2fe82055cdfaf5c6919d14e02166` |
| Semantic shape | Closed K3 mapping: `Deny -> Allow`, `Unknown -> Unknown`, `Allow -> Deny`; no coercion, I/O, scheduling or mutable state |

The private TypeScript `assertTri` throw path remains in the retained shadow.
The Fungi flow receives the already typed `Tri`/`Verdict` value; invalid
unknown-host inputs remain a boundary responsibility and are not silently
coerced. `triAnd`, `triOr` and `triNor` are excluded from this singleton.

## Compiler and profile identity

Use the current repository compiler, built from
`@galerina/core-compiler@1.0.0-beta.2`:

```text
node galerina.mjs check packages/fungi/products/galerina/rd0873-core-logic/tri-not.fungi --strict-types --strict-governance
```

Compiler launcher identity: `galerina.mjs`, SHA-256
`0bb5afde26f3514da4d75a965b5464419146a4c5ac27532f1f5f8591f59a5a41`. The
compiler package manifest is SHA-256
`23dbe762398e975d81b6ac3d5aaf06330872d486307f4d238c767ec076fa6285`.

The semantic profile is the bounded scalar lane:

```text
profile id: slide.pure-scalar.v1
profile name: scalar-1
profile digest: sha256:bcaff64aa174de78063e7bcad46ee91ee56264a14bbdc882c4f5247fa146f3bf
```

The profile is sufficient for the `Tri`/`Verdict` scalar ABI. It does not
admit Float64, arrays, objects, callbacks, host effects or native authority.

## Per-wave limits

The wave is one singleton step:

```text
maxSymbolsPerStep: 1
maxSourceFilesPerStep: 1
maxSymbolsPerWave: 1
maxSourceFilesPerWave: 1
maxInputBytesPerStep: 16,384
maxOutputBytesPerStep: 65,536
maxEvidenceBytesPerStep: 65,536
timeoutMsPerStep: 600,000
concurrency: 1
automaticRetries: 0
overflow action: HOLD and abort before acceptance
```

The complete selected source file is 13,409 bytes and is within the input
cap. Evidence must include the source/target hashes, strict compiler result,
interpreter and WASM parity for all three K3 values, the invalid-input host
boundary refusal, the focused test result, and an independently reviewed
same-head receipt. No corpus or queue run is part of this step.

## Explicit exclusions and acceptance boundary

- `isOmniUncertain`, `isBuiltin` and `validateTransition` remain held and are
  not admitted by this scope.
- `assertTri` and all other `tri-*` exports remain in the TypeScript shadow.
- No package-wide replacement, generated declaration change, consumer switch,
  TypeScript retirement, branch/worktree creation or production authority is
  included.
- The target may be accepted only after the focused evidence is complete and
  the exact head remains unchanged. Missing, stale or partial evidence is
  `HOLD`.
