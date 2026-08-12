# Can Honour Fungi conversion design

## Outcome

Add an executable package-owned Fungi twin for the Boolean residency decision
inside exported TypeScript `canHonour`. TypeScript remains the active adapter
that constructs the typed `FUNGI-HARDEN-005` rejection.

## Closed interface decision

The Fungi flow accepts the residency ceiling as a String and the four host
capabilities as independent Bool values:

- `canRegisterPin`;
- `canNoDramSpill`;
- `canNoSwap`;
- `canNoDisk`.

It returns Bool. An exhaustive match maps the four restricted ceilings to the
corresponding capability, maps `unrestricted` to `true`, and maps every unknown
String to `false`. The flow does not accept a host name because the decision
does not use it. It does not construct diagnostic text because the current
physical SLIDE boundary has no exact optional-record ABI matching TypeScript
`{ ok: true } | { ok: false, rejection: Rejection }`.

## Zero-trust authority boundary

The Boolean answers only whether supplied capability facts satisfy the named
ceiling. It does not attest those facts, identify a live platform, authorize a
host, or release authority. The existing TypeScript registry and caller retain
custody of host resolution and rejection construction. Physical VOK receipts
must retain `authorityReleased: false`.

Unknown ceilings are outside the TypeScript `ResidencyTier` type but are
hostile physical-boundary inputs. They must return `false`; they must never be
treated as `unrestricted` or normalized into a known value.

## Alternatives refused

- A flattened success/rejection record would invent a second result shape and
  would not be semantically identical to the optional TypeScript field.
- A `Result` or optional-record physical ABI is deferred until SLIDE can prove
  that exact external type without widening its registry.
- Passing a host name and resolving it again would duplicate the already
  separated host-profile decision and couple two independently testable units.

## Verification

Differential evidence covers all five typed ceilings against every declared
and unknown host capability, plus hostile unknown ceiling Strings. Physical
evidence publishes and independently re-admits one `.slide`, verifies exact
Bool receipts, and refuses malformed arity/types, exhausted work, source,
receipt, envelope, and artifact mutation. New Fungi contains no null, NaN,
`else if`, `else`, throw, try/catch, `for`, `while`, or `loop`.
