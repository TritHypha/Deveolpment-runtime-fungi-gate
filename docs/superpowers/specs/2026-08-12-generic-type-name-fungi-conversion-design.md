# Generic type-name Fungi conversion design

## Objective

Give the naming package's private `isGenericTypeName` TypeScript decision an
exact package-owned `.fungi` counterpart and prove that counterpart through a
physical SLIDE package and independent VOK re-admission. Keep TypeScript and
all consumers active.

## Closed semantics

The decision applies the already admitted immutable String edge-trim operation
and returns `true` only for the exact spellings `Any`, `Object`, or `unknown`.
It performs no case folding or Unicode normalization. U+200B, U+180E, embedded
NUL, compound generic forms, nullable suffixes, and differently cased values
remain ordinary content and therefore return `false`.

## Source shape

The `.fungi` flow accepts one `String`, binds one immutable trimmed `String`,
uses three ordinary Boolean decisions, and returns `Bool`. It contains no
`null`, `NaN`, `else if`, `throw`, `try`/`catch`, `for`, `while`, or `loop`.

## Proof shape

1. Bind the package manifest to the new source asset.
2. Compare the Fungi interpreter with the real public `checkNaming` caller
   across canonical and hostile text.
3. Compile the exact source with the closed immutable-text-trim SLIDE registry.
4. Publish one physical `.slide`, independently re-admit it through VOK, and
   verify typed Bool receipts against the public TypeScript result.
5. Refuse source mutation, artifact mutation, wrong or surplus arguments,
   invalid UTF-16, and insufficient comparison work.

## Authority boundary

This is reference-only evidence. It does not switch `checkNaming`, retire
TypeScript, release authority, widen the SLIDE registry, or establish
production, signing, platform, or release evidence.
