# Tensor dimension-count compatibility Fungi conversion design

## Decision

Translate the exported `tensorDimensionCountsCompatible(expected, actual)`
decision as one package-owned pure Fungi flow over two normalized immutable
rank-token arrays. The TypeScript helper observes only `expected.length` and
`actual.length`, so the exact decision is:

```text
compatible = expectedTokens.count() == actualTokens.count()
```

The proof adapter maps every source dimension to one opaque `Int` token while
preserving order and cardinality. Token values are never read, so this is a
cardinality-preserving projection rather than a sentinel encoding for the
TypeScript `number | "dynamic"` union.

## Source dossier

- Build point: Galerina `4ac8a2ffb3c63ad96820040e9f0aeb0733976c0f`.
- Source: `packages-galerina/galerina-core-compiler/src/type-registry.ts`.
- Source SHA-256: `922aca599c553c5764546055e7d64c3deab2cd44cb9f7e8c5817978b2e9ebfc7`.
- Exported source domain: two immutable arrays whose elements are finite tensor
  dimensions or the literal `"dynamic"`.
- Observable result: `Bool`; element values, aliases and order are unobserved.
- Production caller: the tensor assignment path in `type-checker.ts`, where a
  rank mismatch contributes to `FUNGI-TYPE-016`.
- Existing direct tests: equal ranks including a dynamic dimension, plus both
  directions of unequal rank.
- Effects, mutation, I/O, timing, async, exceptions and ambient authority: none.
- Selected physical build point: SLIDE
  `053cc7573c7b035ab532a9bb69532276981aac96`.

## Alternatives considered

1. **Normalized `Array<Int>` rank tokens — selected.** Cardinality is intrinsic,
   the values are observationally irrelevant, and the existing checked array
   profile can carry the complete collection boundary.
2. **Two scalar rank `Int` values — rejected.** It is smaller, but its external
   ABI admits negative values that cannot arise from a TypeScript array length;
   a separate rejection algebra would widen this Bool decision.
3. **Wait for an external `Array<number | "dynamic">` equivalent — rejected for
   this slice.** That ABI may be useful for whole tensor-shape execution, but it
   adds no information to a decision that observes only rank.

## Decision and effect ledger

| Source expression | Proven subject | Terminal | Fungi construct | Effects | Failure exit | Evidence |
|---|---|---:|---|---|---|---|
| `expected.length === actual.length` | two normalized immutable `Array<Int>` token collections | yes | two `count()` operations and Boolean `if`, then explicit false return | none | malformed or non-array arguments refuse at typed admission | source helper, direct tests, Golden Bool/array forms, selected checked-array profile |

There is no unknown branch, numeric coercion or array-element read in the
decision. Cardinality is bounded by the admitted array profile; null, NaN,
infinity and fractional values never enter the Fungi flow.

## Boundary and authority

- Keep `type-registry.ts`, `tensorDimensionCountsCompatible`, `type-checker.ts`
  and every existing consumer active.
- Add no interpreted sentinel, coercion, default, fallback or host API.
- Use no null, NaN, `else if`, `else`, `throw`, `try`/`catch`, `for`, `while` or
  `loop` in the new Fungi source.
- Pin the existing immutable-array executable-GIR registry and its exact digest
  after the physical compiler derives them from the candidate.
- Treat malformed arguments, oversized arrays, insufficient work, altered
  source, altered publication and wrong registry evidence as refusal.
- Grant no consumer-switch, signing, production, release or TypeScript
  retirement authority.

## Proof shape

1. Add a failing package test requiring the governed Fungi asset and prohibited-
   construct boundary.
2. Compare the real TypeScript helper with typed Fungi execution across empty,
   singleton, dynamic, equal multi-rank and both unequal-rank directions.
3. Keep the real type-checker path in the focused proof: unequal rank emits
   `FUNGI-TYPE-016`; equal rank does not.
4. Strict-check the exact Fungi bytes and prove the emitted GIR decision.
5. Compile the same bytes with independent SLIDE, publish one physical `.slide`,
   independently re-admit it through VOK, verify typed Bool receipts, and prove
   malformed, oversized, budget and mutation refusals.
6. Run the bounded compiler, aggregate, retirement and owner checks without the
   crash-linked full-tooling, normal phase-close or whole-memory lanes.
