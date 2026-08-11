# Plugin type compatibility Fungi conversion

## Result

The compiler's private `isCompatibleType` decision now has one package-owned
Fungi translation and independent physical SLIDE/VOK evidence. The translation
is reference-only: TypeScript remains the executing border and no consumer has
switched.

## Exact source custody

| Artifact | SHA-256 |
|---|---|
| `packages-galerina/galerina-core-compiler/src/plugin-schema.ts` | `8dfbdcf8292ce1647012ca570cde6635dbef68fc8c76ce1caaf178bdcef1902e` |
| `packages-galerina/galerina-core-compiler/src/self-hosted/plugin-type-compatibility.fungi` | `88c794f4c9e9b3acecb1f4bbac4f4e2b7a493fa1af56a90009f5840b4fb06a81` |

The Fungi implementation is committed at `451cde48`. Its physical integration
proof is committed separately at `8a9ea616`. The independent SLIDE build point
is `ac8a041`; the SLIDE repository required no change for this slice.

## Semantic proof

The admitted contract accepts two bounded Strings and returns true only for
`actual == "Int"` and `expected == "Float"`. Every other String pair returns
false. The proof covers:

- all 49 pairs in the canonical seven-type matrix;
- seven hostile and empty String pairs in the compiler test;
- TypeScript border behaviour for every unequal canonical pair;
- strict parse, type, effect and governance checking;
- typed interpretation and actual signed/admitted Wasm execution;
- physical SLIDE publication, independent VOK re-admission and typed Bool
  receipt verification for the canonical matrix and six hostile pairs;
- refusal of wrong argument types, wrong argument counts, an unpaired
  surrogate, mutated source bytes and a one-byte physical `.slide` mutation.

The focused compiler proof passes **2/2**, the compiler package passes
**6,346/6,346**, and the physical SLIDE/VOK proof passes **1/1** with zero
skips.

## Language constraints

The Fungi source contains no null, NaN, `else if`, exception syntax, `for` or
`loop`. It uses two nested Boolean decisions and an explicit terminal false
exit. No new language syntax or effect authority was introduced.

## Closure and authority boundary

Repository-wide aggregate, governed tooling, generated-owner, roadmap and
normal phase-close evidence is still being regenerated. Until those checks
finish, repository closure is `UNKNOWN`; focused success is not relabelled as
global success.

`plugin-schema.ts`, `validatePluginInput` and every consumer remain active.
This slice does not authorize a consumer switch, plugin execution, source
retirement, bootstrap fixpoint, signing, release, production or durability.
