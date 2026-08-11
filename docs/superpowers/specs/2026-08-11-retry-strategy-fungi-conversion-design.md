# Retry Strategy Fungi Conversion Design

## Objective

Translate the deterministic `isValidStrategy` decision in
`galerina-core-compiler/src/runtime/retryPolicy.ts` into one package-owned
`.fungi` flow and prove the exact source bytes through canonical compiler
execution and physical SLIDE/VOK. The TypeScript retry-policy parser remains
active.

## Exact semantic boundary

The TypeScript helper returns true only for the exact Strings `none`, `linear`
and `exponential_backoff`. Every other admitted String returns false. The
Fungi asset exposes one pure `isValidRetryStrategy(String) -> Bool` flow with
three exact comparisons and a terminal false return.

The flow contains no null, NaN, `else if`, exception syntax, `for` or `loop`.
Case changes, leading or trailing content, embedded NUL and unpaired surrogate
input cannot be treated as a valid strategy.

## Proof shape

1. Register the intended package asset and add a focused compiler test before
   the source exists, retaining the exact missing-asset RED result.
2. Anchor the private TypeScript type predicate and exercise canonical and
   hostile Strings through typed interpretation and signed/admitted Wasm.
3. Exercise the public `parseRetryPolicy` caller so the proof remains tied to
   the active runtime-policy decision path.
4. Compile the same Fungi bytes with independent SLIDE, publish one physical
   `.slide`, re-admit it through VOK, execute every vector and refuse malformed
   arguments, source mutation and artifact mutation.

## Authority boundary

This is a reference-only non-retiring slice. It does not export or switch the
private TypeScript helper, replace retry-policy parsing, or grant bootstrap,
production, signing, release or retirement authority. A consumer switch needs
a separately reviewed admitted integration design.

## Acceptance evidence

- Focused RED fails only because the package asset is absent.
- Strict, typed-interpreter, signed-Wasm and physical SLIDE/VOK proofs pass
  with zero candidate skips.
- The complete compiler package remains green.
- Generated owners and indexes are refreshed through bounded processes without
  invoking the crash-linked full tooling, normal phase-close or whole-memory
  evaluation processes.
