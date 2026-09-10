# RD-0873 String Snapshot/GIR Route Design Note

Date: 2026-09-10
Status: **PROPOSAL_NON_AUTHORIZING**
Authorizing: **false**

This note records the smallest design boundary exposed by the current
post-RD-0873 hold. It is a design proposal only. It does not change the
compiler, create `.fungi` source, reopen the conversion queue, switch a
consumer or release production authority.

## Observed gap

The selected `isEnvironmentMode` subject is a pure `String -> Bool` classifier
with four literal cases. The generic checked-snapshot/GIR path currently has
three independent limits:

1. `checked-module-snapshot.v1` admits only `Int | Bool | Trit | Verdict` and
   constants limited to numbers and booleans
   (`packages-ts/galerina-core-compiler/src/checked-module-snapshot.ts:7-13,
   67-71`).
2. `checked-snapshot-gir-emitter.ts` maps only those four types
   (`:17`), accepts only parameter and safe-integer constant instructions
   (`:130-144`), and encodes a two-target branch only (`:190-216`).
3. `isEnvironmentMode` uses a four-arm literal `match`; the separate RD-0858
   scalar reference uses a three-arm `checkExpr`, whose exact shape is pinned
   in `rd0858-scalar-compiler-entry.ts:45-60`. These are distinct lowering
   shapes and must not be conflated.

The existing five-subject Fungi wave remains review-only and non-authorizing.
This route finding explains the hold; it does not invalidate that wave.

## Proposed versioned boundary

Any implementation should introduce a new snapshot/GIR edition rather than
silently widening `v1`:

- Add an explicit String primitive identity and a bounded String constant
  representation. Preserve UTF-8, NFC, byte-length and item-count limits;
  reject accessors, symbols, malformed values and wrong-class inputs.
- Add literal String equality/match operations with an explicit case-sensitive,
  whitespace-sensitive contract. The operation must compare value bytes, never
  interned handles or coerced numeric values.
- Represent finite literal branching with an explicit bounded arm count. The
  route must support the four-arm `isEnvironmentMode` match and keep the
  three-arm RD-0858 `checkExpr` shape as a separately identified operation.
- Bind the new edition, semantic profile, registry-set identity, memory
  profile and limit vector into the canonical GIR reference. A `v1` snapshot
  must continue to refuse String fields rather than being interpreted under
  the new rules.

## Required controls before implementation

The design must have a negative control for every new capability:

- wrong primitive class, non-NFC text, over-limit text and embedded NUL;
- case or whitespace changes, near-miss literals and duplicate arms;
- reordered arms, missing wildcard/default behavior and unreachable arms;
- a two-arm snapshot presented as a four-arm match and a three-arm
  `checkExpr` presented as a literal match;
- changed snapshot bytes, changed source digest, changed compiler/checker
  identity and stale registry-set digest.

Each refusal must be typed, deterministic and included in the canonical
receipt. No coercion, implicit default arm, ambient string table or host lookup
is permitted.

## Admission sequence

Implementation remains closed until the owner requests a fresh gate. If opened,
the sequence is:

1. Write and review the new snapshot/GIR schema and compatibility rules.
2. Add focused snapshot validation, emitter and canonical-byte tests, including
   the negative controls above.
3. Rebuild the selected source under the new edition and compare the retained
   TypeScript result against the Fungi result for all four environment literals,
   near misses and wrong-class inputs.
4. Obtain exact-head checked-snapshot, canonical GIR, SLIDE, VOK and independent
   review receipts. Keep Lyth evidence explicitly non-authorizing.
5. Record an owner authority release and consumer decision separately. Until
   then, keep `authorityReleased: false`, retain the TypeScript shadow and keep
   bulk translation closed.

## Current decision

`HOLD_NON_AUTHORIZING`. This note supplies a bounded design target for a future
owner-approved implementation; it is not an implementation plan approval or a
source-publication permission.
