# Implicit return-type Fungi conversion design

## Decision

Add a package-owned `.fungi` reference for the private
`isImplicitReturnType` decision in `@galerina/devtools-naming`. Keep the
TypeScript function and its public `checkNaming` caller as the executing
differential/bootstrap authority. This slice does not switch a consumer or
retire TypeScript.

## Exact semantics

The input is immutable `String`. The decision first applies the closed
ECMAScript edge-whitespace trim semantics admitted by SLIDE Contract 83, then
returns `true` only for the exact strings `""`, `"void"`, or `"Void"`.
There is no case folding, Unicode normalization, coercion, exception path, or
locale behavior.

The `.fungi` source uses a named `String` value and three ordinary Boolean
decisions. It contains no `null`, `NaN`, `else if`, `throw`, `try`/`catch`,
`for`, `while`, or `loop` construct.

## Evidence boundary

- The naming package owns and declares the `.fungi` asset.
- A differential test drives the real public `checkNaming` caller and the
  Fungi interpreter across canonical, whitespace, case-hostile, embedded-NUL,
  zero-width, historical-whitespace, and composed/decomposed Unicode values.
- A separate integration test compiles the exact source with independent
  SLIDE commit `dc1add78215cfce2b5d23fcf194076b56501fa53`, publishes a physical
  `.slide`, independently re-admits it through VOK, and verifies typed receipts.
- Source mutation, artifact mutation, wrong argument count/type, surplus
  arguments, and unpaired surrogates refuse.

All evidence is reference-only and non-authorizing. It does not prove a
consumer switch, general String support, production release, signing,
platform evidence, or terminal TypeScript retirement.
