# Spill retype Fungi conversion design

## Outcome

Extend the governed hardening trust module with an executable, effect-free
Fungi twin for exported TypeScript `spillRetype()`. The public flow returns one
closed record containing the sticky Deny trust state, diagnostic code and
diagnostic reason. TypeScript, the governance verifier and every consumer
remain active.

## Options considered

1. **Convert `spillRetype` as a nominal record — adopted.** The source is a
   zero-input constant decision and independent SLIDE already proves bounded
   records with `Verdict` and `String` members plus field-level VOK receipts.
2. Convert `resolveHost` and `canHonour`. Refused for this slice because their
   Map lookup, host-capability record and optional rejection require a wider
   source and external ABI dossier.
3. Convert `dischargeTrust`. Blocked because TypeScript accepts
   `boolean | undefined`; changing that to a Fungi algebra requires an explicit
   owner-approved interface decision rather than an inferred coercion.

## Exact contract

Declare nominal record `SpillOutcomeFungi` with fields in source-contract
order:

- `retypedTo: Verdict`, exactly `Verdict.Deny` through the already governed
  `refute()` helper;
- `code: String`, exactly `FUNGI-HARDEN-007`;
- `reason: String`, byte-exact to the live TypeScript diagnostic message.

The zero-argument pure flow `spillRetypeFungi() -> SpillOutcomeFungi` constructs
and returns the record. There is no absence, numeric coercion, mutation,
authority grant, host operation or effect.

## Decision and effect ledger

| Source operation | Proven type | Fungi form | Effects | Failure exit | Evidence |
|---|---|---|---|---|---|
| `refute()` | `CompilerTrust.REFUTED` / typed K3 Deny | call governed `refute() -> Verdict` | none | none | existing differential trust table |
| `FUNGI_HARDEN_007.code` | exact String | String literal | none | none | live exported diagnostic constant |
| `FUNGI_HARDEN_007.message` | exact String | String literal | none | none | live exported diagnostic constant |
| return `SpillOutcome` | closed immutable record | nominal `SpillOutcomeFungi { ... }` | none | malformed schema refuses before execution | Golden record vector and bounded SLIDE record profile |

## Verification and authority

The differential test must compare the complete record byte-for-byte at the
String fields and as typed Deny at `retypedTo`, then prove that its trust state
cannot pass `boundaryTrusted` and remains contagious under `combineTrust`.
Source-shape checks retain the project prohibitions on null, NaN, `else if`,
`else`, exceptions and every loop form.

The physical test must independently compile, publish, re-admit and execute the
exact Fungi bytes, require the no-successor registry fields to remain absent,
pin the record-descriptor digest, verify a typed record receipt, and refuse source,
publication, receipt-envelope and resource-budget mutation. No consumer
switch, TypeScript/MJS retirement, production, signing, release, platform or
runtime-residency authority follows.

## Physical-boundary reconciliation

The first physical RED run refused before packaging. A four-way reduction
proved that K3 `Verdict`, record construction, zero arguments and String fields
are already supported. The actual mismatch is identifier syntax: Fungi and the
external record descriptor admit camelCase field names such as `retypedTo`,
while SLIDE's internal reference GIR descriptor admits lower-snake identifiers
only.

The adopted repair keeps both authorities unchanged. The checked-Fungi lowerer
maps record members to deterministic internal slots (`field_1`, `field_2`, ...)
for reference GIR construction and projection, while the authenticated external
record descriptor retains the exact Fungi field names and order. The descriptor
already binds each ordered field name and type ID, and V2C independently checks
the ordered field types, so no name is trusted across the internal boundary and
no syntax is widened. Relaxing the GIR identifier grammar or coercing `Verdict`
to `Int` are refused alternatives.
