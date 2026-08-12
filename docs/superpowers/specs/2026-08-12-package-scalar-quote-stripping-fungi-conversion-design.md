# Package scalar quote stripping Fungi conversion design

## Objective

Give the compiler package resolver's private `stripQuotes` scalar decision an
exact package-owned `.fungi` counterpart and prove it through the real
`loadPackageManifest` path plus physical SLIDE/VOK. Keep TypeScript and every
consumer active.

## Closed semantics

The decision first applies immutable edge trimming. It removes exactly one
outer pair only when both remaining ends are balanced double quotes or balanced
single quotes. Empty quoted values become the empty String. Unquoted,
one-sided, mixed-quote, prototype-name, Unicode and embedded-NUL Strings keep
their trimmed bytes unchanged. It performs no escape decoding, case folding,
Unicode normalization or recursive stripping.

## Source and proof shape

The exported pure Fungi flow accepts and returns `String`. A private pure
`hasBalancedOuterQuotes` helper keeps each decision flow within the frozen
control-flow ceiling without admitting Boolean `&&`. Both flows use ordinary
`if` and contain no `null`, `NaN`, `else if`, `throw`,
`try`/`catch`, `for`, `while`, or `loop`. The executable body relies only on
the already-governed immutable String `trim`, `startsWith`, `endsWith` and
`slice` operations. Physical execution is bound to SLIDE Contract 84's exact
`slide.registry.executable-gir.v2c-immutable-text-slice.v1` registry and its
frozen digest; no effect or authority is added.

Differential evidence creates isolated package manifests, derives expected
values through the real `loadPackageManifest` caller, and compares them with
typed Fungi execution. Physical evidence must publish one `.slide`,
independently re-admit it through VOK, verify typed String receipts and refuse
malformed arguments, work exhaustion, source mutation and artifact mutation.

## Authority boundary

This remains reference-only. It does not switch `parseSimpleYaml`,
`loadPackageManifest`, import resolution, the CLI or any production consumer;
it grants no release or TypeScript-retirement authority.
