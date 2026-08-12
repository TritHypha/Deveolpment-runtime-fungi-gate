# Execution Signature Fungi Conversion Design

## Purpose

Convert the passive record-construction semantics of exported TypeScript
`computeExecutionSignature` into package-owned Fungi without changing its
callers, interpreting its fields, or granting execution authority.

The pinned TypeScript source blob at selection is
`db7663486f2a628e42ab1844b0eeb9eb6da02426`. The function is used by the
governance verifier and proof-building tests; those consumers remain active.

## Exact interface

The Fungi candidate accepts the seven already-derived integer facts and the
Boolean boundary fact as separately typed inputs and returns one closed record:

```fungi
record ExecutionSignatureFungi {
  effectMask: Int
  governanceMask: Int
  inputVsFlags: Int
  outputVsFlags: Int
  nodeFlagsMask: Int
  effectCount: Int
  capabilityCallCount: Int
  hasBoundaryCrossings: Bool
}

pure flow computeExecutionSignatureFungi(...) -> ExecutionSignatureFungi
```

Every output member is the corresponding input unchanged. Camel-case external
field names remain exact. The flow performs no arithmetic, coercion,
normalization, range validation, hash computation, or authority decision.

## Trust boundary

The caller remains responsible for deriving valid bitmasks and counts. The
Fungi flow does not make untrusted metadata trustworthy. A matching record is
only evidence that the eight supplied values were preserved; it is not proof
that they came from an authenticated compiler stage.

TypeScript construction, the governance verifier, proof-graph building,
signing, hashing, caching, and every consumer remain active. Physical SLIDE/VOK
receipts must retain `authorityReleased: false`. No consumer switch,
production, signing, release, or TypeScript retirement follows.

## Verification

1. A RED differential test requires the package-owned flow and covers zero,
   nonzero, negative, and boundary-safe integer facts plus both Boolean values.
2. Strict Fungi checking must report zero errors and warnings.
3. The differential proof compares every record member with the live
   TypeScript function.
4. Independent SLIDE publishes, re-admits, executes, and verifies typed record
   receipts while refusing wrong arity/type, unsafe numeric input, inadequate
   work, source/receipt/envelope mutation, and artifact mutation.
5. Registered Golden, retirement, graph, index, percentage, roadmap, count,
   and path-leak owners close only after their exact checks pass.

## Language constraints

The new Fungi contains no null, NaN, `else if`, `else`, throw, try/catch,
`for`, `while`, or `loop`. It uses a direct typed record return and introduces
no new language syntax.
