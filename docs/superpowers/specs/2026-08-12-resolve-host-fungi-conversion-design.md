# Resolve host Fungi conversion design

## Outcome

Add an executable package-owned Fungi twin for exported TypeScript
`resolveHost`. TypeScript, the host registry, and every consumer remain active.

## Closed interface decision

The TypeScript input is `string | undefined`, but both absence and every
unknown String return the same immutable `UNKNOWN_HOST` record. The physical
Fungi boundary therefore accepts a String and uses `"<undeclared>"` as the
explicit adapter value for TypeScript absence. This does not make the sentinel
special inside the flow: it follows the same wildcard path as every other
unknown String.

The Fungi output is a closed record with the exact external fields and types:

- `name: String`;
- `canRegisterPin: Bool`;
- `canNoDramSpill: Bool`;
- `canNoSwap: Bool`;
- `canNoDisk: Bool`;
- `keyCustody: String`.

An exhaustive String match admits only `mlock_posix`, `register_pinned`, and
`browser_secure_context`. The terminal wildcard returns the exact fail-closed
unknown record. No normalization, trimming, case folding, prototype lookup, or
fallback-to-capable profile is allowed.

## Zero-trust authority boundary

The returned record is registry data, not proof that a platform provides the
claimed primitives. In particular, the design-stage `register_pinned` profile
does not authorize a live host, key-custody rung, or release. Physical VOK
receipts must retain `authorityReleased: false` and no registry-set authority
may be widened merely to execute this pure decision.

## Alternatives refused

- `Option<String>` would widen the physical ABI although absence and unknown
  already have identical source semantics.
- null or an implicit undefined ABI would violate the project state model.
- returning only a host name would discard the exact capability record.
- treating the profile map as platform attestation would turn design data into
  authority and fail open.

## Verification

Differential evidence must cover all three declared names, TypeScript absence,
unknown/prototype names, whitespace, case changes, Unicode normalization
variants, and embedded NUL. Physical evidence must publish and re-admit one
`.slide`, verify exact typed record receipts, and refuse malformed ABI, work
exhaustion, source/receipt/envelope/artifact mutation. New Fungi must contain no
null, NaN, `else if`, `else`, exceptions, `for`, `while`, or `loop`.
