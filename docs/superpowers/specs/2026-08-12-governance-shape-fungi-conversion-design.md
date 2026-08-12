# Governance shape Fungi conversion design

## Outcome

Add an executable package-owned Fungi twin for the pure equality decision
inside exported TypeScript `sharesGovernanceShape`. TypeScript retains
ProofGraph field extraction and every consumer.

## Closed interface decision

The source function returns whether `a.signatureHash === b.signatureHash`.
The Fungi boundary therefore accepts the two already-extracted String fields:

```fungi
pure flow sharesGovernanceShapeFungi(
  leftSignatureHash: String,
  rightSignatureHash: String
) -> Bool
```

The flow performs exact String equality. It does not trim, normalize, decode,
case-fold, or validate a hash. Empty, malformed, Unicode, prototype-shaped,
embedded-NUL, and unequal-length Strings retain JavaScript strict String-value
equality semantics.

## Zero-trust authority boundary

Equality of two supplied Strings proves only that the two fields are equal. It
does not prove that either field is a canonical digest, that either ProofGraph
is authenticated, or that evidence can be shared. ProofGraph construction,
signature validation, caller policy, and authority release remain outside the
flow. Every physical receipt must retain `authorityReleased: false`.

## Alternatives refused

- A full ProofGraph record ABI would widen the physical profile for fields the
  decision never reads.
- Validating SHA-256 spelling inside the flow would narrow the source behavior
  and conflate equality with authenticity.
- Comparing object serialization would introduce ordering and wire-format
  behavior absent from the source function.

## Verification

Differential evidence must cover equal and unequal canonical-looking hashes,
empty Strings, differing lengths, case, whitespace, Unicode composition,
prototype-shaped names, and embedded NUL. Physical evidence must publish and
independently re-admit one `.slide`, verify exact Bool receipts, and refuse
wrong arity/types, invalid Unicode, exhausted work, and source, receipt,
envelope, or artifact mutation. New Fungi contains no null, NaN, `else if`,
`else`, throw, try/catch, `for`, `while`, or `loop`.
