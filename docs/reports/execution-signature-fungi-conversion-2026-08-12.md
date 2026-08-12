# Execution-signature Fungi conversion report

## Outcome

The exported TypeScript record constructor `computeExecutionSignature` now has
a package-owned Fungi reference implementation:

```text
computeExecutionSignatureFungi(
  effectMask: Int,
  governanceMask: Int,
  inputVsFlags: Int,
  outputVsFlags: Int,
  nodeFlagsMask: Int,
  effectCount: Int,
  capabilityCallCount: Int,
  hasBoundaryCrossings: Bool
) -> ExecutionSignatureFungi
```

The flow preserves each caller-derived value under its exact camel-case field
name. It performs no arithmetic, coercion, validation, hashing, or authority
inference. A matching record does not authenticate where those facts came
from.

## Evidence

- Strict Fungi check: one flow, one record, zero errors, zero warnings.
- TypeScript-to-Fungi differential proof: **1/1**, four boundary vectors.
- Physical SLIDE publication, independent re-admission, and typed VOK record
  receipt: **1/1**, zero skips, four value vectors.
- Compiler package: **6,379/6,379**.
- Canonical owner: **100/100 packages and 9,599 tests in 274.6s**.
- Golden Pack: **11/11**.
- Retirement inventory: **1,444** executable-family paths and **130** source
  Fungi assets.

The pass-through record requires no optional operation registry. The physical
proof pins that exact absence and record descriptor digest
`sha256:1be2ea80225038e88d1fa3b9a48a0863142081ee1bdd3b0d3284c6fd85a121ab`.
It refuses wrong arity/type, NaN, infinity, out-of-range Int, inadequate fuel,
source mutation, receipt mutation, every envelope-byte mutation, and artifact
mutation.

## Authority boundary

This is a reference and physical execution proof, not a consumer switch.
TypeScript, governance-verifier derivation, proof builders, signing, hashing,
caching, and every consumer remain active. The record grants no authenticated
input, production, release, platform, or retirement authority. Null, NaN,
`else if`, `else`, exceptions, and all loop forms are absent from the new Fungi
source.
