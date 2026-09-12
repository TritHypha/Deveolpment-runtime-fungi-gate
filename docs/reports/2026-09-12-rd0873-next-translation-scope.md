# RD-0873 next translation scope: `triNot`

Date: 2026-09-12
Reviewed build identity: `main` HEAD `30c5c8be8d94db3b47bade0f7024371f8b9588c6`
Reviewed tree: `d222695b9505206530ce9da3a70196ce774c79e5`
Prior selection snapshot: HEAD `5180110132f5893d5ce30a88139b8ec405ac5db3`, tree `0d14f8f1d8c8e3bf6bf1fecbb8295a7af20003d6` (documentation-only delta)
Status: **TRANSLATION_SCOPE_SELECTED_REVIEWED_NON_AUTHORING**

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
| Focused test | Additive `packages-ts/galerina-core-logic/tests/tri-not-fungi-conversion.test.mjs` to exercise only the product target; existing `tri-ops-fungi-conversion.test.mjs` remains unchanged |
| Current test identity | 2,990 bytes; SHA-256 `d4a24950cf3c2a8d62e53b2e6b573e3873dc2fe82055cdfaf5c6919d14e02166` |
| Semantic shape | Closed K3 mapping: `Deny -> Allow`, `Unknown -> Unknown`, `Allow -> Deny`; no coercion, I/O, scheduling or mutable state |

The private TypeScript `assertTri` throw path remains in the retained shadow.
The proposed Fungi flow proves only a validated scalar core. A named host
adapter must check exact primitive membership in `{-1, 0, 1}` before any
coercive WASM ingress, canonicalize zero, and map the validated value to the
Fungi scalar representation. Invalid unknown-host inputs are refused rather
than silently coerced. The adapter is not admitted by this singleton. Raw WASM
observations show why this matters: values such as `1.5`, `NaN`, strings and
booleans do not preserve the TypeScript throw behavior when unwrapped. `triAnd`,
`triOr` and `triNor` are excluded from this singleton.

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

The profile is a candidate for the validated `Tri` scalar ABI. Its canonical
owner/path and the executed compiler/checker/emitter/assembler closure still
need to be recorded before authoring. It does not admit Float64, arrays,
objects, callbacks, host effects or native authority.

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

Input accounting is explicit: the 16,384-byte step cap applies to the primary
source payload only (13,409 bytes). The focused test and toolchain are
ancillary evidence with their own bounded evidence cap; if the execution
runner counts source plus test as one input payload (16,399 bytes), the step
must HOLD before authoring rather than overflow silently.

The complete selected source file is 13,409 bytes and is within the primary
input cap. Evidence must include the source/target hashes, strict compiler
result, executed compiler closure, interpreter and WASM parity for all three
K3 values, positive-zero behavior, the invalid-input host-boundary refusal, an
additive product-target focused test, preserved existing four-operation test
coverage, and an independently reviewed same-head receipt. No corpus or queue
run is part of this step.

## Explicit exclusions and acceptance boundary

- `isOmniUncertain`, `isBuiltin` and `validateTransition` remain held and are
  not admitted by this scope.
- `assertTri` and all other `tri-*` exports remain in the TypeScript shadow.
- No package-wide replacement, generated declaration change, consumer switch,
  TypeScript retirement, branch/worktree creation or production authority is
  included.
- The existing package-owned `src/self-hosted/tri-ops.fungi` fixture remains
  the provenance reference and its four-operation differential test remains
  unchanged. The product target may be accepted only after the additive
  focused evidence is complete and the exact head remains unchanged. Missing,
  stale or partial evidence is `HOLD`.

Independent review records: Grok advisory adjudication is preserved in the
private KB RD-0873 record; the GPT-6 Astra review is recorded in
`docs/reports/2026-09-12-rd0873-astra-trinot-scope-review.md` with receipt
`docs/independent-audits/2026-09-12-rd0873-astra-trinot-scope-review-v1.json`.
