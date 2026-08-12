# Governance-shape Fungi conversion report

## Outcome

The exported TypeScript decision `sharesGovernanceShape` now has a
package-owned Fungi reference implementation:

```text
sharesGovernanceShapeFungi(
  leftSignatureHash: String,
  rightSignatureHash: String
) -> Bool
```

The Fungi flow preserves the exact live decision: it returns true only when
the two extracted signature-hash Strings are byte-for-byte equal. It does not
trim, normalize, parse, or validate either value. Equality is not treated as
authentication or proof that either input was honestly derived.

## Evidence

- Strict Fungi check: one flow, one declaration, zero errors, zero warnings.
- TypeScript-to-Fungi differential proof: **1/1**.
- Physical SLIDE publication, independent re-admission, and typed VOK receipt:
  **1/1**, zero skips, **14** canonical and hostile vectors.
- Compiler package: **6,378/6,378**.
- Canonical owner: **100/100 packages and 9,598 tests in 278.7s**.
- Golden Pack: **11/11**.
- Retirement inventory: **1,443** executable-family paths and **129** source
  Fungi assets.

The physical proof pins immutable-value-ops registry
`slide.registry.executable-gir.v2c-immutable-value-ops.v1` and exact digest
`956e5f12ea00599f67fc4892774c01b78bedcc5d630df70f0164730ee8a25703`.
It refuses wrong arity and type, lone-surrogate input, inadequate fuel, source
mutation, receipt mutation, envelope mutation, and every tested artifact-byte
mutation.

## Authority boundary

This is a reference and execution proof, not a consumer switch. TypeScript,
`ProofGraph` extraction, and every existing consumer remain active. The
equality result authenticates neither input and grants no production, release,
signing, platform, or retirement authority. Null, NaN, `else if`, `else`,
exceptions, and all loop forms are absent from the new Fungi source.
