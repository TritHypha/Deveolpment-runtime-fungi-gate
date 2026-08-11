# WAT 64-Bit Type Fungi Conversion Design

## Objective

Translate the deterministic `is64BitWatType` decision in
`galerina-core-compiler/src/wat-emitter.ts` into one package-owned `.fungi`
flow and prove the exact source bytes through canonical compiler execution and
physical SLIDE/VOK. The TypeScript WAT emitter remains active.

## Exact semantic boundary

The TypeScript helper returns true only for the exact Strings `Int64` and
`UInt64`. Every other admitted String returns false. The Fungi asset exposes
one pure `is64BitWatType(String) -> Bool` flow with two exact comparisons and a
terminal false return.

The flow contains no null, NaN, `else if`, exception syntax, `for` or `loop`.
Case changes, leading or trailing content, embedded NUL and unpaired surrogate
input cannot be treated as a 64-bit WAT type.

## Proof shape

1. Register the intended package asset and add a focused compiler test before
   the source exists, retaining the exact missing-asset RED result.
2. Anchor both TypeScript type sets and the private decision source. Exercise
   canonical and hostile Strings through typed interpretation and
   signed/admitted Wasm.
3. Exercise a public WAT-emission caller so the proof is not isolated from the
   production decision path.
4. Compile the same Fungi bytes with independent SLIDE, publish one physical
   `.slide`, re-admit it through VOK, execute every vector and refuse malformed
   arguments, source mutation and artifact mutation.

## Authority boundary

This is a reference-only non-retiring slice. It does not export or switch the
private TypeScript helper, replace the WAT emitter, or grant bootstrap,
production, signing, release or retirement authority. A consumer switch needs
a separately reviewed admitted integration design.

## Acceptance evidence

- Focused RED fails only because the package asset is absent.
- Strict, typed-interpreter, signed-Wasm and physical SLIDE/VOK proofs pass
  with zero candidate skips.
- The complete compiler package remains green.
- Generated owners and indexes are refreshed without invoking the crash-linked
  full tooling, normal phase-close or whole-memory evaluation processes.
